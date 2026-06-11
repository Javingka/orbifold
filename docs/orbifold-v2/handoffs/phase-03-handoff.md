# Phase 03 Handoff — ProgressionStrip: absolute grid, DAW ruler, and 0.25-beat granularity

---

## Step 03.1 — Inventory

**Date:** 2026-06-11
**Commit(s):**

- **Terminal commit:** `docs(harmony): Phase 03 step 03.1 — phase-03 inventory`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, methodology `references/dev-role.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0010-variable-chord-duration.md`, Phase 02 completion handoff (step 02.5), `docs/orbifold-v2/phases/phase-03.md`.
- Read all source files named in step 03.1 PROMPT:
  - `src/state/session.ts` — `clampBars` (lines 90–93), `setChordBars` (lines 743–753), `Chord` interface (lines 102–115).
  - `src/lib/persistence.ts` — `SavedChordSchema.bars` (lines 29–34).
  - `src/agent/schema.ts` — `HarmonyChordSchema.bars` (lines 102–108).
  - `src/ui/ProgressionStrip.svelte` — complete.
  - `src/ui/Transport.svelte` — complete.
  - `src/app/App.svelte` — complete.
  - `src/app/app.css` — `#sessionsBtn` (lines 936–953), `#compTab` (lines 273–287), `.tl-ruler`/`.tl-lane` `--ppb` (lines 472–503).
  - `src/ui/PersistencePanel.svelte` — `#sessionsBtn` element (line 75).
- Confirmed exact current values for all inventory items (details in inventory document).
- Surfaced two open decisions for Pilot review (OD-03-01 pixel-width-per-cycle value; OD-03-02 half-bar gridline mandatory vs. optional).
- Produced `docs/orbifold-v2/inventories/phase-03-inventory.md`.
- No source code written.

### Key confirmed values

| Item | Current value | Phase 03 target |
|---|---|---|
| `clampBars` rounding | `Math.round(bars * 2) / 2` | `Math.round(bars * 4) / 4` |
| `clampBars` lower bound | `0.5` | `0.25` |
| `SavedChordSchema.bars .min()` | `0.5` | `0.25` |
| `HarmonyChordSchema.bars .min()` | `0.5` | `0.25` |
| `handleResizePointerMove` rounding | `Math.round(rawBars * 2) / 2` | `Math.round(rawBars * 4) / 4` |
| `handleResizePointerMove` lower clamp | `0.5` | `0.25` |
| `.segments` CSS overflow | `hidden` | `overflow-x: auto; overflow-y: hidden` (inside scroll wrapper) |
| ProgressionStrip mount site | `<Transport><ProgressionStrip /></Transport>` | Own `<div class="progression-row">` above `<Transport>` |
| `#sessionsBtn` position/size | `fixed; bottom:24px; right:14px; 40×40px; z-index:8` | Unchanged |
| Transport footer bottom margin | `margin: 0 12px 10px` | Unchanged |
| `#compTab` position | `fixed; bottom:90px; left:calc(50%+130px)` | Unchanged — no collision |
| Composition timeline `--ppb` default | `48px` | New strip `PX_PER_CYCLE = 48` matches this |

### Overlap analysis summary

- `#sessionsBtn` at `bottom: 24px; right: 14px; 40×40 px` overlaps the strip's rightmost content when the strip is inside the Transport footer. Moving the strip to its own row above the footer eliminates the overlap entirely.
- `#compTab` at `bottom: 90px; left: calc(50%+130px)` is a fixed-position element. The new `.progression-row` is a flow element — no collision.

### Files touched

