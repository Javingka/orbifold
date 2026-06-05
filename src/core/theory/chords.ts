// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — QUAL_INTERVALS, triadQuality, chordLabel, voicing.
// Ported from reference/orbifold.html lines 703–710, 742–757.

import { NOTE_NAMES } from './pitch.js';

/** The four triad qualities the engine recognises. */
export type Quality = 'maj' | 'min' | 'dim' | 'aug';

/**
 * Semitone intervals above the root for each quality.
 * Prototype line 742.
 */
export const QUAL_INTERVALS: Record<Quality, readonly number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
};

/**
 * Classify a triad from its three absolute (not pitch-class) pitches.
 * `abs` is a 3-element array where abs[0] is the root semitone.
 * Returns `'?'` for unrecognised interval structures.
 * Prototype lines 703–710.
 */
export function triadQuality(abs: [number, number, number]): Quality | '?' {
  const t3 = (abs[1] - abs[0] + 12) % 12;
  const t5 = (abs[2] - abs[0] + 12) % 12;
  if (t3 === 4 && t5 === 7) return 'maj';
  if (t3 === 3 && t5 === 7) return 'min';
  if (t3 === 3 && t5 === 6) return 'dim';
  if (t3 === 4 && t5 === 8) return 'aug';
  return '?';
}

/**
 * Human-readable label for a chord (e.g., "Cm", "F#", "B°", "D+").
 * Prototype lines 743–745.
 */
export function chordLabel(rootPc: number, qual: Quality): string {
  return (
    NOTE_NAMES[rootPc] + (qual === 'min' ? 'm' : qual === 'dim' ? '°' : qual === 'aug' ? '+' : '')
  );
}

/**
 * Pitch classes of a triad's three voices (root, 3rd, 5th), mod 12.
 * Prototype lines 746–748.
 */
export function chordPcs(rootPc: number, qual: Quality): number[] {
  return QUAL_INTERVALS[qual].map((iv) => (rootPc + iv) % 12);
}

/**
 * Root-position voicing of a triad, ascending, in scientific notation.
 * `octave` is a required explicit parameter — there is no global fallback.
 * Octave wraps when (rootPc + iv) ≥ 12 (e.g., A3, C4, E4 for A min at octave 3).
 * Prototype lines 749–757 (with global fallback removed per OD-6 resolution).
 */
export function chordVoicing(rootPc: number, qual: Quality, octave: number): string[] {
  return QUAL_INTERVALS[qual].map((iv) => {
    const pc = (rootPc + iv) % 12;
    const o = octave + Math.floor((rootPc + iv) / 12);
    return NOTE_NAMES[pc] + o;
  });
}
