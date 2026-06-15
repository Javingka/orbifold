<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0015 — Canvas 2D Pentagrama layer

- **Status:** Accepted
- **Date:** 2026-06-13
- **Initiative / Phase:** orbifold-v2 / Phase 10 redesign (step 10.10)
- **Deciders:** Pilot (Javier)

## Context

Steps 10.3–10.8 delivered a PIXI-based slot editor on the Pentagrama sub-view: duration-extent bars, bar grid, chord/arp/rest rendering, selection chrome, resize, reorder, and playhead. The logic is correct and the store interactions (staff-hit.ts, reorderSlot, setChordBars, clearChordAt) are fully unit-tested. However, the PIXI v7 retained-mode Graphics API cannot replicate the prototype's visual quality: the gemstone onset circles with attack→decay gradient sustain bars, the responsive `LS = H/6` line spacing, the ambient breathe gradient, and the tonal-function spotlight that define `docs/orbifold-v2/reference/Pentagrama.dc.html` are not achievable idiomatically in the PIXI v7 API without prohibitive complexity.

The Pilot reviewed the PIXI result at Checkpoint #5 and commissioned the Canvas 2D standalone prototype (`Pentagrama.dc.html`) as the design reference. The Pilot then approved a technology switch at Checkpoint #2 (2026-06-13): the Pentagrama sub-view adopts a dedicated Canvas 2D `<canvas>` element rendered with the `CanvasRenderingContext2D` API. The PIXI staff scene is retired for rendering.

Seven open questions were resolved by the step 10.9 inventory (`docs/orbifold-v2/inventories/phase-10-redesign-inventory.md`). This ADR formally records the seven binding decisions that govern steps 10.11–10.15.

---

## Decisions

### D1 — Canvas 2D dedicated layer; PIXI staff scene retired for rendering

**Amendment reference:** This decision amends ADR 0011 D5 (Phase 08 amendment). ADR 0011 D5 stated that the Pentagrama sub-view is rendered as a PIXI `_staffContainer` inside `harmonyLayer`. That arrangement is superseded: the Pentagrama sub-view is now rendered by a dedicated Canvas 2D `<canvas>` element appended to the `#stage` DOM container.

**Technology arrangement after this phase:**

| Sub-view | Technology | Container |
|---|---|---|
| Tonnetz | PIXI v7 (unchanged) | `_tonnetzContainer` inside `harmonyLayer` |
| Pentagrama (staff) | Canvas 2D (`CanvasRenderingContext2D`) | Plain DOM `<canvas>`, `position:absolute; top:0; left:0` inside `#stage` |
| Ritmo | PIXI v7 (unchanged) | Rhythm scene (unchanged) |

Two rendering technologies coexist by design. This is contained to the Pentagrama sub-view; all other views remain PIXI.

**Files affected:**

- **New:** `src/render/pentagrama-scene.ts` — Canvas 2D module singleton managing the `<canvas>` element, rAF loop, ResizeObserver, and all drawing. This is render-layer code (`src/render/`, not `src/core/`) and may import DOM APIs.
- **Retired for rendering:** `src/render/harmony-staff-scene.ts` — PIXI staff scene. Its exports (`buildHarmonyStaffScene`, `updateHarmonyStaffDynamic`, `tickHarmonyStaff`, `onStaffPointerDown`, `onStaffPointerMove`, `onStaffPointerUp`) are removed from `App.svelte` wiring. The file is deleted (only `App.svelte` imports it; deletion is clean per inventory OQ-R5).
- **Modified:** `src/render/stage.ts` — `_staffContainer` PIXI sub-container and its wiring in `initStage`, `setHarmonySubview`, `getStageRefs`, and `StageRefs` interface are removed (inventory OQ-R5 documents all four touch-points). `setHarmonySubview` is retained for its `_tonnetzContainer` visibility toggle, which is still needed.
- **Modified:** `src/app/App.svelte` — nine call sites of the six retired exports removed (exact line numbers documented in inventory OQ-R5). `initPentagrama`, `destroyPentagrama`, and `setPentagramaVisible` wired in.
- **Modified:** `src/ui/Header.svelte` — register toggle `#registerModeSeg` removed (see D2).

