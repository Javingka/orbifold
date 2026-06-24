<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Handoff — Phase 02 (Recipe Chip Affordance)

---

## Step 02.1 — Inventory

**Date:** 2026-06-23
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

- Read all eight required source files in the order specified by the phase spec.
- Confirmed AG-D1 and all active decision entries are present in `docs/authentic-groove/decisions.md`.
- Confirmed `applySampleMap` is wired in `autopilot.ts` at lines 135–140 (after `applyRhythmSpec`, inside the `recipeId` branch of `applyPlanStep`).
- Traced the full call path from chip tap to audio; confirmed all functions except `applyRecipeById` already exist and are exported.
- Confirmed `requeueLive()` is synchronous (returns `string | null`, not a Promise).
- Identified exact UI insertion point for the recipe chip row.
- Counted expressible recipes from `getExpressibleRecipes()`: **14 of 15** (not 15).
- Identified that `buleria-flamenco-phrygian` is excluded because `buleria-12` is a 12-step struct entry (not 16-step), failing the expressibility filter.
- Described AG-D1 seam impact; confirmed no extension to the grep command is needed.
- Produced `docs/authentic-groove/inventories/phase-02-inventory.md`.
- No `.ts` or `.svelte` files were modified.

### Files touched

- `docs/authentic-groove/inventories/phase-02-inventory.md` (new)
- `docs/authentic-groove/handoffs/phase-02-handoff.md` (new)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory-only step).

### Routine validations

`git status` → only `docs/authentic-groove/inventories/phase-02-inventory.md` and `docs/authentic-groove/handoffs/phase-02-handoff.md` are new.

### Acceptance Coverage Table

No Acceptance IDs touched by this step (inventory step — read-only).

### Decisions made (if any)

None. One open decision was surfaced and requires Pilot resolution.

### Proposed Decisions Register entries (if any)

None.

### Open decisions surfaced — Pilot must resolve before step 02.2

**OD-1 (Phase 02): Expressible recipe count discrepancy**

The phase header and Acceptance criterion A-02-01 state "all 15 currently in catalog." However, `getExpressibleRecipes()` returns **14** chips because `buleria-flamenco-phrygian` is excluded — its rhythm `buleria-12` is a 12-step struct, which fails the `steps === 16` requirement.

Two options (see inventory §3 for full detail):

- **Option A (recommended):** Accept 14 chips; update A-02-01 to say "14 expressible recipe chips." No code changes to music-knowledge data.
- **Option B:** Make `buleria-12` expressible (extend to 16 steps or add a euclid alternate). Requires a Pilot decision on musical data changes.

**Step 02.2 cannot begin until the Pilot selects Option A or B.**

### Blockers resolved during this step (if any)

None.

### Environment state after this step

No source files modified. Tests unchanged. All validation commands would still pass (unchanged from Phase 01 baseline).

### Next-step context (non-obvious)

- Step 02.2 should add `setLastRecipeApplied(null)` at the top of both `applyRhythmSpec` and `applyHarmonySpec` in `apply.ts` (badge invalidation), then add the exported `applyRecipeById` function to `autopilot.ts`. All required imports are already present in `autopilot.ts` — no new import lines needed.
- If Pilot chooses Option A (14 chips), step 02.3's test count and acceptance wording should be updated to reflect 14.

### Planner Review

**Planner Review:** APPROVED on 2026-06-23. Iteration: 1 of 5.
All four required inventory sections present and complete; OD-1 surfaced correctly and resolved by Pilot (Option A, 14 chips, phase file updated); no source files touched; commit scope and message format correct; Register respected; no seam violations possible in a read-only step.
Next action: Dev proceeds to step 02.2

---

## Step 02.2 — `applyRecipeById` wrapper + badge invalidation

**Date:** 2026-06-23
**Commit(s):** `feat(agent): Phase 02 step 02.2 — applyRecipeById wrapper + badge invalidation`
**Iteration:** 1 of 5

### Completed

