<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 04 — Recipe Intent Display: Show the Last Applied Recipe in AgentPanel

**Purpose:** Render a minimal, read-only "last recipe applied" card inside `AgentPanel.svelte` so the user can see which recipe the autopilot chose, its stated style and complexity, and the agent's explanation, building trust in the AI jam.
**Gate:** ai-jam Phase 03 merged to `main` (schema v6 with `musicalIntent`, `recipeToAgentOutput`, `sendEvolution` recipe wiring; 1387/1387 tests passing); no open ai-jam blockers.
**Expected phase result:** After the autopilot fires and applies a recipe, a non-intrusive card appears in `AgentPanel.svelte` showing recipe name, rhythm id(s), harmony id, complexity/density, and the agent's explanation; the card persists until the next evolution or a manual clear; no new agent skills, no schema changes, no new LLM calls, and all existing quality gates pass clean.

---

## Step 04.1 — Inventory

PROMPT → Read the source-of-truth files listed below and produce `docs/ai-jam/inventories/phase-04-inventory.md`, then STOP for Pilot review. Do NOT write any source file in this step.

Source-of-truth files to read (all of them, fully):
- `src/ui/AgentPanel.svelte` — existing structure, `<script>` block imports, autopilot controls section, CSS class patterns
- `src/state/session.ts` — `SessionState`, `AutopilotState`, `DEFAULT_SESSION_STATE`, `setAutopilot` pattern (understand how ephemeral runtime state is added)
- `src/agent/agent.ts` — `sendEvolution()` body: where it calls `applyRhythmSpec` / `applyHarmonySpec` / the recipe engine path; what data is in scope at the moment a recipe is applied
- `src/agent/schema.ts` — `MusicalIntent` type (all 8 fields): `recipeId`, `style`, `complexity`, `explanation`, `cultureTags`, `mood`, `meter`, `bpmHint`
- `src/core/music-knowledge/rhythm-harmony-recipes.ts` — `MusicalRecipe` interface: `id`, `name`, `rhythmIds`, `harmonyId`, `density`, `agentInstruction`
- `src/core/music-knowledge/query.ts` — `getRecipeById` signature and return type
- `src/i18n/locales/es.ts` — existing `agent.autopilot` i18n keys; understand the nesting pattern for adding new keys
- `src/i18n/types.ts` — the i18n schema type that governs what keys are valid

Implementation requirements:
- Document the **three open decisions (OD-1 through OD-3)** that this phase must resolve before implementation can begin:
  - **OD-1 — State location for "last recipe applied":** Where does the display state live? Two options:
    - **Option A — `SessionState` field (ephemeral, per ADR 0022 D1/D7 pattern):** Add `lastRecipeApplied?: LastRecipeDisplay` to `SessionState`, excluded from `SavedSessionSchema`. Reactive via `$sessionStore.lastRecipeApplied` in the Svelte component. Consistent with `AutopilotState` precedent. Requires adding a `setLastRecipeApplied` store action.
    - **Option B — Svelte writable store (separate module):** A standalone `writable<LastRecipeDisplay | null>` in `src/state/agentRecipeDisplay.ts` (parallel to `agentCtx.ts`). No `SessionState` change. Simpler, but adds a parallel state atom outside `SessionState`.
    - The inventory must document both options and their tradeoffs. OD-1 must be resolved by Pilot before step 04.2.
  - **OD-2 — What to display (field selection):** Which fields from `MusicalIntent` and `MusicalRecipe` appear in the card? At minimum: recipe `name` (from `MusicalRecipe.name`), `rhythmIds` (comma-joined), `harmonyId`, `density` (from `MusicalRecipe.density`), and `musicalIntent.explanation` (if present). Optionally: `musicalIntent.style`, `musicalIntent.complexity`, `musicalIntent.mood`, `musicalIntent.cultureTags`. The inventory must document the minimum set and the optional additions, and confirm which data is available in `sendEvolution()` at the moment a recipe is applied (i.e., what can be passed to the store update call without extra lookups).
  - **OD-3 — Display trigger (when to show):** Should the recipe card appear only when the autopilot fires via `musicalIntent.recipeId` (recipe engine path), or also when the user-initiated `send()` call produces a `musicalIntent` field? The scope statement says "only after autopilot fires a musicalIntent-bearing response" — the inventory must confirm whether this is correct (check if `send()` in `agent.ts` already reads `skill.musicalIntent`; it does not — so there is no wiring needed for the manual path).
