// Links into the planner (/curate) with a destination and dates already filled.
// Used by the home-page quick planner, the sample page and shared trips.
//
//   /curate?destination=Lisbon&pid=…&lat=…&lng=…&region=1&from=YYYY-MM-DD&to=YYYY-MM-DD
//
// `destination` alone pre-types the search box; with pid/lat/lng the destination
// counts as selected and the form opens at the next step.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type PlannerPrefill = {
  destination:    string;
  place?:         { placeId: string; lat: number; lng: number; isRegion: boolean };
  departureDate?: string;
  returnDate?:    string;
};

export function plannerHref(prefill?: PlannerPrefill | null): string {
  if (!prefill?.destination) return "/curate";
  const params = new URLSearchParams({ destination: prefill.destination });
  if (prefill.place) {
    params.set("pid", prefill.place.placeId);
    params.set("lat", prefill.place.lat.toFixed(6));
    params.set("lng", prefill.place.lng.toFixed(6));
    if (prefill.place.isRegion) params.set("region", "1");
  }
  if (prefill.departureDate && prefill.returnDate) {
    params.set("from", prefill.departureDate);
    params.set("to", prefill.returnDate);
  }
  return `/curate?${params.toString()}`;
}

/**
 * Parses and validates a planner link. Anything malformed is dropped rather than
 * trusted — the URL is user-editable. Dates must be today or later, with the
 * return 1 to (maxDays − 1) days after departure.
 */
export function readPlannerPrefill(search: string, today: string, maxDays: number): PlannerPrefill | null {
  const params = new URLSearchParams(search);
  const destination = params.get("destination")?.trim().slice(0, 100);
  if (!destination) return null;

  const prefill: PlannerPrefill = { destination };

  const placeId = params.get("pid");
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (
    placeId && placeId.length <= 300 && /^[A-Za-z0-9_-]+$/.test(placeId) &&
    Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    Number.isFinite(lng) && Math.abs(lng) <= 180 &&
    params.get("lat") !== null && params.get("lng") !== null
  ) {
    prefill.place = { placeId, lat, lng, isRegion: params.get("region") === "1" };
  }

  const from = params.get("from");
  const to   = params.get("to");
  if (from && to && DATE_RE.test(from) && DATE_RE.test(to) && from >= today) {
    const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
    if (days >= 2 && days <= maxDays) {
      prefill.departureDate = from;
      prefill.returnDate    = to;
    }
  }

  return prefill;
}
