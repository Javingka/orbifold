// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — staff-layout: computes drawable primitives for the linear staff view.
// Takes a VoiceTrack[] (from computeVoiceTracks) and a pxPerCycle parameter,
// and returns the complete set of NoteHead and RestGlyph descriptors for the
// PIXI rendering layer (step 07.3).
//
// Design rules:
//   - Pure TypeScript engine: NO DOM, PIXI, or Svelte imports (ADR 0011 Consequence 1).
//   - pxPerCycle is a parameter (caller passes PX_PER_CYCLE from time-map.ts);
//     do NOT hardcode 48 — the vigent coordination-point rule requires this be
//     decoupled from the specific constant value.
//   - Dispatches on 'isRest' in event to produce NoteHead or RestGlyph.
//   - No per-voice color assignment — colors are a render-layer concern (step 07.3).
//
// See docs/orbifold-v2/phases/phase-07.md step 07.2 and ADR 0011.

import { noteToStaffPosition } from './staff-map.js';
import type { VoiceTrack, VoiceEvent, VoiceRestEvent } from './voice-tracks.js';

// ──────────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────────

/**
 * A single note-head descriptor for the PIXI rendering layer.
 * One NoteHead is produced per VoiceEvent (i.e., one per voice per chord slot).
 */
export interface NoteHead {
  /** Voice index: 0 = lowest, 1 = middle, 2 = highest. */
  voiceIndex: 0 | 1 | 2;
  /** Pixel x-coordinate from the left edge of the timeline (= startCycle * pxPerCycle). */
  x: number;
  /**
   * Diatonic steps from C4 (C4 = 0, one unit per letter-name, ±7 per octave).
   * Renderer maps this to a pixel y-coordinate using STEP_PX.
   */
  stepY: number;
  /** Sharp accidental: '#' if the note has a sharp, '' otherwise. */
  accidental: '' | '#';
  /**
   * Diatonic step values where ledger lines must be drawn.
   * Empty when the note falls on or between the five staff lines.
   */
  ledgerLines: number[];
  /** Duration of this chord in Strudel cycles. */
  bars: number;
}

/**
 * A rest-glyph descriptor for the PIXI rendering layer.
 * One RestGlyph is produced per VoiceRestEvent per voice.
 * Rendered as a short horizontal thick line by the PIXI scene.
 */
export interface RestGlyph {
  /** Voice index: 0 = lowest, 1 = middle, 2 = highest. */
  voiceIndex: 0 | 1 | 2;
  /** Pixel x-coordinate from the left edge of the timeline (= startCycle * pxPerCycle). */
  x: number;
  /** Duration of this rest in Strudel cycles. */
  bars: number;
}

/**
 * The complete layout for the linear staff view.
 * Produced by computeStaffLayout and consumed by the PIXI harmony-staff scene.
 */
export interface StaffLayout {
  /** All note-head descriptors, one per VoiceEvent across all three voice tracks. */
  noteHeads: NoteHead[];
  /** All rest-glyph descriptors, one per VoiceRestEvent across all three voice tracks. */
  restGlyphs: RestGlyph[];
  /**
   * Total pixel width of the staff content.
   * Equals max(event.startCycle + event.bars) * pxPerCycle across all events.
   * 0 for an empty progression.
   */
  totalWidth: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Compute the full set of drawable primitives for the linear staff view.
 *
 * Iterates all three voice tracks, dispatching on 'isRest' in event to
 * produce either a NoteHead or a RestGlyph. Computes totalWidth as the
 * maximum end-cycle across all events (= max startCycle + bars) * pxPerCycle.
 *
 * @param tracks      Three VoiceTrack objects from computeVoiceTracks().
 * @param pxPerCycle  Pixels per Strudel cycle; caller must pass PX_PER_CYCLE
 *                    from time-map.ts (vigent coordination-point rule).
 * @returns           StaffLayout with noteHeads, restGlyphs, and totalWidth.
 */
export function computeStaffLayout(tracks: VoiceTrack[], pxPerCycle: number): StaffLayout {
  const noteHeads: NoteHead[] = [];
  const restGlyphs: RestGlyph[] = [];
  let maxEndCycle = 0;

  for (const track of tracks) {
    const voiceIndex = track.voiceIndex;

    for (const event of track.events) {
      const endCycle = event.startCycle + event.bars;
      if (endCycle > maxEndCycle) {
        maxEndCycle = endCycle;
      }

      if ('isRest' in event) {
        // VoiceRestEvent → RestGlyph
        const restEv = event as VoiceRestEvent;
        restGlyphs.push({
          voiceIndex,
          x: restEv.startCycle * pxPerCycle,
          bars: restEv.bars,
        });
      } else {
        // VoiceEvent → NoteHead
        const noteEv = event as VoiceEvent;
        const pos = noteToStaffPosition(noteEv.noteName);
        noteHeads.push({
          voiceIndex,
          x: noteEv.startCycle * pxPerCycle,
          stepY: pos.steps,
          accidental: pos.accidental,
          ledgerLines: pos.ledgerLines,
          bars: noteEv.bars,
        });
      }
    }
  }

  const totalWidth = maxEndCycle * pxPerCycle;

  return { noteHeads, restGlyphs, totalWidth };
}
