<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 02 Inventory — Recipe Chip Affordance

**Produced by:** Dev (step 02.1)
**Date:** 2026-06-23
**Reads required:** CLAUDE.md, decisions.md (AG-D1 confirmed present), autopilot.ts,
recipe-engine.ts, rhythm-harmony-recipes.ts, apply.ts, AgentPanel.svelte, session.ts.

---

## §1 — Call path trace (end-to-end from chip tap to audio)

The intended call path: user taps chip → `applyRecipeById(id)` → `getRecipeById(id)` → `recipeToAgentOutput(recipe)` → `applyRhythmSpec(engineOutput.rhythm)` → `applySampleMap(recipe.sampleMap ?? {})` → `applyHarmonySpec(engineOutput.harmony)` → `setLastRecipeApplied(display)` → `requeueLive()`.

### Function status: does it exist? is it exported?

| Function | File | Exists | Exported | Notes |
|---|---|---|---|---|
| `applyRecipeById` | `src/agent/autopilot.ts` | **No** | **No** | This is the only missing piece. To be added in step 02.2. |
| `getRecipeById` | `src/core/music-knowledge/query.ts` | Yes | Yes | Line 70: `export function getRecipeById(id: string): MusicalRecipe \| undefined` |
| `recipeToAgentOutput` | `src/core/music-knowledge/recipe-engine.ts` | Yes | Yes | Line 170: `export function recipeToAgentOutput(recipe: MusicalRecipe, options?: RecipeEngineOptions): AgentOutput \| null` |
| `applyRhythmSpec` | `src/agent/apply.ts` | Yes | Yes | Line 65: `export function applyRhythmSpec(spec: RhythmSpec): void` |
| `applySampleMap` | `src/agent/apply.ts` | Yes | Yes | Line 264: `export function applySampleMap(map: Partial<Record<string, string>>): void` |
| `applyHarmonySpec` | `src/agent/apply.ts` | Yes | Yes | Line 126: `export function applyHarmonySpec(spec: HarmonySpec): void` |
| `setLastRecipeApplied` | `src/state/session.ts` | Yes | Yes | Line 651: `export function setLastRecipeApplied(display: LastRecipeDisplay \| null): void` |
| `requeueLive` | `src/state/session.ts` | Yes | Yes | Line 801: `export function requeueLive(): string \| null` |

### `requeueLive` synchrony confirmation

`requeueLive()` is declared as `export function requeueLive(): string | null` (line 801 of session.ts) — no `async`, no `Promise` return type. It is **synchronous**. No `await` is required when calling it from `applyRecipeById`.

### Current `applyPlanStep` wiring confirmation

`applySampleMap` is called inside `applyPlanStep` at autopilot.ts lines 135–140, immediately after `applyRhythmSpec`, in the recipe engine path (`step.musicalIntent?.recipeId` branch). The call sequence is:

1. `applyRhythmSpec(engineOutput.rhythm)` (line 134)
2. `applySampleMap(recipe.sampleMap ?? {})` (line 138) — ADR 0025 D4 wiring
3. `applyHarmonySpec(engineOutput.harmony)` (line 143)

The seam is correctly wired in the existing private path. The public `applyRecipeById` must replicate this order.

### `autopilot.ts` current imports (already present — no new imports needed for the wrapper)

The following are already imported at autopilot.ts lines 36–52:
- `sessionStore`, `setAutopilot`, `setLastRecipeApplied`, `playGroove`, `playProgression`, `playSession`, `requeueLive` from `'../state/session.js'`
- `LastRecipeDisplay` type from `'../state/session.js'`
- `applyRhythmSpec`, `applyHarmonySpec`, `applySampleMap` from `'./apply.js'`
- `getRecipeById` from `'../core/music-knowledge/query.js'`
- `recipeToAgentOutput` from `'../core/music-knowledge/recipe-engine.js'`

All dependencies of `applyRecipeById` are already imported. Step 02.2 only needs to add the exported function body — no new import lines are required.

---

## §2 — UI placement decision

### Current `AgentPanel.svelte` template structure (relevant section)

```
lines 585–604:  <div class="quick"> ... </div>       (quick prompts row)
lines 595–604:  <div class="toggles"> ... </div>     (autoplay/autofix toggles)
lines 612–758:  <div class="autopilot-section"> ...  (autopilot section — contains {#if autopilot.panelOpen})
lines 766–798:  {#if $sessionStore.lastRecipeApplied} ... {/if}  (existing recipe card)
lines 804–818:  <div class="agent-input"> ... </div> (input row)
```

### Insertion point

The recipe chip row should be inserted **between the `</div>` that closes `.toggles` (line 604) and `<div class="autopilot-section">` (line 612)**. This placement:

- Is **outside and above** `{#if autopilot.panelOpen}` — recipe chips are always visible regardless of autopilot config state.
- Is below the quick-prompts row and toggles row — semantically part of the "quick actions" affordances zone.
- Does NOT require opening the autopilot panel.

