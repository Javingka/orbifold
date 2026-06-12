// SPDX-License-Identifier: AGPL-3.0-only
// Vitest unit tests for computeStaffLayout in src/core/harmony/staff-layout.ts.
// Covers all Phase 07 acceptance criteria A-07-01 through A-07-05.
//
// Diatonic coordinate system (vigent rule, docs/orbifold-v2/decisions.md):
//   steps = one unit per letter-name, C4 = 0, ±7 per octave.
//   Accidentals do NOT change steps (F#3 and F3 share steps = -4).
//
// All assertions use pxPerCycle = 48 to mirror PX_PER_CYCLE from time-map.ts.
// The engine itself accepts pxPerCycle as a parameter — the tests also verify
// the parameter is forwarded correctly (not hardcoded).
//
// noteHead ordering from computeStaffLayout:
//   The outer loop iterates tracks in order [0,1,2]; the inner loop iterates
//   each track's events. Rests are routed to restGlyphs. For a mixed progression
//   [chord, rest, chord] the noteHeads array is ordered by voice then by time:
//     [0] = voice-0 chord-0, [1] = voice-0 chord-2,
//     [2] = voice-1 chord-0, [3] = voice-1 chord-2,
//     [4] = voice-2 chord-0, [5] = voice-2 chord-2.
//
// Voice note values used in tests (C major at octave 3):
//   voice-0 = C3 (steps=-7), voice-1 = E3 (steps=-5), voice-2 = G3 (steps=-3)

import { describe, it, expect, beforeAll } from 'vitest';
import { computeStaffLayout } from '../../src/core/harmony/staff-layout.js';
import type { StaffLayout } from '../../src/core/harmony/staff-layout.js';
import { computeVoiceTracks } from '../../src/core/harmony/voice-tracks.js';
import { noteToStaffPosition } from '../../src/core/harmony/staff-map.js';

const PX = 48; // mirrors PX_PER_CYCLE from time-map.ts

// ──────────────────────────────────────────────────────────────────────────────
// A-07-01: empty progression
// ──────────────────────────────────────────────────────────────────────────────

