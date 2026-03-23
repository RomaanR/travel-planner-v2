"use client";

export const dynamic = "force-dynamic";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import CurationForm from "@/components/CurationForm";
import type { ItineraryRequest } from "@/types/itinerary";

export default function CuratePage() {
  const router = useRouter();

  async function handleGenerate(data: ItineraryRequest) {
    sessionStorage.setItem("itineraryRequest", JSON.stringify(data));
    router.push("/itinerary");
  }

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

        {/* Editorial header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="mb-12"
        >
          <p className="micro-copy text-ink-light mb-4">Tell Us Your Dream</p>
          <div className="w-12 h-px bg-ink/20 mb-6" />
          <h1 className="font-serif italic text-ink leading-none mb-4"
            style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}
          >
            Craft Your Journey.
          </h1>
          <p className="font-sans text-ink-light text-base md:text-lg leading-relaxed max-w-md">
            Share your destination, dates, and tastes. The rest is ours.
          </p>
        </motion.div>

        {/* Curation Form */}
        <CurationForm onGenerate={handleGenerate} />

      </div>
    </main>
  );
}