- Document **`LastRecipeDisplay` type candidate** with the fields needed for rendering, grounded in what is available at the call site in `sendEvolution()`.
- Document **anchor point in `AgentPanel.svelte`:** Identify the exact insertion location for the recipe card (after the `autopilot-row` div, before the `agent-input` div — confirm by reading the template order in AgentPanel.svelte).
- Document **i18n requirement:** The card will use `$t(...)` keys. Identify the new keys needed (e.g., `agent.recipeCard.title`, `agent.recipeCard.rhythmLabel`, `agent.recipeCard.harmonyLabel`, `agent.recipeCard.complexityLabel`, `agent.recipeCard.explanationLabel`, `agent.recipeCard.clearTitle`) and confirm the i18n file structure requires changes to `src/i18n/types.ts` and all four locale files (`es.ts`, `en.ts`, `pt.ts`, `zh.ts`).
- Confirm **no new tests needed for pure UI** (CLAUDE.md: "No automated tests for UI rendering — Vitest covers pure engines only; UI correctness is `live-system`").
- Confirm that `sendEvolution()` in `agent.ts` has access to the full `MusicalRecipe` object (via `getRecipeById`) and the `MusicalIntent` object (from `skill.musicalIntent`) at the point where recipe fields are applied — identify the exact line range where the store update call would be inserted.

Validation:
- The inventory file exists and covers all five sections above (OD-1, OD-2, OD-3, type candidate, anchor point, i18n keys).
- No source files modified.

Expected result:
- A reviewable inventory; OD-1 and OD-2 resolved (or surfaced for Pilot) before step 04.2.

CHECKPOINT → Commit message:
`docs(ai-jam): Phase 04 step 04.1 — recipe-display inventory`

---

## Step 04.2 — State: `LastRecipeDisplay` type + store action + `sendEvolution()` update

PROMPT → Read `src/state/session.ts` (full), `src/agent/agent.ts` (full), `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full), `src/agent/schema.ts` (MusicalIntent type), `docs/ai-jam/decisions.md`, `docs/ai-jam/inventories/phase-04-inventory.md`, and ADR 0022. Then implement the state layer only — no UI changes in this step.

Implementation requirements:
- **`LastRecipeDisplay` interface** in `src/state/session.ts` (or `src/state/agentRecipeDisplay.ts`, per OD-1 resolution):
  - Required fields (always present when set): `recipeId: string`, `recipeName: string`, `rhythmIds: string[]`, `harmonyId: string`, `density: 'sparse' | 'medium' | 'dense'`.
  - Optional annotation fields (present only if the LLM supplied them in `musicalIntent`): `style?: string`, `complexity?: 'simple' | 'medium' | 'dense'`, `explanation?: string`.
  - All field types are pure strings or string enums — no Zod, no DOM, no Svelte imports.
- If **Option A (SessionState)** was chosen at OD-1:
  - Add `lastRecipeApplied?: LastRecipeDisplay` to `SessionState` and `DEFAULT_SESSION_STATE` (value: `undefined`). Follow the `AutopilotState` pattern: excluded from `SavedSessionSchema` (no change to `serializeSession`); add a JSDoc comment noting the exclusion.
  - Add `setLastRecipeApplied(display: LastRecipeDisplay | null): void` store action in `session.ts`, following the `setAutopilot` pattern.
- If **Option B (separate store)** was chosen at OD-1:
  - Create `src/state/agentRecipeDisplay.ts` with an exported `writable<LastRecipeDisplay | null>` named `lastRecipeApplied` (default `null`) and a typed setter. AGPL-3.0 header required.
- **`sendEvolution()` update** in `src/agent/agent.ts`:
  - Inside the `musicalIntent.recipeId` branch, after the recipe engine path applies (i.e., after the `recipeApplied` flag is set), call `setLastRecipeApplied(...)` (or update the store directly if Option B) with the `LastRecipeDisplay` data built from the `MusicalRecipe` object and `skill.musicalIntent`.
  - The update must occur regardless of whether `recipeApplied` is true or false (even a musicalIntent-only response that resolves to no-op should still display the intent). Update only when `skill.musicalIntent?.recipeId` is present AND `recipe !== undefined`.
  - `sendEvolution()` must still NEVER push to `chatHistory` and NEVER call `applyBlockSave` (ADR 0022 D3/D4 unchanged).
- **No UI changes** in this step — the store/state layer only.
- **No new schema changes** — `LastRecipeDisplay` is a plain TypeScript interface, not a Zod schema.
- **`tsc --noEmit`** must pass clean after this step.

Validation:
- `pnpm exec tsc --noEmit`
- `pnpm test` (all existing tests must still pass; no new tests expected for this step — the UI coverage is `live-system`, not `unit`)

Expected result:
- `LastRecipeDisplay` type is defined and exported; `sendEvolution()` populates the display state when a recipe is applied; existing behavior is unaffected; typecheck and test suite pass clean.

CHECKPOINT → Commit message:
`feat(state): Phase 04 step 04.2 — LastRecipeDisplay type + sendEvolution wiring`

---

## Step 04.3 — i18n keys for the recipe card

PROMPT → Read `src/i18n/types.ts` (full), `src/i18n/locales/es.ts` (full), `src/i18n/locales/en.ts` (full), `src/i18n/locales/pt.ts` (full), `src/i18n/locales/zh.ts` (full), and `docs/ai-jam/inventories/phase-04-inventory.md` (i18n section). Then add the new `agent.recipeCard` i18n key group to all four locales and the types file.

Implementation requirements:
- **New key group `agent.recipeCard`** in all four locale files and `src/i18n/types.ts`:
  - `title` — label for the card header (e.g., "Receta aplicada" / "Applied recipe").
  - `rhythmLabel` — label before the rhythm id list (e.g., "Ritmo" / "Rhythm").
  - `harmonyLabel` — label before the harmony id (e.g., "Armonía" / "Harmony").
  - `densityLabel` — label before the density/complexity value (e.g., "Densidad" / "Density").
  - `explanationLabel` — label before the explanation text (e.g., "Nota" / "Note").
  - `clearTitle` — tooltip/aria-label for the dismiss button (e.g., "Cerrar" / "Close").
  - (Optional from OD-2 resolution: `styleLabel`, `complexityLabel` — add only if the Pilot resolved OD-2 to include those fields.)
- All four locale files must be updated: `es.ts` (primary), `en.ts`, `pt.ts`, `zh.ts`. The `pt` and `zh` translations may be reasonable approximations — mark them as `// i18n-draft` for future refinement.
- `src/i18n/types.ts` must be updated to add `recipeCard` under the `agent` namespace; the shape must match all four locales.
- **`tsc --noEmit`** must pass clean (i18n types are checked at compile time).

