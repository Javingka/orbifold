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
