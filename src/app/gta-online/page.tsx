import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getArticles, getWeeklyUpdate } from "@/services/public-data";
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
      <WeeklyPanel week={week} />
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
