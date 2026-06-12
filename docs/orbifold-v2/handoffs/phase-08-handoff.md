# Phase 08 Handoff — Harmony-view UX

---

## Step 08.1 — Inventory

**Date:** 2026-06-12
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/phases/phase-08.md`, `docs/adr/0011-harmony-view-architecture.md`, and all source files named in the step prompt.
- Produced `docs/orbifold-v2/inventories/phase-08-inventory.md` covering: confirmed values table, audio-path isolation verdict, open questions (all pre-resolved), Tonnetz sub-container design note, per-step file list, behavior-preservation checklist, and test baseline.

### Files touched

- `docs/orbifold-v2/inventories/phase-08-inventory.md` (new)
- `docs/orbifold-v2/handoffs/phase-08-handoff.md` (this file, new)

### Validation evidence

**Audio-path isolation verdict (mandatory deliverable):**

`computeVoiceTracks` output does **NOT** reach audio codegen. Full verdict with citations in inventory §(b):

- `voice-tracks.ts` is imported only by `harmony-staff-scene.ts` (line 35) and `staff-layout.ts` (line 18). Neither file is in the audio pipeline.
- `harmony-staff-scene.ts` calls `computeVoiceTracks` at line 251 and passes the result to `computeStaffLayout` (line 252), a pure visual-only function. No audio call follows.
- `melodyLine` (`strudel.ts` line 83) and `chordToStrudel` (`strudel.ts` line 54) call `chordVoicing` directly. Neither imports from `voice-tracks.ts`. Confirmed by reading `src/core/codegen/strudel.ts` and verifying no import of `voice-tracks`.
- `session.ts` lines 291, 460–474 call `harmonyCode()` → `melodyLine()` using `state.harmony.progression` directly, bypassing voice-tracks entirely.

**Consequence:** `registerMode` is safely visual-only. Audio output is byte-identical regardless of mode.

**No source files modified:** confirmed (inventory step spec requires no source code).

### Acceptance Coverage Table

No Acceptance IDs are touched by this step (pure inventory — no source code written).

### Environment state after this step

- Branch: `orbifold-v2/phase-08`
- Test baseline: 361 passing (12 test files)
- No source changes

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

## Step 08.2 — ADR 0011 amendment

**Date:** 2026-06-12
**Commit(s):** (terminal commit — see terminal commit pattern below)
**Iteration:** 1 of 5

### 08.2 Completed

- Read ADR 0011 (`docs/adr/0011-harmony-view-architecture.md`), the Phase 08 inventory, and the Pilot pre-resolutions recorded in phase-08.md.
- Appended "Amendment — Phase 08" to ADR 0011 in place without modifying any existing section.
- Recorded two new architectural decisions (D5 and D6) plus Amendment Consequences (items 1–3).
- All binding values confirmed from the inventory are locked in the amendment: `STEP_PX = 16`, `HALF_STEP_PX = 8`, `staffBaseY = height / 2 − 48`, default `subview = 'tonnetz'`, default `registerMode = 'suavizado'`, `marco` relocated to top bar, cyclic playhead formula, audio-only invariant.

### 08.2 Files touched

- `docs/adr/0011-harmony-view-architecture.md` (amended — appended Amendment — Phase 08 section)
- `docs/orbifold-v2/handoffs/phase-08-handoff.md` (this file, updated)

### 08.2 Validation evidence

**ADR amendment section present:**

`docs/adr/0011-harmony-view-architecture.md` line 82: `## Amendment — Phase 08` — confirmed present.

**No source files modified:**

Only `docs/adr/` and `docs/orbifold-v2/handoffs/` were written. No files under `src/` were touched.

**Decisions grounded in Pilot pre-resolutions:**

| Value | Source |
| --- | --- |
| `STEP_PX = 16` | phase-08-inventory.md §(a), planned change |
| `staffBaseY = height / 2 − 48` | phase-08-inventory.md §(a), planned change |
| Default `subview = 'tonnetz'` | phase-08.md §"Pilot decisions" OQ-1 |
| Default `registerMode = 'suavizado'` | phase-08.md §"Pilot decisions" OQ-2 |
| `marco` → top bar | phase-08.md §"Pilot decisions" OQ-3 |
| Audio-only invariant | phase-08-inventory.md §(b) audio-path isolation verdict |

