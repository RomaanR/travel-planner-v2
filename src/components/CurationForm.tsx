"use client";

import { useRef, useState, useMemo } from "react";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Feather,
  Zap,
  Flame,
  Users,
  User,
  Heart,
  UserCheck,
  ArrowRight,
  Loader2,
  Calendar,
} from "lucide-react";
import type {
  ItineraryRequest,
  TravelParty,
  Pace,
  BudgetTier,
  DietaryOption,
  Interest,
} from "@/types/itinerary";

const LIBRARIES: ("places")[] = ["places"];

// ─── Timezone-safe today string ───────────────────────────────────────────────

function getLocalToday(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function computeDuration(departure: string, returnDate: string): number {
  if (!departure || !returnDate) return 1;
  const diff = Math.ceil(
    (new Date(returnDate).getTime() - new Date(departure).getTime()) / 86400000
  );
  return Math.min(5, Math.max(1, diff));
}

// ─── Option data ──────────────────────────────────────────────────────────────

const PARTY_OPTIONS: { value: TravelParty; label: string; icon: React.ReactNode }[] = [
  { value: "solo",   label: "Solo",   icon: <User size={13} strokeWidth={1.5} /> },
  { value: "couple", label: "Couple", icon: <Heart size={13} strokeWidth={1.5} /> },
  { value: "family", label: "Family", icon: <Users size={13} strokeWidth={1.5} /> },
  { value: "group",  label: "Group",  icon: <UserCheck size={13} strokeWidth={1.5} /> },
];

const PACE_OPTIONS: { value: Pace; label: string; sub: string; icon: React.ReactNode }[] = [
  { value: "relaxed",  label: "Relaxed",  sub: "3–4 Activities Per Day", icon: <Feather size={20} strokeWidth={1} /> },
  { value: "moderate", label: "Moderate", sub: "4–5 Activities Per Day", icon: <Zap size={20} strokeWidth={1} /> },
  { value: "packed",   label: "Packed",   sub: "6–7 Activities Per Day", icon: <Flame size={20} strokeWidth={1} /> },
];

const BUDGET_OPTIONS: { value: BudgetTier; label: string; symbol: string; sub: string }[] = [
  { value: "premium",      label: "Premium",      symbol: "$$",   sub: "Refined & Considered" },
  { value: "luxury",       label: "Luxury",       symbol: "$$$",  sub: "Effortlessly Elevated" },
  { value: "ultra-luxury", label: "Ultra-Luxury", symbol: "$$$$", sub: "Without Compromise" },
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
  { value: "sightseeing",         label: "Sightseeing" },
  { value: "museums-art",         label: "Museums & Art" },
  { value: "food-dining",         label: "Food & Dining" },
  { value: "nature-parks",        label: "Nature & Parks" },
  { value: "shopping",            label: "Shopping" },
  { value: "nightlife",           label: "Nightlife" },
  { value: "culture-history",     label: "Culture & History" },
  { value: "adventure-sports",    label: "Adventure & Sports" },
  { value: "relaxation-wellness", label: "Relaxation & Wellness" },
  { value: "photography",         label: "Photography" },
];

// ─── Pill button ─────────────────────────────────────────────────────────────

function PillButton({
  active,
  accent = false,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  accent?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-4 py-2 border micro-copy transition-all duration-200
        ${active
          ? accent
            ? "bg-burnt-orange text-white border-burnt-orange"
            : "bg-ink text-paper border-ink"
          : disabled
            ? "border-ink/8 text-ink/25 cursor-not-allowed"
            : "border-ink/15 text-ink-light hover:border-ink/40 hover:text-ink"
        }`}
    >
      {children}
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CurationFormProps {
  onGenerate: (data: ItineraryRequest) => Promise<void>;
  loading?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CurationForm({ onGenerate, loading }: CurationFormProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [stage, setStage] = useState<0 | 1>(0);
  const localToday = useMemo(getLocalToday, []);

  const [form, setForm] = useState<Partial<ItineraryRequest>>({
    departureDate: "",
    returnDate: "",
    dietary: [],
    interests: [],
  });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  // ── Destination ──────────────────────────────────────────────────────────────
  function onPlaceChanged() {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry?.location || !place.place_id) return;

    const update = {
      destination: place.formatted_address || place.name || inputValue,
      placeId: place.place_id,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };
    setInputValue(update.destination);
    setForm((f) => ({ ...f, ...update }));
    setStage(1);
  }

  // ── Dates ────────────────────────────────────────────────────────────────────
  function handleDepartureChange(val: string) {
    setForm((f) => {
      const returnDate = f.returnDate && new Date(f.returnDate) <= new Date(val) ? "" : f.returnDate;
      return { ...f, departureDate: val, returnDate };
    });
  }

  function handleReturnChange(val: string) {
    setForm((f) => ({ ...f, returnDate: val }));
  }

  const duration = useMemo(
    () => computeDuration(form.departureDate ?? "", form.returnDate ?? ""),
    [form.departureDate, form.returnDate]
  );

  const minReturn = form.departureDate
    ? (() => {
        const d = new Date(form.departureDate);
        d.setDate(d.getDate() + 1);
        return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
      })()
    : localToday;

  // ── Dietary multi-select ──────────────────────────────────────────────────────
  function toggleDietary(opt: DietaryOption) {
    setForm((f) => {
      const current = f.dietary ?? [];
      if (opt === "none") return { ...f, dietary: ["none"] };
      const filtered = current.filter((d) => d !== "none");
      return {
        ...f,
        dietary: filtered.includes(opt)
          ? filtered.filter((d) => d !== opt)
          : [...filtered, opt],
      };
    });
  }

  // ── Interests multi-select ────────────────────────────────────────────────────
  function toggleInterest(opt: Interest) {
    setForm((f) => {
      const current = f.interests ?? [];
      return {
        ...f,
        interests: current.includes(opt)
          ? current.filter((v) => v !== opt)
          : [...current, opt],
      };
    });
  }

  // ── Validation ────────────────────────────────────────────────────────────────
  const isComplete = !!(
    form.destination &&
    form.departureDate &&
    form.returnDate &&
    form.returnDate > form.departureDate &&
    form.travelParty &&
    form.pace &&
    form.budgetTier &&
    form.interests?.length
  );

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!isComplete || loading) return;
    await onGenerate({ ...(form as ItineraryRequest), duration });
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Stage 0: Destination autocomplete */}
      <div className="flex items-stretch border border-ink/15 bg-paper/95 backdrop-blur-sm">
        <div className="flex items-center px-4 text-ink-light shrink-0">
          <MapPin size={18} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          {isLoaded ? (
            <Autocomplete
              onLoad={(ref) => (autocompleteRef.current = ref)}
              onPlaceChanged={onPlaceChanged}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Where do you wish to disappear?"
                className="w-full py-5 pr-4 bg-transparent text-ink placeholder:text-ink-light font-sans text-base outline-none"
              />
            </Autocomplete>
          ) : (
            <input
              disabled
              placeholder="Loading…"
              className="w-full py-5 pr-4 bg-transparent text-ink-light font-sans text-base outline-none cursor-not-allowed"
            />
          )}
        </div>
        {stage === 1 && (
          <div className="flex items-center pr-4">
            <span className="micro-copy text-emerald-accent text-xs">✓</span>
          </div>
        )}
      </div>

      {/* Stage 1: Preference panel */}
      <AnimatePresence>
        {stage === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-px border border-ink/10 border-t-0 bg-paper/95 backdrop-blur-sm p-6 md:p-8"
          >

            {/* ── Row 1: Travel Dates ── */}
            <div className="mb-8">
              <p className="micro-copy text-ink-light mb-4">Travel Dates</p>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="font-sans text-xs text-ink-light block mb-1.5">
                    Departure
                  </label>
                  <div className="flex items-center gap-2 border-b border-ink/20 pb-2">
                    <Calendar size={13} strokeWidth={1.5} className="text-ink-light shrink-0" />
                    <input
                      type="date"
                      min={localToday}
                      value={form.departureDate ?? ""}
                      onChange={(e) => handleDepartureChange(e.target.value)}
                      className="flex-1 bg-transparent font-sans text-sm text-ink outline-none [color-scheme:light] cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-sans text-xs text-ink-light block mb-1.5">
                    Return
                  </label>
                  <div className="flex items-center gap-2 border-b border-ink/20 pb-2">
                    <Calendar size={13} strokeWidth={1.5} className="text-ink-light shrink-0" />
                    <input
                      type="date"
                      min={minReturn}
                      value={form.returnDate ?? ""}
                      onChange={(e) => handleReturnChange(e.target.value)}
                      disabled={!form.departureDate}
                      className="flex-1 bg-transparent font-sans text-sm text-ink outline-none [color-scheme:light] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
              {/* Duration badge */}
              {form.departureDate && form.returnDate && form.returnDate > form.departureDate && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 font-serif italic text-2xl text-ink"
                >
                  {duration} day{duration !== 1 ? "s" : ""}
                  {duration === 5 && (
                    <span className="font-sans text-xs text-ink-light not-italic ml-2">
                      (5-day max)
                    </span>
                  )}
                </motion.p>
              )}
            </div>

            {/* ── Row 2: Travel Party ── */}
            <div className="mb-8">
              <p className="micro-copy text-ink-light mb-4">Travel Party</p>
              <div className="flex flex-wrap gap-2">
                {PARTY_OPTIONS.map((opt) => (
                  <PillButton
                    key={opt.value}
                    active={form.travelParty === opt.value}
                    onClick={() => setForm((f) => ({ ...f, travelParty: opt.value }))}
                  >
                    {opt.icon}
                    {opt.label}
                  </PillButton>
                ))}
              </div>
            </div>

            {/* ── Row 3: Pace ── */}
            <div className="mb-8">
              <p className="micro-copy text-ink-light mb-4">Travel Pace</p>
              <div className="grid grid-cols-3 gap-2">
                {PACE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, pace: opt.value }))}
                    className={`flex flex-col gap-3 p-4 border text-left transition-all duration-200
                      ${form.pace === opt.value
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/10 text-ink hover:border-ink/30"
                      }`}
                  >
                    <span className={form.pace === opt.value ? "text-paper" : "text-ink-light"}>
                      {opt.icon}
                    </span>
                    <span className="micro-copy leading-none">{opt.label}</span>
                    <span className={`font-sans text-xs leading-tight ${form.pace === opt.value ? "text-paper/70" : "text-ink-light"}`}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Row 4: Budget Tier ── */}
            <div className="mb-8">
              <p className="micro-copy text-ink-light mb-4">Budget Tier</p>
              <div className="grid grid-cols-3 gap-2">
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, budgetTier: opt.value }))}
                    className={`flex flex-col gap-2 p-4 border text-left transition-all duration-200
                      ${form.budgetTier === opt.value
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/10 text-ink hover:border-ink/30"
                      }`}
                  >
                    <span className={`font-serif italic text-3xl leading-none ${form.budgetTier === opt.value ? "text-paper" : "text-ink"}`}>
                      {opt.symbol}
                    </span>
                    <span className="micro-copy leading-none">{opt.label}</span>
                    <span className={`font-sans text-xs ${form.budgetTier === opt.value ? "text-paper/70" : "text-ink-light"}`}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Row 5: Dietary ── */}
            <div className="mb-8">
              <p className="micro-copy text-ink-light mb-4">Dietary Needs</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((opt) => (
                  <PillButton
                    key={opt.value}
                    active={(form.dietary ?? []).includes(opt.value)}
                    onClick={() => toggleDietary(opt.value)}
                  >
                    {opt.label}
                  </PillButton>
                ))}
              </div>
            </div>

            {/* ── Row 6: Interests ── */}
            <div className="mb-8">
              <p className="micro-copy text-ink-light mb-1">Interests</p>
              <p className="font-sans text-xs text-ink-light mb-4">
                Select all that apply
              </p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleInterest(opt.value)}
                    className={`px-4 py-2 border micro-copy transition-all duration-200
                      ${(form.interests ?? []).includes(opt.value)
                        ? "bg-burnt-orange text-white border-burnt-orange"
                        : "border-ink/15 text-ink-light hover:border-burnt-orange/40 hover:text-ink"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── CTA ── */}
            <AnimatePresence>
              {isComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-5 bg-burnt-orange text-white micro-copy hover:bg-ink transition-colors duration-300 disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ArrowRight size={16} strokeWidth={2} />
                    )}
                    {loading ? "Curating Your Journey…" : "Curate My Bespoke Itinerary"}
                  </button>
                  <p className="mt-3 text-center micro-copy text-ink-light">
                    {duration} day{duration !== 1 ? "s" : ""} ·{" "}
                    {form.travelParty} · {form.pace} · {form.budgetTier}
                    {form.interests && form.interests.length > 0 && (
                      <> · {form.interests.length} interest{form.interests.length !== 1 ? "s" : ""}</>
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!isComplete && (
              <p className="micro-copy text-ink/30 text-center">
                Complete all fields above to generate your itinerary
              </p>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
