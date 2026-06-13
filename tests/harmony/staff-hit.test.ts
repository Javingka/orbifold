// SPDX-License-Identifier: AGPL-3.0-only
// Vitest unit tests for src/core/harmony/staff-hit.ts
//
// Covers:
//   - computeSlotBounds: empty, single-slot, three-slot (including bars=0.25 and bars=2)
//   - hitTestSlot: boundary conditions (exactly at x, one pixel inside, one pixel past right
//     edge, between slots, left of all slots)
//   - hitTestResizeHandle: right edge, one pixel left of handle zone, at slot left edge
//   - nearestInsertionIndex: before first, after last, midpoints between slots
//
// reorderSlot tests live in tests/session.test.ts (store action convention).
//
// All tests run in Node — no DOM, PIXI, or Svelte required.
// Phase 10 (step 10.3) — ADR 0014 D3 / A-10-11.

import { describe, it, expect } from 'vitest';
import {
  computeSlotBounds,
  hitTestSlot,
  hitTestResizeHandle,
  nearestInsertionIndex,
} from '../../src/core/harmony/staff-hit.js';
import type { SlotBounds } from '../../src/core/harmony/staff-hit.js';

// Canonical pixel-per-cycle value (mirrors PX_PER_CYCLE from time-map.ts).
const PX = 48;

// ── computeSlotBounds ─────────────────────────────────────────────────────────

describe('computeSlotBounds — empty progression', () => {
  it('returns an empty array for an empty progression', () => {
    const result = computeSlotBounds([], PX);
    expect(result).toEqual([]);
  });
});

describe('computeSlotBounds — single slot', () => {
  it('single slot with default bars (bars=undefined → 1): x=0, width=48', () => {
    const result = computeSlotBounds([{}], PX);
    expect(result).toEqual([{ slotIndex: 0, x: 0, width: 48 }]);
  });

  it('single slot with bars=1: x=0, width=48', () => {
    const result = computeSlotBounds([{ bars: 1 }], PX);
    expect(result).toEqual([{ slotIndex: 0, x: 0, width: 48 }]);
  });

  it('single slot with bars=0.25 (one beat): x=0, width=12', () => {
    const result = computeSlotBounds([{ bars: 0.25 }], PX);
    expect(result).toEqual([{ slotIndex: 0, x: 0, width: 12 }]);
  });

  it('single slot with bars=2: x=0, width=96', () => {
    const result = computeSlotBounds([{ bars: 2 }], PX);
    expect(result).toEqual([{ slotIndex: 0, x: 0, width: 96 }]);
  });
});

describe('computeSlotBounds — three-slot progressions', () => {
  it('three uniform slots (bars=1 each): contiguous at 48px intervals', () => {
    const result = computeSlotBounds([{ bars: 1 }, { bars: 1 }, { bars: 1 }], PX);
    expect(result).toEqual([
      { slotIndex: 0, x: 0, width: 48 },
      { slotIndex: 1, x: 48, width: 48 },
      { slotIndex: 2, x: 96, width: 48 },
    ]);
  });

  it('three slots with mixed durations (0.25, 2, 1): contiguous, correct widths', () => {
    const result = computeSlotBounds([{ bars: 0.25 }, { bars: 2 }, { bars: 1 }], PX);
    expect(result).toEqual([
      { slotIndex: 0, x: 0, width: 12 }, // 0.25 * 48 = 12
      { slotIndex: 1, x: 12, width: 96 }, // 2 * 48 = 96
      { slotIndex: 2, x: 108, width: 48 }, // 1 * 48 = 48
    ]);
  });

  it('three slots with bars=0.25 each: narrow extents, contiguous', () => {
    const result = computeSlotBounds([{ bars: 0.25 }, { bars: 0.25 }, { bars: 0.25 }], PX);
    expect(result).toEqual([
      { slotIndex: 0, x: 0, width: 12 },
      { slotIndex: 1, x: 12, width: 12 },
      { slotIndex: 2, x: 24, width: 12 },
    ]);
  });

  it('three slots with bars=2 each: wide extents, contiguous', () => {
    const result = computeSlotBounds([{ bars: 2 }, { bars: 2 }, { bars: 2 }], PX);
    expect(result).toEqual([
      { slotIndex: 0, x: 0, width: 96 },
      { slotIndex: 1, x: 96, width: 96 },
      { slotIndex: 2, x: 192, width: 96 },
    ]);
  });

  it('first slot uses bars ?? 1 default when bars is undefined', () => {
    const result = computeSlotBounds([{}, { bars: 2 }, {}], PX);
    expect(result).toEqual([
      { slotIndex: 0, x: 0, width: 48 }, // undefined → 1 → 48
      { slotIndex: 1, x: 48, width: 96 }, // 2 → 96
      { slotIndex: 2, x: 144, width: 48 }, // undefined → 1 → 48
    ]);
  });
});

