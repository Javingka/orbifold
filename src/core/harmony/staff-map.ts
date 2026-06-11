// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — staff-map: maps note names to treble-clef staff coordinates.
// Input format: note names produced by chordVoicing / VoiceEvent.noteName
// (e.g. 'C3', 'E3', 'G3', 'C#4'). Sharp-only for production voicings (ADR 0011
// Consequence 4); flat input is handled gracefully for robustness.
// No DOM, PIXI, or Svelte imports — pure TypeScript (ADR 0011 Consequence 1).
// Prototype parity: NOTE_NAMES from src/core/theory/pitch.ts (ported from
// reference/orbifold.html line 592) provides the sharp-only spellings received here.

// ──────────────────────────────────────────────────────────────────────────────
// Staff constants (exported for the rendering layer)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Treble staff lines in `steps` units (chromatic half-steps from C4, where C4 = 0).
 * Lines from bottom to top: E4 (4), G4 (7), B4 (11), D5 (14), F5 (17).
 * Note: these are NOT evenly spaced in chromatic half-steps (gaps: 3, 4, 3, 3)
 * because the treble staff lines follow diatonic spacing.
 */
export const TREBLE_STAFF_LINES: readonly number[] = [4, 7, 11, 14, 17];

/** Bottom staff line in steps (E4 = 4 half-steps above C4). */
export const STAFF_BOTTOM: number = 4;

/** Top staff line in steps (F5 = 17 half-steps above C4). */
export const STAFF_TOP: number = 17;

// ──────────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Treble-clef staff coordinate for a single note.
 * `steps` is a chromatic measure (one unit = one semitone from C4), not a
 * diatonic staff-position count. The rendering layer maps steps → y-pixels.
 */
export interface StaffPosition {
  /** Chromatic half-steps from C4 (C4 = 0, G4 = 7, G3 = -5). */
  steps: number;
  /** Sharp accidental symbol; '' for natural notes. Flat input is normalised. */
  accidental: '' | '#';
  /**
   * Steps values where ledger lines must be drawn.
   * For notes below STAFF_BOTTOM: positions at STAFF_BOTTOM-2, STAFF_BOTTOM-4, …
   * down to (and including) the note if it sits on an even position, or to the
   * nearest even position above the note if it sits on an odd position.
   * For notes above STAFF_TOP: positions at STAFF_TOP+2, … up to the note.
   * For notes on the staff: empty array.
   */
  ledgerLines: number[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Semitone value within an octave for each diatonic letter name. */
const LETTER_SEMITONE: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * Compute the ledger-line positions for a note outside the treble staff.
 *
 * Algorithm (chromatic approximation, per phase spec):
 * - Below staff (steps < STAFF_BOTTOM):
 *   Ledger lines are placed at every-2-step position from STAFF_BOTTOM-2
 *   downward, stopping at the note's position (inclusive if the note is on
 *   an even-step position, stopping one above if the note is in a space).
 *   Formula: include k where k = STAFF_BOTTOM-2, STAFF_BOTTOM-4, …, and k >= steps.
 * - Above staff (steps > STAFF_TOP):
 *   Ledger lines are placed at every-2-step position from STAFF_TOP+2 upward,
 *   stopping at or just above the note.
 *   Formula: include k where k = STAFF_TOP+2, STAFF_TOP+4, …, and k <= steps+1.
 * - On the staff (STAFF_BOTTOM <= steps <= STAFF_TOP): no ledger lines.
 *
 * Note: this is a rendering abstraction using chromatic steps, not strict
 * diatonic notation spacing. The rendering layer (Phase 07) draws one ledger
 * line per entry. Visual correctness is a Phase 07 concern.
 */
function computeLedgerLines(steps: number): number[] {
  const ledgerLines: number[] = [];

  if (steps < STAFF_BOTTOM) {
    // Below staff: place ledger lines from STAFF_BOTTOM-2 downward.
    for (let k = STAFF_BOTTOM - 2; k >= steps; k -= 2) {
      ledgerLines.push(k);
    }
  } else if (steps > STAFF_TOP) {
    // Above staff: place ledger lines from STAFF_TOP+2 upward.
    for (let k = STAFF_TOP + 2; k <= steps + 1; k += 2) {
      ledgerLines.push(k);
    }
  }
  // On the staff: ledgerLines remains empty.

  return ledgerLines;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Map a note name string to a treble-clef staff coordinate.
 *
 * Input format: note name with octave, produced by chordVoicing / VoiceEvent.noteName:
 *   - Natural: 'C4', 'G3', 'B4'
 *   - Sharp:   'C#4', 'F#3', 'A#3'
 *   - Flat:    'Bb3', 'Eb4' (robustness only — not a production path per ADR 0011 §4)
 *
 * Prototype parity: the note-name format matches NOTE_NAMES from
 * src/core/theory/pitch.ts (reference/orbifold.html line 592), which uses
 * sharp spellings only. The `accidental` field is '#' or '' for all production
 * voicings produced by chordVoicing.
 *
 * @param noteName  Note name string with octave (e.g. 'G3', 'C#4', 'Bb3').
 * @returns         StaffPosition with steps (chromatic from C4), accidental,
 *                  and ledger-line positions.
 */
export function noteToStaffPosition(noteName: string): StaffPosition {
  // Parse: letter (A–G), optional accidental (# or b), octave integer.
  const match = noteName.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`staff-map: cannot parse note name "${noteName}"`);
  }

  const letter = match[1];
  const accidentalChar = match[2]; // '#', 'b', or ''
  const octave = parseInt(match[3], 10);

  const letterSemitone = LETTER_SEMITONE[letter];
  const accidentalOffset = accidentalChar === '#' ? 1 : accidentalChar === 'b' ? -1 : 0;

  // MIDI number: (octave + 1) * 12 + letter semitone + accidental offset
  // Derivation: C4 = MIDI 60 = (4 + 1) * 12 + 0 = 60. ✓
  const midiNumber = (octave + 1) * 12 + letterSemitone + accidentalOffset;

  // Steps = chromatic distance from C4 (MIDI 60).
  const steps = midiNumber - 60;

  // Accidental output: '#' for sharps only. Flat input is normalised to
  // accidental: '' (the steps value already encodes the enharmonic pitch).
  const accidental: '' | '#' = accidentalChar === '#' ? '#' : '';

  const ledgerLines = computeLedgerLines(steps);

  return { steps, accidental, ledgerLines };
}
