// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Music Knowledge: Query Functions
// Pure functions only — no I/O, no LLM call, no DOM/PIXI/Svelte imports.
// No imports from src/agent/, src/state/, src/audio/, or src/lib/.

import { RHYTHM_CATALOG, type RhythmEntry } from './rhythm-catalog.js';
import { HARMONY_CATALOG, type HarmonyEntry } from './harmony-catalog.js';
import { RHYTHM_HARMONY_RECIPES, type MusicalRecipe } from './rhythm-harmony-recipes.js';

// ---------------------------------------------------------------------------
// Re-export types for convenience
// ---------------------------------------------------------------------------
export type { RhythmEntry, HarmonyEntry, MusicalRecipe };

// ---------------------------------------------------------------------------
// Internal helpers — normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a string for token-overlap scoring:
 *  1. Lowercase.
 *  2. NFD decomposition (Unicode canonical decomposition).
 *  3. Strip combining diacritical marks (Unicode category Mn, U+0300–U+036F).
 *  4. Split on one or more non-word characters (anything that is not [a-z0-9]).
 *  5. Remove empty tokens.
 *
 * Example: "Afro latíno" → ["afro", "latino"]
 */
function normalizeToTokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\W+/)
    .filter((t) => t.length > 0);
}

/**
 * Normalize a single word/phrase to a plain ASCII-lowercase string.
 * Used to build the searchable text from a recipe's intent/density fields.
 */
function normalizeWord(word: string): string {
  return word.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// By-id lookup functions
// ---------------------------------------------------------------------------

/**
 * Return the RhythmEntry with the given id, or `undefined` if not found.
 * O(n) scan over RHYTHM_CATALOG.
 */
export function getRhythmById(id: string): RhythmEntry | undefined {
  return RHYTHM_CATALOG.find((r) => r.id === id);
}

/**
 * Return the HarmonyEntry with the given id, or `undefined` if not found.
 * O(n) scan over HARMONY_CATALOG.
 */
export function getHarmonyById(id: string): HarmonyEntry | undefined {
  return HARMONY_CATALOG.find((h) => h.id === id);
}

/**
 * Return the MusicalRecipe with the given id, or `undefined` if not found.
 * O(n) scan over RHYTHM_HARMONY_RECIPES.
 */
export function getRecipeById(id: string): MusicalRecipe | undefined {
  return RHYTHM_HARMONY_RECIPES.find((r) => r.id === id);
}

// ---------------------------------------------------------------------------
// findRecipesForPrompt — token-overlap scoring
// ---------------------------------------------------------------------------

/**
 * Find MusicalRecipe entries that match a free-form user prompt.
 *
 * ## Algorithm
 *
 * **Normalization:** Both the prompt and each recipe's searchable text are
 * normalized the same way before comparison:
 *  1. Lowercase.
 *  2. Unicode NFD decomposition.
 *  3. Strip combining diacritical marks (U+0300–U+036F) → diacritic-insensitive.
 *  4. Split on non-word characters `[^a-z0-9]+` to extract individual tokens.
 *  5. Discard empty tokens.
 *
 * **Searchable text per recipe:** The recipe's `userIntents` strings and `density`
 * field are concatenated, then normalized into a token set. Using a set means each
 * unique token from the recipe is counted at most once, regardless of repetition.
 *
 * **Token overlap score:** For each prompt token, score += 1 if the token appears
 * anywhere in the recipe's token set. The score is the total count of prompt
 * tokens matched (a simple intersection size). This is intentionally a
 * token-presence check — not a substring match — so "afro" does not match "afrobeat"
 * unless "afrobeat" was split into ["afrobeat"] and "afro" is one of the prompt
 * tokens. Words in `userIntents` like "afro-cuban" are split into ["afro", "cuban"]
 * by the non-word splitter, so "afro" and "cuban" are distinct matchable tokens.
 *
 * **Sorting:** Recipes with score > 0 are sorted descending by score. Ties preserve
 * the original RHYTHM_HARMONY_RECIPES array order (stable sort). Recipes with
 * score = 0 are excluded entirely.
 *
 * **Determinism:** Given identical input, the output order is always identical.
 * JavaScript's `Array.prototype.sort` is guaranteed stable in ES2019+, which covers
 * all environments this project targets. RHYTHM_HARMONY_RECIPES is a constant-order
 * frozen-at-import array, so the tie-break is deterministic.
 *
 * @param prompt - Free-form natural-language string from the user.
 * @returns Array of matching MusicalRecipe entries, best-first. Empty array when no
 *          recipe scores above zero.
 */
export function findRecipesForPrompt(prompt: string): MusicalRecipe[] {
  const promptTokens = normalizeToTokens(prompt);
  if (promptTokens.length === 0) return [];

  // Score each recipe against the prompt tokens
  const scored: Array<{ recipe: MusicalRecipe; score: number }> = [];

  for (const recipe of RHYTHM_HARMONY_RECIPES) {
    // Build the recipe's token set from userIntents + density
    const recipeText = [...recipe.userIntents, recipe.density].join(' ');
    const recipeTokenSet = new Set(normalizeToTokens(recipeText));

    // Count how many distinct prompt tokens appear in the recipe's token set
    let score = 0;
    for (const token of promptTokens) {
      if (recipeTokenSet.has(normalizeWord(token))) {
        score += 1;
      }
    }

    if (score > 0) {
      scored.push({ recipe, score });
    }
  }

  // Stable descending sort by score; ties preserve RHYTHM_HARMONY_RECIPES order
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.recipe);
}