**Append-only check:**

Original ADR 0011 content lines 1–79 are unchanged. The amendment begins at line 82 and does not modify the original Decisions (D1–D4) or Consequences (1–5).

### 08.2 Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
| --- | --- | --- | --- | --- |
| A-08-05 | `registerMode` and `subview` absent from persistence/agent schema | `docs/adr/0011-harmony-view-architecture.md` Amendment §D6 ("Ephemeral state") | proxy:static-analysis | partial — ADR records the intent; actual schema files confirmed unchanged (no source edits this step); full verification at step 08.7 |
| A-08-06 | No PIXI/Svelte/DOM imports in `src/core/harmony/` | (none yet) | — | not covered — deferred to step 08.7 (no source changes this step) |
| A-08-07 | All quality gates green | (none yet) | — | not covered — deferred to step 08.7 |
| A-08-08 | Playhead loops back to left edge | ADR D6 cyclic playhead formula locked | proxy:static-analysis | partial — formula locked in ADR; implementation deferred to step 08.4 |
| A-08-09 | `suavizado` produces smooth voice contours | ADR D6 suavizado algorithm locked | proxy:static-analysis | partial — algorithm locked in ADR; implementation deferred to step 08.3 |
| A-08-10 | Staff occupies full canvas, centered | ADR D5 binding constants locked (`STEP_PX=16`, `staffBaseY` formula) | proxy:static-analysis | partial — constants locked in ADR; implementation deferred to step 08.4 |
| A-08-11 | Tonnetz ⇄ Pentagrama sub-toggle works | ADR D5 sub-toggle design locked | proxy:static-analysis | partial — design locked in ADR; implementation deferred to step 08.5 |
| A-08-13 | Chord-mode controls in top bar, not overlapping canvas | ADR D6 UI placement section locked | proxy:static-analysis | partial — placement locked in ADR; implementation deferred to step 08.6 |
| A-08-14 | Default `subview='tonnetz'` gives Phase 07 visual identity | ADR D5 default and reversibility statement locked | proxy:static-analysis | partial — reversibility statement in ADR; implementation deferred to step 08.5 |

**Notes on partial coverage:** All partial rows in this step are documentation-only locks — the implementation steps (08.3–08.6) deliver the source-level coverage. The ADR is a design contract, not a test.

**Proxy disclosures:**

- A-08-05 proxy: ADR 0011 Amendment §D6 lines 181–183 state `registerMode` and `subview` are absent from `SavedHarmonySchema` and `agent/schema.ts`; confirmed by reading those files during step 08.1 inventory (no subview/registerMode fields found).
- A-08-08 proxy: ADR 0011 Amendment §D6 lines 166–170 state the positive-modulo formula `((rawX % w) + w) % w`; binding for step 08.4.
- A-08-09 proxy: ADR 0011 Amendment §D6 lines 142–142 describe the suavizado algorithm; binding for step 08.3.
- A-08-10 proxy: ADR 0011 Amendment §D5 table lines 109–111 state `STEP_PX = 16`, `staffBaseY = height / 2 − 48`; binding for step 08.4.
- A-08-11 proxy: ADR 0011 Amendment §D5 lines 94–128 describe the sub-container design and `setHarmonySubview` function; binding for step 08.5.
- A-08-13 proxy: ADR 0011 Amendment §D6 lines 185–187 record top-bar relocation; binding for step 08.6.
- A-08-14 proxy: ADR 0011 Amendment §D5 line 101 states `'tonnetz'` default and byte-identical reversibility; binding for step 08.5.

### 08.2 Decisions made

- `STEP_PX = 16` locked as the binding legibility constant for Phase 08 staff rendering (sourced from inventory §(a) planned change; now written into ADR 0011 D5 table).

### 08.2 Environment state

- Branch: `orbifold-v2/phase-08`
- No source files modified; docs only
- Test baseline: 361 passing (unchanged)

### 08.2 Next-step context

