import { NextRequest } from "next/server";
import { isValidCronRequest } from "@/lib/cronAuth";
import { revalidatePath } from "next/cache";
import { NEWS_COUNTRIES } from "@/lib/news/countries";
import { runNewsIngest } from "@/lib/news/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

// Daily ingest of official travel feeds (schedule in vercel.json).
// Vercel sends Authorization: Bearer <CRON_SECRET>; anything else is rejected.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/news] CRON_SECRET env var is not configured");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isValidCronRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { results, totalAdded } = await runNewsIngest();

  // Refresh the pages that show news; a failed revalidate must not fail the job.
  try {
    revalidatePath("/news");
    for (const c of NEWS_COUNTRIES) revalidatePath(`/news/${c.slug}`);
    revalidatePath("/");
  } catch (err) {
    console.error("[cron/news] revalidate failed:", err);
  }

  const failed = results.filter((r) => r.status === "error");
  console.log(`[cron/news] ${results.length} feeds, ${totalAdded} new items, ${failed.length} failed`);

  // 200 even when some feeds fail — the failure is recorded in NewsFeedState and Sentry,
  // and a non-2xx would make Vercel flag the whole cron as broken for one flaky feed.
  return Response.json({
    feeds:      results.length,
    added:      totalAdded,
    failed:     failed.map((r) => ({ feed: r.feed, error: r.error })),
  });
}
