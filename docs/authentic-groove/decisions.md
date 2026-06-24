<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Decisions Register — Authentic Groove

This file lists vigent rules for this initiative. Planner and Dev read this
at every invocation. **The Pilot is the only writer** (exception: Pilot
authorized the Planner to seed this file at initiative start on 2026-06-23).

See `references/decisions-register-convention.md` for entry format.

---

## Carried-forward rules (in force project-wide)

From `docs/editable-composition/decisions.md`:
- **`Block.code` is the canonical playback source; `Block.snapshot` is the editable source** (ADR 0020 D2/D3): any code that creates a block must populate both; `buildComposition` reads only `code`; `bpm` excluded from all snapshots.
- **`openBlock` is restore-only and never touches the transport** (ADR 0020 D6): restore-only, no auto-play, no bpm change, silent no-op on snapshot-less blocks.

From `docs/harmonic-rhythm-improvements/decisions.md`:
- **Staff vertical coordinate is diatonic, not chromatic** (ADR 0011 D3).
- **`PX_PER_CYCLE = 48` is a cross-module coordination point** (`time-map.ts` ⇄ `ProgressionStrip.svelte`).
- **`orbifold.lang` is the cross-surface language contract** (ADR 0017).

From `docs/ai-composition-authoring/decisions.md`:
- **`applyBlockSave` is the agent-layer block-save path; `addBlock` is the single snapshot-capture path** (ADR 0021 D3): `applyBlockSave` delegates to `addBlock` for snapshot capture; it does not call capture functions directly.
- **Agent boolean capability fields require explicit trigger phrases in `SYSTEM_PROMPT`** (ADR 0021 D5): any new optional boolean field must include a concrete list of trigger phrases + two JSON examples in the system prompt.

From `docs/ai-jam/decisions.md` (all still in force):
- **`AutopilotState { enabled, intervalCycles }` lives in `SessionState`, excluded from `SavedSessionSchema`** (ADR 0022 D1/D7).
- **Timer formula: `intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles)`** (ADR 0022 D2).
- **`sendEvolution()` never pushes to `chatHistory` and never calls `applyBlockSave`** (ADR 0022 D3/D4); concurrency guarded by `_isEvolving`.
- **stateSnapshot sent to LLM uses AgentOutputSchema format** (Checkpoint #5 fix): `rootPc → NOTE_NAMES[rootPc]`, `qual → quality`; euclid string coercion via `normalizeEuclidStrings()` in `tryParseSkill`.
- **Music-knowledge harmony catalog uses a richer closed quality enum** (OD-1 ai-jam Phase 02): `maj, min, dim, aug, maj7, m7, 7, m7b5, dim7, 6, m6, sus2, sus4, 9, maj9, m9, add9`. Reconciliation to `AgentOutputSchema` deferred to future recipe→state phase.
- **Music-knowledge rhythm catalog stores patterns in native step counts** (OD-2 ai-jam Phase 02): 8/12/16/odd, never normalized to 16. `strudelStrategy: 'euclid' | 'struct'` on each entry.
- **Evolution Plan length derives from `intervalCycles`** (OD-1 ai-jam Phase 07 / ADR 0024 D6): `horizon = Math.max(2, Math.round(intervalCycles / 2))`.
- **Plan schema is `{ plan: AgentOutput[] }`, 1–8 steps** (OD-2 ai-jam Phase 07 / ADR 0024 D1): `EvolutionPlanSchema`; plan-layer only; does NOT bump `SCHEMA_VERSION` (6) or `SESSION_SCHEMA_VERSION` (5).
- **Per-call input trim: drop `availableRecipeSummaries` when `rhythmHint` or `rhythmHintFreeText` is non-empty** (OD-3 ai-jam Phase 07 / ADR 0024 D5).

---

## Active decisions

### AG-D1 — Music-knowledge seam invariant (authentic-groove, 2026-06-23)

**Rule:** The mapping from genre to concrete Strudel sample names lives **entirely** inside `src/core/music-knowledge/`. `RhythmLayer`, the Strudel codegen (`core/codegen/`), and `persistence.ts` must contain **no genre name** and **no hardcoded sample map**. The codegen only knows: "emit `strudelSample` when present, else `sound`."

**Why:** The project will split into a public AGPL executor (runs Strudel) and a proprietary knowledge engine. Mixing the mapping into the plumbing layer would make that split impossible without untangling. Keeping it clean now costs nothing.

**How to apply:** Before committing any step, run `git grep` over introduced sample names and genre tokens scoped to `src/` excluding `src/core/music-knowledge/` and `tests/` — zero matches required. A failing grep means the seam broke; relocate the logic to `music-knowledge/` before continuing.

---

## Superseded decisions

From ai-jam:
- **ADR 0022 D6 (isPlaying() audio-awareness guard) — SUPERSEDED by ai-jam Phase 06.** Replaced by auto-play heuristics in `startAutopilot()`; `autopilot.ts` no longer imports from `strudel.ts`.
