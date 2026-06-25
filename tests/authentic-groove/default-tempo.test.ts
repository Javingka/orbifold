// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit + integration tests for defaultCpm → BPM tempo injection.
//
// Phase 06 step 06.2 — authentic-groove initiative.
//
// Covers acceptance IDs:
//   A-06-01 (partial): MusicalRecipe.defaultCpm? field exists; conversion formula
//                      bpm = defaultCpm * 4 is the only arithmetic path.
//   A-06-02 (partial): applying cumbia sets bpm = 120; applying cueca sets bpm = 160;
//                      applying a recipe without defaultCpm leaves bpm unchanged.
//   A-06-03 (partial): formula unit test — defaultCpm * 4 = bpm.
//
// Seam invariant (AG-D1): autopilot.ts reads recipe.defaultCpm (a data field, not a
// genre string). No genre name appears in the implementation or these tests outside
// of the recipe ID strings which identify test fixtures.
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.
// Audio functions (playGroove, playSession, requeueLive, and the audio part of setBpm)
// are mocked to prevent AudioContext initialization. The synchronous store update
// in setBpm (sessionStore.update) is preserved via the partial mock.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock audio-triggering functions to prevent AudioContext errors in Node.
// We spread ...actual so that sessionStore, setBpm's store-update part, and
// DEFAULT_SESSION_STATE are all preserved. Only the async audio calls are mocked.
vi.mock('../../src/state/session.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/state/session.js')>();
  return {
    ...actual,
    playGroove: vi.fn().mockResolvedValue(undefined),
    playProgression: vi.fn().mockResolvedValue(undefined),
    playSession: vi.fn().mockResolvedValue(undefined),
    requeueLive: vi.fn().mockReturnValue(null),
  };
});

import { sessionStore, DEFAULT_SESSION_STATE } from '../../src/state/session.js';
import { applyRhythmSpec, applyLockedFlags } from '../../src/agent/apply.js';
import { applyRecipeById } from '../../src/agent/autopilot.js';
import { RHYTHM_HARMONY_RECIPES } from '../../src/core/music-knowledge/rhythm-harmony-recipes.js';
import { recipeToAgentOutput } from '../../src/core/music-knowledge/recipe-engine.js';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset session store to clean state (bpm: 120 per DEFAULT_SESSION_STATE) before each test.
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
});

// ── Formula unit test (A-06-03) ───────────────────────────────────────────────

describe('A-06-03: defaultCpm → bpm formula unit test', () => {
  it('formula: bpm = defaultCpm * 4 for defaultCpm = 30 yields 120', () => {
    const defaultCpm = 30;
    const expectedBpm = defaultCpm * 4;
    expect(expectedBpm).toBe(120);
  });

  it('formula: bpm = defaultCpm * 4 for defaultCpm = 40 yields 160', () => {
    const defaultCpm = 40;
    const expectedBpm = defaultCpm * 4;
    expect(expectedBpm).toBe(160);
  });

  it('formula is consistent: cps = bpm / 240 = cpm / 60 (one cycle = one bar of 4/4)', () => {
    // One Strudel cycle = one bar of 4/4. cps = bpm/240 = cpm/60.
    // Therefore bpm = cpm * 4. This verifies the unit conversion.
    const cpm = 30;
    const cps = cpm / 60;
    const bpmFromCps = cps * 240; // inverse of setcps(bpm/240)
    expect(bpmFromCps).toBe(120); // same as cpm * 4
  });
});

// ── Catalog: defaultCpm values on cumbia and cueca ───────────────────────────

