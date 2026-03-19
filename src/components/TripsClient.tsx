"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { WifiOff, ArrowRight, Loader2, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useOfflineTrips } from "@/hooks/useOfflineTrips";
import type { CachedTrip } from "@/hooks/useOfflineTrips";
import ShareButton from "@/components/ShareButton";
import EmptyTripsState from "@/components/EmptyTripsState";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day:   "numeric",
    year:  "numeric",
  });
}

// ── Confirmation Dialog ───────────────────────────────────────────────────────
// Rendered via createPortal so it escapes any stacking-context ancestor
// (backdrop-blur, transform, etc.) and always sits at the viewport root.

function DeleteDialog({
  trip,
  onCancel,
  onConfirm,
  isPending,
}: {
  trip: CachedTrip;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, isPending]);

  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(10,10,10,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onCancel(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-paper border border-ink/10 w-full max-w-sm mx-6 p-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="micro-copy text-burnt-orange mb-1">Remove Journey</p>
            <h2 className="font-serif italic text-3xl text-ink leading-tight">
              {trip.destination}
            </h2>
          </div>
          {!isPending && (
            <button
              onClick={onCancel}
              className="text-ink-light hover:text-ink transition-colors mt-1"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Body */}
        <p className="font-sans text-sm text-ink-light leading-relaxed mb-8">
          Are you sure you want to remove this journey from your archive?
          This cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 micro-copy border border-ink/20 px-6 py-3 text-ink hover:bg-ink/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 micro-copy bg-ink text-paper px-6 py-3 hover:bg-burnt-orange transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Removing&hellip;
              </>
            ) : (
              "Remove Journey"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripsClient() {
  const { trips, isOffline, loading, deleteTrip } = useOfflineTrips();

  // Track which trip's dialog is open (by id) and whether a delete is in-flight
  const [confirmId,  setConfirmId]  = useState<string | null>(null);
  const [isPending,  setIsPending]  = useState(false);

  const tripToConfirm = trips.find((t) => t.id === confirmId) ?? null;

  async function handleConfirmDelete() {
    if (!confirmId) return;
    setIsPending(true);
    try {
      await deleteTrip(confirmId);
      // Find destination name before closing dialog for the toast
      const dest = tripToConfirm?.destination ?? "Journey";
      setConfirmId(null);
      toast.success("Journey Removed", {
        description: `${dest} has been removed from your archive.`,
      });
    } catch {
      setConfirmId(null);
      toast.error("Remove Failed", {
        description: "Unable to remove this journey. Please try again.",
      });
    } finally {
      setIsPending(false);
    }
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-8 md:px-16 py-20 flex items-center justify-center gap-3">
        <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-ink-light" />
        <p className="micro-copy text-ink-light">Loading your archive&hellip;</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Confirmation dialog (portal) ─────────────────────────────────── */}
      <AnimatePresence>
        {confirmId && tripToConfirm && (
          <DeleteDialog
            key="delete-dialog"
            trip={tripToConfirm}
            onCancel={() => { if (!isPending) setConfirmId(null); }}
            onConfirm={handleConfirmDelete}
            isPending={isPending}
          />
        )}
      </AnimatePresence>

      {/* ── Offline banner ──────────────────────────────────────────────── */}
      {isOffline && (
        <div className="bg-ink text-paper micro-copy py-2 text-center flex items-center justify-center gap-2">
          <WifiOff size={11} strokeWidth={1.5} />
          Offline Mode: Viewing Archived Passport
        </div>
      )}

      {/* ── Count strip (only when trips exist) ─────────────────────────── */}
      {trips.length > 0 && (
        <div className="px-8 md:px-16 pb-0 pt-4 border-b border-ink/5">
          <p className="micro-copy text-ink-light pb-4">
            {trips.length}&ensp;{trips.length === 1 ? "Itinerary" : "Itineraries"}
            &ensp;&middot;&ensp;Sorted by date
            {isOffline && <span className="ml-2 opacity-50">(cached)</span>}
          </p>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="px-8 md:px-16 py-14 md:py-20">

        {/* Empty state */}
        {trips.length === 0 && <EmptyTripsState />}

        {/* Trip grid */}
        {trips.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-ink/5">
            <AnimatePresence initial={false}>
              {trips.map((trip) => {
                const data = trip.itineraryData;
                const editorial = data?.editorial;
                const themes = data?.days
                  ?.slice(0, 3)
                  .map((d) => d?.theme)
                  .filter(Boolean)
                  .join(" · ");
                const preview = editorial ?? themes ?? null;

                return (
                  <motion.article
                    key={trip.id}
                    layout
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="bg-paper flex overflow-hidden hover:bg-paper-dark transition-colors duration-300 group"
                  >
                    {/* ── Left: Text content ── */}
                    <div className="flex flex-col p-8 md:p-10 flex-1 min-w-0">

                      <h2 className="font-serif italic text-3xl md:text-4xl text-ink leading-tight mb-5">
                        {trip.destination}
                      </h2>

                      <div className="w-8 h-px bg-burnt-orange mb-5" />

                      {preview && (
                        <p className="font-sans text-sm text-ink-light leading-relaxed line-clamp-2 mb-6">
                          {editorial ? <>&ldquo;{preview}&rdquo;</> : preview}
                        </p>
                      )}

                      <div className="flex-1" />

                      {/* Meta strip */}
                      <div className="flex items-center gap-3 pt-5 border-t border-ink/5 mb-5">
                        <span className="micro-copy text-ink-light">
                          {trip.days}&nbsp;{trip.days === 1 ? "Day" : "Days"}
                        </span>
                        <span className="text-ink/20 select-none leading-none">&middot;</span>
                        <span className="micro-copy text-ink-light">
                          {formatDate(trip.createdAt)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <Link
                          href={`/trips/${trip.id}`}
                          className="micro-copy inline-flex items-center gap-2 text-ink group-hover:text-burnt-orange transition-colors"
                        >
                          View Itinerary
                          <ArrowRight size={12} strokeWidth={1.5} />
                        </Link>
                        <span className="text-ink/20 select-none leading-none">&middot;</span>
                        <ShareButton tripId={trip.id} destination={trip.destination} />
                        <span className="text-ink/20 select-none leading-none">&middot;</span>
                        <button
                          onClick={() => setConfirmId(trip.id)}
                          className="micro-copy inline-flex items-center gap-1.5 text-ink-light hover:text-burnt-orange transition-colors"
                          aria-label={`Remove ${trip.destination} from archive`}
                        >
                          <Trash2 size={11} strokeWidth={1.5} />
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* ── Right: Destination photo ── */}
                    <div className="relative w-36 md:w-44 shrink-0 self-stretch min-h-[220px] overflow-hidden">
                      {trip.photoUrl ? (
                        <Image
                          src={trip.photoUrl}
                          alt={trip.destination}
                          fill
                          unoptimized
                          sizes="176px"
                          className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-paper-dark flex items-center justify-center">
                          <span
                            className="font-serif italic text-7xl text-ink/8 select-none leading-none"
                            aria-hidden="true"
                          >
                            {trip.destination.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );
}
