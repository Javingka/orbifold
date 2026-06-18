// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — persistence tests: schema validation, serialize/deserialize,
//             encode/decode, localStorage helpers, applyLoadedSession.
// Phase 07 step 07.2.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import {
  SavedSessionSchema,
  serializeSession,
  deserializeSession,
  encodeSession,
  decodeSession,
  saveSession,
  loadSavedSession,
  listSavedSessions,
  deleteSession,
  PERSISTENCE_KEY_PREFIX,
  SESSION_SCHEMA_VERSION,
  type SavedSession,
} from '../src/lib/persistence.js';
import { applyLoadedSession, sessionStore, DEFAULT_SESSION_STATE } from '../src/state/session.js';
import type { SessionState } from '../src/state/session.js';

// ── localStorage mock ──────────────────────────────────────────────────────

function makeLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
    clear: (): void => {
      store.clear();
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
  // Reset store to known default state before each test
  sessionStore.set({
    bpm: DEFAULT_SESSION_STATE.bpm,
    view: DEFAULT_SESSION_STATE.view,
    chordMode: DEFAULT_SESSION_STATE.chordMode,
    harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: [] },
    rhythm: { layers: [] },
    composition: { blocks: [], tracks: [] },
    nowPlaying: { label: null, source: null },
  });
});

// ── Test fixtures ──────────────────────────────────────────────────────────

const MINIMAL_SAVED: SavedSession = {
  version: 4,
  bpm: 120,
  view: 'harmony',
  chordMode: 'chord',
  harmony: { root: 0, mode: 'major', octave: 3, progression: [] },
  rhythm: { layers: [] },
  composition: { blocks: [], tracks: [] },
};

