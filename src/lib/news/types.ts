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
};

export type AdvisoryView = { level: number; label: string; url: string; publishedAt: string };

export const TOPICS = ["entry", "safety", "health", "weather", "disaster", "advisory"] as const;
export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABEL: Record<string, string> = {
  entry: "Entry requirements", safety: "Safety", health: "Health", weather: "Weather", disaster: "Disasters", advisory: "Advisory level",
};

export const SOURCE_LABEL: Record<string, string> = {
  fcdo: "UK FCDO", state: "US State Dept", gdacs: "GDACS",
};

export type SeverityTag = { label: string; tone: "quiet" | "warn" | "alert" };

/** A prominent tag only for things that deserve one. */
export function severityTag(item: Pick<NewsView, "source" | "severity">): SeverityTag | null {
  if (item.source === "state") {
    const tone = item.severity >= 4 ? "alert" : item.severity === 3 ? "warn" : "quiet";
    return { label: `Level ${item.severity}`, tone };
  }
  if (item.source === "gdacs") {
    return item.severity >= 4 ? { label: "Red alert", tone: "alert" } : item.severity === 3 ? { label: "Orange alert", tone: "warn" } : null;
  }
  if (item.severity >= 4) return { label: "Advises against all travel", tone: "alert" };
  if (item.severity === 3) return { label: "Advises against all but essential travel", tone: "warn" };
  return null;
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatNewsDate = (iso: string) => DATE_FMT.format(new Date(iso));

export const NEWS_ATTRIBUTION =
  "UK travel advice contains public sector information licensed under the Open Government Licence v3.0. " +
  "US State Department advisory levels and GDACS alerts are linked to their official sources.";

export const NEWS_DISCLAIMER =
  "Summaries come from official sources and may be out of date. Always check the official source before you travel; TravalBee is not a substitute for official advice.";
