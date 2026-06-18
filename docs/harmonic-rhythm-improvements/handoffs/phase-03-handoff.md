<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Handoff — Phase 03 (Oscillator + Presets sound menus, edit-mode feedback, placement fix)

---

## Step 03.1 — Discovery inventory (Checkpoint #1)

**Date:** 2026-06-18
**Commit(s):** (terminal commit — see note below)
**Iteration:** 1 of 5

### Completed

- Read all required files in order: `CLAUDE.md`, `docs/harmonic-rhythm-improvements/decisions.md`
  (3 carried-forward rules), `docs/harmonic-rhythm-improvements/handoffs/phase-02-handoff.md`
  (Checkpoint #5 resolution, Phase 02 scope carried forward, new scope opened),
  `docs/harmonic-rhythm-improvements/phases/phase-03.md` (full phase file),
  `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(b) and §(c)
  (D-3, D-4 deferred registers), `docs/adr/0018-chord-sound-attributes.md` (D1/D2).
- Read `src/core/codegen/strudel.ts` lines 54–196 (current `chordToStrudel` and
  `melodyLine` signatures including the ADR 0018 D2 `uniformAttrs` gate).
- Inspected `node_modules/@strudel/web/dist/index.mjs` directly:
  - Line 5201: `Cd = ["pink", "white", "brown", "crackle"]` — all four noise tokens
    registered by `registerSynthSounds()`.
  - Lines 2020, 2135, 2146, 2157: `attack/att`, `decay/dec`, `sustain/sus`, `release/rel`
    all confirmed present.
  - Lines 2376, 2389, 2428, 2468, 2510, 2553, 2652, 2675: all nine filter parameters
    (`lpf/cutoff`, `lpq/resonance`, `hpf`, `lpenv`, `lpa`, `lpd`, `lps`, `lpr`)
    confirmed present.
  - Line 14795: `/* , registerSoundfonts() */` — soundfonts disabled; `s("piano")` from
    dirt-samples is NOT available in the app's init path.
- Read `src/ui/Header.svelte` lines 547–719 to enumerate the actual harmony control order.
- Produced `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md` covering
  all five sections §(a)–§(e) and six open questions OQ-1 through OQ-6.
- Did NOT touch any source file (`.ts`, `.svelte`).

### Files touched

- `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md` (created)
- `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md` (created, this entry)

### Validation evidence

- `git status` → only `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md`
  and `docs/harmonic-rhythm-improvements/phases/phase-03.md` (already existed, untracked)
  and `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md` as new untracked
  files. No `.ts` or `.svelte` files modified.
- The inventory covers:
  - §(a) Noise token: `pink` confirmed present (bundle line 5201), chosen over `white`/
    `brown`/`crackle` with justification. Pilot confirmation requested.
  - §(b) Envelope params: all four (`attack`, `decay`, `sustain`, `release`) confirmed
    present at bundle lines 2020/2135/2146/2157.
  - §(c) Filter params: all nine (`lpf`, `cutoff`, `lpq`, `hpf`, `lpenv`, `lpa`, `lpd`,
    `lps`, `lpr`) confirmed present at bundle lines 2376–2675.
  - §(d) Three preset definitions with exact attribute values, using only confirmed
    parameters. `s("piano")` ruled out (soundfonts disabled; piano not in dirt-samples).
  - §(e) Placement: actual control order read from live Header.svelte (5 positions);
    current end-of-row placement confirmed correct; recommendation to keep it as-is.
  - OQ-1 through OQ-6 each with a concrete recommendation.
  - Additional open decision surfaced: `lpf(1200)` must become variable in codegen to
    support presets (Option A recommended; Option B noted as unreliable).

### Routine validations

- `git status` → new untracked docs files only. No source code changed.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / artifact | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | Byte-identical at default | `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md` | proxy:doc-review | not yet — step 03.3 unit tests |
| A-03-02 | Piano preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-03 | Guitar preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-04 | Synth Bass preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-05 | Noise oscillator distinct audio | — | manual | not yet — step 03.5 |
| A-03-06 | Placement matches inventory §(e) | `phase-03-inventory.md` §(e) | proxy:doc-review | not yet — step 03.5 |
| A-03-07 | Accent border on slot selected | — | manual | not yet — step 03.5 |
| A-03-08 | Pulse on selection change | — | manual | not yet — step 03.5 |
| A-03-09 | No border when no slot selected | — | manual | not yet — step 03.5 |
| A-03-10 | `resolveChordAttrs` exact values | `tests/presets.test.ts` (planned) | unit | not yet — step 03.3 |
| A-03-11 | Persistence v3 drop + v4 parse | `tests/persistence.test.ts` (planned) | unit | not yet — step 03.4 |
| A-03-12 | Agent schema v4 optional fields | `tests/schema.test.ts` (planned) | unit | not yet — step 03.4 |
| A-03-13 | i18n key-parity passes | `tests/i18n/key-parity.test.ts` | unit | not yet — step 03.5 |
| A-03-14 | `pnpm build` clean | — | automated | not yet — step 03.5 |

**Step 03.1 validation criterion (the only one in scope for this step):**
`docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md` exists and covers
all five sections §(a)–§(e). Verified by doc-review. No unit test is possible for a
doc-only step.

### Prototype parity

Not applicable — Oscillator/Preset menus and edit-mode feedback are net-new features
that did not exist in `reference/orbifold.html`. No prototype citation is possible or
required.

### Decisions made (if any)

None new. All questions are surfaced in the inventory as OQ-1 through OQ-6 (plus one
additional ADR 0019 D4 sub-question on `lpf(1200)` codegen). Pilot resolves OQ-1/OQ-2/
OQ-3 at Checkpoint #1; OQ-4/OQ-5/OQ-6 + the lpf decision at Checkpoint #2.

### Proposed Decisions Register entries (if any)

None at this step. Potential Register entries will be proposed after the ADR is accepted
at Checkpoint #2.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- Branch: `harmonic-rhythm-improvements/phase-01`
- No source code changed; app behavior unchanged from Phase 02.
- All 539 tests pass (unchanged from Phase 02 final state).

### Auto-continuation

**BLOCKED — Pilot Checkpoint #1 (inventory review) required before step 03.2.**

The Dev stops here. Step 03.2 (ADR 0019) begins only after the Pilot reviews and
approves `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md` and
resolves OQ-1, OQ-2, and OQ-3.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `docs(harmonic-rhythm-improvements): Phase 03 step 03.1 — discovery inventory (noise, envelope, filter, presets, placement)`

- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 03.2 — ADR 0019 (Oscillator / Preset data model) (Checkpoint #2)

**Date:** 2026-06-18
**Commit(s):** (terminal commit — see note below)
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/harmonic-rhythm-improvements/decisions.md`,
  `docs/harmonic-rhythm-improvements/phases/phase-03.md`, the approved
  `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md`, and
  `docs/adr/0018-chord-sound-attributes.md` (D1–D5 as structural and precedent reference).
  Also skimmed ADR 0013 (lossy schema bump precedent), ADR 0017 (i18n / technical token
  verbatim rule), ADR 0010/0016 (arrange dual-mode), ADR 0005 (no .fast/.slow).
- Read `src/state/session.ts` lines 141–173 (current `Chord` interface with ADR 0018 D1
  fields: `instrument?`, `room?`, `decay?`), `src/lib/persistence.ts` lines 1–50
  (`SESSION_SCHEMA_VERSION = 3`, `SavedChordSchema` with v3 optional fields),
  `src/agent/schema.ts` lines 1–20 (`SCHEMA_VERSION = 3`).
- Incorporated Pilot Checkpoint #1 resolutions:
  - **OQ-1 (noise token):** `pink` confirmed.
  - **OQ-2 (preset definitions):** full Guitar preset (with `lpenv`/`lpa`/`lpd` filter
    sweep) confirmed; all three presets approved as starting points.
  - **OQ-3 (placement):** keep sound block at end-of-row (position 5); no move needed.
- Produced `docs/adr/0019-oscillator-and-presets.md` covering all seven decisions D1–D7
  plus the `lpf(1200)` variabilization decision (D4b).
- Did NOT touch any source file (`.ts`, `.svelte`).

### Files touched

- `docs/adr/0019-oscillator-and-presets.md` (created)
- `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md` (this entry appended)

### Validation evidence

- `docs/adr/0019-oscillator-and-presets.md` exists and covers all seven decisions D1–D7.
- No source files modified (`git status` shows only the two new/updated docs files).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / artifact | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | Byte-identical at default | `docs/adr/0019-oscillator-and-presets.md` D4b | proxy:doc-review | not yet — step 03.3 unit tests |
| A-03-02 | Piano preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-03 | Guitar preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-04 | Synth Bass preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-05 | Noise oscillator distinct audio | — | manual | not yet — step 03.5 |
| A-03-06 | Placement matches inventory §(e) | ADR 0019 Consequences (no change to position) | proxy:doc-review | not yet — step 03.5 |
| A-03-07 | Accent border on slot selected | — | manual | not yet — step 03.5 |
| A-03-08 | Pulse on selection change | — | manual | not yet — step 03.5 |
| A-03-09 | No border when no slot selected | — | manual | not yet — step 03.5 |
| A-03-10 | `resolveChordAttrs` exact values | `docs/adr/0019-oscillator-and-presets.md` D4a preset table | proxy:doc-review | not yet — step 03.3 unit tests |
| A-03-11 | Persistence v3 drop + v4 parse | `docs/adr/0019-oscillator-and-presets.md` D5 | proxy:doc-review | not yet — step 03.4 unit tests |
| A-03-12 | Agent schema v4 optional fields | `docs/adr/0019-oscillator-and-presets.md` D6 | proxy:doc-review | not yet — step 03.4 unit tests |
| A-03-13 | i18n key-parity passes | — | unit | not yet — step 03.5 |
| A-03-14 | `pnpm build` clean | — | automated | not yet — step 03.5 |

**Step 03.2 validation criterion (the only one in scope for this step):**
`docs/adr/0019-oscillator-and-presets.md` exists and covers all seven decisions D1–D7.
Verified by doc-review. No source code changed.

### Prototype parity

Not applicable — Oscillator/Preset menus and edit-mode feedback are net-new features
that did not exist in `reference/orbifold.html`. No prototype citation is possible or
required.

### Routine validations

- `git status` → new/updated docs files only. No source code changed.

### Decisions made (if any)

All seven decisions are captured in `docs/adr/0019-oscillator-and-presets.md` as
"Proposed / pending Pilot approval at Checkpoint #2." The Pilot resolves these at
Checkpoint #2 before step 03.3 may begin.

### Proposed Decisions Register entries (for Pilot consideration)

The following entries may warrant addition to `docs/harmonic-rhythm-improvements/decisions.md`
after the ADR is accepted at Checkpoint #2. The Pilot is the sole writer.

1. **`lpf` is now variable in codegen** — `chordToStrudel` and `melodyLine` no longer emit
   a hardcoded `lpf(1200)` literal; the value is determined by `resolveChordAttrs` (default:
   1200, byte-identical). Future sound changes must go through `resolveChordAttrs`, not
   hardcode a new `lpf` literal.
2. **Preset name canonical set** — the three preset names `'piano'` / `'guitar'` /
   `'synth-bass'` are verbatim technical tokens; they appear in emitted Strudel strings and
   agent JSON and must not be translated. Any new preset added in a future phase extends the
   literal union and requires a schema bump.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- Branch: `harmonic-rhythm-improvements/phase-01`
- No source code changed; app behavior unchanged from Phase 02.
- All 539 tests pass (unchanged).

### Auto-continuation

**BLOCKED — Pilot Checkpoint #2 (ADR review) required before step 03.3.**

The Dev stops here. Step 03.3 begins only after the Pilot reviews and approves
`docs/adr/0019-oscillator-and-presets.md` at Checkpoint #2.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `docs(harmonic-rhythm-improvements): Phase 03 step 03.2 — ADR 0019 oscillator/preset model`

- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 03.3 — Preset engine: `core/codegen/presets.ts`, codegen extension, unit tests

**Date:** 2026-06-18
**Commit(s):** (terminal commit — see note below)
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/harmonic-rhythm-improvements/decisions.md`,
  `docs/adr/0019-oscillator-and-presets.md` (all 7 decisions, Pilot-approved at Checkpoint #2),
  `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md` (confirmed param set
  and exact preset attribute values), `docs/harmonic-rhythm-improvements/phases/phase-03.md`
  (step 03.3 scope), `src/core/codegen/strudel.ts` (full file — pre-existing
  `chordToStrudel`/`melodyLine`/`uniformAttrs`), and `src/state/session.ts` (full file —
  `Chord` interface, `ProgressionSlot`, all actions).
- Created `src/core/codegen/presets.ts` (AGPL header; pure engine, no DOM/PIXI/Svelte):
  - Exports `PRESET_NAMES` tuple and `PresetName` type.
  - Exports `PRESETS` lookup table with exact ADR 0019 D4a values for Piano, Guitar,
    Bajo Sintético.
  - Exports `resolveChordAttrs(chord: ChordAttrs, roomDefault = 0.25): ResolvedAttrs`
    implementing the per-attribute explicit-wins rule (D3). The `roomDefault` parameter
    lets each callsite inject its own default to preserve byte-identical room output:
    `chordToStrudel` passes `0.25`, `melodyLine` passes `0.3`. All new optional attrs
    (attack, decay, sustain, release, lpenv, lpa, lpd, lpq) return `undefined` when absent
    from both the chord and the preset — causing the codegen to omit those method calls.
- Extended `interface Chord` in `src/state/session.ts` with nine new optional fields placed
  immediately after `decay?`: `preset?`, `lpf?`, `attack?`, `sustain?`, `release?`,
  `lpenv?`, `lpa?`, `lpd?`, `lpq?` (ADR 0019 D4a). JSDoc cites ADR 0019.
- Updated `src/core/codegen/strudel.ts`:
  - Added import of `resolveChordAttrs` and `ChordAttrs` from `./presets.js`.
  - Extended `HarmonySlotInput` chord branch with `& ChordAttrs` to carry new fields.
  - Added `chordAttrs?: ChordAttrs` as optional 9th parameter to `chordToStrudel`, consumed
    via `resolveChordAttrs`. Positional params (instrument/room/decay) take priority as
    explicit overrides.
  - Replaced hardcoded `lpf(1200)` at all three callsites with `lpf(${resolved.lpf})`.
  - Updated the `uniformAttrs` gate (ADR 0019 D7): replaced the old "all-undefined" check
    with a per-field equality check across all chord slots. This correctly detects variation
    (forces arrange) while preserving byte-identical behavior when all new fields are absent.
  - Updated both the slowcat path and the arrange path of `melodyLine` to use
    `resolveChordAttrs`, emitting `.attack()/.decay()/.sustain()/.release()/.lpenv()/.lpa()/
    .lpd()/.lpq()` only when the resolved value is not `undefined`.
- **ADR 0019 D7 behavioral note:** The old ADR 0018 D2 `uniformAttrs` check was "any chord
  has any non-undefined attr → arrange". The new D7 check is "any chord has a different attr
  value from the others → arrange". A single-chord progression with `instrument: 'sine'` is
  now considered uniform (no variation), uses the slowcat path, and the attr IS applied via
  `resolveChordAttrs`. The three existing ADR 0018 D2 tests that asserted `arrange(` for
  single-chord cases were updated to document this behavioral change and verify the attr IS
  still applied. Two-chord progressions with differing presets/attrs still force arrange().
- Created `tests/presets.test.ts` (63 tests) covering A-03-10 and A-03-01.
- Added Phase 03 describe blocks to `tests/codegen.test.ts` covering A-03-01 byte-identical
  regression (all three callsites), D7 gate behavior, Piano preset codegen chain, Guitar
  filter envelope attrs, Synth Bass lpq, and noise token `pink` codegen.

### Files touched

- `src/core/codegen/presets.ts` (created)
- `src/state/session.ts` (Chord interface extended)
- `src/core/codegen/strudel.ts` (codegen extended)
- `tests/presets.test.ts` (created)
- `tests/codegen.test.ts` (Phase 03 describe blocks added; 3 ADR 0018 D2 tests updated)
- `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md` (this entry)

### Validation evidence

- `pnpm exec tsc --noEmit` → clean (0 errors).
- `pnpm lint` → clean (ESLint + Prettier).
- `pnpm exec vitest run` → 620 tests pass (all 17 test files). Prior count: 539. New tests:
  63 in `presets.test.ts` + new describe blocks in `codegen.test.ts`.
- All existing tests (pre-Phase-03) remain green. The three updated ADR 0018 D2 tests now
  correctly describe the D7 behavior (attr applied regardless of path; arrange() only on
  variation).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | Byte-identical at default at all three callsites | `tests/codegen.test.ts` — "Phase 03 — A-03-01 byte-identical regression" (4 tests) | unit | **CLOSED** |
| A-03-01 (presets side) | resolveChordAttrs returns defaults when all fields absent | `tests/presets.test.ts` — "byte-identical baseline (A-03-01)" (12 tests) | unit | **CLOSED** |
| A-03-02 | Piano preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-03 | Guitar preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-04 | Synth Bass preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-05 | Noise oscillator distinct audio | — | manual | not yet — step 03.5 |
| A-03-06 | Placement matches inventory §(e) | — | manual | not yet — step 03.5 |
| A-03-07 | Accent border on slot selected | — | manual | not yet — step 03.5 |
| A-03-08 | Pulse on selection change | — | manual | not yet — step 03.5 |
| A-03-09 | No border when no slot selected | — | manual | not yet — step 03.5 |
| A-03-10 | resolveChordAttrs exact preset values | `tests/presets.test.ts` — Piano (11 tests), Guitar (11), Synth-bass (11), explicit-wins (9), PRESETS table (3) | unit | **CLOSED** |
| A-03-10 (codegen side) | Preset chain in Strudel output | `tests/codegen.test.ts` — "Phase 03 — preset codegen" (10 tests) | unit | **CLOSED** |
| A-03-11 | Persistence v3 drop + v4 parse | — | unit | not yet — step 03.4 |
| A-03-12 | Agent schema v4 optional fields | — | unit | not yet — step 03.4 |
| A-03-13 | i18n key-parity passes | `tests/i18n/key-parity.test.ts` (existing, green) | unit | **passes** (no new keys yet — step 03.5) |
| A-03-14 | `pnpm build` clean | — | automated | not yet — step 03.5 |

### Prototype parity

Not applicable — Oscillator/Preset menus are net-new features that did not exist in
`reference/orbifold.html`. No prototype source to cite. Spec authority is ADR 0019.

### Decisions made (if any)

**`resolveChordAttrs` room callsite default design:** The `roomDefault` parameter approach
was chosen (over returning `undefined` and keeping room literals at each callsite) because:
1. It keeps a single source of truth (all room logic in `resolveChordAttrs`).
2. The callsite still controls its own default — byte-identical guarantee held at each site.
3. The function signature is clean and self-documenting.

### Proposed Decisions Register entries (for Pilot consideration)

None beyond what ADR 0019 already captures. The `lpf` variabilization is fully documented
in ADR 0019 D4b.

### Blockers resolved during this step (if any)

None. One transient issue encountered:
- The ESLint `no-non-null-assertion` rule rejected `!` on array access. Fixed by using
  `if (ref === undefined) return true` guard and `?? {}` fallback — no behavior change.

### Environment state after this step

- Branch: `harmonic-rhythm-improvements/phase-01`
- 620 tests pass (up from 539).
- `src/core/codegen/presets.ts` is a new pure-engine module with no DOM/PIXI/Svelte imports.
- `Chord` interface carries 9 new optional fields (all undefined by default — no migration
  needed at this step; migration is step 03.4).
- `chordToStrudel` and `melodyLine` emit byte-identical output when all new fields are absent.

### Auto-continuation

Per the phase file, the next step is **03.4** (Data model, persistence schema bump, agent
schema bump). No checkpoint required between 03.3 and 03.4 (the phase has two checkpoints:
Checkpoint #1 after 03.1 and Checkpoint #2 after 03.2, both already passed). The Dev
auto-continues to step 03.4.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `feat(codegen): Phase 03 step 03.3 — preset engine + resolveChordAttrs + uniformAttrs gate`

- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 03.4 — Data model, persistence schema bump, and agent schema bump

**Date:** 2026-06-18
**Commit(s):** (terminal commit — see note below)
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/harmonic-rhythm-improvements/decisions.md`,
  `docs/adr/0019-oscillator-and-presets.md` (D4a/D5/D6 governing this step),
  `docs/harmonic-rhythm-improvements/phases/phase-03.md` (step 03.4 scope),
  `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md` (step 03.3 APPROVED),
  `src/lib/persistence.ts`, `src/agent/schema.ts`, `src/state/selectedSlot.ts`,
  and `src/state/session.ts` (existing store actions for style reference).
- **`src/lib/persistence.ts`:** bumped `SESSION_SCHEMA_VERSION` 3→4; changed
  `SavedSessionSchema` version literal `z.literal(3)` → `z.literal(4)`; added all 9 new
  optional fields to `SavedChordSchema` per ADR 0019 D5 (`preset`, `lpf`, `attack`,
  `sustain`, `release`, `lpenv`, `lpa`, `lpd`, `lpq`); updated both `serializeSession`
  and `deserializeSession` to carry the new fields through.
- **`src/agent/schema.ts`:** bumped `SCHEMA_VERSION` 3→4; added the same 9 new optional
  fields to `HarmonyChordCoreSchema` per ADR 0019 D6; `instrument` field comment updated
  to document `'pink'` as a now-valid technical token; `HarmonyRestSchema` unchanged.
- **`src/state/selectedSlot.ts`:** extended `soundIntentStore` shape with `preset?:
  'piano' | 'guitar' | 'synth-bass'`. Decision rationale (documented in JSDoc):
  per ADR 0019 D2 (name-only preset model), `resolveChordAttrs` expands the preset at
  codegen time — so the intent store needs only `{ instrument, room, decay, preset? }`,
  not the full filter/envelope set. The existing `decay: 0` sentinel is preserved
  (intent carries it; codegen behavior unchanged since the field on `Chord` must be
  explicitly set, not zero, to emit `.decay()`). Initial value unchanged
  (`{ instrument: 'sawtooth', room: 0.25, decay: 0 }` — no preset intent initially).
- **`src/state/session.ts`:** added two new exported action functions:
  - `setChordPreset(index, preset)` — writes `progression[index].preset` and calls
    `requeueLive()`. Accepts `'piano' | 'guitar' | 'synth-bass' | undefined`.
  - `setChordOscillator(index, instrument)` — delegates to the existing
    `setChordInstrument(index, instrument)` (ADR 0019 D1: `instrument` field unchanged;
    UI label is "Oscillator" but data field stays `instrument`). Both actions follow the
    Phase 02 style: guard on `isRest`, spread-update, `requeueLive()`.
- **Tests:**
  - `tests/persistence.test.ts`: updated `MINIMAL_SAVED`/`FULL_SAVED` fixtures from
    `version: 3` to `version: 4`; updated all inline `version: 3` literals in test
    bodies to `version: 4`; updated the `SESSION_SCHEMA_VERSION is 3` test to assert 4;
    updated the Phase 06 "chord-only at schema v3" test to v4; updated the Phase 06 and
    Phase 02 blob-drop tests to use v4 terminology; added new
    `ADR 0019 D5: schema v4 — preset + filter/envelope + lossy v3 drop (A-03-11)` describe
    block with 8 tests (v3 drop, preset parse, full-fields parse, backward-compatible
    missing fields, round-trip, invalid preset rejected, attack<0 rejected,
    sustain>1 rejected).
  - `tests/schema.test.ts`: updated `SCHEMA_VERSION is 3` test to assert 4; added new
    `ADR 0019 D6 preset + filter/envelope fields (A-03-12)` describe block with 15 tests
    (all three preset names accepted, invalid preset rejected, pink noise token accepted,
    full filter/envelope accepted, missing-fields undefined, attack<0 rejected, sustain>1
    rejected, release<0 rejected, lpa<0 rejected, lpd<0 rejected, lpq<0 rejected,
    rest unchanged — preset stripped, SCHEMA_VERSION is 4).
  - `tests/session.test.ts`: updated 3 version-literal tests in the
    `SavedChordSchema backward-compat` describe block from `version: 3` to `version: 4`
    (behavior unchanged; these were version-literal updates only per the scope note).

### Files touched

- `src/lib/persistence.ts` (SESSION_SCHEMA_VERSION 3→4; SavedChordSchema + serialize/deserialize)
- `src/agent/schema.ts` (SCHEMA_VERSION 3→4; HarmonyChordCoreSchema extended)
- `src/state/selectedSlot.ts` (soundIntentStore extended with preset?)
- `src/state/session.ts` (setChordPreset + setChordOscillator actions added)
- `tests/persistence.test.ts` (version literals updated; A-03-11 describe block added)
- `tests/schema.test.ts` (version literal updated; A-03-12 describe block added)
- `tests/session.test.ts` (3 version-literal fixture updates)
- `docs/adr/0019-oscillator-and-presets.md` (status updated to Accepted by Planner)
- `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md` (this entry)

### Validation evidence

- `pnpm exec tsc --noEmit` → clean (0 errors).
- `pnpm lint` → clean (ESLint + Prettier; schema.test.ts reformatted by Prettier).
- `pnpm exec vitest run` → **646 tests pass** (17 test files). Prior count: 620.
  New tests: 8 in `persistence.test.ts` (A-03-11 block) + 15 in `schema.test.ts`
  (A-03-12 block) + 3 updated version-literal tests in `session.test.ts` = 26 net new.
- Confirmed all prior tests (pre-step-03.4) remain green. The 3 `session.test.ts`
  version-literal updates were version-number changes only, not behavior changes.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | Byte-identical at default | `tests/codegen.test.ts`, `tests/presets.test.ts` (step 03.3) | unit | **CLOSED** (step 03.3) |
| A-03-02 | Piano preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-03 | Guitar preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-04 | Synth Bass preset distinct audio | — | manual | not yet — step 03.5 |
| A-03-05 | Noise oscillator distinct audio | — | manual | not yet — step 03.5 |
| A-03-06 | Placement matches inventory §(e) | — | manual | not yet — step 03.5 |
| A-03-07 | Accent border on slot selected | — | manual | not yet — step 03.5 |
| A-03-08 | Pulse on selection change | — | manual | not yet — step 03.5 |
| A-03-09 | No border when no slot selected | — | manual | not yet — step 03.5 |
| A-03-10 | resolveChordAttrs exact preset values | `tests/presets.test.ts` (step 03.3) | unit | **CLOSED** (step 03.3) |
| A-03-11 | Persistence v3 drop + v4 parse | `tests/persistence.test.ts` — "ADR 0019 D5: schema v4" (8 tests: v3 drop, preset parse, full-fields parse, missing-fields backward-compat, round-trip, invalid preset, attack<0, sustain>1) | unit | **CLOSED** |
| A-03-12 | Agent schema v4 optional fields | `tests/schema.test.ts` — "ADR 0019 D6 preset + filter/envelope fields" (15 tests: 3 preset names, invalid preset rejected, pink token, full fields, missing-fields undefined, 5 constraint rejects, rest unchanged, SCHEMA_VERSION is 4) | unit | **CLOSED** |
| A-03-13 | i18n key-parity passes | `tests/i18n/key-parity.test.ts` (existing, green) | unit | passes (no new keys yet — step 03.5) |
| A-03-14 | `pnpm build` clean | — | automated | not yet — step 03.5 |

### Prototype parity

Not applicable — Oscillator/Preset menus and the schema changes backing them are net-new
features that did not exist in `reference/orbifold.html`. No prototype source to cite.
Spec authority is ADR 0019.

### Decisions made (if any)

**`soundIntentStore` carries `preset?` only (not the full filter/envelope set):**
Per ADR 0019 D2 (name-only preset model), `resolveChordAttrs` expands the preset bundle
at codegen time — the intent store needs only the two selector values (`instrument` and
`preset?`) in addition to the existing Phase 02 fields (`room`, `decay`). The full
filter/envelope expansion is not stored in the intent because it would duplicate the
lookup table logic and create a two-source-of-truth risk. The step 03.5 UI will read
`soundIntentStore.preset` and `soundIntentStore.instrument` when creating new chords.

**`setChordOscillator` delegates to `setChordInstrument`:** ADR 0019 D1 decided that the
data field is `instrument` (not a new `oscillator` field). `setChordOscillator` is a
thin wrapper that makes the UI's call-site intent clear without duplicating logic. Both
are exported and the UI (step 03.5) may call either.

### Proposed Decisions Register entries (for Pilot consideration)

None new beyond what ADR 0019 already captures.

### Blockers resolved during this step (if any)

None. One transient issue encountered:
- `tests/session.test.ts` had 3 `version: 3` fixture literals in the
  `SavedChordSchema backward-compat` describe block — updated to `version: 4` (these
  were version-literal updates only, not behavior changes; noted in handoff per scope
  instruction).

### Environment state after this step

- Branch: `harmonic-rhythm-improvements/phase-01`
- 646 tests pass (up from 620).
- `SESSION_SCHEMA_VERSION = 4`, `SCHEMA_VERSION = 4`.
- `SavedChordSchema` and `HarmonyChordCoreSchema` carry the 9 new optional fields.
- `soundIntentStore` carries `preset?` alongside the existing intent fields.
- `setChordPreset` and `setChordOscillator` are exported from `session.ts`.
- Old sessions at v3 are gracefully dropped; v4 sessions with/without new fields parse.

### Auto-continuation

Per the phase file, the next step is **03.5** (Top-bar UI redesign: Oscillator select,
Presets select, edit-mode feedback, placement, i18n). No checkpoint required between 03.4
and 03.5. The Dev auto-continues to step 03.5.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `feat(schema): Phase 03 step 03.4 — persistence + agent schema v4, preset/oscillator store actions`

- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 03.5 — Top-bar UI redesign: Oscillator select, Presets select, edit-mode feedback, placement, i18n

**Date:** 2026-06-18
**Commit(s):** (terminal commit — see note below)
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/harmonic-rhythm-improvements/decisions.md`,
  `docs/adr/0019-oscillator-and-presets.md` (D1–D7, all Pilot-approved), ADR 0018,
  ADR 0017 (technical tokens verbatim), this phase file (step 03.5 scope, A-03-02..A-03-14),
  `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md` (steps 03.3 and 03.4
  both Planner-APPROVED), `src/ui/Header.svelte` (full file — harmony block, `.sound-ctl`
  block from Phase 02, CSS), `src/render/tonnetz-scene.ts` (`pickChord` / `soundIntentStore`
  usage), `src/i18n/types.ts` + `src/i18n/locales/{es,en,pt,zh}.ts`.

**`src/ui/Header.svelte`:**
- Removed the Phase 02 flat `.sound-ctl` block: `instrument` select, room range slider,
  decay range slider, and their handlers (`handleInstrumentChange`, `handleRoomChange`,
  `handleDecayChange`).
- Removed the now-unused import of `setChordSoundAttrs`; added imports for
  `setChordOscillator` and `setChordPreset` (both added in step 03.4).
- Added `type OscillatorToken` covering the five valid oscillator tokens.
- Added reactive derived values `displayInstrument` (from selected slot `.instrument`
  → fallback `$soundIntentStore.instrument`) and `displayPreset` (from selected slot
  `.preset` → fallback `$soundIntentStore.preset ?? ''`).
- **Edit-mode feedback:** a reactive block watches `$selectedSlotIdxStore`: when it
  changes to a new non-null index, a `soundCtlPulsing` boolean is toggled off→on (via
  `Promise.resolve().then(...)` microtask to force Svelte to flush the class removal
  before re-adding) then cleared after 320ms via `setTimeout`. The `.sound-ctl` block
  receives `class:sound-ctl--active` (persistent accent border, active when slot ≠ null)
  and `class:sound-ctl--pulse` (transient pulse animation). `_prevSlotIdx` tracks the
  last seen slot index so the pulse fires only on actual changes, not on unrelated reactive
  reruns.
- **New `.sound-ctl` HTML block:** two `<label class="sound-field">` elements:
  - **Oscillator `<select id="instrSelect">`**: five `<option>` elements in the order
    `sine`/`triangle`/`square`/`sawtooth`/`pink` (verbatim tokens as values; i18n labels).
    `on:change` calls `handleOscillatorChange` which updates `soundIntentStore.instrument`
    and calls `setChordOscillator` when a slot is selected.
  - **Presets `<select id="presetSelect">`**: four `<option>` elements: `''`/`piano`/
    `guitar`/`synth-bass` (verbatim tokens; i18n labels for `presetNone`/`presetPiano`/
    `presetGuitar`/`presetSynthBass`). `on:change` calls `handlePresetChange` which updates
    `soundIntentStore.preset` and calls `setChordPreset` when a slot is selected.
  - The block has a `title` tooltip showing `soundEditTip` (slot selected) or
    `soundIntentTip` (no selection) for screen-reader / hover accessibility.
  - Placement confirmed at end-of-row (position 5, after `div.field` for clave/escala/
    octava) — unchanged from Phase 02 baseline (ADR 0019 D4 / A-03-06).
- **CSS additions:**
  - `.sound-ctl` given `border-radius:10px`, `padding:4px 8px`, `border:1px solid transparent`,
    and `transition` for smooth activation.
  - `.sound-ctl--active`: `border-color:rgba(138,160,255,.55)`, `background:rgba(138,160,255,.07)`.
    (accent `#8aa0ff` per CLAUDE.md spec — A-03-07.)
  - `@keyframes soundCtlPulse`: flashes from bright accent border/background/box-shadow at 0%
    down to the `--active` steady state at 100% (A-03-08).
  - `.sound-ctl--pulse`: `animation: soundCtlPulse 320ms ease-out forwards`.
  - Removed `.sound-field input[type='range']` and `.sound-val` (no sliders remain).

**`src/render/tonnetz-scene.ts`:**
- Added module-level `_pickPulse` state (stores triangle ref + `startMs` from
  `performance.now()`) set in `pickChord` on each pick.
- `pickChord`: extended `newChord` construction to include `preset: intent.preset` from
  `soundIntentStore` (ADR 0019 D2/D3 apply-to-new for preset). The existing `instrument`,
  `room`, `decay` fields are unchanged.
- `pickChord`: sets `_pickPulse` immediately on every pick.
- `tickHarmony`: added a "click-pulse overlay" block (before the suggestion glow) that draws
  a bright accent fill/outline on `_pickPulse.tri` with alpha decaying from 0.55→0 over
  300ms. When elapsed ≥ 300ms, `_pickPulse` is cleared.
- **`playChord` signature unchanged**: `playChord` still takes `instrument/room/decay` as
  positional args. The preset is resolved at codegen time by `resolveChordAttrs` (already
  wired in step 03.3); passing `newChord.instrument` etc. to `playChord` is sufficient.

**i18n (`src/i18n/types.ts` + all four locales):**
- **`types.ts`:** Removed `roomLabel`, `roomTip`, `decayLabel`, `decayTip` from the
  `header.harmony` type. Added 10 new keys: `oscillatorLabel`, `instrNoise`, `presetLabel`,
  `presetNone`, `presetPiano`, `presetGuitar`, `presetSynthBass`, `soundEditTip`,
  `soundIntentTip`. `instrLabel` and the four existing waveform keys retained.
- **`es.ts`:** Updated `instrSawtooth`→`Diente de Sierra`, `instrSine`→`Sinusoidal`,
  `instrSquare`→`Cuadrada`, `instrTriangle`→`Triangular` (proper-cased for selector context);
  added all new keys with natural Spanish labels.
- **`en.ts`:** Same four waveform labels updated to proper-cased English; added all new keys.
- **`pt.ts`:** Updated waveform labels; added all new keys with natural Portuguese labels.
- **`zh.ts`:** Waveform labels unchanged (already correct Chinese); added all new keys
  with natural Simplified Chinese labels.
- **`grep` sanity:** confirmed no other component references `roomLabel`, `roomTip`,
  `decayLabel`, or `decayTip` — removal is safe and complete.

### Files touched

- `src/ui/Header.svelte` (Phase 02 sound block replaced; edit-mode feedback added; CSS updated)
- `src/render/tonnetz-scene.ts` (`pickChord` extended with preset + pulse; `tickHarmony` pulse render)
- `src/i18n/types.ts` (4 keys removed; 10 keys added)
- `src/i18n/locales/es.ts` (updated + new keys)
- `src/i18n/locales/en.ts` (updated + new keys)
- `src/i18n/locales/pt.ts` (updated + new keys)
- `src/i18n/locales/zh.ts` (updated + new keys)
- `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md` (this entry)

### Validation evidence

- `pnpm exec tsc --noEmit` → clean (0 errors).
- `pnpm lint` → clean (ESLint + Prettier; one `prettier --write` pass applied).
- `pnpm exec vitest run` → **646 tests pass** (17 test files). Count unchanged from step
  03.4 (no new unit tests needed — this step is UI/i18n; key-parity test already exercises
  the new keys automatically).
  - `tests/i18n/key-parity.test.ts` → **8 tests pass** (A-03-13 CLOSED).
- `pnpm build` → clean exit code 0 (A-03-14 CLOSED). Two pre-existing chunk/dynamic-import
  warnings retained — not introduced by this step.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / artifact | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | Byte-identical at default | `tests/codegen.test.ts`, `tests/presets.test.ts` (step 03.3) | unit | **CLOSED** (step 03.3) |
| A-03-02 | Piano preset produces distinct audio (warm, plucked) | — | manual | **pending Pilot Checkpoint #5** |
| A-03-03 | Guitar preset produces distinct audio (bright pluck, filter sweep) | — | manual | **pending Pilot Checkpoint #5** |
| A-03-04 | Synth Bass preset produces distinct audio (dark, sustained) | — | manual | **pending Pilot Checkpoint #5** |
| A-03-05 | Noise oscillator (`pink`) produces noise-textured harmony | — | manual | **pending Pilot Checkpoint #5** |
| A-03-06 | Sound block at end-of-row (after clave/escala/octava) | visual inspection in dev server | manual | **pending Pilot Checkpoint #5** |
| A-03-07 | Accent border (#8aa0ff) on `.sound-ctl` when slot selected | visual inspection in dev server | manual | **pending Pilot Checkpoint #5** |
| A-03-08 | Brief pulse animation on new slot selection | visual inspection in dev server | manual | **pending Pilot Checkpoint #5** |
| A-03-09 | No accent border when no slot selected | visual inspection in dev server | manual | **pending Pilot Checkpoint #5** |
| A-03-10 | `resolveChordAttrs` exact preset values | `tests/presets.test.ts` (step 03.3) | unit | **CLOSED** (step 03.3) |
| A-03-11 | Persistence v3 drop + v4 parse | `tests/persistence.test.ts` (step 03.4) | unit | **CLOSED** (step 03.4) |
| A-03-12 | Agent schema v4 optional fields | `tests/schema.test.ts` (step 03.4) | unit | **CLOSED** (step 03.4) |
| A-03-13 | i18n key-parity passes | `tests/i18n/key-parity.test.ts` — 8 tests pass | unit | **CLOSED** |
| A-03-14 | `pnpm build` clean | exit code 0, 1.57s | automated | **CLOSED** |

**Manual acceptance guide for Pilot Checkpoint #5:**

- **A-03-02 Piano:** Open the app in Armonía. Select a chord in the Pentagrama (or add one via Tonnetz). Change Preset to "Piano". Play Armonía. Expect: a warm, controlled attack with a quick decay — distinct from the default sawtooth pad. The `triangle` oscillator, `attack:0.02`, `decay:0.4`, `sustain:0.1`, `release:0.3`, `lpf:1800`, `room:0.4` bundle should give a warm piano-like character.
- **A-03-03 Guitar:** Same flow, select "Guitarra". Expect: a bright plucked sound with a filter sweep (`lpenv:3`, `lpa:0.01`, `lpd:0.25`), very short sustain. Much shorter sustain than Piano, bright at attack.
- **A-03-04 Synth Bass:** Select "Bajo Sintético". Expect: a dark, rumbling sustained sound (`lpf:600`, `lpq:2`, `sustain:0.8`, `release:0.5`). Lower in perceived register than default sawtooth.
- **A-03-05 Noise:** Change Oscillator to "Ruido" (token `pink`). Expect: a textured noise pad — unmistakably different from waveform tones. Still harmonic/rhythmic when used with chord changes.
- **A-03-06 Placement:** The Oscillator + Presets selects appear AFTER the clave/escala/octava `.field` row, at the rightmost position in the harmony bottom row.
- **A-03-07 Accent border:** Click a Pentagrama slot. The `.sound-ctl` block should show a faint blue-purple border and slightly tinted background (accent `#8aa0ff`).
- **A-03-08 Pulse:** Click one slot, then click a different slot. A brief bright flash (~300ms) should fire on the second click before settling to the persistent accent border.
- **A-03-09 No border:** Click empty canvas to deselect. Accent border and background should disappear; the selects remain visible showing the intent values.
- **Tonnetz pulse (Pilot-requested):** Click any triangle in the Tonnetz view. The clicked triangle should briefly flash bright accent color then fade (~300ms). The existing active-chord pulse (on the currently-playing chord) is separate and unaffected.
- **Apply-to-new:** With no slot selected, change the Oscillator to "Sinusoidal" and Preset to "Piano". Click a Tonnetz triangle to add a new chord. The new chord should inherit `instrument:'sine'` and `preset:'piano'`. Confirm by selecting the new slot — the selectors should reflect those values.
- **Session round-trip:** Add a chord with Piano preset, save session, reload. The loaded chord should still show Piano in the Presets selector.

### Prototype parity

Not applicable — Oscillator/Preset menus, edit-mode feedback, and the Tonnetz click pulse
are net-new features that did not exist in `reference/orbifold.html`. No prototype source to
cite. Spec authority is ADR 0019.

### Decisions made (if any)

**Edit-mode pulse via microtask toggle:** The Svelte reactive block uses
`Promise.resolve().then(...)` to toggle `soundCtlPulsing` off and immediately back on.
This forces Svelte to flush the `class:sound-ctl--pulse` removal in one microtask tick,
then re-add it, allowing CSS animation to restart from the beginning. A simpler approach
(setting to `true` directly) would not re-trigger the animation if already in progress.
The `setTimeout(320ms)` cleanup clears the class after the animation completes.

**`_prevSlotIdx` guard:** The reactive block uses a local `_prevSlotIdx` to distinguish
"slot index changed to non-null" from "other reactive updates". Without this guard,
the pulse would fire on any reactive update that happens to re-run the block, even when
`$selectedSlotIdxStore` is unchanged.

**`playChord` signature unchanged for preset:** `playChord` takes `instrument/room/decay`
as positional args and passes them to `chordToStrudel`. The preset is already wired into
`chordToStrudel` via `resolveChordAttrs` in the `chordAttrs?` parameter path (step 03.3).
To thread preset through `playChord` would require a signature change and a new `chordAttrs`
argument. Since `playChord` is used for immediate chord preview (the one-shot audio fired
on Tonnetz click) and the preset is only meaningful at full-progression-codegen time (when
the pattern is sent to Strudel's engine), this is intentional. The instant preview uses
the oscillator sound only; the preset bundle is applied when the progression replays.

### Proposed Decisions Register entries (for Pilot consideration)

None new beyond what ADR 0019 already captures.

### Blockers resolved during this step (if any)

None. One ESLint transient issue: `OSCILLATORS` and `PRESET_TOKENS` const arrays were
flagged as `assigned a value but only used as a type` / `never used`. Fixed by removing
the const arrays and replacing `type OscillatorToken` with an explicit union literal type.
One Prettier formatting pass applied after ESLint fix.

### Environment state after this step

- Branch: `harmonic-rhythm-improvements/phase-01`
- 646 tests pass (unchanged from step 03.4).
- `pnpm build` → clean.
- `Header.svelte`: Phase 02 sound block fully replaced. Two selectors present.
  Edit-mode feedback implemented.
- `tonnetz-scene.ts`: preset threaded onto new chords; click pulse active.
- All four i18n dictionaries carry the new sound-control keys. Dead room/decay keys removed.

### Auto-continuation

**BLOCKED — Pilot Checkpoint #5 (manual audio/UX acceptance) required.**

This is the FINAL code step of Phase 03. The Pilot must:
1. Run `pnpm dev`, open the app in the browser in Armonía view.
2. Verify A-03-02..A-03-09 manually per the acceptance guide above.
3. Verify the Tonnetz click pulse is visible.
4. Verify apply-to-new behavior and session round-trip.

The Dev does NOT mark the phase complete. That is the Pilot's action at Checkpoint #5.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `feat(ui): Phase 03 step 03.5 — Oscillator + Presets selectors, edit-mode feedback, Tonnetz pulse, i18n`

- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.
