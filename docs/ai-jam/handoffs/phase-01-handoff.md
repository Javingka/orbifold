<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Handoff — Phase 01 (AI Jam / Autopilot core)

---

## Step 01.1 — Discovery inventory (Checkpoint #1)

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `docs(agent): Phase 01 step 01.1 — ai-jam discovery inventory`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 1

### Completed

- Read `CLAUDE.md` (full — initiative context, conventions, invariants).
- Read `docs/ai-jam/phases/phase-01.md` (full — all five steps, eight acceptance criteria A-01-01..A-01-08, ADR triggers, operability requirements).
- Read `docs/ai-jam/decisions.md` (full — three carried-forward rule groups; no active decisions yet).
- Read `src/agent/agent.ts` (full — `SYSTEM_PROMPT` lines 87–171; module-level state `chatHistory`, `agentProvider`, `agentModel` lines 44–65; `send()` lines 342–473 confirming `chatHistory` mutation at lines 358 and 391; `requestAutofix()` lines 489–530).
- Read `src/agent/schema.ts` (full — `SCHEMA_VERSION = 5` line 25; `AgentOutputSchema` lines 249–265; `SaveAsBlockSpecSchema` lines 206–233; `superRefine` guard lines 256–264).
- Read `src/agent/apply.ts` (full — `applyRhythmSpec` lines 65–103; `applyHarmonySpec` lines 126–199; `applyBlockSave` lines 220–245).
- Read `src/state/session.ts` lines 1–450 — `SessionState` interface lines 323–338; `HarmonyState` lines 255–275; `RhythmState` lines 282–284; `NowPlaying` lines 292–315; `DEFAULT_SESSION_STATE` lines 347–371; `sessionStore` writable at line 381.
- Read `src/lib/persistence.ts` (full — `SESSION_SCHEMA_VERSION = 5` line 19; `SavedSessionSchema` lines 229–239 confirming `nowPlaying` absent, `autopilot` absent; `serializeSession` lines 251–327 confirming explicit-field enumeration pattern).
- Read `src/audio/strudel.ts` (full — `_currentBpm` module-private `let` at line 86, NOT exported; `_scheduler: Cyclist | null` at line 95; `isPlaying()` exported at line 316; `queueForNextCycle` JSDoc lines 217–218 confirming no cycle-boundary event in @strudel/web@1.0.3; `setTempo()` lines 299–308).
- Ran `grep -r "send(" src/ui/ --include="*.svelte" -l` → only `src/ui/AgentPanel.svelte`.
- Read `src/ui/AgentPanel.svelte` (full — boolean toggle pattern lines 93–94 `let autoplay = true; let autofixEnabled = true`; checkbox `<label class:on={autoplay}><input type="checkbox" bind:checked={autoplay} />` lines 511–519; `handleSend()` lines 264–375 calling `send()`).
- Read `docs/ai-composition-authoring/handoffs/phase-01-handoff.md` lines 1–120 (style reference for handoff format).
- Produced `docs/ai-jam/inventories/phase-01-inventory.md` covering all six sections §(a)–§(f) with exact file paths and line ranges for every claim.
- Did NOT touch any source file (`.ts`, `.svelte`).

### Files touched

- `docs/ai-jam/inventories/phase-01-inventory.md` (created)
- `docs/ai-jam/handoffs/phase-01-handoff.md` (created, this entry)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in this docs-only step. The acceptance items for this phase (A-01-01 through A-01-08) are targeted by steps 01.3 through 01.5.

### Routine validations (one-liner each, no transcripts)

- `git status` → only `docs/ai-jam/inventories/phase-01-inventory.md` and `docs/ai-jam/handoffs/phase-01-handoff.md` as new untracked files. No `.ts` or `.svelte` files modified.

### Acceptance Coverage Table

