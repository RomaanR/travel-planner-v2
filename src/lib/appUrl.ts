/**
 * The site's public origin, used for Stripe return URLs. In production an unset
 * NEXT_PUBLIC_APP_URL must never silently become localhost (paying customers would be sent
 * there), so it falls back to Vercel's production domain and otherwise throws.
 */
export function appBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  throw new Error("NEXT_PUBLIC_APP_URL is not set");
}
