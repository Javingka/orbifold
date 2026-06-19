// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Zod schema: { rhythm?, harmony?, note? } constrained to UI model.
// Validates agent JSON output against the types the UI can apply.
// Phase 06 step 06.2.
//
// Schema constants mirror prototype lines 1670–1673 (SK_SOUNDS, SK_MODES, SK_QUAL).

import { z } from 'zod';

// ── Version ────────────────────────────────────────────────────────────────

/**
 * Schema version constant; bump if the shape changes in a future phase.
 * Phase 06: bumped from 1 to 2 — `HarmonyChordSchema` now accepts a discriminated
 * rest union `{ isRest: true; bars? }` in addition to the chord object (ADR 0012 D4).
 * Phase 02 (harmonic-rhythm-improvements): bumped from 2 to 3 — `HarmonyChordCoreSchema`
 * gains `instrument?`, `room?`, `decay?` optional fields (ADR 0018 D4).
 * Phase 03 (harmonic-rhythm-improvements): bumped from 3 to 4 — `HarmonyChordCoreSchema`
 * gains `preset?`, `lpf?`, `attack?`, `sustain?`, `release?`, `lpenv?`, `lpa?`, `lpd?`,
 * `lpq?` optional fields (ADR 0019 D6).
 * Phase 01 (ai-composition-authoring): bumped from 4 to 5 — `AgentOutputSchema` gains
 * `saveAsBlock?` field (`SaveAsBlockSpecSchema`); `superRefine` guard relaxed to accept
 * at least one of `rhythm`, `harmony`, or `saveAsBlock` (ADR 0021 D1–D2).
 * Phase 03 (ai-jam): bumped from 5 to 6 — `AgentOutputSchema` gains `musicalIntent?`
 * field (`MusicalIntentSchema`); `superRefine` guard relaxed to accept at least one of
 * `rhythm`, `harmony`, `saveAsBlock`, or `musicalIntent` (ADR 0023 D1–D2).
 */
export const SCHEMA_VERSION = 6;

// ── Constants (prototype lines 1670–1673) ─────────────────────────────────

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

// ── RhythmLayer — steps OR euclid variant (exactly one) ───────────────────

/**
 * Steps-variant: explicit 16-step array of 0/1 values.
 * `steps` must be exactly 16 elements.
 *
 * Prototype §7: `steps` = 16 integers 0/1.
 */
const RhythmLayerStepsSchema = z.object({
  sound: z.enum(SK_SOUNDS),
  steps: z
    .array(z.union([z.literal(0), z.literal(1)]))
    .length(16, 'steps must be exactly 16 entries'),
});

/**
 * Euclid-variant: Euclidean rhythm parameters.
 * Constraints: k ∈ [1,16], n ∈ [2,16], rot ∈ [0, n-1].
 *
 * Prototype §7: `euclid {k:1..16, n:2..16, rot:0..n-1}`.
 */
const RhythmLayerEuclidSchema = z
  .object({
    sound: z.enum(SK_SOUNDS),
    euclid: z.object({
      k: z.number().int().min(1).max(16),
      n: z.number().int().min(2).max(16),
      rot: z.number().int().min(0).max(15),
    }),
  })
  .superRefine((val, ctx) => {
    if (val.euclid.rot > val.euclid.n - 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: val.euclid.n - 1,
        type: 'number',
        inclusive: true,
        message: `rot must be ≤ n-1 (got rot=${val.euclid.rot}, n=${val.euclid.n})`,
        path: ['euclid', 'rot'],
      });
    }
  });

/**
 * A single rhythm layer: exactly one of `steps` (16-element array) or
 * `euclid` ({k,n,rot}) — not both, not neither.
 *
 * Prototype §7 and constants lines 1670–1673.
 */
export const RhythmLayerSchema = z.union([RhythmLayerStepsSchema, RhythmLayerEuclidSchema]);

// ── RhythmSpec ─────────────────────────────────────────────────────────────

/**
 * Full rhythm specification: 1–6 layers.
 *
 * Prototype §7: layers array; limits match UI capability.
 */
export const RhythmSpecSchema = z.object({
  layers: z.array(RhythmLayerSchema).min(1).max(6),
});

// ── HarmonyChord ───────────────────────────────────────────────────────────

/**
 * A rest (silence) slot in the progression. `isRest: true` is the discriminant.
 * `bars` follows the same semantics as chord `bars` (default 1, multiples of 0.25).
 * Introduced in Phase 06 — ADR 0012.
 *
 * Rest schema is listed FIRST in `HarmonyChordSchema` union (ADR 0012 D4) so that an
 * entry with `{ isRest: true, ... }` always parses as a rest regardless of other fields.
 */
const HarmonyRestSchema = z.object({
  isRest: z.literal(true),
  bars: z.number().min(0.25).max(8).optional(),
});

