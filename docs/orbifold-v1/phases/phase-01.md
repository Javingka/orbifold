# Phase 01 — Pure Core Engines + Prototype Parity Tests

**Purpose:** Port all pure logic from `reference/orbifold.html` into the `src/core/**` stub files and prove behavioral fidelity with Vitest tests asserting byte-identical outputs against the prototype for every engine.
**Gate:** Phase 00 is complete (all five tooling commands pass clean, full `src/core/**` stub tree in place, `pnpm-lock.yaml` committed, Decisions Register has exactly one active entry: exact dependency version pinning).
**Expected phase result:** `src/core/theory/**`, `src/core/rhythm/**`, `src/core/codegen/strudel.ts`, and `src/core/composition/model.ts` are fully implemented with no DOM/PIXI/Svelte imports; `pnpm test` runs a suite of parity tests covering `bjorklund`, `minimalVoiceLeading` (exact Σ and signed deltas), P·L·R transforms, and `chordToStrudel` / `melodyLine` / `rhythmToStrudel` / `buildComposition` producing byte-identical Strudel strings to those the prototype emits for the same inputs; `tsc --noEmit`, `pnpm lint`, and `pnpm test` all pass clean.

---

## Phase classification note

This phase delivers no operator-facing runtime (no audio, no UI). It is a pure-engine (library) phase. The `operability` acceptance criterion is therefore: `pnpm test` passes green from a fresh clone, covering all prototype-parity cases. There is no Vite dev-server behavior to verify beyond the already-green Phase 00 baseline.

---

## Step 01.1 — Inventory

PROMPT → Read `CLAUDE.md`, `references/methodology.md`, `references/dev-role.md`, `references/inventory-template.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-01.md`, `ORBIFOLD_KICKOFF.md §5–6`, and `reference/orbifold.html` (lines 592–2065, the full JS section). Produce `docs/orbifold-v1/inventories/phase-01-inventory.md` following the inventory template exactly. Do NOT write any source code. Stop after committing the inventory file.

The inventory must address:

**Engine-to-file mapping.** For each target file, list the source function(s) and exact line ranges in `reference/orbifold.html` that will be ported, plus any intra-engine dependencies (e.g., `chords.ts` depends on `pitch.ts`):

- `src/core/theory/pitch.ts` — `NOTE_NAMES`, `NOTE_LOWER` (lines 592–593), `noteToPc` (lines 1674–1681). No intra-engine deps.
- `src/core/theory/scales.ts` — `SCALE_INTERVALS` (lines 697–701), `computeDiatonic` (lines 720–735), `diatonicLookup` (lines 736–740). Depends on `pitch.ts` (NOTE_NAMES), `chords.ts` (triadQuality, chordLabel, chordPcs).
- `src/core/theory/chords.ts` — `QUAL_INTERVALS` (line 742), `triadQuality` (lines 703–710), `chordLabel` (lines 743–745), `chordPcs` (lines 746–748), `chordVoicing` (lines 749–757). Depends on `pitch.ts`.
- `src/core/theory/tonal-function.ts` — `tonalFunction` (lines 711–716). No external deps (degree → label only).
- `src/core/theory/voice-leading.ts` — `circDelta` (lines 777–779), `perms3` (line 780), `minimalVoiceLeading` (lines 781–789). No external deps.
- `src/core/theory/neo-riemannian.ts` — `nrLabel` (lines 1238–1249). Depends on pitch classes only (no external imports needed if the function is pure rootPc/qual logic).
- `src/core/theory/tonnetz.ts` — Tonnetz node generation logic: `pc(i,j) = (7i + 4j) mod 12` as a pure function; triangle generation (major/minor assignment from vertex ordering per lines 979–991). Depends on `chords.ts` (chordPcs, chordLabel), `scales.ts` (diatonicLookup), `tonal-function.ts`.
- `src/core/rhythm/euclid.ts` — `bjorklund` (lines 796–811), `rotate` (line 812), `stepsFromHits` (line 813). No external deps.
- `src/core/rhythm/layers.ts` — `RhythmLayer` type, `layerAudible` (lines 820–823), `rhythmLayerLines` (lines 824–832). Depends on `euclid.ts`.
- `src/core/codegen/strudel.ts` — `tempoWrap` (lines 605–608), `chordToStrudel` (lines 758–763), `melodyLine` (lines 765–773), `rhythmToStrudel` (lines 833–836), `buildSession` (lines 1470–1476), `buildComposition` (lines 2054–2065). Depends on `chords.ts`, `rhythm/layers.ts`, `rhythm/euclid.ts`.
- `src/core/composition/model.ts` — TS types for `Block`, `Track`, `Composition` (from kickoff §5); `stripComments` (lines 1936–1938). No pure runtime logic beyond the types and one utility.

