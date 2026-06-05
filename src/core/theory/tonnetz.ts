// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — pc(i,j) = (7i + 4j) mod 12, Tonnetz triangle generation.
// Ported from reference/orbifold.html lines 946–991, 1234–1249 (pure data only).
// Per ADR 0003: TonnetzNode carries {i, j, pc} only — no pixel coordinates.
// Pixel layout {x, y} is exclusively a render-layer concern (src/render/).

import { type Quality, chordPcs, chordLabel } from './chords.js';
import { type Mode, type DiatonicChord, diatonicLookup } from './scales.js';

/**
 * A node in the Tonnetz lattice.
 * Carries lattice coordinates (i, j) and the resulting pitch class.
 * No pixel geometry — that belongs to the render layer.
 * Per ADR 0003 / OD-5 resolution.
 */
export interface TonnetzNode {
  i: number;
  j: number;
  pc: number;
}

/**
 * A triangle in the Tonnetz (= a triad).
 * Upward triangle (▲) = major; downward triangle (▽) = minor.
 */
export interface TonnetzTriangle {
  vertices: [TonnetzNode, TonnetzNode, TonnetzNode];
  rootPc: number;
  qual: Quality;
  pcs: number[];
  label: string;
  info: DiatonicChord | null;
}

/**
 * Pure pitch-class function for the Tonnetz lattice.
 * Implements pc(i,j) = ((7i + 4j) % 12 + 12) % 12 exactly.
 * Prototype line 966.
 */
export function tonnetzPc(i: number, j: number): number {
  return (((7 * i + 4 * j) % 12) + 12) % 12;
}

/**
 * Generate all Tonnetz lattice nodes for a grid of
 * [-iRange..iRange] × [-jRange..jRange].
 * Nodes carry {i, j, pc} only — no pixel coordinates.
 * Ported from prototype lines 962–970 (geometry stripped per ADR 0003).
 */
export function computeTonnetzNodes(iRange: number, jRange: number): TonnetzNode[] {
  const nodes: TonnetzNode[] = [];
  for (let j = -jRange; j <= jRange; j++) {
    for (let i = -iRange; i <= iRange; i++) {
      const pc = tonnetzPc(i, j);
      nodes.push({ i, j, pc });
    }
  }
  return nodes;
}

/**
 * Generate all Tonnetz triangles from a node set, tagged with diatonic info
 * for the given root and mode.
 *
 * Triangle rules (prototype lines 982–991):
 * - Upward triangle: vertices A(i,j), B(i+1,j), C(i,j+1) → major, rootPc = A.pc.
 * - Downward triangle: vertices B(i+1,j), C(i,j+1), D(i+1,j+1) → minor, rootPc = C.pc.
 *
 * @param nodes - Node set produced by computeTonnetzNodes.
 * @param root  - Key root pitch class (for diatonic info lookup).
 * @param mode  - Scale mode (for diatonic info lookup).
 */
export function computeTonnetzTriangles(
  nodes: TonnetzNode[],
  root: number,
  mode: Mode
): TonnetzTriangle[] {
  // Build a fast lookup map: "i,j" → TonnetzNode
  const nodeMap = new Map<string, TonnetzNode>();
  for (const n of nodes) {
    nodeMap.set(`${n.i},${n.j}`, n);
  }

  const dia = diatonicLookup(root, mode);
  const triangles: TonnetzTriangle[] = [];

  function mkTri(
    a: TonnetzNode,
    b: TonnetzNode,
    c: TonnetzNode,
    rootPc: number,
    qual: Quality
  ): void {
    const key = `${rootPc}:${qual}`;
    const info = dia[key] ?? null;
    triangles.push({
      vertices: [a, b, c],
      rootPc,
      qual,
      pcs: chordPcs(rootPc, qual),
      label: chordLabel(rootPc, qual),
      info,
    });
  }

  // Iterate over all (i, j) pairs and generate triangles where all four
  // vertices exist (i.e., are within the grid).
  const iVals = new Set<number>();
  const jVals = new Set<number>();
  for (const n of nodes) {
    iVals.add(n.i);
    jVals.add(n.j);
  }

  for (const j of jVals) {
    for (const i of iVals) {
      const A = nodeMap.get(`${i},${j}`);
      const B = nodeMap.get(`${i + 1},${j}`);
      const C = nodeMap.get(`${i},${j + 1}`);
      const D = nodeMap.get(`${i + 1},${j + 1}`);

      if (A && B && C) {
        // Upward triangle (▲) → major, rootPc = A.pc
        mkTri(A, B, C, A.pc, 'maj');
      }
      if (B && C && D) {
        // Downward triangle (▽) → minor, rootPc = C.pc
        // pcs {B,C,D} = {r+7, r+4, r+11} where r = A.pc → minor triad root = C.pc
        mkTri(B, C, D, C.pc, 'min');
      }
    }
  }

  return triangles;
}
