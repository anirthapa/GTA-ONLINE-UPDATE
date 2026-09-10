import Link from "next/link";
import { Car, ArrowUpRight } from "lucide-react";
import { getVehicles, getWeeklyUpdate } from "@/services/public-data";
import { Breadcrumbs, EmptyState } from "@/components/editorial";
import { money } from "@/lib/utils";
import { MediaImage } from "@/components/media-image";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "GTA Online vehicle database",
  description:
    "Browse GTA Online vehicles by class and verified price, with current weekly discounts.",
  alternates: { canonical: "/gta-online/vehicles" },
};
export default async function Vehicles({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [all, week, p] = await Promise.all([
    getVehicles(),
    getWeeklyUpdate(),
    searchParams,
  ]);
  const discountMap = new Map(
    week?.data.vehicleDiscounts.map((d) => [d.name.toLowerCase(), d.discount]),
  );
  const vehicles = all
    .filter(
      (v) =>
        (!p.q || v.name.toLowerCase().includes(p.q.toLowerCase())) &&
        (!p.class || v.vehicle_class === p.class) &&
        (!p.max || (v.price !== null && v.price <= Number(p.max))) &&
        (!p.discount || discountMap.has(v.name.toLowerCase())),
    )
    .sort((a, b) =>
      p.sort === "price"
        ? (a.price ?? Infinity) - (b.price ?? Infinity)
        : p.sort === "newest"
          ? new Date(b.added_at || 0).getTime() -
            new Date(a.added_at || 0).getTime()
          : a.name.localeCompare(b.name),
    );
  return (
    <div className="container page-content">
      <Breadcrumbs
        items={[
          { name: "GTA Online", href: "/gta-online" },
          { name: "Vehicles", href: "/gta-online/vehicles" },
        ]}
      />
      <div className="page-heading">
        <p className="eyebrow">THE GARAGE</p>
        <h1>Find your next ride.</h1>
        <p>
          Compare vehicles, verified specifications and this week’s discounts.
        </p>
      </div>
      <form className="filter-form">
        <label className="field">
          Vehicle name
          <input
            name="q"
            placeholder="Search vehicles…"
            defaultValue={p.q}
            maxLength={100}
          />
        </label>
        <label className="field">
          Class
          <select name="class" defaultValue={p.class || ""}>
            <option value="">All classes</option>
            {[...new Set(all.map((v) => v.vehicle_class))].sort().map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Maximum GTA$
          <input
            name="max"
            type="number"
            min="0"
            max="100000000"
            defaultValue={p.max}
            placeholder="Any price"
          />
        </label>
        <label className="field">
          Sort by
          <select name="sort" defaultValue={p.sort || "alphabetical"}>
            <option value="alphabetical">Alphabetical</option>
            <option value="price">Price: low to high</option>
            <option value="newest">Newest</option>
          </select>
        </label>
        <label className="check-field">
          <input
            name="discount"
            type="checkbox"
            value="1"
            defaultChecked={!!p.discount}
          />
          Discounted this week
        </label>
        <button className="button" type="submit">
          Apply filters
        </button>
        <Link href="/gta-online/vehicles" className="button secondary">
          Reset
        </Link>
      </form>
      <p className="muted" style={{ marginBottom: 20 }}>
        {vehicles.length} vehicles found
      </p>
      {vehicles.length ? (
        <div className="resource-grid">
          {vehicles.map((v) => (
            <Link
              className="resource-card"
              href={`/gta-online/vehicles/${v.slug}`}
              key={v.id}
            >
              {v.image ? <span className="card-image" style={{borderRadius:8,marginBottom:15}}><MediaImage src={v.image} alt={v.name} sizes="(max-width:760px) 100vw, 33vw"/></span> : <span className="resource-icon">
                <Car size={30} />
              </span>}
              <p className="eyebrow" style={{ marginTop: 18 }}>
                {v.vehicle_class}
                {v.is_seed ? " / SAMPLE" : ""}
              </p>
              <h3>{v.name}</h3>
              <p>{v.description}</p>
              <div className="facts">
                <div>
                  <dt>Price</dt>
                  <dd>{money(v.price)}</dd>
                </div>
                <div>
                  <dt>Seats</dt>
                  <dd>{v.seats ?? "Unverified"}</dd>
                </div>
              </div>
              {discountMap.has(v.name.toLowerCase()) && (
                <p className="notice">
                  {discountMap.get(v.name.toLowerCase())}
                </p>
              )}
              <span className="text-link">
                View specifications <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No vehicles match these filters"
          description="Try another name or class. Only published, sourced specifications are shown."
        />
      )}
    </div>
  );
}
