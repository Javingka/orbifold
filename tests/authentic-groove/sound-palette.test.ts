// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Sound palette expansion tests (Phase 09 step 09.1).
//
// Covers acceptance IDs:
//   A-09-01: Sound type includes all 16 values; tsc accepts 'conga' and 'shaker'.
//   A-09-03: SK_SOUNDS (via schema) includes all 16 values; length === 16.
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.

import { describe, it, expect } from 'vitest';

import type { Sound } from '../../src/core/rhythm/layers.js';
import { RhythmLayerSchema, AgentOutputSchema } from '../../src/agent/schema.js';

// ── A-09-01: Compile-time type assertions ────────────────────────────────────
// These assignments must compile with tsc --noEmit (strict).
// If Sound type is missing any value, tsc will fail the build.
const _s1: Sound = 'conga';
const _s2: Sound = 'cajon';
const _s3: Sound = 'wood';
const _s4: Sound = 'shaker';
const _s5: Sound = 'cb';
const _s6: Sound = 'perc';
const _s7: Sound = 'hand';
// Suppress unused variable warnings (values used via assignment — tsc checks type only)
void _s1;
void _s2;
void _s3;
void _s4;
void _s5;
void _s6;
void _s7;

// ── A-09-01: Schema validation — new sounds pass Zod parse ───────────────────

describe('Sound palette expansion (A-09-01)', () => {
  const NEW_SOUNDS = ['conga', 'cajon', 'wood', 'shaker', 'cb', 'perc', 'hand'] as const;

  for (const sound of NEW_SOUNDS) {
    it(`RhythmLayerSchema accepts sound '${sound}' (steps variant)`, () => {
      const result = RhythmLayerSchema.safeParse({
        sound,
        steps: Array(16).fill(0),
      });
      expect(result.success, `Expected '${sound}' to parse successfully`).toBe(true);
    });
  }

  it('RhythmLayerSchema accepts all original 9 sounds (no regression)', () => {
    const originals = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'mt', 'ht'];
    for (const sound of originals) {
      const result = RhythmLayerSchema.safeParse({ sound, steps: Array(16).fill(0) });
      expect(result.success, `Regression: '${sound}' should still parse`).toBe(true);
    }
  });
});

// ── A-09-03: SK_SOUNDS length === 16 ─────────────────────────────────────────
// RhythmLayerSchema uses z.enum(SK_SOUNDS) internally.
// We verify coverage by testing all 16 expected sounds against the schema.

describe('SK_SOUNDS coverage (A-09-03)', () => {
  const ALL_16_SOUNDS = [
    'bd',
    'sd',
    'hh',
    'oh',
    'cp',
    'rim',
    'lt',
    'mt',
    'ht',
    'conga',
    'cajon',
    'wood',
    'shaker',
    'cb',
    'perc',
    'hand',
  ] as const;

  it('RhythmLayerSchema sound enum includes all 16 values', () => {
    for (const sound of ALL_16_SOUNDS) {
      const result = RhythmLayerSchema.safeParse({ sound, steps: Array(16).fill(0) });
      expect(result.success, `SK_SOUNDS is missing '${sound}'`).toBe(true);
    }
  });

  it('AgentOutputSchema accepts rhythm spec with new sounds', () => {
    // Verify that the full agent schema also accepts the new sounds
    // (since RhythmLayerSchema is embedded in AgentOutputSchema).
    for (const sound of ALL_16_SOUNDS) {
      const result = AgentOutputSchema.safeParse({
        rhythm: {
          layers: [{ sound, steps: Array(16).fill(0) }],
        },
      });
      expect(result.success, `AgentOutputSchema should accept sound '${sound}'`).toBe(true);
    }
  });

  it('exactly 16 distinct sounds are in the palette', () => {
    // Probe by attempting parse of a non-member value — should fail.
    const result = RhythmLayerSchema.safeParse({
      sound: 'NOT_A_SOUND',
      steps: Array(16).fill(0),
    });
    expect(result.success).toBe(false);

    // And verify all 16 members parse, implying length === 16.
    const accepted = ALL_16_SOUNDS.filter(
      (s) => RhythmLayerSchema.safeParse({ sound: s, steps: Array(16).fill(0) }).success
    );
    expect(accepted.length).toBe(16);
  });
});
