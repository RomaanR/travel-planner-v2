export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import CurateClient from "./CurateClient";

export default async function CuratePage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const profile = await prisma.userProfile.findUnique({ where: { id: userId } });
  // Mirror the same implicit-free-credit logic used in the API route:
  // a brand-new user has no DB row yet but is entitled to 1 free credit.
  const credits = profile ? profile.availableCredits : 1;

  return <CurateClient credits={credits} />;
}
