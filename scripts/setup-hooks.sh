#!/usr/bin/env bash

set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "git not found; skipping hooks setup."
  exit 0
fi

if [[ ! -d .git ]]; then
  echo "No .git directory; skipping hooks setup."
  exit 0
fi

git config core.hooksPath .githooks
echo "Configured git hooks path to .githooks"
