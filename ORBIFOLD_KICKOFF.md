# Orbifold — Brief de arranque y arquitectura (migración a proyecto profesional)

---

## 1. Visión y alcance

**Qué es.** Orbifold es un instrumento web de creación musical por *live coding* construido sobre **Strudel** (port de
TidalCycles a JS), con una interfaz **PIXI/WebGL** de estética sobria tipo "Apple". Organiza la música con la **geometría
de acordes de Tymoczko**: Tonnetz navegable, transformaciones neo‑riemannianas P·L·R, voice‑leading mínimo y ritmos
euclidianos. Incluye un **timeline de Composición tipo DAW** y un **Agente de IA** con *skills* que crean ritmo y/o
armonía y actualizan la interfaz.

**Para quién.** Músicos y curiosos (no requiere saber programar). El código es opcional y visible (pedagógico).

**Objetivo de esta etapa.** Formalizar el prototipo en un proyecto profesional, con build, tipos, pruebas y
**despliegue estático** para compartir primero entre amigos/conocidos, y dejarlo listo para evolucionar.

**No‑objetivos (por ahora).** Cuentas de usuario, backend pesado, colaboración en tiempo real, app nativa. Se dejan como
fases futuras.

---

## 2. Material de origen

- `reference/orbifold.html` — el prototipo actual (HTML+CSS+JS en un solo archivo). **Es la fuente de verdad funcional.**
  Colocalo en el repo en `reference/` y **portá su lógica** sin perder comportamiento.
- `docs/voiceleading.pdf` — paper de Tymoczko (fundamento conceptual).
- Documento de referencias de teoría musical (Tonnetz / neo‑riemanniano / Tymoczko / Lerdahl…).

**Fuentes vivas a consultar (no asumir de memoria):** Strudel `https://strudel.cc/learn/` · PixiJS `https://pixijs.com/8.x/`
· Web Audio `https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API`.

---

## 3. Stack objetivo

- **Build/dev:** Vite.
- **Lenguaje:** TypeScript (modo `strict`).
- **UI declarativa:** Svelte (componentes para paneles, transporte, timeline, agente). *Alternativa válida: React;* si se
  cambia, mantener la misma separación de capas. PIXI sigue dibujando el lienzo (Tonnetz y órbitas).
- **Gráficos:** PixiJS. El prototipo usa **v7**; arrancar en v7 para portar 1:1 y planificar migración a **v8** como fase
  aparte (guía oficial v7→v8). Pinear versión exacta.
- **Audio/motor:** Strudel (`@strudel/web`), versión pineada.
- **Validación de datos:** Zod (esquema del JSON del agente y de sesiones guardadas).
- **Pruebas:** Vitest (unitarias de los motores puros) + Playwright opcional (humo end‑to‑end).
- **Calidad:** ESLint + Prettier + `tsc --noEmit` en CI.

---

## 4. Arquitectura y estructura de carpetas

Principio rector: **separar lógica pura (testeable, sin DOM ni PIXI) de render y de UI.** Los "motores" son TS puro.

