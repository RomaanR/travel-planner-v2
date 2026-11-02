// One recognisable landmark per country, shown as a small thumbnail on news cards. Files live in
// /public/country-photos (Unsplash licence; credits in docs/country-photo-credits.md).
// A country with no entry simply shows no thumbnail. Add one by dropping a 240x240 JPEG named
// after the lower-case ISO code and listing it here. Skip countries the US rates Level 4:
// a postcard picture beside "do not travel" reads wrong.

const PHOTOS = new Set(["in", "ae", "jp", "fr", "es", "it", "pt", "ma", "gr", "th", "tr", "mx", "gt"]);

export function countryPhoto(code: string): string | null {
  const c = code.toLowerCase();
  return PHOTOS.has(c) ? `/country-photos/${c}.jpg` : null;
}
