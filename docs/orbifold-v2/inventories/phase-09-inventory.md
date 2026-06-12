# Phase 09 Inventory — 4-view primary navigation + rhythm controls to top bar

**Step:** 09.1  
**Date:** 2026-06-12  
**Branch:** `orbifold-v2/phase-09`  
**Status:** Checkpoint #1 surface — OQ-2 requires Pilot resolution before step 09.2

---

## Pre-resolved decisions from Pilot (recorded for completeness)

- **OQ-1 → Option B.** `'code'` added as a fifth view-type string. `'session'` retained.
- **OQ-3 → inline.** Rhythm controls' transient local state moves inline into `Header.svelte`'s `<script>` block.
- **OQ-4 → "Sesión" stays.** The ▶ Sesión button remains in Transport footer.
- **OQ-2 → DEFERRED.** Drawer lifecycle (D / E / F) is the primary open question at Checkpoint #1. This inventory provides the measured blast radius for each option.

---

## (a) Current view-type audit

Every location in the codebase that reads `state.view` or `$sessionStore.view` and what it does with each value:

### `src/state/session.ts`
- **Type declaration** (line 241): `view: 'rhythm' | 'harmony' | 'composition' | 'session'` — the union that Phase 09 widens.
- **Default** (line 258): `view: 'harmony'`
- **`applyLoadedSession`** (line 1273): `view: saved.view` — writes the deserialized view value back to the store. No switch/conditional on the view value itself.
- **`requeueLive`** (lines 493–509): switches on `nowPlaying.source` — does NOT switch on `view`. No blast radius here.

### `src/render/stage.ts`
- **`setView(view: 'harmony' | 'rhythm')`** (lines 163–166): toggles `harmonyLayer.visible` and `rhythmLayer.visible`. The function signature accepts only two strings; passing `'composition'` or `'session'` would give TypeScript an error. Both layers are false for any value that is neither `'harmony'` nor `'rhythm'` — currently a no-op, but TypeScript won't accept it without a signature change.
- Currently handles: `'harmony'` → harmonyLayer visible; `'rhythm'` → rhythmLayer visible.
- Silently ignored (runtime): `'composition'`, `'session'` — both layers would be hidden because `view === 'harmony'` is false and `view === 'rhythm'` is false, which is the correct behavior. But the TypeScript type would reject those strings.

### `src/render/tonnetz-scene.ts`
- **`_currentView` module var** (line 90): typed `'harmony' | 'rhythm'`.
- **`updateTonnetzDynamic`** (lines 298–299): `if (state.view === 'harmony' || state.view === 'rhythm') { _currentView = state.view; }` — updates `_currentView` only for the two known PIXI views; new view strings are ignored (no error, just no update).
- **`registerTicker`** (lines 704–705): `if (view === 'harmony')` — dispatches to harmonyTick vs rhythmTick based on `_currentView`. Only affects the PIXI render loop; new views would keep `_currentView` stale (last `'harmony'`/`'rhythm'` value). This needs to be addressed: when navigating to `'composition'` or `'code'`, `_currentView` should remain whatever it was — it does not dispatch on the new view-type strings, so the PIXI ticker won't fire for those views (correct behavior).

### `src/render/harmony-staff-scene.ts`
- **`tickHarmonyStaff`** (line 402): `if (state.view !== 'harmony') return;` — early-returns for all non-harmony views. Safe: any new view string that is not `'harmony'` suppresses the tick. No change needed.

