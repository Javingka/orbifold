<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0014 — Staff editor: duration-extent rendering, slot interaction, and bar grid

- **Status:** Accepted
- **Date:** 2026-06-12
- **Initiative / Phase:** orbifold-v2 / Phase 10 (step 10.2)
- **Deciders:** Pilot (Javier)

## Context

Phase 07 delivered a treble-clef staff scene (`harmony-staff-scene.ts`) that renders the active progression's three voices as colored dots at the slot onset positions. Phase 08 enlarged it to full-canvas geometry and added a cyclic playhead. Both phases kept the staff a read-only visualization: ADR 0011 D2 states explicitly that the staff "does not expose any editing affordance for duration or gain."

Phase 10 transforms the Pentagrama from a visualization into a creation tool with parity to the ProgressionStrip badge interaction model. The Pilot's stated goal is: "el pentagrama no es solo visualización, es también construcción, de la misma forma que los tracks del ritmo lo son."

Five design questions were surfaced in the Phase 10 inventory (step 10.1) and resolved by the Pilot at Checkpoint #1 (2026-06-12):

- **OQ-1 (cut line):** Phase 10 = slot editor for existing `Chord` / `RestSlot` slots. Note-level free placement (new `NoteSlot` data model) deferred to Phase 11.
- **OQ-2 (extent visual):** Option A — filled horizontal bar per voice, colored per voice, 80% opacity, 8px tall, with an onset circle at the left edge.
- **OQ-3 (time-move gesture):** Option A — body drag moves the slot in time; same idiom as ProgressionStrip segment drag.
- **OQ-4 (suavizado editing hazard):** Not resolved this phase — Phase 11 territory.
- **OQ-5 (arpeggio visual):** Option A — beat-accurate stagger: each voice onset drawn at the third of the slot where it actually sounds, with an ascending connector line.

This ADR records the seven binding decisions that govern steps 10.3–10.8.

---

## Decisions

### D1 — Amendment to ADR 0011 D2: staff becomes a co-equal duration editor

**Superseded decision:** ADR 0011 D2 stated: "The staff view and the orbital view are read-oriented visualisations — they do not expose any editing affordance for duration or gain."

**This decision amends ADR 0011 D2 as follows:**

The Pentagrama staff IS an editor for per-slot **duration** and for slot **deletion** and slot **reordering**. The ProgressionStrip remains visible and continues to function as a co-equal editor. Both surfaces operate through the same exported store actions and stay in sync through the same `sessionStore` state. There is no conflict-resolution logic — they are two write surfaces for the same store.

| Operation | Staff | ProgressionStrip | Store action |
|---|---|---|---|
| Resize slot duration | Yes (right-edge drag handle) | Yes (drag-to-resize) | `setChordBars(idx, bars)` |
| Delete slot | Yes (✕ button) | Yes (✕ badge button) | `clearChordAt(idx)` |
| Reorder slot | Yes (body drag) | No (not supported in strip) | `reorderSlot(fromIdx, toIdx)` |
| Edit per-chord gain | **No — gain stays strip-only** | Yes (vertical drag) | `setChordGain(idx, gain)` |

Gain editing remains ProgressionStrip-only. The staff has no vertical gain axis and expresses no gain affordance. If the Pilot later wants gain editing on the staff, a new ADR amendment is required.

**Justification:** "el pentagrama no es solo visualización, es también construcción." The staff's spatial encoding (note position = pitch, horizontal extent = time) makes duration editing natural and pedagogically transparent — the user sees the note's duration as a visible bar and can drag its right edge to change it, exactly as in a DAW piano roll. Requiring the user to switch to the ProgressionStrip for every duration edit breaks the flow of working in the staff view. Both surfaces calling the same store actions is the standard Svelte store pattern and introduces no synchronization hazard.

---

### D2 — Duration-extent rendering model

A chord slot of duration `bars` cycles renders as a horizontal extent for each of the three voices, at the voice's diatonic-step y-position. Rest slots render as a single grey extent at the middle staff line.

**Chord mode visual (per OQ-2 resolution — Option A):**

