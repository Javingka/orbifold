<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 04 Handoff — FreePats Static Sample Bank

---

## Step 04.1 — Inventory

**Date:** 2026-06-24
**Iteration:** 1 of 5

### Completed

- Read all required source files: `CLAUDE.md`, `docs/authentic-groove/decisions.md`, `docs/adr/0025-authentic-sample-palette.md`, `src/audio/strudel.ts`, `src/core/music-knowledge/rhythm-harmony-recipes.ts`, `vite.config.ts`, `docs/authentic-groove/inventories/phase-03-inventory.md` §2 and §3.
- Confirmed AG-D1 in force and ADR 0025 D1–D7 all present.
- Confirmed `SCHEMA_VERSION = 6`, `SESSION_SCHEMA_VERSION = 5`, test count at 1698.
- Confirmed `pnpm test` gate condition met (Phase 03 complete and merged).

**Live verification results:**

1. **ffmpeg availability:** `ffmpeg` confirmed at `/Users/virtualmachine/ffmpeg-bin/ffmpeg`, version 8.1-tessus. Full codec support including libvorbis. No fallback needed.

2. **FreePats repository structure:** Fetched `https://api.github.com/repos/freepats/world-percussion/contents/` and `samples/`. Confirmed 14 instrument subdirectories. `README.txt` fetched and read: confirms CC0-1.0 license for all audio samples. `picture.jpg` is CC BY 4.0 (not used). Claves and Conga samples derived from Versilian Community Sample Library (also CC0).

3. **File selection per instrument:**
   - `samples/Conga`: 8 FLAC files (`v2_01_01.flac`–`v3_02_02.flac`). Selected 4 (open-tone variety across pitch layers).
   - `samples/CajonFlamenco`: 22 FLAC files (`101.flac`–`222.flac`). Selected 4 (bass style 1 + slap style 2, low and mid velocity).
   - `samples/Claves`: 4 FLAC files (`01.flac`–`04.flac`). Selected all 4 (short uniform clave strikes, maximizing round-robin variety).
   - `samples/HighConga`: 8 FLAC files; `samples/LowConga`: 6 FLAC files — fetched for awareness; not selected for Phase 04 (Conga folder covers the primary open-tone role).

4. **OGG support in `@strudel/web@1.0.3`:** Confirmed by reading `dist/index.mjs`. The sampler uses `fetch(url).then(s => s.arrayBuffer()).then(t.decodeAudioData)` — fully format-agnostic, delegated to the browser's Web Audio API. No `.ogg` string literals, no extension filter in the sampler. OGG is confirmed supported by all target browsers. OGG chosen over WAV (5–10x size reduction).

5. **`import.meta.env.BASE_URL` injection:** Confirmed Vite injects `BASE_URL` at build time from `vite.config.ts` `base: '/orbifold/'`. No existing usage in `src/audio/strudel.ts` (first use will be Phase 04). Proposed helper `buildSampleMap(base: string)` as a named export from `strudel.ts` allows unit testing without Vite injection or Web Audio API — tests call `buildSampleMap('/orbifold/')` directly.

**sampleMap upgrade findings:**
- 4 upgrades warranted (rumba `bd → 'wood'`, bulería `bd → 'cajon'`, cumbia `bd → 'conga'`, candombe `bd → 'conga'`).
- 6 remaining entries kept as-is (West-African bell patterns, Latin jazz cascara, samba caixa, bossa nova `bd` unaffected).
- Phase 04 spec's two proposed upgrades (cumbia and candombe to `'conga'`) confirmed as genuine improvements — authentic membrane drum family match over generic `'perc'`.
- Phase 04 spec's bulería upgrade confirmed exact match (`cajon` name = FreePats CajonFlamenco recordings).
- Rumba upgrade to `'wood'` confirmed: FreePats Claves ARE clave samples — exact match for rumba clave pattern role. Phase 03 concern about `'east'` cycling through Japanese drums does not apply here.

**Seam impact:**
- `conga`, `cajon`, `wood` are palette-level names, not genre identifiers — do not need addition to genre-token seam grep.
- Additional palette-confinement grep specified for Phase 04 (steps 04.4/04.5).
- AG-D1 seam is not violated by `buildSampleMap` in `audio/strudel.ts` (palette declarations are permitted there per phase spec architectural note).

### Files touched

- `docs/authentic-groove/inventories/phase-04-inventory.md` (new)
- `docs/authentic-groove/handoffs/phase-04-handoff.md` (this file, new)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in step 04.1 (inventory step — read-only).

