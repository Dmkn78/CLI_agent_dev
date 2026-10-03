#!/bin/zsh
set -e
exec /bin/zsh "$(dirname -- "$0")/scripts/open-atelier-macos.sh" "$@"
