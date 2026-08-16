# Cursor

**Write no skills projection.** Cursor reads `.agents/skills/` natively, plus `.cursor/skills/` and compat reads of `.claude/skills/` and `.codex/skills/`.

Cursor is enabled unconditionally alongside Claude Code, so it appears in the config record whether or not `.cursor/` exists. That record changes nothing on disk.

## Report the instruction gap

Cursor reads `AGENTS.md` in **Agent mode only**. Chat and Composer read `.cursorrules` and `.cursor/rules/*.mdc` instead.

Tell the user: a repository that consolidates into `AGENTS.md` keeps its instructions in Agent mode and loses them in Chat and Composer.

**Report this as contested.** It is secondary-sourced, not confirmed from Cursor's own documentation. Do not state it as settled fact.

## Do not

- **Do not generate `.cursor/rules/*.mdc` from `AGENTS.md`.** Rules are canonical-only — `.mdc` and `.md` are not interchangeable and path-scoping has no `AGENTS.md` equivalent.
- **Do not delete or rewrite `.cursorrules` or `.cursor/rules/**` on the assumption that `AGENTS.md` covers them.** In Chat and Composer it does not.
- Do not assert whether Cursor's `.agents/skills` discovery recurses into nested subdirectories. It is untested.

## Frontmatter

`paths`, `disable-model-invocation`, and legacy `globs` are Cursor-recognized. Other harnesses drop them — keep load-bearing behavior in the body, per `frontmatter.md`.
