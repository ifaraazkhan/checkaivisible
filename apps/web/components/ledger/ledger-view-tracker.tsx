"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function LedgerViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    track("leaderboard_viewed", { slug });
  }, [slug]);
  return null;
}
