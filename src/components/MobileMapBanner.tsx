"use client";

import { useState, useEffect } from "react";
import ItineraryMap from "@/components/ItineraryMap";
import type { MapPoint } from "@/types/itinerary";

interface MobileMapBannerProps {
  center: { lat: number; lng: number };
  points: MapPoint[];
}

/**
 * Mobile-only immersive map modal (Airbnb-style).
 * Hidden on md+ — the desktop sidebar map handles those breakpoints.
 *
 * Default state: map is completely absent from the viewport (hidden).
 * Open state:    fixed inset-0 z-[100] fullscreen overlay (100dvh accounts
 *                for iOS Safari URL bar shrink/grow).
 *
 * The FAB is rendered OUTSIDE the map container via a fragment so it is
 * never clipped by the container's stacking context in either state.
 * z-[110] keeps it above the z-[100] map overlay at all times.
 *
 * Body scroll is locked via useEffect while the modal is open so the user
 * cannot accidentally scroll the hidden timeline behind the map.
 */
export default function MobileMapBanner({ center, points }: MobileMapBannerProps) {
  const [showMobileMap, setShowMobileMap] = useState(false);

  // Lock / unlock body scroll while the map modal is open
  useEffect(() => {
    if (showMobileMap) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    // Cleanup on unmount — ensures scroll is always restored
    return () => { document.body.style.overflow = ""; };
  }, [showMobileMap]);

  return (
    <>
      {/* Map modal — completely hidden by default; fullscreen when open.
          The ItineraryMap day selector sits at z-[110] inside this container,
          above the Google Map tile layer but within the z-[100] stacking context. */}
      <div
        className={`print:hidden ${
          showMobileMap
            ? "fixed inset-0 z-[100] w-full h-[100dvh] md:hidden"
            : "hidden"
        }`}
      >
        <ItineraryMap center={center} points={points} />
      </div>

      {/* Floating Action Button — fixed bottom-center, always visible on mobile.
          z-[110] keeps it above the z-[100] map overlay when the modal is open. */}
      <button
        onClick={() => setShowMobileMap((prev) => !prev)}
        aria-label={showMobileMap ? "Close map" : "View map"}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] md:hidden print:hidden bg-black text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm tracking-wide whitespace-nowrap"
      >
        {showMobileMap ? "List View" : "View Map"}
      </button>
    </>
  );
}
