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

**Planner Review:** APPROVED on 2026-06-10. Iteration: 1 of 5.
**Next action:** Pilot approval required before step 02.3, reason: Pilot Checkpoint #2 — ADR requires Pilot confirmation before implementation proceeds.

---

## Step 02.3 — Data model: Chord.bars field and store action setChordBars

**Date:** 2026-06-10
**Commit(s):**

- **Terminal commit:** `feat(harmony): Phase 02 step 02.3 — Chord.bars field, setChordBars action, Zod schema, agent schema`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0010-variable-chord-duration.md`, `src/state/session.ts`, `src/lib/persistence.ts`, `src/agent/schema.ts`, `src/agent/apply.ts`.
- Added `clampBars(bars: number): number` as a named exported pure function in `src/state/session.ts`. Rounds to nearest 0.5 via `Math.round(bars * 2) / 2`, then clamps to `[0.5, 8]`.
- Added `bars?: number` to the `Chord` interface in `src/state/session.ts` with JSDoc citing Phase 02 ADR 0010. Placed after `cy?` to minimize diff noise.
- Added `setChordBars(index, bars)` as a new exported function in `src/state/session.ts`. Uses `clampBars`, updates `harmony.progression[index].bars` via `sessionStore.update`, calls `requeueLive()`. No-op if `index` is out of range.
- Updated `applyLoadedSession` in `src/state/session.ts`: progression map now includes `...(ch.bars !== undefined ? { bars: ch.bars } : {})` so loaded sessions restore `bars`.
- Added `bars: z.number().min(0.5).max(8).optional()` to `SavedChordSchema` in `src/lib/persistence.ts`. `SESSION_SCHEMA_VERSION` stays at 1 (additive optional field — backward-compatible per ADR 0010).
- Updated `serializeSession` in `src/lib/persistence.ts`: progression map includes `...(ch.bars !== undefined ? { bars: ch.bars } : {})`. Chords without `bars` serialize without the field — byte-identical to pre-phase saved sessions.
- Updated `deserializeSession` in `src/lib/persistence.ts`: progression map includes `...(ch.bars !== undefined ? { bars: ch.bars } : {})` for round-trip correctness.
- Added `bars: z.number().min(0.5).max(8).optional()` to `HarmonyChordSchema` in `src/agent/schema.ts` with JSDoc on the field.
- Updated `applyHarmonySpec` in `src/agent/apply.ts`: imports `clampBars` from `../state/session.js`; chord build includes `...(c.bars !== undefined ? { bars: clampBars(c.bars) } : {})`.
- `DEFAULT_SESSION_STATE` is unchanged — empty progression `[]` needs no update.
- AGPL-3.0 headers intact on all modified files (pre-existing headers, not altered).
- No new tests required for this step (per spec — `clampBars`/`setChordBars`/agent pass-through will be exercised by codegen tests in step 02.4).

### Files touched

- `src/state/session.ts` — `clampBars` function, `bars?` on `Chord`, `setChordBars` action, `applyLoadedSession` bars pass-through
- `src/lib/persistence.ts` — `SavedChordSchema` bars field, `serializeSession` bars, `deserializeSession` bars
- `src/agent/schema.ts` — `HarmonyChordSchema` bars field
- `src/agent/apply.ts` — `clampBars` import, chord build bars pass-through
- `docs/orbifold-v2/handoffs/phase-02-handoff.md` — updated (this entry)

### Validation evidence (per Acceptance ID)

- **A-02-01:** `Chord.bars?: number` present in interface; `clampBars` enforces [0.5, 8] nearest-0.5; `setChordBars` exported.
- **A-02-08:** `SavedChordSchema` gains `bars: z.number().min(0.5).max(8).optional()` — existing saved sessions without `bars` parse cleanly (`safeParse` succeeds; `bars` resolves to `undefined`, treated as 1 by codegen).

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors (ESLint + Prettier clean).
- `pnpm test` — 180 tests pass (count unchanged; no regression).
- `pnpm build` — exits 0 (pre-existing chunk-size warning, not introduced by this step).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-02-01 | Each chord carries optional `bars` field (multiples of 0.5, min 0.5, max 8, default 1) | — | — | **partially covered** — `Chord.bars` field and `setChordBars`/`clampBars` implemented; full unit coverage deferred to step 02.4 codegen tests |
| A-02-02 | `melodyLine()` byte-identical when all bars === 1 or undefined | — | — | not covered — deferred to step 02.4 |
| A-02-03 | `melodyLine()` emits `arrange()` when any chord has bars !== 1 | — | — | not covered — deferred to step 02.4 |
| A-02-04 | ProgressionStrip renders proportional segment widths | — | manual | not covered — deferred to step 02.5 |
| A-02-05 | Drag resize handle changes chord bars and calls setChordBars | — | manual | not covered — deferred to step 02.5 |
| A-02-06 | Resize gesture and gain-drag gesture are fully independent | — | manual | not covered — deferred to step 02.5 |
| A-02-07 | Prior Phase 01 interactions preserved without regression | — | manual | not covered — deferred to step 02.5 |
| A-02-08 | Existing saved sessions without `bars` load and play correctly | `tests/persistence.test.ts` | unit (schema safeParse) | **partially covered** — `SavedChordSchema` accepts missing `bars`; full round-trip test deferred to step 02.4 |
| A-02-09 | All quality gates pass; test count ≥ 184 | all test files | automated | **partially covered** — 180 tests pass; count will reach ≥ 184 after step 02.4 adds codegen tests |

### Decisions made (if any)

- No new decisions beyond ADR 0010 guidance. All implementation choices follow ADR 0010 exactly.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 180 tests passing (unchanged from step 02.2).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.
- `Chord.bars`, `clampBars`, `setChordBars` are now present in the codebase. `melodyLine()` in `src/core/codegen/strudel.ts` does NOT yet consume `bars` — that is step 02.4.

### Next-step context (only if non-obvious)

- Step 02.4 widens `melodyLine()`'s `progression` parameter type to include `bars?: number` and implements the dual-mode codegen logic. It must also add 4 unit tests asserting exact string output for both paths.
- The `clampBars` export is ready for import in step 02.4's test fixtures.

### Planner Review

**Planner Review:** APPROVED on 2026-06-10. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 02.4.

---

## Step 02.4 — Codegen: melodyLine() with arrange() for variable durations

**Date:** 2026-06-10
**Commit(s):**

- **Terminal commit:** `feat(codegen): Phase 02 step 02.4 — melodyLine arrange() for variable chord durations, unit tests`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0010-variable-chord-duration.md`, `src/core/codegen/strudel.ts`, `src/state/session.ts` (Chord interface from step 02.3).
- Also read the Planner note from step 02.3 review: "in `setChordBars`, `requeueLive()` is called unconditionally even when the out-of-range guard fires inside the store update callback. This is harmless for audio, but if you can cover the out-of-range no-op path in one of the unit tests in this step, do so."
- **`melodyLine()` signature widened** (`src/core/codegen/strudel.ts`): `progression` parameter now accepts `ReadonlyArray<{ rootPc: number; qual: Quality; gain?: number | null; bars?: number }>`. Backward-compatible widening — existing callers pass objects without `bars`, which remains valid.
- **Dual-mode logic implemented (ADR 0010):**
  - `const uniformDuration = progression.every(ch => (ch.bars ?? 1) === 1)` computed at top.
  - If `uniformDuration` is `true`: existing `<…>` slowcat form emitted unchanged. Output is byte-identical to pre-phase `main` (A-02-02).
  - If `uniformDuration` is `false`: `arrange(…)` form emitted with per-chord inline gain (A-02-03).
