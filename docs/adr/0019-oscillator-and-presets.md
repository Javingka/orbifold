<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0019 — Oscillator / Preset data model

- **Status:** Accepted (Pilot approved at Checkpoint #2, 2026-06-18)
- **Date:** 2026-06-18
- **Initiative / Phase:** harmonic-rhythm-improvements / Phase 03 (step 03.2)
- **Deciders:** Pilot (Javier)

## Context

ADR 0018 (Phase 02) established `Chord.instrument?`, `Chord.room?`, and `Chord.decay?` and
wired them into the codegen. It deferred two features:

1. **A noise oscillator token** alongside the four waveforms (`sawtooth`, `sine`, `square`,
   `triangle`). The flat instrument `<select>` now needs a fifth option.
2. **Presets** — named bundles of waveform + filter + envelope parameters (Piano, Guitarra,
   Bajo Sintético) that give the harmony layer audibly distinct characters with a single
   selection.

The inventory (step 03.1) confirmed:

- **Noise token:** `pink`, `white`, `brown`, `crackle` are all registered in
  `@strudel/web@1.0.3` via `registerSynthSounds()` (bundle line 5201). `crackle` is
  excluded (irregular, percussive). **Pilot confirmed `pink` at Checkpoint #1** as the
  noise option — spectrally balanced (1/f), most musical for a sustained harmony chord.
- **Amplitude-envelope parameters** `attack`, `decay`, `sustain`, `release` all confirmed
  present (bundle lines 2020, 2135, 2146, 2157). `decay` already exists on `Chord` from ADR
  0018 D1.
- **Filter parameters** `lpf`, `lpq`, `lpenv`, `lpa`, `lpd` all confirmed present (bundle
  lines 2376, 2389, 2428, 2468, 2675).
- **Placement:** Keep the sound block at end-of-row (position 5, after clave/escala/octava
  `.field`). Pilot confirmed at Checkpoint #1; no reordering needed.
- **Full Guitar preset with `lpenv`/`lpa`/`lpd` filter sweep:** Pilot confirmed the full
  version at Checkpoint #1.
- **`lpf(1200)` hardcoded in ADR 0018 D2** must become variable to support presets with
  different `lpf` values (Piano: 1800, Guitar: 2500, Bajo Sintético: 600).

This ADR extends ADR 0018 D1–D2 to cover the noise token, preset representation, the exact
new `Chord` fields, the per-attribute override rule, the `lpf` variabilization, schema
version bumps, agent schema extension, and the `uniformAttrs` gate amendment.

Seven decisions govern the implementation.

---

## Decisions

### D1 — Oscillator field strategy: extend `Chord.instrument`, do NOT introduce `oscillator`

**Decision:** Add `'pink'` to the valid-value set of the existing `Chord.instrument?: string`
field. The UI control is labelled **"Oscillator"** (the user-facing name); the data field
stays `instrument`. No new `oscillator` field is introduced alongside `instrument`; `instrument`
is not renamed.

**Valid values after this phase:**
`'sawtooth' | 'sine' | 'square' | 'triangle' | 'pink'`

The type remains `string` (not a narrower union literal) per the forward-compatibility
rationale in ADR 0018 D1. The `<select>` element in the UI enforces the valid set.

**Byte-identical / no-migration rationale:** `instrument` is already typed `string` in
`Chord`, `SavedChordSchema`, and `HarmonyChordCoreSchema`. Adding `'pink'` to the runtime
valid set requires zero type migration — it is silently accepted by existing Zod schemas and
TypeScript types. Sessions saved before this phase with `instrument` absent, or with one of
the four existing waveform names, parse without change. Sessions with `instrument: 'pink'`
fail the old `z.literal(3)` version check and are dropped by the lossy bump (D5 below).

**Rejected alternatives:**

- *Introduce a new `oscillator` field alongside `instrument`:* creates dual-field confusion
  (which wins? must they be kept in sync?). Forces every read path (`chordToStrudel`,
  `resolveChordAttrs`, `Header.svelte`, `tonnetz-scene.ts`, `selectedSlot.ts`,
  persistence, agent schema) to handle two different field names that serve the same
  purpose.
- *Rename `instrument` → `oscillator`:* cleaner semantics, but the blast radius is
  substantial — every write and read of `instrument` across eight files plus all saved
  sessions and agent payloads must change. The benefit (a cleaner field name) is cosmetic
  and not worth the migration cost when `instrument` is already typed `string` and will
  accept noise tokens without a type change.

---

### D2 — Preset representation: name-only, lookup table in `presets.ts`

**Decision:** Store the preset name as a single optional field:

```typescript
preset?: 'piano' | 'guitar' | 'synth-bass';
```

on `Chord`. The mapping from preset name → attribute bundle lives exclusively in the pure
engine `src/core/codegen/presets.ts` as an exported lookup table consumed by
`resolveChordAttrs`. No preset constituent attributes (lpf, attack, etc.) are expanded onto
the `Chord` when a preset is selected.

**`resolveChordAttrs` signature:**

```typescript
export function resolveChordAttrs(chord: ChordAttrs): ResolvedAttrs
```

where `ChordAttrs` is a subset of `Chord` (the fields relevant to sound), and `ResolvedAttrs`
is a fully resolved attribute bundle that codegen consumes directly.

**Preset name canonical set:** `'piano' | 'guitar' | 'synth-bass'`. These are verbatim
technical tokens and are not translated.

**Rejected alternative — expanded model:** When a preset is selected, write all constituent
attributes directly onto the `Chord` (e.g., `lpf: 1800, attack: 0.02, ...`) and do not
store the preset name.

Rejected because:

1. **Reverse-lookup is brittle.** To show "Piano" in the Presets selector, the UI must
   compare every combination of `{ lpf, attack, decay, sustain, release, room }` against
   the preset table. Any manual per-attribute edit after applying a preset silently removes
   the active preset label, with no way to tell "still mostly Piano with a custom lpf" from
   "no preset selected."
2. **Schema bloat.** Every new filter/envelope parameter for every possible future preset
   inflates `SavedChordSchema` and `HarmonyChordCoreSchema` permanently, regardless of
   whether the Pilot has opened direct-user-control of those parameters. The name-only model
   keeps `Chord` thin: one `preset?: string` field.
3. **Lookup-table centralization.** Changing a preset's sound (e.g., adjusting the Piano
   decay from 0.4 to 0.35 after live audio evaluation at step 03.5) is a one-line edit to
   the `PRESETS` table in `presets.ts`. In the expanded model the same change requires
   regenerating every saved chord that carries the old preset attributes.

