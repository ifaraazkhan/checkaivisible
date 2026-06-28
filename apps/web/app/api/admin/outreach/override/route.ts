import { type NextRequest, NextResponse } from "next/server";
import { callApi } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { brand?: string; overrideDomain?: string } | null;
  if (!body?.brand || !body.overrideDomain) {
    return NextResponse.json({ error: "brand and overrideDomain required" }, { status: 400 });
  }
  return callApi(`/internal/outreach/brand-domain`, {
    method: "POST",
    body: { brand: body.brand, overrideDomain: body.overrideDomain },
  });
}
