// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — computeVoiceTracks: assigns continuous voice tracks across a chord
// progression using the minimal voice-leading permutation from voice-leading.ts.
// Phase 06: extended to support rest slots (VoiceRestEvent gap events).
// See ADR 0012 and docs/orbifold-v2/phases/phase-06.md step 06.3.

import { chordVoicing, chordPcs, QUAL_INTERVALS, type Quality } from '../theory/chords.js';
import { minimalVoiceLeading } from '../theory/voice-leading.js';
import { NOTE_NAMES } from '../theory/pitch.js';

// ──────────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────────

/**
 * One note event for a single voice within a single chord slot.
 */
export interface VoiceEvent {
  chordIndex: number; // 0-based index into the progression
  noteName: string; // note name with octave, e.g. 'C3', 'E3', 'G3'
  octave: number; // octave of this note (integer)
  bars: number; // duration of this chord in cycles (ch.bars ?? 1)
  startCycle: number; // cumulative cycle offset: sum of bars of all prior chords
}

/**
 * A rest gap event for a single voice within a rest slot.
 * All three voices in a VoiceTrack get a VoiceRestEvent for each rest slot.
 * The note is absent; prevPcs is unchanged so voice leading continues from
 * the last chord before the rest.
 * Introduced in Phase 06 — ADR 0012 Consequence 3.
 */
export interface VoiceRestEvent {
  isRest: true;
  slotIndex: number; // 0-based index into the progression
  bars: number; // duration of this rest in cycles (slot.bars ?? 1)
  startCycle: number; // cumulative cycle offset
}

/** One of the three continuous voice streams in the progression. */
export interface VoiceTrack {
  voiceIndex: 0 | 1 | 2; // 0 = lowest, 1 = middle, 2 = highest
  events: (VoiceEvent | VoiceRestEvent)[];
}

// ──────────────────────────────────────────────────────────────────────────────
// ChordInput / RestInput — minimal subsets of Chord / RestSlot; avoids importing
// from state/session (which carries Svelte-transitive dependencies).
// Phase 06: RestInput added alongside ChordInput — ADR 0012 Consequence 3.
// ──────────────────────────────────────────────────────────────────────────────

interface ChordInput {
  rootPc: number;
  qual: Quality;
  bars?: number;
}

interface RestInput {
  isRest: true;
  bars?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Parse a note string like 'C3' or 'C#4' into its name and octave integer. */
function parseNote(noteStr: string): { noteName: string; octave: number } {
  // Format: letter + optional '#' + decimal octave integer
  // Examples: 'C3', 'C#4', 'A#3', 'G3'
  const match = noteStr.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) {
    throw new Error(`voice-tracks: cannot parse note string "${noteStr}"`);
  }
  return { noteName: match[1], octave: parseInt(match[2], 10) };
}

// ──────────────────────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Compute three continuous voice tracks for the given chord progression.
 *
 * Algorithm (D4 from ADR 0011):
 *   - Chord 0: voices assigned in ascending pitch order from chordVoicing output
 *     (voice-0 = lowest, voice-1 = middle, voice-2 = highest).
 *   - Chord i > 0: minimalVoiceLeading(prevPcs, nextPcs) provides perm[].
 *     Voice v in the new chord receives pitch class nextPcs[perm[v]].
 *     Octave is derived from the same formula as chordVoicing:
 *       octave + Math.floor((rootPc + QUAL_INTERVALS[qual][perm[v]]) / 12)
 *
 * Rest slots (Phase 06 — ADR 0012 Consequence 3): a rest slot appends a
 * VoiceRestEvent to each track but does NOT update prevPcs. The next chord
 * after a rest uses minimalVoiceLeading against the last chord before the rest,
 * as if the rest did not exist. This preserves smooth voice leading across gaps.
 *
 * @param progression  Array of chord or rest descriptors.
 * @param octave       Base octave for chordVoicing (e.g., 3 → C3–G3 range).
 * @returns            Exactly 3 VoiceTrack objects (indices 0, 1, 2).
 */
export function computeVoiceTracks(
  progression: (ChordInput | RestInput)[],
  octave: number
): VoiceTrack[] {
  // Initialise three empty tracks.
  const tracks: VoiceTrack[] = [
    { voiceIndex: 0, events: [] },
    { voiceIndex: 1, events: [] },
    { voiceIndex: 2, events: [] },
  ];

  // Edge case: empty progression — return three tracks with no events.
  if (progression.length === 0) {
    return tracks;
  }

  let startCycle = 0;

  // Track the previous chord's pitch classes so minimalVoiceLeading can be
  // called on each subsequent chord. Typed as a 3-tuple.
  // prevPcs is NOT updated when a rest slot is encountered (ADR 0012 D1).
  let prevPcs: [number, number, number] | null = null;

  // Track the index of the first chord seen (for "first chord" logic after
  // leading rests). We use prevPcs === null as the "no chord yet" sentinel.

  for (let i = 0; i < progression.length; i++) {
    const slot = progression[i];
    const bars = slot.bars ?? 1;

    if ('isRest' in slot) {
      // Rest slot (Phase 06 — ADR 0012 Consequence 3):
      // Append VoiceRestEvent to each track; prevPcs unchanged.
      for (let v = 0; v < 3; v++) {
        tracks[v].events.push({
          isRest: true,
          slotIndex: i,
          bars,
          startCycle,
        });
      }
      startCycle += bars;
      continue;
    }

    // Chord slot.
    const ch = slot;
    const nextPcs = chordPcs(ch.rootPc, ch.qual) as [number, number, number];

    if (prevPcs === null) {
      // First chord encountered (may be preceded by rest slots):
      // assign voices from chordVoicing output (ascending order).
      const voicing = chordVoicing(ch.rootPc, ch.qual, octave);
      // chordVoicing returns notes in ascending order (root, 3rd, 5th with
      // octave wrapping), so voice-0 = index 0 (lowest).
      for (let v = 0; v < 3; v++) {
        const fullNote = voicing[v]; // e.g. 'C3', 'E3', 'G3'
        const { octave: noteOctave } = parseNote(fullNote);
        tracks[v].events.push({
          chordIndex: i,
          noteName: fullNote,
          octave: noteOctave,
          bars,
          startCycle,
        });
      }
    } else {
      // Subsequent chord: apply the minimal voice-leading permutation.
      // prevPcs is guaranteed non-null here — set after the first chord.
      const { perm } = minimalVoiceLeading(prevPcs, nextPcs);

      for (let v = 0; v < 3; v++) {
        // Voice v maps to QUAL_INTERVALS index perm[v] in the new chord.
        const iv = QUAL_INTERVALS[ch.qual][perm[v]];
        const noteOctave = octave + Math.floor((ch.rootPc + iv) / 12);
        const pc = (ch.rootPc + iv) % 12;
        const noteNamePart = NOTE_NAMES[pc];
        const fullNote = noteNamePart + noteOctave;
        tracks[v].events.push({
          chordIndex: i,
          noteName: fullNote,
          octave: noteOctave,
          bars,
          startCycle,
        });
      }
    }

    prevPcs = nextPcs;
    startCycle += bars;
  }

  return tracks;
}
