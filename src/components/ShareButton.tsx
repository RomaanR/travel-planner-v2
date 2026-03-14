"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  tripId: string;
  destination: string;
}

export default function ShareButton({ tripId, destination }: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied">("idle");

  async function handleShare() {
    const url = `${window.location.origin}/shared/${tripId}`;

    // Try native share API first (mobile — bottom sheet)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${destination} — Seek Wander`,
          text: `A curated luxury itinerary for ${destination}.`,
          url,
        });
        return;
      } catch {
        // User cancelled or browser rejected — fall through to clipboard
      }
    }

    // Clipboard fallback (desktop)
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      // Silent — clipboard access denied by user
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleShare}
        className="micro-copy inline-flex items-center gap-2 text-ink-light hover:text-ink transition-colors duration-200"
      >
        {status === "copied" ? (
          <Check size={12} strokeWidth={1.5} className="text-emerald-accent" />
        ) : (
          <Share2 size={12} strokeWidth={1.5} />
        )}
        {status === "copied" ? "Copied!" : "Share"}
      </button>

      {/* Toast notification */}
      <AnimatePresence>
        {status === "copied" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap bg-ink text-paper text-[10px] font-sans tracking-widest uppercase px-3 py-1.5 pointer-events-none"
          >
            Link copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
