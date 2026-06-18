<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 02 — F1 chord sound attributes: data model ADR, codegen, persistence, agent schema, and top-bar UI

**Purpose:** Implement F1 — selectable chord sounds — by (1) authoring the sound-attribute data-model ADR, (2) extending the `Chord` type and harmony codegen with `instrument`, `room`, and `decay` attributes (default-preserving, byte-identical at default), (3) bumping persistence and agent schemas to v3 (lossy on old v2 sessions, per OQ-6), (4) promoting `_selectedSlotIdx` to a reactive Svelte store, and (5) adding a top-bar instrument/sound selector that applies to the selected slot and to new chords.

**Gate:** Phase 01 complete and merged to `main`. Pilot Checkpoint #1 passed (2026-06-17): OQ-1 through OQ-8 resolved — specifically OQ-1 (4 waveforms: `sawtooth`/`sine`/`square`/`triangle`), OQ-3 (promote `_selectedSlotIdx` to a reactive store), OQ-4 (F3/preview is a later phase — not in scope here), OQ-5 (`instrument` + `room` + `decay` in scope), OQ-6 (session schema 2→3 lossy bump), OQ-7 (agent CAN set new attributes verbatim), OQ-8 (one ADR: sound-attribute data model; non-looping preview ADR deferred to the F3 phase). Branch `harmonic-rhythm-improvements/phase-02` cut from `main`.

**Expected phase result:** A user can select an instrument waveform, room level, and decay for harmony chords from a top-bar selector; the selector changes the sound of the currently-selected Pentagrama slot AND applies to newly chosen chords; codegen emits the correct Strudel attributes; existing sessions with no sound attributes produce output byte-identical to pre-phase `main`; persistence and agent schemas are at version 3.

---

## Invariants (restate for the Dev — non-negotiable)

- **No `.fast`/`.slow` for tempo.** New attributes are timbre/space/envelope parameters, never tempo manipulation.
- **`core/**` stays pure.** `src/core/codegen/strudel.ts` and any new engine modules must have no DOM/PIXI/Svelte imports.
- **Byte-identical at default.** When a chord's `instrument`, `room`, and `decay` fields are all `undefined` (or `null`), `chordToStrudel` and `melodyLine` must emit the same string as pre-phase `main`: `…s("sawtooth").lpf(1200).gain(…).room(0.25|0.3)`. This is the reversibility guarantee.
- **Live changes re-queue to the next cycle.** Changing an attribute on the selected slot calls the same `requeueLive()` path as other slot mutations.
- **AGPL-3.0 header on all new or modified source files.**
- **No new dependencies** without Pilot approval; do not add packages.
- **Prototype-parity item does NOT apply** to this phase. F1 sound attributes (`instrument`, `room`, `decay`) are net-new features that did not exist in `reference/orbifold.html`. The Dev must NOT fabricate a prototype citation; simply state "no prototype source — net-new feature" in the handoff.

---

## Step 02.1 — Sound-attribute data-model ADR (Checkpoint #2)

