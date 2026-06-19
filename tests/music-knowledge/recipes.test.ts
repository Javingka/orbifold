// SPDX-License-Identifier: AGPL-3.0-only
// Tests: rhythm-harmony-recipes — referential integrity (6 invariants from inventory §d.3)

import { describe, it, expect } from 'vitest';
import { RHYTHM_CATALOG } from '../../src/core/music-knowledge/rhythm-catalog.js';
import { HARMONY_CATALOG } from '../../src/core/music-knowledge/harmony-catalog.js';
import {
  RHYTHM_HARMONY_RECIPES,
  type MusicalRecipe,
} from '../../src/core/music-knowledge/rhythm-harmony-recipes.js';

// ---------------------------------------------------------------------------
// Build lookup sets once — used in all per-recipe assertions
// ---------------------------------------------------------------------------

const rhythmIds = new Set(RHYTHM_CATALOG.map((r) => r.id));
const harmonyIds = new Set(HARMONY_CATALOG.map((h) => h.id));

/** Look up a rhythm entry by id (guaranteed to exist when rhythmIds has it). */
function getRhythmMeter(id: string): string {
  const entry = RHYTHM_CATALOG.find((r) => r.id === id);
  if (entry === undefined) throw new Error(`rhythm id not found: ${id}`);
  return entry.meter;
}

// ---------------------------------------------------------------------------
// Catalog-level assertions
// ---------------------------------------------------------------------------

