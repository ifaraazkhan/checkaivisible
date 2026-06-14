// Network layer for the readiness audit: the main page (raw HTML, no JS) plus the
// three root files AI crawlers care about. Everything degrades gracefully — a
// missing robots/sitemap/llms is a finding, not a crash.

const TIMEOUT_MS = 10000;
const UA = "Mozilla/5.0 (compatible; checkaivisible-readiness/1.0; +https://checkaivisible.com)";

export type FetchedPage = {
  ok: boolean;
  status: number;
  finalUrl: string;
  scheme: string;
  redirected: boolean;
  html: string;
  bytes: number;
  ttfbMs: number;
  headers: Record<string, string>;
  error?: string;
};

export type RootFile = { exists: boolean; status: number; body: string };

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(t);
  }
}

export async function fetchPage(url: string): Promise<FetchedPage> {
  const t0 = Date.now();
  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
        redirect: "follow",
        signal,
      });
      const html = await res.text();
      const ttfbMs = Date.now() - t0;
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k] = v));
      const finalUrl = res.url || url;
      return {
        ok: res.ok,
        status: res.status,
        finalUrl,
        scheme: new URL(finalUrl).protocol.replace(":", ""),
        redirected: res.redirected,
        html,
        bytes: Buffer.byteLength(html),
        ttfbMs,
        headers,
      };
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      scheme: new URL(url).protocol.replace(":", ""),
      redirected: false,
      html: "",
      bytes: 0,
      ttfbMs: Date.now() - t0,
      headers: {},
      error: err instanceof Error ? err.message : "fetch_failed",
    };
  }
}

export async function fetchRootFile(origin: string, path: string): Promise<RootFile> {
  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(new URL(path, origin).toString(), {
        headers: { "User-Agent": UA },
        redirect: "follow",
        signal,
      });
      const body = res.ok ? await res.text() : "";
      return { exists: res.ok, status: res.status, body: body.slice(0, 100000) };
    });
  } catch {
    return { exists: false, status: 0, body: "" };
  }
}
