# Phase 05 Inventory — Harmony-view spec + pure engine modules

**Date:** 2026-06-11
**Step:** 05.1
**Branch:** `orbifold-v2/phase-05`

---

## 1. `src/core/theory/voice-leading.ts` — exact API

**`minimalVoiceLeading` signature and return type:**

```typescript
export function minimalVoiceLeading(
  pcsA: [number, number, number],
  pcsB: [number, number, number]
): VoiceLeadingResult
```

Both parameters are 3-tuples of pitch classes (integers 0–11). Returns `VoiceLeadingResult` (see below).

**`VoiceLeadingResult` interface (lines 27–35):**

```typescript
export interface VoiceLeadingResult {
  /** Signed semitone move for each voice: [v1, v2, v3]. */
  moves: [number, number, number];
  /** Total voice-leading size: Σ|moves|. */
  size: number;
  /** Permutation of pcsB that achieved the minimum. */
  perm: [number, number, number];
}
```

**`perm` semantics:** `perm` is the permutation of indices into `pcsB` that achieved the minimum Σ|circDelta|. Concretely, voice `i` in the *next* chord is assigned pitch class `pcsB[perm[i]]`. The function tries all 6 permutations of `[0,1,2]` and picks the one minimising `Σ|circDelta(pcsA[i], pcsB[perm[i]])|`. Implementation seeds with the identity permutation `[0,1,2]` and iterates the remaining five.

**`circDelta` signature (helper, exported):**

```typescript
export function circDelta(a: number, b: number): number
```

Returns the signed semitone distance from pitch class `a` to pitch class `b`, in `[-6, 6)`. Formula: `((b - a + 18) % 12) - 6`.

---

## 2. `src/core/theory/chords.ts` — exact API

**`Quality` type (line 8):**

```typescript
export type Quality = 'maj' | 'min' | 'dim' | 'aug';
```

**`QUAL_INTERVALS` export (lines 14–19):**

```typescript
export const QUAL_INTERVALS: Record<Quality, readonly number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
};
```

**`chordVoicing` signature and return type (lines 61–67):**

```typescript
export function chordVoicing(rootPc: number, qual: Quality, octave: number): string[]
```

All three parameters are required (no defaults). Returns `string[]` — an array of note-name strings with octave, e.g. `['C3', 'E3', 'G3']`. The array always has length 3 (one element per interval in `QUAL_INTERVALS[qual]`).

**Octave-wrap formula (line 64):**

```typescript
const o = octave + Math.floor((rootPc + iv) / 12);
```

where `iv` is the semitone interval from `QUAL_INTERVALS[qual]`. When `rootPc + iv >= 12`, the octave increments by 1 (e.g., A3 + minor-third = C4, octave wraps). Notes are returned in ascending order (root, 3rd, 5th) with the wrap applied.

**`chordPcs` signature (lines 51–53):**

```typescript
export function chordPcs(rootPc: number, qual: Quality): number[]
```

Returns a `number[]` of length 3 (pitch classes 0–11). Formula: `QUAL_INTERVALS[qual].map((iv) => (rootPc + iv) % 12)`. **Note for step 05.3:** The return type is `number[]`, not `[number, number, number]`. The caller in `voice-tracks.ts` will need to cast this as `[number, number, number]` when passing to `minimalVoiceLeading`, which requires a 3-tuple.

**Other exports confirmed present:** `triadQuality`, `chordLabel` — not needed by Phase 05 engines.

---

## 3. `src/core/theory/pitch.ts` — `NOTE_NAMES`

**`NOTE_NAMES` export (lines 9–22):**

```typescript
export const NOTE_NAMES: readonly string[] = [
  'C',   // 0
  'C#',  // 1
  'D',   // 2
  'D#',  // 3
  'E',   // 4
  'F',   // 5
  'F#',  // 6
  'G',   // 7
  'G#',  // 8
  'A',   // 9
  'A#',  // 10
  'B',   // 11
];
```

