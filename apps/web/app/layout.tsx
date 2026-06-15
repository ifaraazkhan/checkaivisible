import type { Metadata } from "next";
import { Archivo, Geist_Mono, Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { JsonLd } from "@/components/json-ld";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { graph, organizationLd, websiteLd } from "@/lib/structured-data";

const gaId = process.env.NEXT_PUBLIC_GA_ID;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://checkaivisible.com";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Display face for headings (.font-display) — paired against Inter body + Geist
// Mono data. Revert: drop this import + its variable below, and point
// --font-display back to var(--font-sans) in globals.css.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "checkaivisible — Who does AI actually recommend?",
    template: "%s | checkaivisible",
  },
  description:
    "We ask ChatGPT, Gemini & Perplexity \"best X\" every week — and publish what they answer. Live leaderboards, sourced citations, free visibility check.",
  openGraph: {
    type: "website",
    siteName: "checkaivisible",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  // Google Search Console HTML-tag verification. Set GOOGLE_SITE_VERIFICATION in
  // the env (the token from GSC → "HTML tag" method). Omitted cleanly if unset.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

// Auto by default: light during the day (6:00–17:59 local), dark at night.
// An explicit choice ("light"/"dark") from the toggle always wins. Runs before
// paint so there's no flash. <html> ships with `dark`, so we only remove it.
const themeInit = `try{var p=localStorage.getItem("cav-theme"),h=new Date().getHours(),d=p==="dark"||(p!=="light"&&(h<6||h>=18));document.documentElement.classList.toggle("dark",d)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${inter.variable} ${geistMono.variable} ${archivo.variable}`}
    >
      <body className="flex min-h-screen flex-col antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <JsonLd data={graph(organizationLd, websiteLd)} />
        <AnalyticsProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </AnalyticsProvider>
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
