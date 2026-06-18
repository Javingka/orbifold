// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Unit tests for resolveChordAttrs and the PRESETS lookup table.
// Covers acceptance criteria A-03-10 (exact preset attribute values per ADR 0019
// D4a), A-03-01 (byte-identical baseline when all fields absent), and the
// per-attribute explicit-wins rule (ADR 0019 D3).
//
// Introduced in Phase 03 (harmonic-rhythm-improvements) step 03.3.
// No prototype source — net-new feature (ADR 0019).

import { describe, it, expect } from 'vitest';
import { resolveChordAttrs, PRESET_NAMES, PRESETS } from '../src/core/codegen/presets.js';

// ── PRESET_NAMES ─────────────────────────────────────────────────────────────

describe('PRESET_NAMES', () => {
  it('contains exactly three preset names', () => {
    expect(PRESET_NAMES).toHaveLength(3);
  });

  it('contains piano, guitar, synth-bass', () => {
    expect(PRESET_NAMES).toContain('piano');
    expect(PRESET_NAMES).toContain('guitar');
    expect(PRESET_NAMES).toContain('synth-bass');
  });
});

// ── A-03-01: byte-identical baseline ─────────────────────────────────────────
// When all fields are absent (undefined) and no preset is set,
// resolveChordAttrs returns the hardcoded defaults so codegen output is
// byte-identical to the pre-Phase-03 strings.

describe('resolveChordAttrs — byte-identical baseline (A-03-01)', () => {
  it('empty chord attrs → instrument sawtooth', () => {
    const resolved = resolveChordAttrs({});
    expect(resolved.instrument).toBe('sawtooth');
  });

  it('empty chord attrs → lpf 1200', () => {
    const resolved = resolveChordAttrs({});
    expect(resolved.lpf).toBe(1200);
  });

  it('empty chord attrs, roomDefault 0.25 → room 0.25 (chordToStrudel callsite)', () => {
    const resolved = resolveChordAttrs({}, 0.25);
    expect(resolved.room).toBe(0.25);
  });

  it('empty chord attrs, roomDefault 0.3 → room 0.3 (melodyLine callsite)', () => {
    const resolved = resolveChordAttrs({}, 0.3);
    expect(resolved.room).toBe(0.3);
  });

  it('empty chord attrs → attack undefined (no .attack() emitted)', () => {
    const resolved = resolveChordAttrs({});
    expect(resolved.attack).toBeUndefined();
  });

  it('empty chord attrs → decay undefined (no .decay() emitted)', () => {
    const resolved = resolveChordAttrs({});
    expect(resolved.decay).toBeUndefined();
  });

  it('empty chord attrs → sustain undefined', () => {
    const resolved = resolveChordAttrs({});
    expect(resolved.sustain).toBeUndefined();
  });

  it('empty chord attrs → release undefined', () => {
    const resolved = resolveChordAttrs({});
    expect(resolved.release).toBeUndefined();
  });

  it('empty chord attrs → lpenv undefined', () => {
    const resolved = resolveChordAttrs({});
    expect(resolved.lpenv).toBeUndefined();
  });

  it('empty chord attrs → lpa undefined', () => {
    const resolved = resolveChordAttrs({});
    expect(resolved.lpa).toBeUndefined();
  });

  it('empty chord attrs → lpd undefined', () => {
    const resolved = resolveChordAttrs({});
    expect(resolved.lpd).toBeUndefined();
  });

  it('empty chord attrs → lpq undefined', () => {
    const resolved = resolveChordAttrs({});
    expect(resolved.lpq).toBeUndefined();
  });
});

// ── A-03-10: Piano preset exact values ────────────────────────────────────────

describe('resolveChordAttrs — Piano preset (A-03-10)', () => {
  it('piano → instrument triangle', () => {
    expect(resolveChordAttrs({ preset: 'piano' }).instrument).toBe('triangle');
  });

  it('piano → attack 0.02', () => {
    expect(resolveChordAttrs({ preset: 'piano' }).attack).toBe(0.02);
  });

  it('piano → decay 0.4', () => {
    expect(resolveChordAttrs({ preset: 'piano' }).decay).toBe(0.4);
  });

  it('piano → sustain 0.1', () => {
    expect(resolveChordAttrs({ preset: 'piano' }).sustain).toBe(0.1);
  });

  it('piano → release 0.3', () => {
    expect(resolveChordAttrs({ preset: 'piano' }).release).toBe(0.3);
  });

  it('piano → lpf 1800', () => {
    expect(resolveChordAttrs({ preset: 'piano' }).lpf).toBe(1800);
  });

  it('piano → room 0.4', () => {
    expect(resolveChordAttrs({ preset: 'piano' }).room).toBe(0.4);
  });

  it('piano → lpenv undefined (absent from preset)', () => {
    expect(resolveChordAttrs({ preset: 'piano' }).lpenv).toBeUndefined();
  });

  it('piano → lpa undefined (absent from preset)', () => {
    expect(resolveChordAttrs({ preset: 'piano' }).lpa).toBeUndefined();
  });

  it('piano → lpd undefined (absent from preset)', () => {
    expect(resolveChordAttrs({ preset: 'piano' }).lpd).toBeUndefined();
  });

  it('piano → lpq undefined (absent from preset)', () => {
    expect(resolveChordAttrs({ preset: 'piano' }).lpq).toBeUndefined();
  });
});

