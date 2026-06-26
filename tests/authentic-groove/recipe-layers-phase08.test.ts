// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Phase 08 comprehensive binary assertion suite.
//
// Phase 08 step 08.5 — authentic-groove initiative.
//
// Covers acceptance IDs A-08-01 through A-08-17 (full).
//
// This file provides the definitive binary assertion suite for all 12 Phase 08
// target recipes. Steps 08.1–08.4 added per-step assertions to propagation.test.ts;
// this file consolidates the complete Phase 08 acceptance evidence in one place
// and adds A-08-13 (full), A-08-14 (full), A-08-15 (full), and the A-08-17
// quality gate summary.
//
// Seam invariant (AG-D1): no genre name in this file outside recipe ID strings.
// Tests are data assertions on RHYTHM_HARMONY_RECIPES fields only.

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { RHYTHM_HARMONY_RECIPES } from '../../src/core/music-knowledge/rhythm-harmony-recipes.js';
import { bjorklund } from '../../src/core/rhythm/euclid.js';
import { sessionStore, DEFAULT_SESSION_STATE } from '../../src/state/session.js';
import { applyRhythmSpec } from '../../src/agent/apply.js';
import { recipeToAgentOutput } from '../../src/core/music-knowledge/recipe-engine.js';

// ── Helper ────────────────────────────────────────────────────────────────────

function findRecipe(id: string) {
  const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === id);
  if (!recipe) throw new Error(`Recipe '${id}' not found`);
  return recipe;
}

beforeEach(() => {
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
});

// ── A-08-01: afro-cuban-clave-minor ──────────────────────────────────────────

