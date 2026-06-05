# Handoff File Template

A handoff is the structured record of what happened in a phase. The Dev appends an entry after each step. At phase completion, the full handoff is what the Pilot reads to authorize the next phase.

The handoff is also the source of truth for **Planner review status** — each step entry carries the APPROVE/REVISE/ESCALATE history.

## File location

```
docs/<initiative>/handoffs/phase-NN-handoff.md
```

One file per phase. Multiple step entries get appended.

## Per-step entry

```markdown
## Step NN.N — <step title>

**Date:** <ISO date>
**Commit(s):** <hash(es), one per line if multiple>
**Iteration:** <N of 5>

### Completed
- <bullet>

### Files touched
- <path>

### Validation evidence (per Acceptance ID)

For each Acceptance ID this step claims to cover, include the SPECIFIC evidence:

- A-01: <evidence — e.g., "`pytest tests/test_users.py::test_signup_returns_201` → passed; response body contains `{user_id: ...}`">
- A-02: <evidence>

### Routine validations (one-liner each, no transcripts)

- `npm test` → 600 passed
- `npm run lint` → no errors

### Acceptance Coverage Table

Canonical column set — do not add or remove columns:

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01 | <one sentence> | `path/to/test.spec.ts` | unit / component / integration / e2e / manual / live-system / operability / proxy:static-analysis | covered |
| A-02 | <one sentence> | `path/to/test2.spec.ts` | component | partial — see notes |

**Notes on partial coverage:** <only if any row says partial or not covered>
**Proxy disclosures:** <only if any test type uses `proxy:static-analysis` — cite source line>
**Operability evidence:** <only if any test type is `operability` — list commands run and observations, e.g., "ran `make start-local-demo` against fresh clone; UI displayed 24 automations; seed re-ran without error">

### Decisions made (if any)
- <decision and rationale, one line each>

### Proposed Decisions Register entries (if any)
- <decision the Pilot should consider — Planner aggregates at phase-completion>

### Blockers resolved during this step (if any)
- `phase-NN-blocker-<slug>.md` — <one-line summary>. Resolution: <one line>.

### Environment state after this step
- <DB state, services running, feature flags — factual, short>

### Next-step context (only if non-obvious)
- <what the next Dev invocation specifically needs to know that isn't in the phase file or Coverage Table>

### Planner Review

(Filled by the Planner in review mode)

**Decision:** APPROVED / REVISE / ESCALATED
**Reviewed on:** <ISO date>
**Iteration:** <N of 5>
**Reason:** <one sentence or pointer to review/blocker file>
**Next action:** <"Dev proceeds to step NN.M" for auto-continuation, OR "Pilot approval required before step NN.M, reason: <one line>">
```

## On REVISE — iterations

When the Dev re-executes after REVISE, append a new section under the same step:

```markdown
### Iteration <N+1>

**Date:** <ISO date>
**Commit:** <hash>
**Reviewed feedback:** `docs/<initiative>/reviews/phase-NN-step-NN.N-review-N.md`

### Changes made in this iteration
- <what was changed from the previous iteration>

### Acceptance Coverage Table (updated)
| ... |

### Disagreement with finding (only if applicable)
**Planner said:** <quote>
**Why this seems incorrect:** <one paragraph, cite file/lines>
**What I did this iteration:** <applied defensively / held pending resolution>

### Planner Review
(Filled by Planner. The disagreement is acknowledged here — finding cleared, OR maintained with counter-evidence.)
```

## Terminal commit pattern

When a step has multiple commits and the final one IS the handoff-update itself, that commit can't include its own hash. Use this pattern:

After listing implementation commit hashes:

```
- <implementation hash 1>
- <implementation hash 2>
- **Terminal commit:** `<commit message you're about to use>`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.
```

Make the commit with that exact message. Do NOT add a follow-up commit to "fix" the missing hash. The terminal commit IS the final entry.

## Post-handoff correction entry

If a bug is found after phase handoff was finalized:

```markdown
## Post-handoff correction — <ISO date>

**Commit:** <correction hash>
**Affects steps:** NN.N

### What was found
<one paragraph>

### What was fixed
<one paragraph>

### Acceptance Coverage impact
<which Acceptance IDs are now better covered, or which were previously marked
covered but actually weren't — be honest>
```

The correction commit MUST include this handoff update. The handoff and the code must agree.

## Phase-completion entry

```markdown
## Handoff — Phase NN (<title>)

**Phase completed:** <ISO date>

### Completed
- <high-level bullets>

### Acceptance Coverage Summary

Consolidated from step entries:

| Acceptance ID | Required behavior | Covered in step | Status |
|---|---|---|---|
| A-01 | <one sentence> | NN.2 | covered |
| A-02 | <one sentence> | NN.3 | partial — fix deferred to phase NN+1 |

### Decisions made
- <decision and where documented>

### ADRs committed
- ADR NNNN: <title>

### Register entries added
- <entry title>

### Pending Register proposals resolved at phase approval
- <one-line proposal> → ACCEPTED / REJECTED / DEFERRED (with reason)

### Deferred
- <thing not done in this phase, with brief reason>

### Blockers and review escalations
- <filename and resolution, one line each>

### Iteration counts (only for steps that took multiple iterations)
- Step NN.N: approved on iteration <N>

### Next focus
- Phase NN+1, step NN+1.1 (suggested)
- Specific question or context for the next Planner invocation
```

## What NOT to put in handoffs

- Step-by-step retelling of the implementation (commits and diff do that)
- Defensive justification of decisions
- "We did a great job" narration
- Speculative future work beyond "next focus"
- Empty Coverage Tables — if no Acceptance IDs touched, state it explicitly

## Reading the handoff

The Pilot reads the phase-completion entry. The Planner in review mode reads step entries. The Planner in scoping mode reads the most recent phase-completion as part of required reading. The "Next focus" line is the most useful single piece of information.
