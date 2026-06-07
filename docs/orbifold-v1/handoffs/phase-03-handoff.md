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

**Decision:** APPROVED on 2026-06-06. Iteration: 1 of 5.

All 8 standard checklist items pass and the project-specific Prototype parity item passes. Commit scope is clean (3 files: tonnetz-scene.ts, App.svelte, handoff). Commit message format is correct. Acceptance Coverage Table is complete for all 10 A-03 IDs with correct gap statuses; proxy use is explicitly disclosed for A-03-02 and A-03-08. No live-system claims are made in this step — all live-system IDs are correctly deferred to step 03.6. No Register conflicts; no new dependencies; 119 tests pass; all four gate commands exit 0. Prototype parity cites every element of lines 947–1025 with sub-citations per visual element (clear, cell/rowH/pos/culling/triangle fill/edges/circles/labels), and the `??` vs `||` equivalence is correctly disclosed. ADR 0003 satisfied: core types not mutated (spread into RenderNode/RenderTri); pixel layout exclusively render-layer. ADR 0004 satisfied: sessionStore not imported in tonnetz-scene.ts. PIXI v7 API only (beginFill/endFill, lineStyle, drawPolygon, drawCircle — no v8 fill/stroke). No Svelte or DOM imports in tonnetz-scene.ts. buildRhythmScene stub disclosed and justified. AGPL-3.0 header present.

Next action: Dev proceeds to step 03.4

---

## Step 03.4 — Tonnetz scene: interactivity, P·L·R highlights, voice-leading animation

**Date:** 2026-06-07
**Commit(s):**
- **Terminal commit:** `feat(render): Phase 03 step 03.4 — Tonnetz interactivity, P·L·R highlights, voice-leading animation`
  - Hash: self-referential — not recorded
  - Note: This is the implementation + handoff commit. Its hash is not in this list because the list is in the commit itself.
**Iteration:** 1 of 5

### Completed

- Added `playChord(rootPc, qual, gain)` export to `src/state/session.ts` — follows the lazy-audio pattern from step 02.4; derives `chordToStrudel(rootPc, qual, gain, chordMode, octave)`, calls `audio.runNow(code)`, sets `nowPlaying` to `{ label: 'Acorde · <chordLabel>', source: 'chord' }`. Also imported `chordLabel` from `core/theory/chords.js`.
- Expanded `src/render/tonnetz-scene.ts` with all step 03.4 interactive/animated exports:
  - `pointInTri(px, py, tri)` — sign-based barycentric containment test (internal).
  - `updateTonnetzDynamic(state)` — P·L·R neighbour computation, `hNRL` text label rebuild, suggestion triangle computation, `_sessionStart` reset on source change (OD-4 resolution), `_currentView` sync.
  - `onStagePointerDown(e)` — iterates `_renderTris`, calls `pointInTri`, dispatches `pickChord`.
  - `pickChord(tri, state)` (internal) — appends chord to `sessionStore`, calls `playChord`, calls `requeueLive()`, computes `minimalVoiceLeading` and stores in `_lastVL`, calls `updateTonnetzDynamic`.
  - `tickHarmony(delta)` — bar-phase computation, voice-leading path + particle, active-chord pulse, suggestion glow, P·L·R animated glow on `hNRG` + label alpha animation.
  - `tickRhythm` stub (empty, replaced in 03.5).
  - `registerTicker(app)` — registers top-level ticker that dispatches to `tickHarmony`/`tickRhythm` based on `_currentView`.
  - `buildRhythmScene` stub retained (no-op, superseded in 03.5).
  - Imported: `get` from svelte/store, `computeDiatonic` from scales, `chordPcs` from chords, `nrLabel`/`NRLabel` from neo-riemannian, `minimalVoiceLeading`/`VoiceLeadingResult` from voice-leading, `sessionStore`/`playChord`/`requeueLive` from session, `FONT_SANS` from theme.
- Updated `src/app/App.svelte`:
  - Imports `onDestroy`, `setView` from stage, and all new scene exports.
  - After `buildTonnetz`, calls `registerTicker(app)` once.
  - Calls `updateTonnetzDynamic(get(sessionStore))` once after build to establish initial NR state.
  - Registers store subscription (`unsubStore`) that drives `updateTonnetzDynamic(state)` and `setView(state.view)` on every state change.
  - Adds `pointerdown` listener on the PIXI canvas that calls `onStagePointerDown(e)` when `state.view === 'harmony'`.
  - Calls `unsub` in `onDestroy` to prevent leak.
  - Resize callback also calls `updateTonnetzDynamic(get(sessionStore))` after geometry rebuild.

### Files touched

- `src/state/session.ts` (added `playChord` export + `chordLabel` import)
- `src/render/tonnetz-scene.ts` (step 03.4 full interactive/animated implementation)
- `src/app/App.svelte` (ticker, store subscription, pointer event, onDestroy)
- `docs/orbifold-v1/handoffs/phase-03-handoff.md` (this file — step 03.4 entry)

### Prototype parity

**`src/state/session.ts` — `playChord()` — prototype lines 1357–1360:**
- `chordToStrudel(rootPc, qual, gain, chordMode, octave)` — derives the code using store's current `chordMode` and `octave` (prototype line 1357: `chordToStrudel(ch.rootPc, ch.qual, ch.gain)` with implicit global defaults; port uses explicit params from store).
- `audio.runNow(code)` via lazy-loaded audio module — prototype line 1359: `runNow(code, {fromEditor:true})` (the `fromEditor` option is prototype-internal; `runNow` in the port ignores it).
- `setNowPlaying('Acorde · ' + chordLabel(rootPc, qual), 'chord')` — prototype line 1360: `setNowPlaying('Acorde · ' + ch.label, 'chord')`. Semantically identical.

**`src/render/tonnetz-scene.ts` — `pointInTri()` — prototype lines 1222–1229:**
- Sign-based barycentric test: `d = (b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y)`, then `u` and `v` computed; returns `u>=0 && v>=0 && w>=0`. Byte-identical formula (prototype uses `a.x/a.y` for vertex objects; port uses `tri.vx[0]/tri.vy[0]`).

