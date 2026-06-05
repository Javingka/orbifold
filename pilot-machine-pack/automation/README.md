# Optional Automation Layer

This folder is **optional**. The `pilot-machine` skill works without it. The automation adds:

1. **Desktop notifications** (macOS) at the Pilot checkpoints
2. **Mechanical enforcement** of ADR and destructive-op checkpoints via Claude Code hooks
3. **Permission rules** that pre-approve safe operations and pre-deny dangerous ones

Use this if:
- You want to step away and be called back only when something needs you
- You don't want to rely on agents "remembering" to stop at checkpoints
- You're on macOS with `jq` installed

Skip if:
- You're on Linux or Windows (notification scripts use `osascript`; easy to adapt to `notify-send`)
- You prefer manual enforcement
- You're just trying the methodology with minimum setup

## Notes

The hooks fire at the genuine Pilot checkpoints only: inventory, ADR, destructive command, blocker (Dev OR Planner ESCALATE), phase done. They do NOT fire on auto-continuation between approved steps.

The `settings.json` is **tuned for minimal permission fatigue**: read-only commands, project test commands, and writes under standard directories (`docs/`, `src/`, `tests/`, etc.) are pre-approved. Only network/state changes outside the repo (publishing, deploying) and irreversible operations (force push, hard reset, rm -rf) require Pilot decision.

If `settings.json` still asks too often, edit it — the methodology's review checkpoints are the real safety net. See `claude-md-template.md` "Permission tuning" section for guidance.

## What's in this folder

```
.claude/
├── settings.json                              # Permission rules + hook registrations
├── agents/
│   ├── planner.md                             # Subagent version of the Planner
│   └── dev.md                                 # Subagent version of the Dev
└── hooks/
    ├── escalate-on-adr.sh                     # Pauses when an ADR is being written
    ├── escalate-on-destructive.sh             # Pauses on destructive bash ops
    ├── notify-on-blocker.sh                   # Notifies when a blocker file is written
    ├── notify-on-inventory.sh                 # Notifies when inventory is ready
    └── notify-phase-done.sh                   # Notifies on Stop
```

## Skill vs subagents

Two ways to run Planner and Dev:

**Skill mode (default)** — Activates inline in your conversation. Pros: simpler, no setup. Cons: shared context window.

**Subagent mode (this folder's `.claude/agents/`)** — Formal subagents with isolated context windows per invocation. Pros: each invocation starts fresh, no context pollution. Cons: more setup.

If you find yourself using `/clear` constantly in skill mode, switch to subagent mode.

## Installation

```bash
cp -r path/to/automation/.claude .
chmod +x .claude/hooks/*.sh
brew install jq
```

Verify:
```bash
ls -la .claude/hooks/
cat .claude/settings.json
```

## Customizing

- **For Linux**: edit `notify-*.sh` to replace `osascript ...` with `notify-send "title" "message"`
- **For Windows (WSL)**: same as Linux, plus consider `wsl-notify-send`
- **More destructive patterns**: edit `escalate-on-destructive.sh` to catch project-specific dangerous ops
- **Quieter phase-done**: `notify-phase-done.sh` fires on every Stop. Once you trust the workflow, tighten it.

## Removing the automation

```bash
rm -rf .claude/hooks .claude/settings.json
```

The skill keeps working — checkpoints will be observed by convention.
