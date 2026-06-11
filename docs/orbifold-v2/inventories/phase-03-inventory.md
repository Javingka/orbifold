# Phase 03 Inventory — ProgressionStrip: absolute grid, DAW ruler, and 0.25-beat granularity

**Date:** 2026-06-11
**Step:** 03.1
**Branch:** `orbifold-v2/phase-03`
**Environment baseline:** 187 tests passing; `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.

---

## 1. Gate confirmation

Phase 02 completed with all nine acceptance criteria (A-02-01 through A-02-09) covered.
Phase 02 step 02.5 Planner review: APPROVE (2026-06-10). 187 tests passing.
Branch `orbifold-v2/phase-03` already created by Pilot.
ADR 0010 (`docs/adr/0010-variable-chord-duration.md`) is in the Accepted state.

---

## 2. `clampBars` in `src/state/session.ts`

**Location:** lines 90–93

**Exact current implementation:**

```ts
export function clampBars(bars: number): number {
  const rounded = Math.round(bars * 2) / 2;
  return Math.max(0.5, Math.min(8, rounded));
}
```

- **Rounding expression:** `Math.round(bars * 2) / 2` — rounds to the nearest 0.5.
- **Lower bound:** `0.5` (Math.max).
- **Upper bound:** `8` (Math.min) — unchanged in Phase 03.
- **JSDoc (lines 80–89):** "Round `bars` to the nearest 0.5 then clamp to [0.5, 8]."

**Phase 03 changes:** rounding to `Math.round(bars * 4) / 4`; lower bound to `0.25`.

---

## 3. `setChordBars` in `src/state/session.ts`

**Location:** lines 743–753

**Current implementation (relevant excerpt):**

```ts
export function setChordBars(index: number, bars: number): void {
  sessionStore.update((s) => {
    if (index < 0 || index >= s.harmony.progression.length) return s;
    const clamped = clampBars(bars);
    const progression = s.harmony.progression.map((ch, i) =>
      i === index ? { ...ch, bars: clamped } : ch
    );
    return { ...s, harmony: { ...s.harmony, progression } };
  });
  requeueLive();
}
```

Uses `clampBars` — inherits its bounds change in Phase 03 without modification to
`setChordBars` itself. No other changes needed here.

---

## 4. `Chord` interface in `src/state/session.ts`

**Location:** lines 102–115

```ts
export interface Chord {
  rootPc: number;
  qual: Quality;
  gain: number;
  cx?: number;
  cy?: number;
  /**
   * Duration in Strudel cycles (default 1; multiples of 0.5; min 0.5, max 8).
   * Introduced in Phase 02 — ADR 0010.
   */
  bars?: number;
}
```

JSDoc on `bars` will need updating in Phase 03 to reflect the new step (0.25) and minimum
(0.25). No structural change to the interface.

---

## 5. `SavedChordSchema.bars` in `src/lib/persistence.ts`

**Location:** `SavedChordSchema` at lines 29–34

**Exact current entry:**

```ts
const SavedChordSchema = z.object({
  rootPc: z.number().int().min(0).max(11),
  qual: z.enum(SK_QUAL),
  gain: z.number().min(0).max(1.2),
  bars: z.number().min(0.5).max(8).optional(),
});
```

- **Current `.min()` value:** `0.5`
- **Phase 03 change:** `.min(0.25)` — broadens the valid range to admit 0.25 and 0.75.
- No surrounding JSDoc to update (none present for `SavedChordSchema` itself).

---

## 6. `HarmonyChordSchema.bars` in `src/agent/schema.ts`

**Location:** lines 102–108

**Exact current entry:**

```ts
export const HarmonyChordSchema = z.object({
  root: z.string(),
  quality: z.enum(SK_QUAL),
  gain: z.number().min(0).max(1.2).optional(),
  /** Duration in Strudel cycles (0.5 = half bar, 1 = one bar, 2 = two bars; multiples of 0.5; default 1). */
  bars: z.number().min(0.5).max(8).optional(),
});
```

- **Current `.min()` value:** `0.5`
- **Phase 03 change:** `.min(0.25)`.
- **JSDoc on `bars`:** mentions "multiples of 0.5" — must update to "multiples of 0.25".

---

## 7. ProgressionStrip mount site

**In `src/app/App.svelte`:** lines 417–419

```svelte
<Transport>
  <ProgressionStrip />
