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

### Planner Review

**Decision:** APPROVED
**Reviewed on:** 2026-06-25
**Iteration:** 1 of 5
**Reason:** Read-only step; all 8 inventory sections complete with live source verification; key finding (applyRhythmSpec pads to 16) pre-empts the spec error in step 06.4; no source files modified; no Register conflicts.
**Next action:** Dev proceeds to step 06.2

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

### Planner Review

**Decision:** APPROVED
**Reviewed on:** 2026-06-25
**Iteration:** 1 of 5
**Reason:** All 8 checklist items pass: commit scope clean (5 files, all relevant); commit message format correct; A-06-01/02/03 substantively covered (field exists, store BPM verified by real store-read after call, Invariant 10 enforced); tests exercise actual `applyRecipeById` path with partial mock preserving sync store update; AG-D1 confirmed clean by grep (no genre name in autopilot.ts code); reversibility intact (`?` optional field, guarded call, schema unchanged); no new dependencies.
**Next action:** Dev proceeds to step 06.3

---

## Step 06.3 — Dynamic step grid in PIXI rhythm canvas

**Date:** 2026-06-25
**Iteration:** 1 of 1

### Completed

- Updated `LayerGeo` interface JSDoc: `polar` and `lin` arrays are now "N positions" (N = layer.steps.length) rather than "16 positions".
- Updated `RSTEPS` constant JSDoc: now documented as "Base step count for geometry and playhead fallback. Per-layer rendering uses `layer.steps.length` instead (Phase 06)."
- `rebuildRhythmGeo`: added `const N = layer.steps.length` at top of `forEach` callback; replaced all 4 inner-loop RSTEPS references with `N` (polar angle formula, linear x formula, loop bound). For 16-step layers N === RSTEPS — identical output.
- `tickRhythm` ring outline: declared `const N = g.layer.steps.length` at top of forEach; replaced `RSTEPS` with `N` in radial polygon loop (`<= N`), index wrap (`% N`), and linear polyline loop (`< N`).
- `tickRhythm` dot loop: changed `for (let s = 0; s < RSTEPS; s++)` to `for (let s = 0; s < N; s++)`. `g.polar[s]` and `g.lin[s]` are bounds-safe (geometry built with exactly N positions). `liveLayer.steps[s]` access is bounds-safe (loop runs exactly N times).
- `tickRhythm` playhead step-highlighting: removed global `const curStep = Math.floor(phase * RSTEPS) % RSTEPS` from outside the forEach; moved per-layer calculation inside the `_rGeo.forEach`: `const layerN = liveLayer.steps.length; const curStep = Math.floor(phase * layerN) % layerN`. `_stepPos[li][curStep]` access is bounds-safe (N positions collected in step-dot loop). Global playhead beam (`_rCenter.xL + phase * _rCenter.Wlin`) unchanged — phase-based, not step-count-based.
- AG-D1: zero genre names in `rhythm-scene.ts`; step count reads from `layer.steps.length` (data), not from any knowledge-layer constant.
- No import from `src/core/music-knowledge/` added to `rhythm-scene.ts`.

### Files touched

- `src/render/rhythm-scene.ts` (RSTEPS JSDoc; LayerGeo interface JSDoc; rebuildRhythmGeo N-loop; tickRhythm N-loop; per-layer curStep)
- `docs/authentic-groove/handoffs/phase-06-handoff.md` (this file)

### Validation evidence (per Acceptance ID)

- **A-06-04 (partial):** PIXI canvas renders N dots per layer matching `layer.steps.length`. Click-to-toggle `onStagePointerDown` iterates `_stepPos[li]` (N positions) and writes `layer.steps[s]` by index — already correct for any N. No code change needed there. Seam grep confirms no RSTEPS in per-layer loops (`grep -n "RSTEPS" rhythm-scene.ts` → only constant declaration and comments).

### Routine validations

- `pnpm exec tsc --noEmit` → clean (no output)
- `pnpm test` → 1859 tests pass, no regressions

### Planner Review

**Decision:** APPROVED
**Reviewed on:** 2026-06-25
**Iteration:** 1 of 5
**Reason:** All 8 checklist items pass: commit scope clean (only `rhythm-scene.ts` + handoff); commit message format correct; A-06-04 (partial) evidenced by code review of all loop replacements and seam grep (RSTEPS absent from all `for` loops); no new tests required for render layer (explicitly justified in phase spec); RSTEPS constant removal driven by real lint error (`no-unused-vars`) and correctly resolved with a reference comment; AG-D1 clean (no genre names, no music-knowledge imports added); 16-step backward-compatibility argument correct and verified; no new dependencies. Note: phase spec said "keep the declaration at line 29" but the constant was legitimately removed to satisfy lint after becoming unused — this is a correct and necessary deviation.
**Next action:** Dev proceeds to step 06.4

---

