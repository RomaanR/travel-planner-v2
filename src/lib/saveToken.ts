import { createHmac, hkdfSync, randomUUID, timingSafeEqual } from "crypto";
import type { ItineraryResponse } from "@/types/itinerary";

// ─── Save tokens ──────────────────────────────────────────────────────────────
// The generation route returns the finished itinerary inside a signed token.
// Saving a trip accepts ONLY this token, so what gets stored (and later shown on
// public share pages) is exactly what our server generated — never client JSON.
//
// Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload))

const TOKEN_VERSION = 1;
const TOKEN_TTL_MS  = 7 * 24 * 60 * 60 * 1000;
const MAX_TOKEN_LEN = 900_000; // stays under the 1 MB server-action body limit

export type SaveTokenPayload = {
  v:            number;
  generationId: string;
  iat:          number; // ms since epoch
  itinerary:    ItineraryResponse;
  request:      unknown; // the validated generation request, kept with the trip
};

function signingKey(): Buffer {
  const dedicated = process.env.ITINERARY_SIGNING_SECRET;
  if (dedicated) return Buffer.from(dedicated, "utf8");

  // Fallback: derive a purpose-specific key from the Clerk secret (always set in
  // production). HKDF with a distinct label keeps the two uses independent.
  const clerkSecret = process.env.CLERK_SECRET_KEY;
  if (!clerkSecret) {
    throw new Error("Set ITINERARY_SIGNING_SECRET (or CLERK_SECRET_KEY) to sign itineraries.");
  }
  return Buffer.from(hkdfSync("sha256", clerkSecret, "travalbee", "itinerary-save-token-v1", 32));
}

const sign = (data: string) => createHmac("sha256", signingKey()).update(data).digest("base64url");

export function createSaveToken(itinerary: ItineraryResponse, request: unknown): string {
  const payload: SaveTokenPayload = {
    v:            TOKEN_VERSION,
    generationId: randomUUID(),
    iat:          Date.now(),
    itinerary,
    request,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Returns the payload if the token is authentic, current and well-formed; otherwise null. */
export function readSaveToken(token: unknown): SaveTokenPayload | null {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LEN) return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body      = token.slice(0, dot);
  const signature = Buffer.from(token.slice(dot + 1), "base64url");
  const expected  = Buffer.from(sign(body), "base64url");
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SaveTokenPayload;
    if (payload.v !== TOKEN_VERSION) return null;
    if (typeof payload.generationId !== "string" || typeof payload.iat !== "number") return null;
    if (Date.now() - payload.iat > TOKEN_TTL_MS) return null;
    if (!payload.itinerary?.destination || !Array.isArray(payload.itinerary.days) || payload.itinerary.days.length === 0) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
