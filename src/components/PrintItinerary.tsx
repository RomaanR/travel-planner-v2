import type { ItineraryResponse, DayPlan, TimelineItem } from "@/types/itinerary";
import { normalizeDayPlan, isMealType } from "@/lib/itineraryUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  // T12:00:00 prevents off-by-one UTC midnight rollback on ISO date strings
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PrintItineraryProps {
  itinerary: ItineraryResponse;
  departureDate?: string; // ISO YYYY-MM-DD
  returnDate?: string;    // ISO YYYY-MM-DD
}

// ─── Print-only day page ──────────────────────────────────────────────────────

function PrintDayPage({
  rawDay,
  isFirst,
}: {
  rawDay: DayPlan;
  isFirst: boolean;
}) {
  const day = normalizeDayPlan(rawDay);
  const items = day.timeline ?? [];

  return (
    <div className={isFirst ? "" : "print:break-before-page"}>
      {/* Day header */}
      <div className="border-b-2 border-black pb-4 mb-8">
        <p className="text-[10px] tracking-[0.3em] uppercase text-black/40 mb-1.5">
          Day {day.day}
        </p>
        <div className="flex items-end justify-between gap-6">
          <h2 className="font-serif italic text-4xl leading-none text-black">
            {day.theme}
          </h2>
          <span className="text-[10px] tracking-[0.2em] uppercase text-black/30 shrink-0 mb-1">
            {day.pace}
          </span>
        </div>
      </div>

      {/* Timeline rows */}
      <div>
        {items.map((item: TimelineItem, i: number) => (
          <div
            key={i}
            className="border-t border-black/10 py-5 break-inside-avoid"
          >
            <div className="flex items-start gap-6">
              {/* Time column */}
              <span className="font-mono text-[10px] text-black/40 w-14 shrink-0 pt-1">
                {item.startTime ?? ""}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-start justify-between gap-4 mb-1.5">
                  <h3 className="font-serif italic text-xl leading-tight text-black">
                    {item.title}
                  </h3>
                  <span className="text-[9px] tracking-[0.2em] uppercase text-black/30 shrink-0 mt-1.5">
                    {isMealType(item.type)
                      ? item.type
                      : (item.category ?? "activity")}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-black/60 leading-relaxed mb-2">
                  {item.description}
                </p>

                {/* Meta row */}
                {(item.duration || item.rating !== undefined || item.pricePoint || item.dietaryNote) && (
                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-black/40">
                    {item.duration && <span>{item.duration}</span>}
                    {item.rating !== undefined && (
                      <span>&#9733; {item.rating.toFixed(1)}</span>
                    )}
                    {item.pricePoint && <span>{item.pricePoint}</span>}
                    {item.dietaryNote && (
                      <span className="italic">{item.dietaryNote}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hidden gem */}
      {day.hiddenGem && (
        <div className="border-t border-black/10 pt-5 mt-6 break-inside-avoid">
          <p className="text-[10px] tracking-[0.3em] uppercase text-black/40 mb-2">
            Hidden Gem
          </p>
          <p className="font-sans text-sm text-black/70 leading-relaxed italic">
            {day.hiddenGem}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── PrintItinerary ───────────────────────────────────────────────────────────

export default function PrintItinerary({
  itinerary,
  departureDate,
  returnDate,
}: PrintItineraryProps) {
  const hasDates = !!departureDate && !!returnDate;

  return (
    <div className="hidden print:block bg-white text-black font-sans">

      {/* ── COVER PAGE ───────────────────────────────────────────────────── */}
      <div className="print:break-after-page min-h-screen flex flex-col justify-between">

        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-black/20 pb-4">
          <span className="text-[10px] tracking-[0.4em] uppercase font-bold text-black">
            Curated Roam
          </span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-black/40">
            Curated Luxury Itinerary
          </span>
        </div>

        {/* Centre block */}
        <div className="flex-1 flex flex-col justify-center py-20">
          <p className="text-[10px] tracking-[0.3em] uppercase text-black/40 mb-6">
            Your Bespoke Journey
          </p>

          {/* Destination — giant serif */}
          <h1
            className="font-serif italic leading-none text-black mb-6"
            style={{ fontSize: "clamp(4rem, 12vw, 8rem)" }}
          >
            {itinerary.destination}
          </h1>

          {/* Dates */}
          {hasDates && (
            <p className="text-sm tracking-[0.1em] uppercase text-black/50 mb-1">
              {formatDate(departureDate!)} &ndash; {formatDate(returnDate!)}
            </p>
          )}

          {/* Day count */}
          <p className="text-sm tracking-[0.1em] uppercase text-black/50">
            {itinerary.days.length}&nbsp;
            {itinerary.days.length === 1 ? "Day" : "Days"}
          </p>

          {/* Thin rule */}
          <div className="w-12 h-px bg-black/25 my-8" />

          {/* Editorial quote */}
          <blockquote className="font-serif italic text-2xl text-black/70 leading-relaxed max-w-xl">
            &quot;{itinerary.editorial}&quot;
          </blockquote>
        </div>

        {/* Footer */}
        <div className="border-t border-black/10 pt-4">
          <p className="text-[9px] tracking-[0.2em] uppercase text-black/30">
            curatedroam.com
          </p>
        </div>
      </div>

      {/* ── DAY PAGES ────────────────────────────────────────────────────── */}
      {itinerary.days.map((day, i) => (
        <PrintDayPage key={day.day} rawDay={day} isFirst={i === 0} />
      ))}

    </div>
  );
}
