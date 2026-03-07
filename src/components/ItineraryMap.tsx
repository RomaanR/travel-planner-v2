"use client";

import { useState, useCallback } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import type { MapPoint, MapPointType } from "@/types/itinerary";

// ─── Marker colors by activity type ─────────────────────────────────────────

const MARKER_COLORS: Record<MapPointType, string> = {
  morning: "#F59E0B",    // amber
  afternoon: "#C2410C",  // burnt-orange
  evening: "#6366F1",    // indigo
  dining: "#059669",     // emerald
  gem: "#F5F0E8",        // paper (white-ish, with ink border)
};

const MARKER_BORDER: Record<MapPointType, string> = {
  morning: "#B45309",
  afternoon: "#9A3412",
  evening: "#4338CA",
  dining: "#047857",
  gem: "#0A0A0A",
};

// Build an inline SVG dot marker for each type
function buildSvgMarker(type: MapPointType): string {
  const fill = MARKER_COLORS[type];
  const stroke = MARKER_BORDER[type];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
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

// ─── Type labels ─────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<MapPointType, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  dining: "Dining",
  gem: "Hidden Gem",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ItineraryMapProps {
  center: { lat: number; lng: number };
  points: MapPoint[];
}

const LIBRARIES: ("places")[] = ["places"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ItineraryMap({ center, points }: ItineraryMapProps) {
  const [activeMarker, setActiveMarker] = useState<number | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
    // Fit bounds to all markers if we have points
    if (points.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      m.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [points]);

  const onUnmount = useCallback(() => setMap(null), []);

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
        <p className="micro-copy text-ink-light animate-pulse">Loading map…</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
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
        {/* Subtle polyline connecting all points in order */}
        {points.length > 1 && (
          <Polyline
            path={points.map((p) => ({ lat: p.lat, lng: p.lng }))}
            options={{
              strokeColor: "#0A0A0A",
              strokeOpacity: 0.08,
              strokeWeight: 1,
              geodesic: true,
            }}
          />
        )}

        {/* Markers */}
        {points.map((point, i) => (
          <Marker
            key={`${point.type}-${i}`}
            position={{ lat: point.lat, lng: point.lng }}
            icon={{
              url: buildSvgMarker(point.type),
              scaledSize: new window.google.maps.Size(24, 24),
              anchor: new window.google.maps.Point(12, 12),
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
                    Day {point.day} · {TYPE_LABELS[point.type]}
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

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 bg-paper/90 backdrop-blur-sm border border-ink/8 px-4 py-3 flex flex-col gap-1.5">
        {(Object.entries(TYPE_LABELS) as [MapPointType, string][]).map(
          ([type, label]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 shrink-0"
                style={{
                  backgroundColor: MARKER_COLORS[type],
                  border: `1.5px solid ${MARKER_BORDER[type]}`,
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
          )
        )}
      </div>
    </div>
  );
}
