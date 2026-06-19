<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Decisions Register — AI Jam / Autopilot

This file lists vigent rules for this initiative. Planner and Dev read this
at every invocation. **The Pilot is the only writer.**

See `references/decisions-register-convention.md` for entry format.

## Carried-forward rules (in force project-wide)

From `docs/editable-composition/decisions.md`:
- **`Block.code` is the canonical playback source; `Block.snapshot` is the editable source** (ADR 0020 D2/D3): any code that creates a block must populate both; `buildComposition` reads only `code`; `bpm` excluded from all snapshots.
- **`openBlock` is restore-only and never touches the transport** (ADR 0020 D6): restore-only, no auto-play, no bpm change, silent no-op on snapshot-less blocks.

From `docs/harmonic-rhythm-improvements/decisions.md` (still in force):
- **Staff vertical coordinate is diatonic, not chromatic** (ADR 0011 D3).
- **`PX_PER_CYCLE = 48` is a cross-module coordination point** (`time-map.ts` ⇄ `ProgressionStrip.svelte`).
- **`orbifold.lang` is the cross-surface language contract** (ADR 0017).

From `docs/ai-composition-authoring/decisions.md` (still in force):
- **`applyBlockSave` is the agent-layer block-save path; `addBlock` is the single snapshot-capture path** (ADR 0021 D3): `applyBlockSave` delegates to `addBlock` for snapshot capture; it does not call capture functions directly.
- **Agent boolean capability fields require explicit trigger phrases in `SYSTEM_PROMPT`** (ADR 0021 D5): any new optional boolean field must include a concrete list of trigger phrases + two JSON examples in the system prompt.

## Active decisions

From `docs/adr/0022-autopilot-mode.md` (in force for ai-jam Phase 01+):
- **`AutopilotState { enabled, intervalCycles }` lives in `SessionState`, excluded from `SavedSessionSchema`** (ADR 0022 D1/D7): `autopilot` field not enumerated in `serializeSession`; `SESSION_SCHEMA_VERSION` stays 5; `deserializeSession` Omit updated accordingly.
- **Timer formula: `intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles)`** (ADR 0022 D2): BPM read from `get(sessionStore).bpm`; timer restarted on `startAutopilot()`.
- **`sendEvolution()` never pushes to `chatHistory` and never calls `applyBlockSave`** (ADR 0022 D3/D4): clean-slate one-shot call; concurrency guarded by `_isEvolving` flag in `autopilot.ts`; `requeueLive()` called after applying to trigger audio re-evaluation.
- **Audio-awareness guard: dynamic import of `isPlaying()` from `strudel.ts`; skip tick if false** (ADR 0022 D6): dynamic import preserves Node-testability of `autopilot.ts`.
- **stateSnapshot sent to LLM uses AgentOutputSchema format** (Checkpoint #5 fix): `rootPc → NOTE_NAMES[rootPc]`, `qual → quality`; euclid string coercion via `normalizeEuclidStrings()` in `tryParseSkill`.

From ai-jam Phase 02 (inventory OD-1/OD-2 — Pilot-resolved 2026-06-19):
- **Music-knowledge harmony catalog uses a richer closed quality enum** (OD-1):
  `maj, min, dim, aug, maj7, m7, 7, m7b5, dim7, 6, m6, sus2, sus4, 9, maj9, m9, add9`
  (TS union/const, not free strings). The catalog is reference data; reconciliation to
  `AgentOutputSchema` (extend schema+theory+codegen, OR downsample each extension to its
  triad) is deferred to the future recipe→state phase under its own ADR. The downsample
  fallback must be total — every enum member reduces to a schema triad.
- **Music-knowledge rhythm catalog stores patterns in native step counts** (OD-2):
  8/12/16/odd, never normalized to 16. Each entry carries `strudelStrategy: 'euclid' | 'struct'`
  recording its intended emission channel; `core/rhythm/euclid.ts` is the canonical engine
  that validates every `euclid`-strategy entry. Reconciliation of non-16 / `struct` grids to
  the agent schema is deferred to the future recipe→state phase under its own ADR.


## Superseded decisions

_(none)_
