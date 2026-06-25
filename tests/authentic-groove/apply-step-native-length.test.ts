// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit tests for native step-length in applyRhythmSpec (Phase 07).
//
// Phase 07 step 07.1 — authentic-groove initiative.
//
// Covers acceptance IDs:
//   A-07-01 (partial): steps variant — 12-element input → steps.length === 12
//   A-07-02 (partial): euclid variant — E(6,12,0) → steps.length === 12; 6 onsets
//   A-07-03 (partial): steps variant — cueca cp binary → steps.length === 12; correct token output
//   A-07-04 (partial): backward-compat — E(4,16,0) → steps.length === 16
//   A-07-04 (partial): backward-compat — 16-element steps input → steps.length === 16
//   A-07-05 (partial): agent backward-compat — default n=8 → steps.length === 8
//
// Seam invariant (AG-D1): no genre name referenced in this file outside of test descriptions.
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { sessionStore, DEFAULT_SESSION_STATE } from '../../src/state/session.js';
import { applyRhythmSpec } from '../../src/agent/apply.js';
import { rhythmLayerToStrudelLine } from '../../src/core/rhythm/layers.js';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
});

// ── A-07-01: steps variant — 12-element input → steps.length === 12 ───────────

describe('A-07-01: steps variant — 12-element input preserves native length', () => {
  it('steps variant: 12-element input → steps.length === 12', () => {
    // cueca bd binary '101000101000' — 12 steps
    const steps12 = [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0];
    applyRhythmSpec({ layers: [{ sound: 'bd', steps: steps12 }] });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers).toHaveLength(1);
    expect(layers[0].steps.length).toBe(12);
  });

  it('steps variant: 12-element cueca bd → correct step values (no padding zeros)', () => {
    const steps12 = [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0];
    applyRhythmSpec({ layers: [{ sound: 'bd', steps: steps12 }] });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers[0].steps).toEqual([1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0]);
  });
});

// ── A-07-02: euclid variant — E(6,12,0) → steps.length === 12 ────────────────

describe('A-07-02: euclid variant — E(6,12,0) → steps.length === 12 with 6 onsets', () => {
  it('euclid variant: E(6,12,0) → steps.length === 12', () => {
    applyRhythmSpec({ layers: [{ sound: 'hh', euclid: { k: 6, n: 12, rot: 0 } }] });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers).toHaveLength(1);
    expect(layers[0].steps.length).toBe(12);
  });

  it('euclid variant: E(6,12,0) → exactly 6 onsets present (sum of steps === 6)', () => {
    applyRhythmSpec({ layers: [{ sound: 'hh', euclid: { k: 6, n: 12, rot: 0 } }] });

    const layers = get(sessionStore).rhythm.layers;
    const onsets = layers[0].steps.reduce((acc, v) => acc + v, 0);
    expect(onsets).toBe(6);
  });

  it('euclid variant: E(6,12,0) → alternating 101010101010 pattern', () => {
    applyRhythmSpec({ layers: [{ sound: 'hh', euclid: { k: 6, n: 12, rot: 0 } }] });

    const layers = get(sessionStore).rhythm.layers;
    // bjorklund(6,12) = 101010101010 (evenly spaced alternating hits)
    expect(layers[0].steps).toEqual([1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]);
  });
});

// ── A-07-03: steps variant — cueca cp binary → 12 tokens in codegen ──────────

describe('A-07-03: steps variant — cueca cp binary → steps.length === 12; 12-token codegen', () => {
  it('steps variant: cueca cp binary → steps.length === 12', () => {
    // cueca cp binary '000010000010' — onsets at 4 and 10
    const cpSteps = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
    applyRhythmSpec({ layers: [{ sound: 'cp', steps: cpSteps }] });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers[0].steps.length).toBe(12);
  });

  it('steps variant: cueca cp binary → correct token output (12 tokens, no trailing padding)', () => {
    const cpSteps = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
    applyRhythmSpec({ layers: [{ sound: 'cp', steps: cpSteps }] });

    const layers = get(sessionStore).rhythm.layers;
    const line = rhythmLayerToStrudelLine(layers[0]);
    // Expect exactly 12 tokens, no trailing ~~ from 16-step padding
    expect(line).toBe('  s("~ ~ ~ ~ cp ~ ~ ~ ~ ~ cp ~")');
  });
});

// ── A-07-04: backward-compat — 16-step euclid and steps patterns unchanged ────

describe('A-07-04 (backward-compat): 16-step patterns → steps.length === 16', () => {
  it('euclid variant: E(4,16,0) → steps.length === 16', () => {
    applyRhythmSpec({ layers: [{ sound: 'bd', euclid: { k: 4, n: 16, rot: 0 } }] });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers).toHaveLength(1);
    expect(layers[0].steps.length).toBe(16);
  });

  it('euclid variant: E(4,16,0) → exactly 4 onsets in 16 steps', () => {
    applyRhythmSpec({ layers: [{ sound: 'bd', euclid: { k: 4, n: 16, rot: 0 } }] });

    const layers = get(sessionStore).rhythm.layers;
    const onsets = layers[0].steps.reduce((acc, v) => acc + v, 0);
    expect(onsets).toBe(4);
  });

  it('steps variant: 16-element input → steps.length === 16', () => {
    const steps16 = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    applyRhythmSpec({ layers: [{ sound: 'bd', steps: steps16 }] });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers).toHaveLength(1);
    expect(layers[0].steps.length).toBe(16);
  });

  it('steps variant: 16-element input → step values preserved', () => {
    const steps16 = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    applyRhythmSpec({ layers: [{ sound: 'bd', steps: steps16 }] });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers[0].steps).toEqual(steps16);
  });
});

// ── A-07-05: agent backward-compat — default n=8 → steps.length === 8 ─────────

describe('A-07-05 (agent backward-compat): euclid with n=8 → steps.length === 8', () => {
  it('euclid variant: E(3,8,0) → steps.length === 8 (native length of bjorklund(3,8))', () => {
    applyRhythmSpec({ layers: [{ sound: 'hh', euclid: { k: 3, n: 8, rot: 0 } }] });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers).toHaveLength(1);
    expect(layers[0].steps.length).toBe(8);
  });

  it('euclid variant: E(3,8,0) → exactly 3 onsets in 8 steps', () => {
    applyRhythmSpec({ layers: [{ sound: 'hh', euclid: { k: 3, n: 8, rot: 0 } }] });

    const layers = get(sessionStore).rhythm.layers;
    const onsets = layers[0].steps.reduce((acc, v) => acc + v, 0);
    expect(onsets).toBe(3);
  });

  it('euclid variant: E(3,8,0) → tresillo pattern 10010010', () => {
    // bjorklund(3,8) = [1,0,0,1,0,0,1,0] — tresillo
    applyRhythmSpec({ layers: [{ sound: 'hh', euclid: { k: 3, n: 8, rot: 0 } }] });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers[0].steps).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
  });

  it('euclid variant: agent-generated 16-step (k=4, n=16) → steps.length === 16 (backward-compat)', () => {
    // Confirms agent output at n=16 continues to work after Phase 07 fix.
    applyRhythmSpec({ layers: [{ sound: 'hh', euclid: { k: 4, n: 16, rot: 0 } }] });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers[0].steps.length).toBe(16);
  });
});
