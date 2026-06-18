# Phase 04 Inventory — Audio↔visual playhead sync: latency-compensated phase anchor

**Date:** 2026-06-11
**Step:** 04.1 (Inventory)
**Produced by:** Dev (Machine)

---

## 1. Confirmed source: `src/state/phase-anchor.ts`

### Exact text (complete file, 17 lines)

```typescript
// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — shared visual phase anchor for rhythm/harmony playheads.
//
// Prototype: `sessionStart` global reset inside runNow() after evaluate succeeds
// (reference/orbifold.html lines 616, 623). NOT reset on setNowPlaying.

let _anchorMs = performance.now();

/** Milliseconds since epoch used as t=0 for bar-phase playhead math. */
export function getVisualPhaseAnchor(): number {
  return _anchorMs;
}

/** Re-anchor visual phase to now (called when Strudel pattern (re)starts). */
export function anchorVisualPhase(): void {
  _anchorMs = performance.now();
}
```

**Key observation:** `_anchorMs` is stamped with a raw `performance.now()` call. There is no latency offset anywhere in this file. The two exported functions have no parameters. This is the entire module.

---

## 2. Confirmed call site: `src/audio/strudel.ts`

### `syncVisualPhaseAfterRunNow` (lines 92–96)

```typescript
function syncVisualPhaseAfterRunNow(queued: boolean): void {
  // A queued pattern update must not restart the visual playhead: Strudel's
  // Cyclist keeps running and setPattern() does not restart a started clock.
  if (!queued) anchorVisualPhase();
}
```

**Condition:** `anchorVisualPhase()` fires when `queued === false`. It is called at `runNow` line 180 (`syncVisualPhaseAfterRunNow(opts?.queued === true)`) and line 186 (the fallback branch of the same try/catch). `queueForNextCycle` always passes `queued: true`, so the anchor is only re-stamped on a fresh (non-queued) pattern start.

---

## 3. `_scheduler` type and `latency` property accessibility

### Declaration in `strudel.ts` (line 90)

```typescript
let _scheduler: Cyclist | null = null;
```

### `Cyclist` interface (declared in `src/vite-env.d.ts`, lines 39–47)

```typescript
export interface Cyclist {
  setCps(cps: number): void;
  setPattern(pat: unknown, autostart?: boolean): void;
  stop(): void;
  start(): void;
  pause(): void;
  started: boolean;
  cps: number;
}
```

**Critical finding — `latency` is NOT declared on `Cyclist`:** The ambient declaration in `vite-env.d.ts` does not include a `latency` property. The actual runtime class (`ji` at line 3544–3599 of `node_modules/@strudel/web/dist/index.mjs`) does expose `this.latency = s` (where `s = 0.1` by default, set in the constructor at line 3546). However, reading `_scheduler.latency` in TypeScript would be a type error under `strict` mode because the declared interface does not include it.

**Implication for step 04.2:** The phase spec (step 04.2 implementation requirements) explicitly states that `_scheduler.latency` is NOT to be included in the offset computation — the scheduler lookahead shifts events forward on the audio timeline, not the audible output moment. Only `outputLatency + baseLatency` (the hardware path) goes into the offset. **This finding is therefore not a blocker** — the spec already excludes scheduler latency from the computation. No access to `_scheduler.latency` is needed.

---

## 4. `getAudioContext` availability in TypeScript

### Export confirmed in the JS bundle

`node_modules/@strudel/web/dist/index.mjs` line 14936: `ye as getAudioContext`

The function `ye` is defined at line 4875:
```javascript
const wo = () => (Zn = new AudioContext(), Zn), ye = () => Zn || wo();
```

It returns the cached `AudioContext` instance `Zn`, or creates a new one if `Zn` is not yet set.

### TypeScript availability — MISSING FROM AMBIENT DECLARATION

`src/vite-env.d.ts` contains the ambient `declare module '@strudel/web' { ... }` block. This block **does not declare `getAudioContext`**. The package has no `.d.ts` files of its own (only `.js` and `.mjs` in `dist/`).

**Consequence:** A plain `import { getAudioContext } from '@strudel/web'` would cause a TypeScript error under `strict` mode ("Module '@strudel/web' has no exported member 'getAudioContext'"). Step 04.2 must add the declaration to `src/vite-env.d.ts` alongside the import. This is a small addition to the ambient module block — not a new dependency.

**Return type of `getAudioContext()`:** Returns `AudioContext`. The function either returns the cached `Zn` instance (of type `AudioContext`) or creates a new one via `new AudioContext()`. After `initAudio()` completes, `Zn` is guaranteed to be set (by `webaudioScheduler`, which calls `ye().currentTime` at line 5467 in `Ho`), so `getAudioContext()` will return the live instance.

