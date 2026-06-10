# Phase 01 Inventory — UX Quick-Wins

**Date:** 2026-06-10
**Phase file:** `docs/orbifold-v2/phases/phase-01.md`
**Prior phase:** orbifold-v1 Phase 08 complete (180 tests passing, all quality gates green, app live at GitHub Pages URL).

---

## Files that will be touched

| File | Planned change | Step |
|---|---|---|
| `src/ui/Header.svelte` | Wrap `<div class="field">` in `{#if $sessionStore.view === 'harmony'}` | 01.2 |
| `src/ui/CodeDrawer.svelte` | Update `#codeTab` `bottom` CSS value to clear Transport footer | 01.2 |
| `src/app/app.css` | Update `#compTab` `bottom` CSS value to clear Transport footer | 01.2 |
| `src/ui/ProgressionStrip.svelte` | Create new component (equal-segment timeline strip) | 01.3 |
| `src/app/App.svelte` | Replace `<ProgressionChips />` with `<ProgressionStrip />` import and usage | 01.3 |
| `docs/orbifold-v2/inventories/phase-01-inventory.md` | This file (created in 01.1) | 01.1 |
| `docs/orbifold-v2/handoffs/phase-01-handoff.md` | Created in 01.1; step entries appended in 01.2 and 01.3 | all |

### Files confirmed NOT touched in this phase

- `src/core/codegen/strudel.ts` — confirmed NOT modified (A-01-08 guarantee)
- `src/state/session.ts` — confirmed NOT modified; `Chord` interface has no `duration` or `bars` field added
- `src/ui/ProgressionChips.svelte` — NOT deleted (removal is a separate cleanup decision for the Pilot; file stays present)
- `src/ui/Transport.svelte` — NOT modified (tab repositioning is CSS-only, no slot structure change)
- `src/core/**` — none touched

---

## Store accessor and view values (confirmed)

- **Store accessor:** `$sessionStore.view` — type `'rhythm' | 'harmony' | 'composition' | 'session'` (confirmed at `src/state/session.ts` line 146).
- **Rhythm mode value:** `'rhythm'` (exact string literal).
- **Harmony mode value:** `'harmony'` (exact string literal).
- **Conditional guard for step 01.2:** `{#if $sessionStore.view === 'harmony'}…{/if}` wrapping the `.field` div is the correct and complete change for Item A.

---

## Harmony-specific controls in Header.svelte (confirmed)

The `<div class="field">` block runs from line 97 to line 130 in `src/ui/Header.svelte`:

```
line  97: <div class="field">
line  98:   <span>clave</span>
line 102:   <select id="melRoot" …>
line 109:   <select id="melMode" …>
line 121:   <select id="melOctave" …>
line 130: </div>
```

These three selects (clave/root, mode, octave) are harmony-specific. They are used exclusively in Harmony view to set the scale and octave for the chord progression and Tonnetz display.

Controls that are **NOT** inside this div and must remain visible in all modes:
- `.brand` group (glyph, h1, tag) — lines 64–68
- `#viewSeg` segmented control (Armonía / Ritmo toggle) — lines 75–90
- `.sp` spacer — line 133
- `.tutorial-link` — lines 135–137

Conclusion: wrapping only the `<div class="field">` block in `{#if $sessionStore.view === 'harmony'}` is the correct and complete change. The view toggle itself must never be hidden.

---

## CSS positioning of `#codeTab` and `#compTab` (confirmed)

### `#codeTab` — scoped CSS in `src/ui/CodeDrawer.svelte` (lines 195–211)

```css
#codeTab {
  position: fixed;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 8;
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 6px 16px;
  border-radius: 11px;
  cursor: pointer;
  border: 1px solid var(--stroke);
  background: var(--panel);
}
```

### `#compTab` — global CSS in `src/app/app.css` (lines 268–282)

```css
#compTab {
  position: fixed;
  bottom: 14px;
  left: calc(50% + 130px);
  transform: translateX(-50%);
  z-index: 8;
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  padding: 6px 16px;
  border-radius: 11px;
  cursor: pointer;
  border: 1px solid rgba(138, 160, 255, 0.3);
}
```

