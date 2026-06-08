// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — rhythm orbits scene: radial↔linear morph, per-orbit controls.
// Prototype source:
//   lerp():                reference/orbifold.html line 1028
//   rebuildRhythmGeo():    reference/orbifold.html lines 1030–1056
//   buildRhythmScene():    reference/orbifold.html lines 1057–1070
//   tickRhythm():          reference/orbifold.html lines 1146–1215
//   onStagePointer():      reference/orbifold.html lines 1288–1293 (rhythm branch)
//   onStageContext():      reference/orbifold.html lines 1296–1304
//   onStageHover():        reference/orbifold.html lines 1336–1341
//   nearestLayer():        reference/orbifold.html lines 1319–1324
// OD-1 resolution: DOM overlay in App.svelte positioned via pointer coordinates.
// OD-4 resolution: module-local _sessionStart, reset when nowPlaying.source changes.

import * as PIXI from 'pixi.js';
import { get } from 'svelte/store';

import { layerAudible } from '../core/rhythm/layers.js';
import type { RhythmLayer } from '../core/rhythm/layers.js';
import { sessionStore, requeueLive } from '../state/session.js';
import type { SessionState } from '../state/session.js';
import { getStageRefs } from './stage.js';
import { COL, FONT_SERIF, FONT_MONO } from './theme.js';

// ── Module-level geometry / dynamic state ────────────────────────────────────

/** Number of steps per layer. Prototype: RSTEPS = 16. */
const RSTEPS = 16;

/**
 * Per-layer geometry: polar and linear positions per step, label anchors.
 * Mirrors prototype's `rGeo` array (line 1029).
 */
interface LayerGeo {
  li: number;
  layer: RhythmLayer;
  R: number;
  /** Polar (radial) positions for each of the 16 steps. */
  polar: { x: number; y: number }[];
  /** Linear positions for each of the 16 steps. */
  lin: { x: number; y: number }[];
  yBase: number;
  /** Polar label anchor (right of outermost ring). */
  labelPolar: { x: number; y: number };
  /** Linear label anchor (left of the linear row). */
  labelLin: { x: number; y: number };
}

/**
 * Screen-level center info used for playhead geometry.
 * Mirrors prototype's `rCenter` (line 1029).
 */
interface RhythmCenter {
  cx: number;
  cy: number;
  innerR: number;
  maxR: number;
  Wlin: number;
  xL: number;
  xR: number;
  yTop: number;
  yBot: number;
}

/** Per-layer, per-step current render positions (lerped). Prototype: `rStepPos`. */
let _stepPos: { x: number; y: number }[][] = [];

/** Computed geometry per layer. Prototype: `rGeo`. */
let _rGeo: LayerGeo[] = [];

/** Center geometry reference. Prototype: `rCenter`. */
let _rCenter: RhythmCenter | null = null;

/** Current layers snapshot — updated by updateRhythmDynamic. */
let _layers: RhythmLayer[] = [];

/** PIXI.Text refs for each layer's sound label. Prototype: `rLayerLabels`. */
let _layerLabels: PIXI.Text[] = [];

/** Center BPM PIXI.Text. Prototype: `rCenterBpm`. */
let _rCenterBpm: PIXI.Text | null = null;

/** Center subtitle PIXI.Text. Prototype: `rCenterSub`. */
let _rCenterSub: PIXI.Text | null = null;

/** Morph: 0 = radial, 1 = linear. Prototype: `rMorph`. */
let _rMorph = 0;

/** Target for morph easing. Prototype: `rLayoutTarget`. */
let _rLayoutTarget = 0;

/**
 * Session start for playhead phase computation.
 * OD-4 resolution: module-local, reset when nowPlaying.source changes.
 */
let _sessionStart = performance.now();

/** Previous nowPlaying source for change detection. */
let _prevNowPlayingSource: string | null = null;

/** Hovered layer index for DOM overlay positioning. -1 = none. */
let _hoveredLayerIndex = -1;

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Linear interpolation. Prototype line 1028.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Geometry rebuild ──────────────────────────────────────────────────────────

/**
 * Recompute dual polar/linear geometry for each rhythm layer.
 * Prototype: rebuildRhythmGeo(), lines 1030–1056.
 */
