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

*(Section (a) complete. Sections (b)–(d) follow in steps 01.2 and 01.3.)*

---

## (b) Attribute survey + triage

**Sources consulted (live, 2026-06-17):**
- Synths: `https://strudel.cc/learn/synths/`
- Audio Effects: `https://strudel.cc/learn/effects/`
- Samples: `https://strudel.cc/learn/samples/`
- Signals: `https://strudel.cc/learn/signals/`
- Mini-notation: `https://strudel.cc/learn/mini-notation/`
- Tonal Functions: `https://strudel.cc/learn/tonal/`
- Time Modifiers: `https://strudel.cc/learn/time-modifiers/`
- Conditional Modifiers: `https://strudel.cc/learn/conditional-modifiers/`
- Accumulation Modifiers: `https://strudel.cc/learn/accumulation/`
- Visual Feedback: `https://strudel.cc/learn/visual-feedback/`

**@strudel/web@1.0.3 discrepancy note (verified from bundled `dist/index.mjs`):**
`registerSynthSounds()` in @strudel/web@1.0.3 registers exactly:
- Oscillators: `sine`, `square`, `triangle`, `sawtooth`
- Noise: `pink`, `white`, `brown`, `crackle`

`supersaw` and `pulse` appear in current docs but are **NOT** registered in `@strudel/web@1.0.3`. ZZFX sounds (`z_sawtooth`, `z_sine`, `z_triangle`, `z_square`, `z_tan`, `z_noise`) are present in 1.0.3. Soundfonts (`gm_*`) depend on `@strudel/soundfonts`, which is explicitly commented-out in `@strudel/web/web.mjs` line 3 and line 25 (the call `registerSoundfonts()` is commented). Soundfonts are **not available** in the app's `@strudel/web@1.0.3` initialization path (`src/audio/strudel.ts` line 166 calls `registerSynthSounds()` but not `registerSoundfonts()`).

Dirt-samples (`github:tidalcycles/dirt-samples`) **are** loaded at init (`src/audio/strudel.ts` line 165: `samples('github:tidalcycles/dirt-samples')`). The full dirt-samples set includes `bd`, `sd`, `hh`, `oh`, `cp`, `rim`, `lt`, `mt`, `ht`, `cr` (crash), `rd` (ride), `sh` (shakers), `cb` (cowbell), `tb` (tambourine), `perc`, `misc`, `fx` plus VCSL instrument samples (see samples page at `https://strudel.cc/learn/samples/`).

**The full triage table follows.** For each function, the triage columns are:

| Function | What it does | Target feature | Implementation surface | Risk | Impact | Live-doc URL | 1.0.3 note |
|---|---|---|---|---|---|---|---|
| **`s()` / `.sound()`** | Sets the sound source (waveform name or sample name) | F1 (chord sound), F2 (rhythm sound) | codegen (`chordToStrudel`, `rhythmLayerToStrudelLine`), data model (`Chord.instrument?`, `RhythmLayer.sound`), agent schema (`SK_SOUNDS`), persistence (`SavedChordSchema`, `SavedRhythmLayerSchema`) | Low | High | `https://strudel.cc/learn/synths/` (Basic Waveforms) | In 1.0.3: `sine/square/triangle/sawtooth` + noise types only; `supersaw`/`pulse` absent |
| **`bd:n` (sample index in mini-notation)** | Selects the nth sample within a named dirt-sample group | F2 | `rhythmLayerToStrudelLine` (emit `s("${sound}:${n}")`), `RhythmLayer.sampleIndex?`, persistence | Low | Med | `https://strudel.cc/learn/samples/` (Selecting Sounds) | Fully supported in 1.0.3 via dirt-samples |
| **`.bank()`** | Prepends a drum-machine prefix to sound names, e.g. `s("bd").bank("RolandTR909")` selects `RolandTR909_bd` | F2 (alternate drum machine timbre) | codegen (per-layer emit), data model (new `bank?: string` on `RhythmLayer`) | Low | Med | `https://strudel.cc/learn/samples/` (Sound Banks) | Supported — dirt-samples includes TR808, TR909, etc. |
| **`n()` + `.scale()`** | Picks pitch from a named scale by index; quantizes note events to the scale. `n()` alone is an integer pattern | F1 (alternate pitch selection approach) | N/A — Orbifold uses `note()` with explicit voice pitches from `chordVoicing()`; `.scale()` provides a different paradigm | High | Low | `https://strudel.cc/learn/tonal/` | Supported in 1.0.3. **Orbifold already solves this** via Tonnetz geometry + `chordVoicing()` — explicit voice-leading is the app's core value; `.scale()` would bypass it |
| **`.add()`** | Transposes a note pattern by a number of semitones (or another pattern) | F1 (potential octave/transpose) | Would add random pitch variation — not a timbre selector | High | Low | `https://strudel.cc/learn/accumulation/` | Supported in 1.0.3. **Conflicts with Orbifold's geometric voice-leading** — voice pitches must be exactly those from `chordVoicing()`; adding random semitone offsets destroys the Tonnetz/voice-leading intent |
| **Mini-notation operators (`*`, `/`, `<>`, `[,]`)** | Sequence, repetition, alternation, polyphony operators in the pattern DSL | None directly; already used by Orbifold | codegen (already used in note strings) | Low | N/A | `https://strudel.cc/learn/mini-notation/` | Supported. Orbifold uses `<…>` (slowcat) and `[a,b,c]` (polyphony) already |
| **`.seg()` (segment)** | Samples a continuous signal at N events per cycle; turns continuous into discrete. Also used to densify patterns for continuous filter LFO effect | N/A for F1/F2/F3 | Would require injecting into codegen — no UI model maps to it | High | Low | `https://strudel.cc/learn/time-modifiers/` | Supported. **Adds complexity** — no direct user mental model in Orbifold's geometric approach |
| **`.struct()`** | Imposes a rhythmic structure on a value pattern: `note("c,eb,g").struct("x ~ x ~")` | N/A | No natural UI mapping in Orbifold | High | Low | `https://strudel.cc/learn/conditional-modifiers/` | Supported. Primarily a compositional tool; bypasses Orbifold's step-grid model |
| **`.ribbon()` / `rib()`** | Loops a slice of the total time axis by offset + cycles | N/A | Not a sound attribute; a time-topology tool with no UI analog in Orbifold | High | Low | `https://strudel.cc/learn/time-modifiers/` | Supported. Paradigm-shifting: requires thinking in ribbon-of-time units, not bars/cycles |
| **`.round()`** | (not directly in docs as a standalone function — `round` appears in context of swing/swingBy as "rounding", not a generic `.round()` method) | N/A | — | N/A | N/A | `https://strudel.cc/learn/time-modifiers/` | Not a standard sound attribute |
| **`.mul()`** | (not found in live docs as a standard Pattern method; may refer to signal arithmetic `.mul` inside signal patterns such as `rand.mul(0.5)`) | N/A | — | N/A | N/A | Not documented as a standalone user-facing method | Not confirmed in 1.0.3 API surface |
| **`rand`** | Continuous 0–1 random signal, used to drive parameters: `rand.range(500,8000)` | Could be used to randomize `lpf`/`room` — not a discrete attribute | N/A for fixed per-chord attributes | High | Low | `https://strudel.cc/learn/signals/` | Supported in 1.0.3. **Adds non-determinism** — contradicts Orbifold's reproducible-session model |
| **`time`** | (The `time` signal in some Strudel setups is a per-cycle phase `[0,1]`; not in the standard API surface for effects) | N/A | Not applicable | High | N/A | Not clearly documented as a standalone signal in 1.0.3 API surface | Not confirmed |
| **`.clip()` / legato** | Multiplies event duration by a factor; truncates samples. Also controls legato feel for sustained chords | F1 (chord sustain control) | codegen (append `.clip(factor)` after `.s(…)`), data model (`Chord.clip?`), persistence | Low | Med | `https://strudel.cc/learn/samples/` (Sampler Effects, clip) | Supported in 1.0.3 (line 3296 in dist/index.mjs: `["clip"]`) |
| **`.lpf()` / `.hpf()` (filters)** | Low-pass / high-pass filter with cutoff frequency. `lpf(1200)` is already hardcoded for harmony | F1 (chord timbre shaping — expose `lpf` as user-controllable) | codegen (replace hardcoded `lpf(1200)` with `lpf(${value})`), data model, persistence | Low | Med | `https://strudel.cc/learn/effects/` (Filters) | Supported in 1.0.3 |
| **`.lpa()/.lpd()/.lps()/.lpq()` (filter envelope)** | Attack/decay/sustain/resonance parameters for the LP filter envelope. `.lpenv(depth)` sets modulation depth | F1 (chord attack shaping — e.g. `.lpa(0.1).lpenv(4)` for a filter sweep) | codegen, data model | Med | Med | `https://strudel.cc/learn/effects/` (Filter Envelope) | Supported in 1.0.3. Adds significant interaction complexity — requires 4+ parameters |
| **`.gain()`** | Sets output volume (0–1.2). Already used per-chord in Orbifold | F1/F2 (already implemented) | Already in codegen and data model | None | N/A | `https://strudel.cc/learn/effects/` (Signal chain — gain) | Supported. Already implemented |
| **`.dec()` / `decay`** | ADSR decay time: how fast the sound dies after attack | F1 (chord note length / pluck feel) | codegen (append `.decay(${val})`), data model (`Chord.decay?`) | Low | Med | `https://strudel.cc/learn/effects/` (Amplitude Envelope) | Supported in 1.0.3. Gives chords a plucked/sustained character |
| **`.fm()` / `.fmh()`** | FM synthesis: modulates oscillator frequency for metallic/bell timbres | F1 (extended chord timbre palette) | codegen, data model | Med | Med | `https://strudel.cc/learn/synths/` (FM Synthesis) | Supported in 1.0.3 (dist/index.mjs lines 2031, 2046) |
| **`.orbit()`** | Routes pattern to a named reverb+delay bus. `orbit(2)` = separate reverb from default | Advanced mixing — separating harmony/rhythm reverb chains | codegen | Med | Low | `https://strudel.cc/learn/effects/` (Orbits) | Supported. **Use with caution**: one reverb/delay per orbit; parameterizing orbit for a single pattern type while sharing it with another causes unpredictable reverb overrides |
| **`.pan()`** | Stereo position (0=left, 0.5=center, 1=right) | F1 / F2 (panning) | codegen, data model | Low | Low | `https://strudel.cc/learn/effects/` | Supported in 1.0.3 |
| **`.delay()`** | Echo/delay level (0–1) | F1 / F2 (spatial effect) | codegen, data model | Low | Low | `https://strudel.cc/learn/effects/` (Delay) | Supported in 1.0.3 |
| **`.room()`** | Reverb level (0–1). Already used (`room(0.25/0.3)`) | F1 — expose as user-settable | codegen (replace hardcoded `room(0.25)` with `room(${val})`), data model | Low | Med | `https://strudel.cc/learn/effects/` (Reverb) | Supported. Already in use; changing default from 0.25 to variable is low-risk |
| **`slider()`** | REPL-specific widget that renders an interactive slider in the code editor UI | None — REPL-only UI tool | N/A | High | N/A | Not in static docs — REPL-specific feature | **Not applicable** to Orbifold: the app has its own Svelte UI, does not render inside the Strudel REPL |
| **`._pianoroll()` / `._scope()`** | Visualize a pattern as a scrolling piano roll / oscilloscope in the REPL | None — REPL-only visualization | N/A | High | N/A | `https://strudel.cc/learn/visual-feedback/` | **Not applicable**: Orbifold has PIXI/Pentagrama for visualization; injecting these into patterns would crash or no-op in the app's `evaluate()` context. The `_` prefix signals developer tooling |
| **`supersaw`** | Multi-oscillator saw (rich detuned stack) | F1 candidate if available | codegen | N/A | High if available | `https://strudel.cc/learn/synths/` | **Not available in @strudel/web@1.0.3** — not registered by `registerSynthSounds()`. Present in current docs but absent from 1.0.3 `dist/index.mjs` |
| **`pulse`** | PWM oscillator | F1 candidate if available | codegen | N/A | Med | `https://strudel.cc/learn/synths/` | **Not available in @strudel/web@1.0.3** — not registered. Present in current docs, absent from 1.0.3 |
| **`gm_*` soundfonts** | GM soundfont instrument patches (piano, strings, etc.) | F1 candidate (piano-like chord) | codegen, init (`registerSoundfonts`) | High | Med | `https://strudel.cc/learn/samples/` | **Not available in @strudel/web@1.0.3 app init**: `registerSoundfonts()` is commented-out in `web.mjs` (lines 3, 25). Adding it would require an `initAudio` change and a load-time cost for the soundfont atlas |
| **`samples('github:…')`** | Load a sample map from a GitHub-hosted `strudel.json` | F2 (user custom samples or additional drum banks) | `initAudio` (one-time call), possible lazy-load per session | High | Med | `https://strudel.cc/learn/samples/` (Github Shortcut) | Supported; `github:tidalcycles/dirt-samples` already loaded. Additional `samples()` calls at runtime are possible but must complete before the pattern plays |

