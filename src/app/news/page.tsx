import Link from "next/link";
import type { Metadata } from "next";
import { getArticles } from "@/services/public-data";
import { ArticleGrid, Breadcrumbs } from "@/components/editorial";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Latest GTA news",
  description:
    "The latest independently sourced GTA Online and GTA VI stories.",
  alternates: { canonical: "/news" },
};
export default async function News({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(p.page) || 1));
  const game = ["GTA_ONLINE", "GTA_6", "GTA_5", "ROCKSTAR"].includes(
    p.game || "",
  )
    ? p.game
    : undefined;
  const articles = await getArticles({ game, page, limit: 12 });
  return (
    <div className="container page-content">
      <Breadcrumbs items={[{ name: "News", href: "/news" }]} />
      <div className="page-heading">
        <p className="eyebrow">FRESH FROM THE WIRE</p>
        <h1>The latest intel.</h1>
        <p>Announcements, updates and stories from across the world of GTA.</p>
      </div>
      <nav className="tabs" aria-label="Filter news">
        {[
          ["All stories", ""],
          ["GTA Online", "GTA_ONLINE"],
          ["GTA VI", "GTA_6"],
          ["Rockstar", "ROCKSTAR"],
        ].map(([n, g]) => (
          <Link
            className={(!game && !g) || game === g ? "active" : ""}
            key={n}
            href={`/news${g ? `?game=${g}` : ""}`}
          >
            {n}
          </Link>
        ))}
      </nav>
      <ArticleGrid articles={articles} />
      <div className="pagination">
        {page > 1 ? (
          <Link
            className="button secondary"
            href={`/news?page=${page - 1}${game ? `&game=${game}` : ""}`}
          >
            Previous
          </Link>
        ) : (
          <span />
        )}
        <span className="muted">Page {page}</span>
        {articles.length === 12 ? (
          <Link
            className="button secondary"
            href={`/news?page=${page + 1}${game ? `&game=${game}` : ""}`}
          >
            Next
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