**Sharp spellings only — confirmed.** No flat spellings appear (`Bb`, `Eb`, `Ab`, `Db`, `Gb` are absent). `staff-map.ts` receives note names produced by `chordVoicing`, which uses `NOTE_NAMES[pc]` directly — so the `accidental` field in `StaffPosition` will only ever be `'#'` or `''` for production voicings. The `noteToStaffPosition` function must still handle flat input gracefully (per spec) but it is not a required production path.

**Other exports in pitch.ts:** `NOTE_LOWER` (lowercase equivalents, not needed by Phase 05), `noteToPc` (string/number → pc 0–11, not needed by Phase 05 engines).

---

## 4. `src/state/session.ts` — `Chord` interface and `clampBars`

**`Chord` interface (lines 130–143):**

```typescript
export interface Chord {
  rootPc: number;    // 0–11 (pitch class)
  qual: Quality;     // 'maj' | 'min' | 'dim' | 'aug'
  gain: number;      // 0–1.2; default 0.6
  cx?: number;       // Tonnetz centroid x; disambiguates wrapped chord instances
  cy?: number;       // Tonnetz centroid y; disambiguates wrapped chord instances
  bars?: number;     // Duration in Strudel cycles (default 1; multiples of 0.25; min 0.25, max 8)
}
```

All fields confirmed. `bars` is optional (`bars?`); when absent, the engine default is `1` cycle.

**`bars` semantics (JSDoc lines 139–142):** Duration in Strudel cycles. Introduced in Phase 02 (ADR 0010). Phase 03 amendment: granularity changed from 0.5 to 0.25 cycles. Valid range: `[0.25, 8]`, multiples of `0.25`. Engines must use `ch.bars ?? 1` wherever a duration is needed.

**`clampBars` signature (lines 91–94):**

```typescript
export function clampBars(bars: number): number
```

Rounds to nearest `0.25` (`Math.round(bars * 4) / 4`), then clamps to `[0.25, 8]`. This is the normalisation gate for agent- or drag-supplied values before store write.

---

## 5. `src/core/harmony/` directory — confirmed absent

Running `ls src/core/` returns: `codegen  composition  rhythm  theory`. There is no `harmony` subdirectory. Step 05.3 will create `src/core/harmony/` as a new subdirectory.

---

## 6. `tests/harmony/` directory — confirmed absent

Running `ls tests/harmony/` returns: `No such file or directory`. Step 05.3 will create `tests/harmony/` as a new subdirectory.

---

## 7. `src/core/**` — no DOM/PIXI/Svelte imports

Command run:

```
grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/
```

**Result: no output (zero matches).** All files under `src/core/` are clean of DOM, PIXI, and Svelte imports. The A-05-11 invariant is satisfied by the existing codebase and must be maintained by the Phase 05 additions.

---

## 8. Current test count

**207 tests passing** (8 test files), confirmed by running `pnpm exec vitest run` on branch `orbifold-v2/phase-05`. This matches the Phase 04 completion entry in `docs/orbifold-v2/handoffs/phase-04-handoff.md` (step 04.2 landed +4 tests from 203 → 207; step 04.3 added no new tests).

Phase 05 must finish at ≥ 235 tests:
- Step 05.3 (`voice-tracks.ts`): +7 minimum → ≥ 214
- Step 05.4 (`staff-map.ts`): +12 minimum → ≥ 226
- Step 05.5 (`time-map.ts`): +9 minimum → ≥ 235

---

## 9. Three engine module APIs — verbatim from spec, consistency check

### `voice-tracks.ts` public API

```typescript
// ChordInput — local interface (not re-exported from session.ts to avoid DOM-transitive deps)
interface ChordInput {
  rootPc: number;
  qual: Quality;
  bars?: number;
}

export interface VoiceEvent {
  chordIndex: number;   // 0-based index into the progression
  noteName: string;     // note name with octave, e.g. 'C3', 'E3', 'G3'
  octave: number;       // octave of this note (integer)
  bars: number;         // duration of this chord in cycles (ch.bars ?? 1)
  startCycle: number;   // cumulative cycle offset: sum of bars of all prior chords
}

export interface VoiceTrack {
  voiceIndex: 0 | 1 | 2;     // 0 = lowest, 1 = middle, 2 = highest
  events: VoiceEvent[];
}

export function computeVoiceTracks(
  progression: ChordInput[],
  octave: number
): VoiceTrack[]
```