const FULL_SAVED: SavedSession = {
  version: 4,
  bpm: 140,
  view: 'rhythm',
  chordMode: 'arp',
  harmony: {
    root: 5,
    mode: 'minor',
    octave: 4,
    progression: [
      { rootPc: 5, qual: 'min', gain: 0.6 },
      { rootPc: 0, qual: 'maj', gain: 0.8 },
    ],
  },
  rhythm: {
    layers: [
      { sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
      {
        sound: 'hh',
        steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        euclid: '8,16',
        muted: false,
      },
    ],
  },
  composition: {
    blocks: [
      { name: 'Groove A', type: 'groove', code: 's("bd")', bars: 4 },
      { name: 'Groove B', type: 'groove', code: 's("hh")', bars: 2 },
    ],
    tracks: [
      {
        blockRefs: [
          { blockIndex: 0, bars: 4 },
          { blockIndex: 1, bars: 2 },
        ],
      },
      { blockRefs: [{ blockIndex: 1, bars: 2 }] },
    ],
  },
};

// Runtime state with cx/cy on first chord, active nowPlaying, and real IDs
const FULL_STATE: SessionState = {
  bpm: 140,
  view: 'rhythm',
  chordMode: 'arp',
  harmony: {
    root: 5,
    mode: 'minor',
    octave: 4,
    progression: [
      { rootPc: 5, qual: 'min', gain: 0.6, cx: 100, cy: 200 }, // cx/cy must be stripped
      { rootPc: 0, qual: 'maj', gain: 0.8 },
    ],
    // Phase 08 (step 08.5): ephemeral fields required by HarmonyState type.
    subview: 'tonnetz',
    registerMode: 'suavizado',
  },
  rhythm: {
    layers: [
      { sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
      {
        sound: 'hh',
        steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        euclid: '8,16',
        muted: false,
      },
    ],
  },
  composition: {
    blocks: [
      { id: 'b10', name: 'Groove A', type: 'groove', code: 's("bd")', bars: 4 },
      { id: 'b11', name: 'Groove B', type: 'groove', code: 's("hh")', bars: 2 },
    ],
    tracks: [
      {
        id: 't5',
        blocks: [
          { blockId: 'b10', bars: 4 },
          { blockId: 'b11', bars: 2 },
        ],
      },
      { id: 't6', blocks: [{ blockId: 'b11', bars: 2 }] },
    ],
  },
  nowPlaying: { label: 'Ritmo · groove', source: 'rhythm' },
};

// ── SavedSessionSchema validation ──────────────────────────────────────────

describe('SavedSessionSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(() => SavedSessionSchema.parse(MINIMAL_SAVED)).not.toThrow();
  });

  it('accepts a full valid payload with all optional fields', () => {
    expect(SavedSessionSchema.safeParse(FULL_SAVED).success).toBe(true);
  });

  it('rejects version 1 (old schema — lossy drop per ADR 0013 D1)', () => {
    expect(SavedSessionSchema.safeParse({ ...MINIMAL_SAVED, version: 1 }).success).toBe(false);
  });

  it('rejects version 2 (old schema — lossy drop per ADR 0018 D3)', () => {
    expect(SavedSessionSchema.safeParse({ ...MINIMAL_SAVED, version: 2 }).success).toBe(false);
  });

  it('rejects version 3 (old schema — lossy drop per ADR 0019 D5)', () => {
    expect(SavedSessionSchema.safeParse({ ...MINIMAL_SAVED, version: 3 }).success).toBe(false);
  });

  it('accepts version 4 (current schema version — ADR 0019 D5)', () => {
    expect(SavedSessionSchema.safeParse({ ...MINIMAL_SAVED, version: 4 }).success).toBe(true);
  });

  it('rejects version 5 (unknown future version)', () => {
    expect(SavedSessionSchema.safeParse({ ...MINIMAL_SAVED, version: 5 }).success).toBe(false);
  });

  it('rejects bpm below 40', () => {
    expect(SavedSessionSchema.safeParse({ ...MINIMAL_SAVED, bpm: 39 }).success).toBe(false);
  });

  it('rejects bpm above 280', () => {
    expect(SavedSessionSchema.safeParse({ ...MINIMAL_SAVED, bpm: 281 }).success).toBe(false);
  });

  it('silently strips cx/cy from chord fields (Zod strips unknown keys by default)', () => {
    const withCxCy = {
      ...MINIMAL_SAVED,
      harmony: {
        ...MINIMAL_SAVED.harmony,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6, cx: 100, cy: 200 }],
      },
    };
    const result = SavedSessionSchema.safeParse(withCxCy);
    expect(result.success).toBe(true);
    if (result.success) {
      const chord = result.data.harmony.progression[0];
      expect(chord).not.toHaveProperty('cx');
      expect(chord).not.toHaveProperty('cy');
      expect(chord.rootPc).toBe(0);
    }
  });
});

// ── serializeSession ───────────────────────────────────────────────────────

describe('serializeSession', () => {
  it('excludes nowPlaying from serialized output', () => {
    const saved = serializeSession(FULL_STATE);
    expect(saved).not.toHaveProperty('nowPlaying');
  });

  it('excludes cx/cy from serialized chords', () => {
    const saved = serializeSession(FULL_STATE);
    const chord = saved.harmony.progression[0];
    expect(chord).not.toHaveProperty('cx');
    expect(chord).not.toHaveProperty('cy');
    expect(chord.rootPc).toBe(5);
    expect(chord.gain).toBe(0.6);
  });

  it('excludes block IDs from composition blocks', () => {
    const saved = serializeSession(FULL_STATE);
    saved.composition.blocks.forEach((b) => {
      expect(b).not.toHaveProperty('id');
    });
  });

  it('converts track block refs to blockIndex integers (not blockId strings)', () => {
    const saved = serializeSession(FULL_STATE);
    // t5 references b10 (index 0, bars 4) and b11 (index 1, bars 2)
    expect(saved.composition.tracks[0].blockRefs[0]).toEqual({ blockIndex: 0, bars: 4 });
    expect(saved.composition.tracks[0].blockRefs[1]).toEqual({ blockIndex: 1, bars: 2 });
    // t6 references b11 (index 1, bars 2)
    expect(saved.composition.tracks[1].blockRefs[0]).toEqual({ blockIndex: 1, bars: 2 });
  });

  it('sets version to SESSION_SCHEMA_VERSION', () => {
    const saved = serializeSession(FULL_STATE);
    expect(saved.version).toBe(SESSION_SCHEMA_VERSION);
  });
});

