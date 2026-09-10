import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let db: SupabaseClient | undefined;
export function isDatabaseConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }
export function getDb(): SupabaseClient {
  if (!isDatabaseConfigured()) throw new Error('Database is not configured. Set Supabase environment variables.');
  return db ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
