<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 06 — Default Tempo per Recipe + Dynamic Step Grid

**Purpose:** Wire two recipe-aware UI behaviors: (1) applying a recipe chip updates the transport BPM to the recipe's `defaultCpm`, and (2) the rhythm orbit canvas renders N dots per layer matching each layer's actual step count instead of a fixed 16.

**Gate:** Phase 05 complete and merged to `main`; `pnpm test` passes at 1831; `SESSION_SCHEMA_VERSION = 5`; `SCHEMA_VERSION = 6`; AG-D1 seam invariant in force; ADR 0025 in force.

**Expected phase result:** Clicking the "Cumbia Latina Groove" recipe chip updates the transport to 120 BPM (30 cpm × 4 bars/cycle); clicking "Cueca Chilena Folk" updates to 160 BPM (40 cpm × 4); recipes without `defaultCpm` leave BPM unchanged; the rhythm canvas renders 12 dots for cueca layers and 16 dots for cumbia layers with correct toggle behavior; `SESSION_SCHEMA_VERSION` stays 5; all prior tests pass.

---

## Architectural notes (hard invariants for every step)

**`defaultCpm` field placement:**
`defaultCpm?: number` lives on `MusicalRecipe` in `src/core/music-knowledge/rhythm-harmony-recipes.ts`. The unit is cycles per minute (bars per minute in 4/4). Conversion to BPM at apply time: `bpm = defaultCpm * 4` (since one Strudel cycle = one bar of 4/4, and `setcps(bpm/240)` means `cps = bpm/240 = cpm/60`). The knowledge layer stores the musical unit (cpm); the plumbing layer converts at the call site.

**Tempo injection point:**
`applyRecipeById` in `src/agent/autopilot.ts` is the single apply path for recipe chips (ADR 0025 D4). After the existing rhythm + harmony apply steps, if `recipe.defaultCpm` is defined, call `setBpm(recipe.defaultCpm * 4)` from `src/state/session.ts`. This reuses the existing BPM reactive path — the store updates, `setTempo(bpm)` is called to the audio engine, and the Transport slider re-renders via Svelte reactivity. No new audio or store machinery needed.

**Seam constraint (AG-D1):**
`defaultCpm` is genre-specific knowledge → lives only on `MusicalRecipe` entries in `src/core/music-knowledge/`. The arithmetic `defaultCpm * 4` and the `setBpm()` call go in `autopilot.ts` (plumbing). `autopilot.ts` must contain no genre name or recipe name — it receives a number and converts it. The `if (recipe.defaultCpm !== undefined)` guard is genre-agnostic: it reads a data field, not a string comparison.

**Dynamic step grid — scope and design:**
The PIXI canvas (`src/render/rhythm-scene.ts`) currently uses a module-level `const RSTEPS = 16` for all loops: geometry rebuild, dot rendering, playhead, and click-to-toggle. Making the grid dynamic means: when rendering a layer, use `layer.steps.length` instead of the module constant. The module-level `RSTEPS` constant remains for backward-compatibility in the playhead calculation (which is global, not per-layer) but the per-layer rendering loops switch to `layer.steps.length`.

**Step count source rule (AG-D1 compliant):**
The step count comes from `layer.steps.length` (pure data — no genre name). The recipe knowledge system already wrote the correct-length `steps` arrays into the session layers via `applyRhythmSpec`. The render layer reads them without knowing which genre produced them. This is fully AG-D1 compliant — the render has no genre knowledge.

**Scope boundary (Pilot-confirmed):**
- 12-step and 16-step layers: fully supported in this phase.
- Other step counts (9-step aksak, etc.): the dynamic render works for any N because it reads `layer.steps.length`, but the playhead and geometry use a per-layer step count. Steps other than 12 and 16 are not explicitly tested.
- DOM step-toggle click-handler: uses `_stepPos[li]` (one position per step), which is rebuilt per-layer with the correct N. The toggle writes to `layer.steps[s]` by index — already correct for any N.

**`SESSION_SCHEMA_VERSION` stays 5:** `defaultCpm` is not persisted (tempo is ephemeral, set by recipe apply, overridden by the BPM slider). No schema change needed.

