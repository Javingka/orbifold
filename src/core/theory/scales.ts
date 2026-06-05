// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — SCALE_INTERVALS (8 modes), diatonic helpers.
// Ported from reference/orbifold.html lines 697–740.

import { NOTE_NAMES } from './pitch.js';
import { triadQuality, chordLabel, chordPcs, type Quality } from './chords.js';
import { tonalFunction, type TonalFunctionInfo } from './tonal-function.js';

/** The eight modes supported by the engine. */
export type Mode =
  | 'major'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'minor'
  | 'locrian'
  | 'harmonic:minor';

/**
 * Scale intervals (semitones above root) for each of the eight modes.
 * All modes have exactly 7 intervals.
 * Prototype lines 697–701.
 */
export const SCALE_INTERVALS: Record<Mode, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'harmonic:minor': [0, 2, 3, 5, 7, 8, 11],
};

/** Roman numerals for the seven diatonic degrees. Prototype line 702. */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

/** A single diatonic chord entry produced by computeDiatonic(). */
export interface DiatonicChord {
  degree: number;
  rootPc: number;
  qual: Quality | '?';
  roman: string;
  func: TonalFunctionInfo;
}

/**
 * Compute all seven diatonic triads for the given root pitch class and mode.
 * Returns an empty array if the mode has a non-seven-note scale (never happens
 * with the eight supported modes).
 * Pure port: `root` and `mode` are explicit parameters; no global melState.
 * Prototype lines 720–735 (globals replaced by params).
 */
export function computeDiatonic(root: number, mode: Mode): DiatonicChord[] {
  const ints = SCALE_INTERVALS[mode];
  if (ints.length !== 7) return [];
  const out: DiatonicChord[] = [];
  for (let deg = 0; deg < 7; deg++) {
    const abs: [number, number, number] = [
      ints[deg],
      ints[(deg + 2) % 7] + (deg + 2 >= 7 ? 12 : 0),
      ints[(deg + 4) % 7] + (deg + 4 >= 7 ? 12 : 0),
    ];
    const qual = triadQuality(abs);
    const rootPc = (root + ints[deg]) % 12;
    const fn = tonalFunction(deg);
    const romanBase = qual === 'min' || qual === 'dim' ? ROMAN[deg].toLowerCase() : ROMAN[deg];
    const roman = romanBase + (qual === 'dim' ? '°' : '') + (qual === 'aug' ? '+' : '');
    out.push({ degree: deg, rootPc, qual, roman, func: fn });
  }
  return out;
}

/**
 * Build a lookup map keyed by `"rootPc:qual"` (e.g., `"0:maj"`, `"9:min"`).
 * Used by tonnetz.ts to attach diatonic info to Tonnetz triangles.
 * Pure port: root and mode are explicit parameters.
 * Prototype lines 736–740.
 */
export function diatonicLookup(root: number, mode: Mode): Record<string, DiatonicChord> {
  const m: Record<string, DiatonicChord> = {};
  computeDiatonic(root, mode).forEach((d) => {
    m[`${d.rootPc}:${d.qual}`] = d;
  });
  return m;
}

// Re-export for convenience of callers who only import from scales.ts
export type { Quality };
export { NOTE_NAMES, chordLabel, chordPcs };
