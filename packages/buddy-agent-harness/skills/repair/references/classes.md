# Correction classes

One row per fault `doctor` reports here, with the correction and where it stops.

**This file carries no detection.** `doctor` decides what is wrong; you decide how to correct it. If you find yourself checking whether a fault is present, you are doing the command's job — run it instead.

Every correction below is non-material: it would stop being true if this tool's output were removed. That is what makes it correctable at all. Where a finding's correction would change what the repository *means*, report it and stop; `../../init/references/agents-md.md` draws the line.

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

## `mcp-unprojected` and `mcp-diverged-golden`

These are the two MCP findings where the golden set is plainly ahead: a harness is missing a server the golden set declares, or only the golden side changed a field. The correction is to project the golden set, and `mcp project` works out the change. Do not write it yourself.

**Plan.** Run `node scripts/mcp.mjs project`. Where `scripts/doctor.mjs` would fall back to `npx`, use the same `npx` invocation `SKILL.md` gives, with `mcp project` in place of `doctor`. It is a dry run and writes nothing.

- `actions` has one row per server per target.
- `entries` has each changed server as it would read in its target.

Show each target file as it stands beside its `entries`. That pair is the before and after.

**Report without offering a write** for these rows:

- **`refuse`**: the target cannot hold the server as the golden set spells it. The `detail` names the field and the reason, for example Codex has no SSE, or Gemini CLI would not expand that reference. The correction is in the golden set, and it is the user's.
- **`skip`**: the harness side changed too. That is reconcile, and it is a person's.

**Apply.** On approval, run the same command with `--write`. It writes every `add` and `update`, and it records what it projected.

**Apply `edit` rows by hand.** For each `edit` row, write that entry into the file yourself, replacing the server's current entry and nothing else. These are an in-place change to a shared file, or to an entry holding a comment, and the command will not make those. Keep every comment outside the entry.

**Re-run `doctor`** as always. A server the command refused stays `mcp-unprojected`, and that is the correct outcome: report it still open, with the refusal's reason.

**Stops at.** Everything the command did not list:

- A server only a harness carries (`mcp-undeclared`).
- A field the harness changed (`mcp-diverged-target`, `-both`, `-unknown`).
- The golden set itself.

Pulling a change back into the golden set is not this correction.

## Not yours: every `problem` with no section above

`doctor` reports far more than this file covers: skills bridges that no longer resolve, instruction bridges that were never completed, and MCP drift the golden set is not plainly ahead on. None of them has a section here, and that is what says they are not yours.

**Who to hand one to is read off the repair `doctor` gave it, and the question is whether it names `init`.** It names it one of two ways — the `/buddy-agent-harness:init-buddy-agent-harness` skill, or a `buddy-agent-harness init` command line — and both mean the finding is `init`'s, which is what writes a bridge and what consolidates an instruction file in the first place. Hand it to the skill; never run the command. A repair naming `init` in **neither** form is work for a person: `doctor` states it in full, and passing it on is the whole of what you do with it. Every MCP finding without a section above is that second case, as is every bridge finding a rebuild would not fix.

Never infer an owner for a finding that names none. The wrong guess is always `init`, and on a two-sided divergence rebuilding is precisely what discards whichever side holds the newer edit.
