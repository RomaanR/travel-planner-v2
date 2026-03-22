import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look up existing Stripe customer ID so returning users reuse their customer record
  const profile = await prisma.userProfile.findUnique({ where: { id: userId } });

  let customerId = profile?.stripeCustomerId ?? undefined;

  // Create a Stripe customer if this user has never checked out before
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { clerkUserId: userId },
    });
    customerId = customer.id;

    // Persist immediately — even if checkout is abandoned we have a customer record
    await prisma.userProfile.upsert({
      where:  { id: userId },
      create: { id: userId, stripeCustomerId: customerId },
      update: { stripeCustomerId: customerId },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer:            customerId,
    mode:                "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price:    process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    // Stripe redirects here after successful payment — the webhook fires first and
    // upgrades the plan, so by the time the user lands here they are already on Pro.
    success_url: `${baseUrl}/itinerary?upgraded=1`,
    cancel_url:  `${baseUrl}/pricing?cancelled=1`,
    metadata: { clerkUserId: userId },
    // Pre-fill email if possible — Clerk exposes it on the session metadata only;
    // the email lookup would require Clerk backend SDK, so we skip for simplicity.
    subscription_data: {
      metadata: { clerkUserId: userId },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
