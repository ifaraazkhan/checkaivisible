"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// Init once, client-side only. `persistence: "memory"` keeps PostHog cookieless
// (session-scoped, no localStorage) so we don't need a consent banner. Switch to
// "localStorage+cookie" later for cross-session funnels — that needs consent in the EU.
if (typeof window !== "undefined" && KEY && !posthog.__loaded) {
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: "always",
    autocapture: true, // captures all clicks/inputs/pageleaves automatically
    capture_pageview: false, // we fire $pageview on App Router navigation below
    capture_pageleave: true,
    persistence: "memory",
  });
}

// App Router soft-navigations don't trigger PostHog's history listener, so we
// fire $pageview ourselves on every path/query change. (GA4 pageviews are
// handled automatically by <GoogleAnalytics> in layout.tsx.)
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !posthog.__loaded) return;
    let url = window.location.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  if (!KEY) return <>{children}</>;
  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PostHogProvider>
  );
}
