# Phase 07 Inventory — Linear Harmony View

**Date:** 2026-06-11
**Step:** 07.1 — Inventory
**Status:** Complete

---

## 1. Source file readings

All files named in the step 07.1 PROMPT were read. Summary of findings below.

---

## 2. `getStageRefs()` — return type and available refs

### StageRefs interface (stage.ts lines 156–168)

```ts
interface StageRefs {
  app: PIXI.Application;
  hGrid: PIXI.Graphics;
  hPath: PIXI.Graphics;
  hNodes: PIXI.Graphics;
  hDyn: PIXI.Graphics;
  hLabels: PIXI.Container;
  hNRG: PIXI.Graphics;
  hNRL: PIXI.Container;
  rRings: PIXI.Graphics;
  rDyn: PIXI.Graphics;
  rLabels: PIXI.Container;
}
```

### Layer structure

```
app.stage
  ├── harmonyLayer (PIXI.Container)  ← module-level let, NOT in StageRefs
  │     ├── hGrid    (PIXI.Graphics)  — Tonnetz background grid
  │     ├── hPath    (PIXI.Graphics)  — voice-leading path
  │     ├── hDyn     (PIXI.Graphics)  — dynamic animations
  │     ├── hNRG     (PIXI.Graphics)  — NR glow
  │     ├── hNodes   (PIXI.Graphics)  — node circles
  │     ├── hNRL     (PIXI.Container) — NR labels
  │     └── hLabels  (PIXI.Container) — node text labels
  └── rhythmLayer (PIXI.Container)
        ├── rRings   (PIXI.Graphics)
        ├── rDyn     (PIXI.Graphics)
        └── rLabels  (PIXI.Container)
```

### Critical finding: harmonyLayer is NOT exposed

`harmonyLayer` is a module-level `let` in `stage.ts` that is NOT included in `StageRefs`. The Phase 07 spec says the staff scene "attaches them inside the existing `harmonyLayer` container obtained via `getStageRefs()`" — but `getStageRefs()` currently has no `harmonyLayer` field.

