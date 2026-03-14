import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Seek Wander",
    short_name: "Seek Wander",
    description: "Curated Luxury Travel Itineraries",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F1EB",
    theme_color: "#1B1817",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