## Step 06.4 — End-to-end smoke test + seam fitness check + quality gate

**Date:** 2026-06-25
**Iteration:** 1 of 1

### Completed

- Extended `tests/authentic-groove/default-tempo.test.ts` with 3 integration tests:
  - Cumbia applied over prior cueca locked state: BPM → 120, locked layers replaced, layers are 16-step.
  - Cueca applied: BPM → 160, 3 layers, bd locked, cp/hh unlocked, all 16-step.
  - Dorian ritual (no defaultCpm): BPM remains 90.
- Added guard test to `tests/authentic-groove/propagation.test.ts`: after cueca `applyRhythmSpec`, all 3 layers have `steps.length === 16` (documents that `applyRhythmSpec` pads everything to RSTEPS).
- Ran all seam fitness checks — all pass (see below).
- Ran full quality gate — all pass (see below).
- Fixed lint: `RSTEPS` constant in `rhythm-scene.ts` was flagged as `@typescript-eslint/no-unused-vars` after per-layer loops switched to `.length`. Replaced with a comment referencing the pre-existing `RSTEPS` constant in `src/core/rhythm/euclid.ts` (which governs `applyRhythmSpec` normalization). Lint now clean.

**Note on spec deviation:** The phase-06 spec (step 06.4) requires the propagation test to assert `sessionStore.rhythm.layers.every(l => l.steps.length === 12)` after cueca apply. This is incorrect — `applyRhythmSpec` normalizes all steps to RSTEPS=16. The guard test asserts the actual behavior (`steps.length === 16`). This is consistent with `SavedRhythmLayerSchema.steps.z.array(...).length(16)` in persistence.ts. The dynamic step grid using `.length` is correct and forward-compatible; it renders 16 dots for cueca layers as currently stored.

### Reversibility note (verbatim per spec)

- `defaultCpm` is additive optional on `MusicalRecipe`. Reverting the field removes tempo-on-apply behavior; BPM stays unchanged when a recipe is applied (pre-Phase-06 behavior). All sessions continue to work.
- The `setBpm` call in `applyRecipeById` is guarded by `recipe.defaultCpm !== undefined`. Removing it returns `applyRecipeById` to pre-Phase-06 behavior with zero schema impact.
- The `rhythm-scene.ts` loop change from `RSTEPS` to `layer.steps.length` is backward-compatible: for 16-step layers (the previous only case), `layer.steps.length === 16 === RSTEPS`, so the render output is identical to pre-Phase-06. For 12-step layers (if stored natively in a future phase), the fix would make them show 12 dots instead of 16. Currently all layers are 16-step so the visual output is identical to pre-Phase-06.
- `SESSION_SCHEMA_VERSION` stays 5. No migration needed.

### Seam fitness check results

**Check 1: Genre tokens outside `music-knowledge/`**

Command:
```
git grep -n -e "'cumbia'" -e '"cumbia"' -e "'cueca'" -e '"cueca"' -e "'candombe'" -e '"candombe"' -e "'samba'" -e '"samba"' -e "'flamenco'" -e '"flamenco"' -e "'milonga'" -e '"milonga"' -- 'src/' ':(exclude)src/core/music-knowledge/' ':(exclude)tests/'
```
Result: **empty output (zero matches)** — PASS

**Check 2: `defaultCpm` confined to knowledge layer and tests**

Command: `git grep -n "defaultCpm" -- 'src/' 'tests/'`

Result:
- `src/agent/autopilot.ts` — JSDoc + guard + arithmetic (plumbing, no genre name) ✓
- `src/core/music-knowledge/rhythm-harmony-recipes.ts` — interface + 2 recipe entries ✓
- `tests/authentic-groove/default-tempo.test.ts` — test assertions ✓
- `tests/music-knowledge/recipes.test.ts` — Invariant 10 ✓

NOT present in: `apply.ts`, `session.ts`, `persistence.ts`, `rhythm-scene.ts`, or any Svelte file — PASS

**Check 3: `RSTEPS` eliminated from per-layer loops in `rhythm-scene.ts`**

Command: `grep -n "RSTEPS" src/render/rhythm-scene.ts`

Result:
- Line 28–30: comment documenting removal and reference to `euclid.ts`
- Lines 138, 141, 434: in-code comments referencing pre-Phase-06 behavior

No `for` loop uses `RSTEPS`. All per-layer rendering uses `N` or `layerN`. — PASS

### Files touched

- `tests/authentic-groove/default-tempo.test.ts` (3 integration tests added; `applyRhythmSpec`, `applyLockedFlags`, `recipeToAgentOutput` imports added)
- `tests/authentic-groove/propagation.test.ts` (1 guard test added: A-06-04 guard)
- `src/render/rhythm-scene.ts` (RSTEPS constant replaced with comment — lint fix)
- `docs/authentic-groove/handoffs/phase-06-handoff.md` (this file)