The active-recipe badge (a `{#if $sessionStore.lastRecipeApplied}<span class="recipe-badge">Recipe: {$sessionStore.lastRecipeApplied.recipeName}</span>{/if}`) will be placed immediately after the recipe-chips-row `</div>`, still outside `autopilot-section`.

**Note:** An existing recipe card (`div.recipe-card`) already appears at lines 766–798, rendered when `$sessionStore.lastRecipeApplied` is set. This card shows full detail (rhythmIds, harmonyId, density, explanation). The new badge specified in step 02.3 is a simpler inline pill adjacent to the chip row — distinct from the existing card. Step 02.3 must not duplicate or replace the existing recipe card; it adds a badge in the new chips zone only.

### Confirmation: recipe chip row is NOT inside `{#if autopilot.panelOpen}`

The insertion point is outside `<div class="autopilot-section">` entirely. The `{#if autopilot.panelOpen}` block (line 633) is inside `autopilot-section`. Recipe chips will never be gated by that conditional.

---

## §3 — `getExpressibleRecipes()` current return (live count)

### Expressibility filter logic (from recipe-engine.ts lines 101–111)

A `rhythmId` passes the filter iff:
- `strudelStrategy === 'euclid'` AND `euclid.n <= 16`, OR
- `strudelStrategy === 'struct'` AND `steps === 16`

A recipe passes iff every `rhythmId` in its `rhythmIds` array passes.

### Per-recipe expressibility audit

| # | Recipe ID | Rhythm IDs | Strategy (each) | n / steps (each) | Passes filter |
|---|---|---|---|---|---|
| 1 | `afro-cuban-clave-minor` | `son-clave-3-2` | struct | steps=16 | Yes |
| 2 | `west-african-bell-modal` | `bell-pattern-west-african` | euclid | n=12 | Yes |
| 3 | `bossa-nova-groove` | `bossa-nova-clave` | struct | steps=16 | Yes |
| 4 | `dorian-ritual-sparse` | `euclid-3-16` | euclid | n=16 | Yes |
| 5 | `latin-jazz-clave-swing` | `son-clave-2-3`, `cascara-euclid` | struct / euclid | steps=16 / n=16 | Yes |
| 6 | `pop-rock-backbeat` | `backbeat-snare`, `quarter-notes-16` | struct / euclid | steps=16 / n=16 | Yes |
| 7 | `aksak-dorian-odd` | `aksak-7-sparse` | euclid | n=7 | Yes |
| 8 | `west-african-triplet-groove` | `sparse-bell-12`, `minimal-12` | euclid / euclid | n=12 / n=12 | Yes |
| 9 | `rumba-blues-minor` | `rumba-clave-3-2` | struct | steps=16 | Yes |
| 10 | `gospel-soul-euclid` | `euclid-9-16` | euclid | n=16 | Yes |
| 11 | `cueca-chilena-folk` | `cueca-chilena-base` | euclid | n=12 | Yes |
| 12 | `samba-afro-brasileiro` | `samba-surdo-base`, `samba-caixa` | struct / struct | steps=16 / steps=16 | Yes |
| 13 | `buleria-flamenco-phrygian` | `buleria-12` | **struct** | **steps=12** | **No** |
| 14 | `cumbia-latina-groove` | `cumbia-caja` | struct | steps=16 | Yes |
| 15 | `candombe-dorian-groove` | `candombe-chico` | struct | steps=16 | Yes |

### Result

`getExpressibleRecipes()` currently returns **14 recipes**, not 15.

`buleria-flamenco-phrygian` is excluded because its single rhythm ID `buleria-12` is a `struct` entry with `steps: 12` (rhythm-catalog.ts line 719). The expressibility filter requires `struct` entries to have `steps === 16`. A 12-step struct pattern cannot be expressed by the current `AgentOutputSchema` (which requires a length-16 `steps` array).

### Open decision surfaced — Pilot must resolve before step 02.2

The phase header states "All 15 expressible recipe chips are visible and operable" and Phase Acceptance A-02-01 says "all 15 currently in catalog." However, `getExpressibleRecipes()` will return only 14 chips in the current implementation.

Two options:

**Option A (recommended):** Accept 14 chips. Update the phase acceptance ID A-02-01 description to read "14 expressible recipe chips" and note that `buleria-flamenco-phrygian` is excluded because its 12-step struct rhythm is not expressible. The Phase 02 goal is met: all _expressible_ recipes get chips; non-expressible ones are silently excluded per OD-3 Option B (upstream filter).

**Option B:** Make `buleria-12` expressible by converting it from a 12-step struct to a 16-step struct (zero-padding to fill beat 3 and 4), or add an alternate euclid approximation rhythm ID to the recipe. This would bring the count to 15 but changes a rhythm entry and requires a Pilot decision on whether to alter the musical data.

