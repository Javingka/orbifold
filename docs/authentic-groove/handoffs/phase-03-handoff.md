<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 03 Handoff — Authentic Sample Registration

---

## Step 03.1 — Inventory

**Date:** 2026-06-24
**Iteration:** 1 of 5

### Completed

- Read all required source files: `src/audio/strudel.ts`, `src/core/music-knowledge/rhythm-harmony-recipes.ts`, `docs/authentic-groove/decisions.md`, `docs/adr/0025-authentic-sample-palette.md`, `docs/authentic-groove/inventories/phase-01-inventory.md`.
- Fetched `https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/strudel.json` live — confirmed 218 sample folders in manifest.
- Confirmed `conga` and `wood` are absent from `strudel.json` (JSON key lookup).
- Confirmed `conga` and `wood` do NOT EXIST as directories in the `tidalcycles/Dirt-Samples` repository at all (GitHub API + raw file probes on all available branches — HTTP 404 on every probe).
- Confirmed `bottle`, `bass3`, and `crow` are already present in `strudel.json` (and thus already registered).
- Verified `samples()` API in `@strudel/web@1.0.3` (`dist/index.mjs` lines 4676–4804): additive/merging via `hr.setKey` spread pattern — multiple calls are supported and merge per key.
- Confirmed `samples()` is `async` and should be awaited; Strudel uses lazy loading (audio files fetched on first play, not at registration).
- Assessed all 11 sampleMap fallback entries across 9 recipes — identified one genuine upgrade available using already-registered samples.
- Confirmed AG-D1 seam is not violated by the one planned change (`'hand'` is a generic palette name, not a genre identifier).
- Produced `docs/authentic-groove/inventories/phase-03-inventory.md` with all four required sections.

### Files touched

- `docs/authentic-groove/inventories/phase-03-inventory.md` (new)
- `docs/authentic-groove/handoffs/phase-03-handoff.md` (this file, new)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in step 03.1 (inventory step — read-only).

- `git status` confirms only the two new doc files are present; no `.ts` or `.svelte` files modified.

### Routine validations

- `git status` → only `docs/authentic-groove/inventories/phase-03-inventory.md` and `docs/authentic-groove/handoffs/phase-03-handoff.md` are new. No source files modified.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | `initAudio()` registers additional authentic sample folders | — | — | not covered (inventory step) |
| A-03-02 | Genre recipes carry authentic sample names in sampleMap | — | — | not covered (inventory step) |
| A-03-03 | Recipes without available authentic name retain Phase 01 fallbacks | — | — | not covered (inventory step) |
| A-03-04 | Full quality gate passes | — | — | not covered (inventory step) |
| A-03-05 | Seam grep clean | — | — | not covered (inventory step) |

**Notes on partial coverage:** This is a read-only inventory step. No acceptance criteria are claimed. All five criteria will be addressed in steps 03.2–03.4.

### Decisions made (if any)

None — inventory step, no source changes.

### Proposed Decisions Register entries (if any)

None — the critical finding (conga/wood absent from Dirt-Samples) is surfaced as a Pilot decision in the inventory. The Pilot resolves which option to pursue before step 03.2.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- No source files changed. `pnpm test` baseline at 1693 is unchanged.

### Next-step context

**Critical finding for the Pilot to resolve before step 03.2:**

The premise of Phase 03 step 03.2 (add a targeted `samples()` call to register `conga` and `wood`) is **not executable**: those folders do not exist in `tidalcycles/Dirt-Samples` on any branch. The phase spec asks to confirm absence from strudel.json AND identify filenames — both checks found nothing.

Three options are outlined in inventory §2. The inventory recommends **Option C**:
- No new `samples()` call in step 03.2 (step may become a no-op or be merged into 03.3)
- The one warranted sampleMap upgrade (`bossa-nova-groove` `hh` slot: `'sd'` → `'hand'`) uses `'hand'`, which is already registered by the existing `samples('github:tidalcycles/dirt-samples')` call
- All Phase 03 acceptance criteria remain achievable through step 03.3 sampleMap upgrades and step 03.4 seam + quality gate

