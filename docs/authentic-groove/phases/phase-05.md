<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 05 — Multi-Layer Recipes + Base-Lock Mechanism

**Purpose:** Extend recipes to declare multiple named layers (each with its own pattern, Sound role, and `locked` flag) and add lock-preservation logic so agent rhythm changes never disturb a recipe's cultural signature layers.

**Gate:** Phase 04 complete and merged to `main`; `pnpm test` passes at 1720; `SCHEMA_VERSION = 6`; `SESSION_SCHEMA_VERSION = 5`; ADR 0025 in force; AG-D1 seam invariant in force.

**Expected phase result:** The `cueca-chilena-folk` recipe produces three locked layers (kick `E(4,12)`, palmas, subdivision) and the `cumbia-latina-groove` recipe produces two locked layers (conga caja + a shaker/hi-hat layer) or an updated two-layer pattern per the inventory's finding; `RhythmLayer` carries `locked?: boolean`; `applyRhythmSpec` preserves locked layers when called without a recipe; `SESSION_SCHEMA_VERSION` stays 5; all existing tests pass and the seam grep returns zero matches.

---

## Architectural notes (hard invariants for every step)

**Multi-layer recipe field design:**
`MusicalRecipe` gains an optional `layers?: ReadonlyArray<RecipeLayer>` field. A `RecipeLayer` is **self-contained** — it carries the step pattern directly (`binary: string`, `steps: number`, `euclid?: {k,n,rot}`) so the recipe is readable without looking up the rhythm catalog. It also carries `sound: Sound`, `locked?: boolean`, and an optional `strudelSample?: string` override. The `rhythmId` field is kept on `RecipeLayer` as an optional catalog cross-reference for traceability, but it is NOT required and NOT used at runtime by `recipeToAgentOutput`. When `layers` is present it supersedes `rhythmIds` for all callers (`recipeToAgentOutput`, lock-propagation). The existing top-level `rhythmIds: string[]` is kept on `MusicalRecipe` and must remain consistent with `layers.map(l => l.rhythmId ?? '')` for recipes that supply it — the inventory step will determine if this consistency rule is worth enforcing via test or if `rhythmIds` is simply deprecated in favour of `layers`. The 10 existing recipes that have no `layers` declaration are not updated in this phase and continue to use `rhythmIds` + index-based sound assignment.

**Lock-preservation contract:**
- When `applyRecipeById` is called (recipe application), ALL current layers are replaced by the recipe's layers (locked and unlocked alike). The new recipe defines the fresh locked base. `setLastRecipeApplied` is called as before.
- When `applyRhythmSpec` is called WITHOUT a subsequent recipe application (direct agent call), it must PRESERVE any `locked: true` layer in the current session. The merge rule: for each proposed layer from `spec.layers`, if a layer with the same `sound` currently has `locked: true`, skip the proposed layer (keep the locked one). Locked layers not targeted by the spec are also retained. Only unlocked layers are replaced.
- When the agent calls `applyRhythmSpec` directly (no `recipeId`), it is a fresh start only if there are NO locked layers currently. If locked layers exist, the merge rule above applies. A full reset (replace all) can happen only via `applyRecipeById`.

**Seam constraint (AG-D1):** The `locked` flag is genre-agnostic plumbing (`RhythmLayer`, `applyRhythmSpec`, `SavedRhythmLayerSchema`). Which layers ARE locked = knowledge declared in `MusicalRecipe.layers`. No genre name may appear in `apply.ts`, `persistence.ts`, or `codegen`. Run `git grep` over introduced genre tokens (excluding `src/core/music-knowledge/` and `tests/`) before each commit — zero matches required.

**`SESSION_SCHEMA_VERSION` stays 5:** `locked?: boolean` added to `SavedRhythmLayerSchema` as additive optional (same pattern as `strudelSample` in Phase 01 and Phase 04). Pre-Phase-05 sessions without `locked` fields continue to parse; `locked: undefined` falls back to "not locked" in all code paths.

---

## Step 05.1 — Inventory

PROMPT → Read source files and live external sources, resolve all open design questions, and produce `docs/authentic-groove/inventories/phase-05-inventory.md`. Do NOT write any source file. STOP for Pilot review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1 in force)
3. `docs/adr/0025-authentic-sample-palette.md` (D1–D7 seam rules)
4. `src/core/rhythm/layers.ts` (current `RhythmLayer` — understand all existing fields)
5. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — all 15 recipes; focus on `cueca-chilena-folk` and `cumbia-latina-groove`)
6. `src/core/music-knowledge/rhythm-catalog.ts` (focus on `cueca-chilena-base`, `cueca-chilena-syncopated`, `cumbia-caja`, `cumbia-guache`)
7. `src/core/music-knowledge/recipe-engine.ts` (full — `recipeToAgentOutput`, `getExpressibleRecipes`, `isRhythmIdExpressible`)
8. `src/agent/apply.ts` (full — `applyRhythmSpec` and `applySampleMap` — understand the current merge/replace logic)
9. `src/agent/autopilot.ts` (lines 110–160 — `applyPlanStep` — understand how recipe and rhythm specs are applied)
10. `src/agent/agent.ts` (lines 340–380 — `stateSnapshot` construction in `sendEvolution`)
11. `src/agent/schema.ts` (full — `RhythmLayerSchema`, `RhythmSpecSchema`, `AgentOutputSchema`)
12. `src/lib/persistence.ts` (lines 89–101 — `SavedRhythmLayerSchema` — understand current optional fields)
13. `src/audio/sample-map.ts` (full — understand what CC0 samples are already registered)
14. `docs/authentic-groove/handoffs/phase-04-handoff.md` step 04.5 (confirmed test count: 1720; seam grep evidence)
15. `docs/authentic-groove/phases/phase-04.md` (Deferred items — confirm "multi-layer polyrhythm" was listed as deferred)

