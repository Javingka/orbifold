# Phase 02 — Audio Layer + Reactive Session Store

**Purpose:** Implement `src/audio/strudel.ts` (Strudel runtime wrapper: init after user gesture, runNow, queueForNextCycle, hush, setTempo) and `src/state/session.ts` (Svelte reactive store holding `SessionState`, deriving Strudel code via Phase 01 `core/codegen` engines, and driving the audio layer), so that groove, progression, and session playback all work from a single source of truth.
**Gate:** Phase 01 is complete and Pilot-approved (92 parity tests green; `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all exit 0; `src/core/**` fully implemented with zero DOM/PIXI/Svelte imports).
**Expected phase result:** A developer running `pnpm dev`, opening the app in a browser, and clicking the transport play buttons can hear the groove, the chord progression, and the combined session; changing the BPM slider changes the real audio tempo; a live edit (step-toggle or chord change) causes the new pattern to take effect at the next Strudel cycle boundary; `hush` silences everything; `pnpm test`, `pnpm lint`, `tsc --noEmit`, and `pnpm build` all exit 0.

---

## Step 02.1 — Inventory

PROMPT → Read `CLAUDE.md`, `references/methodology.md`, `references/dev-role.md`, `references/inventory-template.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-02.md`, `ORBIFOLD_KICKOFF.md §4–6`, and `reference/orbifold.html` (lines 580–692 for the audio/state globals and Strudel control; lines 1470–1507 for transport handlers; the full JS section as context for `setNowPlaying` and `requeueLive`). Produce `docs/orbifold-v1/inventories/phase-02-inventory.md` following the inventory template exactly. Do NOT write any source code. Stop after committing the inventory file.

The inventory must address:

**Prototype function mapping.** For each target file, list the prototype source functions and exact line ranges:

- `src/audio/strudel.ts`:
  - State globals: `strudelReady`, `currentCode`, `queuedCode`, `currentBpm` (lines 582–585)
  - `initStrudel` call (lines 600–603): called at module load in the prototype but MUST be deferred to a user gesture in the port (CLAUDE.md invariant: "Audio starts only after a user gesture")
  - `tempoWrap(code)` (lines 605–608): already ported to `src/core/codegen/strudel.ts` — the audio layer imports and delegates to it; do NOT re-implement
  - `runNow(code, opts)` (lines 609–631)
  - `queueForNextCycle(code, opts)` (lines 632–643)
  - `tryLiveTempo()` (lines 647–651): the live tempo nudge (calls the global `setcpm`/`setcps` from the Strudel bundle — the exact global name must be checked against current Strudel docs; see open decision below)
  - `setBpm(bpm, opts)` (lines 653–668): the audio module exposes `setTempo(bpm)` — the debounce strategy and re-evaluate-on-tempo-change logic must be ported faithfully
  - `hush()`: called as a global from the Strudel bundle (lines 497, 866, 1507, 2107, 2113)

- `src/state/session.ts`:
  - `SessionState` type (kickoff §5): `bpm`, `view`, `chordMode`, `harmony` (`HarmonyState`), `rhythm` (`RhythmState`), `composition` (`Composition`), `nowPlaying`
  - `HarmonyState`: `root`, `mode`, `octave`, `progression: Chord[]` — reconcile with the prototype's `melState` global (lines 741–742 and usage throughout); `Chord` is `{ rootPc, qual, gain }` per kickoff §5 (the `pcs` and `label` fields on the prototype's chord objects are derivable and should NOT be stored in state — they are computed)
  - `RhythmState`: `layers: RhythmLayer[]` — imported from `src/core/rhythm/layers.ts`
  - `nowPlaying`: `{ label: string | null; source: 'rhythm'|'harmony'|'session'|'chord'|'composition'|'preview'|'agent'|'editor'|null }`
  - Code derivation: the store must expose `derived` values (or methods) for `rhythmCode()`, `harmonyCode()`, and `sessionCode()` — each calls the appropriate `core/codegen` function and returns a Strudel string; these pure derivations ARE unit-testable in Vitest (Node env, no browser)
  - Transport methods: `playGroove()`, `playProgression()`, `playSession()`, `playChord(ch)`, `hushAll()`, `setNowPlaying(label, source)` — calling into `audio/strudel.ts`; the live-requeue mechanism `requeueLive()` (prototype lines 1307–1315) belongs in the store (it reads `nowPlaying.source` and re-derives code, then calls `queueForNextCycle`)

**Strudel @strudel/web API (live-doc check — MANDATORY before implementation).** The Dev MUST consult `https://strudel.cc/learn/` and the `@strudel/web` source at `1.0.3` (already installed in `node_modules/@strudel/web`) before asserting the following. The inventory must confirm or correct each item:
  - `initStrudel({ prebake: () => samples(...) })` — confirm this is the correct entry point and that it returns a Promise or synchronously completes before audio can start
  - `evaluate(code)` — confirm this is the function that compiles and starts a pattern
  - `hush()` — confirm this is the global that silences all patterns
  - `setcpm(value)` — confirm this is a global (not an import) after `initStrudel` runs, and whether it is safe to call in `tryLiveTempo` between cycles without restarting the scheduler
  - How "next cycle" scheduling works: the prototype's `queueForNextCycle` uses a 250 ms `setTimeout` as a best-effort heuristic (lines 632–643). The inventory must determine whether `@strudel/web@1.0.3` exposes a cycle-boundary callback (e.g., an `onCycleEnd` event or a scheduler hook). If it does, surface it as an open decision (use callback vs. keep the 250 ms heuristic). If it does not, confirm the 250 ms heuristic is the only option and note it.
  - Whether `initStrudel` must be called inside a user-gesture handler (click/keydown) or whether it can be called earlier and only `evaluate` must wait for a gesture

**SessionState type definition.** The inventory must write out the exact TypeScript interfaces that will go in `src/state/session.ts`, reconciling kickoff §5 with the Phase 01 engine types:
  - `Chord` shape: `{ rootPc: number; qual: Quality; gain: number }` — `pcs` and `label` are omitted from state (computed in codegen); `gain` defaults to `0.6` (prototype default, lines 758–763)
  - `HarmonyState`, `RhythmState`, `Composition` (imported from `core/composition/model.ts`)
  - `SessionState` exactly as in kickoff §5 plus any reconciliation notes
  - The initial default state value (default BPM 120, empty layers, empty progression, `view: 'harmony'`, `chordMode: 'chord'`, `nowPlaying: { label: null, source: null }`)

**Audio validation approach (open decision — must be resolved before step 02.2).** Web Audio and Strudel audio output CANNOT be tested headlessly in Vitest (no AudioContext in Node/jsdom). The inventory must propose and flag the validation approach for the Pilot to decide:
  - Option A: Manual smoke test only — the Dev runs `pnpm dev`, opens the browser, clicks each transport button, observes audio, and writes a parity note in the handoff describing observed behavior equivalence to the prototype. The Planner accepts `operability`/`manual` evidence for all audio-behavior Acceptance IDs.
  - Option B: Optional Playwright E2E smoke — a single spec that loads the app, dispatches a click on the play button, and asserts that the AudioContext is in `'running'` state (no sound verification, just that audio subsystem started). This is optional (per CLAUDE.md "Playwright optional") and adds a devDependency that needs Pilot approval (per exact-pinning Register entry).
  - The inventory must flag the chosen approach as an open decision, because Option B requires `playwright` as a new exact-pinned devDependency.

**Svelte store vs framework-agnostic store (open decision — must be resolved before step 02.2).** The prototype uses mutable globals. The port can use either:
  - Option A: Svelte `writable` store — tight coupling to Svelte, but already in the stack; reactive subscriptions work natively in components
  - Option B: A framework-agnostic store (e.g., a plain class with an `EventEmitter`) — keeps `state/session.ts` DOM-free but adds complexity; components would import the store and manually subscribe
  - The inventory must surface this as an open decision. Note: `src/state/session.ts` is NOT in `core/**`, so it is allowed to import from Svelte (per CLAUDE.md: only `core/**` must be DOM/PIXI/Svelte-free). A Svelte `writable` store is an acceptable choice; surface it anyway for Pilot awareness.

**New runtime dependencies.** No new runtime deps are expected beyond the already-pinned `@strudel/web@1.0.3`. If the Dev's live-doc check reveals that a separate `@strudel/core` or similar package is needed (not already in node_modules), it must surface that as a missing-decision blocker before step 02.2. The exact-pinning Register entry applies to any new dep.

**Open decisions to resolve before step 02.2:**
  - OD-1: Audio validation approach (Option A manual vs Option B Playwright)
  - OD-2: Svelte `writable` store vs framework-agnostic store for `session.ts`
  - OD-3: `queueForNextCycle` — 250 ms heuristic vs cycle-boundary callback (if one exists in `@strudel/web@1.0.3`)
  - OD-4: Whether `initStrudel` must be called inside the gesture handler itself, or whether it can be called at module load and only `evaluate` must follow the gesture

Validation:
- Inventory file created and committed; no source code modified.

Expected result:
- `docs/orbifold-v1/inventories/phase-02-inventory.md` committed.
- All four open decisions (OD-1 through OD-4) listed with Pilot-resolution required.
- Exact prototype line citations present for every audio and state function.
- Exact TypeScript interface definitions for `SessionState` and sub-types written out.
- Strudel API surface confirmed from live docs (or flagged as uncertain).

CHECKPOINT → Commit message:
`docs(state): Phase 02 step 02.1 — phase-02 inventory`

---

## Step 02.2 — Session store + code-derivation tests

PROMPT → Read `CLAUDE.md`, `references/methodology.md`, `references/dev-role.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-02.md`, `docs/orbifold-v1/inventories/phase-02-inventory.md`, and `docs/orbifold-v1/handoffs/phase-02-handoff.md`. Confirm all four open decisions (OD-1 through OD-4) from the inventory are resolved before writing any code.

Implement `src/state/session.ts`: the `SessionState` TypeScript interfaces (exactly as defined in the inventory), the default initial state, and the Svelte `writable` store wrapping it (assuming OD-2 resolves to Svelte writable; adapt if Pilot chose otherwise). The store must expose:
- Pure state-derivation helpers `rhythmCode()`, `harmonyCode()`, and `sessionCode()` that call the relevant `src/core/codegen/strudel.ts` functions and return a Strudel string — these must have no audio or DOM side effects (they are pure string-returning functions that can be tested in Node)
- Transport action stubs: `setNowPlaying(label, source)` updates the store's `nowPlaying` field; `setBpm(bpm)` updates `bpm` and (in a later step) will trigger audio re-evaluation — for now it only updates the store value; `requeueLive()` is a stub that reads `nowPlaying.source`, derives the appropriate code string, and returns it (without calling audio yet — audio wiring happens in step 02.3)

Do NOT implement audio calls (`runNow`, `queueForNextCycle`, `hush`, `initStrudel`) in this step — those are step 02.3. The audio module (`src/audio/strudel.ts`) must NOT be imported in this step.

Implementation requirements:
- `src/state/session.ts` must import from `src/core/**` only — no audio imports. It may import from `svelte/store` (it is not in `core/**`, so the restriction does not apply).
- Export `SessionState`, `HarmonyState`, `RhythmState`, `Chord`, and all sub-types from this file.
- The default `SessionState` must have: `bpm: 120`, `view: 'harmony'`, `chordMode: 'chord'`, `harmony: { root: 0, mode: 'major', octave: 3, progression: [] }`, `rhythm: { layers: [] }`, `composition: { blocks: [], tracks: [] }`, `nowPlaying: { label: null, source: null }`.
- `rhythmCode()`, `harmonyCode()`, `sessionCode()` must call the exact same `src/core/codegen/strudel.ts` functions that the prototype uses: `rhythmToStrudel`, `melodyLine`, `buildSession`. They must pass `bpm` for `tempoWrap` in the final string if required, or return the un-wrapped body (clarify in the inventory which approach: the audio layer calls `tempoWrap` separately or the store returns pre-wrapped code).
- Write `tests/session.test.ts`: Vitest tests exercising the store's pure derivation functions with fixed inputs. These tests run in Node (no DOM, no AudioContext). Required cases:
  - `rhythmCode()` with a known `RhythmLayer[]` input produces the same string as calling `rhythmToStrudel` directly (parity test)
  - `harmonyCode()` with a known `Chord[]` progression produces the same string as calling `melodyLine` directly (parity test)
  - `sessionCode()` with both rhythm and harmony populated produces the same string as calling `buildSession` directly (parity test)
  - `setNowPlaying` and `setBpm` update the store value correctly (store mutation tests, using Svelte's `get()` or equivalent)
  - `requeueLive()` returns the correct code string for each `nowPlaying.source` value (`rhythm`, `harmony`, `session`, `chord`)

Prototype parity: cite `melodyLine` (prototype lines 765–773), `rhythmToStrudel` (lines 833–836), `buildSession` (lines 1470–1476), `setNowPlaying` (lines 1477–1486), and `requeueLive` (lines 1307–1315) for each corresponding implementation. The store's `setNowPlaying` is a state-only port (DOM manipulation stripped); behavioral fidelity means the `nowPlaying` store field reflects the correct values and `requeueLive()` derives the correct code string.

Validation:
- `pnpm exec vitest run session` → all session store tests pass
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `grep -rn 'import.*audio\|from.*audio' src/state/` → zero matches (audio layer not imported)

Expected result:
- `src/state/session.ts` committed with all types, default state, store, and derivation helpers.
- `tests/session.test.ts` committed with parity tests green in Node.
- No audio-layer imports in `src/state/session.ts`.

CHECKPOINT → Commit message:
`feat(state): Phase 02 step 02.2 — session store, SessionState types, and code-derivation parity tests`

---

## Step 02.3 — Audio layer: init, runNow, queueForNextCycle, hush, setTempo

PROMPT → Read `CLAUDE.md`, `references/methodology.md`, `references/dev-role.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-02.md`, `docs/orbifold-v1/inventories/phase-02-inventory.md`, and `docs/orbifold-v1/handoffs/phase-02-handoff.md`.

Implement `src/audio/strudel.ts`. This module wraps the `@strudel/web` runtime. It must NOT be imported by `src/core/**`.

Implementation requirements:
- **User-gesture guard (CLAUDE.md invariant):** `initAudio()` — the exported async function that calls `initStrudel(...)` from `@strudel/web`. This function must be called only from a user-gesture handler (click/keydown), never at module load. It sets an internal `audioReady` flag on success. Subsequent calls are no-ops if already initialized. Port from prototype lines 600–603, adapted per the OD-4 resolution.
- **`runNow(code, opts?)`** — async; calls `evaluate(tempoWrap(code, bpm))` from `@strudel/web` where `tempoWrap` is imported from `src/core/codegen/strudel.ts`; falls back to `evaluate(code.trim())` on error; updates internal `currentCode`; returns `{ ok: boolean; error?: string }`. Port from prototype lines 609–631.
- **`queueForNextCycle(code, opts?)`** — implements the queuing strategy resolved at OD-3 (250 ms heuristic or cycle-boundary callback). Port from prototype lines 632–643. Returns a Promise resolving to `{ ok: boolean }`.
- **`hush()`** — calls the `hush` global from `@strudel/web`; clears `currentCode`. Port from prototype line 1507 usage.
- **`setTempo(bpm)`** — updates `currentBpm`, calls `tryLiveTempo()` (which nudges `setcpm` per OD-4 resolution), then debounces a `runNow(currentCode)` re-evaluation if audio is running (130 ms debounce, same as prototype lines 653–668). Uses `setcpm` exclusively — never `setcps` or `.fast`/`.slow` (CLAUDE.md invariant).
- **`isPlaying()`** — returns `boolean`: `audioReady && currentCode !== ''`.
- **`currentCode()`** — returns the current pattern string (used by `requeueLive` in the store to decide whether to queue or skip).
- All globals from `@strudel/web` (`evaluate`, `hush`, `setcpm`, `samples`, `initStrudel`) must be accessed through dynamic import or type assertions — do NOT assume they are module exports without confirming in the live-doc check from step 02.1. Use whatever access pattern the inventory determined.
- AGPL-3.0 header present.
- No DOM imports (this file may reference `window` only for feature detection if needed, but prefer not to).

Audio behavior cannot be unit-tested in Vitest (no AudioContext in Node). Do NOT write Vitest tests that mock `evaluate` or `initStrudel` as behavioral proxies — that would not be prototype parity. Instead, write a **manual smoke-test record** in the handoff (see Prototype parity section below).

Prototype parity: cite every prototype function ported: `initStrudel` call (lines 600–603), `runNow` (lines 609–631), `queueForNextCycle` (lines 632–643), `tryLiveTempo` (lines 647–651), `setBpm`/`setTempo` (lines 653–668), `hush` usage (lines 1507, 2107, 2113). Parity note must state: "The module's behavior was verified manually against the prototype's equivalent behavior at `pnpm dev` — see the Operability evidence in this handoff entry."

Validation:
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `pnpm build` → exit 0 (audio module tree-shakes correctly; no runtime errors at import time)
- `grep -rn 'setcps\|\.fast\|\.slow' src/audio/` → zero matches (confirms `setcpm`-only invariant)

Expected result:
- `src/audio/strudel.ts` committed.
- `pnpm build` exits 0.
- The `setcpm`-only invariant confirmed by grep.

CHECKPOINT → Commit message:
`feat(audio): Phase 02 step 02.3 — audio layer: initAudio, runNow, queueForNextCycle, hush, setTempo`

---

## Step 02.4 — Wire transport: playGroove, playProgression, playSession, BPM change, and live hot-swap

PROMPT → Read `CLAUDE.md`, `references/methodology.md`, `references/dev-role.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-02.md`, `docs/orbifold-v1/inventories/phase-02-inventory.md`, and `docs/orbifold-v1/handoffs/phase-02-handoff.md`.

Wire the session store's transport actions to the audio layer, and update `src/app/App.svelte` with minimal transport buttons to make playback audible and testable.

Implementation requirements:
- In `src/state/session.ts`, implement (or complete the stubs from step 02.2):
  - `playGroove()`: derives `rhythmCode()`, calls `audio.runNow(code)`, calls `setNowPlaying('Ritmo · groove', 'rhythm')`. If `rhythmCode()` returns `''`, is a no-op.
  - `playProgression()`: derives `harmonyCode()`, calls `audio.runNow(code)`, calls `setNowPlaying('Armonía · progresión', 'harmony')`.
  - `playSession()`: derives `sessionCode()`, calls `audio.runNow(code)`, calls `setNowPlaying('Sesión · ritmo + armonía', 'session')`.
  - `hushAll()`: calls `audio.hush()`, calls `setNowPlaying(null, null)`.
  - `setBpm(bpm)` (complete): updates the store's `bpm`, calls `audio.setTempo(bpm)`.
  - `requeueLive()` (complete): if `audio.isPlaying()`, reads `nowPlaying.source`, derives code, calls `audio.queueForNextCycle(code)`. This is the hot-swap mechanism.
  - `initAudio()`: re-exports `audio.initAudio()` for use by the gesture handler in the UI.
- In `src/app/App.svelte`, add the minimum UI to exercise the transport. These are temporary wires — the full Svelte UI is Phase 04. For Phase 02 only:
  - An "Init audio" button that calls `initAudio()` on click (the user-gesture guard).
  - A "▶ Groove" button calling `playGroove()`.
  - A "▶ Progresión" button calling `playProgression()`.
  - A "▶ Sesión" button calling `playSession()`.
  - A "■ Silencio" button calling `hushAll()`.
  - A BPM number input (range 40–280, step 1, default 120) bound to the store's `bpm`; on change calls `setBpm(value)`.
  - A "Now playing" label showing `$sessionStore.nowPlaying.label ?? 'silencio'`.
  - Populate the store with a minimal default rhythm (one `bd` layer at 4-on-the-floor steps) and a minimal default harmony (C major, one-chord progression C major) so that each play button produces audible output on first load without additional interaction.
- Do NOT implement the full PIXI canvas, Tonnetz, or rhythm orbit UI — those are Phase 03 and Phase 04.

Prototype parity:
- `playGroove` ports prototype lines 1493–1498.
- `playProgression` ports prototype lines 1499–1504.
- `playSession` ports `sessionPlay.onclick` handler (prototype lines 1487–1492).
- `hushAll` ports `hushBtn.onclick` (prototype line 1507).
- `requeueLive` ports prototype lines 1307–1315.
- `setBpm` (audio + store) ports prototype lines 653–668.
- Behavioral fidelity: the manual smoke test (see Operability evidence below) must confirm each button works as in the prototype.

Validation:
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `pnpm test` → all prior tests still pass (92 from Phase 01 + session store tests from step 02.2; no regressions)
- `pnpm build` → exit 0

Expected result:
- All transport actions wired.
- `App.svelte` has minimal buttons.
- Store + audio layer + codegen all connected.

CHECKPOINT → Commit message:
`feat(state): Phase 02 step 02.4 — wire transport: playGroove, playProgression, playSession, BPM, hot-swap`

---

## Step 02.5 — Operability verification and phase closure

PROMPT → Read `CLAUDE.md`, `references/methodology.md`, `references/dev-role.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-02.md`, and `docs/orbifold-v1/handoffs/phase-02-handoff.md`.

Run the full manual operability smoke test for Phase 02 and write its results into the handoff. No new source code is written in this step — it is a verification-and-documentation step.

Implementation requirements:
- Run `pnpm dev`, open the browser, and perform each of the following, recording observed result:
  1. Page loads with no audio (AudioContext not started). The "Init audio" button is visible.
  2. Click "Init audio". Strudel initializes (no error in console). Audio system is ready.
  3. Click "▶ Groove". The BD 4-on-the-floor pattern plays. "Now playing" label shows "Ritmo · groove".
  4. Click "▶ Progresión". The C major harmony plays. "Now playing" changes to "Armonía · progresión".
  5. Click "▶ Sesión". Both rhythm and harmony play together. "Now playing" shows "Sesión · ritmo + armonía".
  6. Change BPM from 120 to 90. The audible tempo slows down (within one cycle).
  7. Change BPM back to 120. Tempo returns to original speed.
  8. While "▶ Groove" plays: modify the default layer's steps programmatically (or via console) and confirm the new pattern takes effect at the next cycle, not immediately (hot-swap behavior).
  9. Click "■ Silencio". All audio stops. "Now playing" shows "silencio".
  10. Close and reopen the tab. Audio does not auto-start (user-gesture guard works).
- Write the parity note comparing each observed behavior to the equivalent behavior in `reference/orbifold.html`. The parity note must be specific (not "it worked").
- Run and record the final gate commands:
  - `pnpm exec tsc --noEmit` → exit 0
  - `pnpm lint` → exit 0
  - `pnpm test` → all tests pass (must include session store tests; count must be >= 92 + session tests)
  - `pnpm build` → exit 0

Validation:
- Manual smoke test completed and parity note written in handoff.
- All four gate commands exit 0.

Expected result:
- `docs/orbifold-v1/handoffs/phase-02-handoff.md` updated with operability evidence for all 10 smoke-test items plus final gate command results.
- No source code changes (documentation step).

CHECKPOINT → Commit message:
`docs(audio): Phase 02 step 02.5 — operability verification and phase-02 handoff`

---

## Phase Acceptance

- **A-02-01** — After a user clicks "Init audio" (or equivalent gesture), the Strudel audio context starts without error and subsequent play actions produce audible output.
  - Validation method: `operability` (manual smoke test, step 02.5 item 2)

- **A-02-02** — Clicking "▶ Groove" causes the default rhythm pattern to play audibly and the "Now playing" label shows "Ritmo · groove".
  - Validation method: `operability` (manual smoke test, step 02.5 item 3)

- **A-02-03** — Clicking "▶ Progresión" causes the chord progression to play audibly and "Now playing" shows "Armonía · progresión".
  - Validation method: `operability` (manual smoke test, step 02.5 item 4)

- **A-02-04** — Clicking "▶ Sesión" plays groove and harmony together and "Now playing" shows "Sesión · ritmo + armonía".
  - Validation method: `operability` (manual smoke test, step 02.5 item 5)

- **A-02-05** — Changing BPM changes the audible tempo within one Strudel cycle, using `setcpm` exclusively (never `setcps`, `.fast`, or `.slow`).
  - Validation method: `operability` (manual smoke test, step 02.5 items 6–7) + `proxy:static-analysis` (`grep -rn 'setcps\|\.fast\|\.slow' src/audio/` → zero matches)

- **A-02-06** — A live edit (rhythm or harmony state change while playing) causes the new pattern to take effect at the next Strudel cycle boundary, not immediately (hot-swap via `queueForNextCycle`).
  - Validation method: `operability` (manual smoke test, step 02.5 item 8)

- **A-02-07** — Clicking "■ Silencio" stops all audio immediately and "Now playing" shows "silencio".
  - Validation method: `operability` (manual smoke test, step 02.5 item 9)

- **A-02-08** — Audio does NOT auto-start on page load; it requires a user gesture (user-gesture guard).
  - Validation method: `operability` (manual smoke test, step 02.5 item 10)

- **A-02-09** — The session store's `rhythmCode()`, `harmonyCode()`, and `sessionCode()` derivation functions produce byte-identical Strudel strings to calling the Phase 01 `core/codegen` functions directly with the same inputs.
  - Validation method: `unit` (Vitest, `tests/session.test.ts`, step 02.2)

- **A-02-10** — `tsc --noEmit`, `pnpm lint`, `pnpm test`, and `pnpm build` all exit 0 at phase end; no Phase 01 tests regressed.
  - Validation method: `live-system` (step 02.5 gate commands)

## Operability requirements

This is a feature phase delivering audible playback. The full operability verification occurs in step 02.5 and produces the manual smoke-test record in the handoff. For the Planner's review of steps 02.3 and 02.4, the Dev provides intermediate evidence:
- Step 02.3: `pnpm build` exit 0 and the `setcpm`-only grep confirm the audio module builds cleanly.
- Step 02.4: `pnpm test` exit 0 (no regressions) plus a brief inline observation that `pnpm dev` launches without console errors.
- Step 02.5: full 10-item smoke-test record plus all four gate commands.

Web Audio and Strudel audio output cannot be unit-tested headlessly in Vitest. The `unit` validation method applies only to the store's pure code-derivation functions (A-02-09). All audible-behavior Acceptance IDs (A-02-01 through A-02-08) use `operability` or `manual` validation, satisfied by the step 02.5 smoke-test record. The Planner will accept the smoke-test record as sufficient evidence for these IDs; the Pilot may additionally verify by ear at phase approval.

## Partial coverage from prior phase (if any)

No prior partials to address. All Phase 01 Acceptance IDs (A-01-01 through A-01-09) are fully covered. The Phase 01 pending Register proposals (OD-1/OD-2/OD-3/OD-4 function signatures) were resolved by the Pilot as "handoff-documented only, no Register entries needed." No new Phase 01 partial coverage carries forward.

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **Audio-test strategy: operability-only vs Playwright E2E** — Trigger: step 02.1 open decision OD-1. If Playwright is chosen, open an ADR recording the decision and the exact package version pinned.
- **Svelte `writable` store for session state** — Trigger: step 02.1 open decision OD-2. If the Pilot confirms Svelte writable (expected), open a brief ADR recording the rationale (state layer is allowed to use Svelte; only `core/**` must be framework-agnostic). If the Pilot chooses framework-agnostic, open an ADR recording the alternative and its tradeoffs.
- **`queueForNextCycle` scheduling: heuristic vs callback** — Trigger: step 02.1 open decision OD-3. If the live-doc check reveals a cycle-boundary callback in `@strudel/web@1.0.3`, open an ADR comparing the approaches and recording the decision. If only the heuristic is available, no ADR needed (confirm in inventory and proceed).

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v1/handoffs/phase-02-handoff.md`. See `handoff-template.md`.

The phase-completion entry must include a prototype parity summary table citing the prototype function, line range, and the ported module/function for every audio and state function ported in this phase.
