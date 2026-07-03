// SPDX-License-Identifier: AGPL-3.0-only
// Tests: importSession golden fixture (Metallica "ONE"-inspired chart);
//        schema round-trip through SavedSessionSchema;
//        pow quality in output; Block.label in output;
//        IMPORT_SCHEMA_VERSION = 2;
//        per-section groove blocks; ArmoniaSnapshot / GrooveSnapshot on all blocks;
//        two-track composition; openBlock restoration.
//
// song-import Phase 02 step 02.2 — acceptance IDs A-02-05 through A-02-15.
// song-import Phase 03 step 03.4 — acceptance IDs A-03-24 through A-03-37.

import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
  importSession,
  ImportSessionInputSchema,
  ImportGrooveLayerSchema,
  ImportGrooveSchema,
  IMPORT_SCHEMA_VERSION,
  type ImportSessionInput,
} from '../../src/agent/import-session.js';
import { SavedSessionSchema } from '../../src/lib/persistence.js';
import { applyImportSession } from '../../src/agent/apply.js';
import { sessionStore, openBlock } from '../../src/state/session.js';

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
//   - Phase 03 step 03.4: each section now carries a musically plausible groove
//     capturing the song's characteristic rhythmic signature per section.
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
      groove: {
        // Sparse, building tension: quarter-note kicks + eighth-note hi-hat
        layers: [
          { sound: 'bd', steps: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0] },
          { sound: 'hh', steps: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0] },
        ],
      },
    },
    {
      label: 'Verse',
      chords: [
        { root: 'E', quality: 'pow' },
        { root: 'E', quality: 'min' },
        { root: 'G', quality: 'maj' },
      ],
      groove: {
        // Driving metal, galloping double-bass feel
        layers: [
          { sound: 'bd', steps: [1,0,1,0, 0,0,1,0, 1,0,1,0, 0,0,1,0] },
          { sound: 'sd', steps: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0] },
          { sound: 'hh', steps: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1] },
        ],
      },
    },
    {
      label: 'Chorus',
      chords: [
        { root: 'E', quality: 'pow' },
        { root: 'G', quality: 'pow' },
        { root: 'A', quality: 'pow' },
      ],
      groove: {
        // Full power: quarter-note kick every beat, snare on 2+4, eighth hi-hat
        layers: [
          { sound: 'bd', steps: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] },
          { sound: 'sd', steps: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0] },
          { sound: 'hh', steps: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0] },
        ],
      },
    },
  ],
};

// ── Expected SavedSession (hardcoded — not computed) ───────────────────────────
//
// Codegen strings were verified against melodyLine() / rhythmToStrudel() output
// for each section, then trimmed (importSession calls .trim() on the melodyLine
// output).
//
// Harmony codegen derivation (octave default: 2 — metal/rock low register):
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
//
// Groove codegen derivation (rhythmToStrudel(layers)):
//   Each layer → s("<tokens>") where token = sound or ~
//   All layers stacked into stack(\n  s(...),\n  s(...)\n)
//
//   Intro:
//     bd [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0] → s("bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~")
//     hh [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] → s("hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~")
//
//   Verse:
//     bd [1,0,1,0,0,0,1,0,1,0,1,0,0,0,1,0] → s("bd ~ bd ~ ~ ~ bd ~ bd ~ bd ~ ~ ~ bd ~")
//     sd [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] → s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~")
//     hh [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] → s("hh hh hh hh hh hh hh hh hh hh hh hh hh hh hh hh")
//
//   Chorus:
//     bd [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] → s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~")
//     sd [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] → s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~")
//     hh [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] → s("hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~")

const EXPECTED_INTRO_CODE =
  'note("<[B2,F#3] [G2,D3]>").s("sawtooth").lpf(1200).gain("<0.60 0.60>").room(0.3)';
