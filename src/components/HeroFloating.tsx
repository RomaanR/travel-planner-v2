"use client";

import { useState, useEffect } from "react";
import {
  useFloating,
  useHover,
  useInteractions,
  offset,
  flip,
  shift,
} from "@floating-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const BG_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=90",
    alt: "Dramatic alpine peaks at sunrise",
  },
  {
    src: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=90",
    alt: "Aerial view of turquoise coastline",
  },
  {
    src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=90",
    alt: "Golden light through ancient forest",
  },
  {
    src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=90",
    alt: "Waterfall cascading through lush jungle",
  },
  {
    src: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=90",
    alt: "Vast desert dunes at golden hour",
  },
  {
    src: "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=1920&q=90",
    alt: "Misty fjord reflecting still waters",
  },
  {
    src: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=1920&q=90",
    alt: "Pristine white sand beach with crystal waters",
  },
];

function getShuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function HeroFloating() {
  // ── Background slideshow (random order, reshuffled each mount) ───
  const [shuffled] = useState(() => getShuffled(BG_IMAGES));
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((i) => (i + 1) % shuffled.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [shuffled.length]);

  // ── Floating UI state ────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "top-end",
    middleware: [offset(12), flip(), shift({ padding: 8 })],
  });

  const hover = useHover(context, { delay: { open: 300, close: 100 } });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  return (
    <>
      {/* Background — fixed to viewport so it never shifts when the page scrolls. */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={bgIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={shuffled[bgIndex].src}
              alt={shuffled[bgIndex].alt}
              fill
              priority={bgIndex === 0}
              className="object-cover"
              sizes="100vw"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black/60" />
      </div>

      <section className="relative z-10 min-h-screen flex flex-col justify-between overflow-hidden">
        {/* Top — heading block */}
        <div className="px-8 md:px-16 pt-28 md:pt-32">
          {/* Pre-title */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="micro-copy text-white/60 mb-6"
          >
            Curated Luxury Journeys
          </motion.p>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className="font-serif italic text-white leading-none mb-2"
            style={{ fontSize: "clamp(2.8rem, 12vw, 14rem)" }}
          >
            Traval
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.45 }}
            className="font-serif italic text-white leading-none mb-8"
            style={{ fontSize: "clamp(2.8rem, 12vw, 14rem)" }}
          >
            Bee
          </motion.h1>

          {/* Thin rule */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
            className="origin-left w-24 h-px bg-white/40 mb-6"
          />

          {/* Sub-caption */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.7 }}
            className="font-sans text-white/70 text-base md:text-lg max-w-md leading-relaxed"
          >
            Ultra-curated itineraries crafted around you: hidden gems, Michelin-worthy tables, and the moments between.
          </motion.p>
        </div>

        {/* Bottom-right — CTA buttons (absolute on desktop, flow on mobile) */}
        <div className="md:absolute md:bottom-16 md:right-20 px-8 md:px-0 pb-20 md:pb-0 flex flex-col items-end gap-6">
          {/* Thin vertical accent line */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.75 }}
            className="origin-top hidden md:block w-px h-16 bg-white/25 self-center"
          />

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.85 }}
          >
            <Link
              href="/curate"
              className="micro-copy inline-flex items-center gap-3 bg-burnt-orange text-white px-8 py-4 hover:bg-burnt-orange/90 transition-colors duration-300"
            >
              Begin Your Journey
              <span>&rarr;</span>
            </Link>
          </motion.div>

          {/* Secondary CTA — sample itinerary (floating UI reference) */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.95 }}
          >
            <div ref={refs.setReference} {...getReferenceProps()}>
              <Link
                href="/sample"
                className="micro-copy inline-flex items-center gap-2 bg-white/15 border border-white/60 text-white hover:bg-white/25 px-6 py-3 backdrop-blur-sm transition-all duration-300"
              >
                <span>View Sample Itinerary</span>
                <span className="text-white/60">&rarr;</span>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator — bottom-center float animation */}
        <motion.p
          initial={{ y: 0, opacity: 0.4 }}
          animate={{ y: 10, opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 uppercase tracking-[0.2em] text-[10px] text-white/60"
        >
          Scroll to Explore
        </motion.p>
      </section>

      {/* ── Floating dossier preview card ─────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, zIndex: 50 }}
            {...getFloatingProps()}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-xl p-4 w-64"
            >
              {/* Compass icon */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-3"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>

              {/* Micro kicker */}
              <p className="text-[9px] tracking-[0.2em] uppercase text-white/60 mb-1">
                Preview Dossier
              </p>

              {/* Serif headline */}
              <p className="font-serif italic text-white text-lg leading-tight mb-2">
                The New York Journey
              </p>

              {/* Metadata line */}
              <p className="text-[10px] text-white/50 leading-relaxed">
                5 days &middot; Ultra-luxury &middot; Couple
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
