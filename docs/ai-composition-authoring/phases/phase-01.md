<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 — Agent Block Authoring

**Purpose:** Extend the AI agent so it can save the current live state as a named, editable composition Block — optionally adding it to a new track — without adding any new UI controls.
**Gate:** `editable-composition` Phase 01 is complete and merged to `main`; `Block.snapshot` is the editable source of truth; `addBlock` already captures snapshots; `openBlock` is exported and tested; 682 tests pass clean.
**Expected phase result:** An agent response containing `saveAsBlock` causes a block (with non-null snapshot, correct type, and the agent-supplied name) to appear in `state.composition.blocks`, optionally on a new track; an agent response without `saveAsBlock` leaves the composition library byte-identical; the block is `openBlock`-able; agent schema is at `SCHEMA_VERSION 5`; `pnpm test`, `tsc --noEmit`, `pnpm lint`, and `pnpm build` all pass clean.

---

## Step 01.1 — Discovery inventory (Checkpoint #1)

PROMPT → Read `CLAUDE.md`, `docs/ai-composition-authoring/decisions.md`, `docs/adr/0020-block-as-state.md`, this phase file, and the editable-composition Phase 01 handoff. Then read (in order): `src/agent/schema.ts` (full — current `AgentOutputSchema`, `SCHEMA_VERSION`); `src/agent/apply.ts` (full — `applyRhythmSpec`, `applyHarmonySpec`); `src/agent/agent.ts` lines 340–400 (the `send()` dispatch loop — confirm parse → apply sequence and error-handling paths); `src/state/session.ts` lines 1220–1280 (the current `addBlock` function signature, its internal call to capture functions, and its return type — determine whether `addBlock` is a pure function or writes to the store directly); `src/core/composition/model.ts` (the `Block` interface, `addBlockAsNewTrack`); `src/core/composition/snapshot.ts` (the `capture*` functions — confirm they accept `SessionState`, not a sub-state); and `src/lib/persistence.ts` lines 1–20 (`SESSION_SCHEMA_VERSION`, confirm it is 5 after editable-composition). Produce `docs/ai-composition-authoring/inventories/phase-01-inventory.md` covering:

- §(a) **Agent schema current shape** — verbatim TypeScript signature of `AgentOutputSchema` and `SCHEMA_VERSION`; confirm no block/composition fields.
- §(b) **`apply.ts` dispatch sequence** — exact call order (applyRhythmSpec, applyHarmonySpec); what happens when one spec is absent; whether `addBlock` is called anywhere in the current path.
- §(c) **`agent.ts` send/receive flow** — where `safeParse` runs; what happens on parse failure; what the caller receives on success; confirm no block side-effects today.
- §(d) **`addBlock` internals** — does it return the new `Block` or just mutate the store? (This determines whether `applyBlockSave` can call `addBlock` and chain `addBlockAsNewTrack` on the returned id, or must read back from the store.) State the exact return type.
- §(e) **`addBlockAsNewTrack` signature** — parameters, return type; where it lives (`model.ts` vs `session.ts`); confirm it is a pure function or a store action.
- §(f) **Proposed new schema shape** — a concrete TypeScript snippet for the `saveAsBlock` optional field: `name` (string), `type` (`'groove' | 'armonia' | 'sesion'`), `addToTrack` (optional boolean); justify the field names and required vs optional choices.
- §(g) **Insertion point in `apply.ts`** — propose where `applyBlockSave` should be called relative to `applyRhythmSpec` and `applyHarmonySpec` (it must run AFTER both, so the live state is fully updated before capture); state whether `applyBlockSave` belongs in `apply.ts` or in a new `applyBlock.ts` peer file.
- §(h) **Agent system-prompt scope** — identify where the agent system prompt / capability description lives (`src/agent/agent.ts` or a separate file); note what language(s) it is in; confirm whether i18n is needed in the prompt itself or only in the UI.
- §(i) **Open questions for Pilot** — list any decision not answerable from the codebase alone; propose a recommendation for each. These become OQs resolved at Checkpoint #1.

Do NOT edit any source file. Do NOT produce the ADR — that is step 01.2.

