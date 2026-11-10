import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FONT_SANS, FONT_SERIF } from "../theme";
import { Caption, Cursor, Fade, FRAME_H, FRAME_W, Frame, Ripple, ShotStage, Zoomed, clamp, inOut, rise, useLayout } from "./kit";
import { LEN } from "./timing";

// ─── 1. Title ────────────────────────────────────────────────────────────────
export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { vertical } = useLayout();
  return (
    <Fade len={LEN.title} bg={C.ink}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <Img src={staticFile("logo.png")} style={{ width: vertical ? 300 : 260, ...rise(frame, 0, 18, 30) }} />
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: vertical ? 190 : 250, lineHeight: 1, color: C.paper, marginTop: 20, ...rise(frame, 8, 22, 40) }}>TravalBee</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: vertical ? 40 : 46, padding: vertical ? "0 70px" : 0, color: "rgba(245,240,232,0.78)", marginTop: 14, ...rise(frame, 24, 20, 30) }}>
          Curated luxury journeys, planned in minutes.
        </div>
        <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 28, letterSpacing: "0.3em", color: "#F07A47", marginTop: 60, ...rise(frame, 44, 18, 20) }}>HOW IT WORKS</div>
      </AbsoluteFill>
    </Fade>
  );
};

// ─── 2. Landing page (real capture) ──────────────────────────────────────────
export const LandingScene: React.FC = () => (
  <Fade len={LEN.landing}>
    <Caption step={1} title="Tell us where you're going." body="Start with a city or region and your dates. Not sure yet? Pick a mood and begin from there." />
    <Frame>
      <ShotStage
        src="home"
        views={[[0, 0.5, 0.5, 1], [40, 0.5, 0.5, 1], [75, 0.32, 0.74, 1.55], [180, 0.32, 0.74, 1.55]]}
        cursor={[[0, 0.62, 0.3], [70, 0.62, 0.3], [95, 0.1, 0.69], [140, 0.1, 0.69], [160, 0.12, 0.79]]}
        clicks={[100]}
        callouts={[
          { at: 80, until: 135, px: 0.1, py: 0.69, text: "Type a city or region", dx: 230, dy: -90 },
          { at: 135, until: 178, px: 0.12, py: 0.79, text: "Or start from a mood", dx: 250, dy: 70 },
        ]}
      />
    </Frame>
  </Fade>
);

// ─── 3. The form (rebuilt, animated) ─────────────────────────────────────────
const X0 = 235; // left edge of the form column inside the frame
const COLW = 760;

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 15, letterSpacing: "0.24em", textTransform: "uppercase", color: C.inkLight, marginBottom: 12 }}>{children}</div>
);

const Pill: React.FC<{ on: boolean; children: React.ReactNode; w?: number; small?: boolean }> = ({ on, children, w, small }) => (
  <div style={{ width: w, padding: small ? "16px 10px" : "14px 26px", border: `1.5px solid ${on ? C.ink : "rgba(10,10,10,0.22)"}`, background: on ? C.ink : "transparent", color: on ? C.paper : C.ink, fontFamily: FONT_SANS, fontWeight: 700, fontSize: small ? 15 : 17, letterSpacing: small ? "0.06em" : "0.12em", textTransform: "uppercase", textAlign: "center", whiteSpace: "nowrap" }}>
    {children}
  </div>
);

const Card: React.FC<{ on: boolean; title: string; sub: string; mark?: string }> = ({ on, title, sub, mark }) => (
  <div style={{ width: 240, height: 150, border: `1.5px solid ${on ? C.ink : "rgba(10,10,10,0.2)"}`, background: on ? C.ink : "transparent", color: on ? C.paper : C.ink, padding: 18, boxSizing: "border-box" }}>
    {mark && <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 34, opacity: 0.9 }}>{mark}</div>}
    <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 17, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: mark ? 6 : 36 }}>{title}</div>
    <div style={{ fontFamily: FONT_SANS, fontSize: 15, opacity: 0.7, marginTop: 6 }}>{sub}</div>
  </div>
);