### Summary of key 1.0.3 discrepancies

1. **`supersaw`/`pulse` absent**: The current Strudel docs show these as available waveforms, but `registerSynthSounds()` in `@strudel/web@1.0.3` only registers `['sine','square','triangle','sawtooth','pink','white','brown','crackle']`. Using `s("supersaw")` in the app would fall through to the sample-player path and likely produce silence or an error (no sample named `supersaw` in the dirt-samples map).

2. **Soundfonts (`gm_*`) not initialized**: `@strudel/web/web.mjs` explicitly comments out `import { registerSoundfonts } from '@strudel/soundfonts'` and the corresponding `registerSoundfonts()` call. The app follows the same pattern — `src/audio/strudel.ts` calls `registerSynthSounds()` but not `registerSoundfonts()`. Enabling soundfonts requires a new init call and network fetch of the soundfont atlas (load cost ~1-2 MB).

3. **`slider()` is REPL-only**: No match in Orbifold's architecture.

4. **`._pianoroll()` / `._scope()`**: REPL-only developer tooling. Evaluating code containing these in Orbifold's `evaluate()` call would either no-op or reference undefined REPL globals.

5. **`.round()`**: Not a standard sound attribute — the docs use `round` in swingBy context; there is no `.round()` as a Pattern method in the sound-effects sense.

