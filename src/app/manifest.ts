import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TravalBee",
    short_name: "TravalBee",
    description: "Curated Luxury Travel Itineraries",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F1EB",
    theme_color: "#1B1817",
    icons: [
      {
        src: "/bee_menu_192x192_transparent.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/bee_menu_512x512_transparent.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
