"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  ArrowRight,
  Loader2,
  Calendar,
  User,
  Heart,
  Users,
  UserCheck,
  PencilLine,
  Feather,
  Zap,
  Flame,
} from "lucide-react";
import type {
  ItineraryRequest,
  TravelParty,
  Pace,
  BudgetTier,
  DietaryOption,
  Interest,
} from "@/types/itinerary";
import {
  getLocalToday,
  parseDateLocal,
  formatDateLocal,
  computeDuration,
} from "@/lib/dateUtils";

const LIBRARIES: ("places")[] = ["places"];

// ─── Regex ────────────────────────────────────────────────────────────────────

const ADMIN_AREA_RE =
  /^(metropolitan city of|province of|region of|county of|prefecture of|district of|municipality of)\b/i;

const CITY_TYPES = new Set([
  "locality",
  "sublocality",
  "neighborhood",
  "postal_town",
  "sublocality_level_1",
]);

const REGION_TYPES = new Set([
  "administrative_area_level_1",
  "administrative_area_level_2",
  "natural_feature",
  "colloquial_area",
]);

// ─── Option data ──────────────────────────────────────────────────────────────

const PARTY_OPTIONS: { value: TravelParty; label: string; icon: React.ReactNode }[] = [
  { value: "solo",    label: "Solo",   icon: <User      size={13} strokeWidth={1.5} /> },
  { value: "couple",  label: "Couple", icon: <Heart     size={13} strokeWidth={1.5} /> },
  { value: "family",  label: "Family", icon: <Users     size={13} strokeWidth={1.5} /> },
  { value: "group",   label: "Group",  icon: <UserCheck size={13} strokeWidth={1.5} /> },
];

const PACE_OPTIONS: { value: Pace; label: string; sub: string; icon: React.ReactNode }[] = [
  { value: "relaxed",  label: "Relaxed",  sub: "3–4 Activities Per Day", icon: <Feather size={20} strokeWidth={1} /> },
  { value: "moderate", label: "Moderate", sub: "4–5 Activities Per Day", icon: <Zap     size={20} strokeWidth={1} /> },
  { value: "packed",   label: "Packed",   sub: "6–7 Activities Per Day", icon: <Flame   size={20} strokeWidth={1} /> },
];

const BUDGET_OPTIONS: { value: BudgetTier; label: string; symbol: string; sub: string }[] = [
  { value: "premium",       label: "Economic", symbol: "$$",   sub: "Refined & Considered" },
  { value: "luxury",        label: "Premium",  symbol: "$$$",  sub: "Effortlessly Elevated" },
  { value: "ultra-luxury",  label: "Luxury",   symbol: "$$$$", sub: "Without Compromise" },
];

const DIETARY_OPTIONS: { value: DietaryOption; label: string }[] = [
  { value: "none",        label: "No Restrictions" },
  { value: "vegetarian",  label: "Vegetarian" },
  { value: "vegan",       label: "Vegan" },
  { value: "halal",       label: "Halal" },
  { value: "kosher",      label: "Kosher" },
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "dairy-free",  label: "Dairy-Free" },
];

const INTEREST_OPTIONS: { value: Interest; label: string }[] = [
  { value: "sightseeing",           label: "Sightseeing" },
  { value: "museums-art",           label: "Museums & Art" },
  { value: "food-dining",           label: "Food & Dining" },
  { value: "nature-parks",          label: "Nature & Parks" },
  { value: "shopping",              label: "Shopping" },
  { value: "nightlife",             label: "Nightlife" },
  { value: "culture-history",       label: "Culture & History" },
  { value: "adventure-sports",      label: "Adventure & Sports" },
  { value: "relaxation-wellness",   label: "Relaxation & Wellness" },
  { value: "photography",           label: "Photography" },
];

