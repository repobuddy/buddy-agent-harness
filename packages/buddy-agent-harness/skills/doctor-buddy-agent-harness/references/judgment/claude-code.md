# Claude Code

Reads `AGENTS.md`, and does not read `.agents/skills/`. **One bridge is required, and one file has to be got out of the way.**

## Bridge — skills

`buddy-agent-harness init` creates this:

```
.claude/skills → ../.agents/skills
```

If the directory-level link ever fails, fall back to documented per-skill symlinks (`.claude/skills/<name>` → the canonical skill directory).

## Instructions — no bridge, one file to clear

From v2.1.277 Claude Code reads `AGENTS.md` as its project instructions, with no import, no symlink, and no setting. **Never write a `CLAUDE.md`.**

It reads it *conditionally*, and the condition is the whole of what this skill has to act on. Claude Code reads `AGENTS.md` only where it finds none of these in the working directory or any directory above it:

| File | What it does to `AGENTS.md` |
| --- | --- |
| `CLAUDE.md` | read instead of it |
| `.claude/CLAUDE.md` | read instead of it |
| `CLAUDE.local.md` | read instead of it |
| `~/.claude/CLAUDE.md`, a managed `CLAUDE.md`, `.claude/rules/` | nothing — these load alongside |

A file carrying an `@AGENTS.md` import is the exception that costs nothing: the canonical file arrives through the import, and Claude Code never reads it twice. So the three dispositions are:

- **a body of its own** — consolidate it into `AGENTS.md` and remove it, or leave it holding an import above whatever is genuinely Claude-only.
- **only `@AGENTS.md`, or a symlink to it** — the bridge this tool used to write. Offer to remove it; it is not wrong to keep.
- **`CLAUDE.local.md`** — personal and not yours to move. Offer an `@AGENTS.md` import at the top of it, and nothing else.

**Sessions that still need the import.** Reading `AGENTS.md` directly is unavailable on a Claude Code before v2.1.277, on a third-party provider such as Amazon Bedrock, with telemetry disabled, in the first session after an install or upgrade, and where hooks or the built-in `agents-md` plugin are disabled. There the import is the only way in — which is why a superseded file is offered for removal rather than removed.

The **Project instructions** setting changes which of the two files load, and Claude Code reads it only from the user's own `~/.claude/settings.json` or from managed settings — never from a project settings file. A repository cannot set it for its contributors: never write it, and never offer it as the fix.

## Nested instruction files

Nested `AGENTS.md` files need nothing written beside them. Claude Code reads every `AGENTS.md` from the working directory upward at session start, and a subdirectory's `AGENTS.md` when it opens a file there — the same lazy-on-read rule `CLAUDE.md` gets — provided that subdirectory holds none of the three files above.

Conflict semantics still differ from the standard's. Claude Code concatenates what it discovers from the filesystem root down; the nearest file is read last but does not win, and the docs say Claude may pick one arbitrarily where two rules contradict. The `AGENTS.md` standard says the nearest file wins. A nested file that *reverses* a root rule is therefore an override for Codex and an ambiguity here — worth saying out loud, and not something writing anything would fix.

## Frontmatter

Claude Code recognizes the most fields (`context: fork`, `agent:`, `disable-model-invocation`, `once`, `${CLAUDE_SKILL_DIR}`). Other harnesses drop them silently.

- Restate anything load-bearing in the Markdown body.
- `argument-hint` and `arguments` are Claude Code's argument fields, and the only ones that fail loudly elsewhere: claude.ai uploads and the Skills API reject them outright. Claude Code appends what the caller typed as `ARGUMENTS: <value>` when the body has no `$ARGUMENTS`, so a skill reads its arguments without either field. See `frontmatter.md`.
- **Enforce `name` equal to the directory name.** Claude Code treats `name` as a display label only and resolves the command from the directory name; matching them removes the discrepancy.

## Leave alone — canonical-only

Report these and do not convert them:

- `.claude/agents/` (subagents), `.claude/rules/`, `.claude/output-styles/`
- hook blocks in `.claude/settings.json` — event names differ by case across harnesses
- MCP server definitions

`.claude/settings.json` is strict JSON, the opposite of Gemini CLI's settings file: a comment is a parse error, and a settings file that fails to parse is rejected whole rather than in part. Never add one, and never offer one as a way to annotate a permission or hook entry.

## Commands

`.claude/commands/*.md` are **portable** — migrate to `.agents/skills/<name>/SKILL.md`. Claude Code has merged commands into skills, so this follows the harness rather than fighting it.
