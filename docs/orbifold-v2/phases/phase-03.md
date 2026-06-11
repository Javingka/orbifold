# Phase 03 — ProgressionStrip: absolute grid, DAW ruler, and 0.25-beat granularity

**Purpose:** Overhaul the ProgressionStrip to show chord duration in absolute time (a fixed pixel-width-per-cycle grid with a numbered bar ruler and hierarchical gridlines), change the minimum resize step from 0.5 to 0.25, relocate the strip to its own full-width row above the Transport footer, and eliminate the floating-save-button occlusion of the last resize handle.
**Gate:** orbifold-v2 Phase 02 complete and Pilot-approved on the `orbifold-v2/phase-02` branch (all nine A-02-xx criteria covered, 187 tests passing, `tsc --noEmit` / `pnpm lint` / `pnpm build` all exit 0); Pilot has created `orbifold-v2/phase-03` from the Phase 02 branch.
**Expected phase result:** The ProgressionStrip occupies its own full-width row above the Transport footer with a visible numbered cycle ruler; each chord segment is drawn at a fixed pixel-width per cycle so a 2-cycle chord is visibly twice as wide as a 1-cycle chord; bar boundaries draw a thick line, beat (0.25-cycle) boundaries draw a thin line, half-bar (0.5-cycle) boundaries draw a medium line; the minimum chord duration is 0.25 (one beat); sessions saved with the old 0.5 minimum load and play correctly; all existing strip interactions (gain drag, tap-preview, remove, keyboard) are unaffected; the last segment's resize handle is never occluded by the `#sessionsBtn`; ADR 0010 is amended to record the 0.25 granularity decision; all quality gates pass.

---

## Step 03.1 — Inventory

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, the Phase 02 completion handoff (step 02.5), and `docs/adr/0010-variable-chord-duration.md`. Then read, in full: `src/ui/ProgressionStrip.svelte` (complete), `src/ui/Transport.svelte` (complete), `src/app/App.svelte` (complete), `src/app/app.css` (search `#sessionsBtn`, `#compTab`, transport footer margins), `src/ui/PersistencePanel.svelte` (only the `#sessionsBtn` element and its button; do not read the full panel logic), `src/state/session.ts` (`clampBars` function, `setChordBars` function, `Chord` interface — these three items only), `src/lib/persistence.ts` (`SavedChordSchema.bars` entry only), and `src/agent/schema.ts` (`HarmonyChordSchema.bars` entry only). Produce `docs/orbifold-v2/inventories/phase-03-inventory.md`. Do not write source code.

Implementation requirements:
- Confirm `clampBars` in `src/state/session.ts` (line range): state the exact current rounding expression (`Math.round(bars * 2) / 2`) and the current lower bound (`0.5`). Phase 03 changes both.
- Confirm `SavedChordSchema.bars` in `src/lib/persistence.ts`: state the exact current `.min(0.5)` value. Phase 03 changes it to `.min(0.25)`.
- Confirm `HarmonyChordSchema.bars` in `src/agent/schema.ts`: state the exact current `.min(0.5)` value. Phase 03 changes it to `.min(0.25)`.
- Confirm the current mount site of `ProgressionStrip`: note that it is rendered as `<ProgressionStrip />` inside `<Transport>` via a `<slot />` in `Transport.svelte` (line 206), and that `Transport.svelte` wraps it in a `<footer class="glass">` with `flex-wrap: wrap`. Note the exact CSS structure of the `.strip` and `.segments` elements in `ProgressionStrip.svelte` (lines 420–450 approximately).
- Confirm the exact `#sessionsBtn` positioning: `position: fixed; bottom: 24px; right: 14px; z-index: 8` from `src/app/app.css` (line range approx 936–953). Confirm the button size (40 × 40 px).
- Confirm the Transport footer bottom margin and border-radius from `Transport.svelte`: `margin: 0 12px 10px; border-radius: 18px`. Calculate the footer's approximate bottom edge: the footer sits 10 px from the viewport bottom edge. The `#sessionsBtn` is 24 px from the bottom, 14 px from the right — confirm it overlaps the strip when the strip is inside the footer.
- Note the `#compTab` position (`bottom: 90px; left: calc(50% + 130px)`) from `app.css` — confirm that moving the strip out of the footer to its own row above the footer does NOT collide with `#compTab`, which is keyed off `bottom: 90px` and a distinct horizontal position.
- Note that `src/core/codegen/strudel.ts` (codegen) is NOT touched in Phase 03 — the `arrange()` / slowcat dual-mode output is unchanged. The granularity change affects only the store clamp and the UI gesture rounding.
- Surface any open decisions for Pilot review, particularly: the exact pixel-width-per-cycle value (e.g., 48 px/cycle, scrollable), and whether a medium-weight line at the 0.5-half-bar boundary is mandatory or optional.

