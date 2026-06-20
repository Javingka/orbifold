// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Autopilot timer: start/stop the autonomous evolution loop.
//
// ai-jam Phase 01 step 01.3.
//
// Fires sendEvolution() on a BPM-derived setInterval when the autopilot is
// enabled. Guards against overlapping LLM calls (_isEvolving flag) and
// against firing when audio is not playing (lazy isPlaying() check).
//
// ADR 0022 D2: intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles)
// ADR 0022 D3: _isEvolving flag prevents overlapping calls
// ADR 0022 D5: BPM read from get(sessionStore).bpm (NOT strudel.ts private _currentBpm)
// ADR 0022 D6: isPlaying() dynamic import keeps this file unit-testable in Node
//
// A-06-07 fix: nowPlaying.label subscription drives timerStartedAt on playback
// start. If audio is already playing when startAutopilot() is called, the bar
// starts filling immediately. Otherwise the subscription fires as soon as
// nowPlaying.label becomes non-null (first play action after autopilot start).
//
// No DOM imports. No Svelte component imports. Unit-testable in Node with fake timers.

import { get } from 'svelte/store';

import { sessionStore, setAutopilot } from '../state/session.js';
import { sendEvolution } from './agent.js';

/**
 * True while a sendEvolution() call is in flight.
 * Guards against overlapping LLM calls when the user's network is slow
 * or intervalCycles is set very low (e.g., 2 cycles at low BPM).
 *
 * Per ADR 0022 D3.
 */
let _isEvolving = false;

/** Module-level setInterval handle. Null when autopilot is stopped. */
let _timerId: ReturnType<typeof setInterval> | null = null;

/**
 * Unsubscribe handle for the nowPlaying watcher.
 * Null when autopilot is stopped or not subscribed.
 *
 * Set by startAutopilot(); cleared by stopAutopilot().
 * Allows the bar to start filling as soon as playback begins, even if
 * the first tick boundary hasn't arrived yet (A-06-07 fix).
 */
let _playbackUnsub: (() => void) | null = null;

/**
 * Autopilot tick function. Called by setInterval on every interval boundary.
 * Skips if already evolving (concurrency guard) or audio is not playing (D6).
 *
 * Per ADR 0022 D3/D6.
 */
async function tick(): Promise<void> {
  if (!get(sessionStore).autopilot.enabled) return;
  if (_isEvolving) return;

  // Use nowPlaying.label as the bar gate (synchronous, no dynamic import needed).
  // If audio has stopped, reset bar to 0 and exit without calling sendEvolution.
  const nowLabel = get(sessionStore).nowPlaying.label;
  if (nowLabel === null) {
    setAutopilot({ timerStartedAt: 0 }); // audio stopped — reset bar
    return;
  }

  // Reset bar for the upcoming interval.
  // OD-1 Option A: timerStartedAt lives in AutopilotState in sessionStore.
  setAutopilot({ timerStartedAt: Date.now() });

  // Engine-level guard: only evolve if Strudel is actually rendering (ADR 0022 D6).
  // Dynamic import keeps autopilot.ts unit-testable in Node
  // (strudel.ts has DOM/WebAudio dependencies that fail in Node).
  const { isPlaying } = await import('../audio/strudel.js');
  if (!isPlaying()) return;

  _isEvolving = true;
  sendEvolution()
    .catch(() => {
      // sendEvolution logs its own errors; swallow here to always reset the flag
    })
    .finally(() => {
      _isEvolving = false;
    });
}

/**
 * Start the autopilot timer.
 *
 * Clears any existing timer before creating a new one (idempotent restart).
 * Reads BPM and intervalCycles from sessionStore at call time (ADR 0022 D5).
 * Computes intervalMs per ADR 0022 D2 formula.
 *
 * A-06-07 fix: if audio is already playing when this is called, sets
 * timerStartedAt immediately so the progress bar starts filling right away.
 * Otherwise keeps timerStartedAt at 0 and subscribes to sessionStore to detect
 * when nowPlaying.label becomes non-null (first play action after autopilot start).
 *
 * Per ADR 0022 D2.
 */
export function startAutopilot(): void {
  if (_timerId !== null) {
    clearInterval(_timerId);
    _timerId = null;
  }
  // Clean up any prior subscription before creating a new one.
  if (_playbackUnsub !== null) {
    _playbackUnsub();
    _playbackUnsub = null;
  }

  const session = get(sessionStore);
  const { bpm, autopilot } = session;
  const intervalMs = Math.round(((60000 * 4) / bpm) * autopilot.intervalCycles);

  // If audio is already playing, start bar immediately.
  // Otherwise keep bar at 0 and let the subscription kick it in when audio begins.
  const alreadyPlaying = session.nowPlaying.label !== null;
  setAutopilot({ timerStartedAt: alreadyPlaying ? Date.now() : 0 });

  // Subscribe: when nowPlaying becomes non-null while bar is at 0, start bar.
  // Condition `timerStartedAt === 0` prevents double-setting when bar is already filling.
  _playbackUnsub = sessionStore.subscribe((s) => {
    if (s.autopilot.enabled && s.autopilot.timerStartedAt === 0 && s.nowPlaying.label !== null) {
      setAutopilot({ timerStartedAt: Date.now() });
    }
  });

  _timerId = setInterval(tick, intervalMs);
}

/**
 * Stop the autopilot timer and reset the evolving flag.
 *
 * Clears _timerId, sets to null, resets _isEvolving to false, and cleans up
 * the nowPlaying subscription (_playbackUnsub).
 * If a tick is mid-flight, the in-flight sendEvolution() call is NOT
 * cancelled (no AbortController in Phase 01); it resolves but no further
 * ticks fire (timer is cleared).
 *
 * Per ADR 0022 D3.
 */
export function stopAutopilot(): void {
  if (_timerId !== null) {
    clearInterval(_timerId);
    _timerId = null;
  }
  if (_playbackUnsub !== null) {
    _playbackUnsub();
    _playbackUnsub = null;
  }
  _isEvolving = false;
  // Reset timerStartedAt so the progress bar returns to 0 when stopped.
  // OD-1 Option A: timerStartedAt in AutopilotState (sessionStore).
  // NOTE: `enabled` is NOT set here — callers (UI handler) set enabled via
  // setAutopilot({ enabled: false }) separately, per ADR 0022 D2 ordering contract.
  setAutopilot({ timerStartedAt: 0 });
}
