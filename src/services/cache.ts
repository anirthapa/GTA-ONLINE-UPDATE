import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getDb } from '@/lib/db';

export async function clearPublicCache(): Promise<void> {
  const { error } = await getDb().from('cache_entries').delete().not('key', 'is', null);
  if (error) throw new Error(`Cache refresh failed: ${error.message}`);
}

export async function cached<T>(key: string, read: () => Promise<T>, ttlSeconds = 45, db: SupabaseClient = getDb()): Promise<T> {
  const { data, error } = await db.from('cache_entries').select('value').eq('key', key).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!error && data) return data.value as T;
  const value = await read();
  // Cache outages must not turn a successful authoritative read into an outage.
  // A new write invalidates this row with a DB trigger; TTL bounds read/write races.
  await db.from('cache_entries').upsert({ key, value, expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(), updated_at: new Date().toISOString() });
  return value;
}
