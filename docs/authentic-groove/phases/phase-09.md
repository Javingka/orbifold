<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 09 — Rhythm-Section UI: Sound Palette Expansion, Step Editor, Orbit Sound Switcher

**Purpose:** Complete the `authentic-groove` initiative with three user-facing rhythm-section features: (1) expand the `Sound` type and pickers to include all 16 available sounds, (2) add a `StepEditor.svelte` component — a traditional step-sequencer grid below the layer list — and (3) add a sound-switcher button on the orbit hover overlay so users can change a layer's sound without opening the header.

**Gate:** Phase 08 complete and merged to `main`; `pnpm test` passes at 1994; all 15 recipes have `layers` and `defaultCpm`; AG-D1 seam invariant in force.

**Expected phase result:** The app exposes all 16 sounds in every picker and sound dropdown; a per-layer toggle-button grid adapts automatically to each recipe's native step count (7/12/16); the orbit overlay sports a sound button with a grouped dropdown; the quality gate passes clean; the initiative-close block is appended to the handoff.

---

## Architecture constraints for every step

**AG-D1 seam invariant (Decisions Register, 2026-06-23):** `RhythmLayer`, codegen (`src/core/codegen/`), `persistence.ts`, and any generic plumbing helper (`src/agent/apply.ts`) must contain **no genre name** and **no hardcoded sample map**. The codegen only knows "emit `strudelSample` when present, else `sound`." The Sound type expansion in this phase is a *palette* change (adding generic instrument names), not a genre-knowledge change — it is permitted in `layers.ts`. Run the seam grep before committing each step (see Step 09.4).

**ADR 0025 D1 (layers.ts):** `Sound` is the abstract role; `strudelSample` is the concrete sample override. Expanding `Sound` to include additional palette names (`conga`, `cajon`, etc.) does NOT conflate the two — these are still abstract UI role names; `strudelSample` may or may not be set on any given layer.

**No ADR is anticipated for this phase.** All changes are additive (new Sound values, new component, new UI affordance); no new governance decision is required. Surface a blocker if an unexpected constraint surfaces.

---

## Step 09.1 — Sound type expansion (all 16 sounds)

PROMPT → Read `docs/authentic-groove/phases/phase-09.md` (this file). Read `src/core/rhythm/layers.ts`, `src/agent/schema.ts`, `src/agent/apply.ts`, `src/lib/persistence.ts`, `src/core/music-knowledge/recipe-engine.ts`, and `src/ui/Header.svelte` in full before editing. Expand the `Sound` type to 16 values and update all downstream arrays and the Header.svelte picker. Add tests verifying new sounds are valid `Sound` values and pass schema validation. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1 and ADR 0025 D1 — palette name vs genre name distinction)
3. `docs/authentic-groove/phases/phase-09.md` (this file)
4. `src/core/rhythm/layers.ts` (full — current `Sound` type, `RhythmLayer`, `rhythmLayerToStrudelLine`)
5. `src/agent/schema.ts` (lines 1–90 — `SK_SOUNDS`, the schema constants, `RhythmLayerStepsSchema`, `RhythmLayerEuclidSchema`)
6. `src/agent/apply.ts` (lines 1–50 — the local `SK_SOUNDS` readonly array on line 40)
7. `src/lib/persistence.ts` (lines 1–110 — `SK_SOUNDS` const on line 23, `SavedRhythmLayerSchema`, `SESSION_SCHEMA_VERSION`)
8. `src/core/music-knowledge/recipe-engine.ts` (lines 78–90 — `LAYER_SOUNDS` and `soundForIndex`)
9. `src/ui/Header.svelte` (lines 439–449 — the `<select id="euclidSound">` options)
10. `src/audio/sample-map.ts` (full — which FreePats names are registered: `conga`, `cajon`, `wood`, `shaker`)

**Verified available sounds (do NOT deviate from this list):**

| Group | Sounds | Source |
|---|---|---|
| Dirt-Samples standard | `bd`, `sd`, `hh`, `oh`, `cp`, `rim`, `lt`, `mt`, `ht` | Bundled with `@strudel/web@1.0.3` |
| FreePats CC0 (local) | `conga`, `cajon`, `wood`, `shaker` | Registered via `samples()` in `initAudio()` (Phase 04, `src/audio/sample-map.ts`) |
| Dirt-Samples additional | `cb`, `perc`, `hand` | Present in `tidalcycles/Dirt-Samples` strudel.json (confirmed Phase 01 + Phase 03 inventories) |

