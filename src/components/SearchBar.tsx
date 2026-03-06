"use client";

import { useRef, useState } from "react";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { ArrowRight, MapPin, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { ItineraryRequest } from "@/types/itinerary";

const LIBRARIES: ("places")[] = ["places"];

interface SearchBarProps {
  onGenerate?: (data: ItineraryRequest) => Promise<void>;
  loading?: boolean;
}

export default function SearchBar({ onGenerate, loading }: SearchBarProps) {
  const router = useRouter();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<ItineraryRequest | null>(
    null
  );

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  function onPlaceChanged() {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry?.location || !place.place_id) return;

    const data: ItineraryRequest = {
      destination: place.formatted_address || place.name || inputValue,
      placeId: place.place_id,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };
    setSelectedPlace(data);
    setInputValue(place.formatted_address || place.name || inputValue);
  }

  async function handleSubmit() {
    if (!selectedPlace) return;
    if (onGenerate) {
      await onGenerate(selectedPlace);
    } else {
      // Store in sessionStorage and navigate
      sessionStorage.setItem("itineraryRequest", JSON.stringify(selectedPlace));
      router.push("/itinerary");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="flex items-stretch border border-ink/15 bg-paper">
        {/* Icon */}
        <div className="flex items-center px-4 text-ink-light">
          <MapPin size={18} strokeWidth={1.5} />
        </div>

        {/* Input */}
        <div className="flex-1">
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
              type="text"
              placeholder="Loading maps..."
              disabled
              className="w-full py-5 pr-4 bg-transparent text-ink-light font-sans text-base outline-none cursor-not-allowed"
            />
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={!selectedPlace || loading}
          className="flex items-center gap-3 px-8 py-5 bg-burnt-orange text-white micro-copy hover:bg-ink transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowRight size={16} strokeWidth={2} />
          )}
          <span className="hidden sm:inline">Curate My Journey</span>
        </button>
      </div>

      {/* Caption */}
      <p className="mt-3 micro-copy text-ink-light text-center">
        AI-curated 3-day itinerary — hidden gems, dining, pace
      </p>
    </motion.div>
  );
}
