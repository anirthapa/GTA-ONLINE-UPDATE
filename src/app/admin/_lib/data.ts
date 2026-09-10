import 'server-only';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { tables, type Entity } from './validation';

export type AdminRow = Record<string, unknown> & { id: string };
export function entityFrom(value: string): Exclude<Entity, 'settings'> {
  if (!Object.hasOwn(tables, value) || value === 'settings') notFound();
  return value as Exclude<Entity, 'settings'>;
}
export const labels = { articles: 'Articles', weekly: 'Weekly updates', vehicles: 'Vehicles', guides: 'Guides', sources: 'Sources', settings: 'Settings' };
export async function articleOptions() {
  await requireAdmin();
  const { data, error } = await getDb().from('articles').select('id,title,status').order('updated_at', { ascending: false }).limit(200);
  if (error) throw new Error('Could not load related articles.');
  return data as Array<{ id: string; title: string; status: string }>;
}
export function formatDate(value: unknown) {
  if (!value || !Number.isFinite(Date.parse(String(value)))) return '—';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(String(value))) + ' UTC';
}
export async function getRecord(entity: Entity, id: string): Promise<AdminRow> {
  await requireAdmin();
  if (entity !== 'settings' && !z.uuid().safeParse(id).success) notFound();
  const { data, error } = await getDb().from(tables[entity]).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Database query failed. Verify migrations and configuration.');
  if (!data) {
    if (entity === 'settings') return { id: 'default' };
    notFound();
  }
  return data as AdminRow;
}
