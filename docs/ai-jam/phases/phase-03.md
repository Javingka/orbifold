<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 03 — Recipe→Agent Wiring: Schema v6, Recipe Engine, and Prompt Update

**Purpose:** Wire the Phase 02 music-knowledge layer into the agent by adding a `musicalIntent` field to `AgentOutputSchema` (schema v6), creating a pure `recipeToAgentOutput` engine that translates a `MusicalRecipe` into an `AgentOutput`, and updating `SYSTEM_PROMPT_EVOLUTION` so the LLM can invoke recipes by id.
**Gate:** ai-jam Phase 02 merged to `main` (music-knowledge catalog: 31 rhythms, 10 harmonies, 10 recipes, query module; 1320/1320 tests passing); no open ai-jam blockers.
**Expected phase result:** `src/core/music-knowledge/recipe-engine.ts` exists with a pure `recipeToAgentOutput` function (OD-1 downsample + OD-2 step-resolution handled); `AgentOutputSchema` is extended to v6 with an optional `musicalIntent` field; `SYSTEM_PROMPT_EVOLUTION` instructs the LLM on recipe selection; all quality gates pass; no pre-existing behavior is broken.

---

## Step 03.1 — Inventory

PROMPT → Read the source-of-truth files listed below and produce `docs/ai-jam/inventories/phase-03-inventory.md`, then STOP for Pilot review. Do NOT write any source file or test file in this step.

Source-of-truth files to read (all of them, fully):
- `src/agent/schema.ts` — current `AgentOutputSchema` v5 shape, `SCHEMA_VERSION`, `superRefine` guard
- `src/agent/agent.ts` — `SYSTEM_PROMPT`, `SYSTEM_PROMPT_EVOLUTION`, `sendEvolution()`, `tryParseSkill()`
- `src/agent/apply.ts` — `applyRhythmSpec`, `applyHarmonySpec` signatures and session-store contract
- `src/core/music-knowledge/query.ts` — `findRecipesForPrompt`, `getRhythmById`, `getHarmonyById`, `getRecipeById`
- `src/core/music-knowledge/rhythm-harmony-recipes.ts` — `MusicalRecipe` interface, `RHYTHM_HARMONY_RECIPES` entries
- `src/core/music-knowledge/rhythm-catalog.ts` — `RhythmEntry`, `RHYTHM_CATALOG` entries; `strudelStrategy` values; step counts present
- `src/core/music-knowledge/harmony-catalog.ts` — `HarmonyEntry`, `HARMONY_CATALOG` entries; `CatalogChord.quality` (17-member vocabulary)

Implementation requirements:
- Document the **current `AgentOutputSchema` v5 shape**: which fields are present, the `superRefine` guard (at least one of `rhythm`, `harmony`, `saveAsBlock`), and what a v6 extension must preserve for backward compatibility.
- Document the **`MusicalIntentSchema` candidate shape**: at minimum the fields `style?: string`, `cultureTags?: string[]`, `mood?: string`, `complexity?: 'simple' | 'medium' | 'dense'`, `meter?: string`, `bpmHint?: number`, `recipeId?: string`, `explanation?: string`. The inventory must confirm which fields are already expressible from catalog data (to keep the schema grounded) and which are free-text annotations.
- Document the **recipe→schema expressibility classification** for the 10 `RHYTHM_HARMONY_RECIPES` entries, using the OD-2 `strudelStrategy` marker and step count from each `RhythmEntry`. Classify each as:
  - **`euclid-expressible`** — `strudelStrategy: 'euclid'` and `n ≤ 16`; emitted as `AgentOutput.rhythm.layers[].euclid {k,n,rot}`.
  - **`steps16-expressible`** — `strudelStrategy: 'struct'` and `steps === 16`; emitted as `AgentOutput.rhythm.layers[].steps[16]`.
  - **`non-expressible`** — any other combination (e.g., `strudelStrategy: 'struct'` and `steps !== 16`, or `strudelStrategy: 'euclid'` with `n > 16`).
