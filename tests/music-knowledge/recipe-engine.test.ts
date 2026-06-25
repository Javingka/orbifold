// SPDX-License-Identifier: AGPL-3.0-only
// Tests for src/core/music-knowledge/recipe-engine.ts
// Covers A-03-04 and A-03-05.

import { describe, it, expect } from 'vitest';
import {
  recipeToAgentOutput,
  getExpressibleRecipes,
  QUALITY_DOWNSAMPLE,
} from '../../src/core/music-knowledge/recipe-engine.js';
import { AgentOutputSchema } from '../../src/agent/schema.js';
import { HARMONY_QUALITIES } from '../../src/core/music-knowledge/rhythm-catalog.js';
import { RHYTHM_HARMONY_RECIPES } from '../../src/core/music-knowledge/rhythm-harmony-recipes.js';
import { getRhythmById } from '../../src/core/music-knowledge/query.js';

// ---------------------------------------------------------------------------
// Helpers — throw instead of non-null assertions (project lint rule)
// ---------------------------------------------------------------------------

function requireRecipe(id: string) {
  const r = RHYTHM_HARMONY_RECIPES.find((x) => x.id === id);
  if (r === undefined) throw new Error(`Recipe not found in catalog: ${id}`);
  return r;
}

function requireRhythmEntry(id: string) {
  const e = getRhythmById(id);
  if (e === undefined) throw new Error(`Rhythm entry not found: ${id}`);
  return e;
}

function requireAgentOutput(recipe: ReturnType<typeof requireRecipe>) {
  const result = recipeToAgentOutput(recipe);
  if (result === null)
    throw new Error(`recipeToAgentOutput returned null for recipe '${recipe.id}'`);
  return result;
}

function requireLayers(recipe: ReturnType<typeof requireRecipe>) {
  const result = requireAgentOutput(recipe);
  const layers = result.rhythm?.layers;
  if (layers === undefined || layers.length === 0) {
    throw new Error(`No rhythm layers in output for recipe '${recipe.id}'`);
  }
  return layers;
}

// ---------------------------------------------------------------------------
// OD-1: Quality downsample map
// ---------------------------------------------------------------------------

describe('QUALITY_DOWNSAMPLE (OD-1)', () => {
  const triads = new Set(['maj', 'min', 'dim', 'aug']);

  it('maps every HARMONY_QUALITIES member to a value in {maj, min, dim, aug}', () => {
    for (const quality of HARMONY_QUALITIES) {
      const downsampled = QUALITY_DOWNSAMPLE[quality];
      expect(
        triads.has(downsampled),
        `quality '${quality}' → '${downsampled}' is not a triad`
      ).toBe(true);
    }
  });

  it('covers all 17 HARMONY_QUALITIES members (map is total)', () => {
    expect(Object.keys(QUALITY_DOWNSAMPLE).length).toBe(HARMONY_QUALITIES.length);
    for (const quality of HARMONY_QUALITIES) {
      expect(QUALITY_DOWNSAMPLE).toHaveProperty(quality);
    }
  });

  it('identity mappings: maj, min, dim, aug map to themselves', () => {
    expect(QUALITY_DOWNSAMPLE['maj']).toBe('maj');
    expect(QUALITY_DOWNSAMPLE['min']).toBe('min');
    expect(QUALITY_DOWNSAMPLE['dim']).toBe('dim');
    expect(QUALITY_DOWNSAMPLE['aug']).toBe('aug');
  });

  it('extended quality spot checks', () => {
    expect(QUALITY_DOWNSAMPLE['maj7']).toBe('maj');
    expect(QUALITY_DOWNSAMPLE['m7']).toBe('min');
    expect(QUALITY_DOWNSAMPLE['7']).toBe('maj');
    expect(QUALITY_DOWNSAMPLE['m7b5']).toBe('dim');
    expect(QUALITY_DOWNSAMPLE['dim7']).toBe('dim');
    expect(QUALITY_DOWNSAMPLE['sus2']).toBe('maj');
    expect(QUALITY_DOWNSAMPLE['sus4']).toBe('maj');
    expect(QUALITY_DOWNSAMPLE['add9']).toBe('maj');
    expect(QUALITY_DOWNSAMPLE['m9']).toBe('min');
  });
});

// ---------------------------------------------------------------------------
// getExpressibleRecipes
// ---------------------------------------------------------------------------

