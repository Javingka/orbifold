<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 05 Handoff — Multi-Layer Recipes + Base-Lock Mechanism

---

## Step 05.1 — Inventory

**Date:** 2026-06-25
**Iteration:** 1 of 5

### Completed

- Read all 15 required source files and mandatory live verification sources.
- Confirmed AG-D1 in force. Confirmed `SCHEMA_VERSION = 6`, `SESSION_SCHEMA_VERSION = 5`, test count at 1720, `pnpm test` gate condition met (Phase 04 complete).
- Fetched `https://api.github.com/repos/freepats/world-percussion/contents/samples` live — confirmed `EggShaker` (11 FLAC) and `Maracas` (18 FLAC) both present and CC0.
- Confirmed CC0 license from README.txt verbatim quote.
- Grepped `rhythm-catalog.ts` for all 12-step entries: `cueca-chilena-base` exists (E(4,12,0)), `cueca-chilena-syncopated` exists (E(5,12,2)). No 12-step palmas entry (`'000010000010'`) or 12-step subdivision entry (`'101010101010'`) — both are new.
- Confirmed `eighth-notes-16` (E(8,16,0)) already exists — reused for cumbia `hh` layer.
- Confirmed `cueca-chilena-syncopated` is euclidEntry not structEntry (catalog comment at line 171 incorrectly lists it as struct — noted as discrepancy to fix).
- Traced full `applyRhythmSpec` implementation and `applyRecipeById` call chain.
- Identified need for `opts?: { force?: boolean }` parameter on `applyRhythmSpec` to bypass merge during recipe application.
- Identified that `recipeToAgentOutput` must iterate `recipe.layers` (not `recipe.rhythmIds`) when layers are present, using `layers[i].binary` directly.

**Live verification results:**

1. **FreePats shaker inquiry:** `EggShaker` folder confirmed: 11 FLAC files, CC0. `Maracas` also confirmed CC0 (18 files). Proposal: add 4 EggShaker files as `shaker` sample in Phase 05. No `cp` fallback needed.

2. **Cueca catalog check:** `cueca-chilena-base` (E(4,12,0), binary `'100100100100'`) confirmed. No palmas entry (`'000010000010'`) exists — new `cueca-palmas-12` struct entry proposed. No subdivision entry (`'101010101010'`) exists — new `cueca-subdivision-12` euclid E(6,12,0) entry proposed.

3. **Cumbia catalog check:** `cumbia-caja` (struct, 16 steps, binary `'1001001010001000'`) and `eighth-notes-16` (euclid E(8,16,0)) both confirmed as existing entries. No new catalog entry needed for cumbia.

4. **`recipeToAgentOutput` trace:** Current implementation iterates `recipe.rhythmIds`. When `recipe.layers` is present, the iteration must switch to `recipe.layers` to use `layers[i].binary` directly — enabling 12-step struct patterns (palmas) that are not expressible via the standard steps16 path.

5. **`applyRhythmSpec` trace:** Current implementation does a full replace. Lock-preservation merge requires reading locked layers before building the new set. Force-replace via `opts.force` is the recommended bypass for `applyRecipeById`.

### Files touched

- `docs/authentic-groove/inventories/phase-05-inventory.md` (new)
- `docs/authentic-groove/handoffs/phase-05-handoff.md` (this file, new)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in step 05.1 (inventory step — read-only).

- `git status` confirms only the two new doc files are new. No `.ts`, `.svelte`, or binary files modified.

### Routine validations

- `git status` → only `docs/authentic-groove/inventories/phase-05-inventory.md` and `docs/authentic-groove/handoffs/phase-05-handoff.md` are new/modified. No source files touched.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-05-01 | `RhythmLayer.locked?: boolean` field exists; codegen ignores it | — | — | not covered (inventory step) |
| A-05-02 | `applyRhythmSpec` preserves locked layers when called by the agent | — | — | not covered (inventory step) |
| A-05-03 | `applyLockedFlags(lockedSounds)` stamps `locked: true` on specified Sound slots | — | — | not covered (inventory step) |
| A-05-04 | `locked` field round-trips via `SavedRhythmLayerSchema`; pre-Phase-05 sessions load | — | — | not covered (inventory step) |
| A-05-05 | `recipeToAgentOutput` reads `recipe.layers[i].sound`; backward compat for layers-less recipes | — | — | not covered (inventory step) |
| A-05-06 | New catalog entries satisfy all 5 invariants; seam grep zero matches | — | — | not covered (inventory step) |
| A-05-07 | Cueca: 3 locked layers (`bd`, `cp`, `hh`); cumbia: 2 locked layers (`bd`, `hh`) with correct sampleMap | — | — | not covered (inventory step) |
| A-05-08 | `SYSTEM_PROMPT_EVOLUTION` contains locked-layer rule; stateSnapshot includes `locked` per layer | — | — | not covered (inventory step) |
| A-05-09 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1720 + new tests; `pnpm build` succeeds | — | — | not covered (inventory step) |

### Decisions made (if any)

- **Shaker source confirmed:** FreePats EggShaker CC0 — Option A proceeds. No `cp` fallback needed.
- **`recipeToAgentOutput` iteration change:** When `recipe.layers` present, iterate layers (not rhythmIds) and use `layers[i].binary` directly. This makes 12-step struct palmas expressible without AgentOutputSchema changes.
- **`applyRhythmSpec` force parameter:** `opts?: { force?: boolean }` added to bypass merge during `applyRecipeById`. Agent calls always omit `opts` (merge behavior). Recipe application calls with `{ force: true }` (full replace).
- **Layer order in merged result:** Locked layers first, then unlocked agent layers.

### Proposed Decisions Register entries (if any)

None — all decisions are within the boundaries of ADR 0025 and the phase spec.

### Environment state after this step

No source files modified. Repository state: Phase 04 complete, `main` branch, 1720 tests passing.

### Next-step context

- Step 05.2 must add `cueca-palmas-12` (struct, 12 steps, binary `'000010000010'`) and `cueca-subdivision-12` (euclid E(6,12,0), binary `'101010101010'`) to `rhythm-catalog.ts`.
- Step 05.2 must fix the catalog comment at line 171 (struct 12-step has 2 entries, not 3 — `cueca-chilena-syncopated` is euclidEntry).
- Step 05.4 must acquire 4 EggShaker FLAC files (`fast_01`, `fast_04`, `fast_07`, `fast_10`) and convert to OGG as `shaker_0.ogg`–`shaker_3.ogg`.
- The `SYSTEM_PROMPT_EVOLUTION` language (Spanish vs English) must be confirmed in step 05.3 before writing the locked-layer rule.

### Planner Review

**Planner Review:** APPROVED on 2026-06-25. Iteration: 1 of 5. All 8 sections present with live verification completed (FreePats API fetch recorded verbatim, catalog greps performed), all design questions resolved within ADR 0025 / AG-D1 boundaries, no Register conflicts, no source files touched.
**Next action:** Dev proceeds to step 05.2
