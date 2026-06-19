// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — reactive session store: SessionState types, default state,
//             Svelte writable store, pure code-derivation helpers, and
//             fully wired transport actions (step 02.4).
//
// Ported from reference/orbifold.html:
//   SessionState / HarmonyState / RhythmState globals: lines 582–585, 717, 815–819, 897
//   setNowPlaying:   lines 1477–1486
//   requeueLive:     lines 1307–1315
//   rhythmCode  ←   rhythmToStrudel call: lines 1493–1498
//   harmonyCode ←   melodyLine call:      lines 1499–1504
//   sessionCode ←   buildSession call:    lines 1470–1476
//   playGroove:      prototype lines 1493–1498 (rhythmPlay.onclick)
//   playProgression: prototype lines 1499–1504 (progPlay.onclick)
//   playSession:     prototype lines 1487–1492 (sessionPlay.onclick)
//   hushAll:         prototype line 1507       (hushBtn.onclick)
//   setBpm (audio):  prototype lines 653–668
//   requeueLive (full, with audio): prototype lines 1307–1315
//
// Audio wiring: transport actions use lazy dynamic import of src/audio/strudel.ts
// (step 02.4). The import is deferred to the first call so the module is never
// loaded at module-evaluation time — @strudel/web references window at its module
// top-level, which would break Node/Vitest if imported eagerly. Dynamic import
// keeps the pure derivation helpers testable in Node (A-02-09 parity tests).
//
// Core engines remain in src/core/** — no DOM/PIXI/Svelte imports there.

import { writable, get } from 'svelte/store';

import type { SavedSession } from '../lib/persistence.js';
import type { Quality } from '../core/theory/chords.js';
import type { RegisterMode } from '../core/harmony/voice-tracks.js';

// ── Lazy stage loader (mirrors lazy audio pattern) ─────────────────────────
// stage.ts imports PIXI at module-level (import * as PIXI from 'pixi.js').
// A static import here would pull PIXI into the Node/Vitest environment and
// cause "window is not defined". Dynamic import defers loading to browser context.
// Only called by setHarmonySubview (a UI action — never called in unit tests).
type StageModule = typeof import('../render/stage.js');
function getStage(): Promise<StageModule> {
  return import('../render/stage.js');
}
import type { RhythmLayer } from '../core/rhythm/layers.js';
import type { Sound } from '../core/rhythm/layers.js';
import { bjorklund, rotate, RSTEPS } from '../core/rhythm/euclid.js';
import type { Composition } from '../core/composition/model.js';
import { stripComments, buildComposition } from '../core/composition/model.js';
import {
  captureGrooveSnapshot,
  captureArmoniaSnapshot,
  captureSesionSnapshot,
  restoreGrooveSnapshot,
  restoreArmoniaSnapshot,
  restoreSesionSnapshot,
} from '../core/composition/snapshot.js';
import {
  chordToStrudel,
  melodyLine,
  rhythmToStrudel,
  buildSession,
} from '../core/codegen/strudel.js';
import { chordLabel } from '../core/theory/chords.js';
import {
  getCompState,
  getCompPausedBars,
  setCompPlaying,
  setCompPaused,
  setCompStopped,
  compPos,
} from './composition.js';

// ── Lazy audio loader ──────────────────────────────────────────────────────
// @strudel/web accesses window at module-evaluation time (dist/index.mjs line
// 14806: `window.initStrudel = rD`). A static import would execute that code in
// Node (Vitest), causing "window is not defined". Lazy loading defers the import
// until the first transport call (which only ever happens in a browser).
//
// The Promise is cached so repeated calls to getAudio() pay import cost once.

type AudioModule = typeof import('../audio/strudel.js');
let _audioPromise: Promise<AudioModule> | null = null;
/** Cached after first load so requeueLive can check isPlaying without awaiting import. */
let _audioModule: AudioModule | null = null;

function getAudio(): Promise<AudioModule> {
  if (_audioModule) return Promise.resolve(_audioModule);
  if (!_audioPromise) {
    _audioPromise = import('../audio/strudel.js').then((m) => {
      _audioModule = m;
      return m;
    });
  }
  return _audioPromise;
}

// ── Sub-types ──────────────────────────────────────────────────────────────

/**
 * Round `bars` to the nearest 0.25 then clamp to [0.25, 8].
 *
 * Used by `setChordBars` and `apply.ts` to normalise agent- or drag-supplied
 * values before writing to the store.
 *
 * No prototype equivalent — new feature (Phase 02 ADR 0010).
 * Phase 03 amendment: granularity changed from 0.5 to 0.25 (ADR 0010 amendment).
 *
 * @param bars - Raw bars value (any number).
 * @returns Clamped value; multiples of 0.25 in [0.25, 8].
 */
export function clampBars(bars: number): number {
  const rounded = Math.round(bars * 4) / 4;
  return Math.max(0.25, Math.min(8, rounded));
}

/**
 * Return a human-readable duration label for a non-default bars value.
 *
 * Format: ¼× for 0.25, ½× for 0.5, ¾× for 0.75, 1¼× for 1.25, etc.
 * Returns '' when `bars` is `1` or `undefined` — only shown for non-default
 * durations, to keep the UI clean for the common case.
 *
 * Uses a lookup table `['', '¼', '½', '¾']` indexed by
 * `Math.round((bars % 1) * 4)` to avoid floating-point fragility.
 *
 * No prototype equivalent — new feature (Phase 02 ADR 0010).
 * Phase 03: extended to handle 0.25-step quarter fractions (ADR 0010 amendment).
 *
 * @param bars - Duration in Strudel cycles (multiples of 0.25, range [0.25, 8]).
 * @returns Label string such as `¼×`, `½×`, `¾×`, `1¼×`, or `''` for 1 / undefined.
 */
export function barsLabel(bars: number | undefined): string {
  if (bars === undefined || bars === 1) return '';
  // Lookup table indexed by quarter-fraction slot (0=none, 1=¼, 2=½, 3=¾).
  const FRAC: readonly string[] = ['', '¼', '½', '¾'];
  const whole = Math.floor(bars);
  const fracIndex = Math.round((bars % 1) * 4);
  const fracStr = FRAC[fracIndex] ?? '';
  const wholeStr = whole > 0 ? String(whole) : '';
  return wholeStr + fracStr + '×';
}

/**
 * A single chord in the progression.
 * `pcs` and `label` are computed by codegen (chordPcs, chordLabel) — NOT stored.
 * `gain` defaults to 0.6 (prototype lines 758–763, melodyLine 765–773).
 *
 * Prototype reference: `melState.progression[i]` shape, lines 765–773.
 */
export interface Chord {
  rootPc: number; // 0–11 (pitch class)
  qual: Quality; // 'maj' | 'min' | 'dim' | 'aug'
  gain: number; // 0–1.2; default 0.6
  /** Tonnetz centroid x when picked; disambiguates wrapped chord instances. Prototype: ch.cx */
  cx?: number;
  /** Tonnetz centroid y when picked; disambiguates wrapped chord instances. Prototype: ch.cy */
  cy?: number;
  /**
   * Duration in Strudel cycles (default 1; multiples of 0.25; min 0.25, max 8).
   * Introduced in Phase 02 — ADR 0010. Phase 03: granularity 0.5 → 0.25.
   */
  bars?: number;
  /**
   * Oscillator waveform for the chord sound.
   * Valid values: 'sawtooth' | 'sine' | 'square' | 'triangle'.
   * Default (undefined): 'sawtooth' — byte-identical to pre-phase output.
   * Introduced in Phase 02 (harmonic-rhythm-improvements) — ADR 0018 D1.
   */
  instrument?: string;
  /**
   * Reverb level 0–1.
   * Default (undefined): 0.25 (chordToStrudel) or 0.3 (melodyLine paths).
   * Introduced in Phase 02 (harmonic-rhythm-improvements) — ADR 0018 D1.
   */
  room?: number;
  /**
   * Amplitude decay time in seconds (> 0).
   * Default (undefined): no .decay() emitted — byte-identical to pre-phase output.
   * Introduced in Phase 02 (harmonic-rhythm-improvements) — ADR 0018 D1.
   */
  decay?: number;
  /**
   * Named preset bundle. Technical token — not translated (ADR 0017 §D3).
   * Valid values: 'piano' | 'guitar' | 'synth-bass'.
   * Introduced in Phase 03 (harmonic-rhythm-improvements) — ADR 0019 D2.
   */
  preset?: 'piano' | 'guitar' | 'synth-bass';
  /**
   * Low-pass filter cutoff frequency in Hz.
   * Default (undefined): resolves to 1200 via resolveChordAttrs.
   * Introduced in Phase 03 (harmonic-rhythm-improvements) — ADR 0019 D4a.
   */
  lpf?: number;
  /**
   * Amplitude attack time in seconds (>= 0).
   * Introduced in Phase 03 (harmonic-rhythm-improvements) — ADR 0019 D4a.
   */
  attack?: number;
  /**
   * Amplitude sustain level 0–1.
   * Introduced in Phase 03 (harmonic-rhythm-improvements) — ADR 0019 D4a.
   */
  sustain?: number;
  /**
   * Amplitude release time in seconds (>= 0).
   * Introduced in Phase 03 (harmonic-rhythm-improvements) — ADR 0019 D4a.
   */
  release?: number;
  /**
   * Filter envelope modulation depth.
   * Introduced in Phase 03 (harmonic-rhythm-improvements) — ADR 0019 D4a.
   */
  lpenv?: number;
  /**
   * Filter envelope attack time in seconds.
   * Introduced in Phase 03 (harmonic-rhythm-improvements) — ADR 0019 D4a.
   */
  lpa?: number;
  /**
   * Filter envelope decay time in seconds.
   * Introduced in Phase 03 (harmonic-rhythm-improvements) — ADR 0019 D4a.
   */
  lpd?: number;
  /**
   * Filter resonance (Q factor).
   * Introduced in Phase 03 (harmonic-rhythm-improvements) — ADR 0019 D4a.
   */
  lpq?: number;
}

