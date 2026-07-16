// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — persistence round-trip tests for agent-created blocks.
//
// Phase 01 (ai-composition-authoring) step 01.4.
// Covers acceptance IDs A-01-07, A-01-08.
//
// A-01-07: An agent-created block (with non-null snapshot) survives a full
//           persistence round-trip: serializeSession → JSON → SavedSessionSchema.safeParse
//           → deserializeSession → block has name, type, code, and snapshot intact.
// A-01-08: An agent-created block with addToTrack: true survives a full
//           persistence round-trip: the track referencing it is intact after
//           serializeSession → deserializeSession.
//
// Regression guard: a session with no agent-created blocks (no saveAsBlock)
// continues to parse correctly.
//
// ADR 0021 D2: SESSION_SCHEMA_VERSION remains 5 (no persistence-layer change).
// ADR 0021 D6: agent-created blocks are structurally identical to user-created
//               blocks at the persistence layer — SavedBlockSchema.snapshot? covers all.
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import {
  SavedSessionSchema,
  serializeSession,
  deserializeSession,
  SESSION_SCHEMA_VERSION,
} from '../src/lib/persistence.js';
import { sessionStore, DEFAULT_SESSION_STATE } from '../src/state/session.js';
import { applyRhythmSpec, applyBlockSave } from '../src/agent/apply.js';

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

// ── Reset store before each test ──────────────────────────────────────────

beforeEach(() => {
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
});

// ── SESSION_SCHEMA_VERSION confirmation ───────────────────────────────────

// ADR 0021 D2: SESSION_SCHEMA_VERSION was 5 when agent-block persistence was added.
// note-placement Phase 01 step 01.2 bumped it to 6 (NoteSlot variant).
// song-import Phase 01 step 01.2 bumped it to 7 (pow quality added to SK_QUAL).
describe('SESSION_SCHEMA_VERSION — ADR 0021 D2', () => {
  it('SESSION_SCHEMA_VERSION is 7 (bumped from 6 in song-import Phase 01 — pow quality added)', () => {
    expect(SESSION_SCHEMA_VERSION).toBe(7);
  });
});

// ── A-01-07: agent-created groove block survives persistence round-trip ───

describe('A-01-07: agent-created groove block — persistence round-trip', () => {
  it('A-01-07: block name survives serializeSession → JSON → safeParse → deserializeSession', () => {
    // Seed rhythm state and create a groove block via the agent path.
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Agent Groove', type: 'groove' });

    const state = get(sessionStore);
    expect(state.composition.blocks).toHaveLength(1);

    // Full round-trip.
    const serialized = serializeSession(state);
    const raw = JSON.parse(JSON.stringify(serialized)) as unknown;
    const parseResult = SavedSessionSchema.safeParse(raw);

    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const restored = deserializeSession(parseResult.data);
    expect(restored.composition.blocks).toHaveLength(1);
    expect(restored.composition.blocks[0].name).toBe('Agent Groove');
  });

  it('A-01-07: block type survives round-trip', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Groove Type', type: 'groove' });

    const state = get(sessionStore);
    const serialized = serializeSession(state);
    const parseResult = SavedSessionSchema.safeParse(JSON.parse(JSON.stringify(serialized)));
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const restored = deserializeSession(parseResult.data);
    expect(restored.composition.blocks[0].type).toBe('groove');
  });

  it('A-01-07: block code (non-empty) survives round-trip', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Groove Code', type: 'groove' });

    const state = get(sessionStore);
    // Confirm the block has non-empty code before serializing.
    expect(state.composition.blocks[0].code.length).toBeGreaterThan(0);

    const serialized = serializeSession(state);
    const parseResult = SavedSessionSchema.safeParse(JSON.parse(JSON.stringify(serialized)));
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const restored = deserializeSession(parseResult.data);
    expect(restored.composition.blocks[0].code.length).toBeGreaterThan(0);
    // Code must be byte-identical after round-trip.
    expect(restored.composition.blocks[0].code).toBe(state.composition.blocks[0].code);
  });

  it('A-01-07: block snapshot is non-null and snapshot.type is "groove" after round-trip', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Groove Snapshot', type: 'groove' });

    const state = get(sessionStore);
    expect(state.composition.blocks[0].snapshot).toBeDefined();
    expect(state.composition.blocks[0].snapshot?.type).toBe('groove');

    const serialized = serializeSession(state);
    const parseResult = SavedSessionSchema.safeParse(JSON.parse(JSON.stringify(serialized)));
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const restored = deserializeSession(parseResult.data);
    const restoredBlock = restored.composition.blocks[0];
    // snapshot must survive the round-trip (ADR 0021 D2 / ADR 0020 D5).
    expect(restoredBlock.snapshot).toBeDefined();
    expect(restoredBlock.snapshot?.type).toBe('groove');
  });

  it('A-01-07: all four fields (name, type, code, snapshot) survive round-trip together', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Full Groove', type: 'groove' });

    const state = get(sessionStore);
    const origBlock = state.composition.blocks[0];

    const serialized = serializeSession(state);
    const parseResult = SavedSessionSchema.safeParse(JSON.parse(JSON.stringify(serialized)));
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const restored = deserializeSession(parseResult.data);
    const restoredBlock = restored.composition.blocks[0];

    expect(restoredBlock.name).toBe(origBlock.name);
    expect(restoredBlock.type).toBe(origBlock.type);
    expect(restoredBlock.code).toBe(origBlock.code);
    expect(restoredBlock.snapshot).toBeDefined();
    expect(restoredBlock.snapshot?.type).toBe('groove');
  });
});

// ── A-01-08: agent-created block + track reference survive round-trip ─────

