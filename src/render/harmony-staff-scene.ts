// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — harmony staff scene: PIXI rendering of the treble-clef linear staff
// for the harmony view. Consumes StaffLayout from staff-layout.ts and draws:
//   - Five treble-clef staff lines (full canvas width, edge-to-edge)
//   - Treble clef glyph (𝄞, Unicode U+1D11E) at left edge
//   - Colored note-heads (filled circles) per voice
//   - Ledger lines for notes outside the five-line staff
//   - Sharp accidental symbols to the left of note-heads
//   - Rest glyphs (short horizontal thick lines) for rest slots
//   - White playhead vertical line advancing in sync with getVisualPhaseAnchor()
//
// Module-level singleton pattern (mirrors rhythm-scene.ts and tonnetz-scene.ts).
// PIXI v7 only. No DOM/Svelte/core imports — only state, render, and PIXI.
//
// Staff geometry (vigent diatonic-coordinate rule, docs/orbifold-v2/decisions.md):
//   Phase 08 (ADR 0011 Amendment D5): central full-canvas geometry.
//   STEP_PX = 16 → each diatonic step = STEP_PX/2 = 8 px vertically
//   staffBaseY = app.screen.height / 2 − (6 × HALF_STEP_PX)
//             = height / 2 − 48   → centers step-6 (B4) at canvas midpoint
//   y(s) = staffBaseY − s × HALF_STEP_PX
//   Five staff lines: diatonic steps [2, 4, 6, 8, 10] (E4, G4, B4, D5, F5)
//   Staff lines always span edge-to-edge (0 → app.screen.width), regardless of
//   note content extent (post-verification fix, A-08-10).
//
// Clef placement (post-verification fix, A-08-10):
//   The G-clef curl sits on G4 = step 4.
//   G4 y = staffBaseY − 4 × HALF_STEP_PX = staffBaseY − 32.
//   TREBLE_CLEF_Y_OFFSET = 26 aligns the curl visually on the G4 line.
//
// Voice colors (Pilot decision, phase-07.md):
//   voice 0 → COL.tonic  (0xf3b15a)
//   voice 1 → COL.subdom (0x56cfc4)
//   voice 2 → COL.dom    (0xe87bac)
//
// Playhead (Phase 08 ADR 0011 Amendment D6): cyclic modulo wrap.
//   rawX = (now − getVisualPhaseAnchor()) / barMs × PX_PER_CYCLE
//   _staffWidth = totalBars × PX_PER_CYCLE  (post-verification fix, A-08-08)
//   playheadX = ((rawX % _staffWidth) + _staffWidth) % _staffWidth
//   Guard: if _staffWidth <= 0, return early without drawing.
//   Guard: if nowPlaying.source === null, clear and return (BUG A, post-verification REVISE II).
//   where barMs = (60000 / bpm) × 4 (one 4/4 bar in ms)
//   (Fixes Phase 07 A-07-11 / A-08-08: playhead loops continuously instead of
//    clamping at the last note position; _staffWidth matches ProgressionStrip
//    denominator so both cursors stay in sync.)
//
// PX_PER_CYCLE imported from time-map.ts (vigent coordination-point rule).
//
// Step 10.5 (ADR 0014 D7): arpeggio-mode stagger visual.
//   When chordMode === 'arp', each slot's three voices are drawn as staggered onset
//   circles at beat-accurate x positions (0, 1/3, 2/3 of the slot's duration in px),
//   connected by a thin ascending polyline (1px, white, 35% opacity).
//   NoteHeads are grouped by nh.x (= startCycle × PX_PER_CYCLE) before the loop.
//   Groups with fewer than 3 note-heads skip the connector; circles drawn individually.
//
// Step 10.6 (ADR 0014 D3/D4): slot interaction layer (select, delete, resize).
//   Pointer events are delivered as native DOM events (e.offsetX/Y) matching the
//   existing onStagePointerDown idiom in tonnetz-scene.ts.
//   Module-level ephemeral state: _selectedSlotIdx, _resizeActive, _resizeStartPx,
//   _resizeStartBars, _resizePreviewBars, _slotBounds (ADR 0014 Consequence 3).
//   Selection guard (Pilot Checkpoint #2, ADR 0014 Consequence 3): on every
//   buildHarmonyStaffScene call, if _selectedSlotIdx >= progression.length,
//   reset to null. This prevents stale selection when the ProgressionStrip deletes
//   a slot externally.
//
// Step 10.7 (ADR 0014 D4): time-move (slot reorder) gesture.
//   Body drag on a selected slot moves it in time. A 4 px threshold disambiguates
//   accidental moves from select-clicks. During drag, a ghost bar (40% opacity)
//   and a thin vertical insertion indicator (2px, white, 80% opacity) are drawn
//   at the target position. On pointerup, reorderSlot(fromIdx, toIdx) is called
//   (no-op if indices are equal). Audio changes by design — reordering changes the
//   arrange() Strudel output, taking effect at the next cycle.
//   Module-level move state: _moveActive, _moveFromIdx, _moveDragPx, _moveInsertIdx,
//   _pointerDownPx, _pointerDownOnSelected.
//   Affordances drawn into _affordanceGfx (separate from _dynGfx/playhead layer).

import * as PIXI from 'pixi.js';
import { get } from 'svelte/store';

import { computeVoiceTracks } from '../core/harmony/voice-tracks.js';
import { computeStaffLayout } from '../core/harmony/staff-layout.js';
import type { StaffLayout } from '../core/harmony/staff-layout.js';
import { TREBLE_STAFF_LINES } from '../core/harmony/staff-map.js';
import { PX_PER_CYCLE } from '../core/harmony/time-map.js';
import {
  computeSlotBounds,
  hitTestSlot,
  hitTestResizeHandle,
  nearestInsertionIndex,
} from '../core/harmony/staff-hit.js';
import type { SlotBounds } from '../core/harmony/staff-hit.js';
import { getVisualPhaseAnchor } from '../state/phase-anchor.js';
import {
  sessionStore,
  clearChordAt,
  setChordBars,
  clampBars,
  reorderSlot,
} from '../state/session.js';
import type { SessionState } from '../state/session.js';
import { getStageRefs } from './stage.js';
import { COL, FONT_SERIF } from './theme.js';

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Pixels per diatonic step pair (full staff space).
 * Phase 08 value: 16 (ADR 0011 Amendment D5 — central full-canvas legibility).
 * Supersedes Phase 07 value of 10.
 */
const STEP_PX = 16;

/** Half-step in pixels: the y-increment per diatonic step unit. */
const HALF_STEP_PX = STEP_PX / 2; // 8

