# Phase 09 — 4-view primary navigation + rhythm controls to top bar

**Purpose:** Elevate Composición and Código Strudel from hidden drawer tabs to first-class primary views alongside Armonía and Ritmo, and move the rhythm-specific controls out of the canvas overlay into the top bar. After this phase, the top-bar navigation has four equal-weight primary views; the bottom transport row is transversal-only (play buttons + BPM); the canvas overlay in Ritmo view is gone; and each of the four views shows its own hint text.

**Gate:** Phase 08 closed (Pilot Checkpoint #5, 2026-06-12). Branch `orbifold-v2/phase-09` cut from `orbifold-v2/phase-08` tip. Test baseline: 385 passing (13 test files).

**Expected phase result:** Clicking "Composición" in the top-bar nav shows the composition timeline as the main content. Clicking "Código Strudel" shows the live code editor. Clicking "Armonía" or "Ritmo" shows the existing canvas views. The float-over rhythm controls (the `RhythmControls.svelte` overlay) are gone; all rhythm-specific controls (Euclidean controls, morph toggle) live in the top bar while Ritmo is active. The Transport footer holds only play buttons + BPM, with no view-specific controls. Each view shows appropriate hint or instruction text.

---

## Pilot decisions (pre-resolved 2026-06-12, before step 09.1)

None — all open decisions are surfaced at the inventory step (09.1) and resolved at Checkpoint #1 before any code is written. See step 09.1 for the full list of open questions.

---

## Step 09.1 — Inventory

PROMPT → Read all required files (CLAUDE.md, `docs/orbifold-v1/decisions.md`, Phase 08 handoff closure section, ADR 0011, this phase file). Then read and document the following source files:

- `src/state/session.ts` — `SessionState.view` type (`'rhythm' | 'harmony' | 'composition' | 'session'`), the `handleViewChange` function usage, `setNowPlaying` and `requeueLive` interactions with the view field. Confirm every code path that reads or switches on `view`.
- `src/ui/Header.svelte` — current view-toggle segmented control (the `#viewSeg` div with two buttons). Note the exact HTML and handler.
- `src/app/App.svelte` — how the current two views are routed (canvas pointer routing switches on `view === 'harmony'` vs `'rhythm'`; the hint `{#if}` block; how `setView` from `stage.ts` is called via the store subscription). List every `state.view === 'composition' | 'session'` check that currently exists (if any) — they may be dead code or partial wiring.
- `src/render/stage.ts` — the `setView` function; confirm what values it currently handles and what happens when `view = 'composition'` or `view = 'session'` or the new view strings are passed.
- `src/ui/CodeDrawer.svelte` — the full component (tab button + drawer mechanics + textarea). Note: this is what becomes the "Código Strudel" main-canvas view; understand how the editor textarea, execute/queue buttons, and store subscription are currently implemented.
- `src/ui/CompositionDrawer.svelte` — the full component (tab button + drawer mechanics + timeline grid + transport row). Note: this is what becomes the "Composición" main-canvas view.
- `src/ui/RhythmControls.svelte` — every control in the overlay: morph toggle, Euclidean controls (sound select, k/n/r sliders, preview, + órbita, + capa vacía), and the 📨 base context button. These move to the top bar.
- `src/ui/Transport.svelte` — the current transport row. Identify which controls are truly transversal (play buttons, BPM, TAP, SYNC) vs any that are view-specific.
- `src/lib/persistence.ts` — the `SavedSession` schema, specifically the `view` field: what value is persisted. Confirm whether `'composition'` or `'session'` is the current persisted value for the composition view.
- `src/agent/schema.ts` — any agent command that sets `view`.

Produce `docs/orbifold-v2/inventories/phase-09-inventory.md` with:

**(a) Current view-type audit** — list every file that reads `state.view` or `$sessionStore.view` and what it does with each value. Enumerate which view-type strings are actually handled vs silently ignored.

**(b) View-type mapping decision surface** — the current `SessionState.view` type is `'rhythm' | 'harmony' | 'composition' | 'session'`. Phase 09 adds "Composición" and "Código Strudel" as primary views. The open question is: which view-type strings do these map to? Three candidate approaches must be documented (not resolved — surface for Pilot):
  - **Option A:** Reuse existing strings — `'composition'` for Composición, `'session'` renamed to `'code'` or kept as `'session'` for Código Strudel. Lowest blast radius (fewer string changes), but `'session'` is semantically confusing as a "live code" view.
  - **Option B:** Add two new strings — `'composition'` already exists; add `'code'` (or `'editor'`) as a new fifth view-type string. Keep `'session'` for the combined rhythm+harmony transport (the existing "Sesión" play button). This makes the view type `'rhythm' | 'harmony' | 'composition' | 'session' | 'code'`.
  - **Option C:** Rename all four strings for clarity — e.g., `'rhythm' | 'harmony' | 'composition' | 'code'`, dropping `'session'` as a view-type string entirely (the Sesión transport mode stays but is not a primary navigation view).
  Document the blast radius of each option (files touched, persistence schema version bump required if the persisted `view` value changes, agent schema impact).

**(c) Drawer lifecycle decision surface** — when Composición and Código Strudel become primary views, what happens to the drawer components? Three options (surface for Pilot, do not resolve):
  - **Option D:** Keep the drawer HTML/Svelte structure but render them inline (full-screen) instead of as slide-up overlays when the corresponding view is active. The drawer "tab" buttons are removed (they are replaced by the top-bar nav tabs).
  - **Option E:** Extract the drawer content into dedicated `<CompositionView>` and `<CodeView>` Svelte components; the old drawer components are deleted or left as dead code.
  - **Option F:** Show/hide the existing drawers (forced open, no slide animation) via a reactive `$:` block tied to `$sessionStore.view`, and remove the tab buttons. Minimal code change but structurally awkward.

**(d) Rhythm controls blast radius** — list every import and every store action used by `RhythmControls.svelte` that will move to `Header.svelte`. Identify any transient local state (`euclidSound`, `euclidK`, `euclidN`, `euclidR`, `morphTarget`) and where it will live after the move (still local to the header component's script, or extracted to session store). Note: the Pilot has decided these move to the top bar — but the Dev must choose and record whether the local state migrates inline into `Header.svelte` or into a dedicated new `RhythmHeader.svelte` sub-component.

**(e) Transport row audit** — list each control currently in `Transport.svelte` and classify as: (1) transversal (stays), or (2) view-specific (moves or is removed). After Phase 09, the bottom row should contain only transversal controls.

**(f) Test and build baseline** — confirm `pnpm exec vitest run` → 385 passed, `pnpm exec tsc --noEmit` → 0 errors, `pnpm lint` → 0 errors.

**Open questions to surface at Checkpoint #1 (the Pilot decides before step 09.2):**

- **OQ-1:** Which option (A / B / C) for the view-type string mapping? This determines whether a persistence schema version bump is needed.
- **OQ-2:** Which option (D / E / F) for the drawer lifecycle when elevated to primary views?
- **OQ-3:** Does the Euclidean local state (`euclidSound`, `euclidK`, etc.) stay inline in `Header.svelte` or go into a dedicated `RhythmHeader.svelte` sub-component?
- **OQ-4:** Does the "Sesión" play button remain in the Transport footer? (It currently plays rhythm + harmony together. With Composición as a primary view, is "Sesión" still needed as a transport button, or is it retired in favor of the individual play buttons?)

Implementation requirements:
- Read every file listed above before writing the inventory.
- The view-type mapping decision surface must present all three options with blast radius.
- The drawer lifecycle decision surface must present all three options.
- Do NOT write any source code.
- Do NOT resolve OQ-1 through OQ-4 — surface them for Pilot.

Validation:
- `docs/orbifold-v2/inventories/phase-09-inventory.md` exists and is non-empty.
- No source files modified.

Expected result:
- Inventory document produced. Four open questions surfaced for Pilot resolution before step 09.2.

CHECKPOINT → Commit message:
`docs(orbifold-v2): Phase 09 step 09.1 — inventory`

---

## Step 09.2 — ADR for 4-view navigation routing

PROMPT → Read `docs/orbifold-v2/inventories/phase-09-inventory.md`, `docs/adr/0011-harmony-view-architecture.md`, `docs/orbifold-v1/decisions.md`, and the Pilot's resolutions from Checkpoint #1. Write a new ADR capturing the 4-view navigation architecture decision. File: `docs/adr/0013-four-view-navigation.md`.

The ADR must record:

**(D1) The four primary navigation views and their view-type strings.** Record the exact view-type values chosen (per Pilot's OQ-1 resolution) and the mapping:
- Armonía → `'harmony'`
- Ritmo → `'rhythm'`
- Composición → [Pilot-chosen string]
- Código Strudel → [Pilot-chosen string]

If a new string is introduced that was not previously in `SessionState.view`, record that a persistence schema version bump is required only if the persisted `view` field could take the new value. If the `view` field stored in sessions must be migrated, record the migration strategy.

**(D2) The view routing model for Composición and Código Strudel.** Record the chosen option (D / E / F) for the drawer lifecycle. If Option D or F: record that the tab buttons (`#codeTab`, `#compTab`) are removed and the drawer `position:fixed` + `transform:translateY(105%)` slide mechanism is replaced by a view-gated `{#if}` block in `App.svelte`. If Option E: record that new Svelte components are created.

**(D3) Rhythm controls placement in top bar.** Record that the rhythm-specific Euclidean controls (sound select, k/n/r sliders, preview button, + órbita, + capa vacía, morph toggle, and 📨 base) move from `RhythmControls.svelte` overlay into `Header.svelte` (or a sub-component) behind a `{#if $sessionStore.view === 'rhythm'}` guard. Record the transient local state location (per Pilot's OQ-3 resolution).

**(D4) Transport row is transversal only.** Record that after Phase 09 the Transport footer contains only: ▶ Ritmo, ▶ Armonía, ▶ Sesión (if retained — per Pilot's OQ-4 resolution), ▶ Composición, plus BPM/TAP/SYNC. No view-specific controls appear in the Transport footer.

**(D5) Hint text per view.** Record that each view shows hint text in the canvas area (or the view content area), gated by `$sessionStore.view`:
- `'harmony'` with `subview === 'tonnetz'` → existing Tonnetz instruction
- `'harmony'` with `subview === 'staff'` → existing Pentagrama instruction
- `'rhythm'` → rhythm-specific hint (e.g., "Elige E(k,n) y añade órbitas euclidianas. Click derecho sobre una órbita para silenciarla.")
- `'composition'` (or Pilot-chosen string) → composition hint
- code view string → live code hint

Implementation requirements:
- Append-only if ADR 0013 is a new file (do not modify existing ADRs).
- Record all Pilot resolutions as binding decisions.
- Record the persistence schema version bump decision explicitly (required or not required, with rationale).
- Do NOT write source code.

Validation:
- `docs/adr/0013-four-view-navigation.md` exists and contains D1–D5.
- No source files modified.

Expected result:
- ADR 0013 committed. Pilot Checkpoint #2 triggered.

CHECKPOINT → Commit message:
`docs(adr): Phase 09 step 09.2 — ADR 0013 four-view navigation`

---

## Step 09.3 — View-type routing in store + stage

PROMPT → Read `src/state/session.ts`, `src/render/stage.ts`, `src/lib/persistence.ts`, `src/agent/schema.ts`, ADR 0013, and the phase-09-inventory.md. Implement the view-type routing changes with minimal blast radius.

**`src/state/session.ts`:**
- Update `SessionState.view` type to include the new view-type string(s) per ADR 0013 D1. If the Pilot chose Option B (add `'code'` as a fifth string), change the type from `'rhythm' | 'harmony' | 'composition' | 'session'` to `'rhythm' | 'harmony' | 'composition' | 'session' | 'code'`. If Option C (rename), change accordingly.
- Update `DEFAULT_SESSION_STATE.view` if the default changes.
- Add a `setView` store action (or update `handleViewChange`) that accepts the new view-type strings and updates `sessionStore`. This replaces the inline `sessionStore.update((s) => ({ ...s, view }))` in `Header.svelte`.

**`src/render/stage.ts`:**
- Update `setView` to handle the new view-type strings. For `'composition'` and `'code'` (or whichever strings are chosen): hide both `harmonyLayer` and `rhythmLayer` (the PIXI canvas shows nothing — the main content for those views is DOM, not PIXI). Confirm that `harmonyLayer.visible` and `rhythmLayer.visible` are both `false` for these views.

**`src/lib/persistence.ts`:**
- If the persisted `view` value can take the new string(s) (i.e., if sessions saved while in the new views would write the new string to the blob), bump the `SavedSessionSchema` version and add a Zod `z.union` or `z.enum` that includes the new string(s). Add a safe fallback: if the loaded `view` value is not a currently-valid string, default to `'harmony'`. If the Pilot's OQ-1 resolution means the new views use existing strings (Option A), no schema change is needed.
- Record the schema version bump decision in the handoff.

**`src/agent/schema.ts`:**
- If the agent schema has a `setView` command or references valid view names, update accordingly. If not, confirm no change needed.

**Tests:**
- Update any test in `tests/session.test.ts` or `tests/persistence.test.ts` that asserts the view type union, the `DEFAULT_SESSION_STATE.view`, or serialization of the view field.
- Confirm existing tests pass (no regressions; the view-type change should be additive, not breaking for existing `'rhythm'` and `'harmony'` routing).

Implementation requirements:
- The `stage.ts` change must ensure that navigating to the Composición or Código Strudel view does not leave PIXI rendering the previous view's scene (both layers must be hidden).
- The existing `setView('harmony')` and `setView('rhythm')` behavior is unchanged.
- AGPL-3.0 header present on all modified files.

Validation:
- `pnpm exec tsc --noEmit` exits 0.
- `pnpm lint` exits 0.
- `pnpm exec vitest run` exits clean (count ≥ 385; regressions = 0).
- `pnpm build` exits 0.

Expected result:
- `SessionState.view` type updated. `stage.ts setView` handles new strings. Persistence schema updated if needed. Quality gates green.

CHECKPOINT → Commit message:
`feat(navigation): Phase 09 step 09.3 — view-type routing in store and stage`

---

## Step 09.4 — 4-view nav in Header + elevate Composición and Código Strudel views

PROMPT → Read `src/ui/Header.svelte`, `src/app/App.svelte`, `src/ui/CodeDrawer.svelte`, `src/ui/CompositionDrawer.svelte`, ADR 0013, and phase-09-inventory.md. Implement the 4-tab navigation and the elevation of Composición / Código Strudel to primary views.

**`src/ui/Header.svelte` — 4-tab nav segment:**
- Replace the current `#viewSeg` two-button segment ("Armonía" / "Ritmo") with a four-button segment: "Armonía" · "Ritmo" · "Composición" · "Código Strudel".
- All four buttons are visually equal in weight (same CSS class, same font size, same padding). The active button uses the `.active` class.
- On click, call the `setView` action (or `sessionStore.update`) with the appropriate view-type string per ADR 0013 D1.
- The key selector (root/mode/octave) and harmony-specific controls remain inside `{#if $sessionStore.view === 'harmony'}` — unchanged.
- Rhythm-specific controls are added inside a new `{#if $sessionStore.view === 'rhythm'}` block — see step 09.5 for these.
- Update `handleViewChange` to accept all four view-type strings.

**`src/app/App.svelte` — remove drawer tab buttons + gate main content by view:**

Implement the chosen drawer-lifecycle option from ADR 0013 D2:

- **If Option D (inline, no slide):** The `<CodeDrawer />` and `<CompositionDrawer />` remain in the component tree but their tab buttons (`#codeTab`, `#compTab`) are removed from their Svelte files (or hidden via `display:none` when the view is active — confirm approach in handoff). The drawer content areas are shown full-size when the respective view is active, hidden otherwise. The `position:fixed` + `translateY(105%)` slide mechanism is disabled for the primary-view case (the drawer is either full-visible or hidden without animation, or with a simple `{#if}`).
- **If Option E (new components):** Create `src/ui/CompositionView.svelte` and `src/ui/CodeView.svelte`, each containing the relevant content (extracted from the drawer). `App.svelte` renders them inside `{#if $sessionStore.view === 'composition'}` and `{#if $sessionStore.view === 'code'}` blocks respectively. The old drawer files are left as stubs or deleted.
- **If Option F (force-open drawers):** The existing drawers are forced to `open = true` via a Svelte reactive declaration when the corresponding view is active, and the tab buttons are hidden.

**Canvas pointer routing:** In `App.svelte`, the canvas `pointerdown` handler currently switches on `'harmony'` and `'rhythm'`. The new views (`'composition'`/`'code'`) must not generate unhandled pointer events on the canvas — since `stage.ts` hides both layers for those views, no pointer routing is needed, but the handler must not throw. A simple `else { /* no-op */ }` guard is sufficient.

**Hint text:** Extend the existing `{#if $sessionStore.view === 'harmony'}` hint block in `App.svelte` to cover all four views per ADR 0013 D5. For Ritmo: add a `{:else if $sessionStore.view === 'rhythm'}` branch with the rhythm hint. The hint div is not shown for Composición or Código Strudel (those views have their own built-in instructions).

Implementation requirements:
- All four view tabs must be visually equal weight in the header (no one tab can dominate via font size or padding differences).
- The drawer tab buttons (`#codeTab`, `#compTab`) must be removed or hidden — they must not appear in the UI when the views are primary navigation items.
- The existing `<AgentPanel />`, `<PersistencePanel />`, `<Tooltip />`, `<Hud />`, `<Legend />` are unchanged.
- `<ProgressionStrip />` and `<Transport />` remain visible in all four views (they are transversal; the strip is the progression editor, and transport controls are always accessible).
- AGPL-3.0 header present on all modified files.

Validation:
- `pnpm exec tsc --noEmit` exits 0.
- `pnpm lint` exits 0.
- `pnpm exec vitest run` exits clean (count ≥ 385).
- `pnpm build` exits 0.

Expected result:
- Top bar shows four equal-weight primary view tabs. Navigating to "Composición" shows the composition timeline. Navigating to "Código Strudel" shows the live code editor. Drawer tab buttons are gone. Rhythm hint shown in Ritmo view. Quality gates green.

CHECKPOINT → Commit message:
`feat(navigation): Phase 09 step 09.4 — 4-view nav, elevate Composición and Código Strudel`

---

## Step 09.5 — Rhythm controls to top bar

PROMPT → Read `src/ui/RhythmControls.svelte`, `src/ui/Header.svelte`, `src/app/App.svelte`, and ADR 0013. Move all rhythm-specific controls from the canvas overlay into the top bar.

**`src/ui/Header.svelte`:**
- Inside a `{#if $sessionStore.view === 'rhythm'}` block (after the 4-tab nav segment, before the spacer `.sp`), add all rhythm controls from `RhythmControls.svelte`:
  - Morph toggle button (▭ lineal / ▭ radial) calling `setMorphTarget`.
  - Sound select (`euclidSound`).
  - E(k,n) readout with k/n/r sliders.
  - Named-pattern info span.
  - Preview toggle (▶ oír / ■ stop).
  - + órbita button (calling `addEuclidLayer`).
  - + capa vacía button (calling `addEmptyLayer`).
  - 📨 base context button.
- The transient local state (`euclidSound`, `euclidK`, `euclidN`, `euclidR`, `morphTarget`) is placed in the `<script lang="ts">` block of `Header.svelte` (or in the chosen sub-component per ADR 0013 D3 / OQ-3 resolution). All reactive declarations (`$: euclidRMax`, `$: euclidInfo`, `$: isPreviewing`) move with the state.
- Import `addEuclidLayer`, `addEmptyLayer`, `previewEuclid`, `hushAll` from `session.ts`; import `setMorphTarget` from `rhythm-scene.ts`; import `agentCtx` from `agentCtx.ts`.
- The style for the rhythm controls in the header should be compact (matching the existing header inline-flex layout with `gap: 18px`). The range sliders may need a max-width constraint to prevent the header from overflowing on narrow viewports — document the choice in the handoff.

**`src/ui/RhythmControls.svelte`:**
- Remove all content (the `.orbit-ctl.glass#orbitCtl` div and its children, plus all CSS). The component becomes an empty shell with only the AGPL-3.0 header comment and a relocation note, or it is deleted from `App.svelte` entirely.
- If the component is left as an empty shell: keep `<RhythmControls />` in `App.svelte` but it renders nothing. If deleted: remove the import and the `<RhythmControls />` line from `App.svelte`.
- Record the choice in the handoff.

**`src/app/App.svelte`:**
- Confirm `<RhythmControls />` either renders nothing (empty shell) or is removed.
- The canvas overlay area is now free of rhythm controls.

Implementation requirements:
- All rhythm-specific controls must be gated by `{#if $sessionStore.view === 'rhythm'}` so they do not appear in other views.
- The morph toggle local state (`morphTarget`) must persist correctly across view switches — if the user switches from Ritmo to Armonía and back, the morph target should be in the same state it was left. (Transient local state in `Header.svelte` persists for the component lifetime, which is fine for this requirement.)
- Preview toggle: clicking ▶ oír when not previewing calls `previewEuclid(euclidSound, euclidK, euclidN, euclidR)`; when previewing, calls `hushAll()`.
- AGPL-3.0 header present on all modified files.

Validation:
- `pnpm exec tsc --noEmit` exits 0.
- `pnpm lint` exits 0.
- `pnpm exec vitest run` exits clean (count ≥ 385; no regressions).
- `pnpm build` exits 0.
- Static analysis: `grep -n "orbit-ctl" src/ui/RhythmControls.svelte` returns 0 matches (or file is deleted).

Expected result:
- Rhythm controls appear in the top bar when Ritmo is the active view. The canvas overlay is gone. Quality gates green.

CHECKPOINT → Commit message:
`feat(navigation): Phase 09 step 09.5 — rhythm controls to top bar`

---

## Step 09.6 — Quality gates + manual acceptance

PROMPT → Read all files modified in steps 09.3–09.5. Run all quality gates and perform static and live-system analysis for every acceptance criterion. Record in the handoff.

Implementation requirements:
- Run `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm exec vitest run`, `pnpm build` and record exact outputs.
- For each IMPL-verified criterion (A-09-01 through A-09-10), cite the exact source file and line number where the behavior is implemented.
- Confirm AGPL-3.0 header on every new or modified `.ts`/`.svelte` file in this phase.
- Static analysis checks:
  - `grep -rn "orbit-ctl" src/ui/` → 0 matches (rhythm controls overlay is gone).
  - `grep -rn "#codeTab\|#compTab" src/ui/` → 0 matches (drawer tab buttons are removed or dead).
  - `grep -n "view.*composition\|view.*code" src/render/stage.ts` → confirms `setView` handles the new strings.
  - `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/` → 0 matches (pure engine invariant maintained; no new imports introduced).
  - Confirm `PX_PER_CYCLE` coordination rule still intact (imported from `time-map.ts` in `harmony-staff-scene.ts`; local const in `ProgressionStrip.svelte`).
  - Confirm `registerMode` and `subview` fields in `HarmonyState` are unchanged (ephemeral, not persisted).
- Live/visual verification of A-09-06 through A-09-10 is deferred to Pilot (CLI cannot render browser). Record the deferral explicitly with the implementing source lines for each item.
- Produce a manual acceptance checklist for the Pilot (see Acceptance section below for the complete list of live-system items).

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run` → exits clean with count ≥ 385.
- `pnpm build` → exits 0.

Expected result:
- All quality gates green. Handoff records static evidence for all A-09 acceptance IDs. Live verification deferred to Pilot.

CHECKPOINT → Commit message:
`feat(navigation): Phase 09 step 09.6 — quality gates and manual acceptance`

---

## Phase Acceptance

- **A-09-01** — `SessionState.view` type includes all four primary view-type strings (Armonía, Ritmo, Composición, Código Strudel / as named in ADR 0013 D1). `DEFAULT_SESSION_STATE.view` is a valid value of the updated type.
  - Validation method: `proxy:static-analysis`

- **A-09-02** — `stage.ts setView` hides both `harmonyLayer` and `rhythmLayer` when the view is `'composition'` or the code-view string. No PIXI rendering occurs for those views.
  - Validation method: `proxy:static-analysis`

- **A-09-03** — If the persistence schema version was bumped: `SavedSessionSchema` version is incremented; loading a session with an unrecognised `view` string defaults to `'harmony'` without throwing. If no bump: the inventory confirms why no bump is needed.
  - Validation method: `proxy:static-analysis`

- **A-09-04** — `pnpm exec tsc --noEmit` exits 0, `pnpm lint` exits 0, `pnpm exec vitest run` count ≥ 385, `pnpm build` exits 0.
  - Validation method: `automated`

- **A-09-05** — No PIXI/Svelte/DOM imports in `src/core/` (pure engine invariant maintained after all Phase 09 source changes).
  - Validation method: `proxy:static-analysis`

- **A-09-06** — The top bar shows four equal-weight primary view tabs: Armonía · Ritmo · Composición · Código Strudel. Only one tab is active at a time. Switching tabs changes the canvas/content area immediately.
  - Validation method: `manual`

- **A-09-07** — Navigating to "Composición" shows the composition timeline (block library + DAW timeline + transport row inside the view); navigating away and back preserves the timeline state.
  - Validation method: `manual`

- **A-09-08** — Navigating to "Código Strudel" shows the live code editor (textarea + execute/queue buttons). The "⌄ código strudel" and "🎚 composición" drawer tab buttons are no longer visible anywhere in the UI.
  - Validation method: `manual`

- **A-09-09** — When Ritmo is the active view, all rhythm controls (morph toggle, Euclidean controls, preview, + órbita, + capa vacía, 📨 base) appear in the top bar and are fully functional. No rhythm controls float over the canvas.
  - Validation method: `manual`

- **A-09-10** — The bottom Transport row contains only transversal controls (play buttons + BPM/TAP/SYNC) in all four views. No view-specific controls appear in the Transport footer.
  - Validation method: `manual`

- **A-09-11** — Each of the four views shows appropriate hint/instruction text: Armonía/Tonnetz shows the Tonnetz instruction; Armonía/Pentagrama shows the staff instruction; Ritmo shows a rhythm instruction; Composición and Código Strudel show no canvas hint (they have built-in labels).
  - Validation method: `manual`

---

## Validation (quality gates — run at step 09.6)

```
pnpm exec tsc --noEmit    # 0 errors
pnpm lint                  # 0 errors (ESLint + Prettier)
pnpm exec vitest run       # ≥ 385 passed, 0 failed
pnpm build                 # exit 0
```

Static analysis checks (all run at step 09.6):
- `grep -rn "orbit-ctl" src/ui/` → 0 matches
- `grep -rn "#codeTab\|#compTab" src/ui/` → 0 matches (drawer tabs removed)
- `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/` → 0 matches
- `grep -n "subview\|registerMode" src/lib/persistence.ts` → only in `deserializeSession` defaults, not in Zod schema (unchanged from Phase 08)

---

## Notes on carry-forward decisions from Phase 08

The Decisions Register entries written after Phase 08 remain binding:
- `STEP_PX = 16` / `HALF_STEP_PX = 8` / `staffBaseY = height/2 − 48` — do not change these constants in Phase 09 source edits.
- `registerMode` is visual-only — audio byte-identical. Do not add `requeueLive()` calls in Phase 09 that touch `registerMode`.
- `harmony.subview` and `harmony.registerMode` are ephemeral — do not persist them.
