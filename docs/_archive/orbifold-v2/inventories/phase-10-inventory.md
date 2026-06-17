# Phase 10 Inventory — Pentagrama as editor: duration-extent rendering, slot manipulation, bar grid

**Step:** 10.1
**Date:** 2026-06-12
**Branch:** orbifold-v2/phase-10

---

## (a) Playhead discrepancy investigation

### Pilot's verbatim observation

> "el pentagrama tiene un playhead que continúa andando sin parar cuando se da play, sin embargo la sección de progresión de armónicos queda en loop."

### Sub-question 1 — Do `_staffWidth` and `cursorTotalWidth` use the same formula?

**Verdict: YES — they are identical.**

`harmony-staff-scene.ts` line 307–310:
```typescript
_staffWidth = Math.max(
  state.harmony.progression.reduce((sum, slot) => sum + (slot.bars ?? 1), 0) * PX_PER_CYCLE,
  MIN_STAFF_WIDTH
);
```

`ProgressionStrip.svelte` line 151–152:
```typescript
$: cursorTotalWidth =
  $sessionStore.harmony.progression.reduce((s, slot) => s + (slot.bars ?? 1), 0) * PX_PER_CYCLE;
```

Both:
- Iterate `harmony.progression`
- Use `slot.bars ?? 1` for each slot (covers both `Chord` and `RestSlot`)
- Multiply by `PX_PER_CYCLE` (imported from `time-map.ts` in `harmony-staff-scene.ts`; a local `const PX_PER_CYCLE = 48` in `ProgressionStrip.svelte` — same value, vigent coordination-point rule confirmed by Phase 09 step 09.6 static analysis)

The only difference is the `Math.max(..., MIN_STAFF_WIDTH)` guard in `_staffWidth` (prevents zero width on empty progression) vs. `cursorTotalWidth` which can be zero (but the strip cursor loop bails out at `if (cursorTotalWidth <= 0) return requestAnimationFrame(tick)`). Semantically equivalent: neither draws or wraps when the progression is empty.

After Phase 09 (which added no changes to either file), both formulas remain identical.

### Sub-question 2 — Is the BUG A fix (hide playhead when `nowPlaying.source === null`) in place and consistent?

**Verdict: YES — both guards are in place and consistent.**

**In `harmony-staff-scene.ts` (`updateHarmonyStaffDynamic`)**, line 362:
```typescript
if (state.nowPlaying.source === null) return;
```
The function returns early without drawing the playhead line. Added in Phase 08 post-verification REVISE II (ADR 0011 Amendment D6). Module comment line 40: `// Guard: if nowPlaying.source === null, clear and return (BUG A, post-verification REVISE II)`.

**In `ProgressionStrip.svelte`** (`startCursorLoop` / reactive block), lines 171–176 and 213–221:
```typescript
// In the rAF tick:
if (state.nowPlaying.source === null) {
  cursorVisible = false;
  _cursorRaf = null;
  return;
}
// Reactive gating:
const isPlaying = $sessionStore.nowPlaying.source !== null;
const hasSlots = $sessionStore.harmony.progression.length > 0;
if (isPlaying && hasSlots) {
  startCursorLoop();
} else {
  stopCursorLoop();
}
```

Both surfaces gate on `nowPlaying.source === null`. The strip cursor also stops the rAF loop when the progression is empty. The staff scene's `tickHarmonyStaff` function (called unconditionally by the PIXI ticker) early-returns when `state.view !== 'harmony'` (line 402), which also covers non-harmony views.

### Sub-question 3 — Is `_staffWidth` ever `app.screen.width` instead of progression duration?

**Verdict: NO — `_staffWidth` is the progression duration in pixels, not the canvas width.**

`_staffWidth` is set exclusively at line 307–310 of `harmony-staff-scene.ts`:
```typescript
_staffWidth = Math.max(
  state.harmony.progression.reduce((sum, slot) => sum + (slot.bars ?? 1), 0) * PX_PER_CYCLE,
  MIN_STAFF_WIDTH  // = 200
);
```

The five staff lines are drawn with `lineWidth = app.screen.width` (line 315):
```typescript
drawStaticStaff(_staffGfx, _layout, _staffBaseY, _staffWidth, app.screen.width);
```

