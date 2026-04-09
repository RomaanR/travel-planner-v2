import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { computeMapPoints } from "@/lib/itineraryUtils";
import type { ItineraryResponse } from "@/types/itinerary";
import Navbar from "@/components/Navbar";
import ItineraryViewer from "@/components/ItineraryViewer";
import ItineraryMap from "@/components/ItineraryMap";
import MobileMapBanner from "@/components/MobileMapBanner";
import ExportPdfButton from "@/components/ExportPdfButton";

export const dynamic = "force-dynamic";

// ── Swap this UUID for the "golden" trip ID from your database ─────────────
const SAMPLE_TRIP_ID = "7d88a6f1-fef5-4145-bee1-cc165b178d2a";

export const metadata: Metadata = {
  title: "Sample Itinerary | TravalBee",
  description:
    "A curated luxury itinerary by TravalBee — experience the quality before you generate your own.",
};

export default async function SamplePage() {
  const trip = await prisma.trip.findUnique({ where: { id: SAMPLE_TRIP_ID } });
  if (!trip) notFound();

  const itinerary = trip.itineraryData as unknown as ItineraryResponse;
  const mapPoints  = computeMapPoints(itinerary.days ?? []);
  const mapCenter  = mapPoints[0]
    ? { lat: mapPoints[0].lat, lng: mapPoints[0].lng }
    : { lat: 40.758, lng: -73.985 };

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

  return (
    <div className="h-screen flex flex-col bg-paper overflow-hidden print:h-auto print:overflow-visible print:block">
      {/* Navbar — hidden in print */}
      <div className="print:hidden">
        <Navbar />
      </div>

      {/* Header strip — kept in print for destination title context */}
      <div className="shrink-0 pt-24 md:pt-20 pb-5 px-6 md:px-10 border-b border-ink/5 bg-paper-dark print:pt-6 print:border-b print:border-black/15">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 micro-copy text-ink-light hover:text-ink transition-colors mb-3 print:hidden"
            >
              <ChevronLeft size={13} strokeWidth={1.5} />
              BACK TO HOME
            </Link>
            <p className="micro-copy text-burnt-orange mb-1">Sample Itinerary</p>
            <h1 className="font-serif italic text-4xl md:text-6xl text-ink leading-none">
              {trip.destination}
            </h1>
          </div>
          <ExportPdfButton />
        </div>
      </div>

      {/* Split-screen */}
      <div className="flex flex-1 min-h-0 print:block print:overflow-visible">

        {/* LEFT: scrollable timeline — full width in print */}
        <div className="w-full md:w-[55%] overflow-y-auto overflow-x-clip print:w-full print:overflow-visible print:h-auto">

          {/* Mobile map banner — hidden in print */}
          <MobileMapBanner center={mapCenter} points={mapPoints} />

          <div className="px-6 md:px-10 py-8 w-full min-w-0 print:px-0 print:py-6">
            <ItineraryViewer
              itinerary={itinerary}
              departureDate="2025-09-12"
              returnDate="2025-09-14"
              bottomSection={bottomCta}
            />
          </div>
        </div>

        {/* RIGHT: sticky map — hidden in print */}
        <div className="hidden md:block w-[45%] border-l border-ink/5 h-full print:hidden">
          <ItineraryMap center={mapCenter} points={mapPoints} />
        </div>

      </div>
    </div>
  );
}
