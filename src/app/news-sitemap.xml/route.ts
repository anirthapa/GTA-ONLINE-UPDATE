import { articleUrl, sitemapArticles } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function xml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET(): Promise<Response> {
  const articles = await sitemapArticles({ since: new Date(Date.now() - 48 * 60 * 60 * 1000), limit: 1000 });
  const entries = articles.map(article => `<url><loc>${xml(articleUrl(article.slug))}</loc><news:news><news:publication><news:name>${xml(SITE_NAME)}</news:name><news:language>en</news:language></news:publication><news:publication_date>${xml(new Date(article.published_at!).toISOString())}</news:publication_date><news:title>${xml(article.title)}</news:title></news:news></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${entries}\n</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
