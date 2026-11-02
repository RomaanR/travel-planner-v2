import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db";
import { ALL_COUNTRIES, countryByCode } from "./countries";
import { type ParsedAdvisory, type ParsedItem, parseFcdo, parseGdacs, parseState } from "./sources";

// Daily ingest of official travel feeds into NewsItem. Called by /api/cron/news.
// Each feed is isolated: one failing never blocks the others, and every outcome is
// recorded in NewsFeedState so a stale feed is visible rather than silent.

const USER_AGENT = "TravalBee/1.0 (+https://travalbee.com/support)";
const FETCH_TIMEOUT_MS = 20_000;
const FEED_CONCURRENCY = 12;
const STATE_FEED = "https://travel.state.gov/_res/rss/TAsTWs.xml";
const GDACS_FEED = "https://www.gdacs.org/xml/rss.xml";
const fcdoFeed = (slug: string) => `https://www.gov.uk/foreign-travel-advice/${slug}.atom`;

export type FeedResult = { feed: string; status: "ok" | "not_modified" | "error"; added: number; error?: string };

// Set NEWS_DISABLED_SOURCES="gdacs,state" to switch sources off without a deploy of code changes.
function disabledSources(): Set<string> {
  return new Set((process.env.NEWS_DISABLED_SOURCES ?? "").split(",").map((s) => s.trim()).filter(Boolean));
}

type Fetched =
  | { kind: "not_modified" }
  | { kind: "ok"; text: string; etag: string | null; lastModified: string | null };

/** GET with conditional headers; a 304 costs almost nothing on either side. */
async function fetchFeed(url: string, state: { etag: string | null; lastModified: string | null } | null): Promise<Fetched> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept:       "application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
  };
  if (state?.etag) headers["If-None-Match"] = state.etag;
  if (state?.lastModified) headers["If-Modified-Since"] = state.lastModified;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
  if (res.status === 304) return { kind: "not_modified" };
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
  return { kind: "ok", text: await res.text(), etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified") };
}

async function recordState(feed: string, patch: { status: FeedResult["status"]; added: number; error?: string; etag?: string | null; lastModified?: string | null }) {
  const now = new Date();
  await prisma.newsFeedState.upsert({
    where:  { feed },
    create: { feed, etag: patch.etag ?? null, lastModified: patch.lastModified ?? null, lastRunAt: now, lastSuccessAt: patch.status === "error" ? null : now, lastStatus: patch.status, lastError: patch.error ?? null, itemsAdded: patch.added },
    update: {
      lastRunAt: now, lastStatus: patch.status, lastError: patch.error ?? null, itemsAdded: patch.added,
      ...(patch.status === "error" ? {} : { lastSuccessAt: now }),
      ...(patch.etag !== undefined ? { etag: patch.etag } : {}),
      ...(patch.lastModified !== undefined ? { lastModified: patch.lastModified } : {}),
    },
  }).catch((err) => console.error(`[news] could not record state for ${feed}:`, err));
}

