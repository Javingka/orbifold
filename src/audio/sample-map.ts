// SPDX-License-Identifier: AGPL-3.0-only
// Pure helper — no browser API, no Strudel imports.
// Extracted so that unit tests can import this without pulling in @strudel/web
// (which requires a browser environment).

/**
 * Pure helper: builds the sample-name → URL-array map for the local
 * FreePats CC0 samples committed to public/samples/.
 *
 * Extracted as a standalone module to allow unit testing without Vite injection
 * or Web Audio API. `initAudio()` in strudel.ts calls this with
 * `import.meta.env.BASE_URL`. The returned object is passed directly to
 * `samples()`.
 *
 * No genre knowledge in this function — palette names only (`conga`, `cajon`,
 * `wood`). See ADR 0025 D3 and Phase 04 inventory §3.
 *
 * @param base - The application base URL (e.g. '/orbifold/' in production,
 *               '/' in Vite dev server). Trailing slash is normalised
 *               automatically.
 */
export function buildSampleMap(base: string): Record<string, string[]> {
  const b = base.endsWith('/') ? base : base + '/';
  return {
    conga: ['conga_0', 'conga_1', 'conga_2', 'conga_3'].map((f) => `${b}samples/${f}.ogg`),
    cajon: ['cajon_0', 'cajon_1', 'cajon_2', 'cajon_3'].map((f) => `${b}samples/${f}.ogg`),
    wood: ['wood_0', 'wood_1', 'wood_2', 'wood_3'].map((f) => `${b}samples/${f}.ogg`),
    // Phase 05: FreePats EggShaker (CC0) — 4 fast-attack samples for round-robin variety.
    // Palette name only; genre assignment lives in src/core/music-knowledge/ (AG-D1).
    shaker: ['shaker_0', 'shaker_1', 'shaker_2', 'shaker_3'].map((f) => `${b}samples/${f}.ogg`),
  };
}
