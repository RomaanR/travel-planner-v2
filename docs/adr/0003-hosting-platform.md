# ADR-0003: Hosting platform — Vercel + Supabase vs AWS

- **Status:** Accepted (2026-10-18)
- **Date:** 2026-10-18
- **Deciders:** Owner (solutions architect)

## Context
Production runs on **Vercel** (Next.js hosting, functions, cron, preview deploys) with **Supabase** used purely as managed **PostgreSQL** (via Prisma; Supabase Auth/Storage/Realtime are not used), **Upstash** Redis for rate limits, **Clerk** for identity, **Sentry** for errors.

The owner is considering AWS for greater control over infrastructure. The decision must weigh control against operational load for a one-person team that is pre-traction, and must keep the target architecture (ARCHITECTURE.md) achievable on either platform.

### Workload profile
- Low and spiky traffic today; target comfortable headroom to ~10k trips/month.
- Generation work runs 30–290 s, is CPU-light and I/O-bound (LLM + Places calls). Moving to durable jobs (ADR-0004).
- Data volume is small (trips, places, ledger, logs): single-digit GB for years.
- No regulatory requirement for a specific cloud today.

### Evaluation criteria (weighted)
| Criterion | Weight |
|---|---|
| Operational load for one person | 25% |
| Next.js feature support (streaming, server components, ISR, image optimisation, middleware) | 20% |
| Cost at current and 10× scale | 15% |
| Control (networking, runtime limits, scaling, DB access) | 15% |
| Delivery workflow (previews per PR, rollback, env management) | 10% |
| Portability / lock-in | 10% |
| Security and compliance posture | 5% |

## Options considered

### Option A — Vercel + Supabase + Upstash (current, hardened)
- **Web/app:** Vercel Pro. Functions with fluid compute; cron; preview deploy per PR; instant rollback.
- **Jobs:** Upstash QStash / Workflow calling job endpoints on the same deployment (ADR-0004).
- **Database:** Supabase Postgres (Pro plan for no auto-pause, daily backups, PITR add-on available); pooled connection for runtime, direct for migrations.
- **Config as code:** Terraform providers for Vercel, Supabase and Upstash where available; otherwise scripted (ADR-0011).

| Pros | Cons |
|---|---|
| First-class Next.js support from the framework vendor | No VPC/network control; limited runtime knobs |
| Near-zero ops: no patching, scaling or load balancers to own | Function duration and size limits (verify current plan limits) |
| Preview environments and rollback out of the box | Usage pricing (bandwidth, function time) can grow steeply at scale |
| Low fixed cost at current traffic | Multiple vendors to manage (billing, access, incident status) |
| Standard Postgres keeps data portable | Fewer compliance attestations/controls than AWS for enterprise customers |

**Indicative cost now:** Vercel Pro ~$20/month per member + usage; Supabase Pro ~$25/month; Upstash pay-as-you-go (low single digits). Validate against current price pages.

> **Compliance note:** Vercel's Hobby plan is for non-commercial use. An app that takes payments must be on Pro (or higher).

### Option B — AWS
Two credible ways to run Next.js on AWS:

**B1. AWS Amplify Hosting** (managed Next.js SSR)
- Least ops on AWS; Git-based deploys, branch previews.
- Historically lags Next.js releases and features; less control than B2 — close to Option A's operating model without its Next.js depth.

**B2. OpenNext on Lambda + CloudFront (via SST or CDK)** — the "full control" option
- **Edge:** CloudFront + S3 for static assets; Lambda (or Lambda function URLs) for SSR and route handlers; image optimisation Lambda.
- **Jobs:** SQS + Lambda workers, or Step Functions for multi-step generation; EventBridge Scheduler for cron.
- **Database:** RDS for PostgreSQL (or Aurora Serverless v2) + RDS Proxy for connection pooling; automated backups + PITR.
- **Cache/rate limits:** ElastiCache (Redis/Valkey) or keep Upstash.
- **Secrets/config:** Secrets Manager or SSM Parameter Store; KMS.
- **Observability:** CloudWatch logs/metrics/alarms, X-Ray; keep Sentry for app errors.
- **Networking:** VPC with private subnets for RDS; Lambdas in VPC need NAT (or VPC endpoints) for outbound calls to Anthropic, Google, Stripe.
- **IaC:** SST/CDK or Terraform; GitHub Actions with OIDC to AWS.
- **Identity:** keep Clerk (Cognito is possible but a separate migration with no product benefit).