- `git status` confirms only the two new doc files are present; no `.ts`, `.svelte`, or binary files modified.

### Routine validations

- `git status` → only `docs/authentic-groove/inventories/phase-04-inventory.md` and `docs/authentic-groove/handoffs/phase-04-handoff.md` are new. No source files modified.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-04-01 | `initAudio()` registers `conga`, `cajon`, `wood` via `samples()` with BASE_URL-prefixed URLs; URL construction unit-testable via `buildSampleMap` | — | — | not covered (inventory step) |
| A-04-02 | Genre recipes with upgradeable fallbacks carry authentic FreePats name in sampleMap | — | — | not covered (inventory step) |
| A-04-03 | Recipes without available authentic name retain Phase 01/03 fallbacks unchanged | — | — | not covered (inventory step) |
| A-04-04 | `public/samples/` contains FreePats CC0 files and LICENSE.txt; `pnpm build` includes them in `dist/samples/` | — | — | not covered (inventory step) |
| A-04-05 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` passes; `pnpm build` succeeds | — | — | not covered (inventory step) |
| A-04-06 | Seam grep: zero genre names outside `src/core/music-knowledge/`; `'conga'`/`'cajon'`/`'wood'` only in permitted locations | — | — | not covered (inventory step) |

### Notes for Pilot review

The inventory confirms all five sections as required. The key decisions for Pilot confirmation before step 04.2:

1. **Format decision (§1):** OGG Vorbis confirmed supported; OGG chosen. Conversion command: `ffmpeg -i <input>.flac -codec:a libvorbis -qscale:a 5 -ac 1 -ar 44100 <output>.ogg`. No Pilot decision needed if OGG is accepted (per ADR Triggers in phase spec).

2. **File selection (§2):** 4 files per instrument × 3 instruments = 12 files total. Naming: `conga_0.ogg`–`conga_3.ogg`, `cajon_0.ogg`–`cajon_3.ogg`, `wood_0.ogg`–`wood_3.ogg`. Total estimated size ≈ 220–480 kB.

3. **Upgrade decisions (§4):** 4 upgrades confirmed. Cumbia and candombe both upgrade to `'conga'` (FreePats Conga). Bulería upgrades to `'cajon'` (FreePats CajonFlamenco). Rumba upgrades to `'wood'` (FreePats Claves). All are genuine cultural accuracy improvements.

**Next action after Pilot APPROVE:** Proceed to step 04.2 (sample acquisition, conversion, commit to `public/samples/`).

**Planner Review:** APPROVED on 2026-06-24. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 04.2

---

## Step 04.2 — Sample acquisition, conversion, and commit

**Date:** 2026-06-24
**Iteration:** 1 of 5

### Completed

- Read inventory §1 and §2 for exact file list, conversion command, and naming convention.
- Confirmed AG-D1 in force (this step touches only `public/`).
- Confirmed `vite.config.ts` sets `publicDir` as default (`public`) — files committed here are served as static assets.
- No `.gitignore` rules block `.ogg` or audio files — `git add` used without `-f`.
- FLAC files downloaded from `https://raw.githubusercontent.com/freepats/world-percussion/main/` using `curl`.
- All 12 files converted with the exact command from inventory §1: `ffmpeg -i <input>.flac -codec:a libvorbis -qscale:a 5 -ac 1 -ar 44100 <output>.ogg`.
- `public/samples/LICENSE.txt` written with CC0-1.0 pointer, attribution line, and per-file source list.

### Files touched

- `public/samples/LICENSE.txt` (new)
- `public/samples/conga_0.ogg` through `conga_3.ogg` (4 new files)
- `public/samples/cajon_0.ogg` through `cajon_3.ogg` (4 new files)
- `public/samples/wood_0.ogg` through `wood_3.ogg` (4 new files)
- `docs/authentic-groove/handoffs/phase-04-handoff.md` (this file, step entry added)

No `.ts` or `.svelte` files modified.

### Validation evidence

**`ls -lh public/samples/` output:**

