<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 03 — Authentic Sample Registration (Dimension 1 upgrade)

**Purpose:** Upgrade the Dimension 1 sample palette by registering additional dirt-samples folders (`conga`, `wood`, and others verified in the inventory) via a targeted `samples()` call added to the Strudel init path, then replace the Phase 01 fallbacks in `sampleMaps` with the authentic names now that they are loadable.

**Gate:** Phase 02 complete and merged to `main`; `pnpm test` passes at 1693; `SCHEMA_VERSION = 6`; `SESSION_SCHEMA_VERSION = 5`; ADR 0025 in force; AG-D1 seam invariant in force.

**Expected phase result:** Playing a cumbia recipe emits `s("conga(…)")` instead of `s("perc(…)")`; other genre recipes similarly emit culturally closer instrument names where Phase 01 used a fallback. The Strudel init path registers the additional sample folders once at audio init; the sample-registration list in `audio/strudel.ts` is a palette declaration with no genre knowledge (AG-D1 still holds). All existing tests pass and the seam grep returns zero matches.

---

## Architectural note (hard invariant for every step)

`src/audio/strudel.ts` already calls `samples('github:tidalcycles/dirt-samples')` on line 165. This registers the folders listed in the repository's `strudel.json` manifest. The Pilot confirmed that `conga` and `wood` are **not** in that manifest (they play silent). To make them available, an additional `samples()` call must register the missing folders by explicit URL, or the manifest call must be extended — the inventory step determines the correct mechanism.

The list of folder names registered in `audio/strudel.ts` (e.g. `['conga', 'wood', ...]`) does NOT violate AG-D1. Those are palette declarations, not genre→sample mappings. Genre names and the mapping `genre→sample` must NOT appear in `audio/strudel.ts`.

---

## Step 03.1 — Inventory

PROMPT → Read the source files, verify the `tidalcycles/Dirt-Samples` repository structure and `strudel.json` manifest live, determine the correct `samples()` API call to register missing folders, and identify exactly which current `sampleMap` fallbacks in `rhythm-harmony-recipes.ts` can be upgraded. Produce `docs/authentic-groove/inventories/phase-03-inventory.md`. Do NOT write any source file. STOP for Pilot review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (confirm AG-D1 and ADR 0025 entries are present)
3. `docs/adr/0025-authentic-sample-palette.md` (D1–D7, especially D3 seam invariant)
4. `src/audio/strudel.ts` (full — confirm the existing `samples('github:tidalcycles/dirt-samples')` call and its position in `initAudio()`)
5. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — all 15 recipes; note every `sampleMap` entry that uses a fallback comment `// fallback: no native '<x>' in @strudel/web@1.0.3`)
6. `docs/authentic-groove/inventories/phase-01-inventory.md` §2 (the Phase 01 verified sample list — baseline to build on, but the Dev must re-verify live; do not rely on stale Phase 01 data for new samples)
7. Live verification (mandatory — do NOT assume from memory):
   - Fetch `https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/strudel.json` and record which folder names are present.
   - For each folder of interest (`conga`, `wood`, `bottle`, `bass3`, `crow`, and any others named in the Phase 01 fallback comments), confirm whether the folder appears in `strudel.json`. If it does, it is already registered by the existing `samples('github:tidalcycles/dirt-samples')` call.
   - If a folder is NOT in `strudel.json`, record what a `samples()` call that registers it individually would look like. Strudel's `samples()` accepts a record of `{ sampleName: [url, ...] }` or `{ sampleName: url }` as its first argument, in addition to the GitHub shorthand. Verify the correct file path within the repo (e.g. `https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/conga/0_conga.wav`) by fetching the index for that folder, or by consulting live Strudel docs (`https://strudel.cc/learn/samples/`).
   - Check whether calling `samples()` multiple times (once for the manifest, once for individual folders) is supported by `@strudel/web@1.0.3`. Look at how `samples()` is documented — does it merge registrations or overwrite?

**Inventory sections (all four required):**

**§1 — Current `samples()` call and what it registers.**
Quote the exact line from `strudel.ts`. State what `'github:tidalcycles/dirt-samples'` resolves to at runtime (the strudel.json manifest URL). List every folder name confirmed present in the live strudel.json. Note the Pilot-confirmed missing folders (`conga`, `wood`).