/**
 * A silent slot in the progression. Duration follows the same `bars` semantics as `Chord.bars`.
 * Introduced in Phase 06 — ADR 0012 D1.
 */
export interface RestSlot {
  isRest: true;
  bars?: number;
}

/**
 * A slot in the harmony progression: either a chord or a silent rest.
 * Introduced in Phase 06 — ADR 0012 D1.
 */
export type ProgressionSlot = Chord | RestSlot;

/**
 * Harmony sub-state: root scale / key, octave, and chord progression.
 *
 * Prototype reference: `melState` global (lines 717, usage throughout).
 *
 * Phase 08 (step 08.5): `subview` and `registerMode` are EPHEMERAL UI state.
 * They are NOT persisted in SavedHarmonySchema (persistence.ts) and NOT in
 * the agent schema (agent/schema.ts). Changing them does not alter the saved
 * session blob or the Strudel audio output.
 */
export interface HarmonyState {
  root: number; // pitch class 0–11; default 0 (C)
  mode: string; // 'major' | 'minor' | other SCALE_INTERVALS keys
  octave: number; // default 4 (Checkpoint #5: centers voices on the staff)
  progression: ProgressionSlot[]; // ordered list; empty = silent
  /**
   * Active harmony sub-view.
   * EPHEMERAL — not persisted, not in agent schema.
   * Default: 'tonnetz' (reversibility: preserves Phase 07 behavior on load).
   * ADR 0011 Amendment §D5.
   */
  subview: 'tonnetz' | 'staff';
  /**
   * Voice register assignment mode for the staff view.
   * EPHEMERAL — not persisted, not in agent schema.
   * Default: 'suavizado' (smooth octave-nearest contour by default).
   * Audio output is byte-identical regardless of this setting (visual-only).
   * ADR 0011 Amendment §D6.
   */
  registerMode: RegisterMode;
}

/**
 * Rhythm sub-state: ordered list of drum layers.
 *
 * Prototype reference: `rhythmLayers` global (lines 815–819).
 */
export interface RhythmState {
  layers: RhythmLayer[]; // ordered; empty = silent
}

/**
 * Transport "now playing" state.
 *
 * Prototype reference: `currentSource` global (line 589),
 *   merged with the label shown in the prototype UI.
 */
export interface NowPlaying {
  /**
   * i18n translation key (e.g. 'session.playing.rhythm') or null when silent.
   * ADR 0017 D8: stores a key, not a pre-translated Spanish string.
   * Transport.svelte renders via $t(label, vars).
   */
  label: string | null;
  source:
    | 'rhythm'
    | 'harmony'
    | 'session'
    | 'chord'
    | 'block'
    | 'composition'
    | 'preview'
    | 'agent'
    | 'editor'
    | null;
  /**
   * Optional interpolation variables for the label key.
   * ADR 0017 D8: e.g. { k: '3', n: '8' } for 'session.playing.preview'.
   */
  vars?: Record<string, string | number>;
}

// ── AutopilotState ──────────────────────────────────────────────────────────
// Runtime-only; excluded from SavedSessionSchema (ADR 0022 D1/D7).
// Lives in src/state/session.ts alongside SessionState.
//
// Per ADR 0022 D1.

/**
 * Autopilot runtime state: whether the timer is running and how many
 * Strudel cycles elapse between LLM evolution calls.
 *
 * - `enabled`         Whether the autopilot timer is currently active.
 *                     When true, startAutopilot() has been called and a
 *                     setInterval handle is live in autopilot.ts.
 * - `intervalCycles`  Number of Strudel cycles between automatic evolution
 *                     calls. Range: 2–32 (step 2). Default: 8.
 *                     At 120 BPM, 8 cycles = 16 seconds.
 */
export interface AutopilotState {
  enabled: boolean;
  intervalCycles: number;
}

// ── LastRecipeDisplay ────────────────────────────────────────────────────────
// Runtime-only; excluded from SavedSessionSchema (ADR 0022 D1/D7 pattern).
// Populated by sendEvolution() when musicalIntent.recipeId resolves to a known
// MusicalRecipe. Cleared when applyLoadedSession() runs (satisfies A-04-06).
//
// ai-jam Phase 04 step 04.2.

/**
 * Ephemeral display state for the last recipe applied by the autopilot.
 * Excluded from SavedSessionSchema (ADR 0022 D1/D7 pattern).
 *
 * Required fields are sourced from MusicalRecipe (always available).
 * `explanation` is optional — present only if the LLM supplied it (OD-2).
 */
export interface LastRecipeDisplay {
  /** Stable recipe id (e.g. 'bossa-nova-groove'). */
  recipeId: string;
  /** Human-readable recipe name (e.g. 'Bossa Nova Groove'). */
  recipeName: string;
  /** One or more rhythm catalog ids (joined with commas in the UI). */
  rhythmIds: string[];
  /** Harmony catalog id (e.g. 'bossa-nova-loop'). */
  harmonyId: string;
  /** Qualitative density from the recipe catalog (authoritative). */
  density: 'sparse' | 'medium' | 'dense';
  /** Brief LLM note explaining the recipe choice (≤ 300 chars). OD-2: only if LLM supplied it. */
  explanation?: string;
}

/**
 * The single source of truth for the application session.
 *
 * Matches ORBIFOLD_KICKOFF.md §5 `SessionState` exactly.
 * Prototype reference: bpm (line 585), view/chordMode (line 897), etc.
 */
export interface SessionState {
  bpm: number; // 40–280; default 120
  /**
   * The active primary view.
   * Phase 09 (step 09.3) — ADR 0013 D1: widens from 4 to 5 strings.
   * 'rhythm' | 'harmony' | 'composition' | 'session' | 'code'
   * 'session' is retained (not a nav view; used by the ▶ Sesión transport mode).
   * 'code' is new (Código Strudel primary view).
   */
  view: 'rhythm' | 'harmony' | 'composition' | 'session' | 'code'; // default 'harmony'
  chordMode: 'chord' | 'arp'; // default 'chord'
  harmony: HarmonyState;
  rhythm: RhythmState;
  composition: Composition; // imported from core/composition/model.ts
  nowPlaying: NowPlaying;
  autopilot: AutopilotState; // NEW in ai-jam Phase 01 (ADR 0022 D1)
  /** Ephemeral — excluded from SavedSessionSchema (ADR 0022 D1/D7 pattern). */
  lastRecipeApplied?: LastRecipeDisplay; // NEW in ai-jam Phase 04 step 04.2
}

// ── Default initial state ──────────────────────────────────────────────────

/**
 * Default initial state per inventory (phase-02-inventory.md §SessionState interfaces).
 * bpm 120, view 'harmony', chordMode 'chord', empty progression and layers.
 * App.svelte seeds a minimal default rhythm and harmony in onMount (step 02.4).
 */
export const DEFAULT_SESSION_STATE: SessionState = {
  bpm: 120,
  view: 'harmony',
  chordMode: 'chord',
  harmony: {
    root: 0,
    mode: 'major',
    octave: 4, // Pilot decision (Checkpoint #5, 2026-06-15): octave 4 centers chord voices on the staff
    progression: [],
    // Phase 08 (step 08.5): ephemeral UI defaults — not persisted.
    subview: 'tonnetz', // Pilot decision: Tonnetz visible by default (reversibility)
    registerMode: 'suavizado', // Pilot decision: smooth contour by default
  },
  rhythm: {
    layers: [],
  },
  composition: {
    blocks: [],
    tracks: [],
  },
  nowPlaying: {
    label: null,
    source: null,
  },
  // autopilot: intentionally excluded from SavedSessionSchema (ephemeral; ADR 0022 D1/D7)
  autopilot: {
    enabled: false,
    intervalCycles: 8,
  },
  // lastRecipeApplied: intentionally excluded from SavedSessionSchema (ephemeral; ADR 0022 D1/D7 pattern)
  lastRecipeApplied: undefined,
};

// ── Svelte writable store ──────────────────────────────────────────────────
// ADR 0004: Svelte writable store for session state.
// `state/` is outside `core/**` and may import from svelte/store.

/**
 * The application session store.
 * Components subscribe with `$sessionStore` or `sessionStore.subscribe(...)`.
 */
export const sessionStore = writable<SessionState>(DEFAULT_SESSION_STATE);

