<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Planner Review — Phase 01 Step 01.2

**Step:** 01.2 — `pow` quality: type, theory, codegen, schema
**Initiative:** song-import
**Date:** 2026-07-02
**Iteration:** 1 of 5
**Verdict:** APPROVE

---

## Pilot Review Checklist

### 1. Spec conformance — does the implementation match the phase spec?

PASS with one noted deviation that is explicitly justified.

The phase spec template (lines 135–141 of phase-01.md) includes "Add `triadQuality` guard: if the interval structure is `[0, 7]` (two voices), return `'pow'`." The Dev did not add this guard. The inventory (step 01.1 section a, confirmed APPROVED) resolved this as no-change: `triadQuality` takes `[number, number, number]` and is a recognition function for Tonnetz triangles — no code path in Phase 01 calls `triadQuality` on a power chord; it would return `'?'` for any unrecognised structure anyway. The step spec instructs Dev to apply the exhaustiveness audit from step 01.1 (not override it with the spec template), and the inventory is the authoritative narrowed scope. The omission is correct per methodology.

All other spec deliverables are present: `Quality` union, `QUAL_INTERVALS`, `chordLabel`, voice-tracks guard, persistence + agent SK_QUAL + version bumps, snapshot widening, test file.

### 2. OD-1 / OD-2 applied exactly?

PASS.

**OD-1:** Decision mandates comma-separated simultaneous notes inside `note("…")`, e.g. `note("E2,B2")`. The implementation uses the existing `notes.join(',')` path in `chordToStrudel` — no new branch. For `chordMode === 'chord'`, `chordVoicing(4, 'pow', 2)` returns `['E2', 'B2']` and `['E2','B2'].join(',')` yields `inner = 'E2,B2'`. Emits `note("E2,B2").s("sawtooth").lpf(1200).gain(0.60).room(0.25)` — exact match to OD-1. Golden string test at pow-quality.test.ts line 105 confirms. The phase spec template showed space-separated (`note("E2 B2")`), which OD-1 explicitly overrides with comma; implementation correctly follows OD-1, not the template.

In the `melodyLine` arrange path, pow chords go through the standard chord branch (line 307 of strudel.ts): `chordVoicing(...).join(sep)` with sep=`','`, then bracket-wrapped → `note("[E2,B2]")`. Golden string test at pow-quality.test.ts line 142 confirms.

**OD-2:** Decision mandates `accent` color `#8aa0ff` via existing dmap-miss fallback — no new render code needed. Inventory confirmed no crash paths; Dev applied no render changes. Correct.

### 3. Byte-identical guarantee for non-pow input?

PASS.

Two regression golden-string tests are present and meaningful:
- `chordToStrudel(0, 'maj', null, 'chord', 3)` → `'note("C3,E3,G3").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'` (pow-quality.test.ts line 124)
- `chordToStrudel(9, 'min', null, 'chord', 3)` → `'note("A3,C4,E4").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'` (pow-quality.test.ts line 131)
- Four `chordLabel` regression tests for pre-existing qualities (lines 46–60)

The `notes.join(',')` codepath in `chordToStrudel` is unmodified for non-pow; only a comment was added. No structural change to any non-pow branch.

### 4. Exhaustiveness — every Quality-narrowing site has a pow arm?

PASS.

All six files from the inventory exhaustiveness audit have been updated. The audit also explicitly listed the five no-change sites (pentagrama-scene.ts, tonnetz-scene.ts, recipe-engine.ts, ProgressionChips.svelte, ProgressionStrip.svelte) — the Dev confirmed these as no-change, consistent with the inventory. TypeScript exhaustiveness is verified by `tsc --noEmit` exiting 0. Key sites verified by direct source read:

- `src/core/theory/chords.ts` — `QUAL_INTERVALS.pow = [0, 7]` at line 26; `chordLabel` pow arm at line 51.
- `src/core/harmony/voice-tracks.ts` — `ch.qual === 'pow'` guard at line 246, emitting rest events for all 3 voice tracks before the `as [number, number, number]` cast at line 259.
- `src/lib/persistence.ts` — `SK_QUAL = ['maj','min','dim','aug','pow']` at line 54; `SESSION_SCHEMA_VERSION = 7` at line 22.
- `src/agent/schema.ts` — `SK_QUAL` includes `'pow'` at line 62; `SCHEMA_VERSION = 7` at line 30.
- `src/agent/apply.ts` — local `SK_QUAL` includes `'pow'` at line 60.
- `src/core/composition/snapshot.ts` — `ChordSnapshotEntry.qual` widened to include `'pow'` at line 51.

