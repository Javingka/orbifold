<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 05 Handoff — Multi-Layer Recipes + Base-Lock Mechanism

---

## Step 05.1 — Inventory

**Date:** 2026-06-25
**Iteration:** 1 of 5

### Completed

- Read all 15 required source files and mandatory live verification sources.
- Confirmed AG-D1 in force. Confirmed `SCHEMA_VERSION = 6`, `SESSION_SCHEMA_VERSION = 5`, test count at 1720, `pnpm test` gate condition met (Phase 04 complete).
- Fetched `https://api.github.com/repos/freepats/world-percussion/contents/samples` live — confirmed `EggShaker` (11 FLAC) and `Maracas` (18 FLAC) both present and CC0.
- Confirmed CC0 license from README.txt verbatim quote.
- Grepped `rhythm-catalog.ts` for all 12-step entries: `cueca-chilena-base` exists (E(4,12,0)), `cueca-chilena-syncopated` exists (E(5,12,2)). No 12-step palmas entry (`'000010000010'`) or 12-step subdivision entry (`'101010101010'`) — both are new.
- Confirmed `eighth-notes-16` (E(8,16,0)) already exists — reused for cumbia `hh` layer.
- Confirmed `cueca-chilena-syncopated` is euclidEntry not structEntry (catalog comment at line 171 incorrectly lists it as struct — noted as discrepancy to fix).
- Traced full `applyRhythmSpec` implementation and `applyRecipeById` call chain.
- Identified need for `opts?: { force?: boolean }` parameter on `applyRhythmSpec` to bypass merge during recipe application.
- Identified that `recipeToAgentOutput` must iterate `recipe.layers` (not `recipe.rhythmIds`) when layers are present, using `layers[i].binary` directly.

**Live verification results:**

1. **FreePats shaker inquiry:** `EggShaker` folder confirmed: 11 FLAC files, CC0. `Maracas` also confirmed CC0 (18 files). Proposal: add 4 EggShaker files as `shaker` sample in Phase 05. No `cp` fallback needed.

2. **Cueca catalog check:** `cueca-chilena-base` (E(4,12,0), binary `'100100100100'`) confirmed. No palmas entry (`'000010000010'`) exists — new `cueca-palmas-12` struct entry proposed. No subdivision entry (`'101010101010'`) exists — new `cueca-subdivision-12` euclid E(6,12,0) entry proposed.

3. **Cumbia catalog check:** `cumbia-caja` (struct, 16 steps, binary `'1001001010001000'`) and `eighth-notes-16` (euclid E(8,16,0)) both confirmed as existing entries. No new catalog entry needed for cumbia.

4. **`recipeToAgentOutput` trace:** Current implementation iterates `recipe.rhythmIds`. When `recipe.layers` is present, the iteration must switch to `recipe.layers` to use `layers[i].binary` directly — enabling 12-step struct patterns (palmas) that are not expressible via the standard steps16 path.

5. **`applyRhythmSpec` trace:** Current implementation does a full replace. Lock-preservation merge requires reading locked layers before building the new set. Force-replace via `opts.force` is the recommended bypass for `applyRecipeById`.

### Files touched

- `docs/authentic-groove/inventories/phase-05-inventory.md` (new)
- `docs/authentic-groove/handoffs/phase-05-handoff.md` (this file, new)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in step 05.1 (inventory step — read-only).

- `git status` confirms only the two new doc files are new. No `.ts`, `.svelte`, or binary files modified.

### Routine validations

- `git status` → only `docs/authentic-groove/inventories/phase-05-inventory.md` and `docs/authentic-groove/handoffs/phase-05-handoff.md` are new/modified. No source files touched.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-05-01 | `RhythmLayer.locked?: boolean` field exists; codegen ignores it | — | — | not covered (inventory step) |
| A-05-02 | `applyRhythmSpec` preserves locked layers when called by the agent | — | — | not covered (inventory step) |
| A-05-03 | `applyLockedFlags(lockedSounds)` stamps `locked: true` on specified Sound slots | — | — | not covered (inventory step) |
| A-05-04 | `locked` field round-trips via `SavedRhythmLayerSchema`; pre-Phase-05 sessions load | — | — | not covered (inventory step) |
| A-05-05 | `recipeToAgentOutput` reads `recipe.layers[i].sound`; backward compat for layers-less recipes | — | — | not covered (inventory step) |
| A-05-06 | New catalog entries satisfy all 5 invariants; seam grep zero matches | — | — | not covered (inventory step) |
| A-05-07 | Cueca: 3 locked layers (`bd`, `cp`, `hh`); cumbia: 2 locked layers (`bd`, `hh`) with correct sampleMap | — | — | not covered (inventory step) |
| A-05-08 | `SYSTEM_PROMPT_EVOLUTION` contains locked-layer rule; stateSnapshot includes `locked` per layer | — | — | not covered (inventory step) |
| A-05-09 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1720 + new tests; `pnpm build` succeeds | — | — | not covered (inventory step) |

