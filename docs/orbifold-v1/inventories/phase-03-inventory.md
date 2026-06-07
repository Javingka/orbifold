# Phase 03 Inventory — PIXI Render Layer

**Created:** 2026-06-06
**Phase file:** `docs/orbifold-v1/phases/phase-03.md`

---

## Files that will be touched

| Path | Current purpose | Change planned |
|---|---|---|
| `src/render/theme.ts` | Stub (export {}) | Implement: `COL`, `FUNC_COL`, `FONT_SERIF`, `FONT_SANS`, `FONT_MONO` constants |
| `src/render/stage.ts` | Stub (export {}) | Implement: `initStage`, `getApp`, `setView`, `onResize`; creates PIXI Application and all container/graphics layers |
| `src/render/tonnetz-scene.ts` | Stub (export {}) | Implement: `buildTonnetz`, `updateTonnetzDynamic`, `onStagePointerDown`, `tickHarmony`, `registerTicker` |
| `src/render/rhythm-scene.ts` | Stub (export {}) | Implement: `buildRhythmScene`, `updateRhythmDynamic`, `tickRhythm`, `onStagePointerDown`, `onStageContextMenu`, `onStagePointerMove` |
| `src/app/App.svelte` | Phase 02 transport UI; `<canvas id="pixi-canvas">` stub | Add `div#stage` wrapper, font `<link>` tags already added to `index.html`; wire `initStage`, `buildTonnetz`, `buildRhythmScene`, `registerTicker`; subscribe to `sessionStore`; route pointer events |
| `index.html` | Entry HTML — no font links | Add Google Fonts `<link>` tags for Fraunces, Albert Sans, IBM Plex Mono (OD-2 resolved) |

Total files to touch: **6** — well under the 15-file limit.

---

## Existing behavior to preserve

- All 119 Phase 01+02 tests pass clean (`pnpm test`).
- Phase 02 transport buttons (Init audio, ▶ Groove, ▶ Progresión, ▶ Sesión, ■ Silencio, BPM input, now-playing label) remain functional and visible. Phase 03 adds the PIXI canvas behind them; it does NOT remove or break the transport panel.
- `tsc --noEmit`, `pnpm lint`, `pnpm build` exit 0 (Phase 02 gate).
- `sessionStore` subscription pattern: `App.svelte` drives both scenes; render modules do NOT import `sessionStore` directly (per ADR 0004 and phase file spec).
- `core/**` modules remain DOM/PIXI/Svelte-free (per ADR 0003 and CLAUDE.md invariant).

---

## New behavior to introduce

- Full-screen PIXI canvas (WebGL) behind the transport panel; degrades gracefully if WebGL is unavailable.
- Tonnetz grid drawn with tonal-function triangle colors (tonic amber, subdominant teal, dominant pink, out-of-key faint).
- Node circles with scale-member highlighting (accent color for in-scale, faint for out-of-scale); note-name labels.
- Clicking a Tonnetz triangle selects a chord: plays it via `playChord`, appends to `sessionStore.harmony.progression`, highlights with accent border, computes P·L·R neighbors and animated labels, computes minimal voice-leading.
- Animated voice-leading path between progression chord centroids with traveling particle.
- Suggestion triangles glow (tonal-function next-chord suggestions).
- Rhythm orbit view: animated rings morphing radial↔linear, playhead sweep, step-dot toggling.
- Hover over rhythm layer reveals solo/mute/delete overlay (DOM approach — see OD-1).
- Debounced resize rebuilds both scenes (120 ms).
- `sessionStore` changes reactively drive scene updates (harmony slice → `updateTonnetzDynamic`; rhythm slice → `updateRhythmDynamic`; view slice → `setView`).

---

## Acceptance ID coverage plan

