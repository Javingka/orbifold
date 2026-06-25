<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 07 — Native-length step arrays in `applyRhythmSpec`

**Purpose:** Fix `applyRhythmSpec` to emit step arrays at their native length (n steps for an n-step pattern) instead of always padding to `RSTEPS = 16`, so that 12-step cueca patterns produce exactly 12 tokens in Strudel codegen and render exactly 12 dots on the canvas.

**Gate:** Phase 06 complete and merged to `main`; `pnpm test` passes at 1863; `SESSION_SCHEMA_VERSION = 5`; `SCHEMA_VERSION = 6`; AG-D1 seam invariant in force; Phase 06 deferred item "applyRhythmSpec pads to 16 / persistence .length(16) constraint" now in scope.

**Expected phase result:** A 12-step cueca recipe produces session layers with `steps.length === 12`; `rhythmLayerToStrudelLine` emits exactly 12 tokens for those layers; the PIXI canvas (already using `layer.steps.length` after Phase 06) renders 12 dots correctly; cumbia and all 16-step patterns are unaffected; persistence round-trips 12-step layers cleanly; all prior tests updated and passing; `tsc --noEmit`, `pnpm lint`, `pnpm test ≥ 1863`, `pnpm build` clean.

---

## Architectural notes (hard invariants for every step)

**The bug (diagnosis complete — no inventory step needed):**
`applyRhythmSpec` in `src/agent/apply.ts` has two code paths that both force all layers into a 16-element array regardless of the pattern's native length:

- *Steps variant* (lines 119–122): allocates `new Array(RSTEPS).fill(0)` then writes into it. A 12-element input produces a 12-valid + 4-zero array of length 16.
- *Euclid variant* (lines 107–113): `bjorklund(k, n)` returns an n-element array; the current code maps each hit to a 16-slot index via `Math.round((i/n)*RSTEPS)%RSTEPS`, discarding native positions and producing a 16-element output.

**The fix (exact — Dev must not deviate):**

*Steps variant* — replace the fill+forEach with a native-length map:
```typescript
// BEFORE (wrong — always length 16):
const steps: number[] = new Array(RSTEPS).fill(0);
L.steps.slice(0, RSTEPS).forEach((v, i) => { steps[i] = v ? 1 : 0; });

// AFTER (correct — native length, capped at RSTEPS):
const steps: number[] = L.steps.slice(0, RSTEPS).map(v => v ? 1 : 0);
```

*Euclid variant* — replace the 16-slot mapping with a native-length map:
```typescript
// BEFORE (wrong — maps n-step hits into 16 slots):
const steps: number[] = new Array(RSTEPS).fill(0);
pat.forEach((v, i) => {
  if (v) { const s = Math.round((i / n) * RSTEPS) % RSTEPS; steps[s] = 1; }
});

// AFTER (correct — native n-step array, length = n):
const steps: number[] = pat.map(v => v ? 1 : 0);
```

**`layers.ts` comment update:**
The JSDoc on `RhythmLayer.steps` currently says "length = RSTEPS = 16 by default". Remove "= RSTEPS = 16 by default" — replace with: "length equals the pattern's native step count (n for an E(k,n) or binary pattern; between 1 and RSTEPS)."

**Persistence schema relaxation (required alongside the fix):**
`src/lib/persistence.ts` has two schemas with `.length(16)` on the `steps` array:
1. `SavedRhythmLayerSchema` (line 91): `steps: z.array(z.number().int().min(0).max(1)).length(16)` → change to `z.array(z.number().int().min(0).max(1)).min(1).max(RSTEPS)` (or equivalently `.min(1).max(16)`).
2. `SavedGrooveLayerSchema` (line 116): same change.

This relaxation is backward-compatible: old 16-step blobs still parse (16 satisfies `min(1).max(16)`); new 12-step blobs now also parse. `SESSION_SCHEMA_VERSION` stays 5 — no migration needed.

**Test update rule:**
Any existing test asserting `steps.length === 16` for a cueca layer (binary or euclid) must be updated to assert the correct native length. Tests asserting `steps.length === 16` for cumbia or other 16-step patterns must NOT be changed. The Phase 06 guard test in `propagation.test.ts` (A-06-04 guard: "all cueca layers have steps.length === 16") must be updated to expect 12.

**RSTEPS import in `apply.ts`:**
`RSTEPS` is still needed as the cap in `L.steps.slice(0, RSTEPS)` and as the upper bound in `clampi(L.euclid.n ?? 8, 2, 16)` (which uses the literal 16 — leave that literal unchanged; it is the validation cap, not the output length). The `RSTEPS` import from `../core/rhythm/euclid.js` remains in `apply.ts`.

