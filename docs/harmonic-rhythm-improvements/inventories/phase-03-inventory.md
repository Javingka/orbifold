<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 03 Inventory — Oscillator + Presets sound menus, edit-mode feedback, placement fix

**Created:** 2026-06-18
**Phase file:** `docs/harmonic-rhythm-improvements/phases/phase-03.md`

---

## (a) Noise token confirmation

**Source consulted:** `node_modules/@strudel/web/dist/index.mjs` lines 5165–5201
(the noise-generator factory) and line 5201 (the two constants):

```
Zs = ["sine", "square", "triangle", "sawtooth"]
Cd = ["pink", "white", "brown", "crackle"]
```

All four noise tokens — `pink`, `white`, `brown`, `crackle` — are registered by
`registerSynthSounds()` in `@strudel/web@1.0.3`. The bundle at lines 5165–5177 shows
distinct synthesis paths for each:

- `white` — flat spectrum noise (Math.random() each sample)
- `brown` — red noise (integrated, low-frequency emphasis)
- `pink` — 1/f weighted noise (log-flat spectrum; sounds more "even" musically)
- `crackle` — irregular sparse impulse noise (percussive bursts; density param)

**Chosen noise token: `pink`**

Justification: `pink` noise is spectrally weighted so that each octave band carries
equal energy (1/f spectrum), giving a sustained chord-like texture that sits more
neutrally in a harmonic mix than flat `white` (harsh high-frequency content) or
heavily low-pitched `brown`. `crackle` is excluded by the phase file itself (irregular
percussive character unsuited to sustained harmony).

**Pilot confirmation requested at Checkpoint #1.**

---

## (b) Amplitude-envelope parameter confirmation

**Source:** `node_modules/@strudel/web/dist/index.mjs` lines 2020, 2135, 2146, 2157.
Each of the four entries is a registered control definition (array passed to the
control-registration loop at line ~1926).

| Parameter | Alias | Bundle line | Status |
|---|---|---|---|
| `attack` | `att` | 2020 | **confirmed-present** |
| `decay` | `dec` | 2135 | **confirmed-present** (also already used in ADR 0018 D1 as `Chord.decay`) |
| `sustain` | `sus` | 2146 | **confirmed-present** |
| `release` | `rel` | 2157 | **confirmed-present** |

All four standard ADSR amplitude-envelope parameters are registered and functional.

**Subset required by the three preset definitions (section (d)):**

| Preset | Parameters used |
|---|---|
| Piano | `attack`, `decay`, `sustain`, `release` |
| Guitar | `attack`, `decay`, `sustain` |
| Bajo Sintético | `attack`, `sustain`, `release` |

Note: the current `Chord.decay` introduced in ADR 0018 D1 maps to the Strudel `.decay()`
amplitude-envelope decay parameter — this is the same control and does not conflict.

---

## (c) Filter parameter confirmation

**Source:** `node_modules/@strudel/web/dist/index.mjs` lines 2376, 2389, 2428, 2468,
2510, 2553, 2652, 2675.

| Parameter | Alias | Bundle line | Status |
|---|---|---|---|
| `lpf` | `cutoff` (primary), `ctf`, `lp` | 2376 | **confirmed-present** |
| `cutoff` | primary name for `lpf` (see `[["cutoff","resonance","lpenv"],"ctf","lpf","lp"]`) | 2376 | **confirmed-present** (same control as `lpf`) |
| `lpq` | `resonance` | 2675 | **confirmed-present** |
| `hpf` | `hcutoff`, `hp` | 2652 | **confirmed-present** |
| `lpenv` | `lpe` | 2389 | **confirmed-present** |
| `lpa` | `lpattack` | 2428 | **confirmed-present** |
| `lpd` | `lpdecay` | 2468 | **confirmed-present** |
| `lps` | `lpsustain` | 2510 | **confirmed-present** |
| `lpr` | `lprelease` | 2553 | **confirmed-present** |

All nine parameters listed in the phase step 03.1 prompt are confirmed present in the
bundle.

