'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { deleteRecord, saveRecord, sourceOperation } from '../actions';
import { fields } from '../_lib/fields';
import type { ActionState, Entity } from '../_lib/validation';

function Submit({ children, secondary = false }: { children: React.ReactNode; secondary?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={`button${secondary ? ' secondary' : ''}`} disabled={pending}>{pending ? 'Working…' : children}</button>;
}

export function RecordEditor({ entity, record = {}, relatedArticles = [] }: { entity: Entity; record?: Record<string, unknown>; relatedArticles?: Array<{ id: string; title: string; status: string }> }) {
  const id = typeof record.id === 'string' ? record.id : null;
  const [state, action, pending] = useActionState<ActionState, FormData>(saveRecord.bind(null, entity, id), {});
  return <form action={action} className="panel" style={{ padding: 'clamp(18px, 3vw, 32px)' }}>
    <input type="hidden" name="expected_updated_at" value={String(record.updated_at ?? '')} />
    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
      {fields[entity].map(field => {
        const raw = record[field.name] ?? field.default ?? '';
        const value = field.type === 'json' && typeof raw !== 'string' ? JSON.stringify(raw, null, 2) : field.type === 'datetime-local' && raw ? new Date(String(raw)).toISOString().slice(0, 19) : String(raw);
        const helpId = `help-${field.name}`;
        const error = state.fields?.[field.name];
        const shared = { id: field.name, name: field.name, required: field.required, min: field.min, max: field.max, 'aria-invalid': Boolean(error), 'aria-describedby': helpId, disabled: pending };
        return <div className="field" key={field.name} style={field.wide ? { gridColumn: '1 / -1' } : undefined}>
          {field.type === 'checkbox' ? <label htmlFor={field.name} style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input {...shared} type="checkbox" defaultChecked={Boolean(raw)} style={{ width: 'auto' }} />{field.label}</label> : <><label htmlFor={field.name}>{field.label}{field.required ? ' *' : ''}</label>{field.name === 'article_id' ? <><input {...shared} defaultValue={value} list="related-article-options" placeholder="Select or paste an article UUID" /><datalist id="related-article-options">{relatedArticles.map(article => <option key={article.id} value={article.id}>{article.title} · {article.status}</option>)}</datalist></> : field.options ? <select {...shared} defaultValue={value || field.options[0]}>{field.options.map(option => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select> : field.type === 'textarea' || field.type === 'json' ? <textarea {...shared} defaultValue={value} rows={field.name === 'content' || field.name === 'data' ? 16 : field.type === 'json' ? 6 : 4} spellCheck={field.type !== 'json'} style={field.type === 'json' ? { fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 } : undefined} /> : <input {...shared} type={field.type ?? 'text'} defaultValue={value} step={field.type === 'datetime-local' ? '1' : field.type === 'number' ? 'any' : undefined} />}</>}
          <div id={helpId}>{field.hint && <small className="muted">{field.hint}</small>}{error && <p className="danger" role="alert">{error}</p>}</div>
        </div>;
      })}
    </div>
    {['articles', 'vehicles', 'guides'].includes(entity) && <label className="field" style={{ marginTop: 24 }}><span><input type="checkbox" name="image_rights_confirmed" disabled={pending} aria-describedby="image-rights-help" style={{ width: 'auto', marginRight: 10 }} />I own this image or have permission to publish it.</span><small id="image-rights-help" className="muted">Required when adding or changing an image URL. A public URL alone does not grant usage rights.</small>{state.fields?.image_rights_confirmed && <span className="danger" role="alert">{state.fields.image_rights_confirmed}</span>}</label>}
    {state.error && <p className="notice danger" role="alert">{state.error}</p>}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 28 }}><Submit>{entity === 'settings' ? 'Save settings' : id ? 'Save changes' : 'Create record'}</Submit><Link href={entity === 'settings' ? '/admin' : `/admin/${entity}`} className="muted">Cancel</Link></div>
    {entity === 'articles' && <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>Every saved edit creates a revision. Publishing validates source trust and the configured confidence threshold.</p>}
  </form>;
}

export function DeleteRecord({ entity, id }: { entity: Entity; id: string }) {
  const [state, action] = useActionState<ActionState, FormData>(deleteRecord.bind(null, entity, id), {});
  return <details className="panel" style={{ padding: 24, marginTop: 28 }}><summary className="danger" style={{ cursor: 'pointer' }}>Permanently delete this record</summary><form action={action} style={{ marginTop: 20 }}><p>Deletion cannot be undone.{entity === 'articles' ? ' Linked weekly updates, evidence links, and article revisions are also permanently removed.' : entity === 'sources' ? ' Related source-item history is also removed.' : ''} Consider archiving articles or disabling sources to retain history.</p><label className="field">Type DELETE<input name="confirmation" autoComplete="off" required pattern="DELETE" /></label>{state.error && <p className="notice danger" role="alert">{state.error}</p>}<Submit secondary>Delete permanently</Submit></form></details>;
}

export function SourceOperation({ id, operation }: { id: string | null; operation: 'test' | 'sync' }) {
  const [state, action] = useActionState<ActionState, FormData>(sourceOperation.bind(null, id, operation), {});
  return <form action={action} style={{ marginBlock: 12 }}><input type="hidden" name="operation" value={operation} /><Submit secondary>{operation === 'test' ? 'Test source' : id ? 'Sync this source' : 'Run news sync'}</Submit>{state.error && <p role="alert" className="notice danger">{state.error}</p>}{state.success && <p role="status" className="notice success">{state.success}</p>}{state.result && <details><summary>Service result</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 360, overflow: 'auto', fontSize: 12 }}>{state.result}</pre></details>}</form>;
}
