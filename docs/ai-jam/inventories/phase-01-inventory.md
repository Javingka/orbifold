<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 Inventory — AI Jam / Autopilot

**Initiative:** `ai-jam`
**Step:** 01.1 — Discovery inventory
**Date:** 2026-06-18
**Author:** Dev subagent

---

## §(a) Cycle-event API exposed by `Cyclist` / `_scheduler`

**Source:** `src/audio/strudel.ts` (full read)

`Cyclist` is imported as a TypeScript type only (`import type { Cyclist } from '@strudel/web'`) — line 66. The concrete instance is stored as `let _scheduler: Cyclist | null = null` (line 95).

The module uses `_scheduler` only for three operations:
- `_scheduler.setCps(bpm/240)` — set tempo (line 279, inside `tryLiveTempo()`)
- `_scheduler.stop()` — silence (line 254, inside `hush()`)
- `_scheduler.setPattern(this, true)` — schedule a pattern (line 158, inside the `Pattern.prototype.play` patch)

**No cycle-completion callback exists in the current integration.** The `queueForNextCycle` function (lines 225–241) explicitly acknowledges this: the JSDoc comment at lines 217–218 reads:

> "Implements the ~250 ms setTimeout heuristic — the only option in @strudel/web@1.0.3 (no cycle-boundary callback exists; confirmed by inventory §OD-3 live-doc check)."

The prior-initiative inventory used `§OD-3` to confirm there is no `onCycle` / `onBeat` / cycle-boundary event in the scheduler API at `@strudel/web@1.0.3`.

**Conclusion for OQ-1:** `Cyclist` does NOT expose a cycle-completion event in `@strudel/web@1.0.3`. The BPM-derived `setInterval` approach is the only option. Timer formula (from phase file D2):
- 1 cycle = 1 bar of 4/4 (CLAUDE.md invariant)
- 1 cycle duration in ms = `60000 / bpm * 4` (= `(60000 * 4) / bpm`)
- `intervalMs = (60000 * 4 / bpm) * intervalCycles`

At 120 BPM: `(60000 * 4 / 120) * 8 = 2000 * 8 = 16000 ms` (16 seconds for 8 cycles).

---

## §(b) `SessionState` interface and `SavedSession` gap analysis

**Sources:** `src/state/session.ts` lines 1–450; `src/lib/persistence.ts` (full)

### `SessionState` fields (lines 323–338)

```typescript
export interface SessionState {
  bpm: number;
  view: 'rhythm' | 'harmony' | 'composition' | 'session' | 'code';
  chordMode: 'chord' | 'arp';
  harmony: HarmonyState;
  rhythm: RhythmState;
  composition: Composition;
  nowPlaying: NowPlaying;
}
```

### `HarmonyState` fields (lines 255–275)

- `root`, `mode`, `octave`, `progression` — persisted
- `subview` — **EPHEMERAL**, not in `SavedHarmonySchema` (lines 377–381 of `persistence.ts`)
- `registerMode` — **EPHEMERAL**, not in `SavedHarmonySchema`

### `SavedSessionSchema` fields (persistence.ts lines 229–239)

Persisted: `version`, `bpm`, `view`, `chordMode`, `harmony`, `rhythm`, `composition`.

### Gap: what is NOT in `SavedSession`

| `SessionState` field | In `SavedSession`? | Reason |
|---|---|---|
| `nowPlaying` | NO | Ephemeral transport state (comment: "Strips nowPlaying (ephemeral)" in `serializeSession`, persistence.ts line 252) |
| `harmony.subview` | NO | Ephemeral UI state (ADR 0011 Amendment §D5) |
| `harmony.registerMode` | NO | Ephemeral UI state (ADR 0011 Amendment §D6) |
| `Chord.cx`, `Chord.cy` | NO | Render hints (Decisions Register: ephemeral) |
| `Block.id`, `Track.id` | NO | ADR 0009 |

### What `AutopilotState` needs to look like

```typescript
export interface AutopilotState {
  enabled: boolean;         // whether autopilot is running
  intervalCycles: number;   // how many cycles between LLM calls; default 8; range 2–32
}
```

**Placement in `SessionState`:** `autopilot: AutopilotState` as a new top-level field.

**Persistence decision:** `AutopilotState` must NOT be added to `SavedSessionSchema`. Rationale:
1. It is ephemeral runtime state (timer handle, LLM call state) — comparable to `nowPlaying`.
2. Restoring a saved session with `enabled: true` would require immediately starting a timer, which conflicts with the "no audio on load" invariant.
3. No `SESSION_SCHEMA_VERSION` bump is needed (no persistence schema change).