---

### D3 — Preset / oscillator independence: explicit per-field override rule

**Decision:** A preset and an explicit oscillator selection are **not** mutually exclusive.
The resolution rule in `resolveChordAttrs` is **per-attribute, explicit-wins**:

1. For each attribute in the resolved bundle (instrument, lpf, attack, decay, sustain,
   release, room, lpenv, lpa, lpd, lpq):
   - If the attribute is explicitly set on the `Chord` (i.e., the field is not `undefined`),
     the explicit value wins — regardless of whether a preset is also set.
   - If the attribute is NOT explicitly set on the `Chord`, the preset's value for that
     attribute is used (if a preset is set and defines that attribute).
   - If neither an explicit value nor a preset value is present, the hardcoded default
     (byte-identical baseline) is used.

2. Selecting a preset does **not** write individual attribute fields onto the `Chord` (D2
   name-only model). Therefore setting a preset does not pollute explicit fields and the
   user can freely override any individual attribute after selecting a preset.

3. The Presets `<select>` shows the active preset name from `chord.preset` directly (no
   reverse-lookup needed). If `chord.preset` is `undefined`, the "no preset" option is
   shown, even if some attributes happen to match a preset's values.

4. For the oscillator specifically: if `chord.instrument` is explicitly set to `'pink'` and
   `chord.preset` is `'guitar'` (which sets `instrument: 'sawtooth'`), the explicit
   `'pink'` wins — the user selected the oscillator explicitly after picking the preset.

**Why this rule for step 03.3 tests (A-03-10):** The test for `resolveChordAttrs` must cover
the case `{ preset: 'piano', instrument: 'sine' }` — it should return `instrument: 'sine'`
(explicit override) and all Piano values for everything else.

**Rationale:** The per-attribute explicit-wins rule is the standard signal-chain override
semantics (compare to CSS `!important` being the exception, not the rule). Users who want
the full preset can simply leave individual fields absent. Users who want "Guitar preset but
with a sine wave" can set `instrument: 'sine'` explicitly while keeping `preset: 'guitar'`.
Mutual exclusion (option c) would be more restrictive without a meaningful user benefit.

---

### D4 — New `Chord` fields and `lpf(1200)` codegen variabilization

#### 4a — New optional fields on `Chord`

The following optional fields are added to `interface Chord` in `src/state/session.ts`,
beyond those introduced in ADR 0018 D1. Note: `decay` already exists from ADR 0018 D1 and
is not re-introduced.

