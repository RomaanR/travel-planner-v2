import { prisma } from "@/lib/db";
import { NEWS_COUNTRIES, countryByCode } from "./countries";
import { type AdvisoryView, type FeedChecks, type NewsView, TOPIC_GROUPS, topicGroupFor, splitNews } from "./types";

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

type NewsOpts = { countryCode?: string; topic?: string; limit?: number; sinceDays?: number };

function topicWhere(topic?: string) {
  const key = topicGroupFor(topic);
  if (!key) return {};
  const group = TOPIC_GROUPS.find((g) => g.key === key)!;
  if (group.topics.length > 0) return { topics: { hasSome: [...group.topics] } };
  const known = TOPIC_GROUPS.flatMap((g) => [...g.topics]);
  return { NOT: { topics: { hasSome: known } } }; // "other": nothing in a named group
}

/** Empty list when the database is unavailable. */
export async function getNews(opts: NewsOpts = {}): Promise<NewsView[]> {
  return (await getNewsResult(opts)).items;
}

/** Like getNews, but says whether the load failed so a page can show an error instead of "nothing here". */
export async function getNewsResult(opts: NewsOpts = {}): Promise<{ items: NewsView[]; failed: boolean }> {
  try {
    const [rows, newest] = await Promise.all([
      prisma.newsItem.findMany({
        where: {
          status: "published",
          ...(opts.countryCode ? { countryCode: opts.countryCode } : {}),
          ...topicWhere(opts.topic),
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
    return { items: out, failed: false };
  } catch (err) {
    console.error("[news] getNews failed:", err);
    return { items: [], failed: true };
  }
}

/** When each source's daily check last succeeded (shown as "Checked" — never as human review). */
export async function getFeedChecks(): Promise<FeedChecks> {
  try {
    const rows = await prisma.newsFeedState.findMany({ select: { feed: true, lastSuccessAt: true } });
    // The UK has ~200 feeds. One broken feed must not make every card look stale, so use the median
    // time of a source's feeds: "typically checked at this time".
    const times: Record<string, string[]> = {};
    for (const r of rows) {
      if (!r.lastSuccessAt) continue;
      (times[r.feed.split(":")[0]] ??= []).push(r.lastSuccessAt.toISOString());
    }
    const out: FeedChecks = {};
    for (const [source, list] of Object.entries(times)) {
      list.sort();
      out[source as NewsView["source"]] = list[Math.floor((list.length - 1) / 2)];
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

/** A government's advisory level for a country. Defaults to the US; pass "canada" for Canada's. */
export async function getAdvisory(countryCode: string, source: "state" | "canada" = "state"): Promise<AdvisoryView | null> {
  try {
    const a = await prisma.advisoryLevel.findUnique({ where: { source_countryCode: { source, countryCode } } });
    return a ? { level: a.level, label: a.label, url: a.url, publishedAt: a.publishedAt.toISOString() } : null;
  } catch (err) {
    console.error("[news] getAdvisory failed:", err);
    return null;
  }
}

export type LevelChange = { from: number; to: number; changedAt: string; url: string };

/** A country's US level changes, newest first. Empty until the first change after we start recording. */
export async function getLevelChanges(countryCode: string, limit = 10): Promise<LevelChange[]> {
  try {
    const rows = await prisma.advisoryChange.findMany({ where: { countryCode }, orderBy: { changedAt: "desc" }, take: limit });
    return rows.map((r) => ({ from: r.fromLevel, to: r.toLevel, changedAt: r.changedAt.toISOString(), url: r.url }));
  } catch (err) {
    console.error("[news] getLevelChanges failed:", err);
    return [];
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

export type PulseRow = { code: string; name: string; slug: string; level: number };
export type Pulse = { alert: NewsView | null; rows: PulseRow[]; updates: NewsView[]; checkedAt?: string };

/** Home hero card: the most serious current alert plus four destinations with their State Dept level. */
export async function getPulse(): Promise<Pulse | null> {
  try {
    const [news, levels, checks] = await Promise.all([
      getNews({ limit: 60, sinceDays: 60 }),
      prisma.advisoryLevel.findMany({ where: { source: "state" } }),
      getFeedChecks(),
    ]);
    const { alerts, latest } = splitNews(news);
    const rows: PulseRow[] = [];
    for (const l of levels) {
      const c = countryByCode(l.countryCode);
      if (c) rows.push({ code: c.code, name: c.name, slug: c.slug, level: l.level });
    }
    const order = (code: string) => NEWS_COUNTRIES.findIndex((c) => c.code === code);
    // Highest level first, then launch-country order: stable, so the card does not reshuffle.
    rows.sort((a, b) => b.level - a.level || order(a.code) - order(b.code));
    const top = rows.slice(0, 6); // the card shows 4, or 6 on tall screens
    if (!alerts[0] && top.length === 0) return null;
    return { alert: alerts[0] ?? null, rows: top, updates: latest.slice(0, 2), checkedAt: checks.state ?? checks.fcdo };
  } catch (err) {
    console.error("[news] getPulse failed:", err);
    return null;
  }
}
