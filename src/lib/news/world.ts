import paths from "@/content/worldMapPaths.json";
import { parseStateAll } from "./sources";
import { NEWS_COUNTRIES } from "./countries";
import { STATE_LEVEL } from "./types";

// Data for the world advisory map: country outlines (Natural Earth 110m, public domain,
// pre-projected into src/content/worldMapPaths.json) coloured by the US State Dept level.
// Only the level number is shown — their text is not copied — and the scale is theirs alone.

const STATE_FEED = "https://travel.state.gov/_res/rss/TAsTWs.xml";

export type MapCountry = {
  name:   string;
  d:      string;
  level?: number;
  label?: string;
  slug?:  string; // launch countries link to their news hub
};

// State Dept spellings → outline names.
const ALIAS: Record<string, string> = {
  "The Bahamas": "Bahamas", "Bosnia and Herzegovina": "Bosnia and Herz.", "Burma": "Myanmar",
  "Central African Republic": "Central African Rep.", "Republic of Congo": "Congo",
  "Côte d’Ivoire": "Côte d'Ivoire", "Democratic Republic of the Congo": "Dem. Rep. Congo",
  "Dominican Republic": "Dominican Rep.", "Equatorial Guinea": "Eq. Guinea", "Eswatini": "eSwatini",
  "The Gambia": "Gambia", "The Kyrgyz Republic": "Kyrgyzstan", "North Macedonia": "Macedonia",
  "Mexico Travel Advisory": "Mexico", "South Sudan": "S. Sudan", "Solomon Islands": "Solomon Is.",
  "Gaza": "Palestine", "The West Bank": "Palestine", "Turkey": "Turkey",
};

// Outline names for our launch countries (to attach a news-hub link).
const HUB_OUTLINE: Record<string, string> = { "Türkiye": "Turkey" };

/** Empty when the feed is unreachable — the map then simply does not render. */
export async function getWorldMap(): Promise<MapCountry[]> {
  if ((process.env.NEWS_DISABLED_SOURCES ?? "").split(",").map((s) => s.trim()).includes("state")) return [];
  try {
    const res = await fetch(STATE_FEED, {
      headers: { "User-Agent": "TravalBee/1.0 (+https://travalbee.com/support)" },
      next: { revalidate: 21_600 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const levels = new Map<string, { level: number; label: string }>();
    for (const s of parseStateAll(await res.text())) {
      const key = ALIAS[s.name] ?? s.name;
      const prev = levels.get(key);
      if (!prev || s.level > prev.level) levels.set(key, { level: s.level, label: STATE_LEVEL[s.level] ?? s.label });
    }
    const hubs = new Map(NEWS_COUNTRIES.map((c) => [HUB_OUTLINE[c.name] ?? c.name, c.slug]));
    return (paths as { n: string; d: string }[]).map((p) => ({
      name: p.n, d: p.d, ...levels.get(p.n), slug: hubs.get(p.n),
    }));
  } catch (err) {
    console.error("[news] getWorldMap failed:", err);
    return [];
  }
}
