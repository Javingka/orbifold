<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Planner Review — Phase 01 Step 01.3, Iteration 1

**Decision:** REVISE
**Reviewed on:** 2026-06-18
**Iteration:** 1 of 5

---

## Summary

7 of 8 checklist items pass cleanly. One correctness defect found in `applyBlockSave`:
the no-op guard `if (state.composition.blocks.length === 0)` is wrong when blocks already
exist in the composition library. The fix is a single-line change; nothing else needs to change.

---

## Checklist results

| # | Item | Result |
|---|---|---|
| 1 | Commit scope clean | PASS |
| 2 | Commit message format | PASS |
| 3 | Acceptance Coverage Table present and complete | PASS |
| 4 | Tests relevant, not just green (incl. proxy disclosures) | PASS |
| 5 | Manual evidence where required | N/A (manual deferred to 01.5) |
| 6 | Register respected | PASS |
| 7 | Reversibility intact | PASS |
| 8 | No unauthorized new dependencies | PASS |
| P1 | Prototype parity | N/A (pure extension, not a port) |
| P2 | Reversibility / flag-off | PASS |
| P3 | AGPL-3.0 header on new files | PASS |
| P4 | Quality gates (tsc / lint / test) | PASS (build deferred to 01.5 per spec) |

---

## Failing item: Item 4 — Test correctness / implementation correctness

### Defect: `applyBlockSave` no-op guard is wrong when blocks already exist

**Location:** `src/agent/apply.ts` line 228

```typescript
// CURRENT (incorrect when blocks already exist):
if (state.composition.blocks.length === 0) return;
```

**The problem:** `addBlock` early-returns (no-op) when the generated code is empty — e.g.,
`saveAsBlock: { type: 'armonia' }` fired while no harmony progression exists. After such
a no-op, `state.composition.blocks.length` is still equal to the pre-call count (N), not 0.
The guard `length === 0` is only correct if the library starts empty (N = 0). When N > 0
and `addBlock` no-ops, the guard passes, execution falls through, and `renameBlock` is
called on `blocks[N-1]` — the last *pre-existing* block — silently corrupting its name.

This is a latent data-corruption bug in a realistic production scenario (user has built up
a composition library, agent fires a `saveAsBlock` for a type with no live state).

**Note:** The ADR 0021 D3 step 4 specifies this same guard verbatim (`length === 0`), so
the Dev faithfully followed the ADR. The ADR itself has the flaw. The fix does not require
an ADR amendment — it is a clarification of intent (the guard was meant to detect
"addBlock was a no-op", not "the library is empty").

**Required fix — single line before the guard:**

```typescript
export function applyBlockSave(spec: SaveAsBlockSpec): void {
  // Capture pre-call block count to detect addBlock no-op (empty code guard).
  const blockCountBefore = get(sessionStore).composition.blocks.length;

  // Step 1: delegate snapshot capture entirely to addBlock (ADR 0021 D3 binding).
  addBlock(spec.type);

  // Step 2: read back immediately (addBlock is synchronous, no interleaving).
  const state = get(sessionStore);

  // Step 3: guard — addBlock early-returns on empty code; detect by comparing count.
  // Using length === 0 is wrong when blocks already exist (would pick last pre-existing block).
  if (state.composition.blocks.length === blockCountBefore) return;
  const newBlock = state.composition.blocks[state.composition.blocks.length - 1];

  // Steps 4–6 unchanged ...
```

**Required test addition:** Add one test in `tests/apply-block.test.ts` that exercises
the guard when blocks already exist:

```typescript
it('A-01-01 no-op guard: addBlockSave with empty harmonia state and existing blocks does not rename pre-existing block', () => {
  // Seed a groove block into the library first.
  applyRhythmSpec(GROOVE_SPEC);
  applyBlockSave({ name: 'Pre-existing Block', type: 'groove' });

  const stateBefore = get(sessionStore);
  expect(stateBefore.composition.blocks).toHaveLength(1);
  const preExistingName = stateBefore.composition.blocks[0].name;

  // Now fire saveAsBlock for 'armonia' with no harmony progression set.
  // DEFAULT_SESSION_STATE has an empty progression, so addBlock('armonia') no-ops.
  // The guard must detect the no-op and NOT rename the pre-existing block.
  applyBlockSave({ name: 'Should Not Appear', type: 'armonia' });

  const stateAfter = get(sessionStore);
  // Block count must be unchanged (addBlock was a no-op).
  expect(stateAfter.composition.blocks).toHaveLength(1);
  // Pre-existing block name must be intact.
  expect(stateAfter.composition.blocks[0].name).toBe(preExistingName);
});
```

(Verify that `DEFAULT_SESSION_STATE` has an empty harmony progression causing `addBlock('armonia')`
to no-op. If it does not, adjust the test setup to clear the progression first.)

---

## What NOT to change

- Do NOT touch `tests/schema.test.ts` (passes correctly; no changes needed).
- Do NOT touch `src/agent/agent.ts` (all D4/OQ-3/OQ-4 logic is correct).
- Do NOT touch `src/agent/schema.ts` (SCHEMA_VERSION, SaveAsBlockSpecSchema, AgentOutputSchema all correct).
- Do NOT restructure the apply function beyond the guard fix described above.
- Do NOT add any other new tests beyond the one guard-test described above.
- Do NOT amend ADR 0021 — the fix is a clarification of intent, within the ADR's spirit.
- Do NOT change any other existing test (all 715 tests pass correctly and must continue to pass).

---

## Re-verification requirements

After the fix, confirm:
1. `pnpm exec tsc --noEmit` → 0 errors.
2. `pnpm lint` → clean.
3. `pnpm exec vitest run` → ≥715 tests pass (the new guard test adds 1 or more).
4. The handoff entry is updated to reflect: (a) the guard fix in `apply.ts`, (b) the new test, (c) updated total test count.
