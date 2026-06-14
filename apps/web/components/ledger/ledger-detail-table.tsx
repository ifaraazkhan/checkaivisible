"use client";

import { useState } from "react";
import { LedgerTable } from "./ledger-table";
import { BusinessDetail } from "./business-detail";
import type { RankedEntry } from "@/lib/ledger-data";

/*
  Client wrapper: renders the ledger table with clickable business names and
  opens the detail panel for the selected business. Keeps LedgerPageView a
  server component.
*/
export function LedgerDetailTable({ slug, entries }: { slug: string; entries: RankedEntry[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <LedgerTable entries={entries} onSelectBusiness={setSelected} />
      {selected && (
        <BusinessDetail slug={slug} name={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