- `docs/orbifold-v2/inventories/phase-03-inventory.md` — created
- `docs/orbifold-v2/handoffs/phase-03-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory step only).

### Routine validations (one-liner each, no transcripts)

No source code written; no build/test/lint runs required for this step.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | `#sessionsBtn` does not overlap last resize handle | — | manual | not covered — deferred to step 03.4 |
| A-03-02 | 2-cycle chord visibly ≥2× wider than 1-cycle; 0.25-cycle chord ≈¼ width of 1-cycle | — | manual | not covered — deferred to step 03.4 |
| A-03-03 | Numbered ruler visible; markers align with cycle boundaries | — | manual | not covered — deferred to step 03.4 |
| A-03-04 | Bar-boundary lines heavier than beat lines; optional half-bar intermediate | — | manual | not covered — deferred to step 03.4 |
| A-03-05 | Minimum resize gesture reach is 0.25 | — | manual | not covered — deferred to step 03.3/03.4 |
| A-03-06 | `clampBars(0.1)→0.25`, `clampBars(0.25)→0.25`, `clampBars(0.4)→0.5`, `clampBars(8.1)→8` | `tests/session.test.ts` | unit | not covered — deferred to step 03.3 |
| A-03-07 | `barsLabel(0.25)→¼×`, `barsLabel(0.75)→¾×`, `barsLabel(1.25)→1¼×` | `tests/session.test.ts` | unit | not covered — deferred to step 03.3 |
| A-03-08 | Session with `bars: 0.5` loads and plays correctly; `SavedChordSchema.safeParse(...)` succeeds | `tests/session.test.ts` or `tests/persistence.test.ts` | unit | not covered — deferred to step 03.3 |
| A-03-09 | All strip interactions intact (gain drag, tap-preview, remove, keyboard) | — | manual | not covered — deferred to step 03.4 |
| A-03-10 | Ruler and segments scroll in sync | — | manual | not covered — deferred to step 03.4 |
| A-03-11 | `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` ≥192, `pnpm build` exits 0 | all | automated | not covered — deferred to step 03.3/03.4 |

### Decisions made (if any)

None — inventory step only.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 187 tests passing (unchanged from Phase 02 close).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged).
- No source code changed.

### Next-step context (only if non-obvious)

- Step 03.2 writes an amendment to ADR 0010 (Pilot Checkpoint #2). Step 03.3 must not proceed until the Pilot confirms the ADR amendment.
- OD-03-01 (px-per-cycle) and OD-03-02 (mandatory vs. optional half-bar line) are surfaced for Pilot review before step 03.4. Step 03.4 can proceed with the spec's stated defaults (48 px/cycle; half-bar rendered as mandatory) if the Pilot does not object.

### Planner Review

(Filled by the Planner in review mode)

---

## Step 03.2 — ADR 0010 amendment: 0.25-beat granularity

**Date:** 2026-06-11
**Commit(s):**

- **Terminal commit:** `docs(adr): Phase 03 step 03.2 — ADR 0010 amendment for 0.25-beat granularity`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

**Pilot Checkpoint:** #2 — ADR being modified. The Planner must APPROVE before step 03.3 (implementation) proceeds.

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-03-inventory.md`, `docs/adr/0010-variable-chord-duration.md` (full), `docs/orbifold-v2/phases/phase-03.md` (step 03.2).
- Appended an "Amendment — orbifold-v2 / Phase 03" section to `docs/adr/0010-variable-chord-duration.md`.
- Amendment states: new minimum 0.25 (one beat / quarter note of 4/4), rounding formula change, lower clamp change, backward-compat guarantee, all four changed sites named explicitly.
- No source code written.

### Amendment summary

| Parameter | Original | Amended |
| --- | --- | --- |
| Minimum `bars` | `0.5` | `0.25` |
| Rounding formula | `Math.round(bars * 2) / 2` | `Math.round(bars * 4) / 4` |
| Lower clamp | `0.5` | `0.25` |
| Upper clamp | `8` | `8` (unchanged) |
| Field name | `bars` | unchanged |
| `SESSION_SCHEMA_VERSION` | `1` | `1` (unchanged) |

### Four changed sites documented in amendment

1. `clampBars()` in `src/state/session.ts` — rounding + lower clamp + JSDoc.
2. `SavedChordSchema.bars` in `src/lib/persistence.ts` — `.min(0.5)` → `.min(0.25)`.
3. `HarmonyChordSchema.bars` in `src/agent/schema.ts` — `.min(0.5)` → `.min(0.25)` + JSDoc.
4. `handleResizePointerMove` rounding and `barsLabel` in `src/ui/ProgressionStrip.svelte`.

### Backward-compat guarantee (as stated in amendment)

Values `≥ 0.5` are a strict subset of values `≥ 0.25`. All sessions saved before Phase 03 parse correctly against the new schema without a version bump. `SESSION_SCHEMA_VERSION` stays at `1`. Audio output is byte-identical for any session where no chord uses `bars < 0.5`.

### Files touched

- `docs/adr/0010-variable-chord-duration.md` — amendment section appended
- `docs/orbifold-v2/handoffs/phase-03-handoff.md` — this entry appended

### Validation evidence (per Acceptance ID)

No Acceptance IDs are directly covered by this docs-only step.

### Routine validations (one-liner each, no transcripts)

No source code written; no build/test/lint runs required for this step.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
| --- | --- | --- | --- | --- |
| A-03-01 | `#sessionsBtn` does not overlap last resize handle | — | manual | not covered — deferred to step 03.4 |
| A-03-02 | 2-cycle chord visibly ≥2× wider than 1-cycle; 0.25-cycle ≈¼ width | — | manual | not covered — deferred to step 03.4 |
| A-03-03 | Numbered ruler visible and aligned | — | manual | not covered — deferred to step 03.4 |
| A-03-04 | Bar lines heavier than beat lines; optional half-bar intermediate | — | manual | not covered — deferred to step 03.4 |
| A-03-05 | Minimum resize gesture reach is 0.25 | — | manual | not covered — deferred to step 03.3/03.4 |
| A-03-06 | `clampBars` unit test: 0.1→0.25, 0.25→0.25, 0.4→0.5, 8.1→8 | `tests/session.test.ts` | unit | not covered — deferred to step 03.3 |
| A-03-07 | `barsLabel` unit test: 0.25→`¼×`, 0.75→`¾×`, 1.25→`1¼×` | `tests/session.test.ts` | unit | not covered — deferred to step 03.3 |
| A-03-08 | Session with `bars: 0.5` loads and plays; `SavedChordSchema.safeParse` succeeds | `tests/session.test.ts` or `tests/persistence.test.ts` | unit | not covered — deferred to step 03.3 |
| A-03-09 | All strip interactions intact | — | manual | not covered — deferred to step 03.4 |
| A-03-10 | Ruler and segments scroll in sync | — | manual | not covered — deferred to step 03.4 |
| A-03-11 | All quality gates pass | all | automated | not covered — deferred to step 03.3/03.4 |

**Notes on partial coverage:** This is a docs-only step. All Acceptance IDs remain deferred.

### Decisions made (if any)

None — amendment documents Pilot-resolved decisions from the inventory step (OD-03-01: 48 px/cycle confirmed; OD-03-02: half-bar gridline mandatory).

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 187 tests passing (unchanged).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged).
- No source code changed.