**AG-D1 seam invariant:** The fix is entirely within `apply.ts` and `layers.ts` (and `persistence.ts` schema). No genre name is added to any of these files. The step count is a numeric property of the pattern; no genre-string logic is introduced.

**`SESSION_SCHEMA_VERSION` stays 5.** The schema change is additive (relaxing a strict constraint), not a breaking change.

---

## Step 07.1 — Fix `apply.ts` + update `layers.ts` comment + fix persistence schema + fix/add tests

PROMPT → Apply the two targeted fixes to `applyRhythmSpec` in `src/agent/apply.ts`, update the `steps` JSDoc comment in `src/core/rhythm/layers.ts`, relax the `steps.length(16)` constraints in `src/lib/persistence.ts`, and update all affected tests. Read each source file before editing. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1 — no genre name in plumbing)
3. `docs/authentic-groove/phases/phase-07.md` (this file — Architectural notes for exact fix)
4. `src/agent/apply.ts` (full — understand both code paths before editing; confirm exact line numbers of the bug)
5. `src/core/rhythm/layers.ts` (full — read the `steps` JSDoc before editing)
6. `src/lib/persistence.ts` (lines 89–120 — read `SavedRhythmLayerSchema` and `SavedGrooveLayerSchema` before editing)
7. `src/core/rhythm/euclid.ts` (confirm `RSTEPS = 16` and `bjorklund` return length = n, not 16)
8. `tests/authentic-groove/propagation.test.ts` (full — identify every test asserting `steps.length === 16` that must change; identify which must NOT change)
9. `tests/authentic-groove/default-tempo.test.ts` (full — identify every test asserting `steps.length === 16` for cueca that must change)

**What to produce:**

`src/agent/apply.ts` — two changes in `applyRhythmSpec`:

1. *Steps variant* (currently lines 119–122): replace `new Array(RSTEPS).fill(0)` + `forEach` with:
   ```typescript
   const steps: number[] = L.steps.slice(0, RSTEPS).map(v => v ? 1 : 0);
   ```

2. *Euclid variant* (currently lines 107–113): replace the 16-slot mapping:
   ```typescript
   const steps: number[] = pat.map(v => v ? 1 : 0);
   ```
   The `RSTEPS` import remains (still used by the `clampi` cap `n = clampi(L.euclid.n ?? 8, 2, 16)`). Update the JSDoc comment block on `applyRhythmSpec` — replace "maps n-step pattern to RSTEPS (16) via Math.round(i/n*RSTEPS)%RSTEPS" with "maps n-step pattern to a native n-length boolean array"; replace "takes first RSTEPS entries, clamps each to 0/1" with "takes up to RSTEPS entries, preserving native length".

`src/core/rhythm/layers.ts` — one comment change:
- On `RhythmLayer.steps`: change "length = RSTEPS = 16 by default" → "length equals the pattern's native step count (between 1 and RSTEPS)".
- Also update the prose in `rhythmLayerToStrudelLine` JSDoc: remove "Runtime layers always carry the 16 visible `steps`" → "Runtime layers carry `steps` at their native length (n steps for an n-step pattern)".

`src/lib/persistence.ts` — two schema changes:
- `SavedRhythmLayerSchema.steps`: change `.length(16)` → `.min(1).max(16)`.
- `SavedGrooveLayerSchema.steps`: change `.length(16)` → `.min(1).max(16)`.
- Do NOT change `SESSION_SCHEMA_VERSION` (stays 5). Add a JSDoc comment on each changed field noting "relaxed from .length(16) in Phase 07 to support native-length n-step patterns; 16-step blobs continue to parse".

Tests to update (read each file before editing):

`tests/authentic-groove/propagation.test.ts`:
- Locate the A-06-04 guard test: "all cueca layers have steps.length === 16 after applyRhythmSpec". Update the describe/it description to "A-07-01/A-07-02/A-07-03 guard: cueca layers after recipe apply have native step counts". Update the assertions: cueca `bd` (binary `101000101000`, 12 steps) → `steps.length === 12`; cueca `hh` (E(6,12,0)) → `steps.length === 12`; cueca `cp` (binary `000010000010`, 12 steps) → `steps.length === 12`. Remove any mention of RSTEPS padding from comments in this test block.
- Locate the lock-preservation integration test "lock-preservation integration — cueca locked bd survives agent call" (around line 863). It contains a comment "In cueca E(4,12) mapped to 16 steps, step[1] = 0". After the fix, cueca `bd` is produced by the steps variant (binary string) or by euclid (E(6,12,0) or E(4,12,0) depending on the recipe). Read the cueca recipe's actual layer definitions before updating this test. Update the assertion so it reflects the native-length steps array; remove outdated RSTEPS-mapping comments.
- Locate any other assertion of `steps.length === 16` for cueca layers and update to 12. Do NOT change assertions for cumbia layers (which remain 16-step).