- Read inventory §1 (call path trace); confirmed all imports already present in `autopilot.ts` — no new import lines required.
- Confirmed AG-D1 seam decision is in force; verified by targeted grep below.
- **`src/agent/apply.ts`**: Added `setLastRecipeApplied` to the existing session.ts import. Added `setLastRecipeApplied(null)` call at the top of `applyRhythmSpec` (before layers build) and at the top of `applyHarmonySpec` (before `sessionStore.update`). This invalidates the active recipe badge on any direct call to either function.
- **`src/agent/autopilot.ts`**: Added exported function `applyRecipeById(id: string): boolean` after `applyPlanStep`. Implements the call path from inventory §1: `getRecipeById` → `recipeToAgentOutput` → guard for undefined rhythm/harmony → `applyRhythmSpec` → `applySampleMap` → `applyHarmonySpec` → `setLastRecipeApplied(display)` → `requeueLive()` → auto-play heuristic (identical to tick() Path A) → `return true`. Returns false if recipe is not found or not expressible (null from `recipeToAgentOutput`). `applyPlanStep` is not modified.
- **`tests/authentic-groove/apply-recipe-by-id.test.ts`**: New test file (AGPL-3.0 header). 20 tests covering:
  - cumbia recipe (with sampleMap): returns true; bd-slot carries `strudelSample: 'perc'`; `lastRecipeApplied.recipeId = 'cumbia-latina-groove'`; recipeName and harmonyId populated; harmony progression non-empty.
  - pop-rock-backbeat (no sampleMap): returns true; no layer carries `strudelSample`; badge set.
  - Unknown ID: returns false; layers unchanged; `lastRecipeApplied` unchanged.
  - buleria-flamenco-phrygian (non-expressible, 12-step struct): returns false; layers unchanged; badge unchanged.
  - Badge invalidation via direct `applyRhythmSpec` call: badge cleared.
  - Badge invalidation via direct `applyHarmonySpec` call: badge cleared.
  - Badge correctness: last applied recipe ID wins; explicit `setLastRecipeApplied(null)` clears badge.

### Files touched

- `src/agent/apply.ts` (modified — import consolidation + badge invalidation calls)
- `src/agent/autopilot.ts` (modified — `applyRecipeById` export added)
- `tests/authentic-groove/apply-recipe-by-id.test.ts` (new)
- `docs/authentic-groove/handoffs/phase-02-handoff.md` (this file)

### Validation evidence

**`pnpm exec tsc --noEmit`** → clean (no errors)

**`pnpm exec vitest run apply-recipe-by-id`**:
```
✓ tests/authentic-groove/apply-recipe-by-id.test.ts (20 tests) 8ms
Test Files  1 passed (1)
    Tests  20 passed (20)
```

**`pnpm test`** → 1693 tests passed (1673 prior + 20 new), no regressions. 33 test files.

**Seam grep (AG-D1)** — `apply.ts` and `autopilot.ts` carry zero genre names or sample literals:
```
grep -n -E "(cumbia|samba|cueca|candombe|buleria|flamenco|rumba|bossa|clave|afro-cuban|west-african|cascara|aksak|gospel|perc|cb|sd_fallback)" \
  src/agent/apply.ts src/agent/autopilot.ts
→ (no output)
```

### Acceptance Coverage

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-02-03 | `applyRecipeById` applies rhythm + sample overlay + harmony in correct order; cumbia bd-slot carries `strudelSample: 'perc'` | `tests/authentic-groove/apply-recipe-by-id.test.ts` | unit | covered |
| A-02-04 | `applyRecipeById` returns false for unknown IDs and non-expressible recipes; store unchanged | `tests/authentic-groove/apply-recipe-by-id.test.ts` | unit | covered |
| A-02-07 | Calling `applyRhythmSpec` or `applyHarmonySpec` directly clears `lastRecipeApplied`; badge re-set by `applyRecipeById` | `tests/authentic-groove/apply-recipe-by-id.test.ts` | unit | covered |
| A-02-05 | `tsc --noEmit` clean; `pnpm test` ≥ 1673 + new tests | (operability) | operability | partial — lint and build not run yet (02.4 gate) |
| A-02-01 | Recipe chip row visible with one chip per expressible recipe | (none yet) | — | not covered — deferred to step 02.3 |
| A-02-02 | Tapping a chip calls `applyRecipeById` with the correct recipe ID | (none yet) | — | not covered — deferred to step 02.3 |
| A-02-06 | No genre name or sample literal outside `src/core/music-knowledge/` | seam grep above | live-system | partial — full extended grep deferred to step 02.4 |

### Decisions made (if any)

The `engineOutput.rhythm` / `engineOutput.harmony` optional-field guard (`if (!engineOutput.rhythm || !engineOutput.harmony) return false`) was added because `AgentOutput` types those fields as optional, even though `recipeToAgentOutput` always populates both when it returns non-null. The guard is defensive and correct: if for any reason either field is absent, `applyRecipeById` returns false (no partial application). This is consistent with the spec's "false if not expressible" contract.

### Proposed Decisions Register entries (if any)

None — no governance decision required; the optional-field guard is a TypeScript strictness artifact, not an architectural choice.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

`src/agent/apply.ts`, `src/agent/autopilot.ts` modified; new test file added. `tsc --noEmit` clean. `pnpm test` 1693/1693 passing. Step 02.3 (UI recipe chip row) is next.
