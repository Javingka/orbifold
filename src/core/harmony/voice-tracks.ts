// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — computeVoiceTracks: assigns continuous voice tracks across a chord
// progression using the minimal voice-leading permutation from voice-leading.ts.
// Phase 06: extended to support rest slots (VoiceRestEvent gap events).
// Phase 08: added RegisterMode parameter (estricto / suavizado) for visual-only
// octave smoothing. Audio output is byte-identical regardless of register mode.
// See ADR 0011 Amendment §D6, ADR 0012, docs/orbifold-v2/phases/phase-08.md step 08.3.

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
// RegisterMode — visual-only octave assignment strategy (Phase 08, ADR 0011 D6).
// Does NOT affect audio codegen; voice-tracks output is consumed only by
// staff-layout.ts and harmony-staff-scene.ts (pure visual pipeline).
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Controls how octaves are assigned to voices in computeVoiceTracks.
 *
 * - 'estricto': absolute MIDI pitch — octave = base octave + floor((rootPc + iv) / 12).
 *   Independent of previous note; large root-pitch-class jumps can produce register leaps.
 * - 'suavizado': octave-nearest voice continuity — for each voice on chord i > 0, pick
 *   the octave candidate (estricto, +1, or −1) that minimises absolute semitone distance
 *   from the previous note in that voice. Ties (exactly 6 semitones) go to the lower octave.
 *
 * VISUAL-ONLY: audio output is byte-identical regardless of mode (see ADR 0011 Amendment §D6).
 */
export type RegisterMode = 'estricto' | 'suavizado';

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

/**
 * Minimal subset of NoteSlot for voice-track purposes.
 * A NoteSlot contributes a rest gap (no voice events) — it is a single note,
 * not a triad, so it has no multi-voice assignment. Voice-leading continuity
 * skips over NoteSlot entries, same as RestSlot.
 *
 * Phase 01 (note-placement initiative) — added alongside NoteSlot.
 */