</Transport>
```

`ProgressionStrip` is rendered inside `<Transport>` via the Svelte `<slot />` in
`Transport.svelte`. The slot is at **line 206** of `Transport.svelte`:

```svelte
<slot />
```

It is the last element inside `<footer class="glass">`. The footer (`Transport.svelte` lines
114–207) has `flex-wrap: wrap` (line 221 in Transport.svelte `<style>`), so `ProgressionStrip`
wraps to a new flex row when the line is full.

**Phase 03 intent:** Remove `<ProgressionStrip />` from the `<Transport>` slot and mount it
directly in `App.svelte` as its own `<div class="progression-row">` placed *above* the
`<Transport>` component.

---

## 8. `.strip` and `.segments` CSS in `ProgressionStrip.svelte`

**`.strip` (lines 421–428):**

```css
.strip {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
```

- `flex: 1` — strip expands to fill the Transport footer row.
- `overflow: hidden` — no horizontal scroll.

**`.segments` (lines 443–449):**

```css
.segments {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 3px;
  overflow: hidden;
}
```

- `overflow: hidden` — confirmed; must change to `overflow-x: auto; overflow-y: hidden` in
  Phase 03 step 03.4 (within the new scroll wrapper).

**Phase 03 changes:**
- `.strip` `overflow: hidden` → keep outer `overflow: hidden` on strip (scroll wrapper inside).
- `.segments` `overflow: hidden` → `overflow-x: auto; overflow-y: hidden` (part of scroll wrapper).
- Each `.seg` `flex: 0 0 {pct}%` → `width: {bars * PX_PER_CYCLE}px; flex: 0 0 {bars * PX_PER_CYCLE}px`.

---

## 9. Resize gesture rounding in `ProgressionStrip.svelte`

**`handleResizePointerMove` (lines 318–331):**

```ts
function handleResizePointerMove(e: PointerEvent, i: number): void {
  if (!resizeActive[i]) return;
  const dx = e.clientX - resizeStartX[i];
  const segWidth = segmentsEl ? segmentsEl.getBoundingClientRect().width : 200;
  const pixelsPerBar = totalBars > 0 ? segWidth / totalBars : segWidth;
  const deltaBars = dx / pixelsPerBar;
  const rawBars = resizeStartBars[i] + deltaBars;
  // Round to nearest 0.5, clamp [0.5, 8].
  const newBars = Math.max(0.5, Math.min(8, Math.round(rawBars * 2) / 2));
  resizeBars[i] = newBars;
  resizeBars = [...resizeBars];
}
```

- **Current rounding:** `Math.round(rawBars * 2) / 2` (nearest 0.5).
- **Current lower clamp:** `0.5`.
- **`pixelsPerBar` computation:** `segmentsEl.getBoundingClientRect().width / totalBars` — derived
  from container width and totalBars. In Phase 03 this changes to the constant `PX_PER_CYCLE = 48`.

**Phase 03 changes:** rounding to `Math.round(rawBars * 4) / 4`; lower clamp to `0.25`;
`pixelsPerBar` becomes the constant `PX_PER_CYCLE`.

---

## 10. `barsLabel` helper in `ProgressionStrip.svelte`

**Location:** lines 110–118

```ts
function barsLabel(bars: number | undefined): string {
  if (bars === undefined || bars === 1) return '';
  const whole = Math.floor(bars);
  const frac = bars - whole;
  const fracStr = frac >= 0.4 ? '½' : '';
  const wholeStr = whole > 0 ? String(whole) : '';
  return wholeStr + fracStr + '×';
}
```

**Current behavior:**
- Returns `''` for `bars === undefined` or `bars === 1`.
- For `bars = 0.5`: whole = 0, frac = 0.5 → fracStr = `½`, wholeStr = `''` → `½×`.
- For `bars = 1.5`: whole = 1, frac = 0.5 → `1½×`.
- Does NOT handle 0.25 (frac = 0.25, < 0.4 → fracStr = `''`, result would be `''` — wrong).
- Does NOT handle 0.75 (frac = 0.75, ≥ 0.4 → fracStr = `½`, result would be `½×` — wrong, should be `¾×`).
- Floating-point fragility: `frac >= 0.4` threshold is a heuristic that does not scale to quarter fractions.

**Phase 03 requirement:** Extend to produce `¼×`, `½×`, `¾×` for quarter fractions, using a
lookup table `['', '¼', '½', '¾']` indexed by `Math.round((bars % 1) * 4)`.

---

## 11. `#sessionsBtn` positioning and size (from `src/app/app.css`)

**Location:** lines 936–953

```css
#sessionsBtn {
  position: fixed;
  bottom: 24px;
  right: 14px;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(138, 160, 255, 0.12);
  border: 1px solid rgba(138, 160, 255, 0.35);
  color: var(--text);
  font-size: 18px;
  cursor: pointer;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
```

- **Position:** `position: fixed; bottom: 24px; right: 14px; z-index: 8` — confirmed.
- **Size:** `40 × 40 px` — confirmed.
- **Bottom edge of button:** the button top edge is at `viewport_height - 24px - 40px = viewport_height - 64px` from top.

**Element:** `src/ui/PersistencePanel.svelte` line 75:
`<button id="sessionsBtn" title="Sesiones guardadas" on:click={openPanel}>💾</button>`

---

## 12. Transport footer geometry and overlap analysis

**Transport footer CSS** (`Transport.svelte` lines 214–222 `<style>`):

```css
footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 11px 18px;
  margin: 0 12px 10px;
  border-radius: 18px;
  flex-wrap: wrap;
}
```

- `margin: 0 12px 10px` — bottom margin of 10 px.
- `border-radius: 18px`.
- The footer sits in the `#app` flex column below `#stage`.
- **Footer bottom edge:** approximately `viewport_height - 10px` from top (10 px from viewport bottom).
- The `ProgressionStrip`, rendered via `<slot />` (line 206), wraps to a second line inside the footer when the Transport controls take the first row. Depending on strip height (~38 px estimated), the footer bottom edge can be `viewport_height - 10px` when strip wraps.

**`#sessionsBtn` bottom:** `24px` from bottom, right edge at `14px` from right.
- Button occupies `right: 14px` to `right: 54px` (40 px wide), `bottom: 24px` to `bottom: 64px` (40 px tall).
- **The strip, when in the footer at the right end of the second flex row**, is at approximately `bottom: 10px` to `bottom: 48px` (footer margin 10 px + footer padding 11 px top and bottom). The button at `bottom: 24px` to `64px` overlaps this vertical band.
- The last segment's `.resize-handle` (8 px wide, right edge of the last segment) is at the far right of the strip row. With the footer running edge-to-edge (minus 12 px margin each side), and `#sessionsBtn` at `right: 14px`, the handle is occluded when the strip reaches the rightmost viewport area.

**Conclusion — occlusion confirmed:** The `#sessionsBtn` at `bottom: 24px; right: 14px` overlaps the strip's rightmost content when the strip is inside the footer. Moving the strip to its own row above the footer removes the overlap entirely without requiring any change to `#sessionsBtn`.

---

## 13. `#compTab` position and collision analysis

**Location:** `src/app/app.css` lines 273–287

```css
#compTab {
  position: fixed;
  bottom: 90px;
  left: calc(50% + 130px);
  transform: translateX(-50%);
  z-index: 8;
  ...
}
```

- `#compTab` is fixed at `bottom: 90px`, horizontally centered right of the viewport midpoint.
- The new `.progression-row` sits between `#stage` and `<Transport>` in the `#app` flex column.
  It is a flow element (not fixed), so it occupies document flow, not a fixed viewport position.
- **No collision:** `#compTab` is anchored `90px` from the bottom at a specific horizontal
  position. The `.progression-row` is a flow element that reduces the available height for
  `#stage` but does not overlap the fixed `#compTab` tab. The tab's `bottom: 90px` value was
  already chosen (per its CSS comment) to clear a "single-row footer" height of ~58 px plus the
  ProgressionStrip when inside the footer. Moving the strip out of the footer reduces the needed
  clearance at the bottom, so `#compTab` gains more separation from the Transport footer — no
  adjustment to `#compTab` needed.

---

## 14. Composition timeline `--ppb` value

**Location:** `src/app/app.css` lines 472–503 (`.tl-ruler` and `.tl-lane`)

Both `.tl-ruler` and `.tl-lane` use `var(--ppb, 48px)` as the CSS custom property for
pixels-per-bar in the composition timeline:

```css
.tl-ruler {
  background-image: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent calc(var(--ppb, 48px) - 1px),
    rgba(255,255,255,0.07) calc(var(--ppb, 48px) - 1px),
    rgba(255,255,255,0.07) var(--ppb, 48px)
  );
}
```

- **Default `--ppb` value:** `48px` per cycle (fallback in both `.tl-ruler` and `.tl-lane`).
- Phase 03 step 03.4 specifies `PX_PER_CYCLE = 48` in `ProgressionStrip.svelte`, which matches
  this existing value, making the two timelines visually consistent.

---

## 15. Codegen is untouched

Per Phase 03 step 03.4 spec: `src/core/codegen/strudel.ts` is NOT touched in Phase 03.
The `arrange()` / slowcat dual-mode output from Phase 02 is unchanged. The granularity change
affects only:
- `clampBars()` in `src/state/session.ts`
- `SavedChordSchema.bars` `.min()` in `src/lib/persistence.ts`
- `HarmonyChordSchema.bars` `.min()` in `src/agent/schema.ts`
- `handleResizePointerMove` rounding and `barsLabel` in `src/ui/ProgressionStrip.svelte`

---

## 16. Files touched in Phase 03 (projected)

| File | Steps | Nature of change |
|---|---|---|
| `docs/adr/0010-variable-chord-duration.md` | 03.2 | Amendment section appended |
| `src/state/session.ts` | 03.3 | `clampBars` rounding + lower bound; JSDoc on `Chord.bars` |
| `src/lib/persistence.ts` | 03.3 | `SavedChordSchema.bars` `.min(0.5)` → `.min(0.25)` |
| `src/agent/schema.ts` | 03.3 | `HarmonyChordSchema.bars` `.min(0.5)` → `.min(0.25)` |
| `src/ui/ProgressionStrip.svelte` | 03.3, 03.4 | `handleResizePointerMove` rounding; `barsLabel` quarters; absolute grid layout; ruler; gridlines |
| `src/app/App.svelte` | 03.4 | Move `<ProgressionStrip />` from Transport slot to `.progression-row` above `<Transport>` |
| `src/app/app.css` | 03.4 | `.progression-row` style |
| `src/ui/Transport.svelte` | 03.4 | Remove or empty `<slot />` |
| `tests/session.test.ts` | 03.3 | New `clampBars` and `barsLabel` unit tests |

---

## 17. Open decisions for Pilot review

### OD-03-01 — Pixel-width-per-cycle value

The phase spec proposes `PX_PER_CYCLE = 48`, matching the composition timeline's `--ppb: 48px`
default. This value means:
- A 1-cycle chord → 48 px wide.
- A 2-cycle chord → 96 px wide.
- A 0.25-cycle chord → 12 px wide (visible but narrow).
- A progression of 8 chords at 1 cycle each → 384 px total (fits a ~780 px viewport with
  labels and the `.lbl` tag).
- A max progression of 16 chords at 8 cycles each → 6144 px (requires horizontal scroll — fine,
  `.segments` container becomes `overflow-x: auto` inside the scroll wrapper).

**Question for Pilot:** Is 48 px/cycle confirmed as the right value, or should a different value
(e.g., 64 px/cycle for more breathing room) be used? At 48 px/cycle a 0.25-chord is 12 px wide,
which may be too narrow to display a chord label; however, the label truncates with `text-overflow:
ellipsis` and the `seg-dur` label (e.g., `¼×`) is still readable.

**Recommendation:** Use 48 px/cycle (matching `--ppb`) unless the Pilot has a different
preference. This is the value the spec directs and it aligns the two timelines visually.

### OD-03-02 — Half-bar (0.5-cycle) gridline: mandatory or optional

Phase 03 step 03.4 spec describes beat lines (0.25-cycle, faint) and half-bar lines (0.5-cycle,
medium), with the note "the optional half-bar lines". The Phase 03 acceptance criterion A-03-04
says "the optional half-bar lines (every 0.5 cycle) are visually intermediate", using the word
"optional" in the criterion text itself.

**Question for Pilot:** Should the 0.5-cycle (half-bar) gridline be:
- **Mandatory** — always rendered as a medium-weight line intermediate between beat and bar lines.
- **Optional / conditionally rendered** — only shown when a segment is at least 2 cycles wide
  (where the half-bar line is more useful), or as a future preference toggle.

**Recommendation:** Implement the half-bar line as mandatory (rendered in all segments) per the
spec description, which gives the cleanest visual hierarchy. The word "optional" in A-03-04 refers
to the fact that it is between the mandatory beat and bar lines, not that it is a user-controlled
toggle. This also matches how `app.css` uses a single `--ppb` tick in `.tl-ruler` without any
half-bar intermediate.

---

## 18. Phase 02 completion state

Carrying forward from Phase 02 step 02.5 handoff (no partials):

- 187 tests passing.
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.
- `Chord.bars`, `clampBars`, `setChordBars`, `melodyLine()` dual-mode, and
  `ProgressionStrip` proportional widths + resize gesture are all live.
- `SESSION_SCHEMA_VERSION` remains at 1.
- No Phase 02 acceptance criteria deferred into Phase 03.
