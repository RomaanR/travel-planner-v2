import { prisma } from "@/lib/db";
import { NEWS_COUNTRIES, countryByCode } from "./countries";
import { type AdvisoryView, type NewsView, TOPICS } from "./types";

export type { AdvisoryView, NewsView } from "./types";

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

export async function getNews(opts: { countryCode?: string; topic?: string; limit?: number; sinceDays?: number } = {}): Promise<NewsView[]> {
  try {
    const rows = await prisma.newsItem.findMany({
      where: {
        status: "published",
        ...(opts.countryCode ? { countryCode: opts.countryCode } : {}),
        ...(opts.topic && (TOPICS as readonly string[]).includes(opts.topic) ? { topics: { has: opts.topic } } : {}),
        ...(opts.sinceDays ? { publishedAt: { gte: new Date(Date.now() - opts.sinceDays * 86_400_000) } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take:    Math.min(opts.limit ?? 60, 200),
    });
    return rows.map(toView).filter((v): v is NewsView => v !== null);
  } catch (err) {
    console.error("[news] getNews failed:", err);
    return [];
  }
}

/** Home-page strip: serious items first, then newest. */
export async function getBriefing(limit = 3): Promise<NewsView[]> {
  const recent = await getNews({ limit: 40, sinceDays: 30 });
  return [...recent]
    .sort((a, b) => (b.severity >= 3 ? 1 : 0) - (a.severity >= 3 ? 1 : 0) || +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .slice(0, limit);
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

/** Highest-severity recent item per country, for the index page's country strip. */
export async function getCountryPulse(): Promise<Record<string, number>> {
  const items = await getNews({ limit: 200, sinceDays: 30 });
  const pulse: Record<string, number> = Object.fromEntries(NEWS_COUNTRIES.map((c) => [c.code, 0]));
  for (const i of items) pulse[i.countryCode] = Math.max(pulse[i.countryCode] ?? 0, i.severity);
  return pulse;
}
