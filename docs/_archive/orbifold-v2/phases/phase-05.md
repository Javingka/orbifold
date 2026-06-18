# Phase 05 — Harmony-view spec (ADR 0011) + pure engine modules

**Purpose:** Record the locked harmony-view architecture in ADR 0011 and build the three pure TypeScript engine modules (`voice-tracks.ts`, `staff-map.ts`, `time-map.ts`) with comprehensive Vitest unit tests that Phases 06 and 07 will consume for rendering.
**Gate:** orbifold-v2 Phase 04 complete and Pilot-approved on the `orbifold-v2/phase-04` branch (all A-04-xx criteria covered, 207 tests passing, `tsc --noEmit` / `pnpm lint` / `pnpm build` all exit 0); Pilot has created `orbifold-v2/phase-05` from the Phase 04 branch.
**Expected phase result:** ADR 0011 committed recording the four locked harmony-view design decisions; `src/core/harmony/voice-tracks.ts`, `src/core/harmony/staff-map.ts`, and `src/core/harmony/time-map.ts` exist with full Vitest coverage in `tests/harmony/`; no PIXI, Svelte, or DOM import exists in any file under `src/core/`; all quality gates pass with test count ≥ 225.

---

## Step 05.1 — Inventory

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/handoffs/phase-04-handoff.md` (phase completion entry), and `docs/orbifold-v2/phases/phase-05.md` (this file). Then read: `src/core/theory/voice-leading.ts` (complete), `src/core/theory/chords.ts` (complete), `src/core/theory/pitch.ts` (complete), and `src/state/session.ts` (the `Chord` interface and `clampBars` function — lines 80–145 approximately). Confirm that `src/core/harmony/` does not exist. Confirm that `tests/harmony/` does not exist. Produce `docs/orbifold-v2/inventories/phase-05-inventory.md`. Do not write source code.

Implementation requirements:
- Confirm the exact signature and return type of `minimalVoiceLeading(pcsA, pcsB)` in `src/core/theory/voice-leading.ts`. Record the `VoiceLeadingResult` interface (fields: `moves`, `size`, `perm`). Confirm that `perm` is the permutation of `pcsB` that achieved the minimum, so `pcsB[perm[i]]` is the pitch class assigned to voice `i` in the next chord.
- Confirm the exact signature of `chordVoicing(rootPc, qual, octave)` in `src/core/theory/chords.ts`. Record the return type (`string[]`) and the octave-wrap formula (`octave + Math.floor((rootPc + iv) / 12)`). Confirm the Quality type (`'maj' | 'min' | 'dim' | 'aug'`).
- Confirm the `Chord` interface fields: `rootPc`, `qual`, `gain`, `cx?`, `cy?`, `bars?`. Record the `bars` semantics (default 1; multiples of 0.25; range [0.25, 8]).
- Confirm `NOTE_NAMES` from `src/core/theory/pitch.ts` — these are the sharp spellings used by `chordVoicing`. Record that the array uses sharps only (no flats) — `staff-map.ts` receives note names in this format.
- Confirm `src/core/harmony/` does not exist (directory absent). Confirm `tests/harmony/` does not exist.
- Confirm that no existing file under `src/core/**` imports from `pixi.js`, `svelte`, or any DOM-only module (spot-check `src/core/theory/*.ts`, `src/core/rhythm/*.ts`, `src/core/composition/model.ts`, `src/core/codegen/strudel.ts`).
- Record the current test count from the Phase 04 completion entry (207).
- Document the three engine module APIs as the Dev will implement them, verbatim from the phase spec — do not re-derive; confirm they are consistent with the existing `chords.ts` and `voice-leading.ts` signatures (e.g., `VoiceEvent.noteName` is a string from `NOTE_NAMES`; `StaffPosition.steps` is an integer; `TimeMapResult` is a discriminated union or overloaded return depending on mode).

Validation:
- No source code written.

Expected result:
- `docs/orbifold-v2/inventories/phase-05-inventory.md` present and complete.
- No open decisions requiring Pilot resolution (all four harmony-view decisions are locked in ADR 0011; the inventory records them but does not re-open them).

CHECKPOINT → Commit message:
`docs(harmony): Phase 05 step 05.1 — phase-05 inventory`

---

## Step 05.2 — ADR 0011: harmony-view architecture

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-05-inventory.md`, and the four ADRs most relevant to harmony: `docs/adr/0010-variable-chord-duration.md` (for `Chord.bars` semantics) and `docs/adr/0005-tempo-setcps-not-setcpm.md` (for cycle/bar unit). Write `docs/adr/0011-harmony-view-architecture.md`. Do not write source code.

Implementation requirements:

The ADR records four locked Pilot decisions — it does NOT deliberate or re-open them. Use the Status "Accepted" with date 2026-06-11.

**Section: Context.** Describe the planned harmony view (Phases 06–07): a treble-clef staff view and an orbital concentric-ring view of the progression's three voices over time. The harmony view needs three pure engines to drive both rendering modes: one that computes continuous voice tracks from the progression (voice assignment via minimal voice-leading), one that maps note names to staff vertical positions (staff coordinates for rendering), and one that maps cycle positions to rendering coordinates (linear x or orbital angle). Four architectural decisions must be recorded.

**Section: Decisions (four sub-decisions, each with a brief justification grounded in the Pilot decision):**

1. **D1 — Harmony orbit period = full progression loop.** One full revolution of the harmony orbit equals the sum of all chord durations in cycles (the progression loop). Bar/cycle marks are drawn on the ring. The rhythm orbit keeps its 1-revolution-per-1-bar period; the two orbits spin at different rates. Justification: the rhythm orbit visualises the repeating groove pattern (1 bar = 1 loop); the harmony orbit visualises the chord progression (N bars = 1 loop). Linking them to the same period would either compress the rhythm orbit or dilate the harmony orbit — both are musically wrong. The two rates are intentionally different and musically meaningful (the rhythm repeats N times per harmony revolution, which is exactly how layered music works). Orbit period is defined as `totalCycles = sum(ch.bars ?? 1)` for all chords in the active progression. This value is the denominator in the `time-map.ts` orbital formula.

2. **D2 — ProgressionStrip preserved as duration/gain editor.** The ProgressionStrip (Phase 03) is the authoritative editor for per-chord duration and gain. The staff view and orbital view are read-oriented visualizations; they do not replace or duplicate the editing affordance. Justification: the ProgressionStrip was purpose-built for chord duration editing (Phase 03); it has a DAW-style ruler, handles, and persistence. Duplicating editing in the new views would create conflicting state sources. The new views consume the existing store state and re-render on store changes.

3. **D3 — Treble clef with ledger lines; no grand staff.** The harmony view uses a single treble clef staff with ledger lines above and below as needed. Voicings from `chordVoicing(rootPc, qual, octave)` with `octave = 3` (default) land in the C3–G3 range, which is below the treble staff (treble staff spans E4–F5; middle C is C4 = one ledger line below). The octave parameter (range 2–5, user-selectable) shifts the register; the view adapts automatically. No clef switching; no bass clef; no grand staff. Justification: triads fit within a small vertical window even with ledger lines; a grand staff doubles the vertical footprint and adds complexity for a three-voice instrument that never requires the full 10-line span. Ledger lines are visually sufficient for the expected register range (octaves 2–5).

4. **D4 — Voice continuity via existing `minimalVoiceLeading` permutation.** The three voices (voice-0, voice-1, voice-2) follow the permutation returned by `minimalVoiceLeading()` in `src/core/theory/voice-leading.ts`. For the first chord, voices are assigned in ascending pitch order (lowest = voice-0). For each subsequent chord, `perm` from `minimalVoiceLeading(prevPcs, nextPcs)` determines which voice moves to which pitch class: voice `i` in the next chord receives pitch class `nextPcs[perm[i]]`. Justification: `minimalVoiceLeading` already encodes the orbifold geometry (minimal Σ|circDelta|); reusing it for voice continuity ensures the visual voice tracks honour the same minimality principle that drives the audio codegen. No separate permutation algorithm is needed.

**Section: Consequences.** List: (1) `src/core/harmony/` is a new subdirectory with no DOM/PIXI/Svelte imports — consistent with the `src/core/**` invariant. (2) The three engines are unit-testable without a browser. (3) `time-map.ts` carries a `PX_PER_CYCLE = 48` constant that must match the ProgressionStrip grid constant — if Phase 03 ever changes that constant, `time-map.ts` must be updated in sync (note this as a coordination point). (4) The staff engine uses sharp spellings only (from `NOTE_NAMES`); flat accidentals (e.g., `Bb`) will not appear in voicings produced by `chordVoicing`. (5) Voice-track computation is pure and stateless — the rendering layers call it on every store change.

Validation:
- `docs/adr/0011-harmony-view-architecture.md` is well-formed Markdown, has Status: Accepted, Date: 2026-06-11, and Deciders: Pilot (Javier).
- No source code written.

Expected result:
- `docs/adr/0011-harmony-view-architecture.md` committed.

CHECKPOINT → Commit message:
`docs(adr): Phase 05 step 05.2 — ADR 0011 harmony-view architecture`

---

## Step 05.3 — `voice-tracks.ts` + tests

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0011-harmony-view-architecture.md`, `docs/orbifold-v2/inventories/phase-05-inventory.md`, `src/core/theory/voice-leading.ts` (complete), `src/core/theory/chords.ts` (complete), and `src/core/theory/pitch.ts` (complete). Create `src/core/harmony/voice-tracks.ts` and `tests/harmony/voice-tracks.test.ts`.

Implementation requirements:

**Types (define at the top of `voice-tracks.ts`, exported):**
```typescript
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
```

**`computeVoiceTracks(progression: ChordInput[], octave: number): VoiceTrack[]`** — the main exported function. `ChordInput` is a locally-defined interface `{ rootPc: number; qual: Quality; bars?: number }` (import `Quality` from `../theory/chords.js`). Returns exactly 3 `VoiceTrack` objects (indices 0, 1, 2).

Algorithm:
1. Edge case: if `progression.length === 0`, return `[{ voiceIndex: 0, events: [] }, { voiceIndex: 1, events: [] }, { voiceIndex: 2, events: [] }]`.
2. For the first chord (`i = 0`): call `chordVoicing(ch.rootPc, ch.qual, octave)` to get `['A3', 'C4', 'E4']` (example). Sort ascending by pitch — but `chordVoicing` already returns notes in ascending order (root, 3rd, 5th with octave wrapping), so assign voice-0 = index 0, voice-1 = index 1, voice-2 = index 2. Parse each note string into `noteName` (the letter + accidental part) and `octave` (the trailing integer). `startCycle = 0`.
3. For each subsequent chord (`i > 0`): extract the previous chord's pitch classes as a 3-tuple `[pc0, pc1, pc2]` using `chordPcs(prevCh.rootPc, prevCh.qual)` cast to `[number, number, number]`. Extract the next chord's pitch classes similarly. Call `minimalVoiceLeading(prevPcs, nextPcs)` to get `{ perm }`. Voice `v` in the new chord is assigned pitch class `nextPcs[perm[v]]`. Derive the note name from `NOTE_NAMES[nextPcs[perm[v]]]` and the octave from `octave + Math.floor((ch.rootPc + QUAL_INTERVALS[ch.qual][perm[v]]) / 12)` — but note that `perm[v]` is an index into `pcsB`, not into `QUAL_INTERVALS` directly; the correct octave derivation is: let `iv = QUAL_INTERVALS[ch.qual][perm[v]]`, then `o = octave + Math.floor((ch.rootPc + iv) / 12)`. `startCycle` = sum of `(progression[j].bars ?? 1)` for `j < i`.
4. Each `VoiceEvent` carries `bars: ch.bars ?? 1`.
5. Import `chordVoicing`, `chordPcs`, `QUAL_INTERVALS`, `Quality` from `../theory/chords.js`. Import `minimalVoiceLeading` from `../theory/voice-leading.js`. Import `NOTE_NAMES` from `../theory/pitch.js`.
6. AGPL-3.0 header. TS strict. No `any`. No DOM/PIXI/Svelte imports.

**`tests/harmony/voice-tracks.test.ts`:**
- Test: empty progression → three tracks each with 0 events.
- Test: single chord (C major, octave 3) → three tracks each with 1 event; voice-0 = `'C3'`, voice-1 = `'E3'`, voice-2 = `'G3'`; `startCycle = 0`; `bars = 1`.
- Test: single chord with `bars = 2` → `bars = 2` in the event; `startCycle = 0`.
- Test: two chords [C major, C minor] → verify voice continuity via voice-leading (P transform: one voice moves by -1 semitone, two stay the same); the permutation from `minimalVoiceLeading` must be applied correctly; assert the specific voice that moves (E3 → Eb3) and the two that stay (C3, G3).
- Test: two chords [C major, A minor] → verify the R transform permutation is applied (voice-leading perm `[1,2,0]` from the existing test in `tests/voice-leading.test.ts`); check that `startCycle` for chord 1 = 1.
- Test: two chords with `bars = [2, 0.5]` → second chord `startCycle = 2`; first chord `bars = 2`; second chord `bars = 0.5`.
- Test: three chords → `startCycle` values accumulate correctly across all three.
- AGPL-3.0 header on test file.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm exec vitest run tests/harmony/voice-tracks.test.ts` — all pass.
- `pnpm test` — all prior tests pass; count ≥ 214 (207 prior + 7 new minimum).

Expected result:
- `src/core/harmony/voice-tracks.ts` and `tests/harmony/voice-tracks.test.ts` committed.
- Voice assignment computes continuously across a progression, respecting voice-leading permutations and accumulating `startCycle` correctly.

CHECKPOINT → Commit message:
`feat(harmony): Phase 05 step 05.3 — voice-tracks engine and tests`

---

## Step 05.4 — `staff-map.ts` + tests  *(REVISE re-execution — resolves blocker `phase-05-blocker-staff-ledger-line-algorithm.md`)*

> **Amendment note (2026-06-11):** This step was originally executed against a chromatic (`steps` = semitones from C4) spec, and the Planner ESCALATEd after the first review due to a fundamental spec defect: semitone-based coordinates produce uneven staff-line spacing and misplace sharps. The Pilot decided Option B (diatonic vertical coordinate, vigent rule in `docs/orbifold-v2/decisions.md`). This spec section replaces the prior one entirely. The prior chromatic implementation of `staff-map.ts` and `staff-map.test.ts` must be replaced.

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md` (vigent rule "Staff vertical coordinate is diatonic, not chromatic"), `docs/adr/0011-harmony-view-architecture.md` (D3, Consequence 4), `docs/orbifold-v2/blockers/phase-05-blocker-staff-ledger-line-algorithm.md` (Resolution section), `docs/orbifold-v2/inventories/phase-05-inventory.md`, and `src/core/theory/pitch.ts` (complete). Replace `src/core/harmony/staff-map.ts` and `tests/harmony/staff-map.test.ts` with the diatonic implementation specified below.

### Coordinate system

`steps` is a **diatonic** integer: one unit per letter-name. C4 = 0. Each octave = ±7 diatonic steps.

Reference table (memorise this — all derivations below follow from it):

| Note | steps | Note | steps |
|------|-------|------|-------|
| C4   |  0    | C5   |  7    |
| D4   |  1    | D5   |  8    |
| E4   |  2    | E5   |  9    |
| F4   |  3    | F5   | 10    |
| G4   |  4    | A5   | 12    |
| A4   |  5    |      |       |
| B4   |  6    |      |       |
| B3   | −1    | C3   | −7    |
| A3   | −2    | B2   | −8    |
| G3   | −3    |      |       |
| F3   | −4    |      |       |
| E3   | −5    |      |       |
| D3   | −6    |      |       |

An accidental (`#` or `b`) does NOT change `steps`: F#3 has the same `steps` as F3 (−4), and C#4 has the same `steps` as C4 (0). The accidental is a separate flag.

### Types (exported)

```typescript
export interface StaffPosition {
  steps: number;          // diatonic position: C4 = 0, one unit per letter-name, ±7 per octave
  accidental: '' | '#';   // sharp flag; '' for natural notes; does NOT affect steps
  ledgerLines: number[];  // diatonic steps values where ledger lines must be drawn
}
```

No change to the field names or types — only the semantics of `steps` and `ledgerLines` change.

### Staff constants (exported)

```typescript
// Treble staff lines in diatonic steps. Lines from bottom to top: E4, G4, B4, D5, F5.
// Diatonic positions: E4=2, G4=4, B4=6, D5=8, F5=10.
export const TREBLE_STAFF_LINES: readonly number[] = [2, 4, 6, 8, 10];

// Staff spans from E4 (steps=2) to F5 (steps=10).
// A note is on or within the staff if STAFF_BOTTOM <= steps <= STAFF_TOP.
export const STAFF_BOTTOM: number = 2;   // E4
export const STAFF_TOP: number    = 10;  // F5
```

These replace the prior chromatic constants `[4, 7, 11, 14, 17]` / `STAFF_BOTTOM=4` / `STAFF_TOP=17`.

### `noteToSteps(noteName: string): number` — internal helper

Converts a note-name string (e.g., `'G3'`, `'C#4'`, `'Bb3'`) to a diatonic `steps` value.

Algorithm:
1. Parse `noteName`: extract letter (A–G), optional accidental (`#` or `b`), and octave integer.
2. Compute diatonic pitch-class of the letter: `diatonicPc = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 }`.
3. Compute `steps = diatonicPc + (octave - 4) * 7`.
4. The accidental does NOT change `steps`.

Examples: C4 → 0 + 0 = 0. G4 → 4 + 0 = 4. F#3 → 3 + (3−4)×7 = 3 − 7 = −4. C3 → 0 + (3−4)×7 = −7. A5 → 5 + (5−4)×7 = 12. B2 → 6 + (2−4)×7 = 6 − 14 = −8.

### Accidental extraction

```typescript
const accidental: '' | '#' = noteName.includes('#') ? '#' : '';
```

Flat input (`b`) is handled gracefully: `accidental` is set to `''` and `steps` is the natural-letter diatonic position of the flat's letter name (e.g., `Bb3` → steps = B3 = −1, accidental = `''`). This is not a production path (ADR 0011 Consequence 4 — `chordVoicing` produces sharps only), but the function must not throw.

### Ledger-line rule

Staff lines are at even diatonic steps: `STAFF_BOTTOM−2 = 0` is the first below-staff ledger line (C4), `STAFF_BOTTOM−4 = −2` is the next (A3), and so on. Every two diatonic units below `STAFF_BOTTOM` is a ledger-line position. Symmetrically, `STAFF_TOP+2 = 12` is the first above-staff ledger line (A5), then 14 (C6), etc.

**Below-staff walk** (steps < STAFF_BOTTOM):
```
ledgerLines = []
for (let k = STAFF_BOTTOM - 2; k >= steps; k -= 2) ledgerLines.push(k)
```
Starts at `k = 0` and walks down by 2 until `k < steps`. A note ON a ledger-line position is included (the walk is `>=`). A note IN A SPACE between a ledger line and the staff (or between two ledger lines) does not get a ledger line at its own position — only the ledger-line positions already walked down to `steps` are included; the space itself has no line.

**Above-staff walk** (steps > STAFF_TOP):
```
ledgerLines = []
for (let k = STAFF_TOP + 2; k <= steps; k += 2) ledgerLines.push(k)
```
Starts at `k = 12` and walks up by 2 until `k > steps`.

**On or within the staff** (STAFF_BOTTOM ≤ steps ≤ STAFF_TOP):
```
ledgerLines = []
```

### Planner-derived golden ledger-line values

The following values are authoritative. They are derived mechanically from the walks above; the Dev must reproduce them exactly.

**Below-staff walk starts at k=0, decrements by 2, stops when k < steps:**

| Note | steps | Walk produces | ledgerLines |
|------|-------|---------------|-------------|
| C4   |  0    | k=0: 0≥0 push; k=−2: −2≥0 false → stop | `[0]` |
| D4   |  1    | k=0: 0≥1 false → stop immediately | `[]` |
| B3   | −1    | k=0: 0≥−1 push; k=−2: −2≥−1 false → stop | `[0]` |
| A3   | −2    | k=0: push; k=−2: −2≥−2 push; k=−4: −4≥−2 false → stop | `[0,−2]` |
| G3   | −3    | k=0: push; k=−2: push; k=−4: −4≥−3 false → stop | `[0,−2]` |
| F3   | −4    | k=0: push; k=−2: push; k=−4: push; k=−6: −6≥−4 false → stop | `[0,−2,−4]` |
| F#3  | −4    | (same as F3; accidental does not change steps) | `[0,−2,−4]` |
| E3   | −5    | k=0,−2,−4 push (−4≥−5); k=−6: −6≥−5 false → stop | `[0,−2,−4]` |
| D3   | −6    | k=0,−2,−4,−6 push; k=−8: −8≥−6 false → stop | `[0,−2,−4,−6]` |
| C3   | −7    | k=0,−2,−4,−6 push (−6≥−7); k=−8: −8≥−7 false → stop | `[0,−2,−4,−6]` |
| B2   | −8    | k=0,−2,−4,−6,−8 push; k=−10: −10≥−8 false → stop | `[0,−2,−4,−6,−8]` |

**Above-staff walk starts at k=12, increments by 2, stops when k > steps:**

| Note | steps | Walk produces | ledgerLines |
|------|-------|---------------|-------------|
| G5   | 11 (B4+1... wait: G5 = G4+7 = 4+7 = 11) | 2≤11≤10 is false; 11 > STAFF_TOP=10, so above-staff | k=12: 12≤11 false → stop | `[]` |
| A5   | 12    | k=12: 12≤12 push; k=14: 14≤12 false → stop | `[12]` |
| C6   | 14    | k=12: push; k=14: push; k=16: 16≤14 false → stop | `[12,14]` |

> **G5 correction:** G5 in diatonic steps = G4 + 7 = 4 + 7 = 11. But STAFF_TOP = 10 (F5 = 10). So G5 at steps=11 is **one diatonic step above the staff**, in the space above F5. The above-staff walk: k=12, condition 12≤11 is false → walk produces nothing. `ledgerLines = []`. G5 sits in the space above the top staff line — standard notation does not draw a ledger line for a note in a space; ledger lines are only for notes ON a line outside the staff. This is correct.

**On-staff notes (STAFF_BOTTOM=2 ≤ steps ≤ STAFF_TOP=10):**

| Note | steps | ledgerLines |
|------|-------|-------------|
| E4   |  2    | `[]` |
| F4   |  3    | `[]` |
| G4   |  4    | `[]` |
| A4   |  5    | `[]` |
| B4   |  6    | `[]` |
| C5   |  7    | `[]` |
| D5   |  8    | `[]` |
| E5   |  9    | `[]` |
| F5   | 10    | `[]` |

### `noteToStaffPosition(noteName: string): StaffPosition` — main exported function

Parse `noteName`, compute `steps` via `noteToSteps`, extract `accidental`, compute `ledgerLines` via the walks above. Return `{ steps, accidental, ledgerLines }`.

AGPL-3.0 header. TS strict. No `any`. No DOM/PIXI/Svelte imports.

### `tests/harmony/staff-map.test.ts` — exact `toEqual` contracts

All ledger-line assertions use `toEqual` (exact array), not `toContain`. The prior iteration used `toContain`; this is the replacement.

Mandatory golden cases (minimum — additional cases encouraged):

- `noteToStaffPosition('C4')` → `{ steps: 0, accidental: '', ledgerLines: [0] }`
  - Derivation: steps=0 < STAFF_BOTTOM=2; walk k=0, 0≥0 push; k=−2, −2≥0 false → `[0]`.
- `noteToStaffPosition('D4')` → `{ steps: 1, accidental: '', ledgerLines: [] }`
  - Derivation: steps=1 < STAFF_BOTTOM=2; walk k=0, 0≥1 false → `[]`. D4 is in the space above C4; no ledger line at the space.
- `noteToStaffPosition('E4')` → `{ steps: 2, accidental: '', ledgerLines: [] }`
  - Derivation: 2 ≤ steps ≤ 10 — on-staff.
- `noteToStaffPosition('G4')` → `{ steps: 4, accidental: '', ledgerLines: [] }`
  - Derivation: on-staff (steps=4).
- `noteToStaffPosition('B4')` → `{ steps: 6, accidental: '', ledgerLines: [] }`
  - Derivation: on-staff (steps=6).
- `noteToStaffPosition('D5')` → `{ steps: 8, accidental: '', ledgerLines: [] }`
  - Derivation: on-staff (steps=8).
- `noteToStaffPosition('F5')` → `{ steps: 10, accidental: '', ledgerLines: [] }`
  - Derivation: on-staff (steps=10, STAFF_TOP).
- `noteToStaffPosition('G5')` → `{ steps: 11, accidental: '', ledgerLines: [] }`
  - Derivation: steps=11 > STAFF_TOP=10; walk k=12, 12≤11 false → `[]`. G5 is in the space above F5, no ledger line.
- `noteToStaffPosition('A5')` → `{ steps: 12, accidental: '', ledgerLines: [12] }`
  - Derivation: steps=12 > STAFF_TOP; walk k=12, 12≤12 push; k=14, 14≤12 false → `[12]`.
- `noteToStaffPosition('F#3')` → `{ steps: −4, accidental: '#', ledgerLines: [0, −2, −4] }`
  - Derivation: letter F, octave 3 → steps=−4; accidental='#'; walk k=0,−2,−4 (all ≥ −4); k=−6, −6≥−4 false → `[0,−2,−4]`.
- `noteToStaffPosition('C3')` → `{ steps: −7, accidental: '', ledgerLines: [0, −2, −4, −6] }`
  - Derivation: steps=−7; walk k=0,−2,−4,−6 (all ≥ −7); k=−8, −8≥−7 false → `[0,−2,−4,−6]`.
- `noteToStaffPosition('B2')` → `{ steps: −8, accidental: '', ledgerLines: [0, −2, −4, −6, −8] }`
  - Derivation: steps=−8; walk k=0,−2,−4,−6,−8 (all ≥ −8); k=−10, −10≥−8 false → `[0,−2,−4,−6,−8]`.
- Constants: `TREBLE_STAFF_LINES` equals `[2, 4, 6, 8, 10]`; `STAFF_BOTTOM` equals `2`; `STAFF_TOP` equals `10`.
- AGPL-3.0 header on test file.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm exec vitest run tests/harmony/staff-map.test.ts` — all pass.
- `pnpm test` — all prior tests pass; count ≥ 226 (≥214 prior + 12 new minimum).

Expected result:
- `src/core/harmony/staff-map.ts` and `tests/harmony/staff-map.test.ts` committed with the diatonic implementation.
- The prior chromatic implementation is fully replaced (no semitone-based `noteToSteps` or chromatic staff constants remain).
- `noteToStaffPosition` returns exact diatonic `steps`, correct `accidental` flag, and exact `ledgerLines` arrays matching the golden table above.

CHECKPOINT → Commit message:
`feat(harmony): Phase 05 step 05.4 — staff-map diatonic rewrite (resolves blocker)`

---

## Step 05.5 — `time-map.ts` + tests + quality gates

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0011-harmony-view-architecture.md`, `docs/orbifold-v2/inventories/phase-05-inventory.md`, and `src/render/rhythm-scene.ts` (search for the orbital phase formula — lines 310–320 approximately — to confirm the `- Math.PI / 2` convention used by the rhythm orbit). Create `src/core/harmony/time-map.ts` and `tests/harmony/time-map.test.ts`. After committing, run all quality gates and record the results.

Implementation requirements:

**Types (define at the top of `time-map.ts`, exported):**
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
```

**Constants (exported):**
```typescript
export const PX_PER_CYCLE = 48;  // must match ProgressionStrip PX_PER_CYCLE constant
```

**`cycleToPosition(cycleIndex: number, totalCycles: number, mode: 'linear'): LinearPosition`**
**`cycleToPosition(cycleIndex: number, totalCycles: number, mode: 'orbital'): OrbitalPosition`**
**`cycleToPosition(cycleIndex: number, totalCycles: number, mode: 'linear' | 'orbital'): TimePosition`**

Overloaded signature for type safety. Implementation:
- `'linear'`: return `{ mode: 'linear', x: cycleIndex * PX_PER_CYCLE }`. The `totalCycles` parameter is not used in linear mode (passed for API uniformity) but must not be ignored without lint suppression — use `void totalCycles` or destructure.
- `'orbital'`: return `{ mode: 'orbital', angle: (cycleIndex / totalCycles) * 2 * Math.PI - Math.PI / 2 }`. The `-Math.PI/2` offset places 0 at the top (12 o'clock), matching the convention used by `rhythm-scene.ts`. Division by `totalCycles` — if `totalCycles === 0`, return angle `- Math.PI / 2` (the 12 o'clock default; do not produce `NaN`).

AGPL-3.0 header. TS strict. No `any`. No DOM/PIXI/Svelte imports.

**`tests/harmony/time-map.test.ts`:**
- Test: linear mode, `cycleIndex = 0` → `{ mode: 'linear', x: 0 }`.
- Test: linear mode, `cycleIndex = 1` → `{ mode: 'linear', x: 48 }`.
- Test: linear mode, `cycleIndex = 2` → `{ mode: 'linear', x: 96 }`.
- Test: linear mode, `cycleIndex = 0.5` → `{ mode: 'linear', x: 24 }` (fractional cycle for sub-bar notes).
- Test: orbital mode, `cycleIndex = 0`, `totalCycles = 4` → `{ mode: 'orbital', angle: -Math.PI / 2 }` (top of orbit).
- Test: orbital mode, `cycleIndex = 2`, `totalCycles = 4` → `{ mode: 'orbital', angle: Math.PI / 2 }` (halfway = 3 o'clock; `(2/4)*2π - π/2 = π - π/2 = π/2`).
- Test: orbital mode, `cycleIndex = 4`, `totalCycles = 4` → `{ mode: 'orbital', angle: 3 * Math.PI / 2 }` (full loop = back at top, but expressed as `(4/4)*2π - π/2 = 2π - π/2 = 3π/2`).
- Test: orbital mode, `totalCycles = 0` → angle = `-Math.PI / 2` (no NaN guard).
- Test: `PX_PER_CYCLE` constant exported and equals `48`.
- AGPL-3.0 header on test file.

After implementing and testing, verify the full quality gate suite:

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm exec vitest run tests/harmony/time-map.test.ts` — all pass.
- `pnpm test` — all prior tests pass; count ≥ 235 (≥226 prior + 9 new minimum). Record exact final count in handoff.
- `pnpm build` — exits 0.
- Spot-check `src/core/harmony/` for any DOM/PIXI/Svelte import (must be zero).

Expected result:
- `src/core/harmony/time-map.ts` and `tests/harmony/time-map.test.ts` committed.
- All three harmony engines committed, all quality gates passing, test count ≥ 235.

CHECKPOINT → Commit message:
`feat(harmony): Phase 05 step 05.5 — time-map engine and tests, phase-05 quality gates`

---

## Phase Acceptance

Each criterion has a unique ID used in handoff Acceptance Coverage Tables:

- **A-05-01** — `computeVoiceTracks([], 3)` returns three tracks each with 0 events; the engine handles empty progressions without error.
  - Validation method: `unit`

- **A-05-02** — For a single-chord C major progression at octave 3, `computeVoiceTracks` returns voice-0 = `C3`, voice-1 = `E3`, voice-2 = `G3`, each with `startCycle = 0` and `bars = 1`.
  - Validation method: `unit`

- **A-05-03** — For a two-chord [C major → C minor] progression, the voice carrying E3 moves to Eb3 (P transform: one semitone down); the other two voices (C3, G3) remain unchanged. Voice identity is continuous across chords — the same voice index holds the moving note.
  - Validation method: `unit`

- **A-05-04** — `startCycle` values accumulate correctly: for a progression with chord durations `[2, 0.5]` cycles, the second chord's events have `startCycle = 2`.
  - Validation method: `unit`

- **A-05-05** — `noteToStaffPosition('C4')` returns `steps = 0`, `accidental = ''`, and `ledgerLines` equals `[0]` exactly (middle C sits on the first ledger line below the treble staff; diatonic walk from k=0 produces exactly one entry).
  - Validation method: `unit`

- **A-05-06** — `noteToStaffPosition('G4')` returns `steps = 4`, `accidental = ''`, `ledgerLines = []` (G4 is the second treble-staff line in diatonic coordinates; on-staff, no ledger lines required).
  - Validation method: `unit`

- **A-05-07** — `noteToStaffPosition('F#3')` returns `steps = −4`, `accidental = '#'`, and `ledgerLines` equals `[0, −2, −4]` exactly (F3 = −4 in diatonic steps; sharp accidental extracted as a separate flag; three ledger lines from C4 down to F3 inclusive).
  - Validation method: `unit`

- **A-05-08** — `cycleToPosition(0, 4, 'linear')` returns `{ mode: 'linear', x: 0 }`; `cycleToPosition(1, 4, 'linear')` returns `{ mode: 'linear', x: 48 }` (one cycle = 48 px, matching the ProgressionStrip grid).
  - Validation method: `unit`

- **A-05-09** — `cycleToPosition(0, 4, 'orbital')` returns `{ mode: 'orbital', angle: -Math.PI / 2 }` (0 at top = 12 o'clock, consistent with the rhythm orbit convention); `cycleToPosition(2, 4, 'orbital')` returns `angle ≈ Math.PI / 2` (halfway = 3 o'clock).
  - Validation method: `unit`

- **A-05-10** — `cycleToPosition` does not produce `NaN` when `totalCycles = 0` (orbital mode guard).
  - Validation method: `unit`

- **A-05-11** — No file under `src/core/` imports from `pixi.js`, `svelte`, or any DOM-only module. All three harmony engines are verifiably pure TypeScript.
  - Validation method: `proxy:static-analysis`

- **A-05-12** — ADR 0011 is committed at `docs/adr/0011-harmony-view-architecture.md` with Status: Accepted, recording all four Pilot design decisions (D1–D4).
  - Validation method: `proxy:static-analysis`

- **A-05-13** — All quality gates pass: `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` all pass with count ≥ 235, `pnpm build` exits 0.
  - Validation method: `automated`

---

## Partial coverage from prior phase

Phase 04 step 04.3 closed all A-04-xx criteria: A-04-01 and A-04-03 are marked as deferred to Pilot manual verification (perceptual sync), not carrying forward as open items — those are one-time manual checks that the Pilot performs at Phase 04 approval.

No prior partials to address.

---

## ADR Triggers

- **ADR 0011 — Harmony-view architecture** — Trigger: step 05.2. Records the four locked design decisions for the harmony view (orbit period, ProgressionStrip preservation, staff clef choice, voice-continuity algorithm). This is a recording ADR, not a deliberation ADR.

No other ADR is required. The three engine modules apply existing algorithms (minimalVoiceLeading, chordVoicing) to new data shapes; no architectural reversal or new dependency is introduced.

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v2/handoffs/phase-05-handoff.md`. See `handoff-template.md`.

The handoff completion entry must confirm: (1) ADR 0011 committed; (2) all three engine files committed with AGPL-3.0 headers; (3) `src/core/harmony/` contains no DOM/PIXI/Svelte import (grep evidence); (4) final test count ≥ 235; (5) all quality gates pass.
