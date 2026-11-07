import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FONT_SANS, FONT_SERIF } from "../theme";
import { Caption, Cursor, Fade, FRAME_H, FRAME_W, Frame, Ripple, ShotStage, clamp, inOut, rise } from "./kit";
import { LEN } from "./timing";

// ─── 5. The itinerary (real captures: day 1, 2, 3) ───────────────────────────
export const ItineraryScene: React.FC = () => {
  const f = useCurrentFrame();
  const D2 = 225;
  const D3 = 385;
  const layer = (start: number): React.CSSProperties => ({ opacity: interpolate(f, [start, start + 14], [0, 1], clamp) });
  return (
    <Fade len={LEN.itinerary}>
      <Caption step={4} title="Your trip, day by day." body="Real places with photos, ratings and opening hours, plus walking and driving times between stops." />
      <Frame url="travalbee.com/sample">
        <AbsoluteFill>
          <ShotStage
            src="sample-day1"
            frame={f}
            views={[[0, 0.5, 0.5, 1], [28, 0.5, 0.5, 1], [62, 0.25, 0.62, 1.7], [190, 0.25, 0.62, 1.7], [218, 0.3, 0.45, 1.15], [260, 0.3, 0.45, 1.15]]}
            cursor={[[0, 0.75, 0.8], [150, 0.75, 0.8], [200, 0.3, 0.4], [214, 0.214, 0.287], [260, 0.214, 0.287]]}
            clicks={[216]}
            callouts={[
              { at: 66, until: 125, px: 0.12, py: 0.56, text: "Real photos", dx: 190, dy: -110 },
              { at: 100, until: 160, px: 0.285, py: 0.672, text: "Ratings & price", dx: 190, dy: 90 },
              { at: 140, until: 195, px: 0.13, py: 0.737, text: "Walk & drive times", dx: 210, dy: 80 },
            ]}
          />
        </AbsoluteFill>
        <AbsoluteFill style={layer(D2)}>
          <ShotStage
            src="sample-day2"
            frame={Math.max(0, f - D2)}
            views={[[0, 0.3, 0.45, 1.15], [22, 0.76, 0.52, 1.6], [120, 0.76, 0.52, 1.6], [150, 0.3, 0.45, 1.15]]}
            cursor={[[0, 0.214, 0.287], [30, 0.8, 0.6], [100, 0.7, 0.45], [128, 0.4, 0.36], [144, 0.2815, 0.287], [175, 0.2815, 0.287]]}
            clicks={[148]}
            callouts={[{ at: 40, until: 120, px: 0.81, py: 0.642, text: "Pins are colour-coded by day", dx: -170, dy: -120 }]}
          />
        </AbsoluteFill>
        <AbsoluteFill style={layer(D3)}>
          <ShotStage
            src="sample-day3"
            frame={Math.max(0, f - D3)}
            views={[[0, 0.3, 0.45, 1.15], [30, 0.27, 0.58, 1.55], [100, 0.27, 0.58, 1.55], [140, 0.5, 0.5, 1]]}
            cursor={[[0, 0.2815, 0.287], [34, 0.2, 0.4], [90, 0.4, 0.7], [140, 0.6, 0.8]]}
            callouts={[{ at: 30, until: 100, px: 0.16, py: 0.384, text: "Every day has its own theme", dx: 300, dy: -60 }]}
          />
        </AbsoluteFill>
        {/* The "Day 2" / "Day 3" tab presses: a small ripple over the tab bar position of the captures */}
      </Frame>
    </Fade>
  );
};

