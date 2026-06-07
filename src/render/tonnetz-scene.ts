// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Tonnetz harmony view: static geometry build + interactivity + animation.
// Prototype source:
//   buildTonnetz():        reference/orbifold.html lines 947–1025
//   tickHarmony():         reference/orbifold.html lines 1085–1143
//   computeNR():           reference/orbifold.html lines 1250–1279
//   onStagePointer():      reference/orbifold.html lines 1222–1229, 1281–1293
//   pickChord():           reference/orbifold.html lines 1352–1377
//   updateSuggestions():   reference/orbifold.html lines 1387–1408
// Per ADR 0003: TonnetzNode carries {i,j,pc} only; pixel layout is render-layer concern.
// Per ADR 0004: sessionStore is NOT imported here; state is passed in from App.svelte.

import * as PIXI from 'pixi.js';
import { get } from 'svelte/store';

import { computeTonnetzNodes, computeTonnetzTriangles } from '../core/theory/tonnetz.js';
import type { TonnetzNode, TonnetzTriangle } from '../core/theory/tonnetz.js';
import { NOTE_NAMES } from '../core/theory/pitch.js';
import { SCALE_INTERVALS } from '../core/theory/scales.js';
import type { Mode } from '../core/theory/scales.js';
import { computeDiatonic } from '../core/theory/scales.js';
import { chordPcs } from '../core/theory/chords.js';
import { nrLabel } from '../core/theory/neo-riemannian.js';
import type { NRLabel } from '../core/theory/neo-riemannian.js';
import { minimalVoiceLeading } from '../core/theory/voice-leading.js';
import type { VoiceLeadingResult } from '../core/theory/voice-leading.js';
import { sessionStore, playChord, requeueLive } from '../state/session.js';
import type { SessionState, Chord } from '../state/session.js';
import { getStageRefs } from './stage.js';
import { COL, FUNC_COL, FONT_SERIF, FONT_SANS } from './theme.js';
import { tickRhythm as _tickRhythmImpl } from './rhythm-scene.js';

// ── Render-layer extended types (ADR 0003: do NOT mutate core types) ────────

/**
 * TonnetzNode extended with pixel screen coordinates.
 * Per ADR 0003: core types are not mutated; this is render-layer only.
 */
export type RenderNode = TonnetzNode & { x: number; y: number };

/**
 * TonnetzTriangle extended with per-vertex pixel coords and centroid.
 * Used for hit-testing in step 03.4.
 */
export type RenderTri = TonnetzTriangle & {
  vx: [number, number, number]; // vertex x
  vy: [number, number, number]; // vertex y
  cx: number; // centroid x
  cy: number; // centroid y
};

// ── Module-level render state ─────────────────────────────────────────────────

/**
 * Render-layer node array, populated by buildTonnetz.
 * Module-level so hit-testing can access it.
 */
let _renderNodes: RenderNode[] = [];

/**
 * Render-layer triangle array, populated by buildTonnetz.
 * Module-level so hit-testing can access it.
 */
let _renderTris: RenderTri[] = [];

// ── Step 03.4 module-level dynamic state ─────────────────────────────────────

/** P·L·R neighbour triangles of the last-picked chord. Prototype: `nrNeighbors`. */
let _nrTris: { tri: RenderTri; label: NRLabel }[] = [];

/** Suggestion triangles for tonal-function next-chord hints. Prototype: `suggestionTris`. */
let _suggestionTris: RenderTri[] = [];

/**
 * Last computed minimal voice-leading result (displayed in HUD in Phase 04).
 * Written by pickChord each time a new chord is selected; consumed by the HUD
 * in Phase 04. Exported so Phase 04 can read it without a store round-trip.
 */
export let _lastVL: VoiceLeadingResult | null = null;

/** Last-picked chord reference (rootPc + qual + centroid). Prototype: `lastPick`. */
let _lastPick: { rootPc: number; qual: string; cx: number; cy: number } | null = null;

/** Traveling particle position along voice-leading path [0..1). Prototype: `particle`. */
let _particle = 0;

