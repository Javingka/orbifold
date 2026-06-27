// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — BlockSnapshot: capture / restore functions for round-trip editing.
//
// Implements ADR 0020 D1 (BlockSnapshot discriminated union), D2 (code kept
// alongside snapshot), D3 (root/mode/octave included; bpm excluded), and D6
// (restore functions return Partial<SessionState> — no store write here).
//
// New engine for Phase 01 step 01.3 (editable-composition initiative).
// No prototype equivalent — this is original infrastructure, not a port.
//
// Purity: NO DOM / PIXI / Svelte imports — unit-testable in Vitest/Node.

import type { SessionState } from '../../state/session.js';
import type { Sound } from '../rhythm/layers.js';

// ── GrooveSnapshot ──────────────────────────────────────────────────────────
// Captures all rhythm layers with steps, euclid strings, mute, and solo flags.
// Sufficient to fully restore the Ritmo editor (no additional context needed).
//
// Source fields:
//   layers  →  SessionState.rhythm.layers  (src/core/rhythm/layers.ts lines 18–29)

export interface GrooveSnapshot {
  type: 'groove';
  layers: Array<{
    sound: Sound; // 'bd'|'sd'|'hh'|'oh'|'cp'|'rim'|'lt'|'mt'|'ht'
    steps: number[]; // 16 elements, 0 or 1
    euclid?: string; // compact 'k,n' or 'k,n,rot'
    muted?: boolean;
    solo?: boolean;
  }>;
}

// ── ArmoniaSnapshot ─────────────────────────────────────────────────────────
// Captures the full harmony state including the progression and all harmonic
// context fields needed to correctly display the Armonía editor (Tonnetz,
// scale ring, octave selector, chord-mode toggle).
//
// Source fields:
//   progression  →  SessionState.harmony.progression
//   chordMode    →  SessionState.chordMode
//   root         →  SessionState.harmony.root
//   mode         →  SessionState.harmony.mode
//   octave       →  SessionState.harmony.octave
//
// bpm is NOT included — see ADR 0020 D3 rationale.

export interface ChordSnapshotEntry {
  rootPc: number; // 0–11
  qual: 'maj' | 'min' | 'dim' | 'aug';
  gain: number;
  bars?: number;
  // Sound attributes (ADR 0018 D1, ADR 0019 D4a — all preserved per A-01-04):
  instrument?: string;
  room?: number;
  decay?: number;
  preset?: 'piano' | 'guitar' | 'synth-bass';
  lpf?: number;
  attack?: number;
  sustain?: number;
  release?: number;
  lpenv?: number;
  lpa?: number;
  lpd?: number;
  lpq?: number;
}

export interface RestSnapshotEntry {
  isRest: true;
  bars?: number;
}

/**
 * Snapshot entry for a NoteSlot.
 * Mirrors NoteSlot (note-placement Phase 01 — OD-1 resolution):
 * `{ isNote: true; rootPc; octaveOffset; bars? }`.
 */
export interface NoteSnapshotEntry {
  isNote: true;
  rootPc: number;
  octaveOffset: number;
  bars?: number;
}

export type ProgressionSnapshotEntry = ChordSnapshotEntry | RestSnapshotEntry | NoteSnapshotEntry;

export interface ArmoniaSnapshot {
  type: 'armonia';
  root: number; // 0–11; from SessionState.harmony.root
  mode: string; // from SessionState.harmony.mode
  octave: number; // 2–5; from SessionState.harmony.octave
  chordMode: 'chord' | 'arp'; // from SessionState.chordMode
  progression: ProgressionSnapshotEntry[];
}

// ── SesionSnapshot ──────────────────────────────────────────────────────────
// Composite of groove + armonia sub-snapshots (ADR 0020 OQ-4 → Option B).
// restoreSesionSnapshot delegates to restoreGrooveSnapshot +
// restoreArmoniaSnapshot on the typed sub-objects — no code duplication.

export interface SesionSnapshot {
  type: 'sesion';
  groove: GrooveSnapshot;
  armonia: ArmoniaSnapshot;
}

// ── Discriminated union ─────────────────────────────────────────────────────

export type BlockSnapshot = GrooveSnapshot | ArmoniaSnapshot | SesionSnapshot;

// ── Capture functions ───────────────────────────────────────────────────────
// Each function takes the full SessionState and returns a snapshot.
// Pure: no side effects, no store writes.

