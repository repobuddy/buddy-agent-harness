# Correction classes

One row per fault `doctor` reports here, with the correction and where it stops.

**This file carries no detection.** `doctor` decides what is wrong; you decide how to correct it. If you find yourself checking whether a fault is present, you are doing the command's job — run it instead.

Every correction below is non-material: it would stop being true if this tool's output were removed. That is what makes it correctable at all. Where a finding's correction would change what the repository *means*, report it and stop; `agents-md.md` draws the line.

## `deprecated-harness`

**Correct.** The replacement harness reads `.agents/skills/` natively and needs no projection at all, so the correction is to **delete** the reported projection — not to rename it, and not to create a new one under the new name. This is the one correction that removes a path rather than editing a file, so show what will be deleted and what will remain.

**Stops at.** Everything under that harness's directory that is not the skills projection. `.windsurfrules` and any settings file are instruction artifacts; consolidating them is `init`'s. A harness name in a workflow, a README, or a comment is prose, not configuration — leave it.

## `ignored-bridge`

**Correct.** Narrow or remove the reported `.gitignore` rule so the bridge is tracked. Where the rule exists for something else under that directory, the correction is a negation (`!.claude/skills`) rather than a deletion — that keeps the rest of the rule doing its job.

**Stops at.** Every rule that does not match a bridge path. `.gitignore` is a project file, and only the part swallowing a bridge is this tool's business.

## `unread-local-override`

**More than one correction is valid, so this fault always presents options and never picks.** The options come from this file, not from the report: `doctor` names one repair per finding, and choosing among these is a judgment about content it has not read.

Read the file to describe the options, then offer all three:

- move it to `CLAUDE.local.md` and add that to `.gitignore`, where the content is personal and Claude Code is the reader that matters — say that a `CLAUDE.local.md` is read *instead of* `AGENTS.md` unless it opens with an `@AGENTS.md` import, and write the import;
- hand it to `init` to consolidate into `AGENTS.md`, where the content is project guidance — that move is material, and `init`'s;
- delete it, where it is dead.

**Stops at.** The content. Read it to describe the options; never rewrite it.

## `unloadable-skill`

Two faults arrive under this name, and only one of them is correctable.

**An unquoted colon in `description`.** Correctable: quote the value. The YAML then parses and the skill loads.

**A missing or empty `description`.** **Not correctable — report it and ask.** Writing one would mean inventing a claim about what a skill you did not author does, and that claim is material: it stays true whether or not this tool ever ran. Name the skill, say why it will not load, and stop.

**Stops at.** Everything below the frontmatter. The skill body is the author's. A `name` that mismatches its directory is not reported by `doctor` at all — it is a warning and the skill still loads.

## `diverged-bridge`, `diverged-canonical`, `diverged-both`, and `diverged-unknown`

A skills copy at a bridge path that no longer holds what `.agents/skills` holds. The suffix is the side that changed since the copy and `.agents/skills` last agreed: the copy, the canonical directory, both, or unknown where no last agreement can be found. All four take the same correction: **sync** the copy with `.agents/skills`, file by file. Never rebuild the copy from `.agents/skills` and never delete it: either discards the side holding the newer edit.

**Offer.** Show each file that differs, as it stands on each side (`git diff --no-index .agents/skills <copy>`), and the side the sync takes for it. A file only one side changed takes that side's version, so an edit made through the copy lands in `.agents/skills`. A file both sides changed, and every differing file under `diverged-unknown`, takes no side until the owner picks one.

**Apply.** On approval, run `node scripts/sync.mjs` at the repository root, resolving that path against this skill's own directory as for `scripts/doctor.mjs`, or the `npx` fallback `SKILL.md` gives with `sync` in place of `doctor`. It writes every file one side changed, keeps the copy out of commits, and lists in `left` each file it would not decide. Put each of those to the owner on its own: show that file's difference between the two sides and ask which side wins. Then run the same invocation again with the answers, naming each answered file once by its `path` in `left`, which runs through the bridge: `node scripts/sync.mjs --resolve .claude/skills/<file>=<canonical|copy>,.claude/skills/<file>=<canonical|copy>`. Write nothing for a file without an answer; it stays as it is on both sides, and the finding is still open.

**Stops at.** Every file the owner gave no side for, and everything outside the copy and `.agents/skills`.

## `unpinned-copy`

A tracked skills copy that holds what `.agents/skills` holds but lacks copy protection, so `git status` shows its changes and a commit can carry them. Copy protection has two parts, and a copy with one is not protected: skip-worktree on the copy's tracked entries in the git index, and the bridge path in the clone's own `.git/info/exclude`.

**Offer.** Name the copy's tracked paths (`git ls-files <copy>`) and its bridge path, and say the correction changes no file's content and no committed file.

**Apply.** On approval, put both parts in place for exactly that copy:

```sh
git ls-files -z <copy> | xargs -0 git update-index --skip-worktree
```

and add the bridge path, as `/<copy>/`, as one line at the end of the clone's own exclude file, creating it if missing, where no line there already covers it. `git rev-parse --git-path info/exclude` names that file: `.git/info/exclude` in a plain clone, and the file the clone shares in a linked worktree. Never write it into the committed `.gitignore`.

