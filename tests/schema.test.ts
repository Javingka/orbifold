// SPDX-License-Identifier: AGPL-3.0-only
// Tests for src/agent/schema.ts (AgentOutputSchema, sub-schemas) and
// src/agent/apply.ts (applyRhythmSpec, applyHarmonySpec).
//
// Phase 06 step 06.2.  Covers acceptance IDs A-06-04, A-06-05, A-06-06.

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import {
  AgentOutputSchema,
  RhythmSpecSchema,
  HarmonySpecSchema,
  SCHEMA_VERSION,
} from '../src/agent/schema';
import { applyRhythmSpec, applyHarmonySpec } from '../src/agent/apply';
import { sessionStore, DEFAULT_SESSION_STATE } from '../src/state/session';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Reset the session store before each test so store mutations don't bleed. */
beforeEach(() => {
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
});

// ── SCHEMA_VERSION ─────────────────────────────────────────────────────────

describe('SCHEMA_VERSION', () => {
  it('is numeric 1', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});

// ── AgentOutputSchema — valid payloads ────────────────────────────────────

describe('AgentOutputSchema — valid payloads', () => {
  // A-06-04: valid rhythm-only payload
  it('rhythm-only payload succeeds', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: {
        layers: [{ sound: 'bd', steps: new Array(16).fill(0) }],
      },
    });
    expect(result.success).toBe(true);
  });

  // A-06-04: valid harmony-only payload
  it('harmony-only payload succeeds', () => {
    const result = AgentOutputSchema.safeParse({
      harmony: {
        root: 'C',
        mode: 'minor',
        octave: 3,
        progression: [{ root: 'C', quality: 'min' }],
      },
    });
    expect(result.success).toBe(true);
  });

  // A-06-04: valid combined payload with note
  it('rhythm + harmony + note payload succeeds', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: {
        layers: [{ sound: 'hh', euclid: { k: 5, n: 8, rot: 0 } }],
      },
      harmony: {
        root: 'A',
        mode: 'dorian',
        progression: [
          { root: 'A', quality: 'min' },
          { root: 'D', quality: 'min' },
        ],
      },
      note: 'groove de hip-hop en La dórico',
    });
    expect(result.success).toBe(true);
  });

  // Euclid variant with max rot = n-1
  it('euclid variant with rot = n-1 succeeds', () => {
    const result = RhythmSpecSchema.safeParse({
      layers: [{ sound: 'sd', euclid: { k: 3, n: 8, rot: 7 } }],
    });
    expect(result.success).toBe(true);
  });
});

// ── AgentOutputSchema — invalid payloads ─────────────────────────────────

describe('AgentOutputSchema — invalid payloads', () => {
  // A-06-04: invalid sound name
  it('invalid sound name fails', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: {
        layers: [{ sound: 'kick', steps: new Array(16).fill(0) }],
      },
    });
    expect(result.success).toBe(false);
  });

  // A-06-04: steps array length ≠ 16
  it('steps array length ≠ 16 fails', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: {
        layers: [{ sound: 'bd', steps: [1, 0, 0, 0] }],
      },
    });
    expect(result.success).toBe(false);
  });

  // A-06-04: k = 0 (out of range: min is 1)
  it('euclid k=0 fails (min is 1)', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: {
        layers: [{ sound: 'hh', euclid: { k: 0, n: 8, rot: 0 } }],
      },
    });
    expect(result.success).toBe(false);
  });

  // A-06-04: k = 17 (out of range: max is 16)
  it('euclid k=17 fails (max is 16)', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: {
        layers: [{ sound: 'hh', euclid: { k: 17, n: 8, rot: 0 } }],
      },
    });
    expect(result.success).toBe(false);
  });

  // A-06-04: n = 1 (out of range: min is 2)
  it('euclid n=1 fails (min is 2)', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: {
        layers: [{ sound: 'sd', euclid: { k: 1, n: 1, rot: 0 } }],
      },
    });
    expect(result.success).toBe(false);
  });

  // A-06-04: n = 17 (out of range: max is 16)
  it('euclid n=17 fails (max is 16)', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: {
        layers: [{ sound: 'sd', euclid: { k: 3, n: 17, rot: 0 } }],
      },
    });
    expect(result.success).toBe(false);
  });

  // A-06-04: rot > n-1
  it('euclid rot > n-1 fails', () => {
    // n=8 so max rot is 7; rot=8 should fail
    const result = AgentOutputSchema.safeParse({
      rhythm: {
        layers: [{ sound: 'cp', euclid: { k: 3, n: 8, rot: 8 } }],
      },
    });
    expect(result.success).toBe(false);
  });

  // A-06-04: invalid mode string
  it('invalid mode string fails', () => {
    const result = AgentOutputSchema.safeParse({
      harmony: { mode: 'blues' },
    });
    expect(result.success).toBe(false);
  });

  // A-06-04: invalid quality string
  it('invalid quality string fails', () => {
    const result = AgentOutputSchema.safeParse({
      harmony: {
        progression: [{ root: 'C', quality: 'major' }],
      },
    });
    expect(result.success).toBe(false);
  });

  // A-06-04: empty layers array
  it('empty layers array fails (min 1)', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: { layers: [] },
    });
    expect(result.success).toBe(false);
  });

  // A-06-04: neither rhythm nor harmony present
  it('neither rhythm nor harmony fails', () => {
    const result = AgentOutputSchema.safeParse({ note: 'just a note' });
    expect(result.success).toBe(false);
  });

  // Harmony-only progression exceeding max length
  it('progression with 9 chords fails (max 8)', () => {
    const result = HarmonySpecSchema.safeParse({
      progression: new Array(9).fill({ root: 'C', quality: 'maj' }),
    });
    expect(result.success).toBe(false);
  });
});