---

## Step 06.1 — Inventory

PROMPT → Read source files, trace the full tempo-injection path and the PIXI step-count path, and produce `docs/authentic-groove/inventories/phase-06-inventory.md`. Do NOT write any source file. STOP for Pilot review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1 in force)
3. `docs/adr/0025-authentic-sample-palette.md` (D1–D3 seam rules; D4 — `applyRecipeById` as the single chip path)
4. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (lines 62–140 — `MusicalRecipe` interface; all recipe entries for `cumbia-latina-groove` and `cueca-chilena-folk` — confirm `defaultCpm` is absent)
5. `src/agent/autopilot.ts` (lines 174–252 — `applyRecipeById` — understand all existing steps; identify where `setBpm` call must be inserted)
6. `src/state/session.ts` (lines 590–594 — `setBpm` function — confirm it updates store + calls audio `setTempo`; confirm it is the correct and only BPM-setting path; confirm no `bpm` field in `SavedSessionSchema` excludes it from persistence concern)
7. `src/render/rhythm-scene.ts` (full — focus on:
   - `const RSTEPS = 16` (line 29) — the hardcoded constant
   - `rebuildRhythmGeo` (lines 111–169) — loops over `RSTEPS` for geometry
   - `tickRhythm` dot rendering (lines 358–380) — `for (let s = 0; s < RSTEPS; s++)`
   - `onStagePointer` click handler (lines 480–512) — uses `_stepPos[li]` to detect toggle; confirm it already works for any N
   - `_stepPos` construction — confirm it mirrors loop count
   - Playhead calculation (lines 400–419) — confirm it uses `RSTEPS` as a 16-step divisor for the global clock phase)
8. `src/lib/persistence.ts` (lines 89–101 — `SavedRhythmLayerSchema` — confirm `steps` array length is stored from the layer, not normalized to 16; confirm a 12-element array round-trips cleanly)
9. `src/agent/apply.ts` (lines for `applyRhythmSpec` — confirm 12-step layers land in the session store with `steps.length === 12`, not padded to 16)
10. `tests/authentic-groove/propagation.test.ts` (lines for cueca integration tests — confirm `steps.length === 12` for cueca layers after `applyRhythmSpec`)

**Inventory sections (all required):**

**§1 — Tempo injection design.**
Confirm: `setBpm` in `session.ts` updates the store reactively and calls `setTempo(bpm)` to the audio engine. Identify the exact line in `applyRecipeById` where the `setBpm(recipe.defaultCpm * 4)` call must be inserted (after step 4b `applyLockedFlags`, before step 7 `requeueLive`). Confirm that inserting it there means the transport slider and BPM readout in `Transport.svelte` update reactively via the store subscription. State the formula clearly: `bpm = defaultCpm * 4`.

**§2 — `MusicalRecipe.defaultCpm` field declaration.**
Propose the exact TypeScript field declaration (with JSDoc) to add to the `MusicalRecipe` interface. Confirm it is optional (`defaultCpm?: number`) so existing recipes without it continue to work unchanged. Confirm the seam: the value is pure musical knowledge (belongs in `MusicalRecipe` in `music-knowledge/`); the arithmetic `* 4` is plumbing (belongs in `autopilot.ts`). Confirm no genre name appears in `autopilot.ts`.

**§3 — Recipe entries update: confirmed `defaultCpm` values.**
Confirm:
- `cumbia-latina-groove`: `defaultCpm: 30` → `bpm = 120`. State whether this matches the recipe's `bpmRange` (confirm it falls within the range).
- `cueca-chilena-folk`: `defaultCpm: 40` → `bpm = 160`. State whether this matches the recipe's `bpmRange`.
- All other recipes: no `defaultCpm` (tempo unchanged on apply). List any recipes whose `bpmRange` might conflict with the formula being omitted.