| Pros | Cons |
|---|---|
| Full control: networking, runtime, scaling, IAM, data residency | Owning OpenNext/SST upgrades as Next.js evolves; features can break between versions |
| One provider for billing, IAM, audit (CloudTrail), compliance | Much more to build: pipelines, preview environments, alarms, runbooks |
| Long-running work fits naturally (SQS/Step Functions, no HTTP time limit) | NAT gateway and RDS fixed costs dominate at low traffic |
| AWS Activate credits can offset cost | On-call surface (VPC, Lambda concurrency, RDS maintenance windows) for one person |
| Strong enterprise/compliance story if selling to agencies later | Weeks of migration work that do not move product or acquisition metrics |

**Indicative fixed cost now (B2):** NAT gateway (~$30+/month per AZ plus data), small RDS instance (~$15–30/month single-AZ; roughly double for Multi-AZ), RDS Proxy, CloudWatch, Secrets Manager — typically **$60–150/month before traffic**. Validate in the AWS Pricing Calculator; NAT can be avoided with careful design (public RDS endpoint over TLS + IAM auth, or Aurora Data API), at some security trade-off.

### Option C — Hybrid: web on Vercel, background workloads on AWS
- Keep Vercel for the Next.js app and Supabase for Postgres.
- Run long or heavy jobs (generation workers, city-library builds, content agent) on AWS Lambda/SQS or Step Functions, calling back into the shared database.

| Pros | Cons |
|---|---|
| Removes function time limits for the work that needs it | Two platforms, two IAM models, cross-cloud network egress |
| Uses AWS credits where they help most | DB access from AWS to Supabase over the public internet (TLS) |
| Incremental: can be adopted per job type | More moving parts than A, without A's single-pane simplicity |

### Scoring (1–5, higher is better)
| Criterion (weight) | A: Vercel + Supabase | B1: Amplify | B2: OpenNext on AWS | C: Hybrid |
|---|---|---|---|---|
| Operational load (25%) | 5 | 4 | 2 | 4 |
| Next.js support (20%) | 5 | 3 | 3 | 5 |
| Cost now / 10× (15%) | 4 | 4 | 3 | 3 |
| Control (15%) | 2 | 3 | 5 | 4 |
| Delivery workflow (10%) | 5 | 4 | 3 | 4 |
| Portability (10%) | 4 | 3 | 4 | 3 |
| Security/compliance (5%) | 3 | 4 | 5 | 4 |
| **Weighted total** | **4.20** | **3.55** | **3.25** | **3.95** |

## Decision
**Option A now**, designed so that **Option C** is a drop-in for background work and **Option B2** remains a planned migration rather than a rewrite.

Portability guardrails (mandatory):
1. Postgres via Prisma only; no Supabase-specific features (Auth, Storage, RLS-dependent logic, Edge Functions) without a new ADR.
2. Vendor code only behind `server/platform/*` adapters (queue, cache, email, storage, llm).
3. Jobs invoked through a queue interface (ADR-0004) so the transport can move from QStash to SQS.
4. No Vercel-only runtime APIs in business logic; platform specifics stay in route/entry files.
5. All configuration via environment variables; platform setup declared as code (ADR-0011).
6. `prisma migrate` history and regular exported backups (ADR-0009).
7. Before scale-up, a dry run: build with OpenNext and deploy a preview to AWS to prove portability.

### Revisit triggers (move to C or B2 when any is true)
- Hosting + database spend exceeds ~$500/month, or exceeds the projected AWS cost by >30% for two consecutive months.
- A job type cannot meet its SLO within platform function limits even after splitting into steps.
- A customer, partner or regulator requires AWS, specific data residency, private networking or attestations the vendors cannot provide.
- AWS credits large enough to cover ≥12 months of B2 including the migration effort.

## Consequences
- Lowest operating load and fastest iteration during the phase where product changes matter most.
- Less infrastructure control is accepted explicitly; the triggers above define when that stops being acceptable.
- Immediate actions: confirm Vercel Pro plan and function limits; move Supabase to Pro (no auto-pause, backups); co-locate Vercel function region with the Supabase region; set up preview environments against a staging database.
