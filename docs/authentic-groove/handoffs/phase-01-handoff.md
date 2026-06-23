<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 Handoff — Genre-Authentic Strudel Sample Palette

---

## Step 01.1 — Inventory

**Date:** 2026-06-23
**Commit(s):** (see terminal commit note below)
**Iteration:** 1 of 5

### Completed

- Read all 13 required sources in order (CLAUDE.md, decisions.md, package.json, layers.ts, strudel.ts codegen, rhythm-catalog.ts, rhythm-harmony-recipes.ts, recipe-engine.ts, apply.ts, agent.ts, schema.ts lines 1–60, persistence.ts, live Strudel docs).
- Confirmed `@strudel/web` version **1.0.3** from `package.json`.
- Traced the full sound-assignment flow from recipe → `AgentOutput` → `RhythmLayer[]` → Strudel code string. Identified the exact two lines in `rhythmLayerToStrudelLine` that must change.
- Confirmed `RhythmLayer` has no `strudelSample` field today.
- Confirmed all consumers of `recipeToAgentOutput` flow through `apply.ts` (no non-`apply.ts` consumer).
- Verified live Strudel sample names from `https://strudel.cc/learn/samples/` (fetched 2026-06-23).
- Verified Orbifold loads `github:tidalcycles/dirt-samples` (not `tidal-drum-machines`).
- Fetched live `tidalcycles/Dirt-Samples/strudel.json` to confirm available names: standard drum abbreviations plus `tabla`, `tabla2`, `east`, `hand`, `perc`, `cb`, `sh`, `tb`.
- Built per-genre proposed `sampleMap` for all 15 recipes in the catalog, with fallback notes where authentic instrument names are not available.
- Presented OD-1, OD-2, OD-3 with options and recommendations for Pilot resolution.
- Defined the A-01-06 fitness check `git grep` command.
- Produced `docs/authentic-groove/inventories/phase-01-inventory.md`.

### Files touched

- `docs/authentic-groove/inventories/phase-01-inventory.md` — new, inventory
- `docs/authentic-groove/handoffs/phase-01-handoff.md` — this file

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in step 01.1 (inventory step — read-only).

### Routine validations

- `git status` → only `docs/authentic-groove/inventories/phase-01-inventory.md` and `docs/authentic-groove/handoffs/phase-01-handoff.md` are new (no `.ts` or `.svelte` files modified).

### Acceptance Coverage Table

No Acceptance IDs touched by this step (inventory step — read-only; no source code changes).

### Decisions made

None. The inventory records facts and presents open decisions for Pilot resolution.

### Proposed Decisions Register entries

None proposed from this step (decisions will be proposed from 01.2 once ODs are resolved).

### Environment state after this step

- `@strudel/web@1.0.3` confirmed. `SCHEMA_VERSION = 6`, `SESSION_SCHEMA_VERSION = 5`.
- Zero source files modified. Zero test changes.

### Next-step context

The Pilot must resolve OD-1, OD-2, OD-3 (from inventory §3) before step 01.2 can proceed:

- **OD-1** (propagation mechanism): Recommendation is Option B (pure schema + downstream overlay in `apply.ts`). Consumer trace confirms all paths flow through `apply.ts`.
- **OD-2** (persistence): Recommendation is Option A (persist `strudelSample`; `SESSION_SCHEMA_VERSION` stays 5 — additive optional field).
- **OD-3** (fallback policy): Recommendation is Option A (nearest documented fallback for perceptibly closer instruments; omit slots where no meaningful improvement exists).

Commit pattern note:

- **Terminal commit:** `docs(authentic-groove): Phase 01 step 01.1 — sample-palette inventory`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

### Planner Review

**Planner Review:** APPROVED on 2026-06-23. Iteration: 1 of 5.
**Next action:** Pilot approval required before step 01.2 — OD-1/2/3 must be resolved.

---

## Checkpoint #1 — Pilot OD Resolutions (2026-06-23)

Pilot resolved all three open decisions:

