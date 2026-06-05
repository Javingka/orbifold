// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — NOTE_NAMES, pitch-class helpers, noteToPc.
// Ported from reference/orbifold.html lines 592–593, 1674–1681.

/**
 * Chromatic pitch class names (semitone 0–11, sharp spellings).
 * Prototype line 592.
 */
export const NOTE_NAMES: readonly string[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

/**
 * Lowercase equivalents of NOTE_NAMES.
 * Prototype line 593.
 */
export const NOTE_LOWER: readonly string[] = [
  'c',
  'c#',
  'd',
  'd#',
  'e',
  'f',
  'f#',
  'g',
  'g#',
  'a',
  'a#',
  'b',
];

/**
 * Convert a note name or MIDI pitch class number to a pitch class (0–11).
 * Returns null for unrecognised strings.
 * Handles `#`, `b`, `♯`, `♭` accidentals.
 * Prototype lines 1674–1681.
 */
export function noteToPc(name: string | number): number | null {
  if (typeof name === 'number') return ((name % 12) + 12) % 12;
  const m = String(name)
    .trim()
    .match(/^([A-Ga-g])([#b♯♭]?)/);
  if (!m) return null;
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const pc = base[m[1].toUpperCase()];
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0;
  return (((pc + acc) % 12) + 12) % 12;
}
