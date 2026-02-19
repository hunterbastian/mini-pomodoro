#!/usr/bin/env bash

set -euo pipefail

mode="${1:-"--staged"}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required for secret scanning." >&2
  exit 1
fi

if [[ "$mode" != "--staged" && "$mode" != "--all" ]]; then
  echo "Usage: $0 [--staged|--all]" >&2
  exit 1
fi

files=()
if [[ "$mode" == "--staged" ]]; then
  while IFS= read -r file; do
    files+=("$file")
  done < <(git diff --cached --name-only --diff-filter=AM)
else
  while IFS= read -r file; do
    files+=("$file")
  done < <(git ls-files)
fi

if [[ ${#files[@]} -eq 0 ]]; then
  exit 0
fi

# High-signal patterns only to keep false positives low.
readonly SECRET_PATTERN='(AIza[0-9A-Za-z_-]{35}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN (RSA|EC|DSA|OPENSSH|PGP)? ?PRIVATE KEY-----)'

found=0

for file in "${files[@]}"; do
  [[ -n "$file" ]] || continue

  if [[ "$mode" == "--staged" ]]; then
    if ! git cat-file -e ":$file" 2>/dev/null; then
      continue
    fi
    content="$(git show --no-textconv ":$file" 2>/dev/null || true)"
  else
    if [[ ! -f "$file" ]]; then
      continue
    fi
    content="$(cat "$file" 2>/dev/null || true)"
  fi

  if [[ -z "$content" ]]; then
    continue
  fi

  if ! printf "%s" "$content" | grep -Iq .; then
    continue
  fi

  matches="$(printf "%s" "$content" | grep -nE "$SECRET_PATTERN" || true)"
  if [[ -n "$matches" ]]; then
    found=1
    echo "Potential secret detected in $file:" >&2
    echo "$matches" >&2
    echo >&2
  fi
done

if [[ $found -ne 0 ]]; then
  cat >&2 <<'EOF'
Commit blocked by local secret guard.
If this is a false positive, rotate/redact first and then commit.
EOF
  exit 1
fi

exit 0
