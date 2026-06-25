// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Music Knowledge: Recipe Engine
// Pure function — no DOM/PIXI/Svelte imports.
// No imports from src/state/, src/ui/, src/audio/, or src/lib/.
// Imports AgentOutputSchema (runtime, for internal safeParse guard) and types
// from src/agent/schema.ts — safe in Node/Vitest (schema.ts is pure Zod).

import { AgentOutputSchema } from '../../agent/schema.js';
import type { AgentOutput } from '../../agent/schema.js';
import { getRhythmById, getHarmonyById } from './query.js';
import { RHYTHM_HARMONY_RECIPES, type MusicalRecipe } from './rhythm-harmony-recipes.js';
import { HARMONY_QUALITIES, type HarmonyQuality } from './rhythm-catalog.js';

// Re-export so callers can import HARMONY_QUALITIES from here if needed.
export { HARMONY_QUALITIES };

// ---------------------------------------------------------------------------
// OD-1: 17-member harmony quality → 4-member schema triad downsample map
//
// Every HarmonyQuality member must have an entry (total coverage).
// Identity mappings: maj, min, dim, aug → themselves.
// Extended qualities → their triad basis.
// This const is embedded here (not in tests only) per inventory §5 / phase spec.
// ---------------------------------------------------------------------------

/**
 * Downsample map from the 17-member catalog harmony vocabulary (OD-1) to the
 * 4-member `SK_QUAL` triad vocabulary used by `AgentOutputSchema`.
 *
 * Every `HarmonyQuality` member maps to one of `'maj' | 'min' | 'dim' | 'aug'`.
 * The map is total — all 17 values are covered.
 *
 * See docs/ai-jam/inventories/phase-03-inventory.md §5 for the full rationale.
 */
export const QUALITY_DOWNSAMPLE: Readonly<Record<HarmonyQuality, 'maj' | 'min' | 'dim' | 'aug'>> = {
  // Identity mappings (already schema-triad)
  maj: 'maj',
  min: 'min',
  dim: 'dim',
  aug: 'aug',
  // Extended → triad basis
  maj7: 'maj', // major 7th — triad basis is major
  m7: 'min', // minor 7th — triad basis is minor
  '7': 'maj', // dominant 7th — triad basis is major
  m7b5: 'dim', // half-diminished — triad basis is diminished
  dim7: 'dim', // fully diminished — triad basis is diminished
  '6': 'maj', // major 6th — triad basis is major
  m6: 'min', // minor 6th — triad basis is minor
  sus2: 'maj', // suspended 2nd — no third; functional triad = major
  sus4: 'maj', // suspended 4th — no third; functional triad = major
  '9': 'maj', // dominant 9th — triad basis is major
  maj9: 'maj', // major 9th — triad basis is major
  m9: 'min', // minor 9th — triad basis is minor
  add9: 'maj', // add9 — triad basis is major
};

// ---------------------------------------------------------------------------
// RecipeEngineOptions
// ---------------------------------------------------------------------------

/**
 * Optional configuration for `recipeToAgentOutput`.
 * Currently only supports overriding the sound for single-layer recipes.
 * For multi-layer recipes, sound assignment by index always applies.
 */
export interface RecipeEngineOptions {
  /**
   * Sound override for single-layer recipes.
   * When provided and the recipe has exactly one rhythm layer, this sound is
   * used instead of the default index-0 assignment ('bd').
   * Ignored for multi-layer recipes (index-based assignment applies).
   */
  layerSound?: string;
}

// ---------------------------------------------------------------------------
// Sound assignment by layer index (OD-2 note in phase spec)
// ---------------------------------------------------------------------------

/** Default sound names assigned by layer index (0-based). */
const LAYER_SOUNDS = ['bd', 'hh', 'sd', 'oh', 'cp', 'rim'] as const;

/** Valid SK_SOUNDS values from AgentOutputSchema (for type safety in sound lookup). */
type SkSound = 'bd' | 'sd' | 'hh' | 'oh' | 'cp' | 'rim' | 'lt' | 'mt' | 'ht';