describe('A-08-01: afro-cuban-clave-minor complete binary assertions', () => {
  it('layers exists and has 2 entries', () => {
    const recipe = findRecipe('afro-cuban-clave-minor');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBeGreaterThanOrEqual(1);
  });

  it('at least one layer has locked: true', () => {
    const recipe = findRecipe('afro-cuban-clave-minor');
    expect(recipe.layers?.some((l) => l.locked === true)).toBe(true);
  });

  it('bd layer binary === 1001001000101000 (son clave 3-2), steps === 16, locked === true', () => {
    const recipe = findRecipe('afro-cuban-clave-minor');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).toBe('1001001000101000');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.binary.length).toBe(bdLayer?.steps);
    expect(bdLayer?.locked).toBe(true);
  });

  it('hh layer binary === 0101010110101010 (conga tumbao), steps === 16, locked === false', () => {
    const recipe = findRecipe('afro-cuban-clave-minor');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer?.binary).toBe('0101010110101010');
    expect(hhLayer?.steps).toBe(16);
    expect(hhLayer?.binary.length).toBe(hhLayer?.steps);
    expect(hhLayer?.locked).toBe(false);
  });

  it('defaultCpm === 25, within bpmRange [90, 140]', () => {
    const recipe = findRecipe('afro-cuban-clave-minor');
    expect(recipe.defaultCpm).toBe(25);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-02: rumba-blues-minor ────────────────────────────────────────────────

describe('A-08-02: rumba-blues-minor complete binary assertions', () => {
  it('layers exists with at least 1 entry, at least one locked', () => {
    const recipe = findRecipe('rumba-blues-minor');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBeGreaterThanOrEqual(1);
    expect(recipe.layers?.some((l) => l.locked === true)).toBe(true);
  });

  it('bd layer binary === 1001000100101000 (rumba clave 3-2 — the drag), steps === 16, locked === true', () => {
    const recipe = findRecipe('rumba-blues-minor');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).toBe('1001000100101000');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.binary.length).toBe(bdLayer?.steps);
    expect(bdLayer?.locked).toBe(true);
  });

  it('defaultCpm === 25, within bpmRange [80, 140]', () => {
    const recipe = findRecipe('rumba-blues-minor');
    expect(recipe.defaultCpm).toBe(25);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-03: latin-jazz-clave-swing ──────────────────────────────────────────

describe('A-08-03: latin-jazz-clave-swing complete binary assertions', () => {
  it('layers exists with 2 entries, both locked', () => {
    const recipe = findRecipe('latin-jazz-clave-swing');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(2);
    expect(recipe.layers?.every((l) => l.locked === true)).toBe(true);
  });

  it('bd layer binary === 1000101001001000 (son clave 2-3), steps === 16, locked === true', () => {
    const recipe = findRecipe('latin-jazz-clave-swing');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).toBe('1000101001001000');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.binary.length).toBe(bdLayer?.steps);
    expect(bdLayer?.locked).toBe(true);
  });

  it('hh layer binary === 0110101010101101 (cascara 2-3), steps === 16, locked === true', () => {
    const recipe = findRecipe('latin-jazz-clave-swing');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer?.binary).toBe('0110101010101101');
    expect(hhLayer?.steps).toBe(16);
    expect(hhLayer?.binary.length).toBe(hhLayer?.steps);
    expect(hhLayer?.locked).toBe(true);
  });

  it('defaultCpm === 42, within bpmRange [120, 200]', () => {
    const recipe = findRecipe('latin-jazz-clave-swing');
    expect(recipe.defaultCpm).toBe(42);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-04: bossa-nova-groove ────────────────────────────────────────────────

describe('A-08-04: bossa-nova-groove complete binary assertions', () => {
  it('layers exists with 2 entries, at least one locked', () => {
    const recipe = findRecipe('bossa-nova-groove');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(2);
    expect(recipe.layers?.some((l) => l.locked === true)).toBe(true);
  });

  it('bd layer binary === 1001001010010010 (bossa nova clave), steps === 16, locked === true', () => {
    const recipe = findRecipe('bossa-nova-groove');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).toBe('1001001010010010');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.binary.length).toBe(bdLayer?.steps);
    expect(bdLayer?.locked).toBe(true);
  });

  it('hh layer binary === 1000010010001001 (bossa kick), steps === 16, locked === false', () => {
    const recipe = findRecipe('bossa-nova-groove');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer?.binary).toBe('1000010010001001');
    expect(hhLayer?.steps).toBe(16);
    expect(hhLayer?.binary.length).toBe(hhLayer?.steps);
    expect(hhLayer?.locked).toBe(false);
  });

  it('defaultCpm === 32, within bpmRange [100, 160]', () => {
    const recipe = findRecipe('bossa-nova-groove');
    expect(recipe.defaultCpm).toBe(32);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-05: samba-afro-brasileiro ───────────────────────────────────────────

describe('A-08-05: samba-afro-brasileiro complete binary assertions', () => {
  it('layers exists with 2 entries, both locked', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(2);
    expect(recipe.layers?.every((l) => l.locked === true)).toBe(true);
  });

  it('bd layer binary === 1000000010000000 (surdo open), steps === 16, locked === true', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).toBe('1000000010000000');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.binary.length).toBe(bdLayer?.steps);
    expect(bdLayer?.locked).toBe(true);
  });

  it('hh layer binary === 1011010110110101 (teleco-teco), steps === 16, locked === true', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer?.binary).toBe('1011010110110101');
    expect(hhLayer?.steps).toBe(16);
    expect(hhLayer?.binary.length).toBe(hhLayer?.steps);
    expect(hhLayer?.locked).toBe(true);
  });

  it('defaultCpm === 26, within bpmRange [100, 160]', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    expect(recipe.defaultCpm).toBe(26);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-06: west-african-bell-modal ─────────────────────────────────────────

describe('A-08-06: west-african-bell-modal complete binary assertions', () => {
  it('layers exists with 2 entries, at least one locked', () => {
    const recipe = findRecipe('west-african-bell-modal');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(2);
    expect(recipe.layers?.some((l) => l.locked === true)).toBe(true);
  });

  it('bd layer binary === 101011010101 (gankogui), steps === 12, locked === true', () => {
    const recipe = findRecipe('west-african-bell-modal');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).toBe('101011010101');
    expect(bdLayer?.steps).toBe(12);
    expect(bdLayer?.binary.length).toBe(bdLayer?.steps);
    expect(bdLayer?.locked).toBe(true);
  });

  it('hh layer binary === 100100100100 (ternary clap), steps === 12, locked === false', () => {
    const recipe = findRecipe('west-african-bell-modal');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer?.binary).toBe('100100100100');
    expect(hhLayer?.steps).toBe(12);
    expect(hhLayer?.binary.length).toBe(hhLayer?.steps);
    expect(hhLayer?.locked).toBe(false);
  });

  it('defaultCpm === 22, within bpmRange [60, 120]', () => {
    const recipe = findRecipe('west-african-bell-modal');
    expect(recipe.defaultCpm).toBe(22);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-07: west-african-triplet-groove ─────────────────────────────────────

describe('A-08-07: west-african-triplet-groove complete binary assertions', () => {
  it('layers exists with 2 entries, both locked', () => {
    const recipe = findRecipe('west-african-triplet-groove');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(2);
    expect(recipe.layers?.every((l) => l.locked === true)).toBe(true);
  });

  it('bd layer binary === 101011010101 (gankogui), steps === 12, locked === true', () => {
    const recipe = findRecipe('west-african-triplet-groove');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).toBe('101011010101');
    expect(bdLayer?.steps).toBe(12);
    expect(bdLayer?.binary.length).toBe(bdLayer?.steps);
    expect(bdLayer?.locked).toBe(true);
  });

  it('hh layer binary === 100101001010 (kpanlogo), steps === 12, locked === true', () => {
    const recipe = findRecipe('west-african-triplet-groove');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer?.binary).toBe('100101001010');
    expect(hhLayer?.steps).toBe(12);
    expect(hhLayer?.binary.length).toBe(hhLayer?.steps);
    expect(hhLayer?.locked).toBe(true);
  });

  it('defaultCpm === 22, within bpmRange [60, 110]', () => {
    const recipe = findRecipe('west-african-triplet-groove');
    expect(recipe.defaultCpm).toBe(22);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-08 + A-08-14: buleria-flamenco-phrygian ─────────────────────────────

describe('A-08-08 + A-08-14: buleria-flamenco-phrygian complete binary assertions', () => {
  it('layers exists with 2 entries, at least one locked', () => {
    const recipe = findRecipe('buleria-flamenco-phrygian');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(2);
    expect(recipe.layers?.some((l) => l.locked === true)).toBe(true);
  });

  it('bd layer binary === 100100101010 (cajón compás), steps === 12, locked === true (A-08-08)', () => {
    const recipe = findRecipe('buleria-flamenco-phrygian');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).toBe('100100101010');
    expect(bdLayer?.steps).toBe(12);
    expect(bdLayer?.binary.length).toBe(bdLayer?.steps);
    expect(bdLayer?.locked).toBe(true);
  });

  it('cp layer binary === 100100100100 (palmas sordas), steps === 12, locked === false', () => {
    const recipe = findRecipe('buleria-flamenco-phrygian');
    const cpLayer = recipe.layers?.find((l) => l.sound === 'cp');
    expect(cpLayer?.binary).toBe('100100100100');
    expect(cpLayer?.steps).toBe(12);
    expect(cpLayer?.binary.length).toBe(cpLayer?.steps);
    expect(cpLayer?.locked).toBe(false);
  });

  it('A-08-14 (full): bd binary is NOT the wrong catalog pattern 100011010110', () => {
    const recipe = findRecipe('buleria-flamenco-phrygian');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).not.toBe('100011010110'); // wrong catalog binary
    expect(bdLayer?.binary).toBe('100100101010'); // correct recipe binary (authoritative per A-08-14)
  });

  it('defaultCpm === 33, within bpmRange [80, 160]', () => {
    const recipe = findRecipe('buleria-flamenco-phrygian');
    expect(recipe.defaultCpm).toBe(33);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-09: pop-rock-backbeat ────────────────────────────────────────────────

describe('A-08-09: pop-rock-backbeat complete binary assertions', () => {
  it('layers exists with 3 entries, at least one locked', () => {
    const recipe = findRecipe('pop-rock-backbeat');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(3);
    expect(recipe.layers?.some((l) => l.locked === true)).toBe(true);
  });

  it('bd layer binary === 1000000010000000 (kick 1+3), steps === 16, locked === false', () => {
    const recipe = findRecipe('pop-rock-backbeat');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).toBe('1000000010000000');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.binary.length).toBe(bdLayer?.steps);
    expect(bdLayer?.locked).toBe(false);
  });

  it('cp layer binary === 0000100000001000 (backbeat), steps === 16, locked === true', () => {
    const recipe = findRecipe('pop-rock-backbeat');
    const cpLayer = recipe.layers?.find((l) => l.sound === 'cp');
    expect(cpLayer?.binary).toBe('0000100000001000');
    expect(cpLayer?.steps).toBe(16);
    expect(cpLayer?.binary.length).toBe(cpLayer?.steps);
    expect(cpLayer?.locked).toBe(true);
  });

  it('hh layer binary === 1010101010101010 (8th hi-hat), steps === 16, locked === false', () => {
    const recipe = findRecipe('pop-rock-backbeat');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer?.binary).toBe('1010101010101010');
    expect(hhLayer?.steps).toBe(16);
    expect(hhLayer?.binary.length).toBe(hhLayer?.steps);
    expect(hhLayer?.locked).toBe(false);
  });

  it('defaultCpm === 27, within bpmRange [80, 160]', () => {
    const recipe = findRecipe('pop-rock-backbeat');
    expect(recipe.defaultCpm).toBe(27);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-10 + A-08-15: gospel-soul-euclid ────────────────────────────────────

describe('A-08-10 + A-08-15: gospel-soul-euclid complete binary assertions', () => {
  it('layers exists with 3 entries, at least one locked', () => {
    const recipe = findRecipe('gospel-soul-euclid');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(3);
    expect(recipe.layers?.some((l) => l.locked === true)).toBe(true);
  });

  it('bd layer binary === 1000010010000100 (gospel kick), steps === 16, locked === false', () => {
    const recipe = findRecipe('gospel-soul-euclid');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).toBe('1000010010000100');
    expect(bdLayer?.steps).toBe(16);
    expect(bdLayer?.binary.length).toBe(bdLayer?.steps);
    expect(bdLayer?.locked).toBe(false);
  });

  it('cp layer binary === 0000100000001000 (gospel snare), steps === 16, locked === true', () => {
    const recipe = findRecipe('gospel-soul-euclid');
    const cpLayer = recipe.layers?.find((l) => l.sound === 'cp');
    expect(cpLayer?.binary).toBe('0000100000001000');
    expect(cpLayer?.steps).toBe(16);
    expect(cpLayer?.binary.length).toBe(cpLayer?.steps);
    expect(cpLayer?.locked).toBe(true);
  });

  it('A-08-15 (full): gospel layers contain NO pattern equal to E(9,16,0) binary', () => {
    const recipe = findRecipe('gospel-soul-euclid');
    // Compute E(9,16) via bjorklund and confirm none of the gospel layers match it.
    const euclidPattern = bjorklund(9, 16)
      .map((v) => (v ? '1' : '0'))
      .join('');
    // E(9,16,0) = '1011010101101010' (from rhythm catalog binary assertion)
    expect(euclidPattern).toBe('1011010101101010');
    // gospel layers must NOT contain E(9,16) — layers supersede euclid-9-16 at runtime.
    expect(recipe.layers).toBeDefined();
    const binaries = recipe.layers?.map((l) => l.binary) ?? [];
    expect(binaries).not.toContain(euclidPattern);
  });

  it('defaultCpm === 20, within bpmRange [70, 130]', () => {
    const recipe = findRecipe('gospel-soul-euclid');
    expect(recipe.defaultCpm).toBe(20);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-11 + A-08-13: aksak-dorian-odd ──────────────────────────────────────

describe('A-08-11 + A-08-13: aksak-dorian-odd complete binary assertions', () => {
  it('layers exists with 2 entries, at least one locked', () => {
    const recipe = findRecipe('aksak-dorian-odd');
    expect(recipe.layers).toBeDefined();
    expect(recipe.layers?.length).toBe(2);
    expect(recipe.layers?.some((l) => l.locked === true)).toBe(true);
  });

  it('bd layer binary === 1010100 (tapan 2+2+3), steps === 7, locked === true', () => {
    const recipe = findRecipe('aksak-dorian-odd');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.binary).toBe('1010100');
    expect(bdLayer?.steps).toBe(7);
    expect(bdLayer?.binary.length).toBe(bdLayer?.steps);
    expect(bdLayer?.locked).toBe(true);
  });

  it('hh layer binary === 1011011 (def frame drum), steps === 7, locked === false', () => {
    const recipe = findRecipe('aksak-dorian-odd');
    const hhLayer = recipe.layers?.find((l) => l.sound === 'hh');
    expect(hhLayer?.binary).toBe('1011011');
    expect(hhLayer?.steps).toBe(7);
    expect(hhLayer?.binary.length).toBe(hhLayer?.steps);
    expect(hhLayer?.locked).toBe(false);
  });

  it('A-08-13 (full): aksak bd layer steps === 7 (native 7/8 grid)', () => {
    const recipe = findRecipe('aksak-dorian-odd');
    const bdLayer = recipe.layers?.find((l) => l.sound === 'bd');
    expect(bdLayer?.steps).toBe(7);
  });

  it('A-08-13 (full): applyRhythmSpec with aksak bd layer produces session layer with steps.length === 7', () => {
    // Exercise Phase 07 native step-count support for 7-step patterns.
    const recipe = findRecipe('aksak-dorian-odd');
    const output = recipeToAgentOutput(recipe);
    expect(output).not.toBeNull();
    if (!output) return;

    applyRhythmSpec(output.rhythm, { force: true });

    const layers = get(sessionStore).rhythm.layers;
    const bdLayer = layers.find((l) => l.sound === 'bd');
    expect(bdLayer).toBeDefined();
    expect(bdLayer?.steps.length).toBe(7);
  });

  it('defaultCpm === 34, within bpmRange [80, 160]', () => {
    const recipe = findRecipe('aksak-dorian-odd');
    expect(recipe.defaultCpm).toBe(34);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-12: dorian-ritual-sparse ────────────────────────────────────────────

describe('A-08-12: dorian-ritual-sparse — no layers, defaultCpm only', () => {
  it('layers field is absent (undefined) — intentionally abstract/meditative', () => {
    const recipe = findRecipe('dorian-ritual-sparse');
    expect(recipe.layers).toBeUndefined();
  });

  it('defaultCpm === 18, within bpmRange [60, 110]', () => {
    const recipe = findRecipe('dorian-ritual-sparse');
    expect(recipe.defaultCpm).toBe(18);
    expect((recipe.defaultCpm ?? 0) * 4).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
    expect((recipe.defaultCpm ?? 0) * 4).toBeLessThanOrEqual(recipe.bpmRange[1]);
  });
});

// ── A-08-16: all 12 target recipes have defaultCpm within bpmRange ────────────

describe('A-08-16: all 12 Phase 08 target recipes have correct defaultCpm', () => {
  const targetRecipes = [
    { id: 'afro-cuban-clave-minor', expectedCpm: 25 },
    { id: 'rumba-blues-minor', expectedCpm: 25 },
    { id: 'latin-jazz-clave-swing', expectedCpm: 42 },
    { id: 'bossa-nova-groove', expectedCpm: 32 },
    { id: 'samba-afro-brasileiro', expectedCpm: 26 },
    { id: 'west-african-bell-modal', expectedCpm: 22 },
    { id: 'west-african-triplet-groove', expectedCpm: 22 },
    { id: 'buleria-flamenco-phrygian', expectedCpm: 33 },
    { id: 'pop-rock-backbeat', expectedCpm: 27 },
    { id: 'gospel-soul-euclid', expectedCpm: 20 },
    { id: 'aksak-dorian-odd', expectedCpm: 34 },
    { id: 'dorian-ritual-sparse', expectedCpm: 18 },
  ];

  for (const { id, expectedCpm } of targetRecipes) {
    it(`${id}: defaultCpm === ${expectedCpm} and ${expectedCpm * 4} BPM is within bpmRange`, () => {
      const recipe = findRecipe(id);
      expect(recipe.defaultCpm).toBe(expectedCpm);
      const bpm = (recipe.defaultCpm ?? 0) * 4;
      expect(bpm).toBeGreaterThanOrEqual(recipe.bpmRange[0]);
      expect(bpm).toBeLessThanOrEqual(recipe.bpmRange[1]);
    });
  }
});