For each `NoteHead` in `_layout.noteHeads`:
- A horizontal filled rounded-rectangle bar: width = `bars × PX_PER_CYCLE` pixels (minimum 8px), height = 8 px, corner radius = 2 px, fill = voice color, opacity = 80%.
- An onset circle at the left edge of the bar: radius = `NOTE_RADIUS = 4` px, fill = voice color, opacity = 100%.
- `nx = nh.x + NOTE_OFFSET_X` is the left x coordinate.
- `ny = stepToY(nh.stepY, staffBaseY)` is the voice y coordinate.
- `barWidth = Math.max(nh.bars * PX_PER_CYCLE, 8)` — minimum-width guard prevents invisible single-pixel extents.

**Rest slot visual:**

For each `RestGlyph` in `_layout.restGlyphs`:
- A horizontal filled rounded-rectangle bar: width = `rg.bars × PX_PER_CYCLE` pixels, height = 8 px, corner radius = 2 px, fill = `COL.faint`, opacity = 60%.
- A short center tick (2px line, `COL.faint`, 90% opacity, half-width = `REST_HALF_W = 10`) drawn at the horizontal center of the bar for legibility on the staff.
- Position: `restY = stepToY(6, staffBaseY)` — step 6 = B4, the middle staff line.

**Arpeggio mode visual (per OQ-5 resolution — Option A):**

When `chordMode === 'arp'`, each slot is rendered with beat-accurate stagger instead of parallel bars. NoteHeads are grouped by their slot (keyed by `nh.x = startCycle × PX_PER_CYCLE`). For each group of three voices:

| Voice index | Onset x | Semantics |
|---|---|---|
| voice 0 | `slotStart + NOTE_OFFSET_X` | sounds on beat 1 of the slot |
| voice 1 | `slotStart + NOTE_OFFSET_X + bars × PX_PER_CYCLE / 3` | sounds on beat 2 (one-third into the slot) |
| voice 2 | `slotStart + NOTE_OFFSET_X + 2 × bars × PX_PER_CYCLE / 3` | sounds on beat 3 (two-thirds into the slot) |

Each voice is drawn as an onset circle (`NOTE_RADIUS = 4`) at the staggered x position using the voice color. A thin ascending connector line (1 px, `0xffffff`, 35% opacity) is drawn as a polyline from `(x0, ny_v0)` → `(x1, ny_v1)` → `(x2, ny_v2)`. The horizontal duration bar is omitted in arpeggio mode; only the onset circles and connector line are drawn.

If a group has fewer than three note-heads (e.g., due to a rest spanning the slot, or future single-note slots), the connector line is skipped; available onset circles are drawn individually.

**Invariants:**

- `PX_PER_CYCLE` is imported from `../core/harmony/time-map.js` — never redeclared locally.
- `barWidth` is computed as `nh.bars * PX_PER_CYCLE`, not from any other source.
- Audio output (`melodyLine`, `chordToStrudel`) is byte-identical before and after this step — no changes to `src/core/codegen/strudel.ts`.

---

### D3 — Hit-test architecture: pure engine + thin PIXI handler

All slot geometry (bounds, hit-testing) is computed in `src/core/harmony/staff-hit.ts` — a pure TypeScript engine with no DOM, PIXI, or Svelte imports. This maintains the `src/core/**` invariant.

**`staff-hit.ts` exports:**

```typescript
export interface SlotBounds {
  slotIndex: number;
  x: number;       // pixel x of slot left edge
  width: number;   // pixel width = bars * pxPerCycle
}

export function computeSlotBounds(
  progression: ReadonlyArray<{ bars?: number }>,
  pxPerCycle: number
): SlotBounds[]
// Returns one SlotBounds per slot in progression order.
// Uses slot.bars ?? 1 for duration. Slots are contiguous (no pixel gap).

export function hitTestSlot(
  px: number,
  bounds: SlotBounds[]
): number | null
// Returns slotIndex of the first entry where bounds[i].x <= px < bounds[i].x + bounds[i].width.
// Returns null if no match.

export function hitTestResizeHandle(
  px: number,
  bounds: SlotBounds[],
  handleWidth: number
): number | null
// Returns slotIndex if px >= bounds[i].x + bounds[i].width - handleWidth (pixel is in the handle zone).
// Returns null if no match.

export function nearestInsertionIndex(
  px: number,
  bounds: SlotBounds[]
): number
// Returns the index at which inserting a slot would place it nearest to pixel position px.
// Returns the index of the first slot whose center x exceeds px, clamped to [0, bounds.length].
// Used by the time-move gesture to compute the target insertion index during drag.
```