export const FormScene: React.FC = () => {
  const f = useCurrentFrame();
  const at = { A: 0, B: 74, C: 124, D: 176, E: 238, F: 300, G: 372 };
  const top = { A: 40, B: 170, C: 320, D: 450, E: 670, F: 890, G: 1110 };
  const scroll = interpolate(f, [0, 74, 124, 176, 238, 300, 372, 400], [0, 0, 20, 150, 370, 590, 810, 810], { ...clamp, easing: inOut });

  const typed = "Paris, France".slice(0, Math.max(0, Math.floor((f - 10) / 3.4)));
  const caret = Math.floor(f / 8) % 2 === 0 ? "|" : " ";
  const dep = f > 84 ? "14 Jul" : "Add date";
  const ret = f > 100 ? "17 Jul" : "Return";
  const sel = {
    couple: f > 142, moderate: f > 198, luxury: f > 260,
    museums: f > 322, food: f > 338, culture: f > 354,
  };
  const submitting = f > 402;

  // Cursor path in content coordinates (frame x, content y), scrolled with the page.
  const keys: [number, number, number][] = [
    [0, 820, 120], [16, X0 + 130, 96],
    [78, X0 + 150, 226], [96, X0 + 520, 226],
    [128, X0 + 150, 280], [140, X0 + 190, 366],
    [180, X0 + 150, 420], [196, X0 + 380, 554],
    [242, X0 + 300, 620], [258, X0 + 640, 774],
    [304, X0 + 400, 800], [320, X0 + 130, 940], [336, X0 + 560, 940], [352, X0 + 130, 1010],
    [374, X0 + 400, 1060], [396, X0 + 380, 1170], [440, X0 + 380, 1170],
  ];
  const cx = interpolate(f, keys.map((k) => k[0]), keys.map((k) => k[1]), { ...clamp, easing: inOut });
  const cy = interpolate(f, keys.map((k) => k[0]), keys.map((k) => k[2]), { ...clamp, easing: inOut }) - scroll;
  const clickFrames = [20, 84, 100, 140, 198, 260, 322, 338, 354, 398];

  const sec = (k: keyof typeof at): React.CSSProperties => ({ position: "absolute", left: X0, top: top[k], width: COLW, ...rise(f, at[k], 16, 30) });
  const chip = (label: string, on: boolean) => <Pill on={on} w={232} small>{label}</Pill>;

  return (
    <Fade len={LEN.form}>
      <Caption step={2} title="Tell us about the trip." body="Who's travelling, your pace, your budget and what you love. It takes about a minute." />
      <Frame url="travalbee.com">
        <Zoomed region={800} cx={615} cy={384}>
        <div style={{ position: "absolute", left: 0, top: 0, width: FRAME_W, height: FRAME_H, background: C.paper }}>
          <div style={{ position: "absolute", left: 0, top: -scroll, width: FRAME_W }}>
            <div style={sec("A")}>
              <Label>Where to?</Label>
              <div style={{ height: 62, border: "1.5px solid rgba(10,10,10,0.22)", background: "#fff", padding: "0 22px", display: "flex", alignItems: "center", fontFamily: FONT_SANS, fontSize: 26, color: typed ? C.ink : "rgba(10,10,10,0.35)" }}>
                {typed || "A city or region"}{typed && f < 70 ? caret : ""}
              </div>
            </div>
            <div style={sec("B")}>
              <Label>When?</Label>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ flex: 1, height: 62, border: "1.5px solid rgba(10,10,10,0.22)", background: "#fff", padding: "0 22px", display: "flex", alignItems: "center", fontFamily: FONT_SANS, fontSize: 24, color: f > 84 ? C.ink : "rgba(10,10,10,0.35)" }}>{dep}</div>
                <div style={{ color: C.orange, fontSize: 30 }}>&rarr;</div>
                <div style={{ flex: 1, height: 62, border: "1.5px solid rgba(10,10,10,0.22)", background: "#fff", padding: "0 22px", display: "flex", alignItems: "center", fontFamily: FONT_SANS, fontSize: 24, color: f > 100 ? C.ink : "rgba(10,10,10,0.35)" }}>{ret}</div>
                {f > 108 && <div style={{ background: C.orange, color: "#fff", fontFamily: FONT_SANS, fontWeight: 700, fontSize: 15, letterSpacing: "0.16em", padding: "12px 16px", ...rise(f, 108, 10, 10) }}>3 DAYS</div>}
              </div>
            </div>
            <div style={sec("C")}>
              <Label>Who&rsquo;s travelling?</Label>
              <div style={{ display: "flex", gap: 14 }}>
                <Pill on={false}>Solo</Pill><Pill on={sel.couple}>Couple</Pill><Pill on={false}>Family</Pill><Pill on={false}>Group</Pill>
              </div>
            </div>
            <div style={sec("D")}>
              <Label>Pace</Label>
              <div style={{ display: "flex", gap: 20 }}>
                <Card on={false} title="Relaxed" sub="3–4 activities per day" />
                <Card on={sel.moderate} title="Moderate" sub="4–5 activities per day" />
                <Card on={false} title="Packed" sub="6–7 activities per day" />
              </div>
            </div>
            <div style={sec("E")}>
              <Label>Budget</Label>
              <div style={{ display: "flex", gap: 20 }}>
                <Card on={false} mark="$$" title="Economic" sub="Refined & considered" />
                <Card on={false} mark="$$$" title="Premium" sub="Effortlessly elevated" />
                <Card on={sel.luxury} mark="$$$$" title="Luxury" sub="Without compromise" />
              </div>
            </div>
            <div style={sec("F")}>
              <Label>What do you love?</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 232px)", gap: "16px 32px" }}>
                {chip("Sightseeing", false)}{chip("Museums & Art", sel.museums)}{chip("Food & Dining", sel.food)}
                {chip("Culture & History", sel.culture)}{chip("Photography", false)}{chip("Nightlife", false)}
              </div>
            </div>
            <div style={sec("G")}>
              <div style={{ height: 74, background: C.orange, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_SANS, fontWeight: 700, fontSize: 19, letterSpacing: "0.2em", textTransform: "uppercase", transform: `scale(${submitting ? 0.98 : 1})` }}>
                {submitting ? "Curating Your Journey…" : "Curate My Bespoke Itinerary"}
              </div>
            </div>
          </div>
          {clickFrames.map((c) => <Ripple key={c} x={cx} y={cy} t={interpolate(f, [c, c + 16], [0, 1], clamp)} />)}
          <Cursor x={cx} y={cy} press={clickFrames.reduce((m, c) => Math.max(m, interpolate(f, [c - 3, c, c + 5], [0, 1, 0], clamp)), 0)} />
        </div>
        </Zoomed>
      </Frame>
    </Fade>
  );
};