/** Note-head radius in pixels. */
const NOTE_RADIUS = 4;

/** Horizontal offset within the slot before the note-head center. */
const NOTE_OFFSET_X = 8;

/** Half-width of ledger lines around the note-head x-center. */
const LEDGER_HALF_W = 8;

/**
 * Rest glyph center-tick half-width.
 * Step 10.4 (ADR 0014 D2): retained for the short center tick drawn on rest
 * extent bars for legibility.
 */
const REST_HALF_W = 10;

/** Sharp accidental PIXI.Text font size. */
const ACCIDENTAL_FONT_SIZE = 11;

/** Duration bar height in pixels (ADR 0014 D2). */
const BAR_HEIGHT = 8;

/** Duration bar corner radius in pixels (ADR 0014 D2). */
const BAR_CORNER_RADIUS = 2;

/** Duration bar fill opacity for chord note bars (ADR 0014 D2: 80%). */
const BAR_OPACITY = 0.8;

/** Duration bar fill opacity for rest extent bars (ADR 0014 D2: 60%). */
const REST_BAR_OPACITY = 0.6;

/**
 * Treble clef y-offset above staffBaseY.
 * Post-verification fix (A-08-10): increased from 10 to 26 so the G-clef curl
 * visually sits on the G4 staff line (step 4) rather than the E4 line (step 2).
 * The adjustment is 2 diatonic steps × HALF_STEP_PX (8 px) = 16 px added upward.
 */
const TREBLE_CLEF_Y_OFFSET = 26;

/** Treble clef font size for the '𝄞' character. */
const TREBLE_CLEF_FONT_SIZE = 60;

/** Minimum staff width to show when progression is empty. */
const MIN_STAFF_WIDTH = 200;

// ── Interaction constants (ADR 0014 D3/D4) ───────────────────────────────────

/**
 * Pixel width of the resize handle hit zone on the right edge of each slot.
 * ADR 0014 D4: 10 px. hitTestResizeHandle uses this value.
 */
const RESIZE_HANDLE_WIDTH = 10;

/**
 * Pixel width of the visual resize handle bar drawn over the slot right edge.
 * Narrower than the hit zone for aesthetics.
 */
const RESIZE_HANDLE_BAR_WIDTH = 4;

/**
 * Delete button (✕) hit region size in pixels (width and height of the square
 * hit region). ADR 0014 D4: 16 × 16 px centred on (slotRight − 10, staffBaseY − 20).
 */
const DELETE_HIT_SIZE = 16;

/** Font size for the × delete button PIXI.Text. */
const DELETE_BTN_FONT_SIZE = 14;

// ── Module-level state ───────────────────────────────────────────────────────

/** Main Graphics object for static staff content (lines, note-heads, ledger lines, rests). */
let _staffGfx: PIXI.Graphics | null = null;

/** Graphics object for animated content (playhead). Redrawn every tick. */
let _dynGfx: PIXI.Graphics | null = null;

/**
 * Graphics object for selection affordances (highlight border, resize handle,
 * resize preview outline). Separate from _dynGfx so affordances and the playhead
 * do not interfere. Drawn on top of _dynGfx in z-order.
 * Step 10.6 — ADR 0014 D3/D4.
 */
let _affordanceGfx: PIXI.Graphics | null = null;

/**
 * Delete button PIXI.Text ('×'). Tracked module-level so it can be explicitly
 * destroy()ed before replacement, preventing memory leaks (ADR 0014 D4).
 * Null when no slot is selected or during resize preview.
 */
let _deleteBtn: PIXI.Text | null = null;

/** Treble clef PIXI.Text glyph. */
let _clefText: PIXI.Text | null = null;

/** Container for accidental PIXI.Text objects (re-created on build). */
let _accidentalContainer: PIXI.Container | null = null;

/** Cached layout from the last buildHarmonyStaffScene call. */
let _layout: StaffLayout = { noteHeads: [], restGlyphs: [], totalWidth: 0 };

/** Cached staffBaseY from the last buildHarmonyStaffScene call. */
let _staffBaseY = 0;

/** Cached staff width (max of totalWidth and MIN_STAFF_WIDTH). */
let _staffWidth = MIN_STAFF_WIDTH;

// ── Interaction state (ADR 0014 D3, Consequence 3) ───────────────────────────
// Ephemeral: NOT in session store, NOT persisted.

/**
 * Zero-based index of the currently selected slot, or null if nothing is selected.
 * Selection guard (Pilot Checkpoint #2, ADR 0014 Consequence 3): reset to null
 * on every buildHarmonyStaffScene call when >= progression.length.
 */
let _selectedSlotIdx: number | null = null;

/** True while a resize drag gesture is in progress (pointerdown on resize handle, not yet pointerup). */
let _resizeActive = false;

/** Pointer x coordinate (canvas-local) at the start of a resize gesture. */
let _resizeStartPx = 0;

/** Slot bars value at the start of a resize gesture (before any drag delta). */
let _resizeStartBars = 1;

/**
 * Live bars value during a resize gesture — updated on every pointermove.
 * No store write until pointerup. Used for the preview outline rendering.
 */
let _resizePreviewBars = 1;

/**
 * Cached slot bounds for the current progression, computed by computeSlotBounds
 * at the end of every buildHarmonyStaffScene call.
 * Used by pointer handlers for hit-testing without recomputing on every event.
 */
let _slotBounds: SlotBounds[] = [];

// ── Move state (step 10.7, ADR 0014 D4) ──────────────────────────────────────
// Ephemeral: NOT in session store, NOT persisted.

/** True while a move (body drag / reorder) gesture is in progress. */
let _moveActive = false;

/** Progression index of the slot being dragged (set when move activates). */
let _moveFromIdx = -1;

/** Current pointer x during drag — used to render the ghost bar. */
let _moveDragPx = 0;

/**
 * Computed target insertion index during drag (via nearestInsertionIndex).
 * Committed via reorderSlot(_moveFromIdx, _moveInsertIdx) on pointerup.
 */
let _moveInsertIdx = -1;

/**
 * Pointer x at pointerdown — used to measure displacement for the 4 px
 * move-activation threshold (ADR 0014 D4: disambiguates select-click vs move).
 */
let _pointerDownPx = 0;

/**
 * True when pointerdown landed on the currently-selected slot's body
 * (and not on the resize handle or ✕ region). The flag enables threshold
 * tracking in pointermove. Cleared on any pointer action that consumes the event.
 */
let _pointerDownOnSelected = false;

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Convert a diatonic step value to a canvas y-coordinate.
 * staffBaseY is the y-anchor for step 0 (C4).
 */
