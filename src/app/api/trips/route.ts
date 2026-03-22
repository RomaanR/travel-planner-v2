import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDestinationPhotoUrl } from "@/lib/getPlacePhoto";
import { ratelimit } from "@/lib/ratelimit";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit per userId — prevents a leaked Clerk token being used to hammer
  // this endpoint and exhaust Google Places API quota (one call per saved trip).
  const { success } = await ratelimit.limit(userId);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch destination photos in parallel — same pattern as the server page
  const photos = await Promise.all(
    trips.map((t) => getDestinationPhotoUrl(t.destination))
  );

  const payload = trips.map((t, i) => ({
    id:            t.id,
    destination:   t.destination,
    days:          t.days,
    createdAt:     t.createdAt.toISOString(),  // serialise Date for JSON
    photoUrl:      photos[i] ?? null,
    itineraryData: t.itineraryData,            // needed for editorial/theme preview
  }));

  return NextResponse.json({ trips: payload });
}