| Acceptance ID | Behavior | Planned test type | Planned test file | Step that covers it |
|---|---|---|---|---|
| A-03-01 | WebGL degradation: user sees clear error message if WebGL unavailable, no crash | proxy:static-analysis | `src/render/stage.ts` (WebGL detection branch) | 03.2 |
| A-03-02 | Tonnetz grid visible: full-screen canvas with tonal-function triangle colors, node circles, note labels | live-system | (Pilot browser observation) | 03.3 |
| A-03-03 | Chord pick and P·L·R: clicking triangle plays chord, highlights it, shows P/L/R animated labels on neighbors | live-system | (Pilot browser observation) | 03.4 |
| A-03-04 | Voice-leading path animation: particle travels along path between chord centroids | live-system | (Pilot browser observation) | 03.4 |
| A-03-05 | Rhythm orbit view: orbit rings, step-dot toggle, playhead sweep while playing | live-system | (Pilot browser observation) | 03.5 |
| A-03-06 | Radial↔linear morph: smooth animated transition between two orbit layouts | live-system | (Pilot browser observation) | 03.5 |
| A-03-07 | Hover controls: solo/mute/delete controls appear near hovered orbit and function correctly | live-system | (Pilot browser observation) | 03.5 |
| A-03-08 | Resize behavior: grid and orbits rebuild debounced at 120 ms to fill new viewport | live-system | (Pilot browser observation) | 03.2 (debounce setup), 03.3+03.5 (rebuild callbacks) |
| A-03-09 | Phase 02 audio preserved: all Phase 02 transport actions remain functional | live-system | (Pilot browser observation) | 03.6 |
| A-03-10 | Gate commands: tsc, lint, test, build all exit 0; 119 tests still pass | operability | Dev runs gate commands and records exit codes | 03.6 |

---

## Tests to add or modify

No new unit tests. Render modules execute in a browser (WebGL/DOM) context and are not unit-testable in Node/Vitest. All render acceptance is covered by live-system or proxy:static-analysis coverage types. The 119 Phase 01+02 core engine and codegen tests must continue to pass with no changes.

---

## Open decisions surfaced

### OD-1: Layer-control overlay mechanism (STILL OPEN — resolution required before step 03.5)

**Context:** Prototype lines 1317–1349 use a DOM overlay `div#layerCtl` (`position:absolute` inside `div#stage`, positioned via `left/top` CSS matching pointer coordinates). The overlay contains three `<button>` elements (solo/mute/delete). On hover near a layer, `showLayerCtl(li, px, py)` sets `left`/`top` and toggles a `.show` class. The overlay itself `pointerenter`/`pointerleave` events keep it visible while the cursor is on it, with a 260 ms hide delay.

**Port options:**

**(a) DOM overlay (Svelte component in App.svelte):** Add a `<div id="layerCtl">` absolutely positioned within the `div#stage` container. `rhythm-scene.ts` dispatches a custom DOM event or calls a registered callback (passed in at init) with `{ layerIndex, pixelX, pixelY }`. App.svelte moves and shows/hides the overlay. Buttons call `sessionStore.update` directly. This is 1:1 with the prototype. Risk: Phase 04 replaces the full Svelte UI; the overlay will need to be absorbed into Phase 04 components — minimal conflict since it is a small, isolated element.

**(b) PIXI Container overlay:** A PIXI Container with three `PIXI.Text` nodes acting as buttons; shown/hidden inside `rhythm-scene.ts`. Hit-tested via pointer coordinates. No DOM overlay needed. More self-contained in the render layer. Trade-off: PIXI text is less accessible than native buttons; harder to style consistently with Phase 04.

**Recommendation:** **(a) DOM overlay.** The prototype uses DOM; this preserves visual and behavioral parity with the lowest code delta. Phase 04 absorbs the overlay naturally since it already works with DOM. The alternative (b) adds complexity without parity benefit.

**Resolution required before step 03.5.** Pilot-resolved decisions from the invocation prompt show OD-1 is still open.

---

### OD-2: Font loading strategy — RESOLVED

