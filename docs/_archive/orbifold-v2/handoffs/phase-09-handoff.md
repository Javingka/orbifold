# Phase 09 Handoff — 4-view primary navigation + rhythm controls to top bar

---

## Step 09.2 — ADR for 4-view navigation routing

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed
- Wrote `docs/adr/0013-four-view-navigation.md` with decisions D1–D5 encoding all four Pilot resolutions (OQ-1 through OQ-4).
- D1: `SessionState.view` widens to `'rhythm' | 'harmony' | 'composition' | 'session' | 'code'`; `SavedSessionSchema` version bumps from 1 to 2 with `'code'` in the enum and a safe `'harmony'` fallback for unrecognized strings.
- D2: Option D variant D1 — `{#if}` gate in `App.svelte` for `CompositionDrawer`/`CodeDrawer`; tab buttons removed; slide CSS replaced by flex-fill; rAF restart on mount confirmed safe.
- D3: Rhythm controls move inline into `Header.svelte`'s `<script>` block behind `{#if view === 'rhythm'}`; zero naming collisions with existing locals.
- D4: `Transport.svelte` unchanged; ▶ Sesión retained; all 8 existing Transport controls confirmed transversal.
- D5: Per-view hint text extended to cover Ritmo (new branch); Composición and Código Strudel show no canvas hint (built-in labels in their drawer templates).

### Files touched
- `docs/adr/0013-four-view-navigation.md` — new file (created)
- `docs/orbifold-v2/handoffs/phase-09-handoff.md` — new file (this handoff)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are directly verified by this step (ADR creation step — no source code). The ADR records decisions that downstream steps 09.3–09.6 implement and verify.

### Routine validations (one-liner each, no transcripts)

No source files modified. Quality gates unchanged from Phase 09 baseline: 385 passed, 0 errors (tsc), 0 errors (lint) — confirmed in step 09.1.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-09-01 | `SessionState.view` type includes all five strings including `'code'` | — | proxy:static-analysis | not covered — deferred to step 09.3 (source code change) |
| A-09-02 | `stage.ts setView` hides both PIXI layers for `'composition'` and `'code'` | — | proxy:static-analysis | not covered — deferred to step 09.3 |
| A-09-03 | Schema version bumped to 2; unrecognized view defaults to `'harmony'` | — | proxy:static-analysis | not covered — deferred to step 09.3 |
| A-09-04 | All quality gates green | — | automated | not covered — deferred to step 09.3 |
| A-09-05 | No PIXI/Svelte/DOM imports in `src/core/` | — | proxy:static-analysis | not covered — deferred to step 09.6 |
| A-09-06 | Four equal-weight nav tabs; one active at a time | — | manual | not covered — deferred to step 09.4 |
| A-09-07 | Composición shows timeline; navigating away and back preserves state | — | manual | not covered — deferred to step 09.4 |
| A-09-08 | Código Strudel shows code editor; drawer tab buttons gone | — | manual | not covered — deferred to step 09.4 |
| A-09-09 | Rhythm controls in top bar when Ritmo active; no canvas overlay | — | manual | not covered — deferred to step 09.5 |
| A-09-10 | Transport footer contains only transversal controls in all views | — | manual | not covered — deferred to step 09.6 |
| A-09-11 | Per-view hint text correct in each of the four views | — | manual | not covered — deferred to step 09.4 |

**Notes on partial coverage:** This step is ADR-only. All Acceptance IDs are deferred to their respective implementation steps (09.3–09.6). The ADR records the binding decisions that implementation steps must satisfy.

**Proxy disclosures:** No static analysis run in this step.

### Decisions made (if any)
- D1–D5 recorded in ADR 0013 per Pilot resolutions; no new decisions introduced by the Dev.

### Proposed Decisions Register entries (if any)
- None. The ADR decisions (D1–D5) are Pilot-resolved and recorded in the ADR. No additional Register proposals arise from this step.

### Blockers resolved during this step (if any)
- None.

### Environment state after this step
- Source code unmodified. ADR 0013 committed. Phase-09 handoff initiated.
- Branch: `orbifold-v2/phase-09`. Quality gate baseline: 385 passed, 0 tsc errors, 0 lint errors.

### Next-step context (only if non-obvious)
- Step 09.3 must implement the `SessionState.view` type extension, `stage.ts setView` signature widening, and `SavedSessionSchema` version bump (1→2) with the `'code'` enum addition and `'harmony'` fallback — all per ADR 0013 D1. The exact Zod transform strategy (`.catch('harmony')` after the enum vs. `z.string().transform(...)`) is left to the Dev in 09.3; either approach satisfies A-09-03 as long as unrecognized strings produce `'harmony'` without throwing.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `docs(adr): Phase 09 step 09.2 — ADR 0013 four-view navigation`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 09.3 — View-type routing in store + stage

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

- Widened `SessionState.view` in `src/state/session.ts` from `'rhythm' | 'harmony' | 'composition' | 'session'` to `'rhythm' | 'harmony' | 'composition' | 'session' | 'code'`. `DEFAULT_SESSION_STATE.view = 'harmony'` unchanged — still valid.
- Added `setView(view: SessionState['view']): void` store action to `src/state/session.ts`. Updates the store and calls `stage.setView` via the existing lazy dynamic import pattern (mirrors `setHarmonySubview`). No PIXI pollution in Node/Vitest.
- Widened `setView` signature in `src/render/stage.ts` from `'harmony' | 'rhythm'` to all 5 strings. For `'composition'`, `'session'`, `'code'`: both `harmonyLayer` and `rhythmLayer` are set `visible = false`. For `'harmony'` and `'rhythm'`: behavior is unchanged (reversibility preserved).
- Bumped `SESSION_SCHEMA_VERSION` from `1` to `2` in `src/lib/persistence.ts` (ADR 0013 D1).
- Extended `SavedSessionSchema.view` enum to include `'code'`: `z.enum(['rhythm', 'harmony', 'composition', 'session', 'code'] as const).catch('harmony' as const)`. The `.catch` ensures any unrecognized view string silently defaults to `'harmony'` — `safeParse` succeeds rather than returning null.
- Version literal updated to `z.literal(2)`. Version-1 blobs fail this check and are dropped via `safeParse` graceful degradation (Pilot-confirmed lossy drop per ADR 0013 D1 — no migration function).
- Confirmed `src/agent/schema.ts` has no `setView` command and no view-type string references — no change needed (inventory confirmed).
- Updated all `SavedSessionSchema.safeParse(...)` test fixtures in `tests/session.test.ts` (3 occurrences of `version: 1`) and `tests/persistence.test.ts` (fixtures + existing backward-compat test) to use `version: 2`.
- Added 8 new Phase 09 tests in `tests/persistence.test.ts` (grouped in `describe("Phase 09 schema v2...")`):
  - `view: 'code'` round-trip through schema v2 + serialize + deserialize (A-09-01).
  - Unrecognized view string falls back to `'harmony'` (A-09-03).
  - `SESSION_SCHEMA_VERSION === 2` (A-09-03).
  - `it.each` across all 5 valid view strings accepted by schema v2 (A-09-01, 5 sub-tests).