```
orbifold/
  index.html
  package.json  tsconfig.json  vite.config.ts  .eslintrc  .prettierrc
  LICENSE                      # AGPL-3.0 (hereda de Strudel)
  README.md
  reference/orbifold.html      # prototipo de origen
  docs/                        # paper, decisiones de diseño (ADR), notas musicales
  public/
  src/
    main.ts                    # bootstrap
    app/App.svelte             # raíz/layout
    state/
      session.ts               # store reactivo: bpm, vista, ritmo, armonía, composición, transporte, "qué suena"
    core/                      # PURO, framework-agnóstico, 100% testeable
      theory/
        pitch.ts               # NOTE_NAMES, pc helpers, noteToPc
        scales.ts              # SCALE_INTERVALS (8 modos), diatónicos
        chords.ts              # QUAL_INTERVALS, triadQuality, chordLabel, voicing
        tonal-function.ts      # T / SD / D
        voice-leading.ts       # minimalVoiceLeading, circDelta
        neo-riemannian.ts      # P / L / R
        tonnetz.ts             # pc(i,j) = (7i+4j) mod 12, generación de triángulos
      rhythm/
        euclid.ts              # bjorklund, rotate
        layers.ts              # modelo de capa + audible/solo/mute
      codegen/
        strudel.ts             # rhythmToStrudel, melodyLine, chordToStrudel, buildSession, buildComposition, tempoWrap
      composition/
        model.ts               # bloques, pistas; arrange + stack + silence (padding)
    audio/
      strudel.ts               # init (gesto de usuario), runNow, queueForNextCycle, hush, setTempo(setcpm)
    render/
      stage.ts                 # PIXI app, lienzo compartido, cambio de vista
      tonnetz-scene.ts         # vista Armonía
      rhythm-scene.ts          # órbitas con morph radial⟷lineal
      theme.ts                 # tokens: colores por función tonal, fuentes
    agent/
      schema.ts                # Zod: { rhythm?, harmony?, note? } restringido al modelo de la UI
      providers.ts             # openrouter / openai / anthropic
      agent.ts                 # send, detección de skill, auto-corrector
      apply.ts                 # applyRhythmSpec / applyHarmonySpec -> state
    ui/                        # componentes Svelte (overlays y paneles)
      Transport.svelte  ViewToggle.svelte  HarmonyControls.svelte  RhythmControls.svelte
      ProgressionChips.svelte  CompositionDrawer.svelte  Timeline.svelte  CodeDrawer.svelte
      AgentPanel.svelte  Tooltip.svelte  Legend.svelte  Hud.svelte
    lib/
      persistence.ts           # guardar/cargar (localStorage) + codificar estado en URL para compartir
  tests/
    euclid.test.ts  voice-leading.test.ts  tonnetz.test.ts  codegen.test.ts  schema.test.ts
```

**Flujo de datos:** UI/PIXI escriben en `state/session` → el `state` deriva el código Strudel vía `core/codegen` →
`audio/strudel` lo ejecuta (`runNow`/`queueForNextCycle`). El agente produce un *spec* validado por Zod que `agent/apply`
vuelca en el `state`. Una sola fuente de verdad: el `state`.

---

## 5. Modelo de dominio (tipos a definir en TS)

```ts
type Quality = 'maj' | 'min' | 'dim' | 'aug';
type Mode = 'major'|'minor'|'dorian'|'phrygian'|'lydian'|'mixolydian'|'locrian'|'harmonic:minor';
type Sound = 'bd'|'sd'|'hh'|'oh'|'cp'|'rim'|'lt'|'mt'|'ht';

interface Chord { rootPc: number; qual: Quality; gain: number; /* 0..1.2 */ }
interface HarmonyState { root: number; mode: Mode; octave: number; progression: Chord[]; }

interface RhythmLayer { sound: Sound; steps: number[16]; euclid?: {k:number;n:number;rot:number}; muted?: boolean; solo?: boolean; }
interface RhythmState { layers: RhythmLayer[]; }

interface Block { id: string; name: string; type: 'groove'|'armonia'|'sesion'; code: string; bars: number; }
interface Track { id: string; blocks: { blockId: string; bars: number }[]; } // pistas se apilan; bloques en secuencia
interface Composition { blocks: Block[]; tracks: Track[]; }

interface SessionState { bpm: number; view: 'harmony'|'rhythm'; chordMode: 'chord'|'arp';
  harmony: HarmonyState; rhythm: RhythmState; composition: Composition;
  nowPlaying: { label: string; source: 'rhythm'|'harmony'|'session'|'chord'|'composition'|'preview'|'agent'|'editor'|null }; }
```

---

## 6. Invariantes y convenciones (NO romper)

**Musicales / de motor**
- 1 ciclo de Strudel = 1 compás de **4/4**. El tempo lo fija la app con **`setcpm`** según el BPM. **Nunca**
  `setcps`/`setcpm`/`.fast`/`.slow` para tempo en el código generado. El BPM cambia re‑evaluando y/o en vivo.
