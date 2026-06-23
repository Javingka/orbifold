// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — plumbing tests for strudelSample codegen override (ADR 0025 D1).
// Verifies that rhythmLayerToStrudelLine emits strudelSample ?? sound
// in both the euclid and steps code paths, and that layers without
// strudelSample are byte-identical to pre-Phase-01 output (A-01-03).

import { describe, it, expect } from 'vitest';
import { rhythmLayerToStrudelLine } from '../../src/core/rhythm/layers.js';
import type { RhythmLayer } from '../../src/core/rhythm/layers.js';

// ── Euclid path ───────────────────────────────────────────────────────────
// A-01-03 (partial): euclid path with strudelSample emits the override name.

describe('rhythmLayerToStrudelLine — euclid path with strudelSample', () => {
  it('emits strudelSample instead of sound in euclid notation', () => {
    // Generic sound is 'bd'; strudelSample overrides to 'conga' (abstract test name).
    const layer: RhythmLayer = {
      sound: 'bd',
      steps: [],
      euclid: '3,8',
      strudelSample: 'conga',
    };
    expect(rhythmLayerToStrudelLine(layer)).toBe('  s("conga(3,8)")');
  });

  it('euclid path with rotation: strudelSample emitted with full euclid string', () => {
    const layer: RhythmLayer = {
      sound: 'hh',
      steps: [],
      euclid: '5,8,2',
      strudelSample: 'rim',
    };
    expect(rhythmLayerToStrudelLine(layer)).toBe('  s("rim(5,8,2)")');
  });

  it('euclid path without strudelSample: emits sound (backward compat — A-01-03)', () => {
    const layer: RhythmLayer = {
      sound: 'hh',
      steps: [],
      euclid: '5,8',
    };
    expect(rhythmLayerToStrudelLine(layer)).toBe('  s("hh(5,8)")');
  });
});

// ── Steps path ────────────────────────────────────────────────────────────
// A-01-03 (partial): steps path with strudelSample uses override at every onset.

describe('rhythmLayerToStrudelLine — steps path with strudelSample', () => {
  it('steps path: strudelSample replaces sound at every onset token', () => {
    // hh slot with strudelSample:'rim' — rests stay '~', onsets use 'rim'.
    const layer: RhythmLayer = {
      sound: 'hh',
      steps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      strudelSample: 'rim',
    };
    const result = rhythmLayerToStrudelLine(layer);
    expect(result).toBe('  s("rim ~ rim ~ rim ~ rim ~ rim ~ rim ~ rim ~ rim ~")');
    // Confirm original sound name does NOT appear in output.
    expect(result).not.toContain('hh');
  });

  it('steps path: onsets use strudelSample, rests stay ~', () => {
    // bd with strudelSample:'perc' at steps 0 and 8.
    const layer: RhythmLayer = {
      sound: 'bd',
      steps: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      strudelSample: 'perc',
    };
    const result = rhythmLayerToStrudelLine(layer);
    expect(result).toBe('  s("perc ~ ~ ~ ~ ~ ~ ~ perc ~ ~ ~ ~ ~ ~ ~")');
    expect(result).not.toContain('bd');
  });

  it('steps path without strudelSample: emits sound (backward compat — A-01-03)', () => {
    const layer: RhythmLayer = {
      sound: 'bd',
      steps: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    };
    expect(rhythmLayerToStrudelLine(layer)).toBe('  s("bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~")');
  });
});

// ── Backward compatibility: no strudelSample → byte-identical output (A-01-03) ──

describe('rhythmLayerToStrudelLine — backward compatibility (A-01-03)', () => {
  it('bd steps layer: no strudelSample → output identical to pre-Phase-01', () => {
    const layer: RhythmLayer = {
      sound: 'bd',
      steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    };
    // Pre-Phase-01 golden: s("bd bd bd bd") — the standard backbeat.
    expect(rhythmLayerToStrudelLine(layer)).toBe('  s("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~")');
  });

  it('hh euclid layer: no strudelSample → output identical to pre-Phase-01', () => {
    const layer: RhythmLayer = {
      sound: 'hh',
      steps: [],
      euclid: '5,8',
    };
    // Pre-Phase-01 golden: s("hh(5,8)").
    expect(rhythmLayerToStrudelLine(layer)).toBe('  s("hh(5,8)")');
  });

  it('strudelSample undefined is equivalent to no strudelSample field', () => {
    const withUndefined: RhythmLayer = {
      sound: 'sd',
      steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      strudelSample: undefined,
    };
    const withoutField: RhythmLayer = {
      sound: 'sd',
      steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    };
    expect(rhythmLayerToStrudelLine(withUndefined)).toBe(rhythmLayerToStrudelLine(withoutField));
  });
});
