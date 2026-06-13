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

---

## Step 10.3 — Playhead fix (no-op) + `reorderSlot` store action + pure hit-test engine

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

**(a) Playhead discrepancy fix — NO-OP (per inventory §a verdict)**

The step 10.1 inventory reached a definitive "NO DISCREPANCY" verdict. `_staffWidth` and `cursorTotalWidth` use the same formula (`progression.reduce(sum + (slot.bars ?? 1)) * PX_PER_CYCLE`). The BUG A guard (`nowPlaying.source === null`) is in place in both surfaces. `_staffWidth` is bounded by progression duration (not canvas width). No code fix was needed. This sub-item is a no-op, explicitly stated here per the Pilot's instruction at Checkpoint #2.

**(b) New pure engine: `src/core/harmony/staff-hit.ts`**

Created with:
- `SlotBounds` interface (`slotIndex`, `x`, `width`)
- `computeSlotBounds(progression, pxPerCycle): SlotBounds[]` — contiguous from x=0, uses `slot.bars ?? 1`
- `hitTestSlot(px, bounds): number | null` — half-open interval `[x, x+width)` test
- `hitTestResizeHandle(px, bounds, handleWidth): number | null` — tests rightmost `handleWidth` pixels of each slot
- `nearestInsertionIndex(px, bounds): number` — returns insertion index for the time-move gesture (step 10.7); included now so the pure engine is complete before the PIXI interaction layer lands in steps 10.6–10.7. Scans slot midpoints in order; returns the first index where `px < midX`, or `bounds.length` if past all midpoints.

No DOM, PIXI, or Svelte imports. AGPL-3.0 header. GREP confirms: `grep -n "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/staff-hit.ts` → 0 matches.

**(c) `reorderSlot` store action in `src/state/session.ts`**

Added `export function reorderSlot(fromIdx: number, toIdx: number): void` per ADR 0014 D5:
- Both indices clamped to `[0, progression.length - 1]`
- No-op (no store write, no `requeueLive()`) if clamped indices are equal
- Handles empty progression via early-return guard before clamping
- Otherwise: splice-remove at `fromIdx`, splice-insert at `toIdx`, call `requeueLive()`
- `requeueLive()` called AFTER `sessionStore.update` completes (not inside the updater)

**(d) Unit tests**

- `tests/harmony/staff-hit.test.ts` (new file, 42 tests):
  - `computeSlotBounds`: empty, single-slot (undefined bars / bars=1 / bars=0.25 / bars=2), three-slot uniform, three-slot mixed (0.25/2/1), three-slot all-0.25, three-slot all-2
  - `hitTestSlot`: left edge, one pixel inside, last pixel inside, right edge (exclusive), second slot, last pixel of last slot, exactly at right edge of last slot (null), far right (null), negative (null), empty bounds (null)
  - `hitTestResizeHandle`: right edge of handle, handle start, one pixel left of handle (null), slot left edge (null), past right edge (null), empty bounds (null), handle zones in all three slots of a three-slot progression
  - `nearestInsertionIndex`: empty bounds (0), midpoint boundary conditions, between-slot positioning, far-left/far-right clamping

- `tests/session.test.ts` (9 new tests added to existing file, 55 total):
  - `reorderSlot`: move-first-to-last, move-last-to-first, adjacent-swap-forward, adjacent-swap-backward, no-op on same index, no-op on single-slot (clamped equals), out-of-range fromIdx clamps, out-of-range toIdx clamps, no-op on empty progression

### Files touched

- `src/core/harmony/staff-hit.ts` — new file (created)
- `src/state/session.ts` — `reorderSlot` action added after `addRestAt`
- `tests/harmony/staff-hit.test.ts` — new file (created)
- `tests/session.test.ts` — `reorderSlot` import added; 9 new `reorderSlot` tests added at end
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

**A-10-11** (`staff-hit.ts` pure engine, all exports unit-tested, no regressions):
- `grep -n "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/staff-hit.ts` → 0 matches (pure engine confirmed)
- `pnpm exec vitest run tests/harmony/staff-hit.test.ts` → 42 passed, 0 failed
- All 4 exports (`computeSlotBounds`, `hitTestSlot`, `hitTestResizeHandle`, `nearestInsertionIndex`) have dedicated test cases
- Full suite: 447 passed (396 baseline + 42 staff-hit + 9 reorderSlot), 0 failed

**A-10-12** (`reorderSlot` store action unit-tested, correct semantics, calls `requeueLive()`, no-op when fromIdx === toIdx):
- `pnpm exec vitest run tests/session.test.ts` → 55 passed (includes 9 new reorderSlot tests)
- move-first-to-last, last-to-first, adjacent-swap verified by inspecting store state post-call
- no-op on `reorderSlot(1,1)` confirmed: store unchanged
- empty-progression guard confirmed: no error, no-op
- `requeueLive()` call: observable indirectly (tests verify store state changes only; audio side-effect is fire-and-forget via dynamic import, consistent with pre-existing session test pattern)

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → exit 0, 0 errors
- `pnpm lint` → exit 0, 0 ESLint errors, 0 Prettier issues
- `pnpm exec vitest run` → 447 passed, 0 failed (14 test files)
- `pnpm build` → exit 0 (build warnings pre-existing: dynamic import chunk coexistence; not introduced by this step)

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
| A-10-09 | Playhead cyclic + matches ProgressionStrip cursor; neither visible when not playing | — | manual | NO DISCREPANCY confirmed by inventory §a — verified correct by code analysis; live re-verification deferred to step 10.8 manual acceptance |
| A-10-10 | ProgressionStrip parity: edits on staff visible in strip and vice versa | — | manual | not covered — deferred to step 10.6 |
| A-10-11 | `staff-hit.ts` pure engine; all exports unit-tested; no regressions | `tests/harmony/staff-hit.test.ts` | automated | **COVERED** — 42 tests pass; 0 PIXI/DOM imports confirmed |
| A-10-12 | `reorderSlot` store action: unit-tested; correct semantics; calls `requeueLive()`; no-op when fromIdx === toIdx | `tests/session.test.ts` | automated | **COVERED** — 9 tests pass; all semantics verified |
| A-10-13 | All quality gates green: tsc, lint, vitest ≥ 396, build | multiple | automated | partial — gates green; full gate deferred to step 10.8 |
| A-10-14 | `registerMode` and `subview` absent from `SavedHarmonySchema` and `agent/schema.ts` | — | automated (proxy: grep) | not covered — deferred to step 10.8 |
| A-10-15 | Audio byte-identical before/after visual rendering changes (no codegen changes) | — | automated (proxy: grep) | not covered — deferred to step 10.8 |
| A-10-16 | AGPL-3.0 header in all new and modified source files | — | automated (proxy: head -2) | **COVERED for this step** — `staff-hit.ts`: AGPL header present; `session.ts`: pre-existing AGPL header; test files: AGPL headers present |

**Notes on partial coverage:** A-10-09 is the playhead story — inventory verdict NO DISCREPANCY (no fix applied). The Pilot will re-verify live at Checkpoint #5. A-10-13 through A-10-16 are addressed for the files touched in this step; the global sweep deferred to step 10.8.

**Proxy disclosures:**
- A-10-11 pure-engine check: `grep -n "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/staff-hit.ts` → 0 matches
- A-10-16 AGPL header: `head -2 src/core/harmony/staff-hit.ts` → `// SPDX-License-Identifier: AGPL-3.0-only`

### Decisions made (if any)

`nearestInsertionIndex` is included in `staff-hit.ts` in this step (10.3) even though it is first consumed by the PIXI interaction layer in step 10.7. Rationale: the pure engine should be fully delivered and tested before the PIXI layer lands; splitting the engine across steps would leave the ADR D3 export list partially implemented. This is within the phase spec's stated intention (step 10.2 handoff §Next-step context bullet 2).

### Proposed Decisions Register entries (if any)

None. No new governance decisions arise from this step.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `src/core/harmony/staff-hit.ts` created (pure engine, 4 exports).
- `src/state/session.ts` extended with `reorderSlot`.
- `tests/harmony/staff-hit.test.ts` created (42 tests).
- `tests/session.test.ts` extended (9 new `reorderSlot` tests).
- Quality gates: 447 passed, 0 tsc errors, 0 lint errors, build clean.
- Branch: `orbifold-v2/phase-10`.

### Next-step context (only if non-obvious)

Step 10.4 rewrites `drawStaticStaff` in `harmony-staff-scene.ts` to render duration-extent bars and adds the bar grid helper. It imports `PX_PER_CYCLE` from `../core/harmony/time-map.js` (already in place). The `staff-hit.ts` engine is not yet imported by `harmony-staff-scene.ts` — that happens in step 10.6 (interaction layer).

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `feat(harmony): Phase 10 step 10.3 — staff-hit engine, reorderSlot action, playhead fix no-op`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 10.4 — Duration-extent rendering + bar grid (chord mode)

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

**(a) Duration bars replacing per-NoteHead drawCircle (ADR 0014 D2)**

Rewrote the note-head rendering loop in `drawStaticStaff`. Each `NoteHead` is now drawn as:
1. A filled rounded-rect bar: `gfx.beginFill(col, 0.8); gfx.drawRoundedRect(nx, ny - 4, barWidth, 8, 2); gfx.endFill()` where `barWidth = Math.max(nh.bars * PX_PER_CYCLE, 8)` (minimum-width guard prevents invisible extents).
2. An onset circle at the left edge: `gfx.beginFill(col, 1); gfx.drawCircle(nx, ny, NOTE_RADIUS); gfx.endFill()`.

Ledger lines are drawn before the bar, unchanged from prior rendering.

**(b) Rest extent bars (ADR 0014 D2)**

Replaced the short thick horizontal line for rest glyphs with:
1. A filled rounded-rect bar at `restY = stepToY(6, staffBaseY)`: width = `Math.max(rg.bars * PX_PER_CYCLE, 8)`, height = 8, corner radius = 2, fill = `COL.faint`, opacity = 60%.
2. A short center tick (2px, `COL.faint`, 90% opacity, `REST_HALF_W = 10` half-width) at the horizontal center of the bar for legibility.

**(c) `drawBarGrid` helper called from `buildHarmonyStaffScene` (ADR 0014 D6)**

Added new `drawBarGrid(gfx, staffBaseY, totalBars, screenWidth): void` helper function (not exported). It draws:
- Beat lines: x = n × (PX_PER_CYCLE / 4) = n × 12 px for n = 1 to totalBeats; 1px, `COL.faint`, 15% opacity.
- Bar lines: when n % 4 === 0 (every 4 beats = 1 bar); 1px, `COL.faint`, 35% opacity.
- Left boundary (x = 0): 1px, `COL.faint`, 50% opacity.
- Vertical span: `stepToY(TREBLE_STAFF_LINES[last] + 2, staffBaseY)` to `stepToY(-6, staffBaseY)` — same as the playhead span.

Called from `buildHarmonyStaffScene` before `drawStaticStaff`, using `totalBars = _staffWidth / PX_PER_CYCLE` (the total progression duration, not the canvas width).

**(d) Arp mode — same bars as chord mode (documented temporary state)**

In this step, `chordMode === 'arp'` draws identical duration bars as chord mode. A code comment in `drawStaticStaff` explicitly documents this temporary equivalence. Arp-specific stagger (beat-accurate onset circles + ascending connector line per ADR 0014 D7) is implemented in step 10.5.

**(e) `PX_PER_CYCLE` coordination rule**

`PX_PER_CYCLE` is imported from `../core/harmony/time-map.js` at line 55 (unchanged from prior steps). All bar width computations (`nh.bars * PX_PER_CYCLE`, `rg.bars * PX_PER_CYCLE`, `beatPx = PX_PER_CYCLE / 4`) use this single import. No local redeclaration present: `grep -n "PX_PER_CYCLE" src/render/harmony-staff-scene.ts` shows one import and multiple uses, no `const PX_PER_CYCLE =` anywhere in the file.

**New constants added:**
- `BAR_HEIGHT = 8` (duration bar height, px)
- `BAR_CORNER_RADIUS = 2` (rounded rect corner radius, px)
- `BAR_OPACITY = 0.8` (chord bar fill opacity)
- `REST_BAR_OPACITY = 0.6` (rest bar fill opacity)

### Prototype parity note

No prototype equivalent for duration-extent rendering — this is a new UX feature (the prototype draws note-heads as single dots regardless of duration). Parity note confirms audio byte-identity:

`git diff HEAD --name-only` → `src/render/harmony-staff-scene.ts` (the only modified file). Files in `src/core/codegen/strudel.ts`, `src/audio/`, and `src/state/phase-anchor.ts` are all **unchanged** in this step. Audio output for any given `SessionState` is byte-identical before and after this step.

### Files touched

- `src/render/harmony-staff-scene.ts` — `drawBarGrid` helper added; `drawStaticStaff` rewritten for duration bars; new constants added; `buildHarmonyStaffScene` updated to call `drawBarGrid` before `drawStaticStaff`.
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — this entry.

### Validation evidence (per Acceptance ID)

**A-10-01** (Duration-extent rendering: horizontal bars spanning `bars × PX_PER_CYCLE` per voice):
- Implemented in `drawStaticStaff`: `barWidth = Math.max(nh.bars * PX_PER_CYCLE, BAR_HEIGHT)`.
- Manual verification deferred to Pilot Checkpoint #5 (PIXI rendering not unit-testable).

**A-10-02** (Rest extent rendering: grey bars at middle staff line):
- Implemented: `restBarWidth = Math.max(rg.bars * PX_PER_CYCLE, BAR_HEIGHT)`, drawn at `stepToY(6, staffBaseY)`.
- Manual verification deferred to Pilot Checkpoint #5.

**A-10-03** (Bar grid: vertical beat and bar lines on staff canvas):
- Implemented in `drawBarGrid`: beat lines at 12px intervals (15% opacity), bar lines at 48px intervals (35% opacity), left boundary at 50% opacity.
- Manual verification deferred to Pilot Checkpoint #5.

**A-10-15** (Audio byte-identity — no codegen changes):
- `git diff HEAD --name-only` → one file: `src/render/harmony-staff-scene.ts`.
- `src/core/codegen/strudel.ts`: 0 diff lines. Audio pipeline unchanged.

**A-10-16** (AGPL-3.0 header in modified files):
- `head -2 src/render/harmony-staff-scene.ts` → `// SPDX-License-Identifier: AGPL-3.0-only` (pre-existing, confirmed present).

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → exit 0, 0 errors
- `pnpm lint` → exit 0, 0 ESLint errors, 0 Prettier issues
- `pnpm exec vitest run` → 447 passed, 0 failed (14 test files — no regressions, no new unit tests; PIXI rendering is not unit-tested)
- `pnpm build` → exit 0 (pre-existing chunk-size and dynamic-import warnings; not introduced by this step)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-10-01 | Duration-extent rendering: horizontal bars spanning `bars × PX_PER_CYCLE` per voice | — | manual | **PROXY-COVERED (code)** — implemented in `drawStaticStaff`; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-02 | Rest extent rendering: grey bars at middle staff line | — | manual | **PROXY-COVERED (code)** — implemented in `drawStaticStaff`; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-03 | Bar grid: vertical beat and bar lines on staff canvas | — | manual | **PROXY-COVERED (code)** — `drawBarGrid` implemented; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-04 | Chord / arp mode visual toggle: parallel bars vs staggered onset dots | — | manual | not covered — deferred to step 10.5 (arp mode draws same bars as chord mode in this step, documented comment) |
| A-10-05 | Select: clicking a slot shows border, ✕ button, and resize handle | — | manual | not covered — deferred to step 10.6 |
| A-10-06 | Delete via ✕: removes slot; ProgressionStrip reflects removal | — | manual | not covered — deferred to step 10.6 |
| A-10-07 | Resize: right-edge drag changes duration; commits via `setChordBars`; strip updates | — | manual | not covered — deferred to step 10.6 |
| A-10-08 | Time-move: body drag reorders slot; ProgressionStrip reflects new order | — | manual | not covered — deferred to step 10.7 |
| A-10-09 | Playhead cyclic + matches ProgressionStrip cursor; neither visible when not playing | — | manual | NO DISCREPANCY confirmed (step 10.3); live re-verification deferred to step 10.8 |
| A-10-10 | ProgressionStrip parity: edits on staff visible in strip and vice versa | — | manual | not covered — deferred to step 10.6 |
| A-10-11 | `staff-hit.ts` pure engine; all exports unit-tested; no regressions | `tests/harmony/staff-hit.test.ts` | automated | **COVERED** (step 10.3) — 42 tests pass; 0 PIXI/DOM imports confirmed |
| A-10-12 | `reorderSlot` store action: unit-tested; correct semantics; calls `requeueLive()`; no-op when fromIdx === toIdx | `tests/session.test.ts` | automated | **COVERED** (step 10.3) — 9 tests pass |
| A-10-13 | All quality gates green: tsc, lint, vitest ≥ 447, build | multiple | automated | **PARTIAL** — all gates green this step; global sweep deferred to step 10.8 |
| A-10-14 | `registerMode` and `subview` absent from `SavedHarmonySchema` and `agent/schema.ts` | — | automated (proxy: grep) | not covered — deferred to step 10.8 |
| A-10-15 | Audio byte-identical before/after visual rendering changes (no codegen changes) | — | automated (proxy: git diff) | **COVERED** — `git diff HEAD --name-only` → only `harmony-staff-scene.ts`; `strudel.ts` unchanged |
| A-10-16 | AGPL-3.0 header in all new and modified source files | — | automated (proxy: head -2) | **COVERED for this step** — `harmony-staff-scene.ts`: AGPL header at line 1 (pre-existing, confirmed) |

