"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2, X, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  tripId:      string;
  destination: string;
};

// ── Confirmation Dialog ───────────────────────────────────────────────────────

export function DeleteDialog({
  destination,
  onCancel,
  onConfirm,
  isPending,
}: {
  destination: string;
  onCancel:    () => void;
  onConfirm:   () => void;
  isPending:   boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Close on Escape
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
              {destination}
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

// ── DeleteTripButton ───────────────────────────────────────────────────────────
// Used on the /trips/[id] detail page header strip. On confirmed deletion it
// calls the DELETE API then redirects to /trips — the trip no longer exists
// so staying on /trips/[id] would render a server-side 404.

export default function DeleteTripButton({ tripId, destination }: Props) {
  const router = useRouter();
  const { userId } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending,  setIsPending]  = useState(false);

  async function handleConfirm() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setDialogOpen(false);
      toast.success("Journey Removed", {
        description: `${destination} has been removed from your archive.`,
      });

      // Note: we also clear this trip from the localStorage archive.
      // The /trips page re-fetches on mount via useOfflineTrips, so the cache
      // will self-correct. Proactively pruning it here prevents a stale flash
      // if the user navigates to /trips before the hook re-fetches.
      try {
        if (userId) {
          const key = `seek_wander_archive:${userId}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localStorage.setItem(key, JSON.stringify(parsed.filter((t: { id: string }) => t.id !== tripId)));
            }
          }
        }
      } catch { /* non-fatal — /trips will self-correct on mount */ }

      router.push("/trips");
    } catch {
      setDialogOpen(false);
      setIsPending(false);
      toast.error("Remove Failed", {
        description: "Unable to remove this journey. Please try again.",
      });
    }
  }

  return (
    <>
      <AnimatePresence>
        {dialogOpen && (
          <DeleteDialog
            key="delete-dialog-detail"
            destination={destination}
            onCancel={() => { if (!isPending) setDialogOpen(false); }}
            onConfirm={handleConfirm}
            isPending={isPending}
          />
        )}
      </AnimatePresence>

      <button
        onClick={() => setDialogOpen(true)}
        className="micro-copy inline-flex items-center gap-2 border border-ink/15 px-4 py-2 text-ink-light hover:border-burnt-orange hover:text-burnt-orange transition-all duration-300 print:hidden"
        aria-label={`Remove ${destination} from archive`}
      >
        <Trash2 size={12} strokeWidth={1.5} />
        Remove
      </button>
    </>
  );
}