### `src/app/App.svelte`
- **Store subscription** (line 207): `setView(state.view)` — calls `stage.ts setView` on every state change. TypeScript mismatch: `SessionState.view` could be `'composition'` or `'session'`, but `setView` currently accepts `'harmony' | 'rhythm'`. Phase 09 must widen the `setView` signature.
- **Canvas pointerdown** (lines 241–245): switches on `'harmony'` and `'rhythm'`. Other values fall to the implicit else (no-op). Correct — but the missing `else` guard could log a TS error if the exhaustive check is strict. An explicit `else { /* no-op */ }` is needed.
- **Canvas contextmenu** (lines 252–254): `if (state.view === 'rhythm')`. Safe; no-ops for other views.
- **Canvas pointermove** (lines 261–275): `if (state.view === 'rhythm')` + `else { hoveredLayerIndex = -1; }`. Safe.
- **Hint block** (lines 405–413): `{#if $sessionStore.view === 'harmony'}`. Currently only renders a hint for harmony. Other views render nothing. Phase 09 adds a `{:else if ... === 'rhythm'}` branch.

### `src/ui/Header.svelte`
- **`handleViewChange(view: 'harmony' | 'rhythm')`** (line 32): only accepts two strings; directly writes to the store. Phase 09 changes this to accept all four view strings.
- **Active class** (lines 85, 92): `$sessionStore.view === 'harmony'` and `=== 'rhythm'`. Phase 09 adds two more buttons.
- **Harmony controls guard** (line 106): `{#if $sessionStore.view === 'harmony'}`. The entire key selector + subview/register segs are inside this block. No change needed.

### `src/ui/RhythmControls.svelte`
- **Visibility gate** (line 121): `{#if $sessionStore.view === 'rhythm'}`. Phase 09 removes this component's content (moves to Header.svelte).

### `src/ui/Legend.svelte`
- **Reactive** (line 15): `$: visible = $sessionStore.view === 'harmony'`. Safe — any non-harmony view hides the legend. No change needed.

### `src/ui/HarmonyControls.svelte`
- Contains a guard: `{#if $sessionStore.view === 'harmony'}`. Read but not modified in Phase 09. (HarmonyControls is an empty overlay; the controls moved to Header.svelte in Phase 08.)

### `src/lib/persistence.ts`
- **`SavedSessionSchema`** (line 92): `view: z.enum(['rhythm', 'harmony', 'composition', 'session'] as const)`. Does NOT include `'code'`. A session saved while `view === 'code'` would fail schema validation on reload with the current schema. Version bump is required.
- **`serializeSession`** (line 113): `view: state.view` — writes whatever the live view is.
- **`deserializeSession`** (line 184): `view: saved.view` — passes through the validated view string.

### `src/agent/schema.ts`
- No `setView` command exists in `AgentOutputSchema`. The agent schema does not reference view-type strings. No change needed.

---

### Summary table: view-value handling

| File | Reads view | Handles `'harmony'` | Handles `'rhythm'` | Handles `'composition'` | Handles `'session'` | Handles `'code'` (new) |
|---|---|---|---|---|---|---|
| `session.ts` | type + default + applyLoad | declared | declared | declared | declared | no |
| `stage.ts setView` | yes | shows harmonyLayer | shows rhythmLayer | silently hides both (correct) | silently hides both | would hide both (correct after sig fix) |
| `tonnetz-scene.ts` | yes | sets _currentView | sets _currentView | no-op (ignores) | no-op (ignores) | no-op (correct) |
| `harmony-staff-scene.ts tickHarmonyStaff` | yes | ticks | returns early | returns early | returns early | returns early |
| `App.svelte` | yes | routes pointer | routes pointer | no-op (implicit else) | no-op (implicit else) | no-op (needs explicit else guard) |
| `Header.svelte handleViewChange` | writes | handled | handled | not handled | not handled | not handled |
| `RhythmControls.svelte` | yes | hidden | shown | hidden | hidden | hidden |
| `Legend.svelte` | yes | shown | hidden | hidden | hidden | hidden |
| `persistence.ts schema` | validates | accepted | accepted | accepted | accepted | rejected → needs version bump |
| `agent/schema.ts` | no | n/a | n/a | n/a | n/a | n/a |

---

## (b) View-type mapping decision surface

This section is rendered for reference only — OQ-1 is pre-resolved by the Pilot (Option B). The blast radius data is retained for the ADR.

### Option A — Reuse existing strings
Map Composición → `'composition'` (already exists) and Código Strudel → reuse `'session'` (renaming it) or keep `'session'` for the transport mode while mapping code view to a different existing string.