function stepToY(step: number, staffBaseY: number): number {
  return staffBaseY - step * HALF_STEP_PX;
}

/**
 * Map voiceIndex (0|1|2) to the corresponding tonal-function hex color.
 * voice 0 → COL.tonic, voice 1 → COL.subdom, voice 2 → COL.dom.
 */
function voiceColor(voiceIndex: 0 | 1 | 2): number {
  if (voiceIndex === 0) return COL.tonic;
  if (voiceIndex === 1) return COL.subdom;
  return COL.dom;
}

// ── drawBarGrid ───────────────────────────────────────────────────────────────

/**
 * Draw the bar and beat grid overlay on the staff canvas.
 * Called from buildHarmonyStaffScene before note/rest rendering (ADR 0014 D6).
 *
 * Beat lines: every PX_PER_CYCLE / 4 = 12 px, 1px, COL.faint, 15% opacity.
 * Bar lines: every PX_PER_CYCLE = 48 px, 1px, COL.faint, 35% opacity.
 * Left boundary (x=0): 1px, COL.faint, 50% opacity.
 *
 * Vertical span mirrors the playhead span:
 *   top  = stepToY(TREBLE_STAFF_LINES[last] + 2, staffBaseY)
 *   bottom = stepToY(-6, staffBaseY)
 *
 * Not exported — internal rendering helper only.
 */
function drawBarGrid(
  gfx: PIXI.Graphics,
  staffBaseY: number,
  totalBars: number,
  screenWidth: number
): void {
  // Vertical span: top of grid (above top staff line) to below bottom staff line.
  const gridTop = stepToY(TREBLE_STAFF_LINES[TREBLE_STAFF_LINES.length - 1] + 2, staffBaseY);
  const gridBottom = stepToY(-6, staffBaseY);

  // Beat interval: PX_PER_CYCLE / 4 = 12 px per beat.
  const beatPx = PX_PER_CYCLE / 4;
  // Total beats to render across the full progression width (plus one extra pass
  // to ensure the last bar line is drawn).
  const totalBeats = Math.ceil((totalBars * PX_PER_CYCLE) / beatPx) + 1;

  for (let i = 1; i <= totalBeats; i++) {
    const x = i * beatPx;
    // Limit to screen width — no need to draw off-screen grid lines.
    if (x > screenWidth) break;

    const isBarLine = i % 4 === 0; // every 4 beats = 1 bar

    if (isBarLine) {
      // Bar line: 35% opacity.
      gfx.lineStyle(1, COL.faint, 0.35);
    } else {
      // Beat line: 15% opacity.
      gfx.lineStyle(1, COL.faint, 0.15);
    }
    gfx.moveTo(x, gridTop);
    gfx.lineTo(x, gridBottom);
  }

  // Left boundary (x = 0): 50% opacity.
  gfx.lineStyle(1, COL.faint, 0.5);
  gfx.moveTo(0, gridTop);
  gfx.lineTo(0, gridBottom);
}

// ── drawAffordances ───────────────────────────────────────────────────────────

/**
 * Draw selection affordances into _affordanceGfx: highlight border, ✕ delete
 * button, right-edge resize handle, and (during resize) a preview outline.
 *
 * Called at the end of buildHarmonyStaffScene and from pointer handlers whenever
 * selection or resize state changes.
 *
 * Step 10.6 (ADR 0014 D4).
 */
function drawAffordances(): void {
  if (_affordanceGfx === null || _staffBaseY === 0) return;

  // Clear the affordance layer and destroy any previous PIXI.Text delete button
  // before rebuilding (explicit destroy prevents WebGL texture memory leak).
  _affordanceGfx.clear();
  if (_deleteBtn !== null) {
    _deleteBtn.destroy();
    _deleteBtn = null;
  }

  if (_selectedSlotIdx === null) return;

  const bound = _slotBounds[_selectedSlotIdx];
  if (bound === undefined) return;

  // Slot pixel geometry.
  const slotLeft = bound.x;
  const slotRight = bound.x + bound.width;

  // Vertical span of the staff for the highlight border and resize handle.
  // Matches the grid/playhead vertical span.
  const gridTop = stepToY(TREBLE_STAFF_LINES[TREBLE_STAFF_LINES.length - 1] + 2, _staffBaseY);
  const gridBottom = stepToY(-6, _staffBaseY);

  if (_moveActive) {
    // During move: draw a semi-transparent ghost bar at the drag position plus
    // a thin vertical insertion indicator at the nearest slot boundary.
    // ADR 0014 D4: ghost at 40% opacity; insertion indicator 2px, white, 80% opacity.

    // Ghost bar: slot-width rectangle at current drag position.
    const ghostWidth = bound.width;
    const ghostLeft = _moveDragPx - ghostWidth / 2; // centre the ghost on the pointer
    _affordanceGfx.lineStyle(0);
    _affordanceGfx.beginFill(0xffffff, 0.4);
    _affordanceGfx.drawRect(ghostLeft, gridTop, ghostWidth, gridBottom - gridTop);
    _affordanceGfx.endFill();

    // Insertion indicator: thin vertical line at the boundary closest to the drag x.
    // Boundary x = _slotBounds[_moveInsertIdx]?.x (or last slot's right edge if at end).
    let indicatorX: number;
    if (_moveInsertIdx >= 0 && _moveInsertIdx < _slotBounds.length) {
      indicatorX = _slotBounds[_moveInsertIdx].x;
    } else if (_slotBounds.length > 0) {
      // After the last slot: right edge of the last slot.
      const last = _slotBounds[_slotBounds.length - 1];
      indicatorX = last.x + last.width;
    } else {
      indicatorX = 0;
    }
    _affordanceGfx.lineStyle(2, 0xffffff, 0.8);
    _affordanceGfx.moveTo(indicatorX, gridTop);
    _affordanceGfx.lineTo(indicatorX, gridBottom);
  } else if (_resizeActive) {
    // During resize: draw preview outline rectangle showing the new duration.
    // No ✕ button, no resize handle during active drag.
    const previewWidth = Math.max(_resizePreviewBars * PX_PER_CYCLE, BAR_HEIGHT);
    _affordanceGfx.lineStyle(1, 0xffffff, 0.7);
    _affordanceGfx.drawRect(slotLeft, gridTop, previewWidth, gridBottom - gridTop);
  } else {
    // Static selection state: highlight border + ✕ + resize handle.

    // Highlight border: 1px white rectangle around the full slot vertical span.
    _affordanceGfx.lineStyle(1, 0xffffff, 0.8);
    _affordanceGfx.drawRect(slotLeft, gridTop, bound.width, gridBottom - gridTop);

    // Resize handle: narrow vertical white bar at the right edge of the slot.
    // ADR 0014 D4: 4px wide, spans staff vertical extent.
    _affordanceGfx.lineStyle(0);
    _affordanceGfx.beginFill(0xffffff, 0.6);
    _affordanceGfx.drawRect(
      slotRight - RESIZE_HANDLE_BAR_WIDTH,
      gridTop,
      RESIZE_HANDLE_BAR_WIDTH,
      gridBottom - gridTop
    );
    _affordanceGfx.endFill();

    // ✕ delete button: PIXI.Text '×' added as child of _affordanceGfx's parent
    // container (staffContainer). Positioned at (slotRight − 10, staffBaseY − 20).
    // ADR 0014 D4: font size 14, white.
    // The text is a sibling of _affordanceGfx in staffContainer so it renders on top.
    const refs = getStageRefs();
    const { staffContainer } = refs;
    _deleteBtn = new PIXI.Text('×', {
      fontFamily: FONT_SERIF,
      fontSize: DELETE_BTN_FONT_SIZE,
      fill: 0xffffff,
      fontWeight: 'bold',
    });
    _deleteBtn.resolution = 2;
    _deleteBtn.anchor.set(0.5, 0.5);
    _deleteBtn.x = slotRight - 10;
    _deleteBtn.y = _staffBaseY - 20;
    staffContainer.addChild(_deleteBtn);
  }
}

