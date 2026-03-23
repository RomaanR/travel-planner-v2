import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ItineraryViewer from "@/components/ItineraryViewer";
import ItineraryMap from "@/components/ItineraryMap";
import ExportPdfButton from "@/components/ExportPdfButton";
import { sampleNewYorkItinerary } from "@/lib/sampleItinerary";
import { computeMapPoints } from "@/lib/itineraryUtils";

export const metadata: Metadata = {
  title: "Sample Itinerary — New York City",
  description:
    "A curated 3-day New York City itinerary by Seek Wander — experience the quality before you generate your own.",
};

// ─── Bottom CTA ───────────────────────────────────────────────────────────────

const bottomCta = (
  <div className="mt-14 border-t border-ink/5 pt-10 text-center pb-10">
    <p className="micro-copy text-ink-light mb-4">You are viewing a sample itinerary</p>
    <p className="font-serif italic text-3xl text-ink mb-6">
      Ready for your own journey?
    </p>
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <Link
        href="/"
        className="micro-copy bg-burnt-orange text-white px-8 py-4 hover:bg-ink transition-colors duration-300"
      >
        Curate My Itinerary
      </Link>
      <Link
        href="/pricing"
        className="micro-copy border border-ink/20 px-8 py-4 text-ink hover:bg-ink hover:text-paper transition-all duration-300"
      >
        View Pricing
      </Link>
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SamplePage() {
  const mapPoints = computeMapPoints(sampleNewYorkItinerary.days);
  const mapCenter = { lat: 40.7400, lng: -73.9950 }; // centred on lower Manhattan / Chelsea

  return (
    <div className="h-screen flex flex-col bg-paper overflow-hidden">
      <Navbar />

      {/* Header strip — mirrors itinerary/page.tsx layout */}
      <div className="shrink-0 pt-20 pb-5 px-6 md:px-10 border-b border-ink/5 bg-paper-dark">
        <div className="flex items-end justify-between">
          <div>
            <p className="micro-copy text-burnt-orange mb-1">Sample Itinerary</p>
            <h1 className="font-serif italic text-4xl md:text-6xl text-ink leading-none">
              New York City
            </h1>
          </div>
          <ExportPdfButton />
        </div>
      </div>

      {/* Split-screen */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT: scrollable timeline */}
        <div className="w-full md:w-[55%] overflow-y-auto">

          {/* Mobile map banner */}
          <div className="md:hidden h-52 w-full border-b border-ink/5">
            <ItineraryMap center={mapCenter} points={mapPoints} />
          </div>

          <div className="px-6 md:px-10 py-8">
            <ItineraryViewer
              itinerary={sampleNewYorkItinerary}
              departureDate="2025-09-12"
              returnDate="2025-09-14"
              bottomSection={bottomCta}
            />
          </div>
        </div>

        {/* RIGHT: sticky map */}
        <div className="hidden md:block w-[45%] border-l border-ink/5 h-full">
          <ItineraryMap center={mapCenter} points={mapPoints} />
        </div>

      </div>
    </div>
  );
}
