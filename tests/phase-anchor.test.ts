// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit tests for measureLatencyOffsetMs (pure function, hardware path).
//
// These tests verify the offset math and the `|| 0` guard for absent AudioContext
// properties, without any DOM or audio initialization.

import { describe, it, expect } from 'vitest';
import { measureLatencyOffsetMs } from '../src/state/phase-anchor.js';

describe('measureLatencyOffsetMs', () => {
  it('sums outputLatency and baseLatency, converts to ms', () => {
    // 0.05 s + 0.01 s = 0.06 s = 60 ms.
    // toBeCloseTo (10 decimal places) because IEEE 754 floating-point gives
    // (0.05 + 0.01) * 1000 = 60.00000000000001 rather than exactly 60.
    expect(
      measureLatencyOffsetMs({ outputLatency: 0.05, baseLatency: 0.01 } as AudioContext)
    ).toBeCloseTo(60, 10);
  });

  it('returns 0 when both properties are zero', () => {
    expect(measureLatencyOffsetMs({ outputLatency: 0, baseLatency: 0 } as AudioContext)).toBe(0);
  });

  it('guards absent properties with || 0 (undefined on both)', () => {
    // Some platforms (e.g. older Safari) do not expose outputLatency or baseLatency.
    // The || 0 guards must return 0 rather than NaN.
    expect(
      measureLatencyOffsetMs({
        outputLatency: undefined as unknown as number,
        baseLatency: undefined as unknown as number,
      } as AudioContext)
    ).toBe(0);
  });

  it('handles output-latency-only scenario (e.g. Bluetooth)', () => {
    // Bluetooth commonly adds ~100 ms output latency; baseLatency may be 0.
    expect(measureLatencyOffsetMs({ outputLatency: 0.1, baseLatency: 0 } as AudioContext)).toBe(
      100
    );
  });
});
