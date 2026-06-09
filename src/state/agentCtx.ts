// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — ephemeral agent context flags store.
//
// Phase 06 step 06.4.
//
// Prototype parity:
//   Replaces prototype global variables `melodyContext` (line 1510) and
//   `rhythmContext` (line 1534) with a Svelte writable store.
//
// ADR 0008/0009 pattern: ephemeral, not in sessionStore, not persisted.
// The flags are reset to false after each send() call in AgentPanel.svelte.
//
// Known deviation from prototype:
//   Prototype uses global JS variables (melodyContext/rhythmContext).
//   Svelte writable store chosen for reactivity — consistent with project conventions.

import { writable } from 'svelte/store';

/**
 * Ephemeral context flags for the agent send() call.
 *
 * - `includeRhythm`: when true, the current rhythm layer description is appended
 *   to the next message sent to the AI agent.
 * - `includeHarmony`: when true, the current harmony key + progression description
 *   is appended to the next message sent to the AI agent.
 *
 * Both flags reset to false after each send() in AgentPanel.svelte.
 * Not persisted. Not in sessionStore.
 */
export const agentCtx = writable<{ includeRhythm: boolean; includeHarmony: boolean }>({
  includeRhythm: false,
  includeHarmony: false,
});