Total: 16 sounds.

**What to produce:**

**`src/core/rhythm/layers.ts`** — expand the `Sound` type:

```typescript
export type Sound =
  | 'bd' | 'sd' | 'hh' | 'oh' | 'cp' | 'rim' | 'lt' | 'mt' | 'ht'  // Dirt-Samples standard
  | 'conga' | 'cajon' | 'wood' | 'shaker'                             // FreePats CC0 (local, Phase 04)
  | 'cb' | 'perc' | 'hand';                                           // Additional Dirt-Samples
```

No other change to `layers.ts` — `RhythmLayer` and `rhythmLayerToStrudelLine` are unchanged.

**`src/agent/schema.ts`** — update the local `SK_SOUNDS` const (line 32) to include all 16 values. Order: same logical grouping as above. The `z.enum(SK_SOUNDS)` in `RhythmLayerStepsSchema` and `RhythmLayerEuclidSchema` automatically accepts all 16 once `SK_SOUNDS` is updated.

```typescript
const SK_SOUNDS = [
  'bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'mt', 'ht',
  'conga', 'cajon', 'wood', 'shaker',
  'cb', 'perc', 'hand',
] as const;
```

**`src/agent/apply.ts`** — update the local `SK_SOUNDS` readonly array (line 40) to include all 16 values (same order as schema.ts). This array is used for sound validation in `applyRhythmSpec`.

**`src/lib/persistence.ts`** — update the `SK_SOUNDS` const (line 23) to include all 16 values. `SavedRhythmLayerSchema` uses `z.enum(SK_SOUNDS)` for the `sound` field — the expansion is additive and backward-compatible: pre-Phase-09 sessions with the original 9-sound values still parse cleanly.

**No `SESSION_SCHEMA_VERSION` bump** — the change is additive (new enum values accepted; old values still accepted). Pre-Phase-09 sessions with `sound: 'bd'` etc. parse with no change. Consistent with the precedent in ADR 0025 D7.

**`src/core/music-knowledge/recipe-engine.ts`** — `LAYER_SOUNDS` (line 81) and `SkSound` type (line 84) both reference the old 9-value set. Update `SkSound` to match the new 16-value `Sound` type:

```typescript
type SkSound = Sound; // re-use the full Sound type from layers.ts
```

Import `Sound` from `../../core/rhythm/layers.js` (it is already imported transitively in some files; verify the import chain in recipe-engine.ts). `LAYER_SOUNDS` itself (the assignment-by-index array for legacy `rhythmIds`-only recipes) does NOT need to include all 16 sounds — it is an ordered assignment list, not an exhaustive enumeration. However, any value in `LAYER_SOUNDS` must be a valid member of the new `Sound` type. Current values `['bd', 'hh', 'sd', 'oh', 'cp', 'rim']` are all still valid — no change to the array contents. Only the type annotation changes (`SkSound` → `Sound`).

**`src/ui/Header.svelte`** — replace the hardcoded `<option>` list in `<select id="euclidSound">` (lines 440–448) with the full 16 options, grouped by `<optgroup>`:

```html
<select id="euclidSound" bind:value={euclidSound} data-tip={$t('header.rhythm.soundTip')}>
  <optgroup label="Drum kit">
    <option value="bd">bd</option>
    <option value="sd">sd</option>
    <option value="hh">hh</option>
    <option value="oh">oh</option>
    <option value="cp">cp</option>
    <option value="rim">rim</option>
    <option value="lt">lt</option>
    <option value="mt">mt</option>
    <option value="ht">ht</option>
  </optgroup>
  <optgroup label="Percussion">
    <option value="conga">conga</option>
    <option value="cajon">cajon</option>
    <option value="wood">wood</option>
    <option value="shaker">shaker</option>
    <option value="cb">cb</option>
    <option value="perc">perc</option>
    <option value="hand">hand</option>
  </optgroup>
</select>
```

The `euclidSound` reactive variable is bound here — the `Sound` type must be satisfied. After the `Sound` type expansion, `euclidSound` typed as `Sound` (or inferred from the bound `<select>`) will accept all 16 values.

**Tests:**

In an appropriate test file (create `tests/authentic-groove/sound-palette.test.ts` if no existing file fits):

