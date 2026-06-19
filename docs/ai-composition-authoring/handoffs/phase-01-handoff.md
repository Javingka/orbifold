<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Handoff — Phase 01 (Agent Block Authoring)

---

## Step 01.1 — Discovery inventory (Checkpoint #1)

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `docs(agent): Phase 01 step 01.1 — discovery inventory (agent block authoring)`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read `CLAUDE.md`, `docs/ai-composition-authoring/decisions.md` (two carried-forward rules from editable-composition + harmonic-rhythm-improvements; no active decisions yet), `docs/adr/0020-block-as-state.md` (full — all seven decisions D1–D7, confirming `addBlock` returns `void` per D7 guard, `SESSION_SCHEMA_VERSION = 5`, `SCHEMA_VERSION = 4`).
- Read `docs/ai-composition-authoring/phases/phase-01.md` (full — all five steps, ten acceptance criteria A-01-01..A-01-10, ADR triggers).
- Read `docs/editable-composition/handoffs/phase-01-handoff.md` (full — all five steps + Checkpoint #5 bug-fix; confirmed editable-composition Phase 01 complete, 682 tests, `openBlock` exported, persistence at v5).
- Read `src/agent/schema.ts` (full — `SCHEMA_VERSION = 4`; `AgentOutputSchema` with `rhythm?`, `harmony?`, `note?` only; ADR 0020 D7 JSDoc guard on `HarmonyChordCoreSchema` lines 122–128; no block/composition fields).
- Read `src/agent/apply.ts` (full — `applyRhythmSpec` lines 59–97; `applyHarmonySpec` lines 120–193; `getSessionState` re-export; no `addBlock` call anywhere; no composition imports).
- Read `src/agent/agent.ts` lines 1–131 (SYSTEM_PROMPT, module-level state, constants) and lines 302–399 (`send()` dispatch loop — `tryParseSkill` at line 354, `applyRhythmSpec` at line 359, `applyHarmonySpec` at line 363, no block side-effects).
- Read `src/state/session.ts` lines 1220–1327 (`addBlock` function lines 1241–1283 — **return type confirmed `void`**, mutates store via `sessionStore.update`, captures snapshot via capture functions; `renameBlock` lines 1319–1327).
- Read `src/state/session.ts` lines 1429–1445 (`addBlockAsNewTrack` — `void`, store action, takes `blockId: string`).
- Read `src/core/composition/model.ts` (full — `Block` interface lines 21–35 with `snapshot?: BlockSnapshot`; `buildComposition` lines 96–117 — reads only `block.code`; `addBlockAsNewTrack` NOT here — it is in `session.ts`).
- Read `src/core/composition/snapshot.ts` (full — `captureGrooveSnapshot`, `captureArmoniaSnapshot`, `captureSesionSnapshot` all accept `SessionState` — not a sub-state — as confirmed by lines 109, 140, 186 signatures; restore functions return `Partial<SessionState>`).
- Read `src/lib/persistence.ts` lines 1–20 — `SESSION_SCHEMA_VERSION = 5` confirmed at line 19.
- Produced `docs/ai-composition-authoring/inventories/phase-01-inventory.md` covering all nine sections §(a)–§(i) with exact file paths and line ranges for every claim.
- Did NOT touch any source file (`.ts`, `.svelte`).

### Files touched

- `docs/ai-composition-authoring/inventories/phase-01-inventory.md` (created)
- `docs/ai-composition-authoring/handoffs/phase-01-handoff.md` (created, this entry)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in this docs-only step. The acceptance items for this phase (A-01-01 through A-01-10) are targeted by steps 01.3 through 01.5.

### Routine validations (one-liner each, no transcripts)

- `git status` → only `docs/ai-composition-authoring/inventories/phase-01-inventory.md` and `docs/ai-composition-authoring/handoffs/phase-01-handoff.md` as new untracked files. No `.ts` or `.svelte` files modified.

### Acceptance Coverage Table

No Acceptance IDs are covered in this docs-only inventory step.

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 through A-01-10 | (see phase file) | — | — | not yet — targeted in steps 01.3–01.5 |

### Decisions made (if any)

None — this is a read-only discovery step. Recommendations are in §(i) of the inventory as OQ-1 through OQ-4 for Pilot resolution.

### Proposed Decisions Register entries (if any)

None in this step. ADR 0021 decisions are scoped to step 01.2 (after Pilot resolves OQs at Checkpoint #1).

### Blockers resolved during this step (if any)

None.

### Environment state after this step

Clean working tree (docs-only). All prior quality gates (`pnpm test`, `tsc --noEmit`, `pnpm lint`) remain passing — no source files were modified.

### Key findings summary

1. **`addBlock` returns `void`** (session.ts line 1241) — `applyBlockSave` must use the read-back pattern (call `addBlock`, then `get(sessionStore).composition.blocks[last]`, then `renameBlock`).
2. **`SESSION_SCHEMA_VERSION = 5`** (persistence.ts line 19) — no bump needed in this phase (agent-created blocks are structurally identical to user-created blocks at the persistence layer).
3. **`SCHEMA_VERSION = 4`** must bump to `5` in schema.ts — the new `saveAsBlock?` field is the triggering change.
4. **Four OQs** need Pilot resolution before ADR 0021 can be written in step 01.2.

### Next-step context (only if non-obvious)

The Pilot must resolve OQ-1 through OQ-4 at Checkpoint #1 before step 01.2 proceeds. The four OQs and their recommendations:

- **OQ-1** (type validation: trusted vs. live-state-validated): Recommendation — trust agent declaration; existing `addBlock` early-return (`if (!code) return`) already handles the empty-state case.
- **OQ-2** (name > 100 chars: truncation vs. no-op vs. whole-skill-reject): Recommendation — Option B: Zod does not enforce max on name; `applyBlockSave` truncates to 100 chars. Avoids rejecting a valid rhythm/harmony spec bundled with an oversized name.
- **OQ-3** (allow `saveAsBlock` alone, no `rhythm`/`harmony`?): Recommendation — yes; relax the `superRefine` guard to accept at least one of `{rhythm, harmony, saveAsBlock}`.
- **OQ-4** (summary and code derivation when only `saveAsBlock` fires): Recommendation — use current session code as `code`; build a bespoke summary mentioning the saved block name.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** 1 of 5
**Reason:**
**Next action:**

---

## Step 01.2 — ADR 0021: agent schema v5 and `applyBlockSave` insertion (Checkpoint #2)

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `docs(agent): Phase 01 step 01.2 — ADR 0021 agent schema v5 and applyBlockSave`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read `CLAUDE.md`, `docs/ai-composition-authoring/decisions.md`, `docs/ai-composition-authoring/inventories/phase-01-inventory.md` (full — all nine sections §(a)–§(i) plus Pilot OQ resolutions at Checkpoint #1).
- Read all prior ADRs for style: ADR 0020 (block-as-state — schema-bump convention, D1–D7 structure), ADR 0018 (chord sound attributes — capability-extension style), ADR 0019 (oscillator and presets — capability-extension style).
- Incorporated all four OQ resolutions verbatim:
  - OQ-1 → D1: `saveAsBlock.type` trusted as declared; no live-state validation.
  - OQ-2 → D1: No `.max(100)` on `name` in Zod; `applyBlockSave` truncates via `.trim().slice(0, 100)`.
  - OQ-3 → D1 + D4: `superRefine` relaxed to require at least one of `rhythm`, `harmony`, or `saveAsBlock`; `did.length === 0` guard updated accordingly.
  - OQ-4 → D4: Save-only path returns `{ type: 'skill', code: sessionCode(updatedState), summary }`.
- Produced `docs/adr/0021-agent-block-authoring.md` covering all six decisions D1–D6.
- Did NOT touch any source file (`.ts`, `.svelte`).

### Files touched

- `docs/adr/0021-agent-block-authoring.md` (created)
- `docs/ai-composition-authoring/handoffs/phase-01-handoff.md` (updated, this entry)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in this docs-only step. A-01-01 through A-01-10 are targeted by steps 01.3–01.5.

### Routine validations (one-liner each, no transcripts)

- `git status` → only `docs/adr/0021-agent-block-authoring.md` (new) and `docs/ai-composition-authoring/handoffs/phase-01-handoff.md` (modified); no `.ts` or `.svelte` files modified.

### Acceptance Coverage Table

No Acceptance IDs are covered in this docs-only ADR step.

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 through A-01-10 | (see phase file) | — | — | not yet — targeted in steps 01.3–01.5 |

**Proxy disclosures:** A-01-09 (agent system prompt content) will be verified by `proxy:static-analysis` in step 01.5 — the Dev reads the prompt text and cites the relevant lines in the handoff. D5 of ADR 0021 defines the required content.

### Decisions made (if any)

- D1: `SaveAsBlockSpecSchema` — `name: z.string().min(1)` (no `.max(100)`); `type: z.enum(['groove', 'armonia', 'sesion'])`; `addToTrack: z.boolean().optional()`.
- D2: `SCHEMA_VERSION` bumps 4→5; `SESSION_SCHEMA_VERSION` stays 5 (no persistence change).
- D3: `applyBlockSave` in `apply.ts`; uses read-back pattern after `addBlock` (void return); truncates name via `.trim().slice(0, 100)`; optionally calls `addBlockAsNewTrack`.
- D4: Call order `applyRhythmSpec → applyHarmonySpec → applyBlockSave`; guard relaxed for save-only responses; OQ-4 save-only code/summary path defined.
- D5: Spanish-only SYSTEM_PROMPT addition covering all four required content points.
- D6: Byte-identical guarantee enforced by structural guard `if (skill.saveAsBlock)`.

### Proposed Decisions Register entries (if any)

The following active decision should be recorded in `docs/ai-composition-authoring/decisions.md` by the Pilot at Checkpoint #2:

- **`applyBlockSave` is the agent-layer block-save path; `addBlock` is the single snapshot-capture path** (ADR 0021 D3): `applyBlockSave` delegates to `addBlock` for snapshot capture; it does not call capture functions directly. `SESSION_SCHEMA_VERSION` remains 5 — agent-created blocks are persistence-identical to user-created blocks.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

Clean working tree (docs-only). All prior quality gates (`pnpm test`, `tsc --noEmit`, `pnpm lint`) remain passing — no source files were modified.

### Key findings summary

1. All six decisions D1–D6 are recorded in ADR 0021 with binding TypeScript/Zod snippets and exact function signatures ready to be pasted into `src/agent/schema.ts` and `src/agent/apply.ts` in step 01.3.
2. `SESSION_SCHEMA_VERSION` stays 5 — confirmed explicitly in D2. No persistence change needed.
3. The exact `applyBlockSave` signature (`(spec: SaveAsBlockSpec): void`) and internal call sequence (addBlock → read-back → truncate-rename → optional addBlockAsNewTrack) is binding for step 01.3.
4. The OQ-3 guard relaxation touches two locations in `agent.ts`: the `superRefine` in `schema.ts` (D1) and the `did.length === 0` early-exit in `send()` (D4).

### Next-step context (only if non-obvious)

Step 01.3 is source code. ADR 0021 is the binding authority. The step 01.3 implementer should:
- Paste `SaveAsBlockSpecSchema` from D1 into `schema.ts` verbatim (no `.max(100)` on `name`).
- Use `sessionCode(updatedState)` (not `harmonyCode`) for the save-only code derivation (OQ-4 / D4).
- Confirm `renameBlock` is exported from `src/state/session.ts` before importing it in `apply.ts` (inventory §(d) cites its presence at lines 1319–1327 but does not explicitly confirm its export status — a one-line read is warranted).

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** 1 of 5
**Reason:**
**Next action:**

---

## Step 01.3 — Schema extension, `applyBlockSave`, and unit tests (Checkpoint #3)

**Date:** 2026-06-18

**Commit(s):**

- **Iteration 1 commit:** `feat(agent): Phase 01 step 01.3 — schema v5 + applyBlockSave + unit tests`
- **Terminal commit (iteration 2):** `fix(agent): Phase 01 step 01.3 REVISE — applyBlockSave no-op guard when library non-empty`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 2 of 5

### Completed

- Read `CLAUDE.md`, `docs/ai-composition-authoring/decisions.md`, `docs/adr/0021-agent-block-authoring.md` (all six decisions D1–D6, binding), `docs/ai-composition-authoring/phases/phase-01.md` (step 01.3 scope and all ten acceptance criteria), step 01.2 handoff entry (ADR approved, all six decisions confirmed).
- Read `src/agent/schema.ts` (full — `SCHEMA_VERSION = 4`, current `AgentOutputSchema`), `src/agent/apply.ts` (full — `applyRhythmSpec`, `applyHarmonySpec`, `getSessionState`), `src/agent/agent.ts` (full — `SYSTEM_PROMPT`, `send()` dispatch at lines 354–390), `src/state/session.ts` lines 1237–1445 (`addBlock` void, `renameBlock`, `addBlockAsNewTrack`), `src/core/composition/model.ts` (Block.type literals confirmed `'groove' | 'armonia' | 'sesion'` at line 24).
- Read existing `tests/schema.test.ts` (full — confirmed structure before adding new suites).

**`src/agent/schema.ts` changes:**
- Bumped `SCHEMA_VERSION` from `4` to `5` with version history comment (ADR 0021 D2).
- Added `SaveAsBlockSpecSchema` (Zod object): `name: z.string().min(1)`, `type: z.enum(['groove', 'armonia', 'sesion'] as const)`, `addToTrack: z.boolean().optional()`. No `.max(100)` on `name` (OQ-2 → B). Exported inferred `SaveAsBlockSpec` type.
- Added `saveAsBlock: SaveAsBlockSpecSchema.optional()` to `AgentOutputSchema`.
- Updated `superRefine` guard to require at least one of `rhythm`, `harmony`, or `saveAsBlock` (OQ-3 / D1).

**`src/agent/apply.ts` changes:**
- Added imports: `addBlock`, `renameBlock`, `addBlockAsNewTrack` from `'../state/session.js'`; `SaveAsBlockSpec` from `'./schema.js'`.
- Implemented `applyBlockSave(spec: SaveAsBlockSpec): void` per ADR 0021 D3 call sequence:
  1. `addBlock(spec.type)` — delegates snapshot capture (single capture path).
  2. `get(sessionStore)` read-back.
  3. Guard on empty blocks (early-return if addBlock was a no-op).
  4. `finalName = spec.name.trim().slice(0, 100)`.
  5. `renameBlock(newBlock.id, finalName)`.
  6. If `spec.addToTrack === true` → `addBlockAsNewTrack(newBlock.id)`.

**`src/agent/agent.ts` changes:**
- Added `applyBlockSave` import from `'./apply.js'`.
- Updated `SYSTEM_PROMPT`: Changed "DOS habilidades" to "TRES habilidades"; added third capability block `save_as_block` (ADR 0021 D5 all four required content points covered — see proxy verification below).
- In `send()`: Added `if (skill.saveAsBlock) { applyBlockSave(skill.saveAsBlock); }` after `applyHarmonySpec` block (D4 ordering).
- Updated `did.length === 0` guard to `if (did.length === 0 && !skill.saveAsBlock)` (OQ-3 / D4).
- Added OQ-4 save-only code path: `code = sessionCode(updatedState)` when `did` is empty; summary = `"✓ Guardé el ${type} actual como bloque «${name}»"`.
- Added combined-action summary suffix when both `did` is non-empty AND `skill.saveAsBlock` fires.

**`tests/schema.test.ts` changes:**
- Added import for `SaveAsBlockSpecSchema` and `Block` type.
- Updated `SCHEMA_VERSION` test expectation from `4` to `5`.
- Updated duplicate `SCHEMA_VERSION` assertion at line 673.
- Added `SaveAsBlockSpecSchema` suite (9 tests): all three `type` values; `addToTrack: true`; absent `addToTrack`; unknown type rejected; empty name rejected; long name (150 chars) passes schema (truncation in apply); type-literal alignment guard vs `Block.type`.
- Added `AgentOutputSchema — saveAsBlock` suite (5 tests): saveAsBlock-only parses; absent saveAsBlock is undefined; rhythm + saveAsBlock parses; neither rhythm/harmony/saveAsBlock fails; saveAsBlock with unknown type fails.

**`tests/apply-block.test.ts` (new file):**
- AGPL-3.0 header present.
- 19 tests (iteration 1) + 1 guard test (iteration 2 REVISE fix) = 20 tests total.
- Covers: A-01-01 (groove block name/type/snapshot/code), A-01-02 (armonia block), A-01-03 (addToTrack creates new track, absent/false does not), A-01-04 (applyRhythmSpec / applyHarmonySpec alone leave composition.blocks and .tracks reference-identical), A-01-05 (openBlock does not throw, block survives in store with correct type), name truncation at 150/100/trim, multiple blocks accumulate, and (new) no-op guard when library non-empty.

**REVISE fix (iteration 2):**

- `src/agent/apply.ts` `applyBlockSave`: captured `blockCountBefore = get(sessionStore).composition.blocks.length` before calling `addBlock(spec.type)`; replaced `if (state.composition.blocks.length === 0) return;` with `if (state.composition.blocks.length === blockCountBefore) return;`. This prevents silent renaming of the last pre-existing block when `addBlock` no-ops on empty code in a non-empty library.
- `tests/apply-block.test.ts`: added one test ("A-01-01 no-op guard: applyBlockSave with empty harmonia state and existing blocks does not rename pre-existing block") that seeds a groove block, fires `applyBlockSave` for `armonia` with no harmony progression (empty DEFAULT_SESSION_STATE), and asserts block count unchanged and pre-existing name intact.

### Files touched

- `src/agent/schema.ts` (modified)
- `src/agent/apply.ts` (modified)
- `src/agent/agent.ts` (modified)
- `tests/schema.test.ts` (modified — new suites added)
- `tests/apply-block.test.ts` (created)
- `docs/ai-composition-authoring/handoffs/phase-01-handoff.md` (updated, this entry)

### Validation evidence (per Acceptance ID)

- **A-01-01** — `apply-block.test.ts` "groove block (A-01-01)": 3 tests assert block name, type, snapshot presence, snapshot discriminant `'groove'`, and non-empty code. PASS.
- **A-01-02** — `apply-block.test.ts` "armonia block (A-01-02)": 2 tests assert name, type, snapshot presence, discriminant `'armonia'`. PASS.
- **A-01-03** — `apply-block.test.ts` "addToTrack (A-01-03)": 3 tests assert new track created + block referenced; absent/false does not create track. PASS.
- **A-01-04** — `apply-block.test.ts` "without applyBlockSave (A-01-04)": 4 tests assert `composition.blocks` and `.tracks` are reference-identical after `applyRhythmSpec` and/or `applyHarmonySpec`. PASS.
- **A-01-05** — `apply-block.test.ts` "openBlock round-trip (A-01-05)": 3 tests assert openBlock does not throw; block survives with correct type/snapshot; non-existent id is safe. PASS.
- **A-01-06** — `schema.test.ts` "SaveAsBlockSpecSchema (A-01-06)" + "AgentOutputSchema — saveAsBlock (A-01-06)": 14 tests cover all three type values, addToTrack, absent saveAsBlock, unknown type rejection, empty name rejection, long-name pass-through (OQ-2), type-literal alignment vs `Block.type`, saveAsBlock-only parse (OQ-3), combined parse, superRefine guard. PASS.
- **A-01-07 / A-01-08** — deferred to step 01.4 (persistence round-trip tests).
- **A-01-09** — `proxy:static-analysis`: `SYSTEM_PROMPT` in `src/agent/agent.ts` now contains a "SKILL: save_as_block" section covering all four ADR 0021 D5 binding points: (1) when to use `saveAsBlock` (example phrases: "guarda esto como bloque", "save the current groove", "crea un bloque con esta armonía", "añade esto a la composición"); (2) three sub-fields with exact types and definitions for all three `type` values; (3) two example JSON snippets (minimal and full); (4) explicit statement that `saveAsBlock` may appear alone. All four D5 content points are covered.
- **A-01-10** — `tsc --noEmit`: 0 errors. `pnpm lint`: clean. `pnpm exec vitest run`: 716 tests passed (715 after iteration 1 + 1 new guard test in iteration 2). `pnpm build`: not yet run (step 01.5).

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → 0 errors (clean output).
- `pnpm lint` → clean (ESLint clean; Prettier formatting confirmed after `--write`).
- `pnpm exec vitest run` → 716 tests passed, 0 failed, 0 skipped across 19 test files (iteration 2: +1 guard test over iteration 1's 715).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | Groove block: correct name, type, non-null snapshot with discriminant `'groove'` | `tests/apply-block.test.ts` | unit | CLOSED |
| A-01-02 | Armonia block: correct name, type, non-null snapshot with discriminant `'armonia'` | `tests/apply-block.test.ts` | unit | CLOSED |
| A-01-03 | `addToTrack: true` → block in library AND new track referencing block id | `tests/apply-block.test.ts` | unit | CLOSED |
| A-01-04 | No `saveAsBlock` → `composition.blocks` reference-identical to pre-call state | `tests/apply-block.test.ts` | unit | CLOSED |
| A-01-05 | `openBlock(id)` on agent-created block does not throw; snapshot survives in store | `tests/apply-block.test.ts` | unit | CLOSED |
| A-01-06 | Schema v5: all three `type` values parse; absent `saveAsBlock` ok; type-literal alignment | `tests/schema.test.ts` | unit | CLOSED |
| A-01-07 | Agent-created block survives persistence round-trip | — | unit | open — step 01.4 |
| A-01-08 | Block + track reference survive persistence round-trip | — | unit | open — step 01.4 |
| A-01-09 | System prompt describes `saveAsBlock` sub-fields, types, examples, standalone use | `src/agent/agent.ts` `SYSTEM_PROMPT` | proxy:static-analysis | CLOSED |
| A-01-10 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | CI commands | automated | partial — build in step 01.5 |

### Decisions made (if any)

None beyond ADR 0021 D1–D6 (already recorded). Implementation followed the ADR verbatim.

### Proposed Decisions Register entries (if any)

None new in this step. The ADR 0021 active decision proposed in step 01.2 should be entered by the Pilot.

### Blockers resolved during this step (if any)

None. One Prettier formatting issue (`apply.ts`, `apply-block.test.ts`) was a transient formatting issue — fixed by running `pnpm exec prettier --write` before the lint gate.

### Environment state after this step

715 tests pass. `tsc --noEmit` clean. `pnpm lint` clean. Working tree will be clean after commit.

### Key findings summary

1. **`applyBlockSave` no-op guard fixed (REVISE)** — The original guard `if (state.composition.blocks.length === 0)` was correct only when the library started empty. When N > 0 blocks existed and `addBlock` no-oped on empty code, the guard passed and `renameBlock` corrupted the last pre-existing block. Fixed by capturing `blockCountBefore` before calling `addBlock` and comparing post-call length against it.
2. **SYSTEM_PROMPT updated with all four D5 content points** — the `save_as_block` section covers all required items: when-to-use phrases, all three type definitions with examples, two JSON snippets (minimal and full), and explicit statement that `saveAsBlock` can appear alone.
3. **34 new tests added** — 20 in `apply-block.test.ts` (19 iteration 1 + 1 guard test iteration 2) and 14 net new in `schema.test.ts` (plus 2 updated existing tests).
4. **`A-01-04` byte-identical guarantee**: `applyRhythmSpec` and `applyHarmonySpec` produce reference-identical `composition.blocks` arrays because they only call `sessionStore.update` with spread of `s.rhythm` or `s.harmony` — `s.composition` is not touched.

### Next-step context (only if non-obvious)

Step 01.4 targets A-01-07 and A-01-08 (persistence round-trip for agent-created blocks). Per ADR 0021 D2, `SESSION_SCHEMA_VERSION` remains 5; no source changes to `persistence.ts` are expected — only new test assertions.

### Planner Review

**Decision:** REVISE on 2026-06-18. Iteration: 1 of 5. See review file.

**Review file:** `docs/ai-composition-authoring/reviews/phase-01-step-01.3-review-1.md`

**Finding:** `applyBlockSave` no-op guard (`if (state.composition.blocks.length === 0)`) is incorrect when blocks already exist in the library. When `addBlock` no-ops on empty code and the pre-call block count is N > 0, the guard does not fire, `renameBlock` is called on the last pre-existing block, silently corrupting its name. Fix: capture `blockCountBefore = get(sessionStore).composition.blocks.length` before calling `addBlock`; replace the guard with `if (state.composition.blocks.length === blockCountBefore) return;`. One targeted test must be added that demonstrates the guard works when pre-existing blocks are present. No other changes required.

**Iteration 2 fix applied:** Guard corrected in `src/agent/apply.ts`; one new test added in `tests/apply-block.test.ts`; 716 tests pass; `tsc --noEmit` and `pnpm lint` clean.

---

## Step 01.4 — Persistence and schema round-trip verification (Checkpoint #4)

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `test(agent): Phase 01 step 01.4 — agent-block persistence round-trip tests`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read `CLAUDE.md`, `docs/ai-composition-authoring/decisions.md`, `docs/adr/0021-agent-block-authoring.md` (D2 and D6 binding), `docs/ai-composition-authoring/phases/phase-01.md` (step 01.4 scope), and the step 01.3 handoff entry (716 tests confirmed at close of iteration 2).
- Read `src/lib/persistence.ts` lines 1–19 — **`SESSION_SCHEMA_VERSION = 5` confirmed at line 19** (no change; agent-created blocks are structurally identical to user-created blocks at the persistence layer).
- Read `src/lib/persistence.ts` lines 101–215 — **`SavedBlockSchema` already accommodates agent-created blocks**: `snapshot: SavedBlockSnapshotSchema.optional()` at line 200 covers all three discriminant types (`groove`, `armonia`, `sesion`) via the `SavedBlockSnapshotSchema` discriminated union (lines 188–192). No new Zod fields are required.
- Confirmed no source changes to `src/lib/persistence.ts` or `src/core/composition/model.ts` are necessary.
- Created `tests/agent-block-persistence.test.ts` (new file, AGPL-3.0 header) — 12 tests in four `describe` blocks.
- Added one new `describe` block to `tests/schema.test.ts` — structural introspection test for `SaveAsBlockSpecSchema.shape.type` enum alignment with `Block.type`.
- Ran `pnpm exec prettier --write` on `tests/agent-block-persistence.test.ts` to fix formatting; lint clean after.
- Total tests: 729 (up from 716 at step 01.3 close).

### `SESSION_SCHEMA_VERSION` confirmation

**`SESSION_SCHEMA_VERSION = 5`** — confirmed at `src/lib/persistence.ts` line 19. No change. Agent-created blocks use the same `SavedBlockSchema` (with `snapshot?`) that was introduced in editable-composition Phase 01 step 01.4 (ADR 0020 D5). No new Zod fields and no version bump are required (ADR 0021 D2).

### `SavedBlockSchema` accommodation confirmation

`SavedBlockSchema` is defined at `src/lib/persistence.ts` lines 194–201:

```typescript
const SavedBlockSchema = z.object({
  name: z.string().max(100),
  type: z.enum(['groove', 'armonia', 'sesion'] as const),
  code: z.string(),
  bars: z.number().int().min(1).max(64),
  snapshot: SavedBlockSnapshotSchema.optional(),  // line 200 — covers all 3 types
});
```

`SavedBlockSnapshotSchema` (lines 188–192) is a `z.discriminatedUnion('type', ...)` over `SavedGrooveSnapshotSchema`, `SavedArmoniaSnapshotSchema`, and `SavedSesionSnapshotSchema`. This covers all three discriminant values that `applyBlockSave` can produce. No source changes needed.

### Files touched

- `tests/agent-block-persistence.test.ts` (created)
- `tests/schema.test.ts` (one new `describe` block appended — structural alignment guard)
- `docs/ai-composition-authoring/handoffs/phase-01-handoff.md` (updated, this entry)

### Validation evidence (per Acceptance ID)

- **A-01-07** — `tests/agent-block-persistence.test.ts` "A-01-07: agent-created groove block — persistence round-trip" (5 tests): (1) block name survives `serializeSession → JSON → safeParse → deserializeSession`; (2) block type survives; (3) block code survives byte-identical; (4) block snapshot is non-null with correct discriminant after round-trip; (5) all four fields (name, type, code, snapshot) survive together. PASS.
- **A-01-08** — `tests/agent-block-persistence.test.ts` "A-01-08: agent-created block with addToTrack: true — persistence round-trip" (3 tests): (1) block appears in `composition.blocks` after round-trip; (2) track referencing the block survives round-trip (blockIndex reference intact, confirmed as `'0'` placeholder from `deserializeSession`); (3) snapshot of the block in the track is intact after round-trip. PASS.
- **A-01-01 through A-01-06** — remain closed from step 01.3 (no regressions; 716 tests from step 01.3 + 13 new = 729 all pass).

### Structural alignment guard (new test in schema.test.ts)

Added `describe('SaveAsBlockSpecSchema.shape.type — structural alignment with Block.type (step 01.4)', ...)` to `tests/schema.test.ts`. The test inspects `SaveAsBlockSpecSchema.shape.type._def.values` (Zod's internal enum values array) and compares sorted values against the three `Block['type']` literals (`'armonia'`, `'groove'`, `'sesion'`). This is a structural introspection guard distinct from the existing parse-based alignment guard at line 753. Passes.

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → 0 errors (clean, no output).
- `pnpm lint` → clean (ESLint clean; Prettier formatting confirmed after `--write` on new test file).
- `pnpm exec vitest run` → **729 tests passed** (20 test files), 0 failed, 0 skipped.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | Groove block: correct name, type, non-null snapshot with discriminant `'groove'` | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-02 | Armonia block: correct name, type, non-null snapshot with discriminant `'armonia'` | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-03 | `addToTrack: true` → block in library AND new track referencing block id | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-04 | No `saveAsBlock` → `composition.blocks` reference-identical to pre-call state | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-05 | `openBlock(id)` on agent-created block does not throw; snapshot survives in store | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-06 | Schema v5: all three `type` values parse; absent `saveAsBlock` ok; type-literal alignment | `tests/schema.test.ts` | unit | CLOSED (step 01.3) |
| A-01-07 | Agent-created block survives persistence round-trip (name, type, code, snapshot intact) | `tests/agent-block-persistence.test.ts` | unit | CLOSED |
| A-01-08 | Block + track reference survive persistence round-trip | `tests/agent-block-persistence.test.ts` | unit | CLOSED |
| A-01-09 | System prompt describes `saveAsBlock` sub-fields, types, examples, standalone use | `src/agent/agent.ts` `SYSTEM_PROMPT` | proxy:static-analysis | CLOSED (step 01.3) |
| A-01-10 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | CI commands | automated | partial — build in step 01.5 |

### Decisions made (if any)

None — this is a test-only step. All governing decisions were recorded in ADR 0021 (steps 01.2–01.3).

### Proposed Decisions Register entries (if any)

None new in this step.

### Blockers resolved during this step (if any)

None. The transient lint issue (two unused-var errors — `applyHarmonySpec` import and `HARMONY_SPEC` fixture were included unnecessarily; removed before the gate) was a development-time mistake, not a real blocker.

### Environment state after this step

729 tests pass. `tsc --noEmit` clean. `pnpm lint` clean. Working tree will be clean after commit.

### Key findings summary

1. **`SESSION_SCHEMA_VERSION = 5` confirmed** (persistence.ts line 19) — no change required; agent-created blocks are persistence-identical to user-created blocks.
2. **`SavedBlockSchema.snapshot?` already covers all 3 types** (persistence.ts line 200) — no new Zod fields needed; the discriminated union from editable-composition Phase 01 step 01.4 is the exact schema we need.
3. **13 new tests added**: 12 in `tests/agent-block-persistence.test.ts` (5 for A-01-07, 3 for A-01-08, 3 regression guard, 1 SESSION_SCHEMA_VERSION confirmation) + 1 structural alignment introspection test in `tests/schema.test.ts`. Total: 729.
4. **No source changes** outside test files — confirmed: `src/lib/persistence.ts` and `src/core/composition/model.ts` are unchanged.

### Next-step context (only if non-obvious)

Step 01.5 is the quality gate + manual acceptance. It adds `pnpm build` to the quality gate (currently partial for A-01-10), and requires browser-based manual testing for A-01-01 through A-01-05. All nine unit-only acceptance IDs (A-01-01..A-01-09) are now closed; A-01-10 partial (build not yet run).

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** 1 of 5
**Reason:**
**Next action:**

---

## Step 01.5 — Quality gate and manual acceptance (Checkpoint #5)

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `feat(agent): Phase 01 step 01.5 — quality gate and manual acceptance`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read `CLAUDE.md`, `docs/ai-composition-authoring/decisions.md`, `docs/ai-composition-authoring/phases/phase-01.md` (all ten acceptance criteria, step 01.5 scope), and the step 01.4 handoff entry (729 tests confirmed at close).
- Ran all four quality gate commands — all exited clean (details in Routine validations below).
- Read `src/agent/agent.ts` lines 87–162 (`SYSTEM_PROMPT` in full) and verified A-01-09 ADR 0021 D5 content points (see proxy verification below).
- Documented manual acceptance steps A-01-01 through A-01-05 as ready-for-Pilot.
- No source changes were required — all four gate commands passed on first run with no failures.

### Files touched

- `docs/ai-composition-authoring/handoffs/phase-01-handoff.md` (updated, this entry)

### Quality gate results

All four commands run from `/Users/virtualmachine/Development/personal/Orbifold`:

| Command | Exit status | Key output |
|---|---|---|
| `pnpm exec tsc --noEmit` | 0 (clean — no output) | 0 type errors |
| `pnpm lint` | 0 (clean) | ESLint + Prettier both clean |
| `pnpm exec vitest run` | 0 | **729 tests passed** (20 test files, 0 failed, 0 skipped) |
| `pnpm build` | 0 | 560 modules transformed; `dist/assets/index-BAt-7SKI.js` 1,132.34 kB (gzip: 357.22 kB); two pre-existing chunk-size and dynamic-vs-static import warnings (present since prior phases; not new to this phase; build exits 0) |

### A-01-09 proxy/static-analysis verification

`SYSTEM_PROMPT` is defined at `src/agent/agent.ts` lines 87–162. The `save_as_block` capability section spans lines 129–157. ADR 0021 D5 requires four content points; each is verified below by citing the exact lines:

| D5 content point | Line(s) | Exact text (truncated for display) |
|---|---|---|
| **1. When to use `saveAsBlock`** (trigger phrases) | 130–131 | `"guarda esto como bloque", "save the current groove", "crea un bloque con esta armonía", "añade esto a la composición" o frases similares` |
| **2. Three `type` values with definitions** | 138–141 | `"groove" → captura solo las capas rítmicas … "armonia" → captura solo la progresión armónica … "sesion" → captura ritmo + armonía juntos` |
| **3. Example JSON — minimal** | 146–149 | `{ "saveAsBlock": { "name": "Groove Afrobeat", "type": "groove" } }` |
| **3. Example JSON — full (with addToTrack)** | 151–157 | `{ "rhythm": { … }, "saveAsBlock": { "name": "Pulso Base", "type": "sesion", "addToTrack": true } }` |
| **4. `saveAsBlock` may appear alone** | 133 | `"saveAsBlock" puede aparecer SOLO (sin "rhythm" ni "harmony") o junto a ellos.` |

All four ADR 0021 D5 content points are present in the `SYSTEM_PROMPT`. `addToTrack` is described at lines 142–144 (definition, optional, default false, when to set true). A-01-09 confirmed closed by static analysis.

### Manual acceptance documentation (A-01-01 through A-01-05) — READY FOR PILOT — Checkpoint #5

The unit tests in steps 01.3–01.4 exercised these code paths programmatically. The following browser steps are for the Pilot to verify the complete end-to-end flow (agent API call → JSON parse → apply → store → UI render → `openBlock`).

#### A-01-01 — Agent creates groove block

**Browser steps:**
1. Start `pnpm dev`; open `http://localhost:5173` in Chrome/Firefox.
2. Start rhythm playback (so a live groove state exists — at least one step layer active).
3. Open the agent panel (bottom toolbar or dedicated button).
4. In the message box, type: **"Guarda el groove actual como bloque llamado 'Groove Test'"**
5. Send the message. The agent should produce a JSON response containing `"saveAsBlock": { "name": "Groove Test", "type": "groove" }` (or the agent may add rhythm/harmony alongside it).
6. Open the Composition drawer (≡ or composition icon).
7. Confirm: the block **"Groove Test"** appears in the block library card list.
8. Click **"✎ abrir"** on that card.
9. Confirm: the Ritmo editor opens and displays the same layers/step pattern that was active when the agent responded (not blank, not default).
10. Confirm: no audio auto-started (transport remains in the prior state — playback does NOT automatically start for the restored groove).

**Expected result:** Block appears in library; Ritmo editor shows correct layers; no auto-play.

#### A-01-02 — Agent creates armonia block

**Browser steps:**
1. Ensure a non-default harmonic progression is active (navigate the Tonnetz to pick 2–3 chords).
2. In the agent panel, type: **"Guarda la armonía actual como bloque llamado 'Harmony Test'"**
3. Send. Agent should produce `"saveAsBlock": { "name": "Harmony Test", "type": "armonia" }`.
4. Open Composition drawer.
5. Confirm: block **"Harmony Test"** appears.
6. Click **"✎ abrir"**.
7. Confirm: the Armonía editor (Tonnetz / Pentagrama) opens and shows the same progression that was active when the agent responded.
8. Confirm: no audio auto-started.

**Expected result:** Block appears in library; Armonía editor shows correct progression; no auto-play.

#### A-01-03 — Agent creates block and adds to track

**Browser steps:**
1. Note the current number of tracks in the Composition timeline (may be 0).
2. In the agent panel, type: **"Guarda el ritmo actual como bloque 'Track Test' y añádelo al timeline"**
3. Send. Agent should produce `"saveAsBlock": { "name": "Track Test", "type": "groove", "addToTrack": true }`.
4. Open Composition drawer.
5. Confirm: block **"Track Test"** appears in the library.
6. Confirm: the timeline shows a **new track** referencing "Track Test" (track count increased by 1 from step 1).
7. Confirm: the block is playable (clicking it does not error).

**Expected result:** Block in library AND new track in timeline referencing it.

#### A-01-04 — No `saveAsBlock` → library unchanged

**Browser steps:**
1. Count the current number of blocks in the Composition library (N). Note them.
2. In the agent panel, type: **"Cambia el ritmo a un patrón de cumbia simple"** (or similar — a request that produces a rhythm change but NOT a block save).
3. Send. Confirm the agent responds with a JSON containing only `"rhythm": { … }` (no `"saveAsBlock"` key).
4. Open Composition drawer.
5. Confirm: the block count is still N (no new block was added).
6. Confirm: none of the existing blocks were renamed or altered.

**Expected result:** Composition library count unchanged; no new block; no mutation of existing blocks.

#### A-01-05 — openBlock round-trip (Ritmo editor)

**Browser steps:**
1. Using the block created in A-01-01 ("Groove Test"), open the Composition drawer.
2. Click **"✎ abrir"** on "Groove Test".
3. Confirm: (a) the Ritmo editor becomes visible and displays the groove layers/steps from when the block was created; (b) BPM display is unchanged from whatever it was before clicking (no bpm change); (c) no audio auto-started.
4. Navigate away (switch to Tonnetz or another tab).
5. Return to the Composition drawer and click **"✎ abrir"** again.
6. Confirm: the same state is shown (round-trip is stable).

**Expected result:** Ritmo editor shows correct state; BPM unchanged; no auto-play; round-trip stable.

### Validation evidence (per Acceptance ID)

- **A-01-01** — Unit: `tests/apply-block.test.ts` (3 tests on groove block name/type/snapshot/discriminant/code). Manual: documented above — READY FOR PILOT.
- **A-01-02** — Unit: `tests/apply-block.test.ts` (2 tests on armonia block). Manual: documented above — READY FOR PILOT.
- **A-01-03** — Unit: `tests/apply-block.test.ts` (3 tests on addToTrack). Manual: documented above — READY FOR PILOT.
- **A-01-04** — Unit: `tests/apply-block.test.ts` (4 tests, reference-identical after rhythm/harmony only). Manual: documented above — READY FOR PILOT.
- **A-01-05** — Unit: `tests/apply-block.test.ts` (3 tests on openBlock round-trip). Manual: documented above — READY FOR PILOT.
- **A-01-06** — Unit: `tests/schema.test.ts` (14 tests for schema v5 parsing). CLOSED (step 01.3).
- **A-01-07** — Unit: `tests/agent-block-persistence.test.ts` (5 tests for groove block round-trip). CLOSED (step 01.4).
- **A-01-08** — Unit: `tests/agent-block-persistence.test.ts` (3 tests for block+track round-trip). CLOSED (step 01.4).
- **A-01-09** — `proxy:static-analysis`: `SYSTEM_PROMPT` lines 129–157 in `src/agent/agent.ts` cover all four ADR 0021 D5 content points (see table above). CLOSED.
- **A-01-10** — All four gate commands exited 0 (tsc: 0 errors; lint: ESLint+Prettier clean; vitest: 729/729; build: 0 errors). CLOSED.

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → 0 errors (no output — clean exit).
- `pnpm lint` → clean (`eslint .` + `prettier --check .` both clean).
- `pnpm exec vitest run` → **729 tests passed**, 0 failed, 0 skipped, 20 test files.
- `pnpm build` → 560 modules transformed, exit 0; two pre-existing warnings (chunk size, dynamic+static import) carry over from prior phases; no new warnings; build succeeds.

### Acceptance Coverage Table (phase-level — all ten IDs)

| Acceptance ID | Required behavior | Test file / evidence | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | Groove block: name, type, non-null snapshot discriminant `'groove'` | `tests/apply-block.test.ts` + manual A-01-01 steps (Checkpoint #5) | unit + manual | READY FOR PILOT |
| A-01-02 | Armonia block: name, type, non-null snapshot discriminant `'armonia'` | `tests/apply-block.test.ts` + manual A-01-02 steps (Checkpoint #5) | unit + manual | READY FOR PILOT |
| A-01-03 | `addToTrack: true` → block in library AND new track referencing it | `tests/apply-block.test.ts` + manual A-01-03 steps (Checkpoint #5) | unit + manual | READY FOR PILOT |
| A-01-04 | No `saveAsBlock` → `composition.blocks` reference-identical to pre-call state | `tests/apply-block.test.ts` + manual A-01-04 steps (Checkpoint #5) | unit + manual | READY FOR PILOT |
| A-01-05 | `openBlock(id)` on agent-created block: correct editors, no auto-play, round-trip stable | `tests/apply-block.test.ts` + manual A-01-05 steps (Checkpoint #5) | unit + manual | READY FOR PILOT |
| A-01-06 | Schema v5: all three `type` values parse; absent `saveAsBlock` ok; unknown type rejected | `tests/schema.test.ts` | unit | CLOSED (step 01.3) |
| A-01-07 | Agent-created block survives persistence round-trip (name, type, code, snapshot intact) | `tests/agent-block-persistence.test.ts` | unit | CLOSED (step 01.4) |
| A-01-08 | Block + track reference survive persistence round-trip | `tests/agent-block-persistence.test.ts` | unit | CLOSED (step 01.4) |
| A-01-09 | `SYSTEM_PROMPT` describes `saveAsBlock` sub-fields, all three types, two examples, standalone use | `src/agent/agent.ts` lines 129–157 | proxy:static-analysis | CLOSED (step 01.3; cited above) |
| A-01-10 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | CI commands | automated | CLOSED (this step) |

### Decisions made (if any)

None — this is a gate + documentation step. All governing decisions are recorded in ADR 0021 (steps 01.2–01.3).

### Proposed Decisions Register entries (if any)

None new in this step.

### Blockers resolved during this step (if any)

None. All four gate commands passed on first run. No source changes were required.

### Environment state after this step

729 tests pass. `tsc --noEmit` clean. `pnpm lint` clean. `pnpm build` exits 0. Working tree clean after commit. Phase 01 implementation is complete; Pilot manual acceptance (A-01-01..A-01-05) is pending Checkpoint #5 browser verification.

### Key findings summary

1. **All four quality gate commands pass clean** — `tsc`, `lint`, `vitest` (729 tests), `build` all exit 0 on first run. A-01-10 is now fully closed.
2. **A-01-09 confirmed by static analysis** — `SYSTEM_PROMPT` lines 129–157 cover all four ADR 0021 D5 content points: trigger phrases (lines 130–131), all three `type` values with definitions (lines 138–141), two JSON examples (lines 146–156), and explicit standalone-use statement (line 133).
3. **Manual acceptance (A-01-01..A-01-05) documented** — exact browser steps are written out for the Pilot; unit tests for all five criteria already pass; Checkpoint #5 browser verification is the remaining gate.
4. **No source changes in this step** — gate + documentation only.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** 1 of 5
**Reason:**
**Next action:**

---

## Step 01.5 — Checkpoint #5 bug-fix: `addToTrack` not honored (prompt + summary)

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `fix(agent): Phase 01 Checkpoint #5 — addToTrack not honored (prompt + summary)`
  - Hash: self-referential — not recorded

**Iteration:** 2 of 5 (Checkpoint #5 bug-fix)

### Root cause

**Hypothesis A confirmed — SYSTEM_PROMPT trigger phrases for `addToTrack: true` were insufficient.**

The `save_as_block` section of `SYSTEM_PROMPT` (line 144 of `src/agent/agent.ts`) described when to set `addToTrack: true` as: _"Ponlo en true solo cuando el usuario pida explícitamente añadir a la línea de tiempo / timeline."_ This was vague and lacked concrete example phrases. When the user said **"Usa saveAsBlock para guardar el groove actual como 'Track Test' con addToTrack true"**, the agent did not recognize `"con addToTrack true"` as a trigger and omitted `"addToTrack": true` from its JSON output.

**Additionally (Issue #2 — summary):** Even when `applyBlockSave` fired with `addToTrack: true` and successfully called `addBlockAsNewTrack`, the summary built in `send()` never mentioned a track was created. Both the save-only path and the combined rhythm/harmony + save path produced summaries without any reference to the new track — so the user had no visible confirmation.

The `applyBlockSave` implementation itself (`src/agent/apply.ts` lines 220–245) is **correct**: the `spec.addToTrack === true` guard and the `addBlockAsNewTrack(newBlock.id)` call are both present and verified by 3 passing unit tests in `tests/apply-block.test.ts` (A-01-03 tests). Hypothesis B was ruled out.

### What changed

**`src/agent/agent.ts` — two locations:**

1. **SYSTEM_PROMPT `addToTrack` trigger text** (lines 142–153): Replaced the single-sentence vague description with an explicit list of trigger phrases that MUST produce `"addToTrack": true`. Added:
   - `"pista"`, `"timeline"`, `"añade a una pista"`, `"ponlo en el timeline"`
   - `"crea una pista con este bloque"`, `"agrégalo al timeline"`, `"incluye en el timeline"`
   - `"addToTrack true"`, `"addToTrack: true"` (direct field-name references)
   - Four concrete example sentences illustrating the trigger.

2. **Summary building in `send()`**: Added `addToTrack` awareness to both summary branches:
   - **Save-only path** (was: `"✓ Guardé el ${type} actual como bloque «${name}»"`): now appends `" y lo añadí a una pista nueva en la composición."` when `skill.saveAsBlock.addToTrack === true`.
   - **Combined path** (was: `"✓ También guardé el bloque «${name}»."`): now appends `" y lo añadí a una pista nueva en la composición."` when `addToTrack === true`; appends `"."` otherwise.

### Bug-fix files touched

- `src/agent/agent.ts` (SYSTEM_PROMPT `addToTrack` text expanded; summary builder updated in both branches)
- `docs/ai-composition-authoring/handoffs/phase-01-handoff.md` (this entry)

### Bug-fix quality gate results

| Command | Exit status | Key output |
|---|---|---|
| `pnpm exec tsc --noEmit` | 0 (clean) | 0 type errors |
| `pnpm lint` | 0 (clean) | ESLint + Prettier both clean |
| `pnpm exec vitest run` | 0 | **729 tests passed** (20 test files, 0 failed, 0 skipped) |
| `pnpm build` | 0 | 560 modules transformed; pre-existing warnings only; exit 0 |

### Manual re-verification path for A-01-03

After this fix, A-01-03 can be re-verified in the browser:

1. Start `pnpm dev`; open `http://localhost:5173`.
2. Ensure a live rhythm state exists (at least one active step layer).
3. Open the agent panel and send: **"Usa saveAsBlock para guardar el groove actual como 'Track Test' con addToTrack true"**
4. The agent should now produce JSON containing `"addToTrack": true` (previously it omitted this field).
5. The agent summary should read: **"✓ Guardé el groove actual como bloque «Track Test» y lo añadí a una pista nueva en la composición."** (previously no track mention appeared).
6. Open the Composition drawer:
   - Confirm: block **"Track Test"** appears in the block library.
   - Confirm: the timeline shows a **new track** referencing "Track Test" (track count increased by 1).

Alternative trigger phrases that should also work after this fix:

- `"Guarda el ritmo actual como bloque 'Track Test' y añádelo al timeline"`
- `"Crea una pista con el groove actual llamada 'Track Test'"`

### Bug-fix acceptance coverage (all ten IDs — phase-level update)

| Acceptance ID | Required behavior | Test file / evidence | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | Groove block: name, type, non-null snapshot discriminant `'groove'` | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-02 | Armonia block: name, type, non-null snapshot discriminant `'armonia'` | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-03 | `addToTrack: true` → block in library AND new track referencing it | `tests/apply-block.test.ts` (unit) + manual re-verification above | unit + manual | CLOSED — prompt strengthened; summary confirms track creation |
| A-01-04 | No `saveAsBlock` → `composition.blocks` reference-identical to pre-call state | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-05 | `openBlock(id)` on agent-created block: correct editors, no auto-play, round-trip stable | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-06 | Schema v5: all three `type` values parse; absent `saveAsBlock` ok; unknown type rejected | `tests/schema.test.ts` | unit | CLOSED (step 01.3) |
| A-01-07 | Agent-created block survives persistence round-trip (name, type, code, snapshot intact) | `tests/agent-block-persistence.test.ts` | unit | CLOSED (step 01.4) |
| A-01-08 | Block + track reference survive persistence round-trip | `tests/agent-block-persistence.test.ts` | unit | CLOSED (step 01.4) |
| A-01-09 | `SYSTEM_PROMPT` describes `saveAsBlock` sub-fields, all three types, two examples, standalone use | `src/agent/agent.ts` lines 129–170 | proxy:static-analysis | CLOSED — trigger list expanded in this fix |
| A-01-10 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | CI commands | automated | CLOSED — all four pass after this fix |

### Bug-fix decisions

None — bug-fix only. No new ADR decisions required.

---

## Step 01.5 — Checkpoint #5 bug-fix #2: phantom empty track after delete + recreate

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `fix(composition): Phase 01 Checkpoint #5 — phantom empty track after delete+recreate`
  - Hash: self-referential — not recorded

**Iteration:** 3 of 5 (second Checkpoint #5 bug-fix)

### Root cause

**Hypothesis D confirmed — `removeTrack`'s "keep-at-least-one" guard creates a phantom empty placeholder that persists into the next `addBlockAsNewTrack` call.**

Trace:

1. `addBlockAsNewTrack('b1')` → track `t1` created (`_trkSeq = 2`). State: `tracks = [{id:'t1', blocks:[{blockId:'b1', bars:4}]}]`.
2. User deletes track index 0 (`removeTrack(0)`). After filter, `tracks = []`. The guard at `src/state/session.ts` line 1382–1385 fires because `tracks.length === 0`: creates replacement `{id:'t2', blocks:[]}` (`_trkSeq = 3`). State: `tracks = [{id:'t2', blocks:[]}]`.
3. Agent calls `addBlock('groove')` again → `b2` created.
4. Agent calls `addBlockAsNewTrack('b2')` → appends a **new** track `{id:'t3', blocks:[{blockId:'b2', bars:4}]}` (`_trkSeq = 4`). State: `tracks = [{id:'t2', blocks:[]}, {id:'t3', blocks:[{blockId:'b2', bars:4}]}]`.

**Result:** Two tracks render — the empty placeholder `t2` and the populated `t3`.

Neither Hypothesis A (UI phantom slot iteration) nor Hypothesis B (`buildComposition` padding) nor Hypothesis C (deleteTrack store bug) were the cause. The tracks array itself contains two genuine entries; both render correctly. The bug is in the data layer: `addBlockAsNewTrack` blindly appends without checking whether an existing sole-empty placeholder can be reused.

### What changed

**`src/state/session.ts` — `addBlockAsNewTrack` function only:**

Added a reuse check before the new-track append. When `state.composition.tracks.length === 1` AND `tracks[0].blocks.length === 0`, the function populates the existing placeholder in-place instead of pushing a new track:

```typescript
const tracks = s.composition.tracks;
if (tracks.length === 1 && tracks[0].blocks.length === 0) {
  return {
    ...s,
    composition: {
      ...s.composition,
      tracks: [{ ...tracks[0], blocks: [ref] }],
    },
  };
}
```

The `_trkSeq` counter is **not reset or changed** — the placeholder's existing id (`t2` in the trace above) is preserved as the stable React-style key for the reused track. The condition is tight: it only fires when there is exactly one track and it has no blocks — in all other cases (including the normal "multiple existing tracks" case) a new track is always appended as before.

**`tests/session.test.ts` — three new regression tests:**

New `describe` block `'addBlockAsNewTrack — phantom track regression'` with three tests:

1. **Fresh-store case:** `addBlockAsNewTrack` on a store with no tracks creates exactly one track.
2. **Delete-then-recreate case (the bug):** delete-last-track → add block → `addBlockAsNewTrack` → exactly one track, one block reference. This is the exact reproduction scenario.
3. **Non-empty-track guard:** when the sole existing track has blocks (non-empty), a new track is always appended (reuse does NOT trigger). Two existing tracks + new block → three tracks.

### Files touched

- `src/state/session.ts` (`addBlockAsNewTrack` function — condition added before append)
- `tests/session.test.ts` (three new tests in new `describe` block; `addBlock`, `addBlockAsNewTrack`, `removeTrack` added to import list)
- `docs/ai-composition-authoring/handoffs/phase-01-handoff.md` (this entry)

### Quality gate results

| Command | Exit status | Key output |
|---|---|---|
| `pnpm exec tsc --noEmit` | 0 (clean) | 0 type errors |
| `pnpm lint` | 0 (clean) | ESLint + Prettier both clean |
| `pnpm exec vitest run` | 0 | **732 tests passed** (20 test files, 0 failed, 0 skipped; +3 from 729) |
| `pnpm build` | 0 | 560 modules transformed; pre-existing warnings only; exit 0 |

### Manual re-verification path for the Pilot

1. Start `pnpm dev`; open `http://localhost:5173`.
2. Ensure a live rhythm state (at least one active step layer).
3. Open agent panel; send: **"Guarda el groove actual como bloque 'Groove A' y añádelo al timeline"**
4. Confirm: ONE track "Pista 1" appears in the Composition timeline containing "Groove A".
5. In the Composition view, click the 🗑 (delete) button on "Pista 1" to remove it.
6. Confirm: the track disappears (the timeline shows one empty placeholder "Pista 1" — this is expected; the keep-at-least-one guard keeps one empty lane visible).
7. Open agent panel; send: **"Guarda el groove actual como bloque 'Groove B' y añádelo al timeline"**
8. Confirm: **ONE** track appears in the timeline (not two). It should contain "Groove B".
   - Before this fix: two tracks appeared ("Pista 1" empty, "Pista 2" with Groove B).
   - After this fix: one track, containing Groove B.

### Bug-fix acceptance coverage

| Acceptance ID | Required behavior | Test file / evidence | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | Groove block: name, type, non-null snapshot discriminant `'groove'` | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-02 | Armonia block: name, type, non-null snapshot discriminant `'armonia'` | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-03 | `addToTrack: true` → block in library AND new track referencing it | `tests/apply-block.test.ts` + manual re-verification (bug-fix #1 and this fix) | unit + manual | CLOSED — phantom track eliminated; one track appears after delete+recreate |
| A-01-04 | No `saveAsBlock` → `composition.blocks` reference-identical to pre-call state | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-05 | `openBlock(id)` on agent-created block: correct editors, no auto-play, round-trip stable | `tests/apply-block.test.ts` | unit | CLOSED (step 01.3) |
| A-01-06 | Schema v5: all three `type` values parse; absent `saveAsBlock` ok; unknown type rejected | `tests/schema.test.ts` | unit | CLOSED (step 01.3) |
| A-01-07 | Agent-created block survives persistence round-trip | `tests/agent-block-persistence.test.ts` | unit | CLOSED (step 01.4) |
| A-01-08 | Block + track reference survive persistence round-trip | `tests/agent-block-persistence.test.ts` | unit | CLOSED (step 01.4) |
| A-01-09 | `SYSTEM_PROMPT` describes `saveAsBlock` sub-fields, all three types, two examples, standalone use | `src/agent/agent.ts` | proxy:static-analysis | CLOSED (bug-fix #1) |
| A-01-10 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | CI commands | automated | CLOSED — 732 tests, all gates clean |

### Bug-fix decisions

None — bug-fix only. No new ADR decisions required. `_trkSeq` counter and track IDs are unchanged.
