# Phase 04 — Audio↔visual playhead sync: compensate AudioContext output latency in the shared phase anchor

**Purpose:** Eliminate the audio-leads-visual desync by shifting the shared phase anchor forward by the AudioContext's measured output latency and the Strudel scheduler's lookahead, so that every playhead (rhythm, harmony, composition) lights up when the beat is audible rather than before it.
**Gate:** orbifold-v2 Phase 03 complete and Pilot-approved on the `orbifold-v2/phase-03` branch (all eleven A-03-xx criteria covered, 203 tests passing, `tsc --noEmit` / `pnpm lint` / `pnpm build` all exit 0); Pilot has created `orbifold-v2/phase-04` from the Phase 03 branch.
**Expected phase result:** The rhythm circle highlights exactly when the corresponding beat is heard; harmony and composition playheads (which share the same anchor) are identically corrected; the latency offset is computed once from `AudioContext.outputLatency + AudioContext.baseLatency` plus `_scheduler.latency` and stored in a single place; the offset is read live on each use so Bluetooth or device changes are reflected; an optional user-adjustable calibration offset (stored in `localStorage`) is available as a fine-tune knob; a pure unit test verifies the offset math; all quality gates pass.

---

## Step 04.1 — Inventory

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, the Phase 03 completion entry in `docs/orbifold-v2/handoffs/phase-03-handoff.md`, and `docs/orbifold-v2/phases/phase-04.md` (this file). Then read the following source files in full: `src/state/phase-anchor.ts`, `src/audio/strudel.ts`, `src/render/rhythm-scene.ts` (lines 280–430 — the playhead section), and `src/render/tonnetz-scene.ts` (search for all calls to `getVisualPhaseAnchor`). Produce `docs/orbifold-v2/inventories/phase-04-inventory.md`. Do not write source code.

