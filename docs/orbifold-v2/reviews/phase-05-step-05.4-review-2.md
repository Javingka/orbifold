# Planner Review — Phase 05 step 05.4 (iteration 2)

**Date:** 2026-06-11
**Verdict:** APPROVE
**Iteration:** 2 of 5

---

## Pilot Review Checklist

### 1. Commit scope clean
PASS. Files committed: `src/core/harmony/staff-map.ts` (replaced), `tests/harmony/staff-map.test.ts` (replaced), handoff entry appended. No extraneous files.

### 2. Commit message format
PASS. `fix(harmony): Phase 05 step 05.4 — diatonic staff coordinate (REVISE, resolves blocker)` — correct type (`fix` for a replacement/rewrite), scope, phase, step, and description. REVISE designation is appropriate.

### 3. Acceptance Coverage Table present and complete
PASS. A-05-05/06/07 mapped to `staff-map.test.ts` with gap status **covered** and exact `toEqual` notes. A-05-08 through A-05-10 and A-05-13 explicitly deferred to step 05.5 — no silent drops. Previously-covered items (A-05-01 through A-05-04, A-05-11, A-05-12) retained with correct gap status.

### 4. Tests are relevant, not just green

PASS. This was the core failure in iteration 1 (all ledger assertions used `toContain`). The replacement is correct:

**toEqual replacement confirmed:** grep of `tests/harmony/staff-map.test.ts` for `toContain` returns zero matches (only a comment on line 4 noting the replacement). All 73 tests use `toEqual` for exact-array ledger assertions.

**Independent re-derivation of the blocker's critical cases** (Planner-derived, not copied from handoff):

Formula: `steps = DIATONIC_PC[letter] + (octave - 4) * 7`; `DIATONIC_PC = {C:0,D:1,E:2,F:3,G:4,A:5,B:6}`.

| Note | Derivation | steps | Expected ledgerLines | Walk trace |
|---|---|---|---|---|
| C4 | 0+(4-4)*7=0 | 0 | `[0]` | k=0: 0≥0 push; k=-2: -2≥0 false → [0] ✓ |
| D4 | 1+(4-4)*7=1 | 1 | `[]` | k=0: 0≥1 false → [] ✓ |
| G4 | 4+(4-4)*7=4 | 4 | `[]` | on-staff (2≤4≤10) → [] ✓ |
| F#3 | 3+(3-4)*7=-4, acc='#' | -4 | `[0,-2,-4]` | k=0,-2,-4: all ≥-4; k=-6: false → [0,-2,-4] ✓ |
| C3 | 0+(3-4)*7=-7 | -7 | `[0,-2,-4,-6]` | k=0,-2,-4,-6: -6≥-7; k=-8: -8≥-7 false → [0,-2,-4,-6] ✓ |
| A5 | 5+(5-4)*7=12 | 12 | `[12]` | k=12: 12≤12 push; k=14: false → [12] ✓ |
| G5 | 4+(5-4)*7=11 | 11 | `[]` | above-staff: k=12: 12≤11 false → [] ✓ |
| B2 | 6+(2-4)*7=-8 | -8 | `[0,-2,-4,-6,-8]` | k=0,-2,-4,-6,-8: -8≥-8; k=-10: false → [0,-2,-4,-6,-8] ✓ |

All 8 spec-mandated cases match the implementation. Every case independently verified.

**Accidental flag:** F#3 → accidental='#', steps=-4 (same as F3); C#4 → accidental='#', steps=0 (same as C4). Formula ignores the accidental character entirely when computing steps. Confirmed at code line 170: `noteName.includes('#') ? '#' : ''` — flat input gets `''` and steps uses the natural-letter position.

**Constants confirmed:**
- `TREBLE_STAFF_LINES = [2, 4, 6, 8, 10]` (line 24) ✓
- `STAFF_BOTTOM = 2` (line 27) ✓
- `STAFF_TOP = 10` (line 30) ✓

