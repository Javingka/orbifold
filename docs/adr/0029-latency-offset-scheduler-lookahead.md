<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0029 — Corrected `Cyclist.latency` semantics; fold scheduler lookahead into the auto-measured latency offset

- **Status:** Proposed — drafted by Dev per the Phase 04 "ADR Triggers" section ("The Pilot writes it"); awaiting Pilot ratification.
- **Date:** 2026-07-15
- **Initiative / Phase:** song-import / Phase 04 (step 04.3, "Win B")
- **Deciders:** Pilot (Javier) — ratification pending.

## Context

Orbifold's visual playhead (Pentagrama, ProgressionStrip, rhythm view, and Tonnetz — four
consumers of `getVisualPhaseAnchor()`, confirmed by the Phase 04 step 04.1 inventory §(c))
is anchored against `performance.now()` and re-anchored, on every non-queued `runNow()`, by
an auto-measured hardware-latency offset (`measureLatencyOffsetMs`, `src/state/phase-anchor.ts`)
plus a user-adjustable manual calibration knob (`±200ms`, `src/ui/LatencyCalibration.svelte`,
persisted to `localStorage['orbifold:latencyCalibMs']`).

Prior to this phase, `measureLatencyOffsetMs` computed only
`(ctx.outputLatency + ctx.baseLatency) * 1000` — the AudioContext's hardware output path. Its
JSDoc explicitly argued that Strudel's `Cyclist` scheduler-lookahead constant
(`_scheduler.latency`, default `0.1`s / 100ms) should **not** be added: "Including it would
over-compensate by ~100 ms and invert the bug." That claim was never traced against Strudel's
actual scheduling source — it was asserted, and repeated without citation in the archived
`orbifold-v2` Phase 04 inventory that originally built the manual calibration knob.

The Phase 04 brief's working diagnosis was the opposite: that the app's persistent
constant (non-progressive) see-vs-hear playhead gap comes from **excluding** exactly this
term. Per this project's "Live sources — do not assume from memory" guardrail, the step
04.1 inventory traced the pinned `@strudel/web@1.0.3` bundle directly rather than relying on
either the old JSDoc or the brief's assumption:

**Traced call chain (inventory §(d)):** `Cyclist`/`ji` constructor (bundle lines 3545–3546) →
per-tick scheduling callback (lines 3557–3562) → `webaudioScheduler`/`Ho` (lines 5465–5476) →
`superdough`/`dr` (lines 4967–4975) → native `.start(when)` calls at both
`onTriggerSample`/`xo` (~lines 4832–4844) and `getOscillator`/`Lo` (line 5274).

`latency` is additively baked into the absolute Web Audio deadline (`when`) passed to
these native `.start()` calls, for **both** the sample and oscillator sound paths. This is
disambiguated from an unrelated internal tick-lookahead constant (`ym`) that happens to
share the same `0.1` default but has no audible effect. **Verdict: `Cyclist.latency` DOES
shift the real, audible Web-Audio-scheduled trigger time of every hap forward by its value.**
The prior JSDoc's claim was factually incorrect; it was never traced against the source it
described.

This app's own `webaudioScheduler()` call site (`src/audio/strudel.ts`) passes no options,
so the scheduler runs at its default `0.1`s (100ms) lookahead — i.e., the excluded term was
not negligible.

## Decision

**`measureLatencyOffsetMs` now includes the live `Cyclist.latency` value (OD-10 Option A,
Pilot-resolved 2026-07-10, recorded in `docs/song-import/decisions.md`).**

- `src/vite-env.d.ts` — the `Cyclist` interface gains `latency: number;` (previously omitted
  despite the runtime instance carrying it).
- `src/state/phase-anchor.ts` — `measureLatencyOffsetMs(ctx: AudioContext, schedulerLatencySec = 0): number`
  now returns `((ctx.outputLatency || 0) + (ctx.baseLatency || 0) + schedulerLatencySec) * 1000`.
  The new parameter defaults to `0`, so all four pre-existing unit tests and every call site
  that predates this phase keep byte-identical behavior unless the caller opts in.
