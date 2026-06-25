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
import { applyRhythmSpec, applySampleMap, applyLockedFlags } from '../../src/agent/apply.js';
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

// ── End-to-end: samba recipe (A-01-01 partial / A-01-04 / Phase 08 upgrade) ──
//
// Phase 08: samba-afro-brasileiro upgraded — sampleMap.hh: 'sd' → 'hand' (pandeiro/
// tamborim), and recipe.layers added (surdo LOCKED + teleco-teco LOCKED).
// Tests updated to reflect the Phase 08 state.

describe('A-08-05: samba recipe → hh-slot carries strudelSample "hand" (Phase 08 upgrade)', () => {
  it('applying samba recipe → hh-slot layer carries strudelSample "hand" (Phase 08)', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    // Phase 08: sampleMap upgraded to { bd: 'bd', hh: 'hand' }
    expect(recipe.sampleMap?.hh).toBe('hand');

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    expect(hhLayer?.strudelSample).toBe('hand');
  });

  it('samba bd-slot carries strudelSample "bd" (sampleMap identity mapping)', () => {
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

  it('rhythmLayerToStrudelLine emits "hand" for samba hh-slot (Phase 08 codegen)', () => {
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
    expect(line).toContain('hand');
    // Must not emit old fallback 'sd'.
    expect(line).not.toMatch(/s\("sd/);
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

// A-03-02: bossa-nova-groove recipe → sampleMap propagation
// Phase 08: bossa-nova-groove now has 2 layers (bd clave LOCKED + hh kick free).
// recipeToAgentOutput uses recipe.layers path; both layers are present after apply.

describe('A-03-02: bossa-nova-groove recipe → sampleMap propagation (Phase 08 two-layer)', () => {
  it('applying bossa-nova-groove recipe → bd-slot layer carries strudelSample "bd" (A-03-02)', () => {
    const recipe = findRecipe('bossa-nova-groove');
    // Phase 08: two-layer recipe; bd (clave, LOCKED) and hh (kick, free).
    // sampleMap: { bd: 'bd', hh: 'hand' } — both entries apply to their slots.

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);

    // Phase 08: two layers — bd and hh.
    const layersBefore = get(sessionStore).rhythm.layers;
    expect(layersBefore.length).toBe(2);
    const bdBefore = layersBefore.find((l) => l.sound === 'bd');
    expect(bdBefore).toBeDefined();
    expect(bdBefore?.strudelSample).toBeUndefined();

    applySampleMap(recipe.sampleMap ?? {});

    // bd-slot carries strudelSample: 'bd' (identity mapping).
    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer?.strudelSample).toBe('bd');
  });

  it('bossa-nova-groove hh layer carries strudelSample "hand" (Phase 08 — A-03-02)', () => {
    const recipe = findRecipe('bossa-nova-groove');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm);
    applySampleMap(recipe.sampleMap ?? {});

    // Phase 08: hh layer exists (kick syncopation, free); carries strudelSample: 'hand'.
    const layers = get(sessionStore).rhythm.layers;
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    expect(hhLayer?.strudelSample).toBe('hand');
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

// ── A-05-07 / A-05-05: cueca multi-layer recipe (Phase 05) ───────────────────
//
// cueca-chilena-folk now declares 3 layers via recipe.layers[]:
//   bd (locked), cp (free, 12-step palmas), hh (free, E(6,12)).
// recipeToAgentOutput uses layers[i].sound — NOT index-based soundForIndex().
// After applyRhythmSpec + applyLockedFlags, the session has:
//   bd with locked: true, cp with locked: undefined, hh with locked: undefined.

describe('A-05-07: cueca multi-layer recipe — 3 layers with correct sounds', () => {
  it('recipeToAgentOutput for cueca produces 3 rhythm layers (A-05-05)', () => {
    const recipe = findRecipe('cueca-chilena-folk');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(3);

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    expect(output.rhythm.layers).toHaveLength(3);
  });

  it('cueca output layers have sounds bd, cp, hh per recipe.layers[i].sound (A-05-05)', () => {
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    const sounds = output.rhythm.layers.map((l) => l.sound);
    expect(sounds).toContain('bd');
    expect(sounds).toContain('cp');
    expect(sounds).toContain('hh');
  });

  it('cueca bd layer is locked after applyRhythmSpec + applyLockedFlags (A-05-03 full)', () => {
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    // Simulate recipe application path (force: true + lockedFlags).
    applyRhythmSpec(output.rhythm, { force: true });
    const lockedSounds = (recipe.layers ?? []).filter((l) => l.locked === true).map((l) => l.sound);
    applyLockedFlags(lockedSounds);

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer?.locked).toBe(true);

    // cp and hh are NOT locked (Pilot-confirmed: only bd is locked in cueca)
    const cpLayer = layers.find((l) => l.sound === 'cp');
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(cpLayer?.locked).toBeUndefined();
    expect(hhLayer?.locked).toBeUndefined();
  });

  it('cueca codegen: each layer emits its generic sound (no sampleMap, A-05-07)', () => {
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    expect(layers).toHaveLength(3);

    for (const layer of layers) {
      const line = rhythmLayerToStrudelLine(layer);
      // No sampleMap → emits generic sound.
      expect(line).toContain(layer.sound);
      expect(layer.strudelSample).toBeUndefined();
    }
  });
});

// ── A-05-07 / A-05-05: cumbia multi-layer recipe (Phase 05) ──────────────────
//
// cumbia-latina-groove now declares 2 layers via recipe.layers[]:
//   bd (locked, conga caja), hh (locked, shaker/guacharaca).
// Both layers carry strudelSample (conga, shaker) in the recipe declaration.
// After applyRhythmSpec + applySampleMap + applyLockedFlags:
//   bd.strudelSample = 'conga', hh.strudelSample = 'shaker', both locked.

describe('A-05-07: cumbia multi-layer recipe — 2 locked layers with shaker (A-05-05 full)', () => {
  it('recipeToAgentOutput for cumbia produces 2 rhythm layers', () => {
    const recipe = findRecipe('cumbia-latina-groove');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(2);

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    expect(output.rhythm.layers).toHaveLength(2);
  });

  it('cumbia output layers have sounds bd and hh per recipe.layers[i].sound (A-05-05)', () => {
    const recipe = findRecipe('cumbia-latina-groove');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    const sounds = output.rhythm.layers.map((l) => l.sound);
    expect(sounds).toContain('bd');
    expect(sounds).toContain('hh');
  });

  it('cumbia bd and hh both locked after applyRhythmSpec + applyLockedFlags (A-05-07 full)', () => {
    const recipe = findRecipe('cumbia-latina-groove');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });
    const lockedSounds = (recipe.layers ?? []).filter((l) => l.locked === true).map((l) => l.sound);
    applyLockedFlags(lockedSounds);

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    const hhLayer = layers.find((l) => l.sound === 'hh');

    expect(bdLayer?.locked).toBe(true);
    expect(hhLayer?.locked).toBe(true);
  });

  it('cumbia bd layer gets strudelSample "conga" after applySampleMap (A-05-07 sampleMap)', () => {
    const recipe = findRecipe('cumbia-latina-groove');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer?.strudelSample).toBe('conga');
  });

  it('cumbia hh layer gets strudelSample "shaker" after applySampleMap (A-05-08 shaker)', () => {
    const recipe = findRecipe('cumbia-latina-groove');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(hhLayer?.strudelSample).toBe('shaker');
  });

  it('cumbia codegen: "conga" emitted for bd, "shaker" emitted for hh (A-05-07 codegen)', () => {
    const recipe = findRecipe('cumbia-latina-groove');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(bdLayer).toBeDefined();
    expect(hhLayer).toBeDefined();
    if (!bdLayer || !hhLayer) return;

    const bdLine = rhythmLayerToStrudelLine(bdLayer);
    const hhLine = rhythmLayerToStrudelLine(hhLayer);

    expect(bdLine).toContain('conga');
    expect(hhLine).toContain('shaker');
  });
});

// ── A-05-02: lock-preservation integration (Phase 05) ────────────────────────
//
// After a cueca recipe is applied (bd locked), calling applyRhythmSpec directly
// with a new bd spec must NOT replace the locked bd layer.
// The locked bd remains; the unlocked cp and hh are dropped (replaced by the
// spec's proposed layers if any, but here we only propose bd — which is blocked).

describe('A-05-02: lock-preservation integration — cueca locked bd survives agent call', () => {
  it('locked bd survives a direct applyRhythmSpec targeting bd (A-05-02 full)', () => {
    // Step 1: Apply cueca recipe (sets bd as locked).
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });
    const lockedSounds = (recipe.layers ?? []).filter((l) => l.locked === true).map((l) => l.sound);
    applyLockedFlags(lockedSounds);

    // Confirm bd is locked.
    const layersAfterRecipe = get(sessionStore).rhythm.layers;
    const bdAfterRecipe = layersAfterRecipe.find((l) => l.sound === 'bd');
    expect(bdAfterRecipe?.locked).toBe(true);

    // Step 2: Agent proposes a new bd pattern (all-ones — different from cueca kick).
    applyRhythmSpec({
      layers: [{ sound: 'bd', steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] }],
    });

    // Step 3: Confirm bd still has the original cueca kick (steps[1] should be 0 in cueca binary '101000101000').
    const layersAfterAgent = get(sessionStore).rhythm.layers;
    const bdAfterAgent = layersAfterAgent.find((l) => l.sound === 'bd');
    expect(bdAfterAgent?.locked).toBe(true);
    // The all-ones proposal was blocked — cueca kick has some zero steps.
    // Cueca bd binary '101000101000' (12 steps native): onsets at 0,2,6,8; step[1] = 0.
    if (bdAfterAgent?.steps) {
      // The cueca base has 4 onsets in 12 native steps; at least one of steps 1,2,3 should be 0.
      const firstFour = bdAfterAgent.steps.slice(0, 4);
      expect(firstFour.some((v) => v === 0)).toBe(true);
    }
  });

  it('agent can add a NEW unlocked layer even when locked layers exist (A-05-02 full)', () => {
    // Apply cueca recipe (bd locked).
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });
    const lockedSounds = (recipe.layers ?? []).filter((l) => l.locked === true).map((l) => l.sound);
    applyLockedFlags(lockedSounds);

    // Agent proposes an sd layer (new sound, not locked).
    applyRhythmSpec({
      layers: [{ sound: 'sd', steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] }],
    });

    const layers = get(sessionStore).rhythm.layers;
    // bd (locked) still present.
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer?.locked).toBe(true);
    // sd (new unlocked) is present.
    const sdLayer = layers.find((l) => l.sound === 'sd');
    expect(sdLayer).toBeDefined();
    expect(sdLayer?.locked).toBeUndefined();
  });
});