// ── drawStaticStaff ──────────────────────────────────────────────────────────

/**
 * Draw the five staff lines, note-heads (duration bars or arpeggio stagger),
 * ledger lines, and rest extent bars into _staffGfx. Clears first.
 *
 * Step 10.4 (ADR 0014 D2): replaces per-NoteHead drawCircle with duration-extent
 * bars (filled rounded-rect + onset circle). Rest glyphs replaced with rounded-rect
 * extent bars + center tick. See ADR 0014 D2 for full spec.
 *
 * Step 10.5 (ADR 0014 D7): adds chordMode parameter. When chordMode === 'arp',
 * NoteHeads are grouped by nh.x (= startCycle × PX_PER_CYCLE) and each group's
 * three voices are drawn as staggered onset circles at beat-accurate positions:
 *   voice 0: slotStart + NOTE_OFFSET_X
 *   voice 1: slotStart + NOTE_OFFSET_X + bars×PX_PER_CYCLE/3
 *   voice 2: slotStart + NOTE_OFFSET_X + 2×bars×PX_PER_CYCLE/3
 * A thin ascending connector polyline (1px, 0xffffff, 35% opacity) connects the
 * three onset positions. Groups with fewer than 3 note-heads skip the connector.
 * When chordMode === 'chord', the step 10.4 duration bars are used unchanged.
 *
 * @param lineWidth - Horizontal extent of the five staff lines. Must equal
 *   app.screen.width (edge-to-edge) so the canvas never shows black gaps on
 *   the right when there are only a few chords. Note-head x-positions come
 *   from layout.noteHeads[].x and are independent of this value.
 * @param chordMode - 'chord' renders duration bars per ADR 0014 D2;
 *   'arp' renders staggered onset circles per ADR 0014 D7.
 */
