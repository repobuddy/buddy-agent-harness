---
title: Commands
description: User-invoked slash-command workflows, the two mechanisms that create one, and why neither is portable.
---

**Commands** are skills invoked explicitly by the user via `/name`, never triggered automatically by the model. Use them for workflows that should only run when you choose: deployments, releases, or any operation where accidental auto-invocation would be disruptive.

A regular skill's `description` is what an agent matches to trigger the skill automatically. A command suppresses that:

|             | Auto-invoked by model       | User-invoked via `/name` |
| ----------- | --------------------------- | ------------------------ |
| **Skill**   | Yes, when description matches | Yes                    |
| **Command** | No                          | Yes                      |

## Two mechanisms

### A `commands/` directory

A markdown file in `.claude/commands/` (project) or `~/.claude/commands/` (user) becomes a slash command named after the file:

```text
.claude/commands/
  deploy.md       → /deploy
  release.md      → /release
```

The file content is the body, and frontmatter such as `description` and `allowed-tools` is supported. The model never auto-invokes these; they are user-only by construction rather than by a flag.

This is often described as deprecated. That is not what the vendor documentation says: Claude Code states that custom commands have been **merged** into skills, that `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way, and that existing `commands/` files keep working. Skills are the superset, adding a directory for supporting files, invocation-control frontmatter, and automatic loading. The directory is a supported equivalent, not a scheduled removal.

### `disable-model-invocation: true`

Add the frontmatter field to any `SKILL.md`:

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
---
```

This prevents automatic loading while keeping the skill accessible via `/deploy`. It is the approach Claude Code's own documentation recommends.

Note what it also does: a skill carrying this flag [cannot be preloaded into a subagent](/agent-configuration/skills/overview/#composing-the-two), because preloading draws from the same pool the model may invoke. A skill that must be both user-only and preloadable cannot use it.

## Neither mechanism is portable

This is the part that matters for a repository serving several harnesses: **a command is a harness-specific concept, and the canonical formats have no equivalent.**

- `.claude/commands/` is a Claude Code path. The Agent Skills specification says nothing about commands, and `.agents/commands/` is not read by anything, so adopting it would be inventing a convention rather than following one.
- `disable-model-invocation` is a Claude Code field that Cursor also recognizes. Every other harness parses and discards it, which means the skill reverts to a plain public skill there: still `/name`-invocable if that harness has a slash menu, but **also auto-invocable on a description match**.

The consequence is concrete. A deploy skill authored as a command in Claude Code is a deploy skill an agent may decide to run by itself on Codex, Copilot CLI, or Gemini CLI. The suppression does not travel.

The portable remedy is the usual one: put the constraint in the body, which every harness reads. State in the skill's instructions that it must not be run without an explicit request, and treat the frontmatter flag as an enforcement bonus on the two harnesses that honor it. That is weaker than a flag, because it is an instruction the model can decline. For a genuinely destructive operation, prefer a guard that does not depend on the model at all, such as requiring a confirmation step or gating the underlying command behind [permissions](/agent-configuration/harness-differences/).

This project projects skills and instructions only. Commands, like agent definitions and hooks, stay canonical and are [reported rather than converted](/reference/configuration-layout/#what-stays-canonical), because there is no safe cross-harness mapping to convert them into.

## Related

- [Kinds of Skill](/agent-configuration/skills/overview/): where a command sits on the Selection / Visibility / Effect axes
- [Direct Invocation Skill](/agent-configuration/skills/direct-skill/): the agent-only counterpart, and the one suppression pattern that is portable
- [Writing Portable Skills](/agent-configuration/portable-skills/): the full field-by-field portability table
- [Configuration Layout](/reference/configuration-layout/): what is projected and what stays canonical
