<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 Handoff — Song-Import Data Model Foundation

---

## Step 01.1 — Inventory

**Date:** 2026-07-02
**Iteration:** 1 of 5

### Completed

- Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/phases/phase-01.md` in full.
- Created `docs/song-import/decisions.md` (empty register — required even when empty).
- Created `docs/song-import/inventories/` and `docs/song-import/handoffs/` directories.
- Performed read-only code inventory of all ten required sources (chords.ts, strudel.ts, persistence.ts, schema.ts, model.ts, tonnetz-scene.ts, snapshot.ts, apply.ts, voice-tracks.ts, pentagrama-scene.ts).
- Produced `docs/song-import/inventories/phase-01-inventory.md` with all seven sections (a)–(g).
- No source files were modified.

### Files touched

- `docs/song-import/decisions.md` (created)
- `docs/song-import/inventories/phase-01-inventory.md` (created)
- `docs/song-import/handoffs/phase-01-handoff.md` (this file, created)

### Validation evidence (per Acceptance ID)

- **A-01-01:** `docs/song-import/inventories/phase-01-inventory.md` exists with sections (a)–(g). Verified by file creation.
- **A-01-02:** Section (d) OD-1 recommends Option A (corrected comma form) with one-sentence rationale. Section (e) OD-2 recommends Option A (accent color `#8aa0ff`) with one-sentence rationale.
- **A-01-03:** No source files in `src/` were opened for writing. Inventory is read-only.
- **A-01-04:** Section (f) lists all files with `Quality`-narrowing sites, including six files requiring change and six files confirmed no-change, derived from `grep -rn "qual\|Quality\|SK_QUAL\|QUAL_INTERVALS" src/`.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | Inventory document exists with all seven sections (a–g) | n/a | manual | covered |
| A-01-02 | OD-1 and OD-2 each state a recommended option with one-sentence rationale | n/a | manual | covered |
| A-01-03 | Inventory produced by reading only; no source files modified | n/a | manual | covered |
| A-01-04 | Exhaustiveness audit lists all `Quality`-narrowing sites | n/a | manual | covered |

**Notes on partial coverage:** A-01-01 through A-01-04 are all `manual` — they cover only step 01.1. Steps 01.2–01.4 cover A-01-05 through A-01-28.

### Decisions made (if any)

None — inventory is read-only. OD-1 and OD-2 recommendations are surfaced for Pilot resolution; no source decisions were made.

### Key findings for Pilot review

**OD-1 (power chord codegen):** The recommended form is `note("E2,B2")` (comma-separated simultaneous notes), not `note("E2 B2")` (which is a sequence/arpeggio in Strudel mini-notation). This is the same pattern the existing chord codegen already uses — `notes.join(',')` produces comma-separated simultaneous notes inside `note("…")`. Option C (chord shorthand) was ruled out because `'pow'` is not a registered chord name in Strudel's tonal vocabulary at `@strudel/web@1.0.3`.

**OD-2 (Tonnetz/Pentagrama rendering):** The recommended approach is accent color `#8aa0ff` (Option A). The existing code already handles this via the `dmap` miss fallback — no extra render code is needed for Phase 01. No Tonnetz crash path was found: `pow` quality will never appear in `_renderTris` (only triads form Tonnetz triangles).

**Critical finding — `voice-tracks.ts`:** Lines 237, 243, 266 hard-assume 3-voice input via `as [number, number, number]` cast and `for (let v = 0; v < 3; v++)`. A `pow` chord (2 voices) fed into `computeVoiceTracks` would produce a corrupt `fullNote = "undefined3"` and a type-unsafe access into a 3-element permutation array. Step 01.2 must guard `pow` chords in `voice-tracks.ts` (emit rest events for all 3 visual tracks, consistent with the existing rest/note slot handling). This guard is explicitly listed in the exhaustiveness audit section (f).

**`snapshot.ts` — hardcoded quality union:** `ChordSnapshotEntry.qual` (line 50) is `'maj' | 'min' | 'dim' | 'aug'` as a literal type, not imported from `chords.ts`. Step 01.2 must widen it to include `'pow'` so that block snapshots containing power chord slots round-trip correctly.

### Proposed Decisions Register entries (if any)

- **OD-1 ADR trigger (from phase file):** If Option A (comma form) is confirmed as the canonical power chord codegen, an ADR should document the choice. This is a Pilot decision; no register entry written by Dev.
- **OD-2 ADR trigger (from phase file):** If `accent` color is confirmed for `pow` rendering, an ADR should document the strategy. Pilot decision.