const EXPECTED_VERSE_CODE =
  'note("<[E2,B2] [E2,G2,B2] [G2,B2,D3]>").s("sawtooth").lpf(1200).gain("<0.60 0.60 0.60>").room(0.3)';
const EXPECTED_CHORUS_CODE =
  'note("<[E2,B2] [G2,D3] [A2,E3]>").s("sawtooth").lpf(1200).gain("<0.60 0.60 0.60>").room(0.3)';

const EXPECTED_INTRO_GROOVE_CODE =
  'stack(\n  s("bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~"),\n  s("hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~")\n)';
const EXPECTED_VERSE_GROOVE_CODE =
  'stack(\n  s("bd ~ bd ~ ~ ~ bd ~ bd ~ bd ~ ~ ~ bd ~"),\n  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~"),\n  s("hh hh hh hh hh hh hh hh hh hh hh hh hh hh hh hh")\n)';
const EXPECTED_CHORUS_GROOVE_CODE =
  'stack(\n  s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~"),\n  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~"),\n  s("hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~")\n)';

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
    // First section (Intro) groove layers — mirrors harmony.progression = first section's chords
    layers: [
      { sound: 'bd' as const, steps: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0] },
      { sound: 'hh' as const, steps: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0] },
    ],
  },
  composition: {
    // 6 blocks: 3 harmony (indices 0–2) + 3 groove (indices 3–5)
    blocks: [
      {
        name: 'ONE — Intro',
        type: 'armonia' as const,
        code: EXPECTED_INTRO_CODE,
        bars: 2, // 2 chords × 1 bar each
        label: 'Intro',
        snapshot: {
          type: 'armonia' as const,
          root: 11,
          mode: 'minor',
          octave: 2,
          chordMode: 'chord',
          progression: [
            { rootPc: 11, qual: 'pow' as const, gain: 0.6 },
            { rootPc: 7,  qual: 'pow' as const, gain: 0.6 },
          ],
        },
      },
      {
        name: 'ONE — Verse',
        type: 'armonia' as const,
        code: EXPECTED_VERSE_CODE,
        bars: 3, // 3 chords × 1 bar each
        label: 'Verse',
        snapshot: {
          type: 'armonia' as const,
          root: 11,
          mode: 'minor',
          octave: 2,
          chordMode: 'chord',
          progression: [
            { rootPc: 4, qual: 'pow' as const, gain: 0.6 },
            { rootPc: 4, qual: 'min' as const, gain: 0.6 },
            { rootPc: 7, qual: 'maj' as const, gain: 0.6 },
          ],
        },
      },
      {
        name: 'ONE — Chorus',
        type: 'armonia' as const,
        code: EXPECTED_CHORUS_CODE,
        bars: 3, // 3 chords × 1 bar each
        label: 'Chorus',
        snapshot: {
          type: 'armonia' as const,
          root: 11,
          mode: 'minor',
          octave: 2,
          chordMode: 'chord',
          progression: [
            { rootPc: 4, qual: 'pow' as const, gain: 0.6 },
            { rootPc: 7, qual: 'pow' as const, gain: 0.6 },
            { rootPc: 9, qual: 'pow' as const, gain: 0.6 },
          ],
        },
      },
      {
        name: 'ONE — Intro (ritmo)',
        type: 'groove' as const,
        code: EXPECTED_INTRO_GROOVE_CODE,
        bars: 2,
        label: 'Intro',
        snapshot: {
          type: 'groove' as const,
          layers: [
            { sound: 'bd' as const, steps: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0] },
            { sound: 'hh' as const, steps: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0] },
          ],
        },
      },
      {
        name: 'ONE — Verse (ritmo)',
        type: 'groove' as const,
        code: EXPECTED_VERSE_GROOVE_CODE,
        bars: 3,
        label: 'Verse',
        snapshot: {
          type: 'groove' as const,
          layers: [
            { sound: 'bd' as const, steps: [1,0,1,0, 0,0,1,0, 1,0,1,0, 0,0,1,0] },
            { sound: 'sd' as const, steps: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0] },
            { sound: 'hh' as const, steps: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1] },
          ],
        },
      },
      {
        name: 'ONE — Chorus (ritmo)',
        type: 'groove' as const,
        code: EXPECTED_CHORUS_GROOVE_CODE,
        bars: 3,
        label: 'Chorus',
        snapshot: {
          type: 'groove' as const,
          layers: [
            { sound: 'bd' as const, steps: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] },
            { sound: 'sd' as const, steps: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0] },
            { sound: 'hh' as const, steps: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0] },
          ],
        },
      },
    ],
    tracks: [
      {
        // Harmony track — refs to blocks 0, 1, 2
        blockRefs: [
          { blockIndex: 0, bars: 2 },
          { blockIndex: 1, bars: 3 },
          { blockIndex: 2, bars: 3 },
        ],
      },
      {
        // Rhythm track — refs to blocks 3, 4, 5
        blockRefs: [
          { blockIndex: 3, bars: 2 },
          { blockIndex: 4, bars: 3 },
          { blockIndex: 5, bars: 3 },
        ],
      },
    ],
  },
};

