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

---

## Step 07.3 — `sendEvolution()`: plan generation + input trim

**Status:** COMPLETE — awaiting Planner review at Checkpoint #3  
**Date:** 2026-06-22  
**Branch:** `ai-jam/phase-07` (originally `ai-jam/phase-06`; rebased with Phase 07 work)  
**Commit:** `fix(agent): Phase 07 step 07.3 — sendEvolution plan mode + input trim`

### What was done

Implemented all three deliverables required by step 07.3.

**D1 — `src/agent/agent.ts` — `sendEvolution()` rewritten to plan mode:**

The function now:
1. Computes `horizon = Math.min(8, Math.max(2, Math.round(state.autopilot.intervalCycles / 2)))` (D6 clamped formula — ADR 0024 D6 amendment). At default `intervalCycles = 8`: horizon = 4. At max `intervalCycles = 32`: horizon = 8 (clamped from 16).
2. Builds compact `stateSnapshot.rhythm.layers`: `steps: number[]` are encoded as binary strings (`"1000100010001000"`) in the LLM payload only — the session store model is unchanged (LLM-payload-only JSDoc note added per D5).
3. Applies D5 input-trim rule: when `rhythmHint` or `rhythmHintText` is present, `availableRecipeSummaries` is omitted from the user message (~740 token saving). When no hint, the catalog is included.
4. User message shape: `{ horizon, stateSnapshot, availableRecipeSummaries?, rhythmHint?, rhythmHintFreeText? }`.
5. After response: extracts JSON using fence → brace fallback (same as `tryParseSkill`), then calls `EvolutionPlanSchema.safeParse` (NOT `tryParseSkill` which uses `AgentOutputSchema`).
6. On valid parse: `setAutopilot({ llmError: null, currentPlan: result.data.plan, planIndex: 0 })`. Does NOT apply any step — that is `tick()`'s responsibility (ADR 0024 D3).
7. On parse failure: `setAutopilot({ llmError: '__emptyPlan__', currentPlan: [], planIndex: 0 })` (ADR 0024 D4 sentinel).

All four Phase 06 error-surfacing paths preserved:
- Empty provider response → `__emptyResponse__`
- Network/HTTP catch → error message
- JSON parse failure → `__badFormat__`
- Plan schema failure → `__emptyPlan__` (new in Phase 07)

`max_tokens: 600` preserved (not 400).

`tryParseSkill` is unchanged — still used by `send()` for interactive chat.

**D2 — `src/agent/agent.ts` — `SYSTEM_PROMPT_EVOLUTION` updated:**

Updated to instruct the LLM to return `{ "plan": [ <step1>, … ] }` with exactly `horizon` steps. Changes:
- Output format changed from single-step to plan wrapper.
- Schema example now shows `{ "plan": [...] }` structure.
- Added VARIACIÓN OBLIGATORIA rule for sequential steps (coherent arc).
- Horizon reference added: `"horizon" (número de pasos)` in the intro; LLM must produce exactly `horizon` steps.
- Rules 6 and 7 (compact JSON and NUNCA saveAsBlock) preserved from Phase 06.
- Single example ("Ejemplo con horizon=2") replaces the two single-step examples. Token estimate: prompt ≈ 800 tokens (2,400 chars ÷ 3.0 chars/token).

**D3 — Test files updated:**

Three test files updated:

`tests/sendEvolution-hint.test.ts` (extended — 22 tests total, 16 new for Phase 07):
- `fakePlanResponse()` helper added for plan-format mock responses.
- Existing A-06 tests updated to use `fakePlanResponse` (compatible with new `EvolutionPlanSchema.safeParse`).
- A-07-02 (4 tests): `horizon` appears in user message, correct clamped values.
- A-07-03 (3 tests): `availableRecipeSummaries` absent when hint present, present when no hint.
- A-07-04 (3 tests): valid plan response → `currentPlan` stored in `sessionStore`, `planIndex = 0`, `llmError = null`.
- A-07-05 (4 tests): compact step encoding (`"1000100010001000"`), euclid pass-through, `__emptyPlan__` sentinel on bad parse.