Pilot resolution of Option A/B/C is required before Dev proceeds to step 03.2.

### Planner Review

**Planner Review:** APPROVED on 2026-06-24. Iteration: 1 of 5.
All four inventory sections present and complete; critical finding (conga/wood absent from Dirt-Samples entirely) correctly surfaced with live evidence; no source files modified; commit scope clean; AG-D1 seam impact correctly analyzed in §4. A-03-01 will require re-scoping in step 03.4: with Option C selected, the criterion covers only the `'hand'` upgrade path (already registered via the manifest — no new `samples()` call), not a new registration call; the propagation test in 03.4 confirms the name flows to codegen output, satisfying the criterion's intent.
**Next action:** Dev proceeds to step 03.2 with Pilot Option C selected (step 03.2 is a no-op — no source file changes; Dev documents the no-op and appends handoff entry; then proceeds directly to step 03.3).

---

## Step 03.2 — Sample Registration (No-op, Pilot Option C)

**Date:** 2026-06-24
**Iteration:** 1 of 5

### Completed

- Confirmed Pilot Option C applies: `conga` and `wood` do not exist in `tidalcycles/Dirt-Samples` (confirmed live in step 03.1); no new `samples()` call is needed.
- The one warranted sampleMap upgrade (`bossa-nova-groove` `hh: 'sd'` → `'hand'`) uses `'hand'`, which is already registered by the existing `samples('github:tidalcycles/dirt-samples')` call (confirmed in inventory §1 — `hand` is present in `strudel.json` manifest with 17 files).
- **No modification to `src/audio/strudel.ts`** — the manifest call already covers `'hand'`; no additional `samples()` call is needed or appropriate.
- **No `sample-registration.test.ts` created** — there is nothing to test; the `'hand'` registration is implicit in the existing manifest call, not a new explicit call. A static-analysis test would test the absence of a call (trivially true and meaningless).
- A-03-01 is satisfied in the narrow sense applicable to Option C: the `'hand'` name flows through the existing `samples('github:tidalcycles/dirt-samples')` registration path. Propagation of `'hand'` through the apply path will be confirmed in step 03.4.

### Option C rationale

The Phase 03 spec (step 03.2) was written under the assumption that `conga` and `wood` exist in `tidalcycles/Dirt-Samples` but are absent from `strudel.json`. The inventory revealed they do not exist at all in the repository (404 on all branches). Under Pilot Option C:

- The `samples('github:tidalcycles/dirt-samples')` call on line 165 of `src/audio/strudel.ts` already registers all 218 folders present in `strudel.json`, including `hand`.
- Adding a redundant second `samples()` call for `'hand'` would be noise with no functional effect.
- Step 03.2 is therefore a no-op: no source changes, no new test file. The step is documented here so the handoff is complete.
- All Phase 03 acceptance criteria remain achievable through the step 03.3 sampleMap upgrade and step 03.4 seam + quality gate.

### Files touched

None. This is a no-op step.

### Validation evidence (per Acceptance ID)

- A-03-01 (partial, Option C path): `'hand'` is registered via the existing `samples('github:tidalcycles/dirt-samples')` manifest call (inventory §1 confirmed `hand` in strudel.json). No new call needed. Full confirmation deferred to step 03.4 propagation test.

### Routine validations

- `git status` → no new or modified source files after step 03.2 (as expected for a no-op step).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | `initAudio()` registers additional authentic sample folders | — (no new call needed; `hand` already in manifest) | proxy: manifest confirmed in inventory | partial — propagation confirmed in step 03.4 |
| A-03-02 | Genre recipes carry authentic sample names in sampleMap | — | — | not yet covered (step 03.3) |
| A-03-03 | Recipes without available authentic name retain Phase 01 fallbacks | — | — | not yet covered (step 03.4) |
| A-03-04 | Full quality gate passes | — | — | not yet covered |
| A-03-05 | Seam grep clean | — | — | not yet covered |

