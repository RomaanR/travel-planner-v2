import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FONT_SANS, FONT_SERIF } from "../theme";

// ─── Layouts ─────────────────────────────────────────────────────────────────
// The same scenes render in two shapes: 1920x1080 (caption left, window right) and
// 1080x1920 (caption top, tall window below, clear of the Instagram top and bottom overlays).
export type Layout = { vertical: boolean; x: number; y: number; w: number; h: number; boost: number };

export const BAR_H = 44;
// Source space of the rebuilt (animated) scenes: the size of a desktop capture window.
export const FRAME_W = 1230;
export const FRAME_H = 769; // 16:10, the same shape as the captures

export const LANDSCAPE: Layout = { vertical: false, x: 600, y: Math.round((1080 - (FRAME_H + BAR_H)) / 2), w: FRAME_W, h: FRAME_H, boost: 1 };
export const VERTICAL: Layout = { vertical: true, x: 40, y: 720, w: 1000, h: 780, boost: 1 };

export const LayoutCtx = React.createContext<Layout>(LANDSCAPE);
export const useLayout = () => React.useContext(LayoutCtx);

export const ease = Easing.out(Easing.cubic);
export const inOut = Easing.inOut(Easing.cubic);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function rise(frame: number, start: number, dur = 18, distance = 36) {
  const t = interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: ease });
  return { opacity: t, transform: `translateY(${(1 - t) * distance}px)` } as React.CSSProperties;
}

/** Scene-level fade in and out. */
export const Fade: React.FC<{ len: number; children: React.ReactNode; bg?: string }> = ({ len, children, bg = C.paper }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, len - 10, len], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ background: bg, opacity }}>{children}</AbsoluteFill>;
};

// ─── Window chrome ───────────────────────────────────────────────────────────
export const Frame: React.FC<{ url?: string; children: React.ReactNode; bg?: string }> = ({ url = "travalbee.com", children, bg = C.paper }) => {
  const L = useLayout();
  return (
    <div
      style={{
        position: "absolute", left: L.x, top: L.y, width: L.w, height: L.h + BAR_H,
        boxShadow: "0 40px 90px rgba(10,10,10,0.22), 0 0 0 1px rgba(10,10,10,0.12)", background: bg, overflow: "hidden",
      }}
    >
      <div style={{ height: BAR_H, background: "#1B1817", display: "flex", alignItems: "center", gap: 10, padding: "0 18px" }}>
        {["#C2410C", "#E3B934", "#5B8A5A"].map((c) => (
          <div key={c} style={{ width: 12, height: 12, background: c, opacity: 0.85 }} />
        ))}
        <div style={{ marginLeft: 18, fontFamily: FONT_SANS, fontSize: 18, color: "rgba(245,240,232,0.6)", letterSpacing: "0.04em" }}>{url}</div>
      </div>
      <div style={{ position: "relative", width: L.w, height: L.h, overflow: "hidden" }}>{children}</div>
    </div>
  );
};

/**
 * Rebuilt scenes are drawn in a fixed 1230 x 769 "source space". In the landscape layout this is shown
 * 1:1; in the vertical layout it is scaled so only the part that matters (centred on cx, cy, `region`
 * source pixels wide) fills the taller window.
 */
