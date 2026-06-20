// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit tests for autopilot.ts and AutopilotState in session.ts.
//
// ai-jam Phase 01 step 01.3; revised Phase 06 heuristic fix.
//
// Covers acceptance IDs A-01-01 through A-01-05 and the chatHistory invariant.
// Phase 06 heuristic fix: removed isPlaying() guard (D6) and nowPlaying
// subscription (A-06-07a–e). Added lag warning and auto-play heuristic tests.
//
// ADR 0022 binding:
//   - D1: setAutopilot patches SessionState.autopilot; excluded from SavedSession (tested via store).
//   - D2: startAutopilot fires sendEvolution after intervalMs (BPM-derived setInterval).
//   - D3: _isEvolving concurrency guard prevents overlapping calls; lagWarning set on second tick.
//   - D4: sendEvolution does NOT push to chatHistory.
//   - D5: BPM from get(sessionStore).bpm.
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.
// Fake timers via vi.useFakeTimers() / vi.useRealTimers().

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mocks must be declared before module imports that depend on them.
// Use importOriginal to retain chatHistory (and other exports) while mocking sendEvolution.
vi.mock('../src/agent/agent.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/agent/agent.js')>();
  return {
    ...actual,
    sendEvolution: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock session.js: preserve the real store/actions, mock the play functions
// that autopilot.ts calls for auto-play heuristics.
vi.mock('../src/state/session.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/state/session.js')>();
  return {
    ...actual,
    playGroove: vi.fn().mockResolvedValue(undefined),
    playProgression: vi.fn().mockResolvedValue(undefined),
    playSession: vi.fn().mockResolvedValue(undefined),
  };
});

import { sessionStore, DEFAULT_SESSION_STATE, setAutopilot } from '../src/state/session';
import { playGroove, playProgression, playSession } from '../src/state/session';
import { chatHistory } from '../src/agent/agent';
import { sendEvolution } from '../src/agent/agent.js';
import { startAutopilot, stopAutopilot } from '../src/agent/autopilot';

// ── Setup / teardown ──────────────────────────────────────────────────────

beforeEach(() => {
  // Reset store to known state
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
  // Reset mocks
  vi.mocked(sendEvolution).mockClear();
  vi.mocked(sendEvolution).mockResolvedValue(undefined);
  vi.mocked(playGroove).mockClear();
  vi.mocked(playGroove).mockResolvedValue(undefined);
  vi.mocked(playProgression).mockClear();
  vi.mocked(playProgression).mockResolvedValue(undefined);
  vi.mocked(playSession).mockClear();
  vi.mocked(playSession).mockResolvedValue(undefined);
  // Stop any running timer from previous test
  stopAutopilot();
  // Use fake timers for timer-based tests
  vi.useFakeTimers();
});

afterEach(() => {
  stopAutopilot();
  vi.useRealTimers();
});

// ── Helper: compute intervalMs for default BPM (120) and intervalCycles (8) ──

function defaultIntervalMs(): number {
  const { bpm, autopilot } = get(sessionStore);
  return Math.round(((60000 * 4) / bpm) * autopilot.intervalCycles);
}

/** Put session into a "playing" state. */
function setPlaying(): void {
  sessionStore.update((s) => ({
    ...s,
    nowPlaying: { label: 'session.playing.rhythm', source: 'rhythm' },
  }));
}

/** Put session into a "stopped" state. */
function setStopped(): void {
  sessionStore.update((s) => ({
    ...s,
    nowPlaying: { label: null, source: null },
  }));
}

/** Add a rhythm layer to the store so hasRhythm is true. */
function addRhythmLayer(): void {
  sessionStore.update((s) => ({
    ...s,
    rhythm: {
      layers: [{ sound: 'bd' as const, steps: new Array(16).fill(1) as number[] }],
    },
  }));
}

/** Add a harmony chord to the store so hasHarmony is true. */
function addHarmonyChord(): void {
  sessionStore.update((s) => ({
    ...s,
    harmony: {
      ...s.harmony,
      progression: [{ rootPc: 0, qual: 'maj' as const, gain: 0.6 }],
    },
  }));
}

// ── A-01-01: setAutopilot store action ────────────────────────────────────