**§4 — Dynamic step grid: per-layer rendering.**
Trace `rebuildRhythmGeo`: the outer loop iterates `state.rhythm.layers.forEach`. The inner loop `for (let s = 0; s < RSTEPS; s++)` computes 16 positions. Identify the exact replacement: change to `for (let s = 0; s < layer.steps.length; s++)` (use `layer.steps.length` for the current layer). The `LayerGeo` interface stores `polar` and `lin` arrays — these become length-N arrays. Confirm the `lin` x-position formula `(s + 0.5) / RSTEPS` — this must be changed to `(s + 0.5) / layer.steps.length` so steps are evenly spaced across the same total width (`Wlin`). Confirm the `polar` angle formula `(s / RSTEPS) * 2π` likewise becomes `(s / layer.steps.length) * 2π`.

**§5 — Dynamic step grid: tick rendering.**
In `tickRhythm`: the dot-rendering loop `for (let s = 0; s < RSTEPS; s++)` must change to `for (let s = 0; s < g.layer.steps.length; s++)`. The ring-closing polygon loop (`for (let s = 0; s <= RSTEPS; s++)`) must change to `for (let s = 0; s <= g.layer.steps.length; s++)`. Confirm that `liveLayer.steps[s]` access is already bounds-safe (the loop length matches the array length). Confirm `_stepPos.push(pos)` collects N positions, not 16.

**§6 — Playhead: global phase arithmetic.**
The playhead calculation uses `Math.floor(phase * RSTEPS) % RSTEPS` (line 402). `phase` is a 0–1 value from the Strudel clock (one cycle = 0→1). This is a global beat indicator, not per-layer. For the playhead beam (line 412: `_rCenter.xL + phase * _rCenter.Wlin`), no change is needed — it's position-based, not step-count-based. For `curStep = Math.floor(phase * RSTEPS) % RSTEPS` (line 402) and the corresponding `liveLayer.steps[curStep]` check (line 430), these must also use the layer's step count. Propose the fix: `curStep = Math.floor(phase * layer.steps.length) % layer.steps.length`. Confirm the `_audioModule.getPhase()` call returns a normalized 0–1 cycle position and that the per-layer step lighting is correct with this formula.

**§7 — `applyLoadedSession` locked field gap (pre-existing).**
Confirm that `applyLoadedSession` in `session.ts` (lines 1813–1819) does NOT restore `locked` from the persisted layer. The field `l.locked` is parsed by `SavedRhythmLayerSchema` (step 05.2) but the `applyLoadedSession` function's map omits it. State whether this is in scope for Phase 06 (it is not — it is a pre-existing gap from step 05.2; document it here for future phases). Do NOT propose fixing it in this phase.

**§8 — Seam fitness check plan.**
State which greps to run in step 06.4 to confirm:
- No genre name (`cueca`, `cumbia`, etc.) in `autopilot.ts` outside of a comment.
- `defaultCpm` appears only in `src/core/music-knowledge/rhythm-harmony-recipes.ts` and test files.
- No hardcoded step-count integer `16` in the render loops (replaced by `.length`).

**Implementation requirements:** Read only. Produce the inventory file. Touch no `.ts`, `.svelte`, or binary file.

**Validation:**
- `git status` → only `docs/authentic-groove/inventories/phase-06-inventory.md` and `docs/authentic-groove/handoffs/phase-06-handoff.md` are new/modified.

**CHECKPOINT → Commit message:**
`docs(authentic-groove): Phase 06 step 06.1 — default-tempo + dynamic-grid inventory`

**STOP for Pilot review.** The `defaultCpm` formula and the PIXI loop-variable replacement must be confirmed before any source file is modified.

---

## Step 06.2 — `defaultCpm` on `MusicalRecipe` + tempo injection in `applyRecipeById` + tests

