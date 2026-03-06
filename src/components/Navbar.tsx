"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 border-b border-black/5 bg-paper/80 backdrop-blur-sm"
    >
      {/* Wordmark */}
      <Link href="/" className="flex items-baseline gap-2">
        <span className="font-serif italic text-2xl text-ink leading-none">
          Seek Wander
        </span>
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-8">
        <span className="micro-copy text-ink-light hover:text-ink transition-colors cursor-pointer">
          Journal
        </span>
        <span className="micro-copy text-ink-light hover:text-ink transition-colors cursor-pointer">
          Philosophy
        </span>
        <span className="micro-copy text-ink-light hover:text-ink transition-colors cursor-pointer">
          Destinations
        </span>
      </div>

      {/* Placeholder Sign In (auth deferred to Phase 2) */}
      <button className="micro-copy border border-ink/20 px-5 py-2.5 text-ink hover:bg-ink hover:text-paper transition-all duration-300">
        Sign In
      </button>
    </motion.nav>
  );
}
