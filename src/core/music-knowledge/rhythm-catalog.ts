// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Music Knowledge: Rhythm Catalog
// Pure reference data. No DOM/PIXI/Svelte imports.

// ---------------------------------------------------------------------------
// OD-1: Closed harmony quality vocabulary (17 members).
// Lives here because harmony-catalog.ts imports it from this file.
// Richer than AgentOutputSchema's 4-member SK_QUAL — reconciliation deferred
// to the future recipe→state phase under its own ADR.
// ---------------------------------------------------------------------------

/**
 * Closed quality vocabulary for the music-knowledge harmony catalog.
 * 17 members. Richer than AgentOutputSchema's `maj | min | dim | aug`.
 * See docs/ai-jam/decisions.md OD-1 and docs/ai-jam/inventories/phase-02-inventory.md §(e.1)
 * for the total downsample-to-triad mapping.
 */
export const HARMONY_QUALITIES = [
  'maj',
  'min',
  'dim',
  'aug',
  'maj7',
  'm7',
  '7',
  'm7b5',
  'dim7',
  '6',
  'm6',
  'sus2',
  'sus4',
  '9',
  'maj9',
  'm9',
  'add9',
] as const;

/** Union type of all 17 harmony quality tokens (OD-1 resolution). */
export type HarmonyQuality = (typeof HARMONY_QUALITIES)[number];

// ---------------------------------------------------------------------------
// Rhythm catalog types
// ---------------------------------------------------------------------------

/**
 * Native step count for a rhythm entry (OD-2 resolution: native grids).
 * Typical values: 4, 5, 7, 8, 9, 12, 16. The type is `number` rather than
 * a union such as `8 | 12 | 16 | number` because the union collapses to
 * `number` anyway; the JSDoc note is the authoritative documentation.
 */
export type StepCount = number;

/**
 * Intended future emission channel for a rhythm catalog entry (OD-2).
 *
 * - `'euclid'` — The entry carries `euclid: { k, n, rot }` and its `binary`
 *   is reproduced by `rotate(bjorklund(k, n), rot)`. Future recipe→state
 *   emits via AgentOutput `euclid` variant.
 * - `'struct'` — The entry uses Strudel mini-notation. Future recipe→state
 *   emits via AgentOutput `steps[]` (after up-/down-sample) or via a future
 *   `struct(mini)` schema extension.
 */
export type StrudelStrategy = 'euclid' | 'struct';

/**
 * A single rhythm pattern entry in the music-knowledge catalog.
 *
 * Invariants (enforced by tests):
 *  1. `binary.length === steps`
 *  2. `onsets` are exactly the 0-based indices where `binary[i] === '1'`
 *  3. `mini` has exactly `steps` space-separated tokens; token at index `i`
 *     is `'x'` iff `i ∈ onsets`, otherwise `'~'`
 *  4. `strudelStrategy === 'euclid'` iff `euclid` field is present
 *  5. When `euclid` is present: `rotate(bjorklund(k, n), rot).join('') === binary`
 *     verified via the real `src/core/rhythm/euclid.ts` engine
 */
export interface RhythmEntry {
  /** Stable kebab-case unique identifier. */
  id: string;
  /** Human-readable pattern name. */
  name: string;
  /** Broad rhythmic family (e.g. `'clave'`, `'bell-pattern'`, `'backbeat'`). */
  family: string;
  /**
   * Cultural or stylistic traditions this pattern appears in.
   * Use genre/style labels for generic or inspired-by cells; do not
   * over-claim specific closed cultural ownership for derivative patterns.
   */
  traditions: string[];
  /** Time signature string (e.g. `'4/4'`, `'12/8'`, `'9/8'`). */
  meter: string;
  /** Native step count (OD-2: 4, 5, 7, 8, 9, 12, 16, or other odd values). */
  steps: StepCount;
  /** Intended rhythmic roles (e.g. `['bass', 'melody', 'groove']`). */
  roles: string[];
  /** Binary string of length `steps`; `'1'` = onset, `'0'` = rest. */
  binary: string;
  /** 0-based indices of onsets (`binary[i] === '1'`). */
  onsets: number[];
  /**
   * Strudel mini-notation string: `steps` space-separated tokens.
   * `'x'` at onset positions, `'~'` at rest positions.
   */
  mini: string;
  /** Intended emission channel (OD-2). `'euclid'` iff `euclid` field present. */
  strudelStrategy: StrudelStrategy;
  /**
   * Euclidean parameters. Present iff `strudelStrategy === 'euclid'`.
   * `rotate(bjorklund(k, n), rot)` reproduces `binary` exactly.
   */
  euclid?: { k: number; n: number; rot: number };
}

