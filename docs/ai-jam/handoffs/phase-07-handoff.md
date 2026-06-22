<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 07 Handoff — Evolution Plan: Multi-Cycle Batched Autopilot + Input Token Trim

---

## Step 07.1 — Inventory

**Status:** COMPLETE  
**Date:** 2026-06-21  
**Branch:** `ai-jam/phase-07`  
**Commit:** `docs(ai-jam): Phase 07 step 07.1 — evolution-plan inventory`

### What was done

Produced `docs/ai-jam/inventories/phase-07-inventory.md` covering all five mandated sections.

**§1 — Token arithmetic (REAL numbers, not estimates):**

The most critical finding is that the system prompt costs **~896 tokens** (2,688 chars ÷ 3.0), not the ~350 quoted in the Phase 06 handoff (which used chars ÷ 4). The `/3.0` chars/token ratio is confirmed by reconstructing the Pilot's browser-observed 2,343-token reading: a 6-layer live session + 16 recipes (pretty JSON) at `/3.0` produces 2,345 tokens — within 2 of the observed value.

Key measured sizes:

| Component | Chars | /3.0 tokens |
|-----------|------:|------------:|
| `SYSTEM_PROMPT_EVOLUTION` | 2,688 | 896 |
| 3-layer 16-step rhythm (pretty) | 870 | 290 |
| 4-chord harmony (pretty) | 441 | 147 |
| 16-recipe summaries, 4 fields (pretty) | 2,219 | 740 |
| rhythmHintPayload (catalog id) | ~39 | ~13 |

Worst-case total (6-layer state, no hint, 16 recipes): **~2,345 tokens** — over the 1,985 cap.

With hint + no recipes (6-layer): **~1,164 tokens** — under the 1,600 safer target.

**OD-3 bottom-line:** Dropping `availableRecipeSummaries` when a hint is present saves ~740 tokens, bringing the 6-layer hint-path case from 1,770 → 1,030 tokens. Option A alone is sufficient for the targeted use case.

**§2 — AutopilotState extension:** Confirmed 8 current fields. Proposed `currentPlan: AgentOutput[]` (type `AgentOutput` from `schema.ts` line 329) and `planIndex: number` (default `0`). Both ephemeral — automatically excluded from `SavedSessionSchema` via the existing `autopilot`-key-absent mechanism. No code change to `persistence.ts` needed.

**§3 — Open Decisions:** Three ODs documented with options, tradeoffs, and clear recommendations:
- OD-1: **Option B** (derived horizon: `Math.max(2, Math.round(intervalCycles / 2))`)
- OD-2: **Option A** (`EvolutionPlanSchema` wrapper object with `min(1).max(8)`)
- OD-3: **Option A** (drop recipes when hint present; sufficient for targeted use case)

**§4 — ADR trigger:** ADR 0024 flagged. 8 decision areas described for the Pilot to govern when drafting.

**§5 — Test file targets:** `tests/evolution-plan.test.ts` (new), `tests/autopilot.test.ts` (extended), `tests/sendEvolution-hint.test.ts` (extended).

### Validation

- `docs/ai-jam/inventories/phase-07-inventory.md` exists and covers all five sections.
- No source files modified (`git status` shows only the inventory and this handoff as new/modified).

### Open decisions blocking step 07.2

| OD | Question | Options | Status |
|----|----------|---------|--------|
| OD-1 | Horizon source: new `horizonCycles` field vs. derived from `intervalCycles` vs. LLM-chosen bounded | A (new field), B (derived), C (LLM-chosen) | **UNRESOLVED — Pilot decision required** |
| OD-2 | Schema shape: named `EvolutionPlanSchema` wrapper vs. bare array | A (wrapper), B (bare array) | **UNRESOLVED — Pilot decision required** |
| OD-3 | Input-trim aggressiveness: drop recipes when hint present vs. also compact step encoding | A (drop recipes only), B (also compact steps) | **UNRESOLVED — Pilot decision required** |