/**
 * Core chord object schema (not exported). Used inside the `HarmonyChordSchema` union.
 * Root note name and quality are required; gain and bars are optional.
 *
 * Prototype §7: `quality ∈ {maj,min,dim,aug}`.
 *
 * NOTE: Block snapshot fields (GrooveSnapshot, ArmoniaSnapshot, SesionSnapshot)
 * are a composition-layer concern defined in src/core/composition/snapshot.ts.
 * They are NOT part of agent output and must NOT be added here. Agent output
 * describes live session mutations; block persistence is a separate concern.
 * See ADR 0020 D7. Any future F3 (AI improvisation) requirement for agent-to-block
 * interaction must be governed by a new ADR before any schema change is made.
 */
const HarmonyChordCoreSchema = z.object({
  root: z.string(),
  quality: z.enum(SK_QUAL),
  gain: z.number().min(0).max(1.2).optional(),
  /** Duration in Strudel cycles (0.25 = one beat, 0.5 = half bar, 1 = one bar, 2 = two bars; multiples of 0.25; default 1). */
  bars: z.number().min(0.25).max(8).optional(),
  /**
   * Oscillator waveform — ADR 0018 D4.
   * Valid technical tokens (verbatim per OQ-7/ADR 0017): 'sawtooth' | 'sine' | 'square' | 'triangle' | 'pink'.
   * Default when absent: 'sawtooth'.
   */
  instrument: z.string().optional(),
  /** Reverb level 0–1 — ADR 0018 D4. Default when absent: 0.25 (chord) / 0.3 (melody). */
  room: z.number().min(0).max(1).optional(),
  /** Amplitude decay in seconds (> 0) — ADR 0018 D4. Absent = no .decay() emitted. */
  decay: z.number().min(0).optional(),
  /**
   * Named preset bundle — ADR 0019 D6. Technical token; not translated (ADR 0017 D3).
   * Valid values: 'piano' | 'guitar' | 'synth-bass'.
   */
  preset: z.enum(['piano', 'guitar', 'synth-bass']).optional(),
  /** Low-pass filter cutoff frequency in Hz — ADR 0019 D6. */
  lpf: z.number().optional(),
  /** Amplitude attack time in seconds (>= 0) — ADR 0019 D6. */
  attack: z.number().min(0).optional(),
  /** Amplitude sustain level 0–1 — ADR 0019 D6. */
  sustain: z.number().min(0).max(1).optional(),
  /** Amplitude release time in seconds (>= 0) — ADR 0019 D6. */
  release: z.number().min(0).optional(),
  /** Filter envelope modulation depth — ADR 0019 D6. */
  lpenv: z.number().optional(),
  /** Filter envelope attack time in seconds — ADR 0019 D6. */
  lpa: z.number().min(0).optional(),
  /** Filter envelope decay time in seconds — ADR 0019 D6. */
  lpd: z.number().min(0).optional(),
  /** Filter resonance (Q factor) — ADR 0019 D6. */
  lpq: z.number().min(0).optional(),
});

/**
 * A single entry in the harmony progression: either a chord (root + quality) or a
 * rest slot ({ isRest: true }). Rest schema is listed first (ADR 0012 D4).
 *
 * Phase 06 ADR 0012: `gain` is optional (defaults to 0.6 in apply.ts, prototype line 1714).
 * `bars` is optional — duration in Strudel cycles. Introduced in Phase 02 (ADR 0010).
 * Phase 03: granularity changed from 0.5 to 0.25 (ADR 0010 amendment).
 */
export const HarmonyChordSchema = z.union([HarmonyRestSchema, HarmonyChordCoreSchema]);

// ── HarmonySpec ────────────────────────────────────────────────────────────

/**
 * Full harmony specification: optional key, mode, octave, and chord progression.
 * All fields are optional; apply.ts only updates fields that are present.
 *
 * Prototype §7: `mode` (8 modes); `octave 2..5`; progression = ordered chords.
 */
export const HarmonySpecSchema = z.object({
  root: z.string().optional(),
  mode: z.enum(SK_MODES).optional(),
  octave: z.number().int().min(2).max(5).optional(),
  progression: z.array(HarmonyChordSchema).min(1).max(8).optional(),
});

// ── SaveAsBlockSpec ────────────────────────────────────────────────────────

/**
 * Spec for the agent to save the current live state as a named, editable
 * composition Block. When present, applyBlockSave is called AFTER
 * applyRhythmSpec and applyHarmonySpec, so the snapshot reflects the
 * fully-applied agent state.
 *
 * Per ADR 0021 D1.
 */
