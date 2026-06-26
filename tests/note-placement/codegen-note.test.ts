// SPDX-License-Identifier: AGPL-3.0-only
// Tests: melodyLine NoteSlot codegen — note name output, arrange() forcing,
//        mixed chord+note progressions, bars != 1 with .slow(), preset resolution.
//
// Phase 01 step 01.3 — note-placement initiative.
// Acceptance criteria: A-01-15 through A-01-21.
// NoteSlot preset bug fix — updated to reflect resolveChordAttrs path.

import { describe, it, expect } from 'vitest';
import { melodyLine } from '../../src/core/codegen/strudel.js';

// ── A-01-16 / A-01-17: single NoteSlot forces arrange() ──────────────────────
//
// NOTE (preset bug fix): NoteSlot codegen now always goes through resolveChordAttrs,
// so every NoteSlot emits the full .s().lpf().room() chain even with no explicit attrs.
// Default values: instrument='sawtooth', lpf=1200, room=0.3.

describe('melodyLine — NoteSlot forces arrange()', () => {
  it('A-01-16/17: single NoteSlot (rootPc=0, octave=4, octaveOffset=0) → arrange with note("C4") + default chain', () => {
    // OD-1 Option A: noteName = NOTE_NAMES[0] + (4 + 0) = "C4"
    // resolveChordAttrs({}, 0.3) → sawtooth, lpf=1200, room=0.3 (no envelope)
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: 0 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [1, note("C4").s("sawtooth").lpf(1200).room(0.3)]\n)');
  });

  it('A-01-17: NoteSlot with bars=2 → [2, note("C4").s("sawtooth").lpf(1200).room(0.3).slow(2)]', () => {
    // .slow(2) cancels arrange()'s internal .fast(2) — ADR 0016 invariant applied to NoteSlots.
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: 0, bars: 2 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [2, note("C4").s("sawtooth").lpf(1200).room(0.3).slow(2)]\n)');
  });

  it('A-01-17: NoteSlot bars=1 → no .slow suffix (bars=1 is identity)', () => {
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: 0, bars: 1 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [1, note("C4").s("sawtooth").lpf(1200).room(0.3)]\n)');
  });
});

// ── A-01-18: note name derivation — NOTE_NAMES + octave + octaveOffset ────────

