import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { load } from "cheerio";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { slugify } from "../identity";
import {
  safeFetch,
  type FetchResult,
  type FetchPolicy,
} from "../sources/safe-fetch";
import type { Source } from "../types";
import { parseVehicleProfile } from "../vehicle-profile";
import { syncWeeklyVehicles } from "./weekly-vehicles";

export interface CatalogVehicle {
  slug: string;
  name: string;
  vehicle_class: string;
  price: number | null;
  top_speed: number | null;
  retailer: string | null;
  seats: number | null;
  image: string | null;
  description: string;
  source_url: string;
  verified_at: string;
  is_seed: false;
  features: string[];
  added_at: string | null;
  confidence_score: number;
}

export interface CatalogSyncResult {
  status: "SUCCESS" | "PARTIAL" | "SKIPPED";
  runId: string | null;
  processed: number;
  skipped: number;
  failed: number;
  sources: number;
  reason?: string;
}

export interface CatalogSyncDependencies {
  db?: SupabaseClient;
  fetch?: (url: string, policy: FetchPolicy) => Promise<FetchResult>;
  now?: () => Date;
}

export async function testVehicleSource(
  sourceId: string,
): Promise<{
  ok: true;
  count: number;
  rejected: number;
  items: Array<{ title: string; url: string }>;
}> {
  z.uuid().parse(sourceId);
  const { data, error } = await getDb()
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .single();
  if (error || !data || !isVehicleSource(data as Source))
    throw new Error("Vehicle source was not found.");
  const response = await safeFetch(data.url, {
    allowedHosts: data.allowed_hosts,
    contentTypes: ["text/html", "application/xhtml+xml"],
  });
  const vehicles = parseVehicleCatalog(response.body, response.url);
  return {
    ok: true,
    count: vehicles.length,
    rejected: 0,
    items: vehicles.map((vehicle) => ({
      title: vehicle.name,
      url: vehicle.source_url,
    })),
  };
}

function assertResult(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function parsePrice(value: string): number | null {
  const match = value.replace(/,/g, "").match(/\$\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parseDate(value: string): string | null {
  const trimmed = value.trim();
  // Catalog tables contain calendar dates without a time zone. Treat those as
  // UTC dates so the stored day does not shift with the server's locale.
  const timestamp = /\d{4}$/.test(trimmed)
    ? Date.parse(`${trimmed} 00:00:00 UTC`)
    : Date.parse(trimmed);
  return Number.isFinite(timestamp) && timestamp <= Date.now() + 5 * 60_000
    ? new Date(timestamp).toISOString()
    : null;
}

function imageCandidate(value: unknown, pageUrl: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const image = new URL(value.trim(), pageUrl);
    const page = new URL(pageUrl);
    if (
      image.protocol !== "https:" ||
      image.hostname !== page.hostname ||
      image.username ||
      image.password ||
      image.port
    )
      return null;
    if (
      !image.pathname.includes("/vehicles/") &&
      !image.pathname.includes("/igallery/gta5-database/") &&
      !image.pathname.includes("/images/jch-optimize/ng/images_gta-5_vehicles_")
    )
      return null;
    image.hash = "";
    return image.toString();
  } catch {
    return null;
  }
}

function structuredImage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = structuredImage(item);
      if (image) return image;
    }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return structuredImage(record.url) || structuredImage(record.image);
  }
  return null;
}

/** Extracts the source-hosted vehicle artwork without downloading or rehosting it. */
export function parseVehicleImage(
  html: string,
  profileUrl: string,
): string | null {
  const $ = load(html);
  const candidates: unknown[] = [];
  $('link[rel="preload"][as="image"]').each((_, element) => {
    candidates.push($(element).attr("href"));
  });
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const value = JSON.parse($(element).text());
      candidates.push(
        structuredImage(
          value && typeof value === "object"
            ? (value as Record<string, unknown>).image
            : value,
        ),
      );
    } catch {
      // Ignore malformed structured data and keep the social metadata fallback.
    }
  });
  candidates.push(
    $('meta[property="og:image"]').first().attr("content"),
    $('meta[name="twitter:image"]').first().attr("content"),
  );
  for (const candidate of candidates) {
    const image = imageCandidate(candidate, profileUrl);
    if (image) return image;
  }
  return null;
}

/**
 * Parses the public “recently added” table without copying full profile pages.
 * Missing extended stats stay null and can be filled by an editor later.
 */
