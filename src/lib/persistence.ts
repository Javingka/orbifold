// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — save/load sessions (localStorage) + URL state encoding for sharing.
// Phase 07 step 07.2.

import { z } from 'zod';
import type { SessionState } from '../state/session.js';

// ── Schema version ─────────────────────────────────────────────────────────

/**
 * Schema version 6 — note-placement Phase 01 step 01.2.
 * Change from v5: `SavedNoteSlotSchema` added to the `progression` union in
 * `SavedHarmonySchema` (new `NoteSlot` variant — `isNote: true` discriminant).
 * Old v5 blobs fail the `z.literal(6)` check and are dropped by the existing
 * safeParse graceful-degradation path — no migration function needed (chord-only
 * progressions continue to load). Pilot-confirmed tradeoff consistent with
 * ADR 0020 D5 / ADR 0019 D5 / ADR 0018 D3 / ADR 0013 D1 precedent.
 *
 * v5 (prior): `SavedBlockSchema` + `snapshot?` field — editable-composition Phase 01, ADR 0020 D5.
 */
export const SESSION_SCHEMA_VERSION = 6;

// ── Shared enum constants (mirror agent/schema.ts SK_ arrays) ─────────────

const SK_SOUNDS = [
  'bd',
  'sd',
  'hh',
  'oh',
  'cp',
  'rim',
  'lt',
  'mt',
  'ht',
  'conga',
  'cajon',
  'wood',
  'shaker',
  'cb',
  'perc',
  'hand',
] as const;
const SK_MODES = [
  'major',
  'minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'harmonic:minor',
] as const;
const SK_QUAL = ['maj', 'min', 'dim', 'aug'] as const;

// ── Sub-schemas ────────────────────────────────────────────────────────────

const SavedChordSchema = z.object({
  rootPc: z.number().int().min(0).max(11),
  qual: z.enum(SK_QUAL),
  gain: z.number().min(0).max(1.2),
  bars: z.number().min(0.25).max(8).optional(),
  /** Oscillator waveform — ADR 0018 D1/D3. Default: 'sawtooth' when absent. */
  instrument: z.string().optional(),
  /** Reverb level 0–1 — ADR 0018 D1/D3. Default: 0.25 (chord) / 0.3 (melody) when absent. */
  room: z.number().min(0).max(1).optional(),
  /** Amplitude decay in seconds (> 0) — ADR 0018 D1/D3. Absent = no .decay() emitted. */
  decay: z.number().min(0).optional(),
  /** Named preset bundle — ADR 0019 D5. Technical token; not translated. */
  preset: z.enum(['piano', 'guitar', 'synth-bass']).optional(),
  /** Low-pass filter cutoff frequency in Hz — ADR 0019 D5. */
  lpf: z.number().optional(),
  /** Amplitude attack time in seconds — ADR 0019 D5. */
  attack: z.number().min(0).optional(),
  /** Amplitude sustain level 0–1 — ADR 0019 D5. */
  sustain: z.number().min(0).max(1).optional(),
  /** Amplitude release time in seconds — ADR 0019 D5. */
  release: z.number().min(0).optional(),
  /** Filter envelope modulation depth — ADR 0019 D5. */
  lpenv: z.number().optional(),
  /** Filter envelope attack time in seconds — ADR 0019 D5. */
  lpa: z.number().min(0).optional(),
  /** Filter envelope decay time in seconds — ADR 0019 D5. */
  lpd: z.number().min(0).optional(),
  /** Filter resonance (Q factor) — ADR 0019 D5. */
  lpq: z.number().min(0).optional(),
});

/**
 * A serialised rest slot. `isRest: true` is the required discriminant.
 * Rest schema is listed FIRST in the union (ADR 0012 D4) so that an entry
 * containing `isRest: true` always parses as a rest regardless of other fields.
 */
const SavedRestSchema = z.object({
  isRest: z.literal(true),
  bars: z.number().min(0.25).max(8).optional(),
});

/**
 * A serialised note slot. `isNote: true` is the required discriminant (OD-1 resolution).
 *
 * Encodes pitch as `{ rootPc, octaveOffset }` — pitch class from the Tonnetz vertex
 * plus an integer offset relative to `HarmonyState.octave`. The absolute note name is
 * derived at codegen/render time: `NOTE_NAMES[rootPc] + (octave + octaveOffset)`.
 *
 * Listed SECOND in the progression union (after SavedRestSchema, before SavedChordSchema)
 * so that `isNote: true` entries are always parsed as notes, never as chords.
 *
 * Phase 01 (note-placement initiative) — OD-1 resolution. SESSION_SCHEMA_VERSION = 6.
 */
