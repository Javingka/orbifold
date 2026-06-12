# Phase 07 Handoff — Linear harmony view

---

## Step 07.1 — Inventory

**Date:** 2026-06-11
**Commit(s):**

- **Terminal commit:** `docs(harmony): Phase 07 step 07.1 — phase-07 inventory`
  - Hash: self-referential — not recorded

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/handoffs/phase-06-handoff.md` (phase completion entry), `docs/orbifold-v2/phases/phase-07.md`.
- Read all source files named in step 07.1 PROMPT:
  - `src/core/harmony/voice-tracks.ts` (complete — 195 lines)
  - `src/core/harmony/staff-map.ts` (complete — 175 lines)
  - `src/core/harmony/time-map.ts` (complete — 110 lines)
  - `src/state/session.ts` lines 1–200 (Chord, RestSlot, ProgressionSlot, HarmonyState, barsLabel)
  - `src/state/phase-anchor.ts` (complete — 85 lines)
  - `src/render/stage.ts` (complete — 205 lines)
  - `src/render/theme.ts` (complete — 40 lines)
  - `src/render/rhythm-scene.ts` lines 1–110 (module-level pattern, LayerGeo)
  - `src/app/App.svelte` (complete — 591 lines)
  - `src/app/app.css` lines 1–50 (CSS custom properties)
  - `src/ui/HarmonyControls.svelte` (complete — 139 lines)
- Confirmed test count: 329 passing (11 test files) — matches Phase 06 completion entry.
- Produced `docs/orbifold-v2/inventories/phase-07-inventory.md`.
- No source code written.

### Key confirmed values

| Item | Value | Source |
|---|---|---|
| `PX_PER_CYCLE` | `48` | `time-map.ts:42` |
| `cycleToPosition(idx, _, 'linear')` return | `{ mode: 'linear', x: idx * 48 }` | `time-map.ts:101` |
| `TREBLE_STAFF_LINES` | `[2, 4, 6, 8, 10]` | `staff-map.ts:24` |
| `STAFF_BOTTOM` | `2` | `staff-map.ts:27` |
| `STAFF_TOP` | `10` | `staff-map.ts:30` |
| `noteToStaffPosition(note)` return | `{ steps, accidental, ledgerLines }` | `staff-map.ts:165–175` |
| `computeVoiceTracks` signature | `(ChordInput | RestInput)[], octave: number` | `voice-tracks.ts:102–104` |
| `VoiceRestEvent` discriminant | `'isRest' in event` | `voice-tracks.ts:33` |
| `VoiceTrack.voiceIndex` | `0 | 1 | 2` | `voice-tracks.ts:42` |
| `getVisualPhaseAnchor()` return | `number` (ms timestamp) | `phase-anchor.ts:19` |
| Phase anchor to playhead pattern | `((now - anchor) / barMs) * PX_PER_CYCLE` | rhythm-scene pattern |
| `getStageRefs()` includes | hGrid, hPath, hNodes, hDyn, hLabels, hNRG, hNRL, rRings, rDyn, rLabels, app | `stage.ts:156–168` |
| `harmonyLayer` in getStageRefs | NOT present — module-level let only | `stage.ts:15` |
| `setView('harmony')` effect | `harmonyLayer.visible = true; rhythmLayer.visible = false` | `stage.ts:138–141` |
| `registerTicker` pattern | Single `app.ticker.add` dispatcher in `tonnetz-scene.ts` | `tonnetz-scene.ts:702–711` |
| `HarmonyControls` position | `position:absolute; left:16px; bottom:46px; z-index:3` | `HarmonyControls.svelte:85–98` |
| `barsLabel` exported | Yes, from `session.ts:112` | `session.ts:112` |
| Voice 0 color | `COL.tonic = 0xf3b15a` | `theme.ts:15` + phase-07 pilot decision |
| Voice 1 color | `COL.subdom = 0x56cfc4` | `theme.ts:16` + phase-07 pilot decision |
| Voice 2 color | `COL.dom = 0xe87bac` | `theme.ts:17` + phase-07 pilot decision |
| Current test count | 329 | `pnpm exec vitest run` |

### Critical notes for subsequent steps

**Step 07.2 (`src/core/harmony/staff-layout.ts` + tests):**
1. `computeStaffLayout(tracks, pxPerCycle)` takes a `VoiceTrack[]` (3 items) and `pxPerCycle: number` (caller passes `PX_PER_CYCLE`). It must NOT hardcode 48.
2. For each track's events, dispatch on `'isRest' in event`: `VoiceEvent` → `NoteHead`; `VoiceRestEvent` → `RestGlyph`.
3. `NoteHead.x = event.startCycle * pxPerCycle`. `RestGlyph.x = event.startCycle * pxPerCycle`.
4. `NoteHead.stepY = noteToStaffPosition(event.noteName).steps` (diatonic step).
5. `NoteHead.ledgerLines = noteToStaffPosition(event.noteName).ledgerLines`.
6. `NoteHead.accidental = noteToStaffPosition(event.noteName).accidental`.
7. `totalWidth = max over all events of (event.startCycle + event.bars) * pxPerCycle`. Empty → `0`.
8. No color in `NoteHead` / `RestGlyph` — colors are a render concern.
9. No DOM/PIXI/Svelte imports.

**Step 07.3 (`src/render/harmony-staff-scene.ts`):**
1. `stage.ts` must expose `harmonyLayer` — add `harmonyLayer: PIXI.Container` to `StageRefs` and `getStageRefs()` return. The spec says "do not add new layers to stage.ts"; this only exposes an existing container, not a new one.
2. The staff scene's PIXI objects are `addChild`-ed to `harmonyLayer` (after existing children). When `harmonyLayer.visible = false` (rhythm view), all staff scene objects are hidden automatically.
3. Playhead x-formula: `(performance.now() - getVisualPhaseAnchor()) / barMs * PX_PER_CYCLE` where `barMs = (60000 / state.bpm) * 4`. This matches the rhythm-scene phase computation.
4. `staffBaseY` starting value: `app.screen.height − 60`. Gives C4 at 60 px from bottom; five staff lines (E4–F5) above that; ledger lines for C3–G3 voicings fill the space from step −7 to step 2 (9 diatonic steps × 5 px/step = 45 px below E4 line).
5. `STEP_PX = 10` → each diatonic step = 5 px vertically (`STEP_PX / 2`).
6. `tickHarmonyStaff` should internally check `get(sessionStore).view === 'harmony'` and early-return if not in harmony view (matching the spec and the internal guard pattern).
7. Staff scene must be re-created on resize (called from `onResize` in App.svelte).

**Step 07.4 (`App.svelte` integration):**
1. Import `buildHarmonyStaffScene`, `updateHarmonyStaffDynamic`, `tickHarmonyStaff` from `../render/harmony-staff-scene.js`.
2. Call `buildHarmonyStaffScene` after `buildTonnetz` in `onMount` (after the `requestAnimationFrame` wait).
3. Add to `onResize` callback.
4. Add `updateHarmonyStaffDynamic(state)` in the store subscription.
5. Register ticker via `app.ticker.add(tickHarmonyStaff)` — `registerTicker` in `tonnetz-scene.ts` is a dispatcher for `tickHarmony`/`tickRhythm`; adding a second ticker directly via `app.ticker.add` is the correct pattern for a parallel scene.
6. Add change detection: `prevProgressionLength` and `prevOctave`; rebuild on change.

### Files touched

- `docs/orbifold-v2/inventories/phase-07-inventory.md` — created
- `docs/orbifold-v2/handoffs/phase-07-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory step only).

