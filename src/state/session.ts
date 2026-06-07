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

import type { Quality } from '../core/theory/chords.js';
import type { RhythmLayer } from '../core/rhythm/layers.js';
import type { Composition } from '../core/composition/model.js';
import {
  chordToStrudel,
  melodyLine,
  rhythmToStrudel,
  buildSession,
} from '../core/codegen/strudel.js';
import { chordLabel } from '../core/theory/chords.js';

// ── Lazy audio loader ──────────────────────────────────────────────────────
// @strudel/web accesses window at module-evaluation time (dist/index.mjs line
// 14806: `window.initStrudel = rD`). A static import would execute that code in
// Node (Vitest), causing "window is not defined". Lazy loading defers the import
// until the first transport call (which only ever happens in a browser).
//
// The Promise is cached so repeated calls to getAudio() pay import cost once.

type AudioModule = typeof import('../audio/strudel.js');
let _audioPromise: Promise<AudioModule> | null = null;

function getAudio(): Promise<AudioModule> {
  if (!_audioPromise) {
    _audioPromise = import('../audio/strudel.js');
  }
  return _audioPromise;
}

// ── Sub-types ──────────────────────────────────────────────────────────────

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
}

/**
 * Harmony sub-state: root scale / key, octave, and chord progression.
 *
 * Prototype reference: `melState` global (lines 717, usage throughout).
 */
export interface HarmonyState {
  root: number; // pitch class 0–11; default 0 (C)
  mode: string; // 'major' | 'minor' | other SCALE_INTERVALS keys
  octave: number; // default 3
  progression: Chord[]; // ordered list; empty = silent
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
  label: string | null;
  source:
    | 'rhythm'
    | 'harmony'
    | 'session'
    | 'chord'
    | 'composition'
    | 'preview'
    | 'agent'
    | 'editor'
    | null;
}

/**
 * The single source of truth for the application session.
 *
 * Matches ORBIFOLD_KICKOFF.md §5 `SessionState` exactly.
 * Prototype reference: bpm (line 585), view/chordMode (line 897), etc.
 */
export interface SessionState {
  bpm: number; // 40–280; default 120
  view: 'rhythm' | 'harmony' | 'composition' | 'session'; // default 'harmony'
  chordMode: 'chord' | 'arp'; // default 'chord'
  harmony: HarmonyState;
  rhythm: RhythmState;
  composition: Composition; // imported from core/composition/model.ts
  nowPlaying: NowPlaying;
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
    octave: 3,
    progression: [],
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
 */
export function setNowPlaying(label: string | null, source: NowPlaying['source']): void {
  sessionStore.update((s) => ({
    ...s,
    nowPlaying: { label, source },
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
 * Calls audio.runNow(code) and sets nowPlaying to 'Ritmo · groove'.
 *
 * Prototype: `rhythmPlay.onclick` handler, lines 1493–1498.
 */
export async function playGroove(): Promise<void> {
  const state = get(sessionStore);
  const code = rhythmCode(state);
  if (!code) return;
  const a = await getAudio();
  await a.runNow(code);
  setNowPlaying('Ritmo · groove', 'rhythm');
}

/**
 * Play the chord progression (harmony line).
 *
 * If harmonyCode() returns '', this is a no-op.
 * The prototype trims the melody line before calling runNow (line 1502).
 *
 * Prototype: `progPlay.onclick` handler, lines 1499–1504.
 */
export async function playProgression(): Promise<void> {
  const state = get(sessionStore);
  const code = harmonyCode(state).trim();
  if (!code) return;
  const a = await getAudio();
  await a.runNow(code);
  setNowPlaying('Armonía · progresión', 'harmony');
}

/**
 * Play the full session (rhythm + harmony stacked).
 *
 * If sessionCode() returns '', this is a no-op.
 *
 * Prototype: `sessionPlay.onclick` handler, lines 1487–1492.
 */
export async function playSession(): Promise<void> {
  const state = get(sessionStore);
  const code = sessionCode(state);
  if (!code) return;
  const a = await getAudio();
  await a.runNow(code);
  setNowPlaying('Sesión · ritmo + armonía', 'session');
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
export function requeueLive(): string | null {
  const state = get(sessionStore);
  const { source } = state.nowPlaying;

  if (source === 'rhythm') {
    const code = rhythmCode(state);
    if (!code) return null;
    // Wired in step 02.4: lazy-load audio and queue if playing.
    void getAudio().then((a) => {
      if (a.isPlaying()) void a.queueForNextCycle(code);
    });
    return code;
  }
  if (source === 'session') {
    const code = sessionCode(state);
    if (!code) return null;
    void getAudio().then((a) => {
      if (a.isPlaying()) void a.queueForNextCycle(code);
    });
    return code;
  }
  if (source === 'harmony') {
    // Prototype line 1312: code = melodyLine().trim()
    const code = harmonyCode(state).trim();
    if (!code) return null;
    void getAudio().then((a) => {
      if (a.isPlaying()) void a.queueForNextCycle(code);
    });
    return code;
  }
  if (source === 'chord') {
    // Prototype line 1313: last chord in progression
    const progression = state.harmony.progression;
    const ch = progression[progression.length - 1];
    if (!ch) return null;
    const code = chordToStrudel(ch.rootPc, ch.qual, ch.gain, state.chordMode, state.harmony.octave);
    void getAudio().then((a) => {
      if (a.isPlaying()) void a.queueForNextCycle(code);
    });
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
export function playChord(rootPc: number, qual: Quality, gain: number): void {
  const state = get(sessionStore);
  const code = chordToStrudel(rootPc, qual, gain, state.chordMode, state.harmony.octave);
  const label = 'Acorde · ' + chordLabel(rootPc, qual);
  // Fire and forget — audio is lazy-loaded; runNow resolves async.
  void getAudio().then((a) => a.runNow(code));
  setNowPlaying(label, 'chord');
}
