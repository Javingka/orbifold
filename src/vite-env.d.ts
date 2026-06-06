// SPDX-License-Identifier: AGPL-3.0-only
/// <reference types="svelte" />
/// <reference types="vite/client" />

// @strudel/web@1.0.3 ships no .d.ts; declare the named exports used by the audio layer.
declare module '@strudel/web' {
  /** Initialise the Strudel runtime (creates AudioContext, registers prebake). */
  export function initStrudel(options?: {
    prebake?: () => Promise<void> | void;
    [key: string]: unknown;
  }): void;

  /**
   * Compile and start playing a Strudel pattern string.
   * Returns a Promise that resolves when the pattern is enqueued.
   */
  export function evaluate(code: string, autoplay?: boolean): Promise<void>;

  /** Stop all playing patterns (calls scheduler.stop()). */
  export function hush(): void;

  // Re-exports from superdough (used by prebake if needed in future steps)
  export function samples(path: string): Promise<void>;
}