**Live verification (mandatory — do NOT assume from memory):**

- Fetch `https://api.github.com/repos/freepats/world-percussion/contents/samples` to confirm instrument folder list. For each folder named `Maracas`, `Shaker`, `Guacharaca`, or similar percussive rattles/scrapers, fetch its contents listing and count the FLAC files. Record findings verbatim.
- Check `public/samples/` directory contents (already confirmed: 12 OGG files + LICENSE.txt from Phase 04). No additional check needed unless the FreePats shaker inquiry changes the plan.
- Grep `src/core/music-knowledge/rhythm-catalog.ts` for cueca entries: confirm `cueca-chilena-base` (steps:12, binary:'100100100100', euclid:{k:4,n:12,rot:0}) and look for a 12-step palmas/clap entry or whether one must be added to the catalog.
- Grep `src/core/music-knowledge/rhythm-catalog.ts` for existing 12-step struct entries (look for entries where `steps: 12` and `strudelStrategy: 'struct'`) — these would be candidates for a cueca palmas pattern.

**Inventory sections (all seven required):**

**§1 — Shaker/maracas inquiry.**
State the FreePats folder list fetched from GitHub. For any shaker/maracas/guacharaca folder found: list the file count, confirm CC0, and propose a `shaker` sample name registered in `initAudio()` and `sample-map.ts`. If no suitable folder exists: state that clearly and confirm `cp` (hand clap) is the fallback for the cumbia shaker/hi-hat role (as the Pilot proposed). If `cp` is used as fallback, cite the strudel.json verification confirming `'sh'` does not exist in dirt-samples (confirmed in Phase 01 inventory; re-confirm or cite the prior confirmation).

**§2 — `MusicalRecipe.layers` field design.**
State the exact TypeScript declaration for the new `layers` field on `MusicalRecipe`. Confirm that:
- `rhythmIds` is retained on `MusicalRecipe` and must be kept consistent with `layers[].rhythmId` (enforced by updated recipe integrity tests).
- The invariant update: when `layers` is present, the integrity test asserts `rhythmIds` equals `layers.map(l => l.rhythmId)` and that every `layers[].rhythmId` resolves in the catalog.
- For the 10 existing recipes without `layers`, no change needed — `recipeToAgentOutput` reads from `layers` when present and falls back to `rhythmIds` with index-based sound assignment otherwise.
- The `sound` field in `layers[i]` replaces the `soundForIndex(i)` lookup for expressible recipes.
- Propose whether `layers` should be `readonly` and how to handle the type in recipe data files (plain object literals — no change needed).

**§3 — `RhythmLayer.locked` field and `SavedRhythmLayerSchema` update.**
State the exact JSDoc and TypeScript field declaration. State the `SavedRhythmLayerSchema` addition (`locked: z.boolean().optional()`). Confirm `SESSION_SCHEMA_VERSION` stays 5. Describe how pre-Phase-05 sessions (no `locked` field) continue to work — `locked: undefined` is treated as `false` in all logic paths.

**§4 — `applyRhythmSpec` lock-preservation logic.**
Describe the merge algorithm verbatim:
- Read current session `layers` before replacing.
- For each proposed layer in `spec.layers`: if the current session has a layer with the same `sound` AND that layer has `locked: true`, skip the proposed layer.
- After processing `spec.layers`, retain all current locked layers whose `sound` did NOT appear in `spec.layers` (they are kept in place).
- Unlocked layers not targeted by the spec are dropped (spec defines the new unlocked set).
- The resulting layer array = proposed unlocked layers (merged/replaced) + all current locked layers (preserved).
- Order: locked layers first, then unlocked. Or: preserve position of locked layers, insert unlocked at remaining positions. The inventory must decide on order and document it clearly — the Pilot's intuition is that locked base layers should come first (they are the cultural signature); unlocked agent layers follow.
- Confirm: when no locked layers exist in the current session, `applyRhythmSpec` behaves identically to the current implementation (full replace). This is the backward-compatibility guarantee.
- Confirm: `applyRecipeById` still calls `applyRhythmSpec` followed by `applySampleMap` (and now also `applyLockedLayers` — see §5). The recipe application path ignores the merge rule (it is a fresh recipe application, not an agent modification).

**§5 — `applyRecipeById` + `recipeToAgentOutput` changes.**
Describe:
- How `recipeToAgentOutput` reads `recipe.layers` when present (sound from `layers[i].sound`, `rhythmId` from `layers[i].rhythmId`).
- How the lock flag from `recipe.layers[i].locked` is propagated to the constructed `RhythmLayer` in the session store after `applyRhythmSpec`. Currently `applyRhythmSpec` builds plain layers without `locked`. Two options:
  - Option A: `applyRhythmSpec` receives a post-processed `spec` that includes `locked` markers — but `RhythmLayerSchema` in `schema.ts` has no `locked` field (it is an agent-output schema, not a session-layer schema). Adding `locked` to the agent schema would violate OD-1 from ADR 0025 (keep `AgentOutputSchema` pure).
  - Option B: `applyRecipeById` (in `session.ts`) calls `applyRhythmSpec` as before, then immediately after calls a new `applyLockedFlags(lockedSounds: Sound[])` helper in `apply.ts` that marks the newly-created session layers as locked. `applyLockedFlags` is genre-agnostic: it receives a list of Sound values and stamps `locked: true` on matching layers in the store. This preserves the `AgentOutputSchema` purity.
  - Recommend Option B and confirm it respects AG-D1 (no genre name in `apply.ts`).
