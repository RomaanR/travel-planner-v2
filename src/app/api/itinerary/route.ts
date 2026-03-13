import Anthropic from "@anthropic-ai/sdk";
import type {
  ItineraryRequest,
  ItineraryResponse,
  Coordinate,
  TransitInfo,
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
  sightseeing:         "Sightseeing",
  "museums-art":       "Museums & Art",
  "food-dining":       "Food & Dining",
  "nature-parks":      "Nature & Parks",
  shopping:            "Shopping",
  nightlife:           "Nightlife",
  "culture-history":   "Culture & History",
  "adventure-sports":  "Adventure & Sports",
  "relaxation-wellness": "Relaxation & Wellness",
  photography:         "Photography",
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
      "morning": {
        "title": "string",
        "description": "string (exactly 2 sentences)",
        "duration": "string (e.g. '2 hours')",
        "startTime": "string (e.g. '09:00')",
        "category": "string (e.g. 'SIGHTSEEING', 'MUSEUM', 'CULTURE', 'NATURE', 'WELLNESS', 'ADVENTURE', 'SHOPPING')",
        "coordinates": { "lat": number, "lng": number }
      },
      "afternoon": {
        "title": "string",
        "description": "string (exactly 2 sentences)",
        "duration": "string",
        "startTime": "string",
        "category": "string",
        "coordinates": { "lat": number, "lng": number }
      },
      "evening": {
        "title": "string",
        "description": "string (exactly 2 sentences)",
        "duration": "string",
        "startTime": "string",
        "category": "string",
        "coordinates": { "lat": number, "lng": number }
      },
      "hiddenGem": "string (exact place name + 1 sentence why it matters)",
      "hiddenGemCoordinates": { "lat": number, "lng": number },
      "dining": [
        {
          "name": "string (real restaurant name)",
          "cuisine": "string",
          "pricePoint": "$$ | $$$ | $$$$",
          "reservation": true | false,
          "coordinates": { "lat": number, "lng": number },
          "dietaryNote": "string | undefined"
        }
      ]
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
2. Pace "${pace}" must be reflected authentically in every day's activity count and rhythm.
3. All dining aligns with ${budgetTier} price tier.
4. COORDINATES: Every activity, dining spot, and hiddenGem MUST include real, accurate GPS coordinates as numbers. These plot on a live map — incorrect coordinates are unacceptable.
5. Interests (${interestStr}): Every venue must serve at least one interest.
6. startTime: Provide a realistic clock start time ("09:00", "14:30") for every activity. Times must be sequential through the day.
7. category: Assign an uppercase category to every activity.
8. Hidden gem: hyper-specific named place, 95% of tourists never find, exact name + 1 sentence.
9. Dining: 1–2 real restaurants per day, real names, cultural significance preferred.
10. Writing: restrained elegance, no hyperbole, exactly 2 sentences per activity description.${familyRule}${halalRule}${kosherRule}${gfRule}${dfRule}${veganRule}

━━━ JSON SCHEMA ━━━
Return ONLY valid JSON. No markdown, no code fences, no preamble:
${SCHEMA}`;
}

// ─── Google Places enrichment ─────────────────────────────────────────────────

type PlacesEnrichment = {
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  hoursOpen?: string;
  priceLevel?: number;
};

async function enrichPlace(
  name: string,
  city: string,
  apiKey: string
): Promise<PlacesEnrichment | null> {
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

    const photoRef = place.photos?.[0]?.photo_reference;

    // weekday_text is NOT in Text Search results — requires Place Details API
    let hoursOpen: string | undefined;
    if (place.place_id) {
      try {
        const det = await fetch(
          `${PLACES_BASE}/details/json?place_id=${place.place_id}&fields=opening_hours&key=${apiKey}`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (det.ok) {
          const dj = await det.json();
          // weekday_text[0] = Monday ... [6] = Sunday; JS getDay() 0=Sun ... 6=Sat
          const wt: string[] | undefined = dj?.result?.opening_hours?.weekday_text;
          if (wt?.length) {
            const todayIdx = (new Date().getDay() + 6) % 7;
            // Strip "Monday: " prefix → "9:00 AM – 9:00 PM"
            const stripped = (wt[todayIdx] ?? "").replace(/^[^:]+:\s*/, "").trim();
            if (stripped) hoursOpen = stripped;
          }
        }
      } catch { /* silently skip — hours are optional enrichment */ }
    }

    return {
      photoUrl: photoRef
        ? `${PLACES_BASE}/photo?maxwidth=800&photo_reference=${photoRef}&key=${apiKey}`
        : undefined,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      openNow: place.opening_hours?.open_now,
      hoursOpen,
      priceLevel: place.price_level,
    };
  } catch {
    return null; // silently fail — graceful degradation
  }
}

// ─── Haversine distance helpers ───────────────────────────────────────────────

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

function haversineTransit(a: Coordinate, b: Coordinate): TransitInfo {
  const km = haversineKm(a, b);
  return {
    walkingMinutes: Math.max(1, Math.round((km / 5) * 60)),   // 5 km/h walking
    drivingMinutes: Math.max(1, Math.round((km / 25) * 60)),  // 25 km/h city driving
  };
}

// ─── Distance Matrix ──────────────────────────────────────────────────────────

async function getDayTransits(
  stops: Coordinate[],
  apiKey: string
): Promise<TransitInfo[]> {
  if (stops.length < 2) return stops.map(() => ({}));

  // Baseline: Haversine estimates for every consecutive pair
  // These always render — Distance Matrix will override where available
  const transits: TransitInfo[] = [{}]; // first stop has no predecessor
  for (let i = 0; i < stops.length - 1; i++) {
    transits.push(haversineTransit(stops[i], stops[i + 1]));
  }

  // Try Distance Matrix for more accurate road-based durations
  try {
    const origins      = stops.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join("|");
    const destinations = stops.slice(1).map((s) => `${s.lat},${s.lng}`).join("|");

    const [walkRes, driveRes] = await Promise.all([
      fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=walking&key=${apiKey}`,
        { signal: AbortSignal.timeout(6000) }
      ),
      fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=driving&key=${apiKey}`,
        { signal: AbortSignal.timeout(6000) }
      ),
    ]);

    const walkData  = walkRes.ok  ? await walkRes.json()  : null;
    const driveData = driveRes.ok ? await driveRes.json() : null;

    // Override Haversine estimates only when Distance Matrix returns valid values
    for (let i = 0; i < stops.length - 1; i++) {
      const walkSecs  = walkData?.rows?.[i]?.elements?.[i]?.duration?.value;
      const driveSecs = driveData?.rows?.[i]?.elements?.[i]?.duration?.value;
      if (walkSecs)  transits[i + 1].walkingMinutes  = Math.max(1, Math.round(walkSecs  / 60));
      if (driveSecs) transits[i + 1].drivingMinutes  = Math.max(1, Math.round(driveSecs / 60));
    }
  } catch { /* keep Haversine estimates */ }

  return transits;
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

    // ── Step 2: Build flat work list for Places enrichment ────────────────────
    type WorkItem = {
      obj: Record<string, unknown>;
      name: string;
    };

    const workItems: WorkItem[] = itinerary.days.flatMap((day) => [
      { obj: day.morning   as unknown as Record<string, unknown>, name: day.morning.title },
      { obj: day.afternoon as unknown as Record<string, unknown>, name: day.afternoon.title },
      { obj: day.evening   as unknown as Record<string, unknown>, name: day.evening.title },
      ...day.dining.map((d) => ({
        obj: d as unknown as Record<string, unknown>,
        name: d.name,
      })),
    ]);

    // ── Step 3: Parallel Places enrichment (allSettled = no crash on failure) ─
    const enrichResults = await Promise.allSettled(
      workItems.map((w) => enrichPlace(w.name, safeBody.destination, apiKey))
    );

    enrichResults.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value) {
        Object.assign(workItems[i].obj, result.value);
      }
    });

    // ── Step 4: Distance Matrix — one batch per day ───────────────────────────
    await Promise.allSettled(
      itinerary.days.map(async (day) => {
        const stops: Coordinate[] = [
          day.morning.coordinates,
          day.afternoon.coordinates,
          day.evening.coordinates,
          ...day.dining.map((d) => d.coordinates),
        ].filter((c) => c?.lat && c?.lng);

        const transits = await getDayTransits(stops, apiKey);

        // Assign transitFromPrevious to each stop (index 1 onward)
        const items = [day.morning, day.afternoon, day.evening, ...day.dining];
        items.forEach((item, idx) => {
          if (transits[idx]) {
            (item as unknown as Record<string, unknown>).transitFromPrevious = transits[idx];
          }
        });
      })
    );

    return Response.json(itinerary);
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
