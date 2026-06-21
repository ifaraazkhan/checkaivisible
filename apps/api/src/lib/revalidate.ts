// Best-effort webhook that tells the Next.js web app to drop cached fetches for
// a given ledger (or the index) the moment a refresh writes new data. Silent
// no-op when env isn't configured — so local dev / tests don't fail.

const WEB_URL = process.env.WEB_REVALIDATE_URL;
const SECRET = process.env.REVALIDATE_SECRET;

async function post(body: { tags?: string[]; paths?: string[] }): Promise<void> {
  if (!WEB_URL || !SECRET) return;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(WEB_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: SECRET, ...body }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[revalidate] web responded ${res.status}`);
    }
  } catch (err) {
    console.warn(`[revalidate] failed: ${(err as Error).message}`);
  }
}

export async function revalidateLedger(slug: string): Promise<void> {
  await post({ tags: [`ledger:${slug}`, "ledgers"], paths: [`/${slug}`] });
}

export async function revalidateLedgerIndex(): Promise<void> {
  await post({ tags: ["ledger-index", "ledgers"], paths: ["/", "/leaderboards"] });
}
