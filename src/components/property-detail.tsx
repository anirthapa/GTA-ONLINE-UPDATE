import Link from 'next/link';
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, Coins, ExternalLink, Map, ShieldCheck, Users } from 'lucide-react';
import { Breadcrumbs } from '@/components/editorial';
import { MediaImage } from '@/components/media-image';
import type { PropertyEntry } from '@/lib/properties';

function PropertyDetailStat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return <div className="property-detail-stat"><Icon size={17} aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>;
}

export function PropertyDetailPage({ property }: { property: PropertyEntry }) {
  return (
    <div className="container page-content property-detail-page">
      <Breadcrumbs items={[{ name: 'GTA Online', href: '/gta-online' }, { name: 'Properties', href: '/gta-online/properties' }, { name: property.title, href: `/gta-online/properties/${property.slug}` }]} />
      <article>
        <header className="property-detail-hero">
          <div className="property-detail-hero-media"><MediaImage src={property.image} alt={property.imageAlt} priority sizes="(max-width: 900px) 100vw, 54vw" /><div className="property-image-overlay"><span>{property.groupLabel}</span><span>{property.update}</span></div></div>
          <div className="property-detail-hero-copy"><p className="eyebrow">{property.released} · {property.availableFrom}</p><h1>{property.title}</h1><p>{property.summary}</p><div className="property-detail-links"><a href={property.mediaSource} target="_blank" rel="noopener noreferrer" className="text-link">{property.sourceLabel} <ExternalLink size={15} /></a></div></div>
        </header>

        <div className="property-detail-stat-grid" aria-label={`${property.title} quick facts`}>
          <PropertyDetailStat icon={Coins} label="Entry price" value={property.basePrice} />
          <PropertyDetailStat icon={Building2} label="Buy from" value={property.availableFrom} />
          <PropertyDetailStat icon={Users} label="Capacity" value={property.capacity} />
          <PropertyDetailStat icon={CalendarDays} label="Added" value={property.released} />
        </div>

        <div className="property-detail-layout">
          <main>
            <section className="property-detail-section" id="why-buy">
              <div className="section-kicker"><Building2 size={17} /> WHY BUY THIS PROPERTY</div>
              <h2>What it unlocks</h2>
              <ul className="property-benefits-list">{property.benefits.map((benefit) => <li key={benefit}><CheckCircle2 size={16} /> {benefit}</li>)}</ul>
              <div className="property-best-for"><strong>Best for:</strong> {property.bestFor}</div>
            </section>
            <section className="property-detail-section" id="buying-guide">
              <div className="section-kicker"><ShieldCheck size={17} /> BUYING GUIDE</div>
              <h2>Buy it in the right order</h2>
              <ol className="property-buy-steps">{property.buyGuide.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol>
            </section>
          </main>
          <aside className="property-detail-aside">
            <section className="property-map-card" id="map"><div className="section-kicker"><Map size={17} /> MAP & LOCATION</div><h2>See where it fits</h2><div className="property-map-media"><MediaImage src="/images/heists/real/los-santos-atlas.jpg" alt="Real GTA 5 atlas map showing Los Santos and Blaine County" sizes="(max-width: 900px) 100vw, 42vw" /></div><p>{property.mapNote}</p><a href="https://www.gtabase.com/grand-theft-auto-v/map-locations/" target="_blank" rel="noopener noreferrer" className="muted-link">Real Los Santos map via GTA Base <ExternalLink size={14} /></a></section>
            <section className="property-source-card"><p className="eyebrow">EDITORIAL NOTE</p><p>This page uses real GTA Online media and a real map reference for orientation. Prices and features may change with updates; always check the in-game purchase screen.</p><Link href="/gta-online/properties" className="text-link"><ArrowLeft size={15} /> Back to all properties</Link></section>
          </aside>
        </div>
      </article>
    </div>
  );
}
