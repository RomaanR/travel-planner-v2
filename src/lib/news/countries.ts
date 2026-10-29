// Countries covered by travel news in Phase 1. Expanding coverage = adding a row.
// Every source maps its own country naming onto these entries, so a feed that
// says "Turkey" or "Türkiye" lands on the same hub.

export type NewsCountry = {
  code:     string;    // ISO 3166-1 alpha-2
  name:     string;    // display name
  slug:     string;    // /news/[slug]
  fcdoSlug: string;    // GOV.UK foreign-travel-advice slug
  aliases:  string[];  // other spellings seen in feeds
  /** A city in this country with a stored Google place, for a one-tap "Plan a trip" link. */
  planCity?: "kyoto" | "lisbon" | "rome" | "marrakech" | "paris";
};

export const NEWS_COUNTRIES: NewsCountry[] = [
  { code: "JP", name: "Japan",                slug: "japan",                fcdoSlug: "japan",                aliases: [],                              planCity: "kyoto" },
  { code: "PT", name: "Portugal",             slug: "portugal",             fcdoSlug: "portugal",             aliases: [],                              planCity: "lisbon" },
  { code: "IT", name: "Italy",                slug: "italy",                fcdoSlug: "italy",                aliases: [],                              planCity: "rome" },
  { code: "MA", name: "Morocco",              slug: "morocco",              fcdoSlug: "morocco",              aliases: [],                              planCity: "marrakech" },
  { code: "FR", name: "France",               slug: "france",               fcdoSlug: "france",               aliases: [],                              planCity: "paris" },
  { code: "ES", name: "Spain",                slug: "spain",                fcdoSlug: "spain",                aliases: [] },
  { code: "GR", name: "Greece",               slug: "greece",               fcdoSlug: "greece",               aliases: [] },
  { code: "TH", name: "Thailand",             slug: "thailand",             fcdoSlug: "thailand",             aliases: [] },
  { code: "TR", name: "Türkiye",              slug: "turkey",               fcdoSlug: "turkey",               aliases: ["Turkey", "Turkiye", "Türkiye (Turkey)"] },
  { code: "AE", name: "United Arab Emirates", slug: "united-arab-emirates", fcdoSlug: "united-arab-emirates", aliases: ["UAE"] },
];

const norm = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const BY_NAME = new Map<string, NewsCountry>();
for (const c of NEWS_COUNTRIES) for (const n of [c.name, ...c.aliases]) BY_NAME.set(norm(n), c);

export const countryByCode = (code: string) => NEWS_COUNTRIES.find((c) => c.code === code);
export const countryBySlug = (slug: string) => NEWS_COUNTRIES.find((c) => c.slug === slug);

/** Matches one country name as written by a feed ("Turkey", "Japan Region"). */
export function matchCountryName(raw: string): NewsCountry | undefined {
  const n = norm(raw).replace(/ region$/, "").replace(/ travel advisory$/, "");
  return BY_NAME.get(n);
}

/** Matches a comma-separated country list (GDACS) to every launch country it names. */
export function matchCountryList(list: string): NewsCountry[] {
  const found = new Map<string, NewsCountry>();
  for (const part of list.split(",")) {
    const c = matchCountryName(part);
    if (c) found.set(c.code, c);
  }
  return Array.from(found.values());
}
