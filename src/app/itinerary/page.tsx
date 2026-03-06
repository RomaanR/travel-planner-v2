"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Sunrise,
  Sun,
  Moon,
  Gem,
  UtensilsCrossed,
  Loader2,
  ArrowLeft,
  BookmarkPlus,
} from "lucide-react";
import { useItinerary } from "@/hooks/useItinerary";
import type { ItineraryRequest, DayPlan, Activity, DiningRec } from "@/types/itinerary";
import Navbar from "@/components/Navbar";

const PACE_LABELS: Record<string, string> = {
  slow: "Slow — Restorative",
  moderate: "Moderate — Balanced",
  immersive: "Immersive — Culturally Dense",
};

const PACE_COLORS: Record<string, string> = {
  slow: "text-emerald-accent border-emerald-accent",
  moderate: "text-burnt-orange border-burnt-orange",
  immersive: "text-ink border-ink",
};

function ActivityBlock({
  icon,
  label,
  activity,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  activity: Activity;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className="border-l-2 border-ink/10 pl-6 py-2"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-ink-light">{icon}</span>
        <span className="micro-copy text-ink-light">{label}</span>
        <span className="micro-copy text-ink/30 ml-auto">{activity.duration}</span>
      </div>
      <h4 className="font-serif italic text-2xl text-ink mb-2">
        {activity.title}
      </h4>
      <p className="text-ink-light text-sm leading-relaxed font-sans">
        {activity.description}
      </p>
    </motion.div>
  );
}

function DayCard({ day, index }: { day: DayPlan; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.15 }}
      className="border border-ink/8 bg-paper"
    >
      {/* Day header */}
      <div className="border-b border-ink/8 px-8 py-6 flex items-start justify-between bg-paper-dark">
        <div>
          <p className="micro-copy text-ink-light mb-1">Day {day.day}</p>
          <h3 className="font-serif italic text-4xl md:text-5xl text-ink leading-tight">
            {day.theme}
          </h3>
        </div>
        <span
          className={`micro-copy border px-3 py-1.5 mt-1 ${PACE_COLORS[day.pace] || "text-ink border-ink"}`}
        >
          {PACE_LABELS[day.pace] || day.pace}
        </span>
      </div>

      {/* Timeline */}
      <div className="px-8 py-8 grid md:grid-cols-3 gap-8">
        <ActivityBlock
          icon={<Sunrise size={14} strokeWidth={1.5} />}
          label="Morning"
          activity={day.morning}
          delay={index * 0.15 + 0.1}
        />
        <ActivityBlock
          icon={<Sun size={14} strokeWidth={1.5} />}
          label="Afternoon"
          activity={day.afternoon}
          delay={index * 0.15 + 0.2}
        />
        <ActivityBlock
          icon={<Moon size={14} strokeWidth={1.5} />}
          label="Evening"
          activity={day.evening}
          delay={index * 0.15 + 0.3}
        />
      </div>

      {/* Hidden gem */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.15 + 0.4 }}
        className="mx-8 mb-6 border-l-2 border-emerald-accent pl-4 py-2"
      >
        <div className="flex items-center gap-2 mb-1">
          <Gem size={13} strokeWidth={1.5} className="text-emerald-accent" />
          <span className="micro-copy text-emerald-accent">Hidden Gem</span>
        </div>
        <p className="text-ink text-sm font-sans leading-relaxed">
          {day.hiddenGem}
        </p>
      </motion.div>

      {/* Dining */}
      {day.dining.length > 0 && (
        <div className="border-t border-ink/8 px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed size={14} strokeWidth={1.5} className="text-ink-light" />
            <span className="micro-copy text-ink-light">Dining</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {day.dining.map((dining: DiningRec) => (
              <div
                key={dining.name}
                className="border border-ink/10 px-4 py-3 bg-paper-dark flex items-center gap-3"
              >
                <div>
                  <p className="font-sans text-sm font-medium text-ink">
                    {dining.name}
                  </p>
                  <p className="micro-copy text-ink-light mt-0.5">
                    {dining.cuisine}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3 pl-3 border-l border-ink/10">
                  <span className="micro-copy text-ink">{dining.pricePoint}</span>
                  {dining.reservation && (
                    <span className="micro-copy text-burnt-orange">
                      Reservation
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function ItineraryPage() {
  const router = useRouter();
  const { itinerary, loading, error, generateItinerary } = useItinerary();
  const [destination, setDestination] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("itineraryRequest");
    if (!stored) {
      router.push("/");
      return;
    }
    const data: ItineraryRequest = JSON.parse(stored);
    setDestination(data.destination);
    generateItinerary(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />

      {/* Page header */}
      <div className="pt-28 pb-12 px-8 md:px-16 border-b border-ink/5 bg-paper-dark">
        <div className="max-w-screen-xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 micro-copy text-ink-light hover:text-ink transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            New Destination
          </button>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="micro-copy text-ink-light mb-2">
              Your Curated Itinerary
            </p>
            <h1 className="font-serif italic text-6xl md:text-8xl text-ink leading-none">
              {destination || "Loading…"}
            </h1>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-8 md:px-16 py-16">

        {/* Loading state */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 gap-6"
          >
            <Loader2 size={32} className="animate-spin text-burnt-orange" strokeWidth={1} />
            <p className="font-serif italic text-3xl text-ink">
              Curating your journey…
            </p>
            <p className="micro-copy text-ink-light">
              Sourcing hidden gems, reservations, and the perfect pace
            </p>
          </motion.div>
        )}

        {/* Error state */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-burnt-orange/20 bg-burnt-orange/5 px-8 py-8 text-center"
          >
            <p className="font-serif italic text-2xl text-ink mb-2">
              Something went wrong
            </p>
            <p className="micro-copy text-ink-light mb-6">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="micro-copy border border-ink/20 px-6 py-3 hover:bg-ink hover:text-paper transition-all"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Itinerary */}
        {itinerary && !loading && (
          <>
            {/* Editorial opener */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-16 max-w-2xl"
            >
              <div className="w-12 h-px bg-burnt-orange mb-6" />
              <blockquote className="font-serif italic text-2xl md:text-3xl text-ink leading-relaxed">
                "{itinerary.editorial}"
              </blockquote>
            </motion.div>

            {/* Save button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between mb-10"
            >
              <p className="micro-copy text-ink-light">
                3-Day Curated Itinerary
              </p>
              <button className="flex items-center gap-2 micro-copy border border-ink/20 px-5 py-2.5 hover:bg-ink hover:text-paper transition-all">
                <BookmarkPlus size={14} />
                Save Itinerary
              </button>
            </motion.div>

            {/* Day cards */}
            <div className="flex flex-col gap-6">
              {itinerary.days.map((day, i) => (
                <DayCard key={day.day} day={day} index={i} />
              ))}
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-16 border-t border-ink/5 pt-16 text-center"
            >
              <p className="font-serif italic text-4xl text-ink mb-4">
                Ready for another destination?
              </p>
              <button
                onClick={() => router.push("/")}
                className="micro-copy bg-burnt-orange text-white px-10 py-4 hover:bg-ink transition-colors"
              >
                Curate a New Journey
              </button>
            </motion.div>
          </>
        )}
      </div>
    </main>
  );
}
