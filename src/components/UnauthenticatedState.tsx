"use client";

import { motion } from "framer-motion";
import { SignInButton } from "@clerk/nextjs";
import { Lock } from "lucide-react";

export default function UnauthenticatedState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6"
    >
      {/* Icon */}
      <Lock
        size={20}
        strokeWidth={1}
        className="text-ink-light mb-6"
      />

      {/* Kicker */}
      <p className="micro-copy text-ink-light tracking-widest mb-4">
        Private Access
      </p>

      {/* Headline */}
      <h2 className="font-serif italic text-3xl md:text-5xl text-ink leading-tight mb-4">
        Your passport awaits.
      </h2>

      {/* Body */}
      <p className="font-sans text-sm text-ink-light leading-relaxed mb-8 max-w-xs">
        Sign in to view your curated itineraries, or create an account to begin
        planning your next journey.
      </p>

      {/* CTA — Clerk modal sign-in, styled as primary ink button */}
      <SignInButton mode="modal">
        <button className="inline-flex items-center gap-3 bg-ink text-paper micro-copy px-8 py-4
                           hover:bg-burnt-orange transition-colors duration-300 cursor-pointer">
          Sign In to Continue
        </button>
      </SignInButton>
    </motion.div>
  );
}
