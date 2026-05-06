"use client";

import { Map } from "lucide-react";
import { generateKml } from "@/lib/generateKml";
import type { ItineraryResponse } from "@/types/itinerary";

interface Props {
  itinerary: ItineraryResponse;
  className?: string;
  iconSize?: number;
  label?: string;
}

export default function ExportMapButton({
  itinerary,
  className = "flex items-center gap-2 micro-copy border border-ink/15 px-4 py-2.5 text-ink hover:border-ink transition-all duration-200 print:hidden",
  iconSize = 13,
  label = "Download Map",
}: Props) {
  function handleDownload() {
    const kml = generateKml(itinerary);
    const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `travalbee-${itinerary.destination.toLowerCase().replace(/\s+/g, "-")}.kml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={handleDownload} className={className}>
      <Map size={iconSize} strokeWidth={1.5} />
      {label}
    </button>
  );
}
