<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 — Autopilot core: timer loop, evolution prompt, and minimal UI toggle

**Purpose:** Add an autopilot mode where the AI agent automatically evolves the live rhythm and/or harmony every N Strudel cycles, without the user having to prompt it, while the user plays along.
**Gate:** `ai-composition-authoring` Phase 01 complete and merged to `main` (732 tests, `SCHEMA_VERSION = 5`); `main` branch clean.
**Expected phase result:** A toggle in the UI starts/stops the autopilot; while running, the agent calls the LLM on a BPM-derived timer every N cycles and applies the evolved rhythm/harmony to the live session; manual agent messages continue to work concurrently.

---

## Step 01.1 — Discovery inventory

PROMPT → Read all relevant source files and produce an inventory document. Do NOT write or edit any source file.

Required reading (in order):
1. `docs/ai-jam/decisions.md` (carried-forward rules)
2. `src/agent/agent.ts` (full — `send()`, `SYSTEM_PROMPT`, module-level state, `chatHistory`, `agentProvider`)
3. `src/agent/schema.ts` (full — `SCHEMA_VERSION`, `AgentOutputSchema`, `SaveAsBlockSpec`)
4. `src/agent/apply.ts` (full — `applyRhythmSpec`, `applyHarmonySpec`, `applyBlockSave`)
5. `src/state/session.ts` lines 1–200 (type definitions: `SessionState`, `HarmonyState`, `RhythmState`, `NowPlayingSource`)
6. `src/lib/persistence.ts` (full — `SavedSession` shape, what is and is not persisted)
7. `src/audio/strudel.ts` (full — look for any cycle-event API: callbacks, event emitters, `onCycle`, `setCps`; confirm whether `Cyclist` exposes a cycle-completion event)
8. One existing UI component that wraps `send()` calls (e.g., `src/ui/AgentPanel.svelte`) — identify the toggle pattern used in the UI for booleans

Produce `docs/ai-jam/inventories/phase-01-inventory.md` covering:
- §(a) What cycle-event API (if any) `Cyclist`/`_scheduler` exposes in the current Strudel version
- §(b) `SessionState` interface: which fields are in it; which fields appear in `SavedSession` (persisted) vs. absent (ephemeral); confirm what an `autopilot` sub-object would need to look like
- §(c) `AgentOutputSchema` current shape and `SCHEMA_VERSION` value
- §(d) How `send()` currently returns results; what it does with `chatHistory`; whether it is safe to call from a timer (no UI side-effects that would break in a background call)
- §(e) `src/audio/strudel.ts` BPM state: where `_currentBpm` is managed and whether it is exported or accessible from outside the module (needed for the timer interval calculation)
- §(f) Open questions (OQs) for Pilot resolution before ADR 0022 can be written — expected OQs include at minimum:
  - **OQ-1**: Does `Cyclist` expose a cycle-completion event? (If yes, use it; if no, use BPM-derived `setInterval`)
  - **OQ-2**: Should `AutopilotState` live in `SessionState` (reactive, visible to UI) or as module-level state in `autopilot.ts` (ephemeral, simpler)? Recommendation: in `SessionState` because the toggle needs reactivity, but excluded from `SavedSession`.
  - **OQ-3**: Should the evolution call add to `chatHistory` (conversation context) or use a clean slate each time? Recommendation: clean slate — autopilot is generative, not conversational; contaminating `chatHistory` with autopilot turns would confuse user-initiated follow-up messages.
  - **OQ-4**: Should the timer be aware of whether audio is currently playing (i.e., skip the LLM call if nothing is playing)? Recommendation: yes — calling the LLM when silence is playing is wasteful.
  - **OQ-5**: Phase 01 target: always evolve both rhythm and harmony, or let the user pick? Recommendation: always both in Phase 01; a target selector is a Phase 02 concern.

Implementation requirements:
- Read only; produce the inventory document.
- Do NOT touch any `.ts` or `.svelte` file.

Validation:
- `git status` → only `docs/ai-jam/inventories/phase-01-inventory.md` and this handoff entry are new or modified.

