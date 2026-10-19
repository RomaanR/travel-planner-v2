"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Shared with the earlier Accept/Decline banner, so visitors who already
// answered it don't see this notice again.
const CONSENT_KEY = "travalbee_cookie_consent";

/**
 * Informational notice. The site only uses strictly necessary storage
 * (sign-in session, saved itineraries, offline archive) — nothing to opt out of,
 * so there is no "Decline". Kept compact so it never covers the main actions:
 * a small card bottom-right on desktop, a slim bar on phones.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      // Storage blocked (private mode) — skip the notice rather than show it on every page.
    }
  }, []);

  function dismiss() {
    try { localStorage.setItem(CONSENT_KEY, "acknowledged"); } catch { /* best effort */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed z-50 bottom-0 inset-x-0 md:inset-x-auto md:bottom-6 md:right-6 bg-ink text-paper/75
                 flex items-center justify-between gap-4 pl-4 pr-3 py-2.5 md:pl-5 md:py-3 print:hidden"
    >
      <p className="font-sans text-xs md:text-[13px] leading-snug">
        We use essential cookies only.{" "}
        <Link href="/privacy" className="text-paper underline underline-offset-2 hover:text-paper/70 transition-colors">
          Privacy
        </Link>
      </p>
      <button
        onClick={dismiss}
        className="micro-copy text-[10px] bg-burnt-orange text-white px-4 py-2 hover:bg-burnt-orange/90 transition-colors shrink-0"
      >
        OK
      </button>
    </div>
  );
}