const SavedNoteSlotSchema = z.object({
  /** Discriminant — always `true`, analogous to SavedRestSchema.isRest. */
  isNote: z.literal(true),
  /** Pitch class 0–11 from the Tonnetz vertex. */
  rootPc: z.number().int().min(0).max(11),
  /**
   * Integer offset relative to `HarmonyState.octave`. Range [-4, 4].
   * Absolute octave = `HarmonyState.octave + octaveOffset`.
   */
  octaveOffset: z.number().int().min(-4).max(4),
  /** Duration in Strudel cycles. Follows the same clampBars semantics as Chord.bars. */
  bars: z.number().min(0.25).max(8).optional(),
  // ── Timbre attributes (post-phase-01 fix, 2026-06-26) — all optional and additive ──
  // Old blobs parse cleanly: absent fields are undefined, not errors.
  instrument: z.string().optional(),
  gain: z.number().min(0).max(1.2).optional(),
  room: z.number().min(0).max(1).optional(),
  decay: z.number().min(0).optional(),
  attack: z.number().min(0).optional(),
  lpf: z.number().min(0).optional(),
});

const SavedHarmonySchema = z.object({
  root: z.number().int().min(0).max(11),
  mode: z.enum(SK_MODES),
  octave: z.number().int().min(2).max(5),
  // ADR 0012 D4: rest schema first so { isRest: true, ... } always parses as rest.
  // note-placement Phase 01: note schema second so { isNote: true, ... } always parses as note.
  // Old sessions (chord-only, no isRest/isNote field) still parse: elements fail
  // SavedRestSchema and SavedNoteSlotSchema, then succeed on SavedChordSchema as before.
  progression: z.array(z.union([SavedRestSchema, SavedNoteSlotSchema, SavedChordSchema])).max(16),
});

const SavedRhythmLayerSchema = z.object({
  sound: z.enum(SK_SOUNDS),
  /**
   * Relaxed from .length(16) in Phase 07 to support native-length n-step patterns;
   * 16-step blobs continue to parse (16 satisfies min(1).max(16)).
   */
  steps: z.array(z.number().int().min(0).max(1)).min(1).max(16),
  euclid: z.string().optional(),
  /** ADR 0025 D5/D7 — optional; absent in pre-Phase-01 sessions; falls back to `sound` in codegen. */
  strudelSample: z.string().optional(),
  muted: z.boolean().optional(),
  solo: z.boolean().optional(),
  /** Phase 05: additive optional — pre-Phase-05 sessions without this field parse cleanly. */
  locked: z.boolean().optional(),
});

const SavedRhythmSchema = z.object({
  layers: z.array(SavedRhythmLayerSchema).max(8),
});

// ── Block snapshot sub-schemas (ADR 0020 D1 / D5) ─────────────────────────
// Mirror the BlockSnapshot discriminated union from
// src/core/composition/snapshot.ts — kept in sync manually.
// These are persistence-layer schemas only; runtime types live in snapshot.ts.

/**
 * Zod schema for a single rhythm layer inside a GrooveSnapshot.
 * Mirrors GrooveSnapshot.layers[number] from snapshot.ts.
 */
const SavedGrooveLayerSchema = z.object({
  sound: z.enum(SK_SOUNDS),
  /**
   * Relaxed from .length(16) in Phase 07 to support native-length n-step patterns;
   * 16-step blobs continue to parse (16 satisfies min(1).max(16)).
   */
  steps: z.array(z.number().int().min(0).max(1)).min(1).max(16),
  euclid: z.string().optional(),
  muted: z.boolean().optional(),
  solo: z.boolean().optional(),
});

/**
 * Zod schema for GrooveSnapshot — type:'groove' + layers array.
 * Mirrors GrooveSnapshot from snapshot.ts (ADR 0020 D1).
 */
const SavedGrooveSnapshotSchema = z.object({
  type: z.literal('groove'),
  layers: z.array(SavedGrooveLayerSchema),
});

