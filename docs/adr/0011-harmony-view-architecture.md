# ADR 0011 — Harmony-view architecture

- **Status:** Accepted
- **Date:** 2026-06-11
- **Initiative / Phase:** orbifold-v2 / Phase 05 (step 05.2)
- **Deciders:** Pilot (Javier)

## Context

Phases 06 and 07 will introduce a harmony view — a visual representation of the active progression's three voices over time. The harmony view has two rendering modes:

1. **Treble-clef staff view** (Phase 06): a linear timeline where each voice is drawn on a standard treble-clef staff, color-coded per voice, with a playhead that advances in sync with the global clock.
2. **Orbital concentric-ring view** (Phase 07): a PIXI canvas showing three concentric rings (one per voice), mirroring the aesthetic of the rhythm orbit rails, with a linear-to-orbital morph transition.

Both rendering modes share the same underlying data. Three pure TypeScript engines in `src/core/harmony/` drive all rendering:

- **`voice-tracks.ts`** — computes continuous voice tracks from the progression: assigns each of the three voices a note at every chord boundary, using the minimal voice-leading permutation to ensure smooth voice continuity across chord changes.
- **`staff-map.ts`** — maps note names (in the format produced by `chordVoicing`) to treble-clef staff coordinates: vertical position in half-steps from C4, sharp accidental flag, and ledger-line positions.
- **`time-map.ts`** — maps cycle positions (floating-point bar index) to rendering coordinates: pixel x in linear mode, or radian angle in orbital mode.

Four architectural decisions must be recorded before implementation begins. These are locked Pilot decisions; this ADR does not deliberate them.

---

## Decisions

### D1 — Harmony orbit period = full progression loop

One full revolution of the harmony orbit equals the total duration of the active progression in Strudel cycles:

```
totalCycles = sum(ch.bars ?? 1)  for all chords in the progression
```

Bar and cycle marks are drawn on the ring at the appropriate angular positions. The rhythm orbit retains its 1-revolution-per-1-bar period; the two orbits spin at intentionally different rates.

**Justification:** The rhythm orbit visualises a repeating groove pattern — one revolution corresponds to one bar, because the rhythm loop is one bar long. The harmony orbit visualises a chord progression — one revolution corresponds to the full progression loop, because the progression is what cycles at that timescale. Coupling the two rates (making the harmony orbit also one-revolution-per-bar) would either compress the harmony orbit into one bar (making individual chord durations invisible) or dilate the rhythm orbit to match the progression length (breaking its intuitive one-bar read). The two-rate design reflects how layered music actually works: the rhythm repeats N times while the harmony progresses once through its loop. `totalCycles` is the denominator in the `time-map.ts` orbital formula; `time-map.ts` carries this constant as a parameter passed by the caller, not hardcoded.

### D2 — ProgressionStrip preserved as duration/gain editor

The ProgressionStrip (introduced in Phase 03, ADR 0010) remains the authoritative editor for per-chord duration and gain. The staff view and the orbital view are read-oriented visualisations: they render the current store state and update when the store changes. They do not expose any editing affordance for duration or gain.

**Justification:** The ProgressionStrip was purpose-built for chord duration editing in Phase 03. It has an absolute-pixel DAW-style ruler, drag-to-resize handles, a bar ruler with gridlines, and persisted state. Duplicating editing controls in the new views would create two writeable surfaces for the same state, requiring conflict-resolution logic and increasing the risk of state inconsistency. The new views are downstream consumers of the store, not producers. This is the standard Svelte store pattern used throughout the app.

### D3 — Treble clef with ledger lines; no grand staff

The harmony view uses a single treble-clef staff. Ledger lines above and below the five staff lines are drawn as needed for notes outside the E4–F5 staff span.

The octave parameter (range 2–5, user-selectable in the UI) controls the register of `chordVoicing(rootPc, qual, octave)`. At the default octave 3, voicings land in the C3–G3 range — below the treble staff (treble staff bottom line is E4; middle C is C4, one ledger line below). Ledger lines accommodate this without clef switching. As the octave parameter increases toward 4–5, voicings rise onto and above the staff.

No bass clef. No clef switching. No grand staff.