// ─── 6. Hotels (real captures, slider tiers) ─────────────────────────────────
export const StaysScene: React.FC = () => {
  const f = useCurrentFrame();
  const views: [number, number, number, number][] = [[0, 0.5, 0.5, 1], [24, 0.28, 0.55, 1.5], [180, 0.28, 0.55, 1.5]];
  const cursor: [number, number, number][] = [[0, 0.6, 0.3], [26, 0.03, 0.48], [58, 0.03, 0.48], [76, 0.275, 0.48], [108, 0.275, 0.48], [128, 0.515, 0.48], [180, 0.515, 0.48]];
  const o4 = interpolate(f, [70, 82], [0, 1], clamp);
  const o5 = interpolate(f, [120, 132], [0, 1], clamp);
  return (
    <Fade len={LEN.stays}>
      <Caption step={5} title="Choose where to stay." body="Slide between Economic, Premium and Luxury. Each tier shows two curated hotels with a link to reserve." />
      <Frame url="travalbee.com/sample">
        <AbsoluteFill><ShotStage src="stays-3" frame={f} views={views} cursor={cursor} clicks={[28]} /></AbsoluteFill>
        <AbsoluteFill style={{ opacity: o4 }}><ShotStage src="stays-4" frame={f} views={views} cursor={cursor} /></AbsoluteFill>
        <AbsoluteFill style={{ opacity: o5 }}><ShotStage src="stays-5" frame={f} views={views} cursor={cursor} /></AbsoluteFill>
      </Frame>
    </Fade>
  );
};

// ─── 7. Save, share, PDF (rebuilt, animated) ─────────────────────────────────
const Toast: React.FC<{ title: string; body: string; f: number; start: number; end: number }> = ({ title, body, f, start, end }) => {
  const t = interpolate(f, [start, start + 12, end - 10, end], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", right: 36, bottom: 36, width: 400, background: C.paper, border: "1.5px solid rgba(10,10,10,0.18)", padding: "20px 24px", boxShadow: "0 18px 40px rgba(10,10,10,0.18)", opacity: t, transform: `translateY(${(1 - t) * 20}px)` }}>
      <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 21, color: C.ink }}>{title}</div>
      <div style={{ fontFamily: FONT_SANS, fontSize: 18, color: C.inkLight, marginTop: 6, lineHeight: 1.35 }}>{body}</div>
    </div>
  );
};

const PhotoCrop: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  // The Café de Flore photo, cropped from the real capture.
  const bw = w / 0.134;
  return <div style={{ width: w, height: h, backgroundImage: `url(${staticFile("shots/sample-day1.jpg")})`, backgroundSize: `${bw}px auto`, backgroundPosition: `${-0.056 * bw}px ${-0.442 * (bw / 1.6)}px` }} />;
};

const Btn: React.FC<{ label: string; on?: boolean; fill?: boolean; w?: number }> = ({ label, on, fill, w }) => (
  <div style={{ width: w, padding: "13px 22px", textAlign: "center", fontFamily: FONT_SANS, fontWeight: 700, fontSize: 15, letterSpacing: "0.16em", textTransform: "uppercase", border: `1.5px solid ${fill ? C.orange : on ? C.ink : "rgba(10,10,10,0.28)"}`, background: fill ? C.orange : on ? C.ink : "transparent", color: fill || on ? "#fff" : C.ink }}>{label}</div>
);

const NAV_H = 64;
const NavBar: React.FC<{ signedIn: boolean; hover: number }> = ({ signedIn, hover }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: FRAME_W, height: NAV_H, borderBottom: "1px solid rgba(10,10,10,0.1)", background: C.paper, display: "flex", alignItems: "center", padding: "0 28px", zIndex: 5 }}>
    <Img src={staticFile("bee.png")} style={{ width: 40, height: 40 }} />
    <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 34, color: C.ink, marginLeft: 14 }}>TravalBee</div>
    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 34, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 14, letterSpacing: "0.2em", color: C.inkLight }}>
      <span style={{ color: hover > 0.5 ? C.orange : C.inkLight, borderBottom: hover > 0.5 ? "2px solid " + C.orange : "2px solid transparent", paddingBottom: 3 }}>MY TRIPS</span>
      <span style={{ borderBottom: "2px solid transparent", paddingBottom: 3 }}>DASHBOARD</span>
      <span style={{ borderBottom: "2px solid transparent", paddingBottom: 3 }}>NEWS</span>
      <span style={{ borderBottom: "2px solid transparent", paddingBottom: 3 }}>PRICING</span>
      {signedIn ? (
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.ink, color: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, letterSpacing: 0 }}>A</div>
      ) : (
        <div style={{ border: "1.5px solid rgba(10,10,10,0.35)", padding: "10px 18px", color: C.ink }}>SIGN IN</div>
      )}
    </div>
  </div>
);

