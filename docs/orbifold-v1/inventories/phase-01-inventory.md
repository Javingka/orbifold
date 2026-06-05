# Phase 01 Inventory — Pure Core Engines + Prototype Parity Tests

**Created:** 2026-06-05
**Phase file:** `docs/orbifold-v1/phases/phase-01.md`

---

## Files that will be touched

| Path | Current purpose | Change planned |
|---|---|---|
| `src/core/theory/pitch.ts` | `// TODO: Phase 1` stub | Implement `NOTE_NAMES`, `NOTE_LOWER`, `noteToPc` |
| `src/core/theory/scales.ts` | `// TODO: Phase 1` stub | Implement `SCALE_INTERVALS`, `Mode`, `computeDiatonic`, `diatonicLookup` |
| `src/core/theory/chords.ts` | `// TODO: Phase 1` stub | Implement `Quality`, `QUAL_INTERVALS`, `triadQuality`, `chordLabel`, `chordPcs`, `chordVoicing` |
| `src/core/theory/tonal-function.ts` | `// TODO: Phase 1` stub | Implement `TonalFunctionLabel`, `TonalFunctionInfo`, `tonalFunction` |
| `src/core/theory/voice-leading.ts` | `// TODO: Phase 1` stub | Implement `circDelta`, `VoiceLeadingResult`, `minimalVoiceLeading` |
| `src/core/theory/neo-riemannian.ts` | `// TODO: Phase 1` stub | Implement `NRLabel`, `nrLabel` |
| `src/core/theory/tonnetz.ts` | `// TODO: Phase 1` stub | Implement `TonnetzNode`, `TonnetzTriangle`, `tonnetzPc`, `computeTonnetzNodes`, `computeTonnetzTriangles` |
| `src/core/rhythm/euclid.ts` | `// TODO: Phase 1` stub | Implement `bjorklund`, `rotate`, `stepsFromHits`, `RSTEPS` |
| `src/core/rhythm/layers.ts` | `// TODO: Phase 1` stub | Implement `Sound`, `RhythmLayer`, `layerAudible`, `rhythmLayerToStrudelLine` |
| `src/core/codegen/strudel.ts` | `// TODO: Phase 1` stub | Implement `tempoWrap`, `chordToStrudel`, `melodyLine`, `rhythmToStrudel`, `buildSession` |
| `src/core/composition/model.ts` | `// TODO: Phase 1` stub | Implement `Block`, `Track`, `Composition` types, `stripComments`, `buildComposition` |
| `tests/placeholder.test.ts` | Single trivial Vitest assertion | Delete in step 01.2 |
| `tests/euclid.test.ts` | Does not exist | Create with `bjorklund`, `rotate`, `stepsFromHits`, `layerAudible`, `rhythmLayerToStrudelLine` parity tests |
| `tests/voice-leading.test.ts` | Does not exist | Create with `circDelta`, `minimalVoiceLeading` parity tests |
| `tests/tonnetz.test.ts` | Does not exist | Create with `chordPcs`, `chordVoicing`, `diatonicLookup`, `tonnetzPc`, `computeTonnetzNodes`, `computeTonnetzTriangles`, `nrLabel` parity tests |
| `tests/codegen.test.ts` | Does not exist | Create with `tempoWrap`, `chordToStrudel`, `melodyLine`, `rhythmToStrudel`, `buildSession`, `buildComposition`, `stripComments` parity tests |
| `docs/orbifold-v1/inventories/phase-01-inventory.md` | Does not exist | Created (this file) |
| `docs/orbifold-v1/handoffs/phase-01-handoff.md` | Does not exist | Created with step 01.1 entry |

Total: 18 files (11 source, 4 test, 1 inventory, 1 handoff, 1 deletion). Within the 15-file soft ceiling — all belong to the single stated purpose of porting pure core engines with parity tests.

---

## Engine-to-file mapping

For each target file: source function(s), exact prototype line ranges, intra-engine dependencies, and citation corrections where the phase file's line ranges were off-by-one.