interface NoteInput {
  isNote: true;
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

/**
 * Convert a note name + octave to an absolute MIDI pitch (C4 = 60).
 * Used by the suavizado algorithm to compute semitone distances between
 * consecutive voice notes.
 *
 * NOTE_NAMES order: C=0, C#=1, D=2, D#=3, E=4, F=5, F#=6, G=7, G#=8, A=9, A#=10, B=11
 */
function midiPitch(noteName: string, octave: number): number {
  const pc = NOTE_NAMES.indexOf(noteName);
  if (pc === -1) {
    throw new Error(`voice-tracks: unknown note name "${noteName}"`);
  }
  return (octave + 1) * 12 + pc;
}

/**
 * suavizado octave selection: given the estricto note (name + octave) and the
 * MIDI pitch of the previous note in the same voice, return the octave that
 * minimises absolute semitone distance. Candidates: estricto, +1, −1.
 * Ties (distance exactly 6) resolve to the LOWER octave candidate.
 *
 * Pure function — no side effects, no DOM/PIXI/Svelte imports.
 */
function smoothOctave(noteName: string, estrictoOctave: number, prevMidi: number): number {
  const candidates = [estrictoOctave - 1, estrictoOctave, estrictoOctave + 1];
  let bestOctave = estrictoOctave;
  let bestDist = Infinity;
  for (const oct of candidates) {
    const dist = Math.abs(midiPitch(noteName, oct) - prevMidi);
    // Strict less-than ensures ties go to the first (lower) candidate seen.
    if (dist < bestDist) {
      bestDist = dist;
      bestOctave = oct;
    }
  }
  return bestOctave;
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
 *     Octave in 'estricto' mode: octave + Math.floor((rootPc + iv) / 12)
 *     Octave in 'suavizado' mode: nearest octave to previous note in that voice
 *       (considers estricto, +1 octave, −1 octave; ties go to lower octave).
 *
 * Rest slots (Phase 06 — ADR 0012 Consequence 3): a rest slot appends a
 * VoiceRestEvent to each track but does NOT update prevPcs. The next chord
 * after a rest uses minimalVoiceLeading against the last chord before the rest,
 * as if the rest did not exist. This preserves smooth voice leading across gaps.
 *
 * RegisterMode (Phase 08 — ADR 0011 Amendment §D6): VISUAL-ONLY. Audio output
 * is byte-identical regardless of mode (voice-tracks output does not reach
 * audio codegen — confirmed in phase-08-inventory.md §b).
 *
 * @param progression   Array of chord or rest descriptors.
 * @param octave        Base octave for chordVoicing (e.g., 3 → C3–G3 range).
 * @param registerMode  'estricto' (absolute pitch) or 'suavizado' (smooth contour).
 *                      Default: 'suavizado' (Phase 08 UX goal — friendly smooth default).
 * @returns             Exactly 3 VoiceTrack objects (indices 0, 1, 2).
 */
export function computeVoiceTracks(
  progression: (ChordInput | RestInput | NoteInput)[],
  octave: number,
  registerMode: RegisterMode = 'suavizado'
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

  // prevMidi stores the MIDI pitch of each voice's previous note; used by
  // suavizado to pick the nearest octave for the next chord.
  // Initialised after the first chord; not updated on rest slots.
  const prevMidi: [number, number, number] = [0, 0, 0];

  // Track the index of the first chord seen (for "first chord" logic after
  // leading rests). We use prevPcs === null as the "no chord yet" sentinel.

  for (let i = 0; i < progression.length; i++) {
    const slot = progression[i];
    const bars = slot.bars ?? 1;

    if ('isRest' in slot || 'isNote' in slot) {
      // Rest slot (Phase 06 — ADR 0012 Consequence 3) or NoteSlot
      // (note-placement Phase 01): append VoiceRestEvent as a gap placeholder.
      // prevPcs and prevMidi are unchanged so voice-leading continuity is
      // preserved across the gap — the next chord after a note/rest uses
      // minimalVoiceLeading against the last chord before it.
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
    const ch = slot as ChordInput;
    const nextPcs = chordPcs(ch.rootPc, ch.qual) as [number, number, number];

    if (prevPcs === null) {
      // First chord encountered (may be preceded by rest slots):
      // assign voices from chordVoicing output (ascending order).
      // Both modes use the estricto octave as the anchor for the first chord.
      const voicing = chordVoicing(ch.rootPc, ch.qual, octave);
      // chordVoicing returns notes in ascending order (root, 3rd, 5th with
      // octave wrapping), so voice-0 = index 0 (lowest).
      for (let v = 0; v < 3; v++) {
        const fullNote = voicing[v]; // e.g. 'C3', 'E3', 'G3'
        const { noteName: parsedName, octave: noteOctave } = parseNote(fullNote);
        tracks[v].events.push({
          chordIndex: i,
          noteName: fullNote,
          octave: noteOctave,
          bars,
          startCycle,
        });
        // Seed prevMidi for suavizado (first chord always uses estricto anchor).
        prevMidi[v] = midiPitch(parsedName, noteOctave);
      }
    } else {
      // Subsequent chord: apply the minimal voice-leading permutation.
      // prevPcs is guaranteed non-null here — set after the first chord.
      const { perm } = minimalVoiceLeading(prevPcs, nextPcs);

      for (let v = 0; v < 3; v++) {
        // Voice v maps to QUAL_INTERVALS index perm[v] in the new chord.
        const iv = QUAL_INTERVALS[ch.qual][perm[v]];
        // estricto octave: the original formula from Phase 05 (ADR 0011 D4).
        const estrictoOctave = octave + Math.floor((ch.rootPc + iv) / 12);
        const pc = (ch.rootPc + iv) % 12;
        const noteNamePart = NOTE_NAMES[pc];

        // Choose octave based on registerMode.
        let noteOctave: number;
        if (registerMode === 'suavizado') {
          // suavizado: pick the octave candidate (estricto, +1, −1) closest to
          // the previous note in this voice. Ties resolve to the lower octave
          // (smoothOctave iterates lower → same → higher, strict less-than).
          noteOctave = smoothOctave(noteNamePart, estrictoOctave, prevMidi[v]);
        } else {
          // estricto: preserve the original formula exactly.
          noteOctave = estrictoOctave;
        }

        const fullNote = noteNamePart + noteOctave;
        tracks[v].events.push({
          chordIndex: i,
          noteName: fullNote,
          octave: noteOctave,
          bars,
          startCycle,
        });

        // Update prevMidi for suavizado continuity on the next chord.
        prevMidi[v] = midiPitch(noteNamePart, noteOctave);
      }
    }

    prevPcs = nextPcs;
    startCycle += bars;
  }

  return tracks;
}