- Tonnetz: `pc(i,j) = (7i + 4j) mod 12`. ▲ = tríada mayor, ▼ = menor.
- P·L·R = las tres tríadas que comparten **arista** con la actual (dos notas comunes, una voz se mueve 1–2 semitonos).
- Voice‑leading mínimo = camino más corto en el orbifold (sumar `circDelta` con signo, elegir la permutación de menor Σ).
- Acordes: comas = bloque, espacios = arpegio. Volumen por acorde con `.gain("<g1 g2 …>")` alineado a la secuencia.
- Composición: pistas → `stack(...)` (suenan a la vez); bloques en una pista → `arrange([bars, code], …)`; rellenar
  pistas más cortas con `silence` para que reinicien alineadas.
- El agente solo puede generar lo que la interfaz soporta (ver §7); todo cambio en vivo se re‑encola al **próximo ciclo**.

**De código**
- TS `strict`. Motores en `core/**` sin imports de DOM/PIXI/Svelte → testeables.
- Audio arranca solo tras gesto de usuario; *feature‑detect* WebGL y degradar con mensaje claro.
- Sin claves/API en el repo. Tokens del agente: por usuario, en `localStorage` (o proxy serverless en fase futura).
- Mantener cabecera/licencia **AGPL‑3.0**.

**Producto/UX**
- Siempre debe quedar obvio **qué suena** y cómo pararlo (transporte claro: Ritmo / Armonía / Sesión / Composición / preview).
- Pedagógico: cajón de código en vivo, tooltips en términos clave (E(k,n), rot…), leyenda de colores y P·L·R.
- Colores por función tonal: tónica `#f3b15a`, subdominante `#56cfc4`, dominante `#e87bac`, acento `#8aa0ff`.

---

## 7. Skills del agente (validar con Zod)

El agente detecta intención (ritmo / armonía / ambos) y responde **un objeto JSON** restringido al modelo de la UI; la app
lo valida (Zod), lo aplica al `state` y verifica que **suena** (auto‑corrector). Esquema:

```json
{
  "rhythm":  { "layers": [ {"sound":"bd","steps":[1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]},
                           {"sound":"hh","euclid":{"k":5,"n":8,"rot":0}} ] },
  "harmony": { "root":"C", "mode":"minor", "octave":3,
               "progression":[ {"root":"C","quality":"min"}, {"root":"Ab","quality":"maj"} ] },
  "note": "frase breve en español"
}
```
Reglas: `sound ∈ {bd,sd,hh,oh,cp,rim,lt,mt,ht}`; `steps` = 16 enteros 0/1 **ó** `euclid {k:1..16, n:2..16, rot:0..n-1}`;
`mode` (los 8); `quality ∈ {maj,min,dim,aug}`; `octave 2..5`. Si el pedido no encaja en las skills → bloque `strudel` libre.

---

## 8. Plan de migración por fases (con criterios de aceptación)

**Fase 0 — Andamiaje.** Vite + TS + Svelte + ESLint/Prettier + Vitest. `reference/orbifold.html` en el repo. `index.html`
con el lienzo PIXI y montaje de la app vacía.
*Aceptación:* `npm run dev`, `npm run build`, `npm run test`, `tsc --noEmit` y `lint` pasan en limpio.

**Fase 1 — Núcleo puro (`core/**`) + pruebas.** Portar teoría (pitch, scales, chords, tonal‑function, voice‑leading,
neo‑riemannian, tonnetz), ritmo (euclid, layers) y codegen (Strudel). Tests Vitest que fijen el comportamiento del
prototipo.
*Aceptación:* tests verdes para `bjorklund`, `minimalVoiceLeading` (Σ y signos), P·L·R, y `codegen` (mismas cadenas Strudel
que el prototipo en casos clave).

**Fase 2 — Audio + estado.** `audio/strudel.ts` (init por gesto, runNow, queue, setTempo) y `state/session.ts` (store).
Reproducir Ritmo/Armonía/Sesión desde el estado.
*Aceptación:* suena el groove, la progresión y la sesión; el BPM cambia el tempo real; hot‑swap al próximo ciclo.

**Fase 3 — Render PIXI.** `render/stage`, `tonnetz-scene` (P·L·R + voice‑leading), `rhythm-scene` (morph radial⟷lineal,
controles por órbita solo/mute/eliminar al pasar el cursor). `theme.ts` con tokens.
*Aceptación:* paridad visual/funcional con el prototipo en ambas vistas.

