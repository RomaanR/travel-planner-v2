import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  interpolateColors,
  staticFile,
  useCurrentFrame,
} from "remotion";
import mapData from "./mapData.json";
import { C, FONT_SANS, FONT_SERIF, LEVELS } from "./theme";

// Scene lengths in frames (30 fps). 26 seconds in total.
const S1 = 75; // hook
const S2 = 75; // the problem
const S3 = 195; // the advisory map
const S4 = 105; // a country card
const S5 = 240; // current alerts
const S6 = 90; // call to action
export const TOTAL_FRAMES = S1 + S2 + S3 + S4 + S5 + S6;

// Data snapshot from the live database, 2026-11-06 (US State Dept levels, Canada's advice).
const COUNTS: Record<number, number> = { 1: 81, 2: 82, 3: 26, 4: 24 };
const TOTAL_COUNTRIES = 213;

type MapRow = { n: string; code: string | null; level: number; d: string };
const MAP = mapData as MapRow[];

const ease = Easing.out(Easing.cubic);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Fade and rise into place, starting at `start`. */
function rise(frame: number, start: number, dur = 20, distance = 40) {
  const t = interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: ease });
  return { opacity: t, transform: `translateY(${(1 - t) * distance}px)` };
}

/** Wraps a scene so it fades in and out at its edges. */
const Scene: React.FC<{ len: number; bg: string; children: React.ReactNode }> = ({ len, bg, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, len - 8, len], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ background: bg, opacity }}>{children}</AbsoluteFill>;
};

const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color = C.inkLight,
  style,
}) => (
  <div
    style={{
      fontFamily: FONT_SANS,
      fontWeight: 700,
      fontSize: 34,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color,
      ...style,
    }}
  >
    {children}
  </div>
);

// ─── Scene 1: hook ───────────────────────────────────────────────────────────
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene len={S1} bg={C.ink}>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 90px" }}>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 190, lineHeight: 0.95, color: C.paper, ...rise(frame, 4, 22, 60) }}>
          Is your next trip safe?
        </div>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 190, lineHeight: 0.95, color: "#F07A47", marginTop: 40, ...rise(frame, 26, 22, 60) }}>
          Check before you book.
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ─── Scene 2: the problem ────────────────────────────────────────────────────
const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const lines = ["Three governments.", "213 destinations.", "One page."];
  const chips = ["US State Dept", "UK FCDO", "Canada"];
  return (
    <Scene len={S2} bg={C.paper}>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 90px" }}>
        {lines.map((line, i) => (
          <div
            key={line}
            style={{
              fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 150, lineHeight: 1.02,
              color: i === 2 ? C.orange : C.ink, marginBottom: 24, ...rise(frame, 3 + i * 12, 18, 50),
            }}
          >
            {line}
          </div>
        ))}
        <div style={{ display: "flex", gap: 20, marginTop: 70, ...rise(frame, 42, 16, 30) }}>
          {chips.map((c) => (
            <div key={c} style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 32, letterSpacing: "0.12em", textTransform: "uppercase", color: C.ink, border: `3px solid ${C.ink}`, padding: "16px 26px" }}>
              {c}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ─── Scene 3: the world map lighting up ──────────────────────────────────────
const MAP_W = 1080;
const MAP_SCALE = MAP_W / 960; // the paths are drawn in a 960 x 500 box
const MAP_H = 500 * MAP_SCALE;
const MAP_TOP = 560;

/** Centre of a path's bounding box, in the 960 x 500 box. */
function bbox(d: string) {
  const n = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < n.length; i += 2) {
    x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]);
    y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]);
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// Each level lights up in turn, sweeping left to right inside the level.
const LEVEL_START: Record<number, number> = { 1: 14, 2: 46, 3: 78, 4: 108 };
const SWEEP = 28;
const REVEAL = (() => {
  const out = new Map<string, number>();
  for (const lv of [1, 2, 3, 4]) {
    const rows = MAP.filter((m) => m.level === lv).sort((a, b) => bbox(a.d).cx - bbox(b.d).cx);
    rows.forEach((m, i) => out.set(m.n, LEVEL_START[lv] + (i / Math.max(1, rows.length - 1)) * SWEEP));
  }
  return out;
})();

const FOCUS = (() => {
  const co = MAP.find((m) => m.code === "CO");
  return co ? bbox(co.d) : { cx: 250, cy: 290 };
})();

const levelProgress = (frame: number, lv: number) =>
  interpolate(frame, [LEVEL_START[lv], LEVEL_START[lv] + SWEEP + 10], [0, 1], clamp);

