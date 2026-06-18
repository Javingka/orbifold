# Phase 01 — Block-as-State: editable foundation for round-trip Blocks

**Purpose:** Replace the opaque-code `Block` with a structured snapshot of the editable state it was built from, so any Block can be re-opened in the Armonía or Ritmo editor without parsing Strudel code.
**Gate:** The `harmonic-rhythm-improvements` initiative is complete and merged to `main` (646 tests pass, `tsc --noEmit` and `pnpm lint` clean); the `editable-composition` decisions register is in place.
**Expected phase result:** `Block` carries a typed `snapshot` field (harmony progression + root/mode/octave/bpm context, or rhythm layers, or both); `code` is derived from the snapshot at save time; an "open in editor" action restores the snapshot into the live stores; persistence schema bumped to v5; existing blocks without a snapshot continue to load (additive migration); `pnpm test` passes clean with ≥ the prior test count.

---

## Step 01.1 — Discovery inventory

PROMPT → Read `CLAUDE.md`, `docs/editable-composition/decisions.md`, this phase file, and the most recent handoff (`docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md`). Read `src/core/composition/model.ts` (full), `src/state/session.ts` (`addBlock` ~1233–1263, `playBlockById` ~1321–1329), `src/lib/persistence.ts` (full `SavedBlockSchema` and `SavedCompositionSchema`), `src/agent/apply.ts` (full), and the composition-facing sections of any Svelte component that renders the block library or calls `addBlock`. Do NOT open any other source files beyond what is needed to answer the questions below. Do NOT edit any source file.

Produce `docs/editable-composition/inventories/phase-01-inventory.md` covering exactly the following sections:

- **§(a) Current Block model and codegen path** — reproduce the `Block` interface fields and `addBlock` derivation path for each `type` (`groove`, `armonia`, `sesion`); note what state is consumed, what is stripped, and what is lost at save time.
- **§(b) What each block type needs to round-trip** — enumerate the minimal editable state snapshot that would allow each of `groove`, `armonia`, `sesion` to be re-opened in the Ritmo or Armonía editor with no data loss. For `sesion` note whether a single combined snapshot or two separate sub-snapshots (one rhythm, one harmony) is more appropriate.
- **§(c) Persistence impact** — describe the current `SavedBlockSchema` (fields, version), what new fields are required, whether the change is additive (old blocks load as snapshot-less), and what `SESSION_SCHEMA_VERSION` must become.
- **§(d) Agent schema impact** — describe whether `src/agent/schema.ts` references blocks or composition at all; if not, state that no agent schema change is required in this phase.
- **§(e) UI touchpoints for "open block in editor"** — enumerate every Svelte component or action that would need to change to support a user opening a saved block back into the live editor (a new `openBlock(blockId)` action; any button in the block library UI). Note whether the current Composition view has a block list with edit/open controls.
- **§(f) Concrete proposed `BlockSnapshot` shape** — write out the proposed TypeScript types (as pseudo-code in the inventory, not in source) for `GrooveSnapshot`, `ArmoniaSnapshot`, `SesionSnapshot`, and the discriminated union `BlockSnapshot`. State clearly which fields come from `SessionState.harmony`, which from `SessionState.rhythm`, and which from global context (bpm, root, mode, octave).
- **§(g) Open questions** — list each unresolved decision as OQ-N with a concrete recommendation for the Pilot to accept or override. Expected OQs include: (1) whether bpm/root/mode/octave belong in the snapshot or are treated as playback context; (2) whether the `code` field is kept redundantly alongside the snapshot or removed; (3) whether old snapshot-less blocks should be silently playable-only or surfaced with a visual indicator; (4) whether `SesionSnapshot` is a flat combined type or `{ groove: GrooveSnapshot, armonia: ArmoniaSnapshot }`.

STOP after writing the inventory. Do not proceed to step 01.2 until the Pilot resolves OQs at Checkpoint #1.

Implementation requirements:
- No source files modified — docs only.
- Inventory must cite exact file paths and line ranges for every claim about current code.
- Inventory sections §(f) and §(g) must be present and non-empty; a skeleton or "TBD" is not acceptable.

