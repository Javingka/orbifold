// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — reactive session store: SessionState types, default state,
//             Svelte writable store, pure code-derivation helpers, and
//             transport stubs (audio wiring added in step 02.4).
//
// Ported from reference/orbifold.html:
//   SessionState / HarmonyState / RhythmState globals: lines 582–585, 717, 815–819, 897
//   setNowPlaying: lines 1477–1486
//   requeueLive:   lines 1307–1315
//   rhythmCode ←  rhythmToStrudel call: lines 1493–1498
//   harmonyCode ← melodyLine call:      lines 1499–1504
//   sessionCode ← buildSession call:    lines 1470–1476
//
// This file imports from src/core/** and svelte/store ONLY.
// It must NOT import from src/audio/** (audio wiring is step 02.4).
// Core engines are framework-agnostic and unit-testable in Node (Vitest).

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

// ── Transport stubs (state-only; audio wiring is step 02.4) ───────────────
// These stubs update the store or derive code. They do NOT call the audio layer.
//
// Prototype reference: setNowPlaying (lines 1477–1486), requeueLive (lines 1307–1315).

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
 * Update the BPM value in the session store.
 *
 * In step 02.2 this is a state-only update.
 * Audio re-evaluation (setTempo) is wired in step 02.4.
 *
 * Prototype: `currentBpm` global (line 585); setBpm/setTempo lines 653–668.
 */
export function setBpm(bpm: number): void {
  sessionStore.update((s) => ({ ...s, bpm }));
}

/**
 * Derive the code string for whatever is currently playing, for re-queuing.
 *
 * Reads the current store state, determines the source, derives the right
 * code string, and RETURNS it. In step 02.2 this is a stub that only returns
 * the code without calling the audio layer. Audio queuing (queueForNextCycle)
 * is wired in step 02.4.
 *
 * Returns null when nothing is playing or source is unrecognised.
 *
 * Prototype: `requeueLive()` lines 1307–1315.
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
    return code || null;
  }
  if (source === 'session') {
    const code = sessionCode(state);
    return code || null;
  }
  if (source === 'harmony') {
    // Prototype line 1312: code = melodyLine().trim()
    const code = harmonyCode(state).trim();
    return code || null;
  }
  if (source === 'chord') {
    // Prototype line 1313: last chord in progression
    const progression = state.harmony.progression;
    const ch = progression[progression.length - 1];
    if (!ch) return null;
    return chordToStrudel(ch.rootPc, ch.qual, ch.gain, state.chordMode, state.harmony.octave);
  }

  return null;
}
