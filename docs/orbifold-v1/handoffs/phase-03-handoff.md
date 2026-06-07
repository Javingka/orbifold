# Phase 03 Handoff — PIXI Render Layer

---

## Step 03.1 — Inventory

**Date:** 2026-06-06
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

- Produced `docs/orbifold-v1/inventories/phase-03-inventory.md` with:
  - PIXI v7 API confirmations (from `node_modules/.pnpm/@pixi+*@7.4.2/` declarations)
  - Prototype render function map with exact line ranges (corrected one addChild order error found)
  - Scene lifecycle contract (8 functions)
  - Open decisions OD-1 and OD-4 with recommendations
  - Pilot-resolved OD-2 and OD-3 recorded as resolved
- Updated `index.html` with Google Fonts `<link>` tags (OD-2 resolution — config-only)
- Created this handoff file

### Files touched

- `docs/orbifold-v1/inventories/phase-03-inventory.md` (created)
- `docs/orbifold-v1/handoffs/phase-03-handoff.md` (created — this file)
- `index.html` (Google Fonts `<link>` tags added)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory step).

### Routine validations

None run — inventory step; no source code changed.

### Acceptance Coverage Table

No Acceptance IDs touched by this step (inventory + config-only change to `index.html`).

### PIXI v7 API findings — surprises vs phase file spec

1. **`addChild` order for `harmonyLayer` is wrong in phase file step 03.2 prose.** The prototype (line 923) uses `harmonyLayer.addChild(hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels)`. The phase file step 03.2 lists `hGrid, hPath, hNodes, hDyn, hLabels, hNRG, hNRL` — `hNodes` is before `hDyn` in the prose. The correct order from the prototype puts `hDyn` and `hNRG` BEFORE `hNodes` (dynamic glow renders under node circles). Step 03.2 implementation must follow the prototype, not the prose.

2. **Ticker `delta` is NOT milliseconds.** `TickerCallback<T>` receives `dt: number` which is `Ticker.deltaTime` — a dimensionless scalar (~1.0 at 60 fps). The prototype uses it correctly as a multiplier (`particle += delta*0.012`). No code should treat `delta` as milliseconds.

3. **`PIXI.Text` constructor signature confirmed:** `new Text(text?, style?, canvas?)` — second arg accepts `Partial<ITextStyle>`. The `resolution` property is a settable instance property (not a constructor option). `anchor.set(0.5)` confirmed via Sprite inheritance.

4. **No PIXI interactive flag in prototype.** Confirmed: the prototype wires events directly to `app.view` via native DOM `addEventListener` at lines 2157–2160. PIXI's `interactive`/`eventMode` is not used. The port preserves this approach.

5. **WebGL detection:** Prototype's `typeof PIXI === 'undefined'` (line 901) is a CDN guard only — invalid for the Vite build. Correct approach is `canvas.getContext('webgl2') || canvas.getContext('webgl')`. ADR trigger confirmed for step 03.2.

6. **All five `PIXI.Application` constructor options (`resizeTo`, `backgroundAlpha`, `antialias`, `resolution`, `autoDensity`) are confirmed valid** in v7.4.2 from separate sub-package declarations. No v8 API drift found.

### OD-1 recommendation (DOM overlay)

Recommend **(a) DOM overlay** — a Svelte component or plain HTML div in `App.svelte`, positioned absolutely within `div#stage`, shown/hidden via `rhythm-scene.ts` callback. Matches prototype lines 1317–1350 1:1. Phase 04 absorbs the overlay as part of its Svelte UI. Resolution required before step 03.5.

### OD-4 recommendation (module-local `_sessionStart`)

Recommend **(a) module-local** `_sessionStart = performance.now()` in `tonnetz-scene.ts` and `rhythm-scene.ts`, reset by `updateTonnetzDynamic`/`updateRhythmDynamic` when `nowPlaying.source` changes from null to active. Smallest change, no store schema expansion, adequate visual accuracy for Phase 03. Resolution required before step 03.4.

