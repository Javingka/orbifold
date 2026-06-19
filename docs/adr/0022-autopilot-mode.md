<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0022 — Autopilot mode: state model, timer strategy, and `SYSTEM_PROMPT_EVOLUTION` design

- **Status:** Accepted (Pilot approved at Checkpoint #2, 2026-06-18)
- **Date:** 2026-06-18
- **Initiative / Phase:** ai-jam / Phase 01 (step 01.2)
- **Deciders:** Pilot (Javier)

## Context

The `ai-composition-authoring` Phase 01 gave the agent the ability to save blocks on demand
(`saveAsBlock`). The next capability is autonomous evolution: while the user plays along, the
agent fires automatically every N Strudel cycles, reads the current live rhythm and harmony,
and produces a musical variant — without the user typing any message.

The Phase 01 discovery inventory (`docs/ai-jam/inventories/phase-01-inventory.md`) surfaced five
open questions. The Pilot resolved all five at Checkpoint #1 (2026-06-18). This ADR records the
seven governing decisions derived from those resolutions.

### Pilot OQ resolutions at Checkpoint #1

- **OQ-1 → `setInterval`:** `Cyclist` from `@strudel/web@1.0.3` does NOT expose a
  cycle-completion event (confirmed by the JSDoc in `queueForNextCycle`, strudel.ts lines
  217–218). Timer uses BPM-derived `setInterval`. Formula:
  `intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles)`.

- **OQ-2 → in `SessionState`:** `AutopilotState` lives in `SessionState` as a top-level
  field, where it is reactive and visible to the Svelte UI. Excluded from `SavedSessionSchema`.

- **OQ-3 → clean slate:** `sendEvolution()` is an independent LLM call that NEVER pushes
  to `chatHistory`. Autopilot turns are generative, not conversational; contaminating
  `chatHistory` would confuse user-initiated follow-up messages.

- **OQ-4 → skip when silent:** Each timer tick checks `isPlaying()` (exported from
  `src/audio/strudel.ts`). If `isPlaying()` returns `false`, the tick is skipped silently.
  Import is lazy (dynamic `import()`) to keep `autopilot.ts` unit-testable in Node.

- **OQ-5 → both always:** Phase 01 always evolves both rhythm and harmony. Target
  selector (rhythm only / harmony only / both) is deferred to Phase 02.

Seven decisions govern the implementation in steps 01.3–01.4.

---

## Decisions

### D1 — `AutopilotState` interface: exact TypeScript shape and placement in `SessionState`

**Decision:** Introduce `AutopilotState` in `src/state/session.ts`. Add it as a top-level field
`autopilot: AutopilotState` in `SessionState`. Default to `{ enabled: false, intervalCycles: 8 }`.

**Exact TypeScript interface:**

```typescript
// ── AutopilotState ──────────────────────────────────────────────────────────
// Runtime-only; excluded from SavedSessionSchema (D7).
// Lives in src/state/session.ts alongside SessionState.
//
// Per ADR 0022 D1.

/**
 * Autopilot runtime state: whether the timer is running and how many
 * Strudel cycles elapse between LLM evolution calls.
 *
 * - `enabled`         Whether the autopilot timer is currently active.
 *                     When true, startAutopilot() has been called and a
 *                     setInterval handle is live in autopilot.ts.
 * - `intervalCycles`  Number of Strudel cycles between automatic evolution
 *                     calls. Range: 2–32 (step 2). Default: 8.
 *                     At 120 BPM, 8 cycles = 16 seconds.
 */
export interface AutopilotState {
  enabled: boolean;
  intervalCycles: number;
}
```

**Updated `SessionState` interface (addition only):**

```typescript
export interface SessionState {
  bpm: number;
  view: 'rhythm' | 'harmony' | 'composition' | 'session' | 'code';
  chordMode: 'chord' | 'arp';
  harmony: HarmonyState;
  rhythm: RhythmState;
  composition: Composition;
  nowPlaying: NowPlaying;
  autopilot: AutopilotState; // NEW in ai-jam Phase 01 (ADR 0022 D1)
}
```

**Default value (to be added to `DEFAULT_SESSION_STATE`):**

```typescript
autopilot: {
  enabled: false,
  intervalCycles: 8,
},
```

**Store action:**

```typescript
/**
 * Update autopilot state (enabled flag and/or intervalCycles).
 * Does NOT start or stop the timer — callers must call
 * startAutopilot() / stopAutopilot() from src/agent/autopilot.ts
 * separately.
 *
 * Per ADR 0022 D1.
 */
export function setAutopilot(patch: Partial<AutopilotState>): void {
  sessionStore.update((s) => ({
    ...s,
    autopilot: { ...s.autopilot, ...patch },
  }));
}
```

**Persistence exclusion:** `AutopilotState` is NOT added to `SavedSessionSchema` in
`src/lib/persistence.ts`. The `serializeSession` function in `persistence.ts` enumerates
fields explicitly (not via spread), so `autopilot` is automatically excluded without any
code change to `serializeSession`. A JSDoc comment is added near the `autopilot` field in
`DEFAULT_SESSION_STATE` noting the exclusion:

```typescript
// autopilot: intentionally excluded from SavedSessionSchema (ephemeral; ADR 0022 D1/D7)
```

**Rationale for `SessionState` placement (OQ-2):**
1. The AgentPanel toggle binds to `$sessionStore.autopilot.enabled` reactively — a
   module-level variable in `autopilot.ts` would require a separate Svelte writable store
   and two-way synchronization.
2. `intervalCycles` benefits from reactive binding in the numeric input: the input is
   disabled while `$sessionStore.autopilot.enabled === true`.
3. Restoring a session with `enabled: true` (from saved state) would trigger a timer
   start on load — conflicting with the "no audio on load" invariant. Exclusion from
   `SavedSession` prevents this entirely.

---

### D2 — Timer mechanism: BPM-derived `setInterval` and exact `intervalMs` formula

**Decision:** Use `setInterval`. No cycle-boundary callback exists in `@strudel/web@1.0.3`
(inventory §(a), strudel.ts lines 217–218). The interval is computed from BPM and `intervalCycles`:

**Exact formula:**

```typescript
const intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles);
```

Where:
- `bpm = get(sessionStore).bpm` (D5 below — NOT `_currentBpm` from strudel.ts)
- `intervalCycles = get(sessionStore).autopilot.intervalCycles`
- `60000 * 4 / bpm` = one Strudel cycle duration in milliseconds (one cycle = one bar of 4/4,
  per CLAUDE.md invariant: "1 Strudel cycle = 1 bar of 4/4")

**Example values (binding):**

| BPM | intervalCycles | intervalMs |
|-----|---------------|------------|
| 120 | 2             | 4000 ms    |
| 120 | 8             | 16000 ms   |
| 120 | 16            | 32000 ms   |
| 90  | 8             | 21333 ms   |
| 180 | 8             | 10667 ms   |

**Timer lifecycle in `autopilot.ts`:**

```typescript
// Module-level handle
let _timerId: ReturnType<typeof setInterval> | null = null;

export function startAutopilot(): void {
  // Clear any existing timer before creating a new one (idempotent restart)
  if (_timerId !== null) {
    clearInterval(_timerId);
    _timerId = null;
  }
  const { bpm, autopilot } = get(sessionStore);
  const intervalMs = Math.round((60000 * 4 / bpm) * autopilot.intervalCycles);
  _timerId = setInterval(tick, intervalMs);
}

export function stopAutopilot(): void {
  if (_timerId !== null) {
    clearInterval(_timerId);
    _timerId = null;
  }
  _isEvolving = false;
}
```

**Interval restart policy:** The timer interval is computed once at `startAutopilot()` call
time. If the user changes `intervalCycles` or BPM while autopilot is enabled, the caller
(AgentPanel.svelte) must call `stopAutopilot()` then `startAutopilot()` to restart with the
new interval. Rationale: `setInterval` does not support dynamic interval changes; a reactive
`$:` statement in AgentPanel that calls restart on BPM or intervalCycles change is the cleanest
approach and is the implementation detail for step 01.4.

**`Math.round` rationale:** BPM values and cycle counts that yield fractional milliseconds
(e.g., 90 BPM × 8 cycles = 21333.33…) are rounded to the nearest integer to produce a valid
`setInterval` delay. Sub-millisecond precision is not meaningful for musical cycles measured
in seconds.

---

### D3 — Concurrency model: `_isEvolving` flag in `autopilot.ts`

**Decision:** A module-level boolean `_isEvolving` in `src/agent/autopilot.ts` prevents
overlapping LLM calls. If a timer tick fires while a previous `sendEvolution()` call is still
in flight, the tick is skipped silently.

**Exact implementation (binding):**

```typescript
// ── src/agent/autopilot.ts ──────────────────────────────────────────────────

/**
 * True while a sendEvolution() call is in flight.
 * Guards against overlapping LLM calls when the user's network is slow
 * or intervalCycles is set very low (e.g., 2 cycles at low BPM).
 *
 * Per ADR 0022 D3.
 */
let _isEvolving = false;

/** Module-level setInterval handle. Null when autopilot is stopped. */
let _timerId: ReturnType<typeof setInterval> | null = null;

/**
 * Autopilot tick function. Called by setInterval on every interval boundary.
 * Skips if already evolving (concurrency guard) or audio is not playing (D6).
 */
async function tick(): Promise<void> {
  // Concurrency guard: skip this tick if a previous call is still in flight
  if (_isEvolving) return;

  // Audio-awareness guard: skip if nothing is playing (D6)
  const { isPlaying } = await import('../audio/strudel.js');
  if (!isPlaying()) return;

  _isEvolving = true;
  try {
    await sendEvolution();
  } finally {
    _isEvolving = false;
  }
}
```

**Why `_isEvolving` is sufficient:**
- The timer can only produce one autopilot call at a time. Manual `send()` calls (from
  AgentPanel) do not set `_isEvolving` — they use `chatHistory` independently. The two paths
  never share state: `sendEvolution()` never touches `chatHistory`; `send()` never touches
  `_isEvolving`. There is no cross-path data corruption risk.
- A lock on `send()` itself is not needed and would break the "manual messages work while
  autopilot is running" acceptance criterion (A-01-04).

**Reset on `stopAutopilot()`:** `_isEvolving` is explicitly reset to `false` in
`stopAutopilot()` to handle the edge case where `stopAutopilot()` is called while a tick
is mid-flight. The in-flight `sendEvolution()` call is NOT cancelled (no AbortController in
Phase 01 scope); the `finally` block sets `_isEvolving = false` after `sendEvolution()` 
resolves, but by then the timer is stopped and no further ticks fire.

---

### D4 — `SYSTEM_PROMPT_EVOLUTION`: design, constraints, and concrete example

**Decision:** Add a separate string constant `SYSTEM_PROMPT_EVOLUTION` in
`src/agent/agent.ts`. This constant governs autopilot-only LLM calls and is entirely distinct
from `SYSTEM_PROMPT` (which governs user-initiated `send()` calls).

**Constraints (all binding):**

1. **No `chatHistory` mutation.** `sendEvolution()` does NOT push the prompt or the response
   to `chatHistory`. The user's conversation history must remain uncontaminated by
   autopilot turns (OQ-3 resolution).

2. **Current state as context.** Each call injects the current live rhythm and harmony as
   JSON into the user-message portion. The system prompt instructs the LLM to produce a
   musical variant of the supplied JSON, not to create from scratch.

3. **Same `AgentOutputSchema` v5.** The response is parsed with `AgentOutputSchema.safeParse`
   (unchanged). No new schema fields are introduced (D7 below).

4. **Explicit `no-saveAsBlock` instruction.** The system prompt contains an explicit
   instruction that the response MUST NOT include `saveAsBlock`. Rationale: autopilot is a
   live-performance tool; saving blocks is a deliberate user action, not an autopilot
   concern. Mixing the two would create unexpected blocks in the composition library.

5. **Spanish prompt language.** Per ADR 0017 D7, the system prompt is always Spanish. The
   LLM reply language is governed by the per-call context addendum (same as `SYSTEM_PROMPT`).
   `SYSTEM_PROMPT_EVOLUTION` does NOT include a context addendum — the evolved output is
   JSON-only (no `note` field response is expected, though the schema permits it).

**`sendEvolution()` function signature (binding):**

```typescript
/**
 * Fire a single autopilot evolution LLM call.
 * Reads current rhythm + harmony from sessionStore, builds a one-shot
 * LLM request using SYSTEM_PROMPT_EVOLUTION, and applies the result
 * via applyRhythmSpec / applyHarmonySpec.
 *
 * Invariants:
 * - NEVER pushes to chatHistory (OQ-3 / ADR 0022 D4).
 * - NEVER calls applyBlockSave (saveAsBlock is forbidden in evolution output).
 * - Returns void — the caller (tick()) uses .finally() to reset _isEvolving.
 *
 * Per ADR 0022 D4.
 */
export async function sendEvolution(): Promise<void>
```

**`SYSTEM_PROMPT_EVOLUTION` required content (binding for step 01.3):**

The constant must contain all of the following:

1. An instruction that the LLM is an autonomous music evolution agent operating in
   "autopilot mode" — it receives a snapshot of the current live state and must return a
   musical variant that is a coherent evolution (not a completely new unrelated pattern).

2. Instructions for how to vary the rhythm: e.g., slightly shift steps, add/remove
   percussion hits, adjust Euclidean parameters (k, n, rot) within the same sonic character.

3. Instructions for how to vary the harmony: e.g., substitute a chord with a
   neo-Riemannian neighbor (P/L/R), add/remove a chord from the progression, adjust gain
   or sound attributes within the same key.

4. Explicit instruction: **`saveAsBlock` must NOT appear in the response**.

5. At least one concrete evolved-output JSON example showing a before → after pair:

```json
// Example: SYSTEM_PROMPT_EVOLUTION concrete evolved-output example (binding)
// This exact example (or equivalent) must appear in the prompt to satisfy ADR 0021 D5
// lesson: concrete examples reduce LLM hallucination of unexpected fields.

// Input state injected at call time (example):
{
  "rhythm": {
    "layers": [
      { "sound": "bd", "steps": [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] },
      { "sound": "sd", "steps": [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] },
      { "sound": "hh", "steps": [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] }
    ]
  },
  "harmony": {
    "progression": [
      { "rootPc": 0, "qual": "maj", "gain": 0.7 },
      { "rootPc": 9, "qual": "min", "gain": 0.7 }
    ]
  }
}

// Valid evolution response (example — small coherent change):
{
  "rhythm": {
    "layers": [
      { "sound": "bd", "steps": [1,0,0,0,1,0,0,1,1,0,0,0,1,0,0,0] },
      { "sound": "sd", "steps": [0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0] },
      { "sound": "hh", "steps": [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] }
    ]
  },
  "harmony": {
    "progression": [
      { "rootPc": 0, "qual": "maj", "gain": 0.7 },
      { "rootPc": 5, "qual": "maj", "gain": 0.65 },
      { "rootPc": 9, "qual": "min", "gain": 0.7 }
    ]
  }
}
```

**What `sendEvolution()` does NOT do (binding negative list):**

```typescript
// sendEvolution() MUST NOT:
// 1. chatHistory.push(...)          — clean slate (OQ-3)
// 2. applyBlockSave(...)            — saveAsBlock forbidden (D4)
// 3. import _currentBpm from strudel.ts — private variable (D5)
// 4. call send(...)                 — send() mutates chatHistory (inventory §(d))
// 5. throw on non-JSON response     — log + return gracefully
```

---

### D5 — BPM access: `get(sessionStore).bpm` only

**Decision:** `autopilot.ts` reads BPM exclusively via `get(sessionStore).bpm`. It does NOT
import or reference `_currentBpm` from `src/audio/strudel.ts`.

**Rationale (inventory §(e)):**

- `_currentBpm` is a `let` variable (strudel.ts line 86), NOT exported. Any import would
  require adding an `export` to strudel.ts — a change that touches the audio module solely
  to serve a private-read concern in autopilot, which is poor module hygiene.

- `get(sessionStore).bpm` is always in sync with `_currentBpm`. The `setBpm` action in
  `session.ts` calls `setTempo(bpm)` (audio side) and writes `bpm` to `sessionStore` (state
  side) atomically in the same synchronous call. There is no window where the two diverge.

- `sessionStore` is already imported by `autopilot.ts` to read `intervalCycles`. Reading
  `bpm` from the same store object adds no new import.

**Code pattern (binding):**

```typescript
import { get } from 'svelte/store';
import { sessionStore } from '../state/session.js';

// Inside startAutopilot():
const { bpm, autopilot: { intervalCycles } } = get(sessionStore);
const intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles);
```

---

### D6 — Audio-awareness guard: lazy import of `isPlaying()` from `strudel.ts`

**Decision:** At the start of each timer tick, `autopilot.ts` dynamically imports
`isPlaying` from `src/audio/strudel.ts` and skips the LLM call if `isPlaying()` returns
`false`.

**Exact pattern (binding — OQ-4 resolution):**

```typescript
// Inside tick() in autopilot.ts:

// Audio-awareness guard: skip if nothing is playing
// Dynamic import keeps autopilot.ts unit-testable in Node
// (strudel.ts has DOM/WebAudio dependencies that fail in Node)
const { isPlaying } = await import('../audio/strudel.js');
if (!isPlaying()) return;
```

**Why dynamic import (not static import at module top):**

`src/audio/strudel.ts` imports `@strudel/web`, which has DOM and WebAudio API dependencies.
A static top-level import would cause `src/agent/autopilot.ts` to fail at parse time in the
Vitest/Node test environment. A dynamic import inside `tick()` is only evaluated at runtime
when the timer fires — this import is never called in tests because tests mock `tick()`
directly or inject an `isPlaying` override.

**Alternative: inject as parameter (rejected for Phase 01):**

An `isPlaying: () => boolean` parameter with a default could be injected into `startAutopilot`
for clean unit-testing without dynamic imports. This is a valid approach adopted in `session.ts`
for `setTempo`. However, for Phase 01 the dynamic import is simpler and consistent with the
accepted Node-testability pattern; the parameter-injection approach can be adopted in a
future phase if needed.

**Skip behavior (binding):**

When `isPlaying()` returns `false`:
- The tick is skipped **silently** — no log, no UI feedback, no error.
- `_isEvolving` is NOT set to `true` (the early return fires before the flag is set).
- The timer continues running — the next tick will check `isPlaying()` again.
- This behavior is correct because: the user may stop audio temporarily and resume;
  the autopilot should simply resume firing once audio is playing again.

---

### D7 — No schema bump: `SCHEMA_VERSION` stays 5; `SESSION_SCHEMA_VERSION` stays 5

**Decision:**

- `SCHEMA_VERSION` in `src/agent/schema.ts` remains `5`.
- `SESSION_SCHEMA_VERSION` in `src/lib/persistence.ts` remains `5`.
- `AutopilotState` is excluded from `SavedSessionSchema` (D1 above).
- `AgentOutputSchema` is used unchanged for evolution LLM calls.

**Rationale:**

| Concern | Decision | Justification |
|---|---|---|
| `SCHEMA_VERSION` stays 5 | No new agent-output fields | Evolution calls use `AgentOutputSchema` v5 as-is; `saveAsBlock` is explicitly forbidden; `rhythm` and `harmony` already present |
| `SESSION_SCHEMA_VERSION` stays 5 | No new persisted fields | `AutopilotState` is runtime-only; `serializeSession` enumerates fields explicitly so `autopilot` is silently excluded with zero code change to `persistence.ts` |
| `AgentOutputSchema.superRefine` unchanged | Evolution response requires at least one of `rhythm`, `harmony`, `saveAsBlock` | Evolution response will always contain `rhythm` and/or `harmony` (OQ-5: always both); the guard is satisfied without schema change |

**Evolution response compatibility with `AgentOutputSchema` v5 (binding):**

The `sendEvolution()` function calls `AgentOutputSchema.safeParse(parsed)` on the LLM
response. The `superRefine` guard (added in ADR 0021 D1) requires at least one of `rhythm`,
`harmony`, or `saveAsBlock`. Since `sendEvolution()` instructs the LLM (via
`SYSTEM_PROMPT_EVOLUTION`) to always return `rhythm` and `harmony`, this guard is satisfied
in the normal case. Edge case: if the LLM returns only `saveAsBlock` (violating the explicit
no-saveAsBlock instruction), the `safeParse` succeeds but `sendEvolution()` ignores the
`saveAsBlock` field — it only calls `applyRhythmSpec` / `applyHarmonySpec`.

**Byte-identical-at-default guarantee:**

`sendEvolution()` does not exist until step 01.3. Before step 01.3 (i.e., with `main` at
post-`ai-composition-authoring` merge state), `AutopilotState` does not exist in `SessionState`.
The byte-identical guarantee applies at the `AutopilotState` level: a `sessionStore` without
an `autopilot` field (pre-Phase 01) produces identical serialized output to the new state
because `serializeSession` does not enumerate `autopilot`.

---

## Consequences

### Files modified in steps 01.3–01.4

| File | Nature of change | Step |
|---|---|---|
| `src/state/session.ts` | Add `AutopilotState` interface; add `autopilot: AutopilotState` to `SessionState`; add `DEFAULT_SESSION_STATE.autopilot`; add `setAutopilot(patch)` action | 01.3 |
| `src/agent/agent.ts` | Add `SYSTEM_PROMPT_EVOLUTION` constant; add `sendEvolution(): Promise<void>` function | 01.3 |
| `src/agent/autopilot.ts` | New file: AGPL-3.0 header; `_isEvolving` flag; `_timerId` handle; `startAutopilot()`; `stopAutopilot()`; `tick()` internal function | 01.3 |
| `tests/autopilot.test.ts` | New file: AGPL-3.0 header; unit tests covering A-01-01 through A-01-05 (fake timers, concurrency guard, stop/restart, `chatHistory` non-mutation) | 01.3 |
| `src/ui/AgentPanel.svelte` | Add autopilot toggle button and `intervalCycles` numeric input; import `startAutopilot` / `stopAutopilot` from `autopilot.ts`; import `setAutopilot` from `session.ts` | 01.4 |

### `src/lib/persistence.ts` is unchanged

`serializeSession` does not enumerate `autopilot` — no code change needed. The `SavedSessionSchema`
is unchanged. `SESSION_SCHEMA_VERSION` stays `5`.

### Invariants preserved

- **`core/**` purity.** `src/agent/autopilot.ts` imports from `src/state/session.ts` (store
  layer, permitted for agent-layer modules) and dynamically imports from `src/audio/strudel.ts`
  (lazy, only at tick time). It has no PIXI, Svelte, or DOM static imports — it is
  unit-testable in Node with fake timers.
- **`chatHistory` is uncontaminated.** `sendEvolution()` never pushes to `chatHistory`.
  Manual `send()` continues to maintain conversation context independently.
- **No new runtime dependencies.** All new behavior uses TypeScript, Svelte store
  primitives, and `setInterval` / `clearInterval` (built-in).
- **AGPL-3.0 header** on all new files.
- **`addBlock` is the single snapshot-capture path** (ADR 0021 D3 / ADR 0020 D2). Autopilot
  does not create blocks and does not call any snapshot-capture function.
- **`buildComposition` is unchanged.** Autopilot writes only to `rhythm` and `harmony` fields
  of `sessionStore` (via `applyRhythmSpec` / `applyHarmonySpec`) — it does not touch
  `state.composition`.

### Deferred

- **Target selector (rhythm only / harmony only / both)** — OQ-5; deferred to Phase 02.
- **AbortController for in-flight `sendEvolution()` cancellation** — when `stopAutopilot()`
  is called mid-flight, the ongoing request completes but its result is discarded (the timer
  is cleared so no further ticks fire). An abort signal can be added in Phase 02 if needed.
- **BPM/intervalCycles reactive restart** — exact Svelte reactive statement in AgentPanel is
  an implementation detail for step 01.4, not binding at ADR level.
- **Parameter-injection pattern for `isPlaying`** (over dynamic import) — deferred; current
  dynamic import is sufficient for Phase 01 Node-testability.
- **`sendEvolution()` error feedback** — if the LLM call fails (network error, bad JSON, or
  `safeParse` failure), the evolution is silently skipped in Phase 01. Visible error feedback
  (toast notification) is a Phase 02 concern.