describe('setAutopilot store action (A-01-01)', () => {
  it('A-01-01: setAutopilot({ enabled: true }) sets sessionStore.autopilot.enabled to true', () => {
    expect(get(sessionStore).autopilot.enabled).toBe(false);
    setAutopilot({ enabled: true });
    expect(get(sessionStore).autopilot.enabled).toBe(true);
  });

  it('A-01-01: setAutopilot({ enabled: false }) sets sessionStore.autopilot.enabled back to false', () => {
    setAutopilot({ enabled: true });
    setAutopilot({ enabled: false });
    expect(get(sessionStore).autopilot.enabled).toBe(false);
  });

  it('A-01-01: setAutopilot({ intervalCycles: 4 }) updates only intervalCycles, leaves enabled unchanged', () => {
    setAutopilot({ enabled: true });
    setAutopilot({ intervalCycles: 4 });
    const state = get(sessionStore).autopilot;
    expect(state.intervalCycles).toBe(4);
    // enabled must be unchanged (still true from previous call)
    expect(state.enabled).toBe(true);
  });

  it('A-01-01: setAutopilot is a partial patch — other fields survive untouched', () => {
    // Default: { enabled: false, intervalCycles: 8 }
    setAutopilot({ intervalCycles: 16 });
    const state = get(sessionStore).autopilot;
    expect(state.intervalCycles).toBe(16);
    expect(state.enabled).toBe(false);
  });

  it('A-01-01: DEFAULT_SESSION_STATE.autopilot defaults to { enabled: false, intervalCycles: 8 }', () => {
    const state = get(sessionStore).autopilot;
    expect(state.enabled).toBe(false);
    expect(state.intervalCycles).toBe(8);
  });

  it('A-01-01: DEFAULT_SESSION_STATE.autopilot includes lagWarning: false and llmError: null', () => {
    const state = get(sessionStore).autopilot;
    expect(state.lagWarning).toBe(false);
    expect(state.llmError).toBeNull();
  });
});

// ── A-01-02: startAutopilot fires sendEvolution after intervalMs ──────────

describe('startAutopilot timer fires sendEvolution (A-01-02)', () => {
  it('A-01-02: sendEvolution is called once after intervalMs elapses', async () => {
    const intervalMs = defaultIntervalMs(); // 16000 ms at 120 BPM, 8 cycles

    setAutopilot({ enabled: true });
    startAutopilot();

    // Advance fake clock by exactly intervalMs
    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(sendEvolution).toHaveBeenCalledTimes(1);
  });

  it('A-01-02: sendEvolution is called twice after 2x intervalMs', async () => {
    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    startAutopilot();

    await vi.advanceTimersByTimeAsync(intervalMs * 2);

    expect(sendEvolution).toHaveBeenCalledTimes(2);
  });

  it('A-01-02: intervalMs formula is Math.round((60000 * 4 / bpm) * intervalCycles)', () => {
    // At 120 BPM, 8 cycles: (60000 * 4 / 120) * 8 = 16000
    sessionStore.set({ ...DEFAULT_SESSION_STATE });
    setAutopilot({ intervalCycles: 8 });
    expect(defaultIntervalMs()).toBe(16000);
  });

  it('A-01-02: startAutopilot respects custom intervalCycles', async () => {
    setAutopilot({ enabled: true, intervalCycles: 2 });
    const { bpm } = get(sessionStore);
    const intervalMs = Math.round(((60000 * 4) / bpm) * 2); // 4000 ms at 120 BPM

    startAutopilot();
    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(sendEvolution).toHaveBeenCalledTimes(1);
  });
});

// ── A-01-03: sendEvolution is called with session context (proxy test) ────

describe('sendEvolution called with session context (A-01-03)', () => {
  it('A-01-03: sendEvolution mock is called when timer fires', async () => {
    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    startAutopilot();
    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(sendEvolution).toHaveBeenCalledTimes(1);
  });
});

// ── A-01-04: concurrency guard — _isEvolving prevents overlapping calls ───