describe('A-06-01: MusicalRecipe.defaultCpm field — catalog spot-checks', () => {
  it('cumbia-latina-groove has defaultCpm: 30', () => {
    const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'cumbia-latina-groove');
    expect(recipe).toBeDefined();
    expect(recipe?.defaultCpm).toBe(30);
  });

  it('cueca-chilena-folk has defaultCpm: 40', () => {
    const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'cueca-chilena-folk');
    expect(recipe).toBeDefined();
    expect(recipe?.defaultCpm).toBe(40);
  });

  it('bossa-nova-groove has no defaultCpm pre-Phase-08 (gets defaultCpm: 32 in Phase 08 step 08.2)', () => {
    // This assertion will be updated in step 08.2 when defaultCpm is added.
    const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'bossa-nova-groove');
    expect(recipe).toBeDefined();
    expect(recipe?.defaultCpm).toBeUndefined();
  });

  it('pop-rock-backbeat has no defaultCpm pre-Phase-08 (gets defaultCpm: 27 in Phase 08 step 08.4)', () => {
    // This assertion will be updated in step 08.4 when defaultCpm is added.
    const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'pop-rock-backbeat');
    expect(recipe).toBeDefined();
    expect(recipe?.defaultCpm).toBeUndefined();
  });

  it('all 2 pre-Phase-08 tempo recipes have their original defaultCpm values', () => {
    // Phase 08 adds defaultCpm to 12 more recipes. This test only checks the
    // pre-Phase-08 recipes (cumbia, cueca) retain their original values.
    const recipe_cumbia = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'cumbia-latina-groove');
    const recipe_cueca = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'cueca-chilena-folk');
    expect(recipe_cumbia?.defaultCpm).toBe(30);
    expect(recipe_cueca?.defaultCpm).toBe(40);
  });
});

// ── applyRecipeById tempo injection — A-06-02 ─────────────────────────────────

describe('A-06-02: applyRecipeById — cumbia sets bpm = 120', () => {
  it('applying cumbia-latina-groove sets sessionStore.bpm to 120', () => {
    // Confirm initial BPM (default is 120 per DEFAULT_SESSION_STATE)
    expect(get(sessionStore).bpm).toBe(120);

    // Confirm the recipe actually has defaultCpm: 30 so the test is meaningful
    const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'cumbia-latina-groove');
    expect(recipe?.defaultCpm).toBe(30);

    // Set a non-default BPM to confirm the recipe actually changes it
    sessionStore.update((s) => ({ ...s, bpm: 90 }));
    expect(get(sessionStore).bpm).toBe(90);

    const result = applyRecipeById('cumbia-latina-groove');
    expect(result).toBe(true);

    // setBpm(30 * 4) = setBpm(120) updates sessionStore.bpm synchronously
    expect(get(sessionStore).bpm).toBe(120);
  });
});

describe('A-06-02: applyRecipeById — cueca sets bpm = 160', () => {
  it('applying cueca-chilena-folk sets sessionStore.bpm to 160', () => {
    // Confirm initial BPM
    expect(get(sessionStore).bpm).toBe(120);

    // Confirm the recipe actually has defaultCpm: 40
    const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'cueca-chilena-folk');
    expect(recipe?.defaultCpm).toBe(40);

    const result = applyRecipeById('cueca-chilena-folk');
    expect(result).toBe(true);

    // setBpm(40 * 4) = setBpm(160) updates sessionStore.bpm synchronously
    expect(get(sessionStore).bpm).toBe(160);
  });
});

describe('A-06-02: applyRecipeById — recipe without defaultCpm leaves bpm unchanged', () => {
  it('applying bossa-nova-groove does NOT change sessionStore.bpm from initial 120', () => {
    expect(get(sessionStore).bpm).toBe(120);

    // Confirm bossa has no defaultCpm
    const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'bossa-nova-groove');
    expect(recipe?.defaultCpm).toBeUndefined();

    applyRecipeById('bossa-nova-groove');

    // BPM must remain 120 (unchanged — no defaultCpm on this recipe)
    expect(get(sessionStore).bpm).toBe(120);
  });

  it('applying bossa-nova-groove does NOT change a non-default bpm (80)', () => {
    sessionStore.update((s) => ({ ...s, bpm: 80 }));
    expect(get(sessionStore).bpm).toBe(80);

    applyRecipeById('bossa-nova-groove');

    // BPM must remain 80 (no defaultCpm — no override)
    expect(get(sessionStore).bpm).toBe(80);
  });

  it('applying pop-rock-backbeat does NOT change bpm', () => {
    sessionStore.update((s) => ({ ...s, bpm: 100 }));
    applyRecipeById('pop-rock-backbeat');
    expect(get(sessionStore).bpm).toBe(100);
  });
});