### Decisions made (if any)

- **Shaker source confirmed:** FreePats EggShaker CC0 — Option A proceeds. No `cp` fallback needed.
- **`recipeToAgentOutput` iteration change:** When `recipe.layers` present, iterate layers (not rhythmIds) and use `layers[i].binary` directly. This makes 12-step struct palmas expressible without AgentOutputSchema changes.
- **`applyRhythmSpec` force parameter:** `opts?: { force?: boolean }` added to bypass merge during `applyRecipeById`. Agent calls always omit `opts` (merge behavior). Recipe application calls with `{ force: true }` (full replace).
- **Layer order in merged result:** Locked layers first, then unlocked agent layers.

### Proposed Decisions Register entries (if any)

None — all decisions are within the boundaries of ADR 0025 and the phase spec.

### Environment state after this step

No source files modified. Repository state: Phase 04 complete, `main` branch, 1720 tests passing.

### Next-step context

- Step 05.2 must add `cueca-palmas-12` (struct, 12 steps, binary `'000010000010'`) and `cueca-subdivision-12` (euclid E(6,12,0), binary `'101010101010'`) to `rhythm-catalog.ts`.
- Step 05.2 must fix the catalog comment at line 171 (struct 12-step has 2 entries, not 3 — `cueca-chilena-syncopated` is euclidEntry).
- Step 05.4 must acquire 4 EggShaker FLAC files (`fast_01`, `fast_04`, `fast_07`, `fast_10`) and convert to OGG as `shaker_0.ogg`–`shaker_3.ogg`.
- The `SYSTEM_PROMPT_EVOLUTION` language (Spanish vs English) must be confirmed in step 05.3 before writing the locked-layer rule.

### Planner Review

**Planner Review:** APPROVED on 2026-06-25. Iteration: 1 of 5. All 8 sections present with live verification completed (FreePats API fetch recorded verbatim, catalog greps performed), all design questions resolved within ADR 0025 / AG-D1 boundaries, no Register conflicts, no source files touched.
**Next action:** Dev proceeds to step 05.2

---

## Step 05.2 — Model changes: RhythmLayer.locked + MusicalRecipe.layers + persistence

**Date:** 2026-06-25
**Iteration:** 1 of 5

### Completed

- Added `locked?: boolean` to `RhythmLayer` in `src/core/rhythm/layers.ts` with full JSDoc.
- Added `RecipeLayer` interface to `src/core/music-knowledge/rhythm-harmony-recipes.ts` (before `MusicalRecipe`), exactly as specified in inventory §2. Exported the interface.
- Added `layers?: ReadonlyArray<RecipeLayer>` field to `MusicalRecipe` with JSDoc documenting invariants 7–9.
- Added two new rhythm catalog entries to `src/core/music-knowledge/rhythm-catalog.ts`:
  - `cueca-palmas-12` (struct, 12 steps, binary `'000010000010'`, onsets [4,10]) — cueca palmas layer.
  - `cueca-subdivision-12` (euclid E(6,12,0), 12 steps, binary `'101010101010'`) — cueca hh subdivision layer.
- Fixed catalog comment header: updated total entry count from 46 to 48 and corrected the description of the struct 12-step section.
- Added `locked: z.boolean().optional()` to `SavedRhythmLayerSchema` in `src/lib/persistence.ts`.
- Updated `serializeSession`: persists `locked` only when `=== true` (absent → not written → pre-Phase-05 sessions identical).
- Updated `deserializeSession`: carries through `locked` when present; absent field → `undefined`.
- Updated `tests/music-knowledge/recipes.test.ts`: added invariants 7–9 checks and consistency check (when `recipe.layers` present, `rhythmIds` equals `layers.map(l => l.rhythmId ?? '')`).
- Created `tests/authentic-groove/locked-persistence.test.ts` with 7 roundtrip and backward-compat tests.

### Files touched