Validation:
- No source code written.

Expected result:
- `docs/orbifold-v2/inventories/phase-03-inventory.md` present and complete.

CHECKPOINT → Commit message:
`docs(harmony): Phase 03 step 03.1 — phase-03 inventory`

---

## Step 03.2 — ADR 0010 amendment: 0.25-beat granularity

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-03-inventory.md`, and `docs/adr/0010-variable-chord-duration.md` in full. Write an amendment section to ADR 0010 at the end of the file (or a short new ADR 0011 if the convention prefers a new record). Do not write source code.

Implementation requirements:
- The amendment must state: the new minimum is 0.25 (one beat / quarter note of a 4/4 bar), up from 0.5. The rounding formula changes from `Math.round(bars * 2) / 2` to `Math.round(bars * 4) / 4`. The lower clamp bound changes from `0.5` to `0.25`. Upper bound and field name are unchanged.
- The amendment must state the backward-compatibility guarantee: values ≥ 0.25 subsume all values ≥ 0.5, so sessions saved under the old 0.5 minimum parse and play correctly without a schema version bump. `SESSION_SCHEMA_VERSION` stays at 1.
- The amendment must reference each changed site: `clampBars()` in `src/state/session.ts`, `SavedChordSchema.bars` `.min()` in `src/lib/persistence.ts`, `HarmonyChordSchema.bars` `.min()` in `src/agent/schema.ts`, the resize gesture rounding in `ProgressionStrip.svelte`.
- ADR convention for this project: ADRs are normally superseded for large reversals; a documented amendment appended to the same ADR is acceptable for a single parameter change (per the phase prompt directive). Use an amendment section appended to ADR 0010 with date and initiative/phase header. No new ADR number is needed unless the inventory step surfaces a compelling reason.
- This step is a Pilot Checkpoint (#2 — ADR being modified). The handoff must make this explicit.

Validation:
- No source code written.

Expected result:
- `docs/adr/0010-variable-chord-duration.md` has a new "Amendment — Phase 03, 2026-06-10" section at the end.

CHECKPOINT → Commit message:
`docs(adr): Phase 03 step 03.2 — ADR 0010 amendment for 0.25-beat granularity`

---

## Step 03.3 — Granularity change: clampBars 0.25, Zod schemas, gesture rounding

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0010-variable-chord-duration.md` (including the Phase 03 amendment from step 03.2), `src/state/session.ts` (complete), `src/lib/persistence.ts` (complete), `src/agent/schema.ts` (complete), and `src/ui/ProgressionStrip.svelte` (specifically the `handleResizePointerMove` function and the `barsLabel` helper). Implement the four targeted changes listed below. Do not touch codegen (`src/core/codegen/strudel.ts`) or layout; that is Phase 03 step 03.4.

