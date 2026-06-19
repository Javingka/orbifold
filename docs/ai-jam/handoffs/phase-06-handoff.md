<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 06 Handoff — Autopilot UX Redesign: Config Panel, Rhythm Dropdown, Play Button, and Progress Timeline

---

## Step 06.1 — Inventory

**Status:** COMPLETE  
**Date:** 2026-06-19  
**Branch:** `ai-jam/phase-06`  
**Commit:** `docs(ai-jam): Phase 06 step 06.1 — autopilot-redesign inventory`

### What was done

Produced `docs/ai-jam/inventories/phase-06-inventory.md` covering all five mandated sections:

**§1 — Current AutopilotState and UI:** `AutopilotState` currently has two fields: `enabled: boolean` (default `false`) and `intervalCycles: number` (default `8`). The current autopilot markup is a `<div class="toggles autopilot-row">` with a single toggle button (simultaneously starts/stops timer and sets `enabled`), an interval number input, and an info icon. All six existing i18n keys (`btnOff`, `btnOn`, `titleOff`, `titleOn`, `cyclesLabel`, `infoTooltip`) are in use by the current markup.

**§2 — OD-1:** Two options documented with full tradeoff analysis:
- **Option A:** Add `timerStartedAt: number` to `AutopilotState` in `sessionStore`. `startAutopilot()` calls `setAutopilot({ timerStartedAt: Date.now() })` at start and each tick boundary. Pure `sessionStore` pattern; automatic schema exclusion; no new inter-module links.
- **Option B:** Export a `writable(0)` store from `autopilot.ts`. AgentPanel imports it directly. Requires ADR 0022 amendment if chosen.

Recommendation: **Option A**. Rationale: `timerStartedAt` is clearly autopilot runtime state; colocating with `enabled`/`intervalCycles` is architecturally cleaner and the exclusion from `SavedSessionSchema` is automatic.

**§3 — CSS token audit:** Confirmed exact token names from `app.css` lines 43–46:
- `--accent` → `#8aa0ff`
- `--tonic` → `#f3b15a`
- `--dom` → `#e87bac` (NOT `--dominant`)
- `--stroke` → `rgba(255,255,255,0.085)` — for progress track background
- `@keyframes pulse` already defined in `app.css` lines 222–230 (live-dot reuse)

Progress bar color plan: `.phase-accent` (0–59%), `.phase-tonic` (60–84%), `.phase-dom` (85–100%). CSS class approach in AgentPanel scoped `<style>`.

**§4 — Dropdown grouping:** 46 entries across 15 families confirmed. Full family-to-entry mapping documented. Largest families: `clave` (9 entries), `euclidean` (8), `straight` (6), `aksak` (4). Svelte `<optgroup>` approach confirmed (standard HTML, Svelte-native). The `families` map is a module-load-time constant (static catalog data, no Svelte reactivity needed).

**§5 — sendEvolution injection point:** The `userMessage` object in `sendEvolution()` currently spreads `{ ...stateSnapshot, availableRecipes }`. The new fields will be appended conditionally: `rhythmHint` when a catalog id or `'otro'` is set; `rhythmHintFreeText` when `rhythmHint === 'otro'` and `rhythmHintText` is non-empty; both omitted when `rhythmHint === ''`.

**§6 — i18n gap:** Six existing keys retained. Seven new keys identified: `panelToggleLabel`, `rhythmHintLabel`, `rhythmHintOther`, `rhythmHintPlaceholder`, `playLabel`, `stopLabel`, `progressTitle`. Proposed Spanish values and all four locale translations documented in inventory §4.

**§7 — No new test files:** A-06-03/04 coverage achieved by adding tests to `tests/agent/` in step 06.2 (three `rhythmHint` injection cases). No new top-level Vitest test files required.

### Acceptance Coverage Table (step 06.1 scope: inventory only)

| Acceptance Criterion | Coverage | Notes |
|---------------------|----------|-------|
| A-06-01 (expand/collapse panel) | NOT YET | Implemented in step 06.4 |
| A-06-02 (rhythm dropdown ≥46 entries + Otro…) | NOT YET | Implemented in step 06.4 |
| A-06-03 (rhythmHint injection — catalog id) | NOT YET | Implemented in step 06.2 |
| A-06-04 (rhythmHintFreeText injection — otro) | NOT YET | Implemented in step 06.2 |
| A-06-05 (play/stop button) | NOT YET | Implemented in step 06.4 |
| A-06-06 (progress bar fill + color) | NOT YET | Implemented in step 06.4 |
| A-06-07 (live-dot when collapsed + playing) | NOT YET | Implemented in step 06.4 |
| A-06-08 (new fields excluded from SavedSessionSchema) | PROXY CONFIRMED | §1.5: `autopilot` key absent from `SavedSessionSchema` wholesale; four new fields automatically excluded; no schema change needed |
| A-06-09 (quality gate) | NOT YET | Run at step 06.4 completion |

### Validation

- `docs/ai-jam/inventories/phase-06-inventory.md` exists and covers all five sections.
- No source files modified (git status clean except inventory and handoff).

### Open decisions blocking step 06.2

| OD | Decision | Options | Status |
|----|----------|---------|--------|
| OD-1 | Timer start time exposure strategy | Option A (sessionStore field) vs. Option B (exported writable store) | **RESOLVED — Option A (Pilot, 2026-06-19)** |

---

## Step 06.2 — State layer + sendEvolution rhythm-hint injection

**Status:** COMPLETE  
**Date:** 2026-06-19  
**Branch:** `ai-jam/phase-06`  
**Commit:** `feat(state): Phase 06 step 06.2 — AutopilotState rhythm-hint + timerStartedAt + sendEvolution injection`

