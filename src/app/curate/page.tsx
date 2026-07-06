export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import CurateClient from "./CurateClient";

export default async function CuratePage() {
  const { userId } = await auth();

  // Anonymous visitors skip the credits system entirely — their generation
  // quota is enforced server-side by IP in /api/itinerary-stream instead.
  if (!userId) {
    return <CurateClient credits={undefined} />;
  }

  const profile = await prisma.userProfile.findUnique({ where: { id: userId } });
  // Mirror the same implicit-free-credit logic used in the API route:
  // a brand-new user has no DB row yet but is entitled to 1 free credit.
  const credits = profile ? profile.availableCredits : 1;

  return <CurateClient credits={credits} />;
}
