#!/usr/bin/env bash
# Pauses Claude Code when a destructive bash command is detected.

set -e

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

DESTRUCTIVE_PATTERNS=(
  "git push --force"
  "git push -f"
  "git reset --hard"
  "git clean -fd"
  "rm -rf"
  "DROP TABLE"
  "DROP DATABASE"
  "TRUNCATE"
  "terraform destroy"
  "terraform apply"
  "kubectl delete"
  "aws s3 rm --recursive"
  "npm publish"
  "yarn publish"
  "cargo publish"
)

for PATTERN in "${DESTRUCTIVE_PATTERNS[@]}"; do
  if [[ "$COMMAND" == *"$PATTERN"* ]]; then
    osascript -e "display notification \"Destructive command flagged: $PATTERN — review required\" with title \"Pilot+Machine Checkpoint\" sound name \"Sosumi\""
    cat <<EOF
{
  "decision": "ask",
  "reason": "Command contains destructive pattern: $PATTERN. Pilot review is required."
}
EOF
    exit 0
  fi
done

exit 0
