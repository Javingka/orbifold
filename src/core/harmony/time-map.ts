// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — time-map: maps cycle positions to rendering coordinates.
// Supports two modes:
//   'linear'  — pixel x from the left edge of the timeline (PX_PER_CYCLE * cycleIndex)
//   'orbital' — radian angle with 0 at the top (12 o'clock), clockwise
//               ((cycleIndex / totalCycles) * 2π − π/2)
// The -π/2 offset matches the convention used in src/render/rhythm-scene.ts
// (line 403: ang = -Math.PI / 2 + phase * Math.PI * 2).
// PX_PER_CYCLE = 48 must match ProgressionStrip.svelte (ADR 0011 Consequence 3).
// No DOM, PIXI, or Svelte imports — pure TypeScript (ADR 0011 Consequence 1).

// ──────────────────────────────────────────────────────────────────────────────
// Types (exported for the rendering layer)
// ──────────────────────────────────────────────────────────────────────────────

/** A rendering position in linear (staff) mode. */
export interface LinearPosition {
  mode: 'linear';
  /** Pixels from the left edge of the timeline. */
  x: number;
}

/** A rendering position in orbital (ring) mode. */
export interface OrbitalPosition {
  mode: 'orbital';
  /** Radians; 0 = top (12 o'clock), clockwise. */
  angle: number;
}

/** Discriminated union of the two rendering coordinate types. */
export type TimePosition = LinearPosition | OrbitalPosition;

// ──────────────────────────────────────────────────────────────────────────────
// Constants (exported — coordination point with ProgressionStrip.svelte)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Pixels per Strudel cycle (1 cycle = 1 bar of 4/4).
 * Must stay in sync with the PX_PER_CYCLE constant in
 * src/ui/ProgressionStrip.svelte (ADR 0011 Consequence 3).
 */
export const PX_PER_CYCLE = 48;

// ──────────────────────────────────────────────────────────────────────────────
// cycleToPosition — overloaded for type-safe mode discrimination
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Maps a floating-point cycle index to a linear pixel position.
 *
 * @param cycleIndex  - Cycle offset from the start of the progression (may be fractional).
 * @param totalCycles - Total duration of the progression in cycles (unused in linear mode;
 *                      present for API uniformity). Passed as `void` to satisfy lint.
 * @param mode        - `'linear'`
 * @returns `{ mode: 'linear', x: cycleIndex * PX_PER_CYCLE }`
 */
export function cycleToPosition(
  cycleIndex: number,
  totalCycles: number,
  mode: 'linear'
): LinearPosition;

/**
 * Maps a floating-point cycle index to an orbital angle.
 *
 * @param cycleIndex  - Cycle offset from the start of the progression (may be fractional).
 * @param totalCycles - Total duration of the progression in cycles (the denominator).
 *                      If 0, returns the 12 o'clock default (−π/2) to avoid NaN.
 * @param mode        - `'orbital'`
 * @returns `{ mode: 'orbital', angle: (cycleIndex / totalCycles) * 2π − π/2 }`
 */
export function cycleToPosition(
  cycleIndex: number,
  totalCycles: number,
  mode: 'orbital'
): OrbitalPosition;

/**
 * Maps a floating-point cycle index to a rendering coordinate.
 *
 * @param cycleIndex  - Cycle offset from the start of the progression.
 * @param totalCycles - Total progression duration in cycles (denominator for orbital mode).
 * @param mode        - `'linear'` or `'orbital'`
 */
export function cycleToPosition(
  cycleIndex: number,
  totalCycles: number,
  mode: 'linear' | 'orbital'
): TimePosition;

// Single implementation covering all overload signatures.
export function cycleToPosition(
  cycleIndex: number,
  totalCycles: number,
  mode: 'linear' | 'orbital'
): TimePosition {
  if (mode === 'linear') {
    // totalCycles is not used in linear mode. Suppress unused-parameter lint without
    // a suppression comment: reading it as void satisfies the linter.
    void totalCycles;
    return { mode: 'linear', x: cycleIndex * PX_PER_CYCLE };
  }

  // Orbital mode.
  // Guard against division by zero: return the 12 o'clock default when totalCycles = 0.
  const angle =
    totalCycles === 0 ? -Math.PI / 2 : (cycleIndex / totalCycles) * 2 * Math.PI - Math.PI / 2;

  return { mode: 'orbital', angle };
}
