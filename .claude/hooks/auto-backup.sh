#!/usr/bin/env bash
# Automatic backup after every Claude turn (requested by the site owner):
# 1. If anything changed, save a snapshot (git commit) in this folder's history.
# 2. Upload snapshots to the owner's private GitHub repo (origin). A failed upload
#    (e.g. no internet) never blocks work; it is retried after the next turn.
# Secrets (.env) and node_modules are excluded by .gitignore.

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

if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1 && [ -n "$(git log '@{u}..HEAD' --oneline 2>/dev/null)" ]; then
  GIT_TERMINAL_PROMPT=0 git push -q --follow-tags >/dev/null 2>&1
fi
exit 0