**Resolution (Pilot-directed):** `<link>` tags in `index.html` loading Fraunces, Albert Sans, and IBM Plex Mono from Google Fonts — same approach as the prototype's `<style>@import</style>`. These are CDN resources, not npm deps. Done in this inventory step as a config-only change to `index.html`.

---

### OD-3: Canvas mounting strategy — RESOLVED

**Resolution (Pilot-directed):** `resizeTo: div#stage` — add a full-screen `<div id="stage">` wrapper in `App.svelte`; PIXI's `resizeTo` targets it. Matches prototype line 906 (`resizeTo: document.getElementById('stage')`). The `<div id="stage">` must have `position: relative; width: 100%; height: 100vh` (or equivalent full-screen CSS) so it drives PIXI's resize. PIXI appends `app.view` inside this div (prototype: `mount.appendChild(app.view)` where `mount = document.getElementById('pixiMount')` inside `div#stage`). In the port, `initStage` receives the canvas element reference from App.svelte and appends `app.view` inside `div#stage` (or replaces the stub canvas — see step 03.2 for exact wiring).

---

### OD-4: `sessionStart` reference for bar-phase computation (STILL OPEN — resolution required before step 03.4)

**Context:** The prototype's `tick()` at lines 1077–1082 computes `sessionStart = performance.now()` (line 586), reset whenever `runNow` or `queueForNextCycle` is called (lines 616, 623). This `sessionStart` is module-global in the prototype. The phase file (step 03.4) already proposes a resolution: use a module-level `_sessionStart = performance.now()` in `tonnetz-scene.ts`, reset when `updateTonnetzDynamic` detects that `nowPlaying.source` has changed from null/undefined to an active source. Step 03.5 applies the same pattern in `rhythm-scene.ts`.

**Port options:**

**(a) Module-local in each scene module** (proposed in phase file): `_sessionStart` in `tonnetz-scene.ts` and `rhythm-scene.ts`, reset by `updateTonnetzDynamic`/`updateRhythmDynamic` on source change. Works without any change to `state/session.ts` or `audio/strudel.ts`.

**(b) In `sessionStore`**: Add a `playbackStartedAt: number | null` field to `SessionState`, set by `playGroove`/`playSession`/`playProgression`/`playChord` in `session.ts` at transport-action time. Scenes read this from the store. More accurate — tied to actual audio start, not to first reactive update. Requires adding a field to `SessionState` and a Register proposal.

**(c) Approximated via `audio/strudel.ts` export**: Expose `getLastRunTimestamp()` from the audio module. Scenes import it lazily. More accurate than (a), avoids store bloat.

**Recommendation:** **(a) module-local** for Phase 03 — it is the smallest change, avoids store schema expansion, and produces visually adequate results (the phase animation offset is sub-second). Accuracy can be improved in a future phase. If the Pilot prefers (b) for correctness, a Register proposal is needed (it changes `SessionState` shape). Document whichever approach is chosen here so step 03.4 implements it consistently.

**Resolution required before step 03.4.**

---

## Source-of-truth check

No cross-source data consumption in this phase. The render layer reads from `sessionStore` (written in Phase 02) and calls exports from `core/theory/tonnetz.ts`, `core/theory/neo-riemannian.ts`, `core/theory/voice-leading.ts`, `core/theory/pitch.ts`, `core/theory/scales.ts`, `core/codegen/strudel.ts` — all established in Phase 01/02. The render layer also calls `playChord` (to be added to `session.ts` in step 03.4) and `requeueLive` (already in `session.ts`).

---

## New dependencies needed

None. `pixi.js@7.4.2` is already installed and pinned in `package.json`. Google Fonts `<link>` tags are external CDN resources, not npm deps.

---

## Environment, CI, build, or deployment changes needed

None. `pnpm build`, `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit` all already work from Phase 02.

---

## Decisions Register check

