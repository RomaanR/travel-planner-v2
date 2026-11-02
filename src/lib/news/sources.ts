import { XMLParser } from "fast-xml-parser";
import { type NewsCountry, countryByCode, matchCountryList, matchCountryName } from "./countries";
import { clip, safeUrl, toPlainText } from "./text";

// Pure parsers for the three official feeds. No network or database access here,
// so they can be tested against saved copies of the real feeds.
//
// Reuse policy (see docs/adr/0013-travel-news.md):
//   fcdo  — UK FCDO, Open Government Licence v3.0: the official wording is republished with attribution.
//   state — US State Dept: only facts we construct (country, level, date); their text is NOT copied.
//   gdacs — GDACS: only facts we construct (event type, country, alert level); their text is NOT copied.

export type NewsSource = "fcdo" | "state" | "gdacs";
export type NewsTopic = "entry" | "safety" | "health" | "weather" | "disaster" | "advisory";

export type ParsedItem = {
  source:      NewsSource;
  externalId:  string;
  countryCode: string;
  topics:      NewsTopic[];
  severity:    number; // 0 info … 4 critical
  title:       string;
  summary:     string;
  url:         string;
  publishedAt: Date;
};

export type ParsedAdvisory = {
  country:     NewsCountry;
  level:       number;
  label:       string;
  url:         string;
  publishedAt: Date;
};

const parser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: "@_",
  textNodeName:        "#text",
  isArray:             (name) => name === "item" || name === "entry",
  processEntities:     true,
});

/** All text inside a parsed XML node, ignoring attributes. */
function deepText(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(deepText).join(" ");
  if (typeof node === "object") {
    return Object.entries(node as Record<string, unknown>)
      .filter(([k]) => !k.startsWith("@_"))
      .map(([, v]) => deepText(v))
      .join(" ");
  }
  return "";
}

const asDate = (v: unknown): Date | null => {
  const t = Date.parse(deepText(v));
  return Number.isFinite(t) ? new Date(t) : null;
};

// ─── Topic and severity rules ─────────────────────────────────────────────────

const TOPIC_RULES: [NewsTopic, RegExp][] = [
  ["entry",   /entry requirements|visa|passport|border|etias|\bees\b|\beta\b|immigration|entry and exit|e-?visa|customs/i],
  ["health",  /health|vaccin|disease|outbreak|ebola|measles|dengue|covid|malaria|cholera|screening|mpox/i],
  ["weather", /flood|storm|hurricane|typhoon|cyclone|heatwave|extreme heat|wildfire|heavy rain|snow|monsoon/i],
  ["safety",  /safety and security|warnings and insurance|terroris|crime|protest|demonstration|strike|unrest|conflict|curfew/i],
];

export function topicsFromText(text: string): NewsTopic[] {
  const topics = TOPIC_RULES.filter(([, re]) => re.test(text)).map(([t]) => t);
  return topics.length ? topics : [];
}

/**
 * UK update summaries are about a change ("FCDO no longer advises against all travel to volcanoes",
 * "advises against all travel within 30km of the border"). They are regional and often negated, so
 * matching the wording would mislabel a country, or say the opposite of what the update says.
 * UK items are therefore informational (severity 0); alert levels come from the US State Dept and GDACS.
 */
function fcdoSeverity(): number {
  return 0;
}

// ─── UK FCDO (GOV.UK Atom, one feed per country) ──────────────────────────────

export function parseFcdo(xml: string, country: NewsCountry): ParsedItem | null {
  const doc = parser.parse(xml);
  const entry = doc?.feed?.entry?.[0];
  if (!entry) return null;

  const publishedAt = asDate(entry.updated);
  const id = toPlainText(deepText(entry.id));
  if (!publishedAt || !id) return null;

  const summary = clip(toPlainText(deepText(entry.summary)), 600);
  if (!summary) return null;

  const link = Array.isArray(entry.link) ? entry.link.find((l: { "@_rel"?: string }) => l["@_rel"] === "alternate") : entry.link;
  const fallback = `https://www.gov.uk/foreign-travel-advice/${country.fcdoSlug ?? country.slug}`;

  return {
    source:      "fcdo",
    externalId:  id,
    countryCode: country.code,
    topics:      topicsFromText(summary),
    severity:    fcdoSeverity(),
    title:       `${country.name}: UK travel advice updated`,
    summary,
    url:         safeUrl(link?.["@_href"], fallback),
    publishedAt,
  };
}

// ─── US State Department (one RSS feed for every country) ─────────────────────

const STATE_TITLE = /^(.*?)\s+-\s+Level\s+(\d)\s*:\s*(.+)$/i;

export function parseState(xml: string): ParsedAdvisory[] {
  const doc = parser.parse(xml);
  const items: Record<string, unknown>[] = doc?.rss?.channel?.item ?? [];
  const out: ParsedAdvisory[] = [];

  for (const item of items) {
    const m = toPlainText(deepText(item.title)).match(STATE_TITLE);
    if (!m) continue;
    const country = matchCountryName(m[1]);
    const publishedAt = asDate(item.pubDate);
    const level = Number(m[2]);
    if (!country || !publishedAt || level < 1 || level > 4) continue;
    out.push({
      country,
      level,
      label:       clip(toPlainText(m[3]), 60),
      url:         safeUrl(deepText(item.link), "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html/"),
      publishedAt,
    });
  }
  return out;
}

