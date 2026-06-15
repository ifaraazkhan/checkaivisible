"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Day = 06:00–17:59 local → light; otherwise dark. Mirrors the pre-paint
// script in app/layout.tsx.
function autoIsDark() {
  const h = new Date().getHours();
  return h < 6 || h >= 18;
}

export function ThemeToggle() {
  // matches the server-rendered class; corrected on mount
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    setDark(root.classList.contains("dark"));

    // While the user hasn't made an explicit choice, follow the clock so a tab
    // left open across the day/night boundary flips on its own.
    function syncAuto() {
      let pref: string | null = null;
      try {
        pref = localStorage.getItem("cav-theme");
      } catch {
        // private mode etc. — treat as auto
      }
      if (pref === "light" || pref === "dark") return;
      const next = autoIsDark();
      root.classList.toggle("dark", next);
      setDark(next);
    }

    const id = window.setInterval(syncAuto, 60_000);
    document.addEventListener("visibilitychange", syncAuto);
    window.addEventListener("focus", syncAuto);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", syncAuto);
      window.removeEventListener("focus", syncAuto);
    };
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("cav-theme", next ? "dark" : "light");
    } catch {
      // private mode etc. — theme just won't persist
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
