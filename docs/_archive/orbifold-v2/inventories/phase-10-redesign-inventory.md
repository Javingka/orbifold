<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 10 Redesign — Inventory (step 10.9)

**Purpose:** Resolve OQ-R1 through OQ-R8 so that no ambiguity remains before any code
lands in steps 10.11–10.15. Every answer is backed by an exact source citation (file path
+ line numbers + actual signatures). No assumption is used in place of a source read.

**Date:** 2026-06-13  
**Status:** COMPLETE — awaiting Pilot review at Checkpoint #1.

---

## OQ-R1 — computeDiatonic API and tonal-function lookup

### Call chain

**File:** `src/core/theory/scales.ts`

```
computeDiatonic(root: number, mode: Mode): DiatonicChord[]   (line 55)
```

Each returned `DiatonicChord` has the field `func: TonalFunctionInfo` (interface declared
at lines 40–47).

**`TonalFunctionInfo`** is defined in `src/core/theory/tonal-function.ts`:

```ts
export interface TonalFunctionInfo {   // lines 9–13
  f: TonalFunctionLabel;               // 'T' | 'SD' | 'D' | ''
  label: string;                       // 'tónica' | 'subdominante' | 'dominante' | ''
  cls: 'tonic' | 'subdom' | 'dom' | '';
}
```

**The field for the T/SD/D string key is `func.cls`** — values `'tonic'`, `'subdom'`,
`'dom'`, or `''` (non-diatonic / locrian vii°). The phase file's statement "func.cls is
the string key" (phase-10-redesign.md line 83) is confirmed correct.

### diatonicLookup

**File:** `src/core/theory/scales.ts`, lines 81–87:

```ts
export function diatonicLookup(root: number, mode: Mode): Record<string, DiatonicChord>
```

Already exported. Key format is `"${d.rootPc}:${d.qual}"` — e.g., `"0:maj"`, `"9:min"`.
The Canvas 2D render layer calls `diatonicLookup(root, mode)` once per frame and looks
up each chord slot by `"${slot.rootPc}:${slot.qual}"`.

### Non-diatonic chords

A chord not in the current key will miss in the map; `dmap["rootPc:qual"]` returns
`undefined`. The render layer treats a miss as: **no badge, no spotlight color** — use
neutral fill (`#8aa0ff`, the "accent" fallback). This matches the prototype's
`this.FC[slot.func] || '#8aa0ff'` (Pentagrama.dc.html line 265).

### FC color map (confirmed)

```
FC = { tonic:'#f3b15a', subdom:'#56cfc4', dom:'#e87bac' }
```

Non-diatonic chords → neutral `'#8aa0ff'` for spotlight, no badge.

---

## OQ-R2 — Note-name string → MIDI integer → staff position

### What chordVoicing returns

**File:** `src/core/theory/chords.ts`, lines 61–67:

```ts
export function chordVoicing(rootPc: number, qual: Quality, octave: number): string[]
```

Returns strings like `"C4"`, `"E4"`, `"G4"`, `"C#4"`, `"A#3"`.
Format: `NOTE_NAMES[pc] + octave` where `NOTE_NAMES` uses sharp-only spellings
(`"C", "C#", "D", "D#", …`).

### Does staff-map.ts export a note-name → MIDI helper?

**File:** `src/core/harmony/staff-map.ts` — NO. There is no `noteNameToMidi`-equivalent
export. The file exports:
- `noteToStaffPosition(noteName: string): StaffPosition` (line 165) — note name → diatonic steps + accidental + ledger lines
- Constants: `TREBLE_STAFF_LINES`, `STAFF_BOTTOM`, `STAFF_TOP`

The internal helper `noteToSteps(noteName: string): number` (line 96) converts note name
to diatonic steps (C4=0). It is private (not exported).

### Decision: the render layer must inline the MIDI conversion

The prototype's `m2p(midi)` takes a MIDI integer. The conversion path:

**Step 1 — note name → MIDI integer (inline in render layer):**

