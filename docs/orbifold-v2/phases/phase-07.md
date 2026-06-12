# Phase 07 — Linear harmony view

**Purpose:** Render the chord progression's three voice tracks as colored note-heads on a scrollable treble-clef staff in PIXI, with a synced playhead and rest glyphs, visible when the harmony view is active.
**Gate:** Phase 06 complete and Pilot-approved; 329 tests passing; `tsc --noEmit` / `pnpm lint` / `pnpm build` exit 0; `src/core/harmony/voice-tracks.ts`, `staff-map.ts`, and `time-map.ts` all present and tested.
**Expected phase result:** The harmony view (`$sessionStore.view === 'harmony'`) displays a treble-clef staff panel rendering all three voice tracks from `computeVoiceTracks()` as colored note-heads (one color per voice), with ledger lines, sharp accidentals, rest glyphs for `VoiceRestEvent` slots, a white playhead line advancing in sync with `getVisualPhaseAnchor()`, and a staff horizontal scroll position that keeps the playhead visible; all quality gates pass.

---

## Step 07.1 — Inventory

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/handoffs/phase-06-handoff.md` (phase completion entry), and `docs/orbifold-v2/phases/phase-07.md` (this file). Then read the following source files:
- `src/core/harmony/voice-tracks.ts` (complete)
- `src/core/harmony/staff-map.ts` (complete)
- `src/core/harmony/time-map.ts` (complete)
- `src/state/session.ts` lines 1–200 (Chord, RestSlot, ProgressionSlot, HarmonyState, SessionState types; barsLabel export)
- `src/state/phase-anchor.ts` (complete — getVisualPhaseAnchor for playhead sync)
- `src/render/stage.ts` (complete — getStageRefs, view switching, layer management)
- `src/render/theme.ts` (complete — COL, FONT_SERIF, FONT_MONO, FONT_SANS constants)
- `src/render/rhythm-scene.ts` lines 1–110 (module-level pattern: LayerGeo, module-level state, buildRhythmScene / updateRhythmDynamic / tick signatures)
- `src/app/App.svelte` (complete — store subscription pattern, how buildTonnetz / buildRhythmScene / updateRhythmDynamic are called; how resize callbacks are registered)
- `src/app/app.css` lines 1–50 (CSS custom properties: --bg, --stroke, --text, --tonic, --subdom, --dom, --accent, --faint)
- `src/ui/HarmonyControls.svelte` (complete — understand existing harmony-view overlay structure so the staff panel does not conflict with it)

Produce `docs/orbifold-v2/inventories/phase-07-inventory.md`. Do not write source code.

Implementation requirements:
- Confirm the `getStageRefs()` return type from `stage.ts`: record the names and types of all available layer containers/graphics refs (harmonyLayer, hGrid, hPath, hNodes, hDyn, hLabels, hNRG, hNRL). Determine which of these Phase 07 should use, or whether a new dedicated Graphics/Container object should be created inside the existing harmonyLayer. Record the `setView(view)` switching logic to understand when harmonyLayer is visible.
- Confirm `getVisualPhaseAnchor()` return type and units: does it return a fractional bar/cycle offset from the start of the current playback loop? Record how `rhythm-scene.ts` consumes it (the `tickRhythm` function's use of `phase`).
- Confirm `computeVoiceTracks()` input and output shapes as actually exported (check current file — Phase 06 may have changed signatures). Record the discriminant used to detect `VoiceRestEvent` (`'isRest' in event`).
- Confirm `noteToStaffPosition()` return shape (steps, accidental, ledgerLines) and which constants are exported from `staff-map.ts` (TREBLE_STAFF_LINES, STAFF_BOTTOM, STAFF_TOP).
- Confirm `cycleToPosition(cycleIndex, totalCycles, 'linear')` returns `{ mode: 'linear', x: number }` where x = cycleIndex × PX_PER_CYCLE. Record `PX_PER_CYCLE = 48`.
- Confirm `barsLabel` is exported from `session.ts` (used for rendering duration label on note-heads if desired, or not — record the decision either way).
- Confirm current test count (329 from Phase 06 completion).
- Record the three voice colors to be used by the staff scene. ADR 0011 does not assign specific per-voice colors — this is an open design question for Phase 07. Record three candidates from the tonal-function palette (`--tonic`, `--subdom`, `--dom` / COL.tonic, COL.subdom, COL.dom) and flag as a decision the Pilot must resolve at the Pilot checkpoint before step 07.3.
- Record the layout question: the staff panel is a new visual element inside the `#stage` PIXI canvas in harmony view. Determine whether it occupies the full canvas (replacing Tonnetz in harmony view) or is a sub-region (e.g., a horizontal strip at the bottom of the canvas). Flag as an open question for the Pilot if the answer is not clear from existing code.
- Record `HarmonyControls.svelte` position and size to understand what screen real estate is already committed in harmony view.

