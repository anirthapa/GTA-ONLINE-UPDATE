import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseVehicleProfile, profileLinks } from "../vehicle-profile";
import { safeFetch } from "../sources/safe-fetch";

/** Resolve only exact source links. Never guess a model from a similar name. */
export async function syncWeeklyVehicles(
  db: SupabaseClient,
  fetcher = safeFetch,
  renew = async () => {},
) {
  const { data: weeks, error } = await db
    .from("weekly_updates")
    .select("id,source_url")
    .eq("is_seed", false)
    .in("status", ["PUBLISHED", "REVIEW"])
    .gt("event_end", new Date().toISOString())
    .limit(4);
  if (error) throw new Error(error.message);
  let processed = 0,
    unresolved = 0;
  const policy = {
    allowedHosts: ["www.gtabase.com"],
    contentTypes: ["text/html", "application/xhtml+xml"],
    timeoutMs: 10000,
    retries: 0,
  };
  for (const week of weeks || []) {
    const pending = await db
      .from("weekly_vehicle_offers")
      .select("name")
      .eq("weekly_update_id", week.id)
      .is("vehicle_id", null)
      .limit(40);
    if (pending.error) throw new Error(pending.error.message);
    if (!pending.data?.length) continue;
    // Use the event's own source, not today's page for an older event.
    const url = new URL(week.source_url);
    if (url.hostname !== "www.gtabase.com" || url.protocol !== "https:") {
      unresolved += pending.data.length;
      continue;
    }
    await renew();
    const page = await fetcher(url.href, policy);
    const links = profileLinks(
      page.body,
      page.url,
      pending.data.map((o) => o.name),
    );
    unresolved += pending.data.length - links.length;
    for (const link of links) {
      await renew();
      const existing = await db
        .from("vehicles")
        .select("id,is_seed")
        .eq("source_url", link.url)
        .maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      if (existing.data?.is_seed) {
        unresolved++;
        continue;
      }
      let id = existing.data?.id;
      if (!id) {
        const page = await fetcher(link.url, policy);
        const profile = parseVehicleProfile(page.body, page.url);
        const write = await db
          .from("vehicles")
          .upsert(profile, { onConflict: "slug" })
          .select("id")
          .single();
        if (write.error) throw new Error(write.error.message);
        id = write.data.id;
      }
      const alias = await db
        .from("vehicle_aliases")
        .upsert({
          alias: link.alias.trim().toLowerCase(),
          vehicle_id: id,
          source_url: link.url,
          verified_at: new Date().toISOString(),
        });
      if (alias.error) throw new Error(alias.error.message);
      processed++;
    }
  }
  return { processed, unresolved };
}
