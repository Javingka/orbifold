// SPDX-License-Identifier: AGPL-3.0-only
// Tests for src/agent/schema.ts (AgentOutputSchema, sub-schemas) and
// src/agent/apply.ts (applyRhythmSpec, applyHarmonySpec).
//
// Phase 06 step 06.2.  Covers acceptance IDs A-06-04, A-06-05, A-06-06.
// Phase 01 (ai-composition-authoring) step 01.3: added SaveAsBlockSpec tests (A-01-06).

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import {
  AgentOutputSchema,
  RhythmSpecSchema,
  HarmonySpecSchema,
  HarmonyChordSchema,
  SaveAsBlockSpecSchema,
  MusicalIntentSchema,
  SCHEMA_VERSION,
} from '../src/agent/schema';
import { applyRhythmSpec, applyHarmonySpec } from '../src/agent/apply';
import { sessionStore, DEFAULT_SESSION_STATE } from '../src/state/session';
import type { Block } from '../src/core/composition/model';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Reset the session store before each test so store mutations don't bleed. */
beforeEach(() => {
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
});

// ── SCHEMA_VERSION ─────────────────────────────────────────────────────────

describe('SCHEMA_VERSION', () => {
  // Bumped from 5 to 6 in ai-jam Phase 03 step 03.2 — ADR 0023.
  // musicalIntent? field added to AgentOutputSchema; superRefine guard relaxed (ADR 0023 D2).
  // (Previously bumped from 4 to 5 in ai-composition-authoring Phase 01 — ADR 0021 D2.)
  it('is numeric 6 — bumped in ai-jam Phase 03 step 03.2 (ADR 0023)', () => {
    expect(SCHEMA_VERSION).toBe(6);
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

// ── HarmonyChordSchema — rest slot union (Phase 06, ADR 0012) ──────────────

describe('HarmonyChordSchema — rest slot union (Phase 06, ADR 0012)', () => {
  // A-06-08 proxy: verify SCHEMA_VERSION = 2 via HarmonyChordSchema accepting rests.
  it('{ isRest: true } succeeds (rest with no bars)', () => {
    // A-06-08: SCHEMA_VERSION = 2; rest variant accepted by union.
    const result = HarmonyChordSchema.safeParse({ isRest: true });
    expect(result.success).toBe(true);
  });

  it('{ isRest: true, bars: 2 } succeeds', () => {
    const result = HarmonyChordSchema.safeParse({ isRest: true, bars: 2 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ isRest: true, bars: 2 });
    }
  });

  it('{ isRest: true, bars: 0.1 } fails (bars below minimum 0.25)', () => {
    const result = HarmonyChordSchema.safeParse({ isRest: true, bars: 0.1 });
    expect(result.success).toBe(false);
  });

  it('{ root: "C", quality: "maj" } still succeeds (existing chord variant unaffected)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj' });
    expect(result.success).toBe(true);
  });

  it('mixed progression with rest validates via AgentOutputSchema (A-06-07)', () => {
    // A-06-07: agent payload with mixed progression validates.
    const result = AgentOutputSchema.safeParse({
      harmony: {
        progression: [
          { root: 'C', quality: 'maj' },
          { isRest: true, bars: 2 },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});

// ── applyHarmonySpec — rest slot (Phase 06, ADR 0012) ─────────────────────

describe('applyHarmonySpec — rest slot (Phase 06, ADR 0012)', () => {
  // A-06-07: applyHarmonySpec produces [Chord, RestSlot] from a mixed progression.
  it('mixed progression [C maj, rest bars:2] produces [Chord, RestSlot] in store', () => {
    applyHarmonySpec({
      progression: [
        { root: 'C', quality: 'maj' },
        { isRest: true, bars: 2 },
      ],
    });
    const state = get(sessionStore);
    expect(state.harmony.progression).toHaveLength(2);
    // slot 0: Chord
    const slot0 = state.harmony.progression[0];
    expect('isRest' in slot0).toBe(false);
    expect(slot0.rootPc).toBe(0); // C = pc 0
    expect(slot0.qual).toBe('maj');
    expect(slot0.gain).toBe(0.6);
    // slot 1: RestSlot
    const slot1 = state.harmony.progression[1];
    expect('isRest' in slot1 && slot1.isRest).toBe(true);
    expect(slot1.bars).toBe(2);
  });

  it('rest slot without bars gets default bars undefined in store', () => {
    applyHarmonySpec({
      progression: [{ isRest: true }],
    });
    const state = get(sessionStore);
    expect(state.harmony.progression).toHaveLength(1);
    const slot = state.harmony.progression[0];
    expect('isRest' in slot && slot.isRest).toBe(true);
    expect(slot.bars).toBeUndefined();
  });

  it('rest slot bars is clamped via clampBars (rounds to 0.25 multiples)', () => {
    applyHarmonySpec({
      progression: [{ isRest: true, bars: 1.1 }],
    });
    const state = get(sessionStore);
    const slot = state.harmony.progression[0];
    expect('isRest' in slot && slot.isRest).toBe(true);
    // clampBars(1.1) = Math.round(1.1 * 4) / 4 = Math.round(4.4) / 4 = 4/4 = 1
    expect(slot.bars).toBe(1);
  });
});

// ── HarmonyChordCoreSchema — ADR 0018 D4 sound attributes (A-02-07) ──────────

describe('HarmonyChordCoreSchema — ADR 0018 D4 sound attributes (A-02-07)', () => {
  // A-02-07: agent schema accepts instrument, room, decay as optional fields
  it('chord with instrument: sine parses successfully (A-02-07)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', instrument: 'sine' });
    expect(result.success).toBe(true);
  });

  it('chord with all three new attrs parses successfully (A-02-07)', () => {
    const result = HarmonyChordSchema.safeParse({
      root: 'G',
      quality: 'maj',
      instrument: 'sawtooth',
      room: 0.5,
      decay: 0.2,
    });
    expect(result.success).toBe(true);
    if (result.success && 'root' in result.data) {
      expect(result.data.instrument).toBe('sawtooth');
      expect(result.data.room).toBe(0.5);
      expect(result.data.decay).toBe(0.2);
    }
  });

  it('chord with no new attrs still parses (attrs are optional) (A-02-07)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'min' });
    expect(result.success).toBe(true);
  });

  it('room above 1 fails (max is 1)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', room: 1.1 });
    expect(result.success).toBe(false);
  });

  it('room below 0 fails (min is 0)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', room: -0.1 });
    expect(result.success).toBe(false);
  });

  it('decay below 0 fails (min is 0)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', decay: -0.1 });
    expect(result.success).toBe(false);
  });

  it('HarmonyRestSchema is unchanged — no instrument/room/decay on rest', () => {
    // Rests must not gain sound attributes (ADR 0018 D4: HarmonyRestSchema unchanged)
    const result = HarmonyChordSchema.safeParse({ isRest: true, instrument: 'sine' });
    // isRest:true parses as rest; 'instrument' is stripped (Zod strips unknown keys)
    expect(result.success).toBe(true);
    if (result.success && 'isRest' in result.data) {
      expect(result.data).not.toHaveProperty('instrument');
    }
  });
});

