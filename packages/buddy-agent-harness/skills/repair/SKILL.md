---
name: repair
description: Repairs a repository's agent configuration when it is present but wrong or outdated — a retired harness name, a git-ignored bridge, an AGENTS.local.md nothing reads, a skill a harness refuses to load, a skills copy that drifted from .agents/skills or lost its copy protection, or an MCP server that differs between the golden set and a harness, on the side that is plainly ahead. Also for "sync the .claude/skills copy that drifted from .agents/skills". Runs doctor to find them, then offers each correction with its before and after and writes only what is approved.
---

# Harness Repair

`init` consolidates what a repository has. `enhance` proposes what it does not. `doctor` reports what is wrong. `repair` corrects it.

Each of the other three refuses this work deliberately. `init` has to run anywhere and invent nothing, so it never clobbers a file the user wrote. `enhance` only offers what is **missing**. `doctor` never writes, which is what makes it safe in a session-start hook. Configuration that is present but wrong falls between them.

**`doctor` detects; this skill repairs.** Detection has one home, so the two cannot drift and the finding set can grow without touching this file. Do not detect anything yourself — run the command and repair what it reports.

## 1. Diagnose

```sh
node scripts/doctor.mjs
```

That path is relative to this skill's own directory: `scripts/doctor.mjs` is a self-contained bundle shipped inside this skill folder through the npm package, so it runs against the current working directory with nothing downloaded and no `node_modules` needed. Fall back to `npx -y buddy-agent-harness@1.3.0 doctor` when `scripts/doctor.mjs` is missing or cannot be run — the case for a skill installed from git rather than from the npm package, which does not carry the bundle.

The default output is TOON, which is what you parse. Each entry in `findings` carries three fields: `problem` (the finding's name), `path` (what it is about), and `detail` (what is wrong, in prose). The repairs are not on the row — they are lifted into `help`, which follows `findings` in order and collapses two entries only where the repair is word-for-word identical. Read a finding's repair off the matching position and confirm it by the `path` it names; where two findings sit at one path, what each repair says to do is what tells them apart.

**Route on `problem`, never on `detail`.** The prose exists to be read by a person, and rewording it must not change what you do.

If `findings` reports zero problems, say so and stop. There is nothing to repair.

## 2. Sort what it found

**Route on `problem`.** `references/classes.md` carries one section per fault this skill corrects, keyed by the `problem` name. A `problem` with a section there is yours; a `problem` without one is not. Nothing else decides it.

That rule holds for every finding `doctor` reports today and for the ones it reports next year. A fault this skill has no correction for is not one it can repair, so what `classes.md` covers and what this skill owns are the same fact — and a finding added tomorrow gets reported rather than improvised on.

**Do not read ownership off a skill name in `help`.** Many repairs name no skill — some are a shell invocation, some a `git` command, some a reconciliation by hand — and only the instruction, configuration, non-standard, and agent-worktree families, the drifted and unprotected skills copies, and four MCP problems, name one at all. An owner is not something the report can always be asked for.

- **Findings that are yours.** Look the `problem` up in `references/classes.md`, which carries the correction and the stopping point for each.
- **Findings that are not yours.** Report each one and pass on the repair `doctor` states for it, unchanged. **Who to hand it to is read off that repair, and the question is whether it names `init`.** Some name the `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`) skill and some name a `buddy-agent-harness init` command line; both mean the same thing — the finding is `init`'s, because `init` is what writes a bridge and what consolidates an instruction file in the first place, and deciding what to preserve while it does is judgment this skill's corrections never carry. Hand it to the **skill** and never run the command yourself: rebuilding a projection can relocate skills a user wrote, and on the Windows case the naive repair is to recreate the link, the operation that already failed on that machine. A repair naming `init` in **neither** form — a `git` invocation, a reconciliation by hand, an MCP finding with no section in `classes.md` — **needs your decision**: no skill owns it, and someone must judge it. Give it that outcome rather than inferring an owner.
- **A step in the user's home directory.** A `global-instructions-missing`, `global-instructions-unbridged`, `global-instructions-overridden`, or `global-instructions-emptied` finding is about a harness's user-scope file not loading `~/.agents/AGENTS.md`. Its repair is the exact line or symlink to add there, or the empty variable to unset, and it is the user's to make: give it the outcome **for you to do outside the repo**, with the step word for word, and write nothing outside the repository yourself, approved or not. It is not a "needs your decision" finding: the step is settled, only its place is out of reach.

