<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 02 — Recipe Chip Affordance

**Purpose:** Add an explicit recipe chip row to the Agent panel so the user can intentionally apply any expressible genre recipe — full rhythm, harmony, and sample palette in one tap — through the same code path the autopilot uses.

**Gate:** Phase 01 complete and merged to `main`; `pnpm test` passes at 1673; `SCHEMA_VERSION = 6`; `SESSION_SCHEMA_VERSION = 5`; `applySampleMap` wired in `autopilot.ts` after `applyRhythmSpec`.

**Expected phase result:** A "Recipes" chip row appears in the Agent panel. Tapping any chip applies that recipe's rhythm, harmony, and `strudelSample` overlay (via the shared `applyRecipeById` function) and re-queues audio at the next cycle. A badge "Recipe: [name]" appears while that recipe is the active state; manually changing rhythm or harmony clears the badge (the session has diverged from the recipe). The autopilot `applyPlanStep` path is unchanged and continues to work. The seam invariant AG-D1 continues to hold (no genre name outside `src/core/music-knowledge/`). All expressible recipe chips are visible and operable (14 of the 15 catalog entries — `buleria-flamenco-phrygian` excluded because its 12-step struct pattern does not pass the expressibility filter; Pilot decision 2026-06-23).

---

## Architectural note (hard invariant for every step)

The chip tap must go through `applyRecipeById` — a thin exported wrapper around the same recipe-lookup + apply logic that `applyPlanStep` uses inside `autopilot.ts`. This guarantees:

- `applySampleMap` always fires when a recipe has a `sampleMap` (no silent omission).
- The UI component reads only `recipe.id` and `recipe.name` from the catalog; it does not hardcode any genre→sample mapping.
- The seam grep (AG-D1 / ADR 0025 D3) continues to return zero matches outside `src/core/music-knowledge/`.

**Tripwire:** if `AgentPanel.svelte` (or any other UI file) calls `applyRhythmSpec` directly without following it with `applySampleMap`, the call path is broken — stop and fix before continuing.

---

## Step 02.1 — Inventory

PROMPT → Read the source-of-truth files and produce `docs/authentic-groove/inventories/phase-02-inventory.md`. Do NOT write any source file. STOP for Pilot review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (confirm AG-D1 and ADR 0025 entries are present)
3. `src/agent/autopilot.ts` (full — particularly `applyPlanStep` and its recipe-application block, lines 110–164; confirm `applySampleMap` is wired after `applyRhythmSpec`)
4. `src/core/music-knowledge/recipe-engine.ts` (full — `getExpressibleRecipes`, `recipeToAgentOutput`)
5. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — confirm 15 recipes, which have `sampleMap`, which do not)
6. `src/agent/apply.ts` (full — `applySampleMap` signature and behavior)
7. `src/ui/AgentPanel.svelte` (full — locate the harmony preset chips block, lines 686–700; understand the `autopilot-config` context; identify the best insertion point for recipe chips)
8. `src/state/session.ts` (the `requeueLive` export and its contract — confirm it re-evaluates the current Strudel code at the next cycle boundary)

**Inventory sections (all four required):**

**§1 — Call path trace (end-to-end from chip tap to audio).**
Trace the intended call path: user taps chip → `applyRecipeById(id)` (to be exported from `autopilot.ts`) → `getRecipeById(id)` → `recipeToAgentOutput(recipe)` → `applyRhythmSpec(engineOutput.rhythm)` → `applySampleMap(recipe.sampleMap ?? {})` → `applyHarmonySpec(engineOutput.harmony)` → `setLastRecipeApplied(display)` → `requeueLive()`. For each step: confirm the function already exists, its import path, and whether it is currently exported. Identify the only missing piece: `applyRecipeById` is not yet exported from `autopilot.ts`. Confirm `requeueLive` is synchronous and does not require `await`.