// ── A-07-01/A-07-02/A-07-03 guard: cueca layers native step count after recipe apply (Phase 07) ──
//
// Phase 07 fix: applyRhythmSpec now emits step arrays at their native length.
// This means cueca's 12-step binary strings ('101000101000', '000010000010') become
// 12-element arrays in the session store — no RSTEPS padding.
// The hh layer (euclid E(6,12)) also produces a 12-element array (bjorklund(6,12) length = 12).
// The dynamic step grid (Phase 06) reads layer.steps.length — correctly 12 for cueca layers.

describe('A-07-01/A-07-02/A-07-03 guard: cueca layers after recipe apply have native step counts', () => {
  it('all cueca layers have steps.length === 12 after applyRhythmSpec (native length, no RSTEPS padding)', () => {
    const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'cueca-chilena-folk');
    expect(recipe).toBeDefined();
    if (!recipe) return;

    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers).toHaveLength(3);
    // Phase 07: applyRhythmSpec produces native-length arrays (12 for cueca patterns)
    for (const layer of layers) {
      expect(
        layer.steps.length,
        `layer ${layer.sound} should have 12 steps (native 6/8 grid), got ${layer.steps.length}`
      ).toBe(12);
    }
  });
});

// ── A-07-01/02/03/04/05: cueca + cumbia e2e Strudel token output (Phase 07 step 07.2) ──
//
// Full end-to-end tests: recipe → applyRhythmSpec → rhythmLayerToStrudelLine.
// Each test verifies the exact Strudel token string emitted for a layer after
// applyRecipeById, confirming that 12-step cueca layers emit exactly 12 tokens
// and 16-step cumbia layers continue to emit exactly 16 tokens.
//
// These tests depend on the Phase 07 fix in applyRhythmSpec (apply.ts) being in
// place. They are integration tests — not unit tests — because they exercise the
// full recipe → store → codegen round-trip.

