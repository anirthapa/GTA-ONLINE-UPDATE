import { ArrowUpRight, Radio } from "lucide-react";
import { OFFICIAL_GTA_NEWS, type OfficialNewsItem } from "@/lib/official-news";
import { MediaImage } from "@/components/media-image";

function NewsVisual({ item, featured = false }: { item: OfficialNewsItem; featured?: boolean }) {
  return item.image ? (
    <MediaImage
      src={item.image}
      alt={item.imageAlt || item.title}
      priority={featured}
      sizes={featured ? "(max-width:680px) 100vw, 60vw" : "(max-width:900px) 50vw, 25vw"}
    />
  ) : (
    <div className={`official-news-placeholder${featured ? " featured" : ""}`} aria-hidden="true">
      <Radio size={featured ? 38 : 26} />
      <span>ROCKSTAR<br />NEWSWIRE</span>
      <small>OFFICIAL GTA ONLINE UPDATE</small>
    </div>
  );
}

function NewsCard({ item }: { item: OfficialNewsItem }) {
  return (
    <article className="official-news-card">
      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="official-news-card-media">
        <NewsVisual item={item} />
        <span className="official-news-tag">{item.tag}</span>
      </a>
      <div className="official-news-card-copy">
        <div className="official-news-meta"><span>{item.category}</span><time dateTime={item.dateIso}>{item.date}</time></div>
        <h3><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.title}</a></h3>
        <p>{item.summary}</p>
        <a className="text-link" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Read Rockstar&apos;s brief <ArrowUpRight size={15} /></a>
      </div>
    </article>
  );
}

export function OfficialNewsDesk({ compact = false }: { compact?: boolean }) {
  const [lead, ...rest] = OFFICIAL_GTA_NEWS;
  const items = compact ? rest.slice(0, 3) : rest;
  return (
    <section className={`official-news-desk${compact ? " compact" : ""}`}>
      <div className="official-news-heading">
        <div>
          <p className="eyebrow"><Radio size={14} /> OFFICIAL ROCKSTAR NEWSWIRE</p>
          <h2>{compact ? "The latest from Los Santos." : "GTA 5 / GTA Online news desk."}</h2>
          <p>Current Rockstar announcements, event rewards and new content, checked September 11, 2026.</p>
        </div>
        <a className="text-link" href="https://www.rockstargames.com/newswire" target="_blank" rel="noopener noreferrer">Open Newswire <ArrowUpRight size={16} /></a>
      </div>
      <article className="official-news-lead">
        <div className="official-news-lead-visual"><NewsVisual item={lead} featured /></div>
        <div className="official-news-lead-copy">
          <span className="official-news-tag">{lead.tag}</span>
          <div className="official-news-meta"><span>{lead.category}</span><time dateTime={lead.dateIso}>{lead.date}</time></div>
          <h3><a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer">{lead.title}</a></h3>
          <p>{lead.summary}</p>
          <a className="button secondary" href={lead.sourceUrl} target="_blank" rel="noopener noreferrer">Read official details <ArrowUpRight size={16} /></a>
        </div>
      </article>
      <div className="official-news-grid">{items.map((item) => <NewsCard item={item} key={item.sourceUrl} />)}</div>
    </section>
  );
}
