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

// Persistence schema — used to verify A-03-08 backward-compatibility.
import { SavedSessionSchema } from '../src/lib/persistence.js';

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
  barsLabel,
  reorderSlot,
  addBlock,
  addBlockAsNewTrack,
  removeTrack,
} from '../src/state/session.js';
import type { SessionState, Chord, ProgressionSlot } from '../src/state/session.js';

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
      ...DEFAULT_SESSION_STATE.harmony,
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
      harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: [C_MAJ] },
      nowPlaying: { label: 'Sesión', source: 'session' },
    });
    const expected = buildSession(
      [BD_LAYER],
      [C_MAJ],
      'chord',
      DEFAULT_SESSION_STATE.harmony.octave
    );
    expect(requeueLive()).toBe(expected);
  });

  it("returns harmonyCode trimmed when source='harmony'", () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: [C_MAJ, A_MIN] },
      nowPlaying: { label: 'Armonía', source: 'harmony' },
    });
    // Prototype line 1312: code = melodyLine().trim()
    const expected = melodyLine(
      [C_MAJ, A_MIN],
      'chord',
      DEFAULT_SESSION_STATE.harmony.octave
    ).trim();
    expect(requeueLive()).toBe(expected);
  });

  it("returns chordToStrudel for the last chord when source='chord'", () => {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      chordMode: 'chord',
      harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: [C_MAJ, A_MIN] },
      nowPlaying: { label: 'Acorde', source: 'chord' },
    });
    // Prototype line 1313: last chord in progression
    const expected = chordToStrudel(
      A_MIN.rootPc,
      A_MIN.qual,
      A_MIN.gain,
      'chord',
      DEFAULT_SESSION_STATE.harmony.octave
    );
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
    setChordBars(0, 2.3); // nearest 0.25 → 2.25, within [0.25,8]
    const after = get(sessionStore);
    expect(after.harmony.progression[0].bars).toBe(clampBars(2.3));
    expect(after.harmony.progression[0].bars).toBe(2.25);
  });
});

// ── clampBars — Phase 03 granularity 0.25 (A-03-06) ─────────────────────────
// Acceptance criterion A-03-06: unit tests for the new 0.25-step clamping.

describe('clampBars — 0.25 granularity (A-03-06)', () => {
  it('returns 0.25 exactly for input 0.25 (no rounding needed)', () => {
    expect(clampBars(0.25)).toBe(0.25);
  });

  it('clamps 0.1 to the minimum 0.25 (below lower bound)', () => {
    expect(clampBars(0.1)).toBe(0.25);
  });

  it('rounds 0.3 to 0.25 (nearest 0.25)', () => {
    // Math.round(0.3 * 4) / 4 = Math.round(1.2) / 4 = 1 / 4 = 0.25
    expect(clampBars(0.3)).toBe(0.25);
  });

  it('rounds 0.4 to 0.5 (nearest 0.25)', () => {
    // Math.round(0.4 * 4) / 4 = Math.round(1.6) / 4 = 2 / 4 = 0.5
    expect(clampBars(0.4)).toBe(0.5);
  });

  it('clamps 8.1 to 8 (above upper bound)', () => {
    expect(clampBars(8.1)).toBe(8);
  });
});

// ── barsLabel — Phase 03 quarter fractions (A-03-07) ────────────────────────
// Acceptance criterion A-03-07: unit tests for the new ¼×, ¾×, etc. labels.

describe('barsLabel — quarter fractions (A-03-07)', () => {
  it('returns ¼× for 0.25', () => {
    expect(barsLabel(0.25)).toBe('¼×');
  });

  it('returns ½× for 0.5 (unchanged from Phase 02)', () => {
    expect(barsLabel(0.5)).toBe('½×');
  });

  it('returns ¾× for 0.75', () => {
    expect(barsLabel(0.75)).toBe('¾×');
  });

  it('returns 1¼× for 1.25', () => {
    expect(barsLabel(1.25)).toBe('1¼×');
  });

  it("returns '' for 1 (default — no label shown)", () => {
    expect(barsLabel(1)).toBe('');
  });

  it("returns '' for undefined", () => {
    expect(barsLabel(undefined)).toBe('');
  });

  it('returns 2× for 2 (whole-number, no fraction)', () => {
    expect(barsLabel(2)).toBe('2×');
  });

  it('returns 1½× for 1.5', () => {
    expect(barsLabel(1.5)).toBe('1½×');
  });
});