### `src/core/theory/pitch.ts`
- `NOTE_NAMES` — prototype line 592
- `NOTE_LOWER` — prototype line 593
- `noteToPc` — prototype lines 1674–1681
- Intra-engine deps: none

### `src/core/theory/scales.ts`
- `SCALE_INTERVALS` — prototype lines 697–701
- `ROMAN` constant (used internally by `computeDiatonic`) — prototype line 702
- `computeDiatonic` — prototype lines 720–735 (reads `melState.root` and `melState.mode` as globals; pure function will accept `root: number, mode: Mode` as explicit parameters)
- `diatonicLookup` — prototype lines 737–740 (line 736 is a comment, included in port; phase file cites 736–740, which is correct when including the comment)
- Intra-engine deps: `pitch.ts` (NOTE_NAMES), `chords.ts` (triadQuality, chordLabel, chordPcs), `tonal-function.ts` (tonalFunction)

### `src/core/theory/chords.ts`
- `triadQuality` — prototype lines 703–710
- `QUAL_INTERVALS` — prototype line 742
- `chordLabel` — prototype lines 743–745
- `chordPcs` — prototype lines 746–748
- `chordVoicing` — prototype lines 750–757 (comment on line 749 included in port; phase file cites 749–757, which includes the comment line — correct)
  - **Citation note:** `chordVoicing` prototype body uses `octave || melState.octave` fallback (line 751). The pure engine will drop the global fallback; `octave` is an explicit required parameter per the resolved open decision (OD-6 below). The `|| melState.octave` branch is removed in the port.
- Intra-engine deps: `pitch.ts` (NOTE_NAMES)

### `src/core/theory/tonal-function.ts`
- `tonalFunction` — prototype lines 711–716
- Intra-engine deps: none

### `src/core/theory/voice-leading.ts`
- `circDelta` — prototype lines 777–779
- `perms3` — prototype line 780 (internal helper; not exported)
- `minimalVoiceLeading` — prototype lines 781–789
- Intra-engine deps: none

### `src/core/theory/neo-riemannian.ts`
- `nrLabel` — prototype lines 1238–1249
- Intra-engine deps: none (takes `srcRoot, srcQual, nbrRoot, nbrQual` — pure pitch-class logic)

### `src/core/theory/tonnetz.ts`
- Pure data generation logic extracted from `buildTonnetz` (prototype lines 947–991):
  - `tonnetzPc(i, j)` — implements `((7*i + 4*j) % 12 + 12) % 12` per prototype line 966
  - `computeTonnetzNodes(iRange, jRange)` — lattice generation, prototype lines 960–970 (the node-generation loop, stripped of pixel coordinate computation)
  - `computeTonnetzTriangles(nodes, root, mode)` — triangle generation, prototype lines 979–991 (the `mkTri` calls, stripped of centroid pixel coords stored in `cx/cy`)
  - NR-labeling context: prototype lines 1234–1249 (nrLabel used in `computeNR`, but `nrLabel` itself is ported to `neo-riemannian.ts`)
- **Citation correction:** Phase file §Tonnetz says "lines 946–991 and 1234–1279". The range 1234–1279 is `computeNR`, which is a rendering function. The pure data relevant part is only `nrLabel` at 1238–1249 (ported to `neo-riemannian.ts`). The pure node/triangle generation lives entirely within 947–991.
- Intra-engine deps: `./pitch`, `./chords` (chordPcs, chordLabel), `./scales` (diatonicLookup), `./tonal-function` (indirectly via diatonicLookup)

### `src/core/rhythm/euclid.ts`
- `RSTEPS` constant — prototype line 794
- `bjorklund` — prototype lines 796–811
- `rotate` — prototype line 812
- `stepsFromHits` — prototype line 813 (uses global `RSTEPS`; pure function exports `RSTEPS` and uses it explicitly)
- Intra-engine deps: none

