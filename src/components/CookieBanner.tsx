"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CONSENT_KEY = "travalbee_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user has not already made a choice
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-ink text-paper border-t border-paper/10 px-6 md:px-12 py-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 print:hidden">
      <p className="font-sans text-sm text-paper/70 leading-relaxed flex-1">
        We use essential cookies for authentication and local storage to save your itineraries offline.
        We do not use advertising or tracking cookies.{" "}
        <Link href="/privacy" className="text-paper underline underline-offset-2 hover:text-paper/60 transition-colors">
          Privacy Policy
        </Link>
      </p>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={decline}
          className="micro-copy text-paper/50 hover:text-paper transition-colors px-4 py-2.5 border border-paper/20 hover:border-paper/40"
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="micro-copy bg-burnt-orange text-white px-6 py-2.5 hover:bg-burnt-orange/90 transition-colors"
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
