<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 Handoff — Song-Import Data Model Foundation

---

## Step 01.1 — Inventory

**Date:** 2026-07-02
**Iteration:** 1 of 5

### Completed

- Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/phases/phase-01.md` in full.
- Created `docs/song-import/decisions.md` (empty register — required even when empty).
- Created `docs/song-import/inventories/` and `docs/song-import/handoffs/` directories.
- Performed read-only code inventory of all ten required sources (chords.ts, strudel.ts, persistence.ts, schema.ts, model.ts, tonnetz-scene.ts, snapshot.ts, apply.ts, voice-tracks.ts, pentagrama-scene.ts).
- Produced `docs/song-import/inventories/phase-01-inventory.md` with all seven sections (a)–(g).
- No source files were modified.

### Files touched

- `docs/song-import/decisions.md` (created)
- `docs/song-import/inventories/phase-01-inventory.md` (created)
- `docs/song-import/handoffs/phase-01-handoff.md` (this file, created)

### Validation evidence (per Acceptance ID)

- **A-01-01:** `docs/song-import/inventories/phase-01-inventory.md` exists with sections (a)–(g). Verified by file creation.
- **A-01-02:** Section (d) OD-1 recommends Option A (corrected comma form) with one-sentence rationale. Section (e) OD-2 recommends Option A (accent color `#8aa0ff`) with one-sentence rationale.
- **A-01-03:** No source files in `src/` were opened for writing. Inventory is read-only.
- **A-01-04:** Section (f) lists all files with `Quality`-narrowing sites, including six files requiring change and six files confirmed no-change, derived from `grep -rn "qual\|Quality\|SK_QUAL\|QUAL_INTERVALS" src/`.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | Inventory document exists with all seven sections (a–g) | n/a | manual | covered |
| A-01-02 | OD-1 and OD-2 each state a recommended option with one-sentence rationale | n/a | manual | covered |
| A-01-03 | Inventory produced by reading only; no source files modified | n/a | manual | covered |
| A-01-04 | Exhaustiveness audit lists all `Quality`-narrowing sites | n/a | manual | covered |

**Notes on partial coverage:** A-01-01 through A-01-04 are all `manual` — they cover only step 01.1. Steps 01.2–01.4 cover A-01-05 through A-01-28.

### Decisions made (if any)

None — inventory is read-only. OD-1 and OD-2 recommendations are surfaced for Pilot resolution; no source decisions were made.

### Key findings for Pilot review

**OD-1 (power chord codegen):** The recommended form is `note("E2,B2")` (comma-separated simultaneous notes), not `note("E2 B2")` (which is a sequence/arpeggio in Strudel mini-notation). This is the same pattern the existing chord codegen already uses — `notes.join(',')` produces comma-separated simultaneous notes inside `note("…")`. Option C (chord shorthand) was ruled out because `'pow'` is not a registered chord name in Strudel's tonal vocabulary at `@strudel/web@1.0.3`.

**OD-2 (Tonnetz/Pentagrama rendering):** The recommended approach is accent color `#8aa0ff` (Option A). The existing code already handles this via the `dmap` miss fallback — no extra render code is needed for Phase 01. No Tonnetz crash path was found: `pow` quality will never appear in `_renderTris` (only triads form Tonnetz triangles).

**Critical finding — `voice-tracks.ts`:** Lines 237, 243, 266 hard-assume 3-voice input via `as [number, number, number]` cast and `for (let v = 0; v < 3; v++)`. A `pow` chord (2 voices) fed into `computeVoiceTracks` would produce a corrupt `fullNote = "undefined3"` and a type-unsafe access into a 3-element permutation array. Step 01.2 must guard `pow` chords in `voice-tracks.ts` (emit rest events for all 3 visual tracks, consistent with the existing rest/note slot handling). This guard is explicitly listed in the exhaustiveness audit section (f).

**`snapshot.ts` — hardcoded quality union:** `ChordSnapshotEntry.qual` (line 50) is `'maj' | 'min' | 'dim' | 'aug'` as a literal type, not imported from `chords.ts`. Step 01.2 must widen it to include `'pow'` so that block snapshots containing power chord slots round-trip correctly.

### Proposed Decisions Register entries (if any)

- **OD-1 ADR trigger (from phase file):** If Option A (comma form) is confirmed as the canonical power chord codegen, an ADR should document the choice. This is a Pilot decision; no register entry written by Dev.
- **OD-2 ADR trigger (from phase file):** If `accent` color is confirmed for `pow` rendering, an ADR should document the strategy. Pilot decision.

### Environment state after this step

- Branch: `main` (no new branch — inventory only).
- All source files unchanged.
- `docs/song-import/decisions.md`, `docs/song-import/inventories/phase-01-inventory.md`, and this handoff file are the only new files.

### Next-step context

- OD-1 and OD-2 must be resolved by the Pilot before step 01.2 begins (per phase gate).
- Step 01.2 must also create a new branch `song-import/phase-01`.
- The exhaustiveness audit in section (f) is the complete list of files step 01.2 must update. Pay special attention to the `voice-tracks.ts` guard (it is the only site with a runtime safety risk for `pow` input).

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:**
**Iteration:** 1 of 5
**Reason:**
**Next action:**
