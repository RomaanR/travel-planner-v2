"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import type { MapPoint } from "@/types/itinerary";

// ─── Day-centric color palette ────────────────────────────────────────────────

const DAY_PALETTE: Record<number, { fill: string; stroke: string; label: string }> = {
  1:  { fill: "#D4AF7A", stroke: "#B8924A", label: "Day 1"  },  // Champagne
  2:  { fill: "#64748B", stroke: "#475569", label: "Day 2"  },  // Slate
  3:  { fill: "#1E293B", stroke: "#0F172A", label: "Day 3"  },  // Midnight
  4:  { fill: "#059669", stroke: "#047857", label: "Day 4"  },  // Emerald
  5:  { fill: "#E11D48", stroke: "#BE123C", label: "Day 5"  },  // Rose
  6:  { fill: "#7C3AED", stroke: "#6D28D9", label: "Day 6"  },  // Violet
  7:  { fill: "#0891B2", stroke: "#0E7490", label: "Day 7"  },  // Cyan
  8:  { fill: "#CA8A04", stroke: "#A16207", label: "Day 8"  },  // Amber
  9:  { fill: "#9A3412", stroke: "#7C2D12", label: "Day 9"  },  // Sienna
  10: { fill: "#0369A1", stroke: "#075985", label: "Day 10" },  // Ocean
  11: { fill: "#BE185D", stroke: "#9D174D", label: "Day 11" },  // Fuchsia
  12: { fill: "#15803D", stroke: "#166534", label: "Day 12" },  // Forest
  13: { fill: "#B45309", stroke: "#92400E", label: "Day 13" },  // Copper
  14: { fill: "#6366F1", stroke: "#4F46E5", label: "Day 14" },  // Indigo
};
const FALLBACK = { fill: "#6B6B6B", stroke: "#4a4a4a", label: "Day ?" };

function getDayColor(day: number) {
  return DAY_PALETTE[day] ?? FALLBACK;
}

// ─── Semantic icon SVG per activity type (16×16, white stroke) ────────────────

function getIconSvg(type: string): string {
  const s = `stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  switch (type) {
    case "breakfast":
      // Coffee mug with steam lines
      return `<g ${s}>
        <path d="M10 5h1a2.5 2.5 0 0 1 0 5h-1"/>
        <path d="M2 5h8v4.5a4 4 0 0 1-8 0V5z"/>
        <line x1="4" y1="1" x2="4" y2="3"/>
        <line x1="8" y1="0" x2="8" y2="2"/>
      </g>`;
    case "lunch":
      // Fork (left) + knife (right)
      return `<g ${s}>
        <line x1="4" y1="1" x2="4" y2="15"/>
        <path d="M2 1v4c0 1.1.9 2 2 2s2-.9 2-2V1"/>
        <path d="M12 8V1a3 3 0 0 0-3 3v3c0 .6.4 1 1 1h2zm0 0v7"/>
      </g>`;
    case "dinner":
    case "drinks":
      // Wine glass: funnel top, stem, base
      return `<g ${s}>
        <path d="M3 2h10L11 7a3 3 0 0 1-6 0L3 2z"/>
        <line x1="8" y1="10" x2="8" y2="14"/>
        <line x1="5" y1="14" x2="11" y2="14"/>
      </g>`;
    case "activity":
      // Camera: body rectangle + lens circle + top notch
      return `<g ${s}>
        <path d="M1 6h14v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6z"/>
        <path d="M5 6l1.5-2h3L11 6"/>
        <circle cx="8" cy="10" r="2.5"/>
      </g>`;
    case "hotel":
    case "accommodation":
      // Bed: headboard + mattress + pillow
      return `<g ${s}>
        <line x1="2" y1="4" x2="2" y2="14"/>
        <path d="M2 9h12v5"/>
        <line x1="2" y1="13" x2="14" y2="13"/>
        <path d="M5 9V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </g>`;
    default:
      // Map pin: teardrop + dot
      return `<g ${s}>
        <path d="M8 1a5 5 0 0 1 5 5c0 4-5 9-5 9S3 10 3 6a5 5 0 0 1 5-5z"/>
        <circle cx="8" cy="6" r="1.5" fill="white" stroke="none"/>
      </g>`;
  }
}

// Build an inline SVG marker: day-colored circle + semantic type icon
function buildSvgMarker(day: number, type: string): string {
  const { fill } = getDayColor(day);
  const icon = getIconSvg(type);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="${fill}" stroke="white" stroke-width="2"/>
    <g transform="translate(8,8)">${icon}</g>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// ─── Grayscale editorial map style ────────────────────────────────────────────

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ saturation: -100 }, { lightness: 5 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a4a4a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f0e8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#d8d3c8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#c8c3b8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#b8d0d8" }, { saturation: -60 }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d0d8c8" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "simplified" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c0b8a8" }] },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ItineraryMapProps {
  center: { lat: number; lng: number };
  points: MapPoint[];
}

const LIBRARIES: ("places")[] = ["places"];

// ─── Shared button class helpers ──────────────────────────────────────────────

