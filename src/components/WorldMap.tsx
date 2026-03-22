"use client";

import { useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DestinationPin = {
  id:          string;
  destination: string;
  lat:         number;
  lng:         number;
  days:        number;
};

interface WorldMapProps {
  pins: DestinationPin[];
}

// ── Map styling — minimal editorial, warm paper tones ─────────────────────────

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",        stylers: [{ color: "#EDE8DC" }] },
  { elementType: "labels",          stylers: [{ visibility: "off" }] },
  { featureType: "water",           elementType: "geometry", stylers: [{ color: "#D6D0C4" }] },
  { featureType: "road",            stylers: [{ visibility: "off" }] },
  { featureType: "transit",         stylers: [{ visibility: "off" }] },
  { featureType: "poi",             stylers: [{ visibility: "off" }] },
  { featureType: "administrative",  elementType: "geometry.stroke", stylers: [{ color: "#C8C2B6" }, { weight: 0.5 }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#B8B2A6" }, { weight: 0.8 }] },
];

const MAP_OPTIONS: google.maps.MapOptions = {
  styles:                MAP_STYLES,
  zoom:                  2,
  center:                { lat: 20, lng: 10 },
  disableDefaultUI:      true,
  gestureHandling:       "cooperative",
  minZoom:               1.5,
  maxZoom:               8,
  mapTypeControl:        false,
  streetViewControl:     false,
  fullscreenControl:     false,
  zoomControl:           false,
  keyboardShortcuts:     false,
  backgroundColor:       "#EDE8DC",
};

// ── Burnt-orange SVG pin marker ────────────────────────────────────────────────

function buildPinMarker(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="7" fill="#C2410C" stroke="#F5F0E8" stroke-width="2.5"/>
      <circle cx="14" cy="14" r="3" fill="#F5F0E8"/>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const PIN_ICON = {
  url:        buildPinMarker(),
  scaledSize: typeof window !== "undefined" ? new window.google.maps.Size(28, 28) : undefined,
  anchor:     typeof window !== "undefined" ? new window.google.maps.Point(14, 14) : undefined,
} as google.maps.Icon;

// ── Component ─────────────────────────────────────────────────────────────────

const LIBRARIES: ("places" | "geometry")[] = [];

export default function WorldMap({ pins }: WorldMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries:        LIBRARIES,
  });

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-paper-dark flex items-center justify-center">
        <p className="micro-copy text-ink-light">Loading map&hellip;</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      options={MAP_OPTIONS}
    >
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={{ lat: pin.lat, lng: pin.lng }}
          title={`${pin.destination} — ${pin.days}-day journey`}
          icon={{
            url: buildPinMarker(),
            scaledSize: new window.google.maps.Size(28, 28),
            anchor:     new window.google.maps.Point(14, 14),
          }}
        />
      ))}
    </GoogleMap>
  );
}
