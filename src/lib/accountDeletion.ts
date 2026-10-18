import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { BLOCKING_SUBSCRIPTION_STATUSES } from "@/lib/billing";

/**
 * Removes a deleted Clerk user's personal data. Idempotent — safe on webhook retries.
 *
 * - Cancels any live Stripe subscription immediately, so a deleted account is never billed again.
 * - Deletes saved trips and the user profile.
 * - Detaches cost logs (kept anonymously for unit-economics reporting).
 * - Keeps Subscription / Invoice / Dispute rows: financial records we must retain.
 *   They hold only the opaque Clerk ID, which no longer resolves to a person.
 */
export async function deleteUserData(userId: string): Promise<void> {
  const profile = await prisma.userProfile.findUnique({
    where:  { id: userId },
    select: { stripeCustomerId: true },
  });

  if (profile?.stripeCustomerId) {
    const subs = await stripe.subscriptions.list({ customer: profile.stripeCustomerId, status: "all", limit: 20 });
    for (const sub of subs.data) {
      if (BLOCKING_SUBSCRIPTION_STATUSES.includes(sub.status)) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }
  }

  await prisma.$transaction([
    prisma.trip.deleteMany({ where: { userId } }),
    prisma.costLog.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.userProfile.deleteMany({ where: { id: userId } }),
  ]);
}
