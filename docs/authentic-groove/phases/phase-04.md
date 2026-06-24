<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 04 — FreePats Static Sample Bank

**Purpose:** Introduce a curated set of CC0 Latin/flamenco percussion WAV files from freepats/world-percussion as static assets, register them in `initAudio()` via `samples()`, and upgrade the sampleMap fallbacks in the recipe catalog that currently use `'perc'` for roles where a cajon, conga, or wood-struck idiophone is now available.

**Gate:** Phase 03 complete and merged to `main`; `pnpm test` passes at 1698; `SCHEMA_VERSION = 6`; `SESSION_SCHEMA_VERSION = 5`; ADR 0025 in force; AG-D1 seam invariant in force.

**Expected phase result:** Playing a cumbia recipe emits `s("conga(…)")`, a bulería recipe emits `s("cajon(…)")`, and a rumba or claves role emits `s("wood(…)")`; these sample names resolve to CC0 WAV files committed under `public/samples/`; `public/samples/LICENSE.txt` records the CC0-1.0 provenance; `initAudio()` registers the three new names via a targeted `samples()` call using `import.meta.env.BASE_URL`-relative URLs; all existing tests pass and the seam grep returns zero matches.

---

## Architectural note (hard invariant for every step)

`vite.config.ts` sets `base: '/orbifold/'`. Files committed to `public/` are served at `/orbifold/<path>` in production but at `/<path>` in dev (Vite dev server ignores `base` for static files). The `samples()` call in `initAudio()` must construct URLs using `import.meta.env.BASE_URL` as a prefix (`import.meta.env.BASE_URL + 'samples/conga_0.wav'`). Hardcoding `/samples/` would break production. The inventory step must confirm this URL scheme is correct for `@strudel/web@1.0.3`'s `samples()` signature.

The list of new sample names registered in `audio/strudel.ts` (`conga`, `cajon`, `wood`) does NOT violate AG-D1. Those are palette declarations, not genre→sample mappings.

---

## Step 04.1 — Inventory

PROMPT → Read source files and the FreePats world-percussion repository structure, confirm the conversion toolchain, verify Strudel's OGG support, plan the exact file set and naming convention, and identify which sampleMap fallbacks are now upgradeable. Produce `docs/authentic-groove/inventories/phase-04-inventory.md`. Do NOT write any source file or binary file. STOP for Pilot review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (confirm AG-D1 and ADR 0025 in force)
3. `docs/adr/0025-authentic-sample-palette.md` (D2, D3, D6 — sampleMap rules, seam, fallback policy)
4. `src/audio/strudel.ts` (full — confirm the existing `samples('github:tidalcycles/dirt-samples')` call and its position; note the `Promise.all` pattern to be extended)
5. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — all 15 recipes; note every `sampleMap` entry that still uses a fallback comment)
6. `vite.config.ts` (confirm `base` setting and any `publicDir` override)
7. `docs/authentic-groove/inventories/phase-03-inventory.md` §2 and §3 (verified `'perc'` fallback entries and the reasoning for each; do not re-invent)

**Live verification (mandatory — do NOT assume from memory):**

- Run `which ffmpeg` or `ffmpeg -version` in the shell to confirm whether `ffmpeg` is available in the dev environment.
- Fetch `https://raw.githubusercontent.com/freepats/world-percussion/main/README.md` (or the repo root) to confirm the repository structure, instrument folder names, and file count.
- For each instrument of interest (`Conga`, `HighConga`, `LowConga`, `Claves`, `CajonFlamenco`), fetch the directory listing or a sample file index. Identify the exact file names and count.
- Confirm Strudel OGG support: search `@strudel/web@1.0.3`'s `dist/index.mjs` for references to `ogg` in the audio decoding path, or consult `https://strudel.cc/learn/samples/` live. If OGG is confirmed, it is preferred over WAV due to 5–10× size reduction. Record the finding.
- Confirm the `samples()` object-form signature supports full URLs constructed with `import.meta.env.BASE_URL`. Verify that `import.meta.env.BASE_URL` is available at runtime in `strudel.ts` (it is injected by Vite — confirm this is true for the non-test environment; the test environment will need a different strategy for sample-registration tests). Record both findings.