**§2 — Missing folders and the correct registration API.**
For each folder the Pilot identified as missing (`conga`, `wood`) and any others verified absent from strudel.json:
- Confirm absence from strudel.json.
- Identify the exact filenames in the repo (fetch the folder listing or the raw file at the expected path).
- State the `samples()` call that would register it — exact object shape and URL(s). Example shape: `samples({ conga: ['https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/conga/0_conga.wav', '...'] })`.
- Confirm whether `@strudel/web@1.0.3` supports additive `samples()` calls (merges, not overwrites). If it does not, describe the alternative (e.g. a single manifest-style call that includes both the dirt-samples folders and the custom additions).
- State whether the additional `samples()` call must be `await`ed, or whether it can be fire-and-forget. Strudel typically starts the load but pattern evaluation uses the sample lazily — confirm this behavior from live docs.

**§3 — sampleMap upgrade plan.**
For each recipe in `rhythm-harmony-recipes.ts` that has a fallback comment (`// fallback: no native '<x>' in @strudel/web@1.0.3`):
- State the current fallback name.
- State whether the authentic name is now resolvable (i.e., it appears in strudel.json, or will be registered by the new `samples()` call in §2).
- State the proposed upgrade: `fallback → authentic_name` or "keep fallback — no authentic sample available" with reason.
- List recipes with no sampleMap that could now benefit from one (if any new authentic sample unlocks a previously unfeasible mapping).

**§4 — AG-D1 impact and seam grep extension.**
Describe what additional sample names will appear in `src/audio/strudel.ts` (palette declaration only, no genre names). Confirm that none of the new sample names constitute a seam violation (they are generic instrument names, not genre identifiers). State the exact seam grep extension needed (if any) to verify the `strudel.ts` change remains clean.

**Implementation requirements:** Read only. Produce the inventory file. Touch no `.ts` or `.svelte` files.

**Validation:**
- `git status` → only `docs/authentic-groove/inventories/phase-03-inventory.md` and `docs/authentic-groove/handoffs/phase-03-handoff.md` are new/modified.

**CHECKPOINT → Commit message:**
`docs(authentic-groove): Phase 03 step 03.1 — authentic sample registration inventory`

**STOP for Pilot review.** The inventory §2 mechanism must be confirmed before step 03.2.

---

## Step 03.2 — Sample registration in `initAudio()`

PROMPT → Read the inventory and add the additional `samples()` call to `src/audio/strudel.ts` to register the missing authentic sample folders. No sampleMap changes in this step.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-03-inventory.md` §1, §2 (the exact mechanism and URL(s))
2. `docs/authentic-groove/decisions.md` (AG-D1 — seam invariant: no genre name in `audio/strudel.ts`)
3. `docs/adr/0025-authentic-sample-palette.md` (D3 — seam invariant)
4. `src/audio/strudel.ts` (full — before editing; confirm the exact position of the existing `samples()` call)

**What to produce:**

`src/audio/strudel.ts` — add the additional `samples()` call per the inventory §2 mechanism:
- Position: in `initAudio()`, alongside the existing `samplesReady` declaration. The additional call must be included in the same `Promise.all(...)` that already awaits `samplesReady`, OR be `await`ed immediately after — whichever the inventory §2 confirms is correct for the `@strudel/web@1.0.3` API.
- The call registers only verified authentic sample names (from inventory §2). No genre name appears in the call.
- Add a JSDoc comment on the new call: "Additional authentic percussion samples not included in the dirt-samples strudel.json manifest. Registered here as a palette declaration — no genre knowledge. See ADR 0025 D3 and Phase 03 inventory §2."
- The existing `samples('github:tidalcycles/dirt-samples')` call is NOT removed or modified.
- `SCHEMA_VERSION` stays 6; `SESSION_SCHEMA_VERSION` stays 5.

New `tests/authentic-groove/sample-registration.test.ts` (AGPL-3.0 header):
- The test cannot invoke the real WebAudio runtime in Vitest. Instead, test that the `initAudio` module exports the function and that the source contains the expected `samples()` call for the new folders — use a static-analysis approach: import `strudel.ts` as a string (via `?raw` Vite import, or read the file contents in the test) and assert the presence of the registered sample names in the source. This is a `proxy:static-analysis` test; disclose the proxy use in the Acceptance Coverage Table.
- Alternatively: mock `samples` at the module level, call a thin exported helper that issues the registration calls, and assert the mock was called with the correct arguments. Use whichever approach is more reliable in the Vitest environment — document the choice in the handoff.

**Constraints:** No genre name in `strudel.ts`. No mock that requires DOM or WebAudio. AGPL-3.0 header on new test file. Do NOT change the existing `samples('github:tidalcycles/dirt-samples')` line — only add to it.

**Acceptance criteria in this step:**
- A-03-01 (partial): the additional `samples()` call is present in `initAudio()` with the correct argument(s) — static-analysis test confirms.
- A-03-04 (partial): `tsc --noEmit` clean; `pnpm test` ≥ 1693 + new tests.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run sample-registration` → new test(s) pass
- `pnpm test` → no regressions
- `git status` → only `src/audio/strudel.ts` (modified), `tests/authentic-groove/sample-registration.test.ts` (new), handoff entry

