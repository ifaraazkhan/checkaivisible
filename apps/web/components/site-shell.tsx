import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
          <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
            <span className="absolute inset-0 rounded-md bg-gradient-to-br from-primary to-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative font-mono text-[11px] font-bold">cv</span>
          </span>
          checkaivisible
        </Link>

        <nav className="hidden items-center gap-7 text-sm md:flex">
          <Link
            href={"/#features" as const}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href={"/#how-it-works" as const}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            href={"/partners" as const}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Partners
          </Link>
          <Link
            href={"/docs" as const}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            API
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="h-8 rounded-full px-4 text-xs font-medium shadow-sm"
          >
            <Link href={"/#check" as const}>Check your business →</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative mt-16 border-t border-border/60">
      <div className="absolute inset-x-0 top-0 mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-foreground text-background">
                <span className="font-mono text-[9px] font-bold">cv</span>
              </span>
              checkaivisible
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Telemetry for AI discovery. Measure how often ChatGPT and Gemini recommend your local business.
            </p>
          </div>

          <FooterCol
            title="Product"
            links={[
              { label: "Check your business", href: "/" },
              { label: "How it works", href: "/#how-it-works" },
              { label: "Pricing", href: "/#pricing" },
              { label: "API", href: "/docs" },
            ]}
          />
          <FooterCol
            title="Solutions"
            links={[
              { label: "Restaurants", href: "/" },
              { label: "Dental practices", href: "/" },
              { label: "Law firms", href: "/" },
              { label: "Home services", href: "/" },
              { label: "Spa & wellness", href: "/" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: "Partners", href: "/partners" },
              { label: "Contact", href: "mailto:hello@checkaivisible.com" },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <div>© {new Date().getFullYear()} checkaivisible · Built for local businesses worldwide.</div>
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-success" />
              <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
            </span>
            All systems operational
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
