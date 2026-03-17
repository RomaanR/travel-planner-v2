import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDestinationPhotoUrl } from "@/lib/getPlacePhoto";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