- **Exact dependency version pinning** (active): No new npm deps added. Applies vacuously.
- **ADR 0003 (Tonnetz pure representation):** `tonnetz-scene.ts` must call `computeTonnetzNodes`/`computeTonnetzTriangles` from `core/theory/tonnetz.ts` and map pixel layout locally. It MUST NOT add `{x, y}` to the core types. This inventory respects the ADR.
- **ADR 0004 (Svelte store for session state):** `App.svelte` is the coordinator; render modules do NOT import `sessionStore` directly. The scene modules export update functions that `App.svelte` calls from its store subscription.

---

## PIXI v7 API confirmation (from node_modules/pixi.js@7.4.2)

Confirmed by reading `@pixi/app`, `@pixi/core`, `@pixi/graphics`, `@pixi/text`, `@pixi/display`, `@pixi/ticker` declaration files under `node_modules/.pnpm/`.

### `PIXI.Application` constructor options

Source: `@pixi/app/lib/Application.d.ts`, `@pixi/app/lib/ResizePlugin.d.ts`, `@pixi/core/lib/view/ViewSystem.d.ts`, `@pixi/core/lib/background/BackgroundSystem.d.ts`, `@pixi/core/lib/context/ContextSystem.d.ts`.

All five options used in the prototype are **confirmed valid** in v7.4.2:

| Option | Type | Source |
|---|---|---|
| `resizeTo` | `Window \| HTMLElement` | `ResizePlugin.d.ts` line 8 |
| `backgroundAlpha` | `number` | `BackgroundSystem.d.ts` line 31 |
| `antialias` | `boolean` | `ContextSystem.d.ts` line 34 |
| `resolution` | `number` | `ViewSystem.d.ts` line 31 |
| `autoDensity` | `boolean` | `ViewSystem.d.ts` line 35 |

`app.view` is `ICanvas` (HTMLCanvasElement in browser). `app.screen` is `Rectangle` with `.width` and `.height`. Confirmed.

**No surprise:** all options are identical to what the prototype uses at lines 907–912.

### `PIXI.Graphics` draw methods (v7 — confirmed)

Source: `@pixi/graphics/lib/Graphics.d.ts`.

| Method | Signature | Status |
|---|---|---|
| `beginFill(color?, alpha?)` | `(color?: ColorSource, alpha?: number) => this` — line 297 | CONFIRMED v7 |
| `endFill()` | `() => this` — line 318 | CONFIRMED v7 |
| `lineStyle(width, color?, alpha?)` | `(width: number, color?: ColorSource, alpha?: number, ...) => this` — line 174 | CONFIRMED v7 |
| `drawPolygon(...path)` | `(...path: Array<number> \| Array<IPointData>) => this` — line 355 | CONFIRMED v7 |
| `drawCircle(x, y, r)` | `(x: number, y: number, radius: number) => this` — line 345 | CONFIRMED v7 |
| `moveTo(x, y)` | `(x: number, y: number) => this` — line 225 | CONFIRMED v7 |
| `lineTo(x, y)` | `(x: number, y: number) => this` — line 233 | CONFIRMED v7 |
| `clear()` | `() => this` — line 367 | CONFIRMED v7 |

**No surprise vs v8:** v7 uses `beginFill/endFill` (imperative state machine). v8 changed to `fill()` and `stroke()` object API. The prototype and phase spec use the v7 API correctly.

### `PIXI.Container`

Source: `@pixi/display/lib/Container.d.ts`.

| API | Confirmed |
|---|---|
| `addChild<U>(...children: U): U[0]` | CONFIRMED |
| `removeChildren(beginIndex?, endIndex?): T[]` | CONFIRMED |
| `visible: boolean` (from DisplayObject) | CONFIRMED |
| `alpha: number` (from DisplayObject) | CONFIRMED |

### `PIXI.Text`

Source: `@pixi/text/lib/Text.d.ts`, `@pixi/text/lib/TextStyle.d.ts`.

Constructor: `new Text(text?: string | number, style?: Partial<ITextStyle> | TextStyle, canvas?: ICanvas)` — CONFIRMED.

Text extends Sprite, which has `anchor: ObservablePoint` with `.set(x, y?)` — `anchor.set(0.5)` is CONFIRMED.