// ── serializeSession + deserializeSession roundtrip ───────────────────────

describe('serialize → deserialize roundtrip', () => {
  it('preserves bpm, view, and chordMode', () => {
    const back = deserializeSession(serializeSession(FULL_STATE));
    expect(back.bpm).toBe(140);
    expect(back.view).toBe('rhythm');
    expect(back.chordMode).toBe('arp');
  });

  it('preserves harmony root, mode, octave, and progression (without cx/cy)', () => {
    const back = deserializeSession(serializeSession(FULL_STATE));
    expect(back.harmony.root).toBe(5);
    expect(back.harmony.mode).toBe('minor');
    expect(back.harmony.octave).toBe(4);
    expect(back.harmony.progression).toHaveLength(2);
    expect(back.harmony.progression[0]).toEqual({ rootPc: 5, qual: 'min', gain: 0.6 });
    expect(back.harmony.progression[1]).toEqual({ rootPc: 0, qual: 'maj', gain: 0.8 });
  });

  it('preserves rhythm layers including optional fields', () => {
    const back = deserializeSession(serializeSession(FULL_STATE));
    expect(back.rhythm.layers).toHaveLength(2);
    expect(back.rhythm.layers[0].sound).toBe('bd');
    expect(back.rhythm.layers[0].steps).toHaveLength(16);
    expect(back.rhythm.layers[1].euclid).toBe('8,16');
    expect(back.rhythm.layers[1].muted).toBe(false);
  });

  it('preserves composition block fields (without ids)', () => {
    const back = deserializeSession(serializeSession(FULL_STATE));
    expect(back.composition.blocks).toHaveLength(2);
    expect(back.composition.blocks[0].name).toBe('Groove A');
    expect(back.composition.blocks[0].code).toBe('s("bd")');
    expect(back.composition.blocks[0].bars).toBe(4);
    expect(back.composition.blocks[0].type).toBe('groove');
  });
});

// ── encodeSession + decodeSession roundtrip ───────────────────────────────

describe('encodeSession / decodeSession', () => {
  it('roundtrip: decoded value equals the serialized input', () => {
    const encoded = encodeSession(FULL_STATE);
    const decoded = decodeSession(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded).toEqual(serializeSession(FULL_STATE));
  });

  it('decodeSession returns null for a corrupt / non-base64 string', () => {
    expect(decodeSession('not!!valid!!base64')).toBeNull();
  });

  it('decodeSession returns null when the decoded JSON fails schema validation', () => {
    const badPayload = btoa(encodeURIComponent(JSON.stringify({ version: 99, bpm: 120 })));
    expect(decodeSession(badPayload)).toBeNull();
  });
});

// ── applyLoadedSession ─────────────────────────────────────────────────────