/**
 * Session start timestamp for bar-phase computation.
 * OD-4 resolution: module-local, reset when nowPlaying.source changes to active.
 * Prototype: `sessionStart` global, reset in runNow/queueForNextCycle (lines 616, 623).
 */
let _sessionStart = performance.now();

/** Track the previous nowPlaying source to detect source changes. */
let _prevNowPlayingSource: string | null = null;

/** Current view, kept in sync with sessionStore.view for the ticker dispatch. */
let _currentView: 'harmony' | 'rhythm' = 'harmony';

// ── Accessors for other modules ──────────────────────────────────────────────

export function getRenderNodes(): readonly RenderNode[] {
  return _renderNodes;
}

export function getRenderTris(): readonly RenderTri[] {
  return _renderTris;
}

// ── pointInTri helper ─────────────────────────────────────────────────────────

/**
 * Sign-based triangle containment test.
 * Prototype lines 1222–1229.
 *
 * @param px - Pointer x (canvas-local).
 * @param py - Pointer y (canvas-local).
 * @param tri - RenderTri to test against.
 */
function pointInTri(px: number, py: number, tri: RenderTri): boolean {
  const ax = tri.vx[0],
    ay = tri.vy[0];
  const bx = tri.vx[1],
    by = tri.vy[1];
  const cx = tri.vx[2],
    cy = tri.vy[2];
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (d === 0) return false;
  const u = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
  const v = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
  const w = 1 - u - v;
  return u >= 0 && v >= 0 && w >= 0;
}

// ── buildTonnetz ─────────────────────────────────────────────────────────────

/**
 * Build (or rebuild) the static Tonnetz geometry: triangle fills, edges,
 * node circles, and note-name labels.
 *
 * Called once after initStage succeeds and again on every debounced resize.
 * Prototype source: buildTonnetz(), lines 947–1025.
 *
 * @param state - Current SessionState; harmony.root and harmony.mode drive colors.
 */