Expected result:
- Inventory document at `docs/ai-jam/inventories/phase-01-inventory.md` with all six sections (a)–(f) populated, with exact file paths and line ranges for every claim.
- OQ-1 through OQ-5 stated with Dev recommendation and ready for Pilot resolution at Checkpoint #1.

CHECKPOINT → Commit message:
`docs(agent): Phase 01 step 01.1 — ai-jam discovery inventory`

---

## Step 01.2 — ADR 0022: autopilot state model, timer strategy, and SYSTEM_PROMPT_EVOLUTION design

PROMPT → Read all inventory findings and Pilot OQ resolutions from Checkpoint #1, then write ADR 0022. Do NOT write or edit any source file.

Required reading (in order):
1. `docs/ai-jam/decisions.md`
2. `docs/ai-jam/inventories/phase-01-inventory.md` (full, including Pilot OQ resolutions)
3. `docs/adr/0021-agent-block-authoring.md` (style reference — D-prefixed decisions, TypeScript snippets, binding format)
4. `docs/adr/0020-block-as-state.md` (style reference for state-model decisions)

Write `docs/adr/0022-autopilot-mode.md` covering these decisions (at minimum):
- **D1** — `AutopilotState` shape: the exact TypeScript interface and where it lives in `SessionState` (`autopilot: AutopilotState`); confirm it is excluded from `SavedSession`.
- **D2** — Timer mechanism: whether to use `Cyclist` cycle events (OQ-1 resolution) or a BPM-derived `setInterval`; if `setInterval`, the exact formula for `intervalMs` from `bpm` and `intervalCycles`.
- **D3** — Concurrency model: how the autopilot avoids overlapping LLM calls (a module-level `_isEvolving` boolean flag in `autopilot.ts`; if timer fires while `_isEvolving === true`, the beat is skipped silently).
- **D4** — `SYSTEM_PROMPT_EVOLUTION` design: separate from `SYSTEM_PROMPT`; receives current rhythm+harmony JSON as context; instructs LLM to produce a musical variant; does NOT add to `chatHistory`; no new schema fields (uses same `AgentOutputSchema`).
- **D5** — BPM access: how `autopilot.ts` reads the current BPM (from the `sessionStore` directly, since `bpm` is in `SessionState`; NOT by importing the private `_currentBpm` from `audio/strudel.ts`).
- **D6** — Audio-awareness guard (OQ-4 resolution): whether `sendEvolution()` skips the LLM call when nothing is playing; exact condition checked.
- **D7** — No `SCHEMA_VERSION` bump: the evolution LLM response uses `AgentOutputSchema` at version 5 unchanged; no new response fields.

Implementation requirements:
- ADR only; no source files.
- All decisions must include binding TypeScript interface/type snippets where relevant (D1, D3, D4 especially).

Validation:
- `git status` → only `docs/adr/0022-autopilot-mode.md` and the handoff entry are new or modified.

Expected result:
- `docs/adr/0022-autopilot-mode.md` with all required decisions D1–D7, ready for the Pilot to review at Checkpoint #2.

CHECKPOINT → Commit message:
`docs(agent): Phase 01 step 01.2 — ADR 0022 autopilot state model and timer strategy`

---

## Step 01.3 — `AutopilotState` in session, `autopilot.ts` module, `SYSTEM_PROMPT_EVOLUTION`, and unit tests

PROMPT → Implement the autopilot core: extend `SessionState` with `AutopilotState`, write `src/agent/autopilot.ts`, add `SYSTEM_PROMPT_EVOLUTION` and `sendEvolution()` to `src/agent/agent.ts`, and add unit tests. Follow ADR 0022 exactly.

Required reading (in order):
1. `docs/ai-jam/decisions.md`
2. `docs/adr/0022-autopilot-mode.md` (all decisions D1–D7 — binding)
3. `src/state/session.ts` lines 1–250 (confirm `SessionState` interface location; check how other state additions were made)
4. `src/lib/persistence.ts` (confirm where `SavedSession` is defined; add `autopilot` exclusion if needed)
5. `src/agent/agent.ts` (full — to add `sendEvolution` and `SYSTEM_PROMPT_EVOLUTION`)
6. Existing test files `tests/schema.test.ts` and `tests/apply-block.test.ts` (style reference for new test file)

Implementation targets:

