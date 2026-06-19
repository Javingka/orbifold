// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit tests for applyBlockSave (src/agent/apply.ts).
//
// Phase 01 (ai-composition-authoring) step 01.3.
// Covers acceptance IDs A-01-01, A-01-02, A-01-03, A-01-04, A-01-05.
//
// ADR 0021 D3–D6 binding:
//   - applyBlockSave delegates snapshot capture to addBlock (single capture path).
//   - applyBlockSave truncates name via .trim().slice(0, 100) (OQ-2 / D1).
//   - applyRhythmSpec / applyHarmonySpec without saveAsBlock leave composition unchanged (D6).
//   - openBlock(id) on an agent-created block does not throw (A-01-05).
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { sessionStore, DEFAULT_SESSION_STATE, openBlock } from '../src/state/session';
import { applyRhythmSpec, applyHarmonySpec, applyBlockSave } from '../src/agent/apply';

// ── Test fixtures ──────────────────────────────────────────────────────────

/** A minimal rhythm spec that produces non-empty rhythmCode. */
const GROOVE_SPEC = {
  layers: [
    {
      sound: 'bd' as const,
      steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] as [
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
        0 | 1,
      ],
    },
  ],
};

/** A minimal harmony spec that produces non-empty harmonyCode. */
const HARMONY_SPEC = {
  root: 'C',
  mode: 'minor' as const,
  octave: 3,
  progression: [
    { root: 'C', quality: 'min' as const },
    { root: 'Ab', quality: 'maj' as const },
  ],
};

// ── Reset store before each test ──────────────────────────────────────────

beforeEach(() => {
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
});

// ── A-01-01: groove block creation ────────────────────────────────────────

describe('applyBlockSave — groove block (A-01-01)', () => {
  it('A-01-01: creates a block with correct name, type, and non-null snapshot', () => {
    // Ensure there is a rhythm to capture.
    applyRhythmSpec(GROOVE_SPEC);

    applyBlockSave({ name: 'Test Groove', type: 'groove' });

    const state = get(sessionStore);
    expect(state.composition.blocks).toHaveLength(1);

    const block = state.composition.blocks[0];
    expect(block.name).toBe('Test Groove');
    expect(block.type).toBe('groove');
    expect(block.snapshot).not.toBeNull();
    expect(block.snapshot).toBeDefined();
  });

  it('A-01-01: snapshot discriminant is "groove" for a groove block', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Groove Check', type: 'groove' });

    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    expect(block.snapshot).toBeDefined();
    if (block.snapshot) {
      expect(block.snapshot.type).toBe('groove');
    }
  });

  it('A-01-01: block has a non-empty code string', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Groove Code', type: 'groove' });

    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    expect(block.code.length).toBeGreaterThan(0);
  });
});

// ── A-01-02: armonia block creation ──────────────────────────────────────

describe('applyBlockSave — armonia block (A-01-02)', () => {
  it('A-01-02: creates an armonia block with correct name, type, and non-null snapshot', () => {
    applyHarmonySpec(HARMONY_SPEC);

    applyBlockSave({ name: 'Test Harmony', type: 'armonia' });

    const state = get(sessionStore);
    expect(state.composition.blocks).toHaveLength(1);

    const block = state.composition.blocks[0];
    expect(block.name).toBe('Test Harmony');
    expect(block.type).toBe('armonia');
    expect(block.snapshot).not.toBeNull();
    expect(block.snapshot).toBeDefined();
  });

  it('A-01-02: snapshot discriminant is "armonia"', () => {
    applyHarmonySpec(HARMONY_SPEC);
    applyBlockSave({ name: 'Armonía Check', type: 'armonia' });

    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    if (block.snapshot) {
      expect(block.snapshot.type).toBe('armonia');
    }
  });
});

// ── A-01-03: addToTrack creates a new track referencing the block ─────────

describe('applyBlockSave — addToTrack (A-01-03)', () => {
  it('A-01-03: addToTrack: true → block in library AND new track referencing its id', () => {
    applyRhythmSpec(GROOVE_SPEC);

    const trackCountBefore = get(sessionStore).composition.tracks.length;

    applyBlockSave({ name: 'Track Block', type: 'groove', addToTrack: true });

    const state = get(sessionStore);
    expect(state.composition.blocks).toHaveLength(1);
    const block = state.composition.blocks[0];
    expect(block.name).toBe('Track Block');

    // A new track must have been created.
    expect(state.composition.tracks.length).toBe(trackCountBefore + 1);

    // The last track must reference the new block's id.
    const newTrack = state.composition.tracks[state.composition.tracks.length - 1];
    expect(newTrack.blocks.some((ref) => ref.blockId === block.id)).toBe(true);
  });

  it('A-01-03: addToTrack absent (default) → no new track created', () => {
    applyRhythmSpec(GROOVE_SPEC);
    const trackCountBefore = get(sessionStore).composition.tracks.length;

    applyBlockSave({ name: 'No Track', type: 'groove' });

    const state = get(sessionStore);
    expect(state.composition.tracks.length).toBe(trackCountBefore);
  });

  it('A-01-03: addToTrack: false → no new track created', () => {
    applyRhythmSpec(GROOVE_SPEC);
    const trackCountBefore = get(sessionStore).composition.tracks.length;

    applyBlockSave({ name: 'No Track Explicit', type: 'groove', addToTrack: false });

    const state = get(sessionStore);
    expect(state.composition.tracks.length).toBe(trackCountBefore);
  });
});

