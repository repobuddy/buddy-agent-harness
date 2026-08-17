---
'buddy-agent-harness': minor
---

Add a read-only `doctor` command and a generated `doctor` skill.

`doctor` reports whether the skill bridges `init` creates still resolve into `.agents/skills`, deriving the bridge list from the same harness registry `init` projects into. It detects the silent Windows failure — a checkout with `core.symlinks=false` materializes a committed symlink as a regular file holding the target path, and the harness loads zero project skills with no warning — along with missing bridges, symlinks pointing elsewhere, and copies that have drifted from the canonical directory.

A diverged copy is reported with a direction, computed against the last commit where the two sides agreed, so the report says which side moved rather than only that they differ. A tracked copy is also checked for its `skip-worktree` bit, which some checkout and merge operations clear.

The command writes nothing and exits `0` even with findings; each finding names the exact `init` command that repairs it. `skills/doctor/SKILL.md` is generated from the same guidance the command prints, with `pnpm skill:doctor:check` in `verify` failing when the committed skill goes stale.