- `src/audio/strudel.ts` — `syncVisualPhaseAfterRunNow` passes `_scheduler?.latency ?? 0` as
  the live second argument, summed with the hardware offset and the pre-existing manual
  calibration offset exactly as before.
- The JSDoc on both `measureLatencyOffsetMs` and `anchorVisualPhase` is corrected in place —
  not silently overridden — to state the verified rationale and flag that the prior claim was
  never traced against the actual scheduling source.

**Interaction with the manual calibration knob (Option B rejected, Option C's "leave the
knob's default at 0" folded into this decision):** The knob's default remains `0`; it stays a
pure fine-tune layered additively on top of a now-more-correct auto-measured baseline. Changing
the knob's *default* instead of fixing the measurement (OD-10 Option B) was rejected because it
would hide the root cause inside a resettable, per-profile manual value — a user who presses
the existing reset-to-0 button would silently reintroduce the bug. One accepted, bounded
consequence: a user who had already nudged their manual knob to informally compensate for the
missing ~100ms term will now be double-compensated by roughly that amount until they re-zero
their own `localStorage`-persisted knob. This is user-local state with no cross-user blast
radius, and the existing reset control is the user's remedy.

## Honesty framing (binding on all future references to this fix)

Per the Phase 04 brief's explicit constraint, this decision **reduces** the constant
(non-progressive) portion of the see-vs-hear playhead offset. It does **not** eliminate that
offset (hardware output latency remains variable and imperfectly measured on some platforms),
and it does **not** address progressive drift — the visual clock (`performance.now()`) and the
audio clock (Web Audio's own clock) run independently and diverge over time regardless of this
fix. Re-architecting the playhead onto the audio clock to eliminate drift is explicitly out of
scope for Phase 04 and remains deferred to a future initiative. No acceptance criterion, test,
or handoff for this decision may claim "eliminated," "perfectly synced," or equivalent.

## Consequences

### Files modified (step 04.3)

- `src/vite-env.d.ts` (`Cyclist.latency` declared)
- `src/state/phase-anchor.ts` (`measureLatencyOffsetMs` signature + JSDoc correction)
- `src/audio/strudel.ts` (`syncVisualPhaseAfterRunNow` passes live scheduler latency)
- `tests/phase-anchor.test.ts` (4 new tests added; the 4 pre-existing tests are unmodified)

### Files NOT modified

None of the four playhead-consumer render files (`src/render/pentagrama-scene.ts`,
`src/ui/ProgressionStrip.svelte`, `src/render/rhythm-scene.ts`, `src/render/tonnetz-scene.ts`)
required any change — all four read the same shared anchor with no per-consumer offset state,
confirming the fix was correctly centralizable in `phase-anchor.ts`/`strudel.ts` alone.

### Invariants preserved

- Tempo continues to be set exclusively via `_scheduler.setCps()` (ADR 0005) — this decision
  touches only the latency-offset measurement, not tempo control.
- `1 Strudel cycle = 1 bar of 4/4` is unaffected.
- The manual calibration knob's existing `±200ms` clamp and reset-to-0 behavior are unchanged.

### Future compatibility

If `@strudel/web` is ever upgraded past the pinned `1.0.3`, this ADR's traced call chain
(bundle line numbers) should be re-verified — the *semantics* (lookahead is audible, not
internal-only) are expected to hold, but exact line references will drift with the bundle.

## Alternative considered and rejected

**Option B — adjust only the manual knob's default** (e.g. to `-100`) was rejected: it does
not fix the measurement, it hides the missing term inside a value the user can reset away,
and it does not scale to hardware/lookahead combinations different from the one the default
was tuned for.

**Progressive-drift re-architecture** (anchoring the playhead to the Web Audio clock instead
of `performance.now()`) was considered and explicitly deferred — a larger, separate
architectural change outside this closing-polish phase's scope.
