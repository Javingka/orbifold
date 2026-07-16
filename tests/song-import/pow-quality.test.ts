// SPDX-License-Identifier: AGPL-3.0-only
// Tests: 'pow' quality in chordLabel, chordPcs, chordVoicing;
//        Strudel codegen for power chords; persistence schema roundtrip;
//        SESSION_SCHEMA_VERSION = 7; SCHEMA_VERSION = 7.
//
// song-import Phase 01 step 01.2 — acceptance IDs A-01-05 through A-01-15.

import { describe, it, expect } from 'vitest';
import { chordLabel, chordPcs, chordVoicing } from '../../src/core/theory/chords.js';
import { chordToStrudel, melodyLine } from '../../src/core/codegen/strudel.js';
import { SESSION_SCHEMA_VERSION, SavedSessionSchema } from '../../src/lib/persistence.js';
import { SCHEMA_VERSION } from '../../src/agent/schema.js';

// ── A-01-09: SESSION_SCHEMA_VERSION = 7 ───────────────────────────────────────

describe('SESSION_SCHEMA_VERSION (A-01-09)', () => {
  it('SESSION_SCHEMA_VERSION equals 7', () => {
    expect(SESSION_SCHEMA_VERSION).toBe(7);
  });
});

// ── A-01-10: SCHEMA_VERSION = 7 ───────────────────────────────────────────────

describe('SCHEMA_VERSION (A-01-10)', () => {
  it('SCHEMA_VERSION equals 7', () => {
    expect(SCHEMA_VERSION).toBe(7);
  });
});

// ── A-01-07: chordLabel for pow quality ───────────────────────────────────────

describe('chordLabel — pow quality (A-01-07)', () => {
  it('chordLabel(4, "pow") returns "E5" — E power chord convention', () => {
    expect(chordLabel(4, 'pow')).toBe('E5');
  });

  it('chordLabel(0, "pow") returns "C5" — C power chord', () => {
    expect(chordLabel(0, 'pow')).toBe('C5');
  });

  it('chordLabel(7, "pow") returns "G5" — G power chord', () => {
    expect(chordLabel(7, 'pow')).toBe('G5');
  });

  // A-01-13 regression: pre-existing quality labels are byte-identical
  it('regression: chordLabel(0, "maj") returns "C" (byte-identical to pre-phase)', () => {
    expect(chordLabel(0, 'maj')).toBe('C');
  });

  it('regression: chordLabel(9, "min") returns "Am" (byte-identical to pre-phase)', () => {
    expect(chordLabel(9, 'min')).toBe('Am');
  });

  it('regression: chordLabel(11, "dim") returns "B°" (byte-identical to pre-phase)', () => {
    expect(chordLabel(11, 'dim')).toBe('B°');
  });

  it('regression: chordLabel(4, "aug") returns "E+" (byte-identical to pre-phase)', () => {
    expect(chordLabel(4, 'aug')).toBe('E+');
  });
});

// ── A-01-06: chordPcs for pow quality ─────────────────────────────────────────

describe('chordPcs — pow quality (A-01-06)', () => {
  it('chordPcs(0, "pow") returns exactly two elements: [0, 7] — C power chord', () => {
    const pcs = chordPcs(0, 'pow');
    expect(pcs).toHaveLength(2);
    expect(pcs).toEqual([0, 7]);
  });

  it('chordPcs(4, "pow") returns [4, 11] — E power chord (E + B)', () => {
    const pcs = chordPcs(4, 'pow');
    expect(pcs).toHaveLength(2);
    expect(pcs).toEqual([4, 11]);
  });

  it('chordPcs(5, "pow") returns [5, 0] — F power chord (F + C, wraps mod 12)', () => {
    const pcs = chordPcs(5, 'pow');
    expect(pcs).toHaveLength(2);
    expect(pcs).toEqual([5, 0]);
  });
});

// ── chordVoicing for pow quality ─────────────────────────────────────────────

describe('chordVoicing — pow quality', () => {
  it('chordVoicing(4, "pow", 2) returns ["E2","B2"] — E power chord at octave 2', () => {
    expect(chordVoicing(4, 'pow', 2)).toEqual(['E2', 'B2']);
  });

  it('chordVoicing(5, "pow", 3) returns ["F3","C4"] — F power chord, fifth wraps to next octave', () => {
    // rootPc=5 (F), iv=7: 5+7=12, pc=(12)%12=0 (C), oct=3+floor(12/12)=3+1=4
    expect(chordVoicing(5, 'pow', 3)).toEqual(['F3', 'C4']);
  });
});

// ── A-01-08: chordToStrudel — OD-1 resolved golden strings ───────────────────

