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

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:** —
**Iteration:** 1 of 5
**Reason:** —
**Next action:** —