`tests/authentic-groove/default-tempo.test.ts`:
- Locate all assertions `steps.length === 16` for cueca layers: these appear in the integration test "applying cueca: BPM = 160, 3 layers present with steps.length === 16" and the nearby cumbia integration test comment "Cumbia layers are 16-step". Update cueca assertions to `steps.length === 12`. Leave cumbia assertions (`steps.length === 16`) unchanged.

New unit tests — add to `tests/authentic-groove/apply-step-native-length.test.ts` (new file, AGPL-3.0 header):

```
// A-07-01: steps variant, 12-step binary string
it('steps variant: 12-element input → steps.length === 12', ...)
  // Call applyRhythmSpec with a steps layer where L.steps has 12 elements (e.g., cueca bd binary).
  // Assert the session layer's steps.length === 12.

// A-07-02: euclid variant, E(6,12,0)
it('euclid variant: E(6,12,0) → steps.length === 12', ...)
  // Call applyRhythmSpec with { sound: 'hh', euclid: { k: 6, n: 12, rot: 0 } }.
  // Assert the session layer's steps.length === 12.
  // Assert all 6 hits are present (sum of steps === 6).

// A-07-03: steps variant, 12-step binary for cp
it('steps variant: cueca cp binary → steps.length === 12, correct token output', ...)
  // Input: L.steps = [0,0,0,0,1,0,0,0,0,0,1,0] (12 elements; represents '000010000010').
  // After applyRhythmSpec, assert steps.length === 12.
  // Call rhythmLayerToStrudelLine on the resulting layer; assert the emitted string is:
  //   '  s("~ ~ ~ ~ cp ~ ~ ~ ~ ~ cp ~")'
  // (12 tokens, no trailing ~~ from padding)

// A-07-04 (backward-compat): cumbia bd (E(4,16,0)) → steps.length === 16
it('euclid variant: E(4,16,0) → steps.length === 16 (backward-compat)', ...)
  // Call applyRhythmSpec with { sound: 'bd', euclid: { k: 4, n: 16, rot: 0 } }.
  // Assert steps.length === 16.

// A-07-04 (backward-compat): 16-step steps variant → steps.length === 16
it('steps variant: 16-element input → steps.length === 16 (backward-compat)', ...)
  // Call applyRhythmSpec with a 16-element steps array.
  // Assert steps.length === 16.

// A-07-05 (agent backward-compat): 16-step agent output (no n specified → default n=8)
it('euclid variant: agent default n=8 → steps.length === 8', ...)
  // Call applyRhythmSpec with { sound: 'hh', euclid: { k: 3, n: 8 } }.
  // Assert steps.length === 8 (native length of bjorklund(3,8)).
  // This confirms backward-compat: agent-generated patterns stay at their native length.
```

**Constraints:**
- AG-D1: no genre name added to `apply.ts`, `layers.ts`, or `persistence.ts`.
- `SESSION_SCHEMA_VERSION` stays 5.
- `SCHEMA_VERSION` stays 6.
- AGPL-3.0 header on the new test file.
- Do NOT modify `rhythm-scene.ts` — Phase 06 already made it use `layer.steps.length` natively. No render change needed.
- Do NOT modify any Svelte component.
- Do NOT modify `euclid.ts`.