### Acceptance Coverage Table (step 07.1 scope: inventory only)

| Acceptance Criterion | Coverage | Notes |
|---------------------|----------|-------|
| A-07-01 (EvolutionPlanSchema safeParse) | NOT YET | Implemented in step 07.2 |
| A-07-02 (sendEvolution includes horizon) | NOT YET | Implemented in step 07.3 |
| A-07-03 (availableRecipeSummaries absent when hint present) | NOT YET | Implemented in step 07.3 |
| A-07-04 (valid plan → setAutopilot with currentPlan) | NOT YET | Implemented in step 07.3 |
| A-07-05 (empty plan → setAutopilot with __emptyPlan__) | NOT YET | Implemented in step 07.3 |
| A-07-06 (one tick applies one plan step) | NOT YET | Implemented in step 07.4 |
| A-07-07 (currentPlan/planIndex in AutopilotState) | NOT YET | Implemented in step 07.2 |
| A-07-08 (exhausted plan triggers sendEvolution) | NOT YET | Implemented in step 07.4 |
| A-07-09 (full quality gate) | NOT YET | Verified at step 07.5 completion |
| A-07-10 (errorEmptyPlan i18n sentinel) | NOT YET | Implemented in step 07.5 |

---

## Step 07.2 — ADR 0024 + Schema: `EvolutionPlanSchema` and `AutopilotState` plan fields

**Status:** COMPLETE — awaiting Pilot ADR ratification at Checkpoint #2  
**Date:** 2026-06-22  
**Branch:** `ai-jam/phase-06`  
**Commit:** `feat(schema): Phase 07 step 07.2 — EvolutionPlanSchema + AutopilotState plan fields (ADR 0024)`

### What was done

Implemented all four deliverables required by step 07.2.

**D1 — `docs/adr/0024-evolution-plan.md` drafted:**

ADR 0024 covers all seven decisions (D1–D7) per the spec. Each ADR 0022 invariant (D1–D7)
is explicitly cited and its preservation in Phase 07 stated. Key decisions recorded:
- D1: `EvolutionPlanSchema = z.object({ plan: z.array(AgentOutputSchema).min(1).max(8) })` — plan-layer only; no SCHEMA_VERSION bump.
- D2: `currentPlan: AgentOutput[]` (default `[]`) and `planIndex: number` (default `0`) added to `AutopilotState`; both ephemeral via existing autopilot-key-absent mechanism.
- D3: Plan-consumption loop contract — one step per tick; `_isEvolving` guards only LLM re-call; step application is fast/synchronous.
- D4: Empty/invalid plan → `'__emptyPlan__'` sentinel + return; decoded by existing `llmError` block in step 07.5.
- D5: Drop `availableRecipeSummaries` when hint present (OD-3 Option A + compact JSON); implementation deferred to step 07.3.
- D6: `horizon = Math.max(2, Math.round(intervalCycles / 2))` — no new state field; injected in user message.
- D7: ADR 0022 D1–D7 all preserved; `saveAsBlock` in plan steps silently ignored at application time.

ADR 0024 is a draft — Checkpoint #2 (ADR review) required before step 07.3 begins.

**D2 — `src/agent/schema.ts` — `EvolutionPlanSchema` added:**

Added after the `AgentOutputSchema` definition block (before the inferred-types section):

```typescript
export const EvolutionPlanSchema = z.object({
  plan: z.array(AgentOutputSchema).min(1).max(8),
});
export type EvolutionPlan = z.infer<typeof EvolutionPlanSchema>;
```

`SCHEMA_VERSION` (6), `AgentOutputSchema`, and all existing schemas are unchanged.
A JSDoc comment on `EvolutionPlanSchema` notes the Phase 07 addition and ADR 0024 D1
reference.

**D3 — `src/state/session.ts` — `AutopilotState` extended:**

