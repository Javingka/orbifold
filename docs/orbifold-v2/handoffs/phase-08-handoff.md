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
| --- | --- | --- | --- | --- |
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
- Cyclic playhead at line 332: `((rawX % _staffWidth) + _staffWidth) % _staffWidth`. Matches ADR 0011 D6 formula exactly.
- Guard at line 323: `if (_staffWidth <= 0) return;`. Satisfies the spec "if `_staffWidth <= 0`, return early without drawing the playhead".
- No `Math.min`/`Math.max` on `playheadX` anywhere in `updateHarmonyStaffDynamic` — old clamp is fully gone.
- `PX_PER_CYCLE` import at line 46: from `../core/harmony/time-map.js` (vigent coordination-point rule — not redeclared).

**Prototype parity note (PIXI render module — visual equivalence):**

This step does not port new logic from the prototype; it replaces Phase 07 delivery geometry and playhead behavior. The parity note is against Phase 07:

- Phase 07 `staffBaseY = height − 60`: the staff was a bottom strip. Phase 08 `staffBaseY = height / 2 − 48`: the staff is now centered. Observed equivalence is a visual layout change (not a regression), confirmed by the new geometry formula matching ADR 0011 D5 exactly.
- Phase 07 clamp playhead: the playhead froze at the staff's right edge at the end of a progression loop. Phase 08 modulo playhead: the playhead loops back to x=0 after `_staffWidth` pixels, matching the cyclic nature of the progression. This is the intended correction for A-07-11 / A-08-08.
- Live visual verification of the centered staff and looping playhead is deferred to Pilot Checkpoint #4 (A-08-08, A-08-10) as the CLI environment cannot render PIXI.

### 08.4 Acceptance Coverage Table

| Acceptance ID | Required behavior | Source evidence | Test type | Gap status |
| --- | --- | --- | --- | --- |
| A-08-07 | `tsc --noEmit` → 0, `pnpm lint` → 0, `pnpm test` count ≥ 361, `pnpm build` → 0 | All four gates green (tsc: 0 errors; lint: 0; test: 385 passed; build: exit 0) | automated | covered |
| A-08-08 | Playhead loops back to left edge instead of freezing | `harmony-staff-scene.ts` line 332: `((rawX % _staffWidth) + _staffWidth) % _staffWidth`; guard at line 323; no Math.min/max on playheadX | proxy:static-analysis (live: deferred to Pilot) | proxy-covered — live verification deferred |
| A-08-09 | `suavizado` produces smooth voice contours | `registerMode ?? 'suavizado'` passed to `computeVoiceTracks` at line 276; suavizado engine already covered by A-08-02 unit tests | proxy:static-analysis | proxy-covered — rendering effect requires live visual verification |
| A-08-10 | Staff occupies full canvas, centered | `harmony-staff-scene.ts` line 262: `_staffBaseY = app.screen.height / 2 - 6 * HALF_STEP_PX` with `STEP_PX=16` | proxy:static-analysis (visual: deferred to Pilot) | proxy-covered — visual layout deferred |

**Proxy disclosures:**

- A-08-08 proxy: the formula at line 332 implements the exact positive-modulo expression from ADR 0011 D6; guard at line 323 satisfies the `_staffWidth <= 0` spec requirement; confirmed no residual Math.min/Math.max clamp on playheadX. Live looping behavior requires a running PIXI canvas — deferred to Pilot checkpoint.
- A-08-09 proxy: step 08.3 unit tests (A-08-02) already prove the suavizado smoothing engine produces notes within ±6 semitones; this step wires the mode into the scene call. The visual staff rendering of smooth contour lines requires a running PIXI canvas — deferred to Pilot checkpoint.
- A-08-10 proxy: the geometry formula `height / 2 − 48` is identical to ADR 0011 D5 binding constant. Visual centering verification requires a running PIXI canvas — deferred to Pilot checkpoint.

### 08.4 Terminal commit

- **Terminal commit:** `feat(harmony): Phase 08 step 08.4 — central staff geometry and cyclic playhead`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

### 08.4 Planner Review

**Decision:** APPROVED on 2026-06-12. Iteration: 1 of 5.
**Reviewed on:** 2026-06-12
**Iteration:** 1 of 5
**Reason:** All 8 checklist items pass: geometry constants verified at source lines 60/63/262 matching ADR 0011 D5 exactly (STEP_PX=16, HALF_STEP_PX=8, staffBaseY=height/2-48); cyclic playhead formula at line 332 is the positive-modulo expression from D6, old clamp fully absent; `_staffWidth <= 0` guard at line 323; PX_PER_CYCLE imported from time-map.ts not redeclared; interim `as unknown` cast is properly annotated with TODO(step-08.5) and will be replaced by a typed field read in step 08.5 per spec; all four quality gates green (tsc/lint/test-385/build).
**Next action:** Dev proceeds to step 08.5

---

## Step 08.5 — Tonnetz ⇄ Pentagrama sub-toggle (stage + store + Header)

**Date:** 2026-06-12
**Iteration:** 1 of 5

### 08.5 Completed

**Part A — `src/render/stage.ts` refactor:**

- Added `_tonnetzContainer` and `_staffContainer` module-level variables (`PIXI.Container | null`).
- In `initStage`, after creating `harmonyLayer`, created the two sub-containers and added them as children of `harmonyLayer` (`_tonnetzContainer.visible = true`, `_staffContainer.visible = false`).
- Migrated the seven Tonnetz children (hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels) from `harmonyLayer.addChild(...)` to `_tonnetzContainer.addChild(...)`. Z-order preserved exactly (hGrid → hPath → hDyn → hNRG → hNodes → hNRL → hLabels).
- Extended `StageRefs` interface with `tonnetzContainer: PIXI.Container` and `staffContainer: PIXI.Container`.
- Added `tonnetzContainer` and `_staffContainer` null guards to `getStageRefs()` and included both in the returned object.
- Added `export function setHarmonySubview(subview: 'tonnetz' | 'staff'): void` that sets `_tonnetzContainer.visible` and `_staffContainer.visible` to complementary values. `setView('harmony'/'rhythm')` on `harmonyLayer.visible` is unchanged.

**Part A — `src/render/harmony-staff-scene.ts` update:**

- Removed the interim `as unknown as Record<string,unknown>` cast for `registerMode` (TODO step-08.5 comment) and replaced with the direct typed read `state.harmony.registerMode` — now that `HarmonyState` carries the field.
- Removed the unused `import type { RegisterMode }` (no longer needed after removing the cast).
- Changed `buildHarmonyStaffScene` to use `refs.staffContainer` instead of `refs.harmonyLayer` for all add/remove operations on the four staff scene objects. Build order: `_staffGfx` → `_accidentalContainer` → `_clefText` → `_dynGfx`.

**Part B — `src/state/session.ts` store changes:**

