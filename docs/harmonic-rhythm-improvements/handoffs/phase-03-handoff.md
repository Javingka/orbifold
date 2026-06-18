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