```
letter → chromatic pitch class:
  C→0, C#→1, D→2, D#→3, E→4, F→5, F#→6, G→7, G#→8, A→9, A#→10, B→11
  (plus flat equivalents: Bb→10, Eb→3, etc.)

midi = chromaticPc + (octave + 1) * 12
```

This is exactly the prototype's `m2p` inverse: `N[midi%12]` and `Math.floor(midi/12)`.

**Step 2 — MIDI → `{ pos, sh }` (port of prototype `m2p`):**

```ts
// Prototype Pentagrama.dc.html lines 160–165:
m2p(midi) {
  const N = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const D = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 };
  const n = N[midi % 12], sh = n.length > 1, b = sh ? n[0] : n;
  return { pos: (Math.floor(midi / 12) - 5) * 7 + D[b] - 6, sh };
}
```

`pos` is diatonic steps from B4 (the center, pos=0 in prototype coordinates).
This is NOT the same as staff-map.ts's `steps` (C4=0). The formula is:
`pos_prototype = (octave - 5) * 7 + diatonicPc_of_natural_letter - 6`

Note: `- 6` accounts for D[B]=6 putting B4 (midi=71 → octave=5, letter B, D[B]=6) at pos=0.
Verification: midi=71 → `(5-5)*7 + 6 - 6 = 0`. Correct.

**Prototype `ny(pos)` uses center shift:** `H/2 - pos*(LS/2)` (line 168). However, the
paint() function declares `cy = H/2 - ls*0.75` (line 248) and staff lines are at
`cy - li*ls` for li in [-2..2]. The `ny(pos)` function is used for note positions and is
SEPARATE from cy — it anchors to H/2, not cy. This means `ny(pos)` is:
`y = H/2 - pos*(LS/2)`.

**The canonical render path for this phase:**

1. `chordVoicing(rootPc, qual, octave)` → `["C4", "E4", "G4"]`
2. Parse each string inline to MIDI integer (letter→chromatic pc, then midi = pc + (oct+1)×12)
3. `m2p(midi)` → `{ pos, sh }` (ported verbatim from prototype)
4. `ny(pos)` → canvas y (using `H/2 - pos*(LS/2)`)
5. `sh` flag → draw `♯` glyph; also shifts bar left edge (prototype: `bx = x + (sh?22:6)`)

**Accidentals:** Since `NOTE_NAMES` in the app uses sharp-only spellings and `chordVoicing`
uses them too, the only accidental produced is `#`. The prototype's `sh = n.length > 1`
is equivalent. Flat inputs are not produced by `chordVoicing`.

**Why not reuse `noteToStaffPosition`?** That function uses diatonic-steps (C4=0,
equidistant letter positions), which is the correct format for the PIXI staff renderer's
`staffBaseY` geometry. The Canvas 2D renderer uses the prototype's MIDI-based `pos`
(B4-centered) with `ny()`. These two coordinate systems are incompatible. The Canvas 2D
layer MUST use the prototype's `m2p`/`ny` path to match the visual design spec.

---

## OQ-R3 — SL offset reconciliation with `computeSlotBounds`

### computeSlotBounds origin

**File:** `src/core/harmony/staff-hit.ts`, lines 47–60:

```ts
export function computeSlotBounds(
  progression: ReadonlyArray<{ bars?: number }>,
  pxPerCycle: number
): SlotBounds[]
```

Slots are laid out contiguously **from x = 0** (line 55: `let cursorX = 0`). The first
slot has `x = 0`, not `x = SL`.

### Prototype slot positions

`slotX(i)` in the prototype starts at `SL = 76` (line 173–176). So the prototype's slot
bounds are shifted right by `SL` pixels relative to `computeSlotBounds`.

### Signed offset convention

The render layer adds `SL` to all x positions when drawing:
- Slot left edge on canvas: `bounds[i].x + SL`
- Slot right edge on canvas: `bounds[i].x + bounds[i].width + SL`

When hit-testing a pointer event at `e.offsetX`:
```ts
const adjustedPx = e.offsetX - SL;
const hitIdx = hitTestSlot(adjustedPx, bounds);
```

