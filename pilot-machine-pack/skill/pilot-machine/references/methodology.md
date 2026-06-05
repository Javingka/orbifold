# Methodology — Pilot + Planner + Machine

> Loaded when the skill activates. The SKILL.md gives the routing logic; this file gives the principles.

## Three roles

**Pilot** (human) — owns product direction, architecture, scope, and the Decisions Register. Approves at five checkpoints. Does not type code or write phase prompts.

**Planner** (AI) — has two sub-modes:
- *Scoping*: reads project state and writes the next phase file
- *Review*: judges each Dev step against the Pilot Review Checklist, returns APPROVE / REVISE / ESCALATE

The Planner never writes source code and never edits the Decisions Register (only proposes entries).

**Machine / Dev** (AI) — executes exactly one step at a time. Reads required docs, implements, tests, commits (code + docs together), writes a handoff entry with an Acceptance Coverage Table. When stuck, writes a blocker and stops.

## Seven principles

### 1. Spec first, code second — no implicit implementation

No code without an approved spec. If the Dev finds itself implementing something not in the phase file, it stops and writes a blocker.

If the next phase file does not exist, the Dev does NOT invent one. It writes a `phase-missing` blocker and stops. Only the Pilot decides phase existence.

### 2. Phases, steps, and auto-continuation

Work is organized into **phases**. Each phase has a one-sentence Purpose, a Gate (preconditions), an Expected result, 3-7 numbered Steps, Phase Acceptance criteria with unique IDs (`A-01`, `A-02`...), and ADR Triggers.

Each Step is atomic and individually reviewable. The Dev executes exactly one step per invocation.

**Auto-continuation**: after the Planner APPROVES a step, the Dev proceeds to the next step in the same session without waiting for a Pilot prompt — UNLESS:
- The next step is an inventory step
- The current step surfaced unresolved Register proposals
- The Pilot has said "stop after this step"
- The next phase is starting

The Planner's review block explicitly states the "Next action" so the Dev knows whether to auto-continue.

### 3. Read before write

At the start of every Planner and Dev invocation, read in order:
1. `CLAUDE.md`
2. `references/methodology.md` (this file)
3. `docs/<initiative>/decisions.md` — the Decisions Register
4. The most recent handoff
5. ADRs and the phase file relevant to the work

If any conflict, stop and surface the conflict. Do not silently resolve.

### 4. Inventory before implementation

Code-touching phases begin with an inventory step. The Dev produces `docs/<initiative>/inventories/phase-NN-inventory.md` and STOPS. The Pilot reviews scope and resolves any open decisions before step NN.2 begins.

Open decisions surfaced in the inventory MUST be resolved before implementation starts. They cannot be inherited silently.

### 5. Reversibility by default

Feature flags gate behavior changes. Migrations are additive unless the Pilot explicitly approves a destructive one. Renames preserve aliases.

Byte-identical guarantee: with the new flag off (default), the system's output on identical input must be byte-identical to pre-phase main.

### 6. Acceptance is proven by mapping, not by green checks

Green tests are necessary but not sufficient. Every step handoff entry contains an **Acceptance Coverage Table** mapping each relevant Acceptance ID to:
- Required behavior (one sentence)
- Test file
- Test type (`unit` / `component` / `integration` / `e2e` / `manual` / `live-system` / `operability` / `proxy:static-analysis`)
- Gap status (`covered` / `partial` / `not covered — <reason>`)

The cited test must exercise the actual user-facing behavior, not a helper. For verbatim ports where the behavior cannot run in the test environment, `proxy:static-analysis` is acceptable if the source is citable and the proxy use is disclosed in the table.

**Operability** is a specific kind of acceptance: it means a fresh operator can execute the result conforming to the phase's runbook, from zero. A phase that delivers a feature is not done when its tests pass — it is done when those tests pass AND an operator can actually use the result in the target environment. See principle 8 below.

**Partial coverage closure**: when scoping the next phase, the Planner reads the prior phase's coverage summary. Every "partial" or "not covered" entry must either become an explicit Acceptance ID in the new phase, or be marked Permanently Deferred with a written reason. Partials cannot silently accumulate.

### 7. Decisions Register

`docs/<initiative>/decisions.md` holds the vigent rules the project has accumulated — small, precise, stable decisions that bind future work (route formats, response shapes, scope boundaries).

