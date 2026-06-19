<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 02 Inventory — Music Knowledge Catalog

**Initiative:** ai-jam
**Step:** 02.1 — Inventory
**Date:** 2026-06-19
**Status:** Ready for Pilot review

---

## §(a) Source-of-truth survey — files read

| File | Lines read | Role in this phase |
|---|---|---|
| `src/agent/schema.ts` | 1–274 (full) | Defines agent-schema representation constraints that all catalog entries must be coherent with |
| `src/core/rhythm/euclid.ts` | 1–71 (full) | Canonical Bjorklund engine; congruence tests must call this, not re-implement it |
| `src/core/codegen/strudel.ts` | 1–285 (full) | Shows how rhythm layers and harmony slots are emitted to Strudel strings; informs the `mini` convention and `strudelStrategy` semantics |
| `src/core/theory/pitch.ts` | 1–59 (full) | `NOTE_NAMES` array — the 12 valid root strings for harmony entries |
| `src/core/theory/chords.ts` | 1–68 (full) | `Quality` union = `'maj' \| 'min' \| 'dim' \| 'aug'`; the 4-member schema triad vocabulary |
| `src/core/composition/snapshot.ts` | 1–299 (full) | Block snapshot shapes; confirms `ChordSnapshotEntry.qual` stays within the 4-member triad vocabulary |
| `docs/ai-jam/decisions.md` | 1–53 (full) | OD-1 and OD-2 Pilot resolutions (recorded 2026-06-19) |
| `docs/ai-jam/phases/phase-02.md` | 1–157 (full) | Spec — step 02.1 PROMPT and all subsequent step requirements |

---

## §(b) Agent-schema representation constraints

These constraints govern what the agent (and therefore the recipe→state layer, a future phase) can emit as live session mutations. The music-knowledge catalog is **independent** of these constraints today, but every catalog entry must carry enough metadata to enable reconciliation in a future ADR.

### §(b.1) Rhythm — `steps` variant

Source: `src/agent/schema.ts` lines 50–55.

```typescript
// RhythmLayerStepsSchema (schema.ts line 50–55)
steps: z
  .array(z.union([z.literal(0), z.literal(1)]))
  .length(16, 'steps must be exactly 16 entries')
```

**Constraint:** `steps` must be **exactly 16 elements**, each `0` or `1`. No other step count is accepted by `AgentOutputSchema`.

### §(b.2) Rhythm — `euclid` variant

Source: `src/agent/schema.ts` lines 63–83.

```typescript
// RhythmLayerEuclidSchema (schema.ts lines 63–83)
euclid: z.object({
  k: z.number().int().min(1).max(16),   // k ∈ [1, 16]
  n: z.number().int().min(2).max(16),   // n ∈ [2, 16]
  rot: z.number().int().min(0).max(15), // rot ∈ [0, 15] pre-Zod
})
// superRefine guard (lines 72–82):
// rot must be ≤ n-1 (e.g., E(3,8): rot ∈ [0,7])
```

**Constraints:**
- `k ∈ [1, 16]`
- `n ∈ [2, 16]`
- `rot ∈ [0, n-1]` (enforced by `superRefine`, not just Zod `.max(15)`)
- The two variants are mutually exclusive: a layer has either `steps` or `euclid`, not both (discriminated union, schema.ts line 91).

### §(b.3) Harmony — `root`

Source: `src/agent/schema.ts` line 133; `src/core/theory/pitch.ts` lines 9–22.

```typescript
// HarmonyChordCoreSchema (schema.ts line 133)
root: z.string()

// NOTE_NAMES (pitch.ts lines 9–22)
export const NOTE_NAMES: readonly string[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];
```

