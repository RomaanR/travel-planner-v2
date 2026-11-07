// Builds placeholder music and sound effects (plain synthesised tones, no licensed material) and
// checks that every voice clip finishes before the next one starts.
// Usage: node audio/make-sound.js
const fs = require("fs");
const path = require("path");

const SR = 44100;
const FPS = 30;
const TOTAL_FRAMES = 885;
const out = path.join(__dirname, "..", "public", "audio");
fs.mkdirSync(out, { recursive: true });

function writeWav(file, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(out, file), Buffer.concat([h, data]));
}

// Audible extent of a 16-bit mono WAV: seconds from the file start to the last sample above a threshold.
function wavSeconds(file) {
  const b = fs.readFileSync(file);
  const rate = b.readUInt32LE(24);
  let p = 12;
  while (p < b.length - 8) {
    const id = b.toString("ascii", p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (id === "data") {
      const n = Math.floor(size / 2);
      let last = 0;
      for (let i = 0; i < n; i++) if (Math.abs(b.readInt16LE(p + 8 + i * 2)) > 600) last = i;
      return last / rate;
    }
    p += 8 + size;
  }
  return NaN;
}

// ── Music: four slow chords (Am, F, C, G) with soft crossfades ────────────────
const seconds = TOTAL_FRAMES / FPS;
const chords = [
  [110.0, 164.81, 220.0, 261.63],
  [87.31, 130.81, 174.61, 220.0],
  [130.81, 196.0, 261.63, 329.63],
  [98.0, 146.83, 196.0, 246.94],
];
const music = new Float32Array(Math.ceil(seconds * SR));
const per = seconds / chords.length;
const xf = 1.6;
for (let i = 0; i < music.length; i++) {
  const t = i / SR;
  let s = 0;
  chords.forEach((notes, ci) => {
    const start = ci * per - xf / 2;
    const end = (ci + 1) * per + xf / 2;
    let w = 0;
    if (t >= start && t <= end) {
      const a = Math.min(1, (t - start) / xf);
      const r = Math.min(1, (end - t) / xf);
      w = Math.min(a, r);
    }
    if (w > 0) {
      for (const f of notes) {
        const lfo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.2 * t + f);
        s += w * lfo * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2.003 * t)) * 0.07;
      }
    }
  });
  const fadeIn = Math.min(1, t / 1.2);
  const fadeOut = Math.min(1, (seconds - t) / 2.0);
  music[i] = s * fadeIn * fadeOut;
}
writeWav("music.wav", music);

// ── Effects ───────────────────────────────────────────────────────────────────
function tone(freq, dur, { decay = 8, gain = 0.5, slideTo = null } = {}) {
  const n = Math.floor(dur * SR);
  const a = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = slideTo ? freq + (slideTo - freq) * (t / dur) : freq;
    phase += (2 * Math.PI * f) / SR;
    a[i] = Math.sin(phase) * Math.exp(-decay * t) * gain * Math.min(1, t / 0.004);
  }
  return a;
}
writeWav("sfx-tick.wav", tone(1500, 0.12, { decay: 40, gain: 0.35 }));
writeWav("sfx-chime.wav", tone(880, 0.7, { decay: 5, gain: 0.35 }));
writeWav("sfx-alert.wav", tone(120, 0.9, { decay: 4.5, gain: 0.8, slideTo: 60 }));

// ── Timing check for the voice clips ──────────────────────────────────────────
const script = JSON.parse(fs.readFileSync(path.join(__dirname, "script.json"), "utf8"));
let problems = 0;
script.forEach((l, i) => {
  const dur = wavSeconds(path.join(out, `vo-${l.id}.wav`));
  const endFrame = l.start + Math.ceil(dur * FPS);
  const next = script[i + 1] ? script[i + 1].start : TOTAL_FRAMES;
  const ok = endFrame <= next - 2;
  if (!ok) problems++;
  console.log(
    `${l.id.padEnd(12)} start ${String(l.start).padStart(3)}  ${dur.toFixed(2)}s  ends f${endFrame}  next f${next}  ${ok ? "ok" : "OVERLAPS"}`
  );
});
console.log(problems ? `${problems} clip(s) overlap` : "all voice clips fit");
