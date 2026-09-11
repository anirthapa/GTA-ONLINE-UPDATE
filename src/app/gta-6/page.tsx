import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getArticles, getSettings } from "@/services/public-data";
import {
  ArticleGrid,
  Breadcrumbs,
  SectionHeading,
} from "@/components/editorial";
import { ReleaseCountdown } from "@/components/interactive";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "GTA VI — the knowledge hub",
  description:
    "Official GTA VI announcements, release information, trailers, characters and carefully labeled rumors.",
  alternates: { canonical: "/gta-6" },
};
export default async function VI() {
  const [articles, s] = await Promise.all([
    getArticles({ game: "GTA_6", limit: 9 }),
    getSettings(),
  ]);
  return (
    <div className="container page-content">
      <Breadcrumbs items={[{ name: "GTA VI", href: "/gta-6" }]} />
      <div className="page-heading">
        <p className="eyebrow">NEXT STOP: LEONIDA</p>
        <h1>
          A new world.
          <br />
          Every detail, here.
        </h1>
        <p>
          The GTA VI knowledge hub. Official announcements, trailers and what we
          actually know — with speculation clearly marked.
        </p>
      </div>
      <section className="next-chapter" style={{ marginTop: 0 }}>
        <div>
          <p className="eyebrow">GRAND THEFT AUTO VI</p>
          <h2 style={{ marginTop: 18 }}>
            Welcome to
            <br />
            what’s next<span>.</span>
          </h2>
          <p style={{ marginTop: 15 }}>
            Release information is updated only when it has an official source.
          </p>
          <Link href="/gta-6/release-date" className="text-link">
            Release details <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="next-chapter-countdown">
          <span className="vi-monogram" aria-hidden="true">
            VI
          </span>
          <p className="eyebrow">GTA VI RELEASES IN</p>
          <ReleaseCountdown
            date={s.release_date}
            verified={!!(s.release_source_url && s.release_verified_at)}
          />
        </div>
      </section>
      <nav className="hub-links" aria-label="GTA VI sections">
        {[
          "news",
          "official-announcements",
          "trailers",
          "characters",
          "locations",
          "vehicles",
          "screenshots",
          "features",
          "everything-we-know",
          "rumors",
          "timeline",
          "release-date",
        ].map((section) => (
          <Link key={section} href={`/gta-6/${section}`}>
            {section.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase())}
            <ArrowUpRight size={16} />
          </Link>
        ))}
      </nav>
      <div className="notice">
        <span className="verification confirmed">✓ Confirmed</span> — official
        source{" "}
        <span className="verification reported" style={{ marginLeft: 15 }}>
          ◉ Reported
        </span>{" "}
        — independent reporting{" "}
        <span className="verification rumor" style={{ marginLeft: 15 }}>
          ? Rumor
        </span>{" "}
        — unconfirmed speculation
      </div>
      <section className="section-block">
        <SectionHeading title="Latest GTA VI stories" href="/gta-6/news" />
        <ArticleGrid articles={articles} />
      </section>
    </div>
  );
}
