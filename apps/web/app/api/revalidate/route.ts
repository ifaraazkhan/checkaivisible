import { revalidateTag, revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// Webhook called by the API worker after a successful ledger refresh so the
// Vercel Data Cache + edge can serve fresh data within seconds instead of
// waiting for the safety-net revalidate window. Secret-protected (compare-time
// constant via short-circuit equality on a 32+ char string is fine for our risk
// profile — this isn't crypto-sensitive material).
//
// Body: { secret: string, tags?: string[], paths?: string[] }

export const runtime = "nodejs";

const SECRET = process.env.REVALIDATE_SECRET;

export async function POST(req: Request) {
  if (!SECRET) {
    return NextResponse.json({ ok: false, error: "secret_not_configured" }, { status: 500 });
  }

  let body: { secret?: string; tags?: string[]; paths?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.secret !== SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const tags = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === "string" && t.length > 0) : [];
  const paths = Array.isArray(body.paths) ? body.paths.filter((p) => typeof p === "string" && p.startsWith("/")) : [];

  for (const tag of tags) revalidateTag(tag);
  for (const path of paths) revalidatePath(path);

  return NextResponse.json({ ok: true, revalidated: { tags, paths } });
}
