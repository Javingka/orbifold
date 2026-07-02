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

### Ingestión de canciones — MVP = Pipeline B (simbólico: link/nombre → tabs → schema); Spotify fuera

**Decision:** La feature de interpretación de música se construye en dos pipelines complementarios, y el MVP arranca por el **Pipeline B (simbólico)**: identidad de la canción (nombre o link) → charts/tabs humanos (Ultimate Guitar, Chordify, etc.) → LLM/agente mapea a un `Session` de Orbifold. El **Pipeline A (DSP sobre audio crudo)** — archivo de audio → chroma/onset/beat → acordes/ritmo — queda para una fase posterior, para cubrir canciones que no están en bases de tabs (grabaciones propias, temas oscuros). **Input set confirmado:** (1) archivo de audio (substrato fundacional, Pipeline A, fase posterior); (2) campo "nombre o link" (Pipeline B, MVP). Un link de **YouTube se usa solo como identificador** vía **oEmbed** (`youtube.com/oembed?url=…&format=json`, sin API key, sin descargar audio) — nunca como fuente de audio (descargar viola ToS). **Spotify queda fuera**: sus endpoints Audio Analysis / Audio Features / preview-URLs están deprecados para apps nuevas desde 2024-11-27 (403, sin waitlist ni reemplazo), y como identificador no aporta sobre YouTube+oEmbed.
**Decided:** song-import cierre de Phase 01, 2026-07-02
**Why:** El Pipeline B da mejor resultado, más rápido y con menor esfuerzo (sin DSP: es lookup + LLM + nuestro schema, que ya sabemos mapear) y para canciones famosas la transcripción humana ya resolvió el problema difícil que el DSP hace mal (acordes en audio saturado, power chords ambiguos). Encaja con lo que Phase 01 ya entregó: `pow` quality + `Block.label` son exactamente lo que un chart necesita para mapearse ("Intro: E5 G5 A5…"). Spotify se descartó tras verificar el corte de su Web API (fuentes en el hilo del Pilot 2026-07-02).
**Source:** Pilot decision 2026-07-02 (diálogo de diseño de inputs, con verificación web del estado de la Spotify Web API).
**Applies to:** La iniciativa/fase de ingestión (`importSession` skill, diferida de Phase 01); cualquier scoping futuro del pipeline de interpretación de música.

### OD-2 — Power chord render: color `accent` en Pentagrama, sin Tonnetz

**Decision:** Un slot de quality `'pow'` se renderiza en el Pentagrama con el color `accent` `#8aa0ff` — no con colores de función tonal (tónica/subdominante/dominante), que requieren una tercera para computarse. No hay highlight en el Tonnetz: un power chord no tiene triángulo (sin tercera no hay ▲/▼). No se requiere código de render nuevo — el fallback existente de `dmap`-miss ya produce `#8aa0ff` para slots no diatónicos, y no hay crash paths para `pow` en ninguna ruta de render.
**Decided:** song-import Phase 01, 2026-07-02
**Why:** Semánticamente honesto: sin tercera no hay función tonal, así que un color de función tonal sería engañoso (Option B) o directamente misleading (Option C, colorear por root ignorando la 3ra ausente). El color `accent` señala "fuera del sistema diatónico" que es exactamente lo que un power chord es.
**Source:** Phase 01 step 01.1 inventory OD-2 recommendation; Pilot decision 2026-07-02.
**Applies to:** `src/render/**` rutas de paint del Pentagrama/Tonnetz; cualquier fase futura que renderice qualities no triádicas.

## Superseded decisions

(empty)
