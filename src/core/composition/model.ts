// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — composition model: Block, Track, Composition types;
//             stripComments, buildComposition.
// Types from ORBIFOLD_KICKOFF.md §5; logic ported from
// reference/orbifold.html lines 1931–1938, 2054–2065.
// No DOM / PIXI / Svelte imports — pure engine, unit-testable.
//
// Phase 01 step 01.3 (editable-composition): Block extended with optional
// `snapshot?` field per ADR 0020 D2.

import type { BlockSnapshot } from './snapshot.js';

/**
 * A saved pattern block (groove, harmony, or full session).
 * Matches ORBIFOLD_KICKOFF.md §5 `Block` interface exactly.
 *
 * Phase 01 step 01.3 (editable-composition): `snapshot` field added per ADR 0020 D2.
 * `code` is kept as the canonical Strudel playback field (byte-identical-at-default
 * guarantee — `buildComposition` reads only `code`).
 */
export interface Block {
  id: string;
  name: string;
  type: 'groove' | 'armonia' | 'sesion';
  /** Strudel code string for this block. Canonical playback field. */
  code: string;
  /** Duration in bars (1 Strudel cycle = 1 bar of 4/4). */
  bars: number;
  /**
   * Editable-state snapshot captured at save time. Present on blocks created
   * after Phase 01 step 01.3. Absent on legacy blocks (snapshot-less).
   * ADR 0020 D2.
   */
  snapshot?: BlockSnapshot;
}

/**
 * A composition track — a sequence of block references that play in order.
 * Multiple tracks play simultaneously (`stack(...)`).
 * Matches ORBIFOLD_KICKOFF.md §5 `Track` interface exactly.
 */
export interface Track {
  id: string;
  blocks: { blockId: string; bars: number }[];
}

/**
 * The full composition state: a block library and an ordered list of tracks.
 * Matches ORBIFOLD_KICKOFF.md §5 `Composition` interface exactly.
 */
export interface Composition {
  blocks: Block[];
  tracks: Track[];
}

/**
 * Remove lines starting with `//` from a multi-line code string.
 * Used before saving a block so the session header comment is stripped.
 *
 * Ported from prototype lines 1936–1938 exactly.
 */
export function stripComments(code: string): string {
  return code
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n')
    .trim();
}

/** Compute the total bar count (longest track sum) across all tracks. */
function totalBars(blocks: Block[], tracks: Track[]): number {
  let max = 0;
  tracks.forEach((t) => {
    let sum = 0;
    t.blocks.forEach((ref) => {
      const b = blocks.find((x) => x.id === ref.blockId);
      if (b) sum += ref.bars;
    });
    if (sum > max) max = sum;
  });
  return max;
}

/**
 * Build a Strudel composition string from blocks and tracks.
 *
 * Each non-empty track becomes an `arrange([bars, code], …)` expression.
 * Shorter tracks are padded with `[N, silence]` so all tracks realign
 * (prototype invariant; `'silence'` is the literal Strudel keyword).
 * Multiple tracks are wrapped in `stack(...)`.
 * Returns `''` if no non-empty tracks exist.
 *
 * Ported from prototype lines 2054–2065 (with explicit `blocks`/`tracks`
 * params per OD-4; `'silence'` padding byte-for-byte preserved).
 */
export function buildComposition(blocks: Block[], tracks: Track[]): string {
  const tb = totalBars(blocks, tracks);
  const pats = tracks
    .map((t) => {
      const segs: string[] = [];
      let sum = 0;
      t.blocks.forEach((ref) => {
        const b = blocks.find((x) => x.id === ref.blockId);
        if (!b) return;
        segs.push(`  [${ref.bars}, ${b.code}]`);
        sum += ref.bars;
      });
      if (!segs.length) return null;
      if (sum < tb) segs.push(`  [${tb - sum}, silence]`);
      return `arrange(\n${segs.join(',\n')}\n)`;
    })
    .filter((p): p is string => p !== null);
  if (!pats.length) return '';
  return pats.length > 1
    ? `// ── Composición ──\nstack(\n${pats.join(',\n')}\n)`
    : `// ── Composición ──\n${pats[0]}`;
}
