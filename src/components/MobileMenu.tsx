"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Home",             href: "/" },
  { label: "Curate a Journey", href: "/" },
  { label: "Pricing",          href: "/pricing" },
  { label: "My Passport",      href: "/trips" },
  { label: "FAQ",              href: "/faq" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileMenu() {
  const [open,    setOpen]    = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal mount guard — document.body unavailable during SSR
  useEffect(() => { setMounted(true); }, []);

  // Prevent body scroll while overlay is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  function close() { setOpen(false); }

  return (
    <>
      {/* ── Hamburger trigger — mobile only ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="md:hidden p-3 bg-paper border border-ink/20 rounded-full text-ink shadow-md relative z-[60] flex items-center justify-center"
      >
        <Menu size={18} strokeWidth={1.5} />
      </button>

      {/* ── Full-screen overlay — portalled to document.body ──────────────────
          createPortal escapes the Navbar's backdrop-blur-sm stacking context.
          Without this, fixed inset-0 is anchored to the Navbar element (not
          the viewport), so the overlay only covers the navbar bar height.     */}
      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-0 z-[100] bg-paper flex flex-col"
              style={{ backgroundColor: "#F5F0E8" }}
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
                  className="flex items-center justify-center p-3 bg-paper border border-ink/20 rounded-full shadow-md text-ink"
                >
                  <X size={18} strokeWidth={1.5} />
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
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 + i * 0.08 }}
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
                transition={{ delay: 0.35 }}
                className="px-8 py-8 border-t border-ink/5 text-center"
              >
                <p className="micro-copy text-ink-light">Curated Luxury Journeys</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