The `serializeSession` function (persistence.ts lines 251–327) must simply not serialize `autopilot` — since it enumerates fields explicitly (not `...spread`), adding `autopilot` to `SessionState` without adding it to `serializeSession` is sufficient.

---

## §(c) `AgentOutputSchema` shape and `SCHEMA_VERSION`

**Source:** `src/agent/schema.ts` (full read)

### SCHEMA_VERSION

`export const SCHEMA_VERSION = 5;` — line 25.

History of bumps (schema.ts lines 13–24):
- v1→v2: Phase 06, rest union in HarmonyChordSchema
- v2→v3: Phase 02 harmonic-rhythm-improvements, instrument/room/decay on HarmonyChordCoreSchema
- v3→v4: Phase 03 harmonic-rhythm-improvements, preset/lpf/envelope fields
- v4→v5: Phase 01 ai-composition-authoring, `saveAsBlock?` field + relaxed superRefine

### `AgentOutputSchema` current shape (lines 249–265)

```typescript
export const AgentOutputSchema = z.object({
  rhythm: RhythmSpecSchema.optional(),
  harmony: HarmonySpecSchema.optional(),
  note: z.string().max(300).optional(),
  saveAsBlock: SaveAsBlockSpecSchema.optional(),   // NEW in v5, ADR 0021 D1
}).superRefine((val, ctx) => {
  // at least one of rhythm, harmony, saveAsBlock required
  if (val.rhythm === undefined && val.harmony === undefined && val.saveAsBlock === undefined) {
    ctx.addIssue({ ... });
  }
});
```

### Key constraint for autopilot

The `superRefine` guard (lines 256–264) requires at least one of `rhythm`, `harmony`, `saveAsBlock`. An evolution LLM call using `AgentOutputSchema` is compatible as-is: the agent is instructed to return `rhythm` and/or `harmony`. No `SCHEMA_VERSION` bump is needed (per ADR 0022 D7 target — phase file step 01.2 decision D7).

### `SaveAsBlockSpecSchema` (lines 206–233)

- `name: z.string().min(1)` — no `.max(100)` (truncation in applyBlockSave)
- `type: z.enum(['groove', 'armonia', 'sesion'])` — block type
- `addToTrack: z.boolean().optional()` — optional, false if absent

---

## §(d) `send()` return behavior, `chatHistory` side-effects, and timer-safety

**Source:** `src/agent/agent.ts` (full read)

### Return behavior

`send()` returns `Promise<AgentSendResult>` (lines 259–263):
```typescript
type AgentSendResult =
  | { type: 'skill'; code: string; summary: string; note?: string }
  | { type: 'code'; code: string }
  | { type: 'text'; text: string }
  | { type: 'error'; message: string };
```

### `chatHistory` side-effects in `send()`

`send()` mutates `chatHistory` in two places:
1. Line 358: `chatHistory.push({ role: 'user', content: text + addendum })` — before the fetch
2. Line 391: `chatHistory.push({ role: 'assistant', content: txt })` — after the fetch

This means **every `send()` call permanently appends two entries to `chatHistory`**. A `sendEvolution()` function that calls `send()` directly would contaminate the user's conversation history with autopilot turns.

### Timer-safety analysis of `send()`

`send()` has the following side-effects:
- Reads `sessionStore` via `get()` (synchronous, safe from any context)
- Reads `lang` store via `get()` (synchronous, safe)
- Calls `applyRhythmSpec` / `applyHarmonySpec` / `applyBlockSave` — these call `sessionStore.update()` (synchronous store mutation, safe from any context)
- Mutates `chatHistory` array (module-level, no lock/semaphore)
- No DOM manipulation, no alert(), no UI imports

**Conclusion for OQ-3:** `sendEvolution()` should NOT call `send()` internally. It must replicate the fetch logic independently, WITHOUT pushing to `chatHistory`. The contamination of `chatHistory` with autopilot turns would confuse user-initiated follow-up messages that reference "the previous exchange."

**Concurrency concern:** Two parallel calls to `send()` (one manual, one from the timer) could interleave `chatHistory.push` calls and corrupt conversation history. The module-level `_isEvolving` flag in `autopilot.ts` (phase file D3) prevents this from the timer side; `send()` itself does not acquire any lock. The guard in `sendEvolution()` (checking `_isEvolving`) is sufficient because only one autopilot call can be in-flight at a time.

