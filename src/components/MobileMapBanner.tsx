"use client";

import { useState } from "react";
import { Maximize2, X } from "lucide-react";
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
 */
export default function MobileMapBanner({ center, points }: MobileMapBannerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div
      className={`md:hidden relative ${
        isFullscreen
          ? "fixed inset-0 z-[100] w-full h-[100dvh]"
          : "h-52 w-full border-b border-ink/5"
      }`}
    >
      <ItineraryMap center={center} points={points} />

      <button
        onClick={() => setIsFullscreen((prev) => !prev)}
        aria-label={isFullscreen ? "Close map" : "View fullscreen map"}
        className="absolute bottom-4 left-4 z-50 flex items-center gap-1.5 bg-white border border-black px-3 py-1.5 micro-copy text-ink shadow-md"
      >
        {isFullscreen ? (
          <>
            <X size={11} strokeWidth={1.5} />
            Close
          </>
        ) : (
          <>
            <Maximize2 size={11} strokeWidth={1.5} />
            View Map
          </>
        )}
      </button>
    </div>
  );
}
