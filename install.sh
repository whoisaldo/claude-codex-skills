#!/usr/bin/env bash
# Symlink every skill in this repo into a skills directory.
#
#   ./install.sh                          -> ~/.claude/skills
#   SKILLS_DIR=/path/to/skills ./install.sh
#
# Idempotent; re-run after adding a skill. Edits and `git pull` are live
# through the symlinks. A real directory already at a target path is moved
# to <skills dir>.backup/ first, never deleted.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="${SKILLS_DIR:-$HOME/.claude/skills}"
BACKUP="${SKILLS_DIR%/}.backup"

mkdir -p "$SKILLS_DIR"
n=0
for s in "$REPO"/*/; do
  s="${s%/}"; [ -f "$s/SKILL.md" ] || continue
  dest="$SKILLS_DIR/$(basename "$s")"
  if [ -L "$dest" ]; then
    [ "$(readlink "$dest")" = "$s" ] || { rm "$dest"; ln -s "$s" "$dest"; }
  elif [ -e "$dest" ]; then
    mkdir -p "$BACKUP"; mv "$dest" "$BACKUP/$(basename "$dest").$(date +%s)"
    ln -s "$s" "$dest"
  else
    ln -s "$s" "$dest"
  fi
  printf '  %-22s -> %s\n' "$(basename "$s")" "${dest/#$HOME/~}"
  n=$((n+1))
done
# Drop links that point into this repo but whose skill no longer exists.
for l in "$SKILLS_DIR"/*; do
  [ -L "$l" ] || continue
  case "$(readlink "$l")" in "$REPO"/*) [ -e "$l" ] || rm "$l" ;; esac
done
echo "Linked $n skills into ${SKILLS_DIR/#$HOME/~}. Restart your agent to pick them up."