6. **`time` signal**: Not confirmed as a standard user-facing continuous signal in 1.0.3 (the Signals page lists `saw`, `sine`, `cosine`, `tri`, `square`, `rand`, `perlin`, `irand`, `brand`). `time` is not in that list.

---

*(Section (b) complete. Sections (c) and (d) follow in step 01.3.)*

---

## (c) Candidate set vs. deferred register

The following two lists are **proposed**, not decided. All decisions rest with the Pilot at Checkpoint #1.

Selection criterion: **Candidates** are low-risk, high-impact, directly serve F1/F2/F3, and do not increase use complexity (the Pilot's design principle). **Deferred** items are high-risk, paradigm-shifting, complexity-adding, or unavailable in `@strudel/web@1.0.3`.

---

### Candidates for this initiative

These attributes are low-risk, serve F1/F2/F3 directly, integrate cleanly into the existing codegen/data model, and keep sessions reproducible.

| # | Attribute / Feature | Target feature | Implementation surface | ADR needed? | Schema bump needed? | Notes |
|---|---|---|---|---|---|---|
| C-1 | **`s()` waveform selector for harmony chords** (`sine`, `square`, `triangle`, `sawtooth` — the four confirmed in 1.0.3) | F1 | `chordToStrudel` + `melodyLine` in `codegen/strudel.ts`; `Chord.instrument?: string`; `agent/schema.ts` (`HarmonyChordCoreSchema`); `lib/persistence.ts` (`SavedChordSchema`) | Yes — sound-attribute data model (parallels ADR 0010/0012; defines the typed model and codegen form) | Yes — both agent (`SCHEMA_VERSION`) and persistence (`SESSION_SCHEMA_VERSION`); backward-compatible (optional field, old sessions parse with `undefined` → `'sawtooth'`) | Default `'sawtooth'` preserves byte-identical output. UI: a `<select>` in Header.svelte `{#if view === 'harmony'}` block for the selected progression slot. |
| C-2 | **`.room(value)` exposed (currently hardcoded)** | F1 | `chordToStrudel` + `melodyLine`; `Chord.room?: number` | Subsumed under C-1's ADR (same sound-attribute model) | Yes (same bump as C-1) | Replace hardcoded `room(0.25/0.3)` with variable; default `0.25/0.3` preserves byte-identity. Low lift once C-1 schema exists. |
| C-3 | **`.decay()` (note length / pluck feel) for chords** | F1 | Same codegen path; `Chord.decay?: number` | Subsumed under C-1's ADR | Yes (same bump) | Gives chords a plucked feel (`decay(0.1).sustain(0)`) vs. sustained. Default absent → byte-identical current output. |
| C-4 | **Dirt-sample bank selector for rhythm layers (`s("bd").bank("RolandTR909")`)** | F2 | `rhythmLayerToStrudelLine` in `layers.ts`; `RhythmLayer.bank?: string`; `agent/schema.ts` (`RhythmLayerSchema`); `lib/persistence.ts` (`SavedRhythmLayerSchema`) | Subsumed under C-1's ADR | Yes (same bump, adding `bank?: z.string().optional()`) | TR808/TR909/etc. already in dirt-samples. Default absent → `s("bd")` byte-identical. |
| C-5 | **Sample index selector for rhythm layers (`bd:n`)** | F2 | `rhythmLayerToStrudelLine`; `RhythmLayer.sampleIndex?: number` | Subsumed | Yes (same bump) | Exposes the dirt-samples multiple variants (`RolandTR909_hh` has 4). Default absent → byte-identical. |
| C-6 | **Expanded built-in rhythm sound set** (add `cr` crash, `rd` ride, `sh` shakers, `cb` cowbell, `tb` tambourine, `perc`, `misc` from dirt-samples to the `Sound` union and `SK_SOUNDS`) | F2 | `Sound` union in `layers.ts`; `SK_SOUNDS` in `schema.ts` and `persistence.ts` | No separate ADR — covered by sound-attribute ADR | Yes (widening `SK_SOUNDS` enum) | Dirt-samples already loaded at init. Old sessions with the 9 existing sounds parse fine; new sounds only appear in new layers. |
| C-7 | **Short non-looping Tonnetz chord preview (F3)** | F3 | New `previewChord(notes, durationSec)` function in `src/audio/strudel.ts` using direct Web Audio API (not the Strudel cyclic scheduler); does NOT touch `nowPlaying` transport state when a session is playing | Yes — Non-looping preview audio path ADR (one-shot fire decoupled from the cyclic scheduler/`nowPlaying`; see ADR Triggers in phase file) | No (no persistence; preview is always ephemeral) | Must not interrupt a running session's `nowPlaying` state. Duration controlled by `AudioContext` scheduling, not Strudel BPM. |
| C-8 | **Sound-change for an already-selected chord on the Pentagrama** | F1 (already-selected chord) | Requires surfacing `_selectedSlotIdx` from `pentagrama-scene.ts` as a reactive store (new `selectedSlotStore`); a `setChordInstrument(index, instrument)` action in `session.ts`; Header.svelte instrument `<select>` responds to the reactive slot index | Subsumed under C-1's ADR (data model handles it; selection mechanism is UI) | No additional bump beyond C-1 | Design question: writable store vs. callback. Resolve via OQ-3. |
| C-9 | **Sound-change for an already-defined rhythm layer** | F2 (already-defined layer) | New `setLayerSound(index, sound)` store action in `session.ts`; a sound selector per layer row in Header.svelte rhythm block (already renders layer list) | None | No additional bump beyond C-6 | Simpler than C-8 — no PIXI reactive store needed; layer index comes from `$sessionStore.rhythm.layers` enumerate. |

---

### Deferred register

These are recorded as future options with reasons. They are NOT proposed for this initiative.

| # | Attribute / Feature | Reason for deferral |
|---|---|---|
| D-1 | `supersaw`, `pulse` waveforms | **Not available in @strudel/web@1.0.3**. Require either a version upgrade (not in scope) or custom `registerSynthSounds` extension. Record for a future version-upgrade phase. |
| D-2 | GM soundfonts (`gm_piano`, `gm_strings`, etc.) | `registerSoundfonts()` commented-out in `@strudel/web/web.mjs`. Enabling adds a ~1-2 MB network fetch at init, changes the init path, requires testing the soundfont atlas load. High operational risk for this initiative. Record for a future audio-enhancement phase. |
| D-3 | `.lpf()` / `.hpf()` as user-controllable per-chord parameters | The existing hardcoded `lpf(1200)` already shapes the sawtooth to be listenable. Exposing both `lpf` and `hpf` as per-chord attributes alongside `instrument`, `room`, `decay` increases the control surface significantly. The "no added complexity" principle argues for deferring until the simpler C-1/C-2/C-3 set is validated. |
| D-4 | Filter envelope (`lpa`, `lpd`, `lps`, `lpq`, `lpenv`) | 4-5 correlated parameters; high interaction complexity. Useful for expressive pads but requires a dedicated envelope UI. Defer to a "sound design" phase. |
| D-5 | FM synthesis (`.fm()` / `.fmh()`) | Medium complexity; good for metallic/bell timbres but not obviously needed for the initial chord-sound selector. Defer to an "extended timbre" phase after C-1 is validated. |
| D-6 | `.pan()` per chord/layer | Stereo placement is an advanced mix parameter. Low impact for initial sound selection; adds a per-element attribute. Defer. |
| D-7 | `.delay()` per chord/layer | Useful but an advanced effect; adds a per-element attribute. Defer with D-6. |
| D-8 | User-supplied samples (load from disk / URL) | Requires a new loading path (`samples({...}, baseURL)`), persistence model for user sample maps, and browser security considerations (CORS, file access). No-assets-in-repo rule means samples never live in the repo. Potential ADR for a future phase if the Pilot wants this capability. |
| D-9 | `.n()` + `.scale()` for pitch selection | Bypasses Orbifold's geometric Tonnetz/voice-leading model — the app's core value. Reject for harmony voice output. Could appear in user's free-code drawer but must not be generated by the harmony engine. |
| D-10 | `.add()` for transposition | Same reason as D-9 — contradicts deterministic voice-leading. |
| D-11 | `rand`, `perlin`, `sine`/`tri` signals as parameter drivers | Non-deterministic: breaks reproducible sessions. Not compatible with the "saved-session bytes unchanged" invariant for existing sessions. Could be a future "live modulation" feature with explicit UI affordance, but not this initiative. |
| D-12 | `.struct()`, `.ribbon()`, `.seg()` as structural tools | Paradigm-shifting: require users to think in event structures or ribbon-of-time units. Increase complexity without direct F1/F2/F3 benefit. |
| D-13 | `.orbit()` assignment | Advanced multi-bus mixing; one reverb/delay per orbit with interaction hazards when patterns share an orbit. Not a sound selector; defer to a "mixing" phase. |
| D-14 | `slider()`, `._pianoroll()`, `._scope()` | REPL-only tools, not applicable to Orbifold's architecture. Permanently out of scope. |
| D-15 | Note-level free placement (`NoteSlot`, pitch-drag) | Already explicitly deferred by Pilot at Phase 10 (CLAUDE.md §Phase 10). Not in this initiative. |

---

### ADR triggers confirmed for Phase 02 scoping

1. **Sound-attribute data model ADR** — Trigger on Phase 02 step 01 (covers C-1 through C-6, C-8, C-9). Defines: typed `instrument?`, `room?`, `decay?`, `bank?`, `sampleIndex?` on `Chord` and `RhythmLayer`; codegen default-preserving pattern; schema bump strategy.
2. **Non-looping preview audio path ADR** — Trigger on Phase 02 step covering F3 (C-7). Defines: `previewChord` function contract, Web Audio API approach, decoupling from `nowPlaying` transport state.
3. **User-sample loading ADR** — Trigger if the Pilot includes user-supplied samples in scope (D-8). **Not proposed for this initiative.**

---

## (d) Open questions for the Pilot

The following OQ-N items must be resolved before Phase 02 scoping. Each item includes options and a one-line Planner recommendation (marked **Rec:**).

---

**OQ-1 — Chord instrument set (F1): which waveforms to expose?**

The confirmed-available waveforms in `@strudel/web@1.0.3` are: `sawtooth` (current default), `sine`, `square`, `triangle`, plus noise types (`white`, `pink`, `brown`).

Options:
- A) Expose the 4 oscillator waveforms only: `sawtooth / sine / square / triangle`.
- B) Expose oscillators + noise types (6 sounds; noise types used as harmonic textures are unusual but valid).
- C) Defer to a later phase and enable `supersaw`/`pulse` after a version bump (out of scope for this initiative).

