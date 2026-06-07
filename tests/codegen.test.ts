// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — prototype-parity tests for the codegen engine and composition model.
// All golden values produced by running scripts/extract-golden-01-5.mjs
// (Node execution of extracted prototype functions from reference/orbifold.html
// lines 605–608, 758–773, 833–836, 1470–1476, 1931–1938, 2054–2065).

import { describe, it, expect } from 'vitest';
import {
  tempoWrap,
  chordToStrudel,
  melodyLine,
  rhythmToStrudel,
  buildSession,
} from '../src/core/codegen/strudel.js';
import { stripComments, buildComposition } from '../src/core/composition/model.js';
import type { Block, Track } from '../src/core/composition/model.js';
import { layerAudible } from '../src/core/rhythm/layers.js';
import type { RhythmLayer } from '../src/core/rhythm/layers.js';

// ── tempoWrap ─────────────────────────────────────────────────────────────
// Prototype lines 605–608; corrected per ADR 0005 (setcps, not setcpm).
//
// ADR 0005: setcpm does NOT exist in @strudel/web@1.0.3. The prototype's
// setcpm(bpm/4) was a latent no-op bug (threw ReferenceError on every evaluate;
// fallback stripped the tempo header). The correct function is setcps(bpm/240).
// These tests assert the corrected output; byte-identical parity with the
// prototype would reproduce the defect. Approved deviation — see ADR 0005.

describe('tempoWrap', () => {
  it('wraps code with setcps(0.500000) at BPM 120', () => {
    // bpm/240 = 120/240 = 0.5, toFixed(6) = "0.500000"
    const code = 'stack(\n  s("bd")\n)';
    expect(tempoWrap(code, 120)).toBe('setcps(0.500000)\nstack(\n  s("bd")\n)');
  });

  it('wraps code with setcps(0.375000) at BPM 90', () => {
    // bpm/240 = 90/240 = 0.375, toFixed(6) = "0.375000"
    const code = 'stack(\n  s("bd")\n)';
    expect(tempoWrap(code, 90)).toBe('setcps(0.375000)\nstack(\n  s("bd")\n)');
  });

  it('trims trailing whitespace from code', () => {
    expect(tempoWrap('s("bd")  ', 120)).toBe('setcps(0.500000)\ns("bd")');
  });

  it('uses setcps (ADR 0005) and never uses .fast or .slow', () => {
    const result = tempoWrap('s("bd")', 120);
    expect(result).toContain('setcps(');
    expect(result).not.toContain('.fast');
    expect(result).not.toContain('.slow');
  });
});

// ── chordToStrudel ────────────────────────────────────────────────────────
// Prototype lines 758–763. Golden via Node execution.

describe('chordToStrudel', () => {
  it('C major block mode, null gain → comma-separated with default gain 0.60', () => {
    // Golden: 'note("C3,E3,G3").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'
    expect(chordToStrudel(0, 'maj', null, 'chord', 3)).toBe(
      'note("C3,E3,G3").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'
    );
  });

  it('C major arp mode, explicit gain 0.8 → space-separated', () => {
    // Golden: 'note("C3 E3 G3").s("sawtooth").lpf(1200).gain(0.80).room(0.25)'
    expect(chordToStrudel(0, 'maj', 0.8, 'arp', 3)).toBe(
      'note("C3 E3 G3").s("sawtooth").lpf(1200).gain(0.80).room(0.25)'
    );
  });

  it('A minor block mode, null gain → octave-wrap: A3,C4,E4', () => {
    // A3=rootPc9, C4=octave wrap (9+3=12→pc0,oct+1), E4=(9+7=16→pc4,oct+1)
    // Golden: 'note("A3,C4,E4").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'
    expect(chordToStrudel(9, 'min', null, 'chord', 3)).toBe(
      'note("A3,C4,E4").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'
    );
  });
});

// ── melodyLine ────────────────────────────────────────────────────────────
// Prototype lines 765–773. Golden via Node execution.