**Problem:** `'session'` is the existing source label in `NowPlaying` (`source: 'session'`) used by `playSession()`. Overloading it as a navigation view would create ambiguity. No clean existing string for Código Strudel.
**Blast radius:** Low for `'composition'` (already the type value); awkward for the code view.
**Schema bump:** Not needed if the persisted `view` values stay within the existing four.

### Option B — Add `'code'` as fifth string (PRE-RESOLVED by Pilot)
`SessionState.view` becomes `'rhythm' | 'harmony' | 'composition' | 'session' | 'code'`.
`'composition'` already exists and maps to Composición. `'code'` is new and maps to Código Strudel. `'session'` remains for the combined transport mode (▶ Sesión button), consistent with OQ-4.

**Blast radius:**
- `session.ts`: type union extended (1 line). Default unchanged (`'harmony'`).
- `stage.ts setView`: signature widened to accept `'composition' | 'session' | 'code'` — both layers hidden for these values (correct behavior already in logic, just type-blocked).
- `Header.svelte handleViewChange`: type widened.
- `persistence.ts`: `SavedSessionSchema.view` enum must add `'code'`. Schema version bump required. Loading sessions saved while in `'code'` view must default to `'harmony'` via a Zod `.transform()` or a catch at load time.
- Files touched: `session.ts`, `stage.ts`, `Header.svelte`, `persistence.ts`, any test that asserts the view union.
**Schema bump:** Required (adds `'code'` to the persisted enum).

### Option C — Rename all four strings
Example: `'rhythm' | 'harmony' | 'composition' | 'code'`, dropping `'session'` as a view-type string entirely.

**Blast radius:** Largest — every file in the table above that handles `'session'` as a view (currently: `persistence.ts` schema, `session.ts` type) must be updated. Additionally, the `playSession` function sets `nowPlaying.source = 'session'`, and `requeueLive` switches on `source === 'session'` — those are `NowPlaying.source` values (a separate union), not `SessionState.view`, so they would not need changing. But saving/loading sessions would break for any session with `view: 'session'` in the blob.
**Schema bump:** Required. Additionally, all existing saved sessions with `view: 'session'` would fail validation unless a migration path is defined.

**Pilot-chosen option: B.** Blast radius is minimal and schema migration is a straightforward enum extension with a fallback.

---

## (c) Drawer lifecycle decision surface — OQ-2 (OPEN — Pilot decides at Checkpoint #1)

This is the primary deliverable of the inventory. All three options are measured concretely.

### Shared context

**CodeDrawer.svelte** (314 lines total):
- Script block: ~106 lines. Imports: `sessionStore`, `runEditor`, `queueEditor`, `rhythmCode`, `harmonyCode`, `sessionCode` from `session.js`. Local state: `open: boolean`, `currentEditorCode: string`, `userEdited: boolean`. Has a `sessionStore.subscribe` call with an `onDestroy` cleanup. `open` variable drives the slide.
- Template: tab button (`#codeTab`, 1 line), drawer div (`#codeDrawer`, ~35 lines): header with close button, textarea (`#liveCode`), two action buttons (`▶ ejecutar`, `↻ encolar`).
- CSS: ~125 lines. Key rules: `#codeTab { position:fixed; bottom:140px; ... }` and `#codeDrawer { position:fixed; ... transform:translateY(105%); transition:... }` / `#codeDrawer.open { transform:translateY(0); }`.
- **The slide mechanism** (`position:fixed` + `translateY(105%)` → `translateY(0)`) is entirely in CSS and driven by the `.open` class on the `#codeDrawer` div. The `open` variable in the script controls this class via `class:open`. The slide is not entangled with the content — the textarea and buttons would work identically whether the drawer is full-screen or slides up.
- **Content weight**: textarea + 2 action buttons. Simple — about 35 lines of template. No rAF loop, no drag state.

