// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — end-to-end propagation tests for sampleMap → strudelSample (ADR 0025 D3/D4).
//
// Phase 01 step 01.4 — authentic-groove initiative.
//
// Covers acceptance IDs:
//   A-01-01 (full): applying a genre recipe yields layers with strudelSample;
//                   rhythmLayerToStrudelLine emits the authentic sample name.
//   A-01-02 (full): applying cueca (no sampleMap) → no strudelSample; generic sound emitted.
//   A-01-04 (full): absent slots and map-less recipes leave strudelSample undefined.
//
// ADR 0025 D4 (propagation mechanism, Option B):
//   - recipeToAgentOutput stays pure (no strudelSample in AgentOutput).
//   - applySampleMap(map) overlays strudelSample onto session layers via sessionStore.update.
//   - Carries zero genre knowledge — handed the map as a parameter.
//
// Seam invariant (AG-D1 / ADR 0025 D3):
//   - This test file imports genre recipe ids from the music-knowledge layer
//     (rhythm-harmony-recipes.ts), which is the correct side of the seam.
//   - apply.ts and codegen are tested to confirm they carry no genre knowledge.
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.
// Audio is never triggered (no playGroove / playSession / requeueLive calls).

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { sessionStore, DEFAULT_SESSION_STATE } from '../../src/state/session.js';
import { applyRhythmSpec, applySampleMap } from '../../src/agent/apply.js';
import { recipeToAgentOutput } from '../../src/core/music-knowledge/recipe-engine.js';
import { RHYTHM_HARMONY_RECIPES } from '../../src/core/music-knowledge/rhythm-harmony-recipes.js';
import { rhythmLayerToStrudelLine } from '../../src/core/rhythm/layers.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function findRecipe(id: string) {
  const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === id);
  if (!recipe) throw new Error(`Recipe '${id}' not found`);
  return recipe;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset session store to clean state before each test.
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
});

// ── applySampleMap unit tests (direct helper, uses sessionStore) ──────────────

describe('applySampleMap — direct unit tests', () => {
  it('applySampleMap({}) — no layer is mutated (edge case, A-01-04)', () => {
    // Set up session with two layers (no strudelSample initially).
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        ...s.rhythm,
        layers: [
          { sound: 'bd' as const, steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
          { sound: 'hh' as const, steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        ],
      },
    }));

    applySampleMap({});

    const layers = get(sessionStore).rhythm.layers;
    expect(layers[0].strudelSample).toBeUndefined();
    expect(layers[1].strudelSample).toBeUndefined();
  });

  it('applySampleMap sets strudelSample on matching layer, leaves others unchanged (A-01-04)', () => {
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        ...s.rhythm,
        layers: [
          { sound: 'bd' as const, steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
          { sound: 'hh' as const, steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        ],
      },
    }));

    // Map only has 'bd' → 'perc'; hh is absent from map.
    applySampleMap({ bd: 'perc' });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers[0].strudelSample).toBe('perc');
    expect(layers[1].strudelSample).toBeUndefined();
  });

  it('applySampleMap with multi-slot map sets strudelSample on all matching layers (A-01-01)', () => {
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        ...s.rhythm,
        layers: [
          { sound: 'bd' as const, steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
          { sound: 'hh' as const, steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
          { sound: 'sd' as const, steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
        ],
      },
    }));

    // Map has bd and hh but not sd.
    applySampleMap({ bd: 'cb', hh: 'perc' });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers[0].strudelSample).toBe('cb');
    expect(layers[1].strudelSample).toBe('perc');
    expect(layers[2].strudelSample).toBeUndefined();
  });
});

// ── End-to-end: cumbia recipe (A-01-01 full) ──────────────────────────────────

