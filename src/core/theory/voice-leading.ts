// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — minimalVoiceLeading, circDelta (shortest path in the orbifold).
// Ported from reference/orbifold.html lines 777–789.

/**
 * Signed semitone distance from pitch class `a` to pitch class `b`,
 * in the range `[-6, 6)`.
 * Formula: `((b - a + 18) % 12) - 6`.
 * Prototype lines 777–779.
 */
export function circDelta(a: number, b: number): number {
  return ((b - a + 18) % 12) - 6;
}

/** All 6 permutations of three indices. Internal helper; not exported. */
function perms3(): [number, number, number][] {
  return [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
}

/** Result of minimalVoiceLeading: the optimal voice moves plus their total size. */
export interface VoiceLeadingResult {
  /** Signed semitone move for each voice: [v1, v2, v3]. */
  moves: [number, number, number];
  /** Total voice-leading size: Σ|moves|. */
  size: number;
  /** Permutation of pcsB that achieved the minimum. */
  perm: [number, number, number];
}

/**
 * Find the minimal voice-leading path from triad `pcsA` to triad `pcsB`.
 * Tries all 6 permutations of `pcsB`; picks the one minimising Σ|circDelta|.
 * Prototype lines 781–789.
 */
export function minimalVoiceLeading(
  pcsA: [number, number, number],
  pcsB: [number, number, number]
): VoiceLeadingResult {
  // Seed with the first permutation so best is always defined.
  const allPerms = perms3();
  const first = allPerms[0];
  const firstMoves: [number, number, number] = [
    circDelta(pcsA[0], pcsB[first[0]]),
    circDelta(pcsA[1], pcsB[first[1]]),
    circDelta(pcsA[2], pcsB[first[2]]),
  ];
  let best: VoiceLeadingResult = {
    moves: firstMoves,
    size: Math.abs(firstMoves[0]) + Math.abs(firstMoves[1]) + Math.abs(firstMoves[2]),
    perm: first,
  };

  for (let i = 1; i < allPerms.length; i++) {
    const p = allPerms[i];
    const moves: [number, number, number] = [
      circDelta(pcsA[0], pcsB[p[0]]),
      circDelta(pcsA[1], pcsB[p[1]]),
      circDelta(pcsA[2], pcsB[p[2]]),
    ];
    const size = Math.abs(moves[0]) + Math.abs(moves[1]) + Math.abs(moves[2]);
    if (size < best.size) {
      best = { moves, size, perm: p };
    }
  }
  return best;
}