- A-09-01: Import `Sound` from `src/core/rhythm/layers.ts`. Assert via TypeScript that the literal `'conga'` satisfies the `Sound` type (write a typed variable: `const s: Sound = 'conga'`). This is a `tsc --noEmit` compile-time assertion — the test file just needs to compile.
- A-09-01: Assert that the `SK_SOUNDS` array in `src/agent/schema.ts` (accessed via `AgentLayerSchema.shape.sound` or by re-importing the constant) includes `'conga'`, `'shaker'`, `'cb'`, `'perc'`, `'hand'`.
- A-09-01: Verify that `z.enum(['conga', 'shaker', 'cajon', 'wood', 'cb', 'perc', 'hand'] as const)` all parse successfully via the schema's sound enum (use `AgentLayerSchema.safeParse` or equivalent to confirm a layer with `sound: 'conga'` does not fail validation).
- A-09-03: Assert that `SK_SOUNDS` exported from `src/agent/schema.ts` has length 16 (all 16 sounds).

If direct export of `SK_SOUNDS` is not available (it may be `const` not `export const`), test via behavior: construct a minimal `{ sound: 'conga', steps: Array(16).fill(0) }` object and verify it passes the Zod layer schema.

**Constraints:**
- Changes confined to: `src/core/rhythm/layers.ts`, `src/agent/schema.ts`, `src/agent/apply.ts`, `src/lib/persistence.ts`, `src/core/music-knowledge/recipe-engine.ts`, `src/ui/Header.svelte`, and `tests/`.
- AG-D1 seam: `conga`, `cajon`, `wood`, `shaker`, `cb`, `perc`, `hand` are palette names, not genre identifiers. Their presence in `layers.ts` (the plumbing layer) is permitted per ADR 0025 D1 — they are abstract Sound role names. Run seam grep to confirm zero genre-name matches outside `src/core/music-knowledge/`.
- AGPL-3.0 header on all files (already present — do not remove).

**Validation:**
- `pnpm exec tsc --noEmit` → clean (the `const s: Sound = 'conga'` must compile)
- `pnpm exec vitest run sound-palette` → new tests pass
- `pnpm test` → no regressions (≥ 1994)

**CHECKPOINT → Commit message:**
`feat(rhythm): Phase 09 step 09.1 — expand Sound type to 16 sounds including FreePats`

---

## Step 09.2 — StepEditor component + integration

PROMPT → Read `docs/authentic-groove/phases/phase-09.md` (this file). Read `src/ui/Header.svelte` in full, `src/state/session.ts` (the `RhythmLayer` and `sessionStore` shape), and `src/agent/apply.ts` (for `requeueLive`). Create `src/ui/StepEditor.svelte` and integrate it into `Header.svelte`. Add unit tests for step-count, lock guard, and recipe-adaptive grid. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1)
3. `docs/authentic-groove/phases/phase-09.md` (this file)
4. `src/state/session.ts` (full — `SessionState`, `RhythmLayer`, `sessionStore`, exported stores and helpers)
5. `src/agent/apply.ts` (scan for `requeueLive` — confirm it exists and its call signature)
6. `src/ui/Header.svelte` (full — find where to insert the `<StepEditor>` mount; understand how `sessionStore` is used in this file; confirm `requeueLive` is imported or available)
7. `src/core/music-knowledge/recipe-engine.ts` (confirm `recipeById` or equivalent to apply a test recipe in tests)
8. `tests/authentic-groove/propagation.test.ts` (scan — understand how existing tests apply recipes, then assert `session.rhythm.layers`)

**What to produce:**

**`src/ui/StepEditor.svelte`** — a new component:

```
Props:
  layers: RhythmLayer[]           — the session layers to display
  onToggle: (layerIdx: number, stepIdx: number) => void  — callback to toggle a step
```

Renders one row per layer:

- Sound name label on the left (24px min-width, monospace, shows `layer.sound`; if `layer.strudelSample` is set and differs from `layer.sound`, show `layer.sound` with `layer.strudelSample` as a `title` tooltip).
- N toggle buttons where N = `layer.steps.length`. Each button is active (filled, tonal-accent color `#8aa0ff`) when `layer.steps[i] === 1`, inactive (dim/transparent) when `0`.
- Locked layers (`layer.locked === true`): all buttons rendered with `disabled` attribute and `aria-disabled="true"`. Cursor: default. Reduced opacity (0.45). No hover effect.
- Free layers: buttons are clickable; `on:click={() => onToggle(layerIdx, stepIdx)}`.

