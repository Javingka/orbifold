# Phase 02 Inventory — Audio Layer + Reactive Session Store

**Created:** 2026-06-06
**Phase file:** `docs/orbifold-v1/phases/phase-02.md`

---

## Files that will be touched

| Path | Current purpose | Change planned |
|---|---|---|
| `src/audio/strudel.ts` | Stub (export `{}`) | Full implementation: `initAudio`, `runNow`, `queueForNextCycle`, `hush`, `setTempo`, `isPlaying` |
| `src/state/session.ts` | Stub (export `{}`) | Full implementation: `SessionState` types, default state, Svelte `writable` store, code-derivation helpers, transport stubs (step 02.2), then fully wired transport (step 02.4) |
| `src/app/App.svelte` | Minimal hello-world shell from Phase 00 | Add minimal transport buttons (Init audio, ▶ Groove, ▶ Progresión, ▶ Sesión, ■ Silencio, BPM input, Now-playing label) and default state population for step 02.4 |
| `tests/session.test.ts` | Does not exist | Created in step 02.2: Vitest parity tests for store's pure code-derivation functions |
| `docs/orbifold-v1/handoffs/phase-02-handoff.md` | Does not exist | Created and appended per template across all steps |

File count: 5 (within the 15-file threshold).

---

## Existing behavior to preserve