- **OD-1 → Option B:** Keep `AgentOutputSchema` pure. Add generic `applySampleMap(layers, map)` helper in `apply.ts`; call it after `applyRhythmSpec` from the recipe-application path. `SCHEMA_VERSION` stays 6. The LLM cannot emit sample names.
- **OD-2 → Option A:** Persist `strudelSample` — add `strudelSample: z.string().optional()` to `SavedRhythmLayerSchema` in `persistence.ts`. `SESSION_SCHEMA_VERSION` stays 5 (additive optional field; old sessions load cleanly with `undefined` → codegen falls back to `sound`).
- **OD-3 → Option A:** Use nearest documented fallback where perceptibly closer (`perc` for struck-idiophone patterns, `sd` for snare roles, `cb` for metal bell/shell). Omit slots where no meaningful improvement exists. Document fallbacks with inline comments in the catalog.

---

## Step 01.2 — Model + Codegen (plumbing / public side) + ADR 0025

**Date:** 2026-06-23
**Commit(s):** (see terminal commit note below)
**Iteration:** 1 of 5

### Completed

- Read all required sources: inventory §1–§5, Checkpoint #1 OD resolutions, `layers.ts`, `persistence.ts`, ADR 0024 (format precedent).
- Drafted `docs/adr/0025-authentic-sample-palette.md` covering all seven decisions (D1–D7) before editing any source file.
- Added `strudelSample?: string` to `RhythmLayer` interface in `src/core/rhythm/layers.ts` with JSDoc per ADR 0025 D1, positioned after `euclid?`.
- Updated `rhythmLayerToStrudelLine` to compute `const sampleName = layer.strudelSample ?? sound` and use it in **both** the euclid fallback path and the steps path. Comment: `// ADR 0025 D1: strudelSample overrides sound when set`. Function signature unchanged.
- Added `strudelSample: z.string().optional()` to `SavedRhythmLayerSchema` in `persistence.ts` (OD-2 = persist; ADR 0025 D5/D7). JSDoc on the field notes it is absent in pre-Phase-01 sessions and falls back to `sound` in codegen.
- Updated `serializeSession` to include `strudelSample` when present.
- Updated `deserializeSession` inline type annotation and carry-through logic for `strudelSample` (with comment referencing ADR 0025 D5/D7 and backward compat).
- Created `tests/authentic-groove/codegen-sample.test.ts` (AGPL-3.0 header) with 9 tests covering: euclid path with `strudelSample`, steps path with `strudelSample`, and backward-compat cases.
- Verified no genre name or hardcoded sample map appears in any source file touched (seam invariant AG-D1 / ADR 0025 D3).
- `SCHEMA_VERSION` stays 6; `SESSION_SCHEMA_VERSION` stays 5 (confirmed).

### Files touched