Both tabs currently sit at `bottom: 14px` — which places them directly over the Transport footer.

### Transport footer height measurement

`Transport.svelte` footer CSS (`footer` rule, lines 214–222):
- `margin: 0 12px 10px` — bottom margin 10px
- `padding: 11px 18px` — 11px top + 11px bottom = 22px vertical padding
- Content rows: now-playing pill (~36px) + BPM/engines row (~36–40px) — footer `flex-wrap: wrap` may cause two rows on narrow viewports.

Approximate footer box height from viewport bottom:
- Single-row layout (wide viewport): ~10 (margin) + 22 (padding) + ~36 (content) = **~68 px**
- Two-row layout (narrow viewport): ~10 + 22 + ~72 = **~104 px**

The ProgressionChips / ProgressionStrip row is also inside the footer via `<slot />`, adding another ~40px row when a progression is loaded. This means the safe `bottom` value to clear the footer entirely is at minimum **80 px** at a 1440×900 viewport with no progression, and up to **~120 px** with a loaded progression at a narrow viewport.

**Recommended `bottom` value: `90px`** — clears the single-row footer with ample clearance and the chip/strip row without overflowing into stage content at 375px width. This is the value the Dev will use for step 01.2 (subject to the OD-01 resolution below).

---

## ProgressionChips interaction source (confirmed for step 01.3 prototype-parity)

The critical interactions ported from `src/ui/ProgressionChips.svelte` that `ProgressionStrip.svelte` MUST preserve:

| Interaction | Source function(s) | Source lines | Prototype origin |
|---|---|---|---|
| Pointer-down: capture pointer, record startY/startGain | `handlePointerDown` | lines 83–97 | prototype lines 1441–1450 |
| Pointer-move: compute `dy = startY - e.clientY`; if `|dy| > 3` set `moved=true`; `gain = clamp(startGain + dy*0.006, 0, 1.2)` | `handlePointerMove` | lines 99–109 | prototype lines 1451–1456 |
| Pointer-up: if moved → commit gain to store + `requeueLive()`; else (tap) → `playChord(rootPc, qual, gain)` | `handlePointerUp` | lines 111–141 | prototype lines 1457–1466 |
| Keyboard equivalent (Enter/Space) → `playChord` | `on:keydown` handler | line 177 | (accessibility addition, not in prototype) |
| Remove button (`✕`) → `clearChordAt(index)` | `handleRemove` | lines 143–146 | prototype line 1440 |
| Gain fill background | `chipGainCss(g)` | lines 38–41 | prototype lines 1413–1415 |
| Tonal-function border class | `tonalClass(rootPc, qual, keyRoot, keyMode)` | lines 47–55 | prototype: `ch.info.func.cls` (line 1435) |
| Drag state per-chip arrays (dragging, startY, startGain, moved, localGain) | module-level arrays | lines 63–81 | prototype `let dragging=false, startY=0` etc. (lines 1442–1443) |

**CSS requirements in ProgressionStrip:** `touch-action: none` and `user-select: none` on segment elements (present in ProgressionChips `.prog-chip`, lines 226–227).

All these interactions MUST be present in `ProgressionStrip.svelte`. The strip differences from chips are:
1. Segments use `flex: 1` (equal width) instead of `flex: 0 0 auto` (auto-shrink chips)
2. No horizontal scrolling (segments fill available width)

---

## Existing behavior to preserve

- In Harmony mode: `<div class="field">` (clave/root/mode/octave selects) is visible.
- In Rhythm mode: `<div class="field">` is hidden; brand, view-toggle, and tutorial link remain.
- Switching modes: selects appear/disappear without page reload.
- Both drawer tabs (`#codeTab`, `#compTab`) remain clickable and slide their drawers up.
- Drawer drawers (`#codeDrawer`, `#compDrawer`) still slide up from `bottom: 0` — the `bottom` change is on the TAB buttons only, not the drawers.
- Progression interactions (gain drag, tap-preview, remove) work identically in ProgressionStrip.
- Strudel codegen output is byte-identical (no changes to `strudel.ts` or `Chord` interface).

---

## New behavior introduced

