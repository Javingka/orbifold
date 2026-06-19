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

---

## Step 01.2 — ADR 0022: autopilot state model, timer strategy, and SYSTEM_PROMPT_EVOLUTION design (Checkpoint #2)

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `docs(agent): Phase 01 step 01.2 — ADR 0022 autopilot state model and timer strategy`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 1

### Completed

- Read `CLAUDE.md` (full — initiative context, invariants, conventions).
- Read `docs/ai-jam/decisions.md` (lines 1–34 — carried-forward rules from three prior initiatives; no active decisions yet).
- Read `docs/ai-jam/inventories/phase-01-inventory.md` (full — all six sections §(a)–§(f); OQ resolutions from Pilot Checkpoint #1 confirmed in invocation context).
- Read `docs/adr/0021-agent-block-authoring.md` (full — style reference: D-prefixed decisions, TypeScript snippets, binding format, negative-list pattern, consequences table).
- Read `docs/adr/0020-block-as-state.md` (full — style reference: state-model decisions, discriminated union pattern, persistence-exclusion documentation).
- Read `docs/ai-jam/phases/phase-01.md` (full — step 01.2 prompt, all seven decisions D1–D7 required, acceptance criteria A-01-01..A-01-08).
- Read `docs/ai-jam/handoffs/phase-01-handoff.md` (step 01.1 entry — format reference for this entry).
- Produced `docs/adr/0022-autopilot-mode.md` with all seven decisions D1–D7.
- Did NOT touch any `.ts` or `.svelte` source file.

### Files read (with line ranges)

| File | Lines read |
|---|---|
| `CLAUDE.md` | full |
| `docs/ai-jam/decisions.md` | 1–34 (full) |
| `docs/ai-jam/inventories/phase-01-inventory.md` | 1–294 (full) |
| `docs/adr/0021-agent-block-authoring.md` | 1–411 (full) |
| `docs/adr/0020-block-as-state.md` | 1–448 (full) |
| `docs/ai-jam/phases/phase-01.md` | 1–304 (full) |
| `docs/ai-jam/handoffs/phase-01-handoff.md` | 1–117 (step 01.1 entry) |

### Files touched

- `docs/adr/0022-autopilot-mode.md` (created)
- `docs/ai-jam/handoffs/phase-01-handoff.md` (appended, this entry)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in this docs-only step. The acceptance items for this phase
(A-01-01 through A-01-08) are targeted by steps 01.3 through 01.5.

### Routine validations (one-liner each, no transcripts)

- `git status` → only `docs/adr/0022-autopilot-mode.md` and `docs/ai-jam/handoffs/phase-01-handoff.md` modified/new. No `.ts` or `.svelte` files touched.

### Acceptance Coverage Table

No Acceptance IDs are covered in this docs-only ADR step.

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

### Decisions made (D1–D7 summary, one line each)

- **D1** — `AutopilotState { enabled: boolean; intervalCycles: number }` added to `SessionState`; default `{ enabled: false, intervalCycles: 8 }`; excluded from `SavedSessionSchema` via explicit-field enumeration (no persistence code change needed).
- **D2** — BPM-derived `setInterval`; formula `intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles)`; BPM from `get(sessionStore).bpm`; timer restarted on `startAutopilot()` (clears any prior handle first).
- **D3** — Module-level `_isEvolving: boolean` flag in `autopilot.ts`; tick is skipped silently if `_isEvolving === true`; flag reset in `finally` block and in `stopAutopilot()`; manual `send()` calls unaffected (no shared lock).
- **D4** — `SYSTEM_PROMPT_EVOLUTION` separate constant in `agent.ts`; receives current state as JSON context; instructs evolution (not creation from scratch); explicit no-`saveAsBlock` instruction; at least one concrete before→after JSON example; no `chatHistory` mutation; same `AgentOutputSchema` v5; `sendEvolution(): Promise<void>` signature.
- **D5** — BPM read via `get(sessionStore).bpm` (NOT `_currentBpm` from strudel.ts — it is private/unexported); always in sync because `setBpm` calls `setTempo` and updates the store atomically.
- **D6** — Dynamic `import('../audio/strudel.js')` at tick time to get `isPlaying()`; skip tick silently if `!isPlaying()`; dynamic import keeps `autopilot.ts` unit-testable in Node (avoids WebAudio/DOM at parse time).
- **D7** — `SCHEMA_VERSION` stays 5; `SESSION_SCHEMA_VERSION` stays 5; `AutopilotState` excluded from `SavedSessionSchema`; `AgentOutputSchema.superRefine` guard satisfied by evolution responses (which always include `rhythm` and/or `harmony`).

### Proposed Decisions Register entry (for Pilot to add at Checkpoint #2)

```
From `docs/adr/0022-autopilot-mode.md` (in force for ai-jam Phase 01+):
- **`AutopilotState` lives in `SessionState` and is excluded from `SavedSessionSchema`**
  (ADR 0022 D1/D7): `autopilot: AutopilotState` is a top-level field in `SessionState`;
  `serializeSession` does not enumerate it; `SESSION_SCHEMA_VERSION` stays 5.
- **Timer is BPM-derived `setInterval`; formula `intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles)`**
  (ADR 0022 D2): no Cyclist cycle-event exists in @strudel/web@1.0.3; BPM read from `get(sessionStore).bpm`.
- **`sendEvolution()` never pushes to `chatHistory` and never calls `applyBlockSave`**
  (ADR 0022 D3/D4): autopilot calls are clean-slate; concurrency guarded by module-level `_isEvolving` flag.
- **Audio-awareness guard: dynamic import of `isPlaying()` from `strudel.ts`; skip tick if false**
  (ADR 0022 D6): dynamic import preserves Node-testability of `autopilot.ts`.
```

