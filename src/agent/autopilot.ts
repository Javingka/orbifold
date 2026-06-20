// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Autopilot timer: start/stop the autonomous evolution loop.
//
// ai-jam Phase 01 step 01.3; revised Phase 06 heuristic fix.
//
// Fires sendEvolution() on a BPM-derived setInterval when the autopilot is
// enabled. Guards against overlapping LLM calls (_isEvolving flag).
//
// ADR 0022 D2: intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles)
// ADR 0022 D3: _isEvolving flag prevents overlapping calls
// ADR 0022 D5: BPM read from get(sessionStore).bpm (NOT strudel.ts private _currentBpm)
//
// Phase 06 heuristic fix:
//   - Bar starts filling immediately whenever autopilot is enabled — no more
//     nowPlaying.label or isPlaying() guards on the bar.
//   - If rhythm/harmony is configured but nothing is playing → auto-play is
//     triggered from startAutopilot().
//   - tick() sets lagWarning when a prior LLM call is still in flight.
//   - stopAutopilot() resets lagWarning and llmError.
//   - sendEvolution() now stores llmError on HTTP/provider failures.
//   - Dynamic import of isPlaying() and _playbackUnsub subscription removed.
//
// No DOM imports. No Svelte component imports. Unit-testable in Node with fake timers.

import { get } from 'svelte/store';

import {
  sessionStore,
  setAutopilot,
  playGroove,
  playProgression,
  playSession,
} from '../state/session.js';
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
 * Autopilot tick function. Called by setInterval on every interval boundary.
 *
 * If _isEvolving is true (prior LLM call still in flight), sets lagWarning
 * and returns without calling sendEvolution (concurrency guard, ADR 0022 D3).
 * Otherwise resets the bar for the new interval, clears warnings, and fires
 * sendEvolution asynchronously.
 *
 * Per ADR 0022 D3.
 */
async function tick(): Promise<void> {
  if (!get(sessionStore).autopilot.enabled) return;

  if (_isEvolving) {
    // LLM from previous interval still in flight — warn the user.
    setAutopilot({ lagWarning: true });
    return;
  }

  // Reset bar for the new interval; clear any prior warnings.
  setAutopilot({ timerStartedAt: Date.now(), lagWarning: false });

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
 * Bar starts filling immediately regardless of audio state.
 * If rhythm/harmony is configured but nothing is playing, auto-play is
 * triggered (fire-and-forget; no await — startAutopilot is sync).
 * If nothing is configured, the LLM will generate patterns on the first tick
 * and sendEvolution will auto-play after applying them.
 *
 * Per ADR 0022 D2.
 */
export function startAutopilot(): void {
  if (_timerId !== null) {
    clearInterval(_timerId);
    _timerId = null;
  }

  const session = get(sessionStore);
  const { bpm, autopilot } = session;
  const intervalMs = Math.round(((60000 * 4) / bpm) * autopilot.intervalCycles);

  // Bar fills immediately regardless of audio state.
  setAutopilot({ timerStartedAt: Date.now(), lagWarning: false, llmError: null });

  // If rhythm/harmony is configured but nothing playing → auto-play.
  if (session.nowPlaying.label === null) {
    const hasRhythm = session.rhythm.layers.length > 0;
    const hasHarmony = session.harmony.progression.length > 0;
    if (hasRhythm && hasHarmony) {
      playSession().catch(() => {}); // fire-and-forget; no await (startAutopilot is sync)
    } else if (hasRhythm) {
      playGroove().catch(() => {});
    } else if (hasHarmony) {
      playProgression().catch(() => {});
    }
    // If neither configured → LLM will generate on first tick; auto-play handled in sendEvolution.
  }

  _timerId = setInterval(tick, intervalMs);
}

/**
 * Stop the autopilot timer and reset the evolving flag.
 *
 * Clears _timerId, sets to null, resets _isEvolving to false, and resets
 * lagWarning, llmError, and timerStartedAt to their defaults.
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
  _isEvolving = false;
  // Reset timerStartedAt so the progress bar returns to 0 when stopped.
  // Also clear lag/error state so the UI is clean when autopilot restarts.
  // NOTE: `enabled` is NOT set here — callers (UI handler) set enabled via
  // setAutopilot({ enabled: false }) separately, per ADR 0022 D2 ordering contract.
  setAutopilot({ timerStartedAt: 0, lagWarning: false, llmError: null });
}