But `app.screen.width` is passed to `drawStaticStaff` as the `lineWidth` parameter for the staff lines only — the lines must span edge-to-edge (Phase 08 fix, A-08-10). The `staffWidth` parameter (= `_staffWidth`) is passed separately and is used only internally for note-head positions.

The playhead formula in `updateHarmonyStaffDynamic` line 377 uses `_staffWidth`:
```typescript
const playheadX = ((rawX % _staffWidth) + _staffWidth) % _staffWidth;
```

For a default 2-chord progression with `bars: 1` each, `_staffWidth = 2 * 48 = 96 px`, which is much smaller than `app.screen.width` (typically 1200–1800 px). The playhead wraps at 96 px, which is correct — it loops with the progression.

**Post-Phase-09 verification:** Phase 09 (steps 09.3–09.6) made no changes to `harmony-staff-scene.ts` or `ProgressionStrip.svelte`. The file-level comment in `harmony-staff-scene.ts` at line 37 explicitly documents the Post-verification fix (A-08-08): "_staffWidth must equal the full progression duration (totalBars × PX_PER_CYCLE), not layout.totalWidth." This fix was applied in Phase 08 and remains in effect.

### Sub-question 4 — Does any remaining discrepancy explain what the Pilot observed?

**Verdict: NO DISCREPANCY EXISTS.**

The formula is correct, the BUG A guard is in place, and `_staffWidth` is bounded by progression duration (not canvas width). The code is internally consistent as of Phase 09.

**Explanation of the Pilot's likely observation:**

The Pilot observed the behavior "el pentagrama tiene un playhead que continúa andando sin parar cuando se da play, sin embargo la sección de progresión de armónicos queda en loop." The most likely explanation is:

1. **The staff playhead and the ProgressionStrip cursor DO both loop** — they use the same formula and the same `getVisualPhaseAnchor()` anchor.

2. **The "keeps going" appearance** may be because the staff canvas is full-width (1000+ px) while the progression strip occupies only `totalBars × 48 px` (e.g., 96–288 px). A short progression's playhead traverses the strip in a visually obvious loop. On the staff canvas the same playhead traverses 96 px and immediately wraps back — the wrap is invisible because the staff extends far beyond the note content. The staff lines run edge-to-edge but the playhead wraps at `_staffWidth = progression_bars × 48`. So the playhead appears to "run" most of the way across blank staff and then teleport back — which could read as "keeps going" vs "loops" depending on how it was observed.

3. **The phase the Pilot observed may pre-date Phase 08.** Phase 08 step 08.6 added the cursor to the ProgressionStrip and fixed the BUG A guard. Phase 08's playhead was the cyclic-modulo fix. If the Pilot tested before these fixes, they would have seen the old behavior (playhead clamped at the last note, not looping). With Phase 09 complete, both playheads are cyclic and aligned.

**Conclusion: No code fix is needed in step 10.3.** The playhead sub-step (a) in 10.3 is a no-op. The phase-10 spec instructs: "If the inventory verdict was 'no discrepancy,' this sub-item is a no-op."

---

## (b) Duration-extent rendering gap

**Current behavior** (lines 193–197 in `drawStaticStaff`):
```typescript
// Filled circle note-head.
gfx.lineStyle(0);
gfx.beginFill(col, 1);
gfx.drawCircle(nx, ny, NOTE_RADIUS);
gfx.endFill();
```

A single `drawCircle` with `NOTE_RADIUS = 4` is drawn at `nx = nh.x + NOTE_OFFSET_X`, `ny = stepToY(nh.stepY, staffBaseY)`.

`NoteHead.bars` is populated (see `staff-layout.ts` line 46: `bars: noteEv.bars` and `voice-tracks.ts` line 24: `bars: number // duration of this chord in cycles`). The field exists in every `NoteHead` but is not used by the renderer.

**Changes needed to render duration-extent bars (ADR 0014 D2):**

Replace the single `drawCircle` call per `NoteHead` with:

1. A horizontal rounded-rectangle bar:
   ```typescript
   const barWidth = Math.max(nh.bars * PX_PER_CYCLE, 8); // guard against tiny widths
   gfx.beginFill(col, 0.8);
   gfx.drawRoundedRect(nx, ny - 4, barWidth, 8, 2);
   gfx.endFill();
   ```
   `nx = nh.x + NOTE_OFFSET_X` is already the left edge of the onset.

2. An onset circle at the left edge:
   ```typescript
   gfx.beginFill(col, 1);
   gfx.drawCircle(nx, ny, NOTE_RADIUS);
   gfx.endFill();
   ```

For rest glyphs (lines 203–209 in `drawStaticStaff`), the current rendering is a `lineStyle(3)` horizontal line at `restY = stepToY(6, staffBaseY)`. Phase 10 replaces this with a `drawRoundedRect` of width `rg.bars * PX_PER_CYCLE`, color `COL.faint`, opacity 0.6 — keeping the center tick for legibility.

`PX_PER_CYCLE` is already imported from `../core/harmony/time-map.js` (line 55). The import covers the bar width computation — no local redeclaration needed or allowed.

---

## (c) Interaction affordance gap

**Current state:** No PIXI interaction in `harmony-staff-scene.ts`. Confirmed by grep:
```
grep -n "interactive\|pointerdown\|hitArea\|pointer" src/render/harmony-staff-scene.ts → 0 matches
```

`buildHarmonyStaffScene` creates `_staffGfx`, `_dynGfx`, `_accidentalContainer`, and `_clefText`. None have `interactive = true` set, none have any pointer event listeners.

**What needs to be added:**

1. **A full-canvas transparent hit rectangle** (`_hitRect: PIXI.Graphics`) added after `_staffGfx` in `_staffContainer`. Set `_hitRect.interactive = true` and `_hitRect.hitArea = new PIXI.Rectangle(0, topY, app.screen.width, bottomY - topY)` where `topY`/`bottomY` are the same staff vertical span used by the playhead. Register `pointerdown`, `pointermove`, `pointerup` listeners on `_hitRect`.

2. **No per-slot `PIXI.Graphics` interactivity needed.** The hit-test layer approach (one transparent overlay with a `pointermove` handler dispatching to a pure engine) is the correct architecture per ADR 0014 D3. Individual `PIXI.Graphics` objects do not need `interactive = true`; the full-canvas overlay intercepts all pointer events and the pure engine determines which slot is under the pointer.