/** Runs one feed; always resolves with its result. */
async function runFeed(feed: string, work: (state: { etag: string | null; lastModified: string | null } | null) => Promise<{ added: number; etag?: string | null; lastModified?: string | null; notModified?: boolean }>): Promise<FeedResult> {
  try {
    const state = await prisma.newsFeedState.findUnique({ where: { feed }, select: { etag: true, lastModified: true } });
    const out = await work(state);
    const status = out.notModified ? "not_modified" : "ok";
    await recordState(feed, { status, added: out.added, etag: out.etag, lastModified: out.lastModified });
    return { feed, status, added: out.added };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[news] ${feed} failed:`, message);
    Sentry.withScope((scope) => { scope.setTag("news_feed", feed); Sentry.captureException(err); });
    await recordState(feed, { status: "error", added: 0, error: message.slice(0, 300) });
    return { feed, status: "error", added: 0, error: message };
  }
}

async function insertItems(items: ParsedItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const { count } = await prisma.newsItem.createMany({ data: items, skipDuplicates: true });
  return count;
}

// ─── Sources ──────────────────────────────────────────────────────────────────

async function ingestFcdo(slug: string, code: string): Promise<FeedResult> {
  return runFeed(`fcdo:${slug}`, async (state) => {
    const res = await fetchFeed(fcdoFeed(slug), state);
    if (res.kind === "not_modified") return { added: 0, notModified: true };
    const country = countryByCode(code)!;
    const item = parseFcdo(res.text, country);
    return { added: item ? await insertItems([item]) : 0, etag: res.etag, lastModified: res.lastModified };
  });
}

async function ingestState(): Promise<FeedResult> {
  return runFeed("state", async (state) => {
    const res = await fetchFeed(STATE_FEED, state);
    if (res.kind === "not_modified") return { added: 0, notModified: true };

    const advisories = parseState(res.text);
    if (advisories.length === 0) throw new Error("State Dept feed parsed to zero advisories (format change?)");

    // One read for every stored level, so a daily run does a handful of writes, not hundreds.
    const stored = new Map((await prisma.advisoryLevel.findMany({ where: { source: "state" } })).map((r) => [r.countryCode, r]));
    let added = 0;

    // Countries we have not seen before: record the level only (no "news" about a first sighting),
    // except the popular ones, whose first sighting is shown as an update as before.
    const fresh = advisories.filter((a) => !stored.has(a.country.code));
    if (fresh.length) {
      await prisma.advisoryLevel.createMany({
        data: fresh.map((a) => ({ source: "state", countryCode: a.country.code, level: a.level, label: a.label, url: a.url, publishedAt: a.publishedAt })),
        skipDuplicates: true,
      });
      for (const adv of fresh.filter((a) => a.country.popular)) {
        added += await insertItems([stateItem(adv, undefined)]);
      }
    }

    for (const adv of advisories) {
      const prev = stored.get(adv.country.code);
      if (!prev) continue;
      const levelChanged = prev.level !== adv.level;
      const dateChanged = prev.publishedAt.getTime() !== adv.publishedAt.getTime();
      if (!levelChanged && !dateChanged) continue;

      if (levelChanged) {
        await prisma.advisoryChange.create({
          data: { countryCode: adv.country.code, fromLevel: prev.level, toLevel: adv.level, changedAt: adv.publishedAt, url: adv.url },
        });
      }
      // News: every update for a popular country; for others only a rise to Level 3 or 4 (a real alert).
      const raisedToSerious = levelChanged && adv.level > prev.level && adv.level >= 3;
      if (adv.country.popular || raisedToSerious) added += await insertItems([stateItem(adv, prev.level)]);

      await prisma.advisoryLevel.update({
        where: { source_countryCode: { source: "state", countryCode: adv.country.code } },
        data:  { level: adv.level, label: adv.label, url: adv.url, publishedAt: adv.publishedAt },
      });
    }
    return { added, etag: res.etag, lastModified: res.lastModified };
  });
}

/** Our own sentence for a State Dept advisory — their text is not copied. */
function stateItem(adv: ParsedAdvisory, prevLevel: number | undefined): ParsedItem {
  const name = adv.country.name;
  const summary = prevLevel === undefined
    ? `The US State Department lists ${name} at Level ${adv.level} (${adv.label}).`
    : prevLevel !== adv.level
      ? `The US State Department ${adv.level > prevLevel ? "raised" : "lowered"} its advisory for ${name} from Level ${prevLevel} to Level ${adv.level} (${adv.label}).`
      : `The US State Department reissued its Level ${adv.level} advisory for ${name} (${adv.label}).`;
  return {
    source: "state", externalId: `${adv.country.code}#${adv.publishedAt.toISOString()}`, countryCode: adv.country.code,
    topics: ["advisory"], severity: adv.level, title: `${name}: US advisory is Level ${adv.level}`,
    summary, url: adv.url, publishedAt: adv.publishedAt,
  };
}

async function ingestGdacs(): Promise<FeedResult> {
  return runFeed("gdacs", async (state) => {
    const res = await fetchFeed(GDACS_FEED, state);
    if (res.kind === "not_modified") return { added: 0, notModified: true };

    let added = 0;
    for (const item of parseGdacs(res.text)) {
      // An event keeps its identity across updates, so later episodes update the same row.
      const existing = await prisma.newsItem.findUnique({ where: { source_externalId: { source: item.source, externalId: item.externalId } }, select: { id: true } });
      if (existing) {
        await prisma.newsItem.update({ where: { id: existing.id }, data: { title: item.title, summary: item.summary, severity: item.severity, publishedAt: item.publishedAt, url: item.url } });
      } else {
        await prisma.newsItem.create({ data: item });
        added++;
      }
    }
    return { added, etag: res.etag, lastModified: res.lastModified };
  });
}

/** Runs every enabled feed. Never throws. */
export async function runNewsIngest(): Promise<{ results: FeedResult[]; totalAdded: number }> {
  const off = disabledSources();
  const jobs: (() => Promise<FeedResult>)[] = [];
  // State Dept and GDACS are single global feeds; the UK has one feed per country (208 of them).
  if (!off.has("state")) jobs.push(ingestState);
  if (!off.has("gdacs")) jobs.push(ingestGdacs);
  if (!off.has("fcdo")) for (const c of ALL_COUNTRIES) if (c.fcdoSlug) { const { fcdoSlug, code } = c; jobs.push(() => ingestFcdo(fcdoSlug, code)); }

  // Bounded concurrency: ~210 feeds at once would hammer GOV.UK and the database pool.
  const results: FeedResult[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: FEED_CONCURRENCY }, async () => {
    while (next < jobs.length) results.push(await jobs[next++]());
  }));
  return { results, totalAdded: results.reduce((n, r) => n + r.added, 0) };
}
