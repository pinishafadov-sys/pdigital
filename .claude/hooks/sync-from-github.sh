#!/usr/bin/env bash
# When a Claude session starts on this computer: first save any local changes
# as a snapshot, then download newer work from GitHub (if any) into this folder.
# Only fast-forward updates are applied; if the two copies diverged, nothing is
# changed and Claude will sort it out on request.

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -q -m "גיבוי אוטומטי $(date '+%Y-%m-%d %H:%M')" >/dev/null 2>&1
fi

GIT_TERMINAL_PROMPT=0 git pull -q --ff-only >/dev/null 2>&1
exit 0