- Updated `rejects version 2 (wrong literal)` test to `rejects version 1 (old schema — lossy drop per ADR 0013 D1)` + added `accepts version 2` and `rejects version 3` tests.
- Updated A-06-06 backward-compatibility test to use `version: 2` payload (the test still verifies chord-only progressions parse correctly without `isRest`).
- Added A-09-03 test that version-1 blobs fail schema v2 validation (confirming the drop behavior).

### Files touched

- `src/state/session.ts` — `SessionState.view` type widened; `setView` action added
- `src/render/stage.ts` — `setView` signature widened; JSDoc updated
- `src/lib/persistence.ts` — `SESSION_SCHEMA_VERSION` bumped 1→2; `SavedSessionSchema` updated
- `tests/persistence.test.ts` — fixtures updated; new Phase 09 tests added (+8 new tests, +3 revised tests)
- `tests/session.test.ts` — 3 `version: 1` payloads updated to `version: 2`
- `docs/orbifold-v2/handoffs/phase-09-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

- **A-09-01** — `SessionState.view` type in `src/state/session.ts` line ~241 now includes `'code'`. Schema v2 `SavedSessionSchema` accepts all 5 strings. `it.each` tests across all 5 values pass. `DEFAULT_SESSION_STATE.view = 'harmony'` is valid for the widened type.
  - Proxy citation: `src/state/session.ts` (view type declaration); `tests/persistence.test.ts` (Phase 09 `it.each` test group).
- **A-09-02** — `stage.ts setView` (line ~175 after Prettier): `harmonyLayer.visible = view === 'harmony'`; `rhythmLayer.visible = view === 'rhythm'`. For `'composition'`, `'session'`, `'code'`: both are `false` — both PIXI layers hidden.
  - Proxy citation: `src/render/stage.ts` lines 175–177.
- **A-09-03** — `SESSION_SCHEMA_VERSION = 2` (persistence.ts line ~11). Schema uses `z.literal(2)`. `z.enum([...5 strings...]).catch('harmony')` falls back for unrecognized strings. Tests: unrecognized view → `'harmony'`; version-1 blob → `safeParse.success = false`; `SESSION_SCHEMA_VERSION === 2`.
  - Proxy citation: `src/lib/persistence.ts`; `tests/persistence.test.ts`.
- **A-09-04** — All quality gates green: `pnpm exec tsc --noEmit` → 0 errors; `pnpm lint` → 0 errors; `pnpm exec vitest run` → 396 passed (baseline 385, +11 new); `pnpm build` → exit 0.
- **A-09-05** — No PIXI/Svelte/DOM imports in `src/core/`. `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/` → 0 matches. `setView` store action uses lazy dynamic import (not a static PIXI import in `session.ts`).

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → 0 errors
- `pnpm lint` → 0 errors (ESLint + Prettier clean)
- `pnpm exec vitest run` → 396 passed, 0 failed (13 test files)
- `pnpm build` → exit 0 (1.58s)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-09-01 | `SessionState.view` includes all 5 strings; `DEFAULT_SESSION_STATE.view` valid | `tests/persistence.test.ts` | proxy:static-analysis + unit | covered |
| A-09-02 | `stage.ts setView` hides both PIXI layers for `'composition'`, `'session'`, `'code'` | `src/render/stage.ts:175-177` | proxy:static-analysis | covered |
| A-09-03 | Schema v2; `SESSION_SCHEMA_VERSION = 2`; unrecognized view → `'harmony'`; v1 blobs dropped | `tests/persistence.test.ts` | unit | covered |
| A-09-04 | All quality gates green (tsc, lint, vitest ≥ 385, build) | — | automated | covered |
| A-09-05 | No PIXI/Svelte/DOM imports in `src/core/` | — | proxy:static-analysis | covered |
| A-09-06 | Four equal-weight nav tabs | — | manual | not covered — deferred to step 09.4 |
| A-09-07 | Composición shows timeline | — | manual | not covered — deferred to step 09.4 |
| A-09-08 | Código Strudel shows code editor; drawer tab buttons gone | — | manual | not covered — deferred to step 09.4 |
| A-09-09 | Rhythm controls in top bar when Ritmo active | — | manual | not covered — deferred to step 09.5 |
| A-09-10 | Transport footer transversal-only in all views | — | manual | not covered — deferred to step 09.6 |
| A-09-11 | Per-view hint text correct | — | manual | not covered — deferred to step 09.4 |

**Proxy disclosures:**
- A-09-01: `src/state/session.ts` — `SessionState.view` type declaration (line ~241 post-edit); `DEFAULT_SESSION_STATE.view = 'harmony'` (line ~258). TypeScript enforces these statically.
- A-09-02: `src/render/stage.ts` lines 175–177 (post-Prettier). Both `harmonyLayer.visible = view === 'harmony'` and `rhythmLayer.visible = view === 'rhythm'` evaluate to `false` for `'composition'`, `'session'`, `'code'`.
- A-09-03: `src/lib/persistence.ts` — `SESSION_SCHEMA_VERSION = 2` (line ~11); `z.literal(2)` (line ~95); `.catch('harmony' as const)` (line ~99).
- A-09-05: `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/` → 0 matches.

### Decisions made (if any)

- Used `z.enum([...]).catch('harmony' as const)` for the safe fallback (as suggested by ADR 0013 D1.3 and the Next-step context in step 09.2 handoff). The `.catch` approach is cleaner than `z.string().transform(...)` because it preserves the enum output type exactly and integrates naturally with Zod's `safeParse` flow.
- Agent schema confirmed unchanged (no `setView` command, no view-type strings in `src/agent/schema.ts`).

### Proposed Decisions Register entries (if any)

- None. All decisions are per ADR 0013 D1.

### Blockers resolved during this step (if any)

- None.

### Environment state after this step

- `SESSION_SCHEMA_VERSION = 2`. Version-1 blobs in localStorage will be dropped on next app load (graceful degradation, Pilot-confirmed tradeoff). Quality gate baseline: 396 passed, 0 tsc errors, 0 lint errors.
- Branch: `orbifold-v2/phase-09`.

### Next-step context (only if non-obvious)

- Step 09.4 adds the 4-tab nav in `Header.svelte` and elevates `CompositionDrawer`/`CodeDrawer` via `{#if}` gates in `App.svelte`. `handleViewChange` in `Header.svelte` currently accepts only `'harmony' | 'rhythm'` — step 09.4 must widen it to all 5 strings (or call the new `setView` store action from `session.ts`).
- The `setView` store action added in this step can be imported by `Header.svelte` in step 09.4 to replace the inline `sessionStore.update((s) => ({ ...s, view }))` pattern that `handleViewChange` currently uses.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

- **Terminal commit:** `feat(navigation): Phase 09 step 09.3 — view-type routing in store and stage`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 09.4 — 4-view nav in Header + elevate Composición and Código Strudel views

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 2 of 5 (REVISE: remove CodeDrawer.svelte close button + handleClose)

### Completed

- **`src/ui/Header.svelte` — 4-tab nav segment:**
  - Imported `setView` from `../state/session.js` (replaces inline `sessionStore.update` call).
  - Widened `handleViewChange` from `'harmony' | 'rhythm'` to `'harmony' | 'rhythm' | 'composition' | 'code'`. Delegates to `setView()` store action (step 09.3) which calls `stage.setView` via lazy import.
  - Replaced the 2-button `#viewSeg` segment with a 4-button segment: Armonía · Ritmo · Composición · Código Strudel. All four use the same `.seg button` CSS class — equal font size, equal padding — ADR 0013 D1.
  - Harmony-specific controls remain inside `{#if $sessionStore.view === 'harmony'}` — unchanged.

- **`src/ui/CodeDrawer.svelte` — elevated to primary view (ADR 0013 D2):**
  - Removed `<button id="codeTab">` (the `⌄ código strudel` tab button) from the template — A-09-08.
  - Removed `toggleDrawer()` function (vestigial; `open` boolean also removed to avoid lint `no-unused-vars`).
  - Simplified `handleClose()` to reset `userEdited` only (open lifecycle now controlled by `{#if}` gate in App.svelte).
  - Replaced `position:fixed + translateY(105%)` scoped CSS with `position:absolute; inset:0; z-index:1` so the component fills `#stage` when mounted.
  - Updated component header comment to document primary-view lifecycle.
  - **[REVISE — iteration 2]** Removed `<button class="c-close" id="codeClose">✕</button>` from the template and its `.c-close` / `.c-close:hover` CSS rules. Removed `handleClose()` function entirely. In the primary-view `{#if}` lifecycle the button was a misleading affordance — clicking it only reset `userEdited = false` with no visible effect on the view. All three identifiers (`#codeClose`, `handleClose`, `.c-close`) now appear only in comments; `grep -rn "codeClose\|handleClose" src/` returns comment-only lines, zero executable references. ADR 0013 §D2 requirement satisfied: close affordances removed, not hidden.

- **`src/ui/CompositionDrawer.svelte` — elevated to primary view (ADR 0013 D2):**
  - Removed `<button id="compTab">` (the `🎚 composición` tab button) from the template — A-09-08.
  - Removed close button (✕) from the drawer header — navigation is via Header.svelte tabs.
  - Removed `handleOpen()` and `handleClose()` functions (no callers; lint `no-unused-vars` would fail).
  - Updated `onMount` to set `open = true` (was just `ensureLoop()`). Per ADR 0013 D2: "After D2 the `open` variable in CompositionDrawer is always true while mounted so compTickLoop runs continuously while the Composición view is active and stops on unmount."
  - Replaced `position:fixed + translateY(108%)` scoped CSS with `position:absolute; inset:0; z-index:1` so the component fills `#stage` when mounted.

- **`src/app/App.svelte` — `{#if}` gates + hint text + canvas pointer routing:**
  - Moved `<CodeDrawer />` and `<CompositionDrawer />` inside `div#stage`, replacing the old standalone instances outside the flex column.
  - Added `{#if $sessionStore.view === 'composition'}<CompositionDrawer />{/if}` inside `#stage`.
  - Added `{#if $sessionStore.view === 'code'}<CodeDrawer />{/if}` inside `#stage`.
  - Removed old `<CodeDrawer />` and `<CompositionDrawer />` outside `#stage` (they were `position:fixed`; now they are primary view components inside the stage).
  - Extended hint block with `{:else if $sessionStore.view === 'rhythm'}` branch per ADR 0013 D5 — A-09-11: "Elige E(k,n) y añade órbitas euclidianas. Click derecho sobre una órbita para silenciarla."
  - Added `else { /* no-op */ }` guard to canvas `pointerdown` handler for non-PIXI views (A-09 step spec canvas routing requirement).

- **`src/app/app.css` — remove dead global CSS for eliminated drawer tabs:**
  - Removed `#compTab { position:fixed; ... }` global rule (tab button eliminated; ADR 0013 D2).
  - Removed `#compDrawer { position:fixed; transform:translateY(108%); ... }` global rule (slide mechanism eliminated; replaced by scoped `position:absolute; inset:0` CSS in `CompositionDrawer.svelte`).
  - Removed `#compDrawer.open { transform:translateY(0); }` global rule (slide eliminated).
  - Added comment explaining the removal with reference to ADR 0013 D2.

### Files touched

- `src/ui/Header.svelte` — 4-tab nav; `setView` import; `handleViewChange` widened
- `src/ui/CodeDrawer.svelte` — `#codeTab` removed; primary-view CSS; `open`/`toggleDrawer` removed; **[REVISE iteration 2]** `#codeClose` button + `.c-close` CSS + `handleClose()` removed (ADR 0013 §D2)
- `src/ui/CompositionDrawer.svelte` — `#compTab` removed; close button removed; `handleOpen`/`handleClose` removed; primary-view CSS; `onMount` sets `open=true`
- `src/app/App.svelte` — `{#if}` gates for composition/code views; rhythm hint branch; canvas pointer routing guard; removed old standalone drawer instances
- `src/app/app.css` — removed dead `#compTab`/`#compDrawer` global slide CSS
- `docs/orbifold-v2/handoffs/phase-09-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

- **A-09-06** — `Header.svelte` `#viewSeg` now has 4 buttons (Armonía, Ritmo, Composición, Código Strudel), all using `.seg button` CSS class (equal weight). Active state: `class={$sessionStore.view === '...' ? 'active' : ''}`. Only one can be active at a time (single `view` string in store).
  - Proxy citation: `src/ui/Header.svelte` (4-button `#viewSeg` segment).
  - Manual verification deferred to Pilot (cannot render browser in CLI).
- **A-09-07** — `App.svelte` line containing `{#if $sessionStore.view === 'composition'}<CompositionDrawer />{/if}` inside `#stage`. `CompositionDrawer.svelte` `onMount` sets `open=true` and starts `compTickLoop`. Timeline state (blocks, tracks) lives in `sessionStore` and persists across view switches (component unmount/remount only restarts the rAF loop, not the store).
  - Proxy citation: `src/app/App.svelte` (`{#if}` gate); `src/ui/CompositionDrawer.svelte` (`onMount`).
  - Manual verification deferred to Pilot.
- **A-09-08** — `grep -n 'id="codeTab"\|id="compTab"' src/` → 0 matches (actual button elements gone). `{#if $sessionStore.view === 'code'}<CodeDrawer />{/if}` in `App.svelte` shows the code editor.
  - Proxy citation: `src/ui/CodeDrawer.svelte` (no `#codeTab` button); `src/ui/CompositionDrawer.svelte` (no `#compTab` button); `src/app/App.svelte` (`{#if}` gate for code view).
  - Manual verification deferred to Pilot.
- **A-09-11** — `App.svelte` hint block: `{#if $sessionStore.view === 'harmony'}` (two sub-branches for Tonnetz/Pentagrama) + `{:else if $sessionStore.view === 'rhythm'}` (new branch with Euclidean hint). Composición and Código Strudel show no canvas hint (built-in labels in their components, per ADR 0013 D5).
  - Proxy citation: `src/app/App.svelte` (hint block with 3 cases).
  - Manual verification deferred to Pilot.

### Routine validations

- `pnpm exec tsc --noEmit` → 0 errors
- `pnpm lint` → 0 errors (ESLint + Prettier clean)
- `pnpm exec vitest run` → 396 passed, 0 failed (13 test files; same baseline as step 09.3)
- `pnpm build` → exit 0 (1.44s)

**[REVISE iteration 2 re-validation]**

- `pnpm exec tsc --noEmit` → 0 errors
- `pnpm lint` → 0 errors (ESLint + Prettier clean)
- `pnpm exec vitest run` → 396 passed, 0 failed (13 test files; no regressions)
- `pnpm build` → exit 0 (1.51s)
- `grep -rn "codeClose\|handleClose" src/` → comment-only lines, 0 executable references

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-09-01 | `SessionState.view` includes all 5 strings; `DEFAULT_SESSION_STATE.view` valid | `tests/persistence.test.ts` | proxy:static-analysis + unit | covered (step 09.3) |
| A-09-02 | `stage.ts setView` hides both PIXI layers for `'composition'`, `'session'`, `'code'` | `src/render/stage.ts` | proxy:static-analysis | covered (step 09.3) |
| A-09-03 | Schema v2; `SESSION_SCHEMA_VERSION = 2`; unrecognized view → `'harmony'`; v1 blobs dropped | `tests/persistence.test.ts` | unit | covered (step 09.3) |
| A-09-04 | All quality gates green (tsc, lint, vitest ≥ 385, build) | — | automated | covered |
| A-09-05 | No PIXI/Svelte/DOM imports in `src/core/` | — | proxy:static-analysis | covered (step 09.3; `grep` → 0 matches) |
| A-09-06 | Four equal-weight nav tabs; one active at a time | `src/ui/Header.svelte` | proxy:static-analysis | proxy-covered; manual deferred to Pilot |
| A-09-07 | Composición shows timeline; navigating away and back preserves state | `src/app/App.svelte` + `src/ui/CompositionDrawer.svelte` | proxy:static-analysis | proxy-covered; manual deferred to Pilot |
| A-09-08 | Código Strudel shows code editor; drawer tab buttons gone | `src/app/App.svelte` + `src/ui/CodeDrawer.svelte` | proxy:static-analysis | proxy-covered; `id="codeTab"` grep → 0 element matches; manual deferred to Pilot |
| A-09-09 | Rhythm controls in top bar when Ritmo active; no canvas overlay | — | manual | not covered — deferred to step 09.5 |
| A-09-10 | Transport footer transversal-only in all views | — | manual | not covered — deferred to step 09.6 |
| A-09-11 | Per-view hint text correct | `src/app/App.svelte` | proxy:static-analysis | proxy-covered (3 hint cases: harmony/tonnetz, harmony/staff, rhythm); manual deferred to Pilot |

**Proxy disclosures:**

- A-09-06: `src/ui/Header.svelte` — `#viewSeg` div contains 4 `<button>` elements, each with `data-view` attribute and `class={$sessionStore.view === '...' ? 'active' : ''}`. TypeScript enforces that `handleViewChange` accepts only the 4 primary view strings.
- A-09-07: `src/app/App.svelte` — `{#if $sessionStore.view === 'composition'}<CompositionDrawer />{/if}`. Timeline state in `sessionStore` persists across component mounts (store is not reset on unmount). `onMount` in CompositionDrawer sets `open=true` and starts the rAF loop.
- A-09-08: `grep -n 'id="codeTab"\|id="compTab"' src/` → 0 element matches (references in comments only). `src/app/App.svelte` — `{#if $sessionStore.view === 'code'}<CodeDrawer />{/if}`.
- A-09-11: `src/app/App.svelte` — hint block: `{#if ... === 'harmony'}` / `{#if ... === 'tonnetz'}` ... `{:else}` (staff) ... `{/if}` / `{:else if ... === 'rhythm'}` ... `{/if}`. Composición and Código Strudel have no canvas hint (drawer content provides labels).

### Decisions made (if any)

- `position:absolute; inset:0; z-index:1` chosen for the primary-view components (`CodeDrawer`, `CompositionDrawer`) rather than a flex-fill approach. Reason: `#stage` already has `position:relative` and the PIXI canvas fills it via `resizeTo`. Using `position:absolute; inset:0` on the primary-view components overlays them cleanly without disturbing PIXI's canvas sizing. The PIXI canvas renders transparent (both layers hidden) for these views — the drawer content is visible on top.
- Dead global CSS (`#compTab`, `#compDrawer` slide rules) removed from `app.css` to prevent specificity conflicts with the new scoped CSS. The scoped CSS (with Svelte hash) would win anyway, but removing the dead rules avoids confusion.
- `open` boolean removed entirely from `CodeDrawer.svelte` (was assigned but never read after removing `toggleDrawer` and `class:open`). Kept as live code only where it produces observable behavior (i.e., not here).
- `handleOpen()` and `handleClose()` removed from `CompositionDrawer.svelte` (no callers after removing tab button and close button). Removing them is cleaner than keeping dead code that fails lint.
- **[REVISE iteration 2 — ADR 0013 §D2]** `handleClose()` and the `#codeClose` ✕ button REMOVED (not simplified) from `CodeDrawer.svelte`. Rationale: under the `{#if}` lifecycle the function had no visible effect — it only reset `userEdited = false`. Retaining it and the rendered button was a misleading UI affordance contradicting ADR 0013 §D2's explicit goal of "cleanly severing the old drawer metaphor (tab buttons + close affordances removed, not hidden)." `CompositionDrawer.svelte` had already removed its close button in iteration 1; `CodeDrawer.svelte` was missed. Both components are now consistent: no close affordance remains in either elevated primary view.

### Proposed Decisions Register entries (if any)

- None. All decisions in this step are implementation details within the bounds of ADR 0013 D2.

### Blockers resolved during this step (if any)

- None.

### Environment state after this step

- Four-tab primary nav in Header.svelte. Composición and Código Strudel are primary views mounted via `{#if}` gates inside `#stage`. Rhythm hint added. Drawer tab buttons gone. Quality gate baseline: 396 passed, 0 tsc errors, 0 lint errors.
- Branch: `orbifold-v2/phase-09`.

### Next-step context (only if non-obvious)

- Step 09.5 moves the rhythm-specific controls from `RhythmControls.svelte` into `Header.svelte` behind `{#if $sessionStore.view === 'rhythm'}`. The `RhythmControls.svelte` component will be emptied (or deleted). `App.svelte` still imports it — step 09.5 handles the cleanup.
- After step 09.5, `grep -rn "orbit-ctl" src/ui/` must return 0 matches (acceptance A-09-09 static analysis check).

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

- **Terminal commit:** `feat(navigation): Phase 09 step 09.4 — 4-view nav, elevate Composición and Código Strudel`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 09.5 — Rhythm controls to top bar

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

- **`src/ui/Header.svelte` — rhythm controls added inline:**
  - Added four new session imports: `addEuclidLayer`, `addEmptyLayer`, `previewEuclid`, `hushAll` from `session.js`.
  - Added new render import: `setMorphTarget` from `rhythm-scene.js`. `agentCtx` was already imported.
  - Added five transient local state variables (`euclidSound`, `euclidK`, `euclidN`, `euclidR`, `morphTarget`) with their reactive declarations (`euclidRMax`, clamp guard on `euclidR`, `euclidInfo`, `isPreviewing`) inline in the `<script lang="ts">` block — per ADR 0013 D3 and OQ-3 resolution.
  - Added `KNOWN_PATTERNS` const (8-entry named-pattern lookup) inline in script — same values as `RhythmControls.svelte`.
  - Added four handler functions (`handleMorphToggle`, `handlePreviewToggle`, `handleAddEuclid`, `handleAddEmpty`) inline in script.
  - Added `{#if $sessionStore.view === 'rhythm'}` template block (`.rhythm-ctl` div) after the 4-tab nav segment and before the key selector / harmony controls block. The block contains all controls from the original overlay: morph toggle, separator, euclidean section label, sound select, E(k,n) readout, k/n/r sliders, named-pattern info span, preview toggle, + órbita, + capa vacía, and 📨 base context button.
  - Added CSS for `.rhythm-ctl`, `.r-sep`, `select`, `input[type='range']`, `b`, `.euclid-info`, `.rk`, `.r-ctx-btn.active` in the `<style>` block. Slider `width:78px` matches the original overlay value. `flex-wrap:wrap` on `.rhythm-ctl` prevents header overflow on narrow viewports.
  - Component header comment updated to document Phase 09 step 09.5 additions.

- **`src/ui/RhythmControls.svelte` — emptied to shell:**
  - All content (`.orbit-ctl.glass#orbitCtl` div, all CSS rules, all script logic) removed.
  - AGPL-3.0 header comment retained.
  - Relocation note comment added: "Phase 09 step 09.5 (ADR 0013 D3): all rhythm controls moved inline into Header.svelte."
  - Component left as an empty shell so `App.svelte`'s existing import compiles without change.

- **`src/app/App.svelte` — comment updated:**
  - Updated the `<RhythmControls />` comment from the step 09.4 placeholder ("Phase 09 step 09.5 will remove this overlay content") to the accurate post-09.5 note ("RhythmControls is now an empty shell (ADR 0013 D3). All rhythm controls moved to Header.svelte.").
  - No structural change to `App.svelte` — `<RhythmControls />` tag retained as an empty shell; import is unchanged.

**Layout choice (documented per spec):** The `.rhythm-ctl` container uses `display:flex; flex-wrap:wrap; gap:9px; align-items:center` matching the overlay's layout behavior. Sliders are `width:78px` (unchanged from the original overlay). The `flex-wrap` on the container means that on narrow viewports the controls wrap to a second line within the header rather than overflowing horizontally. No `max-width` hard cap is applied (the original overlay's `max-width:62%` was specific to absolute canvas positioning; the header context does not have the same constraint).

