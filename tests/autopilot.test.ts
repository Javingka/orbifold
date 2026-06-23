// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit tests for autopilot.ts and AutopilotState in session.ts.
//
// ai-jam Phase 01 step 01.3; revised Phase 06 heuristic fix; Phase 07 step 07.4
// (plan-consumption tick loop — ADR 0024 D3).
//
// Covers acceptance IDs A-01-01 through A-01-05, A-06 heuristic tests, and
// A-07-06/07/08/09 plan-consumption tests.
//
// Phase 06 heuristic fix: removed isPlaying() guard (D6) and nowPlaying
// subscription (A-06-07a–e). Added lag warning and auto-play heuristic tests.
//
// Phase 07 plan-consumption (A-07-06/07/08/09):
//   - tick() applies one plan step per interval if plan is non-exhausted.
//   - tick() calls sendEvolution() when plan is exhausted or never set.
//   - startAutopilot() resets currentPlan and planIndex (stale-plan guard).
//   - stopAutopilot() resets currentPlan and planIndex.
//
// ADR 0022 binding:
//   - D1: setAutopilot patches SessionState.autopilot; excluded from SavedSession (tested via store).
//   - D2: startAutopilot fires sendEvolution after intervalMs (BPM-derived setInterval).
//   - D3: _isEvolving concurrency guard prevents overlapping calls; lagWarning set on second tick.
//   - D4: sendEvolution does NOT push to chatHistory.
//   - D5: BPM from get(sessionStore).bpm.
// ADR 0024 D3: plan-consumption loop; _isEvolving guards only LLM re-call path.
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
// and requeueLive that autopilot.ts calls for auto-play heuristics and audio re-queue.
vi.mock('../src/state/session.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/state/session.js')>();
  return {
    ...actual,
    playGroove: vi.fn().mockResolvedValue(undefined),
    playProgression: vi.fn().mockResolvedValue(undefined),
    playSession: vi.fn().mockResolvedValue(undefined),
    requeueLive: vi.fn().mockReturnValue(null),
  };
});

// Mock apply.js: applyRhythmSpec and applyHarmonySpec are tested in apply.test.ts.
// For autopilot plan-consumption tests, we only need to verify they are called.
vi.mock('../src/agent/apply.js', () => ({
  applyRhythmSpec: vi.fn(),
  applyHarmonySpec: vi.fn(),
}));

// Mock recipe engine: getRecipeById and recipeToAgentOutput — prevent catalog access in tests.
vi.mock('../src/core/music-knowledge/query.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/core/music-knowledge/query.js')>();
  return {
    ...actual,
    getRecipeById: vi.fn().mockReturnValue(undefined),
  };
});

vi.mock('../src/core/music-knowledge/recipe-engine.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/core/music-knowledge/recipe-engine.js')>();
  return {
    ...actual,
    recipeToAgentOutput: vi.fn().mockReturnValue(null),
  };
});

import { sessionStore, DEFAULT_SESSION_STATE, setAutopilot } from '../src/state/session';
import { playGroove, playProgression, playSession, requeueLive } from '../src/state/session';
import { chatHistory } from '../src/agent/agent';
import { sendEvolution } from '../src/agent/agent.js';
import { applyRhythmSpec, applyHarmonySpec } from '../src/agent/apply.js';
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
  vi.mocked(requeueLive).mockClear();
  vi.mocked(requeueLive).mockReturnValue(null);
  vi.mocked(applyRhythmSpec).mockClear();
  vi.mocked(applyHarmonySpec).mockClear();
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

// ── startAutopilot timerStartedAt — bar stays flat until first step applied ──
// Progress bar gates on timerStartedAt > 0. startAutopilot() intentionally
// sets timerStartedAt = 0 so the bar stays flat while the initial LLM call is
// in flight. timerStartedAt is set to Date.now() only in tick() Path A (step
// application), i.e. when the first audio step actually plays.