- **Pilot writes; Planner and Dev only propose.** This holds even when the Pilot has verbally directed the entry content. The act of writing is the Pilot's alone.
- **Required reading every invocation.** Authoritative — if code conflicts with the Register, the Register wins. The Dev writes a `register-conflict` blocker and stops.
- **Tracking**: when reviewing the last step of a phase, the Planner lists every Register proposal that surfaced and hasn't been added yet. The Pilot resolves each at phase approval (add, reject with one-line note, or defer to a named future phase).

The Register is distinct from ADRs (which document architectural reasoning), handoffs (which document phase outcomes), and CLAUDE.md (which documents project conventions stable from day one).

### 8. Operability before phase completion

A **feature phase** — a phase that delivers something a user, operator, or downstream system will run — does not close on "tests pass." It closes on "an operator can execute the result from zero in the target environment."

Feature phases MUST include at least one Acceptance ID with validation method `operability`. Examples of operability claims:
- "A fresh local clone runs `make start-local-demo` and the UI displays the expected data"
- "Migration applies cleanly against an empty database"
- "Seed script is idempotent — running twice produces the same state"
- "All required env vars and flags are documented and applied by the launcher"

The phase file's "Operability requirements" section lists what must be true for operability and how it will be proven. The Dev's handoff provides the evidence (commands run, output observed).

**Non-feature phases** — pure refactoring, docs-only, internal plumbing with no user-facing or operator-facing result — are exempt. State exemption explicitly in the phase Purpose: "No operability requirements — pure refactor."

If the Dev discovers during implementation that operability cannot be met without changes outside the step (extra migrations, additional flags, new commands), this is NOT a silent fix. Write an `operability-gap` blocker. The Pilot decides whether to expand the step, add a new step, or defer to a runbook task.

This rule exists because "code-complete" and "pilot-usable" diverge by default in projects with non-trivial environments. The methodology closes that gap by treating operability as a first-class acceptance criterion, not a follow-up task.

## The five Pilot checkpoints

1. **Inventory completed** — review scope, resolve open decisions
2. **ADR being created** — review architectural decision before commit
3. **Destructive operation** — review before execution
4. **Blocker surfaced** — review on Pilot's own time
5. **Phase complete** — review handoff, resolve pending Register proposals, authorize next phase

Outside these, the Planner (in either sub-mode) and Dev operate without Pilot intervention. The Planner in review mode handles step-level review automatically. It escalates to the Pilot when:
- It cannot determine if the step meets acceptance
- A Register conflict appears
- An unexpected ADR-worthy decision surfaces
- A model semantics change is proposed (changes to value meanings, thresholds, defaults — always Pilot)
- The Reviewer-Dev cycle hits 5 iterations, OR sooner if the same finding fails twice (don't wait for iteration 5 when the pattern is clear)

## Definition of Done

A **step** is done when its Acceptance IDs are covered (mapped to relevant tests in the handoff table), all docs touched are committed alongside the code, the commit format is correct, and the Planner has APPROVED.

A **phase** is done when all its steps are done, ADRs in "ADR Triggers" are committed, every Register proposal made during the phase is resolved, any post-handoff fixes have updated the handoff in the same commit, and the Pilot has signed off.

A **feature phase** is additionally done only when operability Acceptance IDs are proven — not just the code-level tests. The Pilot's phase-completion review explicitly checks operability evidence in the handoff.

## What gets surfaced (and what doesn't)

Both Planner and Dev proactively surface:
- Spec / code / Register conflicts
- Missing decisions
- Unexpected ADR-worthy choices
- Scope creep
- New dependencies, env changes, CI changes
- Model semantics changes
- Candidate Register entries

Neither surfaces:
- Style preferences
- Speculative refactoring
- "While you're in there" suggestions

## What the agents do not do

- Silent governance resolution
- "While you're in there" changes
- Deletion of code under feature flag until the Pilot removes the flag
- New dependencies without Pilot approval
- Work without an approved phase prompt
- Invention of future phases
- Editing decisions.md (propose, never write)

## Closing

Produce reviewable, reversible, well-scoped software with AI assistance. Human in the decision seat at five checkpoints. AI in the execution seat between them. Departures from the methodology are noise that compounds.
