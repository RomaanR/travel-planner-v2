"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Home",             href: "/" },
  { label: "Curate a Journey", href: "/" },
  { label: "My Passport",      href: "/trips" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  // Prevent body scroll while overlay is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function close() { setOpen(false); }

  return (
    <>
      {/* ── Hamburger trigger — mobile only ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="md:hidden flex items-center justify-center w-9 h-9 text-ink"
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      {/* ── Full-screen overlay ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-[60] bg-paper flex flex-col md:hidden"
          >
            {/* Header — mirrors Navbar layout */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-ink/5">
              <Link href="/" onClick={close} className="flex items-center gap-3">
                <Image
                  src="/icon-192x192.png"
                  alt="Seek Wander"
                  width={36}
                  height={36}
                  className="w-9 h-9 object-cover"
                  priority
                />
                <span className="font-serif italic text-2xl text-ink leading-none">
                  Seek Wander
                </span>
              </Link>

              <button
                onClick={close}
                aria-label="Close navigation"
                className="flex items-center justify-center w-9 h-9 text-ink"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Nav links — staggered slide-up */}
            <div className="flex flex-col items-center justify-center flex-1 px-8">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={`${link.label}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 + i * 0.08 }}
                >
                  <Link
                    href={link.href}
                    onClick={close}
                    className="block font-serif italic text-4xl text-ink hover:text-ink-light
                               transition-colors duration-200 text-center mb-8"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Footer accent */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38 }}
              className="px-8 py-8 border-t border-ink/5 text-center"
            >
              <p className="micro-copy text-ink-light">Curated Luxury Journeys</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