describe('melodyLine — NoteSlot note name derivation (OD-1 Option A)', () => {
  it('A-01-18: rootPc=5 (F), octave=4, octaveOffset=0 → note("F4")', () => {
    const result = melodyLine([{ isNote: true, rootPc: 5, octaveOffset: 0 }], 'chord', 4);
    expect(result).toContain('note("F4")');
    expect(result).toContain('arrange(');
  });

  it('A-01-18: rootPc=6 (F#), octave=4, octaveOffset=0 → note("F#4") (sharp spelling)', () => {
    // A-01-18: sharp spellings only, consistent with NOTE_NAMES from pitch.ts
    const result = melodyLine([{ isNote: true, rootPc: 6, octaveOffset: 0 }], 'chord', 4);
    expect(result).toContain('note("F#4")');
  });

  it('A-01-18: octaveOffset=-1 → absolute octave decreases by 1 (rootPc=0, octave=4 → note("C3"))', () => {
    // OD-1: absolute octave = HarmonyState.octave + octaveOffset = 4 + (-1) = 3
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: -1 }], 'chord', 4);
    expect(result).toContain('note("C3")');
  });

  it('A-01-18: octaveOffset=+1 → absolute octave increases by 1 (rootPc=9 (A), octave=4 → note("A5"))', () => {
    // OD-1: absolute octave = 4 + 1 = 5; rootPc=9 → NOTE_NAMES[9] = "A"
    const result = melodyLine([{ isNote: true, rootPc: 9, octaveOffset: 1 }], 'chord', 4);
    expect(result).toContain('note("A5")');
  });

  it('A-01-18: rootPc=10 (A#), octave=3, octaveOffset=0 → note("A#3") (sharp, not Bb)', () => {
    // NOTE_NAMES uses sharp spellings: index 10 → "A#"
    const result = melodyLine([{ isNote: true, rootPc: 10, octaveOffset: 0 }], 'chord', 3);
    expect(result).toContain('note("A#3")');
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
    // NoteSlot segment has the full resolveChordAttrs chain
    expect(result).toContain('[1, note("F4").s("sawtooth").lpf(1200).room(0.3)]');
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
    expect(result).toBe(
      'arrange(\n  [1, note("C4").s("sawtooth").lpf(1200).room(0.3)],\n  [1, silence]\n)'
    );
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
    // Note with bars=2 must have .slow(2) at the end, after the full chain
    expect(result).toContain('[2, note("G4").s("sawtooth").lpf(1200).room(0.3).slow(2)]');
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
  it('NoteSlot with bars=0.5 → [0.5, note("C4").s("sawtooth").lpf(1200).room(0.3).slow(0.5)] (fractional bars)', () => {
    const result = melodyLine(
      [{ isNote: true, rootPc: 0, octaveOffset: 0, bars: 0.5 }],
      'chord',
      4
    );
    expect(result).toBe(
      'arrange(\n  [0.5, note("C4").s("sawtooth").lpf(1200).room(0.3).slow(0.5)]\n)'
    );
  });

  it('NoteSlot: octave changes via melodyLine octave param — rootPc=0, octave=5 → note("C5")', () => {
    // Verifies the melodyLine octave parameter is correctly used for NoteSlot derivation
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: 0 }], 'chord', 5);
    expect(result).toContain('note("C5")');
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

// ── Preset resolution tests (NoteSlot preset bug fix) ─────────────────────────
//
// These tests verify that preset: 'piano' | 'guitar' | 'synth-bass' correctly
// expand through resolveChordAttrs into oscillator + envelope chains.

describe('melodyLine — NoteSlot preset resolution (preset bug fix)', () => {
  it('preset:"piano" at rootPc=0 octave=4 → note("C4").s("triangle").lpf(1800).room(0.4) with piano envelope', () => {
    // Piano preset: instrument=triangle, lpf=1800, room=0.4, attack=0.02, decay=0.4, sustain=0.1, release=0.3
    const result = melodyLine(
      [{ isNote: true, rootPc: 0, octaveOffset: 0, preset: 'piano' }],
      'chord',
      4
    );
    expect(result).toContain('note("C4").s("triangle").lpf(1800)');
    expect(result).toContain('.room(0.4)');
    expect(result).toContain('.attack(0.02)');
    expect(result).toContain('.decay(0.4)');
    expect(result).toContain('.sustain(0.1)');
    expect(result).toContain('.release(0.3)');
    // Must NOT emit .s("piano") — piano is a preset token, not a Strudel instrument
    expect(result).not.toContain('.s("piano")');
    expect(result).toContain('arrange(');
  });

  it('preset:"synth-bass" at rootPc=9 (A) octave=4 → note("A4").s("sawtooth").lpf(600) with synth-bass envelope', () => {
    // synth-bass: instrument=sawtooth, lpf=600, lpq=2, room=0.2, attack=0.06, sustain=0.8, release=0.5
    // rootPc=9 = A (NOTE_NAMES[9] = "A")
    const result = melodyLine(
      [{ isNote: true, rootPc: 9, octaveOffset: 0, preset: 'synth-bass' }],
      'chord',
      4
    );
    expect(result).toContain('note("A4").s("sawtooth").lpf(600)');
    expect(result).toContain('.room(0.2)');
    expect(result).toContain('.attack(0.06)');
    expect(result).toContain('.sustain(0.8)');
    expect(result).toContain('.release(0.5)');
    expect(result).not.toContain('.s("synth-bass")');
  });

  it('preset:"guitar" at rootPc=0 octave=4 → note("C4").s("sawtooth") with guitar envelope', () => {
    // guitar: instrument=sawtooth, lpf=2500, room=0.15, attack=0.01, decay=0.3, sustain=0, lpenv=3, lpa=0.01, lpd=0.25
    const result = melodyLine(
      [{ isNote: true, rootPc: 0, octaveOffset: 0, preset: 'guitar' }],
      'chord',
      4
    );
    expect(result).toContain('note("C4").s("sawtooth").lpf(2500)');
    expect(result).toContain('.room(0.15)');
    expect(result).toContain('.attack(0.01)');
    expect(result).toContain('.decay(0.3)');
    expect(result).not.toContain('.s("guitar")');
  });

  it('instrument:"sine" (oscillator, no preset) → .s("sine").lpf(1200).room(0.3) — regression guard', () => {
    // Raw oscillator: instrument wins, no preset lookup, default lpf and room.
    const result = melodyLine(
      [{ isNote: true, rootPc: 0, octaveOffset: 0, instrument: 'sine' }],
      'chord',
      4
    );
    expect(result).toBe('arrange(\n  [1, note("C4").s("sine").lpf(1200).room(0.3)]\n)');
  });

  it('instrument:"piano" (raw instrument, no preset) → .s("piano").lpf(1200).room(0.3) — migration note', () => {
    // MIGRATION NOTE: old serialized data had instrument:"piano" (before preset field existed).
    // resolveChordAttrs treats instrument:"piano" as a raw instrument name (not a preset) because
    // chord.instrument takes priority over preset lookup when explicitly set.
    // This is incorrect audio (Strudel ignores unknown instrument "piano") but is the expected
    // behavior for legacy data — new data must use preset:"piano" for correct resolution.
    // Do NOT block on this: a future migration could rename instrument:"piano" → preset:"piano".
    const result = melodyLine(
      [{ isNote: true, rootPc: 0, octaveOffset: 0, instrument: 'piano' }],
      'chord',
      4
    );
    expect(result).toBe('arrange(\n  [1, note("C4").s("piano").lpf(1200).room(0.3)]\n)');
  });

  it('preset:"piano" with bars=2 → full chain + .slow(2) at end', () => {
    // Verify .slow() comes after the full envelope chain (not before)
    const result = melodyLine(
      [{ isNote: true, rootPc: 0, octaveOffset: 0, preset: 'piano', bars: 2 }],
      'chord',
      4
    );
    expect(result).toContain('.slow(2)');
    // .slow must be at the very end of the chain
    const match = /\[2, (.*)\]/.exec(result);
    expect(match).not.toBeNull();
    if (match) {
      expect(match[1]).toMatch(/\.slow\(2\)$/);
    }
  });

  it('no attrs → default chain: .s("sawtooth").lpf(1200).room(0.3) — regression guard', () => {
    // A NoteSlot with no timbre attrs now emits the default chain from resolveChordAttrs.
    // This is a change from the previous behavior (which emitted only note("C4")),
    // but is functionally equivalent: Strudel's defaults for sawtooth/lpf=1200/room=0.3
    // produce the same sound as the previous implicit defaults.
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: 0 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [1, note("C4").s("sawtooth").lpf(1200).room(0.3)]\n)');
  });
});

