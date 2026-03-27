export const dynamic = "force-dynamic"; // admin route

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number, decimals = 4): string {
  return value.toFixed(decimals);
}

// Returns [{ label, datetime }] for UTC, Pacific, and Eastern —
// each with its own correct local date so cross-midnight shifts display accurately.
function fmtTzRows(date: Date): { label: string; datetime: string }[] {
  function row(tz: string, labelFallback: string) {
    const label =
      new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
        .formatToParts(date)
        .find((p) => p.type === "timeZoneName")?.value ?? labelFallback;

    const localDate = date.toLocaleDateString("en-US", {
      day:      "numeric",
      month:    "short",
      year:     "numeric",
      timeZone: tz,
    });

    const localTime = date.toLocaleTimeString("en-US", {
      hour:     "2-digit",
      minute:   "2-digit",
      timeZone: tz,
      hour12:   false,
    });

    return { label, datetime: `${localDate}, ${localTime}` };
  }

  return [
    row("UTC",                 "UTC"),
    row("America/Los_Angeles", "PT"),   // auto PDT / PST
    row("America/New_York",    "ET"),   // auto EDT / EST
  ];
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
  const adminId    = process.env.ADMIN_USER_ID?.trim();
  if (!adminId || userId !== adminId) notFound();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [agg, logs, stripePayments, userAgg, zeroCredits, totalUsers] = await Promise.all([
    prisma.costLog.aggregate({
      _sum:   { totalCost: true, aiCost: true, googleCost: true, cacheHits: true, cacheMisses: true, inputTokens: true, outputTokens: true, thinkingTokens: true },
      _avg:   { totalCost: true },
      _count: { _all: true },
    }),
    prisma.costLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    stripe.checkout.sessions.list({
      limit: 100,
      expand: ["data.payment_intent"],
    }),
    prisma.userProfile.aggregate({
      _sum:   { availableCredits: true },
      _avg:   { availableCredits: true },
      _count: { _all: true },
    }),
    prisma.userProfile.count({ where: { availableCredits: { lte: 0 } } }),
    prisma.userProfile.count(),
  ]);

  // ── Cost KPIs ────────────────────────────────────────────────────────────────
  const totalSpent     = Number(agg._sum.totalCost   ?? 0);
  const totalAi        = Number(agg._sum.aiCost      ?? 0);
  const totalGoogle    = Number(agg._sum.googleCost  ?? 0);
  const avgCost        = Number(agg._avg.totalCost   ?? 0);
  const totalGens      = agg._count._all;
  const totalHits         = Number(agg._sum.cacheHits      ?? 0);
  const totalMisses       = Number(agg._sum.cacheMisses    ?? 0);
  const totalInputTokens  = Number(agg._sum.inputTokens    ?? 0);
  const totalOutputTokens = Number(agg._sum.outputTokens   ?? 0);
  const totalThinkTokens  = Number(agg._sum.thinkingTokens ?? 0);
  const totalTokens       = totalInputTokens + totalOutputTokens;
  const cacheHitRate      = totalHits + totalMisses > 0
    ? (totalHits / (totalHits + totalMisses)) * 100
    : 0;

  // ── Revenue KPIs ─────────────────────────────────────────────────────────────
  const paidSessions = stripePayments.data.filter(
    (s) => s.payment_status === "paid" && s.mode === "payment"
  );
  const totalRevenue = paidSessions.reduce((sum, s) => sum + (s.amount_total ?? 0), 0) / 100;
  const creditsSold  = paidSessions.length;
  const grossProfit  = totalRevenue - totalSpent;
  const profitMargin = totalRevenue > 0
    ? ((grossProfit / totalRevenue) * 100).toFixed(1)
    : "—";

  // Recent 20 payments for table
  const recentPayments = paidSessions.slice(0, 20);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-paper">

      {/* Header */}
      <div className="border-b border-ink/10 px-8 md:px-16 py-10">
        <p className="micro-copy text-ink-light mb-2">
          Admin &middot; TravalBee
        </p>
        <h1 className="font-serif italic text-5xl md:text-7xl text-ink leading-none">
          Unit Economics
        </h1>
        <p className="micro-copy text-ink-light mt-3">
          Revenue &middot; Users &middot; Claude &middot; Google Places &middot; Cache Performance
        </p>
      </div>

      <div className="px-8 md:px-16 py-10 space-y-12">

        {/* ── Revenue & Profit ── */}
        <div>
          <p className="micro-copy text-ink mb-4">Revenue &amp; Profit</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ink/10 border border-ink/10">
            {/* Total Revenue */}
            <div className="bg-paper p-6 md:p-8">
              <p className="micro-copy text-ink-light mb-3">Total Revenue</p>
              <p className="font-serif italic text-4xl md:text-5xl text-ink leading-none">
                ${totalRevenue.toFixed(2)}
              </p>
            </div>

            {/* Credits Sold */}
            <div className="bg-paper p-6 md:p-8">
              <p className="micro-copy text-ink-light mb-3">Credits Sold</p>
              <p className="font-serif italic text-4xl md:text-5xl text-ink leading-none">
                {creditsSold.toLocaleString()}
              </p>
            </div>

            {/* Gross Profit */}
            <div className="bg-paper p-6 md:p-8">
              <p className="micro-copy text-ink-light mb-3">Gross Profit</p>
              <p className={`font-serif italic text-4xl md:text-5xl leading-none ${grossProfit >= 0 ? "text-emerald-accent" : "text-burnt-orange"}`}>
                ${grossProfit.toFixed(2)}
              </p>
            </div>

            {/* Profit Margin */}
            <div className="bg-paper p-6 md:p-8">
              <p className="micro-copy text-ink-light mb-3">Profit Margin</p>
              <p className={`font-serif italic text-4xl md:text-5xl leading-none ${typeof profitMargin === "string" && profitMargin === "—" ? "text-ink-light" : grossProfit >= 0 ? "text-emerald-accent" : "text-burnt-orange"}`}>
                {profitMargin}{profitMargin !== "—" ? "%" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* ── User Metrics ── */}
        <div>
          <p className="micro-copy text-ink mb-4">User Metrics</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ink/10 border border-ink/10">
            {/* Total Users */}
            <div className="bg-paper p-6 md:p-8">
              <p className="micro-copy text-ink-light mb-3">Total Users</p>
              <p className="font-serif italic text-4xl md:text-5xl text-ink leading-none">
                {totalUsers.toLocaleString()}
              </p>
            </div>

            {/* Credits in Circulation */}
            <div className="bg-paper p-6 md:p-8">
              <p className="micro-copy text-ink-light mb-3">Credits in Circulation</p>
              <p className="font-serif italic text-4xl md:text-5xl text-ink leading-none">
                {(userAgg._sum.availableCredits ?? 0).toLocaleString()}
              </p>
            </div>

            {/* Users at Zero Credits */}
            <div className="bg-paper p-6 md:p-8">
              <p className="micro-copy text-ink-light mb-3">Users at Zero Credits</p>
              <p className="font-serif italic text-4xl md:text-5xl text-burnt-orange leading-none">
                {zeroCredits.toLocaleString()}
              </p>
              <p className="micro-copy text-ink-light/60 mt-2">potential buyers</p>
            </div>

            {/* Avg Credits / User */}
            <div className="bg-paper p-6 md:p-8">
              <p className="micro-copy text-ink-light mb-3">Avg Credits / User</p>
              <p className="font-serif italic text-4xl md:text-5xl text-ink leading-none">
                {(userAgg._avg.availableCredits ?? 0).toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Recent Purchases ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="micro-copy text-ink">Recent Purchases</p>
            <p className="micro-copy text-ink-light">
              Last {recentPayments.length} of {creditsSold.toLocaleString()}
            </p>
          </div>

          {recentPayments.length === 0 ? (
            <div className="border border-ink/10 p-12 text-center">
              <p className="font-serif italic text-2xl text-ink-light">
                No purchases recorded yet
              </p>
              <p className="micro-copy text-ink-light mt-2">
                Completed Stripe checkout sessions will appear here
              </p>
            </div>
          ) : (
            <div className="border border-ink/10 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-paper-dark border-b border-ink/10">
                    {["Date", "Amount", "Session ID", "Status"].map((h) => (
                      <th
                        key={h}
                        className="micro-copy text-left px-4 py-3 font-normal text-ink-light whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((session, i) => {
                    const sessionDate = session.created
                      ? new Date(session.created * 1000)
                      : null;
                    const amount = session.amount_total != null
                      ? `$${(session.amount_total / 100).toFixed(2)}`
                      : "—";
                    const shortId = session.id.slice(-12);

                    return (
                      <tr
                        key={session.id}
                        className={`border-b border-ink/5 ${i % 2 === 0 ? "bg-paper" : "bg-paper-dark/40"}`}
                      >
                        {/* Date */}
                        <td className="px-4 py-3 micro-copy text-ink-light whitespace-nowrap">
                          {sessionDate
                            ? sessionDate.toLocaleDateString("en-US", {
                                day:   "numeric",
                                month: "short",
                                year:  "numeric",
                              })
                            : "—"}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 micro-copy text-ink font-bold whitespace-nowrap">
                          {amount}
                        </td>

                        {/* Session ID (last 12 chars) */}
                        <td className="px-4 py-3 font-mono text-xs text-ink-light whitespace-nowrap">
                          &hellip;{shortId}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="micro-copy text-emerald-accent border border-emerald-accent/30 px-2 py-0.5">
                            PAID
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Cost Performance ── */}
        <div>
          <p className="micro-copy text-ink mb-4">Cost Performance</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ink/10 border border-ink/10">
            {[
              { label: "Total Spent",        value: `$${fmt(totalSpent)}` },
              { label: "Total Generations",  value: totalGens.toLocaleString() },
              { label: "Avg Cost / Trip",    value: `$${fmt(avgCost)}` },
              { label: "Cache Hit Rate",     value: `${cacheHitRate.toFixed(1)}%` },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-paper p-6 md:p-8">
                <p className="micro-copy text-ink-light mb-3">{kpi.label}</p>
                <p className="font-serif italic text-4xl md:text-5xl text-ink leading-none">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cost Split ── */}
        <div>
          <p className="micro-copy text-ink mb-4">Cost Split</p>
          <div className="grid grid-cols-2 gap-px bg-ink/10 border border-ink/10">
            <div className="bg-paper-dark p-6">
              <p className="micro-copy text-ink-light mb-1">Total Claude (AI) Cost</p>
              <p className="font-serif italic text-3xl text-ink">${fmt(totalAi)}</p>
              <p className="micro-copy text-ink-light/60 mt-1">
                {totalGens > 0 ? `$${fmt(totalAi / totalGens)} avg per trip` : "—"}
              </p>
              <div className="mt-3 pt-3 border-t border-ink/10 space-y-0.5">
                <p className="micro-copy text-ink-light/60">
                  {totalTokens.toLocaleString()} total tokens
                  {totalGens > 0 ? ` · ${Math.round(totalTokens / totalGens).toLocaleString()} avg/trip` : ""}
                </p>
                <p className="micro-copy text-ink-light/60">
                  in {totalInputTokens.toLocaleString()} · out {totalOutputTokens.toLocaleString()}
                  {totalThinkTokens > 0 ? ` · think ${totalThinkTokens.toLocaleString()}` : ""}
                </p>
              </div>
            </div>
            <div className="bg-paper-dark p-6">
              <p className="micro-copy text-ink-light mb-1">Total Google Places Cost</p>
              <p className="font-serif italic text-3xl text-ink">${fmt(totalGoogle)}</p>
              <p className="micro-copy text-ink-light/60 mt-1">
                {totalGens > 0 ? `$${fmt(totalGoogle / totalGens)} avg per trip` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Generation Log ── */}
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
                    {["Date", "Destination", "User", "Tokens (in/out/think)", "AI Cost", "Google Cost", "Total", "Cache"].map((h) => (
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
                          {fmtTzRows(log.createdAt).map(({ label, datetime }) => (
                            <div key={label} className={label === "UTC" ? "text-ink-light" : "text-ink-light/50"}>
                              {datetime}{" "}
                              <span className="text-ink-light/30">{label}</span>
                            </div>
                          ))}
                        </td>

                        {/* Destination */}
                        <td className="px-4 py-3 font-sans text-ink whitespace-nowrap">
                          {log.destination}
                        </td>

                        {/* User */}
                        <td className="px-4 py-3 micro-copy text-ink-light font-mono whitespace-nowrap">
                          {log.userId
                            ? `···${log.userId.slice(-8)}`
                            : <span className="text-ink-light/40">anon</span>
                          }
                        </td>

                        {/* Tokens */}
                        <td className="px-4 py-3 font-mono text-xs text-ink-light whitespace-nowrap">
                          {(log.inputTokens ?? 0).toLocaleString()}
                          {" / "}
                          {(log.outputTokens ?? 0).toLocaleString()}
                          {(log.thinkingTokens ?? 0) > 0 && (
                            <span className="text-burnt-orange"> / {log.thinkingTokens!.toLocaleString()}</span>
                          )}
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
