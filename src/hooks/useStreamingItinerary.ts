"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  DayPlan,
  ItineraryRequest,
  ItineraryResponse,
  RecommendedStay,
} from "@/types/itinerary";

// ─── Resilience model ─────────────────────────────────────────────────────────
// The server owns each generation (keyed by a requestId we create) and finishes
// it even if this page goes away. The live stream is just the fast path:
//   - stream cut (iOS backgrounding, network drop) → poll the server's snapshot
//   - page becomes visible again while streaming   → switch to the snapshot
//   - tab reloaded mid-generation                  → same requestId → attach
// The requestId lives in sessionStorage, which survives Safari tab restores.

const CACHE_KEY   = "seek_wander_itinerary_cache";
const PENDING_KEY = "travalbee_pending_generation";
const POLL_MS     = 2_000;
const MAX_POLL_MS = 10_000; // backoff ceiling while offline

function buildFingerprint(data: ItineraryRequest): string {
  return JSON.stringify({
    destination: data.destination,
    duration: data.duration,
    departureDate: data.departureDate,
    returnDate: data.returnDate,
    travelParty: data.travelParty,
    pace: data.pace,
    budgetTier: data.budgetTier,
    dietary: [...data.dietary].sort(),
    interests: [...data.interests].sort(),
    accommodationStatus: data.accommodationStatus,
    hotelName: data.hotelName ?? null,
    exactHotelAddress: data.exactHotelAddress ?? null,
    transportMode: data.transportMode ?? null,
    walkingTolerance: data.walkingTolerance ?? null,
    isRegion: data.isRegion ?? false,
    planningMode: data.planningMode ?? "inspire",
    anchorPoints: data.anchorPoints ?? null,
  });
}

// ─── Completed-result cache ───────────────────────────────────────────────────

type CacheEntry = { result: ItineraryResponse; saveToken: string | null };

function saveCache(fingerprint: string, result: ItineraryResponse, saveToken: string | null): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ fingerprint, result, saveToken }));
  } catch {
    // Cache failure must never block itinerary generation.
  }
}

function loadCache(fingerprint: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const { fingerprint: cachedFingerprint, result, saveToken } = JSON.parse(raw);
    if (cachedFingerprint !== fingerprint) return null;

    if (!result?.destination || !Array.isArray(result?.days) || result.days.length === 0) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    return {
      result:    result as ItineraryResponse,
      saveToken: typeof saveToken === "string" ? saveToken : null,
    };
  } catch {
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  }
}

// ─── Pending generation (requestId) ───────────────────────────────────────────

function loadPendingRequestId(fingerprint: string): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    return pending?.fingerprint === fingerprint && typeof pending.requestId === "string"
      ? pending.requestId
      : null;
  } catch {
    return null;
  }
}

function savePendingRequestId(fingerprint: string, requestId: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ fingerprint, requestId }));
  } catch { /* best effort */ }
}