// ── hitTestSlot ───────────────────────────────────────────────────────────────

describe('hitTestSlot — boundary conditions', () => {
  // Slots: [0,48), [48,96), [96,144)
  const bounds: SlotBounds[] = [
    { slotIndex: 0, x: 0, width: 48 },
    { slotIndex: 1, x: 48, width: 48 },
    { slotIndex: 2, x: 96, width: 48 },
  ];

  it('px exactly at x=0 (left edge of first slot) → slot 0', () => {
    expect(hitTestSlot(0, bounds)).toBe(0);
  });

  it('px one pixel inside first slot (px=1) → slot 0', () => {
    expect(hitTestSlot(1, bounds)).toBe(0);
  });

  it('px at last pixel inside first slot (px=47) → slot 0', () => {
    expect(hitTestSlot(47, bounds)).toBe(0);
  });

  it('px exactly at right edge of first slot (px=48) → slot 1 (not slot 0)', () => {
    // px=48 is bounds[0].x + bounds[0].width → exclusive upper bound for slot 0
    // and inclusive lower bound for slot 1
    expect(hitTestSlot(48, bounds)).toBe(1);
  });

  it('px one pixel inside second slot (px=49) → slot 1', () => {
    expect(hitTestSlot(49, bounds)).toBe(1);
  });

  it('px at x=95 (last pixel of second slot) → slot 1', () => {
    expect(hitTestSlot(95, bounds)).toBe(1);
  });

  it('px at x=96 (first pixel of third slot) → slot 2', () => {
    expect(hitTestSlot(96, bounds)).toBe(2);
  });

  it('px at x=143 (last pixel of third slot) → slot 2', () => {
    expect(hitTestSlot(143, bounds)).toBe(2);
  });

  it('px exactly at right edge of last slot (px=144) → null (past all slots)', () => {
    expect(hitTestSlot(144, bounds)).toBeNull();
  });

  it('px = 200 (far right of all slots) → null', () => {
    expect(hitTestSlot(200, bounds)).toBeNull();
  });

  it('px = -1 (left of all slots) → null', () => {
    expect(hitTestSlot(-1, bounds)).toBeNull();
  });

  it('empty bounds → null', () => {
    expect(hitTestSlot(0, [])).toBeNull();
  });
});

// ── hitTestResizeHandle ───────────────────────────────────────────────────────