**§2 — UI placement decision.**
Describe where in `AgentPanel.svelte` the recipe chip row should appear. The harmony preset chips are inside `{#if autopilot.panelOpen}` (autopilot config panel). Recipe chips are a user-facing content affordance — they should be accessible without opening the autopilot panel. Identify the exact insertion point (which element they follow, which they precede). Confirm the recipe chip row is NOT inside `{#if autopilot.panelOpen}`.

**§3 — `getExpressibleRecipes()` current return (live count).**
Call `getExpressibleRecipes()` conceptually: read `RHYTHM_HARMONY_RECIPES` and `RHYTHM_CATALOG` to determine how many recipes currently pass the expressibility filter. Record each recipe's `id` and `name`. Identify whether any recipe currently in the catalog would be excluded (i.e., has a `rhythmId` that is neither `euclid`-expressible with `n <= 16` nor `struct`-expressible with `steps === 16`). State the expected chip count.

**§4 — AG-D1 seam impact.**
Describe what the seam grep command from inventory §5 of Phase 01 must also cover after Phase 02: the new UI file `AgentPanel.svelte` must introduce no genre name or sample-name literal. Confirm that passing only `recipe.id` and `recipe.name` to the template satisfies the seam. State the exact `git grep` extension needed (if any) to verify the UI file addition.

**Implementation requirements:** Read only. Produce the inventory file. Touch no `.ts` or `.svelte` files.

**Validation:**
- `git status` → only the inventory file and the handoff entry are new/modified.

**CHECKPOINT → Commit message:**
`docs(authentic-groove): Phase 02 step 02.1 — recipe chip affordance inventory`

**STOP for Pilot review.** Inventory is the gate for step 02.2.

---

## Step 02.2 — `applyRecipeById` wrapper (autopilot.ts export)

PROMPT → Read the inventory and add a single exported function `applyRecipeById` to `autopilot.ts`. No UI changes in this step.

**Required reading (in order):**
1. `docs/authentic-groove/inventories/phase-02-inventory.md` §1 (call path trace)
2. `docs/authentic-groove/decisions.md` (AG-D1 / ADR 0025 D3 — seam invariant)
3. `src/agent/autopilot.ts` (full — before editing; understand `applyPlanStep` block lines 110–164)
4. `src/agent/apply.ts` (full — before editing; understand `applyRhythmSpec`, `applyHarmonySpec`, `applySampleMap` signatures)
5. `src/state/session.ts` (confirm `requeueLive`, `setLastRecipeApplied`, `playGroove`, `playSession`, `playProgression` — all already imported in `autopilot.ts`)

**What to produce:**

`src/agent/apply.ts` — invalidation of active recipe badge:
- At the **top** of `applyRhythmSpec` (before any store mutation), call `setLastRecipeApplied(null)`. Import `setLastRecipeApplied` from `'../state/session.js'` if not already imported.
- At the **top** of `applyHarmonySpec`, do the same.
- Rationale: any manual or agent-driven rhythm/harmony change invalidates the recipe badge. `applyRecipeById` calls these functions and then calls `setLastRecipeApplied(display)` after, so the badge is correctly re-set for recipe applications (last write wins).