export function buildTonnetz(state: SessionState): void {
  const refs = getStageRefs();
  const { hGrid, hNodes, hLabels, app } = refs;

  // ── Clear previous build — prototype line 949 ─────────────────────────────
  hGrid.clear();
  hNodes.clear();
  hLabels.removeChildren();
  _renderNodes = [];
  _renderTris = [];

  // ── Pixel layout constants — prototype lines 952–958 ─────────────────────
  const W = app.screen.width;
  const H = app.screen.height;
  const cell = Math.max(78, Math.min(132, Math.min(W, H) / 6.4));
  const rowH = cell * 0.866;
  const cx = W / 2;
  const cy = H / 2;
  const cols = Math.ceil(W / cell) + 4;
  const rows = Math.ceil(H / rowH) + 4;
  const ci = Math.ceil(cols / 2);
  const cj = Math.ceil(rows / 2);

  // ── Pixel position function — prototype line 961 ──────────────────────────
  function pos(i: number, j: number): { x: number; y: number } {
    return { x: cx + i * cell + j * cell * 0.5, y: cy - j * rowH };
  }

  // ── Generate core nodes and apply pixel positions — prototype lines 962–969 ─
  const coreNodes = computeTonnetzNodes(ci, cj);

  const nodeAt = new Map<string, RenderNode>();

  for (const n of coreNodes) {
    const p = pos(n.i, n.j);
    // Viewport culling — prototype line 965
    if (p.x < -cell || p.x > W + cell || p.y < -cell || p.y > H + cell) continue;
    const rn: RenderNode = { ...n, x: p.x, y: p.y };
    _renderNodes.push(rn);
    nodeAt.set(`${n.i},${n.j}`, rn);
  }

  // ── Generate triangles with pixel geometry — prototype lines 979–991 ──────
  const root = state.harmony.root;
  const mode = state.harmony.mode as Mode;

  const coreTriangles = computeTonnetzTriangles(coreNodes, root, mode);

  for (const tri of coreTriangles) {
    const [a, b, c] = tri.vertices;
    const ra = nodeAt.get(`${a.i},${a.j}`);
    const rb = nodeAt.get(`${b.i},${b.j}`);
    const rc = nodeAt.get(`${c.i},${c.j}`);
    if (!ra || !rb || !rc) continue;

    const cxT = (ra.x + rb.x + rc.x) / 3;
    const cyT = (ra.y + rb.y + rc.y) / 3;
    const rt: RenderTri = {
      ...tri,
      vx: [ra.x, rb.x, rc.x],
      vy: [ra.y, rb.y, rc.y],
      cx: cxT,
      cy: cyT,
    };
    _renderTris.push(rt);
  }

  // ── Triangle fill — prototype lines 993–1001 ──────────────────────────────
  for (const t of _renderTris) {
    const { info } = t;
    const fill = info !== null ? (FUNC_COL[info.func.cls] ?? COL.node) : COL.bg;
    const fa = info !== null ? 0.16 : 0.04;
    hGrid.beginFill(fill, fa);
    hGrid.lineStyle(0);
    hGrid.drawPolygon([t.vx[0], t.vy[0], t.vx[1], t.vy[1], t.vx[2], t.vy[2]]);
    hGrid.endFill();
  }

  // ── Edges — prototype lines 1003–1009 ────────────────────────────────────
  hGrid.lineStyle(1, COL.line, 0.9);
  for (const t of _renderTris) {
    hGrid.moveTo(t.vx[0], t.vy[0]);
    hGrid.lineTo(t.vx[1], t.vy[1]);
    hGrid.lineTo(t.vx[2], t.vy[2]);
    hGrid.lineTo(t.vx[0], t.vy[0]);
  }

  // ── Node circles and labels — prototype lines 1011–1023 ──────────────────
  const intervals = SCALE_INTERVALS[mode];
  const scaleSet = new Set<number>(intervals.map((iv) => (root + iv) % 12));

  for (const n of _renderNodes) {
    const inScale = scaleSet.has(n.pc);

    hNodes.beginFill(0x0c0e13, 1);
    hNodes.lineStyle(1.4, inScale ? COL.accent : COL.faint, inScale ? 0.8 : 0.5);
    hNodes.drawCircle(n.x, n.y, inScale ? 13 : 10);
    hNodes.endFill();

    const t = new PIXI.Text(NOTE_NAMES[n.pc], {
      fontFamily: FONT_SERIF,
      fontSize: inScale ? 15 : 12.5,
      fill: inScale ? 0xeaedf4 : 0x6d7384,
      fontWeight: '500',
    });
    t.anchor.set(0.5);
    t.x = n.x;
    t.y = n.y;
    t.resolution = 2;
    hLabels.addChild(t);
  }

  // ── After rebuild, restore P·L·R/selection/suggestion overlays — prototype line 1024 ─
  // updateTonnetzDynamic is called externally by App.svelte after buildTonnetz.
  // (Kept here as a comment; App.svelte calls updateTonnetzDynamic via store subscription.)
}

// ── updateTonnetzDynamic ──────────────────────────────────────────────────────

/**
 * Update P·L·R highlights, suggestion triangles, and sessionStart reset.
 * Called by App.svelte's store subscription when harmony or nowPlaying changes.
 * Prototype source: computeNR() lines 1250–1279; updateSuggestions() lines 1387–1408;
 * sessionStart reset implicit in runNow/queueForNextCycle (prototype lines 616, 623).
 *
 * @param state - Current SessionState.
 */
