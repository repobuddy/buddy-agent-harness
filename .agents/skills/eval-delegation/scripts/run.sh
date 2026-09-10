#!/usr/bin/env bash
# Run N isolated runs of one prompt file.
#
#   run.sh <prompt.md> <n> <outdir>
#
# Every run is a fresh `claude -p` with HOME pointed at a sandbox that holds credentials and
# nothing else, and a cwd that is an empty directory. This is what keeps the user's own
# ~/.claude/CLAUDE.md and any project CLAUDE.md out of the runner's context.
#
# Spawning runners as subagents does NOT do this: subagents inherit every CLAUDE.md level, so a
# machine whose global CLAUDE.md already carries a Delegation section puts that section in all
# arms at once and every score picks up a floor it did not earn. Measured 2026-09-10; see the
# contamination note in ../references/method.md.
set -euo pipefail

prompt="$1"; n="$2"; out="$3"
mkdir -p "$out"

sandbox="$out/.home"
mkdir -p "$sandbox/.claude" "$out/.cwd"
cp "$HOME/.claude/.credentials.json" "$sandbox/.claude/" 2>/dev/null || true
if [ -e "$sandbox/.claude/CLAUDE.md" ]; then
	echo "run.sh: sandbox HOME is not clean, refusing" >&2; exit 1
fi

for i in $(seq 1 "$n"); do
	(
		cd "$out/.cwd"
		HOME="$sandbox" timeout 180 claude -p "$(cat "$prompt")" \
			--disallowed-tools Read Bash Glob Grep Edit Write \
			> "$out/run-$i.txt" 2>&1 || echo "RUN FAILED" >> "$out/run-$i.txt"
	) &
done
wait
echo "run.sh: $n runs -> $out"
