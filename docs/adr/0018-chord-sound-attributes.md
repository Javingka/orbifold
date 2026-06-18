<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0018 — Chord sound attributes data model

- **Status:** Accepted
- **Date:** 2026-06-17
- **Initiative / Phase:** harmonic-rhythm-improvements / Phase 02 (step 02.1)
- **Deciders:** Pilot (Javier)

## Context

The harmony sound chain in `src/core/codegen/strudel.ts` is fully hardcoded today. Both
`chordToStrudel` (line 64) and `melodyLine` emit fixed instrument, reverb, and no-decay
strings:

```
// chordToStrudel (line 64):
note("${inner}").s("sawtooth").lpf(1200).gain(${g.toFixed(2)}).room(0.25)

// melodyLine uniform case (line 115):
  note("<${seq}>").s("sawtooth").lpf(1200).gain("<${gains}>").room(0.3)

// melodyLine arrange() case (line 141):
  [${numCycles}, note("[${voicing}]").s("sawtooth").lpf(1200).gain(${g}).room(0.3)${sustain}]
```

The only variable parts today are `gain` (per-chord, float 0–1.2) and the note pitches
derived from voice-leading. The instrument is always `"sawtooth"`, the reverb is always
`0.25` (chord) or `0.3` (melody lines), and no decay is applied.

Feature F1 (chord sound selection) requires `instrument`, `room`, and `decay` to be
per-chord attributes — selectable by the user from the top bar for the currently-selected
Pentagrama slot and applied to newly-created chords. The Pilot resolved the following open
questions at Checkpoint #1 (2026-06-17):

- **OQ-1** → 4 oscillator waveforms only: `sawtooth` / `sine` / `square` / `triangle`
  (the four confirmed available in `@strudel/web@1.0.3` via `registerSynthSounds()`).
- **OQ-3** → promote `_selectedSlotIdx` to a Svelte writable store (option A).
- **OQ-5** → include `instrument` (C-1), `room` (C-2), and `decay` (C-3) in Phase 02;
  one schema bump covers all three.
- **OQ-6** → bump both schemas 2→3, lossy drop of v2 sessions (option A — ADR 0013 D1
  precedent). No migration function.
- **OQ-7** → agent may set all three new attributes verbatim (option A); technical tokens
  stay verbatim per ADR 0017 OQ-6 precedent.
- **OQ-8** → one ADR for the sound-attribute data model (this document); non-looping
  preview ADR (for F3/C-7) is deferred to the F3 phase.

The `lpf(1200)` hardcoded filter is deferred (inventory §(c) D-3): exposing it alongside
instrument/room/decay increases control surface significantly. The "no added complexity"
principle argues for validating the simpler C-1/C-2/C-3 set first.

Five decisions govern the implementation.

---

## Decisions

### D1 — `Chord` type extension

Add three optional fields to `interface Chord` in `src/state/session.ts`:

```typescript
instrument?: string;   // waveform name; default 'sawtooth'
room?: number;         // reverb level 0–1; default 0.25 (chord) / 0.3 (melody)
decay?: number;        // amplitude decay time in seconds; > 0; absent = no .decay() emitted
```

**Default-value semantics:** When a field is absent (`undefined`), codegen must emit the
same hardcoded string it emits today — `s("sawtooth")`, `room(0.25)` (or `room(0.3)` in
the `melodyLine` path), and no `.decay(…)` chain segment. This is the byte-identical
guarantee: existing sessions whose chords have no `instrument`, `room`, or `decay` fields
produce output character-for-character identical to the pre-phase `main` output.

**Valid instrument values:** `'sawtooth' | 'sine' | 'square' | 'triangle'`. These are the
four waveforms registered by `registerSynthSounds()` in `@strudel/web@1.0.3` (confirmed
from `node_modules/@strudel/web/dist/index.mjs` in the Phase 01 inventory §(b)). Other
strings are outside the defined set; the UI enforces the valid set via a `<select>` with
fixed options. The type is `string` (not a narrower union literal) to remain
forward-compatible if the waveform set expands in a future version without requiring a type
migration.

**Valid `room` range:** 0–1, following the Strudel `room()` effect documented at
`https://strudel.cc/learn/effects/` (Reverb). Values outside this range are invalid; the
UI range input enforces the bound. The `room` parameter replaces the current per-callsite
hardcoded values: `0.25` in `chordToStrudel` and `0.3` in both `melodyLine` code paths.

**Valid `decay` range:** greater than 0, measured in seconds. The Strudel `.decay()`
amplitude envelope parameter is documented at `https://strudel.cc/learn/effects/`
(Amplitude Envelope). A value of `0` is invalid (zero decay time is inaudible); the UI
range input lower bound is `0.05` seconds. When absent (`undefined`), no `.decay(…)` is
appended to the pattern chain, preserving the current sustained-chord behavior.

**Placement in the interface:** after the existing `bars?` field to minimize diff noise.

### D2 — Codegen injection pattern

`chordToStrudel` (line 54) and `melodyLine` (line 88) in `src/core/codegen/strudel.ts`
each gain three optional parameters (`instrument`, `room`, `decay`) and apply the following
conditional emit rule to every callsite:

**`instrument` parameter:**

- Absent or `undefined` → emit `s("sawtooth")` unchanged (byte-identical).
- Present → emit `s("${instrument}")`.

**`room` parameter:**

- `chordToStrudel` callsite (line 64): absent → `room(0.25)`; present → `room(${room})`.
- `melodyLine` uniform-case callsite (line 115): absent → `room(0.3)`; present → `room(${room})`.
- `melodyLine` arrange-case callsite (line 141): absent → `room(0.3)`; present → `room(${room})`.

Note that the two `melodyLine` callsites share the same default (`0.3`) while
`chordToStrudel` uses `0.25`. This asymmetry is preserved unchanged.

**`decay` parameter:**

- Absent or `undefined` → no `.decay(…)` segment is appended (byte-identical to current
  output, which has no decay).
- Present → append `.decay(${decay})` immediately after `.room(…)`, before any `sustain`
  expression (the `${sustain}` interpolation in the arrange-case path).

The three callsite lines where these substitutions must be made are (per inventory §(a)):

- Line 64 — `chordToStrudel` return string.
- Line 115 — `melodyLine` uniform-case return (the slowcat form).
- Line 141 — `melodyLine` arrange-case per-segment string (inside the `segments.map` closure).

**`lpf(1200)` stays hardcoded.** The low-pass filter is not a parameter in this phase
(inventory §(c) D-3 deferred). No callsite changes `lpf`.

**Byte-identical at default.** When all three parameters are `undefined`, the emitted
strings remain character-for-character identical to the pre-phase `main` hardcoded output:

```
// chordToStrudel at default:
note("${inner}").s("sawtooth").lpf(1200).gain(${g.toFixed(2)}).room(0.25)

// melodyLine uniform-case at default:
  note("<${seq}>").s("sawtooth").lpf(1200).gain("<${gains}>").room(0.3)

// melodyLine arrange-case at default:
  [${numCycles}, note("[${voicing}]").s("sawtooth").lpf(1200).gain(${g}).room(0.3)${sustain}]
```

**`core/**` purity constraint is preserved.** `src/core/codegen/strudel.ts` has no DOM,
PIXI, or Svelte imports and must not gain any. The three new parameters are plain
TypeScript primitives (`string`, `number`).

### D3 — Persistence schema 2→3 (lossy)

`SESSION_SCHEMA_VERSION` in `src/lib/persistence.ts` bumps from `2` to `3`.

`SavedChordSchema` gains three optional Zod fields:

```typescript
instrument: z.string().optional(),
room: z.number().min(0).max(1).optional(),
decay: z.number().min(0).optional(),
```

`SavedSessionSchema.version` changes from `z.literal(2)` to `z.literal(3)`.

**Graceful-degradation path (lossy drop):** The existing `loadSavedSession` function at
line 284 of `src/lib/persistence.ts` calls `SavedSessionSchema.safeParse(parsed)` and
returns `null` if it fails. A v2 session blob carries `version: 2`, which fails the new
`z.literal(3)` check, causing `safeParse` to return `{ success: false }`. The function
returns `null`, and the app loads its default state — no crash, no error shown to the user.
This is the established graceful-degradation contract.

**Precedent:** ADR 0013 D1 (Phase 09, step 09.3) established this exact lossy-bump
pattern. The comment in `persistence.ts` at the current `SESSION_SCHEMA_VERSION = 2`
declaration describes it: "Version 1 blobs fail the `z.literal(2)` check and are dropped
by safeParse (existing graceful-degradation behavior, Pilot-confirmed tradeoff per ADR 0013
D1)." The v3 bump follows the same contract for v2 blobs.

**No migration function.** The tradeoff (existing users lose their saved sessions on first
load after the update) is accepted as the same tradeoff accepted at Phase 09. Users will
start a new session. This is documented in the phase acceptance criteria (A-02-05).

### D4 — Agent schema version bump

`SCHEMA_VERSION` in `src/agent/schema.ts` bumps from `2` to `3`.

`HarmonyChordCoreSchema` gains three optional Zod fields:

```typescript
instrument: z.string().optional(),
room: z.number().min(0).max(1).optional(),
decay: z.number().min(0).optional(),
```

**Technical tokens stay verbatim.** The waveform identifiers (`sawtooth`, `sine`, `square`,
`triangle`) are Strudel technical tokens — they appear verbatim in the emitted Strudel code
and must not be translated or i18n-wrapped. This follows the OQ-7/ADR 0017 precedent: ADR
0017 §D3 establishes that "technical tokens (Strudel code, sample codes, `E(k,n)`, note
literals, `P·L·R`) stay verbatim." Waveform names are in the same category.

**Schema annotation.** The `SCHEMA_VERSION` declaration JSDoc reads: "bump if the shape
changes in a future phase." The three new optional fields change the accepted shape of
`HarmonyChordCoreSchema`; the bump is the explicitly documented intent.