/**
 * Zod schema for a single chord entry inside an ArmoniaSnapshot.
 * Mirrors ChordSnapshotEntry from snapshot.ts (all per-chord sound attributes
 * from ADR 0018 D1 and ADR 0019 D4a are preserved — A-01-04).
 */
const SavedChordSnapshotEntrySchema = z.object({
  rootPc: z.number().int().min(0).max(11),
  qual: z.enum(SK_QUAL),
  gain: z.number().min(0).max(1.2),
  bars: z.number().min(0.25).max(8).optional(),
  instrument: z.string().optional(),
  room: z.number().min(0).max(1).optional(),
  decay: z.number().min(0).optional(),
  preset: z.enum(['piano', 'guitar', 'synth-bass']).optional(),
  lpf: z.number().optional(),
  attack: z.number().min(0).optional(),
  sustain: z.number().min(0).max(1).optional(),
  release: z.number().min(0).optional(),
  lpenv: z.number().optional(),
  lpa: z.number().min(0).optional(),
  lpd: z.number().min(0).optional(),
  lpq: z.number().min(0).optional(),
});

/**
 * Zod schema for a rest entry inside an ArmoniaSnapshot.
 * Mirrors RestSnapshotEntry from snapshot.ts.
 */
const SavedRestSnapshotEntrySchema = z.object({
  isRest: z.literal(true),
  bars: z.number().min(0.25).max(8).optional(),
});

/**
 * Zod schema for a note entry inside an ArmoniaSnapshot.
 * Mirrors NoteSnapshotEntry from snapshot.ts (note-placement Phase 01 — OD-1 resolution).
 */
const SavedNoteSnapshotEntrySchema = z.object({
  isNote: z.literal(true),
  rootPc: z.number().int().min(0).max(11),
  octaveOffset: z.number().int().min(-4).max(4),
  bars: z.number().min(0.25).max(8).optional(),
});

/**
 * Zod schema for ArmoniaSnapshot — type:'armonia' + harmonic context + progression.
 * Mirrors ArmoniaSnapshot from snapshot.ts (ADR 0020 D1 / D3).
 * Progression uses a union: rest schema listed first (ADR 0012 D4 precedent),
 * note schema second (note-placement Phase 01), chord schema last.
 */
const SavedArmoniaSnapshotSchema = z.object({
  type: z.literal('armonia'),
  root: z.number().int().min(0).max(11),
  mode: z.string(),
  octave: z.number().int().min(2).max(5),
  chordMode: z.enum(['chord', 'arp']),
  progression: z.array(
    z.union([
      SavedRestSnapshotEntrySchema,
      SavedNoteSnapshotEntrySchema,
      SavedChordSnapshotEntrySchema,
    ])
  ),
});

/**
 * Zod schema for SesionSnapshot — type:'sesion' + groove sub-snapshot + armonia sub-snapshot.
 * Mirrors SesionSnapshot from snapshot.ts (ADR 0020 D1 — composite per OQ-4 Option B).
 */
const SavedSesionSnapshotSchema = z.object({
  type: z.literal('sesion'),
  groove: SavedGrooveSnapshotSchema,
  armonia: SavedArmoniaSnapshotSchema,
});

/**
 * Zod discriminated union over all three snapshot variants (type tag: 'groove' | 'armonia' | 'sesion').
 * Used as the optional `snapshot?` field on SavedBlockSchema (ADR 0020 D5).
 */
const SavedBlockSnapshotSchema = z.discriminatedUnion('type', [
  SavedGrooveSnapshotSchema,
  SavedArmoniaSnapshotSchema,
  SavedSesionSnapshotSchema,
]);

const SavedBlockSchema = z.object({
  name: z.string().max(100),
  type: z.enum(['groove', 'armonia', 'sesion'] as const),
  code: z.string(),
  bars: z.number().int().min(1).max(64),
  /** Block snapshot captured at save time (editable-composition Phase 01, ADR 0020 D5). */
  snapshot: SavedBlockSnapshotSchema.optional(),
});

const SavedBlockRefSchema = z.object({
  blockIndex: z.number().int().min(0),
  bars: z.number().int().min(1).max(64),
});

const SavedTrackSchema = z.object({
  blockRefs: z.array(SavedBlockRefSchema),
});

const SavedCompositionSchema = z.object({
  blocks: z.array(SavedBlockSchema).max(64),
  tracks: z.array(SavedTrackSchema).max(16),
});

