import * as cheerio from "cheerio";
import type { BusinessProfile, Category } from "./types.js";
import { inferCategory } from "./category.js";

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; checkaivisible/1.0; +https://checkaivisible.com)";

type ScrapeOutput = {
  html: string;
  pageText: string;
  jsonLd: unknown[];
  title: string | null;
  metaDescription: string | null;
};

export async function fetchPage(url: string): Promise<ScrapeOutput> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const jsonLd: unknown[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).contents().text());
        jsonLd.push(parsed);
      } catch {
        // ignore malformed json-ld
      }
    });

    return {
      html,
      pageText: $("body").text().replace(/\s+/g, " ").slice(0, 20000),
      jsonLd,
      title: $("title").first().text().trim() || null,
      metaDescription: $('meta[name="description"]').attr("content") ?? null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

type ExtractedFields = {
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  category: Category | null;
};

// Walks JSON-LD looking for LocalBusiness-shaped objects.
function extractFromJsonLd(jsonLd: unknown[]): ExtractedFields {
  const out: ExtractedFields = {
    name: null,
    address: null,
    city: null,
    state: null,
    phone: null,
    category: null,
  };

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (obj["@graph"]) visit(obj["@graph"]);

    const type = obj["@type"];
    const typeStr = Array.isArray(type) ? type.join(",") : (type as string | undefined);
    if (typeStr && /(Business|Restaurant|Dentist|LegalService|Attorney|Plumber|HealthAndBeautyBusiness|DaySpa|Organization)/i.test(typeStr)) {
      if (!out.name && typeof obj.name === "string") out.name = obj.name;
      if (!out.phone && typeof obj.telephone === "string") out.phone = obj.telephone;
      const addr = obj.address as Record<string, unknown> | undefined;
      if (addr && typeof addr === "object") {
        if (!out.address && typeof addr.streetAddress === "string") out.address = addr.streetAddress;
        if (!out.city && typeof addr.addressLocality === "string") out.city = addr.addressLocality;
        if (!out.state && typeof addr.addressRegion === "string") out.state = addr.addressRegion;
      }
    }
  };

  jsonLd.forEach(visit);
  return out;
}

// Best-effort regex fallback for city/state when JSON-LD is absent.
function extractCityStateFromText(text: string): { city: string | null; state: string | null } {
  // Match "City, ST" or "City, ST ZIP" with 2-letter state code.
  const match = text.match(/\b([A-Z][A-Za-z .'-]{2,30}),\s*([A-Z]{2})(?:\s+\d{5})?\b/);
  if (!match) return { city: null, state: null };
  return { city: match[1]!.trim(), state: match[2]! };
}

export async function scrapeBusiness(url: string): Promise<Partial<BusinessProfile>> {
  const page = await fetchPage(url);
  const fromJsonLd = extractFromJsonLd(page.jsonLd);

  const name =
    fromJsonLd.name ??
    page.title?.split(/[|·\-—]/)[0]?.trim() ??
    null;

  const fromText = extractCityStateFromText(page.pageText);
  const city = fromJsonLd.city ?? fromText.city;
  const state = fromJsonLd.state ?? fromText.state;

  const category =
    fromJsonLd.category ??
    inferCategory({
      title: page.title,
      description: page.metaDescription,
      text: page.pageText,
    });

  return {
    name: name ?? undefined,
    url,
    city: city ?? undefined,
    state: state ?? undefined,
    category: category ?? undefined,
    address: fromJsonLd.address,
    phone: fromJsonLd.phone,
  };
}
