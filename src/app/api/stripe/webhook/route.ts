import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import {
  type BillingWrite,
  prepareChargeRefunded,
  prepareCheckoutCompleted,
  prepareDispute,
  prepareInvoiceSync,
  prepareSubscriptionSync,
} from "@/lib/billing";

// Stripe requires the raw body for signature verification — Next.js would
// parse it as JSON by default, breaking the HMAC check.
export const runtime = "nodejs";

// Events to enable on the Stripe webhook endpoint (Dashboard → Developers → Webhooks):
//   checkout.session.completed
//   customer.subscription.created | customer.subscription.updated | customer.subscription.deleted
//   invoice.paid | invoice.payment_failed
//   charge.refunded
//   charge.dispute.created | charge.dispute.updated | charge.dispute.closed
//
// invoice.paid (not invoice.payment_succeeded) also fires for $0 invoices,
// e.g. 100%-off promotion codes.
async function prepare(event: Stripe.Event): Promise<BillingWrite | null> {
  switch (event.type) {
    case "checkout.session.completed":
      return prepareCheckoutCompleted(event.data.object);

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return prepareSubscriptionSync(event.data.object.id);

    case "invoice.paid":
    case "invoice.payment_failed":
      return prepareInvoiceSync(event.data.object.id);

    case "charge.refunded":
      return prepareChargeRefunded(event.data.object);

    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed":
      return prepareDispute(event.data.object);

    default:
      return null; // not an event we act on
  }
}

// Only a unique violation on the StripeEvent row means "already processed".
// Any other unique violation (e.g. a UserProfile created concurrently by the
// Clerk webhook) must return 500 so Stripe retries the event.
function isDuplicateEvent(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  const target = err.meta?.target;
  const fields = Array.isArray(target) ? target : typeof target === "string" ? [target] : [];
  return fields.some((f) => String(f).includes("stripeEventId"));
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Idempotency ──────────────────────────────────────────────────────────────
  // The StripeEvent row is written in the SAME transaction as the event's effects,
  // so it exists only if they committed. A crash or timeout mid-processing leaves
  // no row, and Stripe's retry processes the event again.
  const alreadyProcessed = await prisma.stripeEvent.findUnique({
    where:  { stripeEventId: event.id },
    select: { id: true },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const write = await prepare(event);
    if (!write) return NextResponse.json({ received: true });

    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { stripeEventId: event.id, type: event.type } });
      await write(tx);
    });
  } catch (err) {
    // A concurrent delivery of the same event committed first — nothing left to do.
    if (isDuplicateEvent(err)) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error(`[stripe/webhook] Processing failed for ${event.id} (${event.type}):`, err);
    Sentry.withScope((scope) => {
      scope.setTag("stripe_event_type", event.type);
      scope.setExtra("stripe_event_id", event.id);
      Sentry.captureException(err);
    });
    // 500 → Stripe retries with backoff for up to 3 days.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
