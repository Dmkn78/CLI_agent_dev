#!/bin/zsh
set -e
atelier_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd -- "$atelier_root"
export PYTHONDONTWRITEBYTECODE=1
# Node is optional for opening an already prepared source checkout: Electron's
# console-only Node mode can run the launcher without opening an Electron app.
if command -v node >/dev/null 2>&1; then
  exec node "$atelier_root/scripts/launch-desktop.cjs" "$@"
fi
atelier_node="$atelier_root/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
if [[ ! -x "$atelier_node" ]]; then
  print -u2 'Atelier nécessite ses dépendances locales. Exécute npm ci puis npm run vendor.'
  exit 1
fi
export ELECTRON_RUN_AS_NODE=1
exec "$atelier_node" "$atelier_root/scripts/launch-desktop.cjs" "$@"