// ── A-01-04: byte-identical-at-default (no saveAsBlock → composition unchanged) ─

describe('applyRhythmSpec + applyHarmonySpec without applyBlockSave (A-01-04)', () => {
  it('A-01-04: applyRhythmSpec does NOT touch composition.blocks', () => {
    const blocksBefore = get(sessionStore).composition.blocks;
    applyRhythmSpec(GROOVE_SPEC);
    const blocksAfter = get(sessionStore).composition.blocks;
    // Reference-identical: the same array (no update to composition)
    expect(blocksAfter).toBe(blocksBefore);
  });

  it('A-01-04: applyHarmonySpec does NOT touch composition.blocks', () => {
    const blocksBefore = get(sessionStore).composition.blocks;
    applyHarmonySpec(HARMONY_SPEC);
    const blocksAfter = get(sessionStore).composition.blocks;
    expect(blocksAfter).toBe(blocksBefore);
  });

  it('A-01-04: applyRhythmSpec + applyHarmonySpec together leave composition.blocks unchanged', () => {
    const blocksBefore = get(sessionStore).composition.blocks;
    applyRhythmSpec(GROOVE_SPEC);
    applyHarmonySpec(HARMONY_SPEC);
    const blocksAfter = get(sessionStore).composition.blocks;
    expect(blocksAfter).toBe(blocksBefore);
    expect(blocksAfter).toHaveLength(0);
  });

  it('A-01-04: applyRhythmSpec + applyHarmonySpec leave composition.tracks unchanged', () => {
    const tracksBefore = get(sessionStore).composition.tracks;
    applyRhythmSpec(GROOVE_SPEC);
    applyHarmonySpec(HARMONY_SPEC);
    const tracksAfter = get(sessionStore).composition.tracks;
    expect(tracksAfter).toBe(tracksBefore);
  });
});

// ── A-01-05: openBlock round-trip on agent-created block ─────────────────

describe('openBlock round-trip on agent-created block (A-01-05)', () => {
  it('A-01-05: openBlock(id) on agent-created groove block does not throw', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Groove Open', type: 'groove' });

    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    expect(block).toBeDefined();

    // openBlock should not throw even in a test environment (no audio).
    expect(() => openBlock(block.id)).not.toThrow();
  });

  it('A-01-05: openBlock leaves the store with the restored snapshot type', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Groove Restore', type: 'groove' });

    const stateBefore = get(sessionStore);
    const block = stateBefore.composition.blocks[0];

    openBlock(block.id);

    // After openBlock, the block itself is still in the composition (openBlock does not remove it).
    const stateAfter = get(sessionStore);
    const restoredBlock = stateAfter.composition.blocks.find((b) => b.id === block.id);
    expect(restoredBlock).toBeDefined();
    expect(restoredBlock?.type).toBe('groove');
    expect(restoredBlock?.snapshot?.type).toBe('groove');
  });

  it('A-01-05: openBlock on a non-existent id is a no-op (safe)', () => {
    // openBlock on an unknown id must not throw.
    expect(() => openBlock('b-non-existent')).not.toThrow();
  });
});

// ── Name truncation (OQ-2 / ADR 0021 D1) ──────────────────────────────────

describe('applyBlockSave — name truncation (OQ-2 / ADR 0021 D1)', () => {
  it('A-01-01 name truncation: name longer than 100 chars is truncated to 100', () => {
    applyRhythmSpec(GROOVE_SPEC);

    const longName = 'A'.repeat(150);
    applyBlockSave({ name: longName, type: 'groove' });

    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    expect(block.name.length).toBeLessThanOrEqual(100);
    expect(block.name).toBe('A'.repeat(100));
  });

  it('A-01-01 name truncation: name with leading/trailing whitespace is trimmed before truncation', () => {
    applyRhythmSpec(GROOVE_SPEC);

    applyBlockSave({ name: '  My Groove  ', type: 'groove' });

    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    expect(block.name).toBe('My Groove');
  });

  it('A-01-01 name truncation: name exactly 100 chars is preserved unchanged', () => {
    applyRhythmSpec(GROOVE_SPEC);

    const name100 = 'B'.repeat(100);
    applyBlockSave({ name: name100, type: 'groove' });

    const state = get(sessionStore);
    const block = state.composition.blocks[0];
    expect(block.name).toBe(name100);
    expect(block.name.length).toBe(100);
  });
});

// ── Multiple blocks accumulate correctly ──────────────────────────────────

describe('applyBlockSave — multiple blocks accumulate', () => {
  it('two sequential applyBlockSave calls create two blocks in the library', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Block 1', type: 'groove' });

    applyHarmonySpec(HARMONY_SPEC);
    applyBlockSave({ name: 'Block 2', type: 'armonia' });

    const state = get(sessionStore);
    expect(state.composition.blocks).toHaveLength(2);
    expect(state.composition.blocks[0].name).toBe('Block 1');
    expect(state.composition.blocks[1].name).toBe('Block 2');
  });
});