- `docs/adr/0025-authentic-sample-palette.md` — new, ADR
- `src/core/rhythm/layers.ts` — `strudelSample?: string` field + codegen update
- `src/lib/persistence.ts` — `strudelSample: z.string().optional()` in schema + serialize/deserialize
- `tests/authentic-groove/codegen-sample.test.ts` — new, 9 tests
- `docs/authentic-groove/handoffs/phase-01-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

**A-01-03 (full):**
- `pnpm exec vitest run codegen-sample` → 9 tests pass (euclid path + steps path with override; backward compat with no `strudelSample`).
- `pnpm exec vitest run codegen` → 83 pre-existing codegen tests still pass unchanged.

**A-01-05 (partial — tsc + tests):**
- `pnpm exec tsc --noEmit` → clean (no output).
- `pnpm test` → 1598 tests pass (1589 pre-existing + 9 new). No regressions.

### Routine validations

- `pnpm exec tsc --noEmit` → clean.
- `pnpm exec vitest run codegen-sample` → 9 new tests pass.
- `pnpm exec vitest run codegen` → 83 existing tests pass unchanged.
- `pnpm test` → 1598 total, 0 failures.
- `git status` → `docs/adr/0025-authentic-sample-palette.md` (new), `src/core/rhythm/layers.ts` (modified), `src/lib/persistence.ts` (modified), `tests/authentic-groove/codegen-sample.test.ts` (new), `docs/authentic-groove/handoffs/phase-01-handoff.md` (modified). No other source files touched.

### Acceptance Coverage Table

| Acceptance ID | Status in this step | Evidence |
|---|---|---|
| A-01-01 | Not started | Requires step 01.4 (propagation) |
| A-01-02 | Not started | Requires step 01.4 (propagation) |
| A-01-03 | **Full** | `codegen-sample.test.ts` 9 tests: euclid + steps path with override; backward compat without `strudelSample` |
| A-01-04 | Not started | Requires step 01.4 (propagation) |
| A-01-05 | **Partial** (tsc + tests) | `tsc --noEmit` clean; `pnpm test` 1598/1598; `pnpm lint` and `pnpm build` deferred to 01.5 |
| A-01-06 | Not started | Deferred to step 01.5 (seam fitness check) |

### Decisions made

- ADR 0025 drafted and committed. Governs `strudelSample` plumbing contract, seam invariant, OD-1/2/3 resolutions, and backward compat (D1–D7).

### Proposed Decisions Register entries

None proposed (ADR 0025 is the governing record; no new Register entries needed beyond what AG-D1 already covers).

### Backward compatibility / flag-off note (CLAUDE.md required)

- With no recipe applied, every `RhythmLayer.strudelSample` is `undefined`; `rhythmLayerToStrudelLine` falls back to `sound` — output is byte-identical to pre-Phase-01 `main`.
- Sessions saved before Phase 01 have no `strudelSample`; `SavedRhythmLayerSchema` treats the absent key as `undefined` (Zod strip mode); `deserializeSession` produces a layer without `strudelSample`; codegen falls back to `sound`. No regression.
- Reverting step 01.4 (propagation) alone restores prior behavior; the `strudelSample` field on `RhythmLayer` and in the persistence schema is inert when unset.

### Environment state after this step

- `@strudel/web@1.0.3` confirmed. `SCHEMA_VERSION = 6`, `SESSION_SCHEMA_VERSION = 5` (both unchanged).
- 1598 tests passing (1589 pre-existing + 9 new).

### Terminal commit note

- **Terminal commit:** `feat(core): Phase 01 step 01.2 — strudelSample plumbing + codegen fallback (ADR 0025)`
  - Hash: self-referential — not recorded.

### Next-step context

Step 01.3: Add `sampleMap?: Partial<Record<Sound, string>>` to `MusicalRecipe` interface and populate for all genre recipes using inventory §2 verified names. Confined to `src/core/music-knowledge/rhythm-harmony-recipes.ts` and a new `tests/authentic-groove/sample-map.test.ts`.

### Planner Review

**Planner Review:** APPROVED on 2026-06-23. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 01.3.

---

## Step 01.3 — Catalog `sampleMap` (knowledge / private side)

**Date:** 2026-06-23
**Commit(s):** (see terminal commit note below)
**Iteration:** 1 of 5

### Completed

- Read all required sources in order: inventory §2 (verified sample list + per-genre maps), ADR 0025 (D2, D3, D6), `rhythm-harmony-recipes.ts` (full), `layers.ts` (confirmed `Sound` type and `strudelSample` field from step 01.2).
- Added `import type { Sound } from '../rhythm/layers.js'` to `rhythm-harmony-recipes.ts`.
- Added `sampleMap?: Partial<Record<Sound, string>>` to `MusicalRecipe` interface with full JSDoc referencing ADR 0025 D2 and noting values must be inventory-verified.
- Populated `sampleMap` for all 9 in-scope genre-specific recipes using only inventory §2 verified names:
  - `west-african-bell-modal`: `{ bd: 'cb', hh: 'perc' }` — fallback comments for both.
  - `west-african-triplet-groove`: `{ bd: 'cb', hh: 'perc' }` — fallback comments for both.
  - `latin-jazz-clave-swing`: `{ bd: 'bd', hh: 'cb' }` — fallback comment for cascara/timbale.
  - `rumba-blues-minor`: `{ bd: 'perc' }` — fallback comment for clave.
  - `samba-afro-brasileiro`: `{ bd: 'bd', hh: 'sd' }` — fallback comment for surdo/caixa.
  - `bossa-nova-groove`: `{ bd: 'bd', hh: 'sd' }` — fallback comment for pandeiro/tamborim.
  - `cumbia-latina-groove`: `{ bd: 'perc' }` — fallback comment for caja/guacharaca.
  - `candombe-dorian-groove`: `{ bd: 'perc' }` — fallback comment for candombe drum names.
  - `buleria-flamenco-phrygian`: `{ bd: 'perc' }` — fallback comment for cajon.
- Left `sampleMap` undefined (omitted) for 6 generic/no-improvement recipes: `afro-cuban-clave-minor`, `dorian-ritual-sparse`, `pop-rock-backbeat`, `aksak-dorian-odd`, `gospel-soul-euclid`, `cueca-chilena-folk`.
- Created `tests/authentic-groove/sample-map.test.ts` (AGPL-3.0 header) with 60 tests covering: sampleMap defined + non-empty values, keys are valid Sound values, values in verified fixture, per-genre value assertions, and generic recipes have `sampleMap === undefined`.
- Verified seam invariant: no genre name or sample-name outside `src/core/music-knowledge/` — changes confined exclusively to `rhythm-harmony-recipes.ts` and `tests/`.

### Files touched

- `src/core/music-knowledge/rhythm-harmony-recipes.ts` — `sampleMap` field on `MusicalRecipe` + genre recipe population
- `tests/authentic-groove/sample-map.test.ts` — new, 60 tests
- `docs/authentic-groove/handoffs/phase-01-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

