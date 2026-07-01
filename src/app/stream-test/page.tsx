"use client";

import { useState, useRef } from "react";
import type { DayPlan } from "@/types/itinerary";

// ─── Types ────────────────────────────────────────────────────────────────────

type StreamEvent =
  | { type: "start";      destination: string; totalDays: number }
  | { type: "enriching";  day: number; daysEmitted: number; totalDays: number }
  | { type: "day";        day: DayPlan; daysEmitted: number; totalDays: number; elapsedMs: number }
  | { type: "done";       editorial: string; inputTokens: number; outputTokens: number; stopReason: string; elapsedMs: number; cacheHits: number; googleCalls: number }
  | { type: "error";      message: string };

type LogEntry = { ts: number; text: string; kind: "info" | "success" | "warn" | "error" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StreamTestPage() {
  const [destination, setDestination]   = useState("Tokyo");
  const [duration, setDuration]         = useState(3);
  const [running, setRunning]           = useState(false);
  const [days, setDays]                 = useState<DayPlan[]>([]);
  const [editorial, setEditorial]       = useState("");
  const [log, setLog]                   = useState<LogEntry[]>([]);
  const [stats, setStats]               = useState<{ inputTokens: number; outputTokens: number; elapsedMs: number; cacheHits: number; googleCalls: number } | null>(null);
  const [enrichingDay, setEnrichingDay] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function addLog(text: string, kind: LogEntry["kind"] = "info") {
    setLog((prev) => [...prev, { ts: Date.now(), text, kind }]);
  }

  function reset() {
    setDays([]);
    setEditorial("");
    setLog([]);
    setStats(null);
    setEnrichingDay(null);
  }

  async function run() {
    reset();
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const departureDate = new Date("2026-08-01T00:00:00Z");
    const returnDate = new Date(departureDate);
    returnDate.setUTCDate(returnDate.getUTCDate() + duration - 1);

    addLog(`Starting stream — ${destination} · ${duration} day(s)`, "info");

    try {
      const res = await fetch("/api/itinerary-stream", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          placeId: "stream-test",
          duration,
          lat: 35.6762,
          lng: 139.6503,
          travelParty: "couple",
          pace: "moderate",
          budgetTier: "luxury",
          departureDate: "2026-08-01",
          returnDate: returnDate.toISOString().slice(0, 10),
          dietary: [],
          interests: ["sightseeing", "food-dining"],
        }),
        signal:  controller.signal,
      });

      if (!res.ok || !res.body) {
        addLog(`HTTP ${res.status} — stream failed`, "error");
        setRunning(false);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   leftover = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = leftover + decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        leftover = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: StreamEvent;
          try { event = JSON.parse(line); } catch { continue; }

          switch (event.type) {
            case "start":
              addLog(`Stream open — expecting ${event.totalDays} day(s)`, "info");
              break;

            case "enriching":
              setEnrichingDay(event.day);
              addLog(`Day ${event.day} received from Claude — enriching with Google Places…`, "info");
              break;

            case "day": {
              const elapsed = ((event.elapsedMs) / 1000).toFixed(1);
              setEnrichingDay(null);
              setDays((prev) => [...prev, event.day]);
              addLog(`✓ Day ${event.day} ready at ${elapsed}s — ${event.day.timeline?.length ?? 0} items`, "success");
              break;
            }

            case "done":
              setEditorial(event.editorial);
              setStats({
                inputTokens:  event.inputTokens,
                outputTokens: event.outputTokens,
                elapsedMs:    event.elapsedMs,
                cacheHits:    event.cacheHits,
                googleCalls:  event.googleCalls,
              });
              addLog(`Stream complete — ${(event.elapsedMs / 1000).toFixed(1)}s total · in=${event.inputTokens} out=${event.outputTokens} tokens · stop=${event.stopReason}`, "success");
              addLog(`Google: ${event.googleCalls} calls · Cache hits: ${event.cacheHits}`, "info");
              break;

            case "error":
              addLog(`Error: ${event.message}`, "error");
              break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        addLog(`Fetch error: ${(e as Error).message}`, "error");
      }
    } finally {
      setRunning(false);
      setEnrichingDay(null);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    addLog("Aborted by user", "warn");
    setRunning(false);
  }

  const totalElapsed = stats ? (stats.elapsedMs / 1000).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">

      {/* Header */}
      <div className="border-b border-ink/10 px-8 py-8">
        <p className="micro-copy text-ink-light mb-1">Local Dev Only · Streaming Test Harness</p>
        <h1 className="font-serif italic text-5xl text-ink leading-none mb-1">Stream Test</h1>
        <p className="micro-copy text-ink-light">
          Tests <code className="font-mono bg-ink/5 px-1">/api/itinerary-stream</code> — days render as they arrive from Claude.
          Each run uses the live generation pipeline and counts toward normal limits.
        </p>
      </div>

      <div className="px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT: Controls + log */}
        <div className="space-y-6">

          {/* Controls */}
          <div className="border border-ink/10 p-6 space-y-4">
            <p className="micro-copy text-ink">Request</p>

            <div className="space-y-1">
              <label className="micro-copy text-ink-light">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={running}
                className="w-full border border-ink/20 bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="micro-copy text-ink-light">Days: {duration}</label>
              <input
                type="range"
                min={1}
                max={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={running}
                className="w-full accent-burnt-orange disabled:opacity-50"
              />
              <div className="flex justify-between micro-copy text-ink-light/50">
                <span>1</span><span>5</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={run}
                disabled={running}
                className="flex-1 micro-copy bg-ink text-paper py-3 hover:bg-burnt-orange transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {running ? "Generating…" : "Run Stream"}
              </button>
              {running && (
                <button
                  onClick={stop}
                  className="micro-copy border border-burnt-orange text-burnt-orange px-6 py-3 hover:bg-burnt-orange hover:text-white transition-colors"
                >
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="border border-ink/10 p-6">
              <p className="micro-copy text-ink mb-4">Generation Stats</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Total time",    value: `${totalElapsed}s` },
                  { label: "Input tokens",  value: stats.inputTokens.toLocaleString() },
                  { label: "Output tokens", value: stats.outputTokens.toLocaleString() },
                  { label: "Google calls",  value: stats.googleCalls },
                  { label: "Cache hits",    value: stats.cacheHits },
                  { label: "Days received", value: days.length },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="micro-copy text-ink-light">{label}</p>
                    <p className="font-serif italic text-2xl text-ink">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event log */}
          <div className="border border-ink/10">
            <div className="border-b border-ink/10 px-4 py-3 flex items-center justify-between">
              <p className="micro-copy text-ink">Event Log</p>
              {log.length > 0 && (
                <button onClick={() => setLog([])} className="micro-copy text-ink-light hover:text-ink">
                  Clear
                </button>
              )}
            </div>
            <div className="p-4 space-y-1.5 min-h-[120px] max-h-[320px] overflow-y-auto font-mono text-xs">
              {log.length === 0 && (
                <p className="text-ink-light/40">No events yet — run the stream to see timing data.</p>
              )}
              {log.map((entry, i) => (
                <div key={i} className={
                  entry.kind === "success" ? "text-emerald-accent" :
                  entry.kind === "error"   ? "text-burnt-orange" :
                  entry.kind === "warn"    ? "text-amber-600" :
                  "text-ink-light"
                }>
                  <span className="text-ink/20 mr-2 select-none">
                    +{((entry.ts - (log[0]?.ts ?? entry.ts)) / 1000).toFixed(1)}s
                  </span>
                  {entry.text}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT: Days as they arrive */}
        <div className="space-y-4">

          {editorial && (
            <div className="border-b border-ink/10 pb-4">
              <p className="micro-copy text-ink-light mb-1">Editorial opener</p>
              <p className="font-serif italic text-xl text-ink">&ldquo;{editorial}&rdquo;</p>
            </div>
          )}

          {days.length === 0 && !running && (
            <div className="border border-ink/10 p-12 text-center">
              <p className="font-serif italic text-2xl text-ink-light">Days will appear here as they stream in</p>
              <p className="micro-copy text-ink-light mt-2">Each day renders immediately after Claude + Google enrichment completes</p>
            </div>
          )}

          {/* Enriching indicator */}
          {enrichingDay !== null && (
            <div className="border border-ink/10 p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-burnt-orange rounded-full animate-ping" />
                <p className="micro-copy text-ink-light">
                  Day {enrichingDay} — enriching with Google Places…
                </p>
              </div>
            </div>
          )}

          {/* Rendered days */}
          {days.map((day) => (
            <div key={day.day} className="border border-ink/10">
              {/* Day header */}
              <div className="border-b border-ink/10 px-5 py-4 bg-paper-dark">
                <div className="flex items-baseline justify-between">
                  <p className="micro-copy text-ink-light">Day {day.day}</p>
                  <p className="micro-copy text-ink-light/50 uppercase tracking-widest text-[10px]">{day.pace}</p>
                </div>
                <p className="font-serif italic text-xl text-ink mt-0.5">{day.theme}</p>
              </div>

              {/* Timeline items */}
              <div className="divide-y divide-ink/5">
                {(day.timeline ?? []).map((item, i) => (
                  <div key={i} className="px-5 py-3 flex gap-4">
                    <div className="shrink-0 w-12 text-right">
                      <span className="micro-copy text-ink-light/50">{item.startTime}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`micro-copy px-1.5 py-0.5 text-[9px] ${
                          ["breakfast","lunch","dinner","snack","drinks"].includes(item.type)
                            ? "bg-burnt-orange/10 text-burnt-orange"
                            : "bg-ink/5 text-ink-light"
                        }`}>
                          {item.type.toUpperCase()}
                        </span>
                        {item.category && (
                          <span className="micro-copy text-ink-light/40 text-[9px]">{item.category}</span>
                        )}
                        {item.rating !== undefined && (
                          <span className="micro-copy text-ink-light/40 text-[9px]">★ {item.rating}</span>
                        )}
                        {item.openNow !== undefined && (
                          <span className={`micro-copy text-[9px] ${item.openNow ? "text-emerald-accent" : "text-burnt-orange"}`}>
                            {item.openNow ? "OPEN" : "CLOSED"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ink font-medium leading-snug">{item.title}</p>
                      <p className="text-xs text-ink-light mt-0.5 leading-relaxed">{item.description}</p>
                      {item.transitFromPrevious?.walkingMinutes !== undefined && (
                        <p className="text-[10px] text-ink/30 mt-1">
                          ↑ {item.transitFromPrevious.walkingMinutes}min walk · {item.transitFromPrevious.drivingMinutes}min drive
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="micro-copy text-ink-light/40 text-[10px]">{item.duration}</p>
                      {item.pricePoint && (
                        <p className="micro-copy text-ink-light/40 text-[10px]">{item.pricePoint}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hidden gem */}
              {day.hiddenGem && (
                <div className="border-t border-ink/5 px-5 py-3 bg-paper-dark/50">
                  <p className="micro-copy text-ink-light/50 mb-0.5">Hidden Gem</p>
                  <p className="text-xs text-ink-light italic">{day.hiddenGem}</p>
                </div>
              )}
            </div>
          ))}

          {/* Waiting for more days indicator */}
          {running && days.length > 0 && days.length < duration && enrichingDay === null && (
            <div className="border border-ink/5 p-4 text-center">
              <p className="micro-copy text-ink-light/50">
                Waiting for Day {days.length + 1} from Claude…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
