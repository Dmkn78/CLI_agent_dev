#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
export PYTHONDONTWRITEBYTECODE=1
exec /usr/bin/python3 run.py
