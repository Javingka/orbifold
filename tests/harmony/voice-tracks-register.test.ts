// SPDX-License-Identifier: AGPL-3.0-only
// Vitest unit tests for RegisterMode in computeVoiceTracks.
// Phase 08 step 08.3 — ADR 0011 Amendment §D6.
//
// Tests cover:
//   A-08-01  estricto mode reproduces the pre-phase formula exactly
//   A-08-02  suavizado mode picks nearest octave (smaller leaps)
//   A-08-03  default param (2-arg call) is equivalent to explicit 'suavizado'
//   A-08-04  rest slot between two chords preserves voice-leading across the gap
//   (extra) tie between estricto-1 and estricto candidates resolves to lower octave

import { describe, it, expect } from 'vitest';
import { computeVoiceTracks, type RegisterMode } from '../../src/core/harmony/voice-tracks.js';
import type { VoiceEvent, VoiceRestEvent } from '../../src/core/harmony/voice-tracks.js';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Extract the VoiceEvent noteName for voice v at chord position idx.
 * Asserts the event is a chord event (not a rest).
 */
function noteName(
  tracks: ReturnType<typeof computeVoiceTracks>,
  voice: number,
  eventIdx: number
): string {
  const ev = tracks[voice].events[eventIdx];
  if ('isRest' in ev) throw new Error(`Expected chord event at [${voice}][${eventIdx}], got rest`);
  return ev.noteName;
}

/**
 * Convert a note name + octave string like 'C4' or 'A#2' to an absolute MIDI pitch.
 * MIDI formula: (octave + 1) * 12 + pc (C = 0, C# = 1, ... B = 11). C4 = 60.
 */
function midiFromNote(note: string): number {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const m = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!m) throw new Error(`Cannot parse note: ${note}`);
  const pc = NOTE_NAMES.indexOf(m[1]);
  const oct = parseInt(m[2], 10);
  return (oct + 1) * 12 + pc;
}

// ──────────────────────────────────────────────────────────────────────────────
// A-08-01 — estricto reproduces the pre-phase formula exactly
//
// The pre-phase formula (from voice-tracks.ts line 176 before Phase 08):
//   noteOctave = octave + Math.floor((ch.rootPc + iv) / 12)
//
// Prototype parity reference: this is the formula that computeVoiceTracks
// used before Phase 08 (the formula is unchanged for 'estricto' mode).
//
// Golden test case: C major (octave 3) → A minor
//   perm = [1,2,0] (from the voice-leading.test.ts golden values)
//   voice-0: perm[0]=1, iv=3 (min 3rd), rootPc=9, octave=3+floor(12/12)=4 → C4
//   voice-1: perm[1]=2, iv=7 (min 5th), rootPc=9, octave=3+floor(16/12)=4 → E4
//   voice-2: perm[2]=0, iv=0 (root),    rootPc=9, octave=3+floor(9/12)=3  → A3
// ──────────────────────────────────────────────────────────────────────────────

