"use client";

import Link from "next/link";
import { useState } from "react";
import type { MapCountry } from "@/lib/news/world";

// US State Dept level colours — the same four-step scale their own map uses.
const LEVELS = [
  { level: 1, fill: "#2F6DB5", label: "Level 1: Normal precautions" },
  { level: 2, fill: "#E3B934", label: "Level 2: Increased caution" },
  { level: 3, fill: "#D9531E", label: "Level 3: Reconsider travel" },
  { level: 4, fill: "#8B1A10", label: "Level 4: Do not travel" },
] as const;
const NO_DATA = "#DAD4C6";

export default function AdvisoryMap({ countries }: { countries: MapCountry[] }) {
  const [only, setOnly] = useState<number | null>(null);
  const [hover, setHover] = useState<MapCountry | null>(null);
  if (countries.length === 0) return null;

  const fillOf = (c: MapCountry) => LEVELS.find((l) => l.level === c.level)?.fill ?? NO_DATA;
  const dimmed = (c: MapCountry) => only !== null && c.level !== only;

  return (
    <section aria-labelledby="map-title" className="mb-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4">
        <h2 id="map-title" className="font-sans font-bold uppercase tracking-widest text-sm text-ink">
          Travel advisory levels worldwide
        </h2>
        <p className="font-sans text-sm text-ink-light">US State Department levels. Tap a level to filter, or tap any country for its page.</p>
      </div>

      <div role="group" aria-label="Filter the map by advisory level" className="grid grid-cols-2 md:flex md:flex-wrap gap-2 mb-4">
        {LEVELS.map((l) => {
          const active = only === l.level;
          return (
            <button
              key={l.level}
              type="button"
              aria-pressed={active}
              onClick={() => setOnly(active ? null : l.level)}
              className={`micro-copy text-xs px-3 min-h-[44px] py-1.5 inline-flex items-center gap-2.5 border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt-orange ${
                active ? "bg-ink text-paper border-ink" : "border-ink/25 text-ink hover:border-ink"
              }`}
            >
              <span aria-hidden className="w-3 h-3 border border-black/20" style={{ background: l.fill }} />
              {l.label}
            </button>
          );
        })}
      </div>

      <div className="relative border border-ink/10 bg-paper-dark" onMouseLeave={() => setHover(null)}>
        <svg viewBox="0 0 960 500" role="img" aria-label="World map coloured by US State Department travel advisory level" className="w-full h-auto block">
          {countries.map((c) => {
            const shape = (
              <path
                d={c.d}
                fill={fillOf(c)}
                stroke="#F5F0E8"
                strokeWidth={0.5}
                opacity={dimmed(c) ? 0.15 : 1}
                className={c.slug ? "cursor-pointer hover:brightness-90" : ""}
                onMouseEnter={() => setHover(c)}
                onFocus={() => setHover(c)}
                onBlur={() => setHover(null)}
              />
            );
            return c.slug ? (
              <a key={c.name} href={`/news/${c.slug}`} aria-label={`${c.name}: ${c.level ? LEVELS[c.level - 1].label : "no level"}. Open ${c.name} travel news`}>
                {shape}
              </a>
            ) : (
              <g key={c.name}>{shape}</g>
            );
          })}
        </svg>

        <div aria-live="polite" className="absolute left-3 bottom-3 bg-white/95 border border-ink/10 px-3 py-2 font-sans text-sm text-ink min-w-[12rem]">
          {hover ? (
            <>
              <span className="font-bold">{hover.name}</span>
              <span className="block text-ink-light">{hover.level ? LEVELS[hover.level - 1].label : "No US advisory level listed"}</span>
            </>
          ) : (
            <span className="text-ink-light">Hover a country for its level</span>
          )}
        </div>
      </div>
      <p className="font-sans text-xs text-ink-light mt-2">
        Source: US Department of State. Levels are theirs and are not comparable with other governments&apos; scales.{" "}
        <Link href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-burnt-orange">
          Official advisories
        </Link>
      </p>
    </section>
  );
}
