"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import Flag from "./Flag";

export type DestinationChip = { code: string; name: string; href: string; active: boolean; alert: boolean };

const chip = (active: boolean) =>
  `micro-copy text-xs px-4 min-h-[44px] shrink-0 inline-flex items-center gap-2 border transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt-orange ${
    active ? "bg-ink text-paper border-ink" : "border-ink/25 text-ink hover:border-ink"
  }`;

/** Destination search plus chips. Filtering is local (a handful of countries) and instant. */
export default function DestinationFilter({ chips, allHref, allActive }: { chips: DestinationChip[]; allHref: string; allActive: boolean }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? chips.filter((c) => c.name.toLowerCase().includes(needle)) : chips;

  return (
    <div>
      <label htmlFor="dest-search" className="micro-copy text-xs text-ink-light block mb-3">Destination</label>
      <div className="relative mb-3 max-w-md">
        <Search size={16} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-light" />
        <input
          id="dest-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a destination"
          autoComplete="off"
          className="w-full min-h-[44px] pl-10 pr-3 bg-white border border-ink/25 font-sans text-base text-ink placeholder:text-ink-light focus:outline-none focus:border-ink focus-visible:ring-2 focus-visible:ring-burnt-orange"
        />
      </div>

      {/* Phones: one scrollable row. Desktop: wraps. */}
      <div
        role="group"
        aria-label="Destinations"
        className="flex gap-2 overflow-x-auto md:flex-wrap md:overflow-visible -mx-6 px-6 md:mx-0 md:px-0 pb-2 md:pb-0 snap-x"
      >
        {!needle && <Link href={allHref} scroll={false} className={`${chip(allActive)} snap-start`}>All</Link>}
        {shown.map((c) => (
          <Link key={c.code} href={c.href} scroll={false} className={`${chip(c.active)} snap-start`}>
            <Flag code={c.code} />
            {c.name}
            {c.alert && (
              <>
                <span className="w-2 h-2 bg-burnt-orange" aria-hidden />
                <span className="sr-only">has a current alert</span>
              </>
            )}
          </Link>
        ))}
      </div>
      <p aria-live="polite" className="font-sans text-sm text-ink-light mt-2 min-h-[1.25rem]">
        {needle && shown.length === 0 ? `No covered destination matches "${q.trim()}".` : ""}
      </p>
    </div>
  );
}
