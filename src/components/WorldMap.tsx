"use client";

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
// Built inside the component after isLoaded is true so google.maps.Size/Point
// are guaranteed to exist. Never reference these at module scope.

const PIN_SVG_URL =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">` +
    `<circle cx="14" cy="14" r="7" fill="#C2410C" stroke="#F5F0E8" stroke-width="2.5"/>` +
    `<circle cx="14" cy="14" r="3" fill="#F5F0E8"/>` +
    `</svg>`
  );

// ── Component ─────────────────────────────────────────────────────────────────

// Must match ItineraryMap.tsx exactly — the @react-google-maps/api loader is a
// singleton and throws if useJsApiLoader is called twice with different options.
const LIBRARIES: ("places" | "geometry")[] = ["places"];

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

  // Safe to reference google.maps.* here — isLoaded guarantees SDK is ready
  const pinIcon: google.maps.Icon = {
    url:        PIN_SVG_URL,
    scaledSize: new window.google.maps.Size(28, 28),
    anchor:     new window.google.maps.Point(14, 14),
  };

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      options={MAP_OPTIONS}
    >
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={{ lat: pin.lat, lng: pin.lng }}
          title={`${pin.destination} \u2014 ${pin.days}-day journey`}
          icon={pinIcon}
        />
      ))}
    </GoogleMap>
  );
}
