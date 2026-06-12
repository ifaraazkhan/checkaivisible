import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/site-shell";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://checkaivisible.com";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
