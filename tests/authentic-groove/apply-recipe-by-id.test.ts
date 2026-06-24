// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit tests for applyRecipeById (autopilot.ts export).
//
// authentic-groove Phase 02 step 02.2.
//
// Covers acceptance IDs:
//   A-02-03 (partial): applyRecipeById applies rhythm + sample overlay + harmony
//                      in the correct order — cumbia recipe carries strudelSample: 'perc' on bd slot.
//   A-02-04 (partial): applyRecipeById returns false for unknown IDs and non-expressible recipes.
//   A-02-07 (partial): calling applyRhythmSpec or applyHarmonySpec directly clears
//                      lastRecipeApplied (badge invalidation test).
//   A-02-05 (partial): all tests green; tsc clean.
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.
// Audio play functions are mocked to prevent AudioContext initialization.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock audio-triggering play functions to prevent AudioContext errors in Node.
// applyRecipeById calls these fire-and-forget when nowPlaying.label is null.
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

import {
  sessionStore,
  DEFAULT_SESSION_STATE,
  setLastRecipeApplied,
} from '../../src/state/session.js';
import { applyRhythmSpec, applyHarmonySpec } from '../../src/agent/apply.js';
import { applyRecipeById } from '../../src/agent/autopilot.js';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset session store to clean state before each test.
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
});

// ── A-02-03: cumbia recipe — rhythm + sampleMap + harmony applied ─────────────

describe('applyRecipeById — known recipe with sampleMap (cumbia-latina-groove)', () => {
  it('returns true for a known, expressible recipe ID', () => {
    const result = applyRecipeById('cumbia-latina-groove');
    expect(result).toBe(true);
  });

  it('session rhythm layers are non-empty after apply', () => {
    applyRecipeById('cumbia-latina-groove');
    const layers = get(sessionStore).rhythm.layers;
    expect(layers.length).toBeGreaterThan(0);
  });

  it('bd-slot layer carries strudelSample: "perc" (cumbia sampleMap A-02-03)', () => {
    // cumbia sampleMap: { bd: 'perc' } — per inventory §2 and ADR 0025 D4.
    applyRecipeById('cumbia-latina-groove');
    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.strudelSample).toBe('perc');
  });

  it('lastRecipeApplied.recipeId equals "cumbia-latina-groove" after apply (A-02-07 badge set)', () => {
    applyRecipeById('cumbia-latina-groove');
    const badge = get(sessionStore).lastRecipeApplied;
    expect(badge).toBeDefined();
    expect(badge?.recipeId).toBe('cumbia-latina-groove');
  });

  it('lastRecipeApplied.recipeName is defined and non-empty', () => {
    applyRecipeById('cumbia-latina-groove');
    const badge = get(sessionStore).lastRecipeApplied;
    expect(typeof badge?.recipeName).toBe('string');
    expect((badge?.recipeName ?? '').length).toBeGreaterThan(0);
  });

  it('lastRecipeApplied carries rhythmIds and harmonyId', () => {
    applyRecipeById('cumbia-latina-groove');
    const badge = get(sessionStore).lastRecipeApplied;
    expect(badge?.rhythmIds.length).toBeGreaterThan(0);
    expect(typeof badge?.harmonyId).toBe('string');
    expect((badge?.harmonyId ?? '').length).toBeGreaterThan(0);
  });

  it('harmony progression is non-empty after apply', () => {
    applyRecipeById('cumbia-latina-groove');
    const progression = get(sessionStore).harmony.progression;
    expect(progression.length).toBeGreaterThan(0);
  });
});

// ── A-02-03: recipe with no sampleMap (pop-rock-backbeat) ─────────────────────

describe('applyRecipeById — known recipe with no sampleMap (pop-rock-backbeat)', () => {
  it('returns true for a recipe with no sampleMap', () => {
    const result = applyRecipeById('pop-rock-backbeat');
    expect(result).toBe(true);
  });

  it('no layer carries strudelSample when recipe has no sampleMap', () => {
    applyRecipeById('pop-rock-backbeat');
    const layers = get(sessionStore).rhythm.layers;
    expect(layers.length).toBeGreaterThan(0);
    for (const layer of layers) {
      expect(layer.strudelSample).toBeUndefined();
    }
  });

  it('lastRecipeApplied.recipeId equals "pop-rock-backbeat" after apply', () => {
    applyRecipeById('pop-rock-backbeat');
    const badge = get(sessionStore).lastRecipeApplied;
    expect(badge?.recipeId).toBe('pop-rock-backbeat');
  });
});

// ── A-02-04: unknown ID — returns false, store unchanged ─────────────────────