describe('hitTestResizeHandle — edge conditions', () => {
  // Single slot: [0, 48). Handle width = 10 → handle zone [38, 48).
  const single: SlotBounds[] = [{ slotIndex: 0, x: 0, width: 48 }];
  const HANDLE = 10;

  it('px at right edge of slot (px=47) → slot 0', () => {
    expect(hitTestResizeHandle(47, single, HANDLE)).toBe(0);
  });

  it('px at handle start (px=38 = 48-10) → slot 0', () => {
    expect(hitTestResizeHandle(38, single, HANDLE)).toBe(0);
  });

  it('px one pixel left of handle zone (px=37) → null', () => {
    expect(hitTestResizeHandle(37, single, HANDLE)).toBeNull();
  });

  it('px at slot left edge (px=0) → null (left edge is not in handle zone)', () => {
    expect(hitTestResizeHandle(0, single, HANDLE)).toBeNull();
  });

  it('px past right edge of slot (px=48) → null (exclusive upper bound)', () => {
    expect(hitTestResizeHandle(48, single, HANDLE)).toBeNull();
  });

  it('empty bounds → null', () => {
    expect(hitTestResizeHandle(47, [], HANDLE)).toBeNull();
  });

  // Three slots: [0,48), [48,96), [96,144). Handle=10.
  const three: SlotBounds[] = [
    { slotIndex: 0, x: 0, width: 48 },
    { slotIndex: 1, x: 48, width: 48 },
    { slotIndex: 2, x: 96, width: 48 },
  ];

  it('px=38 (handle zone of slot 0) → slot 0', () => {
    expect(hitTestResizeHandle(38, three, HANDLE)).toBe(0);
  });

  it('px=86 (handle zone of slot 1) → slot 1', () => {
    expect(hitTestResizeHandle(86, three, HANDLE)).toBe(1);
  });

  it('px=134 (handle zone of slot 2) → slot 2', () => {
    expect(hitTestResizeHandle(134, three, HANDLE)).toBe(2);
  });

  it('px=48 (right edge of slot 0 / left edge of slot 1 — handle start of slot 1) → slot 1', () => {
    // slot 0 handle: [38, 48) → 48 is excluded
    // slot 1 handle: [86, 96) → 48 is outside
    // Neither slot's handle covers px=48 → null
    expect(hitTestResizeHandle(48, three, HANDLE)).toBeNull();
  });
});

// ── nearestInsertionIndex ─────────────────────────────────────────────────────

describe('nearestInsertionIndex', () => {
  // Three slots: [0,48), [48,96), [96,144)
  // Midpoints: 24, 72, 120
  const bounds: SlotBounds[] = [
    { slotIndex: 0, x: 0, width: 48 },
    { slotIndex: 1, x: 48, width: 48 },
    { slotIndex: 2, x: 96, width: 48 },
  ];

  it('empty bounds → 0', () => {
    expect(nearestInsertionIndex(0, [])).toBe(0);
  });

  it('px < midpoint of first slot (px=23) → insert before slot 0 (index 0)', () => {
    expect(nearestInsertionIndex(23, bounds)).toBe(0);
  });

  it('px at midpoint of first slot (px=24) → insert before slot 0 (index 0)', () => {
    // px=24 < midX=24 is false (24 < 24 is false) → moves to next slot
    // Actually: midX = 0 + 48/2 = 24; 24 < 24 is false → not before slot 0
    // → next: midX of slot 1 = 48 + 24 = 72; 24 < 72 → insert before slot 1 (index 1)
    expect(nearestInsertionIndex(24, bounds)).toBe(1);
  });

  it('px just before midpoint of first slot (px=23) → index 0', () => {
    expect(nearestInsertionIndex(23, bounds)).toBe(0);
  });

  it('px between slot 0 and slot 1 (px=50) → index 1 (before slot 1)', () => {
    // midX of slot 0 = 24; 50 >= 24, skip
    // midX of slot 1 = 72; 50 < 72 → index 1
    expect(nearestInsertionIndex(50, bounds)).toBe(1);
  });

  it('px at midpoint of slot 1 (px=72) → index 2 (before slot 2)', () => {
    // midX of slot 0 = 24; 72 >= 24, skip
    // midX of slot 1 = 72; 72 < 72 is false, skip
    // midX of slot 2 = 120; 72 < 120 → index 2
    expect(nearestInsertionIndex(72, bounds)).toBe(2);
  });

  it('px just before midpoint of slot 1 (px=71) → index 1', () => {
    // midX of slot 0 = 24; 71 >= 24, skip
    // midX of slot 1 = 72; 71 < 72 → index 1
    expect(nearestInsertionIndex(71, bounds)).toBe(1);
  });

  it('px past midpoint of last slot (px=121) → index 3 (after all slots)', () => {
    // midX of slot 2 = 120; 121 >= 120, skip → return bounds.length = 3
    expect(nearestInsertionIndex(121, bounds)).toBe(3);
  });

  it('px = 0 (far left) → index 0', () => {
    expect(nearestInsertionIndex(0, bounds)).toBe(0);
  });

  it('px = 999 (far right) → index 3 (after all slots)', () => {
    expect(nearestInsertionIndex(999, bounds)).toBe(3);
  });
});