/**
 * SavedSessionSchema v6 — note-placement Phase 01 step 01.2.
 *
 * Changes from v5:
 *   - `version` literal bumped from 5 to 6.
 *   - `SavedNoteSlotSchema` added to the `progression` union in `SavedHarmonySchema`.
 *     New `NoteSlot` variant with `isNote: true` discriminant (OD-1 resolution).
 *
 * Version 5 blobs fail the `z.literal(6)` check → dropped by safeParse (existing
 * graceful-degradation behavior, Pilot-confirmed tradeoff consistent with
 * ADR 0020 D5 / ADR 0019 D5 / ADR 0018 D3 / ADR 0013 D1 precedent).
 *
 * v5 (prior): SavedBlockSchema + snapshot? field — editable-composition Phase 01, ADR 0020 D5.
 */
export const SavedSessionSchema = z.object({
  version: z.literal(6),
  bpm: z.number().int().min(40).max(280),
  view: z
    .enum(['rhythm', 'harmony', 'composition', 'session', 'code'] as const)
    .catch('harmony' as const),
  chordMode: z.enum(['chord', 'arp'] as const),
  harmony: SavedHarmonySchema,
  rhythm: SavedRhythmSchema,
  composition: SavedCompositionSchema,
});

export type SavedSession = z.infer<typeof SavedSessionSchema>;

// ── Serialize ──────────────────────────────────────────────────────────────

/**
 * Convert live SessionState to a SavedSession ready for JSON storage.
 * Strips nowPlaying (ephemeral), cx/cy from chords (Decisions Register),
 * Block.id / Track.id (ADR 0009), and converts Track.blocks[].blockId
 * references to integer blockIndex positions.
 */
export function serializeSession(state: SessionState): SavedSession {
  return {
    version: SESSION_SCHEMA_VERSION,
    bpm: state.bpm,
    view: state.view,
    chordMode: state.chordMode,
    harmony: {
      root: state.harmony.root,
      mode: state.harmony.mode as SavedSession['harmony']['mode'],
      octave: state.harmony.octave,
      progression: state.harmony.progression.map((slot) => {
        // note-placement Phase 01: narrow on isNote discriminant first.
        if ('isNote' in slot && slot.isNote === true) {
          // NoteSlot — serialize discriminant, rootPc, octaveOffset, and optional bars.
          return slot.bars !== undefined
            ? {
                isNote: true as const,
                rootPc: slot.rootPc,
                octaveOffset: slot.octaveOffset,
                bars: slot.bars,
              }
            : { isNote: true as const, rootPc: slot.rootPc, octaveOffset: slot.octaveOffset };
        }
        // ADR 0012 D4: narrow on isRest discriminant.
        if ('isRest' in slot) {
          // Rest slot — serialize only the discriminant and optional bars.
          // cx/cy do not exist on RestSlot; only bars is carried.
          return slot.bars !== undefined
            ? { isRest: true as const, bars: slot.bars }
            : { isRest: true as const };
        }
        // Chord slot — cx/cy excluded (Decisions Register: render hints ephemeral).
        // Cast is safe: isNote and isRest branches above have returned already.
        const chord = slot as import('../state/session.js').Chord;
        return {
          rootPc: chord.rootPc,
          qual: chord.qual,
          gain: chord.gain,
          ...(chord.bars !== undefined ? { bars: chord.bars } : {}),
          // ADR 0018 D3: persist sound attributes when present.
          ...(chord.instrument !== undefined ? { instrument: chord.instrument } : {}),
          ...(chord.room !== undefined ? { room: chord.room } : {}),
          ...(chord.decay !== undefined ? { decay: chord.decay } : {}),
          // ADR 0019 D5: persist preset and filter/envelope attributes when present.
          ...(chord.preset !== undefined ? { preset: chord.preset } : {}),
          ...(chord.lpf !== undefined ? { lpf: chord.lpf } : {}),
          ...(chord.attack !== undefined ? { attack: chord.attack } : {}),
          ...(chord.sustain !== undefined ? { sustain: chord.sustain } : {}),
          ...(chord.release !== undefined ? { release: chord.release } : {}),
          ...(chord.lpenv !== undefined ? { lpenv: chord.lpenv } : {}),
          ...(chord.lpa !== undefined ? { lpa: chord.lpa } : {}),
          ...(chord.lpd !== undefined ? { lpd: chord.lpd } : {}),
          ...(chord.lpq !== undefined ? { lpq: chord.lpq } : {}),
        };
      }),
    },
    rhythm: {
      layers: state.rhythm.layers.map((l) => {
        const layer: z.infer<typeof SavedRhythmLayerSchema> = {
          sound: l.sound,
          steps: l.steps.slice(0, 16),
        };
        if (l.euclid !== undefined) layer.euclid = l.euclid;
        // ADR 0025 D5: persist strudelSample when present so reloaded sessions retain authentic samples.
        if (l.strudelSample !== undefined) layer.strudelSample = l.strudelSample;
        if (l.muted !== undefined) layer.muted = l.muted;
        if (l.solo !== undefined) layer.solo = l.solo;
        // Phase 05: persist locked when true so reloaded sessions retain cultural signature locks.
        // Only written when explicitly true; absent field → undefined → treated as unlocked.
        if (l.locked === true) layer.locked = true;
        return layer;
      }),
    },
    composition: {
      blocks: state.composition.blocks.map((b) => ({
        name: b.name,
        type: b.type,
        code: b.code,
        bars: b.bars,
        // id excluded — ADR 0009
        // snapshot included when present (ADR 0020 D5); omitted when undefined per Zod defaults
        ...(b.snapshot !== undefined ? { snapshot: b.snapshot } : {}),
      })),
      tracks: state.composition.tracks.map((t) => ({
        // id excluded — ADR 0009
        blockRefs: t.blocks
          .map((ref) => {
            const idx = state.composition.blocks.findIndex((b) => b.id === ref.blockId);
            if (idx === -1) return null;
            return { blockIndex: idx, bars: ref.bars };
          })
          .filter((r): r is { blockIndex: number; bars: number } => r !== null),
      })),
    },
  };
}