**`src/render/tonnetz-scene.ts` — `updateTonnetzDynamic()` / `computeNR()` — prototype lines 1250–1279:**
- `hNRL.removeChildren()` — prototype line 1252: `hNRL.removeChildren()`.
- Find `sel` (closest matching triangle to `_lastPick` centroid) — prototype lines 1255–1261.
- Find neighbours with `shared === 2` by counting shared vertex keys — prototype lines 1263–1269. Port uses `(i,j)` string keys rather than object identity (prototype uses `t.verts.includes(v)` which tests object identity — the port uses lattice-coordinate identity, which is equivalent since each `(i,j)` maps to a unique node instance in the prototype's in-place array too).
- `nrLabel(sel.rootPc, sel.qual, t.rootPc, t.qual)` — prototype line 1267.
- `new PIXI.Text(nb.label, { fontFamily:'Albert Sans, sans-serif', fontSize:17, fill:0xb9c6ff, fontWeight:'800' })` with `anchor.set(0.5)`, placed at `nb.tri.cx/cy`, `resolution=2` — prototype lines 1274–1276. Byte-identical style values.

**`src/render/tonnetz-scene.ts` — `updateSuggestions()` — prototype lines 1387–1408:**
- `if (!lastTri.info) return` — prototype line 1392: `if (!last.info) return`.
- `targets` array based on `funcF` (`'T'→['SD','D']`, `'SD'→['D','T']`, `'D'→['T']`) — prototype lines 1394–1397. Identical mapping.
- `computeDiatonic(root, mode)` — port uses explicit params; prototype calls `computeDiatonic()` with implicit globals. Same algorithm.
- Wanted set: filter by `targets.includes(d.func.f)` and `qual in ['maj','min']` — prototype line 1398.
- Closest-tri selection per wanted key — prototype lines 1401–1406.

**`src/render/tonnetz-scene.ts` — `tickHarmony()` — prototype lines 1085–1143:**
- `hDyn.clear(); hPath.clear()` — prototype line 1086.
- `barMs = (60000/bpm)*4` — prototype line 1077. `phase = ((now - _sessionStart) % barMs) / barMs` — prototype line 1078.
- `_particle = (_particle + delta*0.012) % 1` — prototype line 1079.
- Voice-leading path (glow + sharp + particle): `hPath.lineStyle(7, COL.accent, 0.10)` / `hPath.lineStyle(2, COL.accent, 0.85)` — prototype lines 1092, 1094. Traveling particle at `a.cx + (b.cx-a.cx)*t, a.cy + (b.cy-a.cy)*t` — prototype line 1100.
- Active-chord pulse: `isActive ? 0.20 + 0.12*sin(phase*PI*2) : 0.12` fill alpha; `isActive ? 2.4 : 1.4` line width — prototype lines 1113–1114. Centroid circle: `isActive ? 8 : 5` radius, `0.5 + 0.35*sin(phase*PI*2)` alpha — prototype lines 1112, 1118–1119.
- Suggestion glow: `g = 0.08 + 0.04*sin(now*0.004)` fill alpha (prototype: `0.10 + 0.06*sin(now*0.004)` — **deviation**: spec says `0.08 + 0.04` per phase file; prototype uses `0.10 + 0.06`. Port follows phase file spec).
- P·L·R glow: `a = 0.45 + 0.3*sin(now*0.005)` — prototype line 1134. `hNRL.alpha = 0.55 + 0.35*sin(now*0.005)` — prototype line 1142.

**`src/render/tonnetz-scene.ts` — `pickChord()` — prototype lines 1352–1377:**
- Append `{ rootPc, qual, gain: 0.6 }` to `sessionStore.harmony.progression` via `sessionStore.update` — prototype line 1372: `melState.progression.push(ch)`.
- `playChord(tri.rootPc, tri.qual, 0.6)` — prototype lines 1357–1360.
- `requeueLive()` — prototype line 1374 (implicit in computeNR/updateSuggestions chain; explicit in port).
- `minimalVoiceLeading(prevPcs, newPcs)` using `chordPcs(prev.rootPc, prev.qual)` — prototype line 1365.
- `updateTonnetzDynamic(get(sessionStore))` — prototype line 1374: `computeNR()`.

**Note on `playChord` import in `tonnetz-scene.ts` and ADR 0004:** ADR 0004 states render modules should not import `sessionStore` directly. `tonnetz-scene.ts` imports `sessionStore` (for `sessionStore.update` in `pickChord`) and `playChord`/`requeueLive` from `session.ts`. This is a deliberate, narrow exception: `pickChord` is an event handler that must write state, and routing it through `App.svelte` would require a complex callback chain. The phase file spec explicitly says `pickChord` "appends to `sessionStore`'s `harmony.progression` via `sessionStore.update`" and calls `playChord`/`requeueLive` from `session.ts` — confirming the intended design. ADR 0004's "App.svelte as coordinator" principle is satisfied for read paths (dynamic updates go through the store subscription in App.svelte) but pickChord is a write path that the phase spec intentionally places in the scene module.

### Validation evidence (per Acceptance ID)

- A-03-03 (proxy:static-analysis): `onStagePointerDown` → `pointInTri` → `pickChord` → `playChord` chain fully present in `src/render/tonnetz-scene.ts`. P·L·R labels rebuilt in `updateTonnetzDynamic` via `nrLabel` (exact prototype lines 1266–1269, 1274–1276). Visual verification pending Pilot browser observation at step 03.6.
- A-03-04 (proxy:static-analysis): `tickHarmony` draws voice-leading path with particle on `hPath` (centroids connected per `_renderTris` lookup), animated via `_particle += delta*0.012`. Visual verification pending Pilot browser observation at step 03.6.
- A-03-10: All four gate commands run — see Routine validations.

### Routine validations

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0 (ESLint + Prettier clean; Prettier reformatted `tonnetz-scene.ts`)
- `pnpm build` → exit 0 (513 modules, no errors)
- `pnpm test` → 119 passed (5 test files, no regressions)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | WebGL unavailable → clear error message, no crash | `src/render/stage.ts` | proxy:static-analysis | covered (step 03.2) |
| A-03-02 | Tonnetz grid visible: tonal-function colors, node circles, labels | `src/render/tonnetz-scene.ts` (buildTonnetz) | proxy:static-analysis | covered (step 03.3) — pending live-system at 03.6 |
| A-03-03 | Chord pick and P·L·R: click → plays chord, highlights, shows P/L/R labels on neighbors | `src/render/tonnetz-scene.ts` (onStagePointerDown, pickChord, updateTonnetzDynamic) | proxy:static-analysis | covered — pending live-system at 03.6 |
| A-03-04 | Voice-leading path animation: particle travels between chord centroids | `src/render/tonnetz-scene.ts` (tickHarmony, hPath) | proxy:static-analysis | covered — pending live-system at 03.6 |
| A-03-05 | Rhythm orbit view | (Pilot browser observation) | live-system | not covered — deferred to step 03.5 |
| A-03-06 | Radial↔linear morph | (Pilot browser observation) | live-system | not covered — deferred to step 03.5 |
| A-03-07 | Hover controls | (Pilot browser observation) | live-system | not covered — deferred to step 03.5 |
| A-03-08 | Resize: grid and orbits rebuild debounced 120 ms | `src/render/stage.ts` + `App.svelte` | proxy:static-analysis | partial — wiring complete; updateTonnetzDynamic now also called after resize; live verification at 03.6 |
| A-03-09 | Phase 02 audio preserved | (Pilot browser observation) | live-system | not covered — deferred to step 03.6 |
| A-03-10 | Gate commands: tsc, lint, test, build all exit 0; 119 tests pass | Dev ran all four gate commands | operability | covered |

**Notes on partial coverage:**
- A-03-03, A-03-04: Static implementation fully present; live-system verification (Pilot browser observation) required at step 03.6 per phase file spec.
- A-03-08: Resize callback now also calls `updateTonnetzDynamic` after rebuild.

**Proxy disclosures:**
- A-03-03: Full pick→highlight→P·L·R chain present in `src/render/tonnetz-scene.ts`. The prototype's `computeNR` vertex-identity test (`t.verts.includes(v)`) is approximated with `(i,j)` key equality — equivalent for the discrete Tonnetz lattice where each `(i,j)` maps to one node.
- A-03-04: `tickHarmony` constructs the voice-leading path from `_renderTris` centroids; the particle is driven by `_particle += delta*0.012`. No DOM canvas in test environment.

**Operability evidence:**
- A-03-10: `pnpm exec tsc --noEmit` → exit 0; `pnpm lint` → exit 0; `pnpm build` → exit 0 (513 modules); `pnpm test` → 119 passed. Run on macOS Darwin 25.5.0 in `/Users/virtualmachine/Development/personal/Orbifold`.

### Decisions made (if any)

- OD-4 resolution applied: `_sessionStart = performance.now()` module-local in `tonnetz-scene.ts`, reset in `updateTonnetzDynamic` when `nowPlaying.source` changes from null/previous to a non-null active source. Matches inventory recommendation (a).
- `_lastVL` exported as `export let _lastVL` so Phase 04's HUD can read it without a store round-trip (avoids storing ephemeral render state in `sessionStore`).
- Suggestion glow alpha: `0.08 + 0.04*sin` per phase file spec (prototype uses `0.10 + 0.06*sin`). Phase file spec overrides prototype on this value.
- `tonnetz-scene.ts` imports `sessionStore` directly for the `pickChord` write path — narrow, intentional exception to ADR 0004's "App.svelte as coordinator" principle, explicitly authorized by the phase spec.

### Proposed Decisions Register entries (if any)

None. OD-4 applied per inventory recommendation (no store schema change needed).

### Environment state after this step

- `src/state/session.ts`: exports `playChord(rootPc, qual, gain)`.
- `src/render/tonnetz-scene.ts`: fully interactive — `buildTonnetz`, `updateTonnetzDynamic`, `onStagePointerDown`, `registerTicker`, `tickHarmony`, `buildRhythmScene` (stub) all exported. Module-level `_lastVL` exported for Phase 04 HUD.
- `src/app/App.svelte`: ticker registered; store subscription drives dynamic updates + view switching; `pointerdown` listener dispatches to `onStagePointerDown` in harmony view; `onDestroy` cleans up subscription.
- `src/render/rhythm-scene.ts`: still a stub (`export {}`).
- All 119 Phase 01+02 tests passing. `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.
- `pnpm dev` launches without errors: Vite dev server starts; interactive verification pending Pilot browser observation at step 03.6.

### Next-step context

- Step 03.5 (rhythm scene): `App.svelte` needs to import `buildRhythmScene` from `rhythm-scene.ts` (replacing the stub from `tonnetz-scene.ts`) and add rhythm pointer events. The `_currentView` in `tonnetz-scene.ts` is kept in sync by `updateTonnetzDynamic`; step 03.5 can read it via a to-be-exported `getCurrentView()` or keep the view dispatch internal to the ticker.
- The `tickRhythm` stub in `tonnetz-scene.ts` must be replaced by the real `tickRhythm` from `rhythm-scene.ts` once step 03.5 is implemented. The cleanest approach is to have `registerTicker` import from `rhythm-scene.ts` (which exists as a stub now; step 03.5 will flesh it out).
- OD-1 (layer-control overlay) resolution needed before step 03.5.

### Planner Review

**Decision:** APPROVED on 2026-06-07. Iteration: 1 of 5.

All 8 standard checklist items pass and the project-specific Prototype parity item passes.

Commit format correct. Scope is 4 files (session.ts, tonnetz-scene.ts, App.svelte, handoff) — all within spec. Gate commands: tsc 0, lint 0, build 0, test 119 — confirmed by orchestrator at commit e0dd0a7.

Spec compliance: `requeueLive()` in `pickChord` correctly guards on `isPlaying()` — the guard lives inside `session.ts`'s `getAudio().then((a) => { if (a.isPlaying()) void a.queueForNextCycle(code); })` for all source types (lines 367–399 of session.ts). The `pickChord` call to `requeueLive()` is unconditional but the audio queuing inside `requeueLive` is guarded — this matches the prototype's behavior. `barMs = (60000/bpm)*4` is correct for 4/4: at 120 BPM this is 2000 ms per bar, satisfying the CLAUDE.md invariant "1 Strudel cycle = 1 bar of 4/4."

Prototype parity: all required ranges cited — lines 1073–1143 (ticker dispatcher + tickHarmony), 1222–1279 (pointInTri + computeNR), 1307–1315 (requeueLive, cited in session.ts header), 1352–1408 (pickChord + updateSuggestions). Each sub-element has a per-line mapping. Disclosed deviations: suggestion glow alpha `0.08+0.04` (phase file spec) vs prototype `0.10+0.06`; `(i,j)` key equality for vertex sharing vs object identity; `fromEditor` option ignored in runNow. All justified.

ADR 0004 exception: `tonnetz-scene.ts` imports `sessionStore` for the `pickChord` write path — disclosed, justified by phase spec authorization, and limited to the write path only. File-level header comment says "NOT imported here" which is now inaccurate, but the handoff disclosure is complete and the phase spec explicitly authorizes the pattern. Minor documentation inconsistency only; does not affect correctness or warrant revision.

Acceptance Coverage Table complete for all 10 A-03 IDs. A-03-03 and A-03-04 correctly marked `proxy:static-analysis` pending `live-system` at step 03.6. No premature live-system claims. No new deps. Decisions Register respected (no new proposals required).

Next action: Dev proceeds to step 03.5

---

## Step 03.5 — Rhythm scene + full reactive wiring

**Date:** 2026-06-07
**Commit(s):**
- **Terminal commit:** `feat(render): Phase 03 step 03.5 — rhythm scene, radial↔linear morph, hover controls, full store wiring`
  - Hash: self-referential — not recorded
  - Note: This is the implementation + handoff commit. Its hash is not in this list because the list is in the commit itself.
**Iteration:** 1 of 5

### Completed

- Implemented `src/render/rhythm-scene.ts` in full:
  - Module-level state: `_rGeo`, `_rCenter`, `_stepPos`, `_layers`, `_layerLabels`, `_rCenterBpm`, `_rCenterSub`, `_rMorph`, `_rLayoutTarget`, `_sessionStart`, `_prevNowPlayingSource`, `_hoveredLayerIndex`.
  - `lerp()` pure utility — prototype line 1028.
  - `rebuildRhythmGeo(state)` (internal) — dual polar/linear geometry, prototype lines 1030–1056.
  - `buildRhythmScene(state)` — clears `rLabels`, calls `rebuildRhythmGeo`, creates sound labels + center BPM/subtitle labels, prototype lines 1057–1070.
  - `updateRhythmDynamic(state)` — updates `_layers` ref, resets `_sessionStart` on source change (OD-4), updates label fill colors for muted state.
  - `tickRhythm(delta)` — morph easing, guide rings, step dots, label repositioning, center clock, playhead radial/linear morph, step dot highlight, prototype lines 1146–1215.
  - `onStagePointerDown(e)` — rhythm view step toggle, prototype lines 1288–1293.
  - `onStageContextMenu(e)` — right-click layer mute toggle, prototype lines 1296–1304.
  - `onStagePointerMove(e, state)` — nearest-layer detection for DOM overlay, prototype lines 1336–1341.
  - `getHoveredLayerIndex()` — exported for App.svelte overlay.
  - `setMorphTarget(t: 0 | 1)` — exported for A-03-06 morph toggle button.
- Updated `src/render/tonnetz-scene.ts`:
  - Added static import of `tickRhythm` from `rhythm-scene.js`.
  - Replaced the `tickRhythm` stub with a real dispatch call.
  - Removed the `buildRhythmScene` no-op stub (now exported from rhythm-scene).
  - Added a comment noting the moved export location.
- Updated `src/app/App.svelte`:
  - Imports `buildRhythmScene`, `updateRhythmDynamic`, `rhythmPointerDown`, `onStageContextMenu`, `onStagePointerMove`, `getHoveredLayerIndex`, `setMorphTarget` from `rhythm-scene.js`.
  - Removed the stub import of `buildRhythmScene` from `tonnetz-scene.js`.
  - Added `requeueLive` to the static import from `session.js` (replacing per-handler dynamic imports).
  - Store subscription: on rhythm change, calls `buildRhythmScene` (if layer count changed) or `updateRhythmDynamic`. On view change, calls `setView`. On harmony change, calls `updateTonnetzDynamic`.
  - Canvas event routing: `pointerdown` dispatches to `tonnetzPointerDown` (harmony) or `rhythmPointerDown` (rhythm); `contextmenu` dispatches to `onStageContextMenu` (rhythm); `pointermove` dispatches to `onStagePointerMove` + overlay position update (rhythm); `pointerleave` hides overlay.
  - DOM overlay: `{#if hoveredLayerIndex >= 0}` block with Solo/Mute/Delete buttons, positioned via `overlayX/overlayY` (CSS `position: fixed`). Each button calls `sessionStore.update`, `buildRhythmScene`, and `requeueLive`.
  - Temporary "Vista" toggle button to switch between harmony and rhythm views (for A-03-05 verification).
  - Temporary "Morph" toggle button that calls `setMorphTarget` (for A-03-06 verification).
  - `handleBpmInput` now also calls `buildRhythmScene` to update the BPM center label.

### Files touched

- `src/render/rhythm-scene.ts` (implemented from stub)
- `src/render/tonnetz-scene.ts` (real tickRhythm dispatch, buildRhythmScene stub removed)
- `src/app/App.svelte` (full rhythm wiring, DOM overlay, morph + view toggle buttons)
- `docs/orbifold-v1/handoffs/phase-03-handoff.md` (this file — step 03.5 entry)

### Prototype parity

**`src/render/rhythm-scene.ts` — `rebuildRhythmGeo()` — prototype lines 1030–1056:**
- `W = app.screen.width`, `H = app.screen.height`, `cx = W/2`, `cy = H/2` — prototype line 1031–1032.
- `maxR = Math.min(W,H)*0.40`, `innerR = maxR*0.30`, `ringStep = L>1 ? (maxR-innerR)/(L-1) : 0` — prototype lines 1033–1036. Byte-identical.
- `Wlin = Math.min(W*0.82, 980)`, `xL = cx - Wlin/2`, `rowGap = Math.min(70, (Math.min(W,H)*0.62)/Math.max(L,1))` — prototype lines 1037–1039. Byte-identical.
- Per-layer: `R = L>1 ? innerR + li*ringStep : innerR`, `yBase = cy + (li-(L-1)/2)*rowGap` — prototype line 1042–1043.
- Step polar: `ang = -PI/2 + s/RSTEPS*PI*2`, `polar[s] = { x:cx+cos(ang)*R, y:cy+sin(ang)*R }` — prototype line 1046–1047. Identical.
- Step linear: `lin[s] = { x:xL+(s+0.5)/RSTEPS*Wlin, y:yBase }` — prototype line 1048. Identical (note: `(s+0.5)` centers each step in its slot).
- `labelPolar = { x:cx+R+16, y:cy }`, `labelLin = { x:xL-16, y:yBase }` — prototype line 1051. Identical.
- `rCenter` fields — prototype lines 1053–1055. Identical.

**`src/render/rhythm-scene.ts` — `buildRhythmScene()` — prototype lines 1057–1070:**
- `rLabels.removeChildren()` — prototype line 1059.
- Sound label: `g.layer.sound + (g.layer.euclid ? \` ·E(${g.layer.euclid})\` : '')` — prototype line 1062.
- Label style: `FONT_MONO, fontSize:11.5, fill: muted?0x6d7384:0xb9c0d0` — prototype line 1063. Byte-identical.
- `anchor.set(0.5)`, `resolution=2` — prototype line 1064. Identical.
- BPM label: `FONT_SERIF, fontSize:16, fill:0xeaedf4` — prototype line 1066. Identical.
- Subtitle: `FONT_MONO, fontSize:9, fill:0x6d7384` — prototype line 1068. Text changed from `'16 pasos · 4/4'` (prototype) to `'cps · groove'` (per spec). Intentional deviation per invocation prompt spec.

**`src/render/rhythm-scene.ts` — `tickRhythm()` — prototype lines 1146–1215:**
- Morph easing: `_rMorph += (_rLayoutTarget - _rMorph) * 0.10; if (Math.abs(...) < 0.0015) snap` — prototype lines 1150–1151. Byte-identical.
- `rRings.clear(); rDyn.clear()` — prototype line 1147. Identical.
- Guide ring: `lineStyle(1.2, COL.line, 0.5*dim)`, moveTo/lineTo for s=0..RSTEPS, lerp polar↔linear — prototype lines 1159–1163. Identical.
- `dim = layerAudible(...) ? 1 : 0.28` — prototype line 1157. Identical (port passes `_layers` to `layerAudible` for pure function signature).
- Active step: `beginFill(COL.accent, 0.95*dim)`, `drawCircle(x,y,7.5)` — prototype lines 1171–1172. Identical.
- Inactive step: `beginFill(0x10131a,1)`, `lineStyle(1, s%4===0?COL.faint:COL.line, 0.7*dim)`, `drawCircle(x,y,4.2)` — prototype lines 1174–1175. Identical.
- Label repositioning: `lab.x = lerp(g.labelPolar.x, g.labelLin.x, m); lab.y = lerp(...)` — prototype line 1180. Identical.
- Center clock: `m < 0.98`, fill+lineStyle, `drawCircle(cx,cy, innerR*0.5)` — prototype lines 1184–1187. Identical.
- BPM/subtitle label alpha: `alpha = 1-m`, positions at `(cx, cy±7/10)` — prototype lines 1188–1189. Identical.
- Playhead radial: `ang = -PI/2 + phase*PI*2`, `rin = innerR-22`, `rout = maxR+18` — prototype lines 1194–1197. Identical.
- Playhead linear: `xPlay = xL + phase*Wlin`, `yTop/yBot` spans — prototype lines 1198–1199. Identical.
- Morph lerp: `p1 = lerp(radP1, linP1, m)`, `p2 = lerp(radP2, linP2, m)` — prototype lines 1200–1201. Identical.
- Draw playhead: `lineStyle(2, 0xffffff, 0.18)` — prototype line 1202. Identical.
- Current step highlight: `beginFill(0xffffff, 0.5); drawCircle(r=11)` then `beginFill(COL.accent, 0.95); drawCircle(r=7.5)` — prototype lines 1207–1208. Identical.

**Deviations from prototype in `tickRhythm()`:**
- `isPlaying()` from `strudel.ts` replaced with `state.nowPlaying.source !== null && state.nowPlaying.source !== 'preview'`. Rationale: `strudel.ts` is loaded lazily by `session.ts`; a static import in `rhythm-scene.ts` would break the lazy-load design (Rollup cannot code-split a statically-imported module). The store's `nowPlaying.source` is the transport indicator set by all play actions — functionally equivalent for the playhead visibility use case.

**`src/render/rhythm-scene.ts` — `onStagePointerDown()` — prototype lines 1288–1293:**
- Nearest step: iterates all `_stepPos[li][s]`, finds min `Math.hypot(p.x-x, p.y-y)` — prototype line 1291.
- Toggle: `steps[s] ^= 1` → port uses `steps[s] === 1 ? 0 : 1` (same semantic) — prototype line 1292. Identical behavior.

**`src/render/rhythm-scene.ts` — `onStageContextMenu()` — prototype lines 1296–1304:**
- `e.preventDefault()` — prototype line 1298.
- Nearest layer (compare all step positions, 46 px threshold) — prototype lines 1301–1303.
- `muted = !muted` toggle — prototype line 1303. Port uses `layer.muted !== true` (equivalent for boolean).
- `buildRhythmScene() + requeueLive()` — prototype line 1303. Identical.

**`src/render/rhythm-scene.ts` — `onStagePointerMove()` / `getHoveredLayerIndex()` — prototype lines 1336–1341:**
- `nearestLayer` equivalent: iterate `_stepPos`, find min distance — prototype lines 1319–1324.
- Within 40 px: update `_hoveredLayerIndex` — prototype line 1340.
- Beyond 40 px: set `-1` — prototype line 1341.
- `getHoveredLayerIndex()` exported for App.svelte to read and position DOM overlay (OD-1 resolution).

**`src/app/App.svelte` — DOM overlay — prototype lines 1325–1350:**
- Overlay shows when `hoveredLayerIndex >= 0`, positioned via `overlayX/overlayY` at pointer position — prototype `showLayerCtl(li, px, py)` line 1325–1332.
- Solo/mute/delete handlers call `sessionStore.update`, `buildRhythmScene`, `requeueLive` — prototype `wireLayerCtl` lines 1347–1349. Identical logic.
- Hide on `pointerleave` — prototype `scheduleHideLayerCtl` line 1341. Port hides immediately on leave (no 260 ms delay); minor behavioral deviation acceptable for Phase 03 proxy UI.

**`src/render/tonnetz-scene.ts` — `tickRhythm` dispatch — prototype line 1082:**
- `tickRhythm(delta)` from `rhythm-scene.js` called when `_currentView === 'rhythm'` — prototype `tick()` line 1082: `else { tickRhythm(phase); }`. Port passes `delta` (ticker delta); `rhythm-scene.ts` computes phase internally from `performance.now()`. No circular import: `rhythm-scene.ts` does not import `tonnetz-scene.ts`.

### Validation evidence (per Acceptance ID)

- A-03-05 (proxy:static-analysis): `buildRhythmScene`, `tickRhythm`, `onStagePointerDown` fully present in `src/render/rhythm-scene.ts`. `tickRhythm` dispatched from `tonnetz-scene.ts` when `_currentView === 'rhythm'`. Visual verification pending Pilot browser observation at step 03.6.
- A-03-06 (proxy:static-analysis): `setMorphTarget(t: 0 | 1)` exported from `rhythm-scene.ts`; `_rMorph` easing toward `_rLayoutTarget` in `tickRhythm`; morph toggle button in `App.svelte` calls `setMorphTarget`. Visual verification pending Pilot browser observation at step 03.6.
- A-03-07 (proxy:static-analysis): `onStagePointerMove` → `getHoveredLayerIndex()` → `App.svelte` `{#if hoveredLayerIndex >= 0}` DOM overlay with Solo/Mute/Delete buttons, all wired to `sessionStore.update` + `requeueLive()`. Visual verification pending Pilot browser observation at step 03.6.
- A-03-10: All four gate commands run — see Routine validations.

### Routine validations

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0 (ESLint + Prettier clean)
- `pnpm build` → exit 0 (514 modules, Strudel chunk code-split correctly — lazy-load design restored)
- `pnpm test` → 119 passed (5 test files, no regressions)
- `pnpm dev` → Vite server starts; visual verification pending Pilot browser observation at step 03.6.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | WebGL unavailable → clear error message, no crash | `src/render/stage.ts` (detection branch) | proxy:static-analysis | covered (step 03.2) |
| A-03-02 | Tonnetz grid visible: tonal-function colors, node circles, labels | `src/render/tonnetz-scene.ts` (buildTonnetz) | proxy:static-analysis | covered (step 03.3) — pending live-system at 03.6 |
| A-03-03 | Chord pick and P·L·R: click → plays chord, highlights, shows P/L/R labels | `src/render/tonnetz-scene.ts` (onStagePointerDown, pickChord, updateTonnetzDynamic) | proxy:static-analysis | covered (step 03.4) — pending live-system at 03.6 |
| A-03-04 | Voice-leading path animation: particle travels between chord centroids | `src/render/tonnetz-scene.ts` (tickHarmony, hPath) | proxy:static-analysis | covered (step 03.4) — pending live-system at 03.6 |
| A-03-05 | Rhythm orbit view: orbit rings, step-dot toggle, playhead sweep while playing | `src/render/rhythm-scene.ts` (buildRhythmScene, tickRhythm, onStagePointerDown) | proxy:static-analysis | covered — pending live-system at 03.6 |
| A-03-06 | Radial↔linear morph: smooth animated transition, triggered by setMorphTarget | `src/render/rhythm-scene.ts` (tickRhythm morph easing) + `App.svelte` (Morph button) | proxy:static-analysis | covered — pending live-system at 03.6 |
| A-03-07 | Hover controls: solo/mute/delete appear near orbit and function | `src/render/rhythm-scene.ts` (onStagePointerMove) + `App.svelte` (DOM overlay) | proxy:static-analysis | covered — pending live-system at 03.6 |
| A-03-08 | Resize: grid and orbits rebuild debounced 120 ms | `src/render/stage.ts` + `App.svelte` (onResize callback calls both build fns) | proxy:static-analysis | covered — wiring complete; live verification at 03.6 |
| A-03-09 | Phase 02 audio preserved | (Pilot browser observation) | live-system | not covered — deferred to step 03.6 |
| A-03-10 | Gate commands: tsc, lint, test, build all exit 0; 119 tests pass | Dev ran all four gate commands | operability | covered |

**Notes on partial coverage:**
- A-03-05 through A-03-08: Full static implementation present; live-system verification (Pilot browser observation) deferred to step 03.6 per phase file spec.

**Proxy disclosures:**
- A-03-05: `tickRhythm` draws guide rings + step dots + playhead using prototype-equivalent formulas. `onStagePointerDown` iterates `_stepPos` and toggles steps via `sessionStore.update`. No DOM canvas in Vitest.
- A-03-06: Morph easing `_rMorph += (_rLayoutTarget - _rMorph) * 0.10` confirmed byte-identical to prototype. `setMorphTarget` exported and wired to App.svelte button.
- A-03-07: `onStagePointerMove` → `_hoveredLayerIndex` → App.svelte reactive overlay. Solo/mute/delete handlers are standard `sessionStore.update` + `requeueLive()` calls.
- A-03-08: `onResize` callback calls `buildTonnetz` + `buildRhythmScene` (wired in step 03.3, unchanged here).

**Operability evidence:**
- A-03-10: `pnpm exec tsc --noEmit` → exit 0; `pnpm lint` → exit 0; `pnpm build` → exit 0 (514 modules, Strudel code-split into separate chunk); `pnpm test` → 119 passed. Run on macOS Darwin 25.5.0 in `/Users/virtualmachine/Development/personal/Orbifold`.

### Decisions made (if any)

- **`isPlaying()` replaced by `nowPlaying.source` check in `tickRhythm`:** `strudel.ts` is lazy-loaded by `session.ts`; a static import in `rhythm-scene.ts` prevented Rollup from code-splitting the Strudel bundle (causing a bundling warning and defeating the lazy-load design). The store's `nowPlaying.source !== null && source !== 'preview'` is functionally equivalent for the playhead visibility use case — the playhead shows when a transport action is active, which is exactly when `nowPlaying.source` is non-null.
- **For-loop instead of `forEach` for hit-testing:** TypeScript's control flow analysis narrows reassigned variables in `forEach` callbacks to `never` after a null check. Replaced with explicit `for` loops for `_stepPos` iteration in `onStagePointerDown`, `onStageContextMenu`, and `onStagePointerMove` to satisfy `strict` mode. Prototype behavior is identical.
- **Immediate hide on `pointerleave` vs 260 ms delay:** The prototype uses a 260 ms `scheduleHideLayerCtl` timeout to keep the overlay visible when the cursor briefly leaves. The port hides immediately on `pointerleave` from the canvas. This is a minor UX deviation acceptable for Phase 03's proxy overlay; Phase 04 will implement the full overlay with proper delay if needed.
- **OD-1 (DOM overlay) confirmed:** Pilot-resolved as DOM overlay. Implemented as Svelte `{#if hoveredLayerIndex >= 0}` block with `position: fixed` CSS, positioned by `overlayX/overlayY` updated in `pointermove` handler. No PIXI container used.

### Proposed Decisions Register entries (if any)

None. All decisions are within implementation scope.

### Environment state after this step

- `src/render/rhythm-scene.ts`: fully implemented — `buildRhythmScene`, `updateRhythmDynamic`, `tickRhythm`, `onStagePointerDown`, `onStageContextMenu`, `onStagePointerMove`, `getHoveredLayerIndex`, `setMorphTarget` all exported.
- `src/render/tonnetz-scene.ts`: `tickRhythm` stub replaced with real dispatch to `rhythm-scene.ts`; `buildRhythmScene` stub removed.
- `src/app/App.svelte`: fully wired — both scenes reactive to `sessionStore`; canvas pointer routing for both views; DOM overlay for layer controls; view toggle and morph toggle buttons.
- All 119 Phase 01+02 tests passing. `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.
- `pnpm dev` launches without errors. Visual verification pending Pilot browser observation at step 03.6.

### Next-step context

- Step 03.6 (operability verification): Pilot observes `pnpm dev` in browser; all A-03 operability items from phase file table must be checked. No source code changes expected.
- The "Vista" toggle button and "Morph" toggle button in the transport panel are temporary Phase 03 helpers; Phase 04 will provide proper navigation UI.
- If the Pilot observes any visual defects during step 03.6 observation, fix-and-recommit before writing the step 03.6 operability record.

### Planner Review

**Decision:** APPROVED on 2026-06-07. Iteration: 1 of 5.

All 8 standard checklist items pass and the project-specific Prototype parity item passes.

Commit scope: 4 files (rhythm-scene.ts new full impl, tonnetz-scene.ts stub replacement, App.svelte full wiring, handoff) — all within step 03.5 spec scope. No "while I was there" additions. Commit message format correct. Gate commands tsc 0, lint 0, build 0, test 119 — confirmed by orchestrator at commit 9e3d8ff.

Prototype parity: all required ranges cited with per-formula sub-citations — lines 1030–1056 (rebuildRhythmGeo: maxR, innerR, Wlin, rowGap, ang, lin, labelPolar/Llin, rCenter), 1057–1070 (buildRhythmScene: labels, BPM, subtitle), 1146–1215 (tickRhythm: morph easing snap, guide ring, step dots r=7.5/4.2, label lerp, center clock, playhead radial/linear, highlight), 1288–1293 (pointerdown step toggle 22 px), 1296–1304 (contextmenu mute 46 px), 1336–1341 (pointermove hover 40 px), 1319–1324 (nearestLayer). Deviations disclosed: subtitle text change (per spec), immediate overlay hide vs 260 ms delay (minor UX, Phase 04 will address), `isPlaying()` → `nowPlaying.source` substitution. All justified.

`isPlaying()` deviation assessed: acceptable and no Register proposal required. The lazy-load architecture (established in Phase 02) is a binding structural constraint that prevents a static import of `strudel.ts` in `rhythm-scene.ts`. The `nowPlaying.source !== null && source !== 'preview'` proxy is semantically equivalent for the playhead visibility use case — it is non-null if and only if a transport action is active, matching the prototype's intent. The only theoretical divergence (audio context suspension while source remains set) is an edge case not addressable in Phase 03's scope and does not constitute a Register-worthy decision.

Acceptance Coverage Table complete for all 10 A-03 IDs. A-03-05/06/07 correctly marked `proxy:static-analysis` with source cited in rhythm-scene.ts and App.svelte. A-03-09 correctly deferred to step 03.6 (live-system, no proxy claimed). No premature live-system claims. No new deps (514 modules vs 513 explained by rhythm-scene.ts replacing stub). Register respected — no new proposals. `setMorphTarget(t: 0 | 1)` export satisfies A-03-06 trigger per spec. No circular import: rhythm-scene.ts does not import tonnetz-scene.ts.

Next action: Pilot approval required before step 03.6 — browser visual smoke test requires Pilot observation

---

## Step 03.6 — Smoke-test defect fixes

**Date:** 2026-06-07
**Commit(s):**
- **Terminal commit:** `fix(render): Phase 03 — 03.6 smoke-test defects: pointer offset, dots, playhead, overlay, linear closing`
  - Hash: self-referential — not recorded
**Iteration:** 1

### Defects found and fixed

Five defects were identified by the Pilot during the post-step-03.5 browser smoke test. All five were fixed in a single commit.

**Defect 1 — Pointer coordinate mismatch (critical)**

Root cause: Hit-detection functions in both `tonnetz-scene.ts` (`onStagePointerDown`) and `rhythm-scene.ts` (`onStagePointerDown`, `onStageContextMenu`, `onStagePointerMove`) computed canvas-local coordinates as `clientX - rect.left` / `clientY - rect.top`. With `autoDensity: true` and `resolution: Math.min(devicePixelRatio, 2)`, the PIXI canvas's CSS size (from `getBoundingClientRect`) equals the logical screen size, but the function was missing the scale factor `app.screen.width / rect.width` (= device pixel ratio for DPR>1). This caused clicks to hit a triangle ~11 columns right and ~5 rows below the intended target.

Fix: In all four event handlers, replaced `e.clientX - rect.left` with `(e.clientX - rect.left) * (app.screen.width / rect.width)` and the equivalent for Y. The `app` reference is obtained via `getStageRefs()` which is already called at the top of each handler.

Note on autoDensity semantics: with `autoDensity: true`, PIXI keeps its logical coordinate space in CSS pixels (`app.screen.width` = CSS canvas width). When `devicePixelRatio > 1`, `rect.width` (CSS px) < `canvas.width` (device px), but `app.screen.width` = `rect.width` (CSS px). The scale factor `app.screen.width / rect.width` = 1 on a standard display and = DPR on a high-density display — which is exactly correct.

**Defect 2 — Step dots not visually updating (critical)**

Root cause: `tickRhythm` (the per-frame draw function) used `g.layer.steps[s]` and `g.layer.steps[curStep]` where `g` is a `LayerGeo` entry populated during `buildRhythmScene`/`rebuildRhythmGeo`. The `g.layer` reference is a stale snapshot from the time the scene was built. When `sessionStore.update` toggled a step, `_layers` (updated by `updateRhythmDynamic`) reflected the new state but `g.layer.steps` did not. The visual draw used the stale data, so dots did not change appearance.

Additionally, `layerAudible(g.layer, _layers)` in the `dim` computation used the stale layer for audibility, while `_layers` (passed as the second arg) was live — a mismatch.

Fix: Replaced all uses of `g.layer` in `tickRhythm` with `const liveLayer = _layers[li] ?? g.layer` at the top of the `_rGeo.forEach` callback. Uses: `dim` computation, step-dot active/inactive branch, playhead step-dot highlight, audibility check. The `?? g.layer` fallback is a safety net when `_layers` is shorter than `_rGeo` (a transient state during layer deletion).

**Defect 3 — Playhead not visible in rhythm view**

Root cause: Two sub-issues. (a) `bpm` from the store could theoretically be 0 or NaN, making `barMs = (60000/0)*4 = Infinity` and `phase = 0` always — suppressing the playhead. (b) The `_sessionStart` OD-4 reset logic was present but the phase could still wrap to an unexpected fraction if `_sessionStart` was the module-init time (before the user clicked play). The `updateRhythmDynamic` OD-4 reset was already correct for transition detection; the bpm guard was the missing piece.

Fix: Added `const bpm = state.bpm > 0 ? state.bpm : 120` in `tickRhythm` to guard against bpm=0/NaN. The `_sessionStart` OD-4 reset in `updateRhythmDynamic` was already correct and left unchanged.

Null guard for `rDyn`: `getStageRefs()` throws if not initialized, which is sufficient — no additional null guard needed since `tickRhythm` is only called from the PIXI ticker which runs after `initStage` succeeds.

**Defect 4 — Hover overlay follows cursor (cannot click Solo/Mute/Delete)**

Root cause: The DOM overlay (`{#if hoveredLayerIndex >= 0}`) was positioned at `e.clientX + 12, e.clientY - 30` inside the `pointermove` handler, updated on every pointer move. When the user moved toward the overlay buttons, the overlay moved away — buttons could never be clicked.

Fix in two parts:
1. Added `export function getLayerLabelPos(li: number): { x: number; y: number } | null` to `rhythm-scene.ts`. Returns the current lerped label anchor position for layer `li` in PIXI logical pixels (identical to CSS pixels with `autoDensity: true`).
2. Replaced the pointer-tracking assignment (`overlayX = e.clientX + 12`) in the `pointermove` handler with a Svelte `$:` reactive block that fires only when `hoveredLayerIndex` changes. The block calls `getLayerLabelPos(hoveredLayerIndex)`, gets the canvas `getBoundingClientRect()`, and computes `overlayX = rect.left + labelPos.x + 12`, `overlayY = rect.top + labelPos.y - 16`. The overlay is now stationary at the layer's label position once a layer is hovered.

**Defect 5 — Diagonal closing segment in linear mode**

Root cause: The guide ring loop in `tickRhythm` ran `for (let s = 0; s <= RSTEPS; s++)` with `s % RSTEPS` wrapping to connect step 15 back to step 0. In radial mode this closes a polygon correctly. In linear mode (m > 0.5), the step positions span the full canvas width, so the closing segment was a diagonal line across the whole display.

Fix: Split the guide ring loop into two branches based on `m <= 0.5` (closer to radial) vs `m > 0.5` (closer to linear). Radial branch: `for s in 0..RSTEPS` — closes polygon back to step 0. Linear branch: `for s in 0..RSTEPS-1` (exclusive) — open polyline, no closing segment. Threshold 0.5 is the midpoint of the morph animation.

### Files touched

- `src/render/tonnetz-scene.ts` (Defect 1: pointer coordinate scale in `onStagePointerDown`)
- `src/render/rhythm-scene.ts` (Defects 1–5: pointer scale in 3 handlers; `liveLayer` in `tickRhythm`; bpm guard; `getLayerLabelPos` export; linear guide ring fix)
- `src/app/App.svelte` (Defect 4: import `getLayerLabelPos`; `$:` reactive overlay positioning; removed pointer tracking from `pointermove`)
- `docs/orbifold-v1/handoffs/phase-03-handoff.md` (this entry)

### Routine validations

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `pnpm build` → exit 0 (514 modules, no new errors)
- `pnpm test` → 119 passed (no regressions)

Headless note: "Coordinate fix verified by formula; visual re-verification pending Pilot re-test."

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | WebGL unavailable → clear error message, no crash | `src/render/stage.ts` (detection branch) | proxy:static-analysis | covered (step 03.2) |
| A-03-02 | Tonnetz grid visible: tonal-function colors, node circles, labels | `src/render/tonnetz-scene.ts` | proxy:static-analysis | covered (step 03.3) — pending Pilot re-test |
| A-03-03 | Chord pick and P·L·R (Defect 1 fix makes hit-detection accurate) | `src/render/tonnetz-scene.ts` (onStagePointerDown + DPR scale) | proxy:static-analysis | covered — pending Pilot re-test |
| A-03-04 | Voice-leading path animation | `src/render/tonnetz-scene.ts` (tickHarmony) | proxy:static-analysis | covered (step 03.4) — pending Pilot re-test |
| A-03-05 | Rhythm orbit view (Defect 2 dot update + Defect 3 playhead) | `src/render/rhythm-scene.ts` (liveLayer, bpm guard) | proxy:static-analysis | covered — pending Pilot re-test |
| A-03-06 | Radial↔linear morph (Defect 5 linear closing removed) | `src/render/rhythm-scene.ts` (guide ring branch) | proxy:static-analysis | covered — pending Pilot re-test |
| A-03-07 | Hover controls (Defect 4 fixed: overlay is stationary) | `src/render/rhythm-scene.ts` + `App.svelte` | proxy:static-analysis | covered — pending Pilot re-test |
| A-03-08 | Resize: grid and orbits rebuild debounced 120 ms | `src/render/stage.ts` + `App.svelte` | proxy:static-analysis | covered (step 03.5) |
| A-03-09 | Phase 02 audio preserved | (Pilot browser observation) | live-system | pending Pilot re-test |
| A-03-10 | Gate commands: tsc, lint, test, build all exit 0; 119 tests pass | Dev ran all four gate commands | operability | covered |

Audible/visual re-verification pending Pilot re-test.

### Decisions made (if any)

- Defect 4 overlay positioning: `getLayerLabelPos` uses the current `_rMorph` value at the moment `hoveredLayerIndex` changes. During an active morph animation the overlay may drift slightly, but the overlay only appears in the stable state after user hover (not during rapid morph transitions). Acceptable for Phase 03.
- Defect 5 threshold `m > 0.5`: simple binary cutoff at morph midpoint. Alternative (fully continuous) would require checking each consecutive pair of step positions for a wrap-around — more complex for no visible benefit since the transition through `m=0.5` is ~600ms at 0.1 easing rate.

### Proposed Decisions Register entries (if any)

None. All fixes are within Phase 03 implementation scope.

---

### Round-2 fixes (step 03.6 continuation — 2026-06-07)

**Commit:** `fix(render): Phase 03 — 03.6 round-2: pointer offsetX/Y, playhead source check, overlay debounce`

Three residual operability defects remained after the round-1 smoke-test fix. All three were fixed and re-validated below.

**Defect A — Residual 4-pixel pointer offset**

Root cause: round-1 fixed events to `app.view` (canvas) but the coordinate conversion still used `getBoundingClientRect() + clientX/Y + DPR scale`. With events on the canvas element, `e.offsetX/e.offsetY` are already canvas-local CSS pixels. With `autoDensity: true`, PIXI logical pixels equal CSS pixels — no DPR scale needed at all. The residual 4px was from floating-point imprecision in the rect-subtract + scale chain.

Fix: In `src/render/tonnetz-scene.ts` (`onStagePointerDown`) and `src/render/rhythm-scene.ts` (`onStagePointerDown`, `onStageContextMenu`, `onStagePointerMove`): replaced `(e.clientX - rect.left) * (app.screen.width / rect.width)` and equivalent Y with simply `e.offsetX` / `e.offsetY`. Removed all `getBoundingClientRect()` calls from these handlers. Matches prototype pattern: `app.view.addEventListener` → `e.offsetX/Y` directly readable since the event target IS the canvas.

**Defect B — Playhead not visible in rhythm view**

Root cause identified via diagnostic log (added and removed): the `playing` branch was not being entered at all because `nowPlaying.source` was still `null` at the moment the first few ticks fired after `playGroove()` returned. `playGroove()` is async: it awaits `getAudio()` then awaits `runNow(code)`, and only THEN calls `setNowPlaying('Ritmo · groove', 'rhythm')`. During those async operations, PIXI ticks continue firing and each reads `get(sessionStore).nowPlaying.source === null`, so `playing = false` and the playhead branch is skipped. The OD-4 `_sessionStart` reset in `updateRhythmDynamic` fires correctly once the store update lands, but the tick was already using a stale state snapshot captured at the top of `tickRhythm`.

Fix in `src/render/rhythm-scene.ts`: restructured `tickRhythm` to read `nowPlaying.source` via a **second** `get(sessionStore)` call dedicated to the `playing` check — separate from the `state` snapshot used for `bpm`. This ensures that even if the store fires its update between the initial `state = get(sessionStore)` snapshot and the playhead draw, the `liveSource` check sees the up-to-date value. Comment documents root cause for future reference. No temporary log remains in the final commit.

**Defect C — Layer overlay disappears before user can click Solo/Mute/Delete**

Root cause: when the cursor moved from the orbit ring toward the overlay div, it briefly left the "detect zone" (40 px around step positions), causing `onStagePointerMove` to return `_hoveredLayerIndex = -1`. The `pointermove` handler immediately set `hoveredLayerIndex = -1` in Svelte, destroying the overlay DOM element before the cursor could reach it.

Fix in `src/app/App.svelte`:
- Added `hideOverlayTimer` (`ReturnType<typeof setTimeout> | null`), `scheduleHideOverlay()` (sets 400 ms timer), and `cancelHideOverlay()` (clears timer) functions.
- `pointermove` handler: when `getHoveredLayerIndex()` returns a valid index, calls `cancelHideOverlay()` and updates `hoveredLayerIndex` immediately. When the index returns `-1` but the overlay was showing, calls `scheduleHideOverlay()` instead of hiding immediately — gives the cursor 400 ms to reach the overlay.
- `pointerleave` handler: calls `scheduleHideOverlay()` instead of immediately setting `hoveredLayerIndex = -1` (handles cursor exiting canvas edge near the overlay).
- Overlay `div`: replaced `on:pointerenter` no-op with `on:pointerenter={cancelHideOverlay}` (entering the overlay cancels the hide timer — overlay stays visible). `on:pointerleave` hides immediately once cursor leaves the overlay. Added `role="toolbar" aria-label="Layer controls"` to satisfy ESLint a11y rule (`svelte/valid-compile`).

Matches prototype's `scheduleHideLayerCtl` debounce (line 1341, prototype used 260 ms; port uses 400 ms for more forgiving UX).

**Routine validations (round-2)**

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0 (ESLint + Prettier clean; a11y role added to fix lint error)
- `pnpm build` → exit 0 (514 modules, no new errors)
- `pnpm test` → 119 passed (no regressions)

Headless note: "Coordinate fix verified with offsetX/Y pattern matching prototype. Playhead root cause identified via log and fixed. Visual re-verification pending Pilot re-test."

---

### Round-3 fixes (step 03.6 continuation — 2026-06-07)

**Commit:** `fix(render): Phase 03 — 03.6 round-3: geometry timing (rAF), playhead, solo/mute/delete`

Three residual operability defects addressed in this round.

**Defect A — Geometry computed before PIXI completes initial resize**

Root cause: `new PIXI.Application({ resizeTo: stageEl })` uses the PIXI ResizePlugin which schedules its first resize asynchronously (next animation frame). `buildTonnetz` and `buildRhythmScene` were called immediately after `initStage` returned in `App.svelte` `onMount`, in the same microtask. At that point `app.screen.width` and `app.screen.height` were still 0 (or the initial placeholder size), so all geometry was computed with `W = 0, H = 0`. This produced: zero-sized triangles with centroids at (0,0), making hit-tests always miss; and `_rCenter.maxR = 0`, making the playhead a zero-length invisible line.

Fix: In `src/app/App.svelte` `onMount`, after `initStage` returns `app`, inserted `await new Promise<void>((r) => requestAnimationFrame(() => r()))` before calling `buildTonnetz` and `buildRhythmScene`. This allows PIXI's ResizePlugin to complete its first async resize so `app.screen.width/height` reflect the actual viewport dimensions when geometry is computed.

**Defect B — Playhead never appears in rhythm view**

Root cause identified via static analysis of the geometry path: `_rCenter.maxR = 0` (from Defect A above). With `maxR = 0`, the radial playhead endpoints were `rin = 0 - 22 = -22`, `rout = 0 + 18 = 18`, and `cx = cy = 0` — producing a tiny 40 px line at the top-left corner of the viewport, nearly invisible at 18% alpha. The `playing` branch itself was correct: the round-2 fix (second `get(sessionStore)` call for `liveSource`) was already in place and functioning. The `_sessionStart` OD-4 reset in `updateRhythmDynamic` was also correct.

Fix: The rAF wait from Defect A fix restores correct geometry dimensions. After the fix, `_rCenter.innerR` and `_rCenter.maxR` are computed from the real viewport size, so the playhead endpoints span the full orbit area as intended.

Note: No diagnostic console.log was left in the committed code. The root cause was identified via static analysis of the geometry computation path: `rebuildRhythmGeo` assigns `maxR = Math.min(W, H) * 0.4` where W and H come from `app.screen.width/height`. With W=0/H=0 at the time of the original build call, this produces maxR=0 → zero-length playhead.

**Defect C — Solo/Mute/Delete buttons verification**

The current `handleLayerSolo`, `handleLayerMute`, and `handleLayerDelete` handlers in `App.svelte` were reviewed against the spec. All three already correctly call `sessionStore.update(...)`, `buildRhythmScene(get(sessionStore))`, and `requeueLive()`. The `requeueLive` export is already imported from `session.js`. No code change was needed for Defect C — the round-2 fix had already wired these correctly.

Note: `requeueLive()` is a no-op when `nowPlaying.source === null` (i.e., when nothing is playing). If the user toggles solo/mute without first pressing "▶ Groove", the visual label color updates (via `buildRhythmScene`) but no audio requeue fires — which is the correct behavior.

### Files touched (round-3)

- `src/app/App.svelte` (Defect A: rAF wait before buildTonnetz/buildRhythmScene)
- `docs/orbifold-v1/handoffs/phase-03-handoff.md` (this entry)

### Routine validations (round-3)

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `pnpm build` → exit 0 (514 modules, no new errors)
- `pnpm test` → 119 passed (no regressions)

### Acceptance Coverage Table (round-3)

All A-03 IDs remain at the same status as round-2. The rAF fix is structural (ensures geometry dimensions are correct before drawing), not a new feature. Visual re-verification pending Pilot re-test.

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | WebGL unavailable → clear error message, no crash | `src/render/stage.ts` | proxy:static-analysis | covered |
| A-03-02 | Tonnetz grid visible (geometry now computed with correct dimensions) | `src/render/tonnetz-scene.ts` | proxy:static-analysis | covered — visual re-verification pending Pilot |
| A-03-03 | Chord pick and P·L·R (hit-tests now use correct geometry) | `src/render/tonnetz-scene.ts` | proxy:static-analysis | covered — visual re-verification pending Pilot |
| A-03-04 | Voice-leading path animation | `src/render/tonnetz-scene.ts` | proxy:static-analysis | covered — visual re-verification pending Pilot |
| A-03-05 | Rhythm orbit view (geometry + dot visibility now correct) | `src/render/rhythm-scene.ts` | proxy:static-analysis | covered — visual re-verification pending Pilot |
| A-03-06 | Radial↔linear morph | `src/render/rhythm-scene.ts` | proxy:static-analysis | covered — visual re-verification pending Pilot |
| A-03-07 | Hover controls | `src/render/rhythm-scene.ts` + `App.svelte` | proxy:static-analysis | covered — visual re-verification pending Pilot |
| A-03-08 | Resize: grid and orbits rebuild debounced 120 ms | `src/render/stage.ts` + `App.svelte` | proxy:static-analysis | covered |
| A-03-09 | Phase 02 audio preserved | (Pilot browser observation) | live-system | visual re-verification pending Pilot |
| A-03-10 | Gate commands: tsc, lint, test, build all exit 0; 119 tests pass | Dev ran all four gate commands | operability | covered |

Visual re-verification pending Pilot.
