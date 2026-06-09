# Phase 06 Inventory — Agent with Skills

**Created:** 2026-06-09
**Phase file:** `docs/orbifold-v1/phases/phase-06.md`

## Files that will be touched

| Path | Current purpose | Change planned |
|---|---|---|
| `src/agent/schema.ts` | Stub (empty export) | Full Zod schema: `RhythmLayerSchema`, `RhythmSpecSchema`, `HarmonyChordSchema`, `HarmonySpecSchema`, `AgentOutputSchema`; inferred TS types |
| `src/agent/apply.ts` | Stub (empty export) | `applyRhythmSpec` + `applyHarmonySpec` — session store updates via core engine calls |
| `src/agent/providers.ts` | Stub (empty export) | `PROVIDERS` config (anthropic + openrouter only); `loadApiKey` / `saveApiKey`; `ProviderKey` + `ChatMessage` types |
| `src/agent/agent.ts` | Stub (empty export) | `SYSTEM_PROMPT`, `send`, `requestAutofix`, `tryParseSkill`, `extractLastStrudelCode`, module-level chat state |
| `src/state/agentCtx.ts` | Does not exist | New ephemeral Svelte writable store `{ includeRhythm, includeHarmony }` |
| `src/ui/AgentPanel.svelte` | Does not exist | New full agent panel component (tab, slide-in aside, provider row, chat, quick prompts, input row) |
| `src/ui/HarmonyControls.svelte` | Chord-mode toggle | Add `📨 marco` context capture button (imports `agentCtx`) |
| `src/ui/RhythmControls.svelte` | Euclidean controls | Add `📨 base` context capture button (imports `agentCtx`) |
| `src/app/App.svelte` | Root component (mounts all drawers) | Add `import AgentPanel` + `<AgentPanel />` after `<CompositionDrawer />` |
| `src/app/app.css` | Global CSS tokens and styles | Append agent CSS block: `#agentTab`, `#agent`, `.agent-head`, `.prov-row`, `#chat`, `.msg`, `.bubble`, `.runbtn`, `.dots`, `.quick`, `.agent-input`, `.toggles`, plus responsive override |
| `tests/schema.test.ts` | Does not exist | New unit tests (≥12 cases) for `AgentOutputSchema` and `applyRhythmSpec`/`applyHarmonySpec` |

**Total: 11 files (9 new/modified source + 1 new test + 1 modified CSS). Within the 15-file limit.**

## Existing behavior to preserve

- All A-05 behaviors: composition drawer (open/close, blocks, timeline, transport), Tonnetz scene, rhythm/harmony transport, code drawer — all must be unchanged.
- `nowPlaying.source` union already includes `'agent'` (confirmed in `src/state/session.ts` lines 126–135) — no change needed.
- `sessionStore`, `rhythmCode`, `harmonyCode`, `sessionCode`, `buildSession`, `rhythmToStrudel`, `melodyLine` exports remain intact.
- `requeueLive()`, `setNowPlaying()` behavior unchanged.
- The `Chord` type must not gain `cx`/`cy` fields from `applyHarmonySpec` (Register: render hints ephemeral).
- `pnpm test` passes at ≥120 (Phase 05 gate: 120 tests).

## New behavior to introduce

- `꩜ AGENTE IA` tab visible at the right edge of the viewport; click slides in the agent panel.
- Provider selector supports Anthropic and OpenRouter (not OpenAI — Pilot decision / known deviation from prototype).
- API key persists per provider in localStorage under keys `orbifold.apiKey.anthropic` / `orbifold.apiKey.openrouter`.
- Sending a natural-language request produces a JSON skill response that updates `sessionStore` rhythm and/or harmony directly.
- `applyRhythmSpec` with euclid variant calls `bjorklund(k,n)` + `rotate(pat,rot)` → maps to 16-step grid.
- `applyRhythmSpec` with steps variant takes first 16 entries, clamps to 0/1.
- `applyHarmonySpec` updates `harmony.root` (via `noteToPc`), `harmony.mode`, `harmony.octave`, and `harmony.progression`; no `cx`/`cy` written.
- Agent-generated code plays via `runNow`; `nowPlaying.source` is set to `'agent'`.
- Auto-corrector retries up to 2 times on Strudel execution error (when autofix enabled); shows "🔧 corrigiendo…" indicator.
- Quick prompts row: 5 preset buttons that pre-fill and send (🥁 Groove, 🎹 Progresión, 🎶 Ritmo + armonía, 🌀 Euclidiano, 🔁 Variación).
- `📨 base` and `📨 marco` context capture buttons in rhythm/harmony toolbars; active state when flagged.
- Context flags are read by `send()` and injected into the next message; reset after send.