**Ambiguous or edge-case behaviors to flag** (items requiring Pilot decision before implementation):

1. `chordToStrudel` uses the module-level `chordMode` variable (`'chord'` | `'arp'`) to decide comma vs. space separator. In the pure engine, this must be an explicit parameter, not a global. Flag: should `chordToStrudel(rootPc, qual, gain, chordMode)` accept `chordMode` as a fourth parameter, or should the function be split into two (`chordToStrudelBlock` / `chordToStrudelArp`)? The Pilot decides before step 01.3.

2. `melodyLine` similarly reads `chordMode` as a global and `melState.progression` as a global. The pure function signature must accept both as parameters. Flag: confirm the exact signature: `melodyLine(progression, chordMode)` — Pilot confirms or revises before step 01.3.

3. `buildSession` combines `rhythmLayerLines()` and `melodyLine()` — both depend on state that must be threaded as parameters in the pure engine. Flag: confirm `buildSession(layers, progression, chordMode)` as the signature. Pilot confirms or revises.

4. `buildComposition` depends on `blocks` and `tracks` globals and calls `silence` (a Strudel keyword) for padding. Flag: confirm `buildComposition(blocks, tracks)` as the signature, and that `'silence'` is the literal string to use in the `arrange()` padding (per CLAUDE.md invariant). Pilot confirms.

5. `tonnetz.ts` as a pure engine: the prototype's `buildTonnetz` tightly couples node generation to PIXI rendering. The pure engine should only compute `TonnetzNode[]` and `TonnetzTriangle[]` arrays (geometry as pixel coordinates is render-layer concern). Flag: `tonnetz.ts` exports `computeTonnetzNodes(iRange, jRange) => TonnetzNode[]` and `computeTonnetzTriangles(nodes) => TonnetzTriangle[]` where nodes carry `{i, j, pc}` but NOT pixel `{x, y}` coordinates (those belong to the render layer). Pilot confirms this separation before step 01.2.

6. `chordVoicing` uses `melState.octave` (a global). In the pure engine: `chordVoicing(rootPc, qual, octave)` — octave is an explicit parameter. Pilot confirms before step 01.3.

7. `nrLabel` in the prototype returns `'P' | 'R' | 'L' | null`. The pure function is already stateless (takes `sr, sq, nr, nq`). No ambiguity, but confirm that the exported type is `'P' | 'R' | 'L' | null`. Pilot confirms or revises.

**Test strategy to outline.** The inventory must name the test files that will be created (`tests/euclid.test.ts`, `tests/voice-leading.test.ts`, `tests/tonnetz.test.ts`, `tests/codegen.test.ts`) and describe a golden-value generation procedure: the Dev extracts the prototype's pure functions from `reference/orbifold.html` into a throwaway Node script (e.g., `scripts/extract-golden.mjs` or an inline `node -e`) and executes them to capture byte-exact outputs. The inventory must list which functions will be golden-generated via Node execution vs. (fallback) hand-traced, with a one-line reason for any function that genuinely cannot run headless. The vast majority of Phase 01 functions — `bjorklund`, `rotate`, `stepsFromHits`, `circDelta`, `minimalVoiceLeading`, `noteToPc`, `triadQuality`, `chordPcs`, `chordVoicing`, `tonnetzPc`, `computeTonnetzNodes`, `computeTonnetzTriangles`, `nrLabel`, `tempoWrap`, `chordToStrudel`, `melodyLine`, `rhythmToStrudel`, `buildSession`, `buildComposition`, `stripComments` — are pure JS with no DOM/PIXI dependency and can be extracted and run in Node. Hand-tracing is permitted only as a documented fallback.

**New dependencies check.** This phase ports pure JS algorithms to TypeScript. No new runtime dependencies are expected. If the Dev finds a need for a runtime dep (e.g., a math library), it must surface a `missing-decision` blocker and stop.

**`tests/placeholder.test.ts` fate.** This file must be removed in step 01.2 (first implementation step) and replaced by real engine tests.

Implementation requirements:
- Read the inventory template before writing.
- List all files to be created or modified (26 files: 10 `src/core/**` implementations, 4 test files, the inventory itself, and the handoff update — plus the `tests/placeholder.test.ts` deletion).
- List the seven ambiguous behaviors as open decisions to be resolved by the Pilot before step 01.2 begins.
- Confirm no new runtime deps are needed.
- Confirm `pnpm-lock.yaml` need not change (no `pnpm add` calls in this phase).

Validation:
- `docs/orbifold-v1/inventories/phase-01-inventory.md` exists and follows the template.

