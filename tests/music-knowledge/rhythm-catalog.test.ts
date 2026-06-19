// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Tests: rhythm catalog congruence invariants

import { describe, it, expect } from 'vitest';
import {
  RHYTHM_CATALOG,
  HARMONY_QUALITIES,
  type RhythmEntry,
} from '../../src/core/music-knowledge/rhythm-catalog.js';
import { bjorklund, rotate } from '../../src/core/rhythm/euclid.js';

// ---------------------------------------------------------------------------
// Invariant 1: binary.length === entry.steps
// ---------------------------------------------------------------------------
describe('Invariant 1 — binary.length === steps', () => {
  for (const entry of RHYTHM_CATALOG) {
    it(`${entry.id}: binary.length(${entry.binary.length}) === steps(${entry.steps})`, () => {
      expect(entry.binary.length).toBe(entry.steps);
    });
  }
});

// ---------------------------------------------------------------------------
// Invariant 2: onsets equals the indices of '1's in binary
// ---------------------------------------------------------------------------
describe('Invariant 2 — onsets match binary 1-positions', () => {
  for (const entry of RHYTHM_CATALOG) {
    it(`${entry.id}: onsets match binary`, () => {
      const expected = [...entry.binary]
        .map((c, i) => (c === '1' ? i : -1))
        .filter((i): i is number => i >= 0);
      expect(entry.onsets).toEqual(expected);
    });
  }
});

