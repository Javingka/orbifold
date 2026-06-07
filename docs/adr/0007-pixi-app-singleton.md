# ADR 0007 — PIXI Application as a module-level singleton

- **Status:** Accepted
- **Date:** 2026-06-06
- **Initiative / Phase:** orbifold-v1 / Phase 03 (step 03.2)
- **Deciders:** Pilot (Javier), confirmed at Phase 03 inventory checkpoint

## Context

`stage.ts` creates one `PIXI.Application` for the lifetime of the app and exposes it via `getApp()`. This matches the prototype's single `app` variable at module scope.

## Decision

One `PIXI.Application` instance is created in `initStage()` and stored as a module-level variable in `stage.ts`. It is never torn down and re-created during normal use. `getApp()` returns it; scene modules import `getApp` to access the shared application.

## Consequences

**Positive:** Simple; matches prototype architecture.

**Negative / risk:** If a future phase (e.g., composition view) requires a separate PIXI canvas or full teardown, this assumption must be revisited. That is a non-goal of the current initiative.

## Reversibility

Reversible: converting to a factory pattern would require updating scene modules to pass the app instance explicitly rather than calling `getApp()`.