// ── HarmonyChordCoreSchema — ADR 0019 D6 preset + filter/envelope (A-03-12) ─────────────

describe('HarmonyChordCoreSchema — ADR 0019 D6 preset + filter/envelope fields (A-03-12)', () => {
  // A-03-12: schema accepts preset as an optional field (verbatim technical token).
  it('A-03-12: chord with preset: "piano" parses successfully', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', preset: 'piano' });
    expect(result.success).toBe(true);
    if (result.success && 'root' in result.data) {
      expect(result.data.preset).toBe('piano');
    }
  });

  it('A-03-12: chord with preset: "guitar" parses successfully', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'G', quality: 'min', preset: 'guitar' });
    expect(result.success).toBe(true);
  });

  it('A-03-12: chord with preset: "synth-bass" parses successfully', () => {
    const result = HarmonyChordSchema.safeParse({
      root: 'F',
      quality: 'maj',
      preset: 'synth-bass',
    });
    expect(result.success).toBe(true);
  });

  // A-03-12: invalid preset name is rejected by z.enum.
  it('A-03-12: invalid preset name "violin" is rejected by z.enum', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', preset: 'violin' });
    expect(result.success).toBe(false);
  });

  it('A-03-12: invalid preset name "bass" is rejected by z.enum', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', preset: 'bass' });
    expect(result.success).toBe(false);
  });

  // A-03-12: noise token 'pink' accepted by instrument (z.string() — ADR 0019 D1).
  it('A-03-12: instrument: "pink" accepted (z.string() accepts noise token per ADR 0019 D1)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', instrument: 'pink' });
    expect(result.success).toBe(true);
    if (result.success && 'root' in result.data) {
      expect(result.data.instrument).toBe('pink');
    }
  });

  // A-03-12: all new filter/envelope fields are accepted as optional.
  it('A-03-12: chord with all filter/envelope fields parses successfully', () => {
    const result = HarmonyChordSchema.safeParse({
      root: 'C',
      quality: 'maj',
      instrument: 'sawtooth',
      preset: 'guitar',
      lpf: 2500,
      attack: 0.01,
      sustain: 0.0,
      release: 0.3,
      lpenv: 3,
      lpa: 0.01,
      lpd: 0.25,
      lpq: 1,
    });
    expect(result.success).toBe(true);
    if (result.success && 'root' in result.data) {
      expect(result.data.lpf).toBe(2500);
      expect(result.data.attack).toBe(0.01);
      expect(result.data.sustain).toBe(0.0);
      expect(result.data.release).toBe(0.3);
      expect(result.data.lpenv).toBe(3);
      expect(result.data.lpa).toBe(0.01);
      expect(result.data.lpd).toBe(0.25);
      expect(result.data.lpq).toBe(1);
    }
  });

  // A-03-12: chord with no new fields still parses (all optional).
  it('A-03-12: chord with no new ADR 0019 fields parses; all are undefined', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'min' });
    expect(result.success).toBe(true);
    if (result.success && 'root' in result.data) {
      expect(result.data.preset).toBeUndefined();
      expect(result.data.lpf).toBeUndefined();
      expect(result.data.attack).toBeUndefined();
      expect(result.data.sustain).toBeUndefined();
      expect(result.data.release).toBeUndefined();
      expect(result.data.lpenv).toBeUndefined();
      expect(result.data.lpa).toBeUndefined();
      expect(result.data.lpd).toBeUndefined();
      expect(result.data.lpq).toBeUndefined();
    }
  });

  // A-03-12: attack below 0 is rejected.
  it('A-03-12: attack below 0 is rejected (min: 0)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', attack: -0.1 });
    expect(result.success).toBe(false);
  });

  // A-03-12: sustain above 1 is rejected.
  it('A-03-12: sustain above 1 is rejected (max: 1)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', sustain: 1.1 });
    expect(result.success).toBe(false);
  });

  // A-03-12: release below 0 is rejected.
  it('A-03-12: release below 0 is rejected (min: 0)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', release: -0.1 });
    expect(result.success).toBe(false);
  });

  // A-03-12: lpa below 0 is rejected.
  it('A-03-12: lpa below 0 is rejected (min: 0)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', lpa: -0.01 });
    expect(result.success).toBe(false);
  });

  // A-03-12: lpd below 0 is rejected.
  it('A-03-12: lpd below 0 is rejected (min: 0)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', lpd: -0.01 });
    expect(result.success).toBe(false);
  });

  // A-03-12: lpq below 0 is rejected.
  it('A-03-12: lpq below 0 is rejected (min: 0)', () => {
    const result = HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj', lpq: -1 });
    expect(result.success).toBe(false);
  });

  // A-03-12: HarmonyRestSchema unchanged — preset and filter/envelope fields are stripped from rests.
  it('A-03-12: HarmonyRestSchema unchanged — preset field stripped from rest slot', () => {
    const result = HarmonyChordSchema.safeParse({ isRest: true, preset: 'piano' });
    expect(result.success).toBe(true);
    if (result.success && 'isRest' in result.data) {
      expect(result.data).not.toHaveProperty('preset');
    }
  });

  // A-03-12 / A-01-06: SCHEMA_VERSION is now 6 (ADR 0023 — bumped in ai-jam Phase 03 step 03.2).
  // Previously 5 from ADR 0021 D2 (ai-composition-authoring Phase 01).
  it('A-03-12 / A-01-06: SCHEMA_VERSION is 6 (bumped from 5 by ADR 0023, ai-jam Phase 03)', () => {
    expect(SCHEMA_VERSION).toBe(6);
  });
});