`src/agent/autopilot.ts`:
- Add exported function `applyRecipeById(id: string): boolean` after `applyPlanStep`.
- JSDoc: "Apply a recipe by ID through the same path as autopilot plan steps (ADR 0025 D4). Looks up the recipe, calls applyRhythmSpec + applySampleMap + applyHarmonySpec + setLastRecipeApplied, then requeueLive(). Returns true if the recipe was found and applied; false if the ID is unknown or the recipe is not expressible. No LLM call is made. Called from the UI recipe chip row."
- Implementation:
  1. `const recipe = getRecipeById(id)`: if undefined, return false.
  2. `const engineOutput = recipeToAgentOutput(recipe)`: if null, return false (non-expressible).
  3. `applyRhythmSpec(engineOutput.rhythm)` — this clears `lastRecipeApplied` (apply.ts change above).
  4. `applySampleMap(recipe.sampleMap ?? {})` — ADR 0025 D4.
  5. `applyHarmonySpec(engineOutput.harmony)` — this clears `lastRecipeApplied` again.
  6. Build `display: LastRecipeDisplay` (same shape as in `applyPlanStep`): `{ recipeId: recipe.id, recipeName: recipe.name, rhythmIds: recipe.rhythmIds, harmonyId: recipe.harmonyId, density: recipe.density }`.
  7. `setLastRecipeApplied(display)` — re-sets the badge (last write wins over the clears in steps 3 + 5).
  8. `requeueLive()`.
  9. Auto-play if nothing is currently playing (same heuristic as `tick()` Path A): read `get(sessionStore).nowPlaying.label`; if null, check `hasRhythm` / `hasHarmony` and call `playSession()`, `playGroove()`, or `playProgression()` accordingly (fire-and-forget, same pattern as `tick()` lines 205–216).
  10. Return true.
- Do NOT modify `applyPlanStep` — it remains private and unchanged.
- Do NOT add any genre name or sample-name literal (seam invariant AG-D1).

New `tests/authentic-groove/apply-recipe-by-id.test.ts` (AGPL-3.0 header):
- Applying a known recipe ID (e.g. `'cumbia-latina-groove'`) → returns true; session rhythm layers carry `strudelSample: 'perc'` on the `bd` slot; `lastRecipeApplied.recipeId` equals `'cumbia-latina-groove'`.
- Applying a recipe with no `sampleMap` (e.g. `'pop-rock-backbeat'`) → returns true; no layer carries `strudelSample`; `lastRecipeApplied.recipeId` equals `'pop-rock-backbeat'`.
- Applying an unknown ID → returns false; store is unchanged; `lastRecipeApplied` is unchanged.
- Applying a recipe that `recipeToAgentOutput` cannot express (mock or skip if all current recipes are expressible — document which case applies and why).
- After `applyRhythmSpec` is called directly (simulating a manual rhythm change), `lastRecipeApplied` is undefined — badge invalidation test.

**Constraints:** No DOM or Svelte imports in `autopilot.ts` (already respected — keep it that way). No genre name or sample literal outside `src/core/music-knowledge/`. AGPL-3.0 header on new test file. `SCHEMA_VERSION` stays 6; `SESSION_SCHEMA_VERSION` stays 5.

