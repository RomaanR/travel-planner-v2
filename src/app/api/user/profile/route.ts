import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({ where: { id: userId } });

  return Response.json({
    isPremium:        profile?.isPremium        ?? false,
    availableCredits: profile?.availableCredits ?? 1,
  });
}