## 3. Draw the line at material content

You correct what the **tooling** decides is wrong, never what the repository means.

`references/agents-md.md` draws the line: content that would stop being true if this tool's output were removed is **non-material**, and non-material content is all you may correct. A statement about how the repository is worked in is the user's, even when it is out of date — report it and offer no write.

The clearest case is `unloadable-skill`. A `description` broken by an unquoted colon is a quoting fault — correct it. A `description` that is **missing** cannot be written without asserting what a skill you did not author does, and that claim holds whether or not this tool ever ran. Report it and ask.

## 4. Offer

Show the file **as it stands and as it would read**. Not a summary — the actual before and after, so the user is reading the change rather than your description of it.

Where more than one correction is valid, present the options and ask which. Never pick for the user. `unread-local-override` is always this case, and its options come from `references/classes.md` — `doctor` names one repair per finding and has not read the file's contents.

Do not argue past one sentence. The diff is the argument.

**Never read out a literal MCP credential.** No offer, report, or other output repeats a credential's value or any part of it — not in a before-and-after, not in a row's `detail`, not to say what moved. Name the server and the field instead. Where projection refuses a golden server for a target, report the server, the target, and the reason the command gave, and offer no write of that server there.

## 5. Apply and re-run

Write only what was approved, preserving the rest of the file exactly. A hand edit the MCP commands returned as an `edit` row changes that one entry; every other byte of the file, comments included, stays as it was.

Then **run `doctor` again**. A correction can fail to hold — a second `.gitignore` rule matching the same path, a frontmatter fix that leaves another fault behind. Re-running is how you know, and it costs nothing. When a finding survives, say it is still open rather than reporting it landed.

## 6. Report

Report every run, whichever way it went. One row per finding `doctor` reported, naming its **path**, what was wrong, and its **outcome**, one of these and told apart from the others:

- **corrected** — the re-run no longer reports it;
- **declined** — the owner said no, and its files are unchanged;
- **still open** — the correction was written and the re-run still reports it;
- **reported as material** — correcting it would assert what the repository means;
- **handed to `init-buddy-agent-harness`** — its repair names `init`;
- **needs your decision** — no skill owns it, and someone must judge it;
- **for you to do outside the repo** — a step in the user's home directory, given word for word.

A run that finds nothing still reports. "Nothing found" without saying `doctor` ran clean is indistinguishable from not having looked.

## Done when

- **C1.** `doctor` ran first, and every finding acted on came from its output; a clean run changed no file and said `doctor` found nothing.
- **C2.** No file changed for a correction the owner did not approve, and each approved one changed only what its offer showed.
- **C3.** Each drifted skills copy file both sides changed holds the side the owner picked, or is unchanged where they gave no answer.
- **C4.** No output repeated a literal MCP credential, or any part of one.
- **C5.** `doctor` ran again after the writes, and each finding it still reports is called still open.
- **C6.** The report has one row per finding with its path, what was wrong, and its outcome, with needs your decision and for you to do outside the repo told apart.

## Rules

- **Never write without approval.** There is no flag that skips it and none should be added.
- **Never detect.** `doctor` owns detection. A check written here is a second home for it, and two homes drift.
- **Never rebuild a bridge.** That is `doctor`'s diagnosis and `init`'s repair. Syncing a drifted skills copy and restoring a copy's protection rebuild nothing, and are yours.
- **Never repeat a literal MCP credential**, in any output.
- **Never consolidate.** Moving content into `AGENTS.md` is `init`'s and has one home.
- **Never write outside the repository.** A user-scope file is the user's to change; hand over the step `doctor` names.
- **Correct only non-material content.** Project policy is the user's, even when it is wrong.
- Local agent configuration only. Do not change workflows, GitHub Actions, repository settings, security scanning, branch rules, or unrelated project files — a retired harness name in a workflow file is not yours to rename.