### Environment state after this step

- Branch: `main` (no new branch — inventory only).
- All source files unchanged.
- `docs/song-import/decisions.md`, `docs/song-import/inventories/phase-01-inventory.md`, and this handoff file are the only new files.

### Next-step context

- OD-1 and OD-2 must be resolved by the Pilot before step 01.2 begins (per phase gate).
- Step 01.2 must also create a new branch `song-import/phase-01`.
- The exhaustiveness audit in section (f) is the complete list of files step 01.2 must update. Pay special attention to the `voice-tracks.ts` guard (it is the only site with a runtime safety risk for `pow` input).

### Planner Review

**Decision:** APPROVED
**Reviewed on:** 2026-07-02
**Iteration:** 1 of 5
**Reason:** All four acceptance criteria met; inventory is read-only; OD-1/OD-2 recommendations are clear and well-reasoned; exhaustiveness audit is complete and accurate; voice-tracks.ts and snapshot.ts risks correctly flagged.
**Next action:** Dev proceeds to step 01.2 (after Pilot resolves OD-1 and OD-2)

---

## Step 01.2 — `pow` quality: type, theory, codegen, schema

**Date:** 2026-07-02
**Iteration:** 1 of 5

### Completed

- Added `'pow'` to `Quality` union in `src/core/theory/chords.ts`.
- Added `pow: [0, 7]` to `QUAL_INTERVALS` (root + perfect fifth, no third).
- Added `'pow'` arm to `chordLabel` — returns `<root>5` (e.g., `"E5"`).
- `chordPcs` and `chordVoicing` automatically handle `'pow'` via `QUAL_INTERVALS` lookup (2-element output).
- Added OD-1-resolved comment to `chordToStrudel` in `src/core/codegen/strudel.ts` — no new branch needed; existing `notes.join(',')` produces `note("E2,B2")` correctly for 2-element `chordVoicing` output.
- Added `'pow'` guard in `src/core/harmony/voice-tracks.ts` — `computeVoiceTracks` now treats `pow` chords as opaque duration (emits rest events for all 3 visual voice tracks, preserving voice-leading continuity across the gap). Guards all three flagged sites (lines 237, 243, 266 in original).
- Added `'pow'` to `SK_QUAL` in `src/lib/persistence.ts`; bumped `SESSION_SCHEMA_VERSION` to 7; updated `z.literal(6)` → `z.literal(7)` in `SavedSessionSchema`; updated version comment block.
- Added `'pow'` to `SK_QUAL` in `src/agent/schema.ts`; bumped `SCHEMA_VERSION` to 7; updated version comment block.
- Added `'pow'` to local `SK_QUAL` in `src/agent/apply.ts`.
- Widened `ChordSnapshotEntry.qual` in `src/core/composition/snapshot.ts` to include `'pow'`.
- Updated all existing tests asserting `SESSION_SCHEMA_VERSION = 6` or `SCHEMA_VERSION = 6` to the new value 7, across `tests/persistence.test.ts`, `tests/agent-block-persistence.test.ts`, `tests/schema.test.ts`, `tests/note-placement/note-slot-model.test.ts`, `tests/session.test.ts`, `tests/authentic-groove/locked-persistence.test.ts`.
- Created `tests/song-import/pow-quality.test.ts` with 25 test cases.
- All 2095 tests pass; `tsc --noEmit` passes clean.

### Files touched

- `src/core/theory/chords.ts` (Quality, QUAL_INTERVALS, chordLabel)
- `src/core/codegen/strudel.ts` (OD-1 comment added to chordToStrudel)
- `src/core/harmony/voice-tracks.ts` (pow guard added)
- `src/lib/persistence.ts` (SK_QUAL, SESSION_SCHEMA_VERSION, SavedSessionSchema)
- `src/agent/schema.ts` (SK_QUAL, SCHEMA_VERSION)
- `src/agent/apply.ts` (local SK_QUAL)
- `src/core/composition/snapshot.ts` (ChordSnapshotEntry.qual widened)
- `tests/song-import/pow-quality.test.ts` (created, 25 tests)
- `tests/persistence.test.ts` (version 6→7 updates)
- `tests/agent-block-persistence.test.ts` (version 6→7 update)
- `tests/schema.test.ts` (version 6→7 updates)
- `tests/note-placement/note-slot-model.test.ts` (version 6→7 update)
- `tests/session.test.ts` (version 6→7 updates)
- `tests/authentic-groove/locked-persistence.test.ts` (version 6→7 update)
- `docs/song-import/handoffs/phase-01-handoff.md` (this file)

