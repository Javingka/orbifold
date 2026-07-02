<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 02 Handoff — `importSession` Skill + Zod Schema + Golden-Fixture Test

---

## Step 02.1 — Inventory

**Date:** 2026-07-02
**Iteration:** 1 of 5

### Completed

- Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, and `docs/song-import/phases/phase-02.md` in full.
- Read all twelve required sources: `src/agent/schema.ts`, `src/agent/apply.ts`, `src/lib/persistence.ts`, `src/core/theory/chords.ts`, `src/core/composition/model.ts`, `src/core/composition/snapshot.ts`, `src/core/codegen/strudel.ts`, `src/state/session.ts` (harmonyCode/buildHarmonyCode section), `src/agent/agent.ts` (lines 1–50).
- Confirmed OD-3 resolved to Option A (structured LLM-native input) and block naming convention `"<songTitle> — <sectionLabel>"` from the Decisions Register.
- Produced `docs/song-import/inventories/phase-02-inventory.md` with all six sections (a–f).
- No source files were modified.

### Files touched

- `docs/song-import/inventories/phase-02-inventory.md` (created)
- `docs/song-import/handoffs/phase-02-handoff.md` (this file, created)

### Validation evidence (per Acceptance ID)

- **A-02-01:** `docs/song-import/inventories/phase-02-inventory.md` exists with all six sections (a–f). Verified by file creation.
- **A-02-02:** Section (e) states the OD-3 recommendation (Option A) with a one-sentence rationale and notes what the resolution gates (input schema shape, golden fixture format, no tab parsing). OD-3 is already resolved per the Decisions Register — section (e) confirms and documents the resolved form.
- **A-02-03:** Section (b) traces the exact codegen call sequence (`noteToPc` → `melodyLine` from `src/core/codegen/strudel.ts`). Verdict: **pure-callable, no store coupling.** `melodyLine` is called directly; `harmonyCode` from `session.ts` is NOT used. The store-coupling ADR-trigger #2 is resolved cleanly — no blocker, no ADR needed.
- **A-02-04:** No source files were opened for writing. Inventory is read-only.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-02-01 | Inventory document exists with all six sections (a–f) | n/a | manual | covered |
| A-02-02 | OD-3 states recommended option with one-sentence rationale and notes what resolution gates | n/a | manual | covered |
| A-02-03 | Inventory traces the codegen call sequence; confirms pure-function availability | n/a | manual | covered |
| A-02-04 | Inventory produced by reading only; no source files modified | n/a | manual | covered |

No Acceptance IDs A-02-05 through A-02-20 are touched by this step — they belong to steps 02.2 and 02.3.

### Key findings for Pilot review

**Section (b) — pure-function verdict (no blocker):** `importSession` must call `melodyLine` directly from `src/core/codegen/strudel.ts` rather than `harmonyCode` from `src/state/session.ts`. The reason: `session.ts` imports `svelte/store` at module load time; importing it in a Node/Vitest context would drag in the Svelte store graph. `melodyLine` itself is in `src/core/codegen/strudel.ts` which has no DOM/PIXI/Svelte imports. All arguments (`progression`, `chordMode`, `octave`) are passed explicitly. **This is not a blocker — the pure path exists and is already exercised by 2104 passing tests.**

**Section (c) — `pow` codegen confirmed:** `chordVoicing(rootPc, 'pow', octave)` → 2-element array → `notes.join(',')` → `note("E2,B2")`. The OD-1 form is fully operational from Phase 01. No new codegen code needed.

**Section (f) — purely additive:** Zero existing files need modification. `importSession` creates two new files only: `src/agent/import-session.ts` and `tests/song-import/import-session.test.ts`.

**ADR 0026:** Step 02.2 should write ADR 0026 (pre-listed trigger) documenting OD-3 Option A as the canonical `importSession` input boundary. This is the only ADR needed for Phase 02.

### Decisions made (if any)

None — inventory is read-only. OD-3 and the block-naming convention are already resolved in the Decisions Register (Pilot decision 2026-07-02). This inventory confirms and documents both resolutions.

---

