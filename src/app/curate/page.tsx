export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getCreditStatus } from "@/lib/credits";
import CurateClient from "./CurateClient";

export const metadata: Metadata = {
  title: "Plan your trip",
  description:
    "Tell TravalBee your destination, dates and preferences and get a curated day-by-day itinerary in about a minute, with real places, opening hours and a map.",
  alternates: { canonical: "/curate" },
};

export default async function CuratePage() {
  const { userId } = await auth();

  // Anonymous visitors skip the credits system entirely — their generation
  // quota is enforced server-side by IP in /api/itinerary-stream instead.
  if (!userId) {
    return <CurateClient credits={undefined} />;
  }

  // Same rules the generation route enforces (src/lib/credits.ts).
  const { remaining } = await getCreditStatus(userId);
  return <CurateClient credits={remaining} />;
}