Implementation requirements:
- Confirm the exact text of `anchorVisualPhase()` and `getVisualPhaseAnchor()` in `src/state/phase-anchor.ts`. Note that `_anchorMs` is stamped with a raw `performance.now()` — there is no latency offset anywhere in the file.
- Confirm the call site in `src/audio/strudel.ts` (the `syncVisualPhaseAfterRunNow` function): identify the exact line where `anchorVisualPhase()` is called and the condition under which it fires (`!queued`).
- Confirm the `_scheduler` variable in `src/audio/strudel.ts`: it is of type `Cyclist | null`, created by `webaudioScheduler()`. Note that `Cyclist` (class `ji` in `node_modules/@strudel/web/dist/index.mjs`) stores a `latency` property (set to `0.1` seconds by default in `webaudioScheduler`'s constructor call). Confirm whether `_scheduler.latency` is accessible at module level in `src/audio/strudel.ts` (it is a public property on the instance).
- Confirm that `getAudioContext` is exported from `@strudel/web` (it is — visible as `ye` at line 5540 of `index.mjs`, re-exported as `getAudioContext` at line 14936). Note the return type: it returns an `AudioContext` (or creates one via `new AudioContext()`).
- Confirm both call sites of `getVisualPhaseAnchor()` in render code: `src/render/rhythm-scene.ts` (line ~316) and `src/render/tonnetz-scene.ts` (lines ~560 and ~608). Confirm that both files read `_anchorMs` via the getter and compute phase as `((performance.now() - getVisualPhaseAnchor()) % barMs) / barMs`. These are the only two consumers — any fix to the anchor value automatically corrects all three playheads (rhythm, harmony, composition).
- Note the two properties on `AudioContext` relevant to this fix: `outputLatency` (time in seconds between audio being sent and heard through speakers — device-dependent, can be 0 on some platforms) and `baseLatency` (time in seconds for the browser to move audio from the output buffer to the audio hardware — typically ≈ 5–15 ms). Both are defined in the Web Audio spec; `outputLatency` may be absent on some browsers — the fix must guard with `|| 0`. Neither property is used anywhere in the current codebase.
- Surface one open decision for Pilot review: **OD-04-01** — Should the manual calibration step (step 04.3) be implemented in Phase 04, or deferred to a future phase? The Pilot instruction says to flag this explicitly. The default is to include it; if the automatic compensation alone is sufficient, step 04.3 can be skipped. Document both options in the inventory.
- Do not surface an ADR trigger. This is a bug-fix applying a well-understood Web Audio API pattern to an existing module. No architectural decision is being reversed or contested. (If the inventory reveals an unexpected constraint — e.g., `getAudioContext` is unavailable before `initAudio()` completes — surface it as a blocker instead.)

Validation:
- No source code written.

Expected result:
- `docs/orbifold-v2/inventories/phase-04-inventory.md` present and complete.
- OD-04-01 surfaced for Pilot decision before step 04.3.

CHECKPOINT → Commit message:
`docs(sync): Phase 04 step 04.1 — phase-04 inventory`

---

## Step 04.2 — Latency-compensated anchor: `measureLatencyOffsetMs` helper and anchor update

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-04-inventory.md`, `src/state/phase-anchor.ts` (complete), and `src/audio/strudel.ts` (complete). Implement the latency-compensation fix in two coordinated changes: (1) a pure helper function `measureLatencyOffsetMs` in `src/state/phase-anchor.ts`, and (2) an update to `anchorVisualPhase()` and `getVisualPhaseAnchor()` so the stored anchor is pre-shifted forward by the measured offset. Add a unit test for the offset math. Do not touch render files.

Implementation requirements:

**`src/state/phase-anchor.ts` — add `measureLatencyOffsetMs` and update the anchor API:**
- Add a new exported pure function `measureLatencyOffsetMs(ctx: AudioContext): number` that returns the hardware audible-output offset in milliseconds: `((ctx.outputLatency || 0) + (ctx.baseLatency || 0)) * 1000`. **Do NOT include `scheduler.latency`** — the scheduler lookahead shifts events forward on the audio timeline but the pattern itself starts at the anchor moment; including it would over-compensate by ~100 ms and invert the bug. The automatic offset covers only the hardware path (DAC + driver). The manual calibration knob (step 04.3) is the fine-tune for any residual error. This is a pure function with no side effects — takes only the values it needs, returns a number. It belongs in `src/state/phase-anchor.ts` because that module is the single source of truth for phase timing.
- Update `anchorVisualPhase()` to accept an optional `offsetMs: number` parameter (default `0`): `export function anchorVisualPhase(offsetMs = 0): void { _anchorMs = performance.now() - offsetMs; }`. Subtracting `offsetMs` from the anchor shifts the anchor into the past, which makes `performance.now() - _anchorMs` larger, causing the computed phase to appear later — matching the delayed audio. The sign is: anchor earlier → phase appears further along → visual lags to meet the audio. Verify the sign is correct: if `offsetMs = 100` (audio heard 100 ms after scheduling), the anchor is set 100 ms in the past, so after 100 ms the visual phase matches where a zero-latency anchor would be after 0 ms. Correct.
- `getVisualPhaseAnchor()` is unchanged — it returns `_anchorMs`.
- AGPL-3.0 header must remain intact. TS strict: no `any`.

**`src/audio/strudel.ts` — pass the measured offset when anchoring:**
- Import `getAudioContext` from `@strudel/web` (alongside the existing imports). Confirm the import is valid in the codebase's TypeScript setup before adding it.
- Update `syncVisualPhaseAfterRunNow` to compute and pass the offset: when `!queued`, call `measureLatencyOffsetMs(getAudioContext())` (no scheduler arg — see step 04.2 rationale) and pass the result to `anchorVisualPhase(offsetMs)`. Read `getAudioContext()` live each time (not cached) — the returned `AudioContext` instance is stable after init, but `outputLatency` and `baseLatency` on it can change (e.g., on device switch). The call must be guarded: if `getAudioContext()` would throw before audio is initialized, catch the error and fall back to `anchorVisualPhase(0)` (zero offset = current behavior). Do not cache the AudioContext as a module-level variable — call `getAudioContext()` inside `syncVisualPhaseAfterRunNow`.
- AGPL-3.0 header must remain intact. TS strict: no `any`.

**`tests/phase-anchor.test.ts` — unit test for the offset math:**
- Create `tests/phase-anchor.test.ts` with tests for `measureLatencyOffsetMs` (single-argument, hardware path only):
  - `measureLatencyOffsetMs({ outputLatency: 0.05, baseLatency: 0.01 } as AudioContext)` → `60` (ms).
  - `measureLatencyOffsetMs({ outputLatency: 0, baseLatency: 0 } as AudioContext)` → `0` (zero hardware latency).
  - `measureLatencyOffsetMs({ outputLatency: undefined as unknown as number, baseLatency: undefined as unknown as number } as AudioContext)` → `0` (guards `|| 0` on absent properties).
  - `measureLatencyOffsetMs({ outputLatency: 0.1, baseLatency: 0 } as AudioContext)` → `100` (output-latency only, e.g. Bluetooth).
- These tests exercise the pure math and the `|| 0` guard without any DOM or audio initialization.
- AGPL-3.0 header on the test file.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all prior tests pass; new tests pass; count ≥ 207 (203 prior + 4 new).
- `pnpm build` — exits 0.

Expected result:
- `measureLatencyOffsetMs` is a pure, unit-tested function.
- `anchorVisualPhase(offsetMs)` shifts the stored anchor backward by `offsetMs` milliseconds.
- When a new pattern starts, the anchor is pre-shifted by `(outputLatency + baseLatency) * 1000` ms (hardware path only; scheduler lookahead excluded per Pilot decision), so visuals delay to match audible output.
- All three playheads (rhythm, harmony, composition) are corrected automatically via the shared anchor.

CHECKPOINT → Commit message:
`fix(sync): Phase 04 step 04.2 — latency-compensated phase anchor, measureLatencyOffsetMs, unit tests`

---

## Step 04.3 — Manual calibration offset (fine-tune knob, persisted in localStorage)

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-04-inventory.md`, `src/state/phase-anchor.ts` (post-step-04.2), `src/audio/strudel.ts` (post-step-04.2), and `src/app/app.css` (transport section — identify a suitable home for the calibration control). Add a small UI control that lets the user nudge the total latency offset by ±N milliseconds, persisted in `localStorage`. **OD-04-01 has been resolved by the Pilot: include the calibration knob in Phase 04.** This step is NOT conditional — proceed after 04.2 is Planner-approved.

Implementation requirements:

**`src/state/phase-anchor.ts` — calibration offset store:**
- Add a module-level variable `_calibrationOffsetMs: number` initialized by reading `localStorage.getItem('orbifold:latencyCalibMs')` (parsed as float, defaulting to `0` if absent or NaN).
- Add two exported functions: `getCalibrationOffsetMs(): number` returning `_calibrationOffsetMs`, and `setCalibrationOffsetMs(ms: number): void` that clamps `ms` to `[-200, 200]`, stores it in `_calibrationOffsetMs`, and persists it via `localStorage.setItem('orbifold:latencyCalibMs', String(ms))`.
- `localStorage` access must be guarded with a `typeof localStorage !== 'undefined'` check so the module remains importable in Vitest (Node environment).
- Update `syncVisualPhaseAfterRunNow` in `src/audio/strudel.ts`: add `getCalibrationOffsetMs()` to the total offset passed to `anchorVisualPhase`. Total offset = `measureLatencyOffsetMs(ctx) + getCalibrationOffsetMs()`.
- AGPL-3.0 header intact; TS strict.

**UI control in `src/ui/Transport.svelte` (or a new `LatencyCalibration.svelte` if Transport.svelte is already dense):**
- A small "sync" nudge control: two buttons (`−` and `+`) stepping ±10 ms each, with a readout displaying the current calibration value in ms (e.g., `+30 ms` or `0 ms`). A reset button labeled `↺` returns to `0`.
- The control is visible only when audio is playing or has been initialized (hide it behind `audioReady` or an equivalent flag), to avoid confusing users before first interaction.
- Label the control clearly: `sync` or `latency` (consistent with the app's tonal language). Tooltip: `Adjust if circles light up before or after the beat`.
- Style: compact, using existing CSS variables from `app.css`. Does not introduce any new dependency.
- AGPL-3.0 header on any new file; TS strict.

**No new unit tests required for this step.** The calibration offset math is trivially a clamped number; the `localStorage` persistence is not unit-testable in Vitest without a mock. The Planner will verify the UI control exists and the readout matches the stored value during manual review.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all prior tests pass (no regressions); count unchanged or higher.
- `pnpm build` — exits 0.
- Manual note required in handoff: confirm the `+` / `−` buttons change the displayed value, the value persists after page reload, and the transport is not visually broken.

Expected result:
- A nudge control is visible in the Transport when audio is initialized.
- Clicking `+` increments the calibration offset by 10 ms (up to +200 ms); `−` decrements (down to −200 ms); `↺` resets to 0.
- The persisted value is reloaded on page refresh.
- The calibration offset is summed with the automatic latency compensation in `syncVisualPhaseAfterRunNow`.

CHECKPOINT → Commit message:
`feat(sync): Phase 04 step 04.3 — manual latency calibration knob, persisted in localStorage`

---

## Phase Acceptance

Each criterion has a unique ID used in handoff Acceptance Coverage Tables:

- **A-04-01** — When playing a rhythm pattern, the highlighted step on the orbit (the lit circle) coincides with the audible beat — the visual does not lead the audio by a perceptible margin. (Perceptual test: Pilot listens and confirms.)
  - Validation method: `manual`

- **A-04-02** — `measureLatencyOffsetMs({ outputLatency: 0.05, baseLatency: 0.01 } as AudioContext)` returns `60`; `measureLatencyOffsetMs({ outputLatency: undefined as unknown as number, baseLatency: undefined as unknown as number } as AudioContext)` returns `0` (guards `|| 0` on absent properties). (Unit tests in `tests/phase-anchor.test.ts`.)
  - Validation method: `unit`

- **A-04-03** — The harmony playhead (Tonnetz chord highlight / progression position) is not visibly ahead of the audio after the fix. (Regression check: the harmony view's `getVisualPhaseAnchor()` call is unmodified — correction is automatic via the shared anchor. Pilot confirms no regression.)
  - Validation method: `manual`

- **A-04-04** — The latency offset is NOT read once at startup and cached as a constant; `getAudioContext().outputLatency` and `getAudioContext().baseLatency` are read live each time `syncVisualPhaseAfterRunNow` fires (i.e., each time a new pattern starts, the fresh values are used). (Code-review check: Planner confirms `getAudioContext()` is called inside `syncVisualPhaseAfterRunNow`, not at module load or in a cached variable.)
  - Validation method: `unit` (proxy:static-analysis — Planner reads `src/audio/strudel.ts` and confirms the call is inside the function, not at module scope)

- **A-04-05** — If `outputLatency` or `baseLatency` is absent (`undefined`) on the platform's `AudioContext`, the offset gracefully falls back to `0` for those terms (i.e., `|| 0` guards are applied). Unit test covers this.
  - Validation method: `unit`

- **A-04-06** — (Conditional — only if step 04.3 is executed.) A latency calibration control is visible in the Transport after audio initialization; `+` and `−` buttons adjust the offset in 10 ms increments; the value is displayed and persists across page reload; the control has a tooltip or label explaining its purpose.
  - Validation method: `manual`

- **A-04-07** — All quality gates pass: `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` all pass with count ≥ 207 (203 prior + 4 new unit tests), `pnpm build` exits 0.
  - Validation method: `automated`

---

## Partial coverage from prior phase

Phase 03 step 03.4 closed all eleven A-03-xx criteria as `covered`. No partials or deferred entries to carry forward from Phase 03.

No prior partials to address.

---

## ADR Triggers

No new ADR is required for this phase. Latency compensation via `AudioContext.outputLatency + baseLatency + scheduler.latency` is a well-understood Web Audio API pattern applied to a single existing module (`src/state/phase-anchor.ts`). No architectural decision is being reversed and no new dependency or build system change is introduced.

If the inventory step (04.1) reveals that `getAudioContext()` is not safely callable from `src/audio/strudel.ts` (e.g., because `@strudel/web`'s TypeScript types do not export it, or because it throws before `initAudio()` completes), the Dev must file a blocker rather than silently working around it.

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v2/handoffs/phase-04-handoff.md`. See `handoff-template.md`.

**Note on step 04.3:** This step is conditional on OD-04-01 resolution. The handoff for step 04.1 must record the Pilot's decision. If the Pilot resolves OD-04-01 as "defer," the Dev appends a note in the phase-04 completion entry explaining that step 04.3 was intentionally skipped and A-04-06 is permanently deferred (reason: automatic compensation alone was accepted as sufficient).
