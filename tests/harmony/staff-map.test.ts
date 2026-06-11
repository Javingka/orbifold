// SPDX-License-Identifier: AGPL-3.0-only
// Vitest unit tests for noteToStaffPosition in src/core/harmony/staff-map.ts.
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
  it('TREBLE_STAFF_LINES equals [4, 7, 11, 14, 17]', () => {
    expect(TREBLE_STAFF_LINES).toEqual([4, 7, 11, 14, 17]);
  });

  it('STAFF_BOTTOM = 4 (E4)', () => {
    expect(STAFF_BOTTOM).toBe(4);
  });

  it('STAFF_TOP = 17 (F5)', () => {
    expect(STAFF_TOP).toBe(17);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-05-05: C4 — middle C, one ledger line below treble staff
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — C4 (middle C)', () => {
  it('A-05-05: steps = 0', () => {
    const pos = noteToStaffPosition('C4');
    expect(pos.steps).toBe(0);
  });

  it('A-05-05: accidental = ""', () => {
    const pos = noteToStaffPosition('C4');
    expect(pos.accidental).toBe('');
  });

  it('A-05-05: ledgerLines includes 0 (middle C ledger line)', () => {
    const pos = noteToStaffPosition('C4');
    expect(pos.ledgerLines).toContain(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// On-staff notes: E4, G4, B4, D5, F5 — no ledger lines
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — E4 (bottom staff line)', () => {
  it('steps = 4', () => {
    const pos = noteToStaffPosition('E4');
    expect(pos.steps).toBe(4);
  });

  it('accidental = ""', () => {
    const pos = noteToStaffPosition('E4');
    expect(pos.accidental).toBe('');
  });

  it('ledgerLines = [] (on-staff note)', () => {
    const pos = noteToStaffPosition('E4');
    expect(pos.ledgerLines).toEqual([]);
  });
});

describe('noteToStaffPosition — G4 (second staff line)', () => {
  it('A-05-06: steps = 7', () => {
    const pos = noteToStaffPosition('G4');
    expect(pos.steps).toBe(7);
  });

  it('A-05-06: accidental = ""', () => {
    const pos = noteToStaffPosition('G4');
    expect(pos.accidental).toBe('');
  });

  it('A-05-06: ledgerLines = [] (on-staff note)', () => {
    const pos = noteToStaffPosition('G4');
    expect(pos.ledgerLines).toEqual([]);
  });
});

describe('noteToStaffPosition — B4 (middle staff line)', () => {
  it('steps = 11', () => {
    const pos = noteToStaffPosition('B4');
    expect(pos.steps).toBe(11);
  });

  it('accidental = ""', () => {
    const pos = noteToStaffPosition('B4');
    expect(pos.accidental).toBe('');
  });

  it('ledgerLines = [] (on-staff note)', () => {
    const pos = noteToStaffPosition('B4');
    expect(pos.ledgerLines).toEqual([]);
  });
});

describe('noteToStaffPosition — D5 (fourth staff line)', () => {
  it('steps = 14', () => {
    const pos = noteToStaffPosition('D5');
    expect(pos.steps).toBe(14);
  });

  it('accidental = ""', () => {
    const pos = noteToStaffPosition('D5');
    expect(pos.accidental).toBe('');
  });

  it('ledgerLines = [] (on-staff note)', () => {
    const pos = noteToStaffPosition('D5');
    expect(pos.ledgerLines).toEqual([]);
  });
});

describe('noteToStaffPosition — F5 (top staff line)', () => {
  it('steps = 17', () => {
    const pos = noteToStaffPosition('F5');
    expect(pos.steps).toBe(17);
  });

  it('accidental = ""', () => {
    const pos = noteToStaffPosition('F5');
    expect(pos.accidental).toBe('');
  });

  it('ledgerLines = [] (on-staff note)', () => {
    const pos = noteToStaffPosition('F5');
    expect(pos.ledgerLines).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-05-07: F#3 — below staff with sharp accidental
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — F#3 (below staff, sharp)', () => {
  it('A-05-07: steps = -6', () => {
    const pos = noteToStaffPosition('F#3');
    expect(pos.steps).toBe(-6);
  });

  it('A-05-07: accidental = "#"', () => {
    const pos = noteToStaffPosition('F#3');
    expect(pos.accidental).toBe('#');
  });

  it('A-05-07: ledgerLines includes 2, 0, -2, -4, -6 (well below staff with sharp)', () => {
    const pos = noteToStaffPosition('F#3');
    expect(pos.ledgerLines).toContain(2);
    expect(pos.ledgerLines).toContain(0);
    expect(pos.ledgerLines).toContain(-2);
    expect(pos.ledgerLines).toContain(-4);
    expect(pos.ledgerLines).toContain(-6);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// G3 — below staff, note in space between ledger lines
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — G3 (below staff, in space)', () => {
  it('steps = -5', () => {
    const pos = noteToStaffPosition('G3');
    expect(pos.steps).toBe(-5);
  });

  it('accidental = ""', () => {
    const pos = noteToStaffPosition('G3');
    expect(pos.accidental).toBe('');
  });

  it('ledgerLines includes 2, 0, -2, -4 (ledger lines from D4 down to line above G3)', () => {
    const pos = noteToStaffPosition('G3');
    expect(pos.ledgerLines).toContain(2);
    expect(pos.ledgerLines).toContain(0);
    expect(pos.ledgerLines).toContain(-2);
    expect(pos.ledgerLines).toContain(-4);
  });

  it('ledgerLines does not include -6 (not needed for G3 in space at -5)', () => {
    const pos = noteToStaffPosition('G3');
    expect(pos.ledgerLines).not.toContain(-6);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// C3 — well below staff (many ledger lines)
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — C3 (well below staff)', () => {
  it('steps = -12', () => {
    const pos = noteToStaffPosition('C3');
    expect(pos.steps).toBe(-12);
  });

  it('accidental = ""', () => {
    const pos = noteToStaffPosition('C3');
    expect(pos.accidental).toBe('');
  });

  it('ledgerLines includes 2, 0, -2, -4, -6, -8, -10, -12', () => {
    const pos = noteToStaffPosition('C3');
    expect(pos.ledgerLines).toContain(2);
    expect(pos.ledgerLines).toContain(0);
    expect(pos.ledgerLines).toContain(-2);
    expect(pos.ledgerLines).toContain(-4);
    expect(pos.ledgerLines).toContain(-6);
    expect(pos.ledgerLines).toContain(-8);
    expect(pos.ledgerLines).toContain(-10);
    expect(pos.ledgerLines).toContain(-12);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// G5 — above staff, one ledger line
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — G5 (above staff)', () => {
  it('steps = 19', () => {
    const pos = noteToStaffPosition('G5');
    expect(pos.steps).toBe(19);
  });

  it('accidental = ""', () => {
    const pos = noteToStaffPosition('G5');
    expect(pos.accidental).toBe('');
  });

  it('ledgerLines includes 19 (one ledger line above treble staff)', () => {
    const pos = noteToStaffPosition('G5');
    expect(pos.ledgerLines).toContain(19);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Flat input robustness (not a production path; ADR 0011 Consequence 4)
// ──────────────────────────────────────────────────────────────────────────────

describe('noteToStaffPosition — flat input (robustness)', () => {
  it('Bb3: steps = -2, accidental = "" (flat normalised to natural)', () => {
    // Bb3 = A#3 enharmonic. MIDI = (3+1)*12 + 11 - 1 = 48 + 10 = 58; steps = 58-60 = -2.
    const pos = noteToStaffPosition('Bb3');
    expect(pos.steps).toBe(-2);
    expect(pos.accidental).toBe('');
  });
});