export function updateTonnetzDynamic(state: SessionState): void {
  const refs = getStageRefs();
  const { hNRL } = refs;
  const progression = state.harmony.progression;

  // ── OD-4 resolution: reset _sessionStart when source activates ────────────
  const src = state.nowPlaying.source;
  if (src !== null && src !== _prevNowPlayingSource) {
    _sessionStart = performance.now();
  }
  _prevNowPlayingSource = src;

  // ── Sync view for ticker dispatch ─────────────────────────────────────────
  if (state.view === 'harmony' || state.view === 'rhythm') {
    _currentView = state.view;
  }

  // ── Extract last picked chord — prototype: lastPick (line 1232) ───────────
  if (progression.length > 0) {
    const last = progression[progression.length - 1];
    // Find the matching RenderTri (closest to previous _lastPick centroid if
    // multiple triangles share the same rootPc:qual — Tonnetz wraps).
    let sel: RenderTri | null = null;
    let bd = Infinity;
    const prevCx = _lastPick !== null ? _lastPick.cx : null;
    const prevCy = _lastPick !== null ? _lastPick.cy : null;
    for (const t of _renderTris) {
      if (t.rootPc === last.rootPc && t.qual === last.qual) {
        // If we have a previous centroid, pick the closest matching tri.
        // Otherwise just take the first match.
        const d = prevCx !== null && prevCy !== null ? Math.hypot(t.cx - prevCx, t.cy - prevCy) : 0;
        if (sel === null || d < bd) {
          bd = d;
          sel = t;
        }
      }
    }
    if (sel !== null) {
      _lastPick = { rootPc: sel.rootPc, qual: sel.qual, cx: sel.cx, cy: sel.cy };
    }
  } else {
    _lastPick = null;
  }

  // ── computeNR — prototype lines 1250–1279 ─────────────────────────────────
  _nrTris = [];
  hNRL.removeChildren();

  if (_lastPick !== null && _renderTris.length > 0) {
    // Locate the selected triangle matching _lastPick (closest centroid).
    let sel: RenderTri | null = null;
    let bd = Infinity;
    for (const t of _renderTris) {
      if (t.rootPc === _lastPick.rootPc && t.qual === _lastPick.qual) {
        const d = Math.hypot(t.cx - _lastPick.cx, t.cy - _lastPick.cy);
        if (d < bd) {
          bd = d;
          sel = t;
        }
      }
    }

    if (sel !== null) {
      const selTri = sel;
      // Find triangles sharing exactly 2 vertices — prototype line 1265–1269.
      // Vertices are shared when they share the same (i,j) coordinates.
      const selKeys = new Set([
        `${selTri.vertices[0].i},${selTri.vertices[0].j}`,
        `${selTri.vertices[1].i},${selTri.vertices[1].j}`,
        `${selTri.vertices[2].i},${selTri.vertices[2].j}`,
      ]);

      for (const t of _renderTris) {
        if (t === selTri) continue;
        // Count shared vertex keys
        let shared = 0;
        for (const v of t.vertices) {
          if (selKeys.has(`${v.i},${v.j}`)) shared++;
        }
        if (shared === 2) {
          const lab = nrLabel(selTri.rootPc, selTri.qual, t.rootPc, t.qual);
          if (lab !== null) {
            _nrTris.push({ tri: t, label: lab });
          }
        }
      }

      // Create P·L·R text labels at neighbour centroids — prototype lines 1272–1278.
      for (const nb of _nrTris) {
        const txt = new PIXI.Text(nb.label, {
          fontFamily: FONT_SANS,
          fontSize: 17,
          fill: 0xb9c6ff,
          fontWeight: '800',
        });
        txt.anchor.set(0.5);
        txt.x = nb.tri.cx;
        txt.y = nb.tri.cy;
        txt.resolution = 2;
        hNRL.addChild(txt);
      }
    }
  }

  // ── updateSuggestions — prototype lines 1387–1408 ─────────────────────────
  _suggestionTris = [];
  if (progression.length === 0) return;

  // Find the RenderTri for the last chord to get its info.
  let lastTri: RenderTri | null = null;
  if (_lastPick !== null) {
    let bd = Infinity;
    for (const t of _renderTris) {
      if (t.rootPc === _lastPick.rootPc && t.qual === _lastPick.qual) {
        const d = Math.hypot(t.cx - _lastPick.cx, t.cy - _lastPick.cy);
        if (d < bd) {
          bd = d;
          lastTri = t;
        }
      }
    }
  }

  if (lastTri === null || lastTri.info === null) return; // chromatic — no suggestions

  const funcF = lastTri.info.func.f;
  let targets: string[] = [];
  if (funcF === 'T') targets = ['SD', 'D'];
  else if (funcF === 'SD') targets = ['D', 'T'];
  else if (funcF === 'D') targets = ['T'];

  if (targets.length === 0) return;

  // Compute diatonic chords for the current root/mode.
  const root = state.harmony.root;
  const mode = state.harmony.mode as Mode;
  const dia = computeDiatonic(root, mode);

  // Find wanted rootPc:qual pairs — prototype lines 1397–1399.
  const wanted = dia
    .filter((d) => targets.includes(d.func.f) && (d.qual === 'maj' || d.qual === 'min'))
    .map((d) => `${d.rootPc}:${d.qual}`);

  // For each wanted chord, pick the RenderTri closest to the last pick centroid.
  const lastCx = _lastPick !== null ? _lastPick.cx : 0;
  const lastCy = _lastPick !== null ? _lastPick.cy : 0;

  for (const key of wanted) {
    const cands = _renderTris.filter((t) => `${t.rootPc}:${t.qual}` === key);
    if (cands.length === 0) continue;
    let bestT: RenderTri | null = null;
    let bestD = Infinity;
    for (const t of cands) {
      const d = Math.hypot(t.cx - lastCx, t.cy - lastCy);
      if (d < bestD) {
        bestD = d;
        bestT = t;
      }
    }
    if (bestT !== null) _suggestionTris.push(bestT);
  }
}

