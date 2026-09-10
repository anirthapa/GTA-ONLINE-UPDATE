import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { tables } from '../../_lib/validation';
import { entityFrom, formatDate, labels, type AdminRow } from '../../_lib/data';
import { SourceOperation } from '../../_components/editor';
import { CacheNotice } from '../../_components/cache-notice';

export default async function RecordList({ params, searchParams }: { params: Promise<{ entity: string }>; searchParams: Promise<{ q?: string; status?: string; page?: string; deleted?: string; cache?: string }> }) {
  await requireAdmin();
  const entity = entityFrom((await params).entity);
  const query = await searchParams;
  const page = Math.min(10000, Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1));
  const titleColumn = entity === 'sources' || entity === 'vehicles' ? 'name' : entity === 'weekly' ? 'slug' : 'title';
  const orderColumn = entity === 'weekly' ? 'event_start' : entity === 'sources' || entity === 'articles' ? 'updated_at' : titleColumn;
  const columns: string = entity === 'articles' ? 'id,title,slug,status,verification_status,updated_at,is_seed' : entity === 'weekly' ? 'id,slug,status,verification_status,event_start,event_end,last_checked_at,is_seed' : entity === 'sources' ? 'id,name,url,trust_level,enabled,fetch_frequency,failure_count,last_checked_at,updated_at' : entity === 'vehicles' ? 'id,name,slug,vehicle_class,price,verified_at,is_seed' : 'id,title,slug,kind,verification_status,verified_at,is_seed';
  let request = getDb().from(tables[entity]).select(columns, { count: 'exact' }).order(orderColumn, { ascending: entity === 'vehicles' || entity === 'guides' }).range((page - 1) * 25, page * 25 - 1);
  const search = (query.q ?? '').trim().slice(0, 100).replaceAll('%', '\\%').replaceAll('_', '\\_');
  if (search) request = request.ilike(titleColumn, `%${search}%`);
  if ((entity === 'articles' || entity === 'weekly') && ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'].includes(query.status ?? '')) request = request.eq('status', query.status!);
  const { data, error, count } = await request;
  if (error) throw new Error('Could not load records.');
  const rows = (data ?? []) as unknown as AdminRow[];
  const pageLink = (target: number) => `/admin/${entity}?${new URLSearchParams({ q: query.q ?? '', status: query.status ?? '', page: String(target) })}`;
  return <>
    <header className="section-heading"><div><p className="eyebrow">Content workspace</p><h1>{labels[entity]}</h1><p className="muted">{count ?? 0} records · {entity === 'sources' ? 'Control the evidence entering your newsroom.' : 'Keep every entry accurate, attributed, and current.'}</p></div><Link href={`/admin/${entity}/new`} className="button">+ Create {entity === 'weekly' ? 'update' : entity.slice(0, -1)}</Link></header>
    {query.deleted === '1' && <p className="notice success" role="status">Record deleted.</p>}
    <CacheNotice state={query.cache} />
    <form method="get" className="panel" style={{ padding: 18, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end', marginBottom: 20 }}><label className="field" style={{ flex: '1 1 220px' }}>Search<input name="q" defaultValue={query.q ?? ''} placeholder={`Search ${labels[entity].toLowerCase()}…`} /></label>{(entity === 'articles' || entity === 'weekly') && <label className="field">Status<select name="status" defaultValue={query.status ?? ''}><option value="">All statuses</option>{['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'].map(status => <option key={status}>{status}</option>)}</select></label>}<button className="button secondary">Filter</button><Link href={`/admin/${entity}`} className="muted">Reset</Link></form>
    {entity === 'sources' && <SourceOperation id={null} operation="sync" />}
    <section className="panel">{rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>{entity === 'sources' ? 'Source' : 'Content'}</th><th>{entity === 'sources' ? 'Trust / state' : entity === 'vehicles' ? 'Class / price' : 'Status / verification'}</th><th>{entity === 'sources' ? 'Health' : 'Latest date'}</th><th><span className="muted">Manage</span></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><Link href={`/admin/${entity}/${row.id}`} style={{ fontWeight: 600 }}>{String(row[titleColumn])}</Link><small className="muted" style={{ display: 'block', marginTop: 5 }}>{String(row.slug ?? row.url ?? '')}</small>{Boolean(row.is_seed) && <span className="badge">Seed / sample</span>}</td><td>{entity === 'sources' ? <><span className="badge">{String(row.trust_level)}</span><p className="muted">{row.enabled ? 'Enabled' : 'Disabled'} · Every {String(row.fetch_frequency)}m</p></> : entity === 'vehicles' ? <>{String(row.vehicle_class)}<p className="muted">{row.price == null ? 'Price unknown' : `GTA$ ${Number(row.price).toLocaleString('en')}`}</p></> : <><span className="badge">{String(row.status ?? row.kind)}</span><p className="muted">{String(row.verification_status)}</p></>}</td><td>{entity === 'sources' && <p className={Number(row.failure_count) ? 'danger' : 'muted'}>{String(row.failure_count)} failures</p>}{formatDate(row.updated_at ?? row.last_checked_at ?? row.verified_at)}{entity === 'weekly' && <small className="muted" style={{ display: 'block' }}>Ends {formatDate(row.event_end)}</small>}</td><td><Link className="button secondary" href={`/admin/${entity}/${row.id}`}>Edit →</Link></td></tr>)}</tbody></table></div> : <div className="empty-state"><h2>{search || query.status ? 'No matching records' : `No ${labels[entity].toLowerCase()} yet`}</h2><p>{search || query.status ? 'Try another search or reset your filters.' : 'Create your first entry to get started.'}</p><Link className="button secondary" href={search || query.status ? `/admin/${entity}` : `/admin/${entity}/new`}>{search || query.status ? 'Clear filters' : 'Create first record'}</Link></div>}</section>
    <nav aria-label="Pagination" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>{page > 1 ? <Link className="button secondary" href={pageLink(page - 1)}>← Previous</Link> : <span />}<span className="muted">Page {page} of {Math.max(1, Math.ceil((count ?? 0) / 25))}</span>{page * 25 < (count ?? 0) ? <Link className="button secondary" href={pageLink(page + 1)}>Next →</Link> : <span />}</nav>
  </>;
}
