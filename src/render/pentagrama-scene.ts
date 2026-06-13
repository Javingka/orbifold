// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Canvas 2D Pentagrama layer.
//
// Phase 10 redesign step 10.11 (ADR 0015 D7):
//   Module-level singleton managing a dedicated Canvas 2D <canvas> element
//   mounted inside the PIXI stage container. Provides the lifecycle API used
//   by App.svelte: initPentagrama / destroyPentagrama / setPentagramaVisible.
//
//   This file is render-layer code (src/render/), not core (src/core/), so DOM
//   imports are permitted. No PIXI, no Svelte.
//
// ADR 0015 decisions implemented in this step:
//   D3 — responsive staff geometry (LS, cy, SL, PX, DPR cap).
//   D7 — lifecycle: rAF loop + ResizeObserver owned by this module.
//
// Steps 10.12–10.14 will fill paint() with the full prototype rendering.
// In this step paint() only clears the canvas to transparent.

// ── Module-level singleton state ─────────────────────────────────────────────

let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;
let _dpr = 1;
let _W = 0;
let _H = 0;
let _rafHandle = 0;
let _observer: ResizeObserver | null = null;

// ── Geometry helpers (ADR 0015 D3) ──────────────────────────────────────────

/**
 * Update canvas backing-store dimensions and CSS size for the given logical
 * pixel dimensions. Called by ResizeObserver and on first mount.
 *
 * DPR cap: Math.min(devicePixelRatio, 2) per ADR 0015 D3 / D7.
 */
function setup(w: number, h: number): void {
  _dpr = Math.min(devicePixelRatio, 2);
  _W = w;
  _H = h;
  if (_canvas === null) return;
  _canvas.width = Math.round(w * _dpr);
  _canvas.height = Math.round(h * _dpr);
  _canvas.style.width = `${w}px`;
  _canvas.style.height = `${h}px`;
}

// ── rAF paint loop ────────────────────────────────────────────────────────────

/**
 * Paint callback — called each animation frame.
 * Step 10.11: only clears to transparent. Steps 10.12–10.14 add full rendering.
 * The `ts` parameter (DOMHighResTimeStamp) is accepted and will be used in
 * step 10.13 for time-driven animation; the loop passes it through.
 */
function paint(ts: DOMHighResTimeStamp): void {
  if (_ctx === null) return;

  _ctx.save();
  _ctx.scale(_dpr, _dpr);

  // Clear to transparent (per ADR 0015 D7 rAF contract).
  // ts is unused in this step; it will be used for animation in step 10.13.
  void ts;
  _ctx.clearRect(0, 0, _W, _H);

  _ctx.restore();
}

function loop(ts: DOMHighResTimeStamp): void {
  paint(ts);
  _rafHandle = requestAnimationFrame(loop);
}

// ── Public API (ADR 0015 D7) ─────────────────────────────────────────────────

/**
 * Initialise the Canvas 2D Pentagrama layer.
 *
 * Creates a <canvas> element, appends it to stageEl with the CSS properties
 * required by ADR 0015 D7 / inventory OQ-R6 (position:absolute; top:0; left:0;
 * z-index:1; display:none; pointer-events:none), starts the ResizeObserver
 * and the rAF loop.
 *
 * Must be called once from App.svelte onMount, after initStage.
 */
export function initPentagrama(stageEl: HTMLDivElement): void {
  _canvas = document.createElement('canvas');
  _canvas.style.cssText =
    'position:absolute;top:0;left:0;z-index:1;display:none;pointer-events:none;';

  _ctx = _canvas.getContext('2d');
  if (_ctx === null) {
    // 2D context unavailable — leave canvas in DOM so setPentagramaVisible works
    // (it will just never draw anything).
    stageEl.appendChild(_canvas);
    return;
  }

  stageEl.appendChild(_canvas);

  // Initial size based on current container dimensions.
  const rect = stageEl.getBoundingClientRect();
  setup(rect.width || stageEl.offsetWidth, rect.height || stageEl.offsetHeight);

  // ResizeObserver: re-call setup when stage container size changes (ADR 0015 D7).
  _observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry === undefined) return;
    const { width, height } = entry.contentRect;
    setup(width, height);
  });
  _observer.observe(stageEl);

  // Start rAF loop.
  _rafHandle = requestAnimationFrame(loop);
}

/**
 * Clean up the Canvas 2D Pentagrama layer.
 *
 * Cancels the rAF loop, disconnects the ResizeObserver, and removes the canvas
 * from the DOM. Called from App.svelte onDestroy.
 */
export function destroyPentagrama(): void {
  if (_rafHandle !== 0) {
    cancelAnimationFrame(_rafHandle);
    _rafHandle = 0;
  }
  if (_observer !== null) {
    _observer.disconnect();
    _observer = null;
  }
  if (_canvas !== null) {
    _canvas.remove();
    _canvas = null;
  }
  _ctx = null;
}

/**
 * Show or hide the Canvas 2D Pentagrama layer.
 *
 * When visible: display:block; pointer-events:auto — canvas paints and
 * receives pointer events (ADR 0015 D6 / inventory OQ-R6).
 * When hidden: display:none; pointer-events:none — belt-and-suspenders so
 * the canvas never intercepts Tonnetz or other-view pointers.
 *
 * Called from App.svelte store subscription on every state change.
 * Condition: state.view === 'harmony' && state.harmony.subview === 'staff'
 * (ADR 0015 D7; inventory OQ-R6).
 */
export function setPentagramaVisible(visible: boolean): void {
  if (_canvas === null) return;
  if (visible) {
    _canvas.style.display = 'block';
    _canvas.style.pointerEvents = 'auto';
  } else {
    _canvas.style.display = 'none';
    _canvas.style.pointerEvents = 'none';
  }
}
