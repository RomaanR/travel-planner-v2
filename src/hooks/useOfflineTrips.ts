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

const CACHE_KEY = "seek_wander_archive";

// ── Cache helpers (module-level so deleteTrip can access them) ────────────────

function readCache(): CachedTrip[] {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Cache is not an array");
    return parsed as CachedTrip[];
  } catch {
    // Corrupt or tampered cache — purge so it doesn't persist
    localStorage.removeItem(CACHE_KEY);
    return [];
  }
}

function writeCache(trips: CachedTrip[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(trips));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOfflineTrips() {
  const [trips,     setTrips]     = useState<CachedTrip[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      if (OFFLINE_MODE_ENABLED) {
        // 1. Short-circuit if the browser reports no connectivity
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setTrips(readCache());
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

        // 3. Always persist to cache so fallback works if fetch fails later
        writeCache(fresh);
        setTrips(fresh);
        setIsOffline(false);
      } catch {
        // 4. Always fall back to cache on fetch failure (banner only shown when OFFLINE_MODE_ENABLED)
        setTrips(readCache());
        if (OFFLINE_MODE_ENABLED) setIsOffline(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ── deleteTrip ──────────────────────────────────────────────────────────────
  // Calls DELETE /api/trips/[id], then removes the trip from local React state
  // and syncs the localStorage archive. Throws on API failure so callers can
  // surface an error toast without needing to manage their own fetch state.
  async function deleteTrip(id: string): Promise<void> {
    const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(`Delete failed: HTTP ${res.status}`);
    }

    // Remove from React state
    setTrips((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      // Sync localStorage — use the filtered array, not a stale readCache() call,
      // so there is no race between React state and the localStorage write.
      writeCache(updated);
      return updated;
    });
  }

  return { trips, isOffline, loading, deleteTrip };
}