describe('computeStaffLayout — empty progression (A-07-01)', () => {
  it('A-07-01: returns { noteHeads: [], restGlyphs: [], totalWidth: 0 }', () => {
    const tracks = computeVoiceTracks([], 3);
    const layout = computeStaffLayout(tracks, PX);
    expect(layout).toEqual({ noteHeads: [], restGlyphs: [], totalWidth: 0 });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-07-02: single C major chord, octave 3
// ──────────────────────────────────────────────────────────────────────────────

describe('computeStaffLayout — single C major chord, octave 3 (A-07-02)', () => {
  // For a single chord the noteHeads ordering is:
  //   [0] = voice-0 (C3), [1] = voice-1 (E3), [2] = voice-2 (G3).
  let layout: StaffLayout;

  beforeAll(() => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj' }], 3);
    layout = computeStaffLayout(tracks, PX);
  });

  it('A-07-02: produces 3 note-heads (one per voice)', () => {
    expect(layout.noteHeads).toHaveLength(3);
  });

  it('A-07-02: no rest glyphs', () => {
    expect(layout.restGlyphs).toHaveLength(0);
  });

  it('A-07-02: all note-heads at x=0', () => {
    expect(layout.noteHeads[0].x).toBe(0);
    expect(layout.noteHeads[1].x).toBe(0);
    expect(layout.noteHeads[2].x).toBe(0);
  });

  it('A-07-02: note-head[0] is voice-0 with stepY matching noteToStaffPosition("C3")', () => {
    expect(layout.noteHeads[0].voiceIndex).toBe(0);
    expect(layout.noteHeads[0].stepY).toBe(noteToStaffPosition('C3').steps);
  });

  it('A-07-02: note-head[1] is voice-1 with stepY matching noteToStaffPosition("E3")', () => {
    expect(layout.noteHeads[1].voiceIndex).toBe(1);
    expect(layout.noteHeads[1].stepY).toBe(noteToStaffPosition('E3').steps);
  });

  it('A-07-02: note-head[2] is voice-2 with stepY matching noteToStaffPosition("G3")', () => {
    expect(layout.noteHeads[2].voiceIndex).toBe(2);
    expect(layout.noteHeads[2].stepY).toBe(noteToStaffPosition('G3').steps);
  });

  it('A-07-02: all note-heads have bars=1', () => {
    expect(layout.noteHeads[0].bars).toBe(1);
    expect(layout.noteHeads[1].bars).toBe(1);
    expect(layout.noteHeads[2].bars).toBe(1);
  });

  it('A-07-02: totalWidth = 1 * 48 = 48', () => {
    expect(layout.totalWidth).toBe(48);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-07-03: mixed progression [C major bars:1, rest bars:1, A minor bars:2]
// ──────────────────────────────────────────────────────────────────────────────

describe('computeStaffLayout — mixed progression [C maj, rest, A min] (A-07-03)', () => {
  // noteHead layout (rests routed to restGlyphs):
  //   [0] = voice-0, chord-0, x=0, bars=1
  //   [1] = voice-0, chord-2, x=96, bars=2
  //   [2] = voice-1, chord-0, x=0, bars=1
  //   [3] = voice-1, chord-2, x=96, bars=2
  //   [4] = voice-2, chord-0, x=0, bars=1
  //   [5] = voice-2, chord-2, x=96, bars=2
  // restGlyphs:
  //   [0] = voice-0, x=48, bars=1
  //   [1] = voice-1, x=48, bars=1
  //   [2] = voice-2, x=48, bars=1
  let layout: StaffLayout;

  beforeAll(() => {
    const tracks = computeVoiceTracks(
      [
        { rootPc: 0, qual: 'maj', bars: 1 },
        { isRest: true, bars: 1 },
        { rootPc: 9, qual: 'min', bars: 2 }, // A minor (rootPc=9)
      ],
      3
    );
    layout = computeStaffLayout(tracks, PX);
  });

  it('A-07-03: 6 note-heads total (3 voices × 2 chord slots)', () => {
    expect(layout.noteHeads).toHaveLength(6);
  });

  it('A-07-03: 3 rest glyphs (3 voices × 1 rest slot)', () => {
    expect(layout.restGlyphs).toHaveLength(3);
  });

  it('A-07-03: chord-0 note-heads (indices 0, 2, 4) are at x=0', () => {
    expect(layout.noteHeads[0].x).toBe(0);
    expect(layout.noteHeads[2].x).toBe(0);
    expect(layout.noteHeads[4].x).toBe(0);
  });

  it('A-07-03: rest glyphs are at x=48 (startCycle=1 * 48)', () => {
    expect(layout.restGlyphs[0].x).toBe(48);
    expect(layout.restGlyphs[1].x).toBe(48);
    expect(layout.restGlyphs[2].x).toBe(48);
  });

  it('A-07-03: chord-2 (A minor) note-heads (indices 1, 3, 5) are at x=96', () => {
    expect(layout.noteHeads[1].x).toBe(96);
    expect(layout.noteHeads[3].x).toBe(96);
    expect(layout.noteHeads[5].x).toBe(96);
  });

  it('A-07-03: totalWidth = (0+1+1+2)*48 = 192', () => {
    expect(layout.totalWidth).toBe(192);
  });

  it('A-07-03: rest glyphs have bars=1', () => {
    expect(layout.restGlyphs[0].bars).toBe(1);
    expect(layout.restGlyphs[1].bars).toBe(1);
    expect(layout.restGlyphs[2].bars).toBe(1);
  });

  it('A-07-03: A minor note-heads (at x=96) have bars=2', () => {
    expect(layout.noteHeads[1].bars).toBe(2);
    expect(layout.noteHeads[3].bars).toBe(2);
    expect(layout.noteHeads[5].bars).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// totalWidth correctness: multi-chord progression
// ──────────────────────────────────────────────────────────────────────────────

describe('computeStaffLayout — totalWidth = max(startCycle + bars) * pxPerCycle', () => {
  it('two chords bars=[2, 0.5] → totalWidth = (2 + 0.5) * 48 = 120', () => {
    const tracks = computeVoiceTracks(
      [
        { rootPc: 0, qual: 'maj', bars: 2 },
        { rootPc: 0, qual: 'min', bars: 0.5 },
      ],
      3
    );
    const layout = computeStaffLayout(tracks, PX);
    // chord-0: startCycle=0, bars=2 → end=2
    // chord-1: startCycle=2, bars=0.5 → end=2.5
    // totalWidth = 2.5 * 48 = 120
    expect(layout.totalWidth).toBe(120);
  });

  it('single chord bars=4 → totalWidth = 4 * 48 = 192', () => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj', bars: 4 }], 3);
    const layout = computeStaffLayout(tracks, PX);
    expect(layout.totalWidth).toBe(192);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-07-04: sharp accidental for D major chord (contains F#3)
// ──────────────────────────────────────────────────────────────────────────────

describe('computeStaffLayout — sharp accidental for D major / F#3 (A-07-04)', () => {
  // D major (rootPc=2, qual='maj') at octave 3 → chordVoicing → D3, F#3, A3
  // voice-0=D3 (accidental=''), voice-1=F#3 (accidental='#'), voice-2=A3 (accidental='')
  // noteHeads: [0]=voice-0 (D3, ''), [1]=voice-1 (F#3, '#'), [2]=voice-2 (A3, '')
  let layout: StaffLayout;

  beforeAll(() => {
    const tracks = computeVoiceTracks([{ rootPc: 2, qual: 'maj' }], 3);
    layout = computeStaffLayout(tracks, PX);
  });

  it('A-07-04: note-head[1] (voice-1 = F#3) has accidental="#"', () => {
    expect(layout.noteHeads[1].voiceIndex).toBe(1);
    expect(layout.noteHeads[1].accidental).toBe('#');
  });

  it('A-07-04: note-head[1] stepY matches noteToStaffPosition("F#3").steps', () => {
    expect(layout.noteHeads[1].stepY).toBe(noteToStaffPosition('F#3').steps);
  });

  it('A-07-04: note-heads for D3 and A3 have accidental=""', () => {
    expect(layout.noteHeads[0].accidental).toBe('');
    expect(layout.noteHeads[2].accidental).toBe('');
  });

  it('A-07-04: exactly one note-head has accidental="#"', () => {
    const sharps = layout.noteHeads.filter((h) => h.accidental === '#');
    expect(sharps).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-07-05: ledger lines for below-staff voicings (C3 range)
// ──────────────────────────────────────────────────────────────────────────────

describe('computeStaffLayout — ledger lines for C3 voicings (A-07-05)', () => {
  // C major at octave 3: voice-0=C3, voice-1=E3, voice-2=G3 — all below treble staff.
  // C3: steps=-7, ledgerLines=[0,-2,-4,-6]
  // E3: steps=-5, ledgerLines=[0,-2,-4]
  // G3: steps=-3, ledgerLines=[0,-2]
  let layout: StaffLayout;

  beforeAll(() => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj' }], 3);
    layout = computeStaffLayout(tracks, PX);
  });

  it('A-07-05: note-head[0] (C3) has non-empty ledgerLines matching noteToStaffPosition', () => {
    expect(layout.noteHeads[0].ledgerLines).toEqual(noteToStaffPosition('C3').ledgerLines);
    expect(layout.noteHeads[0].ledgerLines.length).toBeGreaterThan(0);
  });

  it('A-07-05: note-head[1] (E3) has non-empty ledgerLines matching noteToStaffPosition', () => {
    expect(layout.noteHeads[1].ledgerLines).toEqual(noteToStaffPosition('E3').ledgerLines);
    expect(layout.noteHeads[1].ledgerLines.length).toBeGreaterThan(0);
  });

  it('A-07-05: note-head[2] (G3) has non-empty ledgerLines matching noteToStaffPosition', () => {
    expect(layout.noteHeads[2].ledgerLines).toEqual(noteToStaffPosition('G3').ledgerLines);
    expect(layout.noteHeads[2].ledgerLines.length).toBeGreaterThan(0);
  });

  it('A-07-05: on-staff note (E4, rootPc=4 at octave 4) has empty ledgerLines', () => {
    // E major at octave 4: voice-0 = E4 (root, steps=2, on STAFF_BOTTOM) → ledgerLines=[]
    const tracks = computeVoiceTracks([{ rootPc: 4, qual: 'maj' }], 4);
    const lay = computeStaffLayout(tracks, PX);
    expect(lay.noteHeads[0].ledgerLines).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// voiceIndex assignment
// ──────────────────────────────────────────────────────────────────────────────

describe('computeStaffLayout — voiceIndex assignment', () => {
  it('three voices produce note-heads with voiceIndex 0, 1, 2 in track order', () => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj' }], 3);
    const layout = computeStaffLayout(tracks, PX);
    expect(layout.noteHeads[0].voiceIndex).toBe(0);
    expect(layout.noteHeads[1].voiceIndex).toBe(1);
    expect(layout.noteHeads[2].voiceIndex).toBe(2);
  });

  it('rest glyphs carry voiceIndex 0, 1, 2 for a single rest slot', () => {
    const tracks = computeVoiceTracks([{ isRest: true, bars: 1 }], 3);
    const layout = computeStaffLayout(tracks, PX);
    expect(layout.restGlyphs[0].voiceIndex).toBe(0);
    expect(layout.restGlyphs[1].voiceIndex).toBe(1);
    expect(layout.restGlyphs[2].voiceIndex).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// pxPerCycle parameter — verifies it is forwarded, not hardcoded
// ──────────────────────────────────────────────────────────────────────────────

describe('computeStaffLayout — pxPerCycle parameter is forwarded correctly', () => {
  it('pxPerCycle=100 for a 2-bar chord gives totalWidth=200', () => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj', bars: 2 }], 3);
    const layout = computeStaffLayout(tracks, 100);
    expect(layout.totalWidth).toBe(200);
  });

  it('pxPerCycle=100 for a single chord at startCycle=0 gives x=0 for all note-heads', () => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj' }], 3);
    const layout = computeStaffLayout(tracks, 100);
    expect(layout.noteHeads[0].x).toBe(0);
    expect(layout.noteHeads[1].x).toBe(0);
    expect(layout.noteHeads[2].x).toBe(0);
  });

  it('pxPerCycle=100 for two chords: second chord note-heads at x=100', () => {
    // For two chords, noteHeads order is:
    //   [0] = voice-0 chord-0 (x=0), [1] = voice-0 chord-1 (x=100),
    //   [2] = voice-1 chord-0 (x=0), [3] = voice-1 chord-1 (x=100),
    //   [4] = voice-2 chord-0 (x=0), [5] = voice-2 chord-1 (x=100)
    const tracks = computeVoiceTracks(
      [
        { rootPc: 0, qual: 'maj', bars: 1 },
        { rootPc: 0, qual: 'min', bars: 1 },
      ],
      3
    );
    const layout = computeStaffLayout(tracks, 100);
    // chord-1: startCycle=1 → x = 1 * 100 = 100
    expect(layout.noteHeads[1].x).toBe(100);
    expect(layout.noteHeads[3].x).toBe(100);
    expect(layout.noteHeads[5].x).toBe(100);
  });
});
