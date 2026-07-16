// SPDX-License-Identifier: AGPL-3.0-only
// Tests: Block label field presence; persistence roundtrip; absent label
//        produces no error in parse; buildComposition unaffected by label.
//
// song-import Phase 01 step 01.3 — acceptance IDs A-01-16 through A-01-21.

import { describe, it, expect } from 'vitest';
import {
  SavedSessionSchema,
  serializeSession,
  deserializeSession,
} from '../../src/lib/persistence.js';
import { buildComposition } from '../../src/core/composition/model.js';
import type { Block } from '../../src/core/composition/model.js';
import type { SessionState } from '../../src/state/session.js';

// ── Shared fixture helpers ─────────────────────────────────────────────────

/**
 * Minimal SavedSession blob used for roundtrip tests.
 * Mirrors the MINIMAL_SAVED fixture used in persistence.test.ts.
 */
function minimalSavedSession(
  overrides: {
    blocks?: {
      name: string;
      type: 'groove' | 'armonia' | 'sesion';
      code: string;
      bars: number;
      label?: string;
    }[];
  } = {}
) {
  return {
    version: 7 as const,
    bpm: 120,
    view: 'harmony' as const,
    chordMode: 'chord' as const,
    harmony: { root: 0, mode: 'major', octave: 3, progression: [] },
    rhythm: { layers: [] },
    composition: {
      blocks: overrides.blocks ?? [],
      tracks: [],
    },
  };
}

/**
 * Minimal SessionState for serialize/deserialize roundtrip tests.
 */
function minimalSessionState(
  blocks: Block[]
): Omit<SessionState, 'nowPlaying' | 'autopilot'> & Pick<SessionState, 'nowPlaying'> {
  return {
    bpm: 120,
    view: 'harmony' as const,
    chordMode: 'chord' as const,
    harmony: {
      root: 0,
      mode: 'major',
      octave: 3,
      progression: [],
      subview: 'tonnetz' as const,
      registerMode: 'suavizado' as const,
    },
    rhythm: { layers: [] },
    composition: {
      blocks,
      tracks: [],
    },
    nowPlaying: { label: null, source: null },
    autopilot: {
      enabled: false,
      intervalCycles: 4,
      panelOpen: false,
      lastRhythmHint: null,
      lastHarmonyHint: null,
      rhythmHintText: '',
      harmonyHintText: '',
      waitingMessage: null,
      lastRecipeDisplay: null,
    },
  } as SessionState;
}

// ── A-01-17: SavedBlockSchema includes label: z.string().optional() ────────

describe('SavedBlockSchema — label field (A-01-17, A-01-18, A-01-19)', () => {
  it('A-01-18: block with label round-trips via SavedSessionSchema.parse', () => {
    const blob = minimalSavedSession({
      blocks: [{ name: 'Verse', type: 'groove', code: 's("bd")', bars: 4, label: 'Verse' }],
    });
    const result = SavedSessionSchema.safeParse(blob);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.composition.blocks[0].label).toBe('Verse');
    }
  });

  it('A-01-19: legacy block without label still parses — label is undefined', () => {
    const blob = minimalSavedSession({
      blocks: [{ name: 'Groove A', type: 'groove', code: 's("bd")', bars: 4 }],
    });
    const result = SavedSessionSchema.safeParse(blob);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.composition.blocks[0].label).toBeUndefined();
    }
  });

  it('block with empty string label parses — label is empty string', () => {
    const blob = minimalSavedSession({
      blocks: [{ name: 'Bridge', type: 'armonia', code: 'note("C3")', bars: 2, label: '' }],
    });
    const result = SavedSessionSchema.safeParse(blob);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.composition.blocks[0].label).toBe('');
    }
  });

  it('A-01-18: labelled block preserves label value after schema parse', () => {
    const labelValues = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'];
    for (const label of labelValues) {
      const blob = minimalSavedSession({
        blocks: [{ name: 'Section', type: 'sesion', code: 's("bd")', bars: 1, label }],
      });
      const result = SavedSessionSchema.safeParse(blob);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.composition.blocks[0].label).toBe(label);
      }
    }
  });
});

// ── A-01-18: Full session roundtrip via serializeSession/deserializeSession ─

