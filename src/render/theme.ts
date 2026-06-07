// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — design tokens: tonal-function colors, fonts.
// Pure constants — no imports from PIXI, DOM, or Svelte.
// Prototype source: reference/orbifold.html lines 882–884, CSS lines 33–36.

/**
 * Hex color palette shared by all render scenes.
 * Values map 1:1 to the prototype's `COL` constant (lines 882–883).
 */
export const COL = {
  node: 0xcfd6e6,
  faint: 0x39404f,
  line: 0x232734,
  accent: 0x8aa0ff,
  tonic: 0xf3b15a, // = CSS --tonic  (line 33)
  subdom: 0x56cfc4, // = CSS --subdom (line 34)
  dom: 0xe87bac, // = CSS --dom    (line 35)
  bg: 0x0b0d12,
} as const;

/**
 * Tonal-function → hex color map.
 * Used by triangle fill logic to look up color by `func.cls` string.
 * Prototype: line 884 — `const FUNC_COL = { tonic:COL.tonic, subdom:COL.subdom, dom:COL.dom }`.
 */
export const FUNC_COL: Record<string, number> = {
  tonic: COL.tonic,
  subdom: COL.subdom,
  dom: COL.dom,
};

/** Serif display font — Fraunces. Used for Tonnetz node labels and BPM center label. */
export const FONT_SERIF = 'Fraunces, serif';

/** Sans-serif UI font — Albert Sans. Used for P·L·R labels and general UI text. */
export const FONT_SANS = 'Albert Sans, sans-serif';

/** Monospace code/rhythm font — IBM Plex Mono. Used for layer sound labels and subtitles. */
export const FONT_MONO = 'IBM Plex Mono, monospace';
