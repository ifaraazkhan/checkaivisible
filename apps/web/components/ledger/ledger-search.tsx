"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

type Result = {
  slug: string;
  title: string;
  kind: "software" | "local";
  city: string | null;
  top: string | null;
};

export function LedgerSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced fetch as the user types.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/ledgers/search?q=${encodeURIComponent(term)}`);
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative max-w-2xl">
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder="Search ledgers, e.g. CRM, email marketing, project management"
          className="h-12 w-full bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none"
          aria-label="Search ledgers"
        />
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {open && results && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          {results.length > 0 ? (
            <ul>
              {results.map((r) => (
                <li key={r.slug} className="border-b border-border last:border-0">
                  <Link
                    href={`/${r.slug}` as never}
                    className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-secondary/50"
                    onClick={() => setOpen(false)}
                  >
                    <span className="text-sm font-medium tracking-tight">
                      {r.title}
                      {r.kind === "local" && r.city && (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {r.city}
                        </span>
                      )}
                    </span>
                    {r.top && (
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-mono text-primary">1</span>
                        {r.top}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-4 text-sm text-muted-foreground">
              No ledger for <span className="text-foreground">“{q.trim()}”</span> yet, we&apos;ve
              noted the request and may add it soon.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
