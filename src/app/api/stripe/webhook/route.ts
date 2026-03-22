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
  // Only one event type needed for the credit system — all subscription/invoice
  // events removed (no recurring billing in this model).

  switch (event.type) {
    case "checkout.session.completed": {
      const session     = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = session.metadata?.clerkUserId;

      if (!clerkUserId) {
        console.error("[stripe/webhook] No clerkUserId in session metadata — cannot credit user");
        break;
      }

      // Upsert: if the user row doesn't exist yet (they bought before their first
      // free generation created it), start them at 2 credits — the 1 they never
      // used from the default, plus the 1 they just purchased.
      await prisma.userProfile.upsert({
        where:  { id: clerkUserId },
        create: { id: clerkUserId, availableCredits: 2 },
        update: { availableCredits: { increment: 1 } },
      });

      console.log(`[stripe/webhook] +1 credit → ${clerkUserId}`);
      break;
    }

    default:
      // Return 200 for all unhandled events so Stripe does not retry them.
      break;
  }

  return NextResponse.json({ received: true });
}