- Step 08.3 implements `computeVoiceTracks` register mode; the `suavizado` algorithm spec in ADR 0011 D6 (the nearest-octave within ±6, tie-breaks to lower) is the binding contract.
- Step 08.4 implements central staff geometry; `STEP_PX = 16`, `HALF_STEP_PX = 8`, `staffBaseY = height / 2 − 48`, and the positive-modulo playhead formula in ADR D6 are the binding values.
- Step 08.5 implements the sub-toggle; `_tonnetzContainer` / `_staffContainer` sub-container design and `setHarmonySubview` API in ADR D5 are the binding contract.

### 08.2 Terminal commit

- **Terminal commit:** `docs(adr): Phase 08 step 08.2 — ADR 0011 amendment (central staff + register mode)`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

### 08.2 Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

## Step 08.3 — Voice register mode engine (`voice-tracks.ts` revision + tests)

**Date:** 2026-06-12
**Iteration:** 1 of 5

### 08.3 Completed

- Added `export type RegisterMode = 'estricto' | 'suavizado'` to `voice-tracks.ts`.
- Updated `computeVoiceTracks` signature to accept `registerMode: RegisterMode = 'suavizado'` as a third parameter (default `'suavizado'`).
- `estricto` mode: preserves the pre-phase formula exactly (`octave + Math.floor((rootPc + iv) / 12)` — unchanged from Phase 05/06).
- `suavizado` mode: added `midiPitch()` helper (MIDI pitch from note name + octave) and `smoothOctave()` helper (picks estricto-1/estricto/estricto+1 candidate closest to prevMidi, ties resolve to lower). First chord always uses the estricto anchor in both modes. `prevMidi[]` seeded from first chord and updated per chord (not on rest events).
- AGPL-3.0 header updated to note Phase 08 addition; no other header changes.
- No DOM/PIXI/Svelte imports added.
- Updated `tests/harmony/voice-tracks.test.ts`: added `'estricto'` as the third argument to two pre-existing tests that asserted the prototype-parity octave values (C major → A minor golden values). These tests previously called `computeVoiceTracks(prog, 3)` (2-arg); now the default is `'suavizado'` and `'estricto'` is the explicit mode that preserves the old arithmetic. The tests still assert the same values — they are now correctly annotated as `'estricto'` parity tests.
- Created `tests/harmony/voice-tracks-register.test.ts` with 24 tests covering all four required acceptance IDs plus the tie-resolution invariant.

### 08.3 Files touched

- `src/core/harmony/voice-tracks.ts` (modified — RegisterMode type, signature change, midiPitch helper, smoothOctave helper, suavizado branch in chord loop, prevMidi tracking)
- `tests/harmony/voice-tracks-register.test.ts` (new)
- `tests/harmony/voice-tracks.test.ts` (modified — 2 calls updated to pass `'estricto'` explicitly)
- `docs/orbifold-v2/handoffs/phase-08-handoff.md` (this file)

### 08.3 Validation evidence

