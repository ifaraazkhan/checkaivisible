// Shared resilience wrapper for LLM calls: hard timeout + retry with exponential
// backoff (honoring server-provided Retry-After / Gemini retryDelay) + a per-engine
// minimum gap so we never burst into a rate limit. The discovery pipeline runs in the
// background, so trading latency for reliability here is exactly what we want.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Track the last call start per engine to enforce a minimum spacing (throttle).
const lastStart = new Map<string, number>();

export type ResilienceOpts = {
  timeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  minGapMs?: number;
};

function statusOf(err: unknown): number | undefined {
  const e = err as { status?: unknown; code?: unknown };
  if (typeof e?.status === "number") return e.status;
  if (typeof e?.code === "number") return e.code;
  return undefined;
}

function isNetworkError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  const code = e?.code;
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "EAI_AGAIN")
    return true;
  return /fetch failed|network|socket hang up|terminated/i.test(e?.message ?? "");
}

// Pull an explicit retry delay (ms) from the error when the server tells us how long
// to wait. Gemini embeds `"retryDelay":"40s"` / "retry in 40.2s" in the message;
// OpenAI/Perplexity send a `retry-after` header (seconds).
function serverRetryMs(err: unknown): number | undefined {
  const e = err as { message?: string; headers?: unknown };
  const msg = String(e?.message ?? "");
  const m =
    msg.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/) || msg.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  if (m?.[1]) return Math.ceil(parseFloat(m[1]) * 1000);

  const h = e?.headers as { get?: (k: string) => string | null } | Record<string, string> | undefined;
  let ra: string | null | undefined;
  if (h && typeof (h as { get?: unknown }).get === "function") {
    ra = (h as { get: (k: string) => string | null }).get("retry-after");
  } else if (h && typeof h === "object") {
    ra = (h as Record<string, string>)["retry-after"];
  }
  if (ra) {
    const s = parseFloat(ra);
    if (!Number.isNaN(s)) return Math.ceil(s * 1000);
  }
  return undefined;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(Object.assign(new Error(`[llm:${label}] timeout after ${ms}ms`), { status: 408 })),
      ms,
    );
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function withResilience<T>(
  label: string,
  fn: () => Promise<T>,
  opts: ResilienceOpts = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const maxAttempts = opts.maxAttempts ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 2_000;
  const minGapMs = opts.minGapMs ?? 0;

  // Throttle: keep a minimum gap between consecutive calls to the same engine.
  if (minGapMs > 0) {
    const wait = (lastStart.get(label) ?? 0) + minGapMs - Date.now();
    if (wait > 0) await sleep(wait);
  }
  lastStart.set(label, Date.now());

  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      return await withTimeout(fn(), timeoutMs, label);
    } catch (err) {
      const status = statusOf(err);
      const retryable =
        status === 429 || status === 408 || (status !== undefined && status >= 500) || isNetworkError(err);
      if (!retryable || attempt >= maxAttempts) throw err;

      const server = serverRetryMs(err);
      const backoff = server ?? Math.min(baseDelayMs * 2 ** (attempt - 1), 60_000);
      const wait = backoff + Math.floor(Math.random() * 1000); // jitter
      console.warn(
        `[llm:${label}] ${status ?? "error"} on attempt ${attempt}/${maxAttempts} — retrying in ${Math.round(wait / 1000)}s`,
      );
      await sleep(wait);
    }
  }
}
