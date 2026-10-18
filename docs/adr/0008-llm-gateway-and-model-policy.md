# ADR-0008: Single LLM gateway, structured outputs, eval-gated model changes

- **Status:** Proposed
- **Date:** 2026-10-18

## Context
Anthropic calls are made directly from two route files with duplicated prompts, model `claude-sonnet-4-6`, `max_tokens: 16000`. JSON is parsed with a sanitiser and, on failure, a second "repair" call. Each timeline item carries a `spatialReasoning` field the user never sees, billed at output rates. Model choices were made from ad-hoc tests (Haiku 4.5 failed the spatial rules). Costs are logged per generation.

## Options considered
1. Keep direct SDK calls per feature.
2. **One `platform/llm` gateway** used by all modules, with a task-based model policy, structured outputs and usage accounting.
3. Third-party LLM router/proxy. Adds a vendor and latency; no need for multi-provider today.

## Decision
Option 2.

- **Gateway API:** `generate<T>({ task, system, input, schema })` → typed, schema-validated `T` plus usage. Tasks: `trip.generate`, `trip.regenerateDay`, `trip.narrative`, `library.build`, `content.draft`.
- **Structured outputs** (`output_config.format` with the Zod-derived JSON schema) replace sanitise-and-repair. The repair call is removed.
- **Model policy per task in config**, not code. Starting point: `claude-sonnet-5-5` for generation; `claude-haiku-5-5` candidate for narrative/selection tasks once evals pass; Batch API for `library.build`.
- **Prompt caching** on the fixed system prompt and schema.
- **Reasoning moves out of the output:** drop `spatialReasoning`; route rules are validated in code (`planning/domain/routeValidation`) and only failing days are regenerated.
- **Untrusted input handling:** user free text only inside delimited sections; fixed system prompt; output always schema-validated before use.
- **Evals gate changes:** a fixed suite (cities × request profiles) scores schema validity, place validity, spatial-rule compliance, pacing and cost per trip. Any model, prompt or parameter change must not regress the suite.
- **Usage accounting:** every call records tokens (input, output, cache read/write) and cost to `CostLog`, tagged by task and job.

## Consequences
- One place to change models, prompts, limits and retries; cost and quality are measured, not guessed.
- Dependency on structured-output support for the chosen models (verify per model).
- Eval suite costs a small, bounded amount per run; runs on prompt/model changes, not every commit.