function drawStaticStaff(
  gfx: PIXI.Graphics,
  layout: StaffLayout,
  staffBaseY: number,
  staffWidth: number,
  lineWidth: number,
  chordMode: 'chord' | 'arp'
): void {
  gfx.clear();

  // ── Five treble staff lines ────────────────────────────────────────────────
  // Lines span edge-to-edge (0 → lineWidth = app.screen.width) regardless of
  // how many notes exist. Post-verification fix (A-08-10): was 0→staffWidth,
  // leaving the right portion of the canvas black when the progression is short.
  for (const lineStep of TREBLE_STAFF_LINES) {
    const y = stepToY(lineStep, staffBaseY);
    gfx.lineStyle(1, COL.faint, 0.9);
    gfx.moveTo(0, y);
    gfx.lineTo(lineWidth, y);
  }

  // ── Note-heads: chord mode = duration bars; arp mode = staggered onsets ────
  if (chordMode === 'arp') {
    // ── Arpeggio mode (ADR 0014 D7): beat-accurate staggered onset circles ────
    // Group NoteHeads by nh.x (= startCycle × PX_PER_CYCLE). Each group
    // represents one slot. NoteHeads within a group are ordered by insertion
    // order in computeStaffLayout (voice 0 → voice 1 → voice 2).
    //
    // For a complete group of 3, draw:
    //   - onset circle for each voice at its staggered x position
    //   - thin ascending connector polyline through the three onset positions
    // For incomplete groups (< 3 note-heads), skip connector; draw circles only.
    const groups = new Map<number, typeof layout.noteHeads>();
    for (const nh of layout.noteHeads) {
      const key = nh.x;
      let group = groups.get(key);
      if (group === undefined) {
        group = [];
        groups.set(key, group);
      }
      group.push(nh);
    }

    for (const [slotStartX, nhGroup] of groups) {
      // Compute stagger offsets. All NoteHeads in a slot share the same nh.bars
      // (the slot duration). Use the first entry to get bars.
      const bars = nhGroup[0].bars;
      const slotSpan = bars * PX_PER_CYCLE;

      // Stagger x offsets: voice i is at offset i/3 of the slot's pixel span.
      const xOffsets = [0, slotSpan / 3, (2 * slotSpan) / 3];

      // Collect positions for the connector polyline (only when group is full).
      const connectorPoints: Array<{ px: number; py: number }> = [];

      for (let i = 0; i < nhGroup.length; i++) {
        const nh = nhGroup[i];
        const col = voiceColor(nh.voiceIndex);
        // Stagger x: base is slotStartX + NOTE_OFFSET_X, then add the voice offset.
        // If the group has fewer than 3 entries, use i-indexed offsets for the
        // available voices (maintaining visual accuracy for whatever voices exist).
        const px = slotStartX + NOTE_OFFSET_X + (xOffsets[i] ?? 0);
        const py = stepToY(nh.stepY, staffBaseY);

        // Ledger lines at the staggered x position.
        if (nh.ledgerLines.length > 0) {
          gfx.lineStyle(1, col, 0.7);
          for (const ledgerStep of nh.ledgerLines) {
            const ly = stepToY(ledgerStep, staffBaseY);
            gfx.moveTo(px - LEDGER_HALF_W, ly);
            gfx.lineTo(px + LEDGER_HALF_W, ly);
          }
        }

        // Onset circle at the staggered position.
        gfx.lineStyle(0);
        gfx.beginFill(col, 1);
        gfx.drawCircle(px, py, NOTE_RADIUS);
        gfx.endFill();

        connectorPoints.push({ px, py });
      }

      // Ascending connector polyline — only drawn when the group is complete (3 voices).
      // ADR 0014 D7: 1px, 0xffffff, 35% opacity.
      if (nhGroup.length === 3) {
        gfx.lineStyle(1, 0xffffff, 0.35);
        gfx.moveTo(connectorPoints[0].px, connectorPoints[0].py);
        for (let i = 1; i < connectorPoints.length; i++) {
          gfx.lineTo(connectorPoints[i].px, connectorPoints[i].py);
        }
      }
    }
  } else {
    // ── Chord mode (ADR 0014 D2): duration-extent bars + onset circles ────────
    // Each NoteHead is rendered as:
    //   1. A filled rounded-rectangle bar spanning the slot's duration in pixels.
    //   2. An onset circle at the left edge (full opacity, voice color).
    // Ledger lines are drawn at their diatonic-step y positions before each bar.
    for (const nh of layout.noteHeads) {
      const col = voiceColor(nh.voiceIndex);
      const nx = nh.x + NOTE_OFFSET_X;
      const ny = stepToY(nh.stepY, staffBaseY);

      // Ledger lines (same color as the note-head, slightly dimmed for visual hierarchy).
      if (nh.ledgerLines.length > 0) {
        gfx.lineStyle(1, col, 0.7);
        for (const ledgerStep of nh.ledgerLines) {
          const ly = stepToY(ledgerStep, staffBaseY);
          gfx.moveTo(nx - LEDGER_HALF_W, ly);
          gfx.lineTo(nx + LEDGER_HALF_W, ly);
        }
      }

      // Duration bar: filled rounded-rect, width = bars * PX_PER_CYCLE (min 8px).
      // ADR 0014 D2: height = BAR_HEIGHT (8px), corner radius = BAR_CORNER_RADIUS (2px),
      // opacity = BAR_OPACITY (80%). PX_PER_CYCLE imported from time-map.ts.
      const barWidth = Math.max(nh.bars * PX_PER_CYCLE, BAR_HEIGHT);
      gfx.lineStyle(0);
      gfx.beginFill(col, BAR_OPACITY);
      gfx.drawRoundedRect(nx, ny - BAR_HEIGHT / 2, barWidth, BAR_HEIGHT, BAR_CORNER_RADIUS);
      gfx.endFill();

      // Onset circle at left edge of the bar: full opacity, voice color.
      gfx.lineStyle(0);
      gfx.beginFill(col, 1);
      gfx.drawCircle(nx, ny, NOTE_RADIUS);
      gfx.endFill();
    }
  }

  // ── Rest extent bars (ADR 0014 D2) ────────────────────────────────────────
  // Each RestGlyph is rendered as:
  //   1. A filled rounded-rectangle bar spanning the rest's duration in pixels
  //      at restY = stepToY(6, staffBaseY) (step 6 = B4, middle staff line).
  //   2. A short center tick for legibility (thick line, REST_HALF_W = 10px half-width).
  // Rest bars are rendered the same way in both chord and arp modes.
  const restY = stepToY(6, staffBaseY);
  for (const rg of layout.restGlyphs) {
    const rx = rg.x + NOTE_OFFSET_X;
    const restBarWidth = Math.max(rg.bars * PX_PER_CYCLE, BAR_HEIGHT);

    // Rest extent bar: grey, 60% opacity, rounded rect.
    gfx.lineStyle(0);
    gfx.beginFill(COL.faint, REST_BAR_OPACITY);
    gfx.drawRoundedRect(rx, restY - BAR_HEIGHT / 2, restBarWidth, BAR_HEIGHT, BAR_CORNER_RADIUS);
    gfx.endFill();

    // Center tick: short dark line at the horizontal center of the bar.
    // Retained for legibility (ADR 0014 D2).
    const tickCenterX = rx + restBarWidth / 2;
    gfx.lineStyle(2, COL.faint, 0.9);
    gfx.moveTo(tickCenterX - REST_HALF_W, restY);
    gfx.lineTo(tickCenterX + REST_HALF_W, restY);
  }

  // staffWidth is used by the caller but not within this function.
  // Suppress unused-parameter lint without a comment directive.
  void staffWidth;
}

// ── drawAccidentals ──────────────────────────────────────────────────────────

/**
 * Populate _accidentalContainer with PIXI.Text '#' objects for every NoteHead
 * with accidental === '#'. Clears the container first.
 */
function drawAccidentals(container: PIXI.Container, layout: StaffLayout, staffBaseY: number): void {
  container.removeChildren();

  for (const nh of layout.noteHeads) {
    if (nh.accidental !== '#') continue;

    const col = voiceColor(nh.voiceIndex);
    const nx = nh.x + NOTE_OFFSET_X;
    const ny = stepToY(nh.stepY, staffBaseY);

    const accText = new PIXI.Text('#', {
      fontFamily: FONT_SERIF,
      fontSize: ACCIDENTAL_FONT_SIZE,
      fill: col,
      fontWeight: 'bold',
    });
    accText.resolution = 2;
    // Position to the left of the note-head, vertically centered.
    accText.anchor.set(1, 0.5);
    accText.x = nx - NOTE_RADIUS - 1;
    accText.y = ny;
    container.addChild(accText);
  }
}

// ── buildHarmonyStaffScene ────────────────────────────────────────────────────

/**
 * Build (or rebuild) the harmony staff scene: compute voice tracks and staff layout,
 * create or re-attach PIXI objects inside harmonyLayer, and draw static geometry.
 *
 * Called on init, on resize, and when progression length or octave changes.
 * Removes and re-adds all staff scene objects to harmonyLayer on each call.
 *
 * @param state - Current SessionState.
 */