---

## §(e) BPM state in `src/audio/strudel.ts`

**Source:** `src/audio/strudel.ts` (full read)

### `_currentBpm` — private module-level variable

```typescript
/** Current BPM value; default 120 (prototype line 585). */
let _currentBpm = 120;
```

Line 86. This is a `let` variable, NOT exported. There is no `getCurrentBpm()` exported accessor.

### Export surface of `strudel.ts`

Exported functions: `initAudio`, `runNow`, `queueForNextCycle`, `hush`, `setTempo`, `isPlaying`, `currentCode`.

`_currentBpm` is NOT exported. The only way to change it is via `setTempo(bpm)` (lines 299–308), which also calls `tryLiveTempo()` and debounces a re-evaluate.

### BPM access for `autopilot.ts`

`autopilot.ts` must NOT import `_currentBpm` from `strudel.ts` (it is private and would require an additional export). Instead, the BPM is available as `sessionStore.bpm` — it is persisted in `SavedSession` (persistence.ts line 231) and updated in `SessionState` by the `setBpm` store action.

**Conclusion for D5 (phase file):** `autopilot.ts` reads BPM via `get(sessionStore).bpm`. This is the correct path — `sessionStore.bpm` is always in sync with `_currentBpm` because `setBpm` in session.ts calls `setTempo(bpm)` (audio side) and also updates the store (state side).

### `isPlaying()` export

`isPlaying(): boolean` is exported (line 316). It returns `audioReady && _currentCode !== ''`. This is the guard for OQ-4 (skip LLM call when audio is not playing).

---

## §(f) Open Questions for Pilot Resolution

### OQ-1 — Cycle-completion event vs. BPM-derived `setInterval`

**Question:** Does `Cyclist` from `@strudel/web` expose a cycle-completion event/callback that `autopilot.ts` could subscribe to for exact cycle-boundary firing?

**Finding:** No. The comment in `queueForNextCycle` (strudel.ts lines 217–218) explicitly states: "no cycle-boundary callback exists; confirmed by inventory §OD-3 live-doc check." The Strudel `@strudel/web@1.0.3` pinned version does not expose an `onCycle` or similar event.

**Dev recommendation:** Use BPM-derived `setInterval`. The formula is:
```
intervalMs = (60000 * 4 / bpm) * intervalCycles
```
where `bpm = get(sessionStore).bpm` and `intervalCycles = get(sessionStore).autopilot.intervalCycles`.

At 120 BPM with 8 cycles: `intervalMs = 16000 ms`.

This is consistent with the existing `queueForNextCycle` approach (250 ms heuristic for one cycle). The `setInterval` is restarted whenever the user changes `intervalCycles` or BPM while autopilot is running — `startAutopilot()` clears any existing timer before creating a new one (per phase file operability requirement).

---

### OQ-2 — `AutopilotState` location: `SessionState` (reactive) vs. module-level in `autopilot.ts` (ephemeral)

**Question:** Should `AutopilotState` (`enabled: boolean`, `intervalCycles: number`) live in `SessionState` (reactive, visible to UI) or as module-level state in `autopilot.ts` (ephemeral, simpler)?

**Finding:** The UI toggle in AgentPanel.svelte needs to bind to `autopilot.enabled` and `autopilot.intervalCycles` reactively. The existing boolean toggles in AgentPanel (`autoplay`, `autofixEnabled`) are local Svelte variables (lines 93–94), but those are UI-only settings that don't need to be shared outside the component. The autopilot `enabled` state will need to be read by `autopilot.ts` as well (to avoid race conditions), so module-level is viable — but Svelte reactivity works best with the store.

**Dev recommendation:** Place `AutopilotState` in `SessionState`. Rationale:
1. The toggle button in AgentPanel needs `$sessionStore.autopilot.enabled` to reflect current state reactively — using a module-level variable would require a separate Svelte store or a manual subscription.
2. `intervalCycles` benefits from Svelte reactivity: the input disabling (disabled while `enabled === true`) uses `$sessionStore.autopilot.enabled`.
3. The store is already used for all other UI-reactive state.
4. `AutopilotState` is excluded from `SavedSession` (no persistence schema change).

---

### OQ-3 — Evolution LLM call: add to `chatHistory` or clean slate?

**Question:** Should `sendEvolution()` push its user/assistant turns to `chatHistory`, or use a clean slate (no `chatHistory` mutation)?