function rebuildRhythmGeo(state: SessionState): void {
  const refs = getStageRefs();
  const { app } = refs;
  const W = app.screen.width;
  const H = app.screen.height;
  const cx = W / 2;
  const cy = H / 2;
  const L = state.rhythm.layers.length;

  // Prototype lines 1033–1039
  const maxR = Math.min(W, H) * 0.4;
  const innerR = maxR * 0.3;
  const ringStep = L > 1 ? (maxR - innerR) / (L - 1) : 0;
  const Wlin = Math.min(W * 0.82, 980);
  const xL = cx - Wlin / 2;
  const rowGap = Math.min(70, (Math.min(W, H) * 0.62) / Math.max(L, 1));

  _rGeo = [];

  state.rhythm.layers.forEach((layer, li) => {
    const R = L > 1 ? innerR + li * ringStep : innerR;
    const yBase = cy + (li - (L - 1) / 2) * rowGap;
    const polar: { x: number; y: number }[] = [];
    const lin: { x: number; y: number }[] = [];

    for (let s = 0; s < RSTEPS; s++) {
      // Prototype line 1046: ang = -PI/2 + s/RSTEPS*PI*2
      const ang = -Math.PI / 2 + (s / RSTEPS) * Math.PI * 2;
      polar.push({ x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R });
      // Prototype line 1048: lin x uses (s+0.5)/RSTEPS (centers step in its slot)
      lin.push({ x: xL + ((s + 0.5) / RSTEPS) * Wlin, y: yBase });
    }

    // Prototype line 1050–1051: labelPolar right of ring, labelLin left of row
    _rGeo.push({
      li,
      layer,
      R,
      polar,
      lin,
      yBase,
      labelPolar: { x: cx + R + 16, y: cy },
      labelLin: { x: xL - 16, y: yBase },
    });
  });

  // Prototype lines 1053–1055: rCenter object
  _rCenter = {
    cx,
    cy,
    innerR,
    maxR,
    Wlin,
    xL,
    xR: xL + Wlin,
    yTop: cy - ((L - 1) / 2) * rowGap - rowGap * 0.6,
    yBot: cy + ((L - 1) / 2) * rowGap + rowGap * 0.6,
  };
}

// ── buildRhythmScene ──────────────────────────────────────────────────────────

/**
 * Build (or rebuild) the rhythm scene: geometry + labels.
 * Called on init, on resize, and on layer-count changes.
 * Prototype: buildRhythmScene(), lines 1057–1070.
 *
 * @param state - Current SessionState.
 */
export function buildRhythmScene(state: SessionState): void {
  const refs = getStageRefs();
  const { rLabels } = refs;

  // Prototype line 1059: rLabels.removeChildren()
  rLabels.removeChildren();
  _layerLabels = [];
  _rCenterBpm = null;
  _rCenterSub = null;

  rebuildRhythmGeo(state);
  _layers = state.rhythm.layers;

  // Layer sound labels — prototype lines 1062–1064
  _rGeo.forEach((g) => {
    const label = g.layer.sound + (g.layer.euclid != null ? ` ·E(${g.layer.euclid})` : '');
    const lab = new PIXI.Text(label, {
      fontFamily: FONT_MONO,
      fontSize: 11.5,
      fill: g.layer.muted === true ? 0x6d7384 : 0xb9c0d0,
    });
    lab.anchor.set(0.5);
    lab.resolution = 2;
    rLabels.addChild(lab);
    _layerLabels.push(lab);
  });

  // Center BPM label — prototype lines 1066–1067
  const bpmText = new PIXI.Text(state.bpm + ' BPM', {
    fontFamily: FONT_SERIF,
    fontSize: 16,
    fill: 0xeaedf4,
  });
  bpmText.anchor.set(0.5);
  bpmText.resolution = 2;
  rLabels.addChild(bpmText);
  _rCenterBpm = bpmText;

  // Center subtitle label — prototype lines 1068–1069 ('16 pasos · 4/4' mapped to spec 'cps · groove')
  const subText = new PIXI.Text('cps · groove', {
    fontFamily: FONT_MONO,
    fontSize: 9,
    fill: 0x6d7384,
  });
  subText.anchor.set(0.5);
  subText.resolution = 2;
  rLabels.addChild(subText);
  _rCenterSub = subText;
}