### What was done

**`src/state/session.ts`**
- Extended `AutopilotState` with four new fields: `panelOpen: boolean`, `rhythmHint: string`, `rhythmHintText: string`, `timerStartedAt: number`.
- Updated `DEFAULT_SESSION_STATE.autopilot` to include all four new fields with their defaults (`false`, `''`, `''`, `0`).
- Added `setAutopilotPanel(open: boolean): void` store action (flips `panelOpen`).
- Added `setRhythmHint(hint: string, text?: string): void` store action (updates `rhythmHint` and optionally `rhythmHintText`).
- All four new fields are automatically excluded from `SavedSessionSchema` because the entire `autopilot` key is absent from the schema (confirmed: persistence.ts `SavedSessionSchema` does not enumerate `autopilot`). No schema version change needed (A-06-08 satisfied).

**`src/agent/autopilot.ts`**
- Imported `setAutopilot` from `session.ts`.
- `startAutopilot()`: calls `setAutopilot({ timerStartedAt: Date.now() })` immediately before creating the `setInterval` (OD-1 Option A).
- `tick()`: calls `setAutopilot({ timerStartedAt: Date.now() })` at the start of each successful tick (after audio guard, before `sendEvolution()`). Marks the start of the new interval so the progress bar can compute `elapsed / intervalMs`.
- `stopAutopilot()`: calls `setAutopilot({ timerStartedAt: 0 })` to reset. Does NOT set `enabled: false` (callers set `enabled` separately, per ADR 0022 D2 ordering contract — preserves existing test behavior at `autopilot.test.ts` line 228).

**`src/agent/agent.ts`**
- Added `getRhythmById` to the import from `../core/music-knowledge/query.js` (already exported there).
- After `availableRecipes` in `sendEvolution()`, reads `state.autopilot.rhythmHint` / `rhythmHintText` and builds `rhythmHintPayload`:
  - Catalog id → `{ rhythmHint: getRhythmById(id)?.name ?? id }` (human-readable name for the LLM)
  - `'otro'` with non-empty text → `{ rhythmHintFreeText: text.trim() }`
  - Empty string → empty payload (neither field appears in the JSON sent to the LLM)
- Spread into `JSON.stringify({ ...stateSnapshot, availableRecipes, ...rhythmHintPayload }, null, 2)`.
- `sendEvolution()` still NEVER pushes to `chatHistory` and NEVER calls `applyBlockSave` (ADR 0022 D3/D4 intact).

**`tests/sendEvolution-hint.test.ts`** (new file)
- 8 tests covering A-06-03 and A-06-04 with matching mocks (same pattern as `agent-recipe-wiring.test.ts`):
  - `A-06-03a`: catalog id → `rhythmHint` key appears with non-empty string
  - `A-06-03b`: different catalog id → `rhythmHint` key appears
  - `A-06-03c`: chatHistory unchanged with catalog id
  - `A-06-04a`: `'otro'` with text → `rhythmHintFreeText` appears, `rhythmHint` absent
  - `A-06-04b`: `'otro'` with whitespace-only text → neither field appears
  - `A-06-04c`: empty string → neither field appears
  - `A-06-04d`: chatHistory unchanged with `'otro'`
  - `A-06-04e`: chatHistory unchanged with empty string

### Transient environment fix

One pre-existing autopilot test (`A-01-05: startAutopilot after stopAutopilot re-arms the timer`) failed after the first `stopAutopilot()` implementation set `enabled: false`. Root cause: the existing test calls `stopAutopilot(); startAutopilot()` without resetting `enabled: true`, relying on `stopAutopilot()` NOT touching `enabled`. Fixed by only resetting `timerStartedAt: 0` in `stopAutopilot()` (not `enabled`), matching the pre-phase behavior and the ADR 0022 D2 ordering contract.

### SavedSessionSchema exclusion — A-06-08 proxy confirmation

`persistence.ts` `SavedSessionSchema` (lines 229–239) defines `version`, `bpm`, `view`, `chordMode`, `harmony`, `rhythm`, and `composition` only. The `autopilot` key is absent entirely. `serializeSession()` never writes `autopilot`; `deserializeSession()` return type is `Omit<SessionState, 'nowPlaying' | 'autopilot'>`. All four new fields are automatically excluded. No `SESSION_SCHEMA_VERSION` change needed.

### Acceptance Coverage Table (step 06.2 scope)

| Acceptance Criterion | Coverage | Notes |
|---------------------|----------|-------|
| A-06-01 (expand/collapse panel) | NOT YET | Implemented in step 06.4 |
| A-06-02 (rhythm dropdown ≥46 entries + Otro…) | NOT YET | Implemented in step 06.4 |
| A-06-03 (rhythmHint injection — catalog id) | COVERED | `tests/sendEvolution-hint.test.ts` A-06-03a/b/c; `agent.ts` proxy read confirms injection |
| A-06-04 (rhythmHintFreeText / empty omission) | COVERED | `tests/sendEvolution-hint.test.ts` A-06-04a/b/c/d/e |
| A-06-05 (play/stop button) | NOT YET | Implemented in step 06.4 |
| A-06-06 (progress bar fill + color) | NOT YET | Implemented in step 06.4 |
| A-06-07 (live-dot when collapsed + playing) | NOT YET | Implemented in step 06.4 |
| A-06-08 (new fields excluded from SavedSessionSchema) | COVERED | Proxy: `autopilot` key absent from `SavedSessionSchema` wholesale; 4 new fields automatically excluded |
| A-06-09 (quality gate) | NOT YET | Run at step 06.4 completion |

### Validation

- `pnpm exec tsc --noEmit` — clean
- `pnpm test` — 1541 tests pass (8 new; no regressions)
