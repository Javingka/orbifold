---
name: pilot-machine
description: Operate the Pilot+Planner+Machine methodology for AI-assisted software development. Use this skill whenever the user mentions Pilot+Machine, Pilot+Planner+Machine, phase prompts, phase NN, step NN.N, inventory steps, handoff notes, blocker files, ADR triggers, Decisions Register, acceptance coverage, or asks to scope, plan, execute, or review a phase or step. Also use when the user references CLAUDE.md and asks about phases, even if they don't name the methodology explicitly. This skill keeps the human Pilot in the decision seat at five defined checkpoints while letting the AI Planner role handle both phase scoping AND step-level review, with the Dev role executing one step at a time and auto-continuing between approved steps.
---

# Pilot + Planner + Machine

Three roles working together to ship reviewable, reversible, well-scoped software:

- **Pilot** (human) — owns direction, approves at five checkpoints
- **Planner** (AI, two sub-modes) — scopes phases AND reviews each step
- **Machine / Dev** (AI) — executes one step at a time

Between checkpoints, the Pilot can step away. After the Planner APPROVES a step, the Dev auto-continues to the next step in the same session.

## When to activate

When the user wants to: plan the next phase (Planner scoping), execute a step (Dev), review a completed step (Planner review), review at one of the five Pilot checkpoints, set up the methodology in a new project, resolve a blocker, add a glossary term, or add an entry to the Decisions Register.

If the user just asks a generic coding question with no mention of phases or the methodology, do NOT activate.

## Required reading when the skill activates

1. `CLAUDE.md` (project overrides, current initiative)
2. `references/methodology.md` (the full doctrine, 7 principles)
3. **`docs/<initiative>/decisions.md`** (the Decisions Register — authoritative on vigent rules)
4. The most recent handoff in `docs/<initiative>/handoffs/` if any
5. ADRs in `docs/adr/`
6. `docs/glossary.md` if it exists

If `CLAUDE.md` doesn't exist, the project hasn't been set up — tell the user and offer to scaffold via `references/setup.md`.

If anything conflicts (especially with the Register), STOP and surface. Do not silently resolve.

## Identify your mode

- **Planner mode** — scope the next phase OR review a step the Dev just completed. Mode is decided by project state. Read `references/planner-role.md`.
- **Dev mode** — execute a step from a phase file, or "run step NN.N". Read `references/dev-role.md`.
- **Pilot-support mode** — Pilot is reviewing an inventory, ADR, blocker, handoff, or Register update. Help them decide; don't act unilaterally. Read `references/pilot-checkpoints.md`.
- **Setup mode** — installing the methodology in a new project. Read `references/setup.md`.
- **Glossary mode** — Pilot is adding or revising a term. Read `references/glossary-convention.md`.
- **Register mode** — Pilot is adding or revising an entry in `decisions.md`. Read `references/decisions-register-convention.md`.

## The five Pilot checkpoints

1. **Inventory completed** — Pilot reviews scope, resolves open decisions
2. **ADR being created** — Pilot reviews the architectural decision
3. **Destructive command** — Pilot reviews force-push, DROP TABLE, etc.
4. **Blocker surfaced** — Pilot reviews (Dev-written OR Planner ESCALATE)
5. **Phase complete** — Pilot reviews handoff, resolves pending Register proposals

Step-level review between these is the Planner's job in review mode. The Pilot is called only when review escalates.

## Acceptance is proven by mapping, not green checks

The most important principle: green tests are necessary but not sufficient. Every step handoff must include an **Acceptance Coverage Table** mapping each phase Acceptance ID to specific tests that prove the user-facing behavior. The Planner rejects steps where the mapping is missing or tests exercise helpers instead of acceptance behavior.

For **feature phases** — phases that deliver something a user, operator, or downstream system will run — at least one Acceptance ID must have validation method `operability`. Operability means a fresh operator can execute the result from zero in the target environment (boot commands, required data, flags, migrations, smoke checks). Code-level tests alone do not prove operability. Non-feature phases (pure refactor, docs, internal plumbing) are exempt and state so in the Purpose.

Partial coverage is closed by the Planner at next-phase scoping (include or permanently defer). Partials cannot silently accumulate.

## Decisions Register

`docs/<initiative>/decisions.md` is required reading every invocation. Authoritative — if code conflicts, Register wins. Only the Pilot writes (even when the Pilot has verbally directed the content — the formality is the protection). Planner and Dev propose; Pilot resolves at phase approval.

## Spec first, no implicit implementation

No code without an approved spec. If the next phase file doesn't exist, the Dev writes a `phase-missing` blocker and stops. Don't invent.

## Auto-continuation

After APPROVE, the Planner's review block specifies "Next action": either "Dev proceeds to step NN.M" (auto-continue) or "Pilot approval required before step NN.M, reason: ..." (stop). The Dev reads this line and acts accordingly. This is the methodology's automation promise.

## File and folder conventions

```
docs/
├── <initiative>/
│   ├── phases/phase-NN.md                    # Planner writes (scoping), Dev reads
│   ├── inventories/phase-NN-inventory.md     # Dev writes, Pilot reviews
│   ├── handoffs/phase-NN-handoff.md          # Dev writes, Planner reviews entries
│   ├── reviews/phase-NN-step-NN.N-review-N.md # Planner writes (review REVISE)
│   ├── blockers/phase-NN-blocker-<slug>.md   # Dev or Planner writes, Pilot reviews
│   └── decisions.md                          # Decisions Register — Pilot only writes
├── adr/NNNN-<slug>.md                        # Pilot-approved architectural decisions
└── glossary.md                               # Terms added on demand
```

`<initiative>` is named in `CLAUDE.md`. If unnamed, ask the user before writing any phase, handoff, or review file.

## Output discipline

- Planner (scoping): 3 sentences after writing the phase file
- Planner (review): 4 lines after writing the review or escalation
- Dev: at most 4 sentences after the step (handoff is the record; response is a pointer)
- Blocker written: one sentence pointing to the file, then stop

No congratulations, no narration, no filler.

## Anti-patterns

Don't produce these — they look productive but harm the methodology:
- Quick reference cards duplicating Purpose/Gate/Expected
- Risks/Rollback tables in every phase
- Subdividing steps into "plumbing only" sub-steps
- Acceptance criteria without IDs
- Approving a step without checking the Acceptance Coverage Table
- Editing the Decisions Register from AI mode
- Inventing future phases when the phase file doesn't exist
- Restating the methodology inside phase files

## Reference files

Load based on the mode identified above:

- `references/methodology.md` — Full doctrine, 7 principles
- `references/planner-role.md` — Scoping + review sub-modes
- `references/dev-role.md` — Dev session flow, REVISE handling, blocker protocol
- `references/pilot-checkpoints.md` — Pilot-support mode
- `references/setup.md` — Setting up a new project
- `references/glossary-convention.md` — Glossary growth on demand
- `references/decisions-register-convention.md` — Register format and protocol
- `references/phase-template.md` — Phase file structure
- `references/blocker-template.md` — Blocker structure with 10 categories
- `references/handoff-template.md` — Handoff structure with canonical Coverage Table
- `references/inventory-template.md` — Inventory structure with source-of-truth check
- `references/claude-md-template.md` — Project's CLAUDE.md template

## Optional: automation

If the user wants hooks, desktop notifications, or "interrupt me only at checkpoints," tell them about the optional `automation/` folder. The skill works without it.
