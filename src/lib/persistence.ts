// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — save/load sessions (localStorage) + URL state encoding for sharing.
// Phase 07 step 07.2.

import { z } from 'zod';
import type { SessionState } from '../state/session.js';

// ── Schema version ─────────────────────────────────────────────────────────

export const SESSION_SCHEMA_VERSION = 1;

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
  bars: z.number().min(0.5).max(8).optional(),
});

const SavedHarmonySchema = z.object({
  root: z.number().int().min(0).max(11),
  mode: z.enum(SK_MODES),
  octave: z.number().int().min(2).max(5),
  progression: z.array(SavedChordSchema).max(16),
});

const SavedRhythmLayerSchema = z.object({
  sound: z.enum(SK_SOUNDS),
  steps: z.array(z.number().int().min(0).max(1)).length(16),
  euclid: z.string().optional(),
  muted: z.boolean().optional(),
  solo: z.boolean().optional(),
});

const SavedRhythmSchema = z.object({
  layers: z.array(SavedRhythmLayerSchema).max(8),
});

const SavedBlockSchema = z.object({
  name: z.string().max(100),
  type: z.enum(['groove', 'armonia', 'sesion'] as const),
  code: z.string(),
  bars: z.number().int().min(1).max(64),
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

export const SavedSessionSchema = z.object({
  version: z.literal(1),
  bpm: z.number().int().min(40).max(280),
  view: z.enum(['rhythm', 'harmony', 'composition', 'session'] as const),
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
      progression: state.harmony.progression.map((ch) => ({
        rootPc: ch.rootPc,
        qual: ch.qual,
        gain: ch.gain,
        // cx/cy excluded — Decisions Register: render hints ephemeral
        ...(ch.bars !== undefined ? { bars: ch.bars } : {}),
      })),
    },
    rhythm: {
      layers: state.rhythm.layers.map((l) => {
        const layer: z.infer<typeof SavedRhythmLayerSchema> = {
          sound: l.sound,
          steps: l.steps.slice(0, 16),
        };
        if (l.euclid !== undefined) layer.euclid = l.euclid;
        if (l.muted !== undefined) layer.muted = l.muted;
        if (l.solo !== undefined) layer.solo = l.solo;
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
export function deserializeSession(saved: SavedSession): Omit<SessionState, 'nowPlaying'> {
  return {
    bpm: saved.bpm,
    view: saved.view,
    chordMode: saved.chordMode,
    harmony: {
      root: saved.harmony.root,
      mode: saved.harmony.mode,
      octave: saved.harmony.octave,
      progression: saved.harmony.progression.map((ch) => ({
        rootPc: ch.rootPc,
        qual: ch.qual,
        gain: ch.gain,
        ...(ch.bars !== undefined ? { bars: ch.bars } : {}),
      })),
    },
    rhythm: {
      layers: saved.rhythm.layers.map((l) => {
        const layer: {
          sound: (typeof SK_SOUNDS)[number];
          steps: number[];
          euclid?: string;
          muted?: boolean;
          solo?: boolean;
        } = {
          sound: l.sound,
          steps: [...l.steps],
        };
        if (l.euclid !== undefined) layer.euclid = l.euclid;
        if (l.muted !== undefined) layer.muted = l.muted;
        if (l.solo !== undefined) layer.solo = l.solo;
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
