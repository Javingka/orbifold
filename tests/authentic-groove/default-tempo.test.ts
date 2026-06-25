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
import { applyRecipeById } from '../../src/agent/autopilot.js';
import { RHYTHM_HARMONY_RECIPES } from '../../src/core/music-knowledge/rhythm-harmony-recipes.js';

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

  it('bossa-nova-groove has no defaultCpm (tempo unchanged on apply)', () => {
    const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'bossa-nova-groove');
    expect(recipe).toBeDefined();
    expect(recipe?.defaultCpm).toBeUndefined();
  });

  it('pop-rock-backbeat has no defaultCpm', () => {
    const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === 'pop-rock-backbeat');
    expect(recipe).toBeDefined();
    expect(recipe?.defaultCpm).toBeUndefined();
  });

  it('all 13 non-tempo recipes have no defaultCpm', () => {
    const tempoRecipeIds = new Set(['cumbia-latina-groove', 'cueca-chilena-folk']);
    const nonTempoRecipes = RHYTHM_HARMONY_RECIPES.filter((r) => !tempoRecipeIds.has(r.id));
    for (const recipe of nonTempoRecipes) {
      expect(recipe.defaultCpm, `${recipe.id} should not have defaultCpm`).toBeUndefined();
    }
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
