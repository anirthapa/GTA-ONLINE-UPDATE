import type { Metadata } from 'next';
import { SITE_NAME, siteUrl } from '@/lib/site';

/** Require an explicit production origin; never submit localhost or preview URLs. */
export function canonicalOrigin(): string | null {
  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) return null;
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    if (url.hostname === 'localhost' || /\.(localhost|test|invalid|example|local)$/.test(url.hostname)
      || /^[\d.]+$/.test(url.hostname) || url.hostname.startsWith('[')) return null;
    return url.origin;
  } catch { return null; }
}

export function indexingAllowed(): boolean {
  return process.env.NODE_ENV === 'production'
    && process.env.DEMO_MODE !== 'true'
    && (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production')
    && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
    && canonicalOrigin() !== null;
}

function localPath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path)) throw new Error('SEO paths must be site-relative paths.');
  return path.split(/[?#]/, 1)[0];
}

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const pathname = localPath(path);
  const origin = canonicalOrigin();
  const canonical = origin ? `${origin}${pathname}` : undefined;
  const index = indexingAllowed() && !/^\/(admin|auth|api|search)(\/|$)/.test(pathname);
  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: { type: 'website', siteName: SITE_NAME, title, description, url: canonical, locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description },
    robots: index ? { index: true, follow: true, 'max-image-preview': 'large' } : { index: false, follow: false },
  };
}

/** Safe for a script element's innerHTML. Circular/non-JSON data still throws. */
export function jsonLd(data: unknown): string {
  const serialized = JSON.stringify(data);
  if (serialized === undefined) throw new TypeError('JSON-LD must be JSON-serializable.');
  return serialized.replace(/</g, '\\u003c');
}

export type SitemapArticle = {
  id: string; slug: string; title: string; status: string; verification_status: string;
  is_seed: boolean; source_url: string; published_at: string | null; updated_at: string;
};

export function isIndexableArticle(article: SitemapArticle, now = Date.now()): boolean {
  const published = article.published_at ? Date.parse(article.published_at) : NaN;
  if (article.status !== 'PUBLISHED' || article.is_seed !== false
    || !['CONFIRMED', 'REPORTED', 'RUMOR'].includes(article.verification_status)
    || !Number.isFinite(published) || published > now
    || !article.slug || article.slug === '.' || article.slug === '..' || !article.title.trim()) return false;
  try { return new URL(article.source_url).protocol === 'https:'; } catch { return false; }
}

/** Read persisted rows directly, avoiding all development/demo getter fallbacks. */
export async function sitemapArticles(options: { since?: Date; limit?: number } = {}): Promise<SitemapArticle[]> {
  if (!indexingAllowed()) return [];
  const { getDb } = await import('@/lib/db');
  const db = getDb();
  const now = Date.now();
  const limit = Math.min(50_000, Math.max(1, options.limit ?? 50_000));
  const rows: SitemapArticle[] = [];
  for (let offset = 0; offset < limit; offset += 1000) {
    const size = Math.min(1000, limit - offset);
    let query = db.from('articles')
      .select('id,slug,title,status,verification_status,is_seed,source_url,published_at,updated_at')
      .eq('status', 'PUBLISHED').eq('is_seed', false)
      .in('verification_status', ['CONFIRMED', 'REPORTED', 'RUMOR'])
      .lte('published_at', new Date(now).toISOString())
      .order('published_at', { ascending: false }).order('id', { ascending: true })
      .range(offset, offset + size - 1);
    if (options.since) query = query.gte('published_at', options.since.toISOString());
    const { data, error } = await query;
    if (error) throw new Error('Unable to read published articles for sitemap.');
    const page = (data ?? []) as SitemapArticle[];
    rows.push(...page.filter(article => isIndexableArticle(article, now)));
    if (page.length < size) break;
  }
  return rows;
}

export function articleUrl(slug: string): string {
  const origin = canonicalOrigin();
  if (!origin) throw new Error('A valid production NEXT_PUBLIC_SITE_URL is required.');
  return `${origin}/news/${encodeURIComponent(slug)}`;
}
