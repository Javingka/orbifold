<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 06 Inventory — Autopilot UX Redesign

**Date:** 2026-06-19
**Branch:** `ai-jam/phase-06`
**Produced by:** Dev (step 06.1)

Source files read:
- `src/ui/AgentPanel.svelte`
- `src/agent/autopilot.ts`
- `src/state/session.ts`
- `src/agent/agent.ts`
- `src/core/music-knowledge/rhythm-catalog.ts`
- `src/i18n/types.ts`
- `src/i18n/locales/es.ts`
- `src/app/app.css`
- `src/lib/persistence.ts` (exclusion mechanism verification)

---

## §1 — Current AutopilotState Shape and Extension Plan

### 1.1 Current `AutopilotState` (session.ts lines 334–337)

```typescript
export interface AutopilotState {
  enabled: boolean;       // Whether the autopilot timer is currently active
  intervalCycles: number; // Range: 2–32; default: 8
}
```

Default values in `DEFAULT_SESSION_STATE.autopilot` (session.ts lines 426–429):

```typescript
autopilot: {
  enabled: false,
  intervalCycles: 8,
},
```

### 1.2 Current toggle behavior in AgentPanel

The current `toggleAutopilot()` function (AgentPanel.svelte lines 112–120) simultaneously:
1. Starts OR stops the timer (`startAutopilot()` / `stopAutopilot()`).
2. Updates `enabled` in the store via `setAutopilot({ enabled: ... })`.

There is no `panelOpen` state. The UI section is always-visible (`<div class="toggles autopilot-row">`), showing a single button, the cycle count input, and an info icon.

### 1.3 Current autopilot markup (AgentPanel.svelte lines 552–580)

```html
<div class="toggles autopilot-row">
  <button
    class="autopilot-btn"
    class:active={autopilot.enabled}
    on:click={toggleAutopilot}
    title={autopilot.enabled ? $t('agent.autopilot.titleOn') : $t('agent.autopilot.titleOff')}
  >
    {autopilot.enabled ? $t('agent.autopilot.btnOn') : $t('agent.autopilot.btnOff')}
  </button>
  <label class="interval-label">
    {$t('agent.autopilot.cyclesLabel')}:
    <input
      type="number"
      class="interval-input"
      min="2" max="32" step="2"
      value={autopilot.intervalCycles}
      disabled={autopilot.enabled}
      on:change={(e) =>
        setAutopilot({ intervalCycles: +(e.target as HTMLInputElement).value })}
    />
  </label>
  <span
    class="autopilot-info"
    data-tip={$t('agent.autopilot.infoTooltip')}
    aria-label={$t('agent.autopilot.infoTooltip')}>ⓘ</span>
</div>
```

CSS classes for the autopilot section currently live in `app.css` (lines 887–934):
- `.autopilot-btn` — button with `.active` modifier
- `.interval-label` — flex row containing label + input
- `.interval-input` — number input (44px wide, disabled state at 0.4 opacity)
- `.autopilot-info` — info icon tooltip cursor

### 1.4 Proposed new fields

| Field            | Type      | Default | Serialized? |
|------------------|-----------|---------|-------------|
| `panelOpen`      | `boolean` | `false` | No (ephemeral) |
| `rhythmHint`     | `string`  | `''`    | No (ephemeral) |
| `rhythmHintText` | `string`  | `''`    | No (ephemeral) |
| `timerStartedAt` | `number`  | `0`     | No (ephemeral) |

### 1.5 Exclusion mechanism — confirmed no SavedSessionSchema change needed

`SavedSessionSchema` (persistence.ts lines 229–239) is defined as a `z.object(...)` with explicit fields `version`, `bpm`, `view`, `chordMode`, `harmony`, `rhythm`, and `composition`. The `autopilot` key is **absent from the schema entirely** — it is never enumerated. Therefore:

- `serializeSession()` (persistence.ts lines 251–330) never writes `autopilot` to the saved blob; the function only writes the fields present in `SavedSessionSchema`.
- `deserializeSession()` (persistence.ts lines 342–344) returns `Omit<SessionState, 'nowPlaying' | 'autopilot'>` — the return type explicitly excludes `autopilot` at the TypeScript level.

**Conclusion:** Adding four new fields to `AutopilotState` requires **no change** to `SavedSessionSchema`, `SESSION_SCHEMA_VERSION`, or `serializeSession`. The entire `autopilot` sub-object is excluded wholesale by the schema's omission. The four new fields are automatically excluded along with the existing two.

---

## §2 — OD-1: Timer Start Time Exposure Strategy

