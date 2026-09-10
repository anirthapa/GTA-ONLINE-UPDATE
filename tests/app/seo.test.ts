import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SitemapArticle } from '@/lib/seo';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/db', () => ({ getDb: () => ({ from: db.from }) }));
const now = new Date('2026-09-10T12:00:00Z');
const article: SitemapArticle = { id: 'qa-story', slug: 'qa-story', title: 'Test story', status: 'PUBLISHED', verification_status: 'CONFIRMED', is_seed: false,
  source_url: 'https://www.rockstargames.com/newswire/test', published_at: '2026-09-09T12:00:00Z', updated_at: '2026-09-09T13:00:00Z' };

beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('DEMO_MODE', 'false'); vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://wire.example.com');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://qa.supabase.co'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'qa-placeholder');
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('SEO escaping and production indexability', () => {
  it('round-trips hostile JSON-LD text without allowing a closing script tag', async () => {
    const { jsonLd } = await import('@/lib/seo');
    const input = { headline: '</script><script>alert("x")</script>', description: '<!-- & \u2028 \u2029', nested: { value: '<img src=x onerror=alert(1)>' } };
    const output = jsonLd(input);
    expect(output).not.toContain('<');
    expect(JSON.parse(output)).toEqual(input);
    expect(() => jsonLd(undefined)).toThrow(TypeError);
    const circular: { self?: unknown } = {}; circular.self = circular;
    expect(() => jsonLd(circular)).toThrow(TypeError);
  });
  it('only enables indexing with complete production configuration', async () => {
    const { indexingAllowed, pageMetadata } = await import('@/lib/seo');
    expect(indexingAllowed()).toBe(true);
    expect(pageMetadata('Title', 'Description', '/news/story?utm_source=x#section')).toMatchObject({
      alternates: { canonical: 'https://wire.example.com/news/story' }, robots: { index: true, follow: true },
      openGraph: { url: 'https://wire.example.com/news/story' },
    });
  });
  it.each([
    ['NODE_ENV', 'development'], ['DEMO_MODE', 'true'], ['VERCEL_ENV', 'preview'],
    ['NEXT_PUBLIC_SUPABASE_URL', ' '], ['SUPABASE_SERVICE_ROLE_KEY', ''], ['NEXT_PUBLIC_SITE_URL', ''],
  ])('disables indexing when %s=%s', async (key, value) => {
    vi.stubEnv(key, value);
    const { indexingAllowed, sitemapArticles } = await import('@/lib/seo');
    expect(indexingAllowed()).toBe(false);
    expect(await sitemapArticles()).toEqual([]);
    expect(db.from).not.toHaveBeenCalled();
    expect((await import('@/app/robots')).default()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });
  it.each(['http://wire.example.com', 'https://localhost', 'https://preview.localhost', 'https://preview.test', 'https://preview.invalid', 'https://user:pass@wire.example.com', 'https://wire.example.com/subpath', 'https://wire.example.com?q=1', 'https://wire.example.com/#x', 'invalid'])('refuses unsuitable canonical origin %s', async url => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', url);
    const { canonicalOrigin, indexingAllowed } = await import('@/lib/seo');
    expect(canonicalOrigin()).toBeNull(); expect(indexingAllowed()).toBe(false);
  });
  it.each(['/admin', '/admin/articles', '/auth/callback', '/api/search', '/search?q=test'])('excludes private/utility route %s', async path => {
    const { pageMetadata } = await import('@/lib/seo');
    expect(pageMetadata('Title', 'Description', path).robots).toEqual({ index: false, follow: false });
  });
  it.each(['https://evil.example.com', '//evil.example.com', '/\\evil', '/news\nheader'])('rejects nonlocal metadata path %s', async path => {
    const { pageMetadata } = await import('@/lib/seo');
    expect(() => pageMetadata('Title', 'Description', path)).toThrow('site-relative');
  });
  it.each(['CONFIRMED', 'REPORTED', 'RUMOR'])('allows sourced published %s reporting', async verification_status => {
    expect((await import('@/lib/seo')).isIndexableArticle({ ...article, verification_status }, now.getTime())).toBe(true);
  });
  it.each([
    { status: 'DRAFT' }, { status: 'ARCHIVED' }, { verification_status: 'UNKNOWN' }, { is_seed: true },
    { published_at: null }, { published_at: 'invalid' }, { published_at: '2026-09-10T12:00:01Z' },
    { slug: '' }, { slug: '.' }, { slug: '..' }, { title: ' ' }, { source_url: 'javascript:alert(1)' }, { source_url: 'http://example.com' },
  ])('excludes ineligible article %j', async patch => {
    expect((await import('@/lib/seo')).isIndexableArticle({ ...article, ...patch }, now.getTime())).toBe(false);
  });
  it('encodes the entire article slug as one URL segment', async () => {
    expect((await import('@/lib/seo')).articleUrl('story/with ?q=<x>&y=1')).toBe('https://wire.example.com/news/story%2Fwith%20%3Fq%3D%3Cx%3E%26y%3D1');
  });
  it('advertises only production sitemap URLs in robots', async () => {
    expect((await import('@/app/robots')).default()).toMatchObject({ sitemap: ['https://wire.example.com/sitemap.xml', 'https://wire.example.com/news-sitemap.xml'] });
  });
});