**Rec:** Option A. The 4 waveforms cover the meaningful timbral range (bright → warm). Noise types (`white`/`pink`) as chord instruments would be confusing to most users and contradicts "no added complexity."

---

**OQ-2 — Rhythm sounds and samples (F2): scope of expansion?**

Options:
- A) Expand `Sound` union with additional dirt-sample names (`cr`, `rd`, `sh`, `cb`, `tb`, `perc`, `misc`) + expose sample-index variant (`bd:n`) + bank selector (TR808/TR909). No user-supplied samples.
- B) Same as A plus user-supplied samples (load from URL or browser file picker; requires ADR + persistence model — deferred D-8).
- C) Sample-index only (minimal change — just expose `bd:n`).

**Rec:** Option A. Adds useful sonic variety (crash, ride, cowbell are standard drum palette) without user-sample complexity. All dirt-samples already loaded at init.

---

**OQ-3 — Changing an already-defined chord's sound (F1): selection surface?**

The phase spec says the control lives "after tonalidad / escala / octava" in the top bar. `_selectedSlotIdx` in `pentagrama-scene.ts` is currently module-level, not a reactive Svelte store.

Options:
- A) Promote `_selectedSlotIdx` to a Svelte writable store (e.g., `selectedSlotIdxStore`); Header.svelte reacts to it and shows the instrument selector when a slot is selected.
- B) The instrument selector in the top bar operates globally (applies to all new chords going forward) — no per-slot retroactive change except via ProgressionStrip tap-to-select + re-apply.
- C) Instrument selector applies to the most-recently-tapped chord (implicit selection via `nowPlaying.source === 'chord'` with the chord index tracked separately).