// ── Deserialize ────────────────────────────────────────────────────────────

/**
 * Convert SavedSession back to a partial SessionState (no IDs, no nowPlaying).
 * Pure function used for roundtrip testing. For actual store application,
 * use applyLoadedSession() in session.ts which assigns fresh IDs via the counters.
 *
 * Block.id and Track.id are set to '' (placeholder). Track blockId refs are set
 * to the string representation of blockIndex (placeholder rebuilt by applyLoadedSession).
 */
// autopilot is also excluded: it is ephemeral runtime-only state (ADR 0022 D1/D7)
// and is not present in SavedSession. Callers (applyLoadedSession) merge the
// deserialized partial with the current store state, which already has autopilot.
export function deserializeSession(
  saved: SavedSession
): Omit<SessionState, 'nowPlaying' | 'autopilot'> {
  return {
    bpm: saved.bpm,
    view: saved.view,
    chordMode: saved.chordMode,
    harmony: {
      root: saved.harmony.root,
      mode: saved.harmony.mode,
      octave: saved.harmony.octave,
      // ADR 0012 D4: narrow on isRest discriminant in deserialized union.
      // note-placement Phase 01: also narrow on isNote for NoteSlot.
      progression: saved.harmony.progression.map((slot) => {
        if ('isNote' in slot && slot.isNote === true) {
          return slot.bars !== undefined
            ? {
                isNote: true as const,
                rootPc: slot.rootPc,
                octaveOffset: slot.octaveOffset,
                bars: slot.bars,
              }
            : { isNote: true as const, rootPc: slot.rootPc, octaveOffset: slot.octaveOffset };
        }
        if ('isRest' in slot) {
          return slot.bars !== undefined
            ? { isRest: true as const, bars: slot.bars }
            : { isRest: true as const };
        }
        // Chord slot: cast is safe — isNote and isRest branches above have returned.
        // The Zod-inferred union after ruling out isNote and isRest is the chord shape.
        type ChordShape = z.infer<typeof SavedChordSchema>;
        const chord = slot as ChordShape;
        return {
          rootPc: chord.rootPc,
          qual: chord.qual,
          gain: chord.gain,
          ...(chord.bars !== undefined ? { bars: chord.bars } : {}),
          // ADR 0018 D3: carry through sound attributes.
          ...(chord.instrument !== undefined ? { instrument: chord.instrument } : {}),
          ...(chord.room !== undefined ? { room: chord.room } : {}),
          ...(chord.decay !== undefined ? { decay: chord.decay } : {}),
          // ADR 0019 D5: carry through preset and filter/envelope attributes.
          ...(chord.preset !== undefined ? { preset: chord.preset } : {}),
          ...(chord.lpf !== undefined ? { lpf: chord.lpf } : {}),
          ...(chord.attack !== undefined ? { attack: chord.attack } : {}),
          ...(chord.sustain !== undefined ? { sustain: chord.sustain } : {}),
          ...(chord.release !== undefined ? { release: chord.release } : {}),
          ...(chord.lpenv !== undefined ? { lpenv: chord.lpenv } : {}),
          ...(chord.lpa !== undefined ? { lpa: chord.lpa } : {}),
          ...(chord.lpd !== undefined ? { lpd: chord.lpd } : {}),
          ...(chord.lpq !== undefined ? { lpq: chord.lpq } : {}),
        };
      }),
      // Phase 08 (step 08.5): ephemeral UI fields — NOT from SavedHarmonySchema.
      // These fields are never persisted; always restored to defaults on load.
      // See HarmonyState.subview and HarmonyState.registerMode JSDoc.
      subview: 'tonnetz' as const,
      registerMode: 'suavizado' as const,
    },
    rhythm: {
      layers: saved.rhythm.layers.map((l) => {
        const layer: {
          sound: (typeof SK_SOUNDS)[number];
          steps: number[];
          euclid?: string;
          strudelSample?: string;
          muted?: boolean;
          solo?: boolean;
          locked?: boolean;
        } = {
          sound: l.sound,
          steps: [...l.steps],
        };
        if (l.euclid !== undefined) layer.euclid = l.euclid;
        // ADR 0025 D5/D7: carry through strudelSample; absent in pre-Phase-01 sessions → undefined → codegen falls back to sound.
        if (l.strudelSample !== undefined) layer.strudelSample = l.strudelSample;
        if (l.muted !== undefined) layer.muted = l.muted;
        if (l.solo !== undefined) layer.solo = l.solo;
        // Phase 05: carry through locked; absent in pre-Phase-05 sessions → undefined → treated as unlocked.
        if (l.locked !== undefined) layer.locked = l.locked;
        return layer;
      }),
    },
    composition: {
      // IDs are placeholders — applyLoadedSession (session.ts) assigns real IDs
      blocks: saved.composition.blocks.map((b) => ({
        id: '',
        name: b.name,
        type: b.type,
        code: b.code,
        bars: b.bars,
        // snapshot carried through when present (ADR 0020 D5); absent → undefined (legacy block)
        ...(b.snapshot !== undefined ? { snapshot: b.snapshot } : {}),
      })),
      tracks: saved.composition.tracks.map((t) => ({
        id: '',
        blocks: t.blockRefs.map((ref) => ({
          blockId: String(ref.blockIndex), // placeholder — rebuilt by applyLoadedSession
          bars: ref.bars,
        })),
      })),
    },
  };
}

