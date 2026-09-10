import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/search/route';

const data = vi.hoisted(() => ({ getArticles: vi.fn(), getGuides: vi.fn(), getVehicles: vi.fn() }));
vi.mock('@/services/public-data', () => data);
const catalog = vi.hoisted(() => ({ searchCatalog: vi.fn() }));
vi.mock('@/lib/search', () => catalog);
const request = (q?: string) => new NextRequest(`https://wire.example.com/api/search${q === undefined ? '' : `?q=${encodeURIComponent(q)}`}`);
beforeEach(() => {
  vi.resetAllMocks(); Object.values(data).forEach(mock => mock.mockResolvedValue([]));
  catalog.searchCatalog.mockImplementation(async () => ({ guides: await data.getGuides(), vehicles: await data.getVehicles() }));
});
afterEach(() => vi.restoreAllMocks());

describe('public search response', () => {
  it.each([undefined, '', ' ', 'a', ' a '])('short-circuits queries below two trimmed characters: %s', async q => {
    const response = await GET(request(q));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [] });
    Object.values(data).forEach(mock => expect(mock).not.toHaveBeenCalled());
    expect(catalog.searchCatalog).not.toHaveBeenCalled();
  });
  it('trims and caps queries at 100 characters before querying articles', async () => {
    await GET(request(`  ${'a'.repeat(101)}  `));
    expect(data.getArticles).toHaveBeenCalledExactlyOnceWith({ query: 'a'.repeat(100), limit: 7 });
    expect(catalog.searchCatalog).toHaveBeenCalledExactlyOnceWith('a'.repeat(100));
  });
  it('maps only public result fields and uses canonical routes for every guide kind', async () => {
    data.getArticles.mockResolvedValue([{ title: 'Test bulletin', slug: 'test-bulletin', content: 'not exposed', internal: 'private' }]);
    data.getGuides.mockResolvedValue([
      { title: 'Test guide', description: '', kind: 'GUIDE', slug: 'test-guide' },
      { title: 'The score', description: 'a TEST heist', kind: 'HEIST', slug: 'test-heist' },
      { title: 'Test person', description: '', kind: 'CHARACTER', slug: 'test-person' },
      { title: 'Test place', description: '', kind: 'LOCATION', slug: 'test-place' },
      { title: 'Test trailer', description: '', kind: 'TRAILER', slug: 'test-trailer' },
      { title: 'Unrelated', description: '', kind: 'GUIDE', slug: 'other' },
    ]);
    data.getVehicles.mockResolvedValue([{ name: 'TEST sedan', slug: 'test-sedan' }, { name: 'Unrelated', slug: 'other-car' }]);
    const response = await GET(request('  TeSt  '));
    expect(response.headers.get('cache-control')).toBe('public, s-maxage=30, stale-while-revalidate=60');
    expect(await response.json()).toEqual({ results: [
      { title: 'Test bulletin', href: '/news/test-bulletin', type: 'News' },
      { title: 'Test guide', href: '/guides/test-guide', type: 'GUIDE' },
      { title: 'The score', href: '/gta-online/heists/test-heist', type: 'HEIST' },
      { title: 'Test person', href: '/gta-6/characters/test-person', type: 'CHARACTER' },
      { title: 'Test place', href: '/gta-6/locations/test-place', type: 'LOCATION' },
      { title: 'Test trailer', href: '/gta-6/trailers/test-trailer', type: 'TRAILER' },
      { title: 'TEST sedan', href: '/gta-online/vehicles/test-sedan', type: 'Vehicle' },
    ] });
  });
  it('maps FEATURE guides to the supported generic guide detail route', async () => {
    data.getGuides.mockResolvedValue([{ title: 'Test feature', description: '', kind: 'FEATURE', slug: 'test-feature' }]);
    expect(await (await GET(request('test'))).json()).toEqual({ results: [{ title: 'Test feature', href: '/guides/test-feature', type: 'FEATURE' }] });
  });
  it('caps the combined result count at twelve', async () => {
    data.getArticles.mockResolvedValue(Array.from({ length: 7 }, (_, i) => ({ title: `Test ${i}`, slug: `test-${i}` })));
    data.getGuides.mockResolvedValue(Array.from({ length: 8 }, (_, i) => ({ title: `Test guide ${i}`, description: '', kind: 'GUIDE', slug: `guide-${i}` })));
    data.getVehicles.mockResolvedValue([{ name: 'Test sedan', slug: 'sedan' }]);
    const { results } = await (await GET(request('test'))).json();
    expect(results).toHaveLength(12);
    expect(results.filter((row: { type: string }) => row.type === 'GUIDE')).toHaveLength(5);
  });
  it('caps matching vehicles at five', async () => {
    data.getVehicles.mockResolvedValue(Array.from({ length: 8 }, (_, i) => ({ name: `Test car ${i}`, slug: `car-${i}` })));
    expect((await (await GET(request('test'))).json()).results).toHaveLength(5);
  });
  it.each(['getArticles', 'getGuides', 'getVehicles'] as const)('returns a generic uncached 503 when %s fails', async getter => {
    data[getter].mockRejectedValue(new Error('private query/database credentials'));
    const response = await GET(request('test'));
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control') ?? '').not.toContain('public');
    expect(await response.json()).toEqual({ error: 'Search unavailable' });
  });
});
