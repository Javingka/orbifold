// SPDX-License-Identifier: AGPL-3.0-only
// Prototype-parity tests for euclid.ts and layers.ts (Phase 01 step 01.4).
// All golden values produced by running scripts/extract-golden-01-4.mjs —
// a Node script that executes the prototype functions extracted from
// reference/orbifold.html lines 796–836.

import { describe, it, expect } from 'vitest';
import { bjorklund, rotate, stepsFromHits, RSTEPS } from '../src/core/rhythm/euclid';
import {
  layerAudible,
  rhythmLayerToStrudelLine,
  type RhythmLayer,
} from '../src/core/rhythm/layers';

// ── bjorklund ──────────────────────────────────────────────────────────────

describe('bjorklund', () => {
  // Golden: Node-executed from prototype lines 796–811

  it('E(0,8) → 8 zeros', () => {
    expect(bjorklund(0, 8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('E(8,8) → 8 ones', () => {
    expect(bjorklund(8, 8)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('E(3,8) → tresillo [1,0,0,1,0,0,1,0]', () => {
    // Golden: Node-executed. Phase file illustrative value confirmed.
    expect(bjorklund(3, 8)).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
  });

  it('E(5,8) → cinquillo [1,0,1,1,0,1,1,0]', () => {
    // Golden: Node-executed. Phase file did not state the full array; value here
    // is the byte-exact output from the prototype algorithm.
    expect(bjorklund(5, 8)).toEqual([1, 0, 1, 1, 0, 1, 1, 0]);
  });

  it('E(2,5) → 2:5 pattern [1,0,1,0,0]', () => {
    // Golden: Node-executed.
    expect(bjorklund(2, 5)).toEqual([1, 0, 1, 0, 0]);
  });

  it('E(4,4) → [1,1,1,1]', () => {
    expect(bjorklund(4, 4)).toEqual([1, 1, 1, 1]);
  });

  it('E(1,4) → [1,0,0,0]', () => {
    expect(bjorklund(1, 4)).toEqual([1, 0, 0, 0]);
  });

  it('result length is always n', () => {
    for (const [k, n] of [
      [0, 8],
      [8, 8],
      [3, 8],
      [5, 8],
      [2, 5],
      [4, 4],
      [1, 4],
      [7, 16],
    ]) {
      expect(bjorklund(k, n)).toHaveLength(n);
    }
  });
});

// ── rotate ─────────────────────────────────────────────────────────────────

describe('rotate', () => {
  // Golden: Node-executed from prototype line 812.
  const tresillo = [1, 0, 0, 1, 0, 0, 1, 0] as const;

  it('rotate by 0 → identity', () => {
    expect(rotate(tresillo, 0)).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
  });

  it('rotate by 2 → [0,1,0,0,1,0,1,0]', () => {
    // Golden: Node-executed. Phase file's illustrative value [0,1,0,0,1,0,0,1]
    // was INCORRECT — the prototype's left-rotate by 2 gives [0,1,0,0,1,0,1,0].
    // Correction documented in step 01.4 handoff.
    expect(rotate(tresillo, 2)).toEqual([0, 1, 0, 0, 1, 0, 1, 0]);
  });

  it('rotate by array length → identity (full cycle)', () => {
    expect(rotate(tresillo, 8)).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
  });

  it('rotate preserves array length', () => {
    expect(rotate(tresillo, 3)).toHaveLength(8);
  });
});

// ── stepsFromHits ──────────────────────────────────────────────────────────

describe('stepsFromHits', () => {
  // Golden: Node-executed from prototype line 813 (with RSTEPS = 16).

  it('4-on-the-floor: stepsFromHits([0,4,8,12])', () => {
    expect(stepsFromHits([0, 4, 8, 12])).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
  });

  it('snare at 4 and 12: stepsFromHits([4,12])', () => {
    expect(stepsFromHits([4, 12])).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]);
  });

  it('default totalSteps is RSTEPS (16)', () => {
    expect(stepsFromHits([0])).toHaveLength(RSTEPS);
  });

  it('empty hits → all zeros', () => {
    expect(stepsFromHits([])).toEqual(new Array(16).fill(0));
  });

  it('explicit totalSteps parameter', () => {
    expect(stepsFromHits([0, 4], 8)).toEqual([1, 0, 0, 0, 1, 0, 0, 0]);
  });
});

// ── layerAudible ────────────────────────────────────────────────────────────

describe('layerAudible', () => {
  // Golden: Node-executed from prototype lines 820–823.

  it('muted layer → false', () => {
    const layer: RhythmLayer = { sound: 'bd', steps: [], muted: true };
    const all: RhythmLayer[] = [layer];
    expect(layerAudible(layer, all)).toBe(false);
  });

  it('solo layer with itself + non-solo layer → true', () => {
    // BD is solo; BD is audible.
    const solo: RhythmLayer = { sound: 'bd', steps: [], solo: true };
    const nonSolo: RhythmLayer = { sound: 'sd', steps: [] };
    const all: RhythmLayer[] = [solo, nonSolo];
    expect(layerAudible(solo, all)).toBe(true);
  });

  it('non-solo layer when another is solo → false', () => {
    const solo: RhythmLayer = { sound: 'bd', steps: [], solo: true };
    const nonSolo: RhythmLayer = { sound: 'sd', steps: [] };
    const all: RhythmLayer[] = [solo, nonSolo];
    expect(layerAudible(nonSolo, all)).toBe(false);
  });

  it('normal layer (no mute, no solo in array) → true', () => {
    const layer: RhythmLayer = { sound: 'hh', steps: [] };
    const all: RhythmLayer[] = [{ sound: 'bd', steps: [] }, layer];
    expect(layerAudible(layer, all)).toBe(true);
  });
});

// ── rhythmLayerToStrudelLine ────────────────────────────────────────────────

describe('rhythmLayerToStrudelLine', () => {
  // Golden: Node-executed from prototype lines 826–830.

  it('euclidean layer → s("hh(5,8)")', () => {
    const layer: RhythmLayer = { sound: 'hh', euclid: '5,8', steps: [] };
    expect(rhythmLayerToStrudelLine(layer)).toBe('  s("hh(5,8)")');
  });

  it('explicit-steps layer with two hits → correct token string', () => {
    // steps = [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0] → bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~
    const steps = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
    const layer: RhythmLayer = { sound: 'bd', steps };
    expect(rhythmLayerToStrudelLine(layer)).toBe('  s("bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~")');
  });

  it('all-zero steps → all rests', () => {
    const layer: RhythmLayer = { sound: 'sd', steps: new Array(8).fill(0) };
    expect(rhythmLayerToStrudelLine(layer)).toBe('  s("~ ~ ~ ~ ~ ~ ~ ~")');
  });
});
