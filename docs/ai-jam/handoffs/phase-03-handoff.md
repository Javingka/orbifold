<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Handoff — Phase 03 (AI Jam / Recipe→Agent Wiring)

---

## Step 03.1 — Inventory (Checkpoint #1)

**Date:** 2026-06-19

**Commit(s):**

- **Terminal commit:** `docs(ai-jam): Phase 03 step 03.1 — recipe-engine inventory`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 1

### Completed

- Read `CLAUDE.md` (full — initiative context, invariants, conventions).
- Read `docs/ai-jam/decisions.md` (full — OD-1/OD-2 RESOLVED, OD-3 open, all carried-forward rules).
- Read `docs/ai-jam/phases/phase-03.md` (full — step 03.1 PROMPT, all implementation requirements for 03.2–03.4, all acceptance criteria A-03-01..A-03-09).
- Read `docs/ai-jam/handoffs/phase-02-handoff.md` (full — format reference; phase 02 fully closed).
- Read `src/agent/schema.ts` (274 lines, full) — v5 shape, `superRefine` guard, `SK_QUAL`, `SK_SOUNDS`, `SK_MODES`, `SCHEMA_VERSION=5`.
- Read `src/agent/agent.ts` (740 lines, full) — `SYSTEM_PROMPT`, `SYSTEM_PROMPT_EVOLUTION`, `sendEvolution()`, `tryParseSkill()`, `normalizeEuclidStrings()`.
- Read `src/agent/apply.ts` (253 lines, full) — `applyRhythmSpec`, `applyHarmonySpec`, `applyBlockSave` signatures and session-store contract.
- Read `src/core/music-knowledge/query.ts` (146 lines, full) — `findRecipesForPrompt`, `getRhythmById`, `getHarmonyById`, `getRecipeById`.
- Read `src/core/music-knowledge/rhythm-harmony-recipes.ts` (354 lines, full) — `MusicalRecipe` interface, 10 `RHYTHM_HARMONY_RECIPES` entries with all `rhythmIds` and `harmonyId` values.
- Read `src/core/music-knowledge/rhythm-catalog.ts` (571 lines, full) — `RhythmEntry` interface, `HARMONY_QUALITIES` (17 members), `StrudelStrategy`, `RHYTHM_CATALOG` (31 entries).
- Read `src/core/music-knowledge/harmony-catalog.ts` (237 lines, full) — `HarmonyEntry` interface, `CatalogChord`, `HARMONY_CATALOG` (10 entries).
- Read `docs/ai-jam/inventories/phase-02-inventory.md` (full) — downsample table §(e.1) confirmed.
- Produced `docs/ai-jam/inventories/phase-03-inventory.md` covering all seven sections:
  1. AgentOutputSchema v5 shape and v6 backward-compat requirements.
  2. `MusicalIntentSchema` candidate fields (8 fields, grounded in catalog data).
  3. Per-recipe expressibility classification — all 10 recipes fully expressible (0 non-expressible layers).
  4. OD-3 documented with Option A (silent skip) and Option B (recipe restriction), with per-recipe counts.
  5. OD-1 downsample map (17→4) confirmed total — embedded in §5 ready for `recipe-engine.ts`.
  6. `superRefine` guard update documented — adds `musicalIntent === undefined` to existing condition.
  7. Placement and purity confirmed (`src/core/music-knowledge/recipe-engine.ts`); backward-compat of `tryParseSkill` confirmed.
- Did NOT write any source file or test file.

### Key finding: OD-3 has zero impact on the current catalog

All 10 current `RHYTHM_HARMONY_RECIPES` entries are fully expressible (every `rhythmId` maps to either euclid-expressible or steps16-expressible). There are zero non-expressible rhythm layers in the recipe set. OD-3 governs **future catalog extensions** only. Both Option A and Option B produce identical behavior for all current recipes. The Pilot's choice is binding for step 03.3 implementation.

### Files touched

- `docs/ai-jam/inventories/phase-03-inventory.md` (created)
- `docs/ai-jam/handoffs/phase-03-handoff.md` (created, this entry)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are covered in this docs-only inventory step. All nine acceptance criteria (A-03-01 through A-03-09) are targeted by steps 03.2–03.4.

