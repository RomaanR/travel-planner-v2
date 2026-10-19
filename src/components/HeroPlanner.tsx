"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useJsApiLoader } from "@react-google-maps/api";
import { track } from "@vercel/analytics";
import { ArrowRight } from "lucide-react";
import { AUTOCOMPLETE_FIELDS, readSelectedDestination, type SelectedDestination } from "@/lib/placeSelection";
import { plannerHref } from "@/lib/plannerLink";
import { formatDateLocal, getLocalToday, parseDateLocal } from "@/lib/dateUtils";

// Same loader options as the planner form — @react-google-maps/api allows one
// set of options per page load.
const LIBRARIES: ("places")[] = ["places"];
// The hero offers the free-tier length; Premium members can extend on the planner.
const MAX_DAYS = 3;
// Load Google's script after first paint (or sooner on first interaction).
const IDLE_LOAD_MS = 3000;

function addDays(date: string, days: number): string {
  const d = parseDateLocal(date);
  d.setDate(d.getDate() + days);
  return formatDateLocal(d);
}

const DISPLAY_DATE = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

/**
 * A date input that reads as "Mon 9 Nov". The native input sits invisibly on top,
 * so a tap still opens the browser's own picker (iOS, Android, desktop).
 */
function DateField({ label, value, placeholder, min, max, disabled, onChange }: {
  label: string; value: string; placeholder: string;
  min?: string; max?: string; disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <span className="relative min-w-0 flex-1">
      <span
        aria-hidden
        className={`block truncate font-sans text-[15px] md:text-base ${
          value ? "text-ink" : disabled ? "text-ink-light/40" : "text-ink-light/60"
        }`}
      >
        {value ? DISPLAY_DATE.format(parseDateLocal(value)) : placeholder}
      </span>
      <input
        type="date"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* older browsers: native behaviour */ } }}
        className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </span>
  );
}

function MapsLoader({ onLoaded }: { onLoaded: () => void }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });
  useEffect(() => { if (isLoaded) onLoaded(); }, [isLoaded, onLoaded]);
  return null;
}

/** Home-page quick planner: destination + dates → the planner, already filled in. */
export default function HeroPlanner() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const today    = useMemo(getLocalToday, []);

  const [wantMaps, setWantMaps]   = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [typed, setTyped]         = useState("");
  const [selected, setSelected]   = useState<SelectedDestination | null>(null);
  const [from, setFrom]           = useState("");
  const [to, setTo]               = useState("");
  const [hint, setHint]           = useState<string | null>(null);

  const onMapsLoaded = useCallback(() => setMapsReady(true), []);

  useEffect(() => {
    const id = window.setTimeout(() => setWantMaps(true), IDLE_LOAD_MS);
    return () => window.clearTimeout(id);
  }, []);

  // Attach Google's autocomplete to the existing input (no remount, so focus and
  // anything already typed are kept).
  useEffect(() => {
    if (!mapsReady || !inputRef.current) return;
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types:  ["(regions)"],
      fields: AUTOCOMPLETE_FIELDS,
    });
    const listener = autocomplete.addListener("place_changed", () => {
      const choice = readSelectedDestination(autocomplete.getPlace(), inputRef.current?.value ?? "");
      if (!choice) return;
      setSelected(choice);
      setTyped(choice.destination);
      setHint(null);
    });
    return () => listener.remove();
  }, [mapsReady]);

  const minTo = from ? addDays(from, 1) : addDays(today, 1);
  const maxTo = from ? addDays(from, MAX_DAYS - 1) : undefined;
  const days  = from && to
    ? Math.round((parseDateLocal(to).getTime() - parseDateLocal(from).getTime()) / 86_400_000) + 1
    : 0;

  function onFromChange(value: string) {
    const next = value && value < today ? today : value;
    setFrom(next);
    // Keep the return date inside the new window (iOS ignores min/max attributes).
    if (!next || (to && (to <= next || to > addDays(next, MAX_DAYS - 1)))) setTo("");
    else if (!to) setTo(addDays(next, MAX_DAYS - 1));
  }

  function onToChange(value: string) {
    if (!value) { setTo(""); return; }
    setTo(value < minTo ? minTo : maxTo && value > maxTo ? maxTo : value);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) {
      setHint(typed.trim() ? "Choose your destination from the list." : "Where would you like to go?");
      setWantMaps(true);
      inputRef.current?.focus();
      return;
    }
    const withDates = Boolean(from && to);
    track("hero_planner_submitted", { withDates });
    router.push(plannerHref({
      destination: selected.destination,
      place: { placeId: selected.placeId, lat: selected.lat, lng: selected.lng, isRegion: selected.isRegion },
      ...(withDates ? { departureDate: from, returnDate: to } : {}),
    }));
  }

  return (
    <div className="w-full max-w-4xl">
      {wantMaps && <MapsLoader onLoaded={onMapsLoaded} />}

      <form
        onSubmit={submit}
        onPointerEnter={() => setWantMaps(true)}
        onFocus={() => setWantMaps(true)}
        className="flex flex-col md:flex-row bg-paper border border-ink/10 shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
      >
        {/* Where to? */}
        <label className="flex-[1.25] min-w-0 px-4 md:px-5 py-3 md:py-4 border-b md:border-b-0 md:border-r border-ink/10 cursor-text">
          <span className="block micro-copy text-[10px] text-ink-light mb-1.5">Where to?</span>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              if (selected && e.target.value !== selected.destination) setSelected(null);
              setHint(null);
            }}
            placeholder="A city or region"
            autoComplete="off"
            aria-describedby={hint ? "hero-planner-hint" : undefined}
            className="w-full bg-transparent font-sans text-[15px] md:text-base text-ink placeholder:text-ink-light/60 outline-none"
          />
        </label>

        {/* When? */}
        <div className="flex-1 min-w-0 px-4 md:px-5 py-3 md:py-4 border-b md:border-b-0 md:border-r border-ink/10">
          <span className="flex items-center justify-between micro-copy text-[10px] text-ink-light mb-1.5">
            When?
            {days > 0 && (
              <span className="micro-copy text-[9px] text-burnt-orange border border-burnt-orange/35 px-1.5 py-0.5">
                {days} {days === 1 ? "day" : "days"}
              </span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <DateField
              label="Departure date"
              value={from}
              placeholder="Add dates"
              min={today}
              onChange={onFromChange}
            />
            <span className="text-burnt-orange shrink-0" aria-hidden>&rarr;</span>
            <DateField
              label="Return date"
              value={to}
              placeholder="Return"
              min={minTo}
              max={maxTo}
              disabled={!from}
              onChange={onToChange}
            />
          </div>
        </div>

        <button
          type="submit"
          className="micro-copy inline-flex items-center justify-center gap-3 bg-burnt-orange text-white px-8 py-4 md:py-0 hover:bg-ink transition-colors duration-300 shrink-0"
        >
          Plan my trip <ArrowRight size={13} strokeWidth={1.5} />
        </button>
      </form>

      {hint && (
        <p id="hero-planner-hint" role="status" className="mt-2 font-sans text-xs text-white/90">
          {hint}
        </p>
      )}
    </div>
  );
}