- **Step 01.2:**
  - Harmony-specific header selectors hidden when `view === 'rhythm'`
  - `#codeTab` and `#compTab` sit above the Transport footer (no visual overlap)

- **Step 01.3:**
  - Chord progression displays as equal-width segment strip (one segment per chord)
  - Segments fill full available footer width equally
  - All existing chip interactions preserved (gain drag, tap-preview, remove)

---

## Tests to add or modify

- No new unit tests required for steps 01.2 (CSS-only / conditional render) or 01.3 (pure UI component with no extracted pure helpers).
- If a pure helper is extracted from `ProgressionStrip.svelte` (e.g., `segmentWidthPct`), a unit test SHOULD be added per the spec.
- All 180 existing tests must continue to pass. Test count must not regress.

---

## Open decisions

### OD-01 — Drawer tab repositioning strategy

Three options identified in the phase spec:

1. **Raise `bottom`:** Change `bottom: 14px` to `bottom: 90px` (or computed value) on both `#codeTab` and `#compTab`. Simple; tabs float above footer. Risk: on small viewports the tabs may overlap stage content (stage has `min-height: 0`, so it will shrink to give the footer room, but the tab at 90px may land inside the stage area on very small viewports).

2. **Dock tabs into Transport footer:** Add a dedicated tab-row div inside Transport.svelte and render the tab buttons there as non-fixed elements. Cleaner layout; requires changes to Transport.svelte and slot structure. More invasive.

3. **Move tabs to a corner:** Position both tabs to left or right side of viewport. Less common for drawer triggers; changes horizontal layout.

**Inventory recommendation: Option 1 (raise `bottom`)** — lowest structural impact, consistent with existing fixed-position pattern, appropriate for Phase 01 quick-win scope.

**Pilot must resolve OD-01 before step 01.2.** The Dev will not pick unilaterally.

### OD-02 — ProgressionStrip placement

Two options:

1. **Keep in Transport slot (recommendation):** Strip lives inside footer via `<slot />`, same as today. Consistent with current mounting in `App.svelte` (`<Transport><ProgressionChips /></Transport>`).

2. **Move above footer:** Place as full-width row between stage and footer. More horizontal room. Requires structural change to `App.svelte` layout.

**Inventory recommendation: Option 1 (keep in slot)** — minimizes structural change for Phase 01. Variable-width segments in Phase 02 may motivate revisiting.

**Pilot should confirm or override OD-02 at inventory review.**

---

## New dependencies needed

None. No new npm packages required.

---

## Environment, CI, build, deployment changes needed

None. No changes to `vite.config.ts`, `.github/workflows/deploy.yml`, or CI configuration.

---

## Project-specific verifications (from CLAUDE.md)

- `tsc --noEmit` must pass after each code-touching step.
- `pnpm lint` must pass after each code-touching step.
- `pnpm test` — 180+ tests must pass; count must not regress.
- `pnpm build` must exit 0.
- AGPL-3.0 header must be present in any new or modified source file.
- No changes to `src/core/codegen/strudel.ts` or `Chord` interface — byte-identical Strudel output guarantee.
- Prototype-parity checklist applies to step 01.3 (ProgressionStrip ports existing chip interactions from `ProgressionChips.svelte` / prototype lines 1413–1466). Handoff must cite source lines and state observed behavioral equivalence.

---

## Source-of-truth check

- `$sessionStore.view` confirmed: type `'rhythm' | 'harmony' | 'composition' | 'session'` at `session.ts` line 146. The header only needs to check for `=== 'harmony'` (show) vs. all other values (hide). `'composition'` and `'session'` views will also hide the selectors — this is correct per the spec intent (selectors are harmony-specific).
- `clearChordAt(index)` confirmed exported from `session.ts` (line 697). `playChord(rootPc, qual, gain)` confirmed exported (line 480). `requeueLive()` confirmed exported (line 430). All three are required by ProgressionStrip.
- `diatonicLookup` from `src/core/theory/scales.ts` is used by ProgressionChips and must be used identically in ProgressionStrip.
- `chordLabel` from `src/core/theory/chords.js` is used for chip/segment label text.