**Commit message:**
`feat(audio): Phase 03 step 03.2 — register authentic percussion samples in initAudio`

---

## Step 03.3 — sampleMap upgrades in the recipe catalog

PROMPT → Read the inventory §3 upgrade plan and replace Phase 01 fallback names in `rhythm-harmony-recipes.ts` with the authentic sample names now that they are registered. All changes stay inside `src/core/music-knowledge/`.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-03-inventory.md` §3 (upgrade plan — which fallbacks are replaceable and with what authentic name)
2. `docs/adr/0025-authentic-sample-palette.md` (D2, D3, D6 — sampleMap rules, seam, fallback policy)
3. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — before editing)
4. `tests/authentic-groove/sample-map.test.ts` (full — existing 60 tests; understand the verified fixture list so new authentic names can be added to it)

**What to produce:**

`src/core/music-knowledge/rhythm-harmony-recipes.ts` — for each recipe identified in inventory §3 as upgradable:
- Replace the fallback sample name with the authentic name.
- Replace the fallback comment with an authentic comment (or remove the comment if the name is now a first-class match). If the authentic name is still an approximation, keep a comment noting the degree of authenticity.
- Do NOT touch recipes identified in §3 as "keep fallback — no authentic sample available."
- Do NOT add or remove any `sampleMap` entries that are not in the §3 upgrade list.

Updated `tests/authentic-groove/sample-map.test.ts` — extend the verified fixture list to include the new authentic sample names introduced in this step. Assert per-recipe value expectations for upgraded recipes (e.g., if cumbia now maps `bd → 'conga'`, assert that). The existing 60 tests must still pass; new assertions are additive.

**Constraints:** All changes confined to `src/core/music-knowledge/` and `tests/`. No change to `recipe-engine.ts`, `apply.ts`, `autopilot.ts`, or any plumbing file. AGPL-3.0 header already present on `rhythm-harmony-recipes.ts` — do not modify it.

**Acceptance criteria in this step:**
- A-03-02 (partial): genre recipes with upgraded fallbacks now carry the authentic sample name in `sampleMap` — unit tests confirm.
- A-03-03 (partial): recipes for which no authentic name is available retain their Phase 01 fallback unchanged — confirmed by absence of change in those entries + test assertions.
- A-03-04 (partial): `tsc --noEmit` clean; `pnpm test` ≥ prior + updated/new tests.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run sample-map` → all sample-map tests pass (original 60 + new/updated assertions)
- `pnpm test` → no regressions
- `git status` → only `src/core/music-knowledge/rhythm-harmony-recipes.ts` (modified), `tests/authentic-groove/sample-map.test.ts` (modified), handoff entry

**Commit message:**
`feat(music-knowledge): Phase 03 step 03.3 — upgrade sampleMap fallbacks to authentic names`

---

## Step 03.4 — End-to-end propagation test + seam fitness check + full quality gate

PROMPT → Verify that the upgraded sampleMaps propagate through the full apply path (recipe → `strudelSample` → codegen output), run the seam fitness grep, and run the full quality gate. Record all output in the handoff.

**Required reading (in order):**

1. `docs/authentic-groove/inventories/phase-03-inventory.md` §3 and §4
2. `docs/authentic-groove/handoffs/phase-03-handoff.md` (confirm 03.2 and 03.3 are APPROVED)
3. `docs/adr/0025-authentic-sample-palette.md` (D3 — the seam invariant + grep command)
4. `tests/authentic-groove/propagation.test.ts` (existing 15 tests — understand what to extend)

**What to produce:**

Extended `tests/authentic-groove/propagation.test.ts` — add tests for upgraded recipes:
- For each recipe where inventory §3 confirms the fallback was replaced with an authentic name, add a test asserting the upgraded name propagates through `applySampleMap` and that `rhythmLayerToStrudelLine` emits the authentic name (not the old fallback). Pattern: same as the existing cumbia and samba tests.
- Existing 15 tests must still pass. If an existing test asserted a specific fallback name that has now been upgraded (e.g. `strudelSample: 'perc'` for cumbia), update the assertion to match the new authentic name. Document this update explicitly in the handoff.