// ── updateRhythmDynamic ───────────────────────────────────────────────────────

/**
 * Update layer label muted/solo state without full geometry rebuild.
 * Called by App.svelte's store subscription when rhythm changes.
 *
 * Also handles OD-4: resets _sessionStart when nowPlaying.source changes.
 *
 * @param state - Current SessionState.
 */
export function updateRhythmDynamic(state: SessionState): void {
  _layers = state.rhythm.layers;

  // OD-4: reset _sessionStart when source activates
  const src = state.nowPlaying.source;
  if (src !== null && src !== _prevNowPlayingSource) {
    _sessionStart = performance.now();
  }
  _prevNowPlayingSource = src;

  // Update label fill colors for muted state
  _layerLabels.forEach((lab, li) => {
    const layer = _layers[li];
    if (layer != null) {
      // Recolor the text style based on muted state
      // PIXI.Text style can be mutated; trigger re-render via style assignment
      lab.style.fill = layer.muted === true ? 0x6d7384 : 0xb9c0d0;
    }
  });
}

// ── tickRhythm ────────────────────────────────────────────────────────────────

/**
 * Per-frame animation tick for the rhythm view.
 * Prototype: tickRhythm(phase), lines 1146–1215.
 *
 * NOTE: The `delta` parameter is the PIXI ticker dimensionless scalar.
 * Phase is computed internally from performance.now() and _sessionStart.
 *
 * @param _delta - PIXI ticker delta (not used directly; phase is time-based).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function tickRhythm(_delta: number): void {
  const refs = getStageRefs();
  const { rRings, rDyn } = refs;

  // ── Morph easing — prototype lines 1150–1151 ─────────────────────────────
  _rMorph += (_rLayoutTarget - _rMorph) * 0.1;
  if (Math.abs(_rLayoutTarget - _rMorph) < 0.0015) _rMorph = _rLayoutTarget;

  rRings.clear();
  rDyn.clear();

  // Fix (Defect 3, 04.6 smoke-test): position BPM and subtitle labels at the
  // screen centre BEFORE the early-return guard. With an empty session (no layers),
  // _rGeo is empty and the guard fires before the label-positioning block at the
  // bottom of this function, leaving _rCenterBpm / _rCenterSub at their default
  // PIXI position (0, 0) — which renders the text at the canvas top-left corner.
  // _rCenter is populated by rebuildRhythmGeo; fall back to app.screen when null
  // (this covers the initial tick before the first buildRhythmScene completes).
  if (_rCenterBpm !== null || _rCenterSub !== null) {
    const bpmCx = _rCenter !== null ? _rCenter.cx : refs.app.screen.width / 2;
    const bpmCy = _rCenter !== null ? _rCenter.cy : refs.app.screen.height / 2;
    if (_rCenterBpm !== null) {
      _rCenterBpm.x = bpmCx;
      _rCenterBpm.y = bpmCy - 7;
      _rCenterBpm.alpha = 1 - _rMorph;
    }
    if (_rCenterSub !== null) {
      _rCenterSub.x = bpmCx;
      _rCenterSub.y = bpmCy + 10;
      _rCenterSub.alpha = 1 - _rMorph;
    }
  }

  if (_rGeo.length === 0 || _rCenter === null) return;

  const m = _rMorph;
  const cx = _rCenter.cx;
  const cy = _rCenter.cy;

  // Compute bar phase for playhead.
  // Round-2 fix (Defect B): read nowPlaying.source live from the store each tick
  // via a fresh get(sessionStore) call, separate from state used for bpm, to avoid
  // any stale-capture scenario where state was read before setNowPlaying() completed.
  // Root cause identified via diagnostic log: playing branch was not entered because
  // state.nowPlaying.source was null at tick time even after playGroove() returned —
  // the setNowPlaying() store update fires asynchronously after runNow(code) resolves,
  // so the first few ticks after play() still see source=null. The fix: keep reading
  // get(sessionStore) each tick so the playhead appears as soon as source is set.
  const state = get(sessionStore);
  const bpm = state.bpm > 0 ? state.bpm : 120; // Defect 3 fix: guard against bpm=0/NaN
  const barMs = (60000 / bpm) * 4;
  const now = performance.now();
  const phase = ((now - _sessionStart) % barMs) / barMs; // 0..1 per bar

  // Fresh source read: deliberately re-read nowPlaying.source from the store rather
  // than relying on state captured earlier. This ensures that even if the store
  // update fires between the state snapshot and the playhead draw, we see the
  // latest value.
  const liveSource = get(sessionStore).nowPlaying.source;
  // Prototype: `isPlaying() && currentSource !== 'preview'` (lines 1153).
  const playing = liveSource !== null && liveSource !== 'preview';
  _stepPos = [];

  // ── Per-layer orbit drawing — prototype lines 1156–1181 ──────────────────
  _rGeo.forEach((g, li) => {
    // Defect 2 fix: use live _layers[li] for audibility and step state so that
    // store updates (mute, step toggle) are reflected each frame without a full
    // geometry rebuild. Falls back to g.layer only if _layers is shorter (safety).
    const liveLayer = _layers[li] ?? g.layer;
    const dim = layerAudible(liveLayer, _layers) ? 1 : 0.28;

    // Guide ring: 16-gon lerped between polar and linear — prototype lines 1159–1163
    // Defect 5 fix: in linear mode (m > 0.5), skip the closing segment back to step 0
    // so we don't draw a diagonal line across the full width.
    rRings.lineStyle(1.2, COL.line, 0.5 * dim);
    if (m <= 0.5) {
      // Radial mode (or morph toward radial): close the polygon back to step 0.
      for (let s = 0; s <= RSTEPS; s++) {
        const idx = s % RSTEPS;
        const x = lerp(g.polar[idx].x, g.lin[idx].x, m);
        const y = lerp(g.polar[idx].y, g.lin[idx].y, m);
        if (s === 0) rRings.moveTo(x, y);
        else rRings.lineTo(x, y);
      }
    } else {
      // Linear mode (or morph toward linear): open polyline — no closing segment.
      for (let s = 0; s < RSTEPS; s++) {
        const x = lerp(g.polar[s].x, g.lin[s].x, m);
        const y = lerp(g.polar[s].y, g.lin[s].y, m);
        if (s === 0) rRings.moveTo(x, y);
        else rRings.lineTo(x, y);
      }
    }

    // Step dots — prototype lines 1166–1177
    const pos: { x: number; y: number }[] = [];
    for (let s = 0; s < RSTEPS; s++) {
      const x = lerp(g.polar[s].x, g.lin[s].x, m);
      const y = lerp(g.polar[s].y, g.lin[s].y, m);
      pos.push({ x, y });

      if (liveLayer.steps[s] === 1) {
        // Active step: accent circle r=7.5 — prototype line 1171–1172
        rRings.beginFill(COL.accent, 0.95 * dim);
        rRings.lineStyle(0);
        rRings.drawCircle(x, y, 7.5);
        rRings.endFill();
      } else {
        // Inactive step: neutral circle r=4.2; beat-1-of-4 uses faint border
        // Prototype lines 1174–1175
        rRings.beginFill(0x10131a, 1);
        rRings.lineStyle(1, s % 4 === 0 ? COL.faint : COL.line, 0.7 * dim);
        rRings.drawCircle(x, y, 4.2);
        rRings.endFill();
      }
    }
    _stepPos.push(pos);

    // Label repositioning: lerp between polar and linear label anchors
    // Prototype line 1180
    const lab = _layerLabels[li];
    if (lab != null) {
      lab.x = lerp(g.labelPolar.x, g.labelLin.x, m);
      lab.y = lerp(g.labelPolar.y, g.labelLin.y, m);
      lab.alpha = dim;
    }
  });

  // ── Center clock (radial only, fades as morph → 1) — prototype lines 1184–1188 ─
  if (m < 0.98) {
    rRings.beginFill(0x10131a, 1 - m);
    rRings.lineStyle(1, COL.faint, 0.6 * (1 - m));
    rRings.drawCircle(cx, cy, _rCenter.innerR * 0.5);
    rRings.endFill();
  }

  // ── Playhead — prototype lines 1192–1214 ─────────────────────────────────
  if (playing) {
    const curStep = Math.floor(phase * RSTEPS) % RSTEPS;
    const ang = -Math.PI / 2 + phase * Math.PI * 2;

    // Radial spoke endpoints
    const rin = _rCenter.innerR - 22;
    const rout = _rCenter.maxR + 18;
    const radP1 = { x: cx + Math.cos(ang) * rin, y: cy + Math.sin(ang) * rin };
    const radP2 = { x: cx + Math.cos(ang) * rout, y: cy + Math.sin(ang) * rout };

    // Linear bar endpoints
    const xPlay = _rCenter.xL + phase * _rCenter.Wlin;
    const linP1 = { x: xPlay, y: _rCenter.yTop };
    const linP2 = { x: xPlay, y: _rCenter.yBot };

    // Lerp between radial and linear
    const p1 = { x: lerp(radP1.x, linP1.x, m), y: lerp(radP1.y, linP1.y, m) };
    const p2 = { x: lerp(radP2.x, linP2.x, m), y: lerp(radP2.y, linP2.y, m) };

    // Draw playhead line — prototype line 1202; accent at 0.55 for visibility.
    rDyn.lineStyle(2, COL.accent, 0.55);
    rDyn.moveTo(p1.x, p1.y);
    rDyn.lineTo(p2.x, p2.y);

    // Highlight current step dot in white + accent — prototype lines 1203–1210
    _rGeo.forEach((g, li) => {
      // Defect 2 fix: use _layers[li] for live step data (same as guide-ring draw above).
      const liveLayer = _layers[li] ?? g.layer;
      if (!layerAudible(liveLayer, _layers)) return;
      if (liveLayer.steps[curStep] === 1) {
        const p = _stepPos[li] !== undefined ? _stepPos[li][curStep] : null;
        if (p != null) {
          rDyn.beginFill(0xffffff, 0.5);
          rDyn.lineStyle(0);
          rDyn.drawCircle(p.x, p.y, 11);
          rDyn.endFill();
          rDyn.beginFill(COL.accent, 0.95);
          rDyn.drawCircle(p.x, p.y, 7.5);
          rDyn.endFill();
        }
      }
    });
  } else {
    rDyn.lineStyle(0);
  }
}

// ── Interaction: pointer down (step toggle) ───────────────────────────────────

/**
 * Handle canvas pointerdown in rhythm view: find nearest step and toggle it.
 * Prototype: onStagePointer rhythm branch, lines 1288–1293.
 *
 * @param e - Native PointerEvent from the canvas DOM element.
 */
