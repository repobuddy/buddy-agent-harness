# GitHub Copilot CLI

**Write nothing.** Copilot CLI reads `.agents/skills/` and `AGENTS.md` natively.

- Detection directory is `.github/skills` — **not** `.github`. A repository with `.github/` but no `.github/skills/` does not enable Copilot CLI by detection.
- Copilot also reads `.claude/skills`, `.github/skills`, `CLAUDE.md`, and `GEMINI.md`. Do not create any of them for Copilot's benefit.

## Instruction consolidation

`.github/copilot-instructions.md` and `.github/instructions/**` are **consolidatable** — move their content into `AGENTS.md` and leave a pointer, with approval.

This is safe here because Copilot has no mode that reads only the harness file. Do not assume the same for Cursor.

## Frontmatter

`model` is Copilot-only; `license` and `allowed-tools` are accepted. Keep anything load-bearing in the body — see `frontmatter.md`.
