import { NextResponse } from "next/server";

// Server-side proxy: holds ADMIN_KEY (server-only env, never sent to browser)
// and forwards calls to the Railway API. The admin middleware already gates
// /api/admin/* with Basic Auth.
//
// ADMIN_KEY rotation: this var lives on BOTH Vercel (here) and Railway
// (apps/api). Rotate both at the same time or admin actions break.

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
const ADMIN_KEY = process.env.ADMIN_KEY;

export async function callApi(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; timeoutMs?: number } = {},
): Promise<NextResponse> {
  if (!ADMIN_KEY) {
    return NextResponse.json({ error: "ADMIN_KEY not configured on web" }, { status: 503 });
  }
  const method = init.method ?? "GET";
  const timeoutMs = init.timeoutMs ?? 15_000;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "x-admin-key": ADMIN_KEY,
        ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("aborted") || message.includes("timeout") ? 504 : 502;
    return NextResponse.json({ error: "upstream_failed", message }, { status });
  }
}
