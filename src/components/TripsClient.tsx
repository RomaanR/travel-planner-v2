"use client";

import Image from "next/image";
import Link from "next/link";
import { WifiOff, ArrowRight, Loader2 } from "lucide-react";
import { useOfflineTrips } from "@/hooks/useOfflineTrips";
import ShareButton from "@/components/ShareButton";
import EmptyTripsState from "@/components/EmptyTripsState";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day:   "numeric",
    year:  "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripsClient() {
  const { trips, isOffline, loading } = useOfflineTrips();

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-8 md:px-16 py-20 flex items-center justify-center gap-3">
        <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-ink-light" />
        <p className="micro-copy text-ink-light">Loading your archive&hellip;</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Offline banner ──────────────────────────────────────────────── */}
      {isOffline && (
        <div className="bg-ink text-paper micro-copy py-2 text-center flex items-center justify-center gap-2">
          <WifiOff size={11} strokeWidth={1.5} />
          Offline Mode: Viewing Archived Passport
        </div>
      )}

      {/* ── Count strip (only when trips exist) ─────────────────────────── */}
      {trips.length > 0 && (
        <div className="px-8 md:px-16 pb-0 pt-4 border-b border-ink/5">
          <p className="micro-copy text-ink-light pb-4">
            {trips.length}&ensp;{trips.length === 1 ? "Itinerary" : "Itineraries"}
            &ensp;&middot;&ensp;Sorted by date
            {isOffline && <span className="ml-2 opacity-50">(cached)</span>}
          </p>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="px-8 md:px-16 py-14 md:py-20">

        {/* Empty state */}
        {trips.length === 0 && <EmptyTripsState />}

        {/* Trip grid */}
        {trips.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-ink/5">
            {trips.map((trip) => {
              const data = trip.itineraryData;
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

                    <h2 className="font-serif italic text-3xl md:text-4xl text-ink leading-tight mb-5">
                      {trip.destination}
                    </h2>

                    <div className="w-8 h-px bg-burnt-orange mb-5" />

                    {preview && (
                      <p className="font-sans text-sm text-ink-light leading-relaxed line-clamp-2 mb-6">
                        {editorial ? <>&ldquo;{preview}&rdquo;</> : preview}
                      </p>
                    )}

                    <div className="flex-1" />

                    {/* Meta strip */}
                    <div className="flex items-center gap-3 pt-5 border-t border-ink/5 mb-5">
                      <span className="micro-copy text-ink-light">
                        {trip.days}&nbsp;{trip.days === 1 ? "Day" : "Days"}
                      </span>
                      <span className="text-ink/20 select-none leading-none">&middot;</span>
                      <span className="micro-copy text-ink-light">
                        {formatDate(trip.createdAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-5">
                      <Link
                        href={`/trips/${trip.id}`}
                        className="micro-copy inline-flex items-center gap-2 text-ink group-hover:text-burnt-orange transition-colors"
                      >
                        View Itinerary
                        <ArrowRight size={12} strokeWidth={1.5} />
                      </Link>
                      <span className="text-ink/20 select-none leading-none">&middot;</span>
                      <ShareButton tripId={trip.id} destination={trip.destination} />
                    </div>
                  </div>

                  {/* ── Right: Destination photo ── */}
                  <div className="relative w-36 md:w-44 shrink-0 self-stretch min-h-[220px] overflow-hidden">
                    {trip.photoUrl ? (
                      <Image
                        src={trip.photoUrl}
                        alt={trip.destination}
                        fill
                        unoptimized
                        sizes="176px"
                        className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                      />
                    ) : (
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
    </>
  );
}
