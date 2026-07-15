// SPDX-License-Identifier: AGPL-3.0-only
/// <reference types="svelte" />
/// <reference types="vite/client" />

// @strudel/web@1.0.3 ships no .d.ts; declare the named exports used by the audio layer.
//
// @strudel/web re-exports everything from its sub-packages (@strudel/core,
// @strudel/webaudio, @strudel/mini, @strudel/transpiler, @strudel/tonal) via
// "export * from ..." in web.mjs / dist/index.mjs. All audio-layer imports come
// from @strudel/web so the Rollup build can resolve a single package.
//
// Post-definitive-tempo-fix additions (own-scheduler approach):
//   Pattern, webaudioScheduler, initAudioOnFirstClick, registerSynthSounds,
//   miniAllStrings, defaultPrebake — all re-exported from @strudel/web@1.0.3.
declare module '@strudel/web' {
  /**
   * Compile and start playing a Strudel pattern string.
   * Returns a Promise that resolves when the pattern is enqueued.
   */
  export function evaluate(code: string, autoplay?: boolean): Promise<void>;

  /** Stop all playing patterns. */
  export function hush(): void;

  /**
   * Load a sample set.
   * Accepts either a shorthand string (e.g. 'github:tidalcycles/dirt-samples')
   * or a plain object mapping sample names to arrays of URLs (object form used
   * for locally-committed assets — see Phase 04 inventory §3 and buildSampleMap
   * in src/audio/strudel.ts).
   */
  export function samples(path: string | Record<string, string[]>): Promise<void>;

  /**
   * Sets up evalScope with all strudel modules (registers functions into globalThis
   * so evaluated code can call note(), s(), etc.). Part of our own initAudio().
   */
  export function defaultPrebake(): Promise<void>;

  /**
   * The Cyclist scheduler interface.
   * webaudioScheduler() returns an instance; we store it as _scheduler for
   * direct setCps() calls (the definitive tempo fix).
   */
  export interface Cyclist {
    setCps(cps: number): void;
    setPattern(pat: unknown, autostart?: boolean): void;
    stop(): void;
    start(): void;
    pause(): void;
    started: boolean;
    cps: number;
    /**
     * Scheduler lookahead in seconds (default 0.1 / 100 ms). Shifts every
     * hap's Web-Audio-scheduled trigger time forward by this amount — it is
     * audible, not just an internal buffering detail (song-import Phase 04
     * inventory §(d), traced against the pinned bundle's Cyclist →
     * superdough → `.start(when)` path).
     */
    latency: number;
  }

  /**
   * Creates and returns a webaudio Cyclist scheduler instance.
   * We store the returned instance in _scheduler for direct setCps() calls.
   */
  export function webaudioScheduler(options?: Record<string, unknown>): Cyclist;

  /** Registers a handler to resume the AudioContext on the first user gesture. */
  export function initAudioOnFirstClick(options?: Record<string, unknown>): void;

  /** Registers synthesiser sounds (sawtooth, etc.) into superdough. */
  export function registerSynthSounds(): Promise<void>;

  /** Enables mini-notation auto-parsing for string literals in evaluated code. */
  export function miniAllStrings(): void;

  /**
   * Returns the shared AudioContext used by Strudel (creates a new one if not yet
   * initialized). Safe to call after initAudio() has completed; calling before init
   * creates a suspended AudioContext (browser policy), so callers should guard.
   */
  export function getAudioContext(): AudioContext;

  /**
   * The base Pattern class (from @strudel/core, re-exported by @strudel/web).
   * We patch Pattern.prototype.play to use _scheduler (the own-scheduler fix).
   * Declared as a class constructor value + interface so TypeScript accepts
   * both `import { Pattern }` and `Pattern.prototype` access.
   */
  export interface Pattern {
    [key: string]: unknown;
  }
  export const Pattern: { new (...args: unknown[]): Pattern; prototype: Pattern };
}
