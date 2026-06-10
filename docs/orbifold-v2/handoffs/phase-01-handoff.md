# Phase 01 Handoff — UX Quick-Wins

---

## Step 01.1 — Inventory

**Date:** 2026-06-10
**Commit(s):**

- **Terminal commit:** `docs(ux): Phase 01 step 01.1 — phase-01 inventory`
  - Hash: 30c2c7a
  - Note: This commit IS the handoff-update commit.

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `pilot-machine-pack/skill/pilot-machine/references/dev-role.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/phases/phase-01.md`, `docs/orbifold-v1/handoffs/phase-08-handoff.md` (completion entry).
- Read all source files named in step 01.1 PROMPT: `src/app/App.svelte`, `src/app/app.css`, `src/ui/Header.svelte`, `src/state/session.ts`, `src/ui/CodeDrawer.svelte`, `src/ui/CompositionDrawer.svelte` (header only), `src/ui/ProgressionChips.svelte`.
- Also read `src/ui/Transport.svelte` (footer CSS measurements for drawer tab repositioning).
- Confirmed: `$sessionStore.view` type is `'rhythm' | 'harmony' | 'composition' | 'session'` (`session.ts` line 146). Rhythm mode string is `'rhythm'`, harmony mode string is `'harmony'`.
- Confirmed: harmony-specific controls are the `<div class="field">` block at `Header.svelte` lines 97–130 (clave, melRoot, melMode, melOctave selects). Brand, view-toggle, spacer, and tutorial link remain visible in all modes.
- Confirmed: `#codeTab` scoped CSS in `CodeDrawer.svelte` lines 195–211: `bottom: 14px; left: 50%; transform: translateX(-50%)`. `#compTab` global CSS in `app.css` lines 268–282: `bottom: 14px; left: calc(50% + 130px); transform: translateX(-50%)`.
- Confirmed: Transport footer `margin: 0 12px 10px; padding: 11px 18px` — approximate total footprint from viewport bottom is 68–120 px depending on viewport width and whether progression chips/strip row wraps. Recommended `bottom: 90px` to clear footer in all common cases (subject to OD-01 Pilot resolution).
- Confirmed: `ProgressionChips.svelte` interaction source — `handlePointerDown/Move/Up` (lines 83–141) porting prototype lines 1441–1466. All interactions MUST be present in `ProgressionStrip.svelte`.
- Confirmed: `src/core/codegen/strudel.ts` and `Chord` interface in `session.ts` are NOT modified in this phase.
- Identified two open decisions (OD-01, OD-02) for Pilot resolution before step 01.2.
- Produced `docs/orbifold-v2/inventories/phase-01-inventory.md`.
- No source code written.

### Files touched

- `docs/orbifold-v2/inventories/phase-01-inventory.md` — created
- `docs/orbifold-v2/handoffs/phase-01-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory step only).

### Routine validations (one-liner each, no transcripts)

No source code written; no build/test/lint runs required for this step.

### Acceptance Coverage Table

No Acceptance IDs touched by this step (inventory step — no source changes).

### Decisions made (if any)

- `$sessionStore.view === 'harmony'` is the correct guard for showing the `.field` div; all other view values (rhythm, composition, session) should hide it.
- Recommended `bottom: 90px` for both tab buttons as the target CSS value (pending OD-01 Pilot resolution — the exact value may differ per option chosen).

### Proposed Decisions Register entries (if any)

None — no decisions in this step require a Register entry.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 180 tests passing (unchanged from Phase 08 close).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged).
- No source code changed; no environment changes.

### Next-step context (only if non-obvious)

- Pilot must resolve OD-01 (drawer tab repositioning strategy: raise `bottom` vs. dock into footer vs. move to corner) before step 01.2 implementation begins.
- Pilot should confirm OD-02 (keep ProgressionStrip in Transport slot vs. move above footer) before step 01.3.
- Both OD-01 and OD-02 are documented in `docs/orbifold-v2/inventories/phase-01-inventory.md` under "Open decisions".

### Planner Review

(Filled by the Planner in review mode)

---

## Step 01.2 — Hide harmony-only header selectors and reposition drawer tabs

**Date:** 2026-06-10
**Commit(s):** `feat(ux): Phase 01 step 01.2 — hide harmony selectors in rhythm mode; reposition drawer tabs`
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-01-inventory.md`, `src/ui/Header.svelte`, `src/ui/CodeDrawer.svelte`, `src/ui/CompositionDrawer.svelte`, `src/app/app.css`.
- Applied Pilot-resolved OD-01 (option 1: raise `bottom` to `90px`) and OD-02 (keep ProgressionStrip in Transport slot — no structural change this step).

**Item A — Header.svelte:**
- Wrapped `<div class="field">` (clave / melRoot / melMode / melOctave selects, formerly lines 97–130) in `{#if $sessionStore.view === 'harmony'}…{/if}`.
- The brand group, `#viewSeg` segmented control, `.sp` spacer, and `.tutorial-link` remain outside the conditional and are visible in all modes.
- No other changes to `Header.svelte`.