**Stops at.** Every other copy, every file's content, and `.gitignore`.

## `mcp-unprojected` and `mcp-diverged-golden`

These are the two MCP findings where the golden set is plainly ahead: a harness is missing a server the golden set declares, or only the golden side changed a field. The correction is to project the golden set, and `mcp project` works out the change. Do not write it yourself.

**Plan.** Run `node scripts/mcp.mjs project`. Where `scripts/doctor.mjs` would fall back to `npx`, use the same `npx` invocation `SKILL.md` gives, with `mcp project` in place of `doctor`. It is a dry run and writes nothing.

- `actions` has one row per server per target.
- `entries` has each changed server as it would read in its target.

Show each target file as it stands beside its `entries`. That pair is the before and after.

**Report without offering a write** for these rows:

- **`refuse`**: the target cannot hold the server as the golden set spells it. Report the server, the target, and the reason the `detail` gives, for example Codex has no SSE, or Gemini CLI would not expand that reference, and offer no write of that server to that target. The correction is in the golden set, and it is the user's.
- **`skip`**: the harness side changed too. That is reconcile, and it is a person's.

**Apply.** On approval, run the same command with `--write`. It writes every `add` and `update`, and it records what it projected.

**Apply `edit` rows by hand.** For each approved `edit` row, write that entry into the file yourself, replacing the server's current entry and nothing else. These are an in-place change to an entry holding a comment, or to a Codex server not written as a `[mcp_servers.<name>]` table, and the command will not make those. Every other byte of the file, every comment outside the entry included, stays byte-identical.

**Re-run `doctor`** as always. A server the command refused stays `mcp-unprojected`, and that is the correct outcome: report it still open, with the refusal's reason.

**Stops at.** Everything the command did not list:

- A server only a harness carries, or a field the harness changed. Those are the next section's.
- A field both sides changed, or one no baseline can place (`mcp-diverged-both`, `-unknown`).
- The golden set itself.

## `mcp-diverged-target` and `mcp-undeclared`

These are the two MCP findings where the harness side is plainly ahead: only the harness copy changed a field, or a harness carries a server the golden set does not declare. The correction is to import the change into the golden set, **one field at a time**, and `mcp reconcile` works out each field. Do not edit the golden set yourself.

**Plan.** Run `node scripts/mcp.mjs reconcile`, or the `npx` fallback with `mcp reconcile`. It is a dry run and writes nothing. `fields` has one row per field, each with a `path`, an `action`, a `detail`, and for an `import` row the `value` as it would read in the golden set.

**Offer each `import` row on its own.** Show the golden server's table as it stands beside the row's `value`. Ask about each field separately. **Never offer to import every field at once**, and never approve one on the user's behalf. For a server the golden set does not declare yet, approving its `command` or its `url` is required, or there is nothing to run.

**Report without offering a write** for these rows:

- **`refuse`**: a literal credential. The server's other fields are still offered. Tell the user to move the value into an environment variable and reference it as `${VAR}` in the harness file; never read the value out or repeat it, or any part of it — name the server and the field instead.
- **`skip`**: both sides changed, no baseline can say which side moved, or the value is the harness's own default. The first two are a person's to settle by hand. For a default, say the golden set can state it by hand if it was meant.

**Apply.** Run the same command once, with `--accept <path>` for each approved row and nothing else. The command writes those fields into the golden set in place, keeping every comment, and records the agreement. If it fails naming a path, nothing was written: report the reason.

**Apply `edit` rows by hand.** The golden set writes that field in a shape the command will not take apart, such as a sub-table. Write the row's `value` into the server's table yourself, replacing that field and nothing else; every other byte of the file, comments included, stays byte-identical.

**Re-run `doctor`** as always. A field or server that now agrees produces no finding. The other harnesses still carry the old value, so each reports `mcp-diverged-golden` or `mcp-unprojected`: offer the previous section's correction for them.

**Stops at.** Everything the command did not list: `-both`, `-unknown`, a server removed from a harness, and the harness files themselves.

## Not yours: every `problem` with no section above

`doctor` reports far more than this file covers: skills bridges that no longer resolve, instruction bridges that were never completed, global instructions, and MCP drift neither side is plainly ahead on. None of them has a section here, and that is what says they are not yours.

**Who to hand one to is read off the repair `doctor` gave it, and the question is whether it names `init`.** It names it one of two ways — the `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`) skill, or a `buddy-agent-harness init` command line — and both mean the finding is `init`'s, which is what writes a bridge and what consolidates an instruction file in the first place. Hand it to the skill; never run the command. A repair naming `init` in **neither** form gets the outcome **needs your decision**: `doctor` states it in full, and passing it on is the whole of what you do with it. Every MCP finding without a section above is that case. A `global-instructions-*` finding is not: its step is settled and lies in the user's home directory, so its outcome is **for you to do outside the repo**.

Never infer an owner for a finding that names none. The wrong guess is always `init`, and rebuilding over a divergence is precisely what discards whichever side holds the newer edit.
