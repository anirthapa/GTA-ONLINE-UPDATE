import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  getArticles,
  getWeeklyUpdate,
  getWeeklyOffers,
} from "@/services/public-data";
import { MediaImage } from "@/components/media-image";
import { VehicleCard } from "@/components/vehicle-card";
import {
  ArticleGrid,
  Breadcrumbs,
  SectionHeading,
  WeeklyPanel,
} from "@/components/editorial";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "GTA Online news, bonuses and guides",
  description:
    "Your GTA Online briefing: weekly events, vehicles, heists, businesses and guides.",
  alternates: { canonical: "/gta-online" },
};
export default async function Online() {
  const [articles, week] = await Promise.all([
    getArticles({ game: "GTA_ONLINE", limit: 9 }),
    getWeeklyUpdate(),
  ]);
  const offers = await getWeeklyOffers(week);
  const lead = offers.find((o) => o.vehicle?.image);
  return (
    <div className="container page-content">
      <Breadcrumbs items={[{ name: "GTA Online", href: "/gta-online" }]} />
      <div className="page-heading">
        <p className="eyebrow">WELCOME BACK TO LOS SANTOS</p>
        <h1>
          Make your next
          <br />
          session count.
        </h1>
        <p>
          Your GTA Online briefing. The latest updates, the weekly rewards and
          the knowledge to get ahead.
        </p>
      </div>
      {lead?.vehicle ? (
        <section className="edition-lead">
          <div className="edition-lead-copy">
            <span className="edition-pill">YOUR NEXT SESSION STARTS HERE</span>
            <h2>
              More to earn.
              <br />
              <span>More to drive.</span>
            </h2>
            <p>
              {week?.data.bonuses.length} bonus activities. {offers.length}{" "}
              discounted vehicles. One briefing to plan your week.
            </p>
            <div className="hero-actions">
              <Link href="/gta-online/weekly-update" className="button">
                Explore this week <ArrowUpRight size={18} />
              </Link>
              <Link className="text-link" href="/gta-online/vehicles">
                Browse vehicles
              </Link>
            </div>
          </div>
          <Link
            className="edition-lead-image"
            href={`/gta-online/vehicles/${lead.vehicle.slug}`}
          >
            <MediaImage
              src={lead.vehicle.image}
              alt={lead.vehicle.name}
              priority
              sizes="(max-width:760px) 100vw, 50vw"
            />
            <div className="lead-offer">
              {lead.discount_percent}%<small>THIS WEEK’S DISCOUNT</small>
            </div>
            <div className="lead-caption">
              <div>
                <small>THE WEEKLY SPOTLIGHT</small>
                <strong>{lead.vehicle.name}</strong>
              </div>
              <ArrowUpRight size={25} />
            </div>
          </Link>
        </section>
      ) : (
        <WeeklyPanel week={week} />
      )}
      <nav className="hub-links" aria-label="GTA Online sections">
        {[
          ["Money guides", "/guides"],
          ["Heists", "/gta-online/heists"],
          ["Vehicles", "/gta-online/vehicles"],
          ["Businesses", "/gta-online/businesses"],
          ["GTA+", "/gta-online/gta-plus"],
          ["Events", "/gta-online/events"],
          ["Missions", "/gta-online/missions"],
          ["Beginner guides", "/gta-online/beginner-guides"],
        ].map(([n, h]) => (
          <Link key={h} href={h}>
            {n}
            <ArrowUpRight size={16} />
          </Link>
        ))}
      </nav>
      {offers.length > 0 && (
        <section className="edition-section">
          <SectionHeading
            kicker="UPGRADE YOUR GARAGE"
            title="Pick your next ride."
            href="/gta-online/vehicles"
            action="Explore all vehicles"
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
      <section className="section-block">
        <SectionHeading
          title="Latest from Los Santos"
          href="/news?game=GTA_ONLINE"
        />
        <ArticleGrid articles={articles} />
      </section>
    </div>
  );
}