```
total 264
-rw-r--r--  1 virtualmachine  staff   1.7K Jun 24 20:55 LICENSE.txt
-rw-r--r--  1 virtualmachine  staff   7.3K Jun 24 20:05 cajon_0.ogg
-rw-r--r--  1 virtualmachine  staff   7.3K Jun 24 20:05 cajon_1.ogg
-rw-r--r--  1 virtualmachine  staff   6.9K Jun 24 20:05 cajon_2.ogg
-rw-r--r--  1 virtualmachine  staff   6.8K Jun 24 20:05 cajon_3.ogg
-rw-r--r--  1 virtualmachine  staff    11K Jun 24 20:04 conga_0.ogg
-rw-r--r--  1 virtualmachine  staff    10K Jun 24 20:04 conga_1.ogg
-rw-r--r--  1 virtualmachine  staff    14K Jun 24 20:04 conga_2.ogg
-rw-r--r--  1 virtualmachine  staff    12K Jun 24 20:04 conga_3.ogg
-rw-r--r--  1 virtualmachine  staff   8.7K Jun 24 20:55 wood_0.ogg
-rw-r--r--  1 virtualmachine  staff   7.9K Jun 24 20:55 wood_1.ogg
-rw-r--r--  1 virtualmachine  staff   7.8K Jun 24 20:55 wood_2.ogg
-rw-r--r--  1 virtualmachine  staff   8.9K Jun 24 20:55 wood_3.ogg
```

12 OGG files + 1 LICENSE.txt = 13 files, ~264 kB total (within the estimated 220–480 kB range from inventory §2).

**`git status` check:** Only `public/samples/*` (new) and `docs/authentic-groove/handoffs/phase-04-handoff.md` (modified). No `.ts` or `.svelte` files in staged set.

**`pnpm test` output:** 33 test files, 1698 tests passed — no regressions. No TypeScript changed.

### Acceptance Coverage

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-04-04 | `public/samples/` contains FreePats CC0 audio files and LICENSE.txt | `ls -lh public/samples/` recorded above | operability | partial — files committed; `pnpm build` dist/ check deferred to 04.5 |
| A-04-05 | `pnpm test` passes at 1698 | (all test files) | operability | partial — test count confirmed; full quality gate (lint, tsc, build) deferred to 04.5 |

**Planner Review:** APPROVED on 2026-06-24. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 04.3

---

## Step 04.3 — `initAudio()` registration

**Date:** 2026-06-24
**Iteration:** 1 of 5

### Completed

- Read inventory §3 for exact `samples()` call, URL scheme, and test strategy.
- Confirmed AG-D1 in force (no genre name in `audio/strudel.ts`).
- Confirmed all 12 committed files (`conga_0..3.ogg`, `cajon_0..3.ogg`, `wood_0..3.ogg`) are present in `public/samples/`.
- Updated `src/vite-env.d.ts`: broadened `samples()` type signature to accept `string | Record<string, string[]>` — the runtime `Bo` function in `@strudel/web@1.0.3` accepts both forms (confirmed in `dist/index.mjs` at line 4772); the prior `string`-only declaration was too narrow.
- Created `src/audio/sample-map.ts`: standalone pure module exporting `buildSampleMap(base: string)`. Extracted to a separate file (not inline in `strudel.ts`) to avoid pulling in `@strudel/web`'s browser-only module-scope initialisation code during unit tests.
- Updated `src/audio/strudel.ts`: added `import { buildSampleMap } from './sample-map.js'` and the `localSamplesReady` call inside `initAudio()`, integrated into the existing `Promise.all`. The original `samples('github:tidalcycles/dirt-samples')` call is unchanged.
- Created `tests/authentic-groove/sample-registration.test.ts` (12 tests): covers `buildSampleMap` with production base (`/orbifold/`), dev base (`/`), trailing-slash normalisation, key set, array length, URL prefix, and exact URL values for all three sample names.

**Implementation detail — module split rationale:**
The inventory §3 spec proposed `buildSampleMap` as a named export from `src/audio/strudel.ts`. However, importing `strudel.ts` in a Vitest test causes `@strudel/web/dist/index.mjs` to execute at module scope — and that bundle accesses `window` at line 14806, throwing `ReferenceError: window is not defined` in Node.js. The fix is to place `buildSampleMap` in a dedicated pure module `src/audio/sample-map.ts` with zero browser imports, making it directly unit-testable. The function is re-exported from `strudel.ts` for any callers that import from that path. This is a mechanical improvement over the inventory's proposed approach, not a spec deviation — the exported API (`buildSampleMap(base)`) is identical.

**Note on `docs/authentic-groove/decisions.md` §AG-D1 seam grep extension:** The additional palette-confinement grep (checking `'conga'`, `'cajon'`, `'wood'` are confined to `src/audio/strudel.ts` / `src/audio/sample-map.ts` and `src/core/music-knowledge/`) was run and returns zero matches outside the permitted locations. This grep is recorded in full in step 04.5.

### Files touched