Expected result:
- Inventory file committed. The seven flagged ambiguities are listed as open decisions requiring Pilot resolution before step 01.2.

CHECKPOINT → Commit message:
`docs(core): Phase 01 step 01.1 — phase-01 inventory`

---

## Step 01.2 — Theory engines: pitch, scales, chords, tonal-function, voice-leading

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/inventories/phase-01-inventory.md`, `docs/orbifold-v1/phases/phase-01.md`, and the resolved Pilot decisions from the inventory checkpoint. Then implement the five theory modules and their parity tests.

The five open-decision resolutions from step 01.1 that concern this step (chordMode parameter, chordVoicing octave parameter, nrLabel return type, tonnetz separation) must be recorded as resolved in the handoff before implementation proceeds. If any of the seven open decisions remain unresolved at the time this step runs, write a `missing-decision` blocker and stop.

Implementation requirements:

**`src/core/theory/pitch.ts`** — Port from prototype lines 592–593 and 1674–1681:
- Export `NOTE_NAMES: readonly string[]` — `['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']`.
- Export `NOTE_LOWER: readonly string[]` — lowercase equivalents.
- Export `noteToPc(name: string | number): number | null` — port `noteToPc` exactly (handles numeric input, letter + accidental). Must handle `'#'`, `'b'`, `'♯'`, `'♭'` accidentals as the prototype does.
- No DOM/PIXI/Svelte imports.

**`src/core/theory/scales.ts`** — Port from prototype lines 697–740:
- Export `SCALE_INTERVALS: Record<Mode, readonly number[]>` for the 8 modes.
- Export `Mode` type alias (the 8 mode strings).
- Export `computeDiatonic(root: number, mode: Mode): DiatonicChord[]` where `DiatonicChord` carries `{degree, rootPc, qual, roman, func}` — port `computeDiatonic` exactly.
- Export `diatonicLookup(root: number, mode: Mode): Record<string, DiatonicChord>` — port `diatonicLookup`.
- No DOM/PIXI/Svelte imports.

**`src/core/theory/chords.ts`** — Port from prototype lines 703–710, 742–757:
- Export `Quality` type alias: `'maj' | 'min' | 'dim' | 'aug'`.
- Export `QUAL_INTERVALS: Record<Quality, readonly number[]>`.
- Export `triadQuality(abs: [number, number, number]): Quality | '?'`.
- Export `chordLabel(rootPc: number, qual: Quality): string`.
- Export `chordPcs(rootPc: number, qual: Quality): number[]`.
- Export `chordVoicing(rootPc: number, qual: Quality, octave: number): string[]` — octave is an explicit parameter (no global); port `chordVoicing` exactly.
- No DOM/PIXI/Svelte imports.

**`src/core/theory/tonal-function.ts`** — Port from prototype lines 711–716:
- Export `TonalFunctionLabel` type: `'T' | 'SD' | 'D' | ''`.
- Export `TonalFunctionInfo` interface: `{f: TonalFunctionLabel; label: string; cls: 'tonic' | 'subdom' | 'dom' | ''}`.
- Export `tonalFunction(degree: number): TonalFunctionInfo` — port exactly.
- No DOM/PIXI/Svelte imports.

**`src/core/theory/voice-leading.ts`** — Port from prototype lines 777–789:
- Export `circDelta(a: number, b: number): number` — port exactly; result in `[-6, 6)`.
- Export `VoiceLeadingResult` interface: `{moves: [number, number, number]; size: number; perm: [number, number, number]}`.
- Export `minimalVoiceLeading(pcsA: [number, number, number], pcsB: [number, number, number]): VoiceLeadingResult` — port exactly; try all 6 permutations of `pcsB` against `pcsA`; pick smallest Σ|moves|.
- No DOM/PIXI/Svelte imports.

**Test file: `tests/voice-leading.test.ts`** — Prototype parity tests:
- `circDelta(0, 7)` → `1` (via `((7-0+18)%12)-6 = 1`). Confirm exact value by running the extracted prototype function in Node (fallback: trace, with reason).
- `circDelta(7, 0)` → `-1`.
- `circDelta(0, 6)` → `0` (since `((6+18)%12)-6 = 0`).
- `minimalVoiceLeading([0,4,7],[0,3,7])` — P transform of C major → C minor: one voice moves by `-1`; `size = 1`. Assert `size === 1` and that `moves` contains exactly one `-1` and two `0`s (order depends on perm; assert the multiset). Golden value generated by running the extracted prototype function in Node (fallback: trace, with reason).
- `minimalVoiceLeading([0,4,7],[9,0,4])` — C major → A minor (R transform): moves sum to `size`; assert known Σ from Node execution of the prototype algorithm (fallback: trace, with reason).
- `minimalVoiceLeading([0,4,7],[5,9,0])` — C major → F major (subdominant): Dev generates and asserts exact known result via Node execution of the extracted prototype function (fallback: trace, with reason).

**Test file: `tests/tonnetz.test.ts`** — Partial parity (tonnetz pure fn not yet implemented; test file created with placeholder shape-tests for `chordPcs` and `chordVoicing` from `chords.ts`):
- `chordPcs(0, 'maj')` → `[0, 4, 7]`.
- `chordPcs(9, 'min')` → `[9, 0, 4]` (A minor).
- `chordVoicing(0, 'maj', 3)` → `['C3', 'E3', 'G3']`.
- `chordVoicing(9, 'min', 3)` → `['A3', 'C4', 'E4']` (confirm octave wrap from prototype line 754: `o = oct + Math.floor((rootPc+iv)/12)`). Golden value generated by running the extracted prototype function in Node (fallback: trace, with reason).
- `diatonicLookup(0, 'major')['0:maj'].roman` → `'I'`.
- `diatonicLookup(0, 'major')['7:min'].roman` → `'v'` (degree 4 = G minor? — Dev generates the golden value by running the extracted prototype function in Node and asserts the actual value; fallback: trace, with reason).

**Remove `tests/placeholder.test.ts`** — delete this file in the same commit.

No new runtime dependencies. If any implementation requires a runtime import not already in `package.json`, write a `missing-decision` blocker and stop.

Validation:
- `pnpm exec tsc --noEmit` exits 0.
- `pnpm lint` exits 0.
- `pnpm test` exits 0; all new parity tests pass.
- `grep -rn 'document\|window\|PIXI\|svelte' src/core/` → zero matches.

Expected result:
- Five theory modules implemented. `tests/voice-leading.test.ts` and partial `tests/tonnetz.test.ts` committed with green parity tests. Placeholder test removed.

CHECKPOINT → Commit message:
`feat(core): Phase 01 step 01.2 — theory engines: pitch, scales, chords, tonal-function, voice-leading`

---

## Step 01.3 — Neo-Riemannian + Tonnetz pure engine

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-01.md`, and the step 01.2 handoff entry. Implement `neo-riemannian.ts` and `tonnetz.ts`, and complete `tests/tonnetz.test.ts` with full parity coverage.

