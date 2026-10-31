// Shared by server pages and client components — keep free of database imports.

export type NewsView = {
  id:          string;
  source:      "fcdo" | "state" | "gdacs";
  countryCode: string;
  countryName: string;
  countrySlug: string;
  topics:      string[];
  severity:    number; // 0 info … 4 critical
  title:       string;
  summary:     string;
  url:         string;
  publishedAt: string; // ISO — serialisable for client components
  /** GDACS events span countries: the other launch countries covered by the same event. */
  alsoAffects?: { name: string; slug: string }[];
  /** A newer update from the same source for the same country has replaced this one. */
  superseded?: boolean;
};

export type AdvisoryView = { level: number; label: string; url: string; publishedAt: string };

/** When our daily check last ran successfully, per source. ISO strings; missing = never. */
export type FeedChecks = Partial<Record<NewsView["source"], string>>;

/** Alerts stop being "current" after this long; older ones move to history. */
export const GDACS_ACTIVE_DAYS = 14;
export const OTHER_ACTIVE_DAYS = 60;

export const TOPICS = ["entry", "safety", "health", "weather", "disaster", "advisory"] as const;
export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABEL: Record<string, string> = {
  entry: "Entry requirements", safety: "Safety", health: "Health", weather: "Weather", disaster: "Disasters", advisory: "Advisory level",
};

export const SOURCE_LABEL: Record<string, string> = {
  fcdo: "UK FCDO", state: "US State Dept", gdacs: "GDACS",
};

export type SeverityTag = { label: string; authority: string; tone: "quiet" | "warn" | "alert" };

const STATE_LEVEL: Record<number, string> = { 1: "Normal precautions", 2: "Increased caution", 3: "Reconsider travel", 4: "Do not travel" };

/**
 * A prominent tag only for things that deserve one. Each authority keeps its own wording:
 * the scales (State Dept levels, FCDO advice, GDACS colours) are not equivalent.
 */
export function severityTag(item: Pick<NewsView, "source" | "severity">): SeverityTag | null {
  if (item.source === "state") {
    const tone = item.severity >= 4 ? "alert" : item.severity === 3 ? "warn" : "quiet";
    return { label: `Level ${item.severity}: ${STATE_LEVEL[item.severity] ?? ""}`.trim(), authority: "US State Dept", tone };
  }
  if (item.source === "gdacs") {
    return item.severity >= 4 ? { label: "Red alert", authority: "GDACS", tone: "alert" }
      : item.severity === 3 ? { label: "Orange alert", authority: "GDACS", tone: "warn" } : null;
  }
  if (item.severity >= 4) return { label: "Advises against all travel", authority: "UK FCDO", tone: "alert" };
  if (item.severity === 3) return { label: "Advises against all but essential travel", authority: "UK FCDO", tone: "warn" };
  return null;
}

/** Whether the item still counts as a current alert (serious and recent enough). */
export function isCurrentAlert(item: Pick<NewsView, "source" | "severity" | "publishedAt">, now = Date.now()): boolean {
  if (item.severity < 3) return false;
  const days = item.source === "gdacs" ? GDACS_ACTIVE_DAYS : OTHER_ACTIVE_DAYS;
  return now - Date.parse(item.publishedAt) <= days * 86_400_000;
}

/** Current alerts, regular latest updates, and history (superseded or expired). No item appears twice. */
export function splitNews(items: NewsView[], now = Date.now()) {
  const alerts: NewsView[] = [], latest: NewsView[] = [], history: NewsView[] = [];
  for (const i of items) {
    if (i.superseded) history.push(i);
    else if (isCurrentAlert(i, now)) alerts.push(i);
    else if (i.severity >= 3) history.push(i); // a serious alert that has aged out
    else latest.push(i);
  }
  alerts.sort((a, b) => b.severity - a.severity || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return { alerts, latest, history };
}

/** "Updated" where the source gives a modified date; State Dept items carry a publication date. */
export const DATE_LABEL: Record<string, string> = { fcdo: "Updated", gdacs: "Updated", state: "Published" };

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatNewsDate = (iso: string) => DATE_FMT.format(new Date(iso));

export const NEWS_ATTRIBUTION =
  "UK travel advice contains public sector information licensed under the Open Government Licence v3.0. " +
  "US State Department advisory levels and GDACS alerts are linked to their official sources.";

export const NEWS_DISCLAIMER =
  "TravalBee summarises information published by official sources and can be behind them. Guidance can change quickly, so always check the official source for the latest advice before you travel. " +
  "A Checked date shows when our automatic daily check last ran, not a human review. TravalBee is not a substitute for official advice.";