/**
 * Capture the current rhythm state as a GrooveSnapshot.
 *
 * Copies each layer's sound, steps, and optional euclid/muted/solo fields.
 * Steps are shallow-copied (number arrays are primitive-valued, safe to clone).
 */
export function captureGrooveSnapshot(state: SessionState): GrooveSnapshot {
  return {
    type: 'groove',
    layers: state.rhythm.layers.map((layer) => {
      const entry: GrooveSnapshot['layers'][number] = {
        sound: layer.sound,
        steps: [...layer.steps],
      };
      if (layer.euclid !== undefined) entry.euclid = layer.euclid;
      if (layer.muted !== undefined) entry.muted = layer.muted;
      if (layer.solo !== undefined) entry.solo = layer.solo;
      return entry;
    }),
  };
}

/**
 * Capture the current harmony state as an ArmoniaSnapshot.
 *
 * Includes root, mode, octave (harmonic context fields per ADR 0020 D3),
 * chordMode, and all progression slots.
 *
 * For Chord slots: all fields are captured including all per-chord sound
 * attributes (instrument, room, decay, preset, lpf, attack, sustain, release,
 * lpenv, lpa, lpd, lpq) — see A-01-04.
 *
 * For RestSlot entries: captured with isRest: true and optional bars.
 *
 * cx / cy render hints on Chord are NOT captured per ADR 0020 D1 rationale
 * (ephemeral Tonnetz render hints, recomputed from rootPc on next render).
 */
export function captureArmoniaSnapshot(state: SessionState): ArmoniaSnapshot {
  const progression: ProgressionSnapshotEntry[] = state.harmony.progression.map((slot) => {
    if ('isNote' in slot && slot.isNote === true) {
      // NoteSlot — capture discriminant, rootPc, octaveOffset, and optional bars.
      const note: NoteSnapshotEntry = {
        isNote: true,
        rootPc: (slot as import('../../state/session.js').NoteSlot).rootPc,
        octaveOffset: (slot as import('../../state/session.js').NoteSlot).octaveOffset,
      };
      if (slot.bars !== undefined) note.bars = slot.bars;
      return note;
    }
    if ('isRest' in slot && slot.isRest) {
      const rest: RestSnapshotEntry = { isRest: true };
      if (slot.bars !== undefined) rest.bars = slot.bars;
      return rest;
    }
    // Chord slot
    const chord = slot as import('../../state/session.js').Chord;
    const entry: ChordSnapshotEntry = {
      rootPc: chord.rootPc,
      qual: chord.qual,
      gain: chord.gain,
    };
    if (chord.bars !== undefined) entry.bars = chord.bars;
    if (chord.instrument !== undefined) entry.instrument = chord.instrument;
    if (chord.room !== undefined) entry.room = chord.room;
    if (chord.decay !== undefined) entry.decay = chord.decay;
    if (chord.preset !== undefined) entry.preset = chord.preset;
    if (chord.lpf !== undefined) entry.lpf = chord.lpf;
    if (chord.attack !== undefined) entry.attack = chord.attack;
    if (chord.sustain !== undefined) entry.sustain = chord.sustain;
    if (chord.release !== undefined) entry.release = chord.release;
    if (chord.lpenv !== undefined) entry.lpenv = chord.lpenv;
    if (chord.lpa !== undefined) entry.lpa = chord.lpa;
    if (chord.lpd !== undefined) entry.lpd = chord.lpd;
    if (chord.lpq !== undefined) entry.lpq = chord.lpq;
    return entry;
  });

  return {
    type: 'armonia',
    root: state.harmony.root,
    mode: state.harmony.mode,
    octave: state.harmony.octave,
    chordMode: state.chordMode,
    progression,
  };
}

/**
 * Capture the current full session state as a SesionSnapshot.
 *
 * Delegates to captureGrooveSnapshot and captureArmoniaSnapshot on the same
 * state object — no duplication of field-access logic.
 */
export function captureSesionSnapshot(state: SessionState): SesionSnapshot {
  return {
    type: 'sesion',
    groove: captureGrooveSnapshot(state),
    armonia: captureArmoniaSnapshot(state),
  };
}

// ── Restore functions ───────────────────────────────────────────────────────
// Each function accepts a snapshot and returns a Partial<SessionState> delta.
// The caller (openBlock in src/state/session.ts) writes the delta to the store.
// These functions have NO store import — pure engine per ADR 0020 D6.