Styling constraints (follow the "Apple"-like sober aesthetic):
- Background: `rgba(255,255,255,0.04)` (same glass as other panels).
- Button: 20×20px minimum tap target. Active: `background: rgba(138,160,255,0.35); border-color: #8aa0ff`. Inactive: `background: transparent; border: 1px solid rgba(255,255,255,0.12)`.
- Locked button: same shape, but `opacity: 0.45; cursor: default; pointer-events: none`.
- Grid: CSS `display: grid; grid-template-columns: auto repeat(N, 1fr)`. Because N varies per layer (7, 12, or 16), use `style="grid-template-columns: auto repeat({layer.steps.length}, 1fr)"` inline on each row.

AGPL-3.0 header required at the top of this file.

**Wiring in `src/ui/Header.svelte`:**

- Import `StepEditor` and mount it in the rhythm section, below the layer list and above the Euclidean controls. Show it only when `$sessionStore.rhythm.layers.length > 0`.
- Implement `handleStepToggle` in Header.svelte:

```typescript
function handleStepToggle(layerIdx: number, stepIdx: number): void {
  sessionStore.update(s => {
    const layer = s.rhythm.layers[layerIdx];
    if (!layer || layer.locked) return s;  // guard: locked layers immutable
    const newSteps = [...layer.steps];
    newSteps[stepIdx] = newSteps[stepIdx] === 1 ? 0 : 1;
    // Clear euclid when editing steps directly (consistent with existing onStagePointerDown behavior)
    const newLayers = [...s.rhythm.layers];
    newLayers[layerIdx] = { ...layer, steps: newSteps, euclid: undefined };
    return { ...s, rhythm: { ...s.rhythm, layers: newLayers } };
  });
  requeueLive();
}
```

Pass it as `onToggle={handleStepToggle}` to `<StepEditor>`.

**Tests:**

Create `tests/authentic-groove/step-editor.test.ts`:

- A-09-04: Apply a cueca recipe (look up the recipe id — `cueca-chilena` or equivalent — using `getRecipeById` or by importing the recipe constant; use `applyRhythmSpec` or construct session layers directly by reading from `RHYTHM_HARMONY_RECIPES`) and assert that the resulting layer array has at least one layer with `steps.length === 12`.
- A-09-04: Apply an aksak recipe (look up `aksak-dorian-odd`) and assert at least one layer with `steps.length === 7`.
- A-09-05: Construct a mock layer with `locked: true` and `steps: [1,0,1,0,...]`. Assert that calling `handleStepToggle` logic (tested in isolation — write a pure version of the guard function or extract `applyStepToggle(session, layerIdx, stepIdx)` as a pure helper if desired) returns the session unchanged when the target layer is locked.
- A-09-06: For a non-locked layer, assert the toggle inverts `steps[stepIdx]` and clears `euclid`.
- A-09-07: Assert that a cueca recipe applied to a session produces `layers` where at least one layer has `steps.length === 12` (concrete row count for the StepEditor grid).
- A-09-08: Assert that an aksak recipe applied to a session produces at least one layer with `steps.length === 7`.

Note: `StepEditor.svelte` renders DOM — testing DOM rendering is optional for this step (Playwright/Svelte test setup may not be in scope). The unit tests above test the *data contract* that the StepEditor component consumes. If a DOM rendering test is easy to add with existing setup (Svelte + Vitest), add it as a bonus for A-09-04; otherwise mark it as `manual` in the coverage table.

**Finding `requeueLive`:** Search `src/agent/apply.ts` or `src/app/App.svelte` for `requeueLive` — it is the function that triggers the next-cycle live re-evaluation. Confirm it is importable in Header.svelte (it may already be imported there from a prior phase).

**Recipe IDs to use in tests:** Read `src/core/music-knowledge/rhythm-harmony-recipes.ts` to confirm the exact IDs before writing tests. Do not assume from memory.