describe('applyRecipeById — unknown recipe ID', () => {
  it('returns false for an unknown ID', () => {
    const result = applyRecipeById('does-not-exist-xyz');
    expect(result).toBe(false);
  });

  it('session rhythm layers are unchanged (empty) after unknown ID', () => {
    // Default session state has no rhythm layers.
    applyRecipeById('does-not-exist-xyz');
    const layers = get(sessionStore).rhythm.layers;
    expect(layers.length).toBe(0);
  });

  it('lastRecipeApplied is unchanged (undefined) after unknown ID', () => {
    applyRecipeById('does-not-exist-xyz');
    expect(get(sessionStore).lastRecipeApplied).toBeUndefined();
  });
});

// ── A-02-04: non-expressible recipe — buleria-flamenco-phrygian ───────────────
//
// buleria-flamenco-phrygian uses a 12-step struct rhythm, which the current
// expressibility filter excludes (struct requires steps === 16). This recipe
// is in the catalog but not returned by getExpressibleRecipes(). Applying it
// directly via applyRecipeById must return false (recipeToAgentOutput → null).

describe('applyRecipeById — non-expressible recipe (buleria-flamenco-phrygian)', () => {
  it('returns false for buleria-flamenco-phrygian (12-step struct — not expressible)', () => {
    // This recipe exists in the catalog but is excluded by the expressibility filter.
    // recipeToAgentOutput returns null for it; applyRecipeById must return false.
    const result = applyRecipeById('buleria-flamenco-phrygian');
    expect(result).toBe(false);
  });

  it('session layers are unchanged after applying a non-expressible recipe', () => {
    applyRecipeById('buleria-flamenco-phrygian');
    expect(get(sessionStore).rhythm.layers.length).toBe(0);
  });

  it('lastRecipeApplied is unchanged after applying a non-expressible recipe', () => {
    applyRecipeById('buleria-flamenco-phrygian');
    expect(get(sessionStore).lastRecipeApplied).toBeUndefined();
  });
});

// ── A-02-07: badge invalidation — direct applyRhythmSpec call clears badge ───

describe('badge invalidation — direct applyRhythmSpec clears lastRecipeApplied (A-02-07)', () => {
  it('lastRecipeApplied is cleared when applyRhythmSpec is called directly after recipe apply', () => {
    // First apply a recipe so the badge is set.
    applyRecipeById('cumbia-latina-groove');
    expect(get(sessionStore).lastRecipeApplied).toBeDefined();

    // Now simulate a manual rhythm change via applyRhythmSpec directly.
    // This represents a user or agent changing rhythm without going through applyRecipeById.
    applyRhythmSpec({
      layers: [
        { sound: 'sd', steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
      ],
    });

    // Badge must be cleared — session has diverged from the recipe.
    expect(get(sessionStore).lastRecipeApplied).toBeUndefined();
  });
});

// ── A-02-07: badge invalidation — direct applyHarmonySpec call clears badge ──

describe('badge invalidation — direct applyHarmonySpec clears lastRecipeApplied (A-02-07)', () => {
  it('lastRecipeApplied is cleared when applyHarmonySpec is called directly after recipe apply', () => {
    // First apply a recipe so the badge is set.
    applyRecipeById('cumbia-latina-groove');
    expect(get(sessionStore).lastRecipeApplied).toBeDefined();

    // Now simulate a manual harmony change via applyHarmonySpec directly.
    applyHarmonySpec({
      root: 'C',
      mode: 'minor',
      octave: 3,
      progression: [{ root: 'C', quality: 'min', gain: 0.6 }],
    });

    // Badge must be cleared — session has diverged from the recipe.
    expect(get(sessionStore).lastRecipeApplied).toBeUndefined();
  });
});

// ── A-02-07: badge survives when applyRecipeById is the last writer ───────────

describe('badge correctness — applyRecipeById sets badge as last write (A-02-07)', () => {
  it('badge reflects the recipe that was most recently applied', () => {
    // Apply cumbia first.
    applyRecipeById('cumbia-latina-groove');
    expect(get(sessionStore).lastRecipeApplied?.recipeId).toBe('cumbia-latina-groove');

    // Apply pop-rock second — badge must update to the new recipe.
    applyRecipeById('pop-rock-backbeat');
    expect(get(sessionStore).lastRecipeApplied?.recipeId).toBe('pop-rock-backbeat');
  });

  it('lastRecipeApplied set explicitly then cleared by direct setLastRecipeApplied(null)', () => {
    applyRecipeById('cumbia-latina-groove');
    expect(get(sessionStore).lastRecipeApplied).toBeDefined();

    setLastRecipeApplied(null);
    expect(get(sessionStore).lastRecipeApplied).toBeUndefined();
  });
});
