export const dynamic = "force-dynamic"; // admin route

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number, decimals = 4): string {
  return value.toFixed(decimals);
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

function costColour(total: number): string {
  if (total < 0.15) return "text-emerald-accent";   // cache doing its job
  if (total > 0.50) return "text-burnt-orange";      // cold cache / first generation
  return "text-ink";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminMetricsPage() {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const { userId } = await auth();
  const adminId    = process.env.ADMIN_USER_ID;
  if (!userId || !adminId || userId !== adminId) notFound();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [agg, logs] = await Promise.all([
    prisma.costLog.aggregate({
      _sum:   { totalCost: true, aiCost: true, googleCost: true, cacheHits: true, cacheMisses: true },
      _avg:   { totalCost: true },
      _count: { _all: true },
    }),
    prisma.costLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalSpent     = Number(agg._sum.totalCost   ?? 0);
  const totalAi        = Number(agg._sum.aiCost      ?? 0);
  const totalGoogle    = Number(agg._sum.googleCost  ?? 0);
  const avgCost        = Number(agg._avg.totalCost   ?? 0);
  const totalGens      = agg._count._all;
  const totalHits      = Number(agg._sum.cacheHits   ?? 0);
  const totalMisses    = Number(agg._sum.cacheMisses ?? 0);
  const cacheHitRate   = totalHits + totalMisses > 0
    ? (totalHits / (totalHits + totalMisses)) * 100
    : 0;

  const kpis = [
    { label: "Total Spent",        value: `$${fmt(totalSpent)}` },
    { label: "Total Generations",  value: totalGens.toLocaleString() },
    { label: "Avg Cost / Trip",    value: `$${fmt(avgCost)}` },
    { label: "Cache Hit Rate",     value: `${cacheHitRate.toFixed(1)}%` },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-paper">

      {/* Header */}
      <div className="border-b border-ink/10 px-8 md:px-16 py-10">
        <p className="micro-copy text-ink-light mb-2">
          Admin &middot; Seek Wander
        </p>
        <h1 className="font-serif italic text-5xl md:text-7xl text-ink leading-none">
          Unit Economics
        </h1>
        <p className="micro-copy text-ink-light mt-3">
          Claude &middot; Google Places &middot; Cache Performance
        </p>
      </div>

      <div className="px-8 md:px-16 py-10 space-y-12">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ink/10 border border-ink/10">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-paper p-6 md:p-8">
              <p className="micro-copy text-ink-light mb-3">{kpi.label}</p>
              <p className="font-serif italic text-4xl md:text-5xl text-ink leading-none">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Cost Split */}
        <div className="grid grid-cols-2 gap-px bg-ink/10 border border-ink/10">
          <div className="bg-paper-dark p-6">
            <p className="micro-copy text-ink-light mb-1">Total Claude (AI) Cost</p>
            <p className="font-serif italic text-3xl text-ink">${fmt(totalAi)}</p>
            <p className="micro-copy text-ink-light/60 mt-1">
              {totalGens > 0 ? `$${fmt(totalAi / totalGens)} avg per trip` : "—"}
            </p>
          </div>
          <div className="bg-paper-dark p-6">
            <p className="micro-copy text-ink-light mb-1">Total Google Places Cost</p>
            <p className="font-serif italic text-3xl text-ink">${fmt(totalGoogle)}</p>
            <p className="micro-copy text-ink-light/60 mt-1">
              {totalGens > 0 ? `$${fmt(totalGoogle / totalGens)} avg per trip` : "—"}
            </p>
          </div>
        </div>

        {/* Generation Log */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="micro-copy text-ink">
              Generation Log
            </p>
            <p className="micro-copy text-ink-light">
              Last {logs.length} of {totalGens.toLocaleString()}
            </p>
          </div>

          {logs.length === 0 ? (
            <div className="border border-ink/10 p-12 text-center">
              <p className="font-serif italic text-2xl text-ink-light">
                No generations recorded yet
              </p>
              <p className="micro-copy text-ink-light mt-2">
                Generate an itinerary to see cost data here
              </p>
            </div>
          ) : (
            <div className="border border-ink/10 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                {/* Head */}
                <thead>
                  <tr className="bg-paper-dark border-b border-ink/10">
                    {["Date", "Destination", "User", "AI Cost", "Google Cost", "Total", "Cache"].map((h) => (
                      <th
                        key={h}
                        className="micro-copy text-left px-4 py-3 font-normal text-ink-light whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Body */}
                <tbody>
                  {logs.map((log, i) => {
                    const total      = Number(log.totalCost);
                    const ai         = Number(log.aiCost);
                    const google     = Number(log.googleCost);
                    const total_ops  = log.cacheHits + log.cacheMisses;

                    return (
                      <tr
                        key={log.id}
                        className={`border-b border-ink/5 ${i % 2 === 0 ? "bg-paper" : "bg-paper-dark/40"}`}
                      >
                        {/* Date */}
                        <td className="px-4 py-3 micro-copy text-ink-light whitespace-nowrap">
                          {fmtDate(log.createdAt)}
                        </td>

                        {/* Destination */}
                        <td className="px-4 py-3 font-sans text-ink whitespace-nowrap">
                          {log.destination}
                        </td>

                        {/* User */}
                        <td className="px-4 py-3 micro-copy text-ink-light font-mono whitespace-nowrap">
                          {log.userId
                            ? log.userId.slice(0, 18) + "&hellip;"
                            : <span className="text-ink-light/40">anon</span>
                          }
                        </td>

                        {/* AI Cost */}
                        <td className="px-4 py-3 micro-copy text-ink-light whitespace-nowrap">
                          ${fmt(ai)}
                        </td>

                        {/* Google Cost */}
                        <td className="px-4 py-3 micro-copy text-ink-light whitespace-nowrap">
                          ${fmt(google)}
                        </td>

                        {/* Total */}
                        <td className={`px-4 py-3 micro-copy font-bold whitespace-nowrap ${costColour(total)}`}>
                          ${fmt(total)}
                        </td>

                        {/* Cache */}
                        <td className="px-4 py-3 micro-copy whitespace-nowrap">
                          <span className={log.cacheHits > 0 ? "text-emerald-accent" : "text-ink-light/40"}>
                            {log.cacheHits}
                          </span>
                          <span className="text-ink-light/40">/{total_ops}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="micro-copy text-ink-light/50 pb-10">
          Pricing: Claude Sonnet $3/MTok in &middot; $15/MTok out &middot;
          Google Text Search $0.032/req &middot; Place Details $0.017/req
        </p>

      </div>
    </div>
  );
}
