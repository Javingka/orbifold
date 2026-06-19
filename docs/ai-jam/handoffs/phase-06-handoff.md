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

---

## Step 06.3 — i18n keys (all four locales)

**Status:** COMPLETE  
**Date:** 2026-06-19  
**Branch:** `ai-jam/phase-06`  
**Commit:** `feat(i18n): Phase 06 step 06.3 — autopilot panel i18n keys (all 4 locales)`

### What was done

**`src/i18n/types.ts`**

Added 7 new string keys to `Dictionary.agent.autopilot`:

- `panelToggleLabel` — aria/title for the expand/collapse chevron button
- `rhythmHintLabel` — label displayed before the rhythm hint dropdown
- `rhythmHintOther` — text shown in the "Otro…" option
- `rhythmHintPlaceholder` — placeholder for the select default option and free-text input
- `playLabel` — label for the play/start button
- `stopLabel` — label for the stop button
- `progressTitle` — title/aria-label on the progress bar container

All 6 existing keys (`btnOff`, `btnOn`, `titleOff`, `titleOn`, `cyclesLabel`, `infoTooltip`) retained unchanged.

**All four locale files updated:**

| Key | es | en | pt | zh |
|---|---|---|---|---|
| `panelToggleLabel` | `'Piloto automático'` | `'Autopilot'` | `'Piloto automático'` | `'自动驾驶'` |
| `rhythmHintLabel` | `'Estilo rítmico'` | `'Rhythm style'` | `'Estilo rítmico'` | `'节奏风格'` |
| `rhythmHintOther` | `'Otro…'` | `'Other…'` | `'Outro…'` | `'其他…'` |
| `rhythmHintPlaceholder` | `'— ninguno —'` | `'— none —'` | `'— nenhum —'` | `'— 无 —'` |
| `playLabel` | `'▶ Iniciar'` | `'▶ Start'` | `'▶ Iniciar'` | `'▶ 开始'` |
| `stopLabel` | `'■ Detener'` | `'■ Stop'` | `'■ Parar'` | `'■ 停止'` |
| `progressTitle` | `'Progreso del ciclo de evolución'` | `'Evolution cycle progress'` | `'Progresso do ciclo de evolução'` | `'进化周期进度'` |

`pt` and `zh` keys marked `// i18n-draft` per phase spec.

### Validation

- `pnpm exec tsc --noEmit` — clean
- `pnpm exec vitest run i18n` — key-parity test passes (53 i18n tests)
- `pnpm test` — 1541 tests pass (no regressions)

---

## Step 06.4 — UI redesign + full quality gate

**Status:** COMPLETE  
**Date:** 2026-06-19  
**Branch:** `ai-jam/phase-06`  
**Commit:** `feat(ui): Phase 06 step 06.4 — autopilot panel redesign (expand/collapse, dropdown, play button, progress bar)`

### What was done

**`src/ui/AgentPanel.svelte`**

Script changes:
- Added `onDestroy` to Svelte imports.
- Added `setAutopilotPanel`, `setRhythmHint` to imports from `session.js`.
- Added `import { RHYTHM_CATALOG } from '../core/music-knowledge/rhythm-catalog.js'`.
- Built `families: Map<string, typeof RHYTHM_CATALOG>` at module load time (static catalog — no reactivity needed). Map insertion order preserves catalog order.
- Removed `toggleAutopilot()`. Replaced with `togglePanel()` (flips `panelOpen` via `setAutopilotPanel`; does NOT touch the timer) and `handlePlayStop()` (starts/stops timer; follows ADR 0022 D2 ordering: `setAutopilot` before `startAutopilot`).
- Added `requestAnimationFrame` progress bar poll: `_rafTick()` updates `now = Date.now()` at ~60 fps; started in `onMount`, cleaned up in `onDestroy`.
- Reactive derivations: `timerStart`, `intervalMs`, `progressPct` (clamped 0–100), `progressPhase` ('accent' / 'tonic' / 'dom' thresholds at 60% and 85%).

Markup changes:
- Replaced `<div class="toggles autopilot-row">` entirely with `<div class="autopilot-section">`.
- Header row: chevron button (`togglePanel`) + `autopilot-live-dot` (shown when `enabled && !panelOpen`).
- Config panel (`{#if autopilot.panelOpen}`): interval input, rhythm hint `<select>` with `<optgroup>` per family + "Otro…" option, free-text input (`{#if rhythmHint === 'otro'}`), play/stop button (`handlePlayStop`), progress bar (`role="progressbar"` with aria-valuenow).
- Recipe card and input row remain unchanged in position.

**`src/app/app.css`**

