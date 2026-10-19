import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://travalbee.com";

// Public marketing pages are crawlable; private and app-state pages are not.
// /shared/* stays crawlable so link-preview bots can read it, but each shared
// page carries a noindex tag.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/dashboard", "/trips", "/itinerary", "/stream-test"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
