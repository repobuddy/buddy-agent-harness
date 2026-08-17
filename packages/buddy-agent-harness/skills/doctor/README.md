# Harness Doctor

Report whether the harness skill bridges in a repository still resolve into `.agents/skills`.

## What it does

`init` points every harness that cannot read `.agents/skills` at that directory, normally with a directory-level symlink. `doctor` re-checks each of those bridges after the fact and names the exact command that repairs whatever it finds.

```sh
npx -y buddy-agent-harness doctor
```

## Why it exists

The failure it is built for is silent. Creating a symlink on Windows needs a privilege most accounts do not have, and Git for Windows gates it separately with `core.symlinks`, which its installer leaves off. With `core.symlinks=false` git does not error — it writes the committed symlink out as a regular file whose contents are the target path. The harness looks for a directory, finds a file, and loads zero project skills with no warning anywhere.

`core.symlinks` is per-clone and cannot be enforced from the repository, so detection is the only reliable lever. It is also cheap: the path exists but is not a directory.

## Read-only by design

There is no `--fix`. Every repair is already expressible with `init` flags, and reimplementing them here would drift. On the Windows case it would likely drift wrongly: the naive repair is to recreate the link, which is exactly the operation that failed on that machine. `--copy` is the branch that works there, and `init` already has it.

Staying read-only also means the command is safe to wire into a session-start hook without reasoning about whether the hook passes a mutating flag.

The exit code is `0` even when findings exist. The diagnosis succeeded; a non-zero code reads to an agent as "this command is broken, try something else."

## Divergence

A copy is a snapshot rather than a live projection, so writes flow the wrong way through it: an agent asked to update a skill edits `.claude/skills/<name>/SKILL.md` and the change lands in the copy instead of in `.agents/skills`. When the two sides differ, `doctor` names which one moved — using the last commit where they agreed as the base — because "these two differ" is not actionable on its own. When both moved it says so and refuses to guess, since rebuilding would discard one of the edits.

## Generated from the command

`SKILL.md` is generated from `src/diagnose-bridges/doctor-guidance.ts`, the same table the command prints its findings and repairs from, so the skill cannot drift from the CLI. `pnpm skill:doctor` rewrites it and `pnpm skill:doctor:check` — part of `pnpm verify` — fails when the committed copy is stale.
