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
    // cumbia sampleMap: { bd: 'conga' } — Phase 04 upgrade from 'perc' (FreePats Conga, CC0).

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

    // Confirm bd-slot layer now carries strudelSample: 'conga' (Phase 04 upgrade).
    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.strudelSample).toBe('conga');
  });

  it('rhythmLayerToStrudelLine emits "conga" tokens for cumbia bd layer (A-01-01 codegen)', () => {
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
    // Should contain 'conga' tokens (Phase 04 upgrade from 'perc'), not generic 'bd'.
    expect(line).toContain('conga');
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
        layers: [{ sound: 'sd' as const, steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] }],
      },
    }));

    // Map does not include 'sd'.
    applySampleMap({ bd: 'perc' });

    const layers = get(sessionStore).rhythm.layers;
    const sdLayer = layers.find((l) => l.sound === 'sd');
    expect(sdLayer).toBeDefined();
    expect(sdLayer?.strudelSample).toBeUndefined();

    // codegen falls back to 'sd'.
    if (!sdLayer) return;
    const line = rhythmLayerToStrudelLine(sdLayer);
    expect(line).toContain('sd');
  });
});

// ── A-03-02: bossa-nova-groove recipe → sampleMap propagation ─────────────────
//
// bossa-nova-groove has rhythmIds: ['bossa-nova-clave'] — a single rhythm.
// recipeToAgentOutput assigns sound: 'bd' (index 0) to the single layer.
// The sampleMap is { bd: 'bd', hh: 'hand' }.
//   - The 'bd' entry propagates: bd-slot layer gets strudelSample: 'bd'.
//   - The 'hh' entry does NOT propagate: there is no hh layer in the output
//     (single-layer recipe). applySampleMap carries no hh layer — it is
//     inert for this recipe. The 'hh: hand' entry is held in the catalog for
//     future use if an hh layer is added.
//
// This test confirms the applySampleMap propagation path is correct and that
// the catalog value 'hand' flows to codegen for any hh slot if one exists.
// The sample-map.test.ts test (step 03.3) already confirmed the catalog entry
// bossa-nova-groove.sampleMap.hh === 'hand'. This test confirms:
//   (a) the bd-slot propagation path is functional for bossa-nova-groove, and
//   (b) applySampleMap handles a sampleMap with an entry for a missing layer
//       gracefully (no error, no spurious layer created).
//
// Additionally: direct applySampleMap test with { hh: 'hand' } confirms 'hand'
// flows to codegen output when an hh layer is present (A-03-01 full coverage).

describe('A-03-02: bossa-nova-groove recipe → sampleMap propagation', () => {
  it('applying bossa-nova-groove recipe → bd-slot layer carries strudelSample "bd"', () => {
    const recipe = findRecipe('bossa-nova-groove');
    // Single-layer recipe (bossa-nova-clave); sound index 0 = 'bd'.
    // sampleMap: { bd: 'bd', hh: 'hand' } — bd entry applies; hh entry is inert (no hh layer).

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);

    // Confirm exactly one layer with sound 'bd' (single-layer recipe).
    const layersBefore = get(sessionStore).rhythm.layers;
    expect(layersBefore.length).toBe(1);
    expect(layersBefore[0].sound).toBe('bd');
    expect(layersBefore[0].strudelSample).toBeUndefined();

    applySampleMap(recipe.sampleMap ?? {});

    // bd-slot carries strudelSample: 'bd' (identity mapping).
    const layers = get(sessionStore).rhythm.layers;
    expect(layers[0].sound).toBe('bd');
    expect(layers[0].strudelSample).toBe('bd');
  });

  it('bossa-nova-groove has no hh layer — hh sampleMap entry is inert (A-03-02)', () => {
    const recipe = findRecipe('bossa-nova-groove');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {});

    // No hh layer exists — applySampleMap handles this gracefully (no error, no spurious layer).
    const layers = get(sessionStore).rhythm.layers;
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeUndefined();
  });

  it('rhythmLayerToStrudelLine emits "bd" (via strudelSample) for bossa-nova bd-slot (A-03-02 codegen)', () => {
    const recipe = findRecipe('bossa-nova-groove');
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
    // strudelSample: 'bd' emits 'bd' in the pattern (identity mapping confirmed via codegen).
    expect(line).toContain('bd');
  });
});