**Context:** The progress bar in AgentPanel needs `timerStartedAt` (epoch ms when the current interval began) to compute `progressPct = Math.min(100, (Date.now() - timerStartedAt) / intervalMs * 100)`. Currently `autopilot.ts` only exposes `startAutopilot()` and `stopAutopilot()` — all internal state (`_timerId`, `_isEvolving`) is module-level private.

### Option A — Add `timerStartedAt: number` to `AutopilotState` in `sessionStore`

**Mechanism:** `startAutopilot()` calls `setAutopilot({ timerStartedAt: Date.now() })` immediately before creating the `setInterval`. On each `tick()`, after the audio-playing guard and before `sendEvolution()`, it calls `setAutopilot({ timerStartedAt: Date.now() })` again to mark the start of the new interval. `stopAutopilot()` calls `setAutopilot({ timerStartedAt: 0 })` to reset.

**Files touched:** `src/state/session.ts` (add field to interface + default), `src/agent/autopilot.ts` (two `setAutopilot` calls), `src/ui/AgentPanel.svelte` (reads `$sessionStore.autopilot.timerStartedAt`).

**Svelte reactivity:** Full — AgentPanel reads `$sessionStore.autopilot.timerStartedAt` which is a reactive store subscription. Each tick-boundary update triggers Svelte's reactive machinery automatically. The progress bar poll interval in AgentPanel reads the store value directly.

**Node testability of `autopilot.ts`:** Maintained — `setAutopilot` is already imported from `session.ts` in `autopilot.ts`; both are pure Node-compatible modules (no DOM). The dynamic import of `strudel.ts` (ADR 0022 D6) is already the only browser-only code path.

**Coupling:** Moderate. `autopilot.ts` already imports and calls `setAutopilot` (it reads `get(sessionStore)` on every start). Adding two more `setAutopilot` calls stays within the existing coupling contract.

**Schema exclusion:** Automatic — `timerStartedAt` is a field of `AutopilotState`, which is already excluded wholesale from `SavedSessionSchema` (see §1.5). No schema work required.

**Test impact:** Existing autopilot tests mock `get(sessionStore)`. New `timerStartedAt` assertions can mock `setAutopilot` calls at start/tick.

---

### Option B — Export a Svelte `readable` store from `autopilot.ts`

**Mechanism:** `autopilot.ts` exports `export const timerStartMs = writable(0)`. `startAutopilot()` sets `timerStartMs.set(Date.now())` at start and on each tick boundary. `stopAutopilot()` sets `timerStartMs.set(0)`. AgentPanel imports `timerStartMs` from `autopilot.ts` and subscribes with `$timerStartMs`.

**Files touched:** `src/agent/autopilot.ts` (add `writable` import + export + two `set` calls), `src/ui/AgentPanel.svelte` (import + subscribe).

**Svelte reactivity:** Full — `$timerStartMs` in AgentPanel is a standard Svelte store subscription.

**Node testability of `autopilot.ts`:** Maintained — `svelte/store`'s `writable` works in Node (Vitest). No DOM imports added.

**Coupling:** Slightly different: AgentPanel gains a direct import of `autopilot.ts` (currently it only imports `startAutopilot`/`stopAutopilot`). This is a new inter-module link from UI → timer module. It does NOT add a coupling from `autopilot.ts` to Svelte components.

**Schema exclusion:** Not applicable — the store is module-level, not part of `SessionState`.

**ADR 0022 implication:** ADR 0022 D1 states "`AutopilotState { enabled, intervalCycles }` lives in `SessionState`". A module-level store exported from `autopilot.ts` is architecturally consistent with ADR 0022 D1 (which is about the ephemeral state fields, not about precluding supplementary module stores), but deviates from the stated pattern of "autopilot runtime state lives in sessionStore." If the Pilot resolves OD-1 with Option B, the phase spec requires documenting this as an amendment to ADR 0022.

---

### Recommendation

**Option A** is recommended. Rationale: `timerStartedAt` is clearly autopilot runtime state — colocating it with `enabled` and `intervalCycles` in `AutopilotState` is architecturally cleaner and avoids introducing a second ephemeral store outside `sessionStore`. It does not add new inter-module links. The schema exclusion is automatic. The `setAutopilot` pattern is already established in `autopilot.ts`.

**STOP — OD-1 is an open decision. Pilot resolution is mandatory before step 06.2 begins.**

---

## §3 — RHYTHM_CATALOG Family Enumeration and Dropdown Structure

### 3.1 Family groups and entry counts

Enumerated from `RHYTHM_CATALOG` (46 total entries, confirmed by source comment "Total: 46 entries"):