- Surface open decision **OD-3: non-expressible rhythm layers in the recipe engine**. The inventory must document it with exactly two options and the Pilot must resolve it before step 03.3 begins:
  - **Option A — Silent skip:** `recipeToAgentOutput` silently omits non-expressible rhythm layers. The result may have fewer layers than the recipe specifies; the output is still a valid `AgentOutput` as long as at least one layer is emitted. Simplest; no schema change needed. Risk: recipes with only non-expressible layers produce an output with no rhythm.
  - **Option B — Recipe restriction:** Only recipes whose every `rhythmIds` entry is euclid-expressible or steps16-expressible are passed to `recipeToAgentOutput`; others are filtered out upstream in `sendEvolution()`. Non-expressible recipes are valid catalog entries but are not used in the recipe engine path. Consistent guarantee; still no schema change.
  - The inventory must count how many of the 10 recipes are fully expressible (every rhythmId maps to euclid-expressible or steps16-expressible) and how many have at least one non-expressible layer.
- Document the **downsample map** that `recipeToAgentOutput` must apply (OD-1): every `HarmonyQuality` value in the 17-member catalog vocabulary must reduce to one of `maj | min | dim | aug` (the 4-member `SK_QUAL` in `AgentOutputSchema`). Confirm the mapping is total (all 17 covered). This map lives in `recipe-engine.ts`, not in tests only.
- Document the **`superRefine` guard update required** for schema v6: the guard must additionally accept a response that contains only `musicalIntent` (no `rhythm`, no `harmony`, no `saveAsBlock`) — since the LLM may return a recipe id without also returning explicit rhythm/harmony fields.
- Confirm placement: `src/core/music-knowledge/recipe-engine.ts` (pure engine — no DOM/PIXI/Svelte imports; no imports from `src/agent/` or `src/state/`; imports from `src/agent/schema.ts` types only via type-only import); tests under `tests/music-knowledge/`.
- Confirm that the existing `tryParseSkill` path and `send()` path are **unaffected** by the schema v6 extension (backward-compatible: existing `rhythm`/`harmony`-only responses parse unchanged through the new schema).

Validation:
- The inventory file exists and covers all seven sections above.
- No source files modified.

Expected result:
- A reviewable inventory; OD-3 documented with options and counts; no source files created. Pilot review and OD-3 resolution are mandatory before step 03.2.

CHECKPOINT → Commit message:
`docs(ai-jam): Phase 03 step 03.1 — recipe-engine inventory`

---

## Step 03.2 — Schema v6: `MusicalIntentSchema` + `SCHEMA_VERSION` bump + ADR

PROMPT → Read `src/agent/schema.ts` (full), the phase-03 inventory, `docs/ai-jam/decisions.md`, and ADRs 0021 and 0022. Then: (1) open `docs/adr/0023-musical-intent-schema.md` (the ADR for this schema change), (2) extend `src/agent/schema.ts` to v6 with `MusicalIntentSchema` and `musicalIntent?` on `AgentOutputSchema`, (3) update the `superRefine` guard, (4) bump `SCHEMA_VERSION` to 6, (5) add schema-level tests.

Implementation requirements:
- **ADR first**: before any source change, write `docs/adr/0023-musical-intent-schema.md`. It must record: schema v6 shape (field-by-field with types and optionality), the `superRefine` guard update (now accepts `musicalIntent`-only responses), backward-compatibility guarantee (existing `rhythm`/`harmony`/`saveAsBlock`-only responses parse unchanged), and the byte-identical guarantee (existing responses without `musicalIntent` are unaffected). ADR status: `Accepted`.
- **`MusicalIntentSchema`** (Zod, in `src/agent/schema.ts`):
  - `style?: z.string().optional()` — free-text style label (e.g., "afro-cuban", "dorian modal").
  - `cultureTags?: z.array(z.string()).optional()` — cultural or tradition tags.
  - `mood?: z.string().optional()` — emotional/expressive label.
  - `complexity?: z.enum(['simple', 'medium', 'dense']).optional()` — matches `MusicalRecipe.density` vocabulary.
  - `meter?: z.string().optional()` — time signature hint (e.g., "4/4", "12/8").
  - `bpmHint?: z.number().min(40).max(240).optional()` — BPM suggestion.
  - `recipeId?: z.string().optional()` — must be a known recipe id when present (see superRefine note below — validation against the catalog at parse time is NOT required; the recipe engine validates at call time).
  - `explanation?: z.string().max(300).optional()` — brief human-readable note about why this intent was chosen.
  - All fields optional; the whole `MusicalIntentSchema` object is optional on `AgentOutputSchema`.
