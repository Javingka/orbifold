// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — shared visual phase anchor for rhythm/harmony playheads.
//
// Prototype: `sessionStart` global reset inside runNow() after evaluate succeeds
// (reference/orbifold.html lines 616, 623). NOT reset on setNowPlaying.

let _anchorMs = performance.now();

/** Milliseconds since epoch used as t=0 for bar-phase playhead math. */
export function getVisualPhaseAnchor(): number {
  return _anchorMs;
}

/**
 * Re-anchor visual phase to now, optionally shifted back by `offsetMs`
 * milliseconds (called when Strudel pattern (re)starts).
 *
 * Subtracting `offsetMs` moves the anchor into the past, which increases
 * `performance.now() - _anchorMs`, making the computed visual phase appear
 * further along — matching the delayed audio output.
 *
 * Sign check: if `offsetMs = 100` (audio heard 100 ms after scheduling),
 * the anchor is set 100 ms in the past. After 100 ms of real time,
 * `performance.now() - _anchorMs` equals what it would have been at t=0
 * under zero latency — visuals now align with audible output.
 *
 * Note: Scheduler lookahead (`_scheduler.latency`, default 100 ms) is
 * intentionally excluded. The lookahead shifts audio events uniformly forward
 * on the audio clock but does NOT contribute to the human-audible output
 * delay. Including it would over-compensate by ~100 ms and invert the bug.
 * Only the hardware path (`outputLatency + baseLatency`) belongs here.
 */
export function anchorVisualPhase(offsetMs = 0): void {
  _anchorMs = performance.now() - offsetMs;
}

/**
 * Compute the hardware audible-output offset in milliseconds from an
 * AudioContext instance.
 *
 * Returns `(outputLatency + baseLatency) * 1000` where both properties are
 * guarded with `|| 0` for platforms that omit them (e.g. some Safari
 * versions do not expose `outputLatency`).
 *
 * This is a pure function — no side effects, no module state. It is
 * co-located with the phase anchor because `measureLatencyOffsetMs` and
 * `anchorVisualPhase` are always used together: the caller measures the
 * offset and immediately passes it to the anchor.
 *
 * Scheduler lookahead is excluded: see JSDoc on `anchorVisualPhase`.
 */
export function measureLatencyOffsetMs(ctx: AudioContext): number {
  return ((ctx.outputLatency || 0) + (ctx.baseLatency || 0)) * 1000;
}