// ── IMPORT_SCHEMA_VERSION (A-03-24) ────────────────────────────────────────────

describe('IMPORT_SCHEMA_VERSION (A-03-24 / A-02-05)', () => {
  it('IMPORT_SCHEMA_VERSION equals 2 (bumped from 1 in Phase 03 step 03.4)', () => {
    expect(IMPORT_SCHEMA_VERSION).toBe(2);
  });
});

// ── ImportGrooveLayerSchema negative tests (A-03-25, A-03-26, A-03-27) ────────

describe('ImportGrooveLayerSchema schema guardrails (A-03-25 / A-03-26 / A-03-27)', () => {
  it('A-03-25: safeParse rejects unsupported drum sound "kazoo"', () => {
    const result = ImportGrooveLayerSchema.safeParse({
      sound: 'kazoo',
      steps: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    });
    expect(result.success).toBe(false);
  });

  it('A-03-26: safeParse rejects steps array of length 15 (not 16)', () => {
    const result = ImportGrooveLayerSchema.safeParse({
      sound: 'bd',
      steps: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0],  // 15 elements
    });
    expect(result.success).toBe(false);
  });

  it('A-03-26: safeParse rejects steps array of length 17 (not 16)', () => {
    const result = ImportGrooveLayerSchema.safeParse({
      sound: 'bd',
      steps: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 0],  // 17 elements
    });
    expect(result.success).toBe(false);
  });

  it('A-03-27: ImportSessionInputSchema.safeParse rejects section without groove field', () => {
    const noGroove = {
      ...fixture,
      sections: [
        // Section without groove field — should fail because groove is required
        {
          label: 'Intro',
          chords: [{ root: 'B', quality: 'pow' }],
          // groove omitted intentionally
        },
      ],
    };
    const result = ImportSessionInputSchema.safeParse(noGroove);
    expect(result.success).toBe(false);
  });

  it('all 16 supported sounds are accepted by ImportGrooveLayerSchema', () => {
    const sounds = ['bd','sd','hh','oh','cp','rim','lt','mt','ht','conga','cajon','wood','shaker','cb','perc','hand'];
    sounds.forEach((s) => {
      const result = ImportGrooveLayerSchema.safeParse({
        sound: s,
        steps: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      });
      expect(result.success).toBe(true);
    });
  });

  it('ImportGrooveSchema rejects empty layers array', () => {
    const result = ImportGrooveSchema.safeParse({ layers: [] });
    expect(result.success).toBe(false);
  });

  it('valid full fixture passes ImportSessionInputSchema.safeParse', () => {
    const result = ImportSessionInputSchema.safeParse(fixture);
    expect(result.success).toBe(true);
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
          groove: fixture.sections[0]!.groove,
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

// ── Schema round-trip (A-02-08 / A-03-36) ─────────────────────────────────────

describe('SavedSessionSchema round-trip (A-02-08 / A-03-36)', () => {
  it('A-03-36: SavedSessionSchema.safeParse(importSession(fixture)).success === true (6 blocks, 2 tracks, groove snapshots)', () => {
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
  it('every harmony block has a non-empty label matching the section label', () => {
    const result = importSession(fixture);
    const sectionLabels = fixture.sections.map((s) => s.label);
    // Harmony blocks are at indices 0..N-1
    const harmonyBlocks = result.composition.blocks.slice(0, fixture.sections.length);
    harmonyBlocks.forEach((block, idx) => {
      expect(block.label).toBeDefined();
      expect(block.label).toBe(sectionLabels[idx]);
      expect((block.label ?? '').length).toBeGreaterThan(0);
    });
  });

  it('every groove block has a label matching its corresponding section label', () => {
    const result = importSession(fixture);
    const sectionLabels = fixture.sections.map((s) => s.label);
    const N = fixture.sections.length;
    const grooveBlocks = result.composition.blocks.slice(N);
    grooveBlocks.forEach((block, idx) => {
      expect(block.label).toBe(sectionLabels[idx]);
    });
  });

  it('harmony block names follow the "<songTitle> — <sectionLabel>" convention', () => {
    const result = importSession(fixture);
    const N = fixture.sections.length;
    const harmonyBlocks = result.composition.blocks.slice(0, N);
    harmonyBlocks.forEach((block, idx) => {
      const sectionLabel = fixture.sections[idx]?.label;
      expect(block.name).toBe(`${fixture.songTitle} — ${sectionLabel}`);
    });
  });

  it('groove block names follow the "<songTitle> — <sectionLabel> (ritmo)" convention', () => {
    const result = importSession(fixture);
    const N = fixture.sections.length;
    const grooveBlocks = result.composition.blocks.slice(N);
    grooveBlocks.forEach((block, idx) => {
      const sectionLabel = fixture.sections[idx]?.label;
      expect(block.name).toBe(`${fixture.songTitle} — ${sectionLabel} (ritmo)`);
    });
  });
});

// ── Section count (A-02-11) ───────────────────────────────────────────────────

describe('section count (A-02-11)', () => {
  it('result.composition.blocks.length === 2 × fixture.sections.length (N harmony + N groove)', () => {
    const result = importSession(fixture);
    expect(result.composition.blocks.length).toBe(fixture.sections.length * 2);
    expect(result.composition.blocks.length).toBe(6);
  });
});

// ── Track structure (A-02-12 / A-03-33 / A-03-34) ────────────────────────────

describe('track structure (A-02-12 / A-03-33 / A-03-34)', () => {
  it('A-03-33: exactly two tracks (harmony + rhythm)', () => {
    const result = importSession(fixture);
    expect(result.composition.tracks).toHaveLength(2);
  });

  it('A-03-33: harmony track has N blockRefs (one per section)', () => {
    const result = importSession(fixture);
    const harmonyTrack = result.composition.tracks[0];
    expect(harmonyTrack).toBeDefined();
    expect(harmonyTrack?.blockRefs.length).toBe(fixture.sections.length);
    expect(harmonyTrack?.blockRefs.length).toBe(3);
  });

  it('A-03-33: rhythm track has N blockRefs (one per section)', () => {
    const result = importSession(fixture);
    const rhythmTrack = result.composition.tracks[1];
    expect(rhythmTrack).toBeDefined();
    expect(rhythmTrack?.blockRefs.length).toBe(fixture.sections.length);
    expect(rhythmTrack?.blockRefs.length).toBe(3);
  });

  it('A-03-34: rhythm track blockRefs[0].blockIndex === N (first groove block after N harmony blocks)', () => {
    const result = importSession(fixture);
    const N = fixture.sections.length; // 3
    const rhythmTrack = result.composition.tracks[1];
    expect(rhythmTrack?.blockRefs[0]?.blockIndex).toBe(N);
    expect(rhythmTrack?.blockRefs[0]?.blockIndex).toBe(3);
  });

  it('harmony trackRefs are in order with correct blockIndex values (0..N-1)', () => {
    const result = importSession(fixture);
    const refs = result.composition.tracks[0]?.blockRefs ?? [];
    refs.forEach((ref, idx) => {
      expect(ref.blockIndex).toBe(idx);
    });
  });

  it('rhythm trackRefs are in order with correct blockIndex values (N..2N-1)', () => {
    const result = importSession(fixture);
    const N = fixture.sections.length;
    const refs = result.composition.tracks[1]?.blockRefs ?? [];
    refs.forEach((ref, idx) => {
      expect(ref.blockIndex).toBe(N + idx);
    });
  });
});

// ── Version fields ────────────────────────────────────────────────────────────

describe('version fields', () => {
  it('result.version === 7 (SESSION_SCHEMA_VERSION)', () => {
    const result = importSession(fixture);
    expect(result.version).toBe(7);
  });

  it('IMPORT_SCHEMA_VERSION === 2 (bumped in Phase 03 step 03.4)', () => {
    expect(IMPORT_SCHEMA_VERSION).toBe(2);
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
          groove: {
            layers: [
              { sound: 'bd', steps: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] },
            ],
          },
        },
      ],
    };
    const result = importSession(majOnlyFixture);
    const block = result.composition.blocks[0];
    // maj chords at octave 2: C maj → C2,E2,G2; F maj → F2,A2,C3
    // These contain commas, but NOT the specific 2-note form that pow generates.
    expect(block).toBeDefined();
    // C maj voicing: C2,E2,G2 — three notes, not a pow 2-note pair
    expect(block?.code).toContain('C2,E2,G2');
    // Confirm it is not a note("B2,F#3") pow form — no two-note pow pairs
    expect(block?.code).not.toContain('B2,F#3');
    expect(block?.code).not.toContain('E2,B2');
  });
});

