import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDestinationPhotoUrl } from "@/lib/getPlacePhoto";
import { tripsRatelimit } from "@/lib/ratelimit";

const MAX_TRIPS = 100;

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit per userId — prevents a leaked Clerk token being used to hammer
  // this endpoint and exhaust Google Places API quota (one call per saved trip).
  const { success } = await tripsRatelimit.limit(userId);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const trips = await prisma.trip.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    MAX_TRIPS,
    select:  { id: true, destination: true, days: true, createdAt: true, itineraryData: true },
  });

  // Fetch destination photos in parallel — same pattern as the server page
  const photos = await Promise.all(
    trips.map((t) => getDestinationPhotoUrl(t.destination))
  );

  // The archive card only needs the editorial line and the first day themes —
  // not the full itinerary (often 20–80 KB per trip).
  const payload = trips.map((t, i) => {
    const data = t.itineraryData as { editorial?: string; days?: { theme?: string }[] } | null;
    return {
      id:          t.id,
      destination: t.destination,
      days:        t.days,
      createdAt:   t.createdAt.toISOString(),  // serialise Date for JSON
      photoUrl:    photos[i] ?? null,          // same-origin /api/photo path
      itineraryData: {
        editorial: data?.editorial,
        days:      data?.days?.slice(0, 3).map((d) => ({ theme: d?.theme })),
      },
    };
  });

  return NextResponse.json({ trips: payload });
}