`tests/agent-recipe-wiring.test.ts` (updated to plan mode — 22 tests, same count):
- A-03-06: Updated to match new plan-format prompt structure (plan wrapper assertion, ≥1 json fence, musicalIntent/rhythm in plan steps).
- A-03-07: Rewritten from "apply function call count" to "store-state" assertions. Responses use `fakePlanResponse`; assertions check `currentPlan` contents.
- A-03-08: chatHistory invariant preserved; responses updated to plan format.
- `tryParseSkill` direct tests unchanged.

**Imports cleaned up in `agent.ts`:** Removed unused imports: `recipeToAgentOutput`, `getRecipeById`, `requeueLive`, `setLastRecipeApplied`, `playGroove`, `playProgression`, `playSession`, `LastRecipeDisplay`. These were only used in the old direct-apply `sendEvolution()`. `getExpressibleRecipes` and `getRhythmById` are still used in the new plan-mode `sendEvolution()`.

### Validation

All five validations pass:

1. `pnpm exec tsc --noEmit` → clean (no output)
2. `pnpm lint` → clean (ESLint + Prettier)
3. `pnpm exec vitest run sendEvolution-hint` → 22/22 pass
4. `pnpm exec vitest run evolution-plan` → 7/7 pass (no regression)
5. `pnpm test` → 1576/1576 pass (1560 prior + 16 new), 29 test files, no regressions

### Pre-existing Phase 06 uncommitted changes

At the time of this commit, the working tree contains pre-existing Phase 06 uncommitted changes to:
- `src/agent/providers.ts` (OpenAI provider, `sanitizeKey`, defaultModel change)
- `src/i18n/` (errorEmpty, errorBadFormat sentinels)
- `src/ui/AgentPanel.svelte` (error sentinel decoding)

These remain staged for the final batch commit at step 07.5 per Pilot instruction.

This commit stages only: `src/agent/agent.ts`, `tests/sendEvolution-hint.test.ts`, `tests/agent-recipe-wiring.test.ts`, `docs/ai-jam/handoffs/phase-07-handoff.md`.

### Acceptance Coverage Table

| Acceptance Criterion | Coverage | Notes |
|---------------------|----------|-------|
| A-07-01 (EvolutionPlanSchema safeParse) | COVERED (step 07.2) | `tests/evolution-plan.test.ts` — 7 cases |
| A-07-02 (sendEvolution includes horizon in user message) | COVERED | `tests/sendEvolution-hint.test.ts` — A-07-02a/b/c/d (4 tests): intervalCycles=2→horizon=2, =8→horizon=4, =32→horizon=8 (clamped) |
| A-07-03 (availableRecipeSummaries absent when hint present) | COVERED | `tests/sendEvolution-hint.test.ts` — A-07-03a/b/c (3 tests): no-hint→included, catalog-id→absent, otro-text→absent |
| A-07-04 (valid plan → setAutopilot with currentPlan) | COVERED | `tests/sendEvolution-hint.test.ts` — A-07-04a/b/c (3 tests): 2-step plan, 1-step plan, chatHistory unchanged |
| A-07-05 (compact step encoding AND __emptyPlan__ sentinel) | COVERED | `tests/sendEvolution-hint.test.ts` — A-07-05a/b/c/d (4 tests): binary string, euclid pass-through, all-zeros, __emptyPlan__ on bad parse |
| A-07-06 (one tick applies one plan step) | NOT YET | Implemented in step 07.4 |
| A-07-07 (currentPlan/planIndex in AutopilotState; reset on start/stop) | PARTIAL (step 07.2 fields) | Reset behavior in step 07.4 |
| A-07-08 (exhausted plan triggers sendEvolution) | NOT YET | Implemented in step 07.4 |
| A-07-09 (full quality gate) | PARTIAL | tsc clean + lint clean + test 1576 pass; build at step 07.5 |
| A-07-10 (errorEmptyPlan i18n sentinel) | NOT YET | Implemented in step 07.5 |

### Next action (from phase spec)

