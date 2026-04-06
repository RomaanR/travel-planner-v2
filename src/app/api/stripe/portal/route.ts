import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/stripe/portal
// Creates a Stripe Customer Portal session and redirects the user to it.
// The portal handles cancellation, reactivation, and billing history.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({ where: { id: userId } });
  if (!profile?.stripeCustomerId) {
    // DEBUG: return profile data so we can see exactly what Prisma is reading
    return NextResponse.json({
      debug: true,
      userId,
      profile: profile ?? null,
      issue: "stripeCustomerId is null or profile not found",
    }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   profile.stripeCustomerId,
      return_url: `${baseUrl}/dashboard`,
    });
    return NextResponse.redirect(portalSession.url);
  } catch (err) {
    console.error("[stripe/portal] Failed to create portal session:", err);
    // Return a readable error rather than crashing silently
    return NextResponse.json(
      { error: "Could not open billing portal. Check that the Stripe Customer Portal is activated at dashboard.stripe.com → Settings → Billing → Customer portal." },
      { status: 500 }
    );
  }
}
