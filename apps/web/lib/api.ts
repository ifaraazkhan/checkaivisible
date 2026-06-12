export const CATEGORIES = ["restaurant", "dentist", "lawyer", "plumber", "spa"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  restaurant: "Restaurant / Cafe",
  dentist: "Dentist",
  lawyer: "Lawyer / Law Firm",
  plumber: "Plumber / Home Services",
  spa: "Spa / Salon",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export type CreateAuditInput = {
  url?: string;
  name?: string;
  city?: string;
  state?: string;
  category?: Category;
  turnstileToken?: string;
};

export type CreateAuditResponse = {
  auditId: string;
  status: "pending" | "running" | "done" | "failed";
  business: {
    name: string;
    city: string;
    state: string;
    category: Category;
  };
};

export type AuditStatusResponse =
  | {
      id: string;
      status: "pending" | "running" | "failed";
      business: {
        name: string;
        city: string;
        state: string;
        category: Category;
      } | null;
    }
  | {
      id: string;
      status: "done";
      score: number;
      breakdown: {
        overall: number;
        byPlatform: Record<string, number>;
        totalPrompts: number;
        appearances: number;
        topCompetitors: { name: string; mentions: number }[];
      };
      business: {
        name: string;
        city: string;
        state: string;
        category: Category;
        url: string | null;
      } | null;
      completedAt: string;
      results: {
        targetAppeared: boolean;
        targetRank: number | null;
        competitors: string[];
      }[];
    };

export async function createAudit(input: CreateAuditInput): Promise<CreateAuditResponse> {
  const res = await fetch(`${API_URL}/audit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getAudit(id: string): Promise<AuditStatusResponse> {
  const res = await fetch(`${API_URL}/audit/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function captureEmail(input: {
  email: string;
  auditId?: string;
  source?: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/email/capture`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, consentMarketing: true }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? body?.error ?? `HTTP ${res.status}`);
  }
}