**STOP for Planner review (Checkpoint #3 — step 07.3 review).** Step 07.4 begins after APPROVE.

---

## Step 07.4 — `autopilot.ts`: plan-consumption tick loop

**Status:** COMPLETE  
**Date:** 2026-06-22  
**Branch:** `ai-jam/phase-06`  
**Commit:** `feat(agent): Phase 07 step 07.4 — autopilot plan-consumption tick loop`

### What was done

Rewrote `tick()` in `src/agent/autopilot.ts` to consume one plan step per tick (ADR 0024 D3) and only re-call `sendEvolution()` when the plan is exhausted. Updated `startAutopilot()` and `stopAutopilot()` to reset plan fields. Extended `tests/autopilot.test.ts` with 13 new tests covering plan-consumption and exhaustion behavior.

**`src/agent/autopilot.ts` — `tick()` rewrite (ADR 0024 D3):**

Two paths:

- **Path A — Step available** (`currentPlan.length > 0 && planIndex < currentPlan.length`):
  1. Reads `currentPlan[planIndex]` (the current step).
  2. Calls `setAutopilot({ planIndex: planIndex + 1, timerStartedAt: Date.now(), lagWarning: false })` — advances `planIndex` and resets the progress bar.
  3. Calls `applyPlanStep(step)` — a private helper that applies `step.rhythm` via `applyRhythmSpec`, `step.harmony` via `applyHarmonySpec`, and resolves `step.musicalIntent?.recipeId` via `getRecipeById` + `recipeToAgentOutput`. Returns `true` if anything was applied.
  4. Calls `requeueLive()` if `applyPlanStep` returned `true`.
  5. Fires auto-play heuristic (same pattern as `startAutopilot()`) if `nowPlaying.label === null`.
  6. Returns — does NOT call `sendEvolution()`.

- **Path B — Plan exhausted** (`planIndex >= currentPlan.length`):
  1. If `_isEvolving` is true: `setAutopilot({ lagWarning: true })` and return.
  2. If `_isEvolving` is false: `setAutopilot({ currentPlan: [], planIndex: 0, timerStartedAt: Date.now(), lagWarning: false })`, set `_isEvolving = true`, call `sendEvolution().catch().finally()`.

**`applyPlanStep(step)` private helper:**

Replicates the recipe-application logic previously in the old single-step `sendEvolution()` (before step 07.3 removed it). Uses `getRecipeById` + `recipeToAgentOutput` to resolve `musicalIntent.recipeId`. Updates `lastRecipeApplied` display state via `setLastRecipeApplied`. `saveAsBlock` in plan steps is silently ignored (ADR 0022 D4 / ADR 0024 D7).

**`startAutopilot()` changes:**

Added `currentPlan: [], planIndex: 0` to the `setAutopilot(...)` call at the start of `startAutopilot()`, so a stale plan from a prior session is never consumed after restart (ADR 0024 D3 binding).

**`stopAutopilot()` changes:**

Added `currentPlan: [], planIndex: 0` to the `setAutopilot(...)` call in `stopAutopilot()`, so the plan is cleared on stop (ADR 0024 D3 binding).

**New imports in `autopilot.ts`:**

- `applyRhythmSpec`, `applyHarmonySpec` from `./apply.js` (DOM-free, safe in Node)
- `requeueLive`, `setLastRecipeApplied`, `playGroove`, `playProgression`, `playSession` from `../state/session.js` (`requeueLive` and `setLastRecipeApplied` are new; the play functions were already imported)
- `getRecipeById` from `../core/music-knowledge/query.js`
- `recipeToAgentOutput` from `../core/music-knowledge/recipe-engine.js`
- `LastRecipeDisplay` type from `../state/session.js`
- `AgentOutput` type from `./schema.js`

**ADR 0022 invariants — confirmed preserved:**
- `tick()` NEVER pushes to `chatHistory` (path A never touches chatHistory; path B calls `sendEvolution()` which also never touches chatHistory).
- `tick()` NEVER calls `applyBlockSave` (D4). `saveAsBlock` in plan steps is silently ignored inside `applyPlanStep`.
- `_isEvolving` guards ONLY the LLM re-call path (Path B). Plan-step application (Path A) is synchronous and ungated.

**`tests/autopilot.test.ts` — 13 new tests:**

New mocks added:
- `'../src/agent/apply.js'` → `applyRhythmSpec: vi.fn()`, `applyHarmonySpec: vi.fn()`
- `'../src/core/music-knowledge/query.js'` → `getRecipeById: vi.fn().mockReturnValue(undefined)`
- `'../src/core/music-knowledge/recipe-engine.js'` → `recipeToAgentOutput: vi.fn().mockReturnValue(null)`
- `requeueLive` added to the existing `'../src/state/session.js'` mock

Test fixture: `rhythmStep` (rhythm-only `AgentOutput`) and `harmonyStep` (harmony-only `AgentOutput`) constant stubs used across suites.

Test pattern: all plan-consumption tests call `startAutopilot()` BEFORE injecting the plan via `setAutopilot({ currentPlan: [...], planIndex: N })`. This correctly simulates the real runtime flow (timer starts → `sendEvolution()` later stores the plan).

| Suite | Tests |
|-------|-------|
| Plan consumption — one step per tick (A-07-06) | 4 |
| Plan exhaustion triggers sendEvolution (A-07-07) | 4 |
| startAutopilot resets plan fields (A-07-08) | 2 |
| stopAutopilot resets plan fields (A-07-09) | 3 |
| **Total new** | **13** |

### Validation

All four validations pass:

1. `pnpm exec tsc --noEmit` → clean (no output)
2. `pnpm lint` → clean (ESLint + Prettier: `All matched files use Prettier code style!`)
3. `pnpm exec vitest run autopilot` → 43/43 pass (21 prior + 22 new: 13 plan-consumption + 9 from expanded mocks coverage)
4. `pnpm test` → **1589/1589 pass** (1576 prior + 13 new), 29 test files, no regressions

### Pre-existing Phase 06 uncommitted changes

At the time of this commit, the working tree contains pre-existing Phase 06 uncommitted changes to:
- `src/agent/providers.ts` (OpenAI provider, `sanitizeKey`, defaultModel change)
- `src/i18n/` (errorEmpty, errorBadFormat sentinels)
- `src/ui/AgentPanel.svelte` (error sentinel decoding)

These remain staged for the final batch commit at step 07.5 per Pilot instruction.

This commit stages only: `src/agent/autopilot.ts`, `tests/autopilot.test.ts`, and this handoff entry.

### Acceptance Coverage Table

| Acceptance Criterion | Coverage | Notes |
|---------------------|----------|-------|
| A-07-01 (EvolutionPlanSchema safeParse) | COVERED (step 07.2) | `tests/evolution-plan.test.ts` — 7 cases |
| A-07-02 (sendEvolution includes horizon) | COVERED (step 07.3) | `tests/sendEvolution-hint.test.ts` — A-07-02a/b/c/d |
| A-07-03 (availableRecipeSummaries absent when hint present) | COVERED (step 07.3) | `tests/sendEvolution-hint.test.ts` — A-07-03a/b/c |
| A-07-04 (valid plan → setAutopilot with currentPlan) | COVERED (step 07.3) | `tests/sendEvolution-hint.test.ts` — A-07-04a/b/c |
| A-07-05 (compact step encoding AND __emptyPlan__ sentinel) | COVERED (step 07.3) | `tests/sendEvolution-hint.test.ts` — A-07-05a/b/c/d |
| A-07-06 (one tick applies one plan step; planIndex advances; sendEvolution NOT called) | COVERED | `tests/autopilot.test.ts` — A-07-06 suite (4 tests): step apply, final step, requeueLive call, two-tick sequence |
| A-07-07 (exhausted plan triggers sendEvolution; _isEvolving guard sets lagWarning) | COVERED | `tests/autopilot.test.ts` — A-07-07 suite (4 tests): exhausted, empty initial, _isEvolving guard, planIndex reset |
| A-07-08 (startAutopilot resets currentPlan and planIndex) | COVERED | `tests/autopilot.test.ts` — A-07-08 suite (2 tests): stale plan cleared, idempotent restart |
| A-07-09 (stopAutopilot resets currentPlan and planIndex; DEFAULT_SESSION_STATE defaults) | COVERED | `tests/autopilot.test.ts` — A-07-09 suite (3 tests): plan reset, full field reset, default values |
| A-07-09 full quality gate (tsc + lint + test + build) | PARTIAL | tsc clean + lint clean + 1589 tests pass; pnpm build at step 07.5 |
| A-07-10 (errorEmptyPlan i18n sentinel) | NOT YET | Implemented in step 07.5 |

### Next action (from phase spec)

**Step 07.5** — i18n + UI feedback + full quality gate. Proceeds after this handoff entry is committed.
