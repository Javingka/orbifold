// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — QUAL_INTERVALS, triadQuality, chordLabel, voicing.
// Ported from reference/orbifold.html lines 703–710, 742–757.
// song-import Phase 01 step 01.2: 'pow' quality added (root + perfect fifth, no third).

import { NOTE_NAMES } from './pitch.js';

/**
 * The five chord qualities the engine recognises.
 * song-import Phase 01: 'pow' (power chord = root + fifth, no third) added as the fifth member.
 */
export type Quality = 'maj' | 'min' | 'dim' | 'aug' | 'pow';

/**
 * Semitone intervals above the root for each quality.
 * Prototype line 742.
 * 'pow': [0, 7] = root + perfect fifth; no third. Returns a 2-element array for power chords.
 * Callers that assume exactly 3 elements must guard on qual === 'pow'
 * (documented in song-import/inventories/phase-01-inventory.md §b).
 */
export const QUAL_INTERVALS: Record<Quality, readonly number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  pow: [0, 7], // root + perfect fifth; no third — song-import Phase 01
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
 * Human-readable label for a chord (e.g., "Cm", "F#", "B°", "D+", "E5").
 * Prototype lines 743–745.
 * song-import Phase 01: 'pow' arm returns "<root>5" convention (e.g., "E5" for E power chord).
 */
export function chordLabel(rootPc: number, qual: Quality): string {
  if (qual === 'pow') return NOTE_NAMES[rootPc] + '5';
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
