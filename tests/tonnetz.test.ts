// SPDX-License-Identifier: AGPL-3.0-only
// Partial prototype parity tests for chords and scales (step 01.2).
// Full tonnetz.ts parity tests (tonnetzPc, computeTonnetzNodes,
// computeTonnetzTriangles, nrLabel) added in step 01.3.
// Golden values produced by running the extracted prototype functions in Node
// via scripts/extract-golden.mjs (prototype lines 697–757).

import { describe, it, expect } from 'vitest';
import { chordPcs, chordVoicing } from '../src/core/theory/chords.js';
import { diatonicLookup } from '../src/core/theory/scales.js';

describe('chordPcs', () => {
  // Golden values: Node-executed from prototype lines 746–748 via scripts/extract-golden.mjs.

  it('chordPcs(0, "maj") → [0, 4, 7] (C major)', () => {
    expect(chordPcs(0, 'maj')).toEqual([0, 4, 7]);
  });

  it('chordPcs(9, "min") → [9, 0, 4] (A minor)', () => {
    expect(chordPcs(9, 'min')).toEqual([9, 0, 4]);
  });
});

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