**`HarmonyRestSchema` is unchanged.** Rest slots do not carry sound attributes; silence is
silence regardless of waveform. The discriminated union order (rest schema first, per ADR
0012 D4) is preserved.

### D5 — `selectedSlotIdxStore` reactive store

**Problem:** `_selectedSlotIdx` in `src/render/pentagrama-scene.ts` (line 612) is a
module-level TypeScript variable:

```typescript
let _selectedSlotIdx: number | null = null;
```

It is written in 7 places across the file (lines 689, 1100, 1143, 1150, 1209 write or
clear it; line 1319 `resetPentagramaEditState` sets it to `null`) and read in 5 additional
places (lines 688, 765, 767, 1088, 1094, 1113, 1133). It is not observable by Svelte
components — `Header.svelte` cannot react to changes in a plain module variable.

**Decision:** Create a new file `src/state/selectedSlot.ts` that exports a Svelte writable
store:

```typescript
// src/state/selectedSlot.ts
import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

export const selectedSlotIdxStore: Writable<number | null> = writable(null);
```

**PIXI scene writes to the store.** `src/render/pentagrama-scene.ts` imports
`selectedSlotIdxStore` from `../state/selectedSlot` and replaces every assignment of
`_selectedSlotIdx`:

- `_selectedSlotIdx = n` → `selectedSlotIdxStore.set(n)` (lines 689, 1100, 1143, 1150)
- `_selectedSlotIdx = null` → `selectedSlotIdxStore.set(null)` (lines 1150, 1319)
- The resize-confirm write at line 1209 (`_selectedSlotIdx` is read, not written there)
  remains a read path, using `get(selectedSlotIdxStore)` from `svelte/store`.
- Every place that previously read `_selectedSlotIdx` now reads via
  `get(selectedSlotIdxStore)` (using the synchronous `get` import from `svelte/store`).

**`resetPentagramaEditState`** calls `selectedSlotIdxStore.set(null)` instead of
`_selectedSlotIdx = null`.

**`Header.svelte` reads the store reactively.** The instrument/room/decay top-bar controls
subscribe to `$selectedSlotIdxStore` to show the current slot's values and to target
`setChordSoundAttrs` calls at the correct progression index.

**Module purity.** `src/state/selectedSlot.ts` must NOT import any DOM or PIXI symbol. It
exports only a Svelte writable store. `pentagrama-scene.ts` is already a render module
(PIXI-importing); it may import a Svelte store from `../state/selectedSlot` without
violating the `core/**` purity invariant (that invariant applies to `src/core/**` only, not
to `src/render/**`).

---

## Consequences

### Changed files

| File | Nature of change |
|---|---|
| `src/state/session.ts` | `Chord` interface gains `instrument?`, `room?`, `decay?` (step 02.2) |
| `src/core/codegen/strudel.ts` | `chordToStrudel` and `melodyLine` gain optional parameters; three callsites updated (step 02.2) |
| `src/core/codegen/strudel.test.ts` | New unit tests: byte-identical-at-default + all attribute combinations (step 02.2) |
| `src/lib/persistence.ts` | `SESSION_SCHEMA_VERSION` 2→3; `SavedChordSchema` gains 3 optional fields; `z.literal(2)` → `z.literal(3)` (step 02.3) |
| `src/agent/schema.ts` | `SCHEMA_VERSION` 2→3; `HarmonyChordCoreSchema` gains 3 optional fields (step 02.3) |
| `src/state/selectedSlot.ts` | New file; exports `selectedSlotIdxStore: Writable<number \| null>` (step 02.4) |
| `src/render/pentagrama-scene.ts` | All `_selectedSlotIdx` assignments/reads migrated to `selectedSlotIdxStore` (step 02.4) |
| `src/state/session.ts` | New store actions: `setChordInstrument`, `setChordSoundAttrs`; `playChord` threading updated (step 02.4) |
| `src/ui/Header.svelte` | Instrument/room/decay controls added in harmony view (step 02.5) |
| `src/i18n/es.ts`, `en.ts`, `pt.ts`, `zh.ts` | New keys for sound control labels (step 02.5) |

### Byte-identical guarantee at default

When all three new fields (`instrument`, `room`, `decay`) are absent from every `Chord` in
the progression, `chordToStrudel` and `melodyLine` must emit character-for-character
identical output to the pre-phase `main` hardcoded strings. This guarantee is verified by
named unit tests ("byte-identical at default") in `strudel.test.ts` for each of the three
callsites.

### Deferred: F2 (rhythm sound attributes) and F3 (non-looping preview)

This ADR covers F1 only. F2 (rhythm sound model expansion — `bank`, `sampleIndex`,
expanded `Sound` union) and F3 (one-shot Tonnetz chord preview via direct Web Audio API)
are deferred to later phases. No schema changes for rhythm layers are introduced here. The
non-looping preview ADR (covering C-7 from the Phase 01 inventory) is explicitly deferred
per OQ-4/OQ-8 resolution.

### No new dependencies

No npm packages are added. All new behavior uses existing Svelte (`writable`, `get`), Zod
(`z.string().optional()`, `z.number().optional()`), and TypeScript primitives.
