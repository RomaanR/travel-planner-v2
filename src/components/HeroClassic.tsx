"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

// Load auth-aware CTA client-side only — prevents SSR throws when ClerkProvider is absent
const BeginJourneyButton = dynamic(() => import("./BeginJourneyButton"), {
  ssr: false,
  loading: () => (
    <span className="micro-copy inline-flex items-center gap-3 bg-burnt-orange text-white px-8 py-4">
      Begin Your Journey <span>&rarr;</span>
    </span>
  ),
});

export default function HeroClassic() {
  return (
    <>
      {/* Background — fixed to viewport so it never shifts when the page scrolls. */}
      <div className="fixed inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=85"
          alt="Cinematic mountain forest — luxury travel"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
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
            Seek
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.45 }}
            className="font-serif italic text-white leading-none mb-8"
            style={{ fontSize: "clamp(2.8rem, 12vw, 14rem)" }}
          >
            Wander
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
            <BeginJourneyButton />
          </motion.div>

          {/* Secondary CTA — sample itinerary */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.95 }}
          >
            <Link
              href="/sample"
              className="micro-copy inline-flex items-center gap-2 bg-white/15 border border-white/60 text-white hover:bg-white/25 px-6 py-3 backdrop-blur-sm transition-all duration-300"
            >
              <span>View Sample Itinerary</span>
              <span className="text-white/60">&rarr;</span>
            </Link>
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
    </>
  );
}
