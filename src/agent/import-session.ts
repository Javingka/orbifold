// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — importSession skill: structured song chart → SavedSession.
// song-import Phase 02. Pure translator; no Svelte store imports.
// Input schema: ImportSessionInputSchema (IMPORT_SCHEMA_VERSION 1).
// Output: SavedSession (SESSION_SCHEMA_VERSION 7, SCHEMA_VERSION 7).
//
// Codegen note: melodyLine is called DIRECTLY from src/core/codegen/strudel.ts,
// NOT via harmonyCode/sessionCode from src/state/session.ts. Reason: session.ts
// imports svelte/store at module load time; importing it in a Node/Vitest context
// drags in the entire Svelte store graph. melodyLine in strudel.ts has no
// DOM/PIXI/Svelte imports — it is pure-engine and safe to call from any context.
// This satisfies A-02-13 (no Svelte store imports in this file).
// See inventory phase-02-inventory.md section (b) for the full call chain analysis.

import { z } from 'zod';
import { melodyLine } from '../core/codegen/strudel.js';
import { noteToPc } from '../core/theory/pitch.js';
import { SESSION_SCHEMA_VERSION, type SavedSession } from '../lib/persistence.js';

// ── IMPORT_SCHEMA_VERSION ──────────────────────────────────────────────────────
//
// Versioned independently of SCHEMA_VERSION (agent output schema) and
// SESSION_SCHEMA_VERSION (persistence schema). Bump this when the input
// contract for importSession changes (e.g., new required fields, changed types).
//
// v1 — song-import Phase 02. Initial structured chart contract (OD-3 Option A):
//      { songTitle, artist?, bpm, key, mode, sections: [{ label, chords: [{ root, quality, bars? }] }] }.

export const IMPORT_SCHEMA_VERSION = 1;

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

// ── SectionSpecSchema ──────────────────────────────────────────────────────────

export const SectionSpecSchema = z.object({
  label: z.string().min(1).max(100),
  chords: z.array(ChordSpecSchema).min(1).max(16),
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

// ── ImportSessionInput ─────────────────────────────────────────────────────────

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
 * call in `apply.ts` (out of scope for Phase 02).
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
 * ## Groove default
 *
 * Rhythm is set to a minimal default: a single `bd` layer with a kick on beats
 * 1 and 3 (`[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]`). Groove generation is a
 * separate concern (the existing autopilot/recipe system handles it). The
 * import skill's scope is harmony + section structure, not rhythm.
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

  // ── Blocks — one per section ───────────────────────────────────────────────

  const blocks = input.sections.map((section) => {
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

    // Block name: "<songTitle> — <sectionLabel>" per decisions.md convention.
    // Block label: bare section label for composition-timeline display (Phase 01).
    return {
      name: `${input.songTitle} — ${section.label}`,
      type: 'armonia' as const,
      code,
      bars,
      label: section.label,
    };
  });

  // ── Track: single track referencing all blocks in order ────────────────────

  const blockRefs = blocks.map((block, idx) => ({
    blockIndex: idx,
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
      // Minimal groove default: kick on beats 1 and 3 of a 16-step pattern.
      // Rhythm generation is out of scope; this satisfies SavedRhythmSchema.
      layers: [
        {
          sound: 'bd',
          steps: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    },
    composition: {
      blocks,
      tracks: [
        {
          blockRefs,
        },
      ],
    },
  };
}
