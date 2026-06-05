#!/usr/bin/env bash
# Pauses Claude Code when an ADR file is about to be written.
# The Pilot reviews the ADR through the in-terminal permission prompt.

set -e

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ "$FILE_PATH" == *"docs/adr/"* ]]; then
  osascript -e "display notification \"ADR being created: $FILE_PATH — review required\" with title \"Pilot+Machine Checkpoint\" sound name \"Glass\""
  cat <<EOF
{
  "decision": "ask",
  "reason": "ADR file is being created at $FILE_PATH. Pilot review is required before the ADR is committed."
}
EOF
fi

exit 0