`resolution: number` is a settable property on Text — CONFIRMED (lines 193–194 of Text.d.ts).

TextStyle fields used:

| Field | Confirmed in ITextStyle |
|---|---|
| `fontFamily: string \| string[]` | CONFIRMED |
| `fontSize: number \| string` | CONFIRMED |
| `fill: TextStyleFill` | CONFIRMED (accepts hex numbers as ColorSource) |
| `fontWeight: TextStyleFontWeight` | CONFIRMED (e.g., `'500'`, `'800'`) |

### `app.ticker.add`

Source: `@pixi/ticker/lib/Ticker.d.ts`.

```
add<T = any>(fn: TickerCallback<T>, context?: T, priority?: UPDATE_PRIORITY): this
```

where `type TickerCallback<T> = (this: T, dt: number) => any`.

**Confirmed:** the tick callback receives a single `dt: number` argument (the scaled delta time `deltaTime`). In the prototype, `tick(delta)` uses this `delta` as a dimensionless multiplier (e.g., `particle = (particle + delta*0.012) % 1`). This is correct for v7 — `delta` is not milliseconds, it is a frame-rate-normalized scalar (typically ≈1.0 at 60 fps).

**Surprise to document in handoff:** `delta` is NOT milliseconds. It is `Ticker.deltaTime` (scaled: 1.0 = target frame time). The prototype uses it correctly as a multiplier. If any code in the render layer needs milliseconds, it must use `performance.now()` (as the prototype does for `barMs` computation).

### Interactive events

**Confirmed prototype pattern:** The prototype does NOT use PIXI's `interactive` flag or PIXI's event system. Pointer events are wired directly to `app.view` (the HTMLCanvasElement) via native DOM `addEventListener` at lines 2157–2160:

```js
app.view.addEventListener('pointerdown', onStagePointer);
app.view.addEventListener('contextmenu', onStageContext);
app.view.addEventListener('pointermove', onStageHover);
app.view.addEventListener('pointerleave', scheduleHideLayerCtl);
```

Hit-testing is done manually by `pointInTri` (lines 1222–1229) and `nearestLayer` (lines 1319–1324). **This pattern must be preserved in the port** — the phase file specifies `App.svelte` adds a `pointerdown` listener on `canvasElement` and routes to scene functions.

**No PIXI interactive flag used.** `interactive` / `eventMode` are not referenced in the prototype render section.

### WebGL detection

**Prototype approach:** The prototype checks `typeof PIXI === 'undefined'` (line 901) — a CDN-load guard only, not a WebGL capability check. This is NOT the correct approach for the Vite build (PIXI is always bundled, never undefined).

**Correct browser API for the port:** `canvas.getContext('webgl2') || canvas.getContext('webgl')`. This returns null if WebGL is unavailable (e.g., devtools override, headless env, unsupported browser). If null, display the fallback message before calling `new PIXI.Application`.

**ADR trigger confirmed:** The phase file lists "WebGL detection strategy" as an ADR trigger for step 03.1. The chosen approach is `canvas.getContext('webgl2') || canvas.getContext('webgl')` — consistent with the phase spec (step 03.2 requirement). Will be recorded in the ADR at step 03.2.

---

## Prototype render function mapping (verified against actual source)

The phase file's cited line ranges were verified against `reference/orbifold.html`. Corrections are noted where found.

### `src/render/theme.ts`

| Prototype element | Prototype lines | Notes |
|---|---|---|
| `COL` constant | 882–883 | Exact: `const COL = { node:0xcfd6e6, faint:0x39404f, line:0x232734, accent:0x8aa0ff, tonic:0xf3b15a, subdom:0x56cfc4, dom:0xe87bac, bg:0x0b0d12 }` |
| `FUNC_COL` constant | 884 | `const FUNC_COL = { tonic:COL.tonic, subdom:COL.subdom, dom:COL.dom }` |
| CSS custom properties `--tonic`, `--subdom`, `--dom`, `--accent` | Lines 33–36 | Values match `COL.tonic`, `COL.subdom`, `COL.dom`, `COL.accent` exactly |
| Font families | Lines 1017–1019, 1063, 1066, 1068, 1274 | Fraunces (`fontFamily:'Fraunces, serif'`), Albert Sans (`'Albert Sans, sans-serif'`), IBM Plex Mono (`'IBM Plex Mono, monospace'`) |