// ---------------------------------------------------------------------------
// Helper: build mini-notation from binary string
// ---------------------------------------------------------------------------
function miniFromBinary(binary: string): string {
  return [...binary].map((c) => (c === '1' ? 'x' : '~')).join(' ');
}

// ---------------------------------------------------------------------------
// Helper: build onsets array from binary string
// ---------------------------------------------------------------------------
function onsetsFromBinary(binary: string): number[] {
  return [...binary].map((c, i) => (c === '1' ? i : -1)).filter((i): i is number => i >= 0);
}

// ---------------------------------------------------------------------------
// Helper: construct a euclid-strategy entry
// ---------------------------------------------------------------------------
function euclidEntry(
  fields: Omit<RhythmEntry, 'binary' | 'onsets' | 'mini' | 'strudelStrategy' | 'euclid'> & {
    euclid: { k: number; n: number; rot: number };
    binary: string; // pre-computed from engine
  }
): RhythmEntry {
  return {
    ...fields,
    onsets: onsetsFromBinary(fields.binary),
    mini: miniFromBinary(fields.binary),
    strudelStrategy: 'euclid',
  };
}

// ---------------------------------------------------------------------------
// Helper: construct a struct-strategy entry
// ---------------------------------------------------------------------------
function structEntry(
  fields: Omit<RhythmEntry, 'onsets' | 'mini' | 'strudelStrategy'>
): RhythmEntry {
  return {
    ...fields,
    onsets: onsetsFromBinary(fields.binary),
    mini: miniFromBinary(fields.binary),
    strudelStrategy: 'struct',
  };
}

// ---------------------------------------------------------------------------
// RHYTHM_CATALOG — ≥30 entries
//
// Coverage:
//   Euclidean 8-step  : 6 entries  (tresillo, cinquillo, habanera rotation,
//                                    8th-half, near-full, 4-of-8)
//   Euclidean 12-step : 4 entries  (West-African bell, sparse, minimal, standard)
//   Euclidean 16-step : 8 entries  (sparse/medium/dense/near-full/quarter/8th/
//                                    cascara-Euclidean)
//   Euclidean odd     : 7 entries  (3/4, 7/8 ×2, 9/8 ×2, 5/4 ×2)
//   Struct 16-step    : 4 entries  (son clave 3-2 / 2-3, rumba 3-2 / 2-3)
//   Struct 8/16-step  : 2 entries  (bossa nova clave 16, backbeat snare 16)
//
// Total: 31 entries
//
// Binary strings are pre-computed from the real bjorklund() engine (verified
// by the test suite via invariant 5). Do NOT change them without updating
// the engine call result or filing a bug.
// ---------------------------------------------------------------------------

