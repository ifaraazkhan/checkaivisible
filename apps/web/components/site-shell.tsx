import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="font-mono text-[11px] font-bold">cv</span>
          </span>
          checkaivisible
        </Link>

        <nav className="hidden items-center gap-7 text-sm md:flex">
          {[
            { label: "Ledgers", href: "/leaderboards" },
            { label: "Method", href: "/#method" },
            { label: "Check", href: "/#check" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href as never}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="h-8 rounded-full px-4 text-xs font-medium"
          >
            <Link href={"/#check" as const}>Check your visibility</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative mt-16 border-t border-border">
      <div className="absolute inset-x-0 top-0 mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground">
                <span className="font-mono text-[9px] font-bold">cv</span>
              </span>
              checkaivisible
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              We ask ChatGPT, Gemini and Perplexity &ldquo;best X&rdquo; every week —
              and publish what they answer. Free, sourced, tracked over time.
            </p>
          </div>

          <FooterCol
            title="Explore"
            links={[
              { label: "All ledgers", href: "/leaderboards" },
              { label: "Check your visibility", href: "/#check" },
              { label: "The method", href: "/#method" },
            ]}
          />
          <FooterCol
            title="Ledgers"
            links={[
              { label: "Best CRM", href: "/best-crm" },
              { label: "Best AI coding tool", href: "/best-ai-coding-tool" },
              { label: "Austin restaurants", href: "/austin/restaurants" },
              { label: "NYC dentists", href: "/nyc/dentists" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: "Contact", href: "mailto:hello@checkaivisible.com" },
              { label: "API (pilot)", href: "/docs" },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <div>© {new Date().getFullYear()} checkaivisible · Rankings are observations of public AI output, refreshed weekly.</div>
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-success" />
              <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
            </span>
            Tracking live
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-foreground/90">
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href as never}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
