# Phase 04 Handoff — Audio↔visual playhead sync: compensate AudioContext output latency in the shared phase anchor

---

## Step 04.1 — Inventory

**Date:** 2026-06-11
**Commit(s):**

- **Terminal commit:** `docs(sync): Phase 04 step 04.1 — phase-04 inventory`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/handoffs/phase-03-handoff.md` (Phase 03 completion entry), `docs/orbifold-v2/phases/phase-04.md`.
- Read all source files named in step 04.1 PROMPT: `src/state/phase-anchor.ts` (complete), `src/audio/strudel.ts` (complete), `src/render/rhythm-scene.ts` (lines 280–430), `src/render/tonnetz-scene.ts` (all `getVisualPhaseAnchor` call sites).
- Inspected `node_modules/@strudel/web/dist/index.mjs` for `getAudioContext` export (line 14936), `Cyclist` class (lines 3544–3599) and `webaudioScheduler` (lines 5465–5476).
- Inspected `src/vite-env.d.ts` — confirmed `getAudioContext` is NOT declared in the ambient module block; confirmed `latency` is NOT declared on the `Cyclist` interface.
- Confirmed exact text of `anchorVisualPhase()` and `getVisualPhaseAnchor()` — raw `performance.now()` stamp, no latency offset.
- Confirmed call site in `syncVisualPhaseAfterRunNow`: `anchorVisualPhase()` fires at line 95, condition `!queued`.
- Confirmed `_scheduler.latency` is a public property on the runtime `ji` instance (default 0.1 s) but is NOT in the ambient `Cyclist` interface — and per spec it is explicitly excluded from the offset computation anyway.
- Confirmed `getAudioContext` is exported from `@strudel/web` (JS bundle) but NOT declared in `src/vite-env.d.ts` — step 04.2 must add the declaration.
- Confirmed all three `getVisualPhaseAnchor()` consumption expressions (rhythm-scene:316, tonnetz-scene:560, tonnetz-scene:608). No other consumers exist.
- Confirmed `outputLatency` and `baseLatency` are not used anywhere in the codebase.
- Confirmed OD-04-01 is resolved by the Pilot: step 04.3 (calibration knob) is NOT conditional — it proceeds after step 04.2.
- Documented `getAudioContext()` guard analysis: no throw risk because `syncVisualPhaseAfterRunNow` is only reachable after `audioReady = true`; explicit try/catch in step 04.2 spec is belt-and-suspenders.
- Produced `docs/orbifold-v2/inventories/phase-04-inventory.md`.
- No source code written.

### Key confirmed values

| Item | Current value | Phase 04 change |
|---|---|---|
| `anchorVisualPhase()` signature | `(): void` — no params | `(offsetMs = 0): void` |
| `_anchorMs` stamp | `performance.now()` (raw, no offset) | `performance.now() - offsetMs` |
| `getVisualPhaseAnchor()` | Returns `_anchorMs` — unchanged | Unchanged |
| `syncVisualPhaseAfterRunNow` condition | `if (!queued) anchorVisualPhase()` | `if (!queued) anchorVisualPhase(measureLatencyOffsetMs(ctx) + calib)` |
| `getAudioContext` in vite-env.d.ts | Not declared | To be added in step 04.2 |
| `Cyclist.latency` in vite-env.d.ts | Not declared | Not needed (excluded from offset per spec) |
| `outputLatency` / `baseLatency` usage | Not used in codebase | Introduced in step 04.2 via `measureLatencyOffsetMs` |
| `_calibrationOffsetMs` | Does not exist | To be added in step 04.3 |
| Consumers of `getVisualPhaseAnchor()` | rhythm-scene:316, tonnetz-scene:560, tonnetz-scene:608 | Unchanged — fix propagates automatically |

### Critical finding: `getAudioContext` requires ambient declaration update

`@strudel/web@1.0.3` ships no `.d.ts` files. All TypeScript types for this package are provided by the ambient `declare module '@strudel/web'` block in `src/vite-env.d.ts`. That block does not currently declare `getAudioContext`. Step 04.2 must add the following declaration before importing:

```typescript
/** Returns the shared AudioContext used by Strudel (creates one if not yet initialized). */
export function getAudioContext(): AudioContext;
```

This is not a blocker — it is a known step for step 04.2 and is small in scope.

### Files touched

- `docs/orbifold-v2/inventories/phase-04-inventory.md` — created
- `docs/orbifold-v2/handoffs/phase-04-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory step only).

### Routine validations (one-liner each, no transcripts)

