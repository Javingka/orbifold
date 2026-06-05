# ADR 0003 — Tonnetz pure representation excludes pixel coordinates

- **Status:** Accepted
- **Date:** 2026-06-05
- **Initiative / Phase:** orbifold-v1 / Phase 01 (step 01.3)
- **Deciders:** Pilot (Javier), resolved as OD-5 at the Phase 01 inventory checkpoint

## Context

The prototype (`reference/orbifold.html`) generates the Tonnetz lattice and its triangles tightly coupled to PIXI rendering: node objects carry pixel `{x, y}` layout alongside their musical identity, computed inside the draw routine. Phase 01 ports this into `src/core/theory/tonnetz.ts`, but the project invariant (CLAUDE.md) requires every `core/**` module to be free of DOM/PIXI/Svelte imports so the engines are unit-testable in Node.

A pure Tonnetz engine must therefore decide what a "node" is: pure musical/lattice data, or data plus screen geometry.

## Decision

The pure Tonnetz engine carries **lattice coordinates and pitch class only** — no pixel geometry:

- `TonnetzNode = { i: number; j: number; pc: number }`.
- `tonnetzPc(i, j) = (7i + 4j) mod 12` is a pure function (CLAUDE.md invariant).
- `computeTonnetzNodes(iRange, jRange)` and `computeTonnetzTriangles(nodes, root, mode)` produce geometry-free arrays (triangle membership, rootPc, quality, label, diatonic info).
- **Pixel layout `{x, y}` is exclusively a render-layer concern** (`src/render/tonnetz-scene.ts`, Phase 03), which maps lattice `(i, j)` to screen coordinates.

## Consequences

**Positive**
- `core/theory/tonnetz.ts` is pure and unit-testable in Node, with prototype-parity tests on `tonnetzPc` and triangle generation — no PIXI required.
- Clean separation: the engine answers "which triangles exist and what are they," the render layer answers "where they are drawn."

**Negative / risks**
- The lattice-iteration logic exists conceptually in two places: the core decides which `(i, j)` nodes/triangles exist; the render layer decides their on-screen position. The render layer must iterate the same `(i, j)` set the core produced — it consumes `TonnetzNode[]` rather than re-deriving, which keeps them aligned.

**Neutral**
- The exact pixel projection (axis vectors, spacing) is deferred to Phase 03 and constrained only by visual parity with the prototype, not by this ADR.

## Reversibility

Reversible: if a future need arises to colocate layout with nodes, a render-layer type can extend `TonnetzNode` with `{x, y}` without changing the pure engine.