**Rec:** Option A. Clean reactive architecture; consistent with the Phase 10 slot-editor pattern. Resolves to a single source of truth for "selected slot."

---

**OQ-4 — Tonnetz preview behavior (F3): one-shot mechanism and transport interaction?**

The key constraint: a preview that does not overwrite a running session's `nowPlaying` state.

Options:
- A) Direct Web Audio API: synthesize a short chord burst using `AudioContext.createOscillator()` with scheduled `stop()` after ~0.5 s. Completely decoupled from the Strudel scheduler and `nowPlaying`. Does not require a new Strudel pattern evaluation.
- B) Short Strudel pattern + timed `hush()`: run `evaluate(code.clip(1))` and schedule `hush()` after one bar. Interrupts the running session; clobbers `nowPlaying`.
- C) A secondary Strudel scheduler instance (high complexity; not feasible with `@strudel/web@1.0.3`'s private-scheduler architecture).

**Rec:** Option A. Cleanest decoupling; Web Audio API is already imported via `getAudioContext()` in `src/audio/strudel.ts`. Duration is BPM-independent.

---

**OQ-5 — Secondary timbre/space attributes (F1): which join this initiative?**

From the candidate list, C-2 (`.room()`), C-3 (`.decay()`) are low-lift additions once C-1's schema exists.

Options:
- A) Include C-1 (instrument), C-2 (room), C-3 (decay) in Phase 02. One schema bump covers all three.
- B) C-1 only (instrument). Add C-2/C-3 in Phase 03 if the Pilot approves.
- C) C-1 + C-2 only (instrument + room). Decay is more complex to surface in UI without an envelope panel.