### 5. voice-tracks.ts guard — no unsafe 3-element cast for pow?

PASS.

The guard at voice-tracks.ts line 246 (`if (ch.qual === 'pow')`) fires before the `chordPcs(...) as [number, number, number]` cast at line 259. When qual is `'pow'`, the function emits rest events for all 3 visual tracks and continues to the next slot, never reaching the unsafe cast or the `minimalVoiceLeading` call. For non-pow chords, `chordPcs` correctly returns 3 elements, so the cast at line 259 remains sound.

### 6. Test file meets spec requirements?

PASS.

`tests/song-import/pow-quality.test.ts` contains 25 test cases (>= 9 required). All spec-mandated cases are present:
- `chordLabel(4,'pow')` → `'E5'` (line 34)
- `chordPcs(0,'pow')` → 2 elements `[0,7]` (line 66)
- `chordPcs(5,'pow')` → `[5,0]` (line 78)
- `chordToStrudel` pow golden string (line 105)
- `SavedSessionSchema` accepts pow chord (line 172)
- Old v6 session fails v7 check (line 212)
- `SESSION_SCHEMA_VERSION === 7` (line 17)
- `SCHEMA_VERSION === 7` (line 25)
- Non-pow chordToStrudel regression (line 124)
- chordLabel regression for all 4 pre-existing qualities (lines 46–60)

The handoff reports 2095 total tests, 0 failed — exceeding the 2069 baseline.

### 7. AGPL-3.0 header on new files?

PASS.

`tests/song-import/pow-quality.test.ts` line 1: `// SPDX-License-Identifier: AGPL-3.0-only`. All modified existing files already carried the header.

### 8. No DOM/PIXI/Svelte imports in src/core/**?

PASS.

All changes are in `src/core/theory/chords.ts`, `src/core/codegen/strudel.ts`, `src/core/harmony/voice-tracks.ts`, `src/core/composition/snapshot.ts`. No DOM/PIXI/Svelte imports were introduced. `src/lib/persistence.ts`, `src/agent/schema.ts`, and `src/agent/apply.ts` were already non-core and have no new cross-boundary imports.

---

## Project-specific checklist

### Prototype parity

NOT APPLICABLE. `'pow'` is a new construct introduced by this initiative, not a port from `reference/orbifold.html`. No prototype citation is required. This is explicitly noted per the review instructions.

### Reversibility / flag-off

NOT APPLICABLE. No runtime behavior flag was introduced. The new `'pow'` quality requires `SESSION_SCHEMA_VERSION = 7`; old v6 sessions are dropped by the existing graceful degradation path (confirmed by test at pow-quality.test.ts line 212). The byte-identical guarantee for non-pow input is satisfied by regression tests (items 3 and 6 above).

---

## Acceptance Coverage Table — verification

| Acceptance ID | Status | Verification method |
|---|---|---|
| A-01-05 | COVERED | `Quality = 'maj'\|'min'\|'dim'\|'aug'\|'pow'` in chords.ts line 12; tsc exits 0 |
| A-01-06 | COVERED | pow-quality.test.ts lines 66–83; 3 tests, all 2-element assertions |
| A-01-07 | COVERED | pow-quality.test.ts lines 33–43; 3 pow label tests |
| A-01-08 | COVERED | Golden string `note("E2,B2").s("sawtooth").lpf(1200).gain(0.60).room(0.25)` at line 105 |
| A-01-09 | COVERED | persistence.ts line 22; unit test at pow-quality.test.ts line 17 |
| A-01-10 | COVERED | schema.ts line 30; unit test at pow-quality.test.ts line 25 |
| A-01-11 | COVERED | persistence.ts line 54; schema.ts line 62; apply.ts line 60; unit + static-analysis |
| A-01-12 | COVERED | All 6 audit files updated; tsc exits 0; no-change sites confirmed |
| A-01-13 | COVERED | 2 regression golden strings + 4 chordLabel regression tests |
| A-01-14 | COVERED | 25 test cases, all pass; 2095 total > 2069 baseline |
| A-01-15 | COVERED | `pnpm exec tsc --noEmit` exits 0, no output |

No gaps identified.

---

## Summary

The implementation is correct and complete. OD-1 and OD-2 are applied exactly as the Pilot recorded them. The critical `voice-tracks.ts` safety guard is in place and correct. The byte-identical guarantee for non-pow input is verified by meaningful regression tests. All 11 acceptance criteria for this step are covered. The test count (25 in pow-quality.test.ts, 2095 total) exceeds all thresholds.

**Decision:** APPROVE
**Next action:** Dev proceeds to step 01.3
