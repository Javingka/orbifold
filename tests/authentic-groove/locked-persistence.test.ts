// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — persistence roundtrip tests for RhythmLayer.locked (Phase 05 step 05.2).
//
// Covers acceptance ID A-05-04 (partial):
//   - Serialize a session with a layer that has `locked: true`; deserialize;
//     confirm `locked` is preserved.
//   - Serialize a session with a layer that has no `locked`; deserialize;
//     confirm `locked` is `undefined` (not `false`).
//   - Pre-Phase-05 session blob (no `locked` field) parses cleanly under
//     `SavedSessionSchema` (backward-compatibility guarantee).
//
// SESSION_SCHEMA_VERSION stays 5 — `locked` is additive optional.

import { describe, it, expect } from 'vitest';
import {
  SavedSessionSchema,
  serializeSession,
  deserializeSession,
  type SavedSession,
} from '../../src/lib/persistence.js';
import type { SessionState } from '../../src/state/session.js';
import { DEFAULT_SESSION_STATE } from '../../src/state/session.js';

// ── Helper: build a minimal SessionState with given layers ───────────────────

function makeSessionState(
  layers: SessionState['rhythm']['layers']
): Omit<SessionState, 'nowPlaying' | 'autopilot'> {
  return {
    bpm: DEFAULT_SESSION_STATE.bpm,
    view: DEFAULT_SESSION_STATE.view,
    chordMode: DEFAULT_SESSION_STATE.chordMode,
    harmony: {
      ...DEFAULT_SESSION_STATE.harmony,
      progression: [],
    },
    rhythm: { layers },
    composition: { blocks: [], tracks: [] },
  } as Omit<SessionState, 'nowPlaying' | 'autopilot'>;
}

// ── Helper: build a base SavedSession blob ────────────────────────────────────

function makeBaseSavedSession(extraLayerFields: Record<string, unknown> = {}): SavedSession {
  return {
    version: 6,
    bpm: 120,
    view: 'rhythm',
    chordMode: 'chord',
    harmony: { root: 0, mode: 'minor', octave: 3, progression: [] },
    rhythm: {
      layers: [
        {
          sound: 'bd',
          steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
          ...extraLayerFields,
        },
      ],
    },
    composition: { blocks: [], tracks: [] },
  };
}

// ── Tests: serialize → SavedSessionSchema.safeParse → deserialize roundtrip ──

describe('locked persistence roundtrip (A-05-04)', () => {
  it('layer with locked: true survives serialize → parse → deserialize', () => {
    const state = makeSessionState([
      {
        sound: 'bd',
        steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        locked: true,
      },
    ]);

    const saved = serializeSession(state as SessionState);
    // Confirm `locked: true` is in the serialized blob.
    expect(saved.rhythm.layers[0].locked).toBe(true);

    const parsed = SavedSessionSchema.safeParse(saved);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const restored = deserializeSession(parsed.data);
    expect(restored.rhythm.layers[0].locked).toBe(true);
  });

  it('layer without locked field produces locked: undefined after roundtrip', () => {
    const state = makeSessionState([
      {
        sound: 'bd',
        steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        // No locked field
      },
    ]);

    const saved = serializeSession(state as SessionState);
    // Confirm `locked` is NOT written for layers without a lock.
    expect(saved.rhythm.layers[0].locked).toBeUndefined();

    const parsed = SavedSessionSchema.safeParse(saved);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const restored = deserializeSession(parsed.data);
    // locked must be undefined (not false — we don't coerce).
    expect(restored.rhythm.layers[0].locked).toBeUndefined();
  });

  it('layer with locked: false is NOT written to serialized blob (false === not-locked)', () => {
    const state = makeSessionState([
      {
        sound: 'hh',
        steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        locked: false,
      },
    ]);

    const saved = serializeSession(state as SessionState);
    // locked: false is the default — we don't write it to the blob.
    expect(saved.rhythm.layers[0].locked).toBeUndefined();
  });

  it('multiple layers: only locked: true layers carry the flag', () => {
    const state = makeSessionState([
      {
        sound: 'bd',
        steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        locked: true,
      },
      {
        sound: 'cp',
        steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        locked: false,
      },
      {
        sound: 'hh',
        steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        // No locked field
      },
    ]);

    const saved = serializeSession(state as SessionState);
    expect(saved.rhythm.layers[0].locked).toBe(true);
    expect(saved.rhythm.layers[1].locked).toBeUndefined();
    expect(saved.rhythm.layers[2].locked).toBeUndefined();

    const parsed = SavedSessionSchema.safeParse(saved);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const restored = deserializeSession(parsed.data);
    expect(restored.rhythm.layers[0].locked).toBe(true);
    expect(restored.rhythm.layers[1].locked).toBeUndefined();
    expect(restored.rhythm.layers[2].locked).toBeUndefined();
  });
});

// ── Tests: backward-compatibility — pre-Phase-05 session blobs parse cleanly ──

describe('backward-compatibility: pre-Phase-05 sessions (no locked field) parse cleanly', () => {
  it('pre-Phase-05 session blob (no locked) parses under SavedSessionSchema', () => {
    const prePhaseBlobRaw = makeBaseSavedSession();
    // Confirm no locked field in the blob.
    expect(prePhaseBlobRaw.rhythm.layers[0]).not.toHaveProperty('locked');

    const parsed = SavedSessionSchema.safeParse(prePhaseBlobRaw);
    expect(parsed.success).toBe(true);
  });

  it('pre-Phase-05 session deserialized: locked is undefined on all layers', () => {
    const prePhaseBlobRaw = makeBaseSavedSession();
    const parsed = SavedSessionSchema.safeParse(prePhaseBlobRaw);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const restored = deserializeSession(parsed.data);
    for (const layer of restored.rhythm.layers) {
      expect(layer.locked).toBeUndefined();
    }
  });

  it('SESSION_SCHEMA_VERSION is now 6 (bumped in note-placement Phase 01 step 01.2 — NoteSlot added)', () => {
    // SESSION_SCHEMA_VERSION was 5 when the locked feature was added.
    // note-placement Phase 01 step 01.2 bumped it to 6 (NoteSlot variant added to progression).
    // This test is updated to reflect the authorized bump.
    const blob = makeBaseSavedSession({ locked: true });
    const parsed = SavedSessionSchema.safeParse(blob);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.version).toBe(6);
  });
});
