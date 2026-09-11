'use client';

import Link from 'next/link';
import { Banknote, Building2, ExternalLink, Map, ShieldCheck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MediaImage } from '@/components/media-image';
import { BUSINESS_ENTRIES, BUSINESS_GROUPS, type BusinessGroup } from '@/lib/businesses';

function BusinessStat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return <div className="business-stat"><Icon size={15} aria-hidden="true" /><div><span>{label}</span><strong>{value}</strong></div></div>;
}

export function BusinessDirectory() {
  const [activeGroup, setActiveGroup] = useState<'ALL' | BusinessGroup>('ALL');
  const entries = useMemo(() => activeGroup === 'ALL' ? BUSINESS_ENTRIES : BUSINESS_ENTRIES.filter((business) => business.group === activeGroup), [activeGroup]);

  return (
    <section className="business-directory" aria-label="GTA Online business directory">
      <div className="business-overview">
        <div><p className="eyebrow">THE MONEY ENGINE</p><h2>13 business loops. Build the right stack.</h2><p>Compare every major GTA Online income operation by start cost, solo viability, production cycle, location and what it unlocks for the rest of your portfolio.</p></div>
        <div className="business-overview-metrics"><div><strong>13</strong><span>business operations</span></div><div><strong>3</strong><span>ways to earn</span></div><div><strong>2016–26</strong><span>modern business era</span></div></div>
      </div>
      <div className="business-note"><ShieldCheck size={18} aria-hidden="true" /><p><strong>Gross is not profit.</strong> Supplies, upgrades, crew cuts, damage and public-lobby risk all change the result. Treat the figures here as planning references and confirm current bonuses in-game.</p></div>
      <div className="business-filters" role="tablist" aria-label="Filter businesses by income model">{BUSINESS_GROUPS.map((group) => <button key={group.key} type="button" role="tab" aria-selected={activeGroup === group.key} className={activeGroup === group.key ? 'active' : ''} onClick={() => setActiveGroup(group.key)}>{group.label}</button>)}</div>
      <div className="business-list">
        {entries.map((business, index) => <article className="business-entry" id={business.slug} key={business.slug}>
          <div className="business-entry-media"><Link href={`/gta-online/businesses/${business.slug}`} className="business-media-link" aria-label={`Open detailed guide for ${business.title}`}><MediaImage src={business.image} alt={business.imageAlt} priority={index === 0 && activeGroup === 'ALL'} sizes="(max-width: 800px) 100vw, 38vw" /></Link><div className="business-image-overlay"><span>{business.groupLabel}</span><span>{business.update}</span></div></div>
          <div className="business-entry-body"><div className="business-entry-heading"><div><p className="eyebrow">{business.released}</p><h3><Link href={`/gta-online/businesses/${business.slug}`}>{business.title}</Link></h3></div><a href={business.mediaSource} target="_blank" rel="noopener noreferrer" className="business-source" aria-label={`Open source for ${business.title}`}><ExternalLink size={16} /> Source</a></div><p className="business-summary">{business.summary}</p>
            <div className="business-stats"><BusinessStat icon={Banknote} label="Entry price" value={business.basePrice} /><BusinessStat icon={Building2} label="Cycle" value={business.cycle} /><BusinessStat icon={Users} label="Solo" value={business.solo} /><BusinessStat icon={ShieldCheck} label="Earns by" value={business.incomeNote} /></div>
            <div className="business-benefit"><span className="eyebrow">WHY IT MATTERS</span><strong>{business.bestFor}</strong></div>
            <div className="business-entry-actions"><Link className="business-full-guide" href={`/gta-online/businesses/${business.slug}`}>Open full guide with map <Map size={15} /></Link><a href={business.mediaSource} target="_blank" rel="noopener noreferrer" className="muted-link">Real media source <ExternalLink size={14} /></a></div>
          </div>
        </article>)}
      </div>
      <div className="business-advice"><div><p className="eyebrow">SMART STACK</p><h3>Acid Lab → Bunker → Nightclub.</h3><p>For many players, the strongest foundation is a solo-friendly active business first, a passive producer second and a Nightclub once there are feeder businesses to connect.</p></div><Link href="/gta-online/properties" className="text-link">Compare the required properties <ExternalLink size={15} /></Link></div>
    </section>
  );
}