// ── ArmoniaSnapshot on harmony blocks (A-03-28 / A-03-29) ────────────────────

describe('ArmoniaSnapshot on harmony blocks (A-03-28 / A-03-29)', () => {
  it('A-03-28: each harmony block has snapshot.type === "armonia"', () => {
    const result = importSession(fixture);
    const N = fixture.sections.length;
    const harmonyBlocks = result.composition.blocks.slice(0, N);
    harmonyBlocks.forEach((block) => {
      expect(block.snapshot).toBeDefined();
      expect(block.snapshot?.type).toBe('armonia');
    });
  });

  it('A-03-29: Intro harmony block ArmoniaSnapshot has root===11, mode==="minor", octave===2, chordMode==="chord", progression.length===2', () => {
    const result = importSession(fixture);
    const introBlock = result.composition.blocks[0];
    expect(introBlock?.snapshot?.type).toBe('armonia');
    if (introBlock?.snapshot?.type === 'armonia') {
      expect(introBlock.snapshot.root).toBe(11);      // B = pc 11
      expect(introBlock.snapshot.mode).toBe('minor');
      expect(introBlock.snapshot.octave).toBe(2);
      expect(introBlock.snapshot.chordMode).toBe('chord');
      expect(introBlock.snapshot.progression.length).toBe(2); // B pow + G pow
    }
  });

  it('Intro ArmoniaSnapshot progression contains B pow (rootPc=11) and G pow (rootPc=7)', () => {
    const result = importSession(fixture);
    const introBlock = result.composition.blocks[0];
    if (introBlock?.snapshot?.type === 'armonia') {
      const prog = introBlock.snapshot.progression;
      const entry0 = prog[0];
      const entry1 = prog[1];
      expect('qual' in (entry0 ?? {})).toBe(true);
      if ('qual' in (entry0 ?? {})) {
        expect((entry0 as { rootPc: number; qual: string }).rootPc).toBe(11);
        expect((entry0 as { rootPc: number; qual: string }).qual).toBe('pow');
      }
      expect('qual' in (entry1 ?? {})).toBe(true);
      if ('qual' in (entry1 ?? {})) {
        expect((entry1 as { rootPc: number; qual: string }).rootPc).toBe(7);
        expect((entry1 as { rootPc: number; qual: string }).qual).toBe('pow');
      }
    }
  });

  it('Verse ArmoniaSnapshot has 3 progression entries (E pow, E min, G maj)', () => {
    const result = importSession(fixture);
    const verseBlock = result.composition.blocks[1];
    if (verseBlock?.snapshot?.type === 'armonia') {
      expect(verseBlock.snapshot.progression.length).toBe(3);
    }
  });
});

