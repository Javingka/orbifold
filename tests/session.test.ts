// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — session store parity tests (step 02.2, A-02-09).
//
// Verifies that the session store's pure code-derivation helpers produce
// byte-identical Strudel strings to calling the Phase 01 core/codegen
// functions directly with the same inputs.
//
// Prototype parity citations:
//   melodyLine:      prototype lines 765–773
//   rhythmToStrudel: prototype lines 833–836
//   buildSession:    prototype lines 1470–1476
//   setNowPlaying:   prototype lines 1477–1486
//   requeueLive:     prototype lines 1307–1315
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.
// The svelte/store `get()` helper reads a writable store synchronously in Node.

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

// Core codegen functions (the source of truth post-Phase-01).
import {
  melodyLine,
  rhythmToStrudel,
  buildSession,
  chordToStrudel,
} from '../src/core/codegen/strudel.js';
import type { RhythmLayer } from '../src/core/rhythm/layers.js';

// Session store module under test.
import {
  sessionStore,
  DEFAULT_SESSION_STATE,
  rhythmCode,
  harmonyCode,
  sessionCode,
  setNowPlaying,
  setBpm,
  requeueLive,
  setChordBars,
  clampBars,
} from '../src/state/session.js';
import type { SessionState, Chord } from '../src/state/session.js';

// ── Test fixtures ──────────────────────────────────────────────────────────

/** A 4-on-the-floor BD layer (hits on steps 0, 4, 8, 12). */
const BD_LAYER: RhythmLayer = {
  sound: 'bd',
  steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
};

/** A snare-on-2-and-4 SD layer. */
const SD_LAYER: RhythmLayer = {
  sound: 'sd',
  steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
};

/** C major chord with default gain. */
const C_MAJ: Chord = { rootPc: 0, qual: 'maj', gain: 0.6 };

/** A minor chord with default gain. */
const A_MIN: Chord = { rootPc: 9, qual: 'min', gain: 0.6 };

/** A session state with BD+SD rhythm and C-major + A-minor progression. */
function makePopulatedState(): SessionState {
  return {
    ...DEFAULT_SESSION_STATE,
    rhythm: { layers: [BD_LAYER, SD_LAYER] },
    harmony: {
      root: 0,
      mode: 'major',
      octave: 3,
      progression: [C_MAJ, A_MIN],
    },
  };
}

// Reset the store to the default state before each test.
beforeEach(() => {
  sessionStore.set(DEFAULT_SESSION_STATE);
});

// ── rhythmCode() parity ────────────────────────────────────────────────────
// Prototype: rhythmToStrudel() call lines 1493–1498.

describe('rhythmCode() parity with rhythmToStrudel', () => {
  it('returns the same string as calling rhythmToStrudel directly — BD+SD layers', () => {
    const state = makePopulatedState();
    const expected = rhythmToStrudel(state.rhythm.layers);
    expect(rhythmCode(state)).toBe(expected);
  });

  it('returns empty string when layers array is empty (matches rhythmToStrudel)', () => {
    const state: SessionState = { ...DEFAULT_SESSION_STATE, rhythm: { layers: [] } };
    const expected = rhythmToStrudel([]);
    expect(rhythmCode(state)).toBe(expected);
    expect(rhythmCode(state)).toBe('');
  });

  it('returns the same string as rhythmToStrudel for a euclidean layer', () => {
    const hhLayer: RhythmLayer = { sound: 'hh', euclid: '5,8', steps: [] };
    const state: SessionState = { ...DEFAULT_SESSION_STATE, rhythm: { layers: [hhLayer] } };
    const expected = rhythmToStrudel([hhLayer]);
    expect(rhythmCode(state)).toBe(expected);
  });

  it('returns empty string when all layers are muted (matches rhythmToStrudel)', () => {
    const mutedBd: RhythmLayer = { ...BD_LAYER, muted: true };
    const state: SessionState = { ...DEFAULT_SESSION_STATE, rhythm: { layers: [mutedBd] } };
    const expected = rhythmToStrudel([mutedBd]);
    expect(rhythmCode(state)).toBe(expected);
    expect(rhythmCode(state)).toBe('');
  });
});

// ── harmonyCode() parity ───────────────────────────────────────────────────
// Prototype: melodyLine() call lines 1499–1504.

