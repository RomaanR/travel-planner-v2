"use client";

import { useRef, useState, useMemo, useEffect } from "react";
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
  Building2,
  TrainFront,
  Car,
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
  { value: "premium",      label: "Economic",  symbol: "$$",   sub: "Refined & Considered" },
  { value: "luxury",       label: "Premium",   symbol: "$$$",  sub: "Effortlessly Elevated" },
  { value: "ultra-luxury", label: "Luxury",    symbol: "$$$$", sub: "Without Compromise" },
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
      className={`flex items-center gap-1.5 px-4 py-2 border micro-copy transition-all duration-200 cursor-pointer
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
  credits?: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CurationForm({ onGenerate, loading, credits }: CurationFormProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const hotelAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const departureDateRef = useRef<HTMLInputElement>(null);
  const returnDateRef    = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [showCreditsHint, setShowCreditsHint] = useState(false);
  const [stage, setStage] = useState<0 | 1>(0);
  const [accommodationStatus, setAccommodationStatus] = useState<"needed" | "booked">("needed");
  const [hotelName, setHotelName] = useState("");
  const [hotelInputValue, setHotelInputValue] = useState("");
  const [exactHotelAddress, setExactHotelAddress] = useState("");
  const [transportMode, setTransportMode] = useState<"walking-transit" | "car-driver">("walking-transit");
  const [walkingTolerance, setWalkingTolerance] = useState<"strict" | "relaxed">("strict");
  const [isRegion, setIsRegion] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const localToday = useMemo(getLocalToday, []);

  // Fetch premium status on mount to unlock 14-day calendar for subscribers
  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => { if (data.isPremium) setIsPremium(true); })
      .catch(() => {});
  }, []);

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

  // ── Pre-fill from ?destination= query param ───────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dest = params.get("destination");
    if (dest) setInputValue(dest);
  }, []);

  // ── Credits hint — show once per session, dismiss on search focus ──────────
  useEffect(() => {
    // Only show the hint when the user actually has credits — suppress it when
    // the no-credits banner above the form is already handling that case.
    if (typeof credits === "number" && credits <= 0) return;
    const key = "travalbee_credits_hint_shown";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const t = setTimeout(() => setShowCreditsHint(true), 600);
    return () => clearTimeout(t);
  }, [credits]);

  // ── Destination ──────────────────────────────────────────────────────────────
  function onPlaceChanged() {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place?.geometry?.location || !place?.place_id) return;

    // Use place.name ("Istanbul") not formatted_address ("Istanbul, İstanbul, Türkiye").
    // Guard against Google returning administrative area names like
    // "Metropolitan City of Rome Capital" or "Province of Barcelona" — these break
    // the AI's spatial reasoning and trip naming. Fall back to the user's typed input
    // (e.g. "Rome") which is always a clean city-level string.
    const ADMIN_AREA_RE = /^(metropolitan city of|province of|region of|county of|prefecture of|district of|municipality of)\b/i;
    const rawName = place.name || place.formatted_address || inputValue;
    const cleanDestination = ADMIN_AREA_RE.test(rawName) ? (inputValue.trim() || rawName) : rawName;

    // Detect whether the selected place is a broad region (e.g. "Kansai", "Tuscany")
    // rather than a specific city. City types short-circuit to false; admin/natural
    // area types (without a co-present locality) flag as region. "country" excluded —
    // whole-country selections are too broad for region-mode to be useful.
    const placeTypes = place.types ?? [];
    const CITY_TYPES   = new Set(["locality", "sublocality", "neighborhood", "postal_town", "sublocality_level_1"]);
    const REGION_TYPES = new Set(["administrative_area_level_1", "administrative_area_level_2", "natural_feature", "colloquial_area"]);
    const hasCity      = placeTypes.some((t) => CITY_TYPES.has(t));
    const hasRegion    = placeTypes.some((t) => REGION_TYPES.has(t));
    setIsRegion(!hasCity && hasRegion);

    const update = {
      destination: cleanDestination,
      placeId: place.place_id,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };
    setInputValue(update.destination);
    setForm((f) => ({ ...f, ...update }));
    setStage(1);
  }

  // ── Hotel autocomplete ────────────────────────────────────────────────────────
  function onHotelPlaceChanged() {
    if (!hotelAutocompleteRef.current) return;
    const place = hotelAutocompleteRef.current.getPlace();
    if (!place.geometry?.location) return;
    const name    = place.name ?? "";
    const address = place.formatted_address ?? name;
    setHotelName(name);
    setExactHotelAddress(address);
    setHotelInputValue(address);
  }

  // ── Dates ────────────────────────────────────────────────────────────────────
  function handleDepartureChange(val: string) {
    setForm((f) => {
      if (!val) return { ...f, departureDate: "", returnDate: "" };
      // Compute the new maxReturn for this departure date
      const dep = parseDateLocal(val);
      const newMax = new Date(dep);
      newMax.setDate(dep.getDate() + (maxDays - 1));
      const newMaxStr = formatDateLocal(newMax);
      const newMin = new Date(dep);
      newMin.setDate(dep.getDate() + 1);
      const newMinStr = formatDateLocal(newMin);
      // Clear returnDate if it falls outside the new valid window
      const returnDate =
        f.returnDate && (f.returnDate <= val || f.returnDate > newMaxStr || f.returnDate < newMinStr)
          ? ""
          : f.returnDate;
      return { ...f, departureDate: val, returnDate };
    });
  }

  function handleReturnChange(val: string) {
    if (!val) {
      setForm((f) => ({ ...f, returnDate: "" }));
      return;
    }
    // Enforce min/max in JS — mobile browsers (iOS Safari) ignore HTML min/max attributes
    const clamped =
      val < minReturn ? minReturn
      : maxReturn && val > maxReturn ? maxReturn
      : val;
    setForm((f) => ({ ...f, returnDate: clamped }));
  }

  const maxDays = isPremium ? 14 : 3;

  const duration = useMemo(
    () => computeDuration(form.departureDate ?? "", form.returnDate ?? "", maxDays),
    [form.departureDate, form.returnDate, maxDays]
  );

  // minReturn = departure + 1 day (at least a 2-day trip)
  // maxReturn = departure + (maxDays - 1) days (inclusive: Day 1 is departure)
  // Both use parseDateLocal to avoid UTC midnight → previous-day rollback.
  const minReturn = form.departureDate
    ? (() => {
        const d = parseDateLocal(form.departureDate);
        d.setDate(d.getDate() + 1);
        return formatDateLocal(d);
      })()
    : localToday;

  const maxReturn = form.departureDate
    ? (() => {
        const d = parseDateLocal(form.departureDate);
        d.setDate(d.getDate() + (maxDays - 1));
        return formatDateLocal(d);
      })()
    : undefined;

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
  const missingFields = [
    !form.destination                                                              && "Destination",
    (!form.departureDate || !form.returnDate || form.returnDate <= form.departureDate) && "Travel Dates",
    !form.travelParty                                                              && "Travel Party",
    !form.pace                                                                     && "Travel Pace",
    !form.budgetTier                                                               && "Budget Tier",
    !form.interests?.length                                                        && "Interests",
  ].filter(Boolean) as string[];

  const isComplete = missingFields.length === 0;

  const [showErrors, setShowErrors] = useState(false);

  // Returns true when the user has attempted to submit and this section is still incomplete.
  // Used to apply red highlight styling to unfilled sections.
  const isError = (field: string) => showErrors && missingFields.includes(field);

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!isComplete) {
      setShowErrors(true);
      // Scroll to the first errored section so the red highlight is immediately visible
      setTimeout(() => {
        const el = document.querySelector("[data-form-error='true']");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    if (loading) return;
    await onGenerate({
      ...(form as ItineraryRequest),
      duration,
      accommodationStatus,
      // Send undefined (not "") when not booked — empty string fails Zod's optional() validator
      hotelName:          accommodationStatus === "booked" ? hotelName.trim()         : undefined,
      exactHotelAddress:  accommodationStatus === "booked" ? exactHotelAddress.trim() : undefined,
      transportMode,
      // Only send when walking — car-driver ignores this value entirely on the server.
      walkingTolerance:   transportMode === "walking-transit" ? walkingTolerance : undefined,
      isRegion,
    });
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
              options={{ types: ["(regions)"] }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setIsRegion(false); }}
                onFocus={(e) => {
                  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "start" });
                  setShowCreditsHint(false);
                }}
                placeholder="Where do you wish to disappear?"
                className="w-full py-5 pr-4 bg-transparent text-ink placeholder:text-ink-light font-sans text-base outline-none scroll-mt-32"
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

      {/* Credits hint — fades in below search bar, dismisses on input focus */}
      <AnimatePresence>
        {showCreditsHint && (
          <motion.div
            key="credits-hint"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex items-center justify-between gap-4 px-4 py-3 border border-t-0 border-ink/10 bg-paper-dark"
          >
            <p className="font-sans text-xs text-ink-light leading-snug">
              You have <span className="text-ink font-medium">free credits</span> available &mdash; visit your{" "}
              <a href="/dashboard" className="text-burnt-orange hover:underline underline-offset-2 transition-colors">
                Dashboard
              </a>{" "}
              to see how many itineraries you have remaining.
            </p>
            <button
              type="button"
              onClick={() => setShowCreditsHint(false)}
              className="shrink-0 text-ink-light hover:text-ink transition-colors text-lg leading-none"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Region warning — fades in when a broad region is detected */}
      <AnimatePresence>
        {isRegion && stage >= 1 && (
          <motion.p
            key="region-warning"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-2 text-[10px] tracking-widest uppercase text-burnt-orange"
          >
            Broad region selected &mdash; we will curate a multi-destination journey with longer transit between days.
          </motion.p>
        )}
      </AnimatePresence>

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
            <div data-form-error={isError("Travel Dates") || undefined} className={`mb-8 transition-all duration-300 ${isError("Travel Dates") ? "border-l-[3px] border-red-400 pl-4 bg-red-50/30" : ""}`}>
              <p className={`micro-copy mb-4 transition-colors duration-300 ${isError("Travel Dates") ? "text-red-500" : "text-ink-light"}`}>Travel Dates</p>
              <div className="relative z-50 grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="font-sans text-xs text-ink-light block mb-1.5">
                    Departure
                  </label>
                  <div
                    className="flex items-center gap-2 border-b border-ink/20 pb-2 cursor-pointer"
                    onClick={() => departureDateRef.current?.showPicker?.()}
                  >
                    <Calendar size={13} strokeWidth={1.5} className="text-ink-light shrink-0" />
                    <input
                      ref={departureDateRef}
                      type="date"
                      min={localToday}
                      value={form.departureDate ?? ""}
                      onChange={(e) => handleDepartureChange(e.target.value)}
                      onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" })}
                      className="flex-1 bg-transparent font-sans text-sm text-ink outline-none [color-scheme:light] cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-sans text-xs text-ink-light block mb-1.5">
                    Return
                  </label>
                  <div
                    className="flex items-center gap-2 border-b border-ink/20 pb-2 cursor-pointer"
                    onClick={() => { if (form.departureDate) returnDateRef.current?.showPicker?.(); }}
                  >
                    <Calendar size={13} strokeWidth={1.5} className="text-ink-light shrink-0" />
                    <input
                      ref={returnDateRef}
                      type="date"
                      min={minReturn}
                      max={maxReturn}
                      value={form.returnDate ?? ""}
                      onChange={(e) => handleReturnChange(e.target.value)}
                      disabled={!form.departureDate}
                      onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" })}
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
                  {duration === maxDays && (
                    <span className="font-sans text-xs text-ink-light not-italic ml-2">
                      ({maxDays}-day max)
                    </span>
                  )}
                </motion.p>
              )}
            </div>

            {/* ── Row 1b: Accommodation ── */}
            <div className="mb-8">
              <p className="micro-copy text-ink-light mb-4">Accommodation</p>
              <div className="grid grid-cols-2 gap-2">

                {/* Option A — Need recommendations */}
                <button
                  type="button"
                  onClick={() => {
                    setAccommodationStatus("needed");
                    setHotelName("");
                    setExactHotelAddress("");
                    setHotelInputValue("");
                  }}
                  className={`flex flex-col gap-2 p-3 overflow-hidden border text-left transition-all duration-200 cursor-pointer
                    ${accommodationStatus === "needed"
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/10 text-ink hover:border-ink/30"
                    }`}
                >
                  <Building2
                    size={16}
                    strokeWidth={1.5}
                    className={accommodationStatus === "needed" ? "text-paper/70" : "text-ink-light"}
                  />
                  <span className="text-[10px] md:text-xs tracking-wider md:tracking-widest uppercase font-bold leading-tight">I need recommendations</span>
                  <span className={`font-sans text-xs leading-tight ${
                    accommodationStatus === "needed" ? "text-paper/70" : "text-ink-light"
                  }`}>
                    Surface luxury hotel options
                  </span>
                </button>

                {/* Option B — Already booked */}
                <button
                  type="button"
                  onClick={() => setAccommodationStatus("booked")}
                  className={`flex flex-col gap-2 p-3 overflow-hidden border text-left transition-all duration-200 cursor-pointer
                    ${accommodationStatus === "booked"
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/10 text-ink hover:border-ink/30"
                    }`}
                >
                  <Building2
                    size={16}
                    strokeWidth={1.5}
                    className={accommodationStatus === "booked" ? "text-paper/70" : "text-ink-light"}
                  />
                  <span className="text-[10px] md:text-xs tracking-wider md:tracking-widest uppercase font-bold leading-tight">I have a reservation</span>
                  <span className={`font-sans text-xs leading-tight ${
                    accommodationStatus === "booked" ? "text-paper/70" : "text-ink-light"
                  }`}>
                    Focus itinerary around my stay
                  </span>
                </button>
              </div>

              {/* Conditional hotel name input — animated reveal */}
              <AnimatePresence>
                {accommodationStatus === "booked" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="mt-4"
                  >
                    <label className="font-sans text-xs text-ink-light block mb-1.5">
                      Where are you staying?
                    </label>
                    <div className="flex items-center gap-2 border-b border-ink/20 pb-2">
                      <Building2 size={13} strokeWidth={1.5} className="text-ink-light shrink-0" />
                      <Autocomplete
                        onLoad={(ref) => (hotelAutocompleteRef.current = ref)}
                        onPlaceChanged={onHotelPlaceChanged}
                        options={{
                          types: ["lodging"],
                          // Bias results toward the selected destination so "pa" returns
                          // Paris hotels, not hotels near the user's current location.
                          ...(form.lat && form.lng ? {
                            bounds: {
                              north: form.lat + 0.25,
                              south: form.lat - 0.25,
                              east:  form.lng + 0.25,
                              west:  form.lng - 0.25,
                            },
                            strictBounds: false,
                          } : {}),
                        }}
                        className="flex-1 min-w-0"
                      >
                        <input
                          type="text"
                          value={hotelInputValue}
                          onChange={(e) => {
                            setHotelInputValue(e.target.value);
                            setHotelName(e.target.value);
                            setExactHotelAddress("");
                          }}
                          placeholder="The Ritz-Carlton, Tokyo"
                          className="w-full bg-transparent font-sans text-sm text-ink outline-none placeholder:text-ink/30"
                        />
                      </Autocomplete>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Row 1c: Getting Around ── */}
            <div className="mb-8">
              <p className="micro-copy text-ink-light mb-4">Getting Around</p>
              <div className="grid grid-cols-2 gap-2">

                {/* Walking & Transit */}
                <button
                  type="button"
                  onClick={() => setTransportMode("walking-transit")}
                  className={`flex flex-col gap-2 p-3 overflow-hidden border text-left transition-all duration-200 cursor-pointer
                    ${transportMode === "walking-transit"
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/10 text-ink hover:border-ink/30"
                    }`}
                >
                  <TrainFront
                    size={16}
                    strokeWidth={1.5}
                    className={transportMode === "walking-transit" ? "text-paper/70" : "text-ink-light"}
                  />
                  <span className="text-[10px] md:text-xs tracking-wider md:tracking-widest uppercase font-bold leading-tight">Walking &amp; Transit</span>
                  <span className={`font-sans text-xs leading-tight ${
                    transportMode === "walking-transit" ? "text-paper/70" : "text-ink-light"
                  }`}>
                    Public transport &amp; on foot
                  </span>
                </button>

                {/* Rental Car / Private Driver */}
                <button
                  type="button"
                  onClick={() => { setTransportMode("car-driver"); setWalkingTolerance("strict"); }}
                  className={`flex flex-col gap-2 p-3 overflow-hidden border text-left transition-all duration-200 cursor-pointer
                    ${transportMode === "car-driver"
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/10 text-ink hover:border-ink/30"
                    }`}
                >
                  <Car
                    size={16}
                    strokeWidth={1.5}
                    className={transportMode === "car-driver" ? "text-paper/70" : "text-ink-light"}
                  />
                  <span className="text-[10px] md:text-xs tracking-wider md:tracking-widest uppercase font-bold leading-tight">Car / Private Driver</span>
                  <span className={`font-sans text-xs leading-tight ${
                    transportMode === "car-driver" ? "text-paper/70" : "text-ink-light"
                  }`}>
                    Rental car or hired driver
                  </span>
                </button>
              </div>

              {/* ── Walking Tolerance sub-option ── */}
              {/* Visible only when Walking & Transit is selected. */}
              <AnimatePresence>
                {transportMode === "walking-transit" && (
                  <motion.div
                    key="walking-tolerance"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden mt-3"
                  >
                    <div className="grid grid-cols-2 gap-2">

                      {/* Short walks (strict) */}
                      <button
                        type="button"
                        onClick={() => setWalkingTolerance("strict")}
                        className={`flex flex-col gap-1 px-4 py-3 border text-left transition-all duration-200
                          ${walkingTolerance === "strict"
                            ? "border-ink bg-ink text-paper"
                            : "border-ink/10 text-ink hover:border-ink/30"
                          }`}
                      >
                        <span className="micro-copy leading-none">Short walks</span>
                        <span className={`font-sans text-xs leading-tight ${
                          walkingTolerance === "strict" ? "text-paper/70" : "text-ink-light"
                        }`}>
                          Max 20 min between stops
                        </span>
                      </button>

                      {/* Explorer pace (relaxed) */}
                      <button
                        type="button"
                        onClick={() => setWalkingTolerance("relaxed")}
                        className={`flex flex-col gap-1 px-4 py-3 border text-left transition-all duration-200
                          ${walkingTolerance === "relaxed"
                            ? "border-ink bg-ink text-paper"
                            : "border-ink/10 text-ink hover:border-ink/30"
                          }`}
                      >
                        <span className="micro-copy leading-none">Explorer pace</span>
                        <span className={`font-sans text-xs leading-tight ${
                          walkingTolerance === "relaxed" ? "text-paper/70" : "text-ink-light"
                        }`}>
                          Up to 45 min between stops
                        </span>
                      </button>

                    </div>
                    <p className="font-sans text-xs text-ink-light mt-2">
                      Controls how far apart your stops can be within a day.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Transit mode contextual note ── */}
              {/* Slides in once a mode is chosen. Key changes between strict-walk and
                  city-wide so AnimatePresence cross-fades the copy when tolerance changes. */}
              <AnimatePresence mode="wait">
                {transportMode && (
                  <motion.div
                    key={transportMode === "walking-transit" && walkingTolerance === "strict"
                      ? "neighbourhood"
                      : "city-wide"
                    }
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <p className="font-sans text-xs text-ink-light border-l-2 border-ink/15 pl-3 mt-3 leading-relaxed">
                      {transportMode === "walking-transit" && walkingTolerance === "strict"
                        ? "Immerses you in a single neighbourhood. To guarantee short walks, distant major landmarks may be excluded."
                        : "Unlocks the entire city. Prioritises top-tier landmarks across different neighbourhoods, requiring local transport."
                      }
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* ── Row 2: Travel Party ── */}
            <div data-form-error={isError("Travel Party") || undefined} className={`mb-8 transition-all duration-300 ${isError("Travel Party") ? "border-l-[3px] border-red-400 pl-4 bg-red-50/30" : ""}`}>
              <p className={`micro-copy mb-4 transition-colors duration-300 ${isError("Travel Party") ? "text-red-500" : "text-ink-light"}`}>Travel Party</p>
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
            <div data-form-error={isError("Travel Pace") || undefined} className={`mb-8 transition-all duration-300 ${isError("Travel Pace") ? "border-l-[3px] border-red-400 pl-4 bg-red-50/30" : ""}`}>
              <p className={`micro-copy mb-4 transition-colors duration-300 ${isError("Travel Pace") ? "text-red-500" : "text-ink-light"}`}>Travel Pace</p>
              <div className="grid grid-cols-3 gap-2">
                {PACE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, pace: opt.value }))}
                    className={`flex flex-col gap-2 p-2 sm:p-3 md:p-4 overflow-hidden border text-left transition-all duration-200
                      ${form.pace === opt.value
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/10 text-ink hover:border-ink/30"
                      }`}
                  >
                    <span className={form.pace === opt.value ? "text-paper" : "text-ink-light"}>
                      {opt.icon}
                    </span>
                    <span className="text-[10px] md:text-xs tracking-wider md:tracking-widest uppercase font-bold leading-tight">{opt.label}</span>
                    <span className={`font-sans text-[10px] md:text-xs leading-tight ${form.pace === opt.value ? "text-paper/70" : "text-ink-light"}`}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Row 4: Budget Tier ── */}
            <div data-form-error={isError("Budget Tier") || undefined} className={`mb-8 transition-all duration-300 ${isError("Budget Tier") ? "border-l-[3px] border-red-400 pl-4 bg-red-50/30" : ""}`}>
              <p className={`micro-copy mb-4 transition-colors duration-300 ${isError("Budget Tier") ? "text-red-500" : "text-ink-light"}`}>Budget Tier</p>
              <div className="grid grid-cols-3 gap-2">
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, budgetTier: opt.value }))}
                    className={`flex flex-col gap-2 p-2 sm:p-3 md:p-4 overflow-hidden border text-left transition-all duration-200
                      ${form.budgetTier === opt.value
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/10 text-ink hover:border-ink/30"
                      }`}
                  >
                    <span className={`font-serif italic text-2xl sm:text-3xl leading-none ${form.budgetTier === opt.value ? "text-paper" : "text-ink"}`}>
                      {opt.symbol}
                    </span>
                    <span className="text-[10px] md:text-xs tracking-wider md:tracking-widest uppercase font-bold leading-tight">{opt.label}</span>
                    <span className={`font-sans text-[10px] md:text-xs leading-tight ${form.budgetTier === opt.value ? "text-paper/70" : "text-ink-light"}`}>
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
            <div data-form-error={isError("Interests") || undefined} className={`mb-8 transition-all duration-300 ${isError("Interests") ? "border-l-[3px] border-red-400 pl-4 bg-red-50/30" : ""}`}>
              <p className={`micro-copy mb-1 transition-colors duration-300 ${isError("Interests") ? "text-red-500" : "text-ink-light"}`}>Interests</p>
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
            <div>
              {/* Validation hint — sections above are already highlighted in red */}
              <AnimatePresence>
                {showErrors && !isComplete && (
                  <motion.p
                    key="errors"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="mb-4 font-sans text-xs text-red-500 text-center"
                  >
                    Please complete the sections highlighted above.
                  </motion.p>
                )}
              </AnimatePresence>

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

              {isComplete && (
                <p className="mt-3 text-center micro-copy text-ink-light">
                  {duration} day{duration !== 1 ? "s" : ""} ·{" "}
                  {form.travelParty} · {form.pace} · {form.budgetTier}
                  {form.interests && form.interests.length > 0 && (
                    <> · {form.interests.length} interest{form.interests.length !== 1 ? "s" : ""}</>
                  )}
                </p>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
