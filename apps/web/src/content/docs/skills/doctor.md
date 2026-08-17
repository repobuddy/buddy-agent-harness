---
title: 'Skill: doctor'
description: What the doctor skill checks, how an agent reads the report, and the repairs it refuses to automate.
---

The `doctor` skill checks whether the skill bridges in a repository still resolve into `.agents/skills`. A bridge that has stopped resolving is silent: the harness finds nothing and loads zero project skills, with no warning anywhere. Reach for this skill when that has happened, or before you conclude a skill is broken.

It is read-only from end to end. The skill runs one command, reads the report, and runs the repair the report names.

## Run it

In Claude Code:

```text
/buddy-agent-harness:doctor
```

The skill also loads on its own when an agent hits the symptom, so "my skills are missing after cloning this repo" is enough to reach it.

Its one action is to run `buddy-agent-harness doctor` and act on the report. If you would rather run that yourself, the plugin is not a prerequisite: see the [CLI reference](/cli/doctor/#no-install-needed).

## What it checks

Every bridge [`init`](/skills/init/) would create for this repository, derived from the same registry, so the two cannot describe different bridge sets.

For each one the report gives a `kind` (what is on disk now) and a `status` (whether it works). A `findings` entry explains each problem and a `help` entry names the exact command that repairs it. Run the command from `help`, then run `doctor` again.

A healthy repository says so outright instead of printing an empty section, so an agent does not re-run with other flags to check whether "nothing" meant "nothing wrong".

The report is TOON by default, which is what the agent parses. Ask for `--format text` when you want to read it over its shoulder.

Statuses, findings, and their repairs are tabulated in the [CLI reference](/cli/doctor/). The skill body carries the same table, generated from the source the command prints from, so the guidance an agent follows cannot drift from what the command reports.

## The failure it was built for

A committed symlink such as `.claude/skills` → `../.agents/skills` degrades on a native Windows checkout, and it degrades quietly. Git for Windows gates symlink creation with `core.symlinks`, which its installer leaves off. With that setting off git does not error: it writes the symlink out as a regular file whose contents are the target path.

That is the `degraded` status, and the repair is `init --copy --force` rather than recreating the link, because creating a link is the operation that already failed on that machine. See [Harness Differences](/agent-configuration/harness-differences/) for which harnesses need a bridge at all.

## What it will not do

There is no `--fix`, and the skill does not invent one. Three rules hold whatever you ask for mid-run:

- Never repair a `diverged-both` or `diverged-unknown` bridge by re-running `init`. Both sides moved, so rebuilding discards one of the edits. Reconcile the two directories first.
- Edit skills at `.agents/skills/<name>/SKILL.md`. Editing through a bridge is only safe when that bridge is a symlink, because a copy takes the write and keeps it.
- Never add a bridge to `.gitignore`. An untracked bridge swallows a real edit silently.

Because it writes nothing and always exits `0`, the command is safe to wire into a session-start hook. Why the exit code stays `0`, and why divergence gets a direction rather than a diff, are covered in the [CLI reference](/cli/doctor/).