describe('A-07-01 e2e: cueca bd layer → steps.length===12, exact 12-token Strudel string', () => {
  it('cueca-chilena-folk bd layer: steps.length === 12 after recipe apply (A-07-01 e2e)', () => {
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    if (!bdLayer) return;
    expect(bdLayer.steps.length).toBe(12);
  });

  it('cueca-chilena-folk bd layer: rhythmLayerToStrudelLine emits exact 12-token string (A-07-01 e2e)', () => {
    // cueca bd binary: '101000101000' → [1,0,1,0,0,0,1,0,1,0,0,0]
    // Expected codegen: '  s("bd ~ bd ~ ~ ~ bd ~ bd ~ ~ ~")'
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    if (!bdLayer) return;

    const line = rhythmLayerToStrudelLine(bdLayer);
    expect(line).toBe('  s("bd ~ bd ~ ~ ~ bd ~ bd ~ ~ ~")');
  });
});

describe('A-07-02 e2e: cueca hh layer E(6,12,0) → steps.length===12, exact 12-token Strudel string', () => {
  it('cueca-chilena-folk hh layer: steps.length === 12 after recipe apply (A-07-02 e2e)', () => {
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });

    const layers = get(sessionStore).rhythm.layers;
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    if (!hhLayer) return;
    expect(hhLayer.steps.length).toBe(12);
  });

  it('cueca-chilena-folk hh layer: rhythmLayerToStrudelLine emits exact 12-token string (A-07-02 e2e)', () => {
    // cueca hh: euclid E(6,12,0) → bjorklund(6,12) = [1,0,1,0,1,0,1,0,1,0,1,0]
    // Expected codegen: '  s("hh ~ hh ~ hh ~ hh ~ hh ~ hh ~")'
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });

    const layers = get(sessionStore).rhythm.layers;
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    if (!hhLayer) return;

    const line = rhythmLayerToStrudelLine(hhLayer);
    expect(line).toBe('  s("hh ~ hh ~ hh ~ hh ~ hh ~ hh ~")');
  });
});