describe('harmonyCode() parity with melodyLine', () => {
  it('returns the same string as calling melodyLine directly — C-maj + A-min', () => {
    const state = makePopulatedState();
    const expected = melodyLine(state.harmony.progression, state.chordMode, state.harmony.octave);
    expect(harmonyCode(state)).toBe(expected);
  });

  it('returns empty string when progression is empty (matches melodyLine)', () => {
    const state: SessionState = {
      ...DEFAULT_SESSION_STATE,
      harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: [] },
    };
    const expected = melodyLine([], state.chordMode, state.harmony.octave);
    expect(harmonyCode(state)).toBe(expected);
    expect(harmonyCode(state)).toBe('');
  });

  it('returns the same string as melodyLine in arp mode', () => {
    const state: SessionState = {
      ...makePopulatedState(),
      chordMode: 'arp',
    };
    const expected = melodyLine(state.harmony.progression, 'arp', state.harmony.octave);
    expect(harmonyCode(state)).toBe(expected);
  });

  it('uses explicit gain values matching melodyLine', () => {
    const chordWithGain: Chord = { rootPc: 0, qual: 'maj', gain: 0.8 };
    const state: SessionState = {
      ...DEFAULT_SESSION_STATE,
      harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: [chordWithGain] },
    };
    const expected = melodyLine([chordWithGain], state.chordMode, state.harmony.octave);
    expect(harmonyCode(state)).toBe(expected);
    expect(harmonyCode(state)).toContain('0.80');
  });
});

// ── sessionCode() parity ───────────────────────────────────────────────────
// Prototype: buildSession() call lines 1470–1476.

describe('sessionCode() parity with buildSession', () => {
  it('returns the same string as calling buildSession directly — BD+SD + C-maj+A-min', () => {
    const state = makePopulatedState();
    const expected = buildSession(
      state.rhythm.layers,
      state.harmony.progression,
      state.chordMode,
      state.harmony.octave
    );
    expect(sessionCode(state)).toBe(expected);
  });

  it('returns empty string when both rhythm and harmony are empty', () => {
    const state = DEFAULT_SESSION_STATE;
    const expected = buildSession([], [], state.chordMode, state.harmony.octave);
    expect(sessionCode(state)).toBe(expected);
    expect(sessionCode(state)).toBe('');
  });

  it('rhythm-only session omits melody line (matches buildSession)', () => {
    const state: SessionState = {
      ...DEFAULT_SESSION_STATE,
      rhythm: { layers: [BD_LAYER] },
    };
    const expected = buildSession([BD_LAYER], [], state.chordMode, state.harmony.octave);
    expect(sessionCode(state)).toBe(expected);
    expect(sessionCode(state)).not.toContain('note(');
  });

  it('harmony-only session includes melody line (matches buildSession)', () => {
    const state: SessionState = {
      ...DEFAULT_SESSION_STATE,
      harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: [C_MAJ] },
    };
    const expected = buildSession([], [C_MAJ], state.chordMode, state.harmony.octave);
    expect(sessionCode(state)).toBe(expected);
    expect(sessionCode(state)).toContain('note(');
  });

  it('includes session header comment (byte-exact prototype invariant)', () => {
    const state = makePopulatedState();
    expect(sessionCode(state)).toContain('// ── Sesión: ritmo + armonía (geometría) ──');
  });
});

// ── setNowPlaying store mutation ───────────────────────────────────────────
// Prototype: setNowPlaying (lines 1477–1486), DOM manipulation stripped.

describe('setNowPlaying', () => {
  it('updates nowPlaying.label and nowPlaying.source in the store', () => {
    setNowPlaying('Ritmo · groove', 'rhythm');
    const state = get(sessionStore);
    expect(state.nowPlaying.label).toBe('Ritmo · groove');
    expect(state.nowPlaying.source).toBe('rhythm');
  });

  it('clears nowPlaying when called with (null, null)', () => {
    // Set a value first, then clear it.
    setNowPlaying('Ritmo · groove', 'rhythm');
    setNowPlaying(null, null);
    const state = get(sessionStore);
    expect(state.nowPlaying.label).toBeNull();
    expect(state.nowPlaying.source).toBeNull();
  });

  it('does not mutate other store fields', () => {
    const before = get(sessionStore);
    setNowPlaying('Armonía · progresión', 'harmony');
    const after = get(sessionStore);
    expect(after.bpm).toBe(before.bpm);
    expect(after.chordMode).toBe(before.chordMode);
    expect(after.view).toBe(before.view);
  });

  it('reflects each source value correctly', () => {
    const sources: Array<[string | null, 'rhythm' | 'harmony' | 'session' | 'chord' | null]> = [
      ['Sesión', 'session'],
      ['Acorde', 'chord'],
      [null, null],
    ];
    for (const [label, source] of sources) {
      setNowPlaying(label, source);
      const s = get(sessionStore);
      expect(s.nowPlaying.label).toBe(label);
      expect(s.nowPlaying.source).toBe(source);
    }
  });
});

// ── setBpm store mutation ──────────────────────────────────────────────────
// Prototype: currentBpm global (line 585); setBpm/setTempo lines 653–668.
// In step 02.2 this is state-only; audio re-eval is wired in step 02.4.