### `src/core/rhythm/layers.ts`
- `layerAudible` — prototype lines 820–823 (reads `rhythmLayers` global for solo-check; pure function accepts `allLayers` as explicit parameter)
- `rhythmLayerLines` — prototype lines 824–832 (iterates global `rhythmLayers`; the per-layer rendering logic at lines 828–829 is extracted into `rhythmLayerToStrudelLine(layer: RhythmLayer): string`)
- Intra-engine deps: `euclid.ts` (none at import time; `RhythmLayer.euclid` is a string in the pure engine)

### `src/core/codegen/strudel.ts`
- `tempoWrap` — prototype lines 605–608
- `chordToStrudel` — prototype lines 758–764 (**citation correction:** phase file cites 758–763, but the closing brace is on line 764)
- `melodyLine` — prototype lines 766–774 (**citation correction:** phase file cites 765–773; line 765 is a comment included in the port context, and the closing brace is on line 774)
- `rhythmToStrudel` — prototype lines 833–836
- `buildSession` — prototype lines 1470–1476
- **Note:** `buildSession` does NOT include `buildComposition`. `buildComposition` is in `composition/model.ts`.
- Intra-engine deps: `chords.ts` (Quality, chordVoicing), `rhythm/layers.ts` (RhythmLayer, layerAudible, rhythmLayerToStrudelLine), `rhythm/euclid.ts` (RSTEPS — indirectly via RhythmLayer shape)

### `src/core/composition/model.ts`
- Types: `Block`, `Track`, `Composition` — from kickoff §5 domain model
- `stripComments` — prototype lines 1936–1938
- `buildComposition` — prototype lines 2054–2065
- Intra-engine deps: none (operates on string `code` fields in `Block`; no theory imports needed)

---

## Existing behavior to preserve

- `tests/placeholder.test.ts` is the only test file; it must pass until step 01.2 deletes it. Phase 00's final validation state (`pnpm test` → 1 passed) must not be broken between step 01.1 commit and step 01.2.
- All five Phase 00 tooling commands (`tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm dev`) must remain green throughout this phase.
- No existing `src/core/**` stub file content (AGPL-3.0 header) may be lost — all implementations must carry the AGPL-3.0 SPDX header.
- The `src/core/**` modules must import nothing from DOM, PIXI, or Svelte.

---

## New behavior to introduce

- Pure `bjorklund(k, n)` and `rotate(arr, r)` exportable and callable in Node
- Pure `minimalVoiceLeading(pcsA, pcsB)` returning `{moves, size, perm}` byte-identical to prototype
- Pure `nrLabel(srcRoot, srcQual, nbrRoot, nbrQual)` returning `'P' | 'R' | 'L' | null`
- Pure `tonnetzPc(i, j)` implementing `(7i + 4j) mod 12`
- Pure `computeTonnetzNodes` and `computeTonnetzTriangles` (no pixel coords — render layer concern)
- Pure `chordToStrudel`, `melodyLine`, `rhythmToStrudel`, `buildSession`, `buildComposition` producing byte-identical Strudel strings to the prototype for the same inputs
- `pnpm test` runs four real parity-test files and all pass green

---

## Acceptance ID coverage plan

| Acceptance ID | Behavior | Planned test type | Planned test file | Step that covers it |
|---|---|---|---|---|
| A-01-01 | `bjorklund(k, n)` returns byte-identical step arrays to prototype | unit | `tests/euclid.test.ts` | 01.4 |
| A-01-02 | `minimalVoiceLeading(pcsA, pcsB)` returns exact `{size, moves, perm}` | unit | `tests/voice-leading.test.ts` | 01.2 |
| A-01-03 | `nrLabel` returns P/R/L/null matching prototype for all six cases | unit | `tests/tonnetz.test.ts` | 01.3 |
| A-01-04 | `tonnetzPc(i, j)` implements `(7i+4j) mod 12` exactly | unit | `tests/tonnetz.test.ts` | 01.3 |
| A-01-05 | `chordToStrudel` and `melodyLine` produce byte-identical Strudel strings | unit | `tests/codegen.test.ts` | 01.5 |
| A-01-06 | `rhythmToStrudel` produces byte-identical `stack(...)` strings | unit | `tests/codegen.test.ts` | 01.5 |
| A-01-07 | `buildComposition` pads shorter tracks with `silence` correctly | unit | `tests/codegen.test.ts` | 01.5 |
| A-01-08 | All `src/core/**` modules have zero DOM/PIXI/Svelte imports | proxy:static-analysis | grep command | 01.2 (enforced each step) |
| A-01-09 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all exit 0 | live-system | command execution | 01.5 (confirmed each step) |

