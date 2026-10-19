"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { ArrowRight } from "lucide-react";
import { PARIS_DOSSIER, type DossierDay } from "@/content/heroDossier";
import { parseDateLocal } from "@/lib/dateUtils";

export type PlannerDraft = { destination: string; from: string; to: string };

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** Animation start offset in seconds — read by .dossier-a in globals.css. */
const at = (seconds: number): CSSProperties => ({ ["--at" as string]: seconds });

function draftDates(draft: PlannerDraft): string {
  if (!draft.from || !draft.to) return "";
  const days = Math.round((parseDateLocal(draft.to).getTime() - parseDateLocal(draft.from).getTime()) / 86_400_000) + 1;
  return `${DATE_FMT.format(parseDateLocal(draft.from))} → ${DATE_FMT.format(parseDateLocal(draft.to))} · ${days} days`;
}

/** One written day: title, three stops joined by walking lines, a hidden gem. */
function Page({ day, pageNo, base, className }: { day: DossierDay; pageNo: number; base: number; className: string }) {
  const dossier = PARIS_DOSSIER;
  // Stops arrive at base + 1.8, +3.2, +4.6 with walking lines between (as in the approved mockup).
  const stopAt = [1.8, 3.2, 4.6];
  const walkAt = [2.5, 3.9];

  return (
    <article className={`absolute inset-x-0 top-0 bg-paper text-ink px-7 pt-6 pb-5 shadow-[0_30px_70px_rgba(0,0,0,0.35)] border border-ink/5 ${className}`}>
      <div className="dossier-a dossier-fade flex justify-between micro-copy text-[9.5px] text-ink-light" style={at(base + 0.2)}>
        <span>Dossier {dossier.issue}</span>
        <span className="text-burnt-orange">{dossier.city} &middot; {dossier.days} days</span>
      </div>
      <p className="dossier-a dossier-fade mt-4 micro-copy text-[9.5px] text-ink-light" style={at(base + 0.4)}>Day {pageNo}</p>
      <h2 className="dossier-a dossier-type font-serif italic text-[28px] leading-[1.12] mt-1.5 min-h-[64px]" style={at(base + 0.6)}>
        {day.title}
      </h2>
      <hr className="dossier-a dossier-fade border-0 border-t border-ink/10 mt-3.5 mb-1.5" style={at(base + 1.4)} />

      {day.stops.map((stop, i) => (
        <div key={stop.name}>
          <div className="dossier-a dossier-fade grid grid-cols-[40px_14px_52px_1fr] items-center gap-x-3 py-2" style={at(base + stopAt[i])}>
            <span className="font-sans text-xs text-ink-light">{stop.time}</span>
            <i className="block w-[9px] h-[9px] border-[1.5px] border-ink bg-paper justify-self-center" />
            <span className="relative block w-[52px] h-[52px] overflow-hidden bg-paper-dark">
              <Image src={stop.photo} alt="" fill sizes="52px" className="object-cover grayscale" />
            </span>
            <div className="min-w-0">
              <div className="font-serif italic text-[19px] leading-tight truncate">{stop.name}</div>
              <div className="font-sans text-[10px] text-ink-light mt-0.5 tracking-wide">
                {stop.kind}
                {stop.rating ? <> &middot; <b className="font-medium text-ink">&#9733; {stop.rating}</b></> : null}
                {stop.price ? <> &middot; {stop.price}</> : null}
                {stop.reserve ? <> &middot; Reserve</> : null}
              </div>
            </div>
          </div>
          {stop.walkNext !== undefined && (
            <div className="grid grid-cols-[40px_14px_1fr] items-center gap-x-3 h-[26px]">
              <span />
              <i className="dossier-a dossier-draw block h-full justify-self-center border-l-[1.5px] border-dashed border-ink/35" style={at(base + walkAt[i])} />
              <span className="dossier-a dossier-fade font-sans text-[10px] text-ink-light tracking-wide" style={at(base + walkAt[i] + 0.2)}>
                {stop.walkNext} min walk
              </span>
            </div>
          )}
        </div>
      ))}

      <div className="dossier-a dossier-fade mt-2.5 bg-paper-dark border-l-2 border-burnt-orange px-4 py-3.5" style={at(base + 5.6)}>
        <div className="micro-copy text-[9.5px] text-burnt-orange">&#10022; Hidden gem</div>
        <div className="font-serif italic text-[19px] mt-1">{day.gem.name}</div>
        <p className="font-sans text-[11.5px] leading-relaxed text-ink-light mt-0.5">{day.gem.note}</p>
      </div>
      <div className="dossier-a dossier-fade flex items-center justify-between mt-4 micro-copy text-[10px]" style={at(base + 6.2)}>
        <span className="inline-flex items-center gap-1.5">See the full journey <ArrowRight size={12} strokeWidth={1.5} /></span>
        <span className="text-ink-light tracking-widest">{pageNo} / {dossier.pages.length}</span>
      </div>
      <i className="dossier-a dossier-grow absolute left-0 bottom-0 h-[2px] w-full bg-burnt-orange" style={at(base + 0.4)} />
    </article>
  );
}

/**
 * Wide-screen hero card that writes one real day of an itinerary, then turns the
 * page. When the visitor types a destination in the planner it steps aside for a
 * "your journey starts here" card. Hidden below 1280 px / 760 px tall (globals.css).
 */
export default function HeroDossier({ draft }: { draft: PlannerDraft | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [cycle, setCycle] = useState(0); // bumping it restarts the sequence
  const drafting = Boolean(draft?.destination.trim());
  const wasDrafting = useRef(false);

  // Restart the show when the visitor clears the planner.
  useEffect(() => {
    if (wasDrafting.current && !drafting) setCycle((c) => c + 1);
    wasDrafting.current = drafting;
  }, [drafting]);

  // One "viewed" event, only when the card is actually visible (never fires on phones).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { track("hero_dossier_viewed"); io.disconnect(); }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const [day1, day2] = PARIS_DOSSIER.pages;

  return (
    <div
      ref={rootRef}
      className="dossier-slot dossier-root absolute top-32 right-16 z-10 w-[420px] [perspective:1400px]"
    >
      {/* Showcase pages */}
      <Link
        href={PARIS_DOSSIER.href}
        onClick={() => track("hero_dossier_clicked", { city: PARIS_DOSSIER.city })}
        aria-label={`Open the ${PARIS_DOSSIER.city} sample itinerary`}
        tabIndex={drafting ? -1 : 0}
        className={`relative block h-[600px] transition-opacity duration-500 ${drafting ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <div key={cycle}>
          <Page day={day1} pageNo={1} base={0} className="dossier-page-1" />
          <Page day={day2} pageNo={2} base={10} className="dossier-page-2" />
        </div>
      </Link>

      {/* "Your dossier" — shown while the visitor is filling in the planner */}
      <div
        aria-live="polite"
        className={`absolute inset-x-0 top-0 bg-paper text-ink px-7 py-6 shadow-[0_30px_70px_rgba(0,0,0,0.35)] border border-ink/5
                    transition-opacity duration-500 ${drafting ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <p className="micro-copy text-[9.5px] text-burnt-orange">Your dossier</p>
        <h2 className="font-serif italic text-[28px] leading-[1.12] mt-2 mb-4 text-ink-light break-words">
          {drafting ? `Your journey to ${draft!.destination.trim()} starts here…` : ""}
        </h2>
        <p className="font-sans text-xs text-ink-light tracking-wide min-h-[16px]">{draft ? draftDates(draft) : ""}</p>
        <div className="mt-5 space-y-3.5" aria-hidden>
          <div className="h-2.5 w-4/5 bg-ink/[0.07]" />
          <div className="h-2.5 w-full bg-ink/[0.07]" />
          <div className="h-2.5 w-3/5 bg-ink/[0.07]" />
          <div className="h-2.5 w-4/5 bg-ink/[0.07]" />
          <div className="h-2.5 w-3/5 bg-ink/[0.07]" />
        </div>
      </div>
    </div>
  );
}