Validation:
- `git status` shows only `docs/editable-composition/inventories/phase-01-inventory.md` and the handoff as new/modified files.
- No `.ts` or `.svelte` files appear in `git status`.

Expected result:
- `docs/editable-composition/inventories/phase-01-inventory.md` exists and covers all seven sections §(a)–§(g).
- The Pilot has all information needed to resolve OQs and approve (or redirect) the proposed `BlockSnapshot` shape at Checkpoint #1.

CHECKPOINT → Commit message:
`docs(editable-composition): Phase 01 step 01.1 — discovery inventory (Block round-trip)`

---

## Step 01.2 — ADR 0020: Block-as-State data model

PROMPT → Read `CLAUDE.md`, `docs/editable-composition/decisions.md`, this phase file, the approved `docs/editable-composition/inventories/phase-01-inventory.md` (Pilot resolutions to OQ-1 through OQ-N will be noted there or in the handoff), and all existing ADRs in `docs/adr/` for style reference. Do NOT edit any source file.

Produce `docs/adr/0020-block-as-state.md` covering:

- **D1** — `BlockSnapshot` discriminated union: the exact TypeScript shape for `GrooveSnapshot`, `ArmoniaSnapshot`, `SesionSnapshot`, and `BlockSnapshot`, as resolved by the Pilot at Checkpoint #1.
- **D2** — `code` field fate: whether `Block.code` is kept as a cached/derived field alongside `snapshot`, replaced entirely, or kept for snapshot-less blocks only. State the byte-identical-at-default implication.
- **D3** — Global context in snapshots: which of `{ bpm, root, mode, octave }` are included in each snapshot variant and why. Justify the playback-context vs snapshot tradeoff.
- **D4** — Snapshot-less block behavior: how existing saved blocks (no `snapshot` field) load and what the UI shows (playable-only, no edit button, optional visual indicator). Must be backward-compatible with v4 saved sessions.
- **D5** — Schema version: `SESSION_SCHEMA_VERSION` bumped from 4 to 5; migration strategy (additive — new optional `snapshot` field on `SavedBlockSchema`; v4 blobs fail `z.literal(5)` and are dropped per established precedent — OR a softer migration if Pilot directs one).
- **D6** — `openBlock(blockId)` action contract: what the action does (loads snapshot fields into the live session stores, switches view, notifies transport), what it does NOT do (does not auto-play), and what happens if called on a snapshot-less block.
- **D7** — Agent schema: whether `src/agent/schema.ts` gains any block-related fields in this phase or whether that is deferred.

STOP after writing the ADR. Do not proceed to step 01.3 until the Pilot approves the ADR at Checkpoint #2.

Implementation requirements:
- No source files modified — docs only.
- ADR must resolve every OQ from the inventory.
- Each decision must be labeled D1–D7 (or however many are needed) matching the inventory OQs.

Validation:
- `git status` shows only `docs/adr/0020-block-as-state.md` and the handoff as new/modified files.

Expected result:
- `docs/adr/0020-block-as-state.md` exists and covers all decisions.
- Pilot can approve the ADR at Checkpoint #2 before any source code is written.

CHECKPOINT → Commit message:
`docs(editable-composition): Phase 01 step 01.2 — ADR 0020 Block-as-State data model`

---

## Step 01.3 — `BlockSnapshot` types, `core/composition/snapshot.ts`, unit tests

PROMPT → Read `CLAUDE.md`, `docs/editable-composition/decisions.md`, `docs/adr/0020-block-as-state.md` (all decisions Pilot-approved), this phase file (step 01.3 scope), `src/core/composition/model.ts` (full), `src/state/session.ts` (the `Chord` interface, `RhythmLayer`, `ProgressionSlot`, and the harmony/rhythm type declarations), and the relevant `core/**` type files. Do NOT touch any Svelte, PIXI, or DOM file.

