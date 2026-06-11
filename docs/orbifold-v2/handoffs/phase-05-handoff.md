# Phase 05 Handoff — Harmony-view spec (ADR 0011) + pure engine modules

---

## Step 05.1 — Inventory

**Date:** 2026-06-11
**Commit(s):**

- **Terminal commit:** `docs(harmony): Phase 05 step 05.1 — phase-05 inventory`
  - Hash: self-referential — not recorded

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/handoffs/phase-04-handoff.md` (phase completion entry), `docs/orbifold-v2/phases/phase-05.md`.
- Read all source files named in step 05.1 PROMPT: `src/core/theory/voice-leading.ts` (complete), `src/core/theory/chords.ts` (complete), `src/core/theory/pitch.ts` (complete), `src/state/session.ts` lines 80–145.
- Confirmed `src/core/harmony/` does not exist (`ls src/core/` returns `codegen composition rhythm theory`).
- Confirmed `tests/harmony/` does not exist.
- Confirmed 0 matches for `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/` — all `src/core/**` files are free of DOM/PIXI/Svelte imports.
- Confirmed current test count: 207 passing (8 test files), matching Phase 04 completion entry.
- Documented all three engine module APIs verbatim from the phase spec and verified consistency with existing `chords.ts` and `voice-leading.ts` signatures.
- Produced `docs/orbifold-v2/inventories/phase-05-inventory.md`.
- No source code written.

### Key confirmed values

| Item | Value | Source |
|---|---|---|
| `minimalVoiceLeading` signature | `(pcsA: [number,number,number], pcsB: [number,number,number]): VoiceLeadingResult` | `voice-leading.ts:42` |
| `VoiceLeadingResult.moves` | `[number, number, number]` — signed semitone per voice | `voice-leading.ts:29` |
| `VoiceLeadingResult.size` | `number` — Σ\|moves\| | `voice-leading.ts:31` |
| `VoiceLeadingResult.perm` | `[number, number, number]` — index permutation of pcsB | `voice-leading.ts:33` |
| `perm` semantics | voice `i` in next chord = `pcsB[perm[i]]` | `voice-leading.ts:60–70` |
| `Quality` type | `'maj' \| 'min' \| 'dim' \| 'aug'` | `chords.ts:8` |
| `QUAL_INTERVALS` | `{maj:[0,4,7], min:[0,3,7], dim:[0,3,6], aug:[0,4,8]}` | `chords.ts:14–19` |
| `chordVoicing` signature | `(rootPc, qual, octave): string[]` — all params required | `chords.ts:61` |
| Octave-wrap formula | `octave + Math.floor((rootPc + iv) / 12)` | `chords.ts:64` |
| `chordPcs` return type | `number[]` (not a tuple — cast needed in step 05.3) | `chords.ts:51` |
| `NOTE_NAMES` | Sharp spellings only; 12 elements; no flats | `pitch.ts:9–22` |
| `Chord.bars` | Optional; default 1; multiples of 0.25; range [0.25, 8] | `session.ts:139–142` |
| `Chord` all fields | `rootPc`, `qual`, `gain`, `cx?`, `cy?`, `bars?` | `session.ts:130–143` |
| `clampBars` signature | `(bars: number): number` | `session.ts:91` |
| `src/core/harmony/` | Absent | `ls` output |
| `tests/harmony/` | Absent | `ls` output |
| DOM/PIXI/Svelte in `src/core/` | 0 matches | grep output |
| Current test count | 207 | `pnpm exec vitest run` |

### Critical note for step 05.3 (`voice-tracks.ts`)

`chordPcs` returns `number[]`, not `[number, number, number]`. The caller must cast: `chordPcs(rootPc, qual) as [number, number, number]` before passing to `minimalVoiceLeading`.

### Critical note for step 05.4 (`staff-map.ts`)

The `steps` field and ledger-line algorithm use chromatic half-steps (every semitone), not diatonic positions. The treble-staff lines in chromatic steps `[4, 7, 11, 14, 17]` (E4, G4, B4, D5, F5) are non-uniformly spaced (gaps: 3, 4, 3, 3). The "every 2 steps" ledger-line rule is a rendering abstraction, not strict diatonic spacing. The Dev must verify the algorithm produces the exact expected arrays for each named test case and adjust the algorithm (not the tests) if discrepancies arise.

### Files touched

- `docs/orbifold-v2/inventories/phase-05-inventory.md` — created
- `docs/orbifold-v2/handoffs/phase-05-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory step only).

### Routine validations

No source code written; no build/test/lint runs required for this step. Test count confirmed: 207 passing (run: `pnpm exec vitest run`).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-05-01 | `computeVoiceTracks([], 3)` returns three tracks with 0 events | `tests/harmony/voice-tracks.test.ts` | unit | not covered — deferred to step 05.3 |
| A-05-02 | Single-chord C major → voice-0=C3, voice-1=E3, voice-2=G3 | `tests/harmony/voice-tracks.test.ts` | unit | not covered — deferred to step 05.3 |
| A-05-03 | C major → C minor: E3 moves to Eb3; C3, G3 unchanged | `tests/harmony/voice-tracks.test.ts` | unit | not covered — deferred to step 05.3 |
| A-05-04 | `startCycle` accumulates correctly for `[2, 0.5]` durations | `tests/harmony/voice-tracks.test.ts` | unit | not covered — deferred to step 05.3 |
| A-05-05 | `noteToStaffPosition('C4')` → steps=0, ledgerLines contains 0 | `tests/harmony/staff-map.test.ts` | unit | not covered — deferred to step 05.4 |
| A-05-06 | `noteToStaffPosition('G4')` → steps=7, ledgerLines=[] | `tests/harmony/staff-map.test.ts` | unit | not covered — deferred to step 05.4 |
| A-05-07 | `noteToStaffPosition('F#3')` → steps=-6, accidental='#', ledgerLines non-empty | `tests/harmony/staff-map.test.ts` | unit | not covered — deferred to step 05.4 |
| A-05-08 | `cycleToPosition(0,4,'linear')` → x=0; `(1,4,'linear')` → x=48 | `tests/harmony/time-map.test.ts` | unit | not covered — deferred to step 05.5 |
| A-05-09 | `cycleToPosition(0,4,'orbital')` → angle=-π/2; `(2,4,'orbital')` → angle=π/2 | `tests/harmony/time-map.test.ts` | unit | not covered — deferred to step 05.5 |
| A-05-10 | `cycleToPosition` does not produce NaN when totalCycles=0 | `tests/harmony/time-map.test.ts` | unit | not covered — deferred to step 05.5 |
| A-05-11 | No `src/core/` file imports pixi.js, svelte, or DOM-only modules | grep | proxy:static-analysis | **covered** (0 matches in existing files; must be maintained by new files) |
| A-05-12 | ADR 0011 committed with Status: Accepted, recording D1–D4 | `docs/adr/0011-harmony-view-architecture.md` | proxy:static-analysis | not covered — deferred to step 05.2 |
| A-05-13 | All quality gates: tsc 0, lint 0, tests ≥235, build 0 | all | automated | not covered — deferred to step 05.5 |

### Decisions made (if any)

None — inventory step only. All four harmony-view design decisions are locked (CLAUDE.md confirmed).

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 207 tests passing (unchanged from Phase 04 close).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged).
- No source code changed.

### Next-step context

Step 05.2 writes `docs/adr/0011-harmony-view-architecture.md` — a recording ADR (Status: Accepted, Date: 2026-06-11) for the four locked harmony-view design decisions. No deliberation required; the spec text in the phase file provides the exact content verbatim.

**Planner Review:** APPROVED on 2026-06-11. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 05.2

---

## Step 05.2 — ADR 0011: harmony-view architecture

**Date:** 2026-06-11
**Commit(s):**
- **Terminal commit:** `docs(adr): Phase 05 step 05.2 — ADR 0011 harmony-view architecture`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Wrote `docs/adr/0011-harmony-view-architecture.md` with Status: Accepted, Date: 2026-06-11, Deciders: Pilot (Javier).
- Recorded all four locked Pilot decisions verbatim from the phase spec (D1–D4).
- No source code written.

### Files touched

- `docs/adr/0011-harmony-view-architecture.md` — created
- `docs/orbifold-v2/handoffs/phase-05-handoff.md` — step 05.2 entry appended

### Validation evidence (per Acceptance ID)

- **A-05-12:** `docs/adr/0011-harmony-view-architecture.md` exists, has `Status: Accepted`, `Date: 2026-06-11`, `Deciders: Pilot (Javier)`, and sections D1–D4 recording all four harmony-view design decisions.

### Routine validations

No source code written; no build/test/lint runs required for this step.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-05-12 | ADR 0011 committed with Status: Accepted, recording D1–D4 | `docs/adr/0011-harmony-view-architecture.md` | proxy:static-analysis | **covered** |

**Proxy disclosures:** A-05-12 verified by direct inspection of `docs/adr/0011-harmony-view-architecture.md`: Status field reads "Accepted"; Date reads "2026-06-11"; Deciders reads "Pilot (Javier)"; sections D1, D2, D3, D4 present and content-complete.

### Decisions made (if any)

None — recording ADR only. All four decisions are pre-locked by the Pilot.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 207 tests passing (unchanged).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged).
- No source code changed.

**PILOT CHECKPOINT #2 — ADR.** This step is Pilot Checkpoint #2 (ADR). ADR 0011 is committed and requires Planner review before step 05.3 proceeds.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**
