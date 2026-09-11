'use client';

import Link from 'next/link';
import { Building2, CalendarDays, Coins, ExternalLink, Map, ShieldCheck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MediaImage } from '@/components/media-image';
import { PROPERTY_ENTRIES, PROPERTY_GROUPS, type PropertyGroup } from '@/lib/properties';

function PropertyStat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return <div className="property-stat"><Icon size={15} aria-hidden="true" /><div><span>{label}</span><strong>{value}</strong></div></div>;
}

export function PropertyDirectory() {
  const [activeGroup, setActiveGroup] = useState<'ALL' | PropertyGroup>('ALL');
  const entries = useMemo(() => activeGroup === 'ALL' ? PROPERTY_ENTRIES : PROPERTY_ENTRIES.filter((property) => property.group === activeGroup), [activeGroup]);

  return (
    <section className="property-directory" aria-label="GTA Online property directory">
      <div className="property-overview">
        <div>
          <p className="eyebrow">THE PORTFOLIO</p>
          <h2>24 property types. One buying plan.</h2>
          <p>Compare every major GTA Online property class by what it unlocks, how it makes money, where it fits on the map and what to buy next.</p>
        </div>
        <div className="property-overview-metrics">
          <div><strong>24</strong><span>property types covered</span></div>
          <div><strong>4</strong><span>portfolio roles</span></div>
          <div><strong>2013–26</strong><span>release window</span></div>
        </div>
      </div>

      <div className="property-note"><ShieldCheck size={18} aria-hidden="true" /><p><strong>Buy for the unlock first.</strong> A property is valuable because of the missions, production loop, storage or services it opens. Prices and bonuses can change, so use the linked source and in-game purchase screen as the final check.</p></div>

      <div className="property-filters" role="tablist" aria-label="Filter properties by role">
        {PROPERTY_GROUPS.map((group) => <button key={group.key} type="button" role="tab" aria-selected={activeGroup === group.key} className={activeGroup === group.key ? 'active' : ''} onClick={() => setActiveGroup(group.key)}>{group.label}</button>)}
      </div>

      <div className="property-list">
        {entries.map((property, index) => (
          <article className="property-entry" id={property.slug} key={property.slug}>
            <div className="property-entry-media">
              <Link href={`/gta-online/properties/${property.slug}`} className="property-media-link" aria-label={`Open detailed guide for ${property.title}`}>
                <MediaImage src={property.image} alt={property.imageAlt} priority={index === 0 && activeGroup === 'ALL'} sizes="(max-width: 800px) 100vw, 38vw" />
              </Link>
              <div className="property-image-overlay"><span>{property.groupLabel}</span><span>{property.update}</span></div>
            </div>
            <div className="property-entry-body">
              <div className="property-entry-heading"><div><p className="eyebrow">{property.released}</p><h3><Link href={`/gta-online/properties/${property.slug}`}>{property.title}</Link></h3></div><a href={property.mediaSource} target="_blank" rel="noopener noreferrer" className="property-source" aria-label={`Open source for ${property.title}`}><ExternalLink size={16} /> Source</a></div>
              <p className="property-summary">{property.summary}</p>
              <div className="property-stats">
                <PropertyStat icon={Coins} label="Entry price" value={property.basePrice} />
                <PropertyStat icon={Building2} label="Available from" value={property.availableFrom} />
                <PropertyStat icon={Users} label="Capacity" value={property.capacity} />
                <PropertyStat icon={CalendarDays} label="Added" value={property.released} />
              </div>
              <div className="property-benefit"><span className="eyebrow">WHY IT MATTERS</span><strong>{property.bestFor}</strong></div>
              <div className="property-entry-actions"><Link className="property-full-guide" href={`/gta-online/properties/${property.slug}`}>Open full guide with map <Map size={15} /></Link><a href={property.mediaSource} target="_blank" rel="noopener noreferrer" className="muted-link">Real media source <ExternalLink size={14} /></a></div>
            </div>
          </article>
        ))}
      </div>

      <div className="property-advice"><div><p className="eyebrow">BUYING ORDER</p><h3>A strong portfolio grows in layers.</h3><p>Start with a safehouse and one reliable active income loop. Add feeder businesses, then specialize in heists, vehicles or passive production once the basics are paid for.</p></div><Link href="/gta-online/properties/mansions" className="text-link">See the endgame benchmark <ExternalLink size={15} /></Link></div>
    </section>
  );
}