**Pilot must choose A or B before step 02.2.** If A is chosen, no additional changes are needed. If B is chosen, the inventory for steps that touch `rhythm-harmony-recipes.ts` or `rhythm-catalog.ts` must be revisited.

---

## §4 — AG-D1 seam impact

### What the seam grep covers

The AG-D1 seam invariant (decisions.md, ADR 0025 D3) requires: no genre name and no hardcoded sample map outside `src/core/music-knowledge/`. From Phase 01 step 01.5, the seam grep was:

```bash
git grep -n --include="*.ts" --include="*.svelte" \
  -E "(cumbia|samba|cueca|candombe|buleria|flamenco|rumba|bossa|clave|afro-cuban|west-african|cascara|aksak|gospel|dorian|milonga|perc|cb|sd_fallback)" \
  -- src/ ':!src/core/music-knowledge/'
```

(The exact command may differ; the principle is grep for genre tokens and sample-name literals in `src/` excluding `src/core/music-knowledge/`.)

### What Phase 02 adds

Step 02.3 modifies `src/ui/AgentPanel.svelte`. The UI component will:
- Import `getExpressibleRecipes` — returns `MusicalRecipe[]`.
- Import `applyRecipeById` — receives a `string` id.
- Iterate `expressibleRecipes` — each item is a `MusicalRecipe` with `recipe.id` and `recipe.name`.
- Render chip buttons using `recipe.name` (human-readable display string, not a seam violation) and call `applyRecipeById(recipe.id)` on tap.
- Render the badge from `$sessionStore.lastRecipeApplied.recipeName` (also a display string, not a sample literal).

**No genre name or sample-name literal appears in the UI file.** Passing only `recipe.id` (an opaque string handle) and `recipe.name` (a display string) satisfies the seam. Genre→sample mapping remains entirely in `rhythm-harmony-recipes.ts` inside `src/core/music-knowledge/`.

### Extended seam grep (no change to command needed)

The same grep command from Phase 01 also covers `.svelte` files via `--include="*.svelte"`. No extension is needed. The new `AgentPanel.svelte` content will be covered automatically.

The specific sample-name literals introduced in Phase 01 (`perc`, `cb`, `sd`, `bd`) must not appear in `src/ui/`. These are abstract Strudel sound names. A grep scoped to `src/ui/` can additionally check:

```bash
git grep -n -E "'\''(perc|cb|bd)'\''|\"(perc|cb|bd)\"" -- src/ui/
```

Zero hits required (these names may appear as default sound fallbacks in core or as CSS class names elsewhere, but should never be hardcoded in the UI layer).

---

## Files that will be touched in steps 02.2–02.4

| File | Step | Change |
|---|---|---|
| `src/agent/apply.ts` | 02.2 | Add `setLastRecipeApplied(null)` at top of `applyRhythmSpec` and `applyHarmonySpec` |
| `src/agent/autopilot.ts` | 02.2 | Add exported `applyRecipeById(id: string): boolean` function |
| `tests/authentic-groove/apply-recipe-by-id.test.ts` | 02.2 | New test file (AGPL-3.0 header) |
| `src/ui/AgentPanel.svelte` | 02.3 | Add recipe chips row + badge; import `getExpressibleRecipes` + `applyRecipeById` |
| `docs/authentic-groove/handoffs/phase-02-handoff.md` | 02.1–02.4 | Handoff entries appended per step |

No new dependencies. No schema version changes. No environment, CI, or build changes.

---

## Existing behavior to preserve

- `applyPlanStep` in `autopilot.ts` is private and must remain unchanged.
- The existing recipe card at `AgentPanel.svelte` lines 766–798 (showing full detail from `$sessionStore.lastRecipeApplied`) must remain unmodified.
- `SESSION_SCHEMA_VERSION = 5`, `SCHEMA_VERSION = 6` — no bumps in this phase.
- Autopilot plan consumption (ADR 0024) continues unchanged.
- The `{#if autopilot.panelOpen}` gate for config options is unchanged.

## New behavior introduced

- `applyRhythmSpec` and `applyHarmonySpec` clear `lastRecipeApplied` on entry (badge invalidation).
- `applyRecipeById(id)` applies rhythm + sampleMap + harmony + badge in the correct order and returns a boolean.
- Recipe chips row appears always-visible in the Agent panel (outside autopilot config panel).
- Active-recipe badge shows `recipeName` when `lastRecipeApplied` is set.

## Tests to add

- `tests/authentic-groove/apply-recipe-by-id.test.ts` (new, per step 02.2 spec).

## Project-specific verifications (CLAUDE.md)

- Seam grep (AG-D1): zero hits in `src/` excluding `src/core/music-knowledge/` for genre names and sample literals.
- `tsc --noEmit` clean.
- `pnpm lint` clean.
- `pnpm test` ≥ 1673 + new tests.
- `pnpm build` succeeds.
- AGPL-3.0 header present on all new files.
