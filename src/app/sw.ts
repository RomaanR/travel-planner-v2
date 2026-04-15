import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Clerk auth domains — never cache, always network-only
    // SW interception causes "no-response" errors for clerk.browser.js and auth flows
    {
      matcher: /^https:\/\/.*\.clerk\.com\//,
      handler: new NetworkOnly(),
    },
    {
      matcher: /^https:\/\/clerk\.travalbee\.com\//,
      handler: new NetworkOnly(),
    },
    // API routes — always network-only, never serve from SW cache
    // Caching /api/* causes stale responses and no-response errors on dynamic routes
    {
      matcher: /\/api\//,
      handler: new NetworkOnly(),
    },
    // Google Places photo cache — destination images on /trips cards and location cards
    {
      matcher: /^https:\/\/maps\.googleapis\.com\/maps\/api\/place\/photo/,
      handler: new CacheFirst({
        cacheName: "google-places-photos",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          }),
        ],
      }),
    },
    // Default Next.js static asset caching strategy
    ...defaultCache,
  ],
});

serwist.addEventListeners();
