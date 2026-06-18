# Planner Review — Phase 05 step 05.4 (iteration 1)

**Date:** 2026-06-11
**Verdict:** ESCALATE
**Iteration:** 1 of 5

---

## Pilot Review Checklist

### 1. Commit scope clean
PASS. Files committed: `src/core/harmony/staff-map.ts`, `tests/harmony/staff-map.test.ts`, handoff entry. No extraneous files. All touched docs committed alongside code.

### 2. Commit message format
PASS. `feat(harmony): Phase 05 step 05.4 — staff-map engine and tests` — correct type, scope, phase, step, and description.

### 3. Acceptance Coverage Table present and complete
PASS (structure). A-05-05, A-05-06, A-05-07 are all mapped with test file and gap status. A-05-08 through A-05-10 correctly deferred to step 05.5. Prior covered items (A-05-01 through A-05-04, A-05-11, A-05-12) retained. However, the coverage table has a correctness issue addressed under item 4.

### 4. Tests are relevant, not just green — FAIL (escalation trigger)

This is the critical item. The tests pass but are insufficient to detect the ledger-line defect described below. The spec and implementation use a chromatic-step (every-2-semitones) ledger-line algorithm; the tests are written against that algorithm using `toContain` (not `toEqual`). The consequence is that the tests would pass even if the algorithm placed ledger lines at positions that do not correspond to real treble-clef notation.

**Ledger-line correctness analysis — detailed:**

The `steps` field is MIDI semitones from C4 (C4=0, G4=7). This part is correct.

The `TREBLE_STAFF_LINES = [4, 7, 11, 14, 17]` are the five treble-staff lines (E4, G4, B4, D5, F5) in chromatic `steps` units. Note they are non-uniformly spaced (gaps: 3, 4, 3, 3) because the staff follows diatonic spacing.

Real treble-clef ledger-line positions, expressed in `steps` from C4:

| Note | steps | Real ledger line? |
|---|---|---|
| D4 | 2 | NO (space below E4; notes here need no ledger line) |
| C4 | 0 | YES (middle C) |
| B3 | -1 | NO (space; needs C4 ledger above) |
| A3 | -3 | YES |
| G3 | -5 | NO (space between A3 and F3 ledger lines) |
| F3 | -7 | YES |
| E3 | -8 | NO (space) |
| D3 | -10 | YES |
| C3 | -12 | YES |

The implementation's algorithm:
```typescript
for (let k = STAFF_BOTTOM - 2; k >= steps; k -= 2) ledgerLines.push(k);
// produces {2, 0, -2, -4, -6, -8, -10, -12, ...}
```

Errors per note:
- **C4 (steps=0):** Correct ledger set = `[0]`. Implementation produces `[2, 0]`. The extra `2` (D4) is not a real ledger-line position. Test uses `toContain(0)` → passes but misses the spurious `2`.
- **D4 (steps=2):** Correct ledger set = `[]` (D4 is in the space below E4, no ledger needed). Implementation produces `[2]`. No test covers D4 directly — but the spec states `steps < STAFF_BOTTOM` triggers ledger lines, and D4=2 < 4=STAFF_BOTTOM.
- **G3 (steps=-5):** Correct ledger set = `[0, -3]` (C4 and A3). Implementation produces `[2, 0, -2, -4]`. Steps -2 (Bb3) and -4 are not real ledger-line positions; step -3 (A3) is a real ledger-line position but is MISSING from the result (the stride is 2, skipping odd positions). Test asserts `toContain(2, 0, -2, -4)` and `not.toContain(-6)` — passes, but the correct A3 position (-3) is absent.
- **F#3 (steps=-6):** Correct ledger set = `[0, -3]` (C4 and A3; F#3 is in the space above F3 at -7; no ledger at -6 in real notation). Implementation produces `[2, 0, -2, -4, -6]`. Steps -2, -4, -6 are all spurious; -3 (A3) is missing. Test asserts `toContain(2, 0, -2, -4, -6)` — passes on wrong values.
- **G5 (steps=19):** Correct ledger set = `[]` (G5 is in the space above F5; the first above-staff ledger line is A5 at steps=21). Implementation produces `[19]`. Test asserts `toContain(19)` — passes on a wrong value.

**The defect is in the spec, not the code.**

The spec (phase-05.md step 05.4, Ledger-line rule section) explicitly states:
> "ledger-line step-values are `{2, 0, -2, -4, -6, ...}` (i.e., `STAFF_BOTTOM - 2`, `STAFF_BOTTOM - 4`, etc.)"

