"use client";

import { useState, useEffect } from "react";
import { Map as MapIcon } from "lucide-react";
import ItineraryMap from "@/components/ItineraryMap";
import type { MapPoint } from "@/types/itinerary";

interface MobileMapBannerProps {
  center: { lat: number; lng: number };
  points: MapPoint[];
  /** "floating" (default): a pill at the bottom of the screen. "header": an inline button, placed by the parent (e.g. beside a download button). */
  placement?: "floating" | "header";
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
export default function MobileMapBanner({ center, points, placement = "floating" }: MobileMapBannerProps) {
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

      {/* Header placement: an inline button while the map is closed. */}
      {placement === "header" && !showMobileMap && (
        <button
          type="button"
          onClick={() => setShowMobileMap(true)}
          aria-label="View map"
          className="md:hidden print:hidden shrink-0 inline-flex items-center justify-center gap-2 h-11 px-4 border border-ink/20 text-ink micro-copy hover:bg-ink hover:text-paper transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt-orange"
        >
          <MapIcon size={18} strokeWidth={1.5} aria-hidden />
          Map
        </button>
      )}

      {/* Floating Action Button — fixed bottom-center. Always visible for the floating placement;
          for the header placement it only appears while the map is open, to close it.
          z-[110] keeps it above the z-[100] map overlay when the modal is open. */}
      {(placement === "floating" || showMobileMap) && (
        <button
          onClick={() => setShowMobileMap((prev) => !prev)}
          aria-label={showMobileMap ? "Close map" : "View map"}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] md:hidden print:hidden bg-black text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm tracking-wide whitespace-nowrap"
        >
          {showMobileMap ? "List View" : "View Map"}
        </button>
      )}
    </>
  );
}