### Guard requirement for step 04.2

Calling `getAudioContext()` before audio initialization does NOT throw — it creates a new `AudioContext` outside a user gesture, which will be suspended by the browser (on Chrome/Firefox, `AudioContext` created outside a gesture starts in `suspended` state). However, the properties `outputLatency` and `baseLatency` are available even on a suspended context and will return `0` or a platform default. The real risk is side-effect: creating a premature `AudioContext` that replaces the intended one.

The spec's stated guard — `catch (error) → anchorVisualPhase(0)` — is sufficient because `syncVisualPhaseAfterRunNow` is only called after `evaluate()` succeeds inside `runNow()`, and `runNow()` has an early return if `!audioReady`. Therefore `getAudioContext()` inside `syncVisualPhaseAfterRunNow` will only execute after `initAudio()` has completed and `audioReady = true`. This is an effective implicit guard. The explicit try/catch is still appropriate as belt-and-suspenders.

---

## 5. All call sites of `getVisualPhaseAnchor()` in render code

### Call sites (confirmed by `grep -rn "getVisualPhaseAnchor" src/`)

| File | Line | Usage |
|---|---|---|
| `src/render/rhythm-scene.ts` | 20 | Import |
| `src/render/rhythm-scene.ts` | 316 | `const phase = ((now - getVisualPhaseAnchor()) % barMs) / barMs;` |
| `src/render/tonnetz-scene.ts` | 27 | Import |
| `src/render/tonnetz-scene.ts` | 560 | `const phase = ((now - getVisualPhaseAnchor()) % barMs) / barMs;` |
| `src/render/tonnetz-scene.ts` | 608 | `activeIdx = Math.floor((now - getVisualPhaseAnchor()) / barMs) % prog.length;` |
| `src/state/phase-anchor.ts` | 10 | Declaration (`export function getVisualPhaseAnchor()`) |

**Consumers: exactly two render files.**

- `src/render/rhythm-scene.ts:316` — rhythm playhead (the spoke + step highlight on the orbit). Phase used for both the radial/linear spoke angle/position and the highlighted step index (`curStep = Math.floor(phase * RSTEPS) % RSTEPS`).
- `src/render/tonnetz-scene.ts:560` — harmony phase (the within-bar phase, 0..1, used for the bar-phase playhead in harmony view).
- `src/render/tonnetz-scene.ts:608` — harmony active chord index (`Math.floor((now - anchor) / barMs) % prog.length`). This is an absolute cycle count, not a within-bar phase.

**Conclusion:** There are exactly **three consumption expressions** across two files. A correction to `_anchorMs` in `phase-anchor.ts` automatically fixes all three. No render files need to be touched in step 04.2.

No composition-scene file exists (composition view uses the same harmony/session tick). Confirmed no other files import `getVisualPhaseAnchor`.

---

## 6. `AudioContext.outputLatency` and `AudioContext.baseLatency`

Neither property is used anywhere in the current codebase (confirmed: `grep -rn "outputLatency\|baseLatency" src/ tests/` → no results).

### Property semantics (per Web Audio spec)

- **`outputLatency`** (seconds): Time between the browser scheduling audio output and that audio being audible through speakers/headphones. Device-dependent; typically 20–200 ms on Bluetooth, 1–30 ms on wired/USB. May be `undefined` on some platforms (notably some versions of Safari). The fix must guard with `|| 0`.
- **`baseLatency`** (seconds): Time for the browser to move audio from the output buffer to the audio hardware. Typically ≈ 5–15 ms. More consistently available than `outputLatency`. Also guarded with `|| 0`.

### Relationship to `_scheduler.latency`

The scheduler's `latency` property (default `0.1` = 100 ms) is a lookahead: events are scheduled 100 ms ahead of when they're "supposed" to occur on the audio timeline. This keeps scheduling out of the real-time audio thread. **This is NOT part of the human-audible output delay** — it shifts everything forward uniformly on the audio clock. Including it in the visual offset would over-compensate by ~100 ms (making visuals lag the audio by ~100 ms instead of correcting the sync). Per step 04.2 spec, exclude it.

---

## 7. Open Decision OD-04-01 — Calibration knob (step 04.3)

**Resolved by the Pilot before this inventory step was written.** Per the phase file step 04.3, first line: "**OD-04-01 has been resolved by the Pilot: include the calibration knob in Phase 04.** This step is NOT conditional — proceed after 04.2 is Planner-approved."

**Decision: INCLUDE step 04.3 in Phase 04.** Step 04.3 implements the manual ±10 ms nudge control stored in `localStorage`.