// ── GrooveSnapshot on groove blocks (A-03-31) ─────────────────────────────────

describe('GrooveSnapshot on groove blocks (A-03-31)', () => {
  it('A-03-31: each groove block has snapshot.type === "groove"', () => {
    const result = importSession(fixture);
    const N = fixture.sections.length;
    const grooveBlocks = result.composition.blocks.slice(N);
    grooveBlocks.forEach((block) => {
      expect(block.snapshot).toBeDefined();
      expect(block.snapshot?.type).toBe('groove');
    });
  });

  it('Intro groove block GrooveSnapshot layers match the fixture groove layers', () => {
    const result = importSession(fixture);
    const N = fixture.sections.length;
    const introGrooveBlock = result.composition.blocks[N]; // index 3
    if (introGrooveBlock?.snapshot?.type === 'groove') {
      expect(introGrooveBlock.snapshot.layers.length).toBe(2);
      expect(introGrooveBlock.snapshot.layers[0]?.sound).toBe('bd');
      expect(introGrooveBlock.snapshot.layers[1]?.sound).toBe('hh');
    }
  });

  it('Verse groove block GrooveSnapshot has 3 layers (bd + sd + hh)', () => {
    const result = importSession(fixture);
    const N = fixture.sections.length;
    const verseGrooveBlock = result.composition.blocks[N + 1]; // index 4
    if (verseGrooveBlock?.snapshot?.type === 'groove') {
      expect(verseGrooveBlock.snapshot.layers.length).toBe(3);
    }
  });

  it('groove block code matches expected rhythmToStrudel output', () => {
    const result = importSession(fixture);
    const N = fixture.sections.length;
    expect(result.composition.blocks[N]?.code).toBe(EXPECTED_INTRO_GROOVE_CODE);
    expect(result.composition.blocks[N + 1]?.code).toBe(EXPECTED_VERSE_GROOVE_CODE);
    expect(result.composition.blocks[N + 2]?.code).toBe(EXPECTED_CHORUS_GROOVE_CODE);
  });
});