export function buildHarmonyStaffScene(state: SessionState): void {
  const refs = getStageRefs();
  // Phase 08 (step 08.5): staff scene objects added to refs.staffContainer
  // instead of refs.harmonyLayer directly. ADR 0011 Amendment §D5.
  const { app, staffContainer } = refs;

  // ── Remove previous staff scene objects ───────────────────────────────────
  if (_staffGfx !== null) staffContainer.removeChild(_staffGfx);
  if (_dynGfx !== null) staffContainer.removeChild(_dynGfx);
  if (_clefText !== null) staffContainer.removeChild(_clefText);
  if (_accidentalContainer !== null) staffContainer.removeChild(_accidentalContainer);
  if (_affordanceGfx !== null) staffContainer.removeChild(_affordanceGfx);
  // Destroy any previous delete button PIXI.Text before rebuilding (memory leak guard).
  if (_deleteBtn !== null) {
    // The _deleteBtn may have been added as a direct child of staffContainer.
    staffContainer.removeChild(_deleteBtn);
    _deleteBtn.destroy();
    _deleteBtn = null;
  }

  // ── Create fresh PIXI objects ─────────────────────────────────────────────
  _staffGfx = new PIXI.Graphics();
  _dynGfx = new PIXI.Graphics();
  _affordanceGfx = new PIXI.Graphics();
  _accidentalContainer = new PIXI.Container();

  // Font fallback for U+1D11E (𝄞, Musical Symbol G Clef): Fraunces and most serif fonts
  // do not contain SMP music glyphs. 'Georgia, "Times New Roman", serif' provides a wide
  // OS coverage for BMP glyphs but the treble-clef codepoint is SMP and may still render
  // as a tofu box on some platforms. This is a known limitation — see handoff step 07.5.
  _clefText = new PIXI.Text('\u{1D11E}', {
    fontFamily: `Georgia, "Times New Roman", ${FONT_SERIF}`,
    fontSize: TREBLE_CLEF_FONT_SIZE,
    fill: COL.faint,
  });
  _clefText.resolution = 2;

  // ── Compute staff geometry ─────────────────────────────────────────────────
  // Phase 08 (ADR 0011 Amendment D5): center step-6 (B4) at canvas vertical midpoint.
  // staffBaseY = height / 2 − (6 × HALF_STEP_PX) = height / 2 − 48
  // Supersedes Phase 07 value of (height − 60).
  _staffBaseY = app.screen.height / 2 - 6 * HALF_STEP_PX;

  // ── Compute layout ────────────────────────────────────────────────────────
  // Phase 08 (step 08.5): state.harmony.registerMode is now a typed field
  // on HarmonyState (added in session.ts step 08.5). No cast needed.
  // Default 'suavizado' is the ADR 0011 Amendment D6 UX goal.
  const tracks = computeVoiceTracks(
    state.harmony.progression,
    state.harmony.octave,
    state.harmony.registerMode
  );
  _layout = computeStaffLayout(tracks, PX_PER_CYCLE);

  // ── _staffWidth: total progression duration in pixels ─────────────────────
  // Post-verification fix (A-08-08): _staffWidth must equal the full progression
  // duration (totalBars × PX_PER_CYCLE), not layout.totalWidth.  layout.totalWidth
  // only extends to the last rendered note event and is shorter when notes don't
  // fill the entire progression (e.g. a trailing rest).  Using totalWidth caused
  // the playhead to wrap faster than the ProgressionStrip cursor, breaking sync.
  // The ProgressionStrip cursor denominator is totalBars × PX_PER_CYCLE (local
  // const PX_PER_CYCLE = 48 in ProgressionStrip.svelte, same value per Register).
  _staffWidth = Math.max(
    state.harmony.progression.reduce((sum, slot) => sum + (slot.bars ?? 1), 0) * PX_PER_CYCLE,
    MIN_STAFF_WIDTH
  );

  // ── Draw bar grid (ADR 0014 D6) — before note/rest rendering ─────────────
  // totalBars = _staffWidth / PX_PER_CYCLE (already computed above).
  // screenWidth capped at app.screen.width so beat lines do not overflow the canvas.
  const totalBars = _staffWidth / PX_PER_CYCLE;
  drawBarGrid(_staffGfx, _staffBaseY, totalBars, app.screen.width);

  // ── Draw static content ───────────────────────────────────────────────────
  // lineWidth = app.screen.width: staff lines span edge-to-edge regardless of
  // note content (Bug 1 fix, A-08-10). Note-head positions use _layout coordinates.
  // Step 10.5 (ADR 0014 D7): pass state.chordMode so drawStaticStaff can branch
  // between duration-bar rendering (chord) and staggered-onset rendering (arp).
  drawStaticStaff(_staffGfx, _layout, _staffBaseY, _staffWidth, app.screen.width, state.chordMode);
  drawAccidentals(_accidentalContainer, _layout, _staffBaseY);

  // ── Position treble clef glyph ────────────────────────────────────────────
  // Place at x=0, y = staffBaseY - TREBLE_CLEF_Y_OFFSET (anchored at top-left of text).
  // The '𝄞' glyph's visual baseline falls roughly in the middle of its bounding box;
  // offset upward so the visual anchor aligns with the C4 ledger line area.
  _clefText.x = 2;
  _clefText.y = _staffBaseY - TREBLE_CLEF_Y_OFFSET - TREBLE_CLEF_FONT_SIZE * 0.75;

  // ── Selection guard (ADR 0014 Consequence 3, Pilot Checkpoint #2) ────────
  // On every buildHarmonyStaffScene rebuild, validate _selectedSlotIdx against
  // the fresh progression length. If _selectedSlotIdx >= progression.length
  // (i.e., the selected slot no longer exists — e.g., deleted from the
  // ProgressionStrip externally), reset to null.
  // This prevents the interaction layer from referencing a nonexistent slot.
  // Step 10.7: also reset move state when selection is cleared (a slot that was
  // being dragged may have been deleted externally).
  if (_selectedSlotIdx !== null && _selectedSlotIdx >= state.harmony.progression.length) {
    _selectedSlotIdx = null;
    _resizeActive = false;
    _resizePreviewBars = 1;
    _moveActive = false;
    _moveFromIdx = -1;
    _moveInsertIdx = -1;
    _moveDragPx = 0;
    _pointerDownOnSelected = false;
  }

  // ── Compute slot bounds for hit-testing (ADR 0014 D3) ────────────────────
  // Must be called after _staffWidth is set so _slotBounds reflect the current
  // progression (used by pointer handlers and drawAffordances).
  _slotBounds = computeSlotBounds(state.harmony.progression, PX_PER_CYCLE);

  // ── Add to staffContainer (staff behind accidentals behind clef, dyn on top) ──
  // Phase 08 (step 08.5): children go to refs.staffContainer, not harmonyLayer.
  // Build order: _staffGfx → _accidentalContainer → _clefText → _dynGfx → _affordanceGfx.
  // _affordanceGfx is on top so affordances render above the playhead.
  // ADR 0011 Amendment §D5.
  staffContainer.addChild(_staffGfx);
  staffContainer.addChild(_accidentalContainer);
  staffContainer.addChild(_clefText);
  staffContainer.addChild(_dynGfx);
  staffContainer.addChild(_affordanceGfx);

  // ── Draw affordances for current selection state ──────────────────────────
  // Called after adding to container so drawAffordances can access staffContainer
  // via getStageRefs() to add the _deleteBtn PIXI.Text as a sibling.
  drawAffordances();
}

