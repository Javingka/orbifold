<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 04 Handoff — Closing Polish (Manual Chord-Quality Placement + Latency Offset Recalibration)

---

## Step 04.1 — Inventory

**Date:** 2026-07-10
**Iteration:** 1 of 1

### Completed

- Read `CLAUDE.md`, the skill's `references/methodology.md` and `references/dev-role.md`, `docs/song-import/decisions.md` (in full), `docs/song-import/phases/phase-04.md` (in full), `docs/orbifold-v1/decisions.md` (in full, background), and `docs/glossary.md` (currently empty).
- Read all sources named in the step's PROMPT line and required for the eight sections: `src/state/phase-anchor.ts` (full), `src/vite-env.d.ts` (full), `src/audio/strudel.ts` (relevant ranges), `tests/phase-anchor.test.ts` (full), `src/ui/LatencyCalibration.svelte` (full), `src/state/session.ts` (setter functions and `Chord`/`Quality` typing), `src/core/theory/chords.ts`, `src/core/theory/tonnetz.ts`, `src/core/harmony/voice-tracks.ts`, `src/core/codegen/strudel.ts`, `src/render/pentagrama-scene.ts`, `src/ui/Header.svelte` (`.sound-ctl` region), `src/i18n/types.ts` + all four locale files, `tests/i18n/key-parity.test.ts`, `src/ui/ProgressionStrip.svelte`, `src/render/rhythm-scene.ts`, `src/render/tonnetz-scene.ts`, and the pinned `node_modules/@strudel/web/dist/index.mjs` bundle (traced call chain: `Cyclist`/`ji`, `webaudioScheduler`/`Ho`, `superdough`/`dr`, `onTriggerSample`/`xo`, `getOscillator`/`Lo`).
- Also read the archived `docs/_archive/orbifold-v2/inventories/phase-04-inventory.md` for context (per the phase file's history note) — confirmed its `Cyclist.latency` claim was asserted without source tracing and is refuted by this step's evidence.
- Produced `docs/song-import/inventories/phase-04-inventory.md` with all eight lettered sections (a)–(h).
- Ran `pnpm test` once (read-only) to confirm the Phase 03 baseline test count going in.
- No source files were modified. `git status`/`git diff` confirm the only new artifact from this session is the inventory file itself; the pre-existing uncommitted `docs/song-import/decisions.md` diff and untracked `docs/song-import/phases/phase-04.md` predate this session and are not touched.

### Files touched

- `docs/song-import/inventories/phase-04-inventory.md` (created)
- `docs/song-import/handoffs/phase-04-handoff.md` (this file, created)

### Validation evidence (per Acceptance ID)

- **A-04-01:** `docs/song-import/inventories/phase-04-inventory.md` exists with all eight lettered sections (a)–(h). Verified by file creation and structural review.
- **A-04-02:** Section (d) states an explicit, evidence-backed verdict — **YES, `Cyclist.latency` shifts the audible Web-Audio-scheduled trigger time of every hap forward** by its full value (default 100 ms) — grounded in a traced call chain through the pinned `@strudel/web@1.0.3` bundle (`Cyclist`/`ji` constructor line 3545–3546 → per-tick callback line 3557–3562 → `webaudioScheduler`/`Ho` line 5465–5476 → `superdough`/`dr` line 4967–4975 → native `.start()` calls at `onTriggerSample`/`xo` ~line 4832–4844 and `getOscillator`/`Lo` line 5274), with an explicit disambiguation from the unrelated `ym` internal tick-lookahead constant that happens to share the same `0.1` default. Not a hedge — the verdict directly contradicts the existing JSDoc in `phase-anchor.ts` (lines 36–40) and the archived Phase 04 inventory's prior (uncited) claim.
- **A-04-03:** Section (b) states a UI-mechanics recommendation (edit-only, not always-visible-with-intent, since quality has no "intent for next chord" concept — new chords are always Tonnetz-click-created `maj`/`min`) with one-sentence rationale, plus the full new i18n key list (`qualityLabel`, `qualityMaj/Min/Dim/Aug/Pow`, `qualityEditTip`, `qualityDisabledTip`) for `types.ts` and all four locale files, noting `es.ts` is the key-parity base per `tests/i18n/key-parity.test.ts`.
- **A-04-04:** Section (c) states an exact, re-verified consumer count of **FOUR** files (`pentagrama-scene.ts`, `ProgressionStrip.svelte`, `rhythm-scene.ts`, and `tonnetz-scene.ts`) — correcting the phase file's own architecture-constraints section, which names only three; `tonnetz-scene.ts` was not named there but is confirmed as a fourth consumer with exact line citations (imports + 2 usage expressions).
- **A-04-05:** OD-8, OD-9, and OD-10 remain formally open in `docs/song-import/phases/phase-04.md` — not edited by this step. The inventory maps facts (technical verdict, UI recommendation, consumer census, double-compensation risk) to support Pilot resolution without resolving any of the three itself. `docs/song-import/decisions.md` was read but not edited.
- **A-04-06:** `git status --short` confirms no source file was created, modified, or deleted by this step; the only new path is the inventory file. `git diff` on tracked files shows no change attributable to this session (the pre-existing `decisions.md` diff predates this session, per the Files touched note above).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
| --- | --- | --- | --- | --- |
| A-04-01 | Inventory exists with all eight lettered sections | n/a | manual | covered |
| A-04-02 | Section (d) states explicit, evidence-backed `Cyclist.latency` verdict (not a hedge) | n/a | manual | covered |
| A-04-03 | Section (b) states UI-mechanics recommendation and full i18n key list | n/a | manual | covered |
| A-04-04 | Section (c) states exact, re-verified playhead-consumer count | n/a | manual | covered |
| A-04-05 | OD-8/OD-9/OD-10 remain formally open after the inventory (facts mapped, not resolved by the Dev) | n/a | manual | covered |
| A-04-06 | Inventory produced by reading only; no source files modified | n/a | manual | covered |

No Acceptance IDs A-04-07 and beyond are touched by this step — they belong to steps 04.2, 04.3, and 04.4.

### Key findings for Pilot review

**Section (d) — the hard prerequisite is resolved with a definitive YES.** `Cyclist.latency` (default 100 ms, and confirmed unused/left-at-default in this app's `webaudioScheduler()` call with no options in `strudel.ts`) is additively baked into the absolute Web Audio deadline passed to native `.start(when)` for both sample and oscillator sound paths. The existing JSDoc in `phase-anchor.ts` claiming it is internal-only and would "over-compensate ... and invert the bug" is factually wrong per this trace. This makes OD-10 Options A and C technically sound; Option B (adjust only the manual knob's default) remains a Pilot-viable fallback but no longer addresses the root cause per the phase file's own framing.

**Section (c) — the phase file undercounts playhead consumers by one.** `tonnetz-scene.ts` (lines 27, 665, 716) is a fourth consumer of `getVisualPhaseAnchor()`, alongside the three named in the architecture constraints. Step 04.3's validation (A-04-22, "no playhead-consumer render file is modified") must check `tonnetz-scene.ts`'s diff too. All four consumers read the shared anchor directly with no per-consumer offset caching, confirming the fix is centralizable in `phase-anchor.ts`/`strudel.ts` alone.

**Section (e) surfaces a double-compensation risk** (not resolved here): if a user has already manually nudged the `±200ms` calibration knob toward ~100ms to informally compensate for the missing scheduler-lookahead term, landing OD-10 Option A/C would double-count that ~100ms until the user re-zeros their local knob. This is user-local `localStorage` state, so the blast radius is limited to whichever profile has already been tuned.

**Section (f) — `Cyclist` interface gap confirmed.** `src/vite-env.d.ts` lines 45–53 omit `latency` from the `Cyclist` interface even though the runtime instance carries it. A one-line fix (`latency: number;`) is all that's needed if OD-10 requires reading it.

**Section (g) — signature-safety confirmed.** All four existing `tests/phase-anchor.test.ts` calls to `measureLatencyOffsetMs` pass exactly one argument; any new parameter must default to reproduce current behavior byte-for-byte.

**Section (a) — zero codegen/render changes needed for Win A.** `chordVoicing`, `chordToStrudel`, and the Pentagrama `dmap`-miss fallback (`#8aa0ff`) already handle all five qualities uniformly (confirmed: `dim`/`aug` have been valid 3-voice `Quality` members since Phase 01, alongside `pow`'s 2-voice OD-1 path). `setChordQuality` is a pure additive state setter mirroring `setChordPreset`'s guard pattern exactly.

**Section (h) — exhaustive file list for 04.2/04.3, no new files, no new deps, test count confirmed 2178** via direct `pnpm test` execution during this inventory (matches the phase file's stated baseline).

### Open decisions status

OD-8, OD-9, and OD-10 (all in `docs/song-import/phases/phase-04.md`) remain **formally open**. This inventory does not resolve them — it maps the facts (Cyclist.latency verdict, corrected consumer census, UI-mechanics recommendation, double-compensation risk, interface gap, signature-safety) the Pilot needs to resolve all three in one sitting, per the phase file's stated expected result for this step.

### Pre-existing working-tree note (not caused by this step)

At session start, `git status` already showed an uncommitted modification to `docs/song-import/decisions.md` (the OD-5 amendment dated 2026-07-10, Pilot-authored content already present in the required reading) and an untracked `docs/song-import/phases/phase-04.md` (the phase file itself, not yet committed via a `docs(scope):` commit by the Planner). Neither is added or committed by this step — both are outside step 04.1's scope and, in the case of `decisions.md`, Pilot-only-write territory. Flagged for awareness, not as a blocker.

**Planner Review:** Pending.

**Next action:** **STOP for Pilot review.** OD-8, OD-9, and OD-10 must be resolved by the Pilot before steps 04.2 and 04.3 begin, per the phase file's explicit instruction for this step. Do not auto-continue.

---

## Step 04.2 — Win A: setChordQuality + Header quality control

**Date:** 2026-07-15
**Iteration:** 1 of 1

### Completed

- OD-8/OD-9 resolved by the Pilot (`docs(scope)` commit `988c665`): edit-only Header control, all five qualities exposed.
- Added `setChordQuality(index, qual)` to `src/state/session.ts`, mirroring `setChordPreset`'s guard pattern: range guard → `slot === undefined || 'isRest' in slot || isNoteSlot(slot)` guard → immutable `.map` update → `requeueLive()`.
- Added a new `.sound-ctl.quality-ctl` control block to `src/ui/Header.svelte`, positioned immediately after the existing `.sound-ctl` (timbre) block: a `<select id="qualitySelect">` with the five `Quality` values as `[VERBATIM]` option values (OQ-6/ADR 0017), `disabled` when no chord slot is selected (`selIsChord` false), bound to a new `handleQualityChange` handler.
- Added 8 new i18n keys (`qualityLabel`, `qualityMaj/Min/Dim/Aug/Pow`, `qualityEditTip`, `qualityDisabledTip`) to `src/i18n/types.ts` and all four locale files (`en`, `es`, `pt`, `zh`).
- Added 4 new unit tests to `tests/session.test.ts` (`describe('setChordQuality', ...)`): valid update, out-of-range no-op, rest-slot no-op, NoteSlot no-op.
- Ran the full quality gate: `pnpm exec tsc --noEmit` clean; `pnpm test` 2182/2182 passed (47 files, +4 over the 2178 baseline); `pnpm lint` clean (one Prettier auto-fix applied to `Header.svelte` mid-step, re-verified clean after); `pnpm build` exit 0.
- Manually verified in a real browser (Playwright driving a cached headless Chromium against `pnpm dev` on port 5174 — no project run-skill existed, `chromium-cli` was not installed on this machine, so a scratch Playwright script was used instead; see Key findings below for exact steps and observations). Zero console errors across the whole flow.

### Files touched

- `src/state/session.ts` (added `setChordQuality`)
- `src/ui/Header.svelte` (added quality control + `handleQualityChange`)
- `src/i18n/types.ts`, `src/i18n/locales/{en,es,pt,zh}.ts` (added 8 keys each)
- `tests/session.test.ts` (added `describe('setChordQuality', ...)`, 4 tests)

Commit: `a1e2667` — `feat(harmony): Phase 04 step 04.2 — setChordQuality + Header quality control`.

### Validation evidence (per Acceptance ID)

- **A-04-07:** `grep -n "export function setChordQuality" src/state/session.ts` — present; guard sequence matches `setChordPreset` line-for-line (range → rest/NoteSlot → immutable update → `requeueLive()`).
- **A-04-08/09/10:** `pnpm exec vitest run tests/session.test.ts` — 62/62 passed, including the 4 new `setChordQuality` tests (valid update, out-of-range, rest slot, NoteSlot).
- **A-04-11:** `grep -n "qualitySelect\|handleQualityChange\|setChordQuality" src/ui/Header.svelte` — control present, imports `setChordQuality`, `disabled={!selIsChord}` matches OD-8's edit-only shape, five `<option>`s match OD-9.
- **A-04-12:** `pnpm exec vitest run tests/i18n/key-parity.test.ts` — 8/8 passed; no key missing from any of the 5 files.
- **A-04-13 (manual):** Browser-driven verification (Playwright + cached Chromium, `pnpm dev` on :5174). Steps and observations:
  1. Navigated to the Harmony view; `#qualitySelect` present and `disabled=true` with no chord selected (screenshot `02-quality-disabled.png`).
  2. Clicked a Tonnetz triangle → placed a `C` major chord.
  3. Switched to the Pentagrama subview and clicked the slot to select it → `#qualitySelect` became `disabled=false`, populated with 5 options (`Major/Minor (m)/Diminished (°)/Augmented (+)/Power chord (5)`, values `maj/min/dim/aug/pow`), showing `Major` (screenshot `05-after-slot-select-click.png`).
  4. Set quality to `dim`, then `aug`, then `pow` in turn. Each change updated `#qualitySelect`'s value immediately; the chord's Pentagrama chip label updated `C` → `C°` → `C+` → `C5`; the progression-strip slot label updated to `C5` for `pow` (screenshot `06-quality-pow.png`, `08-staff-pow-full.png`).
  5. Clicked `#progPlay`, confirmed audible playback with no crash, then `#hushBtn` to stop.
  6. Console listener attached for the whole session: **zero errors** at any step.
  - This satisfies A-04-13 as worded ("updates Pentagrama render... and produces correct audible output"). See "Key findings" below for an adjacent Tonnetz-view observation that is **not** part of A-04-13's literal scope but is flagged for Planner/Pilot triage.
- **A-04-14:** `git diff main...HEAD -- src/core/theory/tonnetz.ts` — empty; `mkTri` unmodified. Confirmed no triangle-generation logic was touched for any quality.
- **A-04-15:** `pnpm test` — 2182 passed, 47 files (≥ 2178 baseline, +4 net new from this step).
- **A-04-16:** `pnpm exec tsc --noEmit` — exits 0, no output.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
| --- | --- | --- | --- | --- |
| A-04-07 | `setChordQuality` exported, guard pattern matches convention | `src/state/session.ts` (static read) | proxy:static-analysis | covered |
| A-04-08 | Unit test: valid update | `tests/session.test.ts` | unit | covered |
| A-04-09 | Unit test: out-of-range no-op | `tests/session.test.ts` | unit | covered |
| A-04-10 | Unit test: rest slot / NoteSlot no-op | `tests/session.test.ts` | unit | covered |
| A-04-11 | Header control present, wired, OD-8/OD-9 shape | `src/ui/Header.svelte` (static read) | proxy:static-analysis | covered |
| A-04-12 | i18n keys present in all 5 files | `tests/i18n/key-parity.test.ts` | unit | covered |
| A-04-13 | Manual: quality change updates Pentagrama render + audio | manual (Playwright-driven browser session) | manual | covered |
| A-04-14 | `mkTri`/Tonnetz triangle logic unmodified (OD-2 preserved) | `git diff` on `tonnetz.ts` | proxy:static-analysis | covered — **see finding below on a separate, pre-existing OD-2 edge case newly reachable via this step's own feature** |
| A-04-15 | All tests pass, count ≥ 2178 | `pnpm test` | operability | covered (2182) |
| A-04-16 | `tsc --noEmit` clean | n/a | operability | covered |

### Key findings for Pilot/Planner review

**New capability, adjacent latent bug exposed (not caused by this step's touched files).** While manually verifying A-04-13, after setting a Tonnetz-placed chord's quality to `pow` via the new Header control, switching back to the Tonnetz subview showed the **original major triangle still highlighted** (blue outline + P·L·R neighbor labels), instead of no triangle. Root-caused to `src/render/tonnetz-scene.ts`, `updateTonnetzDynamic()` (~lines 318–333): the module-level `_lastPick` cache is only updated when `findRenderTriForChord` finds a matching triangle (`_renderTris` holds only `maj`/`min` triangles per the hard Tonnetz-geometry invariant); when the last-tracked chord's quality changes to something with no matching triangle (`dim`/`aug`/`pow`), the `if (sel !== null)` block is skipped and `_lastPick` silently **keeps its previous (stale) value** rather than clearing to `null`. The separate per-chord active-pulse loop a few lines down (~721–741) already handles this correctly (`if (tri === null) return;` — skips drawing). Only the sustained "last-picked" highlight/P·L·R overlay has the gap.

This path was **unreachable before Win A**: the only way to place a chord was a Tonnetz click (always `maj`/`min`, so `_lastPick` always had a matching triangle), and `importSession`-created sessions never interactively re-quality an already-`_lastPick`-tracked chord. `setChordQuality` is the first user action that can change an existing, currently-`_lastPick`-tracked chord's quality away from `maj`/`min`, making this the first time the gap is visible.

This does **not** affect A-04-13 as literally worded (which speaks to the Pentagrama render, not the Tonnetz view's own highlight), and does not affect audio correctness, session data, or the progression-strip label (which correctly showed `C5`). It is a cosmetic staleness in one PIXI-side render cache, in a file (`tonnetz-scene.ts`) not on step 04.2's declared touch-list — so it was **not fixed in this step**, per "spec first, no implicit implementation." The fix, if the Pilot wants it, is small and low-risk: in `updateTonnetzDynamic`, pair the existing `if (sel !== null) { _lastPick = {...} }` with an `else { _lastPick = null; }`. No test scaffolding exists for `tonnetz-scene.ts` today (it's PIXI/DOM-coupled, outside the `core/**` unit-testable boundary), so this would remain a manually-verified fix, consistent with how the rest of this file is validated.

**Recommendation:** Planner triage — either fold as a small step 04.2b/04.3 addendum (touches only `tonnetz-scene.ts`, one clause), or log as a deferred item for a future initiative. Not merge-blocking.

**Browser-driven verification tooling note.** No project-specific run-skill exists yet for this repo; `chromium-cli` (the generic `run` skill's default recommendation) is not installed on this machine. Verification used a scratch Playwright script (`playwright-core`, pointed at an already-cached Chromium build via `executablePath`, avoiding any new downloads or repo changes) run against the existing `pnpm dev` instance on port 5174. Per the `run` skill's own guidance, this is worth capturing as a project run-skill via `/run-skill-generator` if browser-driven verification will recur — flagged, not acted on, since that's a tooling decision outside this step's scope.

### Open decisions status

OD-8 and OD-9 are now **implemented** (this step). OD-10 remains open for step 04.3.

**Planner Review:** APPROVED on 2026-07-15. Iteration: 1 of 5. See `docs/song-import/reviews/phase-04-step-04.2-review-1.md` for the full checklist walkthrough and Acceptance Coverage Table re-verification. Summary: commit scope is clean (matches the declared touch-list exactly; `mkTri`/codegen/render files confirmed untouched by direct read), commit message format is correct, the Acceptance Coverage Table is complete for A-04-07 through A-04-16, cited tests genuinely exercise `setChordQuality` and the i18n key set (verified by direct read, not just trusted), OD-8/OD-9/OD-2 are honored, no flag was needed and none was invented, and no unauthorized dependency/env change occurred. The Dev correctly declined to fix the newly-exposed `tonnetz-scene.ts` `_lastPick` staleness bug in this step (correctly out of its declared scope) and flagged it clearly with an accurate root cause — this is the right discipline.

**Next action:** Dev proceeds to step 04.3 (Win B: latency offset recalibration) — Win B does not touch `tonnetz-scene.ts` and is unaffected by the finding above. Before step 04.4 (the Phases 01–04 merge-readiness declaration), **the Pilot must explicitly triage the `tonnetz-scene.ts` `_lastPick` staleness finding** — Planner recommends a small, scoped fast-follow (a single `else { _lastPick = null; }` clause) landed as step 04.3b or a 04.4 addendum, since it touches the spirit of OD-2 (no Tonnetz highlight for a non-triadic quality) and is newly reachable specifically because of this step's own new capability; accepting it instead as a documented, deferred known-issue for a future initiative is also an acceptable Pilot call — but it must be a stated decision, not a silent omission from the merge-ready statement.

---

## Step 04.3 — Win B: latency offset recalibration

**Date:** 2026-07-15
**Iteration:** 1 of 1

### Completed

- OD-10 resolved by the Pilot as **Option A** (`docs(scope)` commit `988c665`; recorded in `docs/song-import/decisions.md`): auto-include the Strudel scheduler's lookahead constant in the auto-measured offset; manual knob default stays `0` as a pure fine-tune.
- `src/vite-env.d.ts` — added `latency: number;` to the `Cyclist` interface, with a doc comment recording the inventory's traced evidence (Cyclist → superdough → `.start(when)`) for why this property is audible, not just an internal scheduling-buffer detail.
- `src/state/phase-anchor.ts` — extended `measureLatencyOffsetMs(ctx, schedulerLatencySec = 0)`: now returns `((outputLatency||0) + (baseLatency||0) + schedulerLatencySec) * 1000`. The default keeps all four pre-existing call sites' behavior byte-identical. Corrected the JSDoc on both `measureLatencyOffsetMs` and `anchorVisualPhase` that previously argued (incorrectly, per the inventory's traced verdict) that including the lookahead would "over-compensate and invert the bug" — replaced with the verified rationale and an explicit note that the prior claim was never traced against the actual scheduling source.
- `src/audio/strudel.ts` — `syncVisualPhaseAfterRunNow` now passes `_scheduler?.latency ?? 0` as the function's new second argument, summed with the hardware offset and the manual calibration offset exactly as before.
- `tests/phase-anchor.test.ts` — the four pre-existing tests are byte-identical, unmodified. Added 4 new tests: default-param behavior reproduces the old single-arg result; a non-zero `schedulerLatencySec` adds the exact expected ms; the delta between with/without lookahead is exactly the lookahead term; explicit `0` behaves identically to the omitted default.
- Ran the full quality gate: `pnpm exec vitest run tests/phase-anchor.test.ts` — 8/8 passed (4 original + 4 new); `pnpm test` — 2186/2186 passed (47 files, +4 over the step-04.2 baseline of 2182); `pnpm exec tsc --noEmit` — clean; `pnpm lint` — one Prettier formatting issue in the new test block, auto-fixed with `prettier --write`, re-verified clean; `pnpm build` — exit 0 (pre-existing chunk-size warnings only, unrelated to this step).
- Manually smoke-tested in the same real browser session used for step 04.2 (Playwright + cached Chromium against the still-running `pnpm dev` on port 5174 — Vite HMR picked up the `phase-anchor.ts`/`strudel.ts`/`vite-env.d.ts` changes live). Placed a chord, pressed Harmony Play, then switched to Rhythm view and pressed Rhythm Play — both play/hush cycles completed with the new `_scheduler?.latency` read live in the audio-init path, transport UI and playhead rendering looked normal (screenshot `11-step04.3-rhythm-playing.png`), and **zero console errors**.
- **A-04-23 (the subjective perceptual criterion) is explicitly NOT self-graded here**, per the phase file's own instruction ("This is subjective and Pilot-adjudicated — the Dev records what was observed, not a self-graded pass"). What I can state factually: the mechanism is verified correct by unit test (the offset used to anchor the visual playhead is now larger by exactly the scheduler's `~100ms` lookahead value whenever a real `Cyclist` is present), and manually the app plays audio and renders the playhead with no functional regression. I did not attempt to judge, by ear, whether the constant see-vs-hear gap feels smaller — that requires the Pilot's own listening comparison against pre-phase `main`, on their own hardware, which I have no basis to substitute for.

### Files touched

- `src/vite-env.d.ts` (added `Cyclist.latency`)
- `src/state/phase-anchor.ts` (`measureLatencyOffsetMs` signature + JSDoc correction)
- `src/audio/strudel.ts` (`syncVisualPhaseAfterRunNow` passes live scheduler latency)
- `tests/phase-anchor.test.ts` (4 new tests, 4 pre-existing untouched)

No playhead-consumer render file (`pentagrama-scene.ts`, `ProgressionStrip.svelte`, `rhythm-scene.ts`, `tonnetz-scene.ts`) appears in this step's diff — confirmed by `git diff --stat`.

Commit: pending (to be made immediately after this handoff entry, per convention — code + handoff in one commit) — `fix(audio): Phase 04 step 04.3 — recalibrate fixed latency offset`.

### Validation evidence (per Acceptance ID)

- **A-04-17:** `grep -n "latency: number" src/vite-env.d.ts` — present on the `Cyclist` interface.
- **A-04-18:** `pnpm exec vitest run tests/phase-anchor.test.ts` — the four pre-existing tests (`sums outputLatency and baseLatency`, `returns 0 when both properties are zero`, `guards absent properties`, `handles output-latency-only scenario`) pass **unmodified** — confirmed via `git diff` showing zero changes to those four `it(...)` blocks.
- **A-04-19:** Same test run — new test `'a non-zero schedulerLatencySec changes the result by exactly that amount, in ms'` asserts `withLookahead - withoutLookahead` is `toBeCloseTo(100, 10)` for a `0.1`s input, i.e. exactly the lookahead term in ms.
- **A-04-20:** `grep -n "_scheduler?.latency" src/audio/strudel.ts` — `syncVisualPhaseAfterRunNow` passes it as `measureLatencyOffsetMs(getAudioContext(), _scheduler?.latency ?? 0)`.
- **A-04-21:** Read `phase-anchor.ts` — JSDoc on `anchorVisualPhase` and `measureLatencyOffsetMs` now states the lookahead **is** included and audible, with the corrected rationale; no remaining contradiction with the implemented behavior.
- **A-04-22:** `git diff --stat` — only `src/vite-env.d.ts`, `src/state/phase-anchor.ts`, `src/audio/strudel.ts`, `tests/phase-anchor.test.ts` changed; none of the four playhead-consumer render files appear.
- **A-04-23 (manual, Pilot-adjudicated):** See "Completed" above — mechanism verified, functional smoke-test passed with zero console errors; perceptual judgment explicitly deferred to the Pilot, not self-graded.
- **A-04-24:** `pnpm test` — 2186 passed, 47 files (2182 step-04.2 baseline + 4 new).
- **A-04-25:** `pnpm exec tsc --noEmit` — exits 0, no output.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
| --- | --- | --- | --- | --- |
| A-04-17 | `Cyclist.latency` declared | `src/vite-env.d.ts` (static read) | proxy:static-analysis | covered |
| A-04-18 | Four pre-existing tests pass unmodified | `tests/phase-anchor.test.ts` | unit | covered |
| A-04-19 | New test: lookahead term included, exact ms delta | `tests/phase-anchor.test.ts` | unit | covered |
| A-04-20 | `syncVisualPhaseAfterRunNow` passes live scheduler latency | `src/audio/strudel.ts` (static read) | proxy:static-analysis | covered |
| A-04-21 | JSDoc no longer contradicts implemented behavior | `src/state/phase-anchor.ts` (static read) | proxy:static-analysis | covered |
| A-04-22 | No playhead-consumer render file touched | `git diff --stat` | proxy:static-analysis | covered |
| A-04-23 | Manual: perceptibly smaller constant offset | manual (Pilot-adjudicated) | manual | **mechanism verified; perceptual judgment explicitly deferred to Pilot, not self-graded** |
| A-04-24 | All tests pass, count ≥ 2178 + Win A's tests | `pnpm test` | operability | covered (2186) |
| A-04-25 | `tsc --noEmit` clean | n/a | operability | covered |

### Key findings for Pilot/Planner review

None new. The `tonnetz-scene.ts` `_lastPick` staleness finding from step 04.2 remains open for Pilot triage before step 04.4's merge-readiness declaration (see that step's entry above) — Win B did not touch that file and does not change the finding's status.

**Honesty framing restated per the phase file's explicit requirement:** Win B **reduces** the constant (non-progressive) see-vs-hear playhead offset by folding in the scheduler's ~100ms lookahead term; it does **not** eliminate the offset, and does **not** address progressive drift between the visual (`performance.now()`) and audio (Web Audio) clocks — that remains a separate, deferred architectural concern, unaddressed by this step.

**Planner Review:** Pending.

**Next action:** Planner reviews this step; on APPROVE, Dev proceeds to step 04.4 (quality gate + Phases 01–04 merge-readiness declaration), which must include the Pilot's explicit triage decision on the `tonnetz-scene.ts` finding.

---
