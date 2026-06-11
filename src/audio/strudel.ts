// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Strudel audio bridge: init (user gesture), runNow,
//             queueForNextCycle, hush, setTempo (direct scheduler.setCps per ADR 0005).
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
// Architecture (post-ADR-0005 definitive tempo fix):
//
//   Root cause of the prior setcps failure:
//     web.mjs's initStrudel() creates the scheduler as a module-private variable.
//     Pattern.prototype.play is patched by web.mjs to call that private scheduler.
//     The evalScope registered by defaultPrebake() does NOT include a setcps global
//     function — the setcps in repl.mjs is only available inside the repl() call,
//     which initStrudel() never makes. Therefore the code string "setcps(0.5)\n..."
//     threw ReferenceError on every evaluate(), and the fallback stripped the header.
//
//   The fix (own-scheduler approach):
//     1. We call the same initialization steps as initStrudel() (initAudioOnFirstClick,
//        miniAllStrings, defaultPrebake, webaudioScheduler) but store the scheduler
//        ourselves: _scheduler.
//     2. We patch Pattern.prototype.play to use _scheduler (same pattern as web.mjs,
//        but pointing to our scheduler).
//     3. tryLiveTempo() calls _scheduler.setCps(bpm/240) directly — no globalThis
//        lookup needed. This is the scheduler's Cyclist.setCps() method.
//     4. tempoWrap() in core/codegen is now an identity function (returns code.trim()).
//        Tempo is a scheduler property, not a code string prefix.
//     5. evaluate() from @strudel/web still works because Pattern.prototype.play was
//        re-patched to use _scheduler; the code string no longer has a setcps header
//        (so no ReferenceError).
//     6. hush() calls _scheduler.stop() directly.
//
// Design invariants (CLAUDE.md + ADR 0005):
//   - Audio starts ONLY after a user gesture: our init is called inside initAudio(),
//     never at module load.
//   - Tempo is set via scheduler.setCps(bpm/240) — NEVER via .fast or .slow (those
//     time-stretch patterns and break chord-geometry timing). setcps as a standalone
//     JS statement does NOT exist in the evalScope of @strudel/web@1.0.3. The
//     scheduler's setCps() method is the only correct mechanism.
//   - No DOM imports; no top-level audio side-effects.

// All imports come from @strudel/web, which re-exports everything from its sub-packages
// (@strudel/core, @strudel/webaudio, @strudel/mini) via "export * from ..." in web.mjs.
// Direct imports from sub-packages (e.g. @strudel/core) are not in package.json and
// would fail in the Rollup build step. The bundled dist/index.mjs in @strudel/web@1.0.3
// exports all of these: Pattern, webaudioScheduler, initAudioOnFirstClick,
// registerSynthSounds, miniAllStrings, defaultPrebake, samples, evaluate.
import {
  evaluate,
  defaultPrebake,
  samples,
  Pattern,
  webaudioScheduler,
  initAudioOnFirstClick,
  registerSynthSounds,
  miniAllStrings,
  getAudioContext,
} from '@strudel/web';
import type { Cyclist } from '@strudel/web';
import { anchorVisualPhase, measureLatencyOffsetMs } from '../state/phase-anchor.js';

// ── Module-level state ────────────────────────────────────────────────────────
// Mirrors prototype globals (lines 582–585), scoped to this module.

/** Whether initAudio() has completed successfully. */
let audioReady = false;

/** The current bare pattern string (no tempo header). Empty = silent. */
let _currentCode = '';

/** The code queued for the next cycle (heuristic, cleared after apply). */
let _queuedCode: string | null = null;

/** Current BPM value; default 120 (prototype line 585). */
let _currentBpm = 120;

/** Debounce handle for re-evaluation on tempo change (prototype line 646). */
let _tempoDebounce: ReturnType<typeof setTimeout> | null = null;

/**
 * The Cyclist scheduler we own. Initialized in initAudio().
 * We use it directly for setCps (tempo) and stop (hush).
 */
let _scheduler: Cyclist | null = null;

