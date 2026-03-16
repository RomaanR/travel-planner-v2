import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import type {
  ItineraryRequest,
  ItineraryResponse,
  Coordinate,
  TransitInfo,
  GenerationMeta,
} from "@/types/itinerary";

const client = new Anthropic();
const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

// ─── Label maps ───────────────────────────────────────────────────────────────

const partyDescriptions: Record<string, string> = {
  solo:   "independent traveler, single occupancy, freedom to be spontaneous",
  couple: "two travelers, romantic sensibility, shared experiences",
  family: "family group — include child-appropriate activities, avoid 18+ venues",
  group:  "group of friends or colleagues, mix of shared and free time",
};

const paceDescriptions: Record<string, string> = {
  relaxed:  "relaxed pace — 3–4 activities per day, late starts, unhurried meals, space for stillness",
  moderate: "moderate rhythm — 4–5 activities per day, curated depth without exhaustion",
  packed:   "packed schedule — 6–7 activities per day, culturally dense, every hour intentionally filled",
};

const budgetDescriptions: Record<string, string> = {
  premium:       "premium tier ($$) — boutique hotels, well-regarded restaurants, high quality",
  luxury:        "luxury tier ($$$) — five-star properties, Michelin-starred tables, private guides",
  "ultra-luxury": "ultra-luxury tier ($$$$) — no budget ceiling, suites, chef's tables, exclusive access",
};

const interestLabels: Record<string, string> = {
  sightseeing:           "Sightseeing",
  "museums-art":         "Museums & Art",
  "food-dining":         "Food & Dining",
  "nature-parks":        "Nature & Parks",
  shopping:              "Shopping",
  nightlife:             "Nightlife",
  "culture-history":     "Culture & History",
  "adventure-sports":    "Adventure & Sports",
  "relaxation-wellness": "Relaxation & Wellness",
  photography:           "Photography",
};

// ─── AI Prompt JSON Schema ────────────────────────────────────────────────────