### Blockers resolved during this step (if any)

None.

### Environment state after this step

Clean working tree (docs-only). All prior quality gates (`pnpm test`, `tsc --noEmit`, `pnpm lint`) remain passing — no source files were modified.

### Key decisions summary

1. **`AutopilotState` in `SessionState`, excluded from persistence** — Svelte reactivity is the primary driver. The explicit-field enumeration in `serializeSession` makes exclusion trivially correct with zero code changes to `persistence.ts`.

2. **`intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles)`** — Anchored to the CLAUDE.md invariant "1 Strudel cycle = 1 bar of 4/4." Example: 120 BPM × 8 cycles = 16000 ms.

3. **Module-level `_isEvolving` flag** — Prevents overlapping LLM calls without locking `send()`, preserving A-01-04 (manual messages while autopilot runs).

4. **`SYSTEM_PROMPT_EVOLUTION` with concrete before→after example** — Lesson from ADR 0021 D5: concrete examples in the prompt reduce LLM hallucination of unexpected fields. Explicit `no-saveAsBlock` instruction prevents unwanted block creation.

5. **Dynamic import of `isPlaying()`** — The cleanest solution for keeping `autopilot.ts` unit-testable in Node without introducing a parameter-injection indirection in Phase 01.

6. **No schema bumps** — Zero disruption to existing users' sessions and zero agent-schema wire changes.

### Next-step context

ADR 0022 is complete and ready for Pilot review at Checkpoint #2. After Pilot approval, step 01.3 proceeds to implement:
- `AutopilotState` interface + `setAutopilot` action in `src/state/session.ts`
- `SYSTEM_PROMPT_EVOLUTION` + `sendEvolution()` in `src/agent/agent.ts`
- `src/agent/autopilot.ts` (new) with `startAutopilot` / `stopAutopilot`
- `tests/autopilot.test.ts` (new) covering A-01-01..A-01-05

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** 1 of 1
**Reason:**
**Next action:**

---

## Step 01.3 — `AutopilotState` in session, `autopilot.ts` module, `SYSTEM_PROMPT_EVOLUTION`, and unit tests

**Date:** 2026-06-18

**Commit(s):**

- **Terminal commit:** `feat(agent): Phase 01 step 01.3 — AutopilotState, sendEvolution, autopilot.ts, unit tests`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 1

### Completed

