import type Stripe from "stripe";
import type { Prisma, PrismaClient } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

// ─── Billing service ──────────────────────────────────────────────────────────
// Stripe is the source of truth. Each handler below runs in two phases:
//   1. prepare — read the CURRENT object from the Stripe API (never trust the
//      event payload's snapshot, which may be older than an event already applied)
//   2. write   — a function applied inside the webhook's DB transaction, together
//      with the StripeEvent idempotency row. Either everything commits or nothing.
// This makes delivery order irrelevant and retries safe.

export const PREMIUM_MONTHLY_CREDITS  = 10;
export const FREE_MONTHLY_GENERATIONS = 5;

// past_due keeps access while Stripe retries the card; Stripe moves the
// subscription to unpaid/canceled once retries are exhausted.
const PREMIUM_STATUSES = new Set<string>(["active", "trialing", "past_due"]);

// A second checkout is refused while any of these exist (unpaid → send to portal).
export const BLOCKING_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "unpaid"];

// Only these invoices start a new credit period. subscription_update (prorations)
// and manual invoices never reset credits.
const CREDIT_GRANT_REASONS = new Set<string>(["subscription_create", "subscription_cycle"]);

type Tx = Prisma.TransactionClient;
export type BillingWrite = (tx: Tx) => Promise<void>;
const noop: BillingWrite = async () => {};

type Ref = string | { id: string } | null | undefined;
const refId = (ref: Ref): string | null => (typeof ref === "string" ? ref : ref?.id ?? null);
const toDate = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000) : null);

export function hasPremiumStatus(status: string): boolean {
  return PREMIUM_STATUSES.has(status);
}

/** Free-tier credits left: rolling 30-day allowance plus manually granted bonus credits. */
export async function freeCreditsRemaining(
  db: Tx | PrismaClient,
  userId: string,
  bonusCredits: number,
): Promise<number> {
  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const used = await db.costLog.count({ where: { userId, createdAt: { gte: windowStart } } });
  return Math.max(0, FREE_MONTHLY_GENERATIONS - used) + bonusCredits;
}

function reportUnlinked(kind: string, stripeId: string) {
  // Not retryable — the object carries no way back to a TravalBee user. Alert and move on.
  console.error(`[billing] ${kind} ${stripeId} has no linked TravalBee user`);
  Sentry.captureMessage(`Stripe ${kind} ${stripeId} has no linked TravalBee user`, "error");
}

