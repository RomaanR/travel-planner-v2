// Languages an itinerary can be written in. Only the itinerary text changes; the rest of the site stays English.

export const LANGUAGE_CODES = ["en", "es", "fr", "de", "zh-Hans", "ja", "ar"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export type LanguageOption = {
  code:    LanguageCode;
  /** The language's own name, as shown in the picker. */
  native:  string;
  /** English name, used inside the generation prompt. */
  english: string;
  rtl:     boolean;
};

export const LANGUAGES: LanguageOption[] = [
  { code: "en",      native: "English",  english: "English",                    rtl: false },
  { code: "es",      native: "Español",  english: "Spanish",                    rtl: false },
  { code: "fr",      native: "Français", english: "French",                     rtl: false },
  { code: "de",      native: "Deutsch",  english: "German",                     rtl: false },
  { code: "zh-Hans", native: "简体中文",   english: "Simplified Chinese",         rtl: false },
  { code: "ja",      native: "日本語",     english: "Japanese",                   rtl: false },
  { code: "ar",      native: "العربية",  english: "Modern Standard Arabic",     rtl: true  },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);
}

/** Safe lookup: anything unknown (older saved trips, tampered values) falls back to English. */
export function languageOf(value: unknown): LanguageOption {
  return LANGUAGES.find((l) => l.code === value) ?? LANGUAGES[0];
}