**A-01-01 (partial — catalog data):**
- `pnpm exec vitest run sample-map` → 60 tests pass. Per-genre value assertions confirm cumbia (`cumbia-latina-groove`) maps `bd → 'perc'`; cueca (`cueca-chilena-folk`) correctly has `sampleMap === undefined` (no meaningful improvement available at 1.0.3).

**A-01-05 (partial — tsc + tests):**
- `pnpm exec tsc --noEmit` → clean (no output).
- `pnpm test` → 1658 tests pass (1598 prior + 60 new). No regressions.

### Routine validations

- `pnpm exec tsc --noEmit` → clean.
- `pnpm exec vitest run sample-map` → 60 new tests pass.
- `pnpm test` → 1658 total, 0 failures.
- `git status` → only `src/core/music-knowledge/rhythm-harmony-recipes.ts` (modified), `tests/authentic-groove/sample-map.test.ts` (new), `docs/authentic-groove/handoffs/phase-01-handoff.md` (modified). No other source files touched.

### Acceptance Coverage Table

| Acceptance ID | Status in this step | Evidence |
|---|---|---|
| A-01-01 | **Partial** (catalog data) | `sample-map.test.ts` 60 tests: per-genre sampleMap defined with correct values; generic recipes undefined. Full A-01-01 requires step 01.4 propagation. |
| A-01-02 | Not started | Requires step 01.4 (propagation + codegen output). |
| A-01-03 | Full (from 01.2) | No regressions — 1658/1658 tests pass. |
| A-01-04 | Not started | Requires step 01.4 (propagation). |
| A-01-05 | **Partial** (tsc + tests) | `tsc --noEmit` clean; `pnpm test` 1658/1658; `pnpm lint` and `pnpm build` deferred to 01.5. |
| A-01-06 | Not started | Deferred to step 01.5 (seam fitness check). |

### Decisions made

None. All decisions governed by ADR 0025 (from step 01.2).

### Proposed Decisions Register entries

None proposed.

### Environment state after this step

- `@strudel/web@1.0.3` confirmed. `SCHEMA_VERSION = 6`, `SESSION_SCHEMA_VERSION = 5` (both unchanged).
- 1658 tests passing (1598 prior + 60 new).