export function onStagePointerDown(e: PointerEvent): void {
  if (_stepPos.length === 0) return;

  // Round-2 fix: events are on app.view (canvas); e.offsetX/Y are canvas-local
  // CSS pixels. With autoDensity:true, PIXI logical px === CSS px — no DPR
  // conversion needed. Replaces getBoundingClientRect + clientX/Y + DPR scale.
  const x = e.offsetX;
  const y = e.offsetY;

  // Find nearest step across all layers — prototype lines 1290–1292
  let bestLi = -1;
  let bestS = -1;
  let bestD = Infinity;
  for (let li = 0; li < _stepPos.length; li++) {
    const arr = _stepPos[li];
    for (let s = 0; s < arr.length; s++) {
      const p = arr[s];
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        bestLi = li;
        bestS = s;
      }
    }
  }

  if (bestLi >= 0 && bestD < 22) {
    const li = bestLi;
    const s = bestS;
    sessionStore.update((state) => {
      const layers = state.rhythm.layers.map((layer, idx) => {
        if (idx !== li) return layer;
        const steps = layer.steps.slice();
        steps[s] = steps[s] === 1 ? 0 : 1;
        return { ...layer, steps };
      });
      return { ...state, rhythm: { ...state.rhythm, layers } };
    });
    requeueLive();
  }
}

