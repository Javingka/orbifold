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

---

## Step 02.2 — ADR: Variable Chord Duration via arrange()

**Date:** 2026-06-10
**Commit(s):**

- **Terminal commit:** `docs(adr): Phase 02 step 02.2 — ADR 0010 variable chord duration via arrange()`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-02-inventory.md`, `src/core/codegen/strudel.ts`, `src/core/composition/model.ts`, all nine existing ADRs in `docs/adr/`.
- Confirmed `arrange()` call pattern verbatim from `buildComposition` in `model.ts` (lines 81–102), confirming API availability and format in `@strudel/web@1.0.3`.
- Confirmed the `@`-weight operator problem: `note("<[A]@2 [B]>")` is proportional within one cycle, not multi-cycle duration.
- Wrote `docs/adr/0010-variable-chord-duration.md` with Status, Context, Decision, and Consequences sections.
- ADR covers: dual-mode codegen rationale, `Chord.bars` field spec, `arrange()` form with per-chord inline gain, backward compatibility guarantee, schema version stay-at-1 rationale, agent schema extension consequence (step 02.3), and `.fast`/`.slow` invariant confirmation.
- No source code written.

### Files touched

- `docs/adr/0010-variable-chord-duration.md` — created
- `docs/orbifold-v2/handoffs/phase-02-handoff.md` — updated (this entry)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are directly covered by this step (ADR-only step). The ADR governs the decisions implemented in steps 02.3–02.5, which cover A-02-01 through A-02-09.

### Routine validations (one-liner each, no transcripts)

No source code written; no build/test/lint runs required for this step.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-02-01 | Each chord carries optional `bars` field (multiples of 0.5, min 0.5, max 8, default 1) | — | — | not covered — deferred to step 02.3 |
| A-02-02 | `melodyLine()` is byte-identical to pre-phase when all bars === 1 or undefined | — | — | not covered — deferred to step 02.4 |
| A-02-03 | `melodyLine()` emits `arrange()` when any chord has bars !== 1 | — | — | not covered — deferred to step 02.4 |
| A-02-04 | ProgressionStrip renders proportional segment widths | — | manual | not covered — deferred to step 02.5 |
| A-02-05 | Drag resize handle changes chord bars and calls setChordBars | — | manual | not covered — deferred to step 02.5 |
| A-02-06 | Resize gesture and gain-drag gesture are fully independent | — | manual | not covered — deferred to step 02.5 |
| A-02-07 | Prior Phase 01 interactions (gain drag, tap-preview, remove) work without regression | — | manual | not covered — deferred to step 02.5 |
| A-02-08 | Existing saved sessions without `bars` load and play correctly | — | — | not covered — deferred to step 02.3 |
| A-02-09 | All quality gates pass; test count ≥ 184 | — | — | not covered — deferred to step 02.4 |

**Notes on partial coverage:** All nine acceptance IDs are deferred; this step is a docs-only ADR that governs the design. Implementation proceeds in steps 02.3–02.5.

### Decisions made (if any)

- **Dual-mode codegen path** (OD-02-01 resolved): `melodyLine()` uses the existing `<…>` slowcat form when all chords have `bars === 1` or `bars` is undefined, and switches to `arrange()` only when at least one chord has `bars !== 1`. Rationale: byte-identical output for the common case; no disruption to the proven slowcat path for existing sessions.
- **`@`-operator rejected:** The `@` proportional-weight operator inside `<…>` does not produce multi-cycle durations; it is a within-cycle proportional weight. Rejected to avoid silent musical misrepresentation.
- **Per-chord inline gain in `arrange()` path:** The parallel `.gain("<g1 g2 …>")` pattern does not work across independent `arrange()` segment expressions. Each segment carries its own `gain(value)` inline.
- **No schema version bump:** `SESSION_SCHEMA_VERSION` stays at 1. Adding `bars` as an optional field is backward-compatible; existing sessions parse without a version change.
- **Agent `HarmonyChordSchema`:** Will be extended with `bars?: number` in step 02.3 (Pilot-confirmed), allowing the AI to set chord durations when building progressions.

### Proposed Decisions Register entries (if any)

None — the dual-mode decision is captured in ADR 0010 directly.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 180 tests passing (unchanged).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged).
- No source code changed.

### Next-step context (only if non-obvious)

- This is a **Pilot Checkpoint**. Step 02.3 must not proceed until the Pilot confirms the ADR.
- Step 02.3 will add `bars?: number` to `Chord`, implement `clampBars()` and `setChordBars()`, update `SavedChordSchema`, update serialization/deserialization round-trip, and extend `HarmonyChordSchema` and `apply.ts` in the agent.
- The `clampBars` helper is exported so both `setChordBars` (session.ts) and the agent `apply.ts` can use it without duplication.

### Planner Review

(Filled by the Planner in review mode)