export const SaveScene: React.FC = () => {
  const f = useCurrentFrame();
  const signed = f > 34;
  const saved = f > 68;
  const toArchive = interpolate(f, [142, 156], [0, 1], clamp);
  const share = f > 206;
  const hoverTrips = interpolate(f, [128, 134, 150, 156], [0, 1, 1, 0], clamp);
  // Cursor path in frame coordinates: sign in, save, the My Trips link in the nav bar, then Share.
  const cur: [number, number, number][] = [
    [0, 900, 520], [24, 937, 178], [40, 937, 178], [58, 1027, 178], [70, 1027, 178],
    [96, 900, 300], [132, 746, 30], [146, 746, 30], [178, 600, 420], [200, 465, 555], [270, 465, 555],
  ];
  const cx = interpolate(f, cur.map((c) => c[0]), cur.map((c) => c[1]), { ...clamp, easing: inOut });
  const cy = interpolate(f, cur.map((c) => c[0]), cur.map((c) => c[2]), { ...clamp, easing: inOut });
  const clicks = [30, 66, 142, 205];
  const press = clicks.reduce((m, c) => Math.max(m, interpolate(f, [c - 3, c, c + 5], [0, 1, 0], clamp)), 0);
  return (
    <Fade len={LEN.save}>
      <Caption step={6} title="Keep it, share it." body="Sign in free to save the trip, send a link to your travel partner, or download a PDF." />
      <Frame url="travalbee.com">
        <AbsoluteFill style={{ background: C.paper }}>
          <NavBar signedIn={signed} hover={hoverTrips} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: NAV_H }}>
            {/* Itinerary header */}
            <div style={{ position: "absolute", inset: 0, opacity: 1 - toArchive }}>
              <div style={{ position: "absolute", left: 60, top: 40, fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 110, color: C.ink }}>Paris</div>
              <div style={{ position: "absolute", left: 66, top: 180, fontFamily: FONT_SANS, fontSize: 24, color: C.inkLight }}>Left Bank Icons &amp; Culinary Grandeur &middot; 3 days</div>
              <div style={{ position: "absolute", right: 60, top: 64, display: "flex", gap: 16, alignItems: "center" }}>
                {signed ? <Btn label={saved ? "Saved" : "Save"} fill w={150} /> : <Btn label="Sign In to Save or Download" on />}
                <div style={{ width: 52, height: 52, border: "1.5px solid rgba(10,10,10,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 5 5-5M5 20h14" /></svg>
                </div>
              </div>
              <div style={{ position: "absolute", left: 60, top: 250, width: 1110, height: 440, overflow: "hidden", border: "1.5px solid rgba(10,10,10,0.1)", backgroundImage: "url(" + staticFile("shots/sample-day1.jpg") + ")", backgroundSize: "2135px auto", backgroundPosition: "-30px -430px", opacity: 0.55 }} />
              {saved && <div style={{ position: "absolute", right: 60, top: 128, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 19, color: C.orange, opacity: interpolate(f, [74, 86, 118, 130], [0, 1, 1, 0], clamp) }}>Download a PDF anytime</div>}
            </div>
            {/* My Trips archive */}
            <div style={{ position: "absolute", inset: 0, opacity: toArchive }}>
              <div style={{ position: "absolute", left: 60, top: 30, fontFamily: FONT_SANS, fontWeight: 700, fontSize: 16, letterSpacing: "0.26em", color: C.inkLight }}>YOUR ARCHIVE</div>
              <div style={{ position: "absolute", left: 60, top: 60, fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 90, color: C.ink }}>My Trips</div>
              <div style={{ position: "absolute", left: 60, top: 220, width: 620, border: "1.5px solid rgba(10,10,10,0.12)", background: "#fff", display: "flex" }}>
                <PhotoCrop w={230} h={290} />
                <div style={{ padding: "26px 28px", flex: 1 }}>
                  <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 14, letterSpacing: "0.22em", color: C.inkLight }}>3 DAYS</div>
                  <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 58, color: C.ink, marginTop: 6 }}>Paris</div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 19, color: C.inkLight, marginTop: 8, lineHeight: 1.4 }}>&ldquo;Paris in July distills centuries of beauty into golden light&hellip;&rdquo;</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                    <Btn label="View Itinerary" on />
                    <Btn label="Share" on={share} />
                    <Btn label="Remove" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {saved && <Toast f={f} start={68} end={120} title="Passport Updated" body="This journey has been saved to your archive." />}
          {share && <Toast f={f} start={207} end={268} title="Link copied to clipboard" body="Anyone with the link can view this itinerary." />}
          {clicks.map((c) => <Ripple key={c} x={cx} y={cy} t={interpolate(f, [c, c + 16], [0, 1], clamp)} />)}
          <Cursor x={cx} y={cy} press={press} />
        </AbsoluteFill>
      </Frame>
    </Fade>
  );
};