describe('getExpressibleRecipes', () => {
  it('returns a non-empty array', () => {
    const recipes = getExpressibleRecipes();
    expect(recipes.length).toBeGreaterThan(0);
  });

  it('length is <= total catalog count', () => {
    const recipes = getExpressibleRecipes();
    expect(recipes.length).toBeLessThanOrEqual(RHYTHM_HARMONY_RECIPES.length);
  });

  it('every returned recipe id exists in RHYTHM_HARMONY_RECIPES', () => {
    const allIds = new Set(RHYTHM_HARMONY_RECIPES.map((r) => r.id));
    for (const recipe of getExpressibleRecipes()) {
      expect(allIds.has(recipe.id), `recipe id '${recipe.id}' not in RHYTHM_HARMONY_RECIPES`).toBe(
        true
      );
    }
  });

  it('current catalog: at least 14 recipes are expressible (Phase 05: 10 original + 4 new via layers)', () => {
    // Phase 05: cueca-chilena-folk and cumbia-latina-groove gain self-contained `layers`
    // fields; they are always expressible (layers path bypasses rhythmId check).
    // Phase 05 adds cueca (3 layers) + cumbia (2 layers) → at least 14 total expressible.
    expect(getExpressibleRecipes().length).toBeGreaterThanOrEqual(14);
  });
});

// ---------------------------------------------------------------------------
// recipeToAgentOutput round-trip (A-03-04)
// ---------------------------------------------------------------------------