export function parseVehicleCatalog(
  html: string,
  sourceUrl: string,
  verifiedAt = new Date().toISOString(),
): CatalogVehicle[] {
  const $ = load(html);
  const table = $("table")
    .filter((_, element) => {
      const headers = $(element)
        .find("thead th")
        .map((__, cell) => $(cell).text().trim().toLowerCase())
        .get();
      return (
        headers.includes("vehicle") &&
        headers.some((header) => header.includes("class")) &&
        headers.some((header) => header.includes("date"))
      );
    })
    .first();
  if (!table.length) throw new Error("Vehicle catalog table was not found.");
  const headers = table
    .find("thead th")
    .map((_, cell) => $(cell).text().trim().toLowerCase())
    .get();
  const indexOf = (term: string) =>
    headers.findIndex((header) => header.includes(term));
  const vehicleIndex = indexOf("vehicle"),
    classIndex = indexOf("class"),
    priceIndex = indexOf("price"),
    dateIndex = indexOf("date");
  const result: CatalogVehicle[] = [];
  for (const row of table.find("tbody tr").toArray().slice(0, 100)) {
    const cells = $(row).find("td");
    const name = $(cells[vehicleIndex]).text().replace(/\s+/g, " ").trim();
    const vehicleClass = $(cells[classIndex])
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const href = $(cells[vehicleIndex]).find("a").first().attr("href");
    if (!name || !vehicleClass || !href) continue;
    let profileUrl: string;
    try {
      const parsed = new URL(href, sourceUrl);
      if (
        parsed.protocol !== "https:" ||
        parsed.hostname !== new URL(sourceUrl).hostname
      )
        continue;
      parsed.hash = "";
      profileUrl = parsed.toString();
    } catch {
      continue;
    }
    const slug = slugify(name);
    result.push({
      slug,
      name,
      vehicle_class: vehicleClass,
      price: priceIndex >= 0 ? parsePrice($(cells[priceIndex]).text()) : null,
      top_speed: null,
      retailer: null,
      seats: null,
      image: null,
      description: `${name} is listed in the ${vehicleClass} class in the GTA Online vehicle catalog.`,
      source_url: profileUrl,
      verified_at: verifiedAt,
      is_seed: false,
      features: [],
      added_at: dateIndex >= 0 ? parseDate($(cells[dateIndex]).text()) : null,
      confidence_score: 75,
    });
  }
  return [
    ...new Map(result.map((vehicle) => [vehicle.slug, vehicle])).values(),
  ];
}

function isVehicleSource(source: Source) {
  return source.category.trim().toUpperCase() === "VEHICLES";
}