- Read `CLAUDE.md` (full — initiative context, invariants, conventions).
- Read `docs/ai-jam/decisions.md` (full — carried-forward rules; no active decisions yet).
- Read `docs/adr/0022-autopilot-mode.md` (full — all seven decisions D1–D7, exact TypeScript snippets, binding constraints).
- Read `docs/ai-jam/phases/phase-01.md` (full — step 01.3 PROMPT, implementation targets, validation, acceptance criteria A-01-01..A-01-08).
- Read `src/state/session.ts` lines 1–400 — `SessionState` interface at lines 323–338; `DEFAULT_SESSION_STATE` lines 347–371; existing store action pattern (e.g., `setNowPlaying` lines 453–462, `setBpm` lines 473–477).
- Read `src/lib/persistence.ts` lines 1–50; lines 320–420 — `SESSION_SCHEMA_VERSION = 5` line 19; `SavedSessionSchema` confirmed no `autopilot` field; `deserializeSession` function confirmed at line 339.
- Read `src/agent/agent.ts` (full — `SYSTEM_PROMPT` lines 87–171; `send()` fetch pattern lines 363–388; `chatHistory` push at lines 358/391; `tryParseSkill` lines 191–218; `applyRhythmSpec`/`applyHarmonySpec`/`applyBlockSave` imports).
- Read `src/agent/providers.ts` (full — fetch pattern: `provider.url`, `provider.headers(key)`, `provider.body(model, system, msgs)`, `provider.parse(data)` interfaces).
- Read `tests/apply-block.test.ts` (full — AGPL header, import pattern, `describe`/`it` structure, `beforeEach` store reset pattern).
- Implemented all four targets: `AutopilotState` + `setAutopilot` in `session.ts`; `SYSTEM_PROMPT_EVOLUTION` + `sendEvolution` in `agent.ts`; new `src/agent/autopilot.ts`; new `tests/autopilot.test.ts`.
- Fixed one transient type error: `deserializeSession` return type in `persistence.ts` had to be updated from `Omit<SessionState, 'nowPlaying'>` to `Omit<SessionState, 'nowPlaying' | 'autopilot'>` because `SessionState` now has `autopilot`. No behavioral change — `applyLoadedSession` uses `sessionStore.update((s) => ({ ...s, ... }))` which preserves `autopilot` from the running store.
- Fixed one test mock issue: initial `vi.mock('../src/agent/agent.js', () => ({ sendEvolution: vi.fn() }))` shadowed `chatHistory`; updated to `importOriginal` pattern to retain `chatHistory` while mocking `sendEvolution`.
- All three validations pass clean.

### Files read (with line ranges)

| File | Lines read |
|---|---|
| `CLAUDE.md` | full |
| `docs/ai-jam/decisions.md` | 1–34 (full) |
| `docs/adr/0022-autopilot-mode.md` | 1–554 (full) |
| `docs/ai-jam/phases/phase-01.md` | 1–304 (full) |
| `src/state/session.ts` | 1–400 |
| `src/lib/persistence.ts` | 1–50; 320–420 |
| `src/agent/agent.ts` | 1–531 (full) |
| `src/agent/providers.ts` | 1–165 (full) |
| `tests/apply-block.test.ts` | 1–335 (full) |
| `docs/ai-jam/handoffs/phase-01-handoff.md` | 1–249 (prior entries) |

### Files touched

| File | Nature of change |
|---|---|
| `src/state/session.ts` | Added `AutopilotState` interface (before `SessionState`); added `autopilot: AutopilotState` field to `SessionState`; added `autopilot: { enabled: false, intervalCycles: 8 }` to `DEFAULT_SESSION_STATE` with exclusion comment; added `setAutopilot(patch)` store action |
| `src/agent/agent.ts` | Added `SYSTEM_PROMPT_EVOLUTION` constant (before `tryParseSkill`); added `sendEvolution(): Promise<void>` function (before `tryParseSkill`) |
| `src/agent/autopilot.ts` | New file: AGPL header; `_isEvolving` flag; `_timerId` handle; `tick()` internal async function; `startAutopilot()`; `stopAutopilot()` |
| `src/lib/persistence.ts` | Updated `deserializeSession` return type: `Omit<SessionState, 'nowPlaying'>` → `Omit<SessionState, 'nowPlaying' \| 'autopilot'>` (type-only fix; no behavioral change; added comment explaining exclusion) |
| `tests/autopilot.test.ts` | New file: 18 tests covering A-01-01..A-01-05, chatHistory invariant, and audio-awareness guard |
| `docs/ai-jam/handoffs/phase-01-handoff.md` | Appended this entry |

### Validation evidence (per Acceptance ID)

