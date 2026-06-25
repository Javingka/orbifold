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
