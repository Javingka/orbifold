// SPDX-License-Identifier: AGPL-3.0-only
// Tests: melodyLine NoteSlot codegen — note name output, arrange() forcing,
//        mixed chord+note progressions, bars != 1 with .slow().
//
// Phase 01 step 01.3 — note-placement initiative.
// Acceptance criteria: A-01-15 through A-01-21.

import { describe, it, expect } from 'vitest';
import { melodyLine } from '../../src/core/codegen/strudel.js';

// ── A-01-16 / A-01-17: single NoteSlot forces arrange() ──────────────────────

describe('melodyLine — NoteSlot forces arrange()', () => {
  it('A-01-16/17: single NoteSlot (rootPc=0, octave=4, octaveOffset=0) → arrange with note("C4")', () => {
    // OD-1 Option A: noteName = NOTE_NAMES[0] + (4 + 0) = "C4"
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: 0 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [1, note("C4")]\n)');
  });

  it('A-01-17: NoteSlot with bars=2 → [2, note("C4").slow(2)]', () => {
    // .slow(2) cancels arrange()'s internal .fast(2) — ADR 0016 invariant applied to NoteSlots.
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: 0, bars: 2 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [2, note("C4").slow(2)]\n)');
  });

  it('A-01-17: NoteSlot bars=1 → no .slow suffix (bars=1 is identity)', () => {
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: 0, bars: 1 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [1, note("C4")]\n)');
  });
});

// ── A-01-18: note name derivation — NOTE_NAMES + octave + octaveOffset ────────

