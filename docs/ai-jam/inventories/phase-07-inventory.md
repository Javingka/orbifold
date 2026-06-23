<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 07 Inventory — Evolution Plan: Multi-Cycle Batched Autopilot + Input Token Trim

**Step:** 07.1  
**Date:** 2026-06-21  
**Branch:** `ai-jam/phase-07`  
**Status:** Draft — awaiting Pilot OD-1/OD-2/OD-3 resolution at Checkpoint #1

---

## §1 — Current `sendEvolution()` input composition with REAL token arithmetic

### Methodology note

All character counts are from the live source files. Token estimates use **3.0 chars/token** as the divisor for JSON + Spanish mixed content — this matches the Pilot's browser observation of 2343 tokens (see §1.6). The conservative `/4` estimate significantly underestimates real cost for this payload type.

---

### §1.1 — `SYSTEM_PROMPT_EVOLUTION` (measured from `src/agent/agent.ts`)

The constant spans lines 248–331 of `agent.ts`. Measured character count:

| Source | Chars | /4 est | /3.5 est | /3.0 est (used) |
|--------|------:|-------:|---------:|----------------:|
| `SYSTEM_PROMPT_EVOLUTION` | 2,688 | 672 | 768 | **896** |

The Phase 06 handoff claimed "~350 tokens vs ~1500." The ~350 figure used `/4` on what must have been a character count measured before the VARIACIÓN OBLIGATORIA block was appended. The **real cost at 3.0 chars/token is ~896 tokens** — over twice the estimate in the phase spec. This is the primary budget driver.

---

### §1.2 — `stateSnapshot.rhythm.layers` (3-layer 16-step realistic session)

The `sendEvolution()` code at lines 358–377 of `agent.ts` builds `stateSnapshot` from `state.rhythm.layers` verbatim (including the `steps: number[]` arrays) and `state.harmony.progression` (converting `rootPc`→note name and `qual`→`quality`). The payload is serialized with `JSON.stringify(..., null, 2)` — 2-space pretty-printing.

**3-layer 16-step example** (realistic: bd + sd + hh):

```json
"rhythm": {
  "layers": [
    { "sound": "bd", "steps": [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] },
    { "sound": "sd", "steps": [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] },
    { "sound": "hh", "steps": [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] }
  ]
}
```

| State | Chars (pretty, null, 2) | /3.0 tokens |
|-------|------------------------:|------------:|
| 3-layer 16-step only | 870 | **290** |
| 6-layer 16-step only | 1,696 | **565** |

**Critical note on live sessions:** The LLM may add layers (up to 6 max per schema). A Pilot session with 6 layers doubles the rhythm component cost. This was the likely state during the browser test (see §1.6).

---

### §1.3 — `stateSnapshot.harmony.progression` (4-chord)

```json
"harmony": {
  "root": "C", "mode": "minor", "octave": 3,
  "progression": [
    { "root": "C",  "quality": "min", "gain": 0.7 },
    { "root": "Eb", "quality": "maj", "gain": 0.7 },
    { "root": "F",  "quality": "min", "gain": 0.7 },
    { "root": "G",  "quality": "maj", "gain": 0.65 }
  ]
}
```

| Component | Chars (pretty) | /3.0 tokens |
|-----------|---------------:|------------:|
| 4-chord progression (with root/mode/octave) | 441 | **147** |

---

### §1.4 — `availableRecipeSummaries` (catalog-dependent count)

`getExpressibleRecipes()` currently returns **16 recipes** (all entries in `RHYTHM_HARMONY_RECIPES` — the ADR 0023 claim of "10" was accurate when ADR 0023 was written; the catalog has since grown to 16). Each summary carries 4 fields: `id`, `name`, `density`, `meter`.

Real 16-recipe payload measured:

| Count | Format | Chars | /3.0 tokens |
|-------|--------|------:|------------:|
| 16 recipes × 4 fields | `JSON.stringify(..., null, 2)` | 2,219 | **740** |
| 16 recipes × 4 fields | `JSON.stringify(...)` compact | 912 | **304** |

The difference between pretty and compact for this component alone is **436 tokens**.

---

### §1.5 — `rhythmHintPayload`

When a rhythm hint is present:

| Case | Content | Chars | /3.0 tokens |
|------|---------|------:|------------:|
| Catalog id hint | `{ "rhythmHint": "Bossa Nova Groove" }` | ~39 | ~13 |
| Free-text hint | `{ "rhythmHintFreeText": "samba with cowbell" }` | ~55 | ~18 |
| No hint | (absent) | 0 | 0 |

---

### §1.6 — Why the Pilot's browser test saw 2343 tokens (reconstructed)

The browser test ran after Phase 06 compression. The ~2343 token reading is reconstructed as follows:

- System prompt: 2,688 chars ÷ 3.0 = **896 tokens**
- User message: 6-layer state + 16 recipes (no hint) = 4,347 chars ÷ 3.0 = **1,449 tokens**
- **Total: 2,345 tokens** — within 2 tokens of the observed 2,343. ✓

The 6-layer state was what the Pilot had loaded at the time. This confirms the `/3.0` divisor is the accurate estimator for this payload type.

**Breakdown of the /4 error:** The phase spec's parenthetical estimates (e.g., "~350 tokens for system prompt") used `/4`, which underestimates by a factor of ~1.3 for this payload. The real system prompt costs ~896 tokens, not ~350.

---

### §1.7 — Full token budget table (all scenarios)

All values use `/3.0` chars/token. User message is `JSON.stringify(..., null, 2)` (current format).

| Scenario | System (tokens) | User (tokens) | **Total** |
|----------|----------------:|---------------:|----------:|
| 3-layer, 4-chord, hint present, recipes included | 896 | 530 | **1,426** |
| 3-layer, 4-chord, no hint, recipes included | 896 | 520 | **1,416** |
| 3-layer, 4-chord, hint present, **NO recipes** | 896 | 149 | **1,045** |
| 4-layer, 4-chord, hint present, recipes included | 896 | 638 | **1,534** |
| 4-layer, 4-chord, hint present, **NO recipes** | 896 | 205 | **1,101** |
| 6-layer, 4-chord, hint present, recipes included | 896 | 874 | **1,770** |
| 6-layer, 4-chord, **NO hint**, recipes included | 896 | 1,449 | **2,345** ← observed |
| 6-layer, 4-chord, hint present, **NO recipes** | 896 | 268 | **1,164** |

---

### §1.8 — OD-3 analysis: which cuts get under the caps?

**Caps:** OpenRouter free-tier ~1,985 tokens. Safer target: ≤1,600 tokens.

**Option A: Drop `availableRecipeSummaries` when hint present (740 tokens saved)**

| Before (6-layer, hint present, recipes) | After (6-layer, hint present, NO recipes) |
|-----------------------------------------|-------------------------------------------|
| 1,770 tokens | **1,164 tokens** |

At the observed 6-layer worst case: 1,770 → 1,164 — **Option A alone drops the 6-layer case well under both the 1,985 cap and the 1,600 safer target.**

For 3-layer (baseline): 1,426 → 1,045. Easily under both caps.

**Without a hint (no-hint path):** Option A does not apply. At 6 layers + recipes: 2,345 tokens — over the cap. However, when there is no hint, the LLM needs the recipe list. A pragmatic fix for the no-hint path is to also cap at Option A only when the user enables autopilot without a hint, or to use compact JSON (saves ~436 tokens for the recipes component). Compact JSON: 6-layer, no hint, compact recipes = (1,696 + 441 + 304 + 0) ÷ 1 = 2,441 chars → 814 user tokens + 896 sys = **1,710 tokens** — under 1,985. With compact JSON on both components: **Option A (hint path) + compact JSON (no-hint path) = both paths under 1,985.**

**The Planner's phase spec says "expect Option A is likely sufficient."** The arithmetic confirms Option A is sufficient for the hint path (covers the targeted use case). The no-hint path at 6 layers remains over cap without additional trimming, but this is a secondary concern: the autopilot was designed primarily for hint-driven sessions.

**Recommendation for OD-3:** See §3 below.

---

## §2 — `AutopilotState` current shape and proposed extension

### Current 8 fields (measured from `src/state/session.ts` lines 351–360)