export const SaveAsBlockSpecSchema = z.object({
  /**
   * User-visible name for the new block.
   * The agent may supply any non-empty string; applyBlockSave truncates to
   * 100 characters via .trim().slice(0, 100) (OQ-2 → Option B).
   * No .max(100) constraint in Zod — a too-long name does NOT invalidate the
   * entire agent output (which would also drop valid rhythm/harmony specs).
   */
  name: z.string().min(1),
  /**
   * Which live state to capture:
   * - 'groove'  → captures rhythm layers (GrooveSnapshot)
   * - 'armonia' → captures harmony progression (ArmoniaSnapshot)
   * - 'sesion'  → captures both rhythm + harmony (SesionSnapshot)
   *
   * Accepted as the agent's declaration (OQ-1 → Option A). If the declared
   * type results in empty code (e.g., 'armonia' with no progression),
   * addBlock's existing early-return guard handles the no-op gracefully.
   *
   * Must match Block.type literals (src/core/composition/model.ts line 24).
   */
  type: z.enum(['groove', 'armonia', 'sesion'] as const),
  /**
   * When true, also creates a new composition track referencing the new block.
   * Absent = false (block is saved to the library only).
   */
  addToTrack: z.boolean().optional(),
});

export type SaveAsBlockSpec = z.infer<typeof SaveAsBlockSpecSchema>;

// ── MusicalIntentSchema ────────────────────────────────────────────────────

/**
 * Optional annotation field for the agent to express musical intent,
 * optionally referencing a known recipe id from the music-knowledge catalog.
 *
 * All fields are optional. The LLM may include only `recipeId` (and the
 * recipe engine resolves it to rhythm/harmony), or add any combination of
 * the other annotation fields.
 *
 * `recipeId` validation against the catalog is NOT enforced at Zod parse time
 * — the recipe engine validates at call time (ADR 0023 D1).
 *
 * Per ADR 0023 D1/D4.
 */
export const MusicalIntentSchema = z.object({
  /** Free-text style label (e.g. "bossa nova", "dorian modal", "afro-cuban"). */
  style: z.string().optional(),
  /** Cultural or tradition tags (e.g. ["West African", "Ewe"]). */
  cultureTags: z.array(z.string()).optional(),
  /** Emotional/expressive label (e.g. "meditative", "driving", "melancholic"). */
  mood: z.string().optional(),
  /**
   * Qualitative rhythmic density. Mirrors `MusicalRecipe.density` vocabulary.
   * Note: catalog uses 'sparse' while this field uses 'simple'; the LLM
   * bridges the vocabulary gap via free-text fields.
   */
  complexity: z.enum(['simple', 'medium', 'dense']).optional(),
  /** Time signature hint (e.g. "4/4", "12/8", "7/8"). */
  meter: z.string().optional(),
  /** BPM suggestion. Constrained to a playable range [40, 240]. */
  bpmHint: z.number().min(40).max(240).optional(),
  /**
   * Id of a known `MusicalRecipe` from the music-knowledge catalog.
   * When present, `sendEvolution()` resolves it via `recipeToAgentOutput`.
   * Catalog validation happens at call time, not at Zod parse time.
   */
  recipeId: z.string().optional(),
  /** Brief human-readable note about why this intent was chosen (≤300 chars). */
  explanation: z.string().max(300).optional(),
});

export type MusicalIntent = z.infer<typeof MusicalIntentSchema>;

// ── AgentOutput ────────────────────────────────────────────────────────────

/**
 * The top-level schema for agent JSON output.
 * At least one of `rhythm`, `harmony`, `saveAsBlock`, or `musicalIntent` must
 * be present (guard relaxed in ADR 0023 D2 — previously required at least one
 * of `rhythm`, `harmony`, or `saveAsBlock` per ADR 0021 D1).
 * `note` is an optional freetext annotation (≤300 chars).
 *
 * Prototype §7 and tryApplySkill (lines 1725–1738): if neither rhythm nor
 * harmony is present the skill is rejected (returns null).
 * ADR 0021 D1: relaxed to also accept saveAsBlock-only responses.
 * ADR 0023 D2: relaxed to also accept musicalIntent-only responses.
 */
export const AgentOutputSchema = z
  .object({
    rhythm: RhythmSpecSchema.optional(),
    harmony: HarmonySpecSchema.optional(),
    note: z.string().max(300).optional(),
    saveAsBlock: SaveAsBlockSpecSchema.optional(), // NEW in schema v5 (ADR 0021 D1)
    musicalIntent: MusicalIntentSchema.optional(), // NEW in schema v6 (ADR 0023 D1)
  })
  .superRefine((val, ctx) => {
    // Relaxed guard per ADR 0023 D2: at least one of rhythm, harmony, saveAsBlock,
    // or musicalIntent required. Previously (v5): rhythm || harmony || saveAsBlock.
    if (
      val.rhythm === undefined &&
      val.harmony === undefined &&
      val.saveAsBlock === undefined &&
      val.musicalIntent === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'AgentOutput must have at least one of: rhythm, harmony, saveAsBlock, musicalIntent',
      });
    }
  });

// ── Inferred TypeScript types ──────────────────────────────────────────────

export type RhythmLayer = z.infer<typeof RhythmLayerSchema>;
export type RhythmSpec = z.infer<typeof RhythmSpecSchema>;
export type HarmonyChord = z.infer<typeof HarmonyChordSchema>;
export type HarmonySpec = z.infer<typeof HarmonySpecSchema>;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
