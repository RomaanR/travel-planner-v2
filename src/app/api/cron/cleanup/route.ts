import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const result = await prisma.placeCache.deleteMany({
    where: { updatedAt: { lt: fourteenDaysAgo } },
  });

  console.log(`[cron/cleanup] deleted ${result.count} stale PlaceCache records`);

  return Response.json({
    deleted: result.count,
    cutoff: fourteenDaysAgo.toISOString(),
  });
}