**`src/state/session.ts`:**
- Add `AutopilotState` interface (per ADR 0022 D1): `{ enabled: boolean; intervalCycles: number }`.
- Add `autopilot: AutopilotState` to `SessionState` interface with default `{ enabled: false, intervalCycles: 8 }`.
- Add `setAutopilot(patch: Partial<AutopilotState>): void` store action.
- Confirm `autopilot` is NOT added to `SavedSession` / `SavedSessionSchema` in `persistence.ts` (read-back check; add explicit exclusion comment if needed).

**`src/agent/agent.ts`:**
- Add `SYSTEM_PROMPT_EVOLUTION` constant: instructs the LLM to produce a musical variant of the supplied rhythm+harmony JSON; does not add to `chatHistory`; uses the same `AgentOutputSchema`.
- Add `sendEvolution(): Promise<void>` function: reads `sessionStore` for current rhythm + harmony, builds the LLM request with `SYSTEM_PROMPT_EVOLUTION`, calls the provider, parses with `AgentOutputSchema.safeParse`, applies via `applyRhythmSpec` / `applyHarmonySpec` (no `applyBlockSave`). Does NOT push to `chatHistory`. Returns `void` (fire-and-forget from the autopilot timer).

**`src/agent/autopilot.ts` (new file):**
- AGPL-3.0 header.
- Module-level `_isEvolving = false` flag (concurrency guard per ADR 0022 D3).
- Module-level `_timerId: ReturnType<typeof setInterval> | null = null`.
- `startAutopilot(): void` — reads `bpm` and `intervalCycles` from `sessionStore`; computes `intervalMs` per ADR 0022 D2 formula; calls `setInterval`; sets `_timerId`. Each timer tick: if `_isEvolving`, skip; if audio-awareness guard fails (OQ-4 / D6), skip; else `_isEvolving = true`, `sendEvolution().finally(() => { _isEvolving = false; })`.
- `stopAutopilot(): void` — clears `_timerId`, resets `_isEvolving`.
- Export both functions.

**`tests/autopilot.test.ts` (new file):**
- AGPL-3.0 header.
- Tests must cover A-01-01 through A-01-05:
  - `startAutopilot` calls `sendEvolution` after `intervalMs` elapses (use fake timers).
  - Concurrency guard: a second timer tick while `_isEvolving = true` does not call `sendEvolution` again.
  - `stopAutopilot` clears the timer; no further `sendEvolution` calls after stop.
  - `setAutopilot` store action updates `enabled` and `intervalCycles` in `sessionStore`.
  - `sendEvolution` does NOT push to `chatHistory` (verify `chatHistory.length` before/after).

Implementation requirements:
- All source changes must follow `strict` TypeScript.
- `applyRhythmSpec` and `applyHarmonySpec` imports already exist in `apply.ts`; `sendEvolution` calls them directly (no new import in `apply.ts` needed).
- No DOM imports in `src/agent/autopilot.ts` (it is unit-testable in Node).
- `SYSTEM_PROMPT_EVOLUTION` must include concrete examples of evolved JSON to satisfy the lesson from ADR 0021 D5.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → clean.
- `pnpm exec vitest run` → all tests pass, including new `tests/autopilot.test.ts`.

Expected result:
- `AutopilotState` in `SessionState`; `setAutopilot` action in store.
- `SYSTEM_PROMPT_EVOLUTION` + `sendEvolution()` in `agent.ts`.
- `src/agent/autopilot.ts` with `startAutopilot` / `stopAutopilot`.
- `tests/autopilot.test.ts` with coverage of A-01-01 through A-01-05.
- Test count increases; all prior 732 tests still pass.

CHECKPOINT → Commit message:
`feat(agent): Phase 01 step 01.3 — AutopilotState, sendEvolution, autopilot.ts, unit tests`

---

## Step 01.4 — Minimal UI toggle in AgentPanel

PROMPT → Add a minimal autopilot toggle and interval selector to `src/ui/AgentPanel.svelte`. Follow ADR 0022 and call `startAutopilot` / `stopAutopilot` from `src/agent/autopilot.ts`.

