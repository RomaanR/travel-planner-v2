import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import UnauthenticatedState from "@/components/UnauthenticatedState";
import Link from "next/link";
import { MapPin, Zap, Calendar } from "lucide-react";
import dynamicImport from "next/dynamic";
import type { DestinationPin } from "@/components/WorldMap";
import type { ItineraryResponse } from "@/types/itinerary";

export const dynamic = "force-dynamic";

// WorldMap must be client-only — Google Maps SDK cannot run on the server
const WorldMap = dynamicImport(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-paper-dark flex items-center justify-center">
      <p className="micro-copy text-ink-light">Loading map&hellip;</p>
    </div>
  ),
});

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-paper-dark border border-ink/10 p-6 flex flex-col gap-3">
      <div className="text-ink-light">{icon}</div>
      <p className="font-serif italic text-3xl text-ink">{value}</p>
      <p className="micro-copy text-ink-light">{label}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-paper">
          <UnauthenticatedState />
        </main>
      </>
    );
  }

  // ── Data fetching ──────────────────────────────────────────────────────────
  const [profile, recentTrips, allTrips] = await Promise.all([
    prisma.userProfile.findUnique({ where: { id: userId } }),
    prisma.trip.findMany({
      where:     { userId },
      orderBy:   { createdAt: "desc" },
      take:      3,
    }),
    prisma.trip.findMany({
      where:   { userId },
      select:  { id: true, days: true, destination: true, itineraryData: true },
    }),
  ]);

  const availableCredits  = profile ? profile.availableCredits : 1;
  const totalTrips        = allTrips.length;
  const uniqueDestinations = new Set(allTrips.map((t) => t.destination)).size;
  const totalDays         = allTrips.reduce((sum, t) => sum + t.days, 0);

  // ── Extract coordinates from stored itinerary JSON ─────────────────────────
  // Each saved itinerary has days[0].timeline[0].coordinates close to the
  // destination centre — safe to use as the map pin location.
  const pins: DestinationPin[] = allTrips
    .map((trip) => {
      try {
        const data = trip.itineraryData as unknown as ItineraryResponse;
        const coord = data?.days?.[0]?.timeline?.[0]?.coordinates;
        if (!coord?.lat || !coord?.lng) return null;
        return {
          id:          trip.id,
          destination: trip.destination,
          lat:         coord.lat,
          lng:         coord.lng,
          days:        trip.days,
        } satisfies DestinationPin;
      } catch {
        return null;
      }
    })
    .filter((p): p is DestinationPin => p !== null);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-paper">
        <div className="max-w-5xl mx-auto px-6 md:px-8 pt-28 pb-20">

          {/* ── Page header ── */}
          <div className="mb-12">
            <p className="micro-copy text-ink-light mb-3">Your Dashboard</p>
            <h1 className="font-serif italic text-4xl md:text-6xl text-ink leading-tight">
              Welcome back.
            </h1>
          </div>

          {/* ── Credits widget ── */}
          <div className="bg-ink text-paper p-8 md:p-10 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex-1">
              <p className="micro-copy text-paper/50 mb-3 tracking-widest">
                AVAILABLE CREDITS
              </p>
              <p className="font-serif italic text-7xl md:text-8xl text-paper leading-none mb-4">
                {availableCredits}
              </p>
              <p className="font-sans text-sm text-paper/60 leading-relaxed">
                {availableCredits === 0
                  ? "Purchase a credit to generate your next itinerary."
                  : `You have ${availableCredits} itinerary credit${availableCredits !== 1 ? "s" : ""} remaining.`}
              </p>
            </div>
            <div className="flex-shrink-0">
              {availableCredits === 0 ? (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-3 bg-burnt-orange text-white micro-copy px-8 py-4 hover:bg-burnt-orange/90 transition-colors duration-300"
                >
                  Buy a Credit &mdash; $4.99
                </Link>
              ) : (
                <div className="inline-flex items-center gap-2 border border-emerald-accent/40 px-6 py-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-accent" />
                  <span className="micro-copy text-emerald-accent">Ready to curate</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <StatCard icon={<MapPin size={16} strokeWidth={1.5} />}  label="TRIPS GENERATED"     value={totalTrips} />
            <StatCard icon={<Zap size={16} strokeWidth={1.5} />}     label="DESTINATIONS"         value={uniqueDestinations} />
            <StatCard icon={<Calendar size={16} strokeWidth={1.5} />} label="DAYS PLANNED"        value={totalDays} />
          </div>

          {/* ── World map ── */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <p className="micro-copy text-ink">WHERE YOU&apos;VE BEEN</p>
              {pins.length > 0 && (
                <p className="micro-copy text-ink-light">
                  {pins.length} destination{pins.length !== 1 ? "s" : ""} mapped
                </p>
              )}
            </div>

            <div className="border border-ink/10 overflow-hidden" style={{ height: "380px" }}>
              {pins.length === 0 ? (
                /* Empty state — no trips yet */
                <div className="w-full h-full bg-paper-dark flex flex-col items-center justify-center gap-3">
                  <MapPin size={24} strokeWidth={1} className="text-ink-light/40" />
                  <p className="font-serif italic text-xl text-ink-light">
                    Your map awaits its first pin.
                  </p>
                  <p className="micro-copy text-ink-light/60">
                    Generate an itinerary to see your destinations appear here.
                  </p>
                </div>
              ) : (
                <WorldMap pins={pins} />
              )}
            </div>

            {/* Legend */}
            {pins.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <div className="w-3 h-3 rounded-full bg-burnt-orange border-2 border-paper-dark" />
                <p className="micro-copy text-ink-light/60">Curated destination</p>
              </div>
            )}
          </div>

          {/* ── Recent Journeys ── */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <p className="micro-copy text-ink">RECENT JOURNEYS</p>
              <Link href="/trips" className="micro-copy text-ink-light hover:text-ink transition-colors">
                View All &rarr;
              </Link>
            </div>

            {recentTrips.length === 0 ? (
              <div className="bg-paper-dark border border-ink/10 p-12 text-center">
                <h3 className="font-serif italic text-3xl text-ink mb-4">
                  Your passport is blank.
                </h3>
                <p className="font-sans text-sm text-ink-light leading-relaxed mb-8 max-w-xs mx-auto">
                  Your curated itineraries will appear here once you plan your first journey.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 bg-ink text-paper micro-copy px-8 py-4 hover:bg-burnt-orange transition-colors duration-300"
                >
                  Plan Your First Journey &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-paper-dark border border-ink/10 p-6 flex flex-col gap-3 hover:-translate-y-0.5 transition-transform duration-300"
                  >
                    <p className="font-serif italic text-2xl text-ink leading-tight">
                      {trip.destination}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="micro-copy text-ink-light">{trip.days}-day journey</span>
                      <span className="text-ink-light/30">&middot;</span>
                      <span className="micro-copy text-ink-light">
                        {new Date(trip.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div className="mt-auto pt-4 border-t border-ink/5">
                      <Link
                        href={`/trips/${trip.id}`}
                        className="micro-copy text-ink hover:text-burnt-orange transition-colors"
                      >
                        View Itinerary &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Quick Actions ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
            <Link
              href="/"
              className="bg-burnt-orange text-white micro-copy px-8 py-5 text-center hover:bg-burnt-orange/90 transition-colors duration-300 block"
            >
              Plan a New Journey &rarr;
            </Link>
            <Link
              href="/trips"
              className="border border-ink/20 micro-copy text-ink px-8 py-5 text-center hover:bg-paper-dark transition-colors duration-300 block"
            >
              View Full Archive &rarr;
            </Link>
          </div>

          {/* ── Footer ── */}
          <footer className="border-t border-ink/5 pt-8">
            <p className="micro-copy text-ink-light text-center">
              &copy; {new Date().getFullYear()} Seek Wander &middot; All rights reserved.
            </p>
          </footer>

        </div>
      </main>
    </>
  );
}
