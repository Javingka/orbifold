// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Reactive store for the selected Pentagrama slot index.
//
// Phase 02 (harmonic-rhythm-improvements) step 02.4 — ADR 0018 D5.
// Promotes the module-level `_selectedSlotIdx` in pentagrama-scene.ts to a
// Svelte writable store so that Header.svelte and other UI components can
// reactively read which slot is currently selected and reflect its sound
// attributes in the top-bar controls.
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
