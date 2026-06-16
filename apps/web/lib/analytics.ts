"use client";

import posthog from "posthog-js";
import { sendGAEvent } from "@next/third-parties/google";

/**
 * Funnel events we fire by hand, on top of PostHog autocapture (which already
 * records every click/pageview) and GA4 pageviews. These are the named, typed
 * steps we actually report on: land → check → results → fix-plan → email lead.
 *
 * Both sinks are best-effort and guarded — analytics never breaks the app.
 */
export type AnalyticsEvent =
  | "check_started" // checker form submitted
  | "check_completed" // report finished rendering (carries score/tier)
  | "fix_plan_clicked" // clicked through to the fix plan
  | "email_unlocked" // gave email to unlock fixes, the lead/conversion
  | "leaderboard_viewed";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  // PostHog — product funnel
  try {
    if (posthog.__loaded) posthog.capture(event, props);
  } catch {
    /* analytics must never throw */
  }

  // GA4 — acquisition/SEO reporting
  try {
    if (GA_ID) sendGAEvent("event", event, props);
  } catch {
    /* analytics must never throw */
  }
}