// ── SavedChordSchema backward-compat — bars: 0.5 (A-03-08) ──────────────────
// Acceptance criterion A-03-08: a session saved with bars: 0.5 (the old minimum)
// must still parse successfully against the updated schema (min is now 0.25).
// Note: schema is now v5 (editable-composition Phase 01 step 01.4 bumped from 4 to 5 — ADR 0020 D5).

describe('SavedChordSchema backward-compat — bars: 0.5 (A-03-08)', () => {
  it('safeParse succeeds for a chord with bars: 0.5 (old minimum)', () => {
    const result = SavedSessionSchema.safeParse({
      version: 6,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6, bars: 0.5 }],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    });
    expect(result.success).toBe(true);
  });

  it('safeParse succeeds for a chord with bars: 0.25 (new minimum)', () => {
    const result = SavedSessionSchema.safeParse({
      version: 6,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6, bars: 0.25 }],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    });
    expect(result.success).toBe(true);
  });

  it('safeParse succeeds for a chord without bars (backward-compat for old sessions)', () => {
    const result = SavedSessionSchema.safeParse({
      version: 6,
      bpm: 120,
      view: 'harmony',
      chordMode: 'chord',
      harmony: {
        root: 0,
        mode: 'major',
        octave: 3,
        progression: [{ rootPc: 0, qual: 'maj', gain: 0.6 }],
      },
      rhythm: { layers: [] },
      composition: { blocks: [], tracks: [] },
    });
    expect(result.success).toBe(true);
  });
});

// ── reorderSlot — Phase 10 step 10.3 (A-10-12) ───────────────────────────────
// Verifies that reorderSlot correctly reorders progression slots, clamps out-of-range
// indices, is a no-op when fromIdx === toIdx, and calls requeueLive() indirectly
// (observable by the store state changing).
//
// Note: requeueLive() calls into the audio module via dynamic import. In the test
// environment there is no audio module loaded, so the requeueLive() side-effect
// (queueing audio) is not directly observable. We verify the store state change
// instead — this is the same pattern used by setChordBars tests above.
//
// ADR 0014 D5. Phase 10 (step 10.3).

describe('reorderSlot — A-10-12', () => {
  // Fixtures: three distinct chords to track their reordering.
  const SLOT_A: Chord = { rootPc: 0, qual: 'maj', gain: 0.6 }; // C major
  const SLOT_B: Chord = { rootPc: 4, qual: 'min', gain: 0.6 }; // E minor
  const SLOT_C: Chord = { rootPc: 7, qual: 'maj', gain: 0.6 }; // G major

  function setProgression(slots: ProgressionSlot[]): void {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: slots },
    });
  }

  function getProgression(): ProgressionSlot[] {
    return get(sessionStore).harmony.progression;
  }

  it('move first to last: [A,B,C] reorderSlot(0,2) → [B,C,A]', () => {
    setProgression([SLOT_A, SLOT_B, SLOT_C]);
    reorderSlot(0, 2);
    expect(getProgression()).toEqual([SLOT_B, SLOT_C, SLOT_A]);
  });

  it('move last to first: [A,B,C] reorderSlot(2,0) → [C,A,B]', () => {
    setProgression([SLOT_A, SLOT_B, SLOT_C]);
    reorderSlot(2, 0);
    expect(getProgression()).toEqual([SLOT_C, SLOT_A, SLOT_B]);
  });

  it('adjacent swap forward: [A,B,C] reorderSlot(0,1) → [B,A,C]', () => {
    setProgression([SLOT_A, SLOT_B, SLOT_C]);
    reorderSlot(0, 1);
    expect(getProgression()).toEqual([SLOT_B, SLOT_A, SLOT_C]);
  });

  it('adjacent swap backward: [A,B,C] reorderSlot(1,0) → [B,A,C]', () => {
    setProgression([SLOT_A, SLOT_B, SLOT_C]);
    reorderSlot(1, 0);
    expect(getProgression()).toEqual([SLOT_B, SLOT_A, SLOT_C]);
  });

  it('no-op when fromIdx === toIdx: [A,B,C] reorderSlot(1,1) → [A,B,C] unchanged', () => {
    setProgression([SLOT_A, SLOT_B, SLOT_C]);
    const before = [...getProgression()];
    reorderSlot(1, 1);
    expect(getProgression()).toEqual(before);
  });

  it('no-op when both indices clamp to same value: reorderSlot(0,0) on single-slot', () => {
    setProgression([SLOT_A]);
    const before = [...getProgression()];
    reorderSlot(0, 0);
    expect(getProgression()).toEqual(before);
  });

  it('clamps out-of-range fromIdx above: reorderSlot(99,0) clamps to [2,0]', () => {
    setProgression([SLOT_A, SLOT_B, SLOT_C]);
    reorderSlot(99, 0);
    // clampedFrom=2 (clamped from 99), clampedTo=0 → moves slot C to front
    expect(getProgression()).toEqual([SLOT_C, SLOT_A, SLOT_B]);
  });

  it('clamps out-of-range toIdx above: reorderSlot(0,99) clamps to [0,2]', () => {
    setProgression([SLOT_A, SLOT_B, SLOT_C]);
    reorderSlot(0, 99);
    // clampedFrom=0, clampedTo=2 (clamped from 99) → moves slot A to end
    expect(getProgression()).toEqual([SLOT_B, SLOT_C, SLOT_A]);
  });

  it('no-op on empty progression: reorderSlot(0,1) leaves store unchanged', () => {
    setProgression([]);
    const before = [...getProgression()];
    reorderSlot(0, 1);
    expect(getProgression()).toEqual(before);
    expect(getProgression().length).toBe(0);
  });
});