**Phase file cites lines 882–884 for COL and 33–36 for CSS.** Verified — correct.

### `src/render/stage.ts`

| Prototype function | Prototype lines | Notes |
|---|---|---|
| `initPixi()` start: Application creation, mount | 900–914 | `resizeTo: document.getElementById('stage')` confirmed line 907; `mount.appendChild(app.view)` line 913 |
| `harmonyLayer`, `rhythmLayer` creation | 916–917 | `rhythmLayer.visible=false` line 917 |
| `app.stage.addChild(harmonyLayer, rhythmLayer)` | 918 | Order: harmony first, rhythm second |
| `hGrid`, `hPath`, `hNodes`, `hDyn`, `hLabels`, `hNRG`, `hNRL` creation | 920–922 | `hGrid`, `hPath`, `hNodes`, `hDyn`, `hLabels` line 920–921; `hNRG`, `hNRL` line 922 |
| `harmonyLayer.addChild(hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels)` | 923 | **Order: hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels** — note hDyn and hNRG are before hNodes (dynamic effects render below nodes) |
| `rRings`, `rDyn`, `rLabels` creation and addChild | 925–926 | `rhythmLayer.addChild(rRings, rDyn, rLabels)` |
| `app.ticker.add(tick)` | 931 | |
| Debounced resize handler | 935–943 | 120 ms timeout, calls `buildTonnetz()` and `buildRhythmScene()` |

**Correction found:** Phase file step 03.2 lists `harmonyLayer.addChild` order as `hGrid, hPath, hNodes, hDyn, hLabels, hNRG, hNRL`. The prototype line 923 is `harmonyLayer.addChild(hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels)`. The correct order is `hGrid → hPath → hDyn → hNRG → hNodes → hNRL → hLabels`. This places dynamic glow layers (hDyn, hNRG) below node circles (hNodes) and labels, which is visually correct.

### `src/render/tonnetz-scene.ts`

