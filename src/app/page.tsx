"use client";

export const dynamic = "force-dynamic";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CurationForm from "@/components/CurationForm";
import BentoGrid from "@/components/BentoGrid";
import { useRouter } from "next/navigation";
import type { ItineraryRequest } from "@/types/itinerary";

export default function HomePage() {
  const router = useRouter();

  async function handleGenerate(data: ItineraryRequest) {
    sessionStorage.setItem("itineraryRequest", JSON.stringify(data));
    router.push("/itinerary");
  }

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-end overflow-hidden">
        {/* Cinematic background image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=85"
            alt="Cinematic mountain forest — luxury travel"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black/60" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-8 md:px-16 pt-40 pb-24 md:pb-32">
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
            style={{ fontSize: "clamp(5rem, 15vw, 14rem)" }}
          >
            Seek
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.45 }}
            className="font-serif italic text-white leading-none mb-12"
            style={{ fontSize: "clamp(5rem, 15vw, 14rem)" }}
          >
            Wander
          </motion.h1>

          {/* Thin rule */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
            className="origin-left w-24 h-px bg-white/40 mb-8"
          />

          {/* Sub-caption */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.7 }}
            className="font-sans text-white/70 text-lg mb-16 max-w-md leading-relaxed"
          >
            Ultra-curated itineraries crafted around you &mdash; hidden gems, Michelin-worthy tables, and the moments between.
          </motion.p>

          {/* Curation Form */}
          <CurationForm onGenerate={handleGenerate} />
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 right-8 flex items-center gap-3"
        >
          <span className="micro-copy text-white/40">Scroll</span>
          <div className="w-px h-12 bg-white/20" />
        </motion.div>
      </section>

      {/* ── Stats Strip ──────────────────────────────────── */}
      <section className="border-b border-ink/5 bg-paper-dark">
        <div className="max-w-screen-xl mx-auto px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "30s", label: "Average Curation Time" },
            { value: "120+", label: "Destinations Worldwide" },
            { value: "100%", label: "Hidden Gems Included" },
            { value: "Zero", label: "Tourist Traps" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.1 }}
              className="text-center"
            >
              <p className="font-serif italic text-4xl text-ink mb-1">
                {stat.value}
              </p>
              <p className="micro-copy text-ink-light">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section className="px-8 md:px-16 py-20 max-w-screen-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12"
        >
          <p className="micro-copy text-ink-light mb-3">How It Works</p>
          <h2 className="font-serif italic text-5xl md:text-7xl text-ink leading-none">
            Three Steps.<br />One Perfect Trip.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ink/5">
          {[
            {
              step: "01",
              title: "Tell Us Your Dream",
              body: "Pick a destination, set your dates, and share your pace, budget, and dietary needs.",
            },
            {
              step: "02",
              title: "We Curate Every Detail",
              body: "Hidden gems, Michelin-worthy restaurants, and geographically coherent routes &mdash; crafted in seconds.",
            },
            {
              step: "03",
              title: "Your Dossier Is Ready",
              body: "A day-by-day itinerary with maps, transit times, and hotel recommendations. Save, share, or export as PDF.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.1 }}
              className="bg-paper p-8 md:p-10 border border-ink/5"
            >
              <span className="micro-copy text-burnt-orange mb-4 block">
                {item.step}
              </span>
              <h3 className="font-serif italic text-2xl md:text-3xl text-ink leading-tight mb-3">
                {item.title}
              </h3>
              <p
                className="font-sans text-sm text-ink-light leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.body }}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Bento Grid ───────────────────────────────────── */}
      <BentoGrid />

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-ink/5 bg-paper-dark px-8 md:px-16 py-12">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="font-serif italic text-3xl text-ink mb-1">
              Seek Wander
            </p>
            <p className="micro-copy text-ink-light">
              Curated Luxury Journeys
            </p>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/faq" className="micro-copy text-ink-light hover:text-ink transition-colors">
              FAQ
            </Link>
            <Link href="/privacy" className="micro-copy text-ink-light hover:text-ink transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="micro-copy text-ink-light hover:text-ink transition-colors">
              Terms
            </Link>
            <Link href="/cookies" className="micro-copy text-ink-light hover:text-ink transition-colors">
              Cookies
            </Link>
            <Link href="/refunds" className="micro-copy text-ink-light hover:text-ink transition-colors">
              Refunds
            </Link>
            <a href="mailto:hello@seekwander.com" className="micro-copy text-ink-light hover:text-ink transition-colors">
              Contact
            </a>
          </div>
          <p className="micro-copy text-ink-light">
            © {new Date().getFullYear()} Seek Wander. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
