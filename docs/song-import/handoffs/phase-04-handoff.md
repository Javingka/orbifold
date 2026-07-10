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