const WorldMap: React.FC = () => {
  const frame = useCurrentFrame();

  // Number of countries lit so far.
  let lit = 0;
  for (const lv of [1, 2, 3, 4]) lit += Math.round(COUNTS[lv] * levelProgress(frame, lv));

  const zoom = interpolate(frame, [150, S3 - 6], [1, 2.1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const focus = interpolate(frame, [150, S3 - 6], [0, 1], clamp);
  const ox = FOCUS.cx * MAP_SCALE;
  const oy = FOCUS.cy * MAP_SCALE;

  return (
    <Scene len={S3} bg={C.paper}>
      <div style={{ position: "absolute", top: 100, left: 0, right: 0, textAlign: "center" }}>
        <Kicker style={rise(frame, 0, 16, 20)}>Travel advisory levels</Kicker>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 280, lineHeight: 1, color: C.ink, marginTop: 20 }}>
          {Math.min(TOTAL_COUNTRIES, lit)}
        </div>
        <Kicker style={{ marginTop: 44 }}>countries and territories</Kicker>
      </div>

      <div style={{ position: "absolute", top: MAP_TOP, left: 0, width: MAP_W, height: MAP_H, background: C.paperDark, overflow: "hidden" }}>
        <svg
          viewBox="0 0 960 500"
          width={MAP_W}
          height={MAP_H}
          style={{ transform: `scale(${zoom})`, transformOrigin: `${ox}px ${oy}px`, display: "block" }}
        >
          {MAP.map((m) => {
            const lv = LEVELS.find((l) => l.level === m.level);
            const at = REVEAL.get(m.n);
            const fill = lv && at !== undefined
              ? interpolateColors(frame, [at, at + 12], [C.noData, lv.fill])
              : C.noData;
            const isFocus = m.code === "CO";
            return (
              <path
                key={m.n}
                d={m.d}
                fill={fill}
                stroke={isFocus && focus > 0.5 ? C.ink : C.paper}
                strokeWidth={isFocus && focus > 0.5 ? 1.4 : 0.5}
                opacity={isFocus ? 1 : 1 - focus * 0.55}
              />
            );
          })}
        </svg>
      </div>

      <div style={{ position: "absolute", top: MAP_TOP + MAP_H + 70, left: 90, right: 90 }}>
        {LEVELS.map((l, i) => (
          <div key={l.level} style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 26, ...rise(frame, 22 + i * 10, 14, 24) }}>
            <div style={{ width: 44, height: 44, background: l.fill }} />
            <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 40, color: C.ink, flex: 1 }}>
              Level {l.level}: {l.name}
            </div>
            <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 60, color: C.ink }}>
              {Math.round(COUNTS[l.level] * levelProgress(frame, l.level))}
            </div>
          </div>
        ))}
      </div>
    </Scene>
  );
};

// ─── Scene 4: one country ────────────────────────────────────────────────────
const CountryCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene len={S4} bg={C.paper}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Kicker style={{ marginBottom: 40, ...rise(frame, 0, 16, 20) }}>Tap any country</Kicker>
        <div style={{ width: 900, background: "#FFFFFF", border: "3px solid rgba(10,10,10,0.1)", padding: 64, ...rise(frame, 6, 22, 60) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <Img src={staticFile("flags/co.png")} style={{ width: 170, border: "2px solid rgba(10,10,10,0.15)" }} />
            <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 150, color: C.ink, lineHeight: 1 }}>Colombia</div>
          </div>

          <div style={{ marginTop: 54, ...rise(frame, 22, 16, 30) }}>
            <Kicker style={{ fontSize: 28 }}>US State Department</Kicker>
            <div style={{ display: "inline-block", background: LEVELS[2].fill, color: "#FFFFFF", fontFamily: FONT_SANS, fontWeight: 700, fontSize: 46, padding: "18px 30px", marginTop: 16 }}>
              Level 3: Reconsider travel
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 30, color: C.inkLight, marginTop: 14 }}>Published 31 Mar 2026</div>
          </div>

          <div style={{ marginTop: 48, ...rise(frame, 36, 16, 30) }}>
            <Kicker style={{ fontSize: 28 }}>Canada</Kicker>
            <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 40, color: C.ink, marginTop: 14, lineHeight: 1.25 }}>
              Exercise a high degree of caution (with regional advisories)
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 30, color: C.inkLight, marginTop: 14 }}>Published 2 Nov 2026</div>
          </div>
        </div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 32, color: C.inkLight, marginTop: 44, textAlign: "center", padding: "0 90px", ...rise(frame, 50, 14, 20) }}>
          Straight from official government sources.
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

