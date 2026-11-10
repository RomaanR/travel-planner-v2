"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGES, isLanguageCode, type LanguageCode } from "@/lib/languages";

const STORAGE_KEY = "travalbee_itinerary_language";

/** The chosen itinerary language, remembered for next time on this device (best effort). */
export function useItineraryLanguage(): [LanguageCode, (code: LanguageCode) => void] {
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isLanguageCode(stored)) setLanguage(stored);
    } catch { /* storage unavailable: stay on English */ }
  }, []);

  const choose = (code: LanguageCode) => {
    setLanguage(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* best effort */ }
  };

  return [language, choose];
}

/**
 * Picks the language the itinerary is written in. Each option is shown in its own script so people can
 * find their language without reading English. The rest of the site stays in English.
 */
export default function LanguagePicker({
  value,
  onChange,
}: {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Itinerary language" className="flex flex-wrap gap-2">
      {LANGUAGES.map((l) => {
        const active = value === l.code;
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={active}
            lang={l.code}
            dir={l.rtl ? "rtl" : "ltr"}
            onClick={() => onChange(l.code)}
            className={`px-4 py-2 border font-sans text-sm tracking-normal transition-all duration-200 cursor-pointer ${
              active
                ? "bg-ink text-paper border-ink"
                : "border-ink/15 text-ink-light hover:border-ink/40 hover:text-ink"
            }`}
          >
            {l.native}
          </button>
        );
      })}
    </div>
  );
}