- Removed `.autopilot-btn`, `.autopilot-btn.active`, `.autopilot-info` (no longer used).
- Fixed pre-existing typo: `.interval-input { color: var(--fg) }` → `color: var(--text)` (`--fg` is undefined; `--text` is the correct token).
- Added new rules: `.autopilot-section`, `.autopilot-header`, `.autopilot-toggle` (with `.open` and `:hover`), `.autopilot-live-dot` (pulsing dot using `@keyframes pulse` from `app.css`), `.autopilot-config`, `.rhythm-hint-label`, `.rhythm-hint-select`, `.rhythm-hint-text`, `.autopilot-play-btn` (with `.active` using `var(--dom)`), `.autopilot-progress-track`, `.autopilot-progress-fill`, `.phase-accent`, `.phase-tonic`, `.phase-dom`.
- All color tokens use confirmed names: `--accent`, `--tonic`, `--dom`, `--stroke`, `--text`, `--muted`.

### Live-system verification checklist (Pilot must verify in browser)

The following acceptance criteria require live-system verification in the running dev server (`pnpm dev`):

- **A-06-01:** Click the chevron (▶ → ▼) — config panel expands. Click again — panel collapses. Start autopilot while panel is open; collapse the panel — autopilot continues running (live-dot appears; timer not stopped).
- **A-06-02:** Expand the config panel; open the rhythm hint dropdown. Verify all 46 catalog entries are grouped by family (15 optgroups) plus "Otro…" at the bottom. Select "Otro…" — free-text input appears. Select another option — free-text input disappears.
- **A-06-05:** Click "▶ Iniciar" — button label changes to "■ Detener"; timer starts. Click again — timer stops; label reverts.
- **A-06-06:** With autopilot running, observe the progress bar fill from 0% to 100% over one interval; color is `#8aa0ff` (accent) from 0–60%, `#f3b15a` (tonic) from 60–85%, `#e87bac` (dom) from 85–100%. At next tick, bar resets to 0%.
- **A-06-07:** Start autopilot, then collapse the panel. A small pink pulsing dot appears in the header row confirming the autopilot is active.

### Full quality gate output (A-06-09)

```
pnpm exec tsc --noEmit   → (no output — clean)
pnpm lint                → All matched files use Prettier code style!
pnpm test                → Tests  1541 passed (1541) — 28 test files
pnpm build               → dist/assets/index-*.js 1,180 kB | built in 1.65s
```

Pre-existing build warnings (not introduced by this phase):
- Dynamic import notices for `stage.ts` and `strudel.ts` (pre-existing architecture)
- Chunk size > 500 kB (pre-existing — single-bundle Vite config)

### Phase completion summary

All steps complete. The autopilot section has been fully redesigned:
- `AutopilotState` extended with 4 ephemeral fields (excluded from `SavedSessionSchema`)
- `sendEvolution()` injects rhythm hint into the LLM user message
- 7 i18n keys added to all 4 locales
- AgentPanel redesigned with collapsible config panel, rhythm dropdown, play/stop button, progress timeline

### Acceptance Coverage Table — All A-06-01 through A-06-09

| Criterion | Method | Status | Evidence |
|---|---|---|---|
| A-06-01: expand/collapse panel; collapsing does NOT stop timer | live-system | LIVE — Pilot verify | Separate `togglePanel()` / `handlePlayStop()`; `panelOpen` does not touch timer |
| A-06-02: rhythm dropdown ≥46 entries + families + Otro… | live-system | LIVE — Pilot verify | 46-entry `RHYTHM_CATALOG`, 15 families via `<optgroup>`, `'otro'` option |
| A-06-03: catalog id → `rhythmHint` in LLM userMessage | proxy:static-analysis + unit | COVERED | `agent.ts` injection; `tests/sendEvolution-hint.test.ts` A-06-03a/b/c |
| A-06-04: `'otro'` + text → `rhythmHintFreeText`; empty → neither | proxy:static-analysis + unit | COVERED | `tests/sendEvolution-hint.test.ts` A-06-04a/b/c/d/e |
| A-06-05: play/stop button starts/stops timer; label switches | live-system | LIVE — Pilot verify | `handlePlayStop()` calls `startAutopilot()`/`stopAutopilot()`; i18n `playLabel`/`stopLabel` |
| A-06-06: progress bar fills 0→100%; color accent→tonic→dom | live-system | LIVE — Pilot verify | `progressPct` via rAF poll; `progressPhase` at 60%/85%; phase-{accent,tonic,dom} CSS |
| A-06-07: live-dot visible when collapsed + playing | live-system | LIVE — Pilot verify | `.autopilot-live-dot` shown when `enabled && !panelOpen`; `@keyframes pulse` |
| A-06-08: 4 new `AutopilotState` fields excluded from `SavedSessionSchema` | proxy:static-analysis | COVERED | `autopilot` key absent from `SavedSessionSchema` wholesale; no schema version change |
| A-06-09: tsc clean, lint clean, ≥1533 tests, build succeeds | live-system | COVERED | tsc: clean; lint: clean; tests: 1541; build: success 1.65s |
