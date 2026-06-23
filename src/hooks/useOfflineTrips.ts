"use client";

import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CachedTrip = {
  id:            string;
  destination:   string;
  days:          number;
  createdAt:     string;  // ISO string
  photoUrl:      string | null;
  itineraryData: {
    editorial?: string;
    days?: { theme?: string }[];
  } | null;
};

// ── Feature flag — set to true to re-enable offline mode ─────────────────────
const OFFLINE_MODE_ENABLED = false;

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = "seek_wander_archive";

// ── Cache helpers (module-level so deleteTrip can access them) ────────────────

function cacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}:${userId}`;
}

function readCache(userId: string): CachedTrip[] {
  const raw = localStorage.getItem(cacheKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Cache is not an array");
    return parsed as CachedTrip[];
  } catch {
    // Corrupt or tampered cache — purge so it doesn't persist
    localStorage.removeItem(cacheKey(userId));
    return [];
  }
}

function writeCache(userId: string, trips: CachedTrip[]): void {
  localStorage.setItem(cacheKey(userId), JSON.stringify(trips));
}

// ── Standalone helper — call from any page after saving a new trip ────────────
// Prepends the new trip to the user's cache so /trips shows it immediately
// without waiting for the next /api/trips fetch.
export function cacheNewTrip(userId: string, trip: CachedTrip): void {
  try {
    const existing = readCache(userId);
    // Avoid duplicates if called twice (e.g. React Strict Mode double-invoke)
    if (existing.some((t) => t.id === trip.id)) return;
    writeCache(userId, [trip, ...existing]);
  } catch { /* non-fatal */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOfflineTrips(userId: string | null | undefined) {
  const [trips,     setTrips]     = useState<CachedTrip[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function load() {
      if (OFFLINE_MODE_ENABLED) {
        // 1. Short-circuit if the browser reports no connectivity
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setTrips(readCache(userId!));
          setIsOffline(true);
          setLoading(false);
          return;
        }
      }

      try {
        // 2. Attempt live fetch
        const res = await fetch("/api/trips");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { trips: fresh } = (await res.json()) as { trips: CachedTrip[] };

        // 3. Always persist to user-scoped cache so fallback works if fetch fails later
        writeCache(userId!, fresh);
        setTrips(fresh);
        setIsOffline(false);
      } catch {
        // 4. Always fall back to user-scoped cache on fetch failure
        const cached = readCache(userId!);
        setTrips(cached);
        setIsOffline(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  // ── deleteTrip ──────────────────────────────────────────────────────────────
  async function deleteTrip(id: string): Promise<void> {
    const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(`Delete failed: HTTP ${res.status}`);
    }

    setTrips((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      if (userId) writeCache(userId, updated);
      return updated;
    });
  }

  return { trips, isOffline, loading, deleteTrip };
}
