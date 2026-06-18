// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — BlockSnapshot capture / restore unit tests.
//
// Covers acceptance criteria A-01-01 through A-01-06 for Phase 01 step 01.3
// (editable-composition initiative, ADR 0020).
//
// A-01-01: groove round-trip fidelity (captureGrooveSnapshot → restoreGrooveSnapshot)
// A-01-02: armonia round-trip fidelity (captureArmoniaSnapshot → restoreArmoniaSnapshot)
// A-01-03: sesion round-trip fidelity (captureSesionSnapshot → restoreSesionSnapshot)
// A-01-04: captureArmoniaSnapshot preserves all per-chord sound attributes
// A-01-05: restoreArmoniaSnapshot restores per-chord sound attributes faithfully
// A-01-06: byte-identical-at-default — buildComposition is unchanged when snapshot absent
//
// Prototype parity: N/A — this is new infrastructure, not a prototype port.
// Flag-off equivalent: A-01-06 demonstrates byte-identical-at-default.
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.
// snapshot.ts and model.ts are pure engine modules (no DOM/PIXI/Svelte).

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import type {
  SessionState,
  Chord,
  RestSlot,
  RhythmState,
  HarmonyState,
} from '../src/state/session.js';
import { sessionStore, DEFAULT_SESSION_STATE, addBlock } from '../src/state/session.js';
import type { RhythmLayer } from '../src/core/rhythm/layers.js';
import {
  captureGrooveSnapshot,
  captureArmoniaSnapshot,
  captureSesionSnapshot,
  restoreGrooveSnapshot,
  restoreArmoniaSnapshot,
  restoreSesionSnapshot,
} from '../src/core/composition/snapshot.js';
import type {
  GrooveSnapshot,
  ArmoniaSnapshot,
  SesionSnapshot,
  ChordSnapshotEntry,
} from '../src/core/composition/snapshot.js';
import { buildComposition } from '../src/core/composition/model.js';
import type { Block, Track } from '../src/core/composition/model.js';

// ── Test fixtures ──────────────────────────────────────────────────────────

const BD_LAYER: RhythmLayer = {
  sound: 'bd',
  steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
};

const SD_LAYER: RhythmLayer = {
  sound: 'sd',
  steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  muted: false,
  solo: false,
};

const HH_LAYER_EUCLID: RhythmLayer = {
  sound: 'hh',
  steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  euclid: '8,16',
};

const C_MAJ: Chord = { rootPc: 0, qual: 'maj', gain: 0.6 };
const A_MIN: Chord = { rootPc: 9, qual: 'min', gain: 0.7, bars: 2 };
const REST: RestSlot = { isRest: true, bars: 1 };

/** Chord with ALL per-chord sound attributes from ADR 0018 + 0019 */
const C_MAJ_FULL: Chord = {
  rootPc: 0,
  qual: 'maj',
  gain: 0.8,
  bars: 2,
  instrument: 'square',
  room: 0.4,
  decay: 1.5,
  preset: 'piano',
  lpf: 800,
  attack: 0.05,
  sustain: 0.7,
  release: 0.3,
  lpenv: 2,
  lpa: 0.1,
  lpd: 0.2,
  lpq: 1.5,
};

function makeGrooveState(): SessionState {
  return {
    ...DEFAULT_SESSION_STATE,
    rhythm: { layers: [BD_LAYER, SD_LAYER, HH_LAYER_EUCLID] },
  };
}

function makeArmoniaState(): SessionState {
  return {
    ...DEFAULT_SESSION_STATE,
    chordMode: 'arp',
    harmony: {
      ...DEFAULT_SESSION_STATE.harmony,
      root: 5,
      mode: 'minor',
      octave: 3,
      progression: [C_MAJ, A_MIN, REST],
    },
  };
}

function makeSesionState(): SessionState {
  return {
    ...DEFAULT_SESSION_STATE,
    chordMode: 'chord',
    rhythm: { layers: [BD_LAYER, SD_LAYER] },
    harmony: {
      ...DEFAULT_SESSION_STATE.harmony,
      root: 7,
      mode: 'major',
      octave: 4,
      progression: [C_MAJ, A_MIN],
    },
  };
}

function makeFullAttrsState(): SessionState {
  return {
    ...DEFAULT_SESSION_STATE,
    chordMode: 'chord',
    harmony: {
      ...DEFAULT_SESSION_STATE.harmony,
      root: 0,
      mode: 'major',
      octave: 4,
      progression: [C_MAJ_FULL],
    },
  };
}

