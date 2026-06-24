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

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**
