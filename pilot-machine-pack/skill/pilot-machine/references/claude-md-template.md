# CLAUDE.md

This file is the project-specific layer of the Pilot+Planner+Machine methodology. It overrides defaults from the methodology skill where needed and provides project-specific context.

## About this project

[Two or three sentences. What this project is, what it serves, what the stack is.]

## Methodology

This project follows the **Pilot + Planner + Machine** methodology, encoded as the `pilot-machine` skill.

The skill activates automatically based on triggers (phase prompts, phase NN, inventory steps, handoffs, blockers, ADRs). For full doctrine, see `references/methodology.md`.

The Planner has two sub-modes: scoping (writing the next phase) and review (judging each step against the Pilot Review Checklist). After APPROVE, the Dev auto-continues to the next step.

## Current initiative

**Name:** [kebab-case slug, e.g., `auth-rebuild`]
**Goal:** [one sentence describing the broader goal]
**Started:** [ISO date]

When this initiative is complete, archive its folder and start a new one.

## Project-specific conventions

### Branch and commit

- Main branch: [`main` / `master` / other]
- Initiative branch pattern: `[<initiative>-<short-slug>]`
- Commit format: `<type>(<scope>): Phase NN step NN.N — <description>`
- PR convention: [one PR per phase / one PR per initiative / direct to main]

### Spec location

[Where do specs live? `docs/specs/<feature>.md`? Confluence? GitHub issues?]

### Test commands

- Run all tests: [`npm test` / `pytest` / `cargo test`]
- Run lint: [command]
- Run typecheck: [command]
- Run a specific test: [pattern]

These are referenced by phase files in their Validation sections.

## Project-specific guardrails

[Anything special. Examples:
- "Legacy v3 API must remain byte-compatible until 2026-12-31."
- "Schema migrations must be reversible within 24 hours."
- "All public endpoints must have a corresponding integration test."

If none: "None — defaults from the methodology apply."]

## Project-specific checklist additions

The base Pilot Review Checklist has 8 items. Optional additions for this project:

### Contract Verification (enable for frontend ↔ backend projects)

For each step consuming a backend endpoint, the Dev's handoff must include a Contract Verification table:

| Endpoint | Backend source file | Response shape used by UI | Test fixture matches backend? | Verified by |
|---|---|---|---|---|
| `/some/endpoint` | `backend/src/.../controller.ts` | `{items: [...]}` | yes — fixture in `tests/fixtures/items.json` | manual inspection |

Without this table, the Planner REVISES the step. Prevents wire-shape bugs.

### Flag-off request audit (enable for feature-flagged projects)

For each step gating new behavior behind a flag, the handoff must include:

```
Flag off request audit:
- /endpoint-1: not called
- /endpoint-2: not called
```

Proves the byte-identical guarantee beyond "existing tests still pass."

### Fixtures from backend source (enable for cross-team contracts)

Test fixtures for backend payloads must be either: copied from backend service/controller tests, cited from backend source with line numbers, or generated from a shared schema with citation. Hand-crafted "what the response probably looks like" fixtures are not allowed.

### [Add your own]

## Definition of Done specific to this project

[Project-specific quality bar beyond methodology defaults. Build over time. Start with "None beyond methodology defaults."]

## Permission tuning

If `automation/.claude/settings.json` is asking the Pilot too often, edit it. The methodology's review checkpoints are the real safety net; permissions are just keyboard convenience.

Suggested guidance:
- **Read-only** (`git status`, `ls`, `grep`, `cat`) → `allow`
- **Test commands** specific to this project → `allow`
- **Writes under `docs/`, `src/`, `tests/`** → `allow`
- **Destructive** (`git push --force`, `rm -rf`, `DROP TABLE`, `terraform apply`) → `deny` or `ask`
- **Network/state changes outside repo** (publish, deploy) → `ask` or `deny`

This project's tuning: [describe any project-specific permission choices beyond defaults]

## Context hygiene (when to /clear)

In Claude Code skill mode, context accumulates. Use `/clear` (or open a new session) at:

- **Between phases** — once a handoff is finalized, clear before the next scoping
- **After a substantial blocker resolution** — clear before resuming
- **When the agent contradicts an earlier decision** — context drift sign
- **After 2-3 hours of continuous work** — context window pressure degrades quality

Do NOT clear:
- Between auto-continued steps within the same phase
- During a REVISE iteration cycle (Dev needs to see the prior review file)
- Mid-step (loses execution state)

If you're clearing constantly, switch to **subagent mode** (install `automation/.claude/agents/`) — each invocation gets isolated context by design.

## Decisions Register

`docs/<initiative>/decisions.md`. Required reading every Planner and Dev invocation. **Only the Pilot writes.**

See `references/decisions-register-convention.md` for entry format.

## Glossary

`docs/glossary.md`. Grows on demand. See `references/glossary-convention.md`.

## Pilot identity (optional)

Pilot: [name or handle]
Time zone: [for async handoff notes]
