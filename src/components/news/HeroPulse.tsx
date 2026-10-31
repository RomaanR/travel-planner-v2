"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Flag from "./Flag";
import { TONE } from "./NewsCard";
import type { Pulse } from "@/lib/news/query";
import { STATE_LEVEL, displayTitle, formatNewsDate, severityTag } from "@/lib/news/types";

// US State Dept level colours (same four-step scale as the map on /news).
const LEVEL_FILL: Record<number, string> = { 1: "#2F6DB5", 2: "#E3B934", 3: "#D9531E", 4: "#8B1A10" };

/**
 * Wide-screen hero card: the most serious current alert and four destinations' advisory levels.
 * Hidden below 1280 px / 760 px tall by the shared .dossier-slot rule in globals.css.
 */
export default function HeroPulse({ pulse }: { pulse: Pulse | null }) {
  if (!pulse) return null;
  const { alert, rows, updates } = pulse;
  const tag = alert ? severityTag(alert) : null;

  return (
    <div className="dossier-slot absolute top-32 right-16 z-10 w-[420px]">
      <div className="flex flex-col min-h-[calc(100vh-14rem)] bg-paper text-ink px-7 pt-6 pb-5 shadow-[0_30px_70px_rgba(0,0,0,0.35)] border border-ink/5 border-b-2 border-b-burnt-orange">
        <div className="flex justify-between micro-copy text-[9.5px] text-ink-light">
          <span>Travel pulse</span>
          {pulse.checkedAt && <span className="text-burnt-orange">Checked {formatNewsDate(pulse.checkedAt)}</span>}
        </div>

        {alert && (
          <Link
            href={`/news/${alert.countrySlug}`}
            onClick={() => track("hero_pulse_alert_clicked", { country: alert.countryCode })}
            className="group block mt-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt-orange"
          >
            <p className="flex items-center gap-2 micro-copy text-[9.5px] text-ink-light">
              <Flag code={alert.countryCode} /> {alert.countryName}
              <span aria-hidden>&middot;</span> Current alert
            </p>
            {tag && (
              <p className={`mt-3 inline-flex items-center gap-2 border px-2.5 py-1 micro-copy text-[10px] ${TONE[tag.tone]}`}>
                <AlertTriangle size={13} aria-hidden />
                <span><span className="sr-only">{tag.authority}: </span>{tag.label}</span>
              </p>
            )}
            <h2 className="font-serif italic font-bold text-[26px] leading-[1.15] mt-2.5 group-hover:text-burnt-orange transition-colors">{displayTitle(alert)}</h2>
            <p className="font-sans text-[13px] leading-relaxed text-ink/80 mt-2 line-clamp-3">{alert.summary}</p>
          </Link>
        )}

        {rows.length > 0 && (
          <>
            <hr className="border-0 border-t border-ink/10 my-4" />
            <p className="micro-copy text-[9.5px] text-ink-light mb-1">US advisory levels</p>
            <ul>
              {rows.map((r, i) => (
                <li key={r.code} className={i >= 4 ? "hidden [@media(min-height:860px)]:block" : undefined}>
                  <Link
                    href={`/news/${r.slug}`}
                    onClick={() => track("hero_pulse_row_clicked", { country: r.code })}
                    className="flex items-center gap-3 py-2.5 border-b border-ink/5 last:border-b-0 hover:text-burnt-orange transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt-orange"
                  >
                    <Flag code={r.code} />
                    <span className="font-serif italic text-[18px] leading-none flex-1 truncate">{r.name}</span>
                    <span className="inline-flex items-center gap-2 font-sans text-[11px] text-ink-light">
                      <span aria-hidden className="w-2.5 h-2.5 border border-black/20" style={{ background: LEVEL_FILL[r.level] }} />
                      Level {r.level} &middot; {STATE_LEVEL[r.level]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {updates.length > 0 && (
          <div className="hidden [@media(min-height:860px)]:block">
            <hr className="border-0 border-t border-ink/10 my-4" />
            <p className="micro-copy text-[9.5px] text-ink-light mb-1">Latest updates</p>
            <ul>
              {updates.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/news/${u.countrySlug}`}
                    onClick={() => track("hero_pulse_update_clicked", { country: u.countryCode })}
                    className="flex items-start gap-3 py-2.5 border-b border-ink/5 last:border-b-0 hover:text-burnt-orange transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt-orange"
                  >
                    <Flag code={u.countryCode} className="mt-1.5" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-serif italic font-bold text-[16px] leading-tight">{u.countryName}: {displayTitle(u)}</span>
                      <span className="block font-sans text-[11px] text-ink-light mt-0.5">{formatNewsDate(u.publishedAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          href="/news"
          onClick={() => track("hero_pulse_all_clicked")}
          className="mt-auto pt-3 micro-copy text-[10px] inline-flex items-center gap-1.5 py-2 hover:text-burnt-orange transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt-orange"
        >
          See all travel news <ArrowRight size={12} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