// Helper: assert a value is defined and return it with narrowed type.
function assertDefined<T>(value: T | undefined, msg?: string): T {
  expect(value, msg).toBeDefined();
  return value as T;
}

beforeEach(() => {
  sessionStore.set(DEFAULT_SESSION_STATE);
});

// ── A-01-01: groove round-trip fidelity ────────────────────────────────────

describe('A-01-01: captureGrooveSnapshot → restoreGrooveSnapshot round-trip', () => {
  it('restores layers array with same sounds and steps', () => {
    const state = makeGrooveState();
    const snap = captureGrooveSnapshot(state);
    const delta = restoreGrooveSnapshot(snap);

    const rhythm = assertDefined<RhythmState>(delta.rhythm, 'delta.rhythm must be defined');
    expect(rhythm.layers).toHaveLength(3);
    expect(rhythm.layers[0].sound).toBe('bd');
    expect(rhythm.layers[0].steps).toEqual(BD_LAYER.steps);
    expect(rhythm.layers[1].sound).toBe('sd');
    expect(rhythm.layers[1].steps).toEqual(SD_LAYER.steps);
    expect(rhythm.layers[2].sound).toBe('hh');
    expect(rhythm.layers[2].steps).toEqual(HH_LAYER_EUCLID.steps);
  });

  it('restores euclid field on layers that have it', () => {
    const state = makeGrooveState();
    const snap = captureGrooveSnapshot(state);
    const delta = restoreGrooveSnapshot(snap);
    const rhythm = assertDefined<RhythmState>(delta.rhythm);
    expect(rhythm.layers[2].euclid).toBe('8,16');
  });

  it('restores muted and solo flags faithfully', () => {
    const state = makeGrooveState();
    const snap = captureGrooveSnapshot(state);
    const delta = restoreGrooveSnapshot(snap);
    const rhythm = assertDefined<RhythmState>(delta.rhythm);
    // SD_LAYER has muted: false, solo: false explicitly set
    expect(rhythm.layers[1].muted).toBe(false);
    expect(rhythm.layers[1].solo).toBe(false);
    // BD_LAYER has no muted/solo fields
    expect(rhythm.layers[0].muted).toBeUndefined();
    expect(rhythm.layers[0].solo).toBeUndefined();
  });

  it('snapshot type discriminant is "groove"', () => {
    const snap = captureGrooveSnapshot(makeGrooveState());
    expect(snap.type).toBe('groove');
  });

  it('steps arrays are deep-copied (mutation of snapshot does not affect original state)', () => {
    const state = makeGrooveState();
    const snap = captureGrooveSnapshot(state);
    // Mutate snapshot layer steps
    snap.layers[0].steps[0] = 0;
    // The original state is unaffected
    expect(state.rhythm.layers[0].steps[0]).toBe(1);
    // The restored delta reflects the mutated snapshot
    const delta = restoreGrooveSnapshot(snap);
    const rhythm = assertDefined<RhythmState>(delta.rhythm);
    expect(rhythm.layers[0].steps[0]).toBe(0);
  });

  it('empty layers array round-trips correctly', () => {
    const state: SessionState = { ...DEFAULT_SESSION_STATE, rhythm: { layers: [] } };
    const snap = captureGrooveSnapshot(state);
    const delta = restoreGrooveSnapshot(snap);
    const rhythm = assertDefined<RhythmState>(delta.rhythm);
    expect(rhythm.layers).toEqual([]);
  });
});

// ── A-01-02: armonia round-trip fidelity ───────────────────────────────────