Run and record the seam fitness check (AG-D1 extended to cover `strudel.ts`):
- Run the genre-token grep from Phase 01/02: confirm zero genre names in `src/` outside `src/core/music-knowledge/`.
- Additionally, run a grep for the new authentic sample names scoped to `src/audio/strudel.ts` to confirm they appear there (as expected palette declarations) and NOT in any other plumbing file (codegen, apply, persistence).

Run and record the full quality gate:
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

**Reversibility / flag-off note (required per CLAUDE.md), verbatim in handoff:**
- The additional `samples()` call in `initAudio()` is additive. Reverting it means those sample names play silent, but no other behavior changes. The sampleMap entries still reference the names; they simply fall back to Strudel's silence-on-missing-sample behavior. This is the same silent behavior the Pilot observed before Phase 03.
- Reverting the sampleMap upgrades in `rhythm-harmony-recipes.ts` restores the Phase 01 fallback names. The plumbing (`applySampleMap`, codegen) is unchanged and carries no knowledge of the upgrade.
- Pre-Phase-03 sessions with `strudelSample: 'perc'` (or any Phase 01 fallback) continue to work — the plumbing emits whatever string is in `strudelSample`.

**Acceptance criteria in this step:**
- A-03-01 (full): the authentic `samples()` registration call is present in `initAudio()` and the propagation tests confirm the authentic sample names flow through to codegen output.
- A-03-02 (full): upgraded genre recipes emit authentic sample names in codegen output — propagation tests confirm.
- A-03-03 (full): recipes without an available authentic name retain Phase 01 fallbacks unchanged — propagation tests confirm.
- A-03-04 (full): `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1693 + all new tests; `pnpm build` succeeds.
- A-03-05 (full): seam grep returns zero genre-name matches outside `src/core/music-knowledge/`; authentic sample names appear only in `audio/strudel.ts` (palette declaration) and `src/core/music-knowledge/` (mapping) — not in any other `src/` file.

**Validation:** all gate commands + seam grep recorded in the handoff with output.

**Commit message:**
`chore(authentic-groove): Phase 03 step 03.4 — end-to-end tests + seam check + quality gate`

---

## Phase Acceptance

| ID | Description | Validation method |
|---|---|---|
| A-03-01 | `initAudio()` registers the additional authentic sample folders via a `samples()` call; the call uses only palette-level names (no genre identifiers) | unit: `sample-registration.test.ts` (proxy:static-analysis); propagation tests confirm names flow to codegen |
| A-03-02 | Genre recipes whose Phase 01 fallback was upgradeable now carry the authentic sample name in `sampleMap`; applying one of those recipes emits the authentic Strudel sample name in the generated code | unit: `sample-map.test.ts` + `propagation.test.ts` |
| A-03-03 | Genre recipes for which no authentic sample is available in the registered palette retain their Phase 01 fallback name unchanged; no regression in their codegen output | unit: `propagation.test.ts` |
| A-03-04 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1693 + all new tests; `pnpm build` succeeds | live-system: recorded in handoff |
| A-03-05 | No genre name appears in `src/` outside `src/core/music-knowledge/`; authentic sample names are present in `audio/strudel.ts` as palette declarations and in `src/core/music-knowledge/` as mappings, and nowhere else in `src/` | live-system: `git grep` recorded in handoff |

---

## Partial coverage from prior phase

No prior partials to address — all Phase 01 and Phase 02 acceptance criteria were fully covered. The Phase 01 sampleMaps used documented fallbacks because authentic samples were not available in the strudel.json manifest. Phase 03 upgrades those fallbacks now that registration is confirmed possible.

**Deferred items (unchanged):**
- Dimension 2 (per-hit accent/velocity variation) — deferred per initiative scope.
- Dimension 3 (swing/groove feel) — deferred per initiative scope.
- Dimension 4 (role-based polyrhythmic layering) — deferred per initiative scope.
- 12-step grid support (cueca 12/8, buleria 12/8) — deferred per phase scope boundary.
- Pentagrama `NoteSlot` free placement — carried from orbifold-v2 Ph10.
- Per-chord `lpf`/`lpq` slider D-3 — carried from harmonic-rhythm-improvements.

---

## ADR Triggers

No new ADR anticipated. The `samples()` registration mechanism is a palette extension covered by ADR 0025 D3 (seam invariant) and does not require a new governance decision. If the inventory reveals that `@strudel/web@1.0.3` does NOT support additive `samples()` calls (overwrites instead of merges), or requires a significantly different mechanism than expected, the Dev surfaces a blocker before writing code — that would be an ADR-worthy discovery.

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/authentic-groove/handoffs/phase-03-handoff.md`. See `handoff-template.md`.