A pointer in the clef gutter (`e.offsetX < SL`) gives `adjustedPx < 0`.
`hitTestSlot` checks `px >= b.x` where `b.x >= 0`, so negative `adjustedPx` correctly
returns `null`. No special edge-case handling needed.

**File:** `src/core/harmony/staff-hit.ts`, lines 78–85:

```ts
export function hitTestSlot(px: number, bounds: SlotBounds[]): number | null {
  for (const b of bounds) {
    if (px >= b.x && px < b.x + b.width) return b.slotIndex;
  }
  return null;
}
```

With `px < 0` and all `b.x >= 0`, the condition `px >= b.x` is always false → returns
`null`. Confirmed safe.

### pxPerCycle

`computeSlotBounds` must be called with `pxPerCycle = 48`.
**Source:** `PX_PER_CYCLE = 48` is the canonical constant in
`src/core/harmony/time-map.ts` (confirmed by harmony-staff-scene.ts line 85:
`import { PX_PER_CYCLE } from '../core/harmony/time-map.js'`).
The Canvas 2D layer imports `PX_PER_CYCLE` from `time-map.ts` or declares `const PX = 48`
matching that value.

### hitTestResizeHandle call

```ts
hitTestResizeHandle(e.offsetX - SL, bounds, handleWidth)
```

Same SL subtraction applies. Pointer in the gutter → null. Pointer on the right edge of
the last slot → correct match.

---

## OQ-R4 — Header register toggle removal: schema/persistence/agent safety

### Full audit of `registerMode` references (source: grep output)

| File | Lines | Role |
|---|---|---|
| `src/ui/Header.svelte` | 402, 407, 409, 410, 415, 416 | Visual toggle UI (to be REMOVED) |
| `src/core/harmony/voice-tracks.ts` | 164, 171, 256, 258 | Engine parameter (kept, not consumed by Canvas 2D) |
| `src/render/harmony-staff-scene.ts` | 755, 761 | PIXI staff scene consumer (being RETIRED) |
| `src/state/session.ts` | 176, 200, 274, 665, 669, 680, 1360 | Store type + actions (kept inert) |
| `src/lib/persistence.ts` | 227, 229 | JSDoc comment + `'suavizado' as const` reset — NOT a schema field |

### SavedHarmonySchema audit (`src/lib/persistence.ts`, lines 52–60)

```ts
const SavedHarmonySchema = z.object({
  root: z.number().int().min(0).max(11),
  mode: z.enum(SK_MODES),
  octave: z.number().int().min(2).max(5),
  progression: z.array(z.union([SavedRestSchema, SavedChordSchema])).max(16),
});
```

`registerMode` is **absent** from `SavedHarmonySchema`. Confirmed.

### Agent schema audit (`src/agent/schema.ts`, lines 143–148)

```ts
export const HarmonySpecSchema = z.object({
  root: z.string().optional(),
  mode: z.enum(SK_MODES).optional(),
  octave: z.number().int().min(2).max(5).optional(),
  progression: z.array(HarmonyChordSchema).min(1).max(8).optional(),
});
```

`registerMode` is **absent** from `HarmonySpecSchema`. Confirmed.

### setRegisterMode call sites

Only one call site: `src/ui/Header.svelte` lines 410, 416 (inside the `#registerModeSeg`
`<div>`). The function is imported at line 40 of Header.svelte.

**Verdict: SAFE TO REMOVE.**

Steps:
1. Delete the `#registerModeSeg` `<div>` block (Header.svelte lines 407–420).
2. Remove `setRegisterMode` from the import at Header.svelte line 40.
3. Leave `HarmonyState.registerMode`, `setRegisterMode` function, and `voice-tracks.ts`
   intact — they are inert once Header.svelte no longer calls them.
4. No schema, persistence, or agent path references `registerMode` in a way that breaks.

### voice-tracks.ts status

`voice-tracks.ts` computes `computeVoiceTracks` which is consumed by
`harmony-staff-scene.ts` (PIXI, being retired) and `staff-layout.ts`. The Canvas 2D
layer does NOT import `voice-tracks.ts` — it uses `chordVoicing` + `m2p` directly (ADR
0015 D4). `voice-tracks.ts` becomes dead code in the visual pipeline but its unit tests
remain green. It is **left inert** (not deleted) per D-A.

