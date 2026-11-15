# GitHub Copilot CLI

**Write nothing.** Copilot CLI reads `.agents/skills/` and `AGENTS.md` natively.

- Detection directory is `.github/skills` — **not** `.github`. A repository with `.github/` but no `.github/skills/` does not enable Copilot CLI by detection.
- Copilot also reads `.claude/skills`, `.github/skills`, `CLAUDE.md`, and `GEMINI.md`. Do not create any of them for Copilot's benefit.

## Instruction consolidation

`.github/copilot-instructions.md` and `.github/instructions/**` are **consolidatable** — move their content into `AGENTS.md`, with approval. Then put what is left of each file to the owner as three answers, each file on its own: delete it, replace it with a pointer to `AGENTS.md`, or leave it as it is. Never write a copy of `AGENTS.md` in its place.

Deletion can be offered here because Copilot has no mode that reads only the harness file: after the run it reads `AGENTS.md`. Do not assume the same for Cursor.

**`.github/copilot-instructions.md` has readers that are not agent harnesses**: Copilot Chat on github.com, in Visual Studio, in JetBrains IDEs, in Xcode and in Eclipse, and Copilot code review in VS Code, Visual Studio, JetBrains IDEs and Xcode. None of them reads `AGENTS.md` (GitHub's custom-instructions support matrix). The offer names them, and says that deleting the file or replacing it with a pointer takes its content away from them.

## Frontmatter

`model` is Copilot-only; `license` and `allowed-tools` are accepted. Keep anything load-bearing in the body — see `frontmatter.md`.
