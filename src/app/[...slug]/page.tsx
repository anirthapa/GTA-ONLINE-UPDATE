import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BookOpen } from "lucide-react";
import {
  getArticles,
  getGuides,
  getGuide,
  getSettings,
} from "@/services/public-data";
import {
  ArticleGrid,
  Breadcrumbs,
  EmptyState,
  SectionHeading,
  Verification,
} from "@/components/editorial";
import { ArticleContent } from "@/components/content";
import { ReleaseCountdown } from "@/components/interactive";
import { MediaImage } from "@/components/media-image";
import { HeistDirectory } from "@/components/heist-directory";
import { HeistDetailPage } from "@/components/heist-detail";
import { PropertyDetailPage } from "@/components/property-detail";
import { PropertyDirectory } from "@/components/property-directory";
import { BusinessDetailPage } from "@/components/business-detail";
import { BusinessDirectory } from "@/components/business-directory";
import { hubs, guidePath } from "@/lib/hubs";
import { HEIST_ENTRIES } from "@/lib/heists";
import { PROPERTY_ENTRIES } from "@/lib/properties";
import { BUSINESS_ENTRIES } from "@/lib/businesses";
import { date } from "@/lib/utils";
import { disclaimer, siteUrl } from "@/lib/site";
export const dynamic = "force-dynamic";
const information: Record<string, { title: string; content: string }> = {
  about: {
    title: "Independent. Sources first.",
    content:
      "Los Santos Wire is an independent GTA publication covering GTA Online, GTA VI and GTA-related Rockstar announcements.\n\n## Our editorial approach\n\nWe prioritize official announcements. Every story includes source attribution and a verification label. Automated summaries pass structured validation and configurable editorial checks before publication. Community speculation is always labeled as a rumor.\n\n## Corrections\n\nWhen better information becomes available, articles are updated with a modified timestamp. Our editorial system retains revisions and source history. Dates, gameplay values and weekly rewards must be grounded in source material.\n\n## Original imagery\n\nOur default city artwork is an original AI-generated editorial illustration. It is not official Rockstar artwork, a GTA screenshot or evidence of an announced feature.\n\n" +
      disclaimer,
  },
  disclaimer: {
    title: "Independent fan-site disclaimer",
    content:
      disclaimer +
      "\n\nGrand Theft Auto, GTA, Rockstar Games and related names are trademarks of their respective owners. Their use identifies the games and sources we cover and does not imply endorsement.\n\nRumors and reported information are distinguished from confirmed announcements. Archived events may no longer be available in-game. Always check the linked official source for applicable dates and conditions.",
  },
  privacy: {
    title: "Privacy",
    content:
      "Basic reading does not require an account. Theme preferences and saved story slugs are stored only in your browser. A per-session viewed-story marker helps avoid repeatedly counting the same article view.\n\n## Site operation\n\nThe server stores aggregate article view counts. A short-lived hashed request identifier is used for abuse prevention; it is not used for advertising profiles. Hosting and authentication providers may process request logs as necessary to operate the service.\n\n## Administrative accounts\n\nAdmin authentication is handled by Supabase. Session cookies secure editorial access. No reader account registration is provided.\n\n## External services\n\nFollowing a source or sharing link takes you to a third-party service with its own privacy policy. Official videos, when present, use privacy-enhanced YouTube embeds.\n\n## Managing local preferences\n\nYou can remove theme preferences and bookmarks by clearing this site’s browser storage. No newsletter or browser push subscription is enabled by default.",
  },
  terms: {
    title: "Terms of use",
    content:
      "Los Santos Wire provides independent game news and informational summaries. Use the publication for personal reading and follow the original source links for complete announcements and conditions.\n\n## Content and availability\n\nGame information, offers and release plans may change. Verification labels describe the evidence available when an article was updated. Rumors are unconfirmed. Archived offers must not be assumed to remain active.\n\n## Responsible use\n\nDo not attempt to access protected editorial accounts, bypass rate limits or interfere with ingestion and publishing. Original publisher material remains the property of its owners.\n\n" +
      disclaimer,
  },
  contact: {
    title: "Get in touch with the wire.",
    content:
      "For corrections, please include the story URL, the detail you believe is inaccurate and a link to supporting evidence. For media permissions, identify the relevant asset and its owner.\n\n" +
      (process.env.CONTACT_EMAIL
        ? `Editorial contact: ${process.env.CONTACT_EMAIL}`
        : "The publication’s contact address has not been configured yet. It will appear here when the editorial team opens submissions."),
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const key = (await params).slug.join("/");
  const hub = hubs[key];
  const info = information[key];
  const staticHeist = key.startsWith("gta-online/heists/")
    ? HEIST_ENTRIES.find((heist) => heist.slug === key.split("/").at(-1))
    : undefined;
  const staticProperty = key.startsWith("gta-online/properties/")
    ? PROPERTY_ENTRIES.find((property) => property.slug === key.split("/").at(-1))
    : undefined;
  const staticBusiness = key.startsWith("gta-online/businesses/")
    ? BUSINESS_ENTRIES.find((business) => business.slug === key.split("/").at(-1))
    : undefined;
  if (staticHeist)
    return {
      title: `${staticHeist.title} Guide | GTA Online Heists`,
      description: staticHeist.summary,
      alternates: { canonical: `/${key}` },
    };
  if (staticProperty)
    return {
      title: `${staticProperty.title} Guide | GTA Online Properties`,
      description: staticProperty.summary,
      alternates: { canonical: `/${key}` },
    };
  if (staticBusiness)
    return {
      title: `${staticBusiness.title} Guide | GTA Online Businesses`,
      description: staticBusiness.summary,
      alternates: { canonical: `/${key}` },
    };
  if (hub || info)
    return {
      title: hub?.title || info.title,
      description: hub?.description,
      alternates: { canonical: `/${key}` },
    };
  const g = await getGuide(key.split("/").at(-1)!);
  return {
    title: g?.title || "Page not found",
    description: g?.description,
    alternates: { canonical: `/${key}` },
      robots: g?.is_seed ? { index: false, follow: false } : undefined,
  };
}
export default async function HubPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const segments = (await params).slug;
  const key = segments.join("/");
  const hub = hubs[key];
  const info = information[key];
  const staticHeist = key.startsWith("gta-online/heists/")
    ? HEIST_ENTRIES.find((heist) => heist.slug === segments.at(-1))
    : undefined;
  const staticProperty = key.startsWith("gta-online/properties/")
    ? PROPERTY_ENTRIES.find((property) => property.slug === segments.at(-1))
    : undefined;
  const staticBusiness = key.startsWith("gta-online/businesses/")
    ? BUSINESS_ENTRIES.find((business) => business.slug === segments.at(-1))
    : undefined;
  if (info)
    return (
      <div className="container page-content" style={{ maxWidth: 950 }}>
        <Breadcrumbs items={[{ name: info.title, href: `/${key}` }]} />
        <div className="page-heading">
          <p className="eyebrow">LOS SANTOS WIRE</p>
          <h1>{info.title}</h1>
        </div>
        <ArticleContent content={info.content} />
      </div>
    );
  if (staticHeist) return <HeistDetailPage heist={staticHeist} />;
  if (staticProperty) return <PropertyDetailPage property={staticProperty} />;
  if (staticBusiness) return <BusinessDetailPage business={staticBusiness} />;
  if (hub) {
    if (key === "gta-online/heists") {
      const articles = await getArticles({
        game: "GTA_ONLINE",
        limit: 6,
      });
      return (
        <div className="container page-content heist-page">
          <Breadcrumbs items={[{ name: "GTA Online / Heists", href: `/${key}` }]} />
          <div className="page-heading heist-page-heading">
            <p className="eyebrow">GTA ONLINE / HEIST INTELLIGENCE</p>
            <h1>Plan your next score.</h1>
            <p>Every official GTA Online heist in one place — launch date, buy-in, crew size, payout, routes and the requirements that actually matter.</p>
          </div>
          <HeistDirectory />
          <section className="section-block">
            <SectionHeading title="Related reporting" />
            <ArticleGrid articles={articles} />
          </section>
        </div>
      );
    }
    if (key === "gta-online/properties") {
      const articles = await getArticles({ game: "GTA_ONLINE", limit: 6 });
      return (
        <div className="container page-content property-page">
          <Breadcrumbs items={[{ name: "GTA Online / Properties", href: `/${key}` }]} />
          <div className="page-heading property-page-heading">
            <p className="eyebrow">GTA ONLINE / PROPERTY INTELLIGENCE</p>
            <h1>Build a portfolio that pays back.</h1>
            <p>Every major GTA Online property type in one clear buying guide — costs, unlocks, locations, benefits and the smartest next purchase.</p>
          </div>
          <PropertyDirectory />
          <section className="section-block">
            <SectionHeading title="Related reporting" />
            <ArticleGrid articles={articles} />
          </section>
        </div>
      );
    }
    if (key === "gta-online/businesses") {
      const articles = await getArticles({ game: "GTA_ONLINE", category: "BUSINESSES", limit: 6 });
      return (
        <div className="container page-content business-page">
          <Breadcrumbs items={[{ name: "GTA Online / Businesses", href: `/${key}` }]} />
          <div className="page-heading business-page-heading">
            <p className="eyebrow">GTA ONLINE / BUSINESS INTELLIGENCE</p>
            <h1>Build an income engine.</h1>
            <p>Every major GTA Online business in one clear guide — start cost, income cycle, solo support, unlocks, locations and the right order to grow.</p>
          </div>
          <BusinessDirectory />
          <section className="section-block">
            <SectionHeading title="Related reporting" />
            <ArticleGrid articles={articles} />
          </section>
        </div>
      );
    }
    const [articles, allGuides, settings] = await Promise.all([
      getArticles({
        game: hub.game,
        category: hub.category,
        verification: hub.verification,
        limit: 12,
      }),
      hub.kind ? getGuides(hub.kind) : Promise.resolve([]),
      key === "gta-6/release-date" ? getSettings() : Promise.resolve(null),
    ]);
    const guides = allGuides.filter((g) => !hub.game || g.game === hub.game);
    return (
      <div className="container page-content">
        <Breadcrumbs
          items={[
            {
              name: key.replaceAll("/", " / ").replaceAll("-", " "),
              href: `/${key}`,
            },
          ]}
        />
        <div className="page-heading">
          <p className="eyebrow">
            {hub.game?.replaceAll("_", " ") || "LOS SANTOS WIRE"}
          </p>
          <h1>{hub.title}</h1>
          <p>{hub.description}</p>
        </div>
        {hub.verification === "RUMOR" && (
          <div className="notice">
            Unconfirmed information. Community posts and speculation are never
            promoted to confirmed facts without an official source.
          </div>
        )}
        {settings && (
          <section className="vi-banner">
            <div>
              <h2>Release countdown</h2>
              <p style={{ marginTop: 18 }}>
                {settings.release_date
                  ? date(settings.release_date)
                  : "No verified date configured."}
              </p>
              {settings.release_source_url && (
                <a
                  className="text-link"
                  href={settings.release_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Official source ↗
                </a>
              )}
              <p style={{ marginTop: 12 }}>
                Last verified:{" "}
                {settings.release_verified_at
                  ? date(settings.release_verified_at)
                  : "Awaiting verification"}
              </p>
            </div>
            <ReleaseCountdown
              date={settings.release_date}
              verified={
                !!(settings.release_source_url && settings.release_verified_at)
              }
            />
          </section>
        )}
        {hub.kind ? (
          <>
            {guides.length ? (
              <div className="resource-grid">
                {guides.map((g) => (
                  <Link
                    className="resource-card"
                    href={guidePath(g.kind, g.slug)}
                    key={g.id}
                  >
                    <span className="resource-icon">
                      <BookOpen size={27} />
                    </span>
                    <p className="eyebrow" style={{ marginTop: 18 }}>
                      {g.kind}
                      {g.is_seed ? " / SAMPLE" : ""}
                    </p>
                    <h3>{g.title}</h3>
                    <p>{g.description}</p>
                    <span className="text-link">
                      Explore the guide <ArrowUpRight size={16} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="The knowledge base is growing"
                description="Verified profiles and guides will appear here after editorial review."
              />
            )}
            <section className="section-block">
              <SectionHeading title="Related reporting" />
              <ArticleGrid articles={articles} />
            </section>
          </>
        ) : (
          <ArticleGrid articles={articles} />
        )}
      </div>
    );
  }
  const allowed =
    key.startsWith("guides/") ||
    key.startsWith("gta-online/heists/") ||
    key.startsWith("gta-online/properties/") ||
    key.startsWith("gta-online/businesses/") ||
    key.startsWith("gta-6/characters/") ||
    key.startsWith("gta-6/locations/") ||
    key.startsWith("gta-6/trailers/");
  if (!allowed) notFound();
  const guide = await getGuide(segments.at(-1)!);
  if (!guide || guidePath(guide.kind, guide.slug) !== `/${key}`) notFound();
  const youtube =
    guide.kind === "TRAILER" &&
    /^[a-zA-Z0-9_-]{11}$/.test(guide.facts.youtube_id || "")
      ? guide.facts.youtube_id
      : null;
  const required =
    guide.kind === "HEIST"
      ? [
          "Requirements",
          "Setup Cost",
          "Potential Payout",
          "Solo Support",
          "Player Count",
          "Cooldown",
          "Best Approach",
          "Primary Targets",
          "Secondary Targets",
        ]
      : [];
  const facts = {
    ...Object.fromEntries(
      required.map((n) => [n, "Awaiting sourced verification"]),
    ),
    ...guide.facts,
  };
  const publicFacts = Object.entries(facts).filter(
    ([k]) =>
      !["youtube_id", "upload_date", "thumbnail_url", "confidence"].includes(k),
  );
  const faq = Object.entries(guide.facts)
    .filter(([k]) => k.startsWith("FAQ:"))
    .map(([k, v]) => ({
      "@type": "Question",
      name: k.slice(4).trim(),
      acceptedAnswer: { "@type": "Answer", text: v },
    }));
  const videoLd =
    youtube && guide.facts.upload_date && guide.source_url
      ? {
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: guide.title,
          description: guide.description,
          uploadDate: guide.facts.upload_date,
          thumbnailUrl:
            guide.facts.thumbnail_url ||
            `https://i.ytimg.com/vi/${youtube}/hqdefault.jpg`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${youtube}`,
        }
      : null;
  return (
    <div className="container page-content" style={{ maxWidth: 1050 }}>
      <Breadcrumbs
        items={[
          {
            name: "Knowledge hub",
            href: segments[0] === "gta-6" ? "/gta-6" : "/guides",
          },
          { name: guide.title, href: `/${key}` },
        ]}
      />
      <div className="page-heading">
        <p className="eyebrow">
          {guide.game.replaceAll("_", " ")} / {guide.kind}
        </p>
        <h1>{guide.title}</h1>
        <p>{guide.description}</p>
      </div>
      <Verification value={guide.verification_status} />
      {guide.image && <div className="article-hero"><MediaImage src={guide.image} alt={guide.title} priority/></div>}
      {guide.is_seed && (
        <div className="notice">
          Development sample. This entry is not verified gameplay information.
        </div>
      )}
      {youtube && (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtube}`}
          title={guide.title}
          allow="encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          style={{
            width: "100%",
            aspectRatio: "16/9",
            border: 0,
            borderRadius: 12,
            margin: "24px 0",
          }}
        />
      )}
      <section className="panel" style={{ margin: "25px 0" }}>
        <h2>
          {guide.kind === "HEIST" ? "Before you start" : "Verified details"}
        </h2>
        <dl className="facts">
          {publicFacts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {!publicFacts.length && (
          <p className="muted">No structured facts have been verified yet.</p>
        )}
      </section>
      <ArticleContent content={guide.content} />
      <div className="source-box panel">
        <p className="eyebrow">VERIFICATION RECORD</p>
        <p>
          Last verified:{" "}
          {guide.verified_at
            ? date(guide.verified_at)
            : "Awaiting verification"}
        </p>
        {guide.facts.confidence && <p>Confidence: {guide.facts.confidence}</p>}
        {guide.source_url && (
          <a href={guide.source_url} target="_blank" rel="noopener noreferrer">
            Source attribution ↗
          </a>
        )}
      </div>
      {!guide.is_seed && faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq,
            }).replace(/</g, "\\u003c"),
          }}
        />
      )}
      {!guide.is_seed && videoLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(videoLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
              {
                "@type": "ListItem",
                position: 2,
                name: guide.title,
                item: `${siteUrl}/${key}`,
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