// ── A-03-01 (full): 'hand' value flows through applySampleMap + codegen ──────
//
// Confirms that the 'hand' value (upgraded from 'sd' in Phase 03) flows correctly
// through the entire plumbing stack when an hh layer is present.
// Uses a direct applySampleMap call (not recipe-based) to construct the scenario
// where an hh layer exists with strudelSample: 'hand'.

describe('A-03-01 (full): "hand" value flows from sampleMap through applySampleMap to codegen', () => {
  it('applySampleMap({ hh: "hand" }) sets strudelSample "hand" on hh layer (A-03-01)', () => {
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        ...s.rhythm,
        layers: [
          { sound: 'bd' as const, steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
          { sound: 'hh' as const, steps: [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0] },
        ],
      },
    }));

    applySampleMap({ hh: 'hand' });

    const layers = get(sessionStore).rhythm.layers;
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    expect(hhLayer?.strudelSample).toBe('hand');
    // bd-slot unaffected (not in sampleMap).
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer?.strudelSample).toBeUndefined();
  });

  it('rhythmLayerToStrudelLine emits "hand" for hh layer with strudelSample "hand" (A-03-01 codegen)', () => {
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        ...s.rhythm,
        layers: [{ sound: 'hh' as const, steps: [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0] }],
      },
    }));

    applySampleMap({ hh: 'hand' });

    const layers = get(sessionStore).rhythm.layers;
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    expect(hhLayer?.strudelSample).toBe('hand');
    if (!hhLayer) return;

    const line = rhythmLayerToStrudelLine(hhLayer);
    // 'hand' is emitted, not generic 'hh'.
    expect(line).toContain('hand');
    expect(line).not.toMatch(/s\("hh/);
    // Old fallback 'sd' is not emitted.
    expect(line).not.toMatch(/s\("sd/);
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

// ── A-04-02: candombe recipe → 'conga' propagation (Phase 04 upgrade) ────────
//
// candombe-dorian-groove sampleMap: { bd: 'conga' }
// Phase 04 upgrade from 'perc' — FreePats Conga (CC0), closest available to
// the Afro-Uruguayan candombe membrane drum.

describe('A-04-02: candombe recipe → strudelSample "conga" propagation', () => {
  it('applying candombe recipe yields bd-slot with strudelSample "conga" (Phase 04 upgrade)', () => {
    const recipe = findRecipe('candombe-dorian-groove');
    // Phase 04: bd upgraded from 'perc' → 'conga' (FreePats Conga, CC0).
    expect(recipe.sampleMap?.bd).toBe('conga');

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);

    // Confirm layers present but no strudelSample yet.
    const layersBefore = get(sessionStore).rhythm.layers;
    expect(layersBefore.length).toBeGreaterThan(0);
    expect(layersBefore[0].strudelSample).toBeUndefined();

    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.strudelSample).toBe('conga');
  });

  it('rhythmLayerToStrudelLine emits "conga" for candombe bd layer (A-04-02 codegen)', () => {
    const recipe = findRecipe('candombe-dorian-groove');
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
    // Should emit 'conga' (Phase 04 upgrade), not old fallback 'perc' or generic 'bd'.
    expect(line).toContain('conga');
    expect(line).not.toMatch(/s\("bd/);
    expect(line).not.toContain('perc');
  });
});

// ── A-04-02: bulería recipe → 'cajon' propagation (Phase 04 upgrade) ─────────
//
// buleria-flamenco-phrygian sampleMap: { bd: 'cajon' }
// Phase 04 upgrade from 'perc' — FreePats CajonFlamenco (CC0), canonical
// flamenco percussion instrument.
//
// Note: buleria-12 uses strudelStrategy='struct' with steps=12, which is NOT
// expressible by recipeToAgentOutput (requires steps=16 for struct path).
// The propagation is therefore tested via direct applySampleMap (same approach
// used for 'hand' in A-03-01 and for unit tests throughout this file).
// The catalog value 'cajon' is confirmed separately, and the plumbing path
// (applySampleMap + rhythmLayerToStrudelLine) is the same regardless of recipe.

describe('A-04-02: bulería recipe → sampleMap catalog value + "cajon" plumbing propagation', () => {
  it('buleria-flamenco-phrygian sampleMap.bd is "cajon" (Phase 04 upgrade from "perc")', () => {
    const recipe = findRecipe('buleria-flamenco-phrygian');
    // Phase 04: bd upgraded from 'perc' → 'cajon' (FreePats CajonFlamenco, CC0).
    expect(recipe.sampleMap?.bd).toBe('cajon');
  });

  it('applySampleMap({ bd: "cajon" }) sets strudelSample "cajon" on bd layer (A-04-02 plumbing)', () => {
    // Direct plumbing test: confirms 'cajon' flows through applySampleMap.
    // Uses same approach as A-03-01 tests for 'hand'.
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        ...s.rhythm,
        layers: [{ sound: 'bd' as const, steps: [1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0] }],
      },
    }));

    applySampleMap({ bd: 'cajon' });

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.strudelSample).toBe('cajon');
  });

  it('rhythmLayerToStrudelLine emits "cajon" for bd layer with strudelSample "cajon" (A-04-02 codegen)', () => {
    // Confirms the codegen emits 'cajon' — same plumbing as any other strudelSample value.
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        ...s.rhythm,
        layers: [{ sound: 'bd' as const, steps: [1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0] }],
      },
    }));

    applySampleMap({ bd: 'cajon' });

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.strudelSample).toBe('cajon');
    if (!bdLayer) return;

    const line = rhythmLayerToStrudelLine(bdLayer);
    // Should emit 'cajon', not old fallback 'perc' or generic 'bd'.
    expect(line).toContain('cajon');
    expect(line).not.toMatch(/s\("bd/);
    expect(line).not.toContain('perc');
  });
});

