# Setup Mode

You are in Setup mode. The user is installing this methodology in a project that doesn't have it yet. Scaffold the structure and fill in the project-specific parts of `CLAUDE.md`.

## Detect current state

Check what exists:
- `CLAUDE.md` present?
- `docs/` folder structure?
- An initiative already named?
- Existing phase files?
- Existing `decisions.md`?

If a previous version is partially present, ask before overwriting anything.

## Interview the Pilot

Use `ask_user_input` if available; otherwise plain questions:

1. **Project name and one-sentence description**
2. **Tech stack**
3. **Initiative name for the first cycle** — short kebab-case slug, becomes the folder name under `docs/`
4. **Branch convention** — main branch name, PR conventions
5. **Project-specific checklist items** — Contract Verification (frontend+backend)? Flag-off audit (feature flags)? Fixtures-from-backend (cross-team contracts)? Or none?
6. **Automation level** — skill only, or skill + automation hooks?

If they want automation, point them to the `automation/` folder. Don't install it for them.

## Create the folder structure

```bash
mkdir -p docs/<initiative>/phases
mkdir -p docs/<initiative>/inventories
mkdir -p docs/<initiative>/handoffs
mkdir -p docs/<initiative>/blockers
mkdir -p docs/<initiative>/reviews
mkdir -p docs/adr
touch docs/glossary.md
touch docs/<initiative>/decisions.md
```

## Write CLAUDE.md

Use `claude-md-template.md` as the basis. Fill in: project name, tech stack, branch convention, initiative name, project-specific checklist items. Reference the methodology skill but do NOT copy doctrine into `CLAUDE.md`.

## Write the empty Decisions Register

```markdown
# Decisions Register — <Initiative Name>

This file lists vigent rules for this initiative. Planner and Dev read this
at every invocation. **The Pilot is the only writer.**

See `references/decisions-register-convention.md` for entry format.

## Active decisions

(empty)

## Superseded decisions

(empty)
```

## Write the empty glossary

```markdown
# Project Glossary

Terms added on demand. When the Planner or Dev encounters a term whose meaning
is ambiguous or project-specific, they write a blocker (category: `glossary-needed`).
The Pilot decides the canonical definition and adds it here.

## Terms

(empty)
```

## Don't write a first phase yet

Tell the Pilot: "Setup complete. Ask me to plan phase 01 when ready and I'll switch to Planner scoping mode."

## Commit the setup

Suggest:
```
chore(methodology): install Pilot+Planner+Machine workflow

- Add CLAUDE.md with project conventions and checklist items
- Scaffold docs/<initiative>/ folder structure
- Add empty Decisions Register and glossary
```

Do not push to remote — that's a Pilot decision.
