<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 Handoff — NoteSlot: Single-Note Placement on the Pentagrama

---

## Step 01.1 — Inventory

**Date:** 2026-06-26
**Commit(s):** (see terminal commit below)
**Iteration:** 1 of 5

### Completed

- Read all required files in order: `CLAUDE.md`, `docs/note-placement/decisions.md`, `docs/note-placement/phases/phase-01.md`, `src/state/session.ts` (lines 1–700+), `src/core/codegen/strudel.ts` (full), `src/core/theory/chords.ts` (full), `src/render/tonnetz-scene.ts` (lines 1–550+), `src/render/pentagrama-scene.ts` (lines 1–940+), `src/lib/persistence.ts` (lines 1–180+), `src/agent/schema.ts` (lines 1–220)
- Grepped all `isRest` pattern-matches across `src/` — found 14 files
- Produced `docs/note-placement/inventories/phase-01-inventory.md` with all nine sections (a–i) and OD-1, OD-2, OD-3 open decisions with recommendations
- No source files modified

### Files touched

- `docs/note-placement/inventories/phase-01-inventory.md` (created)
- `docs/note-placement/handoffs/phase-01-handoff.md` (this file, created)

### Validation evidence (per Acceptance ID)

- A-01-01: `docs/note-placement/inventories/phase-01-inventory.md` exists; contains sections (a)–(i), OD-1, OD-2, OD-3, schema version recommendation, and exhaustiveness audit table.
- A-01-02: Sections OD-1, OD-2, and OD-3 each state a recommended option with a one-sentence rationale (Option A for OD-1 and OD-2; Option B / defer for OD-3).
- A-01-03: No source file was modified — confirmed by reviewing only with Read tool.
- A-01-04: Exhaustiveness audit table lists all 14 files containing `isRest` pattern-matches, sourced from `grep -rn "isRest" src/`.

### Routine validations (one-liner each)

None required — inventory step is read-only.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | `phase-01-inventory.md` exists with all nine sections | (none — document existence) | manual | covered |
| A-01-02 | OD-1, OD-2, OD-3 each state a recommended option with one-sentence rationale | (none — document content) | manual | covered |
| A-01-03 | Inventory produced by reading only — no source files modified | (none — git diff confirms) | manual | covered |
| A-01-04 | Exhaustiveness audit lists all files with `isRest` pattern-matches | (none — grep result documented) | manual | covered |

### Decisions made (if any)

None — inventory step only, recommendations surfaced for Pilot resolution.

### Proposed Decisions Register entries (if any)

None — the three open decisions (OD-1, OD-2, OD-3) are proposals for the Pilot to resolve before step 01.2. They are documented in the inventory, not in the Decisions Register (only the Pilot writes that).

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- No source files changed; `pnpm test` baseline remains at 2020 tests (unchanged from `authentic-groove` merge)
- Initiative `note-placement` begins; `docs/note-placement/decisions.md` has no active decisions yet

### Next-step context

The Pilot must resolve OD-1, OD-2, and OD-3 before step 01.2 begins:

- **OD-1 (Pitch-offset model):** Recommendation is Option A (`{ rootPc: number; octaveOffset: number }`). This determines the exact shape of `NoteSlot` and the `SavedNoteSlotSchema`.
- **OD-2 (Tonnetz interaction model):** Recommendation is Option A (hit-test `_renderNodes` in note mode, capture `node.pc`). This determines whether `onStagePointerDown` iterates nodes or triangles in note mode.
- **OD-3 (Agent schema extension):** Recommendation is Option B (defer). If the Pilot chooses Option A, step 01.2 must also bump `SCHEMA_VERSION` to 7 and an ADR must be written.

Key finding for step 01.2 implementer: The exhaustiveness audit identified **21 distinct call sites** across 14 files where `'isRest' in slot` is used and a `NoteSlot` arm must be added. The most important ones for correct behavior are:

1. `src/state/session.ts` lines 780, 828 — `deriveLiveCode` / `requeueLive` 'chord' branch: a `NoteSlot` at end of progression must not be treated as a chord for single-chord preview
2. `src/core/composition/snapshot.ts` lines 142, 242 — snapshot capture/restore must round-trip `NoteSlot`
3. `src/render/pentagrama-scene.ts` line 784 — main `paint()` dispatch must add `pNote` branch
4. `src/render/tonnetz-scene.ts` lines 315, 510–511, 616, 660 — `NoteSlot` has no Tonnetz centroid; skip similarly to `RestSlot`

One **subtlety** to flag: `src/core/harmony/voice-tracks.ts` currently narrows `ProgressionSlot` via an inline `ChordInput | RestInput` union (not the full `ProgressionSlot`). When `NoteSlot` is added to `ProgressionSlot`, the `computeVoiceTracks` parameter type must also be extended to handle `NoteSlot` — or a `NoteSlot` must be treated as a `RestInput` (gap in the voice track with no chord). The phase spec does not prescribe behavior for `NoteSlot` in voice tracks; the recommendation is to treat it as a rest gap (voice continuity maintained across it, no voice event emitted).

- **Terminal commit:** `docs(inventory): Phase 01 step 01.1 — read-only inventory, OD-1/OD-2/OD-3 recommendations`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**
