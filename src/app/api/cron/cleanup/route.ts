import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/cleanup] CRON_SECRET env var is not configured");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
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