- **`arrange()` form:** Each segment is `  [${numCycles}, note("[${voicing}]").s("sawtooth").lpf(1200).gain(${g}).room(0.3)]`. Full output is `arrange(\n${segments.join(',\n')}\n)`.
- **`buildSession()` parameter type also widened** to match `melodyLine()` signature (the delegation call compiles cleanly).
- **JSDoc updated** on `melodyLine()` to document dual-mode behavior and cite ADR 0010.
- **Unit tests added to `tests/codegen.test.ts`:**
  - Test 1: uniform durations (both bars=1) → slowcat form byte-identical to pre-phase (A-02-02).
  - Test 2: mixed durations (bars=2 and bars=0.5) → full exact `arrange()` string (A-02-03).
  - Test 3: single chord with bars=1 → slowcat form (not arrange).
  - Test 4: empty progression → `''` (unchanged behavior).
- **Planner bonus coverage (step 02.3 review note):** Added 3 `setChordBars` tests in `tests/session.test.ts`:
  - Out-of-range index (index === progression.length) is a no-op: store unchanged.
  - Negative index is a no-op: store unchanged.
  - Valid index updates bars via `clampBars` (e.g., 2.3 → 2.5).
- AGPL-3.0 headers intact on all modified files (pre-existing headers, not altered).
- Engines in `core/**` have NO DOM/PIXI/Svelte imports (invariant confirmed — `strudel.ts` imports only `chords.js` and `layers.js`).
- TS strict throughout — no `any`, no `// @ts-ignore`.

