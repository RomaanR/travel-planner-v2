export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import ItineraryMap from "@/components/ItineraryMap";
import MobileMapBanner from "@/components/MobileMapBanner";
import ItineraryViewer from "@/components/ItineraryViewer";
import type { ItineraryResponse, MapPoint } from "@/types/itinerary";
import { computeMapPoints, normalizeDayPlan } from "@/lib/itineraryUtils";
import { getDestinationPhotoUrl } from "@/lib/getPlacePhoto";

// ─── Dynamic OG Metadata ──────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const trip = await prisma.trip.findUnique({ where: { id: params.id } });
  if (!trip) return { title: "Itinerary Not Found | TravalBee" };

  const itinerary = trip.itineraryData as unknown as ItineraryResponse;
  const editorial = itinerary?.editorial ?? "";
  const firstSentence = editorial.split(/\.\s+/)[0]?.trim();
  const description = firstSentence
    ? `${firstSentence}.`
    : `A curated luxury journey to ${trip.destination}, crafted by TravalBee.`;

  const photoUrl = await getDestinationPhotoUrl(trip.destination);
  const title = `${trip.destination} Itinerary | TravalBee`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "TravalBee",
      ...(photoUrl
        ? { images: [{ url: photoUrl, width: 800, alt: trip.destination }] }
        : {}),
    },
    twitter: {
      card: photoUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(photoUrl ? { images: [photoUrl] } : {}),
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SharedTripPage({
  params,
}: {
  params: { id: string };
}) {
  // Public route — intentionally no auth check.
  const trip = await prisma.trip.findUnique({ where: { id: params.id } });
  if (!trip) notFound();

  const itinerary = trip.itineraryData as unknown as ItineraryResponse;

  const mapPoints: MapPoint[] = computeMapPoints(itinerary.days ?? []);

  const mapCenter =
    mapPoints.length > 0
      ? { lat: mapPoints[0].lat, lng: mapPoints[0].lng }
      : (normalizeDayPlan(itinerary.days?.[0])?.timeline?.[0]?.coordinates ?? {
          lat: 35.6762,
          lng: 139.6503,
        });

  // Acquisition CTA — replaces save/PDF buttons
  const bottomCta = (
    <div className="mt-14 border-t border-ink/5 pt-10 text-center pb-10">
      <div className="w-8 h-px bg-burnt-orange mx-auto mb-8" />
      <p className="micro-copy text-ink-light mb-4">Trusted by discerning travelers</p>
      <p className="font-serif italic text-3xl text-ink mb-3">
        Inspired by this journey?
      </p>
      <p className="font-sans text-sm text-ink-light mb-8 max-w-sm mx-auto leading-relaxed">
        Every itinerary is bespoke &mdash; tailored to your pace, palate,
        and travel party. Hidden gems, curated dining, and every detail handled in under 30 seconds.
      </p>
      <Link
        href="/"
        className="micro-copy bg-burnt-orange text-white px-10 py-4 hover:bg-ink transition-colors duration-300 inline-block"
      >
        Create Your Free Itinerary &rarr;
      </Link>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-paper overflow-hidden print:h-auto print:overflow-visible print:block">

      <Navbar />

      {/* ── Header strip — mirrors trips/[id] style ── */}
      <div className="shrink-0 pt-24 md:pt-20 pb-5 px-6 md:px-10 border-b border-ink/5 bg-paper-dark">

        {/* Mobile */}
        <div className="md:hidden">
          <p className="micro-copy text-ink-light mb-3">
            Public Itinerary&ensp;&middot;&ensp;{trip.days}&nbsp;{trip.days === 1 ? "Day" : "Days"}
          </p>
          <h1 className="font-serif italic text-3xl text-ink leading-none mb-4">
            {trip.destination}
          </h1>
          <Link
            href="/"
            className="micro-copy bg-burnt-orange text-white px-6 py-3 hover:bg-ink transition-colors duration-300 inline-block"
          >
            Create Your Own &rarr;
          </Link>
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="micro-copy text-ink-light mb-1">
                Public Itinerary&ensp;&middot;&ensp;{trip.days}&nbsp;{trip.days === 1 ? "Day" : "Days"}
              </p>
              <h1 className="font-serif italic text-4xl md:text-6xl text-ink leading-none">
                {trip.destination}
              </h1>
            </div>
            <Link
              href="/"
              className="micro-copy bg-burnt-orange text-white px-8 py-4 hover:bg-ink transition-colors duration-300 shrink-0"
            >
              Create Your Own &rarr;
            </Link>
          </div>
        </div>

      </div>

      {/* ── Split-screen ── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT: Scrollable timeline */}
        <div className="w-full md:w-[55%] overflow-y-auto">

          {/* Mobile map banner — same component as trips/[id] */}
          <MobileMapBanner center={mapCenter} points={mapPoints} />

          <div className="px-6 md:px-10 py-8">
            <ItineraryViewer itinerary={itinerary} bottomSection={bottomCta} />
          </div>
        </div>

        {/* RIGHT: Sticky map */}
        <div className="hidden md:block w-[45%] border-l border-ink/5 h-full">
          <ItineraryMap center={mapCenter} points={mapPoints} />
        </div>

      </div>
    </div>
  );
}