export const Zoomed: React.FC<{ children: React.ReactNode; cx?: number; cy?: number; region?: number }> = ({ children, cx = FRAME_W / 2, cy = FRAME_H / 2, region = FRAME_W }) => {
  const L = useLayout();
  const scale = L.vertical ? L.w / region : 1;
  const sw = FRAME_W * scale;
  const sh = FRAME_H * scale;
  const place = (size: number, frame: number, center: number) =>
    size <= frame ? (frame - size) / 2 : Math.min(0, Math.max(frame - size, frame / 2 - center * scale));
  const left = place(sw, L.w, cx);
  const top = place(sh, L.h, cy);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: L.w, height: L.h, overflow: "hidden", background: C.paper }}>
      <div style={{ position: "absolute", left, top, width: FRAME_W, height: FRAME_H, transform: `scale(${scale})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
};

/** Keeps the cursor and click ripples in front of everything else in a single-layer scene. */
export const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none" }}>{children}</div>
);

// ─── Zoomable screenshot with an animated cursor and callouts ────────────────
export type View = [frame: number, fx: number, fy: number, scale: number]; // centre point as fractions of the image
export type CursorKey = [frame: number, px: number, py: number]; // position as fractions of the image

function lerpKeys<T extends number[]>(frame: number, keys: T[], idx: number): number {
  const frames = keys.map((k) => k[0]);
  const vals = keys.map((k) => k[idx]);
  return interpolate(frame, frames, vals, { ...clamp, easing: inOut });
}

export function viewAt(frame: number, views: View[], L: Layout) {
  const fx = lerpKeys(frame, views, 1);
  const fy = lerpKeys(frame, views, 2);
  const s0 = lerpKeys(frame, views, 3);
  // Never crop below the full page width: at scale 1 the whole page is visible. In the tall layout the
  // page then sits centred with a little background above and below instead of being cut at the sides.
  const s = Math.max(1, s0 > 1.25 ? s0 * L.boost : s0);
  const Ws = L.w * s;
  const Hs = (L.w / 1.6) * s;
  const place = (size: number, window: number, centre: number) =>
    size <= window ? (window - size) / 2 : Math.min(0, Math.max(window - size, window / 2 - centre * size));
  return { Ws, Hs, left: place(Ws, L.w, fx), top: place(Hs, L.h, fy) };
}

// Cursor and ripple have no z-index of their own: stacked screenshot layers each draw their own
// cursor, and a forced z-index would show the hidden layers' cursors through the top one.
export const Cursor: React.FC<{ x: number; y: number; press?: number }> = ({ x, y, press = 0 }) => (
  <svg width="34" height="34" viewBox="0 0 24 24" style={{ position: "absolute", left: x - 4, top: y - 3, transform: `scale(${1 - press * 0.12})`, filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))" }}>
    <path d="M4 2 L4 19 L8.6 14.8 L11.6 21.6 L14.2 20.4 L11.2 13.8 L17.4 13.4 Z" fill="#0A0A0A" stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const Ripple: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) =>
  t <= 0 || t >= 1 ? null : (
    <div style={{ position: "absolute", left: x - 30, top: y - 30, width: 60, height: 60, border: `3px solid ${C.orange}`, borderRadius: "50%", opacity: 1 - t, transform: `scale(${0.4 + t * 1.2})` }} />
  );

export type Callout = { at: number; until: number; px: number; py: number; text: string; dx?: number; dy?: number; v?: { dx: number; dy: number } }; // v: offset override for the tall layout

export const ShotStage: React.FC<{
  src: string;
  views: View[];
  cursor?: CursorKey[];
  clicks?: number[];
  callouts?: Callout[];
  frame?: number; // override the local frame (used when a stage is nested)
}> = ({ src, views, cursor, clicks = [], callouts = [], frame: forced }) => {
  const L = useLayout();
  const local = useCurrentFrame();
  const frame = forced ?? local;
  const { Ws, Hs, left, top } = viewAt(frame, views, L);
  const toScreen = (px: number, py: number) => ({ x: left + px * Ws, y: top + py * Hs });
  const cur = cursor ? toScreen(lerpKeys(frame, cursor, 1), lerpKeys(frame, cursor, 2)) : null;
  const press = clicks.reduce((m, c) => Math.max(m, interpolate(frame, [c - 3, c, c + 5], [0, 1, 0], clamp)), 0);

  return (
    <AbsoluteFill>
      <Img src={staticFile(`shots/${src}.jpg`)} style={{ position: "absolute", left, top, width: Ws, height: Hs }} />
      {callouts.map((c, i) => {
        const p = toScreen(c.px, c.py);
        const o = interpolate(frame, [c.at, c.at + 10, c.until - 10, c.until], [0, 1, 1, 0], clamp);
        // Keep the label inside the window (it matters in the narrower tall layout).
        const half = (c.text.length * 13 + 40) / 2;
        const off = L.vertical && c.v ? c.v : { dx: c.dx ?? 0, dy: c.dy ?? -70 };
        const lx = Math.min(Math.max(p.x + off.dx, half + 10), L.w - half - 10);
        const ly = Math.min(Math.max(p.y + off.dy, 70), L.h - 24);
        return (
          <div key={i} style={{ opacity: o }}>
            <div style={{ position: "absolute", left: p.x, top: p.y, width: 16, height: 16, marginLeft: -8, marginTop: -8, background: C.orange, borderRadius: "50%", boxShadow: "0 0 0 6px rgba(194,65,12,0.28)" }} />
            <svg style={{ position: "absolute", left: 0, top: 0, width: L.w, height: L.h, overflow: "visible" }}>
              <line x1={p.x} y1={p.y} x2={lx} y2={ly} stroke={C.orange} strokeWidth={3} />
            </svg>
            <div style={{ position: "absolute", left: lx, top: ly, transform: "translate(-50%, -100%)", background: C.orange, color: "#fff", fontFamily: FONT_SANS, fontWeight: 700, fontSize: 24, padding: "12px 20px", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
              {c.text}
            </div>
          </div>
        );
      })}
      {clicks.map((c) => {
        if (!cur) return null;
        return <Ripple key={c} x={cur.x} y={cur.y} t={interpolate(frame, [c, c + 18], [0, 1], clamp)} />;
      })}
      {cur && <Cursor x={cur.x} y={cur.y} press={press} />}
    </AbsoluteFill>
  );
};

// ─── Caption ─────────────────────────────────────────────────────────────────
export const TOTAL_STEPS = 7;

export const Caption: React.FC<{ step: number; title: string; body: string; delay?: number }> = ({ step, title, body, delay = 6 }) => {
  const frame = useCurrentFrame();
  const { vertical } = useLayout();
  const box: React.CSSProperties = vertical ? { left: 70, top: 190, width: 940 } : { left: 90, top: 215, width: 460 };
  return (
    <>
      <div style={{ position: "absolute", ...box }}>
        <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: vertical ? 28 : 24, letterSpacing: "0.22em", color: C.orange, ...rise(frame, delay, 14, 20) }}>
          STEP {String(step).padStart(2, "0")} / {String(TOTAL_STEPS).padStart(2, "0")}
        </div>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: vertical ? 104 : 92, lineHeight: vertical ? 1.0 : 0.98, color: C.ink, marginTop: vertical ? 18 : 22, ...rise(frame, delay + 6, 20, 40) }}>{title}</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: vertical ? 38 : 31, lineHeight: 1.4, color: C.inkLight, marginTop: vertical ? 24 : 30, ...rise(frame, delay + 16, 20, 30) }}>{body}</div>
      </div>
      <div style={vertical ? { position: "absolute", left: 70, top: 1624, display: "flex", gap: 10 } : { position: "absolute", left: 90, bottom: 70, display: "flex", gap: 10 }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} style={{ width: i + 1 === step ? 46 : 14, height: 6, background: i + 1 <= step ? C.orange : "rgba(10,10,10,0.18)" }} />
        ))}
      </div>
    </>
  );
};
