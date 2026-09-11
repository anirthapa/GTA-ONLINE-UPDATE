import Link from "next/link";
import type { WeeklyUpdate } from "@/services/types";
import {
  Breadcrumbs,
  EmptyState,
  WeeklyPanel,
  SectionHeading,
} from "@/components/editorial";
import { date } from "@/lib/utils";
function minutesSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000)).toLocaleString();
}
export async function WeeklyPage({
  week,
  archive,
  archived = false,
}: {
  week: WeeklyUpdate | null;
  archive: WeeklyUpdate[];
  archived?: boolean;
}) {
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
          "Vehicle discounts",
          week.data.vehicleDiscounts.map((v) => `${v.name}: ${v.discount}`),
        ],
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