## Step 02.2 — `importSession` skill + Zod schema + golden-fixture test

**Date:** 2026-07-02
**Iteration:** 1 of 5

### Completed

- Read all required sources: `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, `docs/song-import/phases/phase-02.md`, `docs/song-import/inventories/phase-02-inventory.md`, `src/agent/schema.ts`, `src/agent/apply.ts`, `src/lib/persistence.ts`, `src/core/theory/chords.ts`, `src/core/codegen/strudel.ts`, `src/core/codegen/presets.ts`, `src/core/theory/pitch.ts`.
- Implemented `src/agent/import-session.ts` with `IMPORT_SCHEMA_VERSION = 1`, `ChordSpecSchema`, `SectionSpecSchema`, `ImportSessionInputSchema`, `ImportSessionInput` type, and `importSession` function. AGPL-3.0 header present.
- Key design choices applied exactly per spec and resolved decisions:
  - `melodyLine` called directly from `src/core/codegen/strudel.ts` (not via `harmonyCode`/`sessionCode` from `session.ts`); documented in a comment (satisfies A-02-13 and inventory verdict section b).
  - `.refine()` guard on `root`/`key` string fields: invalid note names (e.g. `"H"`) rejected at `safeParse` time with message `"root: invalid note name"` / `"key: invalid note name"` — not deep in mapping.
  - Octave default: 2 (metal/rock low register). Documented in JSDoc comment.
  - Block naming: `"<songTitle> — <sectionLabel>"` per decisions.md; `Block.label = section.label` (bare section).
  - Groove default: single `bd` layer, steps `[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]` (kick on beats 1+3).
  - Harmony progression from FIRST section's chords only.
  - Block bars = sum of chord bars (defaulting absent bars to 1), rounded, clamped to [1, 64].
- Wrote `tests/song-import/import-session.test.ts` with 25 test cases covering the golden fixture and all A-02-xx acceptance criteria for this step.
- Golden fixture: "ONE"-inspired (Metallica), B minor, 85 bpm, 3 sections:
  - Intro: B5 pow + G5 pow (pow-only)
  - Verse: E5 pow + E min + G maj (mixed)
  - Chorus: E5 pow + G5 pow + A5 pow (pow-only)
- Golden `SavedSession` INLINED (hardcoded) in test — not computed.
- Wrote `docs/adr/0026-import-session-input-contract.md` documenting OD-3 Option A.
- Ran `pnpm exec prettier --write` to fix formatting; all checks pass clean.

### Octave default rule chosen

Fixed at octave 2 for all keys. Documented in the JSDoc comment in `importSession()`. Rationale: rock/metal charts place guitar parts in the low register; octave 2 yields E2 for the root of an E chord (standard guitar low E). A future phase may add per-key heuristics or expose `octave` as an explicit input field.

### Files touched

- `src/agent/import-session.ts` (created)
- `tests/song-import/import-session.test.ts` (created)
- `docs/adr/0026-import-session-input-contract.md` (created)
- `docs/song-import/handoffs/phase-02-handoff.md` (this file, appended)

### Validation evidence (per Acceptance ID)

- **A-02-05:** `src/agent/import-session.ts` exists. `IMPORT_SCHEMA_VERSION = 1` (line 29). AGPL-3.0 header at line 1. Verified by file creation and static read.
- **A-02-06:** `tests/song-import/import-session.test.ts` "ImportSessionInputSchema validation" suite — 7 cases: valid fixture passes, bpm=0/39/281 fail, key="H" fails with `"invalid note name"`, chord root="H" fails, empty sections fail, unknown mode fails. All 7 pass.
- **A-02-07:** `tests/song-import/import-session.test.ts` "importSession golden output" — 1 deep-equal case. `importSession(fixture)` deep-equals hardcoded `expectedSession`. Passes.
- **A-02-08:** `tests/song-import/import-session.test.ts` "SavedSessionSchema round-trip" — `SavedSessionSchema.safeParse(importSession(fixture)).success === true`. Passes.
- **A-02-09:** `tests/song-import/import-session.test.ts` "pow quality in output" — 3 cases: `harmony.progression` contains `qual: 'pow'`; Intro block code contains `B2,F#3`; Chorus block code contains `E2,B2`, `G2,D3`, `A2,E3`. All pass.
- **A-02-10:** `tests/song-import/import-session.test.ts` "Block.label in output" — iterates all blocks, asserts `block.label === sectionLabels[idx]`. Passes.
- **A-02-11:** `tests/song-import/import-session.test.ts` "section count" — `result.composition.blocks.length === 3 === fixture.sections.length`. Passes.
- **A-02-12:** `tests/song-import/import-session.test.ts` "track structure" — exactly 1 track, `blockRefs.length === 3`, blockIndex values are 0/1/2. Passes.
- **A-02-13:** `grep "svelte\|sessionStore\|session.js" src/agent/import-session.ts` returns only a comment line (no actual import). Verified by static analysis. `tsc --noEmit` also passes clean (a missing type would cause a compile error).
- **A-02-14:** `pnpm test` → 2129 passed (2104 + 25 new). Baseline 2104 preserved.
- **A-02-15:** `pnpm exec tsc --noEmit` → exit 0, no errors.

