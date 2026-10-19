import { prisma } from "@/lib/db";
import { normalizeDayPlan } from "@/lib/itineraryUtils";
import type { ItineraryResponse } from "@/types/itinerary";

// The "golden" sample trip shown at /sample. Its photos are self-hosted under
// public/sample/ so the page never depends on expiring Google photo tokens.
export const SAMPLE_TRIP_ID = "2bc902f5-6db2-47ea-97d4-f5431a445a9a";

export type SampleSummary = {
  destination: string;
  days:        number;
  dayTitle:    string; // Day 1 theme
  photo:       string | null;
};

// Shown if the database is unreachable, so the home page always renders.
const FALLBACK: SampleSummary = {
  destination: "Paris",
  days:        3,
  dayTitle:    "Left Bank Icons & Culinary Grandeur",
  photo:       "/sample/paris-01.jpg",
};

/** What the home-page sample card needs — read from the real sample trip. */
export async function getSampleSummary(): Promise<SampleSummary> {
  try {
    const trip = await prisma.trip.findUnique({
      where:  { id: SAMPLE_TRIP_ID },
      select: { destination: true, days: true, itineraryData: true },
    });
    if (!trip) return FALLBACK;
    const itinerary = trip.itineraryData as unknown as ItineraryResponse;
    const day1 = itinerary?.days?.[0] ? normalizeDayPlan(itinerary.days[0]) : null;
    const photo = day1?.timeline?.find((t) => t.photoUrl?.startsWith("/"))?.photoUrl ?? FALLBACK.photo;
    return {
      destination: trip.destination,
      days:        trip.days,
      dayTitle:    day1?.theme ?? FALLBACK.dayTitle,
      photo,
    };
  } catch {
    return FALLBACK;
  }
}