- **Updated `superRefine` guard** on `AgentOutputSchema`: the guard must now accept at least one of `rhythm`, `harmony`, `saveAsBlock`, or `musicalIntent`. Responses with only `musicalIntent` are valid (the engine resolves the recipe to rhythm/harmony; if the LLM also supplies explicit rhythm/harmony, both are applied — explicit fields take precedence).
- **`SCHEMA_VERSION`** bumps from 5 to 6. Add a JSDoc annotation line to the version comment in `schema.ts` following the established pattern (see prior bump comments at lines 12–24).
- Export `MusicalIntentSchema`, `MusicalIntent` (inferred type), and updated `AgentOutput` (already inferred from `AgentOutputSchema` — the existing `AgentOutput` export gains the new field automatically).
- **Tests** in `tests/agent-schema.test.ts` (extend the existing file, do not create a duplicate):
  - Backward-compat: an existing v5 response with only `rhythm` or only `harmony` or only `saveAsBlock` still parses successfully through the new v6 schema — assert `success === true` and that `musicalIntent` is `undefined`.
  - New field: a response with `musicalIntent: { recipeId: "bossa-nova-groove", style: "bossa nova", complexity: "medium" }` and no `rhythm`/`harmony`/`saveAsBlock` parses successfully (`success === true`).
  - New field: a response with `musicalIntent: { recipeId: "...", explanation: "..." }` combined with `rhythm` parses successfully.
  - Guard: a response with none of `rhythm`, `harmony`, `saveAsBlock`, `musicalIntent` fails parsing (`success === false`).
  - `SCHEMA_VERSION === 6` assertion.
  - All `musicalIntent` sub-fields validated: `complexity` rejects an invalid enum value; `bpmHint` rejects values outside [40, 240]; `explanation` rejects strings over 300 chars.

Validation:
- `pnpm exec vitest run agent-schema`
- `pnpm exec tsc --noEmit`

Expected result:
- `AgentOutputSchema` is at v6; `MusicalIntentSchema` exported; backward-compatible; ADR 0023 committed alongside the source change; existing tests unbroken.

CHECKPOINT → Commit message:
`feat(agent): Phase 03 step 03.2 — schema v6 MusicalIntent + ADR 0023`

---

## Step 03.3 — Recipe→State engine + tests

PROMPT → Read `src/agent/schema.ts` (full, v6), `src/core/music-knowledge/rhythm-catalog.ts`, `src/core/music-knowledge/harmony-catalog.ts`, `src/core/music-knowledge/rhythm-harmony-recipes.ts`, `src/core/music-knowledge/query.ts`, `docs/ai-jam/decisions.md` (OD-1, OD-2, OD-3 — confirmed resolved by Pilot at inventory), and the phase-03 inventory. Then create `src/core/music-knowledge/recipe-engine.ts` and `tests/music-knowledge/recipe-engine.test.ts`.

