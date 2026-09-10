import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { extraction, item, SOURCE_ID } from './fixtures';
import { hashText } from '../../src/services/identity';

let db: PGlite;
const OWNER = '20000000-0000-4000-8000-000000000001';
const RUN = '30000000-0000-4000-8000-000000000001';
const OFFICIAL = '10000000-0000-4000-8000-000000000002';
const SECOND = '10000000-0000-4000-8000-000000000003';
async function one<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> {
  return (await db.query<T>(sql, params)).rows[0];
}
async function ingest(sourceId = SOURCE_ID, itemPatch: Record<string, unknown> = {}, articlePatch: Record<string, unknown> = {}, weekly: unknown = null) {
  const currentItem = { ...item, ...itemPatch };
  const article = { ...extraction, slug: `test-${currentItem.content_hash.slice(0, 15)}`, ...articlePatch };
  return (await one('select public.ingest_source_item($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb) result',
    [RUN, OWNER, sourceId, JSON.stringify(currentItem), JSON.stringify(article), weekly ? JSON.stringify(weekly) : null])).result as { action: string; article_id: string; status: string };
}
async function preflight(sourceId: string, patch: Record<string, unknown>) {
  return (await one('select public.try_attach_duplicate($1,$2,$3,$4::jsonb) result', [RUN, OWNER, sourceId, JSON.stringify({ ...item, ...patch })])).result as { action: string; article_id?: string };
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const directory = path.resolve('supabase/migrations');
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) await db.exec(await readFile(path.join(directory, name), 'utf8'));
}, 60_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec('begin');
  await db.query(`insert into public.sources(id,name,url,source_type,trust_level,enabled,allowed_hosts) values
    ($1,'Fictional community fixture','https://news.example.com/feed','RSS','COMMUNITY',true,array['news.example.com']),
    ($2,'Official authority test fixture','https://www.rockstargames.com/test-only-feed','RSS','OFFICIAL',true,array['www.rockstargames.com']),
    ($3,'Second fictional fixture','https://second.example.com/feed','RSS','COMMUNITY',true,array['second.example.com'])`, [SOURCE_ID, OFFICIAL, SECOND]);
  await db.exec("update public.site_settings set auto_publish_official=true,auto_publish_community=true,auto_publish_trusted=true");
  await db.query('select public.acquire_ingestion_lease($1,$2,120)', ['news-sync', OWNER]);
  await db.query('insert into public.automation_runs(id,idempotency_key,owner) values($1,$2,$3)', [RUN, 'test-run', OWNER]);
});
afterEach(async () => { await db.exec('rollback'); });