describe('RHYTHM_HARMONY_RECIPES — catalog level', () => {
  it('exports an array', () => {
    expect(Array.isArray(RHYTHM_HARMONY_RECIPES)).toBe(true);
  });

  it('contains at least 8 recipes', () => {
    expect(RHYTHM_HARMONY_RECIPES.length).toBeGreaterThanOrEqual(8);
  });

  it('Invariant 3 — all recipe ids are unique', () => {
    const ids = RHYTHM_HARMONY_RECIPES.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('covers multiple meters (at least 2 distinct meters represented)', () => {
    const meters = new Set(RHYTHM_HARMONY_RECIPES.map((r) => r.meter));
    expect(meters.size).toBeGreaterThanOrEqual(2);
  });

  it('at least one recipe has multiple rhythmIds (layered rhythms)', () => {
    const layered = RHYTHM_HARMONY_RECIPES.filter((r) => r.rhythmIds.length > 1);
    expect(layered.length).toBeGreaterThanOrEqual(1);
  });

  it('density values are restricted to sparse | medium | dense', () => {
    const valid = new Set(['sparse', 'medium', 'dense']);
    for (const recipe of RHYTHM_HARMONY_RECIPES) {
      expect(valid.has(recipe.density)).toBe(true);
    }
  });

  it('agentInstruction is a non-empty string for every recipe', () => {
    for (const recipe of RHYTHM_HARMONY_RECIPES) {
      expect(typeof recipe.agentInstruction).toBe('string');
      expect(recipe.agentInstruction.length).toBeGreaterThan(0);
    }
  });

  it('name is a non-empty string for every recipe', () => {
    for (const recipe of RHYTHM_HARMONY_RECIPES) {
      expect(typeof recipe.name).toBe('string');
      expect(recipe.name.length).toBeGreaterThan(0);
    }
  });

  it('id is a non-empty string for every recipe', () => {
    for (const recipe of RHYTHM_HARMONY_RECIPES) {
      expect(typeof recipe.id).toBe('string');
      expect(recipe.id.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-recipe assertions — all 6 referential-integrity invariants
// ---------------------------------------------------------------------------

describe.each(RHYTHM_HARMONY_RECIPES.map((r): [string, MusicalRecipe] => [r.id, r]))(
  'Recipe "%s"',
  (id, recipe) => {
    // Invariant 4: userIntents non-empty
    it('Invariant 4 — userIntents.length >= 1', () => {
      expect(Array.isArray(recipe.userIntents)).toBe(true);
      expect(recipe.userIntents.length).toBeGreaterThanOrEqual(1);
    });

    it('Invariant 4 (extra) — every userIntent is a non-empty string', () => {
      for (const intent of recipe.userIntents) {
        expect(typeof intent).toBe('string');
        expect(intent.trim().length).toBeGreaterThan(0);
      }
    });

    // Invariant 5: bpmRange [min, max], 40 ≤ min ≤ max ≤ 240
    it('Invariant 5 — bpmRange is a two-element tuple', () => {
      expect(Array.isArray(recipe.bpmRange)).toBe(true);
      expect(recipe.bpmRange.length).toBe(2);
    });

    it('Invariant 5 — bpmRange[0] >= 40', () => {
      expect(recipe.bpmRange[0]).toBeGreaterThanOrEqual(40);
    });

    it('Invariant 5 — bpmRange[0] <= bpmRange[1]', () => {
      expect(recipe.bpmRange[0]).toBeLessThanOrEqual(recipe.bpmRange[1]);
    });

    it('Invariant 5 — bpmRange[1] <= 240', () => {
      expect(recipe.bpmRange[1]).toBeLessThanOrEqual(240);
    });

    // Invariant 1: every rhythmId resolves in RHYTHM_CATALOG
    it('Invariant 1 — rhythmIds is a non-empty array', () => {
      expect(Array.isArray(recipe.rhythmIds)).toBe(true);
      expect(recipe.rhythmIds.length).toBeGreaterThanOrEqual(1);
    });

    it('Invariant 1 — every rhythmId exists in RHYTHM_CATALOG', () => {
      for (const rid of recipe.rhythmIds) {
        expect(rhythmIds.has(rid)).toBe(true);
      }
    });

    // Invariant 2: harmonyId resolves in HARMONY_CATALOG
    it('Invariant 2 — harmonyId exists in HARMONY_CATALOG', () => {
      expect(harmonyIds.has(recipe.harmonyId)).toBe(true);
    });

    // Invariant 6: recipe meter matches the meter of every referenced rhythm
    it('Invariant 6 — recipe meter matches meter of every referenced rhythm', () => {
      for (const rid of recipe.rhythmIds) {
        if (rhythmIds.has(rid)) {
          const rhythmMeter = getRhythmMeter(rid);
          expect(recipe.meter).toBe(rhythmMeter);
        }
      }
    });
  }
);

// ---------------------------------------------------------------------------
// Helper: find a recipe by id and fail the test if missing
// ---------------------------------------------------------------------------

function findRequired(id: string): MusicalRecipe {
  const r = RHYTHM_HARMONY_RECIPES.find((recipe) => recipe.id === id);
  if (r === undefined)
    throw new Error(`Expected recipe '${id}' to exist in RHYTHM_HARMONY_RECIPES`);
  return r;
}

// ---------------------------------------------------------------------------
// Specific recipe spot-checks — named entries
// ---------------------------------------------------------------------------

describe('RHYTHM_HARMONY_RECIPES — named recipe spot-checks', () => {
  it('afro-cuban-clave-minor exists and references son-clave-3-2', () => {
    const recipe = findRequired('afro-cuban-clave-minor');
    expect(recipe.rhythmIds).toContain('son-clave-3-2');
    expect(recipe.meter).toBe('4/4');
  });

  it('west-african-bell-modal exists and references bell-pattern-west-african in 12/8', () => {
    const recipe = findRequired('west-african-bell-modal');
    expect(recipe.rhythmIds).toContain('bell-pattern-west-african');
    expect(recipe.meter).toBe('12/8');
  });

  it('bossa-nova-groove exists and references bossa-nova-clave + bossa-nova-loop', () => {
    const recipe = findRequired('bossa-nova-groove');
    expect(recipe.rhythmIds).toContain('bossa-nova-clave');
    expect(recipe.harmonyId).toBe('bossa-nova-loop');
  });

  it('aksak-dorian-odd exists, has 7/8 meter, and references aksak-7-sparse', () => {
    const recipe = findRequired('aksak-dorian-odd');
    expect(recipe.meter).toBe('7/8');
    expect(recipe.rhythmIds).toContain('aksak-7-sparse');
  });

  it('latin-jazz-clave-swing has multiple rhythmIds (layered)', () => {
    const recipe = findRequired('latin-jazz-clave-swing');
    expect(recipe.rhythmIds.length).toBeGreaterThanOrEqual(2);
    expect(recipe.rhythmIds).toContain('son-clave-2-3');
    expect(recipe.rhythmIds).toContain('cascara-euclid');
  });

  it('pop-rock-backbeat has multiple rhythmIds (layered)', () => {
    const recipe = findRequired('pop-rock-backbeat');
    expect(recipe.rhythmIds.length).toBeGreaterThanOrEqual(2);
    expect(recipe.rhythmIds).toContain('backbeat-snare');
    expect(recipe.rhythmIds).toContain('quarter-notes-16');
  });

  it('west-african-triplet-groove has multiple 12/8 rhythmIds (layered)', () => {
    const recipe = findRequired('west-african-triplet-groove');
    expect(recipe.meter).toBe('12/8');
    expect(recipe.rhythmIds.length).toBeGreaterThanOrEqual(2);
  });

  it('dorian-ritual-sparse has density sparse', () => {
    const recipe = findRequired('dorian-ritual-sparse');
    expect(recipe.density).toBe('sparse');
  });

  it('gospel-soul-euclid references euclid-9-16 and gospel-soul-add9', () => {
    const recipe = findRequired('gospel-soul-euclid');
    expect(recipe.rhythmIds).toContain('euclid-9-16');
    expect(recipe.harmonyId).toBe('gospel-soul-add9');
  });

  it('rumba-blues-minor references rumba-clave-3-2 and minor-blues-turnaround', () => {
    const recipe = findRequired('rumba-blues-minor');
    expect(recipe.rhythmIds).toContain('rumba-clave-3-2');
    expect(recipe.harmonyId).toBe('minor-blues-turnaround');
  });
});

// ---------------------------------------------------------------------------
// Coverage across meter families
// ---------------------------------------------------------------------------

describe('RHYTHM_HARMONY_RECIPES — meter coverage', () => {
  it('at least one recipe in 4/4', () => {
    const found = RHYTHM_HARMONY_RECIPES.some((r) => r.meter === '4/4');
    expect(found).toBe(true);
  });

  it('at least one recipe in 12/8', () => {
    const found = RHYTHM_HARMONY_RECIPES.some((r) => r.meter === '12/8');
    expect(found).toBe(true);
  });

  it('at least one recipe in an odd meter (not 4/4 or 12/8)', () => {
    const found = RHYTHM_HARMONY_RECIPES.some((r) => r.meter !== '4/4' && r.meter !== '12/8');
    expect(found).toBe(true);
  });
});
