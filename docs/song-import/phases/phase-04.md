<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 04 — Song-Import: Closing Polish (Manual Chord-Quality Placement + Latency Offset Recalibration)

**Purpose:** Close out the `song-import` initiative with two targeted fixes the Pilot found during Phase 03 manual verification — a manual way to place `dim`/`aug`/`pow` chords, and a recalibration of the playhead's fixed (non-progressive) audio-latency offset — so Phases 01–04 become merge-ready to `main`.

**Gate:** `song-import` Phase 03 complete on branch `song-import/phase-02` (carries Phase 01–03 commits; 2178 tests; `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` all pass clean). OD-8 and OD-9 (below) must be resolved by the Pilot before step 04.2 begins; OD-10 must be resolved before step 04.3 begins. All three are resolved at the step 04.1 inventory checkpoint, once the inventory has mapped the relevant facts.

**Expected phase result:** (1) `setChordQuality(index, qual)` in `src/state/session.ts` plus a quality control in `src/ui/Header.svelte`'s harmony attribute panel, letting the user assign `dim`, `aug`, or `pow` (and, per OD-9, possibly `maj`/`min`) to any selected chord slot — the only input path for these three qualities, since Tonnetz clicks only ever produce `maj`/`min` triangles and this must NOT change (OD-2). (2) A recalibrated latency-offset formula (exact mechanism per OD-10) that measurably reduces — but does **not** eliminate — the constant (non-progressive) gap between the visual playhead and audible playback, without fighting the existing manual `±200ms` calibration knob. (3) All quality gates pass; total test count increases from the Phase 03 baseline of 2178. (4) Phases 01–04 of `song-import` are declared merge-ready to `main`.

> **Merge note:** This is the closing phase of the `song-import` initiative. Phase Acceptance covers Phases 01–04 together. On Pilot approval, `song-import/phase-02` (carrying Phases 01–04) is ready to merge to `main`. The Pilot decides exact merge timing.

> **Out of scope (explicit triage, not silently dropped):** (1) AI chart-quality / OD-4's LLM-native limitation — no prompt tuning in this phase; that is a future initiative (real chart sourcing). (2) Progressive playhead drift (the two clocks — `performance.now()` and the Web Audio clock — running independently and diverging over time) — Win B fixes only the fixed/constant offset component; drift requires re-architecting the playhead onto the audio clock and is deferred. (3) YouTube oEmbed link resolution — re-deferred past Phase 04 per the OD-5 amendment (2026-07-10) in `docs/song-import/decisions.md`; it addresses none of the three triaged pains. (4) Compound/irregular time signatures — unrelated to this phase's findings, remains deferred.

---

## Architecture constraints for every step

**Prototype-parity checklist item does NOT apply.** Neither Win is a port from `reference/orbifold.html` — Win A is new UI/state surface, Win B is a bug fix to logic introduced in a prior initiative (`orbifold-v2` Phase 04, commit `1d8f376`), not the prototype. No prototype citation is required in either step's handoff.

**Reversibility/flag-off checklist item does NOT apply in its usual form.** Neither Win is gated behind a feature flag: Win A is opt-in by construction (a user must select a slot and change its quality — nothing changes for users who don't touch the control); Win B changes the default auto-offset formula unconditionally for everyone, but the existing manual calibration knob (`±200ms`, reset-to-0, `src/ui/LatencyCalibration.svelte`) remains available as a user-facing counter-nudge, and the change is a plain `git revert` away if the Pilot's manual check finds it makes things worse. Do not invent a flag for either Win.

**OD-2 is a hard invariant, restated:** `pow` (and, by the same reasoning, `dim`/`aug`) never gets a Tonnetz triangle. `mkTri` in `src/core/theory/tonnetz.ts` (lines 110–135) generates only `'maj'`/`'min'` triangles and must NOT be touched in this phase. A step that proposes a `pow`/`dim`/`aug` triangle is out of scope and must be flagged to the Pilot, not implemented.

**No new npm dependencies.** No new files are anticipated for either Win (Win A touches `session.ts` + `Header.svelte` + i18n files; Win B touches `phase-anchor.ts` + `strudel.ts` + `vite-env.d.ts`). If the Dev's implementation genuinely requires a new file, it must carry the AGPL-3.0 header per convention.

**Win B must not touch the playhead-consumer render files.** The fix is centralized in `phase-anchor.ts`/`strudel.ts`. None of the files that call `getVisualPhaseAnchor()` for their own playhead math (`src/render/pentagrama-scene.ts`, `src/ui/ProgressionStrip.svelte`, `src/render/rhythm-scene.ts`, and any others the inventory finds — see step 04.1(c)) should need modification. If the Dev finds a reason to modify one of them, that is a scope escalation to raise with the Pilot, not a default action.

**Win B: `measureLatencyOffsetMs`'s call sites in `tests/phase-anchor.test.ts` must keep working unchanged.** The four existing unit tests call `measureLatencyOffsetMs(ctx)` with a single argument. Any signature change must make new parameters optional with a default that reproduces today's behavior, so those four tests pass without editing their call sites (only add new tests; do not touch the existing four).

**Win B: the pre-existing JSDoc rationale in `phase-anchor.ts` (lines 36–40) must be reconciled, not silently overridden.** That comment currently argues scheduler lookahead should NOT be compensated ("Including it would over-compensate by ~100 ms and invert the bug"). The Phase 04 brief's diagnosis is the opposite: the fixed offset comes from excluding exactly that term. Step 04.1 requires a technical verdict (grounded in Strudel's actual scheduling source, not memory — see the "Live sources" guardrail in `CLAUDE.md`) before step 04.3 writes any code. If the verdict confirms the brief's diagnosis, the JSDoc must be corrected (not just silently contradicted) when the fix lands.