**Consistency with existing signatures:**
- `VoiceEvent.noteName` is a string like `'C3'` — formed by concatenating `NOTE_NAMES[pc]` (e.g., `'C'`) with an octave integer. This is exactly the format `chordVoicing` produces (`NOTE_NAMES[pc] + o`). Consistent.
- The octave derivation `octave + Math.floor((rootPc + iv) / 12)` in the spec matches the formula in `chordVoicing` line 64. Consistent.
- `chordPcs(rootPc, qual)` returns `number[]` (not a tuple); step 05.3 casts to `[number, number, number]` before passing to `minimalVoiceLeading`. This is the only type adaptation needed.
- `perm[v]` from `minimalVoiceLeading` is an index into `pcsB` (i.e., `nextPcs`). Voice `v` in the new chord receives `nextPcs[perm[v]]`. The spec's octave formula uses `QUAL_INTERVALS[ch.qual][perm[v]]` as the interval — this is correct because `perm[v]` is an index into the 3-element `QUAL_INTERVALS` array (same ordering as `chordPcs`).

### `staff-map.ts` public API

```typescript
export interface StaffPosition {
  steps: number;          // vertical position: integer half-steps from C4 (C4 = 0)
  accidental: '' | '#';   // sharp accidental symbol; '' for natural notes
  ledgerLines: number[];  // steps values where ledger lines must be drawn
}

export const TREBLE_STAFF_LINES: readonly number[] = [4, 7, 11, 14, 17];
export const STAFF_BOTTOM: number = 4;   // E4
export const STAFF_TOP: number = 17;     // F5

export function noteToStaffPosition(noteName: string): StaffPosition
```

**Consistency with existing signatures:**
- Input to `noteToStaffPosition` is a note-name string from `VoiceEvent.noteName` (format: `NOTE_NAMES[pc] + octave`, e.g., `'C#3'`, `'G3'`). The function parses the letter, optional `#`, and octave integer.
- `StaffPosition.steps` is defined as half-steps from C4 (`steps = midiNumber - 60`). This is a **chromatic** (semitone) measure, not a diatonic position count. The staff lines `[4, 7, 11, 14, 17]` are E4, G4, B4, D5, F5 in chromatic half-steps above C4.

**Note for step 05.4 — ledger-line algorithm uses chromatic steps, not diatonic positions:** Standard Western notation measures staff position diatonically (every line/space is one diatonic step = a whole or half step). The spec's `steps` field is chromatic (every semitone counts). This means:
  - G4 = steps 7 (chromatic), but the diatonic position on the staff from C4 is 4 (C, D, E, F, G = 4 diatonic steps).
  - The staff lines in chromatic steps `[4, 7, 11, 14, 17]` happen to be the correct MIDI distances for E4, G4, B4, D5, F5, because those are the actual treble-clef lines and these happen to be non-equally spaced chromatically (gaps of 3, 4, 3, 3).
  - The ledger-line rule in the spec uses `(STAFF_BOTTOM - k) % 2 === 0` below and `(k - STAFF_TOP) % 2 === 0` above. Because staff lines are NOT evenly spaced chromatically (3, 4, 3, 3), the "every 2 steps" ledger-line rule does NOT correspond exactly to standard notation's "one ledger line per staff line/space pair." **The Dev must verify the algorithm against the test cases in the spec.** For the test cases provided (G3 → ledgerLines includes `[2, 0, -2, -4]`, F#3 → includes `[2, 0, -2, -4, -6]`, C4 → includes `[0]`), the `steps`-based algorithm is used by design — it is a rendering abstraction, not strict music notation fidelity. The rendering layer (Phase 06) will draw ledger lines at the y-positions corresponding to these `steps` values; visual correctness is a Phase 06 concern, not a Phase 05 engine concern.
  - **Action for step 05.4:** Implement the algorithm as specified, verify against the named test cases. If the algorithm as written does not produce the exact expected arrays for any test, adjust the algorithm (not the tests) and document the adjustment in the handoff.

