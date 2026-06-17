# Planner Review — Phase 04 Step 04.2 — Iteration 1

**Date:** 2026-06-11
**Step:** 04.2 — Latency-compensated phase anchor, `measureLatencyOffsetMs`, unit tests
**Verdict:** APPROVE

---

## Pilot Review Checklist

### 1. Commit scope clean

Files touched: `src/vite-env.d.ts`, `src/state/phase-anchor.ts`, `src/audio/strudel.ts`, `tests/phase-anchor.test.ts`. Matches exactly the four files listed in the phase-04 inventory §8 for step 04.2. Render files (`src/render/rhythm-scene.ts`, `src/render/tonnetz-scene.ts`) confirmed untouched — grep for `measureLatencyOffsetMs` and updated `anchorVisualPhase` in `src/render/` returns no matches. PASS.

### 2. Commit message format

`fix(sync): Phase 04 step 04.2 — latency-compensated phase anchor, measureLatencyOffsetMs, unit tests` — type `fix`, scope `sync`, phase and step prefix, description present. PASS.

### 3. Acceptance Coverage Table present and complete

All 7 A-04-xx IDs are present in the table:
- A-04-02, A-04-04, A-04-05, A-04-07 — marked **covered** with correct test file and test type references.
- A-04-01, A-04-03 — correctly deferred to step 04.4 manual verification (no code can prove this without running the app).
- A-04-06 — correctly deferred to step 04.3 (calibration UI not yet built).

No ID is missing, hand-waved, or mapped to an irrelevant test. PASS.

### 4. Tests relevant, not just green

`tests/phase-anchor.test.ts` contains 4 tests that directly exercise the formula logic and the `|| 0` guards for all stated cases:
- Nominal (0.05 + 0.01 → 60 ms): exercises the sum and ms conversion.
- Zero (0 + 0 → 0): exercises the zero path.
- Absent properties (undefined/undefined → 0): directly exercises both `|| 0` guards — the core of A-04-05.
- Bluetooth (0.1 + 0 → 100): exercises output-latency-only path.

`proxy:static-analysis` use for A-04-04 is disclosed in the table and citable: `getAudioContext()` is called at line 104 of `src/audio/strudel.ts`, inside `syncVisualPhaseAfterRunNow`, not at module scope. PASS.

The `toBeCloseTo(60, 10)` choice for the nominal test is a correct engineering judgment: `(0.05 + 0.01) * 1000 = 60.00000000000001` in IEEE 754 double precision; `toBeCloseTo` at 10 decimal places captures the intent without a false failure. PASS.

### 5. Live-system / manual evidence

A-04-01 and A-04-03 are deferred to step 04.4 (manual Pilot verification). This is correct — audio↔visual sync cannot be mechanically verified by a unit test. No claim of `live-system` or `manual` evidence is made in this step's table that cannot be substantiated. PASS.

### 6. Register respected

The Decisions Register (`docs/orbifold-v2/decisions.md`) has no active entries. No vigent rules violated. No new conflicts introduced. PASS.

### 7. Reversibility intact

- 203 prior tests continue to pass (207 total = 203 prior + 4 new). No regressions reported.
- `anchorVisualPhase(offsetMs = 0)` default parameter: callers that previously called `anchorVisualPhase()` with no arguments continue to work identically — `offsetMs` defaults to `0`, so `_anchorMs = performance.now() - 0 = performance.now()`, same as before.
- The try/catch fallback in `syncVisualPhaseAfterRunNow` ensures that any error from `getAudioContext()` falls back to `anchorVisualPhase(0)`, restoring pre-step behavior.
- No feature flag is introduced; the latency compensation is always active when `!queued`. This is correct: the compensation is a bug-fix, not an opt-in feature, and there is no pre-existing behavior to preserve beyond zero-latency anchoring (which is the `catch` fallback). PASS.

### 8. No unauthorized dependencies or CI changes

No new npm packages added. No changes to `package.json`, `vite.config.ts`, `.github/`, or any CI config file. The `vite-env.d.ts` change is a type-only ambient declaration addition — invisible to the build output. PASS.

---

## Project-specific checklist (CLAUDE.md)

### `measureLatencyOffsetMs` signature and formula

Takes exactly ONE argument `ctx: AudioContext` — no scheduler latency parameter (correct per Pilot decision, inventory §3/§6, and phase spec §04.2 rationale). Formula confirmed at `src/state/phase-anchor.ts` line 53:

```
((ctx.outputLatency || 0) + (ctx.baseLatency || 0)) * 1000
```

Both `|| 0` guards are present. A-04-05 PASS.

### `anchorVisualPhase(offsetMs = 0)` sign

Implementation at line 34: `_anchorMs = performance.now() - offsetMs`. Sign is correct: subtracting `offsetMs` moves the anchor into the past, which makes `performance.now() - _anchorMs` larger, causing the computed phase to appear further along — visual lags to meet the delayed audio. The JSDoc in the file includes the sign-check derivation confirming correctness. PASS.

### `syncVisualPhaseAfterRunNow` — A-04-04

`getAudioContext()` is called at line 104, inside the function body, under the `if (!queued)` branch. It is not called at module scope or stored in a module-level variable. The `!queued` guard at line 96 is intact. The try/catch with `anchorVisualPhase(0)` fallback is present at lines 106-108. All three sub-requirements of A-04-04 satisfied. PASS.

### Unit test count

4 tests in `tests/phase-anchor.test.ts`. Total 207 (203 + 4 ≥ 207). A-04-07 PASS.

### Quality gates

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors |
| `pnpm lint` | 0 errors |
| `pnpm test` | 207 passed |
| `pnpm build` | exits 0 |

A-04-07 PASS.

### AGPL-3.0 headers

Present on all 4 touched/created files:
- `src/vite-env.d.ts` line 1: `// SPDX-License-Identifier: AGPL-3.0-only`
- `src/state/phase-anchor.ts` line 1: `// SPDX-License-Identifier: AGPL-3.0-only`
- `src/audio/strudel.ts` line 1: `// SPDX-License-Identifier: AGPL-3.0-only`
- `tests/phase-anchor.test.ts` line 1: `// SPDX-License-Identifier: AGPL-3.0-only`

PASS.

### TS strict / no `any`

No new `any` introduced. The pre-existing `Pattern.prototype as any` in `initAudio()` is unchanged and was already reviewed. `measureLatencyOffsetMs` takes `AudioContext` (DOM type, acceptable in `src/state/` per inventory §14). PASS.

### Prototype parity

Not applicable to this step — no prototype logic is being ported. This is a new bug-fix applying a Web Audio API pattern. PASS (N/A).

### No `.fast`/`.slow` introduced

Confirmed. PASS.

---

## Summary

All 8 base checklist items pass. All project-specific items pass. The implementation matches the phase spec exactly: one-argument `measureLatencyOffsetMs`, correct sign in `anchorVisualPhase`, live `getAudioContext()` call inside the function, `|| 0` guards, 4 unit tests covering all required cases, all quality gates clean, AGPL headers intact, render files untouched.

**Planner Review:** APPROVED on 2026-06-11. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 04.3
