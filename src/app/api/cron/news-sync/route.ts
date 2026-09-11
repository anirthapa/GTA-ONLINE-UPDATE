import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runNewsSync } from "@/services/ingestion/pipeline";
import { runVehicleSync } from "@/services/ingestion/catalog";
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  if (!secret || secret.length < 32)
    return NextResponse.json(
      { error: "Cron is not configured" },
      { status: 503 },
    );
  const actual = Buffer.from(auth),
    expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runNewsSync();
    // Keep the existing news endpoint as the single scheduler target while
    // giving catalog sources their own lease, idempotency, and metrics.
    const vehicleSync = result.status === "SUCCESS" || result.status === "PARTIAL"
      ? await runVehicleSync()
      : undefined;
    const status = vehicleSync?.status === "PARTIAL" && result.status === "SUCCESS" ? "PARTIAL" : result.status;
    return NextResponse.json({ ...result, status, ...(vehicleSync ? { vehicleSync } : {}) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(
      "News sync failed",
      error instanceof Error ? error.message : "Unknown failure",
    );
    return NextResponse.json(
      { error: "Sync failed. Inspect automation logs." },
      { status: 500 },
    );
  }
}
