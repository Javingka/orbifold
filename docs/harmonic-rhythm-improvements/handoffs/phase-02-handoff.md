<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Handoff — Phase 02 (F1 chord sound attributes)

---

## Step 02.1 — Sound-attribute data-model ADR (Checkpoint #2)

**Date:** 2026-06-17
**Commit(s):** (terminal commit — see note below)
**Iteration:** 1 of 5

### Completed

- Read all required files in order: `CLAUDE.md`, `docs/harmonic-rhythm-improvements/phases/phase-02.md`,
  `docs/harmonic-rhythm-improvements/decisions.md` (3 carried-forward rules), `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(a) and §(c) (C-1 through C-3 and C-8), `docs/harmonic-rhythm-improvements/handoffs/phase-01-handoff.md`.
- Read source files: `src/core/codegen/strudel.ts` lines 54–145 (exact hardcoded strings at lines 64, 115, 141);
  `src/state/session.ts` lines 130–165 (`Chord` type at line 141, `playChord` at line 601);
  `src/lib/persistence.ts` lines 1–120 (`SESSION_SCHEMA_VERSION = 2` at line 16, `SavedChordSchema` at line 35,
  `loadSavedSession` graceful-drop path at lines 284–294);
  `src/agent/schema.ts` lines 1–145 (`SCHEMA_VERSION = 2` at line 17, `HarmonyChordCoreSchema` at line 117);
  `src/render/pentagrama-scene.ts` around line 612 (`_selectedSlotIdx` declaration and all usages via grep).
- Read structural templates: `docs/adr/0012-rest-data-model.md` and `docs/adr/0010-variable-chord-duration.md`.
- Verified next free ADR number: listed `docs/adr/` — highest is `0017`; next is `0018`.
- Produced `docs/adr/0018-chord-sound-attributes.md` covering all five decisions D1–D5.
- Did NOT touch any source file (`.ts`, `.svelte`).

### Files touched

- `docs/adr/0018-chord-sound-attributes.md` (created)
- `docs/harmonic-rhythm-improvements/handoffs/phase-02-handoff.md` (created, this entry)

### Validation evidence

- `docs/adr/0018-chord-sound-attributes.md` exists and covers all five decisions:
  - D1: `Chord` type extension with `instrument?`, `room?`, `decay?`; default semantics; valid values and ranges.
  - D2: codegen injection pattern; the three callsites (lines 64, 115, 141); conditional emit rule per attribute; `lpf(1200)` stays hardcoded (D-3 deferred); exact current hardcoded strings cited.
  - D3: `SESSION_SCHEMA_VERSION` 2→3; `SavedChordSchema` gains three optional Zod fields; v2 sessions fail `z.literal(3)` and are dropped via existing graceful-degradation path; ADR 0013 D1 precedent cited.
  - D4: `SCHEMA_VERSION` 2→3; `HarmonyChordCoreSchema` gains three optional fields; technical tokens verbatim per OQ-7/ADR 0017 precedent.
  - D5: `selectedSlotIdxStore: Writable<number | null>` in new `src/state/selectedSlot.ts`; PIXI scene writes via `selectedSlotIdxStore.set(n)`; `Header.svelte` reads reactively; all 7 write-sites in `pentagrama-scene.ts` identified from grep.
- `git status` → only `docs/adr/0018-chord-sound-attributes.md` and this handoff file as new untracked files; no `.ts` or `.svelte` files modified.

### Routine validations

- `git status` → new untracked: `docs/adr/0018-chord-sound-attributes.md`, `docs/harmonic-rhythm-improvements/handoffs/phase-02-handoff.md`. No source files changed.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / artifact | Test type | Gap status |
|---|---|---|---|---|
| A-02-01 | Byte-identical at default (codegen) | `docs/adr/0018-chord-sound-attributes.md` D2 | proxy:doc-review | not yet — step 02.2 unit tests |
| A-02-02 | `instrument: 'sine'/'square'/'triangle'` produces correct `s(…)` | `docs/adr/0018-chord-sound-attributes.md` D2 | proxy:doc-review | not yet — step 02.2 unit tests |
| A-02-03 | `room: N` produces `room(N)`, overriding defaults | `docs/adr/0018-chord-sound-attributes.md` D2 | proxy:doc-review | not yet — step 02.2 unit tests |
| A-02-04 | `decay: N` appends `.decay(N)`; absence emits nothing | `docs/adr/0018-chord-sound-attributes.md` D2 | proxy:doc-review | not yet — step 02.2 unit tests |
| A-02-05 | v2 persistence blob dropped gracefully | `docs/adr/0018-chord-sound-attributes.md` D3 | proxy:doc-review | not yet — step 02.3 unit tests |
| A-02-06 | v3 persistence blob with new fields parses correctly | `docs/adr/0018-chord-sound-attributes.md` D3 | proxy:doc-review | not yet — step 02.3 unit tests |
| A-02-07 | Agent schema accepts `instrument`/`room`/`decay` as optional fields | `docs/adr/0018-chord-sound-attributes.md` D4 | proxy:doc-review | not yet — step 02.3 unit tests |
| A-02-08 | Clicking slot updates `selectedSlotIdxStore`; controls reflect slot values | `docs/adr/0018-chord-sound-attributes.md` D5 | proxy:doc-review | not yet — step 02.4/02.5 manual |
| A-02-09 | Changing instrument calls `setChordSoundAttrs`, audio changes next cycle | `docs/adr/0018-chord-sound-attributes.md` D5 + Consequences | proxy:doc-review | not yet — step 02.5 manual |
| A-02-10 | Sound controls appear after tonalidad/escala/octava, before acorde/arpegio/marco | `docs/adr/0018-chord-sound-attributes.md` Consequences | proxy:doc-review | not yet — step 02.5 manual |
| A-02-11 | All four i18n dictionaries have new sound-control keys; key-parity test passes | `docs/adr/0018-chord-sound-attributes.md` Consequences | proxy:doc-review | not yet — step 02.5 unit |
| A-02-12 | `pnpm build` clean bundle | n/a | automated | not yet — step 02.5 |

**Step 02.1 validation criterion (the only one in scope for this step):**
`docs/adr/0018-chord-sound-attributes.md` exists and covers D1–D5. Verified by doc-review.
No unit test is possible for a doc-only step.

### Prototype parity

Not applicable — F1 sound attributes (`instrument`, `room`, `decay`) are net-new features
that did not exist in `reference/orbifold.html`. No prototype citation is possible or
required.

### Decisions made (if any)

- None new — all decisions flowed from Pilot OQ-1/OQ-3/OQ-5/OQ-6/OQ-7/OQ-8 resolutions
  at Checkpoint #1 (2026-06-17). The ADR records those resolutions.

### Proposed Decisions Register entries (if any)

- None proposed at this step. The five D1–D5 sub-decisions are ADR-level records; Register
  entries (if any) will be proposed to the Pilot after the ADR is approved.

### Blockers resolved during this step (if any)

- None.

### Environment state after this step

- Branch: `harmonic-rhythm-improvements/phase-01` (the phase-02 branch is cut from
  `main` per the gate; this commit lands on the current branch).
- No source code changed; app behavior unchanged from `main`.

### Auto-continuation

**BLOCKED — Pilot Checkpoint #2 (ADR review) required before step 02.2.**

The Dev stops here. Step 02.2 (core data model, codegen extension, and unit tests) begins
only after the Pilot reviews and approves `docs/adr/0018-chord-sound-attributes.md`.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `docs(harmonic-rhythm-improvements): Phase 02 step 02.1 — ADR 0018 chord sound attributes`

- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.
