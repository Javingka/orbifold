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

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**