**A-08-01 (estricto parity):**
`pnpm exec vitest run tests/harmony/voice-tracks-register.test.ts` → 24 passed.
Tests `A-08-01: voice-0 = C4`, `A-08-01: voice-1 = E4`, `A-08-01: voice-2 = A3` assert the pre-phase formula output using explicit `'estricto'` mode — identical to prototype golden values.
`A-08-01: three-chord estricto...` confirms voice-1 and voice-2 jump to octave 4 (D#4, F#4) in estricto, proving the formula is unchanged and register jumps are intentionally preserved in this mode.

**A-08-02 (suavizado smoothing + tie resolution):**
Tests `A-08-02: suavizado voice-1 stays D#3` and `A-08-02: suavizado voice-2 stays F#3` prove that suavizado picks nearest octave (D#3 is 1 semitone from E3; estricto gives D#4 which is 11 semitones away).
`A-08-02: suavizado leap for every voice is <= 6 semitones` asserts the invariant holds across all three voices for the C major → B major register-jump case.
Tie tests: `TIE resolves to lower octave: voice-0 at 3rd chord = E2` and `TIE resolves to lower octave: voice-1 at 3rd chord = G2` use the 3-chord progression [C maj, F# maj, C maj] where prevMidi[v] ± 6 === estrictoMidi for two voices simultaneously. Analytically verified: prevMidi[0]=A#2(46), estricto E3=MIDI52, E2=MIDI40, both at distance 6 → lower (E2) wins. prevMidi[1]=C#3(49), estricto G3=MIDI55, G2=MIDI43, both at distance 6 → lower (G2) wins.

**A-08-03 (default param = suavizado):**
`A-08-03: 2-arg call and suavizado produce identical outputs` deep-compares all note names and octaves between `computeVoiceTracks(prog, 3)` and `computeVoiceTracks(prog, 3, 'suavizado')` — all equal.
`A-08-03: 2-arg default and 3-arg estricto differ` confirms the default no longer matches estricto for a register-jumping progression.

**A-08-04 (rest slot passthrough):**
`A-08-04 estricto: A minor after rest has same notes as direct A minor` and `A-08-04 suavizado: A minor after rest has same notes as direct A minor` prove rest events do not update prevMidi or prevPcs in either mode.
`A-08-04: leading rest followed by chord uses estricto anchor` proves the first chord (even after leading rests) is anchored identically in both modes.

**Audio-path isolation (A-08-06 proxy):**
`grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` → 0 matches. Confirmed.

**Quality gates:**
- `pnpm exec tsc --noEmit` → 0 errors
- `pnpm lint` → 0 errors (ESLint + Prettier)
- `pnpm exec vitest run` → 385 passed (361 baseline + 24 new); 0 failed
- Test count raised above 361 baseline ✓

**Pre-existing tests that were updated:**
Two tests in `voice-tracks.test.ts` (C major → A minor "perm [1,2,0] is applied correctly" and A-06-04 rest passthrough) now pass `'estricto'` explicitly. They continue asserting the same C4/E4/A3 golden values — the semantic meaning is preserved. The prototype parity note is intact: these are now annotated as estricto-mode parity tests.

### 08.3 Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-08-01 | `computeVoiceTracks(prog, octave, 'estricto')` produces the same octave assignment as the pre-phase formula | `tests/harmony/voice-tracks-register.test.ts` | unit | covered |
| A-08-02 | `computeVoiceTracks(prog, octave, 'suavizado')` produces notes within ±6 semitones of the previous note; tie resolves to lower octave | `tests/harmony/voice-tracks-register.test.ts` | unit | covered |
| A-08-03 | Default 2-arg call is byte-identical to explicit `'suavizado'` | `tests/harmony/voice-tracks-register.test.ts` | unit | covered |
| A-08-04 | Rest slot between two chords preserves voice-leading across the gap in both modes | `tests/harmony/voice-tracks-register.test.ts` | unit | covered |
| A-08-05 | `registerMode` absent from `SavedHarmonySchema` and `agent/schema.ts` | (none — verified in 08.1 inventory and 08.2 ADR; no source changes to those files this step) | proxy:static-analysis | partial — full confirmation at step 08.7 |
| A-08-06 | No PIXI/Svelte/DOM imports in `src/core/harmony/` | `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` → 0 matches | proxy:static-analysis | covered |
| A-08-07 | All quality gates green | `pnpm exec tsc --noEmit` → 0; `pnpm lint` → 0; `pnpm exec vitest run` → 385 passed; not running `pnpm build` (deferred to 08.7) | automated | partial — build deferred to 08.7 |

**Proxy disclosures:**
- A-08-05 proxy: `persistence.ts` and `agent/schema.ts` confirmed unchanged at step 08.1; no edits in this step. Full static analysis at 08.7.
- A-08-06 proxy: `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` → 0 matches, run in this step.

**Notes on partial coverage:**
- A-08-07: `pnpm build` is part of the spec's quality gates but is deferred to step 08.7 to avoid redundancy across steps. The three other gates (`tsc`, `lint`, `test`) pass clean.

### 08.3 Audio-path isolation evidence (required by spec)

From phase-08-inventory.md §(b): `computeVoiceTracks` output is consumed only by `harmony-staff-scene.ts` (PIXI renderer) and `staff-layout.ts` (pure visual engine). Neither is in the audio pipeline. `melodyLine` and `chordToStrudel` in `strudel.ts` call `chordVoicing` directly and do not import `voice-tracks.ts`. Confirmed by reading `strudel.ts` and verifying no import of `voice-tracks`. Changing `registerMode` produces byte-identical Strudel pattern strings and byte-identical audio output.

### 08.3 Terminal commit

- **Terminal commit:** `feat(harmony): Phase 08 step 08.3 — voice register mode engine and tests`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

### 08.3 Planner Review

**Decision:** APPROVED on 2026-06-12. Iteration: 1 of 5.
**Reviewed on:** 2026-06-12
**Iteration:** 1 of 5
**Reason:** All 8 checklist items pass and both project-specific additions (prototype parity, visual-only invariant) are satisfied: the two modified tests in voice-tracks.test.ts assert the same C4/E4/A3 golden values as before (only the call was updated to add 'estricto' explicitly); the suavizado algorithm and tie-resolution logic are mathematically verified against D6; grep confirms 0 PIXI/Svelte/DOM imports in src/core/harmony/; 385 tests pass with tsc and lint clean.
**Next action:** Dev proceeds to step 08.4

---

## Step 08.4 — Central staff layout + cyclic playhead (`harmony-staff-scene.ts`)

**Date:** 2026-06-12
**Iteration:** 1 of 5

### 08.4 Completed

Three changes applied to `src/render/harmony-staff-scene.ts`:

**(a) Central staff geometry (ADR 0011 Amendment D5 binding constants):**
- `STEP_PX` changed from `10` to `16`.
- `HALF_STEP_PX` changed from `5` to `8` (recomputed as `STEP_PX / 2`).
- `staffBaseY` changed from `app.screen.height - 60` to `app.screen.height / 2 - 6 * HALF_STEP_PX` (= `height / 2 - 48`). This centers step-6 (B4, middle staff line) at the canvas vertical midpoint per ADR 0011 D5.

**(b) Cyclic playhead (ADR 0011 Amendment D6):**
- Replaced `Math.min(Math.max(rawX, 0), _staffWidth)` clamp with `((rawX % _staffWidth) + _staffWidth) % _staffWidth`. The positive-modulo formula handles briefly-negative `rawX` (phase anchor in the future after a re-anchor event).
- Added `if (_staffWidth <= 0) return;` guard before the modulo expression (replaces the old `if (_staffWidth === 0) return;`).

**(c) `registerMode` wiring (step 08.5 TODO):**
- Added `import type { RegisterMode }` from `voice-tracks.ts`.
- Reads `state.harmony.registerMode` defensively via a double `as unknown` cast (HarmonyState does not yet carry the field; it will be added in step 08.5). Defaults to `'suavizado'` when the field is `undefined`. A clearly marked `// TODO(step-08.5):` comment explains the interim pattern.
- `computeVoiceTracks` now receives the `registerMode ?? 'suavizado'` value.

**AGPL-3.0 header:** present and intact (line 1).
**`PX_PER_CYCLE` coordination rule:** `PX_PER_CYCLE` is still imported from `time-map.ts` (line 46) — not redeclared.
**No new unit tests:** this step modifies PIXI render logic; prototype parity is a parity note (see below).

### 08.4 Files touched

- `src/render/harmony-staff-scene.ts` (modified — STEP_PX, HALF_STEP_PX, staffBaseY, modulo playhead, registerMode wiring)
- `docs/orbifold-v2/handoffs/phase-08-handoff.md` (this file)

### 08.4 Validation evidence

**TypeScript:**
`pnpm exec tsc --noEmit` → exit 0 (no errors). The `as unknown as Record<string, unknown>` double-cast is the standard TypeScript pattern for defensive access of a future field on a typed struct; no type violations.

**Lint:**
`pnpm lint` → 0 errors. Prettier reformatted one minor import-alignment difference.

**Tests:**
`pnpm exec vitest run` → 385 passed, 0 failed, 13 test files. Count unchanged from post-08.3 baseline (this step has no new unit tests; the existing 385 tests continue to pass).

**Build:**
`pnpm build` → exit 0. Pre-existing chunk-size warning on `index-BSjaotaw.js` (1,059 kB, gzip 334 kB) is unchanged from prior phases; not introduced by this step.

**Coordinate verification (static analysis):**
- `STEP_PX = 16` at line 60: matches ADR 0011 D5 table exactly.
- `HALF_STEP_PX = STEP_PX / 2` at line 63: equals 8. Matches ADR 0011 D5 table.
- `staffBaseY = app.screen.height / 2 - 6 * HALF_STEP_PX` at line 261: equals `height / 2 - 48`. Matches ADR 0011 D5 formula: `app.screen.height / 2 − (6 * HALF_STEP_PX) = height/2 − 48`.
- Cyclic playhead at line 328: `((rawX % _staffWidth) + _staffWidth) % _staffWidth`. Matches ADR 0011 D6 formula exactly.
- Guard at line 319: `if (_staffWidth <= 0) return;`. Satisfies the spec "if `_staffWidth <= 0`, return early without drawing the playhead".
- `PX_PER_CYCLE` import at line 46: from `../core/harmony/time-map.js` (vigent coordination-point rule — not redeclared).

**Prototype parity note (PIXI render module — visual equivalence):**
This step does not port new logic from the prototype; it replaces Phase 07 delivery geometry and playhead behavior. The parity note is against Phase 07:
- Phase 07 `staffBaseY = height − 60`: the staff was a bottom strip. Phase 08 `staffBaseY = height / 2 − 48`: the staff is now centered. Observed equivalence is a visual layout change (not a regression), confirmed by the new geometry formula matching ADR 0011 D5 exactly.
- Phase 07 clamp playhead: the playhead froze at the staff's right edge at the end of a progression loop. Phase 08 modulo playhead: the playhead loops back to x=0 after `_staffWidth` pixels, matching the cyclic nature of the progression. This is the intended correction for A-07-11 / A-08-08.
- Live visual verification of the centered staff and looping playhead is deferred to Pilot Checkpoint #4 (A-08-08, A-08-10) as the CLI environment cannot render PIXI.

### 08.4 Acceptance Coverage Table

| Acceptance ID | Required behavior | Source evidence | Test type | Gap status |
|---|---|---|---|---|
| A-08-07 | `tsc --noEmit` → 0, `pnpm lint` → 0, `pnpm test` count ≥ 361, `pnpm build` → 0 | All four gates green (tsc: 0 errors; lint: 0; test: 385 passed; build: exit 0) | automated | covered |
| A-08-08 | Playhead loops back to left edge instead of freezing | `harmony-staff-scene.ts` line 328: `((rawX % _staffWidth) + _staffWidth) % _staffWidth`; guard at line 319 | proxy:static-analysis (live: deferred to Pilot) | proxy-covered — live verification deferred |
| A-08-09 | `suavizado` produces smooth voice contours | `registerMode ?? 'suavizado'` passed to `computeVoiceTracks` at line 272; suavizado engine already covered by A-08-02 unit tests | proxy:static-analysis | proxy-covered — rendering effect requires live visual verification |
| A-08-10 | Staff occupies full canvas, centered | `harmony-staff-scene.ts` lines 259–261: `_staffBaseY = app.screen.height / 2 - 6 * HALF_STEP_PX` with `STEP_PX=16` | proxy:static-analysis (visual: deferred to Pilot) | proxy-covered — visual layout deferred |

**Proxy disclosures:**
- A-08-08 proxy: the formula at line 328 implements the exact positive-modulo expression from ADR 0011 D6; guard at line 319 satisfies the `_staffWidth <= 0` spec requirement. Live looping behavior requires a running PIXI canvas — deferred to Pilot checkpoint.
- A-08-09 proxy: step 08.3 unit tests (A-08-02) already prove the suavizado smoothing engine produces notes within ±6 semitones; this step wires the mode into the scene call. The visual staff rendering of smooth contour lines requires a running PIXI canvas — deferred to Pilot checkpoint.
- A-08-10 proxy: the geometry formula `height / 2 − 48` is identical to ADR 0011 D5 binding constant. Visual centering verification requires a running PIXI canvas — deferred to Pilot checkpoint.

### 08.4 Terminal commit

- **Terminal commit:** `feat(harmony): Phase 08 step 08.4 — central staff geometry and cyclic playhead`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

### 08.4 Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**
