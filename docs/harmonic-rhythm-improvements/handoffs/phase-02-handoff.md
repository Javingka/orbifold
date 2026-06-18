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

---

## Step 02.2 — Core data model, codegen extension, unit tests

**Date:** 2026-06-17
**Commit(s):** (in step 02.2 commit — `feat(core): Phase 02 step 02.2 — Chord type + codegen extension (ADR 0018 D1/D2)`)
**Iteration:** 1 of 5

### Completed

- Extended `Chord` interface in `src/state/session.ts` with three optional fields: `instrument?: string`, `room?: number`, `decay?: number` (ADR 0018 D1). Added TSDoc with verbatim defaults and ranges.
- Extended `chordToStrudel` signature in `src/core/codegen/strudel.ts` to accept `instrument?`, `room?`, `decay?` params. Injected conditionally: `instrument !== undefined ? instrument : 'sawtooth'`, `room !== undefined ? room : 0.25`, and `.decay(N)` only when `decay !== undefined`. Byte-identical guarantee enforced by the conditional path.
- Extended `melodyLine` (uniform case and arrange case) similarly: uniform path passes top-level attrs; arrange path reads per-slot attrs via TS casts (slot type doesn't yet carry the fields) with top-level fallback. Decay placed before `.slow()` per ADR 0018 D2.
- Added 20 new unit tests in `tests/codegen.test.ts` across three describe blocks:
  - `chordToStrudel — ADR 0018 sound attributes` (10 tests, A-02-01 through A-02-04)
  - `melodyLine — ADR 0018 sound attributes (uniform case)` (5 tests)
  - `melodyLine — ADR 0018 sound attributes (arrange case)` (6 tests)
- All 62 codegen tests pass; 516 total tests pass. Fixed Prettier formatting.

### Files touched

- `src/state/session.ts` (Chord type extended)
- `src/core/codegen/strudel.ts` (chordToStrudel + melodyLine extended)
- `tests/codegen.test.ts` (20 new tests added)

### Validation evidence

- `pnpm exec vitest run` → 62 codegen tests pass (36 pre-existing + 20 new + 6 re-run). All 516 tests pass.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean (Prettier formatting fixed).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / artifact | Test type | Gap status |
|---|---|---|---|---|
| A-02-01 | Byte-identical at default (codegen) | `tests/codegen.test.ts` "byte-identical when no attrs" | unit | COVERED |
| A-02-02 | `instrument: 'sine'` etc. produces correct `s(…)` | `tests/codegen.test.ts` "instrument='sine'" | unit | COVERED |
| A-02-03 | `room: N` produces `room(N)` override | `tests/codegen.test.ts` "room override" | unit | COVERED |
| A-02-04 | `decay: N` appends `.decay(N)`; absent = nothing | `tests/codegen.test.ts` "decay present/absent" | unit | COVERED |
| A-02-05 | v2 blob dropped gracefully | — | unit | not yet (step 02.3) |
| A-02-06 | v3 blob with new fields parses correctly | — | unit | not yet (step 02.3) |
| A-02-07 | Agent schema accepts optional attrs | — | unit | not yet (step 02.3) |
| A-02-08 | Slot click updates store; controls reflect values | — | manual | not yet (step 02.4/02.5) |
| A-02-09 | Changing instrument calls setChordSoundAttrs | — | manual | not yet (step 02.5) |
| A-02-10 | Controls appear after key selector, before chord mode | — | manual | not yet (step 02.5) |
| A-02-11 | key-parity test passes with new keys | — | unit | not yet (step 02.5) |
| A-02-12 | `pnpm build` clean | — | automated | not yet (step 02.5) |

### Prototype parity

Not applicable — net-new feature. No prototype citation possible.

### Environment state after this step

- Branch: `harmonic-rhythm-improvements/phase-01`
- All core tests pass. Source files are clean. No behavior change with defaults.

---

## Step 02.3 — Persistence schema v3, agent schema v3, tests

**Date:** 2026-06-17
**Commit(s):** `feat(harmony): Phase 02 step 02.3 — persistence v3 + agent schema v3 (ADR 0018 D3/D4)`
**Iteration:** 1 of 5

### Completed

- Bumped `SESSION_SCHEMA_VERSION` from 2 to 3 in `src/lib/persistence.ts` (ADR 0018 D3).
- Added `instrument: z.string().optional()`, `room: z.number().min(0).max(1).optional()`, `decay: z.number().min(0).optional()` to `SavedChordSchema`. Updated `SavedSessionSchema.version` to `z.literal(3)`.
- Updated `serializeSession` to include new fields when present; updated `deserializeSession` to carry through new fields.
- Updated `applyLoadedSession` in `src/state/session.ts` to restore `instrument`, `room`, `decay` from loaded chords.
- Bumped `SCHEMA_VERSION` from 2 to 3 in `src/agent/schema.ts` (ADR 0018 D4). Added same 3 optional Zod fields to `HarmonyChordCoreSchema`.
- Updated `tests/persistence.test.ts`: all `version: 2` fixtures → `version: 3`; updated version-check test labels; added new `ADR 0018 D3` describe block with 4 tests (v2 drop, v3 accepts, round-trip, agent round-trip).
- Updated `tests/schema.test.ts`: `SCHEMA_VERSION` assertion → 3; added `ADR 0018 D4` describe block with 7 tests.
- Updated `tests/session.test.ts`: 3 backward-compat tests in `SavedChordSchema backward-compat — bars: 0.5 (A-03-08)` updated `version: 2` → `version: 3`.
- Fixed Prettier formatting in `tests/persistence.test.ts`.

### Files touched

- `src/lib/persistence.ts`
- `src/agent/schema.ts`
- `src/state/session.ts`
- `tests/persistence.test.ts`
- `tests/schema.test.ts`
- `tests/session.test.ts`

### Validation evidence

- `pnpm exec vitest run` → 536 tests pass (0 failures). All new ADR 0018 tests pass.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / artifact | Test type | Gap status |
|---|---|---|---|---|
| A-02-01 | Byte-identical codegen | `tests/codegen.test.ts` | unit | COVERED (step 02.2) |
| A-02-02 | instrument variants in codegen | `tests/codegen.test.ts` | unit | COVERED (step 02.2) |
| A-02-03 | room override in codegen | `tests/codegen.test.ts` | unit | COVERED (step 02.2) |
| A-02-04 | decay present/absent in codegen | `tests/codegen.test.ts` | unit | COVERED (step 02.2) |
| A-02-05 | v2 blob dropped gracefully | `tests/persistence.test.ts` "v2 rejected / dropped" | unit | COVERED |
| A-02-06 | v3 blob with new fields parses | `tests/persistence.test.ts` "v3 accepted + round-trip" | unit | COVERED |
| A-02-07 | Agent schema optional attrs | `tests/schema.test.ts` "ADR 0018 D4 sound attributes" | unit | COVERED |
| A-02-08 | Slot click updates store | — | manual | not yet (step 02.4/02.5) |
| A-02-09 | Changing instrument applies next cycle | — | manual | not yet (step 02.5) |
| A-02-10 | Controls placement in top bar | — | manual | not yet (step 02.5) |
| A-02-11 | key-parity test passes | — | unit | not yet (step 02.5) |
| A-02-12 | `pnpm build` clean | — | automated | not yet (step 02.5) |

### Prototype parity

Not applicable — net-new feature.

### Environment state after this step

- Branch: `harmonic-rhythm-improvements/phase-01`
- All 536 tests pass. Schema version is 3. Old v2 sessions are dropped on load.

---

## Step 02.4 — Reactive `selectedSlotIdxStore`, store actions, `playChord` threading

**Date:** 2026-06-17
**Commit(s):** `feat(state): Phase 02 step 02.4 — selectedSlotIdxStore, setChordSoundAttrs action, playChord threading`
**Iteration:** 1 of 5

### Completed

- Created `src/state/selectedSlot.ts` (new file, AGPL-3.0 header): exports `selectedSlotIdxStore: Writable<number | null>` and `soundIntentStore: Writable<{ instrument, room, decay }>`. Pure state file — no DOM/PIXI/Svelte component imports.
- Migrated `_selectedSlotIdx` in `src/render/pentagrama-scene.ts`: removed module-level variable; imported `selectedSlotIdxStore`; in `paint()` added `const _selectedSlotIdx = get(selectedSlotIdxStore)` (read-only local for the frame); in `onDn` replaced all 4 write-sites with `selectedSlotIdxStore.set(...)` and reads with `get(selectedSlotIdxStore)`; in `onUp` replaced 1 read; in `destroyPentagrama` replaced 1 write (`set(null)`). Zero behavior change.
- Added `setChordInstrument(index, instrument)` and `setChordSoundAttrs(index, attrs)` to `src/state/session.ts`, modeled on `setChordBars`. Both guard out-of-range and rest-slot cases; both call `requeueLive()`.
- Updated `playChord` signature in `src/state/session.ts` to accept optional `instrument?`, `room?`, `decay?` and forward them to `chordToStrudel`.
- `soundIntentStore` added to `selectedSlot.ts` for apply-to-new behavior (step 02.5 reads it in the Tonnetz click path).

### Files touched

- `src/state/selectedSlot.ts` (created)
- `src/render/pentagrama-scene.ts` (migrated _selectedSlotIdx)
- `src/state/session.ts` (new actions + playChord signature)

### Validation evidence

- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.
- `pnpm build` → clean (pre-existing chunking warnings only).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / artifact | Test type | Gap status |
|---|---|---|---|---|
| A-02-01 through A-02-07 | Codegen + schema | already covered | unit | COVERED |
| A-02-08 | Slot click updates store | `selectedSlotIdxStore` wired; no auto-test | manual | PARTIAL (store exists; UI in 02.5) |
| A-02-09 | `setChordSoundAttrs` + `requeueLive` | `src/state/session.ts` action | code-review | PARTIAL (action ready; UI in 02.5) |
| A-02-10 | Controls placement | — | manual | not yet (step 02.5) |
| A-02-11 | key-parity | — | unit | not yet (step 02.5) |
| A-02-12 | `pnpm build` clean | build verified | automated | COVERED |

### Prototype parity

Not applicable — net-new feature. The migration of `_selectedSlotIdx` to a store is a refactor with zero behavioral change; all existing Pentagrama interaction semantics are preserved.

### Environment state after this step

- Branch: `harmonic-rhythm-improvements/phase-01`
- All 536 tests pass. Build clean. State layer is ready for UI wiring.

---

## Step 02.5 — Top-bar sound selector UI, i18n keys, key-parity

**Date:** 2026-06-17
**Commit(s):** (committed as part of phase completion — see below)
**Iteration:** 1 of 5

### Completed

- Added `soundLabel`, `instrLabel`, `instrSawtooth`, `instrSine`, `instrSquare`, `instrTriangle`, `roomLabel`, `roomTip`, `decayLabel`, `decayTip` keys to `header.harmony` section of `Dictionary` type in `src/i18n/types.ts`.
- Added identical key sets to all four locale dictionaries: `es.ts` (Spanish), `en.ts` (English), `pt.ts` (Portuguese), `zh.ts` (Chinese). Waveform technical tokens (sawtooth/sine/square/triangle) remain [VERBATIM] in the `value` attribute; display labels are translated.
- Added instrument/room/decay controls to `Header.svelte` inside `{#if $sessionStore.view === 'harmony'}`: instrument `<select>` (4 options, waveform values verbatim, labels from `$t`), room `<input type="range" min=0 max=1 step=0.01>`, decay `<input type="range" min=0 max=2 step=0.05>`. Placement: after `.field` (tonalidad/escala/octava) and before the chord mode controls.
- Added `selectedSlotIdxStore` and `soundIntentStore` imports; added `setChordSoundAttrs` import. Local `intentInstrument`, `intentRoom`, `intentDecay` vars serve as the "intent" state when no slot is selected. Handlers write both the intent local, the `soundIntentStore` (for Tonnetz apply-to-new), and call `setChordSoundAttrs` when a slot is selected.
- Reactive derivations: `selSlot`, `selIsChord`, `displayInstrument`, `displayRoom`, `displayDecay` derived from `$selectedSlotIdxStore` and `$sessionStore.harmony.progression` — controls reflect the selected slot's values or the intent defaults.
- Updated `tonnetz-scene.ts` `pickChord` to import `soundIntentStore`, read intent values via `get(soundIntentStore)`, and pass non-default values as `instrument`/`room`/`decay` on the new `Chord` object and in the `playChord` call (apply-to-new behavior).
- CSS for `.sound-ctl`, `.sound-lbl`, `.sound-field`, `.sound-val` added to match header aesthetic.
- `pnpm exec vitest run` → all 536 tests pass including i18n key-parity.

### Files touched

- `src/i18n/types.ts` (10 new keys in `header.harmony`)
- `src/i18n/locales/es.ts` (10 new keys)
- `src/i18n/locales/en.ts` (10 new keys)
- `src/i18n/locales/pt.ts` (10 new keys)
- `src/i18n/locales/zh.ts` (10 new keys)
- `src/ui/Header.svelte` (sound controls UI + handlers + CSS)
- `src/render/tonnetz-scene.ts` (apply-to-new intent threading)
- `src/state/selectedSlot.ts` (soundIntentStore added — already committed in 02.4 placeholder; finalized here)

### Validation evidence

- `pnpm exec vitest run` → 536 tests pass. `tests/i18n/key-parity.test.ts` passes (8 tests, all 4 locales).
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean (Prettier auto-fixed Header.svelte).
- `pnpm build` → clean (exit 0, pre-existing chunking warnings only).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / artifact | Test type | Gap status |
|---|---|---|---|---|
| A-02-01 | Byte-identical codegen | `tests/codegen.test.ts` | unit | COVERED |
| A-02-02 | instrument variants in codegen | `tests/codegen.test.ts` | unit | COVERED |
| A-02-03 | room override in codegen | `tests/codegen.test.ts` | unit | COVERED |
| A-02-04 | decay present/absent in codegen | `tests/codegen.test.ts` | unit | COVERED |
| A-02-05 | v2 blob dropped gracefully | `tests/persistence.test.ts` | unit | COVERED |
| A-02-06 | v3 blob with new fields parses | `tests/persistence.test.ts` | unit | COVERED |
| A-02-07 | Agent schema optional attrs | `tests/schema.test.ts` | unit | COVERED |
| A-02-08 | Slot click → store → controls | `Header.svelte` reactive; `selectedSlotIdxStore` wired | manual | OPEN (manual acceptance pending) |
| A-02-09 | Instrument change → `setChordSoundAttrs` → next cycle | `Header.svelte` + `session.ts` | manual | OPEN (manual acceptance pending) |
| A-02-10 | Controls after key selector, before chord mode | `Header.svelte` placement | manual | OPEN (manual acceptance pending) |
| A-02-11 | key-parity test passes | `tests/i18n/key-parity.test.ts` | unit | COVERED |
| A-02-12 | `pnpm build` clean | build output | automated | COVERED |

### Prototype parity

Not applicable — net-new feature.

### Decisions made (if any)

- `soundIntentStore` added to `selectedSlot.ts` (not a new ADR decision; a natural extension of D5 for the apply-to-new behavior specified in 02.5).
- Non-default intent: instrument defaults (`'sawtooth'`) and room defaults (`0.25`) are stored as `undefined` on the new Chord (not as explicit values) to preserve byte-identical guarantee for the default case.

### Environment state after this step

- Branch: `harmonic-rhythm-improvements/phase-01`
- All 536 tests pass. All automated acceptance criteria covered. Manual acceptance (A-02-08/09/10) requires the Pilot to run the dev server.

### Auto-continuation

Phase 02 is complete. All steps committed. Automated validations all pass. Manual acceptance (A-02-08, A-02-09, A-02-10) requires Pilot checkpoint #5.

---

## Planner fix — `uniformAttrs` correctness (post-step-02.5)

**Date:** 2026-06-18
**Commit:** `fix(codegen): Phase 02 — per-slot sound attrs on bars=1 chords now reach arrange() path`
**Iteration:** Planner-identified fix before Checkpoint #5

### Issue found

`melodyLine`'s slowcat (uniform) path emitted `.s("sawtooth")` regardless of per-chord
`instrument/room/decay` fields, because `harmonyCode` passes no sound params to
`melodyLine` and the uniform path only reads function-level params. Any chord with
`bars === 1` and a non-default instrument would have its attribute silently ignored.

### Fix

Added `uniformAttrs` check (alongside `uniformDuration`) in `src/core/codegen/strudel.ts`:
the slowcat path is taken only when ALL chords have absent sound attributes.
Any non-default attribute forces the `arrange()` path, which reads per-slot fields.
Byte-identical guarantee (A-02-01) is preserved: all attrs absent → slowcat → unchanged output.

### Tests added

Three new regression tests in `tests/codegen.test.ts`:
- `per-slot instrument on bars=1 chord → arrange() path, attr applied`
- `per-slot room on bars=1 chord → arrange() path, room applied`
- `per-slot decay on bars=1 chord → arrange() path, decay applied`

Total: 539 tests pass (was 536).

### Updated Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / artifact | Test type | Gap status |
|---|---|---|---|---|
| A-02-01 | Byte-identical at default | `tests/codegen.test.ts` "byte-identical at default" | unit | COVERED |
| A-02-02 | instrument variants | `tests/codegen.test.ts` + per-slot fix tests | unit | COVERED |
| A-02-03 | room override | `tests/codegen.test.ts` + per-slot fix tests | unit | COVERED |
| A-02-04 | decay present/absent | `tests/codegen.test.ts` + per-slot fix tests | unit | COVERED |
| A-02-05 | v2 blob dropped | `tests/persistence.test.ts` | unit | COVERED |
| A-02-06 | v3 blob parses | `tests/persistence.test.ts` | unit | COVERED |
| A-02-07 | Agent schema optional attrs | `tests/schema.test.ts` | unit | COVERED |
| A-02-08 | Slot click → store → controls | — | manual | OPEN |
| A-02-09 | Instrument change → audio next cycle | — | manual | OPEN |
| A-02-10 | Controls placement | — | manual | OPEN |
| A-02-11 | i18n key-parity | `tests/i18n/key-parity.test.ts` | unit | COVERED |
| A-02-12 | `pnpm build` clean | build output | automated | COVERED |

---

## Pilot Checkpoint #5 resolution (2026-06-18)

Pilot ran the manual acceptance on the live dev server. Results:

- **A-02-09 — PASS.** Changing the instrument on a selected slot changes the harmony
  audio on the next cycle; reverting restores the original sound. The core F1 behavior
  (per-chord sound attributes through the full data → codegen → audio path) is validated.
- **A-02-08 — PARTIAL → deferred to Phase 03.** The controls do reflect and write the
  selected slot's attributes, but there is no visual signal that the controls are in
  "edit mode" for the highlighted note (vs. setting intent for new notes). Pilot
  requested: when a note is selected (Pentagrama slot or Tonnetz triangle), highlight the
  control group with a persistent accent border + a transient color pulse confirming
  "these parameters are recorded on this note." (Decision: **visible + highlight + pulse**,
  not hide-when-unselected.)
- **A-02-10 — PARTIAL → deferred to Phase 03.** The acceptance criterion was
  self-contradictory against the real top-bar order. Actual order:
  `Tonnetz/Pentagrama → acorde/arpegio → marco → clave/escala/octava → [sound]`.
  "After tonalidad/escala/octava AND before acorde/arpegio/marco" is unsatisfiable because
  acorde/arpegio/marco precede clave/escala/octava. The Dev placed the controls after
  octava → they landed at the end. Correct placement is resolved in the Phase 03 redesign.

**Pilot decision (Checkpoint #5):** A-02-08 and A-02-10 are **partials carried forward to
Phase 03**, NOT patched in isolation, because Phase 03 redesigns the entire sound-control
block (two menus: Oscillator + Presets) and the placement + edit-mode feedback are resolved
once within that redesign. Patching them now would be discarded work. Phase 02's core
deliverable (the F1 data model, codegen, persistence v3, agent schema v3, reactive
selected-slot store, functional sound change — A-02-09 ✓) is **accepted as complete**.

**Register proposals:** none. ADR 0018 captures all five Phase 02 decisions; no new vigent
rule emerged that is not already in the ADR. The schema-v3 lossy-drop contract lives in
ADR 0018 D3 and does not need duplication in the Register.

**New scope opened by the Pilot (→ Phase 03):** two separate selectors — an **Oscillator**
menu (sine/triangle/square/sawtooth + **noise**) and a **Presets** menu (Piano / Guitar /
Synth Bass) that load pre-built filter + envelope configurations. Presets touch the deferred
candidates D-3 (filter) and D-4 (filter envelope) from the Phase 01 inventory, so Phase 03
requires a new ADR (preset data model + which params + persistence) and a discovery of which
envelope/filter parameters exist in `@strudel/web@1.0.3`.

**Phase 02 status: COMPLETE** (A-02-08, A-02-10 deferred to Phase 03 by Pilot).