// ── addBlockAsNewTrack — phantom track regression (Checkpoint #5 bug-fix) ──────
// Regression test for: delete-last-track + addBlockAsNewTrack → TWO tracks.
//
// Root cause: removeTrack's "keep-at-least-one" guard auto-creates an empty
// placeholder track. A subsequent addBlockAsNewTrack must reuse that placeholder
// instead of appending a second track.
//
// ai-composition-authoring Phase 01, Checkpoint #5 bug-fix.

describe('addBlockAsNewTrack — phantom track regression', () => {
  // addBlock requires non-empty rhythm layers to produce code; seed a minimal layer.
  const SEED_LAYER: RhythmLayer = {
    sound: 'bd',
    steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  };

  function seedGrooveState(): void {
    sessionStore.set({
      ...DEFAULT_SESSION_STATE,
      rhythm: { layers: [SEED_LAYER] },
    });
  }

  function getTracks() {
    return get(sessionStore).composition.tracks;
  }

  it('creates exactly ONE track when addBlockAsNewTrack is called on a fresh store', () => {
    seedGrooveState();
    addBlock('groove');
    const blocks = get(sessionStore).composition.blocks;
    expect(blocks.length).toBe(1);
    addBlockAsNewTrack(blocks[0].id);
    expect(getTracks().length).toBe(1);
    expect(getTracks()[0].blocks.length).toBe(1);
  });

  it('delete-last-track then addBlockAsNewTrack → still ONE track (no phantom)', () => {
    // Step 1: add a groove block and put it in a new track.
    seedGrooveState();
    addBlock('groove');
    const blocks1 = get(sessionStore).composition.blocks;
    addBlockAsNewTrack(blocks1[0].id);
    expect(getTracks().length).toBe(1);

    // Step 2: user deletes that track — removeTrack auto-creates empty placeholder.
    removeTrack(0);
    // After deletion, exactly one empty placeholder track should exist.
    expect(getTracks().length).toBe(1);
    expect(getTracks()[0].blocks.length).toBe(0);

    // Step 3: agent calls addBlock + addBlockAsNewTrack again.
    addBlock('groove');
    const blocks2 = get(sessionStore).composition.blocks;
    const newBlock = blocks2[blocks2.length - 1];
    addBlockAsNewTrack(newBlock.id);

    // Must result in ONE track with the block, not two (one empty + one populated).
    const tracks = getTracks();
    expect(tracks.length).toBe(1);
    expect(tracks[0].blocks.length).toBe(1);
    expect(tracks[0].blocks[0].blockId).toBe(newBlock.id);
  });

  it('does NOT reuse placeholder when existing track already has blocks', () => {
    // Two tracks already exist (one with content, one empty placeholder).
    seedGrooveState();
    addBlock('groove');
    const blocks = get(sessionStore).composition.blocks;
    addBlockAsNewTrack(blocks[0].id); // track with content
    // Manually add a second empty track to simulate a second placeholder.
    sessionStore.update((s) => ({
      ...s,
      composition: {
        ...s.composition,
        tracks: [...s.composition.tracks, { id: 't_placeholder', blocks: [] }],
      },
    }));
    expect(getTracks().length).toBe(2);

    // Adding another block should create a THIRD track (not reuse, since first track is non-empty).
    addBlock('groove');
    const allBlocks = get(sessionStore).composition.blocks;
    const newestBlock = allBlocks[allBlocks.length - 1];
    addBlockAsNewTrack(newestBlock.id);

    // 2 existing tracks + 1 new = 3 tracks
    expect(getTracks().length).toBe(3);
  });
});