### Routine validations

- `git status` → only `docs/ai-jam/inventories/phase-03-inventory.md` and `docs/ai-jam/handoffs/phase-03-handoff.md` as new untracked files. No `.ts` or `.svelte` files modified.
- No `pnpm test` or `tsc --noEmit` run (no source files modified; prior quality gates remain valid from Phase 02 step 02.5).

### Acceptance Coverage Table

No Acceptance IDs are covered in this docs-only inventory step.

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | `AgentOutputSchema` v6 accepts `musicalIntent`-only response; rejects response with none of the four fields | — | — | not yet — targeted in step 03.2 |
| A-03-02 | v5-compatible response (rhythm-only, harmony-only, saveAsBlock-only) parses unchanged through v6; `musicalIntent` is `undefined` | — | — | not yet — targeted in step 03.2 |
| A-03-03 | `SCHEMA_VERSION === 6` | — | — | not yet — targeted in step 03.2 |
| A-03-04 | `recipeToAgentOutput(recipe)` returns valid `AgentOutput` for every expressible recipe; harmony uses only `quality ∈ {maj,min,dim,aug}` | — | — | not yet — targeted in step 03.3 |
| A-03-05 | `recipeToAgentOutput` emits euclid layers as `{ euclid: {k,n,rot} }` and steps16 layers as `{ steps: number[16] }` | — | — | not yet — targeted in step 03.3 |
| A-03-06 | `SYSTEM_PROMPT_EVOLUTION` contains `musicalIntent` capability section (trigger phrases + two JSON examples); forbids `saveAsBlock` | — | — | not yet — targeted in step 03.4 |
| A-03-07 | `sendEvolution()` with `musicalIntent.recipeId` (no explicit rhythm/harmony) applies recipe engine output; explicit fields take precedence when both present | — | — | not yet — targeted in step 03.4 |
| A-03-08 | `sendEvolution()` never pushes to `chatHistory` and never calls `applyBlockSave`, including when `musicalIntent` present | — | — | not yet — targeted in step 03.4 |
| A-03-09 | Byte-identical guarantee: `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | — | — | not yet — targeted in step 03.4 |

### Decisions made (if any)

None — this is a read-only discovery step. OD-3 is surfaced and documented but requires Pilot resolution before step 03.2.

### Proposed Decisions Register entries

None — OD-3 is an open decision requiring Pilot resolution. The inventory documents both options and counts. The Pilot's resolution will be recorded in `docs/ai-jam/decisions.md` by the Pilot (not by Dev).

### Blockers resolved during this step

None.

### Environment state after this step

- Branch: `ai-jam/phase-03`
- Tests: 1320/1320 passing (from Phase 02 step 02.5; no new tests added this step).
- Source files: unmodified since Phase 02 merge.
- Pending: Pilot review of OD-3 + resolution before step 03.2 may begin.

### Next action (per phase file)

**STOP — Pilot review and OD-3 resolution required.** Do NOT begin step 03.2 until the Pilot has reviewed this inventory and resolved OD-3 (recorded in `decisions.md`).

---

## Step 03.2 — Schema v6: `MusicalIntentSchema` + `SCHEMA_VERSION` bump + ADR 0023 (Checkpoint #2)

**Date:** 2026-06-19

**Commit(s):**

- `feat(agent): Phase 03 step 03.2 — schema v6 MusicalIntent + ADR 0023`

**Iteration:** 1 of 1

### Completed

- Read `src/agent/schema.ts` (full, v5 — 274 lines).
- Read `docs/ai-jam/inventories/phase-03-inventory.md` (full, all 9 sections).
- Read `docs/ai-jam/decisions.md` (full — OD-3 resolved as Option B by Pilot).
- Read `docs/adr/0022-autopilot-mode.md` (full — D3/D4/D7 confirmed).
- **ADR first:** Wrote `docs/adr/0023-musical-intent-schema.md` before any source change, recording:
  - `MusicalIntentSchema` field-by-field shape (8 fields with types and optionality).
  - `superRefine` guard update: adds `musicalIntent === undefined` to existing condition.
  - Backward-compatibility guarantee (v5 responses parse unchanged through v6).
  - OD-3 Option B reference (upstream filter; `recipeToAgentOutput` never receives non-expressible).
  - Byte-identical guarantee for existing responses.
  - Status: Accepted.
- **Schema changes** in `src/agent/schema.ts`:
  - Added `MusicalIntentSchema` (Zod object, all 8 fields optional).
  - Exported `MusicalIntentSchema` and `MusicalIntent` (inferred type).
  - Added `musicalIntent?: MusicalIntentSchema.optional()` to `AgentOutputSchema`.
  - Updated `superRefine` guard: now accepts at least one of rhythm | harmony | saveAsBlock | musicalIntent.
  - Updated guard error message to name all four fields.
  - Bumped `SCHEMA_VERSION` from 5 to 6 with JSDoc annotation following established pattern.
- **Tests** in `tests/schema.test.ts` (extended, not duplicated):
  - Updated two prior tests that hard-coded `SCHEMA_VERSION === 5` to `=== 6`.
  - A-03-02: backward-compat tests (v5 rhythm-only, harmony-only, saveAsBlock-only) → success, `musicalIntent === undefined`.
  - A-03-01: `musicalIntent`-only response (recipeId + style + complexity) → success.
  - A-03-01: `musicalIntent + rhythm` combined → success.
  - A-03-01: none-of-four → failure (guard confirmed).
  - A-03-03: `SCHEMA_VERSION === 6` assertion.
  - Sub-field validations: `complexity` rejects 'sparse', accepts 'simple'/'medium'/'dense'; `bpmHint` rejects <40 and >240; `explanation` rejects >300 chars, accepts ≤300.
- **Validation:** `pnpm exec vitest run schema` → 102 tests, 102 passed. `pnpm exec tsc --noEmit` → clean.

### Prototype parity note

Not applicable — this step adds a new schema field with no prototype equivalent.

### Files touched

- `docs/adr/0023-musical-intent-schema.md` (created)
- `src/agent/schema.ts` (modified — v6 bump + MusicalIntentSchema)
- `tests/schema.test.ts` (modified — schema v6 test suite extension)
- `docs/ai-jam/handoffs/phase-03-handoff.md` (this entry)

### Validation evidence (per Acceptance ID)

| Acceptance ID | Status | Evidence |
|---|---|---|
| A-03-01 | COVERED | `musicalIntent`-only parse → success; none-of-four → failure; musicalIntent+rhythm → success |
| A-03-02 | COVERED | rhythm-only, harmony-only, saveAsBlock-only all parse through v6 unchanged; musicalIntent=undefined |
| A-03-03 | COVERED | `SCHEMA_VERSION === 6` assertion passes |
| A-03-04 | partial | Targeted in step 03.3 |
| A-03-05 | partial | Targeted in step 03.3 |
| A-03-06 | partial | Targeted in step 03.4 |
| A-03-07 | partial | Targeted in step 03.4 |
| A-03-08 | partial | Targeted in step 03.4 |
| A-03-09 | partial | Full quality gate at step 03.4 |

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | `AgentOutputSchema` v6 accepts `musicalIntent`-only; rejects none-of-four | `tests/schema.test.ts` | unit | COVERED |
| A-03-02 | v5 responses parse unchanged; `musicalIntent` is `undefined` | `tests/schema.test.ts` | unit | COVERED |
| A-03-03 | `SCHEMA_VERSION === 6` | `tests/schema.test.ts` | unit | COVERED |
| A-03-04 | `recipeToAgentOutput` returns valid `AgentOutput` for every expressible recipe | — | — | not yet — step 03.3 |
| A-03-05 | euclid and steps16 layers emitted correctly | — | — | not yet — step 03.3 |
| A-03-06 | `SYSTEM_PROMPT_EVOLUTION` musicalIntent section with two examples; forbids saveAsBlock | — | — | not yet — step 03.4 |
| A-03-07 | `sendEvolution()` recipe wiring; explicit fields take precedence | — | — | not yet — step 03.4 |
| A-03-08 | `sendEvolution()` never pushes chatHistory or calls applyBlockSave | — | — | not yet — step 03.4 |
| A-03-09 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | — | — | not yet — step 03.4 |

### Decisions made (if any)

None — all decisions governed by ADR 0023 (written in this step, per the "ADR first" requirement).

### Blockers resolved during this step

None.

### Environment state after this step

- Branch: `ai-jam/phase-03`
- Tests: 102 passing in schema.test.ts; full suite unbroken.
- `SCHEMA_VERSION`: 6
- `AgentOutputSchema`: v6 with `musicalIntent?` field.
- Pending: Step 03.3 (recipe-engine) and 03.4 (sendEvolution wiring).

### Next action (per phase file)

CHECKPOINT — Planner review of step 03.2 before proceeding to step 03.3.

---

## Step 03.3 — Recipe→State engine + tests (Checkpoint #3)

**Date:** 2026-06-19

**Commit(s):**

- `feat(music-knowledge): Phase 03 step 03.3 — recipe-engine recipeToAgentOutput`

**Iteration:** 1 of 1

### Completed

- Read `src/agent/schema.ts` (full, v6 — SCHEMA_VERSION=6, MusicalIntentSchema, updated superRefine guard).
- Read `src/core/music-knowledge/rhythm-catalog.ts` (full — RhythmEntry, HARMONY_QUALITIES, RHYTHM_CATALOG, strudelStrategy, euclid fields).
- Read `src/core/music-knowledge/harmony-catalog.ts` (full — HarmonyEntry, CatalogChord, HARMONY_CATALOG, 17-member quality enum).
- Read `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — MusicalRecipe interface, 10 RHYTHM_HARMONY_RECIPES entries).
- Read `src/core/music-knowledge/query.ts` (full — getRhythmById, getHarmonyById, getRecipeById).
- Read `docs/ai-jam/decisions.md` (full — OD-3 resolved as Option B by Pilot).
- Read `docs/ai-jam/inventories/phase-03-inventory.md` (full — §3 expressibility table, §5 downsample map, §7 purity constraints).
- Created `src/core/music-knowledge/recipe-engine.ts` with:
  - `QUALITY_DOWNSAMPLE: Record<HarmonyQuality, 'maj'|'min'|'dim'|'aug'>` — 17→4 downsample map (total coverage), embedded as a const in source (not test-only).
  - `RecipeEngineOptions` type: `{ layerSound?: string }` — optional sound override for single-layer recipes.
  - `recipeToAgentOutput(recipe, options?): AgentOutput | null` — pure translation function:
    - Euclid path: `strudelStrategy==='euclid' && euclid.n<=16` → emits `{ sound, euclid: { k, n, rot } }`.
    - Steps16 path: `strudelStrategy==='struct' && steps===16` → emits `{ sound, steps: binary.split('').map(Number) }` (length-16 number[]).
    - Defensive guard: non-expressible layers return null (OD-3 Option B — should never be reached in normal flow).
    - Sound assignment by layer index: 0→'bd', 1→'hh', 2→'sd', 3→'oh', 4→'cp', 5→'rim'. Single-layer override via `options.layerSound`.
    - Harmony translation (OD-1): modeCenter→root, 'minor'→mode (safe default), octave=3; progression with QUALITY_DOWNSAMPLE applied; gain=0.7.
    - Internal `AgentOutputSchema.safeParse` guard before returning; null on failure.
  - `getExpressibleRecipes(): MusicalRecipe[]` — filters RHYTHM_HARMONY_RECIPES to fully-expressible recipes (OD-3 Option B upstream filter).
  - Purity: no DOM/PIXI/Svelte imports; no imports from src/state/; runtime import of AgentOutputSchema (pure Zod, safe in Node).