No Acceptance IDs are covered in this docs-only inventory step.

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | User can toggle autopilot on/off; session store reflects the change immediately | — | — | not yet — targeted in steps 01.3–01.5 |
| A-01-02 | When enabled with audio playing, the agent fires automatically every N Strudel cycles | — | — | not yet — targeted in steps 01.3–01.5 |
| A-01-03 | Each automatic evolution receives the current live rhythm and harmony as JSON context | — | — | not yet — targeted in steps 01.3–01.5 |
| A-01-04 | Manual agent messages continue to work normally while autopilot is running | — | — | not yet — targeted in steps 01.3–01.5 |
| A-01-05 | Disabling autopilot stops the timer; no further LLM calls are made after the toggle | — | — | not yet — targeted in steps 01.3–01.5 |
| A-01-06 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | — | — | not yet — targeted in step 01.5 |
| A-01-07 | Operator can start dev server, enable autopilot, and observe automatic evolution | — | — | not yet — targeted in step 01.5 |
| A-01-08 | `SYSTEM_PROMPT_EVOLUTION` contains: evolve directive, state JSON context, concrete example, no-saveAsBlock instruction | — | — | not yet — targeted in steps 01.3–01.5 |

### Decisions made (if any)

None — this is a read-only discovery step. Recommendations are in §(f) of the inventory as OQ-1 through OQ-5 for Pilot resolution at Checkpoint #1.

### Proposed Decisions Register entries (if any)

None in this step. ADR 0022 decisions are scoped to step 01.2 (after Pilot resolves OQ-1 through OQ-5 at Checkpoint #1).

### Blockers resolved during this step (if any)

None.

### Environment state after this step

Clean working tree (docs-only). All prior quality gates (`pnpm test`, `tsc --noEmit`, `pnpm lint`) remain passing — no source files were modified.

### Key findings summary

1. **No cycle-completion event in `@strudel/web@1.0.3`** (strudel.ts JSDoc lines 217–218, `queueForNextCycle`). BPM-derived `setInterval` is the only timer mechanism. Formula: `intervalMs = (60000 * 4 / bpm) * intervalCycles`.

2. **`_currentBpm` is NOT exported** from `strudel.ts` (line 86, `let`). BPM must be read via `get(sessionStore).bpm` — which is always in sync with the audio layer because `setBpm` in session.ts calls `setTempo(bpm)` immediately.

3. **`isPlaying()` IS exported** from `strudel.ts` (line 316). This is the correct audio-awareness guard for OQ-4. Import must be lazy (dynamic `import()`) to keep `autopilot.ts` unit-testable in Node.

4. **`send()` mutates `chatHistory` unconditionally** (lines 358 and 391 of agent.ts). `sendEvolution()` must NOT call `send()` — it must replicate the fetch loop independently, without pushing to `chatHistory`.

5. **`AutopilotState` belongs in `SessionState`** (not module-level in autopilot.ts) because the AgentPanel toggle needs Svelte reactivity via `$sessionStore.autopilot.enabled`. `SessionState` already follows the explicit-field enumeration pattern in `serializeSession`, so adding `autopilot` to the interface without adding it to `serializeSession` is sufficient to exclude it from persistence.

6. **`SCHEMA_VERSION = 5`, `SESSION_SCHEMA_VERSION = 5`** — no bumps needed. The evolution LLM call uses `AgentOutputSchema` at v5 unchanged, and `AutopilotState` is excluded from `SavedSession`.

7. **Toggle pattern in AgentPanel:** boolean state as local Svelte `let` variable + `<input type="checkbox" bind:checked={...}>` + `<label class:on={...}>`. The autopilot toggle should follow this pattern but bind to `$sessionStore.autopilot.enabled` (not a local variable) since the state needs to be read by `autopilot.ts`.

### Next-step context

OQ-1 through OQ-5 need Pilot resolution at Checkpoint #1 before step 01.2 proceeds. All five OQs with Dev recommendations are in `docs/ai-jam/inventories/phase-01-inventory.md` §(f). Summary:

- **OQ-1** (Cyclist cycle event): No event exists. Use BPM-derived `setInterval`. Dev recommends: confirmed.
- **OQ-2** (`AutopilotState` in `SessionState` vs. module-level): Dev recommends `SessionState` for Svelte reactivity.
- **OQ-3** (evolution chatHistory: add vs. clean slate): Dev recommends clean slate — autopilot is generative, not conversational; contamination would confuse user follow-up messages.
- **OQ-4** (audio-awareness guard — skip LLM when audio is not playing): Dev recommends yes — skip when `isPlaying() === false`.
- **OQ-5** (Phase 01 target: always both rhythm+harmony, or user-selectable): Dev recommends always both in Phase 01; user-selectable target is Phase 02 concern.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** 1 of 1
**Reason:**
**Next action:**