PROMPT → Read `CLAUDE.md`, `references/methodology.md`, `docs/_archive/orbifold-v2/decisions.md` (carried-forward vigent rules), this phase file, `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(a) and §(c) (C-1 through C-3 and C-8), and the following source files for current types and codegen shapes: `src/core/codegen/strudel.ts` (lines 54–160), `src/state/session.ts` (the `Chord` type ~line 141, `playChord` ~line 601, `setChordBars` as a model for new slot-mutation actions), `src/lib/persistence.ts` (`SESSION_SCHEMA_VERSION` ~line 16, `SavedChordSchema` ~line 35, `loadSavedSession` ~line 289), `src/agent/schema.ts` (`SCHEMA_VERSION` ~line 17, `HarmonyChordCoreSchema` ~line 117), `src/render/pentagrama-scene.ts` (the `_selectedSlotIdx` declaration ~line 612 and its usages). Also read `docs/adr/0012-rest-data-model.md` and `docs/adr/0010-variable-chord-duration.md` as structural templates.

Produce `docs/adr/0018-chord-sound-attributes.md`. The ADR must address:

- **Context:** harmony sound chain is fully hardcoded; F1 requires `instrument`, `room`, and `decay` to be per-chord; the four waveforms confirmed in `@strudel/web@1.0.3`; Pilot decisions from OQ-1/OQ-5/OQ-6/OQ-7.
- **Decision (D1) — `Chord` type extension:** exact optional fields added (`instrument?: string`, `room?: number`, `decay?: number`); their default-value semantics (absent/`undefined` → use hardcoded current values, preserving byte-identical output); valid `instrument` values (`'sawtooth' | 'sine' | 'square' | 'triangle'`); valid ranges for `room` (0–1, following Strudel docs) and `decay` (> 0, representing seconds).
- **Decision (D2) — codegen injection pattern:** how `chordToStrudel` and `melodyLine` in `src/core/codegen/strudel.ts` are extended; the three callsites (line 64, 115, 141 per inventory §(a)); the exact conditional emit rule for each attribute (absent → omit and rely on hardcoded default; present → inject); why `lpf(1200)` is kept hardcoded (filter stays as deferred D-3; not changed in this phase).
- **Decision (D3) — persistence schema 2→3 (lossy):** bump `SESSION_SCHEMA_VERSION` 2→3; `SavedChordSchema` gains `instrument?: z.string()`, `room?: z.number()`, `decay?: z.number()`; old v2 sessions fail the `z.literal(3)` check and are silently dropped (graceful-degradation precedent from Phase 09 ADR 0013 D1). No migration function.
- **Decision (D4) — agent schema version bump:** bump `SCHEMA_VERSION` 2→3; `HarmonyChordCoreSchema` gains `instrument: z.string().optional()`, `room: z.number().optional()`, `decay: z.number().optional()`; technical tokens (`sawtooth`, `sine`, `square`, `triangle`) stay verbatim per the OQ-7 / ADR 0017 precedent.
- **Decision (D5) — `selectedSlotIdx` reactive store:** promote `_selectedSlotIdx` from a module-level variable in `pentagrama-scene.ts` to a Svelte writable store (e.g., `selectedSlotIdxStore` in `src/state/`); the PIXI scene writes to it; `Header.svelte` reads it to show/hide and pre-populate the sound selector.
- **Consequences:** list changes required in each file; confirm the byte-identical guarantee at default; note that F2 (rhythm) and F3 (preview) are deferred to later phases and this ADR does not cover them.

Do NOT write any source code. Do NOT commit. Stop and wait for Pilot Checkpoint #2 (ADR review) before writing any code.

Implementation requirements:
- The ADR must be internally consistent with the inventory §(a) line citations.
- Follow the structure of `docs/adr/0012-rest-data-model.md` (Context / Decision / Consequences).
- Do NOT number steps or sub-decisions beyond the D1–D5 pattern above; follow the ADR template.
- Do NOT touch source files.

Validation:
- `docs/adr/0018-chord-sound-attributes.md` exists and covers all five decisions (D1–D5).
- No source files modified (`git status` shows only the new ADR file).

Expected result:
- The ADR is ready for Pilot Checkpoint #2 review.
- All five decisions (Chord type, codegen, persistence, agent schema, reactive store) are written down and self-consistent.
- The Dev STOPS here; source-code steps begin only after Pilot approves the ADR.

CHECKPOINT → Commit message:
`docs(harmonic-rhythm-improvements): Phase 02 step 02.1 — ADR 0018 chord sound attributes`

---

## Step 02.2 — Core data model, codegen extension, and unit tests

PROMPT → Read `CLAUDE.md`, this phase file, `docs/adr/0018-chord-sound-attributes.md` (now Pilot-approved), `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(a) (codegen callsites), and the most recent handoff entry. Confirm no source files were changed in step 02.1 before writing code.

Implement the pure-engine changes (no DOM/PIXI/Svelte imports):

1. **`src/state/session.ts` — `Chord` type:** add `instrument?: string`, `room?: number`, `decay?: number` per ADR 0018 D1. Do not change any other type or function — only the `Chord` interface/type.

2. **`src/core/codegen/strudel.ts` — extend `chordToStrudel` and `melodyLine`:** add the three optional parameters (`instrument`, `room`, `decay`) following ADR 0018 D2. For each parameter: if `undefined`/absent, emit the current hardcoded string unchanged (byte-identical guarantee); if present, emit the attribute. Specifically:
   - `instrument` replaces `"sawtooth"` in `s(…)` when set.
   - `room` replaces the hardcoded `0.25` (in `chordToStrudel`) and `0.3` (in `melodyLine` uniform/arrange arms) when set.
   - `decay` appends `.decay(${val})` to the chain when set (position: after `.room(…)`, before any sustain expression). When absent, `.decay(…)` is not emitted.
   - `lpf(1200)` is NOT changed (deferred D-3).
   - The three callsites cited in the inventory (lines 64, 115, 141 in `strudel.ts`) must all be updated consistently.