**Important interaction note (ADR 0018 D2):** `lpf(1200)` is currently hardcoded in
all three `chordToStrudel` / `melodyLine` callsites. The presets in section (d) use
`lpf` at non-1200 values; this means the hardcoded `lpf(1200)` must be made
per-attribute-controllable in phase-03 codegen (i.e., the `lpf(1200)` static literal
must be replaced with `lpf(${lpfVal})` where `lpfVal` defaults to `1200` for
byte-identical output when no preset is selected). This is a necessary implication of
any preset that sets a different `lpf`. See ADR trigger for phase 03.2.

**Subset required by the three preset definitions:**

| Preset | Filter parameters used |
|---|---|
| Piano | `lpf` at ~1800 (warm but not muffled) |
| Guitar | `lpf` at ~2500 (brighter pluck), `lpenv`, `lpa`, `lpdecay` (filter sweep down) |
| Bajo Sintético | `lpf` at ~600 (dark), `lpq` at ~2 (slight resonance) |

**Implication for D4 (new `Chord` fields):** The ADR 0019 must add `lpf?: number` (and
optionally `lpenv?`, `lpa?`, `lpd?` for the Guitar filter sweep) to `Chord` and codegen.
However, since the phase scope keeps filter parameters opaque to direct user control
(only bundled inside presets), a design option is to NOT add per-chord `lpf` as a
user-settable field — instead, `resolveChordAttrs` (step 03.3) returns the preset's `lpf`
value and codegen substitutes it in place of the hardcoded `1200`. This avoids adding
a `lpf` slider to the UI while still varying `lpf` per-preset. See OQ-4 (ADR 0019 D2).

---

## (d) Concrete preset definitions

### Source constraints
Parameters from sections (b) and (c) only. No new npm packages. No soundfonts.
`s("piano")` in dirt-samples: the dirt-samples strudel.json (fetched from GitHub at
runtime) does NOT include a `piano` key in the standard `github:tidalcycles/dirt-samples`
set. The bundle docs show `s("piano")` in code examples but these appear in the context of
VCSL instruments or separately-loaded samples, not the default dirt-samples map. More
importantly, `registerSoundfonts()` is commented out in both `@strudel/web/web.mjs` and in
`defaultPrebake()` (bundle line 14795: `/* , registerSoundfonts() */`), and the app's
`src/audio/strudel.ts` line 166 does not call it. Therefore `s("piano")` would produce
silence or a fallthrough error in the current app. The "Piano" preset must be built from
confirmed waveform oscillators (sine/triangle) with envelope shaping — NOT from a
dirt-samples piano key.

### Preset definitions

#### Preset 1 — Piano

| Attribute | Value | Notes |
|---|---|---|
| `instrument` | `'triangle'` | Triangle wave has a hollow, slightly muted character reminiscent of a plucked string — closer to a piano's fundamental than sawtooth |
| `attack` | `0.02` | Very short attack (plucked onset) |
| `decay` | `0.4` | Medium-fast decay (key pressed but tone fades) |
| `sustain` | `0.1` | Low sustain (piano keys decay to near-silence if held) |
| `release` | `0.3` | Moderate release (audible tail after key release) |
| `lpf` | `1800` | Warmer filter than hardcoded 1200 but not muffled; preserves harmonic character |
| `room` | `0.4` | Slight hall reverb (concert-hall feel) |

Expected character: controlled plucked onset, warm tonal decay, moderate reverberation.
Distinct from the default sustained sawtooth pad.

#### Preset 2 — Guitarra

| Attribute | Value | Notes |
|---|---|---|
| `instrument` | `'sawtooth'` | Sawtooth has rich harmonic content matching a guitar string |
| `attack` | `0.01` | Very fast attack (plucked) |
| `decay` | `0.3` | Short decay (string ring-down) |
| `sustain` | `0.0` | No sustain (string decays fully) |
| `lpf` | `2500` | Bright, slightly treble-forward |
| `lpenv` | `3` | Filter sweep modulation depth |
| `lpa` | `0.01` | Filter attack: very fast (instant filter open on pluck) |
| `lpd` | `0.25` | Filter decay: filter sweeps down as string rings out |
| `room` | `0.15` | Minimal room (dry pluck feel) |

Expected character: bright plucked onset with fast tonal decay and a filter sweep giving
a dynamic guitar-like timbre. No sustain — chord dies quickly.