describe('melodyLine', () => {
  it('returns empty string for empty progression', () => {
    expect(melodyLine([], 'chord', 3)).toBe('');
  });

  it('C major + A minor, chord mode → bracket notation with comma separators', () => {
    // Golden: '  note("<[C3,E3,G3] [A3,C4,E4]>").s("sawtooth").lpf(1200).gain("<0.60 0.60>").room(0.3)'
    expect(
      melodyLine(
        [
          { rootPc: 0, qual: 'maj' },
          { rootPc: 9, qual: 'min' },
        ],
        'chord',
        3
      )
    ).toBe(
      '  note("<[C3,E3,G3] [A3,C4,E4]>").s("sawtooth").lpf(1200).gain("<0.60 0.60>").room(0.3)'
    );
  });

  it('C major + A minor, arp mode → bracket notation with space separators', () => {
    // Golden: '  note("<[C3 E3 G3] [A3 C4 E4]>").s("sawtooth").lpf(1200).gain("<0.60 0.60>").room(0.3)'
    expect(
      melodyLine(
        [
          { rootPc: 0, qual: 'maj' },
          { rootPc: 9, qual: 'min' },
        ],
        'arp',
        3
      )
    ).toBe(
      '  note("<[C3 E3 G3] [A3 C4 E4]>").s("sawtooth").lpf(1200).gain("<0.60 0.60>").room(0.3)'
    );
  });

  it('uses explicit gain values when provided', () => {
    const result = melodyLine([{ rootPc: 0, qual: 'maj', gain: 0.8 }], 'chord', 3);
    expect(result).toContain('gain("<0.80>")');
  });
});

// ── rhythmToStrudel ───────────────────────────────────────────────────────
// Prototype lines 833–836. Golden via Node execution.