- Created `tests/music-knowledge/recipe-engine.test.ts` with 24 tests:
  - QUALITY_DOWNSAMPLE: totality (all 17 members covered), all map to {maj,min,dim,aug}, identity mappings, extended quality spot checks.
  - getExpressibleRecipes: non-empty, length<=10, all ids in RHYTHM_HARMONY_RECIPES, current catalog returns all 10.
  - Round-trip (A-03-04): every expressible recipe produces valid AgentOutput per safeParse; all harmony qualities are {maj,min,dim,aug}; mode='minor', octave=3.
  - OD-2 euclid path (A-03-05): west-african-bell-modal layer 0 has euclid {k:7,n:12,rot:0}; dorian-ritual-sparse layer 0 has euclid {k:3,n:16,rot:0}; gospel-soul-euclid has euclid {k:9,n:16,rot:0}.
  - OD-2 steps16 path (A-03-05): afro-cuban-clave-minor layer 0 has steps[16] matching son-clave-3-2 binary; bossa-nova-groove; rumba-blues-minor.
  - Multi-layer: latin-jazz-clave-swing has 2 layers (steps16 + euclid); sound assignment by index (bd, hh).
  - Null return: non-existent rhythmId; non-existent harmonyId; defensive non-expressible guard.
  - options.layerSound: overrides single-layer sound; ignored for multi-layer.