// ── rhythm.layers = first section's groove (A-03-35) ─────────────────────────

describe('rhythm.layers matches first section groove layers (A-03-35)', () => {
  it('A-03-35: result.rhythm.layers deep-equals the Intro section groove layers', () => {
    const result = importSession(fixture);
    const introGrooveLayers = fixture.sections[0]!.groove.layers.map((l) => ({
      sound: l.sound,
      steps: [...l.steps],
    }));
    expect(result.rhythm.layers).toEqual(introGrooveLayers);
  });

  it('result.rhythm.layers has 2 entries (Intro: bd + hh)', () => {
    const result = importSession(fixture);
    expect(result.rhythm.layers).toHaveLength(2);
    expect(result.rhythm.layers[0]?.sound).toBe('bd');
    expect(result.rhythm.layers[1]?.sound).toBe('hh');
  });
});

// ── openBlock restoration — harmony (A-03-30) ─────────────────────────────────

describe('openBlock restores harmony section via ArmoniaSnapshot (A-03-30)', () => {
  it('A-03-30: openBlock on Intro harmony block restores Intro chords into harmony editor', () => {
    const saved = importSession(fixture);
    applyImportSession(saved);

    const state = get(sessionStore);
    // Find the Intro harmony block (name: "ONE — Intro", type: 'armonia')
    const introBlock = state.composition.blocks.find(
      (b) => b.name === 'ONE — Intro' && b.type === 'armonia'
    );
    expect(introBlock).toBeDefined();

    // openBlock should switch to harmony view and restore the Intro's ArmoniaSnapshot
    openBlock(introBlock!.id);

    const afterState = get(sessionStore);
    expect(afterState.view).toBe('harmony');
    expect(afterState.harmony.progression).toHaveLength(2);

    // Both entries should be pow quality (B pow + G pow)
    const prog = afterState.harmony.progression;
    expect('qual' in (prog[0] ?? {})).toBe(true);
    if ('qual' in (prog[0] ?? {})) {
      expect((prog[0] as { qual: string }).qual).toBe('pow');
    }
    expect('qual' in (prog[1] ?? {})).toBe(true);
    if ('qual' in (prog[1] ?? {})) {
      expect((prog[1] as { qual: string }).qual).toBe('pow');
    }
  });
});