// ─── Pill button ──────────────────────────────────────────────────────────────

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 border micro-copy transition-all duration-200 cursor-pointer ${
        active
          ? "bg-ink text-paper border-ink"
          : "border-ink/15 text-ink-light hover:border-ink/40 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  label,
  children,
  delay = 0,
}: {
  label: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
      className="border-t border-ink/8 pt-7"
    >
      <p className="micro-copy text-ink-light mb-4">{label}</p>
      {children}
    </motion.div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TailorFormProps {
  onGenerate: (data: ItineraryRequest) => Promise<void>;
  loading?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TailorForm({ onGenerate, loading }: TailorFormProps) {
  // ── Refs ────────────────────────────────────────────────────────────────────
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);

  // ── Destination state ────────────────────────────────────────────────────────
  const [inputValue,  setInputValue]  = useState("");
  const [destination, setDestination] = useState("");
  const [placeId,     setPlaceId]     = useState("");
  const [lat,         setLat]         = useState(0);
  const [lng,         setLng]         = useState(0);
  const [isRegion,    setIsRegion]    = useState(false);
  const [stage,       setStage]       = useState<0 | 1>(0);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate,    setReturnDate]    = useState("");
  const [travelParty,   setTravelParty]   = useState<TravelParty | "">("");
  const [pace,          setPace]          = useState<Pace | "">("");
  const [budgetTier,    setBudgetTier]    = useState<BudgetTier | "">("");
  const [dietary,       setDietary]       = useState<DietaryOption[]>([]);
  const [interests,     setInterests]     = useState<Interest[]>([]);
  const [anchorPoints,  setAnchorPoints]  = useState("");
  const [isPremium,     setIsPremium]     = useState(false);

  const localToday = useMemo(getLocalToday, []);

  // ── Google Maps loader ────────────────────────────────────────────────────────
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  // ── Premium status ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => { if (data.isPremium) setIsPremium(true); })
      .catch(() => {});
  }, []);

  // ── Destination autocomplete handler ─────────────────────────────────────────
  function onPlaceChanged() {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place?.geometry?.location || !place?.place_id) return;

    const rawName = place.name || place.formatted_address || inputValue;
    const cleanDestination = ADMIN_AREA_RE.test(rawName)
      ? inputValue.trim() || rawName
      : rawName;

    const placeTypes = place.types ?? [];
    const hasCity   = placeTypes.some((t) => CITY_TYPES.has(t));
    const hasRegion = placeTypes.some((t) => REGION_TYPES.has(t));
    setIsRegion(!hasCity && hasRegion);

    setDestination(cleanDestination);
    setPlaceId(place.place_id);
    setLat(place.geometry.location.lat());
    setLng(place.geometry.location.lng());
    setInputValue(cleanDestination);
    setStage(1);
  }

  // ── Date helpers ─────────────────────────────────────────────────────────────
  const maxDays = isPremium ? 14 : 3;

  const duration = useMemo(
    () => computeDuration(departureDate, returnDate, maxDays),
    [departureDate, returnDate, maxDays]
  );

  const minReturn = departureDate
    ? (() => {
        const d = parseDateLocal(departureDate);
        d.setDate(d.getDate() + 1);
        return formatDateLocal(d);
      })()
    : localToday;

  const maxReturn = departureDate
    ? (() => {
        const d = parseDateLocal(departureDate);
        d.setDate(d.getDate() + (maxDays - 1));
        return formatDateLocal(d);
      })()
    : undefined;

  function handleDepartureChange(val: string) {
    if (!val) { setDepartureDate(""); setReturnDate(""); return; }
    const dep = parseDateLocal(val);
    const newMax = formatDateLocal(new Date(dep.getFullYear(), dep.getMonth(), dep.getDate() + (maxDays - 1)));
    const newMin = formatDateLocal(new Date(dep.getFullYear(), dep.getMonth(), dep.getDate() + 1));
    const clearedReturn = returnDate && (returnDate <= val || returnDate > newMax || returnDate < newMin) ? "" : returnDate;
    setDepartureDate(val);
    setReturnDate(clearedReturn);
  }

  function handleReturnChange(val: string) {
    if (!val) { setReturnDate(""); return; }
    const clamped =
      val < minReturn ? minReturn
      : maxReturn && val > maxReturn ? maxReturn
      : val;
    setReturnDate(clamped);
  }

  // ── Dietary toggle ────────────────────────────────────────────────────────────
  function toggleDietary(opt: DietaryOption) {
    setDietary((prev) => {
      if (opt === "none") return ["none"];
      const filtered = prev.filter((v) => v !== "none");
      return filtered.includes(opt)
        ? filtered.filter((v) => v !== opt)
        : [...filtered, opt];
    });
  }

  // ── Interests toggle ──────────────────────────────────────────────────────────
  function toggleInterest(opt: Interest) {
    setInterests((prev) =>
      prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]
    );
  }

  // ── Textarea auto-expand ─────────────────────────────────────────────────────
  function handleAnchorInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    setAnchorPoints(el.value);
  }

  // ── Validation ───────────────────────────────────────────────────────────────
  const isComplete =
    !!destination &&
    !!placeId &&
    !!departureDate &&
    !!returnDate &&
    returnDate > departureDate &&
    !!travelParty &&
    !!pace &&
    !!budgetTier &&
    anchorPoints.trim().length >= 10;

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!isComplete || loading) return;
    await onGenerate({
      destination,
      placeId,
      lat,
      lng,
      departureDate,
      returnDate,
      duration,
      travelParty:         travelParty as TravelParty,
      pace:                pace as Pace,
      budgetTier:          budgetTier as BudgetTier,
      dietary:             dietary.length > 0 ? dietary : ["none"],
      interests,
      accommodationStatus: "booked",
      transportMode:       "walking-transit",
      walkingTolerance:    "relaxed",
      isRegion,
      planningMode:        "tailor",
      anchorPoints:        anchorPoints.trim(),
    });
  }

  // ── Character counter colour ──────────────────────────────────────────────────
  const counterClass =
    anchorPoints.length > 1800 ? "text-burnt-orange" : "text-ink-light";

  // ─────────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* ── Stage 0 — Destination input ────────────────────────────────── */}
      <div className="mb-0">
        <p className="micro-copy text-ink-light mb-4">Where are you headed?</p>

        <div className="relative flex items-center border border-ink/15 bg-paper/95 focus-within:border-ink/40 transition-colors duration-200">
          <MapPin
            size={14}
            strokeWidth={1.5}
            className="absolute left-3 text-ink-light pointer-events-none shrink-0 z-10"
          />

          <div className="flex-1 min-w-0">
            {isLoaded ? (
              <Autocomplete
                onLoad={(ref) => { autocompleteRef.current = ref; }}
                onPlaceChanged={onPlaceChanged}
                options={{ types: ["(regions)"] }}
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setIsRegion(false); }}
                  onFocus={(e) =>
                    e.currentTarget.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  placeholder="City, region, or country…"
                  className="w-full pl-9 pr-4 py-3 bg-transparent font-sans text-sm text-ink placeholder:text-ink-light outline-none scroll-mt-32"
                />
              </Autocomplete>
            ) : (
              <input
                type="text"
                disabled
                placeholder="Loading…"
                className="w-full pl-9 pr-4 py-3 bg-transparent font-sans text-sm text-ink-light outline-none opacity-50"
              />
            )}
          </div>

          {/* Confirmed badge */}
          <AnimatePresence>
            {stage === 1 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25 }}
                className="absolute right-3 micro-copy text-emerald-accent shrink-0"
              >
                ✓
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Region warning */}
        <AnimatePresence>
          {isRegion && stage === 1 && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.35 }}
              className="micro-copy text-burnt-orange mt-2"
            >
              Region detected &mdash; itinerary will anchor each day in a distinct town.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Stage 1 — Preference panel ─────────────────────────────────── */}
      <AnimatePresence>
        {stage === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-8 flex flex-col gap-7"
          >

            {/* ── Dates ──────────────────────────────────────────────────── */}
            <Section label="When are you travelling?" delay={0.05}>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="micro-copy text-ink-light flex items-center gap-1.5">
                    <Calendar size={11} strokeWidth={1.5} />
                    Departure
                  </label>
                  <input
                    type="date"
                    value={departureDate}
                    min={localToday}
                    onChange={(e) => handleDepartureChange(e.target.value)}
                    onFocus={(e) =>
                      e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" })
                    }
                    className="border border-ink/15 bg-paper/95 px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-ink/40 transition-colors duration-200 cursor-pointer [color-scheme:light]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="micro-copy text-ink-light flex items-center gap-1.5">
                    <Calendar size={11} strokeWidth={1.5} />
                    Return
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    min={minReturn}
                    max={maxReturn}
                    disabled={!departureDate}
                    onChange={(e) => handleReturnChange(e.target.value)}
                    onFocus={(e) =>
                      e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" })
                    }
                    className="border border-ink/15 bg-paper/95 px-3 py-2.5 font-sans text-sm text-ink outline-none focus:border-ink/40 transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [color-scheme:light]"
                  />
                </div>
              </div>

              <AnimatePresence>
                {departureDate && returnDate && returnDate > departureDate && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="micro-copy text-ink-light mt-3"
                  >
                    {duration} {duration === 1 ? "day" : "days"} &middot; {isPremium ? "Up to 14 days" : "Up to 3 days on free plan"}
                  </motion.p>
                )}
              </AnimatePresence>
            </Section>

            {/* ── Anchor Points ───────────────────────────────────────────── */}
            <Section label="Your anchor points" delay={0.1}>
              <p className="font-sans text-xs text-ink-light mb-3 leading-relaxed">
                Describe any fixed plans, must-see places, booked restaurants, or
                specific requirements. We will lock these in and fill every gap with
                luxury curation.
              </p>

              <div className="relative border border-ink/15 bg-paper/95 focus-within:border-ink/40 transition-colors duration-200">
                <PencilLine
                  size={13}
                  strokeWidth={1.5}
                  className="absolute top-3 left-3 text-ink-light pointer-events-none"
                />
                <textarea
                  ref={textareaRef}
                  value={anchorPoints}
                  onInput={handleAnchorInput}
                  onChange={(e) => setAnchorPoints(e.target.value)}
                  maxLength={2000}
                  rows={6}
                  placeholder="Going to Rome, staying at Hotel Eden, must visit the Colosseum on Day 2, dinner at a steakhouse on Day 1…"
                  className="w-full pl-9 pr-4 pt-3 pb-3 bg-transparent font-sans text-sm text-ink placeholder:text-ink-light outline-none resize-none leading-relaxed"
                  style={{ minHeight: "144px" }}
                />
              </div>

              <div className="flex justify-end mt-1.5">
                <span className={`micro-copy ${counterClass} transition-colors duration-200`}>
                  {anchorPoints.length}/2000
                </span>
              </div>
            </Section>

            {/* ── Travel Party ────────────────────────────────────────────── */}
            <Section label="Who is travelling?" delay={0.15}>
              <div className="flex flex-wrap gap-2">
                {PARTY_OPTIONS.map((opt) => (
                  <PillButton
                    key={opt.value}
                    active={travelParty === opt.value}
                    onClick={() => setTravelParty(opt.value)}
                  >
                    {opt.icon}
                    {opt.label}
                  </PillButton>
                ))}
              </div>
            </Section>

            {/* ── Travel Pace ─────────────────────────────────────────────── */}
            <Section label="Travel Pace" delay={0.18}>
              <div className="grid grid-cols-3 gap-2">
                {PACE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPace(opt.value)}
                    className={`flex flex-col gap-2 p-3 md:p-4 border text-left transition-all duration-200 cursor-pointer ${
                      pace === opt.value
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/10 text-ink hover:border-ink/30"
                    }`}
                  >
                    <span className={pace === opt.value ? "text-paper" : "text-ink-light"}>
                      {opt.icon}
                    </span>
                    <span className="text-[10px] md:text-xs tracking-wider md:tracking-widest uppercase font-bold leading-tight">
                      {opt.label}
                    </span>
                    <span className={`font-sans text-[10px] md:text-xs leading-tight ${pace === opt.value ? "text-paper/70" : "text-ink-light"}`}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            {/* ── Budget Tier ─────────────────────────────────────────────── */}
            <Section label="What is your budget?" delay={0.2}>
              <div className="grid grid-cols-3 gap-px bg-ink/5">
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBudgetTier(opt.value)}
                    className={`flex flex-col items-start p-4 transition-colors duration-200 cursor-pointer ${
                      budgetTier === opt.value
                        ? "bg-ink text-paper"
                        : "bg-paper hover:bg-paper-dark text-ink"
                    }`}
                  >
                    <span className={`font-serif italic text-xl mb-1 ${budgetTier === opt.value ? "text-paper" : "text-ink"}`}>
                      {opt.symbol}
                    </span>
                    <span className="micro-copy mb-0.5">{opt.label}</span>
                    <span className={`font-sans text-xs ${budgetTier === opt.value ? "text-paper/70" : "text-ink-light"}`}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            {/* ── Dietary Needs ───────────────────────────────────────────── */}
            <Section label="Dietary Needs" delay={0.23}>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((opt) => (
                  <PillButton
                    key={opt.value}
                    active={dietary.includes(opt.value)}
                    onClick={() => toggleDietary(opt.value)}
                  >
                    {opt.label}
                  </PillButton>
                ))}
              </div>
            </Section>

            {/* ── Interests ───────────────────────────────────────────────── */}
            <Section label="Interests" delay={0.26}>
              <p className="font-sans text-xs text-ink-light mb-4">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleInterest(opt.value)}
                    className={`px-4 py-2 border micro-copy transition-all duration-200 cursor-pointer ${
                      interests.includes(opt.value)
                        ? "bg-burnt-orange text-white border-burnt-orange"
                        : "border-ink/15 text-ink-light hover:border-burnt-orange/40 hover:text-ink"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Section>

            {/* ── CTA ─────────────────────────────────────────────────────── */}
            <AnimatePresence>
              {isComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="pt-2"
                >
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!!loading}
                    className="w-full flex items-center justify-between px-6 py-4 bg-ink text-paper micro-copy hover:bg-burnt-orange transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>
                      {loading ? "Curating your itinerary…" : "Lock In & Curate My Trip"}
                    </span>
                    {loading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ArrowRight size={15} strokeWidth={1.5} />
                    )}
                  </button>

                  <p className="micro-copy text-ink-light mt-3 text-center">
                    {duration} {duration === 1 ? "day" : "days"}
                    &nbsp;&middot;&nbsp;{travelParty}
                    &nbsp;&middot;&nbsp;{pace}
                    &nbsp;&middot;&nbsp;{BUDGET_OPTIONS.find((b) => b.value === budgetTier)?.label ?? budgetTier}
                    {interests.length > 0 && <>&nbsp;&middot;&nbsp;{interests.length} interest{interests.length !== 1 ? "s" : ""}</>}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
