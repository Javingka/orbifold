# Handoff — Phase 04 (Svelte UI Layer)

---

## Step 04.1 — Inventory

**Date:** 2026-06-08
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed
- Read all required files: CLAUDE.md, decisions.md, phase-04.md, App.svelte, session.ts, reference/orbifold.html (lines 1–580, 638–693, 838–877, 1410–1535, 2128–2148), tonnetz-scene.ts, src/ui/ directory, src/state/ directory, main.ts, ORBIFOLD_KICKOFF.md §4–6, euclid.ts, tonal-function.ts, scales.ts, handoff-template.md.
- Produced `docs/orbifold-v1/inventories/phase-04-inventory.md` covering: component map (9 components), App.svelte changes, layer-overlay decision, state additions, session.ts additions, CSS strategy, open decisions, source-of-truth check, dependency needs, environment changes, Register check, risks.
- Open Decision 2 (code-drawer currentCode) confirmed resolved by Pilot (OD-2: local state in CodeDrawer.svelte).
- One open decision remains for Pilot: font loading strategy (Google Fonts @import vs. fontsource packages vs. system fallbacks).

### Files touched
- `docs/orbifold-v1/inventories/phase-04-inventory.md` — created
- `docs/orbifold-v1/handoffs/phase-04-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by the inventory step.

### Routine validations (one-liner each, no transcripts)

None — inventory step does not run validation commands.

### Acceptance Coverage Table

No Acceptance IDs touched by this step.

### Decisions made (if any)
- Layer-control DOM overlay stays in App.svelte through Phase 04 (no dedicated `LayerCtl.svelte`). Rationale documented in inventory §Layer-overlay refactor.

### Proposed Decisions Register entries (if any)
- "Layer-control DOM overlay stays in App.svelte until an explicit refactor phase" — surfaced in step 04.1; low stakes, Pilot may accept or defer.

### Blockers resolved during this step (if any)
- None.

### Environment state after this step
- Codebase unchanged (no source code written).
- 119 tests still passing (no changes to src/).
- One open decision awaiting Pilot resolution: font loading strategy.

### Next-step context (only if non-obvious)
- Before step 04.2 begins, the Pilot must choose the font loading strategy (Open Decision 1 in inventory). If option (b) is chosen, a `pnpm add` command with three exact-version fontsource packages must be authorized.
- Step 04.2 creates `src/app/app.css` and adds session.ts action functions. It also removes the rhythm-seed block in App.svelte `onMount` (the temporary 4-on-the-floor BD seeded for Phase 02/03 smoke tests).

### Planner Review

(To be filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**