- `src/vite-env.d.ts` (modified — broadened `samples()` type signature)
- `src/audio/sample-map.ts` (new — pure `buildSampleMap` helper)
- `src/audio/strudel.ts` (modified — import + `localSamplesReady` in `initAudio`)
- `tests/authentic-groove/sample-registration.test.ts` (new — 12 tests)
- `docs/authentic-groove/handoffs/phase-04-handoff.md` (this file)

### Validation evidence

**`pnpm exec tsc --noEmit`:** clean (exit 0).

**`pnpm exec vitest run sample-registration`:**
```
Test Files  1 passed (1)
     Tests  12 passed (12)
```

**`pnpm test`:**
```
Test Files  34 passed (34)
     Tests  1710 passed (1710)
```
No regressions. Prior count was 1698; 12 new tests added.

**Seam grep (palette names):**
```bash
git grep -n \
  -e "'conga'" -e '"conga"' \
  -e "'cajon'" -e '"cajon"' \
  -e "'wood'" -e '"wood"' \
  -- 'src/' \
  ':(exclude)src/core/music-knowledge/' \
  ':(exclude)src/audio/strudel.ts' \
  ':(exclude)src/audio/sample-map.ts'
```
Result: **empty output (zero matches)**. Palette names are confined to the two permitted `src/audio/` files and `src/core/music-knowledge/`.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-04-01 | `initAudio()` registers `conga`, `cajon`, `wood` via `samples()` with BASE_URL-prefixed URLs; URL construction unit-testable via `buildSampleMap` | `tests/authentic-groove/sample-registration.test.ts` | unit (pure helper) | partial — URL construction confirmed; Vite BASE_URL injection + `samples()` call confirmed by code review; propagation to codegen deferred to 04.5 |
| A-04-02 | Genre recipes with upgradeable fallbacks carry authentic FreePats name in sampleMap | — | — | not covered (step 04.4) |
| A-04-03 | Recipes without available authentic name retain Phase 01/03 fallbacks unchanged | — | — | not covered (step 04.4) |
| A-04-04 | `public/samples/` contains FreePats CC0 files and LICENSE.txt; `pnpm build` includes them in `dist/samples/` | — | — | partial (files committed in 04.2; build check deferred to 04.5) |
| A-04-05 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` passes; `pnpm build` succeeds | `pnpm exec tsc --noEmit` + `pnpm test` recorded above | operability | partial — tsc clean + 1710 tests; lint and build deferred to 04.5 |
| A-04-06 | Seam grep returns zero genre names outside `src/core/music-knowledge/`; palette names confined | seam grep recorded above | operability | partial — palette-name grep clean; full genre-token grep deferred to 04.5 |

### Notes

- `import.meta.env.BASE_URL` injection bypass: disclosed in test comment and in this handoff. The test calls `buildSampleMap('/orbifold/')` directly. The actual Vite injection is a build-time replacement — not testable in Node.js without mocking. The unit test validates the URL construction logic; runtime correctness is validated by browser/dev-server testing.
- `SCHEMA_VERSION` (6) and `SESSION_SCHEMA_VERSION` (5) unchanged — no schema change in this step.
- `src/vite-env.d.ts` modification: this is a type-declaration change only, not a runtime change. The declaration now correctly reflects the actual `Bo` function signature in `@strudel/web@1.0.3`.

**Planner Review:** APPROVED on 2026-06-24. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 04.4

---

## Step 04.4 — sampleMap upgrades in the recipe catalog

**Date:** 2026-06-24
**Iteration:** 1 of 5

### Completed

- Read inventory §4 (exact upgrade plan), ADR 0025 (D2, D3, D6), and all four required files before editing.
- Applied 4 sampleMap upgrades in `rhythm-harmony-recipes.ts`:
  - `cumbia-latina-groove` `bd: 'perc'` → `bd: 'conga'` (FreePats Conga — closest membrane drum to cumbia caja)
  - `candombe-dorian-groove` `bd: 'perc'` → `bd: 'conga'` (FreePats Conga — closest to Afro-Uruguayan candombe membrane drum)
  - `buleria-flamenco-phrygian` `bd: 'perc'` → `bd: 'cajon'` (FreePats CajonFlamenco — canonical flamenco percussion instrument)
  - `rumba-blues-minor` `bd: 'perc'` → `bd: 'wood'` (FreePats Claves — authentic clave idiophone for the rumba clave pattern)
- Replaced fallback comments with authentic descriptions per spec ("Replace fallback comments with authentic descriptions").
- Left the 6 remaining fallback entries untouched (`west-african-bell-modal` bd+hh, `west-african-triplet-groove` bd+hh, `latin-jazz-clave-swing` hh, `samba-afro-brasileiro` hh).
- Updated `tests/authentic-groove/sample-map.test.ts`:
  - Added `'conga'`, `'cajon'`, `'wood'` to `VERIFIED_SAMPLE_NAMES` (with inline attribution comments).
  - Updated fixture comment block to show Phase 04 new expected values.
  - Updated 4 per-recipe assertions to the new values (rumba → wood, cumbia → conga, candombe → conga, bulería → cajon).
  - 60 tests still present and pass (no tests added or removed from `sample-map.test.ts`).
- Updated stale assertions in two additional test files that also referenced the old `'perc'` value for cumbia:
  - `tests/authentic-groove/propagation.test.ts` lines 141/160: updated cumbia bd-slot assertions from `'perc'` → `'conga'` and updated test description text to document the Phase 04 upgrade.
  - `tests/authentic-groove/apply-recipe-by-id.test.ts` line 68: updated cumbia bd-slot assertion from `'perc'` → `'conga'` and updated test description text.

**Note on additional test file updates:** The phase spec (step 04.5) explicitly states: "If any existing propagation test asserted the old fallback name for an upgraded recipe, update the assertion to the new name and document the update explicitly in the handoff." The two failing tests in `propagation.test.ts` and `apply-recipe-by-id.test.ts` were asserting the stale `'perc'` value for cumbia; updating them here in step 04.4 is consistent with that doctrine and keeps the suite green rather than carrying known-broken assertions into step 04.5.

### Files touched

- `src/core/music-knowledge/rhythm-harmony-recipes.ts` (modified — 4 sampleMap upgrades)
- `tests/authentic-groove/sample-map.test.ts` (modified — VERIFIED_SAMPLE_NAMES + 4 per-recipe assertions updated)
- `tests/authentic-groove/propagation.test.ts` (modified — 2 cumbia assertions updated from `'perc'` → `'conga'`)
- `tests/authentic-groove/apply-recipe-by-id.test.ts` (modified — 1 cumbia assertion updated from `'perc'` → `'conga'`)
- `docs/authentic-groove/handoffs/phase-04-handoff.md` (this file)

No change to `recipe-engine.ts`, `apply.ts`, `autopilot.ts`, or any plumbing file.

### Validation evidence

**`pnpm exec tsc --noEmit`:** clean (exit 0, no output).

**`pnpm exec vitest run sample-map`:**
```
Test Files  1 passed (1)
     Tests  60 passed (60)
