export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { getCreditStatus } from "@/lib/credits";
import CurateClient from "./CurateClient";

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
