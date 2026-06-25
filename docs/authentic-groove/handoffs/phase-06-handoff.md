<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 06 Handoff — Default Tempo per Recipe + Dynamic Step Grid

---

## Step 06.1 — Inventory

**Date:** 2026-06-25
**Iteration:** 1 of 1

### Completed

- Read all required source files: `CLAUDE.md`, `decisions.md`, ADR 0025, `rhythm-harmony-recipes.ts`, `autopilot.ts`, `session.ts` (setBpm lines), `rhythm-scene.ts` (full), `persistence.ts` (SavedRhythmLayerSchema), `apply.ts` (applyRhythmSpec), `propagation.test.ts`, `recipe-engine.ts`.
- Confirmed `SESSION_SCHEMA_VERSION = 5`, `SCHEMA_VERSION = 6`, test count at 1831, AG-D1 in force.
- Confirmed `setBpm` in `session.ts` updates the store reactively and fires `a.setTempo(bpm)` fire-and-forget.
- Confirmed `setBpm` is NOT currently imported in `autopilot.ts` — must be added.
- Confirmed exact insertion point for `setBpm` call in `applyRecipeById`: after `applyLockedFlags` (step 4b), before `applyHarmonySpec` (current step 5).
- Confirmed `cumbia-latina-groove` bpmRange `[80, 130]` — `defaultCpm: 30` → bpm 120 satisfies invariant (80 ≤ 120 ≤ 130).
- Confirmed `cueca-chilena-folk` bpmRange `[100, 170]` — `defaultCpm: 40` → bpm 160 satisfies invariant (100 ≤ 160 ≤ 170).
- Traced all RSTEPS references in `rhythm-scene.ts`: 3 RSTEPS in `rebuildRhythmGeo` inner loop, 4 RSTEPS in `tickRhythm` (ring close, linear polyline, dot loop, curStep calculation). All must be replaced with per-layer `N`.
- Key finding: `applyRhythmSpec` pads ALL steps variants to RSTEPS=16, including 12-step cueca binary strings. So all cueca layers in the session store have `steps.length === 16`. The dynamic grid using `.length` is correct and forward-compatible; 06.4 integration test must assert `steps.length === 16` (actual behavior), not 12.
- Confirmed `applyLoadedSession` does NOT restore `locked` from parsed sessions — pre-existing gap from Phase 05, not in scope for Phase 06.
- Confirmed seam grep plan per §8 of inventory.

### Files touched

- `docs/authentic-groove/inventories/phase-06-inventory.md` (completed — §9 and §10 added)
- `docs/authentic-groove/handoffs/phase-06-handoff.md` (this file, new)

### Validation evidence (per Acceptance ID)

No Acceptance IDs claimed in step 06.1 (inventory — read-only).

- `git status` confirms only inventory and handoff files are new/modified. No `.ts`, `.svelte`, or binary files modified.

### Routine validations

Not applicable for inventory step.

---

## Step 06.2 — `defaultCpm` on `MusicalRecipe` + tempo injection in `applyRecipeById` + tests

**Date:** 2026-06-25
**Iteration:** 1 of 1

### Completed

- Added `defaultCpm?: number` field to `MusicalRecipe` interface in `rhythm-harmony-recipes.ts` with full JSDoc (invariant documented: `bpmRange[0] ≤ defaultCpm * 4 ≤ bpmRange[1]`).
- Added `defaultCpm: 30` to `cumbia-latina-groove` (120 BPM, within `bpmRange: [80, 130]`).
- Added `defaultCpm: 40` to `cueca-chilena-folk` (160 BPM, within `bpmRange: [100, 170]`).
- All 13 other recipes: no `defaultCpm` added — tempo unchanged on apply (backward-compatible).
- Added `setBpm` to imports from `../state/session.js` in `autopilot.ts`.
- Injected tempo step after `applyLockedFlags` (step 4b), before `applyHarmonySpec` (new step 6): `if (recipe.defaultCpm !== undefined) { setBpm(recipe.defaultCpm * 4); }`. AG-D1 compliant — no genre name in the inserted code.
- Updated `applyRecipeById` JSDoc call-order comment to reflect 8 steps (3, 4b, new-5, 6, 7, 8).
- Added Invariant 10 to `tests/music-knowledge/recipes.test.ts`: `defaultCpm * 4 in [bpmRange[0], bpmRange[1]]` enforced for all recipes with the field.
- Created `tests/authentic-groove/default-tempo.test.ts` (AGPL-3.0 header) with 13 tests covering: formula unit tests, catalog spot-checks, and `applyRecipeById` BPM injection for cumbia (→120), cueca (→160), and no-change recipes.
- `tsc --noEmit` clean; `pnpm test` passes 1859 tests (1831 prior + 28 new).

### Files touched

- `src/core/music-knowledge/rhythm-harmony-recipes.ts` (added `defaultCpm?` field to interface; `defaultCpm: 30` on cumbia; `defaultCpm: 40` on cueca)
- `src/agent/autopilot.ts` (added `setBpm` import; injected tempo step in `applyRecipeById`; updated JSDoc)
- `tests/music-knowledge/recipes.test.ts` (added Invariant 10)
- `tests/authentic-groove/default-tempo.test.ts` (new — 13 tests)
- `docs/authentic-groove/handoffs/phase-06-handoff.md` (this file)

### Validation evidence (per Acceptance ID)

- **A-06-01 (partial):** `MusicalRecipe.defaultCpm?` exists — confirmed by `tsc --noEmit` clean. Field type and JSDoc in `rhythm-harmony-recipes.ts`.
- **A-06-02 (partial):** `applyRecipeById('cumbia-latina-groove')` sets `bpm = 120`; `applyRecipeById('cueca-chilena-folk')` sets `bpm = 160`; `applyRecipeById('bossa-nova-groove')` leaves `bpm` unchanged — covered by `default-tempo.test.ts` (13 tests, all pass).
- **A-06-03 (partial):** Invariant 10 enforced by `recipes.test.ts` — 247 tests pass, including Invariant 10 for both cumbia and cueca.

### Routine validations

- `pnpm exec tsc --noEmit` → clean (no output)
- `pnpm exec vitest run default-tempo` → 13 tests pass
- `pnpm test` → 1859 tests pass, no regressions

---

## Step 06.3 — Dynamic step grid in PIXI rhythm canvas

**Date:** 2026-06-25
**Iteration:** 1 of 1

### Completed

<!-- filled in after step 06.3 implementation -->

### Files touched

<!-- filled in after step 06.3 implementation -->

### Validation evidence (per Acceptance ID)

<!-- filled in after step 06.3 implementation -->

### Routine validations

<!-- filled in after step 06.3 implementation -->

---

## Step 06.4 — End-to-end smoke test + seam fitness check + quality gate

**Date:** 2026-06-25
**Iteration:** 1 of 1

### Completed

<!-- filled in after step 06.4 implementation -->

### Files touched

<!-- filled in after step 06.4 implementation -->

### Validation evidence (per Acceptance ID)

<!-- filled in after step 06.4 implementation -->

### Routine validations

<!-- filled in after step 06.4 implementation -->
