import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

// ─── Credits ──────────────────────────────────────────────────────────────────
// One rule set for every generation entry point and every page that shows a balance.
//
//   Free    — computed, never stored as the source of truth:
//             FREE_MONTHLY_GENERATIONS + bonusCredits − generations charged in the last 30 days.
//   Premium — UserProfile.availableCredits, reset each paid billing period by the
//             Stripe webhook, reserved atomically BEFORE generating and refunded
//             if generation fails on our side.
//
// Only successful generations are charged, once per requestId. Leaving the page
// doesn't cancel a generation — the server finishes it and the page resumes it
// (src/lib/generationStore.ts) — so a retry or reload never charges twice.
// Failures on our side are never charged.

export const FREE_MONTHLY_GENERATIONS = 5;
export const PREMIUM_MONTHLY_CREDITS  = 10;
export const FREE_MAX_DAYS            = 3;

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

type Db = Prisma.TransactionClient | PrismaClient;

/** Free-tier generations left in the rolling 30-day window. */
export async function freeCreditsRemaining(db: Db, userId: string, bonusCredits: number): Promise<number> {
  const used = await db.costLog.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - WINDOW_MS) },
      success:   true,
    },
  });
  return Math.max(0, FREE_MONTHLY_GENERATIONS + bonusCredits - used);
}

export type CreditStatus = {
  isPremium: boolean;
  remaining: number;
  maxDays:   number;
};

/** Current balance for a signed-in user. Read-only — safe to call from any page. */
export async function getCreditStatus(userId: string): Promise<CreditStatus> {
  const profile = await prisma.userProfile.findUnique({
    where:  { id: userId },
    select: { isPremium: true, availableCredits: true, bonusCredits: true },
  });

  if (profile?.isPremium) {
    return { isPremium: true, remaining: Math.max(0, profile.availableCredits), maxDays: 14 };
  }
  return {
    isPremium: false,
    remaining: await freeCreditsRemaining(prisma, userId, profile?.bonusCredits ?? 0),
    maxDays:   FREE_MAX_DAYS,
  };
}

/**
 * Atomically takes one premium credit. Returns false when none are left —
 * including when a concurrent request took the last one.
 */
export async function reservePremiumCredit(userId: string): Promise<boolean> {
  const { count } = await prisma.userProfile.updateMany({
    where: { id: userId, isPremium: true, availableCredits: { gt: 0 } },
    data:  { availableCredits: { decrement: 1 } },
  });
  return count === 1;
}

/** Returns a reserved premium credit after a failure on our side. */
export async function refundPremiumCredit(userId: string): Promise<void> {
  await prisma.userProfile.updateMany({
    where: { id: userId },
    data:  { availableCredits: { increment: 1 } },
  });
}

/**
 * After a charged free generation, refresh the stored snapshot used by the
 * admin dashboard. Decisions never read this value for free users.
 */
export async function recordFreeGeneration(userId: string): Promise<void> {
  const profile = await prisma.userProfile.findUnique({ where: { id: userId }, select: { bonusCredits: true } });
  const remaining = await freeCreditsRemaining(prisma, userId, profile?.bonusCredits ?? 0);
  await prisma.userProfile.upsert({
    where:  { id: userId },
    create: { id: userId, availableCredits: remaining, totalGenerations: 1 },
    update: { availableCredits: remaining, totalGenerations: { increment: 1 } },
  });
}

export async function recordPremiumGeneration(userId: string): Promise<void> {
  await prisma.userProfile.updateMany({
    where: { id: userId },
    data:  { totalGenerations: { increment: 1 } },
  });
}
