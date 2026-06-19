<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 04 Inventory — Recipe Intent Display

**Date:** 2026-06-19
**Step:** 04.1 — Inventory only. No source files modified.

**Source-of-truth files read (all fully):**
- `src/ui/AgentPanel.svelte` — 411 lines, full
- `src/state/session.ts` — 1843 lines, full
- `src/agent/agent.ts` — 833 lines, full
- `src/agent/schema.ts` — 329 lines, full (`MusicalIntent` type)
- `src/core/music-knowledge/rhythm-harmony-recipes.ts` — 354 lines, full
- `src/core/music-knowledge/query.ts` — 146 lines, full
- `src/i18n/locales/es.ts` — 314 lines, full
- `src/i18n/types.ts` — 359 lines, full

---

## Section 1 — OD-1: State Location for "Last Recipe Applied"

### Option A — `SessionState` field (ephemeral, per ADR 0022 D1/D7 pattern)

**Mechanism:** Add `lastRecipeApplied?: LastRecipeDisplay` to `SessionState` in `src/state/session.ts`. Excluded from `SavedSessionSchema` (no change to `serializeSession`). Reactive via `$sessionStore.lastRecipeApplied` in the Svelte component. Add a `setLastRecipeApplied(display: LastRecipeDisplay | null): void` store action following the `setAutopilot` precedent.

**Tradeoffs:**
- Pro: Identical pattern to `AutopilotState` — ADR 0022 D1/D7 already governs this class of ephemeral runtime state. No new module, no new state atom type, no new import surface.
- Pro: `AgentPanel.svelte` already imports `sessionStore` and `setAutopilot` from `session.ts`; a `setLastRecipeApplied` import adds one name to an existing import line.
- Pro: `$sessionStore` reactivity already wired in the component (`$sessionStore.autopilot` pattern at line 100); `$sessionStore.lastRecipeApplied` follows the same path — zero new reactive machinery.
- Pro: Automatically cleared when `applyLoadedSession` runs (new state overwrites store), which is the correct behavior — loading a saved session should not restore the recipe card (A-04-06).
- Con: `SessionState` grows by one optional field, increasing the surface that `serializeSession` and `deserializeSession` must consciously exclude.
- Con: `session.ts` is already very large (1843 lines); adding a new `setLastRecipeApplied` action adds a small amount to it.

**ADR requirement:** No new ADR needed. The pattern is already codified in ADR 0022 D1/D7. The inventory must note this; the Pilot need only approve the choice.

### Option B — Svelte writable store (separate module)

**Mechanism:** Create `src/state/agentRecipeDisplay.ts` with a standalone `writable<LastRecipeDisplay | null>` named `lastRecipeApplied` (default `null`) and a typed setter. No `SessionState` change.

**Tradeoffs:**
- Pro: Simpler — `session.ts` is not touched; the new file is self-contained and small.
- Pro: Decouples the recipe-display concern from `SessionState` entirely.
- Con: Introduces a parallel state atom outside `SessionState` — a new store module outside the established `session.ts`/`composition.ts` pattern. Creates precedent for other features to fragment ephemeral state into one-off modules.
- Con: `AgentPanel.svelte` must import from a new module (`agentRecipeDisplay.ts`) on top of the existing `session.ts` import, adding a new import line.
- Con: The store is NOT automatically cleared when `applyLoadedSession` runs. A separate subscription or explicit call in `applyLoadedSession` would be required to satisfy A-04-06. Without it, loading a saved session does not reset the card (the card persists from before). This is a non-trivial gap.
- Con: If a future phase adds more ephemeral agent-display atoms, this pattern encourages a proliferation of small store modules. The `SessionState` pattern keeps them co-located.

**ADR requirement:** If Option B is chosen, it departs from the ADR 0022 D1/D7 precedent for ephemeral state and introduces a new rule ("ephemeral agent-display state lives in standalone writable stores, not in SessionState"). An ADR or explicit decisions-register entry is needed before step 04.2 begins, because future phases will follow this precedent.