// ── Pure code-derivation helpers ───────────────────────────────────────────
// These functions take state as input and return Strudel strings.
// They have NO audio or DOM side effects → unit-testable in Node (Vitest).
//
// The store's code-derivation helpers return UN-WRAPPED bodies (no setcpm header).
// The audio layer (runNow, step 02.3) applies tempoWrap(code, currentBpm) before
// calling evaluate(). Double-wrapping is impossible: audio layer is the sole caller
// of tempoWrap; the store never calls it.
//
// Prototype reference: buildSession (1470–1476), melodyLine (765–773),
//   rhythmToStrudel (833–836).

/**
 * Derive the Strudel rhythm pattern string for the current session state.
 *
 * Delegates to `rhythmToStrudel(layers)` from core/codegen/strudel.ts.
 * Returns '' when all layers are muted or the list is empty.
 *
 * Prototype: `rhythmToStrudel()` call in prototype lines 1493–1498.
 */
export function rhythmCode(state: SessionState): string {
  return rhythmToStrudel(state.rhythm.layers);
}

/**
 * Derive the Strudel harmony line string for the current session state.
 *
 * Delegates to `melodyLine(progression, chordMode, octave)` from core/codegen.
 * Returns '' when the progression is empty.
 *
 * Prototype: `melodyLine()` call in prototype lines 1499–1504.
 */
export function harmonyCode(state: SessionState): string {
  return melodyLine(state.harmony.progression, state.chordMode, state.harmony.octave);
}

/**
 * Derive the combined session Strudel string (rhythm + harmony) for the current state.
 *
 * Delegates to `buildSession(layers, progression, chordMode, octave)` from core/codegen.
 * Returns '' when both engines are silent.
 *
 * Prototype: `buildSession()` call in prototype lines 1470–1476.
 */
export function sessionCode(state: SessionState): string {
  return buildSession(
    state.rhythm.layers,
    state.harmony.progression,
    state.chordMode,
    state.harmony.octave
  );
}

// ── Transport actions (wired to audio layer — step 02.4) ───────────────────
// These functions read store state, derive code, and call the audio layer.
// The audio module is loaded lazily (dynamic import) to prevent @strudel/web's
// module-level window access from running in Node/Vitest.
//
// Prototype reference: transport handlers lines 1487–1507, requeueLive 1307–1315.

/**
 * Update the nowPlaying field in the session store.
 *
 * DOM manipulation stripped (prototype lines 1477–1486 updated several DOM elements).
 * State-only port: updates `nowPlaying.label` and `nowPlaying.source`.
 *
 * Prototype: `setNowPlaying(label, source)` lines 1477–1486.
 * ADR 0017 D8: `label` is now a translation key (e.g. 'session.playing.rhythm'), not
 * a pre-translated Spanish string. `vars` carries interpolation variables for the key.
 */
export function setNowPlaying(
  label: string | null,
  source: NowPlaying['source'],
  vars?: Record<string, string | number>
): void {
  sessionStore.update((s) => ({
    ...s,
    nowPlaying: { label, source, vars },
  }));
}

/**
 * Update the BPM value in the session store and propagate to the audio engine.
 *
 * Updates the store's bpm field and calls audio.setTempo(bpm) to propagate
 * the change to the running Strudel scheduler (via setcpm, 130 ms debounce).
 * The audio module is loaded lazily.
 *
 * Prototype: `currentBpm` global (line 585); setBpm/setTempo lines 653–668.
 */
export function setBpm(bpm: number): void {
  sessionStore.update((s) => ({ ...s, bpm }));
  // Fire and forget — setTempo is synchronous internally but getAudio() is async.
  void getAudio().then((a) => a.setTempo(bpm));
}

/**
 * Update autopilot state (enabled flag and/or intervalCycles).
 * Does NOT start or stop the timer — callers must call
 * startAutopilot() / stopAutopilot() from src/agent/autopilot.ts
 * separately.
 *
 * Per ADR 0022 D1.
 */
export function setAutopilot(patch: Partial<AutopilotState>): void {
  sessionStore.update((s) => ({
    ...s,
    autopilot: { ...s.autopilot, ...patch },
  }));
}

/**
 * Set or clear the last recipe applied by the autopilot.
 * Pass null to clear the card (dismiss button or next evolution clears it).
 *
 * Follows the setAutopilot pattern (ADR 0022 D1/D7).
 * ai-jam Phase 04 step 04.2.
 */
export function setLastRecipeApplied(display: LastRecipeDisplay | null): void {
  sessionStore.update((s) => ({ ...s, lastRecipeApplied: display ?? undefined }));
}

/**
 * Re-export audio.initAudio for the gesture handler in App.svelte.
 *
 * The UI calls initAudio() on the "Init audio" button click to satisfy the
 * CLAUDE.md invariant: audio starts only after a user gesture.
 *
 * Lazily loads the audio module then delegates to its initAudio().
 * Prototype: initStrudel() call inside user gesture, lines 600–603.
 */
export async function initAudio(): Promise<void> {
  const a = await getAudio();
  return a.initAudio();
}

/**
 * Play the default rhythm groove (all active layers).
 *
 * If rhythmCode() returns '', this is a no-op (nothing to play).
 * Calls audio.initAudio() on first gesture (idempotent), then audio.runNow(code)
 * and sets nowPlaying to 'Ritmo · groove'.
 *
 * Prototype: `rhythmPlay.onclick` handler, lines 1493–1498.
 * Audio init on first play gesture per CLAUDE.md invariant (no "Init audio" button).
 */
export async function playGroove(): Promise<void> {
  const state = get(sessionStore);
  const code = rhythmCode(state);
  if (!code) return;
  // Set source before runNow so concurrent requeueLive calls see source='rhythm'.
  // Prototype: setNowPlaying is synchronous alongside runNow in transport handlers.
  setNowPlaying('session.playing.rhythm', 'rhythm');
  const a = await getAudio();
  await a.initAudio();
  a.setTempo(state.bpm);
  await a.runNow(code);
}

/**
 * Play the chord progression (harmony line).
 *
 * If harmonyCode() returns '', this is a no-op.
 * The prototype trims the melody line before calling runNow (line 1502).
 *
 * Prototype: `progPlay.onclick` handler, lines 1499–1504.
 * Audio init on first play gesture per CLAUDE.md invariant.
 */
export async function playProgression(): Promise<void> {
  const state = get(sessionStore);
  const code = harmonyCode(state).trim();
  if (!code) return;
  const a = await getAudio();
  await a.initAudio();
  await a.runNow(code);
  setNowPlaying('session.playing.harmony', 'harmony');
}

/**
 * Play the full session (rhythm + harmony stacked).
 *
 * If sessionCode() returns '', this is a no-op.
 *
 * Prototype: `sessionPlay.onclick` handler, lines 1487–1492.
 * Audio init on first play gesture per CLAUDE.md invariant.
 */
export async function playSession(): Promise<void> {
  const state = get(sessionStore);
  const code = sessionCode(state);
  if (!code) return;
  const a = await getAudio();
  await a.initAudio();
  await a.runNow(code);
  setNowPlaying('session.playing.session', 'session');
}

/**
 * Silence all patterns and clear nowPlaying.
 *
 * Calls audio.hush() which invokes the named hush() export from @strudel/web.
 * Sets nowPlaying to { label: null, source: null }.
 *
 * Prototype: `hushBtn.onclick` handler, line 1507.
 */
export async function hushAll(): Promise<void> {
  const a = await getAudio();
  a.hush();
  setNowPlaying(null, null);
}

/**
 * Re-queue the currently playing pattern for the next Strudel cycle boundary.
 *
 * Reads nowPlaying.source from the store, derives the appropriate code string,
 * and calls audio.queueForNextCycle(code) if audio is currently playing.
 * This is the hot-swap mechanism: live edits (step toggles, chord changes) call
 * requeueLive() so the new pattern takes effect at the next cycle boundary,
 * not immediately.
 *
 * Returns the queued code string (or null if nothing to requeue).
 * Audio queuing is fire-and-forget (Promise not awaited by callers that just
 * want the derived code string — callers that need the audio confirmation can
 * await requeueLiveAsync()).
 *
 * Prototype: `requeueLive()` function, lines 1307–1315.
 *   - 'rhythm'  → rhythmToStrudel()
 *   - 'session' → buildSession()
 *   - 'harmony' → melodyLine().trim()
 *   - 'chord'   → chordToStrudel(last chord in progression)
 */
/** Derive the Strudel code string for the current nowPlaying.source. */
function deriveLiveCode(state: SessionState): string | null {
  const { source } = state.nowPlaying;
  if (source === 'rhythm') {
    const code = rhythmToStrudel(state.rhythm.layers);
    return code || null;
  }
  if (source === 'session') {
    const code = sessionCode(state);
    return code || null;
  }
  if (source === 'harmony') {
    const code = harmonyCode(state).trim();
    return code || null;
  }
  if (source === 'chord') {
    const ch = state.harmony.progression[state.harmony.progression.length - 1];
    if (!ch || 'isRest' in ch) return null;
    return chordToStrudel(ch.rootPc, ch.qual, ch.gain, state.chordMode, state.harmony.octave);
  }
  return null;
}