function syncVisualPhaseAfterRunNow(queued: boolean): void {
  // A queued pattern update must not restart the visual playhead: Strudel's
  // Cyclist keeps running and setPattern() does not restart a started clock.
  if (!queued) {
    // Compute the hardware output latency offset live on each call so device
    // changes (e.g. switching from wired to Bluetooth mid-session) are reflected.
    // getAudioContext() is called inside this function — never at module scope —
    // to satisfy A-04-04. The try/catch guards the pre-init edge case (belt and
    // suspenders; in practice syncVisualPhaseAfterRunNow is only reachable after
    // audioReady = true, so getAudioContext() returns the live instance).
    try {
      const offsetMs = measureLatencyOffsetMs(getAudioContext());
      anchorVisualPhase(offsetMs);
    } catch {
      anchorVisualPhase(0);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialise the Strudel runtime by replicating initStrudel()'s steps,
 * but storing the scheduler ourselves so we can call setCps() directly.
 *
 * MUST be called from a user-gesture handler (click/keydown) — never at
 * module load. Idempotent: subsequent calls are no-ops when already ready.
 *
 * Why we replicate initStrudel() instead of calling it:
 *   initStrudel() stores the scheduler as a module-private variable in web.mjs.
 *   There is no exported accessor. By replicating the same steps here and
 *   storing _scheduler ourselves, we can call _scheduler.setCps(bpm/240) for
 *   live tempo changes without injecting a setcps string into evaluated code
 *   (which would throw ReferenceError — setcps is NOT in the evalScope).
 *
 *   We patch Pattern.prototype.play to use _scheduler, exactly as web.mjs does
 *   for its module-private scheduler. Since Pattern is a singleton ESM class,
 *   the patch takes effect for all patterns including those evaluated via
 *   evaluate() from @strudel/web.
 *
 * Ported from prototype lines 600–603, adapted per OD-4 resolution
 * (deferring to gesture handler) and the definitive tempo fix.
 */
export async function initAudio(): Promise<void> {
  if (audioReady) return;
  try {
    initAudioOnFirstClick();
    miniAllStrings();

    // Create our own scheduler (same as initStrudel does internally).
    _scheduler = webaudioScheduler();

    // Patch Pattern.prototype.play to use _scheduler — exactly as web.mjs does,
    // but pointing to our scheduler instead of web.mjs's module-private one.
    // Since Pattern is a singleton ESM class, this replaces web.mjs's patch.
    const ownScheduler = _scheduler;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Pattern.prototype as any).play = function () {
      if (!ownScheduler) {
        throw new Error('.play: no scheduler found. Have you called initAudio()?');
      }
      ownScheduler.setPattern(this, true);
      return this;
    };

    // Set up evalScope exactly as defaultPrebake() does (registers all strudel
    // functions into globalThis so the evaluated code can call them).
    // Also load dirt-samples exactly as the prototype (line 601).
    const samplesReady = samples('github:tidalcycles/dirt-samples');
    await Promise.all([defaultPrebake(), registerSynthSounds(), samplesReady]);

    audioReady = true;
  } catch (initErr) {
    // eslint-disable-next-line no-console
    console.warn('Strudel no inicializó aún:', initErr);
  }
}

/**
 * Evaluate a Strudel pattern immediately.
 *
 * Calls evaluate(code) from @strudel/web (which calls _evaluate then pattern.play(),
 * which uses our patched Pattern.prototype.play → _scheduler). The code string no
 * longer carries a setcps header — tempo is set directly on the scheduler via
 * tryLiveTempo() and the explicit setCps call in setTempo().
 *
 * Falls back to evaluate(code.trim()) on error. Updates internal currentCode on
 * success. Returns { ok, error? }.
 *
 * Ported from prototype lines 609–631.
 */
export async function runNow(
  code: string,
  // opts reserved for forward compatibility (fromEditor, silent flags in prototype)
  opts?: { fromEditor?: boolean; silent?: boolean; queued?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  if (!audioReady) return { ok: false, error: 'motor no listo' };
  const bare = code.trim();
  try {
    await evaluate(bare);
    _currentCode = bare;
    syncVisualPhaseAfterRunNow(opts?.queued === true);
    return { ok: true };
  } catch {
    try {
      await evaluate(bare);
      _currentCode = bare;
      syncVisualPhaseAfterRunNow(opts?.queued === true);
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
        const r = await runNow(code, { ...opts, queued: true });
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
 * Calls _scheduler.stop() directly (we own the scheduler). Clears currentCode.
 * The try/catch matches the prototype usage at lines 1507, 2107, 2113.
 *
 * Ported from prototype hush() usages (lines 1507, 2107, 2113).
 */
export function hush(): void {
  if (!audioReady) return;
  try {
    _scheduler?.stop();
  } catch {
    // intentional: prototype wraps hush() in try/catch (lines 1507, 2107, 2113)
  }
  _currentCode = '';
}

/**
 * Nudge the Strudel scheduler tempo without restarting.
 *
 * ADR 0005 definitive fix: calls _scheduler.setCps(bpm/240) directly on the
 * Cyclist instance we own. This is the only correct mechanism — setcps as a
 * standalone JS string does NOT exist in the evalScope of @strudel/web@1.0.3.
 *
 * .fast and .slow remain forbidden — they time-stretch patterns and break
 * the chord-geometry timing.
 *
 * Ported from prototype lines 647–651 (setcpm/setcps replaced with direct
 * scheduler.setCps() call per the definitive tempo fix).
 */
function tryLiveTempo(): void {
  if (!audioReady || !_scheduler) return;
  try {
    // Cyclist.setCps() is defined in @strudel/core/cyclist.mjs line 99.
    // This is the direct, correct mechanism — no globalThis lookup needed.
    _scheduler.setCps(_currentBpm / 240);
  } catch {
    // best-effort; scheduler may not be running
  }
}

/**
 * Update BPM and propagate to the running pattern.
 *
 * 1. Clamps to [40, 280] and stores the value.
 * 2. Calls tryLiveTempo() to call _scheduler.setCps(bpm/240) immediately (reliable).
 * 3. Debounces a full re-evaluate of currentCode at 130 ms (belt & suspenders:
 *    ensures the pattern restarts cleanly at the new tempo on the next cycle).
 *
 * ADR 0005: tempo is set via scheduler.setCps(bpm/240) — never via .fast or .slow.
 *
 * Ported from prototype lines 653–668 (DOM manipulation stripped;
 * compState/compPos playhead logic belongs to the composition layer,
 * deferred to Phase 03+; tempo control rewritten to use own scheduler).
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
 * Returns the current bare pattern string (without tempo header).
 * Empty string when nothing is playing.
 *
 * Used by requeueLive() in the session store to decide whether to queue.
 */
export function currentCode(): string {
  return _currentCode;
}