- Confirm `setLastRecipeApplied` is called after both `applyRhythmSpec` and `applyLockedFlags` (last write wins is still correct — recipe badge is set after the full recipe application).

**§6 — Agent stateSnapshot locked info.**
Describe how the LLM learns which layers are locked:
- The `stateSnapshot` in `sendEvolution()` (agent.ts lines 348–376) currently maps `sound` and `steps/euclid`. Adding `locked: layer.locked ?? false` to each layer entry in the stateSnapshot is sufficient — the LLM sees `locked: true` on base layers and knows not to modify them.
- The SYSTEM_PROMPT_EVOLUTION must be updated to include a rule: "Locked layers (locked: true in the stateSnapshot) must NOT be replaced or modified. Only propose changes to unlocked layers. If you want to change a locked layer's sound, omit it from your rhythm spec — it will be preserved automatically."
- Confirm the stateSnapshot change is a payload-only change (LLM-facing) and does NOT affect any schema or store structure.
- Confirm this does not violate ADR 0022 D3 (sendEvolution never pushes to chatHistory) — it does not; stateSnapshot is constructed fresh per call.

**§7 — Cueca multi-layer pattern design.**
For the three cueca locked layers:
- **bd (kick)**: `cueca-chilena-base` (id already in catalog, steps:12, euclid:{k:4,n:12,rot:0}, binary:'100100100100'). Confirm expressibility: `strudelStrategy === 'euclid'` and `n === 12 ≤ 16`. Expressible.
- **cp (palmas/clap)**: A 12-step pattern with onsets at steps 4 and 10 (0-indexed) — binary `'000010000010'` (2 onsets, cueca palmas feel). Check if this entry exists in the catalog under `rhythm-catalog.ts`. If not, it must be added as a new struct entry (12-step struct). Confirm whether a new catalog entry is needed and propose its `id`, `binary`, `onsets`, and `name`.
- **hh (subdivision)**: A 12-step alternating or all-on subdivision. E(6,12,0) = '101010101010' — every other 8th note. Check if this entry exists. If not, propose a new euclid entry with `{k:6,n:12,rot:0}` or a struct entry for '101010101010' (12-step).
- For each new catalog entry needed: propose the full `RhythmEntry` fields. The catalog integrity tests must be updated to cover them.
- State whether `cueca-chilena-syncopated` (existing entry) is reused for any of the cueca layers, or is unused in the new multi-layer recipe.

