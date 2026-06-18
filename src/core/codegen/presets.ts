// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Preset lookup table and resolveChordAttrs pure engine.
// No DOM / PIXI / Svelte imports — pure engine, unit-testable.
//
// Introduced in Phase 03 (harmonic-rhythm-improvements) — ADR 0019 D2/D3/D4.
//
// PRESET_NAMES and the PresetName type define the three confirmed presets.
// PRESETS maps each name to its exact attribute bundle per ADR 0019 D4a.
// resolveChordAttrs applies the per-attribute explicit-wins rule (D3):
//   explicit chord field → preset value → hardcoded default.

// ── Preset name type ───────────────────────────────────────────────────────

/** Technical token set for preset names. NOT translated per ADR 0017 §D3. */
export const PRESET_NAMES = ['piano', 'guitar', 'synth-bass'] as const;

/** Union type for preset names. */
export type PresetName = (typeof PRESET_NAMES)[number];

// ── Resolved attribute bundle ──────────────────────────────────────────────

/**
 * Fully-resolved attribute bundle returned by resolveChordAttrs.
 * Every field has a concrete value (no undefineds).
 * Fields absent from a preset resolve to their hardcoded defaults.
 */
export interface ResolvedAttrs {
  /** Strudel oscillator name, e.g. 'sawtooth', 'sine', 'pink'. */
  instrument: string;
  /** Low-pass filter cutoff in Hz. Default: 1200. */
  lpf: number;
  /** Reverb level 0–1. Callsite-dependent default (see resolveChordAttrs). */
  room: number;
  /** Amplitude attack in seconds, or undefined → omit .attack() call. */
  attack?: number;
  /** Amplitude decay in seconds, or undefined → omit .decay() call. */
  decay?: number;
  /** Amplitude sustain level 0–1, or undefined → omit .sustain() call. */
  sustain?: number;
  /** Amplitude release in seconds, or undefined → omit .release() call. */
  release?: number;
  /** Filter envelope depth, or undefined → omit .lpenv() call. */
  lpenv?: number;
  /** Filter envelope attack in seconds, or undefined → omit .lpa() call. */
  lpa?: number;
  /** Filter envelope decay in seconds, or undefined → omit .lpd() call. */
  lpd?: number;
  /** Filter resonance Q, or undefined → omit .lpq() call. */
  lpq?: number;
}

// ── ChordAttrs input shape ─────────────────────────────────────────────────

/**
 * Subset of Chord that resolveChordAttrs reads.
 * Typed as a structural subtype so Chord (from session.ts) satisfies it
 * without importing session.ts into this pure-engine module.
 */
export interface ChordAttrs {
  preset?: string;
  instrument?: string;
  lpf?: number;
  room?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  lpenv?: number;
  lpa?: number;
  lpd?: number;
  lpq?: number;
}

// ── Preset attribute bundles (ADR 0019 D4a confirmed table) ───────────────

/**
 * Internal preset entry. Optional fields map exactly to the ADR 0019 D4a table:
 * a '—' in the table means the field is absent here (falls through to default).
 */
interface PresetEntry {
  instrument: string;
  lpf: number;
  room: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  lpenv?: number;
  lpa?: number;
  lpd?: number;
  lpq?: number;
}

/**
 * Lookup table from preset name → attribute bundle.
 * Exact values from ADR 0019 D4a (Pilot-approved at Checkpoint #1, confirmed
 * at Checkpoint #2).
 *
 * Piano:        triangle / att .02 / dec .4 / sus .1 / rel .3 / lpf 1800 / room .4
 * Guitarra:     sawtooth / att .01 / dec .3 / sus 0 / lpf 2500 / lpenv 3 / lpa .01 / lpd .25 / room .15
 * Bajo Sintético: sawtooth / att .06 / sus .8 / rel .5 / lpf 600 / lpq 2 / room .2
 *
 * Fields marked '—' in the ADR table are absent (not listed here) so they fall
 * through to the hardcoded defaults in resolveChordAttrs.
 */