**Rec:** Option A. All three share the same schema bump; implementing all three in one phase avoids a second bump later. C-3 `.decay()` with a simple range slider (e.g., 0.05–1.0 s) is straightforward.

---

**OQ-6 — Data model & schema bump strategy: version bump and backward-read behavior?**

Adding optional attributes (`instrument?`, `room?`, `decay?`, `bank?`, `sampleIndex?`) is additive. Two choices:

Options:
- A) **Bump both `SCHEMA_VERSION` (agent) and `SESSION_SCHEMA_VERSION` (persistence) from 2→3.** Old sessions (v2) fail the `z.literal(3)` check and are **dropped** (existing graceful-degradation behavior — Pilot-confirmed precedent at Phase 09 ADR 0013 D1). No migration function needed. Clean but lossy.
- B) **Add optional fields without a version bump.** Zod `optional()` fields parse successfully from old v2 blobs (they just parse as `undefined`). The version number stays at 2. Risky: if a future breaking change also bumps 2→3, there is no way to distinguish pre-new-fields sessions from post-new-fields ones.
- C) **Bump 2→3 with a migration function** that reads v2 blobs and sets new fields to defaults. Backward-compatible reads. Higher implementation cost.

**Rec:** Option A (precedent from Phase 09) unless the Pilot wants backward-compatible migration (Option C). The drop-on-parse graceful degradation is already the established contract; users will simply start a new session. Document clearly.