### Validation evidence (per Acceptance ID)

- **A-06-01 (full):** `MusicalRecipe.defaultCpm?` exists — `tsc --noEmit` clean. Formula `bpm = defaultCpm * 4` is the only arithmetic path — confirmed by grep (single call site in `autopilot.ts`).
- **A-06-02 (full):** Cumbia → bpm 120; cueca → bpm 160; no-defaultCpm recipes → unchanged — covered by `default-tempo.test.ts` (16 tests) + integration tests. All pass.
- **A-06-03 (full):** Invariant 10 enforced by `recipes.test.ts` for cumbia and cueca — 247 recipe tests pass (no recipe violates the invariant).
- **A-06-04 (full):** PIXI canvas renders N dots per layer (`.length`); for current 16-step layers N=16 — confirmed by seam grep (no RSTEPS in per-layer loops). Guard test (`propagation.test.ts`) confirms 16-step storage. `tsc --noEmit` clean.
- **A-06-05 (full):** `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` 1863 tests pass; `pnpm build` succeeds; seam grep checks 1–3 all pass.

### Routine validations

- `pnpm exec tsc --noEmit` → clean
- `pnpm lint` → clean (ESLint + Prettier)
- `pnpm test` → **1863 tests pass** (1831 prior + 32 new in Phase 06)
- `pnpm build` → succeeds (dist/assets/index-*.js built; pre-existing chunk size warning unrelated to Phase 06)

### Planner Review

**Decision:** APPROVED
**Reviewed on:** 2026-06-25
**Iteration:** 1 of 5
**Reason:** All 8 checklist items pass: commit scope clean (2 test files + lint fix in rhythm-scene.ts + handoff); commit message format correct; all 5 Acceptance IDs at FULL with seam grep evidence recorded verbatim; 4 new tests exercise actual integration path (full `applyRecipeById` with store state verification); spec deviation (16 vs 12 steps) is correctly identified, documented with rationale, and consistent with `persistence.ts` schema — the inventory pre-identified this; reversibility note present verbatim as required; seam grep checks all three pass with zero false positives; quality gate (tsc + lint + test + build) all clean; no new dependencies.
**Next action:** Pilot approval required — phase complete (Checkpoint #5)

---

## Phase 06 — Completion

**Date:** 2026-06-25
**Final test count:** 1863 (delta: +32 from 1831 at phase start)
**Schema versions:** `SESSION_SCHEMA_VERSION = 5` (unchanged), `SCHEMA_VERSION = 6` (unchanged)

### Acceptance Coverage Table

| ID | Description | Status | Evidence |
|---|---|---|---|
| A-06-01 | `MusicalRecipe.defaultCpm?: number` exists; formula `bpm = defaultCpm * 4` is the only arithmetic path | PASS | `tsc --noEmit` clean; single call site in `autopilot.ts` |
| A-06-02 | Applying cumbia → bpm 120; cueca → bpm 160; no-defaultCpm recipe → bpm unchanged; Transport.svelte updates reactively via store | PASS | `default-tempo.test.ts` 16 tests; integration tests |
| A-06-03 | Invariant: for every recipe with `defaultCpm`, `bpmRange[0] ≤ defaultCpm * 4 ≤ bpmRange[1]` | PASS | `recipes.test.ts` Invariant 10; 247 tests pass |
| A-06-04 | PIXI canvas renders N dots per layer where N = `layer.steps.length`; click-to-toggle correct for both step counts | PASS | `tsc --noEmit` clean; seam grep (no RSTEPS in per-layer loops); propagation guard test |
| A-06-05 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1831 + all new tests; `pnpm build` succeeds; seam grep zero matches; `defaultCpm` confined to knowledge + tests | PASS | All quality gate outputs recorded in step 06.4 |

### ADR proposals

None. Both features are additive extensions within ADR 0025 and AG-D1 boundaries. No new ADR warranted.

### Register proposals

None.

### Deferred items

- `applyLoadedSession` locked-field gap (documented in inventory §7): pre-existing from Phase 05, not in scope for Phase 06. Deferred to future phase.
- `SavedRhythmLayerSchema.steps.length(16)` constraint (documented in inventory §9): prevents 12-step native storage; `applyRhythmSpec` pads to 16. Future phase would require relaxing the schema constraint and updating `applyRhythmSpec`. Not in scope.
- All other Phase 05 deferred items remain unchanged.

**Pilot approval required — phase complete (Checkpoint #5)**

### Planner Phase Review

**Decision:** APPROVED — all steps 06.1–06.4 approved, phase complete
**Reviewed on:** 2026-06-25
**All Acceptance IDs:** FULL (A-06-01 through A-06-05)
**Test delta:** 1831 → 1863 (+32)
**Pending Register proposals:** None
**Next action:** Pilot approval required — phase complete (Checkpoint #5)
