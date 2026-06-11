// SPDX-License-Identifier: AGPL-3.0-only
// Vitest unit tests for computeVoiceTracks in src/core/harmony/voice-tracks.ts.
// Prototype parity: voice assignment via minimalVoiceLeading mirrors the
// ordering used in reference/orbifold.html (codegen uses the same permutation
// logic for note ordering in Strudel output).

import { describe, it, expect } from 'vitest';
import { computeVoiceTracks } from '../../src/core/harmony/voice-tracks.js';

// ──────────────────────────────────────────────────────────────────────────────
// A-05-01: empty progression
// ──────────────────────────────────────────────────────────────────────────────

describe('computeVoiceTracks — empty progression', () => {
  it('A-05-01: returns three tracks each with 0 events', () => {
    const tracks = computeVoiceTracks([], 3);
    expect(tracks).toHaveLength(3);
    expect(tracks[0].voiceIndex).toBe(0);
    expect(tracks[1].voiceIndex).toBe(1);
    expect(tracks[2].voiceIndex).toBe(2);
    expect(tracks[0].events).toHaveLength(0);
    expect(tracks[1].events).toHaveLength(0);
    expect(tracks[2].events).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-05-02: single chord (C major, octave 3)
// ──────────────────────────────────────────────────────────────────────────────

describe('computeVoiceTracks — single C major chord, octave 3', () => {
  it('A-05-02: voice-0 = C3, voice-1 = E3, voice-2 = G3', () => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj' }], 3);
    expect(tracks[0].events[0].noteName).toBe('C3');
    expect(tracks[1].events[0].noteName).toBe('E3');
    expect(tracks[2].events[0].noteName).toBe('G3');
  });

  it('single chord startCycle = 0 for all voices', () => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj' }], 3);
    expect(tracks[0].events[0].startCycle).toBe(0);
    expect(tracks[1].events[0].startCycle).toBe(0);
    expect(tracks[2].events[0].startCycle).toBe(0);
  });

  it('single chord default bars = 1', () => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj' }], 3);
    expect(tracks[0].events[0].bars).toBe(1);
    expect(tracks[1].events[0].bars).toBe(1);
    expect(tracks[2].events[0].bars).toBe(1);
  });

  it('single chord octave field is correct', () => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj' }], 3);
    expect(tracks[0].events[0].octave).toBe(3);
    expect(tracks[1].events[0].octave).toBe(3);
    expect(tracks[2].events[0].octave).toBe(3);
  });

  it('single chord chordIndex = 0 for all voices', () => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj' }], 3);
    expect(tracks[0].events[0].chordIndex).toBe(0);
    expect(tracks[1].events[0].chordIndex).toBe(0);
    expect(tracks[2].events[0].chordIndex).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Single chord with bars = 2
// ──────────────────────────────────────────────────────────────────────────────

describe('computeVoiceTracks — single chord with bars = 2', () => {
  it('bars = 2 is preserved in event; startCycle = 0', () => {
    const tracks = computeVoiceTracks([{ rootPc: 0, qual: 'maj', bars: 2 }], 3);
    expect(tracks[0].events[0].bars).toBe(2);
    expect(tracks[0].events[0].startCycle).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-05-03: C major → C minor (P transform)
// ──────────────────────────────────────────────────────────────────────────────

describe('computeVoiceTracks — C major → C minor (P transform)', () => {
  // perm = [0,1,2] (identity), moves = [0,-1,0]
  // voice-0: C3 → C3; voice-1: E3 → D#3 (Eb3); voice-2: G3 → G3
  it('A-05-03: voice-1 (E3) moves to D#3; voice-0 and voice-2 stay', () => {
    const tracks = computeVoiceTracks(
      [
        { rootPc: 0, qual: 'maj' },
        { rootPc: 0, qual: 'min' },
      ],
      3
    );
    // Chord 0: C major
    expect(tracks[0].events[0].noteName).toBe('C3');
    expect(tracks[1].events[0].noteName).toBe('E3');
    expect(tracks[2].events[0].noteName).toBe('G3');
    // Chord 1: C minor — E moves to D# (Eb enharmonic, sharp spelling from NOTE_NAMES)
    expect(tracks[0].events[1].noteName).toBe('C3'); // C stays
    expect(tracks[1].events[1].noteName).toBe('D#3'); // E3 → D#3 (one semitone down)
    expect(tracks[2].events[1].noteName).toBe('G3'); // G stays
  });

  it('voice continuity: voice-1 is the moving voice (identity perm [0,1,2])', () => {
    const tracks = computeVoiceTracks(
      [
        { rootPc: 0, qual: 'maj' },
        { rootPc: 0, qual: 'min' },
      ],
      3
    );
    // perm [0,1,2] means voice i stays assigned to interval index i in new chord
    // voice-1 was at interval index 1 of maj (E), moves to interval index 1 of min (D#)
    expect(tracks[1].events[0].noteName).toBe('E3');
    expect(tracks[1].events[1].noteName).toBe('D#3');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// C major → A minor (R transform)
// ──────────────────────────────────────────────────────────────────────────────

describe('computeVoiceTracks — C major → A minor (R transform)', () => {
  // perm = [1,2,0] (from voice-leading.test.ts golden value)
  // C major pcs [0,4,7]; A minor pcs [9,0,4]
  // voice-0: perm[0]=1 → A minor interval 1 = 3 → (9+3)%12=0=C, octave=3+floor(12/12)=4 → C4
  // voice-1: perm[1]=2 → A minor interval 2 = 7 → (9+7)%12=4=E, octave=3+floor(16/12)=4 → E4
  // voice-2: perm[2]=0 → A minor interval 0 = 0 → (9+0)%12=9=A, octave=3+floor(9/12)=3  → A3
  it('perm [1,2,0] is applied correctly: voice-0=C4, voice-1=E4, voice-2=A3', () => {
    const tracks = computeVoiceTracks(
      [
        { rootPc: 0, qual: 'maj' },
        { rootPc: 9, qual: 'min' },
      ],
      3
    );
    expect(tracks[0].events[1].noteName).toBe('C4');
    expect(tracks[1].events[1].noteName).toBe('E4');
    expect(tracks[2].events[1].noteName).toBe('A3');
  });

  it('A-05-04 partial: startCycle for chord 1 = 1 (default bars=1)', () => {
    const tracks = computeVoiceTracks(
      [
        { rootPc: 0, qual: 'maj' },
        { rootPc: 9, qual: 'min' },
      ],
      3
    );
    expect(tracks[0].events[1].startCycle).toBe(1);
    expect(tracks[1].events[1].startCycle).toBe(1);
    expect(tracks[2].events[1].startCycle).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-05-04: startCycle accumulation with bars = [2, 0.5]
// ──────────────────────────────────────────────────────────────────────────────

describe('computeVoiceTracks — startCycle accumulation', () => {
  it('A-05-04: bars=[2, 0.5] → chord-0 bars=2, startCycle=0; chord-1 bars=0.5, startCycle=2', () => {
    const tracks = computeVoiceTracks(
      [
        { rootPc: 0, qual: 'maj', bars: 2 },
        { rootPc: 0, qual: 'min', bars: 0.5 },
      ],
      3
    );
    expect(tracks[0].events[0].bars).toBe(2);
    expect(tracks[0].events[0].startCycle).toBe(0);
    expect(tracks[0].events[1].bars).toBe(0.5);
    expect(tracks[0].events[1].startCycle).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Three chords: startCycle accumulates across all three
// ──────────────────────────────────────────────────────────────────────────────

describe('computeVoiceTracks — three chords, startCycle accumulation', () => {
  it('startCycle values: [0, 1, 3] for bars [1, 2, 0.5]', () => {
    const tracks = computeVoiceTracks(
      [
        { rootPc: 0, qual: 'maj', bars: 1 },
        { rootPc: 0, qual: 'min', bars: 2 },
        { rootPc: 9, qual: 'min', bars: 0.5 },
      ],
      3
    );
    expect(tracks[0].events[0].startCycle).toBe(0);
    expect(tracks[0].events[1].startCycle).toBe(1);
    expect(tracks[0].events[2].startCycle).toBe(3);
  });

  it('three chords produce 3 events per voice', () => {
    const tracks = computeVoiceTracks(
      [
        { rootPc: 0, qual: 'maj' },
        { rootPc: 0, qual: 'min' },
        { rootPc: 9, qual: 'min' },
      ],
      3
    );
    expect(tracks[0].events).toHaveLength(3);
    expect(tracks[1].events).toHaveLength(3);
    expect(tracks[2].events).toHaveLength(3);
  });
});