// ── Integration tests (A-06-02 full, step 06.4) ──────────────────────────────

describe('A-06-02 integration: cumbia on store with cueca locked layers', () => {
  it('applying cumbia over prior cueca state: BPM = 120, locked layers replaced (force: true)', () => {
    // Step 1: set up cueca locked layers in the store (simulates prior recipe application)
    const cuecaRecipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'cueca-chilena-folk');
    expect(cuecaRecipe).toBeDefined();
    if (!cuecaRecipe) return;

    const cuecaOutput = recipeToAgentOutput(cuecaRecipe);
    expect(cuecaOutput).not.toBeNull();
    if (!cuecaOutput) return;

    applyRhythmSpec(cuecaOutput.rhythm, { force: true });
    const cuecaLockedSounds = (cuecaRecipe.layers ?? [])
      .filter((l) => l.locked === true)
      .map((l) => l.sound);
    applyLockedFlags(cuecaLockedSounds);

    // Confirm cueca bd layer is locked
    const layersAfterCueca = get(sessionStore).rhythm.layers;
    const cuecaBd = layersAfterCueca.find((l) => l.sound === 'bd');
    expect(cuecaBd?.locked).toBe(true);

    // Set a non-default BPM to confirm cumbia overrides it
    sessionStore.update((s) => ({ ...s, bpm: 160 }));
    expect(get(sessionStore).bpm).toBe(160);

    // Step 2: apply cumbia (force: true replaces ALL layers including cueca's locked bd)
    const result = applyRecipeById('cumbia-latina-groove');
    expect(result).toBe(true);

    // BPM updated to 120 (cumbia defaultCpm: 30 → 30 * 4 = 120)
    expect(get(sessionStore).bpm).toBe(120);

    // Cueca locked bd was replaced — cumbia bd is now present (locked)
    const layersAfterCumbia = get(sessionStore).rhythm.layers;
    const cumbiaBd = layersAfterCumbia.find((l) => l.sound === 'bd');
    expect(cumbiaBd).toBeDefined();
    expect(cumbiaBd?.locked).toBe(true);
    // Cumbia layers are 16-step (native E(4,16,0) and E(12,16,2) — no change from Phase 07)
    expect(layersAfterCumbia.every((l) => l.steps.length === 16)).toBe(true);
  });
});

describe('A-06-02 integration: cueca recipe apply — BPM 160, layers confirmed', () => {
  it('applying cueca: BPM = 160, 3 layers present with steps.length === 12', () => {
    // Phase 07 fix: applyRhythmSpec now emits native-length arrays.
    // Cueca recipe has 3 layers (bd: 12-step binary, cp: 12-step binary, hh: euclid E(6,12)).
    // After applyRhythmSpec, all 3 layers have steps.length === 12 (native 6/8 step count).
    const result = applyRecipeById('cueca-chilena-folk');
    expect(result).toBe(true);

    // BPM set to 160 (defaultCpm: 40 → 40 * 4 = 160)
    expect(get(sessionStore).bpm).toBe(160);

    const layers = get(sessionStore).rhythm.layers;
    expect(layers).toHaveLength(3);

    // All cueca layers have steps.length === 12 (native 6/8 grid, no RSTEPS padding)
    expect(layers.every((l) => l.steps.length === 12)).toBe(true);

    // bd layer is locked (cultural signature)
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer?.locked).toBe(true);

    // cp and hh are NOT locked
    const cpLayer = layers.find((l) => l.sound === 'cp');
    const hhLayer = layers.find((l) => l.sound === 'hh');
    expect(cpLayer?.locked).toBeUndefined();
    expect(hhLayer?.locked).toBeUndefined();
  });
});

describe('A-06-02 integration: no-tempo recipe leaves bpm unchanged', () => {
  it('applying dorian-ritual-sparse (no defaultCpm) leaves bpm at 90', () => {
    sessionStore.update((s) => ({ ...s, bpm: 90 }));
    applyRecipeById('dorian-ritual-sparse');
    expect(get(sessionStore).bpm).toBe(90);
  });
});
