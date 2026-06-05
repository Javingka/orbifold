# Phase File Template

Every phase file follows this exact structure. The Planner writes phase files in this shape — no variations, no creative additions, no missing sections.

## Template

```markdown
# Phase NN — <Title>

**Purpose:** <one sentence describing the goal>
**Gate:** <what must be true before this phase starts>
**Expected phase result:** <what is true when this phase ends>

---

## Step NN.1 — <Title>

PROMPT → <what the Dev reads, what it produces, what it must not do>

Implementation requirements:
- <bullet>

Validation:
- <command or check>

Expected result:
- <observable outcome>

CHECKPOINT → Commit message:
`<type>(<scope>): Phase NN step NN.N — <description>`

---

## Step NN.2 — <Title>

[same shape]

---

## Phase Acceptance

Each criterion has a unique ID (used in handoff Acceptance Coverage Tables):

- **A-01** — <criterion describing user-facing behavior>
  - Validation method: `unit` / `component` / `integration` / `e2e` / `manual` / `live-system` / `operability`
- **A-02** — <criterion>
  - Validation method: ...

If validation method is `live-system`, `manual`, or `operability`, the Dev cannot satisfy the criterion with static analysis alone. The Planner enforces this in review mode.

**Feature phases** (phases delivering something a user, operator, or downstream system will run) MUST include at least one Acceptance ID with `operability` as validation method. Non-feature phases (pure refactor, docs-only, internal plumbing) state exemption in the Purpose: "No operability requirements — pure refactor."

## Operability requirements

Required for feature phases. Lists what must be true for an operator to execute the result from zero, and how it will be proven.

Fill in the categories that apply; omit those that don't:

- **Boot commands**: `<command to start the result locally / in the target env>` → expected result
- **Required data**: <fixtures, seeds, fresh DB migrations needed before boot>
- **Required env vars / flags**: <list with default values and where they're set>
- **Required headers / inter-service contracts**: <if the result is a service consumed by others>
- **Migrations**: <prisma migrate / sql / etc., must apply against fresh DB>
- **Smoke checks**: <commands and expected observations that prove the result is alive>
- **Idempotency**: <if seeds or bootstrap commands must be safely re-runnable, state that and how it's tested>

For non-feature phases, replace this entire section with: "No operability requirements — pure refactor / docs / internal plumbing only."

## Partial coverage from prior phase (if any)

Lists every partial / deferred entry from the prior phase and what this phase does with each:

- Prior A-XX (partial) → addressed by new A-YY in this phase
- Prior A-ZZ (deferred) → permanently deferred: <reason>

If none: "No prior partials to address."

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **<title>** — Trigger: <which step or condition>
- **<title>** — Trigger: <which step or condition>

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/<initiative>/handoffs/phase-NN-handoff.md`. See `handoff-template.md`.
```

## Notes on Acceptance IDs

- IDs are unique within a phase: `A-01`, `A-02`, etc.
- For initiatives spanning many phases, prefix with phase number: `A-09-01`. Avoids ambiguity in the Register and review files.
- An Acceptance ID describes **user-facing behavior**, not internal implementation. "Helper returns correct type" is NOT an Acceptance ID. "User can submit form and see confirmation" IS.
- If an Acceptance ID would only be "covered" by a test of an internal helper, the ID is wrong — rewrite it to describe what the user experiences.

## Anti-patterns — do NOT add these

- Quick reference cards duplicating Purpose/Gate/Expected at the top
- Risks/Rollback tables for every phase (add only when genuinely unusual risk)
- Inputs/Outputs/Out-of-scope blocks as separate sections (the step PROMPT covers this)
- Pre-flight checklists as separate sections
- Subdividing steps into "plumbing-only" sub-steps
- "Pilot prompt: paste verbatim" wrappers
- Conditional decisions ("if X do Y else Z" — name the decision, surface it as open)
- Restating the methodology
- Acceptance criteria without IDs

## Step numbering

- Steps: NN.1, NN.2, NN.3, etc.
- Typically 3-7 per phase
- First step of any code-touching phase is the inventory step
- Atomic and individually reviewable
- NOT subdivided

## Commit format

```
<type>(<scope>): Phase NN step NN.N — <description>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Iterations (after REVISE) use the same step number. The iteration count lives in the handoff entry.

## Purpose test

The Purpose is one sentence. If the phase needs two sentences to describe, the phase is too big — split it.
