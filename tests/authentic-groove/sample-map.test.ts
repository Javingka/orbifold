// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — catalog tests for per-genre sampleMap (ADR 0025 D2).
// Verifies that:
//   1. Every in-scope genre recipe has a defined sampleMap with non-empty values.
//   2. Every sampleMap key is a valid Sound value.
//   3. Every sampleMap value appears in the verified sample list (inventory §2).
//   4. Generic recipes have sampleMap === undefined (A-01-01 partial).

import { describe, it, expect } from 'vitest';
import { RHYTHM_HARMONY_RECIPES } from '../../src/core/music-knowledge/rhythm-harmony-recipes.js';
import type { Sound } from '../../src/core/rhythm/layers.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Complete Sound union values (from src/core/rhythm/layers.ts).
 * Used to validate sampleMap keys.
 */
const VALID_SOUNDS: readonly Sound[] = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'mt', 'ht'];

/**
 * Verified sample names from tidalcycles/Dirt-Samples strudel.json (2026-06-23).
 * Encoded as a fixture so assertions are self-contained (inventory §2).
 * These are the ONLY names that may appear as sampleMap values.
 */
const VERIFIED_SAMPLE_NAMES: readonly string[] = [
  'bd',
  'sd',
  'hh',
  'oh',
  'cp',
  'rim',
  'lt',
  'mt',
  'ht',
  'perc',
  'cb',
  'sh',
  'tb',
  'tabla',
  'tabla2',
  'east',
  'hand',
  // Phase 04 FreePats CC0 additions (ADR 0025 D6, inventory §4):
  'conga', // FreePats Conga — membrane drum (cumbia caja, candombe chico)
  'cajon', // FreePats CajonFlamenco — canonical flamenco percussion
  'wood', // FreePats Claves — authentic clave idiophone (rumba clave pattern)
];

// ── Genre recipes that must have a sampleMap ─────────────────────────────────
//
// Per Pilot OD resolutions and inventory §2.3 / §4:
//   west-african-bell-modal          → { bd: 'cb', hh: 'perc' }
//   west-african-triplet-groove      → { bd: 'cb', hh: 'perc' }
//   latin-jazz-clave-swing           → { bd: 'bd', hh: 'cb' }
//   rumba-blues-minor                → { bd: 'wood' }   // Phase 04 upgrade: perc → wood (FreePats Claves)
//   samba-afro-brasileiro            → { bd: 'bd', hh: 'sd' }
//   bossa-nova-groove                → { bd: 'bd', hh: 'hand' }  // Phase 03 upgrade: sd → hand
//   cumbia-latina-groove             → { bd: 'conga' }  // Phase 04 upgrade: perc → conga (FreePats Conga)
//   candombe-dorian-groove           → { bd: 'conga' }  // Phase 04 upgrade: perc → conga (FreePats Conga)
//   buleria-flamenco-phrygian        → { bd: 'cajon' }  // Phase 04 upgrade: perc → cajon (FreePats CajonFlamenco)

const GENRE_RECIPE_IDS_WITH_SAMPLE_MAP = [
  'west-african-bell-modal',
  'west-african-triplet-groove',
  'latin-jazz-clave-swing',
  'rumba-blues-minor',
  'samba-afro-brasileiro',
  'bossa-nova-groove',
  'cumbia-latina-groove',
  'candombe-dorian-groove',
  'buleria-flamenco-phrygian',
] as const;

// ── Generic recipes that must NOT have a sampleMap ───────────────────────────