export const PRESETS: Record<PresetName, PresetEntry> = {
  piano: {
    instrument: 'triangle',
    attack: 0.02,
    decay: 0.4,
    sustain: 0.1,
    release: 0.3,
    lpf: 1800,
    room: 0.4,
    // lpenv, lpa, lpd, lpq absent → fall through to defaults (undefined → omit)
  },
  guitar: {
    instrument: 'sawtooth',
    attack: 0.01,
    decay: 0.3,
    sustain: 0.0,
    lpf: 2500,
    lpenv: 3,
    lpa: 0.01,
    lpd: 0.25,
    room: 0.15,
    // release absent → fall through (undefined → omit)
    // lpq absent → fall through (undefined → omit)
  },
  'synth-bass': {
    instrument: 'sawtooth',
    attack: 0.06,
    sustain: 0.8,
    release: 0.5,
    lpf: 600,
    lpq: 2,
    room: 0.2,
    // decay absent → fall through (undefined → omit)
    // lpenv, lpa, lpd absent → fall through (undefined → omit)
  },
};

// ── resolveChordAttrs ──────────────────────────────────────────────────────

/**
 * Resolve a chord's sound attributes to a fully-typed bundle.
 *
 * Per ADR 0019 D3 — per-attribute explicit-wins rule:
 *   1. Explicit chord field wins (not undefined), regardless of preset.
 *   2. Preset value wins when the chord field is absent and a preset is set.
 *   3. Hardcoded default wins when neither is present.
 *
 * The `roomDefault` parameter lets each callsite inject its own room default
 * without changing the other callsites:
 *   - chordToStrudel uses 0.25 (Phase 02 default, byte-identical guarantee)
 *   - melodyLine uniform path uses 0.3 (Phase 02 default, byte-identical guarantee)
 *   - melodyLine arrange path uses 0.3 (Phase 02 default, byte-identical guarantee)
 *
 * When all new fields are absent (undefined) and preset is absent, the returned
 * bundle is byte-identical to the pre-Phase-03 hardcoded values at every callsite.
 *
 * @param chord       - Chord-like object (may carry any subset of ChordAttrs).
 * @param roomDefault - Fallback room value when chord.room and preset.room are both absent.
 *                      Defaults to 0.25 (chordToStrudel default).
 */
export function resolveChordAttrs(chord: ChordAttrs, roomDefault = 0.25): ResolvedAttrs {
  // Resolve the preset entry, if any.
  const presetEntry =
    chord.preset !== undefined && chord.preset in PRESETS
      ? PRESETS[chord.preset as PresetName]
      : undefined;

  // Per-attribute explicit-wins: explicit chord field → preset value → hardcoded default.
  const instrument =
    chord.instrument !== undefined ? chord.instrument : (presetEntry?.instrument ?? 'sawtooth');

  const lpf = chord.lpf !== undefined ? chord.lpf : (presetEntry?.lpf ?? 1200);

  const room = chord.room !== undefined ? chord.room : (presetEntry?.room ?? roomDefault);

  // Optional attributes: undefined → omit from the emitted Strudel chain.
  const attack = chord.attack !== undefined ? chord.attack : presetEntry?.attack;

  const decay = chord.decay !== undefined ? chord.decay : presetEntry?.decay;

  const sustain = chord.sustain !== undefined ? chord.sustain : presetEntry?.sustain;

  const release = chord.release !== undefined ? chord.release : presetEntry?.release;

  const lpenv = chord.lpenv !== undefined ? chord.lpenv : presetEntry?.lpenv;

  const lpa = chord.lpa !== undefined ? chord.lpa : presetEntry?.lpa;

  const lpd = chord.lpd !== undefined ? chord.lpd : presetEntry?.lpd;

  const lpq = chord.lpq !== undefined ? chord.lpq : presetEntry?.lpq;

  return {
    instrument,
    lpf,
    room,
    ...(attack !== undefined ? { attack } : {}),
    ...(decay !== undefined ? { decay } : {}),
    ...(sustain !== undefined ? { sustain } : {}),
    ...(release !== undefined ? { release } : {}),
    ...(lpenv !== undefined ? { lpenv } : {}),
    ...(lpa !== undefined ? { lpa } : {}),
    ...(lpd !== undefined ? { lpd } : {}),
    ...(lpq !== undefined ? { lpq } : {}),
  };
}
