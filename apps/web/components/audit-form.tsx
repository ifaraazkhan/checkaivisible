"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, CATEGORY_LABELS, createAudit, type Category } from "@/lib/api";

type Mode = "url" | "manual";

const PLACEHOLDER_CYCLE = [
  "https://franklinbarbecue.com",
  "https://smileaustinortho.com",
  "https://goldsteinlawpartners.com",
  "https://24hourplumbingatx.com",
  "https://blissbodyspa.com",
];

export function AuditForm({
  size = "default",
  examples,
}: {
  size?: "default" | "hero";
  examples?: string[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [category, setCategory] = useState<Category | "auto">("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    if (mode !== "url" || url.length > 0) return;
    const i = setInterval(() => {
      setPlaceholderIdx((idx) => (idx + 1) % PLACEHOLDER_CYCLE.length);
    }, 3200);
    return () => clearInterval(i);
  }, [mode, url]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload =
        mode === "url"
          ? { url, category: category === "auto" ? undefined : category }
          : {
              name,
              city,
              state: state.toUpperCase(),
              category: category === "auto" ? undefined : category,
            };
      const res = await createAudit(payload);
      router.push(`/results/${res.auditId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const isHero = size === "hero";
  const inputH = isHero ? "h-14" : "h-12";
  const btnH = isHero ? "h-14 px-7 text-base" : "h-12 px-6";

  return (
    <form onSubmit={onSubmit} className="w-full space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-full border border-border bg-background/70 p-1 text-xs shadow-sm w-fit">
        {(["url", "manual"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              mode === m
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "url" ? "By URL" : "By name & city"}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div
        className={`group relative rounded-2xl border border-border bg-card/80 p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_28px_-12px_rgba(0,0,0,0.12)] backdrop-blur-md transition-shadow focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_-12px_oklch(0.52_0.21_264/0.35),0_0_0_3px_oklch(0.52_0.21_264/0.12)]`}
      >
        {mode === "url" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Label htmlFor="url" className="sr-only">
                Business website
              </Label>
              <Input
                id="url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={`${inputH} border-0 bg-transparent pl-11 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0`}
              />
              {url.length === 0 && (
                <div
                  className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-base text-muted-foreground"
                  key={placeholderIdx}
                  style={{
                    animation: "placeholder-fade 3.2s ease-in-out",
                  }}
                >
                  {PLACEHOLDER_CYCLE[placeholderIdx]}
                </div>
              )}
            </div>
            <Button type="submit" disabled={loading} className={`${btnH} rounded-xl`}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" /> Starting…
                </>
              ) : (
                <>
                  Check visibility <ArrowRight />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_180px_90px]">
              <Input
                placeholder="Business name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputH} border-0 bg-transparent shadow-none focus-visible:ring-0`}
              />
              <Input
                placeholder="City"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`${inputH} border-0 bg-transparent shadow-none focus-visible:ring-0`}
              />
              <Input
                placeholder="ST"
                required
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={`${inputH} border-0 bg-transparent uppercase shadow-none focus-visible:ring-0`}
              />
            </div>
            <Button type="submit" disabled={loading} className={`${btnH} rounded-xl`}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" /> Starting…
                </>
              ) : (
                <>
                  Check visibility <ArrowRight />
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Example chips */}
      {mode === "url" && examples && examples.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-xs">
          <span className="text-muted-foreground">Try</span>
          {examples.map((ex, i) => (
            <button
              key={ex}
              type="button"
              onClick={() => setUrl(`https://${ex}`)}
              className="group inline-flex items-center gap-1 font-mono text-[11px] text-foreground/70 transition-colors hover:text-primary"
            >
              {ex}
              {i < examples.length - 1 && (
                <span className="ml-2 text-border">·</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Category + meta */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={category} onValueChange={(v) => setCategory(v as Category | "auto")}>
          <SelectTrigger className="h-9 w-full rounded-full border-border bg-background/70 px-3 text-xs sm:w-auto">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-detect category</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs text-muted-foreground">
          Free · No signup · 20 prompts × 2 AI engines
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </form>
  );
}