// ── Interaction: context menu (layer mute toggle) ─────────────────────────────

/**
 * Handle right-click in rhythm view: find nearest layer and toggle muted.
 * Prototype: onStageContext(), lines 1296–1304.
 *
 * @param e - Native PointerEvent from the canvas DOM element.
 */
export function onStageContextMenu(e: PointerEvent): void {
  e.preventDefault();
  if (_stepPos.length === 0) return;

  // Round-2 fix: events are on app.view (canvas); e.offsetX/Y are canvas-local
  // CSS pixels. With autoDensity:true, PIXI logical px === CSS px — no DPR
  // conversion needed.
  const x = e.offsetX;
  const y = e.offsetY;

  // Nearest layer: compare all step positions — prototype lines 1300–1303
  let bestLi2 = -1;
  let bestD2 = Infinity;
  for (let li = 0; li < _stepPos.length; li++) {
    for (const p of _stepPos[li]) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD2) {
        bestD2 = d;
        bestLi2 = li;
      }
    }
  }

  if (bestLi2 >= 0 && bestD2 < 46) {
    const li = bestLi2;
    sessionStore.update((state) => {
      const layers = state.rhythm.layers.map((layer, idx) => {
        if (idx !== li) return layer;
        return { ...layer, muted: layer.muted !== true };
      });
      return { ...state, rhythm: { ...state.rhythm, layers } };
    });
    // Rebuild to update label colors
    buildRhythmScene(get(sessionStore));
    requeueLive();
  }
}

