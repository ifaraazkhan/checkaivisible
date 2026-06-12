"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { LEDGERS, rankLedger } from "@/lib/ledger-data";

/*
  The index of open ledgers — a contents page, not a card grid. Each entry is
  a ruled line that draws in, category left, current #1 right. Entries link
  to the real per-category ledger pages.
*/
export function LedgerIndex() {
  const reduce = useReducedMotion();

  return (
    <motion.ul
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ visible: { transition: { staggerChildren: reduce ? 0 : 0.07 } } }}
      className="grid gap-x-12 md:grid-cols-2"
    >
      {LEDGERS.map((ledger) => {
        const top = rankLedger(ledger)[0];
        return (
          <motion.li
            key={ledger.slug}
            variants={{
              hidden: reduce ? {} : { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.4 } },
            }}
            className="group relative"
          >
            <motion.span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px origin-left bg-border"
              variants={{
                hidden: reduce ? {} : { scaleX: 0 },
                visible: { scaleX: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
              }}
            />
            <Link
              href={`/${ledger.slug}` as never}
              className="flex min-h-14 items-center justify-between gap-4 py-4 transition-colors group-hover:bg-secondary/40"
            >
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {ledger.kind === "software" ? "SW" : "LOC"}
                </span>
                <span className="text-[15px] font-medium tracking-tight">{ledger.title}</span>
              </span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono text-xs text-primary">1</span>
                {top?.name}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </Link>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