// ── A-04-02: rumba recipe → 'wood' propagation (Phase 04 upgrade) ────────────
//
// rumba-blues-minor sampleMap: { bd: 'wood' }
// Phase 04 upgrade from 'perc' — FreePats Claves (CC0), authentic clave
// idiophone for the rumba clave pattern.

describe('A-04-02: rumba recipe → strudelSample "wood" propagation', () => {
  it('applying rumba recipe yields bd-slot with strudelSample "wood" (Phase 04 upgrade)', () => {
    const recipe = findRecipe('rumba-blues-minor');
    // Phase 04: bd upgraded from 'perc' → 'wood' (FreePats Claves, CC0).
    expect(recipe.sampleMap?.bd).toBe('wood');

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);

    // Confirm layers present but no strudelSample yet.
    const layersBefore = get(sessionStore).rhythm.layers;
    expect(layersBefore.length).toBeGreaterThan(0);
    expect(layersBefore[0].strudelSample).toBeUndefined();

    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.strudelSample).toBe('wood');
  });

  it('rhythmLayerToStrudelLine emits "wood" for rumba bd layer (A-04-02 codegen)', () => {
    const recipe = findRecipe('rumba-blues-minor');
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
    // Should emit 'wood' (Phase 04 upgrade from FreePats Claves), not old 'perc' or generic 'bd'.
    expect(line).toContain('wood');
    expect(line).not.toMatch(/s\("bd/);
    expect(line).not.toContain('perc');
  });
});

// ── A-04-03: fallback-retention — recipes without authentic names unchanged ───
//
// Recipes whose Phase 01/03 fallbacks were assessed as non-upgradeable by any
// of the three new FreePats names (conga, cajon, wood) must retain their
// original fallback values unchanged. The west-african bell patterns use 'cb'
// for bd (metal bell → cowbell is closer than clave) and 'perc' for hh
// (generic percussion is the best available approximation for agogo/gankogui).

describe('A-04-03: fallback-retention — west-african-bell-modal bd="cb" hh="perc" unchanged', () => {
  it('west-african-bell-modal sampleMap retains bd="cb" (not upgraded)', () => {
    const recipe = findRecipe('west-african-bell-modal');
    // Phase 04 assessment: 'cb' (cowbell/metal idiophone) is closer to agogo
    // than 'wood' (clave/wood idiophone) — no upgrade applied.
    expect(recipe.sampleMap?.bd).toBe('cb');
  });

  it('west-african-bell-modal sampleMap retains hh="perc" (not upgraded)', () => {
    const recipe = findRecipe('west-african-bell-modal');
    // Phase 04 assessment: no FreePats name approximates bell/agogo better than perc.
    expect(recipe.sampleMap?.hh).toBe('perc');
  });

  it('applying west-african-bell-modal → bd-slot emits "cb" (A-04-03 codegen)', () => {
    const recipe = findRecipe('west-african-bell-modal');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.strudelSample).toBe('cb');

    if (!bdLayer) return;
    const line = rhythmLayerToStrudelLine(bdLayer);
    expect(line).toContain('cb');
    expect(line).not.toContain('conga');
    expect(line).not.toContain('cajon');
    expect(line).not.toContain('wood');
  });
});
