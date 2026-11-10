"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { track } from "@vercel/analytics";
import { ArrowRight, Play, X } from "lucide-react";

// A one-time invitation for first-time visitors to watch the how-it-works tour.
//   - Shown once per browser: the flag is set when the dialog appears, so ignoring it counts as seen.
//   - Waits a few seconds and never interrupts someone who is already typing.
//   - If storage is blocked we never show it (otherwise it would appear on every visit).
//   - Add ?welcome=1 to any home-page link to force it open (useful for testing and campaign links).
const SEEN_KEY = "travalbee_welcome_seen";
const DELAY_MS = 3000;
const VIDEO_SRC = "/how-it-works.mp4";
const POSTER_SRC = "/how-it-works-poster.jpg";

export default function WelcomeVideoModal() {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  // ── Decide whether to show it ──────────────────────────────────────────────
  useEffect(() => {
    let timer: number | undefined;
    try {
      const forced = new URLSearchParams(window.location.search).get("welcome") === "1";
      if (!forced && localStorage.getItem(SEEN_KEY)) return;

      timer = window.setTimeout(() => {
        const el = document.activeElement as HTMLElement | null;
        const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
        if (typing && !forced) return; // they are busy planning: leave them alone, try again next visit
        if (!forced) {
          try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch { /* best effort */ }
        }
        returnFocusTo.current = el;
        setOpen(true);
      }, forced ? 400 : DELAY_MS);
    } catch {
      // storage blocked: do not show
    }
    return () => window.clearTimeout(timer);
  }, []);

  // ── Modal behaviour: scroll lock, Escape, focus trap, focus return ─────────
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primaryRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { close("escape"); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], video[controls], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close(how: "button" | "backdrop" | "escape" | "cta") {
    track("welcome_closed", { how, played: playing });
    setOpen(false);
    setPlaying(false);
    returnFocusTo.current?.focus?.();
  }

  function play() {
    track("welcome_video_play");
    setPlaying(true);
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 print:hidden"
          style={{ backgroundColor: "rgba(10,10,10,0.62)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) close("backdrop"); }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
            className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto bg-paper border border-ink/10 shadow-[0_32px_80px_rgba(0,0,0,0.35)]"
          >
            <button
              type="button"
              onClick={() => close("button")}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center bg-paper/90 text-ink hover:bg-ink hover:text-paper transition-colors"
            >
              <X size={18} strokeWidth={1.5} />
            </button>

            {/* Video / poster */}
            <div className="relative aspect-video bg-ink">
              {playing ? (
                <video
                  src={VIDEO_SRC}
                  poster={POSTER_SRC}
                  controls
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full"
                  aria-label="A walkthrough of how TravalBee plans a trip"
                />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={POSTER_SRC} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={play}
                    aria-label="Play the how-it-works video"
                    className="absolute inset-0 flex items-center justify-center group"
                  >
                    <span className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-burnt-orange text-white shadow-lg group-hover:bg-ink transition-colors duration-300">
                      <Play size={28} strokeWidth={1.5} fill="currentColor" />
                    </span>
                  </button>
                </>
              )}
            </div>

            {/* Copy and actions */}
            <div className="px-6 sm:px-10 py-7 sm:py-9">
              <p className="micro-copy text-burnt-orange mb-3">New here?</p>
              <h2 id="welcome-title" className="font-serif italic text-3xl sm:text-4xl text-ink leading-tight mb-3">
                See how TravalBee works.
              </h2>
              <p className="font-sans text-sm sm:text-base text-ink-light leading-relaxed mb-7">
                A short tour, from your first search to a saved itinerary and the latest travel advisories.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {playing ? (
                  <Link
                    href="/curate"
                    onClick={() => close("cta")}
                    className="micro-copy inline-flex items-center justify-center gap-3 bg-burnt-orange text-white px-8 py-4 hover:bg-ink transition-colors duration-300"
                  >
                    Start planning <ArrowRight size={13} strokeWidth={1.5} />
                  </Link>
                ) : (
                  <button
                    ref={primaryRef}
                    type="button"
                    onClick={play}
                    className="micro-copy inline-flex items-center justify-center gap-3 bg-burnt-orange text-white px-8 py-4 hover:bg-ink transition-colors duration-300"
                  >
                    <Play size={13} strokeWidth={1.5} fill="currentColor" /> Watch the tour
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => close("button")}
                  className="micro-copy px-4 py-4 text-ink-light hover:text-ink transition-colors"
                >
                  {playing ? "Close" : "No thanks"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
