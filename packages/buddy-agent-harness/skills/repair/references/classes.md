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

- move it to `CLAUDE.local.md` and add that to `.gitignore`, where the content is personal and Claude Code is the reader that matters;
- hand it to `init` to consolidate into `AGENTS.md`, where the content is project guidance — that move is material, and `init`'s;
- delete it, where it is dead.

**Stops at.** The content. Read it to describe the options; never rewrite it.

## `unloadable-skill`

Two faults arrive under this name, and only one of them is correctable.

**An unquoted colon in `description`.** Correctable: quote the value. The YAML then parses and the skill loads.

**A missing or empty `description`.** **Not correctable — report it and ask.** Writing one would mean inventing a claim about what a skill you did not author does, and that claim is material: it stays true whether or not this tool ever ran. Name the skill, say why it will not load, and stop.

**Stops at.** Everything below the frontmatter. The skill body is the author's. A `name` that mismatches its directory is not reported by `doctor` at all — it is a warning and the skill still loads.

## Not yours: every bridge finding

`doctor` also reports skills bridges that no longer resolve and instruction bridges that were never completed. **Every one of those repairs through `init`**, which writes both kinds of bridge in the first place — and writes a `CLAUDE.md` stub without asking, where every correction here needs approval.

Hand them to `/buddy-agent-harness:init`, exactly as `doctor` says. The repair `doctor` gives you already names the skill that owns it, so you never have to classify a finding yourself.
