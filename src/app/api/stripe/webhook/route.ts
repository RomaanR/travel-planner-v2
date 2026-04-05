import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import type Stripe from "stripe";

// Stripe requires the raw body for signature verification — Next.js would
// parse it as JSON by default, breaking the HMAC check.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Idempotency check ────────────────────────────────────────────────────────
  // Store the Stripe event ID before processing. If this event ID already exists
  // (replay attack or Stripe retry after a transient error), return 200 immediately
  // without crediting the user again.
  try {
    await prisma.stripeEvent.create({
      data: { stripeEventId: event.id, type: event.type },
    });
  } catch {
    // Unique constraint violation — this event was already processed.
    console.log(`[stripe/webhook] Duplicate event ${event.id} (${event.type}) — skipping`);
    return NextResponse.json({ received: true });
  }

  // ── Handle events ────────────────────────────────────────────────────────────
  // Two event types cover the full subscription lifecycle:
  //
  // 1. checkout.session.completed — fires when user completes checkout form.
  //    Grants the initial credit immediately so the user can start using the
  //    product without waiting for the first invoice to settle.
  //
  // 2. invoice.payment_succeeded — fires on every successful charge, including
  //    the initial charge AND all monthly renewals. We skip billing_reason
  //    "manual" (one-off invoices) and only credit on subscription cycles.
  //    This is the authoritative event for ongoing subscription access.

  switch (event.type) {
    case "checkout.session.completed": {
      const session     = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = session.metadata?.clerkUserId;

      if (!clerkUserId) {
        console.error("[stripe/webhook] No clerkUserId in session metadata — cannot credit user");
        break;
      }

      // Grant 10 credits on subscription start and mark user as premium.
      await prisma.userProfile.upsert({
        where:  { id: clerkUserId },
        create: { id: clerkUserId, availableCredits: 10, isPremium: true },
        update: { availableCredits: 10, isPremium: true },
      });

      console.log(`[stripe/webhook] checkout.session.completed → premium=true, credits=10 → ${clerkUserId}`);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice       = event.data.object as Stripe.Invoice;
      const billingReason = invoice.billing_reason;

      // Only credit on recurring subscription renewals, not the initial charge
      // (which is already handled by checkout.session.completed above).
      if (billingReason !== "subscription_cycle") break;

      // clerkUserId flows from checkout → subscription_data.metadata → invoice.subscription_details.metadata
      const sub         = invoice.subscription_details;
      const clerkUserId = sub?.metadata?.clerkUserId;

      if (!clerkUserId) {
        console.error("[stripe/webhook] No clerkUserId in invoice subscription metadata — cannot credit renewal");
        break;
      }

      // Renew 10 credits for the new billing cycle and ensure premium flag is set.
      await prisma.userProfile.upsert({
        where:  { id: clerkUserId },
        create: { id: clerkUserId, availableCredits: 10, isPremium: true },
        update: { availableCredits: 10, isPremium: true },
      });

      console.log(`[stripe/webhook] invoice.payment_succeeded (renewal) → credits reset to 10 → ${clerkUserId}`);
      break;
    }

    case "customer.subscription.deleted": {
      // Subscription cancelled or payment failed — revoke premium access immediately.
      const subscription = event.data.object as Stripe.Subscription;
      const clerkUserId  = subscription.metadata?.clerkUserId;

      if (!clerkUserId) {
        console.error("[stripe/webhook] No clerkUserId in subscription metadata — cannot revoke premium");
        break;
      }

      await prisma.userProfile.updateMany({
        where: { id: clerkUserId },
        data:  { isPremium: false, availableCredits: 0 },
      });

      console.log(`[stripe/webhook] customer.subscription.deleted → premium=false, credits=0 → ${clerkUserId}`);
      break;
    }

    default:
      // Return 200 for all unhandled events so Stripe does not retry them.
      break;
  }

  return NextResponse.json({ received: true });
}
