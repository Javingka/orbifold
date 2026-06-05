// SPDX-License-Identifier: AGPL-3.0-only
// Prototype parity tests for circDelta and minimalVoiceLeading.
// Golden values produced by running the extracted prototype functions in Node
// via scripts/extract-golden.mjs (prototype lines 777–789).

import { describe, it, expect } from 'vitest';
import { circDelta, minimalVoiceLeading } from '../src/core/theory/voice-leading.js';

describe('circDelta', () => {
  // Golden values: Node-executed from prototype lines 777–779 via scripts/extract-golden.mjs.
  // Formula: ((b - a + 18) % 12) - 6

  it('circDelta(0, 7) → -5', () => {
    // ((7-0+18)%12)-6 = (25%12)-6 = 1-6 = -5
    expect(circDelta(0, 7)).toBe(-5);
  });

  it('circDelta(7, 0) → 5', () => {
    // ((0-7+18)%12)-6 = (11%12)-6 = 11-6 = 5
    expect(circDelta(7, 0)).toBe(5);
  });

  it('circDelta(0, 6) → -6', () => {
    // ((6-0+18)%12)-6 = (24%12)-6 = 0-6 = -6
    expect(circDelta(0, 6)).toBe(-6);
  });

  it('result is always in [-6, 6)', () => {
    for (let a = 0; a < 12; a++) {
      for (let b = 0; b < 12; b++) {
        const d = circDelta(a, b);
        expect(d).toBeGreaterThanOrEqual(-6);
        expect(d).toBeLessThan(6);
      }
    }
  });
});

describe('minimalVoiceLeading', () => {
  // All golden values Node-executed from prototype lines 781–789 via scripts/extract-golden.mjs.

  it('C major → C minor (P transform): size=1, moves contain exactly one -1 and two 0s', () => {
    // Golden: {"moves":[0,-1,0],"size":1,"perm":[0,1,2]}
    const result = minimalVoiceLeading([0, 4, 7], [0, 3, 7]);
    expect(result.size).toBe(1);
    // Assert multiset: one -1 and two 0s, regardless of order
    const sorted = [...result.moves].sort((a, b) => a - b);
    expect(sorted).toEqual([-1, 0, 0]);
    // Assert exact result matching prototype output
    expect(result.moves).toEqual([0, -1, 0]);
    expect(result.perm).toEqual([0, 1, 2]);
  });

  it('C major → A minor (R transform): size=2, perm=[1,2,0]', () => {
    // Golden: {"moves":[0,0,2],"size":2,"perm":[1,2,0]}
    const result = minimalVoiceLeading([0, 4, 7], [9, 0, 4]);
    expect(result.size).toBe(2);
    expect(result.moves).toEqual([0, 0, 2]);
    expect(result.perm).toEqual([1, 2, 0]);
  });

  it('C major → F major (subdominant): size=3, perm=[2,0,1]', () => {
    // Golden: {"moves":[0,1,2],"size":3,"perm":[2,0,1]}
    const result = minimalVoiceLeading([0, 4, 7], [5, 9, 0]);
    expect(result.size).toBe(3);
    expect(result.moves).toEqual([0, 1, 2]);
    expect(result.perm).toEqual([2, 0, 1]);
  });

  it('returns a result with moves of length 3', () => {
    const result = minimalVoiceLeading([0, 4, 7], [0, 3, 7]);
    expect(result.moves).toHaveLength(3);
    expect(result.perm).toHaveLength(3);
  });
});