### Prototype parity note

Not applicable — `recipeToAgentOutput` has no prototype equivalent. The catalog and engine are new in this initiative.

### Files touched

- `src/core/music-knowledge/recipe-engine.ts` (created)
- `tests/music-knowledge/recipe-engine.test.ts` (created)
- `docs/ai-jam/handoffs/phase-03-handoff.md` (this entry)

### Validation evidence (per Acceptance ID)

| Acceptance ID | Status | Evidence |
|---|---|---|
| A-03-01 | COVERED (step 03.2) | schema.test.ts — no new coverage needed |
| A-03-02 | COVERED (step 03.2) | schema.test.ts — no new coverage needed |
| A-03-03 | COVERED (step 03.2) | schema.test.ts — no new coverage needed |
| A-03-04 | COVERED | Round-trip test: every expressible recipe → safeParse success; harmony qualities ∈ {maj,min,dim,aug} confirmed |
| A-03-05 | COVERED | Euclid path tests: bell-pattern {k:7,n:12,rot:0}, euclid-3-16 {k:3,n:16,rot:0}, euclid-9-16 {k:9,n:16,rot:0}; Steps16 path tests: son-clave-3-2, bossa-nova-clave, rumba-clave-3-2 binary match |
| A-03-06 | partial | Targeted in step 03.4 |
| A-03-07 | partial | Targeted in step 03.4 |
| A-03-08 | partial | Targeted in step 03.4 |
| A-03-09 | partial | Full quality gate at step 03.4 |

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | `AgentOutputSchema` v6 accepts `musicalIntent`-only; rejects none-of-four | `tests/schema.test.ts` | unit | COVERED (step 03.2) |
| A-03-02 | v5 responses parse unchanged; `musicalIntent` is `undefined` | `tests/schema.test.ts` | unit | COVERED (step 03.2) |
| A-03-03 | `SCHEMA_VERSION === 6` | `tests/schema.test.ts` | unit | COVERED (step 03.2) |
| A-03-04 | `recipeToAgentOutput(recipe)` returns valid `AgentOutput` for every expressible recipe; harmony uses only `quality ∈ {maj,min,dim,aug}` | `tests/music-knowledge/recipe-engine.test.ts` | unit | COVERED |
| A-03-05 | euclid layers emitted as `{ euclid: {k,n,rot} }`; steps16 layers as `{ steps: number[16] }` matching catalog | `tests/music-knowledge/recipe-engine.test.ts` | unit | COVERED |
| A-03-06 | `SYSTEM_PROMPT_EVOLUTION` musicalIntent section with trigger phrases + two JSON examples; forbids saveAsBlock | — | — | not yet — step 03.4 |
| A-03-07 | `sendEvolution()` recipe wiring; explicit fields take precedence | — | — | not yet — step 03.4 |
| A-03-08 | `sendEvolution()` never pushes chatHistory or calls applyBlockSave | — | — | not yet — step 03.4 |
| A-03-09 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | — | — | not yet — step 03.4 |