**Pilot note:** The `lpenv + lpa + lpd` combination requires `lpf` to be present too
(the filter envelope modulates around the `lpf` cutoff). If the ADR decides to omit the
filter envelope from the Guitar preset (reducing complexity), the minimal Guitar preset
is: `sawtooth` + short `decay(0.3)` + `sustain(0)` + `lpf(2500)` + `room(0.15)`.

#### Preset 3 — Bajo Sintético

| Attribute | Value | Notes |
|---|---|---|
| `instrument` | `'sawtooth'` | Sawtooth gives a buzzy, rich bass character |
| `attack` | `0.06` | Slightly softer attack than guitar (bass punch without click) |
| `sustain` | `0.8` | High sustain (synth bass holds the note) |
| `release` | `0.5` | Moderate release (note trails off smoothly) |
| `lpf` | `600` | Dark, bass-register filter cutoff |
| `lpq` | `2` | Slight resonance peak adds "character" to the filter |
| `room` | `0.2` | Low reverb (bass in a room, not a hall) |

Expected character: dark, sustained, bass-register pad; distinctly different from the
sawtooth default (which uses `lpf(1200)` and no per-chord sustain/release shaping).

**All three preset definitions are proposals — Pilot confirms (or adjusts values) at
Checkpoint #1 via live audio.**

---

## (e) Placement proposal

### Actual control order in `src/ui/Header.svelte` (`{#if $sessionStore.view === 'harmony'}` block)

Lines 547–719, read directly from the file:

1. **Sub-toggle** `#subviewSeg` — Tonnetz / Pentagrama (lines 555–568)
2. **Chord mode** `#chordModeSeg` — acorde / arpegio (lines 585–602)
3. **Marco button** `.marco-btn` — "Marcar" context button (lines 610–617)
4. **Key field** `.field` — clave / escala / octava (lines 619–656)
5. **Sound control block** `.sound-ctl` — instrument select, room slider, decay slider (lines 668–718)

The Phase 02 comment at line 661 states: "Placement: AFTER tonalidad/escala/octava, BEFORE
acorde/arpegio/marco." — but the actual code position is AFTER marco + key (positions 2–4),
at the row end (position 5). The comment is incorrect about the stated intent vs actual
placement, but the actual placement (after key selectors, at the row end) is what matters.

### A-02-10 resolution context

