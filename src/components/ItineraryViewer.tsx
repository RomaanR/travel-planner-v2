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
}

export default function ItineraryViewer({ itinerary, bottomSection, transportMode }: ItineraryViewerProps) {
  const [activeDay, setActiveDay] = useState(0);
  const currentDay = itinerary.days?.[activeDay];

  return (
    <>
      {/* ── PRINT ONLY: Branded dossier header ── */}
      <div className="hidden print:flex flex-col mb-10">
        <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
          <span className="font-sans font-bold text-[11px] tracking-[0.3em] uppercase text-black">
            Seek Wander
          </span>
          <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-black/40">
            Curated Luxury Itinerary
          </span>
        </div>
        <h1 className="font-serif italic text-5xl text-black leading-none">
          {itinerary.destination}
        </h1>
        <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-black/50 mt-2">
          {itinerary.days.length}&nbsp;{itinerary.days.length === 1 ? "Day" : "Days"}
        </p>
        <div className="mt-4 h-px bg-black/10" />
      </div>

      {/* Editorial opener */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 print:opacity-100"
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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex overflow-x-auto border-b border-ink/8 mb-8 -mx-6 md:-mx-10 px-6 md:px-10 scrollbar-none print:hidden"
      >
        {itinerary.days.map((day, i) => (
          <button
            key={day.day}
            onClick={() => setActiveDay(i)}
            className={`shrink-0 flex flex-col items-start pr-5 sm:pr-8 pb-3 pt-1 transition-all ${
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
      </motion.div>

      {/* ── SCREEN ONLY: Active day (animated on tab switch) ── */}
      <div className="print:hidden">
        <AnimatePresence mode="wait">
          {currentDay && (
            <motion.div
              key={activeDay}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <DaySection day={currentDay} transportMode={transportMode} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── PRINT ONLY: All days in sequence, each on a fresh page ── */}
      <div className="hidden print:block">
        {itinerary.days.map((day, i) => (
          <div
            key={`print-day-${day.day}`}
            className={`print:break-inside-avoid${i > 0 ? " print:break-before-page" : ""}`}
          >
            <DaySection day={day} transportMode={transportMode} />
          </div>
        ))}
      </div>

      {/* Custom bottom section — hidden in print (CTAs have no meaning on paper) */}
      <div className="print:hidden">
        {bottomSection}
      </div>
    </>
  );
}
