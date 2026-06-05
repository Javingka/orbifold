#!/usr/bin/env bash
# Fires a desktop notification when a blocker file is written.
# Does NOT pause execution — just notifies.

set -e

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ "$FILE_PATH" == *"/blockers/"*"-blocker"* ]]; then
  osascript -e "display notification \"Blocker written: $FILE_PATH\" with title \"Pilot+Machine\" sound name \"Sosumi\""
fi

exit 0
