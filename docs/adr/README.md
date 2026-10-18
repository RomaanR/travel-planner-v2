# Architecture Decision Records

Format: lightweight [MADR](https://adr.github.io/madr/). One decision per file, numbered, never deleted. A changed decision gets a new ADR that supersedes the old one.

**Statuses:** Proposed → Accepted → (Deprecated | Superseded by ADR-NNNN)

| ADR | Title | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-modular-monolith-typescript-nextjs.md) | Modular monolith in TypeScript on Next.js | Proposed |
| [0003](0003-hosting-platform.md) | Hosting platform: Vercel + Supabase vs AWS | Accepted |
| [0004](0004-async-generation-jobs.md) | Generation as durable background jobs | Proposed |
| [0005](0005-credit-ledger-entitlements.md) | Entitlements via an append-only credit ledger | Proposed |
| [0006](0006-trip-aggregate-versioning.md) | Trip aggregate with immutable versions | Proposed |
| [0007](0007-place-identity-and-city-library.md) | Place identity by provider ID and curated city libraries | Proposed |
| [0008](0008-llm-gateway-and-model-policy.md) | Single LLM gateway, structured outputs, eval-gated model changes | Proposed |
| [0009](0009-schema-migrations-expand-contract.md) | Versioned schema migrations with expand/contract | Proposed |
| [0010](0010-ci-quality-gates-and-testing.md) | CI quality gates and testing strategy | Proposed |
| [0011](0011-configuration-as-code-and-secrets.md) | Platform configuration as code and secrets handling | Proposed |
| [0012](0012-content-agent-approval-workflow.md) | Content agent with human approval | Proposed |

## Template

```markdown
# ADR-NNNN: Title

- **Status:** Proposed
- **Date:** YYYY-MM-DD
- **Deciders:** …

## Context
What forces are at play; what problem needs a decision.

## Options considered
1. …
2. …

## Decision
What we will do.

## Consequences
Positive, negative, and what we must now do. Include revisit triggers where relevant.
```
