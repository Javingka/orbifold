// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — staff-hit: pure hit-test geometry for the Pentagrama staff editor.
//
// All functions are pure TypeScript with no DOM, PIXI, or Svelte imports.
// This satisfies the src/core/** invariant (ADR 0011 Consequence 1, ADR 0014 D3).
//
// Exports:
//   SlotBounds            — per-slot pixel extent descriptor
//   computeSlotBounds     — progression → SlotBounds[] (ordered, contiguous)
//   hitTestSlot           — pixel x → slotIndex | null
//   hitTestResizeHandle   — pixel x → slotIndex | null (right-edge zone)
//   nearestInsertionIndex — pixel x → insertion index (used by time-move gesture, step 10.7)
//
// Phase 10 (step 10.3) — ADR 0014 D3.

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Pixel extent of a single progression slot on the staff canvas.
 *
 * Slots are contiguous (no pixel gap between consecutive slots).
 * `width = slot.bars ?? 1` × `pxPerCycle`.
 */
export interface SlotBounds {
  /** Zero-based index into the progression array. */
  slotIndex: number;
  /** Pixel x-coordinate of the slot's left edge. */
  x: number;
  /** Pixel width of the slot — `bars * pxPerCycle`. */
  width: number;
}

// ── computeSlotBounds ─────────────────────────────────────────────────────────

/**
 * Compute the pixel bounds for every slot in the progression.
 *
 * Slots are laid out contiguously from x = 0. Each slot's width is
 * `(slot.bars ?? 1) * pxPerCycle`. The returned array is in progression order.
 *
 * No DOM, PIXI, or Svelte imports — pure TypeScript, unit-testable in Node.
 *
 * @param progression - Read-only array of progression slots (only the `bars` field is used).
 * @param pxPerCycle  - Pixels per Strudel cycle (e.g. 48 = PX_PER_CYCLE from time-map.ts).
 * @returns One `SlotBounds` per slot in progression order.
 */
export function computeSlotBounds(
  progression: ReadonlyArray<{ bars?: number }>,
  pxPerCycle: number
): SlotBounds[] {
  const bounds: SlotBounds[] = [];
  let cursorX = 0;
  for (let i = 0; i < progression.length; i++) {
    const bars = progression[i].bars ?? 1;
    const width = bars * pxPerCycle;
    bounds.push({ slotIndex: i, x: cursorX, width });
    cursorX += width;
  }
  return bounds;
}

// ── hitTestSlot ───────────────────────────────────────────────────────────────

/**
 * Return the `slotIndex` of the slot whose pixel extent contains `px`.
 *
 * A pixel at exactly `bounds[i].x` is inside slot `i`.
 * A pixel at exactly `bounds[i].x + bounds[i].width` is NOT inside slot `i`
 * (it would be the first pixel of the next slot, or past the last slot).
 *
 * Returns `null` if `px` is outside all slots (left of the first slot,
 * right of the last slot, or the bounds array is empty).
 *
 * @param px     - Horizontal pixel coordinate to test.
 * @param bounds - Slot bounds array produced by `computeSlotBounds`.
 * @returns `slotIndex` of the matching slot, or `null`.
 */
export function hitTestSlot(px: number, bounds: SlotBounds[]): number | null {
  for (const b of bounds) {
    if (px >= b.x && px < b.x + b.width) {
      return b.slotIndex;
    }
  }
  return null;
}

// ── hitTestResizeHandle ───────────────────────────────────────────────────────

/**
 * Return the `slotIndex` of the slot whose right-edge resize handle contains `px`.
 *
 * The resize handle zone is the rightmost `handleWidth` pixels of a slot:
 * `px >= bounds[i].x + bounds[i].width - handleWidth`.
 *
 * To avoid ambiguity at the boundary shared by adjacent slots, the test favours
 * the LEFT slot (i.e., when `px` falls in both the resize zone of slot `i` and
 * the body of slot `i+1`, slot `i` is returned). The loop iterates in order and
 * returns the first match — which is the earlier slot, consistent with the
 * "favour left" rule.
 *
 * Returns `null` if no slot's handle zone contains `px`.
 *
 * @param px          - Horizontal pixel coordinate to test.
 * @param bounds      - Slot bounds array produced by `computeSlotBounds`.
 * @param handleWidth - Width of the resize handle zone in pixels (e.g. 10).
 * @returns `slotIndex` of the matching slot's handle, or `null`.
 */
export function hitTestResizeHandle(
  px: number,
  bounds: SlotBounds[],
  handleWidth: number
): number | null {
  for (const b of bounds) {
    const handleStart = b.x + b.width - handleWidth;
    if (px >= handleStart && px < b.x + b.width) {
      return b.slotIndex;
    }
  }
  return null;
}

// ── nearestInsertionIndex ─────────────────────────────────────────────────────

/**
 * Return the insertion index closest to pixel position `px`.
 *
 * Used by the time-move gesture (step 10.7) to compute the target position when
 * the user drops a dragged slot.
 *
 * The insertion index is the index at which inserting a new element would place
 * it nearest to `px`:
 * - Index `0` means "before the first slot".
 * - Index `bounds.length` means "after the last slot".
 * - Otherwise, the result is the index of the first slot whose centre x exceeds
 *   `px` — i.e., we compare `px` against each slot's mid-point and return the
 *   first index where the gap would be closest.
 *
 * Algorithm: scan slots in order; the insertion point is between slot `i-1` and
 * slot `i` when `px` is less than the midpoint of slot `i`
 * (`bounds[i].x + bounds[i].width / 2`).
 *
 * Result is clamped to `[0, bounds.length]`.
 *
 * @param px     - Horizontal pixel coordinate (drag position).
 * @param bounds - Slot bounds array produced by `computeSlotBounds`.
 * @returns Insertion index in `[0, bounds.length]`.
 */
export function nearestInsertionIndex(px: number, bounds: SlotBounds[]): number {
  if (bounds.length === 0) return 0;
  for (let i = 0; i < bounds.length; i++) {
    const midX = bounds[i].x + bounds[i].width / 2;
    if (px < midX) {
      return i;
    }
  }
  return bounds.length;
}