Implementation requirements:

**`src/core/theory/neo-riemannian.ts`** — Port from prototype lines 1238–1249:
- Export `NRLabel` type: `'P' | 'R' | 'L'`.
- Export `nrLabel(srcRoot: number, srcQual: Quality, nbrRoot: number, nbrQual: Quality): NRLabel | null` — port `nrLabel` exactly. Rules: `P` when same root, opposite mode; for `maj` source, `R` when `nbrRoot === (srcRoot + 9) % 12`, `L` when `nbrRoot === (srcRoot + 4) % 12`; for `min` source, `R` when `nbrRoot === (srcRoot + 3) % 12`, `L` when `nbrRoot === (srcRoot + 8) % 12`. Returns `null` if same mode (P/L/R always change mode) or no match.
- No DOM/PIXI/Svelte imports.

**`src/core/theory/tonnetz.ts`** — Port the pure data-generation logic from prototype lines 946–991 and 1234–1279, per Pilot-resolved tonnetz-separation decision from inventory:
- Export `TonnetzNode` interface: `{i: number; j: number; pc: number}` — coordinates in the Tonnetz lattice and pitch class. No pixel coordinates (those are render-layer).
- Export `TonnetzTriangle` interface: `{vertices: [TonnetzNode, TonnetzNode, TonnetzNode]; rootPc: number; qual: Quality; pcs: number[]; label: string; info: DiatonicChord | null}`.
- Export `tonnetzPc(i: number, j: number): number` — implements `pc(i,j) = (7i + 4j) mod 12` exactly (prototype line 966: `((7*i + 4*j) % 12 + 12) % 12`).
- Export `computeTonnetzNodes(iRange: number, jRange: number): TonnetzNode[]` — generates the full lattice node set for a grid of `[-iRange..iRange] × [-jRange..jRange]`.
- Export `computeTonnetzTriangles(nodes: TonnetzNode[], root: number, mode: Mode): TonnetzTriangle[]` — generates all triangles; upward triangle (i,j)(i+1,j)(i,j+1) is major with rootPc = node(i,j).pc; downward triangle (i+1,j)(i,j+1)(i+1,j+1) is minor with rootPc = node(i,j+1).pc (per prototype lines 982–991). Attaches diatonic info from `diatonicLookup(root, mode)`.
- Import only from `./pitch`, `./chords`, `./scales`, `./tonal-function`. No DOM/PIXI/Svelte imports.

