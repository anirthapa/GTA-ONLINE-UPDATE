import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { extractStory, validateExtraction, validateWeekly, EXTRACTION_VERSION, type Extraction, type ExtractionUsage } from '../ai/extract';
import { fetchSource, type AdapterResult } from '../sources';
import { DEFAULT_SETTINGS } from '../defaults';
import { slugify } from '../identity';
import { enforceTrust } from '../trust';
import type { Settings, Source, SourceItem } from '../types';

export interface SyncResult {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED'; runId: string | null;
  processed: number; skipped: number; failed: number; sources: number; reason?: string;
}
export interface PipelineDependencies {
  db?: SupabaseClient; fetch?: (source: Source) => Promise<AdapterResult>;
  extract?: (item: SourceItem) => Promise<Extraction>; budgetMs?: number;
}
function assertResult(error: { message: string } | null) { if (error) throw new Error(error.message); }
export function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown ingestion failure';
  return message.replace(/sk-[\w-]+/g, '[redacted]').replace(/(Bearer\s+)[^\s]+/gi, '$1[redacted]')
    .replace(/([?&](?:key|token|api_key|secret)=)[^&\s]+/gi, '$1[redacted]').slice(0, 600);
}
export function isGtaRelevant(item: Pick<SourceItem, 'title' | 'content'>): boolean {
  return /\b(?:GTA(?:\s*(?:V|VI|5|6|Online))?|Grand\s+Theft\s+Auto|Los\s+Santos|Cayo\s+Perico|Vice\s+City|Leonida|Diamond\s+Casino\s+Heist)\b/i.test(`${item.title} ${item.content}`);
}
export function ingestionBudget(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(5000, Math.min(parsed, 240_000)) : 240_000;
}
export async function runNewsSync({ sourceId }: { sourceId?: string } = {}, deps: PipelineDependencies = {}): Promise<SyncResult> {
  if (sourceId) z.uuid().parse(sourceId);
  const db = deps.db || getDb();
  if (!deps.extract && !process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for real news ingestion.');
  const owner = randomUUID();
  const result: SyncResult = { status: 'SKIPPED', runId: null, processed: 0, skipped: 0, failed: 0, sources: 0 };
  const rpc = async (name: string, args: Record<string, unknown> = {}) => {
    const response = await db.rpc(name, args); assertResult(response.error); return response.data;
  };
  const renew = async () => {
    if (!await rpc('renew_ingestion_lease', { p_key: 'news-sync', p_owner: owner, p_ttl_seconds: 120 })) throw new Error('Ingestion lease lost.');
  };
  const log = async (level: 'INFO' | 'WARN' | 'ERROR', event: string, message: string, source_id?: string, details: Record<string, unknown> = {}) => {
    const { error } = await db.from('automation_logs').insert({ run_id: result.runId, source_id: source_id || null, level, event, message, details }); assertResult(error);
  };
  if (!await rpc('acquire_ingestion_lease', { p_key: 'news-sync', p_owner: owner, p_ttl_seconds: 120 })) return { ...result, reason: 'Another ingestion worker holds the durable lease.' };
  const deadline = Date.now() + ingestionBudget(deps.budgetMs ?? process.env.INGESTION_BUDGET_MS);
  try {
    await rpc('expire_editorial_content');
    const idempotencyKey = sourceId ? `manual:${sourceId}:${owner}` : `cron:${Math.floor(Date.now() / 300_000)}`;
    const run = await db.from('automation_runs').insert({ idempotency_key: idempotencyKey, owner, source_id: sourceId || null }).select('id').single();
    if (run.error?.code === '23505') return { ...result, reason: 'This scheduled interval has already run.' };
    assertResult(run.error); result.runId = run.data!.id;
    const settingsQuery = await db.from('site_settings').select('*').eq('id', 'default').single(); assertResult(settingsQuery.error);
    const settings: Settings = { ...DEFAULT_SETTINGS, ...settingsQuery.data };
    let request = db.from('sources').select('*').eq('enabled', true).order('last_checked_at', { ascending: true, nullsFirst: true }).limit(100);
    if (sourceId) request = request.eq('id', sourceId);
    const sources = await request; assertResult(sources.error);
    if (sourceId && !sources.data?.length) throw new Error('Requested source is missing or disabled.');
    result.status = 'SUCCESS';
    for (const source of (sources.data || []) as Source[]) {
      if (Date.now() >= deadline - 5000) { result.status = 'PARTIAL'; break; }
      if (!sourceId && source.last_checked_at && Date.parse(source.last_checked_at) + source.fetch_frequency * 60_000 > Date.now()) continue;
      await renew(); result.sources++;
      let itemFailures = 0, interrupted = false;
      try {
        const fetched = await (deps.fetch || fetchSource)(source);
        if (fetched.rejected) await log('WARN', 'source_items_rejected', 'Some feed entries failed source validation.', source.id, { count: fetched.rejected });
        for (const item of fetched.items) {
          if (Date.now() >= deadline - 5000) { interrupted = true; result.status = 'PARTIAL'; break; }
          await renew();
          const prior = await db.from('source_items').select('status,attempts').eq('source_id', source.id).eq('canonical_url', item.url).eq('content_hash', item.content_hash).maybeSingle();
          assertResult(prior.error);
          if (prior.data && (prior.data.status !== 'FAILED' || prior.data.attempts >= 3)) { result.skipped++; continue; }
          let committedSuccessfully = false;
          try {
            if (!isGtaRelevant(item)) {
              await rpc('ingest_source_item', { p_run_id: result.runId, p_owner: owner, p_source_id: source.id, p_item: item,
                p_article: { relevant: false, confidence_score: 0, rumor: false, needs_review: false }, p_weekly: null });
              committedSuccessfully = true; result.skipped++;
              await log('INFO', 'irrelevant_before_ai', 'Non-GTA source item ignored without an AI call.', source.id);
              continue;
            }
            const duplicate = await rpc('try_attach_duplicate', { p_run_id: result.runId, p_owner: owner, p_source_id: source.id, p_item: item });
            if (duplicate.action !== 'needs_extraction') {
              committedSuccessfully = true;
              if (duplicate.action === 'skipped') result.skipped++; else result.processed++;
              await log('INFO', 'duplicate_before_ai', 'Duplicate source attached without an AI call.', source.id, { article_id: duplicate.article_id, match: duplicate.match });
              continue;
            }
            const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
            const cacheKey = `${EXTRACTION_VERSION}:${model}:${item.content_hash}`;
            const cache = await db.from('ai_extractions').select('result').eq('cache_key', cacheKey).gt('expires_at', new Date().toISOString()).maybeSingle();
            assertResult(cache.error);
            let usage: ExtractionUsage = { model, input_tokens: 0, output_tokens: 0, total_tokens: 0 };
            let extracted: Extraction;
            if (cache.data) {
              extracted = validateExtraction(cache.data.result, item);
              await log('INFO', 'ai_cache_hit', 'Validated extraction reused from database cache.', source.id, { model, input_tokens: 0, output_tokens: 0, total_tokens: 0, cache_hit: true });
            } else {
              const onUsage = async (measured: ExtractionUsage) => {
                usage = measured;
                await log('INFO', 'ai_usage', 'Structured extraction token usage.', source.id, { ...measured, cache_hit: false });
              };
              extracted = validateExtraction(await (deps.extract ? deps.extract(item) : extractStory(item, { onUsage })), item);
              const saved = await db.from('ai_extractions').upsert({ cache_key: cacheKey, content_hash: item.content_hash, model,
                schema_version: EXTRACTION_VERSION, result: extracted, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens,
                expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString() });
              assertResult(saved.error);
            }
            // Generated verification/source URLs, if smuggled in, are rejected by
            // strict Zod. Actual source authority is enforced here and in SQL.
            const policy = enforceTrust(source, item.url, extracted.confidence_score, settings, {
              rumor: extracted.rumor, relevant: extracted.relevant, needsReview: extracted.needs_review,
            });
            const weekly = extracted.weekly && source.trust_level === 'OFFICIAL' ? validateWeekly(extracted.weekly, item.content) : null;
            const article = { ...extracted, ...policy, slug: `${slugify(extracted.title)}-${item.content_hash.slice(0, 10)}` };
            await renew();
            const committed = await rpc('ingest_source_item', { p_run_id: result.runId, p_owner: owner, p_source_id: source.id, p_item: item, p_article: article, p_weekly: weekly });
            committedSuccessfully = true;
            if (committed.action === 'skipped') result.skipped++; else result.processed++;
            await log('INFO', `item_${committed.action}`, 'Source item processed.', source.id, { article_id: committed.article_id, status: committed.status });
          } catch (error) {
            if (committedSuccessfully) throw error; // Never turn a committed item into FAILED because logging failed.
            await renew(); // A fenced-out worker must not record competing state.
            itemFailures++; result.failed++;
            const failed = await db.from('source_items').upsert({ source_id: source.id, external_id: item.external_id,
              canonical_url: item.url, title: item.title, content_hash: item.content_hash, title_fingerprint: item.title_fingerprint,
              published_at: item.published_at, modified_at: item.modified_at, status: 'FAILED', attempts: (prior.data?.attempts || 0) + 1,
              last_error: safeError(error), run_id: result.runId }, { onConflict: 'source_id,canonical_url,content_hash' });
            assertResult(failed.error);
            await log('ERROR', 'item_failed', safeError(error), source.id, { url: item.url.split('?')[0] });
          }
        }
        await renew();
        const patch = interrupted ? {} : { last_checked_at: new Date().toISOString() };
        const sourceUpdate = await db.from('sources').update({ ...patch,
          ...(itemFailures || interrupted ? {} : { last_successful_fetch_at: new Date().toISOString() }),
          failure_count: itemFailures ? source.failure_count + 1 : 0,
        }).eq('id', source.id); assertResult(sourceUpdate.error);
        if (itemFailures || fetched.rejected || interrupted) result.status = 'PARTIAL';
        await log(itemFailures ? 'WARN' : 'INFO', 'source_finished', interrupted ? 'Time budget reached; remaining items resume on the next run.' : 'Source fetch completed.', source.id,
          { items: fetched.items.length, failed: itemFailures, rejected: fetched.rejected });
      } catch (error) {
        await renew(); result.failed++; result.status = 'PARTIAL';
        const failure = await db.from('sources').update({ last_checked_at: new Date().toISOString(), failure_count: source.failure_count + 1 }).eq('id', source.id); assertResult(failure.error);
        await log('ERROR', 'source_failed', safeError(error), source.id);
      }
    }
    await renew();
    const finished = await db.from('automation_runs').update({ status: result.status, finished_at: new Date().toISOString(),
      processed_count: result.processed, skipped_count: result.skipped, failed_count: result.failed, summary: result }).eq('id', result.runId).eq('owner', owner);
    assertResult(finished.error); return result;
  } catch (error) {
    if (result.runId) {
      await db.from('automation_runs').update({ status: 'FAILED', finished_at: new Date().toISOString(),
        failed_count: result.failed + 1, summary: { ...result, error: safeError(error) } }).eq('id', result.runId).eq('owner', owner);
      await log('ERROR', 'run_failed', safeError(error));
    }
    throw error;
  } finally { await rpc('release_ingestion_lease', { p_key: 'news-sync', p_owner: owner }); }
}
