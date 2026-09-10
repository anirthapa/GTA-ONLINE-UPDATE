import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNewsSync } from '../../src/services/ingestion/pipeline';
import { DEFAULT_SETTINGS } from '../../src/services/defaults';
import { extraction, item, source } from './fixtures';

// The coordinator is tested through the Supabase surface; transactional behavior
// is separately executed against PostgreSQL in database.test.ts.
function database(options: { duplicate?: boolean; cached?: boolean; runDuplicate?: boolean; lease?: boolean } = {}) {
  const writes: Array<{ table: string; operation: string; value: Record<string, unknown> }> = [];
  const second = { ...source, id: '10000000-0000-4000-8000-000000000004', name: 'Second test source' };
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    if (name === 'acquire_ingestion_lease') return { data: options.lease !== false, error: null };
    if (name === 'try_attach_duplicate') return { data: { action: options.duplicate ? 'attached' : 'needs_extraction', article_id: 'a' }, error: null };
    if (name === 'ingest_source_item') return { data: { action: (args?.p_article as Record<string, unknown>)?.relevant === false ? 'skipped' : 'created', article_id: 'a' }, error: null };
    return { data: true, error: null };
  });
  const from = vi.fn((table: string) => {
    let operation = 'select'; let value: Record<string, unknown> = {};
    const resolve = () => {
      if (operation !== 'select') writes.push({ table, operation, value });
      if (table === 'automation_runs' && operation === 'insert') return options.runDuplicate ? { data: null, error: { code: '23505', message: 'duplicate' } } : { data: { id: '30000000-0000-4000-8000-000000000002' }, error: null };
      if (table === 'site_settings') return { data: { ...DEFAULT_SETTINGS }, error: null };
      if (table === 'sources' && operation === 'select') return { data: [source, second], error: null };
      if (table === 'ai_extractions' && operation === 'select') return { data: options.cached ? { result: extraction } : null, error: null };
      return { data: null, error: null };
    };
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'gt', 'order', 'limit']) builder[method] = () => builder;
    for (const method of ['insert', 'upsert', 'update']) builder[method] = (data: Record<string, unknown>) => { operation = method; value = data; return builder; };
    builder.single = async () => resolve(); builder.maybeSingle = async () => resolve();
    builder.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => Promise.resolve(resolve()).then(onFulfilled, onRejected);
    return builder;
  });
  return { db: { from, rpc } as unknown as SupabaseClient, rpc, writes, second };
}
describe('ingestion coordinator', () => {
  it('isolates a failing source, processes the next source, persists metrics and releases the lease', async () => {
    const fake = database(); const extract = vi.fn(async () => extraction);
    const fetch = vi.fn(async (configured: typeof source) => {
      if (configured.id === source.id) throw new Error('Publisher unavailable');
      return { items: [item], rejected: 0, fetchedUrl: source.url };
    });
    const result = await runNewsSync({}, { db: fake.db, fetch, extract });
    expect(result).toMatchObject({ status: 'PARTIAL', sources: 2, processed: 1, failed: 1 });
    expect(extract).toHaveBeenCalledTimes(1);
    expect(fake.writes.some(row => row.table === 'automation_logs' && row.value.event === 'source_failed')).toBe(true);
    expect(fake.writes.some(row => row.table === 'automation_runs' && row.value.status === 'PARTIAL')).toBe(true);
    expect(fake.rpc.mock.calls.at(-1)?.[0]).toBe('release_ingestion_lease');
  });
  it('persists irrelevant hashes and does not call AI for unrelated Rockstar feeds', async () => {
    const fake = database(), extract = vi.fn(async () => extraction);
    const fetch = async () => ({ items: [{ ...item, title: 'Red Dead news', content: 'Rockstar Games releases an unrelated Western game announcement.' }], rejected: 0, fetchedUrl: source.url });
    const result = await runNewsSync({}, { db: fake.db, fetch, extract });
    expect(result.skipped).toBe(2); expect(extract).not.toHaveBeenCalled();
    expect(fake.rpc.mock.calls.filter(([name]) => name === 'ingest_source_item')).toHaveLength(2);
  });
  it('attaches preflight duplicates without AI or extraction cache work', async () => {
    const fake = database({ duplicate: true }), extract = vi.fn(async () => extraction);
    const result = await runNewsSync({}, { db: fake.db, extract, fetch: async () => ({ items: [item], rejected: 0, fetchedUrl: source.url }) });
    expect(result.processed).toBe(2); expect(extract).not.toHaveBeenCalled();
    expect(fake.writes.some(row => row.table === 'ai_extractions')).toBe(false);
  });
  it('revalidates database extraction cache before reuse and records cache hits', async () => {
    const fake = database({ cached: true }), extract = vi.fn(async () => extraction);
    await runNewsSync({}, { db: fake.db, extract, fetch: async () => ({ items: [item], rejected: 0, fetchedUrl: source.url }) });
    expect(extract).not.toHaveBeenCalled();
    expect(fake.writes.filter(row => row.value.event === 'ai_cache_hit')).toHaveLength(2);
  });
  it('stores malformed AI failures without publishing or preventing other sources', async () => {
    const fake = database(), extract = vi.fn(async () => ({ ...extraction, evidence: ['Invented unsupported quote from nowhere.'] }));
    const result = await runNewsSync({}, { db: fake.db, extract, fetch: async () => ({ items: [item], rejected: 0, fetchedUrl: source.url }) });
    expect(result.failed).toBe(2); expect(result.processed).toBe(0);
    expect(fake.writes.filter(row => row.table === 'source_items' && row.value.status === 'FAILED')).toHaveLength(2);
    expect(fake.rpc.mock.calls.some(([name]) => name === 'ingest_source_item')).toBe(false);
  });
  it('skips concurrent workers and duplicate schedule intervals', async () => {
    const extract = vi.fn(async () => extraction);
    const concurrent = database({ lease: false });
    expect((await runNewsSync({}, { db: concurrent.db, extract })).status).toBe('SKIPPED');
    expect(concurrent.writes).toHaveLength(0);
    const repeated = database({ runDuplicate: true });
    expect((await runNewsSync({}, { db: repeated.db, extract })).status).toBe('SKIPPED');
    expect(repeated.rpc.mock.calls.at(-1)?.[0]).toBe('release_ingestion_lease');
  });
});