**PIXI interaction layer architecture:**

A single transparent full-canvas hit rectangle (`_hitRect: PIXI.Graphics`) is added to `_staffContainer` with `interactive = true` and `hitArea = new PIXI.Rectangle(...)` covering the staff vertical span. This rectangle intercepts all pointer events. Per-slot `PIXI.Graphics` objects do not have `interactive = true`.

`pointerdown`, `pointermove`, and `pointerup` listeners on `_hitRect` dispatch to the pure engine functions above to determine which slot is under the pointer. UI affordances (selection border, ✕ button, resize handle, ghost bar) are drawn into an overlay layer (`_affordanceGfx` or `_dynGfx`).

**Justification:** The full-canvas hit rectangle is simpler and more robust than per-slot PIXI object interactivity — it avoids z-order and hit-area fragmentation issues, and the pure-engine dispatch model keeps all geometry math unit-testable without a browser.

---

### D4 — Slot interaction gesture specification

**Select / deselect:**

- `pointerdown` on a slot body (not the resize handle, not the ✕ region) → `_selectedSlotIdx = slotIndex`. Affordances are drawn on top of `_staffGfx`.
- `pointerdown` outside all slots → `_selectedSlotIdx = null`. Affordances cleared.

**Delete (✕):**

- When `_selectedSlotIdx` is non-null, a ✕ button is drawn at `(slotRight − 10, staffBaseY − 20)` using `PIXI.Text` with `×`, font size 14, white.
- Hit region: `PIXI.Rectangle(slotRight − 18, staffBaseY − 28, 16, 16)`.
- `pointerdown` in the ✕ hit region calls `clearChordAt(_selectedSlotIdx)`. `_selectedSlotIdx` is reset to `null`.
- `PIXI.Text` objects are explicitly `destroy()`ed on each affordance rebuild to prevent memory leaks. A single `_deleteBtn: PIXI.Text | null` module-level variable is used; it is destroyed before reassignment.

**Resize (right-edge drag):**

- When `_selectedSlotIdx` is non-null, a right-edge handle (4 px wide, white vertical bar) is drawn at `x = slotRight`. Hit zone width = 10 px.
- `pointerdown` in the handle zone starts resize: `_resizeActive = true`, `_resizeStartPx = px`, `_resizeStartBars = slot.bars ?? 1`.
- `pointermove` while `_resizeActive`: `deltaPx = px − _resizeStartPx`; `_resizePreviewBars = clampBars(_resizeStartBars + deltaPx / PX_PER_CYCLE)`. Affordance layer redrawn with a preview outline rectangle (no store write).
- `pointerup` while `_resizeActive`: calls `setChordBars(_selectedSlotIdx, _resizePreviewBars)`. `_resizeActive = false`. The store write triggers `buildHarmonyStaffScene` re-invocation (via App.svelte reactive subscription), which recomputes `_slotBounds` with fresh data and redraws affordances.
- Minimum bars = 0.25; maximum bars = 8; rounding = 0.25 — same `clampBars` semantics as ProgressionStrip.
- `clampBars` is imported from `session.ts`.

**Time-move (body drag, per OQ-3 resolution — Option A):**

- Dragging the slot body (not the resize handle, not the ✕ region) moves the slot in time.
- Movement is triggered only after the pointer has moved at least 4 px from the `pointerdown` position (prevents accidental moves on tap).
- While `_moveActive`: a semi-transparent (40% opacity) ghost bar is drawn at the current drag position. A thin vertical insertion indicator (2 px, white, 80% opacity) is drawn at the boundary closest to the drag position.
- `pointerup` while `_moveActive`: if `_moveInsertIdx !== _moveFromIdx`, calls `reorderSlot(_moveFromIdx, _moveInsertIdx)`. State is reset.

**Affordance visibility rule:**

Select affordances (✕ and resize handle) are not drawn while `_resizeActive` or `_moveActive`. During resize, only the preview outline rectangle is drawn. During move, only the ghost bar and insertion indicator are drawn.

---

### D5 — `reorderSlot` store action semantics

`reorderSlot(fromIdx: number, toIdx: number): void` is a new exported store action in `src/state/session.ts`.

**Semantics:**