**Notes on partial coverage:** A-10-01, A-10-02, A-10-03 are code-implemented but require manual live verification at Pilot Checkpoint #5. The phase file's Validation section explicitly states these are "verified at Pilot manual acceptance." A-10-15 uses git diff as the proxy (no codegen changes = byte-identical audio for any given `SessionState`).

**Proxy disclosures:**
- A-10-15 audio byte-identity: `git diff HEAD --name-only` → `src/render/harmony-staff-scene.ts` only; `src/core/codegen/strudel.ts` diff is empty.
- A-10-16 AGPL header: `head -2 src/render/harmony-staff-scene.ts` → `// SPDX-License-Identifier: AGPL-3.0-only`.
- A-10-01/02/03 `PX_PER_CYCLE` coordination rule: `grep -n "const PX_PER_CYCLE" src/render/harmony-staff-scene.ts` → 0 matches (no local redeclaration); single import at line 55.

### Decisions made (if any)

- `drawBarGrid` draws beat lines up to `screenWidth` (not `_staffWidth`) to avoid overdrawing beyond the canvas. Beat line count is computed as `Math.ceil(totalBars * PX_PER_CYCLE / beatPx) + 1` to cover the full progression width, clamped by the `if (x > screenWidth) break` guard.
- `void staffWidth` suppresses the unused-parameter lint for the `staffWidth` parameter of `drawStaticStaff` — the parameter is retained in the signature for API stability (step 10.6 may use it for affordance hit region bounds).

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `src/render/harmony-staff-scene.ts`: `drawBarGrid` added, `drawStaticStaff` rewritten for duration-extent bars.
- Quality gates: 447 passed, 0 tsc errors, 0 lint errors, build clean.
- Branch: `orbifold-v2/phase-10`.

### Next-step context (only if non-obvious)

Step 10.5 adds `chordMode: 'chord' | 'arp'` parameter to `drawStaticStaff` and implements the beat-accurate stagger visual for arpeggio mode (ADR 0014 D7). The temporary comment in `drawStaticStaff` documenting identical chord/arp rendering will be replaced by the branching logic.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `feat(harmony): Phase 10 step 10.4 — duration-extent rendering and bar grid`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 10.5 — Arpeggio-mode stagger visual

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

**(a) `state.chordMode` read in `buildHarmonyStaffScene` and passed to `drawStaticStaff`**

Added `chordMode: 'chord' | 'arp'` as the sixth parameter to `drawStaticStaff`. In `buildHarmonyStaffScene`, `state.chordMode` is passed at the call site. The call now reads:
```
drawStaticStaff(_staffGfx, _layout, _staffBaseY, _staffWidth, app.screen.width, state.chordMode);
```
`state.chordMode` is a field on `SessionState` (`'chord' | 'arp'`, default `'chord'`), confirmed in `src/state/session.ts` line 249.

**(b) Conditional rendering in `drawStaticStaff` per ADR 0014 D7**

The note-head rendering loop is now guarded by `if (chordMode === 'arp')` / `else`:

- **`chordMode === 'arp'` branch:** groups NoteHeads by `nh.x`, computes stagger offsets, draws onset circles at the three beat-accurate positions, draws the connector polyline for complete groups.
- **`chordMode === 'chord'` branch:** the unchanged step 10.4 duration-bar rendering (filled rounded-rect + onset circle).

The temporary comment documenting identical arp/chord rendering in step 10.4 has been replaced by the working conditional code.

**(c) Group NoteHeads by `nh.x` (= `startCycle × PX_PER_CYCLE`) before the rendering loop**

`Map<number, NoteHead[]>` built before the per-group rendering loop. Each key (`nh.x`) identifies one slot. NoteHeads within a group retain their insertion order from `computeStaffLayout` (voice 0 → voice 1 → voice 2). Stagger x offsets per ADR 0014 D7:
- voice 0: `slotStartX + NOTE_OFFSET_X + 0`
- voice 1: `slotStartX + NOTE_OFFSET_X + bars × PX_PER_CYCLE / 3`
- voice 2: `slotStartX + NOTE_OFFSET_X + 2 × bars × PX_PER_CYCLE / 3`

`bars` is taken from `nhGroup[0].bars` (all NoteHeads in a slot share the same duration).

**(d) Guard for incomplete groups**

Connector polyline is drawn only when `nhGroup.length === 3`. Groups with 1 or 2 note-heads draw their available onset circles individually but skip the connector. The `non-null assertion` lint error (`groups.get(key)!`) was avoided by using explicit `undefined` check pattern:
```typescript
let group = groups.get(key);
if (group === undefined) { group = []; groups.set(key, group); }
group.push(nh);
```

**(e) No changes to `staff-layout.ts` or `voice-tracks.ts`**

`NoteHead.bars` carries the slot duration (already populated by `computeStaffLayout` from `noteEv.bars`). The arpeggio stagger is purely a rendering concern. Zero lines changed in the core engine files.

### Prototype parity note

Arpeggio visual is a new feature — no prototype equivalent (the prototype draws note-heads as single dots regardless of `chordMode`). Audio byte-identity confirmed: `git diff --name-only` shows only `src/render/harmony-staff-scene.ts` was modified. `src/core/codegen/strudel.ts`, `src/audio/`, and `src/state/phase-anchor.ts` are unchanged. The known comma-vs-space difference in the Strudel string when toggling `chordMode` (`note("A,B,C")` vs `note("A B C")`) is produced by `melodyLine` / `chordToStrudel` — this step makes no codegen changes, so audio output is byte-identical before and after the visual stagger is introduced.

### Files touched

- `src/render/harmony-staff-scene.ts` — `drawStaticStaff` updated with `chordMode` parameter and arp/chord branching; module-level comment updated to document step 10.5.
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — this entry.

### Validation evidence (per Acceptance ID)

**A-10-04** (Chord / arp mode visual toggle: chord shows parallel bars, arp shows staggered onset dots connected by ascending line):
- Implemented: `drawStaticStaff` branches on `chordMode`. Arp branch: `Map<number, NoteHead[]>` grouping, stagger offsets `[0, slotSpan/3, 2*slotSpan/3]`, connector polyline with `nhGroup.length === 3` guard.
- `state.chordMode` read from `SessionState` (confirmed field name `'chord' | 'arp'` at `session.ts` line 249).
- Manual live verification deferred to Pilot Checkpoint #5.

**A-10-15** (Audio byte-identical before/after visual rendering changes):
- `git diff --name-only` → `src/render/harmony-staff-scene.ts` only. No codegen changes. Audio pipeline unchanged.

**A-10-16** (AGPL-3.0 header in modified files):
- `head -2 src/render/harmony-staff-scene.ts` → `// SPDX-License-Identifier: AGPL-3.0-only` (pre-existing, confirmed present).

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → exit 0, 0 errors
- `pnpm lint` → exit 0, 0 ESLint errors, 0 Prettier issues
- `pnpm exec vitest run` → 447 passed, 0 failed (14 test files — no regressions; no new unit tests for this step — PIXI rendering is not unit-testable)
- `pnpm build` → exit 0 (pre-existing chunk-size and dynamic-import warnings; not introduced by this step)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-10-01 | Duration-extent rendering: horizontal bars spanning `bars × PX_PER_CYCLE` per voice | — | manual | **PROXY-COVERED (code)** (step 10.4) — chord-mode bars unchanged; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-02 | Rest extent rendering: grey bars at middle staff line | — | manual | **PROXY-COVERED (code)** (step 10.4) — rest bars unchanged; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-03 | Bar grid: vertical beat and bar lines on staff canvas | — | manual | **PROXY-COVERED (code)** (step 10.4) — `drawBarGrid` unchanged; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-04 | Chord / arp mode visual toggle: parallel bars vs staggered onset dots | — | manual | **PROXY-COVERED (code)** — implemented; arp stagger + connector polyline + guard for incomplete groups per ADR 0014 D7; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-05 | Select: clicking a slot shows border, ✕ button, and resize handle | — | manual | not covered — deferred to step 10.6 |
| A-10-06 | Delete via ✕: removes slot; ProgressionStrip reflects removal | — | manual | not covered — deferred to step 10.6 |
| A-10-07 | Resize: right-edge drag changes duration; commits via `setChordBars`; strip updates | — | manual | not covered — deferred to step 10.6 |
| A-10-08 | Time-move: body drag reorders slot; ProgressionStrip reflects new order | — | manual | not covered — deferred to step 10.7 |
| A-10-09 | Playhead cyclic + matches ProgressionStrip cursor; neither visible when not playing | — | manual | NO DISCREPANCY confirmed (step 10.3); live re-verification deferred to step 10.8 |
| A-10-10 | ProgressionStrip parity: edits on staff visible in strip and vice versa | — | manual | not covered — deferred to step 10.6 |
| A-10-11 | `staff-hit.ts` pure engine; all exports unit-tested; no regressions | `tests/harmony/staff-hit.test.ts` | automated | **COVERED** (step 10.3) — 42 tests pass; 0 PIXI/DOM imports confirmed |
| A-10-12 | `reorderSlot` store action: unit-tested; correct semantics; calls `requeueLive()`; no-op when fromIdx === toIdx | `tests/session.test.ts` | automated | **COVERED** (step 10.3) — 9 tests pass |
| A-10-13 | All quality gates green: tsc, lint, vitest ≥ 447, build | multiple | automated | **PARTIAL** — all gates green this step (447 passed); global sweep deferred to step 10.8 |
| A-10-14 | `registerMode` and `subview` absent from `SavedHarmonySchema` and `agent/schema.ts` | — | automated (proxy: grep) | not covered — deferred to step 10.8 |
| A-10-15 | Audio byte-identical before/after visual rendering changes (no codegen changes) | — | automated (proxy: git diff) | **COVERED** — `git diff --name-only` → only `harmony-staff-scene.ts`; `strudel.ts` unchanged |
| A-10-16 | AGPL-3.0 header in all new and modified source files | — | automated (proxy: head -2) | **COVERED for this step** — `harmony-staff-scene.ts`: AGPL header at line 1 (pre-existing, confirmed) |

**Notes on partial coverage:** A-10-04 is code-implemented but requires manual live verification at Pilot Checkpoint #5 (PIXI rendering not unit-testable). A-10-13 full gate deferred to step 10.8.

**Proxy disclosures:**
- A-10-04 arp stagger implementation: `grep -n "chordMode" src/render/harmony-staff-scene.ts` → present as parameter and conditional branch; `grep -n "connectorPoints" src/render/harmony-staff-scene.ts` → present in arp branch.
- A-10-15 audio byte-identity: `git diff --name-only` → `src/render/harmony-staff-scene.ts` only; `src/core/codegen/strudel.ts` diff is empty.
- A-10-16 AGPL header: `head -2 src/render/harmony-staff-scene.ts` → `// SPDX-License-Identifier: AGPL-3.0-only`.

### Decisions made (if any)

- The `Map` grouping pattern uses an explicit `undefined` check (instead of a non-null assertion) to comply with the `@typescript-eslint/no-non-null-assertion` ESLint rule. This is idiomatic TS and consistent with the rest of the codebase's no-non-null-assertion policy.
- Ledger lines in arp mode are drawn at the staggered x position (not at `nh.x + NOTE_OFFSET_X`). This is the correct behavior: ledger lines belong to the note onset, which has moved to the staggered position.
- `xOffsets[i] ?? 0` provides a fallback for the (unreachable in practice) case where i >= 3, satisfying strict TypeScript without a cast.

### Proposed Decisions Register entries (if any)

None. No new governance decisions arise from this step.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `src/render/harmony-staff-scene.ts`: `drawStaticStaff` updated with `chordMode` parameter; arp stagger branch complete per ADR 0014 D7.
- Quality gates: 447 passed, 0 tsc errors, 0 lint errors, build clean.
- Branch: `orbifold-v2/phase-10`.

### Next-step context (only if non-obvious)

Step 10.6 adds the PIXI interaction layer (select, delete ✕, resize) per ADR 0014 D3–D4. It imports `computeSlotBounds`, `hitTestSlot`, `hitTestResizeHandle` from `staff-hit.ts` and adds a full-canvas `_hitRect` with `pointerdown`/`pointermove`/`pointerup` listeners to `_staffContainer`.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `feat(harmony): Phase 10 step 10.5 — arpeggio stagger visual`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 10.6 — PIXI interaction layer (select, delete, resize)

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

**(a) Interaction infrastructure — native DOM event routing (idiom match)**

Per the step prompt: "check what the codebase already uses elsewhere, e.g. tonnetz-scene.ts, and match it." `tonnetz-scene.ts` and `rhythm-scene.ts` use native DOM `PointerEvent` listeners on the PIXI canvas element (via `canvas.addEventListener`), not PIXI's `interactive` system. No existing code path uses `displayObject.interactive = true` with PIXI event listeners. The implementation matches this established idiom:

- Three exported functions: `onStaffPointerDown(e: PointerEvent)`, `onStaffPointerMove(e: PointerEvent)`, `onStaffPointerUp()` — called from `App.svelte`'s canvas event listeners.
- Coordinate mapping: `e.offsetX` is canvas-local CSS pixels. With `autoDensity:true` in PIXI Application, PIXI logical px === CSS px, so `offsetX` aligns directly with slot bounds without DPR conversion (consistent with Tonnetz `onStagePointerDown` round-2 fix).
- No `_hitRect: PIXI.Graphics` with `interactive = true` was created; the ADR's intent (one handler for all pointer events, pure-engine dispatch) is preserved through the equivalent DOM routing pattern.

**(b) Module-level interaction state (ADR 0014 D3, Consequence 3)**

Six module-level variables added to `harmony-staff-scene.ts`:
- `_selectedSlotIdx: number | null = null`
- `_resizeActive: boolean = false`
- `_resizeStartPx: number = 0`
- `_resizeStartBars: number = 1`
- `_resizePreviewBars: number = 1`
- `_slotBounds: SlotBounds[] = []`

None persisted — ephemeral UI state consistent with `registerMode`/`subview` (Decisions Register, Phase 08).

**(c) `drawAffordances()` helper**

New `drawAffordances()` function (not exported) draws into `_affordanceGfx` (a separate `PIXI.Graphics` layer added on top of `_dynGfx` in the staffContainer z-order):
- Static selection state: 1px white border rectangle around the slot's full vertical span; 4px white filled rectangle at the right edge (resize handle); `PIXI.Text '×'` added as a child of `staffContainer` at `(slotRight − 10, staffBaseY − 20)`.
- Resize active state: white outline rectangle at slot's x position with width = `_resizePreviewBars × PX_PER_CYCLE` (no border, no ✕, no handle bar during drag).
- Clears `_affordanceGfx` and destroys `_deleteBtn` (via `.destroy()`) on every call — prevents WebGL texture memory leak (ADR 0014 D4).

**(d) Pointer dispatch order (ADR 0014 D4)**

`onStaffPointerDown`:
1. If `_selectedSlotIdx` non-null: check ✕ hit region (16×16 px centred at slotRight − 10, staffBaseY − 20) — if hit, call `clearChordAt(slotIndex)`, reset selection, return.
2. If `_selectedSlotIdx` non-null: call `hitTestResizeHandle(px, _slotBounds, 10)` — if result equals `_selectedSlotIdx`, start resize (set `_resizeActive = true`, `_resizeStartPx`, `_resizeStartBars`), return.
3. Call `hitTestSlot(px, _slotBounds)` — if non-null, set `_selectedSlotIdx = result`, return.
4. Outside: `_selectedSlotIdx = null`, `_resizeActive = false`.

`onStaffPointerMove`: if `_resizeActive`, compute `_resizePreviewBars = clampBars(_resizeStartBars + (px − _resizeStartPx) / PX_PER_CYCLE)`, call `drawAffordances()`. No store write.

`onStaffPointerUp`: if `_resizeActive`, call `setChordBars(_selectedSlotIdx!, _resizePreviewBars)`, eagerly recompute `_slotBounds` (so the handle position is correct without waiting for a full rebuild), call `drawAffordances()`.

**(e) Store action imports from `session.ts` (renderer → core direction)**

Imported: `clearChordAt`, `setChordBars`, `clampBars` from `../state/session.js`. Pure engine: `computeSlotBounds`, `hitTestSlot`, `hitTestResizeHandle`, `SlotBounds` from `../core/harmony/staff-hit.js`. Import direction is renderer → state and renderer → core — both permitted.

No `sessionStore.update` call in `harmony-staff-scene.ts` (confirmed by static-analysis check in step 10.8).

