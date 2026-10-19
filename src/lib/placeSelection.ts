// Shared handling of a destination picked from Google Places Autocomplete,
// used by the planner form and the home-page quick planner so both clean the
// name and detect regions the same way.

// Google sometimes returns administrative names like "Metropolitan City of Rome
// Capital" or "Province of Barcelona" — these break spatial reasoning and trip
// naming, so we fall back to what the user typed ("Rome").
const ADMIN_AREA_RE = /^(metropolitan city of|province of|region of|county of|prefecture of|district of|municipality of)\b/i;

// City types short-circuit to "not a region"; admin/natural area types without a
// co-present locality flag a region ("Kansai", "Tuscany"). "country" is excluded —
// whole-country selections are too broad for region mode to be useful.
const CITY_TYPES   = new Set(["locality", "sublocality", "neighborhood", "postal_town", "sublocality_level_1"]);
const REGION_TYPES = new Set(["administrative_area_level_1", "administrative_area_level_2", "natural_feature", "colloquial_area"]);

export type SelectedDestination = {
  destination: string;
  placeId:     string;
  lat:         number;
  lng:         number;
  isRegion:    boolean;
};

export function readSelectedDestination(
  place: google.maps.places.PlaceResult | undefined,
  typed: string,
): SelectedDestination | null {
  if (!place?.geometry?.location || !place.place_id) return null;

  // Use place.name ("Istanbul") not formatted_address ("Istanbul, İstanbul, Türkiye").
  const rawName = place.name || place.formatted_address || typed;
  const destination = ADMIN_AREA_RE.test(rawName) ? (typed.trim() || rawName) : rawName;

  const types = place.types ?? [];
  const hasCity   = types.some((t) => CITY_TYPES.has(t));
  const hasRegion = types.some((t) => REGION_TYPES.has(t));

  return {
    destination,
    placeId:  place.place_id,
    lat:      place.geometry.location.lat(),
    lng:      place.geometry.location.lng(),
    isRegion: !hasCity && hasRegion,
  };
}

// Only the fields read above — all in the Basic data tier, so a selection isn't
// billed for contact or atmosphere data we never use.
export const AUTOCOMPLETE_FIELDS = ["name", "formatted_address", "geometry", "place_id", "types"];