function queueLiveCodeIfPlaying(syncCode: string | null): void {
  const queue = (a: AudioModule) => {
    if (!a.isPlaying()) return;
    // Re-read store at queue time so step toggles are never stale (prototype: synchronous).
    const freshCode = deriveLiveCode(get(sessionStore)) ?? syncCode;
    if (!freshCode) return;
    void a.queueForNextCycle(freshCode);
  };
  if (_audioModule) {
    queue(_audioModule);
  } else {
    void getAudio().then(queue);
  }
}

export function requeueLive(): string | null {
  const state = get(sessionStore);
  const { source } = state.nowPlaying;

  if (source === 'rhythm') {
    const code = rhythmCode(state);
    if (!code) return null;
    queueLiveCodeIfPlaying(code);
    return code;
  }
  if (source === 'session') {
    const code = sessionCode(state);
    if (!code) return null;
    queueLiveCodeIfPlaying(code);
    return code;
  }
  if (source === 'harmony') {
    // Prototype line 1312: code = melodyLine().trim()
    const code = harmonyCode(state).trim();
    if (!code) return null;
    queueLiveCodeIfPlaying(code);
    return code;
  }
  if (source === 'chord') {
    // Prototype line 1313: last chord in progression
    const progression = state.harmony.progression;
    const ch = progression[progression.length - 1];
    if (!ch || 'isRest' in ch) return null;
    const code = chordToStrudel(ch.rootPc, ch.qual, ch.gain, state.chordMode, state.harmony.octave);
    queueLiveCodeIfPlaying(code);
    return code;
  }

  return null;
}

/**
 * Play a single chord immediately via runNow and update nowPlaying.
 *
 * Derives the Strudel code from `chordToStrudel` using the current store's
 * chordMode and octave, calls `audio.runNow(code)`, and sets nowPlaying to
 * `{ label: 'Acorde · <chordLabel>', source: 'chord' }`.
 *
 * Prototype: `pickChord()` lines 1357–1360 (runNow call + setNowPlaying).
 * Follows the lazy-audio pattern established in step 02.4.
 *
 * @param rootPc - Root pitch class (0–11).
 * @param qual   - Chord quality.
 * @param gain   - Per-chord gain (0–1.2; prototype default 0.6).
 */
/**
 * Play a chord immediately using `runNow` (one-shot preview, not queued).
 *
 * Accepts optional sound attribute overrides (`instrument`, `room`, `decay`)
 * so callers that know the chord's stored attributes (e.g. a Pentagrama slot
 * edit) can forward them. When omitted the codegen defaults apply
 * (instrument='sawtooth', room=0.25, no decay).
 *
 * Prototype: `pickChord()` lines 1357–1360 (runNow call + setNowPlaying).
 * Phase 02 step 02.4: threaded instrument/room/decay — ADR 0018 D5.
 */
export function playChord(
  rootPc: number,
  qual: Quality,
  gain: number,
  instrument?: string,
  room?: number,
  decay?: number
): void {
  const state = get(sessionStore);
  const code = chordToStrudel(
    rootPc,
    qual,
    gain,
    state.chordMode,
    state.harmony.octave,
    instrument,
    room,
    decay
  );
  const label = 'Acorde · ' + chordLabel(rootPc, qual);
  // One cycle = 240000/bpm ms (ADR 0005: cps = bpm/240; one cycle = 1 bar of 4/4).
  // After one cycle, auto-stop if no other source has taken over — single-chord
  // preview should sound once, not loop. The guard on source === 'chord' ensures
  // we don't silence a subsequent harmony or rhythm playback that started
  // during that window.
  const cycleDurationMs = Math.round(240000 / state.bpm);
  void getAudio().then((a) =>
    a.initAudio().then(() => {
      void a.runNow(code);
      setTimeout(() => {
        if (get(sessionStore).nowPlaying.source === 'chord') {
          void hushAll();
        }
      }, cycleDurationMs);
    })
  );
  setNowPlaying(label, 'chord');
}

// ── Step 04.2: new action functions ───────────────────────────────────────
// These functions are the wiring layer for the Phase 04 UI components.
// Prototype references cited per CLAUDE.md §Prototype parity requirement.

/**
 * Toggle the chord play mode between block chords and arpeggio.
 *
 * Updates `sessionStore.chordMode` and calls `requeueLive()` so a running
 * progression picks up the new mode at the next cycle boundary.
 *
 * Prototype: chordMode is implicit in `pickChord`/`melodyLine` —
 *   `chordMode` select handlers (prototype around line 897, `chordMode` global).
 *   `requeueLive()` call at prototype lines 1307–1315.
 *
 * @param mode - 'chord' (block) or 'arp' (arpeggio).
 */
export function setChordMode(mode: 'chord' | 'arp'): void {
  sessionStore.update((s) => ({ ...s, chordMode: mode }));
  requeueLive();
}

/**
 * Update the harmony key (root pitch class, mode name, octave).
 *
 * Updates `harmony.root`, `harmony.mode`, and `harmony.octave` in the store
 * and calls `requeueLive()` so a running progression uses the new key.
 *
 * Prototype: `melRoot` / `melMode` / `melOctave` select `onchange` handlers
 *   (prototype around lines 369–395 HTML, change handlers implicit in JS).
 *   `requeueLive()` at prototype lines 1307–1315.
 *
 * @param root   - Root pitch class 0–11.
 * @param mode   - Mode string (e.g. 'major', 'minor').
 * @param octave - MIDI octave offset (e.g. 3).
 */
export function setHarmonyKey(root: number, mode: string, octave: number): void {
  sessionStore.update((s) => ({
    ...s,
    harmony: { ...s.harmony, root, mode, octave },
  }));
  requeueLive();
}

/**
 * Switch the harmony sub-view between Tonnetz and Pentagrama (staff).
 *
 * Updates `harmony.subview` in the store and calls `setHarmonySubview` on the
 * stage module (via lazy dynamic import to avoid PIXI in Node/Vitest tests).
 *
 * Visual-only: does NOT call requeueLive() — audio is unaffected.
 * EPHEMERAL: this field is not persisted (see HarmonyState.subview JSDoc).
 *
 * Phase 08 (step 08.5) — ADR 0011 Amendment §D5.
 *
 * @param subview - 'tonnetz' or 'staff'.
 */
export function setHarmonySubview(subview: 'tonnetz' | 'staff'): void {
  sessionStore.update((s) => ({
    ...s,
    harmony: { ...s.harmony, subview },
  }));
  // Call stage.setHarmonySubview via lazy import (mirrors lazy audio pattern;
  // avoids pulling PIXI into the Node/Vitest environment at module-eval time).
  void getStage().then((m) => m.setHarmonySubview(subview));
}

/**
 * Set the voice register mode for the harmony staff view.
 *
 * Updates `harmony.registerMode` in the store. Visual-only: does NOT call
 * requeueLive() — audio output is byte-identical regardless of register mode
 * (confirmed in phase-08-inventory.md §b; ADR 0011 Amendment §D6).
 *
 * EPHEMERAL: this field is not persisted (see HarmonyState.registerMode JSDoc).
 * The store subscription in App.svelte (buildHarmonyStaffScene) will re-render
 * the staff with the new register mode on the next state change.
 *
 * Phase 08 (step 08.5) — ADR 0011 Amendment §D6.
 *
 * @param mode - 'estricto' (absolute MIDI pitch) or 'suavizado' (smooth contour).
 */
export function setRegisterMode(mode: RegisterMode): void {
  sessionStore.update((s) => ({
    ...s,
    harmony: { ...s.harmony, registerMode: mode },
  }));
  // Visual-only: no requeueLive(). The staff re-renders via App.svelte store subscription.
}

/**
 * Switch the active primary view.
 *
 * Updates `SessionState.view` in the store and calls `stage.setView` via lazy
 * import (mirrors the lazy pattern for setHarmonySubview to avoid pulling PIXI
 * into the Node/Vitest environment).
 *
 * For 'harmony' and 'rhythm': the corresponding PIXI layer becomes visible.
 * For 'composition', 'session', and 'code': both PIXI layers are hidden (the
 * main content for those views is DOM, not PIXI).
 *
 * Phase 09 (step 09.3) — ADR 0013 D1/D2.
 *
 * @param view - One of the five valid view-type strings.
 */
export function setView(view: SessionState['view']): void {
  sessionStore.update((s) => ({ ...s, view }));
  // Call stage.setView via lazy import (avoids PIXI at module-eval time in Node).
  void getStage().then((m) => m.setView(view));
}

/**
 * Add a new Euclidean rhythm layer (bjorklund + rotate → 16-step array).
 *
 * Computes `bjorklund(k,n)`, rotates by `rot`, and maps to a 16-step array
 * (if n < RSTEPS the pattern is repeated/truncated; if n === RSTEPS it is used
 * directly). The `euclid` field is set to the compact `"k,n,rot"` string so
 * `rhythmLayerToStrudelLine` can use euclidean mode.
 *
 * Pushes the new layer to `rhythm.layers` in the store.
 *
 * Prototype: `addEuclid.onclick` handler, lines 849–857.
 *
 * @param sound - Drum sound name (e.g. 'bd', 'hh').
 * @param k     - Number of hits.
 * @param n     - Number of steps in the euclidean pattern.
 * @param rot   - Rotation offset.
 */