// ── Staff pointer event handlers (step 10.6, ADR 0014 D3/D4) ─────────────────
//
// Pointer events are delivered as native DOM PointerEvents on the PIXI canvas
// element, matching the existing onStagePointerDown idiom in tonnetz-scene.ts.
// App.svelte routes canvas 'pointerdown', 'pointermove', and 'pointerup' events
// here when view === 'harmony' && harmony.subview === 'staff'.
//
// Local coordinate mapping: e.offsetX/Y are canvas-local CSS pixels. With
// autoDensity:true in PIXI Application, logical px === CSS px, so offsetX
// aligns directly with the slot bounds computed from x = 0 at staff origin.
// No DPR conversion needed (mirrors the Tonnetz onStagePointerDown correction,
// phase-03 round-2 fix).
//
// Dispatch order (ADR 0014 D4):
//   1. If _selectedSlotIdx non-null: check ✕ hit region → call clearChordAt
//   2. If _selectedSlotIdx non-null: check resize handle zone → start resize
//   3. Check slot body hit → select
//   4. Outside all slots → deselect

/**
 * Compute the delete button hit rectangle for the given slot bounds.
 * Hit region: 16×16 px centred at (slotRight − 10, staffBaseY − 20).
 * ADR 0014 D4.
 */
function deleteBtnHitRect(bound: SlotBounds): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const slotRight = bound.x + bound.width;
  const cx = slotRight - 10;
  const cy = _staffBaseY - 20;
  const half = DELETE_HIT_SIZE / 2;
  return {
    left: cx - half,
    right: cx + half,
    top: cy - half,
    bottom: cy + half,
  };
}

/**
 * Handle pointerdown on the staff canvas (harmony sub-view 'staff').
 *
 * Dispatch order per ADR 0014 D4:
 *   1. If slot selected: ✕ hit → clearChordAt, reset selection, return.
 *   2. If slot selected: resize handle hit → start resize, return.
 *   3. Slot body hit → select that slot.
 *   4. Outside → deselect.
 *
 * @param e - Native PointerEvent; e.offsetX is canvas-local (autoDensity).
 */
export function onStaffPointerDown(e: PointerEvent): void {
  const px = e.offsetX;

  // ── 1. ✕ delete hit (only when a slot is currently selected) ─────────────
  if (_selectedSlotIdx !== null) {
    const bound = _slotBounds[_selectedSlotIdx];
    if (bound !== undefined) {
      const hr = deleteBtnHitRect(bound);
      if (px >= hr.left && px <= hr.right) {
        const py = e.offsetY;
        if (py >= hr.top && py <= hr.bottom) {
          const idxToDelete = _selectedSlotIdx;
          _selectedSlotIdx = null;
          _resizeActive = false;
          drawAffordances();
          // Store action: remove the slot. App.svelte subscription will call
          // buildHarmonyStaffScene if progression length changes (which it will).
          clearChordAt(idxToDelete);
          return;
        }
      }
    }
  }

  // ── 2. Resize handle hit (only when a slot is currently selected) ─────────
  if (_selectedSlotIdx !== null) {
    const resizeHit = hitTestResizeHandle(px, _slotBounds, RESIZE_HANDLE_WIDTH);
    if (resizeHit === _selectedSlotIdx) {
      // Start resize gesture.
      const slot = get(sessionStore).harmony.progression[_selectedSlotIdx];
      _resizeActive = true;
      _resizeStartPx = px;
      _resizeStartBars = slot !== undefined ? (slot.bars ?? 1) : 1;
      _resizePreviewBars = _resizeStartBars;
      drawAffordances();
      return;
    }
  }

  // ── 3. Slot body hit → select or arm move ────────────────────────────────
  const hitIdx = hitTestSlot(px, _slotBounds);
  if (hitIdx !== null) {
    if (hitIdx === _selectedSlotIdx) {
      // The user pressed on the already-selected slot body.
      // Do NOT start the move immediately — wait for a 4 px displacement in
      // pointermove (ADR 0014 D4: threshold prevents accidental moves on tap).
      _pointerDownOnSelected = true;
      _pointerDownPx = px;
      // Selection state unchanged; affordances unchanged.
    } else {
      // Different slot: select it normally; any in-progress move is cancelled.
      _selectedSlotIdx = hitIdx;
      _resizeActive = false;
      _pointerDownOnSelected = false;
      _moveActive = false;
      _moveFromIdx = -1;
      drawAffordances();
    }
    return;
  }

  // ── 4. Outside all slots → deselect ──────────────────────────────────────
  _selectedSlotIdx = null;
  _resizeActive = false;
  _pointerDownOnSelected = false;
  _moveActive = false;
  _moveFromIdx = -1;
  drawAffordances();
}

/**
 * Handle pointermove on the staff canvas (harmony sub-view 'staff').
 *
 * Step 10.6: during an active resize gesture: update _resizePreviewBars and
 * redraw affordances (preview outline). No store write until pointerup.
 *
 * Step 10.7: during an active move gesture: update _moveDragPx and
 * _moveInsertIdx, then redraw affordances (ghost bar + insertion indicator).
 * Move activation threshold: 4 px displacement from pointerdown position
 * (ADR 0014 D4). When threshold is crossed and _pointerDownOnSelected is true,
 * transitions from select-pending to move-active.
 *
 * @param e - Native PointerEvent; e.offsetX is canvas-local.
 */
export function onStaffPointerMove(e: PointerEvent): void {
  const px = e.offsetX;

  // ── Resize in progress ────────────────────────────────────────────────────
  if (_resizeActive) {
    const deltaPx = px - _resizeStartPx;
    _resizePreviewBars = clampBars(_resizeStartBars + deltaPx / PX_PER_CYCLE);
    drawAffordances();
    return;
  }

  // ── Move in progress ──────────────────────────────────────────────────────
  if (_moveActive) {
    _moveDragPx = px;
    _moveInsertIdx = nearestInsertionIndex(px, _slotBounds);
    drawAffordances();
    return;
  }

  // ── Threshold tracking (arm → activate move) ──────────────────────────────
  // When the user pressed on the already-selected slot body (_pointerDownOnSelected),
  // check if the pointer has moved more than 4 px. If so, activate the move gesture.
  if (_pointerDownOnSelected && _selectedSlotIdx !== null) {
    const displacement = Math.abs(px - _pointerDownPx);
    if (displacement >= 4) {
      // Threshold crossed: transition to move-active.
      _moveActive = true;
      _moveFromIdx = _selectedSlotIdx;
      _moveDragPx = px;
      _moveInsertIdx = nearestInsertionIndex(px, _slotBounds);
      _pointerDownOnSelected = false;
      drawAffordances();
    }
    // If threshold not yet crossed, no visual change needed.
  }
}