### Pilot decision required

The Pilot must choose Option A or Option B before step 04.2. The inventory recommends Option A: it is pattern-consistent with ADR 0022, requires no new ADR, and automatically satisfies A-04-06 without extra wiring.

---

## Section 2 — OD-2: Field Selection (What to Display)

### Minimum set (always rendered when the card is shown)

These fields are always available at the `sendEvolution()` call site when `skill.musicalIntent?.recipeId` is present AND `recipe !== undefined`:

| Field in card | Source | Type in `LastRecipeDisplay` | Notes |
|---|---|---|---|
| `recipeName` | `recipe.name` (`MusicalRecipe.name`) | `string` | Always present on a valid recipe |
| `rhythmIds` | `recipe.rhythmIds` (`MusicalRecipe.rhythmIds`) | `string[]` | Always 1+ elements; join with commas for display |
| `harmonyId` | `recipe.harmonyId` (`MusicalRecipe.harmonyId`) | `string` | Always present |
| `density` | `recipe.density` (`MusicalRecipe.density`) | `'sparse' \| 'medium' \| 'dense'` | Always one of three values |
| `recipeId` | `recipe.id` | `string` | Needed for identity / key; no display required but useful for debugging |

### Optional annotation fields (rendered only when the LLM supplied them)

These fields come from `skill.musicalIntent` and may be absent:

| Field in card | Source | Type in `LastRecipeDisplay` | Notes |
|---|---|---|---|
| `explanation` | `skill.musicalIntent.explanation` | `string \| undefined` | Zod: `z.string().max(300).optional()` — most LLM responses include this |
| `style` | `skill.musicalIntent.style` | `string \| undefined` | Free-text style label; present when the LLM annotates style |
| `complexity` | `skill.musicalIntent.complexity` | `'simple' \| 'medium' \| 'dense' \| undefined` | Zod enum; note vocabulary mismatch with `MusicalRecipe.density` ('sparse' vs 'simple') — see §2.1 |

**Not included (rationale):**
- `musicalIntent.cultureTags` — `string[] array`; would require complex rendering; defer.
- `musicalIntent.mood` — Low signal value in a brief card; defer.
- `musicalIntent.meter` and `musicalIntent.bpmHint` — Already visible from the recipe metadata or session state; redundant.

### Section 2.1 — Vocabulary mismatch: `density` vs `complexity`

`MusicalRecipe.density` uses `'sparse' | 'medium' | 'dense'`. `MusicalIntent.complexity` uses `'simple' | 'medium' | 'dense'`. The LLM is instructed in `SYSTEM_PROMPT_EVOLUTION` to express density via `complexity: "simple" | "medium" | "dense"`, so the LLM bridges the gap. In `LastRecipeDisplay`, both fields are present independently: `density` comes from the recipe (ground-truth) and `complexity` comes from the LLM annotation (optional). The card can show the recipe's `density` as the authoritative value and show `complexity` only if it differs (or skip `complexity` to avoid confusion). The recommended approach is to display only `density` from the recipe (always reliable) and omit `complexity` from the card — it adds noise without clarity. The Pilot can override this at review.

### Section 2.2 — Data availability at the sendEvolution() call site

At lines 415–434 of `src/agent/agent.ts` (the `musicalIntent.recipeId` branch):

```
const recipe = getRecipeById(skill.musicalIntent.recipeId);   // MusicalRecipe | undefined
if (recipe !== undefined) {
  const engineOutput = recipeToAgentOutput(recipe);
  ...
  recipeApplied = true;
}
```

At this point, both `recipe` (full `MusicalRecipe` object) and `skill.musicalIntent` (full `MusicalIntent` object) are in scope. The `LastRecipeDisplay` object can be built from them without any additional store reads or lookups:

```
const display: LastRecipeDisplay = {
  recipeId: recipe.id,
  recipeName: recipe.name,
  rhythmIds: recipe.rhythmIds,
  harmonyId: recipe.harmonyId,
  density: recipe.density,
  explanation: skill.musicalIntent.explanation,     // optional
  style: skill.musicalIntent.style,                 // optional
  complexity: skill.musicalIntent.complexity,       // optional
};
```