**Acceptance criteria in this step:**
- A-07-01 (partial): cueca `bd` steps variant → `steps.length === 12` — covered by unit test.
- A-07-02 (partial): cueca `hh` euclid E(6,12,0) → `steps.length === 12` — covered by unit test.
- A-07-03 (partial): cueca `cp` steps variant → `steps.length === 12`; `rhythmLayerToStrudelLine` emits exactly 12 tokens — covered by unit test.
- A-07-04 (partial): cumbia 16-step patterns unaffected — covered by backward-compat unit tests.
- A-07-05 (partial): agent 16-step patterns unaffected — covered by backward-compat unit test.
- A-07-06 (partial): `tsc --noEmit` clean; `pnpm test` ≥ 1863 + all new tests pass.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run apply-step-native-length` → all new tests pass
- `pnpm test` → no regressions (≥ 1863 + new tests)
- `git status` → only `src/agent/apply.ts`, `src/core/rhythm/layers.ts`, `src/lib/persistence.ts`, `tests/authentic-groove/propagation.test.ts`, `tests/authentic-groove/default-tempo.test.ts`, `tests/authentic-groove/apply-step-native-length.test.ts`, and handoff entry modified/new.

**CHECKPOINT → Commit message:**
`fix(agent): Phase 07 step 07.1 — native-length steps in applyRhythmSpec + persistence schema relaxation`

---

## Step 07.2 — End-to-end propagation tests for cueca 3 layers + backward-compat assertions

PROMPT → Add integration-level end-to-end tests asserting the exact Strudel token output for all three cueca layers after a full `applyRecipeById('cueca-chilena-folk')` call, and guard assertions confirming cumbia/16-step patterns are unaffected. Read the cueca recipe definition before writing any test. All changes confined to `tests/`.

**Required reading (in order):**

1. `docs/authentic-groove/phases/phase-07.md` (Acceptance IDs A-07-01 through A-07-05)
2. `docs/authentic-groove/decisions.md` (AG-D1 — tests may name recipes and genre tokens)
3. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — locate `cueca-chilena-folk` recipe: read all three layer definitions including `rhythmId`, `sound`, `locked`, and whether each layer is euclid or steps-based; locate `cumbia-latina-groove`: confirm 2 layers, both 16-step euclid)
4. `src/core/music-knowledge/recipe-engine.ts` (confirm `recipeToAgentOutput` resolves `rhythmId` references to produce the concrete `RhythmSpec` with `steps` or `euclid` variants for each layer)
5. `src/core/music-knowledge/rhythm-catalog.ts` (locate the rhythm entries whose IDs are referenced by cueca layers: confirm `cueca-chilena-base`, `cueca-palmas-12`, `cueca-subdivision-12` — read their definitions to determine which are binary steps and which are euclid, and their `n` values)
6. `src/agent/apply.ts` (confirm the fix from step 07.1 is in place before adding tests that depend on it)
7. `tests/authentic-groove/propagation.test.ts` (read the existing cueca tests so new tests do not duplicate; identify the section to extend)

**What to produce:**

Extend `tests/authentic-groove/propagation.test.ts` with a new describe block at the end of the file (AGPL-3.0 header already present):

```
// ── A-07-01/02/03: cueca end-to-end Strudel token output (Phase 07) ─────────
//
// After applyRecipeById('cueca-chilena-folk'):
//   - bd layer: 12 steps, correct token pattern
//   - hh layer: 12 steps, correct token pattern
//   - cp layer: 12 steps, correct token pattern
// This is a full end-to-end test: recipe → applyRhythmSpec → rhythmLayerToStrudelLine.
```

Tests to add (read the actual cueca rhythm catalog entries to confirm the exact expected output before hardcoding):

- **A-07-01 e2e:** Apply `cueca-chilena-folk` via `applyRecipeById`. Find the `bd` session layer. Assert `steps.length === 12`. Call `rhythmLayerToStrudelLine(layer)`. Assert the emitted string equals `'  s("bd ~ bd ~ ~ ~ bd ~ bd ~ ~ ~")'` (for a 12-step `101000101000` binary). If the cueca catalog entry uses a different binary or euclid pattern, read it first and derive the correct expected string — do NOT hardcode without reading the source.
- **A-07-02 e2e:** Find the `hh` session layer. Assert `steps.length === 12`. Assert `rhythmLayerToStrudelLine(layer)` equals the correct 12-token string for E(6,12,0) (which produces `101010101010`, i.e., `'  s("hh ~ hh ~ hh ~ hh ~ hh ~ hh ~")'`). If the catalog entry differs, read and use the actual pattern.
- **A-07-03 e2e:** Find the `cp` session layer. Assert `steps.length === 12`. Assert `rhythmLayerToStrudelLine(layer)` equals the correct 12-token string for `000010000010` binary (i.e., `'  s("~ ~ ~ ~ cp ~ ~ ~ ~ ~ cp ~")'`). If the catalog entry differs, read and use the actual pattern.
- **A-07-04 e2e (cumbia backward-compat):** Apply `cumbia-latina-groove` via `applyRecipeById`. Assert all session layers have `steps.length === 16`. Call `rhythmLayerToStrudelLine` on each and confirm the output is a 16-token string (count the space-separated tokens).
- **A-07-05 e2e (agent backward-compat):** Call `applyRhythmSpec` directly with an agent-like spec: `{ layers: [{ sound: 'hh', euclid: { k: 4, n: 16, rot: 0 } }, { sound: 'bd', steps: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] }] }`. Assert both layers have `steps.length === 16`. Assert codegen emits 16-token strings.

**Constraints:**
- AG-D1: tests may reference genre recipe IDs and rhythm catalog IDs (these are knowledge-layer tests). Only `src/` (excluding `src/core/music-knowledge/`) is governed by the AG-D1 seam.
- AGPL-3.0 header already present on `propagation.test.ts`.
- Do NOT add duplicate tests for patterns already covered by step 07.1 unit tests. The step 07.2 tests are integration (recipe → store → codegen round-trip), not unit.
- Do NOT modify any source file in `src/`.

**Acceptance criteria in this step:**
- A-07-01 (full): cueca `bd` → `steps.length === 12`; exact 12-token Strudel string emitted — covered by e2e test.
- A-07-02 (full): cueca `hh` → `steps.length === 12`; exact 12-token Strudel string emitted — covered by e2e test.
- A-07-03 (full): cueca `cp` → `steps.length === 12`; exact 12-token Strudel string emitted — covered by e2e test.
- A-07-04 (full): cumbia 16-step → `steps.length === 16`; 16-token codegen — covered by e2e backward-compat test.
- A-07-05 (full): agent-generated 16-step patterns → `steps.length === 16`; 16-token codegen — covered by e2e backward-compat test.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run propagation` → all propagation tests pass including the new e2e block
- `pnpm test` → no regressions (≥ 1863 + all step 07.1 + 07.2 tests)
- `git status` → only `tests/authentic-groove/propagation.test.ts` and handoff entry modified.