**Decisions Register (`docs/song-import/decisions.md`) and `docs/orbifold-v1/decisions.md`:** required reading every invocation. Only the Pilot writes.

**AGPL-3.0 header:** unaffected — all touched files already carry it; preserve it.

---

## Open Decisions (Pilot resolves at the step 04.1 inventory checkpoint)

### OD-8 — Win A input mechanism

**Option A — Header selected-slot quality control (Pilot leans this way):** Extend the existing harmony attribute panel in `Header.svelte` (the `.sound-ctl`-style area, ~lines 800–834, always rendered in Harmony view) with a quality control wired to `setChordQuality`. Follows the same "select a slot, edit its attribute" pattern already used for oscillator/preset (`handleSoundChange`, ~lines 325–348). No new interaction paradigm for the user to learn.

**Option B — Tonnetz edge-hit `pickPow` (or similar spatial gesture):** Add a new hit-test on Tonnetz edges (not vertices) to place a quality that has no triangle. This invents a new spatial interaction model, needs its own visual affordance (edges currently have no click semantics), and risks confusing the vertex-click-places-a-note / triangle-click-places-a-chord vocabulary already established. Not recommended — bigger surface for a closing-polish phase.

**Recommendation: Option A.** Zero new interaction model, reuses proven UI plumbing, and the panel already has the selected-slot context (`selSlot`, `selIsChord`, `$selectedSlotIdxStore`) that `setChordQuality` needs.

### OD-9 — Which qualities the control exposes

**Option A — All five (`maj`/`min`/`dim`/`aug`/`pow`) (Pilot leans this way):** The control is a single source of truth for chord quality, whether or not the quality is also reachable via Tonnetz. Simpler mental model ("this is the chord's quality — change it here"), and lets a user turn a Tonnetz-placed `maj` into `dim` without deleting and re-placing.

**Option B — Only the three unreachable ones (`dim`/`aug`/`pow`):** Narrower scope; `maj`/`min` stay Tonnetz-only. Risk: a user who wants to go from `dim` back to `maj` has no path except deleting the slot and re-clicking a Tonnetz triangle — asymmetric and confusing.

**Recommendation: Option A.** Symmetric, and does not remove any existing capability (Tonnetz clicks still work exactly as before for creating new `maj`/`min` chords — this control only edits the quality of an already-placed slot).

### OD-10 — Win B recalibration approach

**Context:** `measureLatencyOffsetMs(ctx)` in `src/state/phase-anchor.ts` currently returns only `(ctx.outputLatency + ctx.baseLatency) * 1000` (hardware output path). It deliberately excludes the Strudel `Cyclist`'s scheduler-lookahead constant (`_scheduler.latency`, default `0.1` s / 100 ms) — per the JSDoc's own reasoning, which the step 04.1 inventory must verify against Strudel's actual source rather than trust as-is (see the architecture constraint above). A separate, user-adjustable manual calibration knob (`getCalibrationOffsetMs`/`setCalibrationOffsetMs`, `±200ms`, persisted to `localStorage['orbifold:latencyCalibMs']`) already exists and is summed additively with the auto-measured offset in `syncVisualPhaseAfterRunNow` (`src/audio/strudel.ts` lines 98–115).

