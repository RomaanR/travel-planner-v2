import { countryByCode } from "./countries";
import { type NewsView, isCurrentAlert } from "./types";

// "What does this mean for travellers?" — rule-based, no AI. Each line is either taken from the
// official update itself ("official") or is general guidance that applies to any serious alert
// ("general"). We never claim that flights, borders or plans ARE affected unless the official
// text says so.

export type Implication = {
  label: string;
  text:  string;
  basis: "official" | "general";
  links?: { label: string; href: string }[];
};

const TRANSPORT = /\b(flights?|airports?|airlines?|air travel|transport|trains?|rail|ferr(?:y|ies)|buses|roads?|border crossings?|cancell?ed|disruption)\b/i;
const STEP_URL = "https://step.state.gov/";

/** Null when an update does not warrant the section (routine, low-severity or historic items). */
export function implicationsFor(item: NewsView): Implication[] | null {
  const serious = isCurrentAlert(item);
  const advice = item.source === "fcdo" && item.topics.some((t) => ["entry", "safety", "health"].includes(t));
  if (!serious && !advice) return null;

  const country = countryByCode(item.countryCode);
  const rows: Implication[] = [];

  const others = (item.alsoAffects ?? []).map((o) => o.name);
  rows.push({
    label: "Where",
    basis: "official",
    text: item.source === "gdacs"
      ? `Reported for ${[item.countryName, ...others].join(", ")}. It can cover a wide area, so check the GDACS page for the exact regions.`
      : `${item.countryName}, as set out in the official advice.`,
  });

  rows.push(
    TRANSPORT.test(`${item.title} ${item.summary}`)
      ? { label: "Flights & transport", basis: "official", text: "The official summary mentions transport. Read the full update for the details." }
      : { label: "Flights & transport", basis: "general", text: "Not covered in this summary. If you are travelling soon, check with your airline or transport operator." },
  );

  if (item.topics.includes("entry")) {
    rows.push({ label: "Entry requirements", basis: "official", text: "This update is about entry requirements. Check the full advice before you travel." });
  }

  if (serious) {
    rows.push({
      label: "Your bookings",
      basis: "general",
      text: "If you are due to travel there, confirm your accommodation and itinerary with your hotel, airline or tour provider.",
    });
  }

  const uk = country?.fcdoSlug
    ? { label: "UK: help abroad", href: `https://www.gov.uk/foreign-travel-advice/${country.fcdoSlug}/getting-help` }
    : { label: "UK: travel advice by country", href: "https://www.gov.uk/foreign-travel-advice" };
  const us = { label: "US: enrol in STEP", href: STEP_URL };
  rows.push({
    label: "Official help",
    basis: "general",
    text: "Follow local authorities' instructions and contact your embassy or consulate if you need assistance.",
    links: item.source === "fcdo" ? (uk ? [uk] : []) : item.source === "state" ? [us] : [...(uk ? [uk] : []), us],
  });

  return rows;
}