**Sharp-only production path (ADR 0011 Consequence 4):** Flat robustness test (Bb3) present: steps=-1 (B=6, octave=3 → 6−7=−1), accidental=''. Tests use `toEqual` for the ledgerLines array.

**Test count:** 73 tests in `staff-map.test.ts` alone. `pnpm test` reported 294/294 (221 prior + 73 new; exceeds minimum of 226). Exact count increase is 73 — all attributable to staff-map tests.

### 5. Live-system / manual evidence
N/A — no `live-system` or `manual` entries in the Coverage Table.

### 6. Register respected
PASS. The vigent rule "Staff vertical coordinate is diatonic, not chromatic" (recorded by the Pilot in `docs/orbifold-v2/decisions.md`) is the explicit driver of this implementation. No conflict. No new Register proposals.

### 7. Reversibility intact
PASS. `staff-map.ts` is a new module (no prior caller). The 221 tests from steps 05.1–05.3 remain untouched. The REVISE replaces only the staff-map and its test file — no prior behavior changed.

### 8. No unauthorized new dependencies or env / CI changes
PASS. No new npm dependencies. No CI changes. Pure TypeScript module.

---

## Project-specific checklist

### Prototype parity
PASS. Handoff correctly notes this is new infrastructure with no equivalent in `reference/orbifold.html`; the parity claim is note-name format compatibility with `NOTE_NAMES` from `pitch.ts` (ported from prototype line 592). No prototype function to cite — no penalty.

### AGPL-3.0 header
PASS. Present in both `staff-map.ts` (line 1: `// SPDX-License-Identifier: AGPL-3.0-only`) and `staff-map.test.ts` (line 1: same).

### TS strict / no `any` / no DOM/PIXI/Svelte
PASS. No `any`, no `@ts-ignore`, no non-null assertion operator (`!`) in source (the `if (!match)` is a boolean negation on a nullable regex result — standard TypeScript control flow, not an assertion). No DOM/PIXI/Svelte imports — only a comment noting their absence. grep confirms zero real import matches.

### Sharp-only production path (ADR 0011 Consequence 4)
PASS. The `accidental` field produces `'#'` or `''`; flat inputs gracefully normalised to `''`. Flat robustness test confirmed present with `toEqual` assertions.

---

## Blocker resolution verification

The iteration-1 ESCALATE was caused by:
1. `steps` defined in semitones (chromatic), misplacing sharps and spacing staff lines unevenly.
2. All ledger-line assertions using `toContain` rather than `toEqual`, masking wrong ledger sets.

Both are fully resolved:
- `steps` is now diatonic (one unit per letter, C4=0, ±7 per octave).
- All test assertions use `toEqual` — zero `toContain` usages confirmed.
- The `k -= 2` ledger walk is now correct: diatonic even positions below staff are real ledger-line positions (0=C4, -2=A3, -4=F3, -6=D3, -8=B2).

`docs/orbifold-v2/blockers/phase-05-blocker-staff-ledger-line-algorithm.md` Resolution section matches the implementation.

---

## Summary

| Checklist item | Result | Details |
|---|---|---|
| 1. Commit scope clean | PASS | — |
| 2. Commit message format | PASS | — |
| 3. Acceptance Coverage Table | PASS | A-05-05/06/07 covered with toEqual; partials correctly deferred |
| 4. Tests relevant, not just green | PASS | All 8 spec golden cases independently re-derived and match; zero toContain |
| 5. Live/manual evidence | N/A | — |
| 6. Register respected | PASS | Diatonic rule implemented exactly as the Pilot mandated |
| 7. Reversibility intact | PASS | No prior callers; prior 221 tests unaffected |
| 8. No unauthorized deps | PASS | — |
| Prototype parity | PASS | New infrastructure; format parity with NOTE_NAMES |
| AGPL header | PASS | Both files |
| TS strict / no any | PASS | — |
| Sharp-only | PASS | — |

---

**Planner Review:** APPROVED on 2026-06-11. Iteration: 2 of 5.
**Next action:** Dev proceeds to step 05.5