export const RHYTHM_CATALOG: RhythmEntry[] = [
  // -----------------------------------------------------------------------
  // Euclidean — 8 steps
  // -----------------------------------------------------------------------

  euclidEntry({
    id: 'tresillo',
    name: 'Tresillo',
    family: 'clave',
    traditions: ['Afro-Cuban', 'Latin'],
    meter: '4/4',
    steps: 8,
    roles: ['groove', 'bass', 'melody'],
    binary: '10010010', // E(3,8,0)
    euclid: { k: 3, n: 8, rot: 0 },
  }),

  euclidEntry({
    id: 'cinquillo',
    name: 'Cinquillo',
    family: 'clave',
    traditions: ['Afro-Cuban', 'Cuban'],
    meter: '4/4',
    steps: 8,
    roles: ['groove', 'melody', 'decoration'],
    binary: '10110110', // E(5,8,0)
    euclid: { k: 5, n: 8, rot: 0 },
  }),

  euclidEntry({
    id: 'habanera-euclid',
    name: 'Habanera Cell (Euclidean)',
    family: 'clave',
    traditions: ['Habanera', 'Latin', 'Afro-Cuban'],
    meter: '4/4',
    steps: 8,
    roles: ['groove', 'bass'],
    binary: '10010100', // E(3,8,3) — rotation of tresillo
    euclid: { k: 3, n: 8, rot: 3 },
  }),

  euclidEntry({
    id: 'eighth-half',
    name: 'Half-Bar 8th Cell',
    family: 'straight',
    traditions: ['pop', 'rock', 'generic'],
    meter: '4/4',
    steps: 8,
    roles: ['bass', 'pad'],
    binary: '10001000', // E(2,8,0)
    euclid: { k: 2, n: 8, rot: 0 },
  }),

  euclidEntry({
    id: 'seven-of-eight',
    name: 'Seven-of-Eight',
    family: 'dense',
    traditions: ['experimental', 'generic'],
    meter: '4/4',
    steps: 8,
    roles: ['decoration', 'melody'],
    binary: '11111110', // E(7,8,0)
    euclid: { k: 7, n: 8, rot: 0 },
  }),

  euclidEntry({
    id: 'four-of-eight',
    name: 'Four-of-Eight (8th Notes)',
    family: 'straight',
    traditions: ['pop', 'rock', 'generic'],
    meter: '4/4',
    steps: 8,
    roles: ['groove', 'bass', 'pad'],
    binary: '10101010', // E(4,8,0)
    euclid: { k: 4, n: 8, rot: 0 },
  }),

  // -----------------------------------------------------------------------
  // Euclidean — 12 steps (12/8 or compound meter)
  // -----------------------------------------------------------------------

  euclidEntry({
    id: 'bell-pattern-west-african',
    name: 'West-African Bell Pattern',
    family: 'bell-pattern',
    traditions: ['West African', 'Ewe', 'Afro-Cuban', 'Afrobeat'],
    meter: '12/8',
    steps: 12,
    roles: ['timeline', 'groove', 'melody'],
    binary: '101101011010', // E(7,12,0) — standard Toussaint bell timeline
    euclid: { k: 7, n: 12, rot: 0 },
  }),

  euclidEntry({
    id: 'sparse-bell-12',
    name: 'Sparse Bell (12/8)',
    family: 'bell-pattern',
    traditions: ['West African', 'generic'],
    meter: '12/8',
    steps: 12,
    roles: ['timeline', 'groove'],
    binary: '100101001010', // E(5,12,0)
    euclid: { k: 5, n: 12, rot: 0 },
  }),

  euclidEntry({
    id: 'minimal-12',
    name: 'Minimal Triplet Cell (12/8)',
    family: 'straight',
    traditions: ['12/8 blues', 'gospel', 'generic'],
    meter: '12/8',
    steps: 12,
    roles: ['bass', 'pad'],
    binary: '100010001000', // E(3,12,0)
    euclid: { k: 3, n: 12, rot: 0 },
  }),

  euclidEntry({
    id: 'standard-12',
    name: 'Standard Triplet Quarter (12/8)',
    family: 'straight',
    traditions: ['shuffle', 'blues', 'generic'],
    meter: '12/8',
    steps: 12,
    roles: ['groove', 'bass'],
    binary: '100100100100', // E(4,12,0)
    euclid: { k: 4, n: 12, rot: 0 },
  }),

  // -----------------------------------------------------------------------
  // Euclidean — 16 steps (4/4 with 16th-note grid)
  // -----------------------------------------------------------------------

  euclidEntry({
    id: 'euclid-5-16',
    name: 'Euclidean 5-of-16',
    family: 'euclidean',
    traditions: ['Toussaint', 'generic'],
    meter: '4/4',
    steps: 16,
    roles: ['groove', 'melody'],
    binary: '1001001001001000', // E(5,16,0)
    euclid: { k: 5, n: 16, rot: 0 },
  }),

  euclidEntry({
    id: 'euclid-7-16',
    name: 'Euclidean 7-of-16',
    family: 'euclidean',
    traditions: ['Toussaint', 'generic'],
    meter: '4/4',
    steps: 16,
    roles: ['groove', 'melody'],
    binary: '1001010100101010', // E(7,16,0)
    euclid: { k: 7, n: 16, rot: 0 },
  }),

  euclidEntry({
    id: 'euclid-9-16',
    name: 'Euclidean 9-of-16',
    family: 'euclidean',
    traditions: ['Toussaint', 'generic'],
    meter: '4/4',
    steps: 16,
    roles: ['groove', 'melody', 'decoration'],
    binary: '1011010101101010', // E(9,16,0)
    euclid: { k: 9, n: 16, rot: 0 },
  }),

  euclidEntry({
    id: 'euclid-3-16',
    name: 'Euclidean 3-of-16 (Sparse)',
    family: 'euclidean',
    traditions: ['Toussaint', 'minimal', 'generic'],
    meter: '4/4',
    steps: 16,
    roles: ['bass', 'pad'],
    binary: '1000010000100000', // E(3,16,0)
    euclid: { k: 3, n: 16, rot: 0 },
  }),

  euclidEntry({
    id: 'euclid-11-16',
    name: 'Euclidean 11-of-16',
    family: 'euclidean',
    traditions: ['Toussaint', 'dense', 'generic'],
    meter: '4/4',
    steps: 16,
    roles: ['decoration', 'melody'],
    binary: '1011011011011011', // E(11,16,0)
    euclid: { k: 11, n: 16, rot: 0 },
  }),

  euclidEntry({
    id: 'eighth-notes-16',
    name: '8th Notes (16-step grid)',
    family: 'straight',
    traditions: ['pop', 'rock', 'generic'],
    meter: '4/4',
    steps: 16,
    roles: ['groove', 'bass', 'pad'],
    binary: '1010101010101010', // E(8,16,0)
    euclid: { k: 8, n: 16, rot: 0 },
  }),

  euclidEntry({
    id: 'quarter-notes-16',
    name: 'Quarter Notes (16-step grid)',
    family: 'straight',
    traditions: ['pop', 'rock', 'generic'],
    meter: '4/4',
    steps: 16,
    roles: ['bass', 'pad', 'groove'],
    binary: '1000100010001000', // E(4,16,0)
    euclid: { k: 4, n: 16, rot: 0 },
  }),

  euclidEntry({
    id: 'cascara-euclid',
    name: 'Cascara (Euclidean 10-of-16)',
    family: 'cascara',
    traditions: ['Afro-Cuban', 'salsa', 'timba'],
    meter: '4/4',
    steps: 16,
    roles: ['groove', 'timeline', 'decoration'],
    binary: '1011010110110101', // E(10,16,0)
    euclid: { k: 10, n: 16, rot: 0 },
  }),

  // -----------------------------------------------------------------------
  // Euclidean — odd meters
  // -----------------------------------------------------------------------

  euclidEntry({
    id: 'three-of-four',
    name: '3-of-4 (Dotted Quarter Feel)',
    family: 'euclidean',
    traditions: ['3/4 waltz-inspired', 'generic'],
    meter: '3/4',
    steps: 4,
    roles: ['groove', 'bass'],
    binary: '1110', // E(3,4,0)
    euclid: { k: 3, n: 4, rot: 0 },
  }),

  euclidEntry({
    id: 'aksak-7-sparse',
    name: 'Aksak 7/8 — Sparse (3 onsets)',
    family: 'aksak',
    traditions: ['Balkan', 'Turkish', 'aksak'],
    meter: '7/8',
    steps: 7,
    roles: ['groove', 'bass', 'melody'],
    binary: '1010100', // E(3,7,0)
    euclid: { k: 3, n: 7, rot: 0 },
  }),

  euclidEntry({
    id: 'aksak-7-dense',
    name: 'Aksak 7/8 — Dense (4 onsets)',
    family: 'aksak',
    traditions: ['Balkan', 'Turkish', 'aksak'],
    meter: '7/8',
    steps: 7,
    roles: ['groove', 'melody', 'decoration'],
    binary: '1010101', // E(4,7,0)
    euclid: { k: 4, n: 7, rot: 0 },
  }),

  euclidEntry({
    id: 'aksak-9-medium',
    name: 'Aksak 9/8 — Medium (4 onsets)',
    family: 'aksak',
    traditions: ['Balkan', 'Turkish', 'aksak'],
    meter: '9/8',
    steps: 9,
    roles: ['groove', 'bass'],
    binary: '101010100', // E(4,9,0)
    euclid: { k: 4, n: 9, rot: 0 },
  }),

  euclidEntry({
    id: 'aksak-9-dense',
    name: 'Aksak 9/8 — Dense (5 onsets)',
    family: 'aksak',
    traditions: ['Balkan', 'Turkish', 'aksak'],
    meter: '9/8',
    steps: 9,
    roles: ['groove', 'melody', 'decoration'],
    binary: '101010101', // E(5,9,0)
    euclid: { k: 5, n: 9, rot: 0 },
  }),

  euclidEntry({
    id: 'five-sparse',
    name: '5/4 Sparse (2 onsets)',
    family: 'euclidean',
    traditions: ['5/4 odd-meter', 'jazz', 'generic'],
    meter: '5/4',
    steps: 5,
    roles: ['bass', 'groove'],
    binary: '10100', // E(2,5,0)
    euclid: { k: 2, n: 5, rot: 0 },
  }),

  euclidEntry({
    id: 'five-medium',
    name: '5/4 Medium (3 onsets)',
    family: 'euclidean',
    traditions: ['5/4 odd-meter', 'jazz', 'generic'],
    meter: '5/4',
    steps: 5,
    roles: ['groove', 'melody'],
    binary: '10101', // E(3,5,0)
    euclid: { k: 3, n: 5, rot: 0 },
  }),

  // -----------------------------------------------------------------------
  // Struct — 16 steps (non-Euclidean claves and pop patterns)
  // -----------------------------------------------------------------------

  structEntry({
    id: 'son-clave-3-2',
    name: 'Son Clave 3-2',
    family: 'clave',
    traditions: ['Afro-Cuban', 'son', 'salsa'],
    meter: '4/4',
    steps: 16,
    roles: ['timeline', 'groove'],
    binary: '1001001000101000',
    // Onsets: 0,3,6,10,12 — non-Euclidean at 16 steps
  }),

  structEntry({
    id: 'son-clave-2-3',
    name: 'Son Clave 2-3',
    family: 'clave',
    traditions: ['Afro-Cuban', 'son', 'salsa'],
    meter: '4/4',
    steps: 16,
    roles: ['timeline', 'groove'],
    binary: '1000101001001000',
    // Onsets: 0,4,6,9,12
  }),

  structEntry({
    id: 'rumba-clave-3-2',
    name: 'Rumba Clave 3-2',
    family: 'clave',
    traditions: ['Afro-Cuban', 'rumba', 'Cuban'],
    meter: '4/4',
    steps: 16,
    roles: ['timeline', 'groove'],
    binary: '1001001000100100',
    // Onsets: 0,3,6,10,13
  }),

  structEntry({
    id: 'rumba-clave-2-3',
    name: 'Rumba Clave 2-3',
    family: 'clave',
    traditions: ['Afro-Cuban', 'rumba', 'Cuban'],
    meter: '4/4',
    steps: 16,
    roles: ['timeline', 'groove'],
    binary: '1000100100100100',
    // Onsets: 0,4,7,10,13
  }),

  structEntry({
    id: 'bossa-nova-clave',
    name: 'Bossa Nova Clave',
    family: 'clave',
    traditions: ['bossa nova', 'Brazilian', 'samba-inspired'],
    meter: '4/4',
    steps: 16,
    roles: ['timeline', 'groove'],
    binary: '1001001010010010',
    // Onsets: 0,3,6,8,11,14
  }),

  structEntry({
    id: 'backbeat-snare',
    name: 'Backbeat Snare',
    family: 'backbeat',
    traditions: ['pop', 'rock', 'R&B'],
    meter: '4/4',
    steps: 16,
    roles: ['snare', 'backbeat'],
    binary: '0000100000001000',
    // Onsets: 4,12 — beats 2 and 4 in 16th-note grid
  }),
];