| Family         | Entry count | Entry IDs |
|----------------|-------------|-----------|
| `clave`        | 8           | `tresillo`, `cinquillo`, `habanera-euclid`, `son-clave-3-2`, `son-clave-2-3`, `rumba-clave-3-2`, `rumba-clave-2-3`, `bossa-nova-clave`, `bossa-nova-variation` |
| `straight`     | 6           | `eighth-half`, `four-of-eight`, `minimal-12`, `standard-12`, `eighth-notes-16`, `quarter-notes-16` |
| `dense`        | 1           | `seven-of-eight` |
| `bell-pattern` | 2           | `bell-pattern-west-african`, `sparse-bell-12` |
| `euclidean`    | 8           | `euclid-5-16`, `euclid-7-16`, `euclid-9-16`, `euclid-3-16`, `euclid-11-16`, `three-of-four`, `five-sparse`, `five-medium` |
| `cascara`      | 1           | `cascara-euclid` |
| `aksak`        | 4           | `aksak-7-sparse`, `aksak-7-dense`, `aksak-9-medium`, `aksak-9-dense` |
| `backbeat`     | 1           | `backbeat-snare` |
| `cueca`        | 2           | `cueca-chilena-base`, `cueca-chilena-syncopated` |
| `samba`        | 3           | `samba-surdo-base`, `samba-caixa`, `samba-euclid` |
| `cumbia`       | 2           | `cumbia-caja`, `cumbia-guache` |
| `candombe`     | 2           | `candombe-chico`, `candombe-repique` |
| `milonga`      | 1           | `milonga-base` |
| `flamenco`     | 2           | `buleria-12`, `solea-12` |
| `tabla`        | 2           | `baladi-16`, `maqsum-struct` |

**Recount check:** 8+6+1+2+8+1+4+1+2+3+2+2+1+2+2 = 45. However, `bossa-nova-variation` is listed under `clave` above making it 9 for `clave` and total 46. Verified: `bossa-nova-variation` has `family: 'clave'`. Total = 46. Confirmed.

Corrected count for `clave`: 9 entries (`tresillo`, `cinquillo`, `habanera-euclid`, `son-clave-3-2`, `son-clave-2-3`, `rumba-clave-3-2`, `rumba-clave-2-3`, `bossa-nova-clave`, `bossa-nova-variation`).

Total confirmed: 46 entries across 15 families.

### 3.2 Dropdown structure

The `<select>` for rhythm hint will use standard HTML `<optgroup>` elements — Svelte supports them natively as it compiles to standard HTML. The structure:

```svelte
<select ...>
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
```

The `families` map is built from `RHYTHM_CATALOG` at module load time (static data — no reactivity needed):

```typescript
import { RHYTHM_CATALOG } from '../core/music-knowledge/rhythm-catalog.js';
const families = new Map<string, typeof RHYTHM_CATALOG>();
for (const entry of RHYTHM_CATALOG) {
  const group = families.get(entry.family) ?? [];
  group.push(entry);
  families.set(entry.family, group);
}
```

The map insertion order preserves catalog order, so families appear in the order their first member appears in the catalog.

---

## §4 — i18n Gap: New Keys Needed

### 4.1 Existing keys under `agent.autopilot`

Currently in `src/i18n/types.ts` (lines 240–253) and `src/i18n/locales/es.ts` (lines 210–218):

| Key            | Current Spanish value |
|----------------|-----------------------|
| `btnOff`       | `'Autopilot'` |
| `btnOn`        | `'Autopilot ●'` |
| `titleOff`     | `'Activar piloto automático'` |
| `titleOn`      | `'Piloto automático activo — clic para detener'` |
| `cyclesLabel`  | `'Ciclos'` |
| `infoTooltip`  | `'Piloto automático: el agente evoluciona ritmo y armonía...'` |

All six existing keys are **retained unchanged** — they remain in the type and all locale files. The phase spec (step 06.4) says they "may be renamed or repurposed" but only in step 06.4; step 06.3 must not remove them.

### 4.2 New keys to add (seven new keys)

| Key                       | TypeScript type | Proposed Spanish value (es.ts) |
|---------------------------|-----------------|-------------------------------|
| `panelToggleLabel`        | `string`        | `'Piloto automático'` |
| `rhythmHintLabel`         | `string`        | `'Estilo rítmico'` |
| `rhythmHintOther`         | `string`        | `'Otro…'` |
| `rhythmHintPlaceholder`   | `string`        | `'— ninguno —'` |
| `rhythmHintOtherPlaceholder` | `string`     | `'describe el estilo rítmico…'` |
| `playLabel`               | `string`        | `'▶ Iniciar'` |
| `stopLabel`               | `string`        | `'■ Detener'` |
| `progressTitle`           | `string`        | `'Progreso del ciclo de evolución'` |

