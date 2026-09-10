import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db';
import { guidePath, hubs } from '@/lib/hubs';
import { articleUrl, canonicalOrigin, indexingAllowed, isIndexableArticle, sitemapArticles, type SitemapArticle } from '@/lib/seo';
import type { Guide, Vehicle, WeeklyUpdate } from '@/services/types';

export const dynamic = 'force-dynamic';

function validDate(value: string | null | undefined): Date | undefined {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) && time <= Date.now() ? new Date(time) : undefined;
}

function sourced(record: { slug: string; is_seed: boolean; source_url: string | null; status?: string }): boolean {
  if (record.is_seed !== false || !record.slug || record.slug === '.' || record.slug === '..'
    || (record.status !== undefined && !['PUBLISHED', 'ARCHIVED'].includes(record.status))) return false;
  try { return new URL(record.source_url ?? '').protocol === 'https:'; } catch { return false; }
}

type SitemapWeek = WeeklyUpdate & { article: SitemapArticle | null };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexingAllowed()) return [];
  const origin = canonicalOrigin()!;
  const paths = new Set([
    '/', '/news', '/gta-online', '/gta-6', '/gta-online/weekly-update', '/gta-online/vehicles',
    ...Object.keys(hubs).map(path => `/${path}`),
    '/about', '/contact', '/privacy', '/terms', '/disclaimer',
  ]);
  // The weekly landing page remains discoverable while awaiting a verified event.
  // Static routes have no invented last-modified timestamp.
  const entries: MetadataRoute.Sitemap = [...paths].map(path => ({ url: `${origin}${path}` }));
  const db = getDb();
  const now = new Date().toISOString();
  const [guideResult, vehicleResult, weekResult] = await Promise.all([
    db.from('guides').select('slug,kind,is_seed,source_url,verified_at,verification_status')
      .eq('is_seed', false).in('verification_status', ['CONFIRMED', 'REPORTED'])
      .not('verified_at', 'is', null).order('updated_at', { ascending: false }).limit(300),
    db.from('vehicles').select('slug,is_seed,source_url,verified_at')
      .eq('is_seed', false).not('verified_at', 'is', null).order('name').limit(500),
    db.from('weekly_updates')
      .select('slug,is_seed,source_url,status,verification_status,event_start,event_end,last_checked_at,article:articles!inner(id,slug,title,status,verification_status,is_seed,source_url,published_at,updated_at)')
      .eq('is_seed', false).eq('verification_status', 'CONFIRMED').in('status', ['PUBLISHED', 'ARCHIVED'])
      .lte('event_end', now).eq('article.status', 'PUBLISHED').eq('article.is_seed', false)
      .lte('article.published_at', now).order('event_start', { ascending: false }).limit(104),
  ]);
  if (guideResult.error || vehicleResult.error || weekResult.error) throw new Error('Unable to read verified reference pages for sitemap.');
  for (const guide of (guideResult.data ?? []) as Pick<Guide, 'slug' | 'kind' | 'is_seed' | 'source_url' | 'verified_at' | 'verification_status'>[]) {
    const verified = validDate(guide.verified_at);
    if (sourced(guide) && verified && ['CONFIRMED', 'REPORTED'].includes(guide.verification_status)) {
      entries.push({ url: `${origin}${guidePath(guide.kind, encodeURIComponent(guide.slug))}`, lastModified: verified });
    }
  }
  for (const vehicle of (vehicleResult.data ?? []) as Pick<Vehicle, 'slug' | 'is_seed' | 'source_url' | 'verified_at'>[]) {
    const verified = validDate(vehicle.verified_at);
    if (sourced(vehicle) && verified) entries.push({ url: `${origin}/gta-online/vehicles/${encodeURIComponent(vehicle.slug)}`, lastModified: verified });
  }
  for (const week of (weekResult.data ?? []) as unknown as SitemapWeek[]) {
    const start = validDate(week.event_start), end = validDate(week.event_end);
    if (sourced(week) && ['PUBLISHED', 'ARCHIVED'].includes(week.status ?? '') && week.verification_status === 'CONFIRMED' && start && end && start < end
      && week.article && isIndexableArticle(week.article)) {
      entries.push({ url: `${origin}/gta-online/weekly-update/${encodeURIComponent(week.slug)}`, lastModified: validDate(week.last_checked_at) });
    }
  }
  const articles = await sitemapArticles({ limit: 50_000 - entries.length });
  entries.push(...articles.map(article => {
    const updated = Date.parse(article.updated_at);
    const published = Date.parse(article.published_at!);
    return {
      url: articleUrl(article.slug),
      lastModified: new Date(Number.isFinite(updated) && updated >= published && updated <= Date.now() ? updated : published),
    };
  }));
  return [...new Map(entries.map(entry => [entry.url, entry])).values()];
}