### Routine validations

No source code written; no build/test/lint runs required for this step. Test count confirmed: 329 passing.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-07-01 | `computeStaffLayout` empty progression → `{ noteHeads: [], restGlyphs: [], totalWidth: 0 }` | `tests/harmony/staff-layout.test.ts` | unit | not covered — deferred to step 07.2 |
| A-07-02 | Single C-major chord at octave 3 → 3 note-heads at x=0, stepY matching noteToStaffPosition | `tests/harmony/staff-layout.test.ts` | unit | not covered — deferred to step 07.2 |
| A-07-03 | Mixed [C maj, rest, A min] → note-heads x=0, rest x=48, note-heads x=96; totalWidth=192 | `tests/harmony/staff-layout.test.ts` | unit | not covered — deferred to step 07.2 |
| A-07-04 | Sharp-containing chord → NoteHead with accidental='#' | `tests/harmony/staff-layout.test.ts` | unit | not covered — deferred to step 07.2 |
| A-07-05 | Below-staff chord (e.g. C3) → NoteHead with non-empty ledgerLines | `tests/harmony/staff-layout.test.ts` | unit | not covered — deferred to step 07.2 |
| A-07-06 | No pixi/svelte/DOM imports in src/core/harmony/ | grep | proxy:static-analysis | not covered — deferred to step 07.5 |
| A-07-07 | tsc 0, lint 0, pnpm test ≥ 340, build 0 | all | automated | not covered — deferred to step 07.5 |
| A-07-08 | Five staff lines visible in PIXI canvas with treble clef glyph | manual | manual | not covered — deferred to step 07.3/07.4 |
| A-07-09 | Colored note-heads at correct positions, per-voice colors, ledger lines | manual | manual | not covered — deferred to step 07.3/07.4 |
| A-07-10 | Rest glyphs at correct x-positions; no note-head for rest slots | manual | manual | not covered — deferred to step 07.3/07.4 |
| A-07-11 | White playhead advances, aligned with ProgressionStrip cursor | live-system | live-system | not covered — deferred to step 07.4/07.5 |
| A-07-12 | Sharp accidentals drawn left of note-head; natural notes show no accidental | manual | manual | not covered — deferred to step 07.3/07.4 |

