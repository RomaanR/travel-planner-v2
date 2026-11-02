"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Flag from "./Flag";
import { TONE } from "./NewsCard";
import type { Pulse, PulseRow } from "@/lib/news/query";
import { STATE_LEVEL, displayTitle, formatNewsDate, severityTag } from "@/lib/news/types";

// Four-step colour ramps. The US runs Level 1-4 and Canada 0-3; each keeps its own wording and the
// colours only show how serious a step is within that government's own scale.
const US_FILL: Record<number, string> = { 1: "#2F6DB5", 2: "#E3B934", 3: "#D9531E", 4: "#8B1A10" };
const CA_FILL: Record<number, string> = { 0: "#2F6DB5", 1: "#E3B934", 2: "#D9531E", 3: "#8B1A10" };

const ROW = "flex items-center gap-3 py-2 border-b border-ink/5 last:border-b-0 hover:text-burnt-orange transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt-orange";

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="micro-copy text-[9.5px] text-ink-light mb-1">{children}</p>;
}

function LevelRows({ rows, fill, text, event }: { rows: PulseRow[]; fill: Record<number, string>; text: (r: PulseRow) => string; event: string }) {
  return (
    <ul>
      {rows.map((r) => (
        <li key={r.code}>
          <Link href={`/news/${r.slug}`} onClick={() => track(event, { country: r.code })} className={ROW}>
            <Flag code={r.code} />
            <span className="font-serif italic text-[18px] leading-none flex-1 min-w-0 truncate">{r.name}</span>
            <span className="inline-flex items-center gap-2 font-sans text-[11px] leading-tight text-ink-light text-right max-w-[48%]">
              <span aria-hidden className="w-2.5 h-2.5 shrink-0 border border-black/20" style={{ background: fill[r.level] }} />
              {text(r)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Wide-screen hero card: the most serious current alert, then two US levels, two UK updates and
 * two Canadian levels for popular destinations. Hidden below 1280 px / 760 px tall by the shared
 * .dossier-slot rule in globals.css; the UK block also hides on shorter screens so nothing clips.
 */
export default function HeroPulse({ pulse }: { pulse: Pulse | null }) {
  if (!pulse) return null;
  const { alert, us, canada, uk } = pulse;
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
            <h2 className="font-serif italic font-bold text-[24px] leading-[1.15] mt-2 group-hover:text-burnt-orange transition-colors">{displayTitle(alert)}</h2>
            <p className="font-sans text-[13px] leading-relaxed text-ink/80 mt-1.5 line-clamp-2">{alert.summary}</p>
          </Link>
        )}

        {us.length > 0 && (
          <>
            <hr className="border-0 border-t border-ink/10 my-3" />
            <Heading>US advisory levels</Heading>
            <LevelRows rows={us} fill={US_FILL} text={(r) => `Level ${r.level} · ${STATE_LEVEL[r.level]}`} event="hero_pulse_row_clicked" />
          </>
        )}

        {uk.length > 0 && (
          <div className="hidden [@media(min-height:860px)]:block">
            <hr className="border-0 border-t border-ink/10 my-3" />
            <Heading>UK travel advice</Heading>
            <ul>
              {uk.map((u) => (
                <li key={u.code}>
                  <Link href={`/news/${u.slug}`} onClick={() => track("hero_pulse_update_clicked", { country: u.code })} className={`${ROW} items-start`}>
                    <Flag code={u.code} className="mt-1" />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-baseline justify-between gap-3"><span className="font-serif italic text-[18px] leading-none">{u.name}</span><span className="font-sans text-[10.5px] text-ink-light/80 shrink-0">{formatNewsDate(u.publishedAt)}</span></span>
                      <span className="block font-sans text-[11.5px] leading-snug text-ink-light mt-1 line-clamp-1">{u.summary}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canada.length > 0 && (
          <>
            <hr className="border-0 border-t border-ink/10 my-3" />
            <Heading>Canada&apos;s travel advice</Heading>
            <LevelRows rows={canada} fill={CA_FILL} text={(r) => r.label} event="hero_pulse_canada_clicked" />
          </>
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
