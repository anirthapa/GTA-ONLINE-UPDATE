import Link from "next/link";
import { MediaImage } from "@/components/media-image";
import {
  ArrowUpRight,
  ArrowRight,
  Clock3,
  ShieldCheck,
  Radio,
  Zap,
} from "lucide-react";
import type { Article, WeeklyUpdate } from "@/services/types";
import { date, label } from "@/lib/utils";
import { disclaimer } from "@/lib/site";
export function Verification({ value }: { value: string }) {
  return (
    <span className={`verification ${value.toLowerCase()}`}>
      {value === "CONFIRMED" ? "✓" : value === "RUMOR" ? "?" : "◉"}{" "}
      {label(value)}
    </span>
  );
}
export function StoryImage({
  article,
  priority = false,
}: {
  article: Article;
  priority?: boolean;
}) {
  return (
    <MediaImage
      key={article.featured_image}
      src={article.featured_image}
      alt={
        article.image_alt ||
        "Original illustration of a fictional city at dusk; not a game screenshot"
      }
      sizes={
        priority
          ? "(max-width: 800px) 100vw, 65vw"
          : "(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
      }
      priority={priority}
    />
  );
}
export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="article-card">
      <Link href={`/news/${article.slug}`} className="card-image">
        <StoryImage article={article} />
        <span className="image-tag">{label(article.game)}</span>
        {article.is_seed && <span className="seed-tag">Sample story</span>}
      </Link>
      <div className="card-copy">
        <div className="card-kicker">
          <span>{label(article.category)}</span>
          <Verification value={article.verification_status} />
        </div>
        <h3>
          <Link href={`/news/${article.slug}`}>{article.title}</Link>
        </h3>
        <p>{article.excerpt}</p>
        <div className="story-meta">
          <span>
            {article.is_seed ? "Development sample" : article.source_name}
          </span>
          <span>{date(article.published_at)}</span>
          <span>
            <Clock3 size={12} />{" "}
            {Math.max(1, Math.ceil(article.content.split(/\s+/).length / 220))}{" "}
            min
          </span>
        </div>
      </div>
    </article>
  );
}
export function ArticleGrid({ articles }: { articles: Article[] }) {
  return articles.length ? (
    <div className="article-grid">
      {articles.map((a) => (
        <ArticleCard key={a.id} article={a} />
      ))}
    </div>
  ) : (
    <EmptyState
      title="The next story starts here"
      description="Verified stories will appear as sources publish and our editorial checks are completed."
    />
  );
}
export function SectionHeading({
  kicker,
  title,
  href,
  action = "View all",
}: {
  kicker?: string;
  title: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h2>{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-link">
          {action} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <Radio size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function WeeklyPanel({
  week,
  full = false,
}: {
  week: WeeklyUpdate | null;
  full?: boolean;
}) {
  return (
    <section className="weekly-panel">
      <div className="weekly-intro">
        <div>
          <p className="eyebrow">
            <Zap size={15} /> THE WEEKLY BRIEFING
          </p>
          <h2>
            Los Santos.
            <br />
            <span>More rewarding.</span>
          </h2>
          <p>
            {week
              ? `${date(week.event_start)} – ${date(new Date(new Date(week.event_end).getTime() - 1).toISOString())}`
              : "Waiting for this week’s update."}
          </p>
        </div>
        <Link href="/gta-online/weekly-update" className="button">
          Full weekly update <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="weekly-bonuses">
        {week?.data.bonuses.length ? (
          week.data.bonuses.slice(0, full ? undefined : 3).map((bonus, i) => (
            <div className="bonus-card" key={i}>
              <span className="bonus-value">
                {bonus.moneyMultiplier ? `${bonus.moneyMultiplier}X` : "RP"}
              </span>
              <span className="eyebrow">
                {bonus.moneyMultiplier &&
                bonus.rpMultiplier === bonus.moneyMultiplier
                  ? "GTA$ & RP"
                  : bonus.moneyMultiplier
                    ? "GTA$"
                    : `${bonus.rpMultiplier}X RP`}
              </span>
              <h3>{bonus.activity}</h3>
              {bonus.rpMultiplier &&
                bonus.moneyMultiplier !== bonus.rpMultiplier && (
                  <p>{bonus.rpMultiplier}X RP</p>
                )}
            </div>
          ))
        ) : (
          <div className="weekly-waiting">
            <ShieldCheck size={34} />
            <h3>Good intel takes a source.</h3>
            <p>
              Weekly bonuses appear here once the official event dates and
              rewards have been verified.
            </p>
            <span className="subtle-label">No active verified offers</span>
          </div>
        )}
      </div>
    </section>
  );
}
export function Breadcrumbs({
  items,
}: {
  items: { name: string; href: string }[];
}) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      {items.map((item) => (
        <span key={item.href}>
          / <Link href={item.href}>{item.name}</Link>
        </span>
      ))}
    </nav>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Link href="/" className="brand footer-brand">
              <Radio />
              <span>
                LOS SANTOS <b>WIRE.</b>
              </span>
            </Link>
            <p>
              All things GTA. All in one place.
              <br />
              Independent reporting. Sources first.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            {[
              ["GTA Online", "/gta-online"],
              ["GTA VI", "/gta-6"],
              ["Weekly Update", "/gta-online/weekly-update"],
              ["News", "/news"],
            ].map(([n, h]) => (
              <Link key={h} href={h}>
                {n}
              </Link>
            ))}
          </div>
          <div>
            <h3>Get ahead</h3>
            {[
              ["Guides", "/guides"],
              ["Vehicles", "/gta-online/vehicles"],
              ["Properties", "/gta-online/properties"],
              ["Heists", "/gta-online/heists"],
              ["Rumors", "/rumors"],
            ].map(([n, h]) => (
              <Link key={h} href={h}>
                {n}
              </Link>
            ))}
          </div>
          <div>
            <h3>The publication</h3>
            {[
              ["About", "/about"],
              ["Contact", "/contact"],
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
              ["Disclaimer", "/disclaimer"],
            ].map(([n, h]) => (
              <Link key={h} href={h}>
                {n}
              </Link>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <p>{disclaimer}</p>
          <span>© {new Date().getFullYear()} Los Santos Wire</span>
          <Link href="/admin">
            Editorial desk <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