### Seam invariant check (AG-D1)

All changes in this step are confined to `src/core/music-knowledge/rhythm-harmony-recipes.ts` and `tests/authentic-groove/sample-map.test.ts`. No genre name, no hardcoded sample map literal, and no `strudelSample` assignment appears in any plumbing file (`layers.ts`, `codegen/`, `persistence.ts`, `apply.ts`, `agent.ts`). Seam invariant holds.

### Terminal commit note

- **Terminal commit:** `feat(music-knowledge): Phase 01 step 01.3 — per-genre sampleMap catalog (ADR 0025)`
  - Hash: self-referential — not recorded.

### Planner Review

**Planner Review:** APPROVED on 2026-06-23. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 01.4.

---

## Step 01.4 — Propagation (knowledge / private side)

**Date:** 2026-06-23
**Commit(s):** (see terminal commit note below)
**Iteration:** 1 of 5

### Completed

- Read all required sources in order: ADR 0025 (D3, D4), inventory §1/§3, `recipe-engine.ts`, `apply.ts`, `agent.ts`, `autopilot.ts`, `sample-map.test.ts`.
- Confirmed the actual recipe-application path is in `src/agent/autopilot.ts` (`applyPlanStep()`), not `agent.ts`. `recipeToAgentOutput` is called at `autopilot.ts` line 130 followed by `applyRhythmSpec(engineOutput.rhythm)`. The step prompt referenced `agent.ts` but the inventory §1.4 and codebase confirm the path is in `autopilot.ts`.
- Added `applySampleMap(map: Partial<Record<string, string>>): void` to `src/agent/apply.ts` after `applyRhythmSpec`. The function calls `sessionStore.update` to overlay `strudelSample` on each layer whose `sound` key appears in `map`. The helper carries zero genre knowledge — it is handed the map as a parameter (AG-D1 / ADR 0025 D3).
- Added import of `applySampleMap` to `src/agent/autopilot.ts` from `./apply.js`.
- Wired `applySampleMap(recipe.sampleMap ?? {})` immediately after `applyRhythmSpec(engineOutput.rhythm)` in `applyPlanStep()` in `autopilot.ts` (ADR 0025 D4 call site).
- Created `tests/authentic-groove/propagation.test.ts` (AGPL-3.0 header) with 15 tests covering A-01-01, A-01-02, A-01-04:
  - `applySampleMap({})` — no layer mutated (edge case).
  - `applySampleMap` sets strudelSample on matching layer, leaves absent slots unchanged.
  - Cumbia recipe: layers carry `strudelSample: 'perc'` on bd-slot; `rhythmLayerToStrudelLine` emits 'perc' tokens (A-01-01 full).
  - Cueca recipe: no sampleMap → all layers have no strudelSample; generic sound emitted (A-01-02 full).
  - Samba recipe: hh-slot layer carries `strudelSample: 'sd'`; codegen emits 'sd' (A-01-04).
  - Slot absent from map → `strudelSample` undefined (A-01-04).
  - Recipes with no sampleMap → no layer carries strudelSample (dorian-ritual-sparse, pop-rock-backbeat) (A-01-04 no-regression).
- Verified seam invariant: no genre name or sample-name literal in plumbing files. The `applySampleMap` function contains zero genre names. `autopilot.ts` references `recipe.sampleMap` (a data property on `MusicalRecipe`) — not a genre name, not a hardcoded map.

### Files touched