describe('applyLoadedSession', () => {
  it('assigns fresh block IDs matching the counter pattern', () => {
    applyLoadedSession(FULL_SAVED);
    const state = get(sessionStore);
    state.composition.blocks.forEach((b) => {
      expect(b.id).toMatch(/^b\d+$/);
    });
  });

  it('assigns fresh track IDs matching the counter pattern', () => {
    applyLoadedSession(FULL_SAVED);
    const state = get(sessionStore);
    state.composition.tracks.forEach((t) => {
      expect(t.id).toMatch(/^t\d+$/);
    });
  });

  it('rebuilds track blockId refs to match newly assigned block IDs (not blockIndex numbers)', () => {
    applyLoadedSession(FULL_SAVED);
    const state = get(sessionStore);
    const b0id = state.composition.blocks[0].id;
    const b1id = state.composition.blocks[1].id;
    // track 0 references blockIndex 0 (bars 4) and blockIndex 1 (bars 2)
    expect(state.composition.tracks[0].blocks[0].blockId).toBe(b0id);
    expect(state.composition.tracks[0].blocks[1].blockId).toBe(b1id);
    // track 1 references blockIndex 1 (bars 2)
    expect(state.composition.tracks[1].blocks[0].blockId).toBe(b1id);
  });

  it('resets nowPlaying to null after loading', () => {
    sessionStore.update((s) => ({ ...s, nowPlaying: { label: 'Ritmo', source: 'rhythm' } }));
    applyLoadedSession(MINIMAL_SAVED);
    const state = get(sessionStore);
    expect(state.nowPlaying.label).toBeNull();
    expect(state.nowPlaying.source).toBeNull();
  });

  it('restores bpm, view, harmony, and rhythm from saved session', () => {
    applyLoadedSession(FULL_SAVED);
    const state = get(sessionStore);
    expect(state.bpm).toBe(140);
    expect(state.view).toBe('rhythm');
    expect(state.harmony.mode).toBe('minor');
    expect(state.harmony.root).toBe(5);
    expect(state.rhythm.layers).toHaveLength(2);
    expect(state.rhythm.layers[1].euclid).toBe('8,16');
  });
});

// ── localStorage helpers ───────────────────────────────────────────────────

describe('saveSession / listSavedSessions / loadSavedSession / deleteSession', () => {
  it('saveSession + listSavedSessions + loadSavedSession roundtrip', () => {
    saveSession('test-session', FULL_STATE);
    const list = listSavedSessions();
    expect(list).toContain('test-session');
    const loaded = loadSavedSession('test-session');
    expect(loaded).not.toBeNull();
    expect(loaded?.bpm).toBe(140);
    expect(loaded?.harmony.root).toBe(5);
    expect(loaded?.version).toBe(4);
  });

  it('loadSavedSession returns null for an unknown session name', () => {
    expect(loadSavedSession('no-such-session')).toBeNull();
  });

  it('deleteSession removes the session from the list and makes it unloadable', () => {
    saveSession('to-delete', FULL_STATE);
    expect(listSavedSessions()).toContain('to-delete');
    deleteSession('to-delete');
    expect(listSavedSessions()).not.toContain('to-delete');
    expect(loadSavedSession('to-delete')).toBeNull();
  });

  it('PERSISTENCE_KEY_PREFIX is used as the localStorage key prefix', () => {
    saveSession('my-session', FULL_STATE);
    expect(localStorage.getItem(PERSISTENCE_KEY_PREFIX + 'my-session')).not.toBeNull();
  });
});

// ── Rest-slot persistence (Phase 06, ADR 0012) ────────────────────────────