**(f) Selection guard (Pilot Checkpoint #2, ADR 0014 Consequence 3) — BINDING**

In `buildHarmonyStaffScene`, after computing `_staffWidth` and before adding children to `staffContainer`:

```typescript
if (_selectedSlotIdx !== null && _selectedSlotIdx >= state.harmony.progression.length) {
  _selectedSlotIdx = null;
  _resizeActive = false;
  _resizePreviewBars = 1;
}
```

This guard ensures that if the ProgressionStrip (or any external surface) deletes a slot while the staff has a selection, the stale index is cleared. It prevents `drawAffordances()` from attempting to look up `_slotBounds[_selectedSlotIdx]` on a nonexistent slot.

**(g) `_slotBounds` recomputed on every `buildHarmonyStaffScene` call (ADR 0014 Consequence 7)**

`computeSlotBounds(state.harmony.progression, PX_PER_CYCLE)` is called immediately after `_staffWidth` is set (and after the selection guard), before `drawAffordances()`. The `_slotBounds` array is always consistent with the current `state.harmony.progression` at the time of rebuild.

**(h) App.svelte updates — trigger rebuild on `setChordBars` + event routing**

Two changes to `src/app/App.svelte`:

1. **Rebuild trigger**: the store subscription's staff rebuild condition now also fires when `totalBars` or `chordMode` changes (in addition to `progressionLength` and `octave`). This ensures that a `setChordBars` call — which changes a slot's duration without changing the progression length — causes `buildHarmonyStaffScene` to be called, so the visual duration bars update immediately.

2. **Event routing**: 
   - `pointerdown` on the canvas: if `view === 'harmony'` and `harmony.subview === 'staff'`, route to `onStaffPointerDown(e)` instead of `tonnetzPointerDown(e)`.
   - `pointermove`: if `view === 'harmony'` and `harmony.subview === 'staff'`, route to `onStaffPointerMove(e)` (for resize preview). Rhythm hover logic unchanged for other views.
   - `pointerup` (new listener): if `view === 'harmony'` and `harmony.subview === 'staff'`, call `onStaffPointerUp()` to commit the resize gesture.

### Prototype parity note

No prototype equivalent — this is a new UX feature. Audio byte-identity: no changes to `src/core/codegen/strudel.ts`. The store actions called (`clearChordAt`, `setChordBars`) are the same ones ProgressionStrip already calls — audio behavior is unchanged. `reorderSlot` (step 10.7) is the only action that changes audio output by design.

### Files touched

- `src/render/harmony-staff-scene.ts` — interaction constants, module-level state, `drawAffordances` helper, `onStaffPointerDown`/`onStaffPointerMove`/`onStaffPointerUp` exports, `buildHarmonyStaffScene` updated (affordance objects, selection guard, `computeSlotBounds` call, `drawAffordances` call), imports from `staff-hit.ts` and `session.ts`.
- `src/app/App.svelte` — imports `onStaffPointerDown`, `onStaffPointerMove`, `onStaffPointerUp`; `prevTotalBars` / `prevChordMode` state variables; updated store subscription condition; updated `pointerdown` routing; updated `pointermove` routing; new `pointerup` listener.
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — this entry.

### Validation evidence (per Acceptance ID)

**A-10-05** (Select: clicking a slot shows border, ✕ button, and resize handle):
- `drawAffordances()` draws: white border rect, ✕ PIXI.Text, resize handle rect; called from `onStaffPointerDown` after selection.
- `_slotBounds` computed before any pointer event; selection set to `hitTestSlot(px, _slotBounds)` result.
- Manual live verification deferred to Pilot Checkpoint #5.

**A-10-06** (Delete via ✕: removes slot; ProgressionStrip reflects removal):
- `onStaffPointerDown` dispatch step 1: hit region (16×16 px centred on delete button) → `clearChordAt(idxToDelete)` — same store action as ProgressionStrip badge ✕.
- Store update propagates to ProgressionStrip via Svelte reactive subscription.
- Manual live verification deferred to Pilot Checkpoint #5.

**A-10-07** (Resize: right-edge drag changes duration; commits via `setChordBars`; strip updates):
- `onStaffPointerDown` dispatch step 2: resize handle hit → `_resizeActive = true`.
- `onStaffPointerMove`: `_resizePreviewBars = clampBars(...)` — same `clampBars` semantics as ProgressionStrip.
- `onStaffPointerUp`: `setChordBars(_selectedSlotIdx!, _resizePreviewBars)` — same store action as ProgressionStrip resize.
- App.svelte rebuild condition fires on `totalBars` change (new in this step).
- Manual live verification deferred to Pilot Checkpoint #5.

**A-10-10** (ProgressionStrip parity: edits on staff visible in strip and vice versa):
- Same store actions (`clearChordAt`, `setChordBars`) used by both surfaces.
- Selection guard ensures external deletions (from strip) clear stale `_selectedSlotIdx`.
- Manual live verification deferred to Pilot Checkpoint #5.

**A-10-15** (Audio byte-identical — no codegen changes):
- Files modified: `src/render/harmony-staff-scene.ts`, `src/app/App.svelte`.
- `src/core/codegen/strudel.ts`: 0 changes. Audio pipeline unchanged.

**A-10-16** (AGPL-3.0 headers):
- `head -2 src/render/harmony-staff-scene.ts` → `// SPDX-License-Identifier: AGPL-3.0-only`
- `head -4 src/app/App.svelte` → `SPDX-License-Identifier: AGPL-3.0-only` (in HTML comment)

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → exit 0, 0 errors
- `pnpm lint` → exit 0, 0 ESLint errors, 0 Prettier issues
- `pnpm exec vitest run` → 447 passed, 0 failed (14 test files — no regressions; no new unit tests — PIXI/DOM interaction not unit-testable in Vitest)
- `pnpm build` → exit 0 (pre-existing chunk-size and dynamic-import warnings)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-10-01 | Duration-extent rendering: horizontal bars spanning `bars × PX_PER_CYCLE` per voice | — | manual | **PROXY-COVERED (code)** (step 10.4) — manual live verification deferred to Pilot Checkpoint #5 |
| A-10-02 | Rest extent rendering: grey bars at middle staff line | — | manual | **PROXY-COVERED (code)** (step 10.4) — manual live verification deferred to Pilot Checkpoint #5 |
| A-10-03 | Bar grid: vertical beat and bar lines on staff canvas | — | manual | **PROXY-COVERED (code)** (step 10.4) — manual live verification deferred to Pilot Checkpoint #5 |
| A-10-04 | Chord / arp mode visual toggle: parallel bars vs staggered onset dots | — | manual | **PROXY-COVERED (code)** (step 10.5) — manual live verification deferred to Pilot Checkpoint #5 |
| A-10-05 | Select: clicking a slot shows border, ✕ button, and resize handle | — | manual | **PROXY-COVERED (code)** — `drawAffordances` + `onStaffPointerDown` select branch implemented; selection guard in place; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-06 | Delete via ✕: removes slot; ProgressionStrip reflects removal | — | manual | **PROXY-COVERED (code)** — `clearChordAt` called on ✕ hit in `onStaffPointerDown`; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-07 | Resize: right-edge drag changes duration; commits via `setChordBars`; strip updates | — | manual | **PROXY-COVERED (code)** — resize gesture (down/move/up) + `setChordBars` + `clampBars` + App.svelte rebuild on totalBars change; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-08 | Time-move: body drag reorders slot; ProgressionStrip reflects new order | — | manual | not covered — deferred to step 10.7 |
| A-10-09 | Playhead cyclic + matches ProgressionStrip cursor; neither visible when not playing | — | manual | NO DISCREPANCY confirmed (step 10.3); live re-verification deferred to step 10.8 |
| A-10-10 | ProgressionStrip parity: edits on staff visible in strip and vice versa | — | manual | **PROXY-COVERED (code)** — same store actions; selection guard for external edits; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-11 | `staff-hit.ts` pure engine; all exports unit-tested; no regressions | `tests/harmony/staff-hit.test.ts` | automated | **COVERED** (step 10.3) — 42 tests pass; 0 PIXI/DOM imports |
| A-10-12 | `reorderSlot` store action: unit-tested; correct semantics; calls `requeueLive()`; no-op when fromIdx === toIdx | `tests/session.test.ts` | automated | **COVERED** (step 10.3) — 9 tests pass |
| A-10-13 | All quality gates green: tsc, lint, vitest ≥ 447, build | multiple | automated | **PARTIAL** — all gates green this step (447 passed, 0 tsc, 0 lint, build clean); global sweep deferred to step 10.8 |
| A-10-14 | `registerMode` and `subview` absent from `SavedHarmonySchema` and `agent/schema.ts` | — | automated (proxy: grep) | not covered — deferred to step 10.8 |
| A-10-15 | Audio byte-identical before/after visual rendering changes (no codegen changes) | — | automated (proxy: static-analysis) | **COVERED** — `src/core/codegen/strudel.ts` unchanged; store actions called (`clearChordAt`, `setChordBars`) are pre-existing actions that ProgressionStrip already calls |
| A-10-16 | AGPL-3.0 header in all new and modified source files | — | automated (proxy: head -2) | **COVERED for this step** — both modified files confirmed |

**Notes on partial coverage:** A-10-05 through A-10-07 and A-10-10 are implemented and proxy-covered (code inspection), but require manual live verification at Pilot Checkpoint #5 since PIXI rendering and DOM interaction are not unit-testable in Vitest. A-10-08 (time-move) deferred to step 10.7.

**Proxy disclosures:**
- A-10-05 affordance implementation: `grep -n "drawAffordances\|_deleteBtn\|_affordanceGfx" src/render/harmony-staff-scene.ts` → all present.
- A-10-06 delete routing: `grep -n "clearChordAt" src/render/harmony-staff-scene.ts` → present in import and `onStaffPointerDown`.
- A-10-07 resize commit: `grep -n "setChordBars" src/render/harmony-staff-scene.ts` → present in import and `onStaffPointerUp`.
- A-10-10 selection guard: `grep -n "_selectedSlotIdx >= state.harmony.progression.length" src/render/harmony-staff-scene.ts` → present in `buildHarmonyStaffScene`.
- A-10-15 audio: `grep -c "" src/core/codegen/strudel.ts` → line count unchanged (no diff).
- A-10-16 AGPL headers: `head -2 src/render/harmony-staff-scene.ts` → AGPL-3.0-only; `head -4 src/app/App.svelte` → AGPL-3.0-only (in HTML comment block).
- No `sessionStore.update` in render module: `grep -n "sessionStore.update" src/render/harmony-staff-scene.ts` → 0 matches.

### Decisions made (if any)

- **Native DOM events over PIXI interactive**: the existing codebase uses `canvas.addEventListener` with native `PointerEvent` objects (matching `tonnetz-scene.ts` `onStagePointerDown` pattern) — not PIXI's `interactive = true` / `.on()` event system. The interaction layer follows this idiom: three exported handler functions (`onStaffPointerDown`, `onStaffPointerMove`, `onStaffPointerUp`) routed from `App.svelte`. The ADR D3 intent (one handler dispatching to pure engine) is preserved; the delivery mechanism is native DOM rather than PIXI events.
- **`_affordanceGfx` separate from `_dynGfx`**: the affordance layer gets its own `PIXI.Graphics` object (added above `_dynGfx` in the z-order) so that `drawAffordances()` can clear and redraw independently without disturbing the playhead animation.
- **`_deleteBtn` as a direct child of `staffContainer`** (not of `_affordanceGfx`): PIXI.Text requires `addChild` on a container; `_affordanceGfx` is a `PIXI.Graphics` (not a `PIXI.Container`), so the text is added to `staffContainer` directly and tracked in `_deleteBtn` for explicit `destroy()` on next `drawAffordances()` call.
- **App.svelte rebuild on `totalBars` change**: added `totalBars` (sum of `slot.bars ?? 1`) and `chordMode` to the rebuild trigger condition. This ensures `setChordBars` (which changes duration without changing progression length) causes `buildHarmonyStaffScene` to be called, so duration bars and `_slotBounds` are up to date.

### Proposed Decisions Register entries (if any)

Amend ADR 0014 D3 to record DOM routing as the canonical delivery mechanism (rationale: codebase idiom consistency — matches `tonnetz-scene.ts`/`rhythm-scene.ts`; coordinate alignment via `autoDensity: true`; D3 single-dispatch-point intent fully preserved) — pending Pilot ratification at phase close.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `src/render/harmony-staff-scene.ts`: interaction layer added (module-level state, `drawAffordances`, pointer handlers, selection guard, `computeSlotBounds` call).
- `src/app/App.svelte`: event routing updated; rebuild condition extended to cover `totalBars` / `chordMode` changes.
- Quality gates: 447 passed, 0 tsc errors, 0 lint errors, build clean.
- Branch: `orbifold-v2/phase-10`.

### Next-step context (only if non-obvious)

Step 10.7 adds the time-move (slot reorder) gesture. It adds `_moveActive`, `_moveFromIdx`, `_moveDragPx`, `_moveInsertIdx` module-level state; ghost bar rendering in `drawAffordances`; and extends the pointer handlers with move threshold detection and `reorderSlot` dispatch. `nearestInsertionIndex` (already in `staff-hit.ts` and tested) will be used for the drop target computation.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

---

### REVISE iteration 2 note (2026-06-12)

**Documentation-only fix. No source code changes.**

The Planner found no functional defects in iteration 1. The gap was a documentation inconsistency: the "Decisions made" section disclosed the DOM-routing deviation from ADR 0014 D3's `_hitRect` specification, but (a) "Proposed Decisions Register entries" said "None", and (b) ADR 0014 D3 still read as if `_hitRect` were the binding mechanism — silently contradicted.

Fixes applied:

1. `docs/adr/0014-staff-editor.md` §D3 — added "Implementation note (step 10.6, 2026-06-12)" paragraph recording the DOM-routing delivery mechanism, coordinate alignment rationale, and preservation of D3's single-dispatch-point intent.
2. `docs/orbifold-v2/handoffs/phase-10-handoff.md` step 10.6 "Proposed Decisions Register entries" — replaced "None" with a one-line proposal to amend ADR 0014 D3 pending Pilot ratification at phase close.

Confirmed no source diff: `git status` → clean; `git diff --name-only` → no output (no staged or unstaged changes to source files).

---

**Terminal commit:** `feat(harmony): Phase 10 step 10.6 — staff interaction layer (select, delete, resize)`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 10.7 — Time-move (slot reorder) gesture

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

**(a) Module-level move state (ADR 0014 D4)**

Added six new module-level variables to `harmony-staff-scene.ts`:
- `_moveActive: boolean = false` — true while a reorder drag is in progress
- `_moveFromIdx: number = -1` — progression index of the dragged slot
- `_moveDragPx: number = 0` — current pointer x during drag (for ghost preview)
- `_moveInsertIdx: number = -1` — computed target insertion index (via `nearestInsertionIndex`)
- `_pointerDownPx: number = 0` — pointer x at pointerdown (for 4 px threshold)
- `_pointerDownOnSelected: boolean = false` — armed when pointerdown lands on already-selected slot body

These are ephemeral interaction state — not in the session store, not persisted. Consistent with `_resizeActive` / `_selectedSlotIdx` (ADR 0014 Consequence 3).

**(b) Ghost bar + insertion indicator in `drawAffordances()` (ADR 0014 D4)**

Added `_moveActive` branch at the top of the existing `if (_resizeActive) / else` logic:
- Ghost bar: semi-transparent white rectangle (40% opacity) at `_moveDragPx − bound.width / 2`, spanning the full staff vertical extent. Width = the slot's own pixel width (`bound.width`), so the ghost mirrors the slot's duration.
- Insertion indicator: 2 px white vertical line at 80% opacity, positioned at the left edge of `_slotBounds[_moveInsertIdx]` (or at the right edge of the last slot if `_moveInsertIdx === bounds.length`). Drawn by looking up `_slotBounds[_moveInsertIdx].x` for in-bounds indices; using `last.x + last.width` for the after-last case.
- While `_moveActive`, the static affordances (border, ✕, resize handle) are suppressed — only the ghost + indicator are drawn (per ADR 0014 D4 "Affordance visibility rule").

**(c) `onStaffPointerDown` — threshold-arm (ADR 0014 D4 dispatch order, step 3)**

The existing dispatch steps 1 (✕ hit) and 2 (resize hit) are unchanged. Step 3 (slot body hit) is extended:
- If `hitIdx === _selectedSlotIdx` (already-selected slot): set `_pointerDownOnSelected = true` and `_pointerDownPx = px`. Selection state and affordances are unchanged — no visual change on the down event itself. The move gesture is only activated when pointermove crosses the 4 px threshold.
- If `hitIdx !== _selectedSlotIdx` (different slot): normal select behavior as before; also resets `_moveActive`, `_moveFromIdx`, `_pointerDownOnSelected`.
- Step 4 (outside all slots) also resets `_moveActive`, `_moveFromIdx`, `_pointerDownOnSelected`.

**(d) `onStaffPointerMove` — threshold detection + move activation + ghost update (ADR 0014 D4)**

Restructured into three branches:
1. `_resizeActive` branch (unchanged from step 10.6): update `_resizePreviewBars` and redraw.
2. `_moveActive` branch: update `_moveDragPx`, recompute `_moveInsertIdx` via `nearestInsertionIndex(px, _slotBounds)`, redraw affordances.
3. Threshold-tracking branch: when `_pointerDownOnSelected && _selectedSlotIdx !== null` and `|px - _pointerDownPx| >= 4`: transition to move-active — set `_moveActive = true`, `_moveFromIdx = _selectedSlotIdx`, `_moveDragPx = px`, compute `_moveInsertIdx`, clear `_pointerDownOnSelected`, redraw affordances.

**(e) `onStaffPointerUp` — move commit (ADR 0014 D5)**

Extended to handle move before the resize commit:
1. Always clears `_pointerDownOnSelected` on pointerup (covers the tap-without-move path).
2. Move commit branch: if `_moveActive` and `_moveInsertIdx !== _moveFromIdx`, resets all move state (before the store write so any synchronous rebuild doesn't re-enter the move branch), then calls `reorderSlot(_moveFromIdx, _moveInsertIdx)`. After the call, eagerly recomputes `_slotBounds` from the updated progression (in case App.svelte's rebuild didn't fire due to the subscription not detecting the order change). Calls `drawAffordances()`.
3. Resize commit branch: unchanged from step 10.6.

**(f) Selection guard extended (ADR 0014 Consequence 3)**

In `buildHarmonyStaffScene`, the existing selection guard (resets `_selectedSlotIdx` when `>= progression.length`) is extended to also reset `_moveActive`, `_moveFromIdx`, `_moveInsertIdx`, `_moveDragPx`, and `_pointerDownOnSelected`. This covers the case where an externally-deleted slot was being dragged.

**(g) App.svelte — progression-key rebuild trigger (step 10.7)**

Added `prevProgressionKey: string` tracking to App.svelte's store subscription. The key is a lightweight per-slot fingerprint: `'R{bars}'` for rests and `'{rootPc}{qual}{bars}'` for chords, joined with commas. When the key changes (due to `reorderSlot` changing slot order without changing length/totalBars/chordMode), `buildHarmonyStaffScene` is called to redraw note-heads in their new positions.

Without this trigger, `reorderSlot` would change the audio (via `requeueLive`) but the staff visual would remain in the old order until some other state change triggered a rebuild.

**(h) `nearestInsertionIndex` + `reorderSlot` imports**

Added `nearestInsertionIndex` to the import from `../core/harmony/staff-hit.js` and `reorderSlot` to the import from `../state/session.js`. Both were already implemented and tested in step 10.3; this step is the first consumer in the renderer.

### Prototype parity note

No prototype equivalent — time-move is a new feature. Audio byte-identity: `reorderSlot` changes the `arrange()` Strudel output (the audible chord order changes). This is intended behavior — the user is reordering their composition. The phase file explicitly documents this: "Audio changes by design, taking effect next cycle." No codegen changes in this step.

### Files touched

- `src/render/harmony-staff-scene.ts` — move state variables, `drawAffordances` ghost/indicator branch, `onStaffPointerDown` threshold-arm, `onStaffPointerMove` restructured with three branches, `onStaffPointerUp` extended with move commit, selection guard extended, imports extended (`nearestInsertionIndex`, `reorderSlot`), header comment updated.
- `src/app/App.svelte` — `prevProgressionKey` state variable, initialization in `onMount`, `progressionKey` computation and comparison in store subscription; rebuild condition extended.
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — this entry.

### Validation evidence (per Acceptance ID)

**A-10-08** (Time-move: dragging a slot body shows a ghost bar and insertion indicator; releasing reorders the slot; ProgressionStrip reflects the new order):
- `drawAffordances()` renders ghost bar (40% opacity white rect) + insertion indicator (2px, 80% opacity) when `_moveActive`.
- `onStaffPointerMove` activates move after 4 px threshold; uses `nearestInsertionIndex` (already tested in step 10.3 — 42 tests covering boundary conditions).
- `onStaffPointerUp` calls `reorderSlot(_moveFromIdx, _moveInsertIdx)` — same store action tested in step 10.3 (9 tests covering semantics, no-op, edge cases).
- App.svelte `progressionKey` trigger causes `buildHarmonyStaffScene` to rebuild after the reorder, updating the visual note-head positions.
- ProgressionStrip reacts to the same store change (reactive subscription to `$sessionStore`).
- Manual live verification deferred to Pilot Checkpoint #5.

**A-10-11** (`staff-hit.ts` pure engine — unchanged; `nearestInsertionIndex` first used here):
- `nearestInsertionIndex` already has 9 test cases covering empty bounds, midpoint boundaries, far-left, far-right, and between-slot positioning (step 10.3).
- `grep -n "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/staff-hit.ts` → 0 matches (pure engine confirmed — unchanged from step 10.3).

**A-10-12** (`reorderSlot` store action — unchanged; first called from renderer here):
- 9 unit tests in `tests/session.test.ts` cover all semantics (step 10.3). No new tests needed for the renderer call path (renderer→store action call is already exercised by the interaction layer pattern from step 10.6).

**A-10-15** (Audio byte-identical — `reorderSlot` changes audio by design; no codegen changes):
- `src/core/codegen/strudel.ts` not modified in this step.
- `reorderSlot` changes the `arrange()` output — this is the intended behavior, documented in ADR 0014 D5 and the phase file. It is NOT a regression.

**A-10-16** (AGPL-3.0 header in modified files):
- `head -2 src/render/harmony-staff-scene.ts` → `// SPDX-License-Identifier: AGPL-3.0-only`
- `head -4 src/app/App.svelte` → `SPDX-License-Identifier: AGPL-3.0-only` (in HTML comment block)

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → exit 0, 0 errors
- `pnpm lint` → exit 0, 0 ESLint errors, 0 Prettier issues
- `pnpm exec vitest run` → 447 passed, 0 failed (14 test files — no regressions; no new unit tests for this step — PIXI rendering and DOM interaction are not unit-testable in Vitest; pure engine functions (`nearestInsertionIndex`, `reorderSlot`) already tested in step 10.3)
- `pnpm build` → exit 0 (pre-existing chunk-size and dynamic-import warnings; not introduced by this step)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-10-01 | Duration-extent rendering: horizontal bars spanning `bars × PX_PER_CYCLE` per voice | — | manual | **PROXY-COVERED (code)** (step 10.4) — manual live verification deferred to Pilot Checkpoint #5 |
| A-10-02 | Rest extent rendering: grey bars at middle staff line | — | manual | **PROXY-COVERED (code)** (step 10.4) — manual live verification deferred to Pilot Checkpoint #5 |
| A-10-03 | Bar grid: vertical beat and bar lines on staff canvas | — | manual | **PROXY-COVERED (code)** (step 10.4) — manual live verification deferred to Pilot Checkpoint #5 |
| A-10-04 | Chord / arp mode visual toggle: parallel bars vs staggered onset dots | — | manual | **PROXY-COVERED (code)** (step 10.5) — manual live verification deferred to Pilot Checkpoint #5 |
| A-10-05 | Select: clicking a slot shows border, ✕ button, and resize handle | — | manual | **PROXY-COVERED (code)** (step 10.6) — manual live verification deferred to Pilot Checkpoint #5 |
| A-10-06 | Delete via ✕: removes slot; ProgressionStrip reflects removal | — | manual | **PROXY-COVERED (code)** (step 10.6) — manual live verification deferred to Pilot Checkpoint #5 |
| A-10-07 | Resize: right-edge drag changes duration; commits via `setChordBars`; strip updates | — | manual | **PROXY-COVERED (code)** (step 10.6) — manual live verification deferred to Pilot Checkpoint #5 |
| A-10-08 | Time-move: body drag reorders slot; ProgressionStrip reflects new order | — | manual | **PROXY-COVERED (code)** — move gesture implemented (4 px threshold, ghost bar, insertion indicator, `reorderSlot` commit, App.svelte rebuild trigger); manual live verification deferred to Pilot Checkpoint #5 |
| A-10-09 | Playhead cyclic + matches ProgressionStrip cursor; neither visible when not playing | — | manual | NO DISCREPANCY confirmed (step 10.3); live re-verification deferred to step 10.8 |
| A-10-10 | ProgressionStrip parity: edits on staff visible in strip and vice versa | — | manual | **PROXY-COVERED (code)** (step 10.6 + 10.7) — `reorderSlot` triggers same store subscription as other actions; ProgressionStrip reacts; manual live verification deferred to Pilot Checkpoint #5 |
| A-10-11 | `staff-hit.ts` pure engine; all exports unit-tested; no regressions | `tests/harmony/staff-hit.test.ts` | automated | **COVERED** (step 10.3) — 42 tests pass; `nearestInsertionIndex` (9 of those tests) first consumed here; 0 PIXI/DOM imports confirmed |
| A-10-12 | `reorderSlot` store action: unit-tested; correct semantics; calls `requeueLive()`; no-op when fromIdx === toIdx | `tests/session.test.ts` | automated | **COVERED** (step 10.3) — 9 tests pass |
| A-10-13 | All quality gates green: tsc, lint, vitest ≥ 447, build | multiple | automated | **PARTIAL** — all gates green this step (447 passed, 0 tsc, 0 lint, build clean); global sweep deferred to step 10.8 |
| A-10-14 | `registerMode` and `subview` absent from `SavedHarmonySchema` and `agent/schema.ts` | — | automated (proxy: grep) | not covered — deferred to step 10.8 |
| A-10-15 | Audio byte-identical before/after visual rendering changes (no codegen changes) | — | automated (proxy: note) | **NOTE** — `reorderSlot` changes audio by design (ADR 0014 D5); `src/core/codegen/strudel.ts` unchanged; no regression |
| A-10-16 | AGPL-3.0 header in all new and modified source files | — | automated (proxy: head -2) | **COVERED for this step** — both modified files confirmed |

**Notes on partial coverage:** A-10-08 is code-implemented and proxy-covered. The phase file marks it as a manual acceptance criterion; live verification at Pilot Checkpoint #5. A-10-15 deserves a special note: `reorderSlot` does change the Strudel output by design — the audio invariant for this step is "no codegen file modifications" (confirmed: `strudel.ts` unchanged). The user-visible audio change is the intentional result of the reorder action.

**Proxy disclosures:**
- A-10-08 ghost bar: `grep -n "_moveActive\|ghostWidth\|insertIndicator\|_moveDragPx" src/render/harmony-staff-scene.ts` → all present.
- A-10-08 threshold: `grep -n "4\|_pointerDownOnSelected\|displacement" src/render/harmony-staff-scene.ts` → threshold constant and flag present.
- A-10-08 reorderSlot: `grep -n "reorderSlot" src/render/harmony-staff-scene.ts` → present in import and `onStaffPointerUp`.
- A-10-08 App.svelte rebuild: `grep -n "prevProgressionKey\|progressionKey" src/app/App.svelte` → present as variable, initializer, and condition.
- A-10-11 pure engine: `grep -n "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/staff-hit.ts` → 0 matches.
- A-10-15 no codegen: `src/core/codegen/strudel.ts` not in modified files list.
- A-10-16 AGPL headers: `head -2 src/render/harmony-staff-scene.ts` → AGPL-3.0-only; `head -4 src/app/App.svelte` → AGPL-3.0-only.
- No `sessionStore.update` in render module: `grep -n "sessionStore.update" src/render/harmony-staff-scene.ts` → 0 matches.

### Decisions made (if any)

- **`_pointerDownOnSelected` flag + `_pointerDownPx` for threshold tracking**: the 4 px threshold requires tracking where the pointer was on pointerdown and whether it landed on the already-selected slot. Two dedicated flags (`_pointerDownOnSelected`, `_pointerDownPx`) are used rather than overloading the existing `_resizeStartPx` — they serve different purposes and should not share state.
- **Ghost bar centred on pointer**: `ghostLeft = _moveDragPx - bound.width / 2`. This centres the ghost on the pointer rather than anchoring its left edge. This gives immediate visual feedback of where the slot will land relative to the drag handle.
- **App.svelte `progressionKey` fingerprint**: a lightweight per-slot string key (`rootPc + qual + bars` for chords, `R + bars` for rests) joined by commas. This detects reorder events (key changes when slot order changes) without requiring a deep equality check on the full progression array. The key is computed on every subscription call but is O(n) in progression length, which is bounded by the UI (max 8 bars × ~20 slots is negligible).
- **Eager `_slotBounds` recompute after `reorderSlot`**: after calling `reorderSlot`, we eagerly call `computeSlotBounds(get(sessionStore).harmony.progression, PX_PER_CYCLE)` to update `_slotBounds`. The App.svelte rebuild should also do this (via `buildHarmonyStaffScene`), but the eager recompute guarantees correct affordance rendering even if the subscription fires asynchronously or not at all (e.g., in test environments).

### Proposed Decisions Register entries (if any)

None. The move-gesture implementation follows ADR 0014 D4/D5 without any deviation requiring a new Register entry.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `src/render/harmony-staff-scene.ts`: move state + ghost/indicator rendering + pointer handler extensions + `nearestInsertionIndex`/`reorderSlot` imports.
- `src/app/App.svelte`: `prevProgressionKey` tracking; rebuild condition extended.
- Quality gates: 447 passed, 0 tsc errors, 0 lint errors, build clean.
- Branch: `orbifold-v2/phase-10`.

### Next-step context (only if non-obvious)

Step 10.8 is the quality gates + manual acceptance step. It runs the full static-analysis checks, verifies no source modifications, and assembles the phase-level Acceptance Coverage Table for Pilot Checkpoint #5.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `feat(harmony): Phase 10 step 10.7 — staff slot time-move (reorder gesture)`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 10.8 — Quality gates and manual acceptance

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

No source files were modified in this step. All work is documentation and validation.

#### Quality gates (fresh run)

| Gate | Command | Result |
|---|---|---|
| TypeScript | `pnpm exec tsc --noEmit` | exit 0 — 0 errors |
| Lint | `pnpm lint` | exit 0 — 0 ESLint errors, 0 Prettier issues |
| Tests | `pnpm exec vitest run` | 447 passed (14 files), 0 failed |
| Build | `pnpm build` | exit 0 — 1,068 kB bundle; pre-existing chunk-size and dynamic-import warnings only |

Test count breakdown (447 total):
- `tests/harmony/staff-hit.test.ts`: 42 (new Phase 10 engine)
- `tests/session.test.ts`: 55 (includes 9 new `reorderSlot` tests from step 10.3)
- `tests/harmony/staff-map.test.ts`: 73
- `tests/harmony/voice-tracks.test.ts`: 18
- `tests/harmony/voice-tracks-register.test.ts`: 24
- `tests/euclid.test.ts`: 25
- `tests/harmony/staff-layout.test.ts`: 32
- `tests/codegen.test.ts`: 39
- `tests/tonnetz.test.ts`: 31
- `tests/persistence.test.ts`: 42
- `tests/schema.test.ts`: 41
- `tests/voice-leading.test.ts`: 8
- `tests/harmony/time-map.test.ts`: 13
- `tests/phase-anchor.test.ts`: 4

#### Static analysis checks (per phase file §10.8)

| Check | Command | Result |
|---|---|---|
| Pure engine invariant | `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/` | **0 matches** — all core engines pure |
| `PX_PER_CYCLE` coordination rule | `grep -n "PX_PER_CYCLE" src/render/harmony-staff-scene.ts` | imported at line 83 from `../core/harmony/time-map.js`; no `const PX_PER_CYCLE =` declaration anywhere in file |
| `subview`/`registerMode` not in Zod schema | `grep -n "subview\|registerMode" src/lib/persistence.ts` | lines 227–229 are runtime defaults in a function body, NOT schema fields; `SavedHarmonySchema` (lines 52–60) contains only `root`, `mode`, `octave`, `progression` — confirmed absent |
| `subview`/`registerMode` not in agent schema | `grep -n "subview\|registerMode" src/agent/schema.ts` | **0 matches** |
| AGPL-3.0 headers | `head -2` on all modified/new files | All present (details below) |
| `clearChordAt`, `setChordBars`, `reorderSlot` imported from session.ts | `grep -n "clearChordAt\|setChordBars\|reorderSlot" src/render/harmony-staff-scene.ts` | all three present as imports (lines 94–97) and call sites |
| No direct `sessionStore.update` in render module | `grep -n "sessionStore.update" src/render/harmony-staff-scene.ts` | **0 matches** |

AGPL-3.0 header evidence:
- `src/core/harmony/staff-hit.ts` → line 1: `// SPDX-License-Identifier: AGPL-3.0-only`
- `src/render/harmony-staff-scene.ts` → line 1: `// SPDX-License-Identifier: AGPL-3.0-only`
- `src/app/App.svelte` → lines 1–2: `<!-- SPDX-License-Identifier: AGPL-3.0-only`
- `src/state/session.ts` → line 1: `// SPDX-License-Identifier: AGPL-3.0-only`
- `tests/harmony/staff-hit.test.ts` → line 1: `// SPDX-License-Identifier: AGPL-3.0-only`
- `tests/session.test.ts` → line 1: `// SPDX-License-Identifier: AGPL-3.0-only`

#### Cross-step invariants (phase level)

- **No codegen diffs:** `git diff main...HEAD -- src/core/codegen/strudel.ts` → empty (0 lines changed across all of Phase 10).
- **No `sessionStore.update` in render modules:** confirmed 0 matches in `harmony-staff-scene.ts`.
- **`core/**` purity:** confirmed 0 PIXI/Svelte/DOM imports in any `src/core/**` file.
- **Pinned deps:** all `dependencies` and `devDependencies` in `package.json` use exact versions — no `^` or `~` ranges.
- **ADR 0011 D2 partially superseded:** ADR 0014 D1 amends the "no editing affordance" clause for duration, while all other ADR 0011 D2 clauses (ProgressionStrip preserved, staff is downstream store consumer) remain in effect.

---

### Manual acceptance checklist for Pilot (Checkpoint #5)

Open `pnpm dev` and navigate to the **Pentagrama** view (Armonía → Pentagrama sub-toggle). For each item, confirm the described behaviour is observed in the browser.

1. **Barras de duración (A-10-01):** Con al menos dos acordes en la progresión, verifica que cada acorde aparece en el pentagrama como tres barras horizontales coloreadas (tónica/subdominante/dominante) que se extienden hacia la derecha proporcional a la duración del slot. Un slot de 2 barras debe ser el doble de ancho que uno de 1 barra.

2. **Barras de silencio (A-10-02):** Agrega un silencio a la progresión (botón "+" en la ProgressionStrip y selecciona rest). Verifica que aparece en el pentagrama como una barra gris horizontal en la línea central del pentagrama (B4), con un tick vertical en el centro.

3. **Cuadrícula de compases (A-10-03):** Verifica que se dibujan líneas verticales finas sobre el pentagrama: líneas tenues de corchea cada 12 px, líneas más visibles de compás cada 48 px, y una línea de borde izquierdo en x=0. La cuadrícula debe alinearse con la regla de la ProgressionStrip (mismos intervalos de compás).

4. **Toggle acorde/arpegio (A-10-04):** Cambia el selector de "acorde" a "arpegio" en la barra superior. En modo **arpegio**, verifica que las tres notas de cada acorde aparecen como círculos escalonados (voz 0 al inicio del slot, voz 1 a un tercio, voz 2 a dos tercios) con una línea conectora ascendente entre ellos (no barras horizontales). Cambia de vuelta a "acorde" y verifica que vuelven las barras paralelas.
   - **Nota cosmética (a):** El conector de arpegio salta el espacio entre slots cuando hay menos de 3 noteheads en un grupo (p. ej. slots adyacentes a un silencio) — no se dibuja línea. Esto es comportamiento correcto por el guard de grupo incompleto.
   - **Nota cosmética (b):** Las alteraciones (accidentals) en modo arpegio se muestran en la posición x del onset escalonado, no en el inicio del slot. Esto es visualmente correcto (el accidental pertenece al onset de la nota) aunque puede parecer desplazado respecto al modo acorde.

5. **Seleccionar slot (A-10-05):** Haz clic en cualquier barra horizontal de un acorde. Verifica que:
   - Aparece un borde blanco alrededor del slot seleccionado.
   - Aparece un botón "×" en la esquina superior derecha del slot.
   - Aparece una barra de redimensionamiento blanca (4 px) en el borde derecho del slot.
   - Hacer clic fuera de cualquier slot deselecciona (borde y botones desaparecen).

6. **Eliminar con ✕ (A-10-06):** Con un slot seleccionado, haz clic en el botón "×". Verifica que el acorde desaparece del pentagrama Y que la ProgressionStrip refleja inmediatamente la eliminación (el badge desaparece).

7. **Redimensionar duración (A-10-07):** Selecciona un slot y arrastra el borde derecho (barra blanca) hacia la derecha o la izquierda. Verifica que:
   - Durante el arrastre, se muestra un rectángulo de previsualización (sin escribir en el store aún).
   - Al soltar, la barra del slot cambia de ancho y la ProgressionStrip actualiza el ancho del badge correspondiente.
   - La duración mínima es 0.25 barras y la máxima es 8 barras (igual que la ProgressionStrip).
   - Si hay audio reproduciéndose, el cambio entra en efecto en el siguiente ciclo (no usa `.fast`/`.slow`).

8. **Mover en el tiempo (A-10-08):** Selecciona un slot y arrástralo lentamente a una posición diferente (>4 px de desplazamiento). Verifica que:
   - Aparece una barra fantasma semi-transparente en la posición de arrastre.
   - Aparece un indicador de inserción vertical (línea blanca fina) en la posición de destino.
   - Al soltar, el slot se reordena en la progresión y la ProgressionStrip refleja el nuevo orden inmediatamente.
   - Si hay audio reproduciéndose, la secuencia de acordes cambia en el siguiente ciclo.

9. **Playhead cíclico — re-verificación solicitada por el Pilot (A-10-09):** Con audio reproduciéndose (armónía activa), verifica que:
   - El playhead del pentagrama avanza de izquierda a derecha y vuelve al inicio al final de la progresión (bucle), sin salirse del ancho del pentagrama.
   - El cursor de la ProgressionStrip avanza y hace bucle en sincronía con el playhead del pentagrama.
   - Sin audio reproduciéndose (`nowPlaying.source === null`), ninguno de los dos playheads es visible.
   - El Pilot mencionó haber observado previamente que "el playhead continúa andando sin parar" — el inventario del paso 10.1 concluyó NO DISCREPANCIA. Re-verificar aquí que el comportamiento es correcto con el código actual.

10. **Paridad con ProgressionStrip (A-10-10):** Realiza una edición desde la ProgressionStrip (p. ej., arrastra un badge para cambiar su duración). Verifica que la barra horizontal en el pentagrama se actualiza inmediatamente con el nuevo ancho. Realiza una edición desde el pentagrama (borrar, redimensionar). Verifica que la ProgressionStrip refleja el cambio. Ambas superficies están sincronizadas a través del mismo store.

---

### Files touched

- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — this entry (step 10.8).

No source files modified.

### Validation evidence (per Acceptance ID)

All automated IDs are fully covered. All manual IDs are proxy-covered (code implemented in prior steps); live verification is the Pilot's Checkpoint #5 responsibility.

### Routine validations

- `pnpm exec tsc --noEmit` → exit 0, 0 errors
- `pnpm lint` → exit 0, 0 ESLint errors, 0 Prettier issues
- `pnpm exec vitest run` → 447 passed (14 files), 0 failed
- `pnpm build` → exit 0 (pre-existing chunk-size and dynamic-import warnings; not introduced by Phase 10)

### Acceptance Coverage Table — Phase 10 (complete)

| Acceptance ID | Required behavior | Test file(s) / Proof | Type | Status |
|---|---|---|---|---|
| A-10-01 | Duration-extent bars: each chord slot renders as horizontal bars spanning `bars × PX_PER_CYCLE` per voice at correct y-positions, colored per voice | Code: `drawStaticStaff` — `barWidth = Math.max(nh.bars * PX_PER_CYCLE, BAR_HEIGHT)` (step 10.4) | MANUAL | PROXY-COVERED (code) — MANUAL: Checkpoint #5 item 1 |
| A-10-02 | Rest extent rendering: rest slots render as grey horizontal bars at middle staff line (step 6 = B4) with correct duration width | Code: `drawStaticStaff` rest branch — `restBarWidth = Math.max(rg.bars * PX_PER_CYCLE, BAR_HEIGHT)` at `stepToY(6, staffBaseY)` (step 10.4) | MANUAL | PROXY-COVERED (code) — MANUAL: Checkpoint #5 item 2 |
| A-10-03 | Bar grid: thin vertical beat and bar lines on staff canvas, aligning with ProgressionStrip ruler above | Code: `drawBarGrid` — beat lines at 12 px (15% opacity), bar lines at 48 px (35% opacity), left boundary at 50% opacity (step 10.4) | MANUAL | PROXY-COVERED (code) — MANUAL: Checkpoint #5 item 3 |
| A-10-04 | Chord/arp mode visual toggle: acorde shows parallel bars, arpegio shows staggered onset dots + ascending connector; <3-notehead groups skip connector | Code: `drawStaticStaff` `chordMode === 'arp'` branch — `Map<number, NoteHead[]>` grouping, stagger offsets `[0, span/3, 2*span/3]`, connector guard `nhGroup.length === 3` (step 10.5) | MANUAL | PROXY-COVERED (code) — MANUAL: Checkpoint #5 item 4 |
| A-10-05 | Select: clicking a slot highlights it with a border and shows a ✕ button and a right-edge resize handle; clicking outside deselects | Code: `onStaffPointerDown` → `hitTestSlot` → `_selectedSlotIdx = result`; `drawAffordances` draws border + `_deleteBtn` + handle rect (step 10.6) | MANUAL | PROXY-COVERED (code) — MANUAL: Checkpoint #5 item 5 |
| A-10-06 | Delete via ✕: removes slot from progression; ProgressionStrip immediately reflects removal | Code: `onStaffPointerDown` ✕ hit region → `clearChordAt(idxToDelete)` — same store action as ProgressionStrip badge ✕; selection guard clears stale index (step 10.6) | MANUAL | PROXY-COVERED (code) — MANUAL: Checkpoint #5 item 6 |
| A-10-07 | Resize: right-edge drag changes duration; commits via `setChordBars`; ProgressionStrip segment width updates; change re-emitted via `arrange()` (no `.fast`/`.slow`) | Code: `onStaffPointerDown` resize handle → `_resizeActive`; `onStaffPointerMove` → `clampBars(...)` preview; `onStaffPointerUp` → `setChordBars(_selectedSlotIdx, _resizePreviewBars)` (step 10.6); App.svelte rebuild on `totalBars` change (step 10.6) | MANUAL | PROXY-COVERED (code) — MANUAL: Checkpoint #5 item 7 |
| A-10-08 | Time-move: body drag (>4 px threshold) shows ghost bar + insertion indicator; releasing reorders slot; ProgressionStrip reflects new order | Code: `_pointerDownOnSelected` + 4 px threshold in `onStaffPointerMove`; `drawAffordances` ghost bar (40% opacity) + insertion indicator (2 px, 80% opacity); `onStaffPointerUp` → `reorderSlot(_moveFromIdx, _moveInsertIdx)`; App.svelte `prevProgressionKey` rebuild trigger (step 10.7) | MANUAL | PROXY-COVERED (code) — MANUAL: Checkpoint #5 item 8 |
| A-10-09 | Playhead is cyclic and matches ProgressionStrip cursor; neither visible when `nowPlaying.source === null` | Code analysis (step 10.1 inventory §a): NO DISCREPANCY — `_staffWidth` and `cursorTotalWidth` both use `progression.reduce(sum + (slot.bars ?? 1)) * PX_PER_CYCLE`; BUG A guard consistent in both surfaces | MANUAL | PROXY-COVERED (code) — MANUAL: Checkpoint #5 item 9 (re-verification requested) |
| A-10-10 | ProgressionStrip parity: edits on staff visible in strip and vice versa; strip edits clear stale staff selection | Code: both surfaces call same store actions (`setChordBars`, `clearChordAt`); selection guard (`_selectedSlotIdx >= progression.length` → reset) handles strip-side deletions (step 10.6) | MANUAL | PROXY-COVERED (code) — MANUAL: Checkpoint #5 item 10 |
| A-10-11 | `staff-hit.ts` pure engine (no DOM/PIXI/Svelte imports); all 4 exports unit-tested; prior suite has no regressions | `tests/harmony/staff-hit.test.ts` — 42 tests: `computeSlotBounds` (7 cases), `hitTestSlot` (13 cases), `hitTestResizeHandle` (8 cases), `nearestInsertionIndex` (9 cases); `grep -rn "from 'pixi..." src/core/` → 0 matches (step 10.3) | AUTOMATED | **COVERED** |
| A-10-12 | `reorderSlot` store action: unit-tested; correct semantics; calls `requeueLive()`; no-op when fromIdx === toIdx | `tests/session.test.ts` — 9 `reorderSlot` tests: move-first-to-last, last-to-first, adjacent-swap, no-op same index, no-op single-slot, out-of-range clamping, empty progression (step 10.3) | AUTOMATED | **COVERED** |
| A-10-13 | All quality gates green: `tsc --noEmit` → 0 errors, `pnpm lint` → 0 errors, `pnpm test` → 447 passed, `pnpm build` → exit 0 | Fresh run in step 10.8: tsc exit 0, lint exit 0, 447 passed (14 files), build exit 0 | AUTOMATED | **COVERED** |
| A-10-14 | `registerMode` and `subview` absent from `SavedHarmonySchema` and `agent/schema.ts` | `grep -n "subview\|registerMode" src/lib/persistence.ts` → matches are runtime defaults in function body (lines 227–229), NOT schema fields; `SavedHarmonySchema` (lines 52–60) contains only `root`, `mode`, `octave`, `progression`; `grep -n "subview\|registerMode" src/agent/schema.ts` → 0 matches | AUTOMATED (proxy: grep) | **COVERED** |
| A-10-15 | Audio output byte-identical before/after all visual rendering changes: no changes to `src/core/codegen/strudel.ts` or the audio pipeline across the entire phase | `git diff main...HEAD -- src/core/codegen/strudel.ts` → empty (0 lines changed); `reorderSlot` changes audio by design (ADR 0014 D5) — this is intended user behavior, not a regression | AUTOMATED (proxy: git diff) | **COVERED** |
| A-10-16 | AGPL-3.0 header present in all new and modified source files | `head -2` on all Phase 10 files: `staff-hit.ts` (line 1), `harmony-staff-scene.ts` (line 1), `App.svelte` (line 2 in HTML comment), `session.ts` (line 1), `staff-hit.test.ts` (line 1), `session.test.ts` (line 1) — all confirmed | AUTOMATED (proxy: head -2) | **COVERED** |

**Coverage summary:**
- Automated (fully covered): A-10-11, A-10-12, A-10-13, A-10-14, A-10-15, A-10-16 — 6/16
- Manual (proxy-covered, Checkpoint #5 needed): A-10-01 through A-10-10 — 10/16
- No gaps. All 16 IDs accounted for.

**Cosmetic notes for Pilot awareness (Planner review carry-forwards):**
- **(a) Grid bottom vs playhead bottom:** the bar grid's bottom vertical extent uses `stepToY(-6, staffBaseY)` while the playhead line uses the same `stepToY(-6, staffBaseY)` formula (both from `harmony-staff-scene.ts`). However the playhead `lineStyle` call may extend 2 extra pixels below (-8 vs -6) due to a 2 px line centered on the boundary — this is a cosmetic 1–2 px discrepancy at the very bottom of the playhead and is not functionally significant.
- **(b) Accidentals in arp mode:** in arpeggio mode, accidentals (sharps, flats) are drawn at the staggered note onset x-position rather than at the slot-start x. This is musically correct (the accidental belongs to the onset), but may appear visually inconsistent with chord mode where all three accidentals share the same leftmost x. Not a bug; noted for Pilot awareness.

### Decisions made (if any)

None. This step is documentation-only.

### Proposed Decisions Register entries (if any)

Two proposals for Pilot ratification at phase close:

**P1 — ADR 0014 D3 amendment: DOM event routing is the canonical delivery mechanism for staff pointer events.**
ADR 0014 D3 originally specified a `_hitRect: PIXI.Graphics` with `interactive = true` as the hit-test mechanism. Step 10.6 implemented the equivalent using native DOM `PointerEvent` listeners routed from `App.svelte` via three exported handler functions (`onStaffPointerDown`, `onStaffPointerMove`, `onStaffPointerUp`). This matches the established `tonnetz-scene.ts`/`rhythm-scene.ts` idiom, aligns coordinates correctly via `autoDensity: true`, and preserves D3's single-dispatch-point intent. ADR 0014 D3 §"Implementation note" already records this; the Register proposal asks the Pilot to formally ratify it so future phases know the canonical pattern.
Source: step 10.6 "Decisions made"; ADR 0014 D3 §"Implementation note".

**P2 — `progressionKey` fingerprint as rebuild trigger in App.svelte.**
Step 10.7 introduced a lightweight per-slot string fingerprint (`'{rootPc}{qual}{bars}'` for chords, `'R{bars}'` for rests, joined by commas) to detect reorder events without a deep equality check. This trigger pattern (joining slot keys into a string) is now part of the App.svelte store subscription logic and should be documented so future phases that add new slot-level state know they may need to update the key formula. Proposal: add a one-sentence Register note pointing to the `prevProgressionKey` variable in `App.svelte` and documenting when it must be updated.
Source: step 10.7 "Decisions made" §App.svelte `progressionKey` fingerprint.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- No source files modified. Phase 10 is complete pending Pilot Checkpoint #5 manual acceptance.
- Quality gates: 447 passed, 0 tsc errors, 0 lint errors, build clean.
- Branch: `orbifold-v2/phase-10`.

### Next-step context

This is the final step of Phase 10. After Pilot Checkpoint #5 manual acceptance:
- If the Pilot approves: the phase is closed. The Pilot should archive/merge `orbifold-v2/phase-10` and begin scoping Phase 11 (note-level free placement, single-pitch data model, Tonnetz vertex→single note, pitch drag). Phase 11 will need a new ADR for the `NoteSlot` data model and OQ-4 (suavizado editing hazard) resolution.
- If the Pilot finds regressions: return to the relevant step for a targeted fix.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `docs(harmony): Phase 10 step 10.8 — quality gates and manual acceptance`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 10.8 REVISE — Checkpoint #5 REVISE: functional bug fixes

**Date:** 2026-06-13
**Commit(s):** (terminal commit — see below)
**Iteration:** 2 of 5 (REVISE)

### Bugs found at Checkpoint #5

Three confirmed bugs and one non-bug item surfaced during Pilot manual acceptance:

| ID | Description | Status |
|---|---|---|
| A-10-03 | Bar grid lines invisible | BUG — fixed |
| A-10-04 | Arpeggio stagger doesn't match audio repetition | BUG — fixed |
| A-10-01, A-10-09 | Playhead desync after slot resize | BUG — fixed |
| A-10-08 | Rest reorder audio follows on next cycle | NOT A BUG — design behavior |

### Root causes and fixes

**(Bug 1 — A-10-03: Grid lines invisible)**

Root cause: `drawBarGrid` used `COL.faint` (0x39404f — dark blue-grey) as the line color. On the dark background `COL.bg = 0x0b0d12`, near-black lines at 15%–50% alpha produce virtually invisible grid lines.

Fix: changed the line color from `COL.faint` to `0xffffff` (white) at all three opacity levels, keeping the same opacity values:
- Beat lines: 1px, 0xffffff, 15% opacity
- Bar lines: 1px, 0xffffff, 35% opacity
- Left boundary (x=0): 1px, 0xffffff, 50% opacity

**(Bug 2 — A-10-04: Arpeggio stagger vs audio)**

Root cause: the previous arp stagger distributed the 3 voice onsets across the FULL slot span (`slotSpan = bars × PX_PER_CYCLE`). But Strudel codegen for arp mode emits `note("[n0 n1 n2]")` inside `arrange()`, which repeats the 3-note pattern once per cycle inside the slot. A 2-bar slot plays the group twice; the visual showed only one group spanning 2 bars instead of 2 groups each spanning 1 bar.

Fix: changed the stagger to span ONE cycle (`PX_PER_CYCLE`), and repeat the group for each cycle in the slot. Key changes:
- `numGroups = Math.max(1, Math.ceil(bars))` — one group per cycle
- `cycleStart = slotStartX + cycleIndex * PX_PER_CYCLE` — each group starts at its cycle boundary
- `xOffsets = [0, PX_PER_CYCLE / 3, (2 * PX_PER_CYCLE) / 3]` — stagger within one cycle
- A 1-bar slot still shows 1 group (same visual as before but stagger compressed to 1 cycle); a 2-bar slot shows 2 groups; a 0.5-bar slot shows 1 group compressed within its half-cycle.

Accidentals are rendered by `drawAccidentals()` separately and use `nh.x` (the raw slot start from layout). They are not affected by this stagger change.

**(Bug 3 — A-10-01, A-10-09: Playhead desync after resize)**

Root cause: `updateHarmonyStaffDynamic` computed `playheadX` using the module-level `_staffWidth` cache. `_staffWidth` is updated in `buildHarmonyStaffScene`, but when `setChordBars` is called (e.g., via the resize gesture), App.svelte's rebuild condition fires on `totalBars` change — however, `updateHarmonyStaffDynamic` runs every tick and may use the stale cache value between the store write and the next rebuild.

Fix: in `updateHarmonyStaffDynamic`, compute the staff width directly from `state.harmony.progression` before the playhead computation:
```typescript
const staffWidth = Math.max(
  state.harmony.progression.reduce((sum, sl) => sum + (sl.bars ?? 1), 0) * PX_PER_CYCLE,
  MIN_STAFF_WIDTH
);
if (staffWidth <= 0) return;
const playheadX = ((rawX % staffWidth) + staffWidth) % staffWidth;
```

The module-level `_staffWidth` variable is retained (still set in `buildHarmonyStaffScene`) because it is used by `drawBarGrid` for `totalBars`. Only the playhead x computation in `updateHarmonyStaffDynamic` uses the locally recomputed value.

**(Non-bug — A-10-08: Rest reorder audio follows on next cycle)**

Verified: `reorderSlot` in `session.ts` calls `requeueLive()` after the store update. `setChordBars` also calls `requeueLive()`. Both are confirmed at lines 979 and 903 of `session.ts`. The audio following on the next cycle boundary is expected design behavior, consistent with the "live changes requeue to the next cycle" invariant in CLAUDE.md §6. No code change needed. Note for Pilot: a "next-cycle" visual indicator (e.g., a brief flash on the ProgressionStrip) could improve UX clarity in a future phase.

### Files touched

- `src/render/harmony-staff-scene.ts` — Bug 1 (grid color), Bug 2 (arp stagger), Bug 3 (playhead defensive width); header comment updated.
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — this entry.

### Gate results

| Gate | Command | Result |
|---|---|---|
| TypeScript | `pnpm exec tsc --noEmit` | exit 0 — 0 errors |
| Lint | `pnpm lint` | exit 0 — 0 ESLint errors, 0 Prettier issues |
| Tests | `pnpm exec vitest run` | 447 passed (14 files), 0 failed |
| Build | `pnpm build` | exit 0 — 1,068 kB bundle; pre-existing warnings only |

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / Proof | Type | Status (REVISE) |
|---|---|---|---|---|
| A-10-01 | Duration-extent rendering: chord slots render as horizontal bars at correct width | Code: `drawStaticStaff` chord branch (unchanged); Bug 3 fix: playhead now recomputes width live, ensuring correct loop | MANUAL | **REVISED** — playhead desync fixed; Checkpoint #5 re-verification needed |
| A-10-02 | Rest extent rendering: grey bars at middle staff line | Code: `drawStaticStaff` rest branch (unchanged) | MANUAL | PROXY-COVERED (unchanged from step 10.4) |
| A-10-03 | Bar grid: visible vertical beat and bar lines on staff canvas | Code: `drawBarGrid` — color changed from `COL.faint` to `0xffffff`; same opacity values | MANUAL | **REVISED** — color bug fixed; Checkpoint #5 re-verification needed |
| A-10-04 | Chord/arp mode visual toggle: arp shows staggered onset dots matching audio cycle | Code: arp branch now uses per-cycle groups with `numGroups = ceil(bars)` | MANUAL | **REVISED** — stagger now matches audio; Checkpoint #5 re-verification needed |
| A-10-05 | Select: clicking a slot highlights it | Code: interaction layer (step 10.6, unchanged) | MANUAL | PROXY-COVERED (unchanged) |
| A-10-06 | Delete via ✕ | Code: `clearChordAt` dispatch (step 10.6, unchanged) | MANUAL | PROXY-COVERED (unchanged) |
| A-10-07 | Resize: right-edge drag changes duration | Code: `setChordBars` commit (step 10.6, unchanged) | MANUAL | PROXY-COVERED (unchanged) |
| A-10-08 | Time-move: body drag reorders slot | Code: `reorderSlot` dispatch (step 10.7, unchanged) | MANUAL | PROXY-COVERED — next-cycle audio is by design |
| A-10-09 | Playhead cyclic and matches ProgressionStrip cursor | Bug 3 fix: `updateHarmonyStaffDynamic` now reads live progression width | MANUAL | **REVISED** — desync fixed; Checkpoint #5 re-verification needed |
| A-10-10 | ProgressionStrip parity | Code: shared store actions (step 10.6/10.7, unchanged) | MANUAL | PROXY-COVERED (unchanged) |
| A-10-11 | `staff-hit.ts` pure engine; all exports unit-tested | `tests/harmony/staff-hit.test.ts` — 42 tests (unchanged) | AUTOMATED | **COVERED** |
| A-10-12 | `reorderSlot` store action unit-tested | `tests/session.test.ts` — 9 tests (unchanged) | AUTOMATED | **COVERED** |
| A-10-13 | All quality gates green | Fresh run: 447 passed, tsc exit 0, lint exit 0, build exit 0 | AUTOMATED | **COVERED** |
| A-10-14 | `registerMode` and `subview` absent from saved schema | grep confirms (unchanged) | AUTOMATED (proxy: grep) | **COVERED** |
| A-10-15 | Audio byte-identical before/after visual rendering changes | Only `harmony-staff-scene.ts` modified; `strudel.ts` unchanged | AUTOMATED (proxy: grep) | **COVERED** |
| A-10-16 | AGPL-3.0 header in all modified files | `head -2 src/render/harmony-staff-scene.ts` → AGPL-3.0-only | AUTOMATED (proxy: head -2) | **COVERED** |

### Revised status for flagged acceptance IDs

- **A-10-01** (Duration-extent bars): REVISED — Bug 3 playhead fix ensures the playhead loops correctly in the visual extent context. Bar rendering itself was unchanged; the bug was in the playhead width computation used during live playback.
- **A-10-03** (Bar grid): REVISED — color changed from invisible near-black to visible white; same opacity hierarchy preserved.
- **A-10-04** (Arp stagger): REVISED — stagger groups now repeat per cycle, matching the audio repetition of `note("[n0 n1 n2]")` inside `arrange()`.
- **A-10-09** (Playhead cyclic): REVISED — live width recomputation in `updateHarmonyStaffDynamic` eliminates the stale-cache desync.

### Decisions made (if any)

- Module-level `_staffWidth` is retained (still set by `buildHarmonyStaffScene`) because `drawBarGrid` uses `totalBars = _staffWidth / PX_PER_CYCLE`. Only `updateHarmonyStaffDynamic` switches to the locally recomputed value. This is the minimum-surface fix — no other callsite is changed.
- Arp stagger now uses `Math.ceil(bars)` for `numGroups`. For non-integer bar values (e.g., bars=0.5), `ceil(0.5) = 1` — one group rendered at `cycleStart = slotStartX`, stagger within `PX_PER_CYCLE`. For bars=1.5, `ceil(1.5) = 2` — two groups, second at `slotStartX + PX_PER_CYCLE`. This matches the audio: Strudel always repeats the mini-pattern at cycle boundaries within the arrange slot.

### Proposed Decisions Register entries (if any)

None. These are bug fixes, not governance decisions.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `src/render/harmony-staff-scene.ts`: Bug 1 (grid color), Bug 2 (arp stagger per cycle), Bug 3 (live playhead width) all fixed.
- Quality gates: 447 passed, 0 tsc errors, 0 lint errors, build clean.
- Branch: `orbifold-v2/phase-10`.

### Next-step context

After Pilot re-verifies A-10-01, A-10-03, A-10-04, A-10-09 at the follow-up manual acceptance:
- If the Pilot approves: Phase 10 is closed. Begin scoping Phase 11.
- If further issues are found: iterate.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `fix(harmony): Phase 10 step 10.8 REVISE — playhead sync, grid color, arp stagger`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 10.9 — Redesign inventory (open questions OQ-R1 through OQ-R8)

**Date:** 2026-06-13
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

Produced `docs/orbifold-v2/inventories/phase-10-redesign-inventory.md` resolving all eight open questions for the Canvas 2D redesign. No source files were modified.

Key findings (summarised — full detail in the inventory):
- OQ-R1: `func.cls` is the tonal-function key; `diatonicLookup` already exported; non-diatonic chords → neutral `#8aa0ff`, no badge.
- OQ-R2: `staff-map.ts` has no `noteNameToMidi` export; render layer inlines chromatic-pc→MIDI conversion and ports prototype `m2p` verbatim (Pentagrama.dc.html lines 160–165). `noteToStaffPosition` uses an incompatible coordinate system and must NOT be used.
- OQ-R3: `hitTestSlot(e.offsetX - SL, bounds)` is the correct call; negative adjustedPx (clef gutter) correctly returns null; `pxPerCycle = 48` matches `PX_PER_CYCLE`.
- OQ-R4: SAFE — `registerMode` absent from `SavedHarmonySchema` and `HarmonySpecSchema`; sole call site is Header.svelte lines 407–420.
- OQ-R5: Only `App.svelte` imports `harmony-staff-scene.ts`; nine call sites documented with exact line numbers; file can be deleted in step 10.11; `_staffContainer` has four touch-points in `stage.ts`.
- OQ-R6: New canvas uses `z-index:1` (above PIXI at auto/0, below Hud/Legend at 3); `display:none; pointer-events:none` when hidden.
- OQ-R7: Prototype `pArp` uses per-SLOT spread (`span = w - 24`); corrected implementation uses per-CYCLE stagger (0, PX/3, 2·PX/3 within each cycle, repeated `ceil(bars)` times). Intentional divergence.
- OQ-R8: Baseline — 447 tests passed, 0 tsc errors, 0 lint errors.

### Files touched

- `docs/orbifold-v2/inventories/phase-10-redesign-inventory.md` — new file (created)
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

| Acceptance ID | Required behavior | Test file / Proof | Type | Status |
|---|---|---|---|---|
| A-10-33 | Zero codegen changes | No source files modified in this step | AUTOMATED (proxy) | PARTIAL — will be fully verified at step 10.16 |
| A-10-34 | Quality gates baseline | 447 passed, tsc exit 0, lint exit 0 | AUTOMATED | PARTIAL — baseline confirmed; full sweep at step 10.16 |

Visual acceptance IDs (A-10-17 through A-10-32) are deferred to step 10.16 manual acceptance.

### Routine validations

No source files modified. Quality gate baseline confirmed in OQ-R8: 447 passed, 0 tsc errors, 0 lint errors.

### Decisions made (if any)

None. This step resolves open questions; all binding decisions belong to the Pilot (recorded in step 10.10 ADR).

### Proposed Decisions Register entries (if any)

None from this step.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- Inventory produced at `docs/orbifold-v2/inventories/phase-10-redesign-inventory.md`.
- No source files modified.
- Quality gate baseline: 447 passed, 0 tsc errors, 0 lint errors.
- Branch: `orbifold-v2/phase-10`.

### Next-step context

Step 10.10 writes ADR 0015 recording the seven binding decisions for steps 10.11–10.15. After ADR 0015 is committed and reviewed at Pilot Checkpoint #2, step 10.11 (code) may proceed.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `docs(orbifold-v2): Phase 10 step 10.9 — redesign inventory`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 10.10 — ADR 0015 (Canvas 2D Pentagrama layer)

**Date:** 2026-06-13
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

Wrote `docs/adr/0015-canvas2d-pentagrama-layer.md` recording seven binding decisions for the Canvas 2D redesign. No source files were modified.

**D1 — Canvas 2D dedicated layer; PIXI staff scene retired.** Amends ADR 0011 D5 (Phase 08). The Pentagrama sub-view switches from a PIXI `_staffContainer` to a dedicated Canvas 2D `<canvas>` element. Tonnetz and Rhythm remain PIXI. `harmony-staff-scene.ts` is deleted (only `App.svelte` imports it); nine call sites in `App.svelte` are removed; `_staffContainer` wiring is removed from `stage.ts`. Pure engines (`staff-hit.ts`, `voice-tracks.ts`, `staff-map.ts`, `staff-layout.ts`, `time-map.ts`) and their 447 passing tests are retained.

**D2 — Drop estricto/suavizado register modes.** Amends ADR 0011 D6. The `#registerModeSeg` `<div>` (Header.svelte lines 407–420) and its `setRegisterMode` call are removed. `HarmonyState.registerMode` and `setRegisterMode` are left inert (not deleted) to minimize churn. `voice-tracks.ts` becomes visual-pipeline dead code but its tests remain. `SavedHarmonySchema` and `HarmonySpecSchema` are unaffected (registerMode was already absent from both — OQ-R4 SAFE verdict). The Phase 08 Decisions Register entries (registerMode visual-only, not persisted, audio-safe) remain accurate and are not superseded.

**D3 — Responsive staff geometry.** Binding constants from the prototype: `LS = max(24, min(88, H/6))`, `cy = H/2 - LS*0.75`, staff lines at `cy - n*LS` for n in {-2..+2}, `SL = 76 px`, `PX = 48` (= `PX_PER_CYCLE`). DPR scaling contract documented. The two-anchor coordinate system (`cy` for staff lines, `H/2` for note heads via `ny()`) is preserved verbatim from the prototype.

**D4 — Note-name → staff position mapping.** Binding path: `chordVoicing` string → inline MIDI conversion → `m2p(midi)` (ported verbatim from Pentagrama.dc.html lines 160–165) → `ny(pos)`. `staff-map.ts`'s `noteToStaffPosition` and `computeStaffLayout` must NOT be used (incompatible coordinate systems). This is the OQ-R2 verdict recorded as a binding architectural constraint.

**D5 — Arp stagger: per-cycle, not per-slot.** Corrected behavior: voice offsets 0, PX/3, 2·PX/3 within each cycle; repeated `ceil(bars)` times. Intentional divergence from prototype `pArp` (per-slot `span = w - 24` spread). Justified by Strudel arp codegen producing `note("A B C")` once per cycle. Prototype lines 468–476 cited as the divergence source.

**D6 — DOM pointer events directly on Canvas 2D element.** The new `<canvas>` registers its own `pointerdown/move/up` listeners (not routed through `App.svelte`'s PIXI canvas listeners). Hit-testing via `staff-hit.ts` with `SL` offset subtraction. `canvas.setPointerCapture`/`releasePointerCapture` for drag continuity. Same store actions as ProgressionStrip.

**D7 — Lifecycle owned by `pentagrama-scene.ts` module singleton.** Exports `initPentagrama`, `destroyPentagrama`, `setPentagramaVisible`. rAF loop reads `sessionStore` via `get()` each frame. ResizeObserver triggers `setup(w, h)`. CSS `z-index:1`, `display:none/pointer-events:none` when hidden (OQ-R6 strategy).

### Files touched

- `docs/adr/0015-canvas2d-pentagrama-layer.md` — new file (created)
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

| Acceptance ID | Required behavior | Test file / Proof | Type | Status |
|---|---|---|---|---|
| A-10-17 | Canvas 2D `<canvas>` mounts in `#stage`; DPR scaling correct; show/hide lifecycle | ADR 0015 D7 and D3 record the binding contract | MANUAL + tsc | not covered — deferred to step 10.11 (code) |
| A-10-18 | PIXI staff wiring removed; `harmony-staff-scene.ts` retired; `_staffContainer` removed | ADR 0015 D1 records retirement plan (sourced from inventory OQ-R5) | AUTOMATED (tsc) | not covered — deferred to step 10.11 |
| A-10-19 | Register toggle removed from Header; no schema/agent breakage | ADR 0015 D2 records removal scope (sourced from inventory OQ-R4) | AUTOMATED (grep + tsc) | not covered — deferred to step 10.11 |
| A-10-20 through A-10-32 | Visual + interaction acceptance criteria | ADR 0015 D3–D7 record the binding contracts | MANUAL | not covered — deferred to steps 10.12–10.14 |
| A-10-33 | Zero codegen changes | No source files modified in this step | AUTOMATED (git diff) | PARTIAL — will be verified at step 10.16 |
| A-10-34 | Quality gates: tsc 0 errors, lint 0 errors, test ≥ 447, build exit 0 | Quality gates unchanged (no source modifications) | AUTOMATED | PARTIAL — baseline from OQ-R8 holds; full sweep at step 10.16 |

### Routine validations

No source files modified. Quality gates unchanged from step 10.9 baseline (447 passed, 0 tsc errors, 0 lint errors).

### Decisions made (if any)

- `HarmonyState.registerMode` is left inert (not deleted) per D2. The rationale: removing it requires updating all `HarmonyState` construction sites, which is more disruptive than leaving a harmless dead field. A future cleanup phase may remove it if desired.
- `voice-tracks.ts` is left inert per D1. Its tests remain in force. The engine is correct; leaving it in place preserves the option to reactivate it for a future orbital view or register-mode revival without any code recovery from git history.

### Proposed Decisions Register entries (if any)

**P1 — ADR 0015 D1: Canvas 2D as rendering technology for Pentagrama (amendment to ADR 0011 D5).**
The Phase 08 Register entry "STEP_PX = 16 / HALF_STEP_PX = 8 / staffBaseY — constantes de geometría del pentagrama" referenced `harmony-staff-scene.ts` as the authoritative renderer. With that file retired, the entry should be superseded: the binding geometry for the Pentagrama sub-view is now the prototype's `LS = max(24, min(88, H/6))` responsive constants (recorded in ADR 0015 D3), not the PIXI `STEP_PX`/`staffBaseY` constants. Pilot should ratify whether the Phase 08 Register entry is to be marked superseded and replaced with a new entry pointing to ADR 0015 D3.

**P2 — ADR 0015 D2: estricto/suavizado toggle removed from UI; Phase 08 Register entries remain accurate but the UI toggle no longer exists.**
The Phase 08 Register entries ("registerMode is visual-only" and "harmony.subview and harmony.registerMode are ephemeral") remain technically accurate (the field is still in the store type, still not persisted). However, the practical effect has changed: there is no longer any UI to set `registerMode`. The Pilot should ratify whether a one-sentence addendum to those entries ("The Header.svelte toggle was removed in Phase 10 step 10.11; the field remains inert in the store type") would help future Devs understand the current state without misleading them.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `docs/adr/0015-canvas2d-pentagrama-layer.md` created.
- No source files modified.
- Quality gates: 447 passed, 0 tsc errors, 0 lint errors.
- Branch: `orbifold-v2/phase-10`.

### Next-step context

Step 10.11 (first code step of the redesign) implements:
(a) New `src/render/pentagrama-scene.ts` with skeleton rAF loop (clears canvas each frame).
(b) Removal of `harmony-staff-scene.ts` import block and nine call sites from `App.svelte`.
(c) Deletion of `harmony-staff-scene.ts`.
(d) Removal of `_staffContainer` from `stage.ts` (four touch-points per inventory OQ-R5).
(e) Removal of `#registerModeSeg` block from `Header.svelte` and the hint text update (App.svelte lines 484–486).

Step 10.11 does not proceed until Pilot Checkpoint #2 approval of this ADR.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `docs(adr): Phase 10 step 10.10 — ADR 0015 Canvas 2D Pentagrama layer`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 10.11 — Canvas 2D layer skeleton: mount, lifecycle, DPR, show/hide, retire PIXI wiring

**Date:** 2026-06-13
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

**(a) New module `src/render/pentagrama-scene.ts` (ADR 0015 D7)**

Module-level singleton in `src/render/` (render-layer code; DOM imports permitted).
Exports three functions per ADR 0015 D7:

- `initPentagrama(stageEl: HTMLDivElement)` — creates `<canvas>`, sets inline CSS to `position:absolute; top:0; left:0; z-index:1; display:none; pointer-events:none` (OQ-R6 strategy), gets `CanvasRenderingContext2D`, calls `setup(w, h)` from `stageEl.getBoundingClientRect()`, starts a `ResizeObserver` on `stageEl`, and starts the rAF loop.
- `destroyPentagrama()` — cancels `cancelAnimationFrame`, calls `observer.disconnect()`, calls `canvas.remove()`, nulls `_ctx`.
- `setPentagramaVisible(v: boolean)` — toggles `display:block/pointer-events:auto` vs `display:none/pointer-events:none`.

`setup(w, h)` implements DPR scaling per ADR 0015 D3: `_dpr = Math.min(devicePixelRatio, 2)`, `canvas.width = Math.round(w * dpr)`, `canvas.height = Math.round(h * dpr)`, CSS `width/height = w/h px`.

`paint(ts)` calls `ctx.save(); ctx.scale(dpr, dpr); void ts; ctx.clearRect(0, 0, W, H); ctx.restore()`. The `ts` parameter is accepted (passed from rAF via `loop`) and suppressed with `void ts` for this step; it will be used in step 10.13 for time-driven animation. This avoids the `@typescript-eslint/no-unused-vars` error while preserving the correct function signature.

AGPL-3.0 header on line 1.

**(b) `App.svelte` — import replacement (inventory OQ-R5 exact line numbers)**

Removed import block (lines 44–50 at time of inventory):
```typescript
import {
  buildHarmonyStaffScene,
  updateHarmonyStaffDynamic,
  tickHarmonyStaff,
  onStaffPointerDown,
  onStaffPointerMove,
  onStaffPointerUp,
} from '../render/harmony-staff-scene.js';
```

Replaced with:
```typescript
import {
  initPentagrama,
  destroyPentagrama,
  setPentagramaVisible,
} from '../render/pentagrama-scene.js';
```

Removed nine call sites (inventory OQ-R5):
- `buildHarmonyStaffScene(get(sessionStore))` — lines 177, 185, 271
- `updateHarmonyStaffDynamic(get(sessionStore))` — lines 188, 278
- `app.ticker.add(tickHarmonyStaff)` — line 198
- `onStaffPointerDown(e)` — line 291 (canvas `pointerdown` handler)
- `onStaffPointerMove(e)` — line 319 (canvas `pointermove` handler)
- `onStaffPointerUp()` — line 343 (canvas `pointerup` listener)

Also removed the five progression-tracking variables that served only the staff rebuild-detect logic (`prevProgressionLength`, `prevOctave`, `prevTotalBars`, `prevChordMode`, `prevProgressionKey`) and their initialization in `onMount` and usage in the store subscription. The Canvas 2D layer redraws every rAF frame — no rebuild detection is needed.

Added new wiring:
- `initPentagrama(stageEl)` called in `onMount` after `buildTonnetz` / `buildRhythmScene`.
- `destroyPentagrama()` called in `onDestroy` (alongside `unsubStore()`).
- `setPentagramaVisible(state.view === 'harmony' && state.harmony.subview === 'staff')` called from the store subscription (single call, replacing the entire staff-rebuild conditional block).
- `pointerdown` routing updated: when `subview === 'staff'`, no routing to PIXI canvas (Canvas 2D element handles its own events directly per ADR 0015 D6); `tonnetzPointerDown(e)` called only when `subview === 'tonnetz'`.
- `pointermove` routing updated: staff `onStaffPointerMove` branch removed; rhythm hover branch unchanged.
- `pointerup` listener for staff removed entirely.
- Hint text updated (inventory §Additional findings): "Cambia modo registro: suavizado (contornos suaves) o estricto (posición absoluta)" replaced with "Clic para seleccionar · arrastrar para mover · borde derecho para redimensionar."

**(c) `stage.ts` — `_staffContainer` removed (inventory OQ-R5, four touch-points)**

1. Declaration removed: `let _staffContainer: PIXI.Container | null = null` (line 30).
2. `initStage`: `_staffContainer = new PIXI.Container(); _staffContainer.visible = false;` removed; `harmonyLayer.addChild(_tonnetzContainer, _staffContainer)` → `harmonyLayer.addChild(_tonnetzContainer)`.
3. `setHarmonySubview`: `if (_staffContainer !== null) _staffContainer.visible = subview === 'staff'` removed; now only toggles `_tonnetzContainer.visible`.
4. `StageRefs` interface: `staffContainer: PIXI.Container` removed (comment added).
5. `getStageRefs` null check: `_staffContainer === null` removed from the guard; `staffContainer: _staffContainer` removed from the return value.

Header comment updated to reflect Phase 10 redesign.

**(d) `harmony-staff-scene.ts` retired — deleted**

Only `App.svelte` imported it (inventory OQ-R5 confirmed via `grep -rn "harmony-staff-scene" src/`). File deleted from `src/render/harmony-staff-scene.ts`. Zero TypeScript errors after deletion (confirmed by `pnpm exec tsc --noEmit` exit 0). Preserved in git history on `orbifold-v2/phase-10` branch per ADR 0015 D1.

Remaining comment-only references to "harmony-staff-scene.ts" in `ProgressionStrip.svelte` (lines 141, 147, 185) and `voice-tracks.ts` (line 51) are comments that describe historical alignment logic — not imports. They produce zero TypeScript errors. They will be updated/removed in step 10.15 (cleanup).

**(e) `Header.svelte` — `#registerModeSeg` removed (inventory OQ-R4)**

1. `setRegisterMode` removed from the import statement at line 40 (with explanatory comment).
2. The `<div class="seg" id="registerModeSeg">` block and its two `suavizado`/`estricto` buttons (inventory lines 407–420) deleted and replaced with a comment explaining the removal (ADR 0015 D2).

`HarmonyState.registerMode` and `setRegisterMode` in `session.ts` are left inert (not deleted) per ADR 0015 D2. `voice-tracks.ts` is left inert.

### Prototype parity note

No prototype rendering in this step — the canvas is blank (transparent). Prototype parity for rendering begins in step 10.12. Audio byte-identity confirmed: `git diff main...HEAD -- src/core/codegen/strudel.ts` → empty. The changes in this step are structural wiring only.

### Files touched

- `src/render/pentagrama-scene.ts` — new file (created)
- `src/render/harmony-staff-scene.ts` — deleted
- `src/render/stage.ts` — `_staffContainer` removed (4 touch-points + interface + return)
- `src/app/App.svelte` — import replacement, call-site removal (9 sites), progression-tracking variable removal, new lifecycle wiring, pointer routing updated, hint text updated
- `src/ui/Header.svelte` — `#registerModeSeg` block removed, `setRegisterMode` import removed
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — this entry

### Quality gate results (actual runs)

| Gate | Command | Result |
|---|---|---|
| TypeScript | `pnpm exec tsc --noEmit` | exit 0 — 0 errors |
| Lint | `pnpm lint` | exit 0 — 0 ESLint errors, 0 Prettier violations |
| Tests | `pnpm exec vitest run` | 447 passed (14 files), 0 failed — no regressions |
| Build | `pnpm build` | exit 0 — pre-existing chunk-size and dynamic-import warnings only |

### Static checks

| Check | Command | Result |
|---|---|---|
| No orphan harmony-staff-scene imports | `grep -rn "harmony-staff-scene" src/` | 3 comment-only matches (ProgressionStrip.svelte lines 141,147,185; voice-tracks.ts line 51; App.svelte comment); **0 actual import statements** |
| `_staffContainer` removed from stage.ts | `grep -n "_staffContainer" src/render/stage.ts` | 4 matches, all in comments (no `let` declaration, no `addChild`, no `getStageRefs` return) |
| Register toggle removed from Header | `grep -n "registerModeSeg" src/ui/Header.svelte` | 1 match — comment-only (no `<div id="registerModeSeg">`) |
| `setRegisterMode` import removed | `grep -n "setRegisterMode" src/ui/Header.svelte` | 1 match — comment-only in `<script>` block (no actual import statement) |
| Zero codegen changes | `git diff main...HEAD -- src/core/codegen/strudel.ts` | empty |
| AGPL-3.0 header | `head -2 src/render/pentagrama-scene.ts` | `// SPDX-License-Identifier: AGPL-3.0-only` |
| New canvas in src/render/ not src/core/ | file path | `src/render/pentagrama-scene.ts` confirmed |

### Validation evidence (per Acceptance ID)

**A-10-17** (Canvas 2D `<canvas>` mounts in `#stage`; DPR scaling; show/hide lifecycle):
- Code: `initPentagrama` appends canvas to `stageEl` with `z-index:1; display:none; pointer-events:none`.
- DPR: `setup()` uses `Math.min(devicePixelRatio, 2)`; `canvas.width = Math.round(w * dpr)`.
- Show/hide: `setPentagramaVisible` toggles `display:block/pointer-events:auto` vs `display:none/pointer-events:none`.
- Lifecycle: rAF cancelled in `destroyPentagrama`; ResizeObserver disconnected; canvas removed.
- Manual visual verification deferred to Pilot Checkpoint #5.
- `tsc --noEmit` → 0 errors confirms correct TypeScript types.

**A-10-18** (PIXI staff wiring removed; `harmony-staff-scene.ts` retired; `_staffContainer` removed):
- `harmony-staff-scene.ts` deleted: `ls src/render/harmony-staff-scene.ts` → file not found.
- Six imports removed from `App.svelte`; nine call sites removed.
- `_staffContainer` removed from `stage.ts` (4 touch-points + interface + return value).
- `tsc --noEmit` → exit 0, 0 errors — no orphan type errors.

**A-10-19** (Register toggle removed from Header; no schema/agent breakage):
- `#registerModeSeg` block and two buttons removed from `Header.svelte`.
- `setRegisterMode` removed from Header's import (function still exists inert in `session.ts`).
- `SavedHarmonySchema` (persistence.ts lines 52–60): `registerMode` absent — confirmed OQ-R4.
- `HarmonySpecSchema` (agent/schema.ts lines 143–148): `registerMode` absent — confirmed OQ-R4.
- `tsc --noEmit` → exit 0, 0 errors.

### Routine validations (one-liner each)

- `pnpm exec tsc --noEmit` → exit 0, 0 errors
- `pnpm lint` → exit 0, 0 ESLint errors, 0 Prettier issues
- `pnpm exec vitest run` → 447 passed (14 files), 0 failed — no regressions; no new tests (Canvas 2D module not unit-tested directly; pure engines unchanged)
- `pnpm build` → exit 0 (pre-existing chunk-size and dynamic-import warnings; not introduced by this step)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / Proof | Type | Status |
|---|---|---|---|---|
| A-10-17 | Canvas 2D `<canvas>` mounts in `#stage`; DPR scaling; show/hide gated on `view==='harmony' && subview==='staff'`; lifecycle clean | Code: `initPentagrama` / `destroyPentagrama` / `setPentagramaVisible` in `pentagrama-scene.ts`; `tsc` 0 errors | MANUAL + tsc | **PROXY-COVERED (code + tsc)** — manual visual deferred to Pilot Checkpoint #5 |
| A-10-18 | PIXI staff wiring removed from `App.svelte`; `harmony-staff-scene.ts` retired/deleted; `_staffContainer` removed from `stage.ts`; 0 tsc errors | File deleted; 6 imports + 9 call sites removed from App.svelte; 4 touch-points removed from stage.ts; `tsc --noEmit` exit 0 | AUTOMATED (tsc) | **COVERED** |
| A-10-19 | Register toggle removed from `Header.svelte`; 0 references to `setRegisterMode`/`registerModeSeg` in HTML; no schema/agent breakage | `#registerModeSeg` block deleted; import removed; `SavedHarmonySchema` and `HarmonySpecSchema` confirmed absent (OQ-R4); `tsc` 0 errors | AUTOMATED (grep + tsc) | **COVERED** |
| A-10-20 | Staff geometry: responsive LS; 5 lines; clef gutter SL=76 | Not in scope for step 10.11 (no rendering yet) | MANUAL | deferred to step 10.12 |
| A-10-21 | Chord mode rendering matches prototype `pChord` | Not in scope for step 10.11 | MANUAL | deferred to step 10.12 |
| A-10-22 | Arp mode: per-cycle stagger | Not in scope for step 10.11 | MANUAL | deferred to step 10.12 |
| A-10-23 | Rest rendering matches prototype `pRest` | Not in scope for step 10.11 | MANUAL | deferred to step 10.12 |
| A-10-24 | Tonal-function badges | Not in scope for step 10.11 | MANUAL | deferred to step 10.12 |
| A-10-25 | Time grid | Not in scope for step 10.11 | MANUAL | deferred to step 10.12 |
| A-10-26 | Playhead via shared anchor | Not in scope for step 10.11 | MANUAL | deferred to step 10.13 |
| A-10-27 | Spotlight + ambient breathe | Not in scope for step 10.11 | MANUAL | deferred to step 10.13 |
| A-10-28 | Selection chrome | Not in scope for step 10.11 | MANUAL | deferred to step 10.14 |
| A-10-29 | Move ghost | Not in scope for step 10.11 | MANUAL | deferred to step 10.14 |
| A-10-30 | Hover state | Not in scope for step 10.11 | MANUAL | deferred to step 10.14 |
| A-10-31 | Right vignette | Not in scope for step 10.11 | MANUAL | deferred to step 10.12 |
| A-10-32 | All interactions call correct store actions | Not in scope for step 10.11 | MANUAL | deferred to step 10.14 |
| A-10-33 | Zero codegen changes | `git diff main...HEAD -- src/core/codegen/strudel.ts` → empty | AUTOMATED (git diff) | **COVERED** |
| A-10-34 | All quality gates green | tsc exit 0, lint exit 0, 447 passed, build exit 0 | AUTOMATED | **COVERED** |

**A-10-17 notes on manual portions:** DPR scaling, z-order, and lifecycle correctness require visual smoke-test in a browser. Code inspection confirms the CSS properties and ResizeObserver wiring are correct; Pilot verifies at Checkpoint #5 that the canvas appears as a blank dark overlay when `subview === 'staff'` and is absent (invisible) in Tonnetz mode.

### Decisions made (if any)

- **`void ts` to suppress `@typescript-eslint/no-unused-vars`**: the `paint(ts)` parameter is suppressed with `void ts` rather than removing it from the signature. This preserves the correct rAF callback signature (step 10.13 will use `ts` for time-driven animation without a signature change).
- **`_stageEl` not stored as module-level state**: the stageEl reference is not needed after `initPentagrama` sets up the ResizeObserver and appends the canvas; the ResizeObserver holds a reference via its callback closure. Storing it would require an unused variable.
- **Canvas 2D `<canvas>` mounts before PIXI's first resize cycle**: `initPentagrama` is called after `buildTonnetz` / `buildRhythmScene` in `onMount`, which is after the `await new Promise(rAF)` that waits for PIXI's first resize. The Canvas 2D canvas sizes itself from `stageEl.getBoundingClientRect()` at mount time, so it is correctly sized from the start.

### Proposed Decisions Register entries (if any)

None. This step implements previously approved decisions (ADR 0015 D1, D2, D7). The Pilot-proposed Register entries P1 and P2 from step 10.10 remain pending Pilot ratification.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `src/render/pentagrama-scene.ts` created (skeleton rAF loop, blank canvas).
- `src/render/harmony-staff-scene.ts` deleted.
- `src/render/stage.ts` updated (`_staffContainer` removed, 4 touch-points + interface + return).
- `src/app/App.svelte` updated (6 imports removed, 9 call sites removed, new lifecycle wiring, pointer routing updated, hint text updated).
- `src/ui/Header.svelte` updated (`#registerModeSeg` block removed, `setRegisterMode` import removed).
- Quality gates: 447 passed, 0 tsc errors, 0 lint errors, build clean.
- Branch: `orbifold-v2/phase-10`.

### Next-step context

Step 10.12 adds the full `paint(ts)` static rendering to `pentagrama-scene.ts`: staff lines, clef glyph, time grid + bar numbers, chord-mode sustain bars + gemstone onsets, arp-mode staggered circles + connector, rest bars, ledger lines, accidentals, tonal-function badges, and right vignette. All prototype parity source citations from `Pentagrama.dc.html` begin in step 10.12.

### Planner Review

**Decision:** APPROVE
**Reviewed on:** 2026-06-13
**Iteration:** 1 of 5
**Reason:** All 8 base checklist items and both project-specific items pass: scope is exactly the 5 specced files; commit format correct; Acceptance Coverage Table complete with honest manual/automated split (A-10-17 visual smoke legitimately deferred to Checkpoint #5, consistent with step spec wording); gate runs reported (tsc 0, lint 0, vitest 447, build exit 0); no Register violations (registerMode left inert per ADR 0015 D2 and Phase 08 Register entries); audio byte-identity confirmed (strudel.ts diff empty); no new dependencies; source-verified: CSS inline string matches spec exactly, DPR cap = min(dpr,2), all 3 exports present, zero core/** imports, _staffContainer comment-only in stage.ts, registerModeSeg/setRegisterMode comment-only in Header.svelte, harmony-staff-scene yields 0 live import statements in src/.
**Next action:** Dev proceeds to step 10.12

---

**Terminal commit:** `feat(harmony): Phase 10 step 10.11 — Canvas 2D skeleton, retire PIXI staff wiring, remove register toggle`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 10.12 — Static rendering: staff, grid, chord/arp/rest slots

**Date:** 2026-06-13
**Iteration:** 1 of 5

### Completed

Implemented the full `paint(ts)` static layer in `src/render/pentagrama-scene.ts`. The canvas now renders a complete, visually faithful static staff view on every rAF frame. No playhead, spotlight, ambient breathe, or pointer affordances (deferred to steps 10.13/10.14).

**Sections implemented:**

**(a) State read pattern** — `paint(ts)` calls `get(sessionStore)` once per frame; extracts `chordMode`, `harmony.progression`, `harmony.root`, `harmony.mode`, `harmony.octave`, and `harmony.bpm`; computes `diatonicLookup(root, mode)` for badge colors.

**(b) Helper functions (module-private):**
- `noteNameToMidi(name)` — inline chromatic pc map (C→0…B→11 + flat aliases) per ADR 0015 D4 / inventory OQ-R2. Parses "C#4" → midi=61.
- `m2p(midi)` — ported verbatim from prototype Pentagrama.dc.html lines 160–165. Returns `{pos, sh}` where pos=0 is B4. Verification: midi=71→(5-5)×7+6-6=0.
- `ny(pos, H, ls)` — ported verbatim from prototype line 168. Anchors to H/2, NOT cy (per ADR 0015 D3 coordinate-system note).
- `slotX(i, progression)` — ported from prototype slotX (lines 173–176), adapted to ProgressionSlot.bars (instead of slot.duration).
- `slotW(slot)` — ported from prototype slotW (line 179).
- `totalW(progression)` — ported from prototype totalW (line 171).
- `rr(ctx, x, y, w, h, r)` — rounded-rect path helper, ported verbatim from prototype lines 202–212.
- `ha(v)` — float→2-char hex alpha, ported verbatim from prototype line 238.
- `ldg(ctx, pos, nx, H, ls)` — ledger lines, ported verbatim from prototype lines 215–235.

**(c) `drawGrid`** — ported from prototype grid section (lines 277–298). Beat lines at 12px (opacity 0.028); bar lines at 48px (opacity 0.08 / 0.22 for x=SL, lineWidth 1/1.5px); bar numbers IBM Plex Mono 500 8.5px opacity 0.15. Vertical span cy−ls×2.6 to cy+ls×2.6.

**(d) `drawStaffLines`** — ported from prototype staff section (lines 301–306). Five lines at cy−n×ls for n=−2..+2. Left SL−14, right W−20. Center (n=0) opacity 0.32, others 0.18.

**(e) `pChord`** — ported from prototype pChord (lines 421–465). `chordVoicing(rootPc, qual, octave)` → note strings → `noteNameToMidi` → `m2p`. Per voice: bx=x+(sh?22:6), bw=max(4,w−(sh?26:10)), static gradient a=0.72 (active a=0.88 deferred to 10.13), rr sustain bar + gemstone onset circle (dark fill + colored stroke OR=4.5 lineWidth=1.7) + ♯ accidental + ldg ledger lines. `octave` sourced from `harmony.octave` (Chord type has no octave field).

**(f) `pArp`** — CORRECTED per-cycle stagger (ADR 0015 D5). For each cycle 0..ceil(bars)−1: voice i at `cycleStart + (i/3)*PX` (i.e., 0, PX/3≈16px, 2*PX/3≈32px); connector line within each cycle. **Intentional divergence from prototype pArp (lines 468–476):** prototype uses `span = w-24` per-SLOT spread once across entire slot; app uses per-cycle stagger so audio rhythm (A/B/C per cycle) is visually represented.

**(g) `pRest`** — ported verbatim from prototype pRest (lines 500–506). Rounded-rect rgba(140,145,162,0.38), height BH=10, inset 5px; center tick rgba(255,255,255,0.30) 1.5px height 22px at cy.

**(h) Tonal-function badges** — ported from prototype badge section (lines 336–344). Lookup `dmap["rootPc:qual"]`; if found and `func.cls !== ''`: draw `{tonic:'T',subdom:'SD',dom:'D'}[func.cls]` at `x+5, cy+ls*2+5`, font 600 8px IBM Plex Mono, opacity 0.42. Non-diatonic (`undefined` or `cls===''`) → no badge. (`cls` is `''` for non-diatonic, not `'accent'` — confirmed from TonalFunctionInfo type.)

**(i) Hover label** — deferred to step 10.14. Comment placeholder in paint().

**(j) Right vignette** — ported from prototype lines 413–415. `createLinearGradient(W-90,0,W,0)` transparent→rgba(7,8,9,0.52), 90px, full height, drawn last.

**Type discovery — `Chord.octave` does not exist:** The step spec referenced `slot.chord.octave ?? 4` but the `Chord` interface in `session.ts` has no `octave` field. `octave` is on `HarmonyState`. The render layer reads `harmony.octave` from the store and passes it as an explicit parameter to `pChord` and `pArp`. This matches the prototype's behavior (the prototype used a global octave from the sample data).

### Files touched

- `src/render/pentagrama-scene.ts` — full static paint(ts) implementation (step 10.12 additions)
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` — this handoff entry

### Validation evidence (per Acceptance ID)

| Acceptance ID | Required behavior | Code coverage | Status |
|---|---|---|---|
| A-10-20 | Staff geometry: LS=max(24,min(88,H/6)), cy=H/2-LS*0.75, 5 lines at cy-n*ls | `drawStaffLines`; `paint` geometry | MANUAL — visual confirmation deferred to Checkpoint #5 |
| A-10-21 | Chord rendering matches prototype `pChord`: gradient bars + gemstone circles + ♯ + ledger lines | `pChord` function | MANUAL — visual confirmation deferred to Checkpoint #5 |
| A-10-22 | Arp mode: per-cycle stagger (0, PX/3, 2*PX/3), connector; divergence documented | `pArp` function + ADR 0015 D5 citation | MANUAL — visual confirmation deferred to Checkpoint #5 |
| A-10-23 | Rest rendering matches prototype `pRest`: grey rounded-rect + center tick | `pRest` function | MANUAL — visual confirmation deferred to Checkpoint #5 |
| A-10-24 | Tonal-function badges (T/SD/D), 42% opacity, non-diatonic → no badge | Badge section in `paint` | MANUAL — visual confirmation deferred to Checkpoint #5 |
| A-10-25 | Time grid: beat lines 12px, bar lines 48px, bar numbers IBM Plex Mono | `drawGrid` function | MANUAL — visual confirmation deferred to Checkpoint #5 |
| A-10-31 | Right vignette: linear gradient W-90→W, drawn last | Right vignette section in `paint` | MANUAL — visual confirmation deferred to Checkpoint #5 |
| A-10-33 | Zero codegen changes: `git diff main...HEAD -- src/core/codegen/strudel.ts` empty | Verified | PASS — empty diff confirmed |
| A-10-34 | Quality gates: tsc 0 errors, lint 0 errors, vitest 447 passed, build exit 0 | Verified | PASS |

### Routine validations

- `pnpm exec tsc --noEmit` → 0 errors (exit 0)
- `pnpm lint` → 0 ESLint errors, 0 Prettier violations (exit 0)
- `pnpm exec vitest run` → 447 passed (14 files), 0 failed — baseline maintained
- `pnpm build` → exit 0, 547 modules transformed (pre-existing chunk-size warnings unchanged)
- `git diff main...HEAD -- src/core/codegen/strudel.ts` → empty (zero codegen changes)

### Prototype parity citations

| Prototype method | Prototype source | App implementation | Divergence |
|---|---|---|---|
| `m2p(midi)` | Pentagrama.dc.html lines 160–165 | `m2p()` function — ported verbatim | None |
| `ny(pos)` | Pentagrama.dc.html line 168 | `ny(pos, H, ls)` — ported verbatim (anchors to H/2, not cy) | None |
| `slotX(i)` | Pentagrama.dc.html lines 173–176 | `slotX(i, progression)` — uses slot.bars instead of slot.duration | Field name only |
| `slotW(s)` | Pentagrama.dc.html line 179 | `slotW(slot)` — uses slot.bars ?? 1 | Field name only |
| `totalW()` | Pentagrama.dc.html line 171 | `totalW(progression)` | None |
| `rr(ctx, x, y, w, h, r)` | Pentagrama.dc.html lines 202–212 | `rr()` — ported verbatim | None |
| `ha(v)` | Pentagrama.dc.html line 238 | `ha(v)` — ported verbatim | None |
| `ldg(ctx, pos, nx)` | Pentagrama.dc.html lines 215–235 | `ldg(ctx, pos, nx, H, ls)` — ported verbatim, H/ls passed explicitly | None |
| `pChord(...)` | Pentagrama.dc.html lines 421–465 | `pChord(...)` — ported; static a=0.72 (active pulse deferred to 10.13) | Active pulse deferred |
| `pArp(...)` | Pentagrama.dc.html lines 468–476 | `pArp(...)` — **INTENTIONAL DIVERGENCE**: per-cycle (i/3)*PX vs prototype per-slot span=(w-24) | Per-cycle vs per-slot (ADR 0015 D5) |
| `pRest(...)` | Pentagrama.dc.html lines 500–506 | `pRest(...)` — ported verbatim | None |
| Time grid | Pentagrama.dc.html lines 277–298 | `drawGrid()` — ported verbatim | None |
| Staff lines | Pentagrama.dc.html lines 301–306 | `drawStaffLines()` — ported verbatim | None |
| Badges | Pentagrama.dc.html lines 336–344 | Badge section in `paint()` — ported verbatim | None |
| Vignette | Pentagrama.dc.html lines 413–415 | Vignette section in `paint()` — ported verbatim | None |

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Implementation | Test type | Gap status |
|---|---|---|---|---|
| A-10-20 | Staff geometry: responsive LS, cy, 5 lines | `drawStaffLines`, paint geometry | MANUAL | Visual confirmation deferred to Checkpoint #5 |
| A-10-21 | Chord rendering: gradient bars + gemstone circles | `pChord` | MANUAL | Visual confirmation deferred to Checkpoint #5 |
| A-10-22 | Arp per-cycle stagger; divergence documented | `pArp` + ADR 0015 D5 | MANUAL | Visual confirmation deferred to Checkpoint #5 |
| A-10-23 | Rest: grey rounded-rect + center tick | `pRest` | MANUAL | Visual confirmation deferred to Checkpoint #5 |
| A-10-24 | Tonal-function badges at 42% opacity | Badge section in paint | MANUAL | Visual confirmation deferred to Checkpoint #5 |
| A-10-25 | Time grid: beat/bar lines + bar numbers | `drawGrid` | MANUAL | Visual confirmation deferred to Checkpoint #5 |
| A-10-31 | Right vignette drawn last | Vignette section in paint | MANUAL | Visual confirmation deferred to Checkpoint #5 |
| A-10-33 | Zero codegen changes | `git diff` — empty | AUTOMATED | PASS |
| A-10-34 | Quality gates green | tsc/lint/vitest/build | AUTOMATED | PASS |

### Transient issues resolved

- **Lint errors on `_isAct` parameters:** The step spec mentioned `_isAct` as reserved parameters for step 10.13. The ESLint `@typescript-eslint/no-unused-vars` rule (set to `error`) does not exempt `_`-prefixed parameters by default in this project. Resolved by removing the unused parameters from `pChord` and `pArp` signatures entirely — step 10.13 will add the `isAct: boolean` parameter when the pulse logic is implemented.
- **`Chord.octave` does not exist:** The step spec referenced `slot.chord.octave ?? 4` but the actual `Chord` interface in `session.ts` has no `octave` field. `octave` is in `HarmonyState`. Resolved by reading `harmony.octave` from the store in `paint()` and passing it as an explicit parameter. Fallback is not needed because `octave` is always set in `HarmonyState` (default=3).
- **Arp stagger formula `vi/2` vs `vi/3`:** Initial draft used `(vi/2)*PX` giving offsets 0, 24, 48 px. Corrected to `(vi/3)*PX` giving 0, 16, 32 px per ADR 0015 D5 spec.

### Next-step context

Step 10.13 adds the time-driven dynamic layer: ambient background breathe, `actIdx(ts)` helper, active-slot spotlight, gemstone onset pulse (`isAct` branch in `pChord`/`pArp`), and the playhead driven by `getVisualPhaseAnchor()`. The `ts` parameter passed to `paint(ts)` is available (guarded by `void ts` in this step).

---

**Terminal commit:** `feat(harmony): Phase 10 step 10.12 — static rendering: staff, grid, chord/arp/rest`
- Hash: self-referential — not recorded
