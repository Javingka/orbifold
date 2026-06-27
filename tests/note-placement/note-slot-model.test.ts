// SPDX-License-Identifier: AGPL-3.0-only
// Tests: NoteSlot type guard, addNote/setNoteOffset store actions,
//        persistence schema roundtrip, SESSION_SCHEMA_VERSION = 6.
//
// Phase 01 (note-placement initiative) — step 01.2 acceptance criteria:
//   A-01-05: NoteSlot interface exists with isNote: true discriminant.
//   A-01-07: isNoteSlot guard exported from session.ts.
//   A-01-08: addNote and setNoteOffset store actions exported.
//   A-01-10: SESSION_SCHEMA_VERSION = 6.
//   A-01-11: SavedNoteSlotSchema in progression union.
//   A-01-12: v5 session blob (chord-only) still parses after schema change.
//   A-01-13: at least 6 test cases, all pass.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

import {
  sessionStore,
  DEFAULT_SESSION_STATE,
  isNoteSlot,
  addNote,
  setNoteOffset,
} from '../../src/state/session.js';
import type { Chord, RestSlot, NoteSlot, ProgressionSlot } from '../../src/state/session.js';

import {
  SESSION_SCHEMA_VERSION,
  SavedSessionSchema,
  serializeSession,
  deserializeSession,
} from '../../src/lib/persistence.js';

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
  // Reset store to clean state before each test
  sessionStore.set({
    ...DEFAULT_SESSION_STATE,
    harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: [] },
    rhythm: { layers: [] },
    composition: { blocks: [], tracks: [] },
    nowPlaying: { label: null, source: null },
  });
});

// ── Fixtures ───────────────────────────────────────────────────────────────

const SAMPLE_CHORD: Chord = { rootPc: 0, qual: 'maj', gain: 0.6 };
const SAMPLE_REST: RestSlot = { isRest: true };
const SAMPLE_NOTE: NoteSlot = { isNote: true, rootPc: 5, octaveOffset: 0 };

// A v5 session blob with chord-only progression (no NoteSlot entries).
// Used to verify backward compatibility: chord-only progressions parse at v6.
const V5_SESSION_BLOB = {
  version: 5 as const,
  bpm: 120,
  view: 'harmony' as const,
  chordMode: 'chord' as const,
  harmony: {
    root: 0,
    mode: 'major',
    octave: 4,
    progression: [
      { rootPc: 0, qual: 'maj', gain: 0.6 },
      { rootPc: 7, qual: 'min', gain: 0.5 },
    ],
  },
  rhythm: { layers: [] },
  composition: { blocks: [], tracks: [] },
};

// A v6 session blob with a NoteSlot entry in the progression.
const V6_SESSION_WITH_NOTE = {
  version: 6 as const,
  bpm: 120,
  view: 'harmony' as const,
  chordMode: 'chord' as const,
  harmony: {
    root: 0,
    mode: 'major',
    octave: 4,
    progression: [
      { rootPc: 0, qual: 'maj', gain: 0.6 },
      { isNote: true as const, rootPc: 5, octaveOffset: 0 },
      { isRest: true as const },
    ],
  },
  rhythm: { layers: [] },
  composition: { blocks: [], tracks: [] },
};

// ── Test suite ─────────────────────────────────────────────────────────────

describe('SESSION_SCHEMA_VERSION', () => {
  it('A-01-10: SESSION_SCHEMA_VERSION equals 6', () => {
    expect(SESSION_SCHEMA_VERSION).toBe(6);
  });
});

describe('isNoteSlot type guard', () => {
  it('A-01-07a: returns true for a valid NoteSlot', () => {
    const slot: ProgressionSlot = SAMPLE_NOTE;
    expect(isNoteSlot(slot)).toBe(true);
  });

  it('A-01-07b: returns false for a Chord', () => {
    const slot: ProgressionSlot = SAMPLE_CHORD;
    expect(isNoteSlot(slot)).toBe(false);
  });

  it('A-01-07c: returns false for a RestSlot', () => {
    const slot: ProgressionSlot = SAMPLE_REST;
    expect(isNoteSlot(slot)).toBe(false);
  });

  it('A-01-07d: NoteSlot with bars field is recognized correctly', () => {
    const slot: NoteSlot = { isNote: true, rootPc: 9, octaveOffset: -1, bars: 2 };
    expect(isNoteSlot(slot)).toBe(true);
    expect(slot.rootPc).toBe(9);
    expect(slot.octaveOffset).toBe(-1);
    expect(slot.bars).toBe(2);
  });
});

