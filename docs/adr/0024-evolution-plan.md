<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0024 — Evolution Plan: multi-cycle batched autopilot evolution

- **Status:** Accepted — ratified by Pilot 2026-06-22 (D6 amended: horizon clamped to `Math.min(8, …)` — see D6)
- **Date:** 2026-06-22
- **Initiative / Phase:** ai-jam / Phase 07 (step 07.2)
- **Deciders:** Pilot (Javier)

## Context

Phase 06 reduced the per-call token cost of `sendEvolution()` via prompt compression and
inline JSON schema, but the Gemini free-tier still sees 429 errors when `intervalCycles` is
low (e.g., 4 cycles at 120 BPM = one LLM call every 8 seconds). The OpenRouter free-tier
input-token cap (~1,985 tokens) is still exceeded at 6-layer sessions even after Phase 06
compression (confirmed at ~2,343 tokens in the Pilot's browser test — see inventory §1.6).

The phase-07 inventory (§1–§3) performed real token arithmetic (at 3.0 chars/token — the
ratio confirmed by the browser test) and surfaced three open decisions (OD-1, OD-2, OD-3).
The Pilot resolved all three at Checkpoint #1. This ADR records the seven governing decisions
derived from those resolutions.

### Pilot OD resolutions at Checkpoint #1

- **OD-1 → Option B (derived horizon):** `horizon = Math.max(2, Math.round(intervalCycles / 2))`.
  No new `horizonCycles` state field; no new UI.

- **OD-2 → Option A (wrapper schema):** `EvolutionPlanSchema = z.object({ plan: z.array(AgentOutputSchema).min(1).max(8) })`.
  Plan-layer only — `SCHEMA_VERSION` stays 6; `SESSION_SCHEMA_VERSION` stays 5.

- **OD-3 → Option A + compact JSON (07.3 concern):** Drop `availableRecipeSummaries` when a
  rhythm hint is present; compact step encoding as an additional trim. Reflected here as D5;
  implementation in step 07.3.

### Token arithmetic summary (from inventory §1.7–§1.8)

| Scenario | Before | After (Option A) |
|----------|-------:|-----------------:|
| 6-layer, hint present, recipes included | 1,770 | —  |
| 6-layer, hint present, NO recipes | — | **1,164** |
| 3-layer, hint present, NO recipes | — | **1,045** |
| Worst case (no hint, 6 layers, recipes) | 2,345 | out of scope |

Option A alone brings the targeted use case (hint path, any layer count) under the 1,600
safer target and comfortably under the 1,985 hard cap.

---

## Decisions

### D1 — `EvolutionPlanSchema`: exact Zod shape

**Decision:** Introduce `EvolutionPlanSchema` in `src/agent/schema.ts` as a thin wrapper
object around an array of `AgentOutputSchema` steps. The LLM returns
`{ "plan": [ <step1>, <step2>, … ] }`.

**Exact Zod definition (binding):**

```typescript
/**
 * Schema for the LLM response to a multi-step evolution request.
 * The LLM returns { "plan": [ <AgentOutput>, … ] } — a wrapper object containing
 * 1–8 evolution steps. Each step is an AgentOutput (rhythm/harmony/musicalIntent).
 *
 * Plan-layer only — does NOT affect AgentOutputSchema or SCHEMA_VERSION (ADR 0024 D1).
 * Added in ai-jam Phase 07 (ADR 0024).
 */
export const EvolutionPlanSchema = z.object({
  plan: z.array(AgentOutputSchema).min(1).max(8),
});

export type EvolutionPlan = z.infer<typeof EvolutionPlanSchema>;
```

**Rationale:**

1. **Object wrapper over bare array:** An object wrapper `{ "plan": [...] }` is more robust
   to LLM output drift than a bare JSON array `[...]`. The `tryParseSkill` fence extraction
   regex targets `{...}` objects; bare arrays are more frequently emitted with preamble text
   that corrupts JSON parsing. The wrapper is trivially extensible with future plan-level
   metadata (e.g., `style`, `totalBars`).

2. **`min(1).max(8)` bounds:** At least 1 step is required — an empty plan is a parse failure
   (D4 handles the fallback). At most 8 steps caps plan length to prevent oversized responses
   (8 ≥ `Math.max(2, Math.round(32 / 2))` = 16 is wrong; 8 covers all practical horizons
   given `intervalCycles` max is 32 but horizon = max(2, round(32/2)) = 16 — note: the
   `max(8)` constraint means the horizon formula is clamped to 8 at most in the user
   message). The LLM is instructed to return exactly `horizon` steps; `max(8)` is a safety
   ceiling on the schema, not a reduction in the requested horizon.

3. **`SCHEMA_VERSION` stays 6:** `EvolutionPlanSchema` is plan-layer only. It wraps
   `AgentOutputSchema` but is NOT added to `AgentOutputSchema` itself. `SCHEMA_VERSION`
   tracks `AgentOutputSchema` shape changes only. No bump needed.

4. **`SESSION_SCHEMA_VERSION` stays 5:** `EvolutionPlanSchema` is never persisted. Plan
   state is runtime-only (see D2).

---

### D2 — `AutopilotState` plan fields: `currentPlan` and `planIndex`

**Decision:** Extend `AutopilotState` in `src/state/session.ts` with two new fields:
`currentPlan: AgentOutput[]` (default `[]`) and `planIndex: number` (default `0`).

**Exact TypeScript additions (binding):**

```typescript
export interface AutopilotState {
  enabled: boolean;
  intervalCycles: number;
  panelOpen: boolean;
  rhythmHint: string;
  rhythmHintText: string;
  timerStartedAt: number;
  lagWarning: boolean;
  llmError: string | null;
  /**
   * The current evolution plan returned by the LLM.
   * Applied one step per tick (D3). Empty until the first successful LLM call.
   * EPHEMERAL — not persisted (ADR 0022 D1/D7).
   */
  currentPlan: AgentOutput[];
  /**
   * Index of the next unapplied step in `currentPlan`.
   * Advances by 1 on each tick that applies a plan step.
   * Reset to 0 when a new plan arrives or when the autopilot restarts/stops.
   * EPHEMERAL — not persisted (ADR 0022 D1/D7).
   */
  planIndex: number;
}
```

**Default values (to be added to `DEFAULT_SESSION_STATE.autopilot`):**

```typescript
autopilot: {
  // ... existing fields ...
  currentPlan: [],
  planIndex: 0,
},
```

**Persistence exclusion:** `AutopilotState` is excluded from `SavedSessionSchema` as a unit
via the `autopilot`-key-absent mechanism (ADR 0022 D1). `serializeSession` enumerates fields
explicitly; `deserializeSession` returns `Omit<SessionState, 'nowPlaying' | 'autopilot'>`.
No code change to `persistence.ts`, `SavedSessionSchema`, or `SESSION_SCHEMA_VERSION` is
needed. The two new fields are automatically excluded by this existing mechanism.

**`setAutopilot()` compatibility:** The existing `setAutopilot(patch: Partial<AutopilotState>)`
accepts any subset of `AutopilotState`. Adding two new fields to the interface automatically
makes them patchable with `setAutopilot({ currentPlan: [...], planIndex: 0 })` without any
signature change.

**`AgentOutput` import:** `currentPlan: AgentOutput[]` requires importing `AgentOutput` from
`src/agent/schema.ts`. This creates a cross-module dependency from `src/state/session.ts`
(state layer) to `src/agent/schema.ts` (agent layer). The state layer is already permitted
to import from the agent layer in this project's layering model; `schema.ts` is a pure
Zod/TypeScript file with no DOM, PIXI, or Svelte imports and is safe to import anywhere.

---

### D3 — Plan-consumption loop contract

**Decision:** `tick()` in `src/agent/autopilot.ts` is rewritten to consume one plan step per
tick and re-call `sendEvolution()` only when the plan is exhausted.

**Exact contract (binding for step 07.4):**

1. **Step available** (`currentPlan.length > 0 && planIndex < currentPlan.length`): apply
   `currentPlan[planIndex]`, advance `planIndex` by 1, call `requeueLive()` if anything was
   applied. Do NOT call `sendEvolution()`. `_isEvolving` guard is NOT checked or set for
   plan-step application (step application is fast/synchronous; the guard is unnecessary).

2. **Plan exhausted or never set** (`planIndex >= currentPlan.length`): check `_isEvolving`.
   If `_isEvolving` is `true` → call `setAutopilot({ lagWarning: true })` and return. If
   `_isEvolving` is `false` → reset plan fields (`currentPlan: [], planIndex: 0`), set
   `_isEvolving = true`, call `sendEvolution()` via `.catch(() => {}).finally(() => { _isEvolving = false; })`.

3. **`_isEvolving` scope:** Guards ONLY the LLM re-call path. Does NOT gate plan-step
   application. Multiple ticks may apply plan steps concurrently (they are synchronous;
   no real concurrency). At most one `sendEvolution()` call is in flight at any time.

4. **`saveAsBlock` in plan steps is silently ignored** (D7): `tick()` calls only
   `applyRhythmSpec`, `applyHarmonySpec`, and the `musicalIntent.recipeId` resolver.
   It does NOT inspect or call `applyBlockSave`.

5. **`timerStartedAt` update:** Reset to `Date.now()` at both the step-application path and
   the LLM re-call path so the lag-progress indicator remains accurate.

**`startAutopilot()` changes (binding):** Reset `currentPlan: []` and `planIndex: 0` via
`setAutopilot(...)` when restarting, so a stale plan from a prior session is never consumed.

**`stopAutopilot()` changes (binding):** Include `currentPlan: [], planIndex: 0` in the
`setAutopilot(...)` call so the plan is cleared on stop.

---

### D4 — Empty/invalid plan safety contract

**Decision:** If `EvolutionPlanSchema.safeParse(parsed)` fails (invalid JSON, wrong schema,
or `plan: []` empty array — the Zod `min(1)` guard rejects it) OR if parsing succeeds but
`plan` is somehow empty, `sendEvolution()` calls
`setAutopilot({ llmError: '__emptyPlan__', currentPlan: [], planIndex: 0 })` and returns.

**Sentinel value:** `'__emptyPlan__'` — a machine-readable string; never shown verbatim.
The UI decodes this sentinel in `AgentPanel.svelte` via the existing `{#if autopilot.llmError}`
block, rendering the i18n key `agent.autopilot.errorEmptyPlan` (added in step 07.5).

**Why `min(1)` makes `plan: []` a parse failure:** Zod's `.min(1)` on `z.array(...)` rejects
arrays with fewer than 1 element. `{ plan: [] }` fails `safeParse` and is caught by the
same failure path as malformed JSON. No separate empty-check is needed after a successful
parse — `result.data.plan.length >= 1` is guaranteed by `EvolutionPlanSchema`.

**Error clearing:** On a subsequent successful `sendEvolution()` call, `llmError` is cleared
via `setAutopilot({ llmError: null, currentPlan: [...], planIndex: 0 })`.

---

### D5 — Input-trim rule (OD-3 resolution, implemented in step 07.3)

**Decision:** When `state.autopilot.rhythmHint` or `state.autopilot.rhythmHintText` is
non-empty, `sendEvolution()` omits `availableRecipeSummaries` from the user message entirely.

**Rationale:** When the user has specified a rhythm style hint, the LLM should use its own
cultural knowledge about that style rather than the catalog. Dropping 16 recipe summaries
(~740 tokens at 3.0 chars/token) reduces the 6-layer, hint-present worst case from 1,770
tokens to 1,164 tokens — safely under the 1,600 safer target and the 1,985 hard cap.

**Compact step encoding (OD-3 Option A + compact JSON, per Pilot resolution):** In the
`stateSnapshot.rhythm.layers` portion of the LLM user message, `steps: number[]` arrays are
rendered as compact binary strings (e.g., `"1000100010001000"`) rather than JSON arrays
(`[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]`). This is an LLM-payload-only transformation — the
stored model in `sessionStore` remains `steps: number[]` unchanged. The compact encoding
saves ~19 tokens per layer (at 3.0 chars/token); for 6 layers: ~114 additional tokens saved.

**No-hint path:** When no rhythm hint is present, `availableRecipeSummaries` is included
(the LLM needs the catalog to select a recipe). The no-hint path at 6 layers may still
exceed the 1,985 token cap; this is accepted in Phase 07 scope and deferred to a future
phase if observationally confirmed.

**Implementation note (for step 07.3 — informational, not normative here):** The compact
encoding transformation applies only to the `stateSnapshot` object serialized in the user
message. A JSDoc comment must note this is LLM-payload-only.

---

### D6 — Horizon formula (OD-1 resolution)

**Decision:** The number of plan steps requested from the LLM (horizon) is derived from
`intervalCycles` using the formula:

```typescript
const horizon = Math.min(8, Math.max(2, Math.round(state.autopilot.intervalCycles / 2)));
```

**Rationale:**
- No new state field (`horizonCycles`) is introduced — `intervalCycles` is already
  user-tunable (range 2–32, default 8).
- At default `intervalCycles = 8`: `horizon = Math.min(8, Math.max(2, 4)) = 4`.
- At minimum `intervalCycles = 2`: `horizon = Math.min(8, Math.max(2, 1)) = 2`.
- At maximum `intervalCycles = 32`: `horizon = Math.min(8, Math.max(2, 16)) = 8`.
- **D6 amendment (Pilot, 2026-06-22):** The original formula was unclamped
  (`Math.max(2, …)` only), which meant that at `intervalCycles > 16`, the user message
  asked the LLM for more than 8 steps — but `EvolutionPlanSchema.max(8)` rejects
  responses with more than 8 steps. A compliant LLM returning 16 steps would have failed
  `safeParse` → D4 `__emptyPlan__` → autopilot stuck on every cycle for high-interval
  users. The clamp (`Math.min(8, …)`) aligns the request with the schema ceiling and
  eliminates the failure mode. `intervalCycles ≤ 16` (the common range) is unaffected.

**Injection:** `horizon` is injected into the user message JSON (not hardcoded in
`SYSTEM_PROMPT_EVOLUTION`), so the system prompt remains static and does not need dynamic
templating. Example: `{ "horizon": 4, "stateSnapshot": {...}, ... }`.

---

### D7 — ADR 0022 invariants: fully preserved

**Decision:** All seven decisions from ADR 0022 are preserved without modification in Phase 07.

**Explicit preservation statement for each D1–D7:**

| ADR 0022 | Preservation in Phase 07 |
|---|---|
| D1 — `AutopilotState` in `SessionState`, excluded from `SavedSessionSchema` | Preserved. Two new plan fields added to `AutopilotState` remain excluded by the existing `autopilot`-key-absent mechanism. No change to `persistence.ts`, `SavedSessionSchema`, or `SESSION_SCHEMA_VERSION`. |
| D2 — Timer formula `intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles)` | Preserved unchanged. `startAutopilot()` computes `intervalMs` identically. |
| D3 — `_isEvolving` flag guards overlapping LLM calls | Preserved. `_isEvolving` now guards the LLM re-call path inside `tick()` (plan exhausted → `sendEvolution()`). Plan-step application is NOT gated by `_isEvolving`. |
| D4 — `sendEvolution()` NEVER pushes to `chatHistory`; NEVER calls `applyBlockSave` | Preserved unconditionally. `sendEvolution()` stores the plan in `AutopilotState` via `setAutopilot`. `tick()` applies plan steps; neither function touches `chatHistory` or calls `applyBlockSave`. `saveAsBlock` in any plan step is silently ignored at application time. |
| D5 — BPM via `get(sessionStore).bpm` only | Preserved. `autopilot.ts` reads BPM from the store; no import of `_currentBpm` from `strudel.ts`. |
| D6 (SUPERSEDED by Phase 06) — audio-awareness guard | Superseded status preserved. The Phase 06 replacement (auto-play heuristics in `startAutopilot()`) is unchanged. |
| D7 — `SCHEMA_VERSION` stays 6; `SESSION_SCHEMA_VERSION` stays 5 | Preserved. `EvolutionPlanSchema` is plan-layer only. `AgentOutputSchema` is unchanged. Both version constants are unchanged. |

**`saveAsBlock` in plan steps — null-operation contract (D4 extension):**
The `AgentOutputSchema` `superRefine` guard accepts a response containing only `saveAsBlock`.
Such a step is schema-valid and can appear in a plan. At application time, `tick()` inspects
only `step.rhythm`, `step.harmony`, and `step.musicalIntent?.recipeId` — it does NOT read
`step.saveAsBlock`. The field is silently ignored. This is intentional: autopilot is a
live-performance tool; block saving is a deliberate user action. Mixing them would create
unexpected blocks in the composition library (ADR 0022 D4 rationale).

---

## Consequences

### Files modified in steps 07.2–07.4

| File | Nature of change | Step |
|---|---|---|
| `docs/adr/0024-evolution-plan.md` | This ADR (draft) | 07.2 |
| `src/agent/schema.ts` | Add `EvolutionPlanSchema` + `EvolutionPlan` type | 07.2 |
| `src/state/session.ts` | Extend `AutopilotState` with `currentPlan`, `planIndex` | 07.2 |
| `tests/evolution-plan.test.ts` | New file — `EvolutionPlanSchema.safeParse` tests | 07.2 |
| `src/agent/agent.ts` | Rewrite `sendEvolution()` to plan mode + input trim + `SYSTEM_PROMPT_EVOLUTION` update | 07.3 |
| `tests/sendEvolution-hint.test.ts` | Extend with A-07-02/03/04/05 tests | 07.3 |
| `src/agent/autopilot.ts` | Rewrite `tick()` for plan consumption; reset plan on start/stop | 07.4 |
| `tests/autopilot.test.ts` | Extend with plan-consumption + exhaustion tests | 07.4 |

### `persistence.ts` is unchanged

No code change. `serializeSession` does not enumerate `autopilot`. `SESSION_SCHEMA_VERSION`
stays 5.

### Invariants preserved

- **`core/**` purity**: `schema.ts` and `session.ts` have no DOM/PIXI/Svelte static imports.
  `AgentOutput` type import from `schema.ts` into `session.ts` is safe (pure Zod/TypeScript).
- **`chatHistory` is uncontaminated**: `sendEvolution()` never pushes to `chatHistory`.
- **AGPL-3.0 header**: Present and unchanged on all new files.
- **`addBlock` is the single snapshot-capture path** (ADR 0021 D3): Autopilot plan steps
  never call `addBlock`. `saveAsBlock` in plan steps is silently ignored.

### Deferred

- **No-hint path over-cap** (6-layer, no hint: ~2,345 tokens): Option D5 trims the hint path
  to ≤1,164 tokens. The no-hint path remains potentially over-cap at 6 layers. Addressed in
  a future phase if observationally confirmed.
- **`horizon > 8` handling**: If `intervalCycles > 16`, `horizon > 8` but `max(8)` in the
  schema caps what the LLM can return. The effective maximum plan length is 8 regardless of
  `intervalCycles`. This truncation is acceptable; a future phase may raise the `max(8)` cap
  under a new ADR.
- **AbortController for in-flight `sendEvolution()` cancellation** — deferred from ADR 0022;
  remains deferred.
