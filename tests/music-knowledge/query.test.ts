// SPDX-License-Identifier: AGPL-3.0-only
// Tests: music-knowledge/query — deterministic, diacritic-insensitive retrieval

import { describe, it, expect } from 'vitest';
import {
  findRecipesForPrompt,
  getRhythmById,
  getHarmonyById,
  getRecipeById,
} from '../../src/core/music-knowledge/query.js';
import { RHYTHM_CATALOG } from '../../src/core/music-knowledge/rhythm-catalog.js';
import { HARMONY_CATALOG } from '../../src/core/music-knowledge/harmony-catalog.js';
import { RHYTHM_HARMONY_RECIPES } from '../../src/core/music-knowledge/rhythm-harmony-recipes.js';

// ---------------------------------------------------------------------------
// getRhythmById
// ---------------------------------------------------------------------------

describe('getRhythmById', () => {
  it('returns the entry for a known id', () => {
    const entry = getRhythmById('tresillo');
    expect(entry).toBeDefined();
    expect(entry?.id).toBe('tresillo');
    expect(entry?.name).toBe('Tresillo');
  });

  it('returns undefined for an unknown id', () => {
    expect(getRhythmById('nonexistent-rhythm-zzz')).toBeUndefined();
  });

  it('returns the entry for bell-pattern-west-african', () => {
    const entry = getRhythmById('bell-pattern-west-african');
    expect(entry).toBeDefined();
    expect(entry?.meter).toBe('12/8');
  });

  it('returns the entry for aksak-7-sparse', () => {
    const entry = getRhythmById('aksak-7-sparse');
    expect(entry).toBeDefined();
    expect(entry?.meter).toBe('7/8');
  });

  it('result matches the RHYTHM_CATALOG entry by reference', () => {
    const entry = getRhythmById('son-clave-3-2');
    const catalogEntry = RHYTHM_CATALOG.find((r) => r.id === 'son-clave-3-2');
    expect(entry).toBe(catalogEntry);
  });

  it('returns undefined for an empty string id', () => {
    expect(getRhythmById('')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getHarmonyById
// ---------------------------------------------------------------------------

describe('getHarmonyById', () => {
  it('returns the entry for a known id', () => {
    const entry = getHarmonyById('jazz-ii-v-i-major');
    expect(entry).toBeDefined();
    expect(entry?.id).toBe('jazz-ii-v-i-major');
  });

  it('returns undefined for an unknown id', () => {
    expect(getHarmonyById('nonexistent-harmony-zzz')).toBeUndefined();
  });

  it('returns the entry for west-african-modal-drone', () => {
    const entry = getHarmonyById('west-african-modal-drone');
    expect(entry).toBeDefined();
    expect(entry?.chordMode).toBe('chord');
  });

  it('result matches the HARMONY_CATALOG entry by reference', () => {
    const entry = getHarmonyById('bossa-nova-loop');
    const catalogEntry = HARMONY_CATALOG.find((h) => h.id === 'bossa-nova-loop');
    expect(entry).toBe(catalogEntry);
  });

  it('returns undefined for an empty string id', () => {
    expect(getHarmonyById('')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getRecipeById
// ---------------------------------------------------------------------------

describe('getRecipeById', () => {
  it('returns the entry for a known id', () => {
    const entry = getRecipeById('afro-cuban-clave-minor');
    expect(entry).toBeDefined();
    expect(entry?.id).toBe('afro-cuban-clave-minor');
  });

  it('returns undefined for an unknown id', () => {
    expect(getRecipeById('nonexistent-recipe-zzz')).toBeUndefined();
  });

  it('returns the entry for aksak-dorian-odd', () => {
    const entry = getRecipeById('aksak-dorian-odd');
    expect(entry).toBeDefined();
    expect(entry?.meter).toBe('7/8');
  });

  it('result matches the RHYTHM_HARMONY_RECIPES entry by reference', () => {
    const entry = getRecipeById('west-african-bell-modal');
    const catalogEntry = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'west-african-bell-modal');
    expect(entry).toBe(catalogEntry);
  });

  it('returns undefined for an empty string id', () => {
    expect(getRecipeById('')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// findRecipesForPrompt — representative intent phrases
// ---------------------------------------------------------------------------

describe('findRecipesForPrompt — afro-cuban/clave recipe', () => {
  it('phrase "afro cuban groove" returns afro-cuban-clave-minor', () => {
    const results = findRecipesForPrompt('afro cuban groove');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('afro-cuban-clave-minor');
  });

  it('phrase "clave minor" returns afro-cuban-clave-minor', () => {
    const results = findRecipesForPrompt('clave minor');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('afro-cuban-clave-minor');
  });

  it('phrase "latin minor feel" returns afro-cuban-clave-minor', () => {
    const results = findRecipesForPrompt('latin minor feel');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('afro-cuban-clave-minor');
  });

  it('phrase "son clave with minor chords" returns afro-cuban-clave-minor', () => {
    const results = findRecipesForPrompt('son clave with minor chords');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('afro-cuban-clave-minor');
  });
});

describe('findRecipesForPrompt — west-african/12-8 recipe', () => {
  it('phrase "west african bell" returns west-african-bell-modal', () => {
    const results = findRecipesForPrompt('west african bell');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('west-african-bell-modal');
  });

  it('phrase "african polyrhythm modal" returns west-african-bell-modal', () => {
    const results = findRecipesForPrompt('african polyrhythm modal');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('west-african-bell-modal');
  });

  it('phrase "west african ritual" returns west-african-bell-modal', () => {
    const results = findRecipesForPrompt('west african ritual');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('west-african-bell-modal');
  });

  it('phrase "ewe bell drone" returns west-african-bell-modal', () => {
    const results = findRecipesForPrompt('ewe bell drone');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('west-african-bell-modal');
  });
});

describe('findRecipesForPrompt — aksak/odd-meter recipe', () => {
  it('phrase "aksak rhythm" returns aksak-dorian-odd', () => {
    const results = findRecipesForPrompt('aksak rhythm');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('aksak-dorian-odd');
  });

  it('phrase "odd meter groove" returns aksak-dorian-odd', () => {
    const results = findRecipesForPrompt('odd meter groove');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('aksak-dorian-odd');
  });

  it('phrase "balkan groove" returns aksak-dorian-odd', () => {
    const results = findRecipesForPrompt('balkan groove');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('aksak-dorian-odd');
  });

  it('phrase "seven eight dorian" returns aksak-dorian-odd', () => {
    const results = findRecipesForPrompt('seven eight dorian');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('aksak-dorian-odd');
  });
});

// ---------------------------------------------------------------------------
// findRecipesForPrompt — no-match cases
// ---------------------------------------------------------------------------

describe('findRecipesForPrompt — no match', () => {
  it('nonsense prompt "zzzyyyxxx" returns []', () => {
    expect(findRecipesForPrompt('zzzyyyxxx')).toEqual([]);
  });

  it('empty string returns []', () => {
    expect(findRecipesForPrompt('')).toEqual([]);
  });

  it('whitespace-only returns []', () => {
    expect(findRecipesForPrompt('   ')).toEqual([]);
  });

  it('random gibberish "qqqwwweee rrrtttyyy" returns []', () => {
    expect(findRecipesForPrompt('qqqwwweee rrrtttyyy')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findRecipesForPrompt — diacritic-insensitive
// ---------------------------------------------------------------------------

describe('findRecipesForPrompt — diacritic insensitivity', () => {
  it('"afro latino" and "afro latíno" return the same recipe set', () => {
    const resultA = findRecipesForPrompt('afro latino');
    const resultB = findRecipesForPrompt('afro latíno');
    expect(resultA.map((r) => r.id)).toEqual(resultB.map((r) => r.id));
  });

  it('"afro latino" returns at least one result (afro-cuban or latin recipes)', () => {
    const results = findRecipesForPrompt('afro latino');
    expect(results.length).toBeGreaterThan(0);
  });

  it('"modal dorian" matches same recipes regardless of accent on dorian', () => {
    const resultA = findRecipesForPrompt('modal dorian');
    const resultB = findRecipesForPrompt('modal dórian');
    expect(resultA.map((r) => r.id)).toEqual(resultB.map((r) => r.id));
  });

  it('"groove" and "groové" match the same recipes', () => {
    const resultA = findRecipesForPrompt('groove');
    const resultB = findRecipesForPrompt('groové');
    expect(resultA.map((r) => r.id)).toEqual(resultB.map((r) => r.id));
  });

  it('"afro-cuban" (with hyphen) returns same as "afro cuban" (with space)', () => {
    // The hyphen is a non-word char; both tokenize to ["afro", "cuban"]
    const resultA = findRecipesForPrompt('afro-cuban');
    const resultB = findRecipesForPrompt('afro cuban');
    expect(resultA.map((r) => r.id)).toEqual(resultB.map((r) => r.id));
  });
});

// ---------------------------------------------------------------------------
// findRecipesForPrompt — determinism
// ---------------------------------------------------------------------------

describe('findRecipesForPrompt — determinism', () => {
  it('same input produces same output order on first call', () => {
    const result1 = findRecipesForPrompt('west african groove');
    const result2 = findRecipesForPrompt('west african groove');
    expect(result1.map((r) => r.id)).toEqual(result2.map((r) => r.id));
  });

  it('same input produces same output order on subsequent calls', () => {
    const prompt = 'latin minor clave groove';
    const ids1 = findRecipesForPrompt(prompt).map((r) => r.id);
    const ids2 = findRecipesForPrompt(prompt).map((r) => r.id);
    const ids3 = findRecipesForPrompt(prompt).map((r) => r.id);
    expect(ids1).toEqual(ids2);
    expect(ids2).toEqual(ids3);
  });

  it('returns results in descending score order (highest-scoring first)', () => {
    // "afro cuban groove" has 3 tokens, all matching afro-cuban-clave-minor
    // Expect afro-cuban-clave-minor to rank at or near the top
    const results = findRecipesForPrompt('afro cuban groove');
    expect(results.length).toBeGreaterThan(0);
    // First result should be the highest scored
    const firstScore = countMatchingTokens('afro cuban groove', results[0]);
    for (let i = 1; i < results.length; i++) {
      const score = countMatchingTokens('afro cuban groove', results[i]);
      expect(firstScore).toBeGreaterThanOrEqual(score);
    }
  });

  it('"aksak modal" returns aksak-dorian-odd before unrelated recipes', () => {
    const results = findRecipesForPrompt('aksak modal');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('aksak-dorian-odd');
  });
});

// ---------------------------------------------------------------------------
// findRecipesForPrompt — result shape
// ---------------------------------------------------------------------------

describe('findRecipesForPrompt — result properties', () => {
  it('returns MusicalRecipe objects with id, name, userIntents, rhythmIds, harmonyId', () => {
    const results = findRecipesForPrompt('gospel soul');
    expect(results.length).toBeGreaterThan(0);
    for (const recipe of results) {
      expect(typeof recipe.id).toBe('string');
      expect(typeof recipe.name).toBe('string');
      expect(Array.isArray(recipe.userIntents)).toBe(true);
      expect(Array.isArray(recipe.rhythmIds)).toBe(true);
      expect(typeof recipe.harmonyId).toBe('string');
    }
  });

  it('"gospel groove" matches gospel-soul-euclid', () => {
    const results = findRecipesForPrompt('gospel groove');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('gospel-soul-euclid');
  });

  it('"bossa nova" matches bossa-nova-groove', () => {
    const results = findRecipesForPrompt('bossa nova');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('bossa-nova-groove');
  });

  it('"pop four chord" matches pop-rock-backbeat', () => {
    const results = findRecipesForPrompt('pop four chord');
    const ids = results.map((r) => r.id);
    expect(ids).toContain('pop-rock-backbeat');
  });
});

// ---------------------------------------------------------------------------
// findRecipesForPrompt — case insensitivity
// ---------------------------------------------------------------------------

describe('findRecipesForPrompt — case insensitivity', () => {
  it('"WEST AFRICAN BELL" matches west-african-bell-modal', () => {
    const results = findRecipesForPrompt('WEST AFRICAN BELL');
    expect(results.map((r) => r.id)).toContain('west-african-bell-modal');
  });

  it('"Aksak Rhythm" matches aksak-dorian-odd', () => {
    const results = findRecipesForPrompt('Aksak Rhythm');
    expect(results.map((r) => r.id)).toContain('aksak-dorian-odd');
  });
});

// ---------------------------------------------------------------------------
// Helper (test-local only)
// ---------------------------------------------------------------------------

/**
 * Count how many distinct prompt tokens match the recipe's token set.
 * Mirror of query.ts internal scoring logic — used only in the determinism test.
 */
function countMatchingTokens(
  prompt: string,
  recipe: { userIntents: string[]; density: string }
): number {
  const promptTokens = normalizeToTokensLocal(prompt);
  const recipeText = [...recipe.userIntents, recipe.density].join(' ');
  const recipeTokenSet = new Set(normalizeToTokensLocal(recipeText));
  let score = 0;
  for (const token of promptTokens) {
    if (recipeTokenSet.has(token)) score += 1;
  }
  return score;
}

function normalizeToTokensLocal(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\W+/)
    .filter((t) => t.length > 0);
}