Validation:
- No source code written.
- Current test count confirmed.

Expected result:
- `docs/orbifold-v2/inventories/phase-07-inventory.md` present and complete.
- All open decisions explicitly flagged (voice colors, staff panel layout region).

CHECKPOINT → Commit message:
`docs(harmony): Phase 07 step 07.1 — phase-07 inventory`

---

## Step 07.2 — Staff layout engine (`src/core/harmony/staff-layout.ts`) + tests

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-07-inventory.md`, `docs/adr/0011-harmony-view-architecture.md`, `docs/adr/0012-rest-data-model.md`, `src/core/harmony/staff-map.ts` (complete), `src/core/harmony/time-map.ts` (complete), and `src/core/harmony/voice-tracks.ts` (complete). Write `src/core/harmony/staff-layout.ts` and `tests/harmony/staff-layout.test.ts`. Do not touch any render file or Svelte component.

Implementation requirements:
- Create `src/core/harmony/staff-layout.ts` as a pure TypeScript engine with no DOM, PIXI, or Svelte imports (CLAUDE.md invariant). AGPL-3.0 header required.
- The module computes the full set of drawable primitives for the linear staff view from three inputs: a `VoiceTrack[]` (from `computeVoiceTracks`), the base octave, and a `pxPerCycle` parameter (caller passes `PX_PER_CYCLE` from `time-map.ts` — do not hardcode 48 in this file; accept it as a parameter to keep the engine decoupled per the vigent rule).
- Export one primary function:
  ```
  computeStaffLayout(tracks: VoiceTrack[], pxPerCycle: number): StaffLayout
  ```
- Export types:
  - `NoteHead`: `{ voiceIndex: 0|1|2; x: number; stepY: number; accidental: ''|'#'; ledgerLines: number[]; bars: number }` — one per `VoiceEvent`; `x` = `startCycle * pxPerCycle`; `stepY` = `noteToStaffPosition(noteName).steps`; ledgerLines from `noteToStaffPosition`; `bars` = event duration.
  - `RestGlyph`: `{ voiceIndex: 0|1|2; x: number; bars: number }` — one per `VoiceRestEvent`; `x` = `startCycle * pxPerCycle`; rendered as a horizontal rest line by the PIXI scene.
  - `StaffLayout`: `{ noteHeads: NoteHead[]; restGlyphs: RestGlyph[]; totalWidth: number }` — `totalWidth` is the x-coordinate of the end of the last event (= `lastStartCycle + lastBars) * pxPerCycle`).
- The function is stateless and pure: it iterates `tracks[v].events` for `v` in 0..2, dispatching on `'isRest' in event` to produce either a `NoteHead` or a `RestGlyph`. Voice index is `tracks[v].voiceIndex`.
- The `totalWidth` is computed as the maximum over all events of `(event.startCycle + event.bars) * pxPerCycle`, or `0` if there are no events. An empty progression must return `{ noteHeads: [], restGlyphs: [], totalWidth: 0 }`.
- No per-voice color assignment in this module — colors are a render-layer concern (step 07.3). The `NoteHead` and `RestGlyph` types carry only structural data.

Tests (`tests/harmony/staff-layout.test.ts`):
- Empty progression → `{ noteHeads: [], restGlyphs: [], totalWidth: 0 }`.
- Single-chord C major at octave 3, `pxPerCycle=48` → 3 note-heads (one per voice) at `x=0`; `stepY` values match `noteToStaffPosition` output for C3, E3, G3; `bars=1`; no rest glyphs.
- Mixed progression `[C major bars:1, rest bars:1, A minor bars:2]`, octave 3: note-heads at `x=0` (chord 0), rest glyphs at `x=48` (rest), note-heads at `x=96` (chord after rest); `totalWidth = (0+1+1+2)*48 = 192`.
- `totalWidth` equals `max(startCycle + bars) * pxPerCycle` for each event in a multi-chord progression.
- Sharp accidental: F#-containing chord produces a `NoteHead` with `accidental='#'` for the voice assigned that note.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm exec vitest run tests/harmony/staff-layout.test.ts` → all pass.
- `grep` confirms no DOM/PIXI/Svelte imports in `src/core/harmony/staff-layout.ts`.
- `pnpm test` → count ≥ 340.

Expected result:
- `src/core/harmony/staff-layout.ts` committed.
- `tests/harmony/staff-layout.test.ts` committed with ≥ 11 tests.
- All prior tests still pass.