### Routine validations

- `pnpm test` → 2129 passed (46 test files)
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0 (eslint + prettier)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-02-05 | `import-session.ts` exists; `IMPORT_SCHEMA_VERSION = 1`; AGPL-3.0 header | `tests/song-import/import-session.test.ts` | proxy:static-analysis | covered |
| A-02-06 | `ImportSessionInputSchema` validates: valid passes, out-of-range bpm fails; invalid note name fails | `tests/song-import/import-session.test.ts` | unit | covered |
| A-02-07 | `importSession(fixture)` deep-equals hardcoded golden `SavedSession` | `tests/song-import/import-session.test.ts` | unit | covered |
| A-02-08 | `SavedSessionSchema.safeParse(importSession(fixture)).success === true` | `tests/song-import/import-session.test.ts` | unit | covered |
| A-02-09 | At least one pow block in golden output uses Phase 01 codegen form (comma-joined note pair) | `tests/song-import/import-session.test.ts` | unit | covered |
| A-02-10 | Every block has non-empty `label` matching section label | `tests/song-import/import-session.test.ts` | unit | covered |
| A-02-11 | `result.composition.blocks.length === fixture.sections.length` | `tests/song-import/import-session.test.ts` | unit | covered |
| A-02-12 | Single track with `blockRefs.length === fixture.sections.length` | `tests/song-import/import-session.test.ts` | unit | covered |
| A-02-13 | `import-session.ts` has no Svelte store imports | `src/agent/import-session.ts` (lines 15–18) | proxy:static-analysis | covered |
| A-02-14 | All 2104 pre-existing tests pass; total count ≥ 2104 | (full suite) | operability | covered |
| A-02-15 | `pnpm exec tsc --noEmit` passes clean | n/a | operability | covered |

**Proxy disclosures (A-02-05, A-02-13):**
- A-02-05: `src/agent/import-session.ts` line 1 = `// SPDX-License-Identifier: AGPL-3.0-only`; line 29 = `export const IMPORT_SCHEMA_VERSION = 1;`. Confirmed by file read.
- A-02-13: Import block is lines 15–18. Imports: `zod`, `../core/codegen/strudel.js`, `../core/theory/pitch.js`, `../lib/persistence.js`. No `svelte`, `sessionStore`, or `session.js` import. The comment at line 9 references `svelte/store` in explanatory text only — not an import statement.

**Operability evidence (A-02-14, A-02-15):**
- `pnpm test` run in repo root, all 46 test files, 2129 tests passed, 0 failed. Duration ~4.5s.
- `pnpm exec tsc --noEmit` exit 0, no output (no errors).

### Decisions made (if any)

- Octave default: fixed at 2 (low register, metal/rock); documented in JSDoc. Future phases may change.
- Note-name validation: `.refine()` at schema boundary (not deep assertion in function body).

### ADRs committed

- `docs/adr/0026-import-session-input-contract.md` — OD-3 Option A canonical form, pure-engine path, groove default, octave default.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**