3. **`src/core/codegen/strudel.test.ts` (or existing test file) — unit tests:** write tests that assert:
   - Default invocation (all three attributes absent/`undefined`) → emitted string is byte-identical to the pre-phase hardcoded output for each callsite (uniform `melodyLine`, arrange `melodyLine`, `chordToStrudel`). Name these tests clearly (e.g., "byte-identical at default").
   - `instrument: 'sine'` → emitted string contains `s("sine")`.
   - `instrument: 'square'` → emitted string contains `s("square")`.
   - `instrument: 'triangle'` → emitted string contains `s("triangle")`.
   - `room: 0.5` → emitted string contains `room(0.5)`.
   - `decay: 0.2` → emitted string contains `.decay(0.2)`.
   - All three attributes set together → the string is well-formed and all appear in the correct order.
   - `room` overrides the per-callsite defaults (0.25 for chord, 0.3 for melody) when present.

Implementation requirements:
- `src/core/codegen/strudel.ts` must not import any DOM/PIXI/Svelte symbol.
- The `Chord` type change in `session.ts` is the ONLY change to `session.ts` in this step; store actions and `playChord` are addressed in step 02.4.
- AGPL-3.0 header on any new file.
- All tests must pass: `pnpm exec vitest run src/core/codegen`.
- Typecheck must pass: `pnpm exec tsc --noEmit`.
- Lint must pass: `pnpm lint`.

Validation:
- `pnpm exec vitest run src/core/codegen` → all tests pass, including the new byte-identical-at-default tests.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.

Expected result:
- `chordToStrudel` and `melodyLine` accept optional sound attributes; existing callers that pass no new arguments are unaffected (zero TS errors, zero test regressions).
- Unit tests cover all seven attribute combinations listed above plus the byte-identical baseline for each callsite.

CHECKPOINT → Commit message:
`feat(codegen): Phase 02 step 02.2 — chord sound attributes in chordToStrudel and melodyLine`

---

## Step 02.3 — Persistence schema bump (2→3, lossy) and agent schema bump

PROMPT → Read `CLAUDE.md`, this phase file, `docs/adr/0018-chord-sound-attributes.md` (D3, D4), and the most recent handoff entry. Confirm step 02.2 is committed.

Implement the schema changes:

1. **`src/lib/persistence.ts` — persistence schema:**
   - Bump `SESSION_SCHEMA_VERSION` from `2` to `3`.
   - Add `instrument: z.string().optional()`, `room: z.number().optional()`, `decay: z.number().optional()` to `SavedChordSchema`.
   - No migration function — v2 sessions fail `z.literal(3)` and are dropped via the existing graceful-degradation path in `loadSavedSession` (per ADR 0018 D3 / OQ-6 resolution).
   - Confirm the drop path works: if a saved blob has `version: 2`, `safeParse` fails (version literal mismatch) and `loadSavedSession` returns `null`/the default state — this must be the behavior before AND after this change.

2. **`src/agent/schema.ts` — agent schema:**
   - Bump `SCHEMA_VERSION` from `2` to `3`.
   - Add `instrument: z.string().optional()`, `room: z.number().optional()`, `decay: z.number().optional()` to `HarmonyChordCoreSchema`.
   - Technical tokens (`'sawtooth'`, `'sine'`, `'square'`, `'triangle'`) are verbatim values the agent may pass; no i18n wrapping.

3. **Tests (persistence schema):** add or extend tests in the existing persistence test file (or create one if absent) that assert:
   - A valid v3 session blob with new attributes parses successfully.
   - A v2 session blob fails `safeParse` (version literal `2` does not match the new `z.literal(3)`) — the graceful-degradation path.
   - A v3 session blob with no new attributes (all three fields absent) parses and produces `undefined` for those fields, not an error.

Implementation requirements:
- Do not change anything else in `persistence.ts` or `schema.ts`.
- AGPL-3.0 header on any new file.
- `pnpm exec vitest run` → all tests pass.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.