// ---------------------------------------------------------------------------
// Invariant 3: mini token count === steps; onset tokens at onsets positions
// ---------------------------------------------------------------------------
describe('Invariant 3 — mini tokens', () => {
  for (const entry of RHYTHM_CATALOG) {
    it(`${entry.id}: mini has ${entry.steps} space-separated tokens`, () => {
      const tokens = entry.mini.split(' ');
      expect(tokens.length).toBe(entry.steps);
    });

    it(`${entry.id}: mini onset tokens align with onsets`, () => {
      const tokens = entry.mini.split(' ');
      // All tokens at onset positions must be 'x'
      for (const onset of entry.onsets) {
        expect(tokens[onset]).toBe('x');
      }
      // All tokens NOT at onset positions must be '~'
      const onsetSet = new Set(entry.onsets);
      for (let i = 0; i < tokens.length; i++) {
        if (!onsetSet.has(i)) {
          expect(tokens[i]).toBe('~');
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Invariant 4: strudelStrategy === 'euclid' iff euclid field present
// ---------------------------------------------------------------------------
describe('Invariant 4 — strudelStrategy ↔ euclid field presence', () => {
  for (const entry of RHYTHM_CATALOG) {
    it(`${entry.id}: strudelStrategy '${entry.strudelStrategy}' consistent with euclid field`, () => {
      if (entry.strudelStrategy === 'euclid') {
        expect(entry.euclid).toBeDefined();
      } else {
        expect(entry.euclid).toBeUndefined();
      }
    });

    it(`${entry.id}: euclid field ${entry.euclid ? 'present' : 'absent'} implies strategy '${entry.euclid ? 'euclid' : 'struct'}'`, () => {
      if (entry.euclid !== undefined) {
        expect(entry.strudelStrategy).toBe('euclid');
      } else {
        expect(entry.strudelStrategy).toBe('struct');
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Invariant 5: euclid entries reproduce binary via real euclid.ts engine
// ---------------------------------------------------------------------------
describe('Invariant 5 — euclid entries reproduce binary via bjorklund+rotate', () => {
  const euclidEntries = RHYTHM_CATALOG.filter((e) => e.strudelStrategy === 'euclid');

  // Sanity: there must be euclid entries to test
  it('catalog contains at least one euclid-strategy entry', () => {
    expect(euclidEntries.length).toBeGreaterThan(0);
  });

  for (const entry of euclidEntries) {
    // euclidEntries is filtered to strudelStrategy === 'euclid', so euclid is always present.
    // We extract values in a type-safe way to avoid the non-null assertion rule.
    const euclid = entry.euclid ?? { k: 0, n: 1, rot: 0 };
    it(`${entry.id}: E(${euclid.k},${euclid.n},${euclid.rot}) reproduces binary`, () => {
      const { k, n, rot } = entry.euclid ?? { k: 0, n: 1, rot: 0 };
      const computed = rotate(bjorklund(k, n), rot).join('');
      expect(computed).toBe(entry.binary);
    });
  }
});

// ---------------------------------------------------------------------------
// Catalog-level checks
// ---------------------------------------------------------------------------
describe('RHYTHM_CATALOG catalog-level checks', () => {
  it('contains at least 30 entries', () => {
    expect(RHYTHM_CATALOG.length).toBeGreaterThanOrEqual(30);
  });

  it('all ids are unique', () => {
    const ids = RHYTHM_CATALOG.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all ids are non-empty strings', () => {
    for (const entry of RHYTHM_CATALOG) {
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
    }
  });

  it('all entries have at least one role', () => {
    for (const entry of RHYTHM_CATALOG) {
      expect(entry.roles.length).toBeGreaterThan(0);
    }
  });

  it('all entries have at least one tradition', () => {
    for (const entry of RHYTHM_CATALOG) {
      expect(entry.traditions.length).toBeGreaterThan(0);
    }
  });

  it('steps is a positive integer for all entries', () => {
    for (const entry of RHYTHM_CATALOG) {
      expect(Number.isInteger(entry.steps)).toBe(true);
      expect(entry.steps).toBeGreaterThan(0);
    }
  });

  it('binary contains only 0 and 1 characters', () => {
    for (const entry of RHYTHM_CATALOG) {
      expect(entry.binary).toMatch(/^[01]+$/);
    }
  });

  it('catalog covers multiple step counts (OD-2 native grids)', () => {
    const stepCounts = new Set(RHYTHM_CATALOG.map((e) => e.steps));
    // Must have at least: 8, 12, 16, and an odd meter
    expect(stepCounts.has(8)).toBe(true);
    expect(stepCounts.has(12)).toBe(true);
    expect(stepCounts.has(16)).toBe(true);
    // At least one odd-meter step count (not 8, 12, or 16)
    const oddCounts = [...stepCounts].filter((s) => s !== 8 && s !== 12 && s !== 16);
    expect(oddCounts.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// HARMONY_QUALITIES export check (lives in rhythm-catalog.ts)
// ---------------------------------------------------------------------------
describe('HARMONY_QUALITIES export', () => {
  it('exports exactly 17 quality tokens', () => {
    expect(HARMONY_QUALITIES.length).toBe(17);
  });

  it('contains all expected quality tokens', () => {
    const expected = [
      'maj',
      'min',
      'dim',
      'aug',
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
    ] as const;
    for (const q of expected) {
      expect((HARMONY_QUALITIES as readonly string[]).includes(q)).toBe(true);
    }
  });

  it('all entries are non-empty strings', () => {
    for (const q of HARMONY_QUALITIES) {
      expect(typeof q).toBe('string');
      expect(q.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Type guard check: RhythmEntry interface is satisfied by all catalog entries
// ---------------------------------------------------------------------------
describe('RhythmEntry type satisfaction', () => {
  it('every catalog entry satisfies the RhythmEntry interface shape', () => {
    for (const entry of RHYTHM_CATALOG) {
      // Type-cast to RhythmEntry to ensure TS is happy at compile time
      const e: RhythmEntry = entry;
      expect(typeof e.id).toBe('string');
      expect(typeof e.name).toBe('string');
      expect(typeof e.family).toBe('string');
      expect(Array.isArray(e.traditions)).toBe(true);
      expect(typeof e.meter).toBe('string');
      expect(typeof e.steps).toBe('number');
      expect(Array.isArray(e.roles)).toBe(true);
      expect(typeof e.binary).toBe('string');
      expect(Array.isArray(e.onsets)).toBe(true);
      expect(typeof e.mini).toBe('string');
      expect(['euclid', 'struct'].includes(e.strudelStrategy)).toBe(true);
    }
  });
});
