import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const { page: requested } = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(requested ?? '1', 10) || 1));
  const { data, error, count } = await getDb().from('articles').select('id,title,slug,excerpt,seo_title,seo_description,featured_image,image_alt,status', { count: 'exact' }).order('updated_at', { ascending: false }).range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error('Could not load SEO records.');
  return <><header className="section-heading"><div><p className="eyebrow">Discoverability</p><h1>Search appearance</h1><p className="muted">Review page titles, descriptions, and image accessibility. Edit a story to update its SEO fields.</p></div></header><section className="panel" style={{ padding: 24 }}>{data?.length ? data.map(article => {
    const title = article.seo_title || article.title;
    const description = article.seo_description || article.excerpt;
    const issues = [title.length > 70 && 'Title exceeds 70 characters', description.length > 180 && 'Description exceeds 180 characters', article.featured_image && !article.image_alt && 'Image description missing', !article.seo_description && 'Using excerpt fallback'].filter(Boolean);
    return <article key={article.id} style={{ paddingBlock: 24, borderBottom: '1px solid var(--border, #30343e)' }}><div className="section-heading"><span className="badge">{article.status}</span><Link href={`/admin/articles/${article.id}#seo_title`}>Edit SEO →</Link></div><p className="muted" style={{ fontSize: 12 }}>/news/{article.slug}</p><h2 style={{ fontSize: 22, marginBlock: 6 }}>{title}</h2><p className="muted">{description}</p><small className="muted">Title {title.length}/70 · Description {description.length}/180</small>{issues.length ? <p className="notice">{issues.join(' · ')}</p> : <p className="success">Title, description, and image checks passed.</p>}</article>;
  }) : <div className="empty-state"><h2>No stories to audit yet.</h2><Link href="/admin/articles/new">Create an article →</Link></div>}</section><nav aria-label="SEO pagination" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>{page > 1 ? <Link href={`/admin/seo?page=${page - 1}`}>← Previous</Link> : <span />}<span className="muted">Page {page}</span>{page * 25 < (count ?? 0) ? <Link href={`/admin/seo?page=${page + 1}`}>Next →</Link> : <span />}</nav></>;
}
