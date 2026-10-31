import { prisma } from "@/lib/db";
import { NEWS_COUNTRIES, countryByCode } from "./countries";
import { type AdvisoryView, type FeedChecks, type NewsView, TOPICS, splitNews } from "./types";

export type { AdvisoryView, FeedChecks, NewsView } from "./types";

// Read side of travel news. Every function returns a safe empty value if the
// database is unavailable (or the tables are not there yet), so a news problem can
// never take down the home page or the rest of the site.

type Row = Awaited<ReturnType<typeof prisma.newsItem.findMany>>[number];

function toView(r: Row): NewsView | null {
  const c = countryByCode(r.countryCode);
  if (!c) return null;
  return {
    id: r.id, source: r.source as NewsView["source"], countryCode: c.code, countryName: c.name, countrySlug: c.slug,
    topics: r.topics, severity: r.severity, title: r.title, summary: r.summary, url: r.url, publishedAt: r.publishedAt.toISOString(),
  };
}

/** Ids of the newest FCDO / State Dept item per country — everything older has been superseded. */
async function newestIds(): Promise<Set<string>> {
  const rows = await prisma.newsItem.findMany({
    where: { status: "published", source: { not: "gdacs" } },
    distinct: ["source", "countryCode"],
    orderBy: { publishedAt: "desc" },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

export async function getNews(opts: { countryCode?: string; topic?: string; limit?: number; sinceDays?: number } = {}): Promise<NewsView[]> {
  try {
    const [rows, newest] = await Promise.all([
      prisma.newsItem.findMany({
        where: {
          status: "published",
          ...(opts.countryCode ? { countryCode: opts.countryCode } : {}),
          ...(opts.topic && (TOPICS as readonly string[]).includes(opts.topic) ? { topics: { has: opts.topic } } : {}),
          ...(opts.sinceDays ? { publishedAt: { gte: new Date(Date.now() - opts.sinceDays * 86_400_000) } } : {}),
        },
        orderBy: { publishedAt: "desc" },
        take:    Math.min(opts.limit ?? 60, 200),
      }),
      newestIds(),
    ]);

    // One GDACS event can hit several countries (one row each): show it once, listing the others.
    const events = new Map<string, NewsView>();
    const out: NewsView[] = [];
    for (const r of rows) {
      const v = toView(r);
      if (!v) continue;
      if (r.source !== "gdacs") {
        v.superseded = !newest.has(r.id);
      } else if (!opts.countryCode) {
        const key = r.externalId.split(":")[0];
        const first = events.get(key);
        if (first) {
          first.alsoAffects = [...(first.alsoAffects ?? []), { name: v.countryName, slug: v.countrySlug }];
          continue;
        }
        events.set(key, v);
      }
      out.push(v);
    }
    return out;
  } catch (err) {
    console.error("[news] getNews failed:", err);
    return [];
  }
}

/** When each source's daily check last succeeded (shown as "Checked" — never as human review). */
export async function getFeedChecks(): Promise<FeedChecks> {
  try {
    const rows = await prisma.newsFeedState.findMany({ select: { feed: true, lastSuccessAt: true } });
    const out: FeedChecks = {};
    for (const r of rows) {
      if (!r.lastSuccessAt) continue;
      const source = r.feed.split(":")[0] as NewsView["source"];
      const iso = r.lastSuccessAt.toISOString();
      if (!out[source] || iso < out[source]!) out[source] = iso; // oldest feed bounds what we can claim
    }
    return out;
  } catch (err) {
    console.error("[news] getFeedChecks failed:", err);
    return {};
  }
}

/** Home-page strip: current alerts first, then the newest regular updates. History is never shown here. */
export async function getBriefing(limit = 3): Promise<NewsView[]> {
  const { alerts, latest } = splitNews(await getNews({ limit: 40, sinceDays: 30 }));
  return [...alerts, ...latest].slice(0, limit);
}

export async function getAdvisory(countryCode: string): Promise<AdvisoryView | null> {
  try {
    const a = await prisma.advisoryLevel.findUnique({ where: { source_countryCode: { source: "state", countryCode } } });
    return a ? { level: a.level, label: a.label, url: a.url, publishedAt: a.publishedAt.toISOString() } : null;
  } catch (err) {
    console.error("[news] getAdvisory failed:", err);
    return null;
  }
}

/** Highest severity among current alerts per country, for the index page's destination filter. */
export async function getCountryPulse(): Promise<Record<string, number>> {
  const { alerts } = splitNews(await getNews({ limit: 200, sinceDays: 60 }));
  const pulse: Record<string, number> = Object.fromEntries(NEWS_COUNTRIES.map((c) => [c.code, 0]));
  for (const i of alerts) {
    pulse[i.countryCode] = Math.max(pulse[i.countryCode] ?? 0, i.severity);
    for (const o of i.alsoAffects ?? []) {
      const code = NEWS_COUNTRIES.find((n) => n.slug === o.slug)?.code;
      if (code) pulse[code] = Math.max(pulse[code] ?? 0, i.severity);
    }
  }
  return pulse;
}
