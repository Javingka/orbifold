// SPDX-License-Identifier: AGPL-3.0-only
// Tests: importAgent — extractJsonFromText, ImportSendResult shape,
//        ImportSessionInputSchema.safeParse in isolation,
//        applyLoadedSession label carry-through (A-03-11), X-05 regression.
//
// song-import Phase 03 step 03.2 — acceptance IDs A-03-06 through A-03-14.
//
// Note on fetch coverage:
//   sendImport() makes a live fetch() call to an external provider. Fetch is not
//   unit-testable in Vitest without significant mocking that would be a net negative
//   (it would test the mock, not the code). The fetch path is covered by:
//     - Static-analysis A-03-10: imports verified in import-agent.ts.
//     - Manual parity A-03-15..A-03-19: end-to-end verification in step 03.3.
//   This test file covers the pure/extractable logic:
//     - extractJsonFromText (the JSON extraction helper, exported for testability).
//     - ImportSessionInputSchema.safeParse on fixture and invalid inputs.
//     - ImportSendResult discriminated union (type-level satisfies check).
//     - applyLoadedSession label carry-through (store-coupled, using get(sessionStore)).
//     - X-05: pre-Phase-01 session (no label field) does not crash and produces no labels.

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { extractJsonFromText, type ImportSendResult } from '../../src/agent/import-agent.js';
import {
  ImportSessionInputSchema,
  importSession,
  type ImportSessionInput,
} from '../../src/agent/import-session.js';
import {
  applyLoadedSession,
  sessionStore,
  DEFAULT_SESSION_STATE,
} from '../../src/state/session.js';
import { SavedSessionSchema } from '../../src/lib/persistence.js';

// ── Golden fixture (shared with import-session.test.ts) ───────────────────────
//
// Metallica "ONE"-inspired chart. Used here to produce a SavedSession with
// labelled blocks for the applyLoadedSession carry-through test (A-03-11).

const fixture: ImportSessionInput = {
  songTitle: 'ONE',
  artist: 'Metallica',
  bpm: 85,
  key: 'B',
  mode: 'minor',
  sections: [
    {
      label: 'Intro',
      chords: [
        { root: 'B', quality: 'pow' },
        { root: 'G', quality: 'pow' },
      ],
    },
    {
      label: 'Verse',
      chords: [
        { root: 'E', quality: 'pow' },
        { root: 'E', quality: 'min' },
        { root: 'G', quality: 'maj' },
      ],
    },
    {
      label: 'Chorus',
      chords: [
        { root: 'E', quality: 'pow' },
        { root: 'G', quality: 'pow' },
        { root: 'A', quality: 'pow' },
      ],
    },
  ],
};

// ── ImportSendResult type check ────────────────────────────────────────────────
//
// Verifies that the discriminated union shape is correct at the type level.
// The `satisfies` operator confirms assignability without narrowing; if the type
// structure changes, these compile-time checks will fail.

const _okResult = { type: 'ok' as const, input: fixture } satisfies ImportSendResult;
const _errResult = { type: 'error' as const, message: 'test error' } satisfies ImportSendResult;
// Suppress unused-variable warnings — these are type-level assertions only.
void _okResult;
void _errResult;

// ── extractJsonFromText ────────────────────────────────────────────────────────

describe('extractJsonFromText', () => {
  it('extracts JSON from a ```json fence', () => {
    const txt = 'Here is the result:\n```json\n{"foo": 1}\n```\nDone.';
    // The regex /```json\s*(...)```/i captures the content after the optional
    // whitespace following "json". The leading newline is consumed by \s*.
    const result = extractJsonFromText(txt);
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(result!)).toEqual({ foo: 1 });
  });

  it('extracts JSON from a ```json fence (case-insensitive)', () => {
    const txt = '```JSON\n{"a":2}\n```';
    const result = extractJsonFromText(txt);
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(result!)).toEqual({ a: 2 });
  });

  it('falls back to outermost { … } span when no fence is present', () => {
    const txt = 'The answer is {"songTitle":"X","bpm":120} done.';
    expect(extractJsonFromText(txt)).toBe('{"songTitle":"X","bpm":120}');
  });

  it('returns the outermost braces when there are nested objects', () => {
    const txt = 'result: {"a":{"b":1}}';
    expect(extractJsonFromText(txt)).toBe('{"a":{"b":1}}');
  });

  it('returns null when no JSON structure is found', () => {
    expect(extractJsonFromText('No JSON here at all.')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractJsonFromText('')).toBeNull();
  });

  it('returns null when only an opening brace with no closing brace', () => {
    expect(extractJsonFromText('prefix { no close')).toBeNull();
  });

  it('prefers the fence over the brace-span when both are present', () => {
    // The model returns a fence plus trailing text that also has braces.
    const txt = '```json\n{"fenced":true}\n``` {"trailing":true}';
    const result = extractJsonFromText(txt);
    // Fence match takes priority — result must come from the fence, not the trailing brace.
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const parsed = JSON.parse(result!);
    expect(parsed).toHaveProperty('fenced', true);
    expect(parsed).not.toHaveProperty('trailing');
  });
});

