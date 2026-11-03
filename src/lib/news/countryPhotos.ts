import photos from "@/content/countryPhotos.json";

// One recognisable landmark per country, shown as a small thumbnail on news cards. Files live in
// /public/country-photos/<lower-case ISO code>.jpg (Unsplash licence). The list of countries that
// have one, with photo ID and photographer for credits, is src/content/countryPhotos.json.
// A country with no entry simply shows no thumbnail. Photos are always full colour.

const PHOTOS = photos as Record<string, { id: string; by: string }>;

export function countryPhoto(code: string): string | null {
  const c = code.toLowerCase();
  return PHOTOS[c] ? `/country-photos/${c}.jpg` : null;
}