The store update call (`setLastRecipeApplied(display)` or equivalent) fits naturally after the `recipeApplied = true` line, inside the `recipe !== undefined` guard, before the `requeueLive()` call at line 439.

### Section 2.3 — Pilot decision on optional fields

The Pilot must confirm whether `style` and `complexity` appear in the card (and whether `complexityLabel` and `styleLabel` i18n keys are needed in step 04.3). The minimum set (5 fields) is unconditionally recommended. The inventory recommends including `explanation` and `style` and omitting `complexity` (vocabulary confusion risk). Final call is Pilot's.

---

## Section 3 — OD-3: Display Trigger (When to Show)

### Confirmed: the card appears ONLY on the autopilot-fired musicalIntent path

**Check: does `send()` read `skill.musicalIntent`?**

Examining `src/agent/agent.ts` lines 696–765 (`send()` body):

```typescript
const skill = tryParseSkill(txt);
if (skill) {
  const did: string[] = [];
  if (skill.rhythm) { applyRhythmSpec(skill.rhythm); did.push('ritmo'); }
  if (skill.harmony) { applyHarmonySpec(skill.harmony); did.push('armonía'); }
  if (skill.saveAsBlock) { applyBlockSave(skill.saveAsBlock); }
  // ...
  return { type: 'skill', code, summary, note: skill.note };
}
```

`send()` reads `skill.rhythm`, `skill.harmony`, `skill.saveAsBlock`, and `skill.note`. It does NOT read `skill.musicalIntent`. There is no `setLastRecipeApplied` call anywhere in `send()`. The manual chat path is completely decoupled from the recipe display state.

**Conclusion:** OD-3 is confirmed. The recipe card appears ONLY when:
1. The autopilot fires (i.e., `sendEvolution()` is called from `autopilot.ts`), AND
2. The LLM response contains `musicalIntent.recipeId`, AND
3. `getRecipeById(recipeId)` returns a defined `MusicalRecipe`.

No wiring change to `send()` is needed for this phase (A-04-04 is satisfied by code inspection).

---

## Section 4 — `LastRecipeDisplay` Type Candidate

### Field-by-field definition

```typescript
/**
 * Ephemeral display state for the last recipe applied by the autopilot.
 * Populated by sendEvolution() when musicalIntent.recipeId resolves to
 * a known MusicalRecipe. Excluded from SavedSessionSchema.
 *
 * All required fields are sourced from MusicalRecipe (always available).
 * Optional annotation fields are sourced from MusicalIntent (LLM-supplied).
 */
export interface LastRecipeDisplay {
  // ── Required (from MusicalRecipe) ─────────────────────────────────────────
  /** Stable recipe id (e.g. 'bossa-nova-groove'). */
  recipeId: string;
  /** Human-readable recipe name (e.g. 'Bossa Nova Groove'). */
  recipeName: string;
  /** One or more rhythm catalog ids (joined with commas in the UI). */
  rhythmIds: string[];
  /** Harmony catalog id (e.g. 'bossa-nova-loop'). */
  harmonyId: string;
  /** Qualitative density from the recipe catalog (authoritative). */
  density: 'sparse' | 'medium' | 'dense';

  // ── Optional (from MusicalIntent — LLM-supplied, may be absent) ──────────
  /** Free-text style label (e.g. 'bossa nova', 'dorian modal'). */
  style?: string;
  /**
   * LLM's qualitative complexity annotation.
   * Note: vocabulary differs from density — 'simple' maps to 'sparse'.
   * Recommendation: omit from UI card to avoid confusion; retain in type
   * for future use (the Pilot may decide to show it).
   */
  complexity?: 'simple' | 'medium' | 'dense';
  /** Brief LLM note explaining the recipe choice (≤ 300 chars). */
  explanation?: string;
}
```

### Grounding at the call site