describe('A-07-03 e2e: cueca cp layer → steps.length===12, exact 12-token Strudel string', () => {
  it('cueca-chilena-folk cp layer: steps.length === 12 after recipe apply (A-07-03 e2e)', () => {
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });

    const layers = get(sessionStore).rhythm.layers;
    const cpLayer = layers.find((l) => l.sound === 'cp');
    expect(cpLayer).toBeDefined();
    if (!cpLayer) return;
    expect(cpLayer.steps.length).toBe(12);
  });

  it('cueca-chilena-folk cp layer: rhythmLayerToStrudelLine emits exact 12-token string (A-07-03 e2e)', () => {
    // cueca cp binary: '000010000010' → [0,0,0,0,1,0,0,0,0,0,1,0]
    // Expected codegen: '  s("~ ~ ~ ~ cp ~ ~ ~ ~ ~ cp ~")'
    const recipe = findRecipe('cueca-chilena-folk');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });

    const layers = get(sessionStore).rhythm.layers;
    const cpLayer = layers.find((l) => l.sound === 'cp');
    expect(cpLayer).toBeDefined();
    if (!cpLayer) return;

    const line = rhythmLayerToStrudelLine(cpLayer);
    expect(line).toBe('  s("~ ~ ~ ~ cp ~ ~ ~ ~ ~ cp ~")');
  });
});

describe('A-07-04 e2e: cumbia backward-compat — all layers steps.length===16, 16-token codegen', () => {
  it('cumbia-latina-groove: all layers steps.length === 16 (A-07-04 e2e)', () => {
    const recipe = findRecipe('cumbia-latina-groove');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers.length).toBeGreaterThan(0);
    for (const layer of layers) {
      expect(
        layer.steps.length,
        `cumbia layer ${layer.sound} should have 16 steps, got ${layer.steps.length}`
      ).toBe(16);
    }
  });

  it('cumbia-latina-groove: rhythmLayerToStrudelLine emits 16-token strings for all layers (A-07-04 e2e)', () => {
    const recipe = findRecipe('cumbia-latina-groove');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });
    applySampleMap(recipe.sampleMap ?? {});

    const layers = get(sessionStore).rhythm.layers;
    expect(layers.length).toBeGreaterThan(0);
    for (const layer of layers) {
      const line = rhythmLayerToStrudelLine(layer);
      // Count space-separated tokens inside s("...") — must be 16.
      const match = line.match(/s\("(.+?)"\)/);
      expect(match).not.toBeNull();
      if (!match) continue;
      const tokens = match[1].split(' ');
      expect(
        tokens.length,
        `cumbia layer ${layer.sound} codegen should emit 16 tokens, got ${tokens.length}: "${line}"`
      ).toBe(16);
    }
  });
});

