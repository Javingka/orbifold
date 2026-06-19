// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Harmony Catalog: field-validity and downsample-totality tests
// Phase 02 step 02.3 — A-02-03

import { describe, it, expect } from 'vitest';
import { NOTE_NAMES } from '../../src/core/theory/pitch.js';
import {
  HARMONY_CATALOG,
  type HarmonyEntry,
  type CatalogChord,
} from '../../src/core/music-knowledge/harmony-catalog.js';
import {
  HARMONY_QUALITIES,
  type HarmonyQuality,
} from '../../src/core/music-knowledge/rhythm-catalog.js';

// ---------------------------------------------------------------------------
// Static downsample-fallback totality table (lives ONLY in this test — not
// in source, per phase-02.md step 02.3 and inventory §e.1).
//
// Maps every one of the 17 HARMONY_QUALITIES members to a schema triad
// (AgentOutputSchema SK_QUAL = 'maj' | 'min' | 'dim' | 'aug').
// Verified that coverage is total: all 17 members are present.
// ---------------------------------------------------------------------------

type SchemaTriad = 'maj' | 'min' | 'dim' | 'aug';

const DOWNSAMPLE_TABLE: Record<HarmonyQuality, SchemaTriad> = {
  // Identity mappings (the 4 schema triads map to themselves)
  maj: 'maj',
  min: 'min',
  dim: 'dim',
  aug: 'aug',
  // Extension qualities — triad basis determines the fallback
  maj7: 'maj', // Major 7th: triad basis is major
  m7: 'min', // Minor 7th: triad basis is minor
  '7': 'maj', // Dominant 7th: triad basis is major
  m7b5: 'dim', // Half-diminished: triad basis is diminished
  dim7: 'dim', // Fully diminished: triad basis is diminished
  '6': 'maj', // Major 6th: triad basis is major
  m6: 'min', // Minor 6th: triad basis is minor
  sus2: 'maj', // Suspended 2nd (no third): closest functional triad is major
  sus4: 'maj', // Suspended 4th (no third): closest functional triad is major
  '9': 'maj', // Dominant 9th: triad basis is major
  maj9: 'maj', // Major 9th: triad basis is major
  m9: 'min', // Minor 9th: triad basis is minor
  add9: 'maj', // Add9: triad basis is major
} as const;

const SCHEMA_TRIADS = new Set<string>(['maj', 'min', 'dim', 'aug']);

// ---------------------------------------------------------------------------
// Downsample-totality tests
// ---------------------------------------------------------------------------

