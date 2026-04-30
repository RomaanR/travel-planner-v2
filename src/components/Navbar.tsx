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
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-3 md:py-5 border-b border-black/5 bg-paper/80 backdrop-blur-sm print:hidden"
      >
      {/* Wordmark */}
      <Link href="/" className="flex items-center gap-2 md:gap-3">
        {/* Mobile logo */}
        <Image
          src="/bee_compass_192_transparent.png"
          alt="TravalBee Logo"
          width={86}
          height={86}
          className="md:hidden w-[86px] h-[86px] object-contain rounded-none flex-shrink-0"
          style={{ marginTop: "-17px", marginBottom: "-17px", marginLeft: "-12px" }}
          priority
        />
        {/* Desktop logo — 120px, larger negative margins to keep navbar slim */}
        <Image
          src="/bee_compass_512_transparent.png"
          alt="TravalBee Logo"
          width={108}
          height={108}
          className="hidden md:block w-[112px] h-[104px] object-contain rounded-none flex-shrink-0"
          style={{ marginTop: "-24px", marginBottom: "-24px" }}
          priority
        />
        <span className="font-serif italic text-2xl md:text-4xl text-ink leading-none">
          TravalBee
        </span>
      </Link>

      {/* Right side — desktop nav + auth + mobile hamburger */}
      <div className="flex items-center gap-4">

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            aria-label="Home"
            className="text-ink-light hover:text-ink transition-colors"
          >
            <Home size={22} strokeWidth={1.5} />
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
            href="/pricing"
            className="micro-copy text-ink-light hover:text-ink transition-colors"
          >
            PRICING
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