- All 92 Phase 01 Vitest tests must remain green throughout. (`tests/voice-leading.test.ts`, `tests/tonnetz.test.ts`, `tests/euclid.test.ts`, `tests/codegen.test.ts`)
- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` exit 0 after every code-touching step.
- `src/core/**` has zero DOM/PIXI/Svelte imports — Phase 02 does not touch these files.
- The `setcpm`-only invariant for tempo control must be preserved in the new audio layer (CLAUDE.md). `setcps`, `.fast`, `.slow` must never appear in `src/audio/strudel.ts`.

---

## New behavior to introduce

1. A user clicking a transport button (after first gesture) triggers Strudel playback via `@strudel/web`'s `evaluate()`.
2. The "Init audio" button (or equivalent first gesture) starts the AudioContext without errors.
3. BPM changes via the store propagate to the Strudel scheduler via `setcpm` (never `setcps`), within one cycle.
4. A live edit (rhythm step toggle or chord change) re-queues the current pattern for the next cycle boundary (hot-swap).
5. The "■ Silencio" button calls `hush()` from `@strudel/web` and clears `nowPlaying`.
6. The session store derives `rhythmCode()`, `harmonyCode()`, and `sessionCode()` as pure string functions callable in Node (Vitest).
7. Audio does NOT auto-start on page load — the user-gesture guard is enforced.

---

## Acceptance ID coverage plan

| Acceptance ID | Behavior | Planned test type | Planned test file | Step that covers it |
|---|---|---|---|---|
| A-02-01 | AudioContext starts after user gesture; no error | operability | `docs/orbifold-v1/handoffs/phase-02-handoff.md` (smoke-test record) | 02.5 |
| A-02-02 | "▶ Groove" plays rhythm pattern; label shows "Ritmo · groove" | operability | handoff smoke-test | 02.5 |
| A-02-03 | "▶ Progresión" plays harmony; label shows "Armonía · progresión" | operability | handoff smoke-test | 02.5 |
| A-02-04 | "▶ Sesión" plays both; label shows "Sesión · ritmo + armonía" | operability | handoff smoke-test | 02.5 |
| A-02-05 | BPM change audible within one cycle; `setcpm` only | operability + proxy:static-analysis | handoff smoke-test + `grep` | 02.5 |
| A-02-06 | Live edit takes effect at next cycle boundary (hot-swap) | operability | handoff smoke-test | 02.5 |
| A-02-07 | "■ Silencio" stops all audio; label shows "silencio" | operability | handoff smoke-test | 02.5 |
| A-02-08 | Audio does not auto-start on page load | operability | handoff smoke-test | 02.5 |
| A-02-09 | `rhythmCode()`, `harmonyCode()`, `sessionCode()` produce byte-identical Strudel strings to core codegen | unit | `tests/session.test.ts` | 02.2 |
| A-02-10 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all exit 0 at phase end; no Phase 01 regressions | live-system | command execution | 02.5 |

---

## Tests to add or modify

- `tests/session.test.ts` (new, step 02.2): Vitest tests for the store's pure derivation functions. Runs in Node — no AudioContext, no DOM.
  - `rhythmCode()` with known `RhythmLayer[]` produces the same string as calling `rhythmToStrudel` directly.
  - `harmonyCode()` with known `Chord[]` progression produces the same string as calling `melodyLine` directly.
  - `sessionCode()` with both rhythm and harmony populated produces the same string as calling `buildSession` directly.
  - `setNowPlaying(label, source)` updates the store's `nowPlaying` field correctly (Svelte `get()` read-back).
  - `setBpm(bpm)` (stub in 02.2, state-only) updates the store's `bpm` correctly.
  - `requeueLive()` returns the correct code string for each `nowPlaying.source` value (`rhythm`, `harmony`, `session`, `chord`).

No existing tests are deleted or modified.

---

## Open decisions surfaced

**OD-1 (PILOT-RESOLVED):** Audio validation approach.
- Resolved: **Option A — manual smoke test / operability**. No Playwright, no new devDependency. All audible-behavior Acceptance IDs (A-02-01 through A-02-08) are satisfied by the step 02.5 manual smoke-test record in the handoff.

**OD-2 (PILOT-RESOLVED):** Store abstraction.
- Resolved: **Svelte `writable` store** for `src/state/session.ts`. `state/` is allowed to import Svelte (only `core/**` is framework-agnostic). Components subscribe reactively.

**OD-3 (REQUIRES PILOT RESOLUTION before step 02.2):** `queueForNextCycle` scheduling — 250 ms heuristic vs cycle-boundary callback.
- **Finding (live-doc check):** `@strudel/web@1.0.3` does **NOT** expose a cycle-boundary callback or `onCycleEnd` hook in its public API. The `Cyclist` class in `@strudel/core@1.0.1` (`cyclist.mjs`) has no `onCycleEnd` or equivalent — its internal `createClock` (in `zyklus.mjs`) fires a callback `duration` seconds before each cycle but this is not exported or accessible from `web.mjs`. The `scheduler` object returned by `webaudioScheduler` exposes only: `setPattern`, `start`, `stop`, `pause`, `toggle`, `setCps`, `setCode`, `state`.
- **Conclusion:** The prototype's `~250 ms setTimeout` heuristic (prototype lines 632–643) is the only option available in `@strudel/web@1.0.3`. No cycle-boundary callback exists in the installed package.
- **Recommendation:** Confirm the 250 ms heuristic as the implementation approach. No ADR needed (no real architectural choice — only one option available). If confirmed, proceed directly in step 02.2 without an ADR trigger.
- **Action required:** Pilot to confirm "250 ms heuristic, no ADR" or request further investigation.

**OD-4 (REQUIRES PILOT RESOLUTION before step 02.2):** `initStrudel()` timing — can it be called at module load, or must it be inside the gesture handler?
- **Finding (live-doc check):** `initStrudel()` in `web.mjs` (lines 32–42) calls `initAudioOnFirstClick()` from `superdough.mjs` (lines 76–84). That function registers a `document.addEventListener('click', ...)` listener which calls `initAudio()` on the first click. It does NOT start the AudioContext immediately; it only registers the listener. However:
  - `initStrudel()` also calls `webaudioScheduler()`, which calls `getAudioContext()` (from `superdough.mjs` lines 36–41), which calls `new AudioContext()` immediately — at module load time, before any user gesture.
  - Creating an `AudioContext` before a user gesture puts it in `'suspended'` state in modern browsers (Chrome policy since 2018). `evaluate()` will enqueue patterns but audio won't output until the context is resumed.
  - `initAudioOnFirstClick()` resumes the context on the first click anywhere. This means `initStrudel()` CAN be called at module load — the context will be suspended but audio output will start on the first click, automatically, without requiring a separate "Init audio" step in the UI.
  - HOWEVER: The CLAUDE.md invariant states "Audio starts only after a user gesture." The intent is that audio does NOT start automatically — the user must deliberately click "Init audio." If `initStrudel()` is called at module load, `initAudioOnFirstClick()` resumes the context on any click (e.g., clicking elsewhere before the play button), which could violate the spirit of the invariant.
  - The prototype calls `initStrudel()` at top-level script load (lines 600–603), but the prototype has no Vite/ESM module boundary — this is a script tag. The port MUST defer it.
- **Recommendation:** Call `initStrudel()` only inside the `initAudio()` function that the UI invokes on the "Init audio" button click (Option B — inside gesture handler). This is stricter than strictly required by browser policy but matches the CLAUDE.md invariant faithfully: audio starts only after the deliberate user gesture on the "Init audio" button.
- **Alternative considered:** Call `initStrudel()` at module load (Option A). Because `initAudioOnFirstClick()` hooks into any first click, this would cause the AudioContext to resume on the first click of any kind. This is inconsistent with the phase spec's "Init audio" button pattern and the CLAUDE.md intent.
- **Action required:** Pilot to confirm "inside gesture handler" (Option B, recommended) or override with a documented rationale.

**No other open decisions.** OD-1 and OD-2 are resolved per Pilot direction in the phase prompt. OD-3 and OD-4 require resolution before step 02.2.

---

## Prototype function mapping

### `src/audio/strudel.ts`

| Prototype function | Prototype lines | Port target | Notes |
|---|---|---|---|
| State globals: `strudelReady`, `currentCode`, `queuedCode`, `currentBpm` | 582–585 | Module-scope `let` variables | `sessionStart` (visual ref) and `currentSource` are store concerns; not in audio module |
| `initStrudel({...})` call | 600–603 | `initAudio()` exported function | Deferred to user-gesture handler (OD-4 resolution); sets `audioReady` flag; idempotent |
| `tempoWrap(code)` | 605–608 | Import from `src/core/codegen/strudel.ts` | Already ported in Phase 01; do NOT re-implement |
| `runNow(code, opts)` | 609–631 | `runNow(code, opts?)` | Calls `evaluate(tempoWrap(code, currentBpm))` from `@strudel/web`; fallback to `evaluate(code.trim())`; updates `currentCode`; returns `{ok, error?}` |
| `queueForNextCycle(code, opts)` | 632–643 | `queueForNextCycle(code, opts?)` | 250 ms heuristic (OD-3 confirmed); checks `queuedCode` to avoid stale queues; returns `Promise<{ok}>` |
| `tryLiveTempo()` | 647–651 | Inline inside `setTempo()` | Calls `setcpm(bpm/4)` globally — see API findings below; `setcps` fallback from prototype line 651 MUST be omitted (CLAUDE.md invariant) |
| `setBpm(bpm, opts)` / `setTempo(bpm)` | 653–668 | `setTempo(bpm)` | Updates `currentBpm`, calls `setcpm`, debounces `runNow(currentCode)` at 130 ms; DOM manipulation stripped |
| `hush()` global call | 1507, 2107, 2113 | `hush()` exported function | Calls `hush()` from `@strudel/web`; clears `currentCode` |
| `isPlaying()` | 898 | `isPlaying()` exported function | `audioReady && currentCode !== ''` |

### `src/state/session.ts`

| Prototype function / global | Prototype lines | Port target | Notes |
|---|---|---|---|
| `melState` global | 717 | `HarmonyState` in `SessionState` | `{ root, mode, octave, progression }` — `progression` contains `Chord[]` |
| `chordMode` global | 897 | `SessionState.chordMode` | `'chord' \| 'arp'` |
| Rhythm globals: `rhythmLayers` | 815–819 | `RhythmState.layers: RhythmLayer[]` | Initial default layers defined in step 02.4 |
| `currentBpm` global | 585 | `SessionState.bpm` | Default 120 |
| `currentSource` global | 589 | `SessionState.nowPlaying.source` | Merged with label into `nowPlaying` object |
| `buildSession()` | 1470–1476 | `sessionCode()` in store | Calls `buildSession(layers, progression, chordMode, octave)` from core |
| `setNowPlaying(label, source)` | 1477–1486 | `setNowPlaying(label, source)` store method | DOM manipulation stripped; state-only update to `nowPlaying` field |
| `rhythmToStrudel()` call | 1493–1498 | `rhythmCode()` in store | Calls `rhythmToStrudel(layers)` from core |
| `melodyLine()` call | 1499–1504 | `harmonyCode()` in store | Calls `melodyLine(progression, chordMode, octave)` from core |
| `requeueLive()` | 1307–1315 | `requeueLive()` store method | Reads `nowPlaying.source`, derives code, calls `queueForNextCycle` (step 02.4) |
| Transport handlers (session, rhythm, prog play, hush) | 1487–1507 | `playSession()`, `playGroove()`, `playProgression()`, `hushAll()` | DOM manipulation stripped; call `runNow` / `hush` from audio module |

---

## SessionState TypeScript interfaces

These are the exact interfaces to be defined in `src/state/session.ts`, reconciling kickoff §5 with Phase 01 engine types:

```typescript
// Imported from src/core/theory/chords.ts (Phase 01)
import type { Quality } from '../core/theory/chords.js';

// Imported from src/core/rhythm/layers.ts (Phase 01)
import type { RhythmLayer } from '../core/rhythm/layers.js';

// Imported from src/core/composition/model.ts (Phase 01)
import type { Composition } from '../core/composition/model.js';

/**
 * A single chord in the progression.
 * `pcs` and `label` are computed by codegen (chordPcs, chordLabel) — NOT stored.
 * `gain` defaults to 0.6 (prototype lines 758–763, melodyLine 765–773).
 */
