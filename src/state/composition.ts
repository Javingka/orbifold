// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — composition timing state: ephemeral playhead state for the DAW
//             composition drawer. NOT serialized / NOT in the Svelte store.
//             Pattern: one timing module per ephemeral concern (consistent
//             with src/state/hud.ts). Resolved as OD-2 before step 05.2.
//
// Prototype reference: reference/orbifold.html line 590:
//   let compRAF=null, compStart=0, compState='stopped', compPausedBars=0;
// compPos(): prototype lines 2067–2072.

/**
 * Pixels per bar (grid unit). 48 px per bar at default zoom.
 *
 * Prototype reference: `const PPB=48;` (line 1934).
 * Exported so `CompositionDrawer.svelte` can compute block widths and
 * playhead position without duplicating the constant.
 */
export const PPB = 48;

// ── Module-level timing state ─────────────────────────────────────────────
// These are intentionally NOT in the Svelte store — they are ephemeral timing
// values that change at 60 fps and would cause excessive re-renders if stored
// reactively. The rAF loop in CompositionDrawer.svelte reads them each frame.

type CompState = 'stopped' | 'playing' | 'paused';

/** Current playback state. Prototype: `compState` (line 590). */
let _compState: CompState = 'stopped';

/**
 * `performance.now()` timestamp when composition playback started (or was
 * adjusted for a resume-from-pause). Prototype: `compStart` (line 590).
 */
let _compStart = 0;

/**
 * Bar position at which playback was paused.
 * Prototype: `compPausedBars` (line 590).
 */
let _compPausedBars = 0;

// ── Getters ───────────────────────────────────────────────────────────────

/** Return the current composition playback state. */
export function getCompState(): CompState {
  return _compState;
}

/**
 * Return the bar position at which playback was last paused.
 *
 * Used by `playComposition()` in `session.ts` to compute the adjusted
 * `compStart` timestamp for resume-from-pause.
 *
 * Prototype: `compPausedBars` (line 590), used directly at line 2099.
 */
export function getCompPausedBars(): number {
  return _compPausedBars;
}

// ── Setters ───────────────────────────────────────────────────────────────

/**
 * Transition to the 'playing' state, recording the adjusted start timestamp.
 *
 * The caller computes `start` as either:
 *   - `performance.now()` for a fresh start.
 *   - `performance.now() - compPausedBars * (240000 / bpm)` for a resume.
 *
 * Prototype: `compState='playing'` (line 2102); `compStart=…` (lines 2098–2100).
 *
 * @param start - Adjusted `performance.now()` timestamp for the start of
 *                this playback segment.
 */
export function setCompPlaying(start: number): void {
  _compState = 'playing';
  _compStart = start;
}

/**
 * Transition to the 'paused' state, saving the bar position.
 *
 * Prototype: `compState='paused'` (line 2108); `compPausedBars=compPos().pos` (line 2106).
 *
 * @param bars - The bar position at which playback is frozen.
 */
export function setCompPaused(bars: number): void {
  _compState = 'paused';
  _compPausedBars = bars;
}

/**
 * Transition to the 'stopped' state and reset bar position to 0.
 *
 * Prototype: `compState='stopped'; compPausedBars=0;` (line 2114).
 */
export function setCompStopped(): void {
  _compState = 'stopped';
  _compPausedBars = 0;
}

// ── Playhead position ─────────────────────────────────────────────────────

/**
 * Compute the current playhead position in bars.
 *
 * Formula (prototype lines 2067–2072):
 *   `barsElapsed = ((performance.now() - compStart) / 1000) * (bpm / 240)`
 *   `pos = barsElapsed % totalBars`
 *
 * Consistent with the `setcps(bpm/240)` invariant in CLAUDE.md:
 *   1 Strudel cycle = 1 bar of 4/4, cycle rate = bpm/240 Hz,
 *   so bars per second = bpm/240.
 *
 * When `compState === 'paused'`: returns `compPausedBars % totalBars`.
 * When `compState === 'stopped'`: returns `{ tb: totalBars, pos: 0 }`.
 *
 * The `totalBars` parameter is supplied by the caller
 * (`CompositionDrawer.svelte` derives it reactively from the store).
 *
 * Prototype: `function compPos()` (lines 2067–2072).
 *
 * @param bpm       - Current BPM from session store.
 * @param totalBars - Total bar count of the composition (longest track sum).
 * @returns `{ tb: totalBars, pos: bar position (0 to totalBars) }`.
 */
export function compPos(bpm: number, totalBars: number): { tb: number; pos: number } {
  const tb = totalBars;
  if (_compState === 'paused') {
    return { tb, pos: tb ? _compPausedBars % tb : 0 };
  }
  if (_compState === 'stopped') {
    return { tb, pos: 0 };
  }
  // playing
  const barsElapsed = ((performance.now() - _compStart) / 1000) * (bpm / 240);
  return { tb, pos: tb ? barsElapsed % tb : 0 };
}