**Note on key name alignment with phase spec:** The phase spec step 06.1 PROMPT lists `rhythmHintOtherPlaceholder` as a separate key from `rhythmHintPlaceholder`. Step 06.2 spec uses `rhythmHintPlaceholder` for the free-text input (when "Otro" selected) and the dropdown's empty/default option. Step 06.3 spec lists `rhythmHintPlaceholder` (not `rhythmHintOtherPlaceholder`) as one of the seven keys. The phase spec §4 in the actual implementation requirements lists seven keys; the inventory prompt names `rhythmHintOtherPlaceholder` as one of them. Both names will be added to cover the spec:

Final seven keys for step 06.3 (per phase spec implementation requirements, lines 138–144):
1. `panelToggleLabel`
2. `rhythmHintLabel`
3. `rhythmHintOther`
4. `rhythmHintPlaceholder`
5. `playLabel`
6. `stopLabel`
7. `progressTitle`

The markup in step 06.4 spec uses `rhythmHintPlaceholder` for both the default `<option>` text and the free-text `<input>` placeholder. The distinction between the dropdown no-selection label and the text-input placeholder is handled by a single key.

### 4.3 All four locale proposed values

| Key                    | `es`                                    | `en`                               | `pt`                                | `zh`               |
|------------------------|-----------------------------------------|------------------------------------|-------------------------------------|--------------------|
| `panelToggleLabel`     | `'Piloto automático'`                   | `'Autopilot'`                      | `'Piloto automático'`               | `'自动驾驶'`         |
| `rhythmHintLabel`      | `'Estilo rítmico'`                      | `'Rhythm style'`                   | `'Estilo rítmico'`                  | `'节奏风格'`         |
| `rhythmHintOther`      | `'Otro…'`                               | `'Other…'`                         | `'Outro…'`                          | `'其他…'`           |
| `rhythmHintPlaceholder`| `'— ninguno —'`                         | `'— none —'`                       | `'— nenhum —'`                      | `'— 无 —'`         |
| `playLabel`            | `'▶ Iniciar'`                           | `'▶ Start'`                        | `'▶ Iniciar'`                       | `'▶ 开始'`          |
| `stopLabel`            | `'■ Detener'`                           | `'■ Stop'`                         | `'■ Parar'`                         | `'■ 停止'`          |
| `progressTitle`        | `'Progreso del ciclo de evolución'`     | `'Evolution cycle progress'`       | `'Progresso do ciclo de evolução'`  | `'进化周期进度'`     |

---

## §5 — CSS Token Audit and Progress Bar Color Plan

### 5.1 Exact token names from `app.css` (lines 33–48)

```css
:root {
  --tonic:  #f3b15a;  /* tónica */
  --subdom: #56cfc4;  /* subdominante */
  --dom:    #e87bac;  /* dominante */
  --accent: #8aa0ff;  /* selección / voice leading */
  --stroke: rgba(255, 255, 255, 0.085);
}
```

**Confirmed token names:**
- Accent color (`#8aa0ff`): **`--accent`**
- Tonic color (`#f3b15a`): **`--tonic`**
- Dominant color (`#e87bac`): **`--dom`** (NOT `--dominant`)

The token `--dom` (line 45 of `app.css`) is already confirmed: the comment reads `/* dominante */`. The phase spec's reference to `var(--dom)` is correct.

### 5.2 Progress bar color plan

Phase-based CSS class approach (three reactive classes on the fill element):

| `progressPct` range | Class applied      | CSS token      | Color value  |
|---------------------|--------------------|----------------|--------------|
| 0–59%               | `.phase-accent`    | `var(--accent)` | `#8aa0ff`   |
| 60–84%              | `.phase-tonic`     | `var(--tonic)`  | `#f3b15a`   |
| 85–100%             | `.phase-dom`       | `var(--dom)`    | `#e87bac`   |

Svelte reactive statement:

```svelte
$: progressPhase = progressPct < 60 ? 'accent' : progressPct < 85 ? 'tonic' : 'dom';
```

The fill div uses `class="autopilot-progress-fill phase-{progressPhase}"` — a Svelte template string class that applies the phase suffix dynamically.

CSS rules in AgentPanel.svelte `<style>` block:

```css
.autopilot-progress-fill.phase-accent { background: var(--accent); }
.autopilot-progress-fill.phase-tonic  { background: var(--tonic);  }
.autopilot-progress-fill.phase-dom    { background: var(--dom);    }
```