CHECKPOINT → Commit message:
`feat(harmony): Phase 07 step 07.2 — staff-layout engine and tests`

---

## Step 07.3 — PIXI harmony staff scene (`src/render/harmony-staff-scene.ts`)

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-07-inventory.md`, `docs/adr/0011-harmony-view-architecture.md`, `src/core/harmony/staff-layout.ts` (complete), `src/core/harmony/staff-map.ts` (TREBLE_STAFF_LINES, STAFF_BOTTOM, STAFF_TOP constants), `src/core/harmony/time-map.ts` (PX_PER_CYCLE), `src/core/harmony/voice-tracks.ts` (computeVoiceTracks), `src/render/stage.ts` (complete), `src/render/theme.ts` (COL, fonts), `src/render/rhythm-scene.ts` lines 95–250 (module-level state pattern, buildScene/update/tick structure), and `src/state/phase-anchor.ts` (complete). Write `src/render/harmony-staff-scene.ts`. Do not touch any Svelte component or `App.svelte`.

Implementation requirements:
- Create `src/render/harmony-staff-scene.ts` following the module-level singleton pattern used by `tonnetz-scene.ts` and `rhythm-scene.ts`. AGPL-3.0 header required. PIXI v7 imports only.
- The module owns its PIXI display objects (Graphics/Container). It attaches them inside the existing `harmonyLayer` container obtained via `getStageRefs()` — do not add new layers to `stage.ts`. The staff scene objects are distinct from the Tonnetz scene objects and must not interfere with them.
- Export these functions (no others):
  - `buildHarmonyStaffScene(state: SessionState): void` — clears previous staff objects, calls `computeVoiceTracks(state.harmony.progression, state.harmony.octave)`, calls `computeStaffLayout(tracks, PX_PER_CYCLE)`, and draws the static staff geometry: five staff lines, treble clef symbol (a PIXI.Text '𝄞' or a simplified arc — Dev's choice, must be legible), and all note-heads, accidentals, ledger lines, and rest glyphs.
  - `updateHarmonyStaffDynamic(state: SessionState): void` — redraws only the animated elements: the playhead vertical line (position = `getVisualPhaseAnchor() * totalCycles * PX_PER_CYCLE` clamped to `[0, totalWidth]`, where `totalCycles` is the sum of all slot `bars`).
  - `tickHarmonyStaff(): void` — called from the PIXI ticker when the harmony view is active; calls `updateHarmonyStaffDynamic` with the current store state.
- Staff geometry rules (from ADR 0011 D3 and the vigent diatonic-coordinate rule):
  - Five staff lines correspond to `TREBLE_STAFF_LINES = [2, 4, 6, 8, 10]` in diatonic steps. Each diatonic step = `STEP_PX / 2` pixels vertically (Dev chooses `STEP_PX` as a module constant; suggested 10 px/step so a full staff space = 10 px). The y-coordinate of diatonic step `s` is `staffBaseY - s * (STEP_PX / 2)` where `staffBaseY` is a vertical anchor chosen so the staff fits in the designated canvas region (determined by the inventory).
  - Staff lines are horizontal, spanning the full `totalWidth` (or a minimum width if the progression is empty).
  - Note-heads are filled circles of radius ~4 px at `(x + NOTE_OFFSET_X, stepY_px)` where `x` comes from `NoteHead.x` and `stepY_px = staffBaseY - stepY * (STEP_PX / 2)`. `NOTE_OFFSET_X` is a small horizontal offset (0 or a fraction of `PX_PER_CYCLE`) so note-heads do not sit on the left edge of their slot.
  - Ledger lines are horizontal segments drawn for each value in `NoteHead.ledgerLines`, at the diatonic step y-coordinate, spanning ±8 px around the note-head x.
  - Sharp accidentals (`NoteHead.accidental === '#'`) are drawn as a PIXI.Text '#' (or drawn glyphs) to the left of the note-head.
  - Rest glyphs (`RestGlyph`) are drawn as a short horizontal thick line centered in the rest slot's x-range at the middle-staff y-coordinate.
  - Voice colors: use the three values recorded in the inventory (Pilot decision at checkpoint). The voice color is applied to note-heads, ledger lines, and accidentals for that voice. Staff lines, treble clef, and rest glyphs use `COL.faint`.
  - Playhead: a 1 px wide vertical white line (`0xffffff`) spanning the full staff height, updated each tick.
- The `PX_PER_CYCLE` used here must be imported from `src/core/harmony/time-map.ts` (the vigent coordination-point rule).
- `tickHarmonyStaff` is called unconditionally by the ticker; it must check `$sessionStore.view === 'harmony'` internally and early-return if not in harmony view (consistent with the pattern used by `tonnetz-scene.ts`'s `tickHarmony`).

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm test` → count ≥ 340 (scene module has no unit tests; prior test count must be maintained).
- `pnpm build` → exits 0.