describe('rhythmToStrudel', () => {
  it('two-layer BD+SD produces byte-identical stack string', () => {
    // BD at steps 0 and 8; SD at steps 4 and 12.
    // Phase file illustrative value for SD was incorrect (showed "sd ~ ~ ~ sd …"
    // which implies step 0 also has sd). Node-executed prototype gives the correct
    // value: "~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~" (steps 4 and 12 only).
    const bd: RhythmLayer = {
      sound: 'bd',
      steps: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    };
    const sd: RhythmLayer = {
      sound: 'sd',
      steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    };
    expect(rhythmToStrudel([bd, sd], layerAudible)).toBe(
      'stack(\n  s("bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~"),\n  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~")\n)'
    );
  });

  it('single euclidean layer → stack with hh(5,8)', () => {
    // Golden: 'stack(\n  s("hh(5,8)")\n)'
    const hh: RhythmLayer = { sound: 'hh', euclid: '5,8', steps: [] };
    expect(rhythmToStrudel([hh], layerAudible)).toBe('stack(\n  s("hh(5,8)")\n)');
  });

  it('returns empty string when all layers are muted', () => {
    const bd: RhythmLayer = {
      sound: 'bd',
      steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      muted: true,
    };
    expect(rhythmToStrudel([bd], layerAudible)).toBe('');
  });

  it('respects solo: only soloed layer appears', () => {
    const bd: RhythmLayer = {
      sound: 'bd',
      steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      solo: true,
    };
    const sd: RhythmLayer = {
      sound: 'sd',
      steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    const result = rhythmToStrudel([bd, sd], layerAudible);
    expect(result).toContain('bd');
    expect(result).not.toContain('sd');
  });
});

// ── buildSession ──────────────────────────────────────────────────────────
// Prototype lines 1470–1476. Golden via Node execution.

describe('buildSession', () => {
  it('smoke test: non-empty layers + progression contains stack and header', () => {
    const layers: RhythmLayer[] = [
      { sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] },
      { sound: 'sd', steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
    ];
    const progression = [
      { rootPc: 0, qual: 'maj' as const },
      { rootPc: 7, qual: 'maj' as const },
    ];
    const result = buildSession(layers, progression, 'chord', 3);
    expect(result).toContain('stack(');
    expect(result).toContain('// ── Sesión: ritmo + armonía (geometría) ──');
  });

  it('exact header comment matches prototype byte-for-byte', () => {
    // The header is a hard invariant — must be exactly this string.
    const layers: RhythmLayer[] = [
      { sound: 'bd', steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ];
    const result = buildSession(layers, [], 'chord', 3);
    expect(result.startsWith('// ── Sesión: ritmo + armonía (geometría) ──\n')).toBe(true);
  });

  it('returns empty string when layers and progression are both empty', () => {
    expect(buildSession([], [], 'chord', 3)).toBe('');
  });

  it('rhythm-only session omits melody line', () => {
    const layers: RhythmLayer[] = [
      { sound: 'bd', steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    ];
    const result = buildSession(layers, [], 'chord', 3);
    expect(result).not.toContain('note(');
  });

  it('harmony-only session (no rhythm layers) includes melody line', () => {
    const progression = [{ rootPc: 0, qual: 'maj' as const }];
    const result = buildSession([], progression, 'chord', 3);
    expect(result).toContain('note(');
    expect(result).toContain('stack(');
  });
});

// ── stripComments ─────────────────────────────────────────────────────────
// Prototype lines 1936–1938. Golden via Node execution.

describe('stripComments', () => {
  it('removes comment lines, returns trimmed result', () => {
    // Golden: 'stack(\n  s("bd")\n)'
    expect(stripComments('// comment\nstack(\n  s("bd")\n)')).toBe('stack(\n  s("bd")\n)');
  });

  it('preserves non-comment lines unchanged', () => {
    expect(stripComments('s("bd")')).toBe('s("bd")');
  });

  it('removes multiple comment lines', () => {
    const result = stripComments('// a\n// b\nstack(\n  s("hh")\n)');
    expect(result).toBe('stack(\n  s("hh")\n)');
  });

  it('returns empty string for all-comment input', () => {
    expect(stripComments('// only a comment')).toBe('');
  });
});

// ── buildComposition ──────────────────────────────────────────────────────
// Prototype lines 2054–2065. Golden via Node execution.

describe('buildComposition', () => {
  it('two tracks, equal lengths → stack with arrange, no silence padding', () => {
    // Golden: '// ── Composición ──\nstack(\narrange(\n  [4, s("bd")]\n),\narrange(\n  [4, s("sd")]\n)\n)'
    const blocks: Block[] = [
      { id: 'b1', name: 'Groove 1', type: 'groove', code: 's("bd")', bars: 4 },
      { id: 'b2', name: 'Groove 2', type: 'groove', code: 's("sd")', bars: 4 },
    ];
    const tracks: Track[] = [
      { id: 't0', blocks: [{ blockId: 'b1', bars: 4 }] },
      { id: 't1', blocks: [{ blockId: 'b2', bars: 4 }] },
    ];
    const result = buildComposition(blocks, tracks);
    expect(result).toBe(
      '// ── Composición ──\nstack(\narrange(\n  [4, s("bd")]\n),\narrange(\n  [4, s("sd")]\n)\n)'
    );
    expect(result).toContain('arrange(');
    expect(result).toContain('stack(');
    expect(result).not.toContain('silence');
  });

  it('silence-padding case: shorter track gets [N, silence] appended', () => {
    // Track 0: 4 bars. Track 1: 2 bars. Total = 4. Track 1 padded with [2, silence].
    // Golden includes [2, silence] in track 1's arrange.
    const blocks: Block[] = [
      { id: 'b1', name: 'Groove 1', type: 'groove', code: 's("bd")', bars: 4 },
      { id: 'b2', name: 'Groove 2', type: 'groove', code: 's("sd")', bars: 2 },
    ];
    const tracks: Track[] = [
      { id: 't0', blocks: [{ blockId: 'b1', bars: 4 }] },
      { id: 't1', blocks: [{ blockId: 'b2', bars: 2 }] },
    ];
    const result = buildComposition(blocks, tracks);
    // 'silence' is the byte-exact Strudel keyword (CLAUDE.md invariant)
    expect(result).toContain('[2, silence]');
    expect(result).toContain('arrange(\n  [2, s("sd")],\n  [2, silence]\n)');
    expect(result).toBe(
      '// ── Composición ──\nstack(\narrange(\n  [4, s("bd")]\n),\narrange(\n  [2, s("sd")],\n  [2, silence]\n)\n)'
    );
  });

  it('single track → no stack wrapper, just arrange with composition header', () => {
    // Golden: '// ── Composición ──\narrange(\n  [4, s("bd")]\n)'
    const blocks: Block[] = [
      { id: 'b1', name: 'Groove 1', type: 'groove', code: 's("bd")', bars: 4 },
    ];
    const tracks: Track[] = [{ id: 't0', blocks: [{ blockId: 'b1', bars: 4 }] }];
    const result = buildComposition(blocks, tracks);
    expect(result).toBe('// ── Composición ──\narrange(\n  [4, s("bd")]\n)');
    expect(result).not.toContain('stack(');
  });

  it('returns empty string for no non-empty tracks', () => {
    expect(buildComposition([], [{ id: 't0', blocks: [] }])).toBe('');
  });

  it('skips tracks with no matching blocks', () => {
    const blocks: Block[] = [
      { id: 'b1', name: 'Groove 1', type: 'groove', code: 's("bd")', bars: 4 },
    ];
    const tracks: Track[] = [
      { id: 't0', blocks: [{ blockId: 'b1', bars: 4 }] },
      { id: 't1', blocks: [{ blockId: 'nonexistent', bars: 4 }] },
    ];
    const result = buildComposition(blocks, tracks);
    // Track 1 has no matching block → filtered out → single track output
    expect(result).toBe('// ── Composición ──\narrange(\n  [4, s("bd")]\n)');
  });
});