**Finding:** `chatHistory` is exported from `agent.ts` (line 50) and is used by both `send()` (lines 358, 391) and `requestAutofix()` (lines 507, 523) to maintain conversation context. Autopilot turns would appear as user/assistant pairs in the existing chat if added to `chatHistory`.

**Dev recommendation:** Clean slate — do NOT add to `chatHistory`. Rationale:
1. Autopilot is generative, not conversational. The user's chat is a creative dialogue; autopilot messages would look like system noise.
2. If the user types a follow-up message after several autopilot turns, the `chatHistory` context would be cluttered with machine-generated "rhythm variant A → variant B" turns that have no relation to the user's intent.
3. `sendEvolution()` passes the current session state as a JSON snippet in the system prompt or user message — this provides sufficient context without conversation history.
4. The `SYSTEM_PROMPT_EVOLUTION` is a separate constant (not `SYSTEM_PROMPT`), so it is naturally scoped to a one-shot call.

---

### OQ-4 — Timer audio-awareness guard: skip LLM when nothing is playing?

**Question:** Should `sendEvolution()` skip the LLM call when audio is not currently playing (i.e., `isPlaying() === false`)?

**Finding:** `isPlaying()` is exported from `src/audio/strudel.ts` (line 316). It returns `audioReady && _currentCode !== ''`. When the user has stopped playback, firing the LLM wastes API quota and may produce results inconsistent with the session (because the session state may have been cleared or the user is in a "designing" phase, not a "playing" phase).

**Dev recommendation:** Yes — skip the LLM call when `isPlaying() === false`. Implementation: at the start of each timer tick in `autopilot.ts`, check `isPlaying()` (imported lazily from `'../audio/strudel.js'`). If false, skip silently (no error, no UI feedback — the timer continues running). This matches the stated OQ-4 recommendation in the phase file.

**Caveat:** `isPlaying()` is in `src/audio/strudel.ts`, which uses `@strudel/web`. To keep `autopilot.ts` unit-testable in Node (no DOM), the import must be lazy (dynamic `import()`) or the `isPlaying` check must be injected as a parameter. Recommended: accept an `isPlaying` parameter with a default pointing to the real function, matching the lazy-import pattern used in `session.ts` (lines 80–94).

---

### OQ-5 — Phase 01 evolution target: always both rhythm and harmony, or user-selectable?

**Question:** Should the autopilot always evolve both rhythm and harmony in Phase 01, or should the user be able to pick (rhythm only, harmony only, both)?

**Finding:** `SYSTEM_PROMPT_EVOLUTION` will be a new constant. The `AgentOutputSchema` already validates that at least one of `rhythm`/`harmony` is present. If the prompt asks for "a musical variant," the LLM may return only one of the two — which is valid per schema.

**Dev recommendation:** Always evolve both in Phase 01. Rationale:
1. A user-selectable target adds UI complexity (a selector with 3 options) that is a Phase 02 concern.
2. The LLM naturally handles the current session context: if rhythm is empty, the prompt will reflect that and the LLM can return only harmony.
3. The phase file step 01.3 states "always both" for Phase 01 scope. Concretely, `SYSTEM_PROMPT_EVOLUTION` includes rhythm + harmony JSON as context and instructs the LLM to return both.
4. The existing `superRefine` guard accepts a rhythm-only or harmony-only response as valid — so even with the "both" instruction, the system won't break if the LLM returns only one.

---

## Summary of findings for step 01.2 (ADR 0022)

| Decision area | Finding | Recommendation |
|---|---|---|
| D1 — `AutopilotState` shape | `{ enabled: boolean; intervalCycles: number }` | In `SessionState`; excluded from `SavedSession` |
| D2 — Timer mechanism | No Cyclist cycle event exists in @strudel/web@1.0.3 | `setInterval` with `intervalMs = (60000*4/bpm)*intervalCycles` |
| D3 — Concurrency guard | `send()` has no lock; chatHistory could be corrupted | Module-level `_isEvolving` flag in `autopilot.ts` |
| D4 — `SYSTEM_PROMPT_EVOLUTION` | Separate from `SYSTEM_PROMPT`; no chatHistory | Clean-slate prompt; current state JSON as context |
| D5 — BPM access | `_currentBpm` is NOT exported from strudel.ts | Read `bpm` from `get(sessionStore).bpm` |
| D6 — Audio-awareness guard | `isPlaying()` is exported from strudel.ts | Skip LLM when `isPlaying() === false` |
| D7 — No schema bump | `AgentOutputSchema` at v5 is compatible as-is | No `SCHEMA_VERSION` bump needed |
