<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 06 — Autopilot UX Redesign: Config Panel, Rhythm Dropdown, Play Button, and Progress Timeline

**Purpose:** Redesign the autopilot section of AgentPanel into an expandable configuration panel with a rhythm-catalog dropdown, a dedicated play/stop button, and a visual progress timeline showing position in the current evolution cycle.

**Gate:** Phase 05 merged to `main`; `pnpm test` passes with 1533 tests; the current `AutopilotState` has only `enabled` and `intervalCycles`; the current toggle simultaneously expands UI state and starts the timer.

**Expected phase result:** The autopilot section is a collapsible panel within AgentPanel; expanding it reveals cycle count, rhythm dropdown, free-text hint input, and a play/stop button; a progress bar fills over one cycle interval and changes color; collapsing the panel while playing shows a minimal "playing" indicator; `sendEvolution()` injects the rhythm hint into the user message; all new state fields are ephemeral and excluded from `SavedSessionSchema`.

---

## Step 06.1 — Inventory

PROMPT → Read the required files listed below in order. Produce `docs/ai-jam/inventories/phase-06-inventory.md` covering all five sections. Write nothing to source files. Stop for Pilot review on OD-1 (timer start time exposure strategy).

**Required reading (in order):**
1. `CLAUDE.md`
2. `~/.claude/skills/pilot-machine/references/methodology.md`
3. `docs/ai-jam/decisions.md`
4. `docs/ai-jam/handoffs/phase-05-handoff.md`
5. `src/ui/AgentPanel.svelte` (full)
6. `src/agent/autopilot.ts` (full)
7. `src/state/session.ts` (AutopilotState shape, setAutopilot, DEFAULT_SESSION_STATE, SavedSessionSchema exclusion pattern)
8. `src/agent/agent.ts` (sendEvolution user message construction, lines 412–520)
9. `src/core/music-knowledge/rhythm-catalog.ts` (RHYTHM_CATALOG entries, family groupings — enumerate all families present)
10. `src/i18n/types.ts` (agent.autopilot namespace)
11. `src/i18n/locales/es.ts` (agent.autopilot keys, current values)
12. `src/app/app.css` (CSS custom property names — specifically confirm the token name for "dominante")

**Inventory sections (all five required):**

**§1 — AutopilotState current shape and extension plan.**
List the current fields of `AutopilotState`. For each new field proposed (`panelOpen`, `rhythmHint`, `rhythmHintText`, `timerStartedAt`), confirm the data type, default value, and which fields must be excluded from `SavedSessionSchema`. Confirm the exclusion mechanism: show the exact `Omit` line(s) in `lib/persistence.ts` (or wherever `SavedSessionSchema` is defined) that currently exclude `autopilot`, and describe what change is needed to keep the new fields also excluded.

**§2 — OD-1: Timer start time exposure strategy.**
`startAutopilot()` in `autopilot.ts` currently stores `_timerId` as a module-level private. The progress bar in AgentPanel needs to know when the current interval began so it can compute `elapsed / intervalMs`. Two options:

- **Option A**: Add a `timerStartedAt: number` field to `AutopilotState` in `sessionStore`. `startAutopilot()` sets it to `Date.now()` via `setAutopilot({ timerStartedAt: Date.now() })` whenever a new interval fires (i.e., on start AND on each tick boundary). AgentPanel reads it from `$sessionStore.autopilot.timerStartedAt`. Svelte reactivity propagates the update automatically.
- **Option B**: Export a Svelte `readable` store from `autopilot.ts` (e.g., `export const timerStartMs = readable(0, ...)`) that is updated by `startAutopilot()`/each tick. AgentPanel imports this store directly.

Describe the implementation tradeoff for each option (Svelte reactivity, Node testability of `autopilot.ts`, coupling, number of files touched). Recommend one option with a one-sentence rationale. Do NOT implement — surface as OD-1 for Pilot resolution.

**§3 — RHYTHM_CATALOG family enumeration and dropdown structure.**
List all distinct `family` values present in the current 46-entry catalog. For each family, count the number of entries. State the total entry count to confirm ≥ 46. Describe the proposed dropdown structure: `<optgroup label={family}>` per family, one `<option>` per entry (value = entry `id`, display = entry `name`), plus a final ungrouped `<option value="otro">Otro…</option>`. Confirm whether Svelte's `<select>` supports `<optgroup>` natively (it does — HTML standard).

