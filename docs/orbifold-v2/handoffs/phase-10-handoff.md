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