export function addEuclidLayer(sound: string, k: number, n: number, rot: number): void {
  // bjorklund gives a pattern of length n; map to RSTEPS by repeating/truncating.
  const raw = rotate(bjorklund(k, n), rot);
  const steps: number[] = [];
  for (let i = 0; i < RSTEPS; i++) {
    steps.push(raw[i % raw.length]);
  }
  // euclid compact string — rhythm-scene and codegen will use this directly.
  const euclidStr = rot !== 0 ? `${k},${n},${rot}` : `${k},${n}`;
  const layer: RhythmLayer = {
    sound: sound as Sound,
    steps,
    euclid: euclidStr,
  };
  sessionStore.update((s) => ({
    ...s,
    rhythm: { ...s.rhythm, layers: [...s.rhythm.layers, layer] },
  }));
  // Round-2 fix (Defect B): requeue so audio reflects the new layer at the next
  // cycle boundary when rhythm is already playing. Without this call the orbit
  // appears visually but the audio pattern ignores the new layer until the user
  // manually presses ▶ Ritmo again.
  // Prototype: addEuclid.onclick does not call requeueLive explicitly because the
  // prototype always re-reads rhythmLayers at evaluation time — the port's
  // requeueLive must be called explicitly to trigger the queued update.
  requeueLive();
}

/**
 * Add a new empty rhythm layer (all rests, 16 steps).
 *
 * Pushes a zero-filled 16-step layer so the user can toggle individual steps
 * in the rhythm view.
 *
 * Prototype: `addLayerEmpty.onclick` handler, lines 858–861.
 *
 * @param sound - Drum sound name.
 */
export function addEmptyLayer(sound: string): void {
  const layer: RhythmLayer = {
    sound: sound as Sound,
    steps: new Array(RSTEPS).fill(0) as number[],
  };
  sessionStore.update((s) => ({
    ...s,
    rhythm: { ...s.rhythm, layers: [...s.rhythm.layers, layer] },
  }));
  // Round-2 fix (Defect B): requeue so audio reflects the new layer at the next
  // cycle when already playing. Same rationale as addEuclidLayer above.
  requeueLive();
}

/**
 * Preview a Euclidean rhythm pattern (toggle: play or stop).
 *
 * If `nowPlaying.source === 'preview'`, calls `hushAll()` (stop preview).
 * Otherwise runs `s("${sound}").euclidRot(${k},${n},${rot})` via `audio.runNow`
 * and sets nowPlaying to `{ label: 'Vista previa · E(k,n)', source: 'preview' }`.
 *
 * Prototype: `euclidPreview.onclick` handler, lines 862–876.
 *
 * @param sound - Drum sound name.
 * @param k     - Number of hits.
 * @param n     - Total steps.
 * @param rot   - Rotation offset.
 */
export async function previewEuclid(
  sound: string,
  k: number,
  n: number,
  rot: number
): Promise<void> {
  const state = get(sessionStore);
  if (state.nowPlaying.source === 'preview') {
    // Toggle off: stop preview.
    await hushAll();
    return;
  }
  const code = `s("${sound}").euclidRot(${k},${n},${rot})`;
  const a = await getAudio();
  await a.initAudio();
  await a.runNow(code);
  setNowPlaying('session.playing.preview', 'preview', { k: String(k), n: String(n) });
}

/**
 * Run Strudel code from the code drawer immediately.
 *
 * Calls `audio.runNow(code)` and sets nowPlaying to
 * `{ label: 'Editor', source: 'editor' }`.
 *
 * Prototype: `runEditor.onclick` handler, lines 524–526 (`#runEditor` button).
 *
 * @param code - Raw Strudel code string from the drawer textarea.
 */
export async function runEditor(code: string): Promise<void> {
  const a = await getAudio();
  await a.initAudio();
  await a.runNow(code);
  setNowPlaying('session.playing.editor', 'editor');
}

/**
 * Queue Strudel code from the code drawer for the next cycle.
 *
 * Calls `audio.queueForNextCycle(code)` — the pattern takes effect at the
 * next Strudel cycle boundary (~250 ms heuristic in @strudel/web@1.0.3).
 *
 * Prototype: `updateEditor.onclick` handler, line 527 (`#updateEditor` button).
 *
 * @param code - Raw Strudel code string from the drawer textarea.
 */
export async function queueEditor(code: string): Promise<void> {
  const a = await getAudio();
  await a.initAudio();
  await a.queueForNextCycle(code);
}

/**
 * Clear the entire chord progression.
 *
 * Sets `harmony.progression` to `[]` and calls `requeueLive()` so a running
 * harmony engine goes silent at the next cycle.
 *
 * Prototype: `clearProg` (line 1506, inside `hushBtn.onclick` context).
 *   `melState.progression = []` + `requeueLive()`.
 */
export function clearProgression(): void {
  sessionStore.update((s) => ({
    ...s,
    harmony: { ...s.harmony, progression: [] },
  }));
  requeueLive();
}

/**
 * Remove a single chord from the progression by index.
 *
 * Splices the chord at `index` from `harmony.progression` and calls
 * `requeueLive()`.
 *
 * Prototype: chip `.rm` click handler, line 1440
 *   (`melState.progression.splice(i,1); renderProgChips(); requeueLive()`).
 *
 * @param index - Zero-based index into `harmony.progression`.
 */
export function clearChordAt(index: number): void {
  sessionStore.update((s) => ({
    ...s,
    harmony: {
      ...s.harmony,
      progression: s.harmony.progression.filter((_, i) => i !== index),
    },
  }));
  requeueLive();
}

/**
 * Update the duration of a chord in the progression.
 *
 * Clamps `bars` via `clampBars()` (nearest 0.25, range [0.25, 8]), writes to
 * `harmony.progression[index].bars`, and calls `requeueLive()` so a running
 * harmony engine picks up the new duration at the next cycle boundary.
 *
 * No-op if `index` is out of range.
 *
 * No prototype equivalent — new feature (Phase 02 ADR 0010).
 *
 * @param index - Zero-based index into `harmony.progression`.
 * @param bars  - Desired duration in Strudel cycles (clamped to [0.25, 8], nearest 0.25).
 */
export function setChordBars(index: number, bars: number): void {
  sessionStore.update((s) => {
    if (index < 0 || index >= s.harmony.progression.length) return s;
    const clamped = clampBars(bars);
    const progression = s.harmony.progression.map((ch, i) =>
      i === index ? { ...ch, bars: clamped } : ch
    );
    return { ...s, harmony: { ...s.harmony, progression } };
  });
  requeueLive();
}

/**
 * Set the instrument waveform for the chord slot at `index`.
 *
 * Updates `progression[index].instrument` and calls `requeueLive()` so
 * a running harmony engine picks up the change at the next cycle boundary.
 * Has no effect if `index` is out of range or points to a rest slot.
 *
 * Modeled on `setChordBars`. Introduced in Phase 02 (harmonic-rhythm-improvements)
 * step 02.4 — ADR 0018 D5.
 *
 * @param index      - Zero-based progression slot index.
 * @param instrument - Oscillator waveform name (e.g. 'sawtooth', 'sine', 'square', 'triangle').
 */
export function setChordInstrument(index: number, instrument: string): void {
  sessionStore.update((s) => {
    if (index < 0 || index >= s.harmony.progression.length) return s;
    const slot = s.harmony.progression[index];
    if (slot === undefined || 'isRest' in slot) return s;
    const progression: ProgressionSlot[] = s.harmony.progression.map((ch, i) =>
      i === index ? { ...ch, instrument } : ch
    );
    return { ...s, harmony: { ...s.harmony, progression } };
  });
  requeueLive();
}

/**
 * Batch-update instrument, room, and/or decay on the chord slot at `index`.
 *
 * Only fields present (not `undefined`) in `attrs` are written. Calls
 * `requeueLive()` so a running harmony engine picks up the change at the
 * next cycle boundary. Has no effect if `index` is out of range or points
 * to a rest slot.
 *
 * Introduced in Phase 02 (harmonic-rhythm-improvements) step 02.4 — ADR 0018 D5.
 *
 * @param index - Zero-based progression slot index.
 * @param attrs - Object with optional `instrument`, `room`, and/or `decay` overrides.
 */
export function setChordSoundAttrs(
  index: number,
  attrs: { instrument?: string; room?: number; decay?: number }
): void {
  sessionStore.update((s) => {
    if (index < 0 || index >= s.harmony.progression.length) return s;
    const slot = s.harmony.progression[index];
    if (slot === undefined || 'isRest' in slot) return s;
    const updated = { ...slot };
    if (attrs.instrument !== undefined) updated.instrument = attrs.instrument;
    if (attrs.room !== undefined) updated.room = attrs.room;
    if (attrs.decay !== undefined) updated.decay = attrs.decay;
    const progression: ProgressionSlot[] = s.harmony.progression.map((ch, i) =>
      i === index ? updated : ch
    );
    return { ...s, harmony: { ...s.harmony, progression } };
  });
  requeueLive();
}