```
All 60 tests pass — original count preserved.

**`pnpm test`:**
```
Test Files  34 passed (34)
     Tests  1710 passed (1710)
```
No regressions. Total count unchanged from step 04.3 (1710) — the 3 previously-failing tests are now fixed by correcting stale assertions.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-04-02 | Genre recipes with upgradeable fallbacks carry authentic FreePats name in sampleMap; applying them emits the authentic Strudel sample name | `tests/authentic-groove/sample-map.test.ts` (4 per-recipe assertions updated); `tests/authentic-groove/propagation.test.ts` (cumbia propagation + codegen assertions updated to `'conga'`); `tests/authentic-groove/apply-recipe-by-id.test.ts` (cumbia applyRecipeById assertion updated) | unit | partial — sampleMap catalog values confirmed; propagation confirmed for cumbia; propagation for candombe/buleria/rumba deferred to 04.5 |
| A-04-03 | Recipes without available authentic name retain Phase 01/03 fallbacks unchanged | `tests/authentic-groove/sample-map.test.ts` (unchanged assertions for west-african, latin-jazz, samba entries) | unit | partial — catalog values confirmed; propagation deferred to 04.5 |
| A-04-05 | `tsc --noEmit` clean; `pnpm test` passes | recorded above | operability | partial — tsc clean + 1710 tests; lint and build deferred to 04.5 |

### Notes

- The 4 upgraded recipes now emit culturally accurate sample names: `conga` (cumbia, candombe), `cajon` (bulería flamenco), `wood` (rumba clave). These names resolve to the CC0 FreePats OGG files committed in step 04.2.
- The 6 remaining fallback entries (west-African bell × 4, latin-jazz cascara × 1, samba caixa × 1) are deliberately unchanged — no available CC0 sample approximates those roles better than the current fallbacks (`'cb'`, `'perc'`, `'sd'`).
- `SCHEMA_VERSION` (6) and `SESSION_SCHEMA_VERSION` (5) unchanged.
- No new ADR triggered — this is a catalog value update within the framework established by ADR 0025 D2/D6.

**Next action:** Dev proceeds to step 04.5
