# Stripe setup — paid plans

Billing code: `src/lib/billing.ts` (sync logic), `src/app/api/stripe/webhook/route.ts`, `src/app/api/stripe/checkout/route.ts`.

## How it works
- **Stripe is the source of truth.** Every webhook re-fetches the current subscription/invoice from the Stripe API and overwrites our mirror tables (`Subscription`, `Invoice`, `Dispute`). Delivery order does not matter.
- **Idempotent and atomic.** The `StripeEvent` row is written in the same DB transaction as the event's effects. If processing fails, nothing is written and the webhook returns 500 so Stripe retries (for up to 3 days).
- **Premium** = any subscription in `active`, `trialing` or `past_due` (grace while Stripe retries the card). Losing premium returns the user to the free allowance.
- **Credits:** each paid `subscription_create` / `subscription_cycle` invoice resets credits to 10, once per invoice. A late old invoice never resets a newer period.
- **Refunds:** a full refund of the invoice funding the current period sets premium credits to 0. It does **not** cancel the subscription — cancel it in Stripe as well if access should end.
- **Disputes** are recorded and reported to Sentry; access is unchanged.
- **One customer per user**, reused for every checkout; a second checkout while subscribed returns 409 and the pricing page opens the billing portal.

## One-time setup (test mode first, then live)
1. **Product & price:** create the Premium product with a monthly recurring price. Copy the price ID.
2. **Customer portal:** Settings → Billing → Customer portal → activate; allow cancellation and payment-method updates.
3. **Webhook endpoint:** Developers → Webhooks → add `https://travalbee.com/api/stripe/webhook` with these events:
   - `checkout.session.completed`
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - `invoice.paid`, `invoice.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`
   Use API version `2026-02-25.clover` (matches `src/lib/stripe.ts`).
4. **Retries for failed payments:** Settings → Billing → Subscriptions and emails → Smart Retries on; after the final retry, cancel the subscription (or mark unpaid — both end premium).
5. **Environment variables** (Vercel, per environment):
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (from the endpoint in step 3)
   - `STRIPE_PRICE_ID` (step 1)
   - `NEXT_PUBLIC_APP_URL` (`https://travalbee.com` in production)

## Database
New tables: `Subscription`, `Invoice`, `Dispute` (additive — nothing existing is dropped or changed). Apply **before** deploying this code:
```bash
npx prisma db push
```
(Run against the staging database first. Once ADR-0009 lands, this becomes a `prisma migrate` migration.)

## Test plan (test mode, with the Stripe CLI)
Forward events locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (use the printed signing secret as `STRIPE_WEBHOOK_SECRET`).

| Scenario | Expected |
|---|---|
| Subscribe with `4242 4242 4242 4242` | `Subscription` active, `Invoice` paid (`subscription_create`), `isPremium = true`, credits = 10 |
| Click Upgrade again while subscribed | 409 → redirected to billing portal; no second subscription |
| 100%-off promo code | `invoice.paid` with `amountPaid = 0`, premium + 10 credits |
| Advance a test clock one month | new `subscription_cycle` invoice, credits reset to 10 |
| Renewal with a failing card (`4000 0000 0000 0341`) | `Invoice` open, subscription `past_due`, premium kept |
| Cancel at period end in the portal | `cancelAtPeriodEnd = true`, premium until period end, then free allowance |
| Full refund in the dashboard | `Invoice.amountRefunded` set, credits = 0 |
| Resend an event from the dashboard | `duplicate: true`, no changes |
| Dispute (`4000 0000 0000 0259`) | `Dispute` row, Sentry warning |
| Admin `/admin/metrics` | revenue = paid invoices minus refunds |
