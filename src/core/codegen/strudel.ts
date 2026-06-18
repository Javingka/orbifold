// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Strudel codegen: tempoWrap, chordToStrudel, melodyLine,
//             rhythmToStrudel, buildSession.
// Ported from reference/orbifold.html lines 605–608, 758–773, 833–836,
// 1470–1476.
// No DOM / PIXI / Svelte imports — pure engine, unit-testable.

import { type Quality, chordVoicing } from '../theory/chords.js';
import { type RhythmLayer, layerAudible, rhythmLayerToStrudelLine } from '../rhythm/layers.js';

// ── Local union for harmony slot input ────────────────────────────────────────
// NOT exported — avoids pulling session.ts (with Svelte-transitive dependencies)
// into this pure-engine module. CLAUDE.md invariant: src/core/** must have no
// DOM/PIXI/Svelte imports. Existing callers pass chord-only arrays; the chord
// structural type is a subtype of HarmonySlotInput, so no callers need updating.
// Introduced in Phase 06 — ADR 0012 D2.
type HarmonySlotInput =
  | { rootPc: number; qual: Quality; gain?: number | null; bars?: number }
  | { isRest: true; bars?: number };

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
  octave: number,
  instrument?: string,
  room?: number,
  decay?: number
): string {
  const notes = chordVoicing(rootPc, qual, octave);
  const g = gain == null ? 0.6 : gain;
  const inner = chordMode === 'chord' ? notes.join(',') : notes.join(' ');
  const instr = instrument !== undefined ? instrument : 'sawtooth';
  const roomVal = room !== undefined ? room : 0.25;
  const decayStr = decay !== undefined ? `.decay(${decay})` : '';
  return `note("${inner}").s("${instr}").lpf(1200).gain(${g.toFixed(2)}).room(${roomVal})${decayStr}`;
}

/**
 * Generate a Strudel harmony line from a chord progression.
 *
 * **Dual-mode (ADR 0010):**
 * - Uniform case (all chords have `bars === 1` or `bars === undefined`): emits the
 *   existing `<…>` slowcat form. Output is byte-identical to pre-Phase-02 `main`.
 * - Variable case (at least one chord has `bars !== 1`): emits an `arrange(…)` form
 *   where each chord is an independent segment with its own absolute cycle count and
 *   inline gain. Any segment whose span is not one cycle (`bars !== 1`) is additionally
 *   `.slow(bars)`-ed so the chord/arp plays EXACTLY ONCE across its whole span — this
 *   cancels the `.fast(bars)` that `arrange()` applies internally, which otherwise makes
 *   a lengthened slot re-attack each cycle and a shortened slot over-sustain into the
 *   next slot (ADR 0016, amending ADR 0010). This `.slow` is a scoped, per-segment
 *   DURATION expression — NOT the global TEMPO time-stretch the `.fast`/`.slow` ban
 *   (ADR 0005) targets; tempo is still owned by `setcps`.
 *
 * Returns `''` when the progression is empty.
 *
 * Ported from prototype lines 765–773 (with explicit params per OD-2).
 * Dual-mode extension introduced in Phase 02 — ADR 0010.
 */