### Line-number corrections found

| Phase file reference | Stated range | Verified actual range | Correction |
|---|---|---|---|
| Step 03.2 `addChild` order | `hGrid, hPath, hNodes, hDyn, hLabels, hNRG, hNRL` | Line 923: `hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels` | Implement per prototype, not prose |
| Hover control block | "1317–1349" | 1317–1350 (wireLayerCtl closes at 1350) | Off-by-one on closing paren — insignificant |
| All other cited ranges | — | Verified correct | No corrections needed |

### Decisions made (if any)

- `index.html` updated with Google Fonts `<link>` tags as a docs/config-only change in the inventory commit (Pilot-directed, OD-2 resolution).

### Proposed Decisions Register entries (if any)

None surfaced in this step. OD-1 and OD-4 are open decisions, not Register proposals (they are implementation choices within phase scope).

### Environment state after this step

- No source code written; no tests run.
- `index.html` has Google Fonts `<link>` tags (CDN resources, no npm deps).
- All Phase 02 state intact; 119 tests expected to still pass.

### Next-step context

- OD-1 (layer-control overlay) must be resolved before step 03.5.
- OD-4 (`sessionStart`) must be resolved before step 03.4.
- Step 03.2 must use prototype's `addChild` order for `harmonyLayer` (not the prose in the phase file): `hGrid → hPath → hDyn → hNRG → hNodes → hNRL → hLabels`.
- Step 03.3 must implement viewport culling in the render layer (not relying on core engine to cull), consistent with ADR 0003.
- Step 03.4 must add `playChord(rootPc, qual, gain)` to `src/state/session.ts`.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:** —
**Iteration:** 1 of 5
**Reason:** —
**Next action:** —

---

## Step 03.2 — theme.ts + PIXI Application init (stage.ts)

**Date:** 2026-06-06
**Commit(s):**
- **Terminal commit:** `feat(render): Phase 03 step 03.2 — theme tokens and PIXI stage initialization`
  - Hash: self-referential — not recorded
  - Note: This is the implementation + handoff commit. Its hash is not in this list because the list is in the commit itself.
**Iteration:** 1 of 5

### Completed

- Created `src/render/theme.ts` — pure constants: `COL`, `FUNC_COL`, `FONT_SERIF`, `FONT_SANS`, `FONT_MONO`. AGPL-3.0 header. Zero imports.
- Created `src/render/stage.ts` — full PIXI Application initialization, all containers/graphics created in prototype order, WebGL detection (ADR 0006), singleton pattern (ADR 0007), `initStage`, `getApp`, `setView`, `onResize`, `getStageRefs` exported.
- Updated `src/app/App.svelte` — removed `<canvas id="pixi-canvas">` stub; added `<div id="stage">` full-screen wrapper (OD-3); `initStage(stageEl)` called in `onMount`; transport panel z-indexed above canvas; AGPL-3.0 header updated.
- Verified index.html has Google Fonts `<link>` tags (OD-2 — done in step 03.1, verified present).

### Open decisions resolved (per invocation prompt)

- **OD-2 (fonts):** `<link>` in `index.html` — already done in step 03.1. Verified tags present for Fraunces, Albert Sans, IBM Plex Mono. RESOLVED.
- **OD-3 (canvas):** `resizeTo: div#stage` — `<div id="stage">` full-screen wrapper added to `App.svelte`; PIXI targets it via `initStage(stageEl)`. PIXI appends its own canvas inside the div. RESOLVED.
- **OD-1 (hover controls):** DOM overlay — applies to step 03.5. RECORDED (not yet implemented).
- **OD-4 (sessionStart):** module-local `_sessionStart` in each scene — applies to steps 03.3/03.4/03.5. RECORDED (not yet implemented).

### Files touched

