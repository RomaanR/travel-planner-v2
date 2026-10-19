import { ImageResponse } from "next/og";

// Edge runtime: the Node renderer in Next 14 mishandles Windows paths (fine on
// Vercel, but this keeps local dev working too).
export const runtime = "edge";

// Default share image for every page without its own (home, pricing, FAQ…).
export const alt = "TravalBee — Curated Luxury Journeys";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F5F0E8";
const INK = "#0A0A0A";
const INK_LIGHT = "#6B6B6B";
const ORANGE = "#C2410C";

/** Fetches a Google font as TTF, subset to `text` (Satori can't read WOFF2). */
async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(
      `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`,
    )).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const title   = "TravalBee";
  const kicker  = "CURATED LUXURY JOURNEYS";
  const tagline = "Itineraries crafted around you: hidden gems, considered tables, and routes that make sense.";

  const [serif, sans, logo] = await Promise.all([
    loadGoogleFont("Cormorant+Garamond:ital,wght@1,500", title),
    loadGoogleFont("DM+Sans:wght@500", kicker + tagline),
    fetch(new URL("../../public/bee_compass_512_transparent.png", import.meta.url))
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null),
  ]);

  const fonts = [
    ...(serif ? [{ name: "Cormorant", data: serif, style: "italic" as const, weight: 500 as const }] : []),
    ...(sans ? [{ name: "DM Sans", data: sans, style: "normal" as const, weight: 500 as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "0 96px", background: PAPER, color: INK, fontFamily: "DM Sans",
          borderBottom: `14px solid ${ORANGE}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 26 }}>
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo as unknown as string} // Satori accepts an ArrayBuffer as the image source
              width={120}
              height={120}
              alt=""
            />
          )}
          <div style={{ fontSize: 22, letterSpacing: 6, color: INK_LIGHT }}>{kicker}</div>
        </div>
        <div style={{ fontFamily: "Cormorant", fontStyle: "italic", fontSize: 168, lineHeight: 1, marginBottom: 30 }}>
          {title}
        </div>
        <div style={{ width: 120, height: 2, background: ORANGE, marginBottom: 30 }} />
        <div style={{ fontSize: 32, lineHeight: 1.4, color: INK_LIGHT, maxWidth: 900 }}>{tagline}</div>
      </div>
    ),
    { ...size, fonts },
  );
}