## Acceptance ID coverage plan

| Acceptance ID | Behavior | Planned test type | Planned test file | Step that covers it |
|---|---|---|---|---|
| A-06-01 | Agent tab visible; click opens panel with slide-in animation; ✕ closes it | live-system | (smoke test 06.5) | 06.4 / confirmed 06.5 |
| A-06-02 | Provider selector shows Anthropic and OpenRouter; switching updates model default and key hint; API key persists | live-system | (smoke test 06.5) | 06.3 + 06.4 / confirmed 06.5 |
| A-06-03 | Sending "un groove de hip-hop y una progresión menor" updates rhythm layers + harmony in session state | live-system | (smoke test 06.5) | 06.3 + 06.4 / confirmed 06.5 |
| A-06-04 | `AgentOutputSchema` accepts valid payloads; rejects invalid sound, wrong steps length, k/n out of range, invalid mode/quality | unit | `tests/schema.test.ts` | 06.2 |
| A-06-05 | `applyRhythmSpec` steps-variant updates sessionStore correctly; euclid-variant calls bjorklund/rotate | unit | `tests/schema.test.ts` | 06.2 |
| A-06-06 | `applyHarmonySpec` updates root/mode/octave/progression; no cx/cy fields | unit | `tests/schema.test.ts` | 06.2 |
| A-06-07 | Agent-generated code plays via runNow; nowPlaying.source = 'agent'; Transport label reflects this | live-system | (smoke test 06.5) | 06.4 / confirmed 06.5 |
| A-06-08 | Auto-corrector retries up to 2 times; "🔧 corrigiendo…" feedback appears | live-system | (smoke test 06.5) | 06.3 + 06.4 / confirmed 06.5 |
| A-06-09 | Quick prompts pre-fill and send the preset message | live-system | (smoke test 06.5) | 06.4 / confirmed 06.5 |
| A-06-10 | `📨 base` and `📨 marco` context capture buttons active state and context injection | live-system | (smoke test 06.5) | 06.4 / confirmed 06.5 |
| A-06-11 | All A-05 behaviors intact | unit + live-system | existing test suite + smoke test 06.5 | 06.5 |
| A-06-12 | tsc/lint/test (≥132)/build all exit 0 | proxy:static-analysis + unit | (gate commands 06.5) | 06.2 / confirmed 06.5 |

## Tests to add or modify

- `tests/schema.test.ts` — new file, ≥12 test cases:
  - `AgentOutputSchema.parse`: valid rhythm-only, harmony-only, rhythm+harmony+note → succeed.
  - `AgentOutputSchema.parse`: invalid sound name, steps length ≠ 16, k=0, k=17, n=1, n=17, rot > n-1, invalid mode, invalid quality, empty layers array, neither rhythm nor harmony present → all fail.
  - `applyRhythmSpec` (steps variant): verifies sessionStore update via `get(sessionStore)`.
  - `applyRhythmSpec` (euclid variant): E(3,8,0) produces expected 16-step pattern (matches `euclid.test.ts` known value for bjorklund(3,8)).
  - `applyHarmonySpec`: root 'C', mode 'minor', progression [{root:'C',quality:'min'},{root:'Ab',quality:'maj'}] → correct store update; no cx/cy on any chord.
  - All existing tests continue to pass (currently 120; target ≥132 after step 06.2).

## Open decisions surfaced

**Resolution required before step 06.2.** These cannot be silently inherited:

- **OD-1: `gain` default when absent in `HarmonyChordSchema`** — The prototype `applyHarmonySpec` (line 1714) always sets `gain: 0.6` when applying a progression from agent output. The phase-06 spec says "gain defaults to 0.6 if absent." No ambiguity — confirmed 0.6. Resolution: implement as spec, no Pilot decision needed.

- **OD-2: `nowPlaying.source = 'agent'` — already present** — The inventory confirms `'agent'` is in the union at `src/state/session.ts` lines 126–135. No spec change required; step 06.4 uses it as-is.

**None that require Pilot resolution before NN.2.** All open items are self-resolving by reading spec + source.

## Source-of-truth check

**Cross-source data:** `applyRhythmSpec` and `applyHarmonySpec` in `src/agent/apply.ts` will consume the Zod-validated `AgentOutput` object (produced by `src/agent/schema.ts`) and write to `sessionStore` (produced by `src/state/session.ts`).