describe('Full session roundtrip with labelled block (A-01-18)', () => {
  it('label survives serializeSession → deserializeSession roundtrip', () => {
    const labelledBlock: Block = {
      id: 'b1',
      name: 'Chorus',
      type: 'armonia',
      code: 'note("C3,E3,G3")',
      bars: 4,
      label: 'Chorus',
    };
    const state = minimalSessionState([labelledBlock]);
    const serialized = serializeSession(state as SessionState);

    // Confirm serialized blob includes the label
    expect(serialized.composition.blocks[0].label).toBe('Chorus');

    // Confirm label survives parse through SavedSessionSchema
    const parsed = SavedSessionSchema.safeParse(serialized);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    // Confirm deserialized result has label
    const deserialized = deserializeSession(parsed.data);
    expect(deserialized.composition.blocks[0].label).toBe('Chorus');
  });

  it('block without label: serialize omits label, deserialize returns undefined', () => {
    const unlabelledBlock: Block = {
      id: 'b2',
      name: 'Intro',
      type: 'groove',
      code: 's("bd")',
      bars: 2,
    };
    const state = minimalSessionState([unlabelledBlock]);
    const serialized = serializeSession(state as SessionState);

    // Confirm serialized blob does NOT include label key
    expect('label' in serialized.composition.blocks[0]).toBe(false);

    // Confirm deserialize gives undefined label
    const parsed = SavedSessionSchema.safeParse(serialized);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const deserialized = deserializeSession(parsed.data);
    expect(deserialized.composition.blocks[0].label).toBeUndefined();
  });

  it('multiple blocks: each label is independently preserved', () => {
    const blocks: Block[] = [
      { id: 'b1', name: 'Block 1', type: 'groove', code: 's("bd")', bars: 4, label: 'Verse 1' },
      { id: 'b2', name: 'Block 2', type: 'armonia', code: 'note("C3")', bars: 2 },
      { id: 'b3', name: 'Block 3', type: 'sesion', code: 's("bd")', bars: 8, label: 'Chorus' },
    ];
    const state = minimalSessionState(blocks);
    const serialized = serializeSession(state as SessionState);

    const parsed = SavedSessionSchema.safeParse(serialized);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const deserialized = deserializeSession(parsed.data);
    expect(deserialized.composition.blocks[0].label).toBe('Verse 1');
    expect(deserialized.composition.blocks[1].label).toBeUndefined();
    expect(deserialized.composition.blocks[2].label).toBe('Chorus');
  });
});

// ── A-01-21: buildComposition output unaffected by label ──────────────────

describe('buildComposition unaffected by block.label (A-01-21)', () => {
  it('A-01-21: labelled block produces byte-identical buildComposition output to unlabelled block', () => {
    const track = [{ id: 't1', blocks: [{ blockId: 'b1', bars: 4 }] }];

    const blockWithLabel: Block = {
      id: 'b1',
      name: 'Chorus',
      type: 'groove',
      code: 's("bd")',
      bars: 4,
      label: 'Chorus',
    };
    const blockWithoutLabel: Block = {
      id: 'b1',
      name: 'Chorus',
      type: 'groove',
      code: 's("bd")',
      bars: 4,
    };

    const resultWith = buildComposition([blockWithLabel], track);
    const resultWithout = buildComposition([blockWithoutLabel], track);

    expect(resultWith).toBe(resultWithout);
  });

  it('A-01-21: label does not affect buildComposition for multi-track composition', () => {
    const blocks: Block[] = [
      { id: 'b1', name: 'Groove', type: 'groove', code: 's("bd")', bars: 4, label: 'Intro' },
      { id: 'b2', name: 'Harmony', type: 'armonia', code: 'note("C3,E3,G3")', bars: 4 },
    ];
    const tracks = [
      { id: 't1', blocks: [{ blockId: 'b1', bars: 4 }] },
      { id: 't2', blocks: [{ blockId: 'b2', bars: 4 }] },
    ];

    const blocksNoLabel: Block[] = [
      { id: 'b1', name: 'Groove', type: 'groove', code: 's("bd")', bars: 4 },
      { id: 'b2', name: 'Harmony', type: 'armonia', code: 'note("C3,E3,G3")', bars: 4 },
    ];

    expect(buildComposition(blocks, tracks)).toBe(buildComposition(blocksNoLabel, tracks));
  });
});