| Acceptance ID | Required behavior | Covered by | Status |
|---|---|---|---|
| A-01-01 | `setAutopilot` updates `sessionStore.autopilot.enabled` and `intervalCycles` correctly | `tests/autopilot.test.ts` — "setAutopilot store action (A-01-01)" describe block (5 tests) | CLOSED |
| A-01-02 | `startAutopilot` fires `sendEvolution` after `intervalMs` (BPM-derived `setInterval`) | `tests/autopilot.test.ts` — "startAutopilot timer fires sendEvolution (A-01-02)" describe block (4 tests, fake timers) | CLOSED |
| A-01-03 | Each evolution receives current session state as JSON context | `tests/autopilot.test.ts` (mock call verified); static analysis of `SYSTEM_PROMPT_EVOLUTION` in step 01.5 | PARTIAL — static analysis in 01.5 |
| A-01-04 | Concurrency guard: second tick while `_isEvolving` does not call `sendEvolution` again | `tests/autopilot.test.ts` — hanging promise concurrency test + chatHistory non-mutation test | CLOSED |
| A-01-05 | `stopAutopilot` clears timer; no further calls after stop | `tests/autopilot.test.ts` — "stopAutopilot clears timer (A-01-05)" (3 tests) | CLOSED |
| A-01-06 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | tsc + lint + vitest pass in this step; `pnpm build` in step 01.5 | PARTIAL — build in 01.5 |
| A-01-07 | Operator can start dev server and observe automatic evolution | Manual in step 01.5 | not yet |
| A-01-08 | `SYSTEM_PROMPT_EVOLUTION` contains: evolve directive, state JSON context injection, concrete example, no-`saveAsBlock` instruction | Static analysis in step 01.5 | not yet |

### Routine validations (one-liner each)

- `pnpm exec tsc --noEmit` → exit 0 (0 errors)
- `pnpm lint` → exit 0 (ESLint + Prettier both clean)
- `pnpm exec vitest run` → exit 0, **750 tests passed** (21 test files; +18 new in `tests/autopilot.test.ts`; all 732 prior tests still pass)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | User can toggle autopilot on/off; session store reflects the change immediately | `tests/autopilot.test.ts` | unit | CLOSED — 5 tests in "setAutopilot store action" block |
| A-01-02 | When enabled with audio playing, the agent fires automatically every N Strudel cycles | `tests/autopilot.test.ts` | unit (fake timers) | CLOSED — 4 tests in "startAutopilot timer fires sendEvolution" block |
| A-01-03 | Each automatic evolution receives the current live rhythm and harmony as JSON context | `tests/autopilot.test.ts` (mock call) | unit + proxy:static-analysis | PARTIAL — mock call verified; JSON context injection verified via SYSTEM_PROMPT_EVOLUTION static analysis in step 01.5 |
| A-01-04 | Manual agent messages (`send()`) continue to work normally; no deadlock, no state corruption | `tests/autopilot.test.ts` | unit | CLOSED — hanging promise concurrency test + chatHistory non-mutation test |
| A-01-05 | Disabling autopilot stops the timer; no further LLM calls are made after the toggle | `tests/autopilot.test.ts` | unit (fake timers) | CLOSED — 3 tests: stop, re-arm, idempotent restart |
| A-01-06 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | — | operability | PARTIAL — tsc/lint/test pass; `pnpm build` in step 01.5 |
| A-01-07 | Operator can start dev server, enable autopilot, and observe automatic rhythm/harmony evolution | — | operability | not yet — step 01.5 |
| A-01-08 | `SYSTEM_PROMPT_EVOLUTION` contains: evolve directive, state JSON context injection, concrete example, no-`saveAsBlock` instruction | — | proxy:static-analysis | not yet — step 01.5 |

### Key findings summary

1. **`deserializeSession` needed a type update** — Adding `autopilot: AutopilotState` to `SessionState` caused `deserializeSession`'s return type `Omit<SessionState, 'nowPlaying'>` to fail because `autopilot` was not returned. Fixed by widening the Omit to `Omit<SessionState, 'nowPlaying' | 'autopilot'>`. No behavioral change: `applyLoadedSession` uses `sessionStore.update((s) => ({ ...s, ... }))` which naturally preserves `autopilot` from the running store state.

2. **`vi.mock` factory pattern needed `importOriginal`** — The initial `vi.mock('../src/agent/agent.js', () => ({ sendEvolution: vi.fn() }))` factory replaced the entire module including `chatHistory`. Tests accessing `chatHistory` failed with "No chatHistory export is defined on the mock". Fixed by using `importOriginal` to spread all actual exports and override only `sendEvolution`.

3. **`SYSTEM_PROMPT_EVOLUTION` satisfies all ADR 0022 D4 requirements** — (1) autonomous evolution agent directive; (2) rhythm and harmony evolution instructions; (3) explicit no-`saveAsBlock` instruction; (4) concrete before→after JSON example matching the ADR 0022 D4 binding example; (5) Spanish prompt per ADR 0017 D7.

4. **`sendEvolution` replicates `send()` fetch pattern without `chatHistory`** — Uses the same provider adapters (`PROVIDERS[agentProvider]`), passes `SYSTEM_PROMPT_EVOLUTION` (not `SYSTEM_PROMPT`), passes a single-element messages array `[{ role: 'user', content: userMessage }]` (not `chatHistory`). Never pushes to `chatHistory` (before or after).