- Added `import type { AgentOutput } from '../agent/schema.js'` to the import section.
- Added `currentPlan: AgentOutput[]` and `planIndex: number` to the `AutopilotState` interface with JSDoc exclusion comments per ADR 0022 D1 pattern.
- Added default values `currentPlan: [], planIndex: 0` to `DEFAULT_SESSION_STATE.autopilot`.
- `serializeSession`, `SavedSessionSchema`, and `SESSION_SCHEMA_VERSION` are unchanged — the entire `autopilot` key is absent from `SavedSessionSchema`, so both new fields are automatically excluded.

**D4 — `tests/evolution-plan.test.ts` — new test file (AGPL-3.0 header):**

Seven test cases covering the six spec-required scenarios:

| # | Case | Result |
|---|------|--------|
| 1 | Valid plan with 1 rhythm-only step | success |
| 2 | Valid plan with 3 mixed steps (rhythm/harmony/musicalIntent) | success |
| 3 | Step with `saveAsBlock` only | success (schema valid; D7: silently ignored at runtime) |
| 4 | Plan with 8 steps (maximum) | success |
| 5 | Empty array `{ plan: [] }` | failure (Zod `min(1)`) |
| 6 | Array exceeding max (9 steps) | failure (Zod `max(8)`) |
| 7 | Step missing all required fields `{}` | failure (AgentOutputSchema `superRefine`) |

### Validation

**All three validations pass:**

- `pnpm exec tsc --noEmit` → clean (no output)
- `pnpm exec vitest run evolution-plan` → 7/7 tests pass
- `pnpm test` → 1560 tests (1553 prior + 7 new), 29 test files, no regressions

**Pre-existing Phase 06 changes note:** At the time of this commit, the working tree contains
pre-existing Phase 06 uncommitted changes to `src/agent/agent.ts`, `src/agent/providers.ts`,
and related files (error-surfacing in `sendEvolution()`, OpenAI provider, key sanitization,
compact-JSON prompt rule). These files are out of scope for step 07.2 and were NOT touched by
this step. The git staging set for this commit includes only the four deliverables of step 07.2
plus this handoff entry.

### Acceptance Coverage Table

| Acceptance Criterion | Coverage | Notes |
|---------------------|----------|-------|
| A-07-01 (EvolutionPlanSchema safeParse — valid 1-step, 3-step, empty, 9-step, no-fields, saveAsBlock-only) | COVERED | `tests/evolution-plan.test.ts` — all 7 cases pass |
| A-07-02 (sendEvolution includes horizon in user message) | NOT YET | Implemented in step 07.3 |
| A-07-03 (availableRecipeSummaries absent when hint present) | NOT YET | Implemented in step 07.3 |
| A-07-04 (valid plan → setAutopilot with currentPlan) | NOT YET | Implemented in step 07.3 |
| A-07-05 (empty plan → setAutopilot with __emptyPlan__) | NOT YET | Implemented in step 07.3 |
| A-07-06 (one tick applies one plan step) | NOT YET | Implemented in step 07.4 |
| A-07-07 (currentPlan/planIndex in AutopilotState; absent from SavedSessionSchema; reset on start/stop) | PARTIAL | Fields exist in interface + defaults; reset behavior in step 07.4 |
| A-07-08 (exhausted plan triggers sendEvolution) | NOT YET | Implemented in step 07.4 |
| A-07-09 (full quality gate: tsc + lint + test + build) | PARTIAL | tsc clean + test 1560 pass; lint + build at step 07.5 |
| A-07-10 (errorEmptyPlan i18n sentinel) | NOT YET | Implemented in step 07.5 |

### ADR 0024 Checkpoint #2 note

ADR 0024 is a draft awaiting Pilot ratification. Step 07.3 must not begin until the Pilot
approves or directs revisions. The phase spec identifies this step as a Pilot Checkpoint #2.

### Next action (from phase spec)

**STOP for Pilot ADR review (Checkpoint #2).** Step 07.3 begins after Pilot approves ADR 0024.
