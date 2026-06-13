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

import * as PIXI from 'pixi.js';
import { get } from 'svelte/store';

import { computeVoiceTracks } from '../core/harmony/voice-tracks.js';
import { computeStaffLayout } from '../core/harmony/staff-layout.js';
import type { StaffLayout } from '../core/harmony/staff-layout.js';
import { TREBLE_STAFF_LINES } from '../core/harmony/staff-map.js';
import { PX_PER_CYCLE } from '../core/harmony/time-map.js';
import { getVisualPhaseAnchor } from '../state/phase-anchor.js';
import { sessionStore } from '../state/session.js';
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

// ── Module-level state ───────────────────────────────────────────────────────

/** Main Graphics object for static staff content (lines, note-heads, ledger lines, rests). */
let _staffGfx: PIXI.Graphics | null = null;

/** Graphics object for animated content (playhead). Redrawn every tick. */
let _dynGfx: PIXI.Graphics | null = null;

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

  // ── Create fresh PIXI objects ─────────────────────────────────────────────
  _staffGfx = new PIXI.Graphics();
  _dynGfx = new PIXI.Graphics();
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

  // ── Add to staffContainer (staff behind accidentals behind clef, dyn on top) ──
  // Phase 08 (step 08.5): children go to refs.staffContainer, not harmonyLayer.
  // Build order: _staffGfx → _accidentalContainer → _clefText → _dynGfx.
  // ADR 0011 Amendment §D5.
  staffContainer.addChild(_staffGfx);
  staffContainer.addChild(_accidentalContainer);
  staffContainer.addChild(_clefText);
  staffContainer.addChild(_dynGfx);
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
