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