describe('rest-slot persistence (Phase 06, ADR 0012)', () => {
  // A-06-05: session with rest slot round-trips correctly.
  it('rest slot with bars:2 round-trips through serialize → JSON → parse → deserialize', () => {
    // Build a SessionState containing a rest slot at index 0.
    const stateWithRest: SessionState = {
      ...FULL_STATE,
      harmony: {
        ...FULL_STATE.harmony,
        progression: [{ isRest: true as const, bars: 2 }],
      },
    };
    const serialized = serializeSession(stateWithRest);
    // Verify the rest slot is in the raw JSON.
    expect(serialized.harmony.progression[0]).toEqual({ isRest: true, bars: 2 });
    // Verify JSON round-trip through schema parse.
    const raw = JSON.parse(JSON.stringify(serialized)) as unknown;
    const parseResult = SavedSessionSchema.safeParse(raw);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;
    // Verify deserialization preserves the rest slot.
    const back = deserializeSession(parseResult.data);
    expect(back.harmony.progression).toHaveLength(1);
    expect(back.harmony.progression[0]).toEqual({ isRest: true, bars: 2 });
  });

  it('mixed progression [C major, rest bars:1, F major] round-trips correctly (A-06-05)', () => {
    const stateWithMixed: SessionState = {
      ...FULL_STATE,
      harmony: {
        ...FULL_STATE.harmony,
        progression: [
          { rootPc: 0, qual: 'maj', gain: 0.6 },
          { isRest: true as const, bars: 1 },
          { rootPc: 5, qual: 'maj', gain: 0.6 },
        ],
      },
    };
    const serialized = serializeSession(stateWithMixed);
    expect(serialized.harmony.progression).toHaveLength(3);
    expect(serialized.harmony.progression[1]).toEqual({ isRest: true, bars: 1 });

    const back = deserializeSession(serialized);
    expect(back.harmony.progression).toHaveLength(3);
    expect(back.harmony.progression[0]).toEqual({ rootPc: 0, qual: 'maj', gain: 0.6 });
    expect(back.harmony.progression[1]).toEqual({ isRest: true, bars: 1 });
    expect(back.harmony.progression[2]).toEqual({ rootPc: 5, qual: 'maj', gain: 0.6 });
  });

  // A-06-06: chord-only session with current schema version still parses.
  it('version-4 session with chord-only progression parses against SavedSessionSchema', () => {
    // A chord-only session (no isRest fields) at schema v4 must parse correctly.
    const v4Payload = {
      version: 4,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6 }],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    const result = SavedSessionSchema.safeParse(v4Payload);
    expect(result.success).toBe(true);
    if (result.success) {
      // Chord slot must parse correctly as a chord (not a rest).
      expect(result.data.harmony.progression[0]).toMatchObject({
        rootPc: 0,
        qual: 'maj',
        gain: 0.6,
      });
      expect(result.data.harmony.progression[0]).not.toHaveProperty('isRest');
    }
  });

  // version-1, version-2, version-3 blobs are dropped (lossy drop per ADR 0013 D1 / ADR 0018 D3 / ADR 0019 D5).
  it('version-1 blob fails schema v4 validation and is dropped (ADR 0013 D1)', () => {
    const v1Payload = {
      version: 1,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: { root: 0, mode: 'major', octave: 3, progression: [] },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    expect(SavedSessionSchema.safeParse(v1Payload).success).toBe(false);
  });

  it('version-2 blob fails schema v4 validation and is dropped (ADR 0018 D3)', () => {
    const v2Payload = {
      version: 2,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: { root: 0, mode: 'major', octave: 3, progression: [] },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    expect(SavedSessionSchema.safeParse(v2Payload).success).toBe(false);
  });

  it('{ isRest: true } with no bars field parses and serializes correctly', () => {
    // A rest slot with no bars (defaulting to 1 cycle) is valid.
    const stateWithRestNoBars: SessionState = {
      ...FULL_STATE,
      harmony: {
        ...FULL_STATE.harmony,
        progression: [{ isRest: true as const }],
      },
    };
    const serialized = serializeSession(stateWithRestNoBars);
    // When bars is undefined, only { isRest: true } is serialized (no bars key).
    expect(serialized.harmony.progression[0]).toEqual({ isRest: true });
    // Schema accepts { isRest: true } with no bars field.
    const parseResult = SavedSessionSchema.safeParse(
      JSON.parse(JSON.stringify(serialized)) as unknown
    );
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;
    const back = deserializeSession(parseResult.data);
    expect(back.harmony.progression[0]).toEqual({ isRest: true });
  });
});

// ── Phase 02 (harmonic-rhythm-improvements) — ADR 0018 D3 schema v3 (now dropped) ─────────

describe('ADR 0018 D3: schema v3 → now dropped by v4 bump (A-02-05, A-02-06)', () => {
  // A-02-05: v2 persistence blob is gracefully dropped (v3 → v4 bump means v3 also dropped now)
  it('A-02-05: v2 blob fails z.literal(4) check and is dropped (ADR 0013 D1)', () => {
    const v2Payload = {
      version: 2,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: { root: 0, mode: 'major', octave: 3, progression: [] },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    const result = SavedSessionSchema.safeParse(v2Payload);
    expect(result.success).toBe(false);
  });

  // v3 blobs are now also dropped (ADR 0019 D5 — version literal bumped to 4).
  it('v3 blob fails z.literal(4) check and is dropped (ADR 0019 D5)', () => {
    const v3Payload = {
      version: 3,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: { root: 0, mode: 'major', octave: 3, progression: [] },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    const result = SavedSessionSchema.safeParse(v3Payload);
    expect(result.success).toBe(false);
  });

  // A-02-06: v4 blob with instrument/room/decay on a chord parses successfully
  it('A-02-06: v4 blob with instrument/room/decay on a chord parses successfully', () => {
    const v4WithAttrs = {
      version: 4,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [
          { rootPc: 0, qual: 'maj', gain: 0.6, instrument: 'sine', room: 0.5, decay: 0.2 },
        ],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    const result = SavedSessionSchema.safeParse(v4WithAttrs);
    expect(result.success).toBe(true);
    if (result.success) {
      const chord = result.data.harmony.progression[0];
      expect(chord).not.toHaveProperty('isRest');
      if ('rootPc' in chord) {
        expect(chord.instrument).toBe('sine');
        expect(chord.room).toBe(0.5);
        expect(chord.decay).toBe(0.2);
      }
    }
  });

  // A-02-06 variant: v4 blob with no new fields still parses; fields are undefined
  it('A-02-06 variant: v4 blob without new sound fields parses; fields are undefined', () => {
    const v4NoAttrs = {
      version: 4,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6 }],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    const result = SavedSessionSchema.safeParse(v4NoAttrs);
    expect(result.success).toBe(true);
    if (result.success) {
      const chord = result.data.harmony.progression[0];
      if ('rootPc' in chord) {
        expect(chord.instrument).toBeUndefined();
        expect(chord.room).toBeUndefined();
        expect(chord.decay).toBeUndefined();
      }
    }
  });

  // Sound attribute round-trip: serialize a chord with attrs, verify they survive parse
  it('chord sound attributes round-trip through serialize → parse → deserialize', () => {
    const stateWithSoundAttrs: SessionState = {
      ...FULL_STATE,
      harmony: {
        ...FULL_STATE.harmony,
        progression: [
          {
            rootPc: 0,
            qual: 'maj' as const,
            gain: 0.6,
            instrument: 'square',
            room: 0.4,
            decay: 0.3,
          },
        ],
      },
    };
    const serialized = serializeSession(stateWithSoundAttrs);
    const raw = JSON.parse(JSON.stringify(serialized)) as unknown;
    const parseResult = SavedSessionSchema.safeParse(raw);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;
    const back = deserializeSession(parseResult.data);
    const chord = back.harmony.progression[0];
    expect(chord).not.toHaveProperty('isRest');
    if ('rootPc' in chord) {
      expect(chord.instrument).toBe('square');
      expect(chord.room).toBe(0.4);
      expect(chord.decay).toBe(0.3);
    }
  });
});

// ── Phase 09 (step 09.3) — view-type schema (A-09-01, A-09-03) ─────────────
// Schema is now v4 (ADR 0019 D5) but view-type behavior is preserved.

describe("Phase 09 schema: view field 'code' and safe fallback (A-09-01, A-09-03)", () => {
  // A-09-01 + A-09-03: session saved with view:'code' round-trips under schema v4.
  it("round-trips a session with view:'code' under schema v4 (A-09-01)", () => {
    const stateWithCode: SessionState = {
      ...FULL_STATE,
      view: 'code',
    };
    const serialized = serializeSession(stateWithCode);
    // Serialized view must be 'code'.
    expect(serialized.view).toBe('code');
    expect(serialized.version).toBe(4);
    // Schema v4 accepts 'code'.
    const parseResult = SavedSessionSchema.safeParse(
      JSON.parse(JSON.stringify(serialized)) as unknown
    );
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;
    expect(parseResult.data.view).toBe('code');
    // Deserialization preserves 'code'.
    const back = deserializeSession(parseResult.data);
    expect(back.view).toBe('code');
  });

  // A-09-03: an unrecognized view string falls back to 'harmony' (safe fallback).
  it("unrecognized view string defaults to 'harmony' via .catch fallback (A-09-03)", () => {
    const unknownViewPayload = {
      version: 4,
      bpm: 120,
      view: 'unknown-future-view',
      chordMode: 'chord',
      harmony: { root: 0, mode: 'major', octave: 3, progression: [] },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    const result = SavedSessionSchema.safeParse(unknownViewPayload);
    // safeParse succeeds (does not throw) — .catch provides a valid fallback.
    expect(result.success).toBe(true);
    if (!result.success) return;
    // Unrecognized view falls back to 'harmony'.
    expect(result.data.view).toBe('harmony');
  });

  // A-09-03: SESSION_SCHEMA_VERSION is now 4 (ADR 0019 D5).
  it('SESSION_SCHEMA_VERSION is 4 (A-09-03 — bumped in ADR 0019 D5)', () => {
    expect(SESSION_SCHEMA_VERSION).toBe(4);
  });

  // A-09-01: all five view-type strings are accepted by the schema.
  it.each(['rhythm', 'harmony', 'composition', 'session', 'code'] as const)(
    "schema v4 accepts view:'%s' (A-09-01)",
    (viewValue) => {
      const payload = {
        version: 4,
        bpm: 120,
        view: viewValue,
        chordMode: 'chord',
        harmony: { root: 0, mode: 'major', octave: 3, progression: [] },
        rhythm: { layers: [] },
        composition: { blocks: [], tracks: [] },
      };
      const result = SavedSessionSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.view).toBe(viewValue);
      }
    }
  );
});

// ── Phase 03 (harmonic-rhythm-improvements) — ADR 0019 D5 schema v4 (A-03-11) ──────────

describe('ADR 0019 D5: schema v4 — preset + filter/envelope + lossy v3 drop (A-03-11)', () => {
  // A-03-11: v3 blob is rejected by z.literal(4) and loadSavedSession returns null (no crash).
  it('A-03-11: v3 blob fails z.literal(4) check — safeParse returns false (ADR 0019 D5)', () => {
    const v3Payload = {
      version: 3,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: { root: 0, mode: 'major', octave: 3, progression: [] },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    expect(SavedSessionSchema.safeParse(v3Payload).success).toBe(false);
  });

  // A-03-11: v4 blob with preset field parses successfully.
  it('A-03-11: v4 blob with preset: "piano" on a chord parses successfully', () => {
    const v4WithPreset = {
      version: 4,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6, preset: 'piano' }],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    const result = SavedSessionSchema.safeParse(v4WithPreset);
    expect(result.success).toBe(true);
    if (result.success) {
      const chord = result.data.harmony.progression[0];
      if ('rootPc' in chord) {
        expect(chord.preset).toBe('piano');
      }
    }
  });

  // A-03-11: v4 blob with all new filter/envelope fields parses successfully.
  it('A-03-11: v4 blob with full filter/envelope fields parses successfully', () => {
    const v4WithAll = {
      version: 4,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [
          {
            rootPc: 0,
            qual: 'maj',
            gain: 0.6,
            preset: 'guitar',
            lpf: 2500,
            attack: 0.01,
            sustain: 0.0,
            release: 0.3,
            lpenv: 3,
            lpa: 0.01,
            lpd: 0.25,
            lpq: 1,
          },
        ],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    const result = SavedSessionSchema.safeParse(v4WithAll);
    expect(result.success).toBe(true);
    if (result.success) {
      const chord = result.data.harmony.progression[0];
      if ('rootPc' in chord) {
        expect(chord.preset).toBe('guitar');
        expect(chord.lpf).toBe(2500);
        expect(chord.attack).toBe(0.01);
        expect(chord.sustain).toBe(0.0);
        expect(chord.release).toBe(0.3);
        expect(chord.lpenv).toBe(3);
        expect(chord.lpa).toBe(0.01);
        expect(chord.lpd).toBe(0.25);
        expect(chord.lpq).toBe(1);
      }
    }
  });

  // A-03-11: v4 blob with no new fields still parses (backward-compatible optional fields).
  it('A-03-11: v4 blob with none of the new fields parses; new fields are undefined', () => {
    const v4NoNewFields = {
      version: 4,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6 }],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    const result = SavedSessionSchema.safeParse(v4NoNewFields);
    expect(result.success).toBe(true);
    if (result.success) {
      const chord = result.data.harmony.progression[0];
      if ('rootPc' in chord) {
        expect(chord.preset).toBeUndefined();
        expect(chord.lpf).toBeUndefined();
        expect(chord.attack).toBeUndefined();
        expect(chord.sustain).toBeUndefined();
        expect(chord.release).toBeUndefined();
        expect(chord.lpenv).toBeUndefined();
        expect(chord.lpa).toBeUndefined();
        expect(chord.lpd).toBeUndefined();
        expect(chord.lpq).toBeUndefined();
      }
    }
  });

  // A-03-11: preset + new attrs round-trip through serialize → parse → deserialize.
  it('A-03-11: preset + filter/envelope attrs round-trip serialize → parse → deserialize', () => {
    const stateWithPreset: SessionState = {
      ...FULL_STATE,
      harmony: {
        ...FULL_STATE.harmony,
        progression: [
          {
            rootPc: 0,
            qual: 'maj' as const,
            gain: 0.6,
            preset: 'synth-bass' as const,
            lpf: 600,
            attack: 0.06,
            sustain: 0.8,
            release: 0.5,
            lpq: 2,
          },
        ],
      },
    };
    const serialized = serializeSession(stateWithPreset);
    const chord0 = serialized.harmony.progression[0];
    // Verify preset + attrs present in raw serialized object.
    expect(chord0).not.toHaveProperty('isRest');
    if ('rootPc' in chord0) {
      expect(chord0.preset).toBe('synth-bass');
      expect(chord0.lpf).toBe(600);
      expect(chord0.attack).toBe(0.06);
      expect(chord0.sustain).toBe(0.8);
      expect(chord0.release).toBe(0.5);
      expect(chord0.lpq).toBe(2);
    }
    // Parse and deserialize.
    const raw = JSON.parse(JSON.stringify(serialized)) as unknown;
    const parseResult = SavedSessionSchema.safeParse(raw);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;
    const back = deserializeSession(parseResult.data);
    const backChord = back.harmony.progression[0];
    expect('isRest' in backChord).toBe(false);
    if ('rootPc' in backChord) {
      expect(backChord.preset).toBe('synth-bass');
      expect(backChord.lpf).toBe(600);
      expect(backChord.attack).toBe(0.06);
      expect(backChord.sustain).toBe(0.8);
      expect(backChord.release).toBe(0.5);
      expect(backChord.lpq).toBe(2);
    }
  });

  // A-03-11: invalid preset name is rejected by z.enum.
  it('A-03-11: invalid preset name rejected by z.enum', () => {
    const v4BadPreset = {
      version: 4,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6, preset: 'violin' }],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    expect(SavedSessionSchema.safeParse(v4BadPreset).success).toBe(false);
  });

  // A-03-11: attack below 0 is rejected.
  it('A-03-11: attack below 0 is rejected (min: 0)', () => {
    const v4BadAttack = {
      version: 4,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6, attack: -0.1 }],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    expect(SavedSessionSchema.safeParse(v4BadAttack).success).toBe(false);
  });

  // A-03-11: sustain above 1 is rejected.
  it('A-03-11: sustain above 1 is rejected (max: 1)', () => {
    const v4BadSustain = {
      version: 4,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6, sustain: 1.1 }],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    };
    expect(SavedSessionSchema.safeParse(v4BadSustain).success).toBe(false);
  });
});
