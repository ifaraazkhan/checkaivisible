import { type NextRequest } from "next/server";
import { callApi } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const limit = url.searchParams.get("limit") ?? "100";
  return callApi(`/internal/outreach/events?status=${encodeURIComponent(status)}&limit=${encodeURIComponent(limit)}`);
}
