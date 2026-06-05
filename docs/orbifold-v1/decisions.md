# Decisions Register — Orbifold v1

This file lists vigent rules for this initiative. Planner and Dev read this
at every invocation. **The Pilot is the only writer.**

See `references/decisions-register-convention.md` for entry format.

## Active decisions

### Exact dependency version pinning

**Decision:** Every dependency in `package.json` uses an exact version (no `^` or `~` ranges), not only `pixi.js` and `@strudel/web`.
**Decided:** Phase 00, 2026-06-05
**Why:** Deterministic, reproducible builds; extends the CLAUDE.md Definition of Done (which pinned only PIXI/Strudel) to the entire dependency set.
**Source:** Surfaced in Phase 00 step 00.2; `package.json`.
**Applies to:** All `dependencies` and `devDependencies` across the `orbifold-v1` initiative.

## Superseded decisions

(empty)