All required fields (`recipeId`, `recipeName`, `rhythmIds`, `harmonyId`, `density`) are directly available from the `recipe: MusicalRecipe` object that is already looked up via `getRecipeById()` at lines 416–434 of `agent.ts`. No additional store reads, async calls, or catalog lookups are required.

All optional fields (`style`, `complexity`, `explanation`) are directly available from `skill.musicalIntent: MusicalIntent` at the same call site.

### Exact insertion point in `sendEvolution()`

The store update call fits at `src/agent/agent.ts` between lines 428 and 431 (inside the `if (recipe !== undefined)` block, after `recipeApplied = true`):

```
// Current code (lines 418-431 approx):
const recipe = getRecipeById(skill.musicalIntent.recipeId);
if (recipe !== undefined) {
  const engineOutput = recipeToAgentOutput(recipe);
  if (engineOutput !== null) {
    if (!skill.rhythm && engineOutput.rhythm) {
      applyRhythmSpec(engineOutput.rhythm);
      recipeApplied = true;
    }
    if (!skill.harmony && engineOutput.harmony) {
      applyHarmonySpec(engineOutput.harmony);
      recipeApplied = true;
    }
  }
  // ← INSERT HERE: setLastRecipeApplied({...}) call
  // (Regardless of recipeApplied flag: even a no-op resolution
  //  should still display the LLM's intent)
}
```

The update is placed BEFORE the closing brace of the `if (recipe !== undefined)` block and BEFORE the `if (skill.rhythm || skill.harmony || recipeApplied) requeueLive();` call at line 439.

---

## Section 5 — Anchor Point in `AgentPanel.svelte`

### Template order (read from the file)

Lines 418–595 of `AgentPanel.svelte` contain the template in this order:

1. **`#agentTab` div** (line 418–427) — fixed tab button
2. **`#agent` aside** (line 433–596) — the slide-in panel:
   - `.agent-head` div (line 438–443) — header with glyph + title + close button
   - `.prov-row` div (line 450–474) — provider / model / API key inputs
   - `#chat` div (line 480–515) — scrollable chat area
   - `.quick` div (line 521–525) — quick prompts row
   - `.toggles` div (line 531–540) — autoplay / autofix toggles
   - **`.toggles.autopilot-row` div** (line 547–575) — autopilot controls (button + interval input + info icon)
   - **`← RECIPE CARD GOES HERE`** — between autopilot-row and agent-input
   - `.agent-input` div (line 581–595) — textarea + send button

### Exact insertion location

The recipe card block must be inserted between the closing `</div>` of `.toggles.autopilot-row` (line 575) and the opening `<div class="agent-input">` (line 581). Lines 576–580 are currently a blank comment block (`<!-- Input row: textarea + send button. -->`).

The insertion in step 04.4 will look like:

```svelte
  <!-- (closes autopilot-row at line 575) -->

  <!--
    Recipe card: last autopilot recipe applied.
    ai-jam Phase 04 step 04.4 (OD-1 resolution).
    Only shown when autopilot fires a musicalIntent.recipeId response.
  -->
  {#if $sessionStore.lastRecipeApplied}
    <div class="recipe-card">
      ...
    </div>
  {/if}

  <!-- Input row: textarea + send button. -->
  <div class="agent-input">
```

(Or `{#if $lastRecipeApplied}` if Option B is chosen — the `$` prefix applies to both.)

---

## Section 6 — i18n Keys Required

### New key group: `agent.recipeCard`

The following keys must be added to all four locale files and to `src/i18n/types.ts`:

| Key | Purpose | ES value (proposed) |
|---|---|---|
| `agent.recipeCard.title` | Card header label | `'Receta aplicada'` |
| `agent.recipeCard.rhythmLabel` | Label before rhythm ids | `'Ritmo'` |
| `agent.recipeCard.harmonyLabel` | Label before harmony id | `'Armonía'` |
| `agent.recipeCard.densityLabel` | Label before density value | `'Densidad'` |
| `agent.recipeCard.explanationLabel` | Label before explanation text | `'Nota'` |
| `agent.recipeCard.clearTitle` | Tooltip/aria-label on dismiss button | `'Cerrar'` |

