# The standard baseline

What to create in every repository, before any harness-specific work.

## Create

| Path | When |
| --- | --- |
| `AGENTS.md` at the repository root | if absent — never rewrite an existing one |
| `.agents/` | if absent |
| `.agents/skills/<name>/SKILL.md` | one directory per skill; frontmatter per `frontmatter.md` |
| `.agents/repobuddy/config.json` | written by `init`; shared with repobuddy — never rewrite it wholesale |

Optional, only when the repository already has content for them: `.agents/AGENTS.md` for shared behavior, and a skill's `scripts/`, `references/`, `assets/` subdirectories.

## Constraints

- **Do not create `.agents/rules/`, `.agents/commands/`, or `.agents/agents/`.** Only `.agents/skills/` is read by any harness. Creating the others and calling them standard is invention.
- **Do not invent policy for `AGENTS.md`.** Write only content the user authored or approved.
- Call `.agents/` a convention, not a standard, in any user-facing output.
- `AGENTS.md` has no schema and no required sections. Do not impose one.

## Next

Three harnesses need nothing beyond this baseline. Check `harnesses.md` for which need augmentation, then read only the matching `<harness>.md`.

Background on where these formats come from: [Standards](https://repobuddy.github.io/buddy-agent-harness/reference/standards/).
