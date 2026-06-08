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
import type { Sound } from '../core/rhythm/layers.js';
import { bjorklund, rotate, RSTEPS } from '../core/rhythm/euclid.js';
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
  setNowPlaying('Ritmo · groove', 'rhythm');
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
  setNowPlaying('Armonía · progresión', 'harmony');
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
    if (!ch) return null;
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
    if (!ch) return null;
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
export function playChord(rootPc: number, qual: Quality, gain: number): void {
  const state = get(sessionStore);
  const code = chordToStrudel(rootPc, qual, gain, state.chordMode, state.harmony.octave);
  const label = 'Acorde · ' + chordLabel(rootPc, qual);
  // Fire and forget — audio is lazy-loaded; initAudio() is idempotent.
  // initAudio() called here ensures the audio context is ready on the first chord pick
  // (a user gesture), without requiring a separate "Init audio" button.
  void getAudio().then((a) => a.initAudio().then(() => a.runNow(code)));
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
  setNowPlaying(`Vista previa · E(${k},${n})`, 'preview');
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
  setNowPlaying('Editor', 'editor');
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
