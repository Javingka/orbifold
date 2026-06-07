# ADR 0006 — WebGL feature detection before PIXI initialization

- **Status:** Accepted
- **Date:** 2026-06-06
- **Initiative / Phase:** orbifold-v1 / Phase 03 (step 03.2)
- **Deciders:** Pilot (Javier), confirmed at Phase 03 inventory checkpoint

## Context

CLAUDE.md requires: "feature-detect WebGL and degrade with a clear message." Before calling `new PIXI.Application(...)`, the render layer must confirm WebGL is available; otherwise PIXI throws an unhelpful internal error.

The prototype (`reference/orbifold.html`) used `typeof PIXI === 'undefined'` as a CDN-load guard — irrelevant for the Vite build where PIXI is an npm import.

## Decision

Detect WebGL support by calling `canvas.getContext('webgl2') || canvas.getContext('webgl')` on the `<canvas>` element **before** `new PIXI.Application(...)`. If both return null, display the localized message "Tu navegador no soporta WebGL. Orbifold no puede funcionar." and return null from `initStage()` without crashing.

## Consequences

**Positive:** Graceful, user-visible degradation on browsers with WebGL disabled (e.g., devtools hardware acceleration off). Satisfies CLAUDE.md invariant.

**Neutral:** Modern browsers (Chrome, Firefox, Safari) all support WebGL; this path is rarely hit in practice.