describe('real PostgreSQL migrations and transactional ingestion', () => {
  it('applies migrations including analytics and denies anonymous read/RPC execution', async () => {
    const functions = await one("select has_function_privilege('anon','public.ingest_source_item(uuid,uuid,uuid,jsonb,jsonb,jsonb)','execute') allowed");
    expect(functions.allowed).toBe(false);
    expect((await one("select has_table_privilege('authenticated','public.articles','select') allowed")).allowed).toBe(false);
    expect((await one("select has_table_privilege('service_role','public.articles','select') allowed")).allowed).toBe(true);
    expect((await one("select to_regclass('public.article_daily_views') name")).name).toBe('article_daily_views');
    for (const role of ['anon', 'authenticated']) {
      for (const table of ['rate_limits', 'article_daily_views', 'ai_extractions']) {
        expect((await one('select has_table_privilege($1,$2,$3) allowed', [role, `public.${table}`, 'select'])).allowed).toBe(false);
      }
      for (const rpc of ['public.increment_article_view(uuid,text)', 'public.consume_rate_limit(text,integer,integer)', 'public.get_trending_articles(integer)']) {
        expect((await one('select has_function_privilege($1,$2,$3) allowed', [role, rpc, 'execute'])).allowed).toBe(false);
      }
    }
  });
  it('allows only one lease holder and fences expired owners', async () => {
    const other = '20000000-0000-4000-8000-000000000002';
    expect((await one('select public.acquire_ingestion_lease($1,$2,120) acquired', ['news-sync', other])).acquired).toBe(false);
    await db.exec("update public.ingestion_leases set expires_at=now()-interval '1 second'");
    expect((await one('select public.renew_ingestion_lease($1,$2,120) renewed', ['news-sync', OWNER])).renewed).toBe(false);
    expect((await one('select public.acquire_ingestion_lease($1,$2,120) acquired', ['news-sync', other])).acquired).toBe(true);
    expect((await one('select public.release_ingestion_lease($1,$2) released', ['news-sync', OWNER])).released).toBe(false);
    await expect(ingest()).rejects.toThrow('lease lost');
  });
  it('is idempotent and attaches syndicated source URLs without AI', async () => {
    const created = await ingest(); expect(created.action).toBe('created');
    expect((await ingest()).action).toBe('skipped');
    const attached = await preflight(SECOND, { url: 'https://second.example.com/syndicated', external_id: 'syndicated' });
    expect(attached).toMatchObject({ action: 'attached', article_id: created.article_id });
    expect((await one('select count(*)::int n from public.articles')).n).toBe(1);
    expect((await one('select count(*)::int n from public.article_sources')).n).toBe(2);
  });
  it('skips AI for exact title duplicates but sends changed canonical content and authority upgrades to extraction', async () => {
    await ingest();
    expect((await preflight(SECOND, { url: 'https://second.example.com/title-copy', content_hash: hashText('different syndicated content') })).action).toBe('attached');
    expect((await preflight(SOURCE_ID, { content_hash: hashText('changed canonical source') })).action).toBe('needs_extraction');
    expect((await preflight(OFFICIAL, { url: 'https://www.rockstargames.com/test-official' })).action).toBe('needs_extraction');
  });
  it('upgrades community stories to official evidence, retaining prior revisions and all sources', async () => {
    const created = await ingest();
    const upgraded = await ingest(OFFICIAL, { url: 'https://www.rockstargames.com/test-announcement', content_hash: hashText('official evidence') });
    expect(upgraded).toMatchObject({ action: 'updated', article_id: created.article_id });
    const row = await one('select * from public.articles where id=$1', [created.article_id]);
    expect(row.verification_status).toBe('CONFIRMED');
    expect((await one('select snapshot from public.article_revisions')).snapshot).toMatchObject({ verification_status: 'REPORTED' });
    await ingest(SECOND, { url: 'https://second.example.com/lower-authority', content_hash: hashText('later community claim') }, { content: 'A lower authority should never replace the official article.' });
    expect((await one('select verification_status,source_url from public.articles')).source_url).toBe('https://www.rockstargames.com/test-announcement');
    expect((await one('select count(*)::int n from public.article_sources')).n).toBe(3);
  });
  it('stores same-URL corrections as revisions', async () => {
    const first = await ingest();
    await ingest(SOURCE_ID, { content_hash: hashText('correction') }, { content: 'Corrected fictional reporting is available for review in the source revision history.' });
    expect((await one('select count(*)::int n from public.article_revisions')).n).toBe(1);
    expect((await one('select id from public.articles')).id).toBe(first.article_id);
  });
  it('routes conflicting official reports and story-key collisions to review', async () => {
    await ingest(OFFICIAL, { url: 'https://www.rockstargames.com/test-official-one' });
    const conflict = await ingest(OFFICIAL, { url: 'https://www.rockstargames.com/test-official-two', content_hash: hashText('contradictory official content') });
    expect(conflict.status).toBe('REVIEW');
    const collision = await ingest(SECOND, { url: 'https://second.example.com/unrelated', content_hash: hashText('unrelated'), title_fingerprint: 'entirely different subject with no matching vocabulary' },
      { title: 'Entirely different subject with no matching vocabulary' });
    expect(collision.action).toBe('created'); expect(collision.status).toBe('REVIEW');
    expect((await one('select count(*)::int n from public.articles')).n).toBe(2);
  });
  it('does not merge a repeated weekly title outside the temporal window', async () => {
    await ingest();
    const next = await ingest(SECOND, { url: 'https://second.example.com/a-month-later', content_hash: hashText('different month'), published_at: '2000-02-10T00:00:00.000Z' });
    expect(next.action).toBe('created');
  });
  it('rejects spoofed official sources and ignores AI-requested promotion', async () => {
    const published = await ingest(SOURCE_ID, {}, { verification_status: 'CONFIRMED', status: 'PUBLISHED' });
    expect((await one('select verification_status from public.articles where id=$1', [published.article_id])).verification_status).toBe('REPORTED');
    await expect(db.query("update public.sources set trust_level='OFFICIAL' where id=$1", [SOURCE_ID])).rejects.toThrow('ownership');
  });
  it('holds low-confidence and rumor claims even with autopublish enabled', async () => {
    const low = await ingest(SOURCE_ID, {}, { confidence_score: 10 }); expect(low.status).toBe('REVIEW');
    const rumor = await ingest(SECOND, { url: 'https://second.example.com/rumor', content_hash: hashText('rumor'), title_fingerprint: 'different rumor claim for review and labeling' },
      { title: 'Different rumor claim for review and labeling', story_key: 'different-rumor-story', rumor: true });
    expect(rumor.status).toBe('REVIEW');
    expect((await one('select verification_status from public.articles where id=$1', [rumor.article_id])).verification_status).toBe('RUMOR');
  });
  it('rolls back article, attachment and source-item writes if weekly validation fails', async () => {
    await db.exec('savepoint invalid_weekly');
    await expect(ingest(OFFICIAL, { url: 'https://www.rockstargames.com/test-invalid-week' }, {},
      { event_start: '2000-01-08T00:00:00Z', event_end: '2000-01-01T00:00:00Z', data: {} })).rejects.toThrow();
    await db.exec('rollback to savepoint invalid_weekly');
    expect((await one('select count(*)::int n from public.articles')).n).toBe(0);
    expect((await one('select count(*)::int n from public.article_sources')).n).toBe(0);
    expect((await one('select count(*)::int n from public.source_items')).n).toBe(0);
  });
  it('preserves manual edits, uses optimistic concurrency, and invalidates cache atomically', async () => {
    const created = await ingest();
    const previous = await one('select * from public.articles where id=$1', [created.article_id]);
    await db.exec("insert into public.cache_entries(key,value,expires_at) values('test','[]',now()+interval '1 hour')");
    await db.query('select public.admin_edit_article($1,$2::jsonb,$3,$4)', [created.article_id, JSON.stringify({ title: 'An editor changed this fictional test title' }), 'editor@example.test', previous.updated_at]);
    expect((await one('select count(*)::int n from public.cache_entries')).n).toBe(0);
    await ingest(SOURCE_ID, { content_hash: hashText('updated after manual edit') });
    expect((await one('select title,status from public.articles')).title).toBe('An editor changed this fictional test title');
    expect((await one('select status from public.articles')).status).toBe('REVIEW');
    await expect(db.query('select public.admin_edit_article($1,$2::jsonb,$3,$4)', [created.article_id, '{}', 'editor@example.test', previous.updated_at])).rejects.toThrow('changed');
  });
  it('archives expired weekly periods and clears expired breaking flags', async () => {
    const article = await ingest(OFFICIAL, { url: 'https://www.rockstargames.com/test-week' }, {},
      { event_start: '2000-01-01T00:00:00.000Z', event_end: '2000-01-08T00:00:00.000Z', data: {} });
    expect((await one('select status from public.weekly_updates')).status).toBe('ARCHIVED');
    await db.query("update public.articles set breaking=true,breaking_expires_at=now()-interval '1 second' where id=$1", [article.article_id]);
    await db.exec('select public.expire_editorial_content()');
    expect((await one('select breaking from public.articles')).breaking).toBe(false);
  });
  it('tracks real views without changing editorial update time or requiring current source enablement', async () => {
    const article = await ingest();
    const before = await one('select updated_at from public.articles where id=$1', [article.article_id]);
    await db.query('update public.sources set enabled=false where id=$1', [SOURCE_ID]);
    await db.exec("insert into public.cache_entries(key,value,expires_at) values('view-stable-cache','[]',now()+interval '1 hour')");
    expect((await one('select public.increment_article_view($1,$2) counted', [article.article_id, 'reader-one'])).counted).toBe(true);
    expect((await one('select public.increment_article_view($1,$2) counted', [article.article_id, 'reader-one'])).counted).toBe(false);
    const after = await one('select updated_at,views from public.articles where id=$1', [article.article_id]);
    expect(after.updated_at).toEqual(before.updated_at); expect(Number(after.views)).toBe(1);
    expect((await one("select count(*)::int n from public.cache_entries where key='view-stable-cache'")).n).toBe(1);
    expect((await one('select count(*)::int n from public.get_trending_articles(5)')).n).toBe(1);
    expect(Number((await one('select sum(views) n from public.article_daily_views')).n)).toBe(1);
  });
  it('enforces rate-limit thresholds, key isolation and expiry reset', async () => {
    const consume = async (key: string) => (await one('select public.consume_rate_limit($1,2,60) allowed', [key])).allowed;
    expect(await consume('reader-a')).toBe(true); expect(await consume('reader-a')).toBe(true); expect(await consume('reader-a')).toBe(false);
    expect(await consume('reader-b')).toBe(true);
    await db.exec("update public.rate_limits set expires_at=now()-interval '1 second' where key='reader-a'");
    expect(await consume('reader-a')).toBe(true);
    expect((await one("select count from public.rate_limits where key='reader-a'")).count).toBe(1);
  });
  it('does not count views for drafts, scheduled, fictional, or missing articles', async () => {
    const draft = await ingest(SOURCE_ID, {}, { needs_review: true });
    await db.query("update public.articles set status='DRAFT' where id=$1", [draft.article_id]);
    expect((await one('select public.increment_article_view($1,$2) counted', [draft.article_id, 'reader'])).counted).toBe(false);
    await db.query("update public.articles set status='PUBLISHED',published_at=now()+interval '1 day' where id=$1", [draft.article_id]);
    expect((await one('select public.increment_article_view($1,$2) counted', [draft.article_id, 'reader'])).counted).toBe(false);
    await db.query("update public.articles set title='[FICTIONAL TEST] Analytics fixture',is_seed=true,published_at=now()-interval '1 day' where id=$1", [draft.article_id]);
    expect((await one('select public.increment_article_view($1,$2) counted', [draft.article_id, 'reader'])).counted).toBe(false);
    expect((await one('select public.increment_article_view($1,$2) counted', ['99999999-9999-4999-8999-999999999999', 'reader'])).counted).toBe(false);
    expect((await one('select count(*)::int n from public.article_daily_views')).n).toBe(0);
    expect((await one('select count(*)::int n from public.get_trending_articles(5)')).n).toBe(0);
  });
  it('expires official weekly records when sources are disabled and hides weeks after parent unpublishes', async () => {
    const article = await ingest(OFFICIAL, { url: 'https://www.rockstargames.com/test-current-week' });
    await db.query(`insert into public.weekly_updates(slug,event_start,event_end,source_url,article_id,status,verification_status)
      values('test-active-week',now()-interval '1 day',now()+interval '1 day','https://www.rockstargames.com/test-current-week',$1,'PUBLISHED','CONFIRMED')`, [article.article_id]);
    await db.query('select public.admin_edit_article($1,$2::jsonb,$3)', [article.article_id, JSON.stringify({ status: 'DRAFT' }), 'editor@example.test']);
    expect((await one('select status from public.weekly_updates')).status).toBe('DRAFT');
    // Republishing an article does not implicitly approve weekly extraction.
    await db.query('select public.admin_edit_article($1,$2::jsonb,$3)', [article.article_id, JSON.stringify({ status: 'PUBLISHED' }), 'editor@example.test']);
    expect((await one('select status from public.weekly_updates')).status).toBe('DRAFT');
    await db.exec("update public.weekly_updates set status='PUBLISHED',event_start=now()-interval '2 days',event_end=now()-interval '1 day'");
    await db.query('update public.sources set enabled=false where id=$1', [OFFICIAL]);
    await db.exec('select public.expire_editorial_content()');
    expect((await one('select status from public.weekly_updates')).status).toBe('ARCHIVED');
  });
});
