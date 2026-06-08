// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — HUD store: voice-leading overlay state written by tonnetz-scene.ts
// and read by Hud.svelte / App.svelte.
//
// ADR trigger (phase-04.md §ADR Triggers): a dedicated `src/state/hud.ts` writable
// store was chosen (over inlining into session.ts) so that HUD state—which is
// presentational/ephemeral—is scoped separately from session persistence concerns.
// This keeps session.ts focused on audio/transport state and makes Phase 07
// serialization scope explicit: hudStore is NOT persisted.
//
// Prototype reference: `showHud(title, sub)` lines 1379–1385 (DOM writes to
// #hudTitle / #hudSub, with a 4 200 ms auto-hide timeout).

import { writable } from 'svelte/store';

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * HUD display state — written by tonnetz-scene.ts, read by Hud.svelte.
 *
 * `visible` is false by default; set to true by pickChord, auto-cleared
 * after 4 200 ms (same timing as prototype showHud._t setTimeout, line 1384).
 *
 * `hint` is the stage hint text (prototype `.hint#stageHint`, line 423).
 * It defaults to the prototype's initial hint string and is currently static;
 * future phases may update it based on user interactions.
 */
export interface HudState {
  title: string;
  /** innerHTML (may contain `<span class="mv">` for accent-colored voice moves). */
  sub: string;
  visible: boolean;
  hint: string;
}

// ── Default state ──────────────────────────────────────────────────────────────

/** Prototype: `#stageHint` initial text content (line 423). */
const DEFAULT_HINT =
  'Toca un triángulo para elegir un acorde (▲ mayor ▼ menor). Verás sus vecinos P·L·R y el voice-leading mínimo. Abajo eliges qué suena.';

export const DEFAULT_HUD_STATE: HudState = {
  title: '—',
  sub: '',
  visible: false,
  hint: DEFAULT_HINT,
};

// ── Store ──────────────────────────────────────────────────────────────────────

/**
 * Svelte writable store for HUD state.
 *
 * Written by `tonnetz-scene.ts` `showHud()` helper (replaces prototype DOM writes
 * `hudTitle.textContent` / `hudSub.innerHTML` at lines 1380–1382).
 * Read by `App.svelte` which passes props to `<Hud>`.
 *
 * Not persisted (ephemeral presentational state — see ADR trigger note above).
 */
export const hudStore = writable<HudState>(DEFAULT_HUD_STATE);

// ── showHud helper ─────────────────────────────────────────────────────────────

/**
 * Show the HUD with a title and subtitle, then auto-hide after 4 200 ms.
 *
 * Replaces the prototype `showHud(title, sub)` function (lines 1379–1385).
 * The `sub` string may contain HTML (e.g. `<span class="mv">+2</span>`)
 * which Hud.svelte renders via `{@html sub}`.
 *
 * @param title - Chord name or transition label (e.g. "Cmaj → Amin").
 * @param sub   - Voice-leading detail string (may contain HTML spans).
 */
let _hideTimer: ReturnType<typeof setTimeout> | null = null;

export function showHud(title: string, sub: string): void {
  if (_hideTimer !== null) {
    clearTimeout(_hideTimer);
    _hideTimer = null;
  }
  hudStore.update((s) => ({ ...s, title, sub, visible: true }));
  // Prototype line 1384: setTimeout 4200 ms auto-hide.
  _hideTimer = setTimeout(() => {
    hudStore.update((s) => ({ ...s, visible: false }));
    _hideTimer = null;
  }, 4200);
}
