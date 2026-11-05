# The standard baseline

What to create in every repository, before any harness-specific work.

## Create

| Path | When |
| --- | --- |
| `AGENTS.md` at the repository root | if absent — never clobber an existing one; contents per `agents-md.md` |
| `.agents/` | if absent |
| `.agents/skills/<name>/SKILL.md` | one directory per skill; frontmatter per `frontmatter.md` |

Optional, only when the repository already has content for them: `.agents/AGENTS.md` for shared behavior, and a skill's `scripts/`, `references/`, `assets/` subdirectories.

## Constraints

- **Scaffold only the paths above.** `.agents/skills/` is the one `.agents/` folder harnesses read. Other folders, such as `.agents/rules/`, `.agents/commands/`, or `.agents/agents/`, are the project's choice: `init` creates none of them, leaves any that exist, and never calls them standard.
- **Do not invent policy for `AGENTS.md`.** Write only content the user authored or approved. Deriving facts from the repository is not invention; asserting rules nobody agreed to is. See `agents-md.md`.
- Call `.agents/` a convention, not a standard, in any user-facing output.
- `AGENTS.md` has no schema and no required sections. Do not impose one.

## Next

Three harnesses need nothing beyond this baseline. `SKILL.md` has the table of which need augmentation; read only the matching `harnesses/<harness>.md`.

Background on where these formats come from: [Open Standards](https://repobuddy.github.io/buddy-agent-harness/agent-configuration/open-standards/).
