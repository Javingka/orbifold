// SPDX-License-Identifier: AGPL-3.0-only
// Vitest unit tests for cycleToPosition in src/core/harmony/time-map.ts.
// Tests cover linear mode (pixel x), orbital mode (angle in radians),
// the PX_PER_CYCLE constant, and the totalCycles=0 NaN guard.

import { describe, it, expect } from 'vitest';
import { cycleToPosition, PX_PER_CYCLE } from '../../src/core/harmony/time-map.js';

describe('PX_PER_CYCLE constant', () => {
  it('equals 48 (matches ProgressionStrip grid — ADR 0011 Consequence 3)', () => {
    expect(PX_PER_CYCLE).toBe(48);
  });
});

describe('cycleToPosition — linear mode', () => {
  it('cycleIndex=0 yields x=0', () => {
    expect(cycleToPosition(0, 4, 'linear')).toEqual({ mode: 'linear', x: 0 });
  });

  it('cycleIndex=1 yields x=48 (one cycle = PX_PER_CYCLE pixels)', () => {
    expect(cycleToPosition(1, 4, 'linear')).toEqual({ mode: 'linear', x: 48 });
  });

  it('cycleIndex=2 yields x=96', () => {
    expect(cycleToPosition(2, 4, 'linear')).toEqual({ mode: 'linear', x: 96 });
  });

  it('cycleIndex=0.5 yields x=24 (fractional cycle for sub-bar notes)', () => {
    expect(cycleToPosition(0.5, 4, 'linear')).toEqual({ mode: 'linear', x: 24 });
  });

  it('mode field is "linear"', () => {
    expect(cycleToPosition(3, 8, 'linear').mode).toBe('linear');
  });

  it('totalCycles is unused in linear mode — result identical regardless of totalCycles value', () => {
    expect(cycleToPosition(1, 0, 'linear')).toEqual(cycleToPosition(1, 99, 'linear'));
  });
});

describe('cycleToPosition — orbital mode', () => {
  it('cycleIndex=0 totalCycles=4 yields angle=-pi/2 (top of orbit, 12-oclock)', () => {
    expect(cycleToPosition(0, 4, 'orbital')).toEqual({
      mode: 'orbital',
      angle: -Math.PI / 2,
    });
  });

  it('cycleIndex=2 totalCycles=4 yields angle=pi/2 (halfway = 3-oclock)', () => {
    // (2/4)*2pi - pi/2 = pi - pi/2 = pi/2
    expect(cycleToPosition(2, 4, 'orbital')).toEqual({
      mode: 'orbital',
      angle: Math.PI / 2,
    });
  });

  it('cycleIndex=4 totalCycles=4 yields angle=3pi/2 (full loop, expressed as 2pi-pi/2)', () => {
    // (4/4)*2pi - pi/2 = 2pi - pi/2 = 3pi/2
    expect(cycleToPosition(4, 4, 'orbital')).toEqual({
      mode: 'orbital',
      angle: (3 * Math.PI) / 2,
    });
  });

  it('totalCycles=0 yields angle=-pi/2 and not NaN (12-oclock default guard)', () => {
    const result = cycleToPosition(1, 0, 'orbital');
    expect(result.mode).toBe('orbital');
    expect((result as { mode: 'orbital'; angle: number }).angle).toBe(-Math.PI / 2);
    expect(Number.isNaN((result as { mode: 'orbital'; angle: number }).angle)).toBe(false);
  });

  it('mode field is "orbital"', () => {
    expect(cycleToPosition(1, 4, 'orbital').mode).toBe('orbital');
  });

  it('cycleIndex=1 totalCycles=4 yields angle=0 (one-quarter of the loop = east/3-oclock)', () => {
    // (1/4)*2pi - pi/2 = pi/2 - pi/2 = 0
    // 0 rad = east (3-oclock in unit-circle terms). With the -pi/2 offset, the orbit
    // starts at the top (-pi/2), goes clockwise: top -> east (0) -> south (pi/2) -> ...
    expect(cycleToPosition(1, 4, 'orbital')).toEqual({
      mode: 'orbital',
      angle: 0,
    });
  });
});