**Pure engines retained (unchanged):** `src/core/harmony/staff-hit.ts`, `src/core/harmony/voice-tracks.ts`, `src/core/harmony/staff-map.ts`, `src/core/harmony/staff-layout.ts`, `src/core/harmony/time-map.ts`. Their unit tests (447 passing at baseline, inventory OQ-R8) remain in force. `staff-hit.ts` is actively reused by the Canvas 2D layer (see D6). The others are retained but not consumed by the new rendering pipeline (they are not deleted — their tests are valuable and their engines remain correct).

**Reversibility:** No runtime flag. The PIXI staff code (`harmony-staff-scene.ts`, `stage.ts _staffContainer` wiring) is preserved in git history on the `orbifold-v2/phase-10` branch. If the Pilot reverses the decision, `git revert` recovers it.

**Justification:** The prototype's visual design (gemstone onset circles, attack→decay gradient sustain bars, breathing spotlight, responsive line spacing) is expressed naturally in the immediate-mode `CanvasRenderingContext2D` API — all prototype drawing code translates directly into `ctx.fillStyle`, `ctx.createLinearGradient`, `ctx.arc`, etc. Replicating this in PIXI v7's retained-mode Graphics would require rebuilding the gradient math from scratch in CPU-computed vertex colors, and the shadow/glow effects that define the "gemstone" look require `ctx.shadowBlur` which has no direct PIXI v7 equivalent. The Canvas 2D switch is the minimal-risk path to achieving visual parity with the prototype.

---

### D2 — Drop estricto/suavizado register modes