Implementation requirements:
- **`clampBars` in `src/state/session.ts`:** Change `Math.round(bars * 2) / 2` to `Math.round(bars * 4) / 4`. Change the lower clamp bound from `0.5` to `0.25`. Upper bound stays `8`. Update the JSDoc comment to reflect the new step (0.25) and minimum (0.25).
- **`SavedChordSchema.bars` in `src/lib/persistence.ts`:** Change `.min(0.5)` to `.min(0.25)`. Update the surrounding JSDoc/comment if present.
- **`HarmonyChordSchema.bars` in `src/agent/schema.ts`:** Change `.min(0.5)` to `.min(0.25)`. Update the surrounding JSDoc/comment if present.
- **`handleResizePointerMove` in `src/ui/ProgressionStrip.svelte`:** Change the inline rounding from `Math.round(rawBars * 2) / 2` and the lower clamp from `0.5` to use `Math.round(rawBars * 4) / 4` and a lower clamp of `0.25`. Upper clamp stays `8`.
- **`barsLabel` helper in `src/ui/ProgressionStrip.svelte`:** Extend to handle 0.25 and 0.75. The current helper returns `½×` for 0.5 and treats only whole + half fractions. Extend to produce: `¼×` for 0.25, `½×` for 0.5, `¾×` for 0.75, `1¼×` for 1.25, `1½×` for 1.5, `1¾×` for 1.75, and so on for all multiples of 0.25. Return `''` for bars===1 or undefined (unchanged). The fraction indicators to add: `¼` (0.25), `½` (0.5), `¾` (0.75). Implementation note: a lookup table `['', '¼', '½', '¾']` indexed by `Math.round((bars % 1) * 4)` works cleanly and avoids floating-point fragility.
- **Tests:** Add unit tests in `tests/session.test.ts` for the new `clampBars` behavior: 0.25 round-trip (exact), 0.1 → 0.25 (minimum clamp), 0.3 → 0.25 (nearest 0.25), 0.4 → 0.5 (nearest 0.25), 8.1 → 8 (upper clamp). Add 2–3 tests for `barsLabel` covering the new quarter fractions (0.25 → `¼×`, 0.75 → `¾×`, 1.25 → `1¼×`).
- AGPL-3.0 headers intact on all touched files.
- TS strict: no `any`, no `@ts-ignore`.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all prior tests pass; new tests pass; count ≥ 192 (187 prior + 5 new minimum).
- `pnpm build` — exits 0.

Expected result:
- `clampBars` rounds to nearest 0.25 and clamps to [0.25, 8].
- `SavedChordSchema.bars` and `HarmonyChordSchema.bars` accept 0.25.
- The resize gesture in `ProgressionStrip.svelte` snaps to 0.25-cycle steps.
- `barsLabel` returns `¼×`, `½×`, `¾×` for quarter fractions.

CHECKPOINT → Commit message:
`feat(harmony): Phase 03 step 03.3 — clampBars 0.25 granularity, Zod schemas, gesture rounding, barsLabel quarters`

---

## Step 03.4 — Layout and absolute grid: own-row strip, fixed px/cycle, hierarchical ruler

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0010-variable-chord-duration.md` (including the Phase 03 amendment), `src/app/App.svelte` (complete), `src/app/app.css` (complete), `src/ui/Transport.svelte` (complete), `src/ui/ProgressionStrip.svelte` (complete), and `src/ui/PersistencePanel.svelte` (the `#sessionsBtn` button and its immediate style, lines 75–77). Implement the layout relocation, absolute grid model, hierarchical gridlines, and numbered ruler. Preserve all existing ProgressionStrip interactions without modification.

Implementation requirements:

**Layout relocation:**
- Remove `<ProgressionStrip />` from the `<Transport>` slot in `src/app/App.svelte`.
- Add a new `<div class="progression-row">` in `App.svelte`, placed ABOVE the `<Transport>` component (i.e., between `#stage` and `<Transport>`), containing `<ProgressionStrip />`. The `.progression-row` is a full-width flex row (`width: 100%; padding: 0 12px 4px; box-sizing: border-box`). This places the strip structurally above the Transport footer, clearing the `#sessionsBtn` fixed button entirely.
- In `Transport.svelte`, the `<slot />` may now be left empty or removed. Confirm the slot removal does not affect other consumers. (If no other component uses the slot, removing the `<slot />` line is clean; if it is used elsewhere, leave it and it renders nothing.)
- Add `.progression-row` style in `App.svelte`'s `<style>` block: `display: flex; align-items: stretch; padding: 0 12px 4px; box-sizing: border-box;` so `ProgressionStrip` fills full width. The strip must NOT receive `flex: 1` from the `<footer>` row anymore — it is now an independent row in the `#app` flex column.

