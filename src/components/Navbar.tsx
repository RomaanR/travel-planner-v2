"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

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
          alt="Seek Wander"
          width={36}
          height={36}
          className="w-9 h-9 object-cover rounded-none"
          priority
        />
        <span className="font-serif italic text-2xl text-ink leading-none">
          Seek Wander
        </span>
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-8">
        <Link
          href="/trips"
          className="micro-copy text-ink-light hover:text-ink transition-colors"
        >
          MY TRIPS
        </Link>
      </div>

      {/* Auth — dynamically loaded to skip SSR (Clerk requires a key during SSR) */}
      <NavbarAuth />
    </motion.nav>
  );
}