function clearPendingRequestId(): void {
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* best effort */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type StreamMeta = {
  editorial: string;
  recommendedStays?: RecommendedStay[];
};

export type StreamProgress = {
  totalDays: number;
  completedDays: number;
  enrichingDay?: number;
};

type Snapshot = {
  status:           "running" | "done" | "failed" | "stalled";
  destination:      string;
  totalDays:        number;
  enrichingDay:     number | null;
  days:             DayPlan[];
  editorial:        string;
  recommendedStays: RecommendedStay[] | null;
  saveToken:        string | null;
  errorMessage:     string | null;
};

/** The server reported a real failure — show it, don't resume. */
class GenerationFailedError extends Error {}

/** The server no longer knows this requestId (expired or not ours). */
class GenerationNotFoundError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function upsertDay(days: DayPlan[], nextDay: DayPlan): DayPlan[] {
  const byDay = new Map(days.map((day) => [day.day, day]));
  byDay.set(nextDay.day, nextDay);
  return Array.from(byDay.values()).sort((a, b) => a.day - b.day);
}

function mergeDays(current: DayPlan[], incoming: DayPlan[]): DayPlan[] {
  const byDay = new Map(incoming.map((day) => [day.day, day]));

  // Days already shown keep precedence unless the server sent a replacement.
  for (const day of current) if (!byDay.has(day.day)) byDay.set(day.day, day);

  return Array.from(byDay.values()).sort((a, b) => a.day - b.day);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStreamingItinerary() {
  const [days, setDays] = useState<DayPlan[]>([]);
  const [meta, setMeta] = useState<StreamMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywalled, setPaywalled] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);
  const [destination, setDestination] = useState("");
  // Signed by the server on completion — the only input saveTripToDb accepts.
  const [saveToken, setSaveToken] = useState<string | null>(null);
  // True while following the server snapshot instead of the live stream.
  const [resuming, setResuming] = useState(false);
  const [progress, setProgress] = useState<StreamProgress>({
    totalDays: 0,
    completedDays: 0,
  });

  // The current generation run. Cancelled by abort() (navigation, refine) —
  // NOT by the page being backgrounded.
  const runRef = useRef<{ cancelled: boolean } | null>(null);
  // Aborts only the live stream fetch, to hand over to snapshot polling.
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef(false);
  const daysRef = useRef<DayPlan[]>([]);

  const abort = useCallback(() => {
    if (runRef.current) runRef.current.cancelled = true;
    runRef.current = null;
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    streamingRef.current = false;
  }, []);

  const restoreItinerary = useCallback((cached: ItineraryResponse, cachedToken: string | null = null): void => {
    setSaveToken(cachedToken);
    const cachedDays = cached.days ?? [];
    daysRef.current = cachedDays;
    setDays(cachedDays);
    setDestination(cached.destination ?? "");
    setMeta({
      editorial: cached.editorial ?? "",
      recommendedStays: cached.recommendedStays,
    });
    setProgress({
      totalDays: cachedDays.length,
      completedDays: cachedDays.length,
    });
    setStreamComplete(true);
    setLoading(false);
    setResuming(false);
    setError(null);
  }, []);

  const generateItinerary = useCallback(async (
    data: ItineraryRequest
  ): Promise<ItineraryResponse | null> => {
    const fingerprint = buildFingerprint(data);
    const cached = loadCache(fingerprint);
    if (cached) {
      clearPendingRequestId();
      restoreItinerary(cached.result, cached.saveToken);
      return cached.result;
    }

    abort();
    const run = { cancelled: false };
    runRef.current = run;
    const isCurrent = () => runRef.current === run && !run.cancelled;

    // Reuse the requestId of an unfinished generation for the same request, so
    // a reload or retry attaches to it instead of starting (and paying) again.
    const requestId = loadPendingRequestId(fingerprint) ?? crypto.randomUUID();
    savePendingRequestId(fingerprint, requestId);

    daysRef.current = [];
    setDays([]);
    setSaveToken(null);
    setMeta(null);
    setDestination(data.destination);
    setProgress({ totalDays: data.duration, completedDays: 0 });
    setStreamComplete(false);
    setLoading(true);
    setResuming(false);
    setError(null);
    setPaywalled(false);
    setSignInRequired(false);

    toast.loading("Consulting the concierge…", {
      id: "curate-task",
      description: undefined,
    });

    // ── Shared completion path (stream "done" or snapshot "done") ──────────────
    const finish = (result: {
      days: DayPlan[]; editorial: string; recommendedStays?: RecommendedStay[]; saveToken: string | null;
    }): ItineraryResponse => {
      const mergedDays = mergeDays(daysRef.current, result.days);
      daysRef.current = mergedDays;
      setDays(mergedDays);
      setMeta({ editorial: result.editorial, recommendedStays: result.recommendedStays });
      setSaveToken(result.saveToken);
      setProgress({ totalDays: mergedDays.length, completedDays: mergedDays.length });
      setStreamComplete(true);
      setLoading(false);
      setResuming(false);
      clearPendingRequestId();

      const completed: ItineraryResponse = {
        destination: data.destination,
        editorial: result.editorial,
        days: mergedDays,
        recommendedStays: result.recommendedStays,
      };
      saveCache(fingerprint, completed, result.saveToken);
      toast.success("Itinerary Prepared", {
        id: "curate-task",
        description: "Your bespoke journey is ready for review.",
      });
      return completed;
    };

    // ── Snapshot polling (resume) ──────────────────────────────────────────────
    const followSnapshot = async (): Promise<ItineraryResponse | null> => {
      setResuming(true);
      let delay = POLL_MS;

      while (isCurrent()) {
        let snapshot: Snapshot;
        try {
          const res = await fetch(`/api/generations/${requestId}`, { cache: "no-store" });
          if (res.status === 404) throw new GenerationNotFoundError();
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          snapshot = await res.json() as Snapshot;
          delay = POLL_MS;
        } catch (err) {
          if (err instanceof GenerationNotFoundError) throw err;
          // Offline or transient — keep trying with backoff.
          await sleep(delay);
          delay = Math.min(delay * 2, MAX_POLL_MS);
          continue;
        }
        if (!isCurrent()) return null;

        if (snapshot.days.length > 0) {
          const merged = mergeDays(daysRef.current, snapshot.days);
          daysRef.current = merged;
          setDays(merged);
        }
        if (snapshot.editorial) {
          setMeta((current) => ({
            editorial: snapshot.editorial,
            recommendedStays: current?.recommendedStays,
          }));
        }
        setProgress({
          totalDays: snapshot.totalDays || data.duration,
          completedDays: daysRef.current.length,
          enrichingDay: snapshot.enrichingDay ?? undefined,
        });

        if (snapshot.status === "done") {
          return finish({
            days: snapshot.days,
            editorial: snapshot.editorial,
            recommendedStays: snapshot.recommendedStays ?? undefined,
            saveToken: snapshot.saveToken,
          });
        }
        if (snapshot.status === "failed") {
          throw new GenerationFailedError(snapshot.errorMessage ?? "Generation failed");
        }
        if (snapshot.status === "stalled") {
          throw new GenerationFailedError("Your journey was interrupted. Please try again.");
        }

        await sleep(POLL_MS);
      }
      return null;
    };

    // ── Live stream (fast path) ────────────────────────────────────────────────
    const followStream = async (): Promise<ItineraryResponse | null> => {
      const streamAbort = new AbortController();
      streamAbortRef.current = streamAbort;
      streamingRef.current = true;

      try {
        const response = await fetch("/api/itinerary-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, requestId }),
          signal: streamAbort.signal,
        });

        // Already running or finished on the server (reload, retry, double tap).
        if (response.status === 202) return followSnapshot();

        if (!response.ok || !response.body) {
          const responseError = await response.json().catch(() => ({
            error: "The itinerary stream could not be opened.",
          }));

          if (response.status === 402 || response.status === 403) {
            clearPendingRequestId();
            setPaywalled(true);
            setLoading(false);
            toast.dismiss("curate-task");
            return null;
          }

          if (response.status === 401) {
            clearPendingRequestId();
            setSignInRequired(true);
            setLoading(false);
            toast.dismiss("curate-task");
            return null;
          }

          if (response.status === 404) throw new GenerationNotFoundError();

          // Rejected before it started (validation, rate limit, busy) — a real error.
          clearPendingRequestId();
          throw new GenerationFailedError(
            responseError.message || responseError.error || `HTTP ${response.status}`
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let leftover = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = leftover + decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          leftover = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(line) as Record<string, unknown>;
            } catch {
              continue;
            }
            if (!isCurrent()) return null;

            switch (event.type) {
              case "start":
                setProgress({
                  totalDays: Number(event.totalDays) || data.duration,
                  completedDays: daysRef.current.length,
                });
                break;

              case "enriching":
                setProgress((current) => ({
                  ...current,
                  enrichingDay: Number(event.day) || undefined,
                }));
                break;

              case "day": {
                const nextDays = upsertDay(daysRef.current, event.day as DayPlan);
                daysRef.current = nextDays;
                setDays(nextDays);

                if (typeof event.editorial === "string") {
                  setMeta((current) => ({
                    editorial: event.editorial as string,
                    recommendedStays: current?.recommendedStays,
                  }));
                }

                setProgress({
                  totalDays: Number(event.totalDays) || data.duration,
                  completedDays: nextDays.length,
                });
                break;
              }

              case "done":
                return finish({
                  days: Array.isArray(event.fallbackDays) ? event.fallbackDays as DayPlan[] : [],
                  editorial: typeof event.editorial === "string" ? event.editorial : "",
                  recommendedStays: event.recommendedStays as RecommendedStay[] | undefined,
                  saveToken: typeof event.saveToken === "string" ? event.saveToken : null,
                });

              case "error":
                throw new GenerationFailedError(
                  typeof event.message === "string" ? event.message : "Generation failed"
                );
            }
          }
        }

        // The stream ended without "done" — the server may still be working.
        return followSnapshot();
      } catch (err) {
        if (err instanceof GenerationFailedError || err instanceof GenerationNotFoundError) throw err;
        if (!isCurrent()) return null;
        // Network drop, iOS background kill, or our own hand-over abort:
        // the server keeps going — follow its snapshot.
        return followSnapshot();
      } finally {
        streamingRef.current = false;
        if (streamAbortRef.current === streamAbort) streamAbortRef.current = null;
      }
    };

    try {
      return await followStream();
    } catch (caughtError) {
      if (!isCurrent()) return null;
      clearPendingRequestId();
      setLoading(false);
      setResuming(false);

      const message =
        caughtError instanceof GenerationNotFoundError
          ? "This journey is no longer available. Please generate it again."
          : caughtError instanceof Error
            ? caughtError.message
            : "Unknown error";
      setError(message);
      toast.error("Concierge Busy", {
        id: "curate-task",
        description: "Our desk is at capacity. Please try again in a moment.",
      });
      return null;
    }
  }, [abort, restoreItinerary]);

  // When the page comes back (iOS resumes a suspended tab, or restores it from
  // the back/forward cache), the live stream is usually dead even if it hasn't
  // errored yet. Hand over to the server snapshot instead of waiting on it.
  useEffect(() => {
    const handOver = () => {
      if (document.visibilityState === "visible" && streamingRef.current) {
        streamAbortRef.current?.abort(); // followStream's catch switches to polling
      }
    };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) handOver(); };

    document.addEventListener("visibilitychange", handOver);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", handOver);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const itinerary = useMemo<ItineraryResponse | null>(() => {
    if (days.length === 0) return null;

    return {
      destination,
      editorial: meta?.editorial ?? "",
      days,
      recommendedStays: meta?.recommendedStays,
    };
  }, [days, destination, meta]);

  return {
    itinerary,
    days,
    meta,
    progress,
    loading,
    streamComplete,
    error,
    paywalled,
    signInRequired,
    saveToken,
    resuming,
    generateItinerary,
    abort,
    restoreItinerary,
  };
}
