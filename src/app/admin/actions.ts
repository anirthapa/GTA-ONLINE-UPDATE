'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { clearPublicCache } from '@/services/cache';
import { runNewsSync } from '@/services/ingestion/pipeline';
import { testSource, validateSourceConfiguration } from '@/services/sources';
import { isOfficialUrl, verifiedSourceTrust } from '@/services/trust';
import type { Source } from '@/services/types';
import { schemas, tables, type ActionState, type Entity } from './_lib/validation';
import { fields } from './_lib/fields';

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  if (/duplicate key|unique constraint/i.test(message)) return 'That slug or URL already exists. Choose a unique value.';
  if (/foreign key/i.test(message)) return 'This record is linked to other content. Remove the relationship first, or archive / disable this record.';
  if (/concurr|changed|stale|conflict/i.test(message)) return 'This record changed since you opened it. Reload the editor before saving again.';
  if (/configur|environment|API key|OPENAI_API_KEY/i.test(message)) return 'A required service is not configured. Check the server environment and activity logs.';
  if (/source|official|trust|publication|publish|threshold|review|hostname|HTTPS|private|allowlist|date|verification|lock|running|lease/i.test(message) && !/key|token|secret|password/i.test(message)) return message.slice(0, 450);
  return 'The operation could not be completed. Check the database connection, migrations, and server logs, then retry.';
}

function checkEntity(entity: string): asserts entity is Entity {
  if (!Object.hasOwn(tables, entity)) throw new Error('Invalid entity.');
}

async function verifyEvidence(url: string, verification: string) {
  const { data, error } = await getDb().from('sources').select('*').eq('enabled', true).in('trust_level', verification === 'CONFIRMED' ? ['OFFICIAL'] : ['OFFICIAL', 'TRUSTED_MEDIA', 'COMMUNITY']);
  if (error) throw error;
  if (verification === 'CONFIRMED' && !isOfficialUrl(url)) throw new Error('Confirmed evidence requires an approved official Rockstar source URL.');
  for (const source of (data ?? []) as Source[]) {
    try {
      // Revalidate stored configuration, including DNS and ownership, before trusting it.
      if (!source.allowed_hosts.includes(new URL(url).hostname)) continue;
      await validateSourceConfiguration(source);
      verifiedSourceTrust(source, url);
      return;
    } catch { /* A different enabled source may legitimately cover the item. */ }
  }
  throw new Error('No enabled, validated source covers this evidence URL at the required trust level. Configure and test the source first.');
}

async function enforcePolicy(entity: Entity, patch: Record<string, unknown>, previous: Record<string, unknown> | null) {
  const evidenceChanged = !previous || patch.source_url !== previous.source_url || patch.verification_status !== previous.verification_status;
  const publishing = patch.status === 'PUBLISHED' && (!previous || previous.status !== 'PUBLISHED');
  if (entity === 'sources') await validateSourceConfiguration(patch as unknown as Source);
  if (entity === 'settings' && patch.release_date && !isOfficialUrl(String(patch.release_source_url))) throw new Error('Release date verification requires an approved official Rockstar source.');
  if ((entity === 'articles' || entity === 'weekly' || entity === 'guides') && patch.verification_status === 'CONFIRMED' && (evidenceChanged || publishing)) await verifyEvidence(String(patch.source_url), 'CONFIRMED');
  if (entity === 'guides' && patch.verification_status === 'REPORTED' && (evidenceChanged || patch.verified_at !== previous?.verified_at)) await verifyEvidence(String(patch.source_url), 'REPORTED');
  if (entity === 'articles' && patch.status === 'PUBLISHED' && (evidenceChanged || publishing || Number(patch.confidence_score) !== Number(previous?.confidence_score))) {
    if (evidenceChanged || publishing) await verifyEvidence(String(patch.source_url), String(patch.verification_status));
    const { data: settings, error } = await getDb().from('site_settings').select('confidence_threshold').eq('id', 'default').single();
    if (error) throw error;
    if (Number(patch.confidence_score) < Number(settings.confidence_threshold)) throw new Error('Publication confidence is below the configured threshold. Keep this story in review.');
  }
  if (entity === 'vehicles' && patch.verified_at && (!previous || patch.source_url !== previous.source_url || patch.verified_at !== previous.verified_at)) await verifyEvidence(String(patch.source_url), 'REPORTED');
}

async function refreshContent() {
  let refreshed = true;
  try { await clearPublicCache(); } catch { refreshed = false; }
  try { revalidatePath('/', 'layout'); } catch { refreshed = false; }
  return refreshed;
}

