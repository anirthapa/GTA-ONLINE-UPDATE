import { NextRequest, NextResponse } from "next/server";
import { getArticles } from "@/services/public-data";
import { searchCatalog } from "@/lib/search";
import { guidePath } from "@/lib/hubs";
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    const [articles, {guides,vehicles}] = await Promise.all([
      getArticles({ query: q, limit: 7 }),
      searchCatalog(q),
    ]);
    const term = q.toLowerCase();
    const results = [
      ...articles.map((a) => ({
        title: a.title,
        href: `/news/${a.slug}`,
        type: "News",
      })),
      ...guides
        .filter((g) =>
          (g.title + " " + g.description).toLowerCase().includes(term),
        )
        .slice(0, 5)
        .map((g) => ({
          title: g.title,
          href: guidePath(g.kind, g.slug),
          type: g.kind,
        })),
      ...vehicles
        .filter((v) => v.name.toLowerCase().includes(term))
        .slice(0, 5)
        .map((v) => ({
          title: v.name,
          href: `/gta-online/vehicles/${v.slug}`,
          type: "Vehicle",
        })),
    ].slice(0, 12);
    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Search unavailable" }, { status: 503 });
  }
}
