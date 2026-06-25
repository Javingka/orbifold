// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — save/load sessions (localStorage) + URL state encoding for sharing.
// Phase 07 step 07.2.

import { z } from 'zod';
import type { SessionState } from '../state/session.js';

// ── Schema version ─────────────────────────────────────────────────────────

/**
 * Schema version 5 — editable-composition Phase 01 step 01.4, ADR 0020 D5.
 * Change from v4: `SavedBlockSchema` gains an optional `snapshot?` field — a
 * `z.discriminatedUnion` mirroring the `BlockSnapshot` discriminated union
 * (GrooveSnapshot | ArmoniaSnapshot | SesionSnapshot). Version 4 blobs fail
 * the `z.literal(5)` check and are dropped by the existing safeParse
 * graceful-degradation path — no migration function. Pilot-confirmed tradeoff
 * (same precedent as ADR 0020 D5 / ADR 0019 D5 / ADR 0018 D3 / ADR 0013 D1).
 */
export const SESSION_SCHEMA_VERSION = 5;

// ── Shared enum constants (mirror agent/schema.ts SK_ arrays) ─────────────

const SK_SOUNDS = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'mt', 'ht'] as const;
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

const SavedHarmonySchema = z.object({
  root: z.number().int().min(0).max(11),
  mode: z.enum(SK_MODES),
  octave: z.number().int().min(2).max(5),
  // ADR 0012 D4: rest schema first so { isRest: true, ... } always parses as rest.
  // Old sessions (chord-only, no isRest field) still parse: elements fail SavedRestSchema
  // (missing isRest: literal(true)) and succeed on SavedChordSchema as before.
  progression: z.array(z.union([SavedRestSchema, SavedChordSchema])).max(16),
});

const SavedRhythmLayerSchema = z.object({
  sound: z.enum(SK_SOUNDS),
  steps: z.array(z.number().int().min(0).max(1)).length(16),
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
  steps: z.array(z.number().int().min(0).max(1)).length(16),
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
 * Zod schema for ArmoniaSnapshot — type:'armonia' + harmonic context + progression.
 * Mirrors ArmoniaSnapshot from snapshot.ts (ADR 0020 D1 / D3).
 * Progression uses a union: rest schema listed first (ADR 0012 D4 precedent).
 */
const SavedArmoniaSnapshotSchema = z.object({
  type: z.literal('armonia'),
  root: z.number().int().min(0).max(11),
  mode: z.string(),
  octave: z.number().int().min(2).max(5),
  chordMode: z.enum(['chord', 'arp']),
  progression: z.array(z.union([SavedRestSnapshotEntrySchema, SavedChordSnapshotEntrySchema])),
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
 * SavedSessionSchema v5 — editable-composition Phase 01 step 01.4, ADR 0020 D5.
 *
 * Changes from v4:
 *   - `version` literal bumped from 4 to 5.
 *   - `SavedBlockSchema` gains an optional `snapshot?` field — a Zod discriminated
 *     union for GrooveSnapshot | ArmoniaSnapshot | SesionSnapshot (ADR 0020 D1/D5).
 *
 * Version 4 blobs fail the `z.literal(5)` check → dropped by safeParse (existing
 * graceful-degradation behavior, Pilot-confirmed tradeoff per ADR 0020 D5 /
 * ADR 0019 D5 / ADR 0018 D3 / ADR 0013 D1 precedent).
 */
export const SavedSessionSchema = z.object({
  version: z.literal(5),
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
        // ADR 0012 D4: narrow on isRest discriminant.
        if ('isRest' in slot) {
          // Rest slot — serialize only the discriminant and optional bars.
          // cx/cy do not exist on RestSlot; only bars is carried.
          return slot.bars !== undefined
            ? { isRest: true as const, bars: slot.bars }
            : { isRest: true as const };
        }
        // Chord slot — cx/cy excluded (Decisions Register: render hints ephemeral).
        return {
          rootPc: slot.rootPc,
          qual: slot.qual,
          gain: slot.gain,
          ...(slot.bars !== undefined ? { bars: slot.bars } : {}),
          // ADR 0018 D3: persist sound attributes when present.
          ...(slot.instrument !== undefined ? { instrument: slot.instrument } : {}),
          ...(slot.room !== undefined ? { room: slot.room } : {}),
          ...(slot.decay !== undefined ? { decay: slot.decay } : {}),
          // ADR 0019 D5: persist preset and filter/envelope attributes when present.
          ...(slot.preset !== undefined ? { preset: slot.preset } : {}),
          ...(slot.lpf !== undefined ? { lpf: slot.lpf } : {}),
          ...(slot.attack !== undefined ? { attack: slot.attack } : {}),
          ...(slot.sustain !== undefined ? { sustain: slot.sustain } : {}),
          ...(slot.release !== undefined ? { release: slot.release } : {}),
          ...(slot.lpenv !== undefined ? { lpenv: slot.lpenv } : {}),
          ...(slot.lpa !== undefined ? { lpa: slot.lpa } : {}),
          ...(slot.lpd !== undefined ? { lpd: slot.lpd } : {}),
          ...(slot.lpq !== undefined ? { lpq: slot.lpq } : {}),
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
      progression: saved.harmony.progression.map((slot) => {
        if ('isRest' in slot) {
          return slot.bars !== undefined
            ? { isRest: true as const, bars: slot.bars }
            : { isRest: true as const };
        }
        return {
          rootPc: slot.rootPc,
          qual: slot.qual,
          gain: slot.gain,
          ...(slot.bars !== undefined ? { bars: slot.bars } : {}),
          // ADR 0018 D3: carry through sound attributes.
          ...(slot.instrument !== undefined ? { instrument: slot.instrument } : {}),
          ...(slot.room !== undefined ? { room: slot.room } : {}),
          ...(slot.decay !== undefined ? { decay: slot.decay } : {}),
          // ADR 0019 D5: carry through preset and filter/envelope attributes.
          ...(slot.preset !== undefined ? { preset: slot.preset } : {}),
          ...(slot.lpf !== undefined ? { lpf: slot.lpf } : {}),
          ...(slot.attack !== undefined ? { attack: slot.attack } : {}),
          ...(slot.sustain !== undefined ? { sustain: slot.sustain } : {}),
          ...(slot.release !== undefined ? { release: slot.release } : {}),
          ...(slot.lpenv !== undefined ? { lpenv: slot.lpenv } : {}),
          ...(slot.lpa !== undefined ? { lpa: slot.lpa } : {}),
          ...(slot.lpd !== undefined ? { lpd: slot.lpd } : {}),
          ...(slot.lpq !== undefined ? { lpq: slot.lpq } : {}),
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
