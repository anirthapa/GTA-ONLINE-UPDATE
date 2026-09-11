"use client";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { VehicleCard } from "./vehicle-card";
import type { Vehicle, VehicleOffer } from "@/services/types";

export function VehicleBrowser({
  vehicles,
  offers,
  initial = {},
}: {
  vehicles: Vehicle[];
  offers: VehicleOffer[];
  initial?: Record<string, string | undefined>;
}) {
  const [query, setQuery] = useState(initial.q || "");
  const [category, setCategory] = useState(initial.class || "");
  const [deals, setDeals] = useState(Boolean(initial.discount));
  const [sort, setSort] = useState(initial.sort || "alphabetical");
  const [max, setMax] = useState(initial.max || "");
  const offerMap = new Map(offers.map((offer) => [offer.vehicle_id, offer]));
  const price = (v: Vehicle) => offerMap.get(v.id)?.sale_price ?? v.price;
  const classes = [
    ...new Set(
      vehicles.flatMap((v) => v.vehicle_class.split(",").map((c) => c.trim())),
    ),
  ].sort();
  const visible = vehicles
    .filter(
      (v) =>
        v.name.toLowerCase().includes(query.trim().toLowerCase()) &&
        (!category ||
          v.vehicle_class
            .split(",")
            .map((c) => c.trim())
            .includes(category)) &&
        (!deals || offerMap.has(v.id)) &&
        (!max || (price(v) !== null && price(v)! <= Number(max))),
    )
    .sort((a, b) =>
      sort === "price"
        ? (price(a) ?? Infinity) - (price(b) ?? Infinity)
        : sort === "speed"
          ? (b.top_speed ?? -1) - (a.top_speed ?? -1)
          : sort === "newest"
            ? Date.parse(b.added_at || "1970") -
              Date.parse(a.added_at || "1970")
            : a.name.localeCompare(b.name),
    );
  function reset() {
    setQuery("");
    setCategory("");
    setDeals(false);
    setSort("alphabetical");
    setMax("");
  }
  return (
    <>
      <div className="garage-toolbar">
        <label className="garage-search">
          <Search size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search vehicles"
            placeholder="Find your next ride…"
            maxLength={100}
          />
        </label>
        <label>
          Class
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Budget (GTA$)
          <input
            type="number"
            min="0"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Any budget"
          />
        </label>
        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="alphabetical">Name: A–Z</option>
            <option value="price">Price: low to high</option>
            <option value="speed">Fastest first</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
      </div>
      <div className="garage-results-bar">
        <p role="status">
          <SlidersHorizontal size={16} /> {visible.length}{" "}
          {visible.length === 1 ? "vehicle" : "vehicles"}
        </p>
        <label className="deals-toggle">
          <input
            type="checkbox"
            checked={deals}
            onChange={(e) => setDeals(e.target.checked)}
          />{" "}
          This week’s deals
        </label>
        {(query || category || deals || max) && (
          <button onClick={reset} className="reset-filters">
            <X size={15} /> Reset filters
          </button>
        )}
      </div>
      {visible.length ? (
        <div className="ride-grid">
          {visible.map((v) => (
            <VehicleCard key={v.id} vehicle={v} offer={offerMap.get(v.id)} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={28} />
          <h2>No matching rides</h2>
          <p>Try a different name, class, or budget.</p>
          <button className="button" onClick={reset}>
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