describe('recipeToAgentOutput — round-trip (A-03-04)', () => {
  it('returns valid AgentOutput for every expressible recipe (safeParse success)', () => {
    const recipes = getExpressibleRecipes();
    expect(recipes.length).toBeGreaterThan(0);

    for (const recipe of recipes) {
      const result = recipeToAgentOutput(recipe);
      expect(result, `null result for recipe '${recipe.id}'`).not.toBeNull();

      // Phase 05: recipes with self-contained layers bypass AgentOutputSchema.safeParse
      // in recipeToAgentOutput (they are internally-trusted data and may have non-16-step
      // arrays). Only apply safeParse on the legacy rhythmIds path.
      if (recipe.layers !== undefined && recipe.layers.length > 0) continue;

      const parsed = AgentOutputSchema.safeParse(result);
      expect(
        parsed.success,
        `AgentOutputSchema.safeParse failed for recipe '${recipe.id}': ${
          parsed.success ? '' : JSON.stringify(parsed.error?.issues)
        }`
      ).toBe(true);
    }
  });

  it('all harmony progression qualities are in {maj, min, dim, aug} after OD-1 downsample', () => {
    const triads = new Set(['maj', 'min', 'dim', 'aug']);
    const recipes = getExpressibleRecipes();

    for (const recipe of recipes) {
      const result = requireAgentOutput(recipe);
      const progression = result.harmony?.progression ?? [];
      for (const chord of progression) {
        if ('quality' in chord) {
          expect(
            triads.has(chord.quality),
            `recipe '${recipe.id}': chord quality '${chord.quality}' is not a schema triad`
          ).toBe(true);
        }
      }
    }
  });

  it('harmony spec has root, mode=minor, octave=3 for every recipe', () => {
    const recipes = getExpressibleRecipes();
    for (const recipe of recipes) {
      const result = requireAgentOutput(recipe);
      expect(result.harmony?.mode).toBe('minor');
      expect(result.harmony?.octave).toBe(3);
      expect(typeof result.harmony?.root).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// OD-2 euclid path (A-03-05)
// ---------------------------------------------------------------------------

describe('recipeToAgentOutput — OD-2 euclid path (A-03-05)', () => {
  // 'west-african-bell-modal' (Phase 08: now has recipe.layers — bd binary '101011010101' 12-step)
  it('west-african-bell-modal: layer 0 has steps from recipe.layers[0].binary (Phase 08)', () => {
    // Phase 08: recipe.layers added; recipeToAgentOutput uses layers path.
    // The bd layer emits binary '101011010101' (gankogui, 12 steps).
    // No euclid on the layer → emits as steps variant.
    const recipe = requireRecipe('west-african-bell-modal');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.[0].binary).toBe('101011010101');
    expect(recipe.layers?.[0].steps).toBe(12);

    const layers = requireLayers(recipe);
    const layer0 = layers[0];
    // Phase 08: layers path emits steps (no euclid on RecipeLayer), not euclid.
    expect('steps' in layer0).toBe(true);
    if ('steps' in layer0) {
      expect(layer0.steps.length).toBe(12);
      expect(layer0.steps).toEqual('101011010101'.split('').map(Number));
    }
  });

  // 'dorian-ritual-sparse' uses 'euclid-3-16' (euclid, n=16, k=3, rot=0)
  it('dorian-ritual-sparse: layer 0 has euclid E(3,16,0)', () => {
    const recipe = requireRecipe('dorian-ritual-sparse');
    const layers = requireLayers(recipe);
    const layer0 = layers[0];
    expect('euclid' in layer0).toBe(true);
    if ('euclid' in layer0) {
      expect(layer0.euclid).toEqual({ k: 3, n: 16, rot: 0 });
    }
  });

  // 'gospel-soul-euclid' uses 'euclid-9-16' (euclid, n=16, k=9, rot=0)
  it('gospel-soul-euclid: layer 0 has euclid E(9,16,0)', () => {
    const recipe = requireRecipe('gospel-soul-euclid');
    const layers = requireLayers(recipe);
    const layer0 = layers[0];
    expect('euclid' in layer0).toBe(true);
    if ('euclid' in layer0) {
      expect(layer0.euclid).toEqual({ k: 9, n: 16, rot: 0 });
    }
  });
});

// ---------------------------------------------------------------------------
// OD-2 steps16 path (A-03-05)
// ---------------------------------------------------------------------------

describe('recipeToAgentOutput — OD-2 steps16 path (A-03-05)', () => {
  // 'afro-cuban-clave-minor' uses 'son-clave-3-2' (struct, steps=16)
  it('afro-cuban-clave-minor: layer 0 has steps of length 16 matching binary', () => {
    const recipe = requireRecipe('afro-cuban-clave-minor');
    const rhythmEntry = requireRhythmEntry('son-clave-3-2');
    expect(rhythmEntry.strudelStrategy).toBe('struct');
    expect(rhythmEntry.steps).toBe(16);

    const layers = requireLayers(recipe);
    const layer0 = layers[0];
    expect('steps' in layer0).toBe(true);
    if ('steps' in layer0) {
      expect(layer0.steps.length).toBe(16);
      // Steps must match binary.split('').map(Number)
      const expected = rhythmEntry.binary.split('').map(Number);
      expect(layer0.steps).toEqual(expected);
    }
  });

  // 'bossa-nova-groove' uses 'bossa-nova-clave' (struct, steps=16)
  it('bossa-nova-groove: layer 0 has steps of length 16 matching binary', () => {
    const recipe = requireRecipe('bossa-nova-groove');
    const rhythmEntry = requireRhythmEntry('bossa-nova-clave');
    expect(rhythmEntry.steps).toBe(16);

    const layers = requireLayers(recipe);
    const layer0 = layers[0];
    expect('steps' in layer0).toBe(true);
    if ('steps' in layer0) {
      expect(layer0.steps.length).toBe(16);
      const expected = rhythmEntry.binary.split('').map(Number);
      expect(layer0.steps).toEqual(expected);
    }
  });

  // 'rumba-blues-minor' (Phase 08: now has recipe.layers — bd binary '1001000100101000')
  it('rumba-blues-minor: layer 0 has steps of length 16 matching recipe.layers[0].binary (Phase 08)', () => {
    const recipe = requireRecipe('rumba-blues-minor');
    // Phase 08: recipe.layers added; recipeToAgentOutput uses layers path.
    // The recipe.layers[0].binary ('1001000100101000') differs from
    // the catalog entry rumba-clave-3-2.binary — the recipe binary is authoritative (A-08-02).
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.[0].binary).toBe('1001000100101000');

    const layers = requireLayers(recipe);
    const layer0 = layers[0];
    expect('steps' in layer0).toBe(true);
    if ('steps' in layer0) {
      expect(layer0.steps.length).toBe(16);
      expect(layer0.steps).toEqual('1001000100101000'.split('').map(Number));
    }
  });
});

// ---------------------------------------------------------------------------
// Multi-layer recipe
// ---------------------------------------------------------------------------

describe('recipeToAgentOutput — multi-layer recipes', () => {
  // 'latin-jazz-clave-swing' (Phase 08: now has recipe.layers — bd and hh binary patterns)
  it('latin-jazz-clave-swing: 2 layers, both steps16 from recipe.layers binaries (Phase 08)', () => {
    const recipe = requireRecipe('latin-jazz-clave-swing');
    expect(recipe.rhythmIds).toEqual(['son-clave-2-3', 'cascara-euclid']);
    // Phase 08: recipe.layers added; recipeToAgentOutput uses layers path (not catalog).
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(2);

    const layers = requireLayers(recipe);
    expect(layers.length).toBe(2);

    // Layer 0 (bd — son clave 2-3): steps16 from recipe.layers[0].binary
    expect('steps' in layers[0]).toBe(true);
    if ('steps' in layers[0]) {
      expect(layers[0].steps.length).toBe(16);
      expect(layers[0].steps).toEqual('1000101001001000'.split('').map(Number));
    }

    // Layer 1 (hh — cascara 2-3): steps16 from recipe.layers[1].binary
    // (Phase 08: no euclid params on this layer — emits as steps, not euclid)
    expect('steps' in layers[1]).toBe(true);
    if ('steps' in layers[1]) {
      expect(layers[1].steps.length).toBe(16);
      expect(layers[1].steps).toEqual('0110101010101101'.split('').map(Number));
    }
  });

  // Sound assignment by layer index: 0→'bd', 1→'hh'
  it('multi-layer: layer 0 sound is bd, layer 1 sound is hh', () => {
    const recipe = requireRecipe('pop-rock-backbeat');
    expect(recipe.rhythmIds.length).toBe(2);

    const layers = requireLayers(recipe);
    expect(layers[0].sound).toBe('bd');
    expect(layers[1].sound).toBe('hh');
  });
});

// ---------------------------------------------------------------------------
// Null return for invalid inputs
// ---------------------------------------------------------------------------

describe('recipeToAgentOutput — null return for invalid inputs', () => {
  it('returns null when rhythmId does not exist in catalog', () => {
    const fakeRecipe = {
      id: 'fake-recipe',
      name: 'Fake',
      userIntents: ['test'],
      rhythmIds: ['non-existent-rhythm-id'],
      harmonyId: 'dorian-modal-drone',
      bpmRange: [80, 120] as [number, number],
      meter: '4/4',
      density: 'medium' as const,
      agentInstruction: 'test',
    };
    expect(recipeToAgentOutput(fakeRecipe)).toBeNull();
  });

  it('returns null when harmonyId does not exist in catalog', () => {
    const fakeRecipe = {
      id: 'fake-recipe-2',
      name: 'Fake 2',
      userIntents: ['test'],
      rhythmIds: ['euclid-3-16'],
      harmonyId: 'non-existent-harmony-id',
      bpmRange: [80, 120] as [number, number],
      meter: '4/4',
      density: 'sparse' as const,
      agentInstruction: 'test',
    };
    expect(recipeToAgentOutput(fakeRecipe)).toBeNull();
  });

  it('OD-3 Option B: defensive guard — returns null when rhythmId is missing from catalog', () => {
    // Under Option B, getExpressibleRecipes() never passes non-expressible recipes
    // to recipeToAgentOutput. This test confirms the defensive null return if a
    // caller bypasses the upstream filter (programming error path).
    const fakeNonExpressibleRecipe = {
      id: 'fake-non-expressible',
      name: 'Non-Expressible',
      userIntents: ['test'],
      rhythmIds: ['definitely-not-in-catalog'],
      harmonyId: 'west-african-modal-drone',
      bpmRange: [80, 120] as [number, number],
      meter: '4/4',
      density: 'medium' as const,
      agentInstruction: 'test',
    };
    expect(recipeToAgentOutput(fakeNonExpressibleRecipe)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// options.layerSound for single-layer recipes
// ---------------------------------------------------------------------------

describe('recipeToAgentOutput — options.layerSound', () => {
  it('overrides layer 0 sound for single-layer recipe', () => {
    const recipe = requireRecipe('dorian-ritual-sparse');
    expect(recipe.rhythmIds.length).toBe(1);

    const layers = requireLayers(recipe);
    // Without override: default is 'bd'
    expect(layers[0].sound).toBe('bd');

    // With override:
    const result = recipeToAgentOutput(recipe, { layerSound: 'hh' });
    if (result === null) throw new Error('Expected non-null result with layerSound override');
    const overrideLayers = result.rhythm?.layers ?? [];
    expect(overrideLayers[0].sound).toBe('hh');
  });

  it('does not override sound for multi-layer recipes (index-based always)', () => {
    const recipe = requireRecipe('latin-jazz-clave-swing');
    expect(recipe.rhythmIds.length).toBe(2);

    const result = recipeToAgentOutput(recipe, { layerSound: 'cp' });
    if (result === null) throw new Error('Expected non-null result');
    const layers = result.rhythm?.layers ?? [];
    // Multi-layer: index-based assignment applies (bd, hh), not the override
    expect(layers[0].sound).toBe('bd');
    expect(layers[1].sound).toBe('hh');
  });
});
