// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — neo-Riemannian P / L / R transformations (Cohn, Lewin).
// Ported from reference/orbifold.html lines 1238–1249.

import type { Quality } from './chords.js';

/**
 * The three parsimonious neo-Riemannian transformations.
 * Each shares an edge (two common tones) with the source triad;
 * one voice moves 1–2 semitones.
 */
export type NRLabel = 'P' | 'R' | 'L';

/**
 * Identify the neo-Riemannian relationship from one triad to a neighbouring triad.
 *
 * Rules (exact port of prototype lines 1238–1249):
 * - P (Parallel): same root, opposite mode.
 * - For a maj source: R when nbrRoot = (srcRoot+9)%12; L when nbrRoot = (srcRoot+4)%12.
 * - For a min source: R when nbrRoot = (srcRoot+3)%12; L when nbrRoot = (srcRoot+8)%12.
 * - Returns null when both triads have the same mode (P/L/R always change mode)
 *   or when no PLR offset matches.
 *
 * @param srcRoot - Root pitch class of the source triad.
 * @param srcQual - Quality of the source triad ('maj' | 'min' | 'dim' | 'aug').
 * @param nbrRoot - Root pitch class of the neighbouring triad.
 * @param nbrQual - Quality of the neighbouring triad.
 */
export function nrLabel(
  srcRoot: number,
  srcQual: Quality,
  nbrRoot: number,
  nbrQual: Quality
): NRLabel | null {
  if (srcQual === nbrQual) return null; // P/L/R always change mode
  if (nbrRoot === srcRoot) return 'P'; // Parallel: same root, opposite mode
  if (srcQual === 'maj') {
    if (nbrRoot === (srcRoot + 9) % 12) return 'R'; // Relative (C → Am)
    if (nbrRoot === (srcRoot + 4) % 12) return 'L'; // Leading-tone exchange (C → Em)
  } else {
    if (nbrRoot === (srcRoot + 3) % 12) return 'R'; // Relative (Am → C)
    if (nbrRoot === (srcRoot + 8) % 12) return 'L'; // (Am → Ab)
  }
  return null;
}