export async function saveRecord(entity: Entity, id: string | null, _previous: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  let destination = '';
  try {
    checkEntity(entity);
    if (entity === 'settings') { if (id !== 'default') throw new Error('Invalid settings identifier.'); }
    else if (id) z.uuid().parse(id);
    const raw = Object.fromEntries(fields[entity].map(field => {
      let value: unknown = field.type === 'checkbox' ? form.get(field.name) === 'on' : form.get(field.name) ?? '';
      // datetime-local fields are explicitly labelled UTC, independently of server timezone.
      if (field.type === 'datetime-local' && typeof value === 'string' && value) value = `${value.length === 16 ? `${value}:00` : value}Z`;
      return [field.name, value];
    }));
    const parsed = schemas[entity].safeParse(raw);
    if (!parsed.success) return { error: 'Check the highlighted fields.', fields: Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), `${issue.path.join('.')}: ${issue.message}`])) };
    const patch: Record<string, unknown> = parsed.data;
    const db = getDb();
    let previous: Record<string, unknown> | null = null;
    if (id && entity !== 'settings') {
      const existing = await db.from(tables[entity]).select('*').eq('id', id).single();
      if (existing.error) throw existing.error;
      previous = existing.data;
    }
    const imageField = entity === 'articles' ? 'featured_image' : 'image';
    if (patch[imageField] && patch[imageField] !== previous?.[imageField] && form.get('image_rights_confirmed') !== 'on') return { error: 'Confirm that you have permission to publish this image.', fields: { image_rights_confirmed: 'Image rights acknowledgment is required for a new or changed image.' } };
    await enforcePolicy(entity, patch, previous);
    let savedId = id;
    if (entity === 'articles' && id) {
      const expected = z.iso.datetime({ offset: true }).parse(form.get('expected_updated_at'));
      const { error } = await db.rpc('admin_edit_article', { p_article_id: id, p_patch: patch, p_actor: user.email!, p_expected_updated_at: expected });
      if (error) throw error;
    } else if (entity === 'settings') {
      const { error } = await db.from(tables[entity]).upsert({ ...patch, id: 'default' });
      if (error) throw error;
    } else if (id) {
      const { data, error } = await db.from(tables[entity]).update(patch).eq('id', id).select('id').single();
      if (error || !data) throw error ?? new Error('Record not found.');
    } else {
      if (entity === 'articles') {
        patch.published_at = patch.status === 'PUBLISHED' ? new Date().toISOString() : null;
        patch.editorial_locked = true;
      }
      const { data, error } = await db.from(tables[entity]).insert({ ...patch, ...(entity === 'sources' ? {} : { is_seed: false }) }).select('id').single();
      if (error) throw error;
      savedId = String(data.id);
    }
    const refreshed = await refreshContent();
    destination = entity === 'settings' ? '/admin/settings?saved=1' : `/admin/${entity}/${savedId}?saved=1`;
    if (!refreshed) destination += '&cache=stale';
  } catch (error) { return { error: safeError(error) }; }
  redirect(destination);
}

export async function deleteRecord(entity: Entity, id: string, _previous: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  let refreshed = true;
  try {
    checkEntity(entity);
    if (entity === 'settings') return { error: 'Site settings cannot be deleted.' };
    z.uuid().parse(id);
    if (form.get('confirmation') !== 'DELETE') return { error: 'Type DELETE to confirm permanent removal.' };
    const { data, error } = await getDb().from(tables[entity]).delete().eq('id', id).select('id').single();
    if (error || !data) throw error ?? new Error('Record not found.');
    refreshed = await refreshContent();
  } catch (error) { return { error: safeError(error) }; }
  redirect(`/admin/${entity}?deleted=1${refreshed ? '' : '&cache=stale'}`);
}

export async function sourceOperation(id: string | null, operation: 'test' | 'sync', _previous: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    if (id) z.uuid().parse(id);
    if (!['test', 'sync'].includes(operation) || (!id && operation === 'test')) return { error: 'Invalid source operation.' };
    if (form.get('operation') !== operation) return { error: 'Invalid source operation.' };
    const result = operation === 'test' ? await testSource(id!) : await runNewsSync(id ? { sourceId: id } : {}, { budgetMs: 240_000 });
    const refreshed = await refreshContent();
    if ('status' in result && (result.status === 'FAILED' || result.status === 'PARTIAL')) return { error: `Sync ${result.status === 'FAILED' ? 'failed' : 'completed partially'}: ${result.failed} source/item failures. Inspect the service result and activity logs.`, result: JSON.stringify(result, null, 2) };
    if ('status' in result && result.status === 'SKIPPED') return { success: `No sync was started. ${result.reason ?? 'Another run may already be active.'}`, result: JSON.stringify(result, null, 2) };
    return { success: `${operation === 'test' ? 'Source test completed. Review the adapter result below.' : 'Sync completed. Review the run result and activity logs.'}${refreshed ? '' : ' The operation succeeded, but public cache refresh needs attention.'}`, result: JSON.stringify(result, null, 2).slice(0, 16000) };
  } catch (error) { return { error: safeError(error) }; }
}