**Absolute grid model in `ProgressionStrip.svelte`:**
- Replace the normalized-fill (`flex: 0 0 {pct}%`) model with an absolute pixel model.
- Define a constant `PX_PER_CYCLE = 48` (pixels per Strudel cycle). This matches the existing `--ppb: 48px` value used by `.tl-ruler` / `.tl-lane` in the composition timeline (`app.css` lines 476–482), making the two timelines visually consistent.
- Each segment gets `width: {(ch.bars ?? 1) * PX_PER_CYCLE}px; flex: 0 0 {(ch.bars ?? 1) * PX_PER_CYCLE}px` so a 2-cycle chord is 96 px wide and a 0.25-cycle chord is 12 px wide.
- During a resize drag, use `resizeBars[i]` in place of `ch.bars ?? 1` for the live width of segment i (the live override, as before).
- The `.segments` container switches from `overflow: hidden` to `overflow-x: auto; overflow-y: hidden` so the strip scrolls horizontally when the total loop width exceeds the viewport.
- The `segmentsEl` reference and `pixelsPerBar` computation in `handleResizePointerMove` change: `pixelsPerBar` is now the constant `PX_PER_CYCLE` (not derived from container width / totalBars). This simplifies the gesture math significantly. Update `handleResizePointerMove` accordingly.
- `totalBars` is still computed for the ruler but is no longer used for `segPct`. Keep the reactive `$: totalBars` expression.
- The `.strip` outer container keeps `flex: 1; min-width: 0; overflow: hidden` but the `.segments` child now scrolls independently.

**Hierarchical gridlines:**
- Each segment `<div class="seg">` renders internal gridline markers as a CSS background using `repeating-linear-gradient`. Two passes:
  - Beat lines (0.25-cycle): `repeating-linear-gradient(to right, transparent 0, transparent calc(${PX_PER_CYCLE/4}px - 1px), rgba(255,255,255,0.07) calc(${PX_PER_CYCLE/4}px - 1px), rgba(255,255,255,0.07) ${PX_PER_CYCLE/4}px)` — the faint beat gridline at 12 px intervals.
  - Half-bar lines (0.5-cycle): overridden by a brighter stripe at every 24 px — `repeating-linear-gradient(to right, transparent 0, transparent calc(${PX_PER_CYCLE/2}px - 1px), rgba(255,255,255,0.13) calc(${PX_PER_CYCLE/2}px - 1px), rgba(255,255,255,0.13) ${PX_PER_CYCLE/2}px)`.
  - Full-cycle (bar) boundaries are handled by the gap between segments (3 px gap) plus the ruler, not by an internal gridline. Within a segment, no full-cycle internal line is drawn — the bar boundary IS the segment edge.
  - Stack both gradients on the chip background: `background: {chipGainCss(displayGain)}, <beat-gradient>, <half-bar-gradient>`. (CSS `background` accepts comma-separated layers; the gain fill is the topmost layer.)
- Alternatively, the gridlines may be rendered via a single SVG or a `::before` pseudo-element if the CSS stacking approach creates test/lint issues — Dev chooses whichever is cleaner to implement, citing rationale in the handoff.

**Numbered bar ruler:**
- Above the `.segments` container (inside the `.strip` div, between the `.lbl` label and `.segments`), add a `<div class="ruler">` that renders bar numbers.
- The ruler has `display: flex; flex: 1; min-width: 0; overflow: hidden` (it scrolls with `.segments` — see note below).
- Each position marker is a `<span class="bar-num">` absolutely positioned at `left: {cycleIndex * PX_PER_CYCLE}px` for cycles 0, 1, 2, … up to `Math.ceil(totalBars)`. Show numbers 1, 2, 3, … (1-indexed, matching DAW convention). The ruler container is `position: relative; height: 14px`.
- The ruler and the `.segments` row must scroll in sync. Implement this by wrapping both ruler and segments in a shared `<div class="strip-scroll">` container (`overflow-x: auto; overflow-y: hidden; flex: 1`) and placing the ruler and segments inside it as a flex column (ruler on top, segments below). Only the wrapper scrolls; ruler and segments are not independently scrollable.
- The `.lbl` "progresión" label stays outside the scroll wrapper, flush left.

**Preserve all existing interactions unchanged:**
- The gain-drag gesture (`handlePointerDown`, `handlePointerMove`, `handlePointerUp`) is not modified in this step beyond the `pixelsPerBar` constant change in `handleResizePointerMove`. All gain logic, threshold (3 px), step (0.006/px), clamp ([0, 1.2]) is unchanged.
- Tap-to-preview, remove (✕), keyboard (Enter/Space) are unchanged.
- The resize gesture (`handleResizePointerDown`, `handleResizePointerMove`, `handleResizePointerUp`) is structurally unchanged except `pixelsPerBar` becomes the constant `PX_PER_CYCLE` (simpler, more accurate in the absolute-grid model).
- The `barsLabel` helper (updated in step 03.3) continues to show the live resize label.
- AGPL-3.0 headers intact on all modified files.
- TS strict: no `any`, no `@ts-ignore`.
- `src/core/**` is untouched (no codegen changes).

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all prior tests pass (no regressions); count ≥ prior step count.
- `pnpm build` — exits 0.
- Manual parity note required in handoff: describe (a) strip is now above Transport footer in the live app, (b) a 2-cycle chord is visibly wider than a 1-cycle chord, (c) numbered ruler is visible, (d) gain drag, tap-preview, and remove still work, (e) `#sessionsBtn` does not occlude any segment or handle.

