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

  // ── Handle events ────────────────────────────────────────────────────────────

  switch (event.type) {
    // Subscription created or renewed successfully — user is (or stays) Pro
    case "invoice.payment_succeeded": {
      const invoice      = event.data.object as Stripe.Invoice;
      const customerId   = invoice.customer as string;
      const subscriptionId = (invoice as unknown as { subscription?: string }).subscription ?? null;
      const clerkUserId  = await resolveClerkUserId(customerId, subscriptionId);
      if (clerkUserId) {
        await prisma.userProfile.upsert({
          where:  { id: clerkUserId },
          create: { id: clerkUserId, plan: "pro", stripeCustomerId: customerId },
          update: { plan: "pro" },
        });
        console.log(`[stripe/webhook] Upgraded ${clerkUserId} → pro`);
      }
      break;
    }

    // Checkout session completed — catch the very first payment before the
    // invoice fires (invoice fires asynchronously; session fires synchronously)
    case "checkout.session.completed": {
      const session     = event.data.object as Stripe.Checkout.Session;
      const customerId  = session.customer as string;
      const clerkUserId = session.metadata?.clerkUserId
        ?? await resolveClerkUserId(customerId, session.subscription as string);
      if (clerkUserId) {
        await prisma.userProfile.upsert({
          where:  { id: clerkUserId },
          create: { id: clerkUserId, plan: "pro", stripeCustomerId: customerId },
          update: { plan: "pro", stripeCustomerId: customerId },
        });
        console.log(`[stripe/webhook] Checkout complete — ${clerkUserId} → pro`);
      }
      break;
    }

    // Subscription cancelled or payment failed — downgrade to free
    case "customer.subscription.deleted":
    case "invoice.payment_failed": {
      const obj        = event.data.object as { customer: string | Stripe.Customer };
      const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer.id;
      const profile    = await prisma.userProfile.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (profile) {
        await prisma.userProfile.update({
          where:  { id: profile.id },
          data:   { plan: "free" },
        });
        console.log(`[stripe/webhook] Downgraded ${profile.id} → free`);
      }
      break;
    }

    default:
      // Unhandled event type — return 200 so Stripe does not retry
      break;
  }

  return NextResponse.json({ received: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the Clerk userId from a Stripe customer ID.
 * Priority: customer metadata → subscription metadata → UserProfile DB lookup.
 */
async function resolveClerkUserId(
  customerId: string,
  subscriptionId?: string | null
): Promise<string | null> {
  // 1. Check subscription metadata
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      if (sub.metadata?.clerkUserId) return sub.metadata.clerkUserId;
    } catch {}
  }

  // 2. Check customer metadata
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!("deleted" in customer) && customer.metadata?.clerkUserId) {
      return customer.metadata.clerkUserId;
    }
  } catch {}

  // 3. Fall back to DB lookup
  const profile = await prisma.userProfile.findFirst({
    where: { stripeCustomerId: customerId },
  });
  return profile?.id ?? null;
}
