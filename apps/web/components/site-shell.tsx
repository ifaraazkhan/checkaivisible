import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* Logo lockup: the "AI" monogram badge (echoes the favicon) + wordmark.
   Gold lives only in the badge so it stays scarce; wordmark is ink. */
function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-semibold tracking-tighter text-foreground", className)}>
      <span
        aria-hidden
        className="grid h-[1.55em] w-[1.55em] place-items-center rounded-[0.32em] border border-border bg-card text-primary"
      >
        <span className="text-[0.66em] font-bold leading-none tracking-[-0.06em]">AI</span>
      </span>
      Check<span className="text-primary">AI</span>Visible
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" aria-label="CheckAIVisible — home">
          <Wordmark className="text-xl" />
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
          <ThemeToggle />
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
            <Wordmark className="text-base" />
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
              { label: "About", href: "/about" },
              { label: "Methodology", href: "/methodology" },
              { label: "Contact", href: "mailto:hello@checkaivisible.com" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
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
