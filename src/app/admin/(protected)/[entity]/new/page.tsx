import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { articleOptions, entityFrom, labels } from '../../../_lib/data';
import { RecordEditor } from '../../../_components/editor';

export default async function CreateRecord({ params }: { params: Promise<{ entity: string }> }) {
  await requireAdmin();
  const entity = entityFrom((await params).entity);
  const relatedArticles = entity === 'weekly' ? await articleOptions() : [];
  return <><header className="section-heading"><div><Link className="eyebrow" href={`/admin/${entity}`}>← {labels[entity]}</Link><h1>Create {entity === 'weekly' ? 'weekly update' : entity.slice(0, -1)}</h1><p className="muted">Start with accurate details and traceable evidence.</p></div></header>{(entity === 'guides' || entity === 'vehicles') && <p className="notice">Catalog entries become public when a verification date is set{entity === 'guides' ? ' and the guide is CONFIRMED or REPORTED' : ''}. Entries without verification remain hidden in production.</p>}<RecordEditor entity={entity} relatedArticles={relatedArticles} /></>;
}