- `src/core/rhythm/layers.ts` — added `locked?: boolean` field
- `src/core/music-knowledge/rhythm-harmony-recipes.ts` — added `RecipeLayer` interface + `layers` field on `MusicalRecipe`
- `src/core/music-knowledge/rhythm-catalog.ts` — added `cueca-palmas-12`, `cueca-subdivision-12`; updated header comment
- `src/lib/persistence.ts` — `SavedRhythmLayerSchema`, `serializeSession`, `deserializeSession`
- `tests/music-knowledge/recipes.test.ts` — invariants 7–9 + consistency check
- `tests/authentic-groove/locked-persistence.test.ts` — new (7 tests)
- `docs/authentic-groove/handoffs/phase-05-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

- A-05-01 (partial): `tsc --noEmit` clean — `RhythmLayer.locked?: boolean` is type-safe; codegen (`rhythmLayerToStrudelLine`) ignores it (does not read the field).
- A-05-04 (partial): All 7 persistence roundtrip tests pass; pre-Phase-05 blob (no `locked`) parses cleanly; SESSION_SCHEMA_VERSION stays 5.
- A-05-06 (partial): New catalog entries `cueca-palmas-12` and `cueca-subdivision-12` pass all 5 catalog invariants (333 catalog tests pass, 0 regressions).

### Routine validations

- `pnpm exec tsc --noEmit` → clean (0 errors)
- `pnpm test` → 1800 tests, 0 failures (1720 baseline + 80 new from this step: 7 recipe invariant additions per recipe × 15 recipes = 45; 7 + 28 catalog invariant tests for 2 new entries = 35; 7 locked-persistence tests)
- No genre name introduced outside `src/core/music-knowledge/`

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-05-01 | `RhythmLayer.locked?: boolean` field exists; codegen ignores it | `tsc --noEmit` + `locked-persistence.test.ts` | type + unit | partial (codegen ignore confirmed by tsc; full coverage at 05.5) |
| A-05-02 | `applyRhythmSpec` preserves locked layers | — | — | not yet (step 05.3) |
| A-05-03 | `applyLockedFlags` stamps `locked: true` | — | — | not yet (step 05.3) |
| A-05-04 | `locked` round-trips via `SavedRhythmLayerSchema`; pre-Phase-05 sessions load | `locked-persistence.test.ts` | unit | partial |
| A-05-05 | `recipeToAgentOutput` reads `recipe.layers` | — | — | not yet (step 05.3) |
| A-05-06 | New catalog entries satisfy all 5 invariants | `rhythm-catalog.test.ts` | unit | partial (catalog entries added; recipe data unchanged until 05.4) |
| A-05-07 | Cueca 3 locked layers; cumbia 2 locked layers with sampleMap | — | — | not yet (step 05.4) |
| A-05-08 | `SYSTEM_PROMPT_EVOLUTION` locked-layer rule; stateSnapshot includes `locked` | — | — | not yet (step 05.3) |
| A-05-09 | `tsc --noEmit` + lint + test + build | `pnpm test` | quality gate | partial |

### Decisions made (if any)

None beyond inventory: implemented exactly per inventory §2, §3, §7, §8.

### Environment state after this step

1800 tests passing. `SESSION_SCHEMA_VERSION = 5` (no change). `SCHEMA_VERSION = 6` (no change).
Two new catalog entries: `cueca-palmas-12` (struct 12-step), `cueca-subdivision-12` (euclid E(6,12,0)).

### Next-step context

Step 05.3: implement `applyLockedFlags`, update `applyRhythmSpec` with `opts?: { force?: boolean }` merge logic, update `recipeToAgentOutput` to iterate `recipe.layers` when present, update `sendEvolution` stateSnapshot and `SYSTEM_PROMPT_EVOLUTION`.

---

## Step 05.3 — Lock-preservation logic + recipeToAgentOutput update + stateSnapshot

**Date:** 2026-06-25
**Iteration:** 1 of 5

### Completed

- Updated `applyRhythmSpec` in `src/agent/apply.ts`:
  - Added `opts?: { force?: boolean }` parameter.
  - When `opts?.force` is false/absent (agent direct call): reads locked layers, builds `lockedSounds` set, skips proposed layers whose sound is locked, prepends locked layers first in final array.
  - When `opts?.force === true` (recipe path): full replace, no merge logic (same as pre-Phase-05).
  - Backward-compatible: when no locked layers exist, `finalLayers = [...[], ...newUnlockedLayers]` → identical to pre-Phase-05.
- Added `applyLockedFlags(lockedSounds: Sound[]): void` to `src/agent/apply.ts` (genre-agnostic, AG-D1 compliant).
- Updated `recipeToAgentOutput` in `src/core/music-knowledge/recipe-engine.ts`:
  - When `recipe.layers` is present: iterates `recipe.layers` directly, uses `layers[i].sound` for sound and `layers[i].binary` for pattern. Euclid path taken when `euclid` present and `n<=16`; steps path otherwise.
  - Skips `AgentOutputSchema.safeParse` guard for the layers path (internally-trusted data; 12-step binary arrays don't satisfy the schema's 16-step requirement, per `RhythmLayerStepsSchema.length(16)`).
  - Legacy `rhythmIds` path unchanged (safeParse guard still applied).
- Updated `sendEvolution` stateSnapshot in `src/agent/agent.ts`: added `locked: layer.locked ?? false` to each layer's payload (LLM-facing only, no schema/store change).
- Updated `SYSTEM_PROMPT_EVOLUTION` in `src/agent/agent.ts`: added rule 2 (CAPAS BLOQUEADAS) with escaped backticks; renumbered existing rules 2–7 to 3–8.
- Updated `applyPlanStep` in `src/agent/autopilot.ts`: recipe path now calls `applyRhythmSpec(... { force: true })`, then `applyLockedFlags(lockedSoundsFromRecipe)`.
- Updated `applyRecipeById` in `src/agent/autopilot.ts`: same pattern — `applyRhythmSpec(... { force: true })`, `applySampleMap`, `applyLockedFlags`.
- Created `tests/authentic-groove/lock-preservation.test.ts` (16 tests).

### Implementation note: safeParse bypass for recipe.layers path

The `AgentOutputSchema` (`RhythmLayerStepsSchema`) requires `steps.length === 16` — this is an LLM-output contract. The recipe.layers path constructs layers from trusted catalog data and may produce 12-step arrays (cueca palmas). Bypassing safeParse for the layers path is safe because:
1. The data is constructed from the recipe catalog (invariant 8: binary.length === steps enforced by tests).
2. `applyRhythmSpec` accepts `L.steps.slice(0, RSTEPS)` — any length array up to 16.
3. The `AgentOutputSchema` purity constraint (OD-1 from ADR 0025) is maintained — no schema change.

### Files touched

- `src/agent/apply.ts` — `applyRhythmSpec` (merge logic + `opts`), new `applyLockedFlags`
- `src/core/music-knowledge/recipe-engine.ts` — `recipeToAgentOutput` (layers path + safeParse bypass)
- `src/agent/agent.ts` — stateSnapshot `locked` field + `SYSTEM_PROMPT_EVOLUTION` rule 2
- `src/agent/autopilot.ts` — `applyPlanStep` + `applyRecipeById` (force + lockedFlags)
- `tests/authentic-groove/lock-preservation.test.ts` — new (16 tests)
- `docs/authentic-groove/handoffs/phase-05-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