describe('A-01-02: captureArmoniaSnapshot → restoreArmoniaSnapshot round-trip', () => {
  it('restores root, mode, octave, and chordMode', () => {
    const state = makeArmoniaState();
    const snap = captureArmoniaSnapshot(state);
    const delta = restoreArmoniaSnapshot(snap);

    const harmony = assertDefined<HarmonyState>(delta.harmony, 'delta.harmony must be defined');
    expect(harmony.root).toBe(5);
    expect(harmony.mode).toBe('minor');
    expect(harmony.octave).toBe(3);
    expect(delta.chordMode).toBe('arp');
  });

  it('restores progression: chord slots with rootPc, qual, gain, bars', () => {
    const state = makeArmoniaState();
    const snap = captureArmoniaSnapshot(state);
    const delta = restoreArmoniaSnapshot(snap);

    const harmony = assertDefined<HarmonyState>(delta.harmony);
    expect(harmony.progression).toHaveLength(3);

    const slot0 = harmony.progression[0] as Chord;
    expect(slot0.rootPc).toBe(0);
    expect(slot0.qual).toBe('maj');
    expect(slot0.gain).toBe(0.6);
    expect(slot0.bars).toBeUndefined(); // C_MAJ has no bars field

    const slot1 = harmony.progression[1] as Chord;
    expect(slot1.rootPc).toBe(9);
    expect(slot1.qual).toBe('min');
    expect(slot1.gain).toBe(0.7);
    expect(slot1.bars).toBe(2);
  });

  it('restores progression: rest slots with isRest and bars', () => {
    const state = makeArmoniaState();
    const snap = captureArmoniaSnapshot(state);
    const delta = restoreArmoniaSnapshot(snap);

    const harmony = assertDefined<HarmonyState>(delta.harmony);
    const slot2 = harmony.progression[2] as RestSlot;
    expect(slot2.isRest).toBe(true);
    expect(slot2.bars).toBe(1);
  });

  it('snapshot type discriminant is "armonia"', () => {
    const snap = captureArmoniaSnapshot(makeArmoniaState());
    expect(snap.type).toBe('armonia');
  });

  it('bpm is NOT captured in ArmoniaSnapshot (ADR 0020 D3)', () => {
    const state: SessionState = { ...makeArmoniaState(), bpm: 140 };
    const snap = captureArmoniaSnapshot(state);
    expect((snap as ArmoniaSnapshot & { bpm?: unknown }).bpm).toBeUndefined();
  });

  it('empty progression round-trips correctly', () => {
    const state: SessionState = {
      ...DEFAULT_SESSION_STATE,
      harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: [] },
    };
    const snap = captureArmoniaSnapshot(state);
    const delta = restoreArmoniaSnapshot(snap);
    const harmony = assertDefined<HarmonyState>(delta.harmony);
    expect(harmony.progression).toEqual([]);
  });
});

// ── A-01-03: sesion round-trip fidelity ────────────────────────────────────

describe('A-01-03: captureSesionSnapshot → restoreSesionSnapshot round-trip', () => {
  it('restores both rhythm layers and harmony progression', () => {
    const state = makeSesionState();
    const snap = captureSesionSnapshot(state);
    const delta = restoreSesionSnapshot(snap);

    const rhythm = assertDefined<RhythmState>(delta.rhythm, 'delta.rhythm must be defined');
    expect(rhythm.layers).toHaveLength(2);
    expect(rhythm.layers[0].sound).toBe('bd');
    expect(rhythm.layers[1].sound).toBe('sd');

    const harmony = assertDefined<HarmonyState>(delta.harmony, 'delta.harmony must be defined');
    expect(harmony.root).toBe(7);
    expect(harmony.mode).toBe('major');
    expect(harmony.octave).toBe(4);
    expect(delta.chordMode).toBe('chord');
    expect(harmony.progression).toHaveLength(2);
  });

  it('snapshot has correct discriminants: type sesion, groove sub-type groove, armonia sub-type armonia', () => {
    const snap = captureSesionSnapshot(makeSesionState());
    expect(snap.type).toBe('sesion');
    expect(snap.groove.type).toBe('groove');
    expect(snap.armonia.type).toBe('armonia');
  });

  it('restoreSesionSnapshot delegates correctly — same result as combining groove+armonia deltas', () => {
    const state = makeSesionState();
    const sesionSnap = captureSesionSnapshot(state);
    const sesionDelta = restoreSesionSnapshot(sesionSnap);

    const grooveDelta = restoreGrooveSnapshot(sesionSnap.groove);
    const armoniaDelta = restoreArmoniaSnapshot(sesionSnap.armonia);

    expect(sesionDelta.rhythm).toEqual(grooveDelta.rhythm);
    expect(sesionDelta.harmony).toEqual(armoniaDelta.harmony);
    expect(sesionDelta.chordMode).toEqual(armoniaDelta.chordMode);
  });
});

// ── A-01-04: per-chord sound attributes captured ───────────────────────────