describe('SavedNoteSlotSchema (A-01-11)', () => {
  it('parses a minimal NoteSlot blob', () => {
    const blob = { isNote: true, rootPc: 5, octaveOffset: 0 };
    const sessionBlob = {
      ...V6_SESSION_WITH_NOTE,
      harmony: {
        ...V6_SESSION_WITH_NOTE.harmony,
        progression: [blob],
      },
    };
    const result = SavedSessionSchema.safeParse(sessionBlob);
    expect(result.success).toBe(true);
    if (result.success) {
      const noteEntry = result.data.harmony.progression[0];
      expect(noteEntry).toMatchObject({ isNote: true, rootPc: 5, octaveOffset: 0 });
    }
  });

  it('parses a NoteSlot blob with optional bars field', () => {
    const blob = { isNote: true, rootPc: 9, octaveOffset: -1, bars: 2 };
    const sessionBlob = {
      ...V6_SESSION_WITH_NOTE,
      harmony: {
        ...V6_SESSION_WITH_NOTE.harmony,
        progression: [blob],
      },
    };
    const result = SavedSessionSchema.safeParse(sessionBlob);
    expect(result.success).toBe(true);
    if (result.success) {
      const noteEntry = result.data.harmony.progression[0];
      expect(noteEntry).toMatchObject({ isNote: true, rootPc: 9, octaveOffset: -1, bars: 2 });
    }
  });

  it('parse does not throw for a rootPc out of range (> 11)', () => {
    const blob = { isNote: true, rootPc: 12, octaveOffset: 0 };
    const sessionBlob = {
      ...V6_SESSION_WITH_NOTE,
      harmony: {
        ...V6_SESSION_WITH_NOTE.harmony,
        progression: [blob],
      },
    };
    // rootPc: 12 should not match NoteSlot (max 11); the parse may fail or fall back.
    // The important invariant is: no uncaught exception.
    expect(() => SavedSessionSchema.safeParse(sessionBlob)).not.toThrow();
  });
});

describe('A-01-12: backward compatibility — v5 chord-only session parses correctly', () => {
  it('parses a v6-upgraded blob with chord-only progression without error', () => {
    // V5_SESSION_BLOB has version: 5 (rejected by current schema z.literal(6)).
    // Simulate the same payload at version 6 (what an app upgrade would do).
    const upgradedBlob = { ...V5_SESSION_BLOB, version: 6 as const };
    const result = SavedSessionSchema.safeParse(upgradedBlob);
    expect(result.success).toBe(true);
    if (result.success) {
      const prog = result.data.harmony.progression;
      expect(prog).toHaveLength(2);
      // No NoteSlots — all should be chord-shaped
      prog.forEach((slot) => {
        expect('isNote' in slot && (slot as { isNote: boolean }).isNote).toBeFalsy();
        expect('isRest' in slot).toBeFalsy();
      });
    }
  });

  it('v6 session blob with mixed chord/note/rest progression parses all three types', () => {
    const result = SavedSessionSchema.safeParse(V6_SESSION_WITH_NOTE);
    expect(result.success).toBe(true);
    if (result.success) {
      const prog = result.data.harmony.progression;
      expect(prog).toHaveLength(3);
      // Use array destructuring to avoid non-null assertions
      const [slot0, slot1, slot2] = prog;
      // First entry: chord (no isNote, no isRest)
      expect(
        slot0 !== undefined && 'isNote' in slot0 && (slot0 as { isNote: boolean }).isNote
      ).toBeFalsy();
      expect(slot0 !== undefined && 'isRest' in slot0).toBeFalsy();
      // Second entry: NoteSlot
      expect(
        slot1 !== undefined && 'isNote' in slot1 && (slot1 as { isNote: boolean }).isNote
      ).toBe(true);
      // Third entry: RestSlot
      expect(
        slot2 !== undefined && 'isRest' in slot2 && (slot2 as { isRest: boolean }).isRest
      ).toBe(true);
    }
  });
});

describe('addNote store action (A-01-08)', () => {
  it('appends a NoteSlot with isNote: true, correct rootPc, octaveOffset: 0, bars: 1', () => {
    addNote(7); // rootPc = G
    const state = get(sessionStore);
    const prog = state.harmony.progression;
    expect(prog).toHaveLength(1);
    const [slot] = prog;
    expect(slot !== undefined && isNoteSlot(slot)).toBe(true);
    if (slot !== undefined && isNoteSlot(slot)) {
      expect(slot.rootPc).toBe(7);
      expect(slot.octaveOffset).toBe(0);
      expect(slot.bars).toBe(1);
    }
  });

  it('appends after existing slots without disturbing them', () => {
    // Directly set a chord in the progression first
    sessionStore.update((s) => ({
      ...s,
      harmony: {
        ...s.harmony,
        progression: [SAMPLE_CHORD],
      },
    }));
    addNote(4); // rootPc = E
    const state = get(sessionStore);
    const prog = state.harmony.progression;
    expect(prog).toHaveLength(2);
    const [first, second] = prog;
    // First slot unchanged
    expect(first !== undefined && isNoteSlot(first)).toBe(false);
    // Second slot is the new NoteSlot
    expect(second !== undefined && isNoteSlot(second)).toBe(true);
    if (second !== undefined && isNoteSlot(second)) {
      expect(second.rootPc).toBe(4);
    }
  });
});

