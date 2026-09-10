import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ isDatabaseConfigured: () => false, getDb: () => { throw new Error('not configured'); } }));
import { getArticles, getGuides, getVehicles, getWeeklyUpdate, getSettings } from '../../src/services/public-data';
afterEach(() => vi.unstubAllEnvs());
describe('public fixture boundary', () => {
  it('never silently serves demo news or dates in unconfigured production', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('DEMO_MODE', 'false');
    expect(await getArticles()).toEqual([]); expect(await getGuides()).toEqual([]); expect(await getVehicles()).toEqual([]);
    expect(await getWeeklyUpdate()).toBeNull(); expect((await getSettings()).release_date).toBeNull();
  });
  it('even an explicit production demo flag never serves fictional fallback', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('DEMO_MODE', 'true');
    expect(await getArticles()).toEqual([]); expect(await getGuides()).toEqual([]);
  });
  it('nonproduction demo mode contains only labeled historical fiction and no active weekly event', async () => {
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DEMO_MODE', 'true');
    const articles = await getArticles();
    expect(articles).toHaveLength(8);
    expect(articles.every(row => row.is_seed && row.title.startsWith('[FICTIONAL TEST]') && row.published_at!.startsWith('2000-'))).toBe(true);
    expect(await getWeeklyUpdate()).toBeNull();
    expect((await getGuides('HEIST')).length).toBe(2); expect((await getGuides('CHARACTER')).length).toBe(2);
  });
});
