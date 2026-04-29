"use client";

import { useEffect, useMemo, useState } from "react";

const LAUNCH_AT = "2026-05-06T12:00:00-04:00";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
};

function getTimeLeft(targetTime: number): TimeLeft {
  const diff = Math.max(0, targetTime - Date.now());
  const totalSeconds = Math.floor(diff / 1000);

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    isLive: diff <= 0,
  };
}

function formatUnit(value: number | undefined): string {
  if (typeof value !== "number") return "--";
  return String(value).padStart(2, "0");
}

type LaunchCountdownProps = {
  variant?: "hero" | "compact";
};

export default function LaunchCountdown({ variant = "hero" }: LaunchCountdownProps) {
  const targetTime = useMemo(() => new Date(LAUNCH_AT).getTime(), []);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const tick = () => setTimeLeft(getTimeLeft(targetTime));
    tick();

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [targetTime]);

  const units = [
    { label: "Days", value: timeLeft?.days },
    { label: "Hrs", value: timeLeft?.hours },
    { label: "Min", value: timeLeft?.minutes },
    { label: "Sec", value: timeLeft?.seconds },
  ];

  if (variant === "compact") {
    return (
      <div className="w-full border border-white/45 bg-paper/95 px-4 py-3 text-ink shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="micro-copy flex items-center gap-2 text-ink">
              <span>Going Live</span>
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-burnt-orange shadow-[0_0_12px_rgba(211,70,14,0.85)]" />
            </p>
            <p className="mt-0.5 truncate font-sans text-[10px] leading-none text-ink-light">
              May 6, 12 PM EDT
            </p>
          </div>

          {timeLeft?.isLive ? (
            <p className="shrink-0 font-serif text-xl italic leading-none text-ink">
              Live
            </p>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 font-serif text-base italic leading-none text-ink min-[390px]:gap-2 min-[390px]:text-lg sm:text-xl">
              <span>{formatUnit(timeLeft?.days)}D</span>
              <span className="text-ink/25">/</span>
              <span>{formatUnit(timeLeft?.hours)}H</span>
              <span className="text-ink/25">/</span>
              <span>{formatUnit(timeLeft?.minutes)}M</span>
              <span className="text-ink/25">/</span>
              <span>{formatUnit(timeLeft?.seconds)}S</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 w-full max-w-sm border border-white/25 bg-black/35 px-4 py-4 text-white shadow-[0_24px_60px_rgba(0,0,0,0.22)] backdrop-blur-md">
      <div className="mb-3 flex items-start justify-between gap-4 border-b border-white/15 pb-3">
        <div>
          <p className="micro-copy text-white/60">Going Live</p>
          <p className="mt-1 font-sans text-xs leading-relaxed text-white/70">
            Wednesday, May 6 at 12:00 PM EDT
          </p>
        </div>
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-burnt-orange shadow-[0_0_18px_rgba(211,70,14,0.9)]" />
      </div>

      {timeLeft?.isLive ? (
        <p className="font-serif text-2xl italic leading-none text-white">
          We are live.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2" aria-label="Launch countdown">
          {units.map((unit) => (
            <div key={unit.label} className="border border-white/10 bg-white/10 px-2 py-2 text-center">
              <p className="font-serif text-2xl italic leading-none text-white">
                {formatUnit(unit.value)}
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">
                {unit.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