// ─── Scene 5: current alerts ─────────────────────────────────────────────────
// Real alerts from the live database, snapshot 2026-11-06: 55 active GDACS alerts in the last
// 14 days (3 red, 52 orange). Re-pull before reposting this video later.
const ALERT_RED = "#B91C1C";
const ALERT_COUNT = 55;

type AlertCardData = {
  code: string;
  country: string;
  title: string;
  summary: string;
  updated: string;
};

const INDIA: AlertCardData = {
  code: "in",
  country: "India",
  title: "Tropical cyclone MURASU-26",
  summary:
    "GDACS, the EU/UN disaster alert system, reports a red alert for a tropical cyclone affecting India (Hurricane/Typhoon > 74 mph (maximum wind speed of 120 km/h)). Check GDACS and local authorities for the latest details.",
  updated: "Updated 4 Nov 2026",
};
const JAPAN: AlertCardData = {
  code: "jp",
  country: "Japan",
  title: "Tropical cyclone CHAMPI-26",
  summary:
    "GDACS, the EU/UN disaster alert system, reports a red alert for a tropical cyclone affecting Japan (Tropical Storm (maximum wind speed of 65 km/h)). Check GDACS and local authorities for the latest details.",
  updated: "Updated 26 Oct 2026",
};

// Wording taken from the site's "What does this mean for travellers?" panel.
const IMPLICATIONS = [
  ["Where", "Reported for India. It can cover a wide area, so check the GDACS page for the exact regions."],
  ["Flights & transport", "Not covered in this summary. If you are travelling soon, check with your airline or transport operator."],
  ["Your bookings", "If you are due to travel there, confirm your accommodation and itinerary with your hotel, airline or tour provider."],
] as const;

const AlertCard: React.FC<{ data: AlertCardData; open: number; compact?: boolean }> = ({ data, open, compact }) => (
  <div
    style={{
      position: "relative",
      width: 940,
      background: "#FDF2F2",
      border: "2px solid rgba(185,28,28,0.25)",
      borderLeft: `12px solid ${ALERT_RED}`,
      padding: "40px 40px 34px 40px",
      boxSizing: "border-box",
    }}
  >
    <Img
      src={staticFile(`photos/${data.code}.jpg`)}
      style={{ position: "absolute", top: 40, right: 40, width: compact ? 150 : 190, height: compact ? 150 : 190, objectFit: "cover" }}
    />
    <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 24, letterSpacing: "0.2em", textTransform: "uppercase", color: C.ink }}>
      <Img src={staticFile(`flags/${data.code}.png`)} style={{ width: 52, border: "1px solid rgba(10,10,10,0.2)" }} />
      {data.country}
      <span style={{ color: C.inkLight }}>&middot; GDACS &middot; Weather</span>
    </div>
    <div style={{ display: "inline-block", background: ALERT_RED, color: "#FFFFFF", fontFamily: FONT_SANS, fontWeight: 700, fontSize: 26, letterSpacing: "0.2em", textTransform: "uppercase", padding: "12px 22px", marginTop: 26 }}>
      &#9888; Red alert
    </div>
    <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: compact ? 54 : 58, lineHeight: 1.05, color: C.ink, marginTop: 20, width: 580 }}>
      {data.title.slice(0, data.title.lastIndexOf(" ") + 1)}
      <span style={{ whiteSpace: "nowrap" }}>{data.title.slice(data.title.lastIndexOf(" ") + 1)}</span>
    </div>
    {!compact && <div style={{ fontFamily: FONT_SANS, fontSize: 28, lineHeight: 1.42, color: "#222", marginTop: 28 }}>{data.summary}</div>}
{!compact && <>

    <div style={{ borderTop: "2px solid rgba(10,10,10,0.1)", marginTop: 26, paddingTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: FONT_SANS, fontWeight: 700, fontSize: 32, color: C.ink }}>
      What does this mean for travellers?
      <span style={{ fontSize: 44, transform: `rotate(${open * 45}deg)`, display: "inline-block" }}>+</span>
    </div>
    <div style={{ overflow: "hidden", height: open * 440 }}>
      {IMPLICATIONS.map(([label, text]) => (
        <div key={label} style={{ marginTop: 26 }}>
          <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 24, letterSpacing: "0.18em", textTransform: "uppercase", color: C.inkLight }}>{label}</div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 30, lineHeight: 1.4, color: C.ink, marginTop: 6 }}>{text}</div>
        </div>
      ))}
    </div>
    <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: C.inkLight, marginTop: 24 }}>{data.updated} &middot; Checked 6 Nov 2026</div>