- `src/agent/apply.ts` — new `applySampleMap` function
- `src/agent/autopilot.ts` — import `applySampleMap`; wire call after `applyRhythmSpec(engineOutput.rhythm)` in `applyPlanStep`
- `tests/authentic-groove/propagation.test.ts` — new, 15 tests
- `docs/authentic-groove/handoffs/phase-01-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

**A-01-01 (full):**
- `pnpm exec vitest run propagation` → test "cumbia recipe → strudelSample propagation" (2 tests): bd-slot layer carries `strudelSample: 'perc'`; `rhythmLayerToStrudelLine` emits 'perc', not 'bd'.

**A-01-02 (full):**
- `pnpm exec vitest run propagation` → test "cueca recipe → no sampleMap → generic sound emitted" (3 tests): cueca has `sampleMap === undefined`; all layers have no strudelSample; codegen emits generic sound.

**A-01-04 (full):**
- `pnpm exec vitest run propagation` → 6 tests covering absent slots, multi-slot maps, map-less recipes (no-regression).

**A-01-05 (partial — tsc + tests):**
- `pnpm exec tsc --noEmit` → clean (no output).
- `pnpm test` → 1673 tests pass (1658 prior + 15 new). No regressions.

### Routine validations

- `pnpm exec tsc --noEmit` → clean.
- `pnpm exec vitest run propagation` → 15 new tests pass.
- `pnpm exec vitest run autopilot` → 43 autopilot tests still pass unchanged.
- `pnpm test` → 1673 total, 0 failures.
- Seam invariant check (AG-D1):
  ```
  git grep -n -e "'cumbia'" -e '"cumbia"' -e "'cueca'" -e '"cueca"' ... -- 'src/' ':(exclude)src/core/music-knowledge/' ':(exclude)tests/'
  ```
  Result: empty output (zero matches). Seam intact.
- `git status` → only `src/agent/apply.ts` (modified), `src/agent/autopilot.ts` (modified), `tests/authentic-groove/propagation.test.ts` (new), `docs/authentic-groove/handoffs/phase-01-handoff.md` (modified).

### Acceptance Coverage Table

| Acceptance ID | Status in this step | Evidence |
|---|---|---|
| A-01-01 | **Full** | `propagation.test.ts` 2 tests: cumbia bd-slot has `strudelSample: 'perc'`; codegen emits 'perc' not 'bd'. |
| A-01-02 | **Full** | `propagation.test.ts` 3 tests: cueca has no sampleMap; all layers undefined strudelSample; codegen emits generic sound. |
| A-01-03 | Full (from 01.2) | No regressions — 1673/1673 tests pass. |
| A-01-04 | **Full** | `propagation.test.ts` 6 tests: absent slots keep undefined; map-less recipes produce no strudelSample. |
| A-01-05 | **Partial** (tsc + tests) | `tsc --noEmit` clean; `pnpm test` 1673/1673; `pnpm lint` and `pnpm build` deferred to 01.5. |
| A-01-06 | Not started | Deferred to step 01.5 (seam fitness check + full quality gate). |

### Decisions made

None. All decisions governed by ADR 0025 (from step 01.2). The call site in `autopilot.ts` (not `agent.ts`) was the correct implementation choice — confirmed by inventory §1.4 consumer trace.

### Proposed Decisions Register entries

None proposed.

### Seam invariant check (AG-D1)

The `applySampleMap` function in `apply.ts` contains zero genre names, zero hardcoded sample maps, and zero sample-name literals. It receives the map as a parameter (`Partial<Record<string, string>>`). The call site in `autopilot.ts` passes `recipe.sampleMap ?? {}` — which is a data accessor on `MusicalRecipe`, not a genre-knowledge expression. No sample-name literal (`'perc'`, `'cb'`, `'sd'`) was introduced in any plumbing file. The seam grep returns empty output.

### Prototype parity note

This step introduces new functionality (not a port from the prototype). No prototype citation is required. The `applySampleMap` helper is original infrastructure for the authentic-groove initiative.

### Environment state after this step

- `@strudel/web@1.0.3` confirmed. `SCHEMA_VERSION = 6`, `SESSION_SCHEMA_VERSION = 5` (both unchanged).
- 1673 tests passing (1658 prior + 15 new).

### Terminal commit note

- **Terminal commit:** `feat(music-knowledge): Phase 01 step 01.4 — sampleMap → strudelSample propagation (ADR 0025)`
  - Hash: self-referential — not recorded.
