import Anthropic from "@anthropic-ai/sdk";
import type { ItineraryRequest, ItineraryResponse } from "@/types/itinerary";

const client = new Anthropic();

function buildPrompt(data: ItineraryRequest): string {
  const schema = `{
  "destination": "string",
  "editorial": "string (one Vogue-style sentence capturing the soul of this place)",
  "days": [
    {
      "day": 1,
      "theme": "string (poetic theme title)",
      "pace": "slow | moderate | immersive",
      "morning": { "title": "string", "description": "string (2 sentences)", "duration": "string (e.g. '2 hours')" },
      "afternoon": { "title": "string", "description": "string (2 sentences)", "duration": "string" },
      "evening": { "title": "string", "description": "string (2 sentences)", "duration": "string" },
      "hiddenGem": "string (a specific place 95% of tourists never find)",
      "dining": [
        { "name": "string", "cuisine": "string", "pricePoint": "$$ | $$$ | $$$$", "reservation": true | false }
      ]
    }
  ]
}`;

  return `You are an elite luxury travel curator — the intersection of Condé Nast Traveller and a private Rolls-Royce concierge. Your itineraries are read by CEOs, art collectors, and discerning professionals who reject anything generic.

Generate a 3-day luxury itinerary for: **${data.destination}**

Rules:
- Write with restrained elegance — no hyperbole, no clichés
- Each day has a distinct poetic theme title (e.g. "The Art of Arrival", "Into the Silence")
- Pace: "slow" = restorative (spa mornings, unhurried meals), "moderate" = balanced exploration, "immersive" = deep cultural density
- Each time block (morning/afternoon/evening): a unique evocative title + exactly 2 sentences of description + realistic duration
- Hidden gem per day: a hyper-specific, non-touristy place — name it exactly
- Dining: 1–2 restaurants per day. Real restaurant names preferred. Include cuisine type, honest price point, and whether reservation is required
- Editorial opener: one sentence, the kind that makes a reader stop scrolling — capture the soul of ${data.destination} in 20 words or fewer

Return ONLY valid JSON. No markdown, no code fences, no preamble. Match this schema exactly:
${schema}`;
}

export async function POST(req: Request) {
  try {
    const body: ItineraryRequest = await req.json();

    if (!body.destination || !body.placeId) {
      return Response.json(
        { error: "destination and placeId are required" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: buildPrompt(body),
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any accidental markdown fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const itinerary: ItineraryResponse = JSON.parse(cleaned);

    return Response.json(itinerary);
  } catch (e) {
    console.error("[itinerary/route]", e);
    return Response.json(
      { error: "Failed to generate itinerary" },
      { status: 500 }
    );
  }
}