</>}
  </div>
);

const TOPICS = ["Safety & advisories", "Entry & visas", "Weather & disasters", "Health"];

const Alerts: React.FC = () => {
  const frame = useCurrentFrame();
  const count = Math.round(ALERT_COUNT * interpolate(frame, [8, 46], [0, 1], { ...clamp, easing: ease }));
  const topicOn = interpolate(frame, [52, 58], [0, 1], clamp);
  const open = interpolate(frame, [138, 168], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  // The second card steps aside while the first one opens.
  const secondGone = interpolate(frame, [128, 146], [0, 1], clamp);
  // Open card keeps its top edge; the stack scrolls up a touch to make room.
  const lift = interpolate(frame, [138, 168], [0, 50], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  return (
    <Scene len={S5} bg={C.paper}>
      <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center" }}>
        <Kicker color={C.orange} style={rise(frame, 0, 14, 20)}>And when something happens&hellip;</Kicker>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 210, lineHeight: 1, color: C.ink, marginTop: 14 }}>
          {count}
        </div>
        <Kicker style={{ marginTop: 64, fontSize: 30 }}>active alerts worldwide</Kicker>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 24, ...rise(frame, 26, 14, 20) }}>
          <div style={{ background: ALERT_RED, color: "#fff", fontFamily: FONT_SANS, fontWeight: 700, fontSize: 26, letterSpacing: "0.16em", padding: "10px 20px" }}>3 RED</div>
          <div style={{ background: LEVELS[2].fill, color: "#fff", fontFamily: FONT_SANS, fontWeight: 700, fontSize: 26, letterSpacing: "0.16em", padding: "10px 20px" }}>52 ORANGE</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24, ...rise(frame, 36, 14, 20) }}>
          {TOPICS.map((t) => {
            const active = t === "Weather & disasters";
            const on = active ? topicOn : 0;
            return (
              <div
                key={t}
                style={{
                  fontFamily: FONT_SANS, fontWeight: 700, fontSize: 19, letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "12px 14px", border: "2px solid rgba(10,10,10,0.25)",
                  background: on > 0.5 ? C.ink : "transparent", color: on > 0.5 ? C.paper : C.ink,
                }}
              >
                {t}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ position: "absolute", top: 690 - lift, left: 70, ...rise(frame, 60, 20, 80) }}>
        <AlertCard data={INDIA} open={open} />
      </div>
      <div style={{ position: "absolute", top: 1470 - lift, left: 70, opacity: (1 - secondGone) * rise(frame, 84, 20, 80).opacity, transform: rise(frame, 84, 20, 80).transform }}>
        <AlertCard data={JAPAN} open={0} compact />
      </div>
    </Scene>
  );
};

// ─── Scene 6: call to action ─────────────────────────────────────────────────
const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene len={S6} bg={C.ink}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 90px" }}>
        <Img src={staticFile("bee.png")} style={{ width: 170, ...rise(frame, 0, 18, 30) }} />
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 190, color: C.paper, marginTop: 30, ...rise(frame, 8, 20, 40) }}>
          TravalBee
        </div>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 110, color: "#F07A47", marginTop: 10, ...rise(frame, 20, 20, 40) }}>
          Know before you go.
        </div>
        <Kicker color={C.paper} style={{ marginTop: 40, fontSize: 32, ...rise(frame, 28, 16, 20), opacity: 0.7 * rise(frame, 28, 16, 20).opacity }}>Levels &middot; Alerts &middot; Updates</Kicker>
        <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 46, letterSpacing: "0.12em", color: C.paper, marginTop: 60, border: `3px solid ${C.paper}`, padding: "20px 36px", ...rise(frame, 40, 16, 30) }}>
          travalbee.com/news
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

export const NewsPromo: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Sequence from={0} durationInFrames={S1}><Hook /></Sequence>
    <Sequence from={S1} durationInFrames={S2}><Problem /></Sequence>
    <Sequence from={S1 + S2} durationInFrames={S3}><WorldMap /></Sequence>
    <Sequence from={S1 + S2 + S3} durationInFrames={S4}><CountryCard /></Sequence>
    <Sequence from={S1 + S2 + S3 + S4} durationInFrames={S5}><Alerts /></Sequence>
    <Sequence from={S1 + S2 + S3 + S4 + S5} durationInFrames={S6}><CallToAction /></Sequence>
  </AbsoluteFill>
);
