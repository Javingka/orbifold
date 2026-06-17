# Phase 08 — Harmony-view UX

**Purpose:** Reshape the four carry-forward partials from Phase 07 into a usable harmony view: central full-canvas staff with a Tonnetz ⇄ Pentagrama sub-toggle, user-selectable voice register mode, a cyclic looping playhead on both the staff and the ProgressionStrip, and the acorde/arpegio selector relocated from the canvas overlay to the top bar.

**Gate:** Phase 07 closed with IMPL-verified acceptance (A-07-08 through A-07-12); live verification revealed four integration/UX gaps. Branch `orbifold-v2/phase-08` cut from `orbifold-v2/phase-07` tip. Test baseline: 361 passing.

**Expected phase result:** The Armonía view has a Tonnetz ⇄ Pentagrama sub-toggle in the top bar; the staff is central and prominent (full canvas height, not a cramped bottom strip); voice register is switchable between estricto and suavizado via a top-bar toggle; the playhead loops continuously on the staff and is mirrored by a cursor on the ProgressionStrip; the acorde/arpegio/marco widget no longer covers the canvas.

## Pilot decisions (pre-resolved 2026-06-12, before step 08.1)

The three open decisions the Planner flagged for the inventory checkpoint are pre-resolved by the Pilot (Javier):

1. **Default `harmony.subview` = `'tonnetz'`** — on load the user sees the Tonnetz, preserving reversibility to Phase 07 behavior.
2. **Default `harmony.registerMode` = `'suavizado'`** — smooth contour by default (friendly for free music-making).
3. **`marco` button → top bar**, alongside the relocated `acorde/arpegio` control (step 08.6). All harmony controls live together in the top bar; the canvas is fully freed.

These values are binding; the Dev uses them directly in steps 08.5–08.6 without re-asking.

---

## Step 08.1 — Inventory