PROMPT → Add `defaultCpm?: number` to `MusicalRecipe`, populate it on `cumbia-latina-groove` and `cueca-chilena-folk`, inject the `setBpm` call in `applyRecipeById`, and add unit tests. All changes confined to `src/core/music-knowledge/`, `src/agent/autopilot.ts`, and `tests/`.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-06-inventory.md` §1, §2, §3 (exact field declaration, formula, confirmed recipe values)
2. `docs/authentic-groove/decisions.md` (AG-D1 — no genre name in `autopilot.ts`)
3. `docs/adr/0025-authentic-sample-palette.md` (D4 — `applyRecipeById` is the single chip path)
4. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — before editing; confirm `MusicalRecipe` interface and recipe entries)
5. `src/agent/autopilot.ts` (lines 174–252 — `applyRecipeById` — before editing; understand exact insertion point)
6. `src/state/session.ts` (lines 590–594 — `setBpm` — confirm import needed in autopilot.ts)

**What to produce:**

`src/core/music-knowledge/rhythm-harmony-recipes.ts` — two changes:
1. Add `defaultCpm?: number` to the `MusicalRecipe` interface with JSDoc: "Default tempo in cycles per minute (bars per minute in 4/4) when this recipe is applied. Conversion to BPM: `bpm = defaultCpm * 4`. When absent, tempo is unchanged on apply. Invariant: value falls within `bpmRange` when converted (`bpmRange[0] ≤ defaultCpm * 4 ≤ bpmRange[1]`). Enforced by recipe integrity tests."
2. Add `defaultCpm: 30` to `cumbia-latina-groove` and `defaultCpm: 40` to `cueca-chilena-folk`.

`src/agent/autopilot.ts` — one change in `applyRecipeById`:
- After step 4b (`applyLockedFlags`), before step 7 (`requeueLive`), insert:
  ```
  // Step 5: apply default tempo if the recipe declares one (AG-D1: no genre name here).
  if (recipe.defaultCpm !== undefined) {
    setBpm(recipe.defaultCpm * 4);
  }
  ```
- Add `setBpm` to the imports from `../state/session.js` (if not already imported).
- Renumber JSDoc comment steps if needed.
- No genre name in the inserted code or comments beyond the field name `defaultCpm`.

Updated `tests/music-knowledge/recipes.test.ts` — add invariant 10:
- When `recipe.defaultCpm` is present: `recipe.defaultCpm * 4 >= recipe.bpmRange[0]` AND `recipe.defaultCpm * 4 <= recipe.bpmRange[1]`. This enforces the documented invariant across all recipes that declare `defaultCpm`.

New `tests/authentic-groove/default-tempo.test.ts` (AGPL-3.0 header):
- Test: `applyRecipeById('cumbia-latina-groove')` sets `sessionStore.bpm` to `120`. Confirm by reading the store after the call (mock audio module if needed, or set up a minimal store state).
- Test: `applyRecipeById('cueca-chilena-folk')` sets `sessionStore.bpm` to `160`.
- Test: `applyRecipeById('bossa-nova-groove')` (a recipe without `defaultCpm`) does NOT change `sessionStore.bpm` from its initial value (120).
- Test: a recipe with `defaultCpm: 30` produces `bpm = 120` via the formula (unit test of the formula, independent of `applyRecipeById`).

**Constraints:**
- `SESSION_SCHEMA_VERSION` stays 5; `SCHEMA_VERSION` stays 6.
- No genre name in `autopilot.ts` (AG-D1). The inserted code reads `recipe.defaultCpm` — a field name, not a genre string. Pass.
- AGPL-3.0 header on all new test files.
- Do NOT modify `rhythm-scene.ts`, `persistence.ts`, or any Svelte component in this step.

**Acceptance criteria in this step:**
- A-06-01 (partial): `MusicalRecipe.defaultCpm?` field exists — covered by `tsc --noEmit`.
- A-06-02 (partial): applying `cumbia-latina-groove` sets `bpm = 120`; applying `cueca-chilena-folk` sets `bpm = 160`; applying a recipe without `defaultCpm` leaves `bpm` unchanged — covered by `default-tempo.test.ts`.
- A-06-03 (partial): invariant 10 (defaultCpm in bpmRange) covered by `recipes.test.ts`.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run default-tempo` → all new tests pass
- `pnpm test` → no regressions (1831 + new tests)
- `git status` → only `src/core/music-knowledge/rhythm-harmony-recipes.ts`, `src/agent/autopilot.ts`, `tests/music-knowledge/recipes.test.ts`, `tests/authentic-groove/default-tempo.test.ts`, handoff entry

**CHECKPOINT → Commit message:**
`feat(music-knowledge): Phase 06 step 06.2 — defaultCpm on MusicalRecipe + tempo injection`