5. **Concurrency guard: `sendEvolution().finally(...)` not `await`** — `tick()` calls `sendEvolution().finally(() => { _isEvolving = false; })` without `await`, so `tick()` returns synchronously after setting `_isEvolving = true` and launching the promise. The `finally` resets the flag when the promise settles regardless of success or error.

6. **Test count: 732 → 750** — 18 new tests in `tests/autopilot.test.ts`. All 21 test files pass (750/750).

### Decisions made (if any)

None beyond ADR 0022. The `persistence.ts` type fix was a necessary consequence of the `SessionState` extension, not a new governance decision.

### Proposed Decisions Register entries (if any)

None — ADR 0022 D1–D7 cover all decisions for this step.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

All quality gates pass: `tsc --noEmit` (0 errors), `pnpm lint` (clean), `pnpm exec vitest run` (750/750 tests). Working tree committed.

### Planner Review

**Planner Review:** APPROVED on 2026-06-18. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 01.4

---

## Step 01.4 — Minimal UI toggle in AgentPanel

**Date:** 2026-06-19

**Commit(s):**

- **Terminal commit:** `feat(ui): Phase 01 step 01.4 — autopilot toggle and interval selector in AgentPanel`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 1

### Completed

- Read `CLAUDE.md` (system context — initiative, conventions, guardrails).
- Read `docs/ai-jam/decisions.md` (full — carried-forward rules; no active decisions yet).
- Read `docs/adr/0022-autopilot-mode.md` (full — D1 for store shape; D2 for `intervalCycles` range 2–32).
- Read `docs/ai-jam/phases/phase-01.md` (full — step 01.4 PROMPT, implementation targets, validation, acceptance criteria).
- Read `src/ui/AgentPanel.svelte` (full — existing structure: reactive store bindings, button/toggle pattern, import layout).
- Read `src/state/session.ts` (lines 317–520 — confirmed `setAutopilot` export at line 515; `AutopilotState` interface at lines 334–337; `autopilot` field in `SessionState` at line 360).
- Read `src/agent/autopilot.ts` (full — confirmed `startAutopilot()` at line 65; `stopAutopilot()` at line 86; both exported).
- Added `setAutopilot` to the existing `sessionStore` import line (line 26).
- Added new import line for `startAutopilot`/`stopAutopilot` from `../agent/autopilot.js` (line 27).
- Added `$: autopilot = $sessionStore.autopilot` reactive binding in script section.
- Added `toggleAutopilot()` function (calls `setAutopilot` before `startAutopilot` per ADR 0022 D2).
- Added autopilot controls div (`class="toggles autopilot-row"`) after the existing toggles div — button + numeric input.
- Fixed one Prettier formatting issue (auto-applied via `pnpm exec prettier --write`).

### Files read (with line ranges)

| File | Lines read |
|---|---|
| `CLAUDE.md` | lines 1–20 (header) + system context |
| `docs/ai-jam/decisions.md` | 1–34 (full) |
| `docs/adr/0022-autopilot-mode.md` | 1–554 (full) |
| `docs/ai-jam/phases/phase-01.md` | 1–304 (full) |
| `src/ui/AgentPanel.svelte` | 1–591 (full, before edits) |
| `src/state/session.ts` | 317–520 (AutopilotState, SessionState, setAutopilot) |
| `src/agent/autopilot.ts` | 1–93 (full) |
| `docs/ai-jam/handoffs/phase-01-handoff.md` | 1–372 (prior entries) |

### Files touched

| File | Nature of change |
|---|---|
| `src/ui/AgentPanel.svelte` | Added `setAutopilot` to session import; added `startAutopilot`/`stopAutopilot` import; added `$: autopilot` reactive binding; added `toggleAutopilot()` handler; added autopilot-row div with button + numeric input |
| `docs/ai-jam/handoffs/phase-01-handoff.md` | Appended this entry |

### Validation evidence (per Acceptance ID)

