// SPDX-License-Identifier: AGPL-3.0-only
// Prototype parity tests for chords/scales (step 01.2) and
// tonnetzPc, computeTonnetzNodes, computeTonnetzTriangles, nrLabel (step 01.3).
// Golden values produced by running scripts/extract-golden-01-3.mjs (prototype
// lines 946–991, 1238–1249) and scripts/extract-golden.mjs (lines 697–757).

import { describe, it, expect } from 'vitest';
import { chordPcs, chordVoicing } from '../src/core/theory/chords.js';
import { diatonicLookup } from '../src/core/theory/scales.js';
import {
  tonnetzPc,
  computeTonnetzNodes,
  computeTonnetzTriangles,
} from '../src/core/theory/tonnetz.js';
import { nrLabel } from '../src/core/theory/neo-riemannian.js';

// ── chordPcs (step 01.2 partial parity — carried forward) ────────────

describe('chordPcs', () => {
  // Golden values: Node-executed from prototype lines 746–748 via scripts/extract-golden.mjs.

  it('chordPcs(0, "maj") → [0, 4, 7] (C major)', () => {
    expect(chordPcs(0, 'maj')).toEqual([0, 4, 7]);
  });

  it('chordPcs(9, "min") → [9, 0, 4] (A minor)', () => {
    expect(chordPcs(9, 'min')).toEqual([9, 0, 4]);
  });
});

// ── chordVoicing (step 01.2 partial parity — carried forward) ────────

describe('chordVoicing', () => {
  // Golden values: Node-executed from prototype lines 749–757 via scripts/extract-golden.mjs.
  // octave is an explicit required parameter (OD-6 resolution — no global fallback).

  it('chordVoicing(0, "maj", 3) → ["C3", "E3", "G3"]', () => {
    expect(chordVoicing(0, 'maj', 3)).toEqual(['C3', 'E3', 'G3']);
  });

  it('chordVoicing(9, "min", 3) → ["A3", "C4", "E4"] (octave wrap)', () => {
    // A=9, rootPc+iv for 3rd: 9+3=12 → floor(12/12)=1 → oct 3+1=4, pc=0 → C4
    // A=9, rootPc+iv for 5th: 9+7=16 → floor(16/12)=1 → oct 4, pc=4 → E4
    expect(chordVoicing(9, 'min', 3)).toEqual(['A3', 'C4', 'E4']);
  });
});

// ── diatonicLookup (step 01.2 partial parity — carried forward) ──────

describe('diatonicLookup', () => {
  // Golden values: Node-executed from prototype lines 736–740 via scripts/extract-golden.mjs.
  // Key format: "${rootPc}:${qual}" (confirmed from Node output).

  it('diatonicLookup(0, "major")["0:maj"].roman → "I"', () => {
    const lookup = diatonicLookup(0, 'major');
    expect(lookup['0:maj'].roman).toBe('I');
  });

  it('diatonicLookup(0, "major")["7:maj"].roman → "V" (G major, degree 4)', () => {
    // Node output confirms: key "7:maj" (G major, V, degree 4) exists.
    // Note: the phase file illustrative example referred to "7:min" which does not exist
    // in C major — the actual degree-4 chord (G major) has key "7:maj".
    const lookup = diatonicLookup(0, 'major');
    expect(lookup['7:maj'].roman).toBe('V');
    expect(lookup['7:maj'].degree).toBe(4);
  });

  it('diatonicLookup(0, "major") produces 7 entries with correct keys', () => {
    const lookup = diatonicLookup(0, 'major');
    const keys = Object.keys(lookup);
    expect(keys).toHaveLength(7);
    // Node-executed full key set:
    expect(keys.sort()).toEqual(
      ['0:maj', '11:dim', '2:min', '4:min', '5:maj', '7:maj', '9:min'].sort()
    );
  });

  it('diatonicLookup(0, "major")["9:min"].roman → "vi" (A minor, degree 5)', () => {
    const lookup = diatonicLookup(0, 'major');
    expect(lookup['9:min'].roman).toBe('vi');
    expect(lookup['9:min'].degree).toBe(5);
  });
});