**Pilot decision (Checkpoint #2, 2026-06-13):** The `estricto`/`suavizado` register toggle is removed from the UI. The Canvas 2D layer uses raw `chordVoicing(rootPc, qual, octave)` pitches — the same per-chord MIDI-equivalent as the prototype — without any octave-continuity algorithm.

**Removal scope:**

- `src/ui/Header.svelte` — the `#registerModeSeg` `<div>` block (lines 407–420 at time of step 10.9 inventory) and its two `suavizado`/`estricto` buttons are deleted. The `setRegisterMode` import (Header.svelte line 40) is removed. This is the only call site of `setRegisterMode` (confirmed by inventory OQ-R4 audit).

**What is left inert (not deleted):**

- `HarmonyState.registerMode` field in `src/state/session.ts` — left in the store type. Removing it would require updating all `HarmonyState` construction sites. The field is ephemeral and harmless as dead state. A future phase that needs the field can reactivate it without a schema change.
- `setRegisterMode` function in `src/state/session.ts` — left in place (no call sites after Header removal; harmless dead export).
- `src/core/harmony/voice-tracks.ts` — left inert. `computeVoiceTracks` consumes `registerMode` as a parameter (lines 164, 171, 256, 258). The Canvas 2D layer does not import `voice-tracks.ts` — it uses `chordVoicing` + `m2p` directly (see D4). `voice-tracks.ts` becomes dead code in the visual pipeline; its unit tests remain green and are kept.

**Schema and persistence safety (inventory OQ-R4 verdict: SAFE):**

- `SavedHarmonySchema` (persistence.ts lines 52–60) — `registerMode` is **absent**. No persistence change needed.
- `HarmonySpecSchema` (agent/schema.ts lines 143–148) — `registerMode` is **absent**. No agent schema change needed.
- `src/core/codegen/strudel.ts` — `registerMode` does not appear. Audio output is byte-identical before and after this removal.

The Decisions Register entry "registerMode is visual-only — audio is byte-identical (Phase 08)" and the entry "`harmony.subview` and `harmony.registerMode` are ephemeral — not persisted (Phase 08)" remain accurate and are not superseded by this decision. The UI toggle is removed; the underlying invariants (visual-only, not persisted, audio-safe) are unchanged.

**Justification:** The new Canvas 2D layer uses the prototype's per-chord `chordVoicing` call directly, which already produces absolute pitches without octave-continuity. Adding `suavizado` logic to the Canvas 2D layer would require porting `computeVoiceTracks` into the render loop — adding complexity that the prototype does not have and that the Pilot did not request. The register toggle was a Phase 08 addition; the Pilot has chosen to simplify back to the prototype's direct voicing model.

---

### D3 — Responsive staff geometry

The prototype's geometry in `Pentagrama.dc.html` is the binding specification. The Canvas 2D layer uses these constants on every `setup(w, h)` call:

| Constant | Formula | Meaning |
|---|---|---|
| `LS` | `Math.max(24, Math.min(88, H / 6))` | Responsive line spacing in px; clamps to [24, 88] |
| `cy` | `H / 2 − LS × 0.75` | Staff center y; shifted upward relative to canvas midpoint |
| Staff lines | `cy − n × LS` for `n` in `{−2, −1, 0, +1, +2}` | E4, G4, B4 (center), D5, F5 (treble lines bottom to top) |
| `SL` | `76` (px, fixed) | Clef gutter; staff content starts at x = SL |
| `PX` | `48` (px/cycle) | Pixels per cycle; equals `PX_PER_CYCLE` from `time-map.ts` |
| DPR | `Math.min(devicePixelRatio, 2)` | Device pixel ratio cap |

**DPR scaling contract:** On each `setup(w, h)` call:
```
canvas.width  = Math.round(w * dpr)
canvas.height = Math.round(h * dpr)
canvas CSS:   width: w px; height: h px
```
Each `paint(ts)` frame: `ctx.save(); ctx.scale(dpr, dpr); ... ctx.restore()`.

**Coordinate system note (inventory §ny-formula-reconciliation):** The prototype uses two separate vertical anchors that coexist without reconciliation:
- Staff lines: `cy − n × LS` (shifted upward by `LS × 0.75` from `H/2`).
- Note heads: `ny(pos) = H/2 − pos × (LS/2)` where `pos=0` is B4 (center line). `ny()` anchors to `H/2`, not `cy`. This means note heads are drawn slightly below the center staff line — an intentional visual characteristic of the prototype that the Canvas 2D layer preserves verbatim.

**Coordination with `PX_PER_CYCLE`:** `PX = 48` is the same value as `PX_PER_CYCLE` exported from `src/core/harmony/time-map.ts`. The Canvas 2D layer imports `PX_PER_CYCLE` from `time-map.ts` or declares `const PX = 48` that equals that value. The constant must not be redeclared at a different value — it is the coordination point between the staff content geometry, the ProgressionStrip ruler, and `computeSlotBounds` (ADR 0011 §Consequences item 3).

**Justification:** The prototype's responsive geometry (`LS = H/6`) produces a staff that fills the canvas legibly at any window height, clamped to avoid extremes. The fixed `SL = 76` gutter gives the clef glyph enough horizontal space while leaving the majority of the canvas for slot content. These constants were validated by the prototype's visual design review.

---

### D4 — Note-name → staff position mapping path

**Inventory verdict (OQ-R2):** `staff-map.ts` has no `noteNameToMidi`-equivalent export. Its `noteToStaffPosition` export uses a different coordinate system (diatonic steps from C4 = 0, equidistant letter positions), which is incompatible with the prototype's `pos` coordinate (B4-centered, derived from MIDI arithmetic). The Canvas 2D layer must NOT use `noteToStaffPosition` or `computeStaffLayout` — they produce coordinates for the PIXI renderer's `staffBaseY` geometry, not for the prototype's `ny()` geometry.

**Binding contract for the Canvas 2D layer:**

The only permitted rendering path is:

1. `chordVoicing(rootPc, qual, octave)` → string note names (`"C4"`, `"E4"`, `"G4"`, `"C#4"`)
2. Parse each string to MIDI integer (inlined in the render layer):
   ```
   chromatic pc map: C→0, C#→1, D→2, D#→3, E→4, F→5, F#→6, G→7, G#→8, A→9, A#→10, B→11
   (plus flat aliases: Bb→10, Eb→3, Ab→8, Db→1, Gb→6 for robustness)
   midi = chromaticPc + (octave + 1) * 12
   ```
   Since `chordVoicing` uses sharp-only spellings (ADR 0011 §Consequences item 4), only sharp cases occur in production; flat handling is defensive.
3. `m2p(midi)` → `{ pos: number; sh: boolean }` — ported verbatim from the prototype (Pentagrama.dc.html lines 160–165):
   ```js
   m2p(midi) {
     const N = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
     const D = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 };
     const n = N[midi % 12], sh = n.length > 1, b = sh ? n[0] : n;
     return { pos: (Math.floor(midi / 12) - 5) * 7 + D[b] - 6, sh };
   }
   ```
   `pos = 0` is B4 (MIDI 71). Positive `pos` is upward (higher pitch). `sh` is true when the note requires a sharp accidental.
4. `ny(pos, H, ls) = H/2 − pos × (ls/2)` — canvas y for the note head. Anchored to `H/2` (not `cy`).
5. `sh` flag → draw `♯` glyph; also shifts sustain bar left edge (prototype: `bx = x + (sh ? 22 : 6)`).

**Why not `voice-tracks.ts`:** `voice-tracks.ts` computes continuous voice tracks with optional octave-continuity (`registerMode`). The Canvas 2D layer uses per-chord direct voicing (matching the prototype), so `voice-tracks.ts` output is not consumed. Importing it would also require the register mode logic that D2 removes.

**Why not `computeStaffLayout`:** `computeStaffLayout` produces layout records (`NoteHead`, `RestGlyph`) in the PIXI-renderer's coordinate system (`stepToY`, `staffBaseY`). These are incompatible with the prototype's `pos`/`ny()` system. Converting between the two systems is more complex than porting `m2p` verbatim.

**Justification:** The prototype's `m2p` is a 5-line function. Porting it verbatim is zero-risk, directly proven by the prototype's working visual, and keeps the rendering pipeline as close to the design spec as possible. The note-name→MIDI inline is equally trivial (one lookup table and one arithmetic formula). No abstraction is needed.

---

### D5 — Arpeggio stagger: per-cycle, not per-slot

**Corrected behavior (overrides prototype `pArp`):**

Arpeggio mode renders voice onset circles at per-cycle offsets, repeated `Math.ceil(bars)` times across each slot:

```
for cycleIdx in 0 .. Math.ceil(bars) - 1:
  voice 0: slotX + SL + cycleIdx * PX
  voice 1: slotX + SL + cycleIdx * PX + PX / 3    (≈ 16 px offset)
  voice 2: slotX + SL + cycleIdx * PX + 2 * PX / 3 (≈ 32 px offset)
  connector line between the three circles within this cycle
```

where `PX = 48` and `slotX` is the slot's left edge relative to x=0 (before the `SL` offset).

**Prototype divergence (inventory OQ-R7, Pentagrama.dc.html lines 468–476):**

The prototype `pArp` uses a per-slot spread:
```js
const span = w - 24;   // w = slot duration * PX (whole slot width minus margins)
const pts = slot.voices.map((v, vi) => ({
  x: x + 12 + (vi / Math.max(n - 1, 2)) * span,   // per-SLOT spread
  y: this.ny(this.m2p(v.midi).pos),
}));
```
For a 2-bar slot (`w = 96 px`, `span = 72 px`): voice 0 at `x+12`, voice 1 at `x+48`, voice 2 at `x+84` — spread once across the entire slot.

**Why the corrected version is used instead:**

Strudel arpeggio codegen produces `note("A B C")` inside `arrange([bars, code])`. The three notes `A`, `B`, `C` are assigned to beats 1, 2, 3 within each cycle of the slot. A 2-bar slot plays the group twice: A/B/C in bar 1, then A/B/C again in bar 2. The per-cycle stagger makes this rhythm visible — three circles in bar 1, three more circles in bar 2. The prototype's per-slot spread would show only three circles for a 2-bar slot, mis-representing the audio.

This corrected behavior was already implemented in the PIXI staff scene (steps 10.5–10.6, commit 0c3d595) and is cited as the precedent in `phase-10-redesign.md` line 100. The Canvas 2D layer continues this corrected behavior.

Dev handoffs for step 10.12 must cite prototype `pArp` (Pentagrama.dc.html lines 468–476) and document this intentional divergence.

---

### D6 — Interaction wiring: DOM pointer events on the Canvas 2D element

The Canvas 2D `<canvas>` element registers its own `pointerdown`, `pointermove`, and `pointerup` listeners directly on the element (not routed through `App.svelte`'s PIXI canvas listeners). This is a different wiring topology than the PIXI staff scene (which was routed through `App.svelte`'s unified canvas event listeners per ADR 0014 D3 implementation note).

**Rationale for direct wiring:** The Canvas 2D `<canvas>` is a separate DOM element from the PIXI `<canvas>`. When `subview === 'staff'`, the Canvas 2D canvas sits above the PIXI canvas (z-index: 1 vs z-index: auto/0, per inventory OQ-R6) and receives pointer events directly. Routing through `App.svelte` would require `App.svelte` to forward events across DOM elements, adding unnecessary coupling.

**Guard:** At event time, check `subview === 'staff'` as belt-and-suspenders (the `pointer-events:none` CSS already prevents events when the canvas is hidden, but an explicit guard in the handler prevents any race-condition edge case).

**Hit-test reuse:** All slot geometry is delegated to `staff-hit.ts`:
```ts
const adjustedPx = e.offsetX - SL;    // subtract clef gutter offset
hitTestSlot(adjustedPx, slotBounds)   // null when adjustedPx < 0 (clef gutter)
hitTestResizeHandle(adjustedPx, slotBounds, handleWidth)
nearestInsertionIndex(adjustedPx, slotBounds)
```

Pointer in the clef gutter (`e.offsetX < SL`) produces `adjustedPx < 0`. All `staff-hit.ts` functions return `null` for negative `px` values (confirmed by inventory OQ-R3: `hitTestSlot` checks `px >= b.x` where all `b.x >= 0`). No special gutter-guard needed in the handler.

**Pointer capture:** `canvas.setPointerCapture(e.pointerId)` is called in `onDn` when starting a resize or move drag, and `canvas.releasePointerCapture(e.pointerId)` is called in `onUp`. This ensures `pointermove` and `pointerup` are delivered to the canvas even if the pointer leaves the element during the drag.

**Store action call chain (unchanged from ADR 0014):** All write operations go through the same store actions as the ProgressionStrip — `clearChordAt`, `setChordBars` (with `clampBars`), `reorderSlot`. These call `requeueLive()` → audio at next cycle. No new store actions are introduced.

---

### D7 — Lifecycle: rAF loop owned by the Canvas 2D module

The Canvas 2D rendering is managed by a module singleton in `src/render/pentagrama-scene.ts`. The module owns the full lifecycle: element creation, rAF loop, ResizeObserver, and cleanup.

**Module exports:**

```typescript
// Initialise: create the <canvas>, append to stageEl, start rAF + ResizeObserver
export function initPentagrama(stageEl: HTMLDivElement): void

// Cleanup: cancel rAF, disconnect ResizeObserver, remove canvas from DOM
export function destroyPentagrama(): void

// Show/hide: toggle display + pointer-events to match subview state
export function setPentagramaVisible(visible: boolean): void
```

**Lifecycle rules:**

- `initPentagrama(stageEl)` is called once from `App.svelte`'s `onMount`, after `initStage`.
- `destroyPentagrama()` is called from `App.svelte`'s `onDestroy`.
- `setPentagramaVisible(state.view === 'harmony' && state.harmony.subview === 'staff')` is called from `App.svelte`'s store subscription reactive block on every state change (no debounce needed — it is a simple CSS attribute set).
- ResizeObserver watches the stage container `<div>`; on each size notification it calls `setup(w, h)` to update `canvas.width`, `canvas.height`, and CSS dimensions.
- The rAF loop calls `paint(ts: DOMHighResTimeStamp)` on every frame. `paint` reads current `SessionState` via Svelte `get(sessionStore)` — no subscription needed; reading on every frame is correct (Canvas 2D is an immediate-mode renderer that redraws everything each frame).

**Show/hide CSS strategy (inventory OQ-R6):**

```css
position: absolute;
top: 0;
left: 0;
z-index: 1;           /* above PIXI canvas (auto/0), below Hud/Legend (3) */
display: none;        /* toggled to 'block' when visible */
pointer-events: none; /* toggled to 'auto' when visible */
```

No PIXI Application is involved in the rAF loop. The PIXI application's own ticker continues to run the Tonnetz and Rhythm scenes; the Canvas 2D rAF is a separate browser-native loop.

**No memory leaks:** `destroyPentagrama()` cancels the rAF handle (`cancelAnimationFrame`), disconnects the ResizeObserver (`observer.disconnect()`), removes the canvas from the DOM (`canvas.remove()`), and removes the pointer event listeners. All three cleanup paths are exercised in `App.svelte`'s `onDestroy`.

**Justification:** A module singleton (not a Svelte component) is chosen because the Canvas 2D canvas has imperative lifecycle concerns (rAF loop, ResizeObserver) that fit naturally in a TypeScript module, consistent with the existing `stage.ts`, `tonnetz-scene.ts`, and `rhythm-scene.ts` modules. The module exports a clean three-function API that `App.svelte` can call without knowing internal details.

---

## Consequences

1. **Two rendering technologies coexist in the Armonía view.** Tonnetz is PIXI v7; Pentagrama is Canvas 2D. They are fully isolated: the PIXI Application never touches the Canvas 2D `<canvas>` element, and `pentagrama-scene.ts` never touches PIXI. The coexistence is intentional and contained.

2. **`harmony-staff-scene.ts` is deleted.** It had no importers other than `App.svelte`. Its deletion produces zero TypeScript errors after the `App.svelte` import block (lines 44–50) and nine call sites are removed. The file's logic is superseded by `pentagrama-scene.ts`. Git history preserves it.

3. **`_staffContainer` is removed from `stage.ts`.** The Canvas 2D `<canvas>` is a plain DOM element, not a PIXI child. `StageRefs` no longer exports `staffContainer`. Code that previously referenced `refs.staffContainer` (only `App.svelte`, which is updated in the same step) will fail with a TypeScript error until updated — this is the intended compile-time safety net.

4. **`voice-tracks.ts` and `staff-layout.ts` become visual-pipeline dead code.** Their unit tests remain in force and must not regress. If a future phase reactivates these engines (e.g., for an orbital view), no code changes are needed — they are already correct and tested.

5. **The register mode toggle is removed from the UI.** `HarmonyState.registerMode` remains in the store type as an inert field. The invariants recorded in the Decisions Register (Phase 08) are unchanged: `registerMode` is visual-only, not persisted, and audio-safe. The field may be removed in a future cleanup phase if desired, but it is not a blocker for Phase 10.

6. **Zero codegen changes across the entire redesign.** `src/core/codegen/strudel.ts` is untouched by all redesign steps (10.11–10.15). Audio output for any given session state is byte-identical before and after the Canvas 2D switch. `git diff main...HEAD -- src/core/codegen/strudel.ts` must remain empty at step 10.16.

7. **`staff-hit.ts` (42 unit tests) is reused as-is.** The pure engine's `computeSlotBounds`, `hitTestSlot`, `hitTestResizeHandle`, and `nearestInsertionIndex` are imported by `pentagrama-scene.ts`. The `SL` offset subtraction (`e.offsetX - SL`) is applied in the render layer before calling the engine — the engine's coordinate system (x=0 at first slot left edge) is unchanged.

8. **All quality gates must remain green at every step.** `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm exec vitest run` (≥ 447 tests), and `pnpm build` must all pass after each of steps 10.11–10.15. The step 10.9 baseline (447 passed, 0 tsc errors, 0 lint errors) is the floor.
