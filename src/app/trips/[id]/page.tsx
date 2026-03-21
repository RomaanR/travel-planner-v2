export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import ItineraryMap from "@/components/ItineraryMap";
import ItineraryViewer from "@/components/ItineraryViewer";
import ExportPdfButton from "@/components/ExportPdfButton";
import DeleteTripButton from "@/components/DeleteTripButton";
import type { ItineraryResponse, MapPoint } from "@/types/itinerary";
import { computeMapPoints, normalizeDayPlan } from "@/lib/itineraryUtils";
import { getDestinationPhotoUrl } from "@/lib/getPlacePhoto";

// ─── Dynamic OG Metadata ──────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  // Auth + ownership check — prevents unauthenticated users from reading
  // trip destination / editorial via OG metadata before the page auth fires.
  const { userId } = await auth();
  const trip = await prisma.trip.findUnique({ where: { id: params.id } });
  if (!trip || trip.userId !== userId) return { title: "Itinerary Not Found" };

  const itinerary = trip.itineraryData as unknown as ItineraryResponse;

  // Extract the first sentence of the editorial opener as the OG description.
  // e.g. "Kyoto's ancient temples await. A city revealed slowly." → "Kyoto's ancient temples await."
  const editorial = itinerary?.editorial ?? "";
  const firstSentence = editorial.split(/\.\s+/)[0]?.trim();
  const description = firstSentence
    ? `${firstSentence}.`
    : `A curated luxury journey to ${trip.destination}, crafted by Seek Wander.`;

  // Destination hero photo for og:image / twitter:image.
  // Returns null if MAPS_SERVER_KEY is absent or the Places call fails.
  const photoUrl = await getDestinationPhotoUrl(trip.destination);

  const title = `${trip.destination} | Curated by Seek Wander`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Seek Wander",
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TripViewPage({
  params,
}: {
  params: { id: string };
}) {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) redirect("/");

  // ── DB fetch (ownership-checked) ────────────────────────────────────────────
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
  });

  // Return 404 for missing trips AND trips owned by another user (same surface)
  if (!trip || trip.userId !== userId) notFound();

  // ── Data preparation ────────────────────────────────────────────────────────
  const itinerary = trip.itineraryData as unknown as ItineraryResponse;

  // Compute map points server-side — mirrors the useMemo in itinerary/page.tsx
  const mapPoints: MapPoint[] = computeMapPoints(itinerary.days ?? []);

  // Derive map center: first valid point → first timeline item → Tokyo fallback
  const mapCenter =
    mapPoints.length > 0
      ? { lat: mapPoints[0].lat, lng: mapPoints[0].lng }
      : (normalizeDayPlan(itinerary.days?.[0])?.timeline?.[0]?.coordinates ?? {
          lat: 35.6762,
          lng: 139.6503,
        });

  // ── Bottom CTA (no save button — already archived) ──────────────────────────
  const bottomCta = (
    <div className="mt-14 border-t border-ink/5 pt-10 text-center pb-10">
      <p className="font-serif italic text-3xl text-ink mb-6">
        Exploring elsewhere?
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/trips"
          className="micro-copy border border-ink/20 px-8 py-4 text-ink hover:bg-ink hover:text-paper transition-all duration-300"
        >
          &larr;&ensp;Back to Archive
        </Link>
        <Link
          href="/"
          className="micro-copy bg-burnt-orange text-white px-8 py-4 hover:bg-ink transition-colors duration-300"
        >
          Curate a New Journey
        </Link>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-paper overflow-hidden print:h-auto print:overflow-visible print:block">

      {/* Navbar — hidden in print */}
      <div className="print:hidden">
        <Navbar />
      </div>

      {/* ── Screen header strip — hidden in print (replaced by dossier header) ── */}
      <div className="shrink-0 pt-20 pb-5 px-6 md:px-10 border-b border-ink/5 bg-paper-dark print:hidden">
        <Link
          href="/trips"
          className="flex items-center gap-2 micro-copy text-ink-light hover:text-ink transition-colors mb-3"
        >
          <ArrowLeft size={13} />
          Back to Archive
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="micro-copy text-ink-light mb-1">
              Saved Journey&ensp;&middot;&ensp;{formatDate(trip.createdAt)}
            </p>
            <h1 className="font-serif italic text-3xl sm:text-4xl md:text-6xl text-ink leading-none">
              {trip.destination}
            </h1>
          </div>
          {/* Header actions — both are print:hidden internally */}
          <div className="flex items-center gap-3">
            <DeleteTripButton tripId={trip.id} destination={trip.destination} />
            <ExportPdfButton />
          </div>
        </div>
      </div>

      {/* ── Split-screen ── */}
      <div className="flex flex-1 min-h-0 print:block print:overflow-visible">

        {/* LEFT: Scrollable timeline — full width in print */}
        <div className="w-full md:w-[55%] overflow-y-auto print:w-full print:overflow-visible">

          {/* Mobile map banner — hidden in print */}
          <div className="md:hidden h-52 w-full border-b border-ink/5 print:hidden">
            <ItineraryMap center={mapCenter} points={mapPoints} />
          </div>

          <div className="px-6 md:px-10 py-8 print:px-0 print:py-6">
            <ItineraryViewer itinerary={itinerary} bottomSection={bottomCta} />
          </div>
        </div>

        {/* RIGHT: Sticky map — hidden in print (interactive maps don't print) */}
        <div className="hidden md:block w-[45%] border-l border-ink/5 h-full print:hidden">
          <ItineraryMap center={mapCenter} points={mapPoints} />
        </div>

      </div>
    </div>
  );
}