**CompositionDrawer.svelte** (1 080 lines total):
- Script block: ~523 lines. Imports: `sessionStore`, `addBlock`, `deleteBlock`, `renameBlock`, `playBlockById`, `addTrack`, `removeTrack`, `addBlockToTrack`, `addBlockAsNewTrack`, `removeBlockFromTrack`, `setBlockBars`, `reorderBlockInTrack`, `moveBlockBetweenTracks`, `playComposition`, `pauseComposition`, `stopComposition` from `session.js`; `PPB`, `compPos`, `getCompState` from `composition.js`; `type Block` from `core/composition/model.js`.
- **rAF playhead loop**: `compTickLoop` (lines 209–272). Started in `onMount` (via `ensureLoop()`), also started on `handleOpen()`. Cancelled in `onDestroy`. The loop exits early (`rafId = null; return;`) when `open === false`. If `CompositionDrawer` is always rendered (Options D and F), the rAF loop runs from mount to destroy — even when the user is on the Ritmo view. The loop is cheap (reads `getCompState()`, checks `open`), but the early-return path only works when `open` is `false`. Under Option E (new component), the loop would only run when `CompositionView` is in the DOM.
- **Drag-to-reorder state**: `dragTrackIndex`, `dragRefIndex`, `dragMx`, `dragEl`, `dragging`, `dragOverTrackIndex` — module-level vars tied to DOM elements. Pointer capture is used.
- **Grip-resize state**: `gripState` object — tied to DOM `closest('.tl-block')` calls.
- Template: tab button (`#compTab`, 1 line), drawer div (`#compDrawer`, ~330 lines): two-column grid with the full block library + DAW timeline + transport row.
- CSS: ~155 lines. Key global rules in `app.css`: `#compTab { position:fixed; ... }`, `#compDrawer { position:fixed; ... transform:translateY(108%); }`, `#compDrawer.open { transform:translateY(0); }`.
- **The `#compDrawer` and `#compTab` CSS rules are in `app.css`** (global), not scoped inside `CompositionDrawer.svelte`. The `#codeDrawer` / `#codeTab` positioning rules are inside `CodeDrawer.svelte`'s `<style>` block (scoped, but IDs break Svelte scoping — they apply globally in practice).

---

### Option D — Keep drawer HTML/Svelte structure, render inline (no slide)

**Mechanism:** The `#codeTab` and `#compTab` buttons are removed (or hidden). The `position:fixed` + `translateY` slide is bypassed for the primary-view case. Instead, the content area is shown when the corresponding view is active. Two sub-options:

**D1** — Full `{#if}` gate in App.svelte: `{#if $sessionStore.view === 'composition'}` wraps `<CompositionDrawer />` (or shows a new wrapper around the drawer's content). The drawer is not in the DOM when other views are active. No forced-open state.

**D2** — Keep drawer in DOM always, set `open = true` reactively when view matches (similar to Option F, but done inside the drawer component itself via a `$:` reactive statement).

**Changes required:**
- Remove `#codeTab` button from `CodeDrawer.svelte` (1 line HTML, ~20 lines CSS from the scoped block).
- Remove `#compTab` button from `CompositionDrawer.svelte` (1 line HTML).
- Remove or override `#compTab` CSS from `app.css` (~14 lines).
- For the drawer content: either (a) wrap `<CodeDrawer />` and `<CompositionDrawer />` in `{#if}` blocks in App.svelte gating on the view (D1), or (b) add a `$: if ($sessionStore.view === 'composition') open = true` reactive declaration inside the drawer components (D2).
- The `position:fixed` + `translateY` CSS for `#codeDrawer` and `#compDrawer` would need to be replaced: the drawers must fill the `#stage` area (or be full-height DOM sections), not slide up from the bottom.
- **CSS rework**: The drawer divs currently have `position:fixed; bottom:0; max-height:74vh`. For the primary-view case, they need to be `position:relative` (or `display:flex; flex:1`) within the `#stage` container. This requires replacing the `#codeDrawer` and `#compDrawer` CSS rules in the scoped `<style>` blocks and in `app.css`. Estimate: ~25–35 lines of CSS changed.

**rAF loop impact (CompositionDrawer):** Under D1 (`{#if}` gate), the component is destroyed and re-mounted when the view changes. The rAF loop restarts on mount. Playhead position is lost unless the rAF loop state is lifted to the store. Under D2 (always in DOM, reactive `open`), the rAF loop runs continuously; it exits early when `open === false`, which is acceptable.

**Effort estimate:** Medium. Two CSS context changes (fixed→relative or flex-fill for two drawer divs), tab button removal, and either `{#if}` gates in App.svelte or reactive `open` in each drawer. Template content is unchanged; only the container and visibility mechanism changes.
**Line estimate:** ~60–80 lines changed across `CodeDrawer.svelte`, `CompositionDrawer.svelte`, `app.css`, and `App.svelte`.

---

### Option E — Extract content into new `CompositionView` and `CodeView` components

**Mechanism:** Create `src/ui/CompositionView.svelte` and `src/ui/CodeView.svelte`. Each contains the relevant content extracted from the drawer components. `App.svelte` renders them inside `{#if $sessionStore.view === 'composition'}` and `{#if $sessionStore.view === 'code'}` blocks. The old drawer files are deleted (or left as empty stubs importing nothing).

**Changes required:**
- Create `src/ui/CodeView.svelte`: extract the textarea, action buttons, and store subscription from `CodeDrawer.svelte`. The `open` state and slide CSS are gone. This is ~40 lines of template + ~30 lines of CSS for the new layout (full-height text area). Script: identical to CodeDrawer's script minus `open`/`userEdited` reset on close, minus `toggleDrawer`/`handleClose`. About 70 script lines of the 106 in CodeDrawer carry over.
- Create `src/ui/CompositionView.svelte`: extract the entire two-column grid from `CompositionDrawer.svelte`. All drag/grip/rAF state and handlers carry over verbatim. The `open` variable becomes unnecessary (view is always shown when the component is mounted). The `ensureLoop()` call in `onMount` starts the rAF loop; `open` guard in `compTickLoop` becomes always-true while mounted — needs to be removed (replace `if (!open) { rafId = null; return; }` with nothing, since the component is only in the DOM when the view is active). This is ~495 lines of content script + ~330 lines of template + ~155 lines of CSS → ~980 lines in the new component.
- Delete (or stub) `CodeDrawer.svelte` and `CompositionDrawer.svelte`.
- Remove `#codeTab`, `#compTab` button lines from wherever they render.
- Remove `#compTab` / `#compDrawer` / `#codeTab` / `#codeDrawer` CSS from `app.css` (~40 lines).
- Add `{#if}` blocks in `App.svelte` for the two new components.

**rAF loop impact:** Clean. The rAF loop in `CompositionView` runs only when the component is mounted (when `view === 'composition'`). No leaked loop in other views. The `open` guard is replaced by DOM presence.

**Effort estimate:** Highest. Requires creating two new files, carefully porting the content without regressions (especially the drag/grip/rAF logic in CompositionView), and cleaning up the old drawers. Risk: the drag-to-reorder and grip-resize use `el.closest('.tl-block')` DOM traversal and `el.setPointerCapture` — these are content-only and do not depend on the drawer shell; they port cleanly.
**Line estimate:** ~1 100 new lines (two new files), ~350 lines removed from old drawers and `app.css`.

---

### Option F — Force-open existing drawers via reactive `$:` block

**Mechanism:** The existing `CompositionDrawer` and `CodeDrawer` components are kept unchanged except: (1) the tab buttons are hidden via `display:none` when the corresponding view is active, (2) a `$:` reactive declaration sets `open = true` when the view matches. The slide animation fires once on navigation (drawer slides up), then stays open.

**Changes required (minimal):**
- In `CodeDrawer.svelte`: add `import { sessionStore } from '../state/session.js'` (already imported). Add: `$: if ($sessionStore.view === 'code') open = true;`. Hide `#codeTab` when view is `'code'` (either via CSS or a conditional class).
- In `CompositionDrawer.svelte`: add `$: if ($sessionStore.view === 'composition') open = true;`. Hide `#compTab` similarly.
- The tab buttons could be conditionally rendered: `{#if $sessionStore.view !== 'composition'}` / `{#if $sessionStore.view !== 'code'}`.
- The slide animation (`transform:translateY(108%) → translateY(0)`) fires once per navigation. After that, the drawer stays open (the user cannot close it while in that view, because the close button resets `open = false` — and then the `$:` reactive re-fires immediately, re-opening it). The close button must also be hidden or suppressed when `view === 'composition'` / `view === 'code'`.
- The `position:fixed; max-height:74vh; bottom:0` layout is kept. This means the drawer does not fill the `#stage` area — it still occupies only the bottom 74vh of the viewport, and the PIXI canvas (now invisible for these views) would show above it. Visually acceptable but not ideal — the composition timeline gets the same partial-screen height it had as a drawer.

**rAF loop impact (CompositionDrawer):** The loop would run as long as `open === true`. When the user navigates away (to Ritmo or Armonía), the `$:` reactive no longer forces `open = true`, but it also does not force `open = false`. The drawer stays open until the user explicitly closes it. A second reactive is needed: `$: if ($sessionStore.view !== 'composition') open = false;`. This causes the drawer to close (and the rAF loop to exit early) when navigating away.

**Effort estimate:** Lowest. ~10 lines of Svelte reactive declarations + button conditional rendering in two components. CSS unchanged for the drawer shell.
**Line estimate:** ~15–25 lines changed across `CodeDrawer.svelte`, `CompositionDrawer.svelte`.

**Structural concern:** The composition view would be max 74vh tall and anchored to the bottom (matching the old drawer position). If the Pilot wants the composition timeline to be a true full-canvas view (like Ritmo and Armonía), Option F does not achieve that without further CSS changes (which would approach the effort of Option D). The `#stage` area would remain visible above the forced-open drawer, showing an empty PIXI canvas for those views.

---

### Option comparison table

| Criterion | Option D (inline) | Option E (new components) | Option F (force-open) |
|---|---|---|---|
| Effort (lines changed) | ~70–80 | ~1 100 new + 350 removed | ~20–25 |
| Full-canvas UX | Yes (if using `{#if}` gate + flex layout) | Yes (component fills `#stage`) | No (max 74vh, bottom-anchored) |
| rAF loop risk | Medium (D1: reset on mount; D2: continuous cheap loop) | Low (loop tied to component lifetime) | Medium (needs two reactive guards) |
| Drawer entanglement | Moderate (CSS for shell must change) | None (new files, old deleted) | High (close button, tab button, reactive guards all interact) |
| Regression risk | Low–medium | Low (new files, old remain as stubs) | Medium (reactive guards could fight each other) |
| Tab button removal | Explicit (remove HTML lines) | Implicit (old drawers not rendered) | Via conditional rendering |
| State preservation on view switch | D1: lost (component unmounted); D2: preserved | Lost (component unmounted) | Preserved (open=true sticky) |

### Dev recommendation

**Option D (variant D1: `{#if}` gate in App.svelte for the drawer content area, with CSS changed from `position:fixed` to relative/flex fill).**

Rationale: Option F does not achieve a full-canvas view for Composición and Código Strudel, which is a stated goal of Phase 09. Option E has the cleanest lifecycle model but is the highest-effort operation and risks introducing regressions by re-duplicating ~1 000 lines. Option D achieves a full-canvas view with moderate effort: the content stays in the existing drawer components (no template duplication), the tab buttons are removed, and the CSS for the drawer divs is changed from `position:fixed` to be relative to the view. The rAF loop in CompositionDrawer resets on mount — the playhead returns to 0 when navigating to the Composición view and back, which is acceptable since playback state is preserved in the store.

**Pilot decision required at Checkpoint #1 before step 09.2.**

---

## (d) Rhythm controls blast radius

All items from `RhythmControls.svelte` that move to `Header.svelte` (per OQ-3 = inline).

### Imports to add to `Header.svelte`

From `session.js` (currently `RhythmControls.svelte` imports these):
- `addEuclidLayer`
- `addEmptyLayer`
- `previewEuclid`
- `hushAll`

From `rhythm-scene.js` (new import for `Header.svelte`):
- `setMorphTarget`

From `agentCtx.js` (already imported in `Header.svelte` for the `📨 marco` button):
- `agentCtx` — **no collision**, already present

### Transient local state to add to `Header.svelte` script block

All five variables are `let` declarations in `RhythmControls.svelte`'s script:

| Variable | Type | Default | Notes |
|---|---|---|---|
| `euclidSound` | `string` | `'hh'` | No collision with Header.svelte locals |
| `euclidK` | `number` | `3` | No collision |
| `euclidN` | `number` | `8` | No collision |
| `euclidR` | `number` | `0` | No collision |
| `morphTarget` | `0 \| 1` | `0` | No collision |

**Collision check:** The existing `Header.svelte` local variables are: `NOTE_NAMES` (const array), `handleViewChange`, `handleRootChange`, `handleModeChange`, `handleOctaveChange`. None of these conflict with the rhythm control variables.

### Reactive declarations to add

| Declaration | Source in RhythmControls.svelte |
|---|---|
| `$: euclidRMax = Math.max(0, euclidN - 1)` | line 85 |
| `$: if (euclidR > euclidRMax) euclidR = euclidRMax` | line 87 |
| `$: euclidInfo = KNOWN_PATTERNS[\`${euclidK},${euclidN}\`] ? '· ' + KNOWN_PATTERNS[...] : ''` | line 90 |
| `$: isPreviewing = $sessionStore.nowPlaying.source === 'preview'` | line 95 |

### Constant to move

`KNOWN_PATTERNS: Record<string, string>` — the named-pattern lookup table (8 entries). Moves to `Header.svelte` script as a `const`.

### Handler functions to move

- `handleMorphToggle()` — toggles `morphTarget`, calls `setMorphTarget(morphTarget)`.
- `handlePreviewToggle()` — calls `hushAll()` if previewing, else `previewEuclid(...)`.
- `handleAddEuclid()` — calls `addEuclidLayer(euclidSound, euclidK, euclidN, euclidR)`.
- `handleAddEmpty()` — calls `addEmptyLayer(euclidSound)`.

### Template content to move into `{#if $sessionStore.view === 'rhythm'}` block

The entire `.orbit-ctl.glass#orbitCtl` div (~60 lines of template). The CSS for `.orbit-ctl` and its children (~65 lines) moves to `Header.svelte`'s `<style>` block (or is rewritten as inline-flex items matching the existing header gap-18 layout).

**Layout note (per spec §Step 09.5):** The range sliders in `RhythmControls.svelte` are currently `width:78px` inside the drawer's flex-wrap container. In the header's inline-flex row with `gap:18px`, they need a `max-width` constraint. The phase spec says to document the choice in the handoff — this inventory notes that the slider widths will be kept at 78px and the rhythm controls block will be wrapped in a nested `flex-wrap` container to prevent header overflow on narrow viewports.

### State lifecycle after move

Because `euclidSound`, `euclidK`, `euclidN`, `euclidR`, and `morphTarget` will be inline in `Header.svelte` (which is mounted for the entire app lifetime), the values persist across view switches. This satisfies the phase spec requirement: navigating from Ritmo to Armonía and back preserves the morph target and Euclidean parameters.

---

## (e) Transport row audit

Controls in `Transport.svelte` classified as transversal (stays) or view-specific (moves/removed):

| Control | Current location | Classification | Phase 09 action |
|---|---|---|---|
| Now-playing pill (`.now#nowPlaying`) | Transport footer | Transversal | Stays — always relevant |
| "tocar" label (`.eng-lbl`) | Transport footer | Transversal | Stays |
| ▶ Ritmo button (`#rhythmPlay`) | Transport footer | Transversal | Stays (OQ-4: per-engine play always accessible) |
| ▶ Armonía button (`#progPlay`) | Transport footer | Transversal | Stays |
| ▶ Sesión button (`#sessionPlay`) | Transport footer | Transversal | Stays (OQ-4 resolved: Sesión stays) |
| ■ silencio button (`#hushBtn`) | Transport footer | Transversal | Stays |
| BPM slider + readout (`#cps`, `#bpmReadout`) | Transport footer | Transversal | Stays |
| TAP button (`#tapBtn`) | Transport footer | Transversal | Stays |
| `<LatencyCalibration />` widget | Transport footer | Transversal | Stays |

**Conclusion:** Every control currently in `Transport.svelte` is transversal. There are no view-specific controls in the Transport footer at the start of Phase 09. A-09-10 is already met structurally — Phase 09 does not need to move anything out of the Transport footer; it only needs to ensure that the rhythm controls from `RhythmControls.svelte` (which are in an overlay, NOT in the Transport) do not re-enter the Transport.

The composition transport row (▶ tocar / ⏸ pausa / ■ stop / limpiar todo) lives inside `CompositionDrawer.svelte`, not in `Transport.svelte`. After Phase 09 it would live inside the elevated Composición view (whatever form Option D/E/F takes). It is view-specific to Composición and correctly stays there.

---

## (f) Test and build baseline

| Check | Result |
|---|---|
| `pnpm exec vitest run` | 385 passed (13 test files), 0 failed |
| `pnpm exec tsc --noEmit` | 0 errors |
| `pnpm lint` | 0 errors (ESLint + Prettier) |

Baseline confirmed clean. No source files were modified by this inventory step.

---

## Open questions for Checkpoint #1

| ID | Question | Status |
|---|---|---|
| OQ-1 | View-type string mapping (A / B / C) | **Pre-resolved: Option B** (`'code'` as fifth string) |
| OQ-2 | Drawer lifecycle (D / E / F) | **OPEN — Pilot decides** (blast radius above) |
| OQ-3 | Rhythm local state placement (inline Header or sub-component) | **Pre-resolved: inline** |
| OQ-4 | "Sesión" stays in Transport footer | **Pre-resolved: yes** |

**The single remaining decision for Checkpoint #1:** Choose Option D, E, or F for the drawer lifecycle. Dev recommendation is **Option D (variant D1)** for reasons documented in section (c).

---

## Persistence schema impact (Option B, pre-resolved)

**Current `SavedSessionSchema` version:** 1  
**Current `view` field:** `z.enum(['rhythm', 'harmony', 'composition', 'session'] as const)`

With Option B, `'code'` is a new value the persisted `view` field can take (a session saved while in the Código Strudel view would write `view: 'code'`). This fails the current `z.enum`.

**Required change (step 09.3):**
- Bump `SESSION_SCHEMA_VERSION` from `1` to `2`.
- Replace the `view` enum with a union that accepts all five strings and falls back to `'harmony'` for unrecognized strings: use `z.enum([...five strings...])` OR a `z.string().transform(v => VALID_VIEWS.includes(v) ? v : 'harmony')`. The latter accepts forward-compat unknown views without throwing.
- `serializeSession` writes `state.view` directly — no change needed there.
- `deserializeSession` passes through the validated view — no change needed there.
- Tests in `tests/persistence.test.ts` that assert `view: z.enum(...)` or serialize/deserialize a session with `view: 'harmony'` are unaffected (still valid). Tests that assert the exact schema version must be updated.

**Existing sessions in localStorage with `version: 1`:** The schema uses `z.literal(1)` for version. Bumping to version 2 means old blobs (version 1) will fail validation and return `null` from `loadSavedSession` (the `safeParse` path). This is the existing graceful-degradation behavior — old sessions are silently dropped. The Pilot should be aware of this (no migration path for version 1 → 2 blobs).