**Constraint:** Zod only enforces `z.string()`. Conventional constraint (enforced by `sendEvolution`'s `rootPc → NOTE_NAMES[rootPc]` mapping, agent.ts): `root` must be one of the 12 `NOTE_NAMES` entries. The harmony catalog uses `NOTE_NAMES` strings for `root` (see §(d) type model).

### §(b.4) Harmony — `quality`

Source: `src/agent/schema.ts` line 40 and line 134.

```typescript
// schema.ts line 40
const SK_QUAL = ['maj', 'min', 'dim', 'aug'] as const;

// HarmonyChordCoreSchema (schema.ts line 134)
quality: z.enum(SK_QUAL),
```

**Constraint:** `quality ∈ { 'maj', 'min', 'dim', 'aug' }`. This is the schema's **4-member triad vocabulary**. The music-knowledge catalog uses the richer 17-member OD-1 vocabulary (see §(c)); reconciliation is deferred.

Also note `src/core/theory/chords.ts` line 8:
```typescript
export type Quality = 'maj' | 'min' | 'dim' | 'aug';
```
The theory engine and the agent schema are aligned on the 4-triad vocabulary. The catalog extends this independently.

### §(b.5) Harmony — `bars`

Source: `src/agent/schema.ts` lines 116 and 137.

```typescript
// HarmonyRestSchema (schema.ts line 116)
bars: z.number().min(0.25).max(8).optional(),

// HarmonyChordCoreSchema (schema.ts line 137)
bars: z.number().min(0.25).max(8).optional(),
```

**Constraint:** Zod enforces `bars ∈ [0.25, 8]`. The semantic convention (from ADR 0010 amendment, referenced in codegen.ts comment line 177) is **multiples of 0.25** (granularity from Phase 03 harmonic-rhythm-improvements). There is no Zod `refine` enforcing `bars % 0.25 === 0`; the convention is project-level. The harmony catalog enforces this in tests (see §(d.3)).

### §(b.6) Rhythm sounds (`SK_SOUNDS`)

Source: `src/agent/schema.ts` line 29.

```typescript
const SK_SOUNDS = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'mt', 'ht'] as const;
```

Not a catalog concern (the rhythm catalog records patterns, not per-sound assignments), but noted for later reconciliation when recipe→state maps catalog entries to agent layers.

### §(b.7) Harmony presets

Source: `src/agent/schema.ts` line 152.

```typescript
preset: z.enum(['piano', 'guitar', 'synth-bass']).optional(),
```

The harmony catalog's `suggestedPreset` field (see §(d.2)) must use one of these three values when present.

---

## §(c) Canonical euclid engine signature

Source: `src/core/rhythm/euclid.ts` (full file, 71 lines).

```typescript
// euclid.ts

/** Default step resolution — 16 steps per bar. */
export const RSTEPS = 16;

/**
 * Bjorklund's algorithm: distribute k hits across n steps as evenly as
 * possible. Returns an array of length n with values 0 or 1.
 */
export function bjorklund(k: number, n: number): number[] { … }

/**
 * Rotate an array left by r positions.
 */
export function rotate(arr: readonly number[], r: number): number[] { … }

/**
 * Build a step array from an array of hit positions.
 */
export function stepsFromHits(hits: number[], totalSteps: number = RSTEPS): number[] { … }
```

**Canonical call for catalog congruence tests:**

```typescript
import { bjorklund, rotate } from '../../src/core/rhythm/euclid.js';

// For a catalog entry with euclid: { k, n, rot }:
const binary = rotate(bjorklund(k, n), rot).join('');
// binary must equal the entry's stored binary string exactly.
```

**Why this matters for OD-2 (native grids):** The catalog will include entries like `E(3,8)` (8 steps), `E(7,12)` (12 steps), `E(5,16)` (16 steps). The `bjorklund` function returns an array of length `n` (not length 16), so the binary string of an 8-step euclid entry has length 8. The congruence test calls `bjorklund(k, n)` with the entry's native `n` and checks the result matches the entry's `binary`. This is engine-agnostic — the test does not re-implement the algorithm.

---

## §(d) Proposed catalog type model

The types below live in `src/core/music-knowledge/` and are **independent** of `AgentOutputSchema`. They are pure reference data: no Zod schemas, no imports from `src/agent/` or `src/state/`, no DOM/PIXI/Svelte.

### §(d.1) `RhythmEntry`

```typescript
// src/core/music-knowledge/rhythm-catalog.ts

/**
 * Closed quality vocabulary for the music-knowledge harmony catalog.
 * Richer than AgentOutputSchema's 4-member SK_QUAL — OD-1 resolution.
 * 17 members.
 */
export const HARMONY_QUALITIES = [
  'maj', 'min', 'dim', 'aug',
  'maj7', 'm7', '7', 'm7b5', 'dim7',
  '6', 'm6', 'sus2', 'sus4',
  '9', 'maj9', 'm9', 'add9',
] as const;
export type HarmonyQuality = typeof HARMONY_QUALITIES[number];

/**
 * Rhythm step resolution variants (OD-2 native grids).
 * Each RhythmEntry stores its pattern in its native step count.
 */
export type StepCount = 8 | 12 | 16 | number; // number covers odd meters (e.g. 9, 10, 13)

/**
 * Intended future emission channel (OD-2).
 * 'euclid'  → entry carries `euclid: { k, n, rot }` and binary is reproduced by
 *              bjorklund(k, n) rotated by rot; future recipe→state emits via AgentOutput euclid.
 * 'struct'  → entry uses Strudel mini notation; future recipe→state emits via AgentOutput
 *              steps[] (after upsample/downsample) OR via a future struct(mini) schema extension.
 */
export type StrudelStrategy = 'euclid' | 'struct';

/**
 * A single rhythm pattern entry in the catalog.
 *
 * Fields:
 *   id            — Stable, kebab-case unique identifier (e.g. 'son-clave-3-2').
 *   name          — Human-readable name.
 *   family        — Broad rhythmic family (e.g. 'clave', 'bell-pattern', 'backbeat').
 *   traditions    — Cultural/stylistic traditions this pattern appears in.
 *                   Use "inspired by" or genre labels for generic cells; do not over-claim
 *                   specific closed cultural ownership for derivative patterns.
 *   meter         — Time signature string (e.g. '4/4', '12/8', '9/8').
 *   steps         — Native step count (OD-2: 8, 12, 16, or odd).
 *   roles         — Intended rhythmic roles (e.g. ['bass', 'melody', 'groove']).
 *   binary        — Binary string of length `steps` ('0'/'1' characters).
 *   onsets        — Indices (0-based) where binary[i] === '1'.
 *   mini          — Strudel mini-notation string of length `steps` tokens
 *                   (onset tokens, typically 'x', aligned to onsets; rest tokens, typically '~').
 *   strudelStrategy — Emission channel (OD-2): 'euclid' or 'struct'.
 *   euclid        — Present iff strudelStrategy === 'euclid'.
 *                   { k, n, rot } such that bjorklund(k, n) rotated by rot reproduces binary.
 */
export interface RhythmEntry {
  id: string;
  name: string;
  family: string;
  traditions: string[];
  meter: string;
  steps: StepCount;
  roles: string[];
  binary: string;
  onsets: number[];
  mini: string;
  strudelStrategy: StrudelStrategy;
  euclid?: { k: number; n: number; rot: number };
}
```

**Invariants enforced by tests (step 02.2):**
1. `binary.length === steps`
2. `onsets` equals the indices of `'1'` characters in `binary` (and vice versa: no onset is at a `'0'` position)
3. `mini` token count (split by space) === `steps`; onset tokens appear at exactly `onsets` positions
4. `strudelStrategy === 'euclid'` iff `euclid` field is present (and vice versa)
5. When `euclid` is present: `rotate(bjorklund(k, n), rot).join('') === binary` using the real `src/core/rhythm/euclid.ts` engine

### §(d.2) `HarmonyEntry`

```typescript
// src/core/music-knowledge/harmony-catalog.ts

/**
 * A single chord in a catalog harmony progression.
 *
 * Fields:
 *   root     — Note name (must be in NOTE_NAMES from src/core/theory/pitch.ts).
 *   quality  — Chord quality from the OD-1 closed enum (HarmonyQuality, 17 members).
 *   bars     — Duration in Strudel cycles; must be a multiple of 0.25 (0.25–8).
 */
export interface CatalogChord {
  root: string;        // ∈ NOTE_NAMES
  quality: HarmonyQuality;
  bars: number;        // multiple of 0.25, range [0.25, 8]
}

/**
 * A single harmony entry in the catalog.
 *
 * Fields:
 *   id              — Stable, kebab-case unique identifier.
 *   name            — Human-readable name.
 *   tags            — Descriptive tags for fuzzy query matching (e.g. 'minor', 'modal', 'jazz').
 *   modeCenter      — Root note name of the tonal center (∈ NOTE_NAMES).
 *   chordMode       — Whether chords are played as a block ('chord') or arpeggiated ('arp').
 *   suggestedPreset — Optional preset token; if present, must be one of the schema presets
 *                     ('piano' | 'guitar' | 'synth-bass') — per AgentOutputSchema §(b.7).
 *   progression     — Ordered array of CatalogChord entries (≥1).
 */
export interface HarmonyEntry {
  id: string;
  name: string;
  tags: string[];
  modeCenter: string;      // ∈ NOTE_NAMES
  chordMode: 'chord' | 'arp';
  suggestedPreset?: 'piano' | 'guitar' | 'synth-bass';
  progression: CatalogChord[];
}
```

**Invariants enforced by tests (step 02.3):**
1. Every `root` and `modeCenter` is in `NOTE_NAMES`
2. Every `quality` is in the OD-1 `HARMONY_QUALITIES` enum
3. Every `bars` is a multiple of 0.25 (i.e., `bars % 0.25 === 0`)
4. Every `suggestedPreset` (when present) is one of `'piano' | 'guitar' | 'synth-bass'`
5. All `id`s are unique within the catalog
6. `progression.length >= 1`

### §(d.3) `MusicalRecipe`

```typescript
// src/core/music-knowledge/rhythm-harmony-recipes.ts

/**
 * A recipe mapping a user intent to a combination of rhythm pattern(s) and
 * a harmony entry, with musical metadata for downstream use.
 *
 * Fields:
 *   id              — Stable, kebab-case unique identifier.
 *   name            — Human-readable recipe name.
 *   userIntents     — Non-empty array of natural-language phrases a user might say
 *                     to request this recipe (used by findRecipesForPrompt).
 *   rhythmIds       — One or more rhythm catalog ids (≥1); all must exist in RHYTHM_CATALOG.
 *   harmonyId       — Exactly one harmony catalog id; must exist in HARMONY_CATALOG.
 *   bpmRange        — [min, max] suggested BPM range (40 ≤ min ≤ max ≤ 240).
 *   meter           — Time signature; must match the meter of every referenced rhythm.
 *   density         — Qualitative density descriptor ('sparse' | 'medium' | 'dense').
 *   agentInstruction — A natural-language instruction string the agent can use when
 *                      applying this recipe (free-text, not an API call — pure data).
 */
export interface MusicalRecipe {
  id: string;
  name: string;
  userIntents: string[];        // non-empty
  rhythmIds: string[];          // ≥1, each ∈ RHYTHM_CATALOG[*].id
  harmonyId: string;            // ∈ HARMONY_CATALOG[*].id
  bpmRange: [number, number];   // [min, max], 40 ≤ min ≤ max ≤ 240
  meter: string;                // must equal rhythm entry meter for all rhythmIds
  density: 'sparse' | 'medium' | 'dense';
  agentInstruction: string;
}
```

**Invariants enforced by tests (step 02.4):**
1. Every `rhythmIds[i]` exists as an `id` in `RHYTHM_CATALOG`
2. `harmonyId` exists as an `id` in `HARMONY_CATALOG`
3. All recipe `id`s are unique
4. `userIntents.length >= 1`
5. `40 ≤ bpmRange[0] ≤ bpmRange[1] ≤ 240`
6. `meter` equals the meter of every referenced rhythm entry

---

## §(e) OD-1 and OD-2 as resolved — feasibility confirmation

### §(e.1) OD-1 — Chord vocabulary breadth (RESOLVED)

**Resolution (from `docs/ai-jam/decisions.md`, recorded 2026-06-19):**
The harmony catalog uses a richer closed 17-member quality enum. The catalog is reference data; reconciliation to `AgentOutputSchema` is deferred to the future recipe→state phase under its own ADR.

**Feasibility: downsample fallback is total.**

Every one of the 17 `HARMONY_QUALITIES` members reduces to one of the 4 schema triads (`maj`, `min`, `dim`, `aug`). The mapping below will live in the **test file** (step 02.3), not in source — per the phase spec. It is shown here to confirm totality:

| Catalog quality | Schema triad | Rationale |
|---|---|---|
| `maj`   | `maj` | Identity |
| `min`   | `min` | Identity |
| `dim`   | `dim` | Identity |
| `aug`   | `aug` | Identity |
| `maj7`  | `maj` | Major 7th — triad basis is major |
| `m7`    | `min` | Minor 7th — triad basis is minor |
| `7`     | `maj` | Dominant 7th — triad basis is major |
| `m7b5`  | `dim` | Half-diminished — triad basis is diminished |
| `dim7`  | `dim` | Fully diminished — triad basis is diminished |
| `6`     | `maj` | Major 6th — triad basis is major |
| `m6`    | `min` | Minor 6th — triad basis is minor |
| `sus2`  | `maj` | Suspended 2nd — no third; closest functional triad is major |
| `sus4`  | `maj` | Suspended 4th — no third; closest functional triad is major |
| `9`     | `maj` | Dominant 9th — triad basis is major |
| `maj9`  | `maj` | Major 9th — triad basis is major |
| `m9`    | `min` | Minor 9th — triad basis is minor |
| `add9`  | `maj` | Add9 — triad basis is major |

**Coverage: 17 of 17 enum members covered.** The downsample fallback is total. No enum member is left unresolved.

**Source confirmation:** `src/agent/schema.ts` line 40 (`SK_QUAL`) and `src/core/theory/chords.ts` line 8 (`Quality`) confirm the 4-member target vocabulary. Both are in force and unchanged.

### §(e.2) OD-2 — Rhythm step-resolution (RESOLVED)

**Resolution (from `docs/ai-jam/decisions.md`, recorded 2026-06-19):**
Each rhythm pattern is stored in its native step count (8/12/16/odd). Every entry carries `strudelStrategy: 'euclid' | 'struct'`. Reconciliation of non-16/struct grids to agent schema is deferred.

**Feasibility: `core/rhythm/euclid.ts` is the engine for all `euclid`-strategy entries.**

Source: `src/core/rhythm/euclid.ts` — exported functions `bjorklund(k, n)` and `rotate(arr, r)`.

The congruence test (step 02.2) will call:
```typescript
import { bjorklund, rotate } from '../../src/core/rhythm/euclid.ts';
// For entry with euclid: { k, n, rot }
const computed = rotate(bjorklund(entry.euclid.k, entry.euclid.n), entry.euclid.rot).join('');
expect(computed).toBe(entry.binary);
```

This call does NOT re-implement the Bjorklund algorithm — it uses the actual engine from `src/core/rhythm/euclid.ts`. If the engine changes (unlikely — it is a port), tests fail and the catalog must be regenerated. That is the intended behavior.

**Note on `RSTEPS = 16`:** The exported `RSTEPS = 16` constant in `euclid.ts` is a default for `stepsFromHits`, not a constraint on `bjorklund(k, n)`. `bjorklund(k, n)` returns a length-`n` array for any `n`. The catalog legitimately stores E(3,8) with `binary` of length 8. Tests call `bjorklund(3, 8)` and expect a length-8 result — this is already correct engine behavior.

---

## §(f) Files to be created (steps 02.2–02.5)

| File | Step | Nature |
|---|---|---|
| `src/core/music-knowledge/rhythm-catalog.ts` | 02.2 | New source — `RhythmEntry` type + `RHYTHM_CATALOG` array (≥30 entries) |
| `tests/music-knowledge/rhythm-catalog.test.ts` | 02.2 | New test — congruence invariants + euclid engine agreement |
| `src/core/music-knowledge/harmony-catalog.ts` | 02.3 | New source — `HarmonyEntry` type + `HARMONY_CATALOG` array (≥8 entries); exports `HARMONY_QUALITIES` |
| `tests/music-knowledge/harmony-catalog.test.ts` | 02.3 | New test — field validity + downsample-fallback totality table (in test, not source) |
| `src/core/music-knowledge/rhythm-harmony-recipes.ts` | 02.4 | New source — `MusicalRecipe` type + `RHYTHM_HARMONY_RECIPES` array (≥8 recipes) |
| `tests/music-knowledge/recipes.test.ts` | 02.4 | New test — referential integrity across both catalogs |
| `src/core/music-knowledge/query.ts` | 02.5 | New source — `findRecipesForPrompt`, `getRhythmById`, `getHarmonyById`, `getRecipeById` |
| `tests/music-knowledge/query.test.ts` | 02.5 | New test — deterministic, diacritic-insensitive matching; id lookups |
| `docs/ai-jam/handoffs/phase-02-handoff.md` | 02.1+ | New handoff file created in this step; appended in subsequent steps |

**No existing file is modified by this phase.** The byte-identical guarantee holds trivially: no pre-existing module imports `music-knowledge`.

---

## §(g) Placement and purity confirmation

**Placement:** `src/core/music-knowledge/` (source), `tests/music-knowledge/` (tests).

**Purity invariant (CLAUDE.md "Code" guardrail):** Every `src/core/**` module must have NO DOM/PIXI/Svelte imports and must be unit-testable in Node/Vitest. The music-knowledge module is pure reference data plus pure functions (query.ts). It will import only:
- `src/core/theory/pitch.ts` (for `NOTE_NAMES` — already pure)
- `src/core/rhythm/euclid.ts` (for congruence validation — already pure)

No imports from `src/agent/`, `src/state/`, `src/audio/`, `src/ui/`, or `src/lib/`. Confirmed feasible: all required constants (`NOTE_NAMES`, `bjorklund`, `rotate`) already live in pure-core modules.

---

## §(h) Open decisions — none

OD-1 and OD-2 are both RESOLVED (recorded in `docs/ai-jam/decisions.md`). No new open decisions were surfaced during this inventory. Step 02.2 may proceed after Pilot review.

---

## §(i) No new dependencies

The music-knowledge module uses no new runtime dependencies. All needed utilities (`NOTE_NAMES`, `bjorklund`, `rotate`) already exist in the codebase. No `pnpm add` required.

---

## §(j) Accepted coverage (this inventory step)

No Acceptance IDs are covered by this docs-only step. All seven acceptance criteria (A-02-01 through A-02-07) are targeted by steps 02.2–02.5.
