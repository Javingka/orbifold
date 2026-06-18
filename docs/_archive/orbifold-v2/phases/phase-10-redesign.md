<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 10 Redesign — Pentagrama: Canvas 2D Layer (steps 10.9–10.16)

**Continues Phase 10 numbering.** Steps 10.1–10.8 built the PIXI-based slot editor
(engines complete, logic correct); the Pilot rejected the visual result at Checkpoint #5
and commissioned a standalone Canvas 2D prototype (`docs/orbifold-v2/reference/
Pentagrama.dc.html`) as the design spec. This section delivers that prototype faithfully
inside the app, retiring the PIXI staff renderer for the Pentagrama sub-view.

---

## Background

### Why a redesign

The PIXI staff scene in `harmony-staff-scene.ts` produces the correct slot geometry and
interaction logic but fails the visual bar — the gemstone onset circles, attack→decay
gradient sustain bars, responsive line spacing (`LS = H/6`), ambient breathe, and
tonal-function spotlight that define the prototype's look cannot be replicated idiomatically
in PIXI v7's retained-mode Graphics API. The Pilot approved a technology switch to a
dedicated Canvas 2D `<canvas>` element for the Pentagrama sub-view.

### Pilot-approved decisions (Checkpoint #2, 2026-06-13)

These are settled; steps below implement them. ADR 0015 (step 10.10) records them
formally.

- **D-A** — Pentagrama is rendered as a **dedicated Canvas 2D layer**: a `<canvas>`
  element mounted inside `#stage`, drawn with the `CanvasRenderingContext2D` API. The
  PIXI staff scene (`harmony-staff-scene.ts`) is **retired for rendering** — its
  `buildHarmonyStaffScene` / `updateHarmonyStaffDynamic` / `tickHarmonyStaff` /
  `onStaffPointerDown` / `onStaffPointerMove` / `onStaffPointerUp` exports are removed
  from `App.svelte` wiring once the new layer is live. The pure engines (`staff-layout.ts`,
  `staff-map.ts`, `voice-tracks.ts`, `time-map.ts`, `staff-hit.ts`) and their unit tests
  are **kept** (staff-hit is actively reused; others retained even if unused by the new
  layer). Tonnetz and Rhythm remain PIXI. Two render technologies coexist by design,
  contained to this view.

- **D-B** — **Drop `estricto`/`suavizado` register modes**. The new staff uses raw
  `chordVoicing(rootPc, qual, octave)` pitches (as the prototype does — per-chord
  MIDI-equivalent, no octave-continuity algorithm). **Remove the register segmented
  toggle from `Header.svelte`** (the `#registerModeSeg` `<div>` and its two buttons,
  approximately lines 407–420). Confirmed audio-safe: `registerMode` appears nowhere in
  `src/core/codegen/strudel.ts` or `src/audio/strudel.ts`. `harmony.registerMode` is
  ephemeral and not persisted (Decisions Register, Phase 08); leaving the field inert in
  the store schema is acceptable — the inventory must confirm no schema/persistence/agent
  dependency breaks.

### Integration boundaries (orchestrator's settled calls)

- Integrate **only** the prototype's canvas stage content + interactions. The prototype's
  own header (title, acorde/arpegio toggle, play button) and status bar are demo chrome —
  **discard** them. The app's existing top bar (Phase 09) and bottom Transport stay
  untouched. The acorde/arpegio toggle and play already exist in the app.

- Keep the **Tonnetz ⇄ Pentagrama sub-toggle**. The 2D `<canvas>` is visible only when
  `view === 'harmony' && harmony.subview === 'staff'`; otherwise `display:none` AND
  `pointer-events:none` so it never intercepts Tonnetz or other-view pointers. Lifecycle:
  rAF loop + ResizeObserver started/stopped appropriately; cleanup on `onDestroy`.

- **DPR scaling**: `dpr = Math.min(devicePixelRatio, 2)`. On each `setup(w, h)` call:
  `canvas.width = round(w * dpr)`, `canvas.height = round(h * dpr)`, CSS size `w×h px`.
  Each `paint(ts)` frame: `ctx.save(); ctx.scale(dpr, dpr); ... ctx.restore()`.
  ResizeObserver on the stage container div.

- **Reuse `staff-hit.ts`** (`computeSlotBounds` / `hitTestSlot` / `hitTestResizeHandle`
  / `nearestInsertionIndex`). The new layer has a left margin `SL ≈ 76px` (clef gutter);
  `computeSlotBounds` starts bounds at `x = 0`, so the layer applies the `SL` offset
  before hit-testing (subtract `SL` from `e.offsetX` before passing to `hitTestSlot`).
  This is an **implementation detail in the render layer** — the engine is not changed.

- **Reuse store actions**: `✕ → clearChordAt(idx)`; resize commit → `setChordBars(idx,
  bars)` with `clampBars(0.25..8, step 0.25)`; reorder drop → `reorderSlot(fromIdx,
  toIdx)`. All call `requeueLive()` → audio at next cycle (by design).

- **Tonal function (T / SD / D)** for badges and active-slot spotlight color: derive from
  `computeDiatonic(root, mode)` (scales.ts) and look up the chord's `rootPc:qual` key.
  The Tonnetz already does this via `diatonicLookup` — the new layer uses the same call.
  `TonalFunctionInfo.cls` is the string key (`'tonic' | 'subdom' | 'dom' | 'accent'`);
  map to the tonal-function hex colors `FC = { tonic:'#f3b15a', subdom:'#56cfc4',
  dom:'#e87bac', accent:'#8aa0ff' }`. Inventory resolves whether a `diatonicLookup`
  result is cached per render or per store change.