**§4 — i18n keys needed.**
List every new key to be added under `agent.autopilot` in `src/i18n/types.ts`, with proposed Spanish values for `es.ts`. Include: `panelToggleLabel` (chevron button aria/title), `rhythmHintLabel` (dropdown label), `rhythmHintOther` (the "Otro…" option display text), `rhythmHintPlaceholder` (placeholder for the free-text input), `rhythmHintOtherPlaceholder` (text input placeholder when "Otro" is selected), `playLabel` (start autopilot button), `stopLabel` (stop autopilot button), `progressTitle` (title/aria on the progress bar container). Existing keys (`btnOff`, `btnOn`, `titleOff`, `titleOn`, `cyclesLabel`, `infoTooltip`) may be renamed or repurposed — state any renames explicitly.

**§5 — CSS token audit and progress bar color plan.**
The Pilot directive specifies these progress colors: 0–60% uses `var(--accent)`, 60–85% uses `var(--tonic)`, 85–100% uses `var(--dom)`. Confirm the exact token names from `app.css` (the `--dom` token is `#e87bac`, NOT `--dominant`). State what CSS technique will drive the color transition: a `<style>` block with a reactive class (e.g., `.progress-bar.phase-tonic`, `.progress-bar.phase-dom`) switched by a Svelte reactive statement, or a CSS `var()` custom property set inline. No external dependencies. Confirm this is a purely visual use of the tonal-function colors (non-functional — not chord labeling), per the Pilot authorization in the phase directive.

Implementation requirements:
- Read all twelve files listed above before writing the inventory.
- Cover all five sections; missing a section results in REVISE.
- No source file modifications.
- Surface OD-1 with Option A and Option B spelled out; do NOT choose — mark as "STOP: Pilot decision required."

Validation:
- `docs/ai-jam/inventories/phase-06-inventory.md` exists and covers all five sections.
- No source files were modified (git status clean except the new inventory file).

Expected result:
- Inventory document exists with §1–§5.
- OD-1 (timer exposure) is clearly presented with both options.
- Pilot has the information needed to decide OD-1 before step 06.2 begins.

CHECKPOINT → Commit message:
`docs(ai-jam): Phase 06 step 06.1 — autopilot-redesign inventory`

---

## Step 06.2 — State layer: extend AutopilotState, update autopilot.ts, update sendEvolution

PROMPT → Read the required files and the OD-1 resolution in `docs/ai-jam/decisions.md` before touching any source. Implement the state layer changes only; do not modify AgentPanel.svelte or i18n files.

**Required reading (in order):**
1. `CLAUDE.md`
2. `docs/ai-jam/decisions.md` (OD-1 resolution must be present before starting)
3. `docs/ai-jam/handoffs/phase-06-handoff.md` (step 06.1 entry)
4. `docs/ai-jam/inventories/phase-06-inventory.md`
5. `src/state/session.ts` (AutopilotState, setAutopilot, DEFAULT_SESSION_STATE)
6. `src/lib/persistence.ts` (SavedSessionSchema and the exclusion of `autopilot`)
7. `src/agent/autopilot.ts` (startAutopilot, stopAutopilot, tick)
8. `src/agent/agent.ts` (sendEvolution — the user message construction block, lines 412–520)

Implementation requirements:
- Extend `AutopilotState` in `src/state/session.ts` with four new fields:
  - `panelOpen: boolean` — default `false`
  - `rhythmHint: string` — default `''` (catalog entry id, `'otro'`, or `''`)
  - `rhythmHintText: string` — default `''` (free text when `rhythmHint === 'otro'`)
  - `timerStartedAt: number` — default `0` (epoch ms; updated per OD-1 resolution)
  - All four are ephemeral; they must NOT appear in `SavedSessionSchema`. Confirm the existing exclusion mechanism covers the new fields (the `Omit` at `SavedSessionSchema` level already excludes the entire `autopilot` key — verify this and document in the handoff; no `SavedSessionSchema` change needed if already excluded wholesale).
