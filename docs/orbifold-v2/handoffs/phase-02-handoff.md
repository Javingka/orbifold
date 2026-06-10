# Phase 02 Handoff — Variable Chord Duration

---

## Step 02.1 — Inventory

**Date:** 2026-06-10
**Commit(s):**

- **Terminal commit:** `docs(harmony): Phase 02 step 02.1 — phase-02 inventory`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `pilot-machine-pack/skill/pilot-machine/references/dev-role.md`, `docs/orbifold-v2/decisions.md`, `docs/glossary.md`, `docs/orbifold-v2/phases/phase-02.md`, `docs/orbifold-v2/handoffs/phase-01-handoff.md` (completion entry).
- Read all source files named in step 02.1 PROMPT: `src/core/codegen/strudel.ts`, `src/state/session.ts`, `src/ui/ProgressionStrip.svelte`, `src/lib/persistence.ts`, `src/core/composition/model.ts`.
- Also read `src/agent/schema.ts` (per step 02.1 requirement to check for `ChordSchema` or equivalent).
- Also confirmed ADR directory contents (`docs/adr/`) to identify next available number.
- Confirmed `Chord` interface shape: `rootPc: number`, `qual: Quality`, `gain: number` (REQUIRED), `cx?: number`, `cy?: number`. `bars` does not yet exist. `gain` is required (not optional).
- Confirmed `melodyLine()` current slowcat form verbatim: `  note("<${seq}>").s("sawtooth").lpf(1200).gain("<${gains}>").room(0.3)`.
- Confirmed `SavedChordSchema` shape: `rootPc`, `qual`, `gain` only. `SESSION_SCHEMA_VERSION = 1`. No version bump needed for additive optional `bars` field.
- Confirmed `arrange()` already used in `buildComposition` (`src/core/composition/model.ts` lines 81–102), confirming availability in `@strudel/web@1.0.3`.
- Confirmed `Block.bars` / `Track.blocks[].bars` use integer bar counts in the composition model. The new `Chord.bars` uses the same field name with fractional values (multiples of 0.5). Naming overlap is intentional — same unit (1 Strudel cycle = 1 bar of 4/4).
- Confirmed `ProgressionStrip.svelte` uses `flex: 1` on `.seg` elements (line 278), with a comment noting Phase 02 must replace it with computed widths.
- Confirmed next available ADR number is `0010` (ADRs 0001–0009 confirmed present in `docs/adr/`).
- Confirmed `src/agent/schema.ts` contains `HarmonyChordSchema` (lines 100–104) with `root`, `quality`, `gain` fields — no `bars` field. Agent schema is structurally independent of persistence schema (uses note names vs. pitch classes). Adding `bars` to the agent schema is out of scope for this phase.
- Surfaced open decision OD-02-01 (dual-mode vs. unified codegen path) — resolved by ADR in step 02.2.
- Produced `docs/orbifold-v2/inventories/phase-02-inventory.md`.
- No source code written.

### Files touched

- `docs/orbifold-v2/inventories/phase-02-inventory.md` — created
- `docs/orbifold-v2/handoffs/phase-02-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory step only).

### Routine validations (one-liner each, no transcripts)

No source code written; no build/test/lint runs required for this step.

### Acceptance Coverage Table

No Acceptance IDs touched by this step (inventory step — no source changes).

### Decisions made (if any)

- `gain` is required (not optional) on the `Chord` interface. The `melodyLine()` parameter accepts `gain?: number | null` as an API convenience, but the store's `Chord` objects always carry a concrete `number` value.
- Agent `HarmonyChordSchema` update (adding `bars`) is out of scope for this phase; flagged for Pilot awareness only.

### Proposed Decisions Register entries (if any)

None — no decisions in this step require a Register entry.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 180 tests passing (unchanged from Phase 01 close).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged).
- No source code changed; no environment changes.

### Next-step context (only if non-obvious)

- Step 02.2 writes ADR 0010. The ADR is a Pilot Checkpoint — implementation proceeds only after Pilot confirms the ADR.
- The dual-mode vs. unified codegen path question (OD-02-01) is documented in the inventory under "Open decisions for ADR." The ADR must address it explicitly.

### Planner Review

(Filled by the Planner in review mode)