Implement:
- Create `src/core/composition/snapshot.ts` (AGPL-3.0 header; pure engine, no DOM/PIXI/Svelte imports):
  - Export `GrooveSnapshot`, `ArmoniaSnapshot`, `SesionSnapshot`, and `BlockSnapshot` types per ADR 0020 D1.
  - Export `captureGrooveSnapshot(state: SessionState): GrooveSnapshot` — derives a `GrooveSnapshot` from the current session rhythm state.
  - Export `captureArmoniaSnapshot(state: SessionState): ArmoniaSnapshot` — derives an `ArmoniaSnapshot` from the current session harmony state plus global context per ADR 0020 D3.
  - Export `captureSesionSnapshot(state: SessionState): SesionSnapshot` — combines both per ADR 0020 D1.
  - Export `restoreGrooveSnapshot(snap: GrooveSnapshot): Partial<SessionState>` — returns the state delta to apply to restore rhythm (does NOT write to the store; the action in step 01.5 does the store write).
  - Export `restoreArmoniaSnapshot(snap: ArmoniaSnapshot): Partial<SessionState>` — returns the harmony state delta.
  - Export `restoreSesionSnapshot(snap: SesionSnapshot): Partial<SessionState>` — combines both.
- Extend `Block` in `src/core/composition/model.ts` to add `snapshot?: BlockSnapshot` (optional per ADR 0020 D4).
- Update `addBlock` in `src/state/session.ts`: capture the appropriate snapshot (via the new `capture*` functions) and attach it to the new block at creation time. The `code` field behavior follows ADR 0020 D2.
- Create `tests/snapshot.test.ts` covering A-01-01, A-01-02, A-01-03, A-01-04, A-01-05:
  - Round-trip fidelity: `captureGrooveSnapshot` → `restoreGrooveSnapshot` → state delta matches the original rhythm fields.
  - Round-trip fidelity: `captureArmoniaSnapshot` → `restoreArmoniaSnapshot` → state delta matches the original harmony progression.
  - Byte-identical at default (A-01-06): when `snapshot` is absent on a block, `buildComposition` output is identical to pre-phase output for the same `code` value.
  - `addBlock` produces a block with a non-null `snapshot` of the correct discriminant type.

Implementation requirements:
- `src/core/composition/snapshot.ts` must have NO DOM/PIXI/Svelte imports (unit-testable).
- Do NOT modify `buildComposition` — it still uses `block.code`; snapshot is restore-only.
- Do NOT modify any Svelte component in this step.
- All new types must be exported from `src/core/composition/snapshot.ts` and imported by `model.ts` for the `Block` extension.

Validation:
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.
- `pnpm exec vitest run` → all prior tests pass plus new tests in `tests/snapshot.test.ts`.

Expected result:
- `src/core/composition/snapshot.ts` exists with the capture/restore functions.
- `Block` carries optional `snapshot?`.
- `addBlock` populates the snapshot on newly created blocks.
- Unit tests prove round-trip fidelity and byte-identical-at-default for composition codegen.

CHECKPOINT → Commit message:
`feat(composition): Phase 01 step 01.3 — BlockSnapshot types + capture/restore engine + unit tests`

---

## Step 01.4 — Persistence schema v5 and agent schema guard

PROMPT → Read `CLAUDE.md`, `docs/editable-composition/decisions.md`, `docs/adr/0020-block-as-state.md` (D5, D7), this phase file (step 01.4 scope), `src/lib/persistence.ts` (full), `src/agent/schema.ts` (full), and `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md` step 03.4 (for schema-bump style reference). Do NOT touch any Svelte, PIXI, or DOM file.

Implement:
- **`src/lib/persistence.ts`:**
  - Bump `SESSION_SCHEMA_VERSION` 4 → 5.
  - Change `SavedSessionSchema` `version` literal from `z.literal(4)` to `z.literal(5)`.
  - Add `snapshot` as an optional field on `SavedBlockSchema`. The shape must mirror `BlockSnapshot` (Zod schema per ADR 0020 D1/D5). Use `z.discriminatedUnion` on the `type` tag matching `GrooveSnapshot` / `ArmoniaSnapshot` / `SesionSnapshot`.
  - Update `serializeSession` and `deserializeSession` to carry `snapshot` through on blocks that have one; blocks without a snapshot serialize with `snapshot: undefined` (omitted from JSON per Zod defaults).
  - Keep the existing lossy-drop behavior: v4 blobs (or older) fail `z.literal(5)` → dropped by `safeParse` → session resets to default (per ADR 0020 D5 / established precedent).