**CHECKPOINT → Commit message:**
`test(authentic-groove): Phase 07 step 07.2 — e2e Strudel token tests for cueca 3 layers + backward-compat`

---

## Step 07.3 — Quality gate + seam fitness check + phase-completion block

PROMPT → Run the full quality gate, run the seam fitness check, confirm the exact token output Acceptance IDs, and record all output in the handoff. No source file changes expected; fix only lint/type errors that the gate reveals (if any).

**Required reading (in order):**

1. `docs/authentic-groove/phases/phase-07.md` (all Acceptance IDs)
2. `docs/authentic-groove/handoffs/phase-07-handoff.md` (confirm steps 07.1 and 07.2 are APPROVED)
3. `docs/authentic-groove/decisions.md` (AG-D1 seam grep plan)
4. `docs/adr/0025-authentic-sample-palette.md` (D3 — seam invariant + grep approach)

**What to produce:**

Run and record the seam fitness check:

- **Genre-token grep:** `git grep -n -e "'cueca'" -e '"cueca"' -e "'cumbia'" -e '"cumbia"' -e "'candombe'" -e '"candombe"' -- 'src/' ':(exclude)src/core/music-knowledge/' ':(exclude)tests/'` → must return zero matches. Record output.
- **`applyRhythmSpec` padding grep:** `git grep -n "new Array(RSTEPS).fill(0)" src/agent/apply.ts` → must return zero matches (confirms the old padding pattern is gone). Record output.
- **`.length(16)` grep in persistence:** `git grep -n "\.length(16)" src/lib/persistence.ts` → must return zero matches (confirms both schema constraints were relaxed). Record output.
- **Native-length codegen check:** `git grep -n "Math.round.*RSTEPS" src/agent/apply.ts` → must return zero matches (confirms the 16-slot mapping is gone). Record output.

Run and record the full quality gate:
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Record each command's output verbatim (or "clean — no output" for tsc/lint). Record the final test count.

**Reversibility note (required verbatim in handoff):**
- The `apply.ts` changes are the minimal targeted fix — two one-liners replacing two multi-line mapping blocks. Reverting them returns `applyRhythmSpec` to pre-Phase-07 behavior (all layers padded to 16 steps).
- The `persistence.ts` schema relaxation from `.length(16)` to `.min(1).max(16)` is additive: existing 16-step blobs still parse. Reverting it does not affect currently-saved sessions (all pre-Phase-07 sessions have 16-step arrays). 12-step sessions saved after Phase 07 would fail to load after a revert — but since Phase 07 is the first phase to produce 12-step layers, no such sessions exist in the field.
- `SESSION_SCHEMA_VERSION` stays 5. No migration needed.
- The PIXI render layer (`rhythm-scene.ts`) was already updated in Phase 06 to use `layer.steps.length`. No revert needed there.

