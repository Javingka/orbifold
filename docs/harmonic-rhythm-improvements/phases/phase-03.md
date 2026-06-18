<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 03 — Oscillator + Presets sound menus, edit-mode feedback, and placement fix

**Purpose:** Replace the Phase 02 flat sound-control block with two focused selectors — an **Oscillator** menu (five waveforms incl. noise) and a **Presets** menu (Piano / Guitar / Synth Bass) — while resolving the A-02-08 edit-mode highlight/pulse and A-02-10 placement partials carried forward from Phase 02.

**Gate:** Phase 02 complete (Pilot Checkpoint #5 passed 2026-06-18; A-02-08/A-02-10 carried forward to this phase). Phase 02 is **NOT** merged to `main` — by Pilot decision, Phase 02 and Phase 03 accumulate on the same branch (`harmonic-rhythm-improvements/phase-01`, inherited name) and merge together once the sound-control block is complete and polished, to avoid exposing half-finished UI in production. Phase 03 continues on that branch (no new branch cut). Pilot Checkpoint #1 (Phase 03 inventory, step 03.1) must pass before step 03.2.

**Expected phase result:** The top-bar Armonía sound block shows two `<select>` menus — Oscillator and Presets — in a concrete, documented position; selecting a Pentagrama slot or Tonnetz triangle highlights the block with a persistent accent border and a transient color pulse; the three confirmed presets produce audibly distinct characters; no new attributes are emitted for chords that had none (byte-identical at default); persistence and agent schemas are at v4 (or an argued v3 amendment, to be settled by the ADR); all four i18n dictionaries carry the new keys; `pnpm test`, `pnpm lint`, and `pnpm build` pass clean.

---

## Invariants (restate for the Dev — non-negotiable)

- **No `.fast`/`.slow` for tempo.** New attributes are timbre/filter/envelope parameters, never tempo manipulation. The per-segment `.slow(N)` in `arrange()` for variable-duration slots (ADR 0016) is a duration expression and does not violate this invariant.
- **`core/**` stays pure.** Any new preset-resolution or codegen modules in `src/core/` must have no DOM/PIXI/Svelte imports.
- **Byte-identical at default.** A chord with no `oscillator`, `preset`, or any filter/envelope attributes set must emit a string character-for-character identical to the pre-Phase-02 `main` hardcoded output. The `uniformAttrs` gate in `melodyLine` must remain correct.
- **Live changes re-queue to the next cycle.** Selecting a preset or changing the oscillator on a selected slot calls `requeueLive()`.
- **AGPL-3.0 header on all new or modified source files.**
- **No new npm packages** without Pilot approval; do not add packages.
- **Consult live Strudel docs** (`https://strudel.cc/learn/`) and the pinned `node_modules/@strudel/web/dist/index.mjs` for confirmed attributes — do not assume from memory.
- **Prototype-parity item does NOT apply.** Oscillator/Preset menus are net-new features. The Dev writes "no prototype source — net-new feature" in the handoff.

---

## Partial coverage from prior phase

- **A-02-08** (partial) → addressed by **A-03-07** and **A-03-08** in this phase. The edit-mode highlight (persistent accent border) and transient color pulse are implemented in the redesigned sound block.
- **A-02-10** (partial) → addressed by **A-03-06** in this phase. A-02-10 was unsatisfiable against the real top-bar order; this phase pins a concrete, satisfiable placement target in the discovery step and verifies it against the live header.

---

## Step 03.1 — Discovery inventory (Checkpoint #1)

PROMPT → Read `CLAUDE.md`, `docs/harmonic-rhythm-improvements/decisions.md`, the most recent handoff (`docs/harmonic-rhythm-improvements/handoffs/phase-02-handoff.md` Checkpoint #5 section), this phase file, `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(b) and §(c) (D-3, D-4), `docs/adr/0018-chord-sound-attributes.md` (D1/D2), and `src/core/codegen/strudel.ts` (the current `melodyLine` and `chordToStrudel` signatures). Then run the following discovery tasks and produce `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md`.

The inventory must contain five sections:

**(a) Noise token confirmation.** Consult `node_modules/@strudel/web/dist/index.mjs` and the live Strudel synths page (`https://strudel.cc/learn/synths/`) to confirm which noise token (`pink`, `white`, or `brown`) is registered and sounds most musically appropriate for a harmony chord (i.e., least like pure noise-floor). State the chosen token with a one-sentence justification. "Crackle" is excluded because it has an irregular, percussive character unsuited to sustained harmony.

**(b) Amplitude-envelope parameter confirmation.** For each parameter in the set `{ attack, decay, sustain, release }` and any aliases (`att`, `dec`, `sus`, `rel`), confirm whether the parameter is registered and functional in `@strudel/web@1.0.3` by searching `node_modules/@strudel/web/dist/index.mjs` for each name. State for each: confirmed-present / confirmed-absent / uncertain (and why). Identify which subset is used by the three preset definitions in section (d).

**(c) Filter parameter confirmation.** For each parameter in the set `{ lpf, cutoff, lpq, hpf, lpenv, lpa, lpd, lps, lpr }`, confirm whether it is registered in `@strudel/web@1.0.3` from `node_modules/@strudel/web/dist/index.mjs`. State for each: confirmed-present / confirmed-absent. Identify which subset the preset definitions in section (d) require.

**(d) Concrete preset definitions.** Propose the exact Strudel attribute combinations for the three named presets (Piano / Guitar / Synth Bass), using only parameters confirmed in sections (b) and (c). Each preset must:
- Name the waveform (`instrument` value).
- List each additional attribute with its exact numeric value (e.g., `lpf: 900`, `attack: 0.01`).
- Include a one-sentence description of the expected sonic character.
- Cite the confirmed parameter names from sections (b)/(c).

These definitions are proposals for the Pilot to validate at Checkpoint #1 via audio. The ADR in step 03.2 will lock them.

**(e) Placement proposal.** Enumerate the actual order of controls in `src/ui/Header.svelte` inside the `{#if $sessionStore.view === 'harmony'}` block (read the file). Propose a concrete target order for the redesigned sound block, named as an ordered list:
1. Sub-toggle (Tonnetz / Pentagrama)
2. acorde / arpegio
3. marco
4. clave / escala / octava
5. **[proposed sound block position: confirm or justify a different slot]**

State whether the Phase 02 placement (sound block after clave/escala/octava, at the row end) should be kept or whether a different position is warranted. The Pilot resolves this at Checkpoint #1 if the Planner's recommendation leaves it open.

The Planner's working recommendation (override if evidence differs): keep the sound block **after** clave/escala/octava (at the row end) — this is already the Phase 02 position and is logically correct (timbre controls are less frequently adjusted than key/mode and more context-specific than chord structure). The A-02-10 criterion was partial because its written target was self-contradictory, not because the actual placement was wrong.

Implementation requirements:
- Do NOT touch any source file.
- Do NOT write an ADR yet.
- Confirm every parameter claim against the live bundle or live docs per CLAUDE.md invariant.

Validation:
- `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md` exists and covers all five sections.
- No source files modified (`git status` shows only the new inventory file).

Expected result:
- The noise token is chosen and justified.
- Amplitude-envelope and filter parameters are confirmed available or unavailable.
- Three preset definitions are proposed with exact attribute values.
- The placement target is stated explicitly.
- The Dev STOPS here; step 03.2 begins only after Pilot Checkpoint #1.

CHECKPOINT → Commit message:
`docs(harmonic-rhythm-improvements): Phase 03 step 03.1 — discovery inventory (noise, envelope, filter, presets, placement)`

---

## Step 03.2 — ADR 0019 (Oscillator / Preset data model) (Checkpoint #2)

PROMPT → Read `CLAUDE.md`, `docs/harmonic-rhythm-improvements/decisions.md`, this phase file, `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md` (now Pilot-approved, Checkpoint #1 passed), `docs/adr/0018-chord-sound-attributes.md` (structure reference), and the most recent handoff. Also read `src/state/session.ts` (the `Chord` interface), `src/lib/persistence.ts` (`SESSION_SCHEMA_VERSION`, `SavedChordSchema`), and `src/agent/schema.ts` (`SCHEMA_VERSION`, `HarmonyChordCoreSchema`).

Produce `docs/adr/0019-oscillator-preset-model.md`. The ADR must address:

- **Context:** Phase 02 delivered `instrument?`, `room?`, `decay?` on `Chord` and the current flat sound block. Phase 03 introduces (1) a noise oscillator token alongside the four waveforms, and (2) presets that bundle waveform + filter + envelope parameters. The ADR extends ADR 0018 D1–D2.

- **D1 — Oscillator field rename or extension:** decide whether `Chord.instrument` is extended to include the noise token (adding `'pink'` / `'white'` / `'brown'` — whichever was confirmed in step 03.1 — to the valid-value set), or whether a new `oscillator` field replaces `instrument` for cleaner semantics. Recommend and justify. If `instrument` is extended, the UI exposes it as the "Oscillator" selector. If a new field is introduced, define the migration from `instrument` to `oscillator` (backward-read rule; does it require a schema version bump?).

- **D2 — Preset representation:** decide how a preset is stored on a `Chord`. Two options:
  - **Name-only:** store the preset NAME (e.g., `preset: 'piano' | 'guitar' | 'synth-bass' | undefined`) as a single string field; a pure-engine lookup table in `src/core/codegen/presets.ts` maps name → param bundle at codegen time. Avoids storing redundant expanded attributes.
  - **Expanded:** when a preset is selected, write all its constituent attributes (lpf, attack, decay, etc.) directly onto the `Chord` fields and do NOT store a preset name. The UI re-derives the active preset from a reverse-lookup at render time (or shows no active preset if the attributes were manually edited).
  - State the Planner's recommendation and why. The Pilot resolves at Checkpoint #2.

- **D3 — Preset/oscillator independence:** when both an oscillator and a preset are selected for the same chord, which wins? Options: (a) preset always overrides oscillator (the preset's waveform is canonical); (b) oscillator always overrides the preset's waveform (user can pick a preset for filter/envelope but swap the waveform); (c) they are mutually exclusive (selecting a preset clears the oscillator selection and vice versa). Recommend and justify.

- **D4 — New `Chord` fields:** list the exact new optional fields added to `Chord` (beyond what ADR 0018 introduced). Include the filter and envelope fields needed by the confirmed presets from the inventory. State default-value semantics for each (absent = omit from codegen = byte-identical guarantee for chords with none of these fields).

- **D5 — Persistence schema version bump:** is a 3→4 bump required, or can the new fields be added as optionals under the existing v3 schema without a bump (per the Zod-optional-fields argument)? State the recommendation. Note: a bump is simpler and consistent with precedent (ADR 0013 D1, ADR 0018 D3); no-bump is possible only if the Pilot accepts the risk of indistinguishable v3-before and v3-after sessions.

- **D6 — Agent schema:** can the agent set `oscillator`/`preset` and the new filter/envelope fields? Technical tokens stay verbatim per ADR 0017 / ADR 0018 D4 precedent.

- **D7 — `uniformAttrs` gate amendment:** the `uniformAttrs` check in `melodyLine` (introduced as the `ADR 0018 D2 amendment` in Phase 02) must be updated to include the new fields. State exactly which fields are included in the check.

- **Consequences:** list all files that change; confirm the byte-identical guarantee; note deferred items (D-5 / D-6 from inventory remain deferred unless the presets require them).

Do NOT write any source code. Do NOT commit. Stop and wait for Pilot Checkpoint #2 before writing any code.

Implementation requirements:
- Follow the structure of `docs/adr/0018-chord-sound-attributes.md`.
- Do NOT touch source files.

Validation:
- `docs/adr/0019-oscillator-preset-model.md` exists and covers all seven decisions (D1–D7).
- No source files modified.

Expected result:
- The ADR is ready for Pilot Checkpoint #2 review.
- All seven decisions are written and internally consistent.
- The Dev STOPS here.

CHECKPOINT → Commit message:
`docs(harmonic-rhythm-improvements): Phase 03 step 03.2 — ADR 0019 oscillator/preset model`

---

## Step 03.3 — Preset engine: `core/codegen/presets.ts`, codegen extension, unit tests

PROMPT → Read `CLAUDE.md`, this phase file, `docs/adr/0019-oscillator-preset-model.md` (now Pilot-approved, Checkpoint #2 passed), `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md` (confirmed param set and preset definitions), and the most recent handoff. Also read `src/core/codegen/strudel.ts` in full (the current `melodyLine` and `chordToStrudel` signatures with the ADR 0018 D2 additions).

Implement the pure-engine changes (no DOM/PIXI/Svelte imports):

1. **`src/core/codegen/presets.ts` (new file):** create a preset lookup table and a `resolveChordAttrs` function that takes a `Chord`-like object and returns a fully-resolved attribute bundle (oscillator, lpf, attack/decay/sustain/release as applicable, room, decay/envelope values). The function must:
   - Apply preset defaults if a preset name is set.
   - Override with any explicit per-chord attribute values (per ADR 0019 D3 precedent).
   - Return defaults when no preset and no explicit values are set — producing the byte-identical baseline for each attribute.
   - Export the `PRESET_NAMES` constant (the three preset name literals) and the `PresetName` type.
   - AGPL-3.0 header.

2. **`src/state/session.ts` — `Chord` type extension:** add the new optional fields from ADR 0019 D4 (oscillator/preset and confirmed filter/envelope fields). Do not change any other type or action in this step — store actions are addressed in step 03.4.

3. **`src/core/codegen/strudel.ts` — extend `chordToStrudel` and `melodyLine`:** update both functions to consume the new fields from the `Chord` type via `resolveChordAttrs`. Update `uniformAttrs` per ADR 0019 D7 to include all new fields. Byte-identical guarantee: `resolveChordAttrs` returns the same defaults as the Phase 02 hardcoded values when no new fields are set.

4. **Unit tests (`tests/presets.test.ts` and additions to `tests/codegen.test.ts`):**
   - `presets.test.ts`: test `resolveChordAttrs` for each preset (Piano, Guitar, Synth Bass) — assert the exact attribute values match the ADR 0019 D2 preset table.
   - `presets.test.ts`: test the byte-identical case (no preset, no new attrs) — `resolveChordAttrs` returns exact baseline values.
   - `presets.test.ts`: test D3 override rule (explicit attr overrides preset default for that attr).
   - `codegen.test.ts` additions: (a) byte-identical-at-default with new fields absent confirms no regression; (b) `preset: 'piano'` on a chord → emitted string contains the Piano preset's exact attribute chain; (c) `oscillator: '<noise-token>'` → emitted string contains `s("<noise-token>")`.

Implementation requirements:
- `src/core/codegen/presets.ts` must not import any DOM/PIXI/Svelte symbol.
- `src/state/session.ts` Chord type change is the ONLY change to `session.ts` in this step.
- AGPL-3.0 header on `presets.ts`.
- `pnpm exec vitest run src/core` → all tests pass.
- `pnpm exec vitest run tests/presets` → all new preset tests pass.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.

Validation:
- `pnpm exec vitest run` → all tests pass including new preset and codegen additions.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.

Expected result:
- `resolveChordAttrs` resolves presets to exact attribute bundles.
- `chordToStrudel` and `melodyLine` emit the correct Strudel chain for each preset.
- Chords with no preset and no new attributes produce byte-identical output to pre-phase-03 `main`.

CHECKPOINT → Commit message:
`feat(codegen): Phase 03 step 03.3 — preset engine (presets.ts) and codegen extension`

---

## Step 03.4 — Data model, persistence schema bump, and agent schema bump

PROMPT → Read `CLAUDE.md`, this phase file, `docs/adr/0019-oscillator-preset-model.md` (D5, D6), and the most recent handoff. Confirm step 03.3 is committed.

Implement the schema changes:

1. **`src/lib/persistence.ts` — persistence schema (ADR 0019 D5):** bump `SESSION_SCHEMA_VERSION` per the ADR decision (3→4 if a bump was decided; otherwise add optional fields under v3). Add the new `Chord` optional fields to `SavedChordSchema`. Update `serializeSession` and `deserializeSession` to carry through the new fields. Confirm the graceful-degradation path: v3 (or older) sessions that fail the new schema check are dropped, app loads default state, no crash.

2. **`src/state/session.ts` — new store actions:**
   - `setChordOscillator(index: number, oscillator: string): void` — updates `progression[index].oscillator` (or `instrument` per ADR 0019 D1 decision) and calls `requeueLive()`.
   - `setChordPreset(index: number, preset: string | undefined): void` — updates `progression[index].preset` (if name-only model per ADR 0019 D2) and calls `requeueLive()`.
   - A combined `setChordSoundAttrsV2(index, attrs)` that accepts all new fields (oscillator, preset, plus any explicit filter/envelope overrides) may replace or extend `setChordSoundAttrs` — follow ADR 0019 D4. If extending, the existing `setChordSoundAttrs` must remain callable for backward compat (or be made obsolete with a comment noting the migration).

3. **`src/agent/schema.ts` — agent schema (ADR 0019 D6):** bump `SCHEMA_VERSION` per the ADR decision. Add `oscillator`, `preset`, and any new filter/envelope fields as optional to `HarmonyChordCoreSchema`. Technical tokens (`'piano'`, `'guitar'`, `'synth-bass'`, noise token name) stay verbatim.

4. **`src/state/selectedSlot.ts` — `soundIntentStore` update:** extend the `soundIntentStore` shape to include `oscillator?: string` and `preset?: string` (in addition to the existing `instrument`, `room`, `decay`) so Tonnetz chord creation and no-selection intent can carry the new attributes forward. Confirm that the `decay: 0` sentinel (meaning "no decay applied") is preserved or documented; if the ADR changes the semantics, update accordingly.

5. **Tests:** add or extend tests:
   - Persistence: v(N-1) session blob dropped gracefully; v(N) session with new fields parses; round-trip with new fields preserves them.
   - Agent schema: `HarmonyChordCoreSchema` accepts `oscillator`, `preset`, and new filter fields as optional; rejects invalid preset names (if the schema uses a literal union).

Implementation requirements:
- Do not change `presets.ts` or codegen in this step.
- AGPL-3.0 header on any new or modified file.
- `pnpm exec vitest run` → all tests pass.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.

Validation:
- `pnpm exec vitest run` → all tests pass; schema bump and drop tests are green.
- `pnpm exec tsc --noEmit` → clean.
- `pnpm lint` → clean.

Expected result:
- Old sessions (pre-phase-03) are gracefully dropped on load.
- New sessions with oscillator/preset/filter/envelope attributes parse and round-trip cleanly.
- Agent schema accepts the new optional fields with verbatim technical tokens.

CHECKPOINT → Commit message:
`feat(persistence): Phase 03 step 03.4 — schema bump v4 (oscillator, preset, filter/envelope fields)`

---

## Step 03.5 — Top-bar UI redesign: Oscillator select, Presets select, edit-mode feedback, placement, i18n

PROMPT → Read `CLAUDE.md`, this phase file, `docs/adr/0019-oscillator-preset-model.md`, `docs/harmonic-rhythm-improvements/inventories/phase-03-inventory.md` (placement target from §(e)), and the most recent handoff. Confirm step 03.4 is committed. Also read `src/ui/Header.svelte` in full (the `{#if $sessionStore.view === 'harmony'}` block, the existing `.sound-ctl` block at ~lines 658–718, and the CSS at the bottom) and `src/i18n/types.ts` (the dictionary shape).

Implement the top-bar UI redesign:

1. **`src/ui/Header.svelte` — replace the flat sound block with two menus:**
   - Remove the existing `.sound-ctl` block (the three controls from Phase 02: instrument select, room slider, decay slider).
   - Add a new `.sound-ctl` block in the confirmed placement position (see inventory §(e) and acceptance criterion A-03-06) containing:
     - **Oscillator `<select>`:** five options in order: `sine` / `triangle` / `square` / `sawtooth` / `<noise-token>`. Option values are verbatim Strudel technical tokens. Display labels are i18n-aware (keys `instrSine`, `instrSquare`, `instrTriangle`, `instrSawtooth`, `instrNoise` — or equivalent per ADR 0019 D1 naming). The control shows the oscillator of the selected slot (or the `soundIntentStore` oscillator when no slot is selected).
     - **Presets `<select>`:** four options: `—` (no preset / blank, value `''` or `undefined`), `Piano`, `Guitar`, `Synth Bass`. Display labels from i18n. The control shows the preset of the selected slot (or `soundIntentStore.preset` when no slot is selected).
     - The room slider and decay slider from Phase 02 are **removed** from the top bar in this redesign. Room and decay are now bundled inside presets; they are not exposed as manual sliders (this is the "less complexity" principle). If the ADR 0019 concluded otherwise, follow the ADR.
   - On change of Oscillator: if `$selectedSlotIdxStore !== null`, call `setChordOscillator($selectedSlotIdxStore, value)`. Update `soundIntentStore.oscillator`. Re-queue via the action's internal `requeueLive()`.
   - On change of Presets: if `$selectedSlotIdxStore !== null`, call `setChordPreset($selectedSlotIdxStore, value || undefined)`. Update `soundIntentStore.preset`. Re-queue.
   - Apply-to-new: when no slot is selected, the controls show and update `soundIntentStore`. `tonnetz-scene.ts` reads `soundIntentStore` in `pickChord` and applies the oscillator and preset to the new chord (the same apply-to-new pattern as Phase 02 step 02.5).

2. **Edit-mode feedback (A-02-08 resolution — A-03-07 and A-03-08):**
   - **Persistent accent border:** when `$selectedSlotIdxStore !== null` (a slot is selected), the `.sound-ctl` block renders with a CSS class (e.g., `.sound-ctl--active`) that applies a `1px solid var(--tonic)` border (or equivalent from the app's existing color vocabulary; `var(--tonic)` is `#f3b15a` per CLAUDE.md invariant) and a slightly elevated background, signaling "these parameters are recorded on THIS note."
   - **Transient color pulse:** on selection of a new slot (the `$selectedSlotIdxStore` value changes to a non-null index), the `.sound-ctl` block plays a brief CSS pulse animation (~300 ms) on the accent color, then settles to the persistent accent border. This confirms to the user that the displayed values belong to the newly-selected note. Implement with a Svelte reactive statement that adds/removes a transient CSS class on `$selectedSlotIdxStore` change.
   - When `$selectedSlotIdxStore` is `null`, the block renders without the accent border (showing intent for new chords, same visual as Phase 02 baseline). No pulse plays on null.
   - Do NOT hide the block when no slot is selected (Pilot decision from Checkpoint #5 resolution in the Phase 02 handoff: "visible + highlight + pulse, not hide-when-unselected").

3. **Update `src/render/tonnetz-scene.ts` `pickChord`:** extend the `soundIntentStore` read to include the new `oscillator` and `preset` fields, passing them on the new chord and in the `playChord` call.

4. **i18n (`src/i18n/types.ts` and all four locale files):**
   - Remove keys that no longer exist after the redesign (if any — e.g., `roomLabel`, `roomTip`, `decayLabel`, `decayTip` from the Phase 02 `header.harmony` section, IF the room/decay sliders were removed).
   - Add keys for the new controls: Oscillator label (`oscillatorLabel`), each waveform option label (keep the existing four; add `instrNoise` or equivalent for the noise token), Presets section label (`presetLabel`), and the three preset display names (`presetPiano`, `presetGuitar`, `presetSynthBass`), plus a "no preset" option label (`presetNone`).
   - Add keys for the edit-mode feedback: tooltip when the block is in edit mode vs. intent mode (`soundEditTip`, `soundIntentTip` or equivalent).
   - Update all four locale files (es/en/pt/zh) consistently.
   - The key-parity test must pass.

5. **CSS in `Header.svelte`:** add `.sound-ctl--active` (accent border + background), the pulse `@keyframes` animation, and the transient class rule. Ensure the selects use the same `.field`/`.seg` aesthetic as existing header controls (no new visual framework).

Implementation requirements:
- The new selects must match the existing header aesthetic.
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
- Manual acceptance (live-system): dev server running; open the app in Armonía view; confirm both selects appear; select a Pentagrama slot → `.sound-ctl` gains accent border + brief pulse; change Oscillator → harmony audio changes next cycle; change Preset to Piano → audio adopts Piano character; deselect slot (click empty canvas) → accent border disappears; add a new chord via Tonnetz → new chord inherits the current Oscillator/Preset intent; save session → reload → chord retains its Oscillator/Preset settings.

Expected result:
- The sound block shows exactly two `<select>` menus (Oscillator and Presets).
- Edit-mode feedback (accent border + pulse) works on both Pentagrama slot and Tonnetz triangle selection.
- Placement matches the target from inventory §(e).
- All four language dictionaries have the new keys; key-parity test passes.
- Manual acceptance confirming audio character and UI behavior.

CHECKPOINT → Commit message:
`feat(ui): Phase 03 step 03.5 — Oscillator+Presets menus, edit-mode feedback, placement (A-02-08/A-02-10 resolution)`

---

## Phase Acceptance

- **A-03-01** — A chord with no oscillator, preset, or any filter/envelope attributes set produces codegen output byte-identical to the pre-Phase-02 `main` hardcoded output (sawtooth, `lpf(1200)`, `room(0.25/0.3)`, no `.decay(…)`).
  - Validation method: `unit` (byte-identical-at-default tests in `tests/codegen.test.ts` and `tests/presets.test.ts`)

- **A-03-02** — Selecting the Piano preset produces an audibly distinct character (controlled attack, warm filter, plucked decay) in the harmony audio.
  - Validation method: `manual` (live-system; dev server; select Piano preset; listen to next cycle)

- **A-03-03** — Selecting the Guitar preset produces an audibly distinct character (short pluck, filtered bright attack) in the harmony audio.
  - Validation method: `manual` (live-system; dev server; select Guitar preset; listen to next cycle)

- **A-03-04** — Selecting the Synth Bass preset produces an audibly distinct character (dark, sustained, bass register) in the harmony audio.
  - Validation method: `manual` (live-system; dev server; select Synth Bass preset; listen to next cycle)

- **A-03-05** — Selecting the noise oscillator option (e.g., `pink`) produces a noise-textured harmony sound, distinct from the four waveforms.
  - Validation method: `manual` (live-system; dev server; select the noise option in the Oscillator selector; listen to next cycle)

- **A-03-06** — The redesigned sound block (Oscillator + Presets selects) appears at the confirmed placement position in the Armonía view top bar, as stated in inventory §(e) and implemented in step 03.5.
  - Validation method: `manual` (visual inspection in dev server; confirm position relative to sub-toggle / chord-mode / marco / key-mode-octave)

- **A-03-07** — When a Pentagrama slot is selected (`$selectedSlotIdxStore !== null`), the `.sound-ctl` block renders with a persistent accent border (color from `var(--tonic)` or equivalent from CLAUDE.md spec).
  - Validation method: `manual` (live-system; click a Pentagrama slot; confirm visual highlight on the sound block)

- **A-03-08** — When a new Pentagrama slot is selected (the selection changes to a non-null index), a brief CSS color pulse animation (~300 ms) plays on the sound block, then settles to the persistent accent border.
  - Validation method: `manual` (live-system; click one slot then a different slot; confirm the pulse is visible)

- **A-03-09** — When no slot is selected (`$selectedSlotIdxStore === null`), the `.sound-ctl` block renders without the accent border (intent mode, baseline appearance).
  - Validation method: `manual` (live-system; click empty canvas to deselect; confirm accent border disappears)

- **A-03-10** — `resolveChordAttrs` returns the correct attribute bundle for each of the three presets, matching the exact values in the ADR 0019 preset table.
  - Validation method: `unit` (`tests/presets.test.ts` preset-resolution tests)

- **A-03-11** — The new persistence schema correctly drops sessions from the prior version (lossy) and parses sessions with oscillator/preset/filter/envelope fields without error.
  - Validation method: `unit` (`tests/persistence.test.ts` drop test + v(N) parse test)

- **A-03-12** — `HarmonyChordCoreSchema` in `src/agent/schema.ts` accepts `oscillator`, `preset`, and new filter/envelope fields as optional; the schema version matches the ADR 0019 D6 decision.
  - Validation method: `unit` (`tests/schema.test.ts`)

- **A-03-13** — All four i18n dictionaries (es/en/pt/zh) contain the new sound-control keys (Oscillator label, noise option label, preset labels, preset names, edit/intent mode tips); the key-parity test passes.
  - Validation method: `unit` (`tests/i18n/key-parity.test.ts`)

- **A-03-14** — `pnpm build` produces a clean bundle with no errors or unresolved imports.
  - Validation method: `automated` (`pnpm build` exit code 0)

---

## Open Questions (OQ-N)

The following questions are unresolved at scoping time. The Pilot resolves OQ-1 through OQ-3 at Checkpoint #1 (after seeing the inventory); OQ-4 through OQ-6 at Checkpoint #2 (ADR review).

**OQ-1 — Noise token choice:** The inventory step (03.1) will propose one of `pink` / `white` / `brown`. The Pilot confirms or overrides at Checkpoint #1. **Planner rec:** `pink` noise is spectrally weighted toward lower frequencies and often more musical-sounding than flat `white` noise when used as a chord pad; confirm against the live bundle.

**OQ-2 — Concrete preset definitions:** The inventory step (03.1) proposes exact attribute values for Piano, Guitar, and Synth Bass. The Pilot evaluates the proposals by listening (Checkpoint #1 or #2). **Planner rec:** (a) Piano: `sine` + moderate attack + short decay + no sustain + light filter; (b) Guitar: `triangle` + very short attack + short decay + mid-range lpf; (c) Synth Bass: `sawtooth` + slow attack + sustained + dark lpf. These are placeholders — the inventory must verify which envelope params are actually registered in `@strudel/web@1.0.3` before stating exact values.

**OQ-3 — Placement confirmation:** The inventory step (03.1 §(e)) reads the live Header and proposes a target order. **Planner rec:** keep the sound block after clave/escala/octava (current Phase 02 position). The A-02-10 partial was due to a mis-stated criterion, not a wrong position. But the inventory may surface a reason to move it (e.g., if two rows are needed). The Pilot confirms at Checkpoint #1.

**OQ-4 — Preset representation (name vs. expanded, ADR 0019 D2):** **Planner rec:** name-only (`preset: 'piano' | 'guitar' | 'synth-bass' | undefined` on `Chord`) + a lookup table in `src/core/codegen/presets.ts`. Reasons: (a) the stored Chord stays compact; (b) future preset additions are a one-line addition to the lookup table; (c) the byte-identical guarantee is upheld by `resolveChordAttrs` returning hardcoded defaults when `preset === undefined`; (d) the agent can set `preset: 'piano'` as a verbatim technical token (OQ-7 precedent from ADR 0017). The Pilot confirms or overrides at Checkpoint #2.

**OQ-5 — Schema version bump (ADR 0019 D5):** **Planner rec:** bump 3→4 (lossy), consistent with ADR 0013 D1 and ADR 0018 D3 precedent. No-bump is technically possible (Zod optional fields), but the precedent argues for a clean version number. The Pilot confirms at Checkpoint #2.

**OQ-6 — Oscillator field: extend `instrument` or introduce `oscillator`? (ADR 0019 D1):** ADR 0018 D1 defined `instrument?: string` for the four waveforms. Adding a noise token to the same field is backward-compatible (it's already typed `string`). Introducing a rename to `oscillator` is cleaner semantics but requires migrating the existing `instrument` field and a version bump. **Planner rec:** extend `instrument` to include the noise token in its valid-value set, and add an `oscillator` alias or rename only if the ADR decides it cleaner — but do NOT introduce a separate `oscillator` field AND keep `instrument` (that creates dual-field confusion). The Pilot confirms at Checkpoint #2.

---

## ADR Triggers

Open `docs/adr/0019-oscillator-preset-model.md` in step 03.2 (STOPS for Pilot Checkpoint #2 before any code is written):

- **ADR 0019 — Oscillator/Preset data model** — Trigger: step 03.2. Extends ADR 0018. Covers: noise token in the oscillator set (D1), preset representation — name vs. expanded (D2), preset/oscillator independence rule (D3), new `Chord` fields with their default-value semantics (D4), persistence schema version bump (D5), agent schema (D6), and `uniformAttrs` gate amendment (D7).

No other new ADRs are expected for this phase. The deferred candidates D-3 (filter lpf/hpf as user params) and D-4 (filter envelope) from the Phase 01 inventory are lifted into scope only as components of the three confirmed presets — they remain opaque to direct user control (no per-chord lpf slider) unless the Pilot opens that at Checkpoint #2.

---

## Handoff Note

At the end of each step, the Dev appends a per-step entry to `docs/harmonic-rhythm-improvements/handoffs/phase-03-handoff.md`. At the end of the phase, the Dev appends a phase-completion entry. See `handoff-template.md`.

The handoff for every code-touching step must include an Acceptance Coverage Table mapping each relevant A-03-NN criterion to a test file, test type, and gap status. For `manual` criteria (A-03-02 through A-03-09), the Dev must describe what was observed. For `unit` criteria, the test file and test name must be cited. The **prototype-parity item does not apply** — this phase introduces net-new features; the Dev writes "no prototype source — net-new feature" in every step's handoff.