**Acceptance criteria in this step:**
- A-02-03 (partial): `applyRecipeById` applies rhythm + sample overlay + harmony in the correct order — unit tests confirm.
- A-02-04 (partial): `applyRecipeById` returns false for unknown IDs and non-expressible recipes — unit tests confirm.
- A-02-07 (partial): calling `applyRhythmSpec` or `applyHarmonySpec` directly clears `lastRecipeApplied` — unit test confirms.
- A-02-05 (partial): `tsc --noEmit` clean; `pnpm test` ≥ 1673 + new tests.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run apply-recipe-by-id` → new tests pass
- `pnpm test` → no regressions (≥ 1673 + new tests)
- `git status` → only `src/agent/apply.ts` (modified), `src/agent/autopilot.ts` (modified), `tests/authentic-groove/apply-recipe-by-id.test.ts` (new), handoff entry

**Commit message:**
`feat(agent): Phase 02 step 02.2 — applyRecipeById wrapper + badge invalidation`

---

## Step 02.3 — Recipe chip row in AgentPanel

PROMPT → Read the inventory §2 (UI placement) and add the recipe chip row and active-recipe badge to `AgentPanel.svelte`. Import `getExpressibleRecipes` from the recipe engine; import `applyRecipeById` from autopilot; render one chip per expressible recipe; show a badge when `$sessionStore.lastRecipeApplied` is set.

**Required reading (in order):**
1. `docs/authentic-groove/inventories/phase-02-inventory.md` §2 (exact insertion point), §3 (expected chip count), §4 (seam impact)
2. `src/ui/AgentPanel.svelte` (full — before editing)
3. `src/core/music-knowledge/recipe-engine.ts` (confirm `getExpressibleRecipes` export and `MusicalRecipe` type)
4. `src/agent/autopilot.ts` (confirm `applyRecipeById` export from step 02.2)
5. `docs/authentic-groove/decisions.md` (AG-D1 — seam invariant: no genre name in UI file)

**What to produce:**

`src/ui/AgentPanel.svelte` — `<script>` block additions:
- Import `getExpressibleRecipes` from `'../core/music-knowledge/recipe-engine.js'`.
- Import `applyRecipeById` from `'../agent/autopilot.js'`.
- Compute `const expressibleRecipes = getExpressibleRecipes()` (static — computed once at module load, same pattern as `families` Map).
- No other script changes.

`src/ui/AgentPanel.svelte` — template additions (per inventory §2 placement):
- Add a `<div class="recipe-chips-row">` block at the exact insertion point from inventory §2 (outside and above the `autopilot-section`; below the `quick` prompts row and `toggles` row).
- Inside the row: a label ("Recipes:" or existing i18n key — do NOT add new i18n keys); then for each recipe in `expressibleRecipes`, a `<button class="recipe-chip">` with `on:click={() => applyRecipeById(recipe.id)}` and text `recipe.name`.
- Immediately after the chip row (still outside `autopilot-section`), add an active-recipe badge: `{#if $sessionStore.lastRecipeApplied}<span class="recipe-badge">Recipe: {$sessionStore.lastRecipeApplied.recipeName}</span>{/if}`.
- No disabled state on chips — always enabled.
- No genre-specific inline content, no hardcoded sample names, no genre token in the template.

CSS — add to the `<style>` block:
- `.recipe-chips-row` — `display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0;`
- `.recipe-chip` — visual style consistent with `.preset-chip` (same padding, border-radius, background, font-size). No `active` variant needed (stateless affordance).
- `.recipe-badge` — small pill below the chip row, subdued color (e.g. opacity 0.7), indicates the active recipe name. Style consistent with the overall panel aesthetic.

**Constraints:** No genre name or sample-name literal in the template or script. `recipe.id` is used only as the argument to `applyRecipeById` — not rendered. Recipe names (`recipe.name`, `recipeName`) are display strings, not seam violations. Do not add new i18n keys. AGPL-3.0 header already present — do not modify it.

**Acceptance criteria in this step:**
- A-02-01 (partial): the recipe chip row is visible in the Agent panel with one chip per expressible recipe — verified by `pnpm build` success and code review.
- A-02-02 (partial): tapping a chip calls `applyRecipeById` with the correct recipe ID — verified by code review.
- A-02-07 (partial): the badge renders `$sessionStore.lastRecipeApplied.recipeName` when set, and is absent when `lastRecipeApplied` is undefined — verified by code review.
- A-02-05 (partial): `tsc --noEmit` clean; `pnpm test` ≥ prior + no regressions.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm test` → no regressions
- `pnpm build` → succeeds
- `git status` → only `src/ui/AgentPanel.svelte` (modified), handoff entry

**Commit message:**
`feat(ui): Phase 02 step 02.3 — recipe chip row + active-recipe badge in AgentPanel`

---

## Step 02.4 — Seam fitness check + full quality gate

PROMPT → Run the architectural seam fitness check (AG-D1 / ADR 0025 D3 extended to cover the new UI file) and the full quality gate; record all output in the handoff.

**Required reading:**
1. `docs/authentic-groove/inventories/phase-02-inventory.md` §4 (the extended seam grep)
2. `docs/authentic-groove/handoffs/phase-02-handoff.md` (confirm 02.2 and 02.3 are APPROVED)
3. `docs/adr/0025-authentic-sample-palette.md` (D3 — seam invariant definition)

**What to produce:**

Run and record the seam fitness check. The base command from Phase 01 step 01.5 covers source files under `src/`. Extend it to confirm `src/ui/AgentPanel.svelte` introduces no genre name or genre-specific sample literal. The exact command should be the Phase 01 command extended per inventory §4. Paste the command and its (empty or zero-hit) output into the handoff.

Additionally, grep for the sample-name literals introduced in Phase 01 (`perc`, `cb`, `sd`, `bd`) scoped to `src/ui/` — confirm none appear there (these are abstract Strudel sound names that would indicate a seam violation if present in the UI layer).

Run and record the full quality gate:
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

**Reversibility / flag-off note (required per CLAUDE.md), verbatim in handoff:**
- Removing the recipe chip row and badge (reverting `AgentPanel.svelte`) restores prior behavior with no other change; `applyRecipeById` in `autopilot.ts` is inert without a caller.
- Reverting the `applyRhythmSpec`/`applyHarmonySpec` invalidation calls in `apply.ts` restores the prior badge non-clearing behavior; `lastRecipeApplied` was already ephemeral before this phase.
- `applyRecipeById` with an unrecognized ID is a silent no-op (returns false, no store mutation).
- Pre-Phase-02 sessions have no recipe-chip state; loading them is unchanged (no new persisted field added in this phase).
- The autopilot `applyPlanStep` path is unchanged — the autopilot continues to work identically whether or not the recipe chips are used.

**Acceptance criteria in this step:**
- A-02-05 (full): `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1673 + all new tests; `pnpm build` succeeds.
- A-02-06 (full): seam grep returns zero matches for genre names and sample literals outside `src/core/music-knowledge/` (including the UI layer).

**Validation:** all gate commands + the grep recorded in the handoff with output.

**Commit message:**
`chore(authentic-groove): Phase 02 step 02.4 — seam fitness check + quality gate`

---

## Phase Acceptance

| ID | Description | Validation method |
|---|---|---|
| A-02-01 | A recipe chip row is visible in the Agent panel, showing one chip per expressible recipe (all 15 currently in catalog) | live-system: pnpm build succeeds + chip count matches `getExpressibleRecipes().length` in code review |
| A-02-02 | Tapping a chip applies the full recipe — rhythm, harmony, AND sample overlay (`strudelSample`) — through `applyRecipeById`, which calls `applyRhythmSpec` + `applySampleMap` + `applyHarmonySpec` in the correct order | unit: `apply-recipe-by-id.test.ts` |
| A-02-03 | Applying the cumbia recipe via chip results in session rhythm layers carrying `strudelSample: 'perc'` on the bd slot; codegen emits authentic sample names | unit: `apply-recipe-by-id.test.ts` |
| A-02-04 | `applyRecipeById` returns false and leaves the store unchanged for unknown or non-expressible recipe IDs | unit: `apply-recipe-by-id.test.ts` |
| A-02-05 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1673 + new tests; `pnpm build` succeeds | live-system: recorded in handoff |
| A-02-06 | No genre name or sample-name literal appears in `src/` outside `src/core/music-knowledge/`, including the new UI changes (seam invariant AG-D1) | live-system: `git grep` recorded in handoff |
| A-02-07 | A badge showing "Recipe: [name]" appears while `lastRecipeApplied` is set; calling `applyRhythmSpec` or `applyHarmonySpec` directly clears it (session has diverged from the recipe) | unit: `apply-recipe-by-id.test.ts`; code review of badge template |

---

## Partial coverage from prior phase

No prior partials to address from Phase 01 — all six Phase 01 acceptance criteria were fully covered. The deferred dimensions (per-hit velocity, swing, polyrhythmic layering) remain out of scope here.

---

## ADR Triggers

No new ADRs anticipated for this phase. The call-path design (UI → `applyRecipeById` → existing apply helpers) is a straightforward extension of ADR 0025 D4 (the established propagation mechanism). If the inventory reveals a structural conflict requiring a governance decision, the Dev surfaces it as a blocker before writing code.

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/authentic-groove/handoffs/phase-02-handoff.md`. See `handoff-template.md`.