- `src/render/theme.ts` (implemented from stub)
- `src/render/stage.ts` (implemented from stub)
- `src/app/App.svelte` (updated: div#stage, initStage call, transport panel z-index)
- `index.html` (Prettier reformatted — no content change)
- `docs/orbifold-v1/handoffs/phase-03-handoff.md` (this file — step 03.2 entry)

### Prototype parity

**`src/render/theme.ts` — prototype lines 882–884 + CSS lines 33–36:**
- `COL` object: values copied verbatim from prototype line 882–883: `node:0xcfd6e6, faint:0x39404f, line:0x232734, accent:0x8aa0ff, tonic:0xf3b15a, subdom:0x56cfc4, dom:0xe87bac, bg:0x0b0d12`. Byte-identical to prototype constants.
- `FUNC_COL`: `{ tonic: COL.tonic, subdom: COL.subdom, dom: COL.dom }` — prototype line 884.
- `FONT_SERIF`, `FONT_SANS`, `FONT_MONO`: font family strings match prototype Text style declarations at lines 1017–1019, 1063, 1066, 1068, 1274.
- CSS custom properties `--tonic`, `--subdom`, `--dom`, `--accent` (prototype CSS lines 33–36) match `COL.tonic`, `COL.subdom`, `COL.dom`, `COL.accent` exactly.

**`src/render/stage.ts` — prototype lines 900–944 (initPixi()):**
- PIXI Application options match prototype lines 906–912: `resizeTo: stageEl` (= `document.getElementById('stage')`), `backgroundAlpha: 0`, `antialias: true`, `resolution: Math.min(window.devicePixelRatio||1, 2)`, `autoDensity: true`.
- `stageEl.appendChild(_app.view)` — prototype line 913: `mount.appendChild(app.view)`.
- `harmonyLayer`, `rhythmLayer` containers — prototype lines 916–917; `rhythmLayer.visible = false` — prototype line 917.
- `_app.stage.addChild(harmonyLayer, rhythmLayer)` — prototype line 918 (order preserved).
- `hGrid`, `hPath`, `hNodes`, `hDyn`, `hLabels`, `hNRG`, `hNRL` — prototype lines 920–922.
- `harmonyLayer.addChild(hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels)` — prototype line 923. **Inventory correction applied:** phase file prose had wrong order (`hNodes` before `hDyn`); correct order from prototype puts `hDyn`, `hNRG` before `hNodes` so dynamic glow renders under node circles.
- `rRings`, `rDyn`, `rLabels` — prototype lines 925–926; `rhythmLayer.addChild(rRings, rDyn, rLabels)` — prototype line 926.
- Debounced resize handler (120 ms) — prototype lines 935–943.

**Deviation noted (ADR 0006):** Prototype WebGL detection was `typeof PIXI === 'undefined'` (CDN guard, line 901) — invalid for Vite build. Port uses `canvas.getContext('webgl2') || canvas.getContext('webgl')` via a temporary probe canvas before calling `new PIXI.Application`. This is the correct browser API and is recorded in ADR 0006.

### Validation evidence (per Acceptance ID)

- A-03-01: WebGL detection branch present in `src/render/stage.ts` — probe canvas created, `getContext('webgl2') || getContext('webgl')` checked; if null, localized fallback message appended to stageEl and `null` returned. Source citeable at `stage.ts` lines 43–52.

### Routine validations

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0 (after Prettier reformat of `index.html`)
- `pnpm build` → exit 0 (506 modules, no errors)
- `pnpm test` → 119 passed (5 test files, no regressions)
- `pnpm dev` → Vite server starts at port 5185; no import errors observed in console output

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | WebGL unavailable → user sees "Tu navegador no soporta WebGL. Orbifold no puede funcionar." in browser; app does not crash | `src/render/stage.ts` (detection branch) | proxy:static-analysis | covered |
| A-03-02 | Tonnetz grid visible in browser | (Pilot browser observation) | live-system | not covered — deferred to step 03.3 |
| A-03-03 | Chord pick and P·L·R | (Pilot browser observation) | live-system | not covered — deferred to step 03.4 |
| A-03-04 | Voice-leading path animation | (Pilot browser observation) | live-system | not covered — deferred to step 03.4 |
| A-03-05 | Rhythm orbit view | (Pilot browser observation) | live-system | not covered — deferred to step 03.5 |
| A-03-06 | Radial↔linear morph | (Pilot browser observation) | live-system | not covered — deferred to step 03.5 |
| A-03-07 | Hover controls | (Pilot browser observation) | live-system | not covered — deferred to step 03.5 |
| A-03-08 | Resize behavior | `src/render/stage.ts` (resize handler) | proxy:static-analysis | partial — debounce registered; rebuild callbacks not yet wired (deferred to 03.3 onResize call) |
| A-03-09 | Phase 02 audio preserved | (Pilot browser observation) | live-system | not covered — deferred to step 03.6 |
| A-03-10 | Gate commands | Dev ran all four gate commands | operability | covered |

**Notes on partial coverage:**
- A-03-08: The debounced resize handler is registered and fires `_resizeCallbacks` (120 ms). Scene rebuild callbacks (`buildTonnetz`, `buildRhythmScene`) are wired via `onResize()` in step 03.3.
- A-03-02 through A-03-07, A-03-09: All deferred to their respective steps (03.3–03.6); none of the scene build/draw/tick functions exist yet.

**Proxy disclosures:**
- A-03-01: Source code in `src/render/stage.ts` lines 43–52 contains the WebGL detection branch. The fallback path cannot be exercised in the Vitest/Node environment (no DOM canvas). Static analysis of the branch is used as proxy for runtime behavior.

**Operability evidence:**
- A-03-10: `pnpm exec tsc --noEmit` → exit 0; `pnpm lint` → exit 0; `pnpm build` → exit 0 (506 modules); `pnpm test` → 119 passed. All four gate commands run on macOS Darwin 25.5.0 in working directory `/Users/virtualmachine/Development/personal/Orbifold`.

### Decisions made (if any)

- `initStage` signature changed to `(stageEl: HTMLElement): Promise<PIXI.Application | null>` (taking the stage div directly) rather than `(canvasEl: HTMLCanvasElement)` (the phase file spec). Rationale: OD-3 resolution removes the `<canvas id="pixi-canvas">` stub and has PIXI create its own canvas inside `div#stage`; passing the stage div is cleaner and matches the `App.svelte` `bind:this={stageEl}` pattern. WebGL detection uses a temporary probe canvas created programmatically. The exported `getStageRefs()` returns all children typed to their concrete PIXI types.
- `async function initStage` used (with `Promise<>` return type) per invocation prompt spec, though the function body has no actual awaits. This is future-safe for initialization that may need async work.

### Proposed Decisions Register entries (if any)

None. The signature change for `initStage` is within implementation scope and consistent with OD-3 resolution.

### Environment state after this step

- `src/render/theme.ts` and `src/render/stage.ts` implemented (stubs replaced).
- `src/app/App.svelte` mounts PIXI in `div#stage`; canvas blank (no scenes drawn yet).
- `src/render/tonnetz-scene.ts` and `src/render/rhythm-scene.ts` remain as stubs.
- All 119 Phase 01+02 tests passing.
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.

### Next-step context

- Step 03.3 calls `buildTonnetz(get(sessionStore))` in `App.svelte` after `initStage` returns, and wires `onResize` callback.
- `getStageRefs()` is the accessor for all PIXI Graphics/Container refs; scene modules import it from `stage.ts`.
- `initStage` is `async` but has no awaits; the `await` in `App.svelte` is correct and future-safe.
- Prototype `initPixi()` called `buildTonnetz()` and `buildRhythmScene()` directly (lines 928–929) — the port does NOT do this in `stage.ts` (per phase spec: scene build calls come from `App.svelte`).

### Planner Review

**Decision:** APPROVED on 2026-06-06. Iteration: 1 of 5.

All 8 checklist items pass. Prototype parity is fully cited (theme.ts: prototype lines 882–884 + CSS lines 33–36; stage.ts: lines 900–944 with exact per-line mapping including the inventory-corrected addChild order). The WebGL detection deviation is documented and covered by ADR 0006. The `initStage` signature change (HTMLElement instead of HTMLCanvasElement, async wrapper) is disclosed, justified by the Pilot-resolved OD-3, and within implementation scope — no Register proposal required. `getStageRefs()` is a clean unspecced addition within scope. No new deps; no Register conflicts; 119 tests pass; all four gate commands exit 0.

Next action: Dev proceeds to step 03.3

---

## Step 03.3 — Tonnetz scene: static geometry

**Date:** 2026-06-06
**Commit(s):**
- **Terminal commit:** `feat(render): Phase 03 step 03.3 — Tonnetz static geometry and tonal-function coloring`
  - Hash: self-referential — not recorded
  - Note: This is the implementation + handoff commit. Its hash is not in this list because the list is in the commit itself.
**Iteration:** 1 of 5

### Completed

- Implemented `src/render/tonnetz-scene.ts` — static build portion:
  - Local types `RenderNode` (TonnetzNode + {x,y}) and `RenderTri` (TonnetzTriangle + per-vertex {vx,vy} + centroid {cx,cy}).
  - `buildTonnetz(state: SessionState): void` — clears, computes pixel layout, calls core engine, draws triangle fills + edges + node circles + labels.
  - Module-level `_renderNodes: RenderNode[]` and `_renderTris: RenderTri[]` for hit-testing in step 03.4.
  - `getRenderNodes()` and `getRenderTris()` accessors for other modules.
  - `buildRhythmScene(state: SessionState): void` stub (no-op) — exported so `App.svelte` can import it for the resize callback without errors.
  - Viewport culling applied after pixel layout (prototype line 965 pattern): triangles whose vertices are outside the viewport are excluded.
  - Non-null assertion (`!`) avoided: ESLint rule `no-non-null-assertion` satisfied by restructuring the `info !== null` conditional.
- Updated `src/app/App.svelte`:
  - Imported `get` from `svelte/store`, `onResize` from `stage.js`, `buildTonnetz` and `buildRhythmScene` from `tonnetz-scene.js`.
  - After `initStage` succeeds, calls `buildTonnetz(get(sessionStore))` and `buildRhythmScene(get(sessionStore))`.
  - Registers resize callback via `onResize(() => { buildTonnetz(get(sessionStore)); buildRhythmScene(get(sessionStore)); })`.
  - Updated header comment to reference step 03.3.
- AGPL-3.0 header on `tonnetz-scene.ts`.

### Files touched

- `src/render/tonnetz-scene.ts` (implemented from stub)
- `src/app/App.svelte` (wired buildTonnetz, buildRhythmScene, onResize)
- `docs/orbifold-v1/handoffs/phase-03-handoff.md` (this file — step 03.3 entry)

### Prototype parity

**`src/render/tonnetz-scene.ts` — prototype `buildTonnetz()`, lines 947–1025:**

- `hGrid.clear(); hNodes.clear(); hLabels.removeChildren()` — prototype line 949. Exact match.
- `cell = Math.max(78, Math.min(132, Math.min(W,H)/6.4))`, `rowH = cell * 0.866` — prototype lines 953–954. Byte-identical formula.
- `cx = W/2`, `cy = H/2` — prototype lines 955. Identical.
- `cols = Math.ceil(W/cell)+4`, `rows = Math.ceil(H/rowH)+4`, `ci = Math.ceil(cols/2)`, `cj = Math.ceil(rows/2)` — prototype lines 956–958. Identical.
- `pos(i,j) = { x: cx + i*cell + j*cell*0.5, y: cy - j*rowH }` — prototype line 961. Identical.
- Viewport culling `if (p.x < -cell || p.x > W+cell || p.y < -cell || p.y > H+cell) continue` — prototype line 965. Identical condition.
- Triangle generation from culled nodeAt map — prototype lines 979–991. Port calls `computeTonnetzTriangles(coreNodes, root, mode)` on the full core set (per ADR 0003), then filters to triangles where all three vertices survived viewport culling. This preserves diatonic info lookup identity with the prototype (`dia[key]` → `info`) while satisfying ADR 0003 (pixel layout remains render-layer).
- Centroid `cxT=(ra.x+rb.x+rc.x)/3`, `cyT=(...)` — prototype line 975. Identical formula.
- Triangle fill: `FUNC_COL[info.func.cls] ?? COL.node` for in-key, alpha 0.16; `COL.bg` alpha 0.04 for out-of-key — prototype lines 996–1001. Semantically identical (prototype uses `|| COL.node`; port uses `?? COL.node` — equivalent since FUNC_COL values are nonzero hex numbers, not falsy).
- Edges: `hGrid.lineStyle(1, COL.line, 0.9)`, moveTo/lineTo per triangle — prototype lines 1004–1009. Identical.
- `scaleSet = new Set(SCALE_INTERVALS[mode].map(iv => (root+iv)%12))` — prototype line 1012. Identical logic.
- Node circles: `hNodes.beginFill(0x0c0e13,1); hNodes.lineStyle(1.4, inScale?COL.accent:COL.faint, inScale?0.8:0.5); hNodes.drawCircle(n.x,n.y, inScale?13:10); hNodes.endFill()` — prototype lines 1015–1016. Byte-identical arguments.
- `new PIXI.Text(NOTE_NAMES[n.pc], { fontFamily:FONT_SERIF, fontSize:inScale?15:12.5, fill:inScale?0xeaedf4:0x6d7384, fontWeight:'500' })` with `anchor.set(0.5)`, `resolution=2`, positioned at `(n.x, n.y)` — prototype lines 1017–1022. Identical style values; `FONT_SERIF = 'Fraunces, serif'` matches prototype string exactly.
- Step 03.3 defers `computeNR()` call (prototype line 1024) to step 03.4.

**Deviation:** The `buildRhythmScene` exported from `tonnetz-scene.ts` is a no-op stub; the real implementation goes in `rhythm-scene.ts` (step 03.5). This deviates from the final file layout but is the minimal change needed to unblock `App.svelte` compilation without errors. The stub will be superseded in step 03.5 when `App.svelte` imports `buildRhythmScene` from `rhythm-scene.ts` instead.

### Validation evidence (per Acceptance ID)

- A-03-02 (proxy:static-analysis): `src/render/tonnetz-scene.ts` contains `buildTonnetz` which draws triangle fills by tonal function (`FUNC_COL[info.func.cls]`), node circles with scale-member highlighting (`inScale ? COL.accent : COL.faint`), and note-name labels (`NOTE_NAMES[n.pc]`, `FONT_SERIF`). All geometry formulas verified against prototype lines 947–1025. Visual verification pending Pilot browser observation at step 03.6.
- A-03-08 (partial proxy): `onResize(() => { buildTonnetz(...); buildRhythmScene(...); })` wired in `App.svelte` — resize callback now drives both scene rebuilds. The debounce registration was already in `stage.ts` (step 03.2); this step completes the wiring. Still a proxy until Pilot browser-tests the resize behavior at step 03.6.
- A-03-10 gate commands: all four run, all exit 0. See Routine validations.

### Routine validations

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0 (after fixing ESLint `no-non-null-assertion` by restructuring the `info !== null` conditional)
- `pnpm build` → exit 0 (511 modules, no errors)
- `pnpm test` → 119 passed (5 test files, no regressions)
- `pnpm dev` → Vite server started at port 5186 without import errors. Visual verification pending Pilot browser observation.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | WebGL unavailable → clear error message, no crash | `src/render/stage.ts` (detection branch) | proxy:static-analysis | covered (step 03.2) |
| A-03-02 | Tonnetz grid visible: tonal-function triangle colors, node circles, note labels | `src/render/tonnetz-scene.ts` (buildTonnetz) | proxy:static-analysis | covered — pending live-system at step 03.6 |
| A-03-03 | Chord pick and P·L·R | (Pilot browser observation) | live-system | not covered — deferred to step 03.4 |
| A-03-04 | Voice-leading path animation | (Pilot browser observation) | live-system | not covered — deferred to step 03.4 |
| A-03-05 | Rhythm orbit view | (Pilot browser observation) | live-system | not covered — deferred to step 03.5 |
| A-03-06 | Radial↔linear morph | (Pilot browser observation) | live-system | not covered — deferred to step 03.5 |
| A-03-07 | Hover controls | (Pilot browser observation) | live-system | not covered — deferred to step 03.5 |
| A-03-08 | Resize behavior: grid and orbits rebuild debounced 120 ms | `src/render/stage.ts` (debounce) + `src/app/App.svelte` (onResize callback) | proxy:static-analysis | partial — wiring complete; live verification deferred to step 03.6 |
| A-03-09 | Phase 02 audio preserved | (Pilot browser observation) | live-system | not covered — deferred to step 03.6 |
| A-03-10 | Gate commands: tsc, lint, test, build all exit 0 | Dev ran all four gate commands | operability | covered |

**Notes on partial coverage:**
- A-03-02: Static geometry code is complete and parity-verified against prototype lines 947–1025. Live-system confirmation (Pilot browser observation) is deferred to step 03.6 per the phase file spec.
- A-03-08: Resize wiring complete in this step. Live resize behavior requires browser observation.

**Proxy disclosures:**
- A-03-02: buildTonnetz draws geometry using exact prototype formulas. The WebGL/DOM render environment is not exercisable in Node/Vitest. Source lines `src/render/tonnetz-scene.ts` 67–207 are cited as the proxy.
- A-03-08: `onResize` callback registered at `src/app/App.svelte` lines 68–72 (approximately). Debounce in `src/render/stage.ts` lines 109–116.

**Operability evidence:**
- A-03-10: `pnpm exec tsc --noEmit` → exit 0; `pnpm lint` → exit 0; `pnpm build` → exit 0 (511 modules); `pnpm test` → 119 passed. All four gate commands run on macOS Darwin 25.5.0 in `/Users/virtualmachine/Development/personal/Orbifold`.

### Decisions made (if any)

- `buildRhythmScene` stub exported from `tonnetz-scene.ts` rather than from `rhythm-scene.ts` for this step only. This avoids requiring `rhythm-scene.ts` to be meaningfully implemented before step 03.3. Step 03.5 will move the real implementation to `rhythm-scene.ts` and update `App.svelte` imports accordingly.
- Non-null assertion (`!`) avoided throughout by restructuring conditionals (ESLint `no-non-null-assertion` rule is configured as an error in this project).

### Proposed Decisions Register entries (if any)

None.

### Environment state after this step

- `src/render/tonnetz-scene.ts`: `buildTonnetz`, `buildRhythmScene` (stub), `getRenderNodes`, `getRenderTris`, `RenderNode`, `RenderTri` all exported.
- `src/app/App.svelte`: calls `buildTonnetz` and `buildRhythmScene` after `initStage`; `onResize` callback registered.
- `src/render/rhythm-scene.ts`: still a stub (`export {}`).
- All 119 Phase 01+02 tests passing. `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.

### Next-step context

- Step 03.4 must import `getRenderTris()` from `tonnetz-scene.ts` for hit-testing.
- `buildTonnetz` currently omits the `computeNR()` call at the end (prototype line 1024) — step 03.4 should call `updateTonnetzDynamic(state)` after `buildTonnetz` completes to restore P·L·R overlays on resize.
- The `app` variable in `App.svelte` `onMount` is used only in the null-check and the "Step 03.4 will call registerTicker(app) here" comment — step 03.4 must use it for `registerTicker(app)`.
- Step 03.5 will replace the `buildRhythmScene` stub in `tonnetz-scene.ts` with the real export from `rhythm-scene.ts`; `App.svelte` imports need updating then.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:** —
**Iteration:** 1 of 5
**Reason:** —
**Next action:** —
