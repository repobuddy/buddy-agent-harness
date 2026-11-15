---
"buddy-agent-harness": minor
---

- An `unloadable-skill` finding from `doctor` now says why the skill will not load: its `cause` is `unparsable-frontmatter` or `missing-description`, and each cause has its own detail and repair. A skill file with no frontmatter block at all now counts as `missing-description`. When the description is missing, the repair says the skill's author has to write it.
- `doctor` now gives every installed harness a `globalInstructions` row. Cursor, and Devin Desktop when you name it with `--harness`, get the status `cannot-load-file`, because they keep user rules outside a file. When `~/.agents/AGENTS.md` exists, each also gets a `global-instructions-no-file` finding whose step is to paste that file's text into the harness's user rules.
- The `doctor` report has a new `harnessInUse` field, the harness the run was started from as its environment shows it, or `unknown`. `diagnoseBridges` returns the same field. It is `unknown` when no `env` is passed.
- The repairs for the agent-worktree findings (`worktrees-untracked`, `worktrees-scanned`, `worktree-base-unset`) now name only the `init-buddy-agent-harness` skill, not `enhance`.
- A crash the CLI framework does not handle while it reads the arguments now prints a coded error on stdout, in the format you asked for, with the code `command-failed`, a reason, and a next step. It writes nothing to stderr and exits with 1. It used to print a plain message on stderr and exit with 2.
