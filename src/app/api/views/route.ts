import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { requestIdentifier, rateLimit } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !==
      (process.env.NODE_ENV === "development"
        ? request.nextUrl.origin
        : new URL(siteUrl).origin)
  )
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!isDatabaseConfigured())
    return NextResponse.json(
      { error: "Analytics not configured" },
      { status: 503 },
    );
  if (Number(request.headers.get("content-length") || 0) > 1024)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  try {
    if (!(await rateLimit(request, "views", 60, 60)))
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1024) { await reader.cancel(); return NextResponse.json({ error: 'Request too large' }, { status: 413 }); }
        chunks.push(value);
      }
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    const parsed = z
      .object({ id: z.uuid() })
      .strict()
      .safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid article" }, { status: 400 });
    const { error } = await getDb().rpc("increment_article_view", {
      p_article_id: parsed.data.id,
      p_reader_key: requestIdentifier(request),
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to record view" },
      { status: 503 },
    );
  }
}