- Update `DEFAULT_SESSION_STATE.autopilot` to include the four new fields with their defaults.
- Update `startAutopilot()` in `autopilot.ts` to implement the OD-1-resolved approach for `timerStartedAt`. If Option A (store field): call `setAutopilot({ timerStartedAt: Date.now() })` immediately before starting the interval, and again at the start of each successful `tick()` invocation (after the audio-playing guard, before `sendEvolution()`). If Option B (readable store): export the store from `autopilot.ts` and update it at the same two points.
- Update `sendEvolution()` in `agent.ts` to read `rhythmHint` and `rhythmHintText` from `get(sessionStore).autopilot` and inject them into the user message. Append after `availableRecipes` in the JSON object, before `JSON.stringify` is called. Field name in the JSON: `rhythmHint` (the catalog id, or `'otro'`); when `rhythmHint === 'otro'` and `rhythmHintText` is non-empty, also include `rhythmHintFreeText`. When `rhythmHint === ''`, omit both fields entirely (no empty string noise in the prompt). The human-readable label ("Orientación de estilo: …") is part of the JSON value if desired, or the LLM reads the field name. Prefer clean structured JSON: `"rhythmHint": "cueca-chilena-base"` or `"rhythmHintFreeText": "ritmo afrobeat denso con mucha síncopa"`.
- Write or update unit tests in `tests/agent/` that:
  - Assert that when `rhythmHint` is a catalog id, the user message JSON contains `"rhythmHint": "<id>"`.
  - Assert that when `rhythmHint === 'otro'` and `rhythmHintText` is non-empty, the user message JSON contains `"rhythmHintFreeText": "<text>"`.
  - Assert that when `rhythmHint === ''`, neither field appears in the JSON.
  - These tests must mock `get(sessionStore)` to inject the desired state (same pattern as existing autopilot tests if present).
- No changes to `AgentPanel.svelte` or i18n files in this step.

Validation:
- `pnpm exec tsc --noEmit` — clean
- `pnpm test` — all tests pass; new tests for sendEvolution rhythm-hint injection pass

Expected result:
- `AutopilotState` has six fields; four new ones have correct defaults.
- `startAutopilot()` updates `timerStartedAt` at start and on each tick per OD-1 resolution.
- `sendEvolution()` injects `rhythmHint` / `rhythmHintFreeText` into the user message JSON when set.
- Unit tests cover all three `rhythmHint` cases (catalog id, `'otro'` with text, empty).

CHECKPOINT → Commit message:
`feat(agent): Phase 06 step 06.2 — AutopilotState extension + sendEvolution rhythm hint injection`

---

## Step 06.3 — i18n: add new keys to all four locales and types.ts

PROMPT → Read the required files. Add all new i18n keys for the autopilot redesign to `src/i18n/types.ts` and all four locale files. Do not modify any other source file.

**Required reading (in order):**
1. `CLAUDE.md`
2. `docs/ai-jam/decisions.md`
3. `docs/ai-jam/handoffs/phase-06-handoff.md` (steps 06.1 and 06.2)
4. `docs/ai-jam/inventories/phase-06-inventory.md` (§4 — i18n keys list)
5. `src/i18n/types.ts` (full — current `agent.autopilot` namespace)
6. `src/i18n/locales/es.ts` (full — current autopilot values)
7. `src/i18n/locales/en.ts` (full)
8. `src/i18n/locales/pt.ts` (full)
9. `src/i18n/locales/zh.ts` (full)

Implementation requirements:
- Add to `Dictionary.agent.autopilot` in `src/i18n/types.ts`:
  - `panelToggleLabel: string` — aria/title for the expand/collapse chevron button
  - `rhythmHintLabel: string` — label displayed before the dropdown
  - `rhythmHintOther: string` — text shown in the "Otro…" option in the dropdown
  - `rhythmHintPlaceholder: string` — placeholder for the free-text input (when "Otro" is selected)
  - `playLabel: string` — label for the play/start button
  - `stopLabel: string` — label for the stop button
  - `progressTitle: string` — title/aria-label on the progress bar container
- Keep all existing keys (`btnOff`, `btnOn`, `titleOff`, `titleOn`, `cyclesLabel`, `infoTooltip`) unchanged — they are used by the current AgentPanel markup and will be repurposed or removed in step 06.4 (not here).
- Populate all four locales (`es`, `en`, `pt`, `zh`) for every new key. Spanish values per the inventory §4. Other locales: translate idiomatically. Technical tokens (ids, numbers) are never translated.
- The key-parity test (`tests/i18n/key-parity.test.ts`) must pass — all four locales must have identical key sets.
- No AgentPanel.svelte changes in this step.

