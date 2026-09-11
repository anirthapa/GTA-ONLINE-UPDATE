'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock3, Coins, ExternalLink, Map, ShieldCheck, Users } from 'lucide-react';
import { MediaImage } from '@/components/media-image';
import { HEIST_ENTRIES, HEIST_GROUPS, type HeistGroup } from '@/lib/heists';

function Stat({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="heist-stat">
      <Icon size={15} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function HeistDirectory() {
  const [activeGroup, setActiveGroup] = useState<'ALL' | HeistGroup>('ALL');
  const entries = useMemo(
    () => activeGroup === 'ALL' ? HEIST_ENTRIES : HEIST_ENTRIES.filter((heist) => heist.group === activeGroup),
    [activeGroup],
  );

  return (
    <section className="heist-directory" aria-label="GTA Online heist directory">
      <div className="heist-overview">
        <div>
          <p className="eyebrow">THE SCOREBOARD</p>
          <h2>11 heist scorelines. One clean reference.</h2>
          <p>
            Five classic apartment heists, three Doomsday acts, and three modern scores — including the 2026 Kortz Center Heist. Payouts below are current reference figures before crew cuts, damage penalties and weekly event multipliers.
          </p>
        </div>
        <div className="heist-overview-metrics">
          <div><strong>11</strong><span>official heist entries</span></div>
          <div><strong>1</strong><span>full heist playable solo</span></div>
          <div><strong>2015–26</strong><span>release window</span></div>
        </div>
      </div>

      <div className="heist-note">
        <ShieldCheck size={18} aria-hidden="true" />
        <p><strong>How to read the money:</strong> “First weekly run” means the boosted first completion after the weekly reset where applicable. Rockstar can change payouts, target odds and bonus windows, so treat the in-game result screen as final.</p>
      </div>

      <div className="heist-filters" role="tablist" aria-label="Filter heists by release group">
        {HEIST_GROUPS.map((group) => (
          <button
            key={group.key}
            type="button"
            role="tab"
            aria-selected={activeGroup === group.key}
            className={activeGroup === group.key ? 'active' : ''}
            onClick={() => setActiveGroup(group.key)}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className="heist-list">
        {entries.map((heist, index) => (
            <article className="heist-entry" id={heist.slug} key={heist.slug}>
            <div className="heist-entry-media">
              <Link href={`/gta-online/heists/${heist.slug}`} className="heist-media-link" aria-label={`Open detailed guide for ${heist.title}`}>
                <MediaImage src={heist.image} alt={heist.imageAlt} priority={index === 0 && activeGroup === 'ALL'} sizes="(max-width: 800px) 100vw, 38vw" />
              </Link>
              <div className="heist-image-overlay">
                <span>{heist.groupLabel}</span>
                <span>{heist.update}</span>
              </div>
            </div>
            <div className="heist-entry-body">
              <div className="heist-entry-heading">
                <div>
                  <p className="eyebrow">{heist.released}</p>
                  <h3><Link href={`/gta-online/heists/${heist.slug}`}>{heist.title}</Link></h3>
                </div>
                <a href={heist.source} target="_blank" rel="noopener noreferrer" className="heist-source" aria-label={`Open source for ${heist.title}`}>
                  <ExternalLink size={16} /> Source
                </a>
              </div>
              <p className="heist-summary">{heist.summary}</p>

              <div className="heist-stats">
                <Stat icon={Users} label="Crew" value={heist.players} />
                <Stat icon={Coins} label="Host" value={heist.host} />
                <Stat icon={Coins} label="Setup" value={heist.setup} />
                <Stat icon={Clock3} label="Cooldown" value={heist.cooldown} />
              </div>

              <div className="heist-payout">
                <span className="eyebrow">POTENTIAL EARNINGS</span>
                <strong>{heist.payout}</strong>
                <small>{heist.solo}</small>
              </div>

              <details className="heist-details">
                <summary>See requirements, routes and completion notes</summary>
                <div className="heist-detail-grid">
                  <div>
                    <h4><ShieldCheck size={15} /> Required before launch</h4>
                    <ul>{heist.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <h4><Map size={15} /> Ways to complete</h4>
                    <ul className="heist-routes">
                      {heist.routes.map((route) => <li key={route.name}><strong>{route.name}</strong><span>{route.detail}</span></li>)}
                    </ul>
                  </div>
                </div>
                <div className="heist-best-for"><strong>Best for:</strong> {heist.bestFor}</div>
                <Link className="heist-full-guide" href={`/gta-online/heists/${heist.slug}`}>Open full guide with map <Map size={15} /></Link>
                <div className="heist-release"><CalendarDays size={15} /> Released {heist.released} · <a href={heist.source} target="_blank" rel="noopener noreferrer">{heist.sourceLabel}</a></div>
              </details>
            </div>
          </article>
        ))}
      </div>

      <div className="heist-adjacent">
        <div>
          <p className="eyebrow">DON’T MIX THESE INTO THE COUNT</p>
          <h3>Raid and mode content</h3>
          <p>Cluckin’ Bell Farm Raid (March 7, 2024) is a solo-friendly six-mission raid. Mansion Raid (January 15, 2026) is an Adversary Mode. Both belong in the wider criminal-activity guide, not in the 11 official heist scorelines above.</p>
        </div>
        <a href="https://www.rockstargames.com/newswire/article/39ok12a82k4537/gta-online-the-cluckin-bell-farm-raid-now-available" target="_blank" rel="noopener noreferrer" className="text-link">Read Rockstar’s raid brief <ExternalLink size={15} /></a>
      </div>
    </section>
  );
}
