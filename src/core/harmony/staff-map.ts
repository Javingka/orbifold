// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — staff-map: maps note names to treble-clef staff coordinates.
// Input format: note names produced by chordVoicing / VoiceEvent.noteName
// (e.g. 'C3', 'E3', 'G3', 'C#4'). Sharp-only for production voicings (ADR 0011
// Consequence 4); flat input is handled gracefully for robustness.
// No DOM, PIXI, or Svelte imports — pure TypeScript (ADR 0011 Consequence 1).
// Prototype parity: NOTE_NAMES from src/core/theory/pitch.ts (ported from
// reference/orbifold.html line 592) provides the sharp-only spellings received here.
//
// Diatonic coordinate system (vigent rule, docs/orbifold-v2/decisions.md):
// `steps` is a DIATONIC integer — one unit per letter-name. C4 = 0. Each octave
// = ±7 diatonic steps. Accidentals (#/b) do NOT change `steps`. This ensures
// equidistant staff lines and correct sharp placement per ADR 0011 D3.

// ──────────────────────────────────────────────────────────────────────────────
// Staff constants (exported for the rendering layer)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Treble staff lines in diatonic steps (C4 = 0, one unit per letter-name).
 * Lines from bottom to top: E4 (2), G4 (4), B4 (6), D5 (8), F5 (10).
 * Lines are equidistant (every 2 diatonic steps) in this coordinate system.
 */
export const TREBLE_STAFF_LINES: readonly number[] = [2, 4, 6, 8, 10];

/** Bottom staff line in diatonic steps (E4 = 2). */
export const STAFF_BOTTOM: number = 2;

/** Top staff line in diatonic steps (F5 = 10). */
export const STAFF_TOP: number = 10;

// ──────────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Treble-clef staff coordinate for a single note.
 * `steps` is a diatonic position: C4 = 0, one unit per letter-name, ±7 per
 * octave. Accidentals are a separate flag and do NOT change `steps`.
 * The rendering layer maps steps → y-pixels (each step = half a staff space).
 */
export interface StaffPosition {
  /**
   * Diatonic steps from C4 (C4 = 0, D4 = 1, E4 = 2, … B4 = 6, C5 = 7).
   * One unit per letter-name. ±7 per octave. Accidentals do NOT change this.
   */
  steps: number;
  /** Sharp accidental symbol; '' for natural notes and flat inputs. */
  accidental: '' | '#';
  /**
   * Diatonic steps values where ledger lines must be drawn.
   * Below staff: positions at 0, -2, -4, … down to (and including) the note's
   * diatonic step if it falls on an even position, or one above if in a space.
   * Above staff: positions at 12, 14, … up to the note.
   * On the staff (STAFF_BOTTOM ≤ steps ≤ STAFF_TOP): empty array.
   */
  ledgerLines: number[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Diatonic pitch class (0–6) for each letter name.
 * C=0, D=1, E=2, F=3, G=4, A=5, B=6.
 * These correspond to the 7 diatonic positions within one octave.
 */
const DIATONIC_PC: Readonly<Record<string, number>> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

/**
 * Convert a note-name string to a diatonic steps value (C4 = 0).
 *
 * Algorithm:
 *   diatonicPc = DIATONIC_PC[letter]    (0–6)
 *   steps = diatonicPc + (octave − 4) × 7
 *
 * Accidentals (#, b) are parsed but do NOT affect steps.
 *
 * Examples:
 *   C4 → 0 + 0 = 0
 *   G4 → 4 + 0 = 4
 *   F#3 → 3 + (3−4)×7 = 3 − 7 = −4  (same as F3)
 *   C3 → 0 + (3−4)×7 = −7
 *   A5 → 5 + (5−4)×7 = 12
 *   B2 → 6 + (2−4)×7 = 6 − 14 = −8
 */
function noteToSteps(noteName: string): number {
  const match = noteName.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`staff-map: cannot parse note name "${noteName}"`);
  }
  const letter = match[1];
  const octave = parseInt(match[3], 10);
  const diatonicPc = DIATONIC_PC[letter];
  return diatonicPc + (octave - 4) * 7;
}

/**
 * Compute the ledger-line positions for a note outside the treble staff.
 *
 * Below-staff walk (steps < STAFF_BOTTOM):
 *   Start at k = STAFF_BOTTOM − 2 = 0; decrement by 2 while k >= steps.
 *   A note ON a ledger-line position is included (≥, not >).
 *   A note in a space (odd steps) gets the ledger lines walked to above it.
 *
 * Above-staff walk (steps > STAFF_TOP):
 *   Start at k = STAFF_TOP + 2 = 12; increment by 2 while k <= steps.
 *   Notes in a space above the staff get no entry for their own position.
 *
 * On-staff (STAFF_BOTTOM ≤ steps ≤ STAFF_TOP): empty.
 */
function computeLedgerLines(steps: number): number[] {
  const ledgerLines: number[] = [];

  if (steps < STAFF_BOTTOM) {
    // Below staff: walk down from k=0 by 2s.
    for (let k = STAFF_BOTTOM - 2; k >= steps; k -= 2) {
      ledgerLines.push(k);
    }
  } else if (steps > STAFF_TOP) {
    // Above staff: walk up from k=12 by 2s.
    for (let k = STAFF_TOP + 2; k <= steps; k += 2) {
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
 * Diatonic coordinate: `steps` is one unit per letter-name (C4=0, D4=1, …),
 * not semitones. Flat input is handled gracefully: accidental is '' and steps
 * uses the natural-letter diatonic position of the flat's letter name.
 *
 * @param noteName  Note name string with octave (e.g. 'G3', 'C#4', 'Bb3').
 * @returns         StaffPosition with diatonic steps, accidental flag,
 *                  and ledger-line diatonic positions.
 */
export function noteToStaffPosition(noteName: string): StaffPosition {
  const steps = noteToSteps(noteName);

  // Accidental: '#' for sharps only. Flat input normalised to '' (the steps
  // value already encodes the natural-letter position of the note).
  const accidental: '' | '#' = noteName.includes('#') ? '#' : '';

  const ledgerLines = computeLedgerLines(steps);

  return { steps, accidental, ledgerLines };
}
