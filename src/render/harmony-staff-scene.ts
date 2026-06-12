// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — harmony staff scene: PIXI rendering of the treble-clef linear staff
// for the harmony view. Consumes StaffLayout from staff-layout.ts and draws:
//   - Five treble-clef staff lines
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
//
// Voice colors (Pilot decision, phase-07.md):
//   voice 0 → COL.tonic  (0xf3b15a)
//   voice 1 → COL.subdom (0x56cfc4)
//   voice 2 → COL.dom    (0xe87bac)
//
// Playhead (Phase 08 ADR 0011 Amendment D6): cyclic modulo wrap.
//   rawX = (now − getVisualPhaseAnchor()) / barMs × PX_PER_CYCLE
//   playheadX = ((rawX % _staffWidth) + _staffWidth) % _staffWidth
//   Guard: if _staffWidth <= 0, return early without drawing.
//   where barMs = (60000 / bpm) × 4 (one 4/4 bar in ms)
//   (Fixes Phase 07 A-07-11 / A-08-08: playhead loops continuously instead of
//    clamping at the last note position.)
//
// PX_PER_CYCLE imported from time-map.ts (vigent coordination-point rule).

import * as PIXI from 'pixi.js';
import { get } from 'svelte/store';

import { computeVoiceTracks } from '../core/harmony/voice-tracks.js';
import type { RegisterMode } from '../core/harmony/voice-tracks.js';
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

/** Rest glyph line half-width (centered in the rest's x-slot). */
const REST_HALF_W = 10;

/** Sharp accidental PIXI.Text font size. */
const ACCIDENTAL_FONT_SIZE = 11;

/** Treble clef y-offset above staffBaseY. */
const TREBLE_CLEF_Y_OFFSET = 10;

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

// ── drawStaticStaff ──────────────────────────────────────────────────────────

/**
 * Draw the five staff lines, note-heads, ledger lines, and rest glyphs
 * into _staffGfx. Clears first.
 */
function drawStaticStaff(
  gfx: PIXI.Graphics,
  layout: StaffLayout,
  staffBaseY: number,
  staffWidth: number
): void {
  gfx.clear();

  // ── Five treble staff lines ────────────────────────────────────────────────
  // Lines are drawn in COL.faint, spanning the full staff width.
  for (const lineStep of TREBLE_STAFF_LINES) {
    const y = stepToY(lineStep, staffBaseY);
    gfx.lineStyle(1, COL.faint, 0.9);
    gfx.moveTo(0, y);
    gfx.lineTo(staffWidth, y);
  }

  // ── Note-heads, ledger lines ───────────────────────────────────────────────
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

    // Filled circle note-head.
    gfx.lineStyle(0);
    gfx.beginFill(col, 1);
    gfx.drawCircle(nx, ny, NOTE_RADIUS);
    gfx.endFill();
  }

  // ── Rest glyphs ────────────────────────────────────────────────────────────
  // Rendered as a short thick horizontal line at the middle staff y-position.
  // Middle of the five staff lines = step 6 (B4, the third staff line).
  const restY = stepToY(6, staffBaseY);
  for (const rg of layout.restGlyphs) {
    const rx = rg.x + NOTE_OFFSET_X;
    gfx.lineStyle(3, COL.faint, 0.8);
    gfx.moveTo(rx - REST_HALF_W, restY);
    gfx.lineTo(rx + REST_HALF_W, restY);
  }
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
  const { app, harmonyLayer } = refs;

  // ── Remove previous staff scene objects ───────────────────────────────────
  if (_staffGfx !== null) harmonyLayer.removeChild(_staffGfx);
  if (_dynGfx !== null) harmonyLayer.removeChild(_dynGfx);
  if (_clefText !== null) harmonyLayer.removeChild(_clefText);
  if (_accidentalContainer !== null) harmonyLayer.removeChild(_accidentalContainer);

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
  // TODO(step-08.5): wire state.harmony.registerMode once session.ts adds the field.
  // Until then, default to 'suavizado' (ADR 0011 D6 Phase 08 UX goal default).
  // Double cast via unknown is intentional: HarmonyState does not yet carry the
  // registerMode field; it is added in step 08.5. The cast is safe because the field
  // will either be undefined (missing) or a valid RegisterMode string.
  const registerMode = (state.harmony as unknown as Record<string, unknown>).registerMode as
    | RegisterMode
    | undefined;
  const tracks = computeVoiceTracks(
    state.harmony.progression,
    state.harmony.octave,
    registerMode ?? 'suavizado'
  );
  _layout = computeStaffLayout(tracks, PX_PER_CYCLE);
  _staffWidth = Math.max(_layout.totalWidth, MIN_STAFF_WIDTH);

  // ── Draw static content ───────────────────────────────────────────────────
  drawStaticStaff(_staffGfx, _layout, _staffBaseY, _staffWidth);
  drawAccidentals(_accidentalContainer, _layout, _staffBaseY);

  // ── Position treble clef glyph ────────────────────────────────────────────
  // Place at x=0, y = staffBaseY - TREBLE_CLEF_Y_OFFSET (anchored at top-left of text).
  // The '𝄞' glyph's visual baseline falls roughly in the middle of its bounding box;
  // offset upward so the visual anchor aligns with the C4 ledger line area.
  _clefText.x = 2;
  _clefText.y = _staffBaseY - TREBLE_CLEF_Y_OFFSET - TREBLE_CLEF_FONT_SIZE * 0.75;

  // ── Add to harmonyLayer (staff behind accidentals behind clef, dyn on top) ──
  harmonyLayer.addChild(_staffGfx);
  harmonyLayer.addChild(_accidentalContainer);
  harmonyLayer.addChild(_clefText);
  harmonyLayer.addChild(_dynGfx);
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
 * @param state - Current SessionState.
 */
export function updateHarmonyStaffDynamic(state: SessionState): void {
  if (_dynGfx === null || _staffBaseY === 0) return;

  _dynGfx.clear();

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
