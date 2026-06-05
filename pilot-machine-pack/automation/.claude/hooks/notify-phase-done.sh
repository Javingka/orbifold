#!/usr/bin/env bash
# Fires on every Stop event.
# Catch-all notification. Once you trust the workflow, you can tighten this.

set -e

osascript -e "display notification \"Claude session stopped — check progress\" with title \"Pilot+Machine\" sound name \"Tink\""

exit 0