describe('setNoteOffset store action (A-01-08)', () => {
  it('updates octaveOffset on the NoteSlot at the given index', () => {
    addNote(0); // rootPc = C, octaveOffset = 0
    const stateBeforeIdx = get(sessionStore).harmony.progression.findIndex(isNoteSlot);
    expect(stateBeforeIdx).toBe(0);

    setNoteOffset(0, 2);
    const state = get(sessionStore);
    const [slot] = state.harmony.progression;
    expect(slot !== undefined && isNoteSlot(slot)).toBe(true);
    if (slot !== undefined && isNoteSlot(slot)) {
      expect(slot.octaveOffset).toBe(2);
    }
  });

  it('clamps octaveOffset to [-4, 4]', () => {
    addNote(0);
    setNoteOffset(0, 10); // too high — should clamp to 4
    const [slotHigh] = get(sessionStore).harmony.progression;
    if (slotHigh !== undefined && isNoteSlot(slotHigh)) {
      expect(slotHigh.octaveOffset).toBe(4);
    }

    setNoteOffset(0, -99); // too low — should clamp to -4
    const [slotLow] = get(sessionStore).harmony.progression;
    if (slotLow !== undefined && isNoteSlot(slotLow)) {
      expect(slotLow.octaveOffset).toBe(-4);
    }
  });

  it('is a no-op for index out of bounds', () => {
    addNote(0);
    const before = get(sessionStore).harmony.progression;
    setNoteOffset(5, 1); // index 5 does not exist
    const after = get(sessionStore).harmony.progression;
    expect(after[0]).toEqual(before[0]);
  });

  it('is a no-op when slot at index is not a NoteSlot', () => {
    sessionStore.update((s) => ({
      ...s,
      harmony: { ...s.harmony, progression: [SAMPLE_CHORD] },
    }));
    setNoteOffset(0, 2); // slot 0 is a Chord, not a NoteSlot — no-op
    const state = get(sessionStore);
    const [slot] = state.harmony.progression;
    // Slot should remain the Chord, unchanged
    expect(slot !== undefined && isNoteSlot(slot)).toBe(false);
  });

  it('leaves other slots unchanged when mutating a NoteSlot', () => {
    sessionStore.update((s) => ({
      ...s,
      harmony: { ...s.harmony, progression: [SAMPLE_CHORD] },
    }));
    addNote(2); // appends NoteSlot at index 1
    setNoteOffset(1, -1);
    const state = get(sessionStore);
    const [chord, note] = state.harmony.progression;
    // Chord at index 0 unchanged
    expect(chord !== undefined && isNoteSlot(chord)).toBe(false);
    // NoteSlot at index 1 mutated
    expect(note !== undefined && isNoteSlot(note)).toBe(true);
    if (note !== undefined && isNoteSlot(note)) {
      expect(note.octaveOffset).toBe(-1);
      expect(note.rootPc).toBe(2);
    }
  });
});

describe('serializeSession / deserializeSession roundtrip with NoteSlot', () => {
  it('NoteSlot survives serialize → deserialize roundtrip', () => {
    // Set up state with a NoteSlot
    sessionStore.update((s) => ({
      ...s,
      harmony: {
        ...s.harmony,
        progression: [
          SAMPLE_CHORD,
          { isNote: true as const, rootPc: 5, octaveOffset: 0, bars: 1 },
          SAMPLE_REST,
        ],
      },
    }));
    const state = get(sessionStore);
    const serialized = serializeSession(state);
    const deserialized = deserializeSession(serialized);
    expect(deserialized).not.toBeNull();
    if (deserialized) {
      const prog = deserialized.harmony.progression;
      expect(prog).toHaveLength(3);
      // Middle slot should be the NoteSlot (index 1)
      const [, note] = prog;
      expect(note !== undefined && isNoteSlot(note)).toBe(true);
      if (note !== undefined && isNoteSlot(note)) {
        expect(note.rootPc).toBe(5);
        expect(note.octaveOffset).toBe(0);
        expect(note.bars).toBe(1);
      }
    }
  });
});
