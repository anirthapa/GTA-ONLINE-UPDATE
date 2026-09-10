import Link from "next/link";
import { notFound } from "next/navigation";
import { Car } from "lucide-react";
import {
  getVehicle,
  getArticles,
  getWeeklyUpdate,
} from "@/services/public-data";
import {
  Breadcrumbs,
  ArticleGrid,
  SectionHeading,
} from "@/components/editorial";
import { date, money } from "@/lib/utils";
import { MediaImage } from "@/components/media-image";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const v = await getVehicle((await params).slug);
  return {
    title: v ? `${v.name} — price & specifications` : "Vehicle not found",
    description: v?.description,
    alternates: { canonical: `/gta-online/vehicles/${v?.slug || ""}` },
    robots: v?.is_seed ? { index: false, follow: false } : undefined,
  };
}
export default async function Vehicle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const v = await getVehicle((await params).slug);
  if (!v) notFound();
  const [news, week] = await Promise.all([
    getArticles({ query: v.name, limit: 3 }),
    getWeeklyUpdate(),
  ]);
  const discount = week?.data.vehicleDiscounts.find(
    (d) => d.name.toLowerCase() === v.name.toLowerCase(),
  );
  return (
    <div className="container page-content">
      <Breadcrumbs
        items={[
          { name: "Vehicles", href: "/gta-online/vehicles" },
          { name: v.name, href: `/gta-online/vehicles/${v.slug}` },
        ]}
      />
      <div className="page-heading">
        <p className="eyebrow">
          <Car size={20} />
          {v.vehicle_class}
        </p>
        <h1>{v.name}</h1>
        <p>{v.description}</p>
      </div>
      {v.is_seed && (
        <div className="notice">
          Fictional development vehicle. Specifications are test data.
        </div>
      )}
      {discount && (
        <div className="notice">
          <strong>This week: {discount.discount}</strong>
          <Link
            className="text-link"
            style={{ marginLeft: 16 }}
            href="/gta-online/weekly-update"
          >
            See event details →
          </Link>
        </div>
      )}
      {v.image && <div className="article-hero"><MediaImage src={v.image} alt={v.name} priority/></div>}
      <section className="panel">
        <h2>Specifications</h2>
        <dl className="facts">
          {[
            ["Price", money(v.price)],
            ["Class", v.vehicle_class],
            [
              "Top speed",
              v.top_speed === null ? "Not verified" : `${v.top_speed} mph`,
            ],
            ["Seats", v.seats ?? "Not verified"],
            ["Where to purchase", v.retailer || "Not verified"],
            ["Added", v.added_at ? date(v.added_at) : "Not verified"],
            [
              "Special features",
              v.features.join(", ") || "No verified features",
            ],
            [
              "Last verified",
              v.verified_at ? date(v.verified_at) : "Awaiting verification",
            ],
          ].map(([n, value]) => (
            <div key={n}>
              <dt>{n}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {v.source_url && (
          <a
            className="text-link"
            style={{ marginTop: 22 }}
            href={v.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Specification source ↗
          </a>
        )}
      </section>
      <section className="section-block">
        <SectionHeading title="Related stories" />
        <ArticleGrid articles={news} />
      </section>
    </div>
  );
}