Validation:
- `pnpm exec tsc --noEmit` — clean
- `pnpm exec vitest run i18n` — key-parity test passes
- `pnpm test` — all tests pass (no regressions)

Expected result:
- `types.ts` has seven new keys in `agent.autopilot`.
- All four locale files have those seven keys with appropriate translations.
- Key-parity test green.

CHECKPOINT → Commit message:
`feat(i18n): Phase 06 step 06.3 — autopilot redesign i18n keys (all four locales)`

---

## Step 06.4 — UI: autopilot panel redesign in AgentPanel.svelte + full quality gate

PROMPT → Read the required files in order. Redesign the autopilot section of `AgentPanel.svelte` to implement the new UX. Run the full quality gate. This is the last code step — include the full quality gate output in the handoff.

**Required reading (in order):**
1. `CLAUDE.md`
2. `docs/ai-jam/decisions.md`
3. `docs/ai-jam/handoffs/phase-06-handoff.md` (steps 06.1–06.3)
4. `docs/ai-jam/inventories/phase-06-inventory.md` (§3, §5 — dropdown structure, CSS color plan)
5. `src/ui/AgentPanel.svelte` (full — current markup and script)
6. `src/state/session.ts` (AutopilotState with new fields, setAutopilot)
7. `src/agent/autopilot.ts` (startAutopilot, stopAutopilot; note timer start time exposure per OD-1)
8. `src/core/music-knowledge/rhythm-catalog.ts` (RHYTHM_CATALOG array — import it)
9. `src/i18n/types.ts` (agent.autopilot namespace — all keys available after step 06.3)
10. `src/app/app.css` (CSS variable names: `--accent`, `--tonic`, `--dom`)

Implementation requirements:

**Script changes (AgentPanel.svelte `<script>` block):**
- Remove the `toggleAutopilot()` function (it simultaneously started/stopped and toggled UI — no longer the pattern).
- Add `togglePanel()`: flips `$sessionStore.autopilot.panelOpen` via `setAutopilot({ panelOpen: !autopilot.panelOpen })`. Does NOT call `startAutopilot()` or `stopAutopilot()`.
- Add `handlePlayStop()`: if `autopilot.enabled`, call `stopAutopilot(); setAutopilot({ enabled: false });`; else call `setAutopilot({ enabled: true }); startAutopilot();`. Same ordering discipline as the prior `toggleAutopilot()` (setAutopilot before startAutopilot per ADR 0022 D2 comment in the existing code).
- Import `RHYTHM_CATALOG` from `'../core/music-knowledge/rhythm-catalog.js'`. Build a reactive `$: families` list: group entries by `family` using a `Map<string, RhythmEntry[]>` derived from `RHYTHM_CATALOG`. This can be a non-reactive constant (computed once at module load) since the catalog is static data.
- Add a reactive `$: progressPct` that computes the progress percentage for the progress bar. Use `Date.now()` polled at ~60 fps via a Svelte `onMount` interval (or `setInterval` cleaned up on destroy). Formula: `Math.min(100, ((Date.now() - autopilot.timerStartedAt) / intervalMs) * 100)` where `intervalMs = Math.round((60000 * 4 / $sessionStore.bpm) * autopilot.intervalCycles)`. When `!autopilot.enabled` or `autopilot.timerStartedAt === 0`, `progressPct` is 0. The poll interval fires only when `autopilot.enabled` is true; when disabled, clear the interval. Use `onMount` / `onDestroy` from Svelte.
- Add `$: progressPhase`: `'accent'` when `progressPct < 60`, `'tonic'` when `60 <= progressPct < 85`, `'dom'` when `progressPct >= 85`. This drives a CSS class on the progress fill element.

**Markup changes:**
- Replace the current `<div class="toggles autopilot-row">` block entirely with the new autopilot section:

