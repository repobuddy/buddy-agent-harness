# Evidence — Starting Claude Code without the host's user-scope instructions

Status values: `confirmed`, `contested`, `thin`. Confidence: high / medium / low.

## E-BRI-01 — Leaving out the `user` setting source drops the user-scope instructions

- **Date**: 2026-09-26
- **Status**: confirmed
- **Confidence**: high
- **Source**: measured on Claude Code 2.1.283 (Linux, WSL2), `claude -p … --setting-sources project,local --strict-mcp-config`; `claude --help` — primary
- **Notes**: On a host whose `~/.claude/CLAUDE.md` carries a `## Delegation` section, a run with the default sources quotes that section back. The same probe run with `--setting-sources project,local` answers that no loaded file has one. The run still loads the `CLAUDE.md` in its working directory. The Skill tool offers only the built-in skills, with no user skill or plugin. The result is the same with `CLAUDE_CONFIG_DIR` set to the host's config directory. Credentials are read from the host as usual.
- **Why it matters here**: a blind run needs no sandbox HOME, and so no copy of the credentials.

## E-BRI-02 — A managed CLAUDE.md cannot be excluded, and auto memory is on by default

- **Date**: 2026-09-26
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code, "How Claude remembers your project" — https://code.claude.com/docs/en/memory — primary
- **Notes**: "Managed policy CLAUDE.md files cannot be excluded." The managed file lives at `/etc/claude-code/CLAUDE.md` on Linux and WSL, `/Library/Application Support/ClaudeCode/CLAUDE.md` on macOS, and `C:\Program Files\ClaudeCode\CLAUDE.md` on Windows. A `claudeMd` key in managed settings has the same precedence. "Auto memory is on by default"; "set `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`" disables it. The project walk-up loads a `CLAUDE.md` "in your working directory or any directory above it, other than your `~/.claude/CLAUDE.md`".
- **Why it matters here**: no launch option removes a managed file, so a blind launcher refuses to run where one exists.

## E-BRI-03 — A subagent inherits the host's user-scope instructions

- **Date**: 2026-09-26
- **Status**: confirmed
- **Confidence**: high
- **Source**: measured on Claude Code 2.1.283; a `general-purpose` subagent spawned from a session on the same host — primary
- **Notes**: Asked whether any loaded instruction file has a `## Delegation` section, the subagent answers yes and quotes the section's first sentence from the host's `~/.claude/CLAUDE.md`. This repeats the 2026-09-10 measurement recorded in `.agents/skills/eval-delegation/references/method.md`.
- **Why it matters here**: a case-judge that dispatches its simulation as a subagent runs with the host's instructions, whatever its brief says.