// ── localStorage helpers ───────────────────────────────────────────────────

export const PERSISTENCE_KEY_PREFIX = 'orbifold.session.';
const SESSION_LIST_KEY = 'orbifold.sessionList';

export function saveSession(name: string, state: SessionState): void {
  const serialized = serializeSession(state);
  localStorage.setItem(PERSISTENCE_KEY_PREFIX + name, JSON.stringify(serialized));
  const list = listSavedSessions();
  if (!list.includes(name)) {
    list.push(name);
    localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(list));
  }
}

export function loadSavedSession(name: string): SavedSession | null {
  const raw = localStorage.getItem(PERSISTENCE_KEY_PREFIX + name);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = SavedSessionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function listSavedSessions(): string[] {
  const raw = localStorage.getItem(SESSION_LIST_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function deleteSession(name: string): void {
  localStorage.removeItem(PERSISTENCE_KEY_PREFIX + name);
  const list = listSavedSessions().filter((n) => n !== name);
  localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(list));
}

// ── URL encoding ───────────────────────────────────────────────────────────

export function encodeSession(state: SessionState): string {
  return btoa(encodeURIComponent(JSON.stringify(serializeSession(state))));
}

export function decodeSession(encoded: string): SavedSession | null {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(atob(encoded)));
    const result = SavedSessionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
