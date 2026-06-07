// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Tonnetz harmony view: static geometry build.
// Prototype source: reference/orbifold.html lines 947–1025 (buildTonnetz()).
// Per ADR 0003: TonnetzNode carries {i,j,pc} only; pixel layout is render-layer concern.
// Per ADR 0004: sessionStore is NOT imported here; state is passed in from App.svelte.

import * as PIXI from 'pixi.js';

import { computeTonnetzNodes, computeTonnetzTriangles } from '../core/theory/tonnetz.js';
import type { TonnetzNode, TonnetzTriangle } from '../core/theory/tonnetz.js';
import { NOTE_NAMES } from '../core/theory/pitch.js';
import { SCALE_INTERVALS } from '../core/theory/scales.js';
import type { Mode } from '../core/theory/scales.js';
import type { SessionState } from '../state/session.js';
import { getStageRefs } from './stage.js';
import { COL, FUNC_COL, FONT_SERIF } from './theme.js';

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
 * Module-level so hit-testing (step 03.4) can access it.
 */
let _renderNodes: RenderNode[] = [];

/**
 * Render-layer triangle array, populated by buildTonnetz.
 * Module-level so hit-testing (step 03.4) can access it.
 */
let _renderTris: RenderTri[] = [];

// ── Accessors for other modules (step 03.4 hit-testing) ──────────────────────

export function getRenderNodes(): readonly RenderNode[] {
  return _renderNodes;
}

export function getRenderTris(): readonly RenderTri[] {
  return _renderTris;
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
  // Core engine produces all (i,j) in range; render layer culls by viewport.
  // Per ADR 0003: pixel layout is render-layer concern.
  const coreNodes = computeTonnetzNodes(ci, cj);

  // Build a map from "i,j" → RenderNode for triangle assembly.
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
  // Use computeTonnetzTriangles for the diatonic lookup (per ADR 0003).
  // Then add per-vertex pixel coords and centroid for the render layer.
  const root = state.harmony.root;
  const mode = state.harmony.mode as Mode;

  // We need to generate triangles only from nodes that survived viewport culling.
  // Build a thin node set that only contains culled nodes, so
  // computeTonnetzTriangles uses exactly the same (i,j) pairs.
  // Iterate manually: for each (i,j) in nodeAt, check if all four quad vertices
  // exist (same culling the prototype applies), then form triangles.

  // diatonicLookup is done inside computeTonnetzTriangles, but we need to
  // replicate the same triangle generation logic on the culled node set.
  // We call computeTonnetzTriangles on the FULL core node set (un-culled) to
  // get diatonic info, then filter to those whose vertices are all in nodeAt.
  const coreTriangles = computeTonnetzTriangles(coreNodes, root, mode);

  for (const tri of coreTriangles) {
    const [a, b, c] = tri.vertices;
    const ra = nodeAt.get(`${a.i},${a.j}`);
    const rb = nodeAt.get(`${b.i},${b.j}`);
    const rc = nodeAt.get(`${c.i},${c.j}`);
    // Skip triangles where any vertex was culled by viewport
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
    // inKey iff diatonic lookup found a match for this triangle's rootPc:qual
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
  // Scale membership: prototype line 1012
  const intervals = SCALE_INTERVALS[mode];
  const scaleSet = new Set<number>(intervals.map((iv) => (root + iv) % 12));

  for (const n of _renderNodes) {
    const inScale = scaleSet.has(n.pc);

    // Node circle — prototype lines 1015–1016
    hNodes.beginFill(0x0c0e13, 1);
    hNodes.lineStyle(1.4, inScale ? COL.accent : COL.faint, inScale ? 0.8 : 0.5);
    hNodes.drawCircle(n.x, n.y, inScale ? 13 : 10);
    hNodes.endFill();

    // Note-name label — prototype lines 1017–1022
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

  // ── Step 03.3: no dynamic updates (computeNR is step 03.4) ───────────────
  // Prototype line 1024: computeNR() would be called here; deferred to 03.4.
}

// ── buildRhythmScene stub ─────────────────────────────────────────────────────

/**
 * Stub for the rhythm scene build — implemented in step 03.5.
 * Exported so App.svelte can import it for the resize callback without errors.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildRhythmScene(_state: SessionState): void {
  // Implemented in src/render/rhythm-scene.ts step 03.5.
}