Required reading (in order):
1. `docs/ai-jam/decisions.md`
2. `docs/adr/0022-autopilot-mode.md` (D1 for store shape; D2 for `intervalCycles` range)
3. `src/ui/AgentPanel.svelte` (full — understand existing structure, reactive stores used, button/toggle pattern)
4. `src/state/session.ts` (confirm `setAutopilot` export and `AutopilotState` shape)
5. `src/agent/autopilot.ts` (confirm `startAutopilot` / `stopAutopilot` signatures)

Implementation targets:

**`src/ui/AgentPanel.svelte`:**
- Import `sessionStore`, `setAutopilot` from `../state/session.js`.
- Import `startAutopilot`, `stopAutopilot` from `../agent/autopilot.js`.
- Add a reactive `$: autopilot = $sessionStore.autopilot` binding.
- Add a toggle button labeled "Autopilot" (or equivalent per existing UI conventions). When clicked:
  - If `autopilot.enabled === false`: call `setAutopilot({ enabled: true })` then `startAutopilot()`.
  - If `autopilot.enabled === true`: call `stopAutopilot()` then `setAutopilot({ enabled: false })`.
- Add a numeric input (range 2–32, step 2) for `intervalCycles` that calls `setAutopilot({ intervalCycles: n })`. Disabled while autopilot is running (i.e., while `autopilot.enabled === true`).
- Show a visual indicator (e.g., a subtle pulse class or label change) while `autopilot.enabled === true`.
- Keep changes minimal and consistent with the existing AgentPanel layout — no new layout sections.

Implementation requirements:
- Only `src/ui/AgentPanel.svelte` is touched (no other Svelte components, no additional TS files).
- No new test files needed (the UI toggle is covered by the manual A-01-07 operability check).
- `startAutopilot()` must only be called after `setAutopilot({ enabled: true })` (so the timer interval reads the latest `intervalCycles`).

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → clean.
- `pnpm exec vitest run` → all tests pass (count unchanged from step 01.3).

Expected result:
- AgentPanel shows an Autopilot toggle button and interval selector.
- Prior test count unchanged.

CHECKPOINT → Commit message:
`feat(ui): Phase 01 step 01.4 — autopilot toggle and interval selector in AgentPanel`

---

## Step 01.5 — Quality gate and manual acceptance

PROMPT → Run all four quality gate commands, verify A-01-09 by static analysis of `SYSTEM_PROMPT_EVOLUTION`, and document manual acceptance steps A-01-01 through A-01-07 for Pilot review at Checkpoint #5. Do NOT write source code unless a gate command reveals a previously unseen failure.

