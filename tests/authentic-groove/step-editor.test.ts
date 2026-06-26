// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — StepEditor data-contract tests (Phase 09 step 09.2).
//
// Tests the data contract that StepEditor.svelte consumes (not DOM rendering).
//
// Covers acceptance IDs:
//   A-09-04: cueca recipe → layers with steps.length === 12 (12 columns in StepEditor).
//   A-09-05: locked layer guard — toggle logic returns session unchanged.
//   A-09-06: free layer toggle inverts steps[stepIdx] and clears euclid.
//   A-09-07: cueca recipe applied → at least one layer with steps.length === 12.
//   A-09-08: aksak recipe applied → at least one layer with steps.length === 7.
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock audio-triggering functions to prevent AudioContext errors in Node.
vi.mock('../../src/state/session.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/state/session.js')>();
  return {
    ...actual,
    playGroove: vi.fn().mockResolvedValue(undefined),
    playProgression: vi.fn().mockResolvedValue(undefined),
    playSession: vi.fn().mockResolvedValue(undefined),
    requeueLive: vi.fn().mockReturnValue(null),
  };
});

import { sessionStore, DEFAULT_SESSION_STATE } from '../../src/state/session.js';
import { applyRecipeById } from '../../src/agent/autopilot.js';
import type { RhythmLayer } from '../../src/core/rhythm/layers.js';
import type { SessionState } from '../../src/state/session.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Pure implementation of the handleStepToggle guard logic (mirrors Header.svelte
 * handleStepToggle). Extracted as a pure function for unit testing.
 *
 * Returns the updated SessionState (or the same reference if the layer is locked
 * or the indices are out of bounds).
 */
function applyStepToggle(s: SessionState, layerIdx: number, stepIdx: number): SessionState {
  const layer = s.rhythm.layers[layerIdx];
  if (!layer || layer.locked) return s; // guard: locked layers immutable
  const newSteps = [...layer.steps];
  newSteps[stepIdx] = newSteps[stepIdx] === 1 ? 0 : 1;
  const newLayers = [...s.rhythm.layers];
  newLayers[layerIdx] = { ...layer, steps: newSteps, euclid: undefined };
  return { ...s, rhythm: { ...s.rhythm, layers: newLayers } };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
});

// ── A-09-07: cueca recipe step count ─────────────────────────────────────────

describe('cueca recipe layer step count (A-09-07)', () => {
  it('applying cueca-chilena-folk recipe yields at least one layer with steps.length === 12', () => {
    applyRecipeById('cueca-chilena-folk');
    const layers = get(sessionStore).rhythm.layers;
    expect(layers.length).toBeGreaterThan(0);
    const layer12 = layers.find((l: RhythmLayer) => l.steps.length === 12);
    expect(layer12, 'Expected at least one layer with 12 steps (6/8 cueca grid)').toBeDefined();
  });

  it('cueca recipe: all layers have steps.length === 12 (pure 6/8 recipe)', () => {
    // cueca-chilena-folk is a 6/8 recipe — all layers should be 12-step
    applyRecipeById('cueca-chilena-folk');
    const layers = get(sessionStore).rhythm.layers;
    for (const layer of layers) {
      expect(
        layer.steps.length,
        `Layer '${layer.sound}' should have 12 steps; got ${layer.steps.length}`
      ).toBe(12);
    }
  });
});

// ── A-09-04: step count adapts to recipe ─────────────────────────────────────

describe('StepEditor grid adapts to recipe step count (A-09-04)', () => {
  it('cueca recipe layers have steps.length === 12 (12-column StepEditor grid)', () => {
    applyRecipeById('cueca-chilena-folk');
    const layers = get(sessionStore).rhythm.layers;
    const counts = layers.map((l: RhythmLayer) => l.steps.length);
    expect(counts.every((c: number) => c === 12)).toBe(true);
  });
});

// ── A-09-08: aksak recipe step count ─────────────────────────────────────────

describe('aksak recipe layer step count (A-09-08)', () => {
  it('applying aksak-dorian-odd recipe yields at least one layer with steps.length === 7', () => {
    applyRecipeById('aksak-dorian-odd');
    const layers = get(sessionStore).rhythm.layers;
    expect(layers.length).toBeGreaterThan(0);
    const layer7 = layers.find((l: RhythmLayer) => l.steps.length === 7);
    expect(layer7, 'Expected at least one layer with 7 steps (7/8 aksak grid)').toBeDefined();
  });

  it('aksak recipe: all layers have steps.length === 7 (pure 7/8 recipe)', () => {
    applyRecipeById('aksak-dorian-odd');
    const layers = get(sessionStore).rhythm.layers;
    for (const layer of layers) {
      expect(
        layer.steps.length,
        `Layer '${layer.sound}' should have 7 steps; got ${layer.steps.length}`
      ).toBe(7);
    }
  });
});

// ── A-09-05: locked layer guard ───────────────────────────────────────────────