The hint text in App.svelte line 485 ("Cambia modo registro: suavizado / estricto") also
references register mode. This hint must be updated in step 10.11 when the toggle is
removed (it describes a UI element that will no longer exist). This is an App.svelte
change, not a separate blocker.

---

## OQ-R5 — harmony-staff-scene.ts retirement plan

### Files that import from `harmony-staff-scene.ts`

Grep result: only **one file** imports from `harmony-staff-scene.ts`:

```
/Users/virtualmachine/Development/personal/Orbifold/src/app/App.svelte:50:
  } from '../render/harmony-staff-scene.js';
```

Other references in `ProgressionStrip.svelte` (lines 141, 147, 185) are **comments only**
(`// matches _staffWidth in harmony-staff-scene.ts exactly`) — not actual imports.
`voice-tracks.ts` line 51 also references it in a comment only.

### App.svelte import block (lines 44–50)

```ts
import {
  buildHarmonyStaffScene,
  updateHarmonyStaffDynamic,
  tickHarmonyStaff,
  onStaffPointerDown,
  onStaffPointerMove,
  onStaffPointerUp,
} from '../render/harmony-staff-scene.js';
```

### App.svelte call sites (exact line numbers)

| Function | Location in App.svelte | Context |
|---|---|---|
| `buildHarmonyStaffScene` | Line 177 | `onMount` initial build |
| `buildHarmonyStaffScene` | Line 185 | `onResize` callback |
| `buildHarmonyStaffScene` | Line 271 | Store subscription (structural change branch) |
| `updateHarmonyStaffDynamic` | Line 188 | `onResize` callback (post-rebuild) |
| `updateHarmonyStaffDynamic` | Line 278 | Store subscription (dynamic-only branch) |
| `tickHarmonyStaff` | Line 198 | `app.ticker.add(tickHarmonyStaff)` |
| `onStaffPointerDown` | Line 291 | Canvas `pointerdown` listener (staff branch) |
| `onStaffPointerMove` | Line 319 | Canvas `pointermove` listener (staff branch) |
| `onStaffPointerUp` | Line 343 | Canvas `pointerup` listener (staff branch) |

Additionally, App.svelte declares two tracking variables tied to the staff rebuild logic:
- `prevProgressionLength`, `prevOctave`, `prevTotalBars`, `prevChordMode`, `prevProgressionKey`
  (lines 121–126) — initialized in `onMount` (lines 138–149), used in the store subscription
  (lines 252–276). These remain relevant for coordinating when to call `setPentagramaVisible`
  but the logic can be simplified since the Canvas 2D layer redraws every rAF frame.

### Retirement plan

**Step 10.11:** Delete `src/render/harmony-staff-scene.ts`.

Since only `App.svelte` imports it, deletion is clean — no other file will develop a
TypeScript error. Remove the entire import block (lines 44–50) and all nine call sites
from App.svelte.

The hint text in App.svelte lines 484–486 referencing "suavizado / estricto" must also
be updated (it describes the removed register toggle).

### stage.ts `_staffContainer` changes

**File:** `src/render/stage.ts`

`_staffContainer` is used in:
- Line 30 (module-level declaration): `let _staffContainer: PIXI.Container | null = null;`
- Line 112–113 (`initStage`): created and set `visible = false`
- Line 114 (`initStage`): `harmonyLayer.addChild(_tonnetzContainer, _staffContainer)`
- Line 193–194 (`setHarmonySubview`): `_staffContainer.visible = subview === 'staff'`
- Lines 237–239 (`getStageRefs` null check): `_staffContainer === null`
- Lines 252, 257 (`getStageRefs` return): `staffContainer: _staffContainer`
- `StageRefs` interface line 216: `staffContainer: PIXI.Container`

**What changes in step 10.11:**

The Canvas 2D `<canvas>` element is a plain DOM element — it does NOT go into a PIXI
sub-container. `_staffContainer` is therefore no longer needed for the new layer.

