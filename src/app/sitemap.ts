import type { MetadataRoute } from "next";
import { ALL_COUNTRIES } from "@/lib/news/countries";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://travalbee.com";

const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "",         priority: 1.0, changeFrequency: "weekly"  },
  { path: "/curate",  priority: 0.9, changeFrequency: "monthly" },
  { path: "/sample",  priority: 0.8, changeFrequency: "monthly" },
  { path: "/news",    priority: 0.8, changeFrequency: "daily"   },
  ...ALL_COUNTRIES.map((c) => ({ path: `/news/${c.slug}`, priority: c.popular ? 0.7 : 0.4, changeFrequency: "daily" as const })),
  { path: "/pricing", priority: 0.6, changeFrequency: "monthly" },
  { path: "/faq",     priority: 0.5, changeFrequency: "monthly" },
  { path: "/support", priority: 0.3, changeFrequency: "yearly"  },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly"  },
  { path: "/terms",   priority: 0.2, changeFrequency: "yearly"  },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly"  },
  { path: "/refunds", priority: 0.2, changeFrequency: "yearly"  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));
}