- Added `import type { RegisterMode }` from `../core/harmony/voice-tracks.js`.
- Added lazy stage loader (`type StageModule = typeof import('../render/stage.js')`) with `getStage()` helper (mirrors the lazy audio pattern to avoid pulling PIXI into Vitest's Node environment).
- Extended `HarmonyState` interface with:
  - `subview: 'tonnetz' | 'staff'` — documented as EPHEMERAL, not persisted.
  - `registerMode: RegisterMode` — documented as EPHEMERAL, not persisted, audio byte-identical invariant stated.
- Updated `DEFAULT_SESSION_STATE.harmony` to include `subview: 'tonnetz'` and `registerMode: 'suavizado'` (Pilot decisions).
- Added `export function setHarmonySubview(subview)`: updates store `harmony.subview` and calls `stage.setHarmonySubview` via lazy dynamic import. Does NOT call `requeueLive()`.
- Added `export function setRegisterMode(mode)`: updates store `harmony.registerMode` only. Visual-only; no `requeueLive()`. Staff re-renders via App.svelte's store subscription on the next state change.
- Updated `applyLoadedSession` to include `subview: s.harmony.subview` and `registerMode: s.harmony.registerMode` (preserves current ephemeral state when loading a saved session — ephemeral fields are NOT from `SavedHarmonySchema`).

**Part B — `src/lib/persistence.ts` typing fix:**

- Updated `deserializeSession` to include `subview: 'tonnetz' as const` and `registerMode: 'suavizado' as const` in the returned harmony object, satisfying the updated `HarmonyState` type. These values are hardcoded defaults — not derived from any `SavedHarmonySchema` field. `SavedHarmonySchema` Zod schema unchanged.

**Part C — `src/ui/Header.svelte` sub-toggle:**

- Added `setHarmonySubview` and `setRegisterMode` imports from session.ts.
- Inside `{#if $sessionStore.view === 'harmony'}`: added two `.seg` segmented controls (before the existing `.field.clave`):
  1. `#subviewSeg` — "Tonnetz" / "Pentagrama" buttons; active class driven by `$sessionStore.harmony.subview`; calls `setHarmonySubview('tonnetz'/'staff')`.
  2. `#registerModeSeg` — "suavizado" / "estricto" buttons; active class driven by `$sessionStore.harmony.registerMode`; calls `setRegisterMode('suavizado'/'estricto')`.

**Test updates (session.ts shape change):**

- `tests/session.test.ts`: updated `makePopulatedState()` to spread `...DEFAULT_SESSION_STATE.harmony` (adds `subview` and `registerMode`). Updated 3 inline `harmony: { root, mode, octave, progression }` literals in `requeueLive()` tests to use `harmony: { ...DEFAULT_SESSION_STATE.harmony, progression: [...] }`.
- `tests/persistence.test.ts`: updated `FULL_STATE` to include `subview: 'tonnetz'` and `registerMode: 'suavizado'` on the `harmony` field.
- No test logic changed — the same behaviors are asserted; only the shape of `HarmonyState` objects is updated to satisfy the new required fields.

### 08.5 Files touched

- `src/render/stage.ts` (modified — `_tonnetzContainer`, `_staffContainer` state; `initStage` sub-container creation; Tonnetz children migrated; `StageRefs` extended; `getStageRefs` updated; `setHarmonySubview` added)
- `src/render/harmony-staff-scene.ts` (modified — `refs.staffContainer` instead of `refs.harmonyLayer`; cast removed; `RegisterMode` import removed)
- `src/state/session.ts` (modified — `RegisterMode` import; lazy stage loader; `HarmonyState` extended; `DEFAULT_SESSION_STATE` updated; `setHarmonySubview` + `setRegisterMode` actions added; `applyLoadedSession` updated)
- `src/lib/persistence.ts` (modified — `deserializeSession` harmony object includes `subview`/`registerMode` defaults to satisfy `HarmonyState` type; `SavedHarmonySchema` unchanged)
- `src/ui/Header.svelte` (modified — `setHarmonySubview` + `setRegisterMode` imports; two `.seg` sub-toggle controls added)
- `tests/session.test.ts` (modified — `makePopulatedState` and 3 inline `harmony:` literals updated for new required fields)
- `tests/persistence.test.ts` (modified — `FULL_STATE.harmony` updated for new required fields)
- `docs/orbifold-v2/handoffs/phase-08-handoff.md` (this file)

### 08.5 Validation evidence

**TypeScript:** `pnpm exec tsc --noEmit` → exit 0 (0 errors). All new typed fields resolve correctly. Lazy `typeof import(...)` pattern satisfies strict mode.

**Lint:** `pnpm lint` → 0 errors. ESLint and Prettier both clean.

**Tests:** `pnpm exec vitest run` → 385 passed, 0 failed, 13 test files. Count unchanged from step 08.4 baseline (step 08.5 has no new unit tests; the store changes required updating existing tests but no new Vitest tests per spec).

**Build:** `pnpm build` → exit 0. Pre-existing chunk-size warning on `index-*.js` (≈1,062 kB, gzip ≈335 kB) unchanged. New Vite advisory: `stage.ts` is dynamically imported by `session.ts` but also statically imported by several other modules — this is expected (mirrors the `strudel.ts` advisory) and means no code-splitting benefit, but the app works correctly.

**A-08-05 (persistence/agent schema exclusion):**

`grep -n "subview\|registerMode" src/lib/persistence.ts` → returns only lines in `deserializeSession` (defaults, not schema) and a comment. The `SavedHarmonySchema` Zod schema at lines 46–54 has no `subview` or `registerMode` fields — confirmed by reading the schema source.

`grep -n "subview\|registerMode" src/agent/schema.ts` → 0 matches. Confirmed completely absent from agent schema.

**A-08-05 reversibility invariant:**

With `subview === 'tonnetz'` (default), `_staffContainer.visible = false` — the staff scene objects are hidden. The Tonnetz scene objects are in `_tonnetzContainer.visible = true` — identical display list to Phase 07 (the objects existed, just now in a container). Harmony view behavior is byte-identical to pre-Phase-08 Phase 07 state.

**A-08-06 (no PIXI/Svelte/DOM in core/harmony):**
`grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` → 0 matches.

**Coordinate rule check:**
`PX_PER_CYCLE` in `harmony-staff-scene.ts` is still imported from `../core/harmony/time-map.js` (line 46 in the updated file). Not redeclared. The `RegisterMode` import was removed (no longer needed).

**HarmonyState ephemeral JSDoc:**
Both `subview` and `registerMode` in `HarmonyState` carry JSDoc comments stating "EPHEMERAL — not persisted, not in agent schema" plus the ADR citation.

### 08.5 Acceptance Coverage Table

| Acceptance ID | Required behavior | Source evidence | Test type | Gap status |
| --- | --- | --- | --- | --- |
| A-08-05 | `registerMode` and `subview` absent from `SavedHarmonySchema` and `agent/schema.ts`; changing them does not alter saved blob | `grep` → 0 matches in `agent/schema.ts`; `SavedHarmonySchema` Zod schema unchanged; `serializeSession` does not read `subview`/`registerMode`; `deserializeSession` restores defaults | proxy:static-analysis | covered |
| A-08-06 | No PIXI/Svelte/DOM imports in `src/core/harmony/` | `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` → 0 matches | proxy:static-analysis | covered |
| A-08-07 | All quality gates green | `tsc`: 0 errors; `lint`: 0; `test`: 385 passed; `build`: exit 0 | automated | covered |
| A-08-11 | Tonnetz ⇄ Pentagrama sub-toggle in top bar; ProgressionStrip visible in both subviews | `Header.svelte`: `#subviewSeg` with two buttons calling `setHarmonySubview`; `stage.ts`: `setHarmonySubview` toggles container visibility; ProgressionStrip is a Svelte component outside the PIXI canvas — always visible | proxy:static-analysis (live: deferred to Pilot) | proxy-covered |
| A-08-14 | Default `subview='tonnetz'`: harmony view visually identical to Phase 07 | `_tonnetzContainer.visible = true`, `_staffContainer.visible = false` on init; DEFAULT_SESSION_STATE `subview: 'tonnetz'`; `setHarmonySubview` not called until user clicks Pentagrama | proxy:static-analysis (live: deferred to Pilot) | proxy-covered |
| A-08-09 | `suavizado` produces smooth voice contours on staff | `harmony-staff-scene.ts` now reads `state.harmony.registerMode` directly (typed); DEFAULT is `'suavizado'`; suavizado engine unit-tested in A-08-02 | proxy:static-analysis | proxy-covered (visual rendering deferred to Pilot) |

**Proxy disclosures:**

A-08-11 proxy: `stage.ts setHarmonySubview` sets exactly one container visible at a time (source: lines added to `setHarmonySubview`). Header.svelte `#subviewSeg` buttons call `setHarmonySubview`. ProgressionStrip renders as a Svelte DOM element above the PIXI canvas — it is always visible regardless of `harmonyLayer` children. Live toggle interaction requires a running browser — deferred to Pilot.

A-08-14 proxy: On `initStage`, `_tonnetzContainer.visible = true` and `_staffContainer.visible = false`. The `setHarmonySubview('staff')` call in the store action is only reached when the user clicks "Pentagrama". On initial load, the store default `subview: 'tonnetz'` means `setHarmonySubview('staff')` is never called — init state prevails (Tonnetz visible, staff hidden).

A-08-09 proxy: The typed `state.harmony.registerMode` read (default `'suavizado'`) is now passed directly to `computeVoiceTracks`. Visual rendering of smooth contour lines requires a PIXI canvas — deferred to Pilot.

### 08.5 Reversibility note

With `subview === 'tonnetz'` (the default on load): `_staffContainer.visible = false`. The staff scene objects (`_staffGfx`, `_accidentalContainer`, `_clefText`, `_dynGfx`) are added to `_staffContainer` but not rendered (PIXI skips invisible containers entirely). `_tonnetzContainer` (containing all 7 Tonnetz objects) is `visible = true`. The harmonyLayer renders exactly the same Tonnetz scene as in Phase 07. Audio output is byte-identical to pre-Phase-08 state (no audio changes in this step).

### 08.5 Terminal commit

- **Terminal commit:** `feat(harmony): Phase 08 step 08.5 — Tonnetz⇄Pentagrama sub-toggle, stage containers, store fields`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

### 08.5 Planner Review

**Decision:** APPROVED on 2026-06-12. Iteration: 1 of 5.
**Reviewed on:** 2026-06-12
**Iteration:** 1 of 5
**Reason:** (Pre-approved per invocation context — steps 08.1–08.5 confirmed approved before 08.6 was invoked.)
**Next action:** Dev proceeds to step 08.6

---

## Step 08.6 — Relocate acorde/arpegio to top bar + ProgressionStrip cursor

**Date:** 2026-06-12
**Iteration:** 1 of 5

### 08.6 Completed

**Part A — Relocate acorde/arpegio and marco to Header.svelte:**

- Added `setChordMode` import from `session.ts` and `agentCtx` import from `agentCtx.ts` to `Header.svelte`.
- Inside `{#if $sessionStore.view === 'harmony'}`, added two new controls after the `#registerModeSeg` div (step 08.5) and before the `.field.clave`:
  1. `<div class="seg" id="chordModeSeg">` — two buttons "◧ acorde" / "⋯ arpegio". Active state driven by `$sessionStore.chordMode`. On click: `setChordMode('chord' | 'arp')`. Includes `data-tip` attributes for tooltip accessibility. Button labels and click semantics are identical to the prototype (HTML lines 449–452).
  2. `<button class="marco-btn">` — the 📨 marco context button. Active state driven by `$agentCtx.includeHarmony`. On click: `agentCtx.update((c) => ({ ...c, includeHarmony: true }))`. Behavior preserved from the prototype (button#harmonyToCtx, line 510).
- Added `.marco-btn` CSS class (matching the `.tbtn` style from HarmonyControls.svelte: 11px bold font, 6px 12px padding, border-radius 10px, accent active state).
- AGPL-3.0 header present in `Header.svelte` (was already present from step 08.5).

**Part B — HarmonyControls.svelte emptied:**

Decision: **Keep as empty shell** (not deleted). `App.svelte` line 373 has `<HarmonyControls />` which would require editing App.svelte to remove — an additional file touch with higher risk for no functional benefit. The empty shell compiles to no output. The comment block documents the relocation clearly.

- Removed the entire `.orbit-ctl.glass#harmonyCtl` div and all its contents (`.seg2#chordModeSeg`, `.tbtn.marco`).
- Removed all CSS (`.orbit-ctl`, `.tbtn`, `.tbtn:hover`, `.tbtn.active`, and the `<style>` block).
- Retained only the AGPL-3.0 header comment with a relocation note.

**Part C — ProgressionStrip.svelte playhead cursor:**

- Added `import { onDestroy } from 'svelte'`.
- Added `import { getVisualPhaseAnchor } from '../state/phase-anchor.js'`.
- Added cursor state variables: `cursorX: number = 0`, `cursorVisible: boolean = false`, `_cursorRaf: number | null = null`.
- Added `startCursorLoop()`: launches a rAF loop that computes `rawX = ((now - getVisualPhaseAnchor()) / barMs) * PX_PER_CYCLE`, then `cursorX = ((rawX % totalWidth) + totalWidth) % totalWidth`. The loop self-cancels when `progression.length === 0`. `bpm` is read from `$sessionStore.bpm` (guarded `> 0` defaulting to 120). `totalWidth = totalBars * PX_PER_CYCLE` where `totalBars` is the existing reactive `$:` computed value.
- Added `stopCursorLoop()`: cancels the rAF and sets `cursorVisible = false`.
- Added Svelte `$:` reactive block: starts the cursor loop when `progression.length > 0`, stops it when empty.
- Added `onDestroy(() => stopCursorLoop())` for cleanup.
- Added `{#if cursorVisible}` cursor div in the template inside `.strip-scroll`, before `.segments`: `<div class="playhead-cursor" style="left: {cursorX}px;" aria-hidden="true">`.
- Added `.playhead-cursor` CSS: `position: absolute; top: 14px; bottom: 0; width: 1px; background: rgba(255,255,255,0.8); pointer-events: none; z-index: 2`.
- Added `position: relative` to `.strip-scroll` (existing block, appended in CSS to establish positioning context for the absolutely-positioned cursor).
- `PX_PER_CYCLE` used is the local `const PX_PER_CYCLE = 48` already declared at line 119 — NOT imported from `time-map.ts` (vigent coordination-point rule: this is a Svelte component, not a pure engine).
- All existing ProgressionStrip behavior (gain drag, resize, tap-to-preview, rest slots, add-rest button) is preserved — the cursor div has `pointer-events: none`.

### 08.6 Files touched

- `src/ui/Header.svelte` (modified — `setChordMode` + `agentCtx` imports; `#chordModeSeg` seg; `.marco-btn` button and CSS)
- `src/ui/HarmonyControls.svelte` (modified — emptied to shell: all controls and CSS removed; AGPL-3.0 comment retained)
- `src/ui/ProgressionStrip.svelte` (modified — `onDestroy` + `getVisualPhaseAnchor` imports; cursor state; `startCursorLoop`/`stopCursorLoop` functions; `$:` reactive trigger; `onDestroy` cleanup; cursor div in template; `.playhead-cursor` + `.strip-scroll { position: relative }` CSS)
- `docs/orbifold-v2/handoffs/phase-08-handoff.md` (this file)

### 08.6 Validation evidence

**TypeScript:** `pnpm exec tsc --noEmit` → exit 0 (0 errors). All new store imports, agentCtx binding, and DOM type expressions resolve cleanly.

**Lint:** `pnpm lint` → 0 errors. ESLint and Prettier both clean (Prettier reformatted ProgressionStrip.svelte after the cursor addition).

**Tests:** `pnpm exec vitest run` → 385 passed, 0 failed, 13 test files. Count unchanged from step 08.5 baseline (this step has no new unit tests; all existing tests continue to pass).

**Build:** `pnpm build` → exit 0. Pre-existing chunk-size advisory on `index-*.js` (≈1,063 kB, gzip ≈335 kB) and stage.ts dynamic-import advisory unchanged.

**Static analysis (per spec 08.6 and 08.7 requirements):**

| Check | Result |
| --- | --- |
| `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` | 0 matches |
| `grep -n "PX_PER_CYCLE" src/ui/ProgressionStrip.svelte` | local `const PX_PER_CYCLE = 48` at line 119; NOT an import from time-map.ts |
| `grep -n "PX_PER_CYCLE" src/render/harmony-staff-scene.ts` | imported from `../core/harmony/time-map.js` at line 45; not redeclared |
| `grep -n "subview\|registerMode" src/lib/persistence.ts` | only in `deserializeSession` defaults (not in SavedHarmonySchema Zod schema) |
| `grep -n "subview\|registerMode" src/agent/schema.ts` | 0 matches |
| AGPL-3.0 header in modified files | present in `Header.svelte`, `HarmonyControls.svelte`, `ProgressionStrip.svelte` |

**HarmonyControls.svelte emptied — canvas free:**
The `.orbit-ctl` absolute-positioned overlay div has been removed. No harmony controls overlap the canvas in harmony view. The component renders as an empty Svelte template (comment-only), producing no DOM output.

**Prototype parity note:**

- `setChordMode('chord' | 'arp')`: prototype behavior at lines 449–452 (`.seg2#chordModeSeg` buttons), action is unchanged (`setChordMode` in `session.ts`). Labels "◧ acorde" / "⋯ arpegio" are preserved exactly.
- `agentCtx.update(c => ({...c, includeHarmony: true}))`: prototype behavior from `button#harmonyToCtx` (line 510), action is unchanged (`agentCtx` store update). Label "📨 marco" preserved.
- No behavioral changes — controls are relocated, not redesigned.

**Live/visual verification:** deferred to Pilot (CLI cannot render PIXI or open a browser):

- A-08-12: ProgressionStrip cursor visually advances and loops — requires live browser.
- A-08-13: top bar shows acorde/arpegio/marco in harmony view; canvas has no overlay — requires live browser.

### 08.6 Acceptance Coverage Table

| Acceptance ID | Required behavior | Source evidence | Test type | Gap status |
| --- | --- | --- | --- | --- |
| A-08-06 | No PIXI/Svelte/DOM imports in `src/core/harmony/` | `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` → 0 matches | proxy:static-analysis | covered |
| A-08-07 | `tsc --noEmit` → 0, `pnpm lint` → 0, `pnpm test` count ≥ 361, `pnpm build` → 0 | All four gates green (tsc: 0 errors; lint: 0; test: 385 passed; build: exit 0) | automated | covered |
| A-08-12 | ProgressionStrip cursor advances in sync with staff playhead, loops with progression, visible in both subviews | `ProgressionStrip.svelte`: `startCursorLoop()` rAF loop with positive-modulo formula; `onDestroy` cleanup; cursor div with `pointer-events:none` | proxy:static-analysis (live: deferred to Pilot) | proxy-covered |
| A-08-13 | acorde/arpegio seg and marco button in top bar; no canvas overlap | `Header.svelte`: `#chordModeSeg` + `.marco-btn` inside `{#if view === 'harmony'}`; `HarmonyControls.svelte`: empty shell (no DOM output) | proxy:static-analysis (live: deferred to Pilot) | proxy-covered |

**Proxy disclosures:**

- A-08-12 proxy: `startCursorLoop()` uses the same positive-modulo formula as the staff playhead (`((rawX % totalWidth) + totalWidth) % totalWidth`); both consume `getVisualPhaseAnchor()` and `bpm` from the session store; cursor div is `aria-hidden="true"` and `pointer-events:none`; `onDestroy` cancels the rAF. Live synchronization requires a running browser — deferred to Pilot.

- A-08-13 proxy: `HarmonyControls.svelte` is now an empty comment-only file; Svelte compiles it to no DOM elements. `Header.svelte` now has `#chordModeSeg` and `.marco-btn` inside the `{#if $sessionStore.view === 'harmony'}` guard. The canvas is free of harmony control overlays. Visual confirmation requires a running browser — deferred to Pilot.

### 08.6 Prototype parity

- `setChordMode('chord' | 'arp')`: originally `.seg2#chordModeSeg` in prototype HTML lines 449–452. Relocated to Header.svelte; action function (`setChordMode` in `session.ts`) and button labels ("◧ acorde", "⋯ arpegio") are identical.
- `agentCtx.update((c) => ({ ...c, includeHarmony: true }))`: originally `button#harmonyToCtx` in prototype line 510; button already moved to `HarmonyControls.svelte` in Phase 06. Now relocated again to `Header.svelte`; behavior unchanged.
- No audio behavior modified.

### 08.6 Terminal commit

- **Terminal commit:** `feat(harmony): Phase 08 step 08.6 — relocate acorde/arpegio to header, ProgressionStrip cursor`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

### 08.6 Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

## Step 08.7 — Quality gates + manual acceptance

**Date:** 2026-06-12
**Iteration:** 1 of 5

### 08.7 Completed

All four quality gates run clean. All static analysis checks from the spec performed and recorded below. Phase-completion summary and manual acceptance checklist produced for Pilot Checkpoint #5.

### 08.7 Files touched

- `docs/orbifold-v2/handoffs/phase-08-handoff.md` (this file — handoff entry + phase-completion summary appended)

### 08.7 Quality gate results (exact output)

#### `pnpm exec tsc --noEmit`

Exit code: **0**
Output: *(no output — zero errors)*

#### `pnpm lint`

Exit code: **0**
Output:

```text
> orbifold@0.0.1 lint
> eslint . && prettier --check .

Checking formatting...
All matched files use Prettier code style!
```

#### `pnpm exec vitest run`

Exit code: **0**

```text
 Test Files  13 passed (13)
      Tests  385 passed (385)
   Start at  13:11:10
   Duration  754ms
```

Breakdown by file:

| Test file | Tests |
| --- | --- |
| `tests/harmony/time-map.test.ts` | 13 |
| `tests/euclid.test.ts` | 25 |
| `tests/harmony/staff-map.test.ts` | 73 |
| `tests/harmony/staff-layout.test.ts` | 32 |
| `tests/harmony/voice-tracks.test.ts` | 18 |
| `tests/harmony/voice-tracks-register.test.ts` | 24 |
| `tests/codegen.test.ts` | 39 |
| `tests/tonnetz.test.ts` | 31 |
| `tests/session.test.ts` | 46 |
| `tests/schema.test.ts` | 41 |
| `tests/persistence.test.ts` | 31 |
| `tests/voice-leading.test.ts` | 8 |
| `tests/phase-anchor.test.ts` | 4 |
| **Total** | **385** |

Baseline before Phase 08: 361. Net gain: +24 (all from step 08.3 voice-tracks-register tests).

#### `pnpm build`

Exit code: **0**

```text
vite v5.4.11 building for production...
✓ 555 modules transformed.
dist/index.html                     2.32 kB │ gzip:   1.25 kB
dist/assets/index-Z1xAQs6o.css     30.37 kB │ gzip:   6.18 kB
dist/assets/index-COQsK9Qi.js   1,062.56 kB │ gzip: 335.23 kB
✓ built in 1.70s
```

Advisory: pre-existing chunk-size warning (1,062.56 kB > 500 kB); pre-existing stage.ts + strudel.ts dynamic-import advisories. Neither introduced by Phase 08; both present since Phase 07 delivery.

### 08.7 Static analysis checks (per spec 08.7 requirements)

| Check | Command / Verification | Result |
| --- | --- | --- |
| No PIXI/Svelte/DOM imports in `src/core/harmony/` | `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` | **0 matches** — confirmed |
| `PX_PER_CYCLE` in `harmony-staff-scene.ts` is imported, not re-declared | Line 45: `import { PX_PER_CYCLE } from '../core/harmony/time-map.js'` | **confirmed import** |
| `PX_PER_CYCLE` in `ProgressionStrip.svelte` is local const = 48 | Line 119: `const PX_PER_CYCLE = 48;` (not an import from time-map.ts) | **confirmed local const = 48** |
| `persistence.ts` — `SavedHarmonySchema` has no `subview`/`registerMode` | Lines 46–54: Zod schema has `root`, `mode`, `octave`, `progression` only | **confirmed absent** |
| `agent/schema.ts` — no `subview`/`registerMode` | `grep -n "subview\|registerMode" src/agent/schema.ts` | **0 matches** |
| `HarmonyState.subview` carries EPHEMERAL JSDoc | `session.ts` line 188: `"EPHEMERAL — not persisted, not in agent schema."` | **confirmed** |
| `HarmonyState.registerMode` carries EPHEMERAL JSDoc | `session.ts` line 195: `"EPHEMERAL — not persisted, not in agent schema."` | **confirmed** |
| AGPL-3.0 header on `voice-tracks.ts` | Line 1: `// SPDX-License-Identifier: AGPL-3.0-only` | **present** |
| AGPL-3.0 header on `harmony-staff-scene.ts` | Line 1: `// SPDX-License-Identifier: AGPL-3.0-only` | **present** |
| AGPL-3.0 header on `stage.ts` | Line 1: `// SPDX-License-Identifier: AGPL-3.0-only` | **present** |
| AGPL-3.0 header on `session.ts` | Line 1: `// SPDX-License-Identifier: AGPL-3.0-only` | **present** |
| AGPL-3.0 header on `persistence.ts` | Line 1: `// SPDX-License-Identifier: AGPL-3.0-only` | **present** |
| AGPL-3.0 header on `Header.svelte` | Line 2: `SPDX-License-Identifier: AGPL-3.0-only` | **present** |
| AGPL-3.0 header on `HarmonyControls.svelte` | Line 2: `SPDX-License-Identifier: AGPL-3.0-only` | **present** |
| AGPL-3.0 header on `ProgressionStrip.svelte` | Line 2: `SPDX-License-Identifier: AGPL-3.0-only` | **present** |
| AGPL-3.0 header on `voice-tracks-register.test.ts` | Line 1: `// SPDX-License-Identifier: AGPL-3.0-only` | **present** |
| PIXI version still pinned (no caret) | `package.json` line 16: `"pixi.js": "7.4.2"` | **confirmed pinned** |
| Strudel version still pinned (no caret) | `package.json` line 15: `"@strudel/web": "1.0.3"` | **confirmed pinned** |
| `registerMode` is visual-only (audio byte-identical) | No `requeueLive()` call in `setRegisterMode` (`session.ts` lines 658–675); audio codegen path (`melodyLine`, `chordToStrudel`) does not import `voice-tracks.ts` | **confirmed visual-only** |

### 08.7 Implementation evidence per acceptance ID (for live/visual items)

The following table cites exact source lines for A-08-08 through A-08-14 where behavior is implemented. Live visual confirmation is deferred to Pilot.

| A-ID | Behavior | Source evidence | Live deferred? |
| --- | --- | --- | --- |
| A-08-08 | Playhead loops back to left edge | `harmony-staff-scene.ts` line 327–332: `rawX` computed, then `((rawX % _staffWidth) + _staffWidth) % _staffWidth`; guard `if (_staffWidth <= 0) return` at line 323 | Yes — requires running PIXI canvas |
| A-08-09 | `suavizado` produces smooth voice contours | `session.ts` default `registerMode: 'suavizado'`; `harmony-staff-scene.ts` passes `state.harmony.registerMode` to `computeVoiceTracks`; engine unit-tested in A-08-02 (voice-tracks-register.test.ts) | Yes — visual contours require running canvas |
| A-08-10 | Staff occupies full canvas, centered | `harmony-staff-scene.ts` line 60: `STEP_PX = 16`; line 63: `HALF_STEP_PX = STEP_PX / 2` (= 8); line 261: `_staffBaseY = app.screen.height / 2 - 6 * HALF_STEP_PX` (= height/2 − 48) | Yes — visual layout requires running canvas |
| A-08-11 | Sub-toggle in top bar; ProgressionStrip visible in both | `Header.svelte`: `#subviewSeg` inside `{#if $sessionStore.view === 'harmony'}`; `stage.ts setHarmonySubview`: sets `_tonnetzContainer.visible` / `_staffContainer.visible` exclusively; ProgressionStrip is Svelte DOM — always rendered | Yes — toggle interaction requires browser |
| A-08-12 | ProgressionStrip cursor loops with progression | `ProgressionStrip.svelte`: `startCursorLoop()` rAF loop, positive-modulo formula, `onDestroy` cleanup; cursor div `pointer-events:none` | Yes — visual loop requires browser |
| A-08-13 | acorde/arpegio/marco in top bar; no canvas overlap | `Header.svelte`: `#chordModeSeg` + `.marco-btn` in harmony guard; `HarmonyControls.svelte`: empty shell (no DOM output) | Yes — visual layout requires browser |
| A-08-14 | Default `subview='tonnetz'` matches Phase 07 visual | `stage.ts initStage`: `_tonnetzContainer.visible = true`, `_staffContainer.visible = false`; `DEFAULT_SESSION_STATE.harmony.subview = 'tonnetz'`; `setHarmonySubview('staff')` only called on user action | Yes — visual identity requires browser |

### 08.7 Acceptance Coverage Table (full phase)

This is the authoritative phase-level table covering all 14 acceptance IDs.

| Acceptance ID | Required behavior | Test / evidence | Test type | Gap status |
| --- | --- | --- | --- | --- |
| A-08-01 | `computeVoiceTracks(prog, octave, 'estricto')` produces the same octave assignment as the pre-phase formula | `tests/harmony/voice-tracks-register.test.ts`: "A-08-01: voice-0 = C4", "A-08-01: voice-1 = E4", "A-08-01: voice-2 = A3", "A-08-01: three-chord estricto" | unit | **covered** |
| A-08-02 | `computeVoiceTracks(prog, octave, 'suavizado')` produces notes within ±6 semitones; tie resolves to lower | `tests/harmony/voice-tracks-register.test.ts`: "A-08-02: suavizado voice-1 stays D#3", "A-08-02: suavizado voice-2 stays F#3", "A-08-02: suavizado leap for every voice is <= 6 semitones", TIE tests | unit | **covered** |
| A-08-03 | Default 2-arg call byte-identical to explicit `'suavizado'` | `tests/harmony/voice-tracks-register.test.ts`: "A-08-03: 2-arg call and suavizado produce identical outputs", "A-08-03: 2-arg default and 3-arg estricto differ" | unit | **covered** |
| A-08-04 | Rest slot between two chords preserves voice-leading across the gap in both modes | `tests/harmony/voice-tracks-register.test.ts`: "A-08-04 estricto: A minor after rest has same notes as direct A minor", "A-08-04 suavizado: A minor after rest has same notes as direct A minor", "A-08-04: leading rest followed by chord uses estricto anchor" | unit | **covered** |
| A-08-05 | `registerMode`/`subview` absent from `SavedHarmonySchema` and `agent/schema.ts`; changing them does not alter saved blob | `SavedHarmonySchema` (lines 46–54): fields `root`, `mode`, `octave`, `progression` only; `agent/schema.ts` grep: 0 matches; `serializeSession` does not read these fields | proxy:static-analysis | **covered** |
| A-08-06 | No PIXI/Svelte/DOM imports in `src/core/harmony/` | `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/harmony/` → 0 matches | proxy:static-analysis | **covered** |
| A-08-07 | `tsc --noEmit` → 0, `pnpm lint` → 0, `pnpm test` count ≥ 361, `pnpm build` → 0 | tsc: exit 0 (0 errors); lint: exit 0; vitest: 385 passed; build: exit 0 | automated | **covered** |
| A-08-08 | Playhead loops back to left edge instead of freezing | `harmony-staff-scene.ts` lines 323–332: positive-modulo formula `((rawX % _staffWidth) + _staffWidth) % _staffWidth`; `_staffWidth <= 0` guard; no Math.min/max on playheadX | proxy:static-analysis + live deferred to Pilot | **proxy-covered** |
| A-08-09 | `suavizado` produces smooth voice contours on staff | `session.ts` default `'suavizado'`; `harmony-staff-scene.ts` passes `state.harmony.registerMode` to engine; unit-tested in A-08-02 | proxy:static-analysis + live deferred to Pilot | **proxy-covered** |
| A-08-10 | Staff occupies full canvas, centered | `harmony-staff-scene.ts` `STEP_PX=16`, `HALF_STEP_PX=8`, `staffBaseY = height/2 − 48` per ADR D5 | proxy:static-analysis + live deferred to Pilot | **proxy-covered** |
| A-08-11 | Sub-toggle switches canvas; ProgressionStrip visible in both | `Header.svelte` `#subviewSeg`; `stage.ts setHarmonySubview`; ProgressionStrip is Svelte DOM | proxy:static-analysis + live deferred to Pilot | **proxy-covered** |
| A-08-12 | ProgressionStrip cursor advances, loops, visible in both subviews | `ProgressionStrip.svelte` `startCursorLoop()` rAF loop; positive-modulo formula; `onDestroy` cleanup | proxy:static-analysis + live deferred to Pilot | **proxy-covered** |
| A-08-13 | acorde/arpegio/marco in top bar; no canvas overlap | `Header.svelte` `#chordModeSeg` + `.marco-btn`; `HarmonyControls.svelte` empty shell | proxy:static-analysis + live deferred to Pilot | **proxy-covered** |
| A-08-14 | Default `subview='tonnetz'`: Phase 07 visual identity | `stage.ts initStage` defaults; `DEFAULT_SESSION_STATE.harmony.subview = 'tonnetz'`; `setHarmonySubview('staff')` only on user click | proxy:static-analysis + live deferred to Pilot | **proxy-covered** |

**Proxy disclosures (08.7):**

All seven live/visual items (A-08-08 through A-08-14) require a running browser with a PIXI WebGL canvas. The CLI environment cannot render PIXI. Each is covered by static analysis of the implementing source line(s) in lieu of live visual confirmation. Live verification is deferred to Pilot Checkpoint #5 via the manual acceptance checklist below.

**No unaddressed IDs.** All 14 acceptance IDs have at minimum proxy:static-analysis coverage; A-08-01 through A-08-06 are covered by automated unit tests or static analysis with no residual gap.

**Prior-phase carry-forwards (all closed):**

| Carry-forward | From | Closed by |
| --- | --- | --- |
| A-07-08 (staff placement) | Phase 07 | A-08-10 + A-08-11 |
| A-07-09 (voice register) | Phase 07 | A-08-02, A-08-03, A-08-09 |
| A-07-11 (cyclic playhead + strip cursor) | Phase 07 | A-08-08 + A-08-12 |
| A-07-12 (widget overlap) | Phase 07 | A-08-13 |

### 08.7 Manual acceptance checklist for Pilot (Checkpoint #5)

The following items require in-browser verification. Each is a concrete checkable step with expected result.

**Prerequisites:** `pnpm dev` running; open `http://localhost:5173`; navigate to Armonía view; have at least one chord in the progression.

#### A-08-11 and A-08-14 — Sub-toggle

1. On load, confirm the top bar shows "Tonnetz" and "Pentagrama" segmented buttons in the Armonía view. The Tonnetz (hex grid) is visible on the canvas, and the staff is NOT visible. The "Tonnetz" button has the active style.
   - **Expected:** Tonnetz canvas, staff hidden — identical to Phase 07 visual.

2. Click "Pentagrama". Confirm the Tonnetz grid disappears and the treble-clef staff appears in the center of the canvas. The "Pentagrama" button has the active style.
   - **Expected:** Staff occupies the full canvas height (not a bottom strip); clef symbol visible at left; voice notes rendered as colored note-heads.

3. Click "Tonnetz". Confirm the Tonnetz grid reappears and the staff disappears.
   - **Expected:** Tonnetz visual identical to step 1.

4. Confirm the ProgressionStrip is visible (above the Transport) in both Tonnetz and Pentagrama subviews.
   - **Expected:** ProgressionStrip remains present regardless of subview.

#### A-08-10 — Central staff geometry

1. In the Pentagrama subview, confirm the staff is vertically centered on the canvas (the middle staff line B4 is approximately at canvas midpoint, not near the bottom).
   - **Expected:** Five staff lines are evenly spaced in the vertical center; with `STEP_PX=16` each gap is 8px; the whole staff occupies roughly 8 × 16 = 128px of the canvas height, centered.

#### A-08-08 — Cyclic playhead on staff

1. Start playback (Transport play button) with at least two chords in the progression. In the Pentagrama subview, observe the vertical playhead line on the staff.
   - **Expected:** The playhead advances left-to-right across the staff. When it reaches the right edge (end of progression), it wraps back to x=0 and begins advancing again without pausing or freezing at the last note.

#### A-08-09 — suavizado voice contours

1. In the Pentagrama subview with `registerMode = 'suavizado'` (the default), observe the three voice-track lines for a progression with at least two chords that would produce an octave jump in `estricto` mode (e.g., C major → B major).
   - **Expected:** Voice note-heads form approximately horizontal contour lines with no large vertical jumps between adjacent chords (all jumps ≤ 6 semitones = ≤ 3 staff steps).

2. Click "estricto" in the register-mode segmented control. Observe the same progression.
   - **Expected:** Voice note-heads may show larger vertical jumps (reflecting the absolute octave formula). Audio output is audibly unchanged — the same chord sounds play.

3. Click "suavizado" to return to the default. Confirm voice contours return to smooth lines.
   - **Expected:** Smooth contours restored; audio unchanged throughout.

#### A-08-12 — ProgressionStrip cursor

1. During playback, confirm a thin white vertical cursor line is visible in the ProgressionStrip (above the Transport) and advances left-to-right in sync with the staff playhead.
   - **Expected:** Cursor moves at the same speed as the staff playhead; both are synchronized via `getVisualPhaseAnchor()`.

2. Confirm the ProgressionStrip cursor wraps back to x=0 when the progression loops (matching the staff playhead wrap).
   - **Expected:** Cursor loops continuously with the progression; no freeze at the right edge.

3. Switch between Tonnetz and Pentagrama subviews during playback. Confirm the ProgressionStrip cursor is visible in both.
   - **Expected:** Cursor continues advancing in both subviews (it is a Svelte DOM element, not part of the PIXI canvas).

#### A-08-13 — Top bar controls; no canvas overlap

1. In the Armonía view (either subview), confirm the top bar shows: "Tonnetz" / "Pentagrama" toggle, "suavizado" / "estricto" toggle, "◧ acorde" / "⋯ arpegio" segmented control, and the 📨 marco button — all in the top bar.
   - **Expected:** All harmony controls are in the top bar. No controls float over the canvas.

2. In the Pentagrama subview, confirm the staff canvas is free of any overlay divs or controls (no `.orbit-ctl` or `.glass` panel in front of the notes).
   - **Expected:** The staff canvas has no overlapping controls. The only elements in the canvas area are the PIXI WebGL canvas itself.

#### A-08-05 — Ephemeral state not persisted

1. Set the subview to "Pentagrama" and the register mode to "estricto". Use the save function (save session). Reload the page or re-open the saved session.
   - **Expected:** After reload/load, the subview resets to "Tonnetz" (default) and the register mode resets to "suavizado" (default). The saved session blob does not contain `subview` or `registerMode` fields.

---

### 08.7 Phase-wide invariant confirmations

| Invariant | Check | Status |
| --- | --- | --- |
| AGPL-3.0 header on all new/modified `.ts`/`.svelte` files | Verified above for all 9 files (voice-tracks.ts, harmony-staff-scene.ts, stage.ts, session.ts, persistence.ts, Header.svelte, HarmonyControls.svelte, ProgressionStrip.svelte, voice-tracks-register.test.ts) | **PASS** |
| PIXI version pinned | `package.json`: `"pixi.js": "7.4.2"` (no caret) | **PASS** |
| Strudel version pinned | `package.json`: `"@strudel/web": "1.0.3"` (no caret) | **PASS** |
| No DOM/PIXI/Svelte imports in `src/core/harmony/` | grep → 0 matches | **PASS** |
| `registerMode` visual-only (audio byte-identical) | `setRegisterMode` has no `requeueLive()` call; audio codegen does not import voice-tracks.ts | **PASS** |
| `subview` / `registerMode` not persisted in `SavedHarmonySchema` or agent schema | grep → 0 matches in both files | **PASS** |
| `PX_PER_CYCLE = 48` coordination rule: local const in ProgressionStrip.svelte, imported in harmony-staff-scene.ts | Verified; both values = 48 | **PASS** |

### 08.7 Decisions Register proposals (for Pilot — Dev proposes, Pilot writes)

The following entries are proposed for the Decisions Register. The Pilot decides whether to add them.

#### Proposal 1 — `STEP_PX = 16` is a Phase 08 coordination point

Suggested entry: `STEP_PX = 16` and `HALF_STEP_PX = 8` are binding staff geometry constants, declared in `src/render/harmony-staff-scene.ts`. `staffBaseY = height / 2 − 6 * HALF_STEP_PX` (`= height/2 − 48`). These are documented in ADR 0011 Amendment D5. Any Phase 09 orbital rendering that must align with the treble-clef staff positions (e.g., voice ring radii that correspond to specific pitch positions) must use these constants or reference the same geometry. The Dev cannot change these without Pilot awareness (they affect the visible pitch register mapping).

#### Proposal 2 — estricto/suavizado contract: visual-only, audio byte-identical

Suggested entry: `registerMode` in `HarmonyState` is purely visual. Changing between `'estricto'` and `'suavizado'` produces byte-identical Strudel pattern strings and byte-identical audio output (confirmed: `computeVoiceTracks` output feeds only `harmony-staff-scene.ts` → PIXI; audio codegen uses `chordVoicing` directly). Any future phase that routes `voice-tracks.ts` output into codegen must surface it to the Pilot as a breaking change to this invariant.

#### Proposal 3 — Ephemeral UI state (subview, registerMode) is not persisted and not in agent schema

Suggested entry: `HarmonyState.subview` and `HarmonyState.registerMode` are ephemeral. On session load/save, these fields reset to their defaults (`'tonnetz'` and `'suavizado'` respectively). They are absent from `SavedHarmonySchema` and `agent/schema.ts`. Any future phase that needs to persist or agent-control these fields must produce an ADR (requires versioning `SavedHarmonySchema` and bumping the session schema version).

### 08.7 Phase status

**PHASE 08 IMPLEMENTATION COMPLETE.** All 14 acceptance IDs are addressed (A-08-01 through A-08-04 by unit tests; A-08-05 and A-08-06 by static analysis; A-08-07 by all four quality gates; A-08-08 through A-08-14 by proxy:static-analysis with live verification deferred to Pilot).

This handoff is ready for Pilot Checkpoint #5 (Phase Complete). The Pilot's manual acceptance checklist above contains 15 concrete in-browser verification steps. The Pilot decides whether to mark the phase CLOSED.

**Next phase (planned):** Phase 09 — orbital harmony view + morph.

### 08.7 Terminal commit

- **Terminal commit:** `feat(harmony): Phase 08 step 08.7 — quality gates and manual acceptance`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

### 08.7 Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

## Post-verification REVISE — Pilot Checkpoint #5 bugs

**Date:** 2026-06-12
**Iteration:** 1 (post-Pilot live-verification)

### Background

After Pilot Checkpoint #5 live verification, four rendering/UX bugs were identified that were not detectable by static analysis alone. These are corrected in a single REVISE commit.

### Bug 1 — Staff lines truncated to note content width (A-08-10)

**Root cause:** `drawStaticStaff` drew horizontal staff lines from x=0 to `staffWidth` (= `totalBars × PX_PER_CYCLE` but bounded by `MIN_STAFF_WIDTH`). When a short progression placed only a few chord slots near the left, the right portion of the canvas was black rather than showing the five staff lines.

**Fix:** `drawStaticStaff` now accepts a separate `lineWidth` parameter. In `buildHarmonyStaffScene`, `lineWidth = app.screen.width` is passed — the full canvas width — while note-head x-positions continue to come from `_layout.noteHeads[].x` (unchanged). The five staff lines are now edge-to-edge regardless of note content width.

**Files:** `src/render/harmony-staff-scene.ts` — new `lineWidth` parameter on `drawStaticStaff`; call site passes `app.screen.width`.

### Bug 2 — Treble clef curl one line too low (A-08-10)

**Root cause:** `TREBLE_CLEF_Y_OFFSET = 10` was derived for the Phase 07 geometry and was not revalidated after `STEP_PX` increased to 16 and `staffBaseY` moved to canvas center. The result was that the G-clef curl visually sat on the E4 line (step 2, the bottom staff line) instead of the G4 line (step 4, the second staff line from the bottom) — off by 2 diatonic steps = 16 px.

**Fix:** `TREBLE_CLEF_Y_OFFSET` increased from `10` to `26` (adds `2 × HALF_STEP_PX = 16 px` of upward offset). The clef text is now placed 16px higher, aligning the curl with the G4 line per the standard G-clef convention.

**Files:** `src/render/harmony-staff-scene.ts` — `TREBLE_CLEF_Y_OFFSET` constant updated; comment added.

### Bug 3 — Tonnetz instructional text visible in Pentagrama subview and Ritmo view (A-08-11)

**Root cause:** The stage hint `<div class="hint">{$hudStore.hint}</div>` in `App.svelte` was always rendered unconditionally, regardless of view or subview. The `$hudStore.hint` string is the Tonnetz instruction ("Toca un triángulo para elegir un acorde…"), which is irrelevant — and confusing — when the user is in the Pentagrama subview or in the Ritmo view.

**Fix:** The hint div in `App.svelte` is now gated by `$sessionStore.view === 'harmony'`. Within the harmony view, the rendered text branches on `$sessionStore.harmony.subview`:

- `'tonnetz'` → shows `$hudStore.hint` (the existing Tonnetz instruction from `hud.ts`)
- `'staff'` → shows the Pentagrama instruction: "3 voces en color — tónica, subdominante, dominante. Cambia modo registro: suavizado (contornos suaves) o estricto (posición absoluta)."

Neither text renders in Ritmo view or any other non-harmony view.

**Files:** `src/app/App.svelte` — hint `<div>` replaced with `{#if $sessionStore.view === 'harmony'}` / `{#if subview === 'tonnetz'}` / `{:else}` block.

### Bug 4 — Staff playhead wraps faster than ProgressionStrip cursor (A-08-08)

**Root cause:** `_staffWidth = Math.max(_layout.totalWidth, MIN_STAFF_WIDTH)` where `_layout.totalWidth` equals `max(event.startCycle + event.bars) × PX_PER_CYCLE`. For a progression where the last slot is a rest (which produces no note event in `staff-layout.ts`), `totalWidth` can be smaller than `totalBars × PX_PER_CYCLE`. The playhead modulo then uses a smaller divisor than the ProgressionStrip cursor's denominator (`totalBars × PX_PER_CYCLE`), causing the staff playhead to loop faster than the strip cursor — the two went out of sync.

**Fix:** `_staffWidth` is now computed as:

```typescript
_staffWidth = Math.max(
  state.harmony.progression.reduce((sum, slot) => sum + (slot.bars ?? 1), 0) * PX_PER_CYCLE,
  MIN_STAFF_WIDTH
);
```

This uses the full progression duration directly, matching the ProgressionStrip cursor's denominator. The `?? 1` guard handles slots where `bars` is `undefined` (defaults to 1 bar per the progression data model). The `_staffWidth <= 0` guard in `updateHarmonyStaffDynamic` is unchanged (still present).

**Files:** `src/render/harmony-staff-scene.ts` — `_staffWidth` computation in `buildHarmonyStaffScene`.

### REVISE validation evidence

| Gate | Result |
| --- | --- |
| `pnpm exec tsc --noEmit` | exit 0 (0 errors) |
| `pnpm lint` | exit 0 (ESLint + Prettier clean; Prettier reformatted App.svelte) |
| `pnpm exec vitest run` | 385 passed, 0 failed (13 test files) — count unchanged |
| `pnpm build` | exit 0; pre-existing chunk-size advisory unchanged |

### REVISE Acceptance Coverage Table

| Acceptance ID | Bug fixed | Source evidence | Gap status after fix |
| --- | --- | --- | --- |
| A-08-08 | Bug 4: playhead sync (staffWidth = totalBars × PX_PER_CYCLE) | `harmony-staff-scene.ts`: `_staffWidth = Math.max(progression.reduce(…bars ?? 1…) * PX_PER_CYCLE, MIN_STAFF_WIDTH)` | proxy-covered (live: deferred to Pilot re-verification) |
| A-08-10 | Bug 1: staff lines span full canvas width | `drawStaticStaff` `lineWidth = app.screen.width` passed from `buildHarmonyStaffScene` | proxy-covered (live: deferred to Pilot re-verification) |
| A-08-10 | Bug 2: clef curl on G4 line | `TREBLE_CLEF_Y_OFFSET = 26` (was 10) | proxy-covered (live: deferred to Pilot re-verification) |
| A-08-11 | Bug 3: instructional text gated by subview | `App.svelte`: `{#if view === 'harmony'}{#if subview === 'tonnetz'}…{:else}…{/if}{/if}` | proxy-covered (live: deferred to Pilot re-verification) |

### REVISE Terminal commit

- **Terminal commit:** `fix(harmony): Phase 08 post-verification — staff lines, clef position, subview text, playhead sync`
  - Hash: self-referential — not recorded

---

## Post-verification REVISE II — Playhead gating and strip cursor sync

**Date:** 2026-06-12
**Iteration:** 2 (post-Pilot live-verification, second pass)

### REVISE II Background

After the first REVISE round was merged, the Pilot identified two additional bugs during live verification that were not caught by static analysis:

- **BUG A** — Both playheads (staff playhead in `harmony-staff-scene.ts` and ProgressionStrip cursor in `ProgressionStrip.svelte`) animated before any audio was playing. The rAF loop and PIXI tick drew the playhead line unconditionally whenever the progression was non-empty, regardless of transport state.
- **BUG B** — The ProgressionStrip cursor looped over only one chord's span rather than the full progression. Root cause: the `tick()` closure referenced `totalBars * PX_PER_CYCLE` where `totalBars` is a `$:` reactive variable that may include transient `resizeBars` overrides, and is not guaranteed to reflect the true musical duration inside a rAF tick. This caused the modulo denominator to be smaller than expected, making the cursor loop much too quickly.

### Bug A fix — Playhead gating on transport state

**`src/render/harmony-staff-scene.ts` — `updateHarmonyStaffDynamic`:**

Added a guard after `_dynGfx.clear()`:

```typescript
// BUG A fix: do not draw the playhead when nothing is playing.
if (state.nowPlaying.source === null) return;
```

When `nowPlaying.source === null`, the `_dynGfx` is cleared and the function returns without drawing the playhead line. The playhead is invisible when the transport is stopped.

The `nowPlaying.source` field in `SessionState` is `null` when nothing is playing; it is set to `'rhythm'`, `'harmony'`, `'session'`, etc., by the transport actions in `session.ts`. This is the correct flag per the session state model (A-08-08).

**`src/ui/ProgressionStrip.svelte` — cursor rAF loop:**

Two changes:

1. The `$:` reactive block that starts/stops the cursor loop now gates on **both** `nowPlaying.source !== null` AND `progression.length > 0`:

   ```svelte
   $: {
     const isPlaying = $sessionStore.nowPlaying.source !== null;
     const hasSlots = $sessionStore.harmony.progression.length > 0;
     if (isPlaying && hasSlots) {
       startCursorLoop();
     } else {
       stopCursorLoop();
     }
   }
   ```

2. Inside `tick()`, the first check is `if (state.nowPlaying.source === null) { cursorVisible = false; _cursorRaf = null; return; }` — this stops an already-running loop immediately if playback stops.

When not playing, `cursorVisible = false` and the cursor div is hidden.

### Bug B fix — Explicit `cursorTotalWidth` reactive declaration

Added a new `$:` reactive declaration in `ProgressionStrip.svelte`:

```svelte
$: cursorTotalWidth =
  $sessionStore.harmony.progression.reduce((s, slot) => s + (slot.bars ?? 1), 0) *
  PX_PER_CYCLE;
```

This mirrors the `_staffWidth` formula in `harmony-staff-scene.ts` exactly:

- Both use `slot.bars ?? 1` fallback
- Both multiply by `PX_PER_CYCLE` (= 48 in the local const for ProgressionStrip; imported from `time-map.ts` for the staff scene — vigent coordination-point rule)
- Neither includes `resizeBars` overrides (which are transient UI state, not musical duration)

The `tick()` function now uses `cursorTotalWidth` instead of `totalBars * PX_PER_CYCLE`:

```javascript
if (cursorTotalWidth <= 0) { ... return; }
cursorX = ((rawX % cursorTotalWidth) + cursorTotalWidth) % cursorTotalWidth;
```

This ensures the ProgressionStrip cursor and the staff playhead share the same modulo denominator regardless of resize-drag state.

### REVISE II files touched

- `src/render/harmony-staff-scene.ts` (BUG A: `nowPlaying.source === null` guard in `updateHarmonyStaffDynamic`; module comment updated)
- `src/ui/ProgressionStrip.svelte` (BUG A: `isPlaying` gate in reactive block and in `tick()`; BUG B: `cursorTotalWidth` reactive declaration replacing `totalBars * PX_PER_CYCLE`)
- `docs/orbifold-v2/handoffs/phase-08-handoff.md` (this file)

### REVISE II validation evidence

| Gate | Result |
| --- | --- |
| `pnpm exec tsc --noEmit` | exit 0 (0 errors) |
| `pnpm lint` | exit 0 (ESLint + Prettier clean; Prettier reformatted ProgressionStrip.svelte after cursor block expansion) |
| `pnpm exec vitest run` | 385 passed, 0 failed (13 test files) — count unchanged from phase baseline |
| `pnpm build` | exit 0; pre-existing chunk-size advisory and dynamic-import advisories unchanged |

### REVISE II Acceptance Coverage Table

| Acceptance ID | Bug fixed | Source evidence | Gap status after fix |
| --- | --- | --- | --- |
| A-08-08 | BUG A: staff playhead no longer draws when not playing | `harmony-staff-scene.ts`: `if (state.nowPlaying.source === null) return` after `_dynGfx.clear()` in `updateHarmonyStaffDynamic` | proxy-covered (live: deferred to Pilot re-verification) |
| A-08-12 | BUG A: ProgressionStrip cursor hidden when not playing | `ProgressionStrip.svelte`: `startCursorLoop()` gated on `isPlaying && hasSlots`; `tick()` exits on `source === null` | proxy-covered (live: deferred to Pilot re-verification) |
| A-08-12 | BUG B: ProgressionStrip cursor loops over full progression | `ProgressionStrip.svelte`: `cursorTotalWidth` explicit reactive declaration matches `_staffWidth` formula exactly; `tick()` uses `cursorTotalWidth` as modulo denominator | proxy-covered (live: deferred to Pilot re-verification) |
| A-08-08 | BUG B cross-check: staff and strip share same denominator | `harmony-staff-scene.ts` `_staffWidth = progression.reduce(...bars ?? 1...) * PX_PER_CYCLE` (from REVISE I); `ProgressionStrip.svelte` `cursorTotalWidth` uses identical formula | proxy-covered |

### REVISE II Terminal commit

- **Terminal commit:** `fix(harmony): Phase 08 post-verification II — playhead gating and strip cursor sync`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.