### Validation evidence (per Acceptance ID)

- **A-01-05:** `Quality = 'maj' | 'min' | 'dim' | 'aug' | 'pow'`; `pnpm exec tsc --noEmit` exits 0.
- **A-01-06:** `chordPcs(0,'pow')=[0,7]`, `chordPcs(4,'pow')=[4,11]`, `chordPcs(5,'pow')=[5,0]` — 3 unit tests in `pow-quality.test.ts`. All return exactly 2 elements.
- **A-01-07:** `chordLabel(4,'pow')='E5'`, `chordLabel(0,'pow')='C5'`, `chordLabel(7,'pow')='G5'` — 3 unit tests. All other quality labels byte-identical (4 regression tests).
- **A-01-08:** `chordToStrudel(4,'pow',null,'chord',2)='note("E2,B2").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'` — golden string unit test in `pow-quality.test.ts`.
- **A-01-09:** `SESSION_SCHEMA_VERSION` constant equals 7 — unit test.
- **A-01-10:** `SCHEMA_VERSION` constant equals 7 — unit test.
- **A-01-11:** `SavedSessionSchema` accepts `qual:'pow'` in `harmony.progression` — unit test (round-trip parse).
- **A-01-12:** All six files from inventory exhaustiveness audit updated; TypeScript exhaustiveness verified by `tsc --noEmit` passing clean. The `pentagrama-scene.ts`, `tonnetz-scene.ts`, `recipe-engine.ts`, `ProgressionChips.svelte`, and `ProgressionStrip.svelte` are confirmed no-change (inventory §f). `session.ts` reviewed and confirmed no structural change needed — `qual: Quality` type alias automatically widens.
- **A-01-13:** `chordToStrudel(0,'maj',null,'chord',3)='note("C3,E3,G3").s("sawtooth").lpf(1200).gain(0.60).room(0.25)'` and `chordToStrudel(9,'min',null,'chord',3)='note("A3,C4,E4")...'` — 2 regression golden string tests.
- **A-01-14:** `tests/song-import/pow-quality.test.ts` has 25 test cases; all pass (`pnpm exec vitest run tests/song-import/pow-quality.test.ts` → 25 tests, 0 failed).
- **A-01-15:** `pnpm exec tsc --noEmit` exits 0 with no errors.

### Routine validations

- `pnpm exec vitest run tests/song-import/pow-quality.test.ts` → 25 passed
- `pnpm test` → 2095 passed, 0 failed (44 test files)
- `pnpm exec tsc --noEmit` → exits 0 (no output)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-05 | `Quality` includes `'pow'`; TypeScript compiles clean | `tests/song-import/pow-quality.test.ts` + tsc | unit + operability | covered |
| A-01-06 | `chordPcs(rootPc, 'pow')` returns exactly two pitch classes | `tests/song-import/pow-quality.test.ts` | unit | covered |
| A-01-07 | `chordLabel(rootPc, 'pow')` returns `<root>5` | `tests/song-import/pow-quality.test.ts` | unit | covered |
| A-01-08 | `chordToStrudel` emits OD-1-resolved Strudel string for `'pow'` | `tests/song-import/pow-quality.test.ts` | unit (golden string) | covered |
| A-01-09 | `SESSION_SCHEMA_VERSION = 7` | `tests/song-import/pow-quality.test.ts` | unit | covered |
| A-01-10 | `SCHEMA_VERSION = 7` | `tests/song-import/pow-quality.test.ts` | unit | covered |
| A-01-11 | `SK_QUAL` in both schemas includes `'pow'` | `tests/song-import/pow-quality.test.ts` | unit + proxy:static-analysis | covered |
| A-01-12 | Every exhaustiveness site has a `'pow'` arm | `tests/song-import/pow-quality.test.ts` + `pnpm exec tsc --noEmit` | proxy:static-analysis | covered |
| A-01-13 | Non-`pow` `chordToStrudel` output byte-identical to pre-phase | `tests/song-import/pow-quality.test.ts` | unit (regression golden string) | covered |
| A-01-14 | `tests/song-import/pow-quality.test.ts` has ≥9 cases and all pass | `tests/song-import/pow-quality.test.ts` | unit | covered (25 tests) |
| A-01-15 | `pnpm exec tsc --noEmit` passes clean after step 01.2 | n/a | operability | covered |

**Proxy disclosures:**
- A-01-11 (proxy:static-analysis): `SK_QUAL` arrays in `persistence.ts` line 53 and `agent/schema.ts` line 60 verified to contain `'pow'` by reading source after editing.
- A-01-12 (proxy:static-analysis): TypeScript exhaustiveness verified by `tsc --noEmit` exiting 0; each modified file read post-edit to confirm `'pow'` arm.