/**
 * Set the preset bundle name for the chord slot at `index`.
 *
 * Updates `progression[index].preset` and calls `requeueLive()` so a running
 * harmony engine picks up the change at the next cycle boundary.
 * Has no effect if `index` is out of range or points to a rest slot.
 * Pass `undefined` to clear the preset (no preset selected).
 *
 * Introduced in Phase 03 (harmonic-rhythm-improvements) step 03.4 — ADR 0019 D2/D4a.
 *
 * @param index  - Zero-based progression slot index.
 * @param preset - Preset name ('piano' | 'guitar' | 'synth-bass') or undefined to clear.
 */
export function setChordPreset(
  index: number,
  preset: 'piano' | 'guitar' | 'synth-bass' | undefined
): void {
  sessionStore.update((s) => {
    if (index < 0 || index >= s.harmony.progression.length) return s;
    const slot = s.harmony.progression[index];
    if (slot === undefined || 'isRest' in slot) return s;
    const updated: Chord = { ...slot };
    updated.preset = preset;
    const progression: ProgressionSlot[] = s.harmony.progression.map((ch, i) =>
      i === index ? updated : ch
    );
    return { ...s, harmony: { ...s.harmony, progression } };
  });
  requeueLive();
}

/**
 * Set the oscillator waveform for the chord slot at `index`.
 *
 * Alias for `setChordInstrument` with ADR 0019 D1 semantics: the oscillator field
 * is `instrument` (extended to include 'pink' in Phase 03). The UI exposes this as
 * the "Oscillator" selector; data field stays `instrument`.
 * Has no effect if `index` is out of range or points to a rest slot.
 *
 * Introduced in Phase 03 (harmonic-rhythm-improvements) step 03.4 — ADR 0019 D1.
 *
 * @param index      - Zero-based progression slot index.
 * @param instrument - Oscillator waveform name ('sawtooth' | 'sine' | 'square' | 'triangle' | 'pink').
 */
export function setChordOscillator(index: number, instrument: string): void {
  // Delegates to the existing setChordInstrument (same field, same requeueLive behavior).
  setChordInstrument(index, instrument);
}

/**
 * Append a rest slot with `bars: 1` to the end of the progression.
 *
 * Delegates to `addRestAt(progression.length)`.
 * Calls `requeueLive()` so a running harmony engine picks up the change.
 *
 * Introduced in Phase 06 — ADR 0012 D5.
 */
export function appendRest(): void {
  const state = get(sessionStore);
  addRestAt(state.harmony.progression.length);
}

/**
 * Insert a rest slot with `bars: 1` at the given index in the progression.
 *
 * Out-of-range index is clamped to `[0, progression.length]`; an index equal to
 * `progression.length` appends.
 * Calls `requeueLive()` so a running harmony engine picks up the change.
 *
 * Introduced in Phase 06 — ADR 0012 D5.
 *
 * @param index - Zero-based position at which to insert the rest slot.
 */
export function addRestAt(index: number): void {
  sessionStore.update((s) => {
    const progression = s.harmony.progression;
    const clamped = Math.max(0, Math.min(index, progression.length));
    const newSlot: RestSlot = { isRest: true as const, bars: 1 };
    const newProgression = [
      ...progression.slice(0, clamped),
      newSlot,
      ...progression.slice(clamped),
    ];
    return { ...s, harmony: { ...s.harmony, progression: newProgression } };
  });
  requeueLive();
}

/**
 * Reorder a slot in the progression by moving it from `fromIdx` to `toIdx`.
 *
 * Both indices are clamped to `[0, progression.length − 1]`. If the clamped
 * indices are equal, this is a no-op (no store write, no `requeueLive()` call).
 * Otherwise: removes the slot at `fromIdx` (splice-out), inserts it at `toIdx`
 * (splice-in). This is an absolute-index reorder — `toIdx` is the desired final
 * position of the slot, not a relative offset.
 *
 * Calls `requeueLive()` after the store update so the reordered pattern takes
 * effect at the next cycle boundary (consistent with the "live changes requeue
 * to the next cycle" invariant).
 *
 * Effect on audio: reordering changes the `arrange()` Strudel output (the
 * audible sequence of chords changes). This is intentional — the user is
 * editing their composition. NOT a regression (ADR 0014 D5, Consequence 4).
 *
 * Phase 10 (step 10.3) — ADR 0014 D5.
 *
 * @param fromIdx - Current index of the slot to move (0-based, clamped).
 * @param toIdx   - Target index of the slot after the move (0-based, clamped).
 */
export function reorderSlot(fromIdx: number, toIdx: number): void {
  sessionStore.update((s) => {
    const progression = s.harmony.progression;
    if (progression.length === 0) return s;
    const clampedFrom = Math.max(0, Math.min(fromIdx, progression.length - 1));
    const clampedTo = Math.max(0, Math.min(toIdx, progression.length - 1));
    if (clampedFrom === clampedTo) return s;
    const newProgression = [...progression];
    const [removed] = newProgression.splice(clampedFrom, 1);
    newProgression.splice(clampedTo, 0, removed);
    return { ...s, harmony: { ...s.harmony, progression: newProgression } };
  });
  requeueLive();
}

// ── Step 05.2: Composition action functions ────────────────────────────────
// Ports the composition library and timeline manipulation from the prototype.
// Prototype reference: reference/orbifold.html lines 1927–2127.
//
// Module-level ID counters (OD-1 resolved: ephemeral, NOT in sessionStore).
// Prototype: `let blkSeq=1, trkSeq=1;` (line 1933).
// IDs regenerate on page reload — same as prototype behavior.
let _blkSeq = 1;
let _trkSeq = 1;

/**
 * Save the current engine state as a named block in the composition library.
 *
 * Reads the current rhythm/harmony/session code, strips comments, generates a
 * default name ('Groove N', 'Armonía N', or 'Sesión N'), and pushes a new
 * `Block` to `composition.blocks`. Uses the module-level `_blkSeq` counter
 * (OD-1: ephemeral, not persisted). No-op if the derived code is empty.
 *
 * Prototype: `addBlock(type)` (lines 1939–1946).
 *
 * @param type - 'groove' (rhythm), 'armonia' (harmony), or 'sesion' (full session).
 */
export function addBlock(type: 'groove' | 'armonia' | 'sesion'): void {
  const state = get(sessionStore);
  let code = '';
  let defName = '';
  if (type === 'groove') {
    code = rhythmCode(state);
    defName = 'Groove ' + _blkSeq;
  } else if (type === 'armonia') {
    const m = harmonyCode(state);
    code = m ? m.trim() : '';
    defName = 'Armonía ' + _blkSeq;
  } else {
    code = stripComments(sessionCode(state));
    defName = 'Sesión ' + _blkSeq;
  }
  if (!code) return;
  // Capture the editable snapshot at save time (ADR 0020 D2):
  // 1. Generate code via existing codegen path (unchanged — see below).
  // 2. Capture the appropriate snapshot.
  // 3. Attach both to the new Block.
  // buildComposition is NOT touched — it reads block.code only (A-01-06).
  const snapshot =
    type === 'groove'
      ? captureGrooveSnapshot(state)
      : type === 'armonia'
        ? captureArmoniaSnapshot(state)
        : captureSesionSnapshot(state);
  const block = {
    id: 'b' + _blkSeq++,
    name: defName,
    type,
    code: stripComments(code),
    bars: 4,
    snapshot,
  };
  sessionStore.update((s) => ({
    ...s,
    composition: {
      ...s.composition,
      blocks: [...s.composition.blocks, block],
    },
  }));
}

/**
 * Remove a block from the library and all track references.
 *
 * Filters `composition.blocks` to remove the matching block, then filters
 * each track's `blocks` array to remove refs with that `blockId`.
 *
 * Prototype: `el.querySelector('[data-a="del"]').onclick` (lines 1963–1966).
 *
 * @param blockId - The `id` of the block to remove (e.g. 'b1').
 */
export function deleteBlock(blockId: string): void {
  sessionStore.update((s) => ({
    ...s,
    composition: {
      blocks: s.composition.blocks.filter((b) => b.id !== blockId),
      tracks: s.composition.tracks.map((t) => ({
        ...t,
        blocks: t.blocks.filter((r) => r.blockId !== blockId),
      })),
    },
  }));
}

/**
 * Rename a block in the library.
 *
 * Finds the block with `blockId` and updates its `name` field.
 *
 * Prototype: `.nm contenteditable` input handler (line 1960):
 *   `el.querySelector('.nm').addEventListener('input', ev => { b.name = ev.target.textContent; renderTimeline(); })`.
 *
 * @param blockId - The `id` of the block to rename.
 * @param name    - The new name string.
 */
export function renameBlock(blockId: string, name: string): void {
  sessionStore.update((s) => ({
    ...s,
    composition: {
      ...s.composition,
      blocks: s.composition.blocks.map((b) => (b.id === blockId ? { ...b, name } : b)),
    },
  }));
}

