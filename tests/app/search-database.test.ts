import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/search/route';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/db', () => ({ isDatabaseConfigured: () => true, getDb: () => ({ from: db.from }) }));
// Exercise the real public getters. Bypass only caching, so the DB query is observable.
vi.mock('@/services/cache', () => ({ cached: (_key: string, read: () => Promise<unknown>) => read() }));
function query() {
  const chain = { select: vi.fn(), eq: vi.fn(), lte: vi.fn(), order: vi.fn(), range: vi.fn(), textSearch: vi.fn(), ilike: vi.fn(), limit: vi.fn(), not: vi.fn(), in: vi.fn(),
    then: (resolve: (result: { data: unknown[]; error: null }) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve) };
  for (const method of ['select', 'eq', 'lte', 'order', 'range', 'textSearch', 'ilike', 'limit', 'not', 'in'] as const) chain[method].mockReturnValue(chain);
  return chain;
}
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('DEMO_MODE', 'false'); });
afterEach(() => vi.unstubAllEnvs());

describe('search route through the real public-data query builder', () => {
  it.each([
    ['x),status.eq.DRAFT,or(title.ilike.*)', 'x:* & status:* & eq:* & DRAFT:* & or:* & title:* & ilike:*'],
    ["'; DROP TABLE articles; --", 'DROP:* & TABLE:* & articles:*'],
    ['%_ OR "secret"', 'OR:* & secret:*'],
    ['</script><script>alert(1)</script>', 'script:* & script:* & alert:* & 1:* & script:*'],
  ])('keeps injection-shaped text in bound search parameters: %s', async (term, prefixQuery) => {
    const articles = query(), guides = query(), vehicles = query();
    db.from.mockImplementation((table: string) => ({ articles, guides, vehicles })[table as 'articles']);
    const response = await GET(new NextRequest(`https://wire.example.com/api/search?q=${encodeURIComponent(term)}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [] });
    expect(articles.textSearch).toHaveBeenCalledExactlyOnceWith('search_document', term, { type: 'websearch', config: 'english' });
    expect(guides.textSearch).toHaveBeenCalledExactlyOnceWith('search_document', prefixQuery, { config: 'simple' });
    expect(guides.ilike).not.toHaveBeenCalled();
    expect(articles.eq).toHaveBeenCalledWith('status', 'PUBLISHED');
    expect(articles.eq).toHaveBeenCalledWith('is_seed', false);
    expect(articles.lte).toHaveBeenCalledWith('published_at', expect.any(String));
    expect(articles.range).toHaveBeenCalledWith(0, 6);
    expect(guides.in).toHaveBeenCalledWith('verification_status', ['CONFIRMED', 'REPORTED']);
    expect(vehicles.not).toHaveBeenCalledWith('verified_at', 'is', null);
  });
  it('escapes vehicle ILIKE wildcards and passes only safe prefix terms to guide search', async () => {
    const articles = query(), guides = query(), vehicles = query();
    db.from.mockImplementation((table: string) => ({ articles, guides, vehicles })[table as 'articles']);
    const term = String.raw`50%_\car`;
    expect((await GET(new NextRequest(`https://wire.example.com/api/search?q=${encodeURIComponent(term)}`))).status).toBe(200);
    expect(guides.textSearch).toHaveBeenCalledExactlyOnceWith('search_document', '50:* & car:*', { config: 'simple' });
    expect(vehicles.ilike).toHaveBeenCalledExactlyOnceWith('name', String.raw`%50\%\_\\car%`);
    expect(guides.limit).toHaveBeenCalledWith(5);
    expect(vehicles.limit).toHaveBeenCalledWith(5);
  });
});