### 5.3 Existing `@keyframes pulse` in `app.css`

`app.css` (lines 222–230) already defines:

```css
@keyframes pulse {
  0%, 100% { opacity: 1;    }
  50%       { opacity: 0.35; }
}
```

The `.autopilot-live-dot` element (shown when autopilot is playing and panel is collapsed) can reference this existing keyframe without re-defining it in the component `<style>` block.

### 5.4 Non-functional use of tonal-function colors

The use of `--accent`, `--tonic`, and `--dom` on the progress bar is purely visual (progress timeline feedback) — it does NOT label chords or imply harmonic function. This is authorized by the phase directive and is consistent with the broader project pattern (e.g., `.tl-block.groove` uses `rgba(138,160,255,0.2)` = accent-based color for block type, not chord labeling).

The `--stroke` token (currently `rgba(255,255,255,0.085)`) will be used for the progress track background:

```css
.autopilot-progress-track {
  background: var(--stroke);
}
```

---

## §6 — sendEvolution Injection Point

### 6.1 Current `userMessage` construction (agent.ts lines 421–446)

```typescript
const state = get(sessionStore);
const stateSnapshot = {
  rhythm: { layers: state.rhythm.layers },
  harmony: {
    root: NOTE_NAMES[state.harmony.root],
    mode: state.harmony.mode,
    octave: state.harmony.octave,
    progression: state.harmony.progression.map((ch) => {
      // ... maps to AgentOutputSchema format
    }),
  },
};
const availableRecipes = getExpressibleRecipes().map((r) => r.id);
const userMessage = JSON.stringify({ ...stateSnapshot, availableRecipes }, null, 2);
```

The object passed to `JSON.stringify` currently has three top-level keys: `rhythm`, `harmony`, and `availableRecipes`.

### 6.2 Injection point

The new `rhythmHint` / `rhythmHintFreeText` fields will be appended to the spread object, after `availableRecipes`. The exact injection:

```typescript
const { rhythmHint, rhythmHintText } = state.autopilot;
const rhythmHintPayload: Record<string, string> = {};
if (rhythmHint && rhythmHint !== '') {
  rhythmHintPayload['rhythmHint'] = rhythmHint;
  if (rhythmHint === 'otro' && rhythmHintText.trim()) {
    rhythmHintPayload['rhythmHintFreeText'] = rhythmHintText.trim();
  }
}
const userMessage = JSON.stringify(
  { ...stateSnapshot, availableRecipes, ...rhythmHintPayload },
  null,
  2
);
```

When `rhythmHint === ''`: neither field appears (empty spread object).
When `rhythmHint === 'cueca-chilena-base'`: `"rhythmHint": "cueca-chilena-base"` appended.
When `rhythmHint === 'otro'` and `rhythmHintText === 'ritmo afrobeat denso'`: both `"rhythmHint": "otro"` and `"rhythmHintFreeText": "ritmo afrobeat denso"` appended.

---

## §7 — No New Vitest Test Files

**A-06-03/04** (static analysis + unit) require verification that `sendEvolution()` correctly injects `rhythmHint` and `rhythmHintFreeText` into the user message JSON.

**Existing coverage:** `tests/agent/` already contains tests for agent behavior. The `tests/agent-recipe-wiring.test.ts` pattern (referenced in the phase spec) covers the autopilot/sendEvolution pathway. The injection in `sendEvolution()` (agent.ts) can be tested by mocking `get(sessionStore)` to return an `autopilot` with the desired `rhythmHint`/`rhythmHintText` values and asserting the resulting `userMessage` string.

**No new test files needed.** The tests for step 06.2 will be added to the existing `tests/agent/` directory as new `describe` blocks within an existing test file or a new file in that directory (per the step 06.2 spec: "Write or update unit tests in `tests/agent/`"). They do not require a new top-level test file.

**Conclusion:** A-06-03 (proxy:static-analysis — reading agent.ts after step 06.2 is complete) and A-06-04 (unit — the three injection cases) are satisfied by step 06.2's new tests. Step 06.1 (inventory) confirms no existing test restructuring is required.

---

## Summary of Open Decisions

| ID   | Decision Required | Options | Location in inventory |
|------|-------------------|---------|----------------------|
| OD-1 | Timer start time exposure strategy | Option A: `timerStartedAt` in `AutopilotState`; Option B: exported `writable` store from `autopilot.ts` | §2 |

**All other sections are fully resolved. OD-1 is the only open decision blocking step 06.2.**
