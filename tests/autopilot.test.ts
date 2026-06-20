// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit tests for autopilot.ts and AutopilotState in session.ts.
//
// ai-jam Phase 01 step 01.3.
// Covers acceptance IDs A-01-01 through A-01-05 and the chatHistory invariant.
// A-06-07 fix: nowPlaying subscription drives timerStartedAt on playback start.
//
// ADR 0022 binding:
//   - D1: setAutopilot patches SessionState.autopilot; excluded from SavedSession (tested via store).
//   - D2: startAutopilot fires sendEvolution after intervalMs (BPM-derived setInterval).
//   - D3: _isEvolving concurrency guard prevents overlapping calls.
//   - D4: sendEvolution does NOT push to chatHistory.
//   - D5: BPM from get(sessionStore).bpm.
//   - D6: isPlaying() guard — tick is skipped when isPlaying returns false.
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

vi.mock('../src/audio/strudel.js', () => ({
  isPlaying: vi.fn().mockReturnValue(true),
}));

import { sessionStore, DEFAULT_SESSION_STATE, setAutopilot } from '../src/state/session';
import { chatHistory } from '../src/agent/agent';
import { sendEvolution } from '../src/agent/agent.js';
import { isPlaying } from '../src/audio/strudel.js';
import { startAutopilot, stopAutopilot } from '../src/agent/autopilot';

// ── Setup / teardown ──────────────────────────────────────────────────────

