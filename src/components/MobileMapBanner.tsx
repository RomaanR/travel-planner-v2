"use client";

import { useState } from "react";
import ItineraryMap from "@/components/ItineraryMap";
import type { MapPoint } from "@/types/itinerary";

interface MobileMapBannerProps {
  center: { lat: number; lng: number };
  points: MapPoint[];
}

/**
 * Mobile-only map banner with a fullscreen toggle.
 * Hidden on md+ (the desktop sidebar map handles those breakpoints).
 * Uses fixed inset-0 z-[100] h-[100dvh] for the fullscreen state so the
 * iOS Safari URL bar shrink/grow is accounted for via dynamic viewport height.
 *
 * The toggle FAB is rendered as a fixed bottom-center pill (z-[110]) OUTSIDE
 * the map container so it is never clipped by the container's overflow or
 * stacking context in either the collapsed (h-52) or fullscreen (fixed inset-0)
 * state. z-[110] sits above the fullscreen container's z-[100].
 */
export default function MobileMapBanner({ center, points }: MobileMapBannerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      {/* Map container — collapsed thumbnail or fullscreen overlay */}
      <div
        className={`md:hidden print:hidden relative ${
          isFullscreen
            ? "fixed inset-0 z-[100] w-full h-[100dvh]"
            : "h-52 w-full border-b border-ink/5"
        }`}
      >
        <ItineraryMap center={center} points={points} />
      </div>

      {/* Floating Action Button — fixed bottom-center, always above map overlay */}
      <button
        onClick={() => setIsFullscreen((prev) => !prev)}
        aria-label={isFullscreen ? "Close map" : "View fullscreen map"}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] md:hidden bg-black text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm tracking-wide whitespace-nowrap"
      >
        {isFullscreen ? "Close Map" : "View Map"}
      </button>
    </>
  );
}
