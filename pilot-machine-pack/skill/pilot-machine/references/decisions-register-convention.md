# Decisions Register Convention

The Decisions Register lives at `docs/<initiative>/decisions.md`. It is the consolidated record of **vigent rules** the project has accumulated — small, precise, stable decisions that bind future work.

It is required reading at every Planner and Dev invocation, and it is authoritative.

## Who writes it

**The Pilot only.** This is non-negotiable.

The Planner and Dev may **propose** entries via their summaries or blocker files. The Pilot reviews and adds or rejects manually.

Why: if the Planner or Dev could edit, they could weaken an entry to make a step pass review, or dilute a rule that's getting in the way. The file's authority comes from being human-curated.

This holds **even when the Pilot has verbally directed the entry content**. The act of writing is the Pilot's alone. "Pilot already approved the substance, writing is a formality" is a methodology violation signal — the formality is the protection.

## Entry format

```markdown
### <Decision title — short, descriptive>

**Decision:** <one-sentence rule>
**Decided:** Phase NN, <ISO date>
**Why:** <one or two sentences — optional>
**Source:** <file path or spec section — optional>
**Applies to:** <scope>
```

Keep entries small. If you're writing a paragraph, it's probably an ADR — file that instead.

## When to add an entry

The Planner or Dev should propose a new entry when:
- A specific contract is established and must be respected (route format, response shape, naming)
- A scope boundary is set ("no server-side LLM in this initiative")
- A wire format is corrected after a bug
- A repeated source of confusion is resolved

NOT for:
- Architectural decisions with reasoning → those are ADRs
- One-off implementation choices
- Style preferences → linter config
- Generic best practices

## Proposal tracking

Proposals can get forgotten. To prevent that:

- When the Planner reviews the **last step of a phase**, it lists every Register proposal that surfaced during the phase and hasn't been added to `decisions.md` yet
- The Pilot resolves each at phase approval: **Add** (writes the entry), **Reject** (with one-line note in the phase handoff), or **Defer** (to a named future phase)

No proposal crosses a phase boundary as "unresolved."

## When to mark an entry superseded

Decisions sometimes change:
1. Do NOT delete the original
2. Move it to "Superseded decisions" at the bottom
3. Add a "Superseded by" reference
4. Add date and brief reason

The trail matters for future debugging.

## Example file

```markdown
# Decisions Register — <Initiative Name>

## Active decisions

### Route format
**Decision:** Slash form only (e.g., `/constraints/evaluate`). No colon form.
**Decided:** Phase 09, 2026-02-15
**Why:** Backend convention. Colon form caused contract drift in Phase 10.
**Applies to:** All HTTP routes in this initiative.

---

### constraint_set wire shape
**Decision:** Object with `automations` array, not array directly.
**Decided:** Phase 10 correction, 2026-02-28
**Source:** `backend/src/services/constraints/types.ts`
**Applies to:** All frontend usage of constraint_set.

## Superseded decisions

### ~~constraint_set as flat array~~
**Original:** constraint_set is an array of automation objects.
**Decided:** Phase 10 (original)
**Superseded by:** "constraint_set wire shape" — Phase 10 correction.
**Reason:** Backend actually returns `{automations: [...]}`.
```

## How conflicts get caught

- **Planner in review mode** checks the Register as part of the checklist. Implementation contradicting a vigent entry → REVISE or ESCALATE.
- **Dev** reads the Register before implementing. If the step requires something that contradicts an entry, the Dev writes a `register-conflict` blocker.

## Load

In practice, adding an entry takes about 30 seconds. You'll add 1-3 entries per phase, fewer as the initiative matures. The Register pays for itself by the second phase where it prevents re-litigating a settled decision.

If you're adding 5+ entries per phase, the phase scope may be too broad.