const pillActive = "bg-burnt-orange text-white rounded-full px-4 py-1 text-[10px] tracking-widest uppercase shadow-sm transition-all";
const pillInactive = "text-white/50 hover:text-white/80 px-3 py-1 text-[10px] tracking-widest uppercase transition-all";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ItineraryMap({ center, points }: ItineraryMapProps) {
  const [activeMarker, setActiveMarker] = useState<number | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeDay, setActiveDay] = useState<number | "all">("all");

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  // Derive unique day numbers present in the full points array (drives pill tabs)
  const visibleDays = useMemo(
    () => Array.from(new Set(points.map((p) => p.day))).sort((a, b) => a - b),
    [points]
  );

  // Filtered points — memoized for safe use in useEffect dependency array
  const filteredPoints = useMemo(
    () => (activeDay === "all" ? points : points.filter((p) => p.day === activeDay)),
    [activeDay, points]
  );

  // Initial fit on map load
  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
    if (points.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      m.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [points]);

  const onUnmount = useCallback(() => setMap(null), []);

  // Re-center map whenever the active day filter changes
  useEffect(() => {
    if (!map || filteredPoints.length === 0) return;

    if (filteredPoints.length === 1) {
      // Single point: center + comfortable city-level zoom to avoid max-zoom stretch
      map.setCenter({ lat: filteredPoints[0].lat, lng: filteredPoints[0].lng });
      map.setZoom(14);
    } else {
      const bounds = new window.google.maps.LatLngBounds();
      filteredPoints.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [activeDay, filteredPoints, map]);

  if (loadError) {
    return (
      <div className="w-full h-full bg-paper-dark flex items-center justify-center">
        <p className="micro-copy text-ink-light">Map unavailable</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-paper-dark flex items-center justify-center">
        <p className="micro-copy text-ink-light animate-pulse">Loading map&hellip;</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">

      {/* ── Day filter pill ─────────────────────────────────────────────────── */}
      {/*
        Cloning the exact scroll mechanics from ItineraryViewer's working tab bar:
        - overflow-hidden on the outer pill clips content to max-w boundary
        - flex overflow-x-auto inner track scrolls when content exceeds clip box
        - flex-none shrink-0 on every button is the critical invariant — forbids
          the browser from squishing any pill, so maxScrollLeft is always correct
        - No motion.div (Framer can miscalculate hidden-overflow children widths)
      */}
      {visibleDays.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-2rem)] overflow-hidden rounded-full shadow-lg bg-black/90 backdrop-blur-md border border-white/10">
          <div className="flex overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch] px-2 py-1 gap-1">
            <button
              onClick={() => { setActiveDay("all"); setActiveMarker(null); }}
              className={`flex-none shrink-0 ${activeDay === "all" ? pillActive : pillInactive}`}
            >
              All
            </button>
            {visibleDays.map((day) => (
              <button
                key={day}
                onClick={() => { setActiveDay(day); setActiveMarker(null); }}
                className={`flex-none shrink-0 ${activeDay === day ? pillActive : pillInactive}`}
              >
                Day {day}
              </button>
            ))}
          </div>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
        }}
      >
        {/* Subtle polyline connecting filtered points in order */}
        {filteredPoints.length > 1 && (
          <Polyline
            path={filteredPoints.map((p) => ({ lat: p.lat, lng: p.lng }))}
            options={{
              strokeColor: "#0A0A0A",
              strokeOpacity: 0.08,
              strokeWeight: 1,
              geodesic: true,
            }}
          />
        )}

        {/* Markers — filtered by active day, colored by day */}
        {filteredPoints.map((point, i) => (
          <Marker
            key={`day${point.day}-${point.type}-${i}`}
            position={{ lat: point.lat, lng: point.lng }}
            icon={{
              url: buildSvgMarker(point.day, point.type),
              scaledSize: new window.google.maps.Size(32, 32),
              anchor: new window.google.maps.Point(16, 16),
            }}
            onClick={() => setActiveMarker(activeMarker === i ? null : i)}
            title={point.label}
          >
            {activeMarker === i && (
              <InfoWindow
                position={{ lat: point.lat, lng: point.lng }}
                onCloseClick={() => setActiveMarker(null)}
                options={{ disableAutoPan: false }}
              >
                <div
                  style={{
                    fontFamily: "DM Sans, system-ui, sans-serif",
                    fontSize: "11px",
                    color: "#0A0A0A",
                    padding: "2px 4px",
                    minWidth: "120px",
                    maxWidth: "200px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "9px",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      color: "#6B6B6B",
                      marginBottom: "3px",
                    }}
                  >
                    Day {point.day} &middot; {point.type.charAt(0).toUpperCase() + point.type.slice(1)}
                  </div>
                  <div style={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {point.label}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>

      {/* Legend overlay — day-centric (always shows all days) */}
      {visibleDays.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-paper/90 backdrop-blur-sm border border-ink/8 px-4 py-3 flex flex-col gap-1.5">
          {visibleDays.map((day) => {
            const { fill, stroke, label } = getDayColor(day);
            return (
              <div key={day} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 shrink-0"
                  style={{
                    backgroundColor: fill,
                    border: `1.5px solid ${stroke}`,
                  }}
                />
                <span
                  style={{
                    fontFamily: "DM Sans, system-ui",
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    color: "#6B6B6B",
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
