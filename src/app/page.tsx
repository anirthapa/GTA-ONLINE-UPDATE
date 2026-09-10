import Link from "next/link";
import {
  ArrowUpRight,
  Radio,
  ShieldCheck,
  ChevronRight,
  Gamepad2,
  Car,
  BookOpen,
} from "lucide-react";
import {
  getArticles,
  getSettings,
  getWeeklyUpdate,
} from "@/services/public-data";
import {
  ArticleGrid,
  SectionHeading,
  StoryImage,
  Verification,
  WeeklyPanel,
} from "@/components/editorial";
import { ReleaseCountdown } from "@/components/interactive";
import { date } from "@/lib/utils";
import { getTrending } from "@/lib/trending";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [articles, week, settings, popular] = await Promise.all([
    getArticles({ limit: 12 }),
    getWeeklyUpdate(),
    getSettings(),
    getTrending(),
  ]);
  const featured = articles.find((a) => a.featured) || articles[0];
  const trending = popular.filter((a) => a.id !== featured?.id).slice(0, 4);
  const breaking = articles.find(
    (a) =>
      a.breaking &&
      a.breaking_expires_at &&
      new Date(a.breaking_expires_at) > new Date(),
  );
  return (
    <>
      <div className="wire-ticker">
        <div className="container">
          <span className="ticker-label">
            <Radio size={14} /> ON THE WIRE
          </span>
          {breaking ? (
            <Link href={`/news/${breaking.slug}`}>
              {breaking.title} <ArrowUpRight size={14} />
            </Link>
          ) : (
            <span>GTA Online. GTA VI. Everything worth knowing.</span>
          )}
          <span className="ticker-right">INDEPENDENT. ALWAYS.</span>
        </div>
      </div>
      <div className="container homepage">
        <div className="edition-heading">
          <p className="eyebrow">YOUR DAILY CONNECTION TO THE WORLD OF GTA</p>
          <span>
            <ShieldCheck size={14} /> Sources first. Speculation labeled.
          </span>
        </div>
        <section className="hero-grid">
          <article className="featured-story">
            {featured ? (
              <>
                <StoryImage article={featured} priority />
                <div className="hero-shade" />
                <div className="hero-copy">
                  <div className="hero-tags">
                    <span className="badge lime">THE BIG STORY</span>
                    <Verification value={featured.verification_status} />
                    {featured.is_seed && (
                      <span className="badge">SAMPLE EDITION</span>
                    )}
                  </div>
                  <h1>
                    <Link href={`/news/${featured.slug}`}>
                      {featured.title}
                    </Link>
                  </h1>
                  <p>{featured.excerpt}</p>
                  <div className="hero-bottom">
                    <span>
                      {featured.is_seed
                        ? "Development sample"
                        : featured.source_name}{" "}
                      <span>•</span> {date(featured.published_at)}
                    </span>
                    <Link
                      className="hero-link"
                      href={`/news/${featured.slug}`}
                      aria-label={`Read ${featured.title}`}
                    >
                      <ArrowUpRight />
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="hero-copy no-image">
                <span className="badge lime">WELCOME TO THE WIRE</span>
                <h1>
                  The city never stops.
                  <br />
                  Stay in the know.
                </h1>
                <p>
                  Your independent connection to GTA Online and GTA VI. Sourced
                  updates will appear here after verification.
                </p>
                <Link className="button" href="/gta-online/weekly-update">
                  This week in GTA Online <ArrowUpRight size={18} />
                </Link>
              </div>
            )}
          </article>
          <aside className="trending-panel">
            <div className="trending-heading">
              <h2>
                On the radar<span>.</span>
              </h2>
              <span className="eyebrow">TRENDING</span>
            </div>
            {trending.length ? (
              trending.map((a, i) => (
                <Link
                  href={`/news/${a.slug}`}
                  className="trending-story"
                  key={a.id}
                >
                  <span className="trend-number">0{i + 1}</span>
                  <div>
                    <p className="eyebrow">
                      {a.game.replaceAll("_", " ")} {a.is_seed && " / SAMPLE"}
                    </p>
                    <h3>{a.title}</h3>
                    <span className="muted">
                      {a.is_seed ? "Development sample" : date(a.published_at)}
                    </span>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              ))
            ) : (
              <div className="radar-empty">
                <Radio size={36} />
                <p>Monitoring the next big story.</p>
                <span className="muted">
                  Published stories will appear here.
                </span>
              </div>
            )}
            <Link href="/news" className="radar-bottom">
              All the latest news <ChevronRight size={16} />
            </Link>
          </aside>
        </section>
        <div className="topic-strip">
          <span>JUMP INTO</span>
          {[
            ["Weekly bonuses", "/gta-online/weekly-update"],
            ["GTA VI intel", "/gta-6"],
            ["Money guides", "/guides"],
            ["Vehicle database", "/gta-online/vehicles"],
            ["Heist planning", "/gta-online/heists"],
          ].map(([n, h]) => (
            <Link href={h} key={h}>
              {n}
              <ArrowUpRight size={14} />
            </Link>
          ))}
        </div>
        <div className="section-block">
          <SectionHeading
            kicker="MAKE YOUR NEXT SESSION COUNT"
            title="GTA Online this week"
            href="/gta-online/weekly-update"
            action="Explore the update"
          />
          <WeeklyPanel week={week} />
        </div>
        <section className="section-block">
          <SectionHeading
            kicker="FRESH FROM THE WIRE"
            title="The latest intel"
            href="/news"
            action="All stories"
          />
          <ArticleGrid articles={articles.slice(0, 6)} />
        </section>
        <section className="vi-banner">
          <div>
            <p className="eyebrow">NEXT STOP: LEONIDA</p>
            <div className="vi-wordmark">
              GRAND THEFT AUTO <span>VI</span>
            </div>
            <p>Every announcement. Every detail. One place to keep up.</p>
            <Link href="/gta-6" className="text-link">
              Enter the GTA VI hub <ArrowUpRight size={18} />
            </Link>
          </div>
          <div>
            <p className="eyebrow">THE COUNTDOWN</p>
            <ReleaseCountdown
              date={settings.release_date}
              verified={
                !!(settings.release_source_url && settings.release_verified_at)
              }
            />
            {settings.release_source_url && (
              <a
                href={settings.release_source_url}
                className="muted"
                rel="noopener noreferrer"
                target="_blank"
              >
                Official release information ↗
              </a>
            )}
          </div>
        </section>
        <section className="section-block">
          <SectionHeading
            kicker="KNOW THE CITY. OWN YOUR SESSION."
            title="Get ahead of the game"
            href="/guides"
            action="All guides"
          />
          <div className="quick-guides">
            {[
              [
                Gamepad2,
                "Plan your next score",
                "Heist guides, approaches and verified requirements.",
                "/gta-online/heists",
                "01",
              ],
              [
                Car,
                "Find your next ride",
                "Browse the garage. Compare verified specifications.",
                "/gta-online/vehicles",
                "02",
              ],
              [
                BookOpen,
                "Make every move count",
                "Guides for businesses, missions and starting out.",
                "/guides",
                "03",
              ],
            ].map(([Icon, title, description, href, index]) => {
              const I = Icon as typeof Car;
              return (
                <Link
                  key={href as string}
                  href={href as string}
                  className="guide-tile"
                >
                  <div>
                    <I size={30} />
                    <span>{index as string}</span>
                  </div>
                  <h3>{title as string}</h3>
                  <p>{description as string}</p>
                  <ArrowUpRight size={21} />
                </Link>
              );
            })}
          </div>
        </section>
        <div className="editorial-promise">
          <ShieldCheck size={28} />
          <div>
            <h3>The story matters. So does the source.</h3>
            <p>
              Official announcements, independent reporting and community
              speculation are always clearly distinguished.
            </p>
          </div>
          <Link href="/about" className="text-link">
            Our editorial approach <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </>
  );
}