/**
 * Preview a single block's code via `runNow` and set `nowPlaying` to `'block'`.
 *
 * Loads the audio module lazily, calls `initAudio()` (idempotent), then
 * `runNow(block.code)`. Sets nowPlaying label to `'Bloque · <name>'` and
 * source to `'block'`.
 *
 * Prototype: `el.querySelector('[data-a="play"]').onclick` (line 1961):
 *   `runNow(b.code, {fromEditor:true}); setNowPlaying('Bloque · '+b.name, 'block');`.
 *
 * @param blockId - The `id` of the block to preview.
 */
export async function playBlockById(blockId: string): Promise<void> {
  const state = get(sessionStore);
  const block = state.composition.blocks.find((b) => b.id === blockId);
  if (!block) return;
  const a = await getAudio();
  await a.initAudio();
  await a.runNow(block.code);
  setNowPlaying('session.playing.block', 'block', { name: block.name });
}

/**
 * Add a new empty track to the timeline.
 *
 * Pushes `{ id: 't' + _trkSeq++, blocks: [] }` to `composition.tracks`.
 *
 * Prototype: `document.getElementById('addTrack').onclick` (line 2120):
 *   `tracks.push({id:'t'+(trkSeq++), blocks:[]}); renderTimeline();`.
 */
export function addTrack(): void {
  const newTrack = { id: 't' + _trkSeq++, blocks: [] as { blockId: string; bars: number }[] };
  sessionStore.update((s) => ({
    ...s,
    composition: {
      ...s.composition,
      tracks: [...s.composition.tracks, newTrack],
    },
  }));
}

/**
 * Remove a track by index. If the removed track was the last one, re-adds a
 * single empty track so the timeline always has at least one lane.
 *
 * Prototype: track head delete button `onclick` (line 2000):
 *   `tracks.splice(ti,1); if(!tracks.length) tracks.push({id:'t'+(trkSeq++),blocks:[]}); renderTimeline();`.
 *
 * @param trackIndex - Zero-based index of the track to remove.
 */
export function removeTrack(trackIndex: number): void {
  sessionStore.update((s) => {
    const tracks = s.composition.tracks.filter((_, i) => i !== trackIndex);
    const finalTracks =
      tracks.length > 0
        ? tracks
        : [{ id: 't' + _trkSeq++, blocks: [] as { blockId: string; bars: number }[] }];
    return {
      ...s,
      composition: { ...s.composition, tracks: finalTracks },
    };
  });
}

/**
 * Add a block reference to an existing track (from the timeline `<select>` drop-down).
 *
 * Finds the block by `blockId`, pushes `{ blockId, bars: block.bars }` to the
 * specified track's `blocks` array.
 *
 * Prototype: timeline selector `onchange` handler (line 2047):
 *   `t.blocks.push({blockId:b.id, bars:b.bars}); renderTimeline();`.
 *
 * @param trackIndex - Zero-based index of the target track.
 * @param blockId    - The `id` of the block to place.
 */
export function addBlockToTrack(trackIndex: number, blockId: string): void {
  sessionStore.update((s) => {
    const block = s.composition.blocks.find((b) => b.id === blockId);
    if (!block) return s;
    const tracks = s.composition.tracks.map((t, i) => {
      if (i !== trackIndex) return t;
      return { ...t, blocks: [...t.blocks, { blockId, bars: block.bars }] };
    });
    return { ...s, composition: { ...s.composition, tracks } };
  });
}

/**
 * Add a new track pre-populated with a block reference ("↳ pista" button behavior).
 *
 * The prototype's `↳ pista` button (line 1962) pushes a NEW track containing
 * the block — it does NOT add to the last existing track. This function
 * implements that prototype-exact behavior.
 *
 * Prototype: `el.querySelector('[data-a="add"]').onclick` (line 1962):
 *   `tracks.push({id:'t'+(trkSeq++), blocks:[{blockId:b.id,bars:b.bars}]}); renderTimeline();`.
 *
 * Bug fix (Checkpoint #5, ai-composition-authoring Phase 01): when `removeTrack`
 * deletes the last track it auto-creates a single empty placeholder track to keep
 * the timeline non-empty. A subsequent `addBlockAsNewTrack` call must detect that
 * placeholder (exactly one track, no block refs) and populate it in place rather
 * than appending a second track — otherwise two tracks appear (one empty phantom +
 * one populated). This does NOT affect the normal case where existing tracks are
 * non-empty; in that case a new track is always appended as before.
 *
 * @param blockId - The `id` of the block to place in the new track.
 */
export function addBlockAsNewTrack(blockId: string): void {
  sessionStore.update((s) => {
    const block = s.composition.blocks.find((b) => b.id === blockId);
    if (!block) return s;
    const ref = { blockId, bars: block.bars };
    // Reuse the sole empty placeholder left by removeTrack instead of appending a
    // second track. Condition: exactly one track AND that track has no block refs.
    const tracks = s.composition.tracks;
    if (tracks.length === 1 && tracks[0].blocks.length === 0) {
      return {
        ...s,
        composition: {
          ...s.composition,
          tracks: [{ ...tracks[0], blocks: [ref] }],
        },
      };
    }
    const newTrack = {
      id: 't' + _trkSeq++,
      blocks: [ref],
    };
    return {
      ...s,
      composition: {
        ...s.composition,
        tracks: [...tracks, newTrack],
      },
    };
  });
}

/**
 * Remove a block reference from a track by its position index.
 *
 * Prototype: `.bx` (✕) click handler (line 2015):
 *   `t.blocks = t.blocks.filter(r => r !== ref); renderTimeline();`.
 *
 * @param trackIndex - Zero-based index of the track.
 * @param refIndex   - Zero-based index of the block reference within the track.
 */
export function removeBlockFromTrack(trackIndex: number, refIndex: number): void {
  sessionStore.update((s) => {
    const tracks = s.composition.tracks.map((t, i) => {
      if (i !== trackIndex) return t;
      return { ...t, blocks: t.blocks.filter((_, ri) => ri !== refIndex) };
    });
    return { ...s, composition: { ...s.composition, tracks } };
  });
}

/**
 * Update the bar count for a positioned block reference, clamped to [1, 64].
 *
 * Prototype: input `oninput` handler (lines 2017–2018):
 *   `ref.bars = Math.max(1, Math.min(64, +ev.target.value || 1));`.
 *
 * @param trackIndex - Zero-based index of the track.
 * @param refIndex   - Zero-based index of the block reference within the track.
 * @param bars       - New bar count (clamped to [1, 64]).
 */
export function setBlockBars(trackIndex: number, refIndex: number, bars: number): void {
  const clamped = Math.max(1, Math.min(64, bars || 1));
  sessionStore.update((s) => {
    const tracks = s.composition.tracks.map((t, i) => {
      if (i !== trackIndex) return t;
      const blocks = t.blocks.map((r, ri) => (ri === refIndex ? { ...r, bars: clamped } : r));
      return { ...t, blocks };
    });
    return { ...s, composition: { ...s.composition, tracks } };
  });
}

/**
 * Move a block reference from one track to another, inserting at `toRefIndex`
 * within the target track.
 *
 * Removes the ref at `fromRefIndex` in `fromTrackIndex` and splices it into
 * `toTrackIndex` at position `toRefIndex`. If `toRefIndex` is ≥ the target
 * track's length it is appended at the end.
 *
 * No prototype equivalent (cross-track drag was not in prototype; this extends
 * the drag-to-reorder capability to the vertical axis).
 *
 * @param fromTrackIndex - Zero-based source track index.
 * @param fromRefIndex   - Zero-based index of the block ref in the source track.
 * @param toTrackIndex   - Zero-based destination track index.
 * @param toRefIndex     - Desired insertion index within the destination track.
 */
export function moveBlockBetweenTracks(
  fromTrackIndex: number,
  fromRefIndex: number,
  toTrackIndex: number,
  toRefIndex: number
): void {
  sessionStore.update((s) => {
    const tracks = s.composition.tracks.map((t) => ({ ...t, blocks: [...t.blocks] }));
    const srcTrack = tracks[fromTrackIndex];
    const dstTrack = tracks[toTrackIndex];
    if (!srcTrack || !dstTrack) return s;
    const [ref] = srcTrack.blocks.splice(fromRefIndex, 1);
    if (!ref) return s;
    const clampedIdx = Math.max(0, Math.min(toRefIndex, dstTrack.blocks.length));
    dstTrack.blocks.splice(clampedIdx, 0, ref);
    return { ...s, composition: { ...s.composition, tracks } };
  });
}

/**
 * Reorder a block reference within a track by moving it from one index to another.
 *
 * Implements the drag-to-reorder behavior: splices the ref out of `fromIndex`
 * and inserts at `toIndex` (adjusted after the splice).
 *
 * Prototype: block `pointerup` handler (lines 2036–2037):
 *   `const cur = t.blocks.indexOf(ref); t.blocks.splice(cur,1);
 *    if(newIdx>cur) newIdx--; t.blocks.splice(newIdx, 0, ref);`.
 *
 * @param trackIndex - Zero-based index of the track.
 * @param fromIndex  - Current index of the block reference.
 * @param toIndex    - Target index (before adjustment).
 */
