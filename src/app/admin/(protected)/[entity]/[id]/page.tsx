import Link from 'next/link';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { articleOptions, entityFrom, formatDate, getRecord, labels } from '../../../_lib/data';
import { DeleteRecord, RecordEditor, SourceOperation } from '../../../_components/editor';
import { CacheNotice } from '../../../_components/cache-notice';

export default async function EditRecord({ params, searchParams }: { params: Promise<{ entity: string; id: string }>; searchParams: Promise<{ saved?: string; cache?: string }> }) {
  await requireAdmin();
  const route = await params;
  const entity = entityFrom(route.entity);
  const record = await getRecord(entity, route.id);
  const relatedArticles = entity === 'weekly' ? await articleOptions() : [];
  const { saved, cache } = await searchParams;
  const revisions = entity === 'articles' ? await getDb().from('article_revisions').select('id,reason,actor,created_at').eq('article_id', route.id).order('created_at', { ascending: false }).limit(30) : null;
  if (revisions?.error) throw new Error('Could not load article revisions.');
  return <>
    <header className="section-heading"><div><Link className="eyebrow" href={`/admin/${entity}`}>← {labels[entity]}</Link><h1>{String(record.title ?? record.name ?? record.slug)}</h1><p className="muted">{entity === 'articles' ? `Last updated ${formatDate(record.updated_at)}` : 'Edit details and keep your evidence current.'}</p></div>{entity === 'articles' && <Link className="button secondary" href={`/admin/articles/${record.id}/preview`}>Private preview ↗</Link>}</header>
    {saved === '1' && <p className="notice success" role="status">Changes saved.</p>}
    <CacheNotice state={cache} />
    {entity === 'articles' && Boolean(record.review_reason) && <p className="notice"><strong>Review note: </strong>{String(record.review_reason)}</p>}
    {Boolean(record.is_seed) && <p className="notice">This is a labelled seed / sample record. It retains that label when edited. Create a new record for independently verified reporting.</p>}
    {entity === 'sources' && <section className="panel" style={{ padding: 24, marginBottom: 24 }}><h2>Source health</h2><p className="muted">Last checked: {formatDate(record.last_checked_at)} · Last successful fetch: {formatDate(record.last_successful_fetch_at)} · Failures: {String(record.failure_count ?? 0)}</p><p>Tests fetch and validate without AI or publication. Sync uses the saved configuration and the publication policy.</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}><SourceOperation id={record.id} operation="test" /><SourceOperation id={record.id} operation="sync" /></div></section>}
    {(entity === 'guides' || entity === 'vehicles') && <p className="notice">Catalog changes appear publicly once a source verification date is set{entity === 'guides' ? ' and the guide is CONFIRMED or REPORTED' : ''}. Entries without verification remain hidden in production.</p>}
    <RecordEditor entity={entity} record={record} relatedArticles={relatedArticles} key={`${record.id}-${String(record.updated_at ?? saved ?? '')}`} />
    {entity === 'articles' && <section className="panel" style={{ padding: 24, marginTop: 28 }}><p className="eyebrow">Editorial history</p><h2>Revisions</h2><p className="muted">Previous versions are captured atomically when you save. Showing the 30 most recent revisions.</p>{revisions?.data?.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Saved</th><th>Editor</th><th>Reason</th><th>Version</th></tr></thead><tbody>{revisions.data.map(revision => <tr key={revision.id}><td>{formatDate(revision.created_at)}</td><td>{revision.actor}</td><td>{revision.reason}</td><td><Link href={`/admin/articles/${record.id}/preview?revision=${revision.id}`}>View revision →</Link></td></tr>)}</tbody></table></div> : <p className="empty-state">No previous versions yet. Your next saved edit will create the first revision.</p>}</section>}
    <DeleteRecord entity={entity} id={record.id} />
  </>;
}
