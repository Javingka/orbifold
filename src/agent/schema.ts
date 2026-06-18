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
 */
export const SCHEMA_VERSION = 4;

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

// ── AgentOutput ────────────────────────────────────────────────────────────

/**
 * The top-level schema for agent JSON output.
 * At least one of `rhythm` or `harmony` must be present.
 * `note` is an optional freetext annotation (≤300 chars).
 *
 * Prototype §7 and tryApplySkill (lines 1725–1738): if neither rhythm nor
 * harmony is present the skill is rejected (returns null).
 */
export const AgentOutputSchema = z
  .object({
    rhythm: RhythmSpecSchema.optional(),
    harmony: HarmonySpecSchema.optional(),
    note: z.string().max(300).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.rhythm === undefined && val.harmony === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AgentOutput must have at least one of: rhythm, harmony',
      });
    }
  });

// ── Inferred TypeScript types ──────────────────────────────────────────────

export type RhythmLayer = z.infer<typeof RhythmLayerSchema>;
export type RhythmSpec = z.infer<typeof RhythmSpecSchema>;
export type HarmonyChord = z.infer<typeof HarmonyChordSchema>;
export type HarmonySpec = z.infer<typeof HarmonySpecSchema>;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