Expected result:
- ProgressionStrip renders as its own full-width row above the Transport footer.
- Segments have fixed pixel widths proportional to their absolute cycle count.
- The strip scrolls horizontally when the total loop is wide.
- A numbered bar ruler aligns with the segments.
- Hierarchical gridlines (beat/half-bar) are visible within each segment.
- The floating `#sessionsBtn` no longer overlaps any segment.

CHECKPOINT → Commit message:
`feat(ux): Phase 03 step 03.4 — ProgressionStrip own-row absolute grid, ruler, hierarchical gridlines`

---

## Phase Acceptance

Each criterion has a unique ID used in handoff Acceptance Coverage Tables:

- **A-03-01** — The last chord's `.resize-handle` is fully visible and interactive; the `#sessionsBtn` (`position: fixed; bottom: 24px; right: 14px; z-index: 8`) does not overlap it.
  - Validation method: `manual`

- **A-03-02** — A chord with `bars: 2` renders visibly wider (≥ 2× the width) than a chord with `bars: 1` in the same progression; a chord with `bars: 0.25` renders visibly narrower (≈ ¼ the width) than a chord with `bars: 1`.
  - Validation method: `manual`

- **A-03-03** — A numbered cycle/bar ruler is visible above the segments; bar markers are numbered 1, 2, 3, … and align with the corresponding cycle boundaries in the segment row.
  - Validation method: `manual`

- **A-03-04** — Bar-boundary lines (every 1.0 cycle) are visually heavier/brighter than beat-boundary lines (every 0.25 cycle); the optional half-bar lines (every 0.5 cycle) are visually intermediate.
  - Validation method: `manual`

- **A-03-05** — The minimum chord duration reachable via the resize gesture is 0.25 (one beat); dragging further left does not go below 0.25.
  - Validation method: `manual`

- **A-03-06** — `clampBars(0.1)` returns `0.25`; `clampBars(0.25)` returns `0.25`; `clampBars(0.4)` returns `0.5`; `clampBars(8.1)` returns `8`. (Unit tests.)
  - Validation method: `unit`

- **A-03-07** — `barsLabel(0.25)` returns `¼×`; `barsLabel(0.75)` returns `¾×`; `barsLabel(1.25)` returns `1¼×`. (Unit tests.)
  - Validation method: `unit`

- **A-03-08** — A session saved with a chord at `bars: 0.5` (the old minimum) loads and plays correctly without error; `SavedChordSchema.safeParse({ rootPc: 0, qual: 'maj', gain: 0.6, bars: 0.5 })` succeeds. (Unit test or proxy:static-analysis of the schema change.)
  - Validation method: `unit`

- **A-03-09** — All existing strip interactions are intact: vertical gain drag (3 px threshold, 0.006/px, clamp [0, 1.2]), tap-to-preview, ✕ remove, and Enter/Space keyboard play — none regressed by the layout or grid changes.
  - Validation method: `manual`

- **A-03-10** — When the strip is horizontally scrolled (total loop > viewport width), the ruler and segments scroll together (in sync, not independently).
  - Validation method: `manual`

- **A-03-11** — All quality gates pass: `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` all pass with count ≥ 192, `pnpm build` exits 0.
  - Validation method: `automated`

---

## Partial coverage from prior phase

Phase 02 step 02.5 closed all nine A-02-xx criteria as `covered`. No partials or deferred entries to carry forward from Phase 02.

No prior partials to address.

---

## ADR Triggers

- **ADR 0010 amendment — 0.25-beat granularity** — Trigger: step 03.2 (Pilot Checkpoint #2). The amendment records the change from 0.5 to 0.25 minimum and documents backward-compat guarantee. An addendum section on the existing ADR 0010 is the chosen form (single-parameter change; does not reverse the core `arrange()` decision).

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v2/handoffs/phase-03-handoff.md`. See `handoff-template.md`.
