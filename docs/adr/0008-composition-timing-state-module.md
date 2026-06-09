# ADR 0008 — Composition timing state as a dedicated module

- **Status:** Accepted
- **Date:** 2026-06-08
- **Initiative / Phase:** orbifold-v1 / Phase 05 (step 05.2)
- **Deciders:** Pilot (Javier), pre-resolved as OD-2 before step 05.2

## Context

Phase 05 introduces composition playback that requires tracking three ephemeral runtime values:

- `_compState: 'stopped' | 'playing' | 'paused'` — current transport state.
- `_compStart: number` — `performance.now()` timestamp at which playback started (or was
  adjusted for resume-from-pause).
- `_compPausedBars: number` — bar position at which the user paused.

These values are read every animation frame (60 fps) by the `rAF` loop in `CompositionDrawer.svelte`
to compute the playhead's pixel position. Two placement options were considered:

- **Option A: Svelte store** — add `compState`, `compStart`, `compPausedBars` fields to
  `sessionStore` in `src/state/session.ts`. Every `sessionStore.update(...)` at 60 fps would
  trigger Svelte's reactive subscriptions across all components, causing excessive re-renders.
- **Option B: Dedicated module** — create `src/state/composition.ts` as a module-level state
  container analogous to `src/state/hud.ts`. Exported getters/setters give controlled access.
  The rAF loop reads directly without touching the store.

The existing `src/state/hud.ts` established the pattern (Phase 03): ephemeral render-state that
changes at animation-frame frequency lives in a dedicated module, not in the Svelte store.

## Decision

Composition playhead timing state lives in **`src/state/composition.ts`**, a dedicated module,
following the same pattern as `src/state/hud.ts`.

The module exports:

- `PPB: number` — pixels per bar constant (48, from prototype line 1934). Exported for use
  in `CompositionDrawer.svelte` to position blocks and the playhead.
- `compPos(bpm: number, totalBars: number): { tb: number; pos: number }` — computes current
  playhead bar position using the prototype formula (lines 2067–2072):
  `barsElapsed = ((performance.now() - compStart) / 1000) * (bpm / 240)`. Returns `compPausedBars`
  when paused; returns 0 when stopped.
- `getCompState()`, `setCompPlaying(start: number)`, `setCompPaused(bars: number)`,
  `setCompStopped()` — controlled getters/setters.
- `getCompPausedBars()` — read by `playComposition()` in `session.ts` to compute the
  resume-adjusted start timestamp.

No Svelte store import is present in `composition.ts`; the module is framework-agnostic
(though not in `core/**`, since it is not pure engine logic).

## Consequences

**Positive**
- No 60 fps store churn: the Svelte reactivity system is not involved in playhead animation.
  Only `CompositionDrawer.svelte`'s local reactive variables (`playheadLeft`, `playheadOn`)
  update, which are isolated to that component.
- Consistent with `hud.ts` — one timing module per ephemeral concern. The pattern is
  established and the team recognizes it.

**Negative / risk**
- `composition.ts` state is not observable outside `CompositionDrawer.svelte` without
  importing and reading the getters explicitly. If a future component needs to react to
  composition transport state, it must poll or the pattern must be extended.
- The module is a singleton — one composition transport per app lifetime. A future "multiple
  compositions" feature (non-goal of this initiative) would require structural change.

**Phase 07 persistence scope**
- `composition.ts` state is **explicitly excluded** from Phase 07 session persistence. These
  are runtime transport counters with no musical identity. Saved sessions will not contain
  `_compState`, `_compStart`, or `_compPausedBars`. On load, the drawer starts in the
  `'stopped'` state with `_compStart = 0` and `_compPausedBars = 0` (module initializers).

## Reversibility

Reversible: moving this state into the store requires adding three fields to `SessionState`,
changing the module-level variables to `sessionStore.update(...)` calls in `session.ts`, and
subscribing to the store in `CompositionDrawer.svelte` instead of calling the getters directly.
The `PPB` constant and `compPos` formula would remain unchanged.