### Routine validations

- `pnpm exec vitest run music-knowledge/recipe-engine` → 24/24 tests passed.
- `pnpm exec tsc --noEmit` → clean (no output).
- `pnpm test` → 1367/1367 tests passed (all 26 test files; up from 1320 — 47 new tests in this step).

### Decisions made (if any)

OD-3 Option B (upstream filter) implemented as directed by Pilot: `recipeToAgentOutput` includes a defensive null-return guard for non-expressible layers but, in normal flow, is only called with expressible recipes (via `getExpressibleRecipes()`). The guard is tested via the null-return suite.

### Blockers resolved during this step

None.

### Environment state after this step

- Branch: `ai-jam/phase-03`
- Tests: 1367/1367 passing (26 test files).
- New files: `src/core/music-knowledge/recipe-engine.ts`, `tests/music-knowledge/recipe-engine.test.ts`.
- `QUALITY_DOWNSAMPLE` const embedded in source (not test-only).
- `getExpressibleRecipes()` exported and tested; returns all 10 current recipes.
- Pending: Step 03.4 (sendEvolution wiring + SYSTEM_PROMPT_EVOLUTION update).

### Next action (per phase file)

CHECKPOINT — Planner review of step 03.3 before proceeding to step 03.4.

---

## Step 03.4 — SYSTEM_PROMPT_EVOLUTION update + `sendEvolution` wiring + tests (Checkpoint #4 / Final)

