import type { ItineraryResponse, DayPlan, TimelineItem, TransitInfo } from "@/types/itinerary";
import { normalizeDayPlan, isMealType } from "@/lib/itineraryUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getFallbackImage(type: string): string {
  if (["breakfast", "lunch", "dinner", "snack", "drinks"].includes(type)) {
    return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80";
  }
  if (["MUSEUM", "CULTURE", "SHOPPING"].includes(type.toUpperCase())) {
    return "https://images.unsplash.com/photo-1518998053401-878c7356cecb?w=400&q=80";
  }
  if (["NATURE", "ADVENTURE", "WELLNESS"].includes(type.toUpperCase())) {
    return "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80";
  }
  return "https://images.unsplash.com/photo-1488646953014-85cb84e24328?w=400&q=80";
}

const GRID_COLS = "80px 1fr 80px";
const GRID_GAP  = "0 24px";

// Shared page padding — used on every page so margins are consistent
const PAGE_PAD = "20px 56px";

// ─── Shared header / footer ───────────────────────────────────────────────────

function PageHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.15)", paddingBottom: 12, marginBottom: 28 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bee_compass_512_transparent.png"
        alt="TravalBee"
        loading="eager"
        style={{ height: 60, width: 60, maxWidth: 60, maxHeight: 60, objectFit: "contain", display: "block", flexShrink: 0 }}
      />
      <span style={{ fontSize: 10, letterSpacing: "0.45em", textTransform: "uppercase", fontWeight: 700, color: "#0A0A0A" }}>
        TRAVALBEE
      </span>
    </div>
  );
}

function PageFooter() {
  return (
    <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 12, marginTop: 28, display: "flex", justifyContent: "center" }}>
      <a
        href="https://travalbee.com"
        style={{ fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(0,0,0,0.5)", textDecoration: "none" }}
      >
        travalbee.com
      </a>
    </div>
  );
}

// ─── Transit connector ────────────────────────────────────────────────────────