1. Both `fromIdx` and `toIdx` are clamped to `[0, progression.length − 1]`.
2. If the clamped values are equal, the function is a no-op (no store write, no `requeueLive()` call).
3. Otherwise: removes the slot at `fromIdx` (splice-out), inserts it at `toIdx` (splice-in). This is an absolute-index reorder: `toIdx` is the desired final position of the slot, not an offset.
4. Calls `requeueLive()` after the store update.

**Effect on audio:** `reorderSlot` changes the progression order, which changes the `arrange()` Strudel output. This is intended behavior — the user is reordering their composition. It is NOT a regression.

**Implementation pattern** (per inventory §f):

```typescript
export function reorderSlot(fromIdx: number, toIdx: number): void {
  sessionStore.update((s) => {
    const progression = s.harmony.progression;
    const clampedFrom = Math.max(0, Math.min(fromIdx, progression.length - 1));
    const clampedTo = Math.max(0, Math.min(toIdx, progression.length - 1));
    if (clampedFrom === clampedTo) return s;
    const newProgression = [...progression];
    const [removed] = newProgression.splice(clampedFrom, 1);
    newProgression.splice(clampedTo, 0, removed);
    return { ...s, harmony: { ...s.harmony, progression: newProgression } };
  });
  requeueLive();
}
```

`reorderSlot` must NOT be called directly from inside `sessionStore.update` — `requeueLive()` is called after the update completes.

---

### D6 — Bar grid on the staff canvas

A bar grid is drawn over the staff canvas to visually relate staff time to the rhythm's cycle grid, aligning the Pentagrama with the ProgressionStrip ruler above it.

**Grid specification:**

- Beat lines: drawn at every `PX_PER_CYCLE / 4 = 12` px interval from x = 0 to x = `_staffWidth`. Style: 1 px, `COL.faint`, 15% opacity.
- Bar lines: drawn at every `PX_PER_CYCLE = 48` px interval from x = 0 to x = `_staffWidth`. Style: 1 px, `COL.faint`, 35% opacity.
- Left boundary (x = 0): 1 px, `COL.faint`, 50% opacity.

**Vertical span:** Grid lines span from `stepToY(TREBLE_STAFF_LINES[TREBLE_STAFF_LINES.length - 1] + 2, staffBaseY)` (above the top staff line) to `stepToY(−6, staffBaseY)` (below the bottom staff line) — the same vertical span used by the playhead line.

**Implementation:** A `drawBarGrid(gfx, staffBaseY, totalBars, screenWidth)` helper function (inside `harmony-staff-scene.ts`, not exported). Called from `buildHarmonyStaffScene` before note/rest rendering. `totalBars = _staffWidth / PX_PER_CYCLE`.

**Coordination rule:** The grid uses `PX_PER_CYCLE` imported from `../core/harmony/time-map.js` — the same canonical constant used by the note-head x positions and the ProgressionStrip ruler. The visual alignment between the staff grid and the ProgressionStrip ruler is guaranteed by this shared constant.

---

### D7 — Arpeggio mode visual binding specification (per OQ-5 resolution — Option A)

When `chordMode === 'arp'` (read from `state.chordMode` in `buildHarmonyStaffScene` and passed to `drawStaticStaff`), the staff renders beat-accurate staggered onsets instead of parallel duration bars.

**x-coordinates for the three voice onsets in a slot with `startCycle` and duration `bars`:**

| Voice | x coordinate |
|---|---|
| voice 0 | `startCycle × PX_PER_CYCLE + NOTE_OFFSET_X` |
| voice 1 | `startCycle × PX_PER_CYCLE + NOTE_OFFSET_X + bars × PX_PER_CYCLE / 3` |
| voice 2 | `startCycle × PX_PER_CYCLE + NOTE_OFFSET_X + 2 × bars × PX_PER_CYCLE / 3` |

**Rationale for the offsets:** In Strudel, `note("A B C")` assigns A to beat 1, B to beat 2, C to beat 3 within the cycle span. For a slot of `bars` cycles, each of the three notes sounds at one-third of the slot's cycle span. The stagger makes this timing visible on the staff, which is the pedagogical goal.

**Implementation detail:**