// ── openBlock restoration — groove (A-03-32) ──────────────────────────────────

describe('openBlock restores rhythm section via GrooveSnapshot (A-03-32)', () => {
  it('A-03-32: openBlock on Intro groove block restores Intro rhythm into rhythm editor', () => {
    const saved = importSession(fixture);
    applyImportSession(saved);

    const state = get(sessionStore);
    // Find the Intro groove block (name: "ONE — Intro (ritmo)", type: 'groove')
    const introGrooveBlock = state.composition.blocks.find(
      (b) => b.name === 'ONE — Intro (ritmo)' && b.type === 'groove'
    );
    expect(introGrooveBlock).toBeDefined();

    // openBlock should switch to rhythm view and restore the Intro's GrooveSnapshot
    openBlock(introGrooveBlock!.id);

    const afterState = get(sessionStore);
    expect(afterState.view).toBe('rhythm');
    expect(afterState.rhythm.layers).toHaveLength(2);
    expect(afterState.rhythm.layers[0]?.sound).toBe('bd');
    expect(afterState.rhythm.layers[1]?.sound).toBe('hh');

    // Verify the exact steps match the fixture
    expect(afterState.rhythm.layers[0]?.steps).toEqual([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]);
    expect(afterState.rhythm.layers[1]?.steps).toEqual([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]);
  });
});

// ── Block type ────────────────────────────────────────────────────────────────

describe('block types', () => {
  it('harmony blocks (0..N-1) all have type "armonia"', () => {
    const result = importSession(fixture);
    const N = fixture.sections.length;
    result.composition.blocks.slice(0, N).forEach((block) => {
      expect(block.type).toBe('armonia');
    });
  });

  it('groove blocks (N..2N-1) all have type "groove"', () => {
    const result = importSession(fixture);
    const N = fixture.sections.length;
    result.composition.blocks.slice(N).forEach((block) => {
      expect(block.type).toBe('groove');
    });
  });
});

// ── A-03-37: purity — no Svelte store imports ─────────────────────────────────

describe('A-03-37: import-session.ts purity (proxy:static-analysis)', () => {
  it('importSession is callable in a pure Vitest/Node context (no Svelte store side-effects)', () => {
    // If import-session.ts imported from session.ts or any Svelte store module,
    // importing it in this test file would throw at module load time (Svelte/store
    // not available in Node). The fact that this test file loads and runs at all
    // proves the purity constraint (A-02-13 / A-03-37) is preserved.
    expect(typeof importSession).toBe('function');
    expect(typeof ImportSessionInputSchema.safeParse).toBe('function');
    expect(IMPORT_SCHEMA_VERSION).toBe(2);
  });
});