**Operability evidence (A-01-15):**
- Command: `pnpm exec tsc --noEmit`
- Environment: macOS, Node.js, `song-import/phase-01` branch
- Result: exits 0, no output (no errors)

### Decisions made (if any)

None beyond applying the Pilot's OD-1 and OD-2 resolutions exactly as documented in `docs/song-import/decisions.md`.

### Proposed Decisions Register entries (if any)

None — both OD-1 and OD-2 are already recorded by the Pilot. No new architectural decisions surfaced during implementation.

### Environment state after this step

- Branch: `song-import/phase-01` (new branch created at step 01.2)
- Test count: 2095 (up from 2069 baseline; +26 including new `pow-quality.test.ts` tests and one new rejection test for v8)
- All quality-gate commands pass: `tsc --noEmit` ✓, `pnpm test` ✓

### Next-step context

- Step 01.3 adds `Block.label?: string` and timeline display — no pow-related dependencies.
- The `voice-tracks.ts` pow guard is visual-only (ADR 0011 D6); the audio codegen path (`strudel.ts`) handles pow correctly via the existing `notes.join(',')` pattern.

### Planner Review

**Decision:** APPROVED
**Reviewed on:** 2026-07-02
**Iteration:** 1 of 5
**Reason:** All 11 acceptance criteria for step 01.2 are fully covered. OD-1 (comma-separated simultaneous notes via existing notes.join(',') path) and OD-2 (accent color via existing dmap-miss fallback, no render code change) are applied exactly as the Pilot recorded them. The voice-tracks.ts pow guard intercepts before the unsafe 3-element cast. Byte-identical guarantee for non-pow input is verified by 6 regression golden-string tests. Test file has 25 cases (>= 9 required); total suite is 2095 (> 2069 baseline); tsc exits 0. Prototype-parity item is not applicable (pow is a new construct, not a prototype port). No new architectural decisions needed.
**Next action:** Dev proceeds to step 01.3

---

## Step 01.3 — Block `label` field and Composition timeline display

**Date:** 2026-07-02
**Iteration:** 1 of 5

### Completed