describe('melodyLine — NoteSlot note name derivation (OD-1 Option A)', () => {
  it('A-01-18: rootPc=5 (F), octave=4, octaveOffset=0 → note("F4")', () => {
    const result = melodyLine([{ isNote: true, rootPc: 5, octaveOffset: 0 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [1, note("F4")]\n)');
  });

  it('A-01-18: rootPc=6 (F#), octave=4, octaveOffset=0 → note("F#4") (sharp spelling)', () => {
    // A-01-18: sharp spellings only, consistent with NOTE_NAMES from pitch.ts
    const result = melodyLine([{ isNote: true, rootPc: 6, octaveOffset: 0 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [1, note("F#4")]\n)');
  });

  it('A-01-18: octaveOffset=-1 → absolute octave decreases by 1 (rootPc=0, octave=4 → note("C3"))', () => {
    // OD-1: absolute octave = HarmonyState.octave + octaveOffset = 4 + (-1) = 3
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: -1 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [1, note("C3")]\n)');
  });

  it('A-01-18: octaveOffset=+1 → absolute octave increases by 1 (rootPc=9 (A), octave=4 → note("A5"))', () => {
    // OD-1: absolute octave = 4 + 1 = 5; rootPc=9 → NOTE_NAMES[9] = "A"
    const result = melodyLine([{ isNote: true, rootPc: 9, octaveOffset: 1 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [1, note("A5")]\n)');
  });

  it('A-01-18: rootPc=10 (A#), octave=3, octaveOffset=0 → note("A#3") (sharp, not Bb)', () => {
    // NOTE_NAMES uses sharp spellings: index 10 → "A#"
    const result = melodyLine([{ isNote: true, rootPc: 10, octaveOffset: 0 }], 'chord', 3);
    expect(result).toBe('arrange(\n  [1, note("A#3")]\n)');
  });
});

// ── A-01-16: mixed chord + NoteSlot → arrange() forced ───────────────────────

describe('melodyLine — mixed progressions force arrange()', () => {
  it('A-01-16: [Chord, NoteSlot] → arrange() forced (not slowcat)', () => {
    const result = melodyLine(
      [
        { rootPc: 0, qual: 'maj' },
        { isNote: true, rootPc: 5, octaveOffset: 0 },
      ],
      'chord',
      4
    );
    // arrange() must be used — not the <...> slowcat form
    expect(result).toContain('arrange(');
    expect(result).not.toContain('note("<');
    // Chord segment carries the full attribute chain (from the arrange path)
    expect(result).toContain(
      '[1, note("[C4,E4,G4]").s("sawtooth").lpf(1200).gain(0.60).room(0.3)]'
    );
    // NoteSlot segment is the simple form
    expect(result).toContain('[1, note("F4")]');
  });

  it('A-01-16: [NoteSlot, RestSlot] → arrange() with note("...") and silence', () => {
    const result = melodyLine(
      [
        { isNote: true, rootPc: 0, octaveOffset: 0 },
        { isRest: true, bars: 1 },
      ],
      'chord',
      4
    );
    expect(result).toBe('arrange(\n  [1, note("C4")],\n  [1, silence]\n)');
  });

  it('A-01-16: [NoteSlot(bars=2), RestSlot, Chord] → arrange() with all three segments', () => {
    const result = melodyLine(
      [
        { isNote: true, rootPc: 7, octaveOffset: 0, bars: 2 },
        { isRest: true },
        { rootPc: 0, qual: 'maj' },
      ],
      'chord',
      4
    );
    expect(result).toContain('arrange(');
    // Note with bars=2 must have .slow(2)
    expect(result).toContain('[2, note("G4").slow(2)]');
    // Rest segment
    expect(result).toContain('[1, silence]');
    // Chord segment carries the full attribute chain (from the arrange path)
    expect(result).toContain(
      '[1, note("[C4,E4,G4]").s("sawtooth").lpf(1200).gain(0.60).room(0.3)]'
    );
  });
});

// ── A-01-19: chord-only progression is byte-identical ─────────────────────────

describe('melodyLine — regression guard: chord-only output unchanged', () => {
  it('A-01-19: chord-only uniform progression → same slowcat output as before (regression guard)', () => {
    // This is the byte-identical test: no NoteSlot, output must be unchanged.
    // Golden from pre-phase codegen.test.ts (A-02-01 baseline):
    const result = melodyLine(
      [
        { rootPc: 0, qual: 'maj' },
        { rootPc: 9, qual: 'min' },
      ],
      'chord',
      3
    );
    expect(result).toBe(
      '  note("<[C3,E3,G3] [A3,C4,E4]>").s("sawtooth").lpf(1200).gain("<0.60 0.60>").room(0.3)'
    );
  });

  it('A-01-19: chord-only arrange path (bars:2) → same arrange() output as before (regression guard)', () => {
    // Golden from codegen.test.ts "byte-identical at default — arrange path":
    const result = melodyLine([{ rootPc: 0, qual: 'maj', bars: 2 }], 'chord', 3);
    expect(result).toBe(
      'arrange(\n  [2, note("[C3,E3,G3]").s("sawtooth").lpf(1200).gain(0.60).room(0.3).slow(2)]\n)'
    );
  });

  it('A-01-19: chord-only with rest → arrange() output unchanged (regression guard)', () => {
    // Golden from A-06-01 test in codegen.test.ts:
    const result = melodyLine([{ isRest: true, bars: 2 }], 'chord', 3);
    expect(result).toBe('arrange(\n  [2, silence]\n)');
  });
});

// ── A-01-20: edge cases ────────────────────────────────────────────────────────

describe('melodyLine — NoteSlot edge cases', () => {
  it('NoteSlot with bars=0.5 → [0.5, note("C4").slow(0.5)] (fractional bars)', () => {
    const result = melodyLine(
      [{ isNote: true, rootPc: 0, octaveOffset: 0, bars: 0.5 }],
      'chord',
      4
    );
    expect(result).toBe('arrange(\n  [0.5, note("C4").slow(0.5)]\n)');
  });

  it('NoteSlot: octave changes via melodyLine octave param — rootPc=0, octave=5 → note("C5")', () => {
    // Verifies the melodyLine octave parameter is correctly used for NoteSlot derivation
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: 0 }], 'chord', 5);
    expect(result).toBe('arrange(\n  [1, note("C5")]\n)');
  });

  it('NoteSlot: all 12 pitch classes produce sharp note names (no flat spellings)', () => {
    // OD-1 guarantee: NOTE_NAMES only contains sharp spellings
    for (let pc = 0; pc < 12; pc++) {
      const result = melodyLine([{ isNote: true, rootPc: pc, octaveOffset: 0 }], 'chord', 4);
      // Must not contain flat note names
      expect(result).not.toMatch(/note\("(Bb|Db|Eb|Gb|Ab)[\d]"\)/);
      // Must contain arrange() and note(...)
      expect(result).toContain('arrange(');
      expect(result).toContain('note("');
    }
  });
});