function queryResult(data: SitemapArticle[], error: unknown = null) {
  const result = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), lte: vi.fn(), order: vi.fn(), range: vi.fn(), gte: vi.fn(), not: vi.fn(), limit: vi.fn(),
    then: (resolve: (value: { data: SitemapArticle[]; error: unknown }) => unknown) => Promise.resolve({ data, error }).then(resolve) };
  for (const key of ['select', 'eq', 'in', 'lte', 'order', 'range', 'gte', 'not', 'limit'] as const) result[key].mockReturnValue(result);
  return result;
}

describe('sitemaps against persisted rows', () => {
  it('paginates beyond Supabase default row count and filters bad rows defensively', async () => {
    const first = queryResult(Array.from({ length: 1000 }, (_, i) => ({ ...article, id: `${i}`, slug: `story-${i}` })));
    const second = queryResult([{ ...article, id: 'last' }, { ...article, is_seed: true }]);
    db.from.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const rows = await (await import('@/lib/seo')).sitemapArticles({ limit: 1002 });
    expect(rows).toHaveLength(1001);
    expect(first.range).toHaveBeenCalledWith(0, 999);
    expect(second.range).toHaveBeenCalledWith(1000, 1001);
    expect(first.eq).toHaveBeenCalledWith('status', 'PUBLISHED');
    expect(first.eq).toHaveBeenCalledWith('is_seed', false);
    expect(first.lte).toHaveBeenCalledWith('published_at', now.toISOString());
  });
  it('does not disguise a DB outage as an empty successful sitemap', async () => {
    db.from.mockReturnValue(queryResult([], { message: 'private details' }));
    await expect((await import('@/lib/seo')).sitemapArticles()).rejects.toThrow('Unable to read published articles for sitemap.');
  });
  it('escapes XML titles, drops XML control characters and requests only the last 48 hours', async () => {
    const query = queryResult([{ ...article, title: `A & <B> "C" 'D'\u0001` }]);
    db.from.mockReturnValue(query);
    const response = await (await import('@/app/news-sitemap.xml/route')).GET();
    const body = await response.text();
    expect(response.headers.get('content-type')).toBe('application/xml; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toContain('<news:title>A &amp; &lt;B&gt; &quot;C&quot; &apos;D&apos;</news:title>');
    expect(body).not.toContain('\u0001');
    expect(query.gte).toHaveBeenCalledWith('published_at', '2026-09-08T12:00:00.000Z');
    expect(query.range).toHaveBeenCalledWith(0, 999);
  });
  it.each(['invalid', '2026-09-08T00:00:00Z', '2027-01-01T00:00:00Z'])('uses publication time when updated_at is unsuitable: %s', async updated_at => {
    db.from.mockImplementation((table: string) => queryResult(table === 'articles' ? [{ ...article, updated_at }] : []));
    const rows = await (await import('@/app/sitemap')).default();
    expect(rows.filter(row => row.url === 'https://wire.example.com/news/qa-story')).toEqual([{ url: 'https://wire.example.com/news/qa-story', lastModified: new Date(article.published_at!) }]);
  });
});
