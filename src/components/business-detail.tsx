import Link from 'next/link';
import { ArrowLeft, Banknote, Building2, CheckCircle2, ExternalLink, Map, ShieldCheck, Users } from 'lucide-react';
import { Breadcrumbs } from '@/components/editorial';
import { MediaImage } from '@/components/media-image';
import type { BusinessEntry } from '@/lib/businesses';

function BusinessDetailStat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return <div className="business-detail-stat"><Icon size={17} aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>;
}

export function BusinessDetailPage({ business }: { business: BusinessEntry }) {
  return <div className="container page-content business-detail-page">
    <Breadcrumbs items={[{ name: 'GTA Online', href: '/gta-online' }, { name: 'Businesses', href: '/gta-online/businesses' }, { name: business.title, href: `/gta-online/businesses/${business.slug}` }]} />
    <article>
      <header className="business-detail-hero"><div className="business-detail-hero-media"><MediaImage src={business.image} alt={business.imageAlt} priority sizes="(max-width: 900px) 100vw, 54vw" /><div className="business-image-overlay"><span>{business.groupLabel}</span><span>{business.update}</span></div></div><div className="business-detail-hero-copy"><p className="eyebrow">{business.released} · {business.availableFrom}</p><h1>{business.title}</h1><p>{business.summary}</p><div className="business-detail-links"><a href={business.source} target="_blank" rel="noopener noreferrer" className="text-link">{business.sourceLabel} <ExternalLink size={15} /></a><a href={business.mediaSource} target="_blank" rel="noopener noreferrer" className="muted-link">Real media guide <ExternalLink size={14} /></a></div></div></header>
      <div className="business-detail-stat-grid" aria-label={`${business.title} quick facts`}><BusinessDetailStat icon={Banknote} label="Entry price" value={business.basePrice} /><BusinessDetailStat icon={Building2} label="Available from" value={business.availableFrom} /><BusinessDetailStat icon={Users} label="Solo support" value={business.solo} /><BusinessDetailStat icon={ShieldCheck} label="Income cycle" value={business.cycle} /></div>
      <div className="business-income-panel panel"><div><p className="eyebrow">HOW THE MONEY WORKS</p><h2>{business.incomeNote}</h2><p className="muted">Weekly bonuses, upgrades and sale conditions can change the final result.</p></div><div className="business-income-label"><Banknote size={20} /><strong>{business.groupLabel}</strong><span>{business.cycle}</span></div></div>
      <div className="business-detail-layout"><main>
        <section className="business-detail-section" id="benefits"><div className="section-kicker"><Building2 size={17} /> WHAT IT UNLOCKS</div><h2>Why this business matters</h2><ul className="business-benefits-list">{business.benefits.map((benefit) => <li key={benefit}><CheckCircle2 size={16} /> {benefit}</li>)}</ul><div className="business-best-for"><strong>Best for:</strong> {business.bestFor}</div></section>
        <section className="business-detail-section" id="how-to-run"><div className="section-kicker"><Banknote size={17} /> OPERATING PLAYBOOK</div><h2>How to run it</h2><ol className="business-steps">{business.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol></section>
      </main><aside className="business-detail-aside"><section className="business-map-card" id="map"><div className="section-kicker"><Map size={17} /> MAP & LOCATION</div><h2>Plan the route</h2><div className="business-map-media"><MediaImage src="/images/heists/real/los-santos-atlas.jpg" alt="Real GTA 5 atlas map showing Los Santos and Blaine County" sizes="(max-width: 900px) 100vw, 42vw" /></div><p>{business.mapNote}</p><a href="https://www.gtabase.com/grand-theft-auto-v/map-locations/" target="_blank" rel="noopener noreferrer" className="muted-link">Real Los Santos map via GTA Base <ExternalLink size={14} /></a></section><section className="business-source-card"><p className="eyebrow">EDITORIAL NOTE</p><p>This guide uses real GTA Online media and a real map reference. Costs and reward values are planning references; the current in-game screen is the final check.</p><Link href="/gta-online/businesses" className="text-link"><ArrowLeft size={15} /> Back to all businesses</Link></section></aside></div>
    </article>
  </div>;
}
