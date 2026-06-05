# Pilot + Planner + Machine

A methodology for AI-assisted software development, packaged as a Claude Skill plus optional automation.

## What this is

Three roles working together to ship reviewable, reversible, well-scoped software:

- **Pilot** (human) — owns direction, approves at five checkpoints
- **Planner** (AI, two sub-modes) — scopes phases AND reviews each step
- **Machine / Dev** (AI) — executes one step at a time

Between checkpoints, the Pilot can step away. After the Planner APPROVES a step, the Dev auto-continues to the next step in the same session. The Pilot is interrupted only at the five checkpoints: inventory ready, ADR being created, destructive command, blocker surfaced, phase complete.

## Two adoption levels

### Level 1 — Skill only

```bash
npm install -g @anthropic-ai/claude-code
cp -r skill/pilot-machine ~/.claude/skills/
```

### Level 2 — Skill + automation

```bash
cd your-project
cp -r path/to/automation/.claude .
chmod +x .claude/hooks/*.sh
brew install jq
```

See `automation/README.md` for details.

## The session flow

```
1. Pilot: "Plan phase 03"
2. Planner (scoping) → writes phase-03.md (closes prior partials) → 3-sentence summary
3. Pilot reviews phase file → approves
4. Pilot: "Execute step 03.1"
5. Dev → does inventory step → STOPS (inventory checkpoint)
6. Pilot reviews inventory + resolves open decisions → approves
7. Pilot: "Execute step 03.2"
8. Dev → implements, tests, commits (code + docs together), writes handoff with Acceptance Coverage Table
9. Planner (review) → 8-item checklist + project-specific items → APPROVE / REVISE / ESCALATE
   - APPROVE → marks handoff with "Next action: Dev proceeds to step 03.3"
   - Dev auto-continues to step 03.3 in same session, no Pilot prompt
   - REVISE → write review file, Dev re-executes (iteration 2 of 5)
   - ESCALATE → write blocker, Pilot reviews
10. Loop until phase complete
11. Last step's APPROVE includes "Pending Register proposals" list
12. Pilot reviews final handoff, decides pending proposals → approves phase complete
13. Pilot: "Plan phase 04" → loop back to step 2
```

In step 9 (APPROVE → auto-continue) and 8→9 transitions, **no human action needed**.

## What's in this pack

```
pilot-machine-pack/
├── README.md                                    # This file
├── skill/
│   └── pilot-machine/
│       ├── SKILL.md
│       └── references/
│           ├── methodology.md                   # 7 principles, ~130 lines
│           ├── planner-role.md                  # Scoping + review sub-modes
│           ├── dev-role.md                      # Dev flow, REVISE handling, blockers
│           ├── pilot-checkpoints.md             # 5 checkpoints + Register update
│           ├── setup.md                         # New project scaffold
│           ├── glossary-convention.md
│           ├── decisions-register-convention.md
│           ├── phase-template.md
│           ├── blocker-template.md              # 9 categories
│           ├── handoff-template.md              # Canonical Coverage Table, terminal commit
│           ├── inventory-template.md            # Source-of-truth check inside
│           └── claude-md-template.md            # Permission tuning + /clear guidance
└── automation/                                  # Optional
    ├── README.md
    └── .claude/
        ├── settings.json                        # Generous allow list
        ├── agents/
        │   ├── planner.md
        │   └── dev.md
        └── hooks/
            ├── escalate-on-adr.sh
            ├── escalate-on-destructive.sh
            ├── notify-on-blocker.sh
            ├── notify-on-inventory.sh
            └── notify-phase-done.sh
```

## Quick start

1. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
2. Install the skill: `cp -r skill/pilot-machine ~/.claude/skills/`
3. (Optional) Install automation: `cp -r automation/.claude your-project/ && chmod +x your-project/.claude/hooks/*.sh`
4. In a project: `cd your-project && claude`
5. Tell Claude: "Set up the Pilot+Planner+Machine methodology in this project"
6. Claude interviews you (6 questions), scaffolds `CLAUDE.md`, `docs/`, decisions.md, glossary.md
7. Review `CLAUDE.md` — especially Permission tuning and Context hygiene sections
8. Tell Claude: "Plan phase 01"

## When to use this methodology

For multi-phase software work where:
- Scope is bigger than one session
- Decisions accumulate and need to be auditable
- Reversibility matters
- Acceptance criteria are non-trivial
- Two or more people might touch the project over time

**Overkill** for quick scripts, one-off bug fixes, throwaway exploration.

## License

Use freely. If you publish improvements, credit appreciated but not required.