describe('chordToStrudel — pow quality (A-01-08)', () => {
  it('E power chord at octave 2, chord mode, null gain → note("E2,B2") with default chain', () => {
    // OD-1 resolution: comma-separated simultaneous notes inside note("…"),
    // identical pattern to existing chord codegen (notes.join(",")).
    // Golden: note("E2,B2").s("sawtooth").lpf(1200).gain(0.60).room(0.25)
    expect(chordToStrudel(4, 'pow', null, 'chord', 2)).toBe(
      'note("E2,B2").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'
    );
  });

  it('E power chord, chord mode, explicit gain 0.7 → gain(0.70)', () => {
    expect(chordToStrudel(4, 'pow', 0.7, 'chord', 2)).toBe(
      'note("E2,B2").s("sawtooth").lpf(1200).gain(0.70).room(0.25)'
    );
  });

  it('A power chord at octave 3, chord mode — A3 + E4 (fifth wraps octave)', () => {
    // rootPc=9 (A), iv=7: 9+7=16, pc=4 (E), oct=3+floor(16/12)=3+1=4 → E4
    expect(chordToStrudel(9, 'pow', null, 'chord', 3)).toBe(
      'note("A3,E4").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'
    );
  });

  // A-01-13 regression: non-pow chordToStrudel output is byte-identical to pre-phase
  it('regression: C major chord mode → note("C3,E3,G3") (byte-identical to pre-phase)', () => {
    // Golden from codegen.test.ts: note("C3,E3,G3").s("sawtooth").lpf(1200).gain(0.60).room(0.25)
    expect(chordToStrudel(0, 'maj', null, 'chord', 3)).toBe(
      'note("C3,E3,G3").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'
    );
  });

  it('regression: A minor chord mode → note("A3,C4,E4") (byte-identical to pre-phase)', () => {
    // Golden from codegen.test.ts: note("A3,C4,E4").s("sawtooth").lpf(1200).gain(0.60).room(0.25)
    expect(chordToStrudel(9, 'min', null, 'chord', 3)).toBe(
      'note("A3,C4,E4").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'
    );
  });
});

// ── melodyLine arrange path with pow chord ────────────────────────────────────

describe('melodyLine — pow quality in arrange path', () => {
  it('pow chord with bars=2 emits arrange segment with [E2,B2] and .slow(2)', () => {
    // A pow chord with bars≠1 forces arrange() path; inner is bracket-wrapped.
    const result = melodyLine([{ rootPc: 4, qual: 'pow', gain: 0.6, bars: 2 }], 'chord', 2);
    expect(result).toBe(
      'arrange(\n  [2, note("[E2,B2]").s("sawtooth").lpf(1200).gain(0.60).room(0.3).slow(2)]\n)'
    );
  });

  it('pow chord with bars=1 in uniform sequence still emits comma-separated notes', () => {
    // All bars=1 and only one chord → should use uniform (slowcat) path
    const result = melodyLine([{ rootPc: 4, qual: 'pow', gain: 0.6 }], 'chord', 2);
    // Single pow chord at bars=1 — uniform path: note("<[E2,B2]>").s(...).gain("<0.60>")...
    expect(result).toContain('E2,B2');
    expect(result).toContain('note(');
  });
});

// ── A-01-11: SK_QUAL includes 'pow' in persistence schema ─────────────────────

describe('SavedSessionSchema — pow quality in SK_QUAL (A-01-11)', () => {
  const BASE_SESSION = {
    version: 7,
    bpm: 120,
    view: 'harmony',
    chordMode: 'chord',
    harmony: { root: 0, mode: 'major', octave: 3, progression: [] as unknown[] },
    rhythm: { layers: [] },
    composition: { blocks: [], tracks: [] },
  };

  it('A-01-11: a chord with qual:"pow" parses successfully in SavedSessionSchema', () => {
    const payload = {
      ...BASE_SESSION,
      harmony: {
        ...BASE_SESSION.harmony,
        progression: [{ rootPc: 4, qual: 'pow', gain: 0.7 }],
      },
    };
    const result = SavedSessionSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      const slot = result.data.harmony.progression[0];
      expect('rootPc' in slot).toBe(true);
      if ('rootPc' in slot) {
        expect(slot.qual).toBe('pow');
        expect(slot.rootPc).toBe(4);
      }
    }
  });

  it('qual:"pow" round-trip: serializes and parses correctly via SavedSessionSchema', () => {
    // A serialized { rootPc: 4, qual: 'pow', gain: 0.7 } blob parses correctly.
    const payload = {
      ...BASE_SESSION,
      harmony: {
        ...BASE_SESSION.harmony,
        progression: [{ rootPc: 4, qual: 'pow', gain: 0.7 }],
      },
    };
    const result = SavedSessionSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      const slot = result.data.harmony.progression[0];
      if ('rootPc' in slot) {
        expect(slot.rootPc).toBe(4);
        expect(slot.gain).toBe(0.7);
      }
    }
  });

  it('an old v6 session blob fails SESSION_SCHEMA_VERSION = 7 check (graceful degradation)', () => {
    // Old v6 blobs fail z.literal(7) → safeParse returns false → graceful degradation.
    const v6Blob = {
      ...BASE_SESSION,
      version: 6,
    };
    const result = SavedSessionSchema.safeParse(v6Blob);
    expect(result.success).toBe(false);
  });

  it('v7 session with pow chord round-trips through safeParse', () => {
    const payload = {
      ...BASE_SESSION,
      harmony: {
        ...BASE_SESSION.harmony,
        progression: [
          { rootPc: 0, qual: 'maj', gain: 0.6 },
          { rootPc: 4, qual: 'pow', gain: 0.7 },
          { isRest: true as const },
        ],
      },
    };
    const result = SavedSessionSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.harmony.progression).toHaveLength(3);
      const slot1 = result.data.harmony.progression[1];
      if ('rootPc' in slot1) {
        expect(slot1.qual).toBe('pow');
      }
    }
  });
});