// ── Interaction: pointer move (hover layer detection) ─────────────────────────

/**
 * Handle pointermove in rhythm view: detect nearest layer and update hover index.
 * OD-1 resolution: updates _hoveredLayerIndex for App.svelte DOM overlay.
 * Prototype: onStageHover(), lines 1336–1341.
 *
 * @param e - Native PointerEvent from the canvas DOM element.
 * @param _state - Current SessionState (unused directly; hover reads _stepPos).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function onStagePointerMove(e: PointerEvent, _state: SessionState): void {
  if (_stepPos.length === 0) {
    _hoveredLayerIndex = -1;
    return;
  }

  // Round-2 fix: events are on app.view (canvas); e.offsetX/Y are canvas-local
  // CSS pixels. With autoDensity:true, PIXI logical px === CSS px — no DPR
  // conversion needed.
  const x = e.offsetX;
  const y = e.offsetY;

  // Find nearest layer — prototype: nearestLayer(), lines 1319–1324
  let bestLi3 = -1;
  let bestD3 = Infinity;
  for (let li = 0; li < _stepPos.length; li++) {
    for (const p of _stepPos[li]) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD3) {
        bestD3 = d;
        bestLi3 = li;
      }
    }
  }

  if (bestLi3 >= 0 && bestD3 < 40) {
    _hoveredLayerIndex = bestLi3;
  } else {
    _hoveredLayerIndex = -1;
  }
}

// ── Public accessors ──────────────────────────────────────────────────────────

/**
 * Return the currently hovered layer index (-1 if none).
 * App.svelte reads this to show/hide the DOM overlay.
 */
export function getHoveredLayerIndex(): number {
  return _hoveredLayerIndex;
}

/**
 * Return the canvas-local position of a layer's label anchor (current morph state).
 * Defect 4 fix: App.svelte uses this to position the DOM overlay at a fixed location
 * relative to the layer, rather than tracking the pointer on every pointermove.
 *
 * @param li - Layer index.
 * @returns Canvas-local {x, y} of the label anchor, or null if layer not found.
 */
export function getLayerLabelPos(li: number): { x: number; y: number } | null {
  const g = _rGeo[li];
  if (g === undefined) return null;
  const m = _rMorph;
  return {
    x: lerp(g.labelPolar.x, g.labelLin.x, m),
    y: lerp(g.labelPolar.y, g.labelLin.y, m),
  };
}

/**
 * Set the morph target: 0 = radial, 1 = linear.
 * A-03-06: App.svelte button or console calls this to trigger the morph animation.
 * Prototype: `rLayoutTarget` global, toggled by UI controls.
 *
 * @param t - Target morph value: 0 (radial) or 1 (linear).
 */
export function setMorphTarget(t: 0 | 1): void {
  _rLayoutTarget = t;
}
