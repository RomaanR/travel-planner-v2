// ─── Request ──────────────────────────────────────────────────────────────────

export type TravelParty = "solo" | "couple" | "family" | "group";
export type Pace = "relaxed" | "moderate" | "packed";
export type BudgetTier = "premium" | "luxury" | "ultra-luxury";
export type DietaryOption =
  | "none"
  | "vegetarian"
  | "vegan"
  | "halal"
  | "kosher"
  | "gluten-free"
  | "dairy-free";
export type Interest =
  | "sightseeing"
  | "museums-art"
  | "food-dining"
  | "nature-parks"
  | "shopping"
  | "nightlife"
  | "culture-history"
  | "adventure-sports"
  | "relaxation-wellness"
  | "photography";

export type ItineraryRequest = {
  destination: string;
  placeId: string;
  lat: number;
  lng: number;
  departureDate: string; // ISO "YYYY-MM-DD"
  returnDate: string;    // ISO "YYYY-MM-DD"
  duration: number;      // computed from date diff, clamped 1–5
  travelParty: TravelParty;
  pace: Pace;
  budgetTier: BudgetTier;
  dietary: DietaryOption[];
  interests: Interest[]; // no max cap
  // Accommodation branching — optional, appended at submit time
  accommodationStatus?: "needed" | "booked";
  hotelName?: string;
  exactHotelAddress?: string;  // Places-verified formatted_address — captured when accommodationStatus === "booked"
  transportMode?: string;      // "walking-transit" | "car-driver"
  walkingTolerance?: "strict" | "relaxed"; // walking-transit only — "strict" ≤20 min/1.5km, "relaxed" ≤45 min/4km; defaults to "strict"
  isRegion?: boolean;  // true when destination is a region/area rather than a single city
  // Planning mode — added for dual-mode curate page
  planningMode?: "inspire" | "tailor"; // absent is treated as "inspire" (backward compat)
  anchorPoints?: string;               // Mode B only — free-form anchor constraints, max 2000 chars
};

// ─── Response ─────────────────────────────────────────────────────────────────

export type Coordinate = { lat: number; lng: number };

export type TransitInfo = {
  walkingMinutes?: number;
  drivingMinutes?: number;
};

// ─── Timeline (new canonical shape) ──────────────────────────────────────────

export type TimelineItemType =
  | "activity"
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "drinks";

/** Alternative venue for an activity — same time slot, same neighbourhood, different vibe */
export type ActivityAlternative = {
  name:        string;  // real alternative place name
  description: string;  // 2 sentences — same time slot, different vibe
};

/** Unified card type — replaces separate Activity + DiningRec for new itineraries */
export type TimelineItem = {
  spatialReasoning?: string; // AI chain-of-thought — present in raw AI output, stripped server-side before client response
  type: TimelineItemType;
  title: string;           // activity name OR restaurant name
  description: string;     // 2 sentences for activities; cuisine for meals
  duration: string;        // e.g. "2 hours"; empty string for meals
  startTime?: string;      // HH:MM — AI-provided
  category?: string;       // SIGHTSEEING etc — activities only
  coordinates: Coordinate;
  // Meal-specific fields
  cuisine?: string;
  pricePoint?: string;     // $$ | $$$ | $$$$
  reservation?: boolean;
  dietaryNote?: string;
  // Google Places enriched fields (same as legacy Activity / DiningRec)
  photoUrl?: string;        // legacy — full URL with embedded key (old saved trips only)
  photoReference?: string;  // new — raw photo_reference token; rendered via /api/photo proxy
  placeId?: string;         // Google Places place_id — enables accurate Maps URLs (name + location)
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;      // e.g. "9:00 AM – 9:00 PM" (today's hours)
  priceLevel?: number;     // Google price_level 0–4
  transitFromPrevious?: TransitInfo;
  alternatives?: ActivityAlternative[];  // activity items only — swap slot, same neighbourhood
};

// ─── Legacy types (kept for backward-compat with existing DB records) ─────────

export type Activity = {
  title: string;
  description: string;
  duration: string;
  startTime: string;
  category: string;
  coordinates: Coordinate;
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;
  priceLevel?: number;
  transitFromPrevious?: TransitInfo;
};

export type DiningRec = {
  name: string;
  cuisine: string;
  pricePoint: string;
  reservation: boolean;
  coordinates: Coordinate;
  dietaryNote?: string;
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;
  transitFromPrevious?: TransitInfo;
};

// ─── Day Plan ─────────────────────────────────────────────────────────────────

export type DayPlan = {
  day: number;
  theme: string;
  pace: Pace;
  timeline: TimelineItem[];            // NEW canonical field
  hiddenGem: string;
  hiddenGemCoordinates: Coordinate;
  // Legacy fields — present in DB records saved before the timeline refactor
  morning?: Activity;
  afternoon?: Activity;
  evening?: Activity;
  dining?: DiningRec[];
};

// ─── Generation cost metadata ─────────────────────────────────────────────────

export type GenerationMeta = {
  claudeInputTokens:    number;
  claudeOutputTokens:   number;
  claudeThinkingTokens: number;   // Adaptive Thinking / reasoning tokens (0 when off)
  claudeCostUsd:        number;
  googleTextSearchCalls: number;
  googleDetailsCalls:   number;
  googleCacheHits:      number;
  googleCostUsd:        number;
  totalCostUsd:         number;
};

export type RecommendedStay = {
  name:         string;  // real hotel name
  description:  string;  // exactly 2 sentences — luxury editorial pitch
  neighborhood: string;  // area or district name
  rating?:      number;  // 3 | 4 | 5 — present on new generations only
  priceTier?:   string;  // "$$$" | "$$$$" | "$$$$$" — present on new generations only
};

export type ItineraryResponse = {
  destination:       string;
  editorial:         string;
  days:              DayPlan[];
  recommendedStays?: RecommendedStay[];  // present when accommodationStatus !== "booked"
};

// ─── Map ──────────────────────────────────────────────────────────────────────

export type MapPointType = "activity" | "meal" | "gem";

export type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  type: MapPointType;
  day: number;
};
