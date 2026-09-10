import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { formatDate, getRecord } from '../../../../_lib/data';
import { httpsUrl } from '../../../../_lib/validation';

export default async function Preview({ params, searchParams }: { params: Promise<{ entity: string; id: string }>; searchParams: Promise<{ revision?: string }> }) {
  await requireAdmin();
  const { entity, id } = await params;
  if (entity !== 'articles') notFound();
  let article: Record<string, unknown> = await getRecord('articles', id);
  const { revision } = await searchParams;
  if (revision) {
    if (!z.uuid().safeParse(revision).success) notFound();
    const { data, error } = await getDb().from('article_revisions').select('snapshot').eq('id', revision).eq('article_id', id).maybeSingle();
    if (error) throw new Error('Could not load revision.');
    if (!data) notFound();
    article = data.snapshot as Record<string, unknown>;
  }
  const imageUrl = httpsUrl.safeParse(article.featured_image);
  const sourceUrl = httpsUrl.safeParse(article.source_url);
  return <>
    <div className="notice"><strong>{revision ? 'Historical revision' : 'Private editorial preview'}</strong><p>This view is accessible only to administrators. Content is rendered as safe text; public typography may differ.</p><Link href={`/admin/articles/${id}`}>← Return to editor</Link></div>
    <article className="panel" style={{ padding: 'clamp(24px, 5vw, 56px)', marginTop: 24 }}>
      <p className="eyebrow">{String(article.game)} / {String(article.category)}</p>
      <h1 style={{ fontSize: 'clamp(30px, 4vw, 54px)', lineHeight: 1.08 }}>{String(article.title)}</h1>
      <p className="muted" style={{ fontSize: 20 }}>{String(article.excerpt)}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBlock: 24 }}><span className="badge">{String(article.status)}</span><span className="badge">{String(article.verification_status)}</span><span className="muted">{formatDate(article.published_at ?? article.updated_at)}</span></div>
      {imageUrl.success && <figure style={{ marginBlock: 28 }}><Image src={imageUrl.data} alt={String(article.image_alt ?? '')} width={1400} height={788} unoptimized referrerPolicy="no-referrer" style={{ width: '100%', height: 'auto', borderRadius: 10 }} /><figcaption className="muted" style={{ marginTop: 10 }}>{String(article.image_alt ?? '')}</figcaption></figure>}
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.85, overflowWrap: 'anywhere' }}>{String(article.content)}</div>
      <footer style={{ marginTop: 40, borderTop: '1px solid var(--line, #30343e)', paddingTop: 24 }}><span className="muted">Source: </span>{sourceUrl.success ? <a href={sourceUrl.data} target="_blank" rel="noopener noreferrer">{String(article.source_name)} ↗</a> : String(article.source_name)}<p className="muted">Confidence: {String(article.confidence_score)} / 100</p></footer>
    </article>
  </>;
}