**Acceptance criteria in this step:**
- A-07-06 (full): `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1863 + all Phase 07 tests; `pnpm build` succeeds; all seam greps return zero matches — confirmed by quality gate output recorded in handoff.

**Validation:** all gate commands + seam greps recorded in the handoff with output.

**CHECKPOINT → Commit message:**
`chore(authentic-groove): Phase 07 step 07.3 — quality gate + seam check + phase-completion block`

---

## Phase Acceptance

| ID | Description | Validation method |
|---|---|---|
| A-07-01 | Cueca `bd` (binary `101000101000`, 12-step input) → session layer `steps.length === 12`; `rhythmLayerToStrudelLine` emits exactly 12 tokens: `s("bd ~ bd ~ ~ ~ bd ~ bd ~ ~ ~")` | unit: `apply-step-native-length.test.ts`; e2e: `propagation.test.ts` |
| A-07-02 | Cueca `hh` (euclid E(6,12,0)) → session layer `steps.length === 12`; `rhythmLayerToStrudelLine` emits exactly 12 tokens: `s("hh ~ hh ~ hh ~ hh ~ hh ~ hh ~")` | unit: `apply-step-native-length.test.ts`; e2e: `propagation.test.ts` |
| A-07-03 | Cueca `cp` (binary `000010000010`, 12-step input) → session layer `steps.length === 12`; `rhythmLayerToStrudelLine` emits exactly 12 tokens: `s("~ ~ ~ ~ cp ~ ~ ~ ~ ~ cp ~")` | unit: `apply-step-native-length.test.ts`; e2e: `propagation.test.ts` |
| A-07-04 | Cumbia `bd` (E(4,16,0)) and `hh` (16-step) → session layers unchanged (`steps.length === 16`); codegen emits 16-token strings; no regression in cumbia tests | unit: `apply-step-native-length.test.ts`; e2e: `propagation.test.ts` |
| A-07-05 | Agent-generated 16-step patterns (from LLM output, any euclid or steps variant with n=16 or 16-element array) → `steps.length === 16`; backward-compat confirmed | unit: `apply-step-native-length.test.ts`; e2e: `propagation.test.ts` |
| A-07-06 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1863 + all Phase 07 tests pass; `pnpm build` succeeds; seam greps: zero padding-pattern matches in `apply.ts`, zero `.length(16)` in `persistence.ts`, zero genre tokens outside `music-knowledge/` | quality gate + seam greps recorded in step 07.3 handoff |

---

## Partial coverage from prior phase

From Phase 06 deferred items:
- **`applyRhythmSpec` pads to 16 / `SavedRhythmLayerSchema.steps.length(16)` constraint** (documented in Phase 06 inventory §9 and §10, handoff deferred items) → addressed by A-07-01 through A-07-06 in this phase.
- **`applyLoadedSession` locked-field gap** — pre-existing from Phase 05, documented in Phase 06 inventory §7; still not in scope. Permanently deferred: fixing it requires a session migration audit and is unrelated to the rhythm-spec native-length bug.
- All other Phase 06 deferred items remain unchanged:
  - Dimension 2 (per-hit accent/velocity variation) — permanently deferred per initiative scope.
  - Dimension 3 (swing/groove feel) — permanently deferred per initiative scope.
  - Pandeiro one-shots — permanently deferred (no CC0 source found).
  - Guacharaca/scraper EggShaker fallback — permanently deferred.
  - Pentagrama `NoteSlot` free placement — carried from orbifold-v2 Ph10; permanently deferred.
  - Per-chord `lpf`/`lpq` slider D-3 — carried from harmonic-rhythm-improvements; permanently deferred.

---

## ADR Triggers

No new ADR is anticipated for this phase. Both changes (native-length step arrays and schema relaxation) are targeted bug fixes within the boundaries of ADR 0025 (seam definition) and AG-D1. The `SESSION_SCHEMA_VERSION` does not change (additive schema relaxation).

An ADR would be required if:
- The Pilot decides the persistence schema should enforce per-pattern step counts (e.g., 12 for cueca, 16 for cumbia) rather than a uniform max. Surface as a blocker if raised — this would change the schema design significantly.
- A new non-12/16 step count (e.g., 9-step aksak) appears in the rhythm catalog and requires explicit test coverage. Surface as a blocker if raised during step 07.2.

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/authentic-groove/handoffs/phase-07-handoff.md`. See `handoff-template.md`.