- **Producer (schema):** `AgentOutputSchema` in `src/agent/schema.ts` (to be created in step 06.2). The schema aligns with `ORBIFOLD_KICKOFF.md §7` and the prototype's SK_* constants (lines 1670–1673).
- **Consumer (apply):** `applyRhythmSpec(spec: RhythmSpec)` writes `RhythmLayer[]` to `sessionStore.rhythm.layers`. The `RhythmLayer` type comes from `src/core/rhythm/layers.ts`.
- **Shape alignment check:**
  - `RhythmLayer` from `src/core/rhythm/layers.ts` requires `{ sound: Sound, steps: number[] }` with optional `euclid?: string`. The `apply.ts` euclid-variant will set `euclid` as a compact string (e.g., `"3,8,1"`), matching the existing `addEuclidLayer` pattern in `session.ts` (lines 558–560).
  - `Chord` from `session.ts` requires `{ rootPc: number, qual: Quality, gain: number }`. The `applyHarmonySpec` will set these fields only — no `cx`/`cy` (Register compliant).
  - `Quality` type is `'maj' | 'min' | 'dim' | 'aug'` — matches the schema `quality` field exactly.
  - `noteToPc` is exported from `src/core/theory/pitch.ts` and handles string roots exactly as the prototype (lines 1674–1681).
  - `bjorklund`, `rotate`, `RSTEPS` are exported from `src/core/rhythm/euclid.ts` — confirmed exports match prototype usage.
  - No shape mismatches detected.

## Known deviations from prototype

| Feature | Prototype | Orbifold v1 | Reason |
|---|---|---|---|
| Providers | openrouter, openai, anthropic (3) | openrouter, anthropic (2) | Pilot decision: no OpenAI in Phase 06 |
| `setcpm` in SYSTEM_PROMPT | Line 1585 says "la app fija el tempo (setcpm)" | Will be updated to `setcps` | ADR 0005: `setcpm` does not exist in `@strudel/web@1.0.3` |
| `cx`/`cy` on applied chords | Prototype line 1715 sets `cx`/`cy` from `tonnetzTris` | Not set | Decisions Register: render hints ephemeral |
| Context capture location | Prototype puts `📨` buttons in footer (lines 510–511) | Moved to HarmonyControls/RhythmControls toolbars | Svelte layout: footer = Transport component, no place for extra buttons |
| Agent CSS location | Inline in prototype `<style>` (lines 130–177) | Appended to `src/app/app.css` | Svelte project convention |
| `agentCtx.ts` store | Prototype uses global `melodyContext`/`rhythmContext` JS variables (lines 1510, 1534) | Svelte writable store `agentCtx.ts` | Svelte reactivity pattern; consistent with ADR 0008/0009 ephemeral pattern |
| Anthropic model string | `claude-sonnet-4-20250514` (prototype line 1599) | `claude-sonnet-4-6` (current model alias) | Phase file spec overrides prototype value |

## New dependencies needed

None. `zod` is already in `package.json` (confirmed as dependency from Phase 00/02 setup). No new npm packages required.

## Environment, CI, build, or deployment changes needed

None. No new env vars, CI steps, or deployment changes. API keys are per-user in localStorage.

## Decisions Register check

- **Exact dependency version pinning** — No new dependencies; no conflict.
- **`Chord.cx / Chord.cy` — render hints ephemeral** — Directly applies: `applyHarmonySpec` must NOT write `cx`/`cy` to any chord in the progression. Confirmed in the apply.ts implementation plan.

## ADR Triggers

Two ADR triggers are listed in the phase file for step 06.3:

1. **Agent API key localStorage naming** (`orbifold.apiKey.anthropic` / `orbifold.apiKey.openrouter`) — The phase spec pre-resolves this: these exact key names are mandated. The ADR is triggered only if the Dev proposes a different namespace. Implementation will use the spec-mandated keys; no ADR needed unless the Pilot changes the approach.

2. **Browser-direct AI provider calls security posture** — Anthropic requires `anthropic-dangerous-direct-browser-access: true`. The phase spec pre-resolves this as consistent with `ORBIFOLD_KICKOFF.md §9` (no proxy in Phase 06). No ADR triggered unless the approach changes.

## Risks specific to this phase

- **Live API calls in dev:** Steps 06.3/06.4/06.5 make real HTTP requests to Anthropic/OpenRouter. These require the Pilot to have a valid API key during smoke testing (step 06.5). The unit tests (step 06.2) are pure — no network calls.
- **`@strudel/web` error object shape:** `runNow` returns an error with `.error` and `.ok` fields (confirmed in `src/audio/strudel.ts` lines 170–205). The `playWithAutofix` logic in `AgentPanel.svelte` must use this shape. The prototype checks `result.ok === false && result.error` — align exactly.

## Pilot review

The Pilot approves before step 06.2 begins. Approval is recorded by Pilot replying to chat with explicit authorization.