---

## Step 06.3 — Dynamic step grid in PIXI rhythm canvas

PROMPT → Update `src/render/rhythm-scene.ts` to use `layer.steps.length` instead of the module-level `RSTEPS = 16` constant for per-layer geometry, dot rendering, and playhead-step lighting. All changes confined to `src/render/rhythm-scene.ts`.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-06-inventory.md` §4, §5, §6 (exact loop replacements, formula changes, playhead fix)
2. `docs/authentic-groove/decisions.md` (AG-D1 — render layer must have no genre name)
3. `src/render/rhythm-scene.ts` (full — before editing; understand every `RSTEPS` reference)
4. `src/core/rhythm/layers.ts` (confirm `RhythmLayer.steps` is `number[]` with no fixed length)
5. `tests/authentic-groove/propagation.test.ts` (confirm cueca layers have `steps.length === 12` after recipe apply)

**What to produce:**

`src/render/rhythm-scene.ts` — targeted changes only:

1. **`rebuildRhythmGeo` inner loop** — change `for (let s = 0; s < RSTEPS; s++)` (line 136) to `const N = layer.steps.length;` followed by `for (let s = 0; s < N; s++)`. Update the polar angle formula to `(s / N) * Math.PI * 2` and the linear x formula to `(s + 0.5) / N * Wlin`. Update `LayerGeo` interface comments: "`polar`: N positions for each step" and "`lin`: N positions".

2. **`tickRhythm` ring outline loop** — change `for (let s = 0; s <= RSTEPS; s++)` (radial polygon, line 341) to `for (let s = 0; s <= N; s++)` where `N = g.layer.steps.length`. Update `idx = s % N` accordingly. Change the linear open-polyline loop `for (let s = 0; s < RSTEPS; s++)` to `for (let s = 0; s < N; s++)`.

3. **`tickRhythm` dot loop** — change `for (let s = 0; s < RSTEPS; s++)` (line 360) to `for (let s = 0; s < N; s++)`. The `liveLayer.steps[s] === 1` check is already bounds-safe when the loop limit equals the array length.

4. **`tickRhythm` playhead per-layer step highlighting** — change `const curStep = Math.floor(phase * RSTEPS) % RSTEPS` (line 402) to a per-layer calculation inside the layer-rendering loop: `const layerN = liveLayer.steps.length; const curStep = Math.floor(phase * layerN) % layerN`. The global-phase radial/linear playhead beam (lines 408–419) uses raw `phase` (not `RSTEPS`) — leave it unchanged.

5. **`const RSTEPS = 16`** — keep the declaration at line 29 but change the JSDoc to: "Base step count for playhead and geometry fallback. Per-layer rendering uses `layer.steps.length` instead." The constant is retained for any remaining references (e.g., the `addEuclidLayer` in `session.ts` pads to `RSTEPS` — that is NOT in `rhythm-scene.ts` and is not touched here).

**Do NOT change:**
- The global playhead beam position (`_rCenter.xL + phase * _rCenter.Wlin`) — this is phase-based, not step-count-based. Correct as-is.
- `_stepPos` collection (`_stepPos.push(pos)`) — correctly collects N positions after the loop fix.
- `onStagePointer` click handler — it iterates `_stepPos[li]` (now N positions) and writes to `layer.steps[s]` by index. Already correct for any N.
- `onStageContextMenu` — iterates `_stepPos[li]` for nearest-layer detection. Already correct.
- Any file outside `src/render/rhythm-scene.ts`.

**Note on PIXI canvas vs. DOM step grid:**
There is no separate DOM "step grid" component in this codebase — the orbiting dots ARE the step grid (PIXI canvas). The `RhythmControls.svelte` is an empty shell (relocated to Header in Phase 09). No Svelte file change is needed for the grid display.

**Constraints:**
- AG-D1: zero genre name or hardcoded sample name in `rhythm-scene.ts`.
- Do NOT import from `src/core/music-knowledge/` in `rhythm-scene.ts` — the step count comes from `RhythmLayer.steps.length` (data already in the session store).
- No new npm dependencies.
- AGPL-3.0 header already present — do not modify it.

**Acceptance criteria in this step:**
- A-06-04 (partial): the PIXI canvas renders N dots per layer matching `layer.steps.length`; clicking a dot at position s in a 12-step layer correctly toggles `steps[s]` — covered by code review + `tsc --noEmit`. Live-system verification deferred to step 06.4.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm test` → no regressions (no new tests required in this step — the behavior is render-layer visual, not unit-testable without PIXI mocking)
- `git status` → only `src/render/rhythm-scene.ts` and handoff entry