```
<!-- Autopilot section: expand/collapse chevron + config panel + play button + progress bar -->
<div class="autopilot-section">

  <!-- Header row: always visible -->
  <div class="autopilot-header">
    <!-- Chevron / expand toggle -->
    <button
      class="autopilot-toggle"
      class:open={autopilot.panelOpen}
      title={$t('agent.autopilot.panelToggleLabel')}
      aria-expanded={autopilot.panelOpen}
      on:click={togglePanel}
    >
      {autopilot.panelOpen ? '▼' : '▶'} {$t('agent.autopilot.panelToggleLabel')}
    </button>

    <!-- Minimal "playing" indicator: visible when playing AND panel is collapsed -->
    {#if autopilot.enabled && !autopilot.panelOpen}
      <span class="autopilot-live-dot" aria-label={$t('agent.autopilot.btnOn')}></span>
    {/if}
  </div>

  <!-- Expandable config panel -->
  {#if autopilot.panelOpen}
    <div class="autopilot-config">
      <!-- Cycles input (moved from old autopilot-row) -->
      <label class="interval-label">
        {$t('agent.autopilot.cyclesLabel')}:
        <input
          type="number"
          class="interval-input"
          min="2"
          max="32"
          step="2"
          value={autopilot.intervalCycles}
          disabled={autopilot.enabled}
          on:change={(e) =>
            setAutopilot({ intervalCycles: +(e.target as HTMLInputElement).value })}
        />
      </label>

      <!-- Rhythm hint dropdown -->
      <label class="rhythm-hint-label">
        {$t('agent.autopilot.rhythmHintLabel')}:
        <select
          class="rhythm-hint-select"
          value={autopilot.rhythmHint}
          disabled={autopilot.enabled}
          on:change={(e) =>
            setAutopilot({ rhythmHint: (e.target as HTMLSelectElement).value, rhythmHintText: '' })}
        >
          <option value="">{$t('agent.autopilot.rhythmHintPlaceholder')}</option>
          {#each [...families.entries()] as [family, entries]}
            <optgroup label={family}>
              {#each entries as entry}
                <option value={entry.id}>{entry.name}</option>
              {/each}
            </optgroup>
          {/each}
          <option value="otro">{$t('agent.autopilot.rhythmHintOther')}</option>
        </select>
      </label>

      <!-- Free-text input: only when "otro" is selected -->
      {#if autopilot.rhythmHint === 'otro'}
        <input
          type="text"
          class="rhythm-hint-text"
          placeholder={$t('agent.autopilot.rhythmHintPlaceholder')}
          value={autopilot.rhythmHintText}
          disabled={autopilot.enabled}
          on:input={(e) =>
            setAutopilot({ rhythmHintText: (e.target as HTMLInputElement).value })}
        />
      {/if}

      <!-- Play / Stop button -->
      <button
        class="autopilot-play-btn"
        class:active={autopilot.enabled}
        on:click={handlePlayStop}
      >
        {autopilot.enabled ? $t('agent.autopilot.stopLabel') : $t('agent.autopilot.playLabel')}
      </button>

      <!-- Progress timeline -->
      <div
        class="autopilot-progress-track"
        title={$t('agent.autopilot.progressTitle')}
        aria-label={$t('agent.autopilot.progressTitle')}
        role="progressbar"
        aria-valuenow={Math.round(progressPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          class="autopilot-progress-fill phase-{progressPhase}"
          style="width: {progressPct}%"
        ></div>
      </div>
    </div>
  {/if}
</div>
```

**Style changes (within `AgentPanel.svelte <style>` block):**
- Remove styles for the old `.autopilot-row`, `.autopilot-btn`, `.autopilot-info`, `.interval-label`, `.interval-input` if they exist in the component-scoped `<style>` block (leave any global-scope rules in `app.css` intact).
- Add:
  - `.autopilot-section` — container; consistent padding with other agent panel sections.
  - `.autopilot-header` — flex row; align-items center; gap.
  - `.autopilot-toggle` — styled like a subtle section-header button (no border by default, hover shows background).
  - `.autopilot-live-dot` — small pulsing circle (use `@keyframes pulse` if already defined in `app.css`, or define locally); color `var(--dom)`.
  - `.autopilot-config` — flex column; gap; padding-top.
  - `.interval-label`, `.interval-input` — same as existing styles (moved from old location if needed).
  - `.rhythm-hint-label`, `.rhythm-hint-select`, `.rhythm-hint-text` — consistent with other inputs in the panel.
  - `.autopilot-play-btn` — distinct play button style; when `.active`, uses `var(--dom)` or similar indicator.
  - `.autopilot-progress-track` — full-width container; height ~4px; background `var(--stroke)`; border-radius; overflow hidden.
  - `.autopilot-progress-fill` — height 100%; transition width 0.3s linear; color driven by class:
    - `.phase-accent` → `background: var(--accent)`
    - `.phase-tonic` → `background: var(--tonic)`
    - `.phase-dom` → `background: var(--dom)`