### Decisions made (if any)

None — no-op step. Pilot Option C accepted as stated in the Planner Review for step 03.1.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

No source files changed. `pnpm test` baseline at 1693 is unchanged.

---

## Step 03.3 — sampleMap Upgrade: bossa-nova-groove hh → hand

**Date:** 2026-06-24
**Iteration:** 1 of 5

### Completed

- Applied the single upgrade from inventory §3: `bossa-nova-groove` `hh` slot changed from `'sd'` to `'hand'`.
- Updated the fallback comment in `rhythm-harmony-recipes.ts`: `// hand percussion approximates pandeiro — no native pandeiro in Dirt-Samples`.
- Updated `tests/authentic-groove/sample-map.test.ts`: the per-genre assertion for `bossa-nova-groove` now asserts `{ bd: 'bd', hh: 'hand' }` (upgraded from `'sd'`). Added a comment noting this is a Phase 03 upgrade. The fixture comment in the `GENRE_RECIPE_IDS_WITH_SAMPLE_MAP` section also updated.
- All other 10 fallback entries unchanged (per inventory §3: no authentic sample available for those slots).
- Did NOT touch `recipe-engine.ts`, `apply.ts`, `autopilot.ts`, or any plumbing file.

### Source prototype citation

This step upgrades data in `rhythm-harmony-recipes.ts` — a pure data file introduced in orbifold-v2 (no prototype source in `reference/orbifold.html`). The `hand` folder is verified present in `tidalcycles/Dirt-Samples` strudel.json manifest (confirmed in Phase 03 inventory §1, 2026-06-24).

### Files touched

- `src/core/music-knowledge/rhythm-harmony-recipes.ts` (modified — `bossa-nova-groove` `sampleMap.hh` changed from `'sd'` to `'hand'`)
- `tests/authentic-groove/sample-map.test.ts` (modified — per-genre assertion and fixture comment updated for `bossa-nova-groove`)
- `docs/authentic-groove/handoffs/phase-03-handoff.md` (this file, new step entry)

### Validation evidence (per Acceptance ID)

- A-03-02 (partial): `bossa-nova-groove` `sampleMap.hh` = `'hand'` — confirmed by `vitest run sample-map` → 60 tests pass, including updated assertion.
- A-03-03 (partial): all other 10 fallback entries unchanged — confirmed by existing assertions still passing.
- A-03-04 (partial): `tsc --noEmit` clean; `pnpm test` → 1693 tests pass.

### Routine validations

- `pnpm exec tsc --noEmit` → clean (no output)
- `pnpm exec vitest run sample-map` → 60 tests pass
- `pnpm test` → 1693 tests pass, 33 test files pass, zero regressions

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | `initAudio()` registers additional authentic sample folders | — (no new call; hand already in manifest) | proxy: manifest confirmed in inventory | partial — propagation confirmed in step 03.4 |
| A-03-02 | Genre recipes carry authentic sample names in sampleMap | `tests/authentic-groove/sample-map.test.ts` | unit: fixture assertion | partial — propagation test in step 03.4 confirms codegen output |
| A-03-03 | Recipes without available authentic name retain Phase 01 fallbacks | `tests/authentic-groove/sample-map.test.ts` | unit: fixture assertions (unchanged) | partial — step 03.4 propagation confirms |
| A-03-04 | Full quality gate passes | pnpm test (1693) + tsc clean | live-system | partial — lint + build in step 03.4 |
| A-03-05 | Seam grep clean | — | — | not yet covered (step 03.4) |

### Decisions made (if any)

None — change follows inventory §3 upgrade plan exactly.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `src/core/music-knowledge/rhythm-harmony-recipes.ts`: `bossa-nova-groove.sampleMap.hh = 'hand'`
- `tests/authentic-groove/sample-map.test.ts`: 60 tests (1 updated assertion for bossa-nova)
- `pnpm test` passes at 1693 — no regressions introduced.