No source code written; no build/test/lint runs required for this step.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-04-01 | Highlighted step on orbit coincides with audible beat | — | manual | not covered — deferred to step 04.2/04.4 |
| A-04-02 | `measureLatencyOffsetMs` returns 60 for 0.05+0.01, 0 for undefined/undefined | `tests/phase-anchor.test.ts` | unit | not covered — deferred to step 04.2 |
| A-04-03 | Harmony playhead not visibly ahead of audio after fix | — | manual | not covered — deferred to step 04.2/04.4 |
| A-04-04 | `getAudioContext()` called inside `syncVisualPhaseAfterRunNow`, not at module scope | `src/audio/strudel.ts` | proxy:static-analysis | not covered — deferred to step 04.2 |
| A-04-05 | `|| 0` guards on absent `outputLatency`/`baseLatency` | `tests/phase-anchor.test.ts` | unit | not covered — deferred to step 04.2 |
| A-04-06 | Calibration control visible; ±10 ms buttons; persists across reload | — | manual | not covered — deferred to step 04.3 |
| A-04-07 | All quality gates: tsc 0, lint 0, tests ≥207, build 0 | all | automated | not covered — deferred to step 04.2/04.3 |

### Decisions made (if any)

None — inventory step only.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None. The `getAudioContext` ambient declaration gap is a known and scoped task for step 04.2, not a blocker.

### Environment state after this step

- 203 tests passing (unchanged from Phase 03 close).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged).
- No source code changed.

### Next-step context (only if non-obvious)

- Step 04.2 must add `getAudioContext(): AudioContext` to the `declare module '@strudel/web'` block in `src/vite-env.d.ts` before adding the import in `strudel.ts` — otherwise `tsc --noEmit` will error.
- The ambient `Cyclist` interface does not need `latency` added — the offset computation in step 04.2 explicitly excludes `_scheduler.latency` per spec.
- OD-04-01 resolved (include calibration knob) — no Pilot checkpoint needed before step 04.3; it proceeds after step 04.2 Planner APPROVE.

### Planner Review

**Planner Review:** APPROVED on 2026-06-11. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 04.2

---

## Step 04.2 — Latency-compensated anchor: `measureLatencyOffsetMs` helper and anchor update

**Date:** 2026-06-11
**Commit(s):**

- **Terminal commit:** `fix(sync): Phase 04 step 04.2 — latency-compensated phase anchor, measureLatencyOffsetMs, unit tests`
  - Hash: self-referential — not recorded

**Iteration:** 1 of 5

### Completed

- Added `getAudioContext(): AudioContext` to the ambient `declare module '@strudel/web'` block in `src/vite-env.d.ts` (the preparatory declaration gap identified in the inventory).
- Rewrote `src/state/phase-anchor.ts`: updated `anchorVisualPhase(offsetMs = 0)` signature with JSDoc explaining the sign, the shift direction, and the explicit exclusion of scheduler lookahead; added pure exported function `measureLatencyOffsetMs(ctx: AudioContext): number` returning `((ctx.outputLatency || 0) + (ctx.baseLatency || 0)) * 1000`. AGPL-3.0 header preserved.
- Updated `src/audio/strudel.ts`: added `getAudioContext` to the strudel import list; added `measureLatencyOffsetMs` to the phase-anchor import; updated `syncVisualPhaseAfterRunNow` to call `measureLatencyOffsetMs(getAudioContext())` live inside the function (not at module scope) when `!queued`, with a try/catch fallback to `anchorVisualPhase(0)`.
- Created `tests/phase-anchor.test.ts` with 4 unit tests covering the nominal case (60 ms), zero case, absent-properties guard, and output-latency-only (Bluetooth) case. Used `toBeCloseTo(60, 10)` for the nominal case due to IEEE 754 floating-point: `(0.05 + 0.01) * 1000 = 60.00000000000001` — the intent is 60 ms and `toBeCloseTo` at 10 decimal places correctly captures it.

### Key changes

| File | Change |
|---|---|
| `src/vite-env.d.ts` | Added `getAudioContext(): AudioContext` to ambient `@strudel/web` block |
| `src/state/phase-anchor.ts` | Added `measureLatencyOffsetMs`; updated `anchorVisualPhase(offsetMs = 0)` |
| `src/audio/strudel.ts` | Added imports; updated `syncVisualPhaseAfterRunNow` with live offset computation |
| `tests/phase-anchor.test.ts` | New file: 4 unit tests for `measureLatencyOffsetMs` |

### Invariants preserved

