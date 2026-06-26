// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Strudel codegen: tempoWrap, chordToStrudel, melodyLine,
//             rhythmToStrudel, buildSession.
// Ported from reference/orbifold.html lines 605–608, 758–773, 833–836,
// 1470–1476.
// No DOM / PIXI / Svelte imports — pure engine, unit-testable.

import { type Quality, chordVoicing } from '../theory/chords.js';
import { type RhythmLayer, layerAudible, rhythmLayerToStrudelLine } from '../rhythm/layers.js';
import { resolveChordAttrs, type ChordAttrs } from './presets.js';
import { NOTE_NAMES } from '../theory/pitch.js';

// ── Local union for harmony slot input ────────────────────────────────────────
// NOT exported — avoids pulling session.ts (with Svelte-transitive dependencies)
// into this pure-engine module. CLAUDE.md invariant: src/core/** must have no
// DOM/PIXI/Svelte imports. Existing callers pass chord-only arrays; the chord
// structural type is a subtype of HarmonySlotInput, so no callers need updating.
// Introduced in Phase 06 — ADR 0012 D2.
// Phase 03 amendment: chord branch extended with ChordAttrs fields for preset/
// filter/envelope support — ADR 0019 D4.
// note-placement Phase 01 step 01.2: NoteSlot arm added to the type declaration
// so `ProgressionSlot[]` (now Chord|RestSlot|NoteSlot) is assignable.
// note-placement Phase 01 step 01.3: full NoteSlot codegen branch implemented
// in melodyLine — emits note("NOTE_NAMES[rootPc]+(octave+octaveOffset)") with
// .slow(bars) when bars !== 1.
// post-phase-01 fix (2026-06-26): NoteSlot arm extended with timbre attributes;
// codegen emits .s(), .gain(), .room(), .decay(), .attack(), .lpf() when present.
type HarmonySlotInput =
  | ({ rootPc: number; qual: Quality; gain?: number | null; bars?: number } & ChordAttrs)
  | { isRest: true; bars?: number }
  | {
      isNote: true;
      rootPc: number;
      octaveOffset: number;
      bars?: number;
      preset?: string;
      instrument?: string;
      gain?: number;
      room?: number;
      decay?: number;
      attack?: number;
      lpf?: number;
    };

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
  decay?: number,
  chordAttrs?: ChordAttrs
): string {
  const notes = chordVoicing(rootPc, qual, octave);
  const g = gain == null ? 0.6 : gain;
  const inner = chordMode === 'chord' ? notes.join(',') : notes.join(' ');
  // ADR 0019 D4b: resolve sound attributes via resolveChordAttrs.
  // Positional params (instrument, room, decay) take priority as explicit overrides.
  // chordAttrs carries preset + filter/envelope fields from a Chord slot.
  // roomDefault=0.25 preserves the chordToStrudel byte-identical baseline.
  const baseAttrs: ChordAttrs = {
    ...chordAttrs,
    ...(instrument !== undefined ? { instrument } : {}),
    ...(room !== undefined ? { room } : {}),
    ...(decay !== undefined ? { decay } : {}),
  };
  const resolved = resolveChordAttrs(baseAttrs, 0.25);
  const attackStr = resolved.attack !== undefined ? `.attack(${resolved.attack})` : '';
  const decayStr = resolved.decay !== undefined ? `.decay(${resolved.decay})` : '';
  const sustainStr = resolved.sustain !== undefined ? `.sustain(${resolved.sustain})` : '';
  const releaseStr = resolved.release !== undefined ? `.release(${resolved.release})` : '';
  const lpenvStr = resolved.lpenv !== undefined ? `.lpenv(${resolved.lpenv})` : '';
  const lpaStr = resolved.lpa !== undefined ? `.lpa(${resolved.lpa})` : '';
  const lpdStr = resolved.lpd !== undefined ? `.lpd(${resolved.lpd})` : '';
  const lpqStr = resolved.lpq !== undefined ? `.lpq(${resolved.lpq})` : '';
  return `note("${inner}").s("${resolved.instrument}").lpf(${resolved.lpf}).gain(${g.toFixed(2)}).room(${resolved.room})${attackStr}${decayStr}${sustainStr}${releaseStr}${lpenvStr}${lpaStr}${lpdStr}${lpqStr}`;
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
  // ADR 0018 D2 amendment: also use arrange() when any chord has non-default
  // sound attributes (instrument/room/decay) — the slowcat form emits a single
  // .s(…)/room(…) for the whole pattern and cannot express per-chord timbre.
  // ADR 0019 D7 amendment: extend the uniformAttrs check to include all new
  // Phase 03 sound-attribute fields (preset, lpf, attack, sustain, release,
  // lpenv, lpa, lpd, lpq). When all new fields are absent (undefined), the
  // comparison undefined===undefined evaluates to true — gate outcome unchanged.
  // note-placement Phase 01 step 01.2: NoteSlot forces arrange() path.
  // The full NoteSlot codegen branch (note("...") output) is added in step 01.3.
  const hasNoteSlot = progression.some((slot) => 'isNote' in slot);
  const uniformDuration =
    !hasNoteSlot &&
    progression.every(
      (slot) => !('isRest' in slot) && ((slot as { bars?: number }).bars ?? 1) === 1
    );
  const uniformAttrs = (() => {
    // Filter out rest and note slots — only chord slots contribute to uniformAttrs.
    const chordSlots = progression.filter(
      (slot) => !('isRest' in slot) && !('isNote' in slot)
    ) as Array<ChordAttrs>;
    if (chordSlots.length === 0) return true;
    const ref = chordSlots[0];
    if (ref === undefined) return true;
    return chordSlots.every(
      (c) =>
        c.instrument === ref.instrument &&
        c.room === ref.room &&
        c.decay === ref.decay &&
        c.preset === ref.preset &&
        c.lpf === ref.lpf &&
        c.attack === ref.attack &&
        c.sustain === ref.sustain &&
        c.release === ref.release &&
        c.lpenv === ref.lpenv &&
        c.lpa === ref.lpa &&
        c.lpd === ref.lpd &&
        c.lpq === ref.lpq
    );
  })();

  if (uniformDuration && uniformAttrs) {
    // Slowcat form — byte-identical to pre-phase main (A-02-02, A-03-01).
    // Safe to cast: uniformDuration guarantees no rest slots remain.
    const chordSlots = progression as ReadonlyArray<
      { rootPc: number; qual: Quality; gain?: number | null; bars?: number } & ChordAttrs
    >;
    const seq = chordSlots
      .map((ch) => '[' + chordVoicing(ch.rootPc, ch.qual, octave).join(sep) + ']')
      .join(' ');
    const gains = chordSlots.map((ch) => (ch.gain == null ? 0.6 : ch.gain).toFixed(2)).join(' ');
    // Per ADR 0018 D2: top-level instrument/room/decay params override per-slot values.
    // Per ADR 0019 D4b: resolveChordAttrs with first-chord's attrs (all chords are uniform
    // so any chord is representative). roomDefault=0.3 preserves the melodyLine baseline.
    const firstChord = chordSlots[0] ?? {};
    const baseAttrs: ChordAttrs = {
      ...firstChord,
      ...(instrument !== undefined ? { instrument } : {}),
      ...(room !== undefined ? { room } : {}),
      ...(decay !== undefined ? { decay } : {}),
    };
    const resolved = resolveChordAttrs(baseAttrs, 0.3);
    const attackStr = resolved.attack !== undefined ? `.attack(${resolved.attack})` : '';
    const decayStr = resolved.decay !== undefined ? `.decay(${resolved.decay})` : '';
    const sustainStr = resolved.sustain !== undefined ? `.sustain(${resolved.sustain})` : '';
    const releaseStr = resolved.release !== undefined ? `.release(${resolved.release})` : '';
    const lpenvStr = resolved.lpenv !== undefined ? `.lpenv(${resolved.lpenv})` : '';
    const lpaStr = resolved.lpa !== undefined ? `.lpa(${resolved.lpa})` : '';
    const lpdStr = resolved.lpd !== undefined ? `.lpd(${resolved.lpd})` : '';
    const lpqStr = resolved.lpq !== undefined ? `.lpq(${resolved.lpq})` : '';
    return `  note("<${seq}>").s("${resolved.instrument}").lpf(${resolved.lpf}).gain("<${gains}>").room(${resolved.room})${attackStr}${decayStr}${sustainStr}${releaseStr}${lpenvStr}${lpaStr}${lpdStr}${lpqStr}`;
  }

  // arrange() form — per-slot inline segment (A-02-03, ADR 0012 D3).
  const segments = progression.map((slot) => {
    const numCycles = slot.bars ?? 1;
    if ('isRest' in slot) {
      // Rest slot — ADR 0012 D3: [bars, silence] with two leading spaces.
      return `  [${numCycles}, silence]`;
    }
    if ('isNote' in slot) {
      // NoteSlot — note-placement Phase 01 step 01.3 / post-phase-01 fix 2026-06-26.
      // NoteSlot preset bug fix: preset bundles now resolve through resolveChordAttrs,
      // exactly the same pattern as chord slots in the arrange() path.
      //
      // Derives the note name using OD-1 Option A:
      //   noteName = NOTE_NAMES[rootPc] + (octave + octaveOffset)
      // NOTE_NAMES uses sharp spellings (e.g. "C#", "F#") consistent with pitch.ts.
      //
      // Emitted capabilities:
      //   - pitch:      note("C4") — derived from rootPc + (octave + octaveOffset)
      //   - instrument: .s("triangle") — from resolveChordAttrs (preset or raw instrument)
      //   - lpf:        .lpf(n) — always emitted (resolveChordAttrs provides a default)
      //   - room:       .room(n) — always emitted (resolveChordAttrs provides a default)
      //   - attack:     .attack(n) — emitted when preset or slot provides a value
      //   - decay:      .decay(n) — emitted when preset or slot provides a value
      //   - sustain:    .sustain(n) — emitted when preset provides a value
      //   - release:    .release(n) — emitted when preset provides a value
      //   - gain:       .gain(n) — from slot.gain when present (not part of resolveChordAttrs)
      //   - duration:   .slow(bars) when bars !== 1 (cancels arrange()'s internal .fast)
      //
      // The slot structurally satisfies ChordAttrs (has preset?, instrument?, lpf?, room?,
      // decay?, attack?). resolveChordAttrs applies the per-attribute explicit-wins rule
      // (ADR 0019 D3): explicit slot field → preset value → hardcoded default.
      //
      // Reserved for future phases:
      //   - mini-notation: note("C4 E4 G4") — multiple pitches in one slot
      //   - lpenv/lpa/lpd/lpq — filter envelope (not yet on NoteSlot interface)
      const noteOctave = octave + slot.octaveOffset;
      const noteName = `${NOTE_NAMES[slot.rootPc] ?? 'C'}${noteOctave}`;
      // Resolve sound attributes through the preset system (same as chord slots).
      // roomDefault=0.3 matches the melodyLine arrange-path baseline.
      const noteAttrs: ChordAttrs = {
        preset: slot.preset,
        instrument: slot.instrument,
        lpf: slot.lpf,
        room: slot.room,
        decay: slot.decay,
        attack: slot.attack,
      };
      const resolved = resolveChordAttrs(noteAttrs, 0.3);
      const attackStr = resolved.attack !== undefined ? `.attack(${resolved.attack})` : '';
      const decayStr = resolved.decay !== undefined ? `.decay(${resolved.decay})` : '';
      const sustainStr = resolved.sustain !== undefined ? `.sustain(${resolved.sustain})` : '';
      const releaseStr = resolved.release !== undefined ? `.release(${resolved.release})` : '';
      // Build chain: note → .s() → .lpf() → optional .gain() → .room() → envelope
      let chain = `note("${noteName}").s("${resolved.instrument}").lpf(${resolved.lpf})`;
      if (slot.gain != null) chain += `.gain(${slot.gain})`;
      chain += `.room(${resolved.room})${attackStr}${decayStr}${sustainStr}${releaseStr}`;
      // .slow(numCycles) cancels arrange()'s internal .fast(numCycles) so the note plays
      // exactly once across its span (same invariant as chord slots — ADR 0016).
      if (numCycles !== 1) chain += `.slow(${numCycles})`;
      return `  [${numCycles}, ${chain}]`;
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
    // Cast is safe: isRest and isNote guards above have returned; remainder is chord shape.
    type ChordSlotLocal = {
      rootPc: number;
      qual: Quality;
      gain?: number | null;
      bars?: number;
    } & ChordAttrs;
    const chordSlot = slot as ChordSlotLocal;
    const voicing = chordVoicing(chordSlot.rootPc, chordSlot.qual, octave).join(sep);
    const g = (chordSlot.gain == null ? 0.6 : chordSlot.gain).toFixed(2);
    const slowStr = numCycles !== 1 ? `.slow(${numCycles})` : '';
    // Per ADR 0018 D2: top-level instrument/room/decay params take priority.
    // Per ADR 0019 D4b: resolveChordAttrs merges slot attrs + top-level overrides.
    // roomDefault=0.3 preserves the melodyLine arrange-path byte-identical baseline.
    const slotBase = chordSlot as ChordAttrs;
    const baseAttrs: ChordAttrs = {
      ...slotBase,
      ...(instrument !== undefined ? { instrument } : {}),
      ...(room !== undefined ? { room } : {}),
      ...(decay !== undefined ? { decay } : {}),
    };
    const resolved = resolveChordAttrs(baseAttrs, 0.3);
    const attackStr = resolved.attack !== undefined ? `.attack(${resolved.attack})` : '';
    const decayStr = resolved.decay !== undefined ? `.decay(${resolved.decay})` : '';
    const sustainStr = resolved.sustain !== undefined ? `.sustain(${resolved.sustain})` : '';
    const releaseStr = resolved.release !== undefined ? `.release(${resolved.release})` : '';
    const lpenvStr = resolved.lpenv !== undefined ? `.lpenv(${resolved.lpenv})` : '';
    const lpaStr = resolved.lpa !== undefined ? `.lpa(${resolved.lpa})` : '';
    const lpdStr = resolved.lpd !== undefined ? `.lpd(${resolved.lpd})` : '';
    const lpqStr = resolved.lpq !== undefined ? `.lpq(${resolved.lpq})` : '';
    return `  [${numCycles}, note("[${voicing}]").s("${resolved.instrument}").lpf(${resolved.lpf}).gain(${g}).room(${resolved.room})${attackStr}${decayStr}${sustainStr}${releaseStr}${lpenvStr}${lpaStr}${lpdStr}${lpqStr}${slowStr}]`;
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