describe('A-01-01: cumbia recipe → strudelSample propagation', () => {
  it('applying cumbia recipe yields layers with strudelSample on bd-slot', () => {
    const recipe = findRecipe('cumbia-latina-groove');
    // cumbia sampleMap: { bd: 'perc' } — per inventory §2.3 and ADR 0025 D6.

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    // Step 1: apply rhythm spec (populates session layers without strudelSample).
    applyRhythmSpec(output.rhythm);

    // Confirm layers present but no strudelSample yet.
    const layersBefore = get(sessionStore).rhythm.layers;
    expect(layersBefore.length).toBeGreaterThan(0);
    expect(layersBefore[0].strudelSample).toBeUndefined();

    // Step 2: overlay sampleMap via applySampleMap.
    applySampleMap(recipe.sampleMap ?? {});

    // Confirm bd-slot layer now carries strudelSample: 'perc'.
    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.strudelSample).toBe('perc');
  });

  it('rhythmLayerToStrudelLine emits "perc" tokens for cumbia bd layer (A-01-01 codegen)', () => {
    const recipe = findRecipe('cumbia-latina-groove');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    if (!bdLayer) return;

    const line = rhythmLayerToStrudelLine(bdLayer);
    // Should contain 'perc' tokens, not 'bd'.
    expect(line).toContain('perc');
    expect(line).not.toContain('" bd');
    expect(line).not.toContain('bd ');
    // Confirm it doesn't emit the generic sound.
    expect(line).not.toMatch(/s\("bd/);
  });
});

// ── End-to-end: cueca recipe (A-01-02 full) ───────────────────────────────────

describe('A-01-02: cueca recipe → no sampleMap → generic sound emitted', () => {
  it('cueca-chilena-folk has no sampleMap (confirmed from catalog)', () => {
    const recipe = findRecipe('cueca-chilena-folk');
    expect(recipe.sampleMap).toBeUndefined();
  });

  it('applying cueca recipe → layers have no strudelSample (A-01-02)', () => {
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {}); // empty map — no-op

    const layers = get(sessionStore).rhythm.layers;
    expect(layers.length).toBeGreaterThan(0);
    for (const layer of layers) {
      expect(layer.strudelSample).toBeUndefined();
    }
  });

  it('rhythmLayerToStrudelLine emits generic sound for cueca layers (A-01-02 codegen)', () => {
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    for (const layer of layers) {
      const line = rhythmLayerToStrudelLine(layer);
      // Generic sound emitted — must contain the layer.sound token.
      const genericSound = layer.sound;
      expect(line).toContain(genericSound);
    }
  });
});

// ── End-to-end: samba recipe (A-01-01 partial / A-01-04) ─────────────────────

describe('A-01-04: samba recipe → hh-slot carries strudelSample: "sd"', () => {
  it('applying samba recipe → hh-slot layer carries strudelSample "sd"', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    // samba sampleMap: { bd: 'bd', hh: 'sd' }

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    expect(hhLayer?.strudelSample).toBe('sd');
  });

  it('samba bd-slot carries strudelSample "bd" (sampleMap confirms identity mapping)', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.strudelSample).toBe('bd');
  });

  it('rhythmLayerToStrudelLine emits "sd" for samba hh-slot (codegen)', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    if (!hhLayer) return;

    const line = rhythmLayerToStrudelLine(hhLayer);
    expect(line).toContain('sd');
    // Must not emit the generic hh for this slot.
    expect(line).not.toMatch(/s\("hh/);
    expect(line).not.toContain('hh ');
  });
});

// ── A-01-04: layer whose Sound slot is not in map keeps strudelSample undefined ──

describe('A-01-04: slot absent from sampleMap → strudelSample undefined', () => {
  it('a Sound slot absent from the recipe sampleMap keeps strudelSample undefined', () => {
    // Use a recipe with a partial sampleMap (bd only) and a second layer (hh).
    // Set up layers manually to test the invariant directly.
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        ...s.rhythm,
        layers: [
          { sound: 'bd' as const, steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
          { sound: 'hh' as const, steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
          { sound: 'sd' as const, steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
        ],
      },
    }));

    // Map only covers bd and hh; sd is absent.
    applySampleMap({ bd: 'perc', hh: 'cb' });

    const layers = get(sessionStore).rhythm.layers;
    const sdLayer = layers.find((l) => l.sound === 'sd');
    expect(sdLayer).toBeDefined();
    expect(sdLayer?.strudelSample).toBeUndefined();
  });

  it('layer with no matching Sound in map emits its generic sound in codegen', () => {
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        ...s.rhythm,
        layers: [
          { sound: 'sd' as const, steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
        ],
      },
    }));

    // Map does not include 'sd'.
    applySampleMap({ bd: 'perc' });

    const layers = get(sessionStore).rhythm.layers;
    const sdLayer = layers.find((l) => l.sound === 'sd');
    expect(sdLayer?.strudelSample).toBeUndefined();

    // codegen falls back to 'sd'.
    const line = rhythmLayerToStrudelLine(sdLayer!);
    expect(line).toContain('sd');
  });
});

// ── A-01-04: recipe with no sampleMap → no layer carries strudelSample ────────

describe('A-01-04: no-regression — recipe with no sampleMap yields no strudelSample', () => {
  it('dorian-ritual-sparse (no sampleMap) → all layers have no strudelSample', () => {
    const recipe = findRecipe('dorian-ritual-sparse');
    expect(recipe.sampleMap).toBeUndefined();

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    expect(layers.length).toBeGreaterThan(0);
    for (const layer of layers) {
      expect(layer.strudelSample).toBeUndefined();
    }
  });

  it('pop-rock-backbeat (no sampleMap) → all layers have no strudelSample', () => {
    const recipe = findRecipe('pop-rock-backbeat');
    expect(recipe.sampleMap).toBeUndefined();

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    expect(layers.length).toBeGreaterThan(0);
    for (const layer of layers) {
      expect(layer.strudelSample).toBeUndefined();
    }
  });
});