`drawStaticStaff` receives a new `chordMode: 'chord' | 'arp'` parameter. NoteHeads are grouped into a `Map<number, NoteHead[]>` keyed by `nh.x` (= `startCycle × PX_PER_CYCLE`) before the rendering loop. In arpeggio mode, the rendering loop iterates over groups rather than individual NoteHeads; the stagger offsets are applied per group.

**No changes to `staff-layout.ts` or `voice-tracks.ts`:** The `NoteHead.bars` field carries the slot duration and is already populated from `noteEv.bars` in `computeStaffLayout`. Arpeggio stagger is purely a rendering concern.

**Audio invariant:** `chordMode` changes in codegen produce the known comma-vs-space difference in the Strudel string (chord mode: `note("A,B,C")`, arpeggio mode: `note("A B C")`). This step makes no codegen changes — audio output is byte-identical before and after the visual arpeggio stagger is introduced.

---

## Consequences

1. **ProgressionStrip and staff are co-equal duration editors via shared store actions.** Both surfaces call `setChordBars`, `clearChordAt`, and (staff only) `reorderSlot`. A change made on either surface is immediately reflected in the other. The session store is the single source of truth. No synchronization conflict is possible — both surfaces are downstream consumers that trigger `buildHarmonyStaffScene` / `ProgressionStrip` reactive updates on the same store change.

2. **Gain stays ProgressionStrip-only.** The staff exposes no gain affordance. `setChordGain` is not imported into `harmony-staff-scene.ts`. If a future phase adds gain to the staff, a new ADR amendment is required.

3. **Ephemeral interaction state lives module-level in `harmony-staff-scene.ts`.** The selected slot index, resize state, and move state are module-level variables (`_selectedSlotIdx`, `_resizeActive`, `_resizePreviewBars`, `_moveActive`, etc.). They are NOT in the session store and NOT persisted. This is consistent with the existing decision that `registerMode` and `subview` are ephemeral (Decisions Register, Phase 08). A `buildHarmonyStaffScene` call (triggered by any store change) resets slot bounds but does NOT clear the selected slot index — the selection persists across progression changes unless explicitly cleared by a `clearChordAt` or `reorderSlot` callback. **Selection guard (Pilot, Checkpoint #2, 2026-06-12):** on every `buildHarmonyStaffScene` rebuild, `_selectedSlotIdx` is validated against the fresh progression length — if `_selectedSlotIdx >= progression.length`, it is reset to `null`. This covers external edits (e.g., a slot deleted from the ProgressionStrip while another slot is selected on the staff) so the selection can never point at a nonexistent slot. A stale-but-valid index (pointing at a different slot after an external reorder/delete) is accepted as known behavior.

4. **`reorderSlot` changes audio output by design.** Reordering progression slots changes the `arrange()` Strudel output — the audible sequence of chords changes. This is the intended behavior (the user is editing their composition), not a regression. The `requeueLive()` call ensures the reordered pattern takes effect at the next cycle boundary, consistent with the "live changes requeue to the next cycle" invariant.

5. **No codegen changes anywhere in Phase 10.** `src/core/codegen/strudel.ts`, `melodyLine`, and `chordToStrudel` are not modified in any Phase 10 step. The duration-extent rendering, bar grid, interaction layer, arpeggio stagger, and `reorderSlot` store action are all downstream of the codegen pipeline. Audio output for a given session state is byte-identical before and after any Phase 10 visual rendering change.

6. **`staff-hit.ts` is a pure engine module.** It has no DOM, PIXI, or Svelte imports. It is unit-testable in Node (Vitest, no headless browser). This maintains the `src/core/**` invariant from ADR 0011 §Consequences item 1.

7. **`_slotBounds` is recomputed on every `buildHarmonyStaffScene` call.** `computeSlotBounds` is called at the end of `buildHarmonyStaffScene` with the current `state.harmony.progression`. This ensures that after a `setChordBars` or `clearChordAt` or `reorderSlot` store action, the interaction hit-test geometry is fresh. There is no stale-bounds hazard.

8. **ADR 0011 D2 is superseded by D1 of this ADR for the "editing affordance" clause.** ADR 0011 D2's statement "they do not expose any editing affordance for duration or gain" is partially overridden: duration editing is now permitted on the staff; gain editing remains strip-only. All other clauses of ADR 0011 D2 (ProgressionStrip preserved, staff is a downstream store consumer) remain in effect.