| Acceptance ID | Required behavior | Covered by | Status |
|---|---|---|---|
| A-01-01 | User can toggle autopilot on/off; session store reflects the change immediately | `toggleAutopilot()` calls `setAutopilot({ enabled: true/false })` + UI button with `class:active={autopilot.enabled}` | CLOSED (unit tests in 01.3; UI wiring here) |
| A-01-02 | When enabled with audio playing, the agent fires automatically every N Strudel cycles | `toggleAutopilot()` calls `startAutopilot()` after `setAutopilot` | CLOSED |
| A-01-03 | Each automatic evolution receives the current live rhythm and harmony as JSON context | No change — covered by `sendEvolution()` in step 01.3 | PARTIAL — static analysis in 01.5 |
| A-01-04 | Manual agent messages continue to work normally while autopilot is running | No change to `handleSend()` / `send()` path | CLOSED |
| A-01-05 | Disabling autopilot stops the timer | `toggleAutopilot()` calls `stopAutopilot()` then `setAutopilot({ enabled: false })` | CLOSED |
| A-01-06 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | tsc/lint/vitest pass in this step; `pnpm build` in step 01.5 | PARTIAL — build in 01.5 |
| A-01-07 | Operator can start dev server and observe automatic evolution | UI toggle now exists in AgentPanel | PARTIAL — manual operability check in 01.5 |
| A-01-08 | `SYSTEM_PROMPT_EVOLUTION` contains required content | No change — covered in step 01.3 | not yet — static analysis in 01.5 |

### Routine validations

- `pnpm exec tsc --noEmit` → exit 0 (0 errors)
- `pnpm lint` → exit 0 (ESLint clean; Prettier required one auto-fix via `prettier --write`, then passed)
- `pnpm exec vitest run` → exit 0, **750 tests passed** (21 test files; count unchanged from step 01.3)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | User can toggle autopilot on/off; session store reflects the change immediately | `tests/autopilot.test.ts` (unit) + AgentPanel toggle (UI) | unit + manual | CLOSED — store tests in 01.3; UI wiring here |
| A-01-02 | When enabled with audio playing, the agent fires automatically every N Strudel cycles | `tests/autopilot.test.ts` (fake timers) | unit | CLOSED |
| A-01-03 | Each automatic evolution receives the current live rhythm and harmony as JSON context | `tests/autopilot.test.ts` (mock call) | unit + proxy:static-analysis | PARTIAL — static analysis in 01.5 |
| A-01-04 | Manual agent messages (`send()`) continue to work normally while autopilot is running | `tests/autopilot.test.ts` | unit | CLOSED |
| A-01-05 | Disabling autopilot stops the timer; no further LLM calls are made after the toggle | `tests/autopilot.test.ts` | unit | CLOSED |
| A-01-06 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean | — | operability | PARTIAL — `pnpm build` in step 01.5 |
| A-01-07 | Operator can start dev server, enable autopilot, and observe automatic rhythm/harmony evolution | — | operability | PARTIAL — manual check in step 01.5 |
| A-01-08 | `SYSTEM_PROMPT_EVOLUTION` contains: evolve directive, state JSON context injection, concrete example, no-`saveAsBlock` instruction | — | proxy:static-analysis | not yet — step 01.5 |

### Key findings

1. **TypeScript cast in Svelte template required JSDoc comment pattern** — `as HTMLInputElement` inside a Svelte template event handler is rejected by the ESLint Svelte parser. Used `/** @type {HTMLInputElement} */ (e.target).value` instead (same semantics, accepted by the parser). This is consistent with how `handleProviderChange` in the same file casts `(e.target).value` via JSDoc comment (line 433).

2. **`startAutopilot()` called after `setAutopilot({ enabled: true })`** — Order is critical per ADR 0022 D2: the timer reads `intervalCycles` from the store at `startAutopilot()` call time. If `setAutopilot` were called after, the timer might read a stale value. The `toggleAutopilot()` function enforces this ordering.

3. **`stopAutopilot()` called before `setAutopilot({ enabled: false })`** — This order clears the timer first, then updates the store. Prevents the UI from showing "disabled" while the timer is still running.

4. **No layout restructuring** — The autopilot controls are added as a second `div.toggles` row after the existing autoplay/autofix row. This is the smallest possible layout addition and matches the existing `class="toggles"` pattern.

5. **Prettier formatting** — Prettier reformatted the JSDoc inline comment inside the `on:change` handler. The final formatted form `+(/** @type {HTMLInputElement} */ (e.target).value)` is accepted by both ESLint and Prettier.

### Decisions made (if any)

None beyond ADR 0022. The JSDoc-comment cast pattern is an implementation detail, not a governance decision.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

All quality gates pass: `tsc --noEmit` (0 errors), `pnpm lint` (clean), `pnpm exec vitest run` (750/750 tests). Working tree committed (pending this commit).

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** 1 of 1
**Reason:**
**Next action:**