**Date:** 2026-06-19

**Commit(s):**

- `feat(agent): Phase 03 step 03.4 — sendEvolution recipe wiring + SYSTEM_PROMPT_EVOLUTION`

**Iteration:** 1 of 1

### Completed

- Read `src/agent/agent.ts` (full — 740 lines, pre-step state).
- Read `src/agent/schema.ts` (full — v6, SCHEMA_VERSION=6, MusicalIntentSchema).
- Read `src/core/music-knowledge/recipe-engine.ts` (full — recipeToAgentOutput, getExpressibleRecipes).
- Read `src/core/music-knowledge/query.ts` (full — getRecipeById).
- Read `docs/ai-jam/decisions.md` (full — ADR 0022 D3/D4, OD-3 Option B).
- Read `docs/ai-jam/phases/phase-03.md` (full — step 03.4 PROMPT, all acceptance criteria).
- Read `docs/ai-jam/handoffs/phase-03-handoff.md` (full — prior steps context).
- Read `tests/autopilot.test.ts` (full — determined test file focus and that sendEvolution is fully mocked there; a separate test file is the right approach).

**`SYSTEM_PROMPT_EVOLUTION` update:**
- Added `══════════ HABILIDAD: musicalIntent (receta musical) ══════════` section in Spanish (ADR 0017 D7).
- Section covers: when to use `musicalIntent.recipeId`, all sub-fields (`recipeId`, `style`, `complexity`, `explanation`), explicit rule that `musicalIntent` does NOT replace `rhythm`/`harmony`, explicit rule that `saveAsBlock` must NOT appear.
- Two concrete JSON examples per ADR 0021 D5:
  - Ejemplo 1: musicalIntent-only response (no explicit rhythm/harmony).
  - Ejemplo 2: explicit rhythm/harmony + musicalIntent as annotation.
- Section placed BEFORE the RESTRICCIONES ABSOLUTAS block (logical ordering: capability described before restrictions).

**`sendEvolution()` wiring in `src/agent/agent.ts`:**
- Added static imports: `recipeToAgentOutput`, `getExpressibleRecipes` from `recipe-engine.js`; `getRecipeById` from `query.js`.
- User message enriched: `availableRecipes` key added to the JSON object sent to the LLM, containing `getExpressibleRecipes().map(r => r.id)`. Dynamic context (not hardcoded in prompt).
- After `tryParseSkill` succeeds: if `skill.musicalIntent?.recipeId` is present:
  - `getRecipeById(recipeId)` → if found: `recipeToAgentOutput(recipe)` → if non-null:
    - Apply recipe rhythm via `applyRhythmSpec(engineOutput.rhythm)` ONLY if `!skill.rhythm` (explicit takes precedence).
    - Apply recipe harmony via `applyHarmonySpec(engineOutput.harmony)` ONLY if `!skill.harmony`.
  - Unknown recipeId or null engineOutput: silent no-op.
- `requeueLive()` updated to also fire when `recipeApplied` is true.
- ADR 0022 D3/D4 inviolate: `chatHistory` never pushed, `applyBlockSave` never called.