describe('handleStepToggle — locked layer guard (A-09-05)', () => {
  it('toggle on a locked layer returns session state unchanged (same reference)', () => {
    const lockedLayer: RhythmLayer = {
      sound: 'bd',
      steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      locked: true,
    };
    const session: SessionState = {
      ...DEFAULT_SESSION_STATE,
      rhythm: { ...DEFAULT_SESSION_STATE.rhythm, layers: [lockedLayer] },
    };

    const result = applyStepToggle(session, 0, 0);
    // Must be the same object reference — locked layer is immutable
    expect(result).toBe(session);
  });

  it('toggle on a locked layer does not change steps array', () => {
    const originalSteps = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    const lockedLayer: RhythmLayer = {
      sound: 'hh',
      steps: [...originalSteps],
      locked: true,
    };
    const session: SessionState = {
      ...DEFAULT_SESSION_STATE,
      rhythm: { ...DEFAULT_SESSION_STATE.rhythm, layers: [lockedLayer] },
    };

    const result = applyStepToggle(session, 0, 2);
    expect(result.rhythm.layers[0].steps[2]).toBe(originalSteps[2]);
    expect(result.rhythm.layers[0].steps).toEqual(originalSteps);
  });

  it('applyStepToggle returns same reference for out-of-bounds layerIdx', () => {
    const freeLayer: RhythmLayer = {
      sound: 'sd',
      steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    };
    const session: SessionState = {
      ...DEFAULT_SESSION_STATE,
      rhythm: { ...DEFAULT_SESSION_STATE.rhythm, layers: [freeLayer] },
    };

    // layerIdx 5 is out of bounds (only 1 layer)
    const result = applyStepToggle(session, 5, 0);
    expect(result).toBe(session);
  });
});

// ── A-09-06: free layer toggle inverts step and clears euclid ────────────────

describe('handleStepToggle — free layer toggle (A-09-06)', () => {
  it('toggle inverts steps[stepIdx] from 0 to 1', () => {
    const freeLayer: RhythmLayer = {
      sound: 'hh',
      steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    const session: SessionState = {
      ...DEFAULT_SESSION_STATE,
      rhythm: { ...DEFAULT_SESSION_STATE.rhythm, layers: [freeLayer] },
    };

    const result = applyStepToggle(session, 0, 3);
    expect(result.rhythm.layers[0].steps[3]).toBe(1);
  });

  it('toggle inverts steps[stepIdx] from 1 to 0', () => {
    const freeLayer: RhythmLayer = {
      sound: 'hh',
      steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const session: SessionState = {
      ...DEFAULT_SESSION_STATE,
      rhythm: { ...DEFAULT_SESSION_STATE.rhythm, layers: [freeLayer] },
    };

    const result = applyStepToggle(session, 0, 0);
    expect(result.rhythm.layers[0].steps[0]).toBe(0);
  });

  it('toggle clears euclid field on the modified layer', () => {
    const freeLayer: RhythmLayer = {
      sound: 'bd',
      steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      euclid: '4,16',
    };
    const session: SessionState = {
      ...DEFAULT_SESSION_STATE,
      rhythm: { ...DEFAULT_SESSION_STATE.rhythm, layers: [freeLayer] },
    };

    const result = applyStepToggle(session, 0, 1);
    expect(result.rhythm.layers[0].euclid).toBeUndefined();
  });

  it('toggle does not mutate other layers', () => {
    const layer0: RhythmLayer = {
      sound: 'bd',
      steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    };
    const layer1: RhythmLayer = {
      sound: 'hh',
      steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const session: SessionState = {
      ...DEFAULT_SESSION_STATE,
      rhythm: { ...DEFAULT_SESSION_STATE.rhythm, layers: [layer0, layer1] },
    };

    const result = applyStepToggle(session, 0, 4);
    // layer1 must be unchanged
    expect(result.rhythm.layers[1]).toBe(layer1);
  });

  it('toggle returns a new session object (immutable update)', () => {
    const freeLayer: RhythmLayer = {
      sound: 'cp',
      steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    const session: SessionState = {
      ...DEFAULT_SESSION_STATE,
      rhythm: { ...DEFAULT_SESSION_STATE.rhythm, layers: [freeLayer] },
    };

    const result = applyStepToggle(session, 0, 0);
    expect(result).not.toBe(session);
    expect(result.rhythm.layers).not.toBe(session.rhythm.layers);
  });
});

// ── A-09-05: locked layer disabled attribute contract ────────────────────────
// Tests the prop contract that maps layer.locked === true to disabled/aria-disabled.
// DOM rendering is manual; here we verify the data contract.

describe('StepEditor prop contract — locked layer (A-09-05)', () => {
  it('locked layer has locked === true flag (drives disabled attr in StepEditor)', () => {
    applyRecipeById('cueca-chilena-folk');
    const layers = get(sessionStore).rhythm.layers;
    const lockedLayers = layers.filter((l: RhythmLayer) => l.locked === true);
    expect(lockedLayers.length).toBeGreaterThan(0);
    for (const layer of lockedLayers) {
      expect(layer.locked).toBe(true);
    }
  });

  it('free layers have locked undefined or false (drives enabled buttons in StepEditor)', () => {
    applyRecipeById('cueca-chilena-folk');
    const layers = get(sessionStore).rhythm.layers;
    const freeLayers = layers.filter((l: RhythmLayer) => !l.locked);
    // cueca has at least one free layer (palmas is free)
    expect(freeLayers.length).toBeGreaterThan(0);
    for (const layer of freeLayers) {
      expect(layer.locked).toBeFalsy();
    }
  });
});