// ─── 4. Generation (rebuilt) ─────────────────────────────────────────────────
const STEPS = [
  "Reading your preferences…",
  "Shaping each day…",
  "Choosing tables for your diet and budget…",
  "Checking opening hours on Google Maps…",
  "Mapping your route…",
];

export const GenerateScene: React.FC = () => {
  const f = useCurrentFrame();
  const per = 40;
  const idx = Math.min(STEPS.length - 1, Math.floor((f - 14) / per));
  const local = (f - 14) - idx * per;
  const o = idx < 0 ? 0 : interpolate(local, [0, 10, per - 10, per], [0, 1, 1, idx === STEPS.length - 1 ? 1 : 0], clamp);
  return (
    <Fade len={LEN.generate}>
      <Caption step={3} title="Your concierge gets to work." body="One request builds everything: the days, the tables, opening hours and the route between stops." />
      <Frame>
        <Zoomed region={760} cx={615} cy={384}>
        <AbsoluteFill style={{ background: C.paper, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div style={{ position: "relative", width: 150, height: 150 }}>
            <div style={{ position: "absolute", inset: 0, border: "3px solid rgba(10,10,10,0.1)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", inset: 0, border: "3px solid transparent", borderTopColor: "rgba(10,10,10,0.5)", borderRadius: "50%", transform: `rotate(${f * 5}deg)` }} />
            <Img src={staticFile("logo.png")} style={{ position: "absolute", left: 38, top: 38, width: 74 }} />
          </div>
          <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 18, letterSpacing: "0.28em", color: C.inkLight, marginTop: 56 }}>YOUR CONCIERGE IS AT WORK</div>
          <div style={{ height: 120, marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
            <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 60, lineHeight: 1.05, color: C.ink, opacity: o, transform: `translateY(${(1 - o) * 14}px)` }}>
              {STEPS[Math.max(0, idx)]}
            </div>
          </div>
        </AbsoluteFill>
        </Zoomed>
      </Frame>
    </Fade>
  );
};
