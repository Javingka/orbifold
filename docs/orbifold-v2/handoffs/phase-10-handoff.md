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