Validation:
- `pnpm exec vitest run` → all tests pass; the v2-drop and v3-parse tests are green.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.

Expected result:
- Old v2 sessions are gracefully dropped on load.
- New v3 sessions with sound attributes parse without error.
- Agent schema gains the three optional fields for `HarmonyChordCoreSchema`.

CHECKPOINT → Commit message:
`feat(persistence): Phase 02 step 02.3 — session and agent schema v3 with chord sound attributes`

---

## Step 02.4 — Reactive `selectedSlotIdxStore`, store actions, and `playChord` threading

PROMPT → Read `CLAUDE.md`, this phase file, `docs/adr/0018-chord-sound-attributes.md` (D5), and the most recent handoff entry. Confirm step 02.3 is committed.

Implement the state-layer changes:

1. **New store `src/state/selectedSlot.ts`:** create a Svelte writable store `selectedSlotIdxStore: Writable<number | null>` (initial value `null`). Export it. Add AGPL-3.0 header.

2. **`src/render/pentagrama-scene.ts` — migrate `_selectedSlotIdx`:** replace the module-level `_selectedSlotIdx: number | null` variable with reads/writes to `selectedSlotIdxStore`. Every place that previously set `_selectedSlotIdx = n` now calls `selectedSlotIdxStore.set(n)`. Every place that previously read `_selectedSlotIdx` now reads via `get(selectedSlotIdxStore)` (from `svelte/store`). `resetPentagramaEditState` sets the store to `null`. Do NOT change any other logic in `pentagrama-scene.ts`.

3. **`src/state/session.ts` — new store actions:** add two actions:
   - `setChordInstrument(index: number, instrument: string): void` — updates `progression[index].instrument` and calls `requeueLive()`. Model on `setChordBars`.
   - `setChordSoundAttrs(index: number, attrs: { instrument?: string; room?: number; decay?: number }): void` — batch-updates all three optional fields on `progression[index]` and calls `requeueLive()`. Only sets fields that are not `undefined` in `attrs`.
   - `playChord` (existing) — pass the chord's `instrument`, `room`, `decay` fields through to `chordToStrudel` so a Tonnetz-click plays with the chord's own attributes.

4. **Confirm `playChord` threading:** `playChord` at `session.ts` ~line 601 currently calls `chordToStrudel(rootPc, qual, gain, octave)`. After this step it must also forward the chord's `instrument`, `room`, `decay` when playing a stored chord (index known), or use the current session defaults when no index is available (Tonnetz click without a stored chord). Identify the call path and thread correctly.

Implementation requirements:
- The new `src/state/selectedSlot.ts` must NOT import any DOM/PIXI symbol.
- `pentagrama-scene.ts` may import `selectedSlotIdxStore` from `../state/selectedSlot` (or the canonical path) — this is a Svelte store import, acceptable for a render module.
- Do NOT change `chordToStrudel` or `melodyLine` signatures further; they were finalized in step 02.2.
- AGPL-3.0 header on `selectedSlot.ts`.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.
- `pnpm build` → clean (no bundle errors).

Validation:
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.
- `pnpm build` → clean.
- Manual smoke: dev server starts; clicking a Pentagrama slot updates `selectedSlotIdxStore` (can be verified by a temporary console log or Svelte devtools — remove any debug log before committing).

Expected result:
- `selectedSlotIdxStore` is a writable store that reflects which Pentagrama slot is selected.
- `setChordSoundAttrs` can batch-update instrument/room/decay on any slot and triggers a live requeue.
- `playChord` uses the chord's own sound attributes when available.

CHECKPOINT → Commit message:
`feat(state): Phase 02 step 02.4 — selectedSlotIdxStore, setChordSoundAttrs action, playChord threading`

---

## Step 02.5 — Top-bar sound selector UI and apply-to-selected + apply-to-new behavior

