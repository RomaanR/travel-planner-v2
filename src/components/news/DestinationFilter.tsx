"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import Flag from "./Flag";

export type DestinationChip = { code: string; name: string; href: string; active: boolean; alert: boolean };
export type SearchCountry = { code: string; name: string; slug: string };

const chip = (active: boolean) =>
  `micro-copy text-xs px-4 min-h-[44px] shrink-0 inline-flex items-center gap-2 border transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt-orange ${
    active ? "bg-ink text-paper border-ink" : "border-ink/25 text-ink hover:border-ink"
  }`;

const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MAX_RESULTS = 12;

/**
 * Destination search plus the popular-country chips. Typing searches every country we have a page
 * for (names that start with the query first); results open that country's page. Filtering is local.
 */
export default function DestinationFilter({ chips, countries, allHref, allActive }: {
  chips: DestinationChip[]; countries: SearchCountry[]; allHref: string; allActive: boolean;
}) {
  const [q, setQ] = useState("");
  const needle = norm(q.trim());
  const results = needle
    ? countries
        .filter((c) => norm(c.name).includes(needle))
        .sort((a, b) => Number(norm(b.name).startsWith(needle)) - Number(norm(a.name).startsWith(needle)))
    : [];

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
          placeholder="Search any country"
          autoComplete="off"
          className="w-full min-h-[44px] pl-10 pr-3 bg-white border border-ink/25 font-sans text-base text-ink placeholder:text-ink-light focus:outline-none focus:border-ink focus-visible:ring-2 focus-visible:ring-burnt-orange"
        />
      </div>

      {needle ? (
        <div aria-live="polite">
          {results.length === 0 ? (
            <p className="font-sans text-sm text-ink-light">No country matches &quot;{q.trim()}&quot;.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-w-3xl">
              {results.slice(0, MAX_RESULTS).map((c) => (
                <li key={c.code}>
                  <Link href={`/news/${c.slug}`} className={`${chip(false)} w-full`}>
                    <Flag code={c.code} />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {results.length > MAX_RESULTS && (
            <p className="font-sans text-sm text-ink-light mt-2">{results.length - MAX_RESULTS} more. Keep typing to narrow it down.</p>
          )}
        </div>
      ) : (
        <>
          {/* Phones: one scrollable row. Desktop: wraps. */}
          <div
            role="group"
            aria-label="Popular destinations"
            className="flex gap-2 overflow-x-auto md:flex-wrap md:overflow-visible -mx-6 px-6 md:mx-0 md:px-0 pb-2 md:pb-0 snap-x"
          >
            <Link href={allHref} scroll={false} className={`${chip(allActive)} snap-start`}>All</Link>
            {chips.map((c) => (
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
          <p className="font-sans text-sm text-ink-light mt-2">Popular destinations. Search to find any country.</p>
        </>
      )}
    </div>
  );
}
