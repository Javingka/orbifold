// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — PIXI application, shared canvas, view switching.
// Prototype source: reference/orbifold.html lines 900–944 (initPixi()).
// ADR 0006: WebGL detection via canvas.getContext before PIXI Application creation.
// ADR 0007: PIXI Application as a module-level singleton.
//
// Phase 08 (step 08.5): harmonyLayer has one child sub-container:
//   _tonnetzContainer — holds the seven Tonnetz scene objects (hGrid…hLabels).
// Phase 10 redesign (step 10.11): _staffContainer removed (ADR 0015 D1).
//   The Pentagrama sub-view is now rendered by a dedicated Canvas 2D <canvas>
//   element managed by src/render/pentagrama-scene.ts, not a PIXI container.
// setHarmonySubview() now only toggles _tonnetzContainer.visible.
// Default: _tonnetzContainer.visible = true.
// ADR 0011 Amendment §D5 (amended by ADR 0015 D1).

import * as PIXI from 'pixi.js';

// ── Module-level singleton state (ADR 0007) ──────────────────────────────────

let _app: PIXI.Application | null = null;

// Harmony layer and its child graphics/containers
// Prototype lines 887–889, 920–922
let harmonyLayer: PIXI.Container | null = null;
let rhythmLayer: PIXI.Container | null = null;

// Phase 08 (step 08.5): Sub-container inside harmonyLayer (ADR 0011 Amendment §D5).
// _tonnetzContainer holds the seven Tonnetz scene objects; visible by default.
// Phase 10 redesign (step 10.11): _staffContainer removed (ADR 0015 D1).
// The Pentagrama staff is now a Canvas 2D element managed by pentagrama-scene.ts.
let _tonnetzContainer: PIXI.Container | null = null;

// Harmony scene children — prototype line 920–922
// addChild order per prototype line 923: hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels
// Phase 08: these are now children of _tonnetzContainer, not harmonyLayer directly.
let hGrid: PIXI.Graphics | null = null;
let hPath: PIXI.Graphics | null = null;
let hNodes: PIXI.Graphics | null = null;
let hDyn: PIXI.Graphics | null = null;
let hLabels: PIXI.Container | null = null;
let hNRG: PIXI.Graphics | null = null;
let hNRL: PIXI.Container | null = null;

// Rhythm scene children — prototype lines 925–926
let rRings: PIXI.Graphics | null = null;
let rDyn: PIXI.Graphics | null = null;
let rLabels: PIXI.Container | null = null;

// Resize callback registry
const _resizeCallbacks: Array<() => void> = [];

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize the PIXI Application and all render layer containers.
 * Must be called once from App.svelte onMount after user interaction is available.
 *
 * @param stageEl - The full-screen `div#stage` element that PIXI will resize to.
 * @returns The PIXI Application, or null if WebGL is unavailable.
 *
 * Prototype source: lines 900–944 (initPixi()).
 * ADR 0006: WebGL detection before PIXI Application creation.
 * OD-3 resolution: resizeTo targets div#stage.
 */
export async function initStage(stageEl: HTMLElement): Promise<PIXI.Application | null> {
  // ADR 0006: Detect WebGL via a temporary canvas before creating PIXI Application.
  // The prototype used `typeof PIXI === 'undefined'` (CDN guard, line 901) — invalid
  // for the Vite build where PIXI is always bundled.
  const probeCanvas = document.createElement('canvas');
  const hasWebGL =
    probeCanvas.getContext('webgl2') !== null || probeCanvas.getContext('webgl') !== null;

  if (!hasWebGL) {
    // Display fallback message in the stage element itself (no crash path).
    const msg = document.createElement('p');
    msg.style.cssText =
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'color:#cfd6e6;font-family:system-ui,sans-serif;font-size:1rem;text-align:center;margin:0;';
    msg.textContent = 'Tu navegador no soporta WebGL. Orbifold no puede funcionar.';
    stageEl.appendChild(msg);
    return null;
  }

  // Create PIXI Application — prototype lines 906–912
  // OD-3 resolution: resizeTo targets div#stage (matches prototype line 907)
  _app = new PIXI.Application({
    resizeTo: stageEl,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });

  // Append PIXI's canvas into the stage div — prototype line 913: mount.appendChild(app.view)
  // display:block eliminates the inline-baseline gap (canvas is inline by default) that
  // would shift the canvas a few CSS pixels below the container top, causing a persistent
  // small pointer-coordinate offset even after switching to e.offsetX/Y.
  const canvasEl = _app.view as HTMLCanvasElement;
  canvasEl.style.display = 'block';
  stageEl.appendChild(canvasEl);

  // ── Create layer containers — prototype lines 916–918 ───────────────────────
  harmonyLayer = new PIXI.Container();
  rhythmLayer = new PIXI.Container();
  rhythmLayer.visible = false; // prototype line 917
  _app.stage.addChild(harmonyLayer, rhythmLayer); // prototype line 918

  // ── Phase 08 (step 08.5): Create sub-container inside harmonyLayer ──────────
  // ADR 0011 Amendment §D5: _tonnetzContainer holds the Tonnetz scene objects.
  // Phase 10 redesign (step 10.11): _staffContainer removed (ADR 0015 D1).
  // The Pentagrama sub-view is a Canvas 2D element; no PIXI child needed.
  _tonnetzContainer = new PIXI.Container();
  _tonnetzContainer.visible = true;
  harmonyLayer.addChild(_tonnetzContainer);

  // ── Create harmony scene children — prototype lines 920–922 ─────────────────
  // Phase 08: children added to _tonnetzContainer (not harmonyLayer directly).
  hGrid = new PIXI.Graphics();
  hPath = new PIXI.Graphics();
  hNodes = new PIXI.Graphics();
  hDyn = new PIXI.Graphics();
  hLabels = new PIXI.Container();
  hNRG = new PIXI.Graphics();
  hNRL = new PIXI.Container();

  // addChild ORDER per prototype line 923 (not phase file prose — inventory correction):
  // hGrid → hPath → hDyn → hNRG → hNodes → hNRL → hLabels
  // Dynamic glow layers (hDyn, hNRG) render BELOW node circles (hNodes) — visually correct.
  _tonnetzContainer.addChild(hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels);

  // ── Create rhythm scene children — prototype lines 925–926 ──────────────────
  rRings = new PIXI.Graphics();
  rDyn = new PIXI.Graphics();
  rLabels = new PIXI.Container();
  rhythmLayer.addChild(rRings, rDyn, rLabels); // prototype line 926

  // ── Register debounced resize handler — prototype lines 935–943 ─────────────
  // Debounce: 120 ms, same as prototype.
  let _resizeTO: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener('resize', () => {
    if (_resizeTO !== null) clearTimeout(_resizeTO);
    _resizeTO = setTimeout(() => {
      if (_app === null) return;
      _resizeCallbacks.forEach((cb) => cb());
    }, 120);
  });

  return _app;
}

