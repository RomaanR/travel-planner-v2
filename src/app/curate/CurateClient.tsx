"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import CurationForm from "@/components/CurationForm";
import TailorForm from "@/components/TailorForm";
import type { ItineraryRequest } from "@/types/itinerary";

type Mode = "inspire" | "tailor";

export default function CurateClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("inspire");
  const [loading, setLoading] = useState(false);

  async function handleGenerate(data: ItineraryRequest) {
    setLoading(true);
    try {
      sessionStorage.setItem("itineraryRequest", JSON.stringify(data));
      router.push("/itinerary");
    } finally {
      setLoading(false);
    }
  }

  const headerCopy = {
    inspire: {
      kicker: "Tell Us Your Dream",
      headline: "Craft Your Journey.",
      sub: "Share your destination, dates, and tastes. The rest is ours.",
    },
    tailor: {
      kicker: "Your Blueprint",
      headline: "Tailor Your Journey.",
      sub: "Share your fixed plans and anchor points. We will build everything around them.",
    },
  };

  const copy = headerCopy[mode];

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />

      <div className="max-w-3xl mx-auto px-8 md:px-16 pt-24 pb-24">

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className="mb-12"
        >
          <Link
            href="/"
            className="micro-copy inline-flex items-center gap-1 text-ink-light hover:text-ink transition-colors duration-200"
          >
            <ChevronLeft size={14} strokeWidth={2} />
            Back to Home
          </Link>
        </motion.div>

        {/* Mode toggle */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
          className="mb-10 inline-flex border border-ink/15"
        >
          {(["inspire", "tailor"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-5 py-2 micro-copy transition-colors duration-200 ${
                mode === m ? "bg-ink text-paper" : "text-ink-light hover:text-ink"
              }`}
            >
              {m === "inspire" ? "Inspire Me" : "Tailor My Trip"}
            </button>
          ))}
        </motion.div>

        {/* Editorial header — swaps with mode */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode + "-header"}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mb-12"
          >
            <p className="micro-copy text-ink-light mb-4">{copy.kicker}</p>
            <div className="w-12 h-px bg-ink/20 mb-6" />
            <h1
              className="font-serif italic text-ink leading-none mb-4"
              style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}
            >
              {copy.headline}
            </h1>
            <p className="font-sans text-ink-light text-base md:text-lg leading-relaxed max-w-md">
              {copy.sub}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Form — swaps with mode */}
        <AnimatePresence mode="wait">
          {mode === "inspire" ? (
            <CurationForm key="inspire" onGenerate={handleGenerate} loading={loading} />
          ) : (
            <TailorForm key="tailor" onGenerate={handleGenerate} loading={loading} />
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