/**
 * Derive the SessionState delta needed to restore a GrooveSnapshot.
 *
 * Returns a Partial<SessionState> with the rhythm sub-state populated.
 * Does NOT include harmony, bpm, view, or composition fields.
 */
export function restoreGrooveSnapshot(snap: GrooveSnapshot): Partial<SessionState> {
  return {
    rhythm: {
      layers: snap.layers.map((entry) => {
        const layer: import('../rhythm/layers.js').RhythmLayer = {
          sound: entry.sound,
          steps: [...entry.steps],
        };
        if (entry.euclid !== undefined) layer.euclid = entry.euclid;
        if (entry.muted !== undefined) layer.muted = entry.muted;
        if (entry.solo !== undefined) layer.solo = entry.solo;
        return layer;
      }),
    },
  };
}

/**
 * Derive the SessionState delta needed to restore an ArmoniaSnapshot.
 *
 * Returns a Partial<SessionState> with harmony sub-state and chordMode populated.
 * Does NOT include rhythm, bpm, view, or composition fields.
 *
 * Per ADR 0020 D6: the harmony subview and registerMode are NOT restored
 * (they are ephemeral UI state per HarmonyState definition in session.ts).
 * The restored harmony object spreads the current ephemeral fields; the caller
 * performs `sessionStore.update((s) => ({ ...s, ...delta }))`, so the current
 * subview and registerMode remain unless overwritten.
 *
 * Implementation note: because this is a pure function with no store access,
 * the returned harmony object uses default ephemeral values for subview and
 * registerMode. The store update in openBlock spreads the existing state first
 * so those defaults only apply if the current state lacks them.
 */
export function restoreArmoniaSnapshot(snap: ArmoniaSnapshot): Partial<SessionState> {
  const progression: import('../../state/session.js').ProgressionSlot[] = snap.progression.map(
    (entry) => {
      if ('isNote' in entry && entry.isNote === true) {
        // NoteSlot — restore from NoteSnapshotEntry.
        const e = entry as NoteSnapshotEntry;
        const note: import('../../state/session.js').NoteSlot = {
          isNote: true,
          rootPc: e.rootPc,
          octaveOffset: e.octaveOffset,
        };
        if (e.bars !== undefined) note.bars = e.bars;
        return note;
      }
      if ('isRest' in entry && entry.isRest) {
        const rest: import('../../state/session.js').RestSlot = { isRest: true };
        if (entry.bars !== undefined) rest.bars = entry.bars;
        return rest;
      }
      const e = entry as ChordSnapshotEntry;
      const chord: import('../../state/session.js').Chord = {
        rootPc: e.rootPc,
        qual: e.qual,
        gain: e.gain,
      };
      if (e.bars !== undefined) chord.bars = e.bars;
      if (e.instrument !== undefined) chord.instrument = e.instrument;
      if (e.room !== undefined) chord.room = e.room;
      if (e.decay !== undefined) chord.decay = e.decay;
      if (e.preset !== undefined) chord.preset = e.preset;
      if (e.lpf !== undefined) chord.lpf = e.lpf;
      if (e.attack !== undefined) chord.attack = e.attack;
      if (e.sustain !== undefined) chord.sustain = e.sustain;
      if (e.release !== undefined) chord.release = e.release;
      if (e.lpenv !== undefined) chord.lpenv = e.lpenv;
      if (e.lpa !== undefined) chord.lpa = e.lpa;
      if (e.lpd !== undefined) chord.lpd = e.lpd;
      if (e.lpq !== undefined) chord.lpq = e.lpq;
      return chord;
    }
  );

  return {
    chordMode: snap.chordMode,
    harmony: {
      root: snap.root,
      mode: snap.mode,
      octave: snap.octave,
      progression,
      // Ephemeral UI state — use defaults; openBlock caller spreads existing state.
      subview: 'tonnetz',
      registerMode: 'suavizado',
    },
  };
}

/**
 * Derive the SessionState delta needed to restore a SesionSnapshot.
 *
 * Delegates to restoreGrooveSnapshot and restoreArmoniaSnapshot, then merges
 * the two deltas. The harmony delta takes precedence for chordMode (which
 * belongs to ArmoniaSnapshot per ADR 0020 D3).
 */
export function restoreSesionSnapshot(snap: SesionSnapshot): Partial<SessionState> {
  const grooveDelta = restoreGrooveSnapshot(snap.groove);
  const armoniaDelta = restoreArmoniaSnapshot(snap.armonia);
  return {
    ...grooveDelta,
    ...armoniaDelta,
  };
}