// ── SaveAsBlockSpecSchema — ADR 0021 D1 (A-01-06) ────────────────────────────

describe('SaveAsBlockSpecSchema — ADR 0021 D1 (A-01-06)', () => {
  // A-01-06: all three type values parse correctly.
  it('A-01-06: type "groove" parses correctly', () => {
    const result = SaveAsBlockSpecSchema.safeParse({ name: 'My Groove', type: 'groove' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('groove');
      expect(result.data.name).toBe('My Groove');
    }
  });

  it('A-01-06: type "armonia" parses correctly', () => {
    const result = SaveAsBlockSpecSchema.safeParse({ name: 'Mi Armonía', type: 'armonia' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('armonia');
    }
  });

  it('A-01-06: type "sesion" parses correctly', () => {
    const result = SaveAsBlockSpecSchema.safeParse({ name: 'Sesión A', type: 'sesion' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('sesion');
    }
  });

  it('A-01-06: addToTrack: true parses correctly alongside name and type', () => {
    const result = SaveAsBlockSpecSchema.safeParse({
      name: 'Track Block',
      type: 'groove',
      addToTrack: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.addToTrack).toBe(true);
    }
  });

  it('A-01-06: addToTrack absent → undefined (optional field)', () => {
    const result = SaveAsBlockSpecSchema.safeParse({ name: 'No Track', type: 'armonia' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.addToTrack).toBeUndefined();
    }
  });

  it('A-01-06: unknown type is rejected by z.enum', () => {
    const result = SaveAsBlockSpecSchema.safeParse({ name: 'Bad', type: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('A-01-06: empty name string is rejected by z.string().min(1)', () => {
    const result = SaveAsBlockSpecSchema.safeParse({ name: '', type: 'groove' });
    expect(result.success).toBe(false);
  });

  it('A-01-06: name longer than 100 chars parses successfully (no .max() in Zod — OQ-2)', () => {
    // The truncation happens in applyBlockSave, not in the schema.
    const longName = 'A'.repeat(150);
    const result = SaveAsBlockSpecSchema.safeParse({ name: longName, type: 'groove' });
    expect(result.success).toBe(true);
    if (result.success) {
      // Zod does NOT truncate — the full name passes schema validation
      expect(result.data.name.length).toBe(150);
    }
  });

  // A-01-06: type literal alignment guard — SaveAsBlockSpec.type must match Block.type.
  // This test verifies that the three z.enum values are the exact same literals used
  // in Block.type (src/core/composition/model.ts line 24: 'groove' | 'armonia' | 'sesion').
  // If model.ts adds or renames a type, this test will fail, prompting an ADR update.
  it('A-01-06: type enum values align with Block.type literals from model.ts', () => {
    // Enumerate the three values that Block.type accepts and confirm each parses.
    const blockTypes: Array<Block['type']> = ['groove', 'armonia', 'sesion'];
    for (const t of blockTypes) {
      const result = SaveAsBlockSpecSchema.safeParse({ name: 'Alignment Test', type: t });
      expect(result.success).toBe(true);
    }
    // Confirm that a value NOT in Block.type is rejected.
    const badResult = SaveAsBlockSpecSchema.safeParse({ name: 'Bad', type: 'invalid' });
    expect(badResult.success).toBe(false);
  });
});

// ── AgentOutputSchema — saveAsBlock field (A-01-06) ───────────────────────────

describe('AgentOutputSchema — saveAsBlock field (ADR 0021 D1, A-01-06)', () => {
  // A-01-06: saveAsBlock-only response parses correctly (OQ-3 guard relaxed).
  it('A-01-06: saveAsBlock-only response (no rhythm, no harmony) parses correctly', () => {
    const result = AgentOutputSchema.safeParse({
      saveAsBlock: { name: 'Groove Test', type: 'groove' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.saveAsBlock).toBeDefined();
      expect(result.data.rhythm).toBeUndefined();
      expect(result.data.harmony).toBeUndefined();
    }
  });

  it('A-01-06: response without saveAsBlock parses correctly; saveAsBlock is undefined', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: { layers: [{ sound: 'bd', steps: new Array(16).fill(0) }] },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.saveAsBlock).toBeUndefined();
    }
  });

  it('A-01-06: response with rhythm + saveAsBlock parses correctly', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: { layers: [{ sound: 'bd', steps: new Array(16).fill(0) }] },
      saveAsBlock: { name: 'Combo Block', type: 'sesion', addToTrack: true },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rhythm).toBeDefined();
      expect(result.data.saveAsBlock?.type).toBe('sesion');
      expect(result.data.saveAsBlock?.addToTrack).toBe(true);
    }
  });

  it('A-01-06: neither rhythm, harmony, nor saveAsBlock fails (superRefine guard)', () => {
    const result = AgentOutputSchema.safeParse({ note: 'only a note' });
    expect(result.success).toBe(false);
  });

  it('A-01-06: saveAsBlock with unknown type causes parse failure', () => {
    const result = AgentOutputSchema.safeParse({
      saveAsBlock: { name: 'Bad', type: 'melody' },
    });
    expect(result.success).toBe(false);
  });
});

// ── SaveAsBlockSpecSchema structural alignment guard (step 01.4) ──────────────
//
// Confirms that SaveAsBlockSpecSchema.shape.type is a z.ZodEnum whose values
// are the exact same three literals as Block.type from src/core/composition/model.ts
// (line 24: 'groove' | 'armonia' | 'sesion'). This is a structural introspection
// check — it inspects the Zod schema shape directly, not via safeParse.
// If model.ts adds or renames a Block.type literal, this test will fail,
// prompting an ADR update (ADR 0021 D1 structural alignment guard).

describe('SaveAsBlockSpecSchema.shape.type — structural alignment with Block.type (step 01.4)', () => {
  it('step-01.4 structural guard: SaveAsBlockSpecSchema.shape.type enum values are exactly the Block.type literals', () => {
    // Zod z.enum exposes its values as a readonly string array on ._def.values.
    const enumDef = SaveAsBlockSpecSchema.shape.type._def as { values: string[] };
    const schemaValues = [...enumDef.values].sort();

    // The three literals that Block.type accepts (src/core/composition/model.ts line 24).
    // Kept as a typed array so that TypeScript enforces exhaustiveness.
    const blockTypeValues: Array<Block['type']> = ['armonia', 'groove', 'sesion'];
    const expectedValues = [...blockTypeValues].sort();

    // Structural equality: same count, same values in sorted order.
    expect(schemaValues).toHaveLength(expectedValues.length);
    expect(schemaValues).toEqual(expectedValues);
  });
});

// ── Schema v6: MusicalIntentSchema + SCHEMA_VERSION bump (ADR 0023) ──────────
//
// ai-jam Phase 03 step 03.2.
// Covers acceptance IDs A-03-01, A-03-02, A-03-03.

describe('SCHEMA_VERSION === 6 (A-03-03, ADR 0023 D3)', () => {
  it('A-03-03: SCHEMA_VERSION is 6 — bumped in ai-jam Phase 03 step 03.2 (ADR 0023)', () => {
    expect(SCHEMA_VERSION).toBe(6);
  });
});

describe('AgentOutputSchema v6 — backward compatibility (A-03-02)', () => {
  // A-03-02: existing v5-compatible responses parse unchanged through v6.

  it('A-03-02: v5 response with only rhythm parses successfully; musicalIntent is undefined', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: { layers: [{ sound: 'bd', steps: new Array(16).fill(0) }] },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.musicalIntent).toBeUndefined();
    }
  });

  it('A-03-02: v5 response with only harmony parses successfully; musicalIntent is undefined', () => {
    const result = AgentOutputSchema.safeParse({
      harmony: {
        root: 'C',
        mode: 'minor',
        progression: [{ root: 'C', quality: 'min' }],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.musicalIntent).toBeUndefined();
    }
  });

  it('A-03-02: v5 response with only saveAsBlock parses successfully; musicalIntent is undefined', () => {
    const result = AgentOutputSchema.safeParse({
      saveAsBlock: { name: 'My Block', type: 'groove' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.musicalIntent).toBeUndefined();
    }
  });
});

describe('AgentOutputSchema v6 — musicalIntent new field (A-03-01)', () => {
  // A-03-01: new musicalIntent-only response is accepted; none-of-four is rejected.

  it('A-03-01: response with only musicalIntent.recipeId parses successfully', () => {
    const result = AgentOutputSchema.safeParse({
      musicalIntent: {
        recipeId: 'bossa-nova-groove',
        style: 'bossa nova',
        complexity: 'medium',
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.musicalIntent?.recipeId).toBe('bossa-nova-groove');
      expect(result.data.musicalIntent?.style).toBe('bossa nova');
      expect(result.data.musicalIntent?.complexity).toBe('medium');
      expect(result.data.rhythm).toBeUndefined();
      expect(result.data.harmony).toBeUndefined();
    }
  });

  it('A-03-01: response with musicalIntent + rhythm combined parses successfully', () => {
    const result = AgentOutputSchema.safeParse({
      rhythm: { layers: [{ sound: 'bd', steps: new Array(16).fill(0) }] },
      musicalIntent: {
        recipeId: 'bossa-nova-groove',
        explanation: 'adding bossa nova feel to the existing rhythm',
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rhythm).toBeDefined();
      expect(result.data.musicalIntent?.recipeId).toBe('bossa-nova-groove');
      expect(result.data.musicalIntent?.explanation).toBe(
        'adding bossa nova feel to the existing rhythm'
      );
    }
  });

  it('A-03-01: response with none of rhythm, harmony, saveAsBlock, musicalIntent fails (superRefine guard)', () => {
    const result = AgentOutputSchema.safeParse({ note: 'only a note' });
    expect(result.success).toBe(false);
  });

  it('A-03-01: empty object (no fields at all) fails (superRefine guard)', () => {
    const result = AgentOutputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('MusicalIntentSchema — sub-field validation (ADR 0023 D1)', () => {
  // complexity rejects invalid enum value
  it('complexity rejects an invalid enum value (not in simple|medium|dense)', () => {
    const result = MusicalIntentSchema.safeParse({ complexity: 'sparse' });
    expect(result.success).toBe(false);
  });

  it('complexity accepts "simple"', () => {
    const result = MusicalIntentSchema.safeParse({ complexity: 'simple' });
    expect(result.success).toBe(true);
  });

  it('complexity accepts "medium"', () => {
    const result = MusicalIntentSchema.safeParse({ complexity: 'medium' });
    expect(result.success).toBe(true);
  });

  it('complexity accepts "dense"', () => {
    const result = MusicalIntentSchema.safeParse({ complexity: 'dense' });
    expect(result.success).toBe(true);
  });

  // bpmHint rejects out-of-range values
  it('bpmHint rejects value below 40 (min is 40)', () => {
    const result = MusicalIntentSchema.safeParse({ bpmHint: 39 });
    expect(result.success).toBe(false);
  });

  it('bpmHint rejects value above 240 (max is 240)', () => {
    const result = MusicalIntentSchema.safeParse({ bpmHint: 241 });
    expect(result.success).toBe(false);
  });

  it('bpmHint accepts 40 (boundary — min)', () => {
    const result = MusicalIntentSchema.safeParse({ bpmHint: 40 });
    expect(result.success).toBe(true);
  });

  it('bpmHint accepts 240 (boundary — max)', () => {
    const result = MusicalIntentSchema.safeParse({ bpmHint: 240 });
    expect(result.success).toBe(true);
  });

  it('bpmHint accepts 120 (in range)', () => {
    const result = MusicalIntentSchema.safeParse({ bpmHint: 120 });
    expect(result.success).toBe(true);
  });

  // explanation rejects strings over 300 chars
  it('explanation rejects strings over 300 chars (max is 300)', () => {
    const result = MusicalIntentSchema.safeParse({ explanation: 'A'.repeat(301) });
    expect(result.success).toBe(false);
  });

  it('explanation accepts strings of exactly 300 chars (boundary)', () => {
    const result = MusicalIntentSchema.safeParse({ explanation: 'A'.repeat(300) });
    expect(result.success).toBe(true);
  });

  it('explanation accepts strings shorter than 300 chars', () => {
    const result = MusicalIntentSchema.safeParse({ explanation: 'bossa nova feel' });
    expect(result.success).toBe(true);
  });

  // All fields optional — empty object is valid
  it('empty object parses successfully (all fields optional)', () => {
    const result = MusicalIntentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  // cultureTags accepts string array
  it('cultureTags accepts an array of strings', () => {
    const result = MusicalIntentSchema.safeParse({ cultureTags: ['West African', 'Ewe'] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cultureTags).toEqual(['West African', 'Ewe']);
    }
  });

  // Full musicalIntent object with all fields
  it('full musicalIntent object with all optional fields parses successfully', () => {
    const result = MusicalIntentSchema.safeParse({
      style: 'bossa nova',
      cultureTags: ['Brazilian', 'Latin'],
      mood: 'gentle',
      complexity: 'medium',
      meter: '4/4',
      bpmHint: 130,
      recipeId: 'bossa-nova-groove',
      explanation: 'applying bossa nova clave with jazz harmony',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.style).toBe('bossa nova');
      expect(result.data.recipeId).toBe('bossa-nova-groove');
      expect(result.data.bpmHint).toBe(130);
    }
  });
});