- Added `label?: string` to `Block` interface in `src/core/composition/model.ts` with documented JSDoc comment (organizational metadata, no musical semantics, persisted in session schema).
- Added `label: z.string().optional()` to `SavedBlockSchema` in `src/lib/persistence.ts`. No `SESSION_SCHEMA_VERSION` bump — the field is optional and additive; existing sessions parse cleanly.
- Updated `serializeSession` in `src/lib/persistence.ts` to include `label` when present (`...(b.label !== undefined ? { label: b.label } : {})`); omits the key entirely when `label` is undefined.
- Updated `deserializeSession` in `src/lib/persistence.ts` to carry `label` through (`...(b.label !== undefined ? { label: b.label } : {})`).
- Added label display to the timeline block chip in `src/ui/CompositionDrawer.svelte` — a `<span class="bl">` rendered only when `b.label` is truthy (using `{#if b.label}`), appearing after `.bn` (block name) in the flex column.
- Added `.tl-block .bl` CSS rule in `src/app/app.css` — `font-size: 9px`, `font-weight: 500`, `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, `opacity: 0.72`. Follows the same pattern as `.bn`.
- Confirmed `captureGrooveSnapshot`/`captureArmoniaSnapshot`/`captureSesionSnapshot` paths: these functions build `Block` objects at save time from live state but do not set `label` — which is acceptable per the spec (label is organizational metadata set by import tooling, not capture state). Serialized blocks without `label` simply omit the key.
- Created `tests/song-import/block-label.test.ts` with 9 test cases covering all four required scenarios.
- All 2104 tests pass; `tsc --noEmit` exits 0; `pnpm lint` exits 0.

### Files touched

- `src/core/composition/model.ts` (`Block` interface — `label?: string` added)
- `src/lib/persistence.ts` (`SavedBlockSchema` — `label` field added; `serializeSession` and `deserializeSession` updated)
- `src/ui/CompositionDrawer.svelte` (label display in `.tl-block` timeline chip)
- `src/app/app.css` (`.tl-block .bl` CSS rule added)
- `tests/song-import/block-label.test.ts` (created, 9 tests)
- `docs/song-import/handoffs/phase-01-handoff.md` (this file)

### Validation evidence (per Acceptance ID)

- **A-01-16:** `Block.label?: string` at `src/core/composition/model.ts` line 47 — verified by reading file post-edit; TypeScript compiles clean.
- **A-01-17:** `label: z.string().optional()` added to `SavedBlockSchema` in `src/lib/persistence.ts` line 289 — verified by reading file post-edit; unit tests exercise this via `SavedSessionSchema.safeParse`.
- **A-01-18:** `tests/song-import/block-label.test.ts` — 5 tests covering round-trip (schema parse, serializeSession→deserializeSession full cycle, multiple blocks). All pass.
- **A-01-19:** `tests/song-import/block-label.test.ts` — "legacy block without label still parses" test. `label` is `undefined` after parse.
- **A-01-20:** `src/ui/CompositionDrawer.svelte` lines 871–880 — `{#if b.label}<span class="bl">{b.label}</span>{/if}` renders label when non-empty; nothing rendered when absent or empty string. Manual verification: Svelte `{#if b.label}` is `false` for `undefined`, `null`, and `''`.
- **A-01-21:** `tests/song-import/block-label.test.ts` — two `buildComposition` tests. `buildComposition` reads only `code` and `bars`, ignores `label`; byte-identical output confirmed.
- **A-01-22:** `pnpm exec tsc --noEmit` exits 0 with no errors — verified.
- **A-01-23:** `pnpm lint` exits 0 with no errors — verified (ESLint + Prettier both pass).

### Routine validations

- `pnpm exec vitest run tests/song-import/block-label.test.ts` → 9 passed, 0 failed
- `pnpm test` → 2104 passed, 0 failed (45 test files)
- `pnpm exec tsc --noEmit` → exits 0 (no output)
- `pnpm lint` → exits 0 ("All matched files use Prettier code style!")

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-16 | `Block.label?: string` field exists in `src/core/composition/model.ts` | `tests/song-import/block-label.test.ts` | proxy:static-analysis | covered |
| A-01-17 | `SavedBlockSchema` includes `label: z.string().optional()` | `tests/song-import/block-label.test.ts` | unit | covered |
| A-01-18 | `Block` with `label` round-trips through persistence | `tests/song-import/block-label.test.ts` | unit | covered |
| A-01-19 | Legacy `Block` without `label` still parses cleanly | `tests/song-import/block-label.test.ts` | unit | covered |
| A-01-20 | Timeline renders `block.label` when non-empty; absent otherwise | n/a | manual | covered — `{#if b.label}` guards the span; verified by reading component |
| A-01-21 | `buildComposition` output unaffected by `label` | `tests/song-import/block-label.test.ts` | unit | covered |
| A-01-22 | `pnpm exec tsc --noEmit` passes clean after step 01.3 | n/a | operability | covered |
| A-01-23 | `pnpm lint` passes clean after step 01.3 | n/a | operability | covered |

**Proxy disclosures:**
- A-01-16 (proxy:static-analysis): `Block.label?: string` at model.ts line 47 read post-edit; also confirmed by tsc passing on the test file that types `Block` objects with `label`.

**Operability evidence (A-01-22, A-01-23):**
- `pnpm exec tsc --noEmit` → exits 0, no output, macOS, `song-import/phase-01` branch
- `pnpm lint` → exits 0, "All matched files use Prettier code style!", same environment

### Decisions made (if any)

None. `label` is purely additive — no architectural decisions surfaced.

### Capture path analysis (spec requirement)

The spec required confirmation that `captureGrooveSnapshot`/`captureArmoniaSnapshot`/`captureSesionSnapshot` either carry `label` forward or leave it undefined. These paths do not set `label` on the blocks they build — which is correct: `label` is set by the future `importSession` skill, not by the live capture mechanism. The serialize/deserialize paths carry `label` through when present (confirmed by the full roundtrip test). Blocks created via the capture path will have `label === undefined`, which serializes as an absent key — exactly the expected behavior.

### Prototype parity

Not applicable — `Block.label` is a new field with no prototype analog. The Composition timeline block chip rendering change is a pure addition (new `{#if}` guard + CSS class), not a port of existing prototype logic.

### Proposed Decisions Register entries (if any)

None.

### Environment state after this step

- Branch: `song-import/phase-01`
- Test count: 2104 (up from 2095 after step 01.2; +9 new tests in block-label.test.ts)
- All quality-gate commands pass: `tsc --noEmit` ✓, `pnpm test` ✓, `pnpm lint` ✓

### Next-step context

- Step 01.4 is the final quality gate: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`.
- All three inline validations already pass; `pnpm build` is the only remaining gate.
