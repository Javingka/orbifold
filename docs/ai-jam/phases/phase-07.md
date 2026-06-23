<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 07 — Evolution Plan: Multi-Cycle Batched Autopilot + Input Token Trim

**Purpose:** Fix two production failures in the autopilot: (1) Gemini free-tier 429 rate-limit errors caused by one LLM call every N cycles — solved by having the LLM return a multi-step plan covering several future cycles so calls are far less frequent; (2) OpenRouter free-tier input-token cap (~1985) still exceeded despite Phase 06 compression — solved by dropping `availableRecipeSummaries` from the payload when a `rhythmHint`/`rhythmHintFreeText` is present (the LLM uses its own cultural knowledge when a style name is given).

**Gate:** Phase 06 merged or reconciled; `pnpm test` passes at 1553 tests; `SCHEMA_VERSION = 6`; `SESSION_SCHEMA_VERSION = 5`; `AutopilotState` has `enabled`, `intervalCycles`, `panelOpen`, `rhythmHint`, `rhythmHintText`, `timerStartedAt`, `lagWarning`, `llmError` (8 fields, all excluded from `SavedSessionSchema`).

**Expected phase result:** The autopilot calls the LLM far less often (once per plan, not once per cycle), applies one plan step per tick, and re-calls the LLM only when the plan is exhausted. The per-call input payload is small enough for OpenRouter free (~≤1600 tokens when a rhythm hint is present). ADR 0022 invariants are preserved exactly.

---

## Step 07.1 — Inventory

