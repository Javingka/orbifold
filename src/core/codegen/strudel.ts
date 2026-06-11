// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Strudel codegen: tempoWrap, chordToStrudel, melodyLine,
//             rhythmToStrudel, buildSession.
// Ported from reference/orbifold.html lines 605–608, 758–773, 833–836,
// 1470–1476.
// No DOM / PIXI / Svelte imports — pure engine, unit-testable.

import { type Quality, chordVoicing } from '../theory/chords.js';
import { type RhythmLayer, layerAudible, rhythmLayerToStrudelLine } from '../rhythm/layers.js';

/**
 * Returns the trimmed pattern string unchanged.
 *
 * This function is now an identity wrapper. Tempo is controlled via the audio
 * layer's own Cyclist scheduler (scheduler.setCps(bpm/240)) — not via a
 * setcps string prepended to the evaluated code. Injecting setcps into the
 * code string failed because setcps is NOT available in the evalScope
 * registered by @strudel/web@1.0.3's initStrudel/defaultPrebake (it is only
 * bound inside repl(), which initStrudel never calls). The definitive fix
 * (Phase 02 own-scheduler approach) calls scheduler.setCps() directly in the
 * audio layer, making this code-level wrapper a no-op.
 *
 * The bpm parameter is retained in the signature for API stability (callers
 * that pass bpm continue to compile cleanly). `.fast`/`.slow` remain
 * forbidden — they time-stretch patterns and break chord-geometry timing.
 * See docs/adr/0005-tempo-setcps-not-setcpm.md.
 *
 * Ported from prototype lines 605–608 (behavior superseded by own-scheduler fix).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function tempoWrap(code: string, _bpm: number): string {
  return code.trim();
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
 * **Dual-mode (ADR 0010):**
 * - Uniform case (all chords have `bars === 1` or `bars === undefined`): emits the
 *   existing `<…>` slowcat form. Output is byte-identical to pre-Phase-02 `main`.
 * - Variable case (at least one chord has `bars !== 1`): emits an `arrange(…)` form
 *   where each chord is an independent segment with its own absolute cycle count and
 *   inline gain. No `.fast`/`.slow` — duration is expressed via the `numCycles`
 *   argument to `arrange()`, preserving the `setcps` invariant.
 *
 * Returns `''` when the progression is empty.
 *
 * Ported from prototype lines 765–773 (with explicit params per OD-2).
 * Dual-mode extension introduced in Phase 02 — ADR 0010.
 */
export function melodyLine(
  progression: ReadonlyArray<{
    rootPc: number;
    qual: Quality;
    gain?: number | null;
    bars?: number;
  }>,
  chordMode: 'chord' | 'arp',
  octave: number
): string {
  if (progression.length === 0) return '';
  const sep = chordMode === 'chord' ? ',' : ' ';

  // ADR 0010 dual-mode: use arrange() only when at least one chord has bars !== 1.
  const uniformDuration = progression.every((ch) => (ch.bars ?? 1) === 1);

  if (uniformDuration) {
    // Slowcat form — byte-identical to pre-phase main (A-02-02).
    const seq = progression
      .map((ch) => '[' + chordVoicing(ch.rootPc, ch.qual, octave).join(sep) + ']')
      .join(' ');
    const gains = progression.map((ch) => (ch.gain == null ? 0.6 : ch.gain).toFixed(2)).join(' ');
    return `  note("<${seq}>").s("sawtooth").lpf(1200).gain("<${gains}>").room(0.3)`;
  }

  // arrange() form — per-chord inline gain (A-02-03).
  const segments = progression.map((ch) => {
    const voicing = chordVoicing(ch.rootPc, ch.qual, octave).join(sep);
    const g = (ch.gain == null ? 0.6 : ch.gain).toFixed(2);
    const numCycles = ch.bars ?? 1;
    return `  [${numCycles}, note("[${voicing}]").s("sawtooth").lpf(1200).gain(${g}).room(0.3)]`;
  });
  return `arrange(\n${segments.join(',\n')}\n)`;
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
  progression: ReadonlyArray<{
    rootPc: number;
    qual: Quality;
    gain?: number | null;
    bars?: number;
  }>,
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
