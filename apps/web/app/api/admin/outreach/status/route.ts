import { type NextRequest, NextResponse } from "next/server";
import { callApi } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { id?: string; status?: string } | null;
  if (!body?.id || !body.status) return NextResponse.json({ error: "id and status required" }, { status: 400 });
  return callApi(`/internal/outreach/events/${encodeURIComponent(body.id)}/status`, {
    method: "POST",
    body: { status: body.status },
  });
}