Concrete changes:
1. Remove `_staffContainer` declaration (line 30).
2. In `initStage`: remove `_staffContainer = new PIXI.Container(); _staffContainer.visible = false;` and remove it from `harmonyLayer.addChild(...)`.
3. In `setHarmonySubview`: remove the `_staffContainer.visible = ...` line. The new layer's show/hide is handled by `setPentagramaVisible` in the Canvas 2D module, called from App.svelte's store subscription.
4. Remove `_staffContainer` from the null check in `getStageRefs` and from the `StageRefs` interface and return value.

`setHarmonySubview` in `stage.ts` can be left in place (it toggles `_tonnetzContainer`
visibility, which is still needed) but its `_staffContainer` branch is removed.

`setHarmonySubview` in `session.ts` (lines 652–660) calls `stage.setHarmonySubview` via
lazy import — this still applies to toggle Tonnetz visibility and is kept.

---

## OQ-R6 — Canvas 2D z-order against existing DOM overlays

### Current DOM elements inside `#stage` with z-index

`#stage` has `position: relative` (App.svelte CSS line 638).

| Element | File | z-index | Notes |
|---|---|---|---|
| PIXI `<canvas>` (appended by `initStage`) | stage.ts line 99 | auto (= 0 in stacking) | `display:block`, no explicit z-index |
| `HarmonyControls` | HarmonyControls.svelte | N/A — now an empty shell | renders nothing |
| `RhythmControls` | App.svelte line 453 | N/A — empty shell | renders nothing |
| `.hint` div | App.svelte CSS line 651 | **z-index: 2** | position:absolute |
| `Hud` | Hud.svelte line 59 | **z-index: 3** | position:absolute |
| `Legend` | Legend.svelte line 50 | **z-index: 3** | position:absolute; pointer-events:none |
| `CompositionDrawer` | inside `#stage` via `{#if}` | N/A when harmony active | mounts only when view==='composition' |
| `CodeDrawer` | inside `#stage` via `{#if}` | N/A when harmony active | mounts only when view==='code' |

### CSS strategy for the new Canvas 2D `<canvas>`

The new canvas must:
1. Sit **above** the PIXI canvas (which is z-index: auto/0) to receive pointer events
2. Sit **below** the SVG/Svelte overlay components (Hud z-index:3, Legend z-index:3, hint z-index:2)
3. Use `display:none` and `pointer-events:none` when `subview !== 'staff'`

**Recommended z-index: 1**

```css
position: absolute;
top: 0;
left: 0;
z-index: 1;
display: none;         /* toggled to 'block' by setPentagramaVisible(true) */
pointer-events: none;  /* toggled to 'auto' by setPentagramaVisible(true) */
```

When visible (`subview === 'staff'`):
- `display: block` — canvas paints
- `pointer-events: auto` — canvas receives `pointerdown/move/up`

When hidden (`subview !== 'staff'`):
- `display: none` — canvas does not paint, does not intercept events
- `pointer-events: none` — belt-and-suspenders (display:none already blocks events)

This placement (z-index:1) ensures:
- Canvas 2D is above PIXI (z-index:0/auto)
- Canvas 2D is below Hud/Legend (z-index:3) and hint (z-index:2)
- No visual conflict: Hud, Legend, and hint are positioned at canvas corners; the Canvas 2D fills the full stage

---

## OQ-R7 — Prototype pArp stagger: per-slot or per-cycle?

### Prototype code (verbatim)

**File:** `docs/orbifold-v2/reference/Pentagrama.dc.html`, lines 468–497:

```js
pArp(ctx, slot, x, w, cy, isAct, isHov, ts) {
  const or    = this.OR;
  const pulse = isAct ? 1 + 0.16 * Math.sin(ts / 700 * Math.PI * 2) : 1;
  const n     = slot.voices.length;
  const span  = w - 24;         // <-- span = full slot width minus margins

  const pts = slot.voices.map((v, vi) => ({
    x: x + 12 + (vi / Math.max(n - 1, 2)) * span,  // <-- per-SLOT spread
    y: this.ny(this.m2p(v.midi).pos),
  }));
  // ...
```