function TransitRow({ transit }: { transit: TransitInfo }) {
  const parts: string[] = [];
  if (transit.walkingMinutes  !== undefined) parts.push(`${transit.walkingMinutes} min walk`);
  if (transit.drivingMinutes  !== undefined) parts.push(`${transit.drivingMinutes} min drive`);
  if (parts.length === 0) return null;

  return (
    <div className="grid py-1" style={{ gridTemplateColumns: GRID_COLS, gap: GRID_GAP }}>
      <div className="flex justify-center">
        <div style={{ width: 1, height: 20, borderLeft: "1px dashed rgba(0,0,0,0.18)" }} />
      </div>
      <div className="flex items-center">
        <span className="text-[9px] text-black/40 italic">{parts.join(" · ")}</span>
      </div>
      <div />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PrintItineraryProps {
  itinerary: ItineraryResponse;
  departureDate?: string;
  returnDate?: string;
}

// ─── Day page ─────────────────────────────────────────────────────────────────

function PrintDayPage({ rawDay, isFirst }: { rawDay: DayPlan; isFirst: boolean }) {
  const day   = normalizeDayPlan(rawDay);
  const items = day.timeline ?? [];

  // Build static map URL from all timeline coordinates (filters out missing coords)
  const coordParams = items
    .filter(item => item.coordinates?.lat && item.coordinates?.lng)
    .map(item => `m=${item.coordinates.lat},${item.coordinates.lng}`)
    .join("&");
  const mapSrc = coordParams ? `/api/staticmap?${coordParams}` : null;

  return (
    <div
      className={isFirst ? "" : "print:break-before-page"}
      style={{ padding: PAGE_PAD, backgroundColor: "#fff" }}
    >
      <PageHeader />

      {/* ── Day header ── */}
      <div className="border-b-2 border-black pb-5 mb-8">
        <p className="text-xs tracking-widest uppercase text-black/40 mb-3">
          Day {day.day}
        </p>
        <div className="flex items-end justify-between gap-6">
          <h2 className="font-serif italic text-5xl leading-none text-black">
            {day.theme}
          </h2>
          <span className="text-xs tracking-widest uppercase text-black/30 shrink-0 mb-1">
            {day.pace}
          </span>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div>
        {items.map((item: TimelineItem, i: number) => {
          const imageUrl =
            item.photoReference
              ? `/api/photo?ref=${item.photoReference}`
              : item.photoUrl
              ?? getFallbackImage(item.category ?? item.type);

          return (
            <div key={i}>
              {i > 0 && item.transitFromPrevious && (
                <TransitRow transit={item.transitFromPrevious} />
              )}
              <div
                className="grid border-t border-black/20 py-5 break-inside-avoid"
                style={{ gridTemplateColumns: GRID_COLS, gap: GRID_GAP }}
              >
                <div>
                  <span className="font-mono text-[10px] text-black/40 leading-none">
                    {item.startTime ?? ""}
                  </span>
                </div>
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-serif italic text-2xl leading-tight text-black">
                      {item.title}
                    </h3>
                    <span className="text-[9px] tracking-widest uppercase text-black/30 shrink-0 mt-1.5">
                      {isMealType(item.type) ? item.type : (item.category ?? "activity")}
                    </span>
                  </div>
                  <p className="text-sm text-black/60 leading-relaxed mb-3">
                    {item.description}
                  </p>
                  {(item.duration || item.rating !== undefined || item.pricePoint || item.dietaryNote) && (
                    <div className="flex flex-row flex-wrap gap-3 text-[10px] text-black/40">
                      {item.duration && <span>{item.duration}</span>}
                      {item.rating !== undefined && (
                        <span>&#9733;&nbsp;{item.rating.toFixed(1)}</span>
                      )}
                      {item.pricePoint && <span>{item.pricePoint}</span>}
                      {item.dietaryNote && <span className="italic">{item.dietaryNote}</span>}
                    </div>
                  )}
                </div>
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={item.title}
                    loading="eager"
                    className="w-20 h-20 object-cover rounded-sm"
                    style={{ display: "block" }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Hidden gem ── */}
      {day.hiddenGem && (
        <div className="border-t border-black/20 pt-6 mt-4 break-inside-avoid">
          <p className="text-xs tracking-widest uppercase text-black/40 mb-2">Hidden Gem</p>
          <p className="font-sans text-sm text-black/70 leading-relaxed italic">
            {day.hiddenGem}
          </p>
        </div>
      )}

      {/* ── Day map + legend ── */}
      {mapSrc && (
        <div className="mt-8 break-inside-avoid">
          <p className="text-xs tracking-widest uppercase text-black/40 mb-3">Day {day.day} Map</p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapSrc}
            alt={`Day ${day.day} map`}
            loading="eager"
            style={{ width: "100%", height: "auto", display: "block", border: "1px solid rgba(0,0,0,0.08)" }}
          />

          {/* Legend — numbered markers matching the map */}
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 0, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            {items
              .filter(item => item.coordinates?.lat && item.coordinates?.lng)
              .map((item, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                >
                  {/* Burnt-orange circle matching map marker */}
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 18, height: 18, borderRadius: "50%",
                    backgroundColor: "#C2410C", color: "#fff",
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  {/* Time */}
                  {item.startTime && (
                    <span style={{ fontSize: 9, color: "rgba(0,0,0,0.35)", fontFamily: "monospace", flexShrink: 0, width: 36 }}>
                      {item.startTime}
                    </span>
                  )}
                  {/* Place name */}
                  <span style={{ fontSize: 11, color: "#0A0A0A", fontStyle: "italic", flex: 1 }}>
                    {item.title}
                  </span>
                  {/* Type badge */}
                  <span style={{ fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
                    {isMealType(item.type) ? item.type : (item.category ?? "activity")}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      <PageFooter />
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

      {/* Kill browser chrome (URLs, dates, page numbers) */}
      <style>{`
        @media print {
          @page { margin: 0; }
        }
      `}</style>

      {/* ── COVER PAGE ── */}
      <div
        className="print:break-after-page"
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: PAGE_PAD, backgroundColor: "#fff", color: "#000" }}
      >
        <PageHeader />

        {/* Centre block */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(0,0,0,0.35)", marginBottom: 18 }}>
            Your Bespoke Journey
          </p>

          <h1 className="font-serif" style={{ fontStyle: "italic", fontSize: 72, lineHeight: 1, color: "#000", marginBottom: 16 }}>
            {itinerary.destination}
          </h1>

          {hasDates && (
            <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.45)", marginBottom: 4 }}>
              {formatDate(departureDate!)} &ndash; {formatDate(returnDate!)}
            </p>
          )}

          <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.35)", marginBottom: 28 }}>
            {itinerary.days.length}&nbsp;{itinerary.days.length === 1 ? "Day" : "Days"}
          </p>

          <div style={{ width: 40, height: 1, backgroundColor: "rgba(0,0,0,0.2)", margin: "0 auto 28px" }} />

          <blockquote className="font-serif" style={{ fontStyle: "italic", fontSize: 20, color: "rgba(0,0,0,0.65)", lineHeight: 1.65, maxWidth: 440 }}>
            &quot;{itinerary.editorial}&quot;
          </blockquote>
        </div>

        <PageFooter />
      </div>

      {/* ── DAY PAGES ── */}
      {itinerary.days.map((day, i) => (
        <PrintDayPage key={day.day} rawDay={day} isFirst={i === 0} />
      ))}

    </div>
  );
}
