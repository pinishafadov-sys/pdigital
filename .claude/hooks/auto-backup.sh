#!/usr/bin/env bash
# Local automatic backup after every Claude turn: if anything changed in the
# project, save a snapshot (git commit) in this folder's history on this computer.
# Nothing is uploaded anywhere. Secrets (.env) and node_modules are excluded by .gitignore.

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# Don't interfere with an in-progress merge/rebase.
gitdir="$(git rev-parse --git-dir)"
if [ -d "$gitdir/rebase-merge" ] || [ -d "$gitdir/rebase-apply" ] || [ -f "$gitdir/MERGE_HEAD" ]; then
  exit 0
fi

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -q -m "גיבוי אוטומטי $(date '+%Y-%m-%d %H:%M')" >/dev/null 2>&1
fi
exit 0
