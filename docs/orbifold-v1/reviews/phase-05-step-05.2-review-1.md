# Review — Phase 05 Step 05.2 — Iteration 1

**Decision:** REVISE
**Date:** 2026-06-08
**Iteration:** 1 of 5
**Reviewer:** Planner

---

## Summary

The CSS additions, `composition.ts` timing module, and all 13 `session.ts` action functions are
well-implemented: prototype parity table is complete, every function has a JSDoc with prototype
line citations, the `compPos` formula and `PPB` constant match exactly, and all gate commands pass
(tsc 0, lint 0, 120 tests). However, two ADRs that the phase spec explicitly required at step 05.2
were not filed. The handoff itself acknowledges this gap ("ADR for 'Composition timing state
placement' is due — to be filed alongside step 05.2 per phase spec") without acting on it. Filing
missing ADRs is a commit-scope obligation: the governance trail is incomplete until they exist.

---

## Checklist result

| Item | Status | Notes |
|---|---|---|
| 1. Commit scope clean | FAIL | Two ADRs required by phase spec at step 05.2 are absent; handoff itself flags the omission |
| 2. Commit message format | pass | `feat(composition): Phase 05 step 05.2 — composition CSS tokens, timing state, and session.ts composition actions` |
| 3. Acceptance Coverage Table present and complete | pass | All 14 A-05 IDs mapped; honest partial/deferred breakdown; A-05-14 static claim is citable and disclosed |
| 4. Tests are relevant, not just green | pass | 120 tests pass with no regressions; new unit tests deferred per spec ("if time permits") — acceptable |
| 5. Live-system / operability evidence | pass | CSS inert without drawer; visual parity claim ("renders identically") sufficient for this step; live-system deferred to 05.3/05.4 correctly |
| 6. Register respected | pass | Both active Register entries verified (exact pinning: no new deps; cx/cy: A-05-14 confirmed) |
| 7. Reversibility intact | pass | New exports only; `'block'` union addition is additive; 120 existing tests unaffected |
| 8. No unauthorized new dependencies or env/CI changes | pass | No `pnpm add`; lock file unchanged |
| Prototype parity (project-specific) | pass | Full table with prototype line citations per every action; formula, constant, and resume logic all cited |

---

## What to fix

### Required: file both ADRs triggered at step 05.2

The phase spec (Phase 05 "ADR Triggers" section) lists two ADRs that open when step 05.2
decisions become real. Both were resolved at step 05.2 (via OD-1/OD-2 Pilot pre-resolution) and
the implementation embeds those decisions. The ADRs must be created now.

**ADR 1 — Composition timing state placement**

File: `docs/adr/0008-composition-timing-state-module.md`

Content must cover:
- Decision: Composition playhead timing state lives in `src/state/composition.ts` (a dedicated
  module), NOT inlined into `session.ts` and NOT in the Svelte store.
- Context: Same pattern as `src/state/hud.ts` (one timing module per ephemeral concern). The
  state changes at 60 fps (rAF loop) and would cause excessive store re-renders if reactive.
- Consequences: `CompositionDrawer.svelte` imports from `composition.ts` directly for the rAF
  loop. Phase 07 persistence scope explicitly excludes `composition.ts` state (ephemeral).
- Status: Accepted (Pilot pre-resolved as OD-2 before step 05.2).

**ADR 2 — Block/track ID counters: ephemeral module-level counters**

File: `docs/adr/0009-composition-id-counters-ephemeral.md`

Content must cover:
- Decision: `_blkSeq` / `_trkSeq` counters are module-level variables in `session.ts`, NOT
  fields in the Svelte store, NOT persisted.
- Context: Prototype uses `let blkSeq=1, trkSeq=1;` at module level (line 1933) — IDs regenerate
  on page reload. The decision to NOT persist them means Phase 07 session files will not contain
  counter values; on load, new IDs are generated starting from 1 again.
- Consequences: If a user saves a session and reloads, blocks loaded from JSON will get new IDs
  (Phase 07 must assign IDs to deserialized blocks, not read them from counters). Phase 07
  design must account for this.
- Status: Accepted (Pilot pre-resolved as OD-1 before step 05.2).

Each ADR must carry the AGPL-3.0 header and follow the format used in existing ADRs
(`docs/adr/0001-svelte-tooling.md` through `docs/adr/0007-pixi-app-singleton.md`).

---

## What NOT to change

The following are correct and must not be touched in the fix iteration:

- `src/app/app.css` — all composition CSS tokens are correct and match prototype lines 251–314.
- `src/state/composition.ts` — module structure, `PPB`, `compPos` formula, getters/setters all correct.
- `src/state/session.ts` — all 13 action functions, `'block'` union addition, module-level counters, imports — all correct.
- `docs/orbifold-v1/handoffs/phase-05-handoff.md` — the step 05.2 entry content is accurate; only the "Planner Review" section changes (to reflect the REVISE decision, then APPROVE after fix).
- Gate command results (tsc 0, lint 0, 120 tests) — do not re-run unless a source file is edited; these results remain valid.
- The Acceptance Coverage Table — it is correctly structured and the deferred items are honest.
- No new source code beyond the two ADR files.

---

## Fix scope

Two files to create: `docs/adr/0008-composition-timing-state-module.md` and
`docs/adr/0009-composition-id-counters-ephemeral.md`.

No source code changes. No changes to existing ADRs. No changes to `decisions.md` (Pilot-only).

The commit for the fix should follow the step 05.2 commit with message:
`docs(adr): Phase 05 step 05.2 — ADR 0008 composition timing state, ADR 0009 ephemeral ID counters`