PROMPT → Read all required files (CLAUDE.md, `docs/orbifold-v2/decisions.md`, Phase 07 handoff Pilot Checkpoint #5, this phase file, ADR 0011). Read and document every source file that will be touched in Phase 08 steps 08.3–08.7:
- `src/core/harmony/voice-tracks.ts` — the `computeVoiceTracks` function and the octave-derivation formula at line 176 that causes register jumps.
- `src/render/harmony-staff-scene.ts` — the `updateHarmonyStaffDynamic` function (clamp vs modulo), `_staffBaseY`, `STEP_PX`, and how the scene objects are added to `harmonyLayer`.
- `src/render/stage.ts` — `harmonyLayer` lifecycle, `setView`, `getStageRefs`, and the existing Tonnetz children added to `harmonyLayer` at init.
- `src/render/tonnetz-scene.ts` — identify which PIXI objects belong to the Tonnetz render (the objects added to `harmonyLayer` by `tonnetz-scene.ts`: hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels). Confirm they are children of `harmonyLayer`, not sub-containers.
- `src/state/session.ts` — `HarmonyState` type, `SessionState` type, `view` field, store actions. Note the audio codegen path (`chordToStrudel`, `melodyLine`) to verify voice-tracks output does NOT feed into audio.
- `src/ui/Header.svelte` — current segmented controls and harmony-only field group.
- `src/ui/HarmonyControls.svelte` — overlay position, acorde/arpegio/marco content.
- `src/ui/ProgressionStrip.svelte` — PX_PER_CYCLE constant location, ruler and segment DOM structure (where the cursor will be inserted).
- `src/lib/persistence.ts` and `src/agent/schema.ts` — confirm `subview` and `registerMode` fields are absent and should not be added (UI-only ephemeral state).
- Confirm the current test count.
- Produce `docs/orbifold-v2/inventories/phase-08-inventory.md` with: (a) confirmed values table (STEP_PX, staffBaseY formula, PX_PER_CYCLE locations, `harmonyLayer` child list, octave-derivation formula); (b) audio-path isolation verdict (does voice-tracks output reach `melodyLine`/`chordToStrudel`? — explicit YES/NO with citation); (c) open questions: default for `harmony.subview`, default for `harmony.registerMode`, and `marco` button placement (stays in canvas overlay or also moves to top bar); (d) the Tonnetz sub-container design decision needed for step 08.5.
- Do NOT write any source code.

Implementation requirements:
- Read every file listed above before writing the inventory document.
- The audio-path isolation verdict is mandatory — the inventory is incomplete without it.
- The open questions section must name the three decisions that need Pilot resolution.

Validation:
- `docs/orbifold-v2/inventories/phase-08-inventory.md` exists and is non-empty.
- No source files modified.

Expected result:
- Inventory document produced. Three open decisions surfaced for Pilot resolution before step 08.2.

CHECKPOINT → Commit message:
`docs(harmony): Phase 08 step 08.1 — phase-08 inventory`

---

## Step 08.2 — ADR 0011 amendment

PROMPT → Read ADR 0011 (`docs/adr/0011-harmony-view-architecture.md`), the Phase 08 inventory, and the Pilot's resolutions from the inventory checkpoint. Amend ADR 0011 in place by appending an "Amendment — Phase 08" section that records two new architectural decisions:

**(a) Staff is a central full-canvas view, toggled against the Tonnetz (Tonnetz ⇄ Pentagrama).**
The Armonía view gains a sub-toggle (`harmony.subview: 'tonnetz' | 'staff'`). When `subview === 'staff'`, the Tonnetz scene objects are hidden and the staff scene objects are visible at central, full-canvas geometry (`staffBaseY` at canvas center, `STEP_PX` increased to a legibility value confirmed at inventory). When `subview === 'tonnetz'`, the reverse. This supersedes the Phase 07 "coexisting strip" layout where `staffBaseY = height − 60`.

The implementation uses two PIXI sub-containers inside `harmonyLayer`: `tonnetzContainer` (holds hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels) and `staffContainer` (holds the staff scene objects). `setView` and a new `setHarmonySubview` function toggle `.visible` on these sub-containers. The ProgressionStrip remains visible in both subviews (it is the duration/gain editor per ADR 0011 D2).

**(b) Voice register is user-selectable: estricto (absolute MIDI pitch) vs suavizado (octave-nearest voice continuity).**
`computeVoiceTracks` gains a `registerMode` parameter (`'estricto' | 'suavizado'`). In `estricto` mode the current formula is preserved (`octave + Math.floor((rootPc + iv) / 12)`). In `suavizado` mode each voice picks the nearest octave to its previous note (within ±6 semitones), producing smooth horizontal contour lines on the staff. This is visual-only: `voice-tracks.ts` outputs are consumed only by `staff-layout.ts` → `harmony-staff-scene.ts`; audio codegen (`melodyLine`/`chordToStrudel`) remains unchanged. The register mode is ephemeral UI state (`harmony.registerMode` in the session store), not persisted.

Implementation requirements:
- Append only; do not modify existing ADR 0011 sections.
- Use the exact values confirmed by the Pilot at inventory checkpoint (defaults, STEP_PX value, marco placement).
- The amendment must state that `suavizado` produces byte-identical audio output regardless of mode (the register mode flag is visual-only).
- Do not write source code.

Validation:
- `docs/adr/0011-harmony-view-architecture.md` contains an "Amendment — Phase 08" section.
- No source files modified.

Expected result:
- ADR 0011 amendment committed. Pilot Checkpoint #2 triggered.

CHECKPOINT → Commit message:
`docs(adr): Phase 08 step 08.2 — ADR 0011 amendment (central staff + register mode)`

---

## Step 08.3 — Voice register mode engine (`voice-tracks.ts` revision + tests)

PROMPT → Read `src/core/harmony/voice-tracks.ts`, the ADR 0011 amendment, and the Phase 08 inventory. Add a `RegisterMode` type and `registerMode` parameter to `computeVoiceTracks`, implementing both modes without breaking existing behavior.

Implementation requirements:
- Add `export type RegisterMode = 'estricto' | 'suavizado'` to `voice-tracks.ts`.
- Change `computeVoiceTracks` signature to `(progression, octave, registerMode: RegisterMode = 'suavizado')`. The default preserves the Phase 08 UX goal (smooth contour by default) while keeping any existing caller that passes only two arguments working identically to the current `'suavizado'` behavior — **exception**: the default must NOT silently change audio output. Because `voice-tracks.ts` is visual-only (confirmed at inventory), changing the default to `'suavizado'` is safe, but the handoff must cite the audio-path isolation evidence from the inventory.
- `estricto` mode: preserve the existing formula exactly — `octave + Math.floor((rootPc + iv) / 12)`. All existing test assertions using the current formula remain valid under `estricto`.
- `suavizado` mode: for each voice v on chord i > 0, compute the candidate note at the same `estricto` octave, then also consider the note one octave above and one below. Pick whichever has the smallest absolute semitone distance from the previous note in that voice. In case of a tie (exactly ±6 semitones), prefer the lower octave.
- The suavizado algorithm must be a pure function with no side effects and no DOM/PIXI/Svelte imports.
- No changes to the `VoiceTrack`, `VoiceEvent`, `VoiceRestEvent`, or `ChordInput`/`RestInput` types.
- AGPL-3.0 header present (already present — do not remove).
- Write `tests/harmony/voice-tracks-register.test.ts` with unit tests covering:
  - `estricto` mode: existing octave-jump behavior preserved (a progression where root pitch class causes an octave increase should produce the same octave arithmetic as before).
  - `suavizado` mode: a two-chord progression where `estricto` would produce a register jump instead produces a smooth transition (voice stays within ±6 semitones of its previous note).
  - Rest slot passthrough: a rest between two chords preserves voice-leading across the gap in both modes.
  - Default parameter: calling `computeVoiceTracks(prog, octave)` (two args) is equivalent to calling with `'suavizado'` explicitly.

Validation:
- `pnpm exec vitest run tests/harmony/voice-tracks-register.test.ts` passes.
- `pnpm test` exits clean with count ≥ 361 (new tests raise it).
- `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` returns 0 matches.
- `pnpm exec tsc --noEmit` exits 0.
- `pnpm lint` exits 0.

Expected result:
- `src/core/harmony/voice-tracks.ts` updated with register mode; new tests pass; test count raised above 361.

CHECKPOINT → Commit message:
`feat(harmony): Phase 08 step 08.3 — voice register mode engine and tests`

---

## Step 08.4 — Central staff layout + cyclic playhead (`harmony-staff-scene.ts`)

PROMPT → Read `src/render/harmony-staff-scene.ts`, the ADR 0011 amendment, the Phase 08 inventory, and the updated `voice-tracks.ts` from step 08.3. Implement two changes in `harmony-staff-scene.ts`:

**(a) Central staff geometry:** Change `staffBaseY` from `app.screen.height − 60` to a value that centers the staff vertically on the canvas. The staff's vertical midpoint (step 6 = B4, the middle staff line) should be at `app.screen.height / 2`. Therefore `staffBaseY = app.screen.height / 2 − (6 * HALF_STEP_PX)` where `HALF_STEP_PX = STEP_PX / 2`. Increase `STEP_PX` from `10` to the value confirmed in the ADR 0011 amendment (expected to be `16` for legibility — use the exact value from the ADR amendment). Recompute `HALF_STEP_PX` accordingly.

**(b) Cyclic playhead:** In `updateHarmonyStaffDynamic`, replace the `Math.min(Math.max(rawX, 0), _staffWidth)` clamp with `rawX % _staffWidth` (wrap-around modulo). Guard: if `_staffWidth <= 0`, return early without drawing the playhead.

Additionally, update the `buildHarmonyStaffScene` call to pass `state.harmony.registerMode` (or the Pilot-confirmed default if the field is not yet in the store) to `computeVoiceTracks`.

Implementation requirements:
- `STEP_PX` value must match the value in the ADR 0011 amendment exactly.
- The playhead modulo formula must handle the case where `rawX` is negative (anchor in the future — possible briefly after re-anchor): `((rawX % _staffWidth) + _staffWidth) % _staffWidth` to ensure a non-negative result.
- The staff width passed to `drawStaticStaff` remains `_staffWidth = Math.max(_layout.totalWidth, MIN_STAFF_WIDTH)` — unchanged.
- `PX_PER_CYCLE` is still imported from `time-map.ts` (vigent coordination-point rule — do not redeclare).
- AGPL-3.0 header present (already present — do not remove).
- Do not introduce `tonnetzContainer`/`staffContainer` sub-containers in this step — that is step 08.5.

Validation:
- `pnpm exec tsc --noEmit` exits 0.
- `pnpm lint` exits 0.
- `pnpm test` exits clean (count unchanged, no regressions — this step has no new unit tests).
- `pnpm build` exits 0.

Expected result:
- `harmony-staff-scene.ts` updated with central geometry and cyclic playhead; quality gates green.

CHECKPOINT → Commit message:
`feat(harmony): Phase 08 step 08.4 — central staff geometry and cyclic playhead`

---

## Step 08.5 — Tonnetz ⇄ Pentagrama sub-toggle (stage + store + Header)

PROMPT → Read `src/render/stage.ts`, `src/render/tonnetz-scene.ts` (module structure and which objects belong to Tonnetz), `src/state/session.ts`, and `src/ui/Header.svelte`. Implement the Tonnetz ⇄ Pentagrama sub-toggle.

Implementation requirements:

**`src/render/stage.ts`:**
- In `initStage`, after creating `harmonyLayer`, create two child containers: `_tonnetzContainer = new PIXI.Container()` and `_staffContainer = new PIXI.Container()`. Add both as children of `harmonyLayer` (in that order: Tonnetz behind staff).
- Move the seven Tonnetz scene children (hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels) into `_tonnetzContainer` instead of directly into `harmonyLayer`.
- Export `_tonnetzContainer` and `_staffContainer` via `getStageRefs()` as `tonnetzContainer: PIXI.Container` and `staffContainer: PIXI.Container`, and add them to the `StageRefs` interface.
- Add `export function setHarmonySubview(subview: 'tonnetz' | 'staff'): void` that sets `_tonnetzContainer.visible` and `_staffContainer.visible` to the appropriate values (exactly one visible at a time).
- `setView('harmony')` behavior is unchanged (`harmonyLayer.visible = true`); visibility of sub-containers is managed separately by `setHarmonySubview`.

**`src/render/harmony-staff-scene.ts`:**
- In `buildHarmonyStaffScene`, add the staff scene objects (`_staffGfx`, `_accidentalContainer`, `_clefText`, `_dynGfx`) to `staffContainer` (via `refs.staffContainer`) instead of directly to `harmonyLayer`. Update the removal logic accordingly.

**`src/state/session.ts`:**
- Add `subview: 'tonnetz' | 'staff'` and `registerMode: RegisterMode` to `HarmonyState`. Import `RegisterMode` from `../core/harmony/voice-tracks.js`. Set defaults: `subview: 'tonnetz'` (default confirmed at inventory), `registerMode: 'suavizado'` (default confirmed at inventory).
- Add `export function setHarmonySubview(subview: 'tonnetz' | 'staff'): void` that updates the store and calls `setHarmonySubview(subview)` from `stage.ts` (import it). Rename as needed to avoid collision.
- Add `export function setRegisterMode(mode: RegisterMode): void` that updates `harmony.registerMode` in the store and calls `requeueLive()` — no, STOP: `registerMode` is visual-only (confirmed at inventory); it must NOT call `requeueLive()`. It updates the store only (the store subscription in `App.svelte` will call `buildHarmonyStaffScene` on the next state change).
- The new fields are NOT added to `SavedHarmonySchema` in `persistence.ts` and NOT added to agent schema — these are ephemeral UI-only fields. Add a comment in the HarmonyState interface confirming this.

**`src/ui/Header.svelte`:**
- Inside the `{#if $sessionStore.view === 'harmony'}` block, add a `.seg` segmented control for the sub-toggle: two buttons "Tonnetz" and "Pentagrama" (Spanish labels). On click, call the `setHarmonySubview` store action. Active state driven by `$sessionStore.harmony.subview`. Place this control immediately after the view-toggle segment (before the key-selector field group).
- Add a `.seg` segmented control for register mode: two buttons "estricto" and "suavizado". On click, call the `setRegisterMode` store action. Active state driven by `$sessionStore.harmony.registerMode`. Place this control next to (after) the sub-toggle, still inside the harmony-only block.

Implementation requirements:
- `persistence.ts` and `agent/schema.ts` must NOT be modified in this step.
- The `tonnetzContainer` / `staffContainer` split must not change the z-order within each group (Tonnetz children remain in their original relative order; staff children remain in their build order).
- Default subview is `'tonnetz'` — on load, the user sees the Tonnetz as before (reversibility: with `subview === 'tonnetz'` and `staffContainer.visible === false`, the harmony view is byte-identical in behavior to pre-phase-08 Phase 07 state).
- AGPL-3.0 header present on all modified files (already present on stage.ts, harmony-staff-scene.ts, session.ts — do not remove).

Validation:
- `pnpm exec tsc --noEmit` exits 0.
- `pnpm lint` exits 0.
- `pnpm test` exits clean (count ≥ 361; no regressions — no new Vitest tests in this step; the store changes may require updating any existing session.ts tests if they check HarmonyState shape).
- `pnpm build` exits 0.

Expected result:
- Sub-toggle wired end-to-end: clicking "Pentagrama" in the top bar hides the Tonnetz container and shows the staff container (full-canvas, centered); clicking "Tonnetz" reverses. Register mode toggle updates the store. Quality gates green.

CHECKPOINT → Commit message:
`feat(harmony): Phase 08 step 08.5 — Tonnetz⇄Pentagrama sub-toggle, stage containers, store fields`

---

## Step 08.6 — Relocate acorde/arpegio to top bar + ProgressionStrip cursor

PROMPT → Read `src/ui/HarmonyControls.svelte`, `src/ui/Header.svelte`, `src/ui/ProgressionStrip.svelte`, and `src/state/phase-anchor.ts`. Implement two changes:

**(a) Relocate acorde/arpegio (and marco) to the top bar:**
- In `Header.svelte`, inside the `{#if $sessionStore.view === 'harmony'}` block (after the sub-toggle and register-mode controls), add the chord-mode segmented control (import `setChordMode` from session.ts; driven by `$sessionStore.chordMode`) and the marco context button (import `agentCtx` from agentCtx.ts). Preserve the existing button labels and active-state logic exactly (`◧ acorde` / `⋯ arpegio`; marco emoji and `includeHarmony` active state).
- In `HarmonyControls.svelte`, remove the `acorde/arpegio` seg and the `marco` button (the entire `.seg2#chordModeSeg` and `.tbtn` marco button). Keep the outer `{#if}` and `<div class="orbit-ctl">` present but empty, or remove the component entirely from App.svelte if no other content remains — inventory step 08.1 confirmed whether any other content lives in this component. If the component becomes empty, remove its `<App.svelte>` usage and the Svelte file, or leave as an empty shell with a comment — the Dev decides and records in the handoff.
- The `setChordMode` store action is unchanged.
- AGPL-3.0 header present on `Header.svelte` (add if absent; it was not present in the prototype port).

**(b) ProgressionStrip playhead cursor:**
- In `ProgressionStrip.svelte`, add a thin vertical cursor line that tracks the playhead position, using `getVisualPhaseAnchor()` and `PX_PER_CYCLE`. The cursor must loop with the progression (modulo total strip width in pixels = `totalBars * PX_PER_CYCLE`).
- The cursor is a `<div>` absolutely positioned inside `.strip-scroll` (or a sibling overlay), updated via a `requestAnimationFrame` loop (the existing `setInterval` pattern used elsewhere is acceptable; `rAF` preferred for smooth animation).
- `PX_PER_CYCLE` is already declared in `ProgressionStrip.svelte` as a `const` (the vigent coordination-point duplicate). The cursor must use that same local constant, not import from `time-map.ts` (the Svelte component is not a pure engine; the local const is the correct usage per the Register rule). The two values remain in sync as the Register requires.
- The cursor line style: 1px, white (`rgba(255,255,255,0.8)`), full height of the strip body (below the ruler).
- `bpm` must be read from the session store for the `barMs` calculation (same formula as `harmony-staff-scene.ts`: `barMs = (60000 / bpm) * 4`).

Implementation requirements:
- Do not import from `time-map.ts` in `ProgressionStrip.svelte` (the Svelte file is not a pure engine consumer; keep the local const per Register rule).
- The cursor update loop must be cleaned up on component `onDestroy`.
- Preserve all existing ProgressionStrip behavior (resize handles, gain drag, tap-to-preview, rest slots, add-chord / add-rest buttons).
- AGPL-3.0 header present on ProgressionStrip.svelte (already present).

Validation:
- `pnpm exec tsc --noEmit` exits 0.
- `pnpm lint` exits 0.
- `pnpm test` exits clean (count ≥ 361).
- `pnpm build` exits 0.

Expected result:
- Top bar contains acorde/arpegio/marco controls in harmony view; canvas overlay no longer overlaps the staff. ProgressionStrip shows a live looping cursor. Quality gates green.

CHECKPOINT → Commit message:
`feat(harmony): Phase 08 step 08.6 — relocate acorde/arpegio to header, ProgressionStrip cursor`

---

## Step 08.7 — Quality gates + manual acceptance

PROMPT → Read all files modified in steps 08.3–08.6. Run all quality gates and perform static code analysis for every live-system and manual acceptance criterion. Record in the handoff.

Implementation requirements:
- Run `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` and record exact counts.
- For each IMPL-verified criterion (A-08-08 through A-08-14), cite the exact source line(s) where the behavior is implemented.
- Confirm AGPL-3.0 header on every new or modified `.ts`/`.svelte` file in this phase.
- Confirm `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` returns 0 matches.
- Confirm `PX_PER_CYCLE` in `harmony-staff-scene.ts` is imported from `time-map.ts` and not re-declared.
- Confirm `PX_PER_CYCLE` in `ProgressionStrip.svelte` is the local const (not an import from time-map.ts) and its value is `48`.
- Confirm `persistence.ts` and `agent/schema.ts` are unchanged (no new subview/registerMode fields).
- Confirm `registerMode` and `subview` fields in `HarmonyState` carry a JSDoc comment stating they are ephemeral UI state not persisted.
- Live/visual verification of A-08-08 through A-08-14 is deferred to Pilot (CLI environment). Record the deferral explicitly.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm test` → exits clean with count ≥ 361 (new voice-tracks-register tests from step 08.3 raise the count above baseline).
- `pnpm build` → exits 0.

Expected result:
- All quality gates green. Handoff records static evidence for all acceptance IDs. Live verification deferred to Pilot.

CHECKPOINT → Commit message:
`feat(harmony): Phase 08 step 08.7 — quality gates and manual acceptance`

---

## Phase Acceptance

- **A-08-01** — `computeVoiceTracks(progression, octave, 'estricto')` produces the same octave assignment as the pre-phase formula (`octave + Math.floor((rootPc + iv) / 12)`).
  - Validation method: `unit`

- **A-08-02** — `computeVoiceTracks(progression, octave, 'suavizado')` on a two-chord progression where the `estricto` formula would produce a register jump instead produces a note within ±6 semitones of the previous note for every voice.
  - Validation method: `unit`

- **A-08-03** — `computeVoiceTracks(progression, octave)` (two-argument call, default mode) produces output byte-identical to the explicit `'suavizado'` call.
  - Validation method: `unit`

- **A-08-04** — `computeVoiceTracks` with a rest slot between two chords preserves voice-leading across the gap in both modes (the note after the rest is computed against the note before the rest, not the rest itself).
  - Validation method: `unit`

- **A-08-05** — `registerMode` and `subview` fields are absent from `SavedHarmonySchema` in `persistence.ts` and from `agent/schema.ts`. Changing these fields in the store does not alter the saved session blob.
  - Validation method: `proxy:static-analysis`

- **A-08-06** — No PIXI/Svelte/DOM imports in `src/core/harmony/` (pure engine invariant maintained after voice-tracks edit).
  - Validation method: `proxy:static-analysis`

- **A-08-07** — `tsc --noEmit` exits 0, `pnpm lint` exits 0, `pnpm test` count ≥ 361, `pnpm build` exits 0.
  - Validation method: automated

- **A-08-08** — The playhead on the staff advances continuously and loops back to the left edge when the progression completes, instead of freezing at the last note.
  - Validation method: `live-system`

- **A-08-09** — With `registerMode = 'suavizado'`, voice contours on the staff form smooth horizontal lines (no large register jumps between adjacent chords) for a representative multi-chord progression.
  - Validation method: `manual`

- **A-08-10** — In the Pentagrama subview, the staff occupies the full canvas height in a centered, legible layout (not cramped in the bottom strip).
  - Validation method: `manual`

- **A-08-11** — The Tonnetz ⇄ Pentagrama sub-toggle in the top bar switches the canvas between the Tonnetz and the staff; the ProgressionStrip remains visible in both subviews.
  - Validation method: `manual`

- **A-08-12** — The ProgressionStrip shows a cursor that advances in sync with the staff playhead, loops with the progression, and is visible in both Tonnetz and Pentagrama subviews.
  - Validation method: `live-system`

- **A-08-13** — The acorde/arpegio segmented control and the marco button appear in the top bar when in harmony view, and no longer overlap the staff canvas.
  - Validation method: `manual`

- **A-08-14** — With `subview === 'tonnetz'` (the default), the harmony view is visually identical to the Phase 07 delivery (Tonnetz visible, staff not visible). The register mode toggle has no visible effect in Tonnetz subview.
  - Validation method: `manual`

## Partial coverage from prior phase

- A-07-08 (IMPL-verified, placement) → addressed by A-08-10 and A-08-11 in this phase.
- A-07-09 (IMPL-verified, voice register) → addressed by A-08-02, A-08-03, A-08-09 in this phase.
- A-07-11 (IMPL-verified, cyclic playhead + strip cursor missing) → addressed by A-08-08 and A-08-12 in this phase.
- A-07-12 (IMPL-verified, widget overlap) → addressed by A-08-13 in this phase.

## ADR Triggers

- **ADR 0011 amendment (central staff + register mode)** — Trigger: step 08.2 (after Pilot inventory approval). Amends ADR 0011 in place; no new ADR number needed.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v2/handoffs/phase-08-handoff.md`. See `handoff-template.md`.
