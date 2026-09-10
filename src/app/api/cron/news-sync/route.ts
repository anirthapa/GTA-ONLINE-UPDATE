import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runNewsSync } from "@/services/ingestion/pipeline";
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
    return NextResponse.json(result, {
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
