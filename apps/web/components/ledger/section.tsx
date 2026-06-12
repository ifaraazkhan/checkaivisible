"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/*
  Numbered ledger section connected by a drawn spine: a gold node, the entry
  number, and a vertical line that draws itself as the section enters view.
*/
export function LedgerSection({
  id,
  number,
  label,
  title,
  children,
}: {
  id: string;
  number: string;
  label: string;
  title: ReactNode;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <section id={id} className="relative">
      <div className="mx-auto grid max-w-6xl grid-cols-[40px_1fr] gap-6 px-6 sm:grid-cols-[72px_1fr] sm:gap-10">
        {/* spine rail */}
        <div className="relative flex flex-col items-center pt-24 sm:pt-32">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          <motion.span
            aria-hidden
            className="mt-3 w-px flex-1 origin-top bg-border"
            initial={reduce ? false : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* content */}
        <div className="pb-24 pt-20 sm:pb-32 sm:pt-28">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <span className="text-primary">{number}</span> / {label}
            </p>
            <h2 className="font-display mt-4 max-w-2xl text-balance text-4xl sm:text-5xl">{title}</h2>
          </motion.div>
          <div className="mt-12">{children}</div>
        </div>
      </div>
    </section>
  );
}
