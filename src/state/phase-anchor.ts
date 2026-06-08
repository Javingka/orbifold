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

/** Re-anchor visual phase to now (called when Strudel pattern (re)starts). */
export function anchorVisualPhase(): void {
  _anchorMs = performance.now();
}
