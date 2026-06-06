// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Strudel audio bridge: init (user gesture), runNow,
//             queueForNextCycle, hush, setTempo (setcpm only).
//
// Ported from reference/orbifold.html:
//   State globals (strudelReady, currentCode, queuedCode, currentBpm): lines 582–585
//   initStrudel() call (deferred to user gesture per CLAUDE.md invariant): lines 600–603
//   runNow(code, opts):         lines 609–631
//   queueForNextCycle(code):    lines 632–643
//   tryLiveTempo():             lines 647–651
//   setBpm / setTempo:          lines 653–668
//   hush() usages:              lines 1507, 2107, 2113
//   isPlaying() ref:            line 898
//
// Design invariants (CLAUDE.md):
//   - Audio starts ONLY after a user gesture: initStrudel() is called inside
//     initAudio(), never at module load.
//   - Tempo uses setcpm EXCLUSIVELY — never setcps, .fast, or .slow.
//   - setcpm is NOT a named export; it is only available as
//     (globalThis as any).setcpm after the first evaluate() call.
//   - hush() and evaluate() ARE named exports from @strudel/web.
//   - No DOM imports; no top-level audio side-effects.

import { initStrudel, evaluate, hush as strudelHush } from '@strudel/web';
import { tempoWrap } from '../core/codegen/strudel.js';

// ── Module-level state ────────────────────────────────────────────────────────
// Mirrors prototype globals (lines 582–585), scoped to this module.

/** Whether initAudio() has completed successfully. */
let audioReady = false;

/** The current bare pattern string (no setcpm header). Empty = silent. */
let _currentCode = '';

/** The code queued for the next cycle (heuristic, cleared after apply). */
let _queuedCode: string | null = null;

/** Current BPM value; default 120 (prototype line 585). */
let _currentBpm = 120;

/** Debounce handle for re-evaluation on tempo change (prototype line 646). */
let _tempoDebounce: ReturnType<typeof setTimeout> | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialise the Strudel runtime.
 *
 * MUST be called from a user-gesture handler (click/keydown) — never at
 * module load. Idempotent: subsequent calls are no-ops when already ready.
 *
 * Ported from prototype lines 600–603, adapted per OD-4 resolution
 * (inventory §Open decisions surfaced): calling initStrudel() at module
 * load creates an AudioContext immediately, which browsers suspend before
 * a gesture. Deferring to the gesture avoids the 'suspended' state entirely.
 *
 * initStrudel() is synchronous but schedules async prebake internally;
 * evaluate() awaits the internal initDone promise, so calling runNow()
 * immediately after initAudio() is safe.
 */
export async function initAudio(): Promise<void> {
  if (audioReady) return;
  try {
    initStrudel({ prebake: () => Promise.resolve() });
    audioReady = true;
  } catch (initErr) {
    // eslint-disable-next-line no-console
    console.warn('Strudel no inicializó aún:', initErr);
  }
}

/**
 * Evaluate a Strudel pattern immediately.
 *
 * Calls evaluate(tempoWrap(code, bpm)); on error, falls back to
 * evaluate(code.trim()). Updates internal currentCode on success.
 * Returns { ok, error? }.
 *
 * Ported from prototype lines 609–631.
 */
export async function runNow(
  code: string,
  // opts reserved for forward compatibility (fromEditor, silent flags in prototype)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _opts?: { fromEditor?: boolean; silent?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  if (!audioReady) return { ok: false, error: 'motor no listo' };
  try {
    await evaluate(tempoWrap(code, _currentBpm));
    _currentCode = code;
    return { ok: true };
  } catch {
    try {
      await evaluate(code.trim());
      _currentCode = code;
      return { ok: true };
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      return { ok: false, error: msg };
    }
  }
}

/**
 * Queue a pattern to take effect at the next Strudel cycle boundary.
 *
 * Implements the ~250 ms setTimeout heuristic — the only option in
 * @strudel/web@1.0.3 (no cycle-boundary callback exists; confirmed by
 * inventory §OD-3 live-doc check).
 *
 * The stale-queue guard (comparing _queuedCode === code before applying)
 * matches prototype lines 636–640.
 *
 * Ported from prototype lines 632–643.
 */
export function queueForNextCycle(
  code: string,
  opts?: { fromEditor?: boolean; silent?: boolean }
): Promise<{ ok: boolean }> {
  _queuedCode = code;
  return new Promise((resolve) => {
    setTimeout(async () => {
      if (_queuedCode === code) {
        const r = await runNow(code, opts);
        _queuedCode = null;
        resolve(r);
      } else {
        resolve({ ok: true });
      }
    }, 250);
  });
}

/**
 * Silence all playing patterns.
 *
 * Calls the named hush() export from @strudel/web; clears currentCode.
 * The try/catch matches the prototype usage at lines 1507, 2107, 2113.
 *
 * Ported from prototype hush() usages (lines 1507, 2107, 2113).
 */
export function hush(): void {
  if (!audioReady) return;
  try {
    strudelHush();
  } catch {
    // intentional: prototype wraps hush() in try/catch (lines 1507, 2107, 2113)
  }
  _currentCode = '';
}

/**
 * Nudge the Strudel scheduler tempo without restarting.
 *
 * setcpm is NOT a named export — it is injected into globalThis by evalScope()
 * after the first evaluate() call (repl.mjs lines 69–70, 107–115).
 * Guard with typeof check exactly as prototype lines 650–651.
 *
 * The prototype's fallback to setcps (line 651) is intentionally omitted:
 * CLAUDE.md invariant — setcpm ONLY, never setcps.
 *
 * Ported from prototype lines 647–651 (setcps fallback removed per invariant).
 */
function tryLiveTempo(): void {
  if (!audioReady) return;
  try {
    // setcpm is injected into globalThis by evalScope() after the first evaluate()
    // call (repl.mjs lines 69–70, 107–115). It is NOT a named export.
    // Access pattern matches prototype lines 650–651.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (globalThis as any).setcpm === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).setcpm(_currentBpm / 4);
    }
  } catch {
    // best-effort; scheduler may not be running
  }
}

/**
 * Update BPM and propagate to the running pattern.
 *
 * 1. Clamps to [40, 280] and stores the value.
 * 2. Calls tryLiveTempo() to nudge the scheduler's cpm immediately.
 * 3. Debounces a full re-evaluate of currentCode at 130 ms to ensure the
 *    setcpm in tempoWrap takes effect on the next iteration (reliable path).
 *
 * Uses setcpm EXCLUSIVELY — never setcps, .fast, or .slow (CLAUDE.md).
 *
 * Ported from prototype lines 653–668 (DOM manipulation stripped;
 * compState/compPos playhead logic belongs to the composition layer,
 * deferred to Phase 03+).
 */
export function setTempo(bpm: number): void {
  _currentBpm = Math.max(40, Math.min(280, Math.round(bpm)));
  tryLiveTempo();
  if (audioReady && _currentCode) {
    if (_tempoDebounce !== null) clearTimeout(_tempoDebounce);
    _tempoDebounce = setTimeout(() => {
      void runNow(_currentCode);
    }, 130);
  }
}

/**
 * Whether audio is initialised and a pattern is currently playing.
 *
 * Prototype reference: `isPlaying()` / `strudelReady && currentCode !== ''`
 * (prototype line 898 context).
 */
export function isPlaying(): boolean {
  return audioReady && _currentCode !== '';
}

/**
 * Returns the current bare pattern string (without setcpm header).
 * Empty string when nothing is playing.
 *
 * Used by requeueLive() in the session store to decide whether to queue.
 */
export function currentCode(): string {
  return _currentCode;
}
