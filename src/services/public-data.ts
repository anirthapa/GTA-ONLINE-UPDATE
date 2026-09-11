import 'server-only';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import type { Article, Guide, Settings, Vehicle, WeeklyUpdate } from './types';
import { DEFAULT_SETTINGS } from './defaults';
import { DEMO_ARTICLES, DEMO_GUIDES, DEMO_VEHICLES, DEMO_WEEKLY, demoAllowed } from './demo';
import { cached } from './cache';
import { isOfficialUrl } from './trust';

export interface ArticleQuery { game?: string; category?: string; query?: string; page?: number; limit?: number; verification?: string }
function check(error: { message: string } | null) { if (error) throw new Error(`Database read failed: ${error.message}`); }
function publicArticle(article: Article): Article {
  return { ...article, breaking: article.breaking && !!article.breaking_expires_at && Date.parse(article.breaking_expires_at) > Date.now() };
}
export async function getArticles(options: ArticleQuery = {}): Promise<Article[]> {
  const limit = Math.max(1, Math.min(50, Math.floor(options.limit || 12)));
  const page = Math.max(1, Math.min(1000, Math.floor(options.page || 1)));
  const query = options.query?.trim().slice(0, 120);
  if (!isDatabaseConfigured()) {
    if (!demoAllowed()) return [];
    return DEMO_ARTICLES.filter(row => (!options.game || row.game === options.game) && (!options.category || row.category === options.category) &&
      (!options.verification || row.verification_status === options.verification) && (!query || `${row.title} ${row.content}`.toLowerCase().includes(query.toLowerCase())))
      .slice((page - 1) * limit, page * limit).map(publicArticle);
  }
  const rows = await cached<Article[]>(`articles:${JSON.stringify({ ...options, query, page, limit, demo: demoAllowed() })}`, async () => {
    let request = getDb().from('articles').select('*').eq('status', 'PUBLISHED').lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    if (!demoAllowed()) request = request.eq('is_seed', false);
    if (options.game) request = request.eq('game', options.game);
    if (options.category) request = request.eq('category', options.category);
    if (options.verification) request = request.eq('verification_status', options.verification);
    // websearch text search uses bound PostgREST parameters, never raw OR syntax.
    if (query) request = request.textSearch('search_document', query, { type: 'websearch', config: 'english' });
    const { data, error } = await request; check(error); return (data || []) as Article[];
  });
  return rows.map(publicArticle);
}
export async function getArticle(slug: string): Promise<Article | null> {
  if (!isDatabaseConfigured()) return demoAllowed() ? DEMO_ARTICLES.find(row => row.slug === slug) || null : null;
  // Detail reads do not cache unpublished status or schedule changes.
  let request = getDb().from('articles').select('*').eq('slug', slug).eq('status', 'PUBLISHED').lte('published_at', new Date().toISOString());
  if (!demoAllowed()) request = request.eq('is_seed', false);
  const { data, error } = await request.maybeSingle(); check(error); return data ? publicArticle(data as Article) : null;
}
export async function getWeeklyUpdate(slug?: string): Promise<WeeklyUpdate | null> {
  if (!isDatabaseConfigured()) return slug && demoAllowed() ? DEMO_WEEKLY.find(row => row.slug === slug) || null : null;
  // Current trusted-media updates are useful to readers immediately, but the
  // page must retain their REPORTED/REVIEW state instead of presenting them as
  // official confirmation.
  let request = getDb().from('weekly_updates').select('*').in('verification_status', ['CONFIRMED', 'REPORTED']);
  if (!demoAllowed()) request = request.eq('is_seed', false);
  if (slug) request = request.eq('slug', slug).in('status', ['PUBLISHED', 'ARCHIVED']);
  else {
    const now = new Date().toISOString();
    request = request.in('status', ['PUBLISHED', 'REVIEW']).lte('event_start', now).gt('event_end', now);
  }
  const { data, error } = await request.order('event_start', { ascending: false }).limit(1).maybeSingle(); check(error);
  if (!data) return null;
  // Keep the parent-story publication check explicit. Embedded relation filters
  // are less portable across PostgREST versions and previously hid this row.
  const parent = await getDb().from('articles').select('status,published_at').eq('id', data.article_id).maybeSingle();
  check(parent.error);
  if (!parent.data || !['PUBLISHED', 'REVIEW'].includes(parent.data.status) || !parent.data.published_at || Date.parse(parent.data.published_at) > Date.now()) return null;
  return data as WeeklyUpdate;
}
export async function getWeeklyArchive(): Promise<WeeklyUpdate[]> {
  if (!isDatabaseConfigured()) return demoAllowed() ? DEMO_WEEKLY : [];
  let request = getDb().from('weekly_updates').select('*, articles!inner(status,published_at)').eq('verification_status', 'CONFIRMED')
    .eq('articles.status', 'PUBLISHED').lte('articles.published_at', new Date().toISOString()).in('status', ['PUBLISHED', 'ARCHIVED'])
    .lte('event_end', new Date().toISOString()).order('event_start', { ascending: false }).limit(104);
  if (!demoAllowed()) request = request.eq('is_seed', false);
  const { data, error } = await request; check(error); return (data || []) as WeeklyUpdate[];
}
export async function getVehicles(): Promise<Vehicle[]> {
  if (!isDatabaseConfigured()) return demoAllowed() ? DEMO_VEHICLES : [];
  let request = getDb().from('vehicles').select('*').order('name').limit(500);
  if (!demoAllowed()) request = request.eq('is_seed', false).not('verified_at', 'is', null);
  const { data, error } = await request; check(error); return (data || []) as Vehicle[];
}
export async function getVehicle(slug: string): Promise<Vehicle | null> {
  if (!isDatabaseConfigured()) return demoAllowed() ? DEMO_VEHICLES.find(row => row.slug === slug) || null : null;
  let request = getDb().from('vehicles').select('*').eq('slug', slug);
  if (!demoAllowed()) request = request.eq('is_seed', false).not('verified_at', 'is', null);
  const { data, error } = await request.maybeSingle(); check(error); return data as Vehicle | null;
}
export async function getGuides(kind?: string): Promise<Guide[]> {
  if (!isDatabaseConfigured()) return demoAllowed() ? DEMO_GUIDES.filter(row => !kind || row.kind === kind) : [];
  let request = getDb().from('guides').select('*').order('updated_at', { ascending: false }).limit(300);
  if (kind) request = request.eq('kind', kind);
  if (!demoAllowed()) request = request.eq('is_seed', false).in('verification_status', ['CONFIRMED', 'REPORTED']).not('verified_at', 'is', null);
  const { data, error } = await request; check(error); return (data || []) as Guide[];
}
export async function getGuide(slug: string): Promise<Guide | null> {
  if (!isDatabaseConfigured()) return demoAllowed() ? DEMO_GUIDES.find(row => row.slug === slug) || null : null;
  let request = getDb().from('guides').select('*').eq('slug', slug);
  if (!demoAllowed()) request = request.eq('is_seed', false).in('verification_status', ['CONFIRMED', 'REPORTED']).not('verified_at', 'is', null);
  const { data, error } = await request.maybeSingle(); check(error); return data as Guide | null;
}
export async function getSettings(): Promise<Settings> {
  if (!isDatabaseConfigured()) return { ...DEFAULT_SETTINGS };
  const { data, error } = await getDb().from('site_settings').select('*').eq('id', 'default').maybeSingle(); check(error);
  const settings = { ...DEFAULT_SETTINGS, ...data } as Settings;
  if (settings.release_date && (!settings.release_source_url || !isOfficialUrl(settings.release_source_url) ||
      !settings.release_verified_at || Date.parse(settings.release_verified_at) > Date.now())) {
    settings.release_date = null; settings.release_source_url = null; settings.release_verified_at = null;
  }
  return settings;
}