// ─── 8. Travel news (real captures) ──────────────────────────────────────────
export const NewsScene: React.FC = () => {
  const f = useCurrentFrame();
  const A = 170;
  const second = interpolate(f, [A, A + 14], [0, 1], clamp);
  return (
    <Fade len={LEN.news}>
      <Caption step={7} title="Know before you go." body="Official advisory levels and live disaster alerts for 213 destinations, gathered from government sources." />
      <Frame url="travalbee.com/news">
        <AbsoluteFill>
          <ShotStage
            src="news-map"
            frame={f}
            views={[[0, 0.5, 0.5, 1], [30, 0.5, 0.5, 1], [70, 0.62, 0.5, 1.55], [150, 0.62, 0.5, 1.55], [175, 0.5, 0.5, 1.2]]}
            cursor={[[0, 0.95, 0.9], [60, 0.7, 0.4], [110, 0.56, 0.5], [160, 0.56, 0.5]]}
            callouts={[
              { at: 40, until: 100, px: 0.66, py: 0.3, text: "Level 4: do not travel", dx: -130, dy: -90 },
              { at: 100, until: 168, px: 0.58, py: 0.52, text: "Hover any country for its level", dx: -170, dy: 90 },
            ]}
          />
        </AbsoluteFill>
        <AbsoluteFill style={{ opacity: second }}>
          <ShotStage
            src="news-india-alerts"
            frame={Math.max(0, f - A)}
            views={[[0, 0.5, 0.5, 1], [28, 0.3, 0.43, 1.6], [150, 0.3, 0.43, 1.6]]}
            cursor={[[0, 0.7, 0.8], [40, 0.4, 0.5], [92, 0.205, 0.536], [150, 0.205, 0.536]]}
            clicks={[104]}
            callouts={[
              { at: 34, until: 100, px: 0.165, py: 0.293, text: "Live red alerts", dx: 330, dy: -90 },
              { at: 108, until: 158, px: 0.205, py: 0.536, text: "What it means for travellers", dx: 330, dy: 110 },
            ]}
          />
        </AbsoluteFill>
      </Frame>
    </Fade>
  );
};

// ─── 9. Close ────────────────────────────────────────────────────────────────
export const CloseScene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fade len={LEN.close} bg={C.ink}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <Img src={staticFile("bee.png")} style={{ width: 130, ...rise(f, 0, 16, 26) }} />
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 210, color: C.paper, lineHeight: 1, marginTop: 18, ...rise(f, 6, 20, 36) }}>Start planning.</div>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 80, color: "#F07A47", marginTop: 12, ...rise(f, 20, 20, 30) }}>Know before you go.</div>
        <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 44, letterSpacing: "0.14em", color: C.paper, marginTop: 60, border: `3px solid ${C.paper}`, padding: "20px 40px", ...rise(f, 36, 16, 26) }}>travalbee.com</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: "rgba(245,240,232,0.6)", marginTop: 40, ...rise(f, 50, 14, 20) }}>A product of OpsisX LLC</div>
      </AbsoluteFill>
    </Fade>
  );
};