// ── applyRhythmSpec — steps variant ──────────────────────────────────────

describe('applyRhythmSpec — steps variant', () => {
  // A-06-05: steps-variant updates sessionStore.rhythm.layers correctly
  it('replaces layers with the provided step pattern', () => {
    const steps = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
    applyRhythmSpec({
      layers: [{ sound: 'bd', steps }],
    });
    const state = get(sessionStore);
    expect(state.rhythm.layers).toHaveLength(1);
    expect(state.rhythm.layers[0].sound).toBe('bd');
    expect(state.rhythm.layers[0].steps).toEqual(steps);
  });

  it('clamps step values to 0/1 (truthy → 1, falsy → 0)', () => {
    // steps array with 0 and 1 (already valid per schema; apply clamps defensively)
    const steps = [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    applyRhythmSpec({ layers: [{ sound: 'sd', steps }] });
    const state = get(sessionStore);
    expect(state.rhythm.layers[0].steps).toEqual(steps);
  });

  it('handles multiple layers in correct order', () => {
    const stepsA = new Array(16).fill(0).map((_, i) => (i % 4 === 0 ? 1 : 0));
    const stepsB = new Array(16).fill(0).map((_, i) => (i % 8 === 0 ? 1 : 0));
    applyRhythmSpec({
      layers: [
        { sound: 'bd', steps: stepsA },
        { sound: 'hh', steps: stepsB },
      ],
    });
    const state = get(sessionStore);
    expect(state.rhythm.layers).toHaveLength(2);
    expect(state.rhythm.layers[0].sound).toBe('bd');
    expect(state.rhythm.layers[1].sound).toBe('hh');
  });

  it('no euclid field on steps-variant layer', () => {
    applyRhythmSpec({ layers: [{ sound: 'cp', steps: new Array(16).fill(1) }] });
    const state = get(sessionStore);
    expect(state.rhythm.layers[0].euclid).toBeUndefined();
  });
});

// ── applyRhythmSpec — euclid variant ─────────────────────────────────────

describe('applyRhythmSpec — euclid variant', () => {
  // A-06-05: E(3,8,0) produces the correct 16-step pattern via bjorklund/rotate.
  // Golden value computed via prototype logic (lines 1687–1691):
  //   bjorklund(3,8) = [1,0,0,1,0,0,1,0]
  //   rotate by 0 = identity
  //   map to 16 steps via Math.round(i/n*RSTEPS)%RSTEPS:
  //     i=0 → s=0, i=3 → s=6, i=6 → s=12 → [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0]
  it('E(3,8,0) produces correct 16-step pattern (prototype lines 1687–1691)', () => {
    applyRhythmSpec({
      layers: [{ sound: 'bd', euclid: { k: 3, n: 8, rot: 0 } }],
    });
    const state = get(sessionStore);
    const layer = state.rhythm.layers[0];
    expect(layer.steps).toEqual([1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0]);
    expect(layer.euclid).toBe('3,8');
  });

  it('E(3,8,2) rotation produces correct 16-step pattern', () => {
    // rotate([1,0,0,1,0,0,1,0], 2) = [0,1,0,0,1,0,0,1] → no, left-rotate:
    // [0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0] (golden from Node script)
    applyRhythmSpec({
      layers: [{ sound: 'sd', euclid: { k: 3, n: 8, rot: 2 } }],
    });
    const state = get(sessionStore);
    const layer = state.rhythm.layers[0];
    expect(layer.steps).toEqual([0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
    expect(layer.euclid).toBe('3,8,2');
  });

  it('euclid compact string omits rot when rot=0', () => {
    applyRhythmSpec({ layers: [{ sound: 'hh', euclid: { k: 5, n: 8, rot: 0 } }] });
    const state = get(sessionStore);
    expect(state.rhythm.layers[0].euclid).toBe('5,8');
  });

  it('euclid compact string includes rot when rot>0', () => {
    applyRhythmSpec({ layers: [{ sound: 'hh', euclid: { k: 5, n: 8, rot: 3 } }] });
    const state = get(sessionStore);
    expect(state.rhythm.layers[0].euclid).toBe('5,8,3');
  });
});

// ── applyHarmonySpec ───────────────────────────────────────────────────────

describe('applyHarmonySpec', () => {
  // A-06-06: updates root, mode, octave, and progression correctly
  it('root C, mode minor, progression [{C,min},{Ab,maj}] updates store correctly', () => {
    applyHarmonySpec({
      root: 'C',
      mode: 'minor',
      octave: 3,
      progression: [
        { root: 'C', quality: 'min' },
        { root: 'Ab', quality: 'maj' },
      ],
    });
    const state = get(sessionStore);
    expect(state.harmony.root).toBe(0); // C = pc 0
    expect(state.harmony.mode).toBe('minor');
    expect(state.harmony.octave).toBe(3);
    expect(state.harmony.progression).toHaveLength(2);
    expect(state.harmony.progression[0].rootPc).toBe(0); // C
    expect(state.harmony.progression[0].qual).toBe('min');
    expect(state.harmony.progression[1].rootPc).toBe(8); // Ab = pc 8
    expect(state.harmony.progression[1].qual).toBe('maj');
  });

  // A-06-06: no cx/cy fields on any chord (Decisions Register: render hints ephemeral)
  it('no cx or cy fields are written to any chord', () => {
    applyHarmonySpec({
      root: 'G',
      mode: 'major',
      progression: [
        { root: 'G', quality: 'maj' },
        { root: 'C', quality: 'maj' },
        { root: 'D', quality: 'maj' },
      ],
    });
    const state = get(sessionStore);
    for (const chord of state.harmony.progression) {
      expect(chord).not.toHaveProperty('cx');
      expect(chord).not.toHaveProperty('cy');
    }
  });

  it('gain defaults to 0.6 when absent (prototype line 1714)', () => {
    applyHarmonySpec({
      progression: [{ root: 'C', quality: 'maj' }],
    });
    const state = get(sessionStore);
    expect(state.harmony.progression[0].gain).toBe(0.6);
  });

  it('explicit gain is preserved', () => {
    applyHarmonySpec({
      progression: [{ root: 'C', quality: 'maj', gain: 0.8 }],
    });
    const state = get(sessionStore);
    expect(state.harmony.progression[0].gain).toBe(0.8);
  });

  it('octave is clamped to [2,5]', () => {
    applyHarmonySpec({ octave: 7 }); // above max; clamped to 5
    const state = get(sessionStore);
    expect(state.harmony.octave).toBe(5);
  });

  it('invalid root string leaves harmony.root unchanged', () => {
    // Default root is 0 (C); pass an invalid string
    applyHarmonySpec({ root: 'XYZ' });
    const state = get(sessionStore);
    expect(state.harmony.root).toBe(0); // unchanged
  });

  it('mode is only updated when spec.mode is provided', () => {
    // Default mode is 'major'
    applyHarmonySpec({ root: 'D' }); // no mode field
    const state = get(sessionStore);
    expect(state.harmony.mode).toBe('major'); // unchanged
  });

  it('chords with invalid root strings are silently skipped', () => {
    applyHarmonySpec({
      progression: [
        { root: 'INVALID', quality: 'maj' },
        { root: 'G', quality: 'maj' },
      ],
    });
    const state = get(sessionStore);
    expect(state.harmony.progression).toHaveLength(1);
    expect(state.harmony.progression[0].rootPc).toBe(7); // G = pc 7
  });
});
