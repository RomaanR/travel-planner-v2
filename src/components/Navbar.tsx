"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import MobileMenu from "@/components/MobileMenu";
import { Home } from "lucide-react";

// Load Clerk auth components client-side only — prevents SSR throws when no key is configured
const NavbarAuth = dynamic(() => import("./NavbarAuth"), { ssr: false });

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 border-b border-black/5 bg-paper/80 backdrop-blur-sm"
    >
      {/* Wordmark */}
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/icon-192x192.png"
          alt="TravalBee"
          width={36}
          height={36}
          className="w-9 h-9 object-cover rounded-none"
          priority
        />
        <span className="font-serif italic text-2xl text-ink leading-none">
          TravalBee
        </span>
      </Link>

      {/* Right side — desktop nav + auth + mobile hamburger */}
      <div className="flex items-center gap-4">

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/pricing"
            className="micro-copy text-ink-light hover:text-ink transition-colors"
          >
            PRICING
          </Link>
          <Link
            href="/trips"
            className="micro-copy text-ink-light hover:text-ink transition-colors"
          >
            MY TRIPS
          </Link>
          <Link
            href="/dashboard"
            className="micro-copy text-ink-light hover:text-ink transition-colors"
          >
            DASHBOARD
          </Link>
          <Link
            href="/"
            aria-label="Home"
            className="text-ink-light hover:text-ink transition-colors"
          >
            <Home size={16} strokeWidth={1.5} />
          </Link>
        </div>

        {/* Auth — always visible (UserButton is compact on mobile) */}
        <NavbarAuth />

        {/* Mobile hamburger — hidden on desktop */}
        <MobileMenu />

      </div>
    </motion.nav>
  );
}