**Justification:** Triads fit within a compact vertical window even with ledger lines. For a three-voice instrument whose voicings never exceed a range of roughly two octaves (the triads from `chordVoicing` span at most a major sixth plus octave adjustment), a grand staff doubles the vertical footprint and adds a clef-switching rule without providing additional information. Ledger lines are the standard notation mechanism for notes just outside the staff; the expected register range of octaves 2–5 produces at most five ledger lines below or two above the treble staff, which is visually tractable. A single clef is also algorithmically simpler: `staff-map.ts` has one coordinate system, not two.

### D4 — Voice continuity via existing `minimalVoiceLeading` permutation

The three voices (voice-0, voice-1, voice-2) are tracked continuously across chord changes using the permutation returned by `minimalVoiceLeading()` in `src/core/theory/voice-leading.ts`.

Assignment rules:

- **First chord:** voices are assigned in ascending pitch order. `chordVoicing(rootPc, qual, octave)` already returns notes in ascending order (root, third, fifth with octave wrapping), so voice-0 = index 0 (lowest), voice-1 = index 1 (middle), voice-2 = index 2 (highest).
- **Each subsequent chord:** call `minimalVoiceLeading(prevPcs, nextPcs)` where `prevPcs` and `nextPcs` are the pitch-class 3-tuples of the previous and next chords. The returned `perm` maps voice `i` to pitch class `nextPcs[perm[i]]` in the new chord. Voice `i` inherits continuity from the previous chord: it was assigned `prevPcs[i]` and now moves to `nextPcs[perm[i]]` with the minimal signed semitone displacement.

**Justification:** `minimalVoiceLeading` already encodes the orbifold geometry — it picks the permutation that minimises `Σ|circDelta(prevPcs[i], nextPcs[perm[i]])|` over all six permutations of three voices. Reusing it for visual voice continuity ensures that the voice tracks in the harmony view honour the same minimality principle that governs the audio codegen's note ordering. No separate voice-assignment algorithm is needed; the existing engine is authoritative. This is consistent with the project's mandate to express musical relationships through the orbifold geometry.

---

## Consequences

1. **`src/core/harmony/` is a new subdirectory with no DOM, PIXI, or Svelte imports.** This is consistent with the `src/core/**` invariant established at kickoff (§6): engines under `src/core/` are pure TypeScript with no renderer dependencies. A-05-11 (the no-import invariant) must be maintained by all three new files.

2. **The three engines are unit-testable without a browser.** Because `voice-tracks.ts`, `staff-map.ts`, and `time-map.ts` have no DOM, PIXI, or Svelte imports, Vitest can run their tests in a Node environment without a headless browser. This keeps the test suite fast and CI-reproducible.

3. **`PX_PER_CYCLE = 48` is a coordination point between `time-map.ts` and `ProgressionStrip.svelte`.** The `time-map.ts` module exports `PX_PER_CYCLE = 48`, which must match the absolute-pixel grid constant that `ProgressionStrip.svelte` uses for its DAW-style ruler (introduced in Phase 03, ADR 0010 amendment). If Phase 03's constant ever changes, `time-map.ts` must be updated in the same commit. This is a deliberate duplication-as-coordination-point: the rendering layer imports from `time-map.ts`, not from `ProgressionStrip.svelte`, to avoid a Svelte dependency in a pure engine module. The constant value `48` must be kept in sync manually.

4. **Sharp spellings only from `NOTE_NAMES`.** `chordVoicing` generates note names using `NOTE_NAMES` from `src/core/theory/pitch.ts`, which contains only sharp spellings (`C#`, `D#`, `F#`, `G#`, `A#`). Flat accidentals (`Bb`, `Eb`, `Ab`, `Db`, `Gb`) will never appear in voicings produced by `chordVoicing`. `staff-map.ts` handles flat input gracefully (for robustness) but it is not a production path. The `accidental` field in `StaffPosition` will only ever be `'#'` or `''` for production voicings.

5. **Voice-track computation is pure and stateless.** `computeVoiceTracks(progression, octave)` takes the full progression array and returns the complete set of voice tracks in one call. There is no incremental update, no mutable state, and no side effects. The rendering layers call it on every store change and re-render. This design favours correctness over incremental performance; for progressions up to the 8-chord maximum supported by the UI, the computation is negligible.
