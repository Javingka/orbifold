<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Handoff — Phase 01 (Block-as-State: editable foundation for round-trip Blocks)

---

## Step 01.1 — Discovery inventory (Checkpoint #1)

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `docs(editable-composition): Phase 01 step 01.1 — discovery inventory (Block round-trip)`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read `CLAUDE.md`, `docs/editable-composition/decisions.md` (three carried-forward rules; no active decisions yet), `docs/editable-composition/phases/phase-01.md` (full phase file), and `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md` step 03.1 (for handoff style reference).
- Read `src/core/composition/model.ts` (full — `Block` interface lines 12–20, `addBlock` codegen chain via `stripComments` lines 47–53, `buildComposition` lines 81–102).
- Read `src/state/session.ts` lines 1233–1263 (`addBlock`) and 1321–1329 (`playBlockById`), plus lines 1–430 for `SessionState`, `HarmonyState`, `RhythmState`, `Chord`, `RestSlot`, `ProgressionSlot` type definitions and codegen helpers `rhythmCode`/`harmonyCode`/`sessionCode`.
- Read `src/lib/persistence.ts` (full — `SavedBlockSchema` lines 100–105, `SavedSessionSchema` lines 133–143, `SESSION_SCHEMA_VERSION` line 18, `serializeSession` lines 155–229, `deserializeSession` lines 241–320).
- Read `src/agent/apply.ts` (full — confirmed no block/composition references; agent schema impact is nil).
- Read `src/agent/schema.ts` (full — `SCHEMA_VERSION = 4`, no block fields, no composition references).
- Read `src/core/rhythm/layers.ts` (full — `RhythmLayer` interface lines 18–29, `Sound` type line 9).
- Read `src/ui/CompositionDrawer.svelte` (full — identified all block-library UI touchpoints; block card loop lines 661–703; imports `addBlock`, `deleteBlock`, `renameBlock`, `playBlockById`, `addBlockAsNewTrack`; no `openBlock` action exists today).
- Used `grep`/`find` to identify all Svelte files referencing "composition" or "addBlock": `App.svelte`, `AgentPanel.svelte`, `CompositionDrawer.svelte`, `HarmonyControls.svelte`, `Header.svelte`, `Legend.svelte`, `ProgressionStrip.svelte`. Only `CompositionDrawer.svelte` renders block cards.
- Produced `docs/editable-composition/inventories/phase-01-inventory.md` covering all seven sections §(a)–§(g) with exact file paths and line ranges for every claim.
- Did NOT touch any source file (`.ts`, `.svelte`).

### Files touched

- `docs/editable-composition/inventories/phase-01-inventory.md` (created)
- `docs/editable-composition/handoffs/phase-01-handoff.md` (created, this entry)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in this docs-only step. The acceptance items for this phase (A-01-01 through A-01-12) are targeted by steps 01.3 through 01.5.

### Routine validations (one-liner each, no transcripts)

- `git status` → only `docs/editable-composition/inventories/phase-01-inventory.md` and `docs/editable-composition/handoffs/phase-01-handoff.md` as new untracked files. No `.ts` or `.svelte` files modified.

### Acceptance Coverage Table

No Acceptance IDs are covered in this docs-only inventory step.

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 through A-01-12 | (see phase file) | — | — | not yet — targeted in steps 01.3–01.5 |

### Decisions made (if any)

None — this is a read-only discovery step. Recommendations are in §(g) of the inventory as OQ-1 through OQ-4 for Pilot resolution.

### Proposed Decisions Register entries (if any)