describe('Concurrency guard _isEvolving (A-01-04)', () => {
  it('A-01-04: a second tick while sendEvolution is in flight does NOT call sendEvolution again', async () => {
    // Make sendEvolution hang: return a promise that never resolves during the test.
    let resolveEvolution!: () => void;
    const hangingPromise = new Promise<void>((resolve) => {
      resolveEvolution = resolve;
    });
    vi.mocked(sendEvolution).mockReturnValueOnce(hangingPromise);

    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    startAutopilot();

    // Advance by one interval — first tick fires, sendEvolution called (returns hanging promise)
    await vi.advanceTimersByTimeAsync(intervalMs);
    expect(sendEvolution).toHaveBeenCalledTimes(1);

    // Advance by another interval — second tick fires but _isEvolving is still true → skipped
    await vi.advanceTimersByTimeAsync(intervalMs);
    // Still only 1 call (the second tick was skipped)
    expect(sendEvolution).toHaveBeenCalledTimes(1);

    // Clean up: resolve the hanging promise so _isEvolving resets
    resolveEvolution();
  });

  it('A-01-04: manual send() chat history is unaffected by autopilot concurrency guard', () => {
    // chatHistory is module-level state from agent.ts; autopilot never touches it.
    const lengthBefore = chatHistory.length;
    void sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });
});

// ── A-01-05: stopAutopilot clears the timer ───────────────────────────────

describe('stopAutopilot clears timer (A-01-05)', () => {
  it('A-01-05: advancing fake timer after stopAutopilot does NOT call sendEvolution', async () => {
    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    startAutopilot();
    stopAutopilot();
    setAutopilot({ enabled: false });

    // Advance well past one interval — timer is cleared, no calls should fire
    await vi.advanceTimersByTimeAsync(intervalMs * 3);

    expect(sendEvolution).not.toHaveBeenCalled();
  });

  it('A-01-05: startAutopilot after stopAutopilot re-arms the timer (idempotent restart)', async () => {
    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    startAutopilot();
    stopAutopilot();

    // Re-arm
    startAutopilot();
    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(sendEvolution).toHaveBeenCalledTimes(1);
  });

  it('A-01-05: calling startAutopilot twice creates only one timer (idempotent restart)', async () => {
    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    startAutopilot();
    startAutopilot(); // second call clears the first timer before creating a new one

    await vi.advanceTimersByTimeAsync(intervalMs);

    // Only one call, not two (the first timer was cleared)
    expect(sendEvolution).toHaveBeenCalledTimes(1);
  });
});

// ── chatHistory invariant: sendEvolution does NOT push to chatHistory ─────

describe('chatHistory invariant (ADR 0022 D4)', () => {
  it('chatHistory.length is unchanged before and after calling sendEvolution directly', async () => {
    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });
});

// ── startAutopilot timerStartedAt — bar fills immediately ─────────────────