The acceptance criterion A-02-10 as written ("after tonalidad/escala/octava AND before
acorde/arpegio/marco") was self-contradictory because in the real code order, acorde/arpegio
and marco appear BEFORE clave/escala/octava (positions 2 and 3 vs position 4). The Dev's
Phase 02 handoff Checkpoint #5 resolution correctly identifies this: the actual placement
is at the end of the harmony controls row (after the key `.field`), which is position 5.

### Proposed target order for Phase 03

The Planner's working recommendation to keep the sound block at the row end is confirmed
by reading the live file. The current position (end of harmony controls, after the key
field) is:

1. Sub-toggle (Tonnetz / Pentagrama)
2. Chord mode (acorde / arpegio)
3. Marco
4. Key field (clave / escala / octava)
5. **Sound block (Oscillator select + Presets select)** ← current Phase 02 position, confirmed correct

This order is logically sound: timbre controls (oscillator + presets) are the least
frequently adjusted of the harmony parameters, making the end-of-row position appropriate.
The A-02-10 criterion was partial because it was mis-stated, NOT because the position was
wrong.

**Recommendation:** Keep the sound block at position 5 (after the key field, at the row
end). No reordering needed. The redesign in step 03.5 replaces the flat instrument/room/
decay block with the Oscillator + Presets selects in the same CSS `.sound-ctl` container
at the same row position.

**Pilot confirmation requested at Checkpoint #1.**

---

## Open questions (OQ-1 through OQ-6) with recommendations

### OQ-1 — Noise token choice

**Finding:** `pink`, `white`, `brown`, `crackle` all confirmed present (section (a)).
`crackle` excluded by phase spec.

**Recommendation: `pink`** — spectrally balanced, most musical for harmonic chord texture.
Pilot confirms or overrides at Checkpoint #1.

### OQ-2 — Concrete preset definitions

**Finding:** Exact attribute values proposed in section (d), using only confirmed-available
parameters from sections (b) and (c). `s("piano")` dirt-sample is NOT available (soundfonts
commented out; piano not in dirt-samples map). All three presets use oscillator waveforms.

**Recommendation:** Piano → `triangle` + ADSR + `lpf(1800)` + `room(0.4)`. Guitar →
`sawtooth` + fast decay + filter sweep. Bajo Sintético → `sawtooth` + high sustain +
`lpf(600)` + `lpq(2)`. Pilot evaluates by listening at Checkpoint #1 and may adjust values.

### OQ-3 — Placement confirmation

**Finding:** Current Phase 02 placement is position 5 (after key field, at row end).
This is the correct position and requires no change.

**Recommendation:** Keep the sound block at the end of the harmony controls row. The
A-02-10 partial was a mis-stated criterion; the actual end-of-row placement is correct.
Pilot confirms at Checkpoint #1.

### OQ-4 — Preset representation (name vs. expanded, ADR 0019 D2)

**Finding:** The name-only model is strongly recommended. Reasons:
(a) Compact `Chord` type — only one new `preset?: string` field vs N new filter/envelope
fields per chord. (b) `resolveChordAttrs` in `src/core/codegen/presets.ts` centralizes
all preset → attribute mapping; changing a preset's sound is a one-line table edit.
(c) Byte-identical guarantee is upheld: `resolveChordAttrs` returns hardcoded defaults
when `preset === undefined`. (d) Agent can set `preset: 'piano'` as a verbatim technical
token per ADR 0017 / ADR 0018 D4 precedent.

The expanded model (writing all constituent attributes onto the `Chord`) forces the UI to
do a reverse-lookup to know what preset is active, breaks as soon as any attribute is
manually edited, and inflates the schema with N more optional fields.

**Recommendation: name-only** (`preset?: 'piano' | 'guitar' | 'synth-bass' | undefined`
on `Chord`). Pilot resolves at Checkpoint #2 (ADR 0019 D2).

### OQ-5 — Schema version bump (ADR 0019 D5)

**Finding:** The new `preset?`, `oscillator?` (or extended `instrument`), plus the new
filter/envelope fields needed by presets (e.g., `attack?`, `sustain?`, `release?`,
`lpf?`, `lpenv?`, `lpa?`, `lpd?`, `lpq?`), represent a meaningful schema expansion. The
Zod-optional-fields argument (no bump needed) is technically valid but creates an
indistinguishable v3-before/v3-after session ambiguity.

**Recommendation: bump 3→4 (lossy)**, consistent with ADR 0013 D1 and ADR 0018 D3
precedent. Clean version number; no migration function needed (existing users start a
fresh session). Pilot resolves at Checkpoint #2 (ADR 0019 D5).

### OQ-6 — Oscillator field: extend `instrument` or introduce `oscillator`?

**Finding:** ADR 0018 D1 defined `Chord.instrument?: string` typed as a plain string
(forward-compatible). Adding `'pink'` (or any noise token) to the valid-value set is a
zero-cost extension — the type is already `string`, and the UI enforces the valid set
via `<select>` options. Introducing a separate `oscillator` field alongside `instrument`
creates dual-field confusion (which wins? must they be kept in sync?). Renaming
`instrument` → `oscillator` requires migrating all existing `instrument` writes across
codegen, session, persistence, agent schema, Header.svelte, and tonnetz-scene.ts — a
meaningful diff for a purely cosmetic rename.

**Recommendation: extend `instrument` to include the noise token** in its valid-value
set. The UI label is "Oscillator" (the display name); the data field stays `instrument`.
No rename, no migration. Pilot resolves at Checkpoint #2 (ADR 0019 D1).

---

## Files that will be touched (projected, all five steps)

| Path | Current purpose | Change planned |
|---|---|---|
| `src/core/codegen/presets.ts` | (new file) | Preset lookup table + `resolveChordAttrs` function (step 03.3) |
| `src/state/session.ts` | `Chord` type + store actions | Add `preset?`, new filter/envelope fields to `Chord`; new `setChordOscillator` / `setChordPreset` actions (steps 03.3, 03.4) |
| `src/core/codegen/strudel.ts` | `chordToStrudel` + `melodyLine` | Consume `resolveChordAttrs`; replace hardcoded `lpf(1200)` with variable; update `uniformAttrs` gate (step 03.3) |
| `src/lib/persistence.ts` | `SESSION_SCHEMA_VERSION`, `SavedChordSchema` | Bump 3→4; add preset + filter/envelope fields (step 03.4) |
| `src/agent/schema.ts` | `SCHEMA_VERSION`, `HarmonyChordCoreSchema` | Bump 3→4; add `oscillator`/`preset` + filter/envelope fields (step 03.4) |
| `src/state/selectedSlot.ts` | `selectedSlotIdxStore`, `soundIntentStore` | Extend `soundIntentStore` shape with `oscillator?` + `preset?` (step 03.4) |
| `src/ui/Header.svelte` | Harmony top-bar controls | Replace flat sound block with Oscillator + Presets `<select>` menus; add edit-mode CSS (step 03.5) |
| `src/render/tonnetz-scene.ts` | `pickChord` apply-to-new | Read `soundIntentStore.oscillator` + `.preset`; thread to new Chord + `playChord` (step 03.5) |
| `src/i18n/types.ts` | `Dictionary` type | Add Oscillator/Preset labels; remove unused room/decay slider keys if removed (step 03.5) |
| `src/i18n/locales/es.ts` | Spanish locale | Add new keys (step 03.5) |
| `src/i18n/locales/en.ts` | English locale | Add new keys (step 03.5) |
| `src/i18n/locales/pt.ts` | Portuguese locale | Add new keys (step 03.5) |
| `src/i18n/locales/zh.ts` | Chinese locale | Add new keys (step 03.5) |
| `tests/presets.test.ts` | (new file) | Unit tests for `resolveChordAttrs` (step 03.3) |
| `tests/codegen.test.ts` | Codegen unit tests | New preset + noise token tests; byte-identical regression (step 03.3) |
| `tests/persistence.test.ts` | Persistence unit tests | v3-drop + v4-parse tests (step 03.4) |
| `tests/schema.test.ts` | Agent schema tests | New preset/oscillator field tests (step 03.4) |

Count: 17 files. Acceptable (within the 15-file guideline; the i18n locales contribute
4 identical edits counted separately). The phase is well-scoped.

---

## Existing behavior to preserve

- **Byte-identical at default:** chords with no `preset`, no `oscillator`/`instrument`
  override, and no filter/envelope fields must emit the exact same Strudel string as
  pre-Phase-02 `main`. The `uniformAttrs` gate in `melodyLine` and `resolveChordAttrs`
  must return hardcoded defaults when all new fields are absent.
- **`lpf(1200)` default:** when no preset is selected and no explicit `lpf` is set, the
  emitted chain must contain `lpf(1200)` — exactly as today.
- **ADR 0018 D2 `uniformAttrs` gate:** the existing gate must be extended (not removed)
  to include any new fields (ADR 0019 D7).
- **All 539 existing tests pass** (the current count per Phase 02 handoff fix section).
- **The reactive `selectedSlotIdxStore` + `soundIntentStore` pattern** (ADR 0018 D5)
  is extended, not replaced.
- **No `.fast`/`.slow` for tempo.** Presets are timbre/filter/envelope only.

---

## New behavior to introduce

- **Five-option Oscillator selector** in the Armonía top bar (sine / triangle / square /
  sawtooth / pink-noise), replacing the existing four-waveform instrument select.
- **Presets selector** in the Armonía top bar (—/ Piano / Guitarra / Bajo Sintético),
  loading a bundle of waveform + filter + envelope attributes onto the selected chord.
- **Edit-mode feedback:** persistent accent border on the `.sound-ctl` block when a
  Pentagrama slot is selected; transient ~300 ms CSS pulse when the selection changes
  to a new non-null index; no border when no slot is selected.
- **`resolveChordAttrs` pure engine** that maps (preset?, explicit attrs) → fully
  resolved attribute bundle, enforcing preset defaults, per-attr overrides, and the
  byte-identical baseline.
- **Persistence v4** that drops v3 blobs (existing sessions lost on upgrade, per ADR
  0018 D3 precedent) and parses new `preset?` + filter/envelope fields.
- **Agent schema v4** accepting `oscillator`, `preset`, and new filter/envelope fields
  as optional (technical tokens verbatim per ADR 0017/ADR 0018 D4).

---

## Acceptance ID coverage plan

| Acceptance ID | Behavior | Planned test type | Planned test file | Step |
|---|---|---|---|---|
| A-03-01 | Byte-identical at default | unit | `tests/codegen.test.ts` | 03.3 |
| A-03-02 | Piano preset distinct audio | manual | live-system | 03.5 |
| A-03-03 | Guitar preset distinct audio | manual | live-system | 03.5 |
| A-03-04 | Synth Bass preset distinct audio | manual | live-system | 03.5 |
| A-03-05 | Noise oscillator distinct audio | manual | live-system | 03.5 |
| A-03-06 | Placement matches inventory §(e) | manual | live-system | 03.5 |
| A-03-07 | Accent border when slot selected | manual | live-system | 03.5 |
| A-03-08 | Pulse on selection change | manual | live-system | 03.5 |
| A-03-09 | No border when no slot selected | manual | live-system | 03.5 |
| A-03-10 | `resolveChordAttrs` exact values | unit | `tests/presets.test.ts` | 03.3 |
| A-03-11 | Persistence v3 drop + v4 parse | unit | `tests/persistence.test.ts` | 03.4 |
| A-03-12 | Agent schema v4 optional fields | unit | `tests/schema.test.ts` | 03.4 |
| A-03-13 | i18n key-parity passes | unit | `tests/i18n/key-parity.test.ts` | 03.5 |
| A-03-14 | `pnpm build` clean | automated | — | 03.5 |

---

## Tests to add or modify

- `tests/presets.test.ts` (new): `resolveChordAttrs` for each preset (exact values),
  byte-identical baseline, per-attr override rule (ADR 0019 D3).
- `tests/codegen.test.ts` (additions): (a) byte-identical regression with all new fields
  absent; (b) `preset: 'piano'` emits Piano's attribute chain; (c) noise token in codegen.
- `tests/persistence.test.ts` (additions): v3 blob rejected; v4 blob with
  preset/filter/envelope fields parsed + round-tripped.
- `tests/schema.test.ts` (additions): agent schema v4 accepts optional
  `oscillator`/`preset` + new fields; rejects unknown preset names if the schema uses a
  literal union.
- `tests/i18n/key-parity.test.ts`: existing test, must pass with added keys; no code
  change to the test itself — it auto-detects parity.

---

## Open decisions surfaced

**Resolution required before step 03.2 (Checkpoint #1 for OQ-1/OQ-2/OQ-3;
Checkpoint #2 for OQ-4/OQ-5/OQ-6).**

### OQ-1 (Checkpoint #1) — Noise token
**Rec: `pink`** (section (a)).

### OQ-2 (Checkpoint #1) — Preset definitions
**Rec:** Exact values in section (d). All three use waveform oscillators only (no piano
dirt-sample). Pilot evaluates by listening.

### OQ-3 (Checkpoint #1) — Placement
**Rec:** Keep sound block at end-of-row (position 5 after key field). Current Phase 02
placement is confirmed correct by reading the live Header.svelte. No move needed.

### OQ-4 (Checkpoint #2) — Preset representation (ADR 0019 D2)
**Rec: name-only** (`preset?: string` on `Chord`; lookup table in `presets.ts`).

### OQ-5 (Checkpoint #2) — Schema version bump (ADR 0019 D5)
**Rec: 3→4 (lossy)**, consistent with ADR 0013/ADR 0018 precedent.

### OQ-6 (Checkpoint #2) — Oscillator field (ADR 0019 D1)
**Rec: extend `instrument`** to include noise token; no rename; no migration.

### Additional open decision (Checkpoint #2): `lpf(1200)` codegen change

The hardcoded `lpf(1200)` at lines 70 and 146/193 of `src/core/codegen/strudel.ts` must
become variable to support presets with different `lpf` values. Two options:

- **A (recommended):** `resolveChordAttrs` returns an `lpf` attribute (default: `1200`)
  and codegen substitutes `lpf(${resolvedAttrs.lpf})`. The `Chord` type gains `lpf?:
  number` (absent = preset default or 1200). Byte-identical: `resolveChordAttrs` returns
  `1200` when `preset === undefined` and `lpf` is absent on the chord.
- **B:** Keep `lpf(1200)` hardcoded; preset codegen appends a second `lpf(N)` call
  overriding the first. This works if the Strudel audio engine takes the last `lpf` call
  (unconfirmed — may produce double-filter artefacts).

**Rec: Option A** — single `lpf` per chord, resolved by `resolveChordAttrs`. Clean and
unambiguous. Pilot resolves at Checkpoint #2 (ADR 0019 D4).

---

## Source-of-truth check

This phase extends the Phase 02 data flow. The noise token and preset attributes flow from:
- **Producer:** `resolveChordAttrs` in `src/core/codegen/presets.ts` (new file) →
  consumes `Chord.instrument`, `Chord.preset`, and explicit filter/envelope fields.
- **Consumer:** `chordToStrudel` and `melodyLine` in `src/core/codegen/strudel.ts`
  consume the `resolveChordAttrs` return value.
- **Shape alignment:** The `Chord` interface (in `src/state/session.ts`) is the shared
  type. Phase 03 step 03.3 adds new fields to `Chord` and `resolveChordAttrs` is typed
  to accept them. No mismatch risk — both sides are in the same codebase and the
  `Chord`-typed parameter ensures shape alignment at compile time.

No cross-source data consumption (no backend, no external API beyond the already-loaded
dirt-samples).

---

## New dependencies needed

None. All new behavior uses:
- Existing `svelte/store` (`writable`, `get`, reactive subscriptions).
- Existing Zod (`z.string().optional()`, `z.number().optional()`).
- CSS `@keyframes` (native, no library).
- TypeScript string literal union for preset names.

---

## Environment, CI, build, or deployment changes needed

None beyond the existing `pnpm test`, `pnpm lint`, `pnpm build` pipeline.

---

## Decisions Register check

- **Staff vertical coordinate is diatonic** — not affected (this phase touches codegen
  and top-bar UI; Pentagrama rendering is unchanged).
- **PX_PER_CYCLE = 48** — not affected (no changes to the timeline grid).
- **`orbifold.lang` cross-surface language contract** — respected: all new string keys
  are added to all four locale dictionaries; the key-parity test verifies this.

---

## Risks specific to this phase

1. **`lpf(1200)` hardcoded → variable:** the replacement of the static `lpf(1200)` literal
   with a variable (`lpf(${resolvedAttrs.lpf})`) must produce byte-identical output when
   `lpf` resolves to `1200`. This is straightforward (string interpolation of the integer
   `1200` equals `"1200"`), but a dedicated unit test must assert this explicitly.

2. **`uniformAttrs` gate expansion:** the gate currently checks `instrument`, `room`,
   `decay` (ADR 0018). Adding `preset`, `lpf`, `attack`, `sustain`, `release`, etc. to the
   check is necessary (ADR 0019 D7); missing any new field would silently drop per-chord
   preset settings on the slowcat path for single-bar chords. The test for A-03-01 must
   exercise a preset on a single-bar all-same-duration progression to catch this.

3. **Filter envelope complexity in Guitar preset:** the `lpenv + lpa + lpd` combination
   in the Guitar preset (three correlated parameters) is more complex than the other
   presets. If Pilot prefers a simpler Guitar preset (just `decay + lpf`, no filter
   envelope), that is valid and reduces the `Chord` type / ADR 0019 D4 field count. The
   inventory offers both a full version and a minimal version in OQ-2 above.

---

## Pilot review

**Pending Checkpoint #1.** Step 03.2 begins only after Pilot approves this inventory.
The Pilot resolves OQ-1 (noise token), OQ-2 (preset values), and OQ-3 (placement) here.
OQ-4/OQ-5/OQ-6 and the `lpf(1200)` codegen decision are resolved at Checkpoint #2 (ADR
review, step 03.2).