None in this step. ADR 0020 decisions are scoped to step 01.2 (after Pilot resolves OQs at Checkpoint #1).

### Blockers resolved during this step (if any)

None.

### Environment state after this step

Clean working tree (docs-only). All prior quality gates (`pnpm test`, `tsc --noEmit`, `pnpm lint`) remain passing — no source files were modified.

### Next-step context (only if non-obvious)

The Pilot must resolve OQ-1 through OQ-4 at Checkpoint #1 before step 01.2 proceeds. The four OQs and their recommendations are:

- **OQ-1** (bpm in snapshot?): Recommendation — exclude bpm; include root/mode/octave in ArmoniaSnapshot.
- **OQ-2** (`code` field fate?): Recommendation — keep `code` alongside `snapshot` (additive; preserves `buildComposition` without changes; byte-identical-at-default for A-01-06).
- **OQ-3** (visual indicator for snapshot-less blocks?): Recommendation — add a small "legacy" badge, styled unobtrusively.
- **OQ-4** (`SesionSnapshot` flat or composite?): Recommendation — composite `{ groove: GrooveSnapshot; armonia: ArmoniaSnapshot }` (enables sub-type restore reuse; avoids discriminant collision).

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** 1 of 5
**Reason:**
**Next action:**

---

## Step 01.2 — ADR 0020: Block-as-State data model (Checkpoint #2)

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `docs(editable-composition): Phase 01 step 01.2 — ADR 0020 Block-as-State data model`
  - Hash: self-referential — not recorded

**Iteration:** 1 of 5

### Completed

- Read `CLAUDE.md`, `docs/editable-composition/decisions.md`, `docs/editable-composition/phases/phase-01.md` (step 01.2 scope and all seven decision targets D1–D7).
- Read `docs/editable-composition/inventories/phase-01-inventory.md` (full, including the "Pilot resolution — Checkpoint #1" section confirming OQ-1→A, OQ-2→A/B, OQ-3→indicator, OQ-4→Option B).
- Read existing ADRs `docs/adr/0018-chord-sound-attributes.md` and `docs/adr/0019-oscillator-and-presets.md` for style, structure, and Consequences table format.
- Produced `docs/adr/0020-block-as-state.md` covering all seven decisions D1–D7:
  - **D1** — Full `BlockSnapshot` discriminated union with exact TypeScript shapes for `GrooveSnapshot`, `ArmoniaSnapshot` (with `ChordSnapshotEntry` / `RestSnapshotEntry` / `ProgressionSnapshotEntry`), `SesionSnapshot` (composite per OQ-4), and the `BlockSnapshot` union.
  - **D2** — `Block.code` kept alongside optional `snapshot`; `buildComposition` unchanged; byte-identical-at-default guarantee stated (A-01-06).
  - **D3** — `root`, `mode`, `octave` included in `ArmoniaSnapshot`; `bpm` excluded from all snapshots; `openBlock` does not touch `state.bpm`.
  - **D4** — Snapshot-less blocks: fully playable, no "open in editor" button, discreet muted legacy badge with i18n tooltip (`composition.legacyBlockTip`); defensive/future-proof rationale stated.
  - **D5** — `SESSION_SCHEMA_VERSION` 4→5; `SavedBlockSchema` gains optional `snapshot?: z.discriminatedUnion(...)` field; lossy-drop for v4 blobs per established precedent (ADR 0013/0018/0019); canonical Zod shape provided; factoring left to step 01.4.
  - **D6** — `openBlock(blockId)` contract: find block, read snapshot, call appropriate `restore*` function, write delta via `sessionStore.update`, switch view (`'rhythm'` for groove, `'harmony'` for armonia/sesion), no auto-play, silent no-op for missing or snapshot-less blocks, does not touch bpm.
  - **D7** — `src/agent/schema.ts` unchanged (no block fields); `SCHEMA_VERSION` stays at 4; JSDoc guard added to `HarmonyChordCoreSchema` in step 01.4.
- Did NOT touch any source file (`.ts`, `.svelte`).

### Files touched

- `docs/adr/0020-block-as-state.md` (created)
- `docs/editable-composition/handoffs/phase-01-handoff.md` (updated, this entry)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in this docs-only step. The ADR decisions directly govern the implementation targets for:

- A-01-01 through A-01-05 (snapshot capture/restore fidelity) — governed by D1.
- A-01-06 (byte-identical-at-default) — governed by D2.
- A-01-07 (persistence round-trip) — governed by D5.
- A-01-08 through A-01-11 (manual acceptance) — governed by D4 and D6.
- A-01-12 (quality gate) — governed by all D1–D7 (no source changes in this step).

### Routine validations (one-liner each, no transcripts)

- `git status` → only `docs/adr/0020-block-as-state.md` and `docs/editable-composition/handoffs/phase-01-handoff.md` as new/modified files. No `.ts` or `.svelte` files appear.

### Acceptance Coverage Table

No Acceptance IDs are covered in this docs-only ADR step.

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 through A-01-12 | (see phase file) | — | — | not yet — ADR governs implementation; targeted in steps 01.3–01.5 |

### Decisions made (if any)

All seven decisions (D1–D7) are in `docs/adr/0020-block-as-state.md`. Each resolves one or more OQs from the inventory per the Pilot's Checkpoint #1 resolutions.

### Proposed Decisions Register entries (if any)

None in this step — the Decisions Register (`docs/editable-composition/decisions.md`) is updated only by the Pilot. The ADR is the authoritative record; the Pilot may add a summary entry to the register after Checkpoint #2 approval.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

Clean working tree (docs-only). All prior quality gates (`pnpm test`, `tsc --noEmit`, `pnpm lint`) remain passing — no source files were modified.

### Next-step context (only if non-obvious)

After Pilot approves the ADR at Checkpoint #2, step 01.3 implements:

- `src/core/composition/snapshot.ts` with the `BlockSnapshot` types and `capture*`/`restore*` functions per D1/D3.
- `Block.snapshot?: BlockSnapshot` extension to `src/core/composition/model.ts` per D2.
- `addBlock` update in `src/state/session.ts` per D2.
- `tests/snapshot.test.ts` covering A-01-01 through A-01-06.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** 1 of 5
**Reason:**
**Next action:**

---

## Step 01.3 — BlockSnapshot types + capture/restore engine + unit tests (Checkpoint #3)

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `feat(composition): Phase 01 step 01.3 — BlockSnapshot types + capture/restore engine + unit tests`
  - Hash: self-referential — not recorded

**Iteration:** 1 of 5

### Completed

- Read `CLAUDE.md`, `docs/editable-composition/decisions.md`, `docs/adr/0020-block-as-state.md` (full, all D1–D7 binding), `docs/editable-composition/phases/phase-01.md` (step 01.3 scope and A-01-01..A-01-06 acceptance criteria), `src/core/composition/model.ts` (full), `src/state/session.ts` (Chord, RhythmLayer, ProgressionSlot type declarations, `addBlock` function lines 1233–1263), and `src/core/rhythm/layers.ts` (Sound, RhythmLayer).
- Created `src/core/composition/snapshot.ts` — AGPL-3.0 header; pure engine (no DOM/PIXI/Svelte imports); exports:
  - Types: `GrooveSnapshot`, `ChordSnapshotEntry`, `RestSnapshotEntry`, `ProgressionSnapshotEntry`, `ArmoniaSnapshot`, `SesionSnapshot`, `BlockSnapshot` per ADR 0020 D1.
  - `captureGrooveSnapshot(state)` → `GrooveSnapshot` — shallow-copies layer arrays; copies optional euclid/muted/solo fields.
  - `captureArmoniaSnapshot(state)` → `ArmoniaSnapshot` — captures root/mode/octave/chordMode and full progression with all per-chord sound attributes (instrument, room, decay, preset, lpf, attack, sustain, release, lpenv, lpa, lpd, lpq); excludes cx/cy ephemeral render hints per D1.
  - `captureSesionSnapshot(state)` → `SesionSnapshot` — delegates to the two sub-capture functions.
  - `restoreGrooveSnapshot(snap)` → `Partial<SessionState>` — pure, no store write.
  - `restoreArmoniaSnapshot(snap)` → `Partial<SessionState>` — restores harmony + chordMode; uses default ephemeral values for `subview`/`registerMode` (openBlock caller merges existing state, so these are preserved).
  - `restoreSesionSnapshot(snap)` → `Partial<SessionState>` — merges groove delta and armonia delta.
- Extended `Block` in `src/core/composition/model.ts` with `snapshot?: BlockSnapshot` (optional per D2); added import for `BlockSnapshot` from snapshot.ts.
- Updated `addBlock` in `src/state/session.ts`: added import of `captureGrooveSnapshot`, `captureArmoniaSnapshot`, `captureSesionSnapshot`; after the existing code generation path, captures the appropriate snapshot and attaches it to the new block. `buildComposition` is unchanged (reads `block.code` only — A-01-06 guarantee intact).
- Created `tests/snapshot.test.ts` covering all acceptance items A-01-01 through A-01-06 plus `addBlock` discriminant tests. 29 new tests; total suite 675 (was 646).

### Files touched

- `src/core/composition/snapshot.ts` (created)
- `src/core/composition/model.ts` (extended: import + `snapshot?` field)
- `src/state/session.ts` (updated: snapshot imports + `addBlock` snapshot capture)
- `tests/snapshot.test.ts` (created)
- `docs/editable-composition/handoffs/phase-01-handoff.md` (updated, this entry)

### Validation evidence (per Acceptance ID)

- **A-01-01** — `tests/snapshot.test.ts` describe block "A-01-01: captureGrooveSnapshot → restoreGrooveSnapshot round-trip" (6 tests): layers, steps, euclid, muted/solo, discriminant, deep-copy isolation, empty array.
- **A-01-02** — `tests/snapshot.test.ts` describe block "A-01-02: captureArmoniaSnapshot → restoreArmoniaSnapshot round-trip" (6 tests): root/mode/octave/chordMode, chord slots, rest slots, discriminant, bpm exclusion, empty progression.
- **A-01-03** — `tests/snapshot.test.ts` describe block "A-01-03: captureSesionSnapshot → restoreSesionSnapshot round-trip" (3 tests): both sub-states, discriminants, delegation equivalence.
- **A-01-04** — `tests/snapshot.test.ts` describe block "A-01-04: captureArmoniaSnapshot preserves all per-chord sound attributes" (2 tests): all 12 ADR 0018/0019 attributes captured; no spurious undefined keys on minimal chord.
- **A-01-05** — `tests/snapshot.test.ts` describe block "A-01-05: restoreArmoniaSnapshot restores per-chord sound attributes faithfully" (2 tests): all 12 attributes survive restore; no spurious extra fields for minimal chord.
- **A-01-06** — `tests/snapshot.test.ts` describe block "A-01-06: buildComposition is byte-identical when snapshot is absent" (3 tests): snapshot-absent block, snapshot-present vs absent (same code → same output), two blocks with different snapshots but same code → same output.

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → clean (0 errors).
- `pnpm lint` → clean (ESLint + Prettier).
- `pnpm exec vitest run` → 675 tests passed (18 test files), 0 failures. Prior suite was 646 tests; 29 new snapshot tests added.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | groove round-trip fidelity | `tests/snapshot.test.ts` — "A-01-01" describe (6 tests) | unit | CLOSED |
| A-01-02 | armonia round-trip fidelity | `tests/snapshot.test.ts` — "A-01-02" describe (6 tests) | unit | CLOSED |
| A-01-03 | sesion round-trip fidelity | `tests/snapshot.test.ts` — "A-01-03" describe (3 tests) | unit | CLOSED |
| A-01-04 | per-chord sound attrs captured | `tests/snapshot.test.ts` — "A-01-04" describe (2 tests) | unit | CLOSED |
| A-01-05 | per-chord sound attrs restored | `tests/snapshot.test.ts` — "A-01-05" describe (2 tests) | unit | CLOSED |
| A-01-06 | byte-identical-at-default (flag-off equivalent) | `tests/snapshot.test.ts` — "A-01-06" describe (3 tests) | unit | CLOSED |
| A-01-07 | persistence round-trip | `tests/persistence.test.ts` (future — step 01.4) | unit | open — step 01.4 |
| A-01-08 | manual: groove re-open | — | manual | open — step 01.5 |
| A-01-09 | manual: armonia re-open | — | manual | open — step 01.5 |
| A-01-10 | manual: sesion re-open | — | manual | open — step 01.5 |
| A-01-11 | manual: legacy block no edit button | — | manual | open — step 01.5 |
| A-01-12 | quality gate (all tools clean) | automated (all CI commands pass) | automated | CLOSED for this step |

### Decisions made (if any)

No new decisions. All implementation follows ADR 0020 D1–D7 exactly as approved at Checkpoint #2.

One implementation note on `restoreArmoniaSnapshot`: the `HarmonyState` return includes `subview: 'tonnetz'` and `registerMode: 'suavizado'` defaults. The `openBlock` action in step 01.5 should use `sessionStore.update((s) => ({ ...s, ...delta, harmony: { ...s.harmony, ...delta.harmony } }))` to preserve existing ephemeral fields. This is a step 01.5 concern, noted here for continuity.

### Proposed Decisions Register entries (if any)

None — all required decisions are already in ADR 0020.

### Prototype parity

N/A — `src/core/composition/snapshot.ts` is new infrastructure, not a port of prototype logic. The byte-identical-at-default guarantee (A-01-06) serves the same role as the flag-off invariant required by the reversibility checklist item.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.
- `pnpm exec vitest run` → 675 tests pass, 0 failures.
- Working tree: 4 source files modified/created + this handoff.

### Next-step context (only if non-obvious)

Step 01.4 must:
1. Bump `SESSION_SCHEMA_VERSION` to 5 in `src/lib/persistence.ts`.
2. Add the `snapshot?` field to `SavedBlockSchema` as a Zod discriminated union mirroring the TypeScript types added in this step.
3. Update `serializeSession`/`deserializeSession` to carry snapshots through.
4. Add JSDoc guard to `HarmonyChordCoreSchema` in `src/agent/schema.ts` (D7).
5. Add persistence tests for A-01-07.

The `openBlock` ephemeral field merging note above is a step 01.5 concern — no action needed in step 01.4.

### Planner Review

**Decision:** APPROVED
**Reviewed on:** 2026-06-18
**Iteration:** 1 of 5
**Reason:** All 8 checklist items pass and both project-specific items (core purity, AGPL-3.0 header) pass; snapshot.ts implements ADR 0020 D1–D3 types exactly, capture/restore functions are confirmed pure, A-01-04/A-01-05 explicitly test all 12 per-chord sound attributes, A-01-06 directly verifies byte-identical buildComposition output, addBlock discriminant tests confirm all three block types, 29 new tests bring the suite to 675, and quality gates are clean.
**Next action:** Dev proceeds to step 01.4

---

## Step 01.4 — Persistence schema v5 and agent schema guard

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `feat(schema): Phase 01 step 01.4 — persistence schema v5 + Block snapshot serialization`
  - Hash: self-referential — not recorded

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/editable-composition/decisions.md`, `docs/adr/0020-block-as-state.md` (D5, D7 binding), `docs/editable-composition/phases/phase-01.md` (step 01.4 scope), `src/lib/persistence.ts` (full), `src/agent/schema.ts` (full), and `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md` step 03.4 (schema-bump style reference).
- **`src/lib/persistence.ts`:**
  - Bumped `SESSION_SCHEMA_VERSION` from `4` to `5`.
  - Changed `SavedSessionSchema` `version` literal from `z.literal(4)` to `z.literal(5)`.
  - Added eight extracted named Zod sub-schemas immediately before `SavedBlockSchema`:
    - `SavedGrooveLayerSchema` — mirrors `GrooveSnapshot.layers[number]`.
    - `SavedGrooveSnapshotSchema` — `type: z.literal('groove')` + layers.
    - `SavedChordSnapshotEntrySchema` — all 15 chord fields from ADR 0020 D1 + ADR 0018 D1 + ADR 0019 D4a (A-01-04 coverage).
    - `SavedRestSnapshotEntrySchema` — `isRest: z.literal(true)` + optional bars.
    - `SavedArmoniaSnapshotSchema` — `type: z.literal('armonia')` + root/mode/octave/chordMode + progression union (rest first per ADR 0012 D4 precedent).
    - `SavedSesionSnapshotSchema` — `type: z.literal('sesion')` + `groove: SavedGrooveSnapshotSchema` + `armonia: SavedArmoniaSnapshotSchema`.
    - `SavedBlockSnapshotSchema` — `z.discriminatedUnion('type', [...])` over the three snapshot schemas.
  - Added `snapshot: SavedBlockSnapshotSchema.optional()` to `SavedBlockSchema`.
  - Updated `serializeSession`: spreads `snapshot` onto each block when present (omitted via `...({})` when undefined, per Zod's JSON serialization defaults).
  - Updated `deserializeSession`: spreads `snapshot` onto each block when present; absent → `undefined` (legacy block, ADR 0020 D4).
- **`src/agent/schema.ts`:** Added the ADR 0020 D7 JSDoc guard to `HarmonyChordCoreSchema` noting that block snapshot fields are a composition-layer concern defined in `snapshot.ts` and must not be added here. `SCHEMA_VERSION` unchanged at `4`.
- **`tests/persistence.test.ts`:**
  - Updated `MINIMAL_SAVED` and `FULL_SAVED` fixtures from `version: 4` to `version: 5`.
  - Updated all inline `version: 4` literals in test bodies to `version: 5` (or to `version: 4` where the test now asserts the v4 blob is rejected).
  - Updated the `SESSION_SCHEMA_VERSION is 4` test to assert `5`; updated the "accepts version 4" test to "rejects version 4"; added new "accepts version 5" test; updated "rejects version 5" to "rejects version 6".
  - Added the `ADR 0020 D5: schema v5 — Block snapshot persistence (A-01-07)` describe block with 6 tests: v4 drop, groove round-trip, armonia round-trip (with rest + sound attrs), sesion round-trip, snapshot-absent block loads as snapshot-less, invalid snapshot discriminant rejected.
- **`tests/schema.test.ts`:** Updated `SCHEMA_VERSION` describe block comment and test name to explicitly document that the agent schema version remains `4` per ADR 0020 D7. Assertion value unchanged.
- **`tests/session.test.ts`:** Updated 3 version-literal fixtures in the `SavedChordSchema backward-compat` describe block from `version: 4` to `version: 5` (behavior unchanged; version-literal updates only per the step scope).

### Files touched

- `src/lib/persistence.ts` (`SESSION_SCHEMA_VERSION` 4→5; `SavedBlockSnapshotSchema` sub-schemas added; `SavedBlockSchema` + `serialize`/`deserialize` updated)
- `src/agent/schema.ts` (JSDoc guard on `HarmonyChordCoreSchema`; no structural change)
- `tests/persistence.test.ts` (version literals 4→5; A-01-07 describe block added)
- `tests/schema.test.ts` (SCHEMA_VERSION describe comment/name updated; assertion value unchanged at 4)
- `tests/session.test.ts` (3 version-literal fixture updates)
- `docs/editable-composition/handoffs/phase-01-handoff.md` (this entry)

### Validation evidence (per Acceptance ID)

- **A-01-07** — `tests/persistence.test.ts` — "ADR 0020 D5: schema v5 — Block snapshot persistence (A-01-07)" describe block (6 tests):
  - v4 drop: `version: 4` blob fails `z.literal(5)`, `safeParse` returns false.
  - Groove round-trip: serialized → JSON → parse → deserialize; layers/steps/euclid/muted preserved.
  - Armonia round-trip: progression (chord + rest + chord with sound attrs) + root/mode/octave/chordMode preserved.
  - Sesion round-trip: both groove and armonia sub-snapshots preserved.
  - Snapshot-absent block: v5 session without `snapshot` on a block loads with `block.snapshot === undefined`; block still usable via `code`.
  - Invalid discriminant: `{ type: 'unknown-type' }` snapshot rejected by `z.discriminatedUnion`.

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → clean (0 errors).
- `pnpm lint` → clean (ESLint + Prettier).
- `pnpm exec vitest run` → **682 tests pass** (18 test files). Prior count: 675. New tests: 1 (new "accepts version 5") + 6 (A-01-07 block) = 7 net new.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | groove round-trip fidelity | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-02 | armonia round-trip fidelity | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-03 | sesion round-trip fidelity | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-04 | per-chord sound attrs captured | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-05 | per-chord sound attrs restored | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-06 | byte-identical-at-default | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-07 | persistence round-trip (v5 session; v4 drop; snapshot-absent loads OK; invalid discriminant rejected) | `tests/persistence.test.ts` — "ADR 0020 D5" describe (6 tests) | unit | **CLOSED** |
| A-01-08 | manual: groove re-open | — | manual | open — step 01.5 |
| A-01-09 | manual: armonia re-open | — | manual | open — step 01.5 |
| A-01-10 | manual: sesion re-open | — | manual | open — step 01.5 |
| A-01-11 | manual: legacy block no edit button | — | manual | open — step 01.5 |
| A-01-12 | quality gate (all tools clean) | automated | automated | CLOSED for this step |

### Decisions made (if any)

**Zod sub-schema factoring strategy:** The `SesionSnapshot` variant's `groove` and `armonia` sub-objects are extracted as named `SavedGrooveSnapshotSchema` and `SavedArmoniaSnapshotSchema` variables. This allows `SavedSesionSnapshotSchema` to compose them without inlining, avoids the verbosity of a deeply nested literal, and keeps the session snapshot Zod schema readable and maintainable. The extracted schemas are module-private (not exported from `persistence.ts`).

**Rest-first ordering in armonia progression:** `SavedArmoniaSnapshotSchema`'s progression uses `z.union([SavedRestSnapshotEntrySchema, SavedChordSnapshotEntrySchema])` with rest listed first, following ADR 0012 D4 precedent (same as `SavedHarmonySchema`). This ensures `{ isRest: true }` always parses as a rest regardless of other fields.

### Proposed Decisions Register entries (if any)

None new — all required decisions are already in ADR 0020.

### Prototype parity

N/A — persistence schema changes are infrastructure, not a port of prototype logic.

### Blockers resolved during this step (if any)

None. TypeScript structural compatibility between `Block.snapshot` (`BlockSnapshot | undefined`) and the Zod-inferred `SavedBlockSnapshotSchema` type was confirmed by clean `tsc --noEmit` — both are structurally equivalent discriminated unions.

### Environment state after this step

- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.
- `pnpm exec vitest run` → 682 tests pass (18 test files), 0 failures.
- `SESSION_SCHEMA_VERSION = 5`. `SCHEMA_VERSION = 4` (unchanged).
- `SavedBlockSchema` carries optional `snapshot?` with `z.discriminatedUnion`.
- v4 sessions are gracefully dropped (lossy per ADR 0020 D5). v5 sessions with or without block snapshots parse correctly.
- `src/agent/schema.ts` carries the D7 JSDoc guard on `HarmonyChordCoreSchema`; no structural change.

### Auto-continuation

**BLOCKED — Pilot/Planner Checkpoint review required before step 01.5.**

Step 01.4 is a checkpoint step. Step 01.5 (openBlock action + UI round-trip button + i18n) begins only after the Planner reviews and approves this entry.

### Planner Review

**Decision:** APPROVED
**Reviewed on:** 2026-06-18
**Iteration:** 1 of 5
**Reason:** All 8 checklist items pass and both project-specific items (AGPL-3.0 header confirmed, prototype parity N/A). SESSION_SCHEMA_VERSION=5 and z.literal(5) confirmed at source. SavedBlockSnapshotSchema discriminated union verified field-by-field against BlockSnapshot TS types — all 12 per-chord sound attributes present in SavedChordSnapshotEntrySchema, rest-first ordering correct per ADR 0012 D4, SesionSnapshot composite shape congruent. Agent SCHEMA_VERSION stays 4; D7 JSDoc guard on HarmonyChordCoreSchema confirmed. A-01-07 Coverage Table maps all six sub-criteria to real (de)serialization tests (no mocked bypass). 682 tests pass (675 + 7 net new). Quality gates clean.
**Next action:** Dev proceeds to step 01.5

---

**Terminal commit:** `feat(schema): Phase 01 step 01.4 — persistence schema v5 + Block snapshot serialization`

- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 01.5 — `openBlock` action + round-trip UI button + i18n + quality gate (Checkpoint #5)

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `feat(composition): Phase 01 step 01.5 — openBlock action + round-trip UI button + i18n + quality gate`
  - Hash: self-referential — not recorded

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/editable-composition/decisions.md`, `docs/adr/0020-block-as-state.md` (D4, D6 binding), `docs/editable-composition/phases/phase-01.md` (step 01.5 scope and all Acceptance IDs A-01-08..A-01-12), all prior step handoff entries in this file, `src/state/session.ts` (full), `src/ui/CompositionDrawer.svelte` (full — block-card `{#each}` ~lines 661–703), `src/i18n/types.ts` (full), and all four locale files (es/en/pt/zh) for the current key inventory.
- Read `src/core/composition/snapshot.ts` (restore function signatures and return types) to confirm the delta shapes used by `openBlock`.
- **`src/state/session.ts`:**
  - Added imports for `restoreGrooveSnapshot`, `restoreArmoniaSnapshot`, `restoreSesionSnapshot` alongside the existing capture imports.
  - Exported `openBlock(blockId: string): void` per ADR 0020 D6:
    - Reads `get(sessionStore)`, finds block by id; if not found → no-op.
    - If `block.snapshot === undefined` → no-op (D4 / D6 §3).
    - Calls appropriate `restore*Snapshot` function based on `snapshot.type`.
    - Writes the `Partial<SessionState>` delta via `sessionStore.update`, spreading existing ephemeral harmony fields (`subview`, `registerMode`) so openBlock does not reset the user's Tonnetz/staff preference (noted as a step 01.5 concern in the step 01.3 handoff).
    - Also writes `view: targetView` (`'rhythm'` for groove, `'harmony'` for armonia/sesion) inside the same update.
    - Calls `getStage().then((m) => m.setView(targetView))` via the existing lazy stage-module pattern (mirrors `setView` in step 09.3) to synchronize the PIXI layer visibility.
    - Does NOT call `runNow`, `stopAll`, or any audio transport operation (D6 §7).
    - Does NOT touch `state.bpm` (D3 / D6 §7).
- **`src/ui/CompositionDrawer.svelte`:**
  - Added `openBlock` to the import list from `'../state/session.js'`.
  - Inside the `{#each $sessionStore.composition.blocks as b (b.id)}` block:
    - Added a `{#if b.snapshot === undefined}` conditional rendering a `<span class="blk-legacy">` badge with `title={$t('composition.legacyBlockTip')}` (ADR 0020 D4 / D6 §3).
    - Added a `{#if b.snapshot !== undefined}` conditional rendering a `<button class="blk-open">` with `title={$t('composition.openBlockTip')}` and `on:click={() => openBlock(b.id)}` (ADR 0020 D6).
  - Added CSS rules in `<style>`:
    - `.blk-legacy` — 9px muted uppercase badge, `color: var(--faint)`, `border: 1px solid var(--stroke)`, `cursor: help`. Consistent with sober Apple-like aesthetic (ADR 0011); does not suggest a playback error.
    - `.blk-open` — 11px accent-colored button (`#8aa0ff` — ADR 0011 edit-mode accent), transparent background with a 35% opacity accent border; hover state adds a 10% opacity accent background fill. Matches the aesthetic of existing block action buttons.
- **`src/i18n/types.ts`:** Added three new keys to the `composition` interface:
  - `openBlock: string` — "open in editor" button label.
  - `openBlockTip: string` — tooltip on the open button.
  - `legacyBlockTip: string` — tooltip on the legacy badge.
- **Locale files — all four updated:**
  - `es.ts`: `openBlock: '✎ abrir'`, explanatory tooltip strings in Spanish.
  - `en.ts`: `openBlock: '✎ open'`, explanatory tooltip strings in English.
  - `pt.ts`: `openBlock: '✎ abrir'`, explanatory tooltip strings in Portuguese.
  - `zh.ts`: `openBlock: '✎ 打开'`, explanatory tooltip strings in Chinese.
- **i18n key parity:** `tests/i18n/key-parity.test.ts` (8 tests) passes — all four locale files carry the new keys.

### Files touched

- `src/state/session.ts` (`restoreGrooveSnapshot`/`restoreArmoniaSnapshot`/`restoreSesionSnapshot` imports added; `openBlock` exported)
- `src/ui/CompositionDrawer.svelte` (`openBlock` imported; legacy badge + open button added to block card loop; `.blk-legacy` + `.blk-open` CSS added)
- `src/i18n/types.ts` (three new `composition.*` keys added)
- `src/i18n/locales/es.ts` (three new keys added — Spanish)
- `src/i18n/locales/en.ts` (three new keys added — English)
- `src/i18n/locales/pt.ts` (three new keys added — Portuguese)
- `src/i18n/locales/zh.ts` (three new keys added — Chinese)
- `docs/editable-composition/handoffs/phase-01-handoff.md` (this entry)

### Validation evidence (per Acceptance ID)

- **A-01-08** — Manual. Verification path: (1) In Ritmo view, add at least two layers and toggle some steps; (2) Switch to Composition view, click "💾 groove actual"; (3) The new block card shows "✎ abrir" button; (4) Click "✎ abrir"; (5) The view switches to Ritmo and the layers/steps match what was saved.
- **A-01-09** — Manual. Verification path: (1) In Armonía view, add 2–3 chords with different root/qual/sound attributes; (2) Switch to Composition, click "💾 armonía actual"; (3) Block card shows "✎ abrir"; (4) Click it; (5) View switches to Armonía; Pentagrama + chord slots show the same progression, root, mode, octave, and sound attributes as at save time.
- **A-01-10** — Manual. Verification path: (1) Set up both rhythm and harmony, then click "💾 sesión actual"; (2) Block card shows "✎ abrir"; (3) Click it; (4) View switches to Armonía (harmony is the lead view per ADR 0020 D6 §6); (5) Both Ritmo state and Armonía state are restored (navigate to Ritmo to confirm layers).
- **A-01-11** — Manual. Verification path: (1) Load a session saved before this phase (or manually downgrade `SESSION_SCHEMA_VERSION` to force the drop, confirming no old block survives); in normal use, legacy blocks arise only from deliberate `Block` construction without a snapshot; the badge "legacy" appears and no "✎ abrir" button is rendered. Alternatively, write a test block directly: see automated path below where `snapshot === undefined` is the guard.
- **A-01-12** — Automated (all quality gates clean):
  - `pnpm exec tsc --noEmit` → 0 errors.
  - `pnpm lint` → ESLint + Prettier clean.
  - `pnpm exec vitest run` → 682 tests pass (18 test files); `tests/i18n/key-parity.test.ts` (8 tests) includes new key assertions.
  - `pnpm build` → exit code 0 (Vite informational warnings about chunk size and dynamic-import chunking are pre-existing and not new).

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → clean (0 errors).
- `pnpm lint` → ESLint + Prettier clean.
- `pnpm exec vitest run` → 682 tests pass (18 test files), 0 failures. No new test files in this step (the implementation targets manual acceptance items A-01-08..A-01-11).
- `pnpm build` → exit code 0.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | groove round-trip fidelity | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-02 | armonia round-trip fidelity | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-03 | sesion round-trip fidelity | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-04 | per-chord sound attrs captured | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-05 | per-chord sound attrs restored | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-06 | byte-identical-at-default | `tests/snapshot.test.ts` (step 01.3) | unit | CLOSED (step 01.3) |
| A-01-07 | persistence round-trip | `tests/persistence.test.ts` (step 01.4) | unit | CLOSED (step 01.4) |
| A-01-08 | manual: groove re-open | see "Validation evidence" above | manual | READY FOR PILOT (Checkpoint #5) |
| A-01-09 | manual: armonia re-open | see "Validation evidence" above | manual | READY FOR PILOT (Checkpoint #5) |
| A-01-10 | manual: sesion re-open | see "Validation evidence" above | manual | READY FOR PILOT (Checkpoint #5) |
| A-01-11 | manual: legacy block no edit button | see "Validation evidence" above | manual | READY FOR PILOT (Checkpoint #5) |
| A-01-12 | quality gate (all tools clean) | automated — `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm exec vitest run`, `pnpm build` | automated | **CLOSED** |

### Decisions made (if any)

**Ephemeral harmony field merging in `openBlock`:** The `openBlock` implementation spreads the current store's `harmony.subview` and `harmony.registerMode` values over the `restoreArmoniaSnapshot` result (which returns default ephemeral values) before writing to the store. This preserves the user's Tonnetz/staff preference across openBlock calls, as noted as a step 01.5 concern in the step 01.3 handoff. This is a pure implementation detail within the D6 contract — no new ADR needed.

**View switch uses both store update and lazy `getStage().setView` call:** To match the established `setView` pattern in `session.ts` (step 09.3), `openBlock` writes `view: targetView` inline inside `sessionStore.update` (so the store is consistent) and then calls `getStage().then((m) => m.setView(targetView))` for the PIXI layer. This is the only correct pattern given the lazy-import constraint (PIXI must not be imported at module-eval time in Node/Vitest).

### Proposed Decisions Register entries (if any)

None — all required decisions are already in ADR 0020.

### Prototype parity

N/A — `openBlock` is new infrastructure (no prototype equivalent for re-opening a saved block in the editor). The byte-identical-at-default guarantee (A-01-06, closed in step 01.3) confirms the parity invariant from the reversibility checklist.

### Blockers resolved during this step (if any)

None. The lazy stage-import pattern for `setView` was already established in step 09.3; `openBlock` reuses it without modification.

### Environment state after this step

- `pnpm exec tsc --noEmit` → clean (0 errors).
- `pnpm lint` → clean (ESLint + Prettier).
- `pnpm exec vitest run` → 682 tests pass (18 test files), 0 failures.
- `pnpm build` → exit code 0.
- `openBlock` is exported from `src/state/session.ts`.
- All four locale files carry the three new `composition.*` keys; `key-parity.test.ts` passes.
- Manual acceptance items A-01-08..A-01-11 are ready for Pilot review at Checkpoint #5.

### Planner Review

**Decision:** APPROVED
**Reviewed on:** 2026-06-18
**Iteration:** 1 of 5
**Reason:** All 8 checklist items pass and both project-specific items (AGPL-3.0 present in both modified files, prototype parity N/A). openBlock contract verified line-by-line against ADR 0020 D6: block-not-found no-op, snapshot-absent no-op (no error, no view switch), correct restore* dispatch per discriminant, bpm untouched, no runNow/stopAll, ephemeral harmony fields preserved via explicit subview/registerMode spread. UI guard conditions verified: legacy badge rendered only on snapshot===undefined, open button rendered only on snapshot!==undefined (mutually exclusive). All three i18n keys confirmed in types.ts and all four locales. A-01-08..A-01-11 provide concrete Pilot-executable manual verification paths. A-01-12 quality gate (tsc + lint + vitest 682 + build) closed. No ID unmapped across the full phase.
**Next action:** Pilot approval required before phase completion, reason: Phase 01 is complete — A-01-08..A-01-11 require Pilot manual acceptance at Checkpoint #5 before the phase can be marked done.

**Pending Register proposals (Pilot decides at phase approval):**
None — all required decisions are in ADR 0020; no new Register entries were proposed across steps 01.3–01.5.

---

## Checkpoint #5 Bug-fix — block-card action buttons occluded by the tracks section

**Date:** 2026-06-18

**Commit:** `fix(composition): Phase 01 Checkpoint #5 — block-card action buttons occluded by tracks section`

**Iteration:** 2 of 5 (bug-fix — no new Planner review required; Pilot-directed fix)

### Root cause

The `.blk` block card in `src/app/app.css` was a single-row `display: flex; align-items: center` container. Before step 01.5 the row held: type tag, editable name (`flex: 1`), mini code preview (`max-width: 230px`), and three action buttons (▶, ↳ pista, 🗑). Step 01.5 added a fourth action element (`.blk-legacy` badge or `.blk-open` button), making the total content wider than the 300 px column available in the two-column layout. Because the row had no `flex-wrap` and the column had no `overflow: visible` guard, the overflowing elements slid behind the second column (the timeline panel), rendering the 🗑 button fully inaccessible and ↳ pista partially inaccessible.

### Fix

Restructured the `.blk` card from a single flat flex row to a two-row column layout:

- **`src/app/app.css`:** Changed `.blk` to `display: flex; flex-direction: column; gap: 6px`. Added two new utility classes:
  - `.blk-meta` — first row: type tag + editable name, `align-items: center; gap: 8px; min-width: 0`.
  - `.blk-actions` — second row: mini code preview + badge/open button + all action buttons, `align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0`. The `flex-wrap: wrap` ensures all buttons stay visible even on narrow viewports. The `.blk .mini` no longer uses `max-width: 230px`; instead it uses `flex: 1; min-width: 0` to fill available space before the fixed-width buttons.

- **`src/ui/CompositionDrawer.svelte`:** Wrapped the type tag and name span in a `<div class="blk-meta">`, and wrapped the mini preview, legacy badge, open button, and three action buttons in a `<div class="blk-actions">`.

No i18n changes. No new keys. No logic changes. The `.blk-legacy` and `.blk-open` conditional visibility guards (`b.snapshot === undefined` / `b.snapshot !== undefined`) are unchanged.

### Manual re-verification path (for Pilot)

Load the Composition view with one or more saved blocks. Confirm:

1. The 🗑 (delete) button is fully visible and clickable on every block card.
2. The ↳ pista (add-track) button is fully visible and clickable.
3. On blocks with a snapshot, the ✎ abrir button appears on the second row alongside ▶ and the other buttons.
4. On blocks without a snapshot, the "legacy" badge appears on the second row.
5. None of the buttons are occluded by the timeline section.
6. The card layout looks clean — type tag + name on the first row; code preview + action buttons on the second row.

### Bug-fix files touched

- `src/app/app.css` (`.blk` restructured; `.blk-meta` and `.blk-actions` added; `.blk .mini` width constraint changed)
- `src/ui/CompositionDrawer.svelte` (block card markup wrapped in `.blk-meta` / `.blk-actions` sub-divs)
- `docs/editable-composition/handoffs/phase-01-handoff.md` (this entry)

### Bug-fix validations

- `pnpm exec tsc --noEmit` → clean (0 errors).
- `pnpm lint` → ESLint + Prettier clean.
- `pnpm exec vitest run` → 682 tests pass (18 test files), 0 failures. Test count unchanged (CSS/markup-only fix).
- `pnpm build` → exit code 0 (pre-existing chunk-size warnings only; no new warnings).

### Bug-fix Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
| --- | --- | --- | --- | --- |
| A-01-08 | manual: groove re-open | see step 01.5 verification path | manual | READY FOR PILOT — layout regression fixed |
| A-01-09 | manual: armonia re-open | see step 01.5 verification path | manual | READY FOR PILOT — layout regression fixed |
| A-01-10 | manual: sesion re-open | see step 01.5 verification path | manual | READY FOR PILOT — layout regression fixed |
| A-01-11 | manual: legacy block no edit button | see step 01.5 verification path | manual | READY FOR PILOT — layout regression fixed |
| A-01-12 | quality gate | automated | automated | CLOSED |

---

## Pilot Checkpoint #5 — Phase 01 COMPLETE (2026-06-18)

Pilot (Javier) ran manual acceptance and resolved the checkpoint:

- **A-01-08 (groove round-trip)** — PASS.
- **A-01-09 (armonia round-trip, incl. per-chord sound attrs)** — PASS.
- **A-01-10 (sesion round-trip, both ritmo+armonia)** — PASS.
- **A-01-11 (legacy block: playable, no ✎ button)** — PASS (defensive; no in-the-wild legacy blocks after the v4→v5 lossy drop).
- **A-01-12 (quality gate)** — CLOSED (`tsc` + `lint` + 682 tests + `build` exit 0).

One Checkpoint #5 layout regression was reported (✎ button pushed the block-card action row behind the timeline column, occluding 🗑 and ↳ pista) and fixed (`.blk` restructured to a two-row layout with `flex-wrap`); Pilot re-verified the fix — all four action buttons visible, clickable, and clean.

**All 12 acceptance IDs closed. PHASE 01 COMPLETE.** Block-as-State foundation shipped: blocks carry an editable `snapshot`, `code` stays canonical for playback (byte-identical-at-default preserved), persistence at schema v5, and `openBlock` restores a block into the Ritmo/Armonía editors without auto-play. This is the data-model dependency for the future AI-composition-authoring and AI-jam initiatives.
