import Link from 'next/link';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Coins, ExternalLink, Map, ShieldCheck, Users } from 'lucide-react';
import { Breadcrumbs } from '@/components/editorial';
import { MediaImage } from '@/components/media-image';
import type { HeistEntry } from '@/lib/heists';

function DetailStat({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="heist-detail-stat">
      <Icon size={17} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function HeistDetailPage({ heist }: { heist: HeistEntry }) {
  return (
    <div className="container page-content heist-detail-page">
      <Breadcrumbs items={[
        { name: 'GTA Online / Heists', href: '/gta-online/heists' },
        { name: heist.title, href: `/gta-online/heists/${heist.slug}` },
      ]} />

      <article>
        <header className="heist-detail-hero">
          <div className="heist-detail-hero-media">
            <MediaImage src={heist.image} alt={heist.imageAlt} priority sizes="(max-width: 900px) 100vw, 54vw" />
            <div className="heist-image-overlay">
              <span>{heist.groupLabel}</span>
              <span>{heist.update}</span>
            </div>
          </div>
          <div className="heist-detail-hero-copy">
            <p className="eyebrow">{heist.released} · {heist.players}</p>
            <h1>{heist.title}</h1>
            <p className="heist-detail-lede">{heist.summary}</p>
            <div className="heist-detail-links">
              <a href={heist.source} target="_blank" rel="noopener noreferrer" className="text-link">{heist.sourceLabel} <ExternalLink size={15} /></a>
              <a href={heist.mediaSource} target="_blank" rel="noopener noreferrer" className="muted-link">{heist.mediaSourceLabel} <ExternalLink size={14} /></a>
            </div>
          </div>
        </header>

        <div className="heist-detail-stat-grid" aria-label={`${heist.title} quick facts`}>
          <DetailStat icon={CalendarDays} label="Launched" value={heist.released} />
          <DetailStat icon={Users} label="Players" value={heist.players} />
          <DetailStat icon={ShieldCheck} label="Host from" value={heist.host} />
          <DetailStat icon={Coins} label="Setup" value={heist.setup} />
          <DetailStat icon={Clock3} label="Cooldown" value={heist.cooldown} />
        </div>

        <div className="heist-detail-money panel">
          <div>
            <p className="eyebrow">POTENTIAL EARNINGS</p>
            <h2>{heist.payout}</h2>
            <p className="muted">Before crew cuts, damage penalties and temporary event bonuses. The in-game result screen is the final authority.</p>
          </div>
          <div className="heist-solo-badge"><strong>{heist.solo.startsWith('Yes') ? 'SOLO READY' : 'CREW REQUIRED'}</strong><span>{heist.solo}</span></div>
        </div>

        <div className="heist-detail-layout">
          <main>
            <section className="heist-detail-section" id="how-to-complete">
              <div className="section-kicker"><CheckCircle2 size={17} /> HOW TO COMPLETE IT</div>
              <h2>Run the score from setup to escape</h2>
              <ol className="heist-steps">
                {heist.steps.map((step, index) => (
                  <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>
                ))}
              </ol>
            </section>

            <section className="heist-detail-section" id="ways-to-complete">
              <div className="section-kicker"><ShieldCheck size={17} /> APPROACH OPTIONS</div>
              <h2>Ways to complete {heist.title}</h2>
              <div className="heist-route-cards">
                {heist.routes.map((route, index) => (
                  <article key={route.name} className="heist-route-card">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <h3>{route.name}</h3>
                    <p>{route.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="heist-detail-section" id="requirements">
              <div className="section-kicker"><ShieldCheck size={17} /> LAUNCH CHECKLIST</div>
              <h2>What you need before launching</h2>
              <ul className="heist-requirements-list">
                {heist.requirements.map((item) => <li key={item}><CheckCircle2 size={16} /> {item}</li>)}
              </ul>
              <div className="heist-best-for"><strong>Best for:</strong> {heist.bestFor}</div>
            </section>
          </main>

          <aside className="heist-map-column">
            <section className="heist-map-card" id="map">
              <div className="section-kicker"><Map size={17} /> MAP & ROUTE PLANNING</div>
              <h2>Know the ground before the timer</h2>
              <div className="heist-map-media"><MediaImage src={heist.mapImage} alt={heist.mapAlt} sizes="(max-width: 900px) 100vw, 42vw" /></div>
              <p>{heist.mapNote}</p>
              <div className="heist-map-routes">
                <span>Route cues</span>
                {heist.routes.map((route) => <strong key={route.name}>{route.name}</strong>)}
              </div>
              <a href={heist.mapSource} target="_blank" rel="noopener noreferrer" className="muted-link">{heist.mapSourceLabel} <ExternalLink size={14} /></a>
            </section>
            <section className="heist-source-card">
              <p className="eyebrow">EDITORIAL NOTE</p>
              <p>This page uses real in-game or official promotional media and a real GTA map reference. Images are shown for editorial reference; GTA, Rockstar Games and related properties belong to their respective owners.</p>
              <Link href="/gta-online/heists" className="text-link"><ArrowLeft size={15} /> Back to all heists</Link>
            </section>
          </aside>
        </div>
      </article>
    </div>
  );
}
