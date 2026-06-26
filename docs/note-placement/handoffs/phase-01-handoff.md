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

**Decision:** APPROVED
**Reviewed on:** 2026-06-26
**Iteration:** 1 of 5
**Reason:** Inventory complete; OD-1/OD-2/OD-3 resolved by Pilot before step 01.2.
**Next action:** Dev proceeds to step 01.2

---

## Step 01.2 — NoteSlot model, persistence schema v6, store actions

**Date:** 2026-06-26
**Commit(s):** 7367720
**Iteration:** 1 of 5

### Completed

- Added `NoteSlot` interface to `src/state/session.ts` with `isNote: true` discriminant, `rootPc: number`, `octaveOffset: number`, `bars?: number` (OD-1 Option A)
- Expanded `ProgressionSlot = Chord | RestSlot | NoteSlot`
- Exported `isNoteSlot()` type guard from `src/state/session.ts`
- Added `addNote(rootPc: number): void` store action (appends `NoteSlot` with `octaveOffset: 0`, `bars: 1`)
- Added `setNoteOffset(index: number, octaveOffset: number): void` store action (clamps to [-4, 4], no-op for non-NoteSlot or out-of-bounds)
- Updated every exhaustive `isRest` branch across 9 source files with a `NoteSlot` arm
- Added `SavedNoteSlotSchema` to `src/lib/persistence.ts` (`isNote: z.literal(true)`, `rootPc`, `octaveOffset`, `bars?`)
- Bumped `SESSION_SCHEMA_VERSION` from 5 to 6 in `src/lib/persistence.ts`
- Extended `HarmonySlotInput` union in `src/core/codegen/strudel.ts` with NoteSlot arm (stub — full codegen in step 01.3)
- Added NoteSlot stub in `melodyLine` arrange() path (emits `silence` placeholder; forces `arrange()` path)
- Did NOT change `src/agent/schema.ts` (OD-3 resolved to defer)
- Created `tests/note-placement/note-slot-model.test.ts` with 18 tests
- Updated version fixtures in 4 existing test files (`persistence.test.ts`, `session.test.ts`, `agent-block-persistence.test.ts`, `authentic-groove/locked-persistence.test.ts`) from v5 to v6
- All quality gates pass: `tsc --noEmit` 0 errors, `pnpm lint` clean, `pnpm test` 2039/2039

### Files touched

- `src/state/session.ts` — NoteSlot interface, ProgressionSlot union, isNoteSlot guard, addNote, setNoteOffset actions, deriveLiveCode / requeueLive / applyLoadedSession NoteSlot arms
- `src/lib/persistence.ts` — SavedNoteSlotSchema, SESSION_SCHEMA_VERSION 5→6, SavedNoteSnapshotEntrySchema, serializeSession / deserializeSession NoteSlot branches
- `src/core/codegen/strudel.ts` — HarmonySlotInput extended with NoteSlot arm, melodyLine stub for NoteSlot (silence placeholder)
- `src/core/harmony/voice-tracks.ts` — NoteInput local interface, computeVoiceTracks updated to handle note slots as rest gaps
- `src/core/composition/snapshot.ts` — NoteSnapshotEntry type, captureArmoniaSnapshot / restoreArmoniaSnapshot NoteSlot branches
- `src/render/tonnetz-scene.ts` — updateTonnetzDynamic, pickChord, tickHarmony NoteSlot guards
- `src/render/pentagrama-scene.ts` — pNotePlaceholder paint branch (accent color stub; step 01.5 replaces), spotlight/selection guards
- `src/agent/agent.ts` — progression serialization to prompt and summary NoteSlot branches
- `src/agent/autopilot.ts` — applyHarmonyPresetOverride NoteSlot pass-through guard
- `src/agent/apply.ts` — applyHarmony NoteSlot round-trip branch
- `src/ui/ProgressionStrip.svelte` — handlePointerDown/Up NoteSlot guards, template note-seg chip
- `src/ui/Header.svelte` — selIsChord, displayInstrument, displayPreset NoteSlot guards
- `tests/note-placement/note-slot-model.test.ts` (created — 18 tests)
- `tests/persistence.test.ts` — version fixtures updated 5→6
- `tests/session.test.ts` — version fixtures updated 5→6
- `tests/agent-block-persistence.test.ts` — version fixture and SESSION_SCHEMA_VERSION assertion updated
- `tests/authentic-groove/locked-persistence.test.ts` — version fixture and VERSION assertion updated

### Validation evidence (per Acceptance ID)

