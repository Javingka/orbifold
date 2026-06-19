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
// No DOM imports. No Svelte component imports. Unit-testable in Node with fake timers.

import { get } from 'svelte/store';

import { sessionStore } from '../state/session.js';
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
 * Skips if already evolving (concurrency guard) or audio is not playing (D6).
 *
 * Per ADR 0022 D3/D6.
 */
async function tick(): Promise<void> {
  if (!get(sessionStore).autopilot.enabled) return;
  if (_isEvolving) return;

  // Dynamic import keeps autopilot.ts unit-testable in Node
  // (strudel.ts has DOM/WebAudio dependencies that fail in Node)
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
 * Per ADR 0022 D2.
 */
export function startAutopilot(): void {
  if (_timerId !== null) {
    clearInterval(_timerId);
    _timerId = null;
  }
  const { bpm, autopilot } = get(sessionStore);
  const intervalMs = Math.round(((60000 * 4) / bpm) * autopilot.intervalCycles);
  _timerId = setInterval(tick, intervalMs);
}

/**
 * Stop the autopilot timer and reset the evolving flag.
 *
 * Clears _timerId, sets to null, and resets _isEvolving to false.
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
}
