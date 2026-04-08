"use client";

import { useState } from "react";
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
      <div className="flex flex-col gap-1">
        {items.map((item: TimelineItem, i) => (
          <div key={`item-${i}`} className="print:break-inside-avoid">
            {item?.transitFromPrevious && i > 0 && (
              <TransitHeader transit={item.transitFromPrevious} transportMode={transportMode} />
            )}
            <TimelineCard
              item={item}
              delay={0.06 * (i + 1)}
            />
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

      {/* ── SCREEN ONLY: Tabbed day navigation ── */}
      {/*
        Why every previous attempt failed:
        1. sticky + overflow-x on the same subtree = known iOS Safari bug;
           Safari restricts internal horizontal scroll on sticky subtrees.
        2. overflow-x:auto relies on Safari's layout engine agreeing content
           overflows — it sometimes miscalculates and returns 0 scrollable width.

        Final approach:
        • Mobile: NO sticky (position:static). Sticky only at md+.
        • CSS Grid grid-flow-col auto-cols-max — each column sizes to its content,
          total grid width = sum of all columns; no flex shrinking, no w-max math.
        • overflow-x:auto on the grid itself — scrolls when grid > viewport.
        • snap-x snap-mandatory with snap-start on each item for tactile swipe.
        • No whitespace-nowrap, no inline-flex, no w-max dependency.
      */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="w-full min-w-0 border-b border-ink/8 mb-8 print:hidden bg-paper/80 backdrop-blur-md md:sticky md:top-0 md:z-20 md:-mx-10 md:px-10"
      >
        {/* CSS Grid scroll track — grid-flow-col auto-cols-max gives each tab its
            natural content width; the grid itself becomes the scroll container.
            No flex, no w-max, no whitespace-nowrap needed. */}
        <div className="w-full min-w-0 grid grid-flow-col auto-cols-max gap-0 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scrollbar-none [-webkit-overflow-scrolling:touch] pl-6 md:pl-0">

          {/* ALL DAYS toggle */}
          <button
            onClick={() => setActiveDay(null)}
            className={`snap-start flex flex-col items-start pb-3 pt-1 pr-5 sm:pr-8 transition-all cursor-pointer ${
              activeDay === null
                ? "border-b-2 border-burnt-orange"
                : "border-b-2 border-transparent hover:border-ink/20"
            }`}
          >
            <span className={`micro-copy ${activeDay === null ? "text-burnt-orange" : "text-ink-light"}`}>
              ALL
            </span>
            <span className={`font-serif italic text-sm leading-tight mt-0.5 ${activeDay === null ? "text-ink" : "text-ink-light"}`}>
              Days
            </span>
          </button>

          {/* Individual day tabs */}
          {itinerary.days.map((day, i) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(i)}
              className={`snap-start flex flex-col items-start pb-3 pt-1 pr-5 sm:pr-8 transition-all cursor-pointer ${
                activeDay === i
                  ? "border-b-2 border-burnt-orange"
                  : "border-b-2 border-transparent hover:border-ink/20"
              }`}
            >
              <span className={`micro-copy ${activeDay === i ? "text-burnt-orange" : "text-ink-light"}`}>
                DAY {day.day}
              </span>
              <span
                className={`font-serif italic text-sm leading-tight mt-0.5 max-w-[100px] sm:max-w-[140px] truncate ${
                  activeDay === i ? "text-ink" : "text-ink-light"
                }`}
              >
                {day.theme}
              </span>
            </button>
          ))}

        </div>
      </motion.div>

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
