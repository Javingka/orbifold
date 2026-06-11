// SPDX-License-Identifier: AGPL-3.0-only
// Vitest unit tests for noteToStaffPosition in src/core/harmony/staff-map.ts.
// Diatonic coordinate system: steps = one unit per letter-name, C4 = 0.
// All ledger-line assertions use toEqual (exact arrays), not toContain.
// Prototype parity: note-name format matches NOTE_NAMES from
// src/core/theory/pitch.ts (reference/orbifold.html line 592) — sharp spellings
// only for production voicings; flat input handled for robustness.

import { describe, it, expect } from 'vitest';
import {
  noteToStaffPosition,
  TREBLE_STAFF_LINES,
  STAFF_BOTTOM,
  STAFF_TOP,
} from '../../src/core/harmony/staff-map.js';

// ──────────────────────────────────────────────────────────────────────────────
// Staff constants
// ──────────────────────────────────────────────────────────────────────────────

describe('staff constants', () => {
  it('TREBLE_STAFF_LINES equals [2, 4, 6, 8, 10] (diatonic positions: E4, G4, B4, D5, F5)', () => {
    expect(TREBLE_STAFF_LINES).toEqual([2, 4, 6, 8, 10]);
  });

  it('STAFF_BOTTOM = 2 (E4)', () => {
    expect(STAFF_BOTTOM).toBe(2);
  });

  it('STAFF_TOP = 10 (F5)', () => {
    expect(STAFF_TOP).toBe(10);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-05-05: C4 — middle C, one ledger line below treble staff
// steps = 0 (C=0, octave=4 → 0 + (4-4)*7 = 0)
// below-staff walk: k=0, 0≥0 push; k=-2, -2≥0 false → [0]
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — C4 (middle C)', () => {
  it('A-05-05: steps = 0', () => {
    expect(noteToStaffPosition('C4').steps).toBe(0);
  });

  it('A-05-05: accidental = ""', () => {
    expect(noteToStaffPosition('C4').accidental).toBe('');
  });

  it('A-05-05: ledgerLines = [0] (exact — middle C ledger line only)', () => {
    expect(noteToStaffPosition('C4').ledgerLines).toEqual([0]);
  });

  it('A-05-05: full object equals { steps: 0, accidental: "", ledgerLines: [0] }', () => {
    expect(noteToStaffPosition('C4')).toEqual({ steps: 0, accidental: '', ledgerLines: [0] });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// D4 — in the space above middle C, no ledger line
// steps = 1 (D=1, octave=4 → 1 + 0 = 1)
// below-staff walk: k=0, 0≥1 false → []
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — D4 (space above middle C)', () => {
  it('steps = 1', () => {
    expect(noteToStaffPosition('D4').steps).toBe(1);
  });

  it('accidental = ""', () => {
    expect(noteToStaffPosition('D4').accidental).toBe('');
  });

  it('ledgerLines = [] (note in space above C4; no ledger line for spaces)', () => {
    expect(noteToStaffPosition('D4').ledgerLines).toEqual([]);
  });

  it('full object equals { steps: 1, accidental: "", ledgerLines: [] }', () => {
    expect(noteToStaffPosition('D4')).toEqual({ steps: 1, accidental: '', ledgerLines: [] });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// On-staff notes: E4, G4, B4, D5, F5 — no ledger lines
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — E4 (bottom staff line)', () => {
  it('steps = 2 (E=2, octave=4)', () => {
    expect(noteToStaffPosition('E4').steps).toBe(2);
  });

  it('accidental = ""', () => {
    expect(noteToStaffPosition('E4').accidental).toBe('');
  });

  it('ledgerLines = [] (on-staff note at STAFF_BOTTOM)', () => {
    expect(noteToStaffPosition('E4').ledgerLines).toEqual([]);
  });

  it('full object equals { steps: 2, accidental: "", ledgerLines: [] }', () => {
    expect(noteToStaffPosition('E4')).toEqual({ steps: 2, accidental: '', ledgerLines: [] });
  });
});

describe('noteToStaffPosition — G4 (second staff line)', () => {
  it('A-05-06: steps = 4 (G=4, octave=4)', () => {
    expect(noteToStaffPosition('G4').steps).toBe(4);
  });

  it('A-05-06: accidental = ""', () => {
    expect(noteToStaffPosition('G4').accidental).toBe('');
  });

  it('A-05-06: ledgerLines = [] (on-staff note)', () => {
    expect(noteToStaffPosition('G4').ledgerLines).toEqual([]);
  });

  it('A-05-06: full object equals { steps: 4, accidental: "", ledgerLines: [] }', () => {
    expect(noteToStaffPosition('G4')).toEqual({ steps: 4, accidental: '', ledgerLines: [] });
  });
});

describe('noteToStaffPosition — B4 (middle staff line)', () => {
  it('steps = 6 (B=6, octave=4)', () => {
    expect(noteToStaffPosition('B4').steps).toBe(6);
  });

  it('accidental = ""', () => {
    expect(noteToStaffPosition('B4').accidental).toBe('');
  });

  it('ledgerLines = [] (on-staff note)', () => {
    expect(noteToStaffPosition('B4').ledgerLines).toEqual([]);
  });

  it('full object equals { steps: 6, accidental: "", ledgerLines: [] }', () => {
    expect(noteToStaffPosition('B4')).toEqual({ steps: 6, accidental: '', ledgerLines: [] });
  });
});

describe('noteToStaffPosition — D5 (fourth staff line)', () => {
  it('steps = 8 (D=1, octave=5 → 1+(5-4)*7=8)', () => {
    expect(noteToStaffPosition('D5').steps).toBe(8);
  });

  it('accidental = ""', () => {
    expect(noteToStaffPosition('D5').accidental).toBe('');
  });

  it('ledgerLines = [] (on-staff note)', () => {
    expect(noteToStaffPosition('D5').ledgerLines).toEqual([]);
  });

  it('full object equals { steps: 8, accidental: "", ledgerLines: [] }', () => {
    expect(noteToStaffPosition('D5')).toEqual({ steps: 8, accidental: '', ledgerLines: [] });
  });
});

describe('noteToStaffPosition — F5 (top staff line, STAFF_TOP)', () => {
  it('steps = 10 (F=3, octave=5 → 3+(5-4)*7=10)', () => {
    expect(noteToStaffPosition('F5').steps).toBe(10);
  });

  it('accidental = ""', () => {
    expect(noteToStaffPosition('F5').accidental).toBe('');
  });

  it('ledgerLines = [] (on-staff note at STAFF_TOP)', () => {
    expect(noteToStaffPosition('F5').ledgerLines).toEqual([]);
  });

  it('full object equals { steps: 10, accidental: "", ledgerLines: [] }', () => {
    expect(noteToStaffPosition('F5')).toEqual({ steps: 10, accidental: '', ledgerLines: [] });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// G5 — one diatonic step above staff (space; no ledger line)
// steps = 11 (G=4, octave=5 → 4+(5-4)*7=11)
// above-staff walk: k=12, 12≤11 false → []
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — G5 (space above top staff line)', () => {
  it('steps = 11', () => {
    expect(noteToStaffPosition('G5').steps).toBe(11);
  });

  it('accidental = ""', () => {
    expect(noteToStaffPosition('G5').accidental).toBe('');
  });

  it('ledgerLines = [] (G5 is in the space above F5; no ledger line for spaces)', () => {
    expect(noteToStaffPosition('G5').ledgerLines).toEqual([]);
  });

  it('full object equals { steps: 11, accidental: "", ledgerLines: [] }', () => {
    expect(noteToStaffPosition('G5')).toEqual({ steps: 11, accidental: '', ledgerLines: [] });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A5 — first ledger line above staff
// steps = 12 (A=5, octave=5 → 5+(5-4)*7=12)
// above-staff walk: k=12, 12≤12 push; k=14, 14≤12 false → [12]
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — A5 (first ledger line above staff)', () => {
  it('steps = 12', () => {
    expect(noteToStaffPosition('A5').steps).toBe(12);
  });

  it('accidental = ""', () => {
    expect(noteToStaffPosition('A5').accidental).toBe('');
  });

  it('ledgerLines = [12] (one ledger line above staff)', () => {
    expect(noteToStaffPosition('A5').ledgerLines).toEqual([12]);
  });

  it('full object equals { steps: 12, accidental: "", ledgerLines: [12] }', () => {
    expect(noteToStaffPosition('A5')).toEqual({ steps: 12, accidental: '', ledgerLines: [12] });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// C6 — second ledger line above staff
// steps = 14 (C=0, octave=6 → 0+(6-4)*7=14)
// above-staff walk: k=12 push; k=14, 14≤14 push; k=16, 16≤14 false → [12, 14]
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — C6 (second ledger line above staff)', () => {
  it('steps = 14', () => {
    expect(noteToStaffPosition('C6').steps).toBe(14);
  });

  it('accidental = ""', () => {
    expect(noteToStaffPosition('C6').accidental).toBe('');
  });

  it('ledgerLines = [12, 14] (two ledger lines above staff)', () => {
    expect(noteToStaffPosition('C6').ledgerLines).toEqual([12, 14]);
  });

  it('full object equals { steps: 14, accidental: "", ledgerLines: [12, 14] }', () => {
    expect(noteToStaffPosition('C6')).toEqual({ steps: 14, accidental: '', ledgerLines: [12, 14] });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-05-07: F#3 — below staff with sharp accidental
// steps = -4 (F=3, octave=3 → 3+(3-4)*7 = 3-7 = -4; accidental='#' does NOT change steps)
// below-staff walk: k=0,−2,−4 all ≥ −4; k=−6, −6≥−4 false → [0, −2, −4]
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — F#3 (A-05-07: below staff with sharp)', () => {
  it('A-05-07: steps = -4 (same diatonic position as F3; accidental does not change steps)', () => {
    expect(noteToStaffPosition('F#3').steps).toBe(-4);
  });

  it('A-05-07: accidental = "#"', () => {
    expect(noteToStaffPosition('F#3').accidental).toBe('#');
  });

  it('A-05-07: ledgerLines = [0, -2, -4] (exact — three ledger lines from C4 down to F3)', () => {
    expect(noteToStaffPosition('F#3').ledgerLines).toEqual([0, -2, -4]);
  });

  it('A-05-07: full object equals { steps: -4, accidental: "#", ledgerLines: [0, -2, -4] }', () => {
    expect(noteToStaffPosition('F#3')).toEqual({
      steps: -4,
      accidental: '#',
      ledgerLines: [0, -2, -4],
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Additional below-staff cases (from spec golden table)
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — B3 (one step below staff)', () => {
  // B=6, octave=3 → 6 + (3-4)*7 = 6-7 = -1
  // below-staff: k=0, 0≥-1 push; k=-2, -2≥-1 false → [0]
  it('steps = -1', () => {
    expect(noteToStaffPosition('B3').steps).toBe(-1);
  });

  it('ledgerLines = [0] (one ledger line for note in space below C4)', () => {
    expect(noteToStaffPosition('B3').ledgerLines).toEqual([0]);
  });
});

describe('noteToStaffPosition — A3 (on first below-staff ledger line)', () => {
  // A=5, octave=3 → 5 + (3-4)*7 = 5-7 = -2
  // below-staff: k=0 push; k=-2, -2≥-2 push; k=-4, -4≥-2 false → [0, -2]
  it('steps = -2', () => {
    expect(noteToStaffPosition('A3').steps).toBe(-2);
  });

  it('ledgerLines = [0, -2] (two ledger lines down to A3)', () => {
    expect(noteToStaffPosition('A3').ledgerLines).toEqual([0, -2]);
  });
});

describe('noteToStaffPosition — G3 (space between A3 and F3 ledger lines)', () => {
  // G=4, octave=3 → 4 + (3-4)*7 = 4-7 = -3
  // below-staff: k=0 push; k=-2 push; k=-4, -4≥-3 false → [0, -2]
  it('steps = -3', () => {
    expect(noteToStaffPosition('G3').steps).toBe(-3);
  });

  it('ledgerLines = [0, -2] (note in space; only ledger lines above it included)', () => {
    expect(noteToStaffPosition('G3').ledgerLines).toEqual([0, -2]);
  });
});

describe('noteToStaffPosition — F3 (on second below-staff ledger line)', () => {
  // F=3, octave=3 → 3 + (3-4)*7 = 3-7 = -4
  // below-staff: k=0,-2,-4 all ≥-4; k=-6, -6≥-4 false → [0, -2, -4]
  it('steps = -4 (same as F#3)', () => {
    expect(noteToStaffPosition('F3').steps).toBe(-4);
  });

  it('ledgerLines = [0, -2, -4] (three ledger lines to F3)', () => {
    expect(noteToStaffPosition('F3').ledgerLines).toEqual([0, -2, -4]);
  });
});

describe('noteToStaffPosition — E3 (space between F3 and D3 ledger lines)', () => {
  // E=2, octave=3 → 2 + (3-4)*7 = 2-7 = -5
  // below-staff: k=0,-2,-4 all ≥-5 (-4≥-5); k=-6, -6≥-5 false → [0, -2, -4]
  it('steps = -5', () => {
    expect(noteToStaffPosition('E3').steps).toBe(-5);
  });

  it('ledgerLines = [0, -2, -4] (note in space; ledger lines above it only)', () => {
    expect(noteToStaffPosition('E3').ledgerLines).toEqual([0, -2, -4]);
  });
});

describe('noteToStaffPosition — D3 (on third below-staff ledger line)', () => {
  // D=1, octave=3 → 1 + (3-4)*7 = 1-7 = -6
  // below-staff: k=0,-2,-4,-6 all ≥-6; k=-8, -8≥-6 false → [0, -2, -4, -6]
  it('steps = -6', () => {
    expect(noteToStaffPosition('D3').steps).toBe(-6);
  });

  it('ledgerLines = [0, -2, -4, -6] (four ledger lines to D3)', () => {
    expect(noteToStaffPosition('D3').ledgerLines).toEqual([0, -2, -4, -6]);
  });
});

describe('noteToStaffPosition — C3 (well below staff)', () => {
  // C=0, octave=3 → 0 + (3-4)*7 = -7
  // below-staff: k=0,-2,-4,-6 all ≥-7 (-6≥-7); k=-8, -8≥-7 false → [0, -2, -4, -6]
  it('steps = -7', () => {
    expect(noteToStaffPosition('C3').steps).toBe(-7);
  });

  it('accidental = ""', () => {
    expect(noteToStaffPosition('C3').accidental).toBe('');
  });

  it('ledgerLines = [0, -2, -4, -6] (exact — note in space below D3 ledger line)', () => {
    expect(noteToStaffPosition('C3').ledgerLines).toEqual([0, -2, -4, -6]);
  });

  it('full object equals { steps: -7, accidental: "", ledgerLines: [0, -2, -4, -6] }', () => {
    expect(noteToStaffPosition('C3')).toEqual({
      steps: -7,
      accidental: '',
      ledgerLines: [0, -2, -4, -6],
    });
  });
});

describe('noteToStaffPosition — B2 (four ledger lines below staff)', () => {
  // B=6, octave=2 → 6 + (2-4)*7 = 6-14 = -8
  // below-staff: k=0,-2,-4,-6,-8 all ≥-8; k=-10, -10≥-8 false → [0, -2, -4, -6, -8]
  it('steps = -8', () => {
    expect(noteToStaffPosition('B2').steps).toBe(-8);
  });

  it('accidental = ""', () => {
    expect(noteToStaffPosition('B2').accidental).toBe('');
  });

  it('ledgerLines = [0, -2, -4, -6, -8] (exact — five ledger lines to B2)', () => {
    expect(noteToStaffPosition('B2').ledgerLines).toEqual([0, -2, -4, -6, -8]);
  });

  it('full object equals { steps: -8, accidental: "", ledgerLines: [0, -2, -4, -6, -8] }', () => {
    expect(noteToStaffPosition('B2')).toEqual({
      steps: -8,
      accidental: '',
      ledgerLines: [0, -2, -4, -6, -8],
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Flat input robustness (not a production path; ADR 0011 Consequence 4)
// Flat letter uses the letter's diatonic position; accidental = ''
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — flat input (robustness)', () => {
  it('Bb3: steps = -1 (B=6, octave=3 → -1; flat does NOT change steps)', () => {
    // Bb3: letter B, octave 3 → diatonicPc=6, steps = 6 + (3-4)*7 = -1.
    // Accidental 'b' is normalised to ''.
    const pos = noteToStaffPosition('Bb3');
    expect(pos.steps).toBe(-1);
    expect(pos.accidental).toBe('');
  });

  it('Bb3: ledgerLines = [0] (B3 is in the space below C4; one ledger line)', () => {
    expect(noteToStaffPosition('Bb3').ledgerLines).toEqual([0]);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Sharp note on staff — accidental flag, no ledger lines
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — F#4 (on staff with sharp)', () => {
  // F=3, octave=4 → steps=3; on-staff (2≤3≤10); accidental='#'
  it('steps = 3 (same diatonic position as F4)', () => {
    expect(noteToStaffPosition('F#4').steps).toBe(3);
  });

  it('accidental = "#"', () => {
    expect(noteToStaffPosition('F#4').accidental).toBe('#');
  });

  it('ledgerLines = [] (on-staff note; sharp flag separate from position)', () => {
    expect(noteToStaffPosition('F#4').ledgerLines).toEqual([]);
  });

  it('full object equals { steps: 3, accidental: "#", ledgerLines: [] }', () => {
    expect(noteToStaffPosition('F#4')).toEqual({ steps: 3, accidental: '#', ledgerLines: [] });
  });
});
