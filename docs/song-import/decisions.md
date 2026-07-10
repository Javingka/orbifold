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

### OD-3 — Contrato de entrada de `importSession`: chart estructurado LLM-native (Option A)

**Decision:** `importSession` recibe un objeto estructurado y validado — `{ songTitle, artist?, bpm, key, mode, sections: [{ label, chords: [{ root, quality, bars? }] }] }` — NO texto de tab crudo. La skill es un **validador+traductor puro**: mapea ese objeto a un `Session` de Orbifold válido, reutilizando `pow`, `Block.label`, los grooves existentes y `SCHEMA_VERSION 7`. Quién produce ese objeto (un LLM desde su conocimiento, un test, o un futuro scraper/UI) queda **fuera de esta fase**. El fixture golden es un objeto hardcodeado de esa forma.
**Decided:** song-import Phase 02 scoping, 2026-07-02
**Why:** Frontera de función limpia y testeable: el golden es un objeto simple, la función es demostrablemente correcta contra él, y la preocupación de "de dónde sale el chart" (LLM-native vs scraping de Ultimate Guitar/Chordify) permanece **aguas arriba** y se decide en una fase posterior — Option A no la cierra (un scraper podría igualmente poblar el objeto estructurado). Option B (texto de tab crudo `rawChart: string`) mezcla parsing + traducción en una sola skill, es frágil ante variaciones de formato y complica el test unitario.
**Source:** Phase 02 step 02.1 OD-3 (planteada por el Planner en scoping); decisión del Pilot 2026-07-02.
**Applies to:** `src/agent/import-session.ts` `ImportSessionInputSchema` y su lógica de mapeo; cualquier fase futura que alimente la skill (scraper/UI/LLM populan el objeto de entrada).

### Convención de nombre de Block en `importSession`: `"<songTitle> — <sectionLabel>"`

**Decision:** Los blocks creados por `importSession` se nombran `"<songTitle> — <sectionLabel>"` (p. ej. `"ONE — Intro"`). `Block.label` sigue llevando la **sección desnuda** (`"Intro"`) para el display de timeline introducido en Phase 01.
**Decided:** song-import Phase 02 scoping, 2026-07-02
**Why:** Auto-descriptivo en una session multi-canción; el chip de timeline muestra `label` (la sección) mientras que `name` desambigua la canción de origen. Nombrar sólo `"<sectionLabel>"` sería ambiguo si varias canciones comparten una session.
**Source:** Pilot decision 2026-07-02.
**Applies to:** `src/agent/import-session.ts` (construcción de `Block.name` / `Block.label`).

### OD-4 — Mecanismo de sourcing del chart: LLM-native (Option A)

**Decision:** El chart se obtiene vía **LLM-native**: la UI de import dispara una llamada one-shot al provider del usuario (reusando `providers.ts`/`agent.ts`) con un `IMPORT_SYSTEM_PROMPT` + la query de la canción; la respuesta se valida con `ImportSessionInputSchema.safeParse`. **NO** scraping — Option B queda descartado para el MVP (CORS en navegador sin backend + dudas de ToS). "Canción desconocida" → el LLM devuelve `{ "error": "…" }` → `safeParse` falla → error legible en la UI.
**Decided:** song-import Phase 03 scoping, 2026-07-03
**Why:** Consume directo el contrato Option A (OD-3) ya construido en Phase 02; sin backend, sin deps nuevas, sin workaround de CORS; la extracción fence→brace de JSON ya existe en `agent.ts` y se reutiliza. `sendImport` es un wrapper delgado (~60 líneas) sobre el patrón fetch ya probado por `send()`/`sendEvolution()`.
**Source:** Phase 03 OD-4 (Planner scoping); decisión del Pilot 2026-07-03.
**Applies to:** `src/agent/agent.ts`/`apply.ts` (`sendImport`, `IMPORT_SYSTEM_PROMPT`); la superficie de import UI (Phase 03).

### OD-5 — Manejo de links en Phase 03: solo nombre (Option A)

