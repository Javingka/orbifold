// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — importSession skill: structured song chart → SavedSession.
// song-import Phase 02. Pure translator; no Svelte store imports.
// Input schema: ImportSessionInputSchema (IMPORT_SCHEMA_VERSION 2).
// Output: SavedSession (SESSION_SCHEMA_VERSION 7, SCHEMA_VERSION 7).
//
// Codegen note: melodyLine and rhythmToStrudel are called DIRECTLY from
// src/core/codegen/strudel.ts, NOT via harmonyCode/sessionCode from
// src/state/session.ts. Reason: session.ts imports svelte/store at module
// load time; importing it in a Node/Vitest context drags in the entire
// Svelte store graph. melodyLine / rhythmToStrudel in strudel.ts have no
// DOM/PIXI/Svelte imports — they are pure-engine and safe to call from any
// context. This satisfies A-02-13 (no Svelte store imports in this file).
// See inventory phase-02-inventory.md section (b) for the full call chain
// analysis.

import { z } from 'zod';
import { melodyLine, rhythmToStrudel } from '../core/codegen/strudel.js';
import { noteToPc } from '../core/theory/pitch.js';
import { SESSION_SCHEMA_VERSION, type SavedSession } from '../lib/persistence.js';
import type { ArmoniaSnapshot, GrooveSnapshot } from '../core/composition/snapshot.js';
import type { RhythmLayer } from '../core/rhythm/layers.js';

// ── IMPORT_SCHEMA_VERSION ──────────────────────────────────────────────────────
//
// Versioned independently of SCHEMA_VERSION (agent output schema) and
// SESSION_SCHEMA_VERSION (persistence schema). Bump this when the input
// contract for importSession changes (e.g., new required fields, changed types).
//
// v1 — song-import Phase 02. Initial structured chart contract (OD-3 Option A):
//      { songTitle, artist?, bpm, key, mode, sections: [{ label, chords: [{ root, quality, bars? }] }] }.
//
// v2 — song-import Phase 03 step 03.4. Per-section `groove` added to SectionSpecSchema.
//      Rhythm is now first-class (OD-7 Option B resolution).
//      importSession output: 2N blocks (N harmony + N groove) + 2 tracks (harmony + rhythm).
//      Both block types carry editable snapshots (ArmoniaSnapshot / GrooveSnapshot).

export const IMPORT_SCHEMA_VERSION = 2;

// ── Constants (mirrored from agent/schema.ts SK_ arrays) ─────────────────────

/** Quality values accepted by importSession (mirrors SK_QUAL in schema.ts). */
const IMPORT_SK_QUAL = ['maj', 'min', 'dim', 'aug', 'pow'] as const;

/** Mode values accepted by importSession (mirrors SK_MODES in schema.ts). */
const IMPORT_SK_MODES = [
  'major',
  'minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'harmonic:minor',
] as const;

/**
 * Supported drum sound names (mirrors SK_SOUNDS in schema.ts and Sound type in layers.ts).
 * Restricted to this set so that ImportGrooveLayerSchema layers pass
 * SavedGrooveSnapshotSchema validation at the persistence layer.
 */