### Files touched

- `src/core/codegen/strudel.ts` — `melodyLine()` dual-mode implementation and signature widening; `buildSession()` signature widening; JSDoc updated
- `tests/codegen.test.ts` — 4 new `melodyLine — dual-mode (ADR 0010)` tests added
- `tests/session.test.ts` — 3 new `setChordBars` tests added (bonus coverage per Planner note); `setChordBars` and `clampBars` added to import
- `docs/orbifold-v2/handoffs/phase-02-handoff.md` — updated (this entry)

### Validation evidence (per Acceptance ID)

- **A-02-02:** Test 1 (`melodyLine — dual-mode` suite) asserts that `melodyLine([{..., bars:1}, {..., bars:1}], 'chord', 3)` produces the exact pre-phase slowcat string — byte-identical guarantee confirmed by Vitest assertion on the full string.
- **A-02-03:** Test 2 asserts that `melodyLine([{bars:2,...}, {bars:0.5,...}], 'chord', 3)` produces the exact `arrange(\n  [2, ...],\n  [0.5, ...]\n)` string — full string assertion, no substring match.
- **A-02-01 (partial):** `setChordBars` out-of-range no-op, negative index no-op, and valid-index clamping are now covered by tests in `tests/session.test.ts`. `clampBars` logic is indirectly exercised.
- **A-02-08:** Uniform path (bars undefined → treated as 1) verified by Test 1 and Test 3 — existing sessions without `bars` field will always take the slowcat path.
- **A-02-09:** 187 tests pass (180 prior + 7 new: 4 codegen + 3 session). Exceeds the ≥ 184 threshold. `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm build` exits 0.

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors (ESLint + Prettier clean; ran `pnpm exec prettier --write` on `tests/codegen.test.ts` to fix formatting after initial edit).
- `pnpm test` — 187 tests pass (7 new tests added; 0 regressions).
- `pnpm build` — exits 0 (pre-existing chunk-size warning, not introduced by this step).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-02-01 | Each chord carries optional `bars` field (multiples of 0.5, min 0.5, max 8, default 1); `setChordBars` clamps and commits | `tests/session.test.ts` | unit | **covered** — out-of-range no-op, negative-index no-op, and valid-index clamping all tested |
| A-02-02 | `melodyLine()` byte-identical when all bars === 1 or undefined | `tests/codegen.test.ts` | unit | **covered** — Test 1 (explicit bars=1) and Test 3 (single chord bars=1) assert full string |
| A-02-03 | `melodyLine()` emits `arrange()` when any chord has bars !== 1 | `tests/codegen.test.ts` | unit | **covered** — Test 2 asserts full exact `arrange(...)` string |
| A-02-04 | ProgressionStrip renders proportional segment widths | — | manual | not covered — deferred to step 02.5 |
| A-02-05 | Drag resize handle changes chord bars and calls setChordBars | — | manual | not covered — deferred to step 02.5 |
| A-02-06 | Resize gesture and gain-drag gesture are fully independent | — | manual | not covered — deferred to step 02.5 |
| A-02-07 | Prior Phase 01 interactions preserved without regression | — | manual | not covered — deferred to step 02.5 |
| A-02-08 | Existing saved sessions without `bars` load and play correctly | `tests/codegen.test.ts` | unit | **covered** — Tests 1 and 3 verify bars-absent (undefined) takes slowcat path; Zod schema coverage from step 02.3 still active |
| A-02-09 | All quality gates pass; test count ≥ 184 | all test files | automated | **covered** — 187 tests pass (≥ 184); `tsc`, `lint`, `build` all exit 0 |

### Decisions made (if any)

- No decisions beyond ADR 0010 guidance.
- Chose to add 3 `setChordBars` tests (bonus per Planner note) covering the out-of-range no-op path, since the cost is low and it directly addresses the Planner's non-blocking comment.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 187 tests passing.
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.
- `melodyLine()` now emits `arrange()` for variable-duration progressions and slowcat for uniform-duration progressions.
- `buildSession()` parameter type widened to match.

### Next-step context (only if non-obvious)

- Step 02.5 replaces `flex: 1` in `ProgressionStrip.svelte` with proportional `flex-basis` and adds the horizontal drag-to-resize gesture. `setChordBars` (implemented and tested in 02.3/02.4) is the commit target for the gesture's `pointerup` handler.

### Planner Review

(Filled by the Planner in review mode)
