import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { SourceOperation } from '../_components/editor';
import { formatDate } from '../_lib/data';

export default async function Overview() {
  await requireAdmin();
  const db = getDb();
  const results = await Promise.all([
    db.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
    db.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'REVIEW'),
    db.from('sources').select('id', { count: 'exact', head: true }).eq('enabled', true),
    db.from('sources').select('id', { count: 'exact', head: true }).gt('failure_count', 0),
    db.from('articles').select('id,title,status,verification_status,updated_at').order('updated_at', { ascending: false }).limit(8),
    db.from('automation_logs').select('id,level,event,message,created_at').order('created_at', { ascending: false }).limit(5),
  ]);
  if (results.some(result => result.error)) throw new Error('Admin overview query failed.');
  const stats = [['Published stories', results[0].count, '/admin/articles?status=PUBLISHED'], ['Awaiting review', results[1].count, '/admin/articles?status=REVIEW'], ['Active sources', results[2].count, '/admin/sources'], ['Sources with failures', results[3].count, '/admin/sources']];
  return <>
    <header className="section-heading"><div><p className="eyebrow">Editorial command center</p><h1>Newsroom overview</h1><p className="muted">Your publishing queue, source health, and latest activity.</p></div><Link href="/admin/articles/new" className="button">+ New story</Link></header>
    <div className="stat-grid">{stats.map(([label, count, href]) => <Link className="stat panel" key={String(label)} href={String(href)}><span className="muted">{label}</span><strong style={{ display: 'block', fontSize: 36, marginTop: 8 }}>{count ?? 0}</strong></Link>)}</div>
    <section className="panel" style={{ padding: 24, marginBlock: 24 }}><div className="section-heading"><div><p className="eyebrow">On the desk</p><h2>Recent stories</h2></div><Link href="/admin/articles">All stories →</Link></div>{results[4].data?.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Story</th><th>Status</th><th>Verification</th><th>Updated</th></tr></thead><tbody>{results[4].data.map(article => <tr key={article.id}><td><Link href={`/admin/articles/${article.id}`}>{article.title}</Link></td><td><span className="badge">{article.status}</span></td><td>{article.verification_status}</td><td>{formatDate(article.updated_at)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>Your first story starts here.</h3><p>Create an article or configure sources to build your review queue.</p><Link className="button secondary" href="/admin/sources/new">Add a source</Link></div>}</section>
    <section className="panel" style={{ padding: 24 }}><div className="section-heading"><div><p className="eyebrow">Pipeline health</p><h2>Latest activity</h2></div><Link href="/admin/logs">Open logs →</Link></div><SourceOperation id={null} operation="sync" /><p className="muted">Runs enabled sources through fetching, extraction, deduplication, and publication policy. Each source reports its own result.</p>{results[5].data?.length ? <ul style={{ paddingLeft: 20 }}>{results[5].data.map(log => <li key={log.id} style={{ marginBlock: 16 }}><span className="badge">{log.level}</span> {log.message}<small className="muted" style={{ display: 'block', marginTop: 4 }}>{formatDate(log.created_at)}</small></li>)}</ul> : <p className="empty-state">No automation activity yet. Configure a source and run your first sync.</p>}</section>
  </>;
}