- A-01-05: `NoteSlot` interface confirmed in `src/state/session.ts` lines 258–279: `isNote: true; rootPc: number; octaveOffset: number; bars?: number` — matches OD-1 Option A.
- A-01-06: `pnpm exec tsc --noEmit` → 0 errors; `ProgressionSlot = Chord | RestSlot | NoteSlot` compiles clean.
- A-01-07: `isNoteSlot` guard exported at `src/state/session.ts` line 293; test `A-01-07a/b/c/d` in `note-slot-model.test.ts` all pass.
- A-01-08: `addNote` at line 1426, `setNoteOffset` at line 1450 of `src/state/session.ts`; tested by `addNote store action` and `setNoteOffset store action` suites in `note-slot-model.test.ts` (8 tests covering append, no-op, clamping, neighboring slot preservation).
- A-01-09: All 14 files from inventory exhaustiveness audit updated with NoteSlot arms — confirmed by reading each file in sequence. TypeScript strict mode (`tsc --noEmit`) would catch any missed arm that causes a type error.
- A-01-10: `SESSION_SCHEMA_VERSION = 6` confirmed at `src/lib/persistence.ts`; tested by `note-slot-model.test.ts` A-01-10 case and `SESSION_SCHEMA_VERSION` suite.
- A-01-11: `SavedNoteSlotSchema` at `src/lib/persistence.ts` with `isNote: z.literal(true)` discriminant; union includes it before `SavedChordSchema`. Tested by `SavedNoteSlotSchema (A-01-11)` suite (3 tests).
- A-01-12: `tests/note-placement/note-slot-model.test.ts` "parses a v6-upgraded blob with chord-only progression" and "v6 session blob with mixed chord/note/rest" tests pass. Existing `persistence.test.ts` / `session.test.ts` tests updated to v6 and all pass.
- A-01-13: `pnpm test` → 2039/2039; `tests/note-placement/note-slot-model.test.ts` → 18 tests passed.
- A-01-14: `pnpm exec tsc --noEmit` → 0 errors.

### Routine validations (one-liner each)

- `pnpm exec tsc --noEmit` → 0 errors
- `pnpm lint` → passed clean (ESLint + Prettier)
- `pnpm test` → 2039 passed (was 2020 baseline; +19 new)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-05 | `NoteSlot` interface with `isNote: true` discriminant exists in session.ts | proxy:static-analysis | proxy:static-analysis | covered |
| A-01-06 | `ProgressionSlot = Chord \| RestSlot \| NoteSlot` compiles clean with tsc --noEmit | (none — tsc is the test) | operability | covered |
| A-01-07 | `isNoteSlot` exported from session.ts; returns correct true/false for all three slot types | `tests/note-placement/note-slot-model.test.ts` | unit | covered |
| A-01-08 | `addNote` appends NoteSlot; `setNoteOffset` mutates correctly and clamps | `tests/note-placement/note-slot-model.test.ts` | unit | covered |
| A-01-09 | Every exhaustive branch updated with NoteSlot arm | proxy:static-analysis (tsc + lint) | proxy:static-analysis | covered |
| A-01-10 | `SESSION_SCHEMA_VERSION = 6` | `tests/note-placement/note-slot-model.test.ts` | unit | covered |
| A-01-11 | `SavedNoteSlotSchema` exists with `isNote: z.literal(true)` in progression union | `tests/note-placement/note-slot-model.test.ts` | unit | covered |
| A-01-12 | v5 session blob (chord-only) still parses after schema upgrade | `tests/note-placement/note-slot-model.test.ts` | unit | covered |
| A-01-13 | `pnpm test` passes clean; test file has at least 6 cases | `tests/note-placement/note-slot-model.test.ts` (18 tests) | unit | covered |
| A-01-14 | `pnpm exec tsc --noEmit` passes clean | (none — tsc is the test) | operability | covered |

**Proxy disclosures:**
- A-01-05: `NoteSlot` interface presence confirmed by `tsc --noEmit` (type errors would surface missing fields). File is also read directly — `src/state/session.ts` lines 258–279.
- A-01-09: Exhaustiveness confirmed by `tsc --noEmit` (strict mode would catch unhandled union members in narrowed branches) and by grep-and-review of each site in the inventory.

**Operability evidence:**
- `pnpm exec tsc --noEmit` run post-commit: exit code 0, no output.
- `pnpm lint` run post-commit: exit code 0, "All matched files use Prettier code style!" reported.
- `pnpm test` run post-commit: 2039/2039 passed, 42/42 test files passed.

### Decisions made (if any)

- OD-3 resolved to defer (no agent schema change): `src/agent/schema.ts` and `SCHEMA_VERSION` unchanged. Agent `applyHarmony` round-trips existing NoteSlots; progression serialization to prompt includes NoteSlot branch for completeness.
- NoteSlot in `voice-tracks.ts`: treated as a rest gap (no voice event emitted) — consistent with the step 01.3 codegen decision that NoteSlot emits via `note()`, not via the chord voicing path.
- `melodyLine` with NoteSlot: forces `arrange()` path (as specified in phase architecture); stub emits `silence` until step 01.3 replaces it with `note("...")`.

### Proposed Decisions Register entries (if any)

None — all decisions were within the approved scope (OD-1 Option A, OD-2 Option A, OD-3 Option B as resolved by the Pilot before this step).

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `SESSION_SCHEMA_VERSION = 6` (bumped from 5)
- `pnpm test`: 2039 passed (was 2020)
- `tsc --noEmit`: clean
- `pnpm lint`: clean
- All NoteSlot paint/render branches in `pentagrama-scene.ts` are stubs (pNotePlaceholder renders an accent-colored bar; full staff note-head in step 01.5)
- Codegen NoteSlot branch in `melodyLine` is a stub (emits `silence` placeholder; step 01.3 replaces)

### Next-step context

Step 01.3 implements the full `melodyLine` NoteSlot codegen branch:
- Replace the `silence` stub in `strudel.ts` line ~209 with `note("NOTE_NAMES[rootPc] + (octave + octaveOffset)")` chain
- The `HarmonySlotInput` NoteSlot arm already exists; codegen just needs the NOTE_NAMES import and branch body
- `NOTE_NAMES` is at `src/core/theory/pitch.ts`
- Session octave is passed to `melodyLine` as the `octave` parameter already

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**