Expected result:
- `src/render/harmony-staff-scene.ts` committed.
- No Svelte components modified.
- All prior tests still pass.

CHECKPOINT → Commit message:
`feat(harmony): Phase 07 step 07.3 — PIXI harmony staff scene`

---

## Step 07.4 — Svelte integration in `App.svelte`

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-07-inventory.md`, `src/render/harmony-staff-scene.ts` (complete), `src/app/App.svelte` (complete), and `src/render/stage.ts` (complete). Wire the harmony staff scene into the app. Do not modify any pure engine or PIXI scene file.

Implementation requirements:
- Import `buildHarmonyStaffScene`, `updateHarmonyStaffDynamic`, `tickHarmonyStaff` from `../render/harmony-staff-scene.js` in `App.svelte`.
- Call `buildHarmonyStaffScene(get(sessionStore))` immediately after `buildTonnetz(get(sessionStore))` in the `onMount` section (after the `await requestAnimationFrame` that ensures PIXI has sized).
- In the `onResize` callback: add `buildHarmonyStaffScene(get(sessionStore))` after the existing `buildTonnetz` and `buildRhythmScene` calls, followed by `updateHarmonyStaffDynamic(get(sessionStore))`.
- In the `sessionStore.subscribe` callback: add `updateHarmonyStaffDynamic(state)` call alongside the existing `updateTonnetzDynamic(state)` call (both are called on every store change; the scene functions guard internally on the active view).
- Register `tickHarmonyStaff` in the PIXI ticker using `registerTicker(app)` — check whether `registerTicker` accepts multiple callbacks or whether `tickHarmonyStaff` must be added via `app.ticker.add(tickHarmonyStaff)` directly. Use whichever pattern is consistent with `tonnetz-scene.ts`'s `registerTicker`.
- The staff scene rebuilds when `state.harmony.progression` or `state.harmony.octave` changes. The existing subscribe callback already triggers `updateHarmonyStaffDynamic` on every store change; a full `buildHarmonyStaffScene` rebuild is needed when the progression length changes or octave changes. Add change detection analogous to the existing `layerCount !== prevLayerCount` check: track `prevProgressionLength` and `prevOctave`; call `buildHarmonyStaffScene` when either changes, and `updateHarmonyStaffDynamic` otherwise.
- No new Svelte components, no new HTML elements. The staff scene is rendered entirely on the PIXI canvas inside `#stage`.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm test` → count ≥ 340 (no new Vitest tests; `App.svelte` is not Vitest-testable).
- `pnpm build` → exits 0.
- Manual: switching to the Harmony view shows the staff panel in the `#stage` canvas. With a progression loaded, note-heads appear at the correct horizontal positions for each chord. The treble clef glyph is visible. Staff lines are visible.
- Manual: the playhead advances when Armonía transport is playing; the playhead position is visually aligned with the ProgressionStrip cursor above it (both advance at the same x-rate, governed by PX_PER_CYCLE = 48).

Expected result:
- `src/app/App.svelte` modified and committed.
- Staff scene visible in the harmony PIXI view.
- Playhead synced to audio.

CHECKPOINT → Commit message:
`feat(harmony): Phase 07 step 07.4 — wire harmony staff scene into App.svelte`

---

## Step 07.5 — Quality gates + manual acceptance

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/handoffs/phase-07-handoff.md` (all prior step entries). Run all quality gates and perform manual verification of the acceptance criteria that require live-system or manual observation. Fix any remaining issues. Do not add new features.

Implementation requirements:
- Run `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` — all must exit 0. Minimum test count: 340.
- Verify AGPL-3.0 header is present in all new files: `src/core/harmony/staff-layout.ts`, `src/render/harmony-staff-scene.ts`, test files.
- Verify that `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` returns 0 matches (pure engine invariant maintained).
- Verify `PX_PER_CYCLE` in `harmony-staff-scene.ts` is imported from `time-map.ts`, not re-declared (vigent coordination-point rule).
- Perform manual verification for A-07-08 through A-07-12 (live-system and manual acceptance criteria). Document observations in the handoff (screenshots or concise descriptions are acceptable — the Planner will use these as evidence).
- Perform the playhead alignment check: with the Armonía transport playing, confirm the staff playhead x-position advances at the same rate as the ProgressionStrip cursor (both driven by `PX_PER_CYCLE = 48`). If there is misalignment, fix it and re-run quality gates before committing.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm test` → count ≥ 340.
- `pnpm build` → exits 0.
- Manual evidence recorded for A-07-08 through A-07-12.