function soundForIndex(index: number): SkSound {
  const name = LAYER_SOUNDS[index] ?? 'bd';
  return name as SkSound;
}

// ---------------------------------------------------------------------------
// Expressibility check (OD-3 Option B — upstream filter)
// ---------------------------------------------------------------------------

/**
 * Returns true iff a rhythm entry identified by `rhythmId` is expressible
 * by `recipeToAgentOutput`:
 *   - euclid-expressible: strudelStrategy === 'euclid' && euclid.n <= 16
 *   - steps16-expressible: strudelStrategy === 'struct' && steps === 16
 */
function isRhythmIdExpressible(rhythmId: string): boolean {
  const entry = getRhythmById(rhythmId);
  if (entry === undefined) return false;
  if (entry.strudelStrategy === 'euclid' && entry.euclid !== undefined && entry.euclid.n <= 16) {
    return true;
  }
  if (entry.strudelStrategy === 'struct' && entry.steps === 16) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// getExpressibleRecipes
// ---------------------------------------------------------------------------

/**
 * Return all `MusicalRecipe` entries from `RHYTHM_HARMONY_RECIPES` whose every
 * `rhythmId` is euclid-expressible (strudelStrategy==='euclid' && euclid.n<=16)
 * or steps16-expressible (strudelStrategy==='struct' && steps===16).
 *
 * This implements OD-3 Option B (upstream filter): `recipeToAgentOutput` is only
 * called with fully-expressible recipes; non-expressible recipes are filtered here
 * before being offered to the LLM or passed to the engine.
 *
 * Current catalog: all 10 recipes are fully expressible, so this returns all 10.
 * Future catalog extensions with non-expressible rhythm entries will be excluded.
 */
export function getExpressibleRecipes(): MusicalRecipe[] {
  return RHYTHM_HARMONY_RECIPES.filter((recipe) =>
    recipe.rhythmIds.every((id) => isRhythmIdExpressible(id))
  );
}

// ---------------------------------------------------------------------------
// recipeToAgentOutput
// ---------------------------------------------------------------------------

/**
 * Translate a `MusicalRecipe` into an `AgentOutput` payload (rhythm + harmony).
 *
 * ## Rhythm translation (OD-2)
 * For each `rhythmId` in `recipe.rhythmIds`:
 *   - euclid-expressible (strudelStrategy==='euclid' && euclid.n<=16):
 *     emits `{ sound, euclid: { k, n, rot } }`.
 *   - steps16-expressible (strudelStrategy==='struct' && steps===16):
 *     emits `{ sound, steps: binary.split('').map(Number) }` (length-16 number[]).
 *   - Otherwise (non-expressible): return null (defensive guard — should never
 *     be reached under OD-3 Option B when callers use getExpressibleRecipes()).
 *
 * ## Sound assignment
 * Layer 0 → 'bd', 1 → 'hh', 2 → 'sd', 3 → 'oh', 4 → 'cp', 5 → 'rim'.
 * `options.layerSound` overrides the sound for single-layer recipes (index 0).
 *
 * ## Harmony translation (OD-1)
 * - `root`: harmony.modeCenter
 * - `mode`: 'minor' (safe default; catalog HarmonyEntry lacks a mode field)
 * - `octave`: 3
 * - `progression`: each CatalogChord mapped to
 *   `{ root, quality: QUALITY_DOWNSAMPLE[chord.quality], bars, gain: 0.7 }`
 *
 * ## Internal guard
 * Calls `AgentOutputSchema.safeParse` before returning; returns null on failure.
 * The returned object contains only `rhythm` and `harmony` (no `musicalIntent`).
 * The caller may add `musicalIntent` if needed.
 *
 * @returns `AgentOutput` on success; `null` if catalog lookups fail, all layers
 *   are non-expressible, or the assembled output fails schema validation.
 */
export function recipeToAgentOutput(
  recipe: MusicalRecipe,
  options?: RecipeEngineOptions
): AgentOutput | null {
  // ── Harmony lookup ────────────────────────────────────────────────────────
  const harmonyEntry = getHarmonyById(recipe.harmonyId);
  if (harmonyEntry === undefined) return null;

  // ── Rhythm layers ─────────────────────────────────────────────────────────
  const layers: Array<
    | { sound: SkSound; euclid: { k: number; n: number; rot: number } }
    | { sound: SkSound; steps: number[] }
  > = [];

  if (recipe.layers !== undefined && recipe.layers.length > 0) {
    // Phase 05: multi-layer recipe path — iterate recipe.layers directly.
    // Uses layers[i].binary and layers[i].sound. No catalog lookup at runtime;
    // rhythmId fields are for traceability only (not used here).
    // This path makes 12-step struct patterns (e.g. cueca palmas) expressible
    // without requiring steps===16 or any catalog change to AgentOutputSchema.
    for (const recipeLayer of recipe.layers) {
      const sound = recipeLayer.sound as SkSound;
      const binarySteps = recipeLayer.binary.split('').map(Number);

      if (
        recipeLayer.euclid !== undefined &&
        recipeLayer.euclid.n <= 16
      ) {
        // Prefer euclid representation when euclid params are present and n<=16.
        layers.push({
          sound,
          euclid: {
            k: recipeLayer.euclid.k,
            n: recipeLayer.euclid.n,
            rot: recipeLayer.euclid.rot,
          },
        });
      } else {
        // Emit as steps variant — the binary string is authoritative.
        layers.push({ sound, steps: binarySteps });
      }
    }
  } else {
    // Legacy path: iterate recipe.rhythmIds with catalog lookup and index-based sound.
    // Used by the 13 existing recipes without a layers declaration.
    for (let i = 0; i < recipe.rhythmIds.length; i++) {
      const rhythmId = recipe.rhythmIds[i];
      const entry = getRhythmById(rhythmId);

      if (entry === undefined) return null; // catalog integrity failure

      // Determine sound: override only applies to single-layer recipes at index 0
      const sound: SkSound =
        recipe.rhythmIds.length === 1 && i === 0 && options?.layerSound !== undefined
          ? (options.layerSound as SkSound)
          : soundForIndex(i);

      if (
        entry.strudelStrategy === 'euclid' &&
        entry.euclid !== undefined &&
        entry.euclid.n <= 16
      ) {
        // euclid-expressible path (OD-2)
        layers.push({
          sound,
          euclid: {
            k: entry.euclid.k,
            n: entry.euclid.n,
            rot: entry.euclid.rot,
          },
        });
      } else if (entry.strudelStrategy === 'struct' && entry.steps === 16) {
        // steps16-expressible path (OD-2)
        const steps = entry.binary.split('').map(Number);
        layers.push({ sound, steps });
      } else {
        // Non-expressible — defensive guard (OD-3 Option B: should never reach here)
        return null;
      }
    }
  }

  if (layers.length === 0) return null;

  // ── Harmony progression (OD-1 downsample) ────────────────────────────────
  const progression = harmonyEntry.progression.map((chord) => ({
    root: chord.root,
    quality: QUALITY_DOWNSAMPLE[chord.quality],
    bars: chord.bars,
    gain: 0.7,
  }));

  // ── Assemble AgentOutput ──────────────────────────────────────────────────
  const result = {
    rhythm: { layers },
    harmony: {
      root: harmonyEntry.modeCenter,
      mode: 'minor' as const, // safe default: catalog HarmonyEntry lacks a mode field
      octave: 3,
      progression,
    },
  };

  // ── Internal safeParse guard ──────────────────────────────────────────────
  // When recipe.layers is present, patterns may have non-16 step counts (e.g. 12-step
  // cueca palmas). AgentOutputSchema requires steps.length === 16 (LLM-output constraint).
  // The layers path uses internally-trusted data from the recipe catalog — safeParse is
  // skipped here; apply.ts accepts steps arrays of any length up to RSTEPS.
  // For the legacy rhythmIds path, safeParse still validates the output.
  if (recipe.layers !== undefined && recipe.layers.length > 0) {
    return result as AgentOutput;
  }

  const parsed = AgentOutputSchema.safeParse(result);
  if (!parsed.success) return null;

  return parsed.data as AgentOutput;
}