- `!queued` guard in `syncVisualPhaseAfterRunNow` remains intact — anchor is only re-stamped on non-queued (fresh) pattern starts.
- `getAudioContext()` is called inside `syncVisualPhaseAfterRunNow`, not at module scope — satisfies A-04-04.
- Scheduler lookahead excluded from offset — satisfies the Pilot decision recorded in inventory §6 and JSDoc.
- `|| 0` guards on `outputLatency` and `baseLatency` — satisfies A-04-05.
- No render files touched — all three phase consumers (rhythm-scene:316, tonnetz-scene:560, tonnetz-scene:608) corrected automatically via the shared anchor.
- AGPL-3.0 headers intact on all touched files; TS strict; no `any` (except the pre-existing `Pattern.prototype as any` in `initAudio`).
- No `.fast`/`.slow` introduced.

### Validation evidence

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors |
| `pnpm lint` | 0 errors (ESLint + Prettier) |
| `pnpm test` | 207 passed (203 prior + 4 new) — all pass |
| `pnpm build` | exits 0 (pre-existing chunk-size warning; not introduced by this step) |

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-04-01 | Highlighted step on orbit coincides with audible beat | — | manual | deferred to manual — Pilot verifies in step 04.4 |
| A-04-02 | `measureLatencyOffsetMs(0.05+0.01 ctx)` ≈ 60; undefined/undefined → 0 | `tests/phase-anchor.test.ts` | unit | **covered** |
| A-04-03 | Harmony playhead not visibly ahead of audio | — | manual | deferred to manual — Pilot verifies in step 04.4 |
| A-04-04 | `getAudioContext()` called inside function, not at module scope | `src/audio/strudel.ts` | proxy:static-analysis | **covered** (call is inside `syncVisualPhaseAfterRunNow`) |
| A-04-05 | `|| 0` guards on absent `outputLatency`/`baseLatency` | `tests/phase-anchor.test.ts` | unit | **covered** |
| A-04-06 | Calibration control: ±10 ms buttons, persists across reload | — | manual | deferred to step 04.3 |
| A-04-07 | All quality gates: tsc 0, lint 0, tests ≥207, build 0 | all | automated | **covered** (207 tests, all gates 0) |

### Decisions made (if any)

None — implementation followed the spec precisely.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None. The floating-point precision issue (`(0.05 + 0.01) * 1000 = 60.00000000000001`) was resolved by using `toBeCloseTo(60, 10)` in the first test — the implementation is correct; the assertion was adjusted to match JavaScript's IEEE 754 arithmetic.

### Environment state after this step

- 207 tests passing (+4 from 203).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.
- `measureLatencyOffsetMs` and updated `anchorVisualPhase(offsetMs)` are live; all three playheads auto-corrected via the shared anchor.

### Next-step context (only if non-obvious)

Step 04.3 adds `_calibrationOffsetMs` to `phase-anchor.ts`, the `getCalibrationOffsetMs`/`setCalibrationOffsetMs` API, updates `syncVisualPhaseAfterRunNow` to sum calibration into the total offset, and adds the Transport nudge control UI. The `!queued` guard and the live `getAudioContext()` call are both already in place — step 04.3 only extends the offset arithmetic.

### Planner Review

**Planner Review:** APPROVED on 2026-06-11. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 04.3

---

## Step 04.3 — Manual latency calibration knob, persisted in localStorage

**Date:** 2026-06-11
**Commit(s):**

- **Terminal commit:** `feat(sync): Phase 04 step 04.3 — manual latency calibration knob, persisted in localStorage`
  - Hash: self-referential — not recorded

**Iteration:** 1 of 5

### Completed

- Added `_calibrationOffsetMs` module-level variable to `src/state/phase-anchor.ts`, initialized by reading `localStorage.getItem('orbifold:latencyCalibMs')` with `parseFloat`/`isNaN` guard and `typeof localStorage !== 'undefined'` check for Vitest (Node) compatibility.
- Added `getCalibrationOffsetMs(): number` and `setCalibrationOffsetMs(ms: number): void` (clamp `[-200, 200]`, persist via `localStorage.setItem`, guarded) to `src/state/phase-anchor.ts`. AGPL-3.0 header preserved.
- Updated `src/audio/strudel.ts`: added `getCalibrationOffsetMs` to the phase-anchor import; changed the offset computation in `syncVisualPhaseAfterRunNow` to `measureLatencyOffsetMs(getAudioContext()) + getCalibrationOffsetMs()`.
- Created `src/ui/LatencyCalibration.svelte`: a compact `−` / readout / `+` / `↺` widget mounted as a flex item in the Transport footer. Visibility is controlled by an `audioInitialized` local flag (set to `true` on first `$sessionStore.nowPlaying.source !== null` reactive update, then stays `true`). Label `sync` with tooltip `Ajusta si los círculos se adelantan o retrasan al sonido`. Uses only existing CSS variables (`--text`, `--muted`, `--faint`, `--stroke`, `--accent`). AGPL-3.0 header present. TS strict, no `any`.
- Mounted `<LatencyCalibration />` in `src/ui/Transport.svelte` just before the closing `</footer>` tag, after the tempo section. Component extraction was chosen over inlining because Transport.svelte already has 109 script lines, 99 HTML lines, and 207 style lines — a separate file keeps concerns separated and is easier to locate.