PROMPT → Read `CLAUDE.md`, this phase file, `docs/adr/0018-chord-sound-attributes.md`, and the most recent handoff entry. Confirm step 02.4 is committed. Also read `src/ui/Header.svelte` in full (the `{#if $sessionStore.view === 'harmony'}` block where `acorde`/`arpegio`/`marco` live, and the tonalidad/escala/octava selectors that precede them per the Pilot's placement instruction). Read `src/i18n/` (the dictionary shape) to add translated labels for the new controls.

Implement the top-bar UI for chord sound selection:

1. **`src/ui/Header.svelte` — instrument + room + decay controls:** inside the `{#if $sessionStore.view === 'harmony'}` block, add the new controls AFTER the existing tonalidad / escala / octava selectors and BEFORE the existing acorde / arpegio / marco controls (the Pilot's explicit placement instruction).
   - **Instrument selector:** a `<select>` (or equivalent styled control matching the existing top-bar aesthetic) with four options: `sawtooth` / `sine` / `square` / `triangle`. Display labels must be i18n-aware (e.g., key `instrSawtooth`, `instrSine`, `instrSquare`, `instrTriangle` in the i18n dictionary, with the waveform name as the value/technical token). The control shows the instrument of `$selectedSlotIdxStore !== null ? $sessionStore.progression[$selectedSlotIdxStore]?.instrument ?? 'sawtooth' : 'sawtooth'` (the currently-selected slot's instrument, or the default if no slot selected).
   - **Room knob/slider:** a range input (or numeric input) for reverb level, range 0–1, step 0.01. Shows the selected slot's `room` value (or `0.25` as the default).
   - **Decay knob/slider:** a range input for decay time, range 0.05–2.0 (seconds), step 0.05. Shows the selected slot's `decay` value (or default empty / no `.decay()` emitted). A value of `0` or unset means no decay applied.
   - On change of any control: if `$selectedSlotIdxStore !== null`, call `setChordSoundAttrs($selectedSlotIdxStore, { instrument, room, decay })` (applies to the selected slot). The change takes effect on the next cycle (`requeueLive()` is called inside the action).
   - **Apply-to-new behavior:** the top-bar controls also serve as "intent" for new chords. When the user adds a new chord to the progression (by clicking a Tonnetz triad or via the agent), the new chord inherits the top-bar control values as its `instrument`, `room`, `decay`. Identify the new-chord creation path in `session.ts` (e.g., `addChord` or the equivalent) and thread the current top-bar values. If the Tonnetz click path (`playChord`) does not create a progression slot, only the Pentagrama slot-edit path need apply the intent.

2. **i18n dictionaries:** add keys for the new control labels to all four language dictionaries (`src/i18n/es.ts`, `en.ts`, `pt.ts`, `zh.ts`). At minimum: a section label (`instrLabel` or similar), the four waveform display names, and labels for the room and decay controls. Follow the existing dictionary key naming convention. The waveform technical tokens (`sawtooth`, `sine`, etc.) are verbatim in the emitted Strudel code — translated display labels are ONLY for the UI text, not the value attribute.

3. **Key-parity test:** the i18n key-parity test (`pnpm exec vitest run i18n` or the applicable pattern from Phase 11) must pass — all four dictionaries must have the new keys.

Implementation requirements:
- The UI controls must match the existing top-bar aesthetic (font, spacing, control style) — no new visual frameworks.
- Do NOT add a new package.
- AGPL-3.0 header on any new file.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.
- `pnpm build` → clean.
- `pnpm exec vitest run` → all tests pass including i18n key-parity.

Validation:
- `pnpm exec vitest run` → all tests pass.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.
- `pnpm build` → clean.
- Manual acceptance (live-system): dev server running; open the app; switch to Armonía view; confirm the instrument/room/decay controls appear after tonalidad/escala/octava; select a Pentagrama slot; change instrument to `sine` → after one cycle, the harmony sounds change; change back to `sawtooth` → sound returns to previous; add a new chord → new chord inherits the current instrument setting; save session → reload → new chord's instrument is preserved; load a pre-phase-02 session (v2 blob) → session is gracefully dropped (app returns to default state, no crash).

Expected result:
- A user can select instrument waveform, room level, and decay for harmony chords from the top bar.
- Changing the instrument for the selected Pentagrama slot re-queues immediately (next cycle).
- New chords inherit the current top-bar instrument intent.
- Old sessions are gracefully dropped; the app does not crash on v2 blobs.
- All four language dictionaries have the new keys; key-parity test passes.

CHECKPOINT → Commit message:
`feat(ui): Phase 02 step 02.5 — top-bar chord sound selector (instrument, room, decay)`

---

## Phase Acceptance

- **A-02-01** — Existing sessions with no `instrument`, `room`, or `decay` fields produce codegen output byte-identical to pre-phase `main` (sawtooth, `lpf(1200)`, `room(0.25|0.3)`, no `.decay(…)`).
  - Validation method: `unit` (byte-identical-at-default tests in `strudel.test.ts`)

- **A-02-02** — Setting `instrument: 'sine'`, `instrument: 'square'`, or `instrument: 'triangle'` on a chord produces the corresponding `s("sine"|"square"|"triangle")` in the emitted Strudel string.
  - Validation method: `unit` (instrument-variant tests in `strudel.test.ts`)

- **A-02-03** — Setting `room: N` on a chord produces `room(N)` in the emitted string, overriding the hardcoded 0.25/0.3 per-callsite defaults.
  - Validation method: `unit` (room-override tests in `strudel.test.ts`)

- **A-02-04** — Setting `decay: N` on a chord appends `.decay(N)` to the emitted string; absence of `decay` emits no `.decay(…)` at all.
  - Validation method: `unit` (decay-present and decay-absent tests in `strudel.test.ts`)

- **A-02-05** — A v2 persistence blob (old session, `version: 2`) is gracefully dropped on load — `loadSavedSession` returns the default state, the app does not crash, and no error is thrown to the user.
  - Validation method: `unit` (v2-drop test in persistence test file)

- **A-02-06** — A v3 persistence blob with the new optional fields (`instrument`, `room`, `decay`) parses without error and those fields are available on the loaded `Chord` objects.
  - Validation method: `unit` (v3-parse test in persistence test file)

- **A-02-07** — The agent can set `instrument`, `room`, and `decay` verbatim on chords in `HarmonyChordCoreSchema` (optional fields, technical tokens); the Zod schema accepts these values without error.
  - Validation method: `unit` (agent schema parse test in schema test file or inline)

- **A-02-08** — Clicking a Pentagrama slot updates `selectedSlotIdxStore`; the top-bar instrument/room/decay controls reflect that slot's current values.
  - Validation method: `manual` (dev server; click slot; confirm controls update)

- **A-02-09** — Changing the instrument selector while a slot is selected calls `setChordSoundAttrs` and the harmony audio changes on the next cycle.
  - Validation method: `manual` (dev server; change instrument; listen to next cycle)

- **A-02-10** — The top-bar sound controls appear AFTER tonalidad/escala/octava and BEFORE acorde/arpegio/marco in the Armonía view top bar.
  - Validation method: `manual` (visual inspection in dev server)

- **A-02-11** — All four i18n dictionaries (es/en/pt/zh) contain the new sound-control keys; the key-parity test passes.
  - Validation method: `unit` (i18n key-parity test, `pnpm exec vitest run i18n`)

- **A-02-12** — `pnpm build` produces a clean bundle with no errors or unresolved imports.
  - Validation method: `automated` (`pnpm build` exit code 0)

## Partial coverage from prior phase

No prior partials to address. Phase 01 was a pure-discovery phase; all five acceptance criteria (A-01-01 through A-01-05) were covered as `manual`/`proxy:static-analysis` in docs-only commits. No "partial" or "not covered" entries remain.

## ADR Triggers

Open `docs/adr/0018-chord-sound-attributes.md` in step 02.1 (the first step of this phase, which STOPS for Pilot Checkpoint #2 before any code is written):

- **ADR 0018 — Chord sound attributes data model** — Trigger: step 02.1. Covers `Chord` type extension (D1), codegen injection pattern (D2), persistence schema 2→3 lossy bump (D3), agent schema version bump (D4), and `selectedSlotIdxStore` reactive store (D5).

The non-looping preview ADR (for F3 / C-7) is **deferred** to the F3 phase per OQ-4/OQ-8 resolution. Do NOT open it here.

## Handoff Note

At the end of each step, the Dev appends a per-step entry to `docs/harmonic-rhythm-improvements/handoffs/phase-02-handoff.md`. At the end of the phase, the Dev appends a phase-completion entry. See `handoff-template.md`.

The handoff for every code-touching step must include an Acceptance Coverage Table mapping each relevant A-02-NN criterion to a test file, test type, and gap status. For `manual` criteria, the Dev must describe what was observed (not just "checked"). For `unit` criteria, the test file and test name must be cited. The **prototype-parity item does not apply** to this phase — the Dev writes "no prototype source — net-new feature" for F1 attributes in the handoff.
