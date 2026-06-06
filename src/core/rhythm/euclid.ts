// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Bjorklund algorithm, rotate utility for Euclidean rhythms.
// Ported from reference/orbifold.html lines 794–813.

/** Default step resolution — 16 steps per bar. */
export const RSTEPS = 16;

/**
 * Bjorklund's algorithm: distribute k hits across n steps as evenly as
 * possible. Returns an array of length n with values 0 or 1.
 *
 * Edge cases:
 *   k=0 → n zeros
 *   k=n → n ones
 *   else → Bjorklund distribution
 *
 * Ported exactly from prototype lines 796–811.
 */
export function bjorklund(k: number, n: number): number[] {
  k = Math.max(0, Math.min(n, k));
  if (k === 0) return new Array(n).fill(0) as number[];
  if (k === n) return new Array(n).fill(1) as number[];
  let a: number[][] = [];
  let b: number[][] = [];
  for (let i = 0; i < k; i++) a.push([1]);
  for (let i = 0; i < n - k; i++) b.push([0]);
  while (b.length > 1) {
    const m = Math.min(a.length, b.length);
    const na: number[][] = [];
    const nb: number[][] = [];
    for (let i = 0; i < m; i++) na.push(a[i].concat(b[i]));
    if (a.length > m) {
      for (let i = m; i < a.length; i++) nb.push(a[i]);
    } else {
      for (let i = m; i < b.length; i++) nb.push(b[i]);
    }
    a = na;
    b = nb;
  }
  return a.concat(b).flat();
}

/**
 * Rotate an array left by r positions.
 * Uses `((r % len) + len) % len` normalisation to handle negative r
 * and r ≥ arr.length.
 *
 * Ported exactly from prototype line 812.
 */
export function rotate(arr: readonly number[], r: number): number[] {
  const len = arr.length;
  r = ((r % len) + len) % len;
  return (arr.slice(r) as number[]).concat(arr.slice(0, r) as number[]);
}

/**
 * Build a step array from an array of hit positions.
 * Returns a `totalSteps`-length array of 0/1 values.
 * Hit indices outside [0, totalSteps) are ignored.
 *
 * Ported from prototype line 813, with RSTEPS inlined as an explicit
 * parameter (defaulting to RSTEPS = 16).
 */
export function stepsFromHits(hits: number[], totalSteps: number = RSTEPS): number[] {
  const s: number[] = new Array(totalSteps).fill(0);
  hits.forEach((h) => {
    if (h >= 0 && h < totalSteps) s[h] = 1;
  });
  return s;
}