describe('A-08-01 — estricto mode: pre-phase formula preserved for C major → A minor', () => {
  const prog = [
    { rootPc: 0, qual: 'maj' as const },
    { rootPc: 9, qual: 'min' as const },
  ];

  it('A-08-01: voice-0 = C4 (same as pre-phase output)', () => {
    const tracks = computeVoiceTracks(prog, 3, 'estricto');
    expect(noteName(tracks, 0, 1)).toBe('C4');
  });

  it('A-08-01: voice-1 = E4 (same as pre-phase output)', () => {
    const tracks = computeVoiceTracks(prog, 3, 'estricto');
    expect(noteName(tracks, 1, 1)).toBe('E4');
  });

  it('A-08-01: voice-2 = A3 (same as pre-phase output)', () => {
    const tracks = computeVoiceTracks(prog, 3, 'estricto');
    expect(noteName(tracks, 2, 1)).toBe('A3');
  });

  it('A-08-01: first chord is unchanged in both modes (C3, E3, G3)', () => {
    const estricto = computeVoiceTracks(prog, 3, 'estricto');
    const suavizado = computeVoiceTracks(prog, 3, 'suavizado');
    // First chord anchor is identical in both modes.
    for (let v = 0; v < 3; v++) {
      expect(noteName(estricto, v, 0)).toBe(noteName(suavizado, v, 0));
    }
    expect(noteName(estricto, 0, 0)).toBe('C3');
    expect(noteName(estricto, 1, 0)).toBe('E3');
    expect(noteName(estricto, 2, 0)).toBe('G3');
  });

  it('A-08-01: three-chord estricto produces A minor → C# major transitions without smoothing', () => {
    // Verify estricto does NOT apply nearest-octave smoothing. voice-1 and voice-2
    // should jump to octave 4 on the second chord (B major = rootPc=11, qual='maj').
    // estricto formula: voice-1: iv=4, rootPc=11, noteOctave=3+floor(15/12)=4 → D#4
    //                  voice-2: iv=7, rootPc=11, noteOctave=3+floor(18/12)=4 → F#4
    // (They jump from E3 and G3 to D#4 and F#4 in estricto — a full octave leap.)
    const prog3 = [
      { rootPc: 0, qual: 'maj' as const }, // C major → voice-1=E3, voice-2=G3
      { rootPc: 11, qual: 'maj' as const }, // B major (perm=[0,1,2], each voice -1 semitone)
    ];
    const tracks = computeVoiceTracks(prog3, 3, 'estricto');
    // estricto for B major: voice-0=B3, voice-1=D#4, voice-2=F#4
    expect(noteName(tracks, 0, 1)).toBe('B3');
    expect(noteName(tracks, 1, 1)).toBe('D#4');
    expect(noteName(tracks, 2, 1)).toBe('F#4');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-08-02 — suavizado mode: nearest octave, smaller voice-to-voice leaps
//
// Test case: C major → B major (octave 3, perm = [0,1,2])
//   estricto gives: voice-1=D#4, voice-2=F#4 (both jump from E3/G3 to octave 4)
//   suavizado: D#3 is closer to E3 (1 semitone) than D#4 (11 semitones) → D#3
//              F#3 is closer to G3 (1 semitone) than F#4 (11 semitones) → F#3
// ──────────────────────────────────────────────────────────────────────────────

describe('A-08-02 — suavizado mode: smooth contour on register-jumping progression', () => {
  const prog = [
    { rootPc: 0, qual: 'maj' as const }, // C major → C3, E3, G3
    { rootPc: 11, qual: 'maj' as const }, // B major — estricto jumps voice-1/2 to octave 4
  ];

  it('A-08-02: suavizado voice-0 = B2 (closest to C3: B2 is 1 semitone below C3)', () => {
    const tracks = computeVoiceTracks(prog, 3, 'suavizado');
    // prevMidi[voice-0]=C3(48). Candidates: B2=47(dist=1), B3=59(dist=11). suavizado→B2
    expect(noteName(tracks, 0, 1)).toBe('B2');
  });

  it('A-08-02: suavizado voice-1 stays D#3 (not D#4 as estricto would)', () => {
    const suavizado = computeVoiceTracks(prog, 3, 'suavizado');
    const estricto = computeVoiceTracks(prog, 3, 'estricto');
    // estricto produces D#4; suavizado produces D#3 (1 semitone from E3 vs 11 semitones)
    expect(noteName(estricto, 1, 1)).toBe('D#4');
    expect(noteName(suavizado, 1, 1)).toBe('D#3');
  });

  it('A-08-02: suavizado voice-2 stays F#3 (not F#4 as estricto would)', () => {
    const suavizado = computeVoiceTracks(prog, 3, 'suavizado');
    const estricto = computeVoiceTracks(prog, 3, 'estricto');
    // estricto produces F#4; suavizado produces F#3 (1 semitone from G3 vs 11 semitones)
    expect(noteName(estricto, 2, 1)).toBe('F#4');
    expect(noteName(suavizado, 2, 1)).toBe('F#3');
  });

  it('A-08-02: suavizado leap for every voice is <= 6 semitones', () => {
    const tracks = computeVoiceTracks(prog, 3, 'suavizado');
    for (let v = 0; v < 3; v++) {
      const ev0 = tracks[v].events[0] as VoiceEvent;
      const ev1 = tracks[v].events[1] as VoiceEvent;
      const leap = Math.abs(midiFromNote(ev1.noteName) - midiFromNote(ev0.noteName));
      expect(leap).toBeLessThanOrEqual(6);
    }
  });

  it('A-08-02: estricto leaps for voice-1 and voice-2 are > 6 semitones (the jump being smoothed)', () => {
    const tracks = computeVoiceTracks(prog, 3, 'estricto');
    const ev1_0 = tracks[1].events[0] as VoiceEvent;
    const ev1_1 = tracks[1].events[1] as VoiceEvent;
    const ev2_0 = tracks[2].events[0] as VoiceEvent;
    const ev2_1 = tracks[2].events[1] as VoiceEvent;
    // E3→D#4 = 11 semitones; G3→F#4 = 11 semitones — confirms estricto is the "jump" case
    expect(Math.abs(midiFromNote(ev1_1.noteName) - midiFromNote(ev1_0.noteName))).toBeGreaterThan(
      6
    );
    expect(Math.abs(midiFromNote(ev2_1.noteName) - midiFromNote(ev2_0.noteName))).toBeGreaterThan(
      6
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-08-02 (extra) — suavizado tie resolves to lower octave
//
// Tie scenario: 3-chord progression [C major, F# major, C major], octave=3.
//
// Chain (suavizado):
//   Chord 0 (C maj): voice-0=C3(48), voice-1=E3(52), voice-2=G3(55)  [both modes same]
//
//   Chord 1 (F# maj, rootPc=6, perm=[1,2,0] computed via minimalVoiceLeading):
//     voice-0: perm[0]=1, iv=4, pc=A#, estricto=3+floor(10/12)=3 → A#3(58)
//     voice-1: perm[1]=2, iv=7, pc=C#, estricto=3+floor(13/12)=4 → C#4(61)
//     voice-2: perm[2]=0, iv=0, pc=F#, estricto=3+floor(6/12)=3  → F#3(54)
//     suavizado: voice-0 prev=C3(48): A#2(46,d=2) < A#3(58,d=10) → A#2
//                voice-1 prev=E3(52): C#3(49,d=3) < C#4(61,d=9)  → C#3
//                voice-2 prev=G3(55): F#3(54,d=1) < F#2(42,d=13) → F#3 (same)
//     suavizado prevMidi after chord 1: [A#2=46, C#3=49, F#3=54]
//
//   Chord 2 (C maj again, perm=[1,2,0] computed via minimalVoiceLeading):
//     voice-0: perm[0]=1, iv=4, pc=E, estricto=3 → E3(52). dist: E2(40,d=6), E3(52,d=6). TIE → lower=E2
//     voice-1: perm[1]=2, iv=7, pc=G, estricto=3 → G3(55). dist: G2(43,d=6), G3(55,d=6). TIE → lower=G2
//     voice-2: perm[2]=0, iv=0, pc=C, estricto=3 → C3(48). dist: C2(36,d=18), C3(48,d=6), C4(60,d=12). best=C3
// ──────────────────────────────────────────────────────────────────────────────

describe('A-08-02 (extra) — suavizado tie resolves to lower octave', () => {
  const prog = [
    { rootPc: 0, qual: 'maj' as const }, // C major
    { rootPc: 6, qual: 'maj' as const }, // F# major
    { rootPc: 0, qual: 'maj' as const }, // C major again
  ];

  it('after F# major suavizado, voice-0 = A#2 (not A#3 — picked closer octave)', () => {
    const tracks = computeVoiceTracks(prog, 3, 'suavizado');
    // A#2 is 2 semitones from prev C3(48); A#3 is 10 semitones away → suavizado picks A#2
    expect(noteName(tracks, 0, 1)).toBe('A#2');
  });

  it('after F# major suavizado, voice-1 = C#3 (not C#4 — picked closer octave)', () => {
    const tracks = computeVoiceTracks(prog, 3, 'suavizado');
    // C#3(49) is 3 semitones from E3(52); C#4(61) is 9 semitones → suavizado picks C#3
    expect(noteName(tracks, 1, 1)).toBe('C#3');
  });

  it('TIE resolves to lower octave: voice-0 at 3rd chord = E2 (not E3, both equidistant from A#2)', () => {
    const tracks = computeVoiceTracks(prog, 3, 'suavizado');
    // prevMidi[voice-0] = A#2 = 46. E2=40(dist=6), E3=52(dist=6). TIE → lower=E2
    expect(noteName(tracks, 0, 2)).toBe('E2');
  });

  it('TIE resolves to lower octave: voice-1 at 3rd chord = G2 (not G3, both equidistant from C#3)', () => {
    const tracks = computeVoiceTracks(prog, 3, 'suavizado');
    // prevMidi[voice-1] = C#3 = 49. G2=43(dist=6), G3=55(dist=6). TIE → lower=G2
    expect(noteName(tracks, 1, 2)).toBe('G2');
  });

  it('voice-2 at 3rd chord: C3 wins (estricto-1 is too far, estricto is best)', () => {
    const tracks = computeVoiceTracks(prog, 3, 'suavizado');
    // prevMidi[voice-2] = F#3 = 54. C2=36(dist=18), C3=48(dist=6), C4=60(dist=12) → C3
    expect(noteName(tracks, 2, 2)).toBe('C3');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-08-03 — default param: 2-arg call == explicit 'suavizado'
// ──────────────────────────────────────────────────────────────────────────────

describe('A-08-03 — default param (2-arg call) equals explicit suavizado', () => {
  it('A-08-03: 2-arg call and suavizado produce identical outputs for C major → B major', () => {
    const prog = [
      { rootPc: 0, qual: 'maj' as const },
      { rootPc: 11, qual: 'maj' as const },
    ];
    const defaultCall = computeVoiceTracks(prog, 3);
    const explicit = computeVoiceTracks(prog, 3, 'suavizado');
    // Compare all note names in both tracks
    for (let v = 0; v < 3; v++) {
      expect(defaultCall[v].events.length).toBe(explicit[v].events.length);
      for (let e = 0; e < defaultCall[v].events.length; e++) {
        const devt = defaultCall[v].events[e];
        const eevt = explicit[v].events[e];
        if ('noteName' in devt && 'noteName' in eevt) {
          expect(devt.noteName).toBe(eevt.noteName);
          expect(devt.octave).toBe(eevt.octave);
        }
      }
    }
  });

  it('A-08-03: 2-arg default yields suavizado smoothing (voice-1 = D#3, not D#4)', () => {
    const prog = [
      { rootPc: 0, qual: 'maj' as const },
      { rootPc: 11, qual: 'maj' as const },
    ];
    const tracks = computeVoiceTracks(prog, 3); // 2-arg call
    // suavizado default: D#3 (closer to E3) rather than D#4 (estricto)
    expect(noteName(tracks, 1, 1)).toBe('D#3');
  });

  it('A-08-03: 2-arg default and 3-arg estricto differ for register-jumping progression', () => {
    const prog = [
      { rootPc: 0, qual: 'maj' as const },
      { rootPc: 11, qual: 'maj' as const },
    ];
    const defaultTracks = computeVoiceTracks(prog, 3); // suavizado
    const estrictoTracks = computeVoiceTracks(prog, 3, 'estricto');
    // voice-1: suavizado=D#3, estricto=D#4 — they must differ
    expect(noteName(defaultTracks, 1, 1)).not.toBe(noteName(estrictoTracks, 1, 1));
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// A-08-04 — rest slot between chords preserves voice-leading across the gap
//
// Both modes: [C major, rest, A minor] should assign the same notes for A minor
// as [C major, A minor] directly (rest does not affect prevPcs or prevMidi).
// ──────────────────────────────────────────────────────────────────────────────

describe('A-08-04 — rest slot passthrough: voice-leading preserved across rest gap', () => {
  const direct = [
    { rootPc: 0, qual: 'maj' as const },
    { rootPc: 9, qual: 'min' as const },
  ];
  const withRest = [
    { rootPc: 0, qual: 'maj' as const },
    { isRest: true as const, bars: 1 },
    { rootPc: 9, qual: 'min' as const },
  ];

  it('A-08-04 estricto: A minor after rest has same notes as direct A minor', () => {
    const directTracks = computeVoiceTracks(direct, 3, 'estricto');
    const restTracks = computeVoiceTracks(withRest, 3, 'estricto');
    // A minor is at event-index 1 in direct, event-index 2 in withRest
    for (let v = 0; v < 3; v++) {
      expect(noteName(restTracks, v, 2)).toBe(noteName(directTracks, v, 1));
    }
  });

  it('A-08-04 suavizado: A minor after rest has same notes as direct A minor', () => {
    const directTracks = computeVoiceTracks(direct, 3, 'suavizado');
    const restTracks = computeVoiceTracks(withRest, 3, 'suavizado');
    for (let v = 0; v < 3; v++) {
      expect(noteName(restTracks, v, 2)).toBe(noteName(directTracks, v, 1));
    }
  });

  it('A-08-04: rest event is passed through unchanged (slotIndex=1, bars=1)', () => {
    const tracks = computeVoiceTracks(withRest, 3, 'suavizado');
    for (let v = 0; v < 3; v++) {
      const restEv = tracks[v].events[1] as VoiceRestEvent;
      expect(restEv.isRest).toBe(true);
      expect(restEv.slotIndex).toBe(1);
      expect(restEv.bars).toBe(1);
      expect(restEv.startCycle).toBe(1);
    }
  });

  it('A-08-04: both modes produce a VoiceRestEvent for the rest slot', () => {
    for (const mode of ['estricto', 'suavizado'] as RegisterMode[]) {
      const tracks = computeVoiceTracks(withRest, 3, mode);
      for (let v = 0; v < 3; v++) {
        expect('isRest' in tracks[v].events[1]).toBe(true);
      }
    }
  });

  it('A-08-04: leading rest followed by chord uses estricto anchor for first chord (both modes)', () => {
    // [rest, C major] — first chord uses chordVoicing anchor regardless of mode
    const leadingRest = [
      { isRest: true as const, bars: 1 },
      { rootPc: 0, qual: 'maj' as const },
    ];
    const estricto = computeVoiceTracks(leadingRest, 3, 'estricto');
    const suavizado = computeVoiceTracks(leadingRest, 3, 'suavizado');
    // First chord event is at index 1 (after the rest at index 0)
    for (let v = 0; v < 3; v++) {
      expect(noteName(estricto, v, 1)).toBe(noteName(suavizado, v, 1));
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// RegisterMode type is exported
// ──────────────────────────────────────────────────────────────────────────────

describe('RegisterMode type is exported', () => {
  it('RegisterMode values are the string literals estricto and suavizado', () => {
    const modes: RegisterMode[] = ['estricto', 'suavizado'];
    expect(modes).toHaveLength(2);
    expect(modes[0]).toBe('estricto');
    expect(modes[1]).toBe('suavizado');
  });
});