**§8 — Cumbia multi-layer pattern design.**
For the two cumbia locked layers:
- **bd (conga caja)**: `cumbia-caja` (id already in catalog, steps:16, struct, binary:'1001001010001000'). Already used in `cumbia-latina-groove`. Confirm expressibility (steps16-expressible: strudelStrategy==='struct' && steps===16). Expressible.
- **hh (shaker/guacharaca)**: If a shaker CC0 sample was found in §1 — use `shaker` sample name, propose a 16-step pattern (e.g., E(8,16) = alternating 8th notes = '1010101010101010', or a more characteristic guacharaca pattern). If no shaker sample was found — use `cp` as the sound role (Strudel's built-in hand-clap as fallback, per Pilot guidance), with a 16-step straight-8th or syncopated pattern. Confirm the pattern binary and euclid parameters. Propose whether this is `euclid-expressible` or `struct`.
- State the `sampleMap` for the cumbia recipe: `bd → 'conga'` (already in phase 04), `hh → 'shaker'` if found OR `hh → 'cp'` as fallback.

**Implementation requirements:** Read only. Produce the inventory file. Touch no `.ts`, `.svelte`, or binary file.

**Validation:**
- `git status` → only `docs/authentic-groove/inventories/phase-05-inventory.md` and `docs/authentic-groove/handoffs/phase-05-handoff.md` are new/modified.

**CHECKPOINT → Commit message:**
`docs(authentic-groove): Phase 05 step 05.1 — multi-layer recipe + base-lock inventory`

**STOP for Pilot review.** The §1 shaker finding and §7/§8 new catalog entries must be confirmed before any source file is modified.

---

## Step 05.2 — Model changes: `RhythmLayer.locked`, `MusicalRecipe.layers`, `SavedRhythmLayerSchema`

PROMPT → Read the inventory and apply the model-level changes: add `locked?: boolean` to `RhythmLayer`, add `layers` field to `MusicalRecipe`, update `SavedRhythmLayerSchema`, and add any new rhythm-catalog entries needed for cueca and cumbia. Add or update integrity/type tests. No `applyRhythmSpec` or recipe data changes in this step.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-05-inventory.md` §2, §3, §7, §8 (exact declarations and new catalog entries)
2. `docs/authentic-groove/decisions.md` (AG-D1 — no genre name outside `src/core/music-knowledge/`)
3. `docs/adr/0025-authentic-sample-palette.md` (D1, D5 — `strudelSample` pattern; confirm `locked` follows the same additive-optional pattern)
4. `src/core/rhythm/layers.ts` (before editing — read current interface)
5. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (before editing — understand current `MusicalRecipe` interface)
6. `src/core/music-knowledge/rhythm-catalog.ts` (before editing — understand where new entries go)
7. `src/lib/persistence.ts` (lines 89–101 — before editing)
8. `tests/music-knowledge/` — list and read existing recipe integrity tests and catalog invariant tests; understand what to update

**What to produce:**

`src/core/rhythm/layers.ts` — add `locked?: boolean` to `RhythmLayer` with JSDoc: "When true, this layer is part of a recipe's cultural signature and must not be replaced by agent rhythm changes. Set by `applyLockedFlags()` after a recipe is applied; cleared when a new recipe replaces all layers."

`src/core/music-knowledge/rhythm-harmony-recipes.ts` — add the `layers` field to `MusicalRecipe`:

```typescript
/**
 * Optional multi-layer declaration. When present, supersedes `rhythmIds` for
 * sound assignment and lock propagation. Each RecipeLayer is self-contained:
 * the step pattern (binary/steps/euclid) is embedded directly so the recipe
 * is readable without looking up the rhythm catalog.
 *
 * Invariants (enforced by tests):
 *  7. Every `layers[i].sound` is a valid Sound value.
 *  8. Every `layers[i].binary` length equals `layers[i].steps`.
 *  9. If `layers[i].rhythmId` is present, it resolves in RHYTHM_CATALOG
 *     (optional cross-reference for traceability only — not used at runtime).
 */
layers?: ReadonlyArray<RecipeLayer>;
```

Where `RecipeLayer` is a new interface in the same file:

```typescript
export interface RecipeLayer {
  sound: Sound;
  locked?: boolean;
  binary: string;         // step pattern, length === steps
  steps: number;          // total step count (12 for 6/8, 16 for 4/4)
  euclid?: { k: number; n: number; rot: number }; // optional description only
  strudelSample?: string; // inline sampleMap override (replaces top-level sampleMap entry for this layer)
  rhythmId?: string;      // optional catalog cross-reference (traceability; not used at runtime)
}
```

Do NOT update any recipe data entries in this step (no `cueca` or `cumbia` recipe changes yet — that is step 05.4). Do NOT add the new catalog entries yet if they require new catalog data — that also goes in step 05.4. If new catalog entries are purely additive (no changes to existing entries or tests), add them in this step with their full fields.

`src/core/music-knowledge/rhythm-catalog.ts` — add any new catalog entries identified in inventory §7 and §8 (if they do not already exist). Each new entry must satisfy all 5 catalog invariants. If a new 12-step palmas entry is needed for cueca, add it here. If a 12-step hh subdivision entry is needed, add it here.

`src/lib/persistence.ts` — add `locked: z.boolean().optional()` to `SavedRhythmLayerSchema`. Update `serializeSession` to include `locked` when present (same pattern as `strudelSample` — conditional spread). Update `deserializeSession` to carry through `locked` when present.

Updated `tests/music-knowledge/` — update the recipe invariant test to enforce:
- When `recipe.layers` is present, `recipe.rhythmIds` equals `recipe.layers.map(l => l.rhythmId)`.
- Every `recipe.layers[i].rhythmId` resolves in `RHYTHM_CATALOG` (same check as existing rhythmIds invariant).
- Every `recipe.layers[i].sound` is a valid Sound value.

Updated `tests/authentic-groove/` or new test file — add persistence roundtrip tests for `locked`:
- Serialize a session with a layer that has `locked: true`; deserialize; confirm `locked` is preserved.
- Serialize a session with a layer that has no `locked`; deserialize; confirm `locked` is `undefined` (not `false`).
- Existing persistence roundtrip tests must still pass.

**Constraints:**
- `SESSION_SCHEMA_VERSION` stays 5.
- `SCHEMA_VERSION` stays 6.
- Do NOT change `applyRhythmSpec`, `applyPlanStep`, `recipeToAgentOutput`, or any recipe data in this step.
- No genre name in `src/core/rhythm/layers.ts`, `src/lib/persistence.ts`, or any file outside `src/core/music-knowledge/`.
- AGPL-3.0 header on all new test files.

**Acceptance criteria in this step:**
- A-05-01 (partial): `RhythmLayer.locked?: boolean` field exists and is type-safe — covered by `tsc --noEmit` and type tests.
- A-05-04 (partial): `locked` field persists and round-trips via `SavedRhythmLayerSchema` — covered by persistence roundtrip tests.
- A-05-06 (partial): new catalog entries (if any) satisfy all 5 catalog invariants — covered by existing catalog invariant tests.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm test` → no regressions (1720 + new tests)
- `git status` → only `src/core/rhythm/layers.ts`, `src/core/music-knowledge/rhythm-harmony-recipes.ts`, `src/core/music-knowledge/rhythm-catalog.ts` (if new entries added), `src/lib/persistence.ts`, updated/new test files, handoff entry

**CHECKPOINT → Commit message:**
`feat(music-knowledge): Phase 05 step 05.2 — RhythmLayer.locked + MusicalRecipe.layers + persistence`

---

## Step 05.3 — Lock-preservation logic + `recipeToAgentOutput` update + stateSnapshot

PROMPT → Implement `applyLockedFlags()`, update `applyRhythmSpec` with merge logic, update `recipeToAgentOutput` to read `recipe.layers`, and add `locked` to `stateSnapshot` in `sendEvolution` with SYSTEM_PROMPT_EVOLUTION update. Add targeted unit tests.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-05-inventory.md` §4, §5, §6 (exact algorithm, Option B rationale, stateSnapshot change)
2. `docs/authentic-groove/decisions.md` (AG-D1 — zero genre name in `apply.ts`, `recipe-engine.ts`, `agent.ts`)
3. `docs/adr/0025-authentic-sample-palette.md` (D3 — seam: codegen and plumbing contain no genre knowledge)
4. `src/agent/apply.ts` (full — before editing; `applyRhythmSpec` current implementation)
5. `src/core/music-knowledge/recipe-engine.ts` (full — before editing; `recipeToAgentOutput` current implementation)
6. `src/agent/agent.ts` (lines 340–430 — stateSnapshot + `SYSTEM_PROMPT_EVOLUTION` — before editing)
7. `src/agent/autopilot.ts` (lines 110–165 — `applyPlanStep` + recipe path — understand caller chain)
8. `src/state/session.ts` (grep for `applyRecipeById` — understand where it lives and how it calls `applyRhythmSpec`)

**What to produce:**

`src/agent/apply.ts` — add two functions and update one:

1. **New: `applyLockedFlags(lockedSounds: Sound[]): void`** — reads current session rhythm layers; sets `locked: true` on any layer whose `sound` is in `lockedSounds`. Genre-agnostic: it receives a list of Sound values, not genre names. JSDoc: "Stamp `locked: true` on session rhythm layers matching `lockedSounds`. Called by the recipe-application path after `applyRhythmSpec` to mark the recipe's cultural signature layers. Genre-agnostic — receives a list of Sound values, not genre names. Per Phase 05 §5 (Option B)."

2. **Updated: `applyRhythmSpec(spec: RhythmSpec): void`** — add lock-preservation merge logic per inventory §4:
   - Before building the new layer array, read `get(sessionStore).rhythm.layers` to identify currently locked layers.
   - Build the proposed new unlocked layers from `spec.layers` (same as current implementation), BUT skip any proposed layer whose `sound` matches a currently locked layer.
   - After building the unlocked layer array, re-add all currently locked layers (prepend them, locked layers first).
   - If there are no currently locked layers, the behavior is identical to the current implementation (full replace).
   - The `setLastRecipeApplied(null)` call at the top of the function is kept — the recipe badge is cleared whenever `applyRhythmSpec` is called directly. `applyRecipeById` calls `setLastRecipeApplied(recipeDisplay)` after, which overwrites it (last write wins — existing behavior).

3. **No change to `applySampleMap`** — it is already genre-agnostic and does not need updating.

`src/core/music-knowledge/recipe-engine.ts` — update `recipeToAgentOutput`:
- When `recipe.layers` is present, use `recipe.layers[i].sound` instead of `soundForIndex(i)` for sound assignment.
- The `options.layerSound` override applies only when `recipe.layers` is absent AND the recipe has exactly one layer (same as current).
- No other changes to the function's rhythm or harmony translation logic.

`src/agent/agent.ts` — two changes:
1. In `sendEvolution()`, update `stateSnapshot.rhythm.layers` mapping to include `locked: layer.locked ?? false` for each layer. This is a payload-only change — does not affect any schema or store.
2. In `SYSTEM_PROMPT_EVOLUTION`, add a rule after rule 1: "2. CAPAS BLOQUEADAS: si `locked: true` aparece en una capa del stateSnapshot, NO la modifiques ni la omitas. Solo propón cambios en capas con `locked: false` o sin campo `locked`. Las capas bloqueadas son la firma rítmica cultural de la receta activa."

Renumber existing rules 2–7 to 3–8.

New `tests/authentic-groove/lock-preservation.test.ts` (AGPL-3.0 header):
- Test `applyRhythmSpec` with locked layers: apply a recipe via `applyLockedFlags`, then call `applyRhythmSpec` with a spec that targets the same sound → confirm locked layer is preserved unchanged.
- Test `applyRhythmSpec` with no locked layers: confirm behavior is identical to the pre-Phase-05 implementation (full replace).
- Test `applyLockedFlags`: apply layers to the session store, call `applyLockedFlags(['bd', 'cp'])`, confirm `bd` and `cp` layers have `locked: true`, `hh` has `locked: undefined`.
- Test `recipeToAgentOutput` with `recipe.layers` present: confirm layer sounds match `recipe.layers[i].sound` (not index-based defaults).
- Test `recipeToAgentOutput` without `recipe.layers`: confirm backward-compatible behavior (index-based sound assignment, same as before).

**Constraints:**
- Zero genre name in `apply.ts`, `recipe-engine.ts`, `agent.ts` (AG-D1).
- `AgentOutputSchema` (schema.ts) is NOT modified — `locked` is not an agent output field.
- `SESSION_SCHEMA_VERSION` stays 5; `SCHEMA_VERSION` stays 6.
- AGPL-3.0 header on new test file.
- Do NOT update recipe data in this step.

**Acceptance criteria in this step:**
- A-05-02 (partial): `applyRhythmSpec` preserves locked layers when the agent proposes a rhythm change — covered by `lock-preservation.test.ts`.
- A-05-03 (partial): `applyLockedFlags` stamps `locked: true` correctly — covered by unit tests.
- A-05-05 (partial): `recipeToAgentOutput` reads `recipe.layers` for sound assignment when present — covered by unit tests.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run lock-preservation` → all new tests pass
- `pnpm test` → no regressions
- `git status` → only `src/agent/apply.ts`, `src/core/music-knowledge/recipe-engine.ts`, `src/agent/agent.ts`, `tests/authentic-groove/lock-preservation.test.ts`, handoff entry

**CHECKPOINT → Commit message:**
`feat(agent): Phase 05 step 05.3 — lock-preservation in applyRhythmSpec + stateSnapshot locked info`

---

## Step 05.4 — Recipe data updates: cueca multi-layer + cumbia second layer

PROMPT → Update `cueca-chilena-folk` and `cumbia-latina-groove` recipe entries to use the new `layers` field with locked declarations. All changes confined to `src/core/music-knowledge/`. Update sample-map and propagation tests.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-05-inventory.md` §7 and §8 (exact pattern design for cueca and cumbia multi-layer)
2. `docs/authentic-groove/inventories/phase-05-inventory.md` §1 (shaker finding — determines cumbia hh sound and sampleMap entry)
3. `docs/authentic-groove/decisions.md` (AG-D1 seam invariant)
4. `docs/adr/0025-authentic-sample-palette.md` (D2 — sampleMap rules; D6 — fallback policy)
5. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — before editing)
6. `src/core/music-knowledge/rhythm-catalog.ts` (confirm any new catalog entries from step 05.2 are present)
7. `tests/authentic-groove/sample-map.test.ts` (full — before editing; understand verified sample name set)
8. `tests/authentic-groove/propagation.test.ts` (full — before editing; understand what to extend)
9. `tests/music-knowledge/` — list and read the recipe integrity tests before editing

**What to produce:**

`src/core/music-knowledge/rhythm-harmony-recipes.ts` — update two recipes:

**`cueca-chilena-folk`:**
```
layers: [
  { sound: 'bd', binary: '100100100100', steps: 12, euclid: {k:4,n:12,rot:0}, locked: true },   // kick: E(4,12) — cueca zapateado, LOCKED
  { sound: 'cp', binary: '000010000010', steps: 12, locked: false },  // palmas: onsets at 4,10 — FREE (agent can vary)
  { sound: 'hh', binary: '101010101010', steps: 12, euclid: {k:6,n:12,rot:0}, locked: false },   // subdivision: E(6,12) — FREE
]
```
Only `bd` is locked (Pilot-confirmed: the zapateado kick defines the cueca identity). `cp` and `hh` are in the recipe as free layers — the agent can modify or replace them.

No `sampleMap` change for cueca — the existing recipe has no `sampleMap` and cueca palmas use `cp` (Strudel built-in). Document in an inline comment if the inventory confirms `cp` as a reasonable palmas approximation.

**`cumbia-latina-groove`:**
```
layers: [
  { sound: 'bd', binary: '1001001010001000', steps: 16, locked: true, strudelSample: 'conga' },  // conga caja: LOCKED
  { sound: 'hh', binary: '<per-inventory-§8>', steps: 16, locked: true, strudelSample: 'shaker-or-cp' },  // guacharaca/shaker: LOCKED
]
```
Both layers locked (Pilot-confirmed for cumbia). Update `sampleMap` to add the `hh` entry: `hh: 'shaker'` if FreePats shaker was found in §1, or `hh: 'cp'` as fallback with comment: `// cp: built-in clap as guacharaca fallback — no CC0 shaker sample available`.

If a `shaker` FreePats sample was found (§1), also update `src/audio/sample-map.ts` and `src/audio/strudel.ts` to register it — same pattern as Phase 04. In that case, update `tests/authentic-groove/sample-registration.test.ts` and `sample-map.test.ts` to cover the new sample name. (If `cp` fallback is used, no `sample-map.ts` / `strudel.ts` changes are needed.)

Updated `tests/authentic-groove/sample-map.test.ts` — add assertions for cueca and cumbia updated entries. If cumbia gains `hh → 'shaker'` or `hh → 'cp'`, assert it.

Updated `tests/authentic-groove/propagation.test.ts` — add tests for the multi-layer cueca and cumbia recipes:
- For cueca: verify that `recipeToAgentOutput('cueca-chilena-folk')` (via `getRecipeById`) produces layers with the correct sounds (`bd`, `cp`, `hh`) matching `recipe.layers[i].sound`.
- For cumbia: verify that the two-layer output has `bd` and `hh` with correct sounds and that the `sampleMap` for `hh` propagates correctly through `applySampleMap`.

**Constraints:**
- ALL changes confined to `src/core/music-knowledge/`, `src/audio/` (only if shaker found), and `tests/`.
- No change to `recipe-engine.ts`, `apply.ts`, `autopilot.ts`, or persistence in this step.
- Do NOT remove the existing `sampleMap: { bd: 'conga' }` entry on `cumbia-latina-groove` — add the `hh` entry to the existing map.
- AGPL-3.0 header already present — do not modify it.

**Acceptance criteria in this step:**
- A-05-05 (partial): cueca recipe emits three layers with sounds `bd`, `cp`, `hh` per `recipe.layers` — confirmed by propagation tests.
- A-05-07 (partial): cumbia recipe emits two locked layers; `hh` layer carries the correct sampleMap entry — confirmed by sample-map and propagation tests.
- A-05-06 (full): any new catalog entries satisfy all catalog invariants — confirmed by catalog invariant tests.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run sample-map` → all sample-map tests pass
- `pnpm exec vitest run propagation` → all propagation tests pass (no regressions)
- `pnpm test` → no regressions
- `git status` → only `src/core/music-knowledge/rhythm-harmony-recipes.ts` (modified), `src/core/music-knowledge/rhythm-catalog.ts` (if new entries needed beyond step 05.2), test files, handoff entry (and optionally `src/audio/sample-map.ts` + `src/audio/strudel.ts` if shaker found)

**CHECKPOINT → Commit message:**
`feat(music-knowledge): Phase 05 step 05.4 — cueca multi-layer + cumbia second layer recipes`

---

## Step 05.5 — End-to-end tests + seam fitness check + full quality gate

PROMPT → Verify that locked layers propagate through the full apply-recipe path (recipe → `applyRhythmSpec` → `applyLockedFlags` → session → persist → reload), run the seam fitness grep extended for any new sample names, run the full quality gate, and record all output in the handoff.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-05-inventory.md` (all sections — confirm all decisions were followed)
2. `docs/authentic-groove/handoffs/phase-05-handoff.md` (confirm steps 05.2, 05.3, 05.4 are APPROVED)
3. `docs/adr/0025-authentic-sample-palette.md` (D3 — seam invariant + grep command)
4. `tests/authentic-groove/propagation.test.ts`, `tests/authentic-groove/lock-preservation.test.ts` (before editing — understand what to extend)

**What to produce:**

Extended `tests/authentic-groove/propagation.test.ts` — add integration tests:
- Full path test for `cueca-chilena-folk`: call `getRecipeById('cueca-chilena-folk')`, call `applyRhythmSpec` + `applyLockedFlags`, read session store, confirm three layers with `locked: true` on all three, confirm sounds are `bd`, `cp`, `hh`, confirm `rhythmLayerToStrudelLine` output for each layer.
- Full path test for `cumbia-latina-groove`: confirm two locked layers, confirm `bd` layer has `strudelSample: 'conga'` (via `applySampleMap`), confirm `hh` layer has the sampleMap-derived `strudelSample`.
- Lock-preservation integration test: set up session with cueca locked layers; call `applyRhythmSpec` with a single-layer `bd` spec; confirm all three cueca locked layers are still present (the `bd` proposed layer was blocked), AND the spec's unlocked layers are also present (if any).

Persistence roundtrip integration test (in `tests/authentic-groove/lock-preservation.test.ts` or a new file):
- Serialize a session where `bd` layer has `locked: true`; deserialize via `SavedSessionSchema`; confirm `locked` is preserved.

Run and record the seam fitness check:
- Genre-token grep (ADR 0025 D3): `'cueca'`, `'cumbia'`, `'candombe'`, etc. must not appear in `src/` outside `src/core/music-knowledge/`. Zero matches required.
- Palette-confinement grep: if a `shaker` sample was added, add `'shaker'` to the palette grep — confirm it appears only in `src/audio/` and `src/core/music-knowledge/`.
- Lock-concept grep: `'locked'` may appear in `src/core/rhythm/layers.ts` (field declaration), `src/agent/apply.ts` (logic), `src/lib/persistence.ts` (schema), and `src/agent/agent.ts` (stateSnapshot). Confirm it does NOT appear in `src/core/codegen/` or any Svelte file with hardcoded genre logic.

Run and record the full quality gate:
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

**Reversibility / flag-off note (required verbatim in handoff):**
- The `locked` field is additive optional on `RhythmLayer`. Reverting the field removes the lock-preservation behavior: `applyRhythmSpec` returns to full-replace (pre-Phase-05 behavior). Sessions with `locked: true` layers continue to parse — the field is simply ignored if `applyRhythmSpec` does not check it.
- Reverting the `applyLockedFlags` call from `applyRecipeById` means new recipe applications do not stamp locks — but existing locked layers (loaded from a saved session) would still be preserved until `applyRhythmSpec` runs (which, without the check, would replace them). Full revert restores pre-Phase-05 behavior exactly.
- The `MusicalRecipe.layers` field is additive optional. Reverting it means recipes fall back to index-based sound assignment (pre-Phase-05 behavior). Recipe data is unchanged in its external meaning.
- `SESSION_SCHEMA_VERSION` stays 5 — pre-Phase-05 sessions load without issue.

**Acceptance criteria in this step:**
- A-05-01 (full): `RhythmLayer.locked?: boolean` field exists; `locked: true` layers survive `applyRhythmSpec` calls — confirmed by integration tests and propagation tests.
- A-05-02 (full): `applyRhythmSpec` preserves locked layers when called directly by the agent — confirmed by lock-preservation tests and integration tests.
- A-05-03 (full): `applyLockedFlags` stamps `locked: true` correctly on specified Sound slots; after a recipe application, the session's designated layers have `locked: true` — confirmed by unit and integration tests.
- A-05-04 (full): `locked` field persists and round-trips via `SavedRhythmLayerSchema`; pre-Phase-05 sessions (no `locked` field) continue to load — confirmed by persistence tests.
- A-05-05 (full): `recipeToAgentOutput` reads `recipe.layers` for sound assignment when present; backward compatibility with `layers`-less recipes confirmed — confirmed by propagation tests.
- A-05-06 (full): All catalog invariants pass for any new entries; seam grep returns zero genre-name matches outside `src/core/music-knowledge/` — confirmed by catalog tests and seam grep.
- A-05-07 (full): `cueca-chilena-folk` recipe produces three locked layers (`bd`, `cp`, `hh`) with correct patterns; `cumbia-latina-groove` recipe produces two locked layers (`bd`, `hh`) with correct sampleMap entries — confirmed by propagation and integration tests.
- A-05-08 (full): `SYSTEM_PROMPT_EVOLUTION` includes a locked-layer rule; stateSnapshot includes `locked` field per layer — confirmed by code review (static) and `tsc --noEmit`.
- A-05-09 (full): `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1720 + all new tests; `pnpm build` succeeds — confirmed by quality gate output.

**Validation:** all gate commands + seam grep recorded in the handoff with output.

**CHECKPOINT → Commit message:**
`chore(authentic-groove): Phase 05 step 05.5 — end-to-end tests + seam check + quality gate`

---

## Phase Acceptance

| ID | Description | Validation method |
|---|---|---|
| A-05-01 | `RhythmLayer.locked?: boolean` field exists in the interface and in `SavedRhythmLayerSchema`; the codegen (`rhythmLayerToStrudelLine`) ignores it (no behavioral change on codegen) | unit: type-check + `tsc --noEmit`; persistence tests |
| A-05-02 | `applyRhythmSpec` preserves locked layers when called by the agent (no active recipe application): proposed layers targeting the same sound as a locked layer are skipped; locked layers not targeted are retained | unit: `lock-preservation.test.ts`; integration: propagation tests |
| A-05-03 | `applyLockedFlags(lockedSounds)` stamps `locked: true` on the specified Sound slots in the current session layers; calling it after `applyRhythmSpec` in the recipe path marks the recipe's cultural signature layers | unit: `lock-preservation.test.ts` |
| A-05-04 | `locked` field round-trips through `serializeSession` → `SavedSessionSchema.safeParse` → `deserializeSession`; pre-Phase-05 sessions without `locked` continue to load (`SESSION_SCHEMA_VERSION` stays 5) | unit: persistence roundtrip tests |
| A-05-05 | `recipeToAgentOutput` reads `recipe.layers[i].sound` for sound assignment when `recipe.layers` is present; recipes without `layers` use index-based sound assignment (backward-compatible) | unit: propagation tests + `lock-preservation.test.ts` |
| A-05-06 | Any new rhythm-catalog entries added for cueca (palmas, hh) or cumbia (shaker/guache) satisfy all 5 catalog invariants; seam grep returns zero genre-name matches in `src/` outside `src/core/music-knowledge/` | unit: catalog invariant tests; live-system: seam grep recorded in handoff |
| A-05-07 | `cueca-chilena-folk` recipe declares three locked layers (`bd`=cueca-base, `cp`=palmas, `hh`=subdivision) each with `locked: true`; `cumbia-latina-groove` recipe declares two locked layers (`bd`=cumbia-caja, `hh`=shaker-or-guacharaca) each with `locked: true`; both recipes emit the correct sample names in codegen output | unit: sample-map tests + propagation tests; integration: end-to-end propagation |
| A-05-08 | `SYSTEM_PROMPT_EVOLUTION` contains the locked-layer rule; `stateSnapshot` in `sendEvolution()` includes `locked` per layer | live-system: code review + `tsc --noEmit` |
| A-05-09 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1720 + all new tests; `pnpm build` succeeds | live-system: quality gate output recorded in handoff |

---

## Partial coverage from prior phase

All Phase 04 acceptance criteria (A-04-01 through A-04-06) reached FULL at step 04.5. No partials carried forward.

The following items were deferred in Phase 04 and are addressed here:
- Dimension 4 (role-based polyrhythmic layering) → addressed by A-05-07 (multi-layer cueca and cumbia recipes with locked layers).

The following items remain deferred (unchanged from Phase 04):
- Dimension 2 (per-hit accent/velocity variation) — deferred per initiative scope.
- Dimension 3 (swing/groove feel) — deferred per initiative scope.
- 12-step grid UI support (cueca 12/8 display) — deferred per phase scope boundary (the grid is 16-step; cueca layers use euclid/struct with n≤16, so codegen works correctly but the UI shows 16 dots, not 12).
- Pandeiro one-shots — no good CC0 source found; `'hand'` from Phase 03 is the best available.
- Guacharaca/scraper — no CC0 source found (confirmed Phase 04); §1 of this phase re-checks.
- Pentagrama `NoteSlot` free placement — carried from orbifold-v2 Ph10.
- Per-chord `lpf`/`lpq` slider D-3 — carried from harmonic-rhythm-improvements.

---

## ADR Triggers

No new ADR is anticipated if the lock mechanism follows the Option B design specified in §5 of the inventory. The `applyLockedFlags` helper is generic plumbing; `MusicalRecipe.layers` is a knowledge-layer extension. Both are within the boundaries of ADR 0025 (seam definition) and the existing architecture.

An ADR would be required if:
- The Pilot decides that `locked` should flow through `AgentOutputSchema` (option that would break OD-1 from ADR 0025) — surface as a blocker immediately.
- The shaker FreePats finding requires adding a fourth CC0 sample name beyond the three registered in Phase 04 — this is an additive palette extension explicitly permitted by ADR 0025 D-Deferred ("Future phases may add `samples()` calls") and does NOT require a new ADR.

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/authentic-groove/handoffs/phase-05-handoff.md`. See `handoff-template.md`.