// ── tonnetzPc (step 01.3 full parity) ────────────────────────────────

describe('tonnetzPc', () => {
  // Golden values: Node-executed from prototype line 966 via scripts/extract-golden-01-3.mjs.
  // Formula: ((7*i + 4*j) % 12 + 12) % 12

  it('tonnetzPc(0, 0) → 0 (C at origin)', () => {
    expect(tonnetzPc(0, 0)).toBe(0);
  });

  it('tonnetzPc(1, 0) → 7 (G, one step along i-axis = perfect fifth)', () => {
    expect(tonnetzPc(1, 0)).toBe(7);
  });

  it('tonnetzPc(0, 1) → 4 (E, one step along j-axis = major third)', () => {
    expect(tonnetzPc(0, 1)).toBe(4);
  });

  it('tonnetzPc(-1, 0) → 5 (F, negative i = perfect fourth)', () => {
    expect(tonnetzPc(-1, 0)).toBe(5);
  });

  it('tonnetzPc(2, -1) → 10 (A#/Bb)', () => {
    // Phase-file formula: ((14-4)%12+12)%12 = 10. Node confirms: 10.
    expect(tonnetzPc(2, -1)).toBe(10);
  });

  it('tonnetzPc(1, 1) → 11 (B)', () => {
    // 7*1 + 4*1 = 11. Node confirms: 11.
    expect(tonnetzPc(1, 1)).toBe(11);
  });
});

// ── computeTonnetzNodes (step 01.3 full parity) ───────────────────────

describe('computeTonnetzNodes', () => {
  // Golden values: Node-executed from prototype lines 962–970 via scripts/extract-golden-01-3.mjs.

  it('computeTonnetzNodes(2, 2) produces (2*2+1)^2 = 25 nodes', () => {
    const nodes = computeTonnetzNodes(2, 2);
    expect(nodes).toHaveLength(25); // (2*2+1) * (2*2+1) = 5*5
  });

  it('computeTonnetzNodes(2, 2) contains origin node with pc=0', () => {
    const nodes = computeTonnetzNodes(2, 2);
    const origin = nodes.find((n) => n.i === 0 && n.j === 0);
    expect(origin).toBeDefined();
    if (origin) {
      expect(origin.pc).toBe(0);
    }
  });

  it('computeTonnetzNodes(2, 2): node(1,0).pc = 7 (G)', () => {
    const nodes = computeTonnetzNodes(2, 2);
    const node = nodes.find((n) => n.i === 1 && n.j === 0);
    expect(node).toBeDefined();
    if (node) {
      expect(node.pc).toBe(7);
    }
  });

  it('computeTonnetzNodes(2, 2): node(0,1).pc = 4 (E)', () => {
    const nodes = computeTonnetzNodes(2, 2);
    const node = nodes.find((n) => n.i === 0 && n.j === 1);
    expect(node).toBeDefined();
    if (node) {
      expect(node.pc).toBe(4);
    }
  });
});

// ── computeTonnetzTriangles (step 01.3 full parity) ───────────────────

