"use server";

import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readSaveToken } from "@/lib/saveToken";

export type SavedTrip = {
  id:          string;
  destination: string;
  days:        number;
  createdAt:   Date;
};

const toSaved = (t: SavedTrip): SavedTrip => ({
  id: t.id, destination: t.destination, days: t.days, createdAt: t.createdAt,
});

/**
 * Saves a generated itinerary to the signed-in user's archive.
 *
 * Accepts only the signed save token returned by the generation route, so the
 * stored content is exactly what the server produced. Saving the same
 * generation twice (double click, refine auto-save + manual save) returns the
 * existing trip instead of creating a duplicate.
 */
export async function saveTripToDb(saveToken: string): Promise<SavedTrip> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized: must be signed in to save a trip.");

  const payload = readSaveToken(saveToken);
  if (!payload) throw new Error("This itinerary can no longer be saved. Please generate it again.");

  const { generationId, itinerary, request } = payload;
  const key = { userId_generationId: { userId, generationId } };

  const existing = await prisma.trip.findUnique({ where: key });
  if (existing) return toSaved(existing);

  try {
    const trip = await prisma.trip.create({
      data: {
        userId,
        generationId,
        destination:   itinerary.destination,
        days:          itinerary.days.length,
        itineraryData: itinerary as unknown as Prisma.InputJsonValue,
        request:       request as Prisma.InputJsonValue,
      },
    });
    return toSaved(trip);
  } catch (err) {
    // A concurrent save of the same generation won the race.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await prisma.trip.findUnique({ where: key });
      if (winner) return toSaved(winner);
    }
    throw err;
  }
}