### Decisions made (if any)

None — inventory step only. All design decisions (voice colors, staff layout region) are pre-resolved by the Pilot in the phase spec.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 329 tests passing (unchanged from Phase 06 close).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged).
- No source code changed.

### Next-step context

Step 07.2 writes `src/core/harmony/staff-layout.ts` (pure engine) and `tests/harmony/staff-layout.test.ts`. The engine takes `VoiceTrack[]` from `computeVoiceTracks` and produces `StaffLayout` with `NoteHead[]`, `RestGlyph[]`, and `totalWidth`. No render code.

**Next action:** Planner review of step 07.1. After APPROVE, Dev proceeds to step 07.2.

---

## Step 07.2 — Staff layout engine (`src/core/harmony/staff-layout.ts`) + tests

**Date:** 2026-06-12
**Commit(s):**

- **Terminal commit:** `feat(harmony): Phase 07 step 07.2 — staff-layout engine and tests`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit.

**Iteration:** 1 of 5

### Completed

- Wrote `src/core/harmony/staff-layout.ts` — pure TypeScript engine, no DOM/PIXI/Svelte imports. AGPL-3.0 header present.
- Exported `NoteHead`, `RestGlyph`, `StaffLayout` interfaces per spec.
- Exported `computeStaffLayout(tracks: VoiceTrack[], pxPerCycle: number): StaffLayout`.
- The function iterates `tracks[v].events` for all three voices, dispatching on `'isRest' in event` to produce `NoteHead` or `RestGlyph`. `voiceIndex` comes from `track.voiceIndex`.
- `x = event.startCycle * pxPerCycle` for both note-heads and rest-glyphs.
- `stepY`, `accidental`, `ledgerLines` come from `noteToStaffPosition(event.noteName)`.
- `totalWidth = max(startCycle + bars) * pxPerCycle` over all events; 0 for empty input.
- No per-voice color in `NoteHead` or `RestGlyph`; colors are a render-layer concern (step 07.3).
- `pxPerCycle` is a parameter; 48 is not hardcoded (vigent coordination-point rule).
- Wrote `tests/harmony/staff-layout.test.ts` with 32 tests covering all 5 unit acceptance criteria.

### Files touched

- `src/core/harmony/staff-layout.ts` — created
- `tests/harmony/staff-layout.test.ts` — created
- `docs/orbifold-v2/handoffs/phase-07-handoff.md` — step 07.2 entry appended

### Validation evidence (per Acceptance ID)