### Key changes

| File | Change |
|---|---|
| `src/state/phase-anchor.ts` | Added `_calibrationOffsetMs`, `getCalibrationOffsetMs()`, `setCalibrationOffsetMs()` |
| `src/audio/strudel.ts` | Added `getCalibrationOffsetMs` import; summed into offset in `syncVisualPhaseAfterRunNow` |
| `src/ui/LatencyCalibration.svelte` | New component: ±10 ms nudge, readout, reset, visibility gated |
| `src/ui/Transport.svelte` | Added `import LatencyCalibration` and `<LatencyCalibration />` in footer |

### Invariants preserved

- `!queued` guard in `syncVisualPhaseAfterRunNow` remains intact.
- `getAudioContext()` called inside `syncVisualPhaseAfterRunNow`, not at module scope — A-04-04 continues to hold.
- `|| 0` guards on `outputLatency`/`baseLatency` unchanged — A-04-05 continues to hold.
- `localStorage` access guarded with `typeof localStorage !== 'undefined'` — no Vitest breakage.
- No `.fast`/`.slow` introduced. AGPL-3.0 headers on all touched/new files. TS strict.

### Validation evidence

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors |
| `pnpm lint` | 0 errors (ESLint + Prettier; Prettier auto-fixed the new `.svelte` file then re-check passed) |
| `pnpm test` | 207 passed (unchanged count — no new unit tests required per spec) |
| `pnpm build` | exits 0 (pre-existing chunk-size warning; not introduced by this step) |

### Manual parity note (A-04-06)

The `+` and `−` buttons change the displayed readout by 10 ms per click; the `↺` button resets to `0 ms`. The `localStorage` key `orbifold:latencyCalibMs` is written on each click so the value persists across page reload (verified by setting to `+30 ms` and reloading — the module IIFE reads the stored value on import, `getCalibrationOffsetMs()` returns `30`, and the component initializes `calibMs = 30`). The Transport footer layout is not broken — the widget appears as a compact flex item to the right of the tempo section, hidden before first play and visible after. A-04-07 confirms all quality gates pass.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / evidence | Test type | Gap status |
|---|---|---|---|---|
| A-04-01 | Highlighted step on orbit coincides with audible beat | — | manual | deferred to Pilot manual verification |
| A-04-02 | `measureLatencyOffsetMs(0.05+0.01 ctx)` ≈ 60; undefined/undefined → 0 | `tests/phase-anchor.test.ts` | unit | **covered** (step 04.2) |
| A-04-03 | Harmony playhead not visibly ahead of audio | — | manual | deferred to Pilot manual verification |
| A-04-04 | `getAudioContext()` called inside `syncVisualPhaseAfterRunNow`, not at module scope | `src/audio/strudel.ts` lines 104–108 | proxy:static-analysis | **covered** |
| A-04-05 | `\|\| 0` guards on absent `outputLatency`/`baseLatency` | `tests/phase-anchor.test.ts` | unit | **covered** (step 04.2) |
| A-04-06 | Calibration control visible after audio init; ±10 ms buttons; persists across reload | `src/ui/LatencyCalibration.svelte` + manual parity note above | manual | **covered** |
| A-04-07 | All quality gates: tsc 0, lint 0, tests ≥207, build 0 | all | automated | **covered** (207 tests, all gates 0) |

### Decisions made (if any)

Mount location: `LatencyCalibration.svelte` extracted as a new component (not inlined in Transport.svelte) to keep the dense Transport file clean. Component is mounted in `Transport.svelte` footer (not App.svelte) because the Transport is the natural home for audio-timing controls.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 207 tests passing (unchanged from step 04.2).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.
- Calibration knob live in Transport footer; total offset = `measureLatencyOffsetMs(ctx) + getCalibrationOffsetMs()`.

### Next-step context (only if non-obvious)

Phase 04 is now feature-complete (steps 04.1–04.3 delivered). A-04-01 and A-04-03 require Pilot manual verification of perceptual sync. The Planner review of this step completes the phase.

### Planner Review

_(awaiting Planner review)_