/** Every country in the State Dept feed (not just launch countries) — used for the advisory world map. */
export type StateLevel = { name: string; level: number; label: string };
export function parseStateAll(xml: string): StateLevel[] {
  const doc = parser.parse(xml);
  const items: Record<string, unknown>[] = doc?.rss?.channel?.item ?? [];
  const out: StateLevel[] = [];
  for (const item of items) {
    const m = toPlainText(deepText(item.title)).match(STATE_TITLE);
    const level = m ? Number(m[2]) : 0;
    if (!m || level < 1 || level > 4) continue;
    out.push({ name: m[1].trim(), level, label: clip(toPlainText(m[3]), 60) });
  }
  return out;
}

// ─── Canada (Global Affairs Canada open data; one JSON file for every country) ───────────────────
// Open Government Licence – Canada: the wording may be reused with attribution, so we show their
// own level text. Levels run 0 (normal precautions) to 3 (avoid all travel).

export type ParsedCanada = { country: NewsCountry; level: number; label: string; url: string; publishedAt: Date };

export function parseCanada(json: unknown): ParsedCanada[] {
  const data = (json as { data?: Record<string, Record<string, unknown>> })?.data ?? {};
  const out: ParsedCanada[] = [];
  for (const [key, row] of Object.entries(data)) {
    if (!/^[A-Z]{2}$/.test(key)) continue; // regional keys such as "PT-20"
    const country = countryByCode(key);
    const level = Number(row["advisory-state"]);
    const eng = row.eng as { "advisory-text"?: string; "url-slug"?: string } | undefined;
    const published = Date.parse(String((row["date-published"] as { asp?: string } | undefined)?.asp ?? ""));
    const text = clip(toPlainText(eng?.["advisory-text"] ?? ""), 80);
    const slug = (eng?.["url-slug"] ?? "").replace(/[^a-z0-9-]/gi, "");
    if (!country || !Number.isInteger(level) || level < 0 || level > 3 || !text || !slug || !Number.isFinite(published)) continue;
    out.push({
      country,
      level,
      label: row["has-regional-advisory"] ? `${text} · some regions differ` : text,
      url: `https://travel.gc.ca/destinations/${slug}`,
      publishedAt: new Date(published),
    });
  }
  return out;
}

// ─── GDACS (global disaster alerts; one RSS feed) ─────────────────────────────

const GDACS_TYPES: Record<string, { label: string; topic: NewsTopic }> = {
  EQ: { label: "Earthquake",       topic: "disaster" },
  TC: { label: "Tropical cyclone", topic: "weather" },
  FL: { label: "Flood",            topic: "weather" },
  VO: { label: "Volcanic activity", topic: "disaster" },
  DR: { label: "Drought",          topic: "weather" },
  WF: { label: "Wildfire",         topic: "weather" },
  TS: { label: "Tsunami",          topic: "disaster" },
};
const GDACS_SEVERITY: Record<string, number> = { green: 1, orange: 3, red: 4 };

/** Only Orange and Red alerts are published — Green events are routine and noisy. */
export function parseGdacs(xml: string): ParsedItem[] {
  const doc = parser.parse(xml);
  const items: Record<string, unknown>[] = doc?.rss?.channel?.item ?? [];
  const out: ParsedItem[] = [];

  for (const item of items) {
    const alert = deepText(item["gdacs:alertlevel"]).trim().toLowerCase();
    const severity = GDACS_SEVERITY[alert] ?? 0;
    if (severity < 3) continue;

    const type = GDACS_TYPES[deepText(item["gdacs:eventtype"]).trim().toUpperCase()];
    const eventId = deepText(item["gdacs:eventid"]).trim();
    const typeCode = deepText(item["gdacs:eventtype"]).trim().toUpperCase();
    if (!type || !eventId) continue;

    const countries = matchCountryList(deepText(item["gdacs:country"]));
    if (countries.length === 0) continue;

    const publishedAt = asDate(item["gdacs:datemodified"]) ?? asDate(item.pubDate) ?? new Date();
    const url = safeUrl(deepText(item.link), "https://www.gdacs.org/");
    const eventName = toPlainText(deepText(item["gdacs:eventname"]));
    const measure = toPlainText(deepText((item["gdacs:severity"] as Record<string, unknown> | undefined)?.["#text"] ?? item["gdacs:severity"]));
    const alertWord = alert === "red" ? "Red" : "Orange";
    // GDACS measures describe the whole event. An affected area ("… in 2009754 km2") spans
    // several countries, so attributing it to one country would be wrong — leave it out.
    const eventWide = /km\s?2|km²/i.test(measure);
    const shownMeasure = eventWide ? "" : measure;

    for (const country of countries) {
      out.push({
        source:      "gdacs",
        // One row per event and country; later episodes of the same event update it in place.
        externalId:  `${typeCode}-${eventId}:${country.code}`,
        countryCode: country.code,
        topics:      [type.topic],
        severity,
        title:       `${alertWord} alert: ${type.label}${eventName && type.label === "Tropical cyclone" ? ` ${eventName}` : ""} — ${country.name}`,
        summary:     clip(`GDACS, the EU/UN disaster alert system, reports ${alert === "orange" ? "an" : "a"} ${alert} alert for a ${type.label.toLowerCase()} affecting ${country.name}${shownMeasure ? ` (${shownMeasure})` : ""}.${eventWide ? " It is a wide-area event that may also affect neighbouring countries." : ""} Check GDACS and local authorities for the latest details.`, 400),
        url,
        publishedAt,
      });
    }
  }
  return out;
}