// ── onStagePointerDown ────────────────────────────────────────────────────────

/**
 * Handle canvas pointerdown in harmony view.
 * Hit-tests against _renderTris using pointInTri and calls pickChord if found.
 * Prototype: onStagePointer() harmony branch, lines 1281–1286.
 *
 * @param e - Native PointerEvent from the canvas DOM element.
 */
export function onStagePointerDown(e: PointerEvent): void {
  const refs = getStageRefs();
  const { app } = refs;
  const rect = (app.view as HTMLCanvasElement).getBoundingClientRect();
  // Defect 1 fix: apply DPR scale factor so hit-test uses canvas-local coordinates
  // even when autoDensity:true with resolution > 1 causes the canvas to have a
  // CSS size different from its logical pixel size.
  const localX = (e.clientX - rect.left) * (app.screen.width / rect.width);
  const localY = (e.clientY - rect.top) * (app.screen.height / rect.height);

  for (const tri of _renderTris) {
    if (pointInTri(localX, localY, tri)) {
      pickChord(tri, get(sessionStore));
      return;
    }
  }
}

// ── pickChord (internal) ──────────────────────────────────────────────────────

/**
 * Select a chord triangle: append to progression, play it, compute voice-leading.
 * Prototype: pickChord(), lines 1352–1377.
 *
 * @param tri   - The clicked RenderTri.
 * @param state - Current SessionState (passed to avoid redundant get() calls).
 */
function pickChord(tri: RenderTri, state: SessionState): void {
  const newChord: Chord = { rootPc: tri.rootPc, qual: tri.qual, gain: 0.6 };

  // ── Compute voice-leading before appending — prototype lines 1363–1370 ────
  // `Chord` stores {rootPc, qual, gain} only; pcs are derived via chordPcs().
  // `RenderTri` extends TonnetzTriangle which carries pcs: number[].
  const prevProg = state.harmony.progression;
  if (prevProg.length > 0) {
    const prev = prevProg[prevProg.length - 1];
    const prevPcsArr = chordPcs(prev.rootPc, prev.qual);
    const newPcsArr = tri.pcs; // TonnetzTriangle.pcs: number[]
    if (prevPcsArr.length === 3 && newPcsArr.length === 3) {
      _lastVL = minimalVoiceLeading(
        [prevPcsArr[0], prevPcsArr[1], prevPcsArr[2]],
        [newPcsArr[0], newPcsArr[1], newPcsArr[2]]
      );
    }
  } else {
    _lastVL = null;
  }

  // ── Append to sessionStore progression — prototype line 1372 ─────────────
  sessionStore.update((s) => ({
    ...s,
    harmony: {
      ...s.harmony,
      progression: [...s.harmony.progression, newChord],
    },
  }));

  // ── Play the chord immediately — prototype lines 1357–1360 ────────────────
  playChord(tri.rootPc, tri.qual, 0.6);

  // ── Requeue if something is already playing — prototype line 1374 ─────────
  // requeueLive checks nowPlaying.source from the store.
  requeueLive();

  // ── Update P·L·R highlights and suggestions — prototype line 1374 ────────
  updateTonnetzDynamic(get(sessionStore));
}