**Constraints:**
- New file: `src/ui/StepEditor.svelte` (AGPL-3.0 header required).
- Changes to `src/ui/Header.svelte` are minimal: import, mount, and `handleStepToggle`.
- No changes to `src/core/**`, `src/agent/**`, `src/lib/**`.
- AG-D1 seam: `StepEditor.svelte` displays `layer.sound` (an abstract role name); it must not contain genre-to-sample mappings.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run step-editor` → all tests pass
- `pnpm test` → no regressions (≥ 1994 + new tests from 09.1)

**CHECKPOINT → Commit message:**
`feat(ui): Phase 09 step 09.2 — StepEditor component with recipe-adaptive grid`

---

## Step 09.3 — Orbit sound switcher

PROMPT → Read `docs/authentic-groove/phases/phase-09.md` (this file). Read `src/app/App.svelte` in full (focus on the `.layer-ctl` overlay, `hoveredLayerIndex`, `overlayX`, `overlayY`, `handleLayerSolo`, `handleLayerMute`, `handleLayerDelete`). Add the sound-switcher button and dropdown to the orbit overlay. Manual verification note required in handoff. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1)
3. `docs/authentic-groove/phases/phase-09.md` (this file)
4. `src/app/App.svelte` (full — the `.layer-ctl` block at lines 455–494, `hoveredLayerIndex`, `overlayX`, `overlayY`, `requeueLive`, `sessionStore` usage, existing button handlers)
5. `src/core/rhythm/layers.ts` (confirm `Sound` type after step 09.1)

**What to produce:**

**`src/app/App.svelte`** — four additions within or adjacent to the `.layer-ctl` block:

**1. Script additions (in the `<script>` block):**

```typescript
// Sound picker state
let showSoundPicker = -1;  // -1 = closed; ≥ 0 = open for that layer index

// Grouped sounds for the picker dropdown (mirrors SK_SOUNDS expansion in 09.1)
const SOUNDS_GROUPED = [
  {
    label: 'Drum kit',
    sounds: ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'mt', 'ht'] as Sound[],
  },
  {
    label: 'Percussion',
    sounds: ['conga', 'cajon', 'wood', 'shaker', 'cb', 'perc', 'hand'] as Sound[],
  },
] as const;

function toggleSoundPicker(layerIdx: number): void {
  const layer = $sessionStore.rhythm.layers[layerIdx];
  if (!layer || layer.locked) return;  // locked layers: no picker
  showSoundPicker = showSoundPicker === layerIdx ? -1 : layerIdx;
}

