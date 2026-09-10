import { createClient } from '@supabase/supabase-js';
import { DEMO_ARTICLES, DEMO_GUIDES, DEMO_VEHICLES, DEMO_WEEKLY } from '../src/services/demo';

// Explicit fixture-only seed. Does not configure publishers, dates, credentials,
// auto-publishing, or real/current GTA claims. Production reads exclude is_seed.
async function seed() {
  if (process.env.ALLOW_FICTIONAL_SEED !== 'true') throw new Error('Set ALLOW_FICTIONAL_SEED=true to explicitly load fictional test fixtures.');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase URL and service role key are required.');
  const db = createClient(url, key, { auth: { persistSession: false } });
  for (const [table, rows] of [
    ['articles', DEMO_ARTICLES], ['weekly_updates', DEMO_WEEKLY], ['vehicles', DEMO_VEHICLES], ['guides', DEMO_GUIDES],
  ] as const) {
    const { error } = await db.from(table).upsert(rows.map(row => ({ ...row })) as Record<string, unknown>[], { onConflict: 'id' });
    if (error) throw new Error(`Fixture seed failed for ${table}: ${error.message}`);
    console.log(`Loaded ${rows.length} clearly fictional ${table} fixtures.`);
  }
}
seed().catch(error => { console.error(error.message); process.exitCode = 1; });
