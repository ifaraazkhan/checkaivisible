import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AnnouncementBar } from "@/components/announcement-bar";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "checkaivisible — Telemetry for AI discovery",
    template: "%s | checkaivisible",
  },
  description:
    "Measure how often ChatGPT and Gemini recommend your local business — across the 20 highest-intent prompts in your city. Free score in 30 seconds.",
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
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="flex min-h-screen flex-col antialiased">
        <AnnouncementBar />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