/**
 * Return the PIXI Application singleton, or null if not yet initialized.
 * ADR 0007.
 */
export function getApp(): PIXI.Application | null {
  return _app;
}

/**
 * Toggle harmony / rhythm layer visibility for the active primary view.
 *
 * Phase 09 (step 09.3) — ADR 0013 D1/D2: signature widened to accept all 5
 * view-type strings. Behavior:
 *   'harmony'     → harmonyLayer visible, rhythmLayer hidden (unchanged).
 *   'rhythm'      → rhythmLayer visible, harmonyLayer hidden (unchanged).
 *   'composition' → both layers hidden (content is DOM, not PIXI).
 *   'session'     → both layers hidden.
 *   'code'        → both layers hidden.
 *
 * Reversibility: passing 'harmony' or 'rhythm' produces byte-identical PIXI
 * layer state to the pre-Phase-09 implementation.
 *
 * Prototype: rhythmLayer.visible is toggled based on current view.
 */
export function setView(view: 'harmony' | 'rhythm' | 'composition' | 'session' | 'code'): void {
  if (harmonyLayer !== null) harmonyLayer.visible = view === 'harmony';
  if (rhythmLayer !== null) rhythmLayer.visible = view === 'rhythm';
}

/**
 * Switch the harmony sub-view between Tonnetz and Pentagrama (staff).
 *
 * Phase 10 redesign (step 10.11, ADR 0015 D1): _staffContainer removed.
 * Only _tonnetzContainer visibility is managed here. The Pentagrama Canvas 2D
 * layer's show/hide is handled by setPentagramaVisible() in pentagrama-scene.ts,
 * called from App.svelte's store subscription.
 *
 *   'tonnetz' → _tonnetzContainer.visible = true
 *   'staff'   → _tonnetzContainer.visible = false
 *
 * The parent harmonyLayer.visible is unchanged (managed by setView).
 * ADR 0011 Amendment §D5 (amended by ADR 0015 D1).
 */
export function setHarmonySubview(subview: 'tonnetz' | 'staff'): void {
  if (_tonnetzContainer !== null) _tonnetzContainer.visible = subview === 'tonnetz';
}

/**
 * Register a callback to be called after the debounced window resize (120 ms).
 * Scene modules register build callbacks here; App.svelte passes them in.
 * Prototype lines 935–943: resize calls buildTonnetz() and buildRhythmScene().
 */
export function onResize(cb: () => void): void {
  _resizeCallbacks.push(cb);
}

// ── Typed getters for scene children ────────────────────────────────────────
// Scene modules (tonnetz-scene.ts, rhythm-scene.ts) call these to get their
// allocated Graphics/Container refs from the shared stage.

export interface StageRefs {
  app: PIXI.Application;
  harmonyLayer: PIXI.Container;
  /** Phase 08 (step 08.5): sub-container holding the seven Tonnetz scene objects. */
  tonnetzContainer: PIXI.Container;
  // staffContainer removed in Phase 10 redesign step 10.11 (ADR 0015 D1).
  // The Pentagrama Canvas 2D element is not a PIXI child.
  hGrid: PIXI.Graphics;
  hPath: PIXI.Graphics;
  hNodes: PIXI.Graphics;
  hDyn: PIXI.Graphics;
  hLabels: PIXI.Container;
  hNRG: PIXI.Graphics;
  hNRL: PIXI.Container;
  rRings: PIXI.Graphics;
  rDyn: PIXI.Graphics;
  rLabels: PIXI.Container;
}

/**
 * Return all stage refs typed for scene use.
 * Throws if initStage has not been called or WebGL was unavailable.
 */
export function getStageRefs(): StageRefs {
  if (
    _app === null ||
    harmonyLayer === null ||
    rhythmLayer === null ||
    _tonnetzContainer === null ||
    hGrid === null ||
    hPath === null ||
    hNodes === null ||
    hDyn === null ||
    hLabels === null ||
    hNRG === null ||
    hNRL === null ||
    rRings === null ||
    rDyn === null ||
    rLabels === null
  ) {
    throw new Error('getStageRefs called before initStage completed successfully');
  }
  return {
    app: _app,
    harmonyLayer,
    tonnetzContainer: _tonnetzContainer,
    // staffContainer removed — Pentagrama is now a Canvas 2D element (ADR 0015 D1).
    hGrid,
    hPath,
    hNodes,
    hDyn,
    hLabels,
    hNRG,
    hNRL,
    rRings,
    rDyn,
    rLabels,
  };
}