describe('startAutopilot timerStartedAt (bar fills immediately)', () => {
  it('startAutopilot sets timerStartedAt to a non-zero value regardless of audio state', () => {
    setStopped(); // nowPlaying.label = null
    setAutopilot({ enabled: true });

    const before = Date.now();
    startAutopilot();
    const after = Date.now();

    const ts = get(sessionStore).autopilot.timerStartedAt;
    expect(ts).toBeGreaterThan(0);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('startAutopilot sets timerStartedAt to a non-zero value when audio is already playing', () => {
    setPlaying();
    setAutopilot({ enabled: true });

    const before = Date.now();
    startAutopilot();
    const after = Date.now();

    const ts = get(sessionStore).autopilot.timerStartedAt;
    expect(ts).toBeGreaterThan(0);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('stopAutopilot resets timerStartedAt to 0', () => {
    setAutopilot({ enabled: true });
    startAutopilot();
    expect(get(sessionStore).autopilot.timerStartedAt).toBeGreaterThan(0);
    stopAutopilot();
    expect(get(sessionStore).autopilot.timerStartedAt).toBe(0);
  });
});

// ── Auto-play heuristics: startAutopilot calls play when configured but not playing ──

describe('Auto-play heuristics in startAutopilot', () => {
  it('startAutopilot with nowPlaying.label=null and rhythm+harmony → playSession called', () => {
    setStopped();
    addRhythmLayer();
    addHarmonyChord();
    setAutopilot({ enabled: true });

    startAutopilot();

    expect(playSession).toHaveBeenCalledTimes(1);
    expect(playGroove).not.toHaveBeenCalled();
    expect(playProgression).not.toHaveBeenCalled();
  });

  it('startAutopilot with nowPlaying.label=null and rhythm only → playGroove called', () => {
    setStopped();
    addRhythmLayer();
    // No harmony
    setAutopilot({ enabled: true });

    startAutopilot();

    expect(playGroove).toHaveBeenCalledTimes(1);
    expect(playSession).not.toHaveBeenCalled();
    expect(playProgression).not.toHaveBeenCalled();
  });

  it('startAutopilot with nowPlaying.label=null and harmony only → playProgression called', () => {
    setStopped();
    // No rhythm
    addHarmonyChord();
    setAutopilot({ enabled: true });

    startAutopilot();

    expect(playProgression).toHaveBeenCalledTimes(1);
    expect(playSession).not.toHaveBeenCalled();
    expect(playGroove).not.toHaveBeenCalled();
  });

  it('startAutopilot with nowPlaying.label=null and no rhythm/harmony → no auto-play called', () => {
    setStopped();
    // No layers, no progression
    setAutopilot({ enabled: true });

    startAutopilot();

    expect(playSession).not.toHaveBeenCalled();
    expect(playGroove).not.toHaveBeenCalled();
    expect(playProgression).not.toHaveBeenCalled();
  });

  it('startAutopilot with audio already playing → no auto-play called', () => {
    setPlaying(); // nowPlaying.label = 'session.playing.rhythm'
    addRhythmLayer();
    addHarmonyChord();
    setAutopilot({ enabled: true });

    startAutopilot();

    expect(playSession).not.toHaveBeenCalled();
    expect(playGroove).not.toHaveBeenCalled();
    expect(playProgression).not.toHaveBeenCalled();
  });
});

// ── Lag warning: tick sets lagWarning when _isEvolving is true ───────────

describe('Lag warning (Phase 06 heuristic fix)', () => {
  it('tick() with _isEvolving=true sets lagWarning=true, sendEvolution NOT called a second time', async () => {
    // Make sendEvolution hang so _isEvolving stays true across intervals.
    let resolveEvolution!: () => void;
    const hangingPromise = new Promise<void>((resolve) => {
      resolveEvolution = resolve;
    });
    vi.mocked(sendEvolution).mockReturnValueOnce(hangingPromise);

    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    startAutopilot();

    // First tick: sendEvolution called, _isEvolving = true
    await vi.advanceTimersByTimeAsync(intervalMs);
    expect(sendEvolution).toHaveBeenCalledTimes(1);
    expect(get(sessionStore).autopilot.lagWarning).toBe(false); // not yet lagging

    // Second tick fires while _isEvolving is still true → lagWarning set
    await vi.advanceTimersByTimeAsync(intervalMs);
    expect(sendEvolution).toHaveBeenCalledTimes(1); // not called again
    expect(get(sessionStore).autopilot.lagWarning).toBe(true);

    // Clean up
    resolveEvolution();
  });

  it('stopAutopilot resets lagWarning to false', () => {
    setAutopilot({ enabled: true, lagWarning: true });
    startAutopilot();
    stopAutopilot();
    expect(get(sessionStore).autopilot.lagWarning).toBe(false);
  });

  it('startAutopilot clears lagWarning on restart', () => {
    setAutopilot({ enabled: true, lagWarning: true });
    startAutopilot();
    expect(get(sessionStore).autopilot.lagWarning).toBe(false);
  });
});

// ── llmError reset by stopAutopilot and startAutopilot ───────────────────

describe('llmError state management', () => {
  it('stopAutopilot resets llmError to null', () => {
    setAutopilot({ enabled: true, llmError: 'HTTP 401' });
    startAutopilot();
    stopAutopilot();
    expect(get(sessionStore).autopilot.llmError).toBeNull();
  });

  it('startAutopilot clears llmError', () => {
    setAutopilot({ enabled: true, llmError: 'Prior error' });
    startAutopilot();
    expect(get(sessionStore).autopilot.llmError).toBeNull();
  });
});