---

## Tests to add or modify

- `tests/euclid.test.ts` (new) — `bjorklund` (8 cases including edge cases and tresillo), `rotate` (3 cases), `stepsFromHits` (2 cases), `layerAudible` (2 cases), `rhythmLayerToStrudelLine` (2 cases)
- `tests/voice-leading.test.ts` (new) — `circDelta` (3 cases), `minimalVoiceLeading` (3 chord pairs including C maj → C min P transform)
- `tests/tonnetz.test.ts` (new) — `chordPcs` (2 cases), `chordVoicing` (2 cases), `diatonicLookup` (2 spot-checks), `tonnetzPc` (5 cases), `computeTonnetzNodes` (spot-checks), `computeTonnetzTriangles` (upward/downward triangle shapes), `nrLabel` (6 cases)
- `tests/codegen.test.ts` (new) — `tempoWrap` (2 cases), `chordToStrudel` (3 cases), `melodyLine` (2 cases), `rhythmToStrudel` (2 cases), `buildSession` (smoke test), `buildComposition` (2 cases including silence-padding), `stripComments` (1 case)
- `tests/placeholder.test.ts` — delete in step 01.2

---

## Open decisions surfaced

**Resolution required before step 01.2.** These cannot be silently inherited:

**OD-1: `chordToStrudel` — `chordMode` parameter**
The prototype `chordToStrudel(rootPc, qual, gain)` reads module-level `chordMode` (`'chord' | 'arp'`). In the pure engine this must be an explicit parameter.
- Candidates: (A) fourth param `chordToStrudel(rootPc, qual, gain, chordMode)` | (B) split into `chordToStrudelBlock` / `chordToStrudelArp` | (C) options object `{chordMode}`
- Recommendation: **A** — minimal change, direct port, preserves function identity. The phase file (step 01.5) already specifies `chordToStrudel(rootPc: number, qual: Quality, gain: number | null, chordMode: 'chord' | 'arp', octave: number)`.

**OD-2: `melodyLine` — explicit signature**
The prototype `melodyLine()` reads `melState.progression` and `chordMode` as globals. Pure engine must thread them as parameters.
- Candidates: (A) `melodyLine(progression, chordMode, octave)` | (B) `melodyLine(melState, chordMode)` (pass the whole state slice)
- Recommendation: **A** — fine-grained, matches phase file step 01.5 spec: `melodyLine(progression: ReadonlyArray<{rootPc, qual, gain?}>, chordMode, octave)`.

**OD-3: `buildSession` — explicit signature**
The prototype `buildSession()` calls `rhythmLayerLines()` and `melodyLine()` using globals.
- Candidates: (A) `buildSession(layers, progression, chordMode, octave)` | (B) pass a full session state object
- Recommendation: **A** — matches phase file step 01.5 spec.

**OD-4: `buildComposition` — explicit signature and `'silence'` literal**
The prototype `buildComposition()` uses `blocks` and `tracks` globals and pads with the string `silence` (a bare Strudel keyword, not quoted in the `arrange()` call, i.e., `[${tb-sum}, silence]`).
- Candidates for signature: (A) `buildComposition(blocks, tracks)` | (B) pass a `Composition` object
- `silence` literal: the prototype emits `silence` as an unquoted identifier inside the Strudel string: `` `  [${tb-sum}, silence]` ``. This must be preserved byte-for-byte (per CLAUDE.md invariant).
- Recommendation: **(A)** for signature, confirm `'silence'` literal matches prototype exactly.