export interface Chord {
  rootPc: number;      // 0–11 (pitch class)
  qual: Quality;       // 'maj' | 'min' | 'dim' | 'aug'
  gain: number;        // 0–1.2; default 0.6
}

export interface HarmonyState {
  root: number;          // pitch class 0–11; default 0 (C)
  mode: string;          // 'major' | 'minor' (or other scale names from SCALE_INTERVALS)
  octave: number;        // default 3
  progression: Chord[];  // ordered list; empty = silent
}

export interface RhythmState {
  layers: RhythmLayer[]; // ordered; empty = silent
}

export interface NowPlaying {
  label: string | null;
  source: 'rhythm' | 'harmony' | 'session' | 'chord' | 'composition' | 'preview' | 'agent' | 'editor' | null;
}

export interface SessionState {
  bpm: number;            // 40–280; default 120
  view: 'rhythm' | 'harmony' | 'composition' | 'session';  // default 'harmony'
  chordMode: 'chord' | 'arp';   // default 'chord'
  harmony: HarmonyState;
  rhythm: RhythmState;
  composition: Composition;     // imported from core/composition/model.ts
  nowPlaying: NowPlaying;
}

/** Default initial state */
export const DEFAULT_SESSION_STATE: SessionState = {
  bpm: 120,
  view: 'harmony',
  chordMode: 'chord',
  harmony: {
    root: 0,
    mode: 'major',
    octave: 3,
    progression: [],
  },
  rhythm: {
    layers: [],
  },
  composition: {
    blocks: [],
    tracks: [],
  },
  nowPlaying: {
    label: null,
    source: null,
  },
};
```

**Reconciliation notes:**
- `HarmonyState.mode` is typed as `string` (not a narrow `Mode` union) to match `melState.mode` in the prototype and the `SCALE_INTERVALS` key type in `src/core/theory/scales.ts`. The Phase 01 `Mode` type is `'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian'` — the store field should accept `Mode` to remain compatible.
- `Chord.gain` is `number` (not `number | null`) in the store interface because the store normalizes `null` to `0.6` on insertion. The core codegen functions already handle `gain | null` at the call site.
- `Composition` is imported from `src/core/composition/model.ts` unchanged.
- `RhythmLayer` is imported from `src/core/rhythm/layers.ts` unchanged.
- `chordMode: 'chord' | 'arp'` matches the prototype global (line 897) and the Phase 01 codegen function signatures.

---

## tempoWrap and code-derivation clarification

**Question:** Does `rhythmCode()` / `harmonyCode()` / `sessionCode()` return pre-wrapped code (including `setcpm(...)` header) or an un-wrapped body?

**Answer:** The store's code-derivation helpers return **un-wrapped bodies** (no `setcpm` header). The audio layer (`runNow`) applies `tempoWrap(code, currentBpm)` before calling `evaluate()`. This matches the prototype's flow exactly:
- Prototype `runNow` calls `evaluate(tempoWrap(code))` (line 613).
- The prototype's `rhythmToStrudel()`, `melodyLine()`, and `buildSession()` return un-wrapped bodies.
- The store's `rhythmCode()`, `harmonyCode()`, `sessionCode()` call the core codegen functions and return the same un-wrapped strings.
- **Double-wrapping is impossible**: the audio layer is the sole caller of `tempoWrap`; the store never calls it.

This means `rhythmCode()`, `harmonyCode()`, `sessionCode()` are byte-identical wrappers around the core codegen calls, testable in Node without `tempoWrap` in the expected output.

---

## Strudel @strudel/web API live-doc check findings

All findings are from direct source inspection of the installed package at `node_modules/.pnpm/@strudel+web@1.0.3_rollup@4.61.1/node_modules/@strudel/web/web.mjs` and its transitive dependencies.

### `initStrudel(options)` — `web.mjs` lines 32–42

```javascript
export function initStrudel(options = {}) {
  initAudioOnFirstClick();           // registers a click listener that resumes AudioContext
  miniAllStrings();
  const { prebake, ...schedulerOptions } = options;
  initDone = (async () => {
    await defaultPrebake();          // loads all Strudel modules into globalThis
    await prebake?.();
  })();
  scheduler = webaudioScheduler(schedulerOptions);  // creates AudioContext immediately
}
```

**Key finding:** `initStrudel()` is a synchronous function that returns `void` — it does NOT return a Promise. Audio readiness depends on `initDone` (a module-level Promise). `evaluate()` awaits `initDone` via `Pattern.prototype.play()` which does `initDone.then(...)`. Calling `initStrudel()` creates an `AudioContext` immediately (via `webaudioScheduler` → `getAudioContext()` → `new AudioContext()`). In browsers, this will be in `'suspended'` state until the first user gesture (which `initAudioOnFirstClick` handles automatically on first click). For the port, calling `initStrudel()` inside the gesture handler avoids the `suspended` state entirely.

**Citation:** `node_modules/.pnpm/@strudel+web@1.0.3_rollup@4.61.1/node_modules/@strudel/web/web.mjs` lines 32–42.

### `evaluate(code, autoplay?)` — `web.mjs` lines 63–66

```javascript
export async function evaluate(code, autoplay = true) {
  const { pattern } = await _evaluate(code);
  autoplay && pattern.play();
}
```

This calls `@strudel/transpiler`'s `_evaluate` to compile the code string, then calls `pattern.play()` which enqueues the pattern on the internal scheduler. The scheduler starts if not already started. `evaluate` is an `async` function and returns a `Promise<void>` (implicit).

**Citation:** `web.mjs` lines 63–66.

### `hush()` — `web.mjs` lines 58–60

```javascript
export function hush() {
  scheduler.stop();
}
```

`hush()` is an **export** from `@strudel/web` (NOT only a global). It stops the scheduler. It is ALSO injected into `globalThis` via `evalScope` when `evaluate()` is called (via `repl.mjs` line 24: `evalScope({ ..., hush, evaluate })`). For the audio module, importing it directly from `@strudel/web` as a named export is the correct approach — no need to rely on the global.

**Citation:** `web.mjs` lines 58–60; `repl.mjs` lines 107–115 for the evalScope injection.

### `setcpm(value)` — `@strudel/core@1.0.1` `repl.mjs` lines 70, 113–114

```javascript
const setCpm = (cpm) => scheduler.setCps(cpm / 60);
// ...
evalScope({
  setCpm,
  setcpm: setCpm,
});
```

`setcpm` is injected into `globalThis` by `evalScope()`, which is called inside `injectPatternMethods()`, which is called inside `evaluate()`. This means `setcpm` is available as a global **only after the first `evaluate()` call**. The prototype's `tryLiveTempo()` (lines 647–651) checks `typeof setcpm === 'function'` before calling it — this guard must be preserved in the port.

**Critical finding:** `setcpm` is NOT a named export of `@strudel/web`. It is only available as `globalThis.setcpm` after the first `evaluate()` call. The audio module must access it as `(globalThis as any).setcpm(bpm/4)` with a type check, matching the prototype's guard. This is not a new import — it is accessed dynamically.

`setcpm(value)` converts to `setCps(value/60)` which calls `scheduler.setCps(cps)` (cyclist.mjs line 99). The `setCps` method updates `this.cps` and resets `num_ticks_since_cps_change = 0`, which causes the scheduler to adjust tempo without restarting. Calling `setcpm` between cycles is safe — it does not restart the scheduler.

**Citation:** `repl.mjs` lines 69–70, 107–115; `cyclist.mjs` lines 99–105.

### Cycle-boundary callback — NOT available in `@strudel/web@1.0.3`

Searched: `cyclist.mjs`, `zyklus.mjs`, `repl.mjs`, `web.mjs`. No `onCycleEnd`, `cycleCallback`, `afterCycle`, or equivalent hook is exposed. The internal `createClock` callback fires slightly before each cycle tick (not after), and is not exposed externally.

The `scheduler` object returned by `webaudioScheduler()` (and stored module-level in `web.mjs`) is not exported — it is inaccessible from outside the module. There is no way to register a cycle-boundary callback without patching the source.

**Conclusion for OD-3:** The 250 ms `setTimeout` heuristic from the prototype (lines 632–643) is the only option. Confirmed.

**Citation:** `web.mjs` lines 29–60; `cyclist.mjs` line 10; `zyklus.mjs` lines 1–49.

### Summary of API access pattern for `src/audio/strudel.ts`

| Symbol | Access method | Confirmed |
|---|---|---|
| `initStrudel` | Named import: `import { initStrudel } from '@strudel/web'` | Yes — exported at `web.mjs` line 44 (`window.initStrudel` is extra; named export exists) |
| `evaluate` | Named import: `import { evaluate } from '@strudel/web'` | Yes — exported at `web.mjs` line 63 |
| `hush` | Named import: `import { hush } from '@strudel/web'` | Yes — exported at `web.mjs` line 58 |
| `setcpm` | `(globalThis as any).setcpm` with `typeof` guard | Only via `globalThis` after first `evaluate()` call |
| `samples` | Named import from `superdough` (re-exported via `@strudel/web`) | Re-exported via `export * from 'superdough'` in `web.mjs` via `@strudel/webaudio/index.mjs` |

---

## Source-of-truth check

This phase consumes outputs from Phase 01's `src/core/**` modules. The consumer (the session store) and the producer (the codegen functions) must agree on shapes.

**Producer:** `src/core/codegen/strudel.ts` (Phase 01, fully implemented).
- `rhythmToStrudel(layers: RhythmLayer[]) → string`
- `melodyLine(progression: ReadonlyArray<{rootPc, qual, gain?>}, chordMode, octave) → string`
- `buildSession(layers, progression, chordMode, octave) → string`
- `tempoWrap(code: string, bpm: number) → string`

**Consumer (planned):** `src/state/session.ts`, methods:
- `rhythmCode()` → calls `rhythmToStrudel(state.rhythm.layers)` — `layers` is `RhythmLayer[]`, exact match.
- `harmonyCode()` → calls `melodyLine(state.harmony.progression, state.chordMode, state.harmony.octave)` — `progression` is `Chord[]` with `{rootPc, qual, gain}`. `melodyLine` accepts `ReadonlyArray<{rootPc, qual, gain?}>`. `Chord.gain` is `number` (non-null in store); codegen accepts `number | null | undefined` (explicit or default 0.6). Shape aligns — `gain: number` satisfies `gain?: number | null`.
- `sessionCode()` → calls `buildSession(state.rhythm.layers, state.harmony.progression, state.chordMode, state.harmony.octave)` — same shape alignment as above.

**Alignment:** Confirmed. No mismatch. The consumer's planned type for `Chord` (`{rootPc, qual, gain: number}`) is a strict subset of the producer's accepted type (`{rootPc, qual, gain?: number | null}`). TypeScript structural typing is satisfied.

---

## New dependencies needed

None. All required packages are already installed:
- `@strudel/web@1.0.3` (pinned) — confirmed sufficient for `initStrudel`, `evaluate`, `hush`.
- `svelte` (pinned from Phase 00) — used for `writable`, `derived`, `get` from `svelte/store`.
- No new runtime or devDependencies required.

The active Register entry ("Exact dependency version pinning") applies. No new deps → no new pinning decision needed.

---

## Environment, CI, build, or deployment changes needed

None. Phase 02 adds files within the existing Vite + Svelte + TypeScript build setup from Phase 00. No new config files, no new CI, no new env vars.

---

## Decisions Register check

**Active entry:** "Exact dependency version pinning" (Phase 00, 2026-06-05).
- Applies: No new runtime dependencies are added in Phase 02. If OD-1 were resolved to Option B (Playwright), `playwright` would need an exact pin — but OD-1 is resolved to Option A (manual smoke test). No conflict.

---

## Project-specific verification tables

Contract Verification and Fixtures-from-backend additions are not applicable — this initiative has no backend.

**Prototype parity (required for every code-porting step):**
- `src/audio/strudel.ts` (step 02.3): cites prototype lines 582–585, 600–603, 605–608, 609–631, 632–643, 647–651, 653–668, 898, 1507. Behavioral fidelity proven via operability (step 02.5 smoke test).
- `src/state/session.ts` (steps 02.2, 02.4): cites prototype lines 717, 897, 815–819, 1307–1315, 1470–1476, 1477–1486, 1487–1507. Behavioral fidelity for pure derivation functions proven via Vitest parity tests (step 02.2); transport wiring proven via operability (step 02.5).

**Flag-off / Reversibility:** Not applicable — Phase 02 introduces new files without feature flags. The prior `src/audio/strudel.ts` and `src/state/session.ts` stubs exported nothing; the new implementations export substantive behavior. Phase 01 core engines are untouched.

---

## Risks specific to this phase

- `setcpm` is accessed as a `globalThis` dynamic property (only available after first `evaluate()` call). The audio module must guard `typeof (globalThis as any).setcpm === 'function'` exactly as the prototype does. Failure to guard risks a `TypeError` on first `setTempo()` call before any pattern plays. This is a known pattern in the prototype (lines 650–651) and is well-understood.
- The Vite dev server transforms `@strudel/web` imports. The `web.mjs` file uses `window.initStrudel = initStrudel` (line 44) — this is a side-effect that runs at module import time. In the Vite build, this may conflict with SSR or server-side rendering. Since Orbifold is a pure client-side app (no SSR), this is not a concern. Confirmed by Phase 00 `pnpm build` passing with 27 modules.

---

## Pilot review

Pilot resolves OD-3 and OD-4 before step 02.2 begins. Approval is recorded by Pilot replying to chat with explicit authorization.

- **OD-3 recommendation:** Confirm 250 ms heuristic (the only available option). No ADR needed.
- **OD-4 recommendation:** Call `initStrudel()` inside the gesture handler (`initAudio()` exported function), not at module load. This matches CLAUDE.md intent and the phase spec's "Init audio" button pattern.