- **`src/agent/schema.ts`:** Per ADR 0020 D7 — if no block fields are added to the agent schema in this phase, add a single JSDoc comment to `HarmonyChordCoreSchema` noting that block snapshot fields are a composition-layer concern and not part of agent output. No structural changes required unless the ADR directs otherwise.
- **Tests:**
  - Update `tests/persistence.test.ts`: bump version literals 4 → 5 in all existing fixtures; add a new describe block for "ADR 0020 D5: schema v5 — Block snapshot persistence (A-01-07)" with tests for: v4 blob dropped, snapshot round-trip for each block type, snapshot-absent block loads as snapshot-less, invalid snapshot discriminant rejected.
  - Update `tests/schema.test.ts`: bump `SCHEMA_VERSION is 4` test to assert 5 if the agent schema version is also bumped; otherwise note it is unchanged.

Implementation requirements:
- Do NOT modify `src/core/composition/snapshot.ts` or `model.ts` in this step (those are step 01.3 artifacts).
- Do NOT modify any Svelte component in this step.

Validation:
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.
- `pnpm exec vitest run` → all prior tests pass plus new A-01-07 tests in `persistence.test.ts`.

Expected result:
- `SESSION_SCHEMA_VERSION = 5`.
- `SavedBlockSchema` carries optional `snapshot?` with a Zod discriminated union.
- v4 sessions are dropped (lossy); v5 sessions with or without snapshots parse correctly.
- New sessions created after this step serialize block snapshots on save.

CHECKPOINT → Commit message:
`feat(schema): Phase 01 step 01.4 — persistence schema v5 + Block snapshot serialization`

---

## Step 01.5 — `openBlock` action + UI round-trip button + quality gate

PROMPT → Read `CLAUDE.md`, `docs/editable-composition/decisions.md`, `docs/adr/0020-block-as-state.md` (D6), this phase file (step 01.5 scope, all Acceptance IDs), all prior step handoff entries in `docs/editable-composition/handoffs/phase-01-handoff.md`, `src/state/session.ts` (full), and the Svelte component(s) that render the block library in the Composition view (identify via `Glob` or `Grep` if needed). Read the `src/i18n/types.ts` and all four locale files for the current key inventory before adding new i18n keys.

Implement:
- **`src/state/session.ts`:** Export `openBlock(blockId: string): void` — per ADR 0020 D6: finds the block, reads its `snapshot`, calls `restoreGrooveSnapshot` / `restoreArmoniaSnapshot` / `restoreSesionSnapshot` (from `src/core/composition/snapshot.ts`), writes the resulting state delta into `sessionStore`, switches the active view to `'rhythm'` (for groove), `'harmony'` (for armonia/sesion), and does NOT auto-play. If called on a block with no snapshot, does nothing (no error, no view switch).
- **Composition view Svelte component(s):** Add an "open in editor" button (or icon button) to each block card in the block library panel. The button is visible only when `block.snapshot !== undefined`. On click, calls `openBlock(block.id)`. Add an i18n key `composition.openBlock` (and `composition.openBlockTip`) in all four locales (ES/EN/PT/ZH).
- **Visual indicator for snapshot-less blocks** (per ADR 0020 D4 direction): if the ADR directs a visual indicator, add a small badge or muted label (e.g. "legacy") on blocks without a snapshot, styled consistently with the existing block card design.
- **i18n:** Add the new keys to `src/i18n/types.ts` and all four locale files. Run `tests/i18n/key-parity.test.ts` to confirm parity.
- **Quality gate:** After implementing, run `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm exec vitest run`, and `pnpm build`. All must exit clean.

