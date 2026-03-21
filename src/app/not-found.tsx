"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function NotFound() {
  const router = useRouter();
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="micro-copy text-ink-light mb-4">404</p>
          <h1 className="font-serif italic text-5xl md:text-7xl text-ink leading-none mb-6">
            Page not found
          </h1>
          <p className="font-sans text-sm text-ink-light mb-4 max-w-sm mx-auto leading-relaxed">
            The destination you&apos;re looking for doesn&apos;t exist &mdash; yet.
          </p>
          <p className="font-sans text-xs text-ink-light/60 mb-10 max-w-xs mx-auto leading-relaxed">
            Start fresh and let us curate your next journey.
          </p>
          <button
            onClick={() => router.push("/")}
            className="micro-copy bg-burnt-orange text-white px-10 py-4 hover:bg-ink transition-colors duration-300 inline-flex items-center gap-3"
          >
            Curate a Journey
            <span className="text-white/70">&rarr;</span>
          </button>
        </motion.div>
      </div>
    </>
  );
}