**Decision:** El campo de import es **texto libre / solo nombre** (p. ej. `"ONE by Metallica"`). URLs no se procesan en Phase 03. La resolución **YouTube→oEmbed** (identificador vía `youtube.com/oembed`, sin key, sin descarga de audio — per la decisión "MVP = Pipeline B") se **difiere a una fase posterior** como add-on autocontenido (el campo sigue siendo un string, sin consecuencias de arquitectura). Ver Amendment (2026-07-10).
**Decided:** song-import Phase 03 scoping, 2026-07-03
**Why:** Valida el camino LLM-native end-to-end sin ruido; oEmbed añade 3 error paths (red, vídeo privado, URL no-YouTube) + un paso async para ganancia marginal en el MVP; diferirlo no tiene coste arquitectónico.
**Source:** Phase 03 OD-5 (Planner scoping); decisión del Pilot 2026-07-03.
**Amendment (2026-07-10):** El destino de la deferral de oEmbed cambia de Phase 04 a una fase posterior. Phase 04 fue re-scopeada por el Pilot como **"closing polish"** (colocación manual de calidad `pow`/`dim`/`aug` + recalibración del offset fijo de latencia del playhead) antes de mergear song-import a `main`. oEmbed no aborda ninguno de los tres dolores hallados en la verificación manual de Phase 03 y se re-difiere para mantener la fase de cierre mínima. Decisión del Pilot 2026-07-10.
**Applies to:** El campo de import UI (Phase 03); resolución de links (fase posterior a Phase 04).

### OD-6 — Import reemplaza la sesión actual (Option A)

**Decision:** `applyImportSession` **reemplaza** la sesión actual (delega en `applyLoadedSession`): la canción importada ES la sesión nueva. Requiere **avisar al usuario** antes de sobreescribir (precedente UX: el botón "load" del panel de persistencia). **NO** fusión/append (Option B) — su semántica de BPM/armonía al fusionar es ambigua; queda como feature "jam" (importar estructura de acordes sobre el groove actual) deferible si se pide.
**Decided:** song-import Phase 03 scoping, 2026-07-03
**Why:** Simple y con precedente; encaja con la visión "dado un song, construye un Session que lo representa". La fusión es power-user con semántica ambigua y expandiría el scope de la fase.
**Source:** Phase 03 OD-6 (Planner scoping, planteada sin default); decisión del Pilot 2026-07-03.
**Applies to:** `src/agent/apply.ts` `applyImportSession`.

### Ubicación de la UI de import: componente `ImportSong` dedicado

**Decision:** El campo de import vive en un **componente nuevo dedicado** (p. ej. `ImportSong` / `ImportPanel` en `src/ui/`), no como subsección de `AgentPanel`. Feature de primera clase con foco propio.
**Decided:** song-import Phase 03 scoping, 2026-07-03
**Why:** Visibilidad como funcionalidad de primera clase; separa la UX de import de la interacción general del agente.
**Source:** Pilot decision 2026-07-03 (preferencia de placement, no bloqueante).
**Applies to:** `src/ui/**` (nuevo componente de import); Phase 03 step 03.3.

### OD-7 — Fuente del ritmo importado: signatura rítmica por sección (Option B), no groove genérico

**Decision:** El ritmo de una canción importada NO es un backbeat genérico por defecto (Option A **rechazada**). Se trata como **first-class, con la misma estrategia que la armonía**: el LLM devuelve la **signatura rítmica** de la canción — un patrón de batería **por sección**, en paralelo a los acordes por sección — e `importSession` lo mapea a bloques `groove` (uno por sección) + una pista de ritmo, alineados bar-a-bar con los bloques de armonía en dos pistas que hacen `stack(...)`. El estado `rhythm` en vivo = groove de la **primera** sección (espejo de `harmony.progression` = acordes de la primera sección). Requiere: extender `SectionSpecSchema` con un campo `groove` **requerido** (`ImportGrooveSchema`: `layers[]` con `sound` restringido a la paleta soportada `SK_SOUNDS` y `steps` de longitud exacta 16, per invariante 1 ciclo = 4/4); subir `IMPORT_SCHEMA_VERSION` a **2**; extender `IMPORT_SYSTEM_PROMPT` para pedir el patrón característico con la paleta de sonidos; y subir `max_tokens` de `sendImport` (600 → 1600). Cada bloque (armonía y groove) lleva su snapshot (`ArmoniaSnapshot` / `GrooveSnapshot`) → editable vía `openBlock` (arregla también el gap "bloques no editables"). Compás compuesto/irregular sigue diferido (choca con 1 ciclo = 4/4).
**Decided:** song-import Phase 03 step 03.4 scoping, 2026-07-03
**Why:** El ritmo identifica una canción tanto o más que la armonía; una solución genérica no captura lo que hace reconocible a un tema (p. ej. el doble bombo de "ONE"). "No podemos dar soluciones genéricas, no va a funcionar; tenemos que encontrar la 'signatura rítmica' de las canciones, con la misma estrategia que hacemos con armonía." La fidelidad por-canción es el core de la propuesta de valor de song-import. `groove` requerido (no opcional): si el LLM lo omite, `safeParse` falla y el usuario reintenta — un fallback silencioso a sin-batería sería peor que un error informativo.
**Source:** Phase 03 OD-7 (Planner scoping); decisión del Pilot 2026-07-03. Descubierto en la verificación manual de parity del step 03.3 (import en vivo de "ONE" con gpt-4o-mini: sin batería en la composición).
**Applies to:** `src/agent/import-session.ts` (`ImportSessionInputSchema`/`SectionSpecSchema`, mapeo a bloques groove + pista de ritmo, snapshots); `src/agent/import-prompt.ts` (`IMPORT_SYSTEM_PROMPT`); `src/agent/import-agent.ts` (`max_tokens`); Phase 03 step 03.4.