**Fase 4 — UI Svelte.** Transporte (con "qué suena"), toggle de vista, controles de armonía (acorde/arpegio) y ritmo
(euclidiano + preview play/stop que no mueve el dial), chips de progresión con volumen por arrastre, cajón de código,
tooltips.
*Aceptación:* todas las interacciones del prototipo funcionan y se ven consistentes.

**Fase 5 — Composición (DAW).** Timeline de pistas/bloques, ancho = compases con snap y resize, scroll horizontal,
cabezal de reproducción y play/pausa/stop; guardar bloques (groove/armonía/sesión).
*Aceptación:* armar una composición de varias pistas que suenan a la vez y verla reproducirse con el cabezal.

**Fase 6 — Agente con skills.** `agent/` (providers, schema Zod, send, apply, auto‑corrector). Actualiza la interfaz y
valida que suena.
*Aceptación:* "un groove de hip‑hop y una progresión menor" actualiza ritmo+armonía y queda listo para componer.

**Fase 7 — Persistencia y compartir.** `lib/persistence.ts`: guardar/cargar sesiones (localStorage) y **codificar el estado
en la URL** para compartir un enlace.
*Aceptación:* abro un enlace y se reconstruye la sesión.

**Fase 8 — Publicación.** Build estático + despliegue (ver §9) + README + LICENSE.
*Aceptación:* URL pública que un amigo abre y usa (con su propia API key para el agente).

**Fases futuras:** migración PIXI v8; PWA/offline; export de audio/MIDI; i18n; proxy serverless para ocultar claves;
guardado en la nube/colaboración.

---

## 9. Publicación / despliegue para amigos

- App **100% estática** → desplegar en **Netlify / Vercel / Cloudflare Pages / GitHub Pages**. Para compartir rápido:
  `vite build` y subir `dist/` (o conectar el repo).
- **API key del agente:** cada amigo usa la suya, guardada en su navegador (`localStorage`). No hay backend ni se exponen
  claves. Si más adelante querés ocultar la clave, agregá una **función serverless** (Cloudflare Workers / Vercel) que haga
  de proxy y guarde la clave como variable de entorno.
- Servir siempre por HTTP/HTTPS (el audio del navegador no arranca desde `file://`).

---

## 10. Calidad, pruebas y CI

- Unitarias (Vitest) para todo `core/**` (es donde vive la "verdad musical").
- `tsc --noEmit`, ESLint y Prettier en pre‑commit (husky + lint‑staged) y en CI (GitHub Actions / equivalente).
- Validación Zod de: salida del agente y formato de sesión guardada (evita romper al cargar enlaces viejos → versionar el
  esquema).
- Humo E2E opcional (Playwright): cargar la app, tocar un acorde, sonar un groove.

---

## 11. Licencia

El proyecto **hereda AGPL‑3.0** por usar Strudel. El repo debe ser AGPL‑3.0 y con código fuente disponible al publicarlo.
Revisar también licencias de fuentes (Fraunces, Albert Sans, IBM Plex Mono — OFL) y de los samples antes de empaquetar.

---

## 12. Primeras tareas para Claude Code (empezá por acá)

1. Proponé y confirmá conmigo el **nombre del paquete**, gestor (`pnpm`/`npm`) y si vamos con **Svelte** (recomendado) o React.
2. **Fase 0:** andamiaje Vite + TS + Svelte + ESLint/Prettier + Vitest. Dejá `npm run dev|build|test|lint` y `tsc --noEmit`
   pasando. Subí `reference/orbifold.html` y añadí `LICENSE` (AGPL‑3.0) y un `README.md` inicial.
3. **Fase 1:** portá el núcleo puro con sus pruebas (empezá por `euclid`, `voice-leading`, `tonnetz`, `codegen`), tomando el
   comportamiento del prototipo como referencia.
4. Trabajá **incrementalmente**: una fase por PR/commit, con su criterio de aceptación verificado, sin romper lo anterior.
   Mostrame diffs y explicá brevemente cada decisión (musical o técnica). Ante dudas de API de Strudel/PIXI, consultá la doc
   vigente antes de afirmar.

> Mantené el espíritu del prototipo: claro, pedagógico, bello y fiel a la geometría de Tymoczko. Robustez sin perder el alma.