const IMPORT_SK_SOUNDS = [
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

// ── ChordSpecSchema ────────────────────────────────────────────────────────────
//
// A single chord within a section. `root` must be a parseable note name
// (e.g. "E", "A", "G#", "Bb"). Invalid names are rejected at parse time by
// the .refine() guard so that bad input fails ImportSessionInputSchema.safeParse
// rather than producing a null rootPc deep in the mapping function.
//
// The note-name validation calls noteToPc which returns null for unrecognised
// inputs (e.g. "H", "X", empty strings). Rejecting at the schema boundary
// produces a clear Zod error message ("invalid note name") rather than a
// cryptic downstream assertion failure.

export const ChordSpecSchema = z.object({
  root: z.string().refine((v) => noteToPc(v) !== null, { message: 'root: invalid note name' }),
  quality: z.enum(IMPORT_SK_QUAL),
  /** Duration in Strudel cycles. Absent = 1 bar (one cycle). */
  bars: z.number().min(0.25).max(8).optional(),
});

// ── ImportGrooveLayerSchema ────────────────────────────────────────────────────
//
// A single drum layer within a section's groove.
//
// `sound` is restricted to IMPORT_SK_SOUNDS (mirrors SK_SOUNDS in schema.ts /
// Sound type in layers.ts). Only supported sounds can be emitted by the LLM;
// unsupported names (e.g. "kazoo") are rejected at safeParse time.
//
// `steps` must be exactly 16 integers, each 0 or 1. This enforces the hard
// project invariant: 1 Strudel cycle = 1 bar of 4/4 = 16 subdivision steps.
// Compound/irregular time signatures remain deferred.

export const ImportGrooveLayerSchema = z.object({
  sound: z.enum(IMPORT_SK_SOUNDS),
  /** Exactly 16 steps, each 0 or 1. Guardrail: 1 cycle = 4/4 = 16 steps. */
  steps: z.array(z.number().int().min(0).max(1)).length(16),
});

// ── ImportGrooveSchema ─────────────────────────────────────────────────────────

export const ImportGrooveSchema = z.object({
  layers: z.array(ImportGrooveLayerSchema).min(1).max(8),
});

// ── SectionSpecSchema ──────────────────────────────────────────────────────────

export const SectionSpecSchema = z.object({
  label: z.string().min(1).max(100),
  chords: z.array(ChordSpecSchema).min(1).max(16),
  /** Required per OD-7 resolution: rhythm is first-class, parallel to harmony.
   *  If the LLM omits this field, safeParse fails and the user retries.
   *  A silent fallback to no drums would be worse than an informative error. */
  groove: ImportGrooveSchema,
});

// ── ImportSessionInputSchema ───────────────────────────────────────────────────
//
// Top-level input schema — OD-3 Option A (LLM-native structured chart).
// See decisions.md: "OD-3 — Contrato de entrada de importSession".
// The schema validates the entire structured object at the boundary so that
// importSession() can trust its input is well-formed.
//
// `key` uses the same .refine() guard as ChordSpecSchema.root: an invalid
// note name (e.g. "H") is rejected at safeParse time.

export const ImportSessionInputSchema = z.object({
  songTitle: z.string().min(1).max(200),
  artist: z.string().optional(),
  bpm: z.number().int().min(40).max(280),
  key: z.string().refine((v) => noteToPc(v) !== null, { message: 'key: invalid note name' }),
  mode: z.enum(IMPORT_SK_MODES),
  sections: z.array(SectionSpecSchema).min(1).max(16),
});

// ── Exported types ─────────────────────────────────────────────────────────────

export type ImportGrooveLayer = z.infer<typeof ImportGrooveLayerSchema>;
export type ImportGroove = z.infer<typeof ImportGrooveSchema>;
export type ImportSessionInput = z.infer<typeof ImportSessionInputSchema>;

// ── importSession ──────────────────────────────────────────────────────────────

/**
 * Pure translator: structured song chart → validated `SavedSession`.
 *
 * Input contract: OD-3 Option A (decisions.md). The caller (an LLM, a test
 * fixture, or a future scraper) supplies a pre-validated `ImportSessionInput`
 * object. This function maps it to a `SavedSession` using the Phase 01
 * vocabulary (`pow` quality, `Block.label`, `SESSION_SCHEMA_VERSION = 7`).
 *
 * No Svelte store reads or writes — this is a pure function. To apply the
 * resulting session to the live store, wrap it in an `applyImportSession`
 * call in `apply.ts`.
 *
 * ## Octave default rule (documented per phase spec requirement)
 *
 * Octave is fixed at 2 for all keys. Rationale: the primary use case for
 * `importSession` in the `song-import` initiative is rock/metal charts where
 * the guitar parts live in the low register (octave 2 places the root of
 * an E chord at E2 — standard guitar low E). A future phase may add
 * per-key octave heuristics or expose octave as an explicit input field.
 * The constant is easy to adjust when the heuristic is specified.
 *
 * ## Harmony progression
 *
 * The `SavedSession.harmony.progression` is populated from the FIRST section's
 * chords. This represents the "live" harmony session state — the flat progression
 * the user sees when the session is loaded. Section structure lives in the
 * composition blocks.
 *
 * ## Groove (OD-7 resolution: rhythm first-class, parallel to harmony)
 *
 * Each section has both a harmony block (type: 'armonia') and a groove block
 * (type: 'groove') carrying the LLM-returned rhythmic signature for that section.
 * The composition has two parallel tracks: harmony track + rhythm track.
 * The standalone `rhythm.layers` is set to the FIRST section's groove layers
 * (mirroring the pattern that harmony.progression = first section's chords).
 *
 * ## Editable snapshots
 *
 * Both harmony and groove blocks carry their snapshot inline so that
 * `openBlock()` in session.ts can restore the section's state into the
 * Armonía / Ritmo editors (fixes the "blocks not editable" gap from step 03.3).
 *
 * @param input - A pre-validated `ImportSessionInput` object.
 * @returns A `SavedSession` ready for `SavedSessionSchema.safeParse`.
 */
export function importSession(input: ImportSessionInput): SavedSession {
  // Octave default: 2 (see comment above).
  const octave = 2;

  // Derive key root pitch class. The .refine() in ImportSessionInputSchema
  // guarantees noteToPc returns non-null for key — assert here for type safety.
  const harmonyRoot = noteToPc(input.key);
  if (harmonyRoot === null) {
    // Should never happen if the caller pre-validates with ImportSessionInputSchema.
    throw new Error(`importSession: invalid key "${input.key}" — not a valid note name`);
  }

  // ── Harmony progression from the first section ─────────────────────────────

  const firstSection = input.sections[0];
  if (firstSection === undefined) {
    // Should never happen: schema requires min(1) sections.
    throw new Error('importSession: sections array is empty');
  }

  const harmonyProgression = firstSection.chords.map((chord) => {
    // noteToPc is safe here: ChordSpecSchema.root .refine() guarantees non-null.
    const rootPc = noteToPc(chord.root) as number;
    return {
      rootPc,
      qual: chord.quality,
      gain: 0.6,
      ...(chord.bars !== undefined ? { bars: chord.bars } : {}),
    };
  });

  // ── Build section pairs (harmony + groove block per section) ───────────────

  const sectionPairs = input.sections.map((section) => {
    // ── Harmony block ──────────────────────────────────────────────────────

    // Map ChordSpec → HarmonySlotInput-compatible object for melodyLine.
    // Note: melodyLine accepts { rootPc, qual, gain?, bars? } — a structural match
    // to the chord arm of HarmonySlotInput. No cast needed; the object is a subtype.
    const slots = section.chords.map((chord) => ({
      rootPc: noteToPc(chord.root) as number,
      qual: chord.quality,
      gain: 0.6 as number,
      ...(chord.bars !== undefined ? { bars: chord.bars } : {}),
    }));

    // Generate block code by calling melodyLine directly (pure, no store).
    // chordMode = 'chord' (block/parallel notes per OD-1 resolution).
    const code = melodyLine(slots, 'chord', octave).trim();

    // Block bars = sum of chord bars (defaulting absent to 1), clamped to [1, 64].
    const rawBars = section.chords.reduce((sum, chord) => sum + (chord.bars ?? 1), 0);
    const bars = Math.max(1, Math.min(64, Math.round(rawBars)));

    // Build the ArmoniaSnapshot inline (store-free; do NOT call captureArmoniaSnapshot
    // which requires a live SessionState). This enables openBlock() to restore the
    // section's specific chords into the Armonía editor.
    const armoniaSnapshot: ArmoniaSnapshot = {
      type: 'armonia',
      root: harmonyRoot,
      mode: input.mode,
      octave,
      chordMode: 'chord',
      progression: slots.map((slot) => ({
        rootPc: slot.rootPc,
        qual: slot.qual,
        gain: slot.gain,
        ...(slot.bars !== undefined ? { bars: slot.bars } : {}),
      })),
    };

    const armoniaBlock = {
      name: `${input.songTitle} — ${section.label}`,
      type: 'armonia' as const,
      code,
      bars,
      label: section.label,
      snapshot: armoniaSnapshot,
    };

    // ── Groove block ───────────────────────────────────────────────────────

    // Map ImportGrooveLayer → RhythmLayer (structural match, no cast needed).
    const grooveLayers: RhythmLayer[] = section.groove.layers.map((l) => ({
      sound: l.sound,
      steps: [...l.steps],
    }));

    // Emit the Strudel rhythm string using the pure codegen function.
    // rhythmToStrudel takes RhythmLayer[] and returns stack(...) or ''.
    const grooveCode = rhythmToStrudel(grooveLayers);

    const grooveSnapshot: GrooveSnapshot = {
      type: 'groove',
      layers: grooveLayers,
    };

    const grooveBlock = {
      name: `${input.songTitle} — ${section.label} (ritmo)`,
      type: 'groove' as const,
      code: grooveCode,
      bars,          // same bars as the harmony block — bar-for-bar alignment
      label: section.label,
      snapshot: grooveSnapshot,
    };

    return { armoniaBlock, grooveBlock };
  });

  // ── Split into parallel arrays ─────────────────────────────────────────────

  const armoniaBlocks = sectionPairs.map((p) => p.armoniaBlock);
  const grooveBlocks = sectionPairs.map((p) => p.grooveBlock);

  // allBlocks: [intro-harm, verse-harm, …, intro-groove, verse-groove, …]
  // Harmony blocks occupy indices 0…N-1; groove blocks occupy N…2N-1.
  const allBlocks = [...armoniaBlocks, ...grooveBlocks];

  // ── Track references ───────────────────────────────────────────────────────

  const harmonyTrackRefs = armoniaBlocks.map((block, idx) => ({
    blockIndex: idx,
    bars: block.bars,
  }));

  const rhythmTrackRefs = grooveBlocks.map((block, idx) => ({
    blockIndex: armoniaBlocks.length + idx,
    bars: block.bars,
  }));

  // ── Assemble SavedSession ──────────────────────────────────────────────────

  return {
    version: SESSION_SCHEMA_VERSION,
    bpm: input.bpm,
    view: 'harmony',
    chordMode: 'chord',
    harmony: {
      root: harmonyRoot,
      mode: input.mode,
      octave,
      progression: harmonyProgression,
    },
    rhythm: {
      // First section's groove layers — mirrors harmony.progression = first section's chords.
      // When the user opens the Rhythm view after import, they see the Intro's rhythmic
      // signature (OD-7 resolution).
      layers: sectionPairs[0]!.grooveBlock.snapshot.layers,
    },
    composition: {
      blocks: allBlocks,
      tracks: [
        { blockRefs: harmonyTrackRefs }, // harmony track
        { blockRefs: rhythmTrackRefs },  // rhythm track (parallel, same total bars)
      ],
    },
  };
}
