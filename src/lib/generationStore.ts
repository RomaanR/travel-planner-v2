import { redis } from "@/lib/ratelimit";
import type { DayPlan, RecommendedStay } from "@/types/itinerary";

// ─── Generation store ─────────────────────────────────────────────────────────
// Server-owned progress for one itinerary generation, keyed by the client's
// requestId. The generating function writes here as it goes; the page reads it
// back whenever its live stream is cut (iOS backgrounding, network drop, tab
// reload). Only the generating function writes, so there are no write races.

const TTL_S        = 24 * 60 * 60; // a charged result must outlive a long phone lock
const STALL_MS     = 120_000;      // "running" with no write for this long → treated as dead
const KEY          = (requestId: string) => `travalbee:gen:${requestId}`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GenerationStatus = "running" | "done" | "failed";

type GenerationRecord = {
  v:                1;
  ownerUserId:      string | null; // null = guest; the random requestId is then the capability
  status:           GenerationStatus;
  destination:      string;
  totalDays:        number;
  enrichingDay:     number | null;
  days:             DayPlan[];
  editorial:        string;
  recommendedStays: RecommendedStay[] | null;
  saveToken:        string | null;
  errorMessage:     string | null;
  startedAt:        number;
  updatedAt:        number;
};

/** What the page sees. "stalled" = the generating function died without finishing. */
export type GenerationSnapshot = Omit<GenerationRecord, "v" | "ownerUserId" | "status"> & {
  status: GenerationStatus | "stalled";
};

export function isValidRequestId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export async function getGeneration(requestId: string): Promise<GenerationRecord | null> {
  return (await redis.get<GenerationRecord>(KEY(requestId))) ?? null;
}

/** Signed-in records belong to their user; guest records to whoever holds the requestId. */
export function canAccessGeneration(record: GenerationRecord, userId: string | null): boolean {
  return record.ownerUserId === null || record.ownerUserId === userId;
}

export function toSnapshot(record: GenerationRecord): GenerationSnapshot {
  const stalled = record.status === "running" && Date.now() - record.updatedAt > STALL_MS;
  return {
    destination:      record.destination,
    totalDays:        record.totalDays,
    enrichingDay:     record.enrichingDay,
    days:             record.days,
    editorial:        record.editorial,
    recommendedStays: record.recommendedStays,
    saveToken:        record.saveToken,
    errorMessage:     record.errorMessage,
    startedAt:        record.startedAt,
    updatedAt:        record.updatedAt,
    status:           stalled ? "stalled" : record.status,
  };
}

/**
 * Atomically claims a requestId. Returns a writer, or null when the requestId
 * already exists — the caller then attaches to that generation instead.
 */
export async function createGeneration(
  requestId: string,
  ownerUserId: string | null,
  destination: string,
  totalDays: number,
): Promise<GenerationWriter | null> {
  const now = Date.now();
  const record: GenerationRecord = {
    v: 1, ownerUserId, status: "running", destination, totalDays, enrichingDay: null,
    days: [], editorial: "", recommendedStays: null, saveToken: null, errorMessage: null,
    startedAt: now, updatedAt: now,
  };
  const claimed = await redis.set(KEY(requestId), record, { nx: true, ex: TTL_S });
  return claimed === "OK" ? new GenerationWriter(requestId, record) : null;
}

export async function deleteGeneration(requestId: string): Promise<void> {
  await redis.del(KEY(requestId));
}

/** Holds the record in memory and rewrites it on every change (also refreshes the TTL). */
export class GenerationWriter {
  constructor(private readonly requestId: string, private readonly record: GenerationRecord) {}

  private async persist(): Promise<void> {
    this.record.updatedAt = Date.now();
    await redis.set(KEY(this.requestId), this.record, { ex: TTL_S });
  }

  /** Heartbeat — also keeps the record from being reported as stalled. */
  async enriching(day: number): Promise<void> {
    this.record.enrichingDay = day;
    await this.persist();
  }

  async addDay(day: DayPlan, editorial: string): Promise<void> {
    this.record.days = [...this.record.days.filter((d) => d.day !== day.day), day].sort((a, b) => a.day - b.day);
    if (editorial) this.record.editorial = editorial;
    this.record.enrichingDay = null;
    await this.persist();
  }

  async complete(result: {
    days: DayPlan[]; editorial: string; recommendedStays?: RecommendedStay[]; saveToken: string;
  }): Promise<void> {
    this.record.status           = "done";
    this.record.days             = result.days;
    this.record.editorial        = result.editorial;
    this.record.recommendedStays = result.recommendedStays ?? null;
    this.record.saveToken        = result.saveToken;
    this.record.enrichingDay     = null;
    await this.persist();
  }

  async fail(message: string): Promise<void> {
    this.record.status       = "failed";
    this.record.errorMessage = message;
    this.record.enrichingDay = null;
    await this.persist();
  }
}