const SCHEMA = `{
  "destination": "string",
  "editorial": "string (one Vogue-style sentence, ≤25 words)",
  "days": [
    {
      "day": 1,
      "theme": "string (poetic day title)",
      "pace": "relaxed | moderate | packed",
      "timeline": [
        {
          "type": "activity | breakfast | lunch | dinner | snack | drinks",
          "title": "string (place or activity name — real names only)",
          "description": "string (exactly 2 sentences)",
          "duration": "string (e.g. '2 hours' for activities; '1 hour' for meals)",
          "startTime": "string (HH:MM — must be strictly sequential through the day)",
          "category": "string (SIGHTSEEING | MUSEUM | CULTURE | NATURE | WELLNESS | ADVENTURE | SHOPPING — activities only, omit for meals)",
          "coordinates": { "lat": number, "lng": number },
          "cuisine": "string (meals only — omit for activities)",
          "pricePoint": "$$ | $$$ | $$$$ (meals only — omit for activities)",
          "reservation": true | false,
          "dietaryNote": "string | undefined (meals only)"
        }
      ],
      "hiddenGem": "string (exact place name + 1 sentence why it matters)",
      "hiddenGemCoordinates": { "lat": number, "lng": number }
    }
  ]
}`;

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(data: ItineraryRequest): string {
  const { destination, duration, travelParty, pace, budgetTier, dietary, interests, departureDate, returnDate } = data;

  const dietaryStr = dietary.length === 0 || dietary.includes("none")
    ? "No dietary restrictions"
    : dietary.join(", ");

  const interestStr = interests.map((v) => interestLabels[v] || v).join(", ");

  const familyRule = travelParty === "family"
    ? "\n9. FAMILY RULE: Every activity must be suitable for children. Avoid 18+ venues and anything requiring adult-only access."
    : "";

  const halalRule = dietary.includes("halal")
    ? `\n- HALAL ENFORCEMENT: Every dining recommendation MUST include a "dietaryNote" stating the halal certification, kitchen practices, and compliant menu items. Vague statements unacceptable.`
    : "";

  const kosherRule = dietary.includes("kosher")
    ? `\n- KOSHER ENFORCEMENT: Every dining recommendation MUST include a "dietaryNote" identifying kosher certification, certifying authority, and which items are kosher-certified.`
    : "";

  const gfRule = dietary.includes("gluten-free")
    ? `\n- GLUTEN-FREE ENFORCEMENT: Every dining recommendation MUST include a "dietaryNote" explaining dedicated GF menu/kitchen, specific safe dishes, and cross-contamination policies.`
    : "";

  const dfRule = dietary.includes("dairy-free")
    ? `\n- DAIRY-FREE: Every dining recommendation MUST include a "dietaryNote" identifying dairy-free options and any hidden dairy risks.`
    : "";

  const veganRule = dietary.includes("vegan") || dietary.includes("vegetarian")
    ? `\n- VEGAN/VEGETARIAN: Prioritize restaurants with dedicated plant-based menus. Not just side salads.`
    : "";

  return `You are an ultra-elite luxury travel concierge — the intersection of a private Rolls-Royce attaché and Condé Nast Traveller's chief editor.

Curate a ${duration}-day bespoke itinerary for: **${destination}**
Travel dates: ${departureDate} to ${returnDate}

━━━ CLIENT PROFILE ━━━
- Travel Party: ${travelParty} — ${partyDescriptions[travelParty]}
- Pace: ${pace} — ${paceDescriptions[pace]}
- Budget: ${budgetDescriptions[budgetTier]}
- Dietary: ${dietaryStr}
- Interests: ${interestStr}

━━━ MANDATORY RULES ━━━
1. Generate EXACTLY ${duration} day objects in the "days" array.
2. Pace "${pace}" must be reflected authentically in every day's timeline item count and rhythm.
3. All dining aligns with ${budgetTier} price tier.
4. COORDINATES: Every timeline item and hiddenGem MUST include real, accurate GPS coordinates as numbers. These plot on a live map — incorrect coordinates are unacceptable.
5. Interests (${interestStr}): Every venue must serve at least one interest.
6. startTime: Provide a realistic HH:MM for every timeline item. Times MUST be strictly sequential through the day (e.g. "08:00", "09:30", "12:30", "14:00", "19:30").
7. category: Assign an uppercase category to every activity-type item (SIGHTSEEING, MUSEUM, CULTURE, NATURE, WELLNESS, ADVENTURE, SHOPPING). Omit for meals.
8. Meals: Include 1–2 meal items per day (breakfast, lunch, or dinner) interwoven with activities at realistic times. Use real, named restaurants for the "title" field.
9. Hidden gem: hyper-specific named place, 95% of tourists never find, exact name + 1 sentence.
10. Writing: restrained elegance, no hyperbole, exactly 2 sentences per description.${familyRule}${halalRule}${kosherRule}${gfRule}${dfRule}${veganRule}

━━━ JSON SCHEMA ━━━
Return ONLY valid JSON. No markdown, no code fences, no preamble:
${SCHEMA}`;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function buildCacheKey(name: string, city: string): string {
  const normalize = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `${normalize(name)}|${normalize(city)}`;
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Categories that skip Place Details (no meaningful opening hours) ─────────

const SKIP_DETAILS_CATEGORIES = new Set(["NATURE", "ADVENTURE"]);

// ─── Google Places enrichment ─────────────────────────────────────────────────

type PlacesEnrichment = {
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;
  priceLevel?: number;
};

type ApiCounters = { textSearch: number; details: number; cacheHits: number };

async function enrichPlace(
  name: string,
  city: string,
  apiKey: string,
  skipDetails: boolean,
  counters: ApiCounters
): Promise<PlacesEnrichment | null> {
  const cacheKey = buildCacheKey(name, city);

  // ── 1. Check PlaceCache ────────────────────────────────────────────────────
  try {
    const cached = await prisma.placeCache.findUnique({ where: { cacheKey } });
    if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
      counters.cacheHits++;
      return {
        photoUrl:         cached.photoUrl         ?? undefined,
        rating:           cached.rating           ?? undefined,
        userRatingsTotal: cached.userRatingsTotal ?? undefined,
        hoursOpen:        cached.hoursOpen        ?? undefined,
        priceLevel:       cached.priceLevel       ?? undefined,
        // openNow is real-time — not stored in cache
      };
    }
  } catch { /* DB unavailable — fall through to live fetch */ }

  // ── 2. Fresh fetch from Google Places ─────────────────────────────────────
  try {
    const query = encodeURIComponent(`${name} ${city}`);
    const res = await fetch(
      `${PLACES_BASE}/textsearch/json?query=${query}&key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.results?.[0];
    if (!place) return null;

    counters.textSearch++;

    const photoRef = place.photos?.[0]?.photo_reference;

    // ── 3. Place Details (opening hours) — skipped for NATURE / ADVENTURE ───
    let hoursOpen: string | undefined;
    if (!skipDetails && place.place_id) {
      try {
        const det = await fetch(
          `${PLACES_BASE}/details/json?place_id=${place.place_id}&fields=opening_hours&key=${apiKey}`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (det.ok) {
          const dj = await det.json();
          const wt: string[] | undefined = dj?.result?.opening_hours?.weekday_text;
          if (wt?.length) {
            const todayIdx = (new Date().getDay() + 6) % 7;
            const stripped = (wt[todayIdx] ?? "").replace(/^[^:]+:\s*/, "").trim();
            if (stripped) hoursOpen = stripped;
          }
          counters.details++;
        }
      } catch { /* silently skip — hours are optional enrichment */ }
    }

    const enrichment: PlacesEnrichment = {
      photoUrl: photoRef
        ? `${PLACES_BASE}/photo?maxwidth=800&photo_reference=${photoRef}&key=${apiKey}`
        : undefined,
      rating:           place.rating,
      userRatingsTotal: place.user_ratings_total,
      openNow:          place.opening_hours?.open_now,
      hoursOpen,
      priceLevel:       place.price_level,
    };

    // ── 4. Write to cache (fire-and-forget — never blocks response) ──────────
    prisma.placeCache.upsert({
      where: { cacheKey },
      update: {
        photoUrl:         enrichment.photoUrl         ?? null,
        rating:           enrichment.rating           ?? null,
        userRatingsTotal: enrichment.userRatingsTotal ?? null,
        hoursOpen:        enrichment.hoursOpen        ?? null,
        priceLevel:       enrichment.priceLevel       ?? null,
        fetchedAt:        new Date(),
      },
      create: {
        cacheKey,
        photoUrl:         enrichment.photoUrl         ?? null,
        rating:           enrichment.rating           ?? null,
        userRatingsTotal: enrichment.userRatingsTotal ?? null,
        hoursOpen:        enrichment.hoursOpen        ?? null,
        priceLevel:       enrichment.priceLevel       ?? null,
      },
    }).catch(() => { /* cache write failure is non-fatal */ });

    return enrichment;
  } catch {
    return null; // graceful degradation
  }
}

// ─── Haversine transit (pure — no API calls) ──────────────────────────────────

function haversineKm(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLon = (b.lng - a.lng) * (Math.PI / 180);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * (Math.PI / 180)) *
    Math.cos(b.lat * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function getDayTransits(stops: Coordinate[]): TransitInfo[] {
  if (stops.length < 2) return stops.map(() => ({}));
  const transits: TransitInfo[] = [{}]; // index 0 — first stop has no predecessor
  for (let i = 0; i < stops.length - 1; i++) {
    const km = haversineKm(stops[i], stops[i + 1]);
    transits.push({
      walkingMinutes:  Math.max(1, Math.round((km / 5)  * 60)),
      drivingMinutes:  Math.max(1, Math.round((km / 25) * 60)),
    });
  }
  return transits;
}

// ─── Route handler ────────────────────────────────────────────────────────────

// Pricing constants (per unit)
const CLAUDE_INPUT_COST  = 3  / 1_000_000; // $3 per million input tokens
const CLAUDE_OUTPUT_COST = 15 / 1_000_000; // $15 per million output tokens
const GOOGLE_TEXT_SEARCH = 0.032;           // $0.032 per Places Text Search request
const GOOGLE_DETAILS     = 0.017;           // $0.017 per Place Details request

export async function POST(req: Request) {
  try {
    const body: ItineraryRequest = await req.json();

    if (!body.destination || !body.placeId) {
      return Response.json(
        { error: "destination and placeId are required" },
        { status: 400 }
      );
    }

    const safeBody = {
      ...body,
      duration: Math.min(5, Math.max(1, body.duration ?? 3)),
    };

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

    // ── Step 1: Anthropic AI generation ──────────────────────────────────────
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: buildPrompt(safeBody) }],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const itinerary: ItineraryResponse = JSON.parse(cleaned);

    // ── Step 2: Build flat work list (includes category for selective enrichment)
    type WorkItem = {
      obj: Record<string, unknown>;
      name: string;
      category?: string;
    };

    const workItems: WorkItem[] = itinerary.days.flatMap((day) =>
      (day.timeline ?? []).map((item) => ({
        obj: item as unknown as Record<string, unknown>,
        name: item.title,
        category: item.category,
      }))
    );

    // ── Step 3: Parallel Places enrichment (cache-first, selective details) ──
    const apiCounters: ApiCounters = { textSearch: 0, details: 0, cacheHits: 0 };

    const enrichResults = await Promise.allSettled(
      workItems.map((w) => {
        const skipDetails = SKIP_DETAILS_CATEGORIES.has(w.category ?? "");
        return enrichPlace(w.name, safeBody.destination, apiKey, skipDetails, apiCounters);
      })
    );

    enrichResults.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value) {
        Object.assign(workItems[i].obj, result.value);
      }
    });

    // ── Step 4: Transit — pure Haversine (zero API calls) ────────────────────
    itinerary.days.forEach((day) => {
      const stops: Coordinate[] = (day.timeline ?? [])
        .map((item) => item.coordinates)
        .filter((c) => c?.lat && c?.lng);

      const transits = getDayTransits(stops);

      (day.timeline ?? []).forEach((item, idx) => {
        if (transits[idx]) {
          (item as unknown as Record<string, unknown>).transitFromPrevious = transits[idx];
        }
      });
    });

    // ── Step 5: Calculate generation cost ────────────────────────────────────
    const claudeCostUsd =
      message.usage.input_tokens  * CLAUDE_INPUT_COST +
      message.usage.output_tokens * CLAUDE_OUTPUT_COST;

    const googleCostUsd =
      apiCounters.textSearch * GOOGLE_TEXT_SEARCH +
      apiCounters.details    * GOOGLE_DETAILS;

    const meta: GenerationMeta = {
      claudeInputTokens:      message.usage.input_tokens,
      claudeOutputTokens:     message.usage.output_tokens,
      estimatedClaudeCostUsd: parseFloat(claudeCostUsd.toFixed(4)),
      googleTextSearchCalls:  apiCounters.textSearch,
      googleDetailsCalls:     apiCounters.details,
      googleCacheHits:        apiCounters.cacheHits,
      estimatedGoogleCostUsd: parseFloat(googleCostUsd.toFixed(4)),
      totalEstimatedCostUsd:  parseFloat((claudeCostUsd + googleCostUsd).toFixed(4)),
    };

    console.log("[itinerary] generation cost:", meta);

    return Response.json({ ...itinerary, _meta: meta });
  } catch (e) {
    console.error("[itinerary/route]", e);
    const isParseError = e instanceof SyntaxError;
    return Response.json(
      {
        error: isParseError
          ? "AI returned malformed JSON — please try again"
          : "Failed to generate itinerary",
      },
      { status: 500 }
    );
  }
}