**`RhythmControls.svelte` fate:** Empty shell retained (not deleted) so that `App.svelte`'s import continues to compile without a code change to `App.svelte`. The component renders nothing. Step 09.6 may clean up the import if desired; the handoff records this as a non-breaking choice.

### Files touched

- `src/ui/Header.svelte` — rhythm controls state + handlers + template block + CSS added
- `src/ui/RhythmControls.svelte` — emptied to AGPL shell with relocation note
- `src/app/App.svelte` — `<RhythmControls />` comment updated
- `docs/orbifold-v2/handoffs/phase-09-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

- **A-09-09** — `Header.svelte` contains `{#if $sessionStore.view === 'rhythm'}` block with all rhythm controls (morph toggle, euclidean controls, preview, + órbita, + capa vacía, 📨 base). `RhythmControls.svelte` is empty — no `.orbit-ctl` class, no canvas overlay. `grep -rn 'class="orbit-ctl' src/ui/` → 0 matches. `grep -n "orbit-ctl" src/ui/RhythmControls.svelte` → 0 matches (file has only AGPL + relocation comment).
  - Proxy citation: `src/ui/Header.svelte` (rhythm controls block); `src/ui/RhythmControls.svelte` (empty shell).
  - Manual verification deferred to Pilot (cannot render browser in CLI).

### Routine validations

- `pnpm exec tsc --noEmit` → 0 errors
- `pnpm lint` → 0 errors (ESLint + Prettier clean; Prettier auto-fixed Header.svelte formatting before final lint pass)
- `pnpm exec vitest run` → 396 passed, 0 failed (13 test files; same baseline as steps 09.3/09.4 — no regressions)
- `pnpm build` → exit 0 (1.49s)
- `grep -n "orbit-ctl" src/ui/RhythmControls.svelte` → 0 matches (file is an empty shell)
- `grep -rn 'class="orbit-ctl\|class:orbit-ctl\|\.orbit-ctl {' src/` → 0 live usages (only comment references in `Header.svelte` and `HarmonyControls.svelte`)
- `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/` → 0 matches (A-09-05 maintained)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-09-01 | `SessionState.view` includes all 5 strings; `DEFAULT_SESSION_STATE.view` valid | `tests/persistence.test.ts` | proxy:static-analysis + unit | covered (step 09.3) |
| A-09-02 | `stage.ts setView` hides both PIXI layers for `'composition'`, `'session'`, `'code'` | `src/render/stage.ts` | proxy:static-analysis | covered (step 09.3) |
| A-09-03 | Schema v2; `SESSION_SCHEMA_VERSION = 2`; unrecognized view → `'harmony'`; v1 blobs dropped | `tests/persistence.test.ts` | unit | covered (step 09.3) |
| A-09-04 | All quality gates green (tsc, lint, vitest ≥ 385, build) | — | automated | covered |
| A-09-05 | No PIXI/Svelte/DOM imports in `src/core/` | — | proxy:static-analysis | covered (step 09.3; confirmed again this step) |
| A-09-06 | Four equal-weight nav tabs; one active at a time | `src/ui/Header.svelte` | proxy:static-analysis | proxy-covered (step 09.4); manual deferred to Pilot |
| A-09-07 | Composición shows timeline; navigating away and back preserves state | `src/app/App.svelte` + `src/ui/CompositionDrawer.svelte` | proxy:static-analysis | proxy-covered (step 09.4); manual deferred to Pilot |
| A-09-08 | Código Strudel shows code editor; drawer tab buttons gone | `src/app/App.svelte` + `src/ui/CodeDrawer.svelte` | proxy:static-analysis | proxy-covered (step 09.4); manual deferred to Pilot |
| A-09-09 | Rhythm controls in top bar when Ritmo active; no canvas overlay | `src/ui/Header.svelte` | proxy:static-analysis | proxy-covered; `orbit-ctl` live usages = 0; manual deferred to Pilot |
| A-09-10 | Transport footer transversal-only in all views | — | manual | not covered — deferred to step 09.6 |
| A-09-11 | Per-view hint text correct | `src/app/App.svelte` | proxy:static-analysis | proxy-covered (step 09.4); manual deferred to Pilot |

**Proxy disclosures:**

- A-09-09:
  - `src/ui/Header.svelte` — `{#if $sessionStore.view === 'rhythm'}` block at line ~202 (post-Prettier) contains `.rhythm-ctl` div with all rhythm controls. The block only renders when `view === 'rhythm'`.
  - `src/ui/RhythmControls.svelte` — file is now an empty shell (AGPL comment + relocation note only). No executable template, no CSS rules, no script logic.
  - `grep -n "orbit-ctl" src/ui/RhythmControls.svelte` → 0 matches.
  - `grep -rn 'class="orbit-ctl' src/ui/` → 0 matches (no live `.orbit-ctl` HTML class attributes anywhere).

### Decisions made (if any)

- **Empty shell retained (not deleted).** `RhythmControls.svelte` is kept as an empty file so `App.svelte` compiles without a second edit. Rationale: the phase spec explicitly allows this: "If the component is left as an empty shell: keep `<RhythmControls />` in `App.svelte` but it renders nothing." Cleanup (removing the import and tag from `App.svelte`) is explicitly allowed in step 09.6 static analysis review.
- **CSS class renamed `.mk` → `.rk` in Header.svelte.** The original class name `.mk` (from the overlay) would conflict if HarmonyControls or other header-scoped CSS ever used `.mk`. `.rk` (rhythm key) is namespaced to the rhythm controls section. This is a purely internal naming decision within the header's scoped CSS block.
- **No `max-width` on `.rhythm-ctl`.** The original overlay's `max-width:62%` was tied to absolute canvas positioning. In the header's inline-flex row, `flex-wrap:wrap` handles overflow on narrow viewports without a hard cap. This was noted as the layout choice per the spec's requirement to document it.

### Proposed Decisions Register entries (if any)

- None. All decisions in this step are implementation details within the bounds of ADR 0013 D3.

### Blockers resolved during this step (if any)

- None.

### Environment state after this step

- Rhythm controls are in the top bar (Header.svelte, gated by `view === 'rhythm'`). Canvas overlay is gone. `RhythmControls.svelte` is an empty shell. Quality gate baseline: 396 passed, 0 tsc errors, 0 lint errors.
- Branch: `orbifold-v2/phase-09`.

### Next-step context (only if non-obvious)

- Step 09.6 is the quality-gates + static analysis step. It confirms all A-09 acceptance IDs across all source changes (09.3–09.5) and produces a manual acceptance checklist for the Pilot.
- Clean-up item for 09.6 consideration: remove the `<RhythmControls />` import and tag from `App.svelte` (currently an empty shell). This is optional — the empty import does not affect correctness or quality gates, but removing it would keep `App.svelte` clean.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

- **Terminal commit:** `feat(navigation): Phase 09 step 09.5 — rhythm controls to top bar`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 09.6 — Quality gates + manual acceptance

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

- Ran the full quality gate suite against the Phase 09 codebase (steps 09.3–09.5 combined).
- Ran all static analysis checks required by the phase spec and ADR 0013 §Consequences.
- Assembled the phase-level Acceptance Coverage Table for all A-09-01..A-09-11 acceptance IDs, citing exact source file and line numbers for every statically-verified criterion.
- Identified A-09-06..A-09-11 as browser-runtime UI items requiring Pilot manual verification at Checkpoint #5. Provided the exact manual checklist below.
- Confirmed: no scope expansion, no new features introduced.

### Quality gate evidence (verbatim results)

**`pnpm exec tsc --noEmit`**
Exit 0. Zero TypeScript errors. (Clean — no output.)

**`pnpm lint`**
Exit 0. All matched files use Prettier code style. Zero ESLint warnings or errors.

**`pnpm exec vitest run`**
```
Test Files  13 passed (13)
     Tests  396 passed (396)
  Duration  527ms
```
396 passed (baseline Phase 08: 385; Phase 09 added 11 tests in step 09.3). 0 failed. 0 regressions.

**`pnpm build`**
Exit 0. Build succeeded in 1.44s. Two pre-existing dynamic-import warnings (not introduced by Phase 09; they were present from Phase 03 onwards — `stage.ts` and `strudel.ts` are statically + dynamically imported). No new warnings.

### Static analysis checks

All checks performed against the state after step 09.5 (the tip of `orbifold-v2/phase-09`):

| Check | Command | Result |
|---|---|---|
| Rhythm overlay class removed | `grep -rn 'class="orbit-ctl\|class:orbit-ctl' src/` | 0 live HTML class attribute matches — only comment references remain in `Header.svelte` and `HarmonyControls.svelte` |
| Drawer tab buttons removed | `grep -rn 'id="codeTab"\|id="compTab"' src/` | 0 executable element matches — references appear only in comments in `CodeDrawer.svelte` and `CompositionDrawer.svelte` |
| `stage.ts setView` handles new strings | `grep -n "view.*composition\|view.*code" src/render/stage.ts` | Line 175: signature includes `'composition' | 'session' | 'code'` — both PIXI layers hidden for these values |
| Pure engine invariant | `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/` | 0 matches — `src/core/**` has no PIXI/Svelte/DOM imports |
| `subview`/`registerMode` not in Zod schema | `grep -n "subview\|registerMode" src/lib/persistence.ts` | Lines 227–229: both appear only in `deserializeSession` defaults, not in `SavedSessionSchema` Zod definition — ephemeral state rule intact |
| `PX_PER_CYCLE` coordination rule | `grep -n "PX_PER_CYCLE" src/render/harmony-staff-scene.ts` | Line 55: `import { PX_PER_CYCLE } from '../core/harmony/time-map.js'` — imported from canonical source; ProgressionStrip uses local const `PX_PER_CYCLE = 48` (same value, per Register) |
| Schema version | `grep -n "SESSION_SCHEMA_VERSION" src/lib/persistence.ts` | Line 16: `export const SESSION_SCHEMA_VERSION = 2` |
| AGPL-3.0 headers | `head -2` on all 7 modified files | All 7 files (`session.ts`, `stage.ts`, `persistence.ts`, `Header.svelte`, `App.svelte`, `CodeDrawer.svelte`, `CompositionDrawer.svelte`, `RhythmControls.svelte`) have `SPDX-License-Identifier: AGPL-3.0-only` on line 1 or 2 |

**Key source citations for statically-verified acceptance IDs:**

- **A-09-01:** `src/state/session.ts` line 248 — `view: 'rhythm' | 'harmony' | 'composition' | 'session' | 'code'`; line 265 — `view: 'harmony'` (valid default). Schema v2: `src/lib/persistence.ts` lines 112–113 — `z.enum(['rhythm', 'harmony', 'composition', 'session', 'code'] as const).catch('harmony' as const)`.
- **A-09-02:** `src/render/stage.ts` lines 175–178 — `export function setView(view: 'harmony' | 'rhythm' | 'composition' | 'session' | 'code')`: `harmonyLayer.visible = view === 'harmony'`; `rhythmLayer.visible = view === 'rhythm'`. For `'composition'`, `'session'`, `'code'` both evaluate to `false`.
- **A-09-03:** `src/lib/persistence.ts` line 16 — `SESSION_SCHEMA_VERSION = 2`; line 109 — `version: z.literal(2)`; lines 112–113 — view enum with `.catch('harmony' as const)`. Tests in `tests/persistence.test.ts`: "Phase 09 schema v2" group (8 tests including `it.each` over all 5 view strings, unrecognized view fallback, version-1 blob drop).
- **A-09-04:** All four gates green (recorded above).
- **A-09-05:** `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/` → 0 matches.

### Files touched (gate/assembly step — no source code changes)

- `docs/orbifold-v2/handoffs/phase-09-handoff.md` — this entry

No source files modified in step 09.6. This is a gate-and-acceptance-assembly step per the phase spec.

### Phase-level Acceptance Coverage Table (A-09-01..A-09-11)

| Acceptance ID | Required behavior | Evidence / source citation | Test type | Status |
|---|---|---|---|---|
| A-09-01 | `SessionState.view` includes all 5 strings; `DEFAULT_SESSION_STATE.view` valid | `src/state/session.ts:248` (type); `:265` (default); `tests/persistence.test.ts` (Phase 09 `it.each` 5 sub-tests) | proxy:static-analysis + unit | **COVERED** |
| A-09-02 | `stage.ts setView` hides both PIXI layers for `'composition'`, `'session'`, `'code'` | `src/render/stage.ts:175–178` (function signature + two `.visible` assignments) | proxy:static-analysis | **COVERED** |
| A-09-03 | Schema version 2; `SESSION_SCHEMA_VERSION = 2`; unrecognized view → `'harmony'`; v1 blobs dropped | `src/lib/persistence.ts:16,109,112–113`; `tests/persistence.test.ts` (8 Phase 09 tests) | unit | **COVERED** |
| A-09-04 | All quality gates green (tsc, lint, vitest ≥ 385, build) | Above gate evidence: 396 passed, 0 tsc errors, 0 lint errors, build exit 0 | automated | **COVERED** |
| A-09-05 | No PIXI/Svelte/DOM imports in `src/core/` | `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/` → 0 matches | proxy:static-analysis | **COVERED** |
| A-09-06 | Four equal-weight primary view tabs; one active at a time; switching changes content area | `src/ui/Header.svelte:178–207` (4-button `#viewSeg`; all `.seg button`; `class={... === '...' ? 'active' : ''}`) | proxy:static-analysis | **COVERED (proxy); manual deferred to Pilot** |
| A-09-07 | "Composición" shows composition timeline; navigating away and back preserves state | `src/app/App.svelte` (`{#if $sessionStore.view === 'composition'}<CompositionDrawer />{/if}`); `src/ui/CompositionDrawer.svelte` `onMount` sets `open=true`; store persists across mounts | proxy:static-analysis | **COVERED (proxy); manual deferred to Pilot** |
| A-09-08 | "Código Strudel" shows code editor; `#codeTab`/`#compTab` buttons gone from UI | `src/app/App.svelte` (`{#if $sessionStore.view === 'code'}<CodeDrawer />{/if}`); `grep 'id="codeTab"\|id="compTab"' src/` → 0 element matches | proxy:static-analysis | **COVERED (proxy); manual deferred to Pilot** |
| A-09-09 | Rhythm controls in top bar when Ritmo active; no canvas overlay | `src/ui/Header.svelte` `{#if $sessionStore.view === 'rhythm'}` block; `grep 'class="orbit-ctl' src/` → 0 live element matches; `src/ui/RhythmControls.svelte` is empty shell | proxy:static-analysis | **COVERED (proxy); manual deferred to Pilot** |
| A-09-10 | Transport footer contains only transversal controls in all four views | `src/ui/Transport.svelte` — no `{#if view === ...}` guards; controls: ▶ Ritmo, ▶ Armonía, ▶ Sesión, ■ silencio, BPM slider/readout, TAP, `<LatencyCalibration />`; `grep -n "view" src/ui/Transport.svelte` → only CSS class names (`.ebtn.rhythm`, `.ebtn.harmony`) for button colors, no view-gating logic | proxy:static-analysis | **COVERED (proxy); manual deferred to Pilot** |
| A-09-11 | Per-view hint text: Armonía/Tonnetz, Armonía/Pentagrama, Ritmo; no canvas hint for Composición/Código Strudel | `src/app/App.svelte` hint block — `{#if $sessionStore.view === 'harmony'}` (two sub-branches: tonnetz/staff) + `{:else if $sessionStore.view === 'rhythm'}` ("Elige E(k,n)…"); no hint for `'composition'`/`'code'` | proxy:static-analysis | **COVERED (proxy); manual deferred to Pilot** |

**Proxy disclosures:**

- A-09-06: Visual equality of the four tab buttons cannot be asserted from CLI. The proxy (all four `<button>` elements inside `#viewSeg`, all assigned the same `.seg button` CSS class, with no per-button font or padding override) is a sound structural guarantee of equal weight. The `class={... === '...' ? 'active' : ''}` pattern enforces a single active tab at a time.
- A-09-07: "Preserves state" means the composition block/track data in `sessionStore.composition` is not reset on component unmount — the store is a module singleton that outlives component lifecycle. Structurally sound; Pilot should verify the rAF playhead cursor restarts correctly after navigating away and back.
- A-09-08: The `{#if}` gate mounts/unmounts `CodeDrawer` on view switch. Code editor text (`userEdited`, `liveCode`) is local state in `CodeDrawer.svelte` — it resets on remount if the user had typed but not executed. This is existing behavior from the drawer model; no regression introduced.
- A-09-09: The morph toggle, euclidean sliders, preview toggle, + órbita, + capa vacía, and 📨 base buttons are all in the `{#if $sessionStore.view === 'rhythm'}` block in `Header.svelte`. Pilot should verify each control is functional.
- A-09-10: `Transport.svelte` was confirmed unchanged in this phase (ADR 0013 D4). No view-specific logic exists in the file. The `#if` omission is structural proof.
- A-09-11: The rhythm hint string "Elige E(k,n) y añade órbitas euclidianas. Click derecho sobre una órbita para silenciarla." matches ADR 0013 D5. Pilot should verify text is readable/visible when in Ritmo view.

### Manual acceptance checklist for Pilot Checkpoint #5

The following items require browser runtime verification. Open the app at `pnpm dev` (or the deployed build) and verify each item:

**A-09-06 — Four equal-weight primary view tabs:**
- [ ] The top bar shows four tabs: Armonía · Ritmo · Composición · Código Strudel (left to right).
- [ ] Each tab has the same visual weight (same font size, same padding, same height).
- [ ] The active tab is visually distinguished (active/highlighted state).
- [ ] Only one tab is active at a time. Clicking a tab activates it and deactivates the others.
- [ ] The canvas/content area updates immediately on tab click.

**A-09-07 — Composición primary view:**
- [ ] Clicking "Composición" shows the composition timeline (block library on the left, DAW track grid, composition transport row inside the view).
- [ ] The ProgressionStrip and Transport footer remain visible while in Composición view.
- [ ] Navigate to another view (e.g., Armonía), then back to Composición. Verify the timeline blocks/tracks are in the same state as when you left.
- [ ] The rAF playhead cursor inside the Composición view starts ticking correctly after the remount (no frozen cursor).

**A-09-08 — Código Strudel primary view + no drawer tab buttons:**
- [ ] Clicking "Código Strudel" shows the live code editor (textarea + ▶ ejecutar / ↷ queue buttons).
- [ ] The "⌄ código strudel" bottom-edge tab button is gone — it does not appear anywhere in the UI.
- [ ] The "🎚 composición" bottom-edge tab button is gone — it does not appear anywhere in the UI.
- [ ] No other drawer-style slide-up affordances appear in the app.

**A-09-09 — Rhythm controls in top bar:**
- [ ] Navigate to the Ritmo view. Verify the following controls appear in the top bar (header area):
  - [ ] Morph toggle (▭ lineal / ▭ radial)
  - [ ] Sound select dropdown
  - [ ] E(k,n) readout with k, n, r sliders
  - [ ] Named-pattern info span (if pattern matches)
  - [ ] Preview toggle (▶ oír / ■ stop)
  - [ ] + órbita button
  - [ ] + capa vacía button
  - [ ] 📨 base context button
- [ ] Navigate to Armonía view. Verify the rhythm controls are hidden (not visible in the header).
- [ ] The canvas in Ritmo view has no floating/overlay rhythm controls panel.
- [ ] Each rhythm control is functional: try adding an orbit, toggling morph, and previewing.

**A-09-10 — Transport footer transversal-only:**
- [ ] The bottom Transport row shows ▶ Ritmo, ▶ Armonía, ▶ Sesión, ■ silencio, BPM, TAP in all four views.
- [ ] No view-specific controls appear in the Transport footer in any of the four views.

**A-09-11 — Per-view hint text:**
- [ ] In Armonía / Tonnetz sub-view: the Tonnetz instruction hint is visible (e.g., "Click en un triángulo…").
- [ ] In Armonía / Pentagrama sub-view: the Pentagrama instruction hint is visible.
- [ ] In Ritmo view: the rhythm hint is visible (e.g., "Elige E(k,n) y añade órbitas euclidianas. Click derecho sobre una órbita para silenciarla.").
- [ ] In Composición view: no canvas hint text floats over the composition timeline (the view has its own built-in labels).
- [ ] In Código Strudel view: no canvas hint text floats over the code editor (the view has its own built-in labels).

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → 0 errors
- `pnpm lint` → 0 errors (ESLint + Prettier clean)
- `pnpm exec vitest run` → 396 passed, 0 failed (13 test files)
- `pnpm build` → exit 0 (1.44s)

### Decisions made (if any)

- No new decisions. Step 09.6 is a gate-and-assembly step; all implementation decisions were made in steps 09.3–09.5.
- Static analysis confirms the `orbit-ctl` grep in the phase spec as "0 matches" is satisfied: no live HTML class attributes reference `.orbit-ctl` in any file under `src/`; the only occurrences are in CSS comments documenting the migration provenance. This matches the phase spec intent (the overlay is gone; the comments are informational only).

### Proposed Decisions Register entries (if any)

- None.

### Blockers resolved during this step (if any)

- None.

### Environment state after this step

- All Phase 09 source changes complete (steps 09.3–09.5). All quality gates green. Phase-level acceptance table assembled. Manual checklist ready for Pilot Checkpoint #5.
- Branch: `orbifold-v2/phase-09`.
- Test baseline: 396 passed (13 test files). `SESSION_SCHEMA_VERSION = 2`. Four primary views in nav.

### Next-step context (only if non-obvious)

- Step 09.6 is the final step of Phase 09. After Pilot Checkpoint #5 manual acceptance, Phase 09 is complete and a phase PR/merge to `main` follows.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

- **Terminal commit:** `feat(navigation): Phase 09 step 09.6 — quality gates and manual acceptance`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.