describe('DOWNSAMPLE_TABLE — static totality assertion', () => {
  it('has exactly 17 entries — one per HARMONY_QUALITIES member', () => {
    const tableKeys = Object.keys(DOWNSAMPLE_TABLE) as HarmonyQuality[];
    expect(tableKeys).toHaveLength(HARMONY_QUALITIES.length);
  });

  it('covers every HARMONY_QUALITIES member (no missing entry)', () => {
    for (const q of HARMONY_QUALITIES) {
      expect(DOWNSAMPLE_TABLE).toHaveProperty(q);
    }
  });

  it('every mapped value is a valid schema triad (maj | min | dim | aug)', () => {
    for (const [quality, triad] of Object.entries(DOWNSAMPLE_TABLE)) {
      expect(
        SCHEMA_TRIADS.has(triad),
        `DOWNSAMPLE_TABLE['${quality}'] = '${triad}' is not a valid schema triad`
      ).toBe(true);
    }
  });

  it('table keys are exactly the HARMONY_QUALITIES values (no extra, no missing)', () => {
    const tableKeySet = new Set(Object.keys(DOWNSAMPLE_TABLE));
    for (const q of HARMONY_QUALITIES) {
      expect(tableKeySet.has(q), `HARMONY_QUALITIES member '${q}' missing from table`).toBe(true);
    }
    for (const key of tableKeySet) {
      expect(
        (HARMONY_QUALITIES as readonly string[]).includes(key),
        `Table key '${key}' is not in HARMONY_QUALITIES`
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Catalog-level checks
// ---------------------------------------------------------------------------

describe('HARMONY_CATALOG — catalog-level invariants', () => {
  it('exists and is a non-empty array', () => {
    expect(Array.isArray(HARMONY_CATALOG)).toBe(true);
    expect(HARMONY_CATALOG.length).toBeGreaterThan(0);
  });

  it('contains at least 8 entries (A-02-03)', () => {
    expect(HARMONY_CATALOG.length).toBeGreaterThanOrEqual(8);
  });

  it('all ids are unique within the catalog (invariant 5)', () => {
    const ids = HARMONY_CATALOG.map((e: HarmonyEntry) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Per-entry field-validity tests (invariants 1–6 from inventory §d.2)
// ---------------------------------------------------------------------------

const NOTE_NAMES_SET = new Set<string>(NOTE_NAMES);
const HARMONY_QUALITIES_SET = new Set<string>(HARMONY_QUALITIES);
const VALID_PRESETS = new Set<string>(['piano', 'guitar', 'synth-bass']);
const VALID_CHORD_MODES = new Set<string>(['chord', 'arp']);

// Helper: check bars is a multiple of 0.25 (within floating-point tolerance)
function isBarsValid(bars: number): boolean {
  if (bars <= 0) return false;
  const remainder = bars % 0.25;
  return remainder < 1e-9 || Math.abs(remainder - 0.25) < 1e-9;
}

for (const entry of HARMONY_CATALOG) {
  describe(`entry "${entry.id}"`, () => {
    // Invariant 2: modeCenter ∈ NOTE_NAMES
    it('modeCenter is a valid NOTE_NAMES entry (invariant 2)', () => {
      expect(
        NOTE_NAMES_SET.has(entry.modeCenter),
        `modeCenter '${entry.modeCenter}' not in NOTE_NAMES`
      ).toBe(true);
    });

    // Invariant 3: chordMode is 'chord' | 'arp'
    it('chordMode is chord or arp', () => {
      expect(
        VALID_CHORD_MODES.has(entry.chordMode),
        `chordMode '${entry.chordMode}' is not 'chord' or 'arp'`
      ).toBe(true);
    });

    // Invariant 4: suggestedPreset (when present) ∈ valid presets
    it('suggestedPreset (when present) is a valid schema preset (invariant 4)', () => {
      if (entry.suggestedPreset !== undefined) {
        expect(
          VALID_PRESETS.has(entry.suggestedPreset),
          `suggestedPreset '${entry.suggestedPreset}' is not piano|guitar|synth-bass`
        ).toBe(true);
      }
    });

    // Invariant 5 (id uniqueness) — covered at catalog level above, but confirm id is a non-empty string
    it('id is a non-empty string', () => {
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
    });

    // Invariant 6: progression.length >= 1
    it('progression has at least one chord (invariant 6)', () => {
      expect(Array.isArray(entry.progression)).toBe(true);
      expect(entry.progression.length).toBeGreaterThanOrEqual(1);
    });

    // Per-chord validation (invariants 1, 2, 3)
    for (let i = 0; i < entry.progression.length; i++) {
      const chord: CatalogChord = entry.progression[i];

      // Invariant 1: root ∈ NOTE_NAMES
      it(`progression[${i}] root '${chord.root}' is in NOTE_NAMES (invariant 1)`, () => {
        expect(
          NOTE_NAMES_SET.has(chord.root),
          `progression[${i}].root '${chord.root}' not in NOTE_NAMES`
        ).toBe(true);
      });

      // Invariant 2: quality ∈ HARMONY_QUALITIES
      it(`progression[${i}] quality '${chord.quality}' is in HARMONY_QUALITIES (invariant 2)`, () => {
        expect(
          HARMONY_QUALITIES_SET.has(chord.quality),
          `progression[${i}].quality '${chord.quality}' not in HARMONY_QUALITIES`
        ).toBe(true);
      });

      // Invariant 3: bars is a multiple of 0.25
      it(`progression[${i}] bars=${chord.bars} is a multiple of 0.25 (invariant 3)`, () => {
        expect(
          isBarsValid(chord.bars),
          `progression[${i}].bars=${chord.bars} is not a positive multiple of 0.25`
        ).toBe(true);
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('HARMONY_CATALOG — edge cases', () => {
  it('catalog has at least one arp entry', () => {
    const arpEntries = HARMONY_CATALOG.filter((e: HarmonyEntry) => e.chordMode === 'arp');
    expect(arpEntries.length).toBeGreaterThanOrEqual(1);
  });

  it('catalog has at least one entry with suggestedPreset', () => {
    const withPreset = HARMONY_CATALOG.filter((e: HarmonyEntry) => e.suggestedPreset !== undefined);
    expect(withPreset.length).toBeGreaterThanOrEqual(1);
  });

  it('catalog has at least one entry using an extended quality (non-triad)', () => {
    const extendedQualities = new Set<string>([
      'maj7',
      'm7',
      '7',
      'm7b5',
      'dim7',
      '6',
      'm6',
      'sus2',
      'sus4',
      '9',
      'maj9',
      'm9',
      'add9',
    ]);
    const hasExtended = HARMONY_CATALOG.some((e: HarmonyEntry) =>
      e.progression.some((c: CatalogChord) => extendedQualities.has(c.quality))
    );
    expect(hasExtended).toBe(true);
  });
});