### OD-8 — Win A: control de calidad en Header, solo-edición

**Decision:** La colocación manual de calidad de acorde se hace vía un control en el panel del slot seleccionado en `Header.svelte`, **habilitado solo cuando hay un acorde seleccionado** (solo-edición, NO siempre-visible). No se añade hit-test de arista del Tonnetz (Option B descartada). El Tonnetz sigue creando solo `maj`/`min` (OD-2 intacto).
**Decided:** song-import Phase 04, 2026-07-10
**Why:** Reusa el patrón select→edit ya probado (oscilador/preset), cero paradigma de interacción nuevo. Solo-edición porque la calidad no tiene concepto de "intención para el próximo acorde" (los acordes nuevos siempre nacen `maj`/`min` por el click del Tonnetz), así que un control siempre-activo sin target sería UI muerta/confusa.
**Source:** Phase 04 OD-8 (Planner scoping); inventario 04.1 §(b) (eje solo-edición vs siempre-visible); decisión del Pilot 2026-07-10.
**Applies to:** `src/ui/Header.svelte` (control de calidad); `src/state/session.ts` (`setChordQuality`).

### OD-9 — Win A: el control expone las cinco calidades

**Decision:** El control de calidad expone las **cinco** calidades (`maj`/`min`/`dim`/`aug`/`pow`) como fuente única de verdad de la calidad de un acorde ya colocado — no solo las tres inalcanzables (`dim`/`aug`/`pow`).
**Decided:** song-import Phase 04, 2026-07-10
**Why:** Modelo mental simétrico (permite convertir un `maj` colocado en el Tonnetz a `dim` y de vuelta, sin borrar y recolocar); no remueve ninguna capacidad existente (los clicks del Tonnetz siguen creando `maj`/`min` nuevos exactamente igual). Exponer solo `dim`/`aug`/`pow` dejaría el camino `dim`→`maj` sin salida salvo borrar el slot y re-clickear un triángulo.
**Source:** Phase 04 OD-9 (Planner scoping); decisión del Pilot 2026-07-10.
**Applies to:** `src/ui/Header.svelte` (opciones del control de calidad).

### OD-10 — Win B: auto-incluir el scheduler lookahead en el offset (Option A)

**Decision:** `measureLatencyOffsetMs` suma el `_scheduler.latency` del `Cyclist` de Strudel (~100 ms de lookahead, confirmados audibles en el inventario 04.1 §(d)) al offset de latencia medido. La firma se extiende con un parámetro opcional `schedulerLatencySec = 0` (los 4 tests existentes pasan sin editarse); `syncVisualPhaseAfterRunNow` pasa `_scheduler?.latency ?? 0`. El knob manual de calibración conserva su default `0` y queda como fine-tune encima de una base ya correcta. Option B (cambiar el default del knob) descartada por esconder la causa raíz en un valor manual reseteable.
**Decided:** song-import Phase 04, 2026-07-10
**Why:** El inventario 04.1 §(d) trazó el bundle pinneado de `@strudel/web@1.0.3` y confirmó con evidencia (`Cyclist` → `superdough` → `.start(when)`) que `latency` sí desplaza hacia adelante el instante audible de cada hap; el JSDoc previo en `phase-anchor.ts` que afirmaba lo contrario era factualmente incorrecto (nunca trazó la fuente). Option A arregla la causa raíz en la medición en vez de esconderla. Restricción de honestidad: Win B **reduce** el offset fijo, no lo elimina — la deriva progresiva (relojes independientes) queda fuera de scope y diferida.
**Source:** Phase 04 OD-10 (Planner scoping); inventario 04.1 §(d) veredicto con evidencia contra el bundle; decisión del Pilot 2026-07-10.
**Applies to:** `src/state/phase-anchor.ts` (`measureLatencyOffsetMs` + JSDoc); `src/audio/strudel.ts` (`syncVisualPhaseAfterRunNow`); `src/vite-env.d.ts` (`Cyclist.latency`).

## Superseded decisions

(empty)