**Option A — Auto-include scheduler lookahead in `measureLatencyOffsetMs`:** Extend the pure function's signature with an optional `schedulerLatencySec` parameter (default `0`, so the four existing unit tests keep passing unmodified) and have `syncVisualPhaseAfterRunNow` pass `_scheduler.latency` in. Requires declaring `latency: number` on the `Cyclist` interface in `src/vite-env.d.ts` (currently omitted). Correct only if the inventory's verdict confirms the lookahead constant does shift the actual audible Web-Audio-scheduled trigger time forward (not just an internal buffering detail).

**Option B — Adjust the manual knob's default:** Leave the auto-measured formula untouched; instead change the manual knob's starting default away from `0` (e.g., to `-100`) so a fresh install starts pre-compensated. Simpler (no `Cyclist` interface change), but less honest — it hides the root cause inside a "manual, user-adjustable" value instead of fixing the actual measurement, and a user who resets to `0` (the reset button already exists) would reintroduce the bug.

**Option C — Both:** Fold the lookahead into the auto-measured offset (Option A) AND leave the manual knob's default at `0` so it is purely a fine-tune on top of a now-more-correct baseline.

**Recommendation: surfaced with no default — resolve after step 04.1's inventory maps the existing knob and, critically, after the inventory's Strudel-source verdict on what `Cyclist.latency` actually does.** If the verdict shows the lookahead constant does not shift audible output (validating the current JSDoc), none of Options A/B/C apply and Win B's fix target changes — the Pilot must be told this explicitly rather than have the Dev proceed on the brief's assumption alone.

---

## Step 04.1 — Inventory

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, and `docs/song-import/phases/phase-04.md` (this file) before doing anything else. Perform a read-only inventory of the files and questions below. Produce `docs/song-import/inventories/phase-04-inventory.md` containing sections (a) through (h). Do not write or modify any source file. STOP for Pilot review — OD-8, OD-9, and OD-10 must be resolved before steps 04.2/04.3 begin.

