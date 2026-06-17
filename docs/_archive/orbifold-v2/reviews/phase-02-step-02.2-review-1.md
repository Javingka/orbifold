# Planner Review — Phase 02 Step 02.2 (Iteration 1)

**Step:** 02.2 — ADR: Variable Chord Duration via arrange()
**Date:** 2026-06-10
**Iteration:** 1 of 5
**Decision:** APPROVE

---

## Pilot Review Checklist (8 standard items)

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | Commit scope clean | PASS | Two files touched: `docs/adr/0010-variable-chord-duration.md` (created) and the handoff update. No extraneous changes. |
| 2 | Commit message format | PASS | `docs(adr): Phase 02 step 02.2 — ADR 0010 variable chord duration via arrange()` matches `<type>(<scope>): Phase NN step NN.N — <description>`. |
| 3 | Acceptance Coverage Table present and complete | PASS | All nine A-02-xx listed with explicit "not covered — deferred to step 02.3/02.4/02.5" gap status. Deferral is appropriate and explicitly noted. |
| 4 | Tests are relevant, not just green | N/A | Docs-only step; no tests applicable. |
| 5 | Live-system / manual / operability evidence | N/A | Docs-only step; no runtime evidence expected. |
| 6 | Register respected | PASS | Decisions Register has no active entries. ADR does not conflict with any CLAUDE.md guardrail. |
| 7 | Reversibility intact | PASS | No source code changed. |
| 8 | No unauthorized dependencies or env/CI changes | PASS | None introduced. |

---

## Project-specific checklist items

### 1. ADR section coverage (step 02.2 spec requirement)

**Context section:**

- Current state — PRESENT. Lines 12–18 describe the existing `melodyLine()` slowcat form verbatim and the absence of any duration mechanism. Cites `src/core/codegen/strudel.ts` lines 66–78.
- Why `@`-operator is wrong — PRESENT. Lines 23–24 correctly describe `note("<[c,e,g]@2 [f,a,c]>")` as 2/3 + 1/3 of ONE cycle, not 2 cycles and 1 cycle.
- Why `arrange()` is correct — PRESENT. Lines 27–34 give three distinct reasons: absolute duration, no `.fast`/`.slow`, already proven in `buildComposition`. Cites `src/core/composition/model.ts` lines 81–102.
- Alternative `stepcat()`/`timeCat()` — PRESENT. Lines 36–38 address both names, explain the proportional-weight objection, and confirm the rejection rationale.

All four required sub-items: PASS.

**Decision section:**

- `Chord.bars` field spec — PRESENT. Section 1 covers: optional number, undefined treated as 1, multiples of 0.5, min/max, clamping via `clampBars`, field name rationale, placement.
- Dual-mode codegen — PRESENT. Section 2 includes the exact detection condition (`progression.every(ch => (ch.bars ?? 1) === 1)`), both branches, and the rationale for dual-mode over unified path.
- `arrange()` form — PRESENT. Section 3 shows the segment template string and the complete multi-chord example. Per-chord inline gain is stated explicitly.
- Backward compatibility — PRESENT. Section 4 covers Zod schema change (`bars: z.number().min(0.5).max(8).optional()`), `undefined` resolves to 1, no schema version bump, explicit byte-identical guarantee.

All four required sub-items: PASS.

**Consequences section:**

- `melodyLine()` parameter type widens — PRESENT.
- Downstream callers (`buildSession()`, `harmonyCode()`) unchanged — PRESENT.
- `requeueLive()` works without changes — PRESENT.
- `.gain("<…>")` parallel pattern NOT used in `arrange()` path — PRESENT.
- No `.fast()`/`.slow()` — PRESENT. Explicitly stated.
- Agent `HarmonyChordSchema` extension (step 02.3) — PRESENT. Includes `clampBars` pass-through detail that matches step 02.3 spec exactly.
- Schema version stays at 1 — PRESENT.

All seven required sub-items: PASS.

### 2. @-operator rejection technically correct

PASS. The ADR's claim is accurate: `note("<[c,e,g]@2 [f,a,c]>")` allocates proportional weight within a single cycle (2/3 and 1/3), not 2 and 1 full cycles. The `@` operator is part of mini-notation's within-cycle weighting system. Using it for multi-cycle durations would silently produce a one-cycle-long pattern with chords proportionally compressed — a musically wrong result. Rejection is technically sound.