### `time-map.ts` public API

```typescript
export interface LinearPosition {
  mode: 'linear';
  x: number;  // pixels from the left edge of the timeline
}

export interface OrbitalPosition {
  mode: 'orbital';
  angle: number;  // radians; 0 = top (12 o'clock), clockwise
}

export type TimePosition = LinearPosition | OrbitalPosition;

export const PX_PER_CYCLE = 48;  // must match ProgressionStrip PX_PER_CYCLE

// Overloaded signatures:
export function cycleToPosition(
  cycleIndex: number,
  totalCycles: number,
  mode: 'linear'
): LinearPosition;
export function cycleToPosition(
  cycleIndex: number,
  totalCycles: number,
  mode: 'orbital'
): OrbitalPosition;
export function cycleToPosition(
  cycleIndex: number,
  totalCycles: number,
  mode: 'linear' | 'orbital'
): TimePosition;
```

**`TimePosition` is a discriminated union** (discriminant: `mode` field). This is the standard TypeScript pattern for exhaustive narrowing.

**Consistency notes:**
- `PX_PER_CYCLE = 48` must match the `ProgressionStrip` grid constant. The ProgressionStrip was built in Phase 03 with a 48px/cycle grid (per A-03-xx). If Phase 03 ever changes this constant, `time-map.ts` must be updated in sync (noted in ADR 0011 as a coordination point).
- The `-Math.PI / 2` orbital offset places 0 at 12 o'clock, consistent with the rhythm orbit convention. Step 05.5 must verify the exact formula against `src/render/rhythm-scene.ts` (lines 310–320 per spec) before committing.
- `totalCycles = 0` guard: if `totalCycles === 0`, return `angle = -Math.PI / 2` (avoid `NaN` from `0/0`).
- `void totalCycles` or equivalent needed in linear mode to satisfy lint (TypeScript strict with `noUnusedLocals`).

---

## 10. Potential issues noted for downstream steps

1. **`chordPcs` returns `number[]` not `[number, number, number]`** — step 05.3 must cast the result before passing to `minimalVoiceLeading`. This is a one-line cast: `chordPcs(rootPc, qual) as [number, number, number]`. No behavioral risk; just a TypeScript strictness requirement.

2. **Ledger-line algorithm uses chromatic steps, not diatonic positions** — documented above in §9 under `staff-map.ts`. The algorithm is a rendering abstraction by design. The Dev must verify each named test case by hand and adjust the algorithm if needed. This is the most complex logic in Phase 05.

3. **`PX_PER_CYCLE` coordination point** — `time-map.ts` carries `PX_PER_CYCLE = 48` that must stay in sync with the ProgressionStrip. No change is needed now; this is a maintenance note for future phases.

4. **`totalCycles = 0` NaN guard** — the orbital formula `(cycleIndex / totalCycles) * 2 * Math.PI - Math.PI / 2` produces `NaN` when `totalCycles = 0`. The guard must be implemented explicitly (`if (totalCycles === 0) return { mode: 'orbital', angle: -Math.PI / 2 }`).

5. **No open decisions** — all four harmony-view design decisions (D1–D4) are locked per CLAUDE.md and confirmed. ADR 0011 in step 05.2 is a recording ADR, not a deliberation ADR.

---

## Summary table — files read

| File | Purpose | Status |
|---|---|---|
| `src/core/theory/voice-leading.ts` | `minimalVoiceLeading`, `VoiceLeadingResult`, `circDelta` | Read completely |
| `src/core/theory/chords.ts` | `chordVoicing`, `chordPcs`, `QUAL_INTERVALS`, `Quality` | Read completely |
| `src/core/theory/pitch.ts` | `NOTE_NAMES`, `NOTE_LOWER`, `noteToPc` | Read completely |
| `src/state/session.ts` lines 80–145 | `Chord` interface, `clampBars`, `barsLabel` | Read |
| `src/core/harmony/` | New directory — absent | Confirmed absent |
| `tests/harmony/` | New directory — absent | Confirmed absent |
| `src/core/**` (grep) | PIXI/Svelte/DOM import check | 0 matches |