describe('A-01-08: agent-created block with addToTrack: true — persistence round-trip', () => {
  it('A-01-08: block appears in composition.blocks after round-trip', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Track Groove', type: 'groove', addToTrack: true });

    const state = get(sessionStore);
    expect(state.composition.blocks).toHaveLength(1);
    expect(state.composition.tracks).toHaveLength(1);

    const serialized = serializeSession(state);
    const parseResult = SavedSessionSchema.safeParse(JSON.parse(JSON.stringify(serialized)));
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const restored = deserializeSession(parseResult.data);
    expect(restored.composition.blocks).toHaveLength(1);
    expect(restored.composition.blocks[0].name).toBe('Track Groove');
  });

  it('A-01-08: track referencing the block survives round-trip (blockIndex reference intact)', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Track Groove', type: 'groove', addToTrack: true });

    const state = get(sessionStore);
    // The track was created with addToTrack: true; it must reference the block.
    expect(state.composition.tracks).toHaveLength(1);
    const trackBlockId = state.composition.blocks[0].id;
    const trackRef = state.composition.tracks[0].blocks[0];
    expect(trackRef.blockId).toBe(trackBlockId);

    // Serialize and parse.
    const serialized = serializeSession(state);
    // The track ref must be converted to a blockIndex reference in the serialized form.
    expect(serialized.composition.tracks).toHaveLength(1);
    expect(serialized.composition.tracks[0].blockRefs[0].blockIndex).toBe(0);

    const parseResult = SavedSessionSchema.safeParse(JSON.parse(JSON.stringify(serialized)));
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const restored = deserializeSession(parseResult.data);
    // Track must still exist after round-trip.
    expect(restored.composition.tracks).toHaveLength(1);
    // The blockId in the deserialized track is a placeholder string of the blockIndex.
    // (deserializeSession sets blockId = String(ref.blockIndex); applyLoadedSession rebuilds.)
    expect(restored.composition.tracks[0].blocks).toHaveLength(1);
    expect(restored.composition.tracks[0].blocks[0].blockId).toBe('0');
  });

  it('A-01-08: snapshot of the block in the track is intact after round-trip', () => {
    applyRhythmSpec(GROOVE_SPEC);
    applyBlockSave({ name: 'Track Snap', type: 'groove', addToTrack: true });

    const state = get(sessionStore);
    const serialized = serializeSession(state);
    const parseResult = SavedSessionSchema.safeParse(JSON.parse(JSON.stringify(serialized)));
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const restored = deserializeSession(parseResult.data);
    // Block's snapshot must survive even when the block is referenced by a track.
    expect(restored.composition.blocks[0].snapshot).toBeDefined();
    expect(restored.composition.blocks[0].snapshot?.type).toBe('groove');
  });
});

// ── Regression guard: session without agent-created blocks still parses ───

describe('Regression guard: session with no agent-created blocks (no saveAsBlock)', () => {
  it('regression: minimal session (no blocks, no tracks) continues to parse correctly', () => {
    // Standard session with no composition blocks — must not be broken by schema changes.
    const state = get(sessionStore);
    // Default state has empty blocks and tracks.
    expect(state.composition.blocks).toHaveLength(0);
    expect(state.composition.tracks).toHaveLength(0);

    const serialized = serializeSession(state);
    const raw = JSON.parse(JSON.stringify(serialized)) as unknown;
    const parseResult = SavedSessionSchema.safeParse(raw);

    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const restored = deserializeSession(parseResult.data);
    expect(restored.composition.blocks).toHaveLength(0);
    expect(restored.composition.tracks).toHaveLength(0);
  });

  it('regression: session with user-created blocks (no snapshot) still parses correctly', () => {
    // A block without a snapshot (legacy-style block) must still parse correctly
    // after the SavedBlockSchema gained the snapshot? field (ADR 0020 D5).
    const stateWithLegacyBlock: Parameters<typeof serializeSession>[0] = {
      ...DEFAULT_SESSION_STATE,
      composition: {
        blocks: [{ id: 'b1', name: 'Legacy Groove', type: 'groove', code: 's("bd")', bars: 4 }],
        tracks: [],
      },
    };

    const serialized = serializeSession(stateWithLegacyBlock);
    const raw = JSON.parse(JSON.stringify(serialized)) as unknown;
    const parseResult = SavedSessionSchema.safeParse(raw);

    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const restored = deserializeSession(parseResult.data);
    expect(restored.composition.blocks).toHaveLength(1);
    expect(restored.composition.blocks[0].name).toBe('Legacy Groove');
    // snapshot is absent on a legacy block — must deserialize as undefined.
    expect(restored.composition.blocks[0].snapshot).toBeUndefined();
  });

  it('regression: session with blocks that DO have a snapshot still validates at version 7', () => {
    // This is a direct schema validation test using a hand-crafted payload
    // that mirrors what serializeSession produces for a block with a groove snapshot.
    const payloadWithSnapshot = {
      version: 7,
      bpm: 120,
      view: 'rhythm',
      chordMode: 'chord',
      harmony: { root: 0, mode: 'major', octave: 3, progression: [] },
      rhythm: { layers: [] },
      composition: {
        blocks: [
          {
            name: 'Snapblock',
            type: 'groove',
            code: 's("bd")',
            bars: 4,
            snapshot: {
              type: 'groove',
              layers: [
                {
                  sound: 'bd',
                  steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                },
              ],
            },
          },
        ],
        tracks: [],
      },
    };

    const parseResult = SavedSessionSchema.safeParse(payloadWithSnapshot);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    // The snapshot field must be preserved through schema parsing.
    const block = parseResult.data.composition.blocks[0];
    expect(block.snapshot).toBeDefined();
    expect(block.snapshot?.type).toBe('groove');
  });
});
