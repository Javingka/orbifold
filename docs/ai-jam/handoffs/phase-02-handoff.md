<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Handoff — Phase 02 (AI Jam / Music Knowledge Catalog)

---

## Step 02.1 — Inventory (Checkpoint #1)

**Date:** 2026-06-19

**Commit(s):**

- **Terminal commit:** `docs(ai-jam): Phase 02 step 02.1 — music-knowledge inventory`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 1

### Completed

- Read `CLAUDE.md` (full — initiative context, invariants, conventions).
- Read `references/methodology.md` (full — inventory-step protocol).
- Read `docs/ai-jam/decisions.md` (full — OD-1 and OD-2 confirmed as RESOLVED at 2026-06-19; all carried-forward rules).
- Read `docs/ai-jam/handoffs/phase-01-handoff.md` (full — format reference; confirmed phase 01 fully closed).
- Read `docs/ai-jam/phases/phase-02.md` (full — step 02.1 PROMPT, implementation requirements for 02.2–02.5, all acceptance criteria A-02-01..A-02-07).
- Read `src/agent/schema.ts` (full, 274 lines) — confirmed all four schema constraints: steps=16; euclid k∈[1,16] / n∈[2,16] / rot∈[0,n-1]; quality∈{maj,min,dim,aug}; root=z.string() (NOTE_NAMES conventional); bars∈[0.25,8].
- Read `src/core/rhythm/euclid.ts` (full, 71 lines) — confirmed canonical engine: `bjorklund(k, n)` + `rotate(arr, r)`; `RSTEPS=16` is a default for `stepsFromHits`, not a constraint on `bjorklund`.
- Read `src/core/codegen/strudel.ts` (full, 285 lines) — confirmed strudel emission patterns; mini-notation conventions for rhythm lines.
- Read `src/core/theory/pitch.ts` (full, 59 lines) — confirmed `NOTE_NAMES` (12 entries, C..B sharp spelling, indices 0–11).
- Read `src/core/theory/chords.ts` (full, 68 lines) — confirmed `Quality = 'maj' | 'min' | 'dim' | 'aug'` (4-member schema triad vocabulary).
- Read `src/core/composition/snapshot.ts` (full, 299 lines) — confirmed `ChordSnapshotEntry.qual` stays within the 4-member triad vocabulary.
- Produced `docs/ai-jam/inventories/phase-02-inventory.md` covering all nine sections §(a)–§(j).
- Verified OD-1 downsample fallback is total: all 17 catalog quality members map to one of the 4 schema triads (table in §(e.1)).
- Verified OD-2 feasibility: `bjorklund(k, n)` returns length-`n` arrays for any `n` — 8-step and 12-step euclid entries are valid native-grid representations.
- Did NOT write any source file or test file.

### Files touched

- `docs/ai-jam/inventories/phase-02-inventory.md` (created)
- `docs/ai-jam/handoffs/phase-02-handoff.md` (created, this entry)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are claimed in this docs-only inventory step. All seven acceptance criteria (A-02-01 through A-02-07) are targeted by steps 02.2–02.5.

### Routine validations (one-liner each, no transcripts)

- `git status` → only `docs/ai-jam/inventories/phase-02-inventory.md` and `docs/ai-jam/handoffs/phase-02-handoff.md` as new untracked files. No `.ts` or `.svelte` files modified.
- No `pnpm test` or `tsc --noEmit` run (no source files modified; prior quality gates remain valid from Phase 01 step 01.5).

### Acceptance Coverage Table

No Acceptance IDs are covered in this docs-only inventory step.

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-02-01 | Rhythm catalog ≥30 entries; each with stable id, meter, roles, binary+onsets+mini | — | — | not yet — targeted in step 02.2 |
| A-02-02 | All rhythm representations mutually congruent; euclid entries reproduce binary via real engine | — | — | not yet — targeted in step 02.2 |
| A-02-03 | Harmony catalog ≥8 entries; each with stable id, modeCenter, chordMode, valid chords | — | — | not yet — targeted in step 02.3 |
| A-02-04 | Recipe catalog ≥8 recipes; referential integrity to both catalogs; valid bpmRange and meter | — | — | not yet — targeted in step 02.4 |
| A-02-05 | `findRecipesForPrompt` returns expected recipes for intent phrases; id getters return entry or undefined | — | — | not yet — targeted in step 02.5 |
| A-02-06 | No new runtime dependency; no audio files; no DOM/PIXI/Svelte import | — | — | not yet — confirmed feasible in §(g), verified in step 02.5 |
| A-02-07 | Byte-identical guarantee; all quality gates pass | — | — | not yet — verified in step 02.5 |

### Decisions made (if any)

None — this is a read-only discovery step. OD-1 and OD-2 are already RESOLVED by the Pilot (recorded in `decisions.md`). The inventory documents them as resolved and confirms feasibility.

### Proposed Decisions Register entries (if any)

None. OD-1 and OD-2 cover all decisions surfaced.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

Clean working tree (docs-only). All prior quality gates (750/750 tests, `tsc --noEmit`, `pnpm lint`, `pnpm build`) remain passing — no source files modified.

### Key findings summary

1. **Schema step constraint is hard at 16:** `z.array(...).length(16)` in `RhythmLayerStepsSchema` (schema.ts line 54). Non-16 catalog entries (e.g., 8-step clave, 12-step bell) cannot be emitted as `steps[]` without upsample/downsample. The `strudelStrategy: 'struct'` marker is the correct signal for deferred reconciliation.

2. **`bjorklund(k, n)` is n-native:** The function returns `number[]` of length `n`, not length 16. `RSTEPS = 16` is only a default for `stepsFromHits`, which is a separate utility. Catalog entries with `euclid: { k, n, rot }` where `n != 16` (e.g., E(3,8), E(7,12)) are well-formed and the congruence test correctly calls `bjorklund(k, n)` expecting a length-`n` result.

3. **OD-1 downsample is total (17/17):** Every catalog quality maps to one of `maj/min/dim/aug`. Notably `sus2` and `sus4` (no third) map to `maj` as the closest functional triad — this is a mild approximation that downstream code should note. The full mapping table is in `docs/ai-jam/inventories/phase-02-inventory.md` §(e.1).

4. **Purity is guaranteed:** All required utilities (`NOTE_NAMES`, `bjorklund`, `rotate`) are already in `src/core/theory/` and `src/core/rhythm/` — both pure modules with no DOM/PIXI/Svelte imports. `src/core/music-knowledge/` can import them directly without violating the `core/**` invariant.

5. **No new dependencies required:** The phase is achievable with existing project utilities. `pnpm add` is not needed.

### Next-step context

Pilot review of this inventory is mandatory before step 02.2 begins (methodology principle 4 — inventory steps always pause for Pilot review). After Pilot review and approval, step 02.2 proceeds to create `src/core/music-knowledge/rhythm-catalog.ts` with ≥30 entries and `tests/music-knowledge/rhythm-catalog.test.ts`.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** 1 of 1
**Reason:**
**Next action:**