export async function runVehicleSync(
  { sourceId }: { sourceId?: string } = {},
  deps: CatalogSyncDependencies = {},
): Promise<CatalogSyncResult> {
  if (sourceId) z.uuid().parse(sourceId);
  const db = deps.db || getDb();
  const now = deps.now || (() => new Date());
  const owner = randomUUID();
  const result: CatalogSyncResult = {
    status: "SKIPPED",
    runId: null,
    processed: 0,
    skipped: 0,
    failed: 0,
    sources: 0,
  };
  const rpc = async (name: string, args: Record<string, unknown> = {}) => {
    const response = await db.rpc(name, args);
    assertResult(response.error);
    return response.data;
  };
  const renew = async () => {
    if (
      !(await rpc("renew_ingestion_lease", {
        p_key: "catalog-sync",
        p_owner: owner,
        p_ttl_seconds: 120,
      }))
    )
      throw new Error("Catalog lease lost.");
  };
  if (
    !(await rpc("acquire_ingestion_lease", {
      p_key: "catalog-sync",
      p_owner: owner,
      p_ttl_seconds: 120,
    }))
  )
    return {
      ...result,
      reason: "Another catalog worker holds the durable lease.",
    };
  try {
    const key = `catalog:${Math.floor(now().getTime() / 300_000)}`;
    const run = await db
      .from("automation_runs")
      .insert({ idempotency_key: key, owner })
      .select("id")
      .single();
    if (run.error?.code === "23505")
      return { ...result, reason: "This catalog interval has already run." };
    assertResult(run.error);
    result.runId = run.data!.id;
    let request = db
      .from("sources")
      .select("*")
      .eq("enabled", true)
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(100);
    if (sourceId) request = request.eq("id", sourceId);
    const sources = await request;
    assertResult(sources.error);
    if (sourceId && !sources.data?.length)
      throw new Error("Requested vehicle source is missing or disabled.");
    const vehicleSources =
      (sources.data as Source[] | null | undefined)?.filter(isVehicleSource) ??
      [];
    if (!vehicleSources.length) {
      result.status = "SUCCESS";
      result.reason = "No enabled vehicle catalog source is configured.";
      const finished = await db
        .from("automation_runs")
        .update({
          status: result.status,
          finished_at: now().toISOString(),
          summary: result,
        })
        .eq("id", result.runId)
        .eq("owner", owner);
      assertResult(finished.error);
      return result;
    }
    result.status = "SUCCESS";
    for (const source of vehicleSources) {
      if (
        !sourceId &&
        source.last_checked_at &&
        Date.parse(source.last_checked_at) + source.fetch_frequency * 60_000 >
          now().getTime()
      )
        continue;
      result.sources++;
      try {
        await renew();
        const fetched = await (deps.fetch || safeFetch)(source.url, {
          allowedHosts: source.allowed_hosts,
          contentTypes: ["text/html", "application/xhtml+xml"],
        });
        const parsedVehicles = parseVehicleCatalog(
          fetched.body,
          fetched.url,
          now().toISOString(),
        );
        const imageBySourceUrl = new Map<string, string>();
        const profiles = new Map<
          string,
          ReturnType<typeof parseVehicleProfile>
        >();
        const profileFetch = deps.fetch || safeFetch;
        // Keep profile requests bounded so a catalog refresh remains source-friendly.
        for (let start = 0; start < parsedVehicles.length; start += 4) {
          await renew();
          const batch = parsedVehicles.slice(start, start + 4);
          const profileResults = await Promise.all(
            batch.map(async (vehicle) => {
              try {
                const profile = await profileFetch(vehicle.source_url, {
                  allowedHosts: source.allowed_hosts,
                  contentTypes: ["text/html", "application/xhtml+xml"],
                });
                try {
                  profiles.set(
                    vehicle.source_url,
                    parseVehicleProfile(profile.body, profile.url),
                  );
                } catch {
                  /* Retain existing full specs if a source changes its markup. */
                }
                return [
                  vehicle.source_url,
                  parseVehicleImage(profile.body, profile.url),
                ] as const;
              } catch {
                return [vehicle.source_url, null] as const;
              }
            }),
          );
          for (const [url, image] of profileResults)
            if (image) imageBySourceUrl.set(url, image);
        }
        const vehicles = parsedVehicles.map((vehicle) => ({
          ...vehicle,
          image: imageBySourceUrl.get(vehicle.source_url) ?? null,
          ...profiles.get(vehicle.source_url),
          slug: vehicle.slug,
        }));
        if (!vehicles.length)
          throw new Error("Vehicle catalog contained no usable rows.");
        for (const vehicle of vehicles) {
          await renew();
          const existing = await db
            .from("vehicles")
            .select("id,is_seed,source_url,image")
            .eq("slug", vehicle.slug)
            .maybeSingle();
          assertResult(existing.error);
          if (existing.data?.is_seed) {
            result.skipped++;
            continue;
          }
          // A partial list refresh must never replace a complete profile with nulls.
          const payload =
            existing.data && !profiles.has(vehicle.source_url)
              ? Object.fromEntries(
                  Object.entries(vehicle).filter(
                    ([key, value]) =>
                      value !== null &&
                      !["description", "features"].includes(key),
                  ),
                )
              : vehicle;
          const write = existing.data
            ? await db
                .from("vehicles")
                .update(payload)
                .eq("id", existing.data.id)
            : await db.from("vehicles").insert(payload);
          assertResult(write.error);
          result.processed++;
        }
        const sourceUpdate = await db
          .from("sources")
          .update({
            last_checked_at: now().toISOString(),
            last_successful_fetch_at: now().toISOString(),
            failure_count: 0,
          })
          .eq("id", source.id);
        assertResult(sourceUpdate.error);
      } catch {
        result.failed++;
        result.status = "PARTIAL";
        const sourceUpdate = await db
          .from("sources")
          .update({
            last_checked_at: now().toISOString(),
            failure_count: source.failure_count + 1,
          })
          .eq("id", source.id);
        assertResult(sourceUpdate.error);
      }
    }
    try {
      const weekly = await syncWeeklyVehicles(
        db,
        deps.fetch || safeFetch,
        renew,
      );
      result.processed += weekly.processed;
      if (weekly.unresolved) {
        result.failed += weekly.unresolved;
        result.status = "PARTIAL";
      }
    } catch {
      result.failed++;
      result.status = "PARTIAL";
    }
    await renew();
    const finished = await db
      .from("automation_runs")
      .update({
        status: result.status,
        finished_at: now().toISOString(),
        processed_count: result.processed,
        skipped_count: result.skipped,
        failed_count: result.failed,
        summary: result,
      })
      .eq("id", result.runId)
      .eq("owner", owner);
    assertResult(finished.error);
    return result;
  } catch (error) {
    if (result.runId)
      await db
        .from("automation_runs")
        .update({
          status: "FAILED",
          finished_at: now().toISOString(),
          failed_count: result.failed + 1,
          summary: {
            ...result,
            error:
              error instanceof Error
                ? error.message.slice(0, 600)
                : "Catalog sync failed",
          },
        })
        .eq("id", result.runId)
        .eq("owner", owner);
    throw error;
  } finally {
    await rpc("release_ingestion_lease", {
      p_key: "catalog-sync",
      p_owner: owner,
    });
  }
}
