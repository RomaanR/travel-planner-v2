"use client";

import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { ArrowRight } from "lucide-react";
import HeroPlanner from "./HeroPlanner";
import HeroDossier, { type PlannerDraft } from "./HeroDossier";
import { HERO_MOODS, HERO_PHOTOS } from "@/content/heroDestinations";
import type { SampleSummary } from "@/lib/sampleTrip";

function getShuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function HeroFloating({ sample }: { sample: SampleSummary }) {
  // ── Background slideshow (random order, reshuffled each mount) ───
  // Starts with the deterministic, unshuffled order so server and client render
  // identically on first paint — shuffling with Math.random() before hydration
  // completes causes a server/client mismatch (each environment picks a different
  // order). The shuffle itself only runs client-side, after mount.
  const [shuffled, setShuffled] = useState(HERO_PHOTOS);
  const [bgIndex, setBgIndex] = useState(0);
  const photo = shuffled[bgIndex];

  // What the visitor is typing in the planner — the dossier card responds to it.
  const [draft, setDraft] = useState<PlannerDraft | null>(null);
  const onDraftChange = useCallback((d: PlannerDraft) => setDraft(d), []);

  useEffect(() => {
    setShuffled(getShuffled(HERO_PHOTOS));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((i) => (i + 1) % shuffled.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [shuffled.length]);

  return (
    <>
      {/* Background — fixed to viewport so it never shifts when the page scrolls. */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={photo.src}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
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
        {/* Wide screens: a real day of an itinerary writing itself */}
        <HeroDossier draft={draft} />

        {/* Top — heading block */}
        <div className="dossier-room px-8 md:px-16 pt-28 md:pt-32">
          {/* Pre-title */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="micro-copy text-white/60 mb-6"
          >
            Curated Luxury Journeys
          </motion.p>

          {/* Main heading — one line */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className="hero-title font-serif italic text-white leading-none mb-8 whitespace-nowrap"
            style={{ fontSize: "clamp(3.25rem, 15vw, 11rem)" }}
          >
            TravalBee
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

          {/* Quick planner — destination + dates straight into the planner */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.85 }}
            className="hero-planner-wrap mt-10 md:mt-20"
          >
            <HeroPlanner onDraftChange={onDraftChange} />
          </motion.div>

          {/* Below the planner: a starting point for the undecided, and the sample */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.95 }}
            className="dossier-stack mt-5 max-w-4xl flex flex-col lg:flex-row lg:items-start gap-5"
          >
            {/* Mood chips — one tap fills destination + pace + interests */}
            <div className="flex-1 min-w-0">
              <p className="micro-copy text-[10px] text-white/70 mb-2.5">Not sure yet? Start with a mood</p>
              <div className="flex flex-wrap gap-2">
                {HERO_MOODS.map((mood) => (
                  <Link
                    key={mood.label}
                    href={mood.href}
                    onClick={() => track("hero_mood_clicked", { mood: mood.label })}
                    className="bg-paper/95 hover:bg-paper border border-ink/10 hover:border-burnt-orange px-3.5 py-2
                               font-serif italic text-[15px] leading-none text-ink transition-colors duration-300"
                  >
                    {mood.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Sample itinerary — its own card, in the planner's style */}
            <Link
              href="/sample"
              onClick={() => track("hero_sample_clicked")}
              className="group lg:w-[380px] lg:mt-6 shrink-0 flex items-center gap-4 bg-paper border border-ink/10
                         shadow-[0_18px_40px_rgba(0,0,0,0.22)] p-2.5 pr-5 hover:border-burnt-orange transition-colors duration-300"
            >
              {sample.photo && (
                <span className="relative w-14 h-14 shrink-0 overflow-hidden bg-paper-dark">
                  <Image
                    src={sample.photo}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block micro-copy text-[9px] text-ink-light mb-1 whitespace-nowrap">
                  Sample &middot; {sample.destination} &middot; {sample.days} {sample.days === 1 ? "day" : "days"}
                </span>
                <span className="block font-serif italic text-[17px] leading-tight text-ink line-clamp-2">
                  {sample.dayTitle}
                </span>
              </span>
              <span className="micro-copy text-[10px] text-burnt-orange inline-flex items-center gap-1.5 shrink-0">
                <span className="hidden sm:inline">View</span>
                <ArrowRight size={12} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </motion.div>
        </div>

        {/* Bottom spacer — keeps content clear of the cookie notice on small screens */}
        <div className="h-24 md:h-28" aria-hidden />

        {/* "On the cover" — where this photo was taken, and a one-tap plan for it */}
        <div className="hidden md:block absolute bottom-8 left-16 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={photo.src}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex items-stretch bg-paper/95 border border-ink/10 shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
            >
              <div className="px-4 py-2.5">
                <p className="micro-copy text-[9px] text-ink-light mb-0.5">On the cover</p>
                <p className="font-serif italic text-[17px] leading-tight text-ink">{photo.place}</p>
                <p className="font-sans text-[10px] text-ink-light/80 mt-0.5">
                  Photo: {photo.photographer} &middot; Unsplash
                </p>
              </div>
              <Link
                href={photo.planHref}
                onClick={() => track("hero_cover_clicked", { place: photo.place })}
                className="micro-copy text-[10px] text-white bg-burnt-orange hover:bg-ink px-4 flex items-center gap-2 transition-colors duration-300"
              >
                Plan this journey <ArrowRight size={12} strokeWidth={1.5} />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Scroll indicator — bottom-center float animation */}
        <motion.p
          initial={{ y: 0, opacity: 0.4 }}
          animate={{ y: 10, opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="hidden lg:block absolute bottom-10 left-1/2 -translate-x-1/2 uppercase tracking-[0.2em] text-[10px] text-white/60"
        >
          Scroll to Explore
        </motion.p>
      </section>
    </>
  );
}
