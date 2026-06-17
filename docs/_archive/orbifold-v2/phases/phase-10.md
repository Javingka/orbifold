# Phase 10 — Pentagrama as editor: duration-extent rendering, interactive slot manipulation, and bar grid

**Purpose:** Transform the Pentagrama from a read-only visualization into a professional creation tool that has parity with the ProgressionStrip badge interaction model — while deferring the note-level free-placement data model (single pitch as a first-class entity) to Phase 11. The two deliverables that fit in one coherent phase are: (1) **duration-extent rendering** — notes and rests visually span their sounding time as horizontal extents (filled horizontal bars per voice) instead of single dots at the slot boundary; and (2) **slot-level interactivity on the staff** — click a slot extent to select it, then resize its duration via a right-edge drag handle (same gesture as ProgressionStrip), delete it via an ✕ affordance, and move it forward or backward in time via left-edge drag. Arpeggio mode gains a dedicated visual: instead of three parallel lines, notes are drawn staggered/stepped, one per beat subdivision, as the arpeggio pattern actually sounds. Rest slots are rendered as visible grey extents with the same interaction affordances. A visible bar-grid overlay on the staff canvas ties staff time to the rhythm's cycle. ADR 0011 decision (2) — "ProgressionStrip is the authoritative duration/gain editor" — is **amended** to allow the staff to be a co-equal editor for duration (but not gain; gain editing remains strip-only).

**Deferred to Phase 11:** Note-level free placement (click a staff line/space to insert a single pitch note), the single-note data model, Tonnetz vertex→single-note insertion. These require a heavier data-model ADR and their own phase.