Validation:
- `pnpm exec tsc --noEmit`
- `pnpm test` (no tests for i18n keys; verify no regressions)

Expected result:
- All four locale files have a `agent.recipeCard` key group; `types.ts` reflects the new shape; typecheck passes; no existing i18n keys were modified.

CHECKPOINT → Commit message:
`feat(i18n): Phase 04 step 04.3 — recipe card i18n keys (all 4 locales)`

---

## Step 04.4 — UI: Recipe card in AgentPanel + dev-server verification

PROMPT → Read `src/ui/AgentPanel.svelte` (full), `src/state/session.ts` (or `src/state/agentRecipeDisplay.ts` per OD-1), `src/i18n/locales/es.ts` (the `agent.recipeCard` section from step 04.3), `src/core/music-knowledge/rhythm-harmony-recipes.ts` (for id formatting reference), and `docs/ai-jam/inventories/phase-04-inventory.md`. Then add the recipe card to `AgentPanel.svelte` and run a full quality gate.

Implementation requirements:
- **Import the display state** in `<script lang="ts">`: import `lastRecipeApplied` (and `setLastRecipeApplied` / the store setter per OD-1 resolution) alongside the existing imports.
- **Recipe card block** in the template, placed immediately after the `autopilot-row` div and before the `agent-input` div:
  - Wrapped in `{#if $lastRecipeApplied}` (or `{#if lastRecipeApplied !== null}` if Option B store).
  - Shows: recipe name (from `$lastRecipeApplied.recipeName`), rhythm ids (comma-joined), harmony id, density, and explanation (if present).
  - A dismiss `<button>` that calls `setLastRecipeApplied(null)` (or sets the store to `null`) to clear the card.
  - Labels use `$t('agent.recipeCard.*')` keys added in step 04.3.
  - CSS class: `recipe-card` — add to the existing `<style>` block in `AgentPanel.svelte` (or to `app.css` if styles are centralized there — check first; use whichever approach matches the existing pattern).