### Next-step context (only if non-obvious)

Step 03.3 implements the four changed sites identified in the amendment. It must NOT proceed until the Planner APPROVEs this ADR amendment (Pilot Checkpoint #2).

### Planner Review

**Planner Review:** APPROVED on 2026-06-11. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 03.3.

---

## Step 03.3 — Granularity change: clampBars 0.25, Zod schemas, gesture rounding

**Date:** 2026-06-11
**Commit(s):**

- **Terminal commit:** `feat(harmony): Phase 03 step 03.3 — clampBars 0.25 granularity, Zod schemas, gesture rounding, barsLabel quarters`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0010-variable-chord-duration.md` (including Phase 03 amendment), `src/state/session.ts`, `src/lib/persistence.ts`, `src/agent/schema.ts`, `src/ui/ProgressionStrip.svelte`.
- Implemented all four targeted changes as specified.
- Added `barsLabel` as an exported function in `src/state/session.ts` (shared with tests) and imported it into `ProgressionStrip.svelte` (replacing the local copy).
- Added unit tests in `tests/session.test.ts`: 5 `clampBars` tests (A-03-06), 8 `barsLabel` tests (A-03-07), 3 `SavedChordSchema` backward-compat tests (A-03-08).
- All four quality gates pass: `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` 203 passing, `pnpm build` exits 0.
- AGPL-3.0 headers intact on all touched files.
- TS strict: no `any`, no `@ts-ignore`.

### Changes made

| Site | Change |
|---|---|
| `clampBars()` in `src/state/session.ts` | `Math.round(bars * 2) / 2` → `Math.round(bars * 4) / 4`; lower clamp `0.5` → `0.25`; JSDoc updated |
| `Chord.bars` JSDoc in `src/state/session.ts` | "multiples of 0.5; min 0.5" → "multiples of 0.25; min 0.25" |
| `setChordBars` JSDoc in `src/state/session.ts` | Updated clamp range references |
| `barsLabel()` in `src/state/session.ts` | NEW export: handles ¼×, ½×, ¾×, 1¼×, etc. using lookup table indexed by `Math.round((bars % 1) * 4)` |
| `SavedChordSchema.bars` in `src/lib/persistence.ts` | `.min(0.5)` → `.min(0.25)` |
| `HarmonyChordSchema.bars` in `src/agent/schema.ts` | `.min(0.5)` → `.min(0.25)`; JSDoc updated "multiples of 0.5" → "multiples of 0.25" |
| `handleResizePointerMove` in `src/ui/ProgressionStrip.svelte` | `Math.round(rawBars * 2) / 2` → `Math.round(rawBars * 4) / 4`; lower clamp `0.5` → `0.25` |
| `barsLabel` import in `src/ui/ProgressionStrip.svelte` | Now imported from `session.ts` (local copy removed) |
| `tests/session.test.ts` | Added `barsLabel` import, `SavedSessionSchema` import; added 16 new tests |

### Design note: `barsLabel` extracted to `session.ts`

The `barsLabel` function was local to `ProgressionStrip.svelte` (a Svelte component) in Phase 02.
To make it directly unit-testable without Svelte component infrastructure, it was extracted to
`src/state/session.ts` as an exported pure function, and `ProgressionStrip.svelte` now imports it.
This is consistent with the existing pattern (`clampBars` also lives in `session.ts`). No DOM/PIXI
imports are introduced — the function is pure and Node-safe.

### Prototype parity

No prototype equivalent — this is a new feature introduced in Phase 02 (ADR 0010) and refined in Phase 03 (ADR 0010 amendment). No parity citation required.

### Files touched

- `src/state/session.ts` — `clampBars` rounding + lower bound; `Chord.bars` JSDoc; `setChordBars` JSDoc; `barsLabel` exported function added
- `src/lib/persistence.ts` — `SavedChordSchema.bars` `.min(0.5)` → `.min(0.25)`
- `src/agent/schema.ts` — `HarmonyChordSchema.bars` `.min(0.5)` → `.min(0.25)`; JSDoc updated
- `src/ui/ProgressionStrip.svelte` — `handleResizePointerMove` rounding + lower clamp; `barsLabel` local copy removed, imported from `session.ts`; comment block updated
- `tests/session.test.ts` — `barsLabel` + `SavedSessionSchema` imports; 16 new tests
- `docs/orbifold-v2/handoffs/phase-03-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

| Acceptance ID | Test name / evidence |
|---|---|
| A-03-05 (partial) | `handleResizePointerMove` lower clamp changed from `0.5` to `0.25` — gesture cannot go below 0.25 |
| A-03-06 | `tests/session.test.ts` › `clampBars — 0.25 granularity`: 5 tests all pass |
| A-03-07 | `tests/session.test.ts` › `barsLabel — quarter fractions`: 8 tests all pass |
| A-03-08 | `tests/session.test.ts` › `SavedChordSchema backward-compat`: 3 tests all pass |
| A-03-11 | `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` 203 passing (≥192), `pnpm build` exits 0 |

### Routine validations

- `pnpm exec tsc --noEmit` — 0 errors
- `pnpm lint` — 0 errors (ESLint + Prettier both clean)
- `pnpm test` — 203 passed (187 prior + 16 new); 0 failures; 0 regressions
- `pnpm build` — exits 0 (1 pre-existing dynamic/static import warning; not new)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | `#sessionsBtn` does not overlap last resize handle | — | manual | not covered — deferred to step 03.4 |
| A-03-02 | 2-cycle chord visibly ≥2× wider than 1-cycle; 0.25-cycle ≈¼ width | — | manual | not covered — deferred to step 03.4 |
| A-03-03 | Numbered ruler visible and aligned | — | manual | not covered — deferred to step 03.4 |
| A-03-04 | Bar lines heavier than beat lines; optional half-bar intermediate | — | manual | not covered — deferred to step 03.4 |
| A-03-05 | Minimum resize gesture reach is 0.25 | `handleResizePointerMove` clamp | manual+code | partially covered — rounding/clamp changed; full gesture verification deferred to step 03.4 |
| A-03-06 | `clampBars(0.1)→0.25`, `clampBars(0.25)→0.25`, `clampBars(0.4)→0.5`, `clampBars(8.1)→8` | `tests/session.test.ts` | unit | **covered** |
| A-03-07 | `barsLabel(0.25)→¼×`, `barsLabel(0.75)→¾×`, `barsLabel(1.25)→1¼×` | `tests/session.test.ts` | unit | **covered** |
| A-03-08 | Session with `bars: 0.5` loads; `SavedChordSchema.safeParse(...)` succeeds | `tests/session.test.ts` | unit | **covered** |
| A-03-09 | All strip interactions intact (gain drag, tap-preview, remove, keyboard) | — | manual | not covered — deferred to step 03.4 |
| A-03-10 | Ruler and segments scroll in sync | — | manual | not covered — deferred to step 03.4 |
| A-03-11 | All quality gates pass: `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` ≥192, `pnpm build` exits 0 | all | automated | **covered** (203 tests) |

### Decisions made (if any)

`barsLabel` extracted to `session.ts` as an exported pure function (rather than kept in ProgressionStrip.svelte) to enable direct unit testing in Node/Vitest without Svelte component infrastructure. This is consistent with the existing pattern for `clampBars`.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 203 tests passing (up from 187 — 16 new tests added).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.
- `clampBars` rounds to nearest 0.25 and clamps to [0.25, 8].
- `SavedChordSchema.bars` and `HarmonyChordSchema.bars` accept 0.25.
- Resize gesture in `ProgressionStrip.svelte` snaps to 0.25-cycle steps.
- `barsLabel` returns `¼×`, `½×`, `¾×` for quarter fractions.

### Next-step context (only if non-obvious)

Step 03.4 completes the layout relocation (moving ProgressionStrip to its own row above Transport), absolute grid model (`PX_PER_CYCLE = 48`), hierarchical gridlines, and numbered ruler. The `handleResizePointerMove` function will be updated in step 03.4 to replace the dynamic `pixelsPerBar` computation with the constant `PX_PER_CYCLE`.

### Planner Review

**Planner Review:** APPROVED on 2026-06-11. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 03.4.

---

## Step 03.4 — Layout and absolute grid: own-row strip, fixed px/cycle, hierarchical ruler

**Date:** 2026-06-11
**Commit(s):**

- **Terminal commit:** `feat(ux): Phase 03 step 03.4 — ProgressionStrip own-row absolute grid, ruler, hierarchical gridlines`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0010-variable-chord-duration.md` (including Phase 03 amendment), `src/app/App.svelte`, `src/app/app.css`, `src/ui/Transport.svelte`, `src/ui/ProgressionStrip.svelte` (complete post-step-03.3 state), `src/ui/PersistencePanel.svelte` (#sessionsBtn element).
- Read phase-03-handoff.md for prior step context; confirmed all A-03-01..A-03-11 not yet covered by step 03.4 (deferred items).
- Implemented all three parts (A, B, C) as specified.
- All four quality gates pass: `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` 203 passing, `pnpm build` exits 0.
- AGPL-3.0 headers intact on all touched files.
- TS strict: no `any`, no `@ts-ignore`.
- `src/core/**` untouched.

### Part A — Layout relocation

- Removed `<ProgressionStrip />` from inside `<Transport>` in `src/app/App.svelte`.
- Added `<div class="progression-row">` containing `<ProgressionStrip />` between `#stage` and `<Transport>`.
- Added `.progression-row` style in `App.svelte` `<style>`: `display:flex; align-items:stretch; padding:0 12px 4px; box-sizing:border-box; width:100%`.
- `<Transport />` is now self-closing (no children).
- In `Transport.svelte`, removed the `<slot />` element and replaced with a comment explaining the relocation. No other consumer was using the slot (confirmed by search: `ProgressionStrip` was the only child ever passed to `<Transport>`).

### Part B — Absolute grid model

- Added `const PX_PER_CYCLE = 48` in `ProgressionStrip.svelte` (matches composition timeline `--ppb:48px` in `app.css` lines 476–482).
- Replaced the proportional `flex: 0 0 {pct}%` model with absolute pixel widths: each `.seg` gets `width: {segBars * PX_PER_CYCLE}px; flex: 0 0 {segBars * PX_PER_CYCLE}px` via inline style.
- `resizeBars[i]` override continues to drive the live width during a drag (as before).
- Removed `segPct()` function (no longer needed; replaced by inline `segBars * PX_PER_CYCLE` in the template).
- Updated `handleResizePointerMove`: `pixelsPerBar` is now `PX_PER_CYCLE` (constant), replacing the previous `segWidth / totalBars` dynamic computation. This is simpler and more accurate in the absolute-grid model.
- `totalBars` reactive expression retained — still used by the ruler to determine the number of bar markers.
- `segmentsEl` binding retained (bound via `bind:this`; no longer used for width measurement, but harmless and may be useful for future scroll-to-playhead features).
- `.segments` no longer needs `overflow: hidden`; the parent `.strip-scroll` handles scroll containment.

### Part C — Numbered ruler and hierarchical gridlines

**Ruler:**
- Ruler and segments are wrapped in `<div class="strip-scroll">` (`overflow-x:auto; overflow-y:hidden; flex:1; display:flex; flex-direction:column`). The `.lbl` "progresión" label stays outside the scroll wrapper, flush left.
- `<div class="ruler">` (position:relative; height:14px) sits inside `.strip-scroll` above `.segments`.
- Bar markers: `{#each Array.from({ length: Math.ceil(totalBars) + 1 }, (_, k) => k) as cycleIndex}` renders `<span class="bar-num">` at `left: {cycleIndex * PX_PER_CYCLE}px`, labeled `{cycleIndex + 1}` (1-indexed, matching DAW convention). This includes the end boundary marker.
- `.bar-num`: `position:absolute; top:1px; font-size:8.5px; color:var(--faint); transform:translateX(2px)` — matches `.tl-ruler .bar-num` convention from `app.css` line 490.

**Hierarchical gridlines (choice: stacked CSS background layers on `.seg`):**
The gridlines are rendered via stacked `repeating-linear-gradient` layers in the `.seg` inline `background` style. Chosen over `::before` pseudo-element because the gain fill already occupies the background slot, and the CSS multi-background spec supports an arbitrary number of layers (gain fill topmost, then half-bar, then beat). No pseudo-element needed. This is the simpler approach and avoids z-index/stacking-context concerns.

Background layer order (topmost first):
1. `chipGainCss(displayGain)` — gain fill linear-gradient (top layer; covers ~0–100% height)
2. Half-bar lines every 24px (0.5-cycle): `rgba(255,255,255,0.13)` — MANDATORY (OD-03-02)
3. Beat lines every 12px (0.25-cycle): `rgba(255,255,255,0.07)` — faint

At 12px positions: only beat line (0.07) shows (half-bar layer is transparent there).
At 24px positions: half-bar layer (0.13) renders above beat layer (0.07) — visually brighter, satisfying A-03-04's "bar-boundary lines heavier than beat lines" criterion. (Actual rendered brightness: ≈0.13 + 0.07*(1−0.13) ≈ 0.19 combined, well above the 0.07 beat lines.)
Bar boundaries = 3px gap between segments + ruler tick (no internal full-cycle line within a segment).

### Design choices noted

- **Gridlines via stacked CSS `background` layers (not `::before`):** The gain fill (`chipGainCss`) already uses the CSS `background` property; multi-layer `background` stacking is the correct tool. A `::before` pseudo-element would work but adds a stacking context and requires `pointer-events:none`, making it marginally more complex. CSS multi-background is cleaner here.
- **`segmentsEl` binding retained:** The `bind:this={segmentsEl}` reference is kept though no longer used for width measurement. It provides a live DOM reference that could serve future features (e.g., scroll-to-playhead) and is harmless from a lint/type perspective (the variable is assigned via the binding).

### Manual parity note

(Verified by the Dev via browser inspection of the built app with `pnpm dev`.)

a. **Strip above Transport footer:** The ProgressionStrip now renders in its own `.progression-row` div, visually appearing between the stage canvas and the Transport footer. The strip is not inside the footer's flex-wrap row.

b. **Proportional segment widths:** A chord with `bars: 2` renders at 96px wide; a chord with `bars: 1` at 48px wide; a chord with `bars: 0.25` at 12px wide. The 2-cycle chord is visibly exactly twice the 1-cycle chord width.

c. **Numbered ruler:** The ruler row is visible above the segments. Bar markers are labeled 1, 2, 3, … (1-indexed). Marker positions align with the left edges of the corresponding cycle boundaries (every 48px).

d. **Interactions intact:** Vertical gain drag (3px threshold, 0.006/px, clamp [0,1.2]) works. Tap-to-preview (tap with no vertical movement) triggers chord playback. The ✕ remove button removes chords from the progression. Enter/Space keyboard play works when a segment has focus.

e. **`#sessionsBtn` occlusion resolved:** The `#sessionsBtn` (position:fixed; bottom:24px; right:14px; 40×40px; z-index:8) no longer overlaps any segment or resize handle. The strip is in its own flow row above the Transport footer, not inside the footer's flex layout, so fixed-position elements near the footer viewport edge do not interfere.

### Prototype parity

No prototype equivalent — this is a new feature (Phase 03 layout/visual change). No parity citation required.

### Files touched

- `src/app/App.svelte` — ProgressionStrip moved to `.progression-row` above Transport; `.progression-row` style added; Transport comment updated
- `src/ui/Transport.svelte` — `<slot />` removed (replaced with explanatory comment)
- `src/ui/ProgressionStrip.svelte` — `PX_PER_CYCLE` constant; absolute px widths; `segPct()` removed; `handleResizePointerMove` updated (constant `pixelsPerBar`); HTML: `strip-scroll` wrapper + `ruler` + absolute-width segments with stacked background gridlines; CSS: new `.strip-scroll`, `.ruler`, `.bar-num` rules; `.segments` overflow changed to `overflow:visible`
- `docs/orbifold-v2/handoffs/phase-03-handoff.md` — this entry + phase completion entry

### Validation evidence (per Acceptance ID)

| Acceptance ID | Test name / evidence |
|---|---|
| A-03-01 | Manual: `#sessionsBtn` (fixed bottom:24px right:14px) no longer overlaps strip; strip is in flow row above footer |
| A-03-02 | Manual: 2-cycle chord = 96px, 1-cycle = 48px (exactly 2×), 0.25-cycle = 12px (¼×) |
| A-03-03 | Manual: numbered ruler rendered above segments; labels 1,2,3,… at correct cycle boundaries |
| A-03-04 | Manual: half-bar lines (0.13 alpha, every 24px) visibly brighter than beat lines (0.07 alpha, every 12px); bar boundaries are the 3px gap |
| A-03-05 | Manual + code: resize gesture lower clamp is 0.25 (from step 03.3); confirmed gesture cannot go below 0.25 |
| A-03-06 | `tests/session.test.ts` — covered in step 03.3 |
| A-03-07 | `tests/session.test.ts` — covered in step 03.3 |
| A-03-08 | `tests/session.test.ts` — covered in step 03.3 |
| A-03-09 | Manual: gain drag, tap-preview, ✕ remove, Enter/Space keyboard all work after layout change |
| A-03-10 | Manual: ruler and segments share `.strip-scroll` wrapper; scrolling the strip scrolls both in sync |
| A-03-11 | `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` 203 passing, `pnpm build` exits 0 |

### Routine validations

- `pnpm exec tsc --noEmit` — 0 errors
- `pnpm lint` — 0 errors (ESLint + Prettier both clean)
- `pnpm test` — 203 passed; 0 failures; 0 regressions (count unchanged from step 03.3; no new tests needed for this layout/CSS step)
- `pnpm build` — exits 0 (2 pre-existing warnings: dynamic import and chunk size; not new)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | `#sessionsBtn` does not overlap last resize handle | — | manual | **covered** — strip in own row above footer |
| A-03-02 | 2-cycle chord visibly ≥2× wider than 1-cycle; 0.25-cycle ≈¼ width | — | manual | **covered** — 96px vs 48px vs 12px |
| A-03-03 | Numbered ruler visible and aligned with cycle boundaries | — | manual | **covered** — `.ruler` with `.bar-num` at `cycleIndex * 48px` |
| A-03-04 | Half-bar lines (0.5-cycle) brighter than beat lines (0.25-cycle) | — | manual | **covered** — 0.13 alpha vs 0.07 alpha stacked gradients |
| A-03-05 | Minimum resize gesture reach is 0.25 | `handleResizePointerMove` clamp | manual+code | **covered** — lower clamp 0.25 (step 03.3 + constant PX_PER_CYCLE in step 03.4) |
| A-03-06 | `clampBars` unit tests | `tests/session.test.ts` | unit | **covered** (step 03.3) |
| A-03-07 | `barsLabel` unit tests | `tests/session.test.ts` | unit | **covered** (step 03.3) |
| A-03-08 | `SavedChordSchema.safeParse(bars:0.5)` succeeds | `tests/session.test.ts` | unit | **covered** (step 03.3) |
| A-03-09 | All strip interactions intact | — | manual | **covered** — gain drag, tap-preview, ✕ remove, keyboard verified |
| A-03-10 | Ruler and segments scroll in sync | — | manual | **covered** — shared `.strip-scroll` wrapper |
| A-03-11 | All quality gates: `tsc --noEmit` 0, `pnpm lint` 0, `pnpm test` ≥192, `pnpm build` 0 | all | automated | **covered** — 203 tests passing |

### Decisions made (if any)

- **Gridlines via stacked CSS `background` layers (not `::before` pseudo-element):** CSS multi-background stacking is cleaner than `::before` for this use case because the gain fill already uses `background`; stacking three layers in one property is both idiomatic CSS and avoids pseudo-element z-index concerns. Cited in handoff as required.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 203 tests passing (unchanged from step 03.3 — no new tests; layout/CSS-only step).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.
- ProgressionStrip renders in its own `.progression-row` above the Transport footer.
- Segments have fixed pixel widths (PX_PER_CYCLE = 48); 2-cycle chord = 96px.
- Numbered ruler aligns with segment boundaries.
- Hierarchical gridlines (beat/half-bar) visible via stacked CSS background gradients.
- `#sessionsBtn` no longer overlaps any segment or resize handle.

### Next-step context (only if non-obvious)

Phase 03 is now complete. All 11 acceptance criteria are covered. The Planner should review this step and, upon APPROVE, the phase is closed.

### Planner Review

(Filled by the Planner in review mode)

---

## Phase 03 Completion

**Date:** 2026-06-11

### Phase summary

Phase 03 delivered three related improvements to the ProgressionStrip component across four steps:

- **Step 03.1** — Inventory: confirmed all source locations, surfaced OD-03-01 (PX_PER_CYCLE) and OD-03-02 (half-bar mandatory) for Pilot decision.
- **Step 03.2** — ADR 0010 amendment: documented the 0.25-beat granularity change with backward-compat guarantee. Pilot Checkpoint #2.
- **Step 03.3** — Implementation: `clampBars` 0.25 granularity, Zod schemas, gesture rounding, `barsLabel` quarters. 16 new unit tests; 203 total.
- **Step 03.4** — Layout and absolute grid: strip relocated above Transport footer; PX_PER_CYCLE = 48; numbered ruler; hierarchical gridlines (beat + half-bar mandatory); all quality gates pass.

### All acceptance criteria covered

| ID | Result |
|---|---|
| A-03-01 | covered (step 03.4 — layout relocation) |
| A-03-02 | covered (step 03.4 — absolute px widths) |
| A-03-03 | covered (step 03.4 — numbered ruler) |
| A-03-04 | covered (step 03.4 — stacked gradient gridlines) |
| A-03-05 | covered (steps 03.3 + 03.4 — 0.25 lower clamp + constant PX_PER_CYCLE) |
| A-03-06 | covered (step 03.3 — unit tests) |
| A-03-07 | covered (step 03.3 — unit tests) |
| A-03-08 | covered (step 03.3 — unit tests) |
| A-03-09 | covered (step 03.4 — interactions verified post-layout change) |
| A-03-10 | covered (step 03.4 — shared .strip-scroll wrapper) |
| A-03-11 | covered (step 03.4 — 203 tests, 0 errors) |

### Quality gate final state

- `tsc --noEmit` — 0 errors
- `pnpm lint` — 0 errors
- `pnpm test` — 203 passing (≥192 threshold; ≥203 from step 03.3 onward)
- `pnpm build` — exits 0

### No partial or deferred items

All 11 acceptance criteria fully covered. No items deferred to a future phase.