| Prototype function | Prototype lines | Notes |
|---|---|---|
| `buildTonnetz()` — layout and geometry | 947–1025 | |
| `pos(i,j)` — pixel layout | 961 | `{ x: cx + i*cell + j*cell*0.5, y: cy - j*rowH }` |
| `cell`, `rowH` computation | 953–954 | `cell = Math.max(78, Math.min(132, Math.min(W,H)/6.4))`, `rowH = cell * 0.866` |
| Node generation, nodeAt map | 962–968 | Includes culling: skip if `p.x < -cell` or `p.x > W+cell` etc. The culling is part of the prototype build; render layer must replicate it rather than consuming all nodes from core (since core's `computeTonnetzNodes` produces pure lattice data for any range, and the render layer culls by viewport) |
| Triangle generation (`mkTri`) | 972–978, 979–990 | Upper tri (ascending) = major, root=A.pc; lower tri (descending) = minor, root=C.pc |
| Triangle fill and edge drawing | 993–1009 | |
| Node circles and labels | 1011–1023 | Uses `scaleSet` from `SCALE_INTERVALS[melState.mode]` |
| `computeNR()` call at end of `buildTonnetz` | 1024 | Phase 03 port calls `updateTonnetzDynamic` after build, which internally calls NR recomputation |
| `tickHarmony(phase, now, barMs)` | 1085–1143 | |
| Voice-leading path and particle | 1091–1102 | `prog` items carry `{cx, cy}` centroid — in the port these come from `_renderTris` matched to each progression `Chord` |
| Active chord pulse | 1105–1120 | `activeIdx` computed from `sessionStart` |
| Suggestion glow | 1122–1130 | |
| P·L·R animated glow on `hNRG`, label alpha | 1132–1143 | |
| `computeNR()` | 1250–1279 | **Phase file cites lines 1250–1279** — verified correct |
| `nrLabel()` | 1238–1248 | Already ported to `core/theory/neo-riemannian.ts` (Phase 01) |
| `onStagePointer` for harmony | 1281–1293 (harmony branch: 1284–1286) | Single function handles both views; port splits into per-scene functions |
| `pickChord(tri)` | 1352–1377 | |
| `updateSuggestions()` | 1387–1408 | **Phase file cites 1387–1408** — verified correct |

**Line range correction:** Phase file step 03.3 cites `computeNR()` at "lines 1250–1279". Verified — correct. Phase file step 03.4 cites `tickHarmony` at "lines 1085–1143". Verified — correct.

**Important behavior note for `pickChord` port (step 03.4):** The prototype's `melState.progression.push(ch)` at line 1372 stores the full object `{ rootPc, qual, pcs, label, info, tri, cx, cy, gain }` — including the triangle reference `tri` and centroid `{cx, cy}`. The port's `sessionStore.harmony.progression` stores `Chord = { rootPc, qual, gain }` only (per Phase 02 schema). The render layer must maintain a parallel `_lastPickCentroid: {cx, cy}` and match progression entries to `_renderTris` to recover centroids for voice-leading path drawing. The phase file step 03.4 spec covers this correctly via `_lastPick` and `_renderTris` lookup.

### `src/render/rhythm-scene.ts`

| Prototype function | Prototype lines | Notes |
|---|---|---|
| `lerp(a,b,t)` | 1028 | Pure utility — will be a module-local function |
| `rebuildRhythmGeo()` | 1030–1056 | **Phase file cites 1030–1056** — verified correct |
| `buildRhythmScene()` | 1057–1070 | **Phase file cites 1057–1070** — verified correct |
| `tick(delta)` dispatcher | 1073–1083 | Dispatches to `tickHarmony` or `tickRhythm` based on `currentView` |
| `tickRhythm(phase)` | 1146–1215 | **Phase file cites 1146–1215** — verified correct |
| `onStagePointer` rhythm branch | 1287–1293 | |
| `onStageContext` | 1296–1304 | **Phase file cites 1296–1304** — verified correct |
| `nearestLayer` | 1319–1324 | Used by both `onStageContext` and `onStageHover` |
| `showLayerCtl` / `hideLayerCtl` | 1325–1334 | DOM overlay approach |
| `scheduleHideLayerCtl` | 1335 | 260 ms delay |
| `onStageHover` | 1336–1341 | **Phase file cites 1336–1341** — verified correct |
| `wireLayerCtl` (DOM event wiring) | 1343–1350 | Solo/mute/delete button handlers |

**Phase file cites "lines 1317–1349" for the hover control block.** Verified — `showLayerCtl` starts at line 1325 and `wireLayerCtl` ends at line 1350. The range 1317–1349 is slightly off but encompasses the full block. The actual range is 1317–1350 (inclusive of the closing `})();`).

---

## Scene lifecycle contract

The following lifecycle is established by this inventory and must be implemented per the phase spec:

1. **`initStage(canvasEl: HTMLCanvasElement): PIXI.Application | null`**
   - Called once from `App.svelte` `onMount`, after store seeding.
   - Detects WebGL; returns null and shows error if unavailable.
   - Creates `PIXI.Application` with `resizeTo: div#stage`.
   - Creates all containers and graphics layers; sets child order.
   - Registers window resize handler (debounced 120 ms).
   - Does NOT call `buildTonnetz` or `buildRhythmScene`.

2. **`buildTonnetz(state: SessionState): void`** (exported from `tonnetz-scene.ts`)
   - Clears `hGrid`, `hNodes`, `hLabels`.
   - Computes pixel layout, calls core engine, draws static geometry.
   - Calls `updateTonnetzDynamic(state)` at the end to restore P·L·R/selection/suggestion overlays after rebuild.
   - Called after `initStage` succeeds, and in the resize callback.

3. **`buildRhythmScene(state: SessionState): void`** (exported from `rhythm-scene.ts`)
   - Clears `rLabels`. Calls `rebuildRhythmGeo`. Creates layer labels and center label.
   - Called after `initStage` succeeds, and in the resize callback.

4. **`updateTonnetzDynamic(state: SessionState): void`** (exported from `tonnetz-scene.ts`)
   - Recomputes `_lastPick` from `state.harmony.progression` last entry.
   - Rebuilds `hNRL` P·L·R labels. Recomputes `_suggestionTris`.
   - Resets `_sessionStart` if `nowPlaying.source` changed from null to active.
   - Called by `App.svelte` store subscription when `harmony` or `nowPlaying` changes.

5. **`updateRhythmDynamic(state: SessionState): void`** (exported from `rhythm-scene.ts`)
   - Rebuilds layer label muted/solo visual state without full geometry rebuild.
   - Called by `App.svelte` store subscription when `rhythm` changes.

6. **`registerTicker(app: PIXI.Application): void`** (exported from `tonnetz-scene.ts`)
   - Registers the top-level tick function on `app.ticker`. Tick dispatches to `tickHarmony` or `tickRhythm` based on module-level `_currentView`.
   - Called once after `buildTonnetz` succeeds.

7. **`setView(view: 'harmony' | 'rhythm'): void`** (exported from `stage.ts`)
   - Toggles `harmonyLayer.visible` / `rhythmLayer.visible`.
   - Called by `App.svelte` store subscription when `view` changes.

8. **`onResize(cb: () => void): void`** (exported from `stage.ts`)
   - Registers a resize callback that `App.svelte` uses to trigger scene rebuilds.

---

## Prototype parity note on `buildTonnetz` portability

The prototype's `buildTonnetz` generates nodes inline (the `nodeAt` map, `mkTri`). The port must use `computeTonnetzNodes`/`computeTonnetzTriangles` from `core/theory/tonnetz.ts` (per ADR 0003), then apply the pixel layout in the render layer. However, the prototype also performs viewport culling (`if (p.x < -cell || ...) continue`) BEFORE creating nodes. The core engine does not cull — it returns nodes for all `(i,j)` in the requested range. The render layer must perform the same culling after computing pixel positions, to avoid drawing off-screen nodes. This is consistent with ADR 0003 (pixel layout is render-layer concern) and is a key implementation detail for step 03.3.

---

## Risks specific to this phase

- **`addChild` order for `harmonyLayer`:** Phase file step 03.2 has the wrong order in its prose (lists `hNodes` before `hDyn`). Actual prototype order is `hGrid → hPath → hDyn → hNRG → hNodes → hNRL → hLabels`. If implemented in wrong order, dynamic glow effects (hDyn, hNRG) would render over node circles, breaking visual parity. This is surfaced here for step 03.2.
- **`playChord` function:** Step 03.4 requires adding `playChord(rootPc, qual, gain)` to `src/state/session.ts`. This is a new exported function on an existing file — within step scope per the phase file, but the Dev must verify it doesn't break Phase 02 tests.
- **Centroid tracking for voice-leading path:** `sessionStore.harmony.progression` stores `{ rootPc, qual, gain }` only (no `{cx, cy}`). The render layer must match each progression entry to a `RenderTri` to recover centroids. The match is by `(rootPc, qual)` — if multiple triangles match (the Tonnetz wraps), the closest to the prior centroid is chosen (consistent with `computeNR` prototype line 1257–1260). This is a render-layer internal concern, not a store-schema concern.

---

## Pilot review

The Pilot approves before step 03.2 begins. OD-2 and OD-3 are resolved (Pilot-directed in the invocation prompt). OD-1 and OD-4 require Pilot decision before steps 03.5 and 03.4 respectively.
