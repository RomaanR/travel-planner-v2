import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FONT_SANS, FONT_SERIF } from "../theme";

// Layout: caption column on the left, product window on the right (1920 x 1080).
export const FRAME_X = 600;
export const FRAME_W = 1230;
export const FRAME_H = 769; // 16:10, the same shape as the captures
export const BAR_H = 44;
export const FRAME_Y = Math.round((1080 - (FRAME_H + BAR_H)) / 2);

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
export const Frame: React.FC<{ url?: string; children: React.ReactNode; bg?: string }> = ({ url = "travalbee.com", children, bg = C.paper }) => (
  <div
    style={{
      position: "absolute", left: FRAME_X, top: FRAME_Y, width: FRAME_W, height: FRAME_H + BAR_H,
      boxShadow: "0 40px 90px rgba(10,10,10,0.22), 0 0 0 1px rgba(10,10,10,0.12)", background: bg, overflow: "hidden",
    }}
  >
    <div style={{ height: BAR_H, background: "#1B1817", display: "flex", alignItems: "center", gap: 10, padding: "0 18px" }}>
      {["#C2410C", "#E3B934", "#5B8A5A"].map((c) => (
        <div key={c} style={{ width: 12, height: 12, background: c, opacity: 0.85 }} />
      ))}
      <div style={{ marginLeft: 18, fontFamily: FONT_SANS, fontSize: 18, color: "rgba(245,240,232,0.6)", letterSpacing: "0.04em" }}>{url}</div>
    </div>
    <div style={{ position: "relative", width: FRAME_W, height: FRAME_H, overflow: "hidden" }}>{children}</div>
  </div>
);

// ─── Zoomable screenshot with an animated cursor and callouts ────────────────
export type View = [frame: number, fx: number, fy: number, scale: number]; // centre point as fractions of the image
export type CursorKey = [frame: number, px: number, py: number]; // position as fractions of the image

function lerpKeys<T extends number[]>(frame: number, keys: T[], idx: number): number {
  const frames = keys.map((k) => k[0]);
  const vals = keys.map((k) => k[idx]);
  return interpolate(frame, frames, vals, { ...clamp, easing: inOut });
}

export function viewAt(frame: number, views: View[]) {
  const fx = lerpKeys(frame, views, 1);
  const fy = lerpKeys(frame, views, 2);
  const s = lerpKeys(frame, views, 3);
  const Ws = FRAME_W * s;
  const Hs = FRAME_H * s;
  const left = Math.min(0, Math.max(FRAME_W - Ws, FRAME_W / 2 - fx * Ws));
  const top = Math.min(0, Math.max(FRAME_H - Hs, FRAME_H / 2 - fy * Hs));
  return { Ws, Hs, left, top };
}

export const Cursor: React.FC<{ x: number; y: number; press?: number }> = ({ x, y, press = 0 }) => (
  <svg width="34" height="34" viewBox="0 0 24 24" style={{ position: "absolute", zIndex: 20, left: x - 4, top: y - 3, transform: `scale(${1 - press * 0.12})`, filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))" }}>
    <path d="M4 2 L4 19 L8.6 14.8 L11.6 21.6 L14.2 20.4 L11.2 13.8 L17.4 13.4 Z" fill="#0A0A0A" stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const Ripple: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) =>
  t <= 0 || t >= 1 ? null : (
    <div style={{ position: "absolute", zIndex: 20, left: x - 30, top: y - 30, width: 60, height: 60, border: `3px solid ${C.orange}`, borderRadius: "50%", opacity: 1 - t, transform: `scale(${0.4 + t * 1.2})` }} />
  );

export type Callout = { at: number; until: number; px: number; py: number; text: string; dx?: number; dy?: number };

export const ShotStage: React.FC<{
  src: string;
  views: View[];
  cursor?: CursorKey[];
  clicks?: number[];
  callouts?: Callout[];
  frame?: number; // override the local frame (used when a stage is nested)
}> = ({ src, views, cursor, clicks = [], callouts = [], frame: forced }) => {
  const local = useCurrentFrame();
  const frame = forced ?? local;
  const { Ws, Hs, left, top } = viewAt(frame, views);
  const toScreen = (px: number, py: number) => ({ x: left + px * Ws, y: top + py * Hs });
  const cur = cursor ? toScreen(lerpKeys(frame, cursor, 1), lerpKeys(frame, cursor, 2)) : null;
  const press = clicks.reduce((m, c) => Math.max(m, interpolate(frame, [c - 3, c, c + 5], [0, 1, 0], clamp)), 0);

  return (
    <AbsoluteFill>
      <Img src={staticFile(`shots/${src}.jpg`)} style={{ position: "absolute", left, top, width: Ws, height: Hs }} />
      {callouts.map((c, i) => {
        const p = toScreen(c.px, c.py);
        const o = interpolate(frame, [c.at, c.at + 10, c.until - 10, c.until], [0, 1, 1, 0], clamp);
        const dx = c.dx ?? 0;
        const dy = c.dy ?? -70;
        return (
          <div key={i} style={{ opacity: o }}>
            <div style={{ position: "absolute", left: p.x, top: p.y, width: 16, height: 16, marginLeft: -8, marginTop: -8, background: C.orange, borderRadius: "50%", boxShadow: "0 0 0 6px rgba(194,65,12,0.28)" }} />
            <svg style={{ position: "absolute", left: 0, top: 0, width: FRAME_W, height: FRAME_H, overflow: "visible" }}>
              <line x1={p.x} y1={p.y} x2={p.x + dx} y2={p.y + dy} stroke={C.orange} strokeWidth={3} />
            </svg>
            <div style={{ position: "absolute", left: p.x + dx, top: p.y + dy, transform: "translate(-50%, -100%)", background: C.orange, color: "#fff", fontFamily: FONT_SANS, fontWeight: 700, fontSize: 24, padding: "12px 20px", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
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

// ─── Caption column ──────────────────────────────────────────────────────────
export const TOTAL_STEPS = 7;

export const Caption: React.FC<{ step: number; title: string; body: string; delay?: number }> = ({ step, title, body, delay = 6 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <div style={{ position: "absolute", left: 90, top: 215, width: 460 }}>
        <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 24, letterSpacing: "0.22em", color: C.orange, ...rise(frame, delay, 14, 20) }}>
          STEP {String(step).padStart(2, "0")} / {String(TOTAL_STEPS).padStart(2, "0")}
        </div>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 92, lineHeight: 0.98, color: C.ink, marginTop: 22, ...rise(frame, delay + 6, 20, 40) }}>{title}</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 31, lineHeight: 1.42, color: C.inkLight, marginTop: 30, ...rise(frame, delay + 16, 20, 30) }}>{body}</div>
      </div>
      <div style={{ position: "absolute", left: 90, bottom: 70, display: "flex", gap: 10 }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} style={{ width: i + 1 === step ? 46 : 14, height: 6, background: i + 1 <= step ? C.orange : "rgba(10,10,10,0.18)" }} />
        ))}
      </div>
    </>
  );
};