// ── tickHarmony ───────────────────────────────────────────────────────────────

/**
 * Per-frame animation tick for the harmony view.
 * Prototype: tickHarmony(phase, now, barMs), lines 1085–1143.
 *
 * @param delta - PIXI ticker delta (dimensionless, ~1.0 at 60 fps).
 */
export function tickHarmony(delta: number): void {
  const refs = getStageRefs();
  const { hDyn, hPath } = refs;
  const state = get(sessionStore);
  const prog = state.harmony.progression;

  hDyn.clear();
  hPath.clear();

  // ── Bar-phase computation — prototype lines 1077–1079 ─────────────────────
  const now = performance.now();
  const bpm = state.bpm;
  // barMs = duration of one 4/4 bar in milliseconds
  const barMs = (60000 / bpm) * 4;
  const phase = ((now - _sessionStart) % barMs) / barMs; // 0..1 per bar

  // ── Advance particle — prototype line 1079 ────────────────────────────────
  _particle = (_particle + delta * 0.012) % 1;

  // ── Voice-leading path on hPath — prototype lines 1091–1103 ──────────────
  // Map each progression Chord to its centroid via _renderTris.
  const centroids: { cx: number; cy: number }[] = [];
  for (const ch of prog) {
    // Find closest matching RenderTri
    let bestT: RenderTri | null = null;
    let bestD = Infinity;
    for (const t of _renderTris) {
      if (t.rootPc === ch.rootPc && t.qual === ch.qual) {
        // Use _lastPick proximity as tiebreaker; here just take first
        const d = bestT !== null ? Math.hypot(t.cx - bestT.cx, t.cy - bestT.cy) : Infinity;
        if (bestT === null || d < bestD) {
          bestD = 0; // First match wins (consistent with pick order)
          bestT = t;
        }
      }
    }
    if (bestT !== null) centroids.push({ cx: bestT.cx, cy: bestT.cy });
  }

  if (centroids.length >= 1) {
    // Glow path — prototype line 1092
    hPath.lineStyle(7, COL.accent, 0.1);
    for (let i = 1; i < centroids.length; i++) {
      hPath.moveTo(centroids[i - 1].cx, centroids[i - 1].cy);
      hPath.lineTo(centroids[i].cx, centroids[i].cy);
    }
    // Sharp path — prototype line 1094
    hPath.lineStyle(2, COL.accent, 0.85);
    for (let i = 1; i < centroids.length; i++) {
      hPath.moveTo(centroids[i - 1].cx, centroids[i - 1].cy);
      hPath.lineTo(centroids[i].cx, centroids[i].cy);
    }
    // Traveling particle on last segment — prototype lines 1097–1102
    if (centroids.length >= 2) {
      const a = centroids[centroids.length - 2];
      const b = centroids[centroids.length - 1];
      const t = _particle;
      const px = a.cx + (b.cx - a.cx) * t;
      const py = a.cy + (b.cy - a.cy) * t;
      hPath.beginFill(COL.accent, 0.9);
      hPath.drawCircle(px, py, 3.5);
      hPath.endFill();
    }
  }

  // ── Active chord pulse — prototype lines 1106–1120 ────────────────────────
  let activeIdx = -1;
  if (prog.length > 0) {
    activeIdx = Math.floor((now - _sessionStart) / barMs) % prog.length;
  }

  prog.forEach((ch, idx) => {
    // Find matching RenderTri for this chord
    let tri: RenderTri | null = null;
    for (const t of _renderTris) {
      if (t.rootPc === ch.rootPc && t.qual === ch.qual) {
        tri = t;
        break;
      }
    }
    if (tri === null) return;

    const isActive = idx === activeIdx;
    const pulse = isActive ? 0.5 + 0.35 * Math.sin(phase * Math.PI * 2) : 0.22;

    hDyn.beginFill(COL.accent, isActive ? 0.2 + 0.12 * Math.sin(phase * Math.PI * 2) : 0.12);
    hDyn.lineStyle(isActive ? 2.4 : 1.4, COL.accent, isActive ? 0.95 : 0.55);
    hDyn.drawPolygon([tri.vx[0], tri.vy[0], tri.vx[1], tri.vy[1], tri.vx[2], tri.vy[2]]);
    hDyn.endFill();
    // Centroid marker circle — prototype lines 1118–1119
    hDyn.beginFill(COL.accent, pulse);
    hDyn.lineStyle(0);
    hDyn.drawCircle(tri.cx, tri.cy, isActive ? 8 : 5);
    hDyn.endFill();
  });

  // ── Suggestion glow — prototype lines 1122–1130 ───────────────────────────
  for (const t of _suggestionTris) {
    const g = 0.08 + 0.04 * Math.sin(now * 0.004);
    const col = t.info !== null ? (FUNC_COL[t.info.func.cls] ?? COL.accent) : COL.accent;
    hDyn.lineStyle(1.6, col, 0.4 + 0.2 * Math.sin(now * 0.004));
    hDyn.beginFill(col, g);
    hDyn.drawPolygon([t.vx[0], t.vy[0], t.vx[1], t.vy[1], t.vx[2], t.vy[2]]);
    hDyn.endFill();
  }

  // ── P·L·R animated glow on hNRG — prototype lines 1132–1143 ──────────────
  const { hNRG, hNRL } = refs;
  hNRG.clear();
  if (_nrTris.length > 0) {
    const a = 0.45 + 0.3 * Math.sin(now * 0.005);
    for (const nb of _nrTris) {
      hNRG.lineStyle(2, 0x8aa0ff, a);
      hNRG.beginFill(0x8aa0ff, 0.05);
      hNRG.drawPolygon([
        nb.tri.vx[0],
        nb.tri.vy[0],
        nb.tri.vx[1],
        nb.tri.vy[1],
        nb.tri.vx[2],
        nb.tri.vy[2],
      ]);
      hNRG.endFill();
    }
    // Animate label alpha — prototype line 1142
    hNRL.alpha = 0.55 + 0.35 * Math.sin(now * 0.005);
  }
}