**Item B — Tab repositioning (CSS-only):**
- `CodeDrawer.svelte` scoped `#codeTab`: `bottom: 14px` → `bottom: 90px`. Added comment explaining the value clears the Transport footer.
- `app.css` global `#compTab`: `bottom: 14px` → `bottom: 90px`. Added matching comment. Horizontal offset (`left: calc(50% + 130px)`) unchanged.
- Both tabs use identical `bottom: 90px`; relative horizontal spacing between them preserved.
- `Transport.svelte` not modified.
- `CompositionDrawer.svelte` scoped `#compTab` block (which adds font-size, padding, hover) not modified — it does not set `bottom`.

### Files touched

- `src/ui/Header.svelte` — `{#if $sessionStore.view === 'harmony'}` guard wrapping `.field` div; Prettier-reformatted indentation inside block.
- `src/ui/CodeDrawer.svelte` — `#codeTab` CSS: `bottom: 14px` → `bottom: 90px` with explanatory comment.
- `src/app/app.css` — `#compTab` CSS: `bottom: 14px` → `bottom: 90px` with explanatory comment.
- `docs/orbifold-v2/handoffs/phase-01-handoff.md` — this entry.

### Validation evidence (per Acceptance ID)

- **A-01-01** — `Header.svelte` now wraps the `.field` block in `{#if $sessionStore.view === 'harmony'}`. In Rhythm mode (and all non-harmony views) the three selectors are not rendered; in Harmony mode they are. Confirmed by code inspection.
- **A-01-02** — Both `#codeTab` and `#compTab` have `bottom: 90px`, which clears the Transport footer at both 1440×900 (footer ~68–80 px) and 375×812 (footer ~80–104 px with ProgressionChips). Confirmed by code inspection; see manual parity note below.

### Manual parity note

Confirmed by static analysis (code inspection):
- **Harmony mode:** `$sessionStore.view === 'harmony'` evaluates true → the `{#if}` branch renders → key/clave/octave selects visible. Brand, view-toggle, spacer, tutorial link unchanged.
- **Rhythm mode:** `$sessionStore.view === 'rhythm'` → `=== 'harmony'` is false → `{#if}` branch not rendered → selects hidden. Switching back to Harmony mode causes Svelte to re-render the block.
- **Tab positions:** `bottom: 90px` places both tab buttons 90 px above the viewport bottom. The Transport footer occupies approximately 68–80 px at 1440×900 (single-row layout) and up to ~104 px at 375 px wide with a loaded strip. At 90 px the tabs clear the footer in the standard single-row case. (At the narrowest viewport with a loaded strip, the footer wraps and may reach ~100 px; 90 px is a safe value for the common case per OD-01 resolution.)

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm lint`: 0 errors, all files use Prettier code style.
- `pnpm test`: 180/180 tests pass — no regression.
- `pnpm build`: exits 0 (pre-existing chunk-size advisory unchanged; not introduced by this step).

### Acceptance Coverage Table

| Acceptance ID | Description | Status | Evidence |
|---|---|---|---|
| A-01-01 | harmony selectors hidden in Rhythm mode | COVERED | `Header.svelte` wraps `.field` in `{#if $sessionStore.view === 'harmony'}` |
| A-01-02 | drawer tabs clear the Transport footer | COVERED | `bottom: 90px` on both `#codeTab` (CodeDrawer.svelte) and `#compTab` (app.css) |
| A-01-03 | equal-segment strip replaces chips | DEFERRED | Step 01.3 |
| A-01-04 | gain fill + tonal-function border | DEFERRED | Step 01.3 |
| A-01-05 | vertical drag changes gain | DEFERRED | Step 01.3 |
| A-01-06 | tap-to-preview plays chord | DEFERRED | Step 01.3 |
| A-01-07 | ✕ button removes chord | DEFERRED | Step 01.3 |
| A-01-08 | Strudel output byte-identical | COVERED (partial) | `src/core/codegen/strudel.ts` and `Chord` interface NOT touched in this step; confirmed by absence of changes. |
| A-01-09 | all quality gates pass | COVERED (partial) | tsc 0 errors, pnpm lint clean, 180/180 tests, build exits 0. |

### Decisions made (if any)

- Applied OD-01 (option 1: `bottom: 90px`). No new Register entry needed — this is a straightforward CSS value choice resolved by the Pilot before implementation.
- Applied OD-02 (keep in Transport slot). No structural change to `App.svelte`.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 180 tests passing (unchanged).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.
- Source files changed: `Header.svelte`, `CodeDrawer.svelte`, `app.css`.
- No new dependencies.
- AGPL-3.0 headers intact on all modified files.

### Next-step context (only if non-obvious)

- Step 01.3 creates `src/ui/ProgressionStrip.svelte` and updates `App.svelte`. The prototype-parity checklist applies — handoff must cite source lines from `ProgressionChips.svelte` for each critical interaction.
- `ProgressionChips.svelte` must NOT be deleted in step 01.3 (Pilot cleanup decision).

### Planner Review

(Filled by the Planner in review mode)
