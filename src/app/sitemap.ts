import type { MetadataRoute } from "next";
import { ALL_COUNTRIES } from "@/lib/news/countries";
import { prisma } from "@/lib/db";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://travalbee.com";

// Rebuilt at most hourly. Last-modified dates for the news pages come from their newest update; if the
// database is unreachable the sitemap is still served, just without those dates.
export const revalidate = 3600;

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

async function newsDates(): Promise<{ overall?: Date; byCountry: Map<string, Date> }> {
  const byCountry = new Map<string, Date>();
  try {
    const rows = await prisma.newsItem.groupBy({
      by: ["countryCode"],
      where: { status: "published" },
      _max: { publishedAt: true },
    });
    let overall: Date | undefined;
    for (const r of rows) {
      const d = r._max.publishedAt;
      if (!d) continue;
      byCountry.set(r.countryCode, d);
      if (!overall || d > overall) overall = d;
    }
    return { overall, byCountry };
  } catch {
    return { byCountry };
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { overall, byCountry } = await newsDates();
  const codeBySlug = new Map(ALL_COUNTRIES.map((c) => [`/news/${c.slug}`, c.code]));

  return PAGES.map(({ path, priority, changeFrequency }) => {
    const code = codeBySlug.get(path);
    const lastModified = path === "/news" ? overall : code ? byCountry.get(code) : undefined;
    return {
      url: `${SITE_URL}${path}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency,
      priority,
    };
  });
}