/** Clerk userId for a Stripe object: metadata first, then our customer link, then the Stripe customer. */
async function resolveUserId(
  metadata: Stripe.Metadata | null | undefined,
  customerId: string | null,
): Promise<string | null> {
  if (metadata?.clerkUserId) return metadata.clerkUserId;
  if (!customerId) return null;

  const profile = await prisma.userProfile.findUnique({
    where:  { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (profile) return profile.id;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return customer.metadata?.clerkUserId ?? null;
}

/** Recompute isPremium from the user's subscriptions; on downgrade, fall back to the free allowance. */
async function applyPremiumState(tx: Tx, userId: string, customerId: string): Promise<void> {
  const subs      = await tx.subscription.findMany({ where: { userId }, select: { status: true } });
  const isPremium = subs.some((s) => hasPremiumStatus(s.status));
  const profile   = await tx.userProfile.findUnique({ where: { id: userId } });

  if (!profile) {
    await tx.userProfile.create({
      data: {
        id:               userId,
        isPremium,
        stripeCustomerId: customerId,
        // Premium credits arrive with the paid invoice (same transaction, applied after this).
        availableCredits: isPremium ? 0 : await freeCreditsRemaining(tx, userId, 0),
      },
    });
    return;
  }

  const data: Prisma.UserProfileUpdateInput = {};
  if (!profile.stripeCustomerId) data.stripeCustomerId = customerId;
  if (profile.isPremium !== isPremium) {
    data.isPremium = isPremium;
    // Losing premium must not leave the user at 0 credits — they return to the free tier.
    if (!isPremium) data.availableCredits = await freeCreditsRemaining(tx, userId, profile.bonusCredits);
  }
  if (Object.keys(data).length > 0) {
    await tx.userProfile.update({ where: { id: userId }, data });
  }
}

/** The latest invoice for this subscription that has granted credits, other than `invoiceId`. */
async function newerGrantExists(tx: Tx, subscriptionId: string, invoiceId: string, paidAt: Date | null) {
  if (!paidAt) return false;
  const newer = await tx.invoice.findFirst({
    where:  { subscriptionId, id: { not: invoiceId }, creditsGrantedAt: { not: null }, paidAt: { gt: paidAt } },
    select: { id: true },
  });
  return newer !== null;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export async function prepareSubscriptionSync(subscriptionId: string): Promise<BillingWrite> {
  const sub        = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = refId(sub.customer);
  const userId     = await resolveUserId(sub.metadata, customerId);
  if (!userId || !customerId) {
    reportUnlinked("subscription", sub.id);
    return noop;
  }

  // Since API 2025-03-31 the billing period lives on the subscription item.
  const item = sub.items.data[0];
  const data = {
    userId,
    stripeCustomerId:   customerId,
    status:             sub.status,
    priceId:            item?.price?.id ?? null,
    cancelAtPeriodEnd:  sub.cancel_at_period_end,
    currentPeriodStart: toDate(item?.current_period_start),
    currentPeriodEnd:   toDate(item?.current_period_end),
    canceledAt:         toDate(sub.canceled_at),
    endedAt:            toDate(sub.ended_at),
  };

  return async (tx) => {
    await tx.subscription.upsert({ where: { id: sub.id }, create: { id: sub.id, ...data }, update: data });
    await applyPremiumState(tx, userId, customerId);
  };
}

// ─── Invoice (payment record + monthly credit grant) ──────────────────────────

export async function prepareInvoiceSync(invoiceId: string): Promise<BillingWrite> {
  const invoice = await stripe.invoices.retrieve(invoiceId);

  // Since API 2025-03-31 the subscription link moved from invoice.subscription_details
  // to invoice.parent.subscription_details.
  const subDetails     = invoice.parent?.subscription_details ?? null;
  const subscriptionId = refId(subDetails?.subscription);
  if (!subscriptionId) return noop; // not a subscription invoice — nothing we sell

  const subscriptionWrite = await prepareSubscriptionSync(subscriptionId);
  const customerId        = refId(invoice.customer);
  const userId            = await resolveUserId(subDetails?.metadata, customerId);
  if (!userId) {
    reportUnlinked("invoice", invoice.id);
    return subscriptionWrite;
  }

  const paidAt = toDate(invoice.status_transitions?.paid_at);
  const data = {
    userId,
    subscriptionId,
    status:           invoice.status ?? "draft",
    billingReason:    invoice.billing_reason ?? null,
    currency:         invoice.currency,
    amountDue:        invoice.amount_due,
    amountPaid:       invoice.amount_paid,
    paidAt,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
  };
  const startsCreditPeriod =
    invoice.status === "paid" && CREDIT_GRANT_REASONS.has(invoice.billing_reason ?? "");

  return async (tx) => {
    // Subscription first, so isPremium reflects the current status before granting.
    await subscriptionWrite(tx);

    const row = await tx.invoice.upsert({
      where:  { id: invoice.id },
      create: { id: invoice.id, ...data },
      update: data,
    });

    if (!startsCreditPeriod || row.creditsGrantedAt) return;

    // A late-delivered old invoice must not reset credits in a newer period.
    const stale   = await newerGrantExists(tx, subscriptionId, invoice.id, paidAt);
    const profile = await tx.userProfile.findUnique({ where: { id: userId }, select: { isPremium: true } });
    if (!stale && profile?.isPremium) {
      // Premium is a per-period allowance: reset to the plan amount, don't accumulate.
      await tx.userProfile.update({
        where: { id: userId },
        data:  { availableCredits: PREMIUM_MONTHLY_CREDITS },
      });
    }
    await tx.invoice.update({ where: { id: invoice.id }, data: { creditsGrantedAt: new Date() } });
  };
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export async function prepareCheckoutCompleted(session: Stripe.Checkout.Session): Promise<BillingWrite> {
  if (session.mode !== "subscription") return noop;

  // The invoice sync covers the subscription too. invoice.paid usually arrives
  // as well; both paths are idempotent, so whichever lands first grants access.
  const invoiceId = refId(session.invoice);
  if (invoiceId) return prepareInvoiceSync(invoiceId);

  const subscriptionId = refId(session.subscription);
  if (subscriptionId) return prepareSubscriptionSync(subscriptionId);

  return noop;
}

// ─── Refunds and disputes ─────────────────────────────────────────────────────

async function invoiceIdForPaymentIntent(paymentIntentId: string | null): Promise<string | null> {
  if (!paymentIntentId) return null;
  const payments = await stripe.invoicePayments.list({
    payment: { type: "payment_intent", payment_intent: paymentIntentId },
    limit:   1,
  });
  return refId(payments.data[0]?.invoice);
}

export async function prepareChargeRefunded(charge: Stripe.Charge): Promise<BillingWrite> {
  const invoiceId = await invoiceIdForPaymentIntent(refId(charge.payment_intent));
  if (!invoiceId) return noop;

  const invoiceWrite  = await prepareInvoiceSync(invoiceId);
  const fullyRefunded = charge.refunded; // true once amount_refunded === amount

  return async (tx) => {
    await invoiceWrite(tx);

    const row = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!row) return; // invoice not linked to a user (already reported)

    await tx.invoice.update({ where: { id: invoiceId }, data: { amountRefunded: charge.amount_refunded } });

    // A full refund of the invoice that funded the current period withdraws its
    // remaining credits. Premium status itself follows the subscription — cancel
    // the subscription in Stripe to end access.
    if (fullyRefunded && row.creditsGrantedAt && row.subscriptionId) {
      const stale = await newerGrantExists(tx, row.subscriptionId, row.id, row.paidAt);
      if (!stale) {
        await tx.userProfile.updateMany({
          where: { id: row.userId, isPremium: true },
          data:  { availableCredits: 0 },
        });
      }
    }
  };
}

export async function prepareDispute(dispute: Stripe.Dispute): Promise<BillingWrite> {
  const chargeId  = refId(dispute.charge);
  const invoiceId = await invoiceIdForPaymentIntent(refId(dispute.payment_intent));
  const invoice   = invoiceId
    ? await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { userId: true } })
    : null;

  Sentry.captureMessage(`Stripe dispute ${dispute.id} is ${dispute.status} (${dispute.reason})`, "warning");

  const data = {
    userId:    invoice?.userId ?? null,
    invoiceId,
    chargeId:  chargeId ?? "",
    amount:    dispute.amount,
    currency:  dispute.currency,
    reason:    dispute.reason,
    status:    dispute.status,
  };

  return async (tx) => {
    await tx.dispute.upsert({ where: { id: dispute.id }, create: { id: dispute.id, ...data }, update: data });
  };
}
