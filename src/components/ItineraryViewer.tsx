"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gem,
  Car,
  PersonStanding,
} from "lucide-react";
import type {
  ItineraryResponse,
  DayPlan,
  TimelineItem,
} from "@/types/itinerary";
import { normalizeDayPlan } from "@/lib/itineraryUtils";
import InteractiveStays from "@/components/InteractiveStays";
import TimelineCard from "@/components/TimelineCard";
import PrintItinerary from "@/components/PrintItinerary";

// ─── Transit connector ────────────────────────────────────────────────────────

function TransitHeader({
  transit,
  transportMode,
}: {
  transit: { walkingMinutes?: number; drivingMinutes?: number };
  transportMode?: "walking-transit" | "car-driver";
}) {
  // Show only the relevant mode when known; show both when unknown (e.g. saved trips).
  const showWalking = transportMode !== "car-driver"    && transit?.walkingMinutes  !== undefined;
  const showDriving = transportMode !== "walking-transit" && transit?.drivingMinutes !== undefined;
  if (!showWalking && !showDriving) return null;

  return (
    <div className="flex items-stretch gap-3 pl-3 py-0.5 print:hidden">
      {/* Vertical dashed connector line */}
      <div className="flex items-center justify-center w-4 shrink-0">
        <div
          className="h-full min-h-[2rem]"
          style={{
            borderLeft: "1px dashed rgba(10,10,10,0.15)",
            width: 1,
          }}
        />
      </div>
      {/* Labels */}
      <div className="flex items-center gap-3 py-2.5">
        {showWalking && (
          <span className="flex items-center gap-1 micro-copy text-ink-light">
            <PersonStanding size={10} strokeWidth={1.5} />
            {transit.walkingMinutes} min walk
          </span>
        )}
        {showWalking && showDriving && (
          <span className="micro-copy text-ink/20">·</span>
        )}
        {showDriving && (
          <span className="flex items-center gap-1 micro-copy text-ink-light">
            <Car size={10} strokeWidth={1.5} />
            {transit.drivingMinutes} min drive
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Day section ──────────────────────────────────────────────────────────────

const PACE_LABELS: Record<string, string> = {
  relaxed:  "Relaxed",
  moderate: "Moderate",
  packed:   "Packed",
};

const PACE_COLORS: Record<string, string> = {
  relaxed:  "text-emerald-accent border-emerald-accent",
  moderate: "text-burnt-orange border-burnt-orange",
  packed:   "text-ink border-ink",
};

function DaySection({ day: rawDay, transportMode }: { day: DayPlan; transportMode?: "walking-transit" | "car-driver" }) {
  const day = normalizeDayPlan(rawDay);
  const items = day.timeline ?? [];

  return (
    <div>
      {/* Day header */}
      <div className="flex items-start justify-between mb-4 pb-4 border-b border-ink/8 print:border-black/15">
        <div>
          <p className="micro-copy text-ink-light mb-1 print:text-black/50">Day {day.day}</p>
          <h3 className="font-serif italic text-xl sm:text-2xl md:text-4xl text-ink leading-tight print:text-black print:text-2xl">
            {day.theme}
          </h3>
        </div>
        <span
          className={`micro-copy border px-3 py-1.5 mt-1 shrink-0 ml-4 print:text-black print:border-black/30 ${
            PACE_COLORS[day.pace] ?? "text-ink border-ink"
          }`}
        >
          {PACE_LABELS[day.pace] ?? day.pace}
        </span>
      </div>

      {/* Unified chronological timeline */}
      <div className="relative flex flex-col gap-1">

        {/* Vertical rail — thin line connecting all nodes; hidden in print */}
        {items.length > 1 && (
          <div
            aria-hidden
            className="print:hidden absolute left-[13px] top-6 bottom-6 w-px bg-ink/40 z-0"
          />
        )}

        {items.map((item: TimelineItem, i) => (
          <div key={`item-${i}`} className="print:break-inside-avoid">

            {/* Transit connector — indented to clear the node column */}
            {item?.transitFromPrevious && i > 0 && (
              <div className="pl-10 print:pl-0">
                <TransitHeader transit={item.transitFromPrevious} transportMode={transportMode} />
              </div>
            )}

            {/* Node + Card row */}
            <div className="flex items-start gap-3">

              {/* Step node — square with zero-padded stop number */}
              <div className="print:hidden w-7 shrink-0 flex justify-center mt-4 z-10">
                <div className="w-[26px] h-[26px] flex items-center justify-center bg-paper border border-ink/60">
                  <span className="font-mono text-[8px] leading-none text-ink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Card — flex-1 so it fills remaining width */}
              <div className="flex-1 min-w-0 print:w-full">
                <TimelineCard item={item} delay={0.06 * (i + 1)} />
              </div>

            </div>
          </div>
        ))}

        {/* Hidden gem */}
        {day.hiddenGem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
            className="flex items-start gap-3 border border-emerald-accent/20 bg-emerald-accent/3 px-4 py-3 mt-1 print:break-inside-avoid print:opacity-100 print:border-black/20 print:bg-transparent"
          >
            <Gem
              size={13}
              strokeWidth={1.5}
              className="text-emerald-accent shrink-0 mt-0.5 print:text-black"
            />
            <div>
              <span className="micro-copy text-emerald-accent block mb-1 print:text-black">
                Hidden Gem
              </span>
              <p className="font-sans text-sm text-ink leading-relaxed print:text-black">
                {day.hiddenGem}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── ItineraryViewer ──────────────────────────────────────────────────────────

interface ItineraryViewerProps {
  itinerary: ItineraryResponse;
  /** CTA slot rendered below the last day — save button (live page) or back-to-archive (saved trip page) */
  bottomSection?: ReactNode;
  /** User's chosen transport mode — filters transit display to show only the relevant time */
  transportMode?: "walking-transit" | "car-driver";
  /** Travel dates — passed from sessionStorage on the live itinerary page; shown on the print cover */
  departureDate?: string;
  returnDate?: string;
}

export default function ItineraryViewer({ itinerary, bottomSection, transportMode, departureDate, returnDate }: ItineraryViewerProps) {
  // null = All Days view; number = single day index
  const [activeDay, setActiveDay] = useState<number | null>(0);
  const currentDay = activeDay !== null ? itinerary.days?.[activeDay] : null;

  // Sentinel ref placed at the top of the screen content.
  // scrollIntoView() targets the nearest scrollable ancestor automatically —
  // on desktop this is the overflow-y-auto left panel; on mobile / full-page
  // routes (/trips/[id], /shared/[id]) it falls back to the window.
  const scrollSentinelRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the initial mount so arriving on the page doesn't trigger a scroll.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollSentinelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeDay]);

  return (
    <>
      {/* ── PRINT ONLY: Editorial magazine layout ── */}
      <PrintItinerary
        itinerary={itinerary}
        departureDate={departureDate}
        returnDate={returnDate}
      />

      {/* Editorial opener */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 print:hidden"
      >
        <div className="w-8 h-px bg-burnt-orange mb-4 print:bg-black" />
        <blockquote className="font-serif italic text-base sm:text-xl md:text-2xl text-ink leading-relaxed print:text-black">
          &quot;{itinerary.editorial}&quot;
        </blockquote>
      </motion.div>

      {/* ── Recommended Stays — only renders when present (accommodationStatus: "needed") ── */}
      {(itinerary.recommendedStays?.length ?? 0) > 0 && (
        <InteractiveStays
          stays={itinerary.recommendedStays!}
          destination={itinerary.destination}
        />
      )}

      {/* Scroll sentinel — sits immediately above the tab bar.
          Tab changes scroll here, not to the top of the page. */}
      <div ref={scrollSentinelRef} aria-hidden="true" />

      {/* ── SCREEN ONLY: Tabbed day navigation ── */}
      {/*
        Architecture: sticky top-0 outer shell (no overflow-x — avoids iOS Safari
        sticky+overflow-x bug) wraps an overflow-hidden clipping box, which wraps
        a flex scroll track. flex-none shrink-0 on every button is the critical
        invariant — it forbids the browser from resizing or squishing any tab,
        so the flex track's intrinsic width is always the sum of all button widths,
        and the scroll container has a real, correct maxScrollLeft.
        No motion.div — Framer Motion can miscalculate hidden-overflow children widths.
        No -mx / px negative-margin trick — removed to eliminate desktop clipping.
        No CSS Grid — reverted; flex-none shrink-0 is sufficient and simpler.
      */}
      <div className="sticky top-0 z-50 w-full print:hidden mb-6">
        {/* Clipping shell: overflow-hidden caps the bar to container width,
            forcing the inner flex track to scroll rather than bleed off-screen */}
        <div className="w-full overflow-hidden bg-[#111111] border-b border-black/20">
          {/* Flex scroll track: flex (not grid) + overflow-x-auto + -webkit-overflow-scrolling */}
          <div className="flex overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">

            {/* ALL DAYS toggle */}
            <button
              onClick={() => setActiveDay(null)}
              className={`flex-none shrink-0 px-6 py-3 text-xs tracking-widest uppercase font-bold border-r border-white/10 transition-colors cursor-pointer whitespace-nowrap ${
                activeDay === null
                  ? "text-white border-b-2 border-burnt-orange"
                  : "text-white/50 border-b-2 border-transparent hover:text-white/75"
              }`}
            >
              All Days
            </button>

            {/* Individual day tabs */}
            {itinerary.days.map((day, i) => (
              <button
                key={day.day}
                onClick={() => setActiveDay(i)}
                className={`flex-none shrink-0 px-6 py-3 text-xs tracking-widest uppercase font-bold border-r border-white/10 transition-colors cursor-pointer whitespace-nowrap ${
                  activeDay === i
                    ? "text-white border-b-2 border-burnt-orange"
                    : "text-white/50 border-b-2 border-transparent hover:text-white/75"
                }`}
              >
                Day {day.day}
              </button>
            ))}

          </div>
        </div>
      </div>

      {/* ── SCREEN ONLY: Day content (animated on tab switch) ── */}
      <div className="print:hidden w-full min-w-0">
        <AnimatePresence mode="wait">
          {activeDay === null ? (
            /* ALL DAYS — stack every DaySection vertically */
            <motion.div
              key="all"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-12"
            >
              {itinerary.days.map((day) => (
                <DaySection key={day.day} day={day} transportMode={transportMode} />
              ))}
            </motion.div>
          ) : (
            /* Single day — existing animated behaviour */
            currentDay && (
              <motion.div
                key={activeDay}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <DaySection day={currentDay} transportMode={transportMode} />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {/* Custom bottom section — hidden in print (CTAs have no meaning on paper) */}
      <div className="print:hidden w-full min-w-0">
        {bottomSection}
      </div>
    </>
  );
}