**Complete `tests/tonnetz.test.ts`** — add full prototype-parity tests:
- `tonnetzPc(0, 0)` → `0` (C at origin).
- `tonnetzPc(1, 0)` → `7` (G, one step along i-axis).
- `tonnetzPc(0, 1)` → `4` (E, one step along j-axis).
- `tonnetzPc(-1, 0)` → `5` (F, negative i).
- `tonnetzPc(2, -1)` → `((14-4)%12+12)%12` = `10` (A#) — Dev generates the golden value by running the extracted prototype `tonnetzPc` function in Node (fallback: trace, with reason).
- `computeTonnetzNodes(2, 2)` produces nodes with all unique `pc` values in range; spot-check `pc` values at `(0,0)`, `(1,0)`, `(0,1)`.
- For a small grid, `computeTonnetzTriangles(nodes, 0, 'major')` produces triangles where: (a) upward triangle at `(0,0)` has `rootPc=0, qual='maj'`; (b) the downward triangle at the same grid cell has `qual='min'` and `rootPc = tonnetzPc(0,1)`.
- NR parity tests: `nrLabel(0, 'maj', 0, 'min')` → `'P'` (C major → C minor, parallel); `nrLabel(0, 'maj', 9, 'min')` → `'R'` (C major → A minor, relative); `nrLabel(0, 'maj', 4, 'min')` → `'L'` (C major → E minor, leading-tone exchange); `nrLabel(0, 'min', 3, 'maj')` → `'R'` (C minor → Eb major); `nrLabel(0, 'min', 8, 'maj')` → `'L'` (C minor → Ab major); `nrLabel(0, 'maj', 5, 'maj')` → `null` (same mode, no match). Golden values generated by running the extracted prototype `nrLabel` function in Node (fallback: trace, with reason).

Validation:
- `pnpm exec tsc --noEmit` exits 0.
- `pnpm lint` exits 0.
- `pnpm test` exits 0; all parity tests pass.
- `grep -rn 'document\|window\|PIXI\|svelte' src/core/` → zero matches.

Expected result:
- `neo-riemannian.ts` and `tonnetz.ts` implemented. `tests/tonnetz.test.ts` complete with full parity coverage.

CHECKPOINT → Commit message:
`feat(core): Phase 01 step 01.3 — neo-riemannian and tonnetz pure engines`

---

## Step 01.4 — Rhythm engines: euclid and layers

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-01.md`, and the step 01.3 handoff entry. Implement `euclid.ts` and `layers.ts`, and create `tests/euclid.test.ts` with full prototype-parity coverage.

Implementation requirements:

**`src/core/rhythm/euclid.ts`** — Port from prototype lines 796–813:
- Export `bjorklund(k: number, n: number): number[]` — port exactly. Edge cases: `k=0` returns `n` zeros; `k=n` returns `n` ones; otherwise Bjorklund distribution algorithm. Result length always `n`.
- Export `rotate(arr: readonly number[], r: number): number[]` — port exactly: `r = ((r % arr.length) + arr.length) % arr.length`, then `arr.slice(r).concat(arr.slice(0, r))`. Works on any array length.
- Export `stepsFromHits(hits: number[], totalSteps?: number): number[]` — port `stepsFromHits` with an explicit `totalSteps` parameter defaulting to `16` (the prototype's `RSTEPS = 16`). Fills a `totalSteps`-length zero array and sets `1` at each valid hit index.
- Export `RSTEPS = 16` as a named constant.
- No DOM/PIXI/Svelte imports.

**`src/core/rhythm/layers.ts`** — Port from prototype lines 815–836 (data model and pure logic only):
- Export `Sound` type: `'bd' | 'sd' | 'hh' | 'oh' | 'cp' | 'rim' | 'lt' | 'mt' | 'ht'`.
- Export `RhythmLayer` interface: `{sound: Sound; steps: number[]; euclid?: string; muted?: boolean; solo?: boolean}`.
- Export `layerAudible(layer: RhythmLayer, allLayers: RhythmLayer[]): boolean` — port `layerAudible` exactly: `!layer.muted && (!anySolo || layer.solo)` where `anySolo = allLayers.some(x => x.solo)`. Takes the full layer array explicitly (no global).
- Export `rhythmLayerToStrudelLine(layer: RhythmLayer): string` — port the body of `rhythmLayerLines` for a single layer (prototype lines 826–830): if `layer.euclid`, emit `s("${sound}(${euclid})")` ; else emit `s("${tokens.join(' ')}")` where tokens are `sound` or `'~'` per step.
- No DOM/PIXI/Svelte imports.

**`tests/euclid.test.ts`** — Full prototype-parity tests:
- `bjorklund(0, 8)` → `[0,0,0,0,0,0,0,0]` (all zeros).
- `bjorklund(8, 8)` → `[1,1,1,1,1,1,1,1]` (all ones).
- `bjorklund(3, 8)` → `[1,0,0,1,0,0,1,0]` — the tresillo. This is the canonical E(3,8). Dev generates the golden value by running the extracted prototype `bjorklund` function in Node (fallback: trace, with reason).
- `bjorklund(5, 8)` → cinquillo. Dev generates the golden value by running the extracted prototype function in Node (fallback: trace, with reason).
- `bjorklund(2, 5)` → 2:5 pattern. Dev generates the golden value by running the extracted prototype function in Node (fallback: trace, with reason).
- `bjorklund(4, 4)` → `[1,1,1,1]`.
- `bjorklund(1, 4)` → `[1,0,0,0]`.
- `rotate([1,0,0,1,0,0,1,0], 2)` → `[0,1,0,0,1,0,0,1]` (shift by 2). Verify with prototype line 812. Golden value generated by running the extracted prototype function in Node (fallback: trace, with reason).
- `rotate([1,0,0,1,0,0,1,0], 0)` → identity.
- `rotate([1,0,0,1,0,0,1,0], 8)` → identity (full cycle).
- `stepsFromHits([0,4,8,12])` → `[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]` (4-on-the-floor).
- `stepsFromHits([4,12])` → snare at steps 4 and 12.
- Layer parity: `layerAudible({sound:'bd',steps:[],muted:true}, [{sound:'bd',steps:[],muted:true}])` → `false`.
- Layer parity: `layerAudible({sound:'bd',steps:[],solo:true}, [{sound:'bd',steps:[],solo:true},{sound:'sd',steps:[]}])` → `true` (BD is solo, so it's audible).
- Layer parity: `rhythmLayerToStrudelLine({sound:'hh',euclid:'5,8',steps:[]})` → `'  s("hh(5,8)")'`.
- Layer parity: `rhythmLayerToStrudelLine({sound:'bd',steps:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]})` → `'  s("bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~")'`.

Validation:
- `pnpm exec tsc --noEmit` exits 0.
- `pnpm lint` exits 0.
- `pnpm test` exits 0; all parity tests pass.
- `grep -rn 'document\|window\|PIXI\|svelte' src/core/` → zero matches.

Expected result:
- `euclid.ts` and `layers.ts` implemented. `tests/euclid.test.ts` committed with full prototype-parity coverage.

CHECKPOINT → Commit message:
`feat(core): Phase 01 step 01.4 — rhythm engines: euclid and layers`

---

## Step 01.5 — Codegen engine + composition model

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-01.md`, and the step 01.4 handoff entry. Implement `src/core/codegen/strudel.ts` and `src/core/composition/model.ts`, create `tests/codegen.test.ts`, and run the full validation suite.