**CHECKPOINT → Commit message:**
`feat(render): Phase 06 step 06.3 — dynamic step count in rhythm orbit canvas`

---

## Step 06.4 — End-to-end smoke test + seam fitness check + quality gate

PROMPT → Smoke-test the full recipe-apply path (tempo + grid), run seam fitness greps, run the full quality gate, and record all output in the handoff.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-06-inventory.md` (all sections — confirm all decisions were followed)
2. `docs/authentic-groove/handoffs/phase-06-handoff.md` (confirm steps 06.2 and 06.3 are APPROVED)
3. `docs/adr/0025-authentic-sample-palette.md` (D3 — seam invariant + grep command)

**What to produce:**

Extend `tests/authentic-groove/default-tempo.test.ts` — add integration tests:
- Full path test: call `applyRecipeById('cumbia-latina-groove')` on a store initialized with a cueca recipe's locked layers (simulate: layers from cueca are locked); confirm BPM becomes 120; confirm locked layers are replaced (full recipe replace, `force: true`).
- Full path test: call `applyRecipeById('cueca-chilena-folk')`; confirm BPM becomes 160; confirm `sessionStore.rhythm.layers` contains 3 layers with `steps.length === 12` for the cueca layers.
- No-tempo-change test: apply a recipe without `defaultCpm`; confirm BPM remains at initial value.

Extend `tests/authentic-groove/propagation.test.ts` — add one guard test:
- After `applyRecipeById('cueca-chilena-folk')`, confirm `sessionStore.rhythm.layers.every(l => l.steps.length === 12)`.

Run and record the seam fitness check:
- Genre-token grep: `cueca`, `cumbia`, `candombe` must not appear as logic tokens in `src/` outside `src/core/music-knowledge/`. Record results with pass/fail verdict.
- `defaultCpm` grep: must appear only in `src/core/music-knowledge/rhythm-harmony-recipes.ts` and test files. Record results.
- `RSTEPS` grep in `rhythm-scene.ts`: confirm only the constant declaration and the JSDoc reference remain; confirm per-layer loops use `.length`. Record results.

Run and record the full quality gate:
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

**Reversibility note (required verbatim in handoff):**
- `defaultCpm` is additive optional on `MusicalRecipe`. Reverting the field removes tempo-on-apply behavior; BPM stays unchanged when a recipe is applied (pre-Phase-06 behavior). All sessions continue to work.
- The `setBpm` call in `applyRecipeById` is guarded by `recipe.defaultCpm !== undefined`. Removing it returns `applyRecipeById` to pre-Phase-06 behavior with zero schema impact.
- The `rhythm-scene.ts` loop change from `RSTEPS` to `layer.steps.length` is backward-compatible: for 16-step layers (the previous only case), `layer.steps.length === 16 === RSTEPS`, so the render output is identical to pre-Phase-06. For 12-step layers, the previous render read `steps[12]`–`steps[15]` as `undefined` (treating them as 0, i.e., inactive) — the fix makes 12-step layers show 12 dots instead of 16. This is a correct behavior change, not a regression.
- `SESSION_SCHEMA_VERSION` stays 5. No migration needed.

**Acceptance criteria in this step:**
- A-06-01 (full): `MusicalRecipe.defaultCpm?` exists; the conversion formula `bpm = defaultCpm * 4` is the only arithmetic applied — covered by `tsc --noEmit` + `default-tempo.test.ts`.
- A-06-02 (full): applying `cumbia-latina-groove` sets `bpm = 120`; applying `cueca-chilena-folk` sets `bpm = 160`; applying a no-`defaultCpm` recipe leaves `bpm` unchanged — covered by `default-tempo.test.ts` + integration tests.
- A-06-03 (full): invariant 10 (defaultCpm in bpmRange) enforced by `recipes.test.ts` for all recipes with the field — confirmed by `pnpm test`.
- A-06-04 (full): PIXI canvas renders N dots per layer matching `layer.steps.length`; cueca layers (12 steps) show 12 dots; cumbia layers (16 steps) show 16 dots — confirmed by seam grep (`RSTEPS` no longer in per-layer loops) + `pnpm test` (no regressions in propagation tests).
- A-06-05 (full): seam grep returns zero new genre-name matches in plumbing; `defaultCpm` appears only in knowledge and test layers; `tsc --noEmit` + lint + test + build all pass — confirmed by quality gate.

**Validation:** all gate commands + seam grep recorded in the handoff with output.

**CHECKPOINT → Commit message:**
`chore(authentic-groove): Phase 06 step 06.4 — end-to-end tests + seam check + quality gate`

---

## Phase Acceptance

| ID | Description | Validation method |
|---|---|---|
| A-06-01 | `MusicalRecipe.defaultCpm?: number` field exists in the interface; conversion formula `bpm = defaultCpm * 4` used in `applyRecipeById`; no other arithmetic path | `tsc --noEmit`; recipe integrity tests |
| A-06-02 | Applying a recipe with `defaultCpm` sets `sessionStore.bpm` to `defaultCpm * 4`; applying a recipe without `defaultCpm` leaves `bpm` unchanged; `Transport.svelte` BPM display updates reactively via the store | unit: `default-tempo.test.ts`; integration: propagation |
| A-06-03 | Invariant: for every recipe with `defaultCpm`, `bpmRange[0] ≤ defaultCpm * 4 ≤ bpmRange[1]` — recipe integrity tests enforce this for all recipes | unit: `recipes.test.ts` |
| A-06-04 | PIXI rhythm canvas renders N dots per layer where N = `layer.steps.length`; cueca 12-step layers show 12 dots; cumbia 16-step layers show 16 dots; click-to-toggle works correctly for both step counts | `tsc --noEmit` (static); seam grep confirming per-layer loops use `.length`; `pnpm test` no regressions |
| A-06-05 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1831 + all new tests; `pnpm build` succeeds; seam grep: zero genre-name matches in `autopilot.ts` or `rhythm-scene.ts`; `defaultCpm` confined to `music-knowledge/` and tests | quality gate + seam grep recorded in handoff |

---

## Partial coverage from prior phase

From Phase 05 deferred items:
- 12-step grid UI support (cueca 6/8 display) — addressed by A-06-04 in this phase.
- All other Phase 05 deferred items remain unchanged:
  - Dimension 2 (per-hit accent/velocity variation) — permanently deferred per initiative scope.
  - Dimension 3 (swing/groove feel) — permanently deferred per initiative scope.
  - Pandeiro one-shots — no good CC0 source found; permanently deferred.
  - Guacharaca/scraper — EggShaker used as fallback; permanently deferred.
  - `applyLoadedSession` locked-field gap — documented in Phase 06 inventory §7; deferred to a future phase (the session correctly saves/parses `locked` but does not restore it on load).
  - Pentagrama `NoteSlot` free placement — carried from orbifold-v2 Ph10; permanently deferred.
  - Per-chord `lpf`/`lpq` slider D-3 — carried from harmonic-rhythm-improvements; permanently deferred.

---

## ADR Triggers

No new ADR is anticipated for this phase. Both features (tempo-per-recipe and dynamic step count) are additive extensions within the boundaries of ADR 0025 (seam definition) and AG-D1 (genre knowledge stays in `music-knowledge/`).

An ADR would be required if:
- The Pilot decides `defaultCpm` should be persisted in `SavedSessionSchema` — this would bump `SESSION_SCHEMA_VERSION` and require a migration. Surface as a blocker if raised.
- The dynamic step grid reveals a phase/step-count mismatch for non-12/16 patterns that requires a cross-engine contract change. Surface as a blocker if raised during step 06.3.

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/authentic-groove/handoffs/phase-06-handoff.md`. See `handoff-template.md`.