**OD-5: Tonnetz node separation — no pixel coordinates in pure engine**
The prototype `buildTonnetz()` computes pixel `x, y` coordinates alongside `pc` values and stores them in `tonnetzNodes`. The pure engine should only carry `{i, j, pc}` (lattice position and pitch class).
- Candidates: (A) `TonnetzNode = {i, j, pc}` only (pixel coords in render layer) | (B) include pixel coords in pure engine
- Recommendation: **A** — separation of concerns, consistent with the phase file's `computeTonnetzNodes(iRange, jRange) => TonnetzNode[]` and `CLAUDE.md` "engines in `core/**` have NO DOM/PIXI/Svelte imports."

**OD-6: `chordVoicing` — `octave` parameter**
The prototype `chordVoicing(rootPc, qual, octave)` has `octave` as a parameter but falls back to `melState.octave` global if not passed (`const oct = octave || melState.octave`). In the pure engine the fallback must be removed; `octave` must be a required explicit parameter.
- Candidates: (A) `chordVoicing(rootPc, qual, octave: number)` required | (B) keep optional with a default
- Recommendation: **A** — required parameter, no global dependency.

**OD-7: `nrLabel` return type**
The prototype `nrLabel(sr, sq, nr, nq)` returns `'P' | 'R' | 'L' | null`. The function is already pure (no globals). The only question is the TypeScript exported type.
- Candidates: (A) return type `'P' | 'R' | 'L' | null` | (B) return type `NRLabel | null` where `NRLabel = 'P' | 'R' | 'L'`
- Recommendation: **B** — exported `NRLabel` type is more useful to callers. Matches phase file step 01.3 spec.

---

## Golden-value generation procedure

All Phase 01 functions are pure JS with no DOM or PIXI dependencies. The golden-value strategy is to extract the prototype functions into a throwaway Node script (e.g., `scripts/extract-golden.mjs` or inline `node -e`) and run them to capture byte-exact outputs. The extraction script lives outside `src/`, needs no new runtime dependency, and need not be committed unless the Dev judges it useful as a reproducible fixture generator.

### Node-generated (all pure functions)

| Function | Prototype lines | Node-extractable? |
|---|---|---|
| `bjorklund` | 796–811 | Yes — pure algorithm, no DOM |
| `rotate` | 812 | Yes |
| `stepsFromHits` | 813 | Yes (requires `RSTEPS=16` constant) |
| `layerAudible` | 820–823 | Yes (pure logic; pass mock layers array) |
| `rhythmLayerLines` per-layer body | 828–829 | Yes |
| `circDelta` | 777–779 | Yes |
| `minimalVoiceLeading` | 781–789 (with perms3 at 780) | Yes |
| `noteToPc` | 1674–1681 | Yes |
| `triadQuality` | 703–710 | Yes |
| `chordPcs` | 746–748 (with QUAL_INTERVALS at 742) | Yes |
| `chordVoicing` | 750–757 (with NOTE_NAMES + QUAL_INTERVALS) | Yes (pass octave=3 explicitly; remove `|| melState.octave` before running) |
| `diatonicLookup` | 737–740 (with computeDiatonic, triadQuality, tonalFunction) | Yes (pass root=0, mode='major' explicitly) |
| `tonnetzPc` | 966 (formula inline in buildTonnetz) | Yes (trivial formula) |
| `computeTonnetzNodes` (pure data portion) | 960–970 | Yes (extract loop, pass iRange/jRange, omit pixel pos() call) |
| `computeTonnetzTriangles` (pure data portion) | 979–991 | Yes (extract mkTri logic, omit cx/cy centroid) |
| `nrLabel` | 1238–1249 | Yes — pure function |
| `tempoWrap` | 605–608 | Yes (pass bpm as explicit param) |
| `chordToStrudel` | 758–764 | Yes (pass chordMode explicitly; remove global dependency) |
| `melodyLine` | 766–774 | Yes (pass progression + chordMode + octave explicitly) |
| `rhythmToStrudel` | 833–836 | Yes |
| `buildSession` | 1470–1476 | Yes |
| `buildComposition` | 2054–2065 | Yes |
| `stripComments` | 1936–1938 | Yes |

