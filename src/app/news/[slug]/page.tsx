import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getArticle,
  getArticles,
  getGuides,
  getVehicles,
} from "@/services/public-data";
import {
  Breadcrumbs,
  StoryImage,
  Verification,
  ArticleGrid,
  SectionHeading,
} from "@/components/editorial";
import { ArticleContent } from "@/components/content";
import {
  ArticleView,
  BookmarkButton,
  ShareLinks,
} from "@/components/interactive";
import { date, label } from "@/lib/utils";
import { siteUrl, SITE_NAME } from "@/lib/site";
import { mediaSource, editorialImage } from "@/lib/media";
import { guidePath } from "@/lib/hubs";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return { title: "Story not found" };
  return {
    title: a.seo_title || a.title,
    description: a.seo_description || a.excerpt,
    alternates: { canonical: `/news/${a.slug}` },
    robots: a.is_seed ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title: a.title,
      description: a.excerpt,
      publishedTime: a.published_at || undefined,
      modifiedTime: a.updated_at,
      images: [
        {
          url: mediaSource(a.featured_image),
          alt: a.image_alt || "Original editorial illustration",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: a.title,
      description: a.excerpt,
    },
  };
}
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const article = await getArticle((await params).slug);
  if (!article) notFound();
  const [all, guides, vehicles] = await Promise.all([
    getArticles({ game: article.game, limit: 30 }),
    getGuides(),
    getVehicles(),
  ]);
  const score = (a: typeof article) =>
    (a.category === article.category ? 3 : 0) +
    a.entities.filter((e) => article.entities.includes(e)).length * 3 +
    a.keywords.filter((k) => article.keywords.includes(k)).length;
  const related = all
    .filter((a) => a.id !== article.id)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3);
  const links = [
    ...guides.flatMap((g) => [
      {name: g.title, href: guidePath(g.kind,g.slug)},
      {name: g.slug.replaceAll('-', ' '), href: guidePath(g.kind,g.slug)},
    ]),
    ...vehicles.map((v) => ({
      name: v.name,
      href: `/gta-online/vehicles/${v.slug}`,
    })),
  ];
  const structured = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { "@type": "Organization", name: `${SITE_NAME} Editorial` },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: `${siteUrl}/news/${article.slug}`,
    citation: article.source_url,
    image: new URL(mediaSource(article.featured_image), siteUrl).href,
  };
  return (
    <div className="container page-content">
      {!article.is_seed && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
            }}
          />
          <ArticleView id={article.id} />
        </>
      )}
      <Breadcrumbs
        items={[
          { name: "News", href: "/news" },
          { name: article.title, href: `/news/${article.slug}` },
        ]}
      />
      <div className="article-layout">
        <article>
          <header className="article-header">
            <div className="hero-tags">
              <span className="badge lime">{label(article.game)}</span>
              <span className="eyebrow">{label(article.category)}</span>
              <Verification value={article.verification_status} />
            </div>
            {article.is_seed && (
              <div className="notice">
                Development sample. This fictional editorial entry is for
                testing and is not current GTA news.
              </div>
            )}
            <h1>{article.title}</h1>
            <p className="article-lede">{article.excerpt}</p>
            <div className="article-byline">
              <span>By Los Santos Wire Editorial</span>
              <time dateTime={article.published_at || undefined}>
                Published {date(article.published_at)}
              </time>
              <time dateTime={article.updated_at}>
                Updated {date(article.updated_at)}
              </time>
            </div>
            <BookmarkButton slug={article.slug} />
          </header>
          <div className="article-hero">
            <StoryImage article={article} priority />
          </div>
          <p className="image-caption">
            {mediaSource(article.featured_image) === editorialImage ? 'Original editorial illustration. Not an official GTA screenshot.' : article.image_alt || 'Editorial image supplied with this story.'}
          </p>
          <ArticleContent content={article.content} links={links} />
          <div className="source-box panel">
            <p className="eyebrow">THE SOURCE</p>
            <h3 style={{ margin: "10px 0" }}>Source: {article.source_name}</h3>
            {article.source_url && (
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the original source ↗
              </a>
            )}
            <p className="muted" style={{ marginTop: 12 }}>
              This is an independently written summary. Verification:{" "}
              {label(article.verification_status)}.
            </p>
          </div>
          <ShareLinks
            title={article.title}
            url={`${siteUrl}/news/${article.slug}`}
          />
        </article>
        <aside className="article-sidebar panel">
          <p className="eyebrow">KEEP EXPLORING</p>
          <h3 style={{ marginTop: 12 }}>Stay on the wire</h3>
          {related.map((a) => (
            <Link className="sidebar-link" key={a.id} href={`/news/${a.slug}`}>
              {a.title}
            </Link>
          ))}
          <Link className="sidebar-link" href="/gta-online/weekly-update">
            This week in GTA Online ↗
          </Link>
          <Link className="sidebar-link" href="/gta-6">
            The GTA VI knowledge hub ↗
          </Link>
        </aside>
      </div>
      <section className="section-block">
        <SectionHeading title="More on the story" />
        <ArticleGrid articles={related} />
      </section>
    </div>
  );
}
