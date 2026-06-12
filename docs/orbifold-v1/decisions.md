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

### `STEP_PX = 16` / `HALF_STEP_PX = 8` / `staffBaseY` — constantes de geometría del pentagrama (Phase 08)

**Decision:** `STEP_PX = 16`, `HALF_STEP_PX = 8` (= `STEP_PX / 2`), y `staffBaseY = app.screen.height / 2 − 6 × HALF_STEP_PX` (= `height / 2 − 48`) son los valores vinculantes que definen la geometría del pentagrama en `src/render/harmony-staff-scene.ts`. Cualquier fase futura que necesite alinearse visualmente con posiciones de notas del pentagrama (p. ej., la vista orbital) debe usar estos mismos valores o referenciar la misma geometría. Un Dev no puede cambiar estas constantes sin aprobación explícita del Pilot — afectan el mapeo visual de registro de pitch.
**Decided:** Phase 08, 2026-06-12
**Why:** ADR 0011 Amendment D5 los fijó como valores vinculantes al escalar el pentagrama de la tira inferior (Phase 07, STEP_PX=10) a la vista central de canvas completo (Phase 08). Las fases futuras (vista orbital, etc.) dependen de esta geometría para la coherencia visual entre vistas.
**Source:** Phase 08 step 08.7 Register proposal P1; ADR 0011 Amendment §D5; Pilot decision 2026-06-12.
**Applies to:** `src/render/harmony-staff-scene.ts`; cualquier renderer futuro que mapee pitch a posición vertical de canvas.

### `registerMode` es visual-only — el audio es byte-idéntico (Phase 08)

**Decision:** El toggle `registerMode` (`'estricto'` / `'suavizado'`) en `HarmonyState` controla únicamente cómo se muestra el pentagrama — nunca cambia el audio. La salida de `computeVoiceTracks` (en `src/core/harmony/voice-tracks.ts`) es consumida exclusivamente por el pipeline visual (`staff-layout.ts` → `harmony-staff-scene.ts`). El codegen de audio (`melodyLine`, `chordToStrudel` en `src/core/codegen/strudel.ts`) usa `chordVoicing` directamente y no importa `voice-tracks.ts`. Si una fase futura encamina la salida de `voice-tracks.ts` hacia el codegen de audio, eso cambia lo que el usuario escucha y requiere aprobación explícita del Pilot.
**Decided:** Phase 08, 2026-06-12
**Why:** Invariante confirmada por el veredicto de aislamiento del audio (phase-08-inventory.md §b). El principio es: cambiar el modo de registro no debe sorprender al usuario con un cambio de audio.
**Source:** Phase 08 step 08.7 Register proposal P2; ADR 0011 Amendment §D6; Pilot decision 2026-06-12.
**Applies to:** `src/core/harmony/voice-tracks.ts`; `src/state/session.ts` acción `setRegisterMode`; cualquier fase futura que toque el pipeline de voice-tracks.

### `harmony.subview` y `harmony.registerMode` son efímeros — no se persisten (Phase 08)

**Decision:** `HarmonyState.subview` (`'tonnetz'` | `'staff'`) y `HarmonyState.registerMode` (`'estricto'` | `'suavizado'`) son estado efímero de UI. Están ausentes de `SavedHarmonySchema` (en `src/lib/persistence.ts`) y del schema del agente (en `src/agent/schema.ts`). Al guardar y recargar una sesión, ambos campos vuelven a sus valores por defecto (`'tonnetz'` y `'suavizado'`). Si una fase futura necesita persistir estos campos o controlarlos desde el agente, se requiere un ADR y un bump de versión del schema de sesión guardada.
**Decided:** Phase 08, 2026-06-12
**Why:** Ambos son preferencias de visualización sin semántica musical. Persistirlos requeriría versionar el formato de sesión, lo que tiene coste de migración. La decisión deliberada de mantenerlos efímeros debe quedar registrada para que no se "escapen" silenciosamente a la persistencia en una fase futura.
**Source:** Phase 08 step 08.7 Register proposal P3; ADR 0011 Amendment §D6; Pilot decision 2026-06-12.
**Applies to:** `src/lib/persistence.ts` `SavedHarmonySchema`; `src/agent/schema.ts`; `src/state/session.ts` `HarmonyState`.

## Superseded decisions

(empty)