- **Note MIDI → staff position**: the prototype's `m2p(midi)` converts MIDI integer to
  `{ pos, sh }` where `pos` is diatonic steps from B4 (center, step 0) and `sh` is
  whether the note has a sharp. `chordVoicing` returns string note names (e.g., `"C4"`);
  the render layer parses these to MIDI or uses a note-name-to-MIDI helper. The inventory
  resolves the exact conversion path (reuse `staff-map.ts`'s `noteNameToMidi`-equivalent,
  or inline the prototype's `m2p` logic).

- **PLAYHEAD**: rawX = `((performance.now() − getVisualPhaseAnchor()) / barMs) × PX` px,
  where `barMs = (60000 / bpm) × 4`, `PX = 48`. Add `SL` offset: playhead x on canvas =
  `SL + ((rawX % totalW) + totalW) % totalW`, where `totalW = slots.reduce(bars) × PX`.
  Gated on `nowPlaying.source !== null` (hidden when not playing). This matches
  `ProgressionStrip.svelte`'s cursor exactly so both stay in sync.

- **Arp stagger per cycle** (corrected behavior — commit 0c3d595 precedent): voice
  offsets within each slot repeat **once per cycle**, i.e.:
  - voice 0: `slotX + SL`
  - voice 1: `slotX + SL + PX/3` (within each cycle, not spread across the whole slot)
  - voice 2: `slotX + SL + 2×PX/3`
  The prototype's `pArp` spreads `span = w - 24` across the whole slot — that is **wrong**
  for multi-cycle slots. The spec requires per-cycle stagger: `(vi / (n - 1)) × PX`
  within the first cycle of the slot, repeating `ceil(bars)` times. Inventory confirms
  whether the prototype's `span`-based approach or the corrected version is implemented.

### Reversibility note

No runtime flag is used — this is a wholesale Pilot-requested view replacement. The PIXI
staff code (`harmony-staff-scene.ts`, `stage.ts` `_staffContainer` wiring) is preserved
in git history on the `orbifold-v2/phase-10` branch. If the Pilot reverses the decision,
git revert recovers it. The pure engines and their tests are untouched.

---

## Pilot decisions recorded here (pre-ADR, to be formalized in step 10.10)

| ID | Decision | Status |
|---|---|---|
| D-A | Canvas 2D dedicated layer; PIXI staff scene retired for rendering | Settled 2026-06-13 |
| D-B | Drop estricto/suavizado toggle; use raw chordVoicing pitch | Settled 2026-06-13 |

---

## Open questions for inventory (step 10.9) to resolve

The following questions must be answered by the inventory before any code lands:

**OQ-R1 — computeDiatonic API and tonal-function lookup.**
Exact call chain: `computeDiatonic(root, mode)` returns `DiatonicChord[]`; each has
`func: TonalFunctionInfo`. Confirm the field name for the T/SD/D string (`func.cls`?
`func.f`?). Confirm that `diatonicLookup(root, mode)` keyed by `"rootPc:qual"` is the
right helper, and verify it is already exported from `scales.ts`. Document whether the
lookup result needs to handle chords outside the diatonic set (non-diatonic chords will
miss in the map → render as neutral color, no badge).

**OQ-R2 — Note-name string → MIDI integer → staff position.**
`chordVoicing` returns strings like `"C4"`, `"E4"`, `"G4"`. The prototype's `m2p(midi)`
takes a MIDI integer. Determine the exact conversion path:
(a) Does `staff-map.ts` already export a `noteNameToMidi`-equivalent function? If so,
name it. (b) If not, can the render layer inline the conversion (letter → pc, octave →
MIDI = pc + (octave + 1) × 12)?  Document the approach so the inventory step commits to
one path.

**OQ-R3 — SL offset reconciliation with `computeSlotBounds`.**
`computeSlotBounds` returns `x = 0` for the first slot. The prototype's `slotX(i)` starts
at `SL = 76`. Confirm the approach: subtract `SL` from raw pointer `offsetX` before
calling `hitTestSlot` (i.e., `hitTestSlot(e.offsetX - SL, bounds)`). Document the sign
convention and check for edge cases (pointer in the clef gutter, `px < 0` after
subtraction → `hitTestSlot` correctly returns null for those positions).

**OQ-R4 — Removing the Header register toggle: schema/persistence/agent safety check.**
Confirm the full audit: (a) `harmony.registerMode` is NOT in `SavedHarmonySchema`
(persistence.ts); (b) `registerMode` is NOT in `src/agent/schema.ts`; (c) `setRegisterMode`
is not imported by any file that would break if the call site (Header.svelte button) is
removed; (d) `registerMode` appears in `voice-tracks.ts` but that file's output is no
longer consumed by the rendering pipeline once the Canvas 2D layer replaces the PIXI
staff — confirm this and state whether `voice-tracks.ts` can safely be left inert or
should be pruned.

**OQ-R5 — `harmony-staff-scene.ts` retirement plan.**
Determine: (a) Should the file be deleted or neutralized (all exports become no-ops)?
Deletion is cleaner; neutralization is safer if any other file imports it. List all
importers. (b) How is `App.svelte`'s build/tick/pointer wiring for the staff removed —
find the exact lines for the four import names (`buildHarmonyStaffScene`,
`updateHarmonyStaffDynamic`, `tickHarmonyStaff`, `onStaffPointerDown`, `onStaffPointerMove`,
`onStaffPointerUp`) and the call sites in `onMount` / `unsubStore` / canvas event
listeners. (c) Is `_staffContainer` in `stage.ts` still needed for the Canvas 2D layer
(it is not — the new `<canvas>` is a plain DOM element), and what changes in `stage.ts`
are required (if any) to remove the `_staffContainer` sub-container?

**OQ-R6 — Canvas 2D z-order against existing DOM overlays.**
List all DOM elements currently overlapping `#stage` (HarmonyControls, Hud, Legend,
ProgressionStrip, and the PIXI `<canvas>`). The new Canvas 2D `<canvas>` must sit above
the PIXI canvas but below the SVG/Svelte overlay components. Determine the correct CSS
`z-index` and `position:absolute; top:0; left:0` placement. Confirm that
`pointer-events:none` is applied when `subview !== 'staff'`.

**OQ-R7 — Prototype `pArp` stagger: per-cycle or per-slot?**
Read `pArp` in `Pentagrama.dc.html`. The prototype uses `span = w - 24` spread across the
whole slot width, giving `x = x + 12 + (vi / max(n-1,2)) * span` — a **per-slot** spread.
Confirm whether the corrected **per-cycle** stagger (voice offsets 0, PX/3, 2·PX/3 within
each cycle, repeated) is specified for the implementation (it is, per orchestrator's
settled call), and document this as a divergence from the prototype's `pArp`.

**OQ-R8 — Test baseline after steps 10.3–10.8.**
Run `pnpm exec vitest run` and confirm the count (expected ≥ 447 per step 10.8 handoff).
Run `pnpm exec tsc --noEmit` and `pnpm lint` for a clean baseline before any redesign
code lands.

---

## Invariants to maintain

- **TS strict**. All new files use TypeScript strict mode.
- **`core/**` has no DOM/PIXI/Svelte imports** — the Canvas 2D layer is render-layer
  code in `src/render/` (or mounted via `App.svelte`), NOT in `core/`. `staff-hit.ts`
  remains pure and is imported by the render layer (permitted direction).
- **AGPL-3.0 headers** on all new and modified files.
- **No `.fast`/`.slow`** in codegen. Live edits requeue next cycle (unchanged).
- **Zero codegen changes** across the entire redesign:
  `git diff main...HEAD -- src/core/codegen/strudel.ts` must remain empty.
  Audio is byte-identical before and after. Verify by grep at step 10.16.
- **`pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm test` + `pnpm build`** all clean at
  every step's gate.
- **`staff-hit.ts` and its 42 tests untouched** (pure engine; reused by new layer).
- **`reorderSlot` store action untouched** (pure store logic; already tested).

---

## Prototype parity source

The design spec is `docs/orbifold-v2/reference/Pentagrama.dc.html`. Method names to cite
in Dev handoffs:

| Prototype method | Purpose |
|---|---|
| `m2p(midi)` | MIDI int → `{ pos, sh }` diatonic staff position + accidental |
| `ny(pos)` | diatonic pos → canvas y (`H/2 − LS*0.75 − pos × LS/2`) |
| `slotX(i)` | slot index → left edge x (starts at `SL = 76`) |
| `slotW(s)` | slot → pixel width (`duration × PX`) |
| `totalW()` | sum of all slot widths |
| `pChord(ctx, slot, x, w, cy, isAct, isHov, ts)` | chord slot rendering (sustain bar + gemstone onset) |
| `pArp(ctx, slot, x, w, cy, isAct, isHov, ts)` | arp slot rendering (staggered circles + connector) |
| `pRest(ctx, x, w, cy, isAct, ts)` | rest slot rendering |
| `ldg(ctx, pos, nx)` | ledger lines above/below staff |
| `rr(ctx, x, y, w, h, r)` | rounded-rect helper |
| `ha(v)` | float → 2-char hex alpha |
| `hitSlot(px)` / `insertPos(px, exclude)` | hit testing (superseded by `staff-hit.ts`) |
| `phX(ts)` / `actIdx(ts)` | playhead + active slot (superseded by shared anchor) |
| `paint(ts)` | main draw function |
| `setup(w, h)` | DPR canvas sizing |
| `onDn / onMv / onUp` | pointer handlers |

Dev handoffs for steps 10.12–10.14 must cite these names and explain any intentional
divergences (e.g., arp stagger corrected to per-cycle).

---

## Acceptance IDs — Redesign additions (A-10-17+)

The prior IDs A-10-01 through A-10-16 specified the PIXI-based slot editor. The redesign
supersedes the **manual visual** criteria (A-10-01 through A-10-10) with new ones below.
The **automated** criteria (A-10-11 through A-10-16) remain in force and are re-verified
at step 10.16. New IDs pick up from A-10-17.

| ID | Description | Type |
|---|---|---|
| A-10-17 | Canvas 2D `<canvas>` element mounts inside `#stage` with correct DPR scaling; visible only when `view === 'harmony' && subview === 'staff'`; `display:none` + `pointer-events:none` otherwise; rAF loop and ResizeObserver start/stop correctly; no memory leaks on destroy. | manual + code |
| A-10-18 | PIXI staff wiring (`buildHarmonyStaffScene`, `updateHarmonyStaffDynamic`, `tickHarmonyStaff`, `onStaffPointerDown/Move/Up`) is removed from `App.svelte` and `harmony-staff-scene.ts` no longer used; `_staffContainer` sub-container in `stage.ts` removed or repurposed cleanly; no TypeScript errors. | automated (tsc) |
| A-10-19 | Register toggle (`#registerModeSeg` in `Header.svelte`) is removed; `setRegisterMode` call site removed; no schema/persistence/agent path references `registerMode` in a way that breaks after removal. | automated (grep + tsc) |
| A-10-20 | Staff geometry matches prototype: responsive `LS = max(24, min(88, H/6))` line spacing; center `cy = H/2 − LS×0.75`; 5 staff lines at steps −2..+2 in units of `LS`; clef glyph positioned at correct y; staff lines span from `SL−14` to canvas right edge. | manual |
| A-10-21 | Chord mode rendering matches prototype `pChord`: each voice rendered as attack→decay gradient sustain bar (`bx = x + (sh?22:6)`, `bw = w − (sh?26:10)`, height = `BH = 10`, corner radius = 2) plus gemstone onset circle (dark fill + colored stroke, radius `OR = 4.5`); accidental `♯` drawn when `sh = true`; ledger lines via `ldg`; active slot has pulsing onset glow (`shadowColor = col; shadowBlur = 7 + 5 × |sin(ts/700π)|`) and pulse scale `1 + 0.16 × sin(ts/700π)`. | manual |
| A-10-22 | Arp mode rendering: three staggered onset circles at per-cycle offsets (0, PX/3, 2·PX/3 within each cycle, repeated `ceil(bars)` times), connected by a diagonal connector line (`rgba(255,255,255,0.26)`, 1px); active-slot pulsing applied. Divergence from prototype `pArp` (per-slot spread) documented in handoff. | manual |
| A-10-23 | Rest slot rendering matches prototype `pRest`: rounded-rect bar (`rgba(140..160,145..165,162..182, 0.38/0.58)`, height `BH`, inset 5px each side), center tick (1.5px white `rgba(255,255,255,0.30)`, height 22px). | manual |
| A-10-24 | Tonal-function badges (`T`, `SD`, `D`) rendered below each chord slot in the correct voice color at reduced opacity (matching prototype: `font-weight:600; 8px IBM Plex Mono; opacity 0.42`); non-diatonic chords render with no badge. | manual |
| A-10-25 | Time grid: beat lines at 12px intervals (`rgba(255,255,255,0.028)`, 1px); bar lines at 48px intervals (`rgba(255,255,255,0.08)`/`0.22` for x=SL, 1/1.5px); bar numbers above the grid in IBM Plex Mono 500 8.5px; grid vertical span from `cy − LS×2.6` to `cy + LS×2.6`. | manual |
| A-10-26 | Playhead: glowing vertical line (`rgba(255,255,255,0.88)`, 1.5px, `shadowBlur=14`), arrowhead triangle at top; position driven by shared `getVisualPhaseAnchor()`; cyclic modulo wrap `((rawX % totalW) + totalW) % totalW` with `SL` offset; hidden when `nowPlaying.source === null`; stays in sync with ProgressionStrip cursor. | manual |
| A-10-27 | Active-slot spotlight: full-canvas linear-gradient fill in the slot's tonal-function color at 7–11% opacity, breathing at `sin(ts/820π)`; ambient background breathe gradient (`rgba(138,160,255, 0.018+0.008×sin(ts/3400π))`) on every frame. | manual |
| A-10-28 | Selection chrome: clicking a slot shows a `rgba(255,255,255,0.62)` 1.5px border rect, a `✕` circle button (`r=7.5`, white fill, dark `×` text), a resize grip (3px wide, `rgba(255,255,255,0.36)`), and a label (slot name + tonal function + cycle count) above the slot. Clicking outside deselects. | manual |
| A-10-29 | Move ghost: dragging a selected slot body (4px threshold) shows a dashed `rgba(138,160,255,0.52)` outline at drag position, and a glowing white insertion indicator line at the nearest slot boundary (via `nearestInsertionIndex`). | manual |
| A-10-30 | Hover state: hovering (without selection) shows a `rgba(255,255,255,0.020)` rect behind the slot and a chord label above it in the slot's tonal-function color. | manual |
| A-10-31 | Right-edge vignette: `linear-gradient(W−90→W, rgba(7,8,9,0)→rgba(7,8,9,0.52))`, 90px wide, drawn last on every frame. | manual |
| A-10-32 | All interactions (select, ✕ delete, right-edge resize, body-drag reorder) call the same store actions as the ProgressionStrip (`clearChordAt`, `setChordBars` with `clampBars`, `reorderSlot`); ProgressionStrip reflects all changes immediately; both playheads stay in sync. | manual |
| A-10-33 | `git diff main...HEAD -- src/core/codegen/strudel.ts` is empty (zero codegen changes across the entire redesign). | automated (git diff) |
| A-10-34 | All quality gates green: `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` ≥ 447 passed (no regressions; new test count if any), `pnpm build` exit 0. | automated |

---

## Step 10.9 — Inventory: open questions, source audit, baseline

**Purpose:** Resolve all eight open questions (OQ-R1–OQ-R8) so that no ambiguity remains
before any code lands. Produce a written inventory that Dev steps 10.11–10.15 will cite as
their primary reference.

**Prompt:** Read all required files:
- `CLAUDE.md`, `docs/orbifold-v1/decisions.md`
- This file (`phase-10-redesign.md`) and `docs/orbifold-v2/phases/phase-10.md`
- `docs/adr/0014-staff-editor.md`
- `docs/orbifold-v2/handoffs/phase-10-handoff.md` (all completed steps)
- `docs/orbifold-v2/reference/Pentagrama.dc.html` (full — this is the design spec)
- `src/render/harmony-staff-scene.ts` (full — to be retired)
- `src/render/stage.ts` (full — `_staffContainer`, `setHarmonySubview`)
- `src/app/App.svelte` (full — store subscription, canvas event routing, `#stage` markup)
- `src/ui/Header.svelte` (the register toggle section, ~lines 400–430)
- `src/ui/ProgressionStrip.svelte` (playhead/cursor rAF math)
- `src/state/phase-anchor.ts` (`getVisualPhaseAnchor`)
- `src/state/session.ts` (full — `clearChordAt`, `setChordBars`, `reorderSlot`, `clampBars`, `chordMode`, `HarmonyState`, `registerMode`)
- `src/core/harmony/staff-hit.ts` (the pure engine being reused)
- `src/core/theory/chords.ts` (`chordVoicing`, `Quality`)
- `src/core/theory/scales.ts` (`computeDiatonic`, `diatonicLookup`, `TonalFunctionInfo`)
- `src/core/harmony/staff-map.ts` (if it exists — check for note-name-to-MIDI helpers)
- `src/lib/persistence.ts` (`SavedHarmonySchema` — confirm `registerMode` absent)
- `src/agent/schema.ts` (confirm `registerMode` absent)

Produce `docs/orbifold-v2/inventories/phase-10-redesign-inventory.md` covering:

**(a) OQ-R1 — computeDiatonic API + tonal-function lookup.**
Show the exact TypeScript call chain. Confirm the field name for T/SD/D (`func.cls`). Show
that `diatonicLookup` is already exported and usable. Document what color to assign to
non-diatonic chords (neutral, no badge).

**(b) OQ-R2 — Note-name string → MIDI integer → staff position.**
Document whether `staff-map.ts` has a note-name→MIDI helper or whether the render layer
must inline it. Provide the exact function signature or inline formula. Confirm it handles
accidentals (e.g., `"C#4"`, `"Bb3"`). Map to prototype's `m2p(midi)` logic.

**(c) OQ-R3 — SL offset reconciliation.**
Document the signed offset convention and the `hitTestSlot(e.offsetX − SL, bounds)` call
pattern. Verify negative-px edge case (pointer in clef gutter → null from hitTest). Check
whether `computeSlotBounds` is called with `pxPerCycle = PX = 48` (same as
`PX_PER_CYCLE` from `time-map.ts`).

**(d) OQ-R4 — Header register toggle removal: schema/persistence/agent safety.**
Explicitly list every file that imports or references `registerMode`. Verdict: SAFE TO
REMOVE (all references are visual-only and ephemeral) or NOT SAFE (any reference to
flag).

**(e) OQ-R5 — `harmony-staff-scene.ts` retirement plan.**
List all files that import from `harmony-staff-scene.ts`. For each import, document what
happens when the file is deleted (TypeScript error). Produce a concrete retirement plan:
"delete file X at step 10.15, and remove these specific import lines from App.svelte."
List `_staffContainer` changes in `stage.ts`.

**(f) OQ-R6 — Canvas 2D z-order.**
List current DOM element z-levels inside `#stage`. Propose the CSS `z-index` for the new
`<canvas>`. Confirm `pointer-events:none` strategy.

**(g) OQ-R7 — pArp stagger divergence confirmation.**
Quote the relevant lines of `pArp` from the prototype. Confirm the corrected per-cycle
stagger formula and document it as the implementation target (with prototype citation and
note of the intentional divergence).

**(h) OQ-R8 — Test baseline.**
Report: `pnpm exec vitest run` → N passed; `pnpm exec tsc --noEmit` → 0 errors;
`pnpm lint` → 0 errors. This is the baseline for the redesign steps.

**Implementation requirements:**
- Read every file listed before writing the inventory.
- Do NOT write any source code.
- Do NOT resolve questions by assumption — read the actual source.

**Validation:**
- `docs/orbifold-v2/inventories/phase-10-redesign-inventory.md` exists and is non-empty.
- No source files modified.
- Quality gates unchanged from baseline (verified as part of OQ-R8).

**Expected result:** Inventory document with eight sections; all eight open questions
answered with source citations; test baseline confirmed.

CHECKPOINT → Pilot Checkpoint #1 (review of inventory before any code lands):
`docs(orbifold-v2): Phase 10 step 10.9 — redesign inventory`

---

## Step 10.10 — ADR 0015 (Canvas 2D Pentagrama layer)

**Purpose:** Formally record the Pilot-approved architectural decisions D-A and D-B, and
any additional decisions surfaced by the step 10.9 inventory. This ADR is the governance
document that all subsequent code steps cite.

**Prompt:** Read `docs/orbifold-v2/inventories/phase-10-redesign-inventory.md`, this
phase file, `docs/adr/0014-staff-editor.md`, `docs/adr/0011-harmony-view-architecture.md`,
`docs/orbifold-v1/decisions.md`.

Write `docs/adr/0015-canvas2d-pentagrama-layer.md`. The ADR must record:

**(D1) Technology decision: Canvas 2D dedicated layer.**
Restate D-A from the Pilot decisions. Record: which files are affected (new `<canvas>`
element, `App.svelte` wiring, `stage.ts` change, `harmony-staff-scene.ts` retirement).
Amendment reference: ADR 0011 D4 (staff is a central full-canvas view) is amended to
specify Canvas 2D as the rendering technology for the Pentagrama sub-view. Tonnetz and
Rhythm remain PIXI.

**(D2) Drop register modes (visual cleanup).**
Restate D-B. Record the removal scope: `Header.svelte` toggle, `setRegisterMode` call
site. Confirm that `HarmonyState.registerMode` field may be left in the store type
(inert, not wired to any visual output) or removed — whichever the inventory found
cleaner. Record that `voice-tracks.ts` is left inert (its output is not consumed by the
Canvas 2D layer). Record that `SavedHarmonySchema` and `agent/schema.ts` are unaffected
(registerMode was already ephemeral and absent from both).

**(D3) Responsive staff geometry.**
Record the prototype's geometry as the binding spec:
- `LS = max(24, min(88, H/6))` — responsive line spacing.
- `cy = H/2 − LS×0.75` — staff center, shifted upward.
- Staff lines at `cy − n×LS` for n = −2..+2 (E4, G4, B4, D5, F5).
- Clef gutter: `SL = 76px` (staff content starts here).
- `PX = 48` (pixel per cycle, equals `PX_PER_CYCLE` from `time-map.ts` — same canonical constant).

**(D4) Note-name → staff position mapping.**
Record the chosen conversion path from inventory OQ-R2. Binding contract: `chordVoicing`
string → MIDI → `{ pos, sh }` via the prototype's `m2p` logic (or named helper). This is
the **only** permitted path in the Canvas 2D layer — no `voice-tracks.ts`, no
`computeStaffLayout`.

**(D5) Arp stagger: per-cycle, not per-slot.**
Record the corrected behavior (overrides prototype `pArp`): voice offsets 0, PX/3, 2·PX/3
within each cycle; pattern repeats `ceil(bars)` times across the slot. Document as an
intentional divergence from the prototype, justified by audio accuracy (Strudel's
`note("A B C")` assigns A/B/C to beats 1/2/3 within each cycle of the slot).

**(D6) Interaction wiring: DOM pointer events on the Canvas 2D element.**
Record that the Canvas 2D `<canvas>` registers its own `pointerdown`, `pointermove`,
`pointerup` listeners directly (not routed through `App.svelte`'s PIXI canvas listeners).
Gate on `subview === 'staff'` at event time (belt-and-suspenders; `pointer-events:none`
already prevents events when hidden). Hit-test via `staff-hit.ts` with `SL` offset.

**(D7) Lifecycle: rAF loop owned by the Canvas 2D module.**
The `<canvas>` element is managed by a Svelte component or a module singleton in
`src/render/pentagrama-scene.ts` (name TBD by Dev). rAF loop starts when mounted,
stops on destroy. ResizeObserver on the stage container re-calls `setup(w, h)` on every
size change. No PIXI Application involvement.

**ADR file:** `docs/adr/0015-canvas2d-pentagrama-layer.md`. New file.

**Validation:**
- `docs/adr/0015-canvas2d-pentagrama-layer.md` exists and is non-empty.
- No source files modified.

CHECKPOINT → Pilot Checkpoint #2 (ADR review):
`docs(adr): Phase 10 step 10.10 — ADR 0015 Canvas 2D Pentagrama layer`

---

## Step 10.11 — Canvas 2D layer skeleton: mount, lifecycle, DPR, show/hide, retire PIXI wiring

**Purpose:** Introduce the `<canvas>` element and its lifecycle without any drawing yet
(clears to transparent on every frame). Simultaneously remove the PIXI staff scene wiring
from `App.svelte` and `stage.ts` and remove the register toggle from `Header.svelte`.
After this step the Pentagrama sub-view shows a blank canvas; the Tonnetz sub-view is
unaffected.

**Prompt:** Read `docs/adr/0015-canvas2d-pentagrama-layer.md`,
`docs/orbifold-v2/inventories/phase-10-redesign-inventory.md`, `docs/orbifold-v1/decisions.md`,
`src/app/App.svelte` (full), `src/render/stage.ts` (full),
`src/render/harmony-staff-scene.ts`, `src/ui/Header.svelte`.

**Changes:**

**(a) New render module `src/render/pentagrama-scene.ts`.**
Module-level singleton. Exports:
- `initPentagrama(stageEl: HTMLDivElement): void` — creates the `<canvas>` element,
  appends it to `stageEl` with `position:absolute; top:0; left:0; display:none;
  pointer-events:none`, starts the ResizeObserver and first-rAF.
- `destroyPentagrama(): void` — cancels rAF, disconnects ResizeObserver, removes canvas
  from DOM.
- `setPentagramaVisible(v: boolean): void` — sets `display:block/pointer-events:auto`
  or `display:none/pointer-events:none`.

The rAF loop calls an internal `paint(ts: DOMHighResTimeStamp)` that, for now, only does
`ctx.clearRect(0, 0, W, H)`. DPR scaling in `setup(w, h)` per ADR 0015 D7.

AGPL-3.0 header. No DOM-less imports required in this module (it is render-layer code).
TypeScript strict.

**(b) `App.svelte` wiring.**
- Remove the import of `buildHarmonyStaffScene`, `updateHarmonyStaffDynamic`,
  `tickHarmonyStaff`, `onStaffPointerDown`, `onStaffPointerMove`, `onStaffPointerUp`
  from `harmony-staff-scene.js`.
- Remove call sites: wherever these six functions are called in `onMount`, in the store
  subscription rebuild block, in the rAF/tick callback, and in the canvas pointer
  event listeners (cite inventory OQ-R5 for exact line numbers).
- Add import of `initPentagrama`, `destroyPentagrama`, `setPentagramaVisible` from
  `./render/pentagrama-scene.js`.
- Call `initPentagrama(stageEl)` in `onMount` after `initStage`.
- Call `destroyPentagrama()` in `onDestroy`.
- In the store subscription reactive block, call `setPentagramaVisible(state.harmony.view
  === 'staff' && state.view === 'harmony')` (exact condition per inventory OQ-R6).
- Remove any canvas pointer event routing that previously called `onStaffPointerDown/Move/Up`.

**(c) `stage.ts` changes.**
Per inventory OQ-R5, remove `_staffContainer` from `initStage` (it is no longer needed —
the Canvas 2D element is not a PIXI child). Update `setHarmonySubview` if it toggled
`_staffContainer.visible` — that logic is now handled by `setPentagramaVisible`. If
`_staffContainer` had other uses, document them (expected: none after this removal).

**(d) `harmony-staff-scene.ts` retirement.**
Either delete the file (if no other file imports it) or export a stub comment block with
`// RETIRED: replaced by src/render/pentagrama-scene.ts in Phase 10 step 10.11`. The
inventory OQ-R5 verdict determines which. If deleted, update any import in `stage.ts` if
needed. Do not leave orphan imports.

**(e) `Header.svelte` register toggle removal.**
Remove the `#registerModeSeg` `<div>` and its two `suavizado`/`estricto` buttons
(approximately lines 407–420). Remove any `setRegisterMode` import from `session.ts` if
`Header.svelte` is the only call site. Do not change any other Header behavior.

**Prototype parity note:** No prototype rendering in this step — the canvas is blank. The
parity source for all subsequent steps is `Pentagrama.dc.html`. Confirm audio
byte-identity: `git diff --name-only` must not include `src/core/codegen/strudel.ts`.

**Validation:**
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run` → same count as OQ-R8 baseline (no regressions; no new tests
  expected; the canvas module is not unit-tested directly).
- `pnpm build` → exit 0.
- Manual smoke: Armonía → Pentagrama sub-toggle → blank dark canvas visible. Tonnetz
  sub-view unchanged. Register toggle absent from Header.
- Static check: `grep -rn "harmony-staff-scene" src/` → 0 matches (or only the retired
  stub file itself).

CHECKPOINT:
`feat(harmony): Phase 10 step 10.11 — Canvas 2D skeleton, retire PIXI staff wiring, remove register toggle`

---

## Step 10.12 — Static rendering: staff, grid, chord/arp/rest slots

**Purpose:** Implement the full `paint(ts)` static layer matching the prototype's visual
fidelity — staff lines, clef glyph, time grid + bar numbers, chord-mode sustain bars with
gemstone onsets, arp-mode staggered circles with connector, rest bars, ledger lines,
accidentals, tonal-function badges, and right vignette. No interaction or dynamic
animation in this step (active-slot spotlight and playhead are step 10.13; pointer
affordances are step 10.14).

**Prompt:** Read `docs/adr/0015-canvas2d-pentagrama-layer.md`,
`docs/orbifold-v2/inventories/phase-10-redesign-inventory.md`,
`docs/orbifold-v2/reference/Pentagrama.dc.html` (full — primary parity source),
`docs/orbifold-v1/decisions.md`,
`src/render/pentagrama-scene.ts` (post-step-10.11),
`src/state/session.ts` (`chordMode`, `HarmonyState.progression`, `bpm`, `harmony.root`,
`harmony.mode`),
`src/core/theory/scales.ts` (`diatonicLookup`),
`src/core/theory/chords.ts` (`chordVoicing`).

**Changes in `src/render/pentagrama-scene.ts`:**

**(a) State read pattern.**
`paint(ts)` reads the current `SessionState` from `sessionStore` (via Svelte `get()`).
Extract: `progression`, `chordMode`, `harmony.root`, `harmony.mode`, `bpm`. Compute:
`diatonicLookup(root, mode)` once per frame for badge colors.

**(b) Helper functions** (module-private, not exported):
- `m2p(midi: number): { pos: number; sh: boolean }` — port of prototype `m2p`.
- `ny(pos: number, cy: number, ls: number): number` — port of prototype `ny`.
- `slotX(i: number, progression: ProgressionSlot[], PX: number, SL: number): number`
- `slotW(slot: ProgressionSlot, PX: number): number`
- `totalW(progression: ProgressionSlot[], PX: number): number`
- `rr(ctx, x, y, w, h, r)` — rounded-rect helper, port of prototype `rr`.
- `ha(v: number): string` — float → 2-char hex alpha, port of prototype `ha`.
- `ldg(ctx, pos, nx, cy, ls)` — ledger lines, port of prototype `ldg`.
- Note-name → MIDI: use the conversion path resolved in inventory OQ-R2.

**(c) `drawGrid(ctx, W, cy, ls, SL, PX, slots)` helper.**
Port of prototype time-grid section in `paint`. Beat lines at 12px intervals (opacity
0.028), bar lines at 48px (opacity 0.08 / 0.22 for x=SL), bar numbers in IBM Plex Mono
500 8.5px (opacity 0.15). Vertical span `cy − ls×2.6` to `cy + ls×2.6`.

**(d) `drawStaffLines(ctx, cy, ls, SL, W)` helper.**
Five lines at `cy − n×ls` for n = −2..+2. Left edge at `SL − 14`; right edge at `W − 20`.
Opacity: center line (n=0) 0.32, others 0.18. Width 1px.

**(e) `pChord(ctx, slot, x, w, cy, ls, dmap)` helper.**
Port of prototype `pChord`. Use `chordVoicing(slot.chord.rootPc, slot.chord.qual,
slot.chord.octave ?? 4)` to get note strings; convert each to MIDI via inventory OQ-R2
path; call `m2p(midi)`. For each voice:
- `bx = x + SL + (sh ? 22 : 6)`, `bw = max(4, slotW − (sh?26:10))`.
- Sustain bar: `createLinearGradient(bx, 0, bx+bw, 0)` with stops `[col+ha(0.72), col+ha(0.45), col+ha(0.14)]` (active: 0.88/0.55/0.18). `rr(ctx, bx, yn−BH/2, bw, BH, 2); ctx.fill()`.
- Gemstone onset: dark fill `rgba(8,10,16,0.95)` + colored stroke `col`, `lineWidth=1.7`,
  `arc(bx+OR, yn, OR, 0, 2π)`. No active pulse in this step (step 10.13).
- Sharp accidental: `♯` at `(x+SL+11, yn)` in voice color, 82% opacity.
- Ledger lines: `ldg(ctx, pos, bx+OR, cy, ls)`.

**(f) `pArp(ctx, slot, x, w, cy, ls, dmap)` helper.**
Corrected per-cycle stagger (ADR 0015 D5, diverging from prototype `pArp`). For each
cycle repetition (0..ceil(bars)−1), voice 0 at `x+SL + cycle×PX`, voice 1 at
`x+SL + cycle×PX + PX/3`, voice 2 at `x+SL + cycle×PX + 2×PX/3`. Connector line
between the three within each cycle. Cite prototype `pArp` and document divergence.

**(g) `pRest(ctx, x, w, cy, ls)` helper.**
Port of prototype `pRest`. Rounded-rect (`rgba(140,145,162,0.38)`, height BH, inset 5px
each side) + center tick (`rgba(255,255,255,0.30)`, 1.5px, height 22px at `cy`).

**(h) Tonal-function badges.**
For each chord slot: look up `dmap["rootPc:qual"]`; if found and `func.cls !== 'accent'
&& func.cls`, draw `{tonic:'T',subdom:'SD',dom:'D'}[func.cls]` at `x + SL + 5, cy +
ls×2 + 5` in the slot's function color, 42% opacity.

**(i) Hover label (static, no hover state yet).**
Defer to step 10.14 (hover requires pointer tracking). Comment placeholder.

**(j) Right vignette.**
`createLinearGradient(W−90, 0, W, 0)` → transparent to `rgba(7,8,9,0.52)`, 90px, full
height. Drawn last.

**Prototype parity note:** Cite `pChord`, `pArp`, `pRest`, `ldg`, `rr`, `ha`, `drawGrid`
(time-grid section), `drawStaffLines` (5-line section) from `Pentagrama.dc.html`. Confirm
audio byte-identity: `git diff --name-only` must not include `src/core/codegen/strudel.ts`.

**Validation:**
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run` → baseline count (no regressions; canvas rendering not
  unit-tested).
- `pnpm build` → exit 0.
- Manual: Pentagrama sub-view shows staff lines, clef, grid, chord bars per voice
  (colored), rest bars (grey), arp stagger (3 circles per cycle). Visual matches
  prototype's non-interactive static appearance.

CHECKPOINT:
`feat(harmony): Phase 10 step 10.12 — static rendering: staff, grid, chord/arp/rest`

---

## Step 10.13 — Dynamic: playhead, active-slot spotlight, ambient breathe

**Purpose:** Add all time-driven animation: the cycling playhead (shared anchor), active-
slot spotlight (tonal-function color gradient, breathing), gemstone onset glow/pulse on
active voices, and ambient background breathe. After this step the view is visually
complete except for interaction chrome.

**Prompt:** Read `docs/adr/0015-canvas2d-pentagrama-layer.md`, `docs/orbifold-v1/decisions.md`,
`src/render/pentagrama-scene.ts` (post-step-10.12),
`src/state/phase-anchor.ts` (`getVisualPhaseAnchor`),
`src/state/session.ts` (`bpm`, `nowPlaying`),
`src/ui/ProgressionStrip.svelte` (cursor rAF math — mirror exactly).

**Changes in `src/render/pentagrama-scene.ts`:**

**(a) Ambient background breathe.**
Port of prototype `paint` breathe section:
`b = 0.5 + 0.5 × sin(ts/3400 × 2π)`. Radial gradient at `(W×0.6, H×0.4)`, radius
`W×0.7`, stop 0 `rgba(138,160,255, 0.018+0.008×b)`, stop 1 transparent. Drawn first,
after `clearRect`.

**(b) `actIdx(ts)` helper.**
Compute the currently playing slot index from the shared anchor:
`barMs = (60000/bpm)×4`; `totalCycles = slots.reduce(bars, 0)`;
`elapsedMs = performance.now() − getVisualPhaseAnchor()`;
`phase = (elapsedMs % (totalCycles × barMs)) / barMs` (cycle position, fractional);
iterate slots accumulating bars → return index of the slot containing `phase`.
Return −1 when `nowPlaying.source === null` or `totalCycles === 0`.

**(c) Active-slot spotlight.**
Port of prototype `paint` spotlight section. When `ai >= 0`:
`col = FC[slot.func] || '#8aa0ff'`;
`p = 0.5 + 0.5×sin(ts/820×2π)`;
`a = ha(0.07 + 0.04×p)`;
Linear gradient `x−w×0.4 → x+w×1.4` with stops transparent / `col+a` / `col+a` /
transparent. Full-canvas `fillRect`. Draw after breathe, before grid and staff.

**(d) `pChord` pulse (active slot only).**
When `isAct === true`, apply pulse to onset circle radius: `OR × (1 + 0.16×sin(ts/700×2π))`.
Apply `shadowColor = col; shadowBlur = 7 + 5×|sin(ts/700×2π)|` to onset circle.
Apply `globalAlpha` scale `a = isAct ? 0.88 : 0.72` to the sustain bar gradient stops
(already parameterized in step 10.12, but the `isAct` branch values were deferred here).

**(e) `pArp` pulse (active slot only).**
Same pulse radius and glow on arp onset circles when `isAct`.

**(f) Playhead.**
Port of prototype `phX(ts)` — but using the shared anchor instead of `this.ps`:
`rawX = (performance.now() − getVisualPhaseAnchor()) / barMs × PX`;
`tw = totalW(progression, PX)`;
If `tw <= 0` or `nowPlaying.source === null`: do not draw.
`playheadX = SL + ((rawX % tw) + tw) % tw`.
Draw: `shadowColor = rgba(255,255,255,0.9)`, `shadowBlur = 14`,
`strokeStyle = rgba(255,255,255,0.88)`, `lineWidth = 1.5`, vertical line from
`cy − ls×2 − 16` to `cy + ls×2 + 16`. Arrowhead triangle at `cy − ls×2 − 18`:
`moveTo(phx−5, top); lineTo(phx+5, top); lineTo(phx, top+6); closePath(); fill()`.

**Prototype parity note:** Cite `phX`, `actIdx`, breathe section, spotlight section, and
pulse-in-`pChord`/`pArp` from `Pentagrama.dc.html`. The playhead anchor is the **shared**
`getVisualPhaseAnchor()` (not the prototype's local `this.ps`) — document this as an
intentional divergence that ensures sync with ProgressionStrip.

**Validation:**
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run` → baseline count (no regressions).
- `pnpm build` → exit 0.
- Manual: playing a progression shows the cycling playhead; active slot has spotlight
  glow and onset circles pulse; ambient breathe visible. Playhead stays in sync with
  ProgressionStrip cursor. Playhead hidden when not playing.

CHECKPOINT:
`feat(harmony): Phase 10 step 10.13 — dynamic: playhead, spotlight, ambient breathe`

---

## Step 10.14 — Interactions: select, delete, resize, move-reorder, hover label

**Purpose:** Implement the full slot interaction model on the Canvas 2D layer using
`staff-hit.ts` and the existing store actions. After this step the Pentagrama is a fully
functional slot editor matching the prototype's interaction model.

**Prompt:** Read `docs/adr/0015-canvas2d-pentagrama-layer.md`, `docs/adr/0014-staff-editor.md`,
`docs/orbifold-v1/decisions.md`,
`src/render/pentagrama-scene.ts` (post-step-10.13),
`src/core/harmony/staff-hit.ts`,
`src/state/session.ts` (`clearChordAt`, `setChordBars`, `clampBars`, `reorderSlot`).

**Changes in `src/render/pentagrama-scene.ts`:**

**(a) Module-level interaction state** (mirrors ADR 0014 D3/D4 semantics, now in Canvas 2D):
- `_selectedSlotIdx: number | null = null`
- `_hoverSlotIdx: number | null = null`
- `_resizeActive: boolean = false`
- `_resizeStartPx: number = 0`
- `_resizeStartBars: number = 1`
- `_resizePreviewBars: number = 1`
- `_moveActive: boolean = false`
- `_moveFromIdx: number = -1`
- `_moveDragPx: number = 0`
- `_moveInsertIdx: number = -1`
- `_pointerDownPx: number = 0`
- `_pointerDownOnSelected: boolean = false`
- `_slotBounds: SlotBounds[] = []` — recomputed at start of each `paint(ts)` call using
  `computeSlotBounds(progression, PX)`.

Selection guard (ADR 0014 Consequence 3): at start of each `paint`, if
`_selectedSlotIdx !== null && _selectedSlotIdx >= progression.length`, reset to `null`.

**(b) Interaction rendering in `paint(ts)`.**

Hover: when `_hoverSlotIdx !== null && _hoverSlotIdx !== _selectedSlotIdx`, draw a
`rgba(255,255,255,0.020)` full-height rect over the slot (`cy − ls×2.5` to `cy + ls×2.5`)
and a chord label above in the slot's tonal-function color (opacity 0.65). Port of
prototype hover section in `paint`.

Selection chrome (port of prototype `isSel` block):
- White 1.5px border rect around slot (`x+SL+0.75, cy−ls×2+0.75, w−1.5, ls×4−1.5`).
- ✕ circle: `arc(bx, by, 7.5)` filled white, `fillText('×', bx, by+0.5)` dark. Position
  `bx = x+SL+w−10, by = cy−ls×2−11`.
- Resize grip: 3px white-ish rect at `x+SL+w−4`.
- Label: `slot.label + ' · ' + fnLabel + ' · N ciclo(s)'` at `x+SL+4, cy−ls×2−3`.

Move ghost (port of prototype `drag.mode === 'moving'` block):
- Dashed `rgba(138,160,255,0.52)` 1.5px outline at `gx = _moveDragPx − w/2`.
- Glowing white insertion indicator at boundary computed by `nearestInsertionIndex`.

Resize preview: when `_resizeActive`, draw the sustain bars with `_resizePreviewBars`
width instead of `slot.bars` (local preview; no store write).

**(c) Pointer event listeners.**
In `initPentagrama`, add listeners to the canvas element:
`canvas.addEventListener('pointerdown', onDn)`;
`canvas.addEventListener('pointermove', onMv)`;
`canvas.addEventListener('pointerup', onUp)`.
Use `canvas.setPointerCapture(e.pointerId)` in `onDn` when starting resize or move.

`onDn(e: PointerEvent)`:
1. `px = e.offsetX`. Check ✕ hit (if `_selectedSlotIdx !== null` and `hypot(px − bx, py − by) < 13`) → `clearChordAt`, reset selection.
2. Check resize handle (`hitTestResizeHandle(px − SL, _slotBounds, 14)` and `=== _selectedSlotIdx`) → start resize.
3. `hitTestSlot(px − SL, _slotBounds)` → if already selected (same index), arm for move; else select.
4. Outside all slots → deselect.

`onMv(e: PointerEvent)`:
- `px = e.offsetX`.
- Resize active: `_resizePreviewBars = clampBars(_resizeStartBars + (px − _resizeStartPx) / PX)`.
- Move arm: if `|px − _pointerDownPx| > 4` → `_moveActive = true`.
- Move active: `_moveDragPx = px`, `_moveInsertIdx = nearestInsertionIndex(px − SL, _slotBounds)`.
- Hover: `_hoverSlotIdx = hitTestSlot(px − SL, _slotBounds)`.

`onUp(e: PointerEvent)`:
- Resize active → `setChordBars(_selectedSlotIdx!, _resizePreviewBars)`, reset.
- Move active and `_moveInsertIdx !== _moveFromIdx` → `reorderSlot(_moveFromIdx, _moveInsertIdx)`, reset.
- Reset all drag state. `canvas.releasePointerCapture(e.pointerId)`.

**Prototype parity note:** Cite `onDn`, `onMv`, `onUp`, `hitSlot`, `insertPos` from
`Pentagrama.dc.html`. Document that `hitSlot`/`insertPos` are replaced by
`staff-hit.ts`'s `hitTestSlot`/`nearestInsertionIndex` with the `SL` offset. Confirm
audio byte-identity: store actions `clearChordAt`, `setChordBars`, `reorderSlot` are the
same as those called by ProgressionStrip — no codegen changes.

**Validation:**
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run` → baseline count (no regressions).
- `pnpm build` → exit 0.
- Manual: clicking a slot shows selection chrome; ✕ deletes it; resize handle works;
  body drag reorders with ghost + insertion indicator; hover shows label; ProgressionStrip
  reflects all changes immediately.

CHECKPOINT:
`feat(harmony): Phase 10 step 10.14 — interactions: select, delete, resize, reorder, hover`

---

## Step 10.15 — Cleanup: remove dead PIXI staff code, confirm `harmony-staff-scene.ts` retired

**Purpose:** Final cleanup pass — ensure no orphan imports, no dead exports, no
references to the retired PIXI staff scene. Confirm `voice-tracks.ts` is not imported by
the Canvas 2D layer. Run static-analysis checks.

**Prompt:** Read `docs/orbifold-v1/decisions.md`,
`src/render/pentagrama-scene.ts` (post-step-10.14),
`src/render/harmony-staff-scene.ts` (to verify retired or deleted),
`src/render/stage.ts` (verify `_staffContainer` removed),
`src/app/App.svelte` (verify no orphan harmony-staff imports),
`src/ui/Header.svelte` (verify register toggle absent).

**Changes:**

**(a) Confirm or finalize `harmony-staff-scene.ts` retirement.**
If the file was only stubbed in step 10.11 (not deleted), delete it now. Run
`grep -rn "harmony-staff-scene" src/` → 0 matches expected.

**(b) Confirm `stage.ts` `_staffContainer` removed.**
Run `grep -n "_staffContainer" src/render/stage.ts` → 0 matches expected.

**(c) Confirm `voice-tracks.ts` not imported by Canvas 2D layer.**
`grep -n "voice-tracks" src/render/pentagrama-scene.ts` → 0 matches.
`grep -n "computeVoiceTracks" src/render/pentagrama-scene.ts` → 0 matches.
`voice-tracks.ts` may remain in `src/core/harmony/` (its tests are kept per D-A).

**(d) Confirm `staff-layout.ts` not imported by Canvas 2D layer.**
`grep -n "staff-layout" src/render/pentagrama-scene.ts` → 0 matches.
`computeStaffLayout` is not called by the Canvas 2D renderer (it uses `chordVoicing` +
`m2p` directly, per ADR 0015 D4).

**(e) Register toggle audit.**
`grep -n "registerMode" src/ui/Header.svelte` → 0 matches.
`grep -n "setRegisterMode" src/app/App.svelte` → 0 matches.
`grep -rn "registerMode" src/core/ src/audio/` → 0 matches expected in codegen/audio.

**(f) `core/**` purity check.**
`grep -rn "from 'pixi\|from 'svelte\|from '@pixi\|import.*canvas" src/core/` → 0 matches.
`pentagrama-scene.ts` is in `src/render/`, not `src/core/` — verify.

**(g) AGPL-3.0 header check.**
`head -2 src/render/pentagrama-scene.ts` → `// SPDX-License-Identifier: AGPL-3.0-only`.
Check all files modified in steps 10.11–10.14.

**(h) Codegen immutability check.**
`git diff main...HEAD -- src/core/codegen/strudel.ts` → empty (0 diff lines).

No new source files created in this step. Only deletions and confirmations.

**Prototype parity note:** N/A — cleanup step.

**Validation:**
- All static-analysis checks (a–h) pass (0 matches for each).
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run` → baseline count (no regressions; no files deleted affect tests).
- `pnpm build` → exit 0.

CHECKPOINT:
`chore(harmony): Phase 10 step 10.15 — remove dead PIXI staff code, confirm cleanup`

---

## Step 10.16 — Quality gates + Acceptance Coverage Table + manual Checkpoint #5

**Purpose:** Run the full quality gate suite, assemble the complete phase-level Acceptance
Coverage Table (all A-10-01..A-10-34 IDs), and produce the manual acceptance checklist
for Pilot Checkpoint #5.

**Prompt:** Read this phase file's Acceptance Criteria (both original A-10-01..16 and
redesign A-10-17..34), `docs/orbifold-v1/decisions.md`, and the Phase 10 / Phase 10
Redesign handoff (all steps).

**Static analysis checks (mandatory, report each as pass/fail with command + output):**

| Check | Command | Expected |
|---|---|---|
| No PIXI/Svelte imports in Canvas 2D renderer | `grep -n "from 'pixi\|from 'svelte\|from '@pixi" src/render/pentagrama-scene.ts` | 0 matches |
| `core/**` purity | `grep -rn "from 'pixi\|from 'svelte\|from '@pixi\|canvas" src/core/` | 0 matches |
| `harmony-staff-scene.ts` retired | `grep -rn "harmony-staff-scene" src/` | 0 matches (or only the retired stub) |
| `_staffContainer` removed from stage | `grep -n "_staffContainer" src/render/stage.ts` | 0 matches |
| Register toggle removed | `grep -n "registerModeSeg\|setRegisterMode" src/ui/Header.svelte` | 0 matches |
| `registerMode` not in Zod schema | `grep -n "registerMode" src/lib/persistence.ts` | 0 matches in `SavedHarmonySchema` |
| `registerMode` not in agent schema | `grep -n "registerMode" src/agent/schema.ts` | 0 matches |
| `voice-tracks` not in pentagrama-scene | `grep -n "voice-tracks\|computeVoiceTracks" src/render/pentagrama-scene.ts` | 0 matches |
| Zero codegen changes | `git diff main...HEAD -- src/core/codegen/strudel.ts` | empty |
| AGPL-3.0 headers | `head -2 src/render/pentagrama-scene.ts` and all modified files | All have `SPDX-License-Identifier: AGPL-3.0-only` |
| `PX` = 48 not redeclared locally | `grep -n "const PX " src/render/pentagrama-scene.ts` | 0 matches or imports from `time-map.ts` |
| `staff-hit.ts` pure engine unchanged | `grep -n "from 'pixi\|from 'svelte" src/core/harmony/staff-hit.ts` | 0 matches |

**Automated gate commands:**
```
pnpm exec tsc --noEmit
pnpm lint
pnpm exec vitest run
pnpm build
```

**Manual acceptance checklist for Pilot Checkpoint #5** (the Pilot verifies each item):

1. Staff lines (5), clef glyph, and grid visible in Pentagrama sub-view. Tonnetz sub-view
   unchanged.
2. Chord mode: each chord slot shows three colored sustain bars (attack→decay gradient)
   with gemstone onset circles at left edge. Voice colors correct (tonic/subdom/dom).
3. Rest slots: grey rounded-rect bars at staff center.
4. Arp mode: three staggered onset circles per cycle with diagonal connector line.
5. Tonal-function badges (T / SD / D) at bottom of each slot in voice color.
6. Bar numbers above the grid; beat/bar grid lines at correct intervals.
7. Ambient breathe visible on canvas background.
8. Playing a progression: active-slot spotlight pulses; gemstone onsets glow; playhead
   advances cyclically; stays in sync with ProgressionStrip cursor.
9. Playhead hidden when not playing.
10. Hover: chord label appears above slot on hover.
11. Click to select: white border, ✕ circle button, resize grip appear.
12. ✕ deletes the slot; ProgressionStrip reflects immediately.
13. Resize grip: drag changes slot width; ProgressionStrip segment width matches.
14. Body drag (4px threshold): ghost bar and insertion indicator appear; drop reorders;
    ProgressionStrip reflects new order.
15. Register toggle absent from Header.
16. No JavaScript errors in console.

**Validation:**
- All static-analysis checks pass.
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors (ESLint + Prettier).
- `pnpm exec vitest run` → ≥ 447 passed (all prior tests; no regressions; new count if
  any Canvas 2D unit tests added).
- `pnpm build` → exit 0.
- No source files modified in this step (report-only).

CHECKPOINT → Pilot Checkpoint #5 (phase acceptance):
`feat(harmony): Phase 10 step 10.16 — quality gates and manual acceptance (Canvas 2D Pentagrama)`

---

## Acceptance Criteria — Redesign (all A-10 IDs)

**Note on prior IDs A-10-01..A-10-10:** The visual behaviors specified there (PIXI-based
duration bars, bar grid, arp stagger, select/delete/resize/reorder) are superseded by
the Canvas 2D redesign's equivalent behaviors (A-10-20..A-10-32). The automated IDs
A-10-11..A-10-16 remain in force and are re-verified at step 10.16.

### Retained automated (A-10-11..A-10-16, re-verified)

| ID | Description | Type |
|---|---|---|
| A-10-11 | `staff-hit.ts` pure engine (no DOM/PIXI/Svelte); all 4 exports unit-tested (42 tests); no regressions. | automated |
| A-10-12 | `reorderSlot` store action unit-tested; correct semantics; `requeueLive()`; no-op when equal. | automated |
| A-10-13 | `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` ≥ 447 passed, `pnpm build` exit 0. | automated |
| A-10-14 | `registerMode` and `subview` absent from `SavedHarmonySchema` and `agent/schema.ts`. | automated (grep) |
| A-10-15 | `git diff main...HEAD -- src/core/codegen/strudel.ts` empty (zero codegen changes). | automated (git diff) |
| A-10-16 | AGPL-3.0 header in all new and modified source files. | automated (head -2) |

### New — Canvas 2D redesign (A-10-17..A-10-34)

| ID | Description | Type |
|---|---|---|
| A-10-17 | Canvas 2D `<canvas>` mounts in `#stage`; DPR scaling correct; show/hide gated on `view==='harmony' && subview==='staff'`; lifecycle clean. | manual + tsc |
| A-10-18 | PIXI staff wiring removed from `App.svelte`; `harmony-staff-scene.ts` retired/deleted; `_staffContainer` removed from `stage.ts`; 0 tsc errors. | automated |
| A-10-19 | Register toggle removed from `Header.svelte`; 0 references to `setRegisterMode`/`registerModeSeg` in HTML; no schema/agent breakage. | automated (grep) |
| A-10-20 | Staff geometry: responsive LS; 5 lines; clef gutter SL=76; staff content matches prototype layout. | manual |
| A-10-21 | Chord mode rendering matches prototype `pChord`: gradient sustain bars + gemstone onsets + accidentals + ledger lines; active-slot pulse and glow. | manual |
| A-10-22 | Arp mode: per-cycle stagger (corrected, not prototype `pArp` spread); connector line; active pulse. | manual |
| A-10-23 | Rest rendering matches prototype `pRest`. | manual |
| A-10-24 | Tonal-function badges (T/SD/D) correct color/opacity; non-diatonic chords have no badge. | manual |
| A-10-25 | Time grid and bar numbers match prototype spec (opacities, spans). | manual |
| A-10-26 | Playhead driven by shared `getVisualPhaseAnchor()`; cyclic; matches ProgressionStrip cursor; hidden when not playing. | manual |
| A-10-27 | Spotlight + ambient breathe: correct colors, timing constants, gradient shapes. | manual |
| A-10-28 | Selection chrome (border, ✕ circle, resize grip, label) matches prototype `isSel` block. | manual |
| A-10-29 | Move ghost (dashed outline + glowing insertion indicator) matches prototype `drag.mode === 'moving'` block. | manual |
| A-10-30 | Hover state (rect + chord label) matches prototype hover block. | manual |
| A-10-31 | Right vignette rendered last, correct gradient. | manual |
| A-10-32 | All interactions call correct store actions; ProgressionStrip and both playheads stay in sync. | manual |
| A-10-33 | `git diff main...HEAD -- src/core/codegen/strudel.ts` empty. | automated |
| A-10-34 | All quality gates green: tsc 0 errors, lint 0 errors, test ≥ 447, build exit 0. | automated |

---

## Deferred items (unchanged from Phase 10 original)

1. **Click-on-staff-line to place a new note** — Phase 11.
2. **Pitch editing (drag up/down)** — Phase 11.
3. **Tonnetz vertex → single note insertion** — Phase 11.
4. **Gain editing on the staff** — requires new ADR amendment (not this phase).
5. **Orbital harmony view** — deprioritized by Pilot 2026-06-12; deferred to a later phase.