- **A-07-01:** `computeStaffLayout(computeVoiceTracks([], 3), 48)` → `{ noteHeads: [], restGlyphs: [], totalWidth: 0 }` — asserted as `toEqual`. Test passes.
- **A-07-02:** `computeStaffLayout(computeVoiceTracks([{rootPc:0, qual:'maj'}], 3), 48)` → 3 note-heads at x=0, stepY matches `noteToStaffPosition('C3').steps`, `noteToStaffPosition('E3').steps`, `noteToStaffPosition('G3').steps`; bars=1; totalWidth=48. Tests pass.
- **A-07-03:** `computeStaffLayout` for `[C major bars:1, rest bars:1, A minor bars:2]` → 6 note-heads, 3 rest-glyphs; chord-0 at x=0, rest-glyphs at x=48, chord-2 at x=96; totalWidth=192. Tests pass.
- **A-07-04:** `computeStaffLayout` for D major (rootPc=2) at octave 3 → voice-1 (F#3) has `accidental='#'`; D3 and A3 have `accidental=''`. Test passes.
- **A-07-05:** `computeStaffLayout` for C major at octave 3 → voice-0 (C3) has `ledgerLines=[0,-2,-4,-6]`, voice-1 (E3) `ledgerLines=[0,-2,-4]`, voice-2 (G3) `ledgerLines=[0,-2]`; all non-empty; E4 note-head has empty ledgerLines. Tests pass.

### Routine validations

- `pnpm exec tsc --noEmit` → 0 errors
- `pnpm lint` → 0 errors (eslint + prettier)
- `pnpm exec vitest run tests/harmony/staff-layout.test.ts` → 32 passed
- `pnpm test` → 361 passed (329 prior + 32 new)
- `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` → 0 matches

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-07-01 | `computeStaffLayout` empty progression → `{ noteHeads: [], restGlyphs: [], totalWidth: 0 }` | `tests/harmony/staff-layout.test.ts` | unit | covered |
| A-07-02 | Single C-major chord at octave 3 → 3 note-heads at x=0, stepY values match `noteToStaffPosition` | `tests/harmony/staff-layout.test.ts` | unit | covered |
| A-07-03 | Mixed `[C maj bars:1, rest bars:1, A min bars:2]` → note-heads x=0, rest x=48, note-heads x=96; totalWidth=192 | `tests/harmony/staff-layout.test.ts` | unit | covered |
| A-07-04 | Sharp-containing chord (D major/F#3) → `NoteHead.accidental='#'` for that voice | `tests/harmony/staff-layout.test.ts` | unit | covered |
| A-07-05 | Below-staff chord (C3 voicing) → `NoteHead.ledgerLines` non-empty, matching `noteToStaffPosition` | `tests/harmony/staff-layout.test.ts` | unit | covered |
| A-07-06 | No pixi/svelte/DOM imports in `src/core/harmony/` | grep | proxy:static-analysis | covered — grep returns 0 matches |
| A-07-07 | tsc 0, lint 0, pnpm test ≥ 340, build 0 | all | automated | partial — tsc/lint/test confirmed (361 ≥ 340); build deferred to step 07.3+ (no render code yet) |
| A-07-08 | Five staff lines visible in PIXI canvas with treble clef glyph | manual | manual | not covered — deferred to step 07.3/07.4 |
| A-07-09 | Colored note-heads at correct positions, per-voice colors, ledger lines | manual | manual | not covered — deferred to step 07.3/07.4 |
| A-07-10 | Rest glyphs at correct x-positions; no note-head for rest slots | manual | manual | not covered — deferred to step 07.3/07.4 |
| A-07-11 | White playhead advances, aligned with ProgressionStrip cursor | live-system | live-system | not covered — deferred to step 07.4/07.5 |
| A-07-12 | Sharp accidentals drawn left of note-head; natural notes show no accidental | manual | manual | not covered — deferred to step 07.3/07.4 |

**Proxy disclosures (A-07-06):** `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` — checked all four files in `src/core/harmony/` (staff-layout.ts, staff-map.ts, time-map.ts, voice-tracks.ts); returns 0 matches.

### Decisions made (if any)

None — the engine design follows directly from the spec and the ADRs.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 361 tests passing (329 prior + 32 new staff-layout tests).
- `tsc --noEmit` and `pnpm lint` exit 0.
- `pnpm build` not re-run in this step (no render code added; prior state is clean from step 07.1).
- No source files changed outside `src/core/harmony/`.

### Next-step context

Step 07.3 writes `src/render/harmony-staff-scene.ts` — the PIXI rendering layer that consumes `computeStaffLayout`. Key points from this step:
1. `StaffLayout` output shape is `{ noteHeads: NoteHead[], restGlyphs: RestGlyph[], totalWidth: number }`.
2. `NoteHead` carries: `voiceIndex`, `x`, `stepY`, `accidental`, `ledgerLines`, `bars`.
3. `RestGlyph` carries: `voiceIndex`, `x`, `bars`.
4. `totalWidth` is the pixel width of the full timeline.
5. `pxPerCycle` must be imported from `time-map.ts` as `PX_PER_CYCLE`; it is NOT hardcoded in `staff-layout.ts`.
6. `stage.ts` must expose `harmonyLayer` via `getStageRefs()` (add `harmonyLayer: PIXI.Container` to `StageRefs` and return value).

**Next action:** Planner review of step 07.2. After APPROVE, Dev proceeds to step 07.3.
