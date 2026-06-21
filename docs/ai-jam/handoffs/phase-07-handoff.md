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