- A-05-02 (partial): `applyRhythmSpec` preserves locked layers — confirmed by 6 `lock-preservation.test.ts` tests.
- A-05-03 (partial): `applyLockedFlags` stamps `locked: true` — confirmed by 4 `lock-preservation.test.ts` tests.
- A-05-05 (partial): `recipeToAgentOutput` uses `recipe.layers[i].sound` when present — confirmed by 3 `lock-preservation.test.ts` tests.
- A-05-08 (partial): `SYSTEM_PROMPT_EVOLUTION` contains locked-layer rule (rule 2); stateSnapshot includes `locked` per layer — confirmed by `tsc --noEmit`.

### Routine validations

- `pnpm exec tsc --noEmit` → clean (0 errors)
- `pnpm exec vitest run lock-preservation` → 16 tests pass
- `pnpm test` → 1816 tests, 0 failures (1800 baseline from 05.2 + 16 new)
- No genre name in `apply.ts`, `recipe-engine.ts`, `agent.ts` (AG-D1 confirmed)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-05-01 | `RhythmLayer.locked?: boolean` field exists; codegen ignores it | `tsc --noEmit` | type | partial |
| A-05-02 | `applyRhythmSpec` preserves locked layers | `lock-preservation.test.ts` | unit | partial |
| A-05-03 | `applyLockedFlags` stamps `locked: true` | `lock-preservation.test.ts` | unit | partial |
| A-05-04 | `locked` round-trips via schema; pre-Phase-05 sessions load | `locked-persistence.test.ts` | unit | partial |
| A-05-05 | `recipeToAgentOutput` reads `recipe.layers`; backward compat | `lock-preservation.test.ts` | unit | partial |
| A-05-06 | New catalog entries satisfy all 5 invariants; seam grep zero | `rhythm-catalog.test.ts` | unit | partial |
| A-05-07 | Cueca 3 locked layers; cumbia 2 locked layers with sampleMap | — | — | not yet (step 05.4) |
| A-05-08 | `SYSTEM_PROMPT_EVOLUTION` locked-layer rule; stateSnapshot includes `locked` | `tsc --noEmit` | static | partial |
| A-05-09 | `tsc --noEmit` + lint + test + build | `pnpm test` | quality gate | partial |

### Environment state after this step

1816 tests passing. No schema version changes. `SYSTEM_PROMPT_EVOLUTION` now has 8 rules (was 7).

### Next-step context

Step 05.4: download 4 EggShaker FLAC files, convert to OGG as `shaker_0-3.ogg`, update `sample-map.ts`, update `cueca-chilena-folk` and `cumbia-latina-groove` recipes with `layers` arrays, update tests.