describe('A-07-05 e2e: agent backward-compat — 16-step agent output → steps.length===16, 16-token codegen', () => {
  it('agent spec with euclid k=4,n=16 and steps[16] → both layers steps.length===16 (A-07-05 e2e)', () => {
    // Simulates a typical LLM-generated agent output: euclid n=16 + 16-element steps array.
    applyRhythmSpec({
      layers: [
        { sound: 'hh', euclid: { k: 4, n: 16, rot: 0 } },
        { sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
      ],
    });

    const layers = get(sessionStore).rhythm.layers;
    expect(layers.length).toBe(2);
    for (const layer of layers) {
      expect(layer.steps.length).toBe(16);
    }
  });

  it('agent spec: rhythmLayerToStrudelLine emits 16-token strings for both agent layers (A-07-05 e2e)', () => {
    applyRhythmSpec({
      layers: [
        { sound: 'hh', euclid: { k: 4, n: 16, rot: 0 } },
        { sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
      ],
    });

    const layers = get(sessionStore).rhythm.layers;
    for (const layer of layers) {
      const line = rhythmLayerToStrudelLine(layer);
      const match = line.match(/s\("(.+?)"\)/);
      expect(match).not.toBeNull();
      if (!match) continue;
      const tokens = match[1].split(' ');
      expect(
        tokens.length,
        `agent layer ${layer.sound} codegen should emit 16 tokens, got ${tokens.length}`
      ).toBe(16);
    }
  });
});

// ── Step 08.1: Afro-Cuban clave family binary assertions ──────────────────────

describe('Step 08.1: Afro-Cuban clave family binary assertions', () => {
  it('A-08-01: afro-cuban-clave-minor bd layer binary, steps, locked', () => {
    const recipe = findRecipe('afro-cuban-clave-minor');
    expect(recipe.layers).toBeDefined();
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.binary).toBe('1001001000101000');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.locked).toBe(true);
  });

  it('A-08-01: afro-cuban-clave-minor hh layer binary, steps, locked', () => {
    const recipe = findRecipe('afro-cuban-clave-minor');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    expect(hhLayer?.binary).toBe('0101010110101010');
    expect(hhLayer?.steps).toBe(16);
    expect(hhLayer?.locked).toBe(false);
  });

  it('A-08-02: rumba-blues-minor bd layer binary, steps, locked', () => {
    const recipe = findRecipe('rumba-blues-minor');
    expect(recipe.layers).toBeDefined();
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.binary).toBe('1001000100101000');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.locked).toBe(true);
  });

  it('A-08-03: latin-jazz-clave-swing bd layer binary, steps, locked', () => {
    const recipe = findRecipe('latin-jazz-clave-swing');
    expect(recipe.layers).toBeDefined();
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.binary).toBe('1000101001001000');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.locked).toBe(true);
  });

  it('A-08-03: latin-jazz-clave-swing hh layer binary, steps, locked', () => {
    const recipe = findRecipe('latin-jazz-clave-swing');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    expect(hhLayer?.binary).toBe('0110101010101101');
    expect(hhLayer?.steps).toBe(16);
    expect(hhLayer?.locked).toBe(true);
  });

  it('A-08-16: afro-cuban-clave-minor defaultCpm === 25', () => {
    const recipe = findRecipe('afro-cuban-clave-minor');
    expect(recipe.defaultCpm).toBe(25);
  });

  it('A-08-16: rumba-blues-minor defaultCpm === 25', () => {
    const recipe = findRecipe('rumba-blues-minor');
    expect(recipe.defaultCpm).toBe(25);
  });

  it('A-08-16: latin-jazz-clave-swing defaultCpm === 42', () => {
    const recipe = findRecipe('latin-jazz-clave-swing');
    expect(recipe.defaultCpm).toBe(42);
  });
});

// ── Step 08.2: Brazilian duo binary assertions ────────────────────────────────

describe('Step 08.2: Brazilian duo binary assertions', () => {
  it('A-08-04: bossa-nova-groove bd layer binary, steps, locked', () => {
    const recipe = findRecipe('bossa-nova-groove');
    expect(recipe.layers).toBeDefined();
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.binary).toBe('1001001010010010');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.locked).toBe(true);
  });

  it('A-08-04: bossa-nova-groove hh layer binary, steps, locked', () => {
    const recipe = findRecipe('bossa-nova-groove');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    expect(hhLayer?.binary).toBe('1000010010001001');
    expect(hhLayer?.steps).toBe(16);
    expect(hhLayer?.locked).toBe(false);
  });

  it('A-08-05: samba-afro-brasileiro bd layer binary, steps, locked', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    expect(recipe.layers).toBeDefined();
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.binary).toBe('1000000010000000');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.locked).toBe(true);
  });

  it('A-08-05: samba-afro-brasileiro hh layer binary, steps, locked', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer).toBeDefined();
    expect(hhLayer?.binary).toBe('1011010110110101');
    expect(hhLayer?.steps).toBe(16);
    expect(hhLayer?.locked).toBe(true);
  });

  it('A-08-16: bossa-nova-groove defaultCpm === 32', () => {
    const recipe = findRecipe('bossa-nova-groove');
    expect(recipe.defaultCpm).toBe(32);
  });

  it('A-08-16: samba-afro-brasileiro defaultCpm === 26', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    expect(recipe.defaultCpm).toBe(26);
  });
});

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