For completeness, both options are documented below:

| Option | Rationale | Outcome |
|---|---|---|
| **Include (chosen)** | Automatic hardware latency compensation may leave a residual desync (e.g., Bluetooth adds a variable per-device extra delay not captured by `outputLatency`); the manual knob gives the user a fine-tune path without a code change | Step 04.3 proceeds |
| Defer to future phase | Automatic compensation alone (`outputLatency + baseLatency`) may be sufficient on common configurations (wired, USB audio); avoids UI complexity | Step 04.3 skipped; A-04-06 permanently deferred |

A-04-06 is **not deferred** — it will be covered by step 04.3.

---

## 8. Files to be touched per step

### Step 04.2 — Latency-compensated anchor

| File | Change |
|---|---|
| `src/state/phase-anchor.ts` | Add `measureLatencyOffsetMs(ctx: AudioContext): number`; update `anchorVisualPhase(offsetMs = 0)` signature |
| `src/audio/strudel.ts` | Import `getAudioContext`; update `syncVisualPhaseAfterRunNow` to compute and pass offset |
| `src/vite-env.d.ts` | Add `getAudioContext()` to the ambient `declare module '@strudel/web'` block |
| `tests/phase-anchor.test.ts` | New file: 4 unit tests for `measureLatencyOffsetMs` |

### Step 04.3 — Manual calibration knob

| File | Change |
|---|---|
| `src/state/phase-anchor.ts` | Add `_calibrationOffsetMs`, `getCalibrationOffsetMs()`, `setCalibrationOffsetMs(ms)` |
| `src/audio/strudel.ts` | Sum `getCalibrationOffsetMs()` into the offset in `syncVisualPhaseAfterRunNow` |
| `src/ui/Transport.svelte` (or new `src/ui/LatencyCalibration.svelte`) | Add nudge control (`−`, `+`, `↺` buttons, ms readout) |
| `src/app/App.svelte` (possibly) | Mount calibration component if extracted |

---

## 9. Behavior to preserve

- `anchorVisualPhase()` is only called when `!queued` in `syncVisualPhaseAfterRunNow` — this guard prevents restarting the visual clock on queued (next-cycle) pattern updates. This guard must remain intact.
- All three phase consumers (`rhythm-scene:316`, `tonnetz-scene:560`, `tonnetz-scene:608`) must continue reading `_anchorMs` via `getVisualPhaseAnchor()` — no render changes.
- AGPL-3.0 headers on all touched files.
- TS strict, no `any`.
- `pnpm test` 203 passing baseline; ≥207 after step 04.2 (4 new tests).

---

## 10. New behavior to introduce

- `measureLatencyOffsetMs(ctx: AudioContext): number` — pure function, hardware path only: `((ctx.outputLatency || 0) + (ctx.baseLatency || 0)) * 1000`. Unit-tested.
- `anchorVisualPhase(offsetMs = 0)` — anchor shifted by `offsetMs` ms into the past: `_anchorMs = performance.now() - offsetMs`. This causes `performance.now() - _anchorMs` to be larger by `offsetMs`, making the visual phase appear `offsetMs` ms further along — matching the delayed audio output.
- `getAudioContext()` called live inside `syncVisualPhaseAfterRunNow` (not cached) so device changes are reflected.
- (Step 04.3) `_calibrationOffsetMs` read from `localStorage`, summed with hardware offset.

---

## 11. Tests to add or modify

| File | Tests | For |
|---|---|---|
| `tests/phase-anchor.test.ts` (new) | 4 new unit tests | `measureLatencyOffsetMs`: nominal, zero, absent properties, output-only |

No modifications to existing test files required for step 04.2.

---

## 12. No ADR trigger

This phase applies a well-understood Web Audio API pattern (output latency compensation via `AudioContext.outputLatency + baseLatency`) to an existing single module. No architectural decision is reversed, contested, or newly introduced. No ADR is needed.

---

## 13. Environment, CI, build changes needed

None. No new npm dependencies. `vite-env.d.ts` addition is a type-only ambient declaration change, invisible to the build output.

---

## 14. Project-specific verifications (CLAUDE.md)

- TS strict compliance required throughout.
- AGPL-3.0 header on all new/touched files.
- No `.fast`/`.slow` usage introduced (not applicable to this phase).
- Engines in `src/core/**` have no DOM/PIXI/Svelte imports — `phase-anchor.ts` is in `src/state/`, not `src/core/`, so DOM-free constraint applies but is already met. `measureLatencyOffsetMs` takes an `AudioContext` argument (DOM type) — this is acceptable in `src/state/` (not `src/core/**`).
- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build` all required to exit clean.
