# Decisions Register — song-import

This file lists vigent rules for this initiative. Planner and Dev read this
at every invocation. **The Pilot is the only writer.**

See `references/decisions-register-convention.md` for entry format.

## Active decisions

### OD-1 — Power chord Strudel codegen: coma-separated notes en `note("…")`

**Decision:** El codegen Strudel para una quality `'pow'` emite las dos voces (root + quinta justa) como notas simultáneas separadas por coma dentro de un único `note("…")`: p. ej. un E5 en octava 2 → `note("E2,B2")`. NO se usa `stack(...)`, NO se usa un chord shorthand (`'pow'`/`'5'` no está registrado en `@strudel/web@1.0.3`). Esto es idéntico al patrón que ya usa `chordToStrudel` para acordes normales (`notes.join(',')` → `note("C3,E3,G3")`). Nota crítica: en mini-notation Strudel el separador coma = simultáneo (chord stack); el espacio = secuencia (arpegio) — por eso `note("E2 B2")` sería incorrecto.
**Decided:** song-import Phase 01, 2026-07-02
**Why:** Máxima idiomaticidad y verificabilidad con la versión pinneada; cero código de emisión nuevo (reutiliza el mismo join que los acordes); consistencia total con el codegen existente. Option B (`stack`) es más verbose y crea dos patterns donde uno basta; Option C no es viable en la versión pinneada.
**Source:** Phase 01 step 01.1 inventory OD-1 recommendation; Pilot decision 2026-07-02.
**Applies to:** `src/core/codegen/strudel.ts` `chordToStrudel`; cualquier fase futura que emita power chords.

### OD-2 — Power chord render: color `accent` en Pentagrama, sin Tonnetz

**Decision:** Un slot de quality `'pow'` se renderiza en el Pentagrama con el color `accent` `#8aa0ff` — no con colores de función tonal (tónica/subdominante/dominante), que requieren una tercera para computarse. No hay highlight en el Tonnetz: un power chord no tiene triángulo (sin tercera no hay ▲/▼). No se requiere código de render nuevo — el fallback existente de `dmap`-miss ya produce `#8aa0ff` para slots no diatónicos, y no hay crash paths para `pow` en ninguna ruta de render.
**Decided:** song-import Phase 01, 2026-07-02
**Why:** Semánticamente honesto: sin tercera no hay función tonal, así que un color de función tonal sería engañoso (Option B) o directamente misleading (Option C, colorear por root ignorando la 3ra ausente). El color `accent` señala "fuera del sistema diatónico" que es exactamente lo que un power chord es.
**Source:** Phase 01 step 01.1 inventory OD-2 recommendation; Pilot decision 2026-07-02.
**Applies to:** `src/render/**` rutas de paint del Pentagrama/Tonnetz; cualquier fase futura que renderice qualities no triádicas.

## Superseded decisions

(empty)
