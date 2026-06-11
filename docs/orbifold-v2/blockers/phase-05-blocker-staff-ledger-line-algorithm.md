# Blocker — Phase 05 step 05.4

**Created:** 2026-06-11
**Category:** spec-conflict
**Step:** 05.4 (staff-map.ts + tests)
**Iteration (if applicable):** 1 of 5

## What I was trying to do

Step 05.4 asks the Planner to review `src/core/harmony/staff-map.ts` and its tests, specifically focusing on whether the ledger-line algorithm produces musically correct positions for the treble clef across the octave 2–5 register (ADR 0011 D3 / Consequence). The implementation followed the spec's explicit `k -= 2` algorithm and the tests assert via `toContain`, not `toEqual`. All 35 tests pass and quality gates are clean.

## What blocks progress

The spec (phase-05.md step 05.4, Ledger-line rule section) explicitly mandates a chromatic-step algorithm: `for (let k = STAFF_BOTTOM - 2; k >= steps; k -= 2) ledgerLines.push(k)`, producing ledger-line positions `{2, 0, -2, -4, -6, ...}`. The Dev implemented this exactly, and the tests — also written per spec — use `toContain` assertions that pass.

However, real treble-clef ledger lines are at **diatonic** positions, not every-2-semitones:

| Position name | steps from C4 | In spec's chromatic set? |
|---|---|---|
| C4 (middle C) | 0 | yes (0) |
| A3 | -3 | NO |
| F3 | -7 | NO |
| D3 | -10 | NO |
| B2 | -13 | NO |

The spec's chromatic set `{2, 0, -2, -4, -6, -8, -10, -12, ...}` includes positions that are not real ledger-line positions:
- steps=2 (D4): D4 is in the space below E4 — no ledger line in real notation.
- steps=-2 (Bb3/A#3): not a diatonic note; in real notation, the ledger line above this space is at A3 (steps=-3), not at -2.
- steps=-4: not a real ledger-line position.
- steps=-6 (F#3): F#3 is in the space between F3 and G3; F3 (steps=-7) is the real ledger-line position.

The algorithm also draws a ledger line for **G5** (steps=19) despite G5 being in the space above the staff where no ledger line is needed (the first above-staff ledger line in real notation is A5 at steps=21).

**This is a spec defect, not a code defect.** The Dev implemented the algorithm the spec mandated. The tests were written from the spec's stated examples, using `toContain` (not `toEqual`), so the wrong ledger sets pass. The spec's "exact contract" paragraph shows `C4 → [0]` but the spec's own algorithm produces `[2, 0]` for C4, and the spec resolved this internal contradiction by using `toContain(0)` in the tests (weaker than `toEqual([0])`).

The Pilot must decide whether the chromatic-approximation design is intentional (in which case the spec should be clarified to document the deliberate non-diatonic behavior), or whether the spec should be amended to require diatonic ledger-line positions.

## What would prove this unblocked

The Pilot decides which ledger-line model is canonical for this engine and records the decision explicitly: either (A) the chromatic-approximation model is the deliberate design and the spec/tests are correct as-is, or (B) diatonic positions are required, and the spec is amended to mandate them, with the implementation and tests updated accordingly.

## Options for the Pilot

- **Option A — Accept chromatic approximation as deliberate design.** The spec's `k -= 2` algorithm is intentional: the staff engine uses chromatic steps throughout (that is how `steps` itself is defined, as MIDI-semitone distance from C4), so the ledger-line positions are also chromatic. The rendering layer (Phase 07) will draw one horizontal line per entry in `ledgerLines`; whether those entries fall exactly on diatonic note positions is a rendering concern, not an engine concern. Accept step 05.4 as-is and add a spec clarification note to the relevant section of phase-05.md (or a Register entry) documenting the deliberate chromatic-approximation. **Impact:** Phase 07's rendering layer must be aware that `ledgerLines` entries are chromatic positions; for the octave-3 default voicings (C3–G3, steps -12 to -5) the engine will emit roughly 4–8 ledger positions per note rather than 1–3 real ones.

- **Option B — Require diatonic ledger-line positions; amend spec and implementation.** The real treble-clef ledger-line positions below the staff, in `steps` units, are: 0 (C4), -3 (A3), -7 (F3), -10 (D3), -13 (B2). The algorithm to produce them: walk downward from C4 (steps=0) in diatonic thirds (`steps` gaps of alternately 3 and 4 semitones: 0, -3, -7, -10, -13, ...) until reaching the staff boundary above the note. Above the staff: 21 (A5), 24 (C6), 28 (E6). The test contracts must change to `toEqual` arrays for precise correctness. **Impact:** step 05.4 must be re-executed; the spec ledger-line section and all staff-map tests must be rewritten.

- **Option C — Defer the decision to Phase 07.** Accept step 05.4 with the current chromatic algorithm and add a spec note that `ledgerLines` is a "candidate position set" subject to rendering-layer filtering in Phase 07. Phase 07 would filter `ledgerLines` to diatonic positions at render time. **Impact:** The `StaffPosition` interface semantics are unclear to Phase 07 consumers until then; the field's docstring should warn about this.

## Current repo state

`src/core/harmony/staff-map.ts` and `tests/harmony/staff-map.test.ts` are committed on `orbifold-v2/phase-05`. All 256 tests pass. `tsc --noEmit` exits 0. `pnpm lint` exits 0. Step 05.5 (`time-map.ts`) has not been started. The branch is clean.

## Resolution

**Pilot decision (2026-06-11): Option B at the root — adopt a diatonic vertical coordinate.**

The root cause is broader than ledger lines: defining `steps` in semitones (chromatic) also misplaces sharps (F#3 ≠ F3 vertically) and spaces the staff lines unevenly. The fix is to make `steps` **diatonic** (one unit per letter-name: C=0, D=1, E=2, …; C4=0, E4=2, G4=4, B4=6, D5=8, F5=10), with accidentals as a separate flag that does not change `steps`. This makes staff lines equidistant, places sharps on their natural line, and makes ledger lines fall every 2 units — so the existing `k -= 2` walk becomes correct (below: 0, −2, −4, −6; above F5=10: 12, 14).

Recorded as a vigent rule in `docs/orbifold-v2/decisions.md` ("Staff vertical coordinate is diatonic, not chromatic"). No new ADR — this falls within ADR 0011 D3.

**Required follow-up:**

1. Planner amends `phase-05.md` step 05.4: new constants (`TREBLE_STAFF_LINES=[2,4,6,8,10]`, `STAFF_BOTTOM=2`, `STAFF_TOP=10`), diatonic `steps` contract, accidental-as-flag rule, and exact `toEqual` test contracts (e.g. C4→ledgerLines `[0]`; F#3→steps=−4, accidental='#'; G4→steps=4, ledgerLines `[]`; C3→steps=−7, ledgerLines `[0,−2,−4,−6]`).
2. Dev re-executes step 05.4 (REVISE) against the amended spec; tests use `toEqual` for ledger arrays.
3. Planner re-reviews step 05.4.

**Status: RESOLVED — unblocked.**
