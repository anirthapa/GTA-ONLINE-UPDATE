import Link from "next/link";
import {
  ArrowUpRight,
  CarFront,
  BookOpen,
  Trophy,
  Zap,
  Radio,
  ShieldCheck,
} from "lucide-react";
import {
  getArticles,
  getSettings,
  getWeeklyUpdate,
  getWeeklyOffers,
} from "@/services/public-data";
import { ArticleGrid, SectionHeading } from "@/components/editorial";
import { ReleaseCountdown } from "@/components/interactive";
import { VehicleCard } from "@/components/vehicle-card";
import { MediaImage } from "@/components/media-image";
import { date } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [articles, week, settings] = await Promise.all([
    getArticles({ limit: 6 }),
    getWeeklyUpdate(),
    getSettings(),
  ]);
  const offers = await getWeeklyOffers(week);
  const lead = offers.find((o) => o.vehicle?.image);
  return (
    <div className="container homepage wire-home">
      <div className="home-masthead">
        <p className="eyebrow">
          <Radio size={15} /> INDEPENDENT GTA INTELLIGENCE
        </p>
        <span>{date(new Date().toISOString())}</span>
      </div>
      <section className="home-cover">
        <div className="home-cover-image">
          {lead?.vehicle && (
            <MediaImage
              src={lead.vehicle.image}
              alt={`${lead.vehicle.name}, featured in this week’s vehicle offers`}
              priority
              sizes="100vw"
            />
          )}
        </div>
        <div className="home-cover-shade" />
        <div className="home-cover-copy">
          <span className="edition-pill">WELCOME TO LOS SANTOS WIRE</span>
          <h1>
            The city moves fast.
            <br />
            <span>Stay one step ahead.</span>
          </h1>
          <p>
            Your GTA Online week, the next ride for your garage, and the road to
            GTA VI. All in one place.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/gta-online/weekly-update">
              This week’s briefing <ArrowUpRight size={18} />
            </Link>
            <Link className="cover-secondary" href="/gta-online/vehicles">
              Explore the garage
            </Link>
          </div>
        </div>
        {lead && (
          <Link
            className="cover-caption"
            href={`/gta-online/vehicles/${lead.vehicle!.slug}`}
          >
            <span>IN THE SPOTLIGHT</span>
            <strong>
              {lead.vehicle!.name} · {lead.discount_percent}% off
            </strong>
            <ArrowUpRight size={21} />
          </Link>
        )}
      </section>
      <div className="home-quick-grid">
        {[
          [
            Zap,
            "This week",
            week
              ? `${offers.length} vehicle offers + ${week.data.bonuses.length} bonus activities`
              : "The latest sourced event briefing",
            "/gta-online/weekly-update",
          ],
          [
            CarFront,
            "The garage",
            "Find a ride. Know the specs.",
            "/gta-online/vehicles",
          ],
          [BookOpen, "The playbook", "Guides to your next move", "/guides"],
          [
            Trophy,
            "The next score",
            "Heists, approaches, and planning",
            "/gta-online/heists",
          ],
        ].map(([Icon, title, desc, href]) => {
          const I = Icon as typeof Zap;
          return (
            <Link
              key={href as string}
              className="home-quick-card"
              href={href as string}
            >
              <I size={24} />
              <div>
                <h2>{title as string}</h2>
                <p>{desc as string}</p>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          );
        })}
      </div>
      {week && (
        <section className="home-week">
          <div>
            <p className="eyebrow">ON THE CLOCK / GTA ONLINE</p>
            <h2>Your week in Los Santos.</h2>
            <p>
              {date(week.event_start)} —{" "}
              {date(new Date(Date.parse(week.event_end) - 1).toISOString())}
            </p>
            <Link className="text-link" href="/gta-online/weekly-update">
              Open the full briefing <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="home-week-bonuses">
            {week.data.bonuses.slice(0, 3).map((b) => (
              <div key={b.activity}>
                <strong>{b.moneyMultiplier || b.rpMultiplier}×</strong>
                <small>
                  {b.moneyMultiplier === b.rpMultiplier
                    ? "GTA$ + RP"
                    : b.moneyMultiplier
                      ? "GTA$"
                      : "RP"}
                </small>
                <h3>{b.activity}</h3>
              </div>
            ))}
          </div>
        </section>
      )}
      {offers.length > 0 && (
        <section className="edition-section">
          <SectionHeading
            kicker="THE WEEKLY SHORTLIST"
            title="Good rides. Better prices."
            href="/gta-online/weekly-update#vehicle-deals"
            action={`All ${offers.length} offers`}
          />
          <div className="ride-grid">
            {offers
              .filter((o) => o.vehicle)
              .slice(0, 3)
              .map((o) => (
                <VehicleCard key={o.name} vehicle={o.vehicle!} offer={o} />
              ))}
          </div>
        </section>
      )}
      <section className="next-chapter">
        <div>
          <span className="eyebrow">NEXT STOP / LEONIDA</span>
          <h2>
            A whole new
            <br />
            state of mind<span>.</span>
          </h2>
          <p>
            GTA VI release details, official announcements, and everything we
            know so far.
          </p>
          <Link className="button secondary" href="/gta-6">
            Enter the GTA VI hub <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="next-chapter-countdown">
          <span className="vi-monogram" aria-hidden="true">
            VI
          </span>
          <p className="eyebrow">THE ROAD TO RELEASE</p>
          <ReleaseCountdown
            date={settings.release_date}
            verified={Boolean(
              settings.release_source_url && settings.release_verified_at,
            )}
          />
          {settings.release_source_url && (
            <a
              className="text-link"
              href={settings.release_source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Official release information ↗
            </a>
          )}
        </div>
      </section>
      <section className="edition-section">
        <SectionHeading
          kicker="FROM THE NEWSROOM"
          title="The latest on the wire."
          href="/news"
          action="All stories"
        />
        <ArticleGrid articles={articles} />
      </section>
      <div className="editorial-promise">
        <ShieldCheck size={28} />
        <div>
          <h3>Know the story. Know the source.</h3>
          <p>
            Independent coverage. Official news, media reports, and rumors
            clearly labeled.
          </p>
        </div>
        <Link className="text-link" href="/about">
          About the Wire <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
