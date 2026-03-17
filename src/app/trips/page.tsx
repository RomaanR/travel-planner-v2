export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import Navbar from "@/components/Navbar";
import TripsClient from "@/components/TripsClient";
import UnauthenticatedState from "@/components/UnauthenticatedState";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TripsPage() {
  const { userId } = await auth();

  if (!userId) return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <UnauthenticatedState />
    </div>
  );

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />

      {/* ── Page Header — server-rendered, always crisp ── */}
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
        </div>
      </div>

      {/* ── Client shell: handles data fetch, offline fallback, grid ── */}
      <TripsClient />
    </div>
  );
}