Required reading (in order):
1. `docs/ai-jam/decisions.md`
2. `docs/ai-jam/phases/phase-01.md` (all seven acceptance criteria, this step's scope)
3. `src/agent/agent.ts` (read `SYSTEM_PROMPT_EVOLUTION` and cite line numbers for proxy verification)

Quality gate commands (all four must exit 0):
1. `pnpm exec tsc --noEmit`
2. `pnpm lint`
3. `pnpm exec vitest run`
4. `pnpm build`

A-01-08 proxy/static-analysis: Read `SYSTEM_PROMPT_EVOLUTION` in `src/agent/agent.ts` and verify it contains: (1) an instruction to evolve the current state rather than create from scratch; (2) the current rhythm+harmony JSON injected as context; (3) at least one concrete JSON example of an evolved output; (4) an explicit instruction that the response must NOT include `saveAsBlock`.

Manual acceptance documentation (A-01-01 through A-01-07) — write exact browser steps for Pilot execution:

**A-01-01 — Toggle starts and stops autopilot:**
1. Start `pnpm dev`; open `http://localhost:5173`.
2. Open AgentPanel.
3. Click the Autopilot toggle → confirm it shows "enabled" visual state; confirm `sessionStore.autopilot.enabled` is `true` (check via Svelte devtools or console).
4. Click the toggle again → confirm it returns to "disabled" state; no further LLM calls.

**A-01-02 — Autopilot fires automatically every N cycles:**
1. Start audio playback (play groove or session).
2. Set interval to 2 cycles.
3. Enable autopilot.
4. Observe: within ~4 seconds (at 120 BPM, 2 cycles × 2s), the rhythm or harmony changes automatically.
5. Observe: changes continue repeating at ~2-cycle intervals.

**A-01-03 — Evolution uses current session context:**
1. Navigate the Tonnetz to a specific chord (e.g., D minor).
2. Enable autopilot.
3. After the first automatic evolution, verify the harmony output is a musical neighbor of D minor (P/L/R neighbor or stepwise progression), not a random unrelated chord.
4. Repeat for rhythm: set a distinctive step pattern; verify the evolved pattern is a recognizable variant (not a completely new unrelated pattern).

**A-01-04 — Manual agent messages work while autopilot is running:**
1. Enable autopilot (interval = 4 cycles so it fires infrequently).
2. While autopilot is running, type a manual message in the agent panel ("Cambia el ritmo a un patrón de bossa nova") and send.
3. Confirm: the manual message is processed and applied.
4. Confirm: autopilot continues to fire at the configured interval after the manual message.

**A-01-05 — Disabling autopilot stops all LLM calls:**
1. Enable autopilot and wait for one automatic evolution.
2. Disable autopilot via the toggle.
3. Wait 20 seconds.
4. Confirm: no further rhythm/harmony changes occur (audio continues playing the last state).

**A-01-06 — Quality gate (automated):** All four commands exit 0.

**A-01-07 — Operability:** The above steps A-01-01 through A-01-05 combined constitute the operability check — the autopilot is fully functional from the dev server with no additional setup.

Implementation requirements:
- No source changes unless a gate command fails.
- Document all gate command outputs (exit status + key output line) in the handoff entry.

Validation:
- All four gate commands exit 0.

Expected result:
- All seven acceptance IDs documented with evidence; phase ready for Pilot Checkpoint #5 manual review.

CHECKPOINT → Commit message:
`feat(agent): Phase 01 step 01.5 — quality gate and manual acceptance`

---

## Phase Acceptance

- **A-01-01** — User can toggle autopilot on/off; session store reflects the change immediately.
  - Validation method: `unit` + `manual`
- **A-01-02** — When enabled with audio playing, the agent fires automatically every N Strudel cycles (default 8; configurable 2–32).
  - Validation method: `unit` (fake timers) + `manual`
- **A-01-03** — Each automatic evolution receives the current live rhythm and harmony as JSON context; the LLM response is a musical variant of the supplied state.
  - Validation method: `unit` + `manual`
- **A-01-04** — Manual agent messages (`send()`) continue to work normally while autopilot is running; no deadlock, no state corruption.
  - Validation method: `unit` + `manual`
- **A-01-05** — Disabling autopilot stops the timer; no further LLM calls are made after the toggle.
  - Validation method: `unit` + `manual`
- **A-01-06** — `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean.
  - Validation method: `operability`
- **A-01-07** — Operator can start dev server, enable autopilot, and observe automatic rhythm/harmony evolution without any manual prompting.
  - Validation method: `operability`
- **A-01-08** — `SYSTEM_PROMPT_EVOLUTION` contains: an evolve directive, current-state JSON context injection, at least one concrete evolved-output example, and an explicit no-`saveAsBlock` instruction.
  - Validation method: `proxy:static-analysis`

## Operability requirements

- **Boot commands**: `pnpm dev` → `http://localhost:5173` opens; audio starts on first click.
- **Required data**: none (the autopilot uses whatever live state the user has loaded).
- **Required env vars / flags**: none new — user must have an API key for the selected provider stored in `localStorage` (same as existing agent feature).
- **Smoke checks**: open the app → start audio → open AgentPanel → click Autopilot toggle → observe rhythm or harmony change within N cycle durations at 120 BPM.
- **Idempotency**: toggling autopilot off and on is safe at any point; `startAutopilot` clears any existing timer before creating a new one.

## Partial coverage from prior phase (if any)

No prior partials to address. This is Phase 01 of the `ai-jam` initiative.

## ADR Triggers

- **ADR 0022 — Autopilot state model, timer strategy, and `SYSTEM_PROMPT_EVOLUTION` design** — Trigger: step 01.2 (after Pilot resolves OQ-1 through OQ-5 at Checkpoint #1).

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/ai-jam/handoffs/phase-01-handoff.md`.