// ── A-03-10: Guitar preset exact values ───────────────────────────────────────

describe('resolveChordAttrs — Guitar preset (A-03-10)', () => {
  it('guitar → instrument sawtooth', () => {
    expect(resolveChordAttrs({ preset: 'guitar' }).instrument).toBe('sawtooth');
  });

  it('guitar → attack 0.01', () => {
    expect(resolveChordAttrs({ preset: 'guitar' }).attack).toBe(0.01);
  });

  it('guitar → decay 0.3', () => {
    expect(resolveChordAttrs({ preset: 'guitar' }).decay).toBe(0.3);
  });

  it('guitar → sustain 0.0', () => {
    expect(resolveChordAttrs({ preset: 'guitar' }).sustain).toBe(0.0);
  });

  it('guitar → release undefined (absent from preset)', () => {
    expect(resolveChordAttrs({ preset: 'guitar' }).release).toBeUndefined();
  });

  it('guitar → lpf 2500', () => {
    expect(resolveChordAttrs({ preset: 'guitar' }).lpf).toBe(2500);
  });

  it('guitar → lpenv 3', () => {
    expect(resolveChordAttrs({ preset: 'guitar' }).lpenv).toBe(3);
  });

  it('guitar → lpa 0.01', () => {
    expect(resolveChordAttrs({ preset: 'guitar' }).lpa).toBe(0.01);
  });

  it('guitar → lpd 0.25', () => {
    expect(resolveChordAttrs({ preset: 'guitar' }).lpd).toBe(0.25);
  });

  it('guitar → lpq undefined (absent from preset)', () => {
    expect(resolveChordAttrs({ preset: 'guitar' }).lpq).toBeUndefined();
  });

  it('guitar → room 0.15', () => {
    expect(resolveChordAttrs({ preset: 'guitar' }).room).toBe(0.15);
  });
});

// ── A-03-10: Synth-bass preset exact values ───────────────────────────────────

describe('resolveChordAttrs — Synth-bass preset (A-03-10)', () => {
  it('synth-bass → instrument sawtooth', () => {
    expect(resolveChordAttrs({ preset: 'synth-bass' }).instrument).toBe('sawtooth');
  });

  it('synth-bass → attack 0.06', () => {
    expect(resolveChordAttrs({ preset: 'synth-bass' }).attack).toBe(0.06);
  });

  it('synth-bass → decay undefined (absent from preset)', () => {
    expect(resolveChordAttrs({ preset: 'synth-bass' }).decay).toBeUndefined();
  });

  it('synth-bass → sustain 0.8', () => {
    expect(resolveChordAttrs({ preset: 'synth-bass' }).sustain).toBe(0.8);
  });

  it('synth-bass → release 0.5', () => {
    expect(resolveChordAttrs({ preset: 'synth-bass' }).release).toBe(0.5);
  });

  it('synth-bass → lpf 600', () => {
    expect(resolveChordAttrs({ preset: 'synth-bass' }).lpf).toBe(600);
  });

  it('synth-bass → lpq 2', () => {
    expect(resolveChordAttrs({ preset: 'synth-bass' }).lpq).toBe(2);
  });

  it('synth-bass → room 0.2', () => {
    expect(resolveChordAttrs({ preset: 'synth-bass' }).room).toBe(0.2);
  });

  it('synth-bass → lpenv undefined (absent from preset)', () => {
    expect(resolveChordAttrs({ preset: 'synth-bass' }).lpenv).toBeUndefined();
  });

  it('synth-bass → lpa undefined (absent from preset)', () => {
    expect(resolveChordAttrs({ preset: 'synth-bass' }).lpa).toBeUndefined();
  });

  it('synth-bass → lpd undefined (absent from preset)', () => {
    expect(resolveChordAttrs({ preset: 'synth-bass' }).lpd).toBeUndefined();
  });
});

// ── A-03-10 / D3: Per-attribute explicit-wins override rule ───────────────────
// ADR 0019 D3: explicit chord field wins for that attribute, even when a preset
// is also set. All other attributes remain at their preset values.