/**
 * Handle pointerup on the staff canvas (harmony sub-view 'staff').
 *
 * Step 10.6: if a resize gesture is active, commit via setChordBars (store write).
 * The store write triggers App.svelte's subscription; if progression content
 * (bars) changed without a length change, updateHarmonyStaffDynamic is called
 * rather than buildHarmonyStaffScene — so we also call drawAffordances here
 * to refresh the handle position based on the new bounds.
 *
 * Step 10.7: if a move gesture is active, commit via reorderSlot(fromIdx, toIdx)
 * (no-op if equal). The store write triggers a full buildHarmonyStaffScene rebuild
 * (progression length is unchanged, but the slot order change is picked up by
 * App.svelte's subscription when it detects a changed slot identity).
 * After commit, reset all move state and redraw (or wait for rebuild).
 */
export function onStaffPointerUp(): void {
  // Always clear threshold-tracking flag on pointerup, regardless of other state.
  _pointerDownOnSelected = false;

  // ── Move commit ───────────────────────────────────────────────────────────
  if (_moveActive) {
    const fromIdx = _moveFromIdx;
    const toIdx = _moveInsertIdx;
    // Reset move state before the store write so any synchronous rebuild triggered
    // by the store change does not re-enter the move drawing branch.
    _moveActive = false;
    _moveFromIdx = -1;
    _moveInsertIdx = -1;
    _moveDragPx = 0;

    if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
      // reorderSlot handles clamping and the no-op-if-equal guard internally.
      // It calls requeueLive() — audio will change at the next cycle (by design).
      reorderSlot(fromIdx, toIdx);
      // reorderSlot triggers a store write; App.svelte will call buildHarmonyStaffScene
      // via the totalBars/chordMode/length subscription. If the length is unchanged,
      // the subscription may not fire a rebuild — eagerly recompute _slotBounds and
      // redraw so affordances reflect the reordered state.
      _slotBounds = computeSlotBounds(get(sessionStore).harmony.progression, PX_PER_CYCLE);
    }
    drawAffordances();
    return;
  }

  // ── Resize commit ─────────────────────────────────────────────────────────
  if (!_resizeActive) return;

  if (_selectedSlotIdx !== null) {
    const barsToCommit = _resizePreviewBars;
    _resizeActive = false;
    // Commit the resize: store write. App.svelte will trigger a rebuild only if
    // progression length changes (it won't for a bars-only change). After the
    // store update, _slotBounds will be stale until the next buildHarmonyStaffScene.
    // We eagerly recompute _slotBounds and redraw affordances so the handle
    // position is correct without waiting for a full rebuild.
    setChordBars(_selectedSlotIdx, barsToCommit);
    // Eagerly refresh slot bounds with the updated bars value.
    _slotBounds = computeSlotBounds(get(sessionStore).harmony.progression, PX_PER_CYCLE);
    _resizePreviewBars = barsToCommit;
    drawAffordances();
  } else {
    _resizeActive = false;
  }
}

// ── updateHarmonyStaffDynamic ─────────────────────────────────────────────────

/**
 * Redraw only animated elements (the playhead vertical line).
 * Called by App.svelte's store subscription on every state change,
 * and also called each tick via tickHarmonyStaff.
 *
 * Phase 08 (ADR 0011 Amendment D6): cyclic modulo wrap.
 * rawX = (now - anchor) / barMs * PX_PER_CYCLE
 * playheadX = ((rawX % _staffWidth) + _staffWidth) % _staffWidth
 * Guard: if _staffWidth <= 0, return early without drawing.
 * where barMs = (60000 / bpm) * 4  (one 4/4 bar in ms).
 *
 * Post-verification REVISE II (BUG A): guard on playback state.
 * When nowPlaying.source is null (nothing playing), clear and return without
 * drawing the playhead line. This prevents the line from animating before
 * the user has started playback.
 *
 * @param state - Current SessionState.
 */
export function updateHarmonyStaffDynamic(state: SessionState): void {
  if (_dynGfx === null || _staffBaseY === 0) return;

  _dynGfx.clear();

  // BUG A fix: do not draw the playhead when nothing is playing.
  // nowPlaying.source === null means no transport is active.
  if (state.nowPlaying.source === null) return;

  // Guard: if staff width is zero or negative, return without drawing.
  // _staffWidth is always Math.max(_layout.totalWidth, MIN_STAFF_WIDTH) so it
  // should be ≥ MIN_STAFF_WIDTH (200). This guard satisfies the spec requirement
  // and prevents a division-by-zero / NaN in the modulo expression.
  if (_staffWidth <= 0) return;

  const bpm = state.bpm > 0 ? state.bpm : 120;
  const barMs = (60000 / bpm) * 4;
  const now = performance.now();
  const rawX = ((now - getVisualPhaseAnchor()) / barMs) * PX_PER_CYCLE;
  // Phase 08 (ADR 0011 Amendment D6): cyclic modulo wrap replaces the old clamp.
  // Positive-modulo guard handles briefly-negative rawX (phase anchor in the future
  // after a re-anchor event). ((rawX % w) + w) % w is always in [0, w).
  const playheadX = ((rawX % _staffWidth) + _staffWidth) % _staffWidth;

  // Vertical span: from top staff line (step 10) to bottom of ledger zone (step −8).
  // Top: step 10 + 2 extra steps margin
  const topY = stepToY(TREBLE_STAFF_LINES[TREBLE_STAFF_LINES.length - 1] + 2, _staffBaseY);
  // Bottom: step −8 (a few steps below the lowest expected ledger line at −7 for C3)
  const bottomY = stepToY(-8, _staffBaseY);

  _dynGfx.lineStyle(1, 0xffffff, 0.85);
  _dynGfx.moveTo(playheadX, topY);
  _dynGfx.lineTo(playheadX, bottomY);
}

// ── tickHarmonyStaff ─────────────────────────────────────────────────────────

/**
 * Per-frame animation tick for the harmony staff view.
 * Called unconditionally by the PIXI ticker (registered in App.svelte step 07.4).
 * Early-returns if the current view is not 'harmony'.
 *
 * Per the spec, tickHarmonyStaff guards on view internally (consistent with the
 * pattern described for tonnetz-scene.ts's tickHarmony).
 */
export function tickHarmonyStaff(): void {
  const state = get(sessionStore);
  if (state.view !== 'harmony') return;
  updateHarmonyStaffDynamic(state);
}
