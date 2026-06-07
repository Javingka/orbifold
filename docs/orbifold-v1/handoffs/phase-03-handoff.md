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
