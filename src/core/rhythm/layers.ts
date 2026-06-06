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
  /** 0/1 step array (length = RSTEPS = 16 by default). */
  steps: number[];
  /** Compact euclidean string, e.g. `"5,8"` or `"3,8,2"`. Present only
   *  when the layer is in euclidean mode. */
  euclid?: string;
  /** When true, this layer is suppressed. */
  muted?: boolean;
  /** When true, only soloed layers play (at least one in the array). */
  solo?: boolean;
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
 * Ported from the per-layer body of `rhythmLayerLines` (prototype lines
 * 826–830):
 *   - Euclidean mode: `  s("<sound>(<euclid>)")`
 *   - Explicit-steps mode: `  s("<tok0> <tok1> …")` where each token is the
 *     sound name (hit) or `~` (rest).
 *
 * The caller (e.g. `rhythmToStrudel`) is responsible for audibility
 * filtering before calling this function.
 */
export function rhythmLayerToStrudelLine(layer: RhythmLayer): string {
  const { sound, euclid, steps } = layer;
  if (euclid) {
    return `  s("${sound}(${euclid})")`;
  }
  const tokens = steps.map((v) => (v ? sound : '~'));
  return `  s("${tokens.join(' ')}")`;
}
