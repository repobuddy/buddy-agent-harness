---
name: repair
description: Use this skill when a repository's agent configuration is present but wrong or outdated — a retired harness name, a git-ignored bridge, an AGENTS.local.md nothing reads, or a skill a harness refuses to load. Runs doctor to find them, then offers each correction with its before and after and writes only what is approved.
---

# Harness Repair

`init` consolidates what a repository has. `enhance` proposes what it does not. `doctor` reports what is wrong. `repair` corrects it.

Each of the other three refuses this work deliberately. `init` has to run anywhere and invent nothing, so it never clobbers a file the user wrote. `enhance` only offers what is **missing**. `doctor` never writes, which is what makes it safe in a session-start hook. Configuration that is present but wrong falls between them.

**`doctor` detects; this skill repairs.** Detection has one home, so the two cannot drift and the finding set can grow without touching this file. Do not detect anything yourself — run the command and repair what it reports.

## 1. Diagnose

```sh
node scripts/doctor.mjs
```

That path is relative to this skill's own directory. The launcher runs the CLI that shipped beside it against the current working directory, so nothing is downloaded. Fall back to `npx -y buddy-agent-harness@^0.5.0 doctor` when the launcher cannot be resolved or run.

The default output is TOON, which is what you parse. Each entry in `findings` carries three fields: `problem` (the finding's name), `path` (what it is about), and `detail` (what is wrong, in prose). `help` carries the repairs.

**Route on `problem`, never on `detail`.** The prose exists to be read by a person, and rewording it must not change what you do.

If `findings` reports zero problems, say so and stop. There is nothing to repair.

## 2. Sort what it found

**`doctor` tells you who repairs each finding — read that, do not classify them yourself.** Every finding's repair in `help` names a skill. A repair naming `/buddy-agent-harness:init` is not yours; a repair naming `/buddy-agent-harness:repair` is. Routing this way means a finding added to `doctor` tomorrow reaches the right skill without this file being edited, and a hand-kept list here could only drift from the one the command already maintains.

- **Findings `init` repairs** — the skills bridges and the instruction bridges alike. Report them and hand them on, exactly as `doctor` says. Rebuilding a skills projection can relocate skills a user wrote, and on the Windows case the naive repair is to recreate the link, the operation that already failed on that machine. An unfinished instruction bridge is `init`'s for a different reason: it writes the `CLAUDE.md` stub *without* asking, where everything here needs approval, and one write cannot have two homes and two contradictory approval rules.
- **Findings `repair` repairs.** These are yours. Look the finding's `problem` up in `references/classes.md`, which carries the correction and the stopping point for each. A `problem` with no entry there is one you have no correction for — report it and say so rather than improvising.

## 3. Draw the line at material content

You correct what the **tooling** decides is wrong, never what the repository means.

`../init/references/agents-md.md` draws the line: content that would stop being true if this tool's output were removed is **non-material**, and non-material content is all you may correct. A statement about how the repository is worked in is the user's, even when it is out of date — report it and offer no write.

The clearest case is `unloadable-skill`. A `description` broken by an unquoted colon is a quoting fault — correct it. A `description` that is **missing** cannot be written without asserting what a skill you did not author does, and that claim holds whether or not this tool ever ran. Report it and ask.

## 4. Offer

Show the file **as it stands and as it would read**. Not a summary — the actual before and after, so the user is reading the change rather than your description of it.

Where more than one correction is valid, present the options and ask which. Never pick for the user. `unread-local-override` is always this case, and its options come from `references/classes.md` — `doctor` names one repair per finding and has not read the file's contents.

Do not argue past one sentence. The diff is the argument.

## 5. Apply and re-run

Write only what was approved, preserving the rest of the file exactly.

Then **run `doctor` again**. A correction can fail to hold — a second `.gitignore` rule matching the same path, a frontmatter fix that leaves another fault behind. Re-running is how you know, and it costs nothing. When a finding survives, say it is still open rather than reporting it landed.

## 6. Report

Report every run, whichever way it went. One row per finding, naming its **path**, what was wrong, and its **outcome** — corrected, declined, handed to `init`, reported as material, or still open.

A run that finds nothing still reports. "Nothing found" without saying `doctor` ran clean is indistinguishable from not having looked.

## Rules

- **Never write without approval.** There is no flag that skips it and none should be added.
- **Never detect.** `doctor` owns detection. A check written here is a second home for it, and two homes drift.
- **Never rebuild a bridge.** That is `doctor`'s diagnosis and `init`'s repair.
- **Never consolidate.** Moving content into `AGENTS.md` is `init`'s and has one home.
- **Correct only non-material content.** Project policy is the user's, even when it is wrong.
- Local agent configuration only. Do not change workflows, GitHub Actions, repository settings, security scanning, branch rules, or unrelated project files — a retired harness name in a workflow file is not yours to rename.