```typescript
/** Named preset bundle. Technical token — not translated. */
preset?: 'piano' | 'guitar' | 'synth-bass';

/** Low-pass filter cutoff frequency in Hz.
 *  Default (undefined): resolves to 1200 via resolveChordAttrs. */
lpf?: number;

/** Amplitude attack time in seconds (>= 0). */
attack?: number;

/** Amplitude sustain level 0–1. */
sustain?: number;

/** Amplitude release time in seconds (>= 0). */
release?: number;

/** Filter envelope modulation depth. */
lpenv?: number;

/** Filter envelope attack time in seconds. */
lpa?: number;

/** Filter envelope decay time in seconds. */
lpd?: number;

/** Filter resonance (Q factor). */
lpq?: number;
```

Field placement: immediately after the existing `decay?` field (to keep sound attributes
grouped).

**Default-value semantics:** When all of the above fields are absent (`undefined`) and
`preset` is also absent, `resolveChordAttrs` returns the hardcoded baseline values, and
codegen emits the byte-identical string (see D4b below).

**Why only these fields (not `lps`, `lpr`, `hpf`, `room`):**
- `lps` (filter sustain) and `lpr` (filter release) are not used by any of the three
  confirmed presets — adding them now would be speculative scope.
- `hpf` (high-pass filter) is not used by any confirmed preset.
- `room` already exists from ADR 0018 D1.
- If future presets require `lps`, `lpr`, or `hpf`, they are added in that phase under a
  new ADR.