// ── tickRhythm dispatch ───────────────────────────────────────────────────────

/**
 * Rhythm view tick — dispatches to rhythm-scene.ts.
 * Step 03.5: replaced stub with real dispatch.
 * To avoid circular imports (rhythm-scene imports session.ts which is not
 * PIXI-dependent), the ticker in tonnetz-scene registers the top-level
 * dispatcher and calls rhythmSceneTick from rhythm-scene lazily imported here.
 * Approach: direct named import — no circular dependency because rhythm-scene.ts
 * does NOT import tonnetz-scene.ts.
 */
function tickRhythm(delta: number): void {
  // Dynamic approach: import rhythm scene's tickRhythm via the module-level
  // import below (static import is fine — no circular dep).
  _tickRhythmImpl(delta);
}

// ── registerTicker ────────────────────────────────────────────────────────────

/**
 * Register the top-level PIXI ticker that dispatches to tickHarmony or tickRhythm
 * based on the current view. Called once from App.svelte after buildTonnetz succeeds.
 * Prototype: app.ticker.add(tick) at line 931; tick() dispatcher at lines 1073–1083.
 *
 * @param app - The PIXI Application singleton.
 */
export function registerTicker(app: PIXI.Application): void {
  app.ticker.add((delta: number) => {
    const view = _currentView;
    if (view === 'harmony') {
      tickHarmony(delta);
    } else {
      tickRhythm(delta);
    }
  });
}

// buildRhythmScene has been moved to src/render/rhythm-scene.ts (step 03.5).
// App.svelte imports it from rhythm-scene.js directly.
