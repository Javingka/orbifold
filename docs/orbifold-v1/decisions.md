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

### `Chord.cx / Chord.cy` — render hints efímeros, no persistidos

**Decision:** Los campos `cx?: number` y `cy?: number` del tipo `Chord` en `src/state/session.ts` son render hints efímeros. No se incluyen en el schema Zod de Phase 05, no se serializan al guardar sesiones, y no se deserializan al cargar. `findRenderTriForChord` ya tiene fallback a nearest rootPc/qual sin centroide, por lo que sesiones importadas funcionan correctamente sin estos campos.
**Decided:** Phase 03 closure, 2026-06-08
**Why:** Los valores son coordenadas de canvas en píxeles lógicos — dependen de la resolución y viewport, sin semántica musical. El Tonnetz tila periódicamente (los duplicados son el mismo acorde en pitch class, no octavas distintas). La identidad musical es `(rootPc, qual)`; la identidad espacial es solo cosmética.
**Source:** Phase 03 handoff "Pending Register proposals"; Pilot decision 2026-06-08.
**Applies to:** `src/state/session.ts` `Chord` type; Phase 05 Zod schema; session export/import.

## Superseded decisions

(empty)