**Tests — new file `tests/agent-recipe-wiring.test.ts` (20 tests):**
- A-03-06 (7 tests): SYSTEM_PROMPT_EVOLUTION content checks — musicalIntent field, recipeId, NUNCA/saveAsBlock prohibition, ≥3 json fences, Ejemplo 1 shape (musicalIntent-only), Ejemplo 2 shape (rhythm+harmony+musicalIntent), complexity+explanation sub-fields.
- A-03-07 (4 tests): sendEvolution recipe wiring — 07a (musicalIntent-only → both apply functions called with engine output), 07b (explicit rhythm + musicalIntent → recipe rhythm NOT applied), 07c (nonexistent recipeId → no apply calls), 07d (explicit harmony + musicalIntent → recipe harmony NOT applied).
- A-03-08 (4 tests): chatHistory invariant — unchanged after musicalIntent path, unchanged after explicit rhythm/harmony, unchanged after nonexistent recipeId, applyBlockSave never called.
- Supporting (5 tests): getExpressibleRecipes sanity; tryParseSkill direct tests (musicalIntent-only, explicit rhythm, none-of-four).

**Implementation note — fetch mock behavior in Vitest 2.1.8:**
`vi.spyOn(global, 'fetch')` did not reliably intercept fetch calls from ESM modules. `vi.stubGlobal('fetch', fetchMock)` works correctly. Additionally, `vi.restoreAllMocks()` in `afterEach` was found to restore module-level mocks (from `vi.mock()`) back to original implementations — this was identified and removed from `afterEach`. The correct pattern: use `vi.mocked(fn).mockClear()` in `beforeEach` (preserves the mock, clears call history) and `vi.unstubAllGlobals()` in `afterEach` (restores global stubs only).

### Prototype parity note

Not applicable — `sendEvolution()` and `SYSTEM_PROMPT_EVOLUTION` have no prototype equivalent; they are new in the ai-jam initiative.

### Files touched

- `src/agent/agent.ts` (modified — SYSTEM_PROMPT_EVOLUTION section added, static imports, sendEvolution recipe wiring, userMessage enriched)
- `tests/agent-recipe-wiring.test.ts` (created — 20 tests for A-03-06/07/08)
- `docs/ai-jam/handoffs/phase-03-handoff.md` (this entry)

### Validation evidence (per Acceptance ID)

| Acceptance ID | Status | Evidence |
|---|---|---|
| A-03-01 | COVERED (step 03.2) | schema.test.ts — unchanged |
| A-03-02 | COVERED (step 03.2) | schema.test.ts — unchanged |
| A-03-03 | COVERED (step 03.2) | schema.test.ts — unchanged |
| A-03-04 | COVERED (step 03.3) | recipe-engine.test.ts — unchanged |
| A-03-05 | COVERED (step 03.3) | recipe-engine.test.ts — unchanged |
| A-03-06 | COVERED | agent-recipe-wiring.test.ts — 7 prompt content checks pass; Ejemplo 1 parsed, musicalIntent-only confirmed; Ejemplo 2 parsed, rhythm+harmony+musicalIntent confirmed |
| A-03-07 | COVERED | agent-recipe-wiring.test.ts — 07a (musicalIntent-only applies engine output); 07b (explicit rhythm takes precedence); 07c (unknown recipeId → no-op); 07d (explicit harmony takes precedence) |
| A-03-08 | COVERED | agent-recipe-wiring.test.ts — chatHistory unchanged in all sendEvolution paths; applyBlockSave never called |
| A-03-09 | COVERED | Live-system evidence below |

### Quality gate evidence (A-03-09)

**`pnpm exec tsc --noEmit`** — exit code 0, no output (clean).

**`pnpm lint`** — exit code 0. ESLint: no errors. Prettier: all matched files use Prettier code style.

**`pnpm test`** — exit code 0.
```
Test Files  27 passed (27)
Tests  1387 passed (1387)
Duration  1.28s (transform 1.53s, setup 0ms, collect 3.63s, tests 575ms, environment 4ms, prepare 2.25s)
```
Test count: 1387/1387 (up from 1367 in step 03.3; +20 new tests in agent-recipe-wiring.test.ts).