- **Aesthetic requirements (per ORBIFOLD_KICKOFF.md §6 "Apple-like"):**
  - Subtle — the card must not distract from the playing interface. Use a small font size (e.g., `font-size: 11px`), muted text color (`var(--muted)` or similar), and a thin border or background that fits the glass aesthetic.
  - Tonal-function colors (tonic `#f3b15a`, subdominant `#56cfc4`, dominant `#e87bac`, accent `#8aa0ff`) must NOT be applied to the card text — they are reserved for Tonnetz/chord functions. The card may use a neutral accent color consistent with the existing glass style.
  - The card must not push the `agent-input` row off-screen on typical viewport heights. If the card risks overflow, constrain its height or let it collapse gracefully with `overflow: hidden`.
- **Live-system verification** — run the dev server (`pnpm dev`) and manually verify:
  1. With autopilot OFF and no recipe applied: no card visible.
  2. After enabling autopilot and waiting for the first evolution with a `musicalIntent.recipeId` response: the card appears with correct recipe name, rhythm ids, harmony id, density, and explanation (if the LLM supplied one).
  3. Clicking the dismiss button removes the card.
  4. After the next autopilot evolution: if a new recipe is applied, the card updates; if no recipe, the card remains showing the last one (or clears if the store was reset to null on each evolution — whichever the step 04.2 implementation chose; document this behavior in the handoff).
  5. Manual `send()` calls do NOT produce a recipe card (confirmed by checking that `agent.ts`'s `send()` function has no `setLastRecipeApplied` call).
- **Full quality gate:**
  - `pnpm exec tsc --noEmit`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`

Validation:
- `pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build` (all pass clean)
- Live-system check: dev server shows the card correctly (per the five-point checklist above)

Expected result:
- `AgentPanel.svelte` renders a subtle recipe card after autopilot fires a recipe; card dismisses on user click; no regressions; all quality gates pass.

CHECKPOINT → Commit message:
`feat(ui): Phase 04 step 04.4 — recipe intent card in AgentPanel`

---

## Phase Acceptance

Each criterion has a unique ID (used in handoff Acceptance Coverage Tables):

- **A-04-01** — After the autopilot fires and the LLM returns a `musicalIntent.recipeId`, the AgentPanel shows a card with the recipe name, rhythm id(s), harmony id, and density matching the `MusicalRecipe` entry for that id.
  - Validation method: `live-system`
- **A-04-02** — If the LLM includes `musicalIntent.explanation`, the card shows it; if the field is absent, the explanation row is omitted (no empty label rendered).
  - Validation method: `live-system`
- **A-04-03** — A dismiss button on the card clears it from view; the recipe display state resets to null/undefined when the button is clicked.
  - Validation method: `live-system`
- **A-04-04** — Manual `send()` calls (user-initiated agent messages) do NOT produce a recipe card, regardless of whether the response contains a `musicalIntent` field.
  - Validation method: `proxy:static-analysis` (confirm by code inspection that `send()` in `agent.ts` has no `setLastRecipeApplied` call)
- **A-04-05** — The recipe card does not appear when the autopilot fires but the LLM returns explicit `rhythm`/`harmony` fields without a `musicalIntent.recipeId`.
  - Validation method: `live-system`
- **A-04-06** — The recipe display state (`LastRecipeDisplay`) is excluded from the serialized session (not written to `SavedSessionSchema`); loading a saved session does not restore the recipe card.
  - Validation method: `proxy:static-analysis` (confirm `serializeSession` does not enumerate `lastRecipeApplied` / that the separate store module has no persistence wiring)
- **A-04-07** — The card fits the "Apple-like" aesthetic: no tonal-function colors used, text is visually subdued relative to the autopilot controls, and the card does not overflow the panel on a typical 768px-height viewport.
  - Validation method: `live-system`
- **A-04-08** — `tsc --noEmit`, `pnpm lint`, `pnpm test`, and `pnpm build` all pass clean at phase close; test count is ≥ 1387 (Phase 03 baseline).
  - Validation method: `live-system` (full command output in handoff)

## Partial coverage from prior phase

No prior partials to address. All Phase 03 acceptance criteria (A-03-01 through A-03-09) were fully COVERED at phase close (confirmed in phase-03-handoff.md Planner review).

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **Recipe display state location (OD-1)** — Trigger: step 04.1 inventory. If Option A (SessionState) is chosen and the Pilot approves, no ADR is strictly required (it follows the ADR 0022 D1/D7 precedent). If Option B (separate store) is chosen and departs from the ADR 0022 pattern in a way that requires a new rule, open an ADR before step 04.2. The inventory step must flag whether an ADR is needed; the Pilot resolves at Checkpoint #1.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/ai-jam/handoffs/phase-04-handoff.md`. See `handoff-template.md`.
