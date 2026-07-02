// SPDX-License-Identifier: AGPL-3.0-only
// Tests: importSession golden fixture (Metallica "ONE"-inspired chart);
//        schema round-trip through SavedSessionSchema;
//        pow quality in output; Block.label in output;
//        IMPORT_SCHEMA_VERSION = 1.
//
// song-import Phase 02 step 02.2 — acceptance IDs A-02-05 through A-02-15.

import { describe, it, expect } from 'vitest';
import {
  importSession,
  ImportSessionInputSchema,
  IMPORT_SCHEMA_VERSION,
  type ImportSessionInput,
} from '../../src/agent/import-session.js';
import { SavedSessionSchema } from '../../src/lib/persistence.js';

// ── Golden fixture ─────────────────────────────────────────────────────────────
//
// Metallica "ONE"-inspired chart in B minor.
// Chosen because:
//   - "ONE" is a canonical metal song with power-chord-heavy sections.
//   - B minor / 85 bpm is a plausible approximation of the original key and feel.
//   - The fixture exercises three distinct section types:
//       Intro: pow-only (B5, G5)
//       Verse: mixed pow + triadic (E5 pow, E min, G maj)
//       Chorus: pow-only (E5, G5, A5)
//
// The fixture is HARDCODED — not computed — so that it serves as a regression
// anchor. If the importSession function changes behaviour, the test fails and
// the golden must be manually reviewed and updated.

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

// ── Expected SavedSession (hardcoded — not computed) ───────────────────────────
//
// Codegen strings were verified against melodyLine() output for each section,
// then trimmed (importSession calls .trim() on the melodyLine output).
//
// Derivation of each code field:
//   Octave default: 2 (metal/rock low register — documented in import-session.ts).
//
//   Intro [B pow @ octave 2, G pow @ octave 2]:
//     B pow: chordVoicing(11,'pow',2) → ['B2','F#3'] → [B2,F#3]
//     G pow: chordVoicing(7,'pow',2) → ['G2','D3'] → [G2,D3]
//     melodyLine uniform path → note("<[B2,F#3] [G2,D3]>").s(...).lpf(1200).gain("<0.60 0.60>").room(0.3)
//
//   Verse [E pow, E min, G maj @ octave 2]:
//     E pow: chordVoicing(4,'pow',2) → ['E2','B2'] → [E2,B2]
//     E min: chordVoicing(4,'min',2) → ['E2','G2','B2'] → [E2,G2,B2]
//     G maj: chordVoicing(7,'maj',2) → ['G2','B2','D3'] → [G2,B2,D3]
//     melodyLine uniform path → note("<[E2,B2] [E2,G2,B2] [G2,B2,D3]>").s(...).lpf(1200).gain("<0.60 0.60 0.60>").room(0.3)
//
//   Chorus [E pow, G pow, A pow @ octave 2]:
//     A pow: chordVoicing(9,'pow',2) → ['A2','E3'] → [A2,E3]
//     melodyLine uniform path → note("<[E2,B2] [G2,D3] [A2,E3]>").s(...).lpf(1200).gain("<0.60 0.60 0.60>").room(0.3)

const EXPECTED_INTRO_CODE =
  'note("<[B2,F#3] [G2,D3]>").s("sawtooth").lpf(1200).gain("<0.60 0.60>").room(0.3)';
const EXPECTED_VERSE_CODE =
  'note("<[E2,B2] [E2,G2,B2] [G2,B2,D3]>").s("sawtooth").lpf(1200).gain("<0.60 0.60 0.60>").room(0.3)';
const EXPECTED_CHORUS_CODE =
  'note("<[E2,B2] [G2,D3] [A2,E3]>").s("sawtooth").lpf(1200).gain("<0.60 0.60 0.60>").room(0.3)';

const expectedSession = {
  version: 7 as const,
  bpm: 85,
  view: 'harmony' as const,
  chordMode: 'chord' as const,
  harmony: {
    root: 11, // B = noteToPc('B') = 11
    mode: 'minor' as const,
    octave: 2,
    progression: [
      { rootPc: 11, qual: 'pow' as const, gain: 0.6 }, // B pow
      { rootPc: 7, qual: 'pow' as const, gain: 0.6 }, // G pow
    ],
  },
  rhythm: {
    layers: [
      {
        sound: 'bd' as const,
        steps: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      },
    ],
  },
  composition: {
    blocks: [
      {
        name: 'ONE — Intro',
        type: 'armonia' as const,
        code: EXPECTED_INTRO_CODE,
        bars: 2, // 2 chords × 1 bar each
        label: 'Intro',
      },
      {
        name: 'ONE — Verse',
        type: 'armonia' as const,
        code: EXPECTED_VERSE_CODE,
        bars: 3, // 3 chords × 1 bar each
        label: 'Verse',
      },
      {
        name: 'ONE — Chorus',
        type: 'armonia' as const,
        code: EXPECTED_CHORUS_CODE,
        bars: 3, // 3 chords × 1 bar each
        label: 'Chorus',
      },
    ],
    tracks: [
      {
        blockRefs: [
          { blockIndex: 0, bars: 2 },
          { blockIndex: 1, bars: 3 },
          { blockIndex: 2, bars: 3 },
        ],
      },
    ],
  },
};