PROMPT → Read the source-of-truth files listed below and produce `docs/ai-jam/inventories/phase-07-inventory.md`, then STOP for Pilot review. Do NOT write any source file in this step.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/ai-jam/decisions.md`
3. `docs/ai-jam/handoffs/phase-06-handoff.md` (Phase 06 final state)
4. `docs/adr/0022-autopilot-mode.md` (invariants D1–D7)
5. `docs/adr/0023-musical-intent-schema.md` (schema v6)
6. `src/agent/agent.ts` (full — focus: `SYSTEM_PROMPT_EVOLUTION`, `sendEvolution()` user message construction, token composition)
7. `src/agent/schema.ts` (full — `AgentOutputSchema` v6 shape)
8. `src/agent/autopilot.ts` (full — `tick()`, `startAutopilot()`, `stopAutopilot()`, `_isEvolving`)
9. `src/state/session.ts` — `AutopilotState` interface, `DEFAULT_SESSION_STATE.autopilot`, `setAutopilot`, `SavedSessionSchema` exclusion pattern
10. `src/core/music-knowledge/recipe-engine.ts` — `getExpressibleRecipes()` return type

**Inventory sections (all five required):**

**§1 — Current sendEvolution input composition with token estimate.**
Break down the current user message sent to the LLM into its components and estimate tokens for each:
- `stateSnapshot.rhythm.layers` — for a realistic 3-layer 16-step session, how many tokens does the JSON representation consume? (Reference: one layer with 16 steps as `[1,0,0,0,...]` = approximately 40 tokens; compact binary string `"1000100010001000"` = approximately 8 tokens; euclid object = approximately 12 tokens)
- `stateSnapshot.harmony.progression` — for a realistic 4-chord progression, how many tokens?
- `availableRecipeSummaries` — currently sent always; how many tokens for 10 recipes × 4 fields (`id`, `name`, `density`, `meter`)?
- `rhythmHintPayload` — tokens when a hint is present vs. absent
- `SYSTEM_PROMPT_EVOLUTION` — current compressed size (~350 tokens — confirm by character count ÷ 4)
- **Total estimated token budget per call today, with and without hint**
- Identify the exact threshold: which components, if dropped, bring the total under ~1600 tokens?

**§2 — AutopilotState current shape and proposed extension.**
List all 8 current `AutopilotState` fields with types and defaults. For the plan-consumption additions — `currentPlan: AgentOutput[]` and `planIndex: number` — confirm:
- Which type is appropriate (`AgentOutput` from `schema.ts` — confirm exact export name)
- Default values for both (`[]` and `0`)
- That both are **ephemeral** and automatically excluded from `SavedSessionSchema` via the existing `autopilot`-key-absent pattern (no code change to `persistence.ts`)
- That the JSDoc exclusion comment pattern (from ADR 0022 D1) applies

**§3 — Three open decisions for Pilot resolution (surface options + recommendation; do NOT resolve).**

**OD-1 — Horizon source:** How does the autopilot know how many plan steps to request?
- **Option A — New `horizonCycles` field in `AutopilotState`** (e.g., default 4): user can tune it independently of `intervalCycles`. Adds a UI control (or keeps it hidden at default). More expressive but adds a field.
- **Option B — Derived from `intervalCycles`**: `horizon = Math.round(intervalCycles / 2)` or a fixed ratio. No new field; no new UI. Simple. Less flexible.
- **Option C — LLM-chosen (bounded)**: System prompt instructs the LLM to return between 2 and 6 plan steps; no hard horizon. Flexible but unpredictable; the LLM might always return 1 or 6.
- **Recommendation** (state one clearly; do not hedge): Option B (derived, `horizon = Math.max(2, Math.round(intervalCycles / 2))`). Rationale: `intervalCycles` is already tunable; the derived horizon adapts automatically; no new state field or UI control needed; the plan always covers approximately half the current interval span, giving the LLM meaningful context for sequential evolution.

**OD-2 — Schema shape:** Should the plan be a new Zod schema, or reuse `AgentOutput[]` without a named wrapper?
- **Option A — Thin `EvolutionPlanSchema = z.object({ plan: z.array(AgentOutputSchema).min(1).max(8) })`**: Explicit named schema; version-bumpable; the LLM returns `{ "plan": [...] }`. Requires updating `SYSTEM_PROMPT_EVOLUTION` with a new example. No `SCHEMA_VERSION` bump needed because this schema is only used in `sendEvolution()` — it is not `AgentOutputSchema` itself.
- **Option B — Bare array**: Parse the response as a JSON array directly via `z.array(AgentOutputSchema)`. Simpler at parse time; no wrapper object. The LLM returns `[{...}, {...}]`. Slightly harder to extend later.
- **Recommendation** (state one clearly): Option A (`EvolutionPlanSchema` wrapper). Rationale: an object wrapper is more robust to LLM output drift (arrays starting with `[` are less commonly emitted with correct fence extraction); the wrapper is easily extensible; it aligns with the established `AgentOutputSchema` object pattern. No `SCHEMA_VERSION` bump is triggered because `EvolutionPlanSchema` is plan-layer-only, not added to `AgentOutputSchema`.

**OD-3 — Input-trim aggressiveness:** How much input to drop to get under OpenRouter's ~1985 token cap?
- **Option A — Drop `availableRecipeSummaries` when any hint is present** (minimal): When `rhythmHint` or `rhythmHintFreeText` is non-empty, omit `availableRecipeSummaries` from the user message. Estimated saving: ~100–120 tokens (10 recipes × 4 fields). Combined with other components, estimate whether this is sufficient to reach ≤1600 tokens.
- **Option B — Drop `availableRecipeSummaries` when hint present AND compact step encoding** (more aggressive): Represent `steps` arrays as a binary string `"1000100010001000"` in the LLM payload only (the stored model remains `[1,0,0,0,...]`). Saves ~30 tokens per layer (3 layers ≈ 90 tokens). Combined with Option A: estimated further reduction.
- **Recommendation** (state one clearly, with token arithmetic): Run the arithmetic from §1. If Option A alone reaches ≤1600 tokens when a hint is present, recommend Option A. If not, recommend Option B. The scope prompt expects Option A is likely sufficient — confirm or correct with actual numbers.

**§4 — ADR trigger.**
Identify that a new ADR (0024 — "Evolution Plan: multi-cycle batched autopilot evolution") will govern: the plan schema shape, plan-consumption loop invariants, backward/empty-plan safety contract, and the input-trim rule. The Pilot opens ADRs; this section flags the need. The inventory should describe what the ADR would need to cover without drafting it.

**§5 — No new test files anticipated (scope note).**
The plan schema and consumption loop have clear unit-testable surfaces: `EvolutionPlanSchema.safeParse`, `tick()` plan-step advancement, empty-plan fallback, plan-exhaustion re-call. All can be added to existing test files (`tests/autopilot.test.ts`, new `tests/evolution-plan.test.ts`). Identify the exact test file targets.

**Implementation requirements:**
- Read only. Produce `docs/ai-jam/inventories/phase-07-inventory.md`.
- Do NOT touch any `.ts` or `.svelte` file.

**Validation:**
- `git status` → only `docs/ai-jam/inventories/phase-07-inventory.md` and the handoff entry are new or modified.

**CHECKPOINT → Commit message:**
`docs(ai-jam): Phase 07 step 07.1 — evolution-plan inventory`

**STOP for Pilot review.** OD-1, OD-2, and OD-3 must be resolved before step 07.2 begins.

---

## Step 07.2 — ADR 0024 + Schema: `EvolutionPlanSchema` and `AutopilotState` plan fields

PROMPT → Read the inventory and all Pilot OD resolutions from Checkpoint #1, then:
1. Draft `docs/adr/0024-evolution-plan.md` covering all governing decisions (plan schema shape, plan-consumption invariants, input-trim rule, horizon calculation, backward/empty-plan safety, ADR 0022 preservation).
2. In `src/agent/schema.ts`: add `EvolutionPlanSchema` and export `EvolutionPlan` type. Do NOT bump `SCHEMA_VERSION` unless OD-2 resolution requires it (it should not — see OD-2 rationale).
3. In `src/state/session.ts`: extend `AutopilotState` with `currentPlan: AgentOutput[]` (default `[]`) and `planIndex: number` (default `0`). Add JSDoc exclusion comment per ADR 0022 D1 pattern. Do NOT change `SavedSessionSchema` or `SESSION_SCHEMA_VERSION`.
4. Write unit tests for `EvolutionPlanSchema` in `tests/evolution-plan.test.ts` (new file, AGPL-3.0 header).

**Required reading (in order):**
1. Inventory `docs/ai-jam/inventories/phase-07-inventory.md` (§1–§5)
2. Pilot OD-1, OD-2, OD-3 resolutions (from Checkpoint #1 handoff entry)
3. `src/agent/schema.ts` (current full content — must be read before editing)
4. `src/state/session.ts` lines 317–395 (`AutopilotState` interface and defaults — must be read before editing)
5. `docs/adr/0022-autopilot-mode.md` D1 (exclusion comment pattern)
6. `docs/adr/0023-musical-intent-schema.md` (schema versioning precedent)

**What to produce:**

`docs/adr/0024-evolution-plan.md` must cover:
- **D1**: `EvolutionPlanSchema` exact Zod shape (wrapper object, min 1 step, max 8 steps, each step is `AgentOutputSchema`)
- **D2**: `AutopilotState` plan fields — `currentPlan: AgentOutput[]` default `[]`, `planIndex: number` default `0`; both excluded from `SavedSessionSchema` via existing mechanism; JSDoc pattern
- **D3**: Plan-consumption loop contract — one step applied per tick; `planIndex` advances; when `planIndex >= currentPlan.length`, plan is exhausted → re-call LLM; `_isEvolving` guard still applies to the LLM re-call, not to step application
- **D4**: Empty/invalid plan safety — if `EvolutionPlanSchema.safeParse` fails or `plan` is empty, `tick()` skips and sets `llmError` to a specific sentinel `'__emptyPlan__'`; the UI renders it via the existing `llmError` block (no new i18n key needed unless the Pilot requests one)
- **D5**: Input-trim rule — state the OD-3 resolution precisely (when to drop `availableRecipeSummaries`; whether step encoding is compacted)
- **D6**: Horizon — state the OD-1 resolution precisely (formula or field)
- **D7**: ADR 0022 invariants preserved — `sendEvolution()` still never pushes to `chatHistory` or calls `applyBlockSave`; the plan's steps carry only `rhythm`/`harmony`/`musicalIntent`; `saveAsBlock` in any plan step is silently ignored

`src/agent/schema.ts` changes:
- Add `EvolutionPlanSchema` (per OD-2 resolution)
- Export `EvolutionPlan` inferred type
- Do NOT touch `AgentOutputSchema`, `SCHEMA_VERSION`, or any existing schema
- AGPL-3.0 header already present; add a JSDoc comment noting the Phase 07 addition

`src/state/session.ts` changes:
- Add `currentPlan: AgentOutput[]` and `planIndex: number` to `AutopilotState`
- Add defaults to `DEFAULT_SESSION_STATE.autopilot`
- JSDoc exclusion comment on both new fields (pattern: `EPHEMERAL — not persisted (ADR 0022 D1/D7)`)
- Do NOT change `serializeSession`, `SavedSessionSchema`, or `SESSION_SCHEMA_VERSION`

`tests/evolution-plan.test.ts` (new file):
- AGPL-3.0 header
- `EvolutionPlanSchema.safeParse` tests covering:
  - Valid plan with 1 step (rhythm only) → success
  - Valid plan with 3 steps (mixed rhythm/harmony/musicalIntent) → success
  - Empty array `{ plan: [] }` → failure
  - Array exceeding max (9 steps) → failure
  - Step missing all required fields → failure (guard fires)
  - Step with `saveAsBlock` only → success (schema accepts it; D7 says it is ignored at runtime)

**Constraints:**
- ADR 0022 D1–D7 must all be cited or explicitly preserved in ADR 0024
- The new plan fields in `AutopilotState` must stay within the existing `Partial<AutopilotState>` pattern used by `setAutopilot()`
- No `SESSION_SCHEMA_VERSION` bump
- `SCHEMA_VERSION` bump only if OD-2 resolution changes `AgentOutputSchema` (it should not)

**Acceptance criteria in this step:**
- A-07-01 (partial): `EvolutionPlanSchema.safeParse({ plan: [...] })` accepts valid plans and rejects empty/over-limit plans (covered by `tests/evolution-plan.test.ts`)
- A-07-07 (partial): `AutopilotState` now includes `currentPlan` and `planIndex`; both absent from `SavedSessionSchema` (confirmed by static analysis + existing persistence test)
- A-07-09 (partial): `tsc --noEmit` clean; `pnpm test` passes at ≥ prior count + new tests

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run evolution-plan` → all new schema tests pass
- `pnpm test` → ≥ 1553 + new tests; no regressions
- `git status` → only `docs/adr/0024-*.md`, `src/agent/schema.ts`, `src/state/session.ts`, `tests/evolution-plan.test.ts`, and handoff entry modified

**Commit message:**
`feat(schema): Phase 07 step 07.2 — EvolutionPlanSchema + AutopilotState plan fields (ADR 0024)`

---

## Step 07.3 — `sendEvolution()`: plan generation + input trim

PROMPT → Rewrite `sendEvolution()` in `src/agent/agent.ts` to: (a) request a multi-step plan instead of a single evolution, (b) apply the input-trim rule (OD-3 resolution), and (c) store the received plan in `AutopilotState` via `setAutopilot`. Update `SYSTEM_PROMPT_EVOLUTION` to instruct the LLM to return a plan. Add or extend tests.

**Required reading (in order):**
1. `docs/adr/0024-evolution-plan.md` (all decisions — must be absorbed before touching agent.ts)
2. `src/agent/agent.ts` (full — current `sendEvolution()` and `SYSTEM_PROMPT_EVOLUTION`)
3. `src/agent/schema.ts` (confirm `EvolutionPlanSchema` shape from step 07.2)
4. `src/state/session.ts` (`AutopilotState` — confirm `currentPlan`/`planIndex` fields)
5. `tests/sendEvolution-hint.test.ts` (understand existing mocking pattern before extending)

**What to produce:**

`src/agent/agent.ts` — `sendEvolution()` changes:

1. **Input-trim rule (OD-3 resolution):** Read `state.autopilot.rhythmHint` and `rhythmHintText`. If either is non-empty, omit `availableRecipeSummaries` from the user message entirely. If a compact step encoding was chosen (OD-3 Option B resolution), apply it only in the `stateSnapshot.rhythm.layers` portion of the JSON (convert `steps: number[]` to `steps: string` binary representation for the LLM payload only — the store value is unchanged). Include a JSDoc comment noting this is LLM-payload-only.

2. **Horizon calculation (OD-1 resolution):** Compute `horizon` from the resolved formula (e.g., `const horizon = Math.max(2, Math.round(state.autopilot.intervalCycles / 2))`). Include `horizon` in the user message so the LLM knows how many steps to generate.

3. **LLM response parsing change:** Parse the response with `EvolutionPlanSchema.safeParse` (imported from `./schema.js`), NOT `tryParseSkill`. If parsing fails or the plan is empty, call `setAutopilot({ llmError: '__emptyPlan__', currentPlan: [], planIndex: 0 })` and return.

4. **Store the plan:** On success, call `setAutopilot({ currentPlan: parsedPlan.plan, planIndex: 0, llmError: null })`. Do NOT apply any plan step here — that is `tick()`'s responsibility.

5. **Preserve invariants:** `sendEvolution()` still NEVER pushes to `chatHistory`. Still NEVER calls `applyBlockSave`. The `saveAsBlock` field in any plan step is silently ignored when `tick()` applies it.

`src/agent/agent.ts` — `SYSTEM_PROMPT_EVOLUTION` changes:

Update the system prompt to instruct the LLM to return a plan object. The updated prompt must:
- Keep its compressed size (target ≤400 tokens for the system prompt itself, not counting the user message)
- Explicitly instruct: return `{ "plan": [ <step1>, <step2>, … ] }` where each step follows the existing single-step schema
- State the horizon: "devuelve exactamente N pasos" (N injected dynamically — note this means the horizon number must appear in the user message or the system prompt must be templated; prefer injecting `horizon` in the user message JSON so the system prompt stays static)
- Preserve the existing VARIACIÓN OBLIGATORIA rule (each step must differ meaningfully from the prior state; sequential steps should form a coherent arc)
- Preserve the NUNCA `saveAsBlock` / NUNCA text outside json block rule
- Include one updated example showing a 2-step plan in the new `{ "plan": [...] }` format
- All existing assertions in `tests/agent/` that check for `SYSTEM_PROMPT_EVOLUTION` content must still pass (confirm which tests exist and what they assert before editing the prompt)

**Constraints:**
- ADR 0022 D3/D4 inviolable: no `chatHistory` push, no `applyBlockSave`
- ADR 0024 D4: empty/invalid plan → `'__emptyPlan__'` sentinel + return; do not crash
- The `tryParseSkill` function is NOT used in `sendEvolution()` after this step (plan format differs from single-step format)
- The existing `send()` and `requestAutofix()` functions are not touched in this step

**Acceptance criteria in this step:**
- A-07-02: `sendEvolution()` sends `horizon` in the user message (confirmed by unit test mock)
- A-07-03: When a rhythm hint is present, `availableRecipeSummaries` is absent from the user message (confirmed by unit test — extend `tests/sendEvolution-hint.test.ts` or add to `tests/evolution-plan.test.ts`)
- A-07-04: On valid LLM plan response, `setAutopilot` is called with `{ currentPlan: [...], planIndex: 0, llmError: null }` (confirmed by unit test mock of `setAutopilot`)
- A-07-05: On empty or invalid plan response, `setAutopilot` is called with `{ llmError: '__emptyPlan__', currentPlan: [], planIndex: 0 }` (unit test)
- A-07-09 (partial): `tsc --noEmit` clean; `pnpm test` passes with no regressions

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run sendEvolution` → targeted tests pass
- `pnpm test` → ≥ prior count + new tests; no regressions
- `git status` → only `src/agent/agent.ts`, new/extended test file(s), and handoff entry

**Commit message:**
`feat(agent): Phase 07 step 07.3 — sendEvolution plan generation + input trim`

---

## Step 07.4 — `autopilot.ts`: plan-consumption tick loop

PROMPT → Rewrite `tick()` in `src/agent/autopilot.ts` to consume one plan step per tick and only re-call `sendEvolution()` when the plan is exhausted. Extend `tests/autopilot.test.ts` with plan-consumption tests.

**Required reading (in order):**
1. `docs/adr/0024-evolution-plan.md` (D3: plan-consumption contract; D4: empty-plan safety; D7: `saveAsBlock` ignored)
2. `src/agent/autopilot.ts` (full — current `tick()`, `startAutopilot()`, `stopAutopilot()`)
3. `src/state/session.ts` (`AutopilotState` — confirm `currentPlan`/`planIndex` fields and `setAutopilot` signature)
4. `src/agent/apply.ts` (`applyRhythmSpec`, `applyHarmonySpec` — confirm signatures, no return value)
5. `tests/autopilot.test.ts` (full — understand existing test structure and mocking before extending)

**What to produce:**

`src/agent/autopilot.ts` — `tick()` rewrite:

```
async function tick(): Promise<void> {
  if (!get(sessionStore).autopilot.enabled) return;

  const { currentPlan, planIndex } = get(sessionStore).autopilot;

  if (currentPlan.length > 0 && planIndex < currentPlan.length) {
    // Plan still has steps — consume one step
    const step = currentPlan[planIndex];
    setAutopilot({ planIndex: planIndex + 1, timerStartedAt: Date.now(), lagWarning: false });

    // Apply step (ADR 0024 D3/D7: saveAsBlock silently ignored)
    if (step.rhythm) applyRhythmSpec(step.rhythm);
    if (step.harmony) applyHarmonySpec(step.harmony);
    if (step.musicalIntent?.recipeId) {
      // resolve recipe (same pattern as sendEvolution — extract to shared helper if clean)
      // ... recipe engine path (same logic from current sendEvolution, extracted here)
    }
    if (step.rhythm || step.harmony || step.musicalIntent?.recipeId) requeueLive();

    // Auto-play if needed (same heuristic as startAutopilot and sendEvolution)
    const postState = get(sessionStore);
    if (postState.nowPlaying.label === null) {
      // fire-and-forget auto-play
    }
    return;
  }

  // Plan exhausted (or never set) — re-call LLM
  if (_isEvolving) {
    setAutopilot({ lagWarning: true });
    return;
  }
  // Clear plan and start fresh
  setAutopilot({ currentPlan: [], planIndex: 0, timerStartedAt: Date.now(), lagWarning: false });
  _isEvolving = true;
  sendEvolution()
    .catch(() => {})
    .finally(() => { _isEvolving = false; });
}
```

Note: the above is pseudocode illustrating the logic. The Dev is expected to implement the exact TypeScript, following the pattern established in the current `tick()` and guided by ADR 0024. The recipe-engine path in plan-step application should be extracted to a private helper `applyPlanStep(step: AgentOutput): boolean` (returns true if anything was applied) to avoid duplicating the recipe-resolution logic between `sendEvolution()` and `tick()`. The Planner delegates this refactor decision to the Dev — if the extraction creates more coupling than it prevents, inline the logic.

`src/agent/autopilot.ts` — `startAutopilot()` changes:
- When restarting, reset `currentPlan: []` and `planIndex: 0` via `setAutopilot(...)` so a stale plan from a prior session is never consumed after restart
- The bar fill, lag warning clear, and auto-play heuristics from Phase 06 are preserved unchanged

`src/agent/autopilot.ts` — `stopAutopilot()` changes:
- Add `currentPlan: [], planIndex: 0` to the `setAutopilot(...)` call in `stopAutopilot()` so the plan is cleared when the autopilot stops

**ADR 0022 invariants — confirm explicitly:**
- `tick()` still NEVER pushes to `chatHistory`
- `tick()` still NEVER calls `applyBlockSave` (D4)
- `_isEvolving` still guards only the LLM re-call, not the plan-step application (plan-step application is fast/synchronous — no guard needed)
- The concurrency model is: multiple ticks may apply plan steps (no guard); only one `sendEvolution()` call can be in flight at a time (`_isEvolving` guard)

**New tests in `tests/autopilot.test.ts`:**

Add the following test cases (use existing mock patterns):
- **Plan consumption — step advance**: given `currentPlan = [stepA, stepB]` and `planIndex = 0`, one `tick()` applies `stepA`, calls `setAutopilot({ planIndex: 1 })`, does NOT call `sendEvolution()`
- **Plan consumption — final step**: given `planIndex = 1`, `currentPlan.length = 2`, tick applies `stepB`, sets `planIndex: 2`
- **Plan exhaustion**: given `planIndex = 2`, `currentPlan.length = 2` (exhausted), tick calls `sendEvolution()` and resets `planIndex: 0`
- **Plan exhaustion with `_isEvolving` true**: given exhausted plan and `_isEvolving = true`, tick sets `lagWarning: true` and does NOT call `sendEvolution()` again
- **startAutopilot resets plan**: `startAutopilot()` calls `setAutopilot({ currentPlan: [], planIndex: 0 })` (stale plan cleared)
- **stopAutopilot resets plan**: `stopAutopilot()` calls `setAutopilot(...)` including `currentPlan: [], planIndex: 0`
- **Empty plan on start**: given `currentPlan = []` and `planIndex = 0` (initial state), `tick()` goes directly to LLM re-call path (not step-application path)

**Constraints:**
- `applyRhythmSpec` and `applyHarmonySpec` must not be imported statically from `apply.ts` if that file has DOM dependencies — check `src/agent/apply.ts`; if it is already imported in the current `autopilot.ts` (it is not — `sendEvolution()` in `agent.ts` calls them), the Dev must either import them (if safe in Node) or keep step-application in `agent.ts` via a helper. Verify this during implementation: if `apply.ts` is DOM-free and already testable in Node, import directly; otherwise extract to a shared plan-application helper in `agent.ts`.
- AGPL-3.0 header on `autopilot.ts` is already present; do not remove

**Acceptance criteria in this step:**
- A-07-06: One tick with a non-exhausted plan applies exactly one plan step and advances `planIndex` without calling `sendEvolution()` (unit test)
- A-07-07 (full): `currentPlan` and `planIndex` fields exist in `AutopilotState` and are reset by `startAutopilot()` and `stopAutopilot()` (unit tests)
- A-07-08: One tick with an exhausted plan (or empty initial plan) triggers `sendEvolution()` and is guarded by `_isEvolving` (unit tests)
- A-07-09 (partial): `tsc --noEmit` clean; `pnpm test` passes

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run autopilot` → all autopilot tests pass (≥ prior count + new)
- `pnpm test` → ≥ prior count + new tests; no regressions
- `git status` → only `src/agent/autopilot.ts`, `tests/autopilot.test.ts`, and handoff entry

**Commit message:**
`feat(agent): Phase 07 step 07.4 — autopilot plan-consumption tick loop`

---

## Step 07.5 — i18n + UI feedback + full quality gate

PROMPT → Add i18n keys for the `'__emptyPlan__'` sentinel error if a user-visible string is warranted (see constraint below), update `AgentPanel.svelte` to decode it, then run the full quality gate.

**Required reading (in order):**
1. `src/i18n/types.ts` (confirm `Dictionary.agent.autopilot` current keys; check whether `errorLlm` and `errorRateLimit` provide sufficient coverage for plan errors or a new `errorEmptyPlan` key is needed)
2. `src/i18n/locales/es.ts`, `en.ts`, `pt.ts`, `zh.ts` (confirm existing sentinel decode pattern for `'__rateLimit__'` in `AgentPanel.svelte`)
3. `src/ui/AgentPanel.svelte` (the `{#if autopilot.llmError}` ternary block — understand the pattern before extending)

**What to produce:**

**i18n decision:** The `'__emptyPlan__'` sentinel is a developer-facing edge case (LLM returned malformed JSON or an empty plan). Evaluate: is this sufficiently covered by the generic `errorLlm` key, or does the user benefit from a distinct message? If the LLM consistently returns empty plans (e.g., wrong format), the user needs to know. Recommendation: add `errorEmptyPlan` key. If the Pilot disagrees at review, downgrade to the generic key.

If adding `errorEmptyPlan`:
- `src/i18n/types.ts`: add `errorEmptyPlan: string` to `Dictionary.agent.autopilot`
- All 4 locale files: es (authoritative), en, pt (`// i18n-draft`), zh (`// i18n-draft`)
  - es: `'El plan de evolución estaba vacío o inválido. El autopilot reintentará en el próximo ciclo.'`
  - en: `'Evolution plan was empty or invalid. Autopilot will retry on the next cycle.'`
- `src/ui/AgentPanel.svelte`: extend the `llmError` ternary to decode `'__emptyPlan__'` → `$t('agent.autopilot.errorEmptyPlan')`

**Full quality gate (A-07-09 full):**

Run and record all four checks:
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

The test count must be ≥ 1553 + all new tests added in steps 07.2–07.5. Lint must be clean. Build must produce a valid bundle.

**Reversibility / flag-off note (required per CLAUDE.md):**
The autopilot toggle already gates all plan behavior. With `autopilot.enabled = false` (the default), the plan-consumption loop never runs, `sendEvolution()` is never called, and behavior is byte-identical to pre-phase `main`. This must be stated explicitly in the handoff.

**Acceptance criteria in this step:**
- A-07-09 (full): `tsc --noEmit` clean, `pnpm lint` clean, `pnpm test` ≥ 1553 + new tests, `pnpm build` succeeds
- A-07-10 (if `errorEmptyPlan` added): `'__emptyPlan__'` sentinel renders the correct i18n string in the UI; key-parity test passes for all 4 locales

**Validation:**
- All four quality gate commands pass with recorded output
- `tests/i18n/key-parity.test.ts` passes (if new i18n key added)
- `git status` → only i18n files, `AgentPanel.svelte`, and handoff entry modified

**Commit message:**
`feat(i18n,ui): Phase 07 step 07.5 — empty-plan i18n sentinel + full quality gate`

---

## Acceptance Criteria

| ID | Description | Validation method |
|---|---|---|
| A-07-01 | `EvolutionPlanSchema` accepts `{ plan: [AgentOutput, …] }` (1–8 steps) and rejects `{ plan: [] }`, `{ plan: [<9 steps>] }`, and steps missing all required fields | Unit: `tests/evolution-plan.test.ts` |
| A-07-02 | `sendEvolution()` includes `horizon` (number) in the user message JSON sent to the LLM | Unit: mock LLM call; assert JSON payload contains `horizon` |
| A-07-03 | When `rhythmHint` or `rhythmHintFreeText` is non-empty, `availableRecipeSummaries` is absent from the LLM user message | Unit: extend `tests/sendEvolution-hint.test.ts` |
| A-07-04 | On valid LLM plan response, `setAutopilot({ currentPlan: plan.plan, planIndex: 0, llmError: null })` is called | Unit: mock `setAutopilot`; assert call arguments |
| A-07-05 | On empty or invalid LLM plan response, `setAutopilot({ llmError: '__emptyPlan__', currentPlan: [], planIndex: 0 })` is called | Unit: mock bad LLM response; assert `setAutopilot` call |
| A-07-06 | One tick with a non-exhausted plan (`planIndex < currentPlan.length`) applies exactly one step, advances `planIndex` by 1, and does NOT call `sendEvolution()` | Unit: `tests/autopilot.test.ts` |
| A-07-07 | `AutopilotState` includes `currentPlan: AgentOutput[]` and `planIndex: number`; both absent from `SavedSessionSchema`; both reset to `[]`/`0` on `startAutopilot()` and `stopAutopilot()` | Unit + proxy:static-analysis (`autopilot` key absent from `SavedSessionSchema`) |
| A-07-08 | One tick with an exhausted plan calls `sendEvolution()`; if `_isEvolving` is true, sets `lagWarning: true` instead | Unit: `tests/autopilot.test.ts` |
| A-07-09 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1553 + new tests (no regressions); `pnpm build` succeeds | live-system: recorded output in handoff |
| A-07-10 | `'__emptyPlan__'` sentinel (if used) renders the correct i18n string in the UI across all 4 locales; key-parity test passes | Unit: i18n key-parity test |

---

## Open Decisions (Pilot resolves at Checkpoint #1 after step 07.1)

| OD | Question | Options | Must resolve before |
|---|---|---|---|
| OD-1 | Horizon source: new `horizonCycles` field vs. derived from `intervalCycles` vs. LLM-chosen bounded | A (new field), B (derived), C (LLM-chosen) — see §3 | Step 07.2 |
| OD-2 | Schema shape: named `EvolutionPlanSchema` wrapper vs. bare array | A (wrapper), B (bare array) — see §3 | Step 07.2 |
| OD-3 | Input-trim aggressiveness: drop recipes when hint present (minimal) vs. also compact step encoding | A (drop recipes), B (also compact steps) — see §3 | Step 07.3 |

---

## ADR Flags

- **ADR 0024** — "Evolution Plan: multi-cycle batched autopilot evolution" — Pilot opens; governs plan schema, consumption loop, input-trim rule, backward compatibility, and ADR 0022 preservation. Drafted in step 07.2 after OD resolutions.
- **No `SCHEMA_VERSION` bump** anticipated (OD-2 Option A: `EvolutionPlanSchema` is plan-layer only, not added to `AgentOutputSchema`). If OD-2 resolution forces a change to `AgentOutputSchema`, flag for `SCHEMA_VERSION = 7` and a new ADR.

---

## Phase Constraints Summary

- ADR 0022 D1–D7 are inviolable throughout.
- `sendEvolution()` NEVER pushes to `chatHistory`; NEVER calls `applyBlockSave`.
- `SESSION_SCHEMA_VERSION` stays 5. `SCHEMA_VERSION` stays 6 unless OD-2 forces otherwise.
- All new `AutopilotState` fields are ephemeral — excluded from `SavedSessionSchema` via the existing `autopilot`-key-absent mechanism.
- With autopilot toggle off (default), behavior is byte-identical to pre-phase `main`.
- i18n: any new user-facing string in all 4 locales (es authoritative; pt/zh `// i18n-draft`).
- AGPL-3.0 header on any new file.
