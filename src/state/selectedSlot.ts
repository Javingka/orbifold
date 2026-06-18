// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Reactive stores for Pentagrama selection and sound attribute intent.
//
// Phase 02 (harmonic-rhythm-improvements) step 02.4 — ADR 0018 D5.
// Promotes the module-level `_selectedSlotIdx` in pentagrama-scene.ts to a
// Svelte writable store so that Header.svelte and other UI components can
// reactively read which slot is currently selected and reflect its sound
// attributes in the top-bar controls.
//
// Step 02.5 adds `soundIntentStore` — the "intent" values shown in the top-bar
// sound controls when no slot is selected. Tonnetz chord creation reads from
// this store so new chords inherit the current instrument/room/decay selection.
//
// This file is pure state (src/state/) — NO DOM, NO PIXI, NO Svelte component
// imports. Only `svelte/store` is used.

import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

/**
 * The zero-based index of the currently selected Pentagrama slot, or `null`
 * if no slot is selected.
 *
 * Written by `pentagrama-scene.ts` via `.set(n)` / `.set(null)`.
 * Read reactively by `Header.svelte` and any other component that needs to
 * display or act on the selected slot's attributes.
 */
export const selectedSlotIdxStore: Writable<number | null> = writable(null);

/**
 * The current "intent" sound attributes from the top-bar controls.
 * When no Pentagrama slot is selected, the top bar shows these values.
 * When a Tonnetz triangle is clicked to add a new chord, the new chord
 * inherits these values (apply-to-new behavior, ADR 0018 D5).
 *
 * Written by `Header.svelte` whenever the user changes an instrument/room/decay
 * control. Read by `tonnetz-scene.ts` in `pickChord`.
 */
export const soundIntentStore: Writable<{
  instrument: string;
  room: number;
  decay: number;
}> = writable({ instrument: 'sawtooth', room: 0.25, decay: 0 });