Implementation requirements:

**`src/core/codegen/strudel.ts`** — Port from prototype lines 605–608, 758–773, 833–836, 1470–1476, 2054–2065:
- Export `tempoWrap(code: string, bpm: number): string` — `setcpm(${(bpm/4).toFixed(4)})\n${code.trim()}`. Uses `setcpm` only; never `setcps` (CLAUDE.md invariant). `bpm` is an explicit parameter.
- Export `chordToStrudel(rootPc: number, qual: Quality, gain: number | null, chordMode: 'chord' | 'arp', octave: number): string` — port `chordToStrudel` exactly per Pilot-resolved parameter convention. Comma separator for `'chord'`, space for `'arp'`. Gain defaults to `0.6` if null.
- Export `melodyLine(progression: ReadonlyArray<{rootPc: number; qual: Quality; gain?: number | null}>, chordMode: 'chord' | 'arp', octave: number): string` — port `melodyLine` exactly (lines 765–773): bracket notation `[...]` per chord, space-joined, wrapped in `note("<${seq}>").s("sawtooth").lpf(1200).gain("<${gains}>").room(0.3)`. Returns `''` if progression is empty.
- Export `rhythmToStrudel(layers: RhythmLayer[], audibleFn?: (layer: RhythmLayer, all: RhythmLayer[]) => boolean): string` — port `rhythmToStrudel` (lines 833–836): `stack(\n${lines.join(',\n')}\n)` or `''` if no audible lines. `audibleFn` defaults to `layerAudible`.
- Export `buildSession(layers: RhythmLayer[], progression: ReadonlyArray<{rootPc: number; qual: Quality; gain?: number | null}>, chordMode: 'chord' | 'arp', octave: number): string` — port `buildSession` (lines 1470–1476): combines rhythm lines and `melodyLine` into `stack(...)`. Comment header included exactly as in prototype.
- No DOM/PIXI/Svelte imports.

