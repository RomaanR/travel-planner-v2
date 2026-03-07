"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Gem,
  Loader2,
  ArrowLeft,
  BookmarkPlus,
  AlertCircle,
  Star,
  ImageOff,
  Car,
  PersonStanding,
} from "lucide-react";
import { useItinerary } from "@/hooks/useItinerary";
import type {
  ItineraryRequest,
  DayPlan,
  Activity,
  DiningRec,
  MapPoint,
  TransitInfo,
} from "@/types/itinerary";
import Navbar from "@/components/Navbar";
import ItineraryMap from "@/components/ItineraryMap";

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

// ─── Transit header ───────────────────────────────────────────────────────────

function TransitHeader({ transit }: { transit: TransitInfo }) {
  if (!transit.walkingMinutes && !transit.drivingMinutes) return null;
  return (
    <div className="flex items-center gap-4 py-2 px-1">
      <div className="flex-1 h-px bg-ink/5" />
      <div className="flex items-center gap-3 shrink-0">
        {transit.walkingMinutes !== undefined && (
          <span className="flex items-center gap-1 micro-copy text-ink-light">
            <PersonStanding size={11} strokeWidth={1.5} />
            {transit.walkingMinutes} MIN WALK
          </span>
        )}
        {transit.walkingMinutes !== undefined && transit.drivingMinutes !== undefined && (
          <span className="micro-copy text-ink/20">·</span>
        )}
        {transit.drivingMinutes !== undefined && (
          <span className="flex items-center gap-1 micro-copy text-ink-light">
            <Car size={11} strokeWidth={1.5} />
            {transit.drivingMinutes} MIN DRIVE
          </span>
        )}
      </div>
      <div className="flex-1 h-px bg-ink/5" />
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
  const displayName = item.title || item.name || "";
  const displayDesc = item.description || item.cuisine || "";
  const endTime = item.startTime ? computeEndTime(item.startTime, item.duration) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className="flex border border-ink/8 bg-paper overflow-hidden"
    >
      {/* Left: Photo */}
      <div className="w-36 md:w-48 shrink-0 relative bg-paper-dark self-stretch min-h-[140px] overflow-hidden">
        {item.photoUrl ? (
          <Image
            src={item.photoUrl}
            alt={displayName}
            fill
            unoptimized  // Google Places photo URLs are pre-sized redirect URLs
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
          <span className="font-sans text-xs text-ink-light leading-none">
            {item.startTime ?? ""}
            {endTime ? ` — ${endTime}` : ""}
          </span>
          <span className="micro-copy border border-ink/12 px-2 py-0.5 shrink-0 text-ink-light">
            {type === "dining" ? "DINING" : (item.category || "EXPERIENCE")}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-serif italic text-xl md:text-2xl text-ink leading-tight mb-2">
          {displayName}
        </h4>

        {/* Description */}
        <p className="font-sans text-xs md:text-sm text-ink-light leading-relaxed flex-1 mb-3">
          {displayDesc}
        </p>

        {/* Dietary note (if present) */}
        {item.dietaryNote && (
          <p className="font-sans text-xs text-emerald-accent leading-relaxed mb-2 border-l-2 border-emerald-accent/30 pl-2">
            {item.dietaryNote}
          </p>
        )}

        {/* Bottom bar: duration · rating · open status */}
        <div className="flex flex-wrap items-center gap-3 border-t border-ink/5 pt-2.5">
          <span className="micro-copy text-ink-light">{item.duration}</span>

          {item.rating !== undefined && (
            <span className="flex items-center gap-1 micro-copy text-ink">
              <Star size={10} fill="currentColor" strokeWidth={0} className="text-ink" />
              {item.rating.toFixed(1)}
              {item.userRatingsTotal !== undefined && (
                <span className="text-ink-light">
                  ({formatRatingCount(item.userRatingsTotal)})
                </span>
              )}
            </span>
          )}

          {item.openNow !== undefined && (
            <span
              className={`micro-copy ${
                item.openNow ? "text-emerald-accent" : "text-burnt-orange"
              }`}
            >
              {item.openNow ? "OPEN NOW" : "CLOSED"}
            </span>
          )}

          {type === "dining" && item.reservation && (
            <span className="micro-copy text-ink-light">Res. Required</span>
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

function DaySection({ day, baseDelay }: { day: DayPlan; baseDelay: number }) {
  const activities = [day.morning, day.afternoon, day.evening];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: baseDelay }}
    >
      {/* Day header */}
      <div className="flex items-start justify-between mb-4 pb-4 border-b border-ink/8">
        <div>
          <p className="micro-copy text-ink-light mb-1">Day {day.day}</p>
          <h3 className="font-serif italic text-3xl md:text-4xl text-ink leading-tight">
            {day.theme}
          </h3>
        </div>
        <span
          className={`micro-copy border px-3 py-1.5 mt-1 shrink-0 ml-4 ${
            PACE_COLORS[day.pace] || "text-ink border-ink"
          }`}
        >
          {PACE_LABELS[day.pace] || day.pace}
        </span>
      </div>

      {/* Activity timeline */}
      <div className="flex flex-col gap-1">
        {activities.map((act: Activity, i) => (
          <div key={`act-${i}`}>
            {act.transitFromPrevious && i > 0 && (
              <TransitHeader transit={act.transitFromPrevious} />
            )}
            <LocationCard
              item={act}
              type="activity"
              delay={baseDelay + 0.06 * (i + 1)}
            />
          </div>
        ))}

        {/* Hidden gem */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 0.28 }}
          className="flex items-start gap-3 border border-emerald-accent/20 bg-emerald-accent/3 px-4 py-3 mt-1"
        >
          <Gem
            size={13}
            strokeWidth={1.5}
            className="text-emerald-accent shrink-0 mt-0.5"
          />
          <div>
            <span className="micro-copy text-emerald-accent block mb-1">
              Hidden Gem
            </span>
            <p className="font-sans text-sm text-ink leading-relaxed">
              {day.hiddenGem}
            </p>
          </div>
        </motion.div>

        {/* Dining */}
        {day.dining.length > 0 && (
          <div className="mt-1">
            <p className="micro-copy text-ink-light py-2 px-1">Dining</p>
            <div className="flex flex-col gap-1">
              {day.dining.map((d: DiningRec, i) => (
                <div key={`dining-${i}`}>
                  {d.transitFromPrevious && (
                    <TransitHeader transit={d.transitFromPrevious} />
                  )}
                  <LocationCard
                    item={{ ...d, title: d.name, duration: "", startTime: undefined }}
                    type="dining"
                    delay={baseDelay + 0.32 + i * 0.06}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ItineraryPage() {
  const router = useRouter();
  const { itinerary, loading, error, generateItinerary } = useItinerary();
  const [destination, setDestination] = useState("");
  const [mapCenter, setMapCenter] = useState({ lat: 35.6762, lng: 139.6503 });

  useEffect(() => {
    const stored = sessionStorage.getItem("itineraryRequest");
    if (!stored) { router.push("/"); return; }
    const data: ItineraryRequest = JSON.parse(stored);
    setDestination(data.destination);
    setMapCenter({ lat: data.lat, lng: data.lng });
    generateItinerary(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapPoints = useMemo<MapPoint[]>(() => {
    if (!itinerary) return [];
    return itinerary.days.flatMap((day) => {
      const pts: MapPoint[] = [
        { type: "morning",   label: day.morning.title,   day: day.day, ...day.morning.coordinates },
        { type: "afternoon", label: day.afternoon.title, day: day.day, ...day.afternoon.coordinates },
        { type: "evening",   label: day.evening.title,   day: day.day, ...day.evening.coordinates },
        { type: "gem",       label: day.hiddenGem.split("—")[0].trim(), day: day.day, ...day.hiddenGemCoordinates },
        ...day.dining.map((d) => ({
          type: "dining" as const,
          label: d.name,
          day: day.day,
          ...d.coordinates,
        })),
      ];
      return pts.filter((p) => p.lat && p.lng);
    });
  }, [itinerary]);

  return (
    <div className="h-screen flex flex-col bg-paper overflow-hidden">
      <Navbar />

      {/* Header strip */}
      <div className="shrink-0 pt-20 pb-5 px-6 md:px-10 border-b border-ink/5 bg-paper-dark">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 micro-copy text-ink-light hover:text-ink transition-colors mb-3"
        >
          <ArrowLeft size={13} />
          New Destination
        </button>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between"
        >
          <div>
            <p className="micro-copy text-ink-light mb-1">Bespoke Itinerary</p>
            <h1 className="font-serif italic text-4xl md:text-6xl text-ink leading-none">
              {destination || "Loading…"}
            </h1>
          </div>
          {itinerary && (
            <button className="hidden md:flex items-center gap-2 micro-copy border border-ink/20 px-4 py-2.5 hover:bg-ink hover:text-paper transition-all">
              <BookmarkPlus size={13} />
              Save
            </button>
          )}
        </motion.div>
      </div>

      {/* Split-screen */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT: Scrollable timeline */}
        <div className="w-full md:w-[55%] overflow-y-auto">

          {/* Mobile map banner */}
          <div className="md:hidden h-52 w-full border-b border-ink/5">
            <ItineraryMap center={mapCenter} points={mapPoints} />
          </div>

          <div className="px-6 md:px-10 py-8">

            {/* Loading */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 gap-5"
              >
                <Loader2 size={28} className="animate-spin text-burnt-orange" strokeWidth={1} />
                <p className="font-serif italic text-3xl text-ink">
                  Curating your journey…
                </p>
                <p className="micro-copy text-ink-light">
                  Sourcing locations, photos, ratings and transit times
                </p>
              </motion.div>
            )}

            {/* Error */}
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border border-burnt-orange/20 bg-burnt-orange/5 px-6 py-6"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-burnt-orange shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="font-serif italic text-2xl text-ink mb-1">
                      Something went wrong
                    </p>
                    <p className="micro-copy text-ink-light mb-4">{error}</p>
                    <button
                      onClick={() => router.push("/")}
                      className="micro-copy border border-ink/20 px-5 py-2.5 hover:bg-ink hover:text-paper transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Itinerary */}
            {itinerary && !loading && (
              <>
                {/* Editorial opener */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="mb-10"
                >
                  <div className="w-8 h-px bg-burnt-orange mb-4" />
                  <blockquote className="font-serif italic text-xl md:text-2xl text-ink leading-relaxed">
                    &quot;{itinerary.editorial}&quot;
                  </blockquote>
                </motion.div>

                {/* Day sections */}
                <div className="flex flex-col gap-10">
                  {itinerary.days.map((day, i) => (
                    <DaySection key={day.day} day={day} baseDelay={i * 0.1} />
                  ))}
                </div>

                {/* Bottom CTA */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-14 border-t border-ink/5 pt-10 text-center pb-10"
                >
                  <p className="font-serif italic text-3xl text-ink mb-4">
                    Explore another destination?
                  </p>
                  <button
                    onClick={() => router.push("/")}
                    className="micro-copy bg-burnt-orange text-white px-8 py-4 hover:bg-ink transition-colors"
                  >
                    Curate a New Journey
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Sticky map */}
        <div className="hidden md:block w-[45%] border-l border-ink/5 h-full">
          <ItineraryMap center={mapCenter} points={mapPoints} />
        </div>

      </div>
    </div>
  );
}