// ── ImportSessionInputSchema.safeParse ─────────────────────────────────────────

describe('ImportSessionInputSchema.safeParse', () => {
  it('succeeds on a valid ImportSessionInput (golden fixture)', () => {
    const result = ImportSessionInputSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.songTitle).toBe('ONE');
      expect(result.data.artist).toBe('Metallica');
      expect(result.data.bpm).toBe(85);
      expect(result.data.key).toBe('B');
      expect(result.data.mode).toBe('minor');
      expect(result.data.sections).toHaveLength(3);
    }
  });

  it('succeeds with pow quality', () => {
    const input: ImportSessionInput = {
      songTitle: 'Test',
      bpm: 120,
      key: 'E',
      mode: 'minor',
      sections: [{ label: 'Intro', chords: [{ root: 'E', quality: 'pow' }] }],
    };
    const result = ImportSessionInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('succeeds with harmonic:minor mode', () => {
    const input: ImportSessionInput = {
      songTitle: 'Test',
      bpm: 120,
      key: 'A',
      mode: 'harmonic:minor',
      sections: [{ label: 'Verse', chords: [{ root: 'A', quality: 'min' }] }],
    };
    expect(ImportSessionInputSchema.safeParse(input).success).toBe(true);
  });

  it('succeeds with all 5 quality values', () => {
    const qualities = ['maj', 'min', 'dim', 'aug', 'pow'] as const;
    for (const quality of qualities) {
      const input = {
        songTitle: 'Q',
        bpm: 100,
        key: 'C',
        mode: 'major',
        sections: [{ label: 'S', chords: [{ root: 'C', quality }] }],
      };
      expect(ImportSessionInputSchema.safeParse(input).success).toBe(true);
    }
  });

  it('succeeds with all 8 mode values', () => {
    const modes = [
      'major',
      'minor',
      'dorian',
      'phrygian',
      'lydian',
      'mixolydian',
      'locrian',
      'harmonic:minor',
    ] as const;
    for (const mode of modes) {
      const input = {
        songTitle: 'M',
        bpm: 100,
        key: 'C',
        mode,
        sections: [{ label: 'S', chords: [{ root: 'C', quality: 'maj' }] }],
      };
      expect(ImportSessionInputSchema.safeParse(input).success).toBe(true);
    }
  });

  it('fails on an invalid root note name', () => {
    const input = {
      songTitle: 'Test',
      bpm: 120,
      key: 'H', // H is not a valid note name
      mode: 'major',
      sections: [{ label: 'S', chords: [{ root: 'C', quality: 'maj' }] }],
    };
    const result = ImportSessionInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('fails on an invalid quality', () => {
    const input = {
      songTitle: 'Test',
      bpm: 120,
      key: 'C',
      mode: 'major',
      sections: [{ label: 'S', chords: [{ root: 'C', quality: '7th' }] }],
    };
    expect(ImportSessionInputSchema.safeParse(input).success).toBe(false);
  });

  it('fails on an invalid mode', () => {
    const input = {
      songTitle: 'Test',
      bpm: 120,
      key: 'C',
      mode: 'blues', // not in SK_MODES
      sections: [{ label: 'S', chords: [{ root: 'C', quality: 'maj' }] }],
    };
    expect(ImportSessionInputSchema.safeParse(input).success).toBe(false);
  });

  it('fails on { error: "Canción desconocida" } (unknown-song response)', () => {
    // This is the shape the model returns when it does not know the song.
    // safeParse must fail, triggering the error path in sendImport.
    const errorResponse = { error: 'Canción desconocida' };
    const result = ImportSessionInputSchema.safeParse(errorResponse);
    expect(result.success).toBe(false);
  });

  it('fails on malformed JSON (primitive — not an object)', () => {
    expect(ImportSessionInputSchema.safeParse(null).success).toBe(false);
    expect(ImportSessionInputSchema.safeParse(42).success).toBe(false);
    expect(ImportSessionInputSchema.safeParse('text').success).toBe(false);
  });

  it('fails on missing required fields', () => {
    expect(ImportSessionInputSchema.safeParse({ songTitle: 'X' }).success).toBe(false);
    expect(ImportSessionInputSchema.safeParse({}).success).toBe(false);
  });
});

// ── A-03-11: applyLoadedSession label carry-through ────────────────────────────
//
// Produces a SavedSession from the golden fixture via importSession(), which
// attaches label = "Intro" / "Verse" / "Chorus" to the three blocks. Then calls
// applyLoadedSession() and reads the store. The loaded blocks must carry the
// same label strings — proving the Phase 03 label carry-through fix in session.ts.

describe('applyLoadedSession — label carry-through (A-03-11)', () => {
  beforeEach(() => {
    // Reset store to default state before each test to prevent bleed.
    sessionStore.set({ ...DEFAULT_SESSION_STATE });
  });

  it('carries block labels through applyLoadedSession', () => {
    const saved = importSession(fixture);

    // Confirm the SavedSession produced by importSession has labels.
    expect(saved.composition.blocks[0]?.label).toBe('Intro');
    expect(saved.composition.blocks[1]?.label).toBe('Verse');
    expect(saved.composition.blocks[2]?.label).toBe('Chorus');

    // Apply to the live store.
    applyLoadedSession(saved);

    const state = get(sessionStore);
    const blocks = state.composition.blocks;

    expect(blocks).toHaveLength(3);
    expect(blocks[0]?.label).toBe('Intro');
    expect(blocks[1]?.label).toBe('Verse');
    expect(blocks[2]?.label).toBe('Chorus');
  });

  it('carries block names and metadata through applyLoadedSession', () => {
    const saved = importSession(fixture);
    applyLoadedSession(saved);

    const state = get(sessionStore);
    const blocks = state.composition.blocks;

    // Block names follow the "<songTitle> — <sectionLabel>" convention (decisions.md).
    expect(blocks[0]?.name).toBe('ONE — Intro');
    expect(blocks[1]?.name).toBe('ONE — Verse');
    expect(blocks[2]?.name).toBe('ONE — Chorus');

    // BPM and harmony root are set from the fixture.
    expect(state.bpm).toBe(85);
    expect(state.harmony.root).toBe(11); // B = pc 11
    expect(state.harmony.mode).toBe('minor');
  });

  it('sets blocks to fresh IDs (not original block IDs)', () => {
    const saved = importSession(fixture);
    applyLoadedSession(saved);

    const blocks = get(sessionStore).composition.blocks;
    // Loaded blocks get runtime IDs starting with 'b'.
    for (const block of blocks) {
      expect(block.id).toMatch(/^b\d+$/);
    }
  });
});

// ── X-05: pre-Phase-01 session (no label field) does NOT crash ─────────────────
//
// A saved session without `label` fields (as produced by sessions before Phase 01)
// must load without error and must NOT produce label fields on the runtime blocks.
// This confirms the conditional spread in applyLoadedSession is truly non-breaking.

describe('X-05: applyLoadedSession — no label on pre-Phase-01 sessions', () => {
  beforeEach(() => {
    sessionStore.set({ ...DEFAULT_SESSION_STATE });
  });

  it('does not produce label fields when saved blocks have no label', () => {
    // Construct a minimal valid SavedSession without any label fields.
    // Use SavedSessionSchema.parse() to confirm it is valid.
    const preLabelSession = SavedSessionSchema.parse({
      version: 7,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6 }],
      },
      rhythm: {
        layers: [{ sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] }],
      },
      composition: {
        blocks: [
          // No label field — simulating pre-Phase-01 saved session.
          { name: 'My Block', type: 'groove', code: 's("bd")', bars: 1 },
        ],
        tracks: [{ blockRefs: [{ blockIndex: 0, bars: 1 }] }],
      },
    });

    // Must not throw.
    applyLoadedSession(preLabelSession);

    const blocks = get(sessionStore).composition.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.name).toBe('My Block');
    // No label field should be present (not even undefined as an explicit key).
    expect('label' in (blocks[0] ?? {})).toBe(false);
  });

  it('does not crash and loads BPM / harmony from a minimal pre-Phase-01 session', () => {
    const preLabelSession = SavedSessionSchema.parse({
      version: 7,
      bpm: 140,
      view: 'rhythm',
      chordMode: 'arp',
      harmony: {
        root: 7,
        mode: 'dorian',
        octave: 3,
        progression: [],
      },
      rhythm: {
        layers: [{ sound: 'sd', steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0] }],
      },
      composition: {
        blocks: [],
        tracks: [],
      },
    });

    applyLoadedSession(preLabelSession);

    const state = get(sessionStore);
    expect(state.bpm).toBe(140);
    expect(state.harmony.root).toBe(7); // G
    expect(state.harmony.mode).toBe('dorian');
    expect(state.composition.blocks).toHaveLength(0);
  });
});