Implementation requirements:
- Cover all nine sections §(a)–§(i) with exact file paths and line ranges for every claim.
- For §(d), state the exact return type of `addBlock` — read the source; do not infer.
- For §(f), propose the Zod schema shape alongside the TypeScript shape (they must be congruent).
- Include at least two open questions: (OQ-1) whether `saveAsBlock.type` should be validated against the current live state's actual content or accepted as the agent's declaration; (OQ-2) whether an agent-supplied `name` that exceeds the `SavedBlockSchema` 100-char limit should be silently truncated or cause the `saveAsBlock` to be a no-op.

Validation:
- `git status` → only `docs/ai-composition-authoring/inventories/phase-01-inventory.md` and the handoff file as new/changed files; no `.ts` or `.svelte` files modified.

Expected result:
- `docs/ai-composition-authoring/inventories/phase-01-inventory.md` exists and covers §(a)–§(i).
- No source file has been modified.
- Pilot can resolve OQs at Checkpoint #1 before step 01.2.

CHECKPOINT → Commit message:
`docs(agent): Phase 01 step 01.1 — discovery inventory (agent block authoring)`

---

## Step 01.2 — ADR 0021: agent schema v5 and `applyBlockSave` insertion (Checkpoint #2)

PROMPT → Read `CLAUDE.md`, `docs/ai-composition-authoring/decisions.md`, `docs/ai-composition-authoring/inventories/phase-01-inventory.md` (including Pilot's OQ resolutions at Checkpoint #1), all prior ADRs in `docs/adr/` (for style — especially ADR 0020 for schema-bump convention and ADR 0018/0019 for capability-extension style). Produce `docs/adr/0021-agent-block-authoring.md` that records the following decisions:

- **D1 — `saveAsBlock` field shape:** The exact TypeScript and Zod shapes for the new optional field on `AgentOutputSchema`. Record the Pilot's OQ-1 resolution (accepted type or validated-against-live-state). Record the Pilot's OQ-2 resolution (truncation vs. no-op on long names). Document any additional field-level constraints (e.g., max-length enforced in Zod, trimmed before use).
- **D2 — Schema version bump:** `SCHEMA_VERSION` in `src/agent/schema.ts` bumps from `4` to `5`. State the lossy-drop precedent (agent responses parsed with a stale schema are schema-agnostic — the agent schema version is a documentation aid, not a wire protocol version; it does not affect `SESSION_SCHEMA_VERSION` which stays at `5`). Confirm `SESSION_SCHEMA_VERSION` is unchanged.
- **D3 — `applyBlockSave` placement:** Where the function lives (within `apply.ts` or a new peer file), what it accepts (the `saveAsBlock` spec + current `SessionState`), what it calls (`addBlock` + optionally `addBlockAsNewTrack`), and whether it returns the created `Block` or `void`. Record the Pilot's OQ resolution on `addBlock` return type (from §(d) of the inventory).
- **D4 — Call ordering in `send()`:** `applyRhythmSpec` → `applyHarmonySpec` → `applyBlockSave` (in that order, all within the same parsed-response handler). If the agent response contains `saveAsBlock` but neither `rhythm` nor `harmony`, `applyBlockSave` still runs (captures whatever the current live state holds). Document whether the captured state reflects the just-applied specs or the pre-call state if the specs are absent.
- **D5 — Agent system prompt update:** What text is added to describe the new capability; what language the prompt uses; whether i18n in the prompt itself is required or English-only is accepted.
- **D6 — Byte-identical-at-default guarantee:** An agent response without `saveAsBlock` (the default) must leave `state.composition.blocks` byte-identical to pre-call state. Document how this is enforced (early-return guard on `saveAsBlock` presence).

Do NOT touch any source file. The ADR is a docs-only artifact.

Implementation requirements:
- All six decisions D1–D6 must be present.
- Include the exact proposed TypeScript type and Zod schema for `SaveeAsBlockSpecSchema` (to be pasted into `src/agent/schema.ts` in step 01.3).
- Include the exact proposed `applyBlockSave` function signature.
- Consequences section lists all files that will be modified in steps 01.3–01.5.
- State that `SESSION_SCHEMA_VERSION` remains `5` (no block-persistence change needed; agent-created blocks are data-model-identical to user-created blocks).

Validation:
- `git status` → only `docs/adr/0021-agent-block-authoring.md` and the handoff file modified; no source files.

Expected result:
- `docs/adr/0021-agent-block-authoring.md` exists and records D1–D6.
- Pilot can approve the ADR at Checkpoint #2 before step 01.3.

CHECKPOINT → Commit message:
`docs(agent): Phase 01 step 01.2 — ADR 0021 agent schema v5 and applyBlockSave`

---

## Step 01.3 — Schema extension, `applyBlockSave`, and unit tests

PROMPT → Read `CLAUDE.md`, `docs/ai-composition-authoring/decisions.md`, `docs/adr/0021-agent-block-authoring.md` (all decisions D1–D6 are binding), this phase file (acceptance criteria), and the step 01.2 handoff entry. Then implement:

1. **`src/agent/schema.ts`:** Add `SaveAsBlockSpecSchema` (Zod object matching ADR 0021 D1 shape); add `saveAsBlock: SaveAsBlockSpecSchema.optional()` to `AgentOutputSchema`; bump `SCHEMA_VERSION` from `4` to `5`. Add AGPL-3.0 header if not already present.

2. **`src/agent/apply.ts` (or new `src/agent/applyBlock.ts`):** Implement `applyBlockSave(spec: SaveAsBlockSpec): void` per ADR 0021 D3–D4. The function must: (a) call `addBlock(spec.type)` — which reads the current `sessionStore`, so it captures whatever live state is present after `applyRhythmSpec`/`applyHarmonySpec` have run; (b) optionally call `addBlockAsNewTrack(newBlockId)` if `spec.addToTrack === true`; (c) enforce the name: apply the Pilot's OQ-2 resolution (truncation or no-op) to the agent-supplied name before or after `addBlock` (if `addBlock` returns the block id or the block, rename accordingly; if it does not expose a rename path, read back from the store and call `renameBlock` or mutate inline — state which path is taken in the handoff). AGPL-3.0 header on any new file.

3. **`src/agent/agent.ts`:** In the `send()` response handler, add the `applyBlockSave(parsed.saveAsBlock)` call after `applyHarmonySpec` (per ADR 0021 D4 ordering). Guard with `if (parsed.saveAsBlock)`.

4. **Agent system prompt:** Update the system-prompt string (or the capability-description section) per ADR 0021 D5 to describe the `saveAsBlock` field.

5. **`tests/agent-schema.test.ts` (or an existing schema test file):** Add tests for:
   - Agent response with `saveAsBlock: { name, type }` parses correctly (all three `type` values).
   - Agent response with `saveAsBlock: { name, type, addToTrack: true }` parses correctly.
   - Agent response without `saveAsBlock` parses correctly and `saveAsBlock` is `undefined`.
   - Name at max allowed length parses; name one character over is handled per OQ-2 resolution (Zod validation or truncation).
   - `SCHEMA_VERSION` is `5`.

6. **`tests/apply-block.test.ts`** (new file): Unit tests for `applyBlockSave`:
   - After `applyBlockSave({ name: 'Test', type: 'groove' })`, `get(sessionStore).composition.blocks` contains a block with `name === 'Test'`, `type === 'groove'`, and `snapshot !== null`.
   - After `applyBlockSave({ name: 'Test', type: 'groove', addToTrack: true })`, the block also appears in `state.composition.tracks` (a new track referencing the block id).
   - After a call WITHOUT `saveAsBlock`, `state.composition.blocks` is unchanged (byte-identical-at-default, A-01-05-derived guarantee).
   - The created block passes `openBlock(id)` without error (snapshot is defined and the correct discriminant type).

Implementation requirements:
- `core/**` purity: `applyBlockSave` lives in `src/agent/` (not `core/`), which is permitted to import from `src/state/session.ts`. No new DOM/PIXI imports in `core/**`.
- AGPL-3.0 header on all new source files.
- No new runtime dependencies.
- `addBlock` is the single path that populates `snapshot` — do NOT call `captureGrooveSnapshot` / `captureArmoniaSnapshot` directly in `applyBlockSave`; let `addBlock`'s existing snapshot-capture logic handle it.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → clean.
- `pnpm exec vitest run` → all prior tests pass plus new tests for schema and `applyBlockSave`.

Expected result:
- `src/agent/schema.ts` at `SCHEMA_VERSION 5` with `saveAsBlock?` field.
- `applyBlockSave` implemented and called from `send()`.
- Agent system prompt describes the new capability.
- All new unit tests pass.

CHECKPOINT → Commit message:
`feat(agent): Phase 01 step 01.3 — schema v5 + applyBlockSave + unit tests`

---

## Step 01.4 — Persistence and schema round-trip verification

PROMPT → Read `CLAUDE.md`, `docs/ai-composition-authoring/decisions.md`, `docs/adr/0021-agent-block-authoring.md` (D2, D6), this phase file, and the step 01.3 handoff entry. Then verify and close the persistence story:

1. **Confirm `SESSION_SCHEMA_VERSION` is still `5`** (no change expected — agent-created blocks are structurally identical to user-created blocks at the persistence layer). Read `src/lib/persistence.ts` lines 1–25 and state the version in the handoff.

2. **Confirm `SavedBlockSchema` already accommodates agent-created blocks** — no new Zod fields are needed because the `snapshot?` field added in editable-composition Phase 01 step 01.4 already covers all three block types. Read the relevant lines and confirm in the handoff.

3. **Add persistence tests for agent-created blocks** in `tests/persistence.test.ts` (or a new `tests/agent-block-persistence.test.ts`):
   - Serialize a session containing an agent-created groove block (one with a non-null `snapshot`) → JSON → `SavedSessionSchema.safeParse` → `deserializeSession` → confirm block survives round-trip with `name`, `type`, `code`, and `snapshot` intact.
   - Serialize a session where the agent added a block to a track → confirm the track-block reference survives round-trip.
   - Confirm a session with no `saveAsBlock`-created blocks continues to parse correctly (regression guard).

4. **`tests/agent-schema.test.ts`:** Add a test confirming that the `SaveAsBlockSpecSchema` field `type` values `'groove'`, `'armonia'`, `'sesion'` are the exact same literals as `Block.type` (structural alignment guard).

Implementation requirements:
- No source changes to `src/lib/persistence.ts` are expected; if any are found to be necessary, surface as a blocker before making them.
- No source changes to `src/core/composition/model.ts` are expected.
- AGPL-3.0 header on any new test file.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → clean.
- `pnpm exec vitest run` → all tests pass.

Expected result:
- Persistence round-trip for agent-created blocks confirmed by unit tests.
- `SESSION_SCHEMA_VERSION` confirmed at `5` (unchanged).
- No source changes outside test files (unless a bug is found and disclosed in the handoff).

CHECKPOINT → Commit message:
`test(agent): Phase 01 step 01.4 — agent-block persistence round-trip tests`

---

## Step 01.5 — Quality gate and manual acceptance (Checkpoint #5)

PROMPT → Read `CLAUDE.md`, `docs/ai-composition-authoring/decisions.md`, this phase file (all acceptance criteria), and the step 01.4 handoff entry. Execute the full quality gate, then perform and document the manual acceptance scenarios:

1. **Quality gate (all commands must exit 0 / clean):**
   - `pnpm exec tsc --noEmit`
   - `pnpm lint`
   - `pnpm exec vitest run` — record total test count.
   - `pnpm build`

2. **Manual acceptance A-01-01 (agent creates groove block):** Open the app in a browser. In the agent panel, send a message that produces a response containing `saveAsBlock: { name: "Groove Test", type: "groove" }`. Confirm: (a) the block "Groove Test" appears in the composition block library; (b) clicking "✎ abrir" opens it in the Ritmo editor; (c) the layers/steps match the rhythm state that was active when the agent responded. Document the observation.

3. **Manual acceptance A-01-02 (agent creates armonia block):** Send an agent message that produces `saveAsBlock: { name: "Harmony Test", type: "armonia" }`. Confirm: (a) the block appears; (b) clicking "✎ abrir" opens it in Armonía; (c) the progression matches. Document.

4. **Manual acceptance A-01-03 (agent adds block to track):** Send a message that produces `saveAsBlock: { name: "Track Test", type: "groove", addToTrack: true }`. Confirm: (a) the block appears in the library; (b) a new track referencing that block appears in the composition timeline; (c) the block is playable. Document.

5. **Manual acceptance A-01-04 (no `saveAsBlock` → library unchanged):** Send an agent message that produces a response with rhythm/harmony specs but no `saveAsBlock`. Confirm the composition block library count is unchanged before and after. Document.

6. **Manual acceptance A-01-05 (openBlock round-trip):** For a block created by the agent in A-01-01, click "✎ abrir". Confirm the Ritmo editor shows the correct state; navigate away and back; confirm no auto-play occurred.

Implementation requirements:
- All five manual acceptance scenarios must be documented in the handoff with observed results.
- If any manual scenario fails, write a bug-fix commit and re-verify before closing the step (iteration 2 of 5). Do not leave a failing scenario undocumented.
- The system prompt change from step 01.3 must be visible in the agent panel's capability description (if the UI exposes it); note this in the handoff.

Validation:
- All quality-gate commands pass clean.
- All five manual acceptance scenarios pass.

Expected result:
- Phase 01 is complete.
- `SCHEMA_VERSION = 5`, `SESSION_SCHEMA_VERSION = 5`.
- All acceptance IDs A-01-01 through A-01-10 are closed.
- Handoff Checkpoint #5 entry written.

CHECKPOINT → Commit message:
`feat(agent): Phase 01 step 01.5 — quality gate and manual acceptance`

---

## Phase Acceptance

Each criterion has a unique ID (used in handoff Acceptance Coverage Tables):

- **A-01-01** — An agent response containing `saveAsBlock: { name: "X", type: "groove" }` (after `applyRhythmSpec` has run) causes a block named "X" with `type === 'groove'` and a non-null `snapshot` of discriminant `'groove'` to appear in `state.composition.blocks`.
  - Validation method: `unit` + `manual`
- **A-01-02** — An agent response containing `saveAsBlock: { name: "X", type: "armonia" }` (after `applyHarmonySpec` has run) causes a block named "X" with `type === 'armonia'` and a non-null `snapshot` of discriminant `'armonia'` to appear in `state.composition.blocks`.
  - Validation method: `unit` + `manual`
- **A-01-03** — An agent response containing `saveAsBlock: { ..., addToTrack: true }` causes both a block in the library and a new track referencing that block to appear in `state.composition`.
  - Validation method: `unit` + `manual`
- **A-01-04** — An agent response WITHOUT `saveAsBlock` leaves `state.composition.blocks` byte-identical to its pre-call state (no block is added, no track is added).
  - Validation method: `unit`
- **A-01-05** — A block created by the agent is `openBlock`-able: calling `openBlock(id)` with an agent-created block id restores the session to the editors without error and without auto-play, and the snapshot round-trips correctly into the editors.
  - Validation method: `unit` + `manual`
- **A-01-06** — `AgentOutputSchema` parsed with `SCHEMA_VERSION 5` correctly validates all three `saveAsBlock.type` values and rejects unknown types; `saveAsBlock` absent parses successfully.
  - Validation method: `unit`
- **A-01-07** — An agent-created block (with non-null snapshot) survives a full persistence round-trip: `serializeSession` → JSON → `deserializeSession` → block has `name`, `type`, `code`, and `snapshot` intact.
  - Validation method: `unit`
- **A-01-08** — An agent-created block with `addToTrack: true` survives a full persistence round-trip: the track referencing it is intact after `serializeSession` → `deserializeSession`.
  - Validation method: `unit`
- **A-01-09** — The agent system prompt (or capability description) clearly describes the `saveAsBlock` field, its sub-fields (`name`, `type`, `addToTrack`), and which `type` values are valid.
  - Validation method: `proxy:static-analysis` (Dev reads the prompt text and cites it in the handoff)
- **A-01-10** — `tsc --noEmit`, `pnpm lint`, `pnpm test`, and `pnpm build` all pass clean at phase end.
  - Validation method: automated

## Partial coverage from prior phase

No prior partials to address. The editable-composition Phase 01 closed all its acceptance IDs (A-01-01 through A-01-12). This is a new initiative; its register carries no open items from prior phases.

## ADR Triggers

Open `docs/adr/0021-agent-block-authoring.md` when these decisions become real:

- **Agent schema v5: `saveAsBlock` field shape, type validation, name constraints** — Trigger: step 01.2 (after OQ resolutions at Checkpoint #1)
- **`applyBlockSave` placement and call ordering in `send()`** — Trigger: step 01.2
- **Agent system-prompt language and i18n scope** — Trigger: step 01.2 (if the Pilot's OQ-1 resolution has language implications)

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/ai-composition-authoring/handoffs/phase-01-handoff.md`. See `handoff-template.md`.
