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
