# ADR-0007: Place identity by provider ID and curated city libraries

- **Status:** Proposed
- **Date:** 2026-10-18

## Context
The model invents place names and coordinates per trip. Enrichment runs a Google Text Search per uncached stop (first result taken, model coordinates kept) and a Place Details call for hours. `PlaceCache` is keyed by a normalised name that strips non-ASCII characters (CJK/Arabic names collapse and collide). Different trips produce different spellings and different places, so cache hit rates are low. Google is believed to be the larger cost line (to be confirmed, `to-do.md` §0). Photo requests are proxied to Google, possibly once per viewer.

Google Maps Platform terms restrict storing most Places content; place IDs may be stored indefinitely and other fields have limited caching allowances. Exact terms must be checked before implementation.

## Options considered
1. **Improve the per-trip cache** (key by place ID, fix normalisation, Places API (New) with field masks). Quick win; still one paid lookup per new stop.
2. **Curated city library**: per city, a vetted set of places with our own tags and descriptions, resolved once to a provider ID; trips assembled from the library, LLM used for selection/narrative only.
3. **Open data first** (OpenStreetMap for identity/coordinates, Wikimedia for landmark photos), Google only for hours/ratings/restaurant photos.

## Decision
Do 1 immediately (it's needed anyway), then 2 for launch cities, with 3 evaluated as a provider inside the same abstraction.

- `places` module owns a `PlaceProvider` port (`resolve`, `details`, `photo`) with Google (Places API New) and OSM adapters.
- `Place` holds **our** identity and content: provider + provider place ID, city, our tags (category, neighbourhood, price, dietary, interests), our description. Coordinates and provider fields are stored only as provider terms allow.
- `PlaceSnapshot` holds provider data (hours, rating, photo reference) with `fetchedAt` and a TTL per field; refreshed by place ID only when the place is about to be shown.
- `CityLibrary` per launch city (~150 places), built by an offline job (LLM via Batch API at 50% cost and/or manual curation), each place resolved and approved before publish.
- Generation for library cities selects from the library; cities without a library use the full-generation path with provider resolution and route validation.
- The LLM never supplies coordinates that reach the map; coordinates always come from the resolved place.

## Consequences
- Per-trip Google search calls drop toward zero for library cities; Claude output shrinks (selection + narrative).
- Place correctness becomes a property of the data, not of each generation.
- Swapping a stop is a library lookup — enables free edits (ADR-0006).
- New operational task: curating and refreshing libraries; city coverage is deliberately limited at first.
- Requires a legal check of provider terms before storing any provider field beyond IDs.
