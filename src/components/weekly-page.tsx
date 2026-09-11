import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  CalendarDays,
  CarFront,
  Gift,
  Sparkles,
} from "lucide-react";
import type { Vehicle, WeeklyUpdate } from "@/services/types";
import {
  Breadcrumbs,
  EmptyState,
  WeeklyPanel,
  SectionHeading,
} from "@/components/editorial";
import { MediaImage } from "@/components/media-image";
import { date, money } from "@/lib/utils";
function minutesSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000)).toLocaleString();
}
function discountFor(
  vehicleName: string,
  discounts: Map<string, string>,
): string | undefined {
  const name = vehicleName.toLowerCase();
  return [...discounts.entries()].find(
    ([discountName]) =>
      name === discountName ||
      name.endsWith(` ${discountName}`) ||
      name.includes(` ${discountName}`),
  )?.[1];
}
export async function WeeklyPage({
  week,
  archive,
  vehicles,
  archived = false,
}: {
  week: WeeklyUpdate | null;
  archive: WeeklyUpdate[];
  vehicles: Vehicle[];
  archived?: boolean;
}) {
  const discountMap = new Map(
    week?.data.vehicleDiscounts.map((discount) => [
      discount.name.toLowerCase(),
      discount.discount,
    ]) ?? [],
  );
  const discountedVehicles = vehicles
    .filter((vehicle) => discountFor(vehicle.name, discountMap))
    .slice(0, 6);
  const featuredVehicles = discountedVehicles.length
    ? discountedVehicles
    : vehicles.slice(0, 6);
  const vehicleForDiscount = (discountName: string) =>
    vehicles.find((vehicle) => {
      const vehicleName = vehicle.name.toLowerCase();
      const name = discountName.toLowerCase();
      return (
        vehicleName === name ||
        vehicleName.endsWith(` ${name}`) ||
        vehicleName.includes(` ${name}`)
      );
    });
  const sections = week
    ? ([
        [
          "Weekly challenge",
          week.data.weeklyChallenge ? [week.data.weeklyChallenge] : [],
        ],
        ["Free rewards", week.data.freeItems],
        ["Login rewards", week.data.loginRewards],
        ["New vehicles", week.data.newVehicles],
        [
          "Property discounts",
          week.data.propertyDiscounts.map((v) => `${v.name}: ${v.discount}`),
        ],
        ["Weapons & Gun Van", week.data.weapons],
        ["GTA+ benefits", week.data.gtaPlusBenefits],
        ["Featured activities", week.data.featuredModes],
        ["Important notes", week.data.importantNotes],
      ] as [string, string[]][])
    : [];
  return (
    <div className="container page-content">
      <Breadcrumbs
        items={[
          { name: "GTA Online", href: "/gta-online" },
          { name: "Weekly Update", href: "/gta-online/weekly-update" },
        ]}
      />
      <div className="page-heading">
        <p className="eyebrow">THE WEEKLY BRIEFING</p>
        <h1>
          {archived
            ? "An earlier week in Los Santos."
            : "GTA Online this week."}
        </h1>
        <p>
          Bonus GTA$ and RP, discounts, new content and limited-time rewards.
          All in one briefing.
        </p>
      </div>
      {week && (
        <div className="weekly-command-bar">
          <div className="weekly-command-status">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <p className="eyebrow">{archived ? "ARCHIVE FILE" : "LIVE FROM LOS SANTOS"}</p>
              <strong>{date(week.event_start)} – {date(new Date(new Date(week.event_end).getTime() - 1).toISOString())}</strong>
            </div>
          </div>
          <div className="weekly-command-facts">
            <span><CalendarDays size={17} /> {week.data.bonuses.length} active bonuses</span>
            <span><BadgePercent size={17} /> {week.data.vehicleDiscounts.length} vehicle deals</span>
            <span><Gift size={17} /> {week.data.freeItems.length} free rewards</span>
          </div>
        </div>
      )}
      {archived && (
        <div className="notice">
          Archived event. These offers are not presented as current.{" "}
          <Link className="text-link" href="/gta-online/weekly-update">
            View the current weekly update →
          </Link>
        </div>
      )}
      {week?.is_seed && (
        <div className="notice">
          Fictional development sample — these are not real GTA offers.
        </div>
      )}
      {week && week.verification_status !== "CONFIRMED" && (
        <div className="notice">
          <strong>REPORTED UPDATE: </strong>
          Current details are sourced from trusted GTA media and cross-checked,
          but are awaiting official confirmation.
        </div>
      )}
      {week && (
        <div className="notice">
          <strong>{archived ? "ARCHIVED" : "ACTIVE"}: </strong>
          {date(week.event_start)} –{" "}
          {date(new Date(new Date(week.event_end).getTime() - 1).toISOString())}
          <span className="muted" style={{ display: "block" }}>
            Last checked {minutesSince(week.last_checked_at)}{" "}
            minutes ago.
          </span>
        </div>
      )}
      <WeeklyPanel week={week} full />
      {week ? (
        <>
          <section className="weekly-deals-board">
            <div className="weekly-deals-heading">
              <div>
                <p className="eyebrow"><BadgePercent size={15} /> THIS WEEK’S DEALS</p>
                <h2>Upgrade your garage for less.</h2>
                <p>Every vehicle offer in one quick scan, with catalog images where specifications are verified.</p>
              </div>
              <div className="weekly-deals-total">
                <strong>{week.data.vehicleDiscounts.length}</strong>
                <span>vehicle offers</span>
              </div>
            </div>
            {featuredVehicles.filter((vehicle) => discountFor(vehicle.name, discountMap)).length > 0 && (
              <div className="weekly-deal-featured">
                {featuredVehicles
                  .filter((vehicle) => discountFor(vehicle.name, discountMap))
                  .map((vehicle) => (
                    <Link
                      className="weekly-deal-feature-card"
                      href={`/gta-online/vehicles/${vehicle.slug}`}
                      key={vehicle.id}
                    >
                      <div className="weekly-deal-feature-image">
                        {vehicle.image ? (
                          <MediaImage
                            src={vehicle.image}
                            alt={`${vehicle.name} GTA Online vehicle`}
                            sizes="(max-width: 760px) 100vw, 50vw"
                          />
                        ) : (
                          <CarFront size={42} aria-hidden="true" />
                        )}
                        <span className="discount-badge">{discountFor(vehicle.name, discountMap)}</span>
                      </div>
                      <div className="weekly-deal-feature-copy">
                        <p className="eyebrow">{vehicle.vehicle_class}</p>
                        <h3>{vehicle.name}</h3>
                        <span>{money(vehicle.price)} <ArrowUpRight size={15} aria-hidden="true" /></span>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
            <div className="weekly-deal-list" aria-label="Vehicle discounts">
              {week.data.vehicleDiscounts.map((discount, index) => {
                const vehicle = vehicleForDiscount(discount.name);
                const dealContent = (
                  <>
                    <span className="deal-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="deal-name">
                      <strong>{discount.name}</strong>
                      <small>{vehicle?.vehicle_class ?? "Vehicle offer"}</small>
                    </span>
                    <span className="deal-value">{discount.discount}</span>
                    <ArrowRight className="deal-arrow" size={18} aria-hidden="true" />
                  </>
                );
                return vehicle ? (
                  <Link className="weekly-deal-row" href={`/gta-online/vehicles/${vehicle.slug}`} key={`${discount.name}-${index}`}>
                    {dealContent}
                  </Link>
                ) : (
                  <div className="weekly-deal-row" key={`${discount.name}-${index}`}>
                    {dealContent}
                  </div>
                );
              })}
            </div>
            <Link className="weekly-deals-footer-link" href="/gta-online/vehicles">
              Compare all verified vehicle specifications <ArrowUpRight size={16} />
            </Link>
          </section>
          <div className="weekly-section-heading">
            <div>
              <p className="eyebrow"><Sparkles size={15} /> FIELD NOTES</p>
              <h2>Everything in the briefing.</h2>
            </div>
            <span className="muted">Checked {minutesSince(week.last_checked_at)} minutes ago</span>
          </div>
          <div className="detail-grid">
            {sections.map(([title, items]) => (
              <section className="panel detail-section" key={title}>
                <h2>{title}</h2>
                {items.length ? (
                  <ul>
                    {items.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    No verified information published for this event.
                  </p>
                )}
              </section>
            ))}
          </div>
          <div className="source-box panel">
            <p className="eyebrow">SOURCE & VERIFICATION</p>
            <a href={week.source_url} target="_blank" rel="noopener noreferrer">
              Read the original event announcement ↗
            </a>
            <p className="muted">Last updated: {date(week.last_checked_at)}</p>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 25 }}>
          <EmptyState
            title="Waiting for this week’s update."
            description="No active event has been published yet. Expired bonuses are automatically removed from the current briefing. You can explore previous events below."
          />
        </div>
      )}
      <section className="section-block">
        <SectionHeading title="Previous weekly updates" />
        <div className="resource-grid">
          {archive.length ? (
            archive.map((w) => (
              <Link
                className="resource-card"
                key={w.id}
                href={`/gta-online/weekly-update/${w.slug}`}
              >
                <span className="eyebrow">
                  {w.is_seed ? "SAMPLE ARCHIVE" : "ARCHIVE"}
                </span>
                <h3>{date(w.event_start)}</h3>
                <p>View the event briefing →</p>
              </Link>
            ))
          ) : (
            <p className="muted">
              The archive will grow as weekly updates are published.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