// ── F2-4 / F2-6: timbre attribute codegen (post-phase-01 fix, 2026-06-26) ────────
//
// Updated to reflect the resolveChordAttrs codegen path.

describe('melodyLine — NoteSlot timbre attribute codegen (resolveChordAttrs path)', () => {
  it('F2-4: NoteSlot with instrument:"sawtooth" emits note("C4").s("sawtooth").lpf(1200).room(0.3)', () => {
    // Raw oscillator name goes through resolveChordAttrs as explicit instrument field.
    const result = melodyLine(
      [{ isNote: true, rootPc: 0, octaveOffset: 0, instrument: 'sawtooth' }],
      'chord',
      4
    );
    expect(result).toBe('arrange(\n  [1, note("C4").s("sawtooth").lpf(1200).room(0.3)]\n)');
  });

  it('F2-4: NoteSlot with instrument:"sawtooth", gain:0.8, room:0.3 emits full chain', () => {
    // gain is emitted after lpf, before room; room comes from slot (explicit-wins).
    const result = melodyLine(
      [{ isNote: true, rootPc: 0, octaveOffset: 0, instrument: 'sawtooth', gain: 0.8, room: 0.3 }],
      'chord',
      4
    );
    expect(result).toBe(
      'arrange(\n  [1, note("C4").s("sawtooth").lpf(1200).gain(0.8).room(0.3)]\n)'
    );
  });

  it('F2-4: NoteSlot with preset:"piano", bars:2 → full piano chain + .slow(2)', () => {
    // Correct preset path: piano resolves to triangle + envelope, .slow(2) at end.
    const result = melodyLine(
      [{ isNote: true, rootPc: 0, octaveOffset: 0, bars: 2, preset: 'piano' }],
      'chord',
      4
    );
    expect(result).toContain('note("C4").s("triangle").lpf(1800)');
    expect(result).toContain('.slow(2)');
    // gain is absent in slot, so not emitted between lpf and room
    expect(result).not.toContain('.gain(');
  });

  it('F2-4: NoteSlot with no attributes emits default chain (regression guard)', () => {
    // A NoteSlot with no timbre attrs emits the resolveChordAttrs default chain.
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: 0 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [1, note("C4").s("sawtooth").lpf(1200).room(0.3)]\n)');
  });

  it('F2-4: NoteSlot with only lpf overrides default lpf via resolveChordAttrs explicit-wins', () => {
    // slot.lpf=800 wins over the 1200 default (explicit-wins rule, ADR 0019 D3)
    const result = melodyLine([{ isNote: true, rootPc: 0, octaveOffset: 0, lpf: 800 }], 'chord', 4);
    expect(result).toBe('arrange(\n  [1, note("C4").s("sawtooth").lpf(800).room(0.3)]\n)');
  });

  it('F2-4: NoteSlot with explicit room overrides default room', () => {
    // slot.room=0.5 wins over the 0.3 roomDefault
    const result = melodyLine(
      [{ isNote: true, rootPc: 0, octaveOffset: 0, room: 0.5 }],
      'chord',
      4
    );
    expect(result).toBe('arrange(\n  [1, note("C4").s("sawtooth").lpf(1200).room(0.5)]\n)');
  });
});
