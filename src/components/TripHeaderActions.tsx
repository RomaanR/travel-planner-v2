"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, FileDown, Trash2, Map } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import DeleteTripButton, { DeleteDialog } from "@/components/DeleteTripButton";
import ExportPdfButton from "@/components/ExportPdfButton";
import ExportMapButton from "@/components/ExportMapButton";
import type { ItineraryResponse } from "@/types/itinerary";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  tripId:      string;
  destination: string;
  itinerary:   ItineraryResponse;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripHeaderActions({ tripId, destination, itinerary }: Props) {
  const router = useRouter();
  const [kebabOpen,  setKebabOpen]  = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending,  setIsPending]  = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!kebabOpen) return;
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setKebabOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [kebabOpen]);

  async function handleDeleteConfirm() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setDialogOpen(false);
      toast.success("Journey Removed", {
        description: `${destination} has been removed from your archive.`,
      });

      // Prune localStorage so /trips page doesn't flash stale data
      try {
        const raw = localStorage.getItem("seek_wander_archive");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localStorage.setItem(
              "seek_wander_archive",
              JSON.stringify(parsed.filter((t: { id: string }) => t.id !== tripId))
            );
          }
        }
      } catch { /* non-fatal */ }

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
      {/* Delete confirmation dialog — triggered by mobile kebab */}
      <AnimatePresence>
        {dialogOpen && (
          <DeleteDialog
            key="delete-dialog-kebab"
            destination={destination}
            onCancel={() => { if (!isPending) setDialogOpen(false); }}
            onConfirm={handleDeleteConfirm}
            isPending={isPending}
          />
        )}
      </AnimatePresence>

      {/* ── Desktop: full labelled buttons ── */}
      <div className="hidden md:flex items-center gap-3">
        <DeleteTripButton tripId={tripId} destination={destination} />
        <ExportMapButton itinerary={itinerary} />
        <ExportPdfButton />
      </div>

      {/* ── Mobile: kebab (3-dot) dropdown ── */}
      <div ref={menuRef} className="relative md:hidden print:hidden">
        <button
          onClick={() => setKebabOpen((o) => !o)}
          className="flex items-center justify-center w-9 h-9 border border-ink/15 text-ink-light hover:border-ink hover:text-ink transition-all duration-200"
          aria-label="Trip actions"
          aria-expanded={kebabOpen}
        >
          <MoreVertical size={16} strokeWidth={1.5} />
        </button>

        <AnimatePresence>
          {kebabOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-1 bg-paper border border-ink/10 min-w-[160px] z-30"
            >
              <button
                onClick={() => { setKebabOpen(false); window.print(); }}
                className="flex items-center gap-2.5 w-full px-4 py-3 micro-copy text-ink hover:bg-paper-dark transition-colors text-left"
              >
                <FileDown size={12} strokeWidth={1.5} />
                Download PDF
              </button>

              <div className="border-t border-ink/5" />

              <ExportMapButton
                itinerary={itinerary}
                className="flex items-center gap-2.5 w-full px-4 py-3 micro-copy text-ink hover:bg-paper-dark transition-colors text-left"
                iconSize={12}
                label="Download Map"
              />

              <div className="border-t border-ink/5" />

              <button
                onClick={() => { setKebabOpen(false); setDialogOpen(true); }}
                className="flex items-center gap-2.5 w-full px-4 py-3 micro-copy text-burnt-orange hover:bg-paper-dark transition-colors text-left"
              >
                <Trash2 size={12} strokeWidth={1.5} />
                Remove
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