---

**OQ-7 — Agent exposure: which new attributes may the agent set?**

Options:
- A) Agent may set `instrument` (on each chord in `progression`), `bank` / `sampleIndex` (on each layer). The agent schema (`HarmonyChordCoreSchema`, `RhythmLayerSchema`) gains the new optional fields. Technical tokens (`sawtooth`, `RolandTR909`, sample names) stay verbatim (OQ-6 precedent from ADR 0017 i18n).
- B) Agent may NOT set new sound attributes — they are UI-only selections (no agent schema change).
- C) Agent may set instrument for harmony only (not rhythm banks/sample indices), to keep the rhythm agent schema minimal.

**Rec:** Option A. The agent already sets `sound` for rhythm layers; extending that to `bank`/`sampleIndex` is natural. Instrument names are technical tokens (verbatim, like `P·L·R` and Euclidean parameters).

---

**OQ-8 — ADR triggers: confirm which ADRs to open at Phase 02?**

The phase file identifies 3 potential ADR triggers. Proposed confirmation:

Options:
- A) Open **two ADRs**: (i) Sound-attribute data model (mandatory for C-1 through C-9), (ii) Non-looping preview audio path (mandatory for C-7/F3). Hold the user-sample ADR for a later phase (D-8 deferred).
- B) Open all three ADRs upfront (including user-sample loading), even if user samples are deferred.
- C) Fold both into a single "sound surface expansion" ADR.

**Rec:** Option A. Two focused ADRs are easier to review. Opening the user-sample ADR preemptively creates scope-creep risk for this initiative.

---

*(Discovery document complete — sections (a) through (d). Ready for Pilot Checkpoint #1.)*
