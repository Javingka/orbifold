// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — rhythm layer model: audible / solo / mute.
// Ported from reference/orbifold.html lines 815–836.

/**
 * Drum-machine sound names supported by the app.
 * Matches the prototype's implicit set used in the UI.
 */
export type Sound = 'bd' | 'sd' | 'hh' | 'oh' | 'cp' | 'rim' | 'lt' | 'mt' | 'ht';

/**
 * A single rhythm layer: a named drum sound with either explicit per-step
 * values or a compact euclidean string (`k,n` or `k,n,r`).
 *
 * `steps` is always present (even when `euclid` is set) because the UI
 * can toggle between modes; the render layer uses whichever field is active.
 */
export interface RhythmLayer {
  sound: Sound;
  /** 0/1 step array (length equals the pattern's native step count (between 1 and RSTEPS)). */
  steps: number[];
  /** Compact euclidean string, e.g. `"5,8"` or `"3,8,2"`. Present only
   *  when the layer is in euclidean mode. */
  euclid?: string;
  /**
   * Concrete Strudel sample name realizing this layer's abstract `sound` role
   * (ADR 0025 D1). When present, codegen emits it instead of `sound`.
   * Genre-agnostic — set only by the knowledge-side propagation path.
   */
  strudelSample?: string;
  /** When true, this layer is suppressed. */
  muted?: boolean;
  /** When true, only soloed layers play (at least one in the array). */
  solo?: boolean;
  /**
   * When true, this layer is part of a recipe's cultural signature and must not
   * be replaced by agent rhythm changes. Set by `applyLockedFlags()` after a
   * recipe is applied; cleared when a new recipe replaces all layers.
   *
   * Genre-agnostic plumbing: the flag value is stamped by the recipe-application
   * path (`applyLockedFlags` in apply.ts). The knowledge of WHICH layers to lock
   * lives only in `src/core/music-knowledge/` (RecipeLayer.locked declarations).
   *
   * Per Phase 05 §3 (ADR 0025 extension, additive optional).
   */
  locked?: boolean;
}

/**
 * Whether `layer` should contribute audio to the mix.
 *
 * Ported exactly from prototype lines 820–823 (`layerAudible`):
 *   `!l.muted && (!anySolo || l.solo)`
 *
 * The `allLayers` array replaces the global `rhythmLayers` reference so the
 * function is pure and unit-testable.
 */
export function layerAudible(layer: RhythmLayer, allLayers: RhythmLayer[]): boolean {
  const anySolo = allLayers.some((x) => x.solo);
  return !!(layer.muted !== true && (!anySolo || layer.solo === true));
}

/**
 * Render a single layer as a Strudel pattern line.
 *
 * Runtime layers carry `steps` at their native length (n steps for an n-step pattern),
 * including layers created from Euclidean controls. Emitting those steps keeps Strudel
 * audio aligned with the dots the user sees and toggles. Legacy/test fixtures with no
 * steps fall back to the compact Euclidean mini-notation.
 *
 * The caller (e.g. `rhythmToStrudel`) is responsible for audibility
 * filtering before calling this function.
 */
export function rhythmLayerToStrudelLine(layer: RhythmLayer): string {
  const { sound, euclid, steps } = layer;
  // ADR 0025 D1: strudelSample overrides sound when set
  const sampleName = layer.strudelSample ?? sound;
  if (steps.length === 0 && euclid) {
    return `  s("${sampleName}(${euclid})")`;
  }
  const tokens = steps.map((v) => (v ? sampleName : '~'));
  return `  s("${tokens.join(' ')}")`;
}
