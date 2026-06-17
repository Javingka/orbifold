<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 Inventory — Sound-capability discovery

**Initiative:** harmonic-rhythm-improvements
**Phase:** 01 — Sound-capability discovery: chord/rhythm sound selection, short Tonnetz preview, and a risk/impact triage of Strudel attributes
**Status:** in progress (step 01.1 complete; sections (b)–(d) to follow)

---

## (a) Current sound surface + feature mapping

### Harmony sound chain (F1)

#### What is hardcoded

The harmony sound chain is fully hardcoded in two places in `src/core/codegen/strudel.ts`:

**`chordToStrudel` (line 64):**
```
note("${inner}").s("sawtooth").lpf(1200).gain(${g.toFixed(2)}).room(0.25)
```
- `s("sawtooth")` — instrument is hardcoded.
- `lpf(1200)` — fixed low-pass cutoff.
- `room(0.25)` — fixed reverb.
- Only `gain` is variable (passed as parameter, defaults to 0.6).

**`melodyLine` uniform case (line 115) — the common code path:**
```
note("<${seq}>").s("sawtooth").lpf(1200).gain("<${gains}>").room(0.3)
```
- Same hardcoded instrument, lpf, and room.
- `gains` sequence is variable.

**`melodyLine` arrange() case (line 141) — variable-duration/rest path:**
```
note("[${voicing}]").s("sawtooth").lpf(1200).gain(${g}).room(0.3)${sustain}
```
- Same hardcoded chain; `sustain` (`.slow(N)`) may be appended but is a duration expression, not timbre.

**What is variable today:**
- `gain` (per-chord, float 0–1.2, defaults to 0.6 — `src/core/codegen/strudel.ts` line 62).
- `notes` / `inner` — the voice pitches, derived from `rootPc + qual + octave`.
- `bars` (duration, not timbre) — via ADR 0010.

#### Where F1 changes attach — injection points (byte-identical guarantee)

The two functions `chordToStrudel` (line 54) and `melodyLine` (line 88) are the **only codegen callsites** for harmony audio. An `instrument` parameter (defaulting to `"sawtooth"`) can be added to both; when absent or `undefined` the emitted string must remain byte-identical to the current hardcoded value.

- `chordToStrudel` (line 54): add `instrument: string = 'sawtooth'` after `octave`; replace `s("sawtooth")` with `s("${instrument}")`. Callers: `session.ts` line 603 (playChord), and the `arrange()` arm within `melodyLine` itself (via `chordToStrudel`-equivalent inline string at line 141).
- `melodyLine` (line 88): add `instrument: string = 'sawtooth'` after `octave`; replace both occurrences at lines 115 and 141.
- Both functions live in `src/core/codegen/strudel.ts` — pure engine, no DOM imports.

The `Chord` type (`src/state/session.ts` line 141) currently has `{ rootPc, qual, gain, cx?, cy?, bars? }`. Adding an `instrument?: string` optional field means:
- Old sessions (no `instrument` field) → `undefined` → defaults to `'sawtooth'` → byte-identical.
- New sessions with `instrument: 'sawtooth'` explicitly set → same output.

The `playChord` function (`src/state/session.ts` line 601) is the top-level entry point for chord audio; it reads `state.chordMode` and `state.harmony.octave` and delegates to `chordToStrudel`. Adding `state.harmony` or per-chord `instrument` threading here is straightforward.

#### Injecting a per-chord attribute after selection (Pentagrama editor, Phase 10)

Phase 10 delivered `_selectedSlotIdx` in `src/render/pentagrama-scene.ts` (line 612) — a module-level `number | null` tracking the currently selected slot on the Pentagrama. The staff scene exposes slot select/resize/delete; a sound-change control for the selected slot could be surfaced in `src/ui/Header.svelte` inside the `{#if $sessionStore.view === 'harmony'}` block (where `acorde`/`arpegio`/`marco` already live — Phase 08 step 08.6, Header.svelte line ~40). The control would call a new `setChordInstrument(index, instrument)` action on the store, analogous to `setChordBars`.

However, `_selectedSlotIdx` is **module-level state in pentagrama-scene.ts**, not reactive store state. To expose it to Svelte, either: (a) promote it to a Svelte writable store, or (b) have a Header control directly read the PIXI module via an exported getter. This is a design choice to surface as OQ (see section (d)).

The phase file (F1, Phase 01 §Target features) specifies the control lives "after tonalidad / escala / octava" in the top bar, which matches the existing `{#if $sessionStore.view === 'harmony'}` block in `Header.svelte`.

---

### Rhythm sound model (F2)

#### The `Sound` union and `rhythmLayerToStrudelLine`

