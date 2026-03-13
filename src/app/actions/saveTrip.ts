"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import type { ItineraryResponse } from "@/types/itinerary";

export async function saveTripToDb(
  destination: string,
  days: number,
  itineraryData: ItineraryResponse
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized: must be signed in to save a trip.");

  return prisma.trip.create({
    data: {
      userId,
      destination,
      days,
      itineraryData: itineraryData as object,
    },
  });
}