### Hand-traced fallback

None. All Phase 01 functions are DOM-free and can be run in Node. The only caveat is that a few functions read globals (`melState`, `chordMode`, `rhythmLayers`) — these globals must be set before extraction. The Node script will define the required globals explicitly before calling each function, producing byte-identical outputs.

---

## Source-of-truth check

No cross-source data consumption in this phase. Phase 01 reads only from `reference/orbifold.html` (the prototype, read-only) and writes pure TypeScript engine files. No backend, no API, no shared state schema consumed from another module. The Zod session schema and agent schema are Phase 6 scope.

One intra-phase dependency to flag: `diatonicLookup` in the pure engine accepts `(root: number, mode: Mode)` parameters, but the prototype's `computeDiatonic` reads `melState.root` and `melState.mode`. The key format it produces is `"${rootPc}:${qual}"` (e.g., `"0:maj"`, `"7:min"`). The planned `tonnetz.ts` consumer will call `diatonicLookup(root, mode)` — shape alignment confirmed.

---

## New dependencies needed

None. This phase ports pure JS algorithms to TypeScript. No new runtime dependencies are expected. If the Dev finds a need for any runtime dependency during implementation (e.g., a math library), a `missing-decision` blocker will be written and implementation will stop.

`pnpm-lock.yaml` need not change. No `pnpm add` calls are expected in this phase.

---

## Environment, CI, build, or deployment changes needed

None. Phase 01 adds source files within the existing `src/core/**` and `tests/**` directories. Vite's build is unaffected (no new entry points). Vitest picks up test files automatically by the `tests/**/*.test.ts` glob in `vitest.config` (or Vitest default). No CI, no new scripts.

---

## Decisions Register check

**Active entry: "Exact dependency version pinning"** — applies. No new runtime deps are expected in Phase 01. If any dep need arises, the Dev will write a `missing-decision` blocker per the Register entry and the phase spec. The existing pinned dependencies (`pixi.js`, `@strudel/web`, all devDeps) are unchanged.

No other active Register entries. No conflicts detected.

---

## Prototype parity note

The phase file requires that every step porting prototype logic cite exact prototype line ranges and demonstrate behavioral fidelity. The line-range verification performed during this inventory found two minor off-by-one discrepancies between the phase file's citations and the actual prototype lines:

1. **`chordToStrudel`**: phase file cites "lines 758–763" — actual closing brace is on line 764. Port should include line 764.
2. **`melodyLine`**: phase file cites "lines 765–773" — line 765 is the comment line preceding the function (not the function body), and the closing brace is on line 774. The function itself starts at line 766 and ends at line 774. Cite 765–774 in the handoff (including comment).

These are cosmetic citation discrepancies and do not affect implementation. No blocking decision required.

---

## Risks specific to this phase

**`computeDiatonic` → pure signature** — The prototype `computeDiatonic()` reads `melState.root` and `melState.mode`. The pure port accepts `(root: number, mode: Mode)`. Because `harmonic:minor` mode has 7 scale degrees but `SCALE_INTERVALS['harmonic:minor']` produces length-7, the `ints.length !== 7` guard in the prototype will pass for all 8 declared modes. Verify during implementation that the `'harmonic:minor'` entry in `SCALE_INTERVALS` is length 7 (it is: `[0,2,3,5,7,8,11]` — 7 intervals). Low risk.

**`chordVoicing` octave wrap** — The prototype's `oct + Math.floor((rootPc+iv)/12)` logic produces octave wraps for notes above C in the same octave as the root. This is exercised by the A minor voicing case (A3, C4, E4). The golden-value Node run will capture this exactly.

---

## Pilot review

The Pilot approves before step 01.2 begins. Resolution of all seven open decisions (OD-1 through OD-7) above is required before implementation proceeds. The phase file's step 01.2 already implies resolutions for OD-1, OD-2, OD-3, OD-4, OD-5, OD-6, and OD-7 — these are surfaced here as formal items requiring explicit Pilot confirmation (or revision).
