import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { BLOCKING_SUBSCRIPTION_STATUSES } from "@/lib/billing";
import { freeCreditsRemaining } from "@/lib/credits";

const PORTAL_URL = "/api/stripe/portal";

function alreadySubscribed() {
  return NextResponse.json(
    { error: "already_subscribed", message: "You already have a subscription.", portalUrl: PORTAL_URL },
    { status: 409 },
  );
}

/** One Stripe customer per user, created once and reused for every checkout. */
async function getOrCreateCustomerId(userId: string, existing: string | null): Promise<string> {
  if (existing) return existing;

  const user     = await currentUser();
  // The idempotency key makes concurrent first checkouts resolve to the same customer.
  const customer = await stripe.customers.create(
    {
      email:    user?.primaryEmailAddress?.emailAddress,
      metadata: { clerkUserId: userId },
    },
    { idempotencyKey: `travalbee-customer-${userId}` },
  );

  await prisma.userProfile.upsert({
    where:  { id: userId },
    create: { id: userId, stripeCustomerId: customer.id, availableCredits: await freeCreditsRemaining(prisma, userId, 0) },
    update: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    console.error("[stripe/checkout] STRIPE_PRICE_ID is not set");
    return NextResponse.json({ error: "Checkout is not available right now." }, { status: 500 });
  }

  try {
    // Refuse a second subscription. Check our mirror first, then Stripe itself,
    // because webhooks for a subscription started moments ago may not have arrived.
    const localActive = await prisma.subscription.findFirst({
      where:  { userId, status: { in: BLOCKING_SUBSCRIPTION_STATUSES } },
      select: { id: true },
    });
    if (localActive) return alreadySubscribed();

    const profile    = await prisma.userProfile.findUnique({ where: { id: userId } });
    const customerId = await getOrCreateCustomerId(userId, profile?.stripeCustomerId ?? null);

    const remote = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
    if (remote.data.some((s) => BLOCKING_SUBSCRIPTION_STATUSES.includes(s.status))) {
      return alreadySubscribed();
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // clerkUserId is stored in session metadata AND subscription_data.metadata so it
    // flows to every subscription and invoice event.
    const session = await stripe.checkout.sessions.create({
      mode:                  "subscription",
      customer:              customerId,
      client_reference_id:   userId,
      payment_method_types:  ["card"],
      line_items:            [{ price: priceId, quantity: 1 }],
      success_url:           `${baseUrl}/dashboard?subscribed=1`,
      cancel_url:            `${baseUrl}/pricing?cancelled=1`,
      metadata:              { clerkUserId: userId },
      subscription_data:     { metadata: { clerkUserId: userId } },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Log the Stripe detail server-side; never return it to the browser.
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}