**Required stage.ts change:** Add `harmonyLayer: PIXI.Container` to the `StageRefs` interface and the `getStageRefs()` return value. This is NOT adding a new layer (it's exposing an existing one) — the spec says "do not add new layers to stage.ts", which this change does not violate. Step 07.3 will need this accessor.

### Which refs Phase 07 should use

Phase 07 staff scene will add its own `PIXI.Graphics` and `PIXI.Container` objects as children of `harmonyLayer` (after the existing pre-allocated objects). The staff scene does NOT use hGrid, hPath, hNodes, hDyn, hLabels, hNRG, or hNRL — those belong to the Tonnetz scene. The staff scene only needs `harmonyLayer` (to `addChild`) and `app` (for `screen.width` / `screen.height`).

### `setView(view)` switching logic

```ts
export function setView(view: 'harmony' | 'rhythm'): void {
  if (harmonyLayer !== null) harmonyLayer.visible = view === 'harmony';
  if (rhythmLayer !== null) rhythmLayer.visible = view === 'rhythm';
}
```

When `view === 'harmony'`, `harmonyLayer.visible = true`. All children of `harmonyLayer` — including the Tonnetz objects AND the Phase 07 staff scene objects — are visible. There is no per-child visibility in the layer-switching logic; the full `harmonyLayer` is toggled.

**Implication:** Both the Tonnetz and the staff scene render simultaneously in harmony view. The staff scene occupies a sub-region (lower portion of the canvas), so this is fine as long as the two scenes do not draw in the same vertical zone.

---

## 3. `getVisualPhaseAnchor()` — return type and units

### Return type

`getVisualPhaseAnchor(): number` — returns `_anchorMs: number`, which is a **millisecond timestamp** (set via `performance.now() - offsetMs`). NOT a fractional phase.

### How rhythm-scene.ts consumes it (`tickRhythm`)

```ts
const now = performance.now();
const bpm = state.bpm > 0 ? state.bpm : 120;
const barMs = (60000 / bpm) * 4;
const phase = ((now - getVisualPhaseAnchor()) % barMs) / barMs; // 0..1 per bar
```

**Pattern for Phase 07 playhead computation:** `phase` = elapsed time since anchor, modulo one bar duration, normalized to [0, 1). To convert to a bar-absolute position across the entire progression:

```
progressionPhase = (now - getVisualPhaseAnchor()) / barMs;
// This counts total bars elapsed (including bar-boundary crossings)
// Clamp to [0, totalCycles) for the playhead x-position.
```

For the staff playhead x-position:
```
playheadX = (now - getVisualPhaseAnchor()) / barMs * PX_PER_CYCLE
// Clamped to [0, totalWidth]
```

This ensures the playhead advances at 48 px/bar, same as the ProgressionStrip cursor.

### How `tickHarmony` computes phase

```ts
const barMs = (60000 / bpm) * 4;
const phase = ((now - getVisualPhaseAnchor()) % barMs) / barMs; // 0..1 per bar
```

Same pattern as `tickRhythm`. The `% barMs` wraps within a single bar; the staff playhead needs the full progression elapsed time (no `%` wrap).

---

## 4. `computeVoiceTracks()` — current signature

```ts
export function computeVoiceTracks(
  progression: (ChordInput | RestInput)[],
  octave: number
): VoiceTrack[]
```

- `ChordInput = { rootPc: number; qual: Quality; bars?: number }`
- `RestInput = { isRest: true; bars?: number }`
- Returns exactly 3 `VoiceTrack` objects.

### VoiceTrack.events element types

```ts
events: (VoiceEvent | VoiceRestEvent)[]
```

- `VoiceEvent`: `{ chordIndex, noteName, octave, bars, startCycle }`
- `VoiceRestEvent`: `{ isRest: true, slotIndex, bars, startCycle }`

### Discriminant to detect VoiceRestEvent

Use `'isRest' in event` (the `isRest: true` field is the discriminant). This is the pattern used throughout Phase 06 (`voice-tracks.ts` line 132, `tonnetz-scene.ts`, `persistence.ts`).

### VoiceTrack.voiceIndex

`0 | 1 | 2` — voice 0 = lowest, voice 1 = middle, voice 2 = highest.

---

## 5. `noteToStaffPosition()` — return shape and exported constants

### Return type: `StaffPosition` (staff-map.ts)

```ts
interface StaffPosition {
  steps: number;     // Diatonic steps from C4 (C4=0, D4=1, E4=2, … B4=6, C5=7; ±7 per octave)
  accidental: '' | '#'; // '#' for sharps; '' for natural and flat inputs
  ledgerLines: number[]; // Diatonic step values where ledger lines must be drawn
}
```

### Exported constants

| Constant | Value | Meaning |
|---|---|---|
| `TREBLE_STAFF_LINES` | `[2, 4, 6, 8, 10]` | Bottom-to-top: E4, G4, B4, D5, F5 |
| `STAFF_BOTTOM` | `2` | Bottom staff line (E4) |
| `STAFF_TOP` | `10` | Top staff line (F5) |

### Key mapping examples (diatonic steps)

| Note | steps | Ledger lines |
|---|---|---|
| C3 | −7 | `[0, −2, −4, −6]` (below staff) |
| E3 | −5 | `[0, −2, −4]` (below staff, E3 is in space) |
| G3 | −3 | `[0, −2]` (below staff, G3 is in space) |
| C4 | 0 | `[0]` (C4 sits on ledger line below E4) |
| E4 | 2 | `[]` (bottom staff line) |
| F#3 | −4 | `[0, −2, −4]` (accidental='#'; same steps as F3) |

**Default octave 3 voicings (C3, E3, G3) all need ledger lines below staff** — this is expected and visually standard for this register.

---

## 6. `cycleToPosition()` — linear mode behavior

```ts
cycleToPosition(cycleIndex, totalCycles, 'linear'): LinearPosition
// Returns { mode: 'linear', x: cycleIndex * PX_PER_CYCLE }
// where PX_PER_CYCLE = 48
```

- `totalCycles` is unused in linear mode (accepted for API uniformity).
- `PX_PER_CYCLE = 48` — exported from `time-map.ts`. The vigent coordination-point rule requires importing this from `time-map.ts` in all consumers.

---

## 7. `barsLabel` — export status and Phase 07 use

`barsLabel(bars: number | undefined): string` is **exported** from `session.ts` (line 112). It returns `''` for `bars === 1` or `undefined`, and a formatted string (e.g., `'½×'`, `'2×'`) for other durations.

**Phase 07 decision:** The spec does not mandate rendering duration labels on note-heads. The inventory records `barsLabel` as available but its use in the staff scene is optional. It will NOT be rendered on note-heads (adds visual clutter for the linear staff view; the ProgressionStrip already shows duration labels). Record for completeness only.

---

## 8. Current test count

**329 tests passing** across 11 test files, confirmed by `pnpm exec vitest run` (output at 2026-06-11):

```
✓ tests/euclid.test.ts              (25)
✓ tests/phase-anchor.test.ts        ( 4)
✓ tests/harmony/time-map.test.ts    (13)
✓ tests/harmony/staff-map.test.ts   (73)
✓ tests/codegen.test.ts             (39)
✓ tests/harmony/voice-tracks.test.ts (18)
✓ tests/voice-leading.test.ts       ( 8)
✓ tests/tonnetz.test.ts             (31)
✓ tests/session.test.ts             (46)
✓ tests/schema.test.ts              (41)
✓ tests/persistence.test.ts         (31)
Total: 329
```

Phase 07 step 07.1 validation requires: no source code written, test count confirmed 329. Both satisfied.

---

## 9. Voice colors (Pilot decisions, pre-resolved)

Per phase-07.md §"Pilot design decisions (resolved before step 07.1)":

| Voice | Index | Color name | Hex | `COL` token |
|---|---|---|---|---|
| Lowest | 0 | Tónica | `#f3b15a` | `COL.tonic` = `0xf3b15a` |
| Middle | 1 | Subdominante | `#56cfc4` | `COL.subdom` = `0x56cfc4` |
| Highest | 2 | Dominante | `#e87bac` | `COL.dom` = `0xe87bac` |

These are pre-resolved by the Pilot and are **not** open questions.

---

## 10. Staff panel layout region (Pilot decisions, pre-resolved)

Per phase-07.md §"Pilot design decisions":

> The staff occupies a **horizontal strip in the lower portion of the canvas** in harmony view. The Tonnetz (or dark background) occupies the upper area. The staff does NOT replace the full canvas — it is a sub-region. The exact vertical split point (e.g., bottom third of the canvas height) is determined in step 07.1 based on available canvas height; the Dev should pick a split that gives the staff enough room for five lines plus ledger lines (at STEP_PX = 10, that's ~80–100px including above/below margins).

### Canvas region geometry

At runtime, the `#stage` div is `flex: 1` within a flex-column layout. Based on the existing layout (Header ~52px, progression row ~60px, Transport footer ~68px, 10px margin top+bottom on stage), a typical laptop screen (768px viewport height) gives `#stage` approximately:

```
stageHeight ≈ 768 - 52 - 60 - 68 - 20 ≈ 568px
```

With `STEP_PX = 10` (10 px per diatonic step, each staff space = 10 px):
- 5 staff lines span from step 2 to step 10 → 8 diatonic steps = 80 px of raw staff
- Plus ~30 px margin above top line and ~30 px below bottom line (for ledger lines down to C3 at step −7 = 9 steps below STAFF_BOTTOM: 9 × 5 = 45 px; round to 50 px)
- Staff strip height: ~80 px (5-line span) + ~30 px top margin + ~50 px bottom margin (ledger line space) ≈ **160 px**

This gives approximately:
- `staffBaseY` (the y-coordinate in the PIXI canvas for `step=0` / C4) = canvas height − 50 (bottom margin)
- Staff top = `staffBaseY − STAFF_TOP × (STEP_PX/2)` = stageH − 50 − 10 × 5 = stageH − 100
- Staff strip occupies bottom ~160 px of the canvas

**Design recommendation for step 07.3:** Set `staffBaseY = app.screen.height − 60`. This places the C4 ledger line at 60 px from the canvas bottom, giving the five staff lines (E4–F5) above that, and the bottom ~160 px of the canvas for the staff strip. The Tonnetz occupies the upper `(height − 160)` px. The Tonnetz is not cropped (its geometry is centered on the full canvas by `buildTonnetz`); the staff renders on top of the lower Tonnetz region, which is mostly background at the default C3–G3 voicing register.

---

## 11. `HarmonyControls.svelte` — position and size

```css
.orbit-ctl {
  position: absolute;
  left: 16px;
  bottom: 46px;   /* above Transport, below ProgressionStrip */
  padding: 9px 13px;
  border-radius: 13px;
  max-width: 62%;
  z-index: 3;
}
```

- Positioned at the **bottom-left of `#stage`**, starting 46 px from the canvas bottom.
- Height: approximately 36–44 px (flex row with 9 px padding top/bottom).
- The staff strip (bottom ~160 px of canvas) will overlap with `HarmonyControls` at the bottom-left. The staff panel should **not** interfere because:
  1. `HarmonyControls` is a DOM overlay (`position: absolute`, `z-index: 3`) — it renders above the PIXI canvas.
  2. The PIXI staff scene renders behind all DOM overlays.
  3. Visually, the HarmonyControls glass panel at `bottom: 46px` will float over the staff lines, which is acceptable (same as how the Tonnetz Hud, Legend, etc. overlay the canvas).

**Note for step 07.3:** The treble clef symbol + leftmost staff region may be partially obscured by HarmonyControls at bottom-left. Acceptable trade-off; the spec does not require rearranging existing DOM overlays.

---

## 12. `registerTicker` pattern (for step 07.4 integration)

`registerTicker(app: PIXI.Application): void` is exported from `tonnetz-scene.ts`. It registers a single ticker callback that dispatches to `tickHarmony` or `tickRhythm` based on `_currentView`.

For Phase 07, `tickHarmonyStaff` must be called when `view === 'harmony'`. The cleanest integration pattern (given `registerTicker` is a one-time call with a dispatcher closure) is:

**Option A:** Add `tickHarmonyStaff` call inside the existing `tickHarmony` function in `tonnetz-scene.ts` (one call site, no changes to `registerTicker` or `App.svelte`).

**Option B:** Export `tickHarmonyStaff` from `harmony-staff-scene.ts` and call it from `App.svelte` via a second `app.ticker.add(tickHarmonyStaff)` call.

The phase spec says: "`tickHarmonyStaff` is called unconditionally by the ticker; it must check `$sessionStore.view === 'harmony'` internally and early-return if not in harmony view (consistent with the pattern used by `tonnetz-scene.ts`'s `tickHarmony`)."

Given `registerTicker` dispatches `tickHarmony` when `view === 'harmony'`, the most consistent pattern is **Option A** — call `tickHarmonyStaff()` from within `tickHarmony()` (both are harmony-view only). This avoids modifying `registerTicker` or `App.svelte` for the ticker wiring. However, the spec says App.svelte should add `tickHarmonyStaff` via `registerTicker` or `app.ticker.add` — so **Option B** (direct `app.ticker.add(tickHarmonyStaff)` in `App.svelte`) is the authorized path per step 07.4 spec.

Record both options; step 07.3 and 07.4 will choose the approach consistent with the spec's wording.

---

## 13. `_currentView` in `tonnetz-scene.ts`

`tickHarmony` does NOT guard on `view === 'harmony'` itself — the guard is in `registerTicker`'s dispatcher:

```ts
if (view === 'harmony') {
  tickHarmony(delta);
} else {
  tickRhythm(delta);
}
```

The `_currentView` variable in `tonnetz-scene.ts` is set by `updateTonnetzDynamic` reading `state.view`. The spec says `tickHarmonyStaff` "must check `$sessionStore.view === 'harmony'` internally" — this suggests it adds its own guard via `get(sessionStore).view` each tick, consistent with rhythm-scene's pattern.

---

## 14. Open design questions for Pilot

### Pre-resolved (no action needed)

1. **Voice colors** — resolved above (§9): voice 0 → `COL.tonic`, voice 1 → `COL.subdom`, voice 2 → `COL.dom`.
2. **Staff panel layout region** — resolved above (§10): bottom strip of canvas, ~160 px high, with `staffBaseY = app.screen.height − 60` as a starting value.

### Remaining open question (for step 07.3 Dev judgment)

3. **Stage.ts accessor for `harmonyLayer`**: `stage.ts` must expose `harmonyLayer` in `getStageRefs()` or via a new `getHarmonyLayer()` function. This is a minor addition (two lines) to `stage.ts`. The spec says "do not add new layers to stage.ts" — this change adds an accessor to an existing container, not a new layer. Record as a needed implementation detail, not a governance blocker.

---

## 15. Summary of files read

| File | Lines | Purpose |
|---|---|---|
| `src/core/harmony/voice-tracks.ts` | 1–195 | VoiceEvent, VoiceRestEvent, VoiceTrack, computeVoiceTracks |
| `src/core/harmony/staff-map.ts` | 1–175 | noteToStaffPosition, StaffPosition, TREBLE_STAFF_LINES, STAFF_BOTTOM, STAFF_TOP |
| `src/core/harmony/time-map.ts` | 1–110 | cycleToPosition, PX_PER_CYCLE, LinearPosition, OrbitalPosition |
| `src/state/session.ts` | 1–200 | Chord, RestSlot, ProgressionSlot, HarmonyState, SessionState (partial), barsLabel |
| `src/state/phase-anchor.ts` | 1–85 | getVisualPhaseAnchor, anchorVisualPhase |
| `src/render/stage.ts` | 1–205 | StageRefs, getStageRefs, setView, harmonyLayer structure |
| `src/render/theme.ts` | 1–40 | COL, FONT_SERIF, FONT_SANS, FONT_MONO |
| `src/render/rhythm-scene.ts` | 1–110 | Module-level state, LayerGeo, build/update/tick pattern |
| `src/app/App.svelte` | 1–591 | Store subscription, registerTicker call, buildTonnetz/buildRhythmScene wiring |
| `src/app/app.css` | 1–50 | CSS custom properties: --bg, --stroke, --text, --tonic, etc. |
| `src/ui/HarmonyControls.svelte` | 1–139 | orbit-ctl position (bottom: 46px, left: 16px) |
