export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { getDestinationPhotoUrl } from "@/lib/getPlacePhoto";
import Navbar from "@/components/Navbar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TripsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  let trips: Awaited<ReturnType<typeof prisma.trip.findMany>> = [];
  try {
    trips = await prisma.trip.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[/trips] Prisma error:", err);
    throw new Error(
      "Unable to load your trips. Please check that DATABASE_URL and DIRECT_URL are set in your Vercel environment variables."
    );
  }

  // Fetch all destination photos in parallel — failures silently return null
  const photos = await Promise.all(
    trips.map((trip) => getDestinationPhotoUrl(trip.destination))
  );

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      {/* ── Page Header ── */}
      <div className="border-b border-ink/5">
        <div className="px-8 md:px-16 pt-24 md:pt-28 pb-12 md:pb-16">
          <p className="micro-copy text-ink-light mb-4 animate-fade-in-up">
            Private Archive
          </p>
          <h1
            className="font-serif italic text-6xl md:text-8xl text-ink leading-none animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            Your Journeys
          </h1>
          {trips.length > 0 && (
            <p
              className="micro-copy text-ink-light mt-5 animate-fade-in-up"
              style={{ animationDelay: "0.12s" }}
            >
              {trips.length}&ensp;{trips.length === 1 ? "Itinerary" : "Itineraries"}&ensp;&middot;&ensp;Sorted by date
            </p>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-8 md:px-16 py-14 md:py-20">

        {/* Empty State */}
        {trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-8 h-px bg-burnt-orange mb-8" />
            <p className="font-serif italic text-4xl md:text-5xl text-ink leading-tight mb-4">
              Your archive is<br />currently empty.
            </p>
            <p className="font-sans text-sm text-ink-light mb-10 max-w-xs mx-auto leading-relaxed">
              Save an itinerary from the results page and it will appear here.
            </p>
            <Link
              href="/"
              className="micro-copy border border-ink/20 px-8 py-4 text-ink hover:bg-ink hover:text-paper transition-all duration-300"
            >
              Begin Curating
            </Link>
          </div>
        )}

        {/* Trip Grid */}
        {trips.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-ink/5">
            {trips.map((trip, i) => {
              const photoUrl = photos[i] ?? null;

              // Safely extract preview text from stored JSON
              const data = trip.itineraryData as {
                editorial?: string;
                days?: { theme?: string }[];
              } | null;

              const editorial = data?.editorial;
              const themes = data?.days
                ?.slice(0, 3)
                .map((d) => d?.theme)
                .filter(Boolean)
                .join(" · ");
              const preview = editorial ?? themes ?? null;

              return (
                <article
                  key={trip.id}
                  className="bg-paper flex overflow-hidden hover:bg-paper-dark transition-colors duration-300 group"
                >
                  {/* ── Left: Text content ── */}
                  <div className="flex flex-col p-8 md:p-10 flex-1 min-w-0">

                    {/* Destination */}
                    <h2 className="font-serif italic text-3xl md:text-4xl text-ink leading-tight mb-5">
                      {trip.destination}
                    </h2>

                    {/* Accent rule */}
                    <div className="w-8 h-px bg-burnt-orange mb-5" />

                    {/* Preview text */}
                    {preview && (
                      <p className="font-sans text-sm text-ink-light leading-relaxed line-clamp-2 mb-6">
                        {editorial ? <>&ldquo;{preview}&rdquo;</> : preview}
                      </p>
                    )}

                    {/* Push footer down */}
                    <div className="flex-1" />

                    {/* Meta strip */}
                    <div className="flex items-center gap-3 pt-5 border-t border-ink/5 mb-5">
                      <span className="micro-copy text-ink-light">
                        {trip.days}&nbsp;{trip.days === 1 ? "Day" : "Days"}
                      </span>
                      <span className="text-ink/20 select-none leading-none">
                        &middot;
                      </span>
                      <span className="micro-copy text-ink-light">
                        {formatDate(trip.createdAt)}
                      </span>
                    </div>

                    {/* View link */}
                    <Link
                      href={`/trips/${trip.id}`}
                      className="micro-copy inline-flex items-center gap-2 text-ink group-hover:text-burnt-orange transition-colors self-start"
                    >
                      View Itinerary
                      <ArrowRight size={12} strokeWidth={1.5} />
                    </Link>
                  </div>

                  {/* ── Right: Destination photo ── */}
                  <div className="relative w-36 md:w-44 shrink-0 self-stretch min-h-[220px] overflow-hidden">
                    {photoUrl ? (
                      <Image
                        src={photoUrl}
                        alt={trip.destination}
                        fill
                        unoptimized
                        sizes="176px"
                        className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                      />
                    ) : (
                      /* Fallback — typographic placeholder */
                      <div className="absolute inset-0 bg-paper-dark flex items-center justify-center">
                        <span
                          className="font-serif italic text-7xl text-ink/8 select-none leading-none"
                          aria-hidden="true"
                        >
                          {trip.destination.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