- The recipe card (`{#if $sessionStore.lastRecipeApplied}`) stays in its current position below the autopilot section (no change to that block).

**Quality gate (all must pass clean):**
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test` — test count must be ≥ 1533 (no regressions; no new unit tests needed for pure UI step, but count must not drop)
- `pnpm build` — successful

**Live-system verification (Checkpoint #5):**
The Pilot must verify in the running dev server:
- A-06-01: clicking the chevron expands/collapses the config panel; stopping audio while panel is open does NOT collapse it.
- A-06-02: the dropdown lists all catalog families and entries plus "Otro…".
- A-06-05: the Play button starts the timer; pressing again stops it; the button label changes.
- A-06-06: the progress bar fills over one cycle and resets; color transitions accent → tonic → dom.
- A-06-07: when panel is collapsed and autopilot is playing, the live-dot indicator is visible.

Validation:
- `pnpm exec tsc --noEmit` — clean
- `pnpm lint` — clean
- `pnpm test` — ≥ 1533 tests pass
- `pnpm build` — successful
- Pilot live-system verification of A-06-01, A-06-02, A-06-05, A-06-06, A-06-07

Expected result:
- AgentPanel shows the redesigned autopilot section.
- All eight acceptance criteria satisfied.
- Quality gate fully green.

CHECKPOINT → Commit message:
`feat(ui): Phase 06 step 06.4 — autopilot panel redesign (expand/collapse, dropdown, play button, progress bar)`

---

## Phase Acceptance

- **A-06-01** — Clicking the autopilot toggle (chevron) expands or collapses the configuration panel; collapsing the panel while the autopilot is actively playing does NOT stop the autopilot timer.
  - Validation method: `live-system`

- **A-06-02** — The rhythm hint dropdown lists all RHYTHM_CATALOG entries (≥ 46) grouped by family plus a final "Otro…" option; selecting "Otro…" reveals a free-text input.
  - Validation method: `live-system`

- **A-06-03** — When a catalog rhythm id is selected, `sendEvolution()` injects it as `rhythmHint` in the user message JSON sent to the LLM.
  - Validation method: `proxy:static-analysis` + `unit`

- **A-06-04** — When "Otro" is selected and a free-text string is entered, `sendEvolution()` injects it as `rhythmHintFreeText` in the user message JSON; when no hint is set, neither field appears.
  - Validation method: `proxy:static-analysis` + `unit`

- **A-06-05** — The Play button inside the expanded config panel starts the autopilot timer; pressing it again (or pressing it when active) stops the timer; the button label switches between play and stop labels.
  - Validation method: `live-system`

- **A-06-06** — The progress timeline fills from 0% to 100% over one cycle interval, then resets to 0% when the next evolution fires; the fill color is `var(--accent)` from 0–60%, `var(--tonic)` from 60–85%, and `var(--dom)` from 85–100%.
  - Validation method: `live-system`

- **A-06-07** — When the configuration panel is collapsed while the autopilot is playing, a minimal pulsing indicator (live-dot) remains visible in the panel header row so the user knows the autopilot is active.
  - Validation method: `live-system`

- **A-06-08** — The four new `AutopilotState` fields (`panelOpen`, `rhythmHint`, `rhythmHintText`, `timerStartedAt`) are excluded from `SavedSessionSchema` and do not affect the saved session blob or `SESSION_SCHEMA_VERSION`.
  - Validation method: `proxy:static-analysis`

- **A-06-09** — `tsc --noEmit`, `pnpm lint`, `pnpm test` (≥ 1533 tests), and `pnpm build` all pass clean.
  - Validation method: `live-system`

---

## Partial coverage from prior phase

No prior partials to address. Phase 05's six acceptance criteria were all COVERED at phase completion.

---

## ADR Triggers

No new ADR required for this phase. The new `AutopilotState` fields follow the existing ADR 0022 D1/D7 ephemeral-exclusion pattern and do not introduce a new architectural decision. If the Pilot resolves OD-1 in a way that contradicts ADR 0022 D1 (e.g., by using a module-level Svelte store exported from `autopilot.ts` instead of a `sessionStore` field), that deviation must be documented as an amendment to ADR 0022 before step 06.2 begins.

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/ai-jam/handoffs/phase-06-handoff.md`. See `handoff-template.md`.
