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

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** 1 of 5
**Reason:**
**Next action:**