Implementation requirements:
- **`recipeToAgentOutput(recipe, options?)`** — pure function in `src/core/music-knowledge/recipe-engine.ts`:
  - Signature: `recipeToAgentOutput(recipe: MusicalRecipe, options?: RecipeEngineOptions): AgentOutput | null`
  - `RecipeEngineOptions`: `{ layerSound?: string }` (optional override for the rhythm layer sound; defaults to `'bd'` for the first layer, `'hh'` for subsequent layers if catalog entry has no sound hint — see note below).
  - Returns `null` if the recipe produces no valid rhythm layers (all layers non-expressible and Option A was chosen) or if `getRecipeById(recipe.id)` / catalog lookups fail.
  - **Rhythm translation** (OD-2): For each `rhythmId` in `recipe.rhythmIds`, call `getRhythmById(rhythmId)`:
    - If `strudelStrategy === 'euclid'` and `euclid.n ≤ 16`: emit as `{ sound, euclid: { k, n, rot } }` (euclid-expressible path). Use the entry's `euclid` params directly.
    - If `strudelStrategy === 'struct'` and `steps === 16`: emit as `{ sound, steps: binary.split('').map(Number) }` (steps16-expressible path). The `binary` string in the catalog entry is the 16-char source; `split('').map(Number)` produces the required `number[]` of length 16.
    - Otherwise (non-expressible): apply OD-3 resolution (whichever option the Pilot chose at inventory). The inventory documents the counts and the Pilot's choice is the binding decision for this step.
  - **Sound assignment**: the `RhythmEntry` does not include a sound field (it is a pure pattern catalog, not a drum-machine assignment). For now, assign sounds by layer index: index 0 → `'bd'`, index 1 → `'hh'`, index 2 → `'sd'`, index 3 → `'oh'`, index 4 → `'cp'`, index 5 → `'rim'`. The caller can override via `options.layerSound` for single-layer recipes.
  - **Harmony translation** (OD-1): Call `getHarmonyById(recipe.harmonyId)` to get the `HarmonyEntry`. Build `HarmonySpec`:
    - `root`: `harmony.modeCenter` (already a `NOTE_NAMES`-valid string).
    - `mode`: derive from `harmony.chordMode` and `harmony.modeCenter`. Since the catalog `HarmonyEntry` does not carry a `mode` field, use `'minor'` as a safe default (most catalog entries are modal/minor-leaning). The inventory must confirm whether the catalog entries carry enough information to derive a more precise mode; if not, `'minor'` default is acceptable and documented.
    - `octave`: use `3` as a safe default (mid-range).
    - `progression`: map each `CatalogChord` to a `HarmonyChordCore`:
      - `root`: chord.root (already a note name string).
      - `quality`: apply the OD-1 downsample map (17→4). The map must be embedded as a `const` in `recipe-engine.ts` (not in tests only, unlike the test-only table in Phase 02 step 02.3). Every `HarmonyQuality` member must have an entry.
      - `bars`: chord.bars (already a multiple of 0.25).
      - `gain`: use `0.7` as a default (not present in `CatalogChord`).
  - **Result**: return a valid `AgentOutput` (confirmed by `AgentOutputSchema.safeParse` internally — the engine must call `safeParse` and return `null` on failure as a defensive guard, not panic). The returned object must pass `AgentOutputSchema.safeParse` without the `musicalIntent` field (the caller may add it if needed; the engine's job is to produce the rhythm/harmony payload).
  - **Purity**: zero DOM/PIXI/Svelte imports; no imports from `src/agent/` or `src/state/`; may import `AgentOutputSchema`, `AgentOutput`, `HarmonySpec`, `RhythmSpec` from `src/agent/schema.ts` as **type-only imports** (`import type { ... }`) plus the runtime Zod schema import for the internal `safeParse` guard. Import `getRhythmById`, `getHarmonyById` from `./query.js`; import `MusicalRecipe` type from `./rhythm-harmony-recipes.js`.
- **`getExpressibleRecipes(): MusicalRecipe[]`** — helper exported from `recipe-engine.ts`. Returns all recipes from `RHYTHM_HARMONY_RECIPES` whose every `rhythmId` is euclid-expressible or steps16-expressible (i.e., can be translated without loss by `recipeToAgentOutput`). Used in step 03.4 to filter recipes presented to the LLM.
- **Tests** in `tests/music-knowledge/recipe-engine.test.ts`:
  - Round-trip: for every expressible recipe (as returned by `getExpressibleRecipes()`), call `recipeToAgentOutput(recipe)` and assert the result passes `AgentOutputSchema.safeParse` (`success === true`).
  - OD-1 downsample: for each `HarmonyQuality` value in `HARMONY_QUALITIES` that maps to a triad, assert the downsample map in `recipe-engine.ts` produces a value in `SK_QUAL` (`maj | min | dim | aug`).
  - OD-2 euclid: for a known euclid-expressible recipe entry, assert the output layer uses `euclid: {k, n, rot}` with values matching the `RhythmEntry`.
  - OD-2 steps16: for a known steps16-expressible recipe entry, assert the output layer uses `steps` of length 16 matching the `binary` field in `RhythmEntry`.
  - Null return: `recipeToAgentOutput` called with a fabricated recipe whose rhythmIds are all non-expressible returns `null` (only applicable under Option A) or returns a valid output skipping no layers (only applicable under Option B where non-expressible recipes are never passed in). The test mirrors whichever OD-3 option was chosen.
  - `getExpressibleRecipes()` returns a non-empty array whose length is ≤ 10 (total catalog count); every returned recipe id resolves in `RHYTHM_HARMONY_RECIPES`.

Validation:
- `pnpm exec vitest run music-knowledge/recipe-engine`
- `pnpm exec tsc --noEmit`

Expected result:
- Pure `recipeToAgentOutput` engine; OD-1 downsample map embedded in source; OD-2 translation paths tested; round-trip passes `AgentOutputSchema.safeParse` for every expressible recipe.

CHECKPOINT → Commit message:
`feat(music-knowledge): Phase 03 step 03.3 — recipe-engine recipeToAgentOutput`

---

## Step 03.4 — SYSTEM_PROMPT_EVOLUTION update + `sendEvolution` wiring + tests

PROMPT → Read `src/agent/agent.ts` (full), `src/agent/schema.ts` (v6), `src/core/music-knowledge/recipe-engine.ts` (from step 03.3), `src/core/music-knowledge/query.ts`, `docs/ai-jam/decisions.md`, and ADRs 0021 and 0022. Then update `SYSTEM_PROMPT_EVOLUTION` and `sendEvolution()` in `src/agent/agent.ts` to wire the recipe-engine path.

Implementation requirements:
- **`SYSTEM_PROMPT_EVOLUTION` update** (per ADR 0021 D5 pattern):
  - Add a new capability section describing `musicalIntent` and `recipeId`. The added text must cover:
    1. The `musicalIntent` optional field and when to use it: when the current state fits a known musical recipe, include `musicalIntent.recipeId` set to one of the provided recipe ids.
    2. The sub-fields of `musicalIntent`: `recipeId` (a known id from the list provided at call time), `style` (free-text), `complexity` (one of `simple`, `medium`, `dense`), `explanation` (brief note).
    3. Explicit instruction: `musicalIntent` does NOT replace `rhythm`/`harmony` — either include both (explicit evolution + intent annotation) or include only `musicalIntent.recipeId` and let the engine resolve it.
    4. Explicit instruction: `saveAsBlock` must still NOT appear.
    5. At least **two concrete JSON examples** following ADR 0021 D5 requirement:
       - Example 1: response with only `musicalIntent.recipeId` (no explicit `rhythm`/`harmony`).
       - Example 2: response with both `rhythm`/`harmony` fields and `musicalIntent` as an annotation.
  - The recipe id list injected into each call must be the expressible recipe ids from `getExpressibleRecipes()` (computed once at call time, not hardcoded in the prompt string itself). Inject into the user-message portion of the `sendEvolution()` call — not into `SYSTEM_PROMPT_EVOLUTION` itself (the prompt is a static string; the recipe list is dynamic context).
  - Prompt language: Spanish, per ADR 0017 D7.
- **`sendEvolution()` wiring** in `src/agent/agent.ts`:
  - After `tryParseSkill(txt)` succeeds and the result has `skill.musicalIntent?.recipeId`, call `recipeToAgentOutput(getRecipeById(skill.musicalIntent.recipeId))` from `src/core/music-knowledge/recipe-engine.ts` / `query.ts`.
  - If `recipeToAgentOutput` returns a non-null `AgentOutput`:
    - Apply its rhythm (if present) via `applyRhythmSpec`, UNLESS `skill.rhythm` is also present (explicit field takes precedence).
    - Apply its harmony (if present) via `applyHarmonySpec`, UNLESS `skill.harmony` is also present.
  - If the recipe id is not found (`getRecipeById` returns `undefined`) or `recipeToAgentOutput` returns `null`: skip silently (no throw, no log — consistent with Phase 01 evolution error handling).
  - **`sendEvolution()` must NOT push to `chatHistory` and must NOT call `applyBlockSave`** (ADR 0022 D3/D4 — unchanged).
  - Import `recipeToAgentOutput`, `getExpressibleRecipes` from `'../core/music-knowledge/recipe-engine.js'` and `getRecipeById` from `'../core/music-knowledge/query.js'`. These are dynamic imports only if needed for Node-testability (assess in inventory: if `recipe-engine.ts` has no DOM/audio imports, a static import is fine).
  - Inject expressible recipe ids into the user message in `sendEvolution()`: append the list to the `userMessage` JSON as a top-level annotation key `"availableRecipes"` (array of recipe id strings). This gives the LLM context for which ids are valid without polluting the state snapshot.
- **Tests** (extend `tests/autopilot.test.ts` or add `tests/sendEvolution.test.ts` — choose whichever keeps the test file cohesive):
  - Mock `tryParseSkill` to return a `skill` with `musicalIntent: { recipeId: 'bossa-nova-groove' }` and no `rhythm`/`harmony`; assert that `applyRhythmSpec` and `applyHarmonySpec` are called with the engine-produced values (or a mock verifying the call chain).
  - Mock `tryParseSkill` to return a `skill` with both `rhythm` and `musicalIntent.recipeId`; assert explicit `rhythm` is applied and the recipe rhythm is NOT applied (explicit takes precedence).
  - `sendEvolution()` with a `musicalIntent.recipeId` that does not exist in the catalog: assert neither `applyRhythmSpec` nor `applyHarmonySpec` is called from the recipe path (graceful no-op).
  - `sendEvolution()` still never pushes to `chatHistory` (existing test coverage; confirm it still passes).
- Run **full quality gate** at the end of this step:
  - `pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build`

Validation:
- `pnpm exec vitest run sendEvolution` (or `autopilot`)
- `pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build`

Expected result:
- `sendEvolution()` can interpret `musicalIntent.recipeId` from LLM responses; the prompt guides the LLM; all quality gates pass; `chatHistory` non-mutation confirmed; existing Phase 01–02 behavior unchanged.

CHECKPOINT → Commit message:
`feat(agent): Phase 03 step 03.4 — sendEvolution recipe wiring + SYSTEM_PROMPT_EVOLUTION`

---

## Phase Acceptance

Each criterion has a unique ID (used in handoff Acceptance Coverage Tables):

- **A-03-01** — `AgentOutputSchema` v6 accepts an agent response containing only `musicalIntent` (no `rhythm`, `harmony`, or `saveAsBlock`) and correctly rejects a response with none of the four fields.
  - Validation method: `unit`
- **A-03-02** — An existing v5-compatible response (with only `rhythm` or only `harmony` or only `saveAsBlock`) passes `AgentOutputSchema.safeParse` at v6 unchanged; `musicalIntent` is `undefined` in the parsed output.
  - Validation method: `unit`
- **A-03-03** — `SCHEMA_VERSION === 6` after the schema extension.
  - Validation method: `unit`
- **A-03-04** — `recipeToAgentOutput(recipe)` returns a valid `AgentOutput` (passes `AgentOutputSchema.safeParse`) for every expressible recipe in `RHYTHM_HARMONY_RECIPES`; the harmony progression uses only `quality ∈ {maj, min, dim, aug}` (OD-1 downsample applied).
  - Validation method: `unit`
- **A-03-05** — `recipeToAgentOutput` correctly emits euclid-expressible rhythm layers as `{ euclid: {k,n,rot} }` and steps16-expressible layers as `{ steps: number[16] }`, matching the source catalog entry.
  - Validation method: `unit`
- **A-03-06** — `SYSTEM_PROMPT_EVOLUTION` contains the `musicalIntent` capability section (trigger phrases + two concrete JSON examples) per ADR 0021 D5; the section explicitly forbids `saveAsBlock`.
  - Validation method: `proxy:static-analysis` (string content inspection in the test)
- **A-03-07** — When `sendEvolution()` receives a parsed skill with `musicalIntent.recipeId` and no explicit `rhythm`/`harmony`, the recipe engine's output is applied via `applyRhythmSpec`/`applyHarmonySpec`; when both are present, the explicit fields take precedence.
  - Validation method: `unit`
- **A-03-08** — `sendEvolution()` never pushes to `chatHistory` and never calls `applyBlockSave`, including when `musicalIntent` is present.
  - Validation method: `unit`
- **A-03-09** — Byte-identical guarantee: `tsc --noEmit`, `pnpm lint`, `pnpm test`, and `pnpm build` all pass clean; no pre-existing behavior broken.
  - Validation method: `live-system` (full command output in handoff)

## Partial coverage from prior phase

No prior partials to address. Phase 02's A-02-06 (PARTIAL in steps 02.2–02.4) and A-02-07 (PARTIAL in steps 02.2–02.4) were both fully COVERED in step 02.5, confirmed in the phase-02 handoff coverage summary.

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **Schema v6 / `MusicalIntentSchema`** — Trigger: step 03.2 (before any source change). File as `docs/adr/0023-musical-intent-schema.md`. Records: field-by-field v6 shape, `superRefine` guard relaxation (now accepts `musicalIntent`-only), backward-compatibility guarantee, OD-3 resolution reference, and byte-identical guarantee for existing responses.
- **OD-3 resolution (non-expressible rhythm layers)** — Resolved at step 03.1 inventory by Pilot. The chosen option (A or B) is binding for step 03.3 and is referenced in ADR 0023. No separate ADR is needed if the Pilot resolution is recorded in `decisions.md` and cited in ADR 0023.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/ai-jam/handoffs/phase-03-handoff.md`. See `handoff-template.md`.
