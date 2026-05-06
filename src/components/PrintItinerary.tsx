import type { ItineraryResponse, DayPlan, TimelineItem, TransitInfo } from "@/types/itinerary";
import { normalizeDayPlan, isMealType } from "@/lib/itineraryUtils";

// ─── Design tokens ────────────────────────────────────────────────────────────

const BEIGE = "#EDE8DC";
const INK   = "#0A0A0A";

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

/** Compact running header for day pages — logo left, wordmark right */
function PageHeader() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: `1px solid rgba(10,10,10,0.12)`,
      paddingBottom: 12,
      marginBottom: 28,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bee_compass_512_transparent.png"
        alt="TravalBee"
        loading="eager"
        style={{ width: 52, objectFit: "contain", display: "block", flexShrink: 0 }}
      />
      <span style={{
        fontSize: 10,
        letterSpacing: "0.45em",
        textTransform: "uppercase",
        fontWeight: 700,
        color: `rgba(10,10,10,0.45)`,
      }}>
        TRAVALBEE
      </span>
    </div>
  );
}

function PageFooter() {
  return (
    <div style={{
      borderTop: `1px solid rgba(10,10,10,0.08)`,
      paddingTop: 12,
      marginTop: 28,
      display: "flex",
      justifyContent: "center",
    }}>
      <a
        href="https://travalbee.com"
        style={{
          fontSize: 9,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: `rgba(10,10,10,0.4)`,
          textDecoration: "none",
        }}
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
        <div style={{ width: 1, height: 20, borderLeft: "1px dashed rgba(10,10,10,0.18)" }} />
      </div>
      <div className="flex items-center">
        <span style={{ fontSize: 9, color: `rgba(10,10,10,0.4)`, fontStyle: "italic" }}>
          {parts.join(" · ")}
        </span>
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
      style={{ padding: PAGE_PAD, backgroundColor: BEIGE }}
    >
      <PageHeader />

      {/* ── Day header ── */}
      <div style={{ borderBottom: `2px solid ${INK}`, paddingBottom: 20, marginBottom: 32 }}>
        <p style={{ fontSize: 10, letterSpacing: "0.35em", textTransform: "uppercase", color: "#C2410C", marginBottom: 12 }}>
          Day {day.day}
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
          <h2 className="font-serif" style={{ fontStyle: "italic", fontSize: 48, lineHeight: 1, color: INK, margin: 0 }}>
            {day.theme}
          </h2>
          <span style={{ fontSize: 10, letterSpacing: "0.35em", textTransform: "uppercase", color: `rgba(10,10,10,0.3)`, flexShrink: 0, marginBottom: 4 }}>
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
                className="grid break-inside-avoid"
                style={{
                  gridTemplateColumns: GRID_COLS,
                  gap: GRID_GAP,
                  borderTop: `1px solid rgba(10,10,10,0.12)`,
                  paddingTop: 20,
                  paddingBottom: 20,
                }}
              >
                {/* Time */}
                <div>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: `rgba(10,10,10,0.4)`, lineHeight: 1 }}>
                    {item.startTime ?? ""}
                  </span>
                </div>

                {/* Content */}
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
                    <h3 className="font-serif" style={{ fontStyle: "italic", fontSize: 22, lineHeight: 1.2, color: INK, margin: 0 }}>
                      {item.title}
                    </h3>
                    <span style={{ fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: `rgba(10,10,10,0.3)`, flexShrink: 0, marginTop: 6 }}>
                      {isMealType(item.type) ? item.type : (item.category ?? "activity")}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: `rgba(10,10,10,0.6)`, lineHeight: 1.65, marginBottom: 10 }}>
                    {item.description}
                  </p>
                  {(item.duration || item.rating !== undefined || item.pricePoint || item.dietaryNote) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 10, color: `rgba(10,10,10,0.4)` }}>
                      {item.duration && <span>{item.duration}</span>}
                      {item.rating !== undefined && (
                        <span>&#9733;&nbsp;{item.rating.toFixed(1)}</span>
                      )}
                      {item.pricePoint && <span>{item.pricePoint}</span>}
                      {item.dietaryNote && <span style={{ fontStyle: "italic" }}>{item.dietaryNote}</span>}
                    </div>
                  )}
                </div>

                {/* Photo */}
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={item.title}
                    loading="eager"
                    style={{ width: 80, height: 80, objectFit: "cover", display: "block" }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Hidden gem ── */}
      {day.hiddenGem && (
        <div style={{
          borderTop: `1px solid rgba(10,10,10,0.12)`,
          paddingTop: 24,
          marginTop: 16,
          breakInside: "avoid",
        }}>
          <p style={{ fontSize: 9, letterSpacing: "0.35em", textTransform: "uppercase", color: "#C2410C", marginBottom: 8 }}>
            Hidden Gem
          </p>
          <p style={{ fontSize: 13, color: `rgba(10,10,10,0.7)`, lineHeight: 1.65, fontStyle: "italic" }}>
            {day.hiddenGem}
          </p>
        </div>
      )}

      {/* ── Day map + legend ── */}
      {mapSrc && (
        <div style={{ marginTop: 32, breakInside: "avoid" }}>
          <p style={{ fontSize: 9, letterSpacing: "0.35em", textTransform: "uppercase", color: `rgba(10,10,10,0.4)`, marginBottom: 12 }}>
            Day {day.day} Map
          </p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapSrc}
            alt={`Day ${day.day} map`}
            loading="eager"
            style={{ width: "100%", height: "auto", display: "block", border: `1px solid rgba(10,10,10,0.08)` }}
          />

          {/* Legend — numbered markers matching the map */}
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 0, borderTop: `1px solid rgba(10,10,10,0.06)` }}>
            {items
              .filter(item => item.coordinates?.lat && item.coordinates?.lng)
              .map((item, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid rgba(10,10,10,0.04)` }}
                >
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 18, height: 18, borderRadius: "50%",
                    backgroundColor: "#C2410C", color: "#fff",
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  {item.startTime && (
                    <span style={{ fontSize: 9, color: `rgba(10,10,10,0.35)`, fontFamily: "monospace", flexShrink: 0, width: 36 }}>
                      {item.startTime}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: INK, fontStyle: "italic", flex: 1 }}>
                    {item.title}
                  </span>
                  <span style={{ fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: `rgba(10,10,10,0.3)`, flexShrink: 0 }}>
                    {isMealType(item.type) ? item.type : (item.category ?? "activity")}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Google Maps directions link ── */}
      {items.filter(item => item.coordinates?.lat && item.coordinates?.lng).length > 0 && (() => {
        const coordStr = items
          .filter(item => item.coordinates?.lat && item.coordinates?.lng)
          .map(item => `${item.coordinates.lat},${item.coordinates.lng}`)
          .join("/");
        const mapsUrl = `https://www.google.com/maps/dir/${coordStr}`;
        return (
          <div style={{ marginTop: 20, textAlign: "center", breakInside: "avoid" }}>
            <a
              href={mapsUrl}
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#C2410C",
                textDecoration: "underline",
                textDecorationColor: "rgba(194,65,12,0.45)",
                textUnderlineOffset: 3,
              }}
            >
              Open Day {day.day} in Google Maps →
            </a>
          </div>
        );
      })()}

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
    <div className="hidden print:block font-sans" style={{ backgroundColor: BEIGE, color: INK }}>

      {/* Kill browser chrome (URLs, dates, page numbers) */}
      <style>{`
        @media print {
          @page { margin: 0; }
        }
      `}</style>

      {/* ── COVER PAGE ── */}
      <div
        className="print:break-after-page"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          padding: PAGE_PAD,
          backgroundColor: BEIGE,
          color: INK,
        }}
      >
        {/* Minimal top strip — wordmark only, no logo (logo is in center block) */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid rgba(10,10,10,0.1)`,
          paddingBottom: 14,
        }}>
          <span style={{ fontSize: 9, letterSpacing: "0.5em", textTransform: "uppercase", fontWeight: 700, color: `rgba(10,10,10,0.35)` }}>
            TRAVALBEE
          </span>
          <span style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: `rgba(10,10,10,0.3)` }}>
            Bespoke Itinerary
          </span>
        </div>

        {/* ── Centre block ── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "48px 0",
        }}>

          {/* Logo — centred, prominent, directly above destination */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bee_compass_512_transparent.png"
            alt="TravalBee"
            loading="eager"
            style={{ width: 140, objectFit: "contain", display: "block", marginBottom: 20 }}
          />

          {/* Brand name below logo */}
          <p style={{
            fontSize: 9,
            letterSpacing: "0.55em",
            textTransform: "uppercase",
            fontWeight: 700,
            color: `rgba(10,10,10,0.4)`,
            marginBottom: 10,
          }}>
            TRAVALBEE
          </p>

          {/* Clickable site link — visible beneath wordmark */}
          <a
            href="https://travalbee.com"
            style={{
              fontSize: 13,
              letterSpacing: "0.08em",
              color: "#C2410C",
              textDecoration: "underline",
              textDecorationColor: "rgba(194,65,12,0.45)",
              textUnderlineOffset: 3,
              marginBottom: 40,
            }}
          >
            travalbee.com
          </a>

          {/* Thin rule separating brand from content */}
          <div style={{ width: 36, height: 1, backgroundColor: "#C2410C", marginBottom: 32 }} />

          {/* Kicker */}
          <p style={{
            fontSize: 9,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#C2410C",
            marginBottom: 20,
          }}>
            Your Bespoke Journey
          </p>

          {/* Destination — the hero type */}
          <h1 className="font-serif" style={{
            fontStyle: "italic",
            fontSize: 76,
            lineHeight: 0.95,
            color: INK,
            marginBottom: 20,
            letterSpacing: "-0.01em",
          }}>
            {itinerary.destination}
          </h1>

          {/* Dates */}
          {hasDates && (
            <p style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: `rgba(10,10,10,0.45)`,
              marginBottom: 6,
            }}>
              {formatDate(departureDate!)} &ndash; {formatDate(returnDate!)}
            </p>
          )}

          {/* Day count */}
          <p style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: `rgba(10,10,10,0.3)`,
            marginBottom: 36,
          }}>
            {itinerary.days.length}&nbsp;{itinerary.days.length === 1 ? "Day" : "Days"}
          </p>

          {/* Divider */}
          <div style={{ width: 36, height: 1, backgroundColor: "#C2410C", marginBottom: 32 }} />

          {/* Editorial quote */}
          <blockquote className="font-serif" style={{
            fontStyle: "italic",
            fontSize: 19,
            color: `rgba(10,10,10,0.6)`,
            lineHeight: 1.7,
            maxWidth: 460,
            margin: 0,
          }}>
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
