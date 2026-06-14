import type { Metadata } from "next";
import { Archivo, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/site-shell";

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
};

// Dark is the brand default; honor a previously chosen light theme before paint.
const themeInit = `try{if(localStorage.getItem("cav-theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${inter.variable} ${geistMono.variable} ${archivo.variable}`}
    >
      <body className="flex min-h-screen flex-col antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
