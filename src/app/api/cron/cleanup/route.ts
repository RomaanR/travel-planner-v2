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

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const result = await prisma.placeCache.deleteMany({
    where: { updatedAt: { lt: ninetyDaysAgo } },
  });

  // Stripe retries a webhook for at most 3 days, so idempotency rows older than
  // 30 days can never match a redelivery.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const events = await prisma.stripeEvent.deleteMany({
    where: { processedAt: { lt: thirtyDaysAgo } },
  });

  console.log(`[cron/cleanup] deleted ${result.count} stale PlaceCache records, ${events.count} old StripeEvent rows`);

  return Response.json({
    deleted:            result.count,
    cutoff:             ninetyDaysAgo.toISOString(),
    stripeEventsPruned: events.count,
  });
}