describe('resolveChordAttrs — per-attribute explicit-wins (ADR 0019 D3)', () => {
  // The canonical test case from ADR 0019 D3 documentation:
  // { preset: 'piano', instrument: 'sine' } → instrument 'sine' (explicit wins),
  // all other attrs from Piano preset.
  it('{ preset: piano, instrument: sine } → instrument sine (explicit wins)', () => {
    const resolved = resolveChordAttrs({ preset: 'piano', instrument: 'sine' });
    expect(resolved.instrument).toBe('sine');
  });

  it('{ preset: piano, instrument: sine } → attack still Piano 0.02', () => {
    const resolved = resolveChordAttrs({ preset: 'piano', instrument: 'sine' });
    expect(resolved.attack).toBe(0.02);
  });

  it('{ preset: piano, instrument: sine } → lpf still Piano 1800', () => {
    const resolved = resolveChordAttrs({ preset: 'piano', instrument: 'sine' });
    expect(resolved.lpf).toBe(1800);
  });

  it('{ preset: piano, instrument: sine } → room still Piano 0.4', () => {
    const resolved = resolveChordAttrs({ preset: 'piano', instrument: 'sine' });
    expect(resolved.room).toBe(0.4);
  });

  it('{ preset: guitar, instrument: pink } → instrument pink (noise token, explicit wins)', () => {
    const resolved = resolveChordAttrs({ preset: 'guitar', instrument: 'pink' });
    expect(resolved.instrument).toBe('pink');
    // Guitar's lpf/room/envelope attrs are still applied.
    expect(resolved.lpf).toBe(2500);
    expect(resolved.room).toBe(0.15);
    expect(resolved.lpenv).toBe(3);
  });

  it('{ preset: synth-bass, lpf: 800 } → lpf 800 (explicit overrides preset 600)', () => {
    const resolved = resolveChordAttrs({ preset: 'synth-bass', lpf: 800 });
    expect(resolved.lpf).toBe(800);
    // Other synth-bass attrs preserved.
    expect(resolved.sustain).toBe(0.8);
    expect(resolved.lpq).toBe(2);
  });

  it('{ preset: piano, decay: 0.2 } → decay 0.2 (explicit overrides preset 0.4)', () => {
    const resolved = resolveChordAttrs({ preset: 'piano', decay: 0.2 });
    expect(resolved.decay).toBe(0.2);
    // Other Piano attrs preserved.
    expect(resolved.attack).toBe(0.02);
    expect(resolved.lpf).toBe(1800);
  });

  it('{ preset: guitar, room: 0.5 } → room 0.5 (explicit overrides preset 0.15)', () => {
    const resolved = resolveChordAttrs({ preset: 'guitar', room: 0.5 });
    expect(resolved.room).toBe(0.5);
  });

  it('no preset, explicit instrument → uses explicit instrument', () => {
    const resolved = resolveChordAttrs({ instrument: 'triangle' });
    expect(resolved.instrument).toBe('triangle');
    // Falls through to defaults for everything else.
    expect(resolved.lpf).toBe(1200);
  });

  it('no preset, explicit lpf → uses explicit lpf', () => {
    const resolved = resolveChordAttrs({ lpf: 900 });
    expect(resolved.lpf).toBe(900);
    expect(resolved.instrument).toBe('sawtooth');
  });
});

// ── Unknown or undefined preset gracefully ignored ────────────────────────────

describe('resolveChordAttrs — unknown/undefined preset', () => {
  it('unknown preset string → falls through to hardcoded defaults', () => {
    // An unknown preset name (not in PRESETS) should not crash; fall through.
    const resolved = resolveChordAttrs({ preset: 'unknown-preset' as 'piano' });
    expect(resolved.instrument).toBe('sawtooth');
    expect(resolved.lpf).toBe(1200);
  });

  it('preset undefined → hardcoded defaults', () => {
    const resolved = resolveChordAttrs({ preset: undefined });
    expect(resolved.instrument).toBe('sawtooth');
    expect(resolved.lpf).toBe(1200);
    expect(resolved.attack).toBeUndefined();
  });
});

// ── PRESETS lookup table structure ───────────────────────────────────────────

describe('PRESETS lookup table', () => {
  it('has entries for all three preset names', () => {
    expect('piano' in PRESETS).toBe(true);
    expect('guitar' in PRESETS).toBe(true);
    expect('synth-bass' in PRESETS).toBe(true);
  });

  it('Piano entry matches ADR 0019 D4a table', () => {
    const p = PRESETS.piano;
    expect(p.instrument).toBe('triangle');
    expect(p.attack).toBe(0.02);
    expect(p.decay).toBe(0.4);
    expect(p.sustain).toBe(0.1);
    expect(p.release).toBe(0.3);
    expect(p.lpf).toBe(1800);
    expect(p.room).toBe(0.4);
  });

  it('Guitar entry matches ADR 0019 D4a table', () => {
    const g = PRESETS.guitar;
    expect(g.instrument).toBe('sawtooth');
    expect(g.attack).toBe(0.01);
    expect(g.decay).toBe(0.3);
    expect(g.sustain).toBe(0.0);
    expect(g.lpf).toBe(2500);
    expect(g.lpenv).toBe(3);
    expect(g.lpa).toBe(0.01);
    expect(g.lpd).toBe(0.25);
    expect(g.room).toBe(0.15);
  });

  it('Synth-bass entry matches ADR 0019 D4a table', () => {
    const s = PRESETS['synth-bass'];
    expect(s.instrument).toBe('sawtooth');
    expect(s.attack).toBe(0.06);
    expect(s.sustain).toBe(0.8);
    expect(s.release).toBe(0.5);
    expect(s.lpf).toBe(600);
    expect(s.lpq).toBe(2);
    expect(s.room).toBe(0.2);
  });
});