### 3. Dual-mode rationale sound (byte-identical for uniform case = A-02-02)

PASS. The ADR correctly links the dual-mode decision to the byte-identical guarantee that is an explicit acceptance criterion (A-02-02). The reasoning is:
- Common case (all bars 1 or undefined) → slowcat form unchanged → output byte-identical to pre-phase `main`
- Variable case (any bar ≠ 1) → `arrange()` form

The pedagogical argument (readability in the live code drawer) is a secondary benefit. The primary driver — backward compatibility and the explicit A-02-02 criterion — is correctly stated. Sound.

### 4. `arrange()` form consistent with `buildComposition()` in model.ts

PASS. The inventory confirms `buildComposition` uses:
```
segs.push(`  [${ref.bars}, ${b.code}]`);
return `arrange(\n${segs.join(',\n')}\n)`;
```
The ADR's harmony-line form matches this pattern: `[${ch.bars ?? 1}, \`note("[${voicing}]")…\`]` assembled into `arrange(\n…\n)`. The ADR example on lines 80–84 uses two-space indented segments, consistent with the composition model. No structural inconsistency.

### 5. Backward-compat claims accurate

PASS. Adding `bars: z.number().min(0.5).max(8).optional()` to `SavedChordSchema` means Zod `safeParse` on existing data without a `bars` key succeeds: the field resolves to `undefined`. Codegen treats `undefined` as 1 via `ch.bars ?? 1`, putting the session on the uniform (slowcat) path. Schema version stays at 1. All claims are technically correct.

### 6. Agent schema extension note matches step 02.3 spec

PASS. The ADR Consequences section states:
- `HarmonyChordSchema` extended with `bars: z.number().min(0.5).max(8).optional()` in step 02.3
- `apply.ts` maps agent `bars` through `clampBars()` before writing to store
- Clamp ensures valid values even if LLM produces non-multiple-of-0.5

Step 02.3 spec requires `clampBars` as a named exported pure function and `apply.ts` importing it with `...(ch.bars !== undefined ? { bars: clampBars(ch.bars) } : {})`. The ADR's description aligns with these requirements exactly.

### 7. Conflicts with decisions.md or CLAUDE.md guardrails

PASS — no conflicts.

- Decisions Register: no active entries; nothing violated.
- No `.fast`/`.slow` invariant: confirmed present and correct in both the Decision section (reason #2 for `arrange()`) and the Consequences section (explicit "No `.fast()`/`.slow()`" heading).
- `setcps` tempo invariant (ADR 0005): not touched.
- Tonnetz geometry, P·L·R, voice-leading: not touched.
- AGPL-3.0: no source code changed; not applicable.
- TS strict / no DOM in core: no code written.
- Agent may only generate what UI supports (kickoff §7): the agent schema extension is a consequence, not a scope violation — the UI is gaining `setChordBars` support, so the agent may set `bars`.

### 8. Acceptance Coverage Table deferral (docs-only step)

PASS. All nine acceptance IDs (A-02-01 through A-02-09) are listed in the table with "not covered — deferred to step 02.3/02.4/02.5" gap status. The explanatory note confirms this is intentional: the ADR governs design; implementation proceeds in subsequent steps. Deferral is complete and correctly documented.

---

## Minor observations (non-blocking)

1. **"Pilot-confirmed" wording in handoff decisions:** The handoff entry's Decisions Made section (line 136) states "Will be extended with `bars?: number` in step 02.3 (Pilot-confirmed)." Since this step is itself the Pilot Checkpoint, the Pilot hasn't confirmed step 02.3 yet. The ADR itself does not use this phrasing — it correctly says "will be extended." Wording issue in the handoff only, not in the ADR. Non-blocking.

2. **`timeCat()` vs. `stepcat()` conflation:** The ADR uses both terms "stepcat()" and "timeCat()" to describe the rejected alternative, noting they are "similar conceptually." In Strudel, `timeCat` is the primary function (accepting proportional duration pairs); `stepcat` is a variant. The ADR could be more precise, but the rejection reasoning applies equally to both, and the reader understands the intent. Non-blocking.

---

## Verdict

The ADR is technically accurate on all counts: the @-operator rejection is correct, the dual-mode rationale is sound and directly tied to A-02-02, the `arrange()` form is consistent with `buildComposition()`, backward-compat claims are accurate, and there are no conflicts with any guardrail or Register entry. All required sections are present and complete per the step 02.2 spec.

**APPROVED.**
