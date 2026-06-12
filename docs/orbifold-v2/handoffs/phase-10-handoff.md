<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 10 Handoff — Pentagrama as editor: duration-extent rendering, interactive slot manipulation, and bar grid

---

## Step 10.2 — ADR 0014 (staff editor amendment + interaction model)

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

- Wrote `docs/adr/0014-staff-editor.md` with decisions D1–D7 encoding all five Pilot resolutions from Checkpoint #1 (OQ-1 through OQ-5, OQ-4 not resolved per scoping decision).
- **D1:** Amendment to ADR 0011 D2 — the Pentagrama staff is now a co-equal duration editor alongside the ProgressionStrip. Both surfaces call the same store actions (`setChordBars`, `clearChordAt`, `reorderSlot`). Gain stays strip-only. ADR 0011 D2's "no editing affordance" clause is superseded for duration; all other ADR 0011 D2 clauses remain in effect.
- **D2:** Duration-extent rendering model (OQ-2 → Option A) — filled horizontal bars per voice (8px tall, `bars × PX_PER_CYCLE` wide, voice color, 80% opacity) with onset circles at the left edge. Rest slots: grey bar at middle staff line. Arpeggio mode (OQ-5 → Option A): three staggered onset circles at beat-accurate offsets (0, 1/3, 2/3 of slot duration) with ascending connector line.
- **D3:** Hit-test architecture — pure engine `staff-hit.ts` (no DOM/PIXI/Svelte) exports `computeSlotBounds`, `hitTestSlot`, `hitTestResizeHandle`, `nearestInsertionIndex`. PIXI scene registers one full-canvas transparent hit rectangle; per-slot graphics are not interactive.
- **D4:** Slot interaction gesture specification — select (pointerdown on body), delete (✕ button), resize (right-edge drag with `clampBars` semantics, no store write until pointerup), time-move (body drag with 4px threshold, ghost bar + insertion indicator, `reorderSlot` on drop).
- **D5:** `reorderSlot` store action semantics — absolute-index splice; no-op if `fromIdx === toIdx` after clamping; calls `requeueLive()`. Reordering changes audio output by design.
- **D6:** Bar grid — beat lines at every `PX_PER_CYCLE / 4` (12px, 15% opacity) and bar lines at every `PX_PER_CYCLE` (48px, 35% opacity); left boundary at 50% opacity; `drawBarGrid` helper inside `harmony-staff-scene.ts`.
- **D7:** Arpeggio mode visual binding spec — voice 0/1/2 onset x-coordinates at `slotStart`, `slotStart + bars×PX_PER_CYCLE/3`, `slotStart + 2×bars×PX_PER_CYCLE/3`; thin ascending connector polyline; `chordMode` parameter passed to `drawStaticStaff` from `buildHarmonyStaffScene`.
- Consequences section documents: strip + staff co-equal via shared store actions; gain strip-only; ephemeral interaction state module-level (not persisted); `reorderSlot` audio change is by design; no codegen changes in Phase 10; `staff-hit.ts` pure engine; stale-bounds hazard addressed by recomputing on every `buildHarmonyStaffScene` call; ADR 0011 D2 partially superseded.

### Files touched

- `docs/adr/0014-staff-editor.md` — new file (created)
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — new file (this handoff)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are directly verified by this step (ADR creation step — no source code changes). The ADR records decisions that downstream steps 10.3–10.8 implement and verify.

### Routine validations (one-liner each, no transcripts)

