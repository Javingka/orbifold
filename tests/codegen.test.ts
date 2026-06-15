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
// Prototype lines 605–608.
//
// Definitive tempo fix (Phase 02 own-scheduler approach): tempoWrap is now an
// identity function that returns code.trim(). Tempo is controlled by the audio
// layer's Cyclist scheduler via scheduler.setCps(bpm/240) — NOT by prepending a
// setcps string to the evaluated code. The setcps-as-string approach failed
// because setcps is NOT in the evalScope registered by @strudel/web@1.0.3's
// defaultPrebake (it is only bound inside repl(), which initStrudel() never
// calls). This function exists for API stability; callers that pass bpm compile
// cleanly. The bpm parameter is ignored.
//
// .fast/.slow remain forbidden — they time-stretch patterns and break the
// chord-geometry timing. See docs/adr/0005-tempo-setcps-not-setcpm.md.

describe('tempoWrap', () => {
  it('returns code.trim() unchanged at BPM 120 (identity — tempo via scheduler.setCps)', () => {
    const code = 'stack(\n  s("bd")\n)';
    expect(tempoWrap(code, 120)).toBe('stack(\n  s("bd")\n)');
  });

  it('returns code.trim() unchanged at BPM 90 (bpm parameter ignored)', () => {
    const code = 'stack(\n  s("bd")\n)';
    expect(tempoWrap(code, 90)).toBe('stack(\n  s("bd")\n)');
  });

  it('trims trailing whitespace from code', () => {
    expect(tempoWrap('s("bd")  ', 120)).toBe('s("bd")');
  });

  it('never inserts setcps, .fast, or .slow (invariant: no time-stretch in code string)', () => {
    const result = tempoWrap('s("bd")', 120);
    expect(result).not.toContain('setcps(');
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

// ── melodyLine — dual-mode (ADR 0010) ─────────────────────────────────────
// Phase 02 step 02.4: variable chord duration via arrange().
// Tests 1–4 satisfy A-02-02 (byte-identical uniform path) and A-02-03 (arrange path).

describe('melodyLine — dual-mode (ADR 0010)', () => {
  // Test 1 — uniform durations: backward compat guarantee (A-02-02)
  it('Test 1 — uniform durations: emits slowcat form identical to pre-phase main', () => {
    // Both chords have bars=1 (explicit). Must produce byte-identical output to the
    // existing slowcat path (A-02-02).
    const result = melodyLine(
      [
        { rootPc: 0, qual: 'maj', gain: 0.6, bars: 1 },
        { rootPc: 9, qual: 'min', gain: 0.6, bars: 1 },
      ],
      'chord',
      3
    );
    // Byte-identical to the pre-phase slowcat form.
    expect(result).toBe(
      '  note("<[C3,E3,G3] [A3,C4,E4]>").s("sawtooth").lpf(1200).gain("<0.60 0.60>").room(0.3)'
    );
  });

  // Test 2 — mixed durations: arrange() path (A-02-03)
  it('Test 2 — mixed durations: emits arrange() form with per-chord inline gain', () => {
    // C major: rootPc=0, maj, octave=3 → [C3,E3,G3], bars=2, gain=0.60
    // F minor-ish: rootPc=5, min, octave=3 → [F3,G#3,C4], bars=0.5, gain=0.80
    // NOTE_NAMES uses sharp spellings; pc 8 = G# not Ab.
    const result = melodyLine(
      [
        { rootPc: 0, qual: 'maj', gain: 0.6, bars: 2 },
        { rootPc: 5, qual: 'min', gain: 0.8, bars: 0.5 },
      ],
      'chord',
      3
    );
    // ADR 0016: the bars:2 segment is .slow(2)-ed so the chord sustains across both
    // cycles (one attack) instead of re-attacking each cycle. The bars:0.5 segment is
    // <= 1 cycle, so it stays byte-identical (no .slow).
    expect(result).toBe(
      'arrange(\n' +
        '  [2, note("[C3,E3,G3]").s("sawtooth").lpf(1200).gain(0.60).room(0.3).slow(2)],\n' +
        '  [0.5, note("[F3,G#3,C4]").s("sawtooth").lpf(1200).gain(0.80).room(0.3)]\n' +
        ')'
    );
  });

  // ADR 0016 — sustain regression: a lengthened slot (bars > 1) gets .slow(bars) so it
  // holds across its whole span; unit/sub-cycle slots do not. Verified behaviorally by
  // hap-onset query in the live @strudel/web engine (1 onset over N cycles).
  it('ADR 0016 — lengthened chord (bars:3) gets .slow(3) for single sustained attack', () => {
    const result = melodyLine(
      [
        { rootPc: 0, qual: 'maj', gain: 0.6, bars: 3 },
        { rootPc: 9, qual: 'min', gain: 0.6, bars: 1 },
      ],
      'chord',
      3
    );
    expect(result).toContain(
      '[3, note("[C3,E3,G3]").s("sawtooth").lpf(1200).gain(0.60).room(0.3).slow(3)]'
    );
    // The bars:1 slot must NOT be slowed.
    expect(result).toContain(
      '[1, note("[A3,C4,E4]").s("sawtooth").lpf(1200).gain(0.60).room(0.3)]'
    );
    expect(result).not.toContain('.slow(1)');
  });

  it('ADR 0016 — lengthened arp (bars:2) gets .slow(2) so the arpeggio spans the whole span', () => {
    // A rest forces the arrange path; the arp chord at bars:2 must be .slow(2)-ed.
    const result = melodyLine(
      [
        { rootPc: 0, qual: 'maj', gain: 0.6, bars: 2 },
        { isRest: true, bars: 1 },
      ],
      'arp',
      3
    );
    expect(result).toContain(
      '[2, note("[C3 E3 G3]").s("sawtooth").lpf(1200).gain(0.60).room(0.3).slow(2)]'
    );
  });

  // Test 3 — single chord bars === 1: uniform path
  it('Test 3 — single chord with bars === 1 uses slowcat form', () => {
    const result = melodyLine([{ rootPc: 0, qual: 'maj', gain: 0.6, bars: 1 }], 'chord', 3);
    expect(result).toBe('  note("<[C3,E3,G3]>").s("sawtooth").lpf(1200).gain("<0.60>").room(0.3)');
    // Must NOT contain arrange().
    expect(result).not.toContain('arrange(');
  });

  // Test 4 — empty progression: returns '' (unchanged)
  it('Test 4 — empty progression returns empty string', () => {
    expect(melodyLine([], 'chord', 3)).toBe('');
  });
});

// ── melodyLine — rest-slot codegen (Phase 06, ADR 0012) ──────────────────────
// A-06-01, A-06-02, A-06-03: rest slots force arrange() path; chord-only
// progressions with all bars===1 still emit slowcat (regression guard).

describe('melodyLine — rest-slot codegen (ADR 0012)', () => {
  // A-06-01: single rest slot with bars:2
  it('A-06-01: single rest (bars:2) → arrange() with [2, silence]', () => {
    expect(melodyLine([{ isRest: true, bars: 2 }], 'chord', 3)).toBe('arrange(\n  [2, silence]\n)');
  });

  // A-06-01 variant: single rest with default bars (1)
  it('single rest no bars → arrange() with [1, silence]', () => {
    expect(melodyLine([{ isRest: true }], 'chord', 3)).toBe('arrange(\n  [1, silence]\n)');
  });

  // A-06-02: mixed progression [C major, rest 1 bar, F major]
  it('A-06-02: mixed progression emits arrange() with silence at rest position', () => {
    const result = melodyLine(
      [
        { rootPc: 0, qual: 'maj', gain: 0.6, bars: 1 },
        { isRest: true, bars: 1 },
        { rootPc: 5, qual: 'maj', gain: 0.6, bars: 1 },
      ],
      'chord',
      3
    );
    expect(result).toBe(
      'arrange(\n' +
        '  [1, note("[C3,E3,G3]").s("sawtooth").lpf(1200).gain(0.60).room(0.3)],\n' +
        '  [1, silence],\n' +
        '  [1, note("[F3,A3,C4]").s("sawtooth").lpf(1200).gain(0.60).room(0.3)]\n' +
        ')'
    );
  });

  // A-06-03: regression guard — chord-only all bars===1 still uses slowcat form
  it('A-06-03: chord-only progression all bars===1 still emits slowcat form (regression guard)', () => {
    const result = melodyLine([{ rootPc: 0, qual: 'maj', gain: 0.6 }], 'chord', 3);
    expect(result).toBe('  note("<[C3,E3,G3]>").s("sawtooth").lpf(1200).gain("<0.60>").room(0.3)');
    expect(result).not.toContain('arrange(');
  });

  // A-06-03 variant: chord-only no bars field (undefined) still uses slowcat
  it('A-06-03 variant: chord-only no bars field still emits slowcat form', () => {
    const result = melodyLine(
      [
        { rootPc: 0, qual: 'maj', gain: 0.6 },
        { rootPc: 9, qual: 'min', gain: 0.6 },
      ],
      'chord',
      3
    );
    expect(result).not.toContain('arrange(');
    expect(result).toContain('note("<');
  });

  // Rest forces arrange() even when chord bars===1
  it('rest slot forces arrange() path even when chord bars===1', () => {
    const result = melodyLine(
      [
        { rootPc: 0, qual: 'maj', gain: 0.6, bars: 1 },
        { isRest: true, bars: 1 },
      ],
      'chord',
      3
    );
    expect(result).toContain('arrange(');
    expect(result).toContain('[1, silence]');
    expect(result).toContain('[1, note(');
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
