# Blocker File Template

A blocker is the Dev's structured "I cannot proceed without Pilot input." Async-friendly: the Pilot reviews on their own time.

## File location

```
docs/<initiative>/blockers/phase-NN-blocker-<short-slug>.md
```

The `<short-slug>` is 2-4 words describing the blocker.

## Template

```markdown
# Blocker — Phase NN step NN.N

**Created:** <ISO date>
**Category:** <one of: spec-conflict | missing-decision | scope-issue |
environment | register-conflict | phase-missing | review-escalation |
ADR-needed | glossary-needed | operability-gap>
**Step:** NN.N (<step title>) — or "n/a" if pre-step
**Iteration (if applicable):** N of 5

## What I was trying to do

<One paragraph. What the step instructed, what implementation approach I took,
where I was when blockage hit.>

## What blocks progress

<One paragraph. Be concrete: what file, what command, what error message,
what conflicting decision, what missing piece. If this is a model semantics
change, a source-of-truth mismatch, or a mid-step blockage, say so explicitly here.>

## What would prove this unblocked

<One sentence. What needs to be true for me to safely resume? Example:
"The Pilot decides which of the two candidate response shapes is canonical,
and the decision is recorded in the Decisions Register."

This is mandatory. If you can't state it, the blocker isn't fully diagnosed.>

## Options for the Pilot

<Bulleted list of plausible resolutions. REQUIRED. If no options exist,
state "No options identified" with a reason.>

- Option A: <description>
- Option B: <description>
- Option C: <description>

## Current repo state

<One paragraph. Working tree clean? Uncommitted changes? Reverted anything?
Partial commit?

For mid-step blockage specifically, list commits of this step already in branch
(hash + one-line) and what was NOT committed when blockage hit.>

## Resolution

<Left blank by the Dev. The Pilot fills this in after deciding. Preserves the trail.>
```

## Categories

- **spec-conflict** — spec and code disagree, or two specs disagree, or methodology and project decisions disagree. Includes source-of-truth mismatches (consumer queries don't match producer code path).
- **missing-decision** — a choice must be made before implementation continues (algorithm, data type, naming, scope, model semantics). For model semantics changes specifically, note that explicitly in "What blocks progress" — the Pilot will require an ADR and a Register entry.
- **scope-issue** — implementation would touch outside the step OR the step is partially committed when blockage hits (mid-step). Note which case in "What blocks progress".
- **environment** — new dependency, CI / build / deployment / env change needed.
- **register-conflict** — step would violate a vigent Register entry.
- **phase-missing** — the phase file the Dev was asked to execute does not exist.
- **review-escalation** — written by the Planner in review mode when iteration limit hits or early escalation conditions occur.
- **ADR-needed** — decision is ADR-worthy but NOT in the phase's pre-identified ADR Triggers.
- **glossary-needed** — a term is ambiguous and would benefit from a project glossary entry.
- **operability-gap** — code-level tests pass, but the result cannot be executed from zero in the target environment. Use when implementing reveals that operability cannot be met without changes outside the step (extra migrations, additional flags, new commands, missing fixtures). The Pilot decides: expand the step, add a new step, or defer to a runbook task.

## Review-escalation blockers — extra requirements

When the Planner writes one, include:

```markdown
## Review iteration history

| Iteration | Date | Result | Review file |
|---|---|---|---|
| 1 | <date> | REVISE | `reviews/phase-NN-step-NN.N-review-1.md` |
| ... | ... | ... | ... |

## What kept failing

<One paragraph. Same checklist item each time? Different items? Was the Dev
making the changes asked but missing something deeper?>

## Recommendation

<One paragraph. What does the Planner think the Pilot should do?>
```

## What NOT to put in a blocker

- Defense of why you wrote it
- Speculation beyond the Options section
- Detailed code dumps (cite file paths and line numbers)
- Apologies or filler

## After

The blocker triggers a Pilot interruption. The Pilot reviews using `pilot-checkpoints.md`, decides, fills in Resolution, tells the next session what to do.

Blocker files are NEVER deleted. They are the audit trail. If the resolution is "abandon the phase," the file stays — it records why.