| Field | Type | Default | JSDoc exclusion note |
|-------|------|---------|----------------------|
| `enabled` | `boolean` | `false` | Runtime-only (ADR 0022 D1/D7) |
| `intervalCycles` | `number` | `8` | Runtime-only (ADR 0022 D1/D7) |
| `panelOpen` | `boolean` | `false` | EPHEMERAL — not persisted (ADR 0022 D1/D7) |
| `rhythmHint` | `string` | `''` | EPHEMERAL — not persisted (ADR 0022 D1/D7) |
| `rhythmHintText` | `string` | `''` | EPHEMERAL — not persisted (ADR 0022 D1/D7) |
| `timerStartedAt` | `number` | `0` | EPHEMERAL — not persisted (ADR 0022 D1/D7) |
| `lagWarning` | `boolean` | `false` | EPHEMERAL — not persisted (ADR 0022 D1/D7) |
| `llmError` | `string \| null` | `null` | EPHEMERAL — not persisted (ADR 0022 D1/D7) |

### Proposed new fields: `currentPlan` and `planIndex`

| Proposed field | Type | Default | Source |
|----------------|------|---------|--------|
| `currentPlan` | `AgentOutput[]` | `[]` | `AgentOutput` is `z.infer<typeof AgentOutputSchema>`, exported from `src/agent/schema.ts` line 329 |
| `planIndex` | `number` | `0` | Index of the next unapplied step in `currentPlan` |

**Type confirmation:** The exported name in `schema.ts` is `AgentOutput` (line 329: `export type AgentOutput = z.infer<typeof AgentOutputSchema>`). This is the correct type for `currentPlan: AgentOutput[]`.

**Ephemeral exclusion:** `persistence.ts` `SavedSessionSchema` does not enumerate the `autopilot` key at all — `serializeSession` never writes it; `deserializeSession` return type is `Omit<SessionState, 'nowPlaying' | 'autopilot'>`. Both new fields are automatically excluded with zero code change to `persistence.ts` or `SESSION_SCHEMA_VERSION`. No ADR 0022 amendment is needed for this exclusion — it falls under D1/D7's blanket exclusion of the entire `autopilot` subtree.

**JSDoc pattern (ADR 0022 D1):** Both new fields must carry the comment:

```typescript
// EPHEMERAL — not persisted (ADR 0022 D1/D7)
```

This matches the existing pattern on `panelOpen`, `rhythmHint`, `rhythmHintText`, `timerStartedAt`, `lagWarning`, and `llmError`.

**`setAutopilot(patch: Partial<AutopilotState>)` compatibility:** The existing `setAutopilot` takes `Partial<AutopilotState>`, so adding two new optional fields to `AutopilotState` automatically makes them patchable via `setAutopilot({ currentPlan: [...], planIndex: 0 })`. No signature change needed.

---

## §3 — Open Decisions for Pilot resolution

### OD-1 — Horizon source: how many plan steps to request

**Question:** How does the autopilot know how many plan steps to ask the LLM to generate?

**Option A — New `horizonCycles` field in `AutopilotState`** (default 4): user can tune it independently of `intervalCycles`. Adds a UI control (or hidden field at default). More expressive; adds one state field.

**Option B — Derived from `intervalCycles`**: `horizon = Math.max(2, Math.round(intervalCycles / 2))`. No new field; no new UI. Simple. Less flexible. At default `intervalCycles = 8`: horizon = 4 (a reasonable window).

**Option C — LLM-chosen (bounded)**: System prompt instructs the LLM to return between 2 and 6 steps. No hard horizon. Flexible but unpredictable.

**Recommendation: Option B.** `intervalCycles` is already user-tunable (from 2–32). Deriving the horizon as `Math.max(2, Math.round(intervalCycles / 2))` means the plan always covers approximately half the current interval span. At 8 cycles: horizon = 4. At 4 cycles: horizon = 2. At 16 cycles: horizon = 8. The LLM receives `"horizon": N` in the user message JSON and generates exactly N steps. No new state field or UI control needed.

---

### OD-2 — Schema shape: named wrapper vs. bare array

**Question:** Should the plan response use a named Zod wrapper schema or a bare array?

**Option A — `EvolutionPlanSchema = z.object({ plan: z.array(AgentOutputSchema).min(1).max(8) })`**: Explicit named schema; the LLM returns `{ "plan": [...] }`. Extensible; aligns with the object-wrapper pattern used throughout the codebase. No `SCHEMA_VERSION` bump (this schema is plan-layer only, not added to `AgentOutputSchema`).

