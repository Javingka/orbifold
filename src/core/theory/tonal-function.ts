// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — tonal function classification: Tonic / Subdominant / Dominant.
// Ported from reference/orbifold.html lines 711–716.

/** Roman-numeral degree → tonal function label. */
export type TonalFunctionLabel = 'T' | 'SD' | 'D' | '';

/** Full tonal-function descriptor returned by tonalFunction(). */
export interface TonalFunctionInfo {
  f: TonalFunctionLabel;
  label: string;
  cls: 'tonic' | 'subdom' | 'dom' | '';
}

/**
 * Map a diatonic degree (0–6) to its tonal function.
 * Degrees 0, 2, 5 → Tonic; 1, 3 → Subdominant; 4, 6 → Dominant.
 * Prototype lines 711–716.
 */
export function tonalFunction(degree: number): TonalFunctionInfo {
  if ([0, 2, 5].includes(degree)) return { f: 'T', label: 'tónica', cls: 'tonic' };
  if ([1, 3].includes(degree)) return { f: 'SD', label: 'subdominante', cls: 'subdom' };
  if ([4, 6].includes(degree)) return { f: 'D', label: 'dominante', cls: 'dom' };
  return { f: '', label: '', cls: '' };
}