const GENERIC_RECIPE_IDS_WITHOUT_SAMPLE_MAP = [
  'dorian-ritual-sparse',
  'pop-rock-backbeat',
  'aksak-dorian-odd',
  'gospel-soul-euclid',
  'cueca-chilena-folk',
  'afro-cuban-clave-minor',
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function findRecipe(id: string) {
  const recipe = RHYTHM_HARMONY_RECIPES.find((r) => r.id === id);
  if (!recipe) throw new Error(`Recipe '${id}' not found in RHYTHM_HARMONY_RECIPES`);
  return recipe;
}

// ── Tests: genre recipes have a defined sampleMap ────────────────────────────

describe('sampleMap — genre recipes must have a defined sampleMap', () => {
  for (const id of GENRE_RECIPE_IDS_WITH_SAMPLE_MAP) {
    it(`${id}: sampleMap is defined`, () => {
      const recipe = findRecipe(id);
      expect(recipe.sampleMap).toBeDefined();
    });

    it(`${id}: sampleMap has at least one entry`, () => {
      const recipe = findRecipe(id);
      const map = recipe.sampleMap ?? {};
      expect(Object.keys(map).length).toBeGreaterThan(0);
    });

    it(`${id}: every sampleMap value is a non-empty string`, () => {
      const recipe = findRecipe(id);
      const map = recipe.sampleMap ?? {};
      for (const [key, value] of Object.entries(map)) {
        expect(typeof value, `key '${key}' must be a string`).toBe('string');
        expect((value as string).length, `key '${key}' must be non-empty`).toBeGreaterThan(0);
      }
    });
  }
});

// ── Tests: every sampleMap key is a valid Sound ───────────────────────────────

describe('sampleMap — every key must be a valid Sound value', () => {
  for (const id of GENRE_RECIPE_IDS_WITH_SAMPLE_MAP) {
    it(`${id}: all keys are valid Sound values`, () => {
      const recipe = findRecipe(id);
      const map = recipe.sampleMap ?? {};
      for (const key of Object.keys(map)) {
        expect(VALID_SOUNDS, `key '${key}' is not a valid Sound`).toContain(key as Sound);
      }
    });
  }
});

// ── Tests: every sampleMap value appears in VERIFIED_SAMPLE_NAMES ─────────────

describe('sampleMap — every value must be in the verified sample list', () => {
  for (const id of GENRE_RECIPE_IDS_WITH_SAMPLE_MAP) {
    it(`${id}: all values are in the verified sample list`, () => {
      const recipe = findRecipe(id);
      const map = recipe.sampleMap ?? {};
      for (const [key, value] of Object.entries(map)) {
        expect(
          VERIFIED_SAMPLE_NAMES,
          `value '${value}' for key '${key}' is not in the verified sample list`
        ).toContain(value);
      }
    });
  }
});

// ── Tests: specific per-genre sampleMap values (A-01-01 partial) ─────────────

describe('sampleMap — per-genre value assertions', () => {
  it('west-african-bell-modal: bd → cb (cowbell for bell), hh → perc', () => {
    const recipe = findRecipe('west-african-bell-modal');
    expect(recipe.sampleMap).toEqual({ bd: 'cb', hh: 'perc' });
  });

  it('west-african-triplet-groove: bd → cb (cowbell for bell), hh → perc', () => {
    const recipe = findRecipe('west-african-triplet-groove');
    expect(recipe.sampleMap).toEqual({ bd: 'cb', hh: 'perc' });
  });

  it('latin-jazz-clave-swing: bd → bd, hh → cb (cowbell for cascara shell)', () => {
    const recipe = findRecipe('latin-jazz-clave-swing');
    expect(recipe.sampleMap).toEqual({ bd: 'bd', hh: 'cb' });
  });

  it('rumba-blues-minor: bd → wood (FreePats Claves — authentic clave idiophone, Phase 04 upgrade)', () => {
    const recipe = findRecipe('rumba-blues-minor');
    expect(recipe.sampleMap).toEqual({ bd: 'wood' });
  });

  it('samba-afro-brasileiro: bd → bd, hh → sd (sd for caixa snare character)', () => {
    const recipe = findRecipe('samba-afro-brasileiro');
    expect(recipe.sampleMap).toEqual({ bd: 'bd', hh: 'sd' });
  });

  it('bossa-nova-groove: bd → bd, hh → hand (hand percussion approximates pandeiro — Phase 03 upgrade)', () => {
    const recipe = findRecipe('bossa-nova-groove');
    expect(recipe.sampleMap).toEqual({ bd: 'bd', hh: 'hand' });
  });

  it('cumbia-latina-groove: bd → conga (FreePats Conga — closest membrane drum to cumbia caja, Phase 04 upgrade)', () => {
    const recipe = findRecipe('cumbia-latina-groove');
    expect(recipe.sampleMap).toEqual({ bd: 'conga' });
  });

  it('candombe-dorian-groove: bd → conga (FreePats Conga — closest to candombe membrane drum, Phase 04 upgrade)', () => {
    const recipe = findRecipe('candombe-dorian-groove');
    expect(recipe.sampleMap).toEqual({ bd: 'conga' });
  });

  it('buleria-flamenco-phrygian: bd → cajon (FreePats CajonFlamenco — canonical flamenco percussion, Phase 04 upgrade)', () => {
    const recipe = findRecipe('buleria-flamenco-phrygian');
    expect(recipe.sampleMap).toEqual({ bd: 'cajon' });
  });
});

// ── Tests: generic recipes have sampleMap === undefined ───────────────────────

describe('sampleMap — generic recipes must have sampleMap === undefined', () => {
  for (const id of GENERIC_RECIPE_IDS_WITHOUT_SAMPLE_MAP) {
    it(`${id}: sampleMap is undefined`, () => {
      const recipe = findRecipe(id);
      expect(recipe.sampleMap).toBeUndefined();
    });
  }
});