function handleChangeLayerSound(layerIdx: number, newSound: Sound): void {
  sessionStore.update(s => {
    const newLayers = [...s.rhythm.layers];
    newLayers[layerIdx] = { ...newLayers[layerIdx], sound: newSound };
    return { ...s, rhythm: { ...s.rhythm, layers: newLayers } };
  });
  showSoundPicker = -1;
  requeueLive();
}
```

Close the picker when overlay hides: in the `pointerleave` handler of `.layer-ctl` (or wherever `hoveredLayerIndex = -1` is set), also set `showSoundPicker = -1`.

**2. Document-level click listener to close picker on outside click:**

```svelte
<svelte:window on:click={() => { showSoundPicker = -1; }} />
```

Place this near the top of the template (or confirm App.svelte already has `<svelte:window>` usage and append to the existing binding).

**3. Template additions inside `.layer-ctl`:**

Add the sound button as the **leftmost** button (before Solo). Add the dropdown above the overlay when `showSoundPicker === hoveredLayerIndex`:

```svelte
{#if showSoundPicker === hoveredLayerIndex}
  <div
    class="sound-picker-dropdown"
    class:dropup={overlayY > window.innerHeight / 2}
    on:click|stopPropagation={() => {/* prevent svelte:window close */}}
    role="listbox"
    aria-label="Choose sound"
  >
    {#each SOUNDS_GROUPED as group}
      <div class="sound-group-label">{group.label}</div>
      {#each group.sounds as s}
        <button
          class="sound-option"
          class:active={s === $sessionStore.rhythm.layers[hoveredLayerIndex]?.sound}
          role="option"
          aria-selected={s === $sessionStore.rhythm.layers[hoveredLayerIndex]?.sound}
          on:click|stopPropagation={() => handleChangeLayerSound(hoveredLayerIndex, s)}
        >{s}</button>
      {/each}
    {/each}
  </div>
{/if}
<button
  class="layer-btn sound-btn"
  title={$sessionStore.rhythm.layers[hoveredLayerIndex]?.locked
    ? 'Sound locked (recipe signature)'
    : 'Change sound'}
  style={$sessionStore.rhythm.layers[hoveredLayerIndex]?.locked
    ? 'opacity:0.5;cursor:default'
    : ''}
  on:click|stopPropagation={() => toggleSoundPicker(hoveredLayerIndex)}
>
  {$sessionStore.rhythm.layers[hoveredLayerIndex]?.sound ?? '?'}
</button>
```

**4. CSS additions** (in the component's `<style>` block):

```css
.sound-btn {
  min-width: 40px;
  font-family: monospace;
  font-size: 11px;
}

.sound-picker-dropdown {
  position: absolute;
  bottom: calc(100% + 4px); /* default: dropup */
  left: 0;
  background: #1a1c23;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  padding: 6px;
  z-index: 200;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sound-picker-dropdown.dropup {
  bottom: calc(100% + 4px);
  top: auto;
}

/* When overlay is in upper half, dropdown goes below */
.layer-ctl:not(.dropup-ctx) .sound-picker-dropdown {
  bottom: auto;
  top: calc(100% + 4px);
}

.sound-group-label {
  font-size: 9px;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 4px 1px;
}

.sound-option {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.75);
  font-family: monospace;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
}

.sound-option:hover {
  background: rgba(255,255,255,0.08);
}

.sound-option.active {
  background: rgba(138,160,255,0.2);
  color: #8aa0ff;
}
```

**Dropdown positioning:** Use `overlayY > window.innerHeight / 2` to decide dropup vs dropdown. When the orbit is in the lower half of the viewport, the dropdown opens upward (default). When in the upper half, it opens downward. Apply this via a CSS class on the dropdown or inline style — whichever is simplest given Svelte's reactivity. If `window` is not directly accessible in the template, use an inline conditional on a `style` attribute.

**Locked layer behavior:** `toggleSoundPicker` returns early for locked layers. The sound button is rendered with `opacity: 0.5; cursor: default` and its title says "Sound locked (recipe signature)". The picker never opens. The sound of a locked layer represents its cultural identity — changing it would break the recipe semantics.

**Tests:** No automated unit test for DOM interaction. The handoff must include a **manual verification note** with these specific checks the Dev performed in a browser:

1. Hover an orbit → overlay appears with 4 buttons (sound, S, M, delete).
2. Click the sound button on a free layer → grouped dropdown opens.
3. Click a different sound → layer sound updates; Strudel re-queues; dropdown closes.
4. Click outside the dropdown (not on a layer button) → dropdown closes.
5. Hover a locked layer orbit → sound button appears with reduced opacity; click does nothing.
6. Apply a cueca recipe → bd and hh layers locked; sound button disabled on locked layers; free layers changeable.

**Constraints:**
- Changes confined to `src/app/App.svelte`.
- Maintain existing button order: [sound] [S] [M] [delete] (sound is added leftmost).
- AG-D1: `SOUNDS_GROUPED` in App.svelte lists palette names only (same as `SK_SOUNDS`). These are abstract UI names, not genre-to-sample mappings. Permitted per ADR 0025 D1.
- AGPL-3.0 header on App.svelte is already present — do not remove.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm lint` → clean
- `pnpm test` → no regressions (≥ test count from 09.2)
- Manual verification note in handoff (required — checklist item 5 for live-system evidence)

**CHECKPOINT → Commit message:**
`feat(ui): Phase 09 step 09.3 — orbit sound switcher button and dropdown`

---

## Step 09.4 — Quality gate + seam check + phase-completion + initiative-close

PROMPT → Read `docs/authentic-groove/phases/phase-09.md` (this file). Confirm steps 09.1–09.3 are APPROVED in the handoff. Run the full quality gate and seam fitness check. Append the phase-completion block and the initiative-close block to `docs/authentic-groove/handoffs/phase-09-handoff.md`. No source file changes expected; fix only lint/type issues revealed by the gate. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1 — seam grep plan)
3. `docs/authentic-groove/phases/phase-09.md` (all Acceptance IDs A-09-01 through A-09-11)
4. `docs/authentic-groove/handoffs/phase-09-handoff.md` (confirm steps 09.1–09.3 are APPROVED)
5. `docs/adr/0025-authentic-sample-palette.md` (D3 — seam invariant + grep approach)

**Seam fitness check (run and record output):**

```bash
# Genre-token grep (AG-D1 / ADR 0025 D3) — expanded for Phase 09 new genres:
git grep -n \
  -e "'cumbia'" -e '"cumbia"' \
  -e "'cueca'" -e '"cueca"' \
  -e "'candombe'" -e '"candombe"' \
  -e "'samba'" -e '"samba"' \
  -e "'flamenco'" -e '"flamenco"' \
  -e "'milonga'" -e '"milonga"' \
  -e "'maqsum'" -e '"maqsum"' \
  -e "'baladi'" -e '"baladi"' \
  -e "'afro-cuban'" -e '"afro-cuban"' \
  -e "'rumba'" -e '"rumba"' \
  -e "'bossa-nova'" -e '"bossa-nova"' \
  -e "'aksak'" -e '"aksak"' \
  -e "'gospel'" -e '"gospel"' \
  -e "'west-african'" -e '"west-african"' \
  -e "'buleria'" -e '"buleria"' \
  -e "'pop-rock'" -e '"pop-rock"' \
  -- 'src/' \
  ':(exclude)src/core/music-knowledge/' \
  ':(exclude)tests/'
```

Expected: empty output (zero matches).

**Full quality gate (run all four, record outputs):**

- `pnpm exec tsc --noEmit` → clean (no output)
- `pnpm lint` → clean
- `pnpm test` → ≥ 1994 + all Phase 09 tests; zero regressions
- `pnpm build` → succeeds

**Reversibility note (required verbatim in handoff):**

- Sound type expansion (09.1): additive enum values. Reverting removes the 7 new sounds from the `Sound` union and `SK_SOUNDS` arrays. Pre-Phase-09 sessions are unaffected — their `sound` values are all in the original 9. Sessions created with new sounds (`conga` etc.) would fail Zod parse after revert; they would be dropped by the graceful-degradation path (no migration).
- StepEditor.svelte (09.2): a new component. Reverting removes it and the `handleStepToggle` wiring in Header.svelte. No state or schema change; no migration needed.
- Orbit sound switcher (09.3): UI-only change to App.svelte. Reverting removes the sound button and dropdown. `handleChangeLayerSound` updates only `layer.sound` (already in the store and schema). No schema change; no migration.

**Phase-completion block (append to handoff):**

```
## Handoff — Phase 09 (Rhythm-Section UI complete)

**Phase completed:** <date>

### Completed
- Expanded Sound type to 16 values (09.1); Header.svelte picker grouped.
- StepEditor.svelte component: recipe-adaptive grid (7/12/16 columns) with locked-layer guard (09.2).
- Orbit sound switcher: 4-button overlay with grouped dropdown; closes on outside click (09.3).
- Full quality gate: tsc, lint, test ≥ 1994 + new, build clean; seam grep zero matches (09.4).

### Test delta
<baseline from 09.2/09.3> → <final count> (+<new> tests)

### Decisions made
None — all changes within boundaries of ADR 0025 and AG-D1.

### ADRs committed
None — this phase is additive UI; no new governance decision required.

### Register entries added
None.

### Deferred
- Note-level free placement on the Pentagrama (NoteSlot model, pitch-drag, Tonnetz vertex→single note) — carried from orbifold-v2 Phase 10; permanently deferred from this initiative.
- Per-chord lpf/lpq direct user slider (D-3) — carried from harmonic-rhythm-improvements Phase 01; permanently deferred from this initiative.
- Remaining 10 sampleMap fallbacks (cumbia conga, cueca timbales, etc.) — no authentic Dirt-Samples alternative; would require custom sample hosting (future initiative).
```

**Initiative-close block (append after phase-completion block):**

```
## Initiative Close — authentic-groove

**Closed:** <date>
**Total phases:** 9 (Phase 01 – Phase 09)
**Test count at close:** <final count>

### Delivered

Phase 01 — Genre-authentic sample palette + seam architecture (ADR 0025)
Phase 02 — Euclid-adaptive native step counts; 7/8 and 12/8 grid support
Phase 03 — Bossa-nova hh: sd → hand (FreePats upgrade)
Phase 04 — FreePats CC0 sample registration (conga, cajon, wood, shaker)
Phase 05 — Cueca and cumbia authentic binary layers + locked flag system
Phase 06 — Per-hit velocity accent variation
Phase 07 — Swing/groove feel (humanization)
Phase 08 — Authentic binary layers for all 12 remaining recipes + defaultCpm
Phase 09 — Sound palette expansion (16 sounds), StepEditor grid, orbit sound switcher

### Permanently deferred
- NoteSlot free placement on the Pentagrama (orbifold-v2 Phase 10)
- Per-chord lpf/lpq slider D-3 (harmonic-rhythm-improvements Phase 01)
- Custom sample hosting for remaining 10 sampleMap fallbacks

### Next initiative
Pilot to scope — candidates: Pentagrama NoteSlot, custom sample hosting, UX polish, or new initiative.
```

**What to produce:**
- No source file changes (only fix lint/type issues if any).
- Handoff entry for step 09.4 with full Acceptance Coverage Table (all 11 IDs) and both the phase-completion and initiative-close blocks.

**CHECKPOINT → Commit message:**
`chore(authentic-groove): Phase 09 step 09.4 — quality gate + initiative close`

---

## Phase Acceptance

| ID | Description | Validation method |
|---|---|---|
| A-09-01 | `Sound` type includes all 16 values; `tsc` accepts `'conga'` and `'shaker'` as `Sound` | tsc compile-time: `const s: Sound = 'conga'` in test file |
| A-09-02 | Header.svelte sound picker `<select>` shows all 16 options grouped into Drum kit and Percussion | manual: browser inspection / source read |
| A-09-03 | `SK_SOUNDS` in `schema.ts`, `apply.ts`, and `persistence.ts` all include all 16 values | unit: `sound-palette.test.ts` — assert `SK_SOUNDS.length === 16` or via Zod parse |
| A-09-04 | `StepEditor.svelte` renders N buttons per layer where N = `layer.steps.length` | unit: `step-editor.test.ts` — recipe layer has correct `steps.length` |
| A-09-05 | Locked layer buttons have `disabled` attribute and `aria-disabled="true"` | unit: mock layer with `locked: true`; tsc confirms prop contract; manual for DOM attribute |
| A-09-06 | `handleStepToggle` does not modify locked layers (store guard returns original state) | unit: `step-editor.test.ts` — locked layer toggle returns session unchanged |
| A-09-07 | Applying cueca recipe → at least one layer with `steps.length === 12` (12 columns in StepEditor) | unit: `step-editor.test.ts` |
| A-09-08 | Applying aksak recipe → at least one layer with `steps.length === 7` (7 columns in StepEditor) | unit: `step-editor.test.ts` |
| A-09-09 | Orbit `.layer-ctl` overlay has 4 buttons: sound, Solo, Mute, Delete (left to right) | manual: browser verification note in handoff |
| A-09-10 | `handleChangeLayerSound` updates `layer.sound` in store and calls `requeueLive()` | manual: browser — select new sound, observe Strudel re-queue; source read confirms `requeueLive()` call |
| A-09-11 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1994 + Phase 09 tests; `pnpm build` succeeds; seam grep returns zero genre-name matches | live-system: quality gate + seam grep recorded in step 09.4 handoff |

---

## Partial coverage from prior phase

From Phase 08 deferred items (all carried forward, permanently deferred from this initiative):
- `applyLoadedSession` locked-field gap — permanently deferred.
- Dimension 2 (per-hit accent/velocity variation) — permanently deferred per initiative scope.
- Dimension 3 (swing/groove feel) — permanently deferred per initiative scope.
- Pandeiro one-shots — permanently deferred (no CC0 source found).
- Remaining 10 sampleMap fallbacks — permanently deferred (no authentic Dirt-Samples alternative).
- Pentagrama `NoteSlot` free placement — carried from orbifold-v2 Ph10; permanently deferred.
- Per-chord `lpf`/`lpq` slider D-3 — carried from harmonic-rhythm-improvements; permanently deferred.

No prior phase has partial Acceptance IDs carried into this phase.

---

## ADR Triggers

No new ADR is anticipated. All changes are additive:
- `Sound` type expansion: additive enum values (ADR 0025 D1 is unchanged — `Sound` remains the abstract role, `strudelSample` the concrete override).
- `StepEditor.svelte`: new component; no governance decision.
- Orbit sound switcher: UI affordance only.

An ADR would be required if:
- The Pilot decides to expose `strudelSample` in the UI (conflating the abstract role with the concrete sample name — a seam change). Surface as a blocker.
- A new sample registration call is needed for any new sound (none anticipated; Phase 04 already registered all four FreePats sounds; `cb`, `perc`, `hand` come from the existing manifest call).

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and the phase-completion + initiative-close blocks to `docs/authentic-groove/handoffs/phase-09-handoff.md`. See `docs/authentic-groove/handoffs/phase-08-handoff.md` for style reference.