**Optional keys (pending OD-2 resolution by Pilot):**
- `agent.recipeCard.styleLabel` — Label before style text (e.g. `'Estilo'`). Add only if Pilot confirms `style` appears in the card.
- `agent.recipeCard.complexityLabel` — Label before complexity value. Not recommended (vocabulary confusion); omit unless Pilot explicitly requests it.

### Impact on `src/i18n/types.ts`

A new `recipeCard` sub-object must be added under the `agent` namespace:

```typescript
agent: {
  // ... existing keys ...
  autopilot: {
    // ... existing autopilot keys ...
  };
  /** Recipe card display strings (ai-jam Phase 04) */
  recipeCard: {
    title: string;
    rhythmLabel: string;
    harmonyLabel: string;
    densityLabel: string;
    explanationLabel: string;
    clearTitle: string;
    // (optional, pending OD-2 resolution):
    // styleLabel?: string;  — NOT optional in types.ts; if added, must be present in all 4 locales
  };
};
```

### Files requiring update in step 04.3

1. `src/i18n/types.ts` — add `recipeCard` sub-object to `agent` interface
2. `src/i18n/locales/es.ts` — primary locale, authoritative translations
3. `src/i18n/locales/en.ts` — English translations
4. `src/i18n/locales/pt.ts` — Portuguese (approximations allowed; mark `// i18n-draft`)
5. `src/i18n/locales/zh.ts` — Chinese (approximations allowed; mark `// i18n-draft`)

### Nesting pattern (confirmed)

The existing `agent.autopilot.*` pattern in `es.ts` (lines 210–218) and `types.ts` (lines 240–253) uses a nested object directly under `agent`. The new `recipeCard` key group follows the same pattern — a plain nested object literal (no array, no optional keys at the type level).

---

## Section 7 — No Automated Tests Needed

Per CLAUDE.md: "No automated tests for UI rendering — Vitest covers pure engines only; UI correctness is `live-system`."

`LastRecipeDisplay` is a plain TypeScript interface (no Zod schema, no engine logic). The Svelte template rendering the card is UI-only. No new unit tests are expected for steps 04.2–04.4.

The i18n key-parity test (`tests/i18n/key-parity.test.ts`) will automatically catch any locale file that is missing the new `agent.recipeCard.*` keys — that is coverage-by-existing-test, not new tests.

---

## Section 8 — Summary: Open Decisions for Pilot Resolution

| Decision | Options | Pilot action required |
|---|---|---|
| **OD-1** State location | A: `SessionState` field (recommended, no ADR) · B: separate writable store (needs ADR) | Choose A or B before step 04.2 |
| **OD-2** Optional fields | Minimum (5 fields always) + `explanation` recommended · `style` optional · `complexity` not recommended | Confirm which optional fields appear in card; drives i18n keys in step 04.3 |
| **OD-3** Display trigger | Confirmed: ONLY on autopilot `musicalIntent.recipeId` path | No Pilot action needed — confirmed by code inspection |

---

## Section 9 — Files to be Created/Modified (Forecast per Step)

| Step | Files |
|---|---|
| 04.1 (this step) | `docs/ai-jam/inventories/phase-04-inventory.md` (new); `docs/ai-jam/handoffs/phase-04-handoff.md` (new) |
| 04.2 | `src/state/session.ts` (add `LastRecipeDisplay` + `setLastRecipeApplied`, or new `src/state/agentRecipeDisplay.ts`); `src/agent/agent.ts` (add store update in `sendEvolution()`) |
| 04.3 | `src/i18n/types.ts`; `src/i18n/locales/es.ts`; `src/i18n/locales/en.ts`; `src/i18n/locales/pt.ts`; `src/i18n/locales/zh.ts` |
| 04.4 | `src/ui/AgentPanel.svelte` |
