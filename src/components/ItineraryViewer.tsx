"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Gem,
  Star,
  ImageOff,
  Car,
  PersonStanding,
  Clock,
  CalendarCheck,
  Ticket,
} from "lucide-react";
import type {
  ItineraryResponse,
  DayPlan,
  Activity,
  DiningRec,
  TransitInfo,
} from "@/types/itinerary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDurationMins(duration: string): number | null {
  let total = 0;
  const hourMatch = duration.match(/(\d+)\s*(?:hour|hr)/i);
  const minMatch  = duration.match(/(\d+)\s*(?:minute|min)/i);
  if (hourMatch) total += parseInt(hourMatch[1]) * 60;
  if (minMatch)  total += parseInt(minMatch[1]);
  return total > 0 ? total : null;
}

function computeEndTime(startTime: string, duration: string): string | null {
  if (!startTime || !duration) return null;
  const parts = startTime.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const mins = parseDurationMins(duration);
  if (!mins) return null;
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatRatingCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000)      return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

// ─── Transit connector ────────────────────────────────────────────────────────

function TransitHeader({ transit }: { transit: TransitInfo }) {
  if (!transit?.walkingMinutes && !transit?.drivingMinutes) return null;
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
        {transit.walkingMinutes !== undefined && (
          <span className="flex items-center gap-1 micro-copy text-ink-light">
            <PersonStanding size={10} strokeWidth={1.5} />
            {transit.walkingMinutes}m Walk
          </span>
        )}
        {transit.walkingMinutes !== undefined && transit.drivingMinutes !== undefined && (
          <span className="micro-copy text-ink/20">·</span>
        )}
        {transit.drivingMinutes !== undefined && (
          <span className="flex items-center gap-1 micro-copy text-ink-light">
            <Car size={10} strokeWidth={1.5} />
            {transit.drivingMinutes}m Drive
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Location card ────────────────────────────────────────────────────────────

type LocationCardItem = {
  title?: string;
  name?: string;
  description?: string;
  cuisine?: string;
  duration: string;
  startTime?: string;
  category?: string;
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;
  priceLevel?: number;
  pricePoint?: string;
  reservation?: boolean;
  dietaryNote?: string;
};

function LocationCard({
  item,
  type,
  delay,
}: {
  item: LocationCardItem;
  type: "activity" | "dining";
  delay: number;
}) {
  const displayName = item.title ?? item.name ?? "";
  const displayDesc = item.description ?? item.cuisine ?? "";
  const endTime = item.startTime ? computeEndTime(item.startTime, item.duration) : null;

  // Cost & Access badge
  let costBadge: { label: string; className: string; icon?: ReactNode } | null = null;
  if (type === "activity") {
    if (item.priceLevel === 0) {
      costBadge = { label: "FREE ENTRY", className: "text-emerald-accent border-emerald-accent/30", icon: <Ticket size={9} strokeWidth={1.5} /> };
    } else if (item.priceLevel !== undefined && item.priceLevel >= 3) {
      costBadge = { label: "$$$ EXPERIENCE", className: "text-ink border-ink/20" };
    }
  } else {
    if (item.reservation) {
      costBadge = { label: "RES. REQUIRED", className: "text-ink-light border-ink/15", icon: <CalendarCheck size={9} strokeWidth={1.5} /> };
    } else if (item.pricePoint) {
      costBadge = { label: item.pricePoint, className: "text-ink-light border-ink/15" };
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className="flex border border-ink/8 bg-paper overflow-hidden print:break-inside-avoid print:opacity-100"
    >
      {/* Left: Photo */}
      <div className="w-36 md:w-48 shrink-0 relative bg-paper-dark self-stretch min-h-[140px] overflow-hidden print:w-28">
        {item.photoUrl ? (
          <Image
            src={item.photoUrl}
            alt={displayName}
            fill
            unoptimized
            className="object-cover img-grayscale"
            sizes="192px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageOff size={22} className="text-ink/15" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Right: Content */}
      <div className="flex flex-col flex-1 min-w-0 p-4 md:p-5">

        {/* Time + Category badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="font-sans text-xs text-ink-light leading-none print:text-black">
            {item.startTime ?? ""}
            {endTime ? ` — ${endTime}` : ""}
          </span>
          <span className="micro-copy border border-ink/12 px-2 py-0.5 shrink-0 text-ink-light print:text-black print:border-black/20">
            {type === "dining" ? "DINING" : (item.category ?? "EXPERIENCE")}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-serif italic text-xl md:text-2xl text-ink leading-tight mb-1.5 print:text-black">
          {displayName}
        </h4>

        {/* Hours + Open/Closed — hidden in print (real-time data not relevant on paper) */}
        {(item.hoursOpen || item.openNow !== undefined) && (
          <div className="flex items-center gap-2 mb-2 print:hidden">
            <Clock size={10} strokeWidth={1.5} className="text-ink-light shrink-0" />
            {item.hoursOpen ? (
              <span className="font-mono text-xs text-ink-light flex-1">{item.hoursOpen}</span>
            ) : (
              <span className="flex-1" />
            )}
            {item.openNow !== undefined && (
              <span className={`micro-copy shrink-0 ${item.openNow ? "text-emerald-accent" : "text-burnt-orange"}`}>
                {item.openNow ? "OPEN" : "CLOSED"}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <p className="font-sans text-xs md:text-sm text-ink-light leading-relaxed flex-1 mb-3 print:text-black">
          {displayDesc}
        </p>

        {/* Dietary note */}
        {item.dietaryNote && (
          <p className="font-sans text-xs text-emerald-accent leading-relaxed mb-2 border-l-2 border-emerald-accent/30 pl-2 print:text-black print:border-black/30">
            {item.dietaryNote}
          </p>
        )}

        {/* Bottom bar: duration · rating · cost badge */}
        <div className="flex flex-wrap items-center gap-3 border-t border-ink/5 pt-2.5 print:border-black/10">
          {item.duration && (
            <span className="micro-copy text-ink-light print:text-black">{item.duration}</span>
          )}
          {item.rating !== undefined && (
            <span className="flex items-center gap-1 micro-copy text-ink print:text-black">
              <Star size={10} fill="currentColor" strokeWidth={0} />
              {item.rating.toFixed(1)}
              {item.userRatingsTotal !== undefined && (
                <span className="text-ink-light print:text-black/60">
                  ({formatRatingCount(item.userRatingsTotal)})
                </span>
              )}
            </span>
          )}
          {costBadge && (
            <span className={`flex items-center gap-1 micro-copy border px-1.5 py-0.5 ${costBadge.className}`}>
              {costBadge.icon}
              {costBadge.label}
            </span>
          )}
        </div>
      </div>
    </motion.div>
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

function DaySection({ day }: { day: DayPlan }) {
  const activities = [day.morning, day.afternoon, day.evening].filter(Boolean);

  return (
    <div>
      {/* Day header */}
      <div className="flex items-start justify-between mb-4 pb-4 border-b border-ink/8 print:border-black/15">
        <div>
          <p className="micro-copy text-ink-light mb-1 print:text-black/50">Day {day.day}</p>
          <h3 className="font-serif italic text-3xl md:text-4xl text-ink leading-tight print:text-black">
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

      {/* Activity timeline */}
      <div className="flex flex-col gap-1">
        {activities.map((act: Activity, i) => (
          <div key={`act-${i}`} className="print:break-inside-avoid">
            {act?.transitFromPrevious && i > 0 && (
              <TransitHeader transit={act.transitFromPrevious} />
            )}
            <LocationCard
              item={act}
              type="activity"
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

        {/* Dining */}
        {day.dining?.length > 0 && (
          <div className="mt-1">
            <p className="micro-copy text-ink-light py-2 px-1 print:text-black/50">Dining</p>
            <div className="flex flex-col gap-1">
              {day.dining.map((d: DiningRec, i) => (
                <div key={`dining-${i}`} className="print:break-inside-avoid">
                  {d?.transitFromPrevious && (
                    <TransitHeader transit={d.transitFromPrevious} />
                  )}
                  <LocationCard
                    item={{ ...d, title: d.name, duration: "", startTime: undefined }}
                    type="dining"
                    delay={0.32 + i * 0.06}
                  />
                </div>
              ))}
            </div>
          </div>
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
}

export default function ItineraryViewer({ itinerary, bottomSection }: ItineraryViewerProps) {
  const [activeDay, setActiveDay] = useState(0);
  const currentDay = itinerary.days?.[activeDay];

  return (
    <>
      {/* Editorial opener */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 print:opacity-100"
      >
        <div className="w-8 h-px bg-burnt-orange mb-4 print:bg-black" />
        <blockquote className="font-serif italic text-xl md:text-2xl text-ink leading-relaxed print:text-black">
          &quot;{itinerary.editorial}&quot;
        </blockquote>
      </motion.div>

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
            className={`shrink-0 flex flex-col items-start pr-8 pb-3 pt-1 transition-all ${
              activeDay === i
                ? "border-b-2 border-burnt-orange"
                : "border-b-2 border-transparent hover:border-ink/20"
            }`}
          >
            <span className={`micro-copy ${activeDay === i ? "text-burnt-orange" : "text-ink-light"}`}>
              DAY {day.day}
            </span>
            <span
              className={`font-serif italic text-sm leading-tight mt-0.5 max-w-[140px] truncate ${
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
              <DaySection day={currentDay} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── PRINT ONLY: All days in sequence, each on a fresh page ── */}
      <div className="hidden print:block">
        {itinerary.days.map((day, i) => (
          <div
            key={`print-day-${day.day}`}
            className={i > 0 ? "print:break-before-page" : ""}
          >
            <DaySection day={day} />
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
