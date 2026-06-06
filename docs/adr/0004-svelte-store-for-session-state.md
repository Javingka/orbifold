# ADR 0004 — Svelte writable store for session state

- **Status:** Accepted
- **Date:** 2026-06-06
- **Initiative / Phase:** orbifold-v1 / Phase 02 (step 02.2)
- **Deciders:** Pilot (Javier), resolved as OD-2 at the Phase 02 inventory checkpoint

## Context

Phase 02 introduces `src/state/session.ts`, the single source of truth holding `SessionState` (bpm, view, chordMode, harmony, rhythm, composition, nowPlaying). The prototype used mutable module-level globals. The port needs a reactive store the Svelte UI (Phase 04) can subscribe to. Two options:

- **Svelte `writable` store** — native reactive subscriptions in components; couples `state/` to Svelte.
- **Framework-agnostic store** (plain class + event emitter) — keeps `state/` framework-free; components subscribe manually.

The CLAUDE.md invariant requires only `core/**` to be free of DOM/PIXI/Svelte imports. `src/state/` is explicitly outside `core/**`, so it is permitted to depend on Svelte.

## Decision

Use a **Svelte `writable` store** for `src/state/session.ts`.

The store's **pure code-derivation helpers** (`rhythmCode()`, `harmonyCode()`, `sessionCode()`) remain plain functions delegating to the Phase 01 `core/codegen` engines — they take state as input and return Strudel strings with no Svelte or audio dependency, so they stay unit-testable in Node (Vitest) independent of the store wrapper.

## Consequences

**Positive**
- Native reactivity: Phase 04 Svelte components subscribe with `$store` syntax, no manual wiring.
- Matches the confirmed stack (Svelte); no extra abstraction to maintain.
- The pure derivations stay testable in Node regardless of the store choice.

**Negative / risks**
- `state/session.ts` now imports `svelte/store`, coupling the state layer to Svelte. If the UI framework were ever swapped (a non-goal of this initiative), the store wrapper — but not the pure derivations or the `core/**` engines — would need rework.

**Neutral**
- The `core/**` engines remain framework-agnostic and unaffected; this ADR concerns the `state/` layer only.

## Reversibility

Reversible: swapping the `writable` wrapper for a framework-agnostic store is a localized change in `session.ts`; the pure derivation helpers and all `core/**` engines are unaffected.
