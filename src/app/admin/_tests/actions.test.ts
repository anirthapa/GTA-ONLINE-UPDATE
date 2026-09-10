import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), getDb: vi.fn(), runNewsSync: vi.fn(), testSource: vi.fn(), validateSourceConfiguration: vi.fn(), isOfficialUrl: vi.fn(), verifiedSourceTrust: vi.fn(), revalidatePath: vi.fn(), clearPublicCache: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/db', () => ({ getDb: mocks.getDb }));
vi.mock('@/services/cache', () => ({ clearPublicCache: mocks.clearPublicCache }));
vi.mock('@/services/ingestion/pipeline', () => ({ runNewsSync: mocks.runNewsSync }));
vi.mock('@/services/sources', () => ({ testSource: mocks.testSource, validateSourceConfiguration: mocks.validateSourceConfiguration }));
vi.mock('@/services/trust', () => ({ isOfficialUrl: mocks.isOfficialUrl, verifiedSourceTrust: mocks.verifiedSourceTrust }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
import { deleteRecord, saveRecord, sourceOperation } from '../actions';

const id = '123e4567-e89b-42d3-a456-426614174000';
function operationForm(operation: string) { const form = new FormData(); form.set('operation', operation); return form; }
function articleForm() {
  const form = new FormData();
  const values = { slug: 'test-story', title: 'Edited test story', excerpt: 'An attributed test story.', content: 'This is sufficient editorial test content.', game: 'GTA_ONLINE', category: 'News', status: 'PUBLISHED', verification_status: 'CONFIRMED', source_url: 'https://www.rockstargames.com/newswire', source_name: 'Rockstar', featured_image: '', image_alt: '', seo_title: '', seo_description: '', keywords: '[]', entities: '[]', breaking_expires_at: '', confidence_score: '90', expected_updated_at: '2026-01-01T00:00:00Z' };
  Object.entries(values).forEach(([key, value]) => form.set(key, value));
  return form;
}
beforeEach(() => { mocks.requireAdmin.mockResolvedValue({ id: 'admin', email: 'editor@example.com' }); });
afterEach(() => { vi.resetAllMocks(); });

describe('server action protections', () => {
  it('authenticates every mutation before accessing services or data', async () => {
    mocks.requireAdmin.mockRejectedValue(new Error('Unauthorized'));
    await expect(saveRecord('articles', null, {}, new FormData())).rejects.toThrow('Unauthorized');
    await expect(deleteRecord('articles', id, {}, new FormData())).rejects.toThrow('Unauthorized');
    await expect(sourceOperation(id, 'test', {}, operationForm('test'))).rejects.toThrow('Unauthorized');
    await expect(sourceOperation(null, 'sync', {}, operationForm('sync'))).rejects.toThrow('Unauthorized');
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.testSource).not.toHaveBeenCalled();
    expect(mocks.runNewsSync).not.toHaveBeenCalled();
  });
  it('requires typed deletion confirmation', async () => {
    expect((await deleteRecord('articles', id, {}, new FormData())).error).toContain('DELETE');
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it('uses real testSource and surfaces safe adapter failure messages', async () => {
    mocks.testSource.mockRejectedValue(new Error('Source DNS validation timed out.'));
    expect((await sourceOperation(id, 'test', {}, operationForm('test'))).error).toContain('Source DNS validation timed out');
    expect(mocks.testSource).toHaveBeenCalledWith(id);
    mocks.testSource.mockRejectedValue(new Error('Source failed with token=private-secret'));
    expect((await sourceOperation(id, 'test', {}, operationForm('test'))).error).not.toContain('private-secret');
  });
  it('reports partial and failed syncs as errors and enforces the time budget', async () => {
    mocks.runNewsSync.mockResolvedValue({ status: 'PARTIAL', failed: 2, processed: 1, skipped: 0, sources: 3, runId: id });
    const result = await sourceOperation(null, 'sync', {}, operationForm('sync'));
    expect(result.error).toContain('2 source/item failures');
    expect(result.result).toContain('PARTIAL');
    expect(mocks.runNewsSync).toHaveBeenCalledWith({}, { budgetMs: 240_000 });
  });
  it('preserves a historical published edit without rechecking a disabled source', async () => {
    const previous = { id, status: 'PUBLISHED', verification_status: 'CONFIRMED', source_url: 'https://www.rockstargames.com/newswire', confidence_score: 90 };
    const single = vi.fn().mockResolvedValue({ data: previous, error: null });
    const from = vi.fn().mockReturnValue({ select: () => ({ eq: () => ({ single }) }) });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mocks.getDb.mockReturnValue({ from, rpc });
    await expect(saveRecord('articles', id, {}, articleForm())).rejects.toThrow(`REDIRECT:/admin/articles/${id}?saved=1`);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('articles');
    expect(mocks.validateSourceConfiguration).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('admin_edit_article', expect.objectContaining({ p_expected_updated_at: '2026-01-01T00:00:00Z', p_actor: 'editor@example.com' }));
    expect(mocks.clearPublicCache).toHaveBeenCalledOnce();
  });
  it('rejects fake official release authority before writing', async () => {
    const form = new FormData();
    Object.entries({ site_name: 'Test newsroom', release_date: '2027-01-01T00:00', release_source_url: 'https://attacker.example/release', release_verified_at: '2026-01-01T00:00', confidence_threshold: '85' }).forEach(([key, value]) => form.set(key, value));
    mocks.isOfficialUrl.mockReturnValue(false);
    const from = vi.fn(); mocks.getDb.mockReturnValue({ from });
    expect((await saveRecord('settings', 'default', {}, form)).error).toContain('approved official Rockstar source');
    expect(from).not.toHaveBeenCalled();
  });
  it('reports post-commit cache failures separately from a successful save', async () => {
    const previous = { id, status: 'PUBLISHED', verification_status: 'CONFIRMED', source_url: 'https://www.rockstargames.com/newswire', confidence_score: 90 };
    const from = vi.fn().mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: previous, error: null }) }) }) });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    mocks.getDb.mockReturnValue({ from, rpc });
    mocks.clearPublicCache.mockRejectedValue(new Error('Cache unavailable'));
    await expect(saveRecord('articles', id, {}, articleForm())).rejects.toThrow(`REDIRECT:/admin/articles/${id}?saved=1&cache=stale`);
    expect(rpc).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });
});