**Required reading (in order):** `src/state/session.ts` (the setter pattern around `setChordBars`/`setChordInstrument`/`setChordSoundAttrs`/`setChordPreset`/`setChordOscillator`); `src/core/theory/chords.ts` (`Quality`, `QUAL_INTERVALS`, `chordLabel`); `src/core/theory/tonnetz.ts` lines 105–140 (`mkTri`); `src/ui/Header.svelte` lines 260–350 and 780–836 (the harmony attribute panel and its reactive selection state); `src/i18n/types.ts` and all four locale files under `src/i18n/locales/`; `src/state/phase-anchor.ts` (full); `src/audio/strudel.ts` lines 1–130; `src/vite-env.d.ts` (the `Cyclist` interface); `tests/phase-anchor.test.ts` (full); `src/ui/LatencyCalibration.svelte` (full); `docs/_archive/orbifold-v2/inventories/phase-04-inventory.md` (the prior initiative's inventory that built the manual knob — context, not a template to re-derive).

**Implementation requirements** (what to produce, sections (a)–(h)):

- **(a) `setChordQuality` design.** State the exact signature and body (pseudocode) mirroring `setChordPreset`'s guard pattern (range guard → `slot === undefined || 'isRest' in slot || isNoteSlot(slot)` guard → `.map` update → `requeueLive()`). Confirm `Quality` is already imported in `session.ts` (no new import needed). Confirm codegen (`chordToStrudel`), voice-track rendering (`voice-tracks.ts` pow guard), and Pentagrama render (dmap-miss → accent-color fallback) already handle all five qualities with zero changes required.

- **(b) Header UI insertion point + i18n audit.** Reproduce the current `.sound-ctl` panel region (Header.svelte ~780–836) and confirm it is inside `{#if $sessionStore.view === 'harmony'}` and is **always rendered** in that view (not conditionally shown only when a slot is selected — the active/pulse classes change, not the panel's presence). State whether the new quality control should follow that same "always visible, edit vs. intent" pattern, or should be edit-only (disabled/hidden when `$selectedSlotIdxStore === null`) given that quality has no natural "intent for the next chord" concept (new chords are always created `maj`/`min` via Tonnetz click). Recommend one, with a one-sentence rationale, for the Pilot to confirm alongside OD-8. List the exact new i18n keys needed in `src/i18n/types.ts` and all four locale files (mirroring `soundLabel`/`instrSawtooth`/etc. at `types.ts:108,127` and `es.ts:90–104`) — e.g. a label key plus one key per quality. Note that `chordLabel` (`chords.ts:50–55`) already has a display-suffix convention (`m`/`°`/`+`/`5`, none for `maj`) available for reuse as the control's visual symbols.

- **(c) Playhead consumer census.** Grep for every consumer of `getVisualPhaseAnchor()`. The brief names three (`pentagrama-scene.ts`, `ProgressionStrip.svelte`, `rhythm-scene.ts`); confirm the exact count (do not assume it is three) and list every file and line. Confirm all consumers read the same shared anchor (no per-consumer offset state) so the Win B fix is provably centralized.

- **(d) Cyclist.latency technical verdict — hard prerequisite for OD-10.** Reconcile the contradiction: `phase-anchor.ts`'s existing JSDoc (lines 36–40) claims scheduler lookahead should NOT be compensated; the Phase 04 brief's diagnosis is that excluding it is exactly the bug. Trace Strudel's actual `Cyclist`-equivalent scheduling implementation (in the pinned `@strudel/web@1.0.3` bundle, or the live docs at `https://strudel.cc/learn/` per the "Live sources" guardrail — do not rely on memory) to determine definitively whether `latency` shifts the real Web-Audio-scheduled trigger time of every hap forward by that amount, or is purely an internal scheduling-buffer detail with no audible effect. State the verdict explicitly, with the exact evidence (file/line or doc quote) backing it. This verdict gates which OD-10 option (if any) is viable.

- **(e) Manual-knob interaction / double-compensation risk.** Reproduce the current additive formula in `syncVisualPhaseAfterRunNow` (`offsetMs = measureLatencyOffsetMs(ctx) + getCalibrationOffsetMs()`) and the manual knob's mechanics (`±10ms` nudge buttons, `±200ms` clamp, `localStorage['orbifold:latencyCalibMs']`, reset-to-0). State precisely how auto-including the lookahead term (OD-10 Option A) would interact with a user who has already nudged the manual knob to informally compensate for the missing term — this is raw material for OD-10, not a decision to make here.

- **(f) `Cyclist` interface gap.** Reproduce the current interface in `src/vite-env.d.ts` and confirm it omits `latency`. State the exact one-line addition needed if OD-10 requires reading `_scheduler.latency` from `strudel.ts`.

- **(g) `measureLatencyOffsetMs` signature options.** Confirm the four existing tests in `tests/phase-anchor.test.ts` all call the function with a single argument. State that any signature change must default new parameters to reproduce current behavior so those four calls need no edits.

- **(h) Exhaustiveness / dependency audit.** List every file to modify in steps 04.2 and 04.3 (no new files expected — flag it if the Dev's design needs one). Confirm no new npm dependencies. Confirm test count going in is 2178.

**Validation:**
- `docs/song-import/inventories/phase-04-inventory.md` exists with all eight lettered sections. Covers A-04-01.
- Section (d) states an explicit, evidence-backed verdict (not a hedge). Covers A-04-02.
- Section (b) states a UI-mechanics recommendation and the full i18n key list. Covers A-04-03.
- Section (c) states an exact, re-verified consumer count. Covers A-04-04.
- OD-8, OD-9, and OD-10 remain formally open in the phase file — this step maps facts for the Pilot, it does not resolve them. Covers A-04-05.
- `git status`/`git diff` show no source file changes from this step — inventory only. Covers A-04-06.

**Expected result:**
- The inventory file exists, is internally consistent with the source it cites, and gives the Pilot everything needed to resolve OD-8/OD-9/OD-10 in one sitting.

CHECKPOINT → Commit message:
`docs(inventory): Phase 04 step 04.1 — read-only inventory, OD-8/OD-9/OD-10 open`

---

## Step 04.2 — Win A: `setChordQuality` + Header quality control

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, `docs/song-import/phases/phase-04.md` (this file), and `docs/song-import/inventories/phase-04-inventory.md` before editing. The Pilot has resolved OD-8 and OD-9. Apply the resolutions exactly. Implement `setChordQuality` in `session.ts`, wire the Header quality control per the resolved UI mechanics, add the i18n keys, and write unit tests. Do NOT add a Tonnetz triangle for any quality (OD-2). Do NOT touch codegen or render — the inventory confirmed neither needs changes. STOP for Planner review.

**Implementation requirements:**
- `setChordQuality(index: number, qual: Quality): void` exported from `src/state/session.ts`, placed alongside the other per-slot chord setters, following the exact guard/update/`requeueLive()` pattern confirmed in inventory section (a).
- Header quality control in `src/ui/Header.svelte`, wired to `setChordQuality`, per OD-8/OD-9's resolved shape and inventory section (b)'s edit-only-vs-intent recommendation (as confirmed by the Pilot).
- i18n keys added to `src/i18n/types.ts` and all four locale files (`en.ts`, `es.ts`, `pt.ts`, `zh.ts`), per the list from inventory section (b). Technical quality tokens (`maj`/`min`/`dim`/`aug`/`pow`) stay `[VERBATIM]` in value attributes per the existing OQ-6/ADR 0017 convention; only display labels come from i18n.
- Unit tests in `tests/session.test.ts`, mirroring the existing `describe('setChordBars', ...)` pattern: happy-path quality change, out-of-range no-op, rest-slot/`NoteSlot` no-op.

**Validation:**
- `pnpm exec vitest run tests/session.test.ts` — new tests green. Covers A-04-08, A-04-09, A-04-10.
- Read `session.ts` — `setChordQuality` exported, guard pattern matches `setChordPreset`. Covers A-04-07.
- Read `Header.svelte` — quality control present, wired to `setChordQuality`, respects the resolved edit-only-vs-intent behavior. Covers A-04-11.
- Read `types.ts` + all four locale files — new keys present, no missing key per locale. Covers A-04-12.
- Read `tonnetz.ts` — `mkTri` unmodified; no triangle logic added for `dim`/`aug`/`pow`. Covers A-04-14.
- `pnpm dev` manual check (Pilot or Dev, recorded in handoff): select a chord slot, change its quality to `dim`, `aug`, and `pow` in turn; confirm Pentagrama recolors to `accent` `#8aa0ff` for `pow` and shows no Tonnetz triangle for any of the three; press Play and confirm audible output matches the expected voicing for each quality. Covers A-04-13.
- `pnpm test` — total count ≥ 2178, no regressions. Covers A-04-15.
- `pnpm exec tsc --noEmit` — exits 0. Covers A-04-16.

**Expected result:**
- A user can select any chord slot (however it was placed) and change its quality to any of the five values from a single control; `dim`/`aug`/`pow` are reachable for the first time without editing saved-session JSON by hand.

CHECKPOINT → Commit message:
`feat(harmony): Phase 04 step 04.2 — setChordQuality + Header quality control`

---

## Step 04.3 — Win B: latency offset recalibration

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, `docs/song-import/phases/phase-04.md` (this file), and `docs/song-import/inventories/phase-04-inventory.md` before editing. The Pilot has resolved OD-10, informed by inventory section (d)'s technical verdict. Apply the resolution exactly — if the verdict does not support any of Options A/B/C, do not implement a fix; report back and stop. Do NOT modify any playhead-consumer render file. Do NOT change the four existing `phase-anchor.test.ts` call sites. STOP for Planner review.

**Implementation requirements (assuming OD-10 = Option A or C; adapt per the Pilot's actual resolution if different):**
- `src/vite-env.d.ts` — add `latency: number;` to the `Cyclist` interface.
- `src/state/phase-anchor.ts` — extend `measureLatencyOffsetMs(ctx: AudioContext, schedulerLatencySec = 0): number` to add `schedulerLatencySec * 1000` to the returned value. Correct the JSDoc (lines 36–40 area) to no longer claim the lookahead "should not" be compensated; replace it with the verified rationale from inventory section (d), citing where the evidence lives.
- `src/audio/strudel.ts` — `syncVisualPhaseAfterRunNow` passes `_scheduler?.latency ?? 0` as the new second argument to `measureLatencyOffsetMs`.
- If OD-10 = Option B or includes a manual-knob-default change, implement that instead/additionally exactly as the Pilot resolved it — do not improvise beyond the resolution.
- Acceptance wording for the manual criterion below MUST say "reduces" the offset, never "eliminates" or "perfectly synced." Progressive drift is out of scope and unaddressed by this step — say so plainly in the handoff, do not let the manual criterion imply otherwise.

**Validation:**
- Read `vite-env.d.ts` — `Cyclist.latency` declared. Covers A-04-17.
- `pnpm exec vitest run tests/phase-anchor.test.ts` — the four pre-existing tests pass **unmodified**; a new test asserts the lookahead term is included (e.g. a non-zero `schedulerLatencySec` argument changes the result by exactly that amount, in ms). Covers A-04-18, A-04-19.
- Read `strudel.ts` — `syncVisualPhaseAfterRunNow` passes the live scheduler latency into the offset computation. Covers A-04-20.
- Read `phase-anchor.ts` — JSDoc no longer contradicts the implemented behavior. Covers A-04-21.
- `git diff --stat` — none of the playhead-consumer render files (per inventory section (c)'s exact list) appear in the diff. Covers A-04-22.
- Manual, Pilot-verified: play a composition/groove with the manual calibration knob at `0`; observe whether the constant see-vs-hear offset between the visual downbeat flash and the audible downbeat is perceptibly smaller than on pre-phase `main`. This is subjective and Pilot-adjudicated — the Dev records what was observed, not a self-graded pass. Covers A-04-23.
- `pnpm test` — total count ≥ 2178 + Win A's new tests, no regressions. Covers A-04-24.
- `pnpm exec tsc --noEmit` — exits 0. Covers A-04-25.

**Expected result:**
- The constant (non-progressive) portion of the see-vs-hear playhead offset is measurably smaller than before this step, on identical hardware, with the manual knob at its default. Progressive drift remains present and is explicitly out of scope.

CHECKPOINT → Commit message:
`fix(audio): Phase 04 step 04.3 — recalibrate fixed latency offset`

---

## Step 04.4 — Quality gate + Phases 01–04 merge-readiness declaration

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, and `docs/song-import/phases/phase-04.md` before doing anything else. Run the full quality gate in order: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`. Report exact output for each. Confirm total test count is above 2178. State the Phases 01–04 merge-readiness verdict. STOP for Planner review.

**Implementation requirements:**
- Run each command in order; if any fails, diagnose root cause, apply a targeted fix (no unrelated refactors), re-run, and report both the original failure and the fix.
- In the handoff: exact final output of each command; total test count; confirmation it exceeds 2178; the merge-readiness statement (below); confirmation that OD-8, OD-9, and OD-10's resolutions are recorded in `docs/song-import/decisions.md` (Pilot writes the Register; Dev confirms presence); an explicit restatement of Win B's honesty framing (offset reduced, not eliminated; progressive drift still deferred).

**Validation:**
- `pnpm test` — all pass, count strictly greater than 2178. Covers A-04-26.
- `pnpm exec tsc --noEmit` — exits 0. Covers A-04-27.
- `pnpm lint` — exits 0. Covers A-04-28.
- `pnpm build` — exits 0. Covers A-04-29.
- Handoff states exact count and confirms it exceeds 2178. Covers A-04-30.
- Handoff includes the merge-readiness statement for Phases 01–04. Covers A-04-31.
- Handoff confirms OD-8/OD-9/OD-10 are present in the Register. Covers A-04-32.
- Handoff restates the "reduced, not eliminated" / drift-deferred framing for Win B. Covers A-04-33.

**Expected result:**
- Merge-readiness statement: "Phases 01–04 of the `song-import` initiative are complete. Branch `song-import/phase-02` is ready to merge to `main` pending Pilot approval."

CHECKPOINT → Commit message:
`chore(quality): Phase 04 step 04.4 — quality gate: all checks pass, Phases 01–04 merge-ready`

---

## Phase Acceptance

This phase's acceptance covers the entire `song-import` initiative (Phases 01–04). All criteria below must pass before the branch is merge-worthy to `main`.

### Phase 04 step-level criteria

- **A-04-01** — Inventory exists with all eight lettered sections.
  - Validation method: `manual`
- **A-04-02** — Inventory section (d) states an explicit, evidence-backed verdict on `Cyclist.latency`'s audible effect.
  - Validation method: `manual`
- **A-04-03** — Inventory section (b) states a UI-mechanics recommendation and full i18n key list.
  - Validation method: `manual`
- **A-04-04** — Inventory section (c) states an exact, re-verified playhead-consumer count.
  - Validation method: `manual`
- **A-04-05** — OD-8/OD-9/OD-10 remain formally open in the phase file after the inventory (facts mapped, not resolved by the Dev).
  - Validation method: `manual`
- **A-04-06** — Inventory produced by reading only; no source files modified.
  - Validation method: `manual`
- **A-04-07** — `setChordQuality` exported from `session.ts`; guard pattern matches the established per-slot setter convention.
  - Validation method: `proxy:static-analysis`
- **A-04-08** — Unit test: `setChordQuality` updates `progression[index].qual` on a valid chord slot.
  - Validation method: `unit`
- **A-04-09** — Unit test: `setChordQuality` is a no-op for an out-of-range index.
  - Validation method: `unit`
- **A-04-10** — Unit test: `setChordQuality` is a no-op for a rest slot / `NoteSlot`.
  - Validation method: `unit`
- **A-04-11** — Header quality control present, wired to `setChordQuality`, per the resolved OD-8/OD-9 shape.
  - Validation method: `proxy:static-analysis`
- **A-04-12** — i18n keys for the quality control present in `types.ts` and all four locale files.
  - Validation method: `proxy:static-analysis`
- **A-04-13** — Manual: selecting a slot and changing its quality to `dim`/`aug`/`pow` updates Pentagrama render (accent color, no triangle for `pow`) and produces correct audible output.
  - Validation method: `manual`
- **A-04-14** — `mkTri`/Tonnetz triangle logic unmodified; no triangle added for any non-triadic-input quality (OD-2 preserved).
  - Validation method: `proxy:static-analysis`
- **A-04-15** — All tests pass after step 04.2 (count ≥ 2178).
  - Validation method: `operability`
- **A-04-16** — `pnpm exec tsc --noEmit` passes clean after step 04.2.
  - Validation method: `operability`
- **A-04-17** — `Cyclist` interface declares `latency: number` (or the Pilot's actual OD-10 equivalent).
  - Validation method: `proxy:static-analysis`
- **A-04-18** — `measureLatencyOffsetMs`'s formula change is proven by a passing new unit test; the four pre-existing tests pass unmodified.
  - Validation method: `unit`
- **A-04-19** — New unit test asserts the lookahead term's exact contribution to the returned offset.
  - Validation method: `unit`
- **A-04-20** — `syncVisualPhaseAfterRunNow` wires the live scheduler-latency value into the offset computation.
  - Validation method: `proxy:static-analysis`
- **A-04-21** — `phase-anchor.ts` JSDoc no longer contradicts the implemented behavior.
  - Validation method: `proxy:static-analysis`
- **A-04-22** — No playhead-consumer render file is modified by step 04.3.
  - Validation method: `proxy:static-analysis`
- **A-04-23** — Manual, Pilot-verified: the constant see-vs-hear offset is perceptibly reduced (never claimed eliminated); progressive drift explicitly still present.
  - Validation method: `manual`
- **A-04-24** — All tests pass after step 04.3 (count ≥ 2178 + Win A's new tests).
  - Validation method: `operability`
- **A-04-25** — `pnpm exec tsc --noEmit` passes clean after step 04.3.
  - Validation method: `operability`
- **A-04-26** — `pnpm test` all pass; count strictly greater than 2178 (final gate).
  - Validation method: `operability`
- **A-04-27** — `pnpm exec tsc --noEmit` exits 0 (final gate).
  - Validation method: `operability`
- **A-04-28** — `pnpm lint` exits 0 (final gate).
  - Validation method: `operability`
- **A-04-29** — `pnpm build` exits 0 (final gate).
  - Validation method: `operability`
- **A-04-30** — Handoff includes exact test count and confirmation it exceeds 2178.
  - Validation method: `manual`
- **A-04-31** — Handoff includes the merge-readiness statement for Phases 01–04.
  - Validation method: `manual`
- **A-04-32** — Handoff confirms OD-8/OD-9/OD-10 resolutions are recorded in the Decisions Register.
  - Validation method: `manual`
- **A-04-33** — Handoff restates Win B's "reduced, not eliminated" honesty framing and the deferred-drift status.
  - Validation method: `manual`

### Cross-initiative merge criteria (Phases 01–04 together)

Carried forward from Phase 03; must remain unbroken at Phase 04 completion:

- **X-01** — `Quality` includes `'pow'`; `QUAL_INTERVALS['pow'] = [0, 7]`; `chordToStrudel` with `qual='pow'` produces `note("E2,B2")` for E at octave 2.
  - Validation method: `operability` (existing tests pass in step 04.4's `pnpm test`)
- **X-02** — `Block.label?: string` accepted by `SavedBlockSchema` and round-trips through serialize/deserialize.
  - Validation method: `operability`
- **X-03** — `importSession(fixture)` deep-equals its updated golden `SavedSession`.
  - Validation method: `operability`
- **X-04** — `SESSION_SCHEMA_VERSION === 7` and `SCHEMA_VERSION === 7`.
  - Validation method: `operability`
- **X-05** — `applyLoadedSession` with a Phase-01-era saved session (no `label` field) does not crash and does not fabricate a `label`.
  - Validation method: `operability`

## Operability requirements

- **Boot commands:** `pnpm dev` → app loads locally; Harmony view shows the new quality control when a chord slot is selected (Win A); playing any groove/composition exercises the recalibrated offset (Win B).
- **Required data:** none — no fixtures, seeds, or migrations (static client-only app).
- **Required env vars / flags:** none new. No change to the existing per-provider `localStorage` API-key convention.
- **Required headers / inter-service contracts:** not applicable — no backend, no new service boundary.
- **Migrations:** not applicable.
- **Smoke checks:** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` all clean at step 04.4 (A-04-26 through A-04-29); manually, selecting a chord slot and cycling its quality through all five values produces the expected Pentagrama color/audio for each (A-04-13); playing a groove/composition with the manual calibration knob at its default shows a smaller fixed see-vs-hear gap than pre-phase `main` (A-04-23).
- **Idempotency:** not applicable — no seed/bootstrap scripts introduced.

## Partial coverage from prior phase

- Phase 03 A-03-15–A-03-19 (manual parity verification, left pending at Phase 03 close) — **CLOSED**: the Pilot's own manual verification against those criteria is what produced the three triaged findings that define this phase's scope (AI-quality deferral, Win B, Win A). No further action needed on those IDs themselves.
- Phase 03's pending Register proposals (ADR 0026 amendment, ADR 0027, ADR 0028) — **already resolved**: all three ADRs are Status: Accepted in `docs/adr/`. No action needed in Phase 04.
- OD-5 (YouTube link handling) — **re-deferred, not addressed here**, per the 2026-07-10 amendment already recorded in `docs/song-import/decisions.md`. Not a Phase 04 deliverable.
- Progressive playhead drift (as opposed to the fixed offset fixed by Win B) — **permanently deferred out of this phase**: requires re-architecting the visual playhead onto the Web Audio clock, a bigger effort than "closing polish" scope. No Acceptance ID in this phase claims to address it.

## ADR Triggers

- **Corrected `Cyclist.latency` semantics and `measureLatencyOffsetMs` formula change (OD-10):** Trigger: step 04.3, if OD-10 resolves to Option A or C (auto-including scheduler lookahead) or otherwise changes the auto-offset formula. The ADR must document: the verified understanding of `Cyclist.latency`'s effect on audible timing (superseding the phase-anchor.ts JSDoc's original claim), the new `measureLatencyOffsetMs` signature, its interaction with the pre-existing manual calibration knob, and the explicit "reduces, does not eliminate; progressive drift stays deferred" acceptance framing. The Pilot writes it.
- **No ADR trigger for Win A.** `setChordQuality` is an additive state setter following an established pattern; no architectural decision is reversed or introduced (consistent with the equivalent judgment recorded in the archived `orbifold-v2` Phase 04 inventory for the analogous manual-knob feature).

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/song-import/handoffs/phase-04-handoff.md`. See the pattern established in `docs/song-import/handoffs/phase-03-handoff.md`. The phase-completion entry must include:

- A summary of all deliverables (files created/modified) for both Wins.
- The final test count progression table (Phase 01: 2104, Phase 02: 2129, Phase 03: 2178, Phase 04: ≥ 2178 + new).
- The merge-readiness statement: "Phases 01–04 of the `song-import` initiative are complete. Branch `song-import/phase-02` is ready to merge to `main` pending Pilot approval."
- Any pending Register proposals (OD-8/OD-9/OD-10 resolutions, and the conditional ADR from step 04.3 if triggered) for the Pilot to resolve at phase approval.
- Confirmation that OD-8, OD-9, and OD-10 are recorded in `docs/song-import/decisions.md` (the Pilot writes the Register entries; the Dev confirms they are present before declaring the phase complete).
- An explicit restatement, in the Dev's own words, of Win B's honesty constraint: the fixed offset is reduced, not eliminated; progressive drift is untouched and remains deferred.