Expected result:
- All quality gates confirmed green.
- Phase 07 handoff completion entry written.

CHECKPOINT → Commit message:
`feat(harmony): Phase 07 step 07.5 — quality gates and manual acceptance`

---

## Phase Acceptance

- **A-07-01** — `computeStaffLayout(tracks, 48)` for an empty progression returns `{ noteHeads: [], restGlyphs: [], totalWidth: 0 }`.
  - Validation method: `unit`

- **A-07-02** — `computeStaffLayout` for a single C-major chord at octave 3 returns 3 note-heads at `x=0` with `stepY` values matching `noteToStaffPosition('C3').steps`, `noteToStaffPosition('E3').steps`, and `noteToStaffPosition('G3').steps` respectively.
  - Validation method: `unit`

- **A-07-03** — `computeStaffLayout` for `[C major bars:1, rest bars:1, A minor bars:2]` at octave 3 returns: note-heads at `x=0`, rest glyphs at `x=48`, note-heads at `x=96`; `totalWidth=192`.
  - Validation method: `unit`

- **A-07-04** — `computeStaffLayout` for a chord containing a sharp note (e.g., a chord whose voice produces F#3) returns a `NoteHead` with `accidental='#'` for that voice.
  - Validation method: `unit`

- **A-07-05** — `computeStaffLayout` for a chord below the treble staff (e.g., C3 at steps=−7) returns `NoteHead` entries with non-empty `ledgerLines` arrays matching `noteToStaffPosition` output.
  - Validation method: `unit`

- **A-07-06** — No `src/core/harmony/` file imports pixi.js, svelte, or DOM-only modules (`grep` returns 0 matches for all four new engine files).
  - Validation method: `proxy:static-analysis`

- **A-07-07** — `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test` (≥ 340), and `pnpm build` all exit 0 after Phase 07.
  - Validation method: `automated`

- **A-07-08** — In the harmony view, five equidistant staff lines are visible in the PIXI canvas, with a treble clef glyph at the left edge.
  - Validation method: `manual`

- **A-07-09** — With a chord progression loaded and the harmony view active, colored note-heads appear at the correct horizontal positions (one per chord per voice), each voice in a distinct color, with ledger lines rendered below the staff for the default octave-3 voicings (C3–G3 range).
  - Validation method: `manual`

- **A-07-10** — Rest slots in the progression appear as rest glyphs (a short horizontal mark) in the staff view at the correct x-position; no note-head is rendered for a rest slot.
  - Validation method: `manual`

- **A-07-11** — With the Armonía transport playing, a white playhead vertical line advances across the staff; the playhead x-position at any point in time is visually aligned with the ProgressionStrip cursor above it (both advance at the PX_PER_CYCLE = 48 rate).
  - Validation method: `live-system`

- **A-07-12** — Sharp accidentals are drawn to the left of the corresponding note-head; natural notes show no accidental symbol.
  - Validation method: `manual`

## Partial coverage from prior phase

No prior partials to address. All Phase 06 acceptance criteria were fully covered; the two manual/live-system items (A-06-09, A-06-10) were verified by the Pilot during phase sign-off.

## Pilot design decisions (resolved before step 07.1)

These decisions were made by the Pilot (Javier, 2026-06-11) and are binding for the Dev:

1. **Voice colors:** Use the tonal-function palette — voice 0 → tónica `#f3b15a`, voice 1 → subdominante `#56cfc4`, voice 2 → dominante `#e87bac`. These correspond to `COL.tonic`, `COL.subdom`, `COL.dom` in `src/render/theme.ts`.
2. **Staff layout region:** The staff occupies a **horizontal strip in the lower portion of the canvas** in harmony view. The Tonnetz (or dark background) occupies the upper area. The staff does NOT replace the full canvas — it is a sub-region. The exact vertical split point (e.g., bottom third of the canvas height) is determined in step 07.1 based on available canvas height; the Dev should pick a split that gives the staff enough room for five lines plus ledger lines (at STEP_PX = 10, that's ~80–100px including above/below margins).

## ADR Triggers

No new ADRs are anticipated. Voice-color and staff-layout decisions are recorded above as Pilot decisions; they do not require a full ADR unless a future phase reveals broader architectural consequences.

- **None anticipated** — Phase 07 uses confirmed engines from Phases 05–06 and established PIXI patterns from the rhythm scene.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v2/handoffs/phase-07-handoff.md`. See `handoff-template.md`.
