// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Strudel codegen: tempoWrap, chordToStrudel, melodyLine,
//             rhythmToStrudel, buildSession.
// Ported from reference/orbifold.html lines 605–608, 758–773, 833–836,
// 1470–1476.
// No DOM / PIXI / Svelte imports — pure engine, unit-testable.

import { type Quality, chordVoicing } from '../theory/chords.js';
import { type RhythmLayer, layerAudible, rhythmLayerToStrudelLine } from '../rhythm/layers.js';

/**
 * Wrap a Strudel pattern string with a setcps tempo directive.
 *
 * Uses `setcps(bpm/240)` — never `setcpm`, `.fast`, or `.slow`.
 * 1 Strudel cycle = 1 bar of 4/4; cps = BPM / 240 (60 s/min ÷ 4 beats/cycle).
 *
 * ADR 0005: `setcpm` does NOT exist in @strudel/web@1.0.3; the pinned package
 * only registers `setcps` and `setbpm` in the evaluate scope. The original
 * prototype's `setcpm(bpm/4)` call threw `ReferenceError: setcpm is not defined`
 * on every evaluate, causing the fallback to strip the tempo header — meaning
 * tempo never actually changed (a latent no-op bug in the prototype). This
 * implementation uses `setcps`, which IS registered, so BPM changes are
 * audible. `.fast`/`.slow` remain forbidden (they time-stretch patterns and
 * break the chord-geometry timing). See docs/adr/0005-tempo-setcps-not-setcpm.md.
 *
 * Ported from prototype lines 605–608 (with corrected tempo function per ADR 0005).
 */
export function tempoWrap(code: string, bpm: number): string {
  const cps = bpm / 240;
  return `setcps(${cps.toFixed(6)})\n${code.trim()}`;
}

/**
 * Generate a Strudel note pattern for a single chord.
 *
 * `chordMode === 'chord'` → comma-separated (block/parallel).
 * `chordMode === 'arp'`   → space-separated (sequential arpeggio).
 * `gain` defaults to `0.6` when `null`.
 *
 * Ported from prototype lines 758–763 (with explicit params per OD-1/OD-6).
 */
export function chordToStrudel(
  rootPc: number,
  qual: Quality,
  gain: number | null,
  chordMode: 'chord' | 'arp',
  octave: number
): string {
  const notes = chordVoicing(rootPc, qual, octave);
  const g = gain == null ? 0.6 : gain;
  const inner = chordMode === 'chord' ? notes.join(',') : notes.join(' ');
  return `note("${inner}").s("sawtooth").lpf(1200).gain(${g.toFixed(2)}).room(0.25)`;
}

/**
 * Generate a Strudel harmony line from a chord progression.
 *
 * Each chord becomes a `[...]` bracket in the `<...>` sequence; gain values
 * are aligned per-chord in a parallel `gain("<g1 g2 …>")`.
 * Returns `''` when the progression is empty.
 *
 * Ported from prototype lines 765–773 (with explicit params per OD-2).
 */
export function melodyLine(
  progression: ReadonlyArray<{ rootPc: number; qual: Quality; gain?: number | null }>,
  chordMode: 'chord' | 'arp',
  octave: number
): string {
  if (progression.length === 0) return '';
  const sep = chordMode === 'chord' ? ',' : ' ';
  const seq = progression
    .map((ch) => '[' + chordVoicing(ch.rootPc, ch.qual, octave).join(sep) + ']')
    .join(' ');
  const gains = progression.map((ch) => (ch.gain == null ? 0.6 : ch.gain).toFixed(2)).join(' ');
  return `  note("<${seq}>").s("sawtooth").lpf(1200).gain("<${gains}>").room(0.3)`;
}

/**
 * Generate a Strudel `stack(...)` from an array of rhythm layers.
 *
 * Only audible layers (per `audibleFn`) contribute lines.
 * Returns `''` when no layers are audible.
 *
 * Ported from prototype lines 833–836 (rhythmToStrudel + rhythmLayerLines).
 * `audibleFn` defaults to `layerAudible` — matching the prototype's global
 * call — so tests can override it for isolation.
 */
export function rhythmToStrudel(
  layers: RhythmLayer[],
  audibleFn: (layer: RhythmLayer, all: RhythmLayer[]) => boolean = layerAudible
): string {
  const lines: string[] = [];
  layers.forEach((l) => {
    if (!audibleFn(l, layers)) return;
    lines.push(rhythmLayerToStrudelLine(l));
  });
  return lines.length ? `stack(\n${lines.join(',\n')}\n)` : '';
}

/**
 * Combine the rhythm engine and harmony engine into a single session pattern.
 *
 * Produces the exact comment header the prototype uses:
 * `// ── Sesión: ritmo + armonía (geometría) ──`
 *
 * Returns `''` when both engines are silent.
 *
 * Ported from prototype lines 1470–1476 (with explicit params per OD-3).
 */
export function buildSession(
  layers: RhythmLayer[],
  progression: ReadonlyArray<{ rootPc: number; qual: Quality; gain?: number | null }>,
  chordMode: 'chord' | 'arp',
  octave: number
): string {
  const lines: string[] = [];
  layers.forEach((l) => {
    if (!layerAudible(l, layers)) return;
    lines.push(rhythmLayerToStrudelLine(l));
  });
  const mel = melodyLine(progression, chordMode, octave);
  if (mel) lines.push(mel);
  if (!lines.length) return '';
  return `// ── Sesión: ritmo + armonía (geometría) ──\nstack(\n${lines.join(',\n')}\n)`;
}
