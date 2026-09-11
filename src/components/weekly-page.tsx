import Link from "next/link";
import {
  ArrowUpRight,
  BadgePercent,
  CalendarDays,
  Gift,
  ShieldCheck,
  Trophy,
  Zap,
  CarFront,
  Crosshair,
  Crown,
  NotebookPen,
} from "lucide-react";
import type { VehicleOffer, WeeklyUpdate } from "@/services/types";
import { Breadcrumbs, EmptyState, SectionHeading } from "./editorial";
import { MediaImage } from "./media-image";
import { VehicleCard } from "./vehicle-card";
import { date } from "@/lib/utils";

export function WeeklyPage({
  week,
  archive,
  offers,
  archived = false,
}: {
  week: WeeklyUpdate | null;
  archive: WeeklyUpdate[];
  offers: VehicleOffer[];
  archived?: boolean;
}) {
  const end = week
    ? date(new Date(Date.parse(week.event_end) - 1).toISOString())
    : "";
  const featured = [...offers]
    .filter((o) => o.vehicle?.image)
    .sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0))[0];
  const groups = week
    ? [
        {
          id: "rewards",
          title: "Free rewards",
          icon: Gift,
          items: week.data.freeItems,
        },
        {
          id: "new-vehicles",
          title: "New arrivals",
          icon: CarFront,
          items: week.data.newVehicles,
        },
        {
          id: "property",
          title: "Property offers",
          icon: BadgePercent,
          items: week.data.propertyDiscounts.map(
            (v) => `${v.name}: ${v.discount}`,
          ),
        },
        {
          id: "gun-van",
          title: "Weapons & Gun Van",
          icon: Crosshair,
          items: week.data.weapons,
        },
        {
          id: "gta-plus",
          title: "GTA+ benefits",
          icon: Crown,
          items: week.data.gtaPlusBenefits,
        },
        {
          id: "login",
          title: "Login rewards",
          icon: Gift,
          items: week.data.loginRewards,
        },
        {
          id: "activities",
          title: "Featured activities",
          icon: Zap,
          items: week.data.featuredModes,
        },
      ]
    : [];
  return (
    <div className="container page-content weekly-edition">
      <Breadcrumbs
        items={[
          { name: "GTA Online", href: "/gta-online" },
          { name: "Weekly update", href: "/gta-online/weekly-update" },
        ]}
      />
      <header className="edition-title">
        <div>
          <p className="eyebrow">LOS SANTOS WIRE / THE WEEKLY EDITION</p>
          <h1>{archived ? "From the archives." : "Your week. Upgraded."}</h1>
          <p>Where to earn more, what to claim, and which rides are on sale.</p>
        </div>
        {week && (
          <span className="edition-date">
            <CalendarDays size={19} />
            {date(week.event_start)} — {end}
          </span>
        )}
      </header>
      {!week ? (
        <EmptyState
          title="The next briefing is on its way."
          description="The current event will appear here when sourced details are available. Browse earlier editions below."
        />
      ) : (
        <>
          {archived && (
            <div className="notice">
              This event has ended.{" "}
              <Link className="text-link" href="/gta-online/weekly-update">
                Go to this week’s update →
              </Link>
            </div>
          )}
          {week.is_seed && (
            <div className="notice">
              Fictional development sample. These are not real offers.
            </div>
          )}
          <div className="edition-lead">
            <div className="edition-lead-copy">
              <span className="edition-pill">
                <Zap size={15} />
                {archived ? "PAST EVENT" : "THIS WEEK IN GTA ONLINE"}
              </span>
              <h2>
                Make every
                <br />
                session count<span>.</span>
              </h2>
              <p>
                {week.data.bonuses.length} bonus activities.{" "}
                {offers.length || week.data.vehicleDiscounts.length} vehicle
                offers. Your entire week, in one briefing.
              </p>
              <div className="hero-actions">
                <a className="button" href="#vehicle-deals">
                  Explore vehicle deals <ArrowUpRight size={17} />
                </a>
                <a className="text-link" href="#bonuses">
                  See all bonuses
                </a>
              </div>
            </div>
            {featured?.vehicle && (
              <Link
                className="edition-lead-image"
                href={`/gta-online/vehicles/${featured.vehicle.slug}`}
              >
                <MediaImage
                  src={featured.vehicle.image}
                  alt={featured.vehicle.name}
                  priority
                  sizes="(max-width:760px) 100vw, 55vw"
                />
                <span className="lead-offer">
                  {featured.discount_percent}%
                  <small>
                    {archived ? "PAST EVENT OFFER" : "OFF THIS WEEK"}
                  </small>
                </span>
                <div className="lead-caption">
                  <span>
                    <small>FEATURED VEHICLE OFFER</small>
                    <strong>{featured.vehicle.name}</strong>
                  </span>
                  <ArrowUpRight size={26} />
                </div>
              </Link>
            )}
          </div>
          <div className="edition-provenance">
            <ShieldCheck size={17} />
            <span>
              <strong>
                {week.verification_status === "CONFIRMED"
                  ? "Officially confirmed"
                  : "Reported update"}
              </strong>{" "}
              ·{" "}
              {week.verification_status === "CONFIRMED"
                ? "Based on the official event announcement."
                : "Sourced from GTA media; awaiting official confirmation."}
            </span>
            <a href="#sources">View sources ↗</a>
          </div>
          <nav className="edition-jump" aria-label="Weekly sections">
            <a href="#bonuses">
              <Zap size={16} /> Bonuses
            </a>
            <a href="#vehicle-deals">
              <CarFront size={17} /> Vehicles{" "}
              <span>{offers.length || week.data.vehicleDiscounts.length}</span>
            </a>
            <a href="#rewards">
              <Gift size={17} /> Rewards
            </a>
            <a href="#gun-van">
              <Crosshair size={17} /> Gun Van
            </a>
            <a href="#field-notes">
              <NotebookPen size={17} /> Field notes
            </a>
          </nav>
          <section className="edition-section" id="bonuses">
            <SectionHeading
              kicker="MAKE IT PAY"
              title="More for every mission."
            />
            <div className="earn-grid">
              {week.data.bonuses.map((b, i) => (
                <article
                  className={`earn-card ${i === 0 ? "earn-highlight" : ""}`}
                  key={b.activity}
                >
                  <span className="earn-number">
                    {b.moneyMultiplier ?? b.rpMultiplier ?? "—"}
                    <small>×</small>
                  </span>
                  <span className="eyebrow">
                    {b.moneyMultiplier && b.moneyMultiplier === b.rpMultiplier
                      ? "GTA$ + RP"
                      : b.moneyMultiplier
                        ? "GTA$"
                        : "RP"}
                  </span>
                  <h3>{b.activity}</h3>
                  {b.rpMultiplier &&
                  b.moneyMultiplier &&
                  b.rpMultiplier !== b.moneyMultiplier ? (
                    <p>{b.rpMultiplier}× RP</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
          {week.data.weeklyChallenge && (
            <section className="challenge-banner">
              <span className="challenge-icon">
                <Trophy size={32} />
              </span>
              <div>
                <p className="eyebrow">YOUR WEEKLY CHALLENGE</p>
                <h2>A little hustle. A bigger payday.</h2>
                <p>{week.data.weeklyChallenge}</p>
              </div>
              <a href="#rewards" className="text-link">
                See rewards <ArrowUpRight size={19} />
              </a>
            </section>
          )}
          <section className="edition-section" id="vehicle-deals">
            <SectionHeading
              kicker={archived ? "PAST VEHICLE OFFERS" : "THIS WEEK’S GARAGE"}
              title="Your next ride is on sale."
              href="/gta-online/vehicles"
              action="Explore the garage"
            />
            <p className="section-intro">
              {archived
                ? "Prices shown were available during this event."
                : "Browse every discounted vehicle. Open a card for performance, purchase options, and the full specifications."}
            </p>
            <div className="ride-grid">
              {offers.map((offer) =>
                offer.vehicle ? (
                  <VehicleCard
                    key={offer.name}
                    vehicle={offer.vehicle}
                    offer={offer}
                    archived={archived}
                  />
                ) : (
                  <article className="pending-offer" key={offer.name}>
                    <CarFront size={32} />
                    <h3>{offer.name}</h3>
                    <strong>{offer.discount_text}</strong>
                    <p>Vehicle profile being sourced.</p>
                  </article>
                ),
              )}
            </div>
            {!offers.length && (
              <div className="reward-list">
                {week.data.vehicleDiscounts.map((v) => (
                  <div key={v.name}>
                    <strong>{v.name}</strong>
                    <span>{v.discount}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="edition-section" id="field-notes">
            <SectionHeading
              kicker="BEYOND THE GARAGE"
              title="The rest of your week."
            />
            <div className="briefing-grid">
              {groups.map(({ id, title, icon: Icon, items }) => (
                <section
                  id={id}
                  className={`briefing-card ${!items.length ? "briefing-quiet" : ""}`}
                  key={id}
                >
                  <div className="briefing-card-heading">
                    <span>
                      <Icon size={21} />
                    </span>
                    <h3>{title}</h3>
                    {items.length > 0 && <small>{items.length}</small>}
                  </div>
                  {items.length ? (
                    <ul>
                      {items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No rewards announced for this event.</p>
                  )}
                </section>
              ))}
            </div>
          </section>
          {week.data.importantNotes.length > 0 && (
            <details className="edition-notes" open>
              <summary>
                Event notes & time trials{" "}
                <span>{week.data.importantNotes.length} updates</span>
              </summary>
              <ul>
                {week.data.importantNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </details>
          )}
          <section className="edition-source" id="sources">
            <ShieldCheck size={27} />
            <div>
              <p className="eyebrow">SOURCE & VERIFICATION</p>
              <h3>The details behind the briefing.</h3>
              <p>
                Last checked {date(week.last_checked_at)}. Vehicle images and
                specifications are attributed on each vehicle page.
              </p>
            </div>
            <a
              className="button secondary"
              href={week.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read event coverage <ArrowUpRight size={16} />
            </a>
          </section>
        </>
      )}
      {archive.length > 0 && (
        <section className="edition-section">
          <SectionHeading title="Previous editions" />
          <div className="resource-grid">
            {archive.map((w) => (
              <Link
                className="resource-card"
                key={w.id}
                href={`/gta-online/weekly-update/${w.slug}`}
              >
                <p className="eyebrow">ARCHIVED EDITION</p>
                <h3>{date(w.event_start)}</h3>
                <span className="text-link">
                  Read the briefing <ArrowUpRight size={17} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
