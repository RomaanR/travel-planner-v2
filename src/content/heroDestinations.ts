import { plannerHref } from "@/lib/plannerLink";
import type { Interest, Pace, TravelParty } from "@/types/itinerary";

// Home-page hero content. Every photo's location was checked on its Unsplash
// page (free Unsplash License); place IDs come from a free IDs-only Places
// lookup and may be stored indefinitely under Google's terms.

type City = { name: string; placeId: string; lat: number; lng: number };

const CITIES = {
  kyoto:     { name: "Kyoto",     placeId: "ChIJ8cM8zdaoAWARPR27azYdlsA", lat: 35.0116, lng: 135.7681 },
  lisbon:    { name: "Lisbon",    placeId: "ChIJO_PkYRozGQ0R0DaQ5L3rAAQ", lat: 38.7223, lng: -9.1393 },
  rome:      { name: "Rome",      placeId: "ChIJu46S-ZZhLxMROG5lkwZ3D7k", lat: 41.9028, lng: 12.4964 },
  marrakech: { name: "Marrakech", placeId: "ChIJUZ4Xlo3urw0RuK2HT1O2UFk", lat: 31.6295, lng: -7.9811 },
  paris:     { name: "Paris",     placeId: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ", lat: 48.8566, lng: 2.3522 },
} satisfies Record<string, City>;

function cityHref(city: City, extra: { pace?: Pace; travelParty?: TravelParty; interests?: Interest[] } = {}) {
  return plannerHref({
    destination: city.name,
    place: { placeId: city.placeId, lat: city.lat, lng: city.lng, isRegion: false },
    ...extra,
  });
}

// ── Background slideshow ─────────────────────────────────────────────────────

export type HeroPhoto = {
  src:          string;
  alt:          string;
  place:        string; // caption, e.g. "Hōkan-ji, Kyoto"
  photographer: string;
  planHref:     string;
};

export const HERO_PHOTOS: HeroPhoto[] = [
  {
    src:          "https://images.unsplash.com/photo-1558862107-d49ef2a04d72?w=1920&q=85",
    alt:          "A stone path through a tunnel of vermilion torii gates at Fushimi Inari, Kyoto",
    place:        "Fushimi Inari, Kyoto",
    photographer: "David Emrich",
    planHref:     cityHref(CITIES.kyoto),
  },
  {
    src:          "https://images.unsplash.com/photo-1616862890964-fd20e9dd106d?w=1920&q=85",
    alt:          "Terracotta rooftops of the Alfama district running down to the Tagus in Lisbon",
    place:        "Alfama, Lisbon",
    photographer: "João Reguengos",
    planHref:     cityHref(CITIES.lisbon),
  },
  {
    src:          "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1920&q=85",
    alt:          "The Colosseum in Rome",
    place:        "The Colosseum, Rome",
    photographer: "David Köhler",
    planHref:     cityHref(CITIES.rome),
  },
  {
    src:          "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=1920&q=85",
    alt:          "The Koutoubia Mosque minaret above Marrakech, with the snow-capped Atlas Mountains behind",
    place:        "The Koutoubia, Marrakech",
    photographer: "Paul Macallan",
    planHref:     cityHref(CITIES.marrakech),
  },
  {
    src:          "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1920&q=85",
    alt:          "Pont Alexandre III lit up at night over the Seine in Paris",
    place:        "Pont Alexandre III, Paris",
    photographer: "Léonard Cotte",
    planHref:     cityHref(CITIES.paris),
  },
];

// ── Mood chips ───────────────────────────────────────────────────────────────
// One tap fills the destination plus a matching pace / party / interests.

export type HeroMood = { label: string; href: string };

export const HERO_MOODS: HeroMood[] = [
  { label: "A slow weekend in Kyoto",     href: cityHref(CITIES.kyoto,     { pace: "relaxed",  interests: ["culture-history", "relaxation-wellness"] }) },
  { label: "Food & wine in Lisbon",       href: cityHref(CITIES.lisbon,    { pace: "moderate", interests: ["food-dining"] }) },
  { label: "Family days in Rome",         href: cityHref(CITIES.rome,      { pace: "moderate", travelParty: "family", interests: ["sightseeing", "culture-history"] }) },
  { label: "The quiet side of Marrakech", href: cityHref(CITIES.marrakech, { pace: "relaxed",  interests: ["culture-history", "shopping"] }) },
];