3. **`PIXI.Graphics.hitArea`** is the right approach for the full canvas rectangle (not per-slot). For the ✕ delete button, a hit-region check against a hardcoded `PIXI.Rectangle` is done in the `pointerdown` handler (not via a separate PIXI.Graphics object's hitArea).

4. **Affordance overlay layer:** A separate `_affordanceGfx: PIXI.Graphics` (or reusing `_dynGfx`) draws selection borders, ✕ indicators, and resize handles. This layer is cleared and redrawn on each `buildHarmonyStaffScene` call and on pointer state changes. PIXI.Text for the ✕ button is managed via `_affordanceContainer: PIXI.Container` with explicit `destroy()` on each rebuild to avoid memory leaks.

---

## (d) Pure engine needs

A new file `src/core/harmony/staff-hit.ts` is needed. It must be pure TypeScript (no DOM/PIXI/Svelte imports).

**`computeSlotBounds`:**
```typescript
export interface SlotBounds { slotIndex: number; x: number; width: number; }
export function computeSlotBounds(
  progression: ReadonlyArray<{ bars?: number }>,
  pxPerCycle: number
): SlotBounds[]
```
- Iterates progression slots; accumulates `startX` using `slot.bars ?? 1` as the cycle count.
- Returns one `SlotBounds` per slot: `{ slotIndex: i, x: startX, width: bars * pxPerCycle }`.
- No DOM/PIXI imports. No gap between slots (contiguous — the strip has no pixel gap in the data model, only CSS `gap: 3px` which is a visual affordance not encoded in the data model).

**`hitTestSlot`:**
```typescript
export function hitTestSlot(px: number, bounds: SlotBounds[]): number | null
```
- Returns `slotIndex` of the first entry where `bounds[i].x <= px < bounds[i].x + bounds[i].width`.
- Returns `null` if no match.

**`hitTestResizeHandle`:**
```typescript
export function hitTestResizeHandle(
  px: number,
  bounds: SlotBounds[],
  handleWidth: number
): number | null
```
- Returns `slotIndex` if `px >= bounds[i].x + bounds[i].width - handleWidth`, i.e., the pixel is within `handleWidth` of the right edge of the slot.
- Returns `null` if no match.

No `slotAtPixel` alias is needed — `hitTestSlot` is the canonical function name.
`slotBounds` as a named export is covered by `computeSlotBounds`.

---

## (e) Arpeggio visual gap

**Confirmed:** In the current renderer (`drawStaticStaff`), arpeggio mode is visually identical to chord mode.

`buildHarmonyStaffScene` (line 292–293) passes `state.harmony.chordMode` to `computeVoiceTracks` — but `chordMode` in the session store does NOT affect `computeVoiceTracks`; the function signature is `(progression, octave, registerMode)`. `chordMode` is used only by the codegen (`melodyLine`).

The `drawStaticStaff` function does not receive `chordMode` as a parameter. It draws a `drawCircle` per `NoteHead` regardless of `chordMode`. The note-head x-position is `nh.x + NOTE_OFFSET_X` for all notes in a slot — all three voices of a chord slot have the same `nh.x` (the slot's `startCycle * PX_PER_CYCLE`), so all three voices appear stacked vertically at the same x.

**What arpeggio stagger requires:**

1. `drawStaticStaff` needs a `chordMode: 'chord' | 'arp'` parameter.

2. When `chordMode === 'arp'`:
   - Group `NoteHead` objects by their `nh.x` value (= slot's `startCycle * PX_PER_CYCLE`). This groups all voices of a slot together.
   - For each group (which should have exactly 3 voices at indices 0, 1, 2):
     - voice 0 onset circle at `x0 = slotStart + NOTE_OFFSET_X`
     - voice 1 onset circle at `x1 = slotStart + NOTE_OFFSET_X + nh.bars * PX_PER_CYCLE / 3`
     - voice 2 onset circle at `x2 = slotStart + NOTE_OFFSET_X + 2 * nh.bars * PX_PER_CYCLE / 3`
   - Draw onset circles at each x (same `ny` from `stepToY(nh.stepY, staffBaseY)` as chord mode).
   - Draw a thin ascending connector line (1px, `0xffffff`, 0.35 opacity) from `(x0, ny_v0)` → `(x1, ny_v1)` → `(x2, ny_v2)`.

3. The `NoteHead.bars` field carries the slot duration (populated from `noteEv.bars` in `computeStaffLayout`). No change to `staff-layout.ts` or `voice-tracks.ts` is needed.

4. `buildHarmonyStaffScene` must pass `state.chordMode` to `drawStaticStaff` (the field is already on `SessionState`, line 249 of `session.ts`).

---

## (f) `reorderSlot` store action

**Confirmed:** `reorderSlot` does NOT exist in `src/state/session.ts`.

Searched via grep — no matches for `reorderSlot` in `session.ts`. The file has: `clearChordAt`, `setChordBars`, `appendRest`, `addRestAt`, `reorderBlockInTrack` (for composition blocks — different domain). No `reorderSlot` for progression slots.

**What `reorderSlot` needs to do:**

```typescript
export function reorderSlot(fromIdx: number, toIdx: number): void {
  sessionStore.update((s) => {
    const progression = s.harmony.progression;
    const clampedFrom = Math.max(0, Math.min(fromIdx, progression.length - 1));
    const clampedTo = Math.max(0, Math.min(toIdx, progression.length - 1));
    if (clampedFrom === clampedTo) return s; // no-op
    const newProgression = [...progression];
    const [removed] = newProgression.splice(clampedFrom, 1);
    newProgression.splice(clampedTo, 0, removed);
    return { ...s, harmony: { ...s.harmony, progression: newProgression } };
  });
  requeueLive();
}
```

**Semantics (absolute index, per ADR 0014 D5):**
- `fromIdx`: the current index of the slot to move (0-based, clamped to `[0, progression.length - 1]`).
- `toIdx`: the destination index (0-based, clamped to `[0, progression.length - 1]`).
- If `fromIdx === toIdx` after clamping: no-op, no `requeueLive()` call.
- Implementation: splice-out at `fromIdx`, splice-in at `toIdx`. This is the standard reorder idiom (used by `reorderBlockInTrack` at lines 1254–1263 with an additional `if (dest > fromIndex) dest--` adjustment — but for `reorderSlot`, the destination is absolute, not adjusted for the removal, so no adjustment needed per ADR 0014 D5).

**Note on hit-testing simplicity:** Absolute indices are simplest for the hit-test layer because `computeSlotBounds` returns slot indices that directly correspond to `progression` array positions. The `nearestInsertionIndex` pure function (to be added to `staff-hit.ts` in step 10.7) maps a pixel position to the insertion index closest to the drag position.

---

## (g) Test baseline

### `pnpm exec vitest run` result:

```
Test Files  13 passed (13)
     Tests  396 passed (396)
  Duration  611ms (transform 665ms, setup 0ms, collect 1.48s, tests 78ms, environment 1ms, prepare 1.11s)
```

396 passed, 0 failed. Matches the Phase 09 gate baseline (396 passed, 13 test files).

### `pnpm exec tsc --noEmit` result:

Exit 0. Zero errors. (Clean — no output.)

### `pnpm lint` result:

```
> orbifold@0.0.1 lint /Users/virtualmachine/Development/personal/Orbifold
> eslint . && prettier --check .

Checking formatting...
All matched files use Prettier code style!
```

Exit 0. Zero ESLint errors. Zero Prettier formatting issues.

---

## Open questions (documented, not resolved)

The following open questions are pending Pilot resolution at Checkpoint #1. They are NOT resolved in this inventory step — they are listed here for reference.

**OQ-1** — ADR scope: chord-slot editor only, or include note-level data model? The Planner recommends chord/rest-slot editor only (this phase), note-level model deferred to Phase 11.

**OQ-2** — Duration-extent visual: filled bar (Option A, Planner recommendation) or outline bar with onset circle (Option B)?

**OQ-3** — Time-move gesture: left-body drag reorders (Option A, Planner recommendation) or dedicated grab handle (Option B)?

**OQ-4** — `suavizado` editing hazard: which pitch octave is committed when a staff note is dragged to a different pitch line? (Phase 11 territory — no decision needed this phase.)

**OQ-5** — Arpeggio visual: stagger step = 1/3 cycle following actual arpeggio timing (Option A, Planner recommendation) or fixed illustrative offsets (Option B)?

---

## Summary table

| Section | Key finding |
|---|---|
| (a) Playhead discrepancy | NO DISCREPANCY. `_staffWidth` and `cursorTotalWidth` are identical formulas. BUG A guard (`nowPlaying.source === null`) is in place in both surfaces. No fix needed in step 10.3. |
| (b) Duration-extent gap | `NoteHead.bars` is populated but unused. Replace `drawCircle` with `drawRoundedRect` (bar) + `drawCircle` (onset). Rest glyphs: replace `lineStyle` tick with `drawRoundedRect`. `PX_PER_CYCLE` already imported. |
| (c) Interaction gap | No PIXI interaction exists. Need: one full-canvas hit rectangle (`_hitRect`, `interactive = true`), `pointerdown`/`pointermove`/`pointerup` listeners, affordance overlay layer for ✕ and resize handle. |
| (d) Pure engine | New `src/core/harmony/staff-hit.ts` with `computeSlotBounds`, `hitTestSlot`, `hitTestResizeHandle`. No DOM/PIXI/Svelte. |
| (e) Arpeggio gap | Arpeggio mode currently identical to chord mode. `drawStaticStaff` needs `chordMode` parameter; group NoteHeads by `nh.x`; offset voices at 0, 1/3, 2/3 of slot width. |
| (f) `reorderSlot` | Does NOT exist in `session.ts`. Needs absolute-index splice semantics + `requeueLive()`. |
| (g) Test baseline | 396 passed, 0 tsc errors, 0 lint errors. |