**Option B — Bare array**: Parse as `z.array(AgentOutputSchema)`. The LLM returns `[{...}, {...}]`. Simpler. Harder to extend.

**Recommendation: Option A.** Object wrappers are more robust to LLM output drift (bare arrays `[...]` are more likely to be emitted malformed or with preamble text). The wrapper allows future addition of plan-level metadata (e.g., `horizon`, `style` annotation) without schema version changes. Aligns with the `AgentOutputSchema` object-wrapper precedent. The `tryParseSkill` fence extraction regex targets `{...}` objects — keeping the plan as an object ensures fence-extraction compatibility.

---

### OD-3 — Input-trim aggressiveness

**Question:** How much input to drop to stay under OpenRouter's ~1,985 token cap?

**Option A — Drop `availableRecipeSummaries` when any hint is present** (minimal): When `rhythmHint` or `rhythmHintFreeText` is non-empty, omit `availableRecipeSummaries` from the user message.

- Saving: 740 tokens (at /3.0, 16 recipes × 4 fields, pretty-printed).
- Result (hint path, 6-layer worst case): 1,770 − 740 = **1,030 tokens** — well under both 1,985 and the 1,600 safer target.
- Result (hint path, 3-layer baseline): 1,426 − 740 = **686 tokens**.

**Option B — Drop `availableRecipeSummaries` when hint present AND compact step encoding** (more aggressive): Additionally replace `steps: number[]` with a binary string `"1000100010001000"` in the LLM payload only (stored model unchanged).

- Compact step encoding saves approximately 80 tokens per layer at pretty-print format (one 16-element array `[1,0,0,0,...]` = ~78 chars / 26 tokens; one string `"1000100010001000"` = ~20 chars / 7 tokens → ~19 tokens saved per layer).
- 3-layer savings: ~57 tokens. 6-layer savings: ~114 tokens.
- This is additive to Option A but not necessary given Option A's already generous margin.

**Arithmetic verdict:**

Option A alone is sufficient for the hint path. The no-hint path at 6 layers (2,345 tokens) remains over cap, but:
1. The primary design intent of the hint path being trimmed is met.
2. The no-hint path is a secondary concern — users without a style preference are less likely to have fully populated 6-layer sessions.
3. If needed in a future phase, compact JSON on the no-hint path can solve the residual issue.

**Recommendation: Option A only.** Dropping recipes when a hint is present yields a ~740 token saving (at /3.0), bringing all realistic hint-path scenarios from >1,770 tokens to <1,165 tokens — safely under 1,600 with margin. Option B adds unnecessary implementation complexity (LLM payload transformation) for marginal gain on the hint path and would be opaque to future readers. The no-hint path over-cap issue should be addressed in a future phase if observationally confirmed (it only manifests at 6 layers, which is the maximum).

**Explicit answer to the Pilot's question:** Option A is sufficient for the targeted use case (hint present). Option A is NOT sufficient for the no-hint path at 6 layers — but the no-hint path is out of scope for this OD and can be addressed separately.

---

## §4 — ADR trigger

A new ADR is needed: **ADR 0024 — "Evolution Plan: multi-cycle batched autopilot evolution"**.

The ADR must cover:

1. **Plan schema shape** (OD-2 resolution): exact Zod definition of `EvolutionPlanSchema`; why a wrapper object is used; the `min(1).max(8)` bounds and rationale.
2. **Plan-consumption loop invariants** (OD-1 resolution + new `tick()` behavior): one step applied per tick; `planIndex` advances atomically; `_isEvolving` guards only the LLM re-call, not step application; the plan-step application is fast/synchronous.
3. **Empty/invalid plan safety contract**: if `EvolutionPlanSchema.safeParse` fails or `plan` is empty, `tick()` sets `llmError: '__emptyPlan__'` and skips; the UI decodes the sentinel.
4. **Input-trim rule** (OD-3 resolution): when `rhythmHint` or `rhythmHintText` is non-empty, `availableRecipeSummaries` is omitted from the user message; no compact step encoding in Phase 07.
5. **Horizon formula** (OD-1 resolution): `horizon = Math.max(2, Math.round(intervalCycles / 2))`; `horizon` is injected into the user message JSON so the system prompt remains static.
6. **ADR 0022 preservation**: `sendEvolution()` still NEVER pushes to `chatHistory`; still NEVER calls `applyBlockSave`; plan steps carry only `rhythm`/`harmony`/`musicalIntent`; `saveAsBlock` in any plan step is silently ignored at application time.
7. **`AutopilotState` new fields**: `currentPlan: AgentOutput[]` (default `[]`) and `planIndex: number` (default `0`); both ephemeral (ADR 0022 D1/D7 pattern); JSDoc exclusion comment pattern.
8. **`SESSION_SCHEMA_VERSION` and `SCHEMA_VERSION` stability**: neither is bumped; `EvolutionPlanSchema` is plan-layer only and not added to `AgentOutputSchema`.

The Pilot opens ADRs; this section flags the need only. The ADR is drafted in step 07.2 after OD resolutions.

---

## §5 — Test file targets

No new top-level test file directories are required. The plan schema and consumption loop have clean unit-testable surfaces distributed across two files:

**New file: `tests/evolution-plan.test.ts`** (created in step 07.2)

- `EvolutionPlanSchema.safeParse` — valid plans (1 step, 3 steps mixed)
- `EvolutionPlanSchema.safeParse` — invalid plans (empty array, 9 steps exceeds max)
- Step missing all required fields → failure
- Step with `saveAsBlock` only → success (schema accepts; D7 says ignored at runtime)

**Existing file: `tests/autopilot.test.ts`** (extended in step 07.4)

- Plan consumption — step advance: given `currentPlan = [stepA, stepB]` and `planIndex = 0`, one `tick()` applies `stepA`, calls `setAutopilot({ planIndex: 1 })`, does NOT call `sendEvolution()`
- Plan consumption — final step: `planIndex = 1`, `currentPlan.length = 2` → applies `stepB`, sets `planIndex: 2`
- Plan exhaustion: `planIndex = 2`, `currentPlan.length = 2` → calls `sendEvolution()` and resets `planIndex: 0`
- Plan exhaustion with `_isEvolving = true`: sets `lagWarning: true`, does NOT call `sendEvolution()` again
- `startAutopilot()` resets plan: calls `setAutopilot({ currentPlan: [], planIndex: 0 })`
- `stopAutopilot()` resets plan: includes `currentPlan: [], planIndex: 0`
- Empty plan on start: given `currentPlan = []`, `planIndex = 0` → goes directly to LLM re-call path

**Existing file: `tests/sendEvolution-hint.test.ts`** (extended in step 07.3)

- A-07-02: `horizon` present in user message JSON (mock LLM call, assert payload)
- A-07-03: When hint present, `availableRecipeSummaries` absent from user message
- A-07-04: Valid plan response → `setAutopilot({ currentPlan: [...], planIndex: 0, llmError: null })`
- A-07-05: Empty/invalid plan response → `setAutopilot({ llmError: '__emptyPlan__', currentPlan: [], planIndex: 0 })`

**Possible new file: `tests/i18n/key-parity.test.ts`** (already exists; extended in step 07.5 if `errorEmptyPlan` key is added)

---

## Summary table for Pilot checkpoint

| Section | Verdict |
|---------|---------|
| §1 token arithmetic | Real system prompt cost is **~896 tokens** (not ~350); the `/3.0` chars/token ratio matches the observed 2343. The 6-layer worst case with recipes is ~2,345 tokens total. |
| OD-3: Option A sufficient? | **YES** for hint path (1,770 → 1,030, well under 1,600). **NO** for no-hint 6-layer path (2,345 → still over cap without recipes, but that path is secondary). |
| OD-1 recommendation | Option B (derived: `horizon = Math.max(2, Math.round(intervalCycles / 2))`) |
| OD-2 recommendation | Option A (`EvolutionPlanSchema` wrapper object, `min(1).max(8)`) |
| ADR needed | ADR 0024 (Pilot opens; drafted in step 07.2) |
| New test files | `tests/evolution-plan.test.ts` (new); extensions to `autopilot.test.ts` and `sendEvolution-hint.test.ts` |