`src/core/rhythm/layers.ts` line 9:
```ts
export type Sound = 'bd' | 'sd' | 'hh' | 'oh' | 'cp' | 'rim' | 'lt' | 'mt' | 'ht';
```
Nine sounds, all string literals in a TypeScript union. This union propagates to:
- `RhythmLayer.sound: Sound` (line 18) — the per-layer sound field.
- `SK_SOUNDS` array in `src/agent/schema.ts` (line 21) — the Zod enum for agent-set sounds.
- `SK_SOUNDS` in `src/lib/persistence.ts` (line 20) — the Zod enum for persisted sounds.

`rhythmLayerToStrudelLine` (`src/core/rhythm/layers.ts` line 56) emits:
```ts
s("${sound}(${euclid})")    // euclidean mode
s("${tokens.join(' ')}")    // step-grid mode
```
The sound name is used verbatim as `s("<sound>")` — the Strudel `s()` pattern function. No sample variant index (`bd:n`) is exposed today.

#### Where F2 changes attach

1. **Expanded sound set**: Widen the `Sound` union in `layers.ts` to add new names (e.g., `'cr'`, `'cy'`, `'clap'` from the dirt-samples set). Correspondingly update `SK_SOUNDS` in both `schema.ts` and `persistence.ts`. Since sound names already persist as strings, old sessions with the 9 existing sounds remain valid; new sound names only appear in new layers.

2. **Sample variant (`bd:n`)**: Add an optional `sampleIndex?: number` field to `RhythmLayer`. `rhythmLayerToStrudelLine` would then emit `s("${sound}:${sampleIndex}")` when set, or `s("${sound}")` as today. The `SavedRhythmLayerSchema` in `persistence.ts` (line 62) would gain an optional `sampleIndex` field; old sessions (no field) parse with `undefined` → fallback → byte-identical.

3. **Changing an already-defined layer's sound**: `RhythmLayer.sound` is set at layer creation (`addEuclidLayer`, `src/state/session.ts` line 739; `addEmptyLayer`, line 777). A new `setLayerSound(layerIndex, sound)` store action would update `rhythm.layers[i].sound` and call `requeueLive()`. The UI entry point is the layer list in `Header.svelte` (the rhythm controls block — Phase 09 step 09.5), where each orbit row is rendered; a sound selector there is the natural home.

4. **Agent/schema contract**: `SK_SOUNDS` in `schema.ts` (line 21) is the Zod enum the agent must use. Expanding the `Sound` union and `SK_SOUNDS` in lockstep (all three files: `layers.ts`, `schema.ts`, `persistence.ts`) ensures the agent and persistence are consistent.

---

### Tonnetz preview path (F3)

#### How the loop arises

1. Canvas `pointerdown` → `onStagePointerDown` (`src/render/tonnetz-scene.ts` line 446) → `pickChord(tri, state)` (line 471).
2. `pickChord` (line 535) calls `playChord(tri.rootPc, tri.qual, 0.6)` from `src/state/session.ts` (line 601).
3. `playChord` builds `code = chordToStrudel(...)` (a bare `note(…).s("sawtooth")…` string) and calls `audio.runNow(code)` (line 608).
4. `runNow` calls `evaluate(bare)` from `@strudel/web` (line 196 in `src/audio/strudel.ts`). Strudel's `evaluate` runs the pattern through the Cyclist scheduler, which loops the pattern indefinitely (Strudel's cyclic playback model) until `hush()` is called.
5. `setNowPlaying(label, 'chord')` (session.ts line 609) marks the transport as playing a chord, so `requeueLive()` can service hot-swap, but there is no automatic `hush()` after a time — the chord loops forever.

The looping is intrinsic to the Strudel audio model: `evaluate(code)` sets a persistent cyclic pattern on the scheduler; there is no "play once and stop" primitive in `@strudel/web@1.0.3`. The Cyclist scheduler's `stop()` method (used by `hush()`) is the only way to silence a pattern.

#### What a one-shot preview requires

A short, non-looping Tonnetz chord preview requires a mechanism outside the Strudel cyclic scheduler. Options include:

- **Web Audio API direct synthesis**: bypass Strudel for the preview — decode the chord's note pitches to frequencies and schedule a short oscillator burst directly via `AudioContext` (`getAudioContext()` is already exported from `src/audio/strudel.ts` line 64). No dependency on Strudel's scheduler; does not interfere with `nowPlaying` transport state.
- **Short Strudel pattern + timed hush**: call `runNow` with a pattern that naturally completes in N cycles, then call `hush()` after `N × barMs`. Fragile (depends on BPM) and does touch `nowPlaying` transport state — it would overwrite whatever was playing and set source to `'chord'`, breaking a running session.
- **Decoupled audio context**: create a separate `AudioContext` (or a secondary Strudel scheduler instance) purely for preview, leaving the main scheduler running. Heavier architecture; `@strudel/web@1.0.3` does not expose a multi-scheduler API publicly.

