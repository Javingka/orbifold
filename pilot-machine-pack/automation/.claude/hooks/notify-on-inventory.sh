#!/usr/bin/env bash
# Fires a desktop notification when an inventory file is written.

set -e

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

if [[ "$FILE_PATH" == *"/inventories/phase-"*"-inventory.md" ]]; then
  osascript -e "display notification \"Inventory ready for Pilot review: $FILE_PATH\" with title \"Pilot+Machine Checkpoint\" sound name \"Glass\""
fi

exit 0