describe('startAutopilot timerStartedAt (bar stays flat until first step)', () => {
  it('startAutopilot sets timerStartedAt to 0 regardless of audio state', () => {
    setStopped(); // nowPlaying.label = null
    setAutopilot({ enabled: true });
    startAutopilot();
    expect(get(sessionStore).autopilot.timerStartedAt).toBe(0);
  });

  it('startAutopilot sets timerStartedAt to 0 even when audio is already playing', () => {
    setPlaying();
    setAutopilot({ enabled: true });
    startAutopilot();
    expect(get(sessionStore).autopilot.timerStartedAt).toBe(0);
  });

  it('stopAutopilot resets timerStartedAt to 0', () => {
    setAutopilot({ enabled: true, timerStartedAt: Date.now() }); // simulate mid-run state
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

// ── A-07-06: Plan consumption — one step per tick ─────────────────────────

/** Minimal rhythm-only AgentOutput step for use in plan tests. */
const rhythmStep = {
  rhythm: {
    layers: [{ sound: 'bd' as const, steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] }],
  },
};

/** Minimal harmony-only AgentOutput step for use in plan tests. */
const harmonyStep = {
  harmony: {
    root: 'C' as const,
    mode: 'minor' as const,
    octave: 3,
    progression: [{ root: 'C' as const, quality: 'min' as const }],
  },
};

describe('Plan consumption — one step per tick (A-07-06)', () => {
  it('A-07-06: tick() with a non-exhausted plan applies the current step, advances planIndex, does NOT call sendEvolution', async () => {
    const intervalMs = defaultIntervalMs();

    // Start the timer first, then inject the plan (simulates sendEvolution storing it)
    setAutopilot({ enabled: true });
    startAutopilot();

    // Inject a 2-step plan (as sendEvolution would do after an LLM call)
    setAutopilot({ currentPlan: [rhythmStep, harmonyStep], planIndex: 0 });

    // Advance one interval — tick() runs
    await vi.advanceTimersByTimeAsync(intervalMs);

    // applyRhythmSpec should have been called with the first step's rhythm
    expect(applyRhythmSpec).toHaveBeenCalledTimes(1);
    expect(applyRhythmSpec).toHaveBeenCalledWith(rhythmStep.rhythm);

    // sendEvolution should NOT have been called (plan had steps)
    expect(sendEvolution).not.toHaveBeenCalled();

    // planIndex should have advanced to 1
    expect(get(sessionStore).autopilot.planIndex).toBe(1);
  });

  it('A-07-06: tick() with plan at final step applies it and advances planIndex to length', async () => {
    const intervalMs = defaultIntervalMs();

    // Start timer, then inject plan with planIndex=1 (only second step remains)
    setAutopilot({ enabled: true });
    startAutopilot();
    setAutopilot({ currentPlan: [rhythmStep, harmonyStep], planIndex: 1 });

    await vi.advanceTimersByTimeAsync(intervalMs);

    // applyHarmonySpec called with second step's harmony
    expect(applyHarmonySpec).toHaveBeenCalledTimes(1);
    expect(applyHarmonySpec).toHaveBeenCalledWith(harmonyStep.harmony);

    // sendEvolution NOT called
    expect(sendEvolution).not.toHaveBeenCalled();

    // planIndex advances to 2 (= length)
    expect(get(sessionStore).autopilot.planIndex).toBe(2);
  });

  it('A-07-06: tick() calls requeueLive() when a step is applied', async () => {
    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    startAutopilot();
    setAutopilot({ currentPlan: [rhythmStep], planIndex: 0 });

    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(requeueLive).toHaveBeenCalledTimes(1);
  });

  it('A-07-06: two consecutive ticks consume two steps in order', async () => {
    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    startAutopilot();
    setAutopilot({ currentPlan: [rhythmStep, harmonyStep], planIndex: 0 });

    // First tick — consumes rhythmStep
    await vi.advanceTimersByTimeAsync(intervalMs);
    expect(applyRhythmSpec).toHaveBeenCalledTimes(1);
    expect(applyHarmonySpec).not.toHaveBeenCalled();
    expect(get(sessionStore).autopilot.planIndex).toBe(1);

    // Second tick — consumes harmonyStep
    await vi.advanceTimersByTimeAsync(intervalMs);
    expect(applyHarmonySpec).toHaveBeenCalledTimes(1);
    expect(get(sessionStore).autopilot.planIndex).toBe(2);

    // sendEvolution still not called (plan not yet exhausted until 3rd tick)
    expect(sendEvolution).not.toHaveBeenCalled();
  });
});

// ── A-07-07: Plan exhaustion triggers sendEvolution ──────────────────────

describe('Plan exhaustion triggers sendEvolution (A-07-07)', () => {
  it('A-07-07: tick() with exhausted plan (planIndex = currentPlan.length) calls sendEvolution', async () => {
    const intervalMs = defaultIntervalMs();

    // Start timer, then inject an already-exhausted plan (planIndex equals length)
    setAutopilot({ enabled: true });
    startAutopilot();
    setAutopilot({ currentPlan: [rhythmStep, harmonyStep], planIndex: 2 });

    await vi.advanceTimersByTimeAsync(intervalMs);

    // sendEvolution called, no apply functions
    expect(sendEvolution).toHaveBeenCalledTimes(1);
    expect(applyRhythmSpec).not.toHaveBeenCalled();
    expect(applyHarmonySpec).not.toHaveBeenCalled();
  });

  it('A-07-07: tick() with empty plan (initial state) calls sendEvolution', async () => {
    const intervalMs = defaultIntervalMs();

    // Default state: currentPlan = [], planIndex = 0 (startAutopilot preserves empty plan)
    setAutopilot({ enabled: true });
    startAutopilot();
    // currentPlan is already [] after startAutopilot — no plan injection needed

    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(sendEvolution).toHaveBeenCalledTimes(1);
    expect(applyRhythmSpec).not.toHaveBeenCalled();
  });

  it('A-07-07: tick() with _isEvolving=true (sendEvolution in flight) sets lagWarning and does NOT call sendEvolution again', async () => {
    // Make sendEvolution hang so _isEvolving stays true
    let resolveEvolution!: () => void;
    const hangingPromise = new Promise<void>((resolve) => {
      resolveEvolution = resolve;
    });
    vi.mocked(sendEvolution).mockReturnValueOnce(hangingPromise);

    const intervalMs = defaultIntervalMs();

    // Empty plan → first tick fires sendEvolution (hanging)
    setAutopilot({ enabled: true });
    startAutopilot();

    await vi.advanceTimersByTimeAsync(intervalMs);
    expect(sendEvolution).toHaveBeenCalledTimes(1);

    // Second tick fires while sendEvolution is still in flight
    await vi.advanceTimersByTimeAsync(intervalMs);
    expect(sendEvolution).toHaveBeenCalledTimes(1); // still 1, not 2
    expect(get(sessionStore).autopilot.lagWarning).toBe(true);

    // Clean up
    resolveEvolution();
  });

  it('A-07-07: planIndex resets to 0 when plan exhausted and sendEvolution is called', async () => {
    const intervalMs = defaultIntervalMs();

    // Start timer, inject a pre-exhausted plan
    setAutopilot({ enabled: true });
    startAutopilot();
    setAutopilot({ currentPlan: [rhythmStep], planIndex: 1 });

    await vi.advanceTimersByTimeAsync(intervalMs);

    // planIndex reset to 0 on exhaustion
    expect(get(sessionStore).autopilot.planIndex).toBe(0);
    expect(get(sessionStore).autopilot.currentPlan).toHaveLength(0);
    expect(sendEvolution).toHaveBeenCalledTimes(1);
  });
});

// ── A-07-08: startAutopilot resets plan fields ────────────────────────────

describe('startAutopilot resets plan fields (A-07-08)', () => {
  it('A-07-08: startAutopilot() resets currentPlan to [] regardless of prior stale plan', () => {
    // Seed a stale plan from a prior session
    setAutopilot({
      enabled: true,
      currentPlan: [rhythmStep, harmonyStep],
      planIndex: 1,
    });

    startAutopilot();

    const state = get(sessionStore).autopilot;
    expect(state.currentPlan).toHaveLength(0);
    expect(state.planIndex).toBe(0);
  });

  it('A-07-08: startAutopilot() called twice (idempotent restart) still resets plan each time', () => {
    setAutopilot({
      enabled: true,
      currentPlan: [rhythmStep],
      planIndex: 1,
    });

    startAutopilot(); // first call — resets plan
    // Inject a stale plan again
    setAutopilot({ currentPlan: [harmonyStep], planIndex: 1 });

    startAutopilot(); // second call — should reset again
    const state = get(sessionStore).autopilot;
    expect(state.currentPlan).toHaveLength(0);
    expect(state.planIndex).toBe(0);
  });
});

// ── A-07-09: stopAutopilot resets plan fields ─────────────────────────────

describe('stopAutopilot resets plan fields (A-07-09)', () => {
  it('A-07-09: stopAutopilot() resets currentPlan to [] and planIndex to 0', () => {
    setAutopilot({
      enabled: true,
      currentPlan: [rhythmStep, harmonyStep],
      planIndex: 2,
    });
    startAutopilot();

    stopAutopilot();

    const state = get(sessionStore).autopilot;
    expect(state.currentPlan).toHaveLength(0);
    expect(state.planIndex).toBe(0);
  });

  it('A-07-09: stopAutopilot() also resets lagWarning, llmError, and timerStartedAt', () => {
    setAutopilot({ enabled: true, lagWarning: true, llmError: 'err', timerStartedAt: 99999 });
    startAutopilot();
    stopAutopilot();

    const state = get(sessionStore).autopilot;
    expect(state.lagWarning).toBe(false);
    expect(state.llmError).toBeNull();
    expect(state.timerStartedAt).toBe(0);
    expect(state.currentPlan).toHaveLength(0);
    expect(state.planIndex).toBe(0);
  });

  it('A-07-09: DEFAULT_SESSION_STATE.autopilot includes currentPlan: [] and planIndex: 0', () => {
    const state = get(sessionStore).autopilot;
    expect(state.currentPlan).toHaveLength(0);
    expect(state.planIndex).toBe(0);
  });
});
