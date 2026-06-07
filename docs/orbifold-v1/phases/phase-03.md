# Phase 03 — PIXI Render Layer

**Purpose:** Implement the four render-layer modules (`theme.ts`, `stage.ts`, `tonnetz-scene.ts`, `rhythm-scene.ts`) using the PixiJS v7 API, wiring them reactively to `sessionStore` so that the Tonnetz harmony view and the rhythm-orbit view display with visual and functional parity to `reference/orbifold.html`.
**Gate:** Phase 02 is complete and Pilot-approved (119 parity tests green; `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all exit 0; audio and session store fully implemented; `pixi.js@7.4.2` is installed and pinned in `package.json`).
**Expected phase result:** A developer running `pnpm dev` sees the full-screen PIXI canvas with the Tonnetz grid drawn in tonal-function colors; clicking a triangle selects a chord, highlights P·L·R neighbors, and draws a voice-leading path; switching to rhythm view shows animated orbits that morph radial↔linear; hovering an orbit shows solo/mute/delete controls; all state changes in `sessionStore` trigger scene re-renders; the Phase 02 transport buttons remain functional; `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all exit 0.

---

## Step 03.1 — Inventory

PROMPT → Read `CLAUDE.md`, `references/methodology.md`, `references/dev-role.md`, `references/inventory-template.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-03.md`, `ORBIFOLD_KICKOFF.md §4–6`, `docs/adr/0003-tonnetz-pure-representation.md`, and `docs/adr/0004-svelte-store-for-session-state.md`. Then read `reference/orbifold.html` lines 880–1410 (the full PIXI render section). Read the installed v7 API by inspecting `node_modules/pixi.js/dist/cjs/pixi.js` (or `node_modules/pixi.js/lib/`) — not from v8 docs. Produce `docs/orbifold-v1/inventories/phase-03-inventory.md` following the inventory template exactly. Do NOT write any source code. Stop after committing the inventory file.

The inventory must address:

**PIXI v7 API confirmation (from node_modules, not from memory or v8 docs).** For each API used by the render plan, confirm the exact call signature from the installed package:
- `new PIXI.Application({ resizeTo, backgroundAlpha, antialias, resolution, autoDensity })` — confirm option names
- `new PIXI.Graphics()` and its v7 draw methods: `beginFill(color, alpha)`, `endFill()`, `lineStyle(width, color, alpha)`, `drawPolygon([x0,y0,...])`, `drawCircle(x, y, r)`, `moveTo`, `lineTo`, `clear()`
- `new PIXI.Container()` — `addChild`, `removeChildren`, `visible`, `alpha`
- `new PIXI.Text(str, style)` — `anchor.set(0.5)`, `resolution`, `x`, `y`
- `app.ticker.add(fn)` — confirm tick function signature `(delta: number) => void`
- `app.screen.width`, `app.screen.height`
- `app.view` — the canvas HTMLCanvasElement
- Interactive events: the prototype uses manual pointer hit-testing (not PIXI's `interactive` flag) — confirm the prototype pattern and whether it should be preserved
- WebGL feature-detection: prototype uses `typeof PIXI === 'undefined'` (CDN guard); the port must detect WebGL canvas support before calling `new PIXI.Application` — confirm the correct browser API (`canvas.getContext('webgl2') || canvas.getContext('webgl')`)

**Prototype render function mapping.** For each target file, list the prototype source functions with exact line ranges:

- `src/render/theme.ts`:
  - `COL` constant (lines 882–884): color tokens as hex numbers
  - `FUNC_COL` (line 884): tonal-function color map
  - CSS custom properties (lines 33–36): `--tonic`, `--subdom`, `--dom`, `--accent` as the canonical design-token values
  - Font families used: Fraunces (serif), Albert Sans (sans-serif), IBM Plex Mono (monospace) — confirm availability in Vite project (they are loaded from Google Fonts in the prototype; the port must declare them as CSS or font-face imports; this is an open decision)

- `src/render/stage.ts`:
  - `initPixi()` (lines 900–944): PIXI Application creation; `harmonyLayer` and `rhythmLayer` containers; `hGrid`, `hPath`, `hNodes`, `hDyn`, `hLabels`, `hNRG`, `hNRL`, `rRings`, `rDyn`, `rLabels` Graphics/Container creation; `app.ticker.add(tick)`; debounced resize handler (lines 935–943)
  - View-switching: `rhythmLayer.visible=false/true` toggled by current view — confirm how `sessionStore.view` drives this
  - The prototype mounts `app.view` into a `div#pixiMount`; the port replaces the `<canvas id="pixi-canvas">` stub in `App.svelte` with the PIXI canvas — confirm the mounting strategy (PIXI's `resizeTo` vs manual sizing)

- `src/render/tonnetz-scene.ts`:
  - `buildTonnetz()` (lines 947–1025): layout computation `pos(i,j)`, node/triangle generation (consuming `computeTonnetzNodes`/`computeTonnetzTriangles` from `core/theory/tonnetz.ts` per ADR 0003), triangle fill by tonal function, edge drawing, node circles, note-name labels
  - `computeNR()` (lines 1250–1279): P·L·R neighbor highlighting (label text + `hNRG` outline) — reads from `lastPick` in the prototype; in the port, reads from `sessionStore.harmony.progression` last entry
  - `tickHarmony(phase, now, barMs)` (lines 1085–1143): animated triangle pulses for active chord, voice-leading path on `hPath`, particle on path, P·L·R animated glow on `hNRG`
  - `pickChord(tri)` (lines 1352–1377): chord selection, voice-leading HUD, `melState.progression.push`, `computeNR()`, `requeueLive()` — in the port, `pickChord` writes to `sessionStore` via `sessionStore.update`
  - `onStagePointer` for harmony view (lines 1281–1293): hit-test `pointInTri`, call `pickChord`
  - `updateSuggestions()` (lines 1387–1408): suggestion triangles glow for tonal-function next chord
  - `nrLabel()` (lines 1238–1248): already ported to `core/theory/neo-riemannian.ts` (Phase 01) — the scene calls `core` exports, no re-implementation

- `src/render/rhythm-scene.ts`:
  - `rebuildRhythmGeo()` (lines 1030–1056): dual-layout geometry computation — both polar and linear positions for each step of each layer
  - `buildRhythmScene()` (lines 1057–1070): layer sound labels, BPM center label, subtitle
  - `tickRhythm(phase)` (lines 1146–1215): morph easing, orbit guide ring, step dots, playhead, label repositioning
  - `onStagePointer` for rhythm view (lines 1288–1293): nearest-step hit-test, step toggle, `requeueLive()`
  - `onStageContext` for rhythm right-click (lines 1296–1304): mute toggle on nearest layer
  - `onStageHover` (lines 1336–1341): nearest-layer detection → `showLayerCtl`
  - `showLayerCtl` / `hideLayerCtl` (lines 1325–1334): the prototype uses a DOM overlay `div#layerCtl`; the port must decide: DOM overlay positioned over the canvas vs PIXI Container (open decision)
  - `tick(delta)` (lines 1073–1082): top-level ticker dispatching to `tickHarmony` or `tickRhythm` based on current view

**Scene lifecycle.** Define the lifecycle contract the inventory must establish:
- `initStage(canvasEl: HTMLCanvasElement): void` — creates PIXI Application, appends `app.view`, sets up containers, registers ticker, registers pointer/resize handlers. Called once from `App.svelte` `onMount`.
- `buildTonnetz(state: SessionState): void` — (re)builds all static geometry; called on init and on resize.
- `buildRhythmScene(state: SessionState): void` — (re)builds orbit geometry and labels; called on init and on resize.
- `updateTonnetzDynamic(state: SessionState): void` — updates P·L·R highlights, chord selection, suggestions; called on `sessionStore` changes affecting harmony.
- `updateRhythmDynamic(state: SessionState): void` — updates step-dot state, layer labels; called on `sessionStore` changes affecting rhythm.
- Store reactivity: `App.svelte` subscribes to `sessionStore` and calls the appropriate update functions when the relevant slice changes. The ticker drives the animated portions (pulse, path particle, morph easing, playhead) — these do NOT subscribe to the store; they read module-level state set by the update functions.

**Open decisions to surface (inventory must list all of these):**
- OD-1: **Layer-control overlay mechanism** — The prototype uses a positioned DOM overlay (`div#layerCtl`) that appears near the hovered orbit step. The port options are: (a) keep DOM overlay, positioned via `app.view.getBoundingClientRect()` + pointer coordinates, rendered as a Svelte component or plain DOM; (b) PIXI Container overlay inside the canvas. CLAUDE.md states Phase 04 replaces the full Svelte UI; a DOM overlay for layer controls may collide with Phase 04 scope. Pilot must decide before step 03.5.
- OD-2: **Font loading strategy** — The prototype loads fonts from Google Fonts via a `@import` in the `<style>` tag. The Vite project has no global CSS file yet; fonts can be loaded via: (a) a `<link>` tag in `index.html`; (b) `@import` in `src/app.css` imported from `main.ts`; (c) local font files bundled with Vite. The inventory must present options and confirm the Pilot's choice before step 03.2.
- OD-3: **`App.svelte` canvas mounting strategy** — The `<canvas id="pixi-canvas">` stub in `App.svelte` currently has `height: 0`. PIXI v7's `resizeTo` option takes a DOM element whose dimensions drive the canvas size. The port can: (a) use `resizeTo: document.getElementById('stage')` (add a full-screen `div#stage` wrapping the canvas, matching prototype line 906); (b) use `resizeTo: window`; (c) manage canvas size manually on resize. The inventory confirms which option matches the prototype and works with the existing `App.svelte` layout.
- OD-4: **`sessionStart` reference for phase computation** — The prototype's `tick()` uses `sessionStart` (set when playback begins) to compute bar phase for animated chord pulses and playhead. The port's audio layer (`src/audio/strudel.ts`) does not expose `sessionStart`. The inventory must decide where this value lives: in the `sessionStore` (set by `playGroove`/`playSession` calls), in the render layer as a module-local variable reset on `updateTonnetzDynamic`, or approximated differently.

Implementation requirements:
- Read the installed `pixi.js@7.4.2` package from `node_modules/pixi.js/` to confirm every API call before asserting it. Do not use v8 docs.
- Map every prototype render function to its target file with exact prototype line ranges.
- Document the scene lifecycle contract (init, build, update, destroy).
- List all open decisions with options and recommendations.
- Count files to be touched (must stay under 15).
- Do NOT write any source code.

Validation:
- No source files changed — only `docs/orbifold-v1/inventories/phase-03-inventory.md` and handoff created.

Expected result:
- `docs/orbifold-v1/inventories/phase-03-inventory.md` exists with PIXI v7 API confirmations, prototype function map with line ranges, lifecycle contract, and open decisions OD-1 through OD-4.
- Handoff entry for step 03.1 committed.

CHECKPOINT → Commit message:
`docs(render): Phase 03 step 03.1 — phase-03 inventory`

---

## Step 03.2 — theme.ts + PIXI Application init (stage.ts)

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-03.md`, the step 03.1 handoff entry (including all open-decision resolutions the Pilot provided), `docs/orbifold-v1/inventories/phase-03-inventory.md`, and `src/app/App.svelte`. Do NOT proceed until OD-2 (font loading) and OD-3 (canvas mounting) are resolved in the inventory or the Pilot's invocation prompt. Implement `src/render/theme.ts`, `src/render/stage.ts`, and update `src/app/App.svelte` to initialize the PIXI stage.

Implementation requirements:

**`src/render/theme.ts`** (prototype lines 882–884 + CSS lines 33–36):
- Export a `COL` const object with all hex color tokens as typed numbers: `node: 0xcfd6e6`, `faint: 0x39404f`, `line: 0x232734`, `accent: 0x8aa0ff`, `tonic: 0xf3b15a` (= `--tonic`), `subdom: 0x56cfc4` (= `--subdom`), `dom: 0xe87bac` (= `--dom`), `bg: 0x0b0d12`.
- Export a `FUNC_COL` const: `{ tonic: COL.tonic, subdom: COL.subdom, dom: COL.dom }` typed as `Record<string, number>`.
- Export font-family constants: `FONT_SERIF = 'Fraunces, serif'`, `FONT_SANS = 'Albert Sans, sans-serif'`, `FONT_MONO = 'IBM Plex Mono, monospace'` — matching the prototype's Text style declarations.
- No imports from PIXI, DOM, or Svelte — this file is pure constants. TypeScript `strict`. AGPL-3.0 header.

**`src/render/stage.ts`** (prototype lines 900–944, `initPixi()`):
- Export `initStage(canvasEl: HTMLCanvasElement): PIXI.Application | null`.
- Before creating the PIXI Application: detect WebGL support via `canvasEl.getContext('webgl2') || canvasEl.getContext('webgl')`. If unavailable, set an error message on a sibling DOM element (or return `null`) and return `null`. This satisfies the CLAUDE.md invariant "feature-detect WebGL and degrade with a clear message."
- Create `app = new PIXI.Application({ resizeTo: <per OD-3 resolution>, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true })` — matching prototype line 907–912.
- Append `app.view` to the appropriate DOM parent (per OD-3 resolution).
- Create all PIXI containers and graphics layers matching the prototype exactly: `harmonyLayer`, `rhythmLayer`, `hGrid`, `hPath`, `hNodes`, `hDyn`, `hLabels`, `hNRG`, `hNRL` (prototype lines 916–924); `rRings`, `rDyn`, `rLabels` (lines 925–926).
- Add layers to `app.stage` in the same order as the prototype (`harmonyLayer`, `rhythmLayer`); add graphics children to their layer in the same order (prototype lines 923–926).
- Set `rhythmLayer.visible = false` (prototype line 917).
- Export `setView(view: 'harmony' | 'rhythm'): void` — toggles `harmonyLayer.visible` / `rhythmLayer.visible` matching prototype view-switching behavior.
- Register a debounced `window.resize` handler (120 ms, matching prototype lines 935–943) that triggers callbacks registered via `export function onResize(cb: () => void): void`.
- Do NOT call `buildTonnetz()` or `buildRhythmScene()` from `stage.ts` — those are called from the scene modules once the stage is ready.
- Export `getApp(): PIXI.Application | null` for scene modules to access the shared application.
- PIXI import: `import * as PIXI from 'pixi.js'`. TypeScript `strict`. AGPL-3.0 header.

**`src/app/App.svelte`** (wire PIXI init):
- In `onMount`, after seeding the store defaults (already there from Phase 02), call `initStage(canvasElement)` where `canvasElement` is a bound reference to `<canvas id="pixi-canvas">`.
- Update the canvas element's CSS so it fills the viewport: `position: absolute; top: 0; left: 0; width: 100%; height: 100%` — this is the backing surface for PIXI's `resizeTo`.
- If `initStage` returns `null` (WebGL unavailable), display a visible fallback message: "Tu navegador no soporta WebGL. Orbifold no puede funcionar." (matching the spirit of prototype line 902–904).
- The Phase 02 temporary transport buttons remain — do NOT remove them. Add a CSS `z-index` or `position: relative` so they render above the canvas. (Phase 04 will replace this layout.)
- Do not call any scene build functions yet — stage.ts is not wired to scenes until step 03.3.

Validation:
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `pnpm build` → exit 0
- `pnpm test` → 119 passed (no regressions; render modules have no unit tests)
- Parity note: the PIXI Application options, container hierarchy, and layer order match prototype lines 900–926 exactly as cited.

Expected result:
- `src/render/theme.ts` exports `COL`, `FUNC_COL`, `FONT_SERIF`, `FONT_SANS`, `FONT_MONO`.
- `src/render/stage.ts` creates the PIXI application and all child containers, handles WebGL degradation, exposes `initStage`, `getApp`, `setView`, `onResize`.
- `App.svelte` mounts the canvas and calls `initStage` on mount.
- `pnpm dev` + browser: blank canvas visible (full viewport); transport buttons overlay it; no PIXI errors in console.

CHECKPOINT → Commit message:
`feat(render): Phase 03 step 03.2 — theme tokens and PIXI stage initialization`

---

## Step 03.3 — Tonnetz scene: static geometry

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-03.md`, the step 03.2 handoff entry, `docs/orbifold-v1/inventories/phase-03-inventory.md`, `docs/adr/0003-tonnetz-pure-representation.md`, `src/core/theory/tonnetz.ts`, and `src/state/session.ts`. Implement the static geometry portion of `src/render/tonnetz-scene.ts`: build the Tonnetz grid, draw triangle fills and edges, draw node circles and note-name labels, and wire the initial build call into `App.svelte`.

Implementation requirements:

**`src/render/tonnetz-scene.ts`** — static build (prototype `buildTonnetz()`, lines 947–1025):
- Export `buildTonnetz(state: SessionState): void`. Called once on init and on resize.
- Pixel layout: `pos(i, j) = { x: cx + i*cell + j*cell*0.5, y: cy - j*rowH }` with `cell = Math.max(78, Math.min(132, Math.min(W,H)/6.4))` and `rowH = cell * 0.866` — matching prototype lines 953–954 exactly.
- Node iteration range: `cols = Math.ceil(W / cell) + 4`, `rows = Math.ceil(H / rowH) + 4`, `ci = Math.ceil(cols/2)`, `cj = Math.ceil(rows/2)` — matching prototype lines 956–958.
- Call `computeTonnetzNodes(iRange, jRange)` and `computeTonnetzTriangles(nodes, root, mode)` from `core/theory/tonnetz.ts` to get the pure lattice data (per ADR 0003). The render layer adds `{x, y}` pixel positions to the returned nodes by mapping `pos(n.i, n.j)` — this does NOT mutate the core types; use a local `RenderNode = TonnetzNode & { x: number; y: number }` type.
- Triangle fill: for each triangle, call `hGrid.beginFill(fill, alpha)`, `hGrid.lineStyle(0)`, `hGrid.drawPolygon([v0.x,v0.y, v1.x,v1.y, v2.x,v2.y])`, `hGrid.endFill()`. Fill color: `COL.bg` with alpha `0.04` for out-of-key triangles; `FUNC_COL[info.func.cls]` (or `COL.node` fallback) with alpha `0.16` for in-key triangles — matching prototype lines 994–1001.
- Edge drawing: `hGrid.lineStyle(1, COL.line, 0.9)` then `moveTo`/`lineTo` for each triangle's three edges — matching prototype lines 1003–1009.
- Node circles: for each node, determine `inScale` from `SCALE_INTERVALS[mode]` and root (use `src/core/theory/scales.ts` `SCALE_INTERVALS`). Draw: `hNodes.beginFill(0x0c0e13, 1); hNodes.lineStyle(1.4, inScale?COL.accent:COL.faint, inScale?0.8:0.5); hNodes.drawCircle(n.x, n.y, inScale?13:10); hNodes.endFill()` — matching prototype lines 1015–1016.
- Note-name labels: `new PIXI.Text(NOTE_NAMES[n.pc], { fontFamily: FONT_SERIF, fontSize: inScale?15:12.5, fill: inScale?0xeaedf4:0x6d7384, fontWeight:'500' })` with `anchor.set(0.5)`, `resolution: 2` — matching prototype lines 1017–1022. Use `NOTE_NAMES` from `src/core/theory/pitch.ts`.
- Store module-level arrays `_renderNodes: RenderNode[]` and `_renderTris: RenderTri[]` (where `RenderTri` adds `{x, y}` per vertex and centroid `{cx, cy}` for hit-testing). These are the only module-level mutable state needed by subsequent reactive updates.
- Call `hGrid.clear()`, `hNodes.clear()`, `hLabels.removeChildren()` at the top of `buildTonnetz` before rebuilding — matching prototype line 949.
- Do NOT implement `pickChord`, `computeNR`, `tickHarmony`, or pointer events in this step.

**`src/app/App.svelte`** (wire initial build):
- After `initStage(canvasElement)` succeeds (non-null return), call `buildTonnetz(get(sessionStore))` immediately.
- Register a resize callback via `onResize(() => { buildTonnetz(get(sessionStore)); buildRhythmScene(get(sessionStore)); })` — `buildRhythmScene` is a stub import from rhythm-scene that will be fleshed out in step 03.5; for now, it can be a no-op export from `rhythm-scene.ts`.

Validation:
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `pnpm build` → exit 0
- `pnpm test` → 119 passed (no new tests; render has no headless tests)
- Prototype parity: cite prototype lines 947–1025 for all geometry/draw logic.
- Parity note (operability — Pilot browser test): Tonnetz grid visible on screen with triangles colored by tonal function; node circles drawn with scale-member highlighting; note-name labels positioned correctly; triangle fills match prototype color scheme.

Expected result:
- `src/render/tonnetz-scene.ts` exports `buildTonnetz` (static build) and module-level `_renderNodes`, `_renderTris`.
- `pnpm dev` + browser: Tonnetz grid drawn over the full canvas; tonal-function triangle colors visible; note-name labels on each node.

CHECKPOINT → Commit message:
`feat(render): Phase 03 step 03.3 — Tonnetz static geometry and tonal-function coloring`

---

## Step 03.4 — Tonnetz scene: interactivity, P·L·R, voice-leading, animation

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-03.md`, the step 03.3 handoff entry, `docs/orbifold-v1/inventories/phase-03-inventory.md`, `src/core/theory/neo-riemannian.ts`, `src/core/theory/voice-leading.ts`, and `src/state/session.ts`. Implement the interactive and animated portions of `src/render/tonnetz-scene.ts`: chord pick, P·L·R highlighting, voice-leading path, tick animation, suggestion triangles.

Implementation requirements:

**`src/render/tonnetz-scene.ts`** — interactivity and animation (prototype lines 1085–1143, 1230–1280, 1352–1408):
- Export `updateTonnetzDynamic(state: SessionState): void`. Called by `App.svelte`'s store subscription when `harmony` or `nowPlaying` changes. This function:
  - Recomputes `_lastPick` from `state.harmony.progression` last entry (matches `lastPick` in prototype line 1231).
  - Calls the P·L·R neighbor computation (`computeNR()` equivalent): finds the triangle in `_renderTris` matching `lastPick.rootPc` and `lastPick.qual`, then finds triangles sharing exactly 2 vertices; uses `nrLabel()` from `src/core/theory/neo-riemannian.ts` to label them P/L/R; clears and rebuilds `hNRL` text labels with `FONT_SANS`, `fontSize: 17`, `fill: 0xb9c6ff`, `fontWeight: '800'` at each neighbor triangle's centroid — matching prototype lines 1250–1279.
  - Recomputes `_suggestionTris` from `state.harmony.progression` last entry's tonal function — matching prototype `updateSuggestions()` lines 1387–1408.

- Export `onStagePointerDown(e: PointerEvent): void`. Called by the canvas pointer listener in `App.svelte` when `view === 'harmony'`. Implements `pointInTri` hit-test (prototype lines 1222–1229) to find the clicked triangle, then calls `pickChord(tri, state)`.

- `pickChord(tri: RenderTri, state: SessionState): void` (internal, prototype lines 1352–1377):
  - Appends `{ rootPc, qual, gain: 0.6 }` to `sessionStore`'s `harmony.progression` via `sessionStore.update`.
  - Calls `playChord(rootPc, qual, gain)` from `src/state/session.ts` (equivalent to prototype `runNow(code)` + `setNowPlaying('Acorde · ...', 'chord')`).
  - Calls `requeueLive()` from `src/state/session.ts` (equivalent to prototype's `requeueLive()` call).
  - Computes `minimalVoiceLeading` from `src/core/theory/voice-leading.ts` if there is a previous chord; stores the result in module-level `_lastVL` for the HUD (Phase 04 will display it; Phase 03 only computes it).
  - Note: `src/state/session.ts` must export a `playChord(rootPc, qual, gain)` function equivalent to prototype lines 1357–1360: derives `chordToStrudel(rootPc, qual, gain)` and calls `audio.runNow`; sets `nowPlaying` to `{ label: 'Acorde · ' + chordLabel(rootPc, qual), source: 'chord' }`. If this function does not yet exist in the store, add it in this step (it is a pure transport method, following the same lazy-audio pattern as the other transport methods from step 02.4).

- Export `tickHarmony(phase: number, now: number, barMs: number): void`. Called from the stage ticker when `view === 'harmony'`. Implements (prototype lines 1085–1143):
  - `hDyn.clear()` and `hPath.clear()`.
  - Voice-leading path on `hPath`: a glow line (width 7, alpha 0.10) and a sharp line (width 2, alpha 0.85) between progression chord centroids; a traveling particle on the last segment using `particle = (particle + delta * 0.012) % 1` — matches prototype lines 1092–1103. `delta` is the ticker delta; store as module-level `_particle` mutated each tick.
  - Active chord pulse on `hDyn`: each progression chord gets an outline/fill on its triangle with animated alpha `0.20 + 0.12*Math.sin(phase*Math.PI*2)` for the active chord; centroid marker circles with `pulse = 0.5 + 0.35*Math.sin(phase*Math.PI*2)` for the active one — matching prototype lines 1109–1120.
  - Suggestion triangle glow on `hDyn` using `_suggestionTris`: tonal-function colors, animated alpha — matching prototype lines 1122–1130.
  - P·L·R animated glow on `hNRG`: cleared and redrawn each tick with animated alpha `0.45 + 0.3*Math.sin(now*0.005)` for neighbor outlines; `hNRL.alpha` animated — matching prototype lines 1132–1143.

- Export `registerTicker(app: PIXI.Application): void`. Called once from `App.svelte` after `initStage`. Registers the top-level tick function on `app.ticker` that dispatches to `tickHarmony` or `tickRhythm` based on the current view (reads module-level `_currentView` set by `setView` in stage.ts). The tick function signature is `(delta: number) => void` (PIXI v7 ticker delta).

- Phase computation for `tickHarmony`: `sessionStart` (the timestamp when playback began) is not available from the audio layer. Use a module-level `_sessionStart = performance.now()` reset by `updateTonnetzDynamic` whenever `nowPlaying.source` changes from null/`undefined` to a playing source — this approximates the prototype's behavior (prototype lines 1077–1078).

**`src/app/App.svelte`** updates:
- Subscribe to `sessionStore` changes. When `harmony` changes, call `updateTonnetzDynamic(state)`. When `view` changes, call `setView(state.view)` from stage.ts.
- Add a `pointerdown` listener on `canvasElement` that calls `onStagePointerDown(e)` when `state.view === 'harmony'`.
- After `buildTonnetz` completes, call `registerTicker(app)` once. Wire `tickHarmony` and `tickRhythm` stubs (rhythm stub can be no-op for now) into the ticker dispatch.

Validation:
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `pnpm build` → exit 0
- `pnpm test` → 119 passed (no regressions)
- Prototype parity: cite lines 1085–1143 (tick), 1230–1279 (NR), 1352–1408 (pick + suggestions) for all interactive logic.
- Parity note (operability — Pilot browser test): clicking a Tonnetz triangle plays the chord and highlights it with an accent border; the voice-leading path animates between progression chords; P·L·R neighbors show pulsing labels; suggestion triangles glow with their tonal-function color.

Expected result:
- `src/render/tonnetz-scene.ts` fully interactive: `buildTonnetz`, `updateTonnetzDynamic`, `onStagePointerDown`, `tickHarmony`, `registerTicker` all exported.
- `pnpm dev` + browser: clicking triangles plays chords, P·L·R labels animate, voice-leading path connects progression chords.

CHECKPOINT → Commit message:
`feat(render): Phase 03 step 03.4 — Tonnetz interactivity, P·L·R highlights, voice-leading animation`

---

## Step 03.5 — Rhythm scene + full reactive wiring

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-03.md`, the step 03.4 handoff entry, `docs/orbifold-v1/inventories/phase-03-inventory.md`, and the OD-1 resolution (layer-control overlay). Do NOT proceed until OD-1 is resolved. Implement `src/render/rhythm-scene.ts` in full, then complete the reactive wiring of both scenes to `sessionStore` in `App.svelte`.

Implementation requirements:

**`src/render/rhythm-scene.ts`** (prototype lines 1028–1215, 1288–1349):
- Export `buildRhythmScene(state: SessionState): void`. Called on init and on resize:
  - Calls `rebuildRhythmGeo(state)` (internal): computes dual polar/linear geometry for each layer, matching prototype `rebuildRhythmGeo()` lines 1030–1056 exactly: `maxR = Math.min(W,H)*0.40`, `innerR = maxR*0.30`, `ringStep`, `Wlin = Math.min(W*0.82, 980)`, `rowGap = Math.min(70, (Math.min(W,H)*0.62)/Math.max(L,1))`.
  - Clears `rLabels` children.
  - Creates layer sound labels (`FONT_MONO`, `fontSize: 11.5`, `fill: muted?0x6d7384:0xb9c0d0`) — matching prototype lines 1062–1064.
  - Creates center BPM label (`FONT_SERIF`, `fontSize: 16`, `fill: 0xeaedf4`) and subtitle (`FONT_MONO`, `fontSize: 9`, `fill: 0x6d7384`) — matching prototype lines 1066–1069.

- Export `updateRhythmDynamic(state: SessionState): void`. Called by `App.svelte`'s store subscription when `rhythm` changes. Rebuilds label muted/solo state without rebuilding full geometry (rebuild full only on resize).

- Export `tickRhythm(phase: number): void`. Called from the stage ticker when `view === 'rhythm'`. Implements (prototype lines 1146–1215):
  - Morph easing: `_rMorph += (_rLayoutTarget - _rMorph) * 0.10`; snap threshold `0.0015` — matching prototype lines 1150–1151.
  - `rRings.clear()`, `rDyn.clear()`.
  - For each layer orbit: guide ring (16-gon) drawn with `lerp(polar, linear, morph)` per step — prototype lines 1159–1163. Step dots: active steps = accent circles (`r=7.5`); inactive = small neutral circles (`r=4.2`), beat-1-of-4 uses `COL.faint` border — prototype lines 1166–1176.
  - Label repositioning via `lerp` between polar and linear label positions — prototype line 1180.
  - Center clock (radial only, fades as `morph → 1`) — prototype lines 1184–1188.
  - Playhead: when `isPlaying()` from `src/audio/strudel.ts` and current source is not `'preview'`, draw a radial spoke/linear bar morphing between the two, and highlight the current step dot in white + accent — matching prototype lines 1192–1214. The phase value passed from the ticker is `((performance.now() - _sessionStart) % barMs) / barMs` where `_sessionStart` is reset the same way as in `tonnetz-scene.ts`.

- Export `onStagePointerDown(e: PointerEvent): void` for rhythm view (prototype lines 1288–1293):
  - Nearest-step hit-test across all `_rStepPos` arrays; if within 22 px, toggle `state.rhythm.layers[li].steps[si]` via `sessionStore.update`, then call `requeueLive()`.

- Export `onStageContextMenu(e: PointerEvent): void` for rhythm view right-click (prototype lines 1296–1304):
  - `e.preventDefault()`, nearest-layer hit-test within 46 px; toggle `muted` on the layer via `sessionStore.update`; call `buildRhythmScene(state)` and `requeueLive()`.

- **Hover controls (per OD-1 resolution):** implement using the approach chosen by the Pilot. The prototype (lines 1317–1349) uses a DOM overlay positioned by `left/top` CSS. If OD-1 resolution is DOM overlay:
  - Export `onStagePointerMove(e: PointerEvent, state: SessionState): void` — nearest-layer detection within 40 px; if found, dispatch a custom DOM event or call a callback to show the overlay.
  - The overlay itself is a Svelte component in `App.svelte` (or inline HTML) with solo/mute/delete buttons. It reads `layerIndex` from module-level state and calls `sessionStore.update` on each action.
  - If OD-1 resolution is PIXI Container: implement entirely inside `rhythm-scene.ts` using PIXI Text/Graphics for the three controls.
  - In either case: solo toggles `layer.solo`, mute toggles `layer.muted`, delete splices the layer — all via `sessionStore.update`; each action calls `buildRhythmScene(state)` and `requeueLive()` matching prototype lines 1347–1349.

**`src/app/App.svelte`** — complete reactive wiring:
- Store subscription drives both scenes:
  - On `harmony` change → `updateTonnetzDynamic(state)`.
  - On `rhythm` change → `updateRhythmDynamic(state)` (and `buildRhythmScene(state)` if the number of layers changed).
  - On `view` change → `setView(state.view)`.
  - On `bpm` change → update the center BPM label in rhythm scene (call a `setBpmLabel(bpm)` export from rhythm-scene or rebuild).
- Canvas pointer event routing: `pointerdown` → call `tonnetz-scene.onStagePointerDown` or `rhythm-scene.onStagePointerDown` based on `state.view`. `contextmenu` → `rhythm-scene.onStageContextMenu`. `pointermove` → `rhythm-scene.onStagePointerMove` (only in rhythm view).
- `buildRhythmScene(get(sessionStore))` called once after `initStage` succeeds (alongside `buildTonnetz`).
- `onResize` callback calls both `buildTonnetz(get(sessionStore))` and `buildRhythmScene(get(sessionStore))`.

Validation:
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `pnpm build` → exit 0
- `pnpm test` → 119 passed (no regressions)
- Prototype parity: cite lines 1030–1070 (rhythm geometry/labels), 1146–1215 (tick), 1288–1349 (interaction + hover controls) for all rhythm logic.
- Parity note (operability — Pilot browser test): rhythm view shows animated orbit rings that morph radial↔linear; step dots light up when toggled; playhead sweeps when groove is playing; hovering a layer reveals solo/mute/delete controls.

Expected result:
- `src/render/rhythm-scene.ts` fully implemented.
- `App.svelte` reactively wires both scenes to `sessionStore`.
- `pnpm dev` + browser: both views are interactive and animated with parity to the prototype.

CHECKPOINT → Commit message:
`feat(render): Phase 03 step 03.5 — rhythm scene, radial↔linear morph, hover controls, full store wiring`

---

## Step 03.6 — Operability verification and phase closure

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-03.md`, and all prior step entries in `docs/orbifold-v1/handoffs/phase-03-handoff.md`. Run all four gate commands. Then run `pnpm dev` and perform the visual smoke test described in the Operability requirements below. Record observed results as evidence in the handoff. No source code changes are expected in this step — only headless validation and operability documentation. If a defect is found during smoke testing, fix it in a committed iteration before writing the operability record.

Implementation requirements:
- Run and record: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` — all must exit 0.
- Perform the browser smoke test itemized in Operability requirements below.
- If a defect is found: commit the fix first, then record the operability results against the fixed code.
- Write the phase-completion entry in `docs/orbifold-v1/handoffs/phase-03-handoff.md` with the full prototype parity summary.

Validation:
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `pnpm test` → 119 passed (≥ 119; no regressions from Phase 01 or 02)
- `pnpm build` → exit 0
- All A-03 operability items confirmed by Pilot browser observation (see Operability requirements below).

Expected result:
- All A-03 Acceptance IDs fully covered.
- Phase-completion entry written to handoff.

CHECKPOINT → Commit message:
`docs(render): Phase 03 step 03.6 — operability verification and phase-03 completion handoff`

---

## Phase Acceptance

- **A-03-01** — WebGL feature detection: if WebGL is unavailable, the user sees a clear error message in the browser ("Tu navegador no soporta WebGL. Orbifold no puede funcionar.") and the app does not crash.
  - Validation method: `live-system` (Pilot observes in a browser with WebGL disabled via devtools, or reviews the fallback branch in source code as a `proxy:static-analysis`)

- **A-03-02** — Tonnetz grid visible: opening `pnpm dev` in a browser with WebGL shows the full-screen PIXI canvas with the Tonnetz grid drawn — triangles colored by tonal function (tonic: `#f3b15a`, subdominant: `#56cfc4`, dominant: `#e87bac`) with faint fill for out-of-key triangles; node circles drawn with scale-member highlighting in accent color; note-name labels on each node.
  - Validation method: `live-system` (Pilot browser observation)

- **A-03-03** — Chord pick and P·L·R: clicking a Tonnetz triangle plays the chord (audible via Phase 02 audio layer), highlights the triangle with an accent border, adds a voice-leading path between progression chords, and shows animated P·L·R labels (P, L, R) on the three neighboring triangles sharing an edge.
  - Validation method: `live-system` (Pilot browser observation)

- **A-03-04** — Voice-leading path animation: when two or more chords are in the progression, an animated particle travels along the path between chord centroids on the Tonnetz.
  - Validation method: `live-system` (Pilot browser observation)

- **A-03-05** — Rhythm orbit view: switching to rhythm view (by setting `sessionStore.view = 'rhythm'` via a temporary button or by any means) shows orbit rings for each rhythm layer; toggling a step dot via pointer click updates the pattern and re-queues the audio at the next cycle; the playhead sweeps while the groove is playing.
  - Validation method: `live-system` (Pilot browser observation)

- **A-03-06** — Radial↔linear morph: in rhythm view, setting `_rLayoutTarget` to 1 causes the orbit rings to animate smoothly into a linear display; setting it to 0 returns to radial. (For Phase 03, the morph toggle can be triggered via the browser console or a temporary button — Phase 04 will add the UI control.)
  - Validation method: `live-system` (Pilot browser observation)

- **A-03-07** — Hover controls (solo/mute/delete): hovering near a rhythm layer's orbit reveals controls that, when clicked, toggle solo/mute or remove the layer; the scene updates immediately.
  - Validation method: `live-system` (Pilot browser observation)

- **A-03-08** — Resize behavior: resizing the browser window causes the Tonnetz grid and rhythm orbits to rebuild and fill the new viewport dimensions (debounced, 120 ms), matching prototype lines 935–943.
  - Validation method: `live-system` (Pilot browser observation)

- **A-03-09** — Phase 02 audio preserved: the Phase 02 transport buttons (Init audio, ▶ Groove, ▶ Progresión, ▶ Sesión, ■ Silencio, BPM input) remain functional and are not broken by Phase 03 changes. The now-playing label updates correctly.
  - Validation method: `live-system` (Pilot browser observation, same smoke-test items as Phase 02 A-02-01 through A-02-07)

- **A-03-10** — Gate commands: `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all exit 0 at phase end; 119 Phase 01+02 tests still pass.
  - Validation method: `live-system` (Dev runs all four gate commands and records exit codes)

## Operability requirements

The following items must be observed by the Pilot in a browser at step 03.6 before phase closure:

| Item | Acceptance ID | Expected |
|---|---|---|
| 1. Open `pnpm dev` — canvas visible | A-03-02 | Full-screen PIXI canvas with Tonnetz grid |
| 2. Triangle colors | A-03-02 | Tonic triangles amber; subdominant teal; dominant pink; out-of-key faint |
| 3. Node labels | A-03-02 | Note names (C, D, E…) centered on each node circle |
| 4. Click a triangle | A-03-03 | Chord plays (audible); triangle highlighted accent color; P·L·R labels appear on neighbors |
| 5. Click a second triangle | A-03-03, A-03-04 | Second chord plays; voice-leading path draws between their centroids; particle animates |
| 6. Switch to rhythm view | A-03-05 | Orbit rings appear; Tonnetz disappears |
| 7. Click ▶ Groove then observe rhythm view | A-03-05 | Playhead sweeps; step dots animate |
| 8. Toggle a step dot | A-03-05 | Dot lights/dims; pattern re-queues at next cycle |
| 9. Hover a layer orbit | A-03-07 | Solo/mute/delete controls appear near the orbit |
| 10. Trigger morph | A-03-06 | Rings morph smoothly radial↔linear |
| 11. Resize window | A-03-08 | Grid and orbits rebuild to fill new size |
| 12. Phase 02 audio (transport buttons) | A-03-09 | All Phase 02 transport actions still work |

## Partial coverage from prior phase

No prior partials to address. Phase 02 closed with all A-02-01 through A-02-10 covered.

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **WebGL detection strategy** — Trigger: step 03.1 inventory. How the port detects WebGL availability before calling `new PIXI.Application`. Options: `canvas.getContext('webgl2') || canvas.getContext('webgl')` vs PIXI's own renderer-creation try/catch. Record the chosen approach.
- **PIXI Application lifecycle — singleton vs factory** — Trigger: step 03.1 inventory / step 03.2. `stage.ts` creates one PIXI Application for the lifetime of the app (singleton). If future phases require tearing down and re-creating the canvas (e.g., for composition view), this assumption must be revisited.
- **Scene-store reactivity pattern** — Trigger: step 03.1 inventory / step 03.5. Direct `sessionStore.subscribe` in render modules vs Svelte-driven callbacks from `App.svelte`. The phase specifies `App.svelte` as the coordinator (preferred pattern from CLAUDE.md §5). If the inventory determines a different approach is needed, surface it.
- **Hover-control overlay mechanism (OD-1)** — Trigger: step 03.1 inventory. Must be resolved before step 03.5. If the chosen approach involves a DOM element positioned over the PIXI canvas, this may constitute a scoping overlap with Phase 04's full Svelte UI — record the decision.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v1/handoffs/phase-03-handoff.md`. See `handoff-template.md`.
