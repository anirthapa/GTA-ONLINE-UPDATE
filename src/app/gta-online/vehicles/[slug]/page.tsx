import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Gauge,
  Users,
  ShoppingBag,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import {
  getVehicle,
  getVehicles,
  getWeeklyUpdate,
  getWeeklyOffers,
} from "@/services/public-data";
import { Breadcrumbs, SectionHeading } from "@/components/editorial";
import { VehicleGallery } from "@/components/vehicle-gallery";
import { VehicleCard } from "@/components/vehicle-card";
import { date, money } from "@/lib/utils";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const v = await getVehicle((await params).slug);
  return {
    title: v
      ? `${v.name} — prices, performance & specifications`
      : "Vehicle not found",
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
  const [v, week, vehicles] = await Promise.all([
    getVehicle((await params).slug),
    getWeeklyUpdate(),
    getVehicles(),
  ]);
  if (!v) notFound();
  const offers = await getWeeklyOffers(week);
  const offer = offers.find((o) => o.vehicle_id === v.id);
  const specs = v.specifications || {};
  const peers = vehicles
    .filter((p) => p.id !== v.id && p.vehicle_class === v.vehicle_class)
    .slice(0, 3);
  const stats = ["Speed", "Acceleration", "Braking", "Handling"];
  return (
    <div className="container page-content vehicle-detail">
      <Breadcrumbs
        items={[
          { name: "Vehicles", href: "/gta-online/vehicles" },
          { name: v.name, href: `/gta-online/vehicles/${v.slug}` },
        ]}
      />
      <Link
        href={
          offer
            ? "/gta-online/weekly-update#vehicle-deals"
            : "/gta-online/vehicles"
        }
        className="text-link back-link"
      >
        <ArrowLeft size={17} />
        {offer ? "Back to this week’s offers" : "Back to the garage"}
      </Link>
      <div className="vehicle-showcase">
        <VehicleGallery
          name={v.name}
          image={v.image}
          gallery={v.gallery}
          vehicleClass={v.vehicle_class}
          discount={offer?.discount_percent}
        />
        <div className="vehicle-showcase-copy">
          <p className="eyebrow">
            {v.manufacturer || "GTA ONLINE / VEHICLE PROFILE"}
          </p>
          <h1>{v.model_name || v.name}</h1>
          <p>{v.description}</p>
          <div className="purchase-price">
            <span>
              {offer ? "This week’s price" : "Standard purchase price"}
            </span>
            <strong>{money(offer?.sale_price ?? v.price)}</strong>
            {offer && v.price != null && <del>{money(v.price)}</del>}
            {offer && week && (
              <p>
                Reported offer · through{" "}
                {date(new Date(Date.parse(week.event_end) - 1).toISOString())}
              </p>
            )}
          </div>
          <div className="purchase-location">
            <ShoppingBag size={20} />
            <span>
              <small>Where to buy</small>
              {v.retailer || "Purchase location not yet sourced"}
            </span>
          </div>
          {v.trade_price != null && (
            <p className="muted">
              Trade price: {money(v.trade_price)} · unlock requirements apply.
            </p>
          )}
          <a href="#specifications" className="button">
            Explore specifications <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
      {v.is_seed && (
        <div className="notice">
          Fictional development vehicle. These are test specifications.
        </div>
      )}
      <div className="vehicle-key-stats">
        {[
          [
            Gauge,
            "Tested top speed",
            v.top_speed == null ? "Not yet sourced" : `${v.top_speed} mph`,
          ],
          [
            Users,
            "Seating",
            v.seats == null ? "Not yet sourced" : `${v.seats} seats`,
          ],
          [Wrench, "Drivetrain", specs["Drive Train"] || "Not yet sourced"],
          [
            ShieldCheck,
            "Added to GTA Online",
            v.added_at ? date(v.added_at) : "Not yet sourced",
          ],
        ].map(([Icon, title, value]) => {
          const I = Icon as typeof Gauge;
          return (
            <div key={title as string}>
              <I size={23} />
              <span>
                <small>{title as string}</small>
                <strong>{value as string}</strong>
              </span>
            </div>
          );
        })}
      </div>
      <section className="edition-section" id="specifications">
        <SectionHeading
          kicker="GET TO KNOW YOUR RIDE"
          title="Under the hood."
        />
        <div className="vehicle-spec-layout">
          <section className="spec-sheet">
            <h3>Vehicle specifications</h3>
            <dl>
              {Object.entries(specs)
                .filter(([key]) => !stats.includes(key) && key !== "Overall")
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              {!Object.keys(specs).length &&
                [
                  ["Class", v.vehicle_class],
                  ["Retailer", v.retailer || "Not yet sourced"],
                  ["Price", money(v.price)],
                ].map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </section>
          <aside className="performance-panel">
            <h3>Performance at a glance</h3>
            <p>In-game ratings. Tested top speed is listed separately.</p>
            {stats.map((key) => {
              const value = Number(specs[key]);
              return Number.isFinite(value) && specs[key] ? (
                <div className="performance-stat" key={key}>
                  <span>
                    {key}
                    <strong>{value.toFixed(1)} / 100</strong>
                  </span>
                  <meter min={0} max={100} value={value} aria-label={key} />
                </div>
              ) : null;
            })}
            {v.features.length > 0 && (
              <>
                <h3 className="feature-title">Features & upgrades</h3>
                <div className="feature-tags">
                  {v.features.map((f) => (
                    <span key={f}>{f}</span>
                  ))}
                </div>
              </>
            )}
            {specs["Top Speed - HSW"] && (
              <div className="hsw-callout">
                <Wrench size={22} />
                <strong>HSW top speed</strong>
                <span>{specs["Top Speed - HSW"]}</span>
              </div>
            )}
          </aside>
        </div>
      </section>
      {v.source_url && (
        <section className="edition-source">
          <ShieldCheck size={26} />
          <div>
            <p className="eyebrow">PROFILE SOURCE</p>
            <h3>Specifications & imagery via GTABase</h3>
            <p>
              Checked {date(v.verified_at)}. Tested performance is attributed to
              Broughy1322 by the source. Availability can change between events.
            </p>
          </div>
          <a
            className="button secondary"
            href={v.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View source profile <ArrowUpRight size={17} />
          </a>
        </section>
      )}
      {peers.length > 0 && (
        <section className="edition-section">
          <SectionHeading
            title="More in this class"
            href="/gta-online/vehicles"
            action="Explore all vehicles"
          />
          <div className="ride-grid">
            {peers.map((p) => (
              <VehicleCard
                key={p.id}
                vehicle={p}
                offer={offers.find((o) => o.vehicle_id === p.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