**Gate:** Phase 09 closed (Pilot Checkpoint #5, 2026-06-12). Branch `orbifold-v2/phase-10` cut from `main` (which contains phases 01–09). Test baseline: 396 passing (13 test files), 0 tsc errors, 0 lint errors.

**Expected phase result:** In the Pentagrama sub-view, each chord slot renders as three horizontal voice bars (tonic/subdominant/dominant colors) spanning the slot's `bars × PX_PER_CYCLE` pixel width. Clicking a slot shows a right-edge resize handle and a ✕ delete button (mirroring the ProgressionStrip badge). Dragging the right edge changes the slot's duration (same `clampBars` semantics as the strip). Dragging the left body of a slot moves it in time (reorders within the progression). In arpeggio mode, voices are drawn as a staggered staircase. Rests are visible grey extents with the same affordances. A bar grid (matching ProgressionStrip's ruler) is drawn on the staff canvas. The ProgressionStrip remains visible and fully functional, and both surfaces stay in sync through the same store state.

---

## Scoping notes — cut line rationale

The Pilot's full vision includes: duration-extent rendering, slot manipulation (resize/delete/move), arpeggio visual, rest manipulation, bar grid, click-to-place new notes, Tonnetz single-note insertion, and "up/down drag changes pitch while preserving intervals." The last two require a new data model (a `NoteSlot` type alongside `Chord` and `RestSlot`), new codegen, new persistence schema version, and agent schema changes — a heavier ADR that belongs in Phase 11.

This phase takes the coherent core: **slots already exist** (Chord, RestSlot) → make them spatially visible with duration extent → make them manipulable (resize, delete, time-move). This is exactly the badge-parity the Pilot described ("ese mismo funcionamiento que tenemos que migrar para dentro del pentagrama"). The resulting staff is a usable editor for existing progression content. Phase 11 then adds note-level creation on top of a solid interaction foundation.

---

## Pilot decisions (Checkpoint #1, 2026-06-12)

All open questions resolved by the Pilot at Checkpoint #1, after reviewing the step 10.1 inventory:

- **OQ-1 → Confirmed cut line.** Phase 10 = slot editor (existing chord/rest slots); note-level data model (free placement, pitch drag, Tonnetz vertex→single note) deferred to Phase 11.
- **OQ-2 → Option A.** Filled horizontal bar per voice (8px tall, voice color, 80% opacity, onset circle at left edge, width = bars × PX_PER_CYCLE).
- **OQ-3 → Option A.** Body drag moves the slot in time (ghost bar + insertion indicator); same idiom as ProgressionStrip badges.
- **OQ-4 → No decision needed this phase** (Phase 11 hazard, acknowledged by Pilot).
- **OQ-5 → Option A.** Beat-accurate arpeggio stagger: each voice drawn at the third of the slot where it actually sounds, with ascending connector line.
- **Playhead verdict accepted:** inventory found NO code discrepancy (both playheads share the width formula and the not-playing guard); Pilot will re-verify live during this phase's acceptance; step 10.3(a) is a no-op unless live verification contradicts.

## Open questions for Pilot (resolved above — kept for the record)

### OQ-1 — ADR scope: chord-slot editor only, or include note-level data model?
The Planner recommends chord/rest-slot editor only (this phase), note-level model deferred. **Confirm or override.**

### OQ-2 — Duration-extent visual: filled bar or outline bar?
Option A: filled horizontal bar at each voice's y-position, same height as NOTE_RADIUS×2 (8px), full width = bars×PX_PER_CYCLE, colored per voice, 60% opacity.
Option B: outline rectangle per voice, thinner (4px tall), with a filled circle at x=0 (the note onset).
The Planner recommends Option A (more legible, consistent with a DAW piano-roll idiom). **Confirm or override.**

### OQ-3 — Time-move gesture: left-body drag reorders, or dedicated grab handle?
Option A: dragging the body of a slot (not the resize handle) moves it — the store action `reorderSlot(fromIdx, toIdx)` is called on drop.
Option B: a separate left-edge grab icon (e.g., ⠿) is the only move affordance.
The Planner recommends Option A (consistent with ProgressionStrip segment drag idiom). **Confirm or override.**

### OQ-4 — `suavizado` editing hazard: when the user drags a staff note to a different pitch line (Phase 11 territory), which pitch octave is committed?
This question only becomes live in Phase 11 (note-level editing). **No decision needed this phase.** Surfaced here so the Pilot is aware the hazard exists and that Phase 11 will need an explicit ADR decision for it.

### OQ-5 — Arpeggio visual: stagger step = 1/3 cycle or follow actual arpeggio timing?
In arpeggio mode (`chordMode === 'arp'`) the three notes sound sequentially within each cycle. The Strudel `note("A B C")` pattern assigns A to beat 1, B to beat 2, C to beat 3 (within the cycle span). Option A: draw each voice dot at x = slotStart + voiceIndex × (bars×PX_PER_CYCLE/3), with a thin connector line showing the ascent/descent. Option B: draw all three at fixed horizontal offsets (purely illustrative stagger, not beat-accurate). The Planner recommends Option A (musically accurate and pedagogically transparent). **Confirm or override.**

---

## Invariants to maintain (non-negotiable)

- `core/**` stays pure — all hit-test geometry (slot boundary from `x`, `bars`, `PX_PER_CYCLE`; nearest slot for pointer) is pure TypeScript engine functions, unit-testable.
- `STEP_PX = 16`, `HALF_STEP_PX = 8`, `staffBaseY = height/2 − 48`, `PX_PER_CYCLE = 48` — reuse, never fork.
- `registerMode` is visual-only. Audio output is byte-identical regardless. Staff editing calls the same store actions (`setChordBars`, `clearChordAt`, etc.) that ProgressionStrip calls — same single source of truth.
- Duration changes re-emit via `setChordBars → requeueLive → arrange()` — no `.fast`/`.slow`.
- Live changes requeue to next cycle (existing `requeueLive` behaviour unchanged).
- PIXI interaction handlers in `harmony-staff-scene.ts` remain thin; geometry math lives in a new pure helper (`src/core/harmony/staff-hit.ts`).
- AGPL-3.0 headers on all modified files.
- `tsc --noEmit`, `pnpm lint`, `pnpm test` green at every step's gate.

---

## Playhead discrepancy investigation (mandatory step 10.1 deliverable)

The Pilot observed: "el playhead continúa andando sin parar cuando se da play, sin embargo la sección de progresión de armónicos queda en loop." This describes a mismatch between the staff playhead and the ProgressionStrip cursor (or the looping behaviour the Pilot expected). The Phase 08 code delivers a cyclic modulo playhead with `((rawX % _staffWidth) + _staffWidth) % _staffWidth`, and Phase 08 step 08.6 added a matching cursor to the ProgressionStrip. The inventory must:

1. Confirm whether `_staffWidth` in `harmony-staff-scene.ts` and `cursorTotalWidth` in `ProgressionStrip.svelte` are computed from the same formula (both use `slot.bars ?? 1` summed × 48). Current code shows they are — but verify they still match after Phase 09.
2. Confirm whether the BUG A fix (playhead hidden when `nowPlaying.source === null`) is in place and consistent in both the staff scene and the ProgressionStrip cursor.
3. Identify any remaining discrepancy between what the Pilot is seeing and what the code implies. The most likely remaining gap: the Pilot may have observed the playhead rendering as a line that runs to the right edge of the **canvas** (not the staff extent) before looping — which would appear to "keep going" past the last chord. Verify `_staffWidth` vs `app.screen.width`.
4. Document empirically. If a bug remains, name it and plan for a targeted fix in step 10.3 before the rendering overhaul begins.

---

## Step 10.1 — Inventory

PROMPT → Read all required files: `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, this phase file, `docs/adr/0011-harmony-view-architecture.md`, `docs/adr/0012-rest-data-model.md`, and the Phase 09 handoff. Then read and document the following source files:

- `src/render/harmony-staff-scene.ts` (full) — current rendering model (note-head dots), `_staffWidth` formula, playhead formula, `buildHarmonyStaffScene` and `updateHarmonyStaffDynamic` entry points. Note every `PIXI.Graphics` call. Note how `_layout.noteHeads` is currently drawn (dots at `nh.x + NOTE_OFFSET_X`).
- `src/core/harmony/staff-layout.ts` (full) — `NoteHead` and `RestGlyph` types, `StaffLayout`, `computeStaffLayout`. Note that `NoteHead.bars` already carries duration.
- `src/core/harmony/voice-tracks.ts` (full) — `VoiceEvent.bars`, `VoiceRestEvent.bars` — confirm these are already populated.
- `src/core/harmony/time-map.ts` — `PX_PER_CYCLE`, `cyclesToPx`, `pxToCycles` (if present).
- `src/ui/ProgressionStrip.svelte` — the resize gesture (`handleResizePointerMove`, `handleResizePointerUp`), the `clearChordAt` remove, `cursorTotalWidth` and `startCursorLoop` for the playhead discrepancy investigation.
- `src/state/session.ts` — `setChordBars`, `clearChordAt`, `appendChord`, `reorderSlot` (if it exists — it probably does not yet), `clampBars`, `ProgressionSlot` type, `HarmonyState.progression`.
- `src/core/codegen/strudel.ts` — `melodyLine` chord mode distinction (`'chord'` vs `'arp'`): how does `chordMode === 'arp'` differ from `'chord'` in the Strudel output? Confirm the note ordering (voice 0 → voice 1 → voice 2 sequentially).

Produce `docs/orbifold-v2/inventories/phase-10-inventory.md` covering:

**(a) Playhead discrepancy investigation** — answer all four sub-questions above. Verdict: DISCREPANCY EXISTS (describe it and name a fix) or NO DISCREPANCY (explain why the Pilot may have seen the non-looping behavior prior to Phase 08 fixes).

**(b) Duration-extent rendering gap** — current `drawStaticStaff` draws a filled circle at `nh.x + NOTE_OFFSET_X`. `NoteHead.bars` is already in the layout but unused for rendering extent. Confirm what changes are needed in `drawStaticStaff` to render a horizontal bar of width `nh.bars * PX_PER_CYCLE` instead of (or in addition to) the circle.

**(c) Interaction affordance gap** — PIXI currently has no `interactive = true` nor `pointerdown` listeners on the staff scene. List what needs to be added: container vs individual graphic object interactivity; whether `PIXI.Graphics` hit areas (`hitArea`) are needed; whether a separate hit-test layer (a full-canvas transparent rectangle with a `pointermove` handler) is the right approach vs per-slot graphics interactivity.

**(d) Pure engine needs** — identify what pure functions are needed in a new `src/core/harmony/staff-hit.ts` (no DOM/PIXI): `slotAtPixel(x: number, layout: StaffLayout, pxPerCycle: number): number | null` (returns slot index); `slotBounds(slotIndex: number, layout: StaffLayout, pxPerCycle: number): { x: number; width: number }`.

**(e) Arpeggio visual gap** — in current code, `chordMode === 'arp'` produces the same note-head positions as chord mode (all three voices drawn at the same x = `nh.x`). Confirm this. Document what the arpeggio stagger visual requires: three separate x offsets per slot (voice 0 at slotStart, voice 1 at slotStart + bars×PX_PER_CYCLE/3, voice 2 at slotStart + 2×bars×PX_PER_CYCLE/3), plus a thin ascending connector line between the three note positions.

**(f) `reorderSlot` store action** — confirm that `session.ts` has no `reorderSlot` action yet. Document what it needs to do: given `(fromIdx: number, toIdx: number)`, reorder `progression` and call `requeueLive()`. Note that `toIdx` is relative (−1 = move one slot left, +1 = move one slot right) or absolute; document the semantics that make hit-testing simplest.

**(g) Test baseline** — confirm `pnpm exec vitest run` → 396 passed, `pnpm exec tsc --noEmit` → 0 errors, `pnpm lint` → 0 errors.

Implementation requirements:
- Read every file listed before writing the inventory.
- Do NOT write any source code.
- Do NOT resolve the open questions OQ-1–OQ-5.
- The playhead discrepancy investigation must produce a clear verdict.

Validation:
- `docs/orbifold-v2/inventories/phase-10-inventory.md` exists and is non-empty.
- No source files modified.

Expected result: Inventory document with seven sections. Playhead discrepancy verdict. Open questions documented (not resolved).

CHECKPOINT → Commit message:
`docs(orbifold-v2): Phase 10 step 10.1 — inventory`

---

## Step 10.2 — ADR 0014 (staff editor amendment to ADR 0011 D2 + interaction model)

PROMPT → Read `docs/orbifold-v2/inventories/phase-10-inventory.md`, `docs/adr/0011-harmony-view-architecture.md`, `docs/adr/0012-rest-data-model.md`, `docs/orbifold-v1/decisions.md`, and the Pilot's resolutions from Checkpoint #1. Write a new ADR: `docs/adr/0014-staff-editor.md`.

The ADR must record:

**(D1) Amendment to ADR 0011 D2 — staff becomes a co-equal duration editor.**
ADR 0011 D2 stated: "staff view and orbital view are read-oriented visualizations — they do not expose any editing affordance for duration or gain." This decision is **amended** as follows: the Pentagrama staff IS an editor for per-slot **duration** (same `setChordBars` / `clampBars` semantics as the ProgressionStrip) and for slot **deletion** (`clearChordAt`) and slot **reordering** (`reorderSlot`). The ProgressionStrip remains visible and continues to function as a co-equal editor; both surfaces operate through the same store actions and stay in sync. Gain editing remains ProgressionStrip-only (staff has no vertical gain axis; gain drag on the staff is out of scope). **Justification:** The Pilot's goal is "el pentagrama no es solo visualización, es también construcción, de la misma forma que los tracks del ritmo lo son."

**(D2) Duration-extent rendering model.**
Record the chosen visual option (per OQ-2 resolution). A chord slot of duration `bars` renders as a horizontal bar of width `bars × PX_PER_CYCLE` for each of the three voices, at the voice's diatonic-step y-position. Bar dimensions: height = 8px (= NOTE_RADIUS×2), corner radius = 2px (rounded ends). A circle onset marker (NOTE_RADIUS = 4) is drawn at the left edge. Color = voice color (tonic/subdominant/dominant), 80% opacity for the bar, 100% for the onset circle. Rest slots render as single grey bars at the middle staff line (step 6, B4), same width formula. Arpeggio mode: three staggered onset positions (per OQ-5 resolution) plus a thin ascending connector line; the horizontal bar is replaced by three short unit bars (each `bars/3 × PX_PER_CYCLE` wide).

**(D3) Hit-test architecture — pure engine + thin PIXI handler.**
All slot geometry is computed in `src/core/harmony/staff-hit.ts` (pure, no DOM/PIXI). The PIXI scene registers one transparent full-canvas hit rectangle (`PIXI.Graphics` with `interactive = true` and `hitArea = new PIXI.Rectangle(...)`) on `_staffContainer`. Mouse events are dispatched to the pure engine to determine which slot is under the pointer. UI state (selected slot index, resize-active, move-active) lives as module-level state in `harmony-staff-scene.ts` (not in the session store — it is ephemeral interaction state). Committed actions (resize complete, delete, reorder) call through to the store's exported actions.

**(D4) Slot interaction gesture specification.**
- **Select/deselect:** `pointerdown` on a slot body → select that slot (show affordances); `pointerdown` outside all slots → deselect.
- **Delete:** When a slot is selected, a ✕ button is drawn (as a PIXI.Text `×` at x = slotRight − 10, y = staffBaseY − 12, size 14, white). `pointerdown` on the ✕ region calls `clearChordAt(slotIndex)`.
- **Resize:** When a slot is selected, a right-edge handle (4px wide vertical bar, white, draggable) is drawn at x = slotRight. `pointerdown` on the handle starts resize; `pointermove` updates a local `_resizeBars` preview (without store write, causing a local redraw of the extent bar); `pointerup` calls `setChordBars(slotIndex, _resizeBars)`. Minimum bars = 0.25; maximum = 8; rounding = 0.25 (same as ProgressionStrip `clampBars`).
- **Move (time reorder):** (per OQ-3 resolution) Dragging the slot body (not the resize handle, not the ✕) moves the slot in time. On `pointermove` while move-active, a ghost bar is drawn at the new position. On `pointerup`, if the slot has moved to a new index position, `reorderSlot(fromIdx, toIdx)` is called.
- **Affordance visibility:** Select affordances (✕ and resize handle) are drawn as a PIXI overlay layer on top of `_staffGfx`. They are cleared and redrawn on every `buildHarmonyStaffScene` call and on select/deselect events.

**(D5) `reorderSlot` store action semantics.**
`reorderSlot(fromIdx: number, toIdx: number)` removes the slot at `fromIdx` and inserts it at `toIdx` (both clamped to `[0, progression.length − 1]`). If `fromIdx === toIdx`, no-op. Calls `requeueLive()`. This is a **store action** (exported from `session.ts`), not part of any engine.

**(D6) Bar grid on the staff canvas.**
A bar grid is drawn as thin vertical lines at every `PX_PER_CYCLE` (48px) interval from x = 0 to x = `_staffWidth`. Beat lines (at every `PX_PER_CYCLE / 4 = 12px`) are drawn at 20% opacity; bar lines at every `PX_PER_CYCLE` are drawn at 40% opacity. This grid uses the same `PX_PER_CYCLE` constant and aligns the staff canvas visually with the ProgressionStrip ruler above it.

**(D7) Arpeggio mode visual (binding spec, per OQ-5 resolution).**
When `chordMode === 'arp'`, each slot is drawn as three staggered onset circles (not bars) at:
- voice 0: x = `slot.startCycle × PX_PER_CYCLE + NOTE_OFFSET_X`
- voice 1: x = `slot.startCycle × PX_PER_CYCLE + NOTE_OFFSET_X + bars×PX_PER_CYCLE/3`
- voice 2: x = `slot.startCycle × PX_PER_CYCLE + NOTE_OFFSET_X + 2×bars×PX_PER_CYCLE/3`

A thin ascending connector line (1px, white, 40% opacity) connects voice 0 → voice 1 → voice 2 onset positions. In chord mode, the current dot is replaced by the duration bar described in D2. The `chordMode` is read from `state.chordMode` in `buildHarmonyStaffScene`.

ADR file: `docs/adr/0014-staff-editor.md`. Append-only to ADR 0011 is NOT used — this is a new ADR. ADR 0011 Amendment §D2 is referenced as the superseded decision.

Validation:
- `docs/adr/0014-staff-editor.md` exists and is non-empty.
- No source files modified.

CHECKPOINT → Commit message:
`docs(adr): Phase 10 step 10.2 — ADR 0014 staff editor`

---

## Step 10.3 — Playhead discrepancy fix (if any) + `reorderSlot` store action + pure hit-test engine

PROMPT → Read `docs/orbifold-v2/inventories/phase-10-inventory.md`, `docs/adr/0014-staff-editor.md`, `docs/orbifold-v1/decisions.md`, `src/state/session.ts`, `src/core/harmony/staff-hit.ts` (does not exist yet), `src/render/harmony-staff-scene.ts`.

Implement the following:

**(a) Playhead discrepancy fix (conditional on step 10.1 verdict).**
If the inventory identified a remaining discrepancy (e.g., `_staffWidth` still uses `layout.totalWidth` instead of the full progression duration in some code path, or the `nowPlaying.source` guard is inconsistent), apply the targeted fix. If the inventory verdict was "no discrepancy," this sub-item is a no-op.

**(b) New pure engine: `src/core/harmony/staff-hit.ts`.**
Create `src/core/harmony/staff-hit.ts` with:
- `export interface SlotBounds { slotIndex: number; x: number; width: number; }` — one entry per progression slot.
- `export function computeSlotBounds(progression: ReadonlyArray<{ bars?: number }>, pxPerCycle: number): SlotBounds[]` — returns bounds for every slot in progression order. Uses `slot.bars ?? 1` for duration. No DOM/PIXI imports.
- `export function hitTestSlot(px: number, bounds: SlotBounds[]): number | null` — returns the slotIndex of the first bounds whose `x <= px < x + width`, or `null` if none.
- `export function hitTestResizeHandle(px: number, bounds: SlotBounds[], handleWidth: number): number | null` — returns slotIndex if `px >= bounds[i].x + bounds[i].width − handleWidth`, or `null`.
- No other exports. File has AGPL-3.0 header.

**(c) `reorderSlot` store action in `src/state/session.ts`.**
Add `export function reorderSlot(fromIdx: number, toIdx: number): void`. Semantics per ADR 0014 D5: removes slot at `fromIdx`, inserts at `toIdx`, clamps both to `[0, progression.length − 1]`, no-op if `fromIdx === toIdx`, calls `requeueLive()`. Uses `sessionStore.update`.

**(d) Unit tests for `staff-hit.ts`.**
Create `tests/harmony/staff-hit.test.ts` with coverage for:
- `computeSlotBounds` with empty, single-slot, and three-slot progressions (including bars=0.25, bars=2 slots).
- `hitTestSlot` on boundary conditions (exactly at x, one pixel inside, one pixel past the right edge, between slots, left of all slots).
- `hitTestResizeHandle` at right edge, one pixel left of handle zone, at slot left edge.
- `reorderSlot`: move first to last, last to first, adjacent swap, no-op on same index.
- All tests in Node (no PIXI / DOM / Svelte imports).

Validation:
- `pnpm exec vitest run tests/harmony/staff-hit.test.ts` → all new tests pass.
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run` → all prior tests pass (no regressions).

CHECKPOINT → Commit message:
`feat(harmony): Phase 10 step 10.3 — staff-hit engine, reorderSlot action, playhead fix`

---

## Step 10.4 — Duration-extent rendering + bar grid (chord mode)

PROMPT → Read `docs/adr/0014-staff-editor.md`, `docs/orbifold-v1/decisions.md`, `src/render/harmony-staff-scene.ts` (full), `src/core/harmony/staff-layout.ts`.

Rewrite the note-head rendering in `drawStaticStaff` (inside `harmony-staff-scene.ts`) to implement duration-extent bars per ADR 0014 D2. Chord mode only in this step; arpeggio mode in step 10.5.

**(a) Duration bars.**
Replace the current single `drawCircle` call per `NoteHead` with:
1. A horizontal filled rounded-rectangle bar: `gfx.beginFill(col, 0.8); gfx.drawRoundedRect(nx, ny - 4, barWidth, 8, 2); gfx.endFill()` where `barWidth = nh.bars * PX_PER_CYCLE`.
2. An onset circle at the left edge: `gfx.beginFill(col, 1); gfx.drawCircle(nx, ny, NOTE_RADIUS); gfx.endFill()`.

`nx = nh.x + NOTE_OFFSET_X`. `ny = stepToY(nh.stepY, staffBaseY)`. Bar width cannot be negative (guard `barWidth = Math.max(barWidth, 8)`).

**(b) Rest extent bars.**
Replace the current single horizontal line per `RestGlyph` with a rounded-rect bar at `restY = stepToY(6, staffBaseY)`, height 8, color `COL.faint`, opacity 0.6, width `rg.bars * PX_PER_CYCLE`. Keep a short dark centre tick (`gfx.lineStyle(2, COL.faint, 0.9)`, half-width = `REST_HALF_W = 10`) for legibility.

**(c) Bar grid.**
Add a new `drawBarGrid(gfx, staffBaseY, totalBars, lineWidth)` helper function (inside `harmony-staff-scene.ts`, not exported). Called from `buildHarmonyStaffScene` before note/rest rendering. Draws:
- Beat lines (x = n × PX_PER_CYCLE/4 for n = 1 to totalBars×4): 1px, `COL.faint`, 15% opacity.
- Bar lines (x = n × PX_PER_CYCLE for n = 1 to totalBars): 1px, `COL.faint`, 35% opacity.
- x=0 line (the leftmost bar boundary): 1px, `COL.faint`, 50% opacity.
Grid lines span from `stepToY(TREBLE_STAFF_LINES[TREBLE_STAFF_LINES.length-1] + 2, staffBaseY)` to `stepToY(-6, staffBaseY)` (same vertical span as the playhead).
`totalBars = _staffWidth / PX_PER_CYCLE` (already cached in the module after step 10.3).

**(d) No behavior change in arp mode yet.**
In this step, when `chordMode === 'arp'`, draw the same duration bars as chord mode (arpeggio-specific stagger is step 10.5). This is a temporary visual state — the step comment documents it.

**(e) `PX_PER_CYCLE` coordination rule.**
`harmony-staff-scene.ts` imports `PX_PER_CYCLE` from `../core/harmony/time-map.js` (already the case). The bar width computation uses `nh.bars * PX_PER_CYCLE` — this import must be the source, not a local redeclaration.

Prototype parity note: there is no prototype equivalent for duration-extent rendering — this is a new UX feature. Parity note must confirm that the audio output (Strudel string) is byte-identical before and after this step (no changes to codegen).

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run` → ≥ 396 passed (no regressions; this step adds no new unit tests — PIXI rendering is not unit-tested; new visual behaviour verified at Pilot manual acceptance).
- `pnpm build` → exit 0.

CHECKPOINT → Commit message:
`feat(harmony): Phase 10 step 10.4 — duration-extent rendering and bar grid`

---

## Step 10.5 — Arpeggio-mode stagger visual

PROMPT → Read `docs/adr/0014-staff-editor.md`, `src/render/harmony-staff-scene.ts`, `src/core/harmony/staff-layout.ts`, `src/core/codegen/strudel.ts` (arpeggio section), `src/state/session.ts` (`chordMode`).

Implement the arpeggio visual per ADR 0014 D7.

**(a) Read `state.chordMode` in `buildHarmonyStaffScene`.**
`state.chordMode` is already a field on `SessionState` (used by codegen). Pass it to `drawStaticStaff` as a new parameter.

**(b) Conditional rendering in `drawStaticStaff`.**
Add a `chordMode: 'chord' | 'arp'` parameter to `drawStaticStaff`. When `chordMode === 'arp'`:
- Group NoteHeads by `slotIndex` (i.e., by `nh.x` — same x means same slot). For each group of three voices in a slot:
  - voice 0: onset circle at `x0 = slotStart + NOTE_OFFSET_X`
  - voice 1: onset circle at `x1 = slotStart + NOTE_OFFSET_X + nh.bars×PX_PER_CYCLE/3`
  - voice 2: onset circle at `x2 = slotStart + NOTE_OFFSET_X + 2×nh.bars×PX_PER_CYCLE/3`
  - Draw circles at each of the three x positions using the voice color.
  - Draw a thin ascending connector line (1px, 0xffffff, 0.35 opacity) from (x0, ny_v0) → (x1, ny_v1) → (x2, ny_v2) as a broken polyline.
- When `chordMode === 'chord'`: use the duration-bar rendering from step 10.4.

**(c) Group NoteHeads by slot (`nh.x`).**
The grouping is done by the same `startCycle` (which maps uniquely to `nh.x = startCycle × PX_PER_CYCLE`). Build a `Map<number, NoteHead[]>` keyed by `nh.x` before the rendering loop.

**(d) Guard for incomplete groups.**
If a slot has fewer than 3 note-heads (e.g., rest slot — no note-heads — or future single-note slots), skip the connector line and draw individual circles only.

**(e) No changes to `staff-layout.ts` or `voice-tracks.ts`.**
The `StaffLayout` already has `nh.bars` (used for bar width). Arp stagger is purely a rendering concern.

Prototype parity note: arpeggio visual is a new feature (the prototype draws note-heads as dots regardless of mode). Confirm audio byte-identity: `chordMode` changes in codegen produce the known comma-vs-space difference in the Strudel string — this step makes no codegen changes, so audio is byte-identical before/after.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run` → ≥ 396 passed (no regressions; visual behaviour verified at manual acceptance).
- `pnpm build` → exit 0.

CHECKPOINT → Commit message:
`feat(harmony): Phase 10 step 10.5 — arpeggio stagger visual`

---

## Step 10.6 — PIXI interaction layer (select, delete, resize)

PROMPT → Read `docs/adr/0014-staff-editor.md`, `docs/orbifold-v1/decisions.md`, `src/render/harmony-staff-scene.ts` (full, post-step-10.5), `src/core/harmony/staff-hit.ts`, `src/state/session.ts`.

Add the slot interaction affordances (select → delete ✕, resize) to the staff scene. Movement (reorder) is step 10.7.

**(a) Interaction infrastructure on `_staffContainer`.**
Add a module-level transparent hit rectangle:

```typescript
let _hitRect: PIXI.Graphics | null = null;
```

In `buildHarmonyStaffScene`, after adding `_staffGfx` to `_staffContainer`, create `_hitRect = new PIXI.Graphics()` as a full-canvas transparent rectangle covering the staff vertical span. Set `_hitRect.interactive = true`. Add `pointerdown`, `pointermove`, `pointerup` listeners.

**(b) Module-level interaction state.**
Add module-level variables (not in session store):
- `_selectedSlotIdx: number | null = null` — currently selected slot.
- `_resizeActive: boolean = false` — resize gesture in progress.
- `_resizeStartPx: number = 0` — pointer x at resize start.
- `_resizeStartBars: number = 1` — bars at resize start.
- `_resizePreviewBars: number = 1` — live bars during resize (no store write until pointerup).
- `_slotBounds: SlotBounds[] = []` — cached per `buildHarmonyStaffScene`.

Re-compute `_slotBounds` at the end of `buildHarmonyStaffScene` using `computeSlotBounds` from `staff-hit.ts`.

**(c) `drawAffordances(gfx: PIXI.Graphics, selectedIdx: number | null)` helper.**
New helper called at the end of `buildHarmonyStaffScene` (and in `updateHarmonyStaffDynamic` when `_selectedSlotIdx !== null`). Draws into `_dynGfx` (cleared before each call):
- When `_selectedSlotIdx !== null` and not `_resizeActive`:
  - Highlight border: 1px white rectangle around the selected slot's bounds (all three voice bars).
  - ✕ button: `PIXI.Text` `×` at `(slotRight − 10, staffBaseY − 20)`, font size 14, white. Hit region: `PIXI.Rectangle(slotRight − 18, staffBaseY − 28, 16, 16)`.
  - Resize handle: 4px white vertical bar at `x = slotRight − 2`, spanning the staff vertical extent.
- When `_resizeActive`:
  - Preview bar: draw a white outline rectangle at the slot's x, with width = `_resizePreviewBars × PX_PER_CYCLE`.
  - No ✕ button.

Note: `PIXI.Text` for the ✕ is allocated fresh each call (re-use of PIXI.Text requires explicit destroy/recreate; the simpler approach is recreate-on-draw since affordances are only shown for one selected slot at a time). Prior PIXI.Text objects must be explicitly `destroy()`ed to avoid memory leaks (call `_affordanceContainer.removeChildren()` with a destroy flag, or track a single `_deleteBtn: PIXI.Text | null` and call `_deleteBtn.destroy()` before replacing).

**(d) Pointer event handlers.**
In `pointerdown` handler on `_hitRect`:
1. Get pointer x in local coordinates.
2. Call `hitTestResizeHandle(px, _slotBounds, 10)` — if result is non-null and `_selectedSlotIdx === result`, start resize: `_resizeActive = true`, `_resizeStartPx = px`, `_resizeStartBars = progression[result].bars ?? 1`.
3. Else call `hitTestSlot(px, _slotBounds)` — if non-null, `_selectedSlotIdx = result`, trigger redraw of affordances.
4. Else (hit outside all slots): `_selectedSlotIdx = null`, trigger affordance redraw.
5. Check ✕ hit region (hardcoded if `_selectedSlotIdx !== null`): if yes, call `clearChordAt(_selectedSlotIdx)`, reset `_selectedSlotIdx = null`.

In `pointermove` handler: if `_resizeActive`, compute `deltaPx = px − _resizeStartPx`, `newBars = clampBars(_resizeStartBars + deltaPx / PX_PER_CYCLE)`, `_resizePreviewBars = newBars`, trigger affordance redraw (no store write).

In `pointerup` handler: if `_resizeActive`, call `setChordBars(_selectedSlotIdx!, _resizePreviewBars)`, `_resizeActive = false`.

`clampBars` must be imported from `session.ts`. `clearChordAt`, `setChordBars` imported from `session.ts`.

**(e) Guard for pure-engine imports in PIXI layer.**
`staff-hit.ts` may be imported from `harmony-staff-scene.ts` — it is a pure engine (no DOM/PIXI). This is a permitted import direction (renderer → core engine).

**(f) Affordance re-render on store changes.**
`buildHarmonyStaffScene` is already called by `App.svelte` on every store change. The affordances are redrawn inside `buildHarmonyStaffScene` at the end of each call. This means that after a `setChordBars` or `clearChordAt` store action, `buildHarmonyStaffScene` is re-invoked and `_slotBounds` is recomputed with fresh progression data.

Prototype parity note: no prototype equivalent; new feature. Audio byte-identity: no codegen changes in this step; store actions `setChordBars`/`clearChordAt` are the same as those already invoked by ProgressionStrip — audio behavior is unchanged.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run` → ≥ 396 passed (no regressions).
- `pnpm build` → exit 0.
- Manual: in the Pentagrama view, clicking a chord slot shows a highlight border, ✕ button, and resize handle. Clicking ✕ removes the chord (progression updates in ProgressionStrip immediately). Dragging the resize handle changes the slot width and the ProgressionStrip segment width. Clicking outside deselects.

CHECKPOINT → Commit message:
`feat(harmony): Phase 10 step 10.6 — staff interaction layer (select, delete, resize)`

---

## Step 10.7 — Time-move (slot reorder) gesture

PROMPT → Read `docs/adr/0014-staff-editor.md`, `src/render/harmony-staff-scene.ts` (post-step-10.6), `src/core/harmony/staff-hit.ts`, `src/state/session.ts` (`reorderSlot`).

Add the slot-move gesture to the staff scene (body drag to reorder).

**(a) Module-level move state.**
Add:
- `_moveActive: boolean = false`
- `_moveFromIdx: number = -1`
- `_moveDragPx: number = 0` — current pointer x during drag (for ghost preview)
- `_moveInsertIdx: number = -1` — computed target insertion index during drag

**(b) Ghost bar rendering in `drawAffordances`.**
When `_moveActive`:
- Draw a semi-transparent (40% opacity) version of the slot's duration bars at the ghost position: `ghostX = _moveDragPx`.
- Draw a thin vertical insertion indicator (2px, white, 80% opacity) at the insertion boundary closest to `_moveDragPx` (computed as `Math.round(_moveDragPx / PX_PER_CYCLE)` cycles → mapped to nearest slot boundary).

**(c) Pointer event updates.**
In `pointerdown` (if not resize handle, not ✕ hit, is a slot hit):
- If `_selectedSlotIdx === result` (already selected): do NOT start move immediately — wait for `pointermove` beyond a 4px threshold (avoids accidental moves on tap).
- If `_selectedSlotIdx !== result`: select the slot (normal select behavior from step 10.6).

In `pointermove`:
- If move threshold crossed and slot is selected: `_moveActive = true`, `_moveFromIdx = _selectedSlotIdx!`, `_moveDragPx = px`, compute `_moveInsertIdx`, trigger affordance redraw.

In `pointerup`:
- If `_moveActive` and `_moveInsertIdx !== _moveFromIdx`: call `reorderSlot(_moveFromIdx, _moveInsertIdx)`.
- Reset: `_moveActive = false`, `_moveFromIdx = -1`, `_moveInsertIdx = -1`.

**(d) Insertion index computation (pure helper in `staff-hit.ts`).**
Add `export function nearestInsertionIndex(px: number, bounds: SlotBounds[]): number` — returns the index at which inserting a slot would place it nearest to pixel position `px`. This is the index of the first slot whose center x exceeds `px`, clamped to `[0, bounds.length]`. Unit-tested.

Add tests in `tests/harmony/staff-hit.test.ts` for `nearestInsertionIndex`.

Prototype parity note: no prototype equivalent. Audio byte-identity: `reorderSlot` changes the progression order, which changes the Strudel output (a reordered `arrange()` is different). This is the intended behavior — the user is reordering their composition. This is NOT a regression; it is expected.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run` → ≥ new test count (new `nearestInsertionIndex` tests + prior).
- `pnpm build` → exit 0.
- Manual: dragging a slot body moves a ghost bar; releasing drops the slot at the new position; ProgressionStrip immediately reflects the reorder.

CHECKPOINT → Commit message:
`feat(harmony): Phase 10 step 10.7 — staff slot time-move (reorder gesture)`

---

## Step 10.8 — Quality gates + manual acceptance

PROMPT → Read this phase file's Acceptance Criteria, `docs/orbifold-v1/decisions.md`, and the Phase 10 handoff (all steps).

Run and record the full quality gate suite. Assemble the phase-level Acceptance Coverage Table for all A-10 acceptance IDs. Produce the manual acceptance checklist for Pilot Checkpoint #5.

**Static analysis checks (mandatory):**

| Check | Command | Expected |
|---|---|---|
| Pure engine invariant | `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/` | 0 matches |
| `PX_PER_CYCLE` coordination rule | `grep -n "PX_PER_CYCLE" src/render/harmony-staff-scene.ts` | imported from `../core/harmony/time-map.js`, not redeclared |
| `subview`/`registerMode` not in Zod schema | `grep -n "subview\|registerMode" src/lib/persistence.ts` | 0 matches in `SavedHarmonySchema` definition |
| AGPL-3.0 headers | `head -2` on all modified files | All have `SPDX-License-Identifier: AGPL-3.0-only` |
| `clearChordAt`, `setChordBars` imported from session.ts in staff scene | `grep -n "clearChordAt\|setChordBars\|reorderSlot" src/render/harmony-staff-scene.ts` | present as imports |
| No direct `sessionStore.update` in PIXI render module | `grep -n "sessionStore.update" src/render/harmony-staff-scene.ts` | 0 matches — store mutations go through exported action functions |

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors (ESLint + Prettier).
- `pnpm exec vitest run` → ≥ 396 + new staff-hit tests passed; 0 failed.
- `pnpm build` → exit 0.
- No source files modified in this step.

CHECKPOINT → Commit message:
`feat(harmony): Phase 10 step 10.8 — quality gates and manual acceptance`

---

## Acceptance Criteria

All criteria must be verified before this phase is complete. Automated criteria verified by the quality gate step (10.8). Manual criteria verified by Pilot at Checkpoint #5.

| ID | Description | Type |
|---|---|---|
| A-10-01 | Duration-extent rendering: in chord mode, each chord slot renders as horizontal bars spanning `bars × PX_PER_CYCLE` pixels for each of the three voices, at the correct diatonic y-positions, colored per voice. | manual |
| A-10-02 | Rest extent rendering: rest slots render as visible grey horizontal bars of the correct duration width at the middle staff line. | manual |
| A-10-03 | Bar grid: thin vertical beat and bar lines are drawn on the staff canvas, aligning with the ProgressionStrip ruler above. | manual |
| A-10-04 | Chord mode / arp mode visual toggle: switching `acorde`/`arpegio` in the top bar changes the staff rendering — chord mode shows parallel horizontal bars per voice; arpeggio mode shows staggered onset dots connected by an ascending line. | manual |
| A-10-05 | Select: clicking a slot highlights it with a border and shows a ✕ button and a right-edge resize handle. Clicking outside any slot deselects. | manual |
| A-10-06 | Delete via ✕: clicking ✕ on a selected slot removes it from the progression; the ProgressionStrip immediately reflects the removal. | manual |
| A-10-07 | Resize: dragging the right-edge resize handle changes the slot's duration; releasing commits the change via `setChordBars`; the ProgressionStrip segment width updates accordingly; the change is re-emitted via `arrange()` (no `.fast`/`.slow`). | manual |
| A-10-08 | Time-move: dragging the body of a selected slot shows a ghost bar and an insertion indicator; releasing reorders the slot in the progression; the ProgressionStrip reflects the new order. | manual |
| A-10-09 | Playhead is cyclic and matches ProgressionStrip cursor: the staff playhead and the ProgressionStrip cursor loop together with the progression. When nothing is playing, neither playhead is visible. | manual |
| A-10-10 | ProgressionStrip parity: all edits made on the staff (delete, resize, reorder) are immediately visible in the ProgressionStrip badges, and vice versa. | manual |
| A-10-11 | `staff-hit.ts` is a pure engine (no DOM/PIXI/Svelte imports); all exported functions are unit-tested; prior test suite has no regressions. | automated |
| A-10-12 | `reorderSlot` store action: unit-tested; moves slot correctly; calls `requeueLive()`; no-op when fromIdx === toIdx. | automated |
| A-10-13 | All quality gates green: `tsc --noEmit` → 0 errors, `pnpm lint` → 0 errors, `pnpm test` → ≥ 396 + new tests passed, `pnpm build` → exit 0. | automated |
| A-10-14 | `registerMode` and `subview` absent from `SavedHarmonySchema` and `agent/schema.ts` (ephemeral state rule unchanged). | automated |
| A-10-15 | Audio output byte-identical before/after visual rendering changes: no changes to `src/core/codegen/strudel.ts` or the audio pipeline. | automated (proxy: grep) |
| A-10-16 | AGPL-3.0 header present in all new and modified source files. | automated (proxy: head -2) |

---

## Deferred items (documented, not forgotten)

The following items from the Pilot's request are explicitly deferred to Phase 11:

1. **Click-on-staff-line to place a new note** — requires a `NoteSlot` data model (single pitch, not a full chord), new codegen path, persistence schema version bump, and agent schema change. Phase 11.
2. **Pitch editing: drag up/down to change note pitch while preserving intervals** — requires the `NoteSlot` model and a decision on how `suavizado` rendering maps back to an unambiguous committed pitch. Phase 11 (open question OQ-4 surfaced but not resolved here).
3. **Tonnetz vertex → single note insertion** — depends on the `NoteSlot` model. Phase 11.
4. **Gain editing on the staff** — ADR 0014 D1 explicitly reserves gain as ProgressionStrip-only. If the Pilot later wants gain editing on the staff, that requires a new ADR amendment.