**`src/core/composition/model.ts`** — Types and one utility from prototype §5 (kickoff) and lines 1931–1938, 2054–2065:
- Export types: `Block`, `Track`, `Composition` matching the kickoff §5 domain model exactly.
- Export `stripComments(code: string): string` — port `stripComments` from prototype lines 1936–1938: removes lines starting with `//`.
- Export `buildComposition(blocks: Block[], tracks: Track[]): string` — port `buildComposition` (lines 2054–2065): for each track, build `arrange(...)` segments; pad with `[N, silence]` if track total < `totalBars`; wrap multiple tracks in `stack(...)`. Returns `''` if no non-empty tracks.
- No DOM/PIXI/Svelte imports.

**`tests/codegen.test.ts`** — Full prototype-parity tests (byte-identical string assertions). All golden values generated by running the extracted prototype functions in Node; for any value that cannot be Node-executed, document the fallback and reason:
- `tempoWrap('stack(\n  s("bd")\n)', 120)` → `'setcpm(30.0000)\nstack(\n  s("bd")\n)'`. Verify `bpm/4` with `.toFixed(4)`.
- `tempoWrap('stack(\n  s("bd")\n)', 90)` → `'setcpm(22.5000)\nstack(\n  s("bd")\n)'`.
- `chordToStrudel(0, 'maj', null, 'chord', 3)` → `'note("C3,E3,G3").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'`. Exact string match; golden value generated via Node.
- `chordToStrudel(0, 'maj', 0.8, 'arp', 3)` → `'note("C3 E3 G3").s("sawtooth").lpf(1200).gain(0.80).room(0.25)'`. Arpeggio uses spaces.
- `chordToStrudel(9, 'min', null, 'chord', 3)` → `'note("A3,C4,E4").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'` (octave-wrap: A3, C is above A so C4, E above A so E4). Dev generates the exact string by running the extracted prototype `chordVoicing` and `chordToStrudel` functions in Node.
- `melodyLine([{rootPc:0,qual:'maj'},{rootPc:9,qual:'min'}], 'chord', 3)` → exact string matching prototype `melodyLine` output for C major + A minor at octave 3, default gain 0.6 each. Dev generates and asserts the exact string by running the extracted prototype function in Node (fallback: trace, with reason).
- `melodyLine([], 'chord', 3)` → `''`.
- `rhythmToStrudel([{sound:'bd',steps:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]},{sound:'sd',steps:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]}], layerAudible)` → exact `stack(\n  s("bd ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~"),\n  s("sd ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~")\n)`. Dev generates via Node execution of the extracted prototype functions (fallback: trace each layer, with reason).
- `rhythmToStrudel([{sound:'hh',euclid:'5,8',steps:[]}], layerAudible)` → `'stack(\n  s("hh(5,8)")\n)'`.
- `buildSession` smoke test: non-empty layers + non-empty progression produces a string containing `'stack('` and the session comment header `'// ── Sesión: ritmo + armonía (geometría) ──'`.
- `buildComposition` — given two tracks each with one block of 4 bars, total 4 bars, both tracks have 4 bars so no silence padding needed: output contains `arrange(` and `stack(`. Dev constructs minimal fixture and asserts.
- `buildComposition` silence-padding case: one track has 4 bars, another has 2 bars, total 4 bars → shorter track gets `[2, silence]` appended. Assert exact `arrange` structure.
- `stripComments('// comment\nstack(\n  s("bd")\n)')` → `'stack(\n  s("bd")\n)'`.

**Golden-value extraction script.** If a `scripts/extract-golden.mjs` (or equivalent) is created to drive Node execution of the extracted prototype functions, it lives outside `src/`. It need not be committed unless the Dev judges it useful as a reproducible fixture generator — Dev's discretion. It introduces no new runtime dependency.

**Full suite validation.** After all implementations, run:
- `pnpm exec tsc --noEmit` — must exit 0.
- `pnpm lint` — must exit 0.
- `pnpm test` — must exit 0 with all parity tests passing across all four test files.
- `grep -rn 'document\|window\|PIXI\|svelte' src/core/` — must return zero matches.
- `pnpm build` — must still exit 0 (regression check).

Expected result:
- `strudel.ts` and `model.ts` implemented. `tests/codegen.test.ts` committed with byte-identical string assertions. Full tooling suite green.

