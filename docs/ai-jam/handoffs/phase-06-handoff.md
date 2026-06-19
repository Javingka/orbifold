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
| OD-1 | Timer start time exposure strategy | Option A (sessionStore field) vs. Option B (exported writable store) | **STOP — Pilot decision required before step 06.2** |
