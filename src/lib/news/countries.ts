import world from "@/content/worldCountries.json";

// Two tiers of country:
//   NEWS_COUNTRIES ("popular") — full news: UK FCDO written updates are fetched for each, they are
//     the filter chips, and they feed "Latest updates". Expanding this tier = adding a row here
//     (plus its flag in /public/flags).
//   ALL_COUNTRIES — every country the US State Dept lists (~213): a basic page with the US level,
//     its history and any current GDACS alert. Generated into src/content/worldCountries.json.
// Every source maps its own country naming onto these entries, so a feed that says "Turkey" or
// "Türkiye" lands on the same page.

export type NewsCountry = {
  code:      string;    // ISO 3166-1 alpha-2
  name:      string;    // display name
  slug:      string;    // /news/[slug]
  fcdoSlug?: string;    // GOV.UK foreign-travel-advice slug (208 of 213 countries have a page)
  aliases:   string[];  // other spellings seen in feeds
  /** A city in this country with a stored Google place, for a one-tap "Plan a trip" link. */
  planCity?: "kyoto" | "lisbon" | "rome" | "marrakech" | "paris";
  popular:   boolean;
};

export const NEWS_COUNTRIES: NewsCountry[] = [
  { code: "JP", name: "Japan",                slug: "japan",                fcdoSlug: "japan",                aliases: [],                              planCity: "kyoto",     popular: true },
  { code: "PT", name: "Portugal",             slug: "portugal",             fcdoSlug: "portugal",             aliases: [],                              planCity: "lisbon",    popular: true },
  { code: "IT", name: "Italy",                slug: "italy",                fcdoSlug: "italy",                aliases: [],                              planCity: "rome",      popular: true },
  { code: "MA", name: "Morocco",              slug: "morocco",              fcdoSlug: "morocco",              aliases: [],                              planCity: "marrakech", popular: true },
  { code: "FR", name: "France",               slug: "france",               fcdoSlug: "france",               aliases: [],                              planCity: "paris",     popular: true },
  { code: "ES", name: "Spain",                slug: "spain",                fcdoSlug: "spain",                aliases: [],                                                       popular: true },
  { code: "GR", name: "Greece",               slug: "greece",               fcdoSlug: "greece",               aliases: [],                                                       popular: true },
  { code: "TH", name: "Thailand",             slug: "thailand",             fcdoSlug: "thailand",             aliases: [],                                                       popular: true },
  { code: "TR", name: "Türkiye",              slug: "turkey",               fcdoSlug: "turkey",               aliases: ["Turkey", "Turkiye", "Türkiye (Turkey)"],                popular: true },
  { code: "AE", name: "United Arab Emirates", slug: "united-arab-emirates", fcdoSlug: "united-arab-emirates", aliases: ["UAE"],                                                  popular: true },
];

type WorldRow = { code: string; name: string; slug: string; state: string[]; fcdo?: string };

const popularCodes = new Set(NEWS_COUNTRIES.map((c) => c.code));

export const ALL_COUNTRIES: NewsCountry[] = [
  ...NEWS_COUNTRIES,
  ...(world as WorldRow[])
    .filter((w) => !popularCodes.has(w.code))
    .map((w): NewsCountry => ({ code: w.code, name: w.name, slug: w.slug, fcdoSlug: w.fcdo, aliases: w.state, popular: false }))
    .sort((a, b) => a.name.localeCompare(b.name)),
];

const norm = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&amp;/g, "&").replace(/&/g, "and").replace(/[’']/g, "").replace(/\s+/g, " ").trim();

const BY_CODE = new Map(ALL_COUNTRIES.map((c) => [c.code, c]));
const BY_SLUG = new Map(ALL_COUNTRIES.map((c) => [c.slug, c]));
const BY_NAME = new Map<string, NewsCountry>();
for (const c of ALL_COUNTRIES) for (const n of [c.name, ...c.aliases]) BY_NAME.set(norm(n), c);
// A popular country may also be spelled the State Dept's way (e.g. "Turkey").
for (const w of world as WorldRow[]) {
  const c = BY_CODE.get(w.code);
  if (c) for (const n of w.state) BY_NAME.set(norm(n), c);
}

// Spellings GDACS uses that differ from the State Dept's.
const EXTRA_ALIASES: Record<string, string[]> = {
  CD: ["Democratic Republic of Congo", "DR Congo", "Congo, Democratic Republic of the"],
  CG: ["Congo", "Congo, Republic of the"],
  CZ: ["Czech Republic"],
  MM: ["Myanmar (Burma)"],
  CI: ["Ivory Coast"],
  SZ: ["Swaziland"],
  TL: ["East Timor"],
  MK: ["Macedonia"],
  KR: ["Korea, Republic of", "Republic of Korea"],
  KP: ["Korea, Democratic People's Republic of"],
  RU: ["Russian Federation"],
};
for (const [code, names] of Object.entries(EXTRA_ALIASES)) {
  const c = BY_CODE.get(code);
  if (c) for (const n of names) BY_NAME.set(norm(n), c);
}

export const countryByCode = (code: string) => BY_CODE.get(code);
export const countryBySlug = (slug: string) => BY_SLUG.get(slug);

/** Matches one country name as written by a feed ("Turkey", "Japan Region"). */
export function matchCountryName(raw: string): NewsCountry | undefined {
  const n = norm(raw).replace(/ region$/, "").replace(/ travel advisory$/, "");
  return BY_NAME.get(n);
}

/** Matches a comma-separated country list (GDACS) to every known country it names. */
export function matchCountryList(list: string): NewsCountry[] {
  const found = new Map<string, NewsCountry>();
  for (const part of list.split(",")) {
    const c = matchCountryName(part);
    if (c) found.set(c.code, c);
  }
  return Array.from(found.values());
}