**Inventory sections (all five required):**

**§1 — Toolchain and format decision.**
Record `ffmpeg` availability (full version string). State whether OGG is confirmed supported by `@strudel/web@1.0.3`. State the chosen output format (OGG or WAV) and the `ffmpeg` conversion command that will be used for each file. If `ffmpeg` is unavailable, document the fallback approach (pre-converted files sourced from the FreePats release archive if one exists, or a manual alternative).

**§2 — FreePats file selection.**
For each instrument (`conga`, `cajon`, `wood`):
- State the FreePats folder path and total file count.
- List the exact file names selected for inclusion (target: 3–4 files per instrument, chosen for timbral variety — e.g. for conga: one open tone, one mute, one slap; for cajon: one bass, one tone, one slap; for wood/claves: 2–3 strikes).
- Compute the approximate total asset size after conversion (rough estimate: OGG ≈ 50–80 kB per 1–2 s sample; WAV ≈ 300–500 kB).
- State the committed file naming convention (e.g. `conga_0.ogg`, `conga_1.ogg`; or `conga_0.wav`, etc.).

**§3 — `samples()` registration plan.**
State the exact `samples()` call to be added to `initAudio()`:
- The object argument mapping sample name → array of URL strings constructed as `import.meta.env.BASE_URL + 'samples/<filename>'`.
- Whether the call must be `await`ed or can be fire-and-forget (same analysis as Phase 03 inventory §2 — confirm the result applies here).
- How the call integrates with the existing `Promise.all([defaultPrebake(), registerSynthSounds(), samplesReady])`.
- How tests will verify the registration (the test environment does not inject `import.meta.env.BASE_URL`; propose a test strategy — e.g. extract a `buildSampleUrls(base: string)` helper function that is unit-testable without Vite's environment, or use a static-analysis check on the source).

**§4 — sampleMap upgrade plan.**
For each `sampleMap` fallback identified in Phase 03 inventory §3 as "KEEP" that could now be upgraded using `conga`, `cajon`, or `wood`:
- State the recipe and slot.
- Confirm the upgrade: `old fallback → new name` with rationale.
- State any fallbacks that remain (no upgrade possible even with the new names).

Expected upgrades (to verify or refute with reasoning):
- `cumbia-latina-groove`: `bd → 'conga'` (conga as struck membrane, closer to caja than `'perc'`)
- `candombe-dorian-groove`: `bd → 'conga'` (conga as generic Afro-Latin drum — assess whether this is culturally accurate or a stretch)
- `buleria-flamenco-phrygian`: `bd → 'cajon'` (cajon is the canonical flamenco percussion instrument)
- `rumba-blues-minor`: `bd → 'wood'` (claves as struck idiophone; rumba is defined by clave pattern)
- West-African bell patterns (`west-african-bell-modal`, `west-african-triplet-groove`): no upgrade expected (cajon/conga do not approximate agogo/gankogui)

**§5 — AG-D1 seam impact and URL scheme.**
Describe the new sample names that will appear in `src/audio/strudel.ts` (`conga`, `cajon`, `wood`). Confirm these are palette-level names (not genre identifiers). State the exact seam grep extension needed (if any) for the new names. State whether the `import.meta.env.BASE_URL` usage creates any concern for the AG-D1 seam rule (it does not — URL construction is plumbing, not genre knowledge).

**Implementation requirements:** Read only. Produce the inventory file. Touch no `.ts`, `.svelte`, or binary file. The shell `ffmpeg` check and URL-scheme verification are read/run-only — they produce text output, not file changes.

**Validation:**
- `git status` → only `docs/authentic-groove/inventories/phase-04-inventory.md` and `docs/authentic-groove/handoffs/phase-04-handoff.md` are new/modified.

**CHECKPOINT → Commit message:**
`docs(authentic-groove): Phase 04 step 04.1 — FreePats static sample bank inventory`

**STOP for Pilot review.** The inventory §1 format decision and §2 file selection must be confirmed before any binary files are committed.

---

## Step 04.2 — Sample acquisition, conversion, and commit

PROMPT → Download the selected FreePats FLAC files, convert to the format confirmed in inventory §1, commit the converted files to `public/samples/`, and commit `public/samples/LICENSE.txt`. No TypeScript changes in this step.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-04-inventory.md` §1 and §2 (exact file list, conversion command, naming convention)
2. `docs/authentic-groove/decisions.md` (AG-D1 — no genre name in `audio/strudel.ts`; this step touches only `public/`)
3. `vite.config.ts` (confirm `publicDir` is `public` — default — so files committed here are served as static assets)

**What to produce:**

`public/samples/<name>_<n>.<ext>` — for each instrument and each selected file from inventory §2:
- Download the source FLAC from `https://raw.githubusercontent.com/freepats/world-percussion/main/<FolderPath>/<filename>.flac` (or the correct raw URL from inventory §2).
- Convert using the `ffmpeg` command from inventory §1.
- Commit with the naming convention from inventory §2 (e.g. `conga_0.ogg`, `conga_1.ogg`, `cajon_0.ogg`, ..., `wood_0.ogg`, ...).
- Total committed: 3–4 files per instrument × 3 instruments = 9–12 audio files.

`public/samples/LICENSE.txt` — must contain:
- The CC0-1.0 license text (or a pointer to `https://creativecommons.org/publicdomain/zero/1.0/`).
- Attribution line: "Source: freepats/world-percussion (https://github.com/freepats/world-percussion), derived from the Versilian Community Sample Library. CC0-1.0."
- A per-instrument list of the source files included (e.g. "conga_0.ogg: Conga/v2_01_01.flac from freepats/world-percussion").

**Constraints:**
- No TypeScript or Svelte file is modified in this step.
- `public/samples/` must not contain FLAC files (only the converted format — WAV or OGG per inventory §1).
- AGPL-3.0 does not apply to audio asset files; the CC0-1.0 `LICENSE.txt` governs them.
- `git add -f` may be needed if `.gitignore` has a binary-file rule — check and handle.

**Validation:**
- `git status` → only `public/samples/*` files (new) — no `.ts` or `.svelte` files modified.
- `ls -lh public/samples/` — list files and sizes; record in handoff.
- `pnpm test` → still 1698 (no regressions; no TypeScript changed).

**CHECKPOINT → Commit message:**
`chore(samples): Phase 04 step 04.2 — commit FreePats CC0 percussion samples to public/samples`

---

## Step 04.3 — `initAudio()` registration

PROMPT → Add the targeted `samples()` call to `src/audio/strudel.ts` to register the new sample names (`conga`, `cajon`, `wood`). Add tests. No sampleMap changes in this step.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-04-inventory.md` §3 (exact `samples()` call, URL scheme, test strategy)
2. `docs/authentic-groove/decisions.md` (AG-D1 — no genre name in `audio/strudel.ts`)
3. `docs/adr/0025-authentic-sample-palette.md` (D3 — seam invariant)
4. `src/audio/strudel.ts` (full — confirm position of the existing `samples()` call and `Promise.all`)
5. `public/samples/` — confirm the committed filenames match what the registration call will reference

**What to produce:**

`src/audio/strudel.ts` — add the additional `samples()` call per inventory §3:
- Position: in `initAudio()`, integrated into the existing `Promise.all(...)` that already awaits `samplesReady` (or as a separate `await` immediately after, per whichever pattern inventory §3 confirms).
- The call registers `conga`, `cajon`, and `wood` using `import.meta.env.BASE_URL`-prefixed URLs for each committed file.
- Add a JSDoc comment on the new call: "Additional authentic Latin/flamenco percussion samples committed as CC0 static assets in public/samples/ (freepats/world-percussion). Registered here as palette declarations — no genre knowledge. See ADR 0025 D3 and Phase 04 inventory §3."
- The existing `samples('github:tidalcycles/dirt-samples')` call is NOT removed or modified.
- `SCHEMA_VERSION` stays 6; `SESSION_SCHEMA_VERSION` stays 5.

New `tests/authentic-groove/sample-registration.test.ts` (AGPL-3.0 header):
- Implement the test strategy from inventory §3. The recommended approach is to extract a pure helper `buildSampleMap(base: string): Record<string, string[]>` from `initAudio()` — a function that takes the `BASE_URL` string as a parameter and returns the sample name → URL array object. Test this helper with a known `base` string (e.g. `'/orbifold/'`), asserting the returned object contains the expected keys (`conga`, `cajon`, `wood`) and that each URL begins with `'/orbifold/samples/'`. This is a unit test of pure logic (no WebAudio, no DOM, no Vite injection needed). Disclose in the Acceptance Coverage Table that `import.meta.env.BASE_URL` injection is bypassed via the helper.
- If the inventory §3 concludes the helper extraction is not the right approach and proposes static-analysis instead, use that approach and document the proxy use.

**Constraints:** No genre name in `strudel.ts`. No mock that requires DOM or WebAudio. AGPL-3.0 header on new test file. Do NOT change the existing `samples('github:tidalcycles/dirt-samples')` line.

**Acceptance criteria in this step:**
- A-04-01 (partial): the additional `samples()` call is present in `initAudio()` with the correct argument — unit test confirms correct URL construction.
- A-04-05 (partial): `tsc --noEmit` clean; `pnpm test` ≥ 1698 + new tests.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run sample-registration` → new test(s) pass
- `pnpm test` → no regressions
- `git status` → only `src/audio/strudel.ts` (modified), `tests/authentic-groove/sample-registration.test.ts` (new), handoff entry

**CHECKPOINT → Commit message:**
`feat(audio): Phase 04 step 04.3 — register FreePats samples in initAudio via BASE_URL`

---

## Step 04.4 — sampleMap upgrades in the recipe catalog

PROMPT → Read inventory §4 and replace the applicable `'perc'` fallbacks in `rhythm-harmony-recipes.ts` with the new authentic names. All changes stay inside `src/core/music-knowledge/`.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-04-inventory.md` §4 (exact upgrade plan — which fallbacks are replaceable and with what authentic name)
2. `docs/adr/0025-authentic-sample-palette.md` (D2, D3, D6 — sampleMap rules, seam, fallback policy)
3. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — before editing)
4. `tests/authentic-groove/sample-map.test.ts` (full — existing 60 tests; understand the fixture list so upgraded entries can be reasserted)

**What to produce:**

`src/core/music-knowledge/rhythm-harmony-recipes.ts` — for each recipe identified in inventory §4 as upgradeable:
- Replace the fallback sample name with the authentic name.
- Replace or remove the fallback comment (if the new name is a first-class match, remove the comment; if it is still an approximation, replace the comment with a description of the degree of authenticity, e.g. `// cajon: canonical flamenco percussion instrument`).
- Do NOT touch recipes identified in §4 as "keep fallback — no authentic sample available."
- Do NOT add or remove any `sampleMap` entries that are not in the §4 upgrade list.

Updated `tests/authentic-groove/sample-map.test.ts` — extend the verified fixture list for upgraded recipes. Assert per-recipe value expectations (e.g. if cumbia now maps `bd → 'conga'`, assert that). The existing 60 tests must still pass; new/updated assertions are additive.

**Constraints:** All changes confined to `src/core/music-knowledge/` and `tests/`. No change to `recipe-engine.ts`, `apply.ts`, `autopilot.ts`, or any plumbing file. AGPL-3.0 header already present on `rhythm-harmony-recipes.ts` — do not modify it.

**Acceptance criteria in this step:**
- A-04-02 (partial): genre recipes with upgraded fallbacks now carry the authentic sample name in `sampleMap` — unit tests confirm.
- A-04-03 (partial): recipes for which no authentic name is available retain their Phase 01/03 fallback unchanged — confirmed by absence of change in those entries + test assertions.
- A-04-05 (partial): `tsc --noEmit` clean; `pnpm test` ≥ prior + updated/new tests.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run sample-map` → all sample-map tests pass (original 60 + new/updated assertions)
- `pnpm test` → no regressions
- `git status` → only `src/core/music-knowledge/rhythm-harmony-recipes.ts` (modified), `tests/authentic-groove/sample-map.test.ts` (modified), handoff entry

**CHECKPOINT → Commit message:**
`feat(music-knowledge): Phase 04 step 04.4 — upgrade sampleMap fallbacks to FreePats names`

---

## Step 04.5 — End-to-end propagation test + seam fitness check + full quality gate

PROMPT → Verify that the upgraded sampleMaps propagate through the full apply path (recipe → `strudelSample` → codegen output), run the seam fitness grep extended to cover the new names, and run the full quality gate. Record all output in the handoff.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-04-inventory.md` §4 and §5
2. `docs/authentic-groove/handoffs/phase-04-handoff.md` (confirm 04.2, 04.3, 04.4 are APPROVED)
3. `docs/adr/0025-authentic-sample-palette.md` (D3 — seam invariant + grep command)
4. `tests/authentic-groove/propagation.test.ts` (existing 20 tests — understand what to extend)

**What to produce:**

Extended `tests/authentic-groove/propagation.test.ts` — add tests for upgraded recipes:
- For each recipe where inventory §4 confirms the fallback was replaced, add a test asserting the upgraded name propagates through `applySampleMap` and that `rhythmLayerToStrudelLine` emits the authentic name (not the old fallback).
- If any existing propagation test asserted the old fallback name for an upgraded recipe, update the assertion to the new name and document the update explicitly in the handoff.
- Existing 20 tests must still pass.

Run and record the seam fitness check (AG-D1 extended to cover the new names):
- Run the genre-token grep from ADR 0025 D3: confirm zero genre names in `src/` outside `src/core/music-knowledge/`.
- Additionally, run a grep for `'conga'`, `'cajon'`, and `'wood'` scoped to `src/` to confirm they appear in `audio/strudel.ts` (palette declarations) and `src/core/music-knowledge/` (mappings) but NOT in any other plumbing file (codegen, apply, persistence).

Run and record the full quality gate:
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

**Reversibility / flag-off note (required per CLAUDE.md), verbatim in handoff:**
- The `samples()` call for FreePats names is additive. Reverting it means `conga`, `cajon`, and `wood` play silent, but no other behavior changes. The sampleMap entries still reference those names; they simply fall back to Strudel's silence-on-missing-sample behavior.
- Reverting the sampleMap upgrades in `rhythm-harmony-recipes.ts` restores the Phase 01 fallback names (`'perc'`). The plumbing is unchanged and carries no knowledge of the upgrade.
- Pre-Phase-04 sessions with `strudelSample: 'perc'` continue to work — the plumbing emits whatever string is in `strudelSample`.
- The committed audio files in `public/samples/` are inert if the `samples()` call is absent — no behavior change.

**Acceptance criteria in this step:**
- A-04-01 (full): the `samples()` registration call for `conga`, `cajon`, and `wood` is present in `initAudio()`; propagation tests confirm the names flow through to codegen output.
- A-04-02 (full): upgraded genre recipes emit authentic sample names in codegen output — propagation tests confirm.
- A-04-03 (full): recipes without an available authentic name retain Phase 01/03 fallbacks unchanged — propagation tests confirm.
- A-04-04 (full): `public/samples/` contains the committed FreePats files and `LICENSE.txt`; `pnpm build` includes them in `dist/` — confirmed by checking `dist/samples/` after build.
- A-04-05 (full): `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1698 + all new tests; `pnpm build` succeeds.
- A-04-06 (full): seam grep returns zero genre-name matches outside `src/core/music-knowledge/`; `'conga'`, `'cajon'`, `'wood'` appear only in `audio/strudel.ts` (palette declaration) and `src/core/music-knowledge/` (mapping) — not in any other `src/` file.

**Validation:** all gate commands + seam grep recorded in the handoff with output.

**CHECKPOINT → Commit message:**
`chore(authentic-groove): Phase 04 step 04.5 — propagation tests + seam check + quality gate`

---

## Phase Acceptance

| ID | Description | Validation method |
|---|---|---|
| A-04-01 | `initAudio()` registers `conga`, `cajon`, and `wood` via a `samples()` call using `import.meta.env.BASE_URL`-prefixed URLs; the call uses only palette-level names (no genre identifiers); the URL construction logic is unit-testable via an extracted helper | unit: `sample-registration.test.ts` (helper test); propagation tests confirm names flow to codegen |
| A-04-02 | Genre recipes whose Phase 01/03 fallback was upgradeable (`'perc'`) now carry the authentic FreePats name in `sampleMap`; applying one of those recipes emits the authentic Strudel sample name in the generated code | unit: `sample-map.test.ts` + `propagation.test.ts` |
| A-04-03 | Genre recipes for which no authentic sample is available (west-African bell patterns, latin-jazz cascara, samba caixa) retain their Phase 01/03 fallback name unchanged; no regression in their codegen output | unit: `propagation.test.ts` |
| A-04-04 | `public/samples/` contains the committed FreePats CC0 audio files and `LICENSE.txt`; after `pnpm build`, `dist/samples/` contains the same files | live-system: `ls dist/samples/` recorded in handoff |
| A-04-05 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1698 + all new tests; `pnpm build` succeeds | live-system: recorded in handoff |
| A-04-06 | No genre name appears in `src/` outside `src/core/music-knowledge/`; `'conga'`, `'cajon'`, `'wood'` appear only in `audio/strudel.ts` (palette declarations) and `src/core/music-knowledge/` (mappings), nowhere else in `src/` | live-system: `git grep` recorded in handoff |

---

## Partial coverage from prior phase

No prior Acceptance IDs were left partial at Phase 03 completion — all five Phase 03 criteria reached FULL. The Phase 01/03 sampleMap fallbacks that still use `'perc'` (10 entries) were documented as deferred in the Phase 03 handoff. Phase 04 addresses the subset of those that can now be upgraded using FreePats names (`conga`, `cajon`, `wood`). The remainder (west-African bell roles, latin-jazz cascara, samba caixa) are correctly assessed as not upgradeable by any available CC0 source and remain as Phase 01 fallbacks.

**Deferred items (unchanged from Phase 03):**
- Dimension 2 (per-hit accent/velocity variation) — deferred per initiative scope.
- Dimension 3 (swing/groove feel) — deferred per initiative scope.
- Dimension 4 (role-based polyrhythmic layering) — deferred per initiative scope.
- 12-step grid support (cueca 12/8, bulería 12/8) — deferred per phase scope boundary.
- Pandeiro one-shots — no good CC0 source found; `'hand'` from Phase 03 is the best available.
- Guacharaca/scraper — no CC0 source found.
- Pentagrama `NoteSlot` free placement — carried from orbifold-v2 Ph10.
- Per-chord `lpf`/`lpq` slider D-3 — carried from harmonic-rhythm-improvements.

---

## ADR Triggers

No new ADR anticipated for sample registration of CC0 static assets — this is a palette extension explicitly deferred in ADR 0025 D-Deferred ("Future phases may add `samples()` calls to load richer packs"). The mechanism is already governed by ADR 0025 D3.

Two decisions that the inventory may surface for Pilot resolution (not Planner-resolvable):
- **OGG vs. WAV format** — if the inventory confirms OGG is supported by `@strudel/web@1.0.3`, OGG is preferred. If it is not confirmed, WAV is the fallback. The inventory step reports the finding; if OGG is confirmed, no Pilot decision is needed (use OGG). If the finding is ambiguous, the Dev surfaces a blocker before step 04.2.
- **`ffmpeg` unavailability** — if `ffmpeg` is not found in the dev environment, the Dev documents the finding in inventory §1 and surfaces it as a blocker before step 04.2. Pre-converted files from the FreePats release archive (if available) are an alternative, but the Pilot must approve the source before binary files are committed.

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/authentic-groove/handoffs/phase-04-handoff.md`. See `handoff-template.md`.