export function melodyLine(
  progression: ReadonlyArray<HarmonySlotInput>,
  chordMode: 'chord' | 'arp',
  octave: number,
  instrument?: string,
  room?: number,
  decay?: number
): string {
  if (progression.length === 0) return '';
  const sep = chordMode === 'chord' ? ',' : ' ';

  // ADR 0010 dual-mode + ADR 0012 rest extension:
  // use arrange() when any slot is a rest, OR when any chord has bars !== 1.
  const uniformDuration = progression.every(
    (slot) => !('isRest' in slot) && ((slot as { bars?: number }).bars ?? 1) === 1
  );

  if (uniformDuration) {
    // Slowcat form — byte-identical to pre-phase main (A-02-02).
    // Safe to cast: uniformDuration guarantees no rest slots remain.
    const chordSlots = progression as ReadonlyArray<{
      rootPc: number;
      qual: Quality;
      gain?: number | null;
      bars?: number;
      instrument?: string;
      room?: number;
      decay?: number;
    }>;
    const seq = chordSlots
      .map((ch) => '[' + chordVoicing(ch.rootPc, ch.qual, octave).join(sep) + ']')
      .join(' ');
    const gains = chordSlots.map((ch) => (ch.gain == null ? 0.6 : ch.gain).toFixed(2)).join(' ');
    // Per-slot instrument/room/decay: use the first chord's attrs as representative
    // (uniform-case: all chords share the same sound params for simplicity; the full
    // per-chord attribute model applies in the arrange() path below).
    // However, per ADR 0018 D2, when callers pass top-level instrument/room/decay
    // params those override per-slot values. In the uniform path, all chords share
    // one pattern line, so we use the provided params (or defaults).
    const instr = instrument !== undefined ? instrument : 'sawtooth';
    const roomVal = room !== undefined ? room : 0.3;
    const decayStr = decay !== undefined ? `.decay(${decay})` : '';
    return `  note("<${seq}>").s("${instr}").lpf(1200).gain("<${gains}>").room(${roomVal})${decayStr}`;
  }

  // arrange() form — per-slot inline segment (A-02-03, ADR 0012 D3).
  const segments = progression.map((slot) => {
    const numCycles = slot.bars ?? 1;
    if ('isRest' in slot) {
      // Rest slot — ADR 0012 D3: [bars, silence] with two leading spaces.
      return `  [${numCycles}, silence]`;
    }
    // Chord slot. ADR 0016 (Phase 10, Pilot-authorized 2026-06-15): a slot whose span
    // is not exactly one cycle (bars !== 1) must play its chord/arp EXACTLY ONCE across
    // that span. arrange() internally `.fast(numCycles)`-es each segment (see engine:
    // arrange = timeCat(...segs.map(([u,p]) => [u, p.fast(u)])).slow(total)); for a
    // lengthened slot that replays the chord N times (re-attack), and for a shortened
    // slot (.fast(0.5) = .slow(2)) it stretches the chord past its slot, overlapping the
    // next slot and de-syncing the loop. Pre-applying `.slow(numCycles)` cancels that
    // internal `.fast(numCycles)` exactly (slow(u).fast(u) = identity), so each segment
    // sounds once across its true span. Verified by hap-onset query in the live
    // @strudel/web@1.0.3 engine for bars 2, 3, 0.5 (chord + arp), incl. clean looping.
    // bars === 1 is left byte-identical (arrange's .fast(1) is already identity).
    // This `.slow` is per-segment DURATION, not the global TEMPO time-stretch the ADR
    // 0005 ban targets.
    const voicing = chordVoicing(slot.rootPc, slot.qual, octave).join(sep);
    const g = (slot.gain == null ? 0.6 : slot.gain).toFixed(2);
    const sustain = numCycles !== 1 ? `.slow(${numCycles})` : '';
    // Per ADR 0018 D2: top-level instrument/room/decay params take priority;
    // absent → use slot's own fields; absent slot fields → hardcoded defaults.
    const slotInstr =
      instrument !== undefined
        ? instrument
        : (slot as { instrument?: string }).instrument !== undefined
          ? (slot as { instrument?: string }).instrument
          : 'sawtooth';
    const slotRoom =
      room !== undefined
        ? room
        : (slot as { room?: number }).room !== undefined
          ? (slot as { room?: number }).room
          : 0.3;
    const slotDecay =
      decay !== undefined
        ? decay
        : (slot as { decay?: number }).decay !== undefined
          ? (slot as { decay?: number }).decay
          : undefined;
    const decayStr = slotDecay !== undefined ? `.decay(${slotDecay})` : '';
    return `  [${numCycles}, note("[${voicing}]").s("${slotInstr}").lpf(1200).gain(${g}).room(${slotRoom})${decayStr}${sustain}]`;
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
  progression: ReadonlyArray<HarmonySlotInput>,
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