export function reorderBlockInTrack(trackIndex: number, fromIndex: number, toIndex: number): void {
  sessionStore.update((s) => {
    const tracks = s.composition.tracks.map((t, i) => {
      if (i !== trackIndex) return t;
      const blocks = [...t.blocks];
      const [ref] = blocks.splice(fromIndex, 1);
      let dest = toIndex;
      if (dest > fromIndex) dest--;
      blocks.splice(dest, 0, ref);
      return { ...t, blocks };
    });
    return { ...s, composition: { ...s.composition, tracks } };
  });
}

// ── Step 07.2: session load from persistence ───────────────────────────────

/**
 * Apply a validated SavedSession to the store, assigning fresh block/track IDs.
 *
 * Uses module-level _blkSeq/_trkSeq (ADR 0009: ephemeral, not persisted).
 * Rebuilds Track.blocks[].blockId from SavedBlockRef.blockIndex → new block ID.
 * Out-of-range blockIndex refs (corrupt data) are silently skipped.
 * Resets nowPlaying to { label: null, source: null }.
 *
 * @param saved - Validated SavedSession from loadSavedSession() or decodeSession().
 */
export function applyLoadedSession(saved: SavedSession): void {
  const newBlocks = saved.composition.blocks.map((b) => ({
    id: 'b' + _blkSeq++,
    name: b.name,
    type: b.type,
    code: b.code,
    bars: b.bars,
  }));

  const newTracks = saved.composition.tracks.map((t) => ({
    id: 't' + _trkSeq++,
    blocks: t.blockRefs
      .map((ref) => {
        const block = newBlocks[ref.blockIndex];
        if (!block) return null; // guard: out-of-range blockIndex
        return { blockId: block.id, bars: ref.bars };
      })
      .filter((r): r is { blockId: string; bars: number } => r !== null),
  }));

  sessionStore.update((s) => ({
    ...s,
    bpm: saved.bpm,
    view: saved.view,
    chordMode: saved.chordMode,
    harmony: {
      root: saved.harmony.root,
      mode: saved.harmony.mode,
      octave: saved.harmony.octave,
      // ADR 0012 D4: SavedHarmonySchema.progression is now a union; narrow on isRest.
      progression: saved.harmony.progression.map((slot): ProgressionSlot => {
        if ('isRest' in slot) {
          return slot.bars !== undefined
            ? { isRest: true as const, bars: slot.bars }
            : { isRest: true as const };
        }
        return {
          rootPc: slot.rootPc,
          qual: slot.qual,
          gain: slot.gain,
          ...(slot.bars !== undefined ? { bars: slot.bars } : {}),
          // ADR 0018 D3: restore sound attributes when present in the saved session.
          ...(slot.instrument !== undefined ? { instrument: slot.instrument } : {}),
          ...(slot.room !== undefined ? { room: slot.room } : {}),
          ...(slot.decay !== undefined ? { decay: slot.decay } : {}),
        };
      }),
      // Phase 08 (step 08.5): ephemeral fields NOT persisted — always reset to defaults.
      subview: s.harmony.subview,
      registerMode: s.harmony.registerMode,
    },
    rhythm: {
      layers: saved.rhythm.layers.map((l) => {
        const layer: RhythmLayer = { sound: l.sound, steps: [...l.steps] };
        if (l.euclid !== undefined) layer.euclid = l.euclid;
        if (l.muted !== undefined) layer.muted = l.muted;
        if (l.solo !== undefined) layer.solo = l.solo;
        return layer;
      }),
    },
    composition: { blocks: newBlocks, tracks: newTracks },
    nowPlaying: { label: null, source: null },
    lastRecipeApplied: undefined, // ephemeral reset (A-04-06 — ADR 0022 D7 pattern)
  }));
}

/**
 * Play the composition by building the Strudel code and calling `runNow`.
 *
 * Handles resume-from-pause: if `compState === 'paused'`, computes an adjusted
 * `compStart` timestamp so playback resumes from `compPausedBars` without
 * resetting the playhead to bar 0.
 *
 * Side effects:
 * - Calls `buildComposition(blocks, tracks)` from `core/composition/model.ts`.
 * - Calls `audio.runNow(code)`.
 * - Calls `setNowPlaying('Composición', 'composition')`.
 * - Calls `setCompPlaying(start)` from `composition.ts`.
 *
 * Prototype: `playComposition()` (lines 2093–2103).
 *
 * @returns Promise that resolves when playback is initiated.
 */
export async function playComposition(): Promise<void> {
  const state = get(sessionStore);
  const { blocks, tracks } = state.composition;
  const code = buildComposition(blocks, tracks);
  if (!code) return;
  const a = await getAudio();
  await a.initAudio();
  // Compute adjusted start: resume from pause position or start fresh.
  // Prototype lines 2098–2100:
  //   compStart = (compState==='paused')
  //     ? performance.now() - compPausedBars*(240000/currentBpm)
  //     : performance.now();
  const currentBpm = get(sessionStore).bpm;
  const start =
    getCompState() === 'paused'
      ? performance.now() - getCompPausedBars() * (240000 / currentBpm)
      : performance.now();
  setCompPlaying(start);
  await a.runNow(code);
  setNowPlaying('session.playing.composition', 'composition');
}

/**
 * Pause the composition playback.
 *
 * Saves the current bar position via `compPos()`, calls `hush()`, transitions
 * to 'paused' state, and updates the now-playing label to 'Composición · pausa'.
 *
 * No-op if `compState !== 'playing'`.
 *
 * Prototype: `pauseComposition()` (lines 2104–2110).
 */
export async function pauseComposition(): Promise<void> {
  if (getCompState() !== 'playing') return;
  const state = get(sessionStore);
  const { blocks, tracks } = state.composition;
  // Compute totalBars inline to pass to compPos.
  let tb = 0;
  tracks.forEach((t) => {
    let sum = 0;
    t.blocks.forEach((ref) => {
      const b = blocks.find((x) => x.id === ref.blockId);
      if (b) sum += ref.bars;
    });
    if (sum > tb) tb = sum;
  });
  const { pos } = compPos(state.bpm, Math.max(tb, 1));
  setCompPaused(pos);
  const a = await getAudio();
  a.hush();
  // Update nowPlaying label only (keep source = 'composition').
  sessionStore.update((s) => ({
    ...s,
    nowPlaying: { label: 'session.playing.compositionPaused', source: 'composition' },
  }));
}

/**
 * Stop the composition playback and reset the playhead to bar 0.
 *
 * Calls `hush()`, transitions to 'stopped' state, and clears `nowPlaying`.
 *
 * Prototype: `stopComposition()` (lines 2112–2115).
 */
export async function stopComposition(): Promise<void> {
  const a = await getAudio();
  a.hush();
  setCompStopped();
  setNowPlaying(null, null);
}

/**
 * Open a saved block in its corresponding editor view by restoring its snapshot.
 *
 * Per ADR 0020 D6:
 * 1. Finds the block by id in `composition.blocks`.
 * 2. If the block is not found, returns (no-op, no error).
 * 3. If `block.snapshot === undefined`, returns (no-op, no error, no view switch).
 * 4. Calls the appropriate restore function from `src/core/composition/snapshot.ts`.
 * 5. Writes the resulting `Partial<SessionState>` delta into `sessionStore`, preserving
 *    ephemeral harmony fields (subview, registerMode) from the current state.
 * 6. Switches the active view to 'rhythm' (groove) or 'harmony' (armonia/sesion).
 *
 * Does NOT auto-play, does NOT touch `state.bpm`, does NOT clear the composition
 * track list. The user resumes playback manually.
 *
 * New in Phase 01 step 01.5 (editable-composition initiative) — ADR 0020 D6.
 *
 * @param blockId - The `id` of the block to open (e.g. 'b1').
 */
export function openBlock(blockId: string): void {
  const state = get(sessionStore);
  const block = state.composition.blocks.find((b) => b.id === blockId);
  // Guard: block not found (D6 §2).
  if (!block) return;
  // Guard: snapshot absent — legacy block, no edit action (D6 §3 / D4).
  if (block.snapshot === undefined) return;

  const snapshot = block.snapshot;
  let delta: Partial<SessionState>;
  let targetView: SessionState['view'];

  if (snapshot.type === 'groove') {
    delta = restoreGrooveSnapshot(snapshot);
    targetView = 'rhythm';
  } else if (snapshot.type === 'armonia') {
    delta = restoreArmoniaSnapshot(snapshot);
    targetView = 'harmony';
  } else {
    // 'sesion' — composite; harmony is the lead view (D6 §6)
    delta = restoreSesionSnapshot(snapshot);
    targetView = 'harmony';
  }

  // Preserve the current ephemeral harmony fields (subview, registerMode) so
  // openBlock does not inadvertently reset the user's Tonnetz/staff preference.
  // The restoreArmoniaSnapshot returns default ephemeral values; we override
  // them here with the live store values before writing the delta.
  sessionStore.update((s) => {
    const mergedDelta = { ...delta };
    if (mergedDelta.harmony !== undefined) {
      mergedDelta.harmony = {
        ...mergedDelta.harmony,
        subview: s.harmony.subview,
        registerMode: s.harmony.registerMode,
      };
    }
    return { ...s, ...mergedDelta, view: targetView };
  });

  // Call stage.setView via lazy import (mirrors setView pattern in step 09.3).
  void getStage().then((m) => m.setView(targetView));
}
