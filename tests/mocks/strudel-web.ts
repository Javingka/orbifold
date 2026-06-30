// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — test-only stub for @strudel/web.
//
// @strudel/web's bundled dist/index.mjs has a module-scope statement
// (`window.initStrudel = ...`) that runs unconditionally on import — not
// inside any function — so it throws `ReferenceError: window is not defined`
// the moment anything imports src/audio/strudel.ts in Vitest's Node
// environment (no DOM). src/state/session.ts imports strudel.ts
// unconditionally, so every test that imports session.ts pulls this in
// transitively, regardless of whether that test exercises audio at all.
//
// No test in this suite calls initAudio() for real (that requires a live
// AudioContext behind a user gesture — exercised only in the browser per
// CLAUDE.md). This stub exists purely so the module graph resolves; its
// exports are shaped to satisfy src/audio/strudel.ts's imports and are
// replaced wholesale only in test mode via vite.config.ts `test.alias`
// (production build is untouched — it resolves the real package).
import { vi } from 'vitest';

// Bare constructor with a mutable .prototype — strudel.ts patches
// Pattern.prototype.play itself (mirrors the real package's pattern;
// see src/audio/strudel.ts initAudio()). A function, not a class, since
// strudel.ts only needs `.prototype` to exist and be writable.
export function Pattern(): void {}

export const evaluate = vi.fn().mockResolvedValue(undefined);
export const defaultPrebake = vi.fn().mockResolvedValue(undefined);
export const samples = vi.fn().mockResolvedValue(undefined);
export const webaudioScheduler = vi.fn(() => ({
  setCps: vi.fn(),
  setPattern: vi.fn(),
  stop: vi.fn(),
}));
export const initAudioOnFirstClick = vi.fn();
export const registerSynthSounds = vi.fn().mockResolvedValue(undefined);
export const miniAllStrings = vi.fn();
export const getAudioContext = vi.fn(() => ({}));

export type Cyclist = ReturnType<typeof webaudioScheduler>;
