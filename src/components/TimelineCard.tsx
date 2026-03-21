import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  ImageOff,
  Utensils,
  Star,
  Clock,
  CalendarCheck,
  Ticket,
} from "lucide-react";
import type { TimelineItem } from "@/types/itinerary";
import { isMealType } from "@/lib/itineraryUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDurationMins(duration: string): number | null {
  let total = 0;
  const hourMatch = duration.match(/(\d+)\s*(?:hour|hr)/i);
  const minMatch  = duration.match(/(\d+)\s*(?:minute|min)/i);
  if (hourMatch) total += parseInt(hourMatch[1]) * 60;
  if (minMatch)  total += parseInt(minMatch[1]);
  return total > 0 ? total : null;
}

function computeEndTime(startTime: string | undefined, duration: string): string | null {
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimelineCardProps {
  item:  TimelineItem;
  delay: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimelineCard({ item, delay }: TimelineCardProps) {
  const displayName = item.title ?? "";
  const displayDesc = item.description ?? item.cuisine ?? "";
  const endTime     = item.startTime ? computeEndTime(item.startTime, item.duration) : null;
  const isMeal      = isMealType(item.type);

  // Cost & access badge
  let costBadge: { label: string; className: string; icon?: ReactNode } | null = null;
  if (!isMeal) {
    if (item.priceLevel === 0) {
      costBadge = {
        label:     "FREE ENTRY",
        className: "text-emerald-accent border-emerald-accent/30",
        icon:      <Ticket size={9} strokeWidth={1.5} />,
      };
    } else if (item.priceLevel !== undefined && item.priceLevel >= 3) {
      costBadge = { label: "$$$ EXPERIENCE", className: "text-ink border-ink/20" };
    }
  } else {
    if (item.reservation) {
      costBadge = {
        label:     "RES. REQUIRED",
        className: "text-ink-light border-ink/15",
        icon:      <CalendarCheck size={9} strokeWidth={1.5} />,
      };
    } else if (item.pricePoint) {
      costBadge = { label: item.pricePoint, className: "text-ink-light border-ink/15" };
    }
  }

  const typeBadge = isMeal ? item.type.toUpperCase() : (item.category ?? "EXPERIENCE");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className="flex flex-col md:flex-row -mx-6 md:mx-0 border-y md:border border-ink/8 bg-paper overflow-hidden print:border print:mx-0 print:flex-row print:break-inside-avoid print:opacity-100"
    >
      {/* Left: Photo */}
      <div className="w-full md:w-48 md:shrink-0 relative self-stretch min-h-[200px] md:min-h-[140px] overflow-hidden bg-paper-dark print:w-28 print:min-h-[140px]">
        {/* photoReference (new) → /api/photo proxy → Vercel CDN cached, key never reaches browser.
            photoUrl (legacy) → direct Google URL on old saved trips — backward compat only. */}
        {(item.photoReference || item.photoUrl) ? (
          <Image
            src={item.photoReference ? `/api/photo?ref=${item.photoReference}` : item.photoUrl!}
            alt={displayName}
            fill
            loading="lazy"
            quality={95}
            className="object-cover img-grayscale"
            sizes="(max-width: 768px) 100vw, 192px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {isMeal
              ? <Utensils size={22} className="text-ink/15" strokeWidth={1} />
              : <ImageOff  size={22} className="text-ink/15" strokeWidth={1} />
            }
          </div>
        )}
      </div>

      {/* Right: Content */}
      <div className="flex flex-col flex-1 min-w-0 px-6 py-4 md:p-5">

        {/* Time + Type badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="font-sans text-xs text-ink-light leading-none print:text-black">
            {item.startTime ?? ""}
            {endTime ? ` — ${endTime}` : ""}
          </span>
          <span className="micro-copy border border-ink/12 px-2 py-0.5 shrink-0 text-ink-light print:text-black print:border-black/20">
            {typeBadge}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-serif italic text-base sm:text-xl md:text-2xl text-ink leading-tight mb-1.5 print:text-black print:text-lg">
          {displayName}
        </h4>

        {/* Hours + Open/Closed — hidden in print */}
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
        <p className="font-sans text-xs md:text-sm text-ink-light leading-relaxed line-clamp-3 flex-1 mb-3 print:text-black print:text-xs">
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