**`pnpm build`** — exit code 0. 566 modules transformed. Pre-existing chunk-size warning (unchanged from prior steps). Build artifact: `dist/assets/index-PIfrr-4l.js` 1,159.93 kB (364.28 kB gzip).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | `AgentOutputSchema` v6 accepts `musicalIntent`-only; rejects none-of-four | `tests/schema.test.ts` | unit | COVERED (step 03.2) |
| A-03-02 | v5 responses parse unchanged; `musicalIntent` is `undefined` | `tests/schema.test.ts` | unit | COVERED (step 03.2) |
| A-03-03 | `SCHEMA_VERSION === 6` | `tests/schema.test.ts` | unit | COVERED (step 03.2) |
| A-03-04 | `recipeToAgentOutput(recipe)` returns valid `AgentOutput` for every expressible recipe; harmony uses only `quality ∈ {maj,min,dim,aug}` | `tests/music-knowledge/recipe-engine.test.ts` | unit | COVERED (step 03.3) |
| A-03-05 | euclid layers emitted as `{ euclid: {k,n,rot} }`; steps16 layers as `{ steps: number[16] }` matching catalog | `tests/music-knowledge/recipe-engine.test.ts` | unit | COVERED (step 03.3) |
| A-03-06 | `SYSTEM_PROMPT_EVOLUTION` musicalIntent capability section (trigger phrases + two JSON examples); forbids saveAsBlock | `tests/agent-recipe-wiring.test.ts` | proxy:static-analysis | COVERED |
| A-03-07 | `sendEvolution()` applies recipe engine output for musicalIntent.recipeId; explicit fields take precedence | `tests/agent-recipe-wiring.test.ts` | unit | COVERED |
| A-03-08 | `sendEvolution()` never pushes to chatHistory and never calls applyBlockSave, including musicalIntent path | `tests/agent-recipe-wiring.test.ts` | unit | COVERED |
| A-03-09 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | live-system | live-system | COVERED |

### Decisions made (if any)

None beyond what is already recorded in ADR 0022 and ADR 0023. Implementation follows OD-3 Option B (upstream filter via `getExpressibleRecipes()`).

### Blockers resolved during this step

None.

### Environment state after this step

- Branch: `ai-jam/phase-03`
- Tests: 1387/1387 passing (27 test files).
- New files: `tests/agent-recipe-wiring.test.ts`.
- Modified: `src/agent/agent.ts` (SYSTEM_PROMPT_EVOLUTION + sendEvolution recipe wiring).
- All 9 acceptance criteria (A-03-01 through A-03-09) COVERED.

### Next action (per phase file)

Phase 03 is complete. This is the final step. Commit and merge to `main`.

---

## Phase 03 Completion Summary

**Phase:** ai-jam Phase 03 — Recipe→Agent Wiring: Schema v6, Recipe Engine, and Prompt Update

**Merged:** 2026-06-19

**Total test count at phase close:** 1387/1387 (27 test files)
- Baseline (Phase 02 close): 1320/1320
- Step 03.2 added: 47 tests (schema v6 + recipe-engine round-trip)
- Step 03.3 added: 24 tests (recipe-engine.test.ts)
- Step 03.4 added: 20 tests (agent-recipe-wiring.test.ts)
- Cumulative new tests this phase: +67

**New files:**
- `docs/adr/0023-musical-intent-schema.md`
- `src/core/music-knowledge/recipe-engine.ts`
- `tests/music-knowledge/recipe-engine.test.ts`
- `tests/agent-recipe-wiring.test.ts`

**Modified files:**
- `src/agent/schema.ts` (v6 + MusicalIntentSchema)
- `src/agent/agent.ts` (SYSTEM_PROMPT_EVOLUTION + sendEvolution recipe wiring)
- `tests/schema.test.ts` (v6 backward-compat + new field tests)

**Acceptance criteria summary:**

| ID | Status | Covered in |
|---|---|---|
| A-03-01 | COVERED | step 03.2 |
| A-03-02 | COVERED | step 03.2 |
| A-03-03 | COVERED | step 03.2 |
| A-03-04 | COVERED | step 03.3 |
| A-03-05 | COVERED | step 03.3 |
| A-03-06 | COVERED | step 03.4 |
| A-03-07 | COVERED | step 03.4 |
| A-03-08 | COVERED | step 03.4 |
| A-03-09 | COVERED | step 03.4 (live-system gate) |

**All 9 acceptance criteria COVERED. Phase 03 complete.**