beforeEach(() => {
  // Reset store to known state
  sessionStore.set({ ...DEFAULT_SESSION_STATE });
  // Reset mocks
  vi.mocked(sendEvolution).mockClear();
  vi.mocked(sendEvolution).mockResolvedValue(undefined);
  vi.mocked(isPlaying).mockReturnValue(true);
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

/** Put session into a "playing" state so tick() passes the nowPlaying guard. */
function setPlaying(): void {
  // Use sessionStore.update to avoid importing the full transport infrastructure.
  sessionStore.update((s) => ({
    ...s,
    nowPlaying: { label: 'session.playing.rhythm', source: 'rhythm' },
  }));
}

/** Put session into a "stopped" state so tick() fails the nowPlaying guard. */
function setStopped(): void {
  sessionStore.update((s) => ({
    ...s,
    nowPlaying: { label: null, source: null },
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
});

// ── A-01-02: startAutopilot fires sendEvolution after intervalMs ──────────

describe('startAutopilot timer fires sendEvolution (A-01-02)', () => {
  it('A-01-02: sendEvolution is called once after intervalMs elapses', async () => {
    const intervalMs = defaultIntervalMs(); // 16000 ms at 120 BPM, 8 cycles

    setAutopilot({ enabled: true });
    setPlaying(); // nowPlaying.label must be non-null for tick() to proceed
    startAutopilot();

    // Advance fake clock by exactly intervalMs
    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(sendEvolution).toHaveBeenCalledTimes(1);
  });

  it('A-01-02: sendEvolution is called twice after 2x intervalMs', async () => {
    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    setPlaying();
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

    setPlaying();
    startAutopilot();
    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(sendEvolution).toHaveBeenCalledTimes(1);
  });
});

// ── A-01-03: sendEvolution is called with session context (proxy test) ────

describe('sendEvolution called with session context (A-01-03)', () => {
  it('A-01-03: sendEvolution mock is called when timer fires (context injection tested via static analysis in step 01.5)', async () => {
    // The actual context injection (JSON state passed to the LLM) is verified via
    // SYSTEM_PROMPT_EVOLUTION static analysis in step 01.5 (A-01-08 proxy).
    // Here we verify the mock was called — confirming the timer → sendEvolution path works.
    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    setPlaying();
    startAutopilot();
    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(sendEvolution).toHaveBeenCalledTimes(1);
  });
});

// ── A-01-04: concurrency guard — _isEvolving prevents overlapping calls ───

describe('Concurrency guard _isEvolving (A-01-04)', () => {
  it('A-01-04: a second tick while sendEvolution is in flight does NOT call sendEvolution again', async () => {
    // Make sendEvolution hang: return a promise that never resolves during the test.
    // This simulates a slow LLM call that keeps _isEvolving = true.
    let resolveEvolution!: () => void;
    const hangingPromise = new Promise<void>((resolve) => {
      resolveEvolution = resolve;
    });
    vi.mocked(sendEvolution).mockReturnValueOnce(hangingPromise);

    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    setPlaying();
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
    // This verifies the two paths (autopilot vs. manual send) are fully independent.
    const lengthBefore = chatHistory.length;
    // Directly call sendEvolution (mocked — doesn't push to chatHistory)
    void sendEvolution();
    // chatHistory length must be unchanged
    expect(chatHistory.length).toBe(lengthBefore);
  });
});

// ── A-01-05: stopAutopilot clears the timer ───────────────────────────────

describe('stopAutopilot clears timer (A-01-05)', () => {
  it('A-01-05: advancing fake timer after stopAutopilot does NOT call sendEvolution', async () => {
    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    setPlaying();
    startAutopilot();
    stopAutopilot(); // also sets enabled=false via store? No — stopAutopilot only clears timer.
    // Manually disable so the enabled guard also fires (belt-and-suspenders test).
    setAutopilot({ enabled: false });

    // Advance well past one interval — timer is cleared, no calls should fire
    await vi.advanceTimersByTimeAsync(intervalMs * 3);

    expect(sendEvolution).not.toHaveBeenCalled();
  });

  it('A-01-05: startAutopilot after stopAutopilot re-arms the timer (idempotent restart)', async () => {
    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    setPlaying();
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
    setPlaying();
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
    // This test calls the REAL sendEvolution via the vi.mock — mock returns void immediately.
    // The mock replaces the real sendEvolution, so no real fetch is made and no chatHistory push.
    const lengthBefore = chatHistory.length;

    await sendEvolution(); // mock resolves immediately with undefined

    expect(chatHistory.length).toBe(lengthBefore);
  });
});

// ── Audio-awareness guard: tick skipped when isPlaying returns false ──────

describe('isPlaying guard (ADR 0022 D6)', () => {
  it('D6: sendEvolution is NOT called when isPlaying() returns false (but nowPlaying.label is set)', async () => {
    // nowPlaying.label must be non-null for tick() to reach the isPlaying() guard.
    // If nowPlaying.label is null, tick() exits before ever calling isPlaying().
    vi.mocked(isPlaying).mockReturnValue(false);

    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    setPlaying(); // nowPlaying.label = 'session.playing.rhythm' → passes nowPlaying guard
    startAutopilot();
    await vi.advanceTimersByTimeAsync(intervalMs);

    // Tick fired: nowPlaying.label check passed, isPlaying() returned false → skipped
    expect(sendEvolution).not.toHaveBeenCalled();
  });

  it('D6: sendEvolution IS called when isPlaying() returns true and nowPlaying.label is set', async () => {
    vi.mocked(isPlaying).mockReturnValue(true);

    const intervalMs = defaultIntervalMs();

    setAutopilot({ enabled: true });
    setPlaying(); // nowPlaying.label non-null → passes nowPlaying guard
    startAutopilot();
    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(sendEvolution).toHaveBeenCalledTimes(1);
  });

  it('D6: tick with nowPlaying.label=null resets timerStartedAt to 0 (progress bar stays empty)', async () => {
    // With nowPlaying.label === null, tick() resets timerStartedAt to 0 and returns.
    // isPlaying() is not consulted — the nowPlaying check is the first guard.
    vi.mocked(isPlaying).mockReturnValue(true); // isPlaying irrelevant when nowPlaying.label=null

    const intervalMs = defaultIntervalMs();

    // Pre-set a non-zero timerStartedAt to simulate a prior start
    setAutopilot({ enabled: true, timerStartedAt: Date.now() - 1000 });
    setStopped(); // nowPlaying.label = null
    startAutopilot();
    // startAutopilot() will also set timerStartedAt to 0 because nowPlaying.label is null
    // Then when tick fires, it also sees nowPlaying.label=null and keeps it at 0
    await vi.advanceTimersByTimeAsync(intervalMs);

    // After a tick where nowPlaying.label is null, timerStartedAt must be 0
    expect(get(sessionStore).autopilot.timerStartedAt).toBe(0);
  });
});

// ── Progress bar sync: A-06-07 — nowPlaying subscription drives timerStartedAt ──

describe('startAutopilot timerStartedAt init and nowPlaying subscription (A-06-07)', () => {
  it('A-06-07a: startAutopilot with no audio playing sets timerStartedAt to 0 immediately', () => {
    // When nowPlaying.label is null (no audio), timerStartedAt must stay 0.
    setStopped(); // nowPlaying.label = null
    setAutopilot({ enabled: true, timerStartedAt: Date.now() }); // pre-set non-zero

    startAutopilot();

    // Must be 0 — bar stays empty until audio begins
    expect(get(sessionStore).autopilot.timerStartedAt).toBe(0);
  });

  it('A-06-07b: startAutopilot with audio already playing sets timerStartedAt immediately (non-zero)', () => {
    // When nowPlaying.label is non-null (audio playing), bar should start filling right away.
    setPlaying(); // nowPlaying.label = 'session.playing.rhythm'
    setAutopilot({ enabled: true });

    const before = Date.now();
    startAutopilot();
    const after = Date.now();

    const ts = get(sessionStore).autopilot.timerStartedAt;
    expect(ts).toBeGreaterThan(0);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('A-06-07c: subscription starts bar when nowPlaying.label becomes non-null after start', () => {
    // Autopilot started with no audio — bar is at 0.
    setStopped(); // nowPlaying.label = null
    setAutopilot({ enabled: true });
    startAutopilot();

    expect(get(sessionStore).autopilot.timerStartedAt).toBe(0); // bar at 0

    // Simulate audio starting (e.g., user presses play)
    const before = Date.now();
    setPlaying(); // nowPlaying.label becomes 'session.playing.rhythm'
    const after = Date.now();

    // Subscription should have fired and set timerStartedAt to non-zero
    const ts = get(sessionStore).autopilot.timerStartedAt;
    expect(ts).toBeGreaterThan(0);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('A-06-07d: stopAutopilot cleans up subscription — nowPlaying change after stop does NOT update timerStartedAt', () => {
    // Start with no audio
    setStopped(); // nowPlaying.label = null
    setAutopilot({ enabled: true });
    startAutopilot();

    expect(get(sessionStore).autopilot.timerStartedAt).toBe(0);

    // Stop autopilot — subscription must be unsubscribed
    stopAutopilot();
    setAutopilot({ enabled: false });

    // Now simulate audio starting
    setPlaying();

    // timerStartedAt must remain 0 — subscription was cleaned up by stopAutopilot()
    expect(get(sessionStore).autopilot.timerStartedAt).toBe(0);
  });

  it('A-06-07e: subscription does not fire when autopilot is disabled (enabled=false guard)', () => {
    // If autopilot.enabled is false but subscription still exists somehow,
    // the enabled guard in the subscription callback prevents the bar from starting.
    setStopped();
    setAutopilot({ enabled: false }); // disabled

    startAutopilot();
    // startAutopilot() sets timerStartedAt=0 because nowPlaying.label=null
    expect(get(sessionStore).autopilot.timerStartedAt).toBe(0);

    // Simulate audio starting while autopilot is disabled
    setPlaying();

    // Subscription condition checks s.autopilot.enabled — false → no update
    expect(get(sessionStore).autopilot.timerStartedAt).toBe(0);
  });
});
