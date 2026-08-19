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

The default output is TOON, which is what you parse. Each entry in `findings` carries three fields: `problem` (the finding's name), `path` (what it is about), and `detail` (what is wrong, in prose). The repairs are not on the row — they are lifted into `help`, which follows `findings` in order and collapses two entries only where the repair is word-for-word identical. Read a finding's repair off the matching position and confirm it by the `path` it names; where two findings sit at one path, what each repair says to do is what tells them apart.

**Route on `problem`, never on `detail`.** The prose exists to be read by a person, and rewording it must not change what you do.

If `findings` reports zero problems, say so and stop. There is nothing to repair.

## 2. Sort what it found

**Route on `problem`.** `references/classes.md` carries one section per fault this skill corrects, keyed by the `problem` name. A `problem` with a section there is yours; a `problem` without one is not. Nothing else decides it.

That rule holds for every finding `doctor` reports today and for the ones it reports next year. A fault this skill has no correction for is not one it can repair, so what `classes.md` covers and what this skill owns are the same fact — and a finding added tomorrow gets reported rather than improvised on.

**Do not read ownership off a skill name in `help`.** Most repairs name no skill — some are a shell invocation, some a `git` command, some a reconciliation by hand — and only the instruction and configuration families name one at all. An owner is not something the report can always be asked for.

- **Findings that are yours.** Look the `problem` up in `references/classes.md`, which carries the correction and the stopping point for each.
- **Findings that are not yours.** Report each one and pass on the repair `doctor` states for it, unchanged. **Who to hand it to is read off that repair, and the question is whether it names `init`.** Some name the `/buddy-agent-harness:init` skill and some name a `buddy-agent-harness init` command line; both mean the same thing — the finding is `init`'s, because `init` writes both kinds of bridge in the first place, and it writes the `CLAUDE.md` stub *without* asking, where everything here needs approval, and one write cannot have two homes and two contradictory approval rules. Hand it to the **skill** and never run the command yourself: rebuilding a projection can relocate skills a user wrote, and on the Windows case the naive repair is to recreate the link, the operation that already failed on that machine. A repair naming `init` in **neither** form — a `git` invocation, a reconciliation by hand, every MCP finding — is work for a person; say that rather than inferring an owner, and never rebuild over a two-sided divergence, which discards whichever side holds the newer edit.

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