describe('A-01-04: captureArmoniaSnapshot preserves all per-chord sound attributes', () => {
  it('captures instrument, room, decay, preset, lpf, attack, sustain, release, lpenv, lpa, lpd, lpq', () => {
    const state = makeFullAttrsState();
    const snap = captureArmoniaSnapshot(state);
    const entry = snap.progression[0];

    // Should not be a rest
    expect('isRest' in entry).toBe(false);

    const chord = entry as ChordSnapshotEntry;
    expect(chord.rootPc).toBe(0);
    expect(chord.qual).toBe('maj');
    expect(chord.gain).toBe(0.8);
    expect(chord.bars).toBe(2);
    expect(chord.instrument).toBe('square');
    expect(chord.room).toBe(0.4);
    expect(chord.decay).toBe(1.5);
    expect(chord.preset).toBe('piano');
    expect(chord.lpf).toBe(800);
    expect(chord.attack).toBe(0.05);
    expect(chord.sustain).toBe(0.7);
    expect(chord.release).toBe(0.3);
    expect(chord.lpenv).toBe(2);
    expect(chord.lpa).toBe(0.1);
    expect(chord.lpd).toBe(0.2);
    expect(chord.lpq).toBe(1.5);
  });

  it('undefined optional fields are NOT included in snapshot (no spurious undefined keys)', () => {
    const state: SessionState = {
      ...DEFAULT_SESSION_STATE,
      harmony: {
        ...DEFAULT_SESSION_STATE.harmony,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6 }],
      },
    };
    const snap = captureArmoniaSnapshot(state);
    const entry = snap.progression[0] as ChordSnapshotEntry;
    // Fields not present on the source chord should not appear in the snapshot
    expect(Object.prototype.hasOwnProperty.call(entry, 'instrument')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(entry, 'preset')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(entry, 'lpf')).toBe(false);
  });
});

// ── A-01-05: per-chord sound attributes restored ───────────────────────────

describe('A-01-05: restoreArmoniaSnapshot restores per-chord sound attributes faithfully', () => {
  it('all per-chord sound attributes survive the restore path unchanged', () => {
    const state = makeFullAttrsState();
    const snap = captureArmoniaSnapshot(state);
    const delta = restoreArmoniaSnapshot(snap);

    const harmony = assertDefined<HarmonyState>(delta.harmony);
    const chord = harmony.progression[0] as Chord;
    expect(chord.instrument).toBe('square');
    expect(chord.room).toBe(0.4);
    expect(chord.decay).toBe(1.5);
    expect(chord.preset).toBe('piano');
    expect(chord.lpf).toBe(800);
    expect(chord.attack).toBe(0.05);
    expect(chord.sustain).toBe(0.7);
    expect(chord.release).toBe(0.3);
    expect(chord.lpenv).toBe(2);
    expect(chord.lpa).toBe(0.1);
    expect(chord.lpd).toBe(0.2);
    expect(chord.lpq).toBe(1.5);
  });

  it('a chord with only mandatory fields has no spurious extra fields after restore', () => {
    const state: SessionState = {
      ...DEFAULT_SESSION_STATE,
      harmony: {
        ...DEFAULT_SESSION_STATE.harmony,
        progression: [{ rootPc: 3, qual: 'min', gain: 0.5 }],
      },
    };
    const snap = captureArmoniaSnapshot(state);
    const delta = restoreArmoniaSnapshot(snap);
    const harmony = assertDefined<HarmonyState>(delta.harmony);
    const chord = harmony.progression[0] as Chord;
    expect(chord.rootPc).toBe(3);
    expect(chord.qual).toBe('min');
    expect(chord.gain).toBe(0.5);
    // Optional sound attrs should not appear
    expect(Object.prototype.hasOwnProperty.call(chord, 'instrument')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(chord, 'preset')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(chord, 'decay')).toBe(false);
  });
});

// ── A-01-06: byte-identical-at-default ────────────────────────────────────
// buildComposition must produce the same output when a block has no snapshot
// field as it did before Phase 01 (ADR 0020 D2 byte-identical guarantee).
// This is the flag-off-equivalent test.

describe('A-01-06: buildComposition is byte-identical when snapshot is absent', () => {
  it('block without snapshot produces the same output as pre-phase (snapshot-absent path)', () => {
    const blockWithoutSnapshot: Block = {
      id: 'b1',
      name: 'Groove 1',
      type: 'groove',
      code: 's("bd sd")',
      bars: 1,
      // No snapshot field
    };
    const tracks: Track[] = [{ id: 't1', blocks: [{ blockId: 'b1', bars: 1 }] }];
    const result = buildComposition([blockWithoutSnapshot], tracks);
    expect(result).toContain('s("bd sd")');
    expect(result).toContain('[1, s("bd sd")]');
  });

  it('block with snapshot produces the same composition output as identical block without snapshot', () => {
    const snap = captureGrooveSnapshot(makeGrooveState());
    const blockWithSnapshot: Block = {
      id: 'b1',
      name: 'Groove 1',
      type: 'groove',
      code: 's("bd sd")',
      bars: 1,
      snapshot: snap,
    };
    const blockWithoutSnapshot: Block = {
      id: 'b1',
      name: 'Groove 1',
      type: 'groove',
      code: 's("bd sd")',
      bars: 1,
    };
    const tracks: Track[] = [{ id: 't1', blocks: [{ blockId: 'b1', bars: 1 }] }];

    const withSnap = buildComposition([blockWithSnapshot], tracks);
    const withoutSnap = buildComposition([blockWithoutSnapshot], tracks);

    // Output must be byte-identical — snapshot is never consulted by buildComposition
    expect(withSnap).toBe(withoutSnap);
  });

  it('buildComposition does not reference block.snapshot — two blocks with different snapshots but same code produce same output', () => {
    const snap1 = captureGrooveSnapshot(makeGrooveState());
    const snap2 = captureGrooveSnapshot({
      ...DEFAULT_SESSION_STATE,
      rhythm: { layers: [{ sound: 'sd', steps: Array(16).fill(0) as number[] }] },
    });

    const blockA: Block = {
      id: 'b1',
      name: 'A',
      type: 'groove',
      code: 's("bd")',
      bars: 1,
      snapshot: snap1,
    };
    const blockB: Block = {
      id: 'b1',
      name: 'A',
      type: 'groove',
      code: 's("bd")',
      bars: 1,
      snapshot: snap2,
    };
    const tracks: Track[] = [{ id: 't1', blocks: [{ blockId: 'b1', bars: 1 }] }];

    expect(buildComposition([blockA], tracks)).toBe(buildComposition([blockB], tracks));
  });
});