**Confirmed preset attribute table (Pilot-approved at Checkpoint #1):**

| Attribute | Piano | Guitarra | Bajo Sintético |
|---|---|---|---|
| `instrument` | `'triangle'` | `'sawtooth'` | `'sawtooth'` |
| `attack` | `0.02` | `0.01` | `0.06` |
| `decay` | `0.4` | `0.3` | — |
| `sustain` | `0.1` | `0.0` | `0.8` |
| `release` | `0.3` | — | `0.5` |
| `lpf` | `1800` | `2500` | `600` |
| `lpenv` | — | `3` | — |
| `lpa` | — | `0.01` | — |
| `lpd` | — | `0.25` | — |
| `lpq` | — | — | `2` |
| `room` | `0.4` | `0.15` | `0.2` |

A `—` means the attribute is absent from the preset; `resolveChordAttrs` falls through to
the hardcoded default for that attribute.

**Note on `room` in presets:** `room` already exists on `Chord` from ADR 0018. The preset
table assigns `room` values for all three presets; these are returned by `resolveChordAttrs`
as the preset's room value when the chord has no explicit `room` override. Codegen behavior
is unchanged — `room` is already emitted per-chord.

#### 4b — `lpf(1200)` variabilization (Option A — Replace, not Append)

`resolveChordAttrs` returns `lpf` as a resolved number, defaulting to `1200` when neither
an explicit `chord.lpf` nor a preset `lpf` is present.

Codegen replaces the three occurrences of the static string `lpf(1200)` with
`lpf(${resolved.lpf})` — where `resolved.lpf` is `resolveChordAttrs(chord).lpf`.

**Byte-identical guarantee:** `resolveChordAttrs` returns `1200` (the integer) when no
preset is set and no explicit `lpf` is set. `String(1200)` === `"1200"`. The template
literal `lpf(${1200})` equals `"lpf(1200)"` — character-for-character identical to the
current hardcoded string.

**Rejected alternative — Option B (Append a second `lpf` call):** Keep `lpf(1200)` hardcoded
and append a second `.lpf(N)` when a preset is active. Rejected because: (a) it is
unconfirmed whether the Strudel audio engine takes the last `lpf` call or produces a
double-filter artefact; (b) it produces non-canonical codegen (two `lpf` calls on the same
pattern) that would confuse the Código Strudel view; (c) the correct fix is to variabilize
the single `lpf` call.

---

### D5 — Persistence schema version bump: 3 → 4 (lossy)

**Decision:** `SESSION_SCHEMA_VERSION` in `src/lib/persistence.ts` bumps from `3` to `4`.

`SavedChordSchema.version` changes from `z.literal(3)` to `z.literal(4)`.

`SavedChordSchema` gains the new optional fields from D4a:

```typescript
preset: z.enum(['piano', 'guitar', 'synth-bass']).optional(),
lpf: z.number().optional(),
attack: z.number().min(0).optional(),
sustain: z.number().min(0).max(1).optional(),
release: z.number().min(0).optional(),
lpenv: z.number().optional(),
lpa: z.number().min(0).optional(),
lpd: z.number().min(0).optional(),
lpq: z.number().min(0).optional(),
```

**Graceful-degradation path (lossy drop):** A v3 session blob carries `version: 3`, which
fails the new `z.literal(4)` check. The existing `loadSavedSession` `safeParse` path returns
`null`, and the app loads its default state — no crash, no user-visible error. Users with
existing saved sessions lose them on first load after the update. This is the same tradeoff
accepted at Phase 09 (ADR 0013 D1) and Phase 02 (ADR 0018 D3).

**No migration function.** Consistent with ADR 0013 D1 and ADR 0018 D3 precedent.

**Why bump rather than keeping v3 with optional fields:** The Zod-optional-fields argument
is technically valid (new fields are all optional; a v3 session with none of the new fields
would parse successfully under a v3 schema that accepts new optional fields). However, a
version bump is:
1. Consistent with established precedent (ADR 0013, ADR 0018).
2. Unambiguous — there is no indistinguishable "v3-before" vs "v3-after" session risk.
3. Low cost — the bump is a one-line constant change plus a `z.literal(4)`.

---

### D6 — Agent schema: accept new fields as optional; technical tokens verbatim

**Decision:** `SCHEMA_VERSION` in `src/agent/schema.ts` bumps from `3` to `4` (same reason
as D5 — consistent version number across persistence and agent schema, as established in
ADR 0018 D3/D4).

`HarmonyChordCoreSchema` gains the following optional Zod fields:

```typescript
instrument: z.string().optional(),   // already present (ADR 0018 D4); retained as-is
preset: z.enum(['piano', 'guitar', 'synth-bass']).optional(),
lpf: z.number().optional(),
attack: z.number().min(0).optional(),
sustain: z.number().min(0).max(1).optional(),
release: z.number().min(0).optional(),
lpenv: z.number().optional(),
lpa: z.number().min(0).optional(),
lpd: z.number().min(0).optional(),
lpq: z.number().min(0).optional(),
```

**Technical tokens stay verbatim.** Preset names (`'piano'`, `'guitar'`, `'synth-bass'`)
and the noise token (`'pink'`) are Strudel technical tokens — they appear verbatim in emitted
Strudel code and must not be translated or i18n-wrapped. This follows ADR 0017 §D3 precedent
("technical tokens … stay verbatim") and ADR 0018 D4 precedent (waveform identifiers are
verbatim).

**`HarmonyRestSchema` is unchanged.** Rest slots do not carry sound attributes.

---

### D7 — `uniformAttrs` gate amendment: include all new fields

**Decision:** The `uniformAttrs` gate in `melodyLine` (introduced in ADR 0018 D2 / step
02.2 of the current phase file) determines whether the progression can use the simpler
`slowcat`/uniform path or must use `arrange()`. Its purpose is to detect any per-chord
variation in sound attributes and force the `arrange()` path when variation exists, so that
per-chord preset settings on single-bar chords are not silently dropped.

The gate must be extended to include every new sound-attribute field added in this phase:

```typescript
function uniformAttrs(chords: Chord[]): boolean {
  // Existing checks from ADR 0018 D2 (step 02.2):
  //   instrument, room, decay
  // New checks added in this phase:
  //   preset, lpf, attack, sustain, release, lpenv, lpa, lpd, lpq
  const ref = chords[0];
  return chords.every(
    (c) =>
      c.instrument === ref.instrument &&
      c.room       === ref.room       &&
      c.decay      === ref.decay      &&
      c.preset     === ref.preset     &&
      c.lpf        === ref.lpf        &&
      c.attack     === ref.attack     &&
      c.sustain    === ref.sustain    &&
      c.release    === ref.release    &&
      c.lpenv      === ref.lpenv      &&
      c.lpa        === ref.lpa        &&
      c.lpd        === ref.lpd        &&
      c.lpq        === ref.lpq
  );
}
```

**Byte-identical guarantee when all new fields are absent:** When every `Chord` in the
progression has `preset`, `lpf`, `attack`, `sustain`, `release`, `lpenv`, `lpa`, `lpd`, and
`lpq` all `undefined`, each new comparison `c.X === ref.X` evaluates to
`undefined === undefined === true`. The gate outcome is unchanged from the pre-phase-03
state, and the slowcat vs. `arrange()` path decision is identical. No regression.

**Why the gate must be extended:** A chord that has `preset: 'piano'` but is in a
single-bar progression of otherwise-identical chords would pass the old `uniformAttrs` check
(which doesn't look at `preset`) and be emitted via the slowcat path — where `preset` is not
threaded through and is silently dropped. The extended gate forces `arrange()` whenever any
preset or fine-grained attribute differs across chords, ensuring `resolveChordAttrs` is
called per-chord in the arrange path.

---

## Consequences

### Changed files

| File | Nature of change |
|---|---|
| `src/core/codegen/presets.ts` | New file: `PRESETS` lookup table, `resolveChordAttrs`, `PRESET_NAMES`, `PresetName` type, AGPL header (step 03.3) |
| `src/state/session.ts` | `Chord` interface gains `preset?`, `lpf?`, `attack?`, `sustain?`, `release?`, `lpenv?`, `lpa?`, `lpd?`, `lpq?` (step 03.3) |
| `src/core/codegen/strudel.ts` | `chordToStrudel` and `melodyLine` consume `resolveChordAttrs`; `lpf(1200)` → `lpf(${resolved.lpf})`; `uniformAttrs` extended per D7 (step 03.3) |
| `tests/presets.test.ts` | New file: unit tests for `resolveChordAttrs` (step 03.3) |
| `tests/codegen.test.ts` | Additions: byte-identical regression; preset codegen; noise-token codegen (step 03.3) |
| `src/lib/persistence.ts` | `SESSION_SCHEMA_VERSION` 3→4; `SavedChordSchema` gains new optional fields; `z.literal(3)` → `z.literal(4)` (step 03.4) |
| `src/agent/schema.ts` | `SCHEMA_VERSION` 3→4; `HarmonyChordCoreSchema` gains new optional fields (step 03.4) |
| `src/state/selectedSlot.ts` | `soundIntentStore` shape extended with `preset?` and the filter/envelope fields (step 03.4) |
| `tests/persistence.test.ts` | Additions: v3 drop + v4 parse + round-trip (step 03.4) |
| `tests/schema.test.ts` | Additions: v4 optional fields accepted; invalid preset names rejected (step 03.4) |
| `src/ui/Header.svelte` | Oscillator + Presets `<select>` menus replace flat sound block; edit-mode CSS (step 03.5) |
| `src/render/tonnetz-scene.ts` | `pickChord` reads `soundIntentStore.preset`; threads to new Chord (step 03.5) |
| `src/i18n/types.ts` | New keys for Oscillator/Preset labels; remove room/decay slider keys if removed (step 03.5) |
| `src/i18n/locales/es.ts` | New keys (step 03.5) |
| `src/i18n/locales/en.ts` | New keys (step 03.5) |
| `src/i18n/locales/pt.ts` | New keys (step 03.5) |
| `src/i18n/locales/zh.ts` | New keys (step 03.5) |

### Byte-identical guarantee at default

When every `Chord` in the progression has all new fields absent (`preset`, `lpf`, `attack`,
`sustain`, `release`, `lpenv`, `lpa`, `lpd`, `lpq` all `undefined`), and the existing fields
(`instrument`, `room`, `decay`) are also absent:

- `resolveChordAttrs` returns `{ instrument: 'sawtooth', lpf: 1200, room: 0.25 or 0.3, … }`.
- `chordToStrudel` emits the string `note("…").s("sawtooth").lpf(1200).gain(…).room(0.25)`.
- `melodyLine` emits the string `note("<…>").s("sawtooth").lpf(1200).gain("<…>").room(0.3)`.

These are character-for-character identical to the ADR 0018 / pre-phase-03 hardcoded output.
A named unit test ("byte-identical at default") in `tests/codegen.test.ts` asserts this for
all three callsites.

### `core/**` purity preserved

`src/core/codegen/presets.ts` has no DOM, PIXI, or Svelte imports. It is a pure TypeScript
module with no side-effects, suitable for unit testing in Vitest/Node.

### Deferred

- Per-chord `lpf`/`lpq`/`hpf` as direct user-controllable sliders (D-3 from Phase 01
  inventory) — still deferred. The new `lpf?` field on `Chord` is resolved by `resolveChordAttrs`
  from preset definitions; it is not exposed as a standalone slider.
- Filter sustain (`lps`) and filter release (`lpr`) — not used by any confirmed preset;
  deferred to a future phase.
- `room` and `decay` sliders removed from the top bar as part of the Phase 03 step 03.5
  redesign (consolidated into presets). Future phases may re-expose them if the Pilot decides.

### No new dependencies

All new behavior uses existing Svelte (`writable`, `get`), Zod (`z.enum`, `z.number().optional()`),
and TypeScript primitives.