The prototype uses `span = w - 24` where `w = slot.duration * PX`. For a 2-bar slot,
`w = 96px`, `span = 72px`. Voice 0 is at `x+12`, voice 1 at `x+12+36`, voice 2 at
`x+12+72` — spread evenly across the **entire** slot.

**This is the per-SLOT spread behavior.**

### Corrected implementation (per ADR 0015 D5, phase-10-redesign.md line 101–108)

The corrected behavior is **per-cycle stagger**. Rationale: Strudel arp codegen produces
`note("A B C")` inside `arrange([bars, code])`, so the 3-note sequence plays once per
cycle. A 2-bar slot plays the group twice. The stagger must repeat once per cycle.

**Implementation target:**

For each slot of `bars` cycles:
```
for cycleIdx in 0..ceil(bars)-1:
  voice 0 at: slotX + SL + cycleIdx * PX
  voice 1 at: slotX + SL + cycleIdx * PX + PX/3   (= 16px offset)
  voice 2 at: slotX + SL + cycleIdx * PX + 2*PX/3 (= 32px offset)
  draw connector line between the three onset circles within this cycle
```

where `PX = 48`. This mirrors the behavior already implemented in the PIXI staff scene
(harmony-staff-scene.ts lines 551–599, step 10.5, confirmed as the precedent per
phase-10-redesign.md line 100: "commit 0c3d595 precedent").

**Documented divergence from prototype:** The prototype's `pArp` uses a per-slot spread
(`span = w - 24`). The app uses per-cycle stagger (`voice_i at cycleStart + i/3 * PX`).
This is an intentional divergence documented in ADR 0015 D5. Dev handoffs for step 10.12
must cite these lines and explain the divergence.

---

## OQ-R8 — Test baseline after steps 10.3–10.8

### pnpm exec vitest run

```
Test Files  14 passed (14)
      Tests  447 passed (447)
   Duration  589ms
```

All 447 tests pass. Baseline confirmed at ≥ 447 (matches step 10.8 handoff expectation).

Breakdown by test file:
- `tests/harmony/staff-hit.test.ts` — 42 tests (pure engine, reused by Canvas 2D layer)
- `tests/euclid.test.ts` — 25
- `tests/harmony/staff-map.test.ts` — 73
- `tests/harmony/voice-tracks-register.test.ts` — 24
- `tests/harmony/voice-tracks.test.ts` — 18
- `tests/codegen.test.ts` — 39
- `tests/harmony/staff-layout.test.ts` — 32
- `tests/tonnetz.test.ts` — 31
- `tests/harmony/time-map.test.ts` — 13
- `tests/schema.test.ts` — 41
- `tests/session.test.ts` — 55
- `tests/persistence.test.ts` — 42
- `tests/phase-anchor.test.ts` — 4
- `tests/voice-leading.test.ts` — 8

### pnpm exec tsc --noEmit

Exit 0, no output. **0 TypeScript errors.**

### pnpm lint

```
> orbifold@0.0.1 lint
> eslint . && prettier --check .
Checking formatting...
All matched files use Prettier code style!
```

**0 ESLint errors. 0 Prettier formatting violations.**

**Baseline summary:**
- Tests: 447 passed, 0 failed
- TypeScript: 0 errors
- Lint: 0 errors

---

## Additional findings for steps 10.11–10.15

### App.svelte hint text update (not a blocker, but must not be forgotten)

App.svelte lines 484–486 read:
```
3 voces en color — tónica, subdominante, dominante. Cambia modo registro: suavizado
(contornos suaves) o estricto (posición absoluta).
```

When the register toggle is removed (step 10.11), this hint must be updated to remove
the "Cambia modo registro" reference. Suggested replacement:
```
3 voces en color — tónica (naranja), subdominante (turquesa), dominante (rosa).
Clic para seleccionar · arrastrar para mover · borde derecho para redimensionar.
```

### ny() formula reconciliation