describe('computeTonnetzTriangles', () => {
  // Golden values: Node-executed via scripts/extract-golden-01-3.mjs,
  // prototype lines 979–991.

  it('upward triangle at (0,0) has rootPc=0, qual="maj" (C major)', () => {
    // Upward: A(0,0), B(1,0), C(0,1) → rootPc = A.pc = tonnetzPc(0,0) = 0, maj.
    const nodes = computeTonnetzNodes(2, 2);
    const triangles = computeTonnetzTriangles(nodes, 0, 'major');
    const upward = triangles.find(
      (t) =>
        t.qual === 'maj' &&
        t.vertices.some((v) => v.i === 0 && v.j === 0) &&
        t.vertices.some((v) => v.i === 1 && v.j === 0) &&
        t.vertices.some((v) => v.i === 0 && v.j === 1)
    );
    expect(upward).toBeDefined();
    if (upward) {
      expect(upward.rootPc).toBe(0);
      expect(upward.qual).toBe('maj');
      expect(upward.pcs).toEqual([0, 4, 7]); // C major pcs
    }
  });

  it('downward triangle at (0,0) has qual="min" and rootPc = tonnetzPc(0,1) = 4 (E minor)', () => {
    // Downward: B(1,0), C(0,1), D(1,1) → rootPc = C.pc = tonnetzPc(0,1) = 4, min.
    const nodes = computeTonnetzNodes(2, 2);
    const triangles = computeTonnetzTriangles(nodes, 0, 'major');
    const downward = triangles.find(
      (t) =>
        t.qual === 'min' &&
        t.vertices.some((v) => v.i === 1 && v.j === 0) &&
        t.vertices.some((v) => v.i === 0 && v.j === 1) &&
        t.vertices.some((v) => v.i === 1 && v.j === 1)
    );
    expect(downward).toBeDefined();
    if (downward) {
      expect(downward.rootPc).toBe(4); // tonnetzPc(0,1) = 4 (E)
      expect(downward.qual).toBe('min');
      expect(downward.pcs).toEqual([4, 7, 11]); // E minor pcs
    }
  });

  it('C major triangle (rootPc=0, maj) has diatonic info (info.roman = "I")', () => {
    const nodes = computeTonnetzNodes(2, 2);
    const triangles = computeTonnetzTriangles(nodes, 0, 'major');
    const cMaj = triangles.find((t) => t.rootPc === 0 && t.qual === 'maj');
    expect(cMaj).toBeDefined();
    if (cMaj) {
      expect(cMaj.info).not.toBeNull();
      if (cMaj.info) {
        expect(cMaj.info.roman).toBe('I');
      }
    }
  });

  it('triangles array is non-empty for a (2,2) grid', () => {
    const nodes = computeTonnetzNodes(2, 2);
    const triangles = computeTonnetzTriangles(nodes, 0, 'major');
    // A (2*2+1) × (2*2+1) = 5×5 grid produces at most 2*(5-1)*(5-1) = 32 triangles.
    expect(triangles.length).toBeGreaterThan(0);
  });
});

// ── nrLabel (step 01.3 full parity) ──────────────────────────────────

describe('nrLabel', () => {
  // Golden values: Node-executed from prototype lines 1238–1249 via scripts/extract-golden-01-3.mjs.
  // All cases confirmed correct; no phase-file discrepancies found.

  // P (Parallel) cases
  it('nrLabel(0, "maj", 0, "min") → "P" (C major → C minor, parallel)', () => {
    expect(nrLabel(0, 'maj', 0, 'min')).toBe('P');
  });

  // R (Relative) cases
  it('nrLabel(0, "maj", 9, "min") → "R" (C major → A minor, relative)', () => {
    expect(nrLabel(0, 'maj', 9, 'min')).toBe('R');
  });

  it('nrLabel(0, "min", 3, "maj") → "R" (C minor → Eb major, relative)', () => {
    expect(nrLabel(0, 'min', 3, 'maj')).toBe('R');
  });

  // L (Leading-tone exchange) cases
  it('nrLabel(0, "maj", 4, "min") → "L" (C major → E minor, leading-tone exchange)', () => {
    expect(nrLabel(0, 'maj', 4, 'min')).toBe('L');
  });

  it('nrLabel(0, "min", 8, "maj") → "L" (C minor → Ab major)', () => {
    expect(nrLabel(0, 'min', 8, 'maj')).toBe('L');
  });

  // null cases (same mode — P/L/R always change mode)
  it('nrLabel(0, "maj", 5, "maj") → null (same mode, no match)', () => {
    expect(nrLabel(0, 'maj', 5, 'maj')).toBeNull();
  });

  it('nrLabel(0, "maj", 7, "maj") → null (same mode)', () => {
    expect(nrLabel(0, 'maj', 7, 'maj')).toBeNull();
  });

  it('nrLabel(0, "min", 9, "min") → null (same mode)', () => {
    expect(nrLabel(0, 'min', 9, 'min')).toBeNull();
  });

  it('nrLabel(0, "maj", 1, "min") → null (different mode but no PLR offset matches)', () => {
    expect(nrLabel(0, 'maj', 1, 'min')).toBeNull();
  });
});