describe('setBpm', () => {
  it('updates bpm in the store', () => {
    setBpm(90);
    expect(get(sessionStore).bpm).toBe(90);
  });

  it('stores arbitrary BPM values', () => {
    setBpm(160);
    expect(get(sessionStore).bpm).toBe(160);
  });

  it('does not mutate other store fields', () => {
    const before = get(sessionStore);
    setBpm(140);
    const after = get(sessionStore);
    expect(after.view).toBe(before.view);
    expect(after.chordMode).toBe(before.chordMode);
    expect(after.nowPlaying.label).toBe(before.nowPlaying.label);
  });
});

// ── requeueLive() returns correct code string ──────────────────────────────
// Prototype: requeueLive() lines 1307–1315.
//   source='rhythm'  → rhythmToStrudel()
//   source='session' → buildSession()
//   source='harmony' → melodyLine().trim()
//   source='chord'   → chordToStrudel(last chord in progression)

describe('requeueLive()', () => {
  it("returns rhythmCode result when source='rhythm'", () => {
    // Populate the store with rhythm layers.
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      rhythm: { layers: [BD_LAYER, SD_LAYER] },
      nowPlaying: { label: 'Ritmo', source: 'rhythm' },
    });
    const expected = rhythmToStrudel([BD_LAYER, SD_LAYER]);
    expect(requeueLive()).toBe(expected);
  });

  it("returns sessionCode result when source='session'", () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      rhythm: { layers: [BD_LAYER] },
      harmony: { root: 0, mode: 'major', octave: 3, progression: [C_MAJ] },
      nowPlaying: { label: 'Sesión', source: 'session' },
    });
    const expected = buildSession([BD_LAYER], [C_MAJ], 'chord', 3);
    expect(requeueLive()).toBe(expected);
  });

  it("returns harmonyCode trimmed when source='harmony'", () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      harmony: { root: 0, mode: 'major', octave: 3, progression: [C_MAJ, A_MIN] },
      nowPlaying: { label: 'Armonía', source: 'harmony' },
    });
    // Prototype line 1312: code = melodyLine().trim()
    const expected = melodyLine([C_MAJ, A_MIN], 'chord', 3).trim();
    expect(requeueLive()).toBe(expected);
  });

  it("returns chordToStrudel for the last chord when source='chord'", () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      chordMode: 'chord',
      harmony: { root: 0, mode: 'major', octave: 3, progression: [C_MAJ, A_MIN] },
      nowPlaying: { label: 'Acorde', source: 'chord' },
    });
    // Prototype line 1313: last chord in progression
    const expected = chordToStrudel(A_MIN.rootPc, A_MIN.qual, A_MIN.gain, 'chord', 3);
    expect(requeueLive()).toBe(expected);
  });

  it('returns null when source is null (nothing playing)', () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      nowPlaying: { label: null, source: null },
    });
    expect(requeueLive()).toBeNull();
  });

  it("returns null when source='rhythm' but layers are empty (no audible pattern)", () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      rhythm: { layers: [] },
      nowPlaying: { label: 'Ritmo', source: 'rhythm' },
    });
    // rhythmToStrudel([]) returns '' → requeueLive returns null
    expect(requeueLive()).toBeNull();
  });

  it("returns null when source='chord' but progression is empty", () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: [] },
      nowPlaying: { label: 'Acorde', source: 'chord' },
    });
    expect(requeueLive()).toBeNull();
  });
});

// ── setChordBars — out-of-range no-op (Planner review note, step 02.3) ────
// Verifies that setChordBars silently ignores indices outside the progression
// bounds, leaving the store unchanged. Also covers clampBars.

describe('setChordBars', () => {
  it('out-of-range index is a no-op: store unchanged for index === progression.length', () => {
    // Progression has 1 chord; valid indices are 0 only. Index 1 must be ignored.
    const initial: SessionState = {
      ...DEFAULT_SESSION_STATE,
      harmony: {
        ...DEFAULT_SESSION_STATE.harmony,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6 }],
      },
    };
    sessionStore.set(initial);
    const before = get(sessionStore);
    // Call with out-of-range index — must be a no-op.
    setChordBars(1, 2);
    const after = get(sessionStore);
    expect(after.harmony.progression).toEqual(before.harmony.progression);
  });

  it('out-of-range negative index is a no-op', () => {
    const initial: SessionState = {
      ...DEFAULT_SESSION_STATE,
      harmony: {
        ...DEFAULT_SESSION_STATE.harmony,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6 }],
      },
    };
    sessionStore.set(initial);
    setChordBars(-1, 2);
    const after = get(sessionStore);
    expect(after.harmony.progression[0].bars).toBeUndefined();
  });

  it('valid index updates bars via clampBars', () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      harmony: {
        ...DEFAULT_SESSION_STATE.harmony,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6 }],
      },
    });
    setChordBars(0, 2.3); // nearest 0.5 → 2.5, within [0.5,8]
    const after = get(sessionStore);
    expect(after.harmony.progression[0].bars).toBe(clampBars(2.3));
    expect(after.harmony.progression[0].bars).toBe(2.5);
  });
});