and

> `for (let k = STAFF_BOTTOM - 2; k >= steps; k -= 2) ledgerLines.push(k)`

The Dev implemented exactly the specified algorithm. The test assertions were derived from the spec's stated examples (`G3 → [2, 0, -2, -4]`), all using `toContain` rather than `toEqual`. The implementation and tests are internally consistent with the spec.

However, the spec's algorithm is musically wrong: it uses a fixed chromatic stride of 2 semitones, but real treble-clef ledger lines are at diatonic positions (every other letter name = alternating gaps of 3 and 4 semitones: 0, -3, -7, -10, -13 below the staff). The note-name level of the ledger-line concept is diatonic, not chromatic.

**Conclusion:** Because the spec mandates the wrong algorithm, this is a spec-level defect. Per the review directive, this requires ESCALATE — the Pilot must decide whether to (A) accept the chromatic approximation as a deliberate design, (B) amend the spec to require diatonic positions, or (C) defer to Phase 07. See blocker file.

### 5. Live-system / manual evidence
N/A — no `live-system` or `manual` entries in the Acceptance Coverage Table.

### 6. Register respected
PASS. No vigent Register entries. No new conflicts.

### 7. Reversibility intact
PASS. No flag, no migration, no new runtime behavior (this is a new module). All 221 prior tests continue to pass.

### 8. No unauthorized new dependencies or env / CI changes
PASS. No new npm dependencies. No CI changes. Pure TypeScript module.

---

## Project-specific checklist

### Prototype parity
CONDITIONAL PASS. The handoff correctly notes that `staff-map.ts` is new logic (the prototype had no staff-map module), and that the note-name format matches `NOTE_NAMES` from `pitch.ts` (ported from reference/orbifold.html line 592). No prototype function to cite directly. The prototype parity requirement applies to ported functions; this is new infrastructure logic. The note-name parsing and `steps` computation are consistent with the `LETTER_SEMITONE` / MIDI formula verified in multiple tests.

### AGPL-3.0 header
PASS. Present in both `staff-map.ts` (line 1) and `staff-map.test.ts` (line 1).

### TS strict / no `any` / no DOM/PIXI/Svelte
PASS. `staff-map.ts` has no `any`, no `!` non-null assertions, no DOM/PIXI/Svelte imports. Types are fully resolved. The regex match result is correctly accessed with named indices.

### Sharp-only (ADR 0011 Consequence 4)
PASS. The `accidental` field returns `'#'` for sharps and `''` for naturals and flats. Flat input normalised gracefully (Bb3 → steps=-2, accidental=''). Robustness test covers this.

---

## Summary of findings

| Checklist item | Result | Details |
|---|---|---|
| 1. Commit scope clean | PASS | — |
| 2. Commit message format | PASS | — |
| 3. Acceptance Coverage Table | PASS (structure) | coverage weaknesses noted under item 4 |
| 4. Tests relevant, not just green | FAIL — ESCALATE | spec mandates chromatic ledger algorithm; musically wrong; tests use `toContain`, won't catch wrong ledger sets |
| 5. Live/manual evidence | N/A | — |
| 6. Register respected | PASS | — |
| 7. Reversibility | PASS | — |
| 8. No unauthorized deps | PASS | — |
| Prototype parity | PASS | new logic, no prototype function to cite |
| AGPL header | PASS | — |
| TS strict / no any | PASS | — |
| Sharp-only | PASS | — |

---

## What the Pilot must decide

The spec's ledger-line section mandates positions `{2, 0, -2, -4, ...}` (every-2-semitone stride). This is a chromatic approximation that diverges from real treble-clef notation (diatonic positions `{0, -3, -7, -10, ...}`). The code implements what the spec says; the tests are keyed to the spec's examples. The defect is in the spec.

See `/Users/virtualmachine/Development/personal/Orbifold/docs/orbifold-v2/blockers/phase-05-blocker-staff-ledger-line-algorithm.md` for:
- Exact list of wrong positions per note
- Three resolution options (A: accept chromatic approximation, B: require diatonic, C: defer to Phase 07)

**Next action:** Pilot review required before step 05.5, reason: spec-level defect in ledger-line algorithm requires Pilot decision before proceeding (see blocker `phase-05-blocker-staff-ledger-line-algorithm.md`).