Implementation requirements:
- `openBlock` must have no DOM/PIXI/Svelte imports in `session.ts` (it is a pure store action).
- The "open in editor" button must not appear on blocks without a snapshot (per ADR 0020 D4).
- No new runtime dependencies introduced.

Validation:
- `pnpm exec tsc --noEmit` → clean (0 errors).
- `pnpm lint` → clean.
- `pnpm exec vitest run` → all tests pass; `tests/i18n/key-parity.test.ts` passes with new keys.
- `pnpm build` → exit code 0.

Expected result:
- `openBlock` is exported from `session.ts`.
- The Composition view shows an "open" button on each block that has a snapshot; clicking it restores the block's editable state and switches view.
- Blocks without a snapshot show a legacy indicator (if the ADR directs one) but no edit button.
- All quality gates pass. Manual acceptance items (A-01-08 through A-01-12) are ready for Pilot Checkpoint #5.

CHECKPOINT → Commit message:
`feat(composition): Phase 01 step 01.5 — openBlock action + round-trip UI button + i18n + quality gate`

---

## Phase Acceptance

Each criterion has a unique ID:

- **A-01-01** — A `groove` block created via "Add to Composition" carries a `GrooveSnapshot` field that, when restored, produces a `SessionState.rhythm` structurally equal to the one at save time (same layers, steps, sounds).
  - Validation method: `unit`
- **A-01-02** — An `armonia` block created via "Add to Composition" carries an `ArmoniaSnapshot` field that, when restored, produces a harmony progression (chords, root, mode, octave) structurally equal to the one at save time.
  - Validation method: `unit`
- **A-01-03** — A `sesion` block created via "Add to Composition" carries a `SesionSnapshot` that combines groove and armonia data; restoring it applies both rhythm and harmony correctly.
  - Validation method: `unit`
- **A-01-04** — `captureArmoniaSnapshot` preserves all per-chord `instrument`, `room`, `decay`, `preset`, `lpf`, `attack`, `sustain`, `release`, `lpenv`, `lpa`, `lpd`, `lpq` fields introduced in the prior initiative.
  - Validation method: `unit`
- **A-01-05** — `restoreArmoniaSnapshot` restores those per-chord sound attributes faithfully (no fields silently dropped or reset to defaults).
  - Validation method: `unit`
- **A-01-06** — Byte-identical-at-default: for a block with no `snapshot` field, `buildComposition` output is byte-identical to pre-phase output for the same `code` value.
  - Validation method: `unit`
- **A-01-07** — Persistence round-trip: a session saved at v5 with block snapshots deserializes correctly; a session saved at v4 is dropped (graceful reset); a block without a snapshot in a v5 session loads as snapshot-less without error.
  - Validation method: `unit`
- **A-01-08** — User can click "Add Groove to Composition", re-open the block via the "open in editor" button, and the Ritmo view shows the exact same layers and steps that were present at save time.
  - Validation method: `manual`
- **A-01-09** — User can click "Add Armonía to Composition", re-open the block, and the Armonía view (Pentagrama + chord slots) shows the exact same progression, root, mode, octave, and per-chord sound attributes.
  - Validation method: `manual`
- **A-01-10** — User can click "Add Sesión to Composition", re-open the block, and both Ritmo and Armonía state are restored.
  - Validation method: `manual`
- **A-01-11** — Blocks created before this phase (no snapshot field) remain playable via "Play Block" and the "open in editor" button does not appear on them.
  - Validation method: `manual`
- **A-01-12** — `pnpm build` exits clean; `pnpm test` passes; `pnpm lint` passes; `tsc --noEmit` exits clean after all steps.
  - Validation method: `automated`

## Partial coverage from prior phase (if any)

No prior partials to address. All A-03-xx items from `harmonic-rhythm-improvements` Phase 03 were closed or passed manually at Checkpoint #5. This is the first phase of a new initiative.

## ADR Triggers

Open `docs/adr/0020-block-as-state.md` when these decisions become real:

- **Block-as-State data model** — Trigger: step 01.2 (after Pilot resolves OQs from the inventory at Checkpoint #1).

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/editable-composition/handoffs/phase-01-handoff.md`. See `handoff-template.md`.
