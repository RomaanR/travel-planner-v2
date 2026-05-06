"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import DeleteTripButton, { DeleteDialog } from "@/components/DeleteTripButton";
import ExportPdfButton from "@/components/ExportPdfButton";
import type { ItineraryResponse } from "@/types/itinerary";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  tripId:      string;
  destination: string;
  itinerary:   ItineraryResponse;  // kept for future use (e.g. share sheet, map export)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TripHeaderActions({ tripId, destination }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending,  setIsPending]  = useState(false);

  async function handleDeleteConfirm() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setDialogOpen(false);
      toast.success("Journey Removed", {
        description: `${destination} has been removed from your archive.`,
      });

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
      <AnimatePresence>
        {dialogOpen && (
          <DeleteDialog
            key="delete-dialog"
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
        <ExportPdfButton />
      </div>

      {/* ── Mobile: PDF button + trash icon ── */}
      <div className="flex items-center justify-between w-full md:hidden print:hidden">
        <ExportPdfButton />
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center justify-center w-9 h-9 border border-ink/15 text-ink-light hover:border-burnt-orange hover:text-burnt-orange transition-all duration-200"
          aria-label="Remove journey"
        >
          <Trash2 size={15} strokeWidth={1.5} />
        </button>
      </div>
    </>
  );
}