The prototype's `ny(pos)` anchors to `H/2` (line 168: `H/2 - pos*(LS/2)`), but the
staff lines are drawn at `cy - li * ls` for `li` in `[-2..2]`, where
`cy = H/2 - ls*0.75` (line 248). The five staff lines are:
- `li=-2`: `cy + 2*ls` (bottom line, E4)
- `li=-1`: `cy + ls`
- `li=0`: `cy` (center, B4)
- `li=+1`: `cy - ls`
- `li=+2`: `cy - 2*ls` (top line, F5)

But `ny(pos)` with pos=0 gives `H/2`, not `cy`. The divergence (`LS*0.75`) means notes
use a different vertical center than the staff lines. This is intentional in the
prototype — the staff lines are shifted upward relative to the median note height.

**For the implementation:** use `cy = H/2 - ls*0.75` for staff lines (drawn at
`cy - li*ls`) and `ny(pos) = H/2 - pos*(ls/2)` for note heads. This replicates the
prototype exactly. The two formulas coexist without reconciliation in the prototype.

### Prototype m2p coordinate system vs staff-map.ts

The prototype's `pos=0` is B4 (MIDI 71). Staff-map.ts's `steps=6` is also B4 (C4=0,
then +6 for B4). The relationship is:
`pos_prototype = steps_staffmap - 6`

This means: `ny(pos) = H/2 - (steps - 6)*(ls/2)`. Neither system must be "converted" —
the Canvas 2D renderer exclusively uses the prototype's pos/ny system and does not
import staff-map.ts for rendering purposes.

---

## Acceptance Coverage

This inventory step (10.9) maps to:

| Acceptance ID | How covered |
|---|---|
| A-10-33 (zero codegen changes) | Confirmed: no source files modified in this step; `tsc --noEmit` and `pnpm lint` both pass clean at baseline. `git diff main...HEAD -- src/core/codegen/strudel.ts` will be verified again at step 10.16. |
| A-10-34 (quality gates baseline) | Tests: 447 passed; tsc: 0 errors; lint: 0 errors. Baseline established for all subsequent steps. |

Visual acceptance IDs (A-10-17 through A-10-32) are verified at step 10.16 (manual
Checkpoint #5).

---

## Handoff Entry

**Step:** 10.9 — Redesign inventory  
**Status:** COMPLETE  
**Date:** 2026-06-13

**What was done:**
Read all required source files and the Pentagrama prototype. Ran `pnpm exec vitest run`,
`pnpm exec tsc --noEmit`, and `pnpm lint` to establish the redesign baseline. Produced
this inventory resolving all eight open questions.

**No source files were modified.**

**Quality gate baseline:**
- Tests: 447 passed (14 files)
- TypeScript: 0 errors
- Lint: 0 errors (ESLint + Prettier)

**Key findings for 10.11–10.15:**
1. `func.cls` is the tonal-function string field (`'tonic'|'subdom'|'dom'|''`).
2. `staff-map.ts` has NO `noteNameToMidi` export; render layer must inline the MIDI
   conversion and port `m2p` verbatim from the prototype.
3. `hitTestSlot(e.offsetX - SL, bounds)` is the correct call; `px < 0` in the clef
   gutter correctly returns null.
4. `registerMode` removal is SAFE — absent from `SavedHarmonySchema` and
   `agent/schema.ts`; only one call site (`Header.svelte` lines 407–420).
5. Only `App.svelte` imports `harmony-staff-scene.ts`; file can be deleted in step
   10.11; nine call sites in App.svelte to remove (listed with exact line numbers).
6. New Canvas 2D `<canvas>` uses `z-index: 1` (above PIXI canvas at z-auto, below
   Hud/Legend at z-index:3); `display:none; pointer-events:none` when hidden.
7. Prototype `pArp` uses per-SLOT spread — implementation uses corrected per-CYCLE
   stagger (0, PX/3, 2·PX/3 per cycle, repeated `ceil(bars)` times). Intentional
   divergence documented.
8. Baseline: 447 tests, 0 tsc errors, 0 lint errors.

**Next action (from phase file):** CHECKPOINT #1 — Pilot reviews inventory before ADR
10.10 and code steps proceed. Do NOT auto-continue to step 10.10.
