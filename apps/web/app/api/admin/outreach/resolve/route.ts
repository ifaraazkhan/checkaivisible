import { type NextRequest, NextResponse } from "next/server";
import { callApi } from "@/lib/admin-api";

export const runtime = "nodejs";
// Vercel Hobby caps function timeout at 60s. Resolver Pass 3 invokes an LLM
// which can run ~30-40s, so we set this to 55s to leave buffer.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { brand?: string; force?: boolean } | null;
  if (!body?.brand) return NextResponse.json({ error: "brand required" }, { status: 400 });
  const qs = new URLSearchParams({ brand: body.brand });
  if (body.force) qs.set("force", "1");
  return callApi(`/internal/outreach/resolve?${qs.toString()}`, { method: "POST", timeoutMs: 55_000 });
}
