import { CITIES, cityHref } from "@/content/heroDestinations";
import { plannerHref } from "@/lib/plannerLink";
import type { NewsCountry } from "./countries";

/** "Plan a trip to <country>" — a prefilled planner link; exact city when we hold a verified place. */
export function planHrefFor(country: NewsCountry): string {
  return country.planCity ? cityHref(CITIES[country.planCity]) : plannerHref({ destination: country.name });
}