The cleanest option for F3 — preserving the transport `nowPlaying` state of a running session — is a **direct Web Audio API preview** that does not touch the Strudel scheduler at all. This requires a new `previewChord` function in `src/audio/strudel.ts` (or a sibling module), not the existing `runNow` path.

The phase file §ADR Triggers notes "Non-looping preview audio path" as a potential ADR trigger for Phase 02 scoping.

---

### Chord / órbita selection state (F1 and F2 — changing already-defined elements)

#### Chord selection (Pentagrama / staff, F1)

Phase 10 (`src/render/pentagrama-scene.ts`):
- `_selectedSlotIdx: number | null` — module-level (line 612); set by pointer hits in `onPentagramaPointerDown` (around line 1143); cleared on `resetPentagramaEditState` (line 1319).
- The ✕ delete button and resize handles in the Pentagrama PIXI scene operate on `_selectedSlotIdx`. No Svelte store propagation today.
- The ProgressionStrip (`src/ui/ProgressionStrip.svelte`) has its own pointer-based selection model separate from the Pentagrama scene.

To expose the selected chord index to a top-bar instrument selector, `_selectedSlotIdx` needs to become observable by Svelte. The two designs are: (a) a new Svelte writable store (e.g., `selectedSlotStore`) that the PIXI scene writes and the Header reads, or (b) a direct PIXI→DOM callback registered in `pentagrama-scene.ts`. This is an open design question (see OQ-3).

#### Layer/órbita selection (Rhythm, F2)

In the current rhythm controls block inside `Header.svelte` (Phase 09 step 09.5 inline), each Euclidean orbit row is rendered based on `$sessionStore.rhythm.layers`. There is no explicit "selected layer" state today — layers are identified by their index. A sound-change control for a layer would operate on the layer index from the layer list. This is simpler than chord selection: the Header already holds the layer list and can hold a `selectedLayerIdx: number | null` local variable, similar to `euclidSound` / `euclidK` / `euclidN` / `euclidR` (Header.svelte lines 79–82).

---

### Agent + persistence contracts (cost of adding attributes)

#### Agent schema (`src/agent/schema.ts`)

- `SCHEMA_VERSION = 2` (line 17) — bumped at Phase 06 for rest slots (ADR 0012 D4).
- `SK_SOUNDS` (line 21): the Zod enum for rhythm sounds. Expanding it requires adding to this array and the `Sound` union in `layers.ts` and `SavedRhythmLayerSchema` in `persistence.ts`.
- `HarmonyChordCoreSchema` (line 117): does NOT have an `instrument` field. Adding one (`instrument: z.string().optional()`) is a non-breaking schema change (optional field with no version bump required for optional additions, but a bump clarifies the contract).
- `RhythmLayerStepsSchema` / `RhythmLayerEuclidSchema` (lines 42, 55): do NOT have `sampleIndex`. Adding optional `sampleIndex: z.number().int().min(0).optional()` is non-breaking.

Per the phase invariants: "New attributes that persist or that the agent may set require a versioned bump of `SCHEMA_VERSION` (agent) and `SavedSchema` (persistence)." The bump strategy (patch vs. minor, backward-read compatibility) is an open question (see OQ-6).

#### Persistence schema (`src/lib/persistence.ts`)

- `SESSION_SCHEMA_VERSION = 2` (line 16).
- `SavedChordSchema` (line 35): has `rootPc`, `qual`, `gain`, `bars?`. Adding `instrument?: z.string()` is non-breaking but per invariants requires a version bump.
- `SavedRhythmLayerSchema` (line 62): has `sound`, `steps`, `euclid?`, `muted?`, `solo?`. Adding `sampleIndex?: z.number()` is non-breaking.
- The graceful-degradation path in `loadSavedSession` (line 289) drops sessions that fail `safeParse`. A version bump from 2→3 would drop v2 sessions — unless migration logic is added (read v2, set new fields to defaults). Pilot must decide the tradeoff (see OQ-6).

#### Summary table — attributes and their change cost

| Attribute | Chord/Rhythm | Files to touch | Schema bump needed |
|---|---|---|---|
| `instrument?: string` (harmony) | Chord | `codegen/strudel.ts`, `state/session.ts` (`Chord`), `agent/schema.ts`, `lib/persistence.ts` | Yes (both) |
| `sampleIndex?: number` (rhythm) | Rhythm | `core/rhythm/layers.ts` (`RhythmLayer`), `agent/schema.ts`, `lib/persistence.ts` | Yes (both) |
| Expand `Sound` union | Rhythm | `core/rhythm/layers.ts`, `agent/schema.ts`, `lib/persistence.ts` | Yes (SK_SOUNDS enum, both) |
| `previewChord` (one-shot audio, F3) | Audio path | `src/audio/strudel.ts` (new function) | No (pure audio, no persistence/agent) |

---

*(Sections (b), (c), (d) follow in steps 01.2 and 01.3.)*