// ── IMPORT_SCHEMA_VERSION ──────────────────────────────────────────────────────

describe('IMPORT_SCHEMA_VERSION (A-02-05)', () => {
  it('IMPORT_SCHEMA_VERSION equals 1', () => {
    expect(IMPORT_SCHEMA_VERSION).toBe(1);
  });
});

// ── ImportSessionInputSchema validation (A-02-06) ─────────────────────────────

describe('ImportSessionInputSchema validation (A-02-06)', () => {
  it('valid ImportSessionInput passes safeParse', () => {
    const result = ImportSessionInputSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it('bpm: 0 (out of range, below min 40) fails safeParse', () => {
    const invalid = { ...fixture, bpm: 0 };
    const result = ImportSessionInputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('bpm: 39 (just below min 40) fails safeParse', () => {
    const invalid = { ...fixture, bpm: 39 };
    const result = ImportSessionInputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('bpm: 281 (above max 280) fails safeParse', () => {
    const invalid = { ...fixture, bpm: 281 };
    const result = ImportSessionInputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('key: "H" (invalid note name) fails safeParse with clear error', () => {
    // Guard: the .refine() on key must reject invalid note names at schema boundary
    const invalid = { ...fixture, key: 'H' };
    const result = ImportSessionInputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('invalid note name'))).toBe(true);
    }
  });

  it('chord root: "H" (invalid note name) fails safeParse with clear error', () => {
    // Guard: ChordSpecSchema.root .refine() must reject invalid note names
    const invalid = {
      ...fixture,
      sections: [
        {
          label: 'Intro',
          chords: [{ root: 'H', quality: 'pow' as const }],
        },
      ],
    };
    const result = ImportSessionInputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('invalid note name'))).toBe(true);
    }
  });

  it('empty sections array fails safeParse', () => {
    const invalid = { ...fixture, sections: [] };
    const result = ImportSessionInputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('unknown mode fails safeParse', () => {
    const invalid = { ...fixture, mode: 'chromatic' };
    const result = ImportSessionInputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ── Golden output assertion (A-02-07) ─────────────────────────────────────────

describe('importSession golden output (A-02-07)', () => {
  it('importSession(fixture) deep-equals the hardcoded expected SavedSession', () => {
    const result = importSession(fixture);
    expect(result).toEqual(expectedSession);
  });
});

// ── Schema round-trip (A-02-08) ───────────────────────────────────────────────

describe('SavedSessionSchema round-trip (A-02-08)', () => {
  it('SavedSessionSchema.safeParse(importSession(fixture)).success === true', () => {
    const result = SavedSessionSchema.safeParse(importSession(fixture));
    expect(result.success).toBe(true);
  });
});

// ── pow quality in output (A-02-09) ───────────────────────────────────────────

describe('pow quality in output (A-02-09)', () => {
  it('harmony.progression from first section contains pow quality chords', () => {
    const result = importSession(fixture);
    const hasPow = result.harmony.progression.some((slot) => 'qual' in slot && slot.qual === 'pow');
    expect(hasPow).toBe(true);
  });

  it('Intro block code contains note("…") with comma-separated pair (pow codegen form)', () => {
    const result = importSession(fixture);
    const introBlock = result.composition.blocks[0];
    expect(introBlock).toBeDefined();
    // Phase 01 OD-1: pow codegen form = note("B2,F#3") inside the slowcat bracket
    expect(introBlock?.code).toContain('B2,F#3');
  });

  it('Chorus block code contains pow codegen for all three chords', () => {
    const result = importSession(fixture);
    const chorusBlock = result.composition.blocks[2];
    expect(chorusBlock).toBeDefined();
    // All three chords in Chorus are pow: E5, G5, A5
    expect(chorusBlock?.code).toContain('E2,B2');
    expect(chorusBlock?.code).toContain('G2,D3');
    expect(chorusBlock?.code).toContain('A2,E3');
  });
});

// ── Block.label in output (A-02-10) ───────────────────────────────────────────

describe('Block.label in output (A-02-10)', () => {
  it('every block has a non-empty label matching the section label', () => {
    const result = importSession(fixture);
    const sectionLabels = fixture.sections.map((s) => s.label);
    result.composition.blocks.forEach((block, idx) => {
      expect(block.label).toBeDefined();
      expect(block.label).toBe(sectionLabels[idx]);
      expect((block.label ?? '').length).toBeGreaterThan(0);
    });
  });

  it('block names follow the "<songTitle> — <sectionLabel>" convention', () => {
    const result = importSession(fixture);
    result.composition.blocks.forEach((block, idx) => {
      const sectionLabel = fixture.sections[idx]?.label;
      expect(block.name).toBe(`${fixture.songTitle} — ${sectionLabel}`);
    });
  });
});

// ── Section count (A-02-11) ───────────────────────────────────────────────────

describe('section count (A-02-11)', () => {
  it('result.composition.blocks.length === fixture.sections.length', () => {
    const result = importSession(fixture);
    expect(result.composition.blocks.length).toBe(fixture.sections.length);
    expect(result.composition.blocks.length).toBe(3);
  });
});

// ── Track structure (A-02-12) ─────────────────────────────────────────────────

describe('track structure (A-02-12)', () => {
  it('exactly one track', () => {
    const result = importSession(fixture);
    expect(result.composition.tracks).toHaveLength(1);
  });

  it('track.blockRefs.length === fixture.sections.length', () => {
    const result = importSession(fixture);
    const track = result.composition.tracks[0];
    expect(track).toBeDefined();
    expect(track?.blockRefs.length).toBe(fixture.sections.length);
    expect(track?.blockRefs.length).toBe(3);
  });

  it('blockRefs are in order with correct blockIndex values', () => {
    const result = importSession(fixture);
    const refs = result.composition.tracks[0]?.blockRefs ?? [];
    refs.forEach((ref, idx) => {
      expect(ref.blockIndex).toBe(idx);
    });
  });
});

// ── Version fields (A-02-05 / A-02-15) ───────────────────────────────────────

describe('version fields', () => {
  it('result.version === 7 (SESSION_SCHEMA_VERSION)', () => {
    const result = importSession(fixture);
    expect(result.version).toBe(7);
  });

  it('IMPORT_SCHEMA_VERSION === 1', () => {
    expect(IMPORT_SCHEMA_VERSION).toBe(1);
  });
});

// ── Regression guard (no pow for maj-only chart) ──────────────────────────────

describe('regression guard — no pow in maj-only chart', () => {
  it('maj-only chart does NOT produce comma-separated simultaneous-note form specific to pow', () => {
    const majOnlyFixture: ImportSessionInput = {
      songTitle: 'TEST',
      bpm: 120,
      key: 'C',
      mode: 'major',
      sections: [
        {
          label: 'A',
          chords: [
            { root: 'C', quality: 'maj' },
            { root: 'F', quality: 'maj' },
          ],
        },
      ],
    };
    const result = importSession(majOnlyFixture);
    const block = result.composition.blocks[0];
    // maj chords at octave 2: C maj → C2,E2,G2; F maj → F2,A2,C3
    // These contain commas, but NOT the specific 2-note form that pow generates.
    // The pow-specific pattern would be "B2,F#3" or "E2,B2" (two notes, no third).
    // For maj chords the code contains "[C2,E2,G2]" (three notes) — not two-note pow form.
    expect(block).toBeDefined();
    // C maj voicing: C2,E2,G2 — three notes, not a pow 2-note pair
    expect(block?.code).toContain('C2,E2,G2');
    // Confirm it is not a note("B2,F#3") pow form — no two-note pow pairs
    // (pow pairs in B minor: B2,F#3 / E2,B2 / G2,D3 / A2,E3 — none appear in maj-only)
    expect(block?.code).not.toContain('B2,F#3');
    expect(block?.code).not.toContain('E2,B2');
  });
});

// ── Minimal groove default ─────────────────────────────────────────────────────

describe('groove default', () => {
  it('rhythm has exactly one bd layer with kick on beats 1 and 3', () => {
    const result = importSession(fixture);
    expect(result.rhythm.layers).toHaveLength(1);
    const layer = result.rhythm.layers[0];
    expect(layer?.sound).toBe('bd');
    expect(layer?.steps).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]);
  });
});

// ── Block type ────────────────────────────────────────────────────────────────

describe('block type', () => {
  it('all blocks have type "armonia"', () => {
    const result = importSession(fixture);
    result.composition.blocks.forEach((block) => {
      expect(block.type).toBe('armonia');
    });
  });
});