CHECKPOINT → Commit message:
`feat(core): Phase 01 step 01.5 — codegen engine and composition model, all parity tests green`

---

## Phase Acceptance

- **A-01-01** — `bjorklund(k, n)` returns byte-identical step arrays to the prototype for all tested cases, including tresillo E(3,8), cinquillo E(5,8), and edge cases E(0,n) and E(n,n).
  - Validation method: `unit` (`tests/euclid.test.ts`)

- **A-01-02** — `minimalVoiceLeading(pcsA, pcsB)` returns the exact same `{size, moves, perm}` as the prototype algorithm for C major → C minor (P transform, Σ=1) and at least two other chord pairs.
  - Validation method: `unit` (`tests/voice-leading.test.ts`)

- **A-01-03** — `nrLabel(srcRoot, srcQual, nbrRoot, nbrQual)` returns `'P'`, `'R'`, `'L'`, or `null` matching prototype behavior for all six test cases (P, R, L for maj source; R, L for min source; null for same-mode).
  - Validation method: `unit` (`tests/tonnetz.test.ts`)

- **A-01-04** — `tonnetzPc(i, j)` implements `(7i + 4j) mod 12` exactly; spot-checked against prototype line 966 for `(0,0)`, `(1,0)`, `(0,1)`, `(-1,0)`.
  - Validation method: `unit` (`tests/tonnetz.test.ts`)

- **A-01-05** — `chordToStrudel` and `melodyLine` produce byte-identical Strudel strings to the prototype for C major chord (block and arpeggio), A minor chord, and a two-chord progression, for default gain and explicit gain values.
  - Validation method: `unit` (`tests/codegen.test.ts`)

- **A-01-06** — `rhythmToStrudel` produces byte-identical `stack(...)` strings for a two-layer groove (BD + SD with explicit steps) and for a single euclidean layer (`hh(5,8)`).
  - Validation method: `unit` (`tests/codegen.test.ts`)

- **A-01-07** — `buildComposition` correctly pads shorter tracks with `silence` in `arrange()` and wraps multiple tracks in `stack()`, producing a string matching the prototype's `buildComposition` logic for the silence-padding case.
  - Validation method: `unit` (`tests/codegen.test.ts`)

- **A-01-08** — All `src/core/**` modules contain zero imports of DOM globals, PIXI, or Svelte; `grep -rn 'document\|window\|PIXI\|svelte' src/core/` returns empty.
  - Validation method: `proxy:static-analysis` (grep run against committed source)

- **A-01-09** — `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, and `pnpm build` all exit 0 with zero errors and zero warnings at the end of Phase 01.
  - Validation method: `live-system`

## Partial coverage from prior phase (if any)

No prior partials to address. All Phase 00 Acceptance IDs (A-00-01 through A-00-05) are `covered` in the Phase 00 coverage summary. The four deferred items from Phase 00 are addressed as follows:

- **ESLint `strictTypeChecked` deferral** — deferred work, not Phase 1 scope. No Phase 1 step introduces a new barrier to future adoption. Permanently deferred until a `tsconfig` covering all linted files is set up (expected Phase 02 or later).
- **CI/pre-commit hooks deferral** — per Pilot decision at Phase 00 inventory; not Phase 1 scope. Permanently deferred until Pilot explicitly schedules it.
- **pnpm as canonical package manager** — already authoritative via `CLAUDE.md`; no Phase 1 action needed. Pilot decided at Phase 00 approval (Register entry present).
- **Exact dependency version pinning for all deps** — active Register entry; enforced in Phase 1 (no new runtime deps expected, no `pnpm add` calls).

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **Tonnetz pure representation (nodes without pixel coordinates)** — Trigger: step 01.3, when the Pilot-resolved tonnetz-separation decision is implemented. If the Pilot chose to include pixel layout in the pure engine (not expected but possible), document the rationale and its rendering implications. If the separation is confirmed as described, a brief ADR noting the render-layer boundary is warranted.
- **Vitest environment for core tests (`node` vs `jsdom`)** — Trigger: step 01.2, when the test files are first run. If `node` environment is used (expected, since `core/**` has no DOM deps), no ADR needed. If `jsdom` is required due to a transitive import, surface as a `missing-decision` blocker and document the dependency.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v1/handoffs/phase-01-handoff.md`. See `~/.claude/skills/pilot-machine/references/handoff-template.md`. Each step entry must include a Prototype parity section citing the exact prototype line ranges ported, the test names that verify each algorithm's output, and how each golden value was produced — either Node-executed (stating the prototype line range of the extracted function) or hand-traced fallback (stating the reason it could not be run headless). This makes the parity guarantee auditable.