// ── addBlock produces a non-null snapshot of the correct discriminant ───────

describe('addBlock: block created with correct snapshot discriminant (ADR 0020 D2)', () => {
  it('addBlock("groove") creates a block with snapshot.type === "groove"', () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      rhythm: { layers: [BD_LAYER] },
    });
    addBlock('groove');
    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    expect(block).toBeDefined();
    expect(block.snapshot).toBeDefined();
    const snap = assertDefined(block.snapshot);
    expect(snap.type).toBe('groove');
  });

  it('addBlock("armonia") creates a block with snapshot.type === "armonia"', () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      harmony: {
        ...DEFAULT_SESSION_STATE.harmony,
        progression: [C_MAJ, A_MIN],
      },
    });
    addBlock('armonia');
    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    expect(block).toBeDefined();
    expect(block.snapshot).toBeDefined();
    const snap = assertDefined(block.snapshot);
    expect(snap.type).toBe('armonia');
  });

  it('addBlock("sesion") creates a block with snapshot.type === "sesion"', () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      rhythm: { layers: [BD_LAYER] },
      harmony: {
        ...DEFAULT_SESSION_STATE.harmony,
        progression: [C_MAJ],
      },
    });
    addBlock('sesion');
    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    expect(block).toBeDefined();
    expect(block.snapshot).toBeDefined();
    const snap = assertDefined(block.snapshot);
    expect(snap.type).toBe('sesion');
  });

  it('addBlock("groove") snapshot layers match the current session state', () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      rhythm: { layers: [BD_LAYER, SD_LAYER] },
    });
    addBlock('groove');
    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    const snap = assertDefined(block.snapshot) as GrooveSnapshot;
    expect(snap.layers).toHaveLength(2);
    expect(snap.layers[0].sound).toBe('bd');
    expect(snap.layers[1].sound).toBe('sd');
  });

  it('addBlock("armonia") snapshot progression matches the current session state', () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      chordMode: 'arp',
      harmony: {
        ...DEFAULT_SESSION_STATE.harmony,
        root: 2,
        mode: 'minor',
        octave: 4,
        progression: [C_MAJ, A_MIN],
      },
    });
    addBlock('armonia');
    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    const snap = assertDefined(block.snapshot) as ArmoniaSnapshot;
    expect(snap.root).toBe(2);
    expect(snap.mode).toBe('minor');
    expect(snap.chordMode).toBe('arp');
    expect(snap.progression).toHaveLength(2);
  });

  it('addBlock("sesion") snapshot carries both groove and armonia sub-snapshots', () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      rhythm: { layers: [BD_LAYER] },
      harmony: {
        ...DEFAULT_SESSION_STATE.harmony,
        progression: [C_MAJ],
      },
    });
    addBlock('sesion');
    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    const snap = assertDefined(block.snapshot) as SesionSnapshot;
    expect(snap.groove.type).toBe('groove');
    expect(snap.armonia.type).toBe('armonia');
    expect(snap.groove.layers).toHaveLength(1);
    expect(snap.armonia.progression).toHaveLength(1);
  });

  it('addBlock code field is still populated (byte-identical-at-default: code is canonical)', () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      rhythm: { layers: [BD_LAYER] },
    });
    addBlock('groove');
    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    expect(block.code).toBeTruthy();
    expect(typeof block.code).toBe('string');
  });
});