No source files modified. Quality gates unchanged from Phase 10 baseline (confirmed in step 10.1): 396 passed, 0 tsc errors, 0 lint errors.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-10-01 | Duration-extent rendering: horizontal bars spanning `bars × PX_PER_CYCLE` per voice | — | manual | not covered — deferred to step 10.4 |
| A-10-02 | Rest extent rendering: grey bars at middle staff line | — | manual | not covered — deferred to step 10.4 |
| A-10-03 | Bar grid: vertical beat and bar lines on staff canvas | — | manual | not covered — deferred to step 10.4 |
| A-10-04 | Chord / arp mode visual toggle: parallel bars vs staggered onset dots | — | manual | not covered — deferred to step 10.5 |
| A-10-05 | Select: clicking a slot shows border, ✕ button, and resize handle | — | manual | not covered — deferred to step 10.6 |
| A-10-06 | Delete via ✕: removes slot; ProgressionStrip reflects removal | — | manual | not covered — deferred to step 10.6 |
| A-10-07 | Resize: right-edge drag changes duration; commits via `setChordBars`; strip updates | — | manual | not covered — deferred to step 10.6 |
| A-10-08 | Time-move: body drag reorders slot; ProgressionStrip reflects new order | — | manual | not covered — deferred to step 10.7 |
| A-10-09 | Playhead cyclic + matches ProgressionStrip cursor; neither visible when not playing | — | manual | not covered — deferred to step 10.8 (no-op per inventory §a verdict) |
| A-10-10 | ProgressionStrip parity: edits on staff visible in strip and vice versa | — | manual | not covered — deferred to step 10.6 |
| A-10-11 | `staff-hit.ts` pure engine; all exports unit-tested; no regressions | — | automated | not covered — deferred to step 10.3 |
| A-10-12 | `reorderSlot` unit-tested; correct semantics; calls `requeueLive()`; no-op when fromIdx === toIdx | — | automated | not covered — deferred to step 10.3 |
| A-10-13 | All quality gates green: tsc, lint, vitest ≥ 396, build | — | automated | not covered — deferred to step 10.8 |
| A-10-14 | `registerMode` and `subview` absent from `SavedHarmonySchema` and `agent/schema.ts` | — | automated (proxy: grep) | not covered — deferred to step 10.8 |
| A-10-15 | Audio byte-identical before/after visual rendering changes (no codegen changes) | — | automated (proxy: grep) | not covered — deferred to step 10.8 |
| A-10-16 | AGPL-3.0 header in all new and modified source files | — | automated (proxy: head -2) | not covered — deferred to step 10.8 |

**Notes on partial coverage:** This step is ADR-only. All Acceptance IDs are deferred to their respective implementation steps (10.3–10.8). The ADR records the binding decisions that implementation steps must satisfy.

**Proxy disclosures:** No static analysis run in this step.

### Decisions made (if any)

- D1–D7 recorded in ADR 0014 per Pilot resolutions at Checkpoint #1; no new decisions introduced by the Dev.
- Playhead discrepancy sub-step (10.3a) confirmed as no-op per inventory §a verdict: no discrepancy found; `_staffWidth` formula and BUG A guard both correct and consistent.

### Proposed Decisions Register entries (if any)

- None. The ADR decisions (D1–D7) are Pilot-resolved and recorded in the ADR. No additional Register proposals arise from this step.

### Blockers resolved during this step (if any)

- None.

### Environment state after this step

- Source code unmodified. ADR 0014 committed. Phase-10 handoff initiated.
- Branch: `orbifold-v2/phase-10`. Quality gate baseline: 396 passed, 0 tsc errors, 0 lint errors.

### Next-step context (only if non-obvious)

- Step 10.3 implements: (a) playhead fix no-op (per inventory verdict); (b) `src/core/harmony/staff-hit.ts` with the four pure-engine exports specified in ADR 0014 D3; (c) `reorderSlot` store action in `session.ts` per ADR 0014 D5; (d) unit tests in `tests/harmony/staff-hit.test.ts` covering `computeSlotBounds`, `hitTestSlot`, `hitTestResizeHandle`, `reorderSlot`, and `nearestInsertionIndex` (the last added for step 10.7).
- Note on `nearestInsertionIndex`: although first exercised in step 10.7 (move gesture), it should be added to `staff-hit.ts` and tested in step 10.3 so the pure engine is fully delivered before the PIXI interaction layer in steps 10.6–10.7.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `docs(adr): Phase 10 step 10.2 — ADR 0014 staff editor`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.